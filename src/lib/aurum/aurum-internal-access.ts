/**
 * Internal AURUM architecture documentation is reserved for the FADILAB
 * participant workspace. This is a UI visibility rule; repository privacy
 * and GitHub permissions remain the actual source-code security boundary.
 */
export function canViewAurumInternalArchitecture(participantName?: string | null): boolean {
  return String(participantName ?? "").trim().toLocaleUpperCase() === "FADILAB";
}
