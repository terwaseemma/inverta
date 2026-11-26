'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Battery,
  Check,
  Clock,
  Info,
  Leaf,
  Mail,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  Sun,
  Trash2,
  TrendingDown,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { AppliancePreset, BuildingStoreys, CalculationResult, RoofType } from '@inverta/shared';
import {
  BUILDING_STOREY_LABELS,
  BUILDING_STOREYS,
  DEFAULT_SITE,
  findPreset,
  formatKobo,
  MATERIALS_LINE_NAME,
  materialsDetail,
  ROOF_TYPE_LABELS,
  ROOF_TYPES,
  splitAccessories,
} from '@inverta/shared';
import { cn } from '@/lib/utils';
import { ApplianceIcon } from './appliance-icons';
import { SystemDiagram } from '@/components/proposal/SystemDiagram';
import type { InstalledSystem } from '@/lib/system-layout';

/** The quoted system in the shape the installation picture draws, or null when there's nothing to assemble. */
function installedFrom(data: SubmitResponse): InstalledSystem | null {
  const r = data.result;
  if (!r.panels || (!r.generator && !r.inverter)) return null;
  const img = (id: string | undefined) => (id ? data.images?.[id] ?? null : null);
  return {
    panels: { name: `${r.panels.brand} ${r.panels.model}`, count: r.panels.count, imageUrl: img(r.panels.id), watts: r.panels.wattsPerPanel },
    inverter: r.inverter
      ? { name: `${r.inverter.brand} ${r.inverter.model}`, count: 1, imageUrl: img(r.inverter.id), kva: r.inverter.capacityKva }
      : null,
    batteries: r.batteries
      ? { name: `${r.batteries.brand} ${r.batteries.model}`, count: r.batteries.count, imageUrl: img(r.batteries.id), kwhEach: r.batteries.singleUnitCapacityKwh }
      : null,
    generator: r.generator
      ? { name: `${r.generator.brand} ${r.generator.model}`, count: 1, imageUrl: img(r.generator.id), kva: r.generator.capacityKva, kwh: r.generator.storageKwh }
      : null,
    accessories: (r.accessories ?? []).map((a) => ({ name: a.name, count: a.quantity, yards: a.unit === 'yard' })),
  };
}
import { track } from '@/lib/analytics';

type Step = 1 | 2 | 3;

// Battery chemistry stays a silent default — the installer's catalog decides
// which specific battery gets selected, so 'none' ("installer decides") is
// the sensible choice. Backup hours, by contrast, swings the price more than
// anything else on this page, so the customer picks it (below).
const DEFAULT_BATTERY_PREFERENCE = 'none' as const;

const BACKUP_HOUR_OPTIONS = [4, 6, 8, 12] as const;
const DEFAULT_BACKUP_HOURS = 6;

interface SelectedAppliance {
  key: string;
  name: string;
  wattage: number;
  hoursPerDay: number;
  quantity: number;
  isCustom: boolean;
}

interface Props {
  slug: string;
  installerName: string;
  region: string;
  presets: AppliancePreset[];
  /** Set when the customer came through a marketer's link — credits the lead. */
  memberCode?: string;
}

interface SubmitResponse {
  leadId: string;
  result: CalculationResult;
  installer: { businessName: string; phone: string; email: string };
  /** Photos of the picked parts, by catalog item id (only those with one). */
  images?: Record<string, string>;
}

export function Calculator({ slug, installerName, presets, memberCode }: Props) {
  const [step, setStep] = useState<Step>(1);

  // Step 1 — current spend (all optional)
  const [monthlyElectricityBill, setMonthlyElectricityBill] = useState('');
  const [monthlyFuelCost, setMonthlyFuelCost] = useState('');
  const [generatorKva, setGeneratorKva] = useState('');
  const [generatorHours, setGeneratorHours] = useState('');

  // Step 1 — appliances + how long they should run on battery
  const [appliances, setAppliances] = useState<SelectedAppliance[]>([]);
  const [backupHours, setBackupHours] = useState<number>(DEFAULT_BACKUP_HOURS);

  // Step 2 — the building: picks mounting and sizes the cable run
  const [roofType, setRoofType] = useState<RoofType>(DEFAULT_SITE.roofType);
  const [storeys, setStoreys] = useState<BuildingStoreys>(DEFAULT_SITE.storeys);

  // Step 3 — contact
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [consent, setConsent] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<SubmitResponse | null>(null);

  // Mirrors the server engine: peak is the sum of nameplates, daily energy is
  // discounted by each preset's duty cycle (a fridge's compressor runs ~40% of
  // the time). The server recomputes from the preset list — this is just so
  // the live figures match what the results page will say.
  const totals = useMemo(() => {
    const load = appliances.reduce((s, a) => s + a.wattage * a.quantity, 0);
    const daily = appliances.reduce(
      (s, a) =>
        s +
        a.wattage * a.quantity * a.hoursPerDay * (findPreset(a.name)?.dutyCycle ?? 1),
      0,
    );
    return { loadW: load, dailyWh: daily };
  }, [appliances]);

  if (response) {
    return (
      <Results
        data={response}
        onRestart={() => window.location.reload()}
        onContact={(channel) =>
          track('quote_contact_clicked', { channel, calculator: slug, via_marketer: Boolean(memberCode) })
        }
      />
    );
  }

  async function onSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/calc/${slug}/submit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          appliances: appliances.map((a) => ({
            name: a.name,
            wattage: a.wattage,
            hoursPerDay: a.hoursPerDay,
            quantity: a.quantity,
          })),
          backupHours,
          batteryPreference: DEFAULT_BATTERY_PREFERENCE,
          customerName,
          customerEmail,
          customerPhone,
          referralSource: referralSource || undefined,
          memberCode,
          consent,
          monthlyElectricityBillNaira: asNumber(monthlyElectricityBill),
          monthlyFuelCostNaira: asNumber(monthlyFuelCost),
          generatorCapacityKva: asNumber(generatorKva),
          generatorHoursPerDay: asNumber(generatorHours),
          roofType,
          storeys,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Something went wrong. Please try again.');
        track('quote_failed', { calculator: slug, status: res.status });
        return;
      }
      setResponse(await res.json());
      trackStep('contact');
    } catch (err) {
      setError('Network error. Please try again.');
      track('quote_failed', { calculator: slug, status: 'network' });
    } finally {
      setSubmitting(false);
    }
  }

  // The funnel: which step people finish. No customer details, only shape.
  function trackStep(name: 'appliances' | 'spending' | 'contact') {
    track('calculator_step_completed', {
      step: name,
      calculator: slug,
      via_marketer: Boolean(memberCode),
      appliance_count: appliances.length,
      backup_hours: backupHours,
      gave_spending: Boolean(monthlyElectricityBill || monthlyFuelCost || generatorKva),
      roof_type: roofType,
      storeys,
    });
  }

  const canAdvance = validateStep(step, {
    appliances,
    customerName,
    customerEmail,
    customerPhone,
    consent,
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <StepNav step={step} />

      <div className="card mt-6 p-5 sm:p-8">
        {/* Step 1 = Appliances (concrete question),
            Step 2 = Spending (optional savings context),
            Step 3 = Contact. */}
        {step === 1 && (
          <Step2
            presets={presets}
            appliances={appliances}
            setAppliances={setAppliances}
            totals={totals}
            backupHours={backupHours}
            setBackupHours={setBackupHours}
          />
        )}
        {step === 2 && (
          <Step1
            monthlyElectricityBill={monthlyElectricityBill}
            setMonthlyElectricityBill={setMonthlyElectricityBill}
            monthlyFuelCost={monthlyFuelCost}
            setMonthlyFuelCost={setMonthlyFuelCost}
            generatorKva={generatorKva}
            setGeneratorKva={setGeneratorKva}
            generatorHours={generatorHours}
            setGeneratorHours={setGeneratorHours}
            roofType={roofType}
            setRoofType={setRoofType}
            storeys={storeys}
            setStoreys={setStoreys}
          />
        )}
        {step === 3 && (
          <Step4
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerEmail={customerEmail}
            setCustomerEmail={setCustomerEmail}
            customerPhone={customerPhone}
            setCustomerPhone={setCustomerPhone}
            referralSource={referralSource}
            setReferralSource={setReferralSource}
            consent={consent}
            setConsent={setConsent}
            installerName={installerName}
          />
        )}

        {error && (
          <div role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[15px] text-destructive">
            {error}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={step === 1 || submitting}
          onClick={() => setStep((s) => (s - 1) as Step)}
        >
          Back
        </button>
        {step < 3 ? (
          <button
            type="button"
            className="btn btn-primary min-w-[140px]"
            disabled={!canAdvance || submitting}
            onClick={() => {
              trackStep(step === 1 ? 'appliances' : 'spending');
              setStep((s) => (s + 1) as Step);
            }}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary min-w-[180px]"
            disabled={!canAdvance || submitting}
            onClick={onSubmit}
          >
            {submitting ? 'Working out your plan…' : 'Get my solar plan'}
          </button>
        )}
      </div>
    </div>
  );
}

function StepNav({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: 'Appliances' },
    { n: 2, label: 'Your home' },
    { n: 3, label: 'Contact' },
  ];
  return (
    <ol className="flex items-center gap-2" aria-label={`Step ${step} of ${steps.length}`}>
      {steps.map((s, i) => {
        const done = step > s.n;
        const current = step === s.n;
        return (
          <li
            key={s.n}
            aria-current={current ? 'step' : undefined}
            className={cn('flex min-w-0 items-center gap-2', i < steps.length - 1 && 'flex-1')}
          >
            <span
              className={cn(
                'grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold tabular-nums',
                done
                  ? 'bg-foreground text-background'
                  : current
                    ? 'bg-primary text-primary-foreground'
                    : 'border bg-card text-muted-foreground',
              )}
            >
              {done ? <Check className="h-4 w-4" aria-label="Done" /> : s.n}
            </span>
            {/* Every label from sm up; on a phone only the current one, so
                three steps never push the page sideways. */}
            <span
              className={cn(
                'truncate text-[15px] font-medium',
                current ? 'text-foreground' : 'hidden text-muted-foreground sm:inline',
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span aria-hidden className={cn('h-px min-w-4 flex-1', done ? 'bg-foreground' : 'bg-border')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Step1(props: {
  monthlyElectricityBill: string;
  setMonthlyElectricityBill: (v: string) => void;
  monthlyFuelCost: string;
  setMonthlyFuelCost: (v: string) => void;
  generatorKva: string;
  setGeneratorKva: (v: string) => void;
  generatorHours: string;
  setGeneratorHours: (v: string) => void;
  roofType: RoofType;
  setRoofType: (v: RoofType) => void;
  storeys: BuildingStoreys;
  setStoreys: (v: BuildingStoreys) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[22px] font-semibold tracking-[-0.01em]">Tell us about your building</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">
          It decides how the panels are mounted and how much cable runs from the roof.
        </p>
      </div>
      <Choice
        legend="Roof"
        options={ROOF_TYPES.map((r) => ({ value: r, label: ROOF_TYPE_LABELS[r] }))}
        value={props.roofType}
        onChange={props.setRoofType}
      />
      <Choice
        legend="Building height"
        options={BUILDING_STOREYS.map((v) => ({ value: v, label: BUILDING_STOREY_LABELS[v] }))}
        value={props.storeys}
        onChange={props.setStoreys}
      />

      <div className="border-t pt-6">
        <h2 className="text-[22px] font-semibold tracking-[-0.01em]">What do you spend on power today?</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Optional, but it&apos;s how we work out what you&apos;ll save each month and how fast
          the system pays for itself.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Monthly electricity bill (₦)">
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={props.monthlyElectricityBill}
            onChange={(e) => props.setMonthlyElectricityBill(e.target.value)}
            placeholder="e.g. 25,000"
            className="input"
          />
        </Field>
        <Field label="Monthly generator fuel (₦)">
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={props.monthlyFuelCost}
            onChange={(e) => props.setMonthlyFuelCost(e.target.value)}
            placeholder="e.g. 30,000"
            className="input"
          />
        </Field>
        <Field label="Generator capacity (kVA)">
          <input
            type="number"
            min="0"
            step="0.1"
            value={props.generatorKva}
            onChange={(e) => props.setGeneratorKva(e.target.value)}
            placeholder="e.g. 5"
            className="input"
          />
        </Field>
        <Field label="Generator hours per day">
          <input
            type="number"
            min="0"
            max="24"
            step="0.5"
            value={props.generatorHours}
            onChange={(e) => props.setGeneratorHours(e.target.value)}
            placeholder="e.g. 6"
            className="input"
          />
        </Field>
      </div>
    </div>
  );
}

function Choice<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-[15px] font-medium">{legend}</legend>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={cn(
              'min-h-11 rounded-xl border px-3 py-2 text-[15px] font-medium leading-snug transition-colors duration-150',
              value === o.value
                ? 'border-foreground bg-foreground text-background'
                : 'bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Step2(props: {
  presets: AppliancePreset[];
  appliances: SelectedAppliance[];
  setAppliances: (a: SelectedAppliance[]) => void;
  totals: { loadW: number; dailyWh: number };
  backupHours: number;
  setBackupHours: (h: number) => void;
}) {
  const { presets, appliances, setAppliances, totals, backupHours, setBackupHours } =
    props;
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customWattage, setCustomWattage] = useState('');

  // One aggregated entry per preset: clicking its card bumps the quantity,
  // and the badge on the card mirrors that quantity.
  function presetEntry(name: string) {
    return appliances.find((a) => !a.isCustom && a.name === name);
  }

  function addPreset(preset: AppliancePreset) {
    const existing = presetEntry(preset.name);
    if (existing) {
      update(existing.key, { quantity: existing.quantity + 1 });
      return;
    }
    setAppliances([
      ...appliances,
      {
        key: `preset:${preset.name}`,
        name: preset.name,
        wattage: preset.defaultWattageW,
        hoursPerDay: 4,
        quantity: 1,
        isCustom: false,
      },
    ]);
  }

  function addCustom() {
    const wattage = Number(customWattage);
    if (!customName || !Number.isFinite(wattage) || wattage <= 0) return;
    setAppliances([
      ...appliances,
      {
        key: `custom:${customName}:${Date.now()}`,
        name: customName,
        wattage,
        hoursPerDay: 4,
        quantity: 1,
        isCustom: true,
      },
    ]);
    setCustomName('');
    setCustomWattage('');
    setShowCustomForm(false);
  }

  function update(key: string, patch: Partial<SelectedAppliance>) {
    setAppliances(appliances.map((a) => (a.key === key ? { ...a, ...patch } : a)));
  }

  function remove(key: string) {
    setAppliances(appliances.filter((a) => a.key !== key));
  }

  function stepQuantity(a: SelectedAppliance, delta: number) {
    const next = a.quantity + delta;
    if (next <= 0) {
      remove(a.key);
    } else {
      update(a.key, { quantity: next });
    }
  }

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-[22px] font-semibold tracking-[-0.01em]">What do you need to power?</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Tap an appliance to add it. Tap again for more than one.
        </p>
      </div>

      {/* Running totals: ink figures on a quiet strip. */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border" aria-live="polite">
        <div className="bg-secondary px-5 py-4">
          <div className="label">Total load</div>
          <div className="figure mt-1.5 whitespace-nowrap text-[28px] leading-none">
            {totals.loadW.toLocaleString()}
            <span className="ml-1 text-base font-medium text-muted-foreground">W</span>
          </div>
        </div>
        <div className="bg-secondary px-5 py-4">
          <div className="label">Daily energy</div>
          <div className="figure mt-1.5 whitespace-nowrap text-[28px] leading-none">
            {(totals.dailyWh / 1000).toFixed(1)}
            <span className="ml-1 text-base font-medium text-muted-foreground">kWh</span>
          </div>
        </div>
      </div>

      {/* Backup hours — the single biggest price lever, so the customer
          chooses it rather than inheriting a hidden default. */}
      <fieldset>
        <legend className="text-[15px] font-medium">
          How long should the battery run these appliances?
        </legend>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Backup with everything switched on. More hours means more batteries, and a
          higher price.
        </p>
        <div className="mt-3 grid grid-cols-4 gap-1 rounded-2xl bg-secondary p-1">
          {BACKUP_HOUR_OPTIONS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setBackupHours(h)}
              aria-pressed={backupHours === h}
              className={cn(
                'h-10 rounded-xl text-[15px] font-medium transition-colors duration-150',
                backupHours === h
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {h} hours
            </button>
          ))}
        </div>
      </fieldset>

      {/* Appliance tiles */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {presets.map((p) => {
          const entry = presetEntry(p.name);
          const count = entry?.quantity ?? 0;
          return (
            <button
              key={p.name}
              type="button"
              onClick={() => addPreset(p)}
              aria-label={count > 0 ? `Add another ${p.name} (${count} added)` : `Add ${p.name}`}
              className={cn(
                'relative flex min-h-[112px] flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-center transition-[border-color,background-color,transform] duration-150 active:scale-[0.98]',
                count > 0 ? 'border-foreground bg-secondary' : 'bg-card hover:border-foreground/30',
              )}
            >
              {count > 0 && (
                <span className="absolute right-2 top-2 grid h-6 min-w-6 place-items-center rounded-full bg-foreground px-1.5 text-[13px] font-semibold tabular-nums text-background">
                  {count}
                </span>
              )}
              <span
                aria-hidden
                className={cn(
                  'grid h-14 w-14 place-items-center rounded-2xl transition-colors duration-150',
                  count > 0 ? 'bg-primary/15' : 'bg-secondary',
                )}
              >
                <ApplianceIcon name={p.name} className="h-11 w-11" />
              </span>
              <span className="text-[13px] font-medium leading-tight">{p.name}</span>
              <span className="text-[13px] tabular-nums text-muted-foreground">
                {p.defaultWattageW} W
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setShowCustomForm((v) => !v)}
          aria-expanded={showCustomForm}
          className="btn btn-secondary"
        >
          <Plus className="h-4 w-4" /> Add an appliance not listed
        </button>
        {appliances.length > 0 && (
          <button type="button" onClick={() => setAppliances([])} className="btn btn-ghost">
            Clear all
          </button>
        )}
      </div>

      {showCustomForm && (
        <div className="rounded-2xl bg-secondary p-4">
          <div className="text-[15px] font-medium">Add an appliance that isn&apos;t listed</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="text"
              aria-label="Appliance name"
              placeholder="Name, e.g. Pressing iron"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="input min-w-[160px] flex-1"
            />
            <input
              type="number"
              aria-label="Watts"
              placeholder="Watts"
              min="1"
              value={customWattage}
              onChange={(e) => setCustomWattage(e.target.value)}
              className="input w-28"
            />
            <button type="button" onClick={addCustom} className="btn btn-secondary">
              Add
            </button>
          </div>
        </div>
      )}

      {/* Selected appliances — fine-tune quantity, watts and daily hours. */}
      {appliances.length > 0 && (
        <div>
          <h3 className="text-[15px] font-medium">
            Your appliances{' '}
            <span className="font-normal text-muted-foreground">· adjust watts and daily hours</span>
          </h3>
          <ul className="mt-3 divide-y rounded-2xl border">
            {appliances.map((a) => (
              <li key={a.key} className="flex flex-wrap items-end gap-x-4 gap-y-3 p-3 sm:p-4">
                <div className="flex min-w-[150px] flex-1 items-center gap-3 self-center">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary">
                    <ApplianceIcon name={a.name} className="h-8 w-8" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-medium">{a.name}</div>
                    {a.isCustom && <div className="text-[13px] text-muted-foreground">Custom</div>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-[13px] text-muted-foreground">
                  Quantity
                  <div className="flex h-10 items-center rounded-xl border bg-card">
                    <button
                      type="button"
                      onClick={() => stepQuantity(a, -1)}
                      aria-label={`Fewer ${a.name}`}
                      className="grid h-10 w-10 place-items-center rounded-l-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-[15px] font-medium tabular-nums text-foreground">
                      {a.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => stepQuantity(a, 1)}
                      aria-label={`More ${a.name}`}
                      className="grid h-10 w-10 place-items-center rounded-r-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <NumField label="Watts" value={a.wattage} onChange={(v) => update(a.key, { wattage: v })} />
                <NumField
                  label="Hours a day"
                  value={a.hoursPerDay}
                  step={0.5}
                  onChange={(v) => update(a.key, { hoursPerDay: v })}
                />
                <button
                  type="button"
                  onClick={() => remove(a.key)}
                  className="btn btn-ghost h-10 w-10 px-0 hover:text-destructive"
                  aria-label={`Remove ${a.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Step4(props: {
  customerName: string;
  setCustomerName: (v: string) => void;
  customerEmail: string;
  setCustomerEmail: (v: string) => void;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  referralSource: string;
  setReferralSource: (v: string) => void;
  consent: boolean;
  setConsent: (v: boolean) => void;
  installerName: string;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[22px] font-semibold tracking-[-0.01em]">Where should we send your plan?</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {props.installerName} will review your inputs and may follow up with a formal proposal.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input
            className="input"
            value={props.customerName}
            onChange={(e) => props.setCustomerName(e.target.value)}
          />
        </Field>
        <Field label="Email">
          <input
            className="input"
            type="email"
            value={props.customerEmail}
            onChange={(e) => props.setCustomerEmail(e.target.value)}
          />
        </Field>
        <Field label="WhatsApp number">
          <input
            className="input"
            type="tel"
            value={props.customerPhone}
            onChange={(e) => props.setCustomerPhone(e.target.value)}
            placeholder="+234…"
          />
        </Field>
        <Field label="How did you hear about us? (optional)">
          <input
            className="input"
            value={props.referralSource}
            onChange={(e) => props.setReferralSource(e.target.value)}
          />
        </Field>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-secondary p-4 text-[15px] leading-relaxed">
        <input
          type="checkbox"
          checked={props.consent}
          onChange={(e) => props.setConsent(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 accent-primary"
        />
        <span>
          I agree to be contacted by {props.installerName} about my solar plan. I can opt out at any time.
        </span>
      </label>
    </div>
  );
}

function Results({
  data,
  onRestart,
  onContact,
}: {
  data: SubmitResponse;
  onRestart: () => void;
  onContact: (channel: 'whatsapp' | 'call' | 'email') => void;
}) {
  const r = data.result;
  const installer = data.installer;
  const installed = installedFrom(data);
  const priced = Boolean(r.catalogComplete && r.panels && r.pricing);
  const materials = splitAccessories(r.accessories ?? []);

  const power = r.generator
    ? `${r.generator.capacityKva} kVA all-in-one`
    : `${r.inverter ? r.inverter.capacityKva : `~${r.requirements.inverterKva}`} kVA inverter`;
  const storage = r.generator
    ? `${r.generator.storageKwh} kWh storage`
    : `${r.batteries ? r.batteries.totalCapacityKwh : `~${r.requirements.batteryBankKwh}`} kWh battery`;
  const array = r.panels
    ? `${r.panels.count} × ${r.panels.wattsPerPanel} W panels`
    : `~${r.requirements.panelArrayKwp} kWp of panels`;

  const waNumber = installer.phone.replace(/[^\d]/g, '');

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      {/* The answer first: what it costs and what it is. */}
      <section className="rounded-[24px] bg-primary p-6 text-primary-foreground sm:p-8">
        <div className="text-[15px] font-medium opacity-80">
          Your solar plan from {installer.businessName}
        </div>
        {priced ? (
          <>
            <div className="figure mt-3 text-[40px] leading-none sm:text-[52px]">
              {formatKobo(r.pricing!.totalKobo)}
            </div>
            <div className="mt-2 text-[15px] opacity-80">
              Parts and installation — everything listed below.
            </div>
          </>
        ) : (
          <div className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.01em] sm:text-[34px]">
            {power}, {storage}
          </div>
        )}
        <ul className="mt-6 flex flex-wrap gap-2">
          {priced && <HeroPill>{power}</HeroPill>}
          {priced && <HeroPill>{storage}</HeroPill>}
          <HeroPill>{array}</HeroPill>
          {r.estimatedBackupHoursTypical !== null && (
            <HeroPill>About {r.estimatedBackupHoursTypical} hours of backup</HeroPill>
          )}
        </ul>
      </section>

      {r.warnings.length > 0 && (
        <section className="card mt-4 flex gap-3 p-5">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <ul className="space-y-2 text-[15px] leading-relaxed">
            {r.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      {/* The system, part by part. */}
      <section
        aria-label="Your system"
        className={cn('mt-4 grid gap-4', r.generator ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}
      >
        {r.generator ? (
          <Part
            icon={Zap}
            label="All-in-one solar generator"
            imageUrl={data.images?.[r.generator.id]}
            value={`${r.generator.capacityKva} kVA · ${r.generator.storageKwh} kWh`}
            sub={`${r.generator.brand} ${r.generator.model}`}
          />
        ) : (
          <>
            <Part
              icon={Zap}
              label="Inverter"
              imageUrl={r.inverter ? data.images?.[r.inverter.id] : undefined}
              value={r.inverter ? `${r.inverter.capacityKva} kVA` : `~${r.requirements.inverterKva} kVA`}
              sub={r.inverter ? `${r.inverter.brand} ${r.inverter.model}` : 'Recommended minimum size'}
            />
            <Part
              icon={Battery}
              label="Battery bank"
              imageUrl={r.batteries ? data.images?.[r.batteries.id] : undefined}
              value={
                r.batteries ? `${r.batteries.totalCapacityKwh} kWh` : `~${r.requirements.batteryBankKwh} kWh`
              }
              sub={
                r.batteries
                  ? `${r.batteries.count} × ${r.batteries.brand} ${r.batteries.model}`
                  : 'Recommended bank size'
              }
            />
          </>
        )}
        <Part
          icon={Sun}
          label="Solar array"
          imageUrl={r.panels ? data.images?.[r.panels.id] : undefined}
          value={r.panels ? `${r.panels.totalKwp} kWp` : `~${r.requirements.panelArrayKwp} kWp`}
          sub={r.panels ? `${r.panels.count} × ${r.panels.brand} ${r.panels.model}` : 'Recommended array size'}
        />
      </section>

      {/* The same parts, assembled as they'd be installed: built live from this quote. */}
      {installed && (
        <section className="card mt-4 p-6 sm:p-8" aria-labelledby="assembled">
          <h2 id="assembled" className="section-title">
            How it fits together
          </h2>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Your panels charge the battery through the inverter, which powers your home.
          </p>
          <div className="mt-6">
            <SystemDiagram system={installed} />
          </div>
        </section>
      )}

      {r.estimatedBackupHoursTypical !== null && (
        <section className="card mt-4 p-6">
          <h2 className="section-title">About {r.estimatedBackupHoursTypical} hours on battery</h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
            That&apos;s in normal use, where fridges and air conditioners cycle on and off
            rather than drawing full power the whole time.
            {r.estimatedBackupHoursFullLoad !== null && (
              <>
                {' '}
                With every appliance running flat out at once, it&apos;s about{' '}
                {r.estimatedBackupHoursFullLoad} hours.
              </>
            )}
          </p>
        </section>
      )}

      {r.monthlySavingsKobo !== null && r.paybackMonths !== null && (
        <section aria-label="Savings" className="mt-4 grid gap-4 sm:grid-cols-2">
          <Part
            icon={TrendingDown}
            label="Saved each month"
            // An estimate: whole naira, never kobo-level precision it does not have.
            value={formatKobo(Math.max(0, Math.round(r.monthlySavingsKobo / 100) * 100))}
            sub="Against what you spend on power today"
          />
          <Part
            icon={Clock}
            label="Pays for itself in"
            value={`${r.paybackMonths} months`}
            sub={
              r.co2SavedKgPerMonth !== null
                ? `And ${r.co2SavedKgPerMonth} kg less CO₂ every month`
                : 'At your current spending'
            }
          />
        </section>
      )}

      {r.monthlySavingsKobo === null && r.co2SavedKgPerMonth !== null && (
        <section className="card mt-4 flex items-center gap-4 p-6">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary">
            <Leaf className="h-5 w-5 text-success" aria-hidden />
          </span>
          <p className="text-[15px]">
            <span className="figure">{r.co2SavedKgPerMonth} kg</span> less CO₂ every month
            than running your generator.
          </p>
        </section>
      )}

      {!priced && (
        <section className="card mt-4 p-6">
          <h2 className="section-title">Your exact price is on its way</h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
            {installer.businessName} has your requirements and will send product
            recommendations with a formal quote for this setup.
          </p>
        </section>
      )}

      {priced && (
        <section className="card mt-4" aria-labelledby="included">
          <h2 id="included" className="section-title px-6 pt-6">
            What&apos;s included
          </h2>
          <ul className="mt-2 divide-y">
            {r.generator && (
              <Line name={`${r.generator.brand} ${r.generator.model}`} qty={1} unit={r.generator.priceKobo} total={r.generator.priceKobo} />
            )}
            {r.inverter && (
              <Line name={`${r.inverter.brand} ${r.inverter.model}`} qty={1} unit={r.inverter.priceKobo} total={r.inverter.priceKobo} />
            )}
            {r.batteries && (
              <Line name={`${r.batteries.brand} ${r.batteries.model}`} qty={r.batteries.count} unit={r.batteries.unitPriceKobo} total={r.batteries.totalPriceKobo} />
            )}
            <Line name={`${r.panels!.brand} ${r.panels!.model}`} qty={r.panels!.count} unit={r.panels!.unitPriceKobo} total={r.panels!.totalPriceKobo} />
            {materials.itemized.map((a) => (
              <Line
                key={a.id}
                name={a.name}
                qty={a.quantity}
                unit={a.unitPriceKobo}
                total={a.totalPriceKobo}
                yards={a.unit === 'yard'}
              />
            ))}
            {materials.bundled.length > 0 && (
              <Line
                name={MATERIALS_LINE_NAME}
                detail={materialsDetail(materials.bundled)}
                qty={1}
                unit={materials.bundledTotalKobo}
                total={materials.bundledTotalKobo}
              />
            )}
            <Line name="Installation" qty={1} unit={r.pricing!.installationFeeKobo} total={r.pricing!.installationFeeKobo} />
          </ul>
          <div className="flex items-baseline justify-between gap-4 border-t px-6 py-5">
            <span className="text-[15px] font-semibold">Total</span>
            <span className="figure text-[24px]">{formatKobo(r.pricing!.totalKobo)}</span>
          </div>
        </section>
      )}

      <section className="card mt-4 p-6" aria-labelledby="sizing">
        <h2 id="sizing" className="section-title">
          How we sized it
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Measure label="Connected load" value={`${r.totalLoadW.toLocaleString()} W`} />
          <Measure label="Typical draw" value={`${r.averageLoadW.toLocaleString()} W`} />
          <Measure label="Daily energy" value={`${(r.dailyEnergyWh / 1000).toFixed(1)} kWh`} />
          <Measure label="Startup surge" value={`${(r.requirements.peakSurgeW / 1000).toFixed(1)} kW`} />
        </dl>
      </section>

      {/* The point of the page: talk to the installer. */}
      <section className="card mt-4 p-6 sm:p-8" aria-labelledby="next">
        <h2 id="next" className="text-[20px] font-semibold tracking-[-0.01em]">
          {installer.businessName} will be in touch
        </h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
          They&apos;ll check your sizing and send a formal proposal. Want to talk sooner?
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                `Hi ${installer.businessName}, I just got a solar plan from your calculator and I'd like to talk about it.`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              onClick={() => onContact('whatsapp')}
            >
              <MessageCircle className="h-4 w-4" /> Message on WhatsApp
            </a>
          )}
          <a href={`tel:${installer.phone}`} className="btn btn-secondary" onClick={() => onContact('call')}>
            <Phone className="h-4 w-4" /> Call
          </a>
          <a href={`mailto:${installer.email}`} className="btn btn-secondary" onClick={() => onContact('email')}>
            <Mail className="h-4 w-4" /> Email
          </a>
        </div>
        <button type="button" onClick={onRestart} className="link mt-6 text-[15px]">
          Start a new quote
        </button>
      </section>
    </div>
  );
}

function HeroPill({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-full bg-black/10 px-3 py-1 text-[13px] font-medium">{children}</li>
  );
}

function Part({
  icon: Icon,
  label,
  value,
  sub,
  imageUrl,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  /** The picked product's photo, when the installer added one. */
  imageUrl?: string;
}) {
  return (
    <div className="card p-5">
      {imageUrl && (
        <div className="mb-4 grid h-32 place-items-center overflow-hidden rounded-xl bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={sub ?? label} className="h-full w-full object-contain p-2" />
        </div>
      )}
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary">
          <Icon className="h-[18px] w-[18px] text-muted-foreground" aria-hidden />
        </span>
        <span className="label">{label}</span>
      </div>
      <div className="figure mt-4 text-[26px] leading-none">{value}</div>
      {sub && <div className="mt-2 text-[13px] leading-snug text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Measure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="figure mt-1 whitespace-nowrap text-[17px]">{value}</dd>
    </div>
  );
}

function Line({
  name,
  qty,
  unit,
  total,
  yards = false,
  detail,
}: {
  name: string;
  qty: number;
  unit: number;
  total: number;
  /** The quantity is yards of cable. */
  yards?: boolean;
  detail?: string;
}) {
  return (
    <li className="flex items-start justify-between gap-4 px-6 py-3.5">
      <div className="min-w-0">
        <div className="text-[15px]">{name}</div>
        {detail && <div className="text-[13px] text-muted-foreground">{detail}</div>}
        {qty > 1 && (
          <div className="text-[13px] tabular-nums text-muted-foreground">
            {yards ? `${qty} yards × ${formatKobo(unit)}` : `${qty} × ${formatKobo(unit)}`}
          </div>
        )}
      </div>
      <div className="figure shrink-0 text-[15px]">{formatKobo(total)}</div>
    </li>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[15px] font-medium">{label}</span>
      {children}
    </label>
  );
}

function NumField({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-[13px] text-muted-foreground">
      {label}
      <input
        type="number"
        className="input h-10 w-[88px] tabular-nums"
        value={value}
        min={min}
        step={step}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
      />
    </label>
  );
}

function asNumber(v: string): number | undefined {
  if (!v.trim()) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function validateStep(
  step: Step,
  data: {
    appliances: SelectedAppliance[];
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    consent: boolean;
  },
): boolean {
  // Step 1 = Appliances (at least one required); Step 2 = Spending (all
  // optional); Step 3 = Contact (name, valid email, phone, consent).
  if (step === 1) return data.appliances.length > 0;
  if (step === 2) return true;
  if (step === 3)
    return (
      data.customerName.trim().length >= 2 &&
      /.+@.+\..+/.test(data.customerEmail) &&
      data.customerPhone.trim().length >= 7 &&
      data.consent
    );
  return false;
}
