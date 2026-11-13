import type { AurumImportPlugin, AurumImportRequest, AurumImportResult } from "./import-plugin";
import type { AurumGeometryEngine, AurumGeometryReport } from "./geometry-engine";
import { createAurumSurfaceEngine, type AurumSurfaceReport } from "./surface-engine";

export interface AurumImportPipelineResult extends AurumImportResult {
  readonly geometry: AurumGeometryReport;
  readonly surface: AurumSurfaceReport;
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
      // Quality-first import: perform the complete read-only inspection before
      // accepting the model. Import latency is secondary to detecting damaged geometry.
      const geometryReport = geometry.inspect(imported.model);
      stages.push(...imported.pipeline, "geometry-inspected");
      request.onStage?.("geometry-inspected", {
        meshes: geometryReport.meshCount,
        visibleMeshes: geometryReport.visibleMeshCount,
        invalidPositionMeshes: geometryReport.meshesWithInvalidPositions,
        missingNormalMeshes: geometryReport.meshesMissingNormals,
        bounds: geometryReport.bounds,
        triangles: geometryReport.triangles,
        vertices: geometryReport.vertices,
      });

      request.onProgress?.("Analizando uniones entre superficies...");
      const surfaceReport = createAurumSurfaceEngine().inspect(imported.model, {
        tolerance: 1e-5,
        maxEdges: 250_000,
      });
      stages.push("surface-inspected");
      request.onStage?.("surface-inspected", {
        meshes: surfaceReport.meshCount,
        boundaryEdges: surfaceReport.boundaryEdges,
        nonManifoldEdges: surfaceReport.nonManifoldEdges,
        coincidentEdges: surfaceReport.sharedEdgesAcrossBodies,
        normalAlignedEdges: surfaceReport.normalAlignedEdgesAcrossBodies,
        normalDiscontinuousEdges: surfaceReport.normalDiscontinuousEdgesAcrossBodies,
        truncated: surfaceReport.truncated,
        tolerance: surfaceReport.tolerance,
      });

      return Object.freeze({
        ...imported,
        geometry: geometryReport,
        surface: surfaceReport,
        pipeline: Object.freeze(stages),
      });
    },
  });
}
