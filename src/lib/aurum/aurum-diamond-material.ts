/**
 * AURUM's dedicated diamond-material entry point.
 *
 * This module owns diamond activation and versioned optical metadata. The
 * shader implementation remains in scintillation.ts for now; it is invoked
 * only after this marker is attached by the diamond material pipeline.
 *
 * Important: this is an AURUM implementation inspired by the supplied
 * iJewel reference, not a binary-compatible implementation of iJewel's
 * proprietary DiamondMaterial extension.
 */
export const AURUM_DIAMOND_MATERIAL_VERSION = "1.0.0";

export const AURUM_DIAMOND_MATERIAL_DEFAULTS = Object.freeze({
  refractiveIndex: 2.6,
  reflectivity: 0.5,
  rayBounces: 5,
  dispersion: 0.01,
  transmission: 0.08,
  roughness: 0.01,
  clearcoat: 0.26,
  clearcoatRoughness: 0.01,
});

export function activateAurumDiamondMaterial<T = any>(material: T, preset?: Record<string, any>): T {
  if (!material) return material;
  const target = material as any;
  const existing = target.userData ?? {};
  const supplied = existing.aurumIJEWELParameters ?? {};
  const variant = String(preset?.id ?? preset?.variante ?? "diamante");
  const hasInclusions = Boolean(preset?.inclusions ?? preset?.inclusionDensity);
  target.userData = {
    ...existing,
    aurumIJEWELParameters: {
      ...AURUM_DIAMOND_MATERIAL_DEFAULTS,
      ...supplied,
      refractiveIndex: Number(supplied.refractiveIndex ?? AURUM_DIAMOND_MATERIAL_DEFAULTS.refractiveIndex),
      reflectivity: Number(supplied.reflectivity ?? AURUM_DIAMOND_MATERIAL_DEFAULTS.reflectivity),
      rayBounces: Math.max(1, Math.min(8, Math.floor(Number(supplied.rayBounces ?? AURUM_DIAMOND_MATERIAL_DEFAULTS.rayBounces)))),
    },
    aurumIJEWELActive: true,
    aurumDiamondMaterial: {
      implementation: "aurum-native-facet-environment-v1",
      version: AURUM_DIAMOND_MATERIAL_VERSION,
      status: "dedicated-shader-approximation",
      realGeometricMultiBounce: false,
      presetId: variant,
      variant: String(preset?.variante ?? "Natural"),
      inclusions: hasInclusions,
      roughness: Number(preset?.roughness ?? AURUM_DIAMOND_MATERIAL_DEFAULTS.roughness),
      dispersion: Number(preset?.dispersion ?? AURUM_DIAMOND_MATERIAL_DEFAULTS.dispersion),
      environmentIntensity: Number(preset?.envMapIntensity ?? 1.3),
      attenuationDistance: Number(preset?.attenuationDistance ?? 100),
    },
    aurumDiamondShaderMode: "aurum-native-facet-environment-v1",
    aurumDiamondPresetId: variant,
  };
  target.needsUpdate = true;
  return material;
}
