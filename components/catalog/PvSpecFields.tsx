// Solar (PV) input limits from an inverter's or all-in-one's spec label. The
// sizing engine caps the panel array at maxPvW, so a quote never includes
// panels the unit's charger can't use. All optional: blank means unknown.

type PvSpecs = {
  maxPvW?: number | null;
  maxPvVoc?: number | null;
  mpptCount?: number | null;
  maxPvCurrentA?: number | null;
};

const fields = [
  { name: 'maxPvW', label: 'Max solar input (W)', step: '1', hint: 'Total PV power, e.g. 6500 or 11000 (5500 × 2)' },
  { name: 'maxPvVoc', label: 'Max solar voltage (Voc)', step: '1', hint: 'e.g. 500' },
  { name: 'mpptCount', label: 'MPPT trackers', step: '1', hint: 'Usually 1 or 2' },
  { name: 'maxPvCurrentA', label: 'Max solar current per MPPT (A)', step: '0.1', hint: 'e.g. 18 or 27' },
] as const;

export function PvSpecFields({
  item,
  errors = {},
}: {
  item?: PvSpecs | null;
  errors?: Record<string, string | undefined>;
}) {
  return (
    <fieldset className="col-span-full grid gap-4 rounded-2xl border p-4 sm:grid-cols-2">
      <legend className="px-1 text-sm font-medium">Solar input, from the spec label (optional)</legend>
      {fields.map((f) => {
        const value = item?.[f.name];
        return (
          <label key={f.name} className="block space-y-1.5">
            <span className="text-sm font-medium">{f.label}</span>
            <input
              name={f.name}
              type="number"
              inputMode="decimal"
              min="0"
              step={f.step}
              defaultValue={value != null ? String(value) : ''}
              className="input"
            />
            <span className="text-[13px] text-muted-foreground">{errors[f.name] ?? f.hint}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

/** "6.5 kW PV · 500 V · 1 MPPT" for a catalog row, or '' when nothing is known. */
export function describePv(item: PvSpecs): string {
  const parts: string[] = [];
  if (item.maxPvW) parts.push(`${Math.round(item.maxPvW / 100) / 10} kW PV max`);
  if (item.maxPvVoc) parts.push(`${item.maxPvVoc} V`);
  if (item.mpptCount) parts.push(`${item.mpptCount} MPPT`);
  return parts.join(' · ');
}
