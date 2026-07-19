'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Package, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { formatKobo } from '@inverta/shared';
import { cn } from '@/lib/utils';
import {
  deleteCatalogItemAction,
  loadStarterCatalogAction,
  saveCatalogItemAction,
  type CatalogFormState,
} from './actions';

export interface CatalogItemDto {
  id: string;
  type: 'INVERTER' | 'BATTERY' | 'PANEL' | 'GENERATOR' | 'ACCESSORY';
  brand: string;
  model: string;
  capacity: number;
  unit: 'KVA' | 'KWH' | 'AH' | 'W' | 'UNIT';
  voltage: number | null;
  systemVoltage: number | null;
  storageKwh: number | null;
  chemistry: 'LITHIUM' | 'AGM' | 'GEL' | null;
  priceKobo: number;
  notes: string | null;
}

type ItemType = CatalogItemDto['type'];

const TYPE_LABELS: Record<ItemType, { singular: string; plural: string }> = {
  INVERTER: { singular: 'Inverter', plural: 'Inverters' },
  BATTERY: { singular: 'Battery', plural: 'Batteries' },
  PANEL: { singular: 'Solar panel', plural: 'Solar panels' },
  GENERATOR: { singular: 'Solar generator', plural: 'Solar generators' },
  ACCESSORY: { singular: 'Accessory', plural: 'Accessories' },
};

const TYPE_ORDER: ItemType[] = ['INVERTER', 'BATTERY', 'PANEL', 'GENERATOR', 'ACCESSORY'];

const DEFAULT_UNIT: Record<ItemType, CatalogItemDto['unit']> = {
  INVERTER: 'KVA',
  BATTERY: 'KWH',
  PANEL: 'W',
  GENERATOR: 'KVA',
  ACCESSORY: 'UNIT',
};

function capacityLabel(type: ItemType, unit: string): string {
  if (type === 'INVERTER') return 'Capacity (kVA)';
  if (type === 'PANEL') return 'Wattage (W)';
  if (type === 'BATTERY') return unit === 'AH' ? 'Capacity (Ah)' : 'Capacity (kWh)';
  if (type === 'GENERATOR') return 'Output (kVA)';
  return 'Capacity';
}

function describeCapacity(item: CatalogItemDto): string {
  if (item.type === 'GENERATOR') {
    return `${item.capacity} kVA output · ${item.storageKwh ?? '?'} kWh battery`;
  }
  const sysV = item.systemVoltage ? ` · ${item.systemVoltage}V system` : '';
  switch (item.unit) {
    case 'KVA': return `${item.capacity} kVA${sysV}`;
    case 'KWH': return `${item.capacity} kWh${sysV}`;
    case 'AH': return `${item.capacity} Ah${item.voltage ? ` · ${item.voltage}V` : ''}${sysV}`;
    case 'W': return `${item.capacity} W`;
    default: return '';
  }
}

export function CatalogManager({ items }: { items: CatalogItemDto[] }) {
  const [showAddForm, setShowAddForm] = useState(false);

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    items: items.filter((i) => i.type === type),
  }));

  // "Complete" = panels + a power/storage path: inverter + battery, OR an
  // all-in-one solar generator.
  const has = (t: ItemType) => items.some((i) => i.type === t);
  const catalogComplete =
    has('PANEL') && ((has('INVERTER') && has('BATTERY')) || has('GENERATOR'));

  return (
    <div className="space-y-6">
      {items.length === 0 ? (
        <EmptyState onAddManually={() => setShowAddForm(true)} />
      ) : (
        !catalogComplete && (
          <div className="rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm">
            Customers currently see sizing without prices. To unlock full quotes,
            stock a solar panel plus either an inverter and battery — or an
            all-in-one solar generator.
          </div>
        )
      )}

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
          <h2 className="mb-4 font-semibold">New product</h2>
          <ItemForm onSaved={() => setShowAddForm(false)} />
        </div>
      )}

      {grouped.map(
        ({ type, items: group }) =>
          group.length > 0 && (
            <section key={type} className="rounded-xl border bg-card/80 backdrop-blur">
              <div className="flex items-center gap-2 border-b px-5 py-3">
                <Package className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">{TYPE_LABELS[type].plural}</h2>
                <span className="text-xs text-muted-foreground">({group.length})</span>
              </div>
              <div className="divide-y">
                {group.map((item) => (
                  <ItemRow key={item.id} item={item} />
                ))}
              </div>
            </section>
          ),
      )}
    </div>
  );
}

function EmptyState({ onAddManually }: { onAddManually: () => void }) {
  const [rawState, formAction] = useFormState(loadStarterCatalogAction, {} as CatalogFormState);
  const state = rawState ?? ({} as CatalogFormState);

  return (
    <div className="rounded-xl border border-dashed bg-card/40 p-8 text-center">
      <Package className="mx-auto h-10 w-10 text-muted-foreground" />
      <h2 className="mt-4 text-lg font-semibold">Your catalog is empty</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Until you add products, your calculator shows customers their system sizing
        without prices. Start with our template at market-typical prices (edit them
        anytime), or add your own products one by one.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <form action={formAction}>
          <StarterButton />
        </form>
        <button
          type="button"
          onClick={onAddManually}
          className="inline-flex h-11 items-center rounded-md border bg-background/40 px-5 text-sm font-medium backdrop-blur transition-colors hover:bg-secondary"
        >
          Add products manually
        </button>
      </div>
      {state.error && (
        <p className="mt-3 text-sm text-destructive">{state.error}</p>
      )}
    </div>
  );
}

function StarterButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="signup-gradient-hover glass-button inline-flex h-11 items-center gap-2 rounded-md px-5 text-sm font-medium text-foreground transition-all duration-200 disabled:opacity-60"
    >
      <Sparkles className="h-4 w-4" />
      {pending ? 'Loading starter catalog…' : 'Load starter catalog'}
    </button>
  );
}

function ItemRow({ item }: { item: CatalogItemDto }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Edit {item.brand} {item.model}
          </h3>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
        <ItemForm item={item} onSaved={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-3">
      <div className="min-w-[180px] flex-1">
        <div className="text-sm font-medium">
          {item.brand} {item.model}
        </div>
        <div className="text-xs text-muted-foreground">
          {describeCapacity(item)}
          {item.chemistry ? ` · ${item.chemistry.toLowerCase()}` : ''}
          {item.notes ? ` · ${item.notes}` : ''}
        </div>
      </div>
      <div className="font-mono text-sm">{formatKobo(item.priceKobo)}</div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Edit ${item.model}`}
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <form
          action={deleteCatalogItemAction}
          onSubmit={(e) => {
            if (!window.confirm(`Delete ${item.brand} ${item.model}?`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={item.id} />
          <button
            type="submit"
            aria-label={`Delete ${item.model}`}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

function ItemForm({
  item,
  onSaved,
}: {
  item?: CatalogItemDto;
  onSaved?: () => void;
}) {
  const [rawState, formAction] = useFormState(saveCatalogItemAction, {} as CatalogFormState);
  const state = rawState ?? ({} as CatalogFormState);
  const [type, setType] = useState<ItemType>(item?.type ?? 'INVERTER');
  const [unit, setUnit] = useState<CatalogItemDto['unit']>(
    item?.unit ?? DEFAULT_UNIT[item?.type ?? 'INVERTER'],
  );

  // Close the form after a successful save; the server revalidation
  // refreshes the list underneath us.
  useEffect(() => {
    if (state.success) onSaved?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function onTypeChange(next: ItemType) {
    setType(next);
    setUnit(DEFAULT_UNIT[next]);
  }

  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="unit" value={unit} />
      {type === 'ACCESSORY' && <input type="hidden" name="capacity" value="1" />}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Product type</span>
          <select
            name="type"
            value={type}
            onChange={(e) => onTypeChange(e.target.value as ItemType)}
            className="input"
          >
            {TYPE_ORDER.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t].singular}
              </option>
            ))}
          </select>
        </label>

        <FormField
          label="Brand"
          name="brand"
          defaultValue={item?.brand}
          placeholder="e.g. Luminous"
          error={err.brand}
        />
        <FormField
          label="Model"
          name="model"
          defaultValue={item?.model}
          placeholder={type === 'ACCESSORY' ? 'e.g. Mounting kit (per panel)' : 'e.g. Cruze+ 3.5kVA'}
          error={err.model}
        />

        {type !== 'ACCESSORY' && (
          <FormField
            label={capacityLabel(type, unit)}
            name="capacity"
            type="number"
            inputMode="decimal"
            step="0.01"
            defaultValue={item ? String(item.capacity) : undefined}
            error={err.capacity}
          />
        )}

        {(type === 'INVERTER' || type === 'BATTERY') && (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">System voltage</span>
            <select
              name="systemVoltage"
              defaultValue={item?.systemVoltage ? String(item.systemVoltage) : ''}
              className="input"
            >
              <option value="">Any / not set</option>
              <option value="12">12V</option>
              <option value="24">24V</option>
              <option value="48">48V</option>
            </select>
            <span className="text-xs text-muted-foreground">
              Inverters only pair with same-voltage batteries in quotes.
            </span>
          </label>
        )}

        {type === 'GENERATOR' && (
          <FormField
            label="Built-in battery (kWh)"
            name="storageKwh"
            type="number"
            inputMode="decimal"
            step="0.1"
            defaultValue={item?.storageKwh ? String(item.storageKwh) : undefined}
            error={err.storageKwh}
          />
        )}

        {type === 'BATTERY' && (
          <>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Rated in</span>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as CatalogItemDto['unit'])}
                className="input"
              >
                <option value="KWH">kWh (energy)</option>
                <option value="AH">Ah (amp-hours)</option>
              </select>
            </label>
            {unit === 'AH' && (
              <FormField
                label="Voltage (V)"
                name="voltage"
                type="number"
                defaultValue={item?.voltage ? String(item.voltage) : undefined}
                error={err.voltage}
              />
            )}
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Chemistry</span>
              <select
                name="chemistry"
                defaultValue={item?.chemistry ?? 'LITHIUM'}
                className={cn('input', err.chemistry && 'border-destructive')}
              >
                <option value="LITHIUM">Lithium</option>
                <option value="AGM">AGM</option>
                <option value="GEL">Gel</option>
              </select>
              {err.chemistry && (
                <span className="text-xs text-destructive">{err.chemistry}</span>
              )}
            </label>
          </>
        )}

        <FormField
          label="Price (₦)"
          name="priceNaira"
          type="number"
          inputMode="numeric"
          step="0.01"
          defaultValue={item ? String(item.priceKobo / 100) : undefined}
          error={err.priceNaira}
        />
        <FormField
          label="Notes (optional)"
          name="notes"
          defaultValue={item?.notes ?? undefined}
          error={err.notes}
        />
      </div>

      {state.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <SaveButton isEdit={!!item} />
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
      {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Add to catalog'}
    </button>
  );
}

function FormField({
  label,
  name,
  type = 'text',
  inputMode,
  step,
  defaultValue,
  placeholder,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  inputMode?: 'decimal' | 'numeric';
  step?: string;
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
        inputMode={inputMode}
        step={step}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={cn('input', error && 'border-destructive')}
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}
