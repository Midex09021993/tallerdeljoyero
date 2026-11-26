import { describe, expect, test } from "bun:test";
import { isTransferImportClaimRecoverable, TRANSFER_IMPORT_CLAIM_TIMEOUT_MS } from "../supabase/functions/_shared/aurum-transfer-import-claim";

const now = 2_000_000_000_000;

describe("AURUM Transfer import claim recovery", () => {
  test("recovers only reservations older than the 30-minute timeout", () => {
    const old = new Date(now - TRANSFER_IMPORT_CLAIM_TIMEOUT_MS - 1).toISOString();
    const boundary = new Date(now - TRANSFER_IMPORT_CLAIM_TIMEOUT_MS).toISOString();
    const fresh = new Date(now - TRANSFER_IMPORT_CLAIM_TIMEOUT_MS + 1).toISOString();
    expect(isTransferImportClaimRecoverable(old, null, now)).toBe(true);
    expect(isTransferImportClaimRecoverable(boundary, null, now)).toBe(true);
    expect(isTransferImportClaimRecoverable(fresh, null, now)).toBe(false);
  });

  test("never reclaims completed imports or invalid timestamps", () => {
    const old = new Date(now - TRANSFER_IMPORT_CLAIM_TIMEOUT_MS * 2).toISOString();
    expect(isTransferImportClaimRecoverable(old, "user-a", now)).toBe(false);
    expect(isTransferImportClaimRecoverable("invalid-date", null, now)).toBe(false);
    expect(isTransferImportClaimRecoverable(null, null, now)).toBe(false);
  });
});
