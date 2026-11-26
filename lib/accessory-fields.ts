import 'server-only';

import type { AccessoryRule, RoofType } from '@inverta/shared';

// The accessory rule fields (AccessoryRuleFields) shared by the installer and
// admin catalog forms: raw form values in, database columns out.

const num = (v: FormDataEntryValue | null) => {
  if (typeof v !== 'string' || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Raw values for catalogItemSchema. */
export function readAccessoryFields(formData: FormData) {
  return {
    qtyRule: (formData.get('qtyRule') || undefined) as AccessoryRule | undefined,
    qtyPer: num(formData.get('qtyPer')),
    minKva: num(formData.get('minKva')),
    maxKva: num(formData.get('maxKva')),
    roofTypes: formData.getAll('roofTypes').map(String) as RoofType[],
    itemized: formData.get('itemized') === 'on',
  };
}

/** Columns to store; anything but an accessory gets the neutral defaults. */
export function accessoryColumns(d: {
  type: string;
  qtyRule?: AccessoryRule;
  qtyPer?: number;
  minKva?: number;
  maxKva?: number;
  roofTypes?: RoofType[];
  itemized?: boolean;
}) {
  const acc = d.type === 'ACCESSORY';
  return {
    qtyRule: acc ? (d.qtyRule ?? 'PER_INSTALL') : 'PER_INSTALL',
    qtyPer: acc ? (d.qtyPer ?? 1) : 1,
    minKva: acc ? (d.minKva ?? null) : null,
    maxKva: acc ? (d.maxKva ?? null) : null,
    roofTypes: acc ? (d.roofTypes ?? []) : [],
    itemized: acc ? (d.itemized ?? true) : true,
  } as const;
}

/** Copy the rule from one catalog row to another (platform → installer). */
export function copyAccessoryRule(item: {
  qtyRule: AccessoryRule;
  qtyPer: number;
  minKva: number | null;
  maxKva: number | null;
  roofTypes: RoofType[];
  itemized: boolean;
}) {
  return {
    qtyRule: item.qtyRule,
    qtyPer: item.qtyPer,
    minKva: item.minKva,
    maxKva: item.maxKva,
    roofTypes: item.roofTypes,
    itemized: item.itemized,
  };
}
