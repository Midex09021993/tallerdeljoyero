import * as THREE from "three";
import { findOpenBrepIntersectionSegments } from "../geometry/open-brep-intersection";

export type AurumOpenBrepTrimResult = {
  testedPairs: number;
  trimmedSurfaces: number;
  removedTriangles: number;
  retainedTriangles: number;
  skippedPairs: number;
  errors: string[];
};

function isClosedSolid(geometry: THREE.BufferGeometry): boolean {
  const p = geometry.getAttribute("position");
  if (!p || p.count < 12) return false;
  const index = geometry.getIndex();
  const count = index?.count ?? p.count;
  if (count % 3 !== 0) return false;
  geometry.computeBoundingBox();
  const diagonal = geometry.boundingBox?.getSize(new THREE.Vector3()).length() ?? 1;
  const tol = Math.max(diagonal * 1e-7, 1e-9);
  const key = (i: number) => [p.getX(i), p.getY(i), p.getZ(i)].map(v => Math.round(v / tol)).join(",");
  const edges = new Map<string, number>();
  for (let i = 0; i < count; i += 3) {
    const ids = [index ? index.getX(i) : i, index ? index.getX(i + 1) : i + 1, index ? index.getX(i + 2) : i + 2];
    for (let j = 0; j < 3; j++) {
      const a = key(ids[j]!), b = key(ids[(j + 1) % 3]!);
      if (a === b) return false;
      const edge = a < b ? a + "|" + b : b + "|" + a;
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    }
  }
  return edges.size > 0 && [...edges.values()].every(n => n === 2);
}

function splitPolygon(poly: THREE.Vector3[], a: THREE.Vector3, b: THREE.Vector3, normal: THREE.Vector3, epsilon: number): THREE.Vector3[][] {
  const lineNormal = b.clone().sub(a).cross(normal).normalize();
  if (lineNormal.lengthSq() < 1e-20) return [poly];
  const distances = poly.map(p => lineNormal.dot(p.clone().sub(a)));
  if (!distances.some(d => d > epsilon) || !distances.some(d => d < -epsilon)) return [poly];
  const positive: THREE.Vector3[] = [], negative: THREE.Vector3[] = [];
  for (let i = 0; i < poly.length; i++) {
    const current = poly[i]!, next = poly[(i + 1) % poly.length]!;
    const dc = distances[i]!, dn = distances[(i + 1) % poly.length]!;
    if (dc >= -epsilon) positive.push(current.clone());
    if (dc <= epsilon) negative.push(current.clone());
    if ((dc > epsilon && dn < -epsilon) || (dc < -epsilon && dn > epsilon)) {
      const point = current.clone().lerp(next, dc / (dc - dn));
      positive.push(point.clone());
      negative.push(point.clone());
    }
  }
  const clean = (points: THREE.Vector3[]) => points.filter((p, i) => i === 0 || p.distanceTo(points[i - 1]!) > epsilon);
  const result = [clean(positive), clean(negative)].filter(points => points.length >= 3);
  return result.length ? result : [poly];
}

function insideSolid(point: THREE.Vector3, probe: THREE.Mesh, raycaster: THREE.Raycaster): boolean {
  const direction = new THREE.Vector3(1, 0.371390676, 0.129837).normalize();
  const origin = point.clone().addScaledVector(direction, -1e6);
  raycaster.set(origin, direction);
  raycaster.near = 0;
  raycaster.far = 2e6;
  const hits = raycaster.intersectObject(probe, false);
  let unique = 0;
  let previous = -Infinity;
  for (const hit of hits) {
    if (Math.abs(hit.distance - previous) > 1e-7) unique++;
    previous = hit.distance;
  }
  return unique % 2 === 1;
}

/**
 * Trims an open Rhino BREP surface where it penetrates a closed metal BREP.
 * It retains only the exterior fragments of the open surface. The solid stays
 * unchanged; source meshes are hidden only after a valid replacement exists.
 * The original 3DM is never modified.
 */
export function trimAurumOpenBrepsAgainstSolids(root: THREE.Object3D): AurumOpenBrepTrimResult {
  const result: AurumOpenBrepTrimResult = { testedPairs: 0, trimmedSurfaces: 0, removedTriangles: 0, retainedTriangles: 0, skippedPairs: 0, errors: [] };
  root.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  root.traverse(o => {
    const m = o as THREE.Mesh;
    const type = String(m.userData?.aurumRhinoGeometryType ?? "").toLowerCase();
    if (m.isMesh && m.visible && m.geometry && m.material && !Array.isArray(m.material)
      && (type === "surface" || type === "brep") && m.userData?.aurumRhino?.categoria === "metal") meshes.push(m);
  });
  const solids = meshes.filter(m => isClosedSolid(m.geometry));
  const opens = meshes.filter(m => !isClosedSolid(m.geometry));
  const raycaster = new THREE.Raycaster();
  const epsilon = 1e-8;

  for (const open of opens) {
    const layer = String(open.userData?.aurumRhino?.layerKey ?? "");
    if (!layer || !open.parent) continue;
    const openWorld = open.geometry.clone();
    openWorld.applyMatrix4(open.matrixWorld);
    openWorld.computeBoundingBox();
    const openBox = new THREE.Box3().setFromObject(open);
    let selectedSolid: THREE.Mesh | null = null;
    let selectedSegments: ReturnType<typeof findOpenBrepIntersectionSegments>["segments"] = [];
    let selectedProbe: THREE.Mesh | null = null;

    for (const solid of solids) {
      if (!solid.parent || solid === open || String(solid.userData?.aurumRhino?.layerKey ?? "") !== layer) continue;
      if (!openBox.intersectsBox(new THREE.Box3().setFromObject(solid))) continue;
      result.testedPairs++;
      try {
        const solidWorld = solid.geometry.clone();
        solidWorld.applyMatrix4(solid.matrixWorld);
        const solidProbe = new THREE.Mesh(solidWorld, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
        solidProbe.updateMatrixWorld(true);
        const intersection = findOpenBrepIntersectionSegments(
          new THREE.Mesh(openWorld, open.material),
          solidProbe,
          { maxTrianglePairs: 350000, tolerance: epsilon },
        );
        if (intersection.budgetExceeded || intersection.segments.length === 0) {
          solidWorld.dispose();
          (solidProbe.material as THREE.Material).dispose();
          result.skippedPairs++;
          continue;
        }
        selectedSolid = solid;
        selectedSegments = intersection.segments;
        selectedProbe = solidProbe;
        break;
      } catch (error) {
        result.errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    if (!selectedSolid || !selectedProbe || selectedSegments.length === 0) {
      openWorld.dispose();
      continue;
    }

    try {
      const p = openWorld.getAttribute("position");
      const idx = openWorld.getIndex();
      const triangleCount = Math.floor((idx?.count ?? p.count) / 3);
      const byTriangle = new Map<number, typeof selectedSegments>();
      for (const segment of selectedSegments) {
        const list = byTriangle.get(segment.triangleA) ?? [];
        list.push(segment);
        byTriangle.set(segment.triangleA, list);
      }
      const output: number[] = [];
      let removed = 0, retained = 0;
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      for (let t = 0; t < triangleCount; t++) {
        const ia = idx ? idx.getX(t * 3) : t * 3;
        const ib = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
        const ic = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
        a.fromBufferAttribute(p, ia); b.fromBufferAttribute(p, ib); c.fromBufferAttribute(p, ic);
        const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
        let polygons: THREE.Vector3[][] = [[a.clone(), b.clone(), c.clone()]];
        for (const segment of byTriangle.get(t) ?? []) {
          const next: THREE.Vector3[][] = [];
          for (const polygon of polygons) next.push(...splitPolygon(polygon, segment.start, segment.end, normal, epsilon));
          polygons = next;
        }
        let removedThisTriangle = false;
        for (const polygon of polygons) {
          const centroid = polygon.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / polygon.length);
          if (insideSolid(centroid, selectedProbe, raycaster)) {
            removedThisTriangle = true;
            continue;
          }
          for (let i = 1; i < polygon.length - 1; i++) {
            output.push(...polygon[0]!.toArray(), ...polygon[i]!.toArray(), ...polygon[i + 1]!.toArray());
            retained++;
          }
        }
        if (removedThisTriangle) removed++;
      }
      if (retained === 0 || removed === 0) {
        result.skippedPairs++;
        continue;
      }
      const trimmed = new THREE.BufferGeometry();
      trimmed.setAttribute("position", new THREE.Float32BufferAttribute(output, 3));
      // Intersection calculations run in world space; convert the replacement
      // back into the original parent coordinate system before inserting it.
      open.parent!.updateWorldMatrix(true, false);
      trimmed.applyMatrix4(open.parent!.matrixWorld.clone().invert());
      trimmed.computeVertexNormals();
      trimmed.computeBoundingBox();
      trimmed.computeBoundingSphere();
      if (!trimmed.getAttribute("position") || !trimmed.boundingBox || !Number.isFinite(trimmed.boundingSphere?.radius ?? NaN)) {
        trimmed.dispose();
        throw new Error("El recorte BREP produjo geometría inválida.");
      }
      const replacement = new THREE.Mesh(trimmed, open.material);
      replacement.name = open.name + " · BREP recortado";
      replacement.position.set(0, 0, 0);
      replacement.quaternion.identity();
      replacement.scale.set(1, 1, 1);
      replacement.userData = { ...open.userData, aurumOpenBrepTrimmed: true, aurumTrimmedAgainst: selectedSolid.uuid, aurumOriginalPreserved: true };
      open.parent.add(replacement);
      open.visible = false;
      open.userData = { ...open.userData, aurumOpenBrepTrimSourceHidden: true };
      result.trimmedSurfaces++;
      result.removedTriangles += removed;
      result.retainedTriangles += retained;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    } finally {
      openWorld.dispose();
      selectedProbe.geometry.dispose();
      (selectedProbe.material as THREE.Material).dispose();
    }
  }
  root.updateMatrixWorld(true);
  return result;
}
