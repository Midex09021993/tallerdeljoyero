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

  try {
    targets.forEach((target) => {
      target.samples = capability.supportedSamples;
    });
    return {
      activeSamples: capability.supportedSamples,
      targetCount: targets.length,
      supported: true,
    };
  } catch (error) {
    targets.forEach((target) => {
      if (target) target.samples = 0;
    });
    console.warn("[AURUM][EDGE][MSAA] No se pudo activar MSAA; se conserva el fallback nativo.", error);
    return { activeSamples: 0, targetCount: 0, supported: false };
  }
}
