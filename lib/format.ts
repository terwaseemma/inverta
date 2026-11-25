// Display formatting shared by the dashboard. Money is stored in kobo
// everywhere; these only ever run at the display edge.

const TZ = 'Africa/Lagos';

/** ₦4.49M, ₦870K, ₦950 — for figures where the exact kobo is noise. */
export function compactNaira(kobo: number): string {
  const naira = kobo / 100;
  if (naira >= 1_000_000) return `₦${trim(naira / 1_000_000)}M`;
  if (naira >= 1_000) return `₦${trim(naira / 1_000)}K`;
  return `₦${Math.round(naira).toLocaleString('en-NG')}`;
}

function trim(n: number): string {
  // 2 significant decimals below 10, 1 below 100, none above: 4.49M, 12.5M, 870K.
  const d = n < 10 ? 2 : n < 100 ? 1 : 0;
  return Number(n.toFixed(d)).toString();
}

/** YYYY-MM-DD in Lagos time, for bucketing by the installer's own day. */
export function lagosDayKey(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}

/** The hour in Lagos, 0–23. */
export function lagosHour(d = new Date()): number {
  return Number(d.toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }));
}

/** "12 Aug" */
export function shortDate(d: Date): string {
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', timeZone: TZ });
}

/** "Just now", "3h ago", "Yesterday", "12 Aug" — for activity feeds. */
export function relativeTime(d: Date, now = new Date()): string {
  const mins = Math.round((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  if (lagosDayKey(new Date(now.getTime() - 86400000)) === lagosDayKey(d)) return 'Yesterday';
  return shortDate(d);
}
