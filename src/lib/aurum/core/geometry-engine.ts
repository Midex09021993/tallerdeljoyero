import * as THREE from "three";

export interface AurumGeometryMeshReport {
  readonly name: string;
  readonly vertices: number;
  readonly triangles: number;
  readonly indexed: boolean;
  readonly hasNormals: boolean;
  readonly normalsValid: boolean;
  readonly finitePositions: boolean | null;
  readonly visible: boolean;
}

export interface AurumGeometryReport {
  readonly meshCount: number;
  readonly visibleMeshCount: number;
  readonly vertices: number;
  readonly triangles: number;
  readonly meshesMissingNormals: number;
  readonly meshesWithInvalidPositions: number;
  readonly bounds: {
    readonly min: readonly [number, number, number];
    readonly max: readonly [number, number, number];
    readonly size: readonly [number, number, number];
  } | null;
  readonly meshes: readonly AurumGeometryMeshReport[];
}

export interface AurumGeometryInspectOptions {
  /** Bounds require an additional scene traversal; disable for the import fast path. */
  readonly includeBounds?: boolean;
  /** Full vertex validation is diagnostic work and can be disabled for latency-sensitive loads. */
  readonly validatePositions?: boolean;
}

export interface AurumGeometryEngine {
  readonly id: "aurum.geometry";
  readonly version: "1.0.0";
  inspect(root: THREE.Object3D, options?: AurumGeometryInspectOptions): AurumGeometryReport;
}

/**
 * Read-only geometry inspection for imported jewelry models.
 * This engine never rewrites buffers, normals, indices, transforms or materials.
 * Expensive topology/manifold analysis remains an explicit diagnostic operation.
 */
export function createAurumGeometryEngine(): AurumGeometryEngine {
  return Object.freeze({
    id: "aurum.geometry" as const,
    version: "1.0.0" as const,
    inspect(root: THREE.Object3D, options: AurumGeometryInspectOptions = {}): AurumGeometryReport {
      const includeBounds = options.includeBounds !== false;
      const validatePositions = options.validatePositions !== false;
      const meshes: AurumGeometryMeshReport[] = [];
      let vertices = 0;
      let triangles = 0;
      let visibleMeshCount = 0;
      let meshesMissingNormals = 0;
      let meshesWithInvalidPositions = 0;
      const bounds = includeBounds ? new THREE.Box3().setFromObject(root) : null;
      const hasBounds = Boolean(bounds && !bounds.isEmpty());

      root.traverse((node) => {
        if (!(node as THREE.Mesh).isMesh) return;
        const mesh = node as THREE.Mesh;
        const geometry = mesh.geometry;
        const position = geometry?.getAttribute("position");
        const normal = geometry?.getAttribute("normal");
        const vertexCount = position?.count ?? 0;
        const index = geometry?.getIndex();
        const triangleCount = Math.floor((index?.count ?? vertexCount) / 3);
        let finitePositions: boolean | null = validatePositions ? Boolean(position) : null;

        // Read the backing typed array directly to avoid repeated getX/getY/getZ calls.
        if (validatePositions && position) {
          const array = position.array as ArrayLike<number>;
          const itemSize = position.itemSize;
          for (let i = 0, offset = 0; i < position.count; i += 1, offset += itemSize) {
            if (
              !Number.isFinite(array[offset]) ||
              !Number.isFinite(array[offset + 1]) ||
              !Number.isFinite(array[offset + 2])
            ) {
              finitePositions = false;
              break;
            }
          }
        }
        const hasNormals = Boolean(normal);
        const normalsValid = hasNormals && normal!.count === vertexCount;
        if (!normalsValid) meshesMissingNormals += 1;
        if (finitePositions === false) meshesWithInvalidPositions += 1;

        // Match renderability semantics: a mesh is hidden if any ancestor is hidden.
        let visible = true;
        for (let ancestor: THREE.Object3D | null = mesh; ancestor; ancestor = ancestor.parent) {
          if (!ancestor.visible) {
            visible = false;
            break;
          }
        }
        if (visible) visibleMeshCount += 1;
        vertices += vertexCount;
        triangles += triangleCount;
        meshes.push(Object.freeze({
          name: mesh.name || "Mesh sin nombre",
          vertices: vertexCount,
          triangles: triangleCount,
          indexed: Boolean(index),
          hasNormals,
          normalsValid,
          finitePositions,
          visible,
        }));
      });

      const min = hasBounds ? bounds!.min.toArray() as [number, number, number] : null;
      const max = hasBounds ? bounds!.max.toArray() as [number, number, number] : null;
      const sizeVector = hasBounds ? bounds!.getSize(new THREE.Vector3()) : null;
      const reportBounds = min && max && sizeVector
        ? Object.freeze({ min: Object.freeze(min), max: Object.freeze(max), size: Object.freeze(sizeVector.toArray() as [number, number, number]) })
        : null;

      return Object.freeze({
        meshCount: meshes.length,
        visibleMeshCount,
        vertices,
        triangles,
        meshesMissingNormals,
        meshesWithInvalidPositions,
        bounds: reportBounds,
        meshes: Object.freeze(meshes),
      });
    },
  });
}
