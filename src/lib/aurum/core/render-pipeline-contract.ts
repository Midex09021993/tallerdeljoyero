import type { IAurumRenderPipelineContract, IAurumRenderPipelineRuntime, AurumRenderMode } from "./module-contracts";

/**
 * Formal mode adapter over the existing post pipeline.
 * LIVE and SETTLED both keep temporal motion disabled; this adapter never
 * enables TAA. CAPTURE is an orchestration label, not a TAA switch.
 */
export function createAurumRenderPipelineContract(
  runtime: IAurumRenderPipelineRuntime,
  initialMode: AurumRenderMode = "RESTING_SETTLED",
): IAurumRenderPipelineContract {
  let mode = initialMode;
  runtime.setTemporalMotion(mode === "LIVE_MOTION");
  return Object.freeze({
    runtime,
    getMode: () => mode,
    setMode(next: AurumRenderMode) {
      mode = next;
      runtime.setTemporalMotion(next === "LIVE_MOTION");
    },
  });
}
