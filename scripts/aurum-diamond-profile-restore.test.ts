import { expect, test } from "bun:test";
import { resolveAurumDiamondProfileOptics } from "../src/lib/aurum/aurum-diamond-bvh-runtime";

const blanco1CatalogProfile = {
  id: "diamante_natural",
  nombre: "Diamante blanco 1",
  envMapIntensity: 1.3,
  dispersion: 0.01,
  diamondMaterialParameters: {
    dispersion: 0.01,
    gammaFactor: 1,
    reflectivity: 0.5,
    boostFactors: { x: 1, y: 1, z: 1 },
  },
};

const blanco2CatalogProfile = {
  id: "diamante_vs",
  nombre: "Diamante blanco 2",
  envMapIntensity: 1.3,
  dispersion: 0,
  diamondMaterialParameters: {
    dispersion: 0,
    gammaFactor: 1,
    reflectivity: 0.5,
    boostFactors: { x: 1, y: 1, z: 1 },
  },
};

test("restores the exact startup optics after real catalog Blanco 1 -> Blanco 2 -> Blanco 1 switching", () => {
  // These are the values read from the live material at the first render,
  // not the generic gamma/reflectivity metadata stored in the catalog.
  const startupBaseline = {
    profileId: "diamante_natural",
    dispersion: 0.01,
    environmentIntensity: 1.3,
    reflectivity: 0.46,
    gamma: 1.09,
    rgbBoost: [1, 1, 1] as [number, number, number],
  };

  const initialBlanco1 = resolveAurumDiamondProfileOptics(
    blanco1CatalogProfile,
    startupBaseline,
  );
  expect(initialBlanco1).toEqual({
    dispersion: 0.01,
    environmentIntensity: 1.3,
    reflectivity: 0.46,
    gamma: 1.09,
    rgbBoost: [1, 1, 1],
  });

  const blanco2 = resolveAurumDiamondProfileOptics(
    blanco2CatalogProfile,
    startupBaseline,
  );
  expect(blanco2).not.toEqual(initialBlanco1);

  const restoredBlanco1 = resolveAurumDiamondProfileOptics(
    blanco1CatalogProfile,
    startupBaseline,
  );
  expect(restoredBlanco1).toEqual(initialBlanco1);
});

test("non-initial diamond profiles continue to use their own catalog optical values", () => {
  const baseline = {
    profileId: "diamante_natural",
    dispersion: 0.01,
    environmentIntensity: 1.3,
    reflectivity: 0.46,
    gamma: 1.09,
    rgbBoost: [1, 1, 1] as [number, number, number],
  };

  expect(resolveAurumDiamondProfileOptics({
    id: "diamante_azul",
    envMapIntensity: 1.03,
    diamondMaterialParameters: {
      dispersion: 0.013,
      reflectivity: 0.5,
      gammaFactor: 1,
      boostFactors: { x: 0.9, y: 1, z: 1 },
    },
  }, baseline)).toEqual({
    dispersion: 0.013,
    environmentIntensity: 1.03,
    reflectivity: 0.5,
    gamma: 1,
    rgbBoost: [0.9, 1, 1],
  });
});
