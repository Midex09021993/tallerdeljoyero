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
      // SceneController es la única autoridad para exposición, intensidad y rotación del environment.
      renderer.toneMappingExposure = preset.exposure;
      // El controlador de Environment es la autoridad para orientación e intensidad.
      // Mantenemos el mismo resultado visual y evitamos duplicar estado en Scene.
      environmentController?.setIntensity?.(preset.environmentIntensity);
      environmentController?.setRotation?.(Math.PI * preset.environmentRotation);
      // Compatibilidad con versiones de three.js que no exponen estos setters.
      scene.environmentIntensity = preset.environmentIntensity;
      if (scene.environmentRotation) {
        scene.environmentRotation.y = Math.PI * preset.environmentRotation;
      }

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
        loadEnvironment(id, preset.environmentRotation);
      } else {
        // La escena transparente conserva el último environment válido
        // para mantener reflejos de producto en los materiales.
      }
      return preset;
    },
  };
}
