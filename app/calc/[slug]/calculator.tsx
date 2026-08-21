'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Leaf,
  TrendingDown,
  Zap,
  Battery,
  Sun,
  Plus,
  Minus,
  Trash2,
  Check,
} from 'lucide-react';
import type { AppliancePreset, CalculationResult } from '@inverta/shared';
import { findPreset, formatKobo } from '@inverta/shared';
import { cn } from '@/lib/utils';

// Product-style images for each preset (in public/appliances/, sourced from
// Icons8 — attribution link lives on the calculator page footer). Keyed by
// the exact preset name from @inverta/shared APPLIANCE_PRESETS.
const PRESET_IMAGES: Record<string, string> = {
  'LED bulb': '/appliances/bulb.png',
  'Ceiling fan': '/appliances/ceiling-fan.png',
  'Standing fan': '/appliances/standing-fan.png',
  'TV 32"': '/appliances/tv.png',
  'TV 43"': '/appliances/tv.png',
  Refrigerator: '/appliances/fridge.png',
  Freezer: '/appliances/freezer.png',
  'Washing machine': '/appliances/washing-machine.png',
  'AC 1HP': '/appliances/ac.png',
  'AC 1.5HP': '/appliances/ac.png',
  'AC 2HP': '/appliances/ac.png',
  Laptop: '/appliances/laptop.png',
  'Desktop computer': '/appliances/desktop.png',
  'Phone charger': '/appliances/phone-charger.png',
  'Water pump': '/appliances/water-pump.png',
  'DSTV decoder': '/appliances/decoder.png',
};

// Image when we have one, lightning bolt for custom appliances.
function ApplianceVisual({ name, className }: { name: string; className?: string }) {
  const src = PRESET_IMAGES[name];
  if (!src) {
    return <Zap className={cn('text-primary', className)} />;
  }
  // Static 96px PNGs — plain <img> keeps them out of the image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" aria-hidden className={cn('object-contain', className)} />;
}

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
}

interface SubmitResponse {
  leadId: string;
  result: CalculationResult;
  installer: { businessName: string; phone: string; email: string };
}

export function Calculator({ slug, installerName, presets }: Props) {
  const [step, setStep] = useState<Step>(1);

  // Step 1 — current spend (all optional)
  const [monthlyElectricityBill, setMonthlyElectricityBill] = useState('');
  const [monthlyFuelCost, setMonthlyFuelCost] = useState('');
  const [generatorKva, setGeneratorKva] = useState('');
  const [generatorHours, setGeneratorHours] = useState('');

  // Step 1 — appliances + how long they should run on battery
  const [appliances, setAppliances] = useState<SelectedAppliance[]>([]);
  const [backupHours, setBackupHours] = useState<number>(DEFAULT_BACKUP_HOURS);

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
    return <Results data={response} onRestart={() => window.location.reload()} />;
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
          consent,
          monthlyElectricityBillNaira: asNumber(monthlyElectricityBill),
          monthlyFuelCostNaira: asNumber(monthlyFuelCost),
          generatorCapacityKva: asNumber(generatorKva),
          generatorHoursPerDay: asNumber(generatorHours),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setResponse(await res.json());
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const canAdvance = validateStep(step, {
    appliances,
    customerName,
    customerEmail,
    customerPhone,
    consent,
  });

  return (
    <div className="container py-8">
      <StepNav step={step} />

      <div className="mx-auto mt-6 max-w-3xl">
        <div className="rounded-xl border bg-card/80 p-6 shadow-2xl backdrop-blur">
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
            <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            className="inline-flex h-11 items-center rounded-md border border-border bg-background/40 px-4 text-sm font-medium backdrop-blur transition-colors hover:bg-secondary disabled:opacity-50"
            disabled={step === 1 || submitting}
            onClick={() => setStep((s) => (s - 1) as Step)}
          >
            Back
          </button>
          {step < 3 ? (
            <button
              className="signup-gradient-hover glass-button inline-flex h-11 items-center rounded-md px-6 text-sm font-medium text-foreground transition-all duration-200 disabled:opacity-50"
              disabled={!canAdvance || submitting}
              onClick={() => setStep((s) => (s + 1) as Step)}
            >
              Continue
            </button>
          ) : (
            <button
              className="signup-gradient-hover glass-button inline-flex h-11 items-center rounded-md px-6 text-sm font-medium text-foreground transition-all duration-200 disabled:opacity-50"
              disabled={!canAdvance || submitting}
              onClick={onSubmit}
            >
              {submitting ? 'Calculating…' : 'Get my solar plan'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepNav({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: 'Appliances' },
    { n: 2, label: 'Spending' },
    { n: 3, label: 'Contact' },
  ];
  return (
    <ol className="mx-auto flex max-w-3xl items-center gap-2">
      {steps.map((s, i) => (
        <li key={s.n} className="flex flex-1 items-center gap-2">
          <div
            className={cn(
              'grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold',
              step > s.n
                ? 'bg-primary text-primary-foreground'
                : step === s.n
                  ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                  : 'bg-muted text-muted-foreground',
            )}
          >
            {step > s.n ? <Check className="h-4 w-4" /> : s.n}
          </div>
          <span
            className={cn(
              'text-sm font-medium',
              step >= s.n ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div
              className={cn(
                'ml-1 h-px flex-1',
                step > s.n ? 'bg-primary' : 'bg-border',
              )}
            />
          )}
        </li>
      ))}
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
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">What are you spending on energy today?</h2>
        <p className="text-sm text-muted-foreground">
          All fields are optional — answer what you can. We use this to estimate savings and CO₂ prevented.
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">What do you need to power?</h2>
        <p className="text-sm text-muted-foreground">
          Tap the appliances you want the solar system to run. Tap again to add more
          than one.
        </p>
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Total load
            </div>
            <div className="font-mono text-2xl font-semibold orange-text">
              {totals.loadW.toLocaleString()} W
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Daily energy
            </div>
            <div className="font-mono text-2xl font-semibold orange-text">
              {(totals.dailyWh / 1000).toFixed(1)} kWh
            </div>
          </div>
        </div>
      </div>

      {/* Backup hours — the single biggest price lever, so the customer
          chooses it rather than inheriting a hidden default. */}
      <div className="rounded-lg border bg-background/40 p-4 backdrop-blur">
        <div className="text-sm font-medium">
          How long should the battery run these appliances?
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Backup time with everything switched on. More hours means more batteries —
          and a higher price.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {BACKUP_HOUR_OPTIONS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setBackupHours(h)}
              aria-pressed={backupHours === h}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm transition-colors',
                backupHours === h
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background/40 hover:border-primary/50 hover:bg-primary/5',
              )}
            >
              {h} hours
            </button>
          ))}
        </div>
      </div>

      {/* Appliance card grid */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
        {presets.map((p) => {
          const entry = presetEntry(p.name);
          const count = entry?.quantity ?? 0;
          return (
            <button
              key={p.name}
              type="button"
              onClick={() => addPreset(p)}
              aria-label={`Add ${p.name}`}
              className={cn(
                'relative flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-all',
                count > 0
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-border bg-background/40 hover:border-primary/50 hover:bg-primary/5',
              )}
            >
              {count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow">
                  {count}
                </span>
              )}
              <ApplianceVisual name={p.name} className="h-9 w-9" />
              <span className="text-[11px] font-medium leading-tight">{p.name}</span>
              <span className="text-[9px] text-muted-foreground">
                {p.defaultWattageW}W
              </span>
            </button>
          );
        })}
      </div>

      {/* Actions under the grid */}
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => setShowCustomForm((v) => !v)}
          className="signup-gradient-hover glass-button inline-flex h-10 items-center gap-1.5 rounded-md px-4 text-sm font-medium text-foreground transition-all duration-200"
        >
          <Plus className="h-4 w-4" /> Add other appliance
        </button>
        {appliances.length > 0 && (
          <button
            type="button"
            onClick={() => setAppliances([])}
            className="inline-flex h-10 items-center rounded-md border bg-background/40 px-4 text-sm font-medium backdrop-blur transition-colors hover:bg-secondary"
          >
            Clear all
          </button>
        )}
      </div>

      {showCustomForm && (
        <div className="rounded-md border border-dashed p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Add a custom appliance
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="input flex-1 min-w-[140px]"
            />
            <input
              type="number"
              placeholder="Watts"
              min="1"
              value={customWattage}
              onChange={(e) => setCustomWattage(e.target.value)}
              className="input w-28"
            />
            <button
              type="button"
              onClick={addCustom}
              className="inline-flex h-10 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Selected appliances — fine-tune watts, quantity, and usage hours */}
      {appliances.length > 0 && (
        <div className="divide-y rounded-md border">
          {appliances.map((a) => {
            return (
              <div key={a.key} className="flex flex-wrap items-center gap-3 p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary/50">
                  <ApplianceVisual name={a.name} className="h-6 w-6" />
                </span>
                <div className="min-w-[120px] flex-1">
                  <div className="text-sm font-medium">{a.name}</div>
                  {a.isCustom && (
                    <div className="text-xs text-muted-foreground">Custom</div>
                  )}
                </div>
                <div className="flex flex-col text-xs text-muted-foreground">
                  Qty
                  <div className="mt-0.5 flex h-9 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => stepQuantity(a, -1)}
                      aria-label={`Fewer ${a.name}`}
                      className="grid h-7 w-7 place-items-center rounded-md border bg-background hover:bg-muted"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center font-mono text-sm text-foreground">
                      {a.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => stepQuantity(a, 1)}
                      aria-label={`More ${a.name}`}
                      className="grid h-7 w-7 place-items-center rounded-md border bg-background hover:bg-muted"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <NumField
                  label="Watts"
                  value={a.wattage}
                  onChange={(v) => update(a.key, { wattage: v })}
                />
                <NumField
                  label="Hrs/day"
                  value={a.hoursPerDay}
                  step={0.5}
                  onChange={(v) => update(a.key, { hoursPerDay: v })}
                />
                <button
                  type="button"
                  onClick={() => remove(a.key)}
                  className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
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
        <h2 className="text-xl font-semibold">Where should we send your plan?</h2>
        <p className="text-sm text-muted-foreground">
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
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={props.consent}
          onChange={(e) => props.setConsent(e.target.checked)}
          className="mt-0.5"
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
}: {
  data: SubmitResponse;
  onRestart: () => void;
}) {
  const r = data.result;
  return (
    <div className="container py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-xl border bg-card/80 p-6 backdrop-blur">
          <div className="text-sm text-muted-foreground">Your solar plan from</div>
          <h1 className="text-2xl font-semibold orange-text">{data.installer.businessName}</h1>
        </div>

        {r.warnings.length > 0 && (
          <div className="rounded-md border border-accent/40 bg-accent/10 p-3 text-sm">
            {r.warnings.map((w, i) => (
              <div key={i}>· {w}</div>
            ))}
          </div>
        )}

        <SummaryCard title="System summary" icon={<Zap className="h-5 w-5" />}>
          <dl
            className={cn(
              'grid gap-4',
              r.generator ? 'sm:grid-cols-2' : 'sm:grid-cols-3',
            )}
          >
            {r.generator ? (
              <Stat
                label="All-in-one solar generator"
                value={`${r.generator.capacityKva} kVA · ${r.generator.storageKwh} kWh`}
                sub={`${r.generator.brand} ${r.generator.model}`}
              />
            ) : (
              <>
                <Stat
                  label="Inverter"
                  value={
                    r.inverter
                      ? `${r.inverter.capacityKva} kVA`
                      : `~${r.requirements.inverterKva} kVA`
                  }
                  sub={r.inverter ? r.inverter.model : 'Recommended minimum size'}
                />
                <Stat
                  label="Battery bank"
                  value={
                    r.batteries
                      ? `${r.batteries.totalCapacityKwh} kWh`
                      : `~${r.requirements.batteryBankKwh} kWh`
                  }
                  sub={
                    r.batteries
                      ? `${r.batteries.count}× ${r.batteries.model}`
                      : 'Recommended bank capacity'
                  }
                />
              </>
            )}
            <Stat
              label="Solar array"
              value={
                r.panels
                  ? `${r.panels.totalKwp} kWp`
                  : `~${r.requirements.panelArrayKwp} kWp`
              }
              sub={
                r.panels
                  ? `${r.panels.count}× ${r.panels.wattsPerPanel}W ${r.panels.model}`
                  : 'Recommended array size'
              }
            />
          </dl>
          <dl className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div>Connected load: <span className="font-mono text-foreground">{r.totalLoadW.toLocaleString()} W</span></div>
            <div>Typical draw: <span className="font-mono text-foreground">{r.averageLoadW.toLocaleString()} W</span></div>
            <div>Daily energy: <span className="font-mono text-foreground">{(r.dailyEnergyWh / 1000).toFixed(1)} kWh</span></div>
            <div>Startup surge: <span className="font-mono text-foreground">{(r.requirements.peakSurgeW / 1000).toFixed(1)} kW</span></div>
          </dl>
          {r.estimatedBackupHoursTypical !== null && (
            <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
              <span className="font-medium">
                ⚡ Battery backup: ~{r.estimatedBackupHoursTypical} hours
              </span>{' '}
              <span className="text-muted-foreground">
                in normal use — fridges and air conditioners cycle on and off rather
                than drawing full power continuously.
                {r.estimatedBackupHoursFullLoad !== null && (
                  <>
                    {' '}
                    With every appliance running flat out at the same time it&apos;s
                    about {r.estimatedBackupHoursFullLoad} hours.
                  </>
                )}
              </span>
            </div>
          )}
        </SummaryCard>

        {!r.catalogComplete && (
          <div className="rounded-xl border border-accent/40 bg-accent/10 p-5">
            <h3 className="font-semibold">
              Exact pricing is on its way
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.installer.businessName} has received your system requirements and
              will follow up with product recommendations and a formal quote for this
              setup.
            </p>
          </div>
        )}

        {r.catalogComplete && r.panels && r.pricing && (
          <>
            <SummaryCard title="Bill of materials" icon={<Battery className="h-5 w-5" />}>
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">Item</th>
                    <th className="py-2 text-right font-medium">Qty</th>
                    <th className="py-2 text-right font-medium">Unit</th>
                    <th className="py-2 text-right font-medium">Line total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {r.generator && (
                    <BomRow name={`${r.generator.brand} ${r.generator.model}`} qty={1} unit={r.generator.priceKobo} total={r.generator.priceKobo} />
                  )}
                  {r.inverter && (
                    <BomRow name={`${r.inverter.brand} ${r.inverter.model}`} qty={1} unit={r.inverter.priceKobo} total={r.inverter.priceKobo} />
                  )}
                  {r.batteries && (
                    <BomRow name={`${r.batteries.brand} ${r.batteries.model}`} qty={r.batteries.count} unit={r.batteries.unitPriceKobo} total={r.batteries.totalPriceKobo} />
                  )}
                  <BomRow name={`${r.panels.brand} ${r.panels.model}`} qty={r.panels.count} unit={r.panels.unitPriceKobo} total={r.panels.totalPriceKobo} />
                  {r.accessories.map((a) => (
                    <BomRow key={a.id} name={a.name} qty={a.quantity} unit={a.unitPriceKobo} total={a.totalPriceKobo} />
                  ))}
                  <BomRow name="Installation" qty={1} unit={r.pricing.installationFeeKobo} total={r.pricing.installationFeeKobo} />
                </tbody>
              </table>
            </SummaryCard>

            <SummaryCard title="Cost" icon={<Sun className="h-5 w-5" />}>
              <dl className="space-y-1 text-sm">
                <CostRow label="Subtotal" value={r.pricing.subtotalKobo} />
                <CostRow label="Margin" value={r.pricing.markupKobo} muted />
                <div className="border-t pt-2">
                  <CostRow label="Total" value={r.pricing.totalKobo} bold />
                </div>
              </dl>
            </SummaryCard>
          </>
        )}

        {r.monthlySavingsKobo !== null && r.paybackMonths !== null && (
          <SummaryCard title="Savings vs. today" icon={<TrendingDown className="h-5 w-5" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Stat
                label="Estimated monthly savings"
                value={formatKobo(Math.max(0, r.monthlySavingsKobo))}
                sub="Compared to what you spend on power today"
              />
              <Stat
                label="Payback period"
                value={`${r.paybackMonths} months`}
                sub="At current spending levels"
              />
            </div>
          </SummaryCard>
        )}

        {r.co2SavedKgPerMonth !== null && (
          <SummaryCard title="Environmental impact" icon={<Leaf className="h-5 w-5" />}>
            <Stat
              label="CO₂ prevented per month"
              value={`${r.co2SavedKgPerMonth} kg`}
              sub={`≈ ${Math.max(0, Math.round(r.co2SavedKgPerMonth / 21))} trees planted equivalent`}
            />
          </SummaryCard>
        )}

        <div className="rounded-xl border border-primary/40 bg-primary/5 p-6 backdrop-blur">
          <h3 className="text-lg font-semibold">
            <span className="orange-text">{data.installer.businessName}</span> has your details.
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            They&apos;ll review your sizing and reach out with a formal proposal. In the
            meantime you can reach them directly:
          </p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span>📞 {data.installer.phone}</span>
            <span>✉️ {data.installer.email}</span>
          </div>
          <div className="mt-5">
            <button
              onClick={onRestart}
              className="inline-flex h-10 items-center rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted"
            >
              Start over
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
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
    <label className="flex flex-col text-xs text-muted-foreground">
      {label}
      <input
        type="number"
        className="input mt-0.5 h-9 w-20"
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

function SummaryCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card/80 p-6 shadow-xl backdrop-blur">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/15 text-primary">
          {icon}
        </div>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function BomRow({
  name,
  qty,
  unit,
  total,
}: {
  name: string;
  qty: number;
  unit: number;
  total: number;
}) {
  return (
    <tr>
      <td className="py-2">{name}</td>
      <td className="py-2 text-right font-mono">{qty}</td>
      <td className="py-2 text-right font-mono">{formatKobo(unit)}</td>
      <td className="py-2 text-right font-mono">{formatKobo(total)}</td>
    </tr>
  );
}

function CostRow({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: number;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex justify-between',
        bold && 'text-base font-semibold',
        muted && 'text-muted-foreground',
      )}
    >
      <span>{label}</span>
      <span className="font-mono">{formatKobo(value)}</span>
    </div>
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
