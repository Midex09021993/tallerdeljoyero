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

export interface AurumVideoFramePipeline {
  renderFrame: () => void;
  restore: () => void;
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

  if (composer) {
    composer.setPixelRatio?.(1);
    composer.setSize?.(width, height);
    for (const { pass } of passStates) {
      pass.enabled = activePasses.has(pass);
    }
  }

  return {
    renderFrame: () => {
      diamondBvhRuntime?.update?.();
      if (composer) composer.render();
      else renderer.render(scene, camera);
    },
    restore: () => {
      if (restored) return;
      restored = true;
      if (composer) {
        composer.setPixelRatio?.(originalComposerPixelRatio);
        composer.setSize?.(restoreWidth, restoreHeight);
        for (const { pass, enabled } of passStates) {
          if (pass && "enabled" in pass) pass.enabled = enabled;
        }
      }
    },
  };
}
