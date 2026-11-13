import type { AurumImportPlugin, AurumImportRequest, AurumImportResult } from "./import-plugin";
import type { AurumGeometryEngine, AurumGeometryReport } from "./geometry-engine";
import { createAurumSurfaceEngine, type AurumSurfaceReport } from "./surface-engine";
import { createAurumSolidEngine, type AurumSolidReport } from "./solid-engine";

export interface AurumImportPipelineResult extends AurumImportResult {
  readonly geometry: AurumGeometryReport;
  readonly surface: AurumSurfaceReport;
  readonly solid: AurumSolidReport;
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
      // Quality-first import: complete read-only inspection before accepting the model.
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

      request.onProgress?.("Analizando sólidos y superficies que los atraviesan...");
      const solidReport = createAurumSolidEngine().inspect(imported.model, {
        tolerance: 1e-5,
        maxPairs: 10_000,
        maxSamplesPerBody: 96,
      });
      stages.push("solid-inspected");
      request.onStage?.("solid-inspected", {
        bodies: solidReport.bodyCount,
        closedSolids: solidReport.closedSolidCount,
        openSurfaces: solidReport.openSurfaceCount,
        invalidMeshes: solidReport.invalidMeshCount,
        relations: solidReport.relationCount,
        unresolvedRelations: solidReport.unresolvedRelationCount,
        truncated: solidReport.truncated,
        tolerance: solidReport.tolerance,
      });

      return Object.freeze({
        ...imported,
        geometry: geometryReport,
        surface: surfaceReport,
        solid: solidReport,
        pipeline: Object.freeze(stages),
      });
    },
  });
}
