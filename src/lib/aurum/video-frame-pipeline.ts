import type { IAurumVideoFramePipelineContract } from "./core/module-contracts";

/**
 * AURUM MEDIA EXPORT — Video frame pipeline.
 *
 * Captures video frames through the same live beauty/composition passes used
 * by the still-image live-viewport capture. It does not create a renderer,
 * scene, camera, materials, shaders or WebGL context.
 */
export interface AurumVideoFramePipelineOptions {
  composer: any;
  renderer: any;
  scene: any;
  camera: any;
  diamondBvhRuntime?: { update?: () => void } | null;
  livePasses: readonly any[];
  width: number;
  height: number;
  restoreWidth: number;
  restoreHeight: number;
}

export interface AurumVideoFramePipeline extends IAurumVideoFramePipelineContract {
  renderFrame: () => void;
  restore: () => void;
}

/** Compose the existing viewer beauty passes for video without enabling TAA. */
export function getAurumVideoLivePasses(options: {
  renderPass: any;
  gemMaskPass: any;
  fxaaPass: any;
  gemFxaaEnabled?: boolean;
  surfaceEdgeAaPass?: any;
  surfaceEdgeAaEnabled?: boolean;
  outputPass: any;
}): any[] {
  const { renderPass, gemMaskPass, fxaaPass, gemFxaaEnabled = false, surfaceEdgeAaPass, surfaceEdgeAaEnabled, outputPass } = options;
  return [
    renderPass,
    gemMaskPass,
    ...(gemFxaaEnabled ? [fxaaPass] : []),
    ...(surfaceEdgeAaPass && surfaceEdgeAaEnabled ? [surfaceEdgeAaPass] : []),
    outputPass,
  ].filter(Boolean);
}

export function createAurumVideoFramePipeline(
  options: AurumVideoFramePipelineOptions,
): AurumVideoFramePipeline {
  const {
    composer,
    renderer,
    scene,
    camera,
    diamondBvhRuntime,
    livePasses,
    width,
    height,
    restoreWidth,
    restoreHeight,
  } = options;

  const originalComposerPixelRatio = Number(composer?.getPixelRatio?.() ?? renderer?.getPixelRatio?.() ?? 1);
  const passStates = ((composer?.passes ?? []) as any[]).map((pass) => ({
    pass,
    enabled: Boolean(pass?.enabled),
  }));
  const activePasses = new Set(livePasses.filter(Boolean));
  let restored = false;

  const restoreState = () => {
    if (!composer) return;
    // Attempt every restoration even if one composer operation fails.
    let firstError: unknown;
    try {
      composer.setPixelRatio?.(originalComposerPixelRatio);
    } catch (error) {
      firstError = error;
    }
    try {
      composer.setSize?.(restoreWidth, restoreHeight);
    } catch (error) {
      firstError ??= error;
    }
    for (const { pass, enabled } of passStates) {
      try {
        if (pass && "enabled" in pass) pass.enabled = enabled;
      } catch (error) {
        firstError ??= error;
      }
    }
    if (firstError) throw firstError;
  };

  if (composer) {
    try {
      composer.setPixelRatio?.(1);
      composer.setSize?.(width, height);
      for (const { pass } of passStates) {
        pass.enabled = activePasses.has(pass);
      }
    } catch (error) {
      // Construction has not returned a restore handle yet, so rollback here.
      restored = true;
      try {
        restoreState();
      } catch {
        // Preserve the setup error; rollback was best-effort across all state.
      }
      throw error;
    }
  }

  return {
    renderFrame: () => {
      if (restored) throw new Error("El pipeline de vídeo ya fue restaurado.");
      diamondBvhRuntime?.update?.();
      if (composer) composer.render();
      else renderer.render(scene, camera);
    },
    restore: () => {
      if (restored) return;
      restored = true;
      restoreState();
    },
  };
}
