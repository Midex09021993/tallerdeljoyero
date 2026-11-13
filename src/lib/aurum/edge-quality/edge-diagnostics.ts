import type { AurumMsaaResult } from "./edge-msaa";
import type { AurumEdgeCapabilities } from "./edge-capabilities";

export function logAurumEdgeQualityDiagnostics(
  capabilities: AurumEdgeCapabilities,
  msaa: AurumMsaaResult,
): void {
  console.info("[AURUM][EDGE QUALITY]", {
    webgl2: capabilities.webgl2,
    maxSamples: capabilities.maxSamples,
    requestedSamples: capabilities.requestedSamples,
    activeSamples: msaa.activeSamples,
    multisampledTargets: msaa.targetCount,
    fallback: !msaa.supported,
    activeTechniques: {
      surfaceEdgeAa: "settled-high-quality-only",
      gemstoneEdgeAa: "settled-high-quality-only",
    },
    futureTechniques: {
      ssaa: "not-enabled",
      taa: "existing-post-pipeline-controlled",
      adaptiveResolution: "existing-quality-controller",
    },
  });
}
