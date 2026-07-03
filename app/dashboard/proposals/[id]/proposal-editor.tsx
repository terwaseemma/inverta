'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Download, Plus, Send, Trash2 } from 'lucide-react';
import { CopyLink } from '../../copy-button';
import { cn } from '@/lib/utils';
import {
  sendProposalAction,
  updateProposalAction,
  type ProposalFormState,
} from '../actions';

interface EditableItem {
  name: string;
  description: string;
  quantity: number;
  unitPriceNaira: number;
}

export function ProposalEditor({
  proposal,
  appUrl,
}: {
  proposal: {
    id: string;
    status: string;
    customMessage: string;
    leadId: string;
    customerEmail: string;
    items: EditableItem[];
  };
  appUrl: string;
}) {
  const [items, setItems] = useState<EditableItem[]>(proposal.items);
  const [rawState, formAction] = useFormState(updateProposalAction, {} as ProposalFormState);
  // useFormState can briefly resolve undefined when a submit races hydration
  // (Next 14.2 quirk) — normalize so render never dereferences undefined.
  const state = rawState ?? ({} as ProposalFormState);

  const totalNaira = items.reduce((s, i) => s + i.quantity * i.unitPriceNaira, 0);
  const publicUrl = `${appUrl}/proposal/${proposal.id}`;

  function update(index: number, patch: Partial<EditableItem>) {
    setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addRow() {
    setItems([...items, { name: '', description: '', quantity: 1, unitPriceNaira: 0 }]);
  }

  function removeRow(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="id" value={proposal.id} />
        <input
          type="hidden"
          name="itemsJson"
          value={JSON.stringify(
            items.map((i) => ({
              name: i.name,
              description: i.description || undefined,
              quantity: i.quantity,
              unitPriceNaira: i.unitPriceNaira,
            })),
          )}
        />

        <section className="rounded-xl border bg-card/80 p-5 backdrop-blur">
          <h2 className="mb-4 font-semibold">Line items</h2>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2 rounded-md border p-3">
                <label className="min-w-[160px] flex-1 space-y-1 text-xs text-muted-foreground">
                  Item
                  <input
                    value={item.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    className="input h-9"
                    placeholder="e.g. Luminous 5kVA inverter"
                  />
                </label>
                <label className="w-20 space-y-1 text-xs text-muted-foreground">
                  Qty
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      update(i, { quantity: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="input h-9"
                  />
                </label>
                <label className="w-36 space-y-1 text-xs text-muted-foreground">
                  Unit price (₦)
                  <input
                    type="number"
                    min={0}
                    value={item.unitPriceNaira}
                    onChange={(e) =>
                      update(i, { unitPriceNaira: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="input h-9"
                  />
                </label>
                <div className="w-32 pb-2 text-right font-mono text-sm">
                  ₦{(item.quantity * item.unitPriceNaira).toLocaleString('en-NG')}
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  disabled={items.length === 1}
                  aria-label="Remove line"
                  className="mb-0.5 grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-background/40 px-3 text-sm font-medium backdrop-blur hover:bg-secondary"
            >
              <Plus className="h-3.5 w-3.5" /> Add line
            </button>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Total</div>
              <div className="font-mono text-xl font-semibold orange-text">
                ₦{totalNaira.toLocaleString('en-NG')}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card/80 p-5 backdrop-blur">
          <h2 className="mb-3 font-semibold">Message to customer (optional)</h2>
          <textarea
            name="customMessage"
            defaultValue={proposal.customMessage}
            rows={3}
            placeholder="Thanks for using our calculator — here's your formal quote…"
            className="input min-h-[80px] py-2"
          />
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <SaveButton />
          {state.success && <span className="text-xs text-primary">Saved ✓</span>}
          {state.error && <span className="text-xs text-destructive">{state.error}</span>}
        </div>
      </form>

      <section className="rounded-xl border border-primary/40 bg-primary/5 p-5 backdrop-blur">
        <h2 className="font-semibold">Deliver</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Save your changes first — sending marks the proposal as sent, updates the
          lead, and emails {proposal.customerEmail} a link when email is configured.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <form action={sendProposalAction}>
            <input type="hidden" name="id" value={proposal.id} />
            <SendButton alreadySent={proposal.status !== 'DRAFT'} />
          </form>
          <a
            href={`/api/proposals/${proposal.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-md border bg-background/40 px-4 text-sm font-medium backdrop-blur transition-colors hover:bg-secondary"
          >
            <Download className="h-4 w-4" /> Download PDF
          </a>
          <div className="flex items-center gap-2 rounded-md border bg-secondary/40 px-3 py-2 font-mono text-xs">
            <span className="max-w-[220px] truncate">{publicUrl}</span>
            <CopyLink url={publicUrl} />
          </div>
        </div>
      </section>
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="signup-gradient-hover glass-button inline-flex h-10 items-center rounded-md px-5 text-sm font-medium text-foreground transition-all duration-200 disabled:opacity-60"
    >
      {pending ? 'Saving…' : 'Save proposal'}
    </button>
  );
}

function SendButton({ alreadySent }: { alreadySent: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        'signup-gradient-hover glass-button inline-flex h-10 items-center gap-2 rounded-md px-5 text-sm font-medium text-foreground transition-all duration-200 disabled:opacity-60',
      )}
    >
      <Send className="h-4 w-4" />
      {pending ? 'Sending…' : alreadySent ? 'Resend to customer' : 'Send to customer'}
    </button>
  );
}
