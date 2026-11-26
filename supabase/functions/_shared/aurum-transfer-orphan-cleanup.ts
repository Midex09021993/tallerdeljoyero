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
