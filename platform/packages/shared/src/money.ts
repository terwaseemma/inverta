// All monetary values flow through the system as integer kobo.
// 100 kobo = 1 NGN. Do all math in kobo; format only at the display edge.

export const KOBO_PER_NAIRA = 100;

export function nairaToKobo(naira: number): number {
  return Math.round(naira * KOBO_PER_NAIRA);
}

export function koboToNaira(kobo: number): number {
  return kobo / KOBO_PER_NAIRA;
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
