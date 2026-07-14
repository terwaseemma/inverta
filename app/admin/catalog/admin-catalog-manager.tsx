'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Eye, EyeOff, Package, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { formatKobo } from '@inverta/shared';
import { cn } from '@/lib/utils';
import {
  deleteMasterItemAction,
  saveMasterItemAction,
  seedMasterCatalogAction,
  toggleMasterItemAction,
  type AdminCatalogFormState,
} from './actions';

export interface MasterItemDto {
  id: string;
  type: 'INVERTER' | 'BATTERY' | 'PANEL' | 'GENERATOR' | 'ACCESSORY';
  brand: string;
  model: string;
  capacity: number;
  unit: 'KVA' | 'KWH' | 'AH' | 'W' | 'UNIT';
  voltage: number | null;
  storageKwh: number | null;
  chemistry: 'LITHIUM' | 'AGM' | 'GEL' | null;
  priceKobo: number;
  notes: string | null;
  isActive: boolean;
}

type ItemType = MasterItemDto['type'];

const TYPE_LABELS: Record<ItemType, { singular: string; plural: string }> = {
  INVERTER: { singular: 'Inverter', plural: 'Inverters' },
  BATTERY: { singular: 'Battery', plural: 'Batteries' },
  PANEL: { singular: 'Solar panel', plural: 'Solar panels' },
  GENERATOR: { singular: 'Solar generator', plural: 'Solar generators' },
  ACCESSORY: { singular: 'Accessory', plural: 'Accessories' },
};

const TYPE_ORDER: ItemType[] = ['INVERTER', 'BATTERY', 'PANEL', 'GENERATOR', 'ACCESSORY'];

const DEFAULT_UNIT: Record<ItemType, MasterItemDto['unit']> = {
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

function describeCapacity(item: MasterItemDto): string {
  if (item.type === 'GENERATOR') {
    return `${item.capacity} kVA output · ${item.storageKwh ?? '?'} kWh battery`;
  }
  switch (item.unit) {
    case 'KVA': return `${item.capacity} kVA`;
    case 'KWH': return `${item.capacity} kWh`;
    case 'AH': return `${item.capacity} Ah${item.voltage ? ` · ${item.voltage}V` : ''}`;
    case 'W': return `${item.capacity} W`;
    default: return '';
  }
}

export function AdminCatalogManager({ items }: { items: MasterItemDto[] }) {
  const [showAddForm, setShowAddForm] = useState(false);

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    items: items.filter((i) => i.type === type),
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-3">
        {items.length === 0 && (
          <form action={seedMasterCatalogAction}>
            <SeedButton />
          </form>
        )}
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
          <h2 className="mb-4 font-semibold">New platform product</h2>
          <ItemForm onSaved={() => setShowAddForm(false)} />
        </div>
      )}

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">No platform products yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Installers currently fall back to the built-in starter template. Seed it
            here as a starting point, then adjust to the products you actually stock.
          </p>
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

function SeedButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center gap-2 rounded-md border bg-background/40 px-4 text-sm font-medium backdrop-blur transition-colors hover:bg-secondary disabled:opacity-60"
    >
      <Sparkles className="h-4 w-4" />
      {pending ? 'Seeding…' : 'Seed from starter template'}
    </button>
  );
}

function ItemRow({ item }: { item: MasterItemDto }) {
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
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 px-5 py-3',
        !item.isActive && 'opacity-50',
      )}
    >
      <div className="min-w-[180px] flex-1">
        <div className="text-sm font-medium">
          {item.brand} {item.model}
          {!item.isActive && (
            <span className="ml-2 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
              Hidden
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {describeCapacity(item)}
          {item.chemistry ? ` · ${item.chemistry.toLowerCase()}` : ''}
          {item.notes ? ` · ${item.notes}` : ''}
        </div>
      </div>
      <div className="font-mono text-sm">{formatKobo(item.priceKobo)}</div>
      <div className="flex items-center gap-1">
        <form action={toggleMasterItemAction}>
          <input type="hidden" name="id" value={item.id} />
          <button
            type="submit"
            aria-label={item.isActive ? 'Hide from installers' : 'Show to installers'}
            title={item.isActive ? 'Hide from installers' : 'Show to installers'}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {item.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Edit ${item.model}`}
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <form
          action={deleteMasterItemAction}
          onSubmit={(e) => {
            if (!window.confirm(`Delete ${item.brand} ${item.model} from the platform catalog?`)) {
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
  item?: MasterItemDto;
  onSaved?: () => void;
}) {
  const [rawState, formAction] = useFormState(
    saveMasterItemAction,
    {} as AdminCatalogFormState,
  );
  const state = rawState ?? ({} as AdminCatalogFormState);
  const [type, setType] = useState<ItemType>(item?.type ?? 'INVERTER');
  const [unit, setUnit] = useState<MasterItemDto['unit']>(
    item?.unit ?? DEFAULT_UNIT[item?.type ?? 'INVERTER'],
  );
  const err = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.success) onSaved?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function onTypeChange(next: ItemType) {
    setType(next);
    setUnit(DEFAULT_UNIT[next]);
  }

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

        <FormField label="Brand" name="brand" defaultValue={item?.brand} error={err.brand} />
        <FormField label="Model" name="model" defaultValue={item?.model} error={err.model} />

        {type !== 'ACCESSORY' && (
          <FormField
            label={capacityLabel(type, unit)}
            name="capacity"
            type="number"
            step="0.01"
            defaultValue={item ? String(item.capacity) : undefined}
            error={err.capacity}
          />
        )}

        {type === 'GENERATOR' && (
          <FormField
            label="Built-in battery (kWh)"
            name="storageKwh"
            type="number"
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
                onChange={(e) => setUnit(e.target.value as MasterItemDto['unit'])}
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
            </label>
          </>
        )}

        <FormField
          label="Suggested price (₦)"
          name="priceNaira"
          type="number"
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

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          value="on"
          defaultChecked={item?.isActive ?? true}
        />
        Visible to installers
      </label>

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
      {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Add to platform catalog'}
    </button>
  );
}

function FormField({
  label,
  name,
  type = 'text',
  step,
  defaultValue,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  defaultValue?: string;
  error?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        className={cn('input', error && 'border-destructive')}
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}
