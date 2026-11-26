import 'server-only';

import { schemas, type PriceAdjustment } from '@inverta/shared';

// Shared by the installer catalog and the admin platform catalog: read the
// "Update prices" form, and turn its scope into a Prisma filter.

export type PriceToolState = { success?: boolean; message?: string; error?: string };

const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').replace(/,/g, '').trim();
  return s === '' ? undefined : Number(s);
};

export function readAdjustment(formData: FormData):
  | { adjustment: PriceAdjustment; scopeType: string; scopeBrand: string }
  | { error: string } {
  const parsed = schemas.bulkPriceAdjustSchema.safeParse({
    scopeType: String(formData.get('scopeType') ?? 'ALL'),
    scopeBrand: String(formData.get('scopeBrand') ?? 'ALL'),
    direction: formData.get('direction'),
    mode: formData.get('mode'),
    value: num(formData.get('value')),
    roundToNaira: num(formData.get('roundToNaira')) ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the adjustment.' };
  const { scopeType, scopeBrand, ...adjustment } = parsed.data;
  return { adjustment, scopeType, scopeBrand };
}

type ItemType = 'INVERTER' | 'BATTERY' | 'PANEL' | 'GENERATOR' | 'ACCESSORY';
const TYPES: ItemType[] = ['INVERTER', 'BATTERY', 'PANEL', 'GENERATOR', 'ACCESSORY'];

/** Prisma filter for the chosen scope ("ALL" = no filter on that field). */
export function scopeWhere(scopeType: string, scopeBrand: string) {
  return {
    ...(TYPES.includes(scopeType as ItemType) ? { type: scopeType as ItemType } : {}),
    ...(scopeBrand !== 'ALL' ? { brand: scopeBrand } : {}),
  };
}

export const MAX_PRICE_LIST_CHARS = 500_000;

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The starter-catalog margin from MarginFields, or a field error to show. */
export function readMargin(formData: FormData):
  | { margin: { marginMode: 'percent' | 'amount'; marginPercent?: number; marginNaira?: number } }
  | { error: string } {
  const parsed = schemas.importMarginSchema.safeParse({
    marginMode: formData.get('marginMode'),
    marginPercent: num(formData.get('marginPercent')),
    marginNaira: num(formData.get('marginNaira')),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Enter your margin.' };
  return { margin: parsed.data };
}
