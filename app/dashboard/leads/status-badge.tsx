import { cn } from '@/lib/utils';
import { LEAD_STATUS_LABELS } from '@/lib/lead-utils';

// The dot carries the state; the word stays in ink so it reads at full
// contrast on both themes. Orange is reserved for New — the one stage that
// asks the owner to act.
const DOT: Record<string, string> = {
  NEW: 'bg-primary',
  VIEWED: 'bg-muted-foreground/60',
  PROPOSAL_SENT: 'bg-sky-500',
  CONVERTED: 'bg-success',
  LOST: 'bg-destructive/70',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn('chip shrink-0 bg-card text-foreground', className)}>
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', DOT[status] ?? DOT.VIEWED)} />
      {LEAD_STATUS_LABELS[status] ?? status}
    </span>
  );
}
