import { getAurumScenePreset, type AurumScenePreset } from "../aurum-scene-engine";

export interface AurumSceneController {
  apply: (id: string, opts?: { transparent?: boolean }) => AurumScenePreset;
}

export function createAurumSceneController(
  scene: any,
  renderer: any,
  groundController: any,
  environmentController: any,
  loadEnvironment: (id: string, rotation: number) => void
): AurumSceneController {
  return {
    apply(id, opts) {
      const preset = getAurumScenePreset(id);
      renderer.toneMappingExposure = preset.exposure;
      scene.environmentIntensity = preset.environmentIntensity;
      scene.environmentRotation.y = Math.PI * preset.environmentRotation;

      if (opts?.transparent || id === "transparente") {
        scene.background = null;
        renderer.setClearColor(0, 0);
      } else {
        renderer.setClearColor(preset.background, 1);
        const previous = scene.background;
        if (previous?.isTexture) previous.dispose?.();
        scene.background = null;
      }

      groundController.updateFromPreset(preset);
      if (id !== "transparente") loadEnvironment(id, preset.environmentRotation);
      return preset;
    },
  };
}
