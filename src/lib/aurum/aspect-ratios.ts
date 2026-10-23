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
