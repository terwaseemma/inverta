export type BatteryPreference = 'lithium' | 'agm' | 'none';
export type CatalogUnit = 'KVA' | 'KWH' | 'AH' | 'W' | 'UNIT';
export type BatteryChemistry = 'LITHIUM' | 'AGM' | 'GEL';

export interface EngineAppliance {
  name: string;
  wattage: number;
  hoursPerDay: number;
  quantity: number;
  /**
   * Fraction of switched-on time the appliance actually draws power (0–1).
   * A fridge sits plugged in all day but its compressor runs ~40% of that.
   * Defaults to 1 (continuous) when the caller doesn't supply it.
   */
  dutyCycle?: number;
  /**
   * Startup inrush as a multiple of running power. Motors and compressors
   * draw 3–7× for a fraction of a second. Defaults to 1 (no inrush).
   */
  surgeFactor?: number;
}

export interface EngineCatalogItem {
  id: string;
  brand: string;
  model: string;
  capacity: number;
  unit: CatalogUnit;
  voltage?: number | null;
  /**
   * DC system-voltage class (12/24/48) for inverter↔battery matching —
   * a 12V inverter can only run on a 12V-class bank. Null = unknown,
   * treated as compatible with anything.
   */
  systemVoltage?: number | null;
  /** Built-in battery capacity — solar generators only */
  storageKwh?: number | null;
  chemistry?: BatteryChemistry | null;
  priceKobo: number;
}

export interface EngineCatalog {
  inverters: EngineCatalogItem[];
  batteries: EngineCatalogItem[];
  panels: EngineCatalogItem[];
  /** All-in-one solar generators (inverter + built-in battery) */
  generators: EngineCatalogItem[];
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

/**
 * Catalog-independent sizing. Always present in the result — even when the
 * installer's catalog is empty — so the customer always learns what system
 * they need and the lead is captured either way.
 */
export interface SystemRequirements {
  /** Minimum inverter size (load ÷ power factor × future reserve), in kVA */
  inverterKva: number;
  /**
   * Worst-case startup surge the inverter must survive, in watts: the largest
   * inductive load's inrush plus everything else already running. An inverter
   * that cannot supply this trips (or dies) when the AC kicks in.
   */
  peakSurgeW: number;
  /** Gross battery bank to install (after DOD + efficiency), in kWh */
  batteryBankKwh: number;
  /** Solar array size (with oversize factor), in kWp */
  panelArrayKwp: number;
}

export interface InverterSelection {
  id: string;
  brand: string;
  model: string;
  capacityKva: number;
  priceKobo: number;
}

/** All-in-one unit that replaces the inverter + battery pair */
export interface GeneratorSelection {
  id: string;
  brand: string;
  model: string;
  capacityKva: number;
  storageKwh: number;
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

/** Only present when every core category (inverter/battery/panel) resolved. */
export interface SystemPricing {
  installationFeeKobo: number;
  subtotalKobo: number;
  markupKobo: number;
  totalKobo: number;
}

export interface CalculationResult {
  /** Sum of every appliance's rated power — the peak the inverter must carry. */
  totalLoadW: number;
  /**
   * Duty-cycle-weighted average draw. Lower than totalLoadW wherever cycling
   * appliances (fridges, ACs) are present, and it is this figure — not the
   * peak — that determines how long the battery lasts.
   */
  averageLoadW: number;
  dailyEnergyWh: number;
  /** Always present — catalog-independent sizing */
  requirements: SystemRequirements;
  /** Null when the installer's catalog has no item in the category */
  inverter: InverterSelection | null;
  batteries: BatterySelection | null;
  panels: PanelSelection | null;
  /**
   * When set, an all-in-one solar generator replaces the inverter + battery
   * pair (inverter and batteries will be null in that case).
   */
  generator: GeneratorSelection | null;
  accessories: AccessoryLine[];
  /** Null unless inverter + batteries + panels all resolved */
  pricing: SystemPricing | null;
  /** True when pricing could be computed from the installer's own catalog */
  catalogComplete: boolean;
  monthlySavingsKobo: number | null;
  paybackMonths: number | null;
  co2SavedKgPerMonth: number | null;
  /**
   * How long the selected storage runs the FULL connected load, in hours
   * (usable energy after DOD + efficiency ÷ total load). Customers rarely
   * run everything at once, so real-world backup is usually longer — the UI
   * should say so. Null when no battery/generator was selected.
   */
  estimatedBackupHoursFullLoad: number | null;
  /**
   * Runtime at the duty-cycle-weighted average draw — what the household
   * realistically experiences, and the figure worth showing customers.
   */
  estimatedBackupHoursTypical: number | null;
  /** Non-fatal notes the UI may surface (e.g. "no inverter exactly matches; sized up") */
  warnings: string[];
}

export class CalculationError extends Error {
  constructor(
    public readonly code: 'NO_APPLIANCES' | 'INVALID_INPUT',
    message: string,
  ) {
    super(message);
    this.name = 'CalculationError';
  }
}
