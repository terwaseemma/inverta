import { calculate } from './calculate';
import { CalculationError, type EngineCatalog, type CalculationInput } from './types';
import {
  AGGREGATE_POWER_FACTOR,
  DIESEL_CO2_KG_PER_L,
  FUTURE_LOAD_RESERVE,
  GEN_FUEL_CONSUMPTION_L_PER_KVA_HR,
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
    generators: [],
    accessories: [
      { id: 'acc-1', brand: 'X', model: 'Rails', capacity: 1, unit: 'UNIT', priceKobo: 25_000_00 },
    ],
    markupPercent: 15,
    installationFeeKobo: 100_000_00,
    ...overrides,
  };
}

const EMPTY_CATALOG: EngineCatalog = {
  inverters: [],
  batteries: [],
  panels: [],
  generators: [],
  accessories: [],
  markupPercent: 15,
  installationFeeKobo: 0,
};

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

describe('calculate — duty cycle', () => {
  it('discounts cycling appliances in average load and daily energy', () => {
    // A fridge is plugged in 24h but its compressor runs 40% of that.
    const r = calculate(
      baseInput({
        appliances: [
          { name: 'Fridge', wattage: 200, quantity: 1, hoursPerDay: 24, dutyCycle: 0.4 },
        ],
      }),
      makeCatalog(),
    );
    // Peak stays at the nameplate — the compressor may be running at peak time.
    expect(r.totalLoadW).toBe(200);
    // Average and energy are discounted: 200 × 0.4 = 80W, × 24h = 1920Wh.
    expect(r.averageLoadW).toBe(80);
    expect(r.dailyEnergyWh).toBe(1920);
  });

  it('treats a missing duty cycle as continuous draw', () => {
    const r = calculate(
      baseInput({
        appliances: [{ name: 'Heater', wattage: 500, quantity: 1, hoursPerDay: 4 }],
      }),
      makeCatalog(),
    );
    expect(r.averageLoadW).toBe(500);
    expect(r.dailyEnergyWh).toBe(2000);
  });

  it('sizes the battery on average draw, not the sum of nameplates', () => {
    const withDuty = calculate(
      baseInput({
        appliances: [
          { name: 'Fridge', wattage: 200, quantity: 1, hoursPerDay: 24, dutyCycle: 0.4 },
        ],
        backupHours: 6,
      }),
      makeCatalog(),
    );
    const withoutDuty = calculate(
      baseInput({
        appliances: [
          { name: 'Fridge', wattage: 200, quantity: 1, hoursPerDay: 24 },
        ],
        backupHours: 6,
      }),
      makeCatalog(),
    );
    // 80W × 6h vs 200W × 6h — the cycling fridge needs a much smaller bank.
    expect(withDuty.requirements.batteryBankKwh).toBeLessThan(
      withoutDuty.requirements.batteryBankKwh,
    );
    expect(withDuty.requirements.batteryBankKwh).toBeCloseTo(0.63, 2);
  });
});

describe('calculate — startup surge', () => {
  it('reports the largest inrush landing on top of everything else running', () => {
    const r = calculate(
      baseInput({
        appliances: [
          { name: 'AC', wattage: 1000, quantity: 1, hoursPerDay: 6, surgeFactor: 5 },
          { name: 'Lights', wattage: 100, quantity: 1, hoursPerDay: 6 },
        ],
      }),
      makeCatalog(),
    );
    // AC surges to 5000W while the 100W of lights keep running.
    expect(r.requirements.peakSurgeW).toBe(5100);
  });

  it('is just the connected load when nothing has inrush', () => {
    const r = calculate(
      baseInput({
        appliances: [{ name: 'Kettle', wattage: 1800, quantity: 1, hoursPerDay: 1 }],
      }),
      makeCatalog(),
    );
    expect(r.requirements.peakSurgeW).toBe(1800);
  });

  it('rejects an inverter that can run the load but not start it', () => {
    // 1200W of load needs only ~1.8 kVA continuous, but the pump's 6× inrush
    // demands 7,200W — beyond a 2 kVA unit's 2× surge (4,000W).
    const catalog = makeCatalog({
      inverters: [
        { id: 'small', brand: 'A', model: '2kVA', capacity: 2, unit: 'KVA', priceKobo: 300_000_00 },
        { id: 'big', brand: 'A', model: '5kVA', capacity: 5, unit: 'KVA', priceKobo: 780_000_00 },
      ],
    });
    const r = calculate(
      baseInput({
        appliances: [
          { name: 'Water pump', wattage: 1200, quantity: 1, hoursPerDay: 2, surgeFactor: 6 },
        ],
      }),
      catalog,
    );
    expect(r.requirements.peakSurgeW).toBe(7200);
    expect(r.inverter!.capacityKva).toBe(5);
  });

  it('warns when no stocked inverter can cover the surge', () => {
    const catalog = makeCatalog({
      inverters: [
        { id: 'only', brand: 'A', model: '2kVA', capacity: 2, unit: 'KVA', priceKobo: 300_000_00 },
      ],
    });
    const r = calculate(
      baseInput({
        appliances: [
          { name: 'Pump', wattage: 1000, quantity: 1, hoursPerDay: 2, surgeFactor: 6 },
        ],
      }),
      catalog,
    );
    expect(r.warnings.some((w) => w.toLowerCase().includes('surge'))).toBe(true);
  });
});

describe('calculate — requirements (catalog-independent)', () => {
  it('always reports inverter, battery bank, and array sizing', () => {
    const r = calculate(baseInput(), makeCatalog());
    // Inverters are rated in kVA: 360W ÷ 0.8 PF × 1.2 reserve = 540VA = 0.54 kVA
    expect(r.requirements.inverterKva).toBe(0.54);
    // 360W × 6h = 2160Wh / (0.95 lithium efficiency × 0.8 DOD) → 2.84 kWh
    expect(r.requirements.batteryBankKwh).toBe(2.84);
    // 3360/1000/5.5 × 1.25 = 0.7636 → 0.76 kWp
    expect(r.requirements.panelArrayKwp).toBe(0.76);
  });

  it('uses AGM depth-of-discharge and efficiency for the bank when preferred', () => {
    const r = calculate(baseInput({ batteryPreference: 'agm' }), makeCatalog());
    // 2160Wh / (0.85 lead-acid efficiency × 0.5 DOD) = 5082.35Wh → 5.08 kWh
    expect(r.requirements.batteryBankKwh).toBe(5.08);
  });

  it('reports requirements even with a completely empty catalog', () => {
    const r = calculate(baseInput(), EMPTY_CATALOG);
    expect(r.requirements.inverterKva).toBeGreaterThan(0);
    expect(r.requirements.batteryBankKwh).toBeGreaterThan(0);
    expect(r.requirements.panelArrayKwp).toBeGreaterThan(0);
  });
});

describe('calculate — inverter sizing', () => {
  it('picks the smallest inverter that covers load × 1.25', () => {
    // 360W load → 450W required → 0.45 kVA → smallest inverter is 2kVA, picks it.
    const r = calculate(baseInput(), makeCatalog());
    expect(r.inverter!.capacityKva).toBe(2);
  });

  it('upsizes when load exceeds the smallest option', () => {
    // 3000W load → 3750W required → 3.75 kVA → 5kVA is first >= 3.75.
    const r = calculate(
      baseInput({
        appliances: [{ name: 'Big AC', wattage: 3000, quantity: 1, hoursPerDay: 4 }],
      }),
      makeCatalog(),
    );
    expect(r.inverter!.capacityKva).toBe(5);
  });

  it('warns and picks largest when load exceeds largest inverter', () => {
    const r = calculate(
      baseInput({
        appliances: [{ name: 'Huge load', wattage: 10_000, quantity: 1, hoursPerDay: 2 }],
      }),
      makeCatalog(),
    );
    expect(r.inverter!.capacityKva).toBe(5);
    expect(r.warnings.some((w) => w.includes('Load exceeds largest inverter'))).toBe(true);
    // Sanity — power factor and reserve are actually being applied.
    expect((10_000 / AGGREGATE_POWER_FACTOR) * FUTURE_LOAD_RESERVE).toBe(15_000);
  });
});

describe('calculate — battery sizing', () => {
  it('sizes a lithium bank using 0.8 DOD and 0.95 roundtrip efficiency', () => {
    // 360W × 6hr backup = 2160Wh needed
    // effective capacity = 2160 / (0.95 × 0.8) = ~2842Wh
    // single unit = 3500Wh → ceil(2842/3500) = 1 unit
    const r = calculate(baseInput({ backupHours: 6 }), makeCatalog());
    expect(r.batteries!.chemistry).toBe('LITHIUM');
    expect(r.batteries!.count).toBe(1);
    expect(r.batteries!.singleUnitCapacityKwh).toBeCloseTo(3.5);
  });

  it('uses AGM 0.5 DOD when preference is agm', () => {
    // 360W × 6hr = 2160Wh
    // effective = 2160 / (0.85 × 0.5) = ~5082Wh
    // AGM single unit = 200Ah × 12V = 2400Wh → ceil(5082/2400) = 3 units
    const r = calculate(baseInput({ batteryPreference: 'agm' }), makeCatalog());
    expect(r.batteries!.chemistry).toBe('AGM');
    expect(r.batteries!.count).toBe(3);
  });

  it('scales with longer backup windows', () => {
    const short = calculate(baseInput({ backupHours: 4 }), makeCatalog());
    const long = calculate(baseInput({ backupHours: 24 }), makeCatalog());
    expect(long.batteries!.count).toBeGreaterThan(short.batteries!.count);
  });

  it('picks the CHEAPEST workable configuration, not the largest battery', () => {
    // Requirement: 360W × 6h = 2160Wh → lithium effective ≈ 3176Wh.
    // Large: 1× 15kWh @ ₦1.8M = ₦1.8M. Small: 1× 4.019kWh @ ₦550k = ₦550k.
    // The small battery covers it for less than a third of the price.
    const catalog = makeCatalog({
      batteries: [
        { id: 'big', brand: 'Haisic', model: '15kWh 48V', capacity: 15, unit: 'KWH', chemistry: 'LITHIUM', priceKobo: 1_800_000_00 },
        { id: 'small', brand: 'Haisic', model: '4kWh 12.8V', capacity: 4.019, unit: 'KWH', chemistry: 'LITHIUM', priceKobo: 550_000_00 },
      ],
    });
    const r = calculate(baseInput(), catalog);
    expect(r.batteries!.id).toBe('small');
    expect(r.batteries!.count).toBe(1);
    expect(r.batteries!.totalPriceKobo).toBe(550_000_00);
  });

  it('uses multiple small units when that beats one large unit on price', () => {
    // Need ≈ 6353Wh effective (720W × 6h ÷ 0.85 ÷ 0.8).
    // 2× 4.019kWh @ ₦550k = ₦1.1M vs 1× 15kWh @ ₦1.8M → two small units win.
    const catalog = makeCatalog({
      batteries: [
        { id: 'big', brand: 'Haisic', model: '15kWh 48V', capacity: 15, unit: 'KWH', chemistry: 'LITHIUM', priceKobo: 1_800_000_00 },
        { id: 'small', brand: 'Haisic', model: '4kWh 12.8V', capacity: 4.019, unit: 'KWH', chemistry: 'LITHIUM', priceKobo: 550_000_00 },
      ],
    });
    const r = calculate(
      baseInput({
        appliances: [{ name: 'Load', wattage: 720, quantity: 1, hoursPerDay: 6 }],
      }),
      catalog,
    );
    expect(r.batteries!.id).toBe('small');
    expect(r.batteries!.count).toBe(2);
  });

  it('avoids impractical parallel counts by stepping up to larger units', () => {
    // Requirement ≈ 21.2kWh effective (2400W × 6h ÷ 0.85 ÷ 0.8).
    // Tiny 1kWh @ ₦100k → 22 units (impractical, even though ₦2.2M is cheapest).
    // 15kWh @ ₦1.8M → 2 units ₦3.6M — allowed (≤6 units) so it wins.
    const catalog = makeCatalog({
      batteries: [
        { id: 'tiny', brand: 'T', model: '1kWh', capacity: 1, unit: 'KWH', chemistry: 'LITHIUM', priceKobo: 100_000_00 },
        { id: 'big', brand: 'Haisic', model: '15kWh 48V', capacity: 15, unit: 'KWH', chemistry: 'LITHIUM', priceKobo: 1_800_000_00 },
      ],
    });
    const r = calculate(
      baseInput({
        appliances: [{ name: 'Load', wattage: 2400, quantity: 1, hoursPerDay: 6 }],
      }),
      catalog,
    );
    expect(r.batteries!.id).toBe('big');
    expect(r.batteries!.count).toBeLessThanOrEqual(6);
  });

  it('caps lead-acid at three parallel strings even when stacking is cheaper', () => {
    // Need ~8.5kWh effective (600W × 6h ÷ 0.85 ÷ 0.5).
    // 100Ah units: 8 needed @ ₦120k = ₦960k — cheapest, but 8 strings in
    // parallel chronically undercharge, so it must be rejected.
    // 300Ah units: 3 needed @ ₦420k = ₦1.26M — priciest, but buildable.
    const leadAcidOnly = makeCatalog({
      batteries: [
        { id: 'small-agm', brand: 'M', model: 'AGM 100Ah', capacity: 100, unit: 'AH', voltage: 12, chemistry: 'AGM', priceKobo: 120_000_00 },
        { id: 'xl-agm', brand: 'M', model: 'AGM 300Ah', capacity: 300, unit: 'AH', voltage: 12, chemistry: 'AGM', priceKobo: 420_000_00 },
      ],
    });
    const r = calculate(
      baseInput({
        appliances: [{ name: 'Load', wattage: 600, quantity: 1, hoursPerDay: 6 }],
        batteryPreference: 'agm',
        backupHours: 6,
      }),
      leadAcidOnly,
    );
    expect(r.batteries!.id).toBe('xl-agm');
    expect(r.batteries!.count).toBeLessThanOrEqual(3);
  });

  it('allows lithium banks past three units (the BMS balances them)', () => {
    const lithiumOnly = makeCatalog({
      batteries: [
        { id: 'lfp-small', brand: 'L', model: 'LFP 2.4kWh', capacity: 2.4, unit: 'KWH', chemistry: 'LITHIUM', priceKobo: 500_000_00 },
      ],
    });
    const r = calculate(
      baseInput({
        appliances: [{ name: 'Load', wattage: 1500, quantity: 1, hoursPerDay: 6 }],
        backupHours: 8,
      }),
      lithiumOnly,
    );
    // 1500W × 8h ÷ (0.95 × 0.8) = 15.8kWh ÷ 2.4 = 7 units — allowed for LFP.
    expect(r.batteries!.count).toBeGreaterThan(3);
    expect(r.warnings.some((w) => w.includes('parallel'))).toBe(false);
  });

  it('falls back to any chemistry when preferred is not stocked', () => {
    const lithiumOnly = makeCatalog({
      batteries: [
        { id: 'bat-li', brand: 'L', model: 'Li', capacity: 3.5, unit: 'KWH', chemistry: 'LITHIUM', priceKobo: 1_000_000_00 },
      ],
    });
    const r = calculate(baseInput({ batteryPreference: 'agm' }), lithiumOnly);
    expect(r.batteries!.chemistry).toBe('LITHIUM');
    expect(r.warnings.some((w) => w.toLowerCase().includes('falling back'))).toBe(true);
  });
});

describe('calculate — solar array sizing', () => {
  it('sizes kWp from daily energy and sun hours, rounds panel count up', () => {
    // 3360Wh / 1000 / 5.5 × 1.25 = 0.764 kWp → 764W / 450W per panel → ceil(1.69) = 2 panels
    const r = calculate(baseInput(), makeCatalog());
    expect(r.panels!.count).toBe(2);
    expect(r.panels!.totalKwp).toBeCloseTo(0.9, 1); // 2 × 450 = 900W = 0.9 kWp
  });

  it('respects the sunHours override (lower insolation → more panels)', () => {
    const bright = calculate(baseInput({ sunHours: 6.0 }), makeCatalog());
    const dim = calculate(baseInput({ sunHours: 3.0 }), makeCatalog());
    expect(dim.panels!.count).toBeGreaterThan(bright.panels!.count);
  });
});

describe('calculate — cost math', () => {
  it('applies markup on the subtotal', () => {
    const r = calculate(baseInput(), makeCatalog({ markupPercent: 20 }));
    const p = r.pricing!;
    const expectedMarkup = Math.round((p.subtotalKobo * 20) / 100);
    expect(p.markupKobo).toBe(expectedMarkup);
    expect(p.totalKobo).toBe(p.subtotalKobo + p.markupKobo);
  });

  it('uses a percentage installation fee when set', () => {
    const r = calculate(
      baseInput(),
      makeCatalog({ installationFeeKobo: 0, installationFeePercent: 10 }),
    );
    const p = r.pricing!;
    // fee is 10% of components cost
    const components = p.subtotalKobo - p.installationFeeKobo;
    expect(p.installationFeeKobo).toBe(Math.round((components * 10) / 100));
  });
});

describe('calculate — catalog degradation', () => {
  it('returns sizing-only results for an empty catalog (no throw)', () => {
    const r = calculate(baseInput(), EMPTY_CATALOG);
    expect(r.inverter).toBeNull();
    expect(r.batteries).toBeNull();
    expect(r.panels).toBeNull();
    expect(r.pricing).toBeNull();
    expect(r.catalogComplete).toBe(false);
    expect(r.totalLoadW).toBe(360);
  });

  it('selects what it can but withholds pricing when one category is missing', () => {
    const noBatteries = makeCatalog({ batteries: [] });
    const r = calculate(baseInput(), noBatteries);
    expect(r.inverter).not.toBeNull();
    expect(r.panels).not.toBeNull();
    expect(r.batteries).toBeNull();
    expect(r.pricing).toBeNull();
    expect(r.catalogComplete).toBe(false);
  });

  it('suppresses savings when there is no pricing, even with spend data', () => {
    const r = calculate(
      baseInput({ monthlyElectricityBillKobo: 50_000_00 }),
      EMPTY_CATALOG,
    );
    expect(r.monthlySavingsKobo).toBeNull();
    expect(r.paybackMonths).toBeNull();
  });

  it('still reports CO2 savings without a catalog (engine-independent)', () => {
    const r = calculate(
      baseInput({ generatorCapacityKva: 5, generatorHoursPerDay: 4 }),
      EMPTY_CATALOG,
    );
    expect(r.co2SavedKgPerMonth).not.toBeNull();
  });
});

describe('calculate — solar generators', () => {
  // Base load: 360W → 450W required. Lithium storage req: 2160/(0.85×0.8) ≈ 3.18kWh.
  const smallGen = {
    id: 'gen-1', brand: 'G', model: 'SG 1kVA/4kWh', capacity: 1, unit: 'KVA' as const,
    storageKwh: 4, priceKobo: 900_000_00,
  };
  const bigGen = {
    id: 'gen-2', brand: 'G', model: 'SG 5kVA/10kWh', capacity: 5, unit: 'KVA' as const,
    storageKwh: 10, priceKobo: 3_000_000_00,
  };

  it('recommends a generator when it beats the inverter+battery price', () => {
    // Component path: 2kVA inverter 300k + 1× Li battery 1M = 1.3M > 900k gen.
    const r = calculate(baseInput(), makeCatalog({ generators: [smallGen] }));
    expect(r.generator?.model).toBe('SG 1kVA/4kWh');
    expect(r.inverter).toBeNull();
    expect(r.batteries).toBeNull();
    expect(r.pricing).not.toBeNull();
    expect(r.catalogComplete).toBe(true);
  });

  it('keeps the component path when the generator costs more', () => {
    const dearGen = { ...smallGen, priceKobo: 5_000_000_00 };
    const r = calculate(baseInput(), makeCatalog({ generators: [dearGen] }));
    expect(r.generator).toBeNull();
    expect(r.inverter).not.toBeNull();
    expect(r.batteries).not.toBeNull();
  });

  it('picks the cheapest generator that fits both load and storage', () => {
    const r = calculate(
      baseInput(),
      makeCatalog({ generators: [bigGen, smallGen] }),
    );
    expect(r.generator?.id).toBe('gen-1');
  });

  it('skips generators that cover load but not storage', () => {
    const thinStorage = { ...smallGen, storageKwh: 1 }; // < 3.18kWh required
    const r = calculate(baseInput(), makeCatalog({ generators: [thinStorage] }));
    expect(r.generator).toBeNull();
    expect(r.inverter).not.toBeNull();
  });

  it('completes pricing with generator + panels when inverter/battery unstocked', () => {
    const genOnly = makeCatalog({
      inverters: [],
      batteries: [],
      generators: [smallGen],
    });
    const r = calculate(baseInput(), genOnly);
    expect(r.generator).not.toBeNull();
    expect(r.pricing).not.toBeNull();
    expect(r.catalogComplete).toBe(true);
  });
});

describe('calculate — voltage compatibility', () => {
  it('never pairs an inverter with a different-voltage battery bank', () => {
    // Only a 12V inverter and a 48V battery — physically incompatible.
    const catalog = makeCatalog({
      inverters: [
        { id: 'inv12', brand: 'Haisic', model: '1.5kW 12V', capacity: 1.5, unit: 'KVA', systemVoltage: 12, priceKobo: 250_000_00 },
      ],
      batteries: [
        { id: 'bat48', brand: 'Haisic', model: '15kWh 48V', capacity: 15, unit: 'KWH', systemVoltage: 48, chemistry: 'LITHIUM', priceKobo: 1_800_000_00 },
      ],
      generators: [],
    });
    const r = calculate(baseInput(), catalog);
    expect(r.inverter).toBeNull();
    expect(r.batteries).toBeNull();
    expect(r.pricing).toBeNull();
    expect(r.warnings.some((w) => w.toLowerCase().includes('voltage-compatible'))).toBe(true);
  });

  it('picks the matching-voltage pair even when a mismatched one is cheaper', () => {
    const catalog = makeCatalog({
      inverters: [
        { id: 'inv12', brand: 'Haisic', model: '1.5kW 12V', capacity: 1.5, unit: 'KVA', systemVoltage: 12, priceKobo: 250_000_00 },
        { id: 'inv48', brand: 'Haisic', model: '15kVA 48V', capacity: 15, unit: 'KVA', systemVoltage: 48, priceKobo: 1_050_000_00 },
      ],
      batteries: [
        // Only a 48V battery stocked — the cheap 12V inverter must be skipped.
        { id: 'bat48', brand: 'Haisic', model: '15kWh 48V', capacity: 15, unit: 'KWH', systemVoltage: 48, chemistry: 'LITHIUM', priceKobo: 1_800_000_00 },
      ],
      generators: [],
    });
    const r = calculate(baseInput(), catalog);
    expect(r.inverter!.id).toBe('inv48');
    expect(r.batteries!.id).toBe('bat48');
  });

  it('optimises the combined price across compatible pairs', () => {
    // 12V path: ₦250k inv + 1× ₦550k battery = ₦800k
    // 48V path: ₦1.05M inv + 1× ₦1.8M battery = ₦2.85M
    // Small load fits both → 12V path wins on combined price.
    const catalog = makeCatalog({
      inverters: [
        { id: 'inv12', brand: 'Haisic', model: '1.5kW 12V', capacity: 1.5, unit: 'KVA', systemVoltage: 12, priceKobo: 250_000_00 },
        { id: 'inv48', brand: 'Haisic', model: '15kVA 48V', capacity: 15, unit: 'KVA', systemVoltage: 48, priceKobo: 1_050_000_00 },
      ],
      batteries: [
        { id: 'bat12', brand: 'Haisic', model: '4kWh 12.8V', capacity: 4.019, unit: 'KWH', systemVoltage: 12, chemistry: 'LITHIUM', priceKobo: 550_000_00 },
        { id: 'bat48', brand: 'Haisic', model: '15kWh 48V', capacity: 15, unit: 'KWH', systemVoltage: 48, chemistry: 'LITHIUM', priceKobo: 1_800_000_00 },
      ],
      generators: [],
    });
    const r = calculate(baseInput(), catalog);
    expect(r.inverter!.id).toBe('inv12');
    expect(r.batteries!.id).toBe('bat12');
    expect(r.batteries!.count).toBe(1);
  });

  it('treats untagged items as compatible with everything (legacy catalogs)', () => {
    // makeCatalog items carry no systemVoltage — behaviour unchanged.
    const r = calculate(baseInput(), makeCatalog());
    expect(r.inverter).not.toBeNull();
    expect(r.batteries).not.toBeNull();
    expect(r.pricing).not.toBeNull();
  });
});

describe('calculate — all-in-one vs components', () => {
  // Component path here: 2kVA inverter ₦300k + 1× 3.5kWh lithium ₦1M = ₦1.3M.
  const withGenerator = (priceKobo: number) =>
    makeCatalog({
      generators: [
        { id: 'gen', brand: 'G', model: 'AIO 3.6kVA/8kWh', capacity: 3.6, unit: 'KVA', storageKwh: 8, priceKobo },
      ],
    });

  it('prefers an all-in-one when it costs less than components', () => {
    const r = calculate(baseInput(), withGenerator(1_000_000_00));
    expect(r.generator).not.toBeNull();
    expect(r.inverter).toBeNull();
    expect(r.batteries).toBeNull();
  });

  it('still prefers an all-in-one within the 15% integration premium', () => {
    // ₦1.4M vs ₦1.3M components = +7.7% → integrated simplicity wins.
    const r = calculate(baseInput(), withGenerator(1_400_000_00));
    expect(r.generator).not.toBeNull();
    expect(r.inverter).toBeNull();
  });

  it('falls back to components when the all-in-one premium is too high', () => {
    // ₦1.6M vs ₦1.3M components = +23% → too expensive to justify.
    const r = calculate(baseInput(), withGenerator(1_600_000_00));
    expect(r.generator).toBeNull();
    expect(r.inverter).not.toBeNull();
    expect(r.batteries).not.toBeNull();
  });

  it('excludes an all-in-one whose built-in battery is too small', () => {
    const tooSmall = makeCatalog({
      generators: [
        { id: 'gen', brand: 'G', model: 'AIO 1.5kVA/1kWh', capacity: 1.5, unit: 'KVA', storageKwh: 1, priceKobo: 500_000_00 },
      ],
    });
    const r = calculate(baseInput(), tooSmall);
    expect(r.generator).toBeNull();
    expect(r.inverter).not.toBeNull();
  });
});

describe('calculate — backup runtime estimate', () => {
  it('reports hours at full load from usable battery energy', () => {
    // Selected bank: 1× 3.5kWh lithium → usable = 3500 × 0.8 × 0.95 = 2660Wh
    // At 360W full load → 7.4 hours.
    const r = calculate(baseInput(), makeCatalog());
    expect(r.estimatedBackupHoursFullLoad).toBe(7.4);
  });

  it('uses generator storage when a generator is selected', () => {
    const catalog = makeCatalog({
      inverters: [],
      batteries: [],
      generators: [
        { id: 'gen', brand: 'G', model: '3.6kVA/3.8kWh', capacity: 3.6, unit: 'KVA', storageKwh: 3.8, priceKobo: 1_650_000_00 },
      ],
    });
    const r = calculate(baseInput(), catalog);
    expect(r.generator).not.toBeNull();
    // 3800 × 0.8 × 0.95 = 2888Wh ÷ 360W = 8.0h
    expect(r.estimatedBackupHoursFullLoad).toBe(8);
  });

  it('is null when no storage was selected', () => {
    const r = calculate(baseInput(), EMPTY_CATALOG);
    expect(r.estimatedBackupHoursFullLoad).toBeNull();
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
    const amortised = r.pricing!.totalKobo / 60;
    expect(r.monthlySavingsKobo).toBe(Math.round(currentSpend - amortised));
    expect(r.paybackMonths).toBe(Math.round(r.pricing!.totalKobo / currentSpend));
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
