import { expect, test } from "bun:test";
import * as THREE from "three";
import { applyAurumFastVisualMerge } from "../src/lib/aurum/fast-visual-merge";

function metalMesh(name: string, geometry: THREE.BufferGeometry, material: THREE.Material) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.userData.aurumRhino = { categoria: "metal", layerKey: "metal-main" };
  return mesh;
}

test("Fast Visual Merge consolidates compatible same-material metal meshes and preserves sources", () => {
  const root = new THREE.Group();
  const parent = new THREE.Group();
  root.add(parent);
  const material = new THREE.MeshStandardMaterial({ color: "gold" });
  const first = metalMesh("Aro", new THREE.BoxGeometry(1, 1, 1), material);
  const second = metalMesh("Engaste", new THREE.BoxGeometry(0.5, 0.5, 0.5), material);
  second.position.x = 2;
  parent.add(first, second);

  const report = applyAurumFastVisualMerge(root);
  const replacement = parent.children.find((child) => child.userData.aurumFastVisualMerge === true) as THREE.Mesh;

  expect(report.mergedGroups).toBe(1);
  expect(report.mergedMeshes).toBe(2);
  expect(report.preservedSources).toBe(2);
  expect(first.visible).toBe(false);
  expect(second.visible).toBe(false);
  expect(replacement).toBeDefined();
  expect(replacement.geometry.getAttribute("position").count).toBe(48);
  expect(replacement.geometry.getAttribute("normal")).toBeDefined();
  expect(replacement.geometry.getAttribute("uv")).toBeDefined();
  expect(replacement.geometry.boundingBox?.max.x).toBeGreaterThan(2);

  first.geometry.dispose();
  second.geometry.dispose();
  replacement.geometry.dispose();
  material.dispose();
});

test("Fast Visual Merge excludes gemstones and keeps different materials in separate groups", () => {
  const root = new THREE.Group();
  const metalA = new THREE.MeshStandardMaterial({ color: "gold" });
  const metalB = new THREE.MeshStandardMaterial({ color: "silver" });
  const gemMaterial = new THREE.MeshPhysicalMaterial({ color: "green", transmission: 0.9 });
  const a = metalMesh("Metal A", new THREE.BoxGeometry(), metalA);
  const b = metalMesh("Metal B", new THREE.BoxGeometry(), metalB);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(), gemMaterial);
  gem.userData.aurumRhino = { categoria: "gema" };
  root.add(a, b, gem);

  const report = applyAurumFastVisualMerge(root);
  expect(report.mergedGroups).toBe(0);
  expect(report.mergedMeshes).toBe(0);
  expect(a.visible).toBe(true);
  expect(b.visible).toBe(true);
  expect(gem.visible).toBe(true);
  expect(root.children.some((child) => child.userData.aurumFastVisualMerge === true)).toBe(false);

  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh) mesh.geometry.dispose();
  });
  metalA.dispose();
  metalB.dispose();
  gemMaterial.dispose();
});

test("Fast Visual Merge falls back without hiding sources when attribute layouts differ", () => {
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial();
  const a = metalMesh("With UV", new THREE.BoxGeometry(), material);
  const bGeometry = new THREE.BoxGeometry();
  bGeometry.deleteAttribute("uv");
  const b = metalMesh("Without UV", bGeometry, material);
  root.add(a, b);

  const report = applyAurumFastVisualMerge(root);
  expect(report.skippedGroups).toBe(1);
  expect(report.mergedGroups).toBe(0);
  expect(a.visible).toBe(true);
  expect(b.visible).toBe(true);
  expect(root.children).toHaveLength(2);

  a.geometry.dispose();
  b.geometry.dispose();
  material.dispose();
});
