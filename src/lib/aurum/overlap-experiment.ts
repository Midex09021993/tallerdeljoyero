import * as THREE from "three";

export type AurumOverlapCandidate = {
  a: string;
  b: string;
  uuidA: string;
  uuidB: string;
  nameA: string;
  nameB: string;
  layerA: string | null;
  layerB: string | null;
  layerKeyA: string | null;
  layerKeyB: string | null;
  triangleCountA: number;
  triangleCountB: number;
  boundsSizeA: [number, number, number];
  boundsSizeB: [number, number, number];
  overlapBoundsSize: [number, number, number];
  trianglePairTests: number;
  coplanarPairHitCount: number;
  categoryA: "metal" | "gema" | "otro";
  categoryB: "metal" | "gema" | "otro";
  intersectionVolume: number;
  triangleIntersectionCount: number | null;
  status: "surface-intersection" | "bounds-only" | "budget-exceeded";
};

type TriangleRecord = { triangle: THREE.Triangle; box: THREE.Box3; minX: number; maxX: number };

function trianglePlanesAreCoplanar(a: THREE.Triangle, b: THREE.Triangle): boolean {
  const normalA = a.getNormal(new THREE.Vector3());
  const normalB = b.getNormal(new THREE.Vector3());
  if (normalA.lengthSq() < 1e-20 || normalB.lengthSq() < 1e-20) return false;
  const parallel = Math.abs(normalA.dot(normalB));
  if (1 - parallel > 1e-7) return false;
  const scale = Math.max(
    1,
    a.a.length(), a.b.length(), a.c.length(),
    b.a.length(), b.b.length(), b.c.length(),
  );
  const tolerance = scale * 1e-7;
  return Math.abs(normalA.dot(b.a.clone().sub(a.a))) <= tolerance
    && Math.abs(normalA.dot(b.b.clone().sub(a.a))) <= tolerance
    && Math.abs(normalA.dot(b.c.clone().sub(a.a))) <= tolerance;
}

function meshAuditIdentity(mesh: THREE.Mesh) {
  const meta = (mesh.userData?.aurumRhino ?? {}) as Record<string, unknown>;
  const attrs = (mesh.userData?.attributes ?? {}) as Record<string, unknown>;
  const geometry = mesh.geometry;
  const position = geometry.getAttribute("position");
  const triangleCount = Math.floor((geometry.getIndex()?.count ?? position?.count ?? 0) / 3);
  const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
  const layer = meta.capa ?? attrs.layerName ?? attrs.LayerName ?? null;
  const layerKey = meta.layerKey ?? null;
  return {
    uuid: mesh.uuid,
    name: mesh.name || "(sin nombre)",
    layer: layer == null ? null : String(layer),
    layerKey: layerKey == null ? null : String(layerKey),
    triangleCount,
    boundsSize: [size.x, size.y, size.z] as [number, number, number],
  };
}

function categoryOf(mesh: THREE.Mesh): "metal" | "gema" | "otro" {
  const data = (mesh.userData?.aurumRhino ?? {}) as Record<string, unknown>;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const text = [
    mesh.name, data.capa, mesh.userData?.attributes?.layerName,
    ...materials.map((material) => (material as THREE.Material | undefined)?.name),
  ].map((value) => String(value ?? "")).join(" ").toLowerCase();

  if (data.categoria === "gema" || /(gem|gema|piedra|diamond|diamante|sapphire|zafiro|ruby|rub[ií]|esmeralda|emerald|moissanite|moissanita)/.test(text)) return "gema";
  if (data.categoria === "metal" || /(metal|oro|gold|plata|silver|platino|platinum|steel|acero)/.test(text)) return "metal";
  return "otro";
}

function trianglesIntersectSAT(left: THREE.Triangle, right: THREE.Triangle): boolean {
  const leftVertices = [left.a, left.b, left.c];
  const rightVertices = [right.a, right.b, right.c];
  const leftEdges = [
    left.b.clone().sub(left.a),
    left.c.clone().sub(left.b),
    left.a.clone().sub(left.c),
  ];
  const rightEdges = [
    right.b.clone().sub(right.a),
    right.c.clone().sub(right.b),
    right.a.clone().sub(right.c),
  ];
  const leftNormal = leftEdges[0]!.clone().cross(leftEdges[1]!);
  const rightNormal = rightEdges[0]!.clone().cross(rightEdges[1]!);
  const axes: THREE.Vector3[] = [leftNormal, rightNormal];

  // Edge/edge axes separate non-coplanar triangles; edge/normal axes also
  // separate coplanar triangles. Degenerate axes are ignored below.
  for (const edge of leftEdges) {
    axes.push(edge.clone().cross(leftNormal));
    for (const otherEdge of rightEdges) axes.push(edge.clone().cross(otherEdge));
  }
  for (const edge of rightEdges) axes.push(edge.clone().cross(rightNormal));

  for (const axis of axes) {
    const lengthSq = axis.lengthSq();
    if (lengthSq < 1e-20) continue;
    axis.multiplyScalar(1 / Math.sqrt(lengthSq));
    let leftMin = Infinity, leftMax = -Infinity;
    let rightMin = Infinity, rightMax = -Infinity;
    for (const point of leftVertices) {
      const projection = point.dot(axis);
      leftMin = Math.min(leftMin, projection);
      leftMax = Math.max(leftMax, projection);
    }
    for (const point of rightVertices) {
      const projection = point.dot(axis);
      rightMin = Math.min(rightMin, projection);
      rightMax = Math.max(rightMax, projection);
    }
    const tolerance = 1e-9 * Math.max(1, Math.abs(leftMin), Math.abs(leftMax), Math.abs(rightMin), Math.abs(rightMax));
    if (leftMax < rightMin - tolerance || rightMax < leftMin - tolerance) return false;
  }
  return true;
}

function trianglesFor(mesh: THREE.Mesh, maxTriangles: number): TriangleRecord[] | null {
  const geometry = mesh.geometry;
  const position = geometry.getAttribute("position");
  if (!position) return [];
  const index = geometry.getIndex();
  const triangleCount = Math.floor((index?.count ?? position.count) / 3);
  if (triangleCount > maxTriangles) return null;

  const records: TriangleRecord[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const triangle = new THREE.Triangle();
  const box = new THREE.Box3();
  const matrix = mesh.matrixWorld;

  for (let i = 0; i < triangleCount; i++) {
    const ia = index ? index.getX(i * 3) : i * 3;
    const ib = index ? index.getX(i * 3 + 1) : i * 3 + 1;
    const ic = index ? index.getX(i * 3 + 2) : i * 3 + 2;
    a.fromBufferAttribute(position, ia).applyMatrix4(matrix);
    b.fromBufferAttribute(position, ib).applyMatrix4(matrix);
    c.fromBufferAttribute(position, ic).applyMatrix4(matrix);
    triangle.set(a.clone(), b.clone(), c.clone());
    box.setFromPoints([a, b, c]);
    records.push({ triangle: triangle.clone(), box: box.clone(), minX: box.min.x, maxX: box.max.x });
  }
  records.sort((left, right) => left.minX - right.minX);
  return records;
}

/**
 * Diagnostic only: reports AABB candidates and, within a bounded budget,
 * tests actual triangle/triangle surface intersections. It never merges,
 * edits, hides, or disposes source geometry/materials.
 */
export function findAurumOverlapCandidates(
  root: THREE.Object3D,
  options: {
    metalOnly?: boolean;
    minIntersectionVolume?: number;
    maxTrianglesPerMesh?: number;
    maxTrianglePairTests?: number;
  } = {},
): AurumOverlapCandidate[] {
  const meshes: Array<{ mesh: THREE.Mesh; box: THREE.Box3; category: "metal" | "gema" | "otro"; identity: ReturnType<typeof meshAuditIdentity> }> = [];
  root.updateMatrixWorld(true);

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry || !mesh.visible) return;
    const position = mesh.geometry.getAttribute("position");
    if (!position || position.count < 3) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty()) return;
    const category = categoryOf(mesh);
    if (options.metalOnly && category !== "metal") return;
    meshes.push({ mesh, box, category, identity: meshAuditIdentity(mesh) });
  });

  const minVolume = Math.max(0, options.minIntersectionVolume ?? 1e-9);
  const maxTriangles = Math.max(1, Math.floor(options.maxTrianglesPerMesh ?? 12000));
  const maxTests = Math.max(1, Math.floor(options.maxTrianglePairTests ?? 250000));
  const candidates: AurumOverlapCandidate[] = [];
  let remainingTests = maxTests;
  const triangleCache = new Map<THREE.Mesh, TriangleRecord[] | null>();
  const getTriangles = (mesh: THREE.Mesh) => {
    if (!triangleCache.has(mesh)) triangleCache.set(mesh, trianglesFor(mesh, maxTriangles));
    return triangleCache.get(mesh)!;
  };

  for (let i = 0; i < meshes.length; i++) {
    const left = meshes[i]!;
    for (let j = i + 1; j < meshes.length; j++) {
      const right = meshes[j]!;
      if (!left.box.intersectsBox(right.box)) continue;
      const overlap = left.box.clone().intersect(right.box);
      const size = overlap.getSize(new THREE.Vector3());
      const volume = size.x * size.y * size.z;
      if (!Number.isFinite(volume) || volume <= minVolume) continue;

      const leftTriangles = getTriangles(left.mesh);
      const rightTriangles = getTriangles(right.mesh);
      if (!leftTriangles || !rightTriangles) {
        candidates.push({
          a: left.mesh.name || left.mesh.uuid, b: right.mesh.name || right.mesh.uuid,
          categoryA: left.category, categoryB: right.category, intersectionVolume: volume,
          triangleIntersectionCount: null, status: "budget-exceeded",
        });
        continue;
      }

      let count = 0;
      let coplanarCount = 0;
      let pairTests = 0;
      let exceeded = false;
      outer: for (const a of leftTriangles) {
        for (const b of rightTriangles) {
          if (b.minX > a.maxX) break;
          if (b.maxX < a.minX || !a.box.intersectsBox(b.box)) continue;
          if (remainingTests <= 0) { exceeded = true; break outer; }
          remainingTests--;
          pairTests++;
          if (trianglesIntersectSAT(a.triangle, b.triangle)) {
            count++;
            if (trianglePlanesAreCoplanar(a.triangle, b.triangle)) coplanarCount++;
          }
        }
      }
      const overlapSize: [number, number, number] = [size.x, size.y, size.z];
      candidates.push({
        a: left.mesh.name || left.mesh.uuid,
        b: right.mesh.name || right.mesh.uuid,
        uuidA: left.identity.uuid,
        uuidB: right.identity.uuid,
        nameA: left.identity.name,
        nameB: right.identity.name,
        layerA: left.identity.layer,
        layerB: right.identity.layer,
        layerKeyA: left.identity.layerKey,
        layerKeyB: right.identity.layerKey,
        triangleCountA: left.identity.triangleCount,
        triangleCountB: right.identity.triangleCount,
        boundsSizeA: left.identity.boundsSize,
        boundsSizeB: right.identity.boundsSize,
        overlapBoundsSize: overlapSize,
        trianglePairTests: pairTests,
        coplanarPairHitCount: exceeded ? 0 : coplanarCount,
        categoryA: left.category,
        categoryB: right.category,
        intersectionVolume: volume,
        triangleIntersectionCount: exceeded ? null : count,
        status: exceeded ? "budget-exceeded" : count > 0 ? "surface-intersection" : "bounds-only",
      });
      if (remainingTests <= 0) break;
    }
    if (remainingTests <= 0) break;
  }

  return candidates.sort((a, b) => {
    const rank = (item: AurumOverlapCandidate) => item.status === "surface-intersection" ? 0 : item.status === "bounds-only" ? 1 : 2;
    return rank(a) - rank(b) || (b.triangleIntersectionCount ?? -1) - (a.triangleIntersectionCount ?? -1) || b.intersectionVolume - a.intersectionVolume;
  });
}
