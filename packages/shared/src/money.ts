// All monetary values flow through the system as integer kobo.
// 100 kobo = 1 NGN. Do all math in kobo; format only at the display edge.

export const KOBO_PER_NAIRA = 100;

export function nairaToKobo(naira: number): number {
  return Math.round(naira * KOBO_PER_NAIRA);
}

export function koboToNaira(kobo: number): number {
  return kobo / KOBO_PER_NAIRA;
}

/**
 * An installer's margin over a platform trade price. Structurally what
 * `schemas.importMarginSchema` parses to — kept here, free of zod, so the
 * catalog UI can preview a price without pulling the validator into the
 * browser bundle. Both sides call this one function, so the preview can never
 * disagree with the price that gets saved.
 */
export interface ImportMargin {
  marginMode: 'percent' | 'amount';
  marginPercent?: number;
  marginNaira?: number;
}

export function applyMargin(priceKobo: number, margin: ImportMargin): number {
  if (margin.marginMode === 'percent') {
    return Math.round(priceKobo * (1 + (margin.marginPercent ?? 0) / 100));
  }
  return priceKobo + nairaToKobo(margin.marginNaira ?? 0);
}

export interface FormatMoneyOptions {
  /** Omit the ₦ symbol */
  noSymbol?: boolean;
  /** Force decimal places (defaults to 0 for whole naira, 2 otherwise) */
  decimals?: number;
}

export function formatKobo(kobo: number, opts: FormatMoneyOptions = {}): string {
  const naira = koboToNaira(kobo);
  const decimals = opts.decimals ?? (Number.isInteger(naira) ? 0 : 2);
  const formatted = naira.toLocaleString('en-NG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return opts.noSymbol ? formatted : `₦${formatted}`;
}
