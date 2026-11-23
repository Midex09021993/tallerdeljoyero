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
  refractiveIndex: 2.417,
  reflectivity: 0.5,
  rayBounces: 5,
  // Experimental virtual internal-facet PMREM sampling. Does not modify CAD geometry.
  virtualFacetReflections: true,
  dispersion: 0.01,
  transmission: 0.08,
  roughness: 0.01,
  clearcoat: 0.26,
  clearcoatRoughness: 0.01,
});

export const AURUM_WHITE_DIAMOND_PROFILE_IDS = Object.freeze([
  "diamante_natural",
  "diamante_vs",
  "diamante_inclusiones",
]);

/**
 * Resolve the active optical parameters for a catalog diamond.
 * White 1 is the optical reference: White 2/3 retain their source catalog
 * metadata, but every application path receives the same active gamma/reflection.
 */
export function resolveAurumDiamondCatalogParameters(preset?: Record<string, any>): Record<string, any> {
  const source = preset?.["diamondMaterialParameters"] ?? {};
  const profileId = String(preset?.["id"] ?? "");
  if (!AURUM_WHITE_DIAMOND_PROFILE_IDS.includes(profileId as typeof AURUM_WHITE_DIAMOND_PROFILE_IDS[number])) {
    return { ...source };
  }
  return {
    ...source,
    gammaFactor: 1,
    reflectivity: 0.5,
  };
}

export function activateAurumDiamondMaterial<T = any>(material: T, preset?: Record<string, any>): T {
  if (!material) return material;
  const target = material as any;
  const existing = target.userData ?? {};
  const supplied = existing.aurumIJEWELParameters ?? {};
  const source = preset?.["diamondMaterialParameters"] ?? {};
  const variant = String(preset?.["id"] ?? preset?.["variante"] ?? "diamante");
  const hasInclusions = Boolean(preset?.["inclusions"] ?? preset?.["inclusionDensity"]);
  target.userData = {
    ...existing,
    aurumIJEWELParameters: {
      ...AURUM_DIAMOND_MATERIAL_DEFAULTS,
      ...supplied,
      // Preserve imported DiamondMaterial values as source metadata. The physical
      // MeshPhysicalMaterial IOR remains independently controlled by the catalog.
      refractiveIndex: Number(source.refractiveIndex ?? supplied.refractiveIndex ?? AURUM_DIAMOND_MATERIAL_DEFAULTS.refractiveIndex),
      dispersion: Number(source.dispersion ?? supplied.dispersion ?? AURUM_DIAMOND_MATERIAL_DEFAULTS.dispersion),
      reflectivity: Number(source.reflectivity ?? supplied.reflectivity ?? AURUM_DIAMOND_MATERIAL_DEFAULTS.reflectivity),
      gammaFactor: Number(source.gammaFactor ?? supplied.gammaFactor ?? 1),
      geometryFactor: Number(source.geometryFactor ?? supplied.geometryFactor ?? 0.5),
      squashFactor: Number(source.squashFactor ?? supplied.squashFactor ?? 0.98),
      absorptionFactor: Number(source.absorptionFactor ?? supplied.absorptionFactor ?? 1),
      boostFactors: source.boostFactors ?? supplied.boostFactors ?? { x:1, y:1, z:1 },
      diamondOrientedEnvMap: Number(source.diamondOrientedEnvMap ?? supplied.diamondOrientedEnvMap ?? 0),
      environmentRotationOffset: Number(source.envMapRotationOffset ?? supplied.environmentRotationOffset ?? 0),
      rayBounces: Math.max(1, Math.min(8, Math.floor(Number(source.rayBounces ?? supplied.rayBounces ?? AURUM_DIAMOND_MATERIAL_DEFAULTS.rayBounces)))),
    },
    aurumIJEWELActive: true,
    aurumDiamondMaterial: {
      implementation: "aurum-native-facet-environment-v1",
      version: AURUM_DIAMOND_MATERIAL_VERSION,
      status: "dedicated-shader-approximation",
      realGeometricMultiBounce: false,
      virtualFacetReflections: Boolean(supplied.virtualFacetReflections ?? AURUM_DIAMOND_MATERIAL_DEFAULTS.virtualFacetReflections),
      virtualFacetReflectionsMode: "two-offset-environment-samples",
      presetId: variant,
      variant: String(preset?.["variante"] ?? "Natural"),
      inclusions: hasInclusions,
      roughness: Number(preset?.["roughness"] ?? AURUM_DIAMOND_MATERIAL_DEFAULTS.roughness),
      dispersion: Number(preset?.["dispersion"] ?? AURUM_DIAMOND_MATERIAL_DEFAULTS.dispersion),
      environmentIntensity: Number(preset?.["envMapIntensity"] ?? 1.3),
      attenuationDistance: Number(preset?.["attenuationDistance"] ?? 100),
    },
    aurumDiamondShaderMode: "aurum-native-facet-environment-v1",
    aurumDiamondPresetId: variant,
  };
  target.needsUpdate = true;
  return material;
}
