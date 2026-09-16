import { getAurumScenePreset, type AurumScenePreset } from "../aurum-scene-engine";
import { getAurumPhotographicProfile } from "../aurum-photographic-scene-engine";

export interface AurumSceneController {
  apply: (id: string, opts?: { transparent?: boolean }) => AurumScenePreset;
}

export function createAurumSceneController(
  scene: any,
  renderer: any,
  groundController: any,
  environmentController: any,
  loadEnvironment: (id: string) => void
): AurumSceneController {
  return {
    apply(id, opts) {
      const preset = getAurumScenePreset(id);
      const photo = getAurumPhotographicProfile(id);
      // SceneController es la única autoridad para exposición, intensidad y rotación del environment.
      renderer.toneMappingExposure = photo.exposure;
      // El controlador de Environment es la autoridad para orientación e intensidad.
      // Mantenemos el mismo resultado visual y evitamos duplicar estado en Scene.
      environmentController?.setIntensity?.(photo.environmentIntensity);
      environmentController?.setRotation?.(Math.PI * photo.environmentRotation);
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
      if (id !== "transparente") {
        loadEnvironment(photo.environmentKey);
      } else {
        // La escena transparente conserva el último environment válido
        // para mantener reflejos de producto en los materiales.
      }
      return preset;
    },
  };
}
