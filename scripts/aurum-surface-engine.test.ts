import { expect, test } from "bun:test";
import * as THREE from "three";
import { createAurumSurfaceEngine } from "../src/lib/aurum/core/surface-engine";

test("surface engine detects coincident boundary edges and tangent-plane hints without mutating source buffers", () => {
  const root = new THREE.Group();
  const left = new THREE.BufferGeometry();
  left.setAttribute("position", new THREE.Float32BufferAttribute([
    0, 0, 0, 1, 0, 0, 0, 1, 0,
  ], 3));
  left.setIndex([0, 1, 2]);
  const right = new THREE.BufferGeometry();
  right.setAttribute("position", new THREE.Float32BufferAttribute([
    1, 0, 0, 1, 1, 0, 0, 1, 0,
  ], 3));
  right.setIndex([0, 1, 2]);
  const leftMesh = new THREE.Mesh(left, new THREE.MeshBasicMaterial());
  leftMesh.name = "Oro cuerpo A";
  const rightMesh = new THREE.Mesh(right, new THREE.MeshBasicMaterial());
  rightMesh.name = "Oro cuerpo B";
  root.add(leftMesh, rightMesh);

  const beforeLeft = Array.from(left.getAttribute("position").array);
  const beforeRight = Array.from(right.getAttribute("position").array);
  const report = createAurumSurfaceEngine().inspect(root, { tolerance: 1e-6 });

  expect(report.meshCount).toBe(2);
  expect(report.sharedEdgesAcrossBodies).toBe(1);
  expect(report.normalAlignedEdgesAcrossBodies).toBe(1);
  expect(report.normalDiscontinuousEdgesAcrossBodies).toBe(0);
  expect(report.candidateSeamPairs).toHaveLength(1);
  expect(report.candidateSeamPairs[0]).toContain("Oro cuerpo A");
  expect(report.candidateSeamPairs[0]).toContain("Oro cuerpo B");
  expect(Array.from(left.getAttribute("position").array)).toEqual(beforeLeft);
  expect(Array.from(right.getAttribute("position").array)).toEqual(beforeRight);
  left.dispose(); right.dispose();
});

test("surface engine distinguishes coincident edges with different tangent planes", () => {
  const root = new THREE.Group();
  const left = new THREE.BufferGeometry();
  left.setAttribute("position", new THREE.Float32BufferAttribute([
    0, 0, 0, 1, 0, 0, 0, 1, 0,
  ], 3));
  left.setIndex([0, 1, 2]);
  const right = new THREE.BufferGeometry();
  right.setAttribute("position", new THREE.Float32BufferAttribute([
    1, 0, 0, 0, 0, 0, 0, 0, 1,
  ], 3));
  right.setIndex([0, 1, 2]);
  root.add(
    new THREE.Mesh(left, new THREE.MeshBasicMaterial()),
    new THREE.Mesh(right, new THREE.MeshBasicMaterial()),
  );

  const report = createAurumSurfaceEngine().inspect(root, { tolerance: 1e-6 });
  expect(report.sharedEdgesAcrossBodies).toBe(1);
  expect(report.normalAlignedEdgesAcrossBodies).toBe(0);
  expect(report.normalDiscontinuousEdgesAcrossBodies).toBe(1);
  left.dispose(); right.dispose();
});

test("surface engine reports non-manifold edges and excludes hidden ancestors", () => {
  const root = new THREE.Group();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    0, 0, 0, 1, 0, 0, 0, 1, 0,
    1, 0, 0, 0, 0, 0, 0, -1, 0,
    0, 0, 0, 1, 0, 0, 0, 0, 1,
  ], 3));
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  root.add(mesh);
  const hiddenParent = new THREE.Group();
  hiddenParent.visible = false;
  hiddenParent.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
  root.add(hiddenParent);

  const report = createAurumSurfaceEngine().inspect(root);
  expect(report.meshCount).toBe(1);
  expect(report.nonManifoldEdges).toBe(1);
  expect(report.meshes[0]?.nonManifoldEdges).toBe(1);
  expect(() => createAurumSurfaceEngine().inspect(root, { tolerance: 0 })).toThrow();
  expect(() => createAurumSurfaceEngine().inspect(root, { normalAlignmentThreshold: 1.1 })).toThrow();
  geometry.dispose();
});

test("surface engine reports truncation when the diagnostic edge budget is reached", () => {
  const root = new THREE.Group();
  root.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
  const report = createAurumSurfaceEngine().inspect(root, { maxEdges: 1 });
  expect(report.truncated).toBe(true);
  expect(report.boundaryEdges).toBeGreaterThan(1);
});
