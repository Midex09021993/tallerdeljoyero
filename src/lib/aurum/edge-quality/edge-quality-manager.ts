import { inspectAurumEdgeCapabilities } from "./edge-capabilities";
import { configureAurumComposerMsaa } from "./edge-msaa";
import { logAurumEdgeQualityDiagnostics } from "./edge-diagnostics";

/**
 * Central coordinator for AURUM EDGE QUALITY.
 * MSAA configures the composer's ping-pong targets. Surface edge AA is
 * provided as a low-strength post pass and is gated by the post pipeline to
 * settled/high-quality frames. TAA and adaptive resolution retain their
 * existing owners to avoid duplicate render loops or buffers.
 */
export function configureAurumEdgeQuality(renderer: any, composer: any) {
  const capabilities = inspectAurumEdgeCapabilities(renderer, 4);
  const msaa = configureAurumComposerMsaa(renderer, composer, 4);
  logAurumEdgeQualityDiagnostics(capabilities, msaa);
  return { capabilities, msaa };
}
