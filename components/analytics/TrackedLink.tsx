'use client';

import { track, type ClientEvent } from '@/lib/analytics';

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  event: ClientEvent;
  eventProps?: Record<string, string | number | boolean | null | undefined>;
};

// A plain <a> that records a product event when it's followed. For links on
// server-rendered pages (share on WhatsApp, the proposal's PDF, a storefront
// enquiry) that can't carry an onClick themselves.
export function TrackedLink({ event, eventProps, onClick, children, ...rest }: Props) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        track(event, eventProps);
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}
