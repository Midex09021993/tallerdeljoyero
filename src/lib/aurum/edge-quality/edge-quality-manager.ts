import { inspectAurumEdgeCapabilities } from "./edge-capabilities";
import { configureAurumComposerMsaa } from "./edge-msaa";
import { logAurumEdgeQualityDiagnostics } from "./edge-diagnostics";

/**
 * Central coordinator for AURUM EDGE QUALITY.
 * The existing 4-sample composer MSAA is a scene-wide baseline and is kept
 * unchanged to avoid altering the established metal/environment appearance.
 * It is not counted as a diamond-only enhancement. All additional AA passes
 * (masked diamond FXAA/SSAA and full-surface edge AA) remain disabled by the
 * post pipeline during the emergency rollback. TAA is also held off there.
 */
export function configureAurumEdgeQuality(renderer: any, composer: any) {
  const capabilities = inspectAurumEdgeCapabilities(renderer, 4);
  const msaa = configureAurumComposerMsaa(renderer, composer, 4);
  logAurumEdgeQualityDiagnostics(capabilities, msaa);
  return { capabilities, msaa };
}
