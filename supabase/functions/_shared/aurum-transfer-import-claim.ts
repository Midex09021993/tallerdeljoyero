export const TRANSFER_IMPORT_CLAIM_TIMEOUT_MS = 30 * 60 * 1000;

export function isTransferImportClaimRecoverable(claimedAt: unknown, now = Date.now()): boolean {
  if (typeof claimedAt !== "string") return false;
  const timestamp = Date.parse(claimedAt);
  return Number.isFinite(timestamp) && now - timestamp >= TRANSFER_IMPORT_CLAIM_TIMEOUT_MS;
}
