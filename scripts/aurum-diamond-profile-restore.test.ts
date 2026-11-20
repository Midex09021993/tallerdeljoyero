import { expect, test } from "bun:test";
import { resolveAurumDiamondProfileOptics } from "../src/lib/aurum/aurum-diamond-bvh-runtime";

test("restores the exact startup optics after Blanco 1 -> Blanco 2 -> Blanco 1", () => {
  const blanco1Baseline = {
    profileId: "diamante_blanco_1",
    dispersion: 0.01,
    environmentIntensity: 1.3,
    reflectivity: 0.46,
    gamma: 1.09,
    rgbBoost: [1, 1, 1] as [number, number, number],
  };

  const initialBlanco1 = resolveAurumDiamondProfileOptics(
    { id: "diamante_blanco_1" },
    blanco1Baseline,
  );

  const blanco2 = resolveAurumDiamondProfileOptics(
    {
      id: "diamante_blanco_2",
      envMapIntensity: 1.1,
      diamondMaterialParameters: {
        dispersion: 0.004,
        reflectivity: 0.52,
        gammaFactor: 0.96,
        boostFactors: { x: 1.05, y: 1.05, z: 1.05 },
      },
    },
    blanco1Baseline,
  );

  expect(blanco2).not.toEqual(initialBlanco1);

  const restoredBlanco1 = resolveAurumDiamondProfileOptics(
    { id: "diamante_blanco_1" },
    blanco1Baseline,
  );

  expect(restoredBlanco1).toEqual(initialBlanco1);
  expect(restoredBlanco1).toEqual({
    dispersion: 0.01,
    environmentIntensity: 1.3,
    reflectivity: 0.46,
    gamma: 1.09,
    rgbBoost: [1, 1, 1],
  });
});

test("explicit Blanco 1 catalog values remain authoritative over the startup fallback", () => {
  const baseline = {
    profileId: "diamante_blanco_1",
    dispersion: 0.01,
    environmentIntensity: 1.3,
    reflectivity: 0.46,
    gamma: 1.09,
    rgbBoost: [1, 1, 1] as [number, number, number],
  };

  expect(resolveAurumDiamondProfileOptics({
    id: "diamante_blanco_1",
    envMapIntensity: 1.25,
    diamondMaterialParameters: {
      dispersion: 0.008,
      reflectivity: 0.48,
      gammaFactor: 1.04,
      boostFactors: { x: 1.02, y: 1, z: 1 },
    },
  }, baseline)).toEqual({
    dispersion: 0.008,
    environmentIntensity: 1.25,
    reflectivity: 0.48,
    gamma: 1.04,
    rgbBoost: [1.02, 1, 1],
  });
});
