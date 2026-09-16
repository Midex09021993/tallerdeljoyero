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
  loadEnvironment: (id: string, rotation?: number) => void,
  backgroundElement?: { style: { backgroundColor: string } }
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
      // Keep the photographic background outside the AgX/composer response.
      // iJewel separates background tonemapping from the metal/gem response;
      // this preserves a true white product sweep while the jewelry keeps its
      // HDR reflections, LUT and tone mapping.
      scene.background = null;
      if (opts?.transparent || id === "transparente") {
        if (backgroundElement?.style) backgroundElement.style.backgroundColor = "transparent";
        renderer.setClearColor(0x000000, 0);
      } else {
        const hex = Number(preset.background).toString(16).padStart(6, "0");
        if (backgroundElement?.style) backgroundElement.style.backgroundColor = "#" + hex;
        renderer.setClearColor(0x000000, 0);
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
