import { describe, expect, test } from "bun:test";
import { AuriRateLimiter, clientIpFromHeaders } from "../supabase/functions/_shared/auri-rate-limit";

describe("AURI public rate limiter", () => {
  test("permits 15 requests and limits the 16th within the 10-minute window", () => {
    const limiter = new AuriRateLimiter();
    const now = 1_000;
    for (let request = 1; request <= 15; request += 1) {
      expect(limiter.isLimited("192.0.2.10", now)).toBe(false);
    }
    expect(limiter.isLimited("192.0.2.10", now)).toBe(true);
  });

  test("uses separate buckets for different clients", () => {
    const limiter = new AuriRateLimiter({ limit: 1 });
    expect(limiter.isLimited("client-a", 100)).toBe(false);
    expect(limiter.isLimited("client-a", 100)).toBe(true);
    expect(limiter.isLimited("client-b", 100)).toBe(false);
  });

  test("resets the bucket after the configured window", () => {
    const limiter = new AuriRateLimiter({ limit: 1, windowMs: 500 });
    expect(limiter.isLimited("client-a", 100)).toBe(false);
    expect(limiter.isLimited("client-a", 100)).toBe(true);
    expect(limiter.isLimited("client-a", 600)).toBe(false);
  });

  test("removes expired buckets and bounds memory by evicting the oldest", () => {
    const limiter = new AuriRateLimiter({ limit: 2, windowMs: 100, maxKeys: 2 });
    limiter.isLimited("first", 0);
    limiter.isLimited("second", 10);
    expect(limiter.size).toBe(2);
    limiter.isLimited("third", 20);
    expect(limiter.size).toBe(2);
    // The earliest-expiring bucket was evicted, so it starts a fresh bucket.
    expect(limiter.isLimited("first", 21)).toBe(false);
    expect(limiter.size).toBe(2);
    // Expired entries are cleaned on the next request.
    limiter.isLimited("new", 200);
    expect(limiter.size).toBe(1);
  });

  test("prefers the Cloudflare client IP, then real IP, then forwarded IP", () => {
    expect(clientIpFromHeaders(new Headers({
      "cf-connecting-ip": "203.0.113.9",
      "x-real-ip": "203.0.113.10",
      "x-forwarded-for": "203.0.113.11, 10.0.0.1",
    }))).toBe("203.0.113.9");
    expect(clientIpFromHeaders(new Headers({ "x-real-ip": "203.0.113.10" }))).toBe("203.0.113.10");
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "203.0.113.11, 10.0.0.1" }))).toBe("203.0.113.11");
  });

  test("ignores malformed or excessively long IP header values and falls back", () => {
    const malformedHeaders = {
      get(name: string) {
        if (name === "cf-connecting-ip") return "bad\r\nvalue";
        if (name === "x-real-ip") return "x".repeat(81);
        return null;
      },
    } as Headers;
    expect(clientIpFromHeaders(malformedHeaders)).toBe("unknown");
  });
});
