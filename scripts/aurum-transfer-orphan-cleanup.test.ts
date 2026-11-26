import { describe, expect, test } from "bun:test";
import {
  isTransferTokenFolder,
  isStaleUploadObject,
  staleUploadPaths,
  ORPHAN_UPLOAD_RETENTION_MS,
  isTransferFileCleanupDue,
  TRANSFER_FILE_CLEANUP_WINDOW_MS,
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

describe("AURUM Transfer registered file retention", () => {
  test("expires available and stuck processing transfers after their expiry", () => {
    const expired = new Date(now - 1000).toISOString();
    const future = new Date(now + 1000).toISOString();
    expect(isTransferFileCleanupDue("available", expired, null, now)).toBe(true);
    expect(isTransferFileCleanupDue("processing", expired, null, now)).toBe(true);
    expect(isTransferFileCleanupDue("available", future, null, now)).toBe(false);
    expect(isTransferFileCleanupDue("processing", null, null, now)).toBe(false);
  });

  test("keeps consumed transfer files for the six-hour import/download window", () => {
    const old = new Date(now - TRANSFER_FILE_CLEANUP_WINDOW_MS - 1).toISOString();
    const boundary = new Date(now - TRANSFER_FILE_CLEANUP_WINDOW_MS).toISOString();
    const fresh = new Date(now - TRANSFER_FILE_CLEANUP_WINDOW_MS + 1).toISOString();
    expect(isTransferFileCleanupDue("consumed", old, old, now)).toBe(true);
    expect(isTransferFileCleanupDue("consumed", boundary, boundary, now)).toBe(true);
    expect(isTransferFileCleanupDue("consumed", fresh, fresh, now)).toBe(false);
  });

  test("retries already-expired rows and fails safe on unknown status or dates", () => {
    expect(isTransferFileCleanupDue("expired", null, null, now)).toBe(true);
    expect(isTransferFileCleanupDue("unknown", now.toString(), null, now)).toBe(false);
    expect(isTransferFileCleanupDue("consumed", null, "invalid-date", now)).toBe(false);
  });
});
