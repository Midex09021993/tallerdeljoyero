import { expect, test } from "bun:test";
import * as THREE from "three";
import {
  captureAurumGlbQualitySnapshot,
  evaluateAurumGlbQuality,
} from "../src/lib/aurum/core/glb-quality-gate";

function makeScene() {
  const root = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 });
  metal.name = "Oro 18K";
  const gem = new THREE.MeshPhysicalMaterial({ color: 0x16a34a, transmission: 0.8, roughness: 0.08 });
  gem.name = "Esmeralda";
  const band = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 2), metal);
  band.name = "Aro";
  const stone = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), gem);
  stone.name = "Esmeralda";
  stone.userData.aurumRhino = { categoria: "gema" };
  stone.userData.aurumGlbGemSource = { sourceKey: "rhino-gem-emerald-01", sourceObjectId: "emerald-01" };
  root.add(band, stone);
  return root;
}

test("quality gate passes a complete source-to-reopened snapshot", () => {
  const source = makeScene();
  const reopened = makeScene();
  const report = evaluateAurumGlbQuality(
    captureAurumGlbQualitySnapshot(source),
    captureAurumGlbQualitySnapshot(reopened),
  );
  expect(report.status).toBe("passed");
  expect(report.triangleRetention).toBe(1);
  expect(report.missingNamedMaterials).toEqual([]);
  source.traverse((node) => { if ((node as THREE.Mesh).isMesh) (node as THREE.Mesh).geometry.dispose(); });
  reopened.traverse((node) => { if ((node as THREE.Mesh).isMesh) (node as THREE.Mesh).geometry.dispose(); });
});

test("quality gate blocks lost triangles, gems, invalid geometry and changed bounds", () => {
  const source = makeScene();
  const sourceSnapshot = captureAurumGlbQualitySnapshot(source);
  const damaged = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial());
  damaged.add(mesh);
  const report = evaluateAurumGlbQuality(sourceSnapshot, captureAurumGlbQualitySnapshot(damaged));
  expect(report.status).toBe("failed");
  expect(report.issues.map((issue) => issue.code)).toContain("TRIANGLE_LOSS");
  expect(report.issues.map((issue) => issue.code)).toContain("GEM_MESH_LOSS");
  expect(report.issues.map((issue) => issue.code)).toContain("BOUNDS_CHANGED");
  expect(report.issues.map((issue) => issue.code)).toContain("MESH_COUNT_REDUCED");
  source.traverse((node) => { if ((node as THREE.Mesh).isMesh) (node as THREE.Mesh).geometry.dispose(); });
  mesh.geometry.dispose();
});

test("quality gate accepts an intentional metal union and verifies source provenance round-trip", () => {
  const root = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 });
  metal.name = "Oro 18K";
  const union = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 2), metal);
  union.name = "AURUM · Metal visual union 1";
  union.userData.aurumMetalUnionExperiment = true;
  union.userData.aurumUnionSource = [
    { uuid: "source-body-a", name: "Aro exterior", layerKey: "metal-main" },
    { uuid: "source-body-b", name: "Aro interior", layerKey: "metal-main" },
  ];
  root.add(union);
  const source = captureAurumGlbQualitySnapshot(root);
  const reopened = new THREE.Group();
  const reopenedUnion = new THREE.Mesh(union.geometry.clone(), metal.clone());
  reopenedUnion.userData = structuredClone(union.userData);
  reopened.add(reopenedUnion);
  const report = evaluateAurumGlbQuality(source, captureAurumGlbQualitySnapshot(reopened));
  expect(source.meshCount).toBe(1);
  expect(source.metalUnionMeshCount).toBe(1);
  expect(source.metalUnionSourceCount).toBe(2);
  expect(report.status).toBe("passed");
  expect(report.metalUnionSourceCount).toBe(2);
  const damaged = new THREE.Group();
  const lostProvenance = new THREE.Mesh(union.geometry.clone(), metal.clone());
  damaged.add(lostProvenance);
  const failed = evaluateAurumGlbQuality(source, captureAurumGlbQualitySnapshot(damaged));
  expect(failed.status).toBe("failed");
  expect(failed.issues.map((issue) => issue.code)).toContain("METAL_UNION_PROVENANCE_LOSS");
  for (const scene of [root, reopened, damaged]) scene.traverse((node) => { if ((node as THREE.Mesh).isMesh) (node as THREE.Mesh).geometry.dispose(); });
});

test("quality gate reports named material loss as a warning", () => {
  const source = makeScene();
  const reopened = makeScene();
  reopened.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) (node as THREE.Mesh).material = new THREE.MeshStandardMaterial();
  });
  const report = evaluateAurumGlbQuality(
    captureAurumGlbQualitySnapshot(source),
    captureAurumGlbQualitySnapshot(reopened),
  );
  expect(report.status).toBe("warning");
  expect(report.missingNamedMaterials).toContain("Oro 18K");
  expect(report.missingNamedMaterials).toContain("Esmeralda");
  for (const root of [source, reopened]) root.traverse((node) => { if ((node as THREE.Mesh).isMesh) (node as THREE.Mesh).geometry.dispose(); });
});

test("quality gate blocks missing gem source provenance after GLB round-trip", () => {
  const source = makeScene();
  const reopened = makeScene();
  const sourceSnapshot = captureAurumGlbQualitySnapshot(source);
  const reopenedSnapshot = captureAurumGlbQualitySnapshot(reopened);
  expect(sourceSnapshot.gemSourceCount).toBe(1);
  expect(reopenedSnapshot.gemSourceKeys).toEqual(["rhino-gem-emerald-01"]);
  expect(evaluateAurumGlbQuality(sourceSnapshot, reopenedSnapshot).status).toBe("passed");

  const damaged = makeScene();
  damaged.traverse((node) => {
    if ((node as THREE.Mesh).userData?.aurumGlbGemSource) delete (node as THREE.Mesh).userData.aurumGlbGemSource;
  });
  const report = evaluateAurumGlbQuality(sourceSnapshot, captureAurumGlbQualitySnapshot(damaged));
  expect(report.status).toBe("failed");
  expect(report.issues.map((issue) => issue.code)).toContain("GEM_SOURCE_PROVENANCE_LOSS");
  for (const root of [source, reopened, damaged]) root.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) (node as THREE.Mesh).geometry.dispose();
  });
});

test("quality snapshot ignores hidden meshes and flags non-finite positions", () => {
  const root = new THREE.Group();
  const hidden = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  hidden.visible = false;
  root.add(hidden);
  const invalidGeometry = new THREE.BufferGeometry();
  invalidGeometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, Number.NaN, 1, 0], 3));
  const invalid = new THREE.Mesh(invalidGeometry, new THREE.MeshBasicMaterial());
  root.add(invalid);
  const snapshot = captureAurumGlbQualitySnapshot(root);
  expect(snapshot.meshCount).toBe(1);
  expect(snapshot.invalidPositionMeshes).toBe(1);
  invalidGeometry.dispose();
  hidden.geometry.dispose();
});
