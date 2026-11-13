import { expect, test } from "bun:test";
import * as THREE from "three";
import { applyAurumVisualWeld } from "../src/lib/aurum/visual-weld";

function geometryFromTriangles(points: number[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  return geometry;
}

test("visual weld smooths coincident corners across a shallow seam without moving positions", () => {
  const geometry = geometryFromTriangles([
    0, 0, 0,  1, 0, 0,  0, 1, 0,
    0, 0, 0,  0, 1, 0,  -0.5, 0.8660254, 0.2886751,
  ]);
  const before = Array.from(geometry.getAttribute("position").array);
  const result = applyAurumVisualWeld(geometry, { creaseAngle: Math.PI / 3 });
  const normal = result.geometry.getAttribute("normal");
  expect(normal.getX(0)).toBeCloseTo(normal.getX(3), 5);
  expect(normal.getY(0)).toBeCloseTo(normal.getY(3), 5);
  expect(normal.getZ(0)).toBeCloseTo(normal.getZ(3), 5);
  expect(Array.from(result.geometry.getAttribute("position").array)).toEqual(before);
  expect(result.report.smoothedCornerCount).toBeGreaterThan(0);
  geometry.dispose();
  result.geometry.dispose();
});

test("visual weld preserves a sharp crease above the configured angle", () => {
  const geometry = geometryFromTriangles([
    0, 0, 0,  1, 0, 0,  0, 1, 0,
    0, 0, 0,  0, 1, 0,  0, 0, 1,
  ]);
  const result = applyAurumVisualWeld(geometry, { creaseAngle: Math.PI / 4 });
  const normal = result.geometry.getAttribute("normal");
  expect(normal.getZ(0)).toBeCloseTo(1, 5);
  expect(normal.getX(3)).toBeCloseTo(1, 5);
  expect(normal.getY(3)).toBeCloseTo(0, 5);
  geometry.dispose();
  result.geometry.dispose();
});

test("visual weld keeps UV attributes and does not bridge a spatial gap", () => {
  const geometry = geometryFromTriangles([
    0, 0, 0,  1, 0, 0,  0, 1, 0,
    0, 0.001, 0,  0, 1.001, 0,  -0.5, 0.8660254, 0.5,
  ]);
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute([
    0, 0, 1, 0, 0, 1, 0.25, 0.25, 0, 1, 1, 1,
  ], 2));
  const result = applyAurumVisualWeld(geometry, { tolerance: 1e-5 });
  expect(result.geometry.getAttribute("uv").count).toBe(6);
  expect(result.report.matchedCornerCount).toBe(0);
  geometry.dispose();
  result.geometry.dispose();
});
