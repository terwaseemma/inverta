import {
  CalculationError,
  type BatteryPreference,
  type CalculationInput,
  type CalculationResult,
  type EngineCatalog,
  type EngineCatalogItem,
  type BatterySelection,
  type InverterSelection,
  type PanelSelection,
  type AccessoryLine,
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

function batteryCapacityWh(item: EngineCatalogItem): number {
  if (item.unit === 'KWH') return item.capacity * 1000;
  if (item.unit === 'AH' && item.voltage) return item.capacity * item.voltage;
  return 0;
}

function dodFor(chemistry: BatterySelection['chemistry']): number {
  return chemistry === 'LITHIUM' ? DOD_LITHIUM : DOD_LEAD_ACID;
}

function selectInverter(
  catalog: EngineCatalog,
  requiredW: number,
  warnings: string[],
): InverterSelection {
  const inverters = catalog.inverters.filter((i) => i.unit === 'KVA');
  if (inverters.length === 0) {
    throw new CalculationError('NO_INVERTER_IN_CATALOG', 'Catalog has no inverter listed.');
  }
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
): EngineCatalogItem {
  const sized = catalog.batteries.filter((b) => batteryCapacityWh(b) > 0);
  if (sized.length === 0) {
    throw new CalculationError('NO_BATTERY_IN_CATALOG', 'Catalog has no battery listed.');
  }

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

function selectPanel(catalog: EngineCatalog): EngineCatalogItem {
  const panels = catalog.panels.filter((p) => p.unit === 'W' && p.capacity > 0);
  if (panels.length === 0) {
    throw new CalculationError('NO_PANEL_IN_CATALOG', 'Catalog has no panel listed.');
  }
  // Highest wattage panel first — fewer panels, less roof area, less racking.
  return panels.reduce((best, p) => (p.capacity > best.capacity ? p : best));
}

function sizeInverter(totalLoadW: number): number {
  return totalLoadW * INVERTER_SAFETY_FACTOR;
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

  // Inverter
  const inverterRequiredW = sizeInverter(totalLoadW);
  const inverter = selectInverter(catalog, inverterRequiredW, warnings);

  // Battery
  const batteryItem = selectBattery(catalog, input.batteryPreference, warnings);
  const singleUnitWh = batteryCapacityWh(batteryItem);
  const chemistry = batteryItem.chemistry ?? 'LITHIUM';
  const bankNeededWh = sizeBatteryBank(totalLoadW, input.backupHours);
  const batteryCount = batteryUnitsNeeded(bankNeededWh, chemistry, singleUnitWh);
  const totalBatteryCapacityKwh = (batteryCount * singleUnitWh) / 1000;
  const batteries: BatterySelection = {
    id: batteryItem.id,
    brand: batteryItem.brand,
    model: batteryItem.model,
    chemistry,
    singleUnitCapacityKwh: singleUnitWh / 1000,
    count: batteryCount,
    totalCapacityKwh: Number(totalBatteryCapacityKwh.toFixed(2)),
    unitPriceKobo: batteryItem.priceKobo,
    totalPriceKobo: batteryItem.priceKobo * batteryCount,
  };

  // Panels
  const panelItem = selectPanel(catalog);
  const arrayKwp = sizePanelArray(dailyEnergyWh, sunHours);
  const panelCount = Math.max(1, Math.ceil((arrayKwp * 1000) / panelItem.capacity));
  const actualKwp = (panelCount * panelItem.capacity) / 1000;
  const panels: PanelSelection = {
    id: panelItem.id,
    brand: panelItem.brand,
    model: panelItem.model,
    wattsPerPanel: panelItem.capacity,
    count: panelCount,
    totalKwp: Number(actualKwp.toFixed(2)),
    unitPriceKobo: panelItem.priceKobo,
    totalPriceKobo: panelItem.priceKobo * panelCount,
  };

  // Accessories + costs
  const accessories = buildAccessoryLines(catalog);
  const accessoriesTotalKobo = accessories.reduce(
    (sum, a) => sum + a.totalPriceKobo,
    0,
  );

  const componentsKobo =
    inverter.priceKobo +
    batteries.totalPriceKobo +
    panels.totalPriceKobo +
    accessoriesTotalKobo;

  const installationFeeKobo = computeInstallationFee(componentsKobo, catalog);
  const subtotalKobo = componentsKobo + installationFeeKobo;
  const markupKobo = Math.round((subtotalKobo * catalog.markupPercent) / 100);
  const totalKobo = subtotalKobo + markupKobo;

  // Savings — only compute if the customer told us what they spend today.
  const currentSpendKobo =
    (input.monthlyElectricityBillKobo ?? 0) + (input.monthlyFuelCostKobo ?? 0);

  let monthlySavingsKobo: number | null = null;
  let paybackMonths: number | null = null;
  if (currentSpendKobo > 0) {
    const amortisedMonthlyKobo = totalKobo / (PAYBACK_HORIZON_YEARS * MONTHS_PER_YEAR);
    monthlySavingsKobo = Math.round(currentSpendKobo - amortisedMonthlyKobo);
    paybackMonths = Math.round(totalKobo / currentSpendKobo);
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
    inverter,
    batteries,
    panels,
    accessories,
    installationFeeKobo,
    subtotalKobo,
    markupKobo,
    totalKobo,
    monthlySavingsKobo,
    paybackMonths,
    co2SavedKgPerMonth,
    warnings,
  };
}
