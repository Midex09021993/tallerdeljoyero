import { describe, expect, test } from "bun:test";
import {
  isTransferTokenFolder,
  isStaleUploadObject,
  staleUploadPaths,
  ORPHAN_UPLOAD_RETENTION_MS,
} from "../supabase/functions/_shared/aurum-transfer-orphan-cleanup";

const validToken = "A".repeat(43);
const now = 2_000_000_000_000;

describe("AURUM Transfer orphan upload cleanup", () => {
  test("recognizes only token-shaped folder names", () => {
    expect(isTransferTokenFolder(validToken)).toBe(true);
    expect(isTransferTokenFolder("short")).toBe(false);
    expect(isTransferTokenFolder("../" + validToken)).toBe(false);
    expect(isTransferTokenFolder(validToken + "/nested")).toBe(false);
  });

  test("requires the full 48-hour retention window", () => {
    const old = new Date(now - ORPHAN_UPLOAD_RETENTION_MS - 1).toISOString();
    const boundary = new Date(now - ORPHAN_UPLOAD_RETENTION_MS).toISOString();
    const recent = new Date(now - ORPHAN_UPLOAD_RETENTION_MS + 1).toISOString();
    expect(isStaleUploadObject(old, null, now)).toBe(true);
    expect(isStaleUploadObject(boundary, null, now)).toBe(true);
    expect(isStaleUploadObject(recent, null, now)).toBe(false);
  });

  test("uses updated timestamp when present and fails safe without timestamps", () => {
    const stale = new Date(now - ORPHAN_UPLOAD_RETENTION_MS - 1000).toISOString();
    const fresh = new Date(now - 1000).toISOString();
    expect(isStaleUploadObject(stale, fresh, now)).toBe(false);
    expect(isStaleUploadObject(undefined, undefined, now)).toBe(false);
    expect(isStaleUploadObject("not-a-date", null, now)).toBe(false);
  });

  test("only returns stale flat object paths within a valid token folder", () => {
    const stale = new Date(now - ORPHAN_UPLOAD_RETENTION_MS - 1000).toISOString();
    const fresh = new Date(now - 1000).toISOString();
    expect(staleUploadPaths(validToken, [
      { name: "old-file.glb", created_at: stale },
      { name: "fresh-file.glb", created_at: fresh },
      { name: "../unsafe", created_at: stale },
      { name: "", created_at: stale },
    ], now)).toEqual([validToken + "/old-file.glb"]);
    expect(staleUploadPaths("invalid-token", [{ name: "old-file", created_at: stale }], now)).toEqual([]);
  });
});
