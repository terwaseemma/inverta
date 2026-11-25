'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Battery,
  Blend,
  Cctv,
  Check,
  Clock,
  Coffee,
  Info,
  Lamp,
  Leaf,
  Mail,
  MessageCircle,
  Microwave as MicrowaveIcon,
  Minus,
  Phone,
  PlugZap,
  Printer,
  Router,
  Plus,
  Shirt,
  ShowerHead,
  Speaker,
  Sun,
  Trash2,
  TrendingDown,
  Zap,
  type LucideIcon,
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
  'TV 55"': '/appliances/tv.png',
  Refrigerator: '/appliances/fridge.png',
  Freezer: '/appliances/freezer.png',
  'Washing machine': '/appliances/washing-machine.png',
  'AC 1HP': '/appliances/ac.png',
  'AC 1.5HP': '/appliances/ac.png',
  'AC 2HP': '/appliances/ac.png',
  'Inverter AC 1.5HP': '/appliances/ac.png',
  Laptop: '/appliances/laptop.png',
  'Desktop computer': '/appliances/desktop.png',
  'Phone charger': '/appliances/phone-charger.png',
  'Water pump': '/appliances/water-pump.png',
  'DSTV decoder': '/appliances/decoder.png',
};

// Full-colour product art where we have it; a neutral line glyph matched to
// the appliance where we do not (never a generic bolt, and never orange — the
// accent belongs to the actions on this page).
const PRESET_GLYPHS: Record<string, LucideIcon> = {
  'Security floodlight': Lamp,
  Microwave: MicrowaveIcon,
  'Electric kettle': Coffee,
  Blender: Blend,
  'Electric iron': Shirt,
  'Water heater': ShowerHead,
  'Sound system': Speaker,
  'CCTV system': Cctv,
  Printer: Printer,
  'WiFi router': Router,
};

function ApplianceVisual({ name, className }: { name: string; className?: string }) {
  const src = PRESET_IMAGES[name];
  if (!src) {
    const Glyph = PRESET_GLYPHS[name] ?? PlugZap;
    return <Glyph aria-hidden className={cn('p-1 text-muted-foreground', className)} strokeWidth={1.6} />;
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
  /** Set when the customer came through a marketer's link — credits the lead. */
  memberCode?: string;
}

interface SubmitResponse {
  leadId: string;
  result: CalculationResult;
  installer: { businessName: string; phone: string; email: string };
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
          memberCode,
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
            onClick={() => setStep((s) => (s + 1) as Step)}
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
    { n: 2, label: 'Spending' },
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
}) {
  return (
    <div className="space-y-5">
      <div>
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
              <ApplianceVisual name={p.name} className="h-10 w-10" />
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
                    <ApplianceVisual name={a.name} className="h-7 w-7" />
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
}: {
  data: SubmitResponse;
  onRestart: () => void;
}) {
  const r = data.result;
  const installer = data.installer;
  const priced = Boolean(r.catalogComplete && r.panels && r.pricing);

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
            value={`${r.generator.capacityKva} kVA · ${r.generator.storageKwh} kWh`}
            sub={`${r.generator.brand} ${r.generator.model}`}
          />
        ) : (
          <>
            <Part
              icon={Zap}
              label="Inverter"
              value={r.inverter ? `${r.inverter.capacityKva} kVA` : `~${r.requirements.inverterKva} kVA`}
              sub={r.inverter ? `${r.inverter.brand} ${r.inverter.model}` : 'Recommended minimum size'}
            />
            <Part
              icon={Battery}
              label="Battery bank"
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
          value={r.panels ? `${r.panels.totalKwp} kWp` : `~${r.requirements.panelArrayKwp} kWp`}
          sub={r.panels ? `${r.panels.count} × ${r.panels.brand} ${r.panels.model}` : 'Recommended array size'}
        />
      </section>

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
            {r.accessories.map((a) => (
              <Line key={a.id} name={a.name} qty={a.quantity} unit={a.unitPriceKobo} total={a.totalPriceKobo} />
            ))}
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
            >
              <MessageCircle className="h-4 w-4" /> Message on WhatsApp
            </a>
          )}
          <a href={`tel:${installer.phone}`} className="btn btn-secondary">
            <Phone className="h-4 w-4" /> Call
          </a>
          <a href={`mailto:${installer.email}`} className="btn btn-secondary">
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
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card p-5">
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
}: {
  name: string;
  qty: number;
  unit: number;
  total: number;
}) {
  return (
    <li className="flex items-start justify-between gap-4 px-6 py-3.5">
      <div className="min-w-0">
        <div className="text-[15px]">{name}</div>
        {qty > 1 && (
          <div className="text-[13px] tabular-nums text-muted-foreground">
            {qty} × {formatKobo(unit)}
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
