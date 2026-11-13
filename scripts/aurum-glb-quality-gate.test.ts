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
