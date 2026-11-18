// @ts-nocheck -- AURUM Render engine: strict-mode typing pending; runtime behaviour unchanged.
import * as THREE from "three";

export type AurumGemBvhProfile = {
  ior: number;
  dispersion: number;
  absorption: number;
  environmentIntensity: number;
  color: THREE.ColorRepresentation;
  reflectivity: number;
  transmission: number;
};

/**
 * Converts an emerald's native physical material into conservative controls for
 * the experimental BVH shader. The shader's absorption input is dimensionless,
 * so do not treat MeshPhysicalMaterial.attenuationDistance (where 0 means
 * infinite attenuation distance in Three.js) as a reciprocal absorption value.
 *
 * Transmission is intentionally zero for this experimental profile to isolate
 * BVH refraction artifacts. This profile is only consumed by the experimental
 * BVH runtime; the original physical material remains untouched for fallback.
 */
export function resolveAurumEmeraldBvhProfile(
  material: THREE.Material,
): AurumGemBvhProfile {
  const physical = material as THREE.MeshPhysicalMaterial;
  const data = material.userData ?? {};
  const optical = data.aurumOpticalProfile ?? {};

  const readFinite = (value: unknown, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const attenuationDistance = readFinite(
    optical.absorptionDistance,
    readFinite(physical.attenuationDistance, 0),
  );
  // The upstream shader skips its attenuation branch unless absorption > 1.001.
  // Previous values (0.54–0.96) therefore had no effect at all. Use a modest
  // active range; the shader applies exp(-0.04 * (absorption - 1) * pathLength),
  // so aggressive values would unnecessarily darken small emeralds.
  const absorption = attenuationDistance > 0
    ? THREE.MathUtils.clamp(1.15 + 0.025 / attenuationDistance, 1.15, 1.65)
    : 1.35;

  const nativeColor = physical.color?.isColor
    ? physical.color.getHex()
    : undefined;
  const profileColor = Number(optical.color);
  const color = nativeColor ?? (
    Number.isFinite(profileColor) && profileColor >= 0
      ? profileColor
      : 0x169b63
  );

  return {
    ior: THREE.MathUtils.clamp(readFinite(physical.ior, readFinite(optical.ior, 1.58)), 1, 2.8),
    // This package's shader clamps dispersion to 0.02; emerald dispersion is
    // intentionally kept subtle rather than inheriting exaggerated catalog values.
    dispersion: THREE.MathUtils.clamp(readFinite(physical.dispersion, readFinite(optical.dispersion, 0.0005)), 0, 0.002),
    // Keep absorption above the upstream shader's 1.001 activation threshold.
    // This controls luminance through the stone; hue remains authored by color.
    absorption,
    // The diamond shader can wash out colored gems at high HDR intensity.
    // Keep emerald reflections restrained while preserving the native color.
    environmentIntensity: THREE.MathUtils.clamp(readFinite(physical.envMapIntensity, 0.82), 0.6, 0.92),
    color,
    reflectivity: THREE.MathUtils.clamp(readFinite(physical.reflectivity, 0.16), 0.08, 0.21),
    // Experimental BVH-only setting; do not write this back to the physical material.
    transmission: 0,
  };
}

/**
 * Ruby BVH profile: preserve the exact color authored by the gem library's
 * physical material instead of forcing every ruby to the same generic red.
 * This affects only the experimental BVH material; the original material is
 * retained for fallback/restoration.
 */
export function resolveAurumRubyBvhProfile(
  material: THREE.Material,
): AurumGemBvhProfile {
  const physical = material as THREE.MeshPhysicalMaterial;
  const data = material.userData ?? {};
  const optical = data.aurumOpticalProfile ?? {};
  const readFinite = (value: unknown, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const nativeColor = physical.color?.isColor ? physical.color.getHex() : undefined;
  const profileColor = Number(optical.color);
  return {
    ior: THREE.MathUtils.clamp(readFinite(physical.ior, readFinite(optical.ior, 1.762)), 1, 2.8),
    dispersion: THREE.MathUtils.clamp(readFinite(physical.dispersion, readFinite(optical.dispersion, 0.001)), 0, 0.02),
    // A modestly lower absorption and a slightly wider HDR range recover
    // readable red facet energy without enabling BVH transmission (kept at 0
    // to avoid introducing unvalidated refraction/intersection artifacts).
    absorption: 1.05,
    environmentIntensity: THREE.MathUtils.clamp(readFinite(physical.envMapIntensity, 1.0), 0.8, 1.55),
    color: nativeColor ?? (Number.isFinite(profileColor) && profileColor >= 0 ? profileColor : 0x9b001b),
    reflectivity: THREE.MathUtils.clamp(readFinite(physical.reflectivity, 0.38), 0.08, 0.5),
    transmission: 0,
  };
}


/**
 * Sapphire BVH profile: retain the variant color authored by the gem library.
 * Applies only to the experimental BVH shader; the original physical material
 * remains available for fallback/restoration. Transmission stays disabled
 * during this first color-parity pass to avoid introducing unvalidated refraction.
 */
export function resolveAurumSapphireBvhProfile(
  material: THREE.Material,
): AurumGemBvhProfile {
  const physical = material as THREE.MeshPhysicalMaterial;
  const data = material.userData ?? {};
  const optical = data.aurumOpticalProfile ?? {};
  const readFinite = (value: unknown, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const nativeColor = physical.color?.isColor ? physical.color.getHex() : undefined;
  const profileColor = Number(optical.color);
  return {
    ior: THREE.MathUtils.clamp(readFinite(physical.ior, readFinite(optical.ior, 1.762)), 1, 2.8),
    dispersion: THREE.MathUtils.clamp(readFinite(physical.dispersion, readFinite(optical.dispersion, 0.001)), 0, 0.02),
    absorption: 1.2,
    environmentIntensity: THREE.MathUtils.clamp(readFinite(physical.envMapIntensity, 1.0), 0.6, 1.4),
    color: nativeColor ?? (Number.isFinite(profileColor) && profileColor >= 0 ? profileColor : 0x123c9a),
    reflectivity: THREE.MathUtils.clamp(readFinite(physical.reflectivity, 0.38), 0.08, 0.5),
    transmission: 0,
  };
}


/**
 * Shared color resolver for catalog gem families without a dedicated optical
 * profile yet. Preserve each assigned physical-material color and fall back to
 * aurumOpticalProfile.color only if the physical color is unavailable.
 * This does not change IOR, transmission, dispersion, or the original material.
 */
export function resolveAurumCatalogGemBvhColor(
  material: THREE.Material,
  fallbackColor: THREE.ColorRepresentation,
): THREE.ColorRepresentation {
  const physical = material as THREE.MeshPhysicalMaterial;
  const optical = material.userData?.aurumOpticalProfile ?? {};
  if (physical.color?.isColor) return physical.color.getHex();
  const profileColor = Number(optical.color);
  return Number.isFinite(profileColor) && profileColor >= 0
    ? profileColor
    : fallbackColor;
}
