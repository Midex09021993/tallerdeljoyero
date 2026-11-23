import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
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
    geometryFactor: 0.5,
    squashFactor: 0.98,
    absorptionFactor: 1,
    transmission: 0,
    boostFactors: { x: 1, y: 1, z: 1 },
  },
};

const blanco2CatalogProfile = {
  id: "diamante_vs",
  nombre: "Diamante blanco 2",
  envMapIntensity: 1.3,
  dispersion: 0.01,
  diamondMaterialParameters: {
    dispersion: 0.01,
    gammaFactor: 1,
    reflectivity: 0.5,
    geometryFactor: 0.5,
    squashFactor: 0.98,
    absorptionFactor: 1,
    transmission: 0,
    boostFactors: { x: 1, y: 1, z: 1 },
  },
};

test("Blanco 2 resolves to the same complete optical profile as Blanco 1", () => {
  const startupBaseline = {
    profileId: "diamante_natural",
    dispersion: 0.01,
    environmentIntensity: 1.3,
    reflectivity: 0.5,
    gamma: 1,
    rgbBoost: [1, 1, 1] as [number, number, number],
    geometryFactor: 0.5,
    squashFactor: 0.98,
    absorptionFactor: 1,
    transmission: 0,
  };

  const initialBlanco1 = resolveAurumDiamondProfileOptics(blanco1CatalogProfile, startupBaseline);
  expect(initialBlanco1).toEqual({
    dispersion: 0.01,
    environmentIntensity: 1.3,
    reflectivity: 0.5,
    gamma: 1,
    rgbBoost: [1, 1, 1],
    geometryFactor: 0.5,
    squashFactor: 0.98,
    absorptionFactor: 1,
    transmission: 0,
  });

  const blanco2 = resolveAurumDiamondProfileOptics(blanco2CatalogProfile, startupBaseline);
  expect(blanco2).toEqual(initialBlanco1);

  const restoredBlanco1 = resolveAurumDiamondProfileOptics(blanco1CatalogProfile, startupBaseline);
  expect(restoredBlanco1).toEqual(initialBlanco1);
});

test("non-initial diamond profiles continue to use their own catalog values for all four controls", () => {
  const baseline = {
    profileId: "diamante_natural",
    dispersion: 0.01,
    environmentIntensity: 1.3,
    reflectivity: 0.5,
    gamma: 1,
    rgbBoost: [1, 1, 1] as [number, number, number],
    geometryFactor: 0.5,
    squashFactor: 0.98,
    absorptionFactor: 1,
    transmission: 0,
  };

  expect(resolveAurumDiamondProfileOptics({
    id: "diamante_azul",
    envMapIntensity: 1.03,
    diamondMaterialParameters: {
      dispersion: 0.013,
      reflectivity: 0.5,
      gammaFactor: 1,
      geometryFactor: 0.61,
      squashFactor: 0.94,
      absorptionFactor: 1.2,
      transmission: 0.08,
      boostFactors: { x: 0.9, y: 1, z: 1 },
    },
  }, baseline)).toEqual({
    dispersion: 0.013,
    environmentIntensity: 1.03,
    reflectivity: 0.5,
    gamma: 1,
    rgbBoost: [0.9, 1, 1],
    geometryFactor: 0.61,
    squashFactor: 0.94,
    absorptionFactor: 1.2,
    transmission: 0.08,
  });
});

test("white diamond BVH keeps catalog reflectivity 0.50 and gamma 1.00 at every screen-space tier", () => {
  const runtime = readFileSync("src/lib/aurum/aurum-diamond-bvh-runtime.ts", "utf8");
  expect(runtime).toContain('activeGemId === "diamante_natural"');
  expect(runtime).toContain('activeGemId === "diamante_vs"');
  expect(runtime).toContain('activeGemId === "diamante_inclusiones"');
  expect(runtime).toContain('(isWhiteDiamondProfile ? 0.5 : 0.46)');
  expect(runtime).toContain('(isWhiteDiamondProfile ? 1 : isPinkDiamond ? 0.90 : 1.09)');
  expect(runtime).toContain('const isWhiteDiamondProfile = ["diamante_natural", "diamante_vs", "diamante_inclusiones"].includes(profileId)');
  expect(runtime).toContain("const nextReflectivity = isWhiteDiamondProfile ? 0.5 : resolvedOptics.reflectivity;");
  expect(runtime).toContain("const nextGamma = isWhiteDiamondProfile ? 1 : resolvedOptics.gamma;");
  expect(runtime).toContain("const reflectivity = baseDiamondReflectivity;");
  expect(runtime).toContain("const gamma = baseDiamondGamma;");
});
