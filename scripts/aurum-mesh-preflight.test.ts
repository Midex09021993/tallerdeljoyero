import { expect, test } from "bun:test";
import * as THREE from "three";
import { inspectAurumMesh } from "../src/lib/aurum/mesh-preflight";

function geometryWithFaces(
  positions: number[],
  indices: number[],
  includeNormals = true,
) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  if (includeNormals) {
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(new Array(positions.length).fill(0), 3),
    );
  }
  return geometry;
}

test("AURUM mesh preflight identifies an open triangle without changing geometry", () => {
  const geometry = geometryWithFaces(
    [0, 0, 0, 1, 0, 0, 0, 1, 0],
    [0, 1, 2],
  );
  const before = Array.from(geometry.getIndex()!.array);
  const result = inspectAurumMesh(geometry);

  expect(result.vertices).toBe(3);
  expect(result.triangles).toBe(1);
  expect(result.boundaryEdges).toBe(3);
  expect(result.nonManifoldEdges).toBe(0);
  expect(result.renderReady).toBe(true);
  expect(Array.from(geometry.getIndex()!.array)).toEqual(before);
  geometry.dispose();
});

test("AURUM mesh preflight recognizes a closed tetrahedral surface", () => {
  const geometry = geometryWithFaces(
    [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
    [0, 2, 1, 0, 1, 3, 1, 2, 3, 2, 0, 3],
  );
  const result = inspectAurumMesh(geometry);

  expect(result.boundaryEdges).toBe(0);
  expect(result.nonManifoldEdges).toBe(0);
  expect(result.degenerateTriangles).toBe(0);
  expect(result.normalsValid).toBe(true);
  expect(result.renderReady).toBe(true);
  geometry.dispose();
});

test("AURUM mesh preflight flags non-manifold edges and degenerate faces", () => {
  const geometry = geometryWithFaces(
    [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0],
    [0, 1, 2, 1, 0, 3, 0, 1, 4],
  );
  const result = inspectAurumMesh(geometry);

  expect(result.nonManifoldEdges).toBe(1);
  expect(result.degenerateTriangles).toBe(1);
  expect(result.renderReady).toBe(false);
  geometry.dispose();
});

test("AURUM mesh preflight reports missing or mismatched normals", () => {
  const geometry = geometryWithFaces(
    [0, 0, 0, 1, 0, 0, 0, 1, 0],
    [0, 1, 2],
    false,
  );
  const result = inspectAurumMesh(geometry);

  expect(result.normalCount).toBe(0);
  expect(result.normalsValid).toBe(false);
  geometry.dispose();
});
