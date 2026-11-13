import { expect, test } from "bun:test";
import * as THREE from "three";
import { createAurumSmartScan } from "../src/lib/aurum/core/smart-scan";

test("smart scan classifies meshes and never runs topology diagnostics", () => {
  const root = new THREE.Group();
  const metal = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  metal.name = "Oro 18k";
  const gem = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  gem.name = "Diamante";
  root.add(metal, gem);
  const report = createAurumSmartScan().inspect(root);
  expect(report.meshCount).toBe(2);
  expect(report.greenCount).toBe(0);
  expect(report.yellowCount).toBe(2);
  expect(report.meshes.map((item) => item.family)).toEqual(["metal", "gema"]);
  expect(report.deepDiagnosticsRecommended).toBe(true);
  metal.geometry.dispose();
  gem.geometry.dispose();
});

test("smart scan reuses unchanged geometry facts and invalidates after attribute update", () => {
  const root = new THREE.Group();
  const geometry = new THREE.BoxGeometry();
  root.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()));
  const scan = createAurumSmartScan();
  const first = scan.inspect(root);
  const second = scan.inspect(root);
  expect(first.scannedGeometries).toBe(1);
  expect(second.scannedGeometries).toBe(0);
  expect(second.cachedGeometryHits).toBe(1);
  geometry.getAttribute("position").needsUpdate = true;
  const third = scan.inspect(root);
  expect(third.scannedGeometries).toBe(1);
  geometry.dispose();
});

test("smart scan marks structurally invalid geometry red", () => {
  const root = new THREE.Group();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3));
  root.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));
  const report = createAurumSmartScan().inspect(root);
  expect(report.redCount).toBe(1);
  expect(report.meshes[0].reasons).toContain("invalid-geometry-structure");
  geometry.dispose();
});
