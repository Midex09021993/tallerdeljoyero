import { createAurumVideoFramePipeline } from "../video-frame-pipeline";
import { recordAurumCanvasVideo } from "../video-exporter";
import type { IAurumMediaExportContract, IAurumVideoFramePipelineContract } from "./module-contracts";

/** Stable facade over the existing frame pipeline and canvas-record MP4 encoder. */
export function createAurumMediaExportContract(): IAurumMediaExportContract {
  return Object.freeze({
    createFramePipeline(options: unknown): IAurumVideoFramePipelineContract {
      return createAurumVideoFramePipeline(options as Parameters<typeof createAurumVideoFramePipeline>[0]);
    },
    recordCanvas(source: HTMLCanvasElement, options?: unknown): Promise<void> {
      return recordAurumCanvasVideo(source, options as Parameters<typeof recordAurumCanvasVideo>[1]);
    },
  });
}
