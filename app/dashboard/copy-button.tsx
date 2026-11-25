'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics';

/** Which link a copy was for, so analytics can tell them apart. */
export type LinkKind = 'calculator' | 'proposal' | 'marketer_link' | 'invite';

// Copies a URL. The glyph swaps to a check in place for 1.5 s, then returns;
// the label says what happened for screen readers too.
export function CopyLink({
  url,
  what,
  className,
}: {
  url: string;
  what: LinkKind;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      track('link_copied', { what });
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Link copied' : 'Copy link'}
      className={cn('btn btn-secondary btn-sm shrink-0', className)}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
