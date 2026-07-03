import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText, Mail, Phone } from 'lucide-react';
import { formatKobo } from '@inverta/shared';
import { requireOnboardedInstaller } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  LEAD_STATUS_LABELS,
  parseInputSnapshot,
  parseResultSnapshot,
  systemSummary,
} from '@/lib/lead-utils';
import { updateLeadStatusAction } from '../actions';
import { createProposalFromLeadAction } from '../../proposals/actions';
import { StatusBadge } from '../status-badge';
import { NotesForm } from './notes-form';

export const metadata = { title: 'Lead · Inverta' };

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { installer } = await requireOnboardedInstaller();

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, installerId: installer.id },
    include: {
      proposals: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!lead) notFound();

  // First open flips NEW → VIEWED so the inbox reflects what's been triaged.
  if (lead.status === 'NEW') {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'VIEWED' },
    });
    lead.status = 'VIEWED';
  }

  const input = parseInputSnapshot(lead.inputSnapshot);
  const result = parseResultSnapshot(lead.resultSnapshot);

  return (
    <div className="container max-w-4xl py-10">
      <Link
        href="/dashboard/leads"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All leads
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{lead.customerName}</h1>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <a href={`mailto:${lead.customerEmail}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
              <Mail className="h-3.5 w-3.5" /> {lead.customerEmail}
            </a>
            <a href={`tel:${lead.customerPhone}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
              <Phone className="h-3.5 w-3.5" /> {lead.customerPhone}
            </a>
            <span>
              Submitted{' '}
              {lead.createdAt.toLocaleDateString('en-NG', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            {input.referralSource && <span>Heard via: {input.referralSource}</span>}
          </div>
        </div>
        <StatusBadge status={lead.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {/* System summary */}
          <section className="rounded-xl border bg-card/80 p-5 backdrop-blur">
            <h2 className="font-semibold">Calculated system</h2>
            <div className="mt-2 font-mono text-lg orange-text">{systemSummary(result)}</div>
            <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              {result.totalLoadW != null && (
                <div>Connected load: <span className="font-mono text-foreground">{result.totalLoadW.toLocaleString()} W</span></div>
              )}
              {result.dailyEnergyWh != null && (
                <div>Daily energy: <span className="font-mono text-foreground">{(result.dailyEnergyWh / 1000).toFixed(1)} kWh</span></div>
              )}
              {result.pricing?.totalKobo != null && (
                <div>Quoted total: <span className="font-mono text-foreground">{formatKobo(result.pricing.totalKobo)}</span></div>
              )}
              {result.catalogComplete === false && (
                <div className="text-accent">Sizing only — catalog was incomplete at submission</div>
              )}
            </dl>
          </section>

          {/* Appliances */}
          {input.appliances && input.appliances.length > 0 && (
            <section className="rounded-xl border bg-card/80 p-5 backdrop-blur">
              <h2 className="mb-3 font-semibold">Appliances selected</h2>
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-1.5 font-medium">Appliance</th>
                    <th className="py-1.5 text-right font-medium">Qty</th>
                    <th className="py-1.5 text-right font-medium">Watts</th>
                    <th className="py-1.5 text-right font-medium">Hrs/day</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {input.appliances.map((a, i) => (
                    <tr key={i}>
                      <td className="py-1.5">{a.name}</td>
                      <td className="py-1.5 text-right font-mono">{a.quantity}</td>
                      <td className="py-1.5 text-right font-mono">{a.wattage}</td>
                      <td className="py-1.5 text-right font-mono">{a.hoursPerDay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Spending context */}
          {(input.monthlyElectricityBillNaira != null ||
            input.monthlyFuelCostNaira != null ||
            input.generatorCapacityKva != null) && (
            <section className="rounded-xl border bg-card/80 p-5 backdrop-blur">
              <h2 className="mb-3 font-semibold">Current spending</h2>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                {input.monthlyElectricityBillNaira != null && (
                  <div className="text-muted-foreground">
                    Electricity: <span className="font-mono text-foreground">₦{input.monthlyElectricityBillNaira.toLocaleString()}/mo</span>
                  </div>
                )}
                {input.monthlyFuelCostNaira != null && (
                  <div className="text-muted-foreground">
                    Generator fuel: <span className="font-mono text-foreground">₦{input.monthlyFuelCostNaira.toLocaleString()}/mo</span>
                  </div>
                )}
                {input.generatorCapacityKva != null && (
                  <div className="text-muted-foreground">
                    Generator: <span className="font-mono text-foreground">{input.generatorCapacityKva} kVA</span>
                  </div>
                )}
                {input.generatorHoursPerDay != null && (
                  <div className="text-muted-foreground">
                    Gen hours: <span className="font-mono text-foreground">{input.generatorHoursPerDay} h/day</span>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* Notes */}
          <section className="rounded-xl border bg-card/80 p-5 backdrop-blur">
            <h2 className="mb-3 font-semibold">Notes</h2>
            <NotesForm leadId={lead.id} initialNotes={lead.notes ?? ''} />
          </section>
        </div>

        <div className="space-y-6">
          {/* Status */}
          <section className="rounded-xl border bg-card/80 p-5 backdrop-blur">
            <h2 className="mb-3 font-semibold">Status</h2>
            <form action={updateLeadStatusAction} className="space-y-3">
              <input type="hidden" name="id" value={lead.id} />
              <select name="status" defaultValue={lead.status} className="input">
                {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="inline-flex h-9 w-full items-center justify-center rounded-md border bg-background/40 text-sm font-medium backdrop-blur transition-colors hover:bg-secondary"
              >
                Update status
              </button>
            </form>
          </section>

          {/* Proposals */}
          <section className="rounded-xl border bg-card/80 p-5 backdrop-blur">
            <h2 className="mb-3 font-semibold">Proposals</h2>
            {lead.proposals.length > 0 && (
              <div className="mb-4 space-y-2">
                {lead.proposals.map((p) => (
                  <Link
                    key={p.id}
                    href={`/dashboard/proposals/${p.id}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-secondary/40"
                  >
                    <span className="font-mono">{formatKobo(p.totalKobo)}</span>
                    <span className="text-xs text-muted-foreground">{p.status}</span>
                  </Link>
                ))}
              </div>
            )}
            <form action={createProposalFromLeadAction}>
              <input type="hidden" name="leadId" value={lead.id} />
              <button
                type="submit"
                className="signup-gradient-hover glass-button inline-flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-medium text-foreground transition-all duration-200"
              >
                <FileText className="h-4 w-4" />
                {lead.proposals.length > 0 ? 'New proposal' : 'Create proposal'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
