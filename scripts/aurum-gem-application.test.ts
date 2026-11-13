import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { createAurumGemEnvironment } from "../src/lib/aurum/gem-environment";
import { prepareAurumGemLayerIndex } from "../src/lib/aurum/material-application";

test("gem environment updates only the meshes resolved for the selected stone", () => {
  const controller = createAurumGemEnvironment({}, class {}, class {});
  const targetMaterial = new THREE.MeshPhysicalMaterial();
  targetMaterial.userData = {
    aurumOpticalProfile: { familia: "Esmeralda" },
    aurumGemFamily: "Esmeralda",
    aurumGemBaseEnvIntensity: 1,
    aurumGemEnvironmentUniforms: { value: 0 },
  };
  targetMaterial.envMapRotation = new THREE.Euler();
  const unrelatedMaterial = new THREE.MeshPhysicalMaterial();
  unrelatedMaterial.userData = {
    aurumOpticalProfile: { familia: "Diamante" },
    aurumGemFamily: "Diamante",
  };
  unrelatedMaterial.envMapRotation = new THREE.Euler();
  const target = new THREE.Mesh(new THREE.BufferGeometry(), targetMaterial);
  const unrelated = new THREE.Mesh(new THREE.BufferGeometry(), unrelatedMaterial);
  const environment = new THREE.Texture();

  controller.applyToTargets([target], environment, { rotation: 0.2, intensityScale: 1 });

  expect(targetMaterial.envMap).toBe(environment);
  expect(targetMaterial.userData.aurumGemEnvironmentUniforms.value).toBe(targetMaterial.envMapIntensity);
  expect(unrelatedMaterial.envMap).toBeNull();

  environment.dispose();
  targetMaterial.dispose();
  unrelatedMaterial.dispose();
  target.geometry.dispose();
  unrelated.geometry.dispose();
});

test("gem layer index is prepared once and rebuilt for a reused scene root", () => {
  const scene = new THREE.Scene();
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.MeshPhysicalMaterial();
  const gem = new THREE.Mesh(geometry, material);
  gem.userData = { aurumRhino: { categoria: "gema", capa: "Gem 01" } };
  scene.add(gem);

  const first = prepareAurumGemLayerIndex(scene);
  expect(first?.byLayerName.get("gem 01")).toEqual([gem]);

  gem.userData.aurumRhino.categoria = "metal";
  const rebuilt = prepareAurumGemLayerIndex(scene);
  expect(rebuilt?.byLayerName.has("gem 01")).toBe(false);

  scene.remove(gem);
  geometry.dispose();
  material.dispose();
});

test("selected gem paints before optional enrichment and thickness work", () => {
  const source = readFileSync("src/lib/aurum/material-application.ts", "utf8");
  const start = source.indexOf("export function applyAurumGemToTarget");
  const end = source.indexOf("export function clearAurumGemFromTarget", start);
  const apply = source.slice(start, end);

  expect(apply.indexOf("applyGemEnvironment(targets);")).toBeGreaterThan(-1);
  expect(apply.indexOf("applyGemEnvironment(targets);")).toBeLessThan(
    apply.indexOf("enrichmentJobs.forEach") === -1
      ? apply.indexOf("runNextEnrichmentJob")
      : apply.indexOf("enrichmentJobs.forEach"),
  );
  expect(apply).toContain("requestIdleCallback");
  expect(apply).toContain("buildAurumThicknessMap");
  expect(apply).toContain("aurumGemApplicationToken");
});

test("targeted BVH refresh avoids processing unrelated scene meshes", () => {
  const source = readFileSync("src/lib/aurum/aurum-diamond-bvh-runtime.ts", "utf8");
  expect(source).toContain("refreshTargets(model, targets)");
  expect(source).toContain("if (targetSet) targetSet.forEach(processMesh);");
  expect(source).toContain("const targetContainsDiamond = !targetSet");
});
