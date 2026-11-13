import * as THREE from "three";
import { parseAurumInput, convertAurumToGlb } from "../model-loader";
import { normalizeAurumModel } from "../model-normalizer";

export type AurumImportFormat = "stl" | "obj" | "glb" | "fbx" | "3dm";

export interface AurumImportRequest {
  readonly file: File;
  readonly format: AurumImportFormat;
  readonly fallbackMaterial: THREE.Material;
  readonly colorRhinoHex: (color: unknown) => string | undefined;
  readonly classifyLayer: (name: string, color?: string) => "metal" | "gema" | "otro";
  readonly onProgress?: (message: string) => void;
  readonly onStage?: (stage: string, details?: Record<string, unknown>) => void;
}

export interface AurumImportResult {
  readonly sourceObject: THREE.Object3D;
  readonly model: THREE.Object3D;
  readonly format: AurumImportFormat;
  readonly pipeline: readonly string[];
}

export interface AurumImportPlugin {
  readonly id: "aurum.import";
  readonly version: "1.0.0";
  load(request: AurumImportRequest): Promise<AurumImportResult>;
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
      const stage = (name: string, details: Record<string, unknown> = {}) => {
        pipeline.push(name);
        request.onStage?.(name, details);
      };
      const progress = (message: string) => request.onProgress?.(message);

      progress(format === "3dm" ? "Leyendo archivo 3DM..." : "Leyendo archivo...");
      const sourceObject = await parseAurumInput(file, format, fallbackMaterial);
      stage("source-decoded", { sourceFormat: format, sourceObjects: countObjects(sourceObject) });

      // Rhino uses Z-up; the established AURUM scene uses Y-up.
      if (format === "3dm") {
        sourceObject.rotation.x = -Math.PI / 2;
        sourceObject.updateMatrixWorld(true);
      }

      let model: THREE.Object3D;
      if (format === "glb") {
        progress("Preparando modelo 3D para el visor...");
        model = await normalizeAurumModel(sourceObject, null, format, colorRhinoHex, classifyLayer);
        stage("glb-normalized");
      } else {
        progress("Convirtiendo a GLB...");
        const glb = await convertAurumToGlb(
          sourceObject,
          colorRhinoHex,
          classifyLayer,
          (message: string) => progress(message),
        );
        stage("source-converted-to-glb", { sourceFormat: format });
        progress("Optimizando estructura para el visor...");
        model = await normalizeAurumModel(sourceObject, glb, format, colorRhinoHex, classifyLayer);
        stage("converted-model-normalized");
      }

      return Object.freeze({
        sourceObject,
        model,
        format,
        pipeline: Object.freeze([...pipeline]),
      });
    },
  });
}

function countObjects(root: THREE.Object3D): number {
  let count = 0;
  root.traverse(() => { count += 1; });
  return count;
}
