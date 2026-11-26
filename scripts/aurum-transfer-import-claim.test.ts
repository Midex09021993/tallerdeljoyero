import { describe, expect, test } from "bun:test";
import { isTransferImportClaimRecoverable, TRANSFER_IMPORT_CLAIM_TIMEOUT_MS } from "../supabase/functions/_shared/aurum-transfer-import-claim";

const now = 2_000_000_000_000;

describe("AURUM Transfer import claim recovery", () => {
  test("recovers only reservations older than the 30-minute timeout", () => {
    const old = new Date(now - TRANSFER_IMPORT_CLAIM_TIMEOUT_MS - 1).toISOString();
    const boundary = new Date(now - TRANSFER_IMPORT_CLAIM_TIMEOUT_MS).toISOString();
    const fresh = new Date(now - TRANSFER_IMPORT_CLAIM_TIMEOUT_MS + 1).toISOString();
    expect(isTransferImportClaimRecoverable(old, now)).toBe(true);
    expect(isTransferImportClaimRecoverable(boundary, now)).toBe(true);
    expect(isTransferImportClaimRecoverable(fresh, now)).toBe(false);
  });

  test("fails safe on invalid or missing claim timestamps", () => {
    expect(isTransferImportClaimRecoverable("invalid-date", now)).toBe(false);
    expect(isTransferImportClaimRecoverable(null, now)).toBe(false);
  });
});
