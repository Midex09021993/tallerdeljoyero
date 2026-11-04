export const AURUM_INTELLIGENCE_OWNER_UID = "5d80fd40-b059-42e9-ad57-28ac5cf9899e";

export function puedeAccederAurumIntelligence(userId: string | null | undefined): boolean {
  return userId === AURUM_INTELLIGENCE_OWNER_UID;
}
