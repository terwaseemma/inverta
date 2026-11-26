import { buildAccessoryLines, calculate } from './calculate';
import type { EngineCatalog, EngineCatalogItem } from './types';
import { materialsDetail, splitAccessories, STARTER_ACCESSORIES } from '../index';

const acc = (id: string, over: Partial<EngineCatalogItem>): EngineCatalogItem => ({
  id,
  brand: 'Generic',
  model: id,
  capacity: 1,
  unit: 'UNIT',
  priceKobo: 1_000_00,
  ...over,
});

const catalog = (accessories: EngineCatalogItem[], over: Partial<EngineCatalog> = {}): EngineCatalog => ({
  inverters: [],
  batteries: [],
  panels: [],
  generators: [],
  accessories,
  installationFeeKobo: 0,
  ...over,
});

// The user's own case: a 4.2 kVA all-in-one with six panels.
const aio = { kva: 4.2, panelCount: 6, batteryCount: 0 };

describe('accessory quantities', () => {
  it('keeps the old behaviour for an accessory with no rule: one, its own line', () => {
    const [line] = buildAccessoryLines(catalog([acc('box', {})]), aio);
    expect(line).toMatchObject({ quantity: 1, totalPriceKobo: 1_000_00, itemized: true });
    expect(line!.unit).toBeUndefined();
  });

  it('scales per panel, rounding part sets up', () => {
    const lines = buildAccessoryLines(
      catalog([acc('rails', { qtyRule: 'PER_PANEL' }), acc('pair', { qtyRule: 'PER_PANEL', qtyPer: 0.5 })]),
      { ...aio, panelCount: 7 },
    );
    expect(lines.map((l) => l.quantity)).toEqual([7, 4]);
  });

  it('does not round 6 × 1/3 up to 3', () => {
    const [line] = buildAccessoryLines(catalog([acc('x', { qtyRule: 'PER_PANEL', qtyPer: 1 / 3 })]), aio);
    expect(line!.quantity).toBe(2);
  });

  it('sizes cable from the building height, with the installer’s yards', () => {
    const items = [acc('dc', { qtyRule: 'PER_CABLE_YARD' })];
    expect(buildAccessoryLines(catalog(items), { ...aio, storeys: 'BUNGALOW' })[0]).toMatchObject({ quantity: 25, unit: 'yard' });
    expect(buildAccessoryLines(catalog(items), { ...aio, storeys: 'ONE' })[0]!.quantity).toBe(35);
    const own = catalog(items, { cableYards: { BUNGALOW: 20, ONE: 32, TWO: 40, THREE_PLUS: 50 } });
    expect(buildAccessoryLines(own, { ...aio, storeys: 'ONE' })[0]!.quantity).toBe(32);
  });

  it('defaults to a bungalow when the building is unknown', () => {
    const [line] = buildAccessoryLines(catalog([acc('dc', { qtyRule: 'PER_CABLE_YARD' })]), aio);
    expect(line!.quantity).toBe(25);
  });

  it('picks the cable gauge by kVA band', () => {
    const items = [
      acc('6mm', { qtyRule: 'PER_CABLE_YARD', maxKva: 6.5 }),
      acc('10mm', { qtyRule: 'PER_CABLE_YARD', minKva: 6.6 }),
    ];
    expect(buildAccessoryLines(catalog(items), aio).map((l) => l.id)).toEqual(['6mm']);
    expect(buildAccessoryLines(catalog(items), { ...aio, kva: 10 }).map((l) => l.id)).toEqual(['10mm']);
    // No unit sized: neither banded item can be placed.
    expect(buildAccessoryLines(catalog(items), { ...aio, kva: null })).toEqual([]);
  });

  it('picks mounting by roof, sheet roof by default', () => {
    const items = [
      acc('sheet', { qtyRule: 'PER_PANEL', roofTypes: ['METAL', 'STONE_COATED'] }),
      acc('concrete', { qtyRule: 'PER_PANEL', roofTypes: ['CONCRETE'] }),
      acc('any', {}),
    ];
    expect(buildAccessoryLines(catalog(items), aio).map((l) => l.id)).toEqual(['sheet', 'any']);
    expect(buildAccessoryLines(catalog(items), { ...aio, roofType: 'CONCRETE' }).map((l) => l.id)).toEqual(['concrete', 'any']);
  });

  it('leaves out per-battery parts on an all-in-one', () => {
    const items = [acc('battery-cables', { qtyRule: 'PER_BATTERY' })];
    expect(buildAccessoryLines(catalog(items), aio)).toEqual([]);
    expect(buildAccessoryLines(catalog(items), { ...aio, batteryCount: 3 })[0]!.quantity).toBe(3);
  });
});

describe('the starter accessory set', () => {
  const lines = (system: Parameters<typeof buildAccessoryLines>[1]) =>
    buildAccessoryLines(
      catalog(STARTER_ACCESSORIES.map((s, i) => ({ ...s, id: `s${i}`, roofTypes: s.roofTypes ? [...s.roofTypes] : [] }))),
      system,
    );

  it('quotes a 4.2 kVA all-in-one on a sheet-roof bungalow with 6mm DC and 4mm AC', () => {
    const names = lines({ ...aio, roofType: 'METAL', storeys: 'BUNGALOW' }).map((l) => l.name);
    expect(names).toEqual(expect.arrayContaining(['Generic 6mm DC solar cable (per yard)', 'Generic 4mm AC cable (per yard)']));
    expect(names.some((n) => /10mm|combiner|high current|battery cables|concrete/i.test(n))).toBe(false);
  });

  it('quotes a 10 kVA system on a concrete storey building with 10mm cable and the extras', () => {
    const out = lines({ kva: 10, panelCount: 16, batteryCount: 4, roofType: 'CONCRETE', storeys: 'ONE' });
    const by = (re: RegExp) => out.find((l) => re.test(l.name));
    expect(by(/10mm DC/)!.quantity).toBe(35);
    expect(by(/Tilt frame/)!.quantity).toBe(16);
    expect(by(/combiner/i)).toBeDefined();
    expect(by(/Battery cables/)!.quantity).toBe(4);
    expect(by(/6mm DC|Rails and clamps/)).toBeUndefined();
  });
});

describe('quote lines', () => {
  it('splits itemized lines from "Installation materials", old lines stay itemized', () => {
    const split = splitAccessories([
      { name: 'Breaker', totalPriceKobo: 100, itemized: true },
      { name: 'Old line', totalPriceKobo: 50 },
      { name: 'Generic Earthing rod and cable', totalPriceKobo: 30, itemized: false },
      { name: 'Generic Conduit, trunking and fittings (per yard)', totalPriceKobo: 20, itemized: false },
    ]);
    expect(split.itemized.map((l) => l.name)).toEqual(['Breaker', 'Old line']);
    expect(split.bundledTotalKobo).toBe(50);
    expect(materialsDetail(split.bundled)).toBe('Earthing rod and cable, Conduit, trunking and fittings');
  });

  it('prices labour on the materials, accessories included', () => {
    const base = catalog([acc('rails', { qtyRule: 'PER_PANEL', priceKobo: 25_000_00 })], {
      inverters: [{ id: 'inv', brand: 'A', model: '3.5kVA', capacity: 3.5, unit: 'KVA', priceKobo: 500_000_00 }],
      batteries: [{ id: 'bat', brand: 'L', model: 'Li 5kWh', capacity: 5, unit: 'KWH', chemistry: 'LITHIUM', priceKobo: 1_000_000_00 }],
      panels: [{ id: 'pan', brand: 'P', model: '550W', capacity: 550, unit: 'W', priceKobo: 140_000_00 }],
      installationFeePercent: 10,
    });
    const r = calculate(
      {
        appliances: [{ name: 'Fan', wattage: 75, quantity: 4, hoursPerDay: 8 }],
        backupHours: 6,
        batteryPreference: 'lithium',
        sunHours: 5.5,
      },
      base,
    );
    const rails = r.accessories[0]!;
    expect(rails.quantity).toBe(r.panels!.count);
    const materials = r.pricing!.totalKobo - r.pricing!.installationFeeKobo;
    expect(r.pricing!.installationFeeKobo).toBe(Math.round(materials / 10));
  });
});
