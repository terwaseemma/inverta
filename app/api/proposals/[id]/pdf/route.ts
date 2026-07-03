import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { buildProposalPdf } from '@/lib/pdf/proposal-pdf';
import {
  parseInputSnapshot,
  parseResultSnapshot,
  type LeadResultSnapshot,
} from '@/lib/lead-utils';

// Generates the proposal PDF on demand from the database — no object storage
// needed, and edits are always reflected. The route is public by capability:
// a cuid proposal id is unguessable, same trust model as the /proposal/[id]
// customer page it's linked from.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      installer: {
        select: {
          businessName: true,
          phone: true,
          email: true,
          address: true,
          websiteUrl: true,
          logoUrl: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountName: true,
        },
      },
      lead: {
        select: { customerName: true, inputSnapshot: true, resultSnapshot: true },
      },
    },
  });
  if (!proposal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const input = parseInputSnapshot(proposal.lead.inputSnapshot);
  const result = parseResultSnapshot(proposal.lead.resultSnapshot);

  // Load analysis rows straight from the customer's appliance selections.
  const loadRows = (input.appliances ?? []).map((a) => ({
    name: a.name,
    powerW: a.wattage,
    quantity: a.quantity,
    totalPowerW: a.wattage * a.quantity,
    hours: a.hoursPerDay,
    energyWh: a.wattage * a.quantity * a.hoursPerDay,
  }));
  const loadTotals =
    loadRows.length > 0
      ? {
          powerW: loadRows.reduce((s, r) => s + r.totalPowerW, 0),
          energyWh: loadRows.reduce((s, r) => s + r.energyWh, 0),
        }
      : null;

  const pdf = await renderToBuffer(
    buildProposalPdf({
      installer: proposal.installer,
      logo: await fetchLogo(proposal.installer.logoUrl),
      customerName: proposal.lead.customerName,
      createdAt: proposal.createdAt,
      validUntil: proposal.validUntil,
      customMessage: proposal.customMessage,
      systemLabel: systemLabel(result),
      recommendation: recommendation(result),
      loadRows,
      loadTotals,
      items: proposal.items,
      totalKobo: proposal.totalKobo,
    }),
  );

  const filename = `proposal-${proposal.lead.customerName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  });
}

// "5 kVA Solar Installation" — prefers the selected generator or inverter,
// falls back to the sizing requirement, degrades gracefully for old leads.
function systemLabel(result: LeadResultSnapshot): string {
  const kva =
    result.generator?.capacityKva ??
    result.inverter?.capacityKva ??
    result.requirements?.inverterKva;
  return kva ? `${kva} kVA Solar Installation` : 'Solar Installation';
}

function recommendation(result: LeadResultSnapshot): string | null {
  const parts: string[] = [];
  if (result.generator?.capacityKva) {
    parts.push(
      `${result.generator.capacityKva}kVA/${result.generator.storageKwh ?? '?'}kWh all-in-one solar generator`,
    );
  } else {
    const inv = result.inverter?.capacityKva ?? result.requirements?.inverterKva;
    if (inv) parts.push(`${inv}kVA inverter`);
    const bat =
      result.batteries?.totalCapacityKwh ?? result.requirements?.batteryBankKwh;
    if (bat) parts.push(`${bat}kWh battery system`);
  }
  const pan = result.panels?.totalKwp ?? result.requirements?.panelArrayKwp;
  if (pan) parts.push(`${pan}kWp solar panels`);
  return parts.length > 0 ? parts.join(', ') : null;
}

// react-pdf can only embed PNG/JPG. Pre-fetch so a broken or unsupported logo
// (e.g. SVG) degrades to a text-only header instead of failing the render.
async function fetchLogo(
  url: string | null,
): Promise<{ data: Buffer; format: 'png' | 'jpg' } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? '';
    const format = ct.includes('png')
      ? ('png' as const)
      : ct.includes('jpeg') || ct.includes('jpg')
        ? ('jpg' as const)
        : null;
    if (!format) return null;
    return { data: Buffer.from(await res.arrayBuffer()), format };
  } catch {
    return null;
  }
}
