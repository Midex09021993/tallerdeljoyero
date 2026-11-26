import { describe, expect, test } from "bun:test";
import { isTransferImportRateLimited } from "../supabase/functions/_shared/aurum-transfer-import-rate-limit";

describe("AURUM Transfer authenticated import rate limit", () => {
  test("allows five imports per user in a 15-minute window and blocks the sixth", () => {
    const user = "user-a";
    for (let i = 0; i < 5; i++) expect(isTransferImportRateLimited(user, 1000)).toBe(false);
    expect(isTransferImportRateLimited(user, 1000)).toBe(true);
    expect(isTransferImportRateLimited(user, 901_001)).toBe(false);
  });

  test("isolates users and uses stable authenticated user keys", () => {
    for (let i = 0; i < 5; i++) isTransferImportRateLimited("user-a", 1000);
    expect(isTransferImportRateLimited("user-b", 1000)).toBe(false);
  });
});
