import * as THREE from "three";

export type OpenBrepIntersectionSegment = {
  start: THREE.Vector3;
  end: THREE.Vector3;
  triangleA: number;
  triangleB: number;
};

export type OpenBrepIntersectionResult = {
  segments: OpenBrepIntersectionSegment[];
  testedPairs: number;
  coplanarPairs: number;
  budgetExceeded: boolean;
};

type TriangleRecord = {
  triangle: THREE.Triangle;
  box: THREE.Box3;
  index: number;
};

const EPSILON = 1e-9;

function triangleRecords(mesh: THREE.Mesh): TriangleRecord[] {
  const geometry = mesh.geometry;
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const count = index?.count ?? position.count;
  const records: TriangleRecord[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const box = new THREE.Box3();

  for (let offset = 0; offset + 2 < count; offset += 3) {
    const ia = index ? index.getX(offset) : offset;
    const ib = index ? index.getX(offset + 1) : offset + 1;
    const ic = index ? index.getX(offset + 2) : offset + 2;
    a.fromBufferAttribute(position, ia).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(position, ib).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(position, ic).applyMatrix4(mesh.matrixWorld);
    const triangle = new THREE.Triangle(a.clone(), b.clone(), c.clone());
    box.setFromPoints([a, b, c]);
    records.push({ triangle, box: box.clone(), index: offset / 3 });
  }
  return records;
}

function planeCut(triangle: THREE.Triangle, plane: THREE.Plane, tolerance: number): THREE.Vector3[] {
  const vertices = [triangle.a, triangle.b, triangle.c];
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < 3; i++) {
    const a = vertices[i]!;
    const b = vertices[(i + 1) % 3]!;
    const da = plane.distanceToPoint(a);
    const db = plane.distanceToPoint(b);
    if (Math.abs(da) <= tolerance) points.push(a.clone());
    if ((da < -tolerance && db > tolerance) || (da > tolerance && db < -tolerance)) {
      const t = da / (da - db);
      points.push(a.clone().lerp(b, t));
    }
  }
  return uniquePoints(points, tolerance);
}

function uniquePoints(points: THREE.Vector3[], tolerance: number): THREE.Vector3[] {
  const result: THREE.Vector3[] = [];
  for (const point of points) {
    if (!result.some((other) => other.distanceToSquared(point) <= tolerance * tolerance)) result.push(point);
  }
  return result;
}

function lineInterval(points: THREE.Vector3[], direction: THREE.Vector3): [number, number] | null {
  if (points.length < 2) return null;
  const values = points.map((point) => point.dot(direction));
  return [Math.min(...values), Math.max(...values)];
}

/**
 * Extracts the exact straight intersection segments between two triangulated
 * surfaces in world space. It does not edit either mesh.
 *
 * This is stage 1 of open-Brep welding: the returned segments are the cutting
 * constraints needed by a later triangle-splitting/reconstruction stage.
 * Coplanar triangle overlaps are counted but deliberately not guessed because
 * they require 2D polygon clipping rather than a unique intersection line.
 */
export function findOpenBrepIntersectionSegments(
  meshA: THREE.Mesh,
  meshB: THREE.Mesh,
  options: { maxTrianglePairs?: number; tolerance?: number } = {},
): OpenBrepIntersectionResult {
  const maxPairs = Math.max(1, Math.floor(options.maxTrianglePairs ?? 250_000));
  const tolerance = Math.max(EPSILON, options.tolerance ?? 1e-8);
  meshA.updateWorldMatrix(true, false);
  meshB.updateWorldMatrix(true, false);

  const trianglesA = triangleRecords(meshA);
  const trianglesB = triangleRecords(meshB);
  const segments: OpenBrepIntersectionSegment[] = [];
  let testedPairs = 0;
  let coplanarPairs = 0;
  let budgetExceeded = false;

  for (const recordA of trianglesA) {
    for (const recordB of trianglesB) {
      if (!recordA.box.intersectsBox(recordB.box)) continue;
      if (testedPairs >= maxPairs) {
        budgetExceeded = true;
        break;
      }
      testedPairs++;

      const normalA = recordA.triangle.getNormal(new THREE.Vector3());
      const normalB = recordB.triangle.getNormal(new THREE.Vector3());
      if (normalA.lengthSq() <= tolerance * tolerance || normalB.lengthSq() <= tolerance * tolerance) continue;

      const direction = normalA.clone().cross(normalB);
      if (direction.lengthSq() <= tolerance * tolerance) {
        const planeDistance = Math.abs(normalA.dot(recordB.triangle.a.clone().sub(recordA.triangle.a)));
        if (planeDistance <= tolerance) coplanarPairs++;
        continue;
      }
      direction.normalize();

      const planeA = new THREE.Plane().setFromNormalAndCoplanarPoint(normalA, recordA.triangle.a);
      const planeB = new THREE.Plane().setFromNormalAndCoplanarPoint(normalB, recordB.triangle.a);
      const cutA = planeCut(recordA.triangle, planeB, tolerance);
      const cutB = planeCut(recordB.triangle, planeA, tolerance);
      const intervalA = lineInterval(cutA, direction);
      const intervalB = lineInterval(cutB, direction);
      if (!intervalA || !intervalB) continue;

      const start = Math.max(intervalA[0], intervalB[0]);
      const end = Math.min(intervalA[1], intervalB[1]);
      if (end - start <= tolerance) continue;

      // Recover points on the common plane-intersection line using the closest
      // point to the origin on that line, then move along its unit direction.
      const linePoint = new THREE.Vector3();
      const linePlane = new THREE.Plane().setFromNormalAndCoplanarPoint(direction, new THREE.Vector3());
      const auxiliary = new THREE.Plane().setFromNormalAndCoplanarPoint(normalA, recordA.triangle.a);
      const intersectionLinePoint = new THREE.Vector3();
      const cross = normalA.clone().cross(normalB);
      const denominator = cross.lengthSq();
      const d1 = -normalA.dot(recordA.triangle.a);
      const d2 = -normalB.dot(recordB.triangle.a);
      intersectionLinePoint.copy(
        normalB.clone().cross(cross).multiplyScalar(-d1)
          .add(cross.clone().cross(normalA).multiplyScalar(-d2))
          .multiplyScalar(1 / denominator),
      );
      linePoint.copy(intersectionLinePoint);
      // Remove numerical drift along the direction before applying interval values.
      const projection = linePoint.dot(direction);
      linePoint.addScaledVector(direction, -projection);
      const p0 = linePoint.clone().addScaledVector(direction, start);
      const p1 = linePoint.clone().addScaledVector(direction, end);
      if (p0.distanceToSquared(p1) > tolerance * tolerance) {
        segments.push({ start: p0, end: p1, triangleA: recordA.index, triangleB: recordB.index });
      }
      void linePlane;
      void auxiliary;
    }
    if (budgetExceeded) break;
  }

  return { segments, testedPairs, coplanarPairs, budgetExceeded };
}
