import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, FileText, Mail, MessageCircle, Phone } from 'lucide-react';
import { formatKobo } from '@inverta/shared';
import { requireOnboardedInstaller } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  LEAD_STATUS_LABELS,
  parseInputSnapshot,
  parseResultSnapshot,
  systemSummary,
} from '@/lib/lead-utils';
import { PageHeader, PageShell } from '@/components/app/page';
import { updateLeadStatusAction } from '../actions';
import { createProposalFromLeadAction } from '../../proposals/actions';
import { StatusBadge } from '../status-badge';
import { NotesForm } from './notes-form';

export const metadata = { title: 'Lead · Inverta' };

const PROPOSAL_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  VIEWED: 'Opened',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
};

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const { installer } = await requireOnboardedInstaller();

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, installerId: installer.id },
    include: {
      proposals: { orderBy: { createdAt: 'desc' } },
      sourcedBy: { select: { id: true, name: true } },
    },
  });
  if (!lead) notFound();

  // First open flips NEW → VIEWED so the inbox reflects what's been triaged.
  if (lead.status === 'NEW') {
    await prisma.lead.update({ where: { id: lead.id }, data: { status: 'VIEWED' } });
    lead.status = 'VIEWED';
  }

  const input = parseInputSnapshot(lead.inputSnapshot);
  const result = parseResultSnapshot(lead.resultSnapshot);
  const waNumber = lead.customerPhone.replace(/[^\d]/g, '');
  const firstName = lead.customerName.split(' ')[0] ?? '';

  const hasSpend =
    input.monthlyElectricityBillNaira != null ||
    input.monthlyFuelCostNaira != null ||
    input.generatorCapacityKva != null;

  return (
    <PageShell>
      <PageHeader
        back={{ href: '/dashboard/leads', label: 'All leads' }}
        title={lead.customerName}
        lead={
          <>
            Requested a quote{' '}
            {lead.createdAt.toLocaleDateString('en-NG', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              timeZone: 'Africa/Lagos',
            })}
            {lead.sourcedBy && (
              <>
                {' · '}
                <Link href={`/dashboard/leads?member=${lead.sourcedBy.id}`} className="link">
                  brought in by {lead.sourcedBy.name}
                </Link>
              </>
            )}
            {input.referralSource && <> · heard via {input.referralSource}</>}
          </>
        }
        actions={<StatusBadge status={lead.status} className="h-8 px-3 text-sm" />}
      />

      {/* Reach the customer — the next thing an owner does with a lead. */}
      <div className="mb-4 flex flex-wrap gap-2">
        {waNumber && (
          <a
            href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
              `Hi ${firstName}, it's ${installer.businessName} — thanks for requesting a solar quote.`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        )}
        <a href={`tel:${lead.customerPhone}`} className="btn btn-secondary">
          <Phone className="h-4 w-4" /> {lead.customerPhone}
        </a>
        <a href={`mailto:${lead.customerEmail}`} className="btn btn-secondary">
          <Mail className="h-4 w-4" /> <span className="max-w-[220px] truncate">{lead.customerEmail}</span>
        </a>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] [&>*]:min-w-0">
        <div className="space-y-4">
          {/* The system the calculator sized */}
          <section className="card p-6" aria-labelledby="sized">
            <h2 id="sized" className="label">
              Calculated system
            </h2>
            <div className="figure mt-2 text-[24px] leading-tight">{systemSummary(result)}</div>
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {result.pricing?.totalKobo != null && (
                <Measure label="Quoted total" value={formatKobo(result.pricing.totalKobo)} />
              )}
              {result.totalLoadW != null && (
                <Measure label="Connected load" value={`${result.totalLoadW.toLocaleString()} W`} />
              )}
              {result.dailyEnergyWh != null && (
                <Measure label="Daily energy" value={`${(result.dailyEnergyWh / 1000).toFixed(1)} kWh`} />
              )}
              {input.backupHours != null && <Measure label="Backup asked for" value={`${input.backupHours} hours`} />}
            </dl>
            {result.catalogComplete === false && (
              <p className="mt-5 rounded-xl bg-secondary px-4 py-3 text-[15px]">
                Sizing only — your catalog was incomplete when they submitted, so they
                saw no price.
              </p>
            )}
          </section>

          {input.appliances && input.appliances.length > 0 && (
            <section className="card" aria-labelledby="appliances">
              <h2 id="appliances" className="section-title px-6 pt-6">
                Appliances
              </h2>
              <table className="mt-3 w-full text-[15px]">
                <thead className="text-left text-[13px] font-medium text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-6 py-2 font-medium">Appliance</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Watts</th>
                    <th className="px-6 py-2 text-right font-medium">Hours a day</th>
                  </tr>
                </thead>
                <tbody className="divide-y tabular-nums">
                  {input.appliances.map((a, i) => (
                    <tr key={i}>
                      <td className="px-6 py-2.5">{a.name}</td>
                      <td className="px-3 py-2.5 text-right">{a.quantity}</td>
                      <td className="px-3 py-2.5 text-right">{a.wattage}</td>
                      <td className="px-6 py-2.5 text-right">{a.hoursPerDay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="h-3" />
            </section>
          )}

          {hasSpend && (
            <section className="card p-6" aria-labelledby="spend">
              <h2 id="spend" className="section-title">
                What they spend today
              </h2>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {input.monthlyElectricityBillNaira != null && (
                  <Measure label="Electricity" value={`₦${input.monthlyElectricityBillNaira.toLocaleString()}/mo`} />
                )}
                {input.monthlyFuelCostNaira != null && (
                  <Measure label="Generator fuel" value={`₦${input.monthlyFuelCostNaira.toLocaleString()}/mo`} />
                )}
                {input.generatorCapacityKva != null && (
                  <Measure label="Generator" value={`${input.generatorCapacityKva} kVA`} />
                )}
                {input.generatorHoursPerDay != null && (
                  <Measure label="Runs" value={`${input.generatorHoursPerDay} h a day`} />
                )}
              </dl>
            </section>
          )}

          <section className="card p-6" aria-labelledby="notes">
            <h2 id="notes" className="section-title mb-3">
              Notes
            </h2>
            <NotesForm leadId={lead.id} initialNotes={lead.notes ?? ''} />
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card p-6" aria-labelledby="proposals">
            <h2 id="proposals" className="section-title">
              Proposal
            </h2>
            <p className="mt-1 text-[15px] text-muted-foreground">
              {lead.proposals.length > 0
                ? 'Open one to edit and send it.'
                : 'Starts from what the calculator sized, ready to adjust.'}
            </p>
            {lead.proposals.length > 0 && (
              <ul className="mt-4 space-y-2">
                {lead.proposals.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/dashboard/proposals/${p.id}`}
                      className="row-link flex items-center gap-3 rounded-xl border px-3.5 py-3"
                    >
                      <span className="figure flex-1 text-[15px]">{formatKobo(p.totalKobo)}</span>
                      <span className="text-[13px] text-muted-foreground">{PROPOSAL_LABEL[p.status] ?? p.status}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <form action={createProposalFromLeadAction} className="mt-4">
              <input type="hidden" name="leadId" value={lead.id} />
              <button type="submit" className="btn btn-primary w-full">
                <FileText className="h-4 w-4" />
                {lead.proposals.length > 0 ? 'New proposal' : 'Create proposal'}
              </button>
            </form>
          </section>

          <section className="card p-6" aria-labelledby="status">
            <h2 id="status" className="section-title">
              Status
            </h2>
            <form action={updateLeadStatusAction} className="mt-3 space-y-2">
              <input type="hidden" name="id" value={lead.id} />
              <label className="sr-only" htmlFor="status-select">
                Lead status
              </label>
              <select id="status-select" name="status" defaultValue={lead.status} className="input">
                {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-secondary w-full">
                Update status
              </button>
            </form>
          </section>
        </aside>
      </div>
    </PageShell>
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
