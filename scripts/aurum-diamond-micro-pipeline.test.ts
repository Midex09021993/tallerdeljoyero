import { expect, test } from "bun:test";
import * as THREE from "three";
import { classifyAurumDiamondScreenSize, classifyAurumDiamondMeshTiers, createAurumDiamondMicroPipeline, getAurumDiamondProjectedDiameterPx, getAurumDiamondMicroOpticalProfile, stabilizeAurumDiamondScreenTier } from "../src/lib/aurum/diamond-micro-pipeline";
import { isAurumDiamondBvhCenterTarget } from "../src/lib/aurum/aurum-diamond-bvh-runtime";

test("classifies projected diamond sizes into stable screen-space tiers", () => {
  expect(classifyAurumDiamondScreenSize(5)).toBe("micro");
  expect(classifyAurumDiamondScreenSize(12)).toBe("micro");
  expect(classifyAurumDiamondScreenSize(20)).toBe("small");
  expect(classifyAurumDiamondScreenSize(36)).toBe("small");
  expect(classifyAurumDiamondScreenSize(80)).toBe("brilliant");
  expect(classifyAurumDiamondScreenSize(Number.NaN)).toBe("micro");
});

test("uses hysteresis around tier boundaries without delaying large zoom changes", () => {
  expect(stabilizeAurumDiamondScreenTier(13, "micro")).toBe("micro");
  expect(stabilizeAurumDiamondScreenTier(14.1, "micro")).toBe("small");
  expect(stabilizeAurumDiamondScreenTier(11, "small")).toBe("small");
  expect(stabilizeAurumDiamondScreenTier(10, "small")).toBe("micro");
  expect(stabilizeAurumDiamondScreenTier(38, "brilliant")).toBe("small");
  expect(stabilizeAurumDiamondScreenTier(33, "brilliant")).toBe("brilliant");
  expect(stabilizeAurumDiamondScreenTier(45, "small")).toBe("brilliant");
  expect(stabilizeAurumDiamondScreenTier(5)).toBe("micro");
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

test("shares screen-space tiers across diamond paths and protects an explicitly marked center", () => {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  const material = new THREE.MeshPhysicalMaterial();
  material.userData.aurumGemFamily = "Diamante";
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.12), material);
  center.userData.aurumDiamondRole = "principal";
  const melee = new THREE.Mesh(new THREE.SphereGeometry(0.025), material);
  melee.position.x = 1;
  const tiers = classifyAurumDiamondMeshTiers([center, melee], camera, 600);
  expect(tiers.get(center)).toBe("brilliant");
  expect(tiers.get(melee)).toBe("micro");
});

test("does not auto-protect a lone melee diamond as the center stone", () => {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  const material = new THREE.MeshPhysicalMaterial();
  material.userData.aurumGemFamily = "Diamante";
  const melee = new THREE.Mesh(new THREE.SphereGeometry(0.05), material);
  const tiers = classifyAurumDiamondMeshTiers([melee], camera, 600);
  expect(tiers.get(melee)).toBe("micro");
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
  expect(large.userData.aurumDiamondMicroTier).toBe("brilliant");
  expect(large.userData.aurumDiamondMicroOpticalProfile).toEqual(getAurumDiamondMicroOpticalProfile("brilliant"));
  expect(material.userData.aurumGemFamily).toBe("Diamante");
});
test("provides conservative optical tiers while preserving the brilliant baseline", () => {
  const micro = getAurumDiamondMicroOpticalProfile("micro");
  const small = getAurumDiamondMicroOpticalProfile("small");
  const brilliant = getAurumDiamondMicroOpticalProfile("brilliant");
  expect(micro).toEqual({ scintillationScale: 0.22, facetContrastScale: 0.72, dispersionScale: 0.72, virtualFacetWeight: 0.004, fireScale: 0.38 });
  expect(small).toEqual({ scintillationScale: 0.62, facetContrastScale: 0.84, dispersionScale: 0.86, virtualFacetWeight: 0.022, fireScale: 0.72 });
  expect(micro.scintillationScale).toBeLessThan(small.scintillationScale);
  expect(micro.dispersionScale).toBeLessThan(small.dispersionScale);
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
  expect(material.userData.aurumDiamondMicroUniforms.scintillationStrength.value).toBeCloseTo(0.16 * 0.22);
  expect(material.userData.aurumDiamondMicroUniforms.virtualFacetWeight.value).toBeCloseTo(0.004);
  expect(tiny.userData.aurumDiamondMicroOpticalProfile.scintillationScale).toBe(0.22);
  pipeline.dispose();
  expect(large.userData.aurumDiamondMicroTier).toBe("brilliant");
  expect(large.userData.aurumDiamondMicroOpticalProfile).toEqual(getAurumDiamondMicroOpticalProfile("brilliant"));
  expect(material.userData.aurumDiamondMicroUniforms.scintillationStrength.value).toBeCloseTo(0.16);
});

test("refresh discovers meshes reassigned to diamond and releases meshes reassigned away", () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  const originalCallback = () => {};
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial());
  mesh.onBeforeRender = originalCallback;
  scene.add(mesh);
  const pipeline = createAurumDiamondMicroPipeline(scene, camera, () => 600);

  const diamondMaterial = new THREE.MeshPhysicalMaterial();
  diamondMaterial.userData.aurumGemFamily = "Diamante";
  diamondMaterial.userData.aurumDiamondMicroUniforms = {
    scintillationStrength: { value: 0.16 }, baseScintillationStrength: 0.16,
    facetContrast: { value: 0.88 }, baseFacetContrast: 0.88,
    dispersion: { value: 0.01 }, baseDispersion: 0.01,
    virtualFacetWeight: { value: 0.06 }, baseVirtualFacetWeight: 0.06,
    fireScale: { value: 1 },
  };
  mesh.material = diamondMaterial;
  expect(pipeline.refresh()).toBe(1);
  pipeline.update();
  mesh.onBeforeRender(null as any, scene, camera, mesh.geometry, diamondMaterial, null as any);
  expect(mesh.userData.aurumDiamondMicroTier).toBe("micro");
  expect(diamondMaterial.userData.aurumDiamondMicroUniforms.scintillationStrength.value).toBeCloseTo(0.16 * 0.22);

  mesh.material = new THREE.MeshBasicMaterial();
  pipeline.refresh();
  expect(mesh.onBeforeRender).toBe(originalCallback);
  expect(mesh.userData.aurumDiamondMicroTier).toBeUndefined();
  pipeline.dispose();
});


test("micro pipeline can be paused and resumed without leaving optical scaling behind", () => {
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
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.05), material);
  scene.add(mesh);
  const pipeline = createAurumDiamondMicroPipeline(scene, camera, () => 600);
  pipeline.update();
  mesh.onBeforeRender(null as any, scene, camera, mesh.geometry, material, null as any);
  expect(material.userData.aurumDiamondMicroUniforms.scintillationStrength.value).toBeLessThan(0.16);

  pipeline.setEnabled(false);
  expect(pipeline.diagnostics().enabled).toBe(false);
  expect(mesh.userData.aurumDiamondMicroTier).toBe("brilliant");
  expect(mesh.userData.aurumDiamondMicroOpticalProfile.scintillationScale).toBe(1);
  expect(material.userData.aurumDiamondMicroUniforms.scintillationStrength.value).toBeCloseTo(0.16);
  mesh.onBeforeRender(null as any, scene, camera, mesh.geometry, material, null as any);
  expect(material.userData.aurumDiamondMicroUniforms.scintillationStrength.value).toBeCloseTo(0.16);

  pipeline.setEnabled(true);
  expect(pipeline.diagnostics().enabled).toBe(true);
  mesh.onBeforeRender(null as any, scene, camera, mesh.geometry, material, null as any);
  expect(material.userData.aurumDiamondMicroUniforms.scintillationStrength.value).toBeLessThan(0.16);
  pipeline.dispose();
  mesh.geometry.dispose();
  material.dispose();
});


test("limits the production BVH target to the explicitly protected center diamond", () => {
  const center = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
  center.userData.aurumDiamondMicroCenterProtected = true;
  const secondary = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
  expect(isAurumDiamondBvhCenterTarget(center)).toBe(true);
  expect(isAurumDiamondBvhCenterTarget(secondary)).toBe(false);
  secondary.userData.aurumDiamondRole = "principal";
  expect(isAurumDiamondBvhCenterTarget(secondary)).toBe(true);
});
