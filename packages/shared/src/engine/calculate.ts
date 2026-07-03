import {
  CalculationError,
  type BatteryPreference,
  type CalculationInput,
  type CalculationResult,
  type EngineCatalog,
  type EngineCatalogItem,
  type BatterySelection,
  type GeneratorSelection,
  type InverterSelection,
  type PanelSelection,
  type AccessoryLine,
  type SystemRequirements,
  type SystemPricing,
} from './types';
import {
  DAYS_PER_MONTH,
  DEFAULT_SUN_HOURS,
  DIESEL_CO2_KG_PER_L,
  DOD_LEAD_ACID,
  DOD_LITHIUM,
  GEN_FUEL_CONSUMPTION_L_PER_KVA_HR,
  INVERTER_SAFETY_FACTOR,
  MONTHS_PER_YEAR,
  PANEL_OVERSIZE_FACTOR,
  PAYBACK_HORIZON_YEARS,
  ROUNDTRIP_EFFICIENCY,
} from './constants';

function round2(n: number): number {
  return Number(n.toFixed(2));
}

function batteryCapacityWh(item: EngineCatalogItem): number {
  if (item.unit === 'KWH') return item.capacity * 1000;
  if (item.unit === 'AH' && item.voltage) return item.capacity * item.voltage;
  return 0;
}

function dodFor(chemistry: BatterySelection['chemistry']): number {
  return chemistry === 'LITHIUM' ? DOD_LITHIUM : DOD_LEAD_ACID;
}

function dodForPreference(preference: BatteryPreference): number {
  return preference === 'agm' ? DOD_LEAD_ACID : DOD_LITHIUM;
}

// Selection helpers return null when the category is unstocked — the caller
// degrades to sizing-only output instead of failing the whole calculation.

function selectInverter(
  catalog: EngineCatalog,
  requiredW: number,
  warnings: string[],
): InverterSelection | null {
  const inverters = catalog.inverters.filter((i) => i.unit === 'KVA');
  if (inverters.length === 0) return null;

  const requiredKva = requiredW / 1000;
  const bySize = [...inverters].sort((a, b) => a.capacity - b.capacity);
  let chosen = bySize.find((i) => i.capacity >= requiredKva);
  if (!chosen) {
    chosen = bySize[bySize.length - 1]!;
    warnings.push(
      `Load exceeds largest inverter (${chosen.capacity} kVA). Sized to largest available; consider a larger unit.`,
    );
  }
  return {
    id: chosen.id,
    brand: chosen.brand,
    model: chosen.model,
    capacityKva: chosen.capacity,
    priceKobo: chosen.priceKobo,
  };
}

function selectBattery(
  catalog: EngineCatalog,
  preference: BatteryPreference,
  warnings: string[],
): EngineCatalogItem | null {
  const sized = catalog.batteries.filter((b) => batteryCapacityWh(b) > 0);
  if (sized.length === 0) return null;

  // Filter by preference; fall back to any chemistry if the preferred type isn't stocked.
  const preferredChemistry =
    preference === 'lithium' ? 'LITHIUM' : preference === 'agm' ? 'AGM' : null;

  let pool = preferredChemistry
    ? sized.filter((b) => b.chemistry === preferredChemistry)
    : sized;

  if (pool.length === 0 && preferredChemistry) {
    warnings.push(
      `No ${preferredChemistry.toLowerCase()} batteries in catalog. Falling back to available stock.`,
    );
    pool = sized;
  }

  // Pick the largest single-unit Wh to minimise string count & wiring complexity.
  return pool.reduce((best, b) =>
    batteryCapacityWh(b) > batteryCapacityWh(best) ? b : best,
  );
}

// Smallest (by price) all-in-one generator that covers BOTH the load and the
// storage requirement — generators aren't stacked, so one unit must fit.
function selectGenerator(
  catalog: EngineCatalog,
  requiredW: number,
  requiredStorageKwh: number,
): GeneratorSelection | null {
  const fits = catalog.generators
    .filter(
      (g) =>
        g.unit === 'KVA' &&
        (g.storageKwh ?? 0) > 0 &&
        g.capacity * 1000 >= requiredW &&
        (g.storageKwh ?? 0) >= requiredStorageKwh,
    )
    .sort((a, b) => a.priceKobo - b.priceKobo);
  const chosen = fits[0];
  if (!chosen) return null;
  return {
    id: chosen.id,
    brand: chosen.brand,
    model: chosen.model,
    capacityKva: chosen.capacity,
    storageKwh: chosen.storageKwh ?? 0,
    priceKobo: chosen.priceKobo,
  };
}

function selectPanel(catalog: EngineCatalog): EngineCatalogItem | null {
  const panels = catalog.panels.filter((p) => p.unit === 'W' && p.capacity > 0);
  if (panels.length === 0) return null;
  // Highest wattage panel first — fewer panels, less roof area, less racking.
  return panels.reduce((best, p) => (p.capacity > best.capacity ? p : best));
}

function sizeBatteryBank(totalLoadW: number, backupHours: number): number {
  // dailyEnergy * (backup / hoursOfUse) simplifies to totalLoad * backupHours
  // because hoursOfUse = dailyEnergy / totalLoad.
  return totalLoadW * backupHours;
}

function batteryUnitsNeeded(
  energyNeededWh: number,
  chemistry: BatterySelection['chemistry'],
  singleUnitWh: number,
): number {
  const effectiveCapacity = energyNeededWh / (ROUNDTRIP_EFFICIENCY * dodFor(chemistry));
  return Math.max(1, Math.ceil(effectiveCapacity / singleUnitWh));
}

function sizePanelArray(dailyEnergyWh: number, sunHours: number): number {
  // kWp = (daily kWh / sun hours) × oversize factor
  return (dailyEnergyWh / 1000 / sunHours) * PANEL_OVERSIZE_FACTOR;
}

function computeInstallationFee(
  systemCostKobo: number,
  catalog: EngineCatalog,
): number {
  if (catalog.installationFeePercent != null && catalog.installationFeePercent > 0) {
    return Math.round((systemCostKobo * catalog.installationFeePercent) / 100);
  }
  return catalog.installationFeeKobo;
}

function buildAccessoryLines(catalog: EngineCatalog): AccessoryLine[] {
  // MVP rule: include every accessory the installer stocks at quantity 1.
  // The proposal editor is where quantities get tuned for the actual quote.
  return catalog.accessories.map((a) => ({
    id: a.id,
    name: `${a.brand} ${a.model}`.trim(),
    quantity: 1,
    unitPriceKobo: a.priceKobo,
    totalPriceKobo: a.priceKobo,
  }));
}

export function calculate(
  input: CalculationInput,
  catalog: EngineCatalog,
): CalculationResult {
  if (!input.appliances || input.appliances.length === 0) {
    throw new CalculationError('NO_APPLIANCES', 'At least one appliance is required.');
  }
  if (!Number.isFinite(input.backupHours) || input.backupHours <= 0) {
    throw new CalculationError('INVALID_INPUT', 'backupHours must be a positive number.');
  }

  const warnings: string[] = [];
  const sunHours = input.sunHours ?? DEFAULT_SUN_HOURS;

  const totalLoadW = input.appliances.reduce(
    (sum, a) => sum + a.wattage * a.quantity,
    0,
  );
  const dailyEnergyWh = input.appliances.reduce(
    (sum, a) => sum + a.wattage * a.quantity * a.hoursPerDay,
    0,
  );

  if (totalLoadW <= 0) {
    throw new CalculationError('INVALID_INPUT', 'Total load is zero. Add at least one appliance with wattage.');
  }

  // Catalog-independent requirements — computed no matter what's stocked.
  const inverterRequiredW = totalLoadW * INVERTER_SAFETY_FACTOR;
  const bankNeededWh = sizeBatteryBank(totalLoadW, input.backupHours);
  const requirements: SystemRequirements = {
    inverterKva: round2(inverterRequiredW / 1000),
    batteryBankKwh: round2(
      bankNeededWh /
        (ROUNDTRIP_EFFICIENCY * dodForPreference(input.batteryPreference)) /
        1000,
    ),
    panelArrayKwp: round2(sizePanelArray(dailyEnergyWh, sunHours)),
  };

  // Inverter
  let inverter = selectInverter(catalog, inverterRequiredW, warnings);

  // Battery
  const batteryItem = selectBattery(catalog, input.batteryPreference, warnings);
  let batteries: BatterySelection | null = null;
  if (batteryItem) {
    const singleUnitWh = batteryCapacityWh(batteryItem);
    const chemistry = batteryItem.chemistry ?? 'LITHIUM';
    const batteryCount = batteryUnitsNeeded(bankNeededWh, chemistry, singleUnitWh);
    batteries = {
      id: batteryItem.id,
      brand: batteryItem.brand,
      model: batteryItem.model,
      chemistry,
      singleUnitCapacityKwh: singleUnitWh / 1000,
      count: batteryCount,
      totalCapacityKwh: round2((batteryCount * singleUnitWh) / 1000),
      unitPriceKobo: batteryItem.priceKobo,
      totalPriceKobo: batteryItem.priceKobo * batteryCount,
    };
  }

  // Panels
  const panelItem = selectPanel(catalog);
  let panels: PanelSelection | null = null;
  if (panelItem) {
    const arrayKwp = sizePanelArray(dailyEnergyWh, sunHours);
    const panelCount = Math.max(1, Math.ceil((arrayKwp * 1000) / panelItem.capacity));
    panels = {
      id: panelItem.id,
      brand: panelItem.brand,
      model: panelItem.model,
      wattsPerPanel: panelItem.capacity,
      count: panelCount,
      totalKwp: round2((panelCount * panelItem.capacity) / 1000),
      unitPriceKobo: panelItem.priceKobo,
      totalPriceKobo: panelItem.priceKobo * panelCount,
    };
  }

  // All-in-one solar generator — considered against the inverter + battery
  // pair. Generators always use lithium-grade DOD for the storage check.
  const generatorStorageReqKwh = round2(
    bankNeededWh / (ROUNDTRIP_EFFICIENCY * DOD_LITHIUM) / 1000,
  );
  let generator = selectGenerator(catalog, inverterRequiredW, generatorStorageReqKwh);
  if (generator && inverter && batteries) {
    // Both paths available — recommend the cheaper one.
    const componentPathKobo = inverter.priceKobo + batteries.totalPriceKobo;
    if (generator.priceKobo <= componentPathKobo) {
      inverter = null;
      batteries = null;
    } else {
      generator = null;
    }
  } else if (generator) {
    // Generator is the only complete power+storage option.
    inverter = null;
    batteries = null;
  }

  // Pricing — only when the whole core system resolved from the catalog.
  // A partial total (e.g. missing batteries) would mislead the customer.
  const accessories = buildAccessoryLines(catalog);
  let pricing: SystemPricing | null = null;
  const powerAndStorageKobo = generator
    ? generator.priceKobo
    : inverter && batteries
      ? inverter.priceKobo + batteries.totalPriceKobo
      : null;
  if (powerAndStorageKobo !== null && panels) {
    const accessoriesTotalKobo = accessories.reduce(
      (sum, a) => sum + a.totalPriceKobo,
      0,
    );
    const componentsKobo =
      powerAndStorageKobo + panels.totalPriceKobo + accessoriesTotalKobo;

    const installationFeeKobo = computeInstallationFee(componentsKobo, catalog);
    const subtotalKobo = componentsKobo + installationFeeKobo;
    const markupKobo = Math.round((subtotalKobo * catalog.markupPercent) / 100);
    pricing = {
      installationFeeKobo,
      subtotalKobo,
      markupKobo,
      totalKobo: subtotalKobo + markupKobo,
    };
  }

  // Savings — needs both a total price and the customer's current spend.
  const currentSpendKobo =
    (input.monthlyElectricityBillKobo ?? 0) + (input.monthlyFuelCostKobo ?? 0);

  let monthlySavingsKobo: number | null = null;
  let paybackMonths: number | null = null;
  if (pricing && currentSpendKobo > 0) {
    const amortisedMonthlyKobo =
      pricing.totalKobo / (PAYBACK_HORIZON_YEARS * MONTHS_PER_YEAR);
    monthlySavingsKobo = Math.round(currentSpendKobo - amortisedMonthlyKobo);
    paybackMonths = Math.round(pricing.totalKobo / currentSpendKobo);
  }

  // CO2 — only if the customer runs a generator.
  let co2SavedKgPerMonth: number | null = null;
  if (
    input.generatorCapacityKva != null &&
    input.generatorCapacityKva > 0 &&
    input.generatorHoursPerDay != null &&
    input.generatorHoursPerDay > 0
  ) {
    const fuelPerMonth =
      input.generatorCapacityKva *
      GEN_FUEL_CONSUMPTION_L_PER_KVA_HR *
      input.generatorHoursPerDay *
      DAYS_PER_MONTH;
    co2SavedKgPerMonth = Number((fuelPerMonth * DIESEL_CO2_KG_PER_L).toFixed(1));
  }

  return {
    totalLoadW,
    dailyEnergyWh,
    requirements,
    inverter,
    batteries,
    panels,
    generator,
    accessories,
    pricing,
    catalogComplete: pricing !== null,
    monthlySavingsKobo,
    paybackMonths,
    co2SavedKgPerMonth,
    warnings,
  };
}
