'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Eye, EyeOff, Package, Pencil, Plus, Sparkles, Tags, Trash2, X } from 'lucide-react';
import { PriceTools } from '@/components/catalog/PriceTools';
import { formatKobo } from '@inverta/shared';
import { cn } from '@/lib/utils';
import { describePv, PvSpecFields } from '@/components/catalog/PvSpecFields';
import { AccessoryRuleFields } from '@/components/catalog/AccessoryRuleFields';
import { describeAccessoryRule, type AccessoryRule, type RoofType } from '@inverta/shared';
import { ProductImageField, ProductThumb } from '@/components/uploads/ProductImageField';
import {
  bulkAdjustMasterPricesAction,
  deleteMasterItemAction,
  importMasterPriceListAction,
  saveMasterItemAction,
  seedMasterCatalogAction,
  addStarterAccessoriesAction,
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
  systemVoltage: number | null;
  maxPvW: number | null;
  maxPvVoc: number | null;
  mpptCount: number | null;
  maxPvCurrentA: number | null;
  storageKwh: number | null;
  chemistry: 'LITHIUM' | 'AGM' | 'GEL' | null;
  priceKobo: number;
  notes: string | null;
  imageUrl: string | null;
  qtyRule: AccessoryRule;
  qtyPer: number;
  minKva: number | null;
  maxKva: number | null;
  roofTypes: RoofType[];
  itemized: boolean;
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
  const pv = describePv(item);
  const sysV = (item.systemVoltage ? ` · ${item.systemVoltage}V system` : '') + (pv ? ` · ${pv}` : '');
  switch (item.unit) {
    case 'KVA': return `${item.capacity} kVA${sysV}`;
    case 'KWH': return `${item.capacity} kWh${sysV}`;
    case 'AH': return `${item.capacity} Ah${item.voltage ? ` · ${item.voltage}V` : ''}${sysV}`;
    case 'W': return `${item.capacity} W`;
    default: return item.type === 'ACCESSORY' ? describeAccessoryRule(item) : '';
  }
}

export function AdminCatalogManager({ items }: { items: MasterItemDto[] }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPrices, setShowPrices] = useState(false);

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    items: items.filter((i) => i.type === type),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-3">
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPrices((v) => !v)}
            aria-expanded={showPrices}
            className="btn btn-secondary"
          >
            <Tags className="h-4 w-4" /> Update prices
          </button>
        )}
        {items.length === 0 && (
          <form action={seedMasterCatalogAction}>
            <SeedButton />
          </form>
        )}
        {items.length > 0 && !items.some((i) => i.type === 'ACCESSORY') && (
          <form action={addStarterAccessoriesAction}>
            <button type="submit" className="btn btn-secondary">
              <Sparkles className="h-4 w-4" /> Add starter accessories
            </button>
          </form>
        )}
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="btn btn-primary"
        >
          {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAddForm ? 'Close' : 'Add product'}
        </button>
      </div>

      {showPrices && items.length > 0 && (
        <PriceTools
          items={items}
          adjustAction={bulkAdjustMasterPricesAction}
          importAction={importMasterPriceListAction}
          onClose={() => setShowPrices(false)}
        />
      )}

      {showAddForm && (
        <div className="card p-5">
          <h2 className="section-title mb-4">New platform product</h2>
          <ItemForm onSaved={() => setShowAddForm(false)} />
        </div>
      )}

      {items.length === 0 && (
        <div className="card border-dashed p-10 text-center">
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
            <section key={type} className="card">
              <div className="flex items-center gap-2 border-b px-5 py-3">
                <h2 className="section-title">{TYPE_LABELS[type].plural}</h2>
                <span className="text-[13px] text-muted-foreground">{group.length}</span>
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
      className="btn btn-secondary"
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
      <div className="bg-secondary/60 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">
            Edit {item.brand} {item.model}
          </h3>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="btn btn-ghost btn-sm"
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
      <ProductThumb url={item.imageUrl} alt={`${item.brand} ${item.model}`} />
      <div className="min-w-[180px] flex-1">
        <div className="text-[15px] font-medium">
          {item.brand} {item.model}
          {!item.isActive && (
            <span className="chip ml-2 text-muted-foreground">
              Hidden
            </span>
          )}
        </div>
        <div className="text-[13px] text-muted-foreground">
          {describeCapacity(item)}
          {item.chemistry ? ` · ${item.chemistry.toLowerCase()}` : ''}
          {item.notes ? ` · ${item.notes}` : ''}
        </div>
      </div>
      <div className="figure text-[15px]">{formatKobo(item.priceKobo)}</div>
      <div className="flex items-center gap-1">
        <form action={toggleMasterItemAction}>
          <input type="hidden" name="id" value={item.id} />
          <button
            type="submit"
            aria-label={item.isActive ? 'Hide from installers' : 'Show to installers'}
            title={item.isActive ? 'Hide from installers' : 'Show to installers'}
            className="btn btn-ghost h-10 w-10 px-0"
          >
            {item.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Edit ${item.model}`}
          className="btn btn-ghost h-10 w-10 px-0"
        >
          <Pencil className="h-4 w-4" />
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
            className="btn btn-ghost h-10 w-10 px-0 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
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
            <span className="text-[13px] text-muted-foreground">
              Inverters only pair with same-voltage batteries in quotes.
            </span>
          </label>
        )}

        {(type === 'INVERTER' || type === 'GENERATOR') && <PvSpecFields item={item} errors={err} />}
        {type === 'ACCESSORY' && <AccessoryRuleFields item={item} errors={err} />}

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

      <ProductImageField initialUrl={item?.imageUrl} />

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
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[15px] text-destructive">
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
      className="btn btn-primary"
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
      {error && <span className="text-[13px] text-destructive">{error}</span>}
    </label>
  );
}
