export type AurumLayerCategory = "metal" | "gema" | "otro";

export interface AurumLayerIdentityInput {
  layerId?: unknown;
  layerIndex?: unknown;
  layerName?: unknown;
  layerColor?: unknown;
  category?: unknown;
  existingKey?: unknown;
}

/**
 * Canonical identity for a source CAD layer. IDs are strongest, then the
 * source layer index, then a conservative name+color+category fallback.
 * Category alone is never a layer identity.
 */
export function resolveAurumLayerKey(input: AurumLayerIdentityInput): string | undefined {
  const id = input.layerId;
  if (id !== null && id !== undefined && String(id).trim() !== "") {
    return "rhino-id:" + String(id).trim();
  }

  const rawIndex = input.layerIndex;
  const index = rawIndex === null || rawIndex === undefined || rawIndex === "" ? -1 : Number(rawIndex);
  if (Number.isInteger(index) && index >= 0) return "rhino-index:" + index;

  const existing = String(input.existingKey ?? "").trim();
  if (existing) return existing;

  const name = String(input.layerName ?? "").trim().toLocaleLowerCase();
  const color = String(input.layerColor ?? "").trim().toLowerCase();
  const category = String(input.category ?? "otro").trim().toLowerCase();
  if (!name) return undefined;
  return "rhino-layer:" + encodeURIComponent(name) + "|color:" + (color || "unknown") + "|category:" + category;
}

export function normalizeAurumLayerName(value: unknown): string {
  return String(value ?? "").trim().toLocaleLowerCase();
}
