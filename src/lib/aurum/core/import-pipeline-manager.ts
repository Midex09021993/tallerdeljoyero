import type { AurumImportPlugin, AurumImportRequest, AurumImportResult } from "./import-plugin";
import type { AurumGeometryEngine, AurumGeometryReport } from "./geometry-engine";

export interface AurumImportPipelineResult extends AurumImportResult {
  readonly geometry: AurumGeometryReport;
  readonly pipeline: readonly string[];
}

export interface AurumImportPipelineManager {
  readonly id: "aurum.import.manager";
  readonly version: "1.0.0";
  load(request: AurumImportRequest): Promise<AurumImportPipelineResult>;
}

export function createAurumImportPipelineManager(
  importer: AurumImportPlugin,
  geometry: AurumGeometryEngine,
): AurumImportPipelineManager {
  return Object.freeze({
    id: "aurum.import.manager" as const,
    version: "1.0.0" as const,
    async load(request: AurumImportRequest): Promise<AurumImportPipelineResult> {
      const stages = ["import-started"];
      request.onStage?.("import-started", { fileName: request.file.name, format: request.format });
      const imported = await importer.load(request);

      request.onProgress?.("Comprobando geometría...");
      // Import-time inspection keeps essential metrics but skips the optional bounds
      // traversal and full vertex scan. Detailed validation remains available on demand.
      const geometryReport = geometry.inspect(imported.model, {
        includeBounds: false,
        validatePositions: false,
      });
      stages.push(...imported.pipeline, "geometry-inspected");
      request.onStage?.("geometry-inspected", {
        meshes: geometryReport.meshCount,
        visibleMeshes: geometryReport.visibleMeshCount,
        triangles: geometryReport.triangles,
        vertices: geometryReport.vertices,
      });

      return Object.freeze({
        ...imported,
        geometry: geometryReport,
        pipeline: Object.freeze(stages),
      });
    },
  });
}
