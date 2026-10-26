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
  // Keep absorption in a restrained range. The BVH shader does not implement
  // Beer-Lambert attenuation, so this is only a visual approximation.
  const absorption = attenuationDistance > 0
    ? THREE.MathUtils.clamp(0.35 + 0.35 / attenuationDistance, 0.35, 0.8)
    : 0.45;

  const nativeColor = physical.color?.isColor
    ? physical.color.getHex()
    : undefined;
  const profileColor = Number(optical.color);
  const color = nativeColor ?? (
    Number.isFinite(profileColor) && profileColor >= 0
      ? profileColor
      : 0x169b63
  );
  const authoredTransmission = readFinite(
    data.aurumLiveTransmissionStored ?? physical.transmission,
    0.76,
  );

  return {
    ior: THREE.MathUtils.clamp(readFinite(physical.ior, readFinite(optical.ior, 1.58)), 1, 2.8),
    // This package's shader clamps dispersion to 0.02; emerald dispersion is
    // intentionally kept subtle rather than inheriting exaggerated catalog values.
    dispersion: THREE.MathUtils.clamp(readFinite(physical.dispersion, readFinite(optical.dispersion, 0.0005)), 0, 0.002),
    // Slightly stronger absorption counters the washed-out center without
    // changing the catalog hue; this is a visual control, not Beer-Lambert.
    absorption: THREE.MathUtils.clamp(absorption + 0.16, 0.48, 0.92),
    // The diamond shader can wash out colored gems at high HDR intensity.
    // Keep emerald reflections restrained while preserving the native color.
    environmentIntensity: THREE.MathUtils.clamp(readFinite(physical.envMapIntensity, 0.95), 0.7, 1.05),
    color,
    reflectivity: THREE.MathUtils.clamp(readFinite(physical.reflectivity, 0.18), 0.1, 0.24),
    transmission: THREE.MathUtils.clamp(authoredTransmission, 0.58, 0.84),
  };
}
