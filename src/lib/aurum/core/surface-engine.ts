import * as THREE from "three";

export interface AurumSurfaceMeshReport {
  readonly name: string;
  readonly family: "metal" | "gem" | "other";
  readonly boundaryEdges: number;
  readonly nonManifoldEdges: number;
  readonly sharedEdges: number;
}

export interface AurumSurfaceReport {
  readonly meshCount: number;
  readonly boundaryEdges: number;
  readonly nonManifoldEdges: number;
  readonly sharedEdgesAcrossBodies: number;
  /** Coincident boundary edges whose adjacent triangle normals are approximately parallel. This is a tangent-plane hint, not proof of CAD G1 continuity. */
  readonly normalAlignedEdgesAcrossBodies: number;
  /** Coincident boundary edges whose adjacent triangle normals are not approximately parallel. */
  readonly normalDiscontinuousEdgesAcrossBodies: number;
  readonly candidateSeamPairs: readonly string[];
  readonly truncated: boolean;
  readonly tolerance: number;
  readonly meshes: readonly AurumSurfaceMeshReport[];
}

export interface AurumSurfaceInspectOptions {
  /** World-space tolerance in model units. Must be selected for the source model scale. */
  readonly tolerance?: number;
  /** Safety ceiling for diagnostic edge records; this engine is opt-in, not part of import. */
  readonly maxEdges?: number;
  /** Dot-product threshold for a tangent-plane alignment hint. */
  readonly normalAlignmentThreshold?: number;
}

export interface AurumSurfaceEngine {
  readonly id: "aurum.surface";
  readonly version: "1.0.0";
  inspect(root: THREE.Object3D, options?: AurumSurfaceInspectOptions): AurumSurfaceReport;
}

type EdgeRecord = { meshIndex: number; normal: THREE.Vector3 };
type EdgeAccumulator = { count: number; normal: THREE.Vector3 };
type MeshAccumulator = {
  name: string;
  family: "metal" | "gem" | "other";
  boundaryEdges: number;
  nonManifoldEdges: number;
  sharedEdges: number;
};

function classifyFamily(mesh: THREE.Mesh): "metal" | "gem" | "other" {
  const data = mesh.userData ?? {};
  const rhino = data.aurumRhino ?? {};
  const text = [
    mesh.name, rhino.capa, rhino.category, data.layerName,
    data.attributes?.layerName,
    ...(Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((material) => material?.name),
  ].join(" ").toLowerCase();
  if (rhino.categoria === "gema" || /(gem|gema|piedra|diamond|diamante|zafiro|sapphire|rubi|rubí|ruby|esmeralda|emerald|moissanita)/.test(text)) return "gem";
  if (rhino.categoria === "metal" || /(metal|oro|gold|plata|silver|platino|platinum|acero|steel)/.test(text)) return "metal";
  return "other";
}

function quantize(value: number, tolerance: number): number {
  return Math.round(value / tolerance);
}

/**
 * Read-only mesh seam diagnostic.
 *
 * G0-like evidence: boundary edges from different mesh bodies coincide within
 * the selected world-space tolerance. The normal comparison is only a local
 * tangent-plane hint; it is not a proof of G1 continuity. This mesh diagnostic
 * cannot establish G2 curvature continuity or native Rhino BREP continuity.
 *
 * It never welds vertices, fuses solids, alters normals/materials, or creates GLB.
 */
export function createAurumSurfaceEngine(): AurumSurfaceEngine {
  return Object.freeze({
    id: "aurum.surface" as const,
    version: "1.0.0" as const,
    inspect(root: THREE.Object3D, options: AurumSurfaceInspectOptions = {}): AurumSurfaceReport {
      const tolerance = options.tolerance ?? 1e-5;
      const maxEdges = options.maxEdges ?? 250_000;
      const normalAlignmentThreshold = options.normalAlignmentThreshold ?? 0.995;
      if (!Number.isFinite(tolerance) || tolerance <= 0) throw new Error("AURUM SURFACE tolerance must be a positive finite number.");
      if (!Number.isInteger(maxEdges) || maxEdges < 1) throw new Error("AURUM SURFACE maxEdges must be a positive integer.");
      if (!Number.isFinite(normalAlignmentThreshold) || normalAlignmentThreshold < 0 || normalAlignmentThreshold > 1) {
        throw new Error("AURUM SURFACE normalAlignmentThreshold must be between 0 and 1.");
      }

      root.updateMatrixWorld(true);
      const meshes: MeshAccumulator[] = [];
      const edgeMap = new Map<string, EdgeRecord[]>();
      let recordedEdges = 0;
      let truncated = false;

      root.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh || !mesh.visible || !mesh.geometry?.getAttribute("position")) return;
        let visible = true;
        for (let parent: THREE.Object3D | null = mesh; parent; parent = parent.parent) {
          if (!parent.visible) { visible = false; break; }
        }
        if (!visible) return;

        const meshIndex = meshes.length;
        const accumulator: MeshAccumulator = {
          name: mesh.name || `Mesh ${meshIndex + 1}`,
          family: classifyFamily(mesh),
          boundaryEdges: 0,
          nonManifoldEdges: 0,
          sharedEdges: 0,
        };
        meshes.push(accumulator);

        const position = mesh.geometry.getAttribute("position");
        const index = mesh.geometry.getIndex();
        const edgeCounts = new Map<string, EdgeAccumulator>();
        const world = new THREE.Vector3();
        const a = new THREE.Vector3();
        const b = new THREE.Vector3();
        const c = new THREE.Vector3();
        const faceNormal = new THREE.Vector3();
        const vertexKey = (vertexIndex: number) => {
          world.fromBufferAttribute(position, vertexIndex).applyMatrix4(mesh.matrixWorld);
          return `${quantize(world.x, tolerance)},${quantize(world.y, tolerance)},${quantize(world.z, tolerance)}`;
        };
        const addEdge = (start: number, end: number) => {
          const ka = vertexKey(start), kb = vertexKey(end);
          if (ka === kb) return;
          const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
          const existing = edgeCounts.get(key);
          if (existing) existing.count += 1;
          else edgeCounts.set(key, { count: 1, normal: faceNormal.clone() });
        };
        const count = index?.count ?? position.count;
        for (let i = 0; i + 2 < count; i += 3) {
          const ia = index ? index.getX(i) : i;
          const ib = index ? index.getX(i + 1) : i + 1;
          const ic = index ? index.getX(i + 2) : i + 2;
          a.fromBufferAttribute(position, ia).applyMatrix4(mesh.matrixWorld);
          b.fromBufferAttribute(position, ib).applyMatrix4(mesh.matrixWorld);
          c.fromBufferAttribute(position, ic).applyMatrix4(mesh.matrixWorld);
          faceNormal.subVectors(b, a).cross(c.clone().sub(a)).normalize();
          addEdge(ia, ib);
          addEdge(ib, ic);
          addEdge(ic, ia);
        }

        for (const [key, edge] of edgeCounts) {
          if (edge.count === 1) {
            accumulator.boundaryEdges += 1;
            if (recordedEdges >= maxEdges) { truncated = true; continue; }
            const records = edgeMap.get(key) ?? [];
            records.push({ meshIndex, normal: edge.normal.clone() });
            edgeMap.set(key, records);
            recordedEdges += 1;
          } else if (edge.count > 2) {
            accumulator.nonManifoldEdges += 1;
          }
        }
      });

      const pairs = new Map<string, { count: number; aligned: number; discontinuous: number }>();
      let sharedEdgesAcrossBodies = 0;
      let normalAlignedEdgesAcrossBodies = 0;
      let normalDiscontinuousEdgesAcrossBodies = 0;
      for (const records of edgeMap.values()) {
        const byMesh = new Map<number, EdgeRecord>();
        for (const record of records) if (!byMesh.has(record.meshIndex)) byMesh.set(record.meshIndex, record);
        const uniqueRecords = [...byMesh.values()];
        if (uniqueRecords.length < 2) continue;
        sharedEdgesAcrossBodies += 1;
        for (let i = 0; i < uniqueRecords.length; i += 1) {
          for (let j = i + 1; j < uniqueRecords.length; j += 1) {
            const left = uniqueRecords[i]!;
            const right = uniqueRecords[j]!;
            const a = meshes[left.meshIndex]!;
            const b = meshes[right.meshIndex]!;
            const pairKey = [a.name, b.name].sort().join(" ↔ ");
            const pair = pairs.get(pairKey) ?? { count: 0, aligned: 0, discontinuous: 0 };
            pair.count += 1;
            const normalDot = Math.abs(left.normal.dot(right.normal));
            if (left.normal.lengthSq() > 0 && right.normal.lengthSq() > 0 && normalDot >= normalAlignmentThreshold) {
              pair.aligned += 1;
              normalAlignedEdgesAcrossBodies += 1;
            } else {
              pair.discontinuous += 1;
              normalDiscontinuousEdgesAcrossBodies += 1;
            }
            pairs.set(pairKey, pair);
            a.sharedEdges += 1;
            b.sharedEdges += 1;
          }
        }
      }

      return Object.freeze({
        meshCount: meshes.length,
        boundaryEdges: meshes.reduce((sum, mesh) => sum + mesh.boundaryEdges, 0),
        nonManifoldEdges: meshes.reduce((sum, mesh) => sum + mesh.nonManifoldEdges, 0),
        sharedEdgesAcrossBodies,
        normalAlignedEdgesAcrossBodies,
        normalDiscontinuousEdgesAcrossBodies,
        candidateSeamPairs: Object.freeze([...pairs].map(([pair, counts]) =>
          `${pair} (${counts.count} aristas coincidentes; ${counts.aligned} planos alineados; ${counts.discontinuous} discontinuidades)`
        )),
        truncated,
        tolerance,
        meshes: Object.freeze(meshes.map((mesh) => Object.freeze(mesh))),
      });
    },
  });
}
