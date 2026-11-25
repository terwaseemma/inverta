'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Download } from 'lucide-react';
import { applyMargin, formatKobo } from '@inverta/shared';
import { ProductThumb } from '@/components/uploads/ProductImageField';
import { importMasterItemAction, type CatalogFormState } from './actions';

export interface ImportableItemDto {
  id: string;
  type: string;
  brand: string;
  model: string;
  priceKobo: number;
  /** Product note with the wholesale marker already removed; null if that was all it said. */
  note: string | null;
  imageUrl: string | null;
}

const initial: CatalogFormState = {};

function ImportButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-secondary btn-sm"
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
    <form action={formAction} className="flex flex-wrap items-end gap-3 px-6 py-5">
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="marginMode" value={mode} />
      <input
        type="hidden"
        name={mode === 'percent' ? 'marginPercent' : 'marginNaira'}
        value={marginValid ? String(parsedValue) : ''}
      />

      <ProductThumb url={item.imageUrl} alt={`${item.brand} ${item.model}`} />
      <div className="min-w-[170px] flex-1">
        <div className="text-[15px] font-medium">
          {item.brand} {item.model}
        </div>
        <div className="text-[13px] text-muted-foreground">
          {item.type.charAt(0) + item.type.slice(1).toLowerCase()} · trade{' '}
          <span className="figure">{formatKobo(item.priceKobo)}</span>
          {item.note ? ` · ${item.note}` : ''}
        </div>
      </div>

      <label className="space-y-1.5">
        <span className="block text-[13px] font-medium text-muted-foreground">
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
        <span className="block text-[13px] font-medium text-muted-foreground">
          You sell at
        </span>
        <div className="figure text-sm leading-9">
          {yourPrice == null ? '—' : formatKobo(yourPrice)}
        </div>
      </div>

      <ImportButton />

      {(fieldError || state.error) && (
        <p className="w-full text-[13px] text-destructive">{fieldError ?? state.error}</p>
      )}
    </form>
  );
}

export function PlatformCatalog({ items }: { items: ImportableItemDto[] }) {
  if (items.length === 0) return null;

  return (
    <section className="card mt-4">
      <div className="border-b px-6 py-5">
        <h2 className="section-title">Add from the platform catalog</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Prices here are wholesale. Set your margin on each before adding — the price
          you save is exactly what customers are quoted.
        </p>
      </div>
      <div className="divide-y">
        {items.map((item) => (
          <ImportRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
