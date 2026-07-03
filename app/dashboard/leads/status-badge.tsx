import { cn } from '@/lib/utils';
import { LEAD_STATUS_LABELS } from '@/lib/lead-utils';

const STYLES: Record<string, string> = {
  NEW: 'bg-primary/15 text-primary border-primary/30',
  VIEWED: 'bg-secondary text-secondary-foreground border-border',
  PROPOSAL_SENT: 'bg-accent/15 text-accent border-accent/30',
  CONVERTED: 'bg-green-500/15 text-green-500 border-green-500/30',
  LOST: 'bg-destructive/10 text-destructive border-destructive/30',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STYLES[status] ?? STYLES.VIEWED,
      )}
    >
      {LEAD_STATUS_LABELS[status] ?? status}
    </span>
  );
}
