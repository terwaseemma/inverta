'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Download, PackageSearch } from 'lucide-react';
import { applyMargin, formatKobo } from '@inverta/shared';
import { importMasterItemAction, type CatalogFormState } from './actions';

export interface ImportableItemDto {
  id: string;
  type: string;
  brand: string;
  model: string;
  priceKobo: number;
  /** Product note with the wholesale marker already removed; null if that was all it said. */
  note: string | null;
}

const initial: CatalogFormState = {};

function ImportButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-background/40 px-3 text-xs font-medium backdrop-blur transition-colors hover:bg-secondary disabled:opacity-50"
    >
      <Download className="h-3 w-3" /> {pending ? 'Adding…' : 'Add to my catalog'}
    </button>
  );
}

function ImportRow({ item }: { item: ImportableItemDto }) {
  const [rawState, formAction] = useFormState(importMasterItemAction, initial);
  const state = rawState ?? initial;
  const [mode, setMode] = useState<'percent' | 'amount'>('percent');
  const [value, setValue] = useState('20');

  const parsedValue = Number(value);
  const marginValid = value.trim() !== '' && Number.isFinite(parsedValue) && parsedValue >= 0;

  // Same helper the server uses, so the preview cannot drift from what is saved.
  const yourPrice = marginValid
    ? applyMargin(item.priceKobo, {
        marginMode: mode,
        marginPercent: mode === 'percent' ? parsedValue : undefined,
        marginNaira: mode === 'amount' ? parsedValue : undefined,
      })
    : null;

  const err = state.fieldErrors ?? {};
  const fieldError = err.marginPercent ?? err.marginNaira;

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 px-5 py-4">
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="marginMode" value={mode} />
      <input
        type="hidden"
        name={mode === 'percent' ? 'marginPercent' : 'marginNaira'}
        value={marginValid ? String(parsedValue) : ''}
      />

      <div className="min-w-[170px] flex-1">
        <div className="text-sm font-medium">
          {item.brand} {item.model}
        </div>
        <div className="text-xs text-muted-foreground">
          {item.type.charAt(0) + item.type.slice(1).toLowerCase()} · trade{' '}
          <span className="font-mono">{formatKobo(item.priceKobo)}</span>
          {item.note ? ` · ${item.note}` : ''}
        </div>
      </div>

      <label className="space-y-1.5">
        <span className="block text-xs font-medium text-muted-foreground">
          Your margin
        </span>
        <div className="flex">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'percent' | 'amount')}
            aria-label="Margin type"
            className="input h-9 w-16 rounded-r-none border-r-0 px-2 text-sm"
          >
            <option value="percent">%</option>
            <option value="amount">₦</option>
          </select>
          <input
            type="number"
            min={0}
            step={mode === 'percent' ? 1 : 1000}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={mode === 'percent' ? 'Margin percent' : 'Margin amount in naira'}
            className="input h-9 w-28 rounded-l-none text-sm"
          />
        </div>
      </label>

      <div className="min-w-[110px] space-y-1.5">
        <span className="block text-xs font-medium text-muted-foreground">
          You sell at
        </span>
        <div className="font-mono text-sm leading-9">
          {yourPrice == null ? '—' : formatKobo(yourPrice)}
        </div>
      </div>

      <ImportButton />

      {(fieldError || state.error) && (
        <p className="w-full text-xs text-destructive">{fieldError ?? state.error}</p>
      )}
    </form>
  );
}

export function PlatformCatalog({ items }: { items: ImportableItemDto[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-8 rounded-xl border bg-card/80 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3">
        <PackageSearch className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Platform catalog</h2>
        <span className="text-xs text-muted-foreground">
          prices shown are wholesale — set your margin before adding, since the
          price you save is what customers are quoted
        </span>
      </div>
      <div className="divide-y">
        {items.map((item) => (
          <ImportRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
