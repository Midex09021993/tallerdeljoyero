import { expect, test } from "bun:test";
import * as THREE from "three";
import { classifyAurumDiamondScreenSize, createAurumDiamondMicroPipeline, getAurumDiamondProjectedDiameterPx, getAurumDiamondMicroOpticalProfile } from "../src/lib/aurum/diamond-micro-pipeline";

test("classifies projected diamond sizes into stable screen-space tiers", () => {
  expect(classifyAurumDiamondScreenSize(5)).toBe("micro");
  expect(classifyAurumDiamondScreenSize(12)).toBe("micro");
  expect(classifyAurumDiamondScreenSize(20)).toBe("small");
  expect(classifyAurumDiamondScreenSize(36)).toBe("small");
  expect(classifyAurumDiamondScreenSize(80)).toBe("brilliant");
  expect(classifyAurumDiamondScreenSize(Number.NaN)).toBe("micro");
});

test("measures projected diameter with a perspective camera", () => {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial());
  mesh.updateMatrixWorld(true);
  const diameter = getAurumDiamondProjectedDiameterPx(mesh, camera, 600);
  expect(diameter).toBeGreaterThan(100);
  expect(diameter).toBeLessThan(150);
});

test("flags mixed stone sizes sharing one material without changing its optical settings", () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  const material = new THREE.MeshPhysicalMaterial();
  material.userData.aurumGemFamily = "Diamante";
  const large = new THREE.Mesh(new THREE.SphereGeometry(1), material);
  const tiny = new THREE.Mesh(new THREE.SphereGeometry(0.05), material);
  tiny.position.x = 4;
  scene.add(large, tiny);
  const pipeline = createAurumDiamondMicroPipeline(scene, camera, () => 600);
  const report = pipeline.update();
  expect(report).toHaveLength(1);
  expect(report[0].sharedAcrossTiers).toBe(true);
  expect(report[0].tier).toBe("mixed");
  expect(material.userData.aurumDiamondMicroProfile.tier).toBe("mixed");
  pipeline.dispose();
  expect(large.userData.aurumDiamondMicroTier).toBeUndefined();
  expect(material.userData.aurumGemFamily).toBe("Diamante");
});
test("provides conservative optical tiers while preserving the brilliant baseline", () => {
  const micro = getAurumDiamondMicroOpticalProfile("micro");
  const small = getAurumDiamondMicroOpticalProfile("small");
  const brilliant = getAurumDiamondMicroOpticalProfile("brilliant");
  expect(micro.scintillationScale).toBeLessThan(small.scintillationScale);
  expect(small.scintillationScale).toBeLessThan(1);
  expect(micro.virtualFacetWeight).toBeLessThan(small.virtualFacetWeight);
  expect(brilliant).toEqual({ scintillationScale: 1, facetContrastScale: 1, dispersionScale: 1, virtualFacetWeight: 0.06, fireScale: 1 });
});

test("applies per-mesh optical profiles to diamonds sharing one material and restores callbacks", () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  const material = new THREE.MeshPhysicalMaterial();
  material.userData.aurumGemFamily = "Diamante";
  material.userData.aurumDiamondMicroUniforms = {
    scintillationStrength: { value: 0.16 }, baseScintillationStrength: 0.16,
    facetContrast: { value: 0.88 }, baseFacetContrast: 0.88,
    dispersion: { value: 0.01 }, baseDispersion: 0.01,
    virtualFacetWeight: { value: 0.06 }, baseVirtualFacetWeight: 0.06,
    fireScale: { value: 1 },
  };
  const large = new THREE.Mesh(new THREE.SphereGeometry(1), material);
  const tiny = new THREE.Mesh(new THREE.SphereGeometry(0.05), material);
  tiny.position.x = 4;
  scene.add(large, tiny);
  const pipeline = createAurumDiamondMicroPipeline(scene, camera, () => 600);
  pipeline.update();
  large.onBeforeRender(null as any, scene, camera, large.geometry, material, null as any);
  expect(material.userData.aurumDiamondMicroUniforms.scintillationStrength.value).toBeCloseTo(0.16);
  tiny.onBeforeRender(null as any, scene, camera, tiny.geometry, material, null as any);
  expect(material.userData.aurumDiamondMicroUniforms.scintillationStrength.value).toBeCloseTo(0.16 * 0.58);
  expect(material.userData.aurumDiamondMicroUniforms.virtualFacetWeight.value).toBeCloseTo(0.025);
  expect(tiny.userData.aurumDiamondMicroOpticalProfile.scintillationScale).toBe(0.58);
  pipeline.dispose();
  expect(large.userData.aurumDiamondMicroTier).toBeUndefined();
  expect(material.userData.aurumDiamondMicroUniforms.scintillationStrength.value).toBeCloseTo(0.16);
});
