// Appliance presets — also written into the DB via packages/db/prisma/seed.ts.
// Keeping a typed in-memory copy lets the calculator UI render presets
// without a DB roundtrip for the first paint.
//
// Wattages, duty cycles, and surge factors follow Ojobaro, "Backup & Off-Grid
// Solar Design Made Easy" (2nd ed., 2026), Ch.4 and Appendix C1.

export type AppliancePresetCategory =
  | 'LIGHTING'
  | 'COOLING'
  | 'KITCHEN'
  | 'ENTERTAINMENT'
  | 'COMPUTING'
  | 'OTHER';

/**
 * Electrical character of the load. Drives surge expectations:
 * - RESISTIVE  — heaters, kettles, filament lamps. No inrush.
 * - INDUCTIVE  — anything with a motor or compressor. Draws 3–7× at startup.
 * - ELECTRONIC — switch-mode supplies (TVs, laptops, routers). Negligible inrush.
 */
export type ApplianceLoadType = 'RESISTIVE' | 'INDUCTIVE' | 'ELECTRONIC';

export interface AppliancePreset {
  name: string;
  defaultWattageW: number;
  category: AppliancePresetCategory;
  loadType: ApplianceLoadType;
  /**
   * Fraction of its switched-on time the appliance actually draws power.
   * A fridge is plugged in 24h but its compressor runs ~40% of that, so it
   * consumes 0.4 × rated × hours. Using 1.0 for cycling appliances is the
   * most common cause of oversized (and overpriced) systems.
   */
  dutyCycle: number;
  /**
   * Startup inrush as a multiple of running power. Used to check the
   * inverter can start the load, not just run it.
   */
  surgeFactor: number;
}

export const APPLIANCE_PRESETS: readonly AppliancePreset[] = [
  // --- Lighting (resistive/electronic, always-on while switched on) ---
  { name: 'LED bulb',           defaultWattageW: 10,   category: 'LIGHTING',      loadType: 'ELECTRONIC', dutyCycle: 1.0,  surgeFactor: 1 },
  { name: 'Security floodlight', defaultWattageW: 50,  category: 'LIGHTING',      loadType: 'ELECTRONIC', dutyCycle: 1.0,  surgeFactor: 1 },

  // --- Fans (small motors: real but modest inrush) ---
  { name: 'Ceiling fan',        defaultWattageW: 80,   category: 'COOLING',       loadType: 'INDUCTIVE',  dutyCycle: 1.0,  surgeFactor: 3 },
  { name: 'Standing fan',       defaultWattageW: 65,   category: 'COOLING',       loadType: 'INDUCTIVE',  dutyCycle: 1.0,  surgeFactor: 3 },

  // --- Air conditioning (the biggest surge in most homes) ---
  { name: 'AC 1HP',             defaultWattageW: 750,  category: 'COOLING',       loadType: 'INDUCTIVE',  dutyCycle: 0.6,  surgeFactor: 5 },
  { name: 'AC 1.5HP',           defaultWattageW: 1150, category: 'COOLING',       loadType: 'INDUCTIVE',  dutyCycle: 0.6,  surgeFactor: 5 },
  { name: 'AC 2HP',             defaultWattageW: 1500, category: 'COOLING',       loadType: 'INDUCTIVE',  dutyCycle: 0.6,  surgeFactor: 5 },
  // Inverter ACs modulate instead of cycling — far cheaper to run, and their
  // soft-start avoids the big inrush. Quoting one as a conventional AC roughly
  // doubles the system a customer is told they need.
  { name: 'Inverter AC 1.5HP',  defaultWattageW: 550,  category: 'COOLING',       loadType: 'INDUCTIVE',  dutyCycle: 0.9,  surgeFactor: 2 },

  // --- Refrigeration (compressor cycles: duty cycle matters most here) ---
  { name: 'Refrigerator',       defaultWattageW: 200,  category: 'KITCHEN',       loadType: 'INDUCTIVE',  dutyCycle: 0.4,  surgeFactor: 5 },
  { name: 'Freezer',            defaultWattageW: 300,  category: 'KITCHEN',       loadType: 'INDUCTIVE',  dutyCycle: 0.5,  surgeFactor: 5 },

  // --- Kitchen & laundry ---
  { name: 'Microwave',          defaultWattageW: 1000, category: 'KITCHEN',       loadType: 'ELECTRONIC', dutyCycle: 1.0,  surgeFactor: 1.5 },
  { name: 'Electric kettle',    defaultWattageW: 1800, category: 'KITCHEN',       loadType: 'RESISTIVE',  dutyCycle: 1.0,  surgeFactor: 1 },
  { name: 'Blender',            defaultWattageW: 450,  category: 'KITCHEN',       loadType: 'INDUCTIVE',  dutyCycle: 1.0,  surgeFactor: 4 },
  { name: 'Electric iron',      defaultWattageW: 1200, category: 'OTHER',         loadType: 'RESISTIVE',  dutyCycle: 1.0,  surgeFactor: 1 },
  { name: 'Washing machine',    defaultWattageW: 700,  category: 'KITCHEN',       loadType: 'INDUCTIVE',  dutyCycle: 0.7,  surgeFactor: 4 },
  { name: 'Water heater',       defaultWattageW: 1800, category: 'OTHER',         loadType: 'RESISTIVE',  dutyCycle: 0.2,  surgeFactor: 1 },

  // --- Entertainment ---
  { name: 'TV 32"',             defaultWattageW: 65,   category: 'ENTERTAINMENT', loadType: 'ELECTRONIC', dutyCycle: 1.0,  surgeFactor: 1 },
  { name: 'TV 43"',             defaultWattageW: 100,  category: 'ENTERTAINMENT', loadType: 'ELECTRONIC', dutyCycle: 1.0,  surgeFactor: 1 },
  { name: 'TV 55"',             defaultWattageW: 150,  category: 'ENTERTAINMENT', loadType: 'ELECTRONIC', dutyCycle: 1.0,  surgeFactor: 1 },
  { name: 'DSTV decoder',       defaultWattageW: 30,   category: 'ENTERTAINMENT', loadType: 'ELECTRONIC', dutyCycle: 1.0,  surgeFactor: 1 },
  { name: 'Sound system',       defaultWattageW: 200,  category: 'ENTERTAINMENT', loadType: 'ELECTRONIC', dutyCycle: 0.7,  surgeFactor: 1.5 },

  // --- Computing & connectivity ---
  { name: 'Laptop',             defaultWattageW: 65,   category: 'COMPUTING',     loadType: 'ELECTRONIC', dutyCycle: 1.0,  surgeFactor: 1 },
  { name: 'Desktop computer',   defaultWattageW: 300,  category: 'COMPUTING',     loadType: 'ELECTRONIC', dutyCycle: 1.0,  surgeFactor: 1.5 },
  { name: 'Phone charger',      defaultWattageW: 10,   category: 'COMPUTING',     loadType: 'ELECTRONIC', dutyCycle: 1.0,  surgeFactor: 1 },
  { name: 'WiFi router',        defaultWattageW: 15,   category: 'COMPUTING',     loadType: 'ELECTRONIC', dutyCycle: 1.0,  surgeFactor: 1 },
  { name: 'CCTV system',        defaultWattageW: 45,   category: 'COMPUTING',     loadType: 'ELECTRONIC', dutyCycle: 1.0,  surgeFactor: 1 },
  { name: 'Printer',            defaultWattageW: 400,  category: 'COMPUTING',     loadType: 'ELECTRONIC', dutyCycle: 0.3,  surgeFactor: 2 },

  // --- Water ---
  { name: 'Water pump',         defaultWattageW: 750,  category: 'OTHER',         loadType: 'INDUCTIVE',  dutyCycle: 1.0,  surgeFactor: 6 },
] as const;

/** Look up a preset by exact name. */
export function findPreset(name: string): AppliancePreset | undefined {
  return APPLIANCE_PRESETS.find((p) => p.name === name);
}
