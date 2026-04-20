import { calculate } from './calculate';
import { CalculationError, type EngineCatalog, type CalculationInput } from './types';
import {
  DIESEL_CO2_KG_PER_L,
  GEN_FUEL_CONSUMPTION_L_PER_KVA_HR,
  INVERTER_SAFETY_FACTOR,
} from './constants';

function makeCatalog(overrides: Partial<EngineCatalog> = {}): EngineCatalog {
  return {
    inverters: [
      { id: 'inv-1', brand: 'A', model: '2kVA', capacity: 2, unit: 'KVA', priceKobo: 300_000_00 },
      { id: 'inv-2', brand: 'A', model: '3.5kVA', capacity: 3.5, unit: 'KVA', priceKobo: 500_000_00 },
      { id: 'inv-3', brand: 'A', model: '5kVA', capacity: 5, unit: 'KVA', priceKobo: 780_000_00 },
    ],
    batteries: [
      { id: 'bat-li', brand: 'L', model: 'Li 3.5kWh', capacity: 3.5, unit: 'KWH', chemistry: 'LITHIUM', priceKobo: 1_000_000_00 },
      { id: 'bat-agm', brand: 'M', model: 'AGM 200Ah', capacity: 200, unit: 'AH', voltage: 12, chemistry: 'AGM', priceKobo: 250_000_00 },
    ],
    panels: [
      { id: 'pan-1', brand: 'P', model: '450W', capacity: 450, unit: 'W', priceKobo: 115_000_00 },
    ],
    accessories: [
      { id: 'acc-1', brand: 'X', model: 'Rails', capacity: 1, unit: 'UNIT', priceKobo: 25_000_00 },
    ],
    markupPercent: 15,
    installationFeeKobo: 100_000_00,
    ...overrides,
  };
}

function baseInput(overrides: Partial<CalculationInput> = {}): CalculationInput {
  return {
    appliances: [
      { name: 'LED bulb', wattage: 10, quantity: 6, hoursPerDay: 6 },       // 60W, 360Wh
      { name: 'Fan', wattage: 75, quantity: 2, hoursPerDay: 8 },             // 150W, 1200Wh
      { name: 'Fridge', wattage: 150, quantity: 1, hoursPerDay: 12 },        // 150W, 1800Wh
    ],
    backupHours: 6,
    batteryPreference: 'lithium',
    sunHours: 5.5,
    ...overrides,
  };
}

describe('calculate — load & energy totals', () => {
  it('sums load and daily energy across appliances and quantities', () => {
    const r = calculate(baseInput(), makeCatalog());
    // 60 + 150 + 150
    expect(r.totalLoadW).toBe(360);
    // 360 + 1200 + 1800
    expect(r.dailyEnergyWh).toBe(3360);
  });

  it('handles custom wattage appliances', () => {
    const r = calculate(
      baseInput({
        appliances: [{ name: 'Custom device', wattage: 500, quantity: 1, hoursPerDay: 4 }],
      }),
      makeCatalog(),
    );
    expect(r.totalLoadW).toBe(500);
    expect(r.dailyEnergyWh).toBe(2000);
  });

  it('throws on empty appliance list', () => {
    expect(() => calculate(baseInput({ appliances: [] }), makeCatalog())).toThrow(
      CalculationError,
    );
  });
});

describe('calculate — inverter sizing', () => {
  it('picks the smallest inverter that covers load × 1.25', () => {
    // 360W load → 450W required → 0.45 kVA → smallest inverter is 2kVA, picks it.
    const r = calculate(baseInput(), makeCatalog());
    expect(r.inverter.capacityKva).toBe(2);
  });

  it('upsizes when load exceeds the smallest option', () => {
    // 3000W load → 3750W required → 3.75 kVA → 5kVA is first >= 3.75.
    const r = calculate(
      baseInput({
        appliances: [{ name: 'Big AC', wattage: 3000, quantity: 1, hoursPerDay: 4 }],
      }),
      makeCatalog(),
    );
    expect(r.inverter.capacityKva).toBe(5);
  });

  it('warns and picks largest when load exceeds largest inverter', () => {
    const r = calculate(
      baseInput({
        appliances: [{ name: 'Huge load', wattage: 10_000, quantity: 1, hoursPerDay: 2 }],
      }),
      makeCatalog(),
    );
    expect(r.inverter.capacityKva).toBe(5);
    expect(r.warnings.some((w) => w.includes('Load exceeds largest inverter'))).toBe(true);
    // Sanity — ensure safety factor is actually being applied.
    expect(10_000 * INVERTER_SAFETY_FACTOR).toBe(12_500);
  });

  it('throws if no inverter is stocked', () => {
    expect(() =>
      calculate(baseInput(), makeCatalog({ inverters: [] })),
    ).toThrow(CalculationError);
  });
});

describe('calculate — battery sizing', () => {
  it('sizes a lithium bank using 0.8 DOD and 0.85 roundtrip efficiency', () => {
    // 360W × 6hr backup = 2160Wh needed
    // effective capacity = 2160 / (0.85 × 0.8) = ~3176Wh
    // single unit = 3500Wh → ceil(3176/3500) = 1 unit
    const r = calculate(baseInput({ backupHours: 6 }), makeCatalog());
    expect(r.batteries.chemistry).toBe('LITHIUM');
    expect(r.batteries.count).toBe(1);
    expect(r.batteries.singleUnitCapacityKwh).toBeCloseTo(3.5);
  });

  it('uses AGM 0.5 DOD when preference is agm', () => {
    // 360W × 6hr = 2160Wh
    // effective = 2160 / (0.85 × 0.5) = ~5082Wh
    // AGM single unit = 200Ah × 12V = 2400Wh → ceil(5082/2400) = 3 units
    const r = calculate(baseInput({ batteryPreference: 'agm' }), makeCatalog());
    expect(r.batteries.chemistry).toBe('AGM');
    expect(r.batteries.count).toBe(3);
  });

  it('scales with longer backup windows', () => {
    const short = calculate(baseInput({ backupHours: 4 }), makeCatalog());
    const long = calculate(baseInput({ backupHours: 24 }), makeCatalog());
    expect(long.batteries.count).toBeGreaterThan(short.batteries.count);
  });

  it('falls back to any chemistry when preferred is not stocked', () => {
    const lithiumOnly = makeCatalog({
      batteries: [
        { id: 'bat-li', brand: 'L', model: 'Li', capacity: 3.5, unit: 'KWH', chemistry: 'LITHIUM', priceKobo: 1_000_000_00 },
      ],
    });
    const r = calculate(baseInput({ batteryPreference: 'agm' }), lithiumOnly);
    expect(r.batteries.chemistry).toBe('LITHIUM');
    expect(r.warnings.some((w) => w.toLowerCase().includes('falling back'))).toBe(true);
  });
});

describe('calculate — solar array sizing', () => {
  it('sizes kWp from daily energy and sun hours, rounds panel count up', () => {
    // 3360Wh / 1000 / 5.5 × 1.25 = 0.764 kWp → 764W / 450W per panel → ceil(1.69) = 2 panels
    const r = calculate(baseInput(), makeCatalog());
    expect(r.panels.count).toBe(2);
    expect(r.panels.totalKwp).toBeCloseTo(0.9, 1); // 2 × 450 = 900W = 0.9 kWp
  });

  it('respects the sunHours override (lower insolation → more panels)', () => {
    const bright = calculate(baseInput({ sunHours: 6.0 }), makeCatalog());
    const dim = calculate(baseInput({ sunHours: 3.0 }), makeCatalog());
    expect(dim.panels.count).toBeGreaterThan(bright.panels.count);
  });
});

describe('calculate — cost math', () => {
  it('applies markup on the subtotal', () => {
    const r = calculate(baseInput(), makeCatalog({ markupPercent: 20 }));
    const expectedMarkup = Math.round((r.subtotalKobo * 20) / 100);
    expect(r.markupKobo).toBe(expectedMarkup);
    expect(r.totalKobo).toBe(r.subtotalKobo + r.markupKobo);
  });

  it('uses a percentage installation fee when set', () => {
    const r = calculate(
      baseInput(),
      makeCatalog({ installationFeeKobo: 0, installationFeePercent: 10 }),
    );
    // fee is 10% of components cost
    const components = r.subtotalKobo - r.installationFeeKobo;
    expect(r.installationFeeKobo).toBe(Math.round((components * 10) / 100));
  });
});

describe('calculate — savings', () => {
  it('returns null savings when no spend provided', () => {
    const r = calculate(baseInput(), makeCatalog());
    expect(r.monthlySavingsKobo).toBeNull();
    expect(r.paybackMonths).toBeNull();
  });

  it('computes amortised savings over 5 years when spend provided', () => {
    const r = calculate(
      baseInput({
        monthlyElectricityBillKobo: 50_000_00,   // ₦50k
        monthlyFuelCostKobo: 30_000_00,           // ₦30k
      }),
      makeCatalog(),
    );
    const currentSpend = 80_000_00;
    const amortised = r.totalKobo / 60;
    expect(r.monthlySavingsKobo).toBe(Math.round(currentSpend - amortised));
    expect(r.paybackMonths).toBe(Math.round(r.totalKobo / currentSpend));
  });
});

describe('calculate — CO2', () => {
  it('returns null when no generator data provided', () => {
    const r = calculate(baseInput(), makeCatalog());
    expect(r.co2SavedKgPerMonth).toBeNull();
  });

  it('uses 0.3 L/hr/kVA × 2.68 kg/L × 30 days', () => {
    const r = calculate(
      baseInput({
        generatorCapacityKva: 5,
        generatorHoursPerDay: 4,
      }),
      makeCatalog(),
    );
    const expected = Number(
      (5 * GEN_FUEL_CONSUMPTION_L_PER_KVA_HR * 4 * 30 * DIESEL_CO2_KG_PER_L).toFixed(1),
    );
    expect(r.co2SavedKgPerMonth).toBe(expected);
  });
});
