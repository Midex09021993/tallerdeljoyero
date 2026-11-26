import { describe, expect, test } from "bun:test";
import { isTransferRateLimited } from "../supabase/functions/_shared/aurum-transfer-rate-limit";

describe("AURUM Transfer public rate limits", () => {
  const headers = new Headers({ "cf-connecting-ip": "198.51.100.25" });

  test("limits prepare requests to five per 15-minute window", () => {
    for (let i = 0; i < 5; i += 1) expect(isTransferRateLimited("prepare", headers, 1000)).toBe(false);
    expect(isTransferRateLimited("prepare", headers, 1000)).toBe(true);
    expect(isTransferRateLimited("prepare", headers, 901_001)).toBe(false);
  });

  test("limits finalize independently from prepare", () => {
    for (let i = 0; i < 8; i += 1) expect(isTransferRateLimited("finalize", headers, 1000)).toBe(false);
    expect(isTransferRateLimited("finalize", headers, 1000)).toBe(true);
    expect(isTransferRateLimited("prepare", headers, 1000)).toBe(false);
  });

  test("uses separate client buckets", () => {
    for (let i = 0; i < 5; i += 1) isTransferRateLimited("prepare", headers, 1000);
    expect(isTransferRateLimited("prepare", new Headers({ "cf-connecting-ip": "198.51.100.26" }), 1000)).toBe(false);
  });

  test("applies public transfer status and claim budgets", () => {
    for (let i = 0; i < 30; i += 1) expect(isTransferRateLimited("info", headers, 1000)).toBe(false);
    expect(isTransferRateLimited("info", headers, 1000)).toBe(true);
    for (let i = 0; i < 5; i += 1) expect(isTransferRateLimited("claim", headers, 1000)).toBe(false);
    expect(isTransferRateLimited("claim", headers, 1000)).toBe(true);
  });
});
