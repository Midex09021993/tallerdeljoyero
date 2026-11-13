import type { AurumImportPlugin, AurumImportRequest, AurumImportResult } from "./import-plugin";
import type { AurumGeometryEngine, AurumGeometryReport } from "./geometry-engine";
import { createAurumSurfaceEngine, type AurumSurfaceReport } from "./surface-engine";
import { createAurumSolidEngine, type AurumSolidReport } from "./solid-engine";
import { createAurumIntersectionEngine, type AurumIntersectionReport } from "./intersection-engine";
import { createAurumSmartScan, type AurumSmartScanReport } from "./smart-scan";

export interface AurumImportPipelineResult extends AurumImportResult {
  readonly smartScan: AurumSmartScanReport;
  readonly geometry?: AurumGeometryReport;
  readonly surface?: AurumSurfaceReport;
  readonly solid?: AurumSolidReport;
  readonly intersection?: AurumIntersectionReport;
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
      const throwIfAborted = () => {
        if (request.signal?.aborted) {
          const error = new Error("La importación fue cancelada.");
          error.name = "AbortError";
          throw error;
        }
      };
      const disposeImportedGeometry = (result: AurumImportResult) => {
        const disposed = new Set<object>();
        for (const root of [result.sourceObject, result.model]) {
          root.traverse((node) => {
            const mesh = node as import("three").Mesh;
            const geometry = mesh.geometry;
            if (geometry?.isBufferGeometry && !disposed.has(geometry)) {
              disposed.add(geometry);
              geometry.dispose();
            }
          });
        }
      };
      throwIfAborted();
      request.onStage?.("import-started", { fileName: request.file.name, format: request.format });
      const imported = await importer.load(request);
      try {
        throwIfAborted();

      // Cheap metadata triage runs on every import; it never computes topology.
      request.onProgress?.("Clasificando geometría...");
      const smartScan = createAurumSmartScan().inspect(imported.model);
      throwIfAborted();
      stages.push(...imported.pipeline, "smart-scan-complete");
      request.onStage?.("smart-scan-complete", {
        meshes: smartScan.meshCount,
        visibleMeshes: smartScan.visibleMeshCount,
        green: smartScan.greenCount,
        yellow: smartScan.yellowCount,
        red: smartScan.redCount,
        cachedGeometryHits: smartScan.cachedGeometryHits,
        deepDiagnosticsRecommended: smartScan.deepDiagnosticsRecommended,
      });

      // Production remains fast by default. The scan flags risk; it does not
      // silently launch expensive surface/solid/triangle analysis.
      if (request.diagnostics !== true) {
        stages.push("diagnostics-deferred");
        request.onStage?.("diagnostics-deferred", {
          reason: "opt-in",
          smartScanRisk: smartScan.deepDiagnosticsRecommended ? "review-recommended" : "low-risk",
          format: imported.format,
        });
        return Object.freeze({ ...imported, smartScan, pipeline: Object.freeze(stages) });
      }

      request.onProgress?.("Comprobando geometría...");
      const geometryReport = geometry.inspect(imported.model);
      throwIfAborted();
      stages.push("geometry-inspected");
      request.onStage?.("geometry-inspected", {
        meshes: geometryReport.meshCount, visibleMeshes: geometryReport.visibleMeshCount,
        invalidPositionMeshes: geometryReport.meshesWithInvalidPositions,
        missingNormalMeshes: geometryReport.meshesMissingNormals,
        bounds: geometryReport.bounds, triangles: geometryReport.triangles, vertices: geometryReport.vertices,
      });

      request.onProgress?.("Analizando uniones entre superficies...");
      const surfaceReport = createAurumSurfaceEngine().inspect(imported.model, { tolerance: 1e-5, maxEdges: 250_000 });
      throwIfAborted();
      stages.push("surface-inspected");
      request.onStage?.("surface-inspected", {
        meshes: surfaceReport.meshCount, boundaryEdges: surfaceReport.boundaryEdges,
        nonManifoldEdges: surfaceReport.nonManifoldEdges, coincidentEdges: surfaceReport.sharedEdgesAcrossBodies,
        normalAlignedEdges: surfaceReport.normalAlignedEdgesAcrossBodies,
        normalDiscontinuousEdges: surfaceReport.normalDiscontinuousEdgesAcrossBodies,
        truncated: surfaceReport.truncated, tolerance: surfaceReport.tolerance,
      });

      request.onProgress?.("Analizando sólidos y superficies que los atraviesan...");
      const solidReport = createAurumSolidEngine().inspect(imported.model, {
        tolerance: 1e-5, maxPairs: 10_000, maxSamplesPerBody: 96,
      });
      throwIfAborted();
      stages.push("solid-inspected");
      request.onStage?.("solid-inspected", {
        bodies: solidReport.bodyCount, closedSolids: solidReport.closedSolidCount,
        openSurfaces: solidReport.openSurfaceCount, invalidMeshes: solidReport.invalidMeshCount,
        totalPossiblePairs: solidReport.totalPossiblePairs,
        candidatePairs: solidReport.candidatePairCount, prunedPairs: solidReport.prunedPairCount,
        fallbackPairs: solidReport.fallbackPairCount,
        relations: solidReport.relationCount, unresolvedRelations: solidReport.unresolvedRelationCount,
        truncated: solidReport.truncated, tolerance: solidReport.tolerance,
      });

      request.onProgress?.("Calculando intersecciones reales entre cuerpos...");
      const intersectionReport = createAurumIntersectionEngine().inspect(imported.model, solidReport, {
        tolerance: 1e-5, maxTrianglePairTests: 2_000_000, leafSize: 8,
      });
      throwIfAborted();
      stages.push("intersection-inspected");
      request.onStage?.("intersection-inspected", {
        totalPossiblePairs: intersectionReport.totalPossiblePairs,
        candidatePairs: intersectionReport.candidatePairCount,
        prunedPairs: intersectionReport.prunedPairCount,
        fallbackPairs: intersectionReport.fallbackPairCount,
        intersectingPairs: intersectionReport.intersectingPairCount,
        trianglePairTests: intersectionReport.trianglePairTests,
        truncated: intersectionReport.truncated, tolerance: intersectionReport.tolerance,
      });

      return Object.freeze({
        ...imported, smartScan, geometry: geometryReport, surface: surfaceReport,
        solid: solidReport, intersection: intersectionReport, pipeline: Object.freeze(stages),
      });
      } catch (error) {
        // The manager did not hand a result to the caller; it therefore releases
        // the imported geometry on every failure, not only explicit cancellation.
        disposeImportedGeometry(imported);
        try {
          request.onStage?.("import-failed", {
            reason: error instanceof Error ? error.message : String(error),
            cancelled: request.signal?.aborted === true,
          });
        } catch {
          // Progress observers must not replace the original import failure.
        }
        throw error;
      }
    },
  });
}
