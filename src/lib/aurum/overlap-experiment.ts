import * as THREE from "three";

export type AurumOverlapCandidate = {
  a: string;
  b: string;
  categoryA: "metal" | "gema" | "otro";
  categoryB: "metal" | "gema" | "otro";
  intersectionVolume: number;
  triangleIntersectionCount: number | null;
  status: "surface-intersection" | "bounds-only" | "budget-exceeded";
};

type TriangleRecord = { triangle: THREE.Triangle; box: THREE.Box3; minX: number; maxX: number };

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
  const meshes: Array<{ mesh: THREE.Mesh; box: THREE.Box3; category: "metal" | "gema" | "otro" }> = [];
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
    meshes.push({ mesh, box, category });
  });

  const minVolume = Math.max(0, options.minIntersectionVolume ?? 1e-9);
  const maxTriangles = Math.max(1, Math.floor(options.maxTrianglesPerMesh ?? 12000));
  const maxTests = Math.max(1, Math.floor(options.maxTrianglePairTests ?? 250000));
  const candidates: AurumOverlapCandidate[] = [];
  let remainingTests = maxTests;

  for (let i = 0; i < meshes.length; i++) {
    const left = meshes[i]!;
    for (let j = i + 1; j < meshes.length; j++) {
      const right = meshes[j]!;
      if (!left.box.intersectsBox(right.box)) continue;
      const overlap = left.box.clone().intersect(right.box);
      const size = overlap.getSize(new THREE.Vector3());
      const volume = size.x * size.y * size.z;
      if (!Number.isFinite(volume) || volume <= minVolume) continue;

      const leftTriangles = trianglesFor(left.mesh, maxTriangles);
      const rightTriangles = trianglesFor(right.mesh, maxTriangles);
      if (!leftTriangles || !rightTriangles) {
        candidates.push({
          a: left.mesh.name || left.mesh.uuid, b: right.mesh.name || right.mesh.uuid,
          categoryA: left.category, categoryB: right.category, intersectionVolume: volume,
          triangleIntersectionCount: null, status: "budget-exceeded",
        });
        continue;
      }

      let count = 0;
      let exceeded = false;
      outer: for (const a of leftTriangles) {
        for (const b of rightTriangles) {
          if (b.minX > a.maxX) break;
          if (b.maxX < a.minX || !a.box.intersectsBox(b.box)) continue;
          if (remainingTests <= 0) { exceeded = true; break outer; }
          remainingTests--;
          if (a.triangle.intersectsTriangle(b.triangle, true)) count++;
        }
      }
      candidates.push({
        a: left.mesh.name || left.mesh.uuid, b: right.mesh.name || right.mesh.uuid,
        categoryA: left.category, categoryB: right.category, intersectionVolume: volume,
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
