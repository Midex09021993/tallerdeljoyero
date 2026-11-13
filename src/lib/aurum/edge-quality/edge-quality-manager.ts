import { inspectAurumEdgeCapabilities } from "./edge-capabilities";
import { configureAurumComposerMsaa } from "./edge-msaa";
import { logAurumEdgeQualityDiagnostics } from "./edge-diagnostics";

/**
 * Central coordinator for AURUM EDGE QUALITY.
 * MSAA is the first active technique. SSAA remains a future capture-only
 * extension; temporal AA and adaptive resolution continue to be owned by the
 * existing post pipeline/runtime to avoid duplicate render loops or buffers.
 */
export function configureAurumEdgeQuality(renderer: any, composer: any) {
  const capabilities = inspectAurumEdgeCapabilities(renderer, 4);
  const msaa = configureAurumComposerMsaa(renderer, composer, 4);
  logAurumEdgeQualityDiagnostics(capabilities, msaa);
  return { capabilities, msaa };
}
