import { AuriRateLimiter, clientIpFromHeaders } from "./auri-rate-limit.ts";

export type TransferAction = "prepare" | "finalize" | "info" | "claim" | "finish";

const limits: Record<TransferAction, AuriRateLimiter> = {
  prepare: new AuriRateLimiter({ limit: 5, windowMs: 15 * 60 * 1000, maxKeys: 10_000 }),
  finalize: new AuriRateLimiter({ limit: 8, windowMs: 15 * 60 * 1000, maxKeys: 10_000 }),
  info: new AuriRateLimiter({ limit: 30, windowMs: 10 * 60 * 1000, maxKeys: 10_000 }),
  claim: new AuriRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000, maxKeys: 10_000 }),
  finish: new AuriRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000, maxKeys: 10_000 }),
};

export function isTransferRateLimited(action: TransferAction, headers: Headers, now = Date.now()): boolean {
  return limits[action].isLimited(clientIpFromHeaders(headers), now);
}
