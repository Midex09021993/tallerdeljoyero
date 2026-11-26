import { AuriRateLimiter } from "./auri-rate-limit.ts";

/** In-memory per-user limiter; bounded and not a distributed quota. */
const importLimiter = new AuriRateLimiter({ limit: 5, windowMs: 15 * 60 * 1000, maxKeys: 10_000 });

export function isTransferImportRateLimited(userId: string, now = Date.now()): boolean {
  return importLimiter.isLimited(userId, now);
}
