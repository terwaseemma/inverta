export type BatteryPreference = 'lithium' | 'agm' | 'none';
export type CatalogUnit = 'KVA' | 'KWH' | 'AH' | 'W' | 'UNIT';
export type BatteryChemistry = 'LITHIUM' | 'AGM' | 'GEL';

export interface EngineAppliance {
  name: string;
  wattage: number;
  hoursPerDay: number;
  quantity: number;
}

export interface EngineCatalogItem {
  id: string;
  brand: string;
  model: string;
  capacity: number;
  unit: CatalogUnit;
  voltage?: number | null;
  chemistry?: BatteryChemistry | null;
  priceKobo: number;
}

export interface EngineCatalog {
  inverters: EngineCatalogItem[];
  batteries: EngineCatalogItem[];
  panels: EngineCatalogItem[];
  accessories: EngineCatalogItem[];
  /** e.g. 15 for +15% markup */
  markupPercent: number;
  /** Flat installation fee. Ignored if installationFeePercent is set. */
  installationFeeKobo: number;
  /** If set, replaces the flat fee with a percentage of system cost. */
  installationFeePercent?: number | null;
}

export interface CalculationInput {
  appliances: EngineAppliance[];
  /** 4–24 hours of autonomy */
  backupHours: number;
  batteryPreference: BatteryPreference;
  /** Peak-sun hours at the installation site. Defaults to 5.5 for Nigeria. */
  sunHours?: number;

  // Optional — enables savings + environmental cards on the results page.
  monthlyElectricityBillKobo?: number;
  monthlyFuelCostKobo?: number;
  generatorCapacityKva?: number;
  generatorHoursPerDay?: number;
}

export interface InverterSelection {
  id: string;
  brand: string;
  model: string;
  capacityKva: number;
  priceKobo: number;
}

export interface BatterySelection {
  id: string;
  brand: string;
  model: string;
  chemistry: BatteryChemistry;
  singleUnitCapacityKwh: number;
  count: number;
  totalCapacityKwh: number;
  unitPriceKobo: number;
  totalPriceKobo: number;
}

export interface PanelSelection {
  id: string;
  brand: string;
  model: string;
  wattsPerPanel: number;
  count: number;
  totalKwp: number;
  unitPriceKobo: number;
  totalPriceKobo: number;
}

export interface AccessoryLine {
  id: string;
  name: string;
  quantity: number;
  unitPriceKobo: number;
  totalPriceKobo: number;
}

export interface CalculationResult {
  totalLoadW: number;
  dailyEnergyWh: number;
  inverter: InverterSelection;
  batteries: BatterySelection;
  panels: PanelSelection;
  accessories: AccessoryLine[];
  installationFeeKobo: number;
  subtotalKobo: number;
  markupKobo: number;
  totalKobo: number;
  monthlySavingsKobo: number | null;
  paybackMonths: number | null;
  co2SavedKgPerMonth: number | null;
  /** Non-fatal notes the UI may surface (e.g. "no inverter exactly matches; sized up") */
  warnings: string[];
}

export class CalculationError extends Error {
  constructor(
    public readonly code:
      | 'NO_APPLIANCES'
      | 'NO_INVERTER_IN_CATALOG'
      | 'NO_BATTERY_IN_CATALOG'
      | 'NO_PANEL_IN_CATALOG'
      | 'INVALID_INPUT',
    message: string,
  ) {
    super(message);
    this.name = 'CalculationError';
  }
}
