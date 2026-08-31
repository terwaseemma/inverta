// Starter catalog — generic items at market-typical Nigerian prices (kobo).
// Loaded on demand ("Load starter catalog" in the dashboard) so a brand-new
// installer can show prices on day one, then tune everything to their real
// stock. Never seeded silently: prices shown to customers should always be
// something the installer opted into.

export interface StarterCatalogItem {
  type: 'INVERTER' | 'BATTERY' | 'PANEL' | 'GENERATOR' | 'ACCESSORY';
  brand: string;
  model: string;
  capacity: number;
  unit: 'KVA' | 'KWH' | 'AH' | 'W' | 'UNIT';
  voltage?: number;
  /** DC system class (12/24/48) for inverter↔battery matching */
  systemVoltage?: number;
  storageKwh?: number;
  chemistry?: 'LITHIUM' | 'AGM' | 'GEL';
  priceKobo: number;
  notes?: string;
}

const NOTE = 'Starter estimate — replace with your real pricing.';

/**
 * Marks a platform catalog price as trade/wholesale — the installer adds their
 * own margin when importing. It is a fact about the PLATFORM listing, not about
 * the installer's own stock, so every path that copies an item into an
 * installer's catalog strips it. Exported so the admin catalog and the import
 * logic cannot drift on the exact wording.
 */
export const WHOLESALE_NOTE =
  'Wholesale price — add your markup before importing.';

/** Drop the wholesale marker on import, preserving any genuine note. */
export function stripWholesaleNote(notes: string | null): string | null {
  if (!notes) return null;
  const rest = notes.replace(WHOLESALE_NOTE, '').trim();
  return rest.length > 0 ? rest : null;
}

export const STARTER_CATALOG: readonly StarterCatalogItem[] = [
  // Inverters (hybrid, kVA)
  { type: 'INVERTER', brand: 'Generic', model: 'Hybrid 1.5kVA', capacity: 1.5, unit: 'KVA', priceKobo: 280_000_00, notes: NOTE },
  { type: 'INVERTER', brand: 'Generic', model: 'Hybrid 2.5kVA', capacity: 2.5, unit: 'KVA', priceKobo: 400_000_00, notes: NOTE },
  { type: 'INVERTER', brand: 'Generic', model: 'Hybrid 3.5kVA', capacity: 3.5, unit: 'KVA', priceKobo: 550_000_00, notes: NOTE },
  { type: 'INVERTER', brand: 'Generic', model: 'Hybrid 5kVA',   capacity: 5,   unit: 'KVA', priceKobo: 800_000_00, notes: NOTE },
  { type: 'INVERTER', brand: 'Generic', model: 'Hybrid 7.5kVA', capacity: 7.5, unit: 'KVA', priceKobo: 1_250_000_00, notes: NOTE },
  { type: 'INVERTER', brand: 'Generic', model: 'Hybrid 10kVA',  capacity: 10,  unit: 'KVA', priceKobo: 1_800_000_00, notes: NOTE },

  // Batteries
  { type: 'BATTERY', brand: 'Generic', model: 'Lithium 2.4kWh', capacity: 2.4, unit: 'KWH', chemistry: 'LITHIUM', priceKobo: 750_000_00, notes: NOTE },
  { type: 'BATTERY', brand: 'Generic', model: 'Lithium 3.5kWh', capacity: 3.5, unit: 'KWH', chemistry: 'LITHIUM', priceKobo: 1_050_000_00, notes: NOTE },
  { type: 'BATTERY', brand: 'Generic', model: 'Lithium 5kWh',   capacity: 5,   unit: 'KWH', chemistry: 'LITHIUM', priceKobo: 1_500_000_00, notes: NOTE },
  { type: 'BATTERY', brand: 'Generic', model: 'AGM 220Ah 12V',  capacity: 220, unit: 'AH', voltage: 12, chemistry: 'AGM', priceKobo: 270_000_00, notes: NOTE },

  // Panels (W per panel)
  { type: 'PANEL', brand: 'Generic', model: 'Mono 450W', capacity: 450, unit: 'W', priceKobo: 110_000_00, notes: NOTE },
  { type: 'PANEL', brand: 'Generic', model: 'Mono 550W', capacity: 550, unit: 'W', priceKobo: 140_000_00, notes: NOTE },

  // All-in-one solar generators (inverter + built-in lithium battery)
  { type: 'GENERATOR', brand: 'Generic', model: 'Solar Generator 2kVA/2kWh', capacity: 2, unit: 'KVA', storageKwh: 2, priceKobo: 950_000_00, notes: NOTE },
  { type: 'GENERATOR', brand: 'Generic', model: 'Solar Generator 3.6kVA/3.8kWh', capacity: 3.6, unit: 'KVA', storageKwh: 3.8, priceKobo: 1_650_000_00, notes: NOTE },

  // Accessories
  { type: 'ACCESSORY', brand: 'Generic', model: 'Mounting kit (per panel)', capacity: 1, unit: 'UNIT', priceKobo: 25_000_00, notes: NOTE },
  { type: 'ACCESSORY', brand: 'Generic', model: 'Cabling & connectors set', capacity: 1, unit: 'UNIT', priceKobo: 60_000_00, notes: NOTE },
  { type: 'ACCESSORY', brand: 'Generic', model: 'DC protection box', capacity: 1, unit: 'UNIT', priceKobo: 45_000_00, notes: NOTE },
] as const;
