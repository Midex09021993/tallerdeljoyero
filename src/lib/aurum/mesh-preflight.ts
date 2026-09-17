import * as THREE from "three";

export type AurumMeshPreflight = {
  indexed: boolean;
  vertices: number;
  triangles: number;
  boundaryEdges: number;
  nonManifoldEdges: number;
  degenerateTriangles: number;
  normalCount: number;
  normalsValid: boolean;
  renderReady: boolean;
};

/**
 * Diagnóstico inspirado en el flujo de preparación de iJewel/Rhino.
 * No modifica la geometría ni las normales.
 */
export function inspectAurumMesh(geometry: THREE.BufferGeometry): AurumMeshPreflight {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const index = geometry.getIndex();

  const vertices = position?.count ?? 0;
  const triangles = index
    ? Math.floor(index.count / 3)
    : Math.floor(vertices / 3);

  const edges = new Map<string, number>();
  let degenerateTriangles = 0;

  const addEdge = (a: number, b: number) => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const key = `${lo}:${hi}`;
    edges.set(key, (edges.get(key) ?? 0) + 1);
  };

  const checkFace = (a: number, b: number, c: number) => {
    if (!position) return;
    const ax = position.getX(a), ay = position.getY(a), az = position.getZ(a);
    const bx = position.getX(b), by = position.getY(b), bz = position.getZ(b);
    const cx = position.getX(c), cy = position.getY(c), cz = position.getZ(c);
    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = cx - ax, acy = cy - ay, acz = cz - az;
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    if (Math.hypot(nx, ny, nz) < 1e-12) degenerateTriangles++;
    addEdge(a, b);
    addEdge(b, c);
    addEdge(c, a);
  };

  if (index) {
    for (let i = 0; i + 2 < index.count; i += 3) {
      checkFace(index.getX(i), index.getX(i + 1), index.getX(i + 2));
    }
  } else if (position) {
    for (let i = 0; i + 2 < position.count; i += 3) {
      checkFace(i, i + 1, i + 2);
    }
  }

  let boundaryEdges = 0;
  let nonManifoldEdges = 0;
  edges.forEach((count) => {
    if (count === 1) boundaryEdges++;
    else if (count > 2) nonManifoldEdges++;
  });

  const normalCount = normal?.count ?? 0;
  const normalsValid = !!position && !!normal && normalCount === vertices;
  const renderReady = vertices >= 3 && triangles > 0 && degenerateTriangles === 0 && nonManifoldEdges === 0;

  return {
    indexed: !!index,
    vertices,
    triangles,
    boundaryEdges,
    nonManifoldEdges,
    degenerateTriangles,
    normalCount,
    normalsValid,
    renderReady,
  };
}
