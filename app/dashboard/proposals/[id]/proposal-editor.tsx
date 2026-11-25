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

        <section className="card" aria-labelledby="lines">
          <h2 id="lines" className="section-title px-6 pt-6">
            Line items
          </h2>
          {/* Column headings once on wide screens; each row keeps its own labels on a phone. */}
          <div aria-hidden className="mt-3 hidden gap-3 border-t px-6 pb-2 pt-3 text-[13px] text-muted-foreground md:grid md:grid-cols-[minmax(0,1fr)_80px_144px_120px_44px]">
            <span>Item</span>
            <span>Qty</span>
            <span>Unit price (₦)</span>
            <span className="text-right">Amount</span>
            <span />
          </div>
          <ul className="mt-3 divide-y border-y md:mt-0">
            {items.map((item, i) => (
              <li key={i} className="flex flex-wrap items-end gap-3 px-6 py-4 md:grid md:items-center md:py-3 md:grid-cols-[minmax(0,1fr)_80px_144px_120px_44px]">
                <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-[13px] text-muted-foreground md:min-w-0">
                  <span className="md:sr-only">Item</span>
                  <input
                    value={item.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    className="input"
                    placeholder="e.g. Haisic 4.2kVA inverter"
                  />
                </label>
                <label className="flex w-20 flex-col gap-1 text-[13px] text-muted-foreground md:w-auto">
                  <span className="md:sr-only">Qty</span>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => update(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                    className="input tabular-nums"
                  />
                </label>
                <label className="flex w-36 flex-col gap-1 text-[13px] text-muted-foreground md:w-auto">
                  <span className="md:sr-only">Unit price (₦)</span>
                  <input
                    type="number"
                    min={0}
                    value={item.unitPriceNaira}
                    onChange={(e) => update(i, { unitPriceNaira: Math.max(0, Number(e.target.value) || 0) })}
                    className="input tabular-nums"
                  />
                </label>
                <div className="figure flex h-11 w-32 items-center justify-end text-[15px] md:w-auto">
                  ₦{(item.quantity * item.unitPriceNaira).toLocaleString('en-NG')}
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  disabled={items.length === 1}
                  aria-label={`Remove ${item.name || 'line'}`}
                  className="btn btn-ghost h-11 w-11 px-0 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-4 px-6 py-5">
            <button type="button" onClick={addRow} className="btn btn-secondary btn-sm">
              <Plus className="h-3.5 w-3.5" /> Add line
            </button>
            <div className="text-right">
              <div className="label">Total</div>
              <div className="figure text-[24px]">₦{totalNaira.toLocaleString('en-NG')}</div>
            </div>
          </div>
        </section>

        <section className="card p-6">
          <label htmlFor="customMessage" className="section-title">
            Message to the customer <span className="font-normal text-muted-foreground">· optional</span>
          </label>
          <textarea
            id="customMessage"
            name="customMessage"
            defaultValue={proposal.customMessage}
            rows={3}
            placeholder="Thanks for using our calculator — here's your formal quote…"
            className="input mt-3 min-h-[96px] leading-relaxed"
          />
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <SaveButton />
          {state.success && <span className="text-[13px] text-success">Saved</span>}
          {state.error && <span className="text-[13px] text-destructive">{state.error}</span>}
        </div>
      </form>

      <section className="card p-6" aria-labelledby="deliver">
        <h2 id="deliver" className="section-title">
          Send it
        </h2>
        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
          Save your changes first. Sending marks the proposal as sent, moves the lead
          along, and emails {proposal.customerEmail} a link when email is set up.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <form action={sendProposalAction}>
            <input type="hidden" name="id" value={proposal.id} />
            <SendButton alreadySent={proposal.status !== 'DRAFT'} />
          </form>
          <a
            href={`/api/proposals/${proposal.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            <Download className="h-4 w-4" /> Download PDF
          </a>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-secondary py-1.5 pl-3.5 pr-1.5">
          <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">{publicUrl}</span>
          <CopyLink url={publicUrl} />
        </div>
      </section>
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-secondary">
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
      className="btn btn-primary"
    >
      <Send className="h-4 w-4" />
      {pending ? 'Sending…' : alreadySent ? 'Resend to customer' : 'Send to customer'}
    </button>
  );
}
