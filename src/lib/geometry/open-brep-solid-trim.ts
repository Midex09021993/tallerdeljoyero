import * as THREE from "three";
import { findOpenBrepIntersectionSegments } from "./open-brep-intersection";

export type OpenBrepTrimResult = {
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
  const tolerance = Math.max((geometry.boundingBox?.getSize(new THREE.Vector3()).length() ?? 0) * 1e-7, 1e-9);
  const key = (i: number) => [p.getX(i), p.getY(i), p.getZ(i)].map(v => Math.round(v / tolerance)).join(",");
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
      positive.push(point.clone()); negative.push(point.clone());
    }
  }
  const clean = (points: THREE.Vector3[]) => points.filter((p, i) => i === 0 || p.distanceTo(points[i - 1]!) > epsilon);
  return [clean(positive), clean(negative)].filter(points => points.length >= 3);
}

function insideSolid(point: THREE.Vector3, probe: THREE.Mesh, raycaster: THREE.Raycaster): boolean {
  const direction = new THREE.Vector3(1, 0.371390676, 0.129837).normalize();
  raycaster.set(point, direction);
  raycaster.near = 1e-7;
  raycaster.far = Infinity;
  const hits = raycaster.intersectObject(probe, false);
  let unique = 0, previous = -Infinity;
  for (const hit of hits) {
    if (Math.abs(hit.distance - previous) > 1e-7) unique++;
    previous = hit.distance;
  }
  return unique % 2 === 1;
}

/** Removes only the portions of an open metal BREP surface buried inside a penetrating closed metal BREP. */
export function trimOpenBrepSurfacesAgainstSolids(root: THREE.Object3D): OpenBrepTrimResult {
  const result: OpenBrepTrimResult = { testedPairs: 0, trimmedSurfaces: 0, removedTriangles: 0, retainedTriangles: 0, skippedPairs: 0, errors: [] };
  root.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  root.traverse(o => {
    const m = o as THREE.Mesh;
    const type = String(m.userData?.aurumRhinoGeometryType ?? "").toLowerCase();
    if (m.isMesh && m.visible && m.geometry && !Array.isArray(m.material) && m.material
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
    const openBox = new THREE.Box3().setFromObject(open);
    const output: number[] = [];
    let removed = 0, retained = 0;
    let selected = false;

    for (const solid of solids) {
      if (!solid.parent || !solid.visible || solid === open
        || String(solid.userData?.aurumRhino?.layerKey ?? "") !== layer
        || !openBox.intersectsBox(new THREE.Box3().setFromObject(solid))) continue;
      result.testedPairs++;
      try {
        const solidWorld = solid.geometry.clone();
        solidWorld.applyMatrix4(solid.matrixWorld);
        const probe = new THREE.Mesh(solidWorld, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
        probe.updateMatrixWorld(true);
        const intersection = findOpenBrepIntersectionSegments(
          new THREE.Mesh(openWorld, open.material), probe,
          { maxTrianglePairs: 350000, tolerance: epsilon },
        );
        if (intersection.budgetExceeded || intersection.segments.length === 0) {
          result.skippedPairs++;
          solidWorld.dispose(); (probe.material as THREE.Material).dispose();
          continue;
        }
        selected = true;
        const p = openWorld.getAttribute("position");
        const index = openWorld.getIndex();
        const count = Math.floor((index?.count ?? p.count) / 3);
        const byTriangle = new Map<number, typeof intersection.segments>();
        for (const segment of intersection.segments) {
          const list = byTriangle.get(segment.triangleA) ?? [];
          list.push(segment); byTriangle.set(segment.triangleA, list);
        }
        for (let t = 0; t < count; t++) {
          const ids = index ? [index.getX(t * 3), index.getX(t * 3 + 1), index.getX(t * 3 + 2)] : [t * 3, t * 3 + 1, t * 3 + 2];
          const a = new THREE.Vector3().fromBufferAttribute(p, ids[0]!);
          const b = new THREE.Vector3().fromBufferAttribute(p, ids[1]!);
          const c = new THREE.Vector3().fromBufferAttribute(p, ids[2]!);
          const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
          let polygons: THREE.Vector3[][] = [[a, b, c]];
          for (const segment of byTriangle.get(t) ?? []) {
            const next: THREE.Vector3[][] = [];
            for (const polygon of polygons) next.push(...splitPolygon(polygon, segment.start, segment.end, normal, epsilon));
            polygons = next;
          }
          let cut = false;
          for (const polygon of polygons) {
            const center = polygon.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / polygon.length);
            if (insideSolid(center, probe, raycaster)) { cut = true; continue; }
            for (let i = 1; i < polygon.length - 1; i++) {
              output.push(...polygon[0]!.toArray(), ...polygon[i]!.toArray(), ...polygon[i + 1]!.toArray());
              retained++;
            }
          }
          if (cut) removed++;
        }
        solidWorld.dispose(); (probe.material as THREE.Material).dispose();
        break;
      } catch (error) {
        result.errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    if (!selected || removed === 0 || retained === 0) { openWorld.dispose(); continue; }
    const trimmed = new THREE.BufferGeometry();
    trimmed.setAttribute("position", new THREE.Float32BufferAttribute(output, 3));
    trimmed.computeVertexNormals(); trimmed.computeBoundingBox(); trimmed.computeBoundingSphere();
    if (!trimmed.boundingBox || !Number.isFinite(trimmed.boundingSphere?.radius ?? NaN)) {
      trimmed.dispose(); openWorld.dispose(); result.skippedPairs++; continue;
    }
    open.parent.updateWorldMatrix(true, false);
    trimmed.applyMatrix4(open.parent.matrixWorld.clone().invert());
    const replacement = new THREE.Mesh(trimmed, open.material);
    replacement.name = open.name + " · BREP recortado";
    replacement.userData = { ...open.userData, aurumOpenBrepTrimmed: true, aurumOriginalPreserved: true };
    replacement.castShadow = open.castShadow; replacement.receiveShadow = open.receiveShadow;
    open.parent.add(replacement);
    open.visible = false;
    open.userData = { ...open.userData, aurumOpenBrepTrimSourceHidden: true };
    result.trimmedSurfaces++; result.removedTriangles += removed; result.retainedTriangles += retained;
    openWorld.dispose();
  }
  root.updateMatrixWorld(true);
  return result;
}
