import { slugify } from './slug';

// Marketer link codes: the tail of /calc/<installer>/m/<code>, and the key
// that attributes a customer's lead to the marketer who sent them.
//
// Readable on purpose — a marketer pastes their link into WhatsApp, and
// "amaka-7k2p" reads as theirs where a random hash does not. The short suffix
// keeps two marketers named Amaka from colliding, and keeps codes from being
// trivially guessable by a rival marketer trying to claim someone's leads.

export const MEMBER_CODE_MAX = 40;
const CODE_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** First name, slugified and kept short; `agent` if nothing usable remains. */
export function memberCodeBase(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? '';
  return slugify(first).slice(0, 16) || 'agent';
}

/** `amaka-7k2p` from a name and a caller-supplied random suffix. */
export function memberCodeFrom(name: string, suffix: string): string {
  const tail = slugify(suffix).slice(0, 8);
  return tail ? `${memberCodeBase(name)}-${tail}` : memberCodeBase(name);
}

/**
 * Normalise a code arriving from a URL or a request body. Returns undefined
 * for anything malformed, so a mangled link degrades to an unattributed lead
 * rather than an error the customer sees.
 */
export function normalizeMemberCode(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const code = raw.trim().toLowerCase();
  if (!code || code.length > MEMBER_CODE_MAX || !CODE_SHAPE.test(code)) return undefined;
  return code;
}
