// Per-IP sliding-window rate limiter.
// MVP uses an in-process Map. Before deploying multi-instance, swap in Redis
// (Upstash or self-hosted) — the interface below is intentionally small so
// only this file changes.

type Bucket = { timestamps: number[] };
const BUCKETS = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - opts.windowMs;

  let bucket = BUCKETS.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    BUCKETS.set(key, bucket);
  }

  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= opts.limit) {
    const oldest = bucket.timestamps[0]!;
    return { ok: false, remaining: 0, resetAt: oldest + opts.windowMs };
  }

  bucket.timestamps.push(now);
  return {
    ok: true,
    remaining: opts.limit - bucket.timestamps.length,
    resetAt: now + opts.windowMs,
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}
