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
      <div className="flex items-center justify-between gap-4">
        <p className="text-[15px] text-muted-foreground">
          {products.length > 0 && (
            <>
              <span className="figure text-foreground">{products.length}</span>{' '}
              {products.length === 1 ? 'listing' : 'listings'} on your storefront
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          aria-expanded={showAddForm}
          className={showAddForm ? 'btn btn-secondary' : 'btn btn-primary'}
        >
          {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAddForm ? 'Close' : 'Add product'}
        </button>
      </div>

      {showAddForm && (
        <div className="card p-6">
          <h2 className="section-title mb-4">New listing</h2>
          <ProductForm onSaved={() => setShowAddForm(false)} />
        </div>
      )}

      {products.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
            <ShoppingBag className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-[17px] font-semibold">No listings yet</h2>
          <p className="mt-1.5 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
            List solar generators, kits or parts — customers browse them on your public
            storefront.
          </p>
        </div>
      ) : (
        <div className="card divide-y overflow-hidden">
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
      <div className="bg-secondary/60 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">Edit {product.name}</h3>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="btn btn-ghost btn-sm"
          >
            Cancel
          </button>
        </div>
        <ProductForm product={product} onSaved={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-6 py-4">
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt=""
          className="h-11 w-11 rounded-xl border object-cover"
        />
      ) : (
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary">
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-[160px] flex-1">
        <div className="text-[15px] font-medium">
          {product.name}
          {!product.isAvailable && (
            <span className="chip ml-2 text-muted-foreground">
              Unavailable
            </span>
          )}
        </div>
        <div className="text-[13px] text-muted-foreground">
          {TYPE_LABELS[product.type]}
          {product.description ? ` · ${product.description.slice(0, 60)}` : ''}
        </div>
      </div>
      <div className="figure text-[15px]">{formatKobo(product.priceKobo)}</div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Edit ${product.name}`}
          className="btn btn-ghost h-10 w-10 px-0"
        >
          <Pencil className="h-4 w-4" />
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
            className="btn btn-ghost h-10 w-10 px-0 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
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
          <span className="text-[13px] text-destructive">{err.description}</span>
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
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[15px] text-destructive">
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
      className="btn btn-primary"
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
      {error && <span className="text-[13px] text-destructive">{error}</span>}
    </label>
  );
}
