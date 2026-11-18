import { expect, test } from "bun:test";
import * as THREE from "three";
import { createAurumSolidEngine } from "../src/lib/aurum/core/solid-engine";

function makeMesh(name: string, geometry: THREE.BufferGeometry, position?: THREE.Vector3) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  mesh.name = name;
  if (position) mesh.position.copy(position);
  return mesh;
}

test("solid engine classifies watertight solids and open surfaces without mutating geometry", () => {
  const root = new THREE.Group();
  const box = new THREE.BoxGeometry(2, 2, 2);
  const plane = new THREE.PlaneGeometry(4, 4);
  root.add(makeMesh("Metal solid", box), makeMesh("Guide surface", plane, new THREE.Vector3(0, 0, 2)));
  const before = Array.from(box.getAttribute("position").array);
  const report = createAurumSolidEngine().inspect(root);
  expect(report.bodyCount).toBe(2);
  expect(report.closedSolidCount).toBe(1);
  expect(report.openSurfaceCount).toBe(1);
  expect(report.bodies[0]?.kind).toBe("closed-solid");
  expect(report.bodies[1]?.kind).toBe("open-surface");
  expect(Array.from(box.getAttribute("position").array)).toEqual(before);
  box.dispose(); plane.dispose();
});

test("solid engine detects a surface crossing a closed solid", () => {
  const root = new THREE.Group();
  root.add(
    makeMesh("Ring body", new THREE.BoxGeometry(2, 2, 2)),
    makeMesh("Cutting surface", new THREE.PlaneGeometry(3, 3), new THREE.Vector3(0, 0, 0)),
  );
  const report = createAurumSolidEngine().inspect(root, { maxSamplesPerBody: 96 });
  expect(report.relations).toHaveLength(1);
  expect(["surface-penetrates-solid", "surface-contained-in-solid"]).toContain(report.relations[0]?.kind);
  expect(report.relations[0]?.confidence).toBe("medium");
});

test("solid engine identifies disjoint solids and conservative unresolved overlaps", () => {
  const root = new THREE.Group();
  root.add(
    makeMesh("A", new THREE.BoxGeometry(1, 1, 1)),
    makeMesh("B", new THREE.BoxGeometry(1, 1, 1), new THREE.Vector3(4, 0, 0)),
  );
  const report = createAurumSolidEngine().inspect(root);
  expect(report.relations).toHaveLength(0);
  expect(report.totalPossiblePairs).toBe(1);
  expect(report.candidatePairCount).toBe(0);
  expect(report.prunedPairCount).toBe(1);
  expect(report.unresolvedRelationCount).toBe(0);
});

test("solid engine excludes hidden ancestors and validates diagnostic limits", () => {
  const root = new THREE.Group();
  const hidden = new THREE.Group();
  hidden.visible = false;
  hidden.add(makeMesh("Hidden", new THREE.BoxGeometry()));
  root.add(hidden);
  expect(createAurumSolidEngine().inspect(root).bodyCount).toBe(0);
  expect(() => createAurumSolidEngine().inspect(root, { tolerance: 0 })).toThrow();
  expect(() => createAurumSolidEngine().inspect(root, { maxPairs: 0 })).toThrow();
});
