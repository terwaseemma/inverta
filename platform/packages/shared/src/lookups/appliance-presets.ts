// Appliance presets — also written into the DB via packages/db/prisma/seed.ts.
// Keeping a typed in-memory copy lets the calculator UI render presets
// without a DB roundtrip for the first paint.

export type AppliancePresetCategory =
  | 'LIGHTING'
  | 'COOLING'
  | 'KITCHEN'
  | 'ENTERTAINMENT'
  | 'COMPUTING'
  | 'OTHER';

export interface AppliancePreset {
  name: string;
  defaultWattageW: number;
  category: AppliancePresetCategory;
}

export const APPLIANCE_PRESETS: readonly AppliancePreset[] = [
  { name: 'LED bulb',         defaultWattageW: 10,   category: 'LIGHTING' },
  { name: 'Ceiling fan',      defaultWattageW: 60,   category: 'COOLING' },
  { name: 'Standing fan',     defaultWattageW: 75,   category: 'COOLING' },
  { name: 'TV 32"',           defaultWattageW: 80,   category: 'ENTERTAINMENT' },
  { name: 'TV 43"',           defaultWattageW: 120,  category: 'ENTERTAINMENT' },
  { name: 'Refrigerator',     defaultWattageW: 150,  category: 'KITCHEN' },
  { name: 'Freezer',          defaultWattageW: 250,  category: 'KITCHEN' },
  { name: 'Washing machine',  defaultWattageW: 500,  category: 'KITCHEN' },
  { name: 'AC 1HP',           defaultWattageW: 900,  category: 'COOLING' },
  { name: 'AC 1.5HP',         defaultWattageW: 1300, category: 'COOLING' },
  { name: 'AC 2HP',           defaultWattageW: 1800, category: 'COOLING' },
  { name: 'Laptop',           defaultWattageW: 65,   category: 'COMPUTING' },
  { name: 'Desktop computer', defaultWattageW: 250,  category: 'COMPUTING' },
  { name: 'Phone charger',    defaultWattageW: 10,   category: 'COMPUTING' },
  { name: 'Water pump',       defaultWattageW: 750,  category: 'OTHER' },
  { name: 'DSTV decoder',     defaultWattageW: 15,   category: 'ENTERTAINMENT' },
] as const;
