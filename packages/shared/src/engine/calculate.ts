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
  INTEGRATED_SYSTEM_PREMIUM,
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

// Practical ceiling on parallel battery strings — beyond this, wiring and
// balancing get messy, so bigger units win even if pricier.
const MAX_BATTERY_UNITS = 6;

interface BatteryConfig {
  item: EngineCatalogItem;
  count: number;
  totalPriceKobo: number;
}

// A 12V inverter can only run on a 12V-class bank. Items with no declared
// system voltage are treated as universally compatible so untagged catalogs
// keep working.
function voltageCompatible(a: EngineCatalogItem, b: EngineCatalogItem): boolean {
  if (a.systemVoltage == null || b.systemVoltage == null) return true;
  return a.systemVoltage === b.systemVoltage;
}

// Batteries the customer's chemistry preference allows, falling back to the
// whole stock (with a warning) when the preferred type isn't carried.
function batteryPool(
  catalog: EngineCatalog,
  preference: BatteryPreference,
  warnings: string[],
): EngineCatalogItem[] {
  const sized = catalog.batteries.filter((b) => batteryCapacityWh(b) > 0);
  if (sized.length === 0) return [];

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
  return pool;
}

// Cheapest workable configuration from a given pool: for each battery, units
// needed at ITS chemistry DOD → total price; ≤6 parallel units preferred,
// fewest-units fallback otherwise. Null when the pool is empty.
function cheapestBatteryConfig(
  pool: EngineCatalogItem[],
  bankNeededWh: number,
): BatteryConfig | null {
  if (pool.length === 0) return null;

  const configs: BatteryConfig[] = pool.map((item) => {
    const unitWh = batteryCapacityWh(item);
    const chemistry = item.chemistry ?? 'LITHIUM';
    const count = batteryUnitsNeeded(bankNeededWh, chemistry, unitWh);
    return { item, count, totalPriceKobo: item.priceKobo * count };
  });

  const byPrice = (a: BatteryConfig, b: BatteryConfig) =>
    a.totalPriceKobo - b.totalPriceKobo || a.count - b.count;

  const practical = configs.filter((c) => c.count <= MAX_BATTERY_UNITS);
  if (practical.length > 0) return practical.sort(byPrice)[0]!;
  return [...configs].sort((a, b) => a.count - b.count || byPrice(a, b))[0]!;
}

interface PowerPath {
  inverter: EngineCatalogItem;
  bank: BatteryConfig;
  comboKobo: number;
}

// Joint inverter + battery selection: every inverter that covers the load is
// paired with the cheapest VOLTAGE-COMPATIBLE battery configuration, and the
// cheapest overall combination wins. This is what stops a 12V inverter being
// quoted with a 48V bank.
function selectPowerPath(
  catalog: EngineCatalog,
  requiredW: number,
  bankNeededWh: number,
  preference: BatteryPreference,
  warnings: string[],
): PowerPath | null {
  const allInverters = catalog.inverters.filter((i) => i.unit === 'KVA');
  const pool = batteryPool(catalog, preference, warnings);
  if (allInverters.length === 0 || pool.length === 0) return null;

  const requiredKva = requiredW / 1000;
  let invCandidates = allInverters.filter((i) => i.capacity >= requiredKva);
  let loadExceedsStock = false;
  if (invCandidates.length === 0) {
    // Nothing covers the load — pair around the largest available and flag it.
    loadExceedsStock = true;
    const largest = [...allInverters].sort((a, b) => b.capacity - a.capacity)[0]!;
    invCandidates = [largest];
  }

  const paths: PowerPath[] = [];
  for (const inverter of invCandidates) {
    const compatible = pool.filter((b) => voltageCompatible(inverter, b));
    const bank = cheapestBatteryConfig(compatible, bankNeededWh);
    if (!bank) continue;
    paths.push({ inverter, bank, comboKobo: inverter.priceKobo + bank.totalPriceKobo });
  }

  if (paths.length === 0) {
    warnings.push(
      'No voltage-compatible inverter and battery combination in the catalog — the installer will confirm the right pairing in the formal quote.',
    );
    return null;
  }

  const best = paths.sort(
    (a, b) => a.comboKobo - b.comboKobo || a.inverter.capacity - b.inverter.capacity,
  )[0]!;

  if (loadExceedsStock) {
    warnings.push(
      `Load exceeds largest inverter (${best.inverter.capacity} kVA). Sized to largest available; consider a larger unit.`,
    );
  }
  if (best.bank.count > MAX_BATTERY_UNITS) {
    warnings.push(
      `Backup requirement needs ${best.bank.count} battery units in parallel — consider stocking larger batteries for loads like this.`,
    );
  }

  return best;
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

  // Inverter + battery — selected JOINTLY so only voltage-compatible pairs
  // are ever quoted, at the cheapest combined price.
  let inverter: InverterSelection | null = null;
  let batteries: BatterySelection | null = null;

  const path = selectPowerPath(
    catalog,
    inverterRequiredW,
    bankNeededWh,
    input.batteryPreference,
    warnings,
  );
  if (path) {
    inverter = {
      id: path.inverter.id,
      brand: path.inverter.brand,
      model: path.inverter.model,
      capacityKva: path.inverter.capacity,
      priceKobo: path.inverter.priceKobo,
    };
    const { item: batteryItem, count: batteryCount } = path.bank;
    const singleUnitWh = batteryCapacityWh(batteryItem);
    batteries = {
      id: batteryItem.id,
      brand: batteryItem.brand,
      model: batteryItem.model,
      chemistry: batteryItem.chemistry ?? 'LITHIUM',
      singleUnitCapacityKwh: singleUnitWh / 1000,
      count: batteryCount,
      totalCapacityKwh: round2((batteryCount * singleUnitWh) / 1000),
      unitPriceKobo: batteryItem.priceKobo,
      totalPriceKobo: path.bank.totalPriceKobo,
    };
  } else {
    // Partial catalogs still show what they can: an inverter with no
    // batteries stocked (or vice versa) renders alongside the sizing
    // requirements — pricing stays withheld either way.
    const soloInverters = catalog.inverters
      .filter((i) => i.unit === 'KVA')
      .sort((a, b) => a.capacity - b.capacity);
    if (soloInverters.length > 0 && catalog.batteries.length === 0) {
      const chosen =
        soloInverters.find((i) => i.capacity * 1000 >= inverterRequiredW) ??
        soloInverters[soloInverters.length - 1]!;
      inverter = {
        id: chosen.id,
        brand: chosen.brand,
        model: chosen.model,
        capacityKva: chosen.capacity,
        priceKobo: chosen.priceKobo,
      };
    }
    const soloBank =
      catalog.inverters.length === 0
        ? cheapestBatteryConfig(
            batteryPool(catalog, input.batteryPreference, warnings),
            bankNeededWh,
          )
        : null;
    if (soloBank) {
      const singleUnitWh = batteryCapacityWh(soloBank.item);
      batteries = {
        id: soloBank.item.id,
        brand: soloBank.item.brand,
        model: soloBank.item.model,
        chemistry: soloBank.item.chemistry ?? 'LITHIUM',
        singleUnitCapacityKwh: singleUnitWh / 1000,
        count: soloBank.count,
        totalCapacityKwh: round2((soloBank.count * singleUnitWh) / 1000),
        unitPriceKobo: soloBank.item.priceKobo,
        totalPriceKobo: soloBank.totalPriceKobo,
      };
    }
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
    // Both paths available. An all-in-one unit is one box, one warranty, and
    // no parallel battery wiring — worth a modest premium over loose
    // components, so it wins unless it costs meaningfully more.
    const componentPathKobo = inverter.priceKobo + batteries.totalPriceKobo;
    const generatorBudget = componentPathKobo * (1 + INTEGRATED_SYSTEM_PREMIUM);
    if (generator.priceKobo <= generatorBudget) {
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

  // Backup runtime at FULL connected load — usable energy after DOD and
  // roundtrip losses divided by the total load. Real usage is normally a
  // subset of the connected load, so actual backup usually runs longer.
  let estimatedBackupHoursFullLoad: number | null = null;
  if (generator) {
    const usableWh =
      generator.storageKwh * 1000 * DOD_LITHIUM * ROUNDTRIP_EFFICIENCY;
    estimatedBackupHoursFullLoad = Number((usableWh / totalLoadW).toFixed(1));
  } else if (batteries) {
    const usableWh =
      batteries.totalCapacityKwh *
      1000 *
      dodFor(batteries.chemistry) *
      ROUNDTRIP_EFFICIENCY;
    estimatedBackupHoursFullLoad = Number((usableWh / totalLoadW).toFixed(1));
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
    estimatedBackupHoursFullLoad,
    warnings,
  };
}
