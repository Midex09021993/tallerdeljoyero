/**
 * Canonical aspect-ratio profiles shared by Aurum Render image and video export.
 * Keep the ratio, UI frame, and output presets defined in one place.
 */
export const AURUM_ASPECT_RATIOS = {
  "16:9": { ratio: 16 / 9, width: 3840, height: 2160, videoWidth: 1920, videoHeight: 1080, label: "Horizontal" },
  "1:1": { ratio: 1, width: 2400, height: 2400, videoWidth: 1080, videoHeight: 1080, label: "Cuadrado" },
  "4:5": { ratio: 4 / 5, width: 2400, height: 3000, videoWidth: 1080, videoHeight: 1350, label: "Catálogo vertical" },
  "9:16": { ratio: 9 / 16, width: 2160, height: 3840, videoWidth: 1080, videoHeight: 1920, label: "Historias / móvil" },
  "3:2": { ratio: 3 / 2, width: 3000, height: 2000, videoWidth: 1620, videoHeight: 1080, label: "Fotografía clásica" },
} as const;

export type AurumAspectRatioId = keyof typeof AURUM_ASPECT_RATIOS;

export function getAurumAspectRatio(id: AurumAspectRatioId): number {
  return AURUM_ASPECT_RATIOS[id].ratio;
}

export function getAurumAspectDimensions(
  id: AurumAspectRatioId,
  kind: "image" | "video",
): { width: number; height: number } {
  const profile = AURUM_ASPECT_RATIOS[id];
  return kind === "image"
    ? { width: profile.width, height: profile.height }
    : { width: profile.videoWidth, height: profile.videoHeight };
}

/**
 * Returns a contained frame for the selected ratio inside a viewport.
 * Image and video overlays must share this calculation so their visible
 * composition area is geometrically identical at the same aspect ratio.
 */
export function getAurumAspectFrameStyle(
  ratio: number,
  maxPercent = 88,
): { width: string; height: string; maxWidth: string; maxHeight: string; aspectRatio: string; boxSizing: "border-box" } {
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 16 / 9;
  const limit = Math.max(1, Math.min(100, maxPercent));
  // cqw/cqh are relative to the overlay's size-query container. Derive both
  // dimensions from the same limiting box so max-height cannot squash a wide
  // frame or max-width stretch a portrait frame. The result always keeps ratio.
  // Use one shared long-side measurement for every orientation. This makes
  // 16:9 and 9:16 exact rotations of the same frame (and likewise 4:5 / 5:4
  // equivalents), instead of independently fitting width and height to the
  // viewport and producing visibly different physical frame sizes.
  const longSide = `min(${limit}cqw, ${limit}cqh)`;
  const width = safeRatio >= 1
    ? longSide
    : `calc(${longSide} * ${safeRatio})`;
  return {
    width,
    height: "auto",
    maxWidth: "none",
    maxHeight: "none",
    aspectRatio: String(safeRatio),
    boxSizing: "border-box",
  };
}
