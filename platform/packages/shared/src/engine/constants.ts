// Engine tuning constants — pulled out so they can be tweaked in one place
// and referenced in tests. Values chosen to match the MVP spec.

export const INVERTER_SAFETY_FACTOR = 1.25;       // Oversize the inverter by 25%
export const PANEL_OVERSIZE_FACTOR = 1.25;        // Oversize the array by 25%
export const ROUNDTRIP_EFFICIENCY = 0.85;         // Battery + inverter losses combined

// Depth of Discharge (DOD): how deeply you should discharge each cycle.
// Draining a lead-acid battery to 50% doubles its cycle life vs. to 80%.
export const DOD_LITHIUM = 0.8;
export const DOD_LEAD_ACID = 0.5;

// Default Nigerian solar insolation if the installer's region lookup misses.
export const DEFAULT_SUN_HOURS = 5.5;

// Generator CO2 math (for the "you saved X kg CO2/month" card).
export const GEN_FUEL_CONSUMPTION_L_PER_KVA_HR = 0.3; // L/hr per kVA
export const DIESEL_CO2_KG_PER_L = 2.68;
export const DAYS_PER_MONTH = 30;

// Amortisation window for "is this cheaper than what I'm spending today?".
export const PAYBACK_HORIZON_YEARS = 5;
export const MONTHS_PER_YEAR = 12;
