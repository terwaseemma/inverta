import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  calculate,
  findPreset,
  nairaToKobo,
  sunHoursForRegion,
  DEFAULT_SUN_HOURS,
  CalculationError,
  schemas,
  type EngineCatalog,
  type EngineCatalogItem,
  type BatteryChemistry,
  type CatalogUnit,
} from '@inverta/shared';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { notifyNewLead } from '@/lib/notifications';
import { systemSummary } from '@/lib/lead-utils';

const RATE_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000 }; // 10/hr per IP

export async function POST(
  req: Request,
  { params }: { params: { slug: string } },
) {
  // 1. Rate limit by IP + slug so one abusive installer doesn't lock out others.
  const ip = getClientIp(req);
  const rl = rateLimit(`calc:${params.slug}:${ip}`, RATE_LIMIT);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  // 2. Parse + validate body.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = schemas.calculatorSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid submission', issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const data = parsed.data;

  // 3. Resolve the installer + catalog.
  const link = await prisma.calculatorLink.findUnique({
    where: { slug: params.slug },
    include: {
      installer: {
        include: {
          catalogItems: { where: { isActive: true } },
        },
      },
    },
  });

  if (!link || !link.isActive || !link.installer) {
    return NextResponse.json({ error: 'Calculator not found' }, { status: 404 });
  }

  const installer = link.installer;
  const catalog: EngineCatalog = {
    inverters: installer.catalogItems
      .filter((c) => c.type === 'INVERTER')
      .map(toEngineItem),
    batteries: installer.catalogItems
      .filter((c) => c.type === 'BATTERY')
      .map(toEngineItem),
    panels: installer.catalogItems
      .filter((c) => c.type === 'PANEL')
      .map(toEngineItem),
    generators: installer.catalogItems
      .filter((c) => c.type === 'GENERATOR')
      .map(toEngineItem),
    accessories: installer.catalogItems
      .filter((c) => c.type === 'ACCESSORY')
      .map(toEngineItem),
    markupPercent: installer.markupPercent,
    installationFeeKobo: installer.installationFeeKobo,
    installationFeePercent: installer.installationFeePercent,
  };

  // 4. Run the pure engine.
  let result;
  try {
    result = calculate(
      {
        // Duty cycle and surge are physics, not user input — resolve them
        // server-side from the preset name so a tampered payload can't shrink
        // (or inflate) a quote. Custom appliances the customer typed in get
        // the conservative defaults: continuous draw, no inrush.
        appliances: data.appliances.map((a) => {
          const preset = findPreset(a.name);
          return {
            ...a,
            dutyCycle: preset?.dutyCycle,
            surgeFactor: preset?.surgeFactor,
          };
        }),
        backupHours: data.backupHours,
        batteryPreference: data.batteryPreference,
        sunHours: sunHoursForRegion(installer.region) ?? DEFAULT_SUN_HOURS,
        monthlyElectricityBillKobo:
          data.monthlyElectricityBillNaira != null
            ? nairaToKobo(data.monthlyElectricityBillNaira)
            : undefined,
        monthlyFuelCostKobo:
          data.monthlyFuelCostNaira != null
            ? nairaToKobo(data.monthlyFuelCostNaira)
            : undefined,
        generatorCapacityKva: data.generatorCapacityKva,
        generatorHoursPerDay: data.generatorHoursPerDay,
      },
      catalog,
    );
  } catch (err) {
    if (err instanceof CalculationError) {
      // Customer-facing copy only — never surface internal engine messages.
      // Both remaining error codes are appliance/input problems.
      return NextResponse.json(
        {
          error:
            'Please add at least one appliance with its usage hours, then try again.',
        },
        { status: 422 },
      );
    }
    throw err;
  }

  // 5. Persist the lead (input + result snapshots for audit / re-runs).
  const lead = await prisma.lead.create({
    data: {
      installerId: installer.id,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      referralSource: data.referralSource,
      submittedIp: ip === 'unknown' ? null : ip,
      submittedUserAgent: req.headers.get('user-agent'),
      inputSnapshot: data as unknown as object,
      resultSnapshot: result as unknown as object,
    },
  });

  // Notify the installer (in-app row + email when Resend is configured).
  // Never let notification failures break the customer's submission.
  try {
    await notifyNewLead({
      installerId: installer.id,
      installerEmail: installer.email,
      installerName: installer.businessName,
      leadId: lead.id,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      systemSummary: systemSummary(result as never),
    });
  } catch {
    // swallow — the lead is already saved
  }

  return NextResponse.json({
    leadId: lead.id,
    result,
    installer: {
      businessName: installer.businessName,
      phone: installer.phone,
      email: installer.email,
    },
  });
}

function toEngineItem(c: {
  id: string;
  brand: string;
  model: string;
  capacity: { toNumber(): number } | number;
  unit: string;
  voltage: number | null;
  systemVoltage: number | null;
  storageKwh: { toNumber(): number } | number | null;
  chemistry: string | null;
  priceKobo: number;
}): EngineCatalogItem {
  const capacity =
    typeof c.capacity === 'number' ? c.capacity : Number(c.capacity.toNumber());
  const storageKwh =
    c.storageKwh == null
      ? null
      : typeof c.storageKwh === 'number'
        ? c.storageKwh
        : Number(c.storageKwh.toNumber());
  return {
    id: c.id,
    brand: c.brand,
    model: c.model,
    capacity,
    unit: c.unit as CatalogUnit,
    voltage: c.voltage,
    systemVoltage: c.systemVoltage,
    storageKwh,
    chemistry: c.chemistry as BatteryChemistry | null,
    priceKobo: c.priceKobo,
  };
}
