import { inspectAurumEdgeCapabilities } from "./edge-capabilities";

export type AurumMsaaResult = {
  activeSamples: number;
  targetCount: number;
  supported: boolean;
};

/**
 * Applies multisampling to EffectComposer's two ping-pong targets.
 * Must be called immediately after EffectComposer construction and before
 * the targets are rendered. Does not change the renderer or optical materials.
 *
 * If either target cannot accept the requested sample count, both targets are
 * returned to their original sample settings so the composer never runs with
 * a partially configured ping-pong pair.
 */
export function configureAurumComposerMsaa(
  renderer: any,
  composer: any,
  requestedSamples = 4,
): AurumMsaaResult {
  const capability = inspectAurumEdgeCapabilities(renderer, requestedSamples);
  const targets = [composer?.renderTarget1, composer?.renderTarget2];

  if (capability.supportedSamples < 2 || targets.some((target) => !target)) {
    return { activeSamples: 0, targetCount: 0, supported: false };
  }

  const originalSamples = targets.map((target) => Number(target.samples ?? 0));
  try {
    targets.forEach((target) => {
      target.samples = capability.supportedSamples;
    });
    if (targets.some((target) => Number(target.samples) !== capability.supportedSamples)) {
      throw new Error("EffectComposer render targets did not retain the requested MSAA sample count.");
    }
    return {
      activeSamples: capability.supportedSamples,
      targetCount: targets.length,
      supported: true,
    };
  } catch (error) {
    targets.forEach((target, index) => {
      try {
        target.samples = originalSamples[index] ?? 0;
      } catch {
        // A non-writable target is already on its original value.
      }
    });
    console.warn("[AURUM][EDGE][MSAA] No se pudo activar MSAA; se conserva el fallback nativo.", error);
    return { activeSamples: 0, targetCount: 0, supported: false };
  }
}
