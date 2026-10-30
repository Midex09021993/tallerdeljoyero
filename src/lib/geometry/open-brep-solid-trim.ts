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

type SolidProbe = {
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
};

function isClosedSolid(geometry: THREE.BufferGeometry): boolean {
  const position = geometry.getAttribute("position");
  if (!position || position.count < 12) return false;
  const index = geometry.getIndex();
  const count = index?.count ?? position.count;
  if (count % 3 !== 0) return false;

  geometry.computeBoundingBox();
  const diagonal = geometry.boundingBox?.getSize(new THREE.Vector3()).length() ?? 0;
  const tolerance = Math.max(diagonal * 1e-7, 1e-9);
  const vertexKey = (vertex: number) => [
    position.getX(vertex), position.getY(vertex), position.getZ(vertex),
  ].map(value => Math.round(value / tolerance)).join(",");

  const edges = new Map<string, number>();
  for (let offset = 0; offset < count; offset += 3) {
    const ids = [
      index ? index.getX(offset) : offset,
      index ? index.getX(offset + 1) : offset + 1,
      index ? index.getX(offset + 2) : offset + 2,
    ];
    for (let edgeIndex = 0; edgeIndex < 3; edgeIndex++) {
      const a = vertexKey(ids[edgeIndex]!);
      const b = vertexKey(ids[(edgeIndex + 1) % 3]!);
      if (a === b) return false;
      const key = a < b ? a + "|" + b : b + "|" + a;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  return edges.size > 0 && [...edges.values()].every(countForEdge => countForEdge === 2);
}

function splitPolygon(
  polygon: THREE.Vector3[],
  segmentStart: THREE.Vector3,
  segmentEnd: THREE.Vector3,
  polygonNormal: THREE.Vector3,
  epsilon: number,
): THREE.Vector3[][] {
  const lineNormal = segmentEnd.clone().sub(segmentStart).cross(polygonNormal).normalize();
  if (lineNormal.lengthSq() < 1e-20) return [polygon];

  const distances = polygon.map(point => lineNormal.dot(point.clone().sub(segmentStart)));
  if (!distances.some(distance => distance > epsilon) || !distances.some(distance => distance < -epsilon)) {
    return [polygon];
  }

  const positive: THREE.Vector3[] = [];
  const negative: THREE.Vector3[] = [];
  for (let index = 0; index < polygon.length; index++) {
    const current = polygon[index]!;
    const next = polygon[(index + 1) % polygon.length]!;
    const currentDistance = distances[index]!;
    const nextDistance = distances[(index + 1) % polygon.length]!;
    if (currentDistance >= -epsilon) positive.push(current.clone());
    if (currentDistance <= epsilon) negative.push(current.clone());
    if ((currentDistance > epsilon && nextDistance < -epsilon)
      || (currentDistance < -epsilon && nextDistance > epsilon)) {
      const intersection = current.clone().lerp(next, currentDistance / (currentDistance - nextDistance));
      positive.push(intersection.clone());
      negative.push(intersection.clone());
    }
  }

  const clean = (points: THREE.Vector3[]) => points.filter(
    (point, index) => index === 0 || point.distanceTo(points[index - 1]!) > epsilon,
  );
  return [clean(positive), clean(negative)].filter(points => points.length >= 3);
}

function barycentricWeights(
  point: THREE.Vector3,
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
): [number, number, number] {
  const ab = b.clone().sub(a);
  const ac = c.clone().sub(a);
  const ap = point.clone().sub(a);
  const d00 = ab.dot(ab);
  const d01 = ab.dot(ac);
  const d11 = ac.dot(ac);
  const d20 = ap.dot(ab);
  const d21 = ap.dot(ac);
  const denominator = d00 * d11 - d01 * d01;
  if (Math.abs(denominator) < 1e-20) return [1, 0, 0];
  const v = (d11 * d20 - d01 * d21) / denominator;
  const w = (d00 * d21 - d01 * d20) / denominator;
  return [1 - v - w, v, w];
}

function attributeComponent(
  attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  index: number,
  component: number,
): number {
  if (component === 0) return attribute.getX(index);
  if (component === 1) return attribute.getY(index);
  if (component === 2) return attribute.getZ(index);
  if (component === 3) return attribute.getW(index);
  return 0;
}

/** Multi-direction parity avoids classifying a point from a single grazing ray. */
function insideSolid(point: THREE.Vector3, probe: THREE.Mesh, raycaster: THREE.Raycaster, epsilon: number): boolean {
  const directions = [
    new THREE.Vector3(1, 0.371390676, 0.129837).normalize(),
    new THREE.Vector3(-0.217391, 1, 0.413579).normalize(),
    new THREE.Vector3(0.319711, -0.173219, 1).normalize(),
  ];
  let insideVotes = 0;
  for (const direction of directions) {
    raycaster.set(point, direction);
    raycaster.near = epsilon;
    raycaster.far = Infinity;
    const hits = raycaster.intersectObject(probe, false);
    let uniqueHits = 0;
    let previousDistance = -Infinity;
    for (const hit of hits) {
      if (Math.abs(hit.distance - previousDistance) > epsilon * 4) uniqueHits++;
      previousDistance = hit.distance;
    }
    if (uniqueHits % 2 === 1) insideVotes++;
  }
  return insideVotes >= 2;
}

function disposeProbes(probes: SolidProbe[]) {
  for (const probe of probes) {
    probe.geometry.dispose();
    probe.material.dispose();
  }
}

/**
 * Removes the portions of open metal BREP surfaces buried inside the union of
 * intersecting closed metal BREPs. Source Rhino meshes remain untouched.
 */
export function trimOpenBrepSurfacesAgainstSolids(root: THREE.Object3D): OpenBrepTrimResult {
  const result: OpenBrepTrimResult = {
    testedPairs: 0,
    trimmedSurfaces: 0,
    removedTriangles: 0,
    retainedTriangles: 0,
    skippedPairs: 0,
    errors: [],
  };

  root.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  root.traverse(object => {
    const mesh = object as THREE.Mesh;
    const type = String(mesh.userData?.aurumRhinoGeometryType ?? "").toLowerCase();
    if (mesh.isMesh && mesh.visible && mesh.geometry && !Array.isArray(mesh.material) && mesh.material
      && (type === "surface" || type === "brep")
      && mesh.userData?.aurumRhino?.categoria === "metal") meshes.push(mesh);
  });

  const solids = meshes.filter(mesh => isClosedSolid(mesh.geometry));
  const openSurfaces = meshes.filter(mesh => !isClosedSolid(mesh.geometry));
  const raycaster = new THREE.Raycaster();

  for (const open of openSurfaces) {
    if (!open.parent) continue;

    const openWorld = open.geometry.clone();
    openWorld.applyMatrix4(open.matrixWorld);
    const openBox = new THREE.Box3().setFromObject(open);
    const position = openWorld.getAttribute("position");
    const index = openWorld.getIndex();
    if (!position) {
      openWorld.dispose();
      continue;
    }

    const probes: SolidProbe[] = [];
    const segmentsByTriangle = new Map<number, Array<{ start: THREE.Vector3; end: THREE.Vector3 }>>();
    let unsafePair = false;

    for (const solid of solids) {
      if (!solid.parent || !solid.visible || solid === open
        || !openBox.intersectsBox(new THREE.Box3().setFromObject(solid))) continue;

      result.testedPairs++;
      const solidWorld = solid.geometry.clone();
      solidWorld.applyMatrix4(solid.matrixWorld);
      const probeMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      const probe = new THREE.Mesh(solidWorld, probeMaterial);
      probe.updateMatrixWorld(true);

      try {
        const intersection = findOpenBrepIntersectionSegments(
          new THREE.Mesh(openWorld, open.material),
          probe,
          { maxTrianglePairs: 350000, tolerance: 1e-8 },
        );
        if (intersection.budgetExceeded) {
          result.skippedPairs++;
          unsafePair = true;
          solidWorld.dispose();
          probeMaterial.dispose();
          break;
        }

        probes.push({ mesh: probe, geometry: solidWorld, material: probeMaterial });
        for (const segment of intersection.segments) {
          const list = segmentsByTriangle.get(segment.triangleA) ?? [];
          list.push({ start: segment.start, end: segment.end });
          segmentsByTriangle.set(segment.triangleA, list);
        }
      } catch (error) {
        result.skippedPairs++;
        result.errors.push(error instanceof Error ? error.message : String(error));
        solidWorld.dispose();
        probeMaterial.dispose();
        unsafePair = true;
        break;
      }
    }

    if (unsafePair || probes.length === 0) {
      disposeProbes(probes);
      openWorld.dispose();
      continue;
    }

    const output: number[] = [];
    const interpolatedAttributes = new Map<string, number[]>();
    for (const name of ["normal", "uv", "uv1", "color", "tangent"]) {
      if (openWorld.getAttribute(name)) interpolatedAttributes.set(name, []);
    }

    let removed = 0;
    let retained = 0;
    let hadInterior = false;
    const triangleCount = Math.floor((index?.count ?? position.count) / 3);
    const epsilon = Math.max(openBox.getSize(new THREE.Vector3()).length() * 1e-9, 1e-9);

    for (let triangle = 0; triangle < triangleCount; triangle++) {
      const offset = triangle * 3;
      const sourceIds = index
        ? [index.getX(offset), index.getX(offset + 1), index.getX(offset + 2)]
        : [offset, offset + 1, offset + 2];
      const a = new THREE.Vector3().fromBufferAttribute(position, sourceIds[0]!);
      const b = new THREE.Vector3().fromBufferAttribute(position, sourceIds[1]!);
      const c = new THREE.Vector3().fromBufferAttribute(position, sourceIds[2]!);
      const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      let polygons: THREE.Vector3[][] = [[a, b, c]];

      for (const segment of segmentsByTriangle.get(triangle) ?? []) {
        const next: THREE.Vector3[][] = [];
        for (const polygon of polygons) {
          next.push(...splitPolygon(polygon, segment.start, segment.end, normal, epsilon));
        }
        polygons = next;
      }

      let triangleWasCut = false;
      for (const polygon of polygons) {
        const center = polygon.reduce(
          (sum, point) => sum.add(point),
          new THREE.Vector3(),
        ).multiplyScalar(1 / polygon.length);

        // A point is removed if it lies inside any matching solid, not merely
        // the first solid encountered. This evaluates the union of penetrators.
        if (probes.some(probe => insideSolid(center, probe.mesh, raycaster, epsilon))) {
          triangleWasCut = true;
          hadInterior = true;
          continue;
        }

        for (let vertexIndex = 1; vertexIndex < polygon.length - 1; vertexIndex++) {
          const vertices = [polygon[0]!, polygon[vertexIndex]!, polygon[vertexIndex + 1]!];
          for (const vertex of vertices) {
            output.push(...vertex.toArray());
            const weights = barycentricWeights(vertex, a, b, c);
            for (const [name, values] of interpolatedAttributes) {
              const attribute = openWorld.getAttribute(name);
              if (!attribute) continue;
              for (let component = 0; component < attribute.itemSize; component++) {
                values.push(
                  attributeComponent(attribute, sourceIds[0]!, component) * weights[0]
                  + attributeComponent(attribute, sourceIds[1]!, component) * weights[1]
                  + attributeComponent(attribute, sourceIds[2]!, component) * weights[2],
                );
              }
            }
          }
          retained++;
        }
      }
      if (triangleWasCut) removed++;
    }

    disposeProbes(probes);
    if (!hadInterior || removed === 0) {
      openWorld.dispose();
      continue;
    }

    // If the entire open surface is buried, hide the derived source mesh; do
    // not create an invalid empty replacement geometry.
    if (retained === 0) {
      open.visible = false;
      open.userData = { ...open.userData, aurumOpenBrepTrimSourceHidden: true };
      result.trimmedSurfaces++;
      result.removedTriangles += removed;
      openWorld.dispose();
      continue;
    }

    const trimmed = new THREE.BufferGeometry();
    trimmed.setAttribute("position", new THREE.Float32BufferAttribute(output, 3));
    for (const [name, values] of interpolatedAttributes) {
      const sourceAttribute = openWorld.getAttribute(name);
      if (sourceAttribute && values.length) {
        trimmed.setAttribute(name, new THREE.Float32BufferAttribute(values, sourceAttribute.itemSize));
      }
    }

    const normals = trimmed.getAttribute("normal");
    if (normals) {
      for (let vertex = 0; vertex < normals.count; vertex++) {
        const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex).normalize();
        normals.setXYZ(vertex, normal.x, normal.y, normal.z);
      }
    } else {
      trimmed.computeVertexNormals();
    }

    trimmed.computeBoundingBox();
    trimmed.computeBoundingSphere();
    if (!trimmed.boundingBox || !Number.isFinite(trimmed.boundingSphere?.radius ?? NaN)) {
      trimmed.dispose();
      openWorld.dispose();
      result.skippedPairs++;
      continue;
    }

    open.parent.updateWorldMatrix(true, false);
    trimmed.applyMatrix4(open.parent.matrixWorld.clone().invert());
    const replacement = new THREE.Mesh(trimmed, open.material);
    replacement.name = open.name + " · BREP recortado";
    replacement.userData = {
      ...open.userData,
      aurumOpenBrepTrimmed: true,
      aurumOriginalPreserved: true,
    };
    replacement.castShadow = open.castShadow;
    replacement.receiveShadow = open.receiveShadow;
    open.parent.add(replacement);
    open.visible = false;
    open.userData = { ...open.userData, aurumOpenBrepTrimSourceHidden: true };

    result.trimmedSurfaces++;
    result.removedTriangles += removed;
    result.retainedTriangles += retained;
    openWorld.dispose();
  }

  root.updateMatrixWorld(true);
  return result;
}
