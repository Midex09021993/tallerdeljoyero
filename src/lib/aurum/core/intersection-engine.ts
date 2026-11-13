import * as THREE from "three";
import type { AurumSolidReport } from "./solid-engine";

export type AurumIntersectionKind =
  | "disjoint"
  | "surface-surface-intersection"
  | "surface-boundary-intersection"
  | "surface-penetrates-solid"
  | "solid-boundary-intersection"
  | "solid-volume-overlap"
  | "unresolved";

export interface AurumIntersectionPairReport {
  readonly bodyA: string;
  readonly bodyB: string;
  readonly kind: AurumIntersectionKind;
  readonly confidence: "high" | "medium" | "low";
  readonly intersectingTrianglePairs: number;
  readonly trianglePairTests: number;
  readonly samplesInsideA: number;
  readonly samplesInsideB: number;
  readonly note: string;
}

export interface AurumIntersectionReport {
  readonly bodyCount: number;
  readonly candidatePairCount: number;
  readonly intersectingPairCount: number;
  readonly trianglePairTests: number;
  readonly truncated: boolean;
  readonly tolerance: number;
  readonly pairs: readonly AurumIntersectionPairReport[];
}

export interface AurumIntersectionOptions {
  readonly tolerance?: number;
  readonly maxTrianglePairTests?: number;
  readonly leafSize?: number;
}

export interface AurumIntersectionEngine {
  readonly id: "aurum.intersection";
  readonly version: "1.0.0";
  inspect(root: THREE.Object3D, solidReport: AurumSolidReport, options?: AurumIntersectionOptions): AurumIntersectionReport;
}

interface Triangle {
  readonly a: THREE.Vector3;
  readonly b: THREE.Vector3;
  readonly c: THREE.Vector3;
  readonly bounds: THREE.Box3;
  readonly centroid: THREE.Vector3;
}
interface BvhNode {
  readonly bounds: THREE.Box3;
  readonly left?: BvhNode;
  readonly right?: BvhNode;
  readonly triangles?: readonly Triangle[];
}
interface MeshWork {
  readonly index: number;
  readonly name: string;
  readonly bounds: THREE.Box3;
  readonly triangles: readonly Triangle[];
  readonly bvh: BvhNode | null;
}

function visibleInTree(mesh: THREE.Mesh): boolean {
  for (let node: THREE.Object3D | null = mesh; node; node = node.parent) if (!node.visible) return false;
  return true;
}

function buildTriangles(mesh: THREE.Mesh): Triangle[] {
  const position = mesh.geometry.getAttribute("position");
  const index = mesh.geometry.getIndex();
  const count = index?.count ?? position.count;
  const triangles: Triangle[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i + 2 < count; i += 3) {
    const ia = index ? index.getX(i) : i;
    const ib = index ? index.getX(i + 1) : i + 1;
    const ic = index ? index.getX(i + 2) : i + 2;
    a.fromBufferAttribute(position, ia).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(position, ib).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(position, ic).applyMatrix4(mesh.matrixWorld);
    if (![a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z].every(Number.isFinite)) continue;
    const edgeAB = new THREE.Vector3().subVectors(b, a);
    const edgeAC = new THREE.Vector3().subVectors(c, a);
    if (new THREE.Vector3().crossVectors(edgeAB, edgeAC).lengthSq() <= 1e-24) continue;
    const bounds = new THREE.Box3().setFromPoints([a, b, c]);
    triangles.push({
      a: a.clone(), b: b.clone(), c: c.clone(), bounds,
      centroid: new THREE.Vector3().add(a).add(b).add(c).multiplyScalar(1 / 3),
    });
  }
  return triangles;
}

function buildBvh(triangles: readonly Triangle[], leafSize: number): BvhNode | null {
  if (!triangles.length) return null;
  const bounds = new THREE.Box3().makeEmpty();
  const centroidBounds = new THREE.Box3().makeEmpty();
  for (const triangle of triangles) {
    bounds.union(triangle.bounds);
    centroidBounds.expandByPoint(triangle.centroid);
  }
  if (triangles.length <= leafSize) return { bounds, triangles };
  const size = centroidBounds.getSize(new THREE.Vector3());
  const axis: "x" | "y" | "z" = size.x >= size.y && size.x >= size.z ? "x" : size.y >= size.z ? "y" : "z";
  const sorted = [...triangles].sort((a, b) => a.centroid[axis] - b.centroid[axis]);
  const middle = Math.floor(sorted.length / 2);
  if (middle <= 0 || middle >= sorted.length) return { bounds, triangles };
  const left = buildBvh(sorted.slice(0, middle), leafSize);
  const right = buildBvh(sorted.slice(middle), leafSize);
  return {
    bounds,
    ...(left ? { left } : {}),
    ...(right ? { right } : {}),
  };
}

function projectTriangle(triangle: Triangle, axis: THREE.Vector3): [number, number] {
  const pa = triangle.a.dot(axis), pb = triangle.b.dot(axis), pc = triangle.c.dot(axis);
  return [Math.min(pa, pb, pc), Math.max(pa, pb, pc)];
}

/** Separating-axis test for two triangles. Touching counts as intersection within tolerance. */
function trianglesIntersect(a: Triangle, b: Triangle, tolerance: number): boolean {
  const edgesA = [new THREE.Vector3().subVectors(a.b, a.a), new THREE.Vector3().subVectors(a.c, a.b), new THREE.Vector3().subVectors(a.a, a.c)];
  const edgesB = [new THREE.Vector3().subVectors(b.b, b.a), new THREE.Vector3().subVectors(b.c, b.b), new THREE.Vector3().subVectors(b.a, b.c)];
  const normalA = new THREE.Vector3().crossVectors(edgesA[0]!, edgesA[1]!);
  const normalB = new THREE.Vector3().crossVectors(edgesB[0]!, edgesB[1]!);
  const axes: THREE.Vector3[] = [normalA, normalB];
  for (const edgeA of edgesA) for (const edgeB of edgesB) axes.push(new THREE.Vector3().crossVectors(edgeA, edgeB));
  for (const axis of axes) {
    const lengthSq = axis.lengthSq();
    if (lengthSq < 1e-24) continue;
    const normalized = axis.multiplyScalar(1 / Math.sqrt(lengthSq));
    const [minA, maxA] = projectTriangle(a, normalized);
    const [minB, maxB] = projectTriangle(b, normalized);
    if (maxA < minB - tolerance || maxB < minA - tolerance) return false;
  }
  return true;
}

interface PairCounter {
  tests: number;
  intersections: number;
  truncated: boolean;
}

function queryBvhPair(
  nodeA: BvhNode,
  nodeB: BvhNode,
  tolerance: number,
  maxTests: number,
  counter: PairCounter,
): void {
  if (counter.truncated || !boxesOverlap(nodeA.bounds, nodeB.bounds, tolerance)) return;
  const leafA = Boolean(nodeA.triangles);
  const leafB = Boolean(nodeB.triangles);
  if (leafA && leafB) {
    for (const triangleA of nodeA.triangles!) {
      for (const triangleB of nodeB.triangles!) {
        if (!boxesOverlap(triangleA.bounds, triangleB.bounds, tolerance)) continue;
        if (counter.tests >= maxTests) { counter.truncated = true; return; }
        counter.tests += 1;
        if (trianglesIntersect(triangleA, triangleB, tolerance)) counter.intersections += 1;
      }
    }
    return;
  }
  if (!leafA && (leafB || nodeA.bounds.getSize(new THREE.Vector3()).length() >= nodeB.bounds.getSize(new THREE.Vector3()).length())) {
    if (nodeA.left) queryBvhPair(nodeA.left, nodeB, tolerance, maxTests, counter);
    if (nodeA.right) queryBvhPair(nodeA.right, nodeB, tolerance, maxTests, counter);
  } else {
    if (nodeB.left) queryBvhPair(nodeA, nodeB.left, tolerance, maxTests, counter);
    if (nodeB.right) queryBvhPair(nodeA, nodeB.right, tolerance, maxTests, counter);
  }
}

function classifyPair(
  bodyA: MeshWork,
  bodyB: MeshWork,
  intersections: number,
  tests: number,
  truncated: boolean,
  solidReport: AurumSolidReport,
): AurumIntersectionPairReport {
  const previous = solidReport.relations.find((relation) =>
    (relation.bodyAIndex === bodyA.index && relation.bodyBIndex === bodyB.index)
    || (relation.bodyAIndex === bodyB.index && relation.bodyBIndex === bodyA.index)
  );
  const sameOrder = previous?.bodyAIndex === bodyA.index;
  const insideA = previous ? (sameOrder ? previous.samplesInsideA : previous.samplesInsideB) : 0;
  const insideB = previous ? (sameOrder ? previous.samplesInsideB : previous.samplesInsideA) : 0;
  const solidA = solidReport.bodies[bodyA.index]?.kind === "closed-solid";
  const solidB = solidReport.bodies[bodyB.index]?.kind === "closed-solid";
  let kind: AurumIntersectionKind = "unresolved";
  let confidence: "high" | "medium" | "low" = "low";
  let note = "El presupuesto de pruebas se agotó; la relación queda sin resolver.";
  if (!truncated && intersections === 0) {
    kind = "disjoint"; confidence = "high";
    note = "No se encontraron pares de triángulos intersectantes dentro de los límites espaciales evaluados.";
  } else if (intersections > 0) {
    if (solidA && solidB) {
      if (insideA > 0 || insideB > 0) {
        kind = "solid-volume-overlap"; confidence = "high";
        note = "Hay intersecciones de triángulos y muestras interiores en el cuerpo opuesto: evidencia de solapamiento volumétrico.";
      } else {
        kind = "solid-boundary-intersection"; confidence = "medium";
        note = "Las fronteras trianguladas se intersectan; puede ser tangencia o cruce estrecho sin muestras interiores suficientes.";
      }
    } else if (solidA || solidB) {
      if (insideA > 0 || insideB > 0) {
        kind = "surface-penetrates-solid"; confidence = "high";
        note = "La frontera de la superficie intersecta la del sólido y hay muestras de la superficie dentro del volumen.";
      } else {
        kind = "surface-boundary-intersection"; confidence = "medium";
        note = "La superficie intersecta la frontera del sólido; falta evidencia interior para diferenciar tangencia de penetración.";
      }
    } else {
      kind = "surface-surface-intersection"; confidence = "high";
      note = "Se detectaron intersecciones entre triángulos de las dos superficies abiertas.";
    }
  }
  return Object.freeze({
    bodyA: bodyA.name, bodyB: bodyB.name, kind, confidence,
    intersectingTrianglePairs: intersections, trianglePairTests: tests,
    samplesInsideA: insideA, samplesInsideB: insideB, note,
  });
}

/**
 * Read-only triangle intersection engine. A custom median-split BVH prunes
 * triangle-pair tests; a tolerance-aware separating-axis test handles both
 * coplanar and non-coplanar triangle pairs. It reports boundary evidence,
 * not an exact native Rhino BREP boolean result.
 */
export function createAurumIntersectionEngine(): AurumIntersectionEngine {
  return Object.freeze({
    id: "aurum.intersection" as const,
    version: "1.0.0" as const,
    inspect(root: THREE.Object3D, solidReport: AurumSolidReport, options: AurumIntersectionOptions = {}): AurumIntersectionReport {
      const tolerance = options.tolerance ?? solidReport.tolerance;
      const maxTests = options.maxTrianglePairTests ?? 2_000_000;
      const leafSize = options.leafSize ?? 8;
      if (!Number.isFinite(tolerance) || tolerance <= 0) throw new Error("AURUM INTERSECTION tolerance must be positive and finite.");
      if (!Number.isInteger(maxTests) || maxTests < 1) throw new Error("AURUM INTERSECTION maxTrianglePairTests must be a positive integer.");
      if (!Number.isInteger(leafSize) || leafSize < 1 || leafSize > 128) throw new Error("AURUM INTERSECTION leafSize must be between 1 and 128.");
      root.updateMatrixWorld(true);
      const meshes: MeshWork[] = [];
      root.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh || !visibleInTree(mesh) || !mesh.geometry?.getAttribute("position")) return;
        const triangles = buildTriangles(mesh);
        const bounds = new THREE.Box3().makeEmpty();
        for (const triangle of triangles) bounds.union(triangle.bounds);
        meshes.push({ index: meshes.length, name: mesh.name || `Mesh ${meshes.length + 1}`, bounds, triangles, bvh: buildBvh(triangles, leafSize) });
      });
      const pairs: AurumIntersectionPairReport[] = [];
      let trianglePairTests = 0;
      let truncated = false;
      let candidatePairCount = 0;
      outer: for (let i = 0; i < meshes.length; i += 1) {
        for (let j = i + 1; j < meshes.length; j += 1) {
          const a = meshes[i]!, b = meshes[j]!;
          if (!boxesOverlap(a.bounds, b.bounds, tolerance)) continue;
          candidatePairCount += 1;
          if (!a.bvh || !b.bvh) continue;
          const counter: PairCounter = { tests: 0, intersections: 0, truncated: false };
          queryBvhPair(a.bvh, b.bvh, tolerance, maxTests - trianglePairTests, counter);
          trianglePairTests += counter.tests;
          truncated ||= counter.truncated;
          pairs.push(classifyPair(a, b, counter.intersections, counter.tests, counter.truncated, solidReport));
          if (truncated) break outer;
        }
      }
      return Object.freeze({
        bodyCount: meshes.length,
        candidatePairCount,
        intersectingPairCount: pairs.filter((pair) => pair.intersectingTrianglePairs > 0).length,
        trianglePairTests,
        truncated,
        tolerance,
        pairs: Object.freeze(pairs),
      });
    },
  });
}
