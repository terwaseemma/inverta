// WhatsApp deep link with a pre-written message. Most links in this market
// travel over WhatsApp, so invites and marketer links offer it first.
// Plain module (no 'use client') so server and client components share it.
export function whatsappHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
