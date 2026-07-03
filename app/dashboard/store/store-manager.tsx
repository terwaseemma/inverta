'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Pencil, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { formatKobo } from '@inverta/shared';
import { cn } from '@/lib/utils';
import {
  deleteProductAction,
  saveProductAction,
  type ProductFormState,
} from './actions';

export interface ProductDto {
  id: string;
  type: 'GENERATOR' | 'KIT' | 'PART';
  name: string;
  description: string | null;
  priceKobo: number;
  imageUrl: string | null;
  isAvailable: boolean;
}

const TYPE_LABELS: Record<ProductDto['type'], string> = {
  GENERATOR: 'Solar generator',
  KIT: 'Package / kit',
  PART: 'Component',
};

export function StoreManager({ products }: { products: ProductDto[] }) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="signup-gradient-hover glass-button inline-flex h-10 items-center gap-1.5 rounded-md px-4 text-sm font-medium text-foreground transition-all duration-200"
        >
          {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAddForm ? 'Close' : 'Add product'}
        </button>
      </div>

      {showAddForm && (
        <div className="rounded-xl border bg-card/80 p-5 backdrop-blur">
          <h2 className="mb-4 font-semibold">New listing</h2>
          <ProductForm onSaved={() => setShowAddForm(false)} />
        </div>
      )}

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">No listings yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            List solar generators, kits, or components — customers browse them on
            your public storefront.
          </p>
        </div>
      ) : (
        <div className="divide-y rounded-xl border bg-card/80 backdrop-blur">
          {products.map((p) => (
            <ProductRow key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductRow({ product }: { product: ProductDto }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Edit {product.name}</h3>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
        <ProductForm product={product} onSaved={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-3">
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt=""
          className="h-10 w-10 rounded-md border object-cover"
        />
      ) : (
        <div className="grid h-10 w-10 place-items-center rounded-md border bg-secondary/40">
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-[160px] flex-1">
        <div className="text-sm font-medium">
          {product.name}
          {!product.isAvailable && (
            <span className="ml-2 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
              Unavailable
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {TYPE_LABELS[product.type]}
          {product.description ? ` · ${product.description.slice(0, 60)}` : ''}
        </div>
      </div>
      <div className="font-mono text-sm">{formatKobo(product.priceKobo)}</div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Edit ${product.name}`}
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <form
          action={deleteProductAction}
          onSubmit={(e) => {
            if (!window.confirm(`Delete ${product.name}?`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={product.id} />
          <button
            type="submit"
            aria-label={`Delete ${product.name}`}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

function ProductForm({
  product,
  onSaved,
}: {
  product?: ProductDto;
  onSaved?: () => void;
}) {
  const [rawState, formAction] = useFormState(saveProductAction, {} as ProductFormState);
  const state = rawState ?? ({} as ProductFormState);
  const err = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.success) onSaved?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Type</span>
          <select name="type" defaultValue={product?.type ?? 'KIT'} className="input">
            <option value="GENERATOR">Solar generator</option>
            <option value="KIT">Package / kit</option>
            <option value="PART">Component</option>
          </select>
        </label>
        <FormField label="Name" name="name" defaultValue={product?.name} error={err.name} />
        <FormField
          label="Price (₦)"
          name="priceNaira"
          type="number"
          defaultValue={product ? String(product.priceKobo / 100) : undefined}
          error={err.priceNaira}
        />
        <FormField
          label="Image URL (optional)"
          name="imageUrl"
          placeholder="https://…"
          defaultValue={product?.imageUrl ?? undefined}
          error={err.imageUrl}
        />
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Description (optional)</span>
        <textarea
          name="description"
          defaultValue={product?.description ?? ''}
          rows={2}
          className="input min-h-[64px] py-2"
        />
        {err.description && (
          <span className="text-xs text-destructive">{err.description}</span>
        )}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isAvailable"
          defaultChecked={product?.isAvailable ?? true}
        />
        Available for sale
      </label>

      {state.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <SaveButton isEdit={!!product} />
    </form>
  );
}

function SaveButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="signup-gradient-hover glass-button inline-flex h-10 items-center rounded-md px-5 text-sm font-medium text-foreground transition-all duration-200 disabled:opacity-60"
    >
      {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Add listing'}
    </button>
  );
}

function FormField({
  label,
  name,
  type = 'text',
  defaultValue,
  placeholder,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={cn('input', error && 'border-destructive')}
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}
