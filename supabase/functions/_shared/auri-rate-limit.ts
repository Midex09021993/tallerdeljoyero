/**
 * Bounded, per-client rate limiter for the public AURI endpoint.
 * This is an in-memory guardrail; it is not a distributed quota.
 */
export type RateLimitBucket = { count: number; resetAt: number };

export function clientIpFromHeaders(headers: Headers): string {
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
  ];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && value.length <= 80 && !/[\r\n]/.test(value)) return value;
  }
  return "unknown";
}

export class AuriRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly maxKeys: number;

  constructor(options: { limit?: number; windowMs?: number; maxKeys?: number } = {}) {
    this.limit = options.limit ?? 15;
    this.windowMs = options.windowMs ?? 10 * 60 * 1000;
    this.maxKeys = options.maxKeys ?? 10_000;
  }

  isLimited(key: string, now = Date.now()): boolean {
    for (const [bucketKey, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(bucketKey);
    }

    const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) {
      if (this.buckets.size >= this.maxKeys) this.evictOldest();
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return false;
    }

    current.count += 1;
    return current.count > this.limit;
  }

  private evictOldest(): void {
    let oldestKey: string | undefined;
    let oldestReset = Number.POSITIVE_INFINITY;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt < oldestReset) {
        oldestKey = key;
        oldestReset = bucket.resetAt;
      }
    }
    if (oldestKey !== undefined) this.buckets.delete(oldestKey);
  }

  /** Exposed for deterministic tests and observability without exposing client keys. */
  get size(): number {
    return this.buckets.size;
  }
}

/** Shared, bounded limiter for public AURUM Transfer endpoints. */
export class TransferRateLimiter extends AuriRateLimiter {}
