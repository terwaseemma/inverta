import { cn } from '@/lib/utils';

export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  VIEWED: 'Opened',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
};

// Same dot system as the lead badge. Orange marks Opened: the customer is
// reading it right now, which is the moment to call.
const DOT: Record<string, string> = {
  DRAFT: 'bg-muted-foreground/50',
  SENT: 'bg-sky-500',
  VIEWED: 'bg-primary',
  ACCEPTED: 'bg-success',
  DECLINED: 'bg-destructive/70',
};

export function ProposalBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn('chip shrink-0 bg-card text-foreground', className)}>
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', DOT[status] ?? DOT.DRAFT)} />
      {PROPOSAL_STATUS_LABELS[status] ?? status}
    </span>
  );
}
