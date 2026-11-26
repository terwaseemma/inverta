'use client';

import { useState } from 'react';
import {
  ACCESSORY_RULE_LABELS,
  ACCESSORY_RULES,
  ROOF_TYPE_LABELS,
  ROOF_TYPES,
  type AccessoryRule,
  type RoofType,
} from '@inverta/shared';

// How an accessory's quantity follows the system the calculator sized: per
// panel, per battery, per yard of cable run (from the customer's building), or
// a fixed number; for which system sizes and roofs; and whether the quote lists
// it on its own line or inside "Installation materials".

export type AccessoryRuleValues = {
  qtyRule?: AccessoryRule;
  qtyPer?: number;
  minKva?: number | null;
  maxKva?: number | null;
  roofTypes?: RoofType[];
  itemized?: boolean;
};

const PER_LABEL: Record<AccessoryRule, string> = {
  PER_INSTALL: 'Quantity per installation',
  PER_PANEL: 'Quantity per panel',
  PER_BATTERY: 'Quantity per battery',
  PER_CABLE_YARD: 'Quantity per yard of cable',
};

const PER_HINT: Record<AccessoryRule, string> = {
  PER_INSTALL: 'e.g. 1 breaker, or 10 for 10 yards of AC cable',
  PER_PANEL: 'e.g. 1, or 0.5 for one set per two panels',
  PER_BATTERY: 'e.g. 1 cable set per battery',
  PER_CABLE_YARD: 'Usually 1. Cable yards per building are in Settings.',
};

export function AccessoryRuleFields({
  item,
  errors = {},
}: {
  item?: AccessoryRuleValues | null;
  errors?: Record<string, string | undefined>;
}) {
  const [rule, setRule] = useState<AccessoryRule>(item?.qtyRule ?? 'PER_INSTALL');
  const roofs = new Set(item?.roofTypes ?? []);

  return (
    <fieldset className="col-span-full grid gap-4 rounded-2xl border p-4 sm:grid-cols-2">
      <legend className="px-1 text-sm font-medium">How many go into each quote</legend>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Quantity follows</span>
        <select
          name="qtyRule"
          value={rule}
          onChange={(e) => setRule(e.target.value as AccessoryRule)}
          className="input"
        >
          {ACCESSORY_RULES.map((r) => (
            <option key={r} value={r}>
              {ACCESSORY_RULE_LABELS[r]}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{PER_LABEL[rule]}</span>
        <input
          name="qtyPer"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          defaultValue={String(item?.qtyPer ?? 1)}
          className="input"
        />
        <span className="text-[13px] text-muted-foreground">{errors.qtyPer ?? PER_HINT[rule]}</span>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Only from (kVA)</span>
        <input
          name="minKva"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          defaultValue={item?.minKva != null ? String(item.minKva) : ''}
          placeholder="Any size"
          className="input"
        />
        <span className="text-[13px] text-muted-foreground">{errors.minKva ?? 'e.g. 6.6 for 10mm cable'}</span>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Only up to (kVA)</span>
        <input
          name="maxKva"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          defaultValue={item?.maxKva != null ? String(item.maxKva) : ''}
          placeholder="Any size"
          className="input"
        />
        <span className={errors.maxKva ? 'text-[13px] text-destructive' : 'text-[13px] text-muted-foreground'}>
          {errors.maxKva ?? 'e.g. 6.5 for 6mm cable'}
        </span>
      </label>

      <div className="col-span-full space-y-2">
        <span className="text-sm font-medium">Roofs it&apos;s used on</span>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {ROOF_TYPES.map((r) => (
            <label key={r} className="inline-flex items-center gap-2 text-[15px]">
              <input type="checkbox" name="roofTypes" value={r} defaultChecked={roofs.has(r)} className="h-4 w-4" />
              {ROOF_TYPE_LABELS[r]}
            </label>
          ))}
        </div>
        <p className="text-[13px] text-muted-foreground">Leave all unticked for every roof. Tick them for mounting.</p>
      </div>

      <label className="col-span-full inline-flex items-start gap-2 text-[15px]">
        <input type="checkbox" name="itemized" defaultChecked={item?.itemized ?? true} className="mt-1 h-4 w-4" />
        <span>
          Show as its own line on quotes
          <span className="block text-[13px] text-muted-foreground">
            Unticked, it goes into one &quot;Installation materials&quot; line with the others.
          </span>
        </span>
      </label>
    </fieldset>
  );
}
