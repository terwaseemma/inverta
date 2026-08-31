import { applyMargin } from './money';
import { WHOLESALE_NOTE, stripWholesaleNote } from './catalog-template';
import { importMarginSchema } from './schemas';

describe('applyMargin', () => {
  it('adds a percentage to the trade price', () => {
    // 520,000 trade + 20% = 624,000
    expect(applyMargin(520_000_00, { marginMode: 'percent', marginPercent: 20 })).toBe(
      624_000_00,
    );
  });

  it('adds a flat naira amount', () => {
    expect(applyMargin(520_000_00, { marginMode: 'amount', marginNaira: 80_000 })).toBe(
      600_000_00,
    );
  });

  it('leaves the price untouched at zero margin', () => {
    expect(applyMargin(520_000_00, { marginMode: 'percent', marginPercent: 0 })).toBe(
      520_000_00,
    );
    expect(applyMargin(520_000_00, { marginMode: 'amount', marginNaira: 0 })).toBe(
      520_000_00,
    );
  });

  it('returns whole kobo when a percentage does not divide evenly', () => {
    // 1,030,000 x 1.175 = 1,210,250 exactly; check we never emit a fraction.
    const out = applyMargin(1_030_000_00, { marginMode: 'percent', marginPercent: 17.5 });
    expect(Number.isInteger(out)).toBe(true);
    expect(out).toBe(1_210_250_00);
  });

  it('treats a missing value as no margin rather than NaN', () => {
    expect(applyMargin(100_000_00, { marginMode: 'percent' })).toBe(100_000_00);
    expect(applyMargin(100_000_00, { marginMode: 'amount' })).toBe(100_000_00);
  });
});

describe('stripWholesaleNote', () => {
  it('removes the wholesale marker entirely', () => {
    expect(stripWholesaleNote(WHOLESALE_NOTE)).toBeNull();
  });

  it('keeps a genuine note that sits alongside it', () => {
    expect(stripWholesaleNote(`${WHOLESALE_NOTE} Ships in pairs.`)).toBe('Ships in pairs.');
  });

  it('passes through an unrelated note untouched', () => {
    expect(stripWholesaleNote('Requires 2 units for 48V.')).toBe('Requires 2 units for 48V.');
  });

  it('handles null and empty', () => {
    expect(stripWholesaleNote(null)).toBeNull();
    expect(stripWholesaleNote('')).toBeNull();
  });
});

describe('importMarginSchema', () => {
  it('accepts a zero margin — selling at cost is a valid choice', () => {
    expect(
      importMarginSchema.safeParse({ marginMode: 'percent', marginPercent: 0 }).success,
    ).toBe(true);
  });

  it('rejects a negative margin', () => {
    expect(
      importMarginSchema.safeParse({ marginMode: 'percent', marginPercent: -5 }).success,
    ).toBe(false);
  });

  it('requires the value that matches the chosen mode', () => {
    // Percent mode with only an amount supplied must not silently import at cost.
    expect(
      importMarginSchema.safeParse({ marginMode: 'percent', marginNaira: 5000 }).success,
    ).toBe(false);
    expect(
      importMarginSchema.safeParse({ marginMode: 'amount', marginPercent: 20 }).success,
    ).toBe(false);
  });
});
