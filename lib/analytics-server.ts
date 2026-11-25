import 'server-only';

// Product events sent from the server, where the thing actually happened
// (a lead saved, a proposal sent), so they're counted once, only on success,
// and ad-blockers can't drop them. PostHog's capture API over fetch: no SDK.
//
// distinct_id is the installer's id, the same id the browser identifies the
// signed-in owner with (PostHogIdentify), so server and browser events land
// on one person. Never put a customer's name, phone or email in properties.
//
// With no key set (local dev) this does nothing. It never throws and gives
// up after a short wait, so analytics can't slow down or break an action.

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com').replace(/\/$/, '');

export type ServerEvent =
  // accounts
  | 'installer_signed_up'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'account_deleted'
  // leads and proposals
  | 'lead_created'
  | 'lead_status_changed'
  | 'proposal_created'
  | 'proposal_sent'
  | 'proposal_viewed'
  | 'proposal_deleted'
  // catalog and store
  | 'catalog_item_saved'
  | 'catalog_item_deleted'
  | 'starter_catalog_loaded'
  | 'platform_product_imported'
  | 'store_product_saved'
  | 'store_product_deleted'
  // settings
  | 'settings_saved'
  | 'calculator_link_saved'
  // team
  | 'member_invited'
  | 'member_joined'
  | 'member_access_changed'
  | 'invite_revoked';

export async function captureServer(
  event: ServerEvent,
  distinctId: string,
  properties: Record<string, string | number | boolean | null | undefined> = {},
): Promise<void> {
  if (!KEY || !distinctId) return;
  try {
    await fetch(`${HOST}/i/v0/e/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: KEY,
        event,
        distinct_id: distinctId,
        timestamp: new Date().toISOString(),
        properties: { ...properties, $lib: 'inverta-server' },
      }),
      signal: AbortSignal.timeout(1500),
      cache: 'no-store',
    });
  } catch {
    // Analytics is best-effort.
  }
}

/** A naira amount from kobo, rounded to the nearest thousand: a band, not a quote. */
export function nairaBand(kobo: number | null | undefined): number | null {
  if (!kobo) return null;
  return Math.round(kobo / 100 / 1000) * 1000;
}
