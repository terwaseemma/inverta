'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Download, FileUp, X } from 'lucide-react';
import {
  formatKobo,
  matchPriceList,
  previewAdjustment,
  readPriceList,
  toPriceListCsv,
  type PriceAdjustment,
  type PriceChange,
} from '@inverta/shared';
import { cn } from '@/lib/utils';

// "Update prices": change many catalog prices at once when supplier prices
// move. Two ways: adjust by % or naira across a type / brand, or edit a CSV
// price list in Excel and upload it. Both preview exactly what will change
// (the same functions the server applies) before anything is saved.

type Item = { id: string; type: string; brand: string; model: string; priceKobo: number };
type State = { success?: boolean; message?: string; error?: string };
type Action = (prev: State, formData: FormData) => Promise<State>;

const TYPE_LABELS: Record<string, string> = {
  INVERTER: 'Inverters',
  BATTERY: 'Batteries',
  PANEL: 'Solar panels',
  GENERATOR: 'All-in-one systems',
  ACCESSORY: 'Accessories',
};

export function PriceTools({
  items,
  adjustAction,
  importAction,
  onClose,
}: {
  items: Item[];
  adjustAction: Action;
  importAction: Action;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'adjust' | 'upload'>('adjust');
  return (
    <section className="card p-5 sm:p-6" aria-labelledby="price-tools">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="price-tools" className="section-title">
            Update prices
          </h2>
          <p className="mt-1 text-[15px] text-muted-foreground">
            When supplier prices move. New quotes use the new prices; proposals already made keep theirs.
          </p>
        </div>
        <button type="button" onClick={onClose} className="btn btn-ghost h-10 w-10 shrink-0 px-0" aria-label="Close price tools">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 inline-flex rounded-xl bg-secondary p-1" role="tablist">
        {(
          [
            ['adjust', 'Adjust by % or ₦'],
            ['upload', 'Upload a price list'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'h-9 rounded-lg px-3.5 text-[14px] font-medium transition-colors',
              tab === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === 'adjust' ? <AdjustForm items={items} action={adjustAction} /> : <UploadForm items={items} action={importAction} />}
      </div>
    </section>
  );
}

// ── Adjust by % or ₦ ──────────────────────────────────────────────────────

function AdjustForm({ items, action }: { items: Item[]; action: Action }) {
  const [state, formAction] = useFormState(action, {} as State);
  const [scopeType, setScopeType] = useState('ALL');
  const [scopeBrand, setScopeBrand] = useState('ALL');
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [mode, setMode] = useState<'percent' | 'amount'>('percent');
  const [value, setValue] = useState('');
  const [roundTo, setRoundTo] = useState('1000');

  const types = useMemo(() => [...new Set(items.map((i) => i.type))], [items]);
  const brands = useMemo(
    () => [...new Set(items.filter((i) => scopeType === 'ALL' || i.type === scopeType).map((i) => i.brand))].sort(),
    [items, scopeType],
  );
  useEffect(() => {
    if (scopeBrand !== 'ALL' && !brands.includes(scopeBrand)) setScopeBrand('ALL');
  }, [brands, scopeBrand]);

  const amount = Number(value.replace(/,/g, ''));
  const changes: PriceChange[] = useMemo(() => {
    if (!(amount > 0)) return [];
    const scoped = items.filter(
      (i) => (scopeType === 'ALL' || i.type === scopeType) && (scopeBrand === 'ALL' || i.brand === scopeBrand),
    );
    const a: PriceAdjustment = { direction, mode, value: amount, roundToNaira: Number(roundTo) };
    return previewAdjustment(scoped, a);
  }, [items, scopeType, scopeBrand, direction, mode, amount, roundTo]);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Which products" name="scopeType" value={scopeType} onChange={setScopeType}>
          <option value="ALL">All products</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t] ?? t}
            </option>
          ))}
        </Select>
        <Select label="Brand" name="scopeBrand" value={scopeBrand} onChange={setScopeBrand}>
          <option value="ALL">All brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr_1fr]">
        <div className="space-y-1.5">
          <span className="block text-sm font-medium">Change</span>
          <div className="inline-flex h-11 rounded-xl bg-secondary p-1">
            {(
              [
                ['up', 'Increase'],
                ['down', 'Decrease'],
              ] as const
            ).map(([d, label]) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                aria-pressed={direction === d}
                className={cn(
                  'rounded-lg px-3.5 text-[14px] font-medium',
                  direction === d ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <input type="hidden" name="direction" value={direction} />
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">By</span>
          <div className="flex">
            <select
              name="mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as 'percent' | 'amount')}
              className="input w-[92px] rounded-r-none"
              aria-label="Adjust by percent or naira"
            >
              <option value="percent">%</option>
              <option value="amount">₦ each</option>
            </select>
            <input
              name="value"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={mode === 'percent' ? 'e.g. 8' : 'e.g. 15,000'}
              className="input -ml-px flex-1 rounded-l-none tabular-nums"
            />
          </div>
        </label>
        <Select label="Round to the nearest" name="roundToNaira" value={roundTo} onChange={setRoundTo}>
          <option value="0">No rounding</option>
          <option value="100">₦100</option>
          <option value="1000">₦1,000</option>
          <option value="5000">₦5,000</option>
        </Select>
      </div>

      <Preview changes={changes} empty={amount > 0 ? 'No prices change with these settings.' : 'Enter an amount to see the new prices.'} />

      <Footer state={state} disabled={changes.length === 0} label={`Apply to ${changes.length} ${changes.length === 1 ? 'price' : 'prices'}`} />
    </form>
  );
}

// ── Upload a CSV price list ───────────────────────────────────────────────

function UploadForm({ items, action }: { items: Item[]; action: Action }) {
  const [state, formAction] = useFormState(action, {} as State);
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const result = useMemo(() => {
    if (!csv) return null;
    const read = readPriceList(csv);
    return { ...read, ...matchPriceList(read.rows, items) };
  }, [csv, items]);

  useEffect(() => {
    if (state.success) {
      setCsv('');
      setFileName('');
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [state]);

  function download() {
    const blob = new Blob([toPriceListCsv(items)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'price-list.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setCsv(await file.text());
  }

  return (
    <form action={formAction} className="space-y-5">
      <ol className="space-y-3 text-[15px]">
        <li className="flex flex-wrap items-center gap-3">
          <Step n={1} />
          <span>Download your current prices.</span>
          <button type="button" onClick={download} className="btn btn-secondary btn-sm">
            <Download className="h-3.5 w-3.5" /> price-list.csv
          </button>
        </li>
        <li className="flex items-center gap-3">
          <Step n={2} />
          <span>Change the prices in Excel or Google Sheets, then save it as CSV.</span>
        </li>
        <li className="flex flex-wrap items-center gap-3">
          <Step n={3} />
          <span>Upload it.</span>
          <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-secondary btn-sm">
            <FileUp className="h-3.5 w-3.5" /> {fileName || 'Choose CSV file'}
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={pick} className="sr-only" />
        </li>
      </ol>
      <p className="text-[13px] text-muted-foreground">
        Rows match products by brand and model. Columns can be in any order; keep the headers brand, model and price.
      </p>

      <textarea name="csv" value={csv} readOnly hidden />

      {result && (
        <>
          <Preview changes={result.changes} empty="No prices in the file differ from your catalog." />
          {(result.unmatched.length > 0 || result.problems.length > 0) && (
            <div className="rounded-xl border border-dashed p-4 text-[13px] text-muted-foreground">
              {result.unmatched.length > 0 && (
                <p>
                  <span className="font-medium text-foreground">
                    {result.unmatched.length} {result.unmatched.length === 1 ? 'row matches' : 'rows match'} no product
                  </span>{' '}
                  and will be skipped: {result.unmatched.slice(0, 5).map((u) => [u.brand, u.model].filter(Boolean).join(' ')).join(', ')}
                  {result.unmatched.length > 5 ? ', …' : ''}
                </p>
              )}
              {result.problems.map((p) => (
                <p key={p.line}>
                  Line {p.line}: {p.message}
                </p>
              ))}
            </div>
          )}
        </>
      )}

      <Footer
        state={state}
        disabled={!result || result.changes.length === 0}
        label={result ? `Apply ${result.changes.length} ${result.changes.length === 1 ? 'change' : 'changes'}` : 'Apply changes'}
      />
    </form>
  );
}

// ── shared bits ───────────────────────────────────────────────────────────

function Preview({ changes, empty }: { changes: PriceChange[]; empty: string }) {
  if (changes.length === 0) {
    return <p className="rounded-xl bg-secondary px-4 py-3 text-[14px] text-muted-foreground">{empty}</p>;
  }
  const shown = changes.slice(0, 8);
  return (
    <div className="rounded-xl border">
      <div className="border-b px-4 py-2.5 text-[13px] font-medium text-muted-foreground">
        {changes.length} {changes.length === 1 ? 'price changes' : 'prices change'}
      </div>
      <ul className="divide-y">
        {shown.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-[14px]">
            <span className="min-w-0 truncate">
              {c.brand} {c.model}
            </span>
            <span className="tabular-nums">
              <span className="text-muted-foreground line-through">{formatKobo(c.oldKobo)}</span>{' '}
              <span className="font-semibold">{formatKobo(c.newKobo)}</span>
            </span>
          </li>
        ))}
      </ul>
      {changes.length > shown.length && (
        <div className="border-t px-4 py-2.5 text-[13px] text-muted-foreground">and {changes.length - shown.length} more</div>
      )}
    </div>
  );
}

function Footer({ state, disabled, label }: { state: State; disabled: boolean; label: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p role="status" className={cn('text-[14px]', state.error ? 'text-destructive' : 'text-success')}>
        {state.error ?? state.message ?? ''}
      </p>
      <Submit disabled={disabled} label={label} />
    </div>
  );
}

function Submit({ disabled, label }: { disabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="btn btn-primary">
      {pending ? 'Updating…' : label}
    </button>
  );
}

function Select({
  label,
  name,
  value,
  onChange,
  children,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <select name={name} value={value} onChange={(e) => onChange(e.target.value)} className="input">
        {children}
      </select>
    </label>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary text-[13px] font-semibold">{n}</span>
  );
}
