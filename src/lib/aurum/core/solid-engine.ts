import * as THREE from "three";

export type AurumBodyKind = "closed-solid" | "open-surface" | "invalid-mesh";
export type AurumBodyFamily = "metal" | "gem" | "other";

export interface AurumSolidBodyReport {
  readonly index: number;
  readonly name: string;
  readonly kind: AurumBodyKind;
  readonly family: AurumBodyFamily;
  readonly sourceType: string;
  readonly triangles: number;
  readonly boundaryEdges: number;
  readonly nonManifoldEdges: number;
  readonly signedVolume: number | null;
  readonly volume: number | null;
  readonly validPositions: boolean;
}

export type AurumBodyRelationKind =
  | "disjoint"
  | "solid-contained-in-solid"
  | "solid-volume-overlap"
  | "surface-contained-in-solid"
  | "surface-penetrates-solid"
  | "aabb-overlap-unresolved";

export interface AurumBodyRelationReport {
  readonly bodyA: string;
  readonly bodyB: string;
  readonly bodyAIndex: number;
  readonly bodyBIndex: number;
  readonly kind: AurumBodyRelationKind;
  readonly confidence: "high" | "medium" | "low";
  readonly samplesInsideA: number;
  readonly samplesInsideB: number;
  readonly note: string;
}

export interface AurumSolidReport {
  readonly bodyCount: number;
  readonly closedSolidCount: number;
  readonly openSurfaceCount: number;
  readonly invalidMeshCount: number;
  readonly relationCount: number;
  readonly unresolvedRelationCount: number;
  readonly truncated: boolean;
  readonly tolerance: number;
  readonly bodies: readonly AurumSolidBodyReport[];
  readonly relations: readonly AurumBodyRelationReport[];
}

export interface AurumSolidInspectOptions {
  /** World-space tolerance in source model units. Select this per model scale. */
  readonly tolerance?: number;
  /** Maximum number of body pairs to inspect. */
  readonly maxPairs?: number;
  /** Maximum spatial samples retained per body for pairwise classification. */
  readonly maxSamplesPerBody?: number;
}

export interface AurumSolidEngine {
  readonly id: "aurum.solid";
  readonly version: "1.0.0";
  inspect(root: THREE.Object3D, options?: AurumSolidInspectOptions): AurumSolidReport;
}

interface Triangle {
  readonly a: THREE.Vector3;
  readonly b: THREE.Vector3;
  readonly c: THREE.Vector3;
  readonly centroid: THREE.Vector3;
}
interface BodyWork {
  readonly mesh: THREE.Mesh;
  readonly report: AurumSolidBodyReport;
  readonly bounds: THREE.Box3;
  readonly triangles: readonly Triangle[];
  readonly samples: readonly THREE.Vector3[];
  readonly closed: boolean;
}

function visibleInTree(mesh: THREE.Mesh): boolean {
  for (let node: THREE.Object3D | null = mesh; node; node = node.parent) if (!node.visible) return false;
  return true;
}

function familyOf(mesh: THREE.Mesh): AurumBodyFamily {
  const data = (mesh.userData ?? {}) as Record<string, any>;
  const rhino = data["aurumRhino"] ?? {};
  const text = [
    mesh.name, rhino.capa, rhino.category, data["layerName"],
    data["attributes"]?.layerName, data["aurumRhinoSource"]?.layerName,
    ...(Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((material) => material?.name),
  ].join(" ").toLowerCase();
  if (rhino.categoria === "gema" || /(gem|gema|piedra|diamond|diamante|zafiro|sapphire|rubi|rubí|ruby|esmeralda|emerald|moissanita)/.test(text)) return "gem";
  if (rhino.categoria === "metal" || /(metal|oro|gold|plata|silver|platino|platinum|acero|steel)/.test(text)) return "metal";
  return "other";
}

function sourceTypeOf(mesh: THREE.Mesh): string {
  const data = (mesh.userData ?? {}) as Record<string, any>;
  const value = data["aurumRhinoGeometryType"] ?? data["geometryType"] ?? data["aurumRhinoSource"]?.objectType;
  return typeof value === "string" && value.trim() ? value : mesh.geometry?.type ?? "unknown";
}

function quantize(value: number, tolerance: number): number {
  return Math.round(value / tolerance);
}

function samplePoints(triangles: readonly Triangle[], maxSamples: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  if (!triangles.length || maxSamples < 1) return points;
  const vertexBudget = Math.max(1, Math.floor(maxSamples * 0.6));
  const step = Math.max(1, Math.ceil((triangles.length * 3) / vertexBudget));
  let cursor = 0;
  for (const triangle of triangles) {
    for (const vertex of [triangle.a, triangle.b, triangle.c]) {
      if (cursor % step === 0 && points.length < vertexBudget) points.push(vertex.clone());
      cursor += 1;
    }
    if (points.length >= vertexBudget) break;
  }
  const centroidBudget = maxSamples - points.length;
  if (centroidBudget > 0) {
    const centroidStep = Math.max(1, Math.ceil(triangles.length / centroidBudget));
    for (let i = 0; i < triangles.length && points.length < maxSamples; i += centroidStep) {
      points.push(triangles[i]!.centroid.clone());
    }
  }
  return points;
}

function pointInsideClosedMesh(point: THREE.Vector3, triangles: readonly Triangle[], tolerance: number): boolean {
  // A non-axis-aligned ray reduces vertex/edge degeneracy. Duplicate hit distances
  // are collapsed so triangulated faces do not count twice at a shared diagonal.
  const boundaryCheck = new THREE.Triangle();
  const closest = new THREE.Vector3();
  for (const triangle of triangles) {
    boundaryCheck.set(triangle.a, triangle.b, triangle.c).closestPointToPoint(point, closest);
    if (closest.distanceToSquared(point) <= tolerance * tolerance) return false;
  }
  const direction = new THREE.Vector3(1, 0.3713906763541037, 0.217832).normalize();
  const ray = new THREE.Ray(point.clone(), direction);
  const hit = new THREE.Vector3();
  const distances: number[] = [];
  for (const triangle of triangles) {
    const intersection = ray.intersectTriangle(triangle.a, triangle.b, triangle.c, false, hit);
    if (!intersection) continue;
    const distance = intersection.distanceTo(point);
    if (distance > tolerance) distances.push(distance);
  }
  distances.sort((a, b) => a - b);
  let uniqueHits = 0;
  let previous = Number.NEGATIVE_INFINITY;
  for (const distance of distances) {
    if (Math.abs(distance - previous) > tolerance * 2) {
      uniqueHits += 1;
      previous = distance;
    }
  }
  return uniqueHits % 2 === 1;
}

function buildBody(mesh: THREE.Mesh, index: number, tolerance: number, maxSamples: number): BodyWork {
  const geometry = mesh.geometry;
  const position = geometry?.getAttribute("position");
  const indices = geometry?.getIndex();
  const triangles: Triangle[] = [];
  let validPositions = Boolean(position && position.count >= 3);
  let boundaryEdges = 0;
  let nonManifoldEdges = 0;
  let signedVolume = 0;
  const edgeCounts = new Map<string, number>();
  const bounds = new THREE.Box3().makeEmpty();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const edgeKey = (start: number, end: number) => {
    const key = (vertexIndex: number) => {
      const point = new THREE.Vector3().fromBufferAttribute(position!, vertexIndex).applyMatrix4(mesh.matrixWorld);
      return `${quantize(point.x, tolerance)},${quantize(point.y, tolerance)},${quantize(point.z, tolerance)}`;
    };
    const ka = key(start), kb = key(end);
    return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
  };
  const vertexCount = position?.count ?? 0;
  const elementCount = indices?.count ?? vertexCount;
  for (let i = 0; position && i + 2 < elementCount; i += 3) {
    const ia = indices ? indices.getX(i) : i;
    const ib = indices ? indices.getX(i + 1) : i + 1;
    const ic = indices ? indices.getX(i + 2) : i + 2;
    a.fromBufferAttribute(position, ia).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(position, ib).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(position, ic).applyMatrix4(mesh.matrixWorld);
    if (![a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z].every(Number.isFinite)) {
      validPositions = false;
      continue;
    }
    bounds.expandByPoint(a).expandByPoint(b).expandByPoint(c);
    const centroid = new THREE.Vector3().add(a).add(b).add(c).multiplyScalar(1 / 3);
    triangles.push({ a: a.clone(), b: b.clone(), c: c.clone(), centroid });
    signedVolume += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6;
    const edgePairs: Array<[number, number]> = [[ia, ib], [ib, ic], [ic, ia]];
    for (const [start, end] of edgePairs) {
      const key = edgeKey(start, end);
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
    }
  }
  for (const count of edgeCounts.values()) {
    if (count === 1) boundaryEdges += 1;
    else if (count > 2) nonManifoldEdges += 1;
  }
  const diagonal = bounds.isEmpty() ? 0 : bounds.getSize(new THREE.Vector3()).length();
  const volumeThreshold = Math.max(tolerance ** 3, diagonal ** 3 * 1e-12);
  const volume = Math.abs(signedVolume);
  const closed = validPositions && triangles.length > 0 && boundaryEdges === 0
    && nonManifoldEdges === 0 && volume > volumeThreshold;
  const kind: AurumBodyKind = !validPositions || triangles.length === 0
    ? "invalid-mesh" : closed ? "closed-solid" : "open-surface";
  const report: AurumSolidBodyReport = Object.freeze({
    index,
    name: mesh.name || `Mesh ${index + 1}`,
    kind,
    family: familyOf(mesh),
    sourceType: sourceTypeOf(mesh),
    triangles: triangles.length,
    boundaryEdges,
    nonManifoldEdges,
    signedVolume: validPositions && triangles.length ? signedVolume : null,
    volume: closed ? volume : null,
    validPositions,
  });
  return {
    mesh, report, bounds, triangles,
    samples: samplePoints(triangles, maxSamples),
    closed,
  };
}

function inspectPair(a: BodyWork, b: BodyWork, tolerance: number): AurumBodyRelationReport {
  const bodyA = a.report.name;
  const bodyB = b.report.name;
  if (!a.bounds.intersectsBox(b.bounds)) {
    return Object.freeze({
      bodyA, bodyB, bodyAIndex: a.report.index, bodyBIndex: b.report.index, kind: "disjoint", confidence: "high",
      samplesInsideA: 0, samplesInsideB: 0,
      note: "Las cajas espaciales no se intersectan; los cuerpos están separados.",
    });
  }
  const insideA = a.closed ? b.samples.filter((point) => pointInsideClosedMesh(point, a.triangles, tolerance)).length : 0;
  const insideB = b.closed ? a.samples.filter((point) => pointInsideClosedMesh(point, b.triangles, tolerance)).length : 0;
  let kind: AurumBodyRelationKind = "aabb-overlap-unresolved";
  let confidence: "high" | "medium" | "low" = "low";
  let note = "Las cajas se solapan, pero las muestras no prueban contacto ni penetración. Requiere intersección exacta de triángulos/BREP.";
  if (a.closed && b.closed) {
    if (insideA > 0 && insideB > 0) {
      kind = "solid-volume-overlap"; confidence = "medium";
      note = "Muestras interiores de ambos cuerpos aparecen dentro del otro; indica solapamiento volumétrico probable.";
    } else if (insideA > 0) {
      kind = "solid-contained-in-solid"; confidence = "medium";
      note = "Muestras del cuerpo B aparecen dentro de A; comprobar contención completa con análisis exacto.";
    } else if (insideB > 0) {
      kind = "solid-contained-in-solid"; confidence = "medium";
      note = "Muestras del cuerpo A aparecen dentro de B; comprobar contención completa con análisis exacto.";
    }
  } else if (a.closed || b.closed) {
    if (insideA > 0 || insideB > 0) {
      const insideCount = a.closed ? insideA : insideB;
      const sampleCount = a.closed ? b.samples.length : a.samples.length;
      kind = insideCount >= sampleCount && sampleCount > 0
        ? "surface-contained-in-solid" : "surface-penetrates-solid";
      confidence = "medium";
      note = kind === "surface-contained-in-solid"
        ? "Las muestras de la superficie abierta están dentro del sólido."
        : "Parte de las muestras de la superficie abierta está dentro del sólido; penetración probable.";
    }
  }
  return Object.freeze({ bodyA, bodyB, bodyAIndex: a.report.index, bodyBIndex: b.report.index, kind, confidence, samplesInsideA: insideA, samplesInsideB: insideB, note });
}

/**
 * Read-only solid/surface relationship analysis.
 * Closedness is inferred from a welded-by-tolerance triangle edge graph and
 * non-zero signed volume; this is a mesh diagnostic, not native Rhino BREP proof.
 * Pair classification uses bounds plus sampled point-in-solid tests. AABB overlap
 * without interior evidence remains unresolved rather than being mislabeled as a boolean intersection.
 * No mesh, transform, material, normal or source metadata is modified.
 */
export function createAurumSolidEngine(): AurumSolidEngine {
  return Object.freeze({
    id: "aurum.solid" as const,
    version: "1.0.0" as const,
    inspect(root: THREE.Object3D, options: AurumSolidInspectOptions = {}): AurumSolidReport {
      const tolerance = options.tolerance ?? 1e-5;
      const maxPairs = options.maxPairs ?? 10_000;
      const maxSamples = options.maxSamplesPerBody ?? 96;
      if (!Number.isFinite(tolerance) || tolerance <= 0) throw new Error("AURUM SOLID tolerance must be positive and finite.");
      if (!Number.isInteger(maxPairs) || maxPairs < 1) throw new Error("AURUM SOLID maxPairs must be a positive integer.");
      if (!Number.isInteger(maxSamples) || maxSamples < 1) throw new Error("AURUM SOLID maxSamplesPerBody must be a positive integer.");
      root.updateMatrixWorld(true);
      const bodies: BodyWork[] = [];
      root.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (mesh.isMesh && visibleInTree(mesh) && mesh.geometry?.getAttribute("position")) {
          bodies.push(buildBody(mesh, bodies.length, tolerance, maxSamples));
        }
      });
      const relations: AurumBodyRelationReport[] = [];
      let truncated = false;
      outer: for (let i = 0; i < bodies.length; i += 1) {
        for (let j = i + 1; j < bodies.length; j += 1) {
          if (relations.length >= maxPairs) { truncated = true; break outer; }
          relations.push(inspectPair(bodies[i]!, bodies[j]!, tolerance));
        }
      }
      return Object.freeze({
        bodyCount: bodies.length,
        closedSolidCount: bodies.filter((body) => body.report.kind === "closed-solid").length,
        openSurfaceCount: bodies.filter((body) => body.report.kind === "open-surface").length,
        invalidMeshCount: bodies.filter((body) => body.report.kind === "invalid-mesh").length,
        relationCount: relations.length,
        unresolvedRelationCount: relations.filter((relation) => relation.kind === "aabb-overlap-unresolved").length,
        truncated,
        tolerance,
        bodies: Object.freeze(bodies.map((body) => body.report)),
        relations: Object.freeze(relations),
      });
    },
  });
}
