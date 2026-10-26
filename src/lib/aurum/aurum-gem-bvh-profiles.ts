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
 * Maps the selected native emerald material to the controls supported by the
 * experimental BVH shader. Catalog materials remain the source of truth.
 *
 * Note: the current shader's absorption uniform is a dimensionless approximation,
 * not a true Beer-Lambert attenuation-distance model.
 */
export function resolveAurumEmeraldBvhProfile(
  material: THREE.Material,
): AurumGemBvhProfile {
  const physical = material as THREE.MeshPhysicalMaterial;
  const data = material.userData ?? {};
  const optical = data.aurumOpticalProfile ?? {};
  const materialDistance = Number(physical.attenuationDistance);
  const profileDistance = Number(optical.absorptionDistance);
  const attenuationDistance = Number.isFinite(materialDistance)
    ? materialDistance
    : Number.isFinite(profileDistance)
      ? profileDistance
      : 1;
  const safeDistance = Math.max(0.05, attenuationDistance);
  const authoredTransmission = Number(
    data.aurumLiveTransmissionStored ?? physical.transmission ?? 0.7,
  );
  const materialColor = physical.color?.isColor
    ? physical.color.getHex()
    : 0x169b63;

  return {
    ior: THREE.MathUtils.clamp(Number(physical.ior ?? optical.ior ?? 1.58), 1, 2.8),
    dispersion: THREE.MathUtils.clamp(Number(physical.dispersion ?? optical.dispersion ?? 0.012), 0, 0.02),
    absorption: THREE.MathUtils.clamp(1 + 0.65 / safeDistance, 1, 4),
    environmentIntensity: THREE.MathUtils.clamp(Number(physical.envMapIntensity ?? 1.5), 0, 2.5),
    color: materialColor,
    reflectivity: THREE.MathUtils.clamp(Number(physical.reflectivity ?? 0.26), 0, 1),
    transmission: THREE.MathUtils.clamp(
      Number.isFinite(authoredTransmission) ? authoredTransmission : 0.7,
      0,
      0.95,
    ),
  };
}
