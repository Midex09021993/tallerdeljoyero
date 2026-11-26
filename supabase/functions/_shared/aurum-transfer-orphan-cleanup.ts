export const ORPHAN_UPLOAD_RETENTION_MS = 48 * 60 * 60 * 1000;
export const MAX_ORPHAN_FOLDERS_PER_SWEEP = 8;

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function isTransferTokenFolder(name: unknown): name is string {
  return typeof name === "string" && TOKEN_PATTERN.test(name);
}

export function isStaleUploadObject(
  createdAt: unknown,
  updatedAt: unknown,
  now = Date.now(),
  retentionMs = ORPHAN_UPLOAD_RETENTION_MS,
): boolean {
  const timestamp = typeof updatedAt === "string" && updatedAt
    ? Date.parse(updatedAt)
    : typeof createdAt === "string" && createdAt
    ? Date.parse(createdAt)
    : NaN;
  if (!Number.isFinite(timestamp)) return false;
  return now - timestamp >= retentionMs;
}

export function staleUploadPaths(
  token: string,
  objects: Array<{ name?: unknown; created_at?: unknown; updated_at?: unknown }>,
  now = Date.now(),
): string[] {
  if (!isTransferTokenFolder(token)) return [];
  return objects
    .filter((object) => typeof object.name === "string" && object.name.length > 0 && !object.name.includes("/") &&
      isStaleUploadObject(object.created_at, object.updated_at, now))
    .map((object) => token + "/" + String(object.name));
}

export const TRANSFER_FILE_CLEANUP_WINDOW_MS = 6 * 60 * 60 * 1000;

export function isTransferFileCleanupDue(
  status: unknown,
  expiresAt: unknown,
  consumedAt: unknown,
  now = Date.now(),
): boolean {
  if (status === "expired") return true;
  if ((status === "available" || status === "processing") && typeof expiresAt === "string") {
    const expiry = Date.parse(expiresAt);
    return Number.isFinite(expiry) && expiry <= now;
  }
  if (status === "consumed" && typeof consumedAt === "string") {
    const consumed = Date.parse(consumedAt);
    return Number.isFinite(consumed) && now - consumed >= TRANSFER_FILE_CLEANUP_WINDOW_MS;
  }
  return false;
}
