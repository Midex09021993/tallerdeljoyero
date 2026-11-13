import { expect, test } from "bun:test";
import * as THREE from "three";
import { createAurumSurfaceEngine } from "../src/lib/aurum/core/surface-engine";

test("surface engine detects coincident boundary edges across separate bodies without mutation", () => {
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
  expect(report.candidateSeamPairs).toHaveLength(1);
  expect(report.candidateSeamPairs[0]).toContain("Oro cuerpo A");
  expect(report.candidateSeamPairs[0]).toContain("Oro cuerpo B");
  expect(Array.from(left.getAttribute("position").array)).toEqual(beforeLeft);
  expect(Array.from(right.getAttribute("position").array)).toEqual(beforeRight);
  left.dispose(); right.dispose();
});

test("surface engine skips hidden bodies and validates tolerance", () => {
  const root = new THREE.Group();
  const hidden = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  hidden.visible = false;
  root.add(hidden);
  expect(createAurumSurfaceEngine().inspect(root).meshCount).toBe(0);
  expect(() => createAurumSurfaceEngine().inspect(root, { tolerance: 0 })).toThrow();
  hidden.geometry.dispose();
});
