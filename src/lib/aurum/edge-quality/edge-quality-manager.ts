import { inspectAurumEdgeCapabilities } from "./edge-capabilities";
import { configureAurumComposerMsaa } from "./edge-msaa";
import { logAurumEdgeQualityDiagnostics } from "./edge-diagnostics";

/**
 * Central coordinator for AURUM EDGE QUALITY.
 * Composer MSAA stays disabled so only the masked diamond AA path is active. Surface edge AA is
 * provided as a low-strength post pass and is gated by the post pipeline to
 * settled/high-quality frames. TAA and adaptive resolution retain their
 * existing owners to avoid duplicate render loops or buffers.
 */
export function configureAurumEdgeQuality(renderer: any, composer: any) {
  const capabilities = inspectAurumEdgeCapabilities(renderer, 4);
  const msaa = configureAurumComposerMsaa(renderer, composer, 0);
  logAurumEdgeQualityDiagnostics(capabilities, msaa);
  return { capabilities, msaa };
}
