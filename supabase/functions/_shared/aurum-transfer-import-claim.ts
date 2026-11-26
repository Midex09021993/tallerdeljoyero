export const TRANSFER_IMPORT_CLAIM_TIMEOUT_MS = 30 * 60 * 1000;

export function isTransferImportClaimRecoverable(importedAt: unknown, importedBy: unknown, now = Date.now()): boolean {
  if (importedBy !== null && importedBy !== undefined) return false;
  if (typeof importedAt !== "string") return false;
  const claimedAt = Date.parse(importedAt);
  return Number.isFinite(claimedAt) && now - claimedAt >= TRANSFER_IMPORT_CLAIM_TIMEOUT_MS;
}
