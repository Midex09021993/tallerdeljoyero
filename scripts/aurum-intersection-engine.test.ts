import { expect, test } from "bun:test";
import * as THREE from "three";
import { createAurumSolidEngine } from "../src/lib/aurum/core/solid-engine";
import { createAurumIntersectionEngine } from "../src/lib/aurum/core/intersection-engine";

function mesh(name: string, geometry: THREE.BufferGeometry, z = 0) {
  const result = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  result.name = name;
  result.position.z = z;
  return result;
}

test("BVH triangle intersection detects a surface crossing a closed solid", () => {
  const root = new THREE.Group();
  root.add(mesh("Solid", new THREE.BoxGeometry(2, 2, 2)), mesh("Crossing surface", new THREE.PlaneGeometry(3, 3)));
  const solid = createAurumSolidEngine().inspect(root);
  const report = createAurumIntersectionEngine().inspect(root, solid);
  expect(report.candidatePairCount).toBe(1);
  expect(report.intersectingPairCount).toBe(1);
  expect(report.pairs[0]?.intersectingTrianglePairs).toBeGreaterThan(0);
  expect(report.pairs[0]?.kind).toBe("surface-penetrates-solid");
  expect(report.truncated).toBe(false);
});

test("BVH triangle intersection detects coplanar boundary contact without calling it penetration", () => {
  const root = new THREE.Group();
  root.add(mesh("Solid", new THREE.BoxGeometry(2, 2, 2)), mesh("Touching sheet", new THREE.PlaneGeometry(2, 2), 1));
  const solid = createAurumSolidEngine().inspect(root);
  const report = createAurumIntersectionEngine().inspect(root, solid);
  expect(report.intersectingPairCount).toBe(1);
  expect(report.pairs[0]?.kind).toBe("surface-boundary-intersection");
  expect(report.pairs[0]?.confidence).toBe("medium");
});

test("intersection classification uses stable body indices when display names repeat", () => {
  const root = new THREE.Group();
  root.add(mesh("Duplicado", new THREE.BoxGeometry(2, 2, 2)), mesh("Duplicado", new THREE.PlaneGeometry(3, 3)));
  const solid = createAurumSolidEngine().inspect(root);
  const report = createAurumIntersectionEngine().inspect(root, solid);
  expect(report.pairs[0]?.kind).toBe("surface-penetrates-solid");
  expect(report.pairs[0]?.samplesInsideB).toBeGreaterThan(0);
});

test("BVH prunes disjoint bodies and enforces triangle-test budget", () => {
  const root = new THREE.Group();
  root.add(mesh("A", new THREE.BoxGeometry()), mesh("B", new THREE.BoxGeometry(), 5));
  const solid = createAurumSolidEngine().inspect(root);
  const report = createAurumIntersectionEngine().inspect(root, solid);
  expect(report.candidatePairCount).toBe(0);
  expect(report.intersectingPairCount).toBe(0);
  expect(report.trianglePairTests).toBe(0);

  const crowded = new THREE.Group();
  crowded.add(mesh("C", new THREE.BoxGeometry(2, 2, 2)), mesh("D", new THREE.BoxGeometry(2, 2, 2)));
  const crowdedSolid = createAurumSolidEngine().inspect(crowded);
  const limited = createAurumIntersectionEngine().inspect(crowded, crowdedSolid, { maxTrianglePairTests: 1 });
  expect(limited.truncated).toBe(true);
  expect(limited.trianglePairTests).toBe(1);
});

test("intersection engine rejects invalid limits and leaves source buffers unchanged", () => {
  const root = new THREE.Group();
  const geometry = new THREE.BoxGeometry();
  const before = Array.from(geometry.getAttribute("position").array);
  root.add(mesh("Body A", geometry), mesh("Body B", new THREE.BoxGeometry()));
  const solid = createAurumSolidEngine().inspect(root);
  expect(() => createAurumIntersectionEngine().inspect(root, solid, { tolerance: 0 })).toThrow();
  expect(() => createAurumIntersectionEngine().inspect(root, solid, { leafSize: 0 })).toThrow();
  expect(Array.from(geometry.getAttribute("position").array)).toEqual(before);
});
