// The customer's building, asked in the calculator, and the rules that turn it
// (with the sized system) into accessory quantities.

export const ROOF_TYPES = ['METAL', 'STONE_COATED', 'CONCRETE', 'GROUND'] as const;
export type RoofType = (typeof ROOF_TYPES)[number];

export const ROOF_TYPE_LABELS: Record<RoofType, string> = {
  METAL: 'Long-span or zinc sheets',
  STONE_COATED: 'Stone-coated tiles',
  CONCRETE: 'Concrete (flat) roof',
  GROUND: 'On the ground',
};

export const BUILDING_STOREYS = ['BUNGALOW', 'ONE', 'TWO', 'THREE_PLUS'] as const;
export type BuildingStoreys = (typeof BUILDING_STOREYS)[number];

export const BUILDING_STOREY_LABELS: Record<BuildingStoreys, string> = {
  BUNGALOW: 'Bungalow',
  ONE: '1 storey',
  TWO: '2 storeys',
  THREE_PLUS: '3 storeys or more',
};

/** Yards of cable from the roof to the inverter, by building height. */
export type CableYards = Record<BuildingStoreys, number>;

/** What an installer starts with; editable in Settings. */
export const DEFAULT_CABLE_YARDS: CableYards = {
  BUNGALOW: 25,
  ONE: 35,
  TWO: 45,
  THREE_PLUS: 55,
};

/** Used when the customer skipped the questions (older links, the API). */
export const DEFAULT_SITE = { roofType: 'METAL', storeys: 'BUNGALOW' } as const satisfies {
  roofType: RoofType;
  storeys: BuildingStoreys;
};

export const ACCESSORY_RULES = ['PER_INSTALL', 'PER_PANEL', 'PER_BATTERY', 'PER_CABLE_YARD'] as const;
export type AccessoryRule = (typeof ACCESSORY_RULES)[number];

export const ACCESSORY_RULE_LABELS: Record<AccessoryRule, string> = {
  PER_INSTALL: 'Fixed per installation',
  PER_PANEL: 'Per solar panel',
  PER_BATTERY: 'Per battery',
  PER_CABLE_YARD: 'Per yard of cable run',
};

/** "2 per panel", "1 per yard of cable", "3 per installation". */
export function describeAccessoryRule(item: {
  qtyRule?: AccessoryRule | null;
  qtyPer?: number | null;
  minKva?: number | null;
  maxKva?: number | null;
  roofTypes?: readonly RoofType[] | null;
}): string {
  const per = item.qtyPer ?? 1;
  const n = Number.isInteger(per) ? String(per) : String(Math.round(per * 100) / 100);
  const rule = item.qtyRule ?? 'PER_INSTALL';
  const parts = [
    rule === 'PER_PANEL'
      ? per === 0.5
        ? '1 per 2 panels'
        : `${n} per panel`
      : rule === 'PER_BATTERY'
        ? `${n} per battery`
        : rule === 'PER_CABLE_YARD'
          ? `${n} per yard of cable`
          : `${n} per installation`,
  ];
  const { minKva, maxKva } = item;
  if (minKva != null && maxKva != null) parts.push(`${minKva}–${maxKva} kVA`);
  else if (minKva != null) parts.push(`${minKva} kVA and up`);
  else if (maxKva != null) parts.push(`up to ${maxKva} kVA`);
  if (item.roofTypes && item.roofTypes.length > 0) {
    parts.push(item.roofTypes.map((r) => ROOF_TYPE_LABELS[r]).join(', '));
  }
  return parts.join(' · ');
}

/** The quote line that collects every accessory not listed on its own. */
export const MATERIALS_LINE_NAME = 'Installation materials';

/**
 * Split accessory lines into those quoted on their own and those rolled into
 * "Installation materials". Lines from before the rule existed carry no
 * `itemized` flag and stay on their own, as they were quoted.
 */
export function splitAccessories<T extends { itemized?: boolean; totalPriceKobo?: number }>(
  lines: readonly T[],
) {
  const itemized = lines.filter((l) => l.itemized !== false);
  const bundled = lines.filter((l) => l.itemized === false);
  const bundledTotalKobo = bundled.reduce((s, l) => s + (l.totalPriceKobo ?? 0), 0);
  return { itemized, bundled, bundledTotalKobo };
}

/** "Battery cables and lugs, Earthing rod and cable" for the materials line. */
export function materialsDetail(lines: readonly { name?: string }[]): string {
  return lines
    .map((l) => (l.name ?? '').replace(/^Generic\s+/i, '').replace(/\s*\((per [^)]*|pair)\)\s*$/i, ''))
    .filter(Boolean)
    .join(', ');
}
