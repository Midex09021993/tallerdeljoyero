import * as THREE from "three";

export interface AurumSurfaceMeshReport {
  readonly name: string;
  readonly family: "metal" | "gem" | "other";
  readonly boundaryEdges: number;
  readonly sharedEdges: number;
}

export interface AurumSurfaceReport {
  readonly meshCount: number;
  readonly boundaryEdges: number;
  readonly sharedEdgesAcrossBodies: number;
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
}

export interface AurumSurfaceEngine {
  readonly id: "aurum.surface";
  readonly version: "0.1.0";
  inspect(root: THREE.Object3D, options?: AurumSurfaceInspectOptions): AurumSurfaceReport;
}

type EdgeRecord = { meshIndex: number; key: string };
type MeshAccumulator = { name: string; family: "metal" | "gem" | "other"; boundaryEdges: number; sharedEdges: number };

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
 * Read-only seam diagnostic. It detects boundary edges that coincide between
 * separate mesh bodies in world space. It does not weld vertices, fuse solids,
 * alter normals, change materials, or generate a replacement GLB.
 */
export function createAurumSurfaceEngine(): AurumSurfaceEngine {
  return Object.freeze({
    id: "aurum.surface" as const,
    version: "0.1.0" as const,
    inspect(root: THREE.Object3D, options: AurumSurfaceInspectOptions = {}): AurumSurfaceReport {
      const tolerance = options.tolerance ?? 1e-5;
      const maxEdges = options.maxEdges ?? 1_000_000;
      if (!Number.isFinite(tolerance) || tolerance <= 0) throw new Error("AURUM SURFACE tolerance must be a positive finite number.");
      if (!Number.isInteger(maxEdges) || maxEdges < 1) throw new Error("AURUM SURFACE maxEdges must be a positive integer.");

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
          sharedEdges: 0,
        };
        meshes.push(accumulator);

        const position = mesh.geometry.getAttribute("position");
        const index = mesh.geometry.getIndex();
        const edgeCounts = new Map<string, number>();
        const world = new THREE.Vector3();
        const vertexKey = (vertexIndex: number) => {
          world.fromBufferAttribute(position, vertexIndex).applyMatrix4(mesh.matrixWorld);
          return `${quantize(world.x, tolerance)},${quantize(world.y, tolerance)},${quantize(world.z, tolerance)}`;
        };
        const addEdge = (a: number, b: number) => {
          const ka = vertexKey(a), kb = vertexKey(b);
          if (ka === kb) return;
          const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
          edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
        };
        const count = index?.count ?? position.count;
        for (let i = 0; i + 2 < count; i += 3) {
          const a = index ? index.getX(i) : i;
          const b = index ? index.getX(i + 1) : i + 1;
          const c = index ? index.getX(i + 2) : i + 2;
          addEdge(a, b); addEdge(b, c); addEdge(c, a);
        }
        for (const [key, countForEdge] of edgeCounts) {
          if (countForEdge !== 1) continue;
          accumulator.boundaryEdges += 1;
          if (recordedEdges >= maxEdges) { truncated = true; continue; }
          const records = edgeMap.get(key) ?? [];
          records.push({ meshIndex, key });
          edgeMap.set(key, records);
          recordedEdges += 1;
        }
      });

      const pairs = new Map<string, number>();
      let sharedEdgesAcrossBodies = 0;
      for (const records of edgeMap.values()) {
        const uniqueMeshes = [...new Set(records.map((record) => record.meshIndex))];
        if (uniqueMeshes.length < 2) continue;
        sharedEdgesAcrossBodies += 1;
        for (let i = 0; i < uniqueMeshes.length; i += 1) {
          for (let j = i + 1; j < uniqueMeshes.length; j += 1) {
            const a = meshes[uniqueMeshes[i]].name;
            const b = meshes[uniqueMeshes[j]].name;
            const key = [a, b].sort().join(" ↔ ");
            pairs.set(key, (pairs.get(key) ?? 0) + 1);
            meshes[uniqueMeshes[i]].sharedEdges += 1;
            meshes[uniqueMeshes[j]].sharedEdges += 1;
          }
        }
      }

      return Object.freeze({
        meshCount: meshes.length,
        boundaryEdges: meshes.reduce((sum, mesh) => sum + mesh.boundaryEdges, 0),
        sharedEdgesAcrossBodies,
        candidateSeamPairs: Object.freeze([...pairs].map(([pair, count]) => `${pair} (${count} aristas coincidentes)`)),
        truncated,
        tolerance,
        meshes: Object.freeze(meshes.map((mesh) => Object.freeze(mesh))),
      });
    },
  });
}
