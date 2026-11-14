import * as THREE from "three";
import { parseAurumInput, convertAurumToGlb } from "../model-loader";
import { normalizeAurumModel } from "../model-normalizer";
import type { IAurumGeometryContract } from "./module-contracts";

export type AurumImportFormat = "stl" | "obj" | "glb" | "fbx" | "3dm";

export interface AurumImportRequest {
  readonly file: File;
  readonly format: AurumImportFormat;
  readonly fallbackMaterial: THREE.Material;
  readonly colorRhinoHex: (color: unknown) => string | undefined;
  readonly classifyLayer: (name: string, color?: string) => "metal" | "gema" | "otro";
  readonly onProgress?: (message: string) => void;
  readonly onStage?: (stage: string, details?: Record<string, unknown>) => void;
  /** Run expensive read-only geometry diagnostics during this import. Production defaults to false. */
  readonly diagnostics?: boolean;
  /** Experimental visual metal CSG union. Disabled by default to preserve source CAD surfaces; enable only for controlled A/B tests. */
  readonly metalUnion?: boolean;
  /** Experimental non-CSG metal draw-call consolidation. Disabled by default; source meshes remain hidden and recoverable. */
  readonly metalFastVisualMerge?: boolean;
  /** Cancels the import at safe stage boundaries. Active third-party decoders may finish before cancellation is observed. */
  readonly signal?: AbortSignal;
  /** Optional hard file-size ceiling. Unset by default to preserve existing CAD workflows. */
  readonly maxFileBytes?: number;
  /** Advisory geometry budgets; exceeding them reports a warning but never rejects by default. */
  readonly geometryBudget?: {
    readonly maxMeshes?: number;
    readonly maxVertices?: number;
    readonly maxTriangles?: number;
  };
}

export interface AurumImportResult {
  readonly sourceObject: THREE.Object3D;
  readonly model: THREE.Object3D;
  readonly format: AurumImportFormat;
  readonly pipeline: readonly string[];
}

export interface AurumImportPlugin extends IAurumGeometryContract<AurumImportRequest, AurumImportResult> {
  readonly id: "aurum.import";
  readonly version: "1.0.0";
  load(request: AurumImportRequest): Promise<AurumImportResult>;
}

/**
 * Releases decoder-side geometry after a distinct normalized model is ready.
 * Geometries still referenced by the retained viewer model are never disposed.
 * Materials are intentionally excluded because decoder fallbacks may be shared.
 */
export function disposeAurumImportSourceGeometry(
  sourceObject: THREE.Object3D,
  retainedModel: THREE.Object3D,
): number {
  if (sourceObject === retainedModel) return 0;

  const retained = new Set<THREE.BufferGeometry>();
  retainedModel.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry?.isBufferGeometry) retained.add(mesh.geometry);
  });

  const released = new Set<THREE.BufferGeometry>();
  sourceObject.traverse((node) => {
    const mesh = node as THREE.Mesh;
    const geometry = mesh.isMesh ? mesh.geometry : null;
    if (geometry?.isBufferGeometry && !retained.has(geometry) && !released.has(geometry)) {
      released.add(geometry);
      geometry.dispose();
    }
  });
  return released.size;
}

const SUPPORTED_FORMATS = new Set<AurumImportFormat>(["stl", "obj", "glb", "fbx", "3dm"]);

/**
 * AURUM IMPORT CORE.
 *
 * Owns the import orchestration boundary while deliberately delegating format
 * decoding, Rhino metadata hydration, GLB conversion and normalization to the
 * proven production implementations. It does not own renderer/GPU resources.
 */
export function createAurumImportPlugin(): AurumImportPlugin {
  return Object.freeze({
    id: "aurum.import" as const,
    version: "1.0.0" as const,
    async load(request: AurumImportRequest): Promise<AurumImportResult> {
      const { file, format, fallbackMaterial, colorRhinoHex, classifyLayer } = request;
      if (!SUPPORTED_FORMATS.has(format)) {
        throw new Error(`Formato no compatible: ${format}`);
      }

      const pipeline: string[] = [];
      const throwIfAborted = () => {
        if (request.signal?.aborted) {
          const error = new Error("La importación fue cancelada.");
          error.name = "AbortError";
          throw error;
        }
      };
      const disposeGeometry = (...roots: THREE.Object3D[]) => {
        const disposed = new Set<THREE.BufferGeometry>();
        for (const root of roots) {
          root.traverse((node) => {
            const mesh = node as THREE.Mesh;
            if (mesh.geometry?.isBufferGeometry && !disposed.has(mesh.geometry)) {
              disposed.add(mesh.geometry);
              mesh.geometry.dispose();
            }
          });
        }
      };
      let model: THREE.Object3D | null = null;
      const stage = (name: string, details: Record<string, unknown> = {}) => {
        pipeline.push(name);
        request.onStage?.(name, details);
      };
      const progress = (message: string) => request.onProgress?.(message);

      throwIfAborted();
      progress(format === "3dm" ? "Leyendo archivo 3DM..." : "Leyendo archivo...");
      const sourceObject = await parseAurumInput(file, format, fallbackMaterial);
      try {
        throwIfAborted();
        stage("source-decoded", { sourceFormat: format, sourceObjects: countObjects(sourceObject) });

      // Rhino uses Z-up; the established AURUM scene uses Y-up.
      if (format === "3dm") {
        sourceObject.rotation.x = -Math.PI / 2;
        sourceObject.updateMatrixWorld(true);
      }
      throwIfAborted();

      if (format === "glb") {
        progress("Preparando modelo 3D para el visor...");
        model = await normalizeAurumModel(sourceObject, null, format, colorRhinoHex, classifyLayer);
        throwIfAborted();
        stage("glb-normalized");
      } else {
        progress("Convirtiendo a GLB...");
        const glb = await convertAurumToGlb(
          sourceObject,
          colorRhinoHex,
          classifyLayer,
          (message: string) => progress(message),
          { metalUnion: request.metalUnion === true, metalFastVisualMerge: request.metalFastVisualMerge === true },
        );
        throwIfAborted();
        stage("source-converted-to-glb", { sourceFormat: format });
        progress("Optimizando estructura para el visor...");
        model = await normalizeAurumModel(sourceObject, glb, format, colorRhinoHex, classifyLayer);
        throwIfAborted();
        stage("converted-model-normalized");
      }

      throwIfAborted();
      if (!model) throw new Error("La importación no produjo un modelo normalizado.");
      // The viewer consumes the normalized model. Decoder-side source buffers
      // are no longer needed for converted formats; GLB input aliases model and
      // is therefore retained without a second disposal.
      const releasedSourceGeometries = disposeAurumImportSourceGeometry(sourceObject, model);
      if (releasedSourceGeometries > 0) pipeline.push("source-geometry-released");
      return Object.freeze({
        sourceObject,
        model,
        format,
        pipeline: Object.freeze([...pipeline]),
      });
      } catch (error) {
        // The importer owns decoded geometry until a successful result is handed
        // to the caller. On cancellation/failure, release geometry buffers only;
        // materials may be shared with the viewer and are deliberately untouched.
        disposeGeometry(sourceObject, ...(model ? [model] : []));
        throw error;
      }
    },
  });
}

function countObjects(root: THREE.Object3D): number {
  let count = 0;
  root.traverse(() => { count += 1; });
  return count;
}
