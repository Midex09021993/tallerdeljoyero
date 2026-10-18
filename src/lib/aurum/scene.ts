import * as THREE from "three";
import { getAurumScenePreset, type AurumScenePreset } from "../aurum-scene-engine";
import { getAurumPhotographicProfile } from "../aurum-photographic-scene-engine";

export interface AurumSceneController {
  apply: (id: string, opts?: { transparent?: boolean }) => AurumScenePreset;
  setBackground: (id: string) => void;
}

export function createAurumSceneController(
  scene: any,
  renderer: any,
  groundController: any,
  environmentController: any,
  loadEnvironment: (id: string) => void,
  backgroundElement?: { style: { backgroundColor: string; backgroundImage?: string; backgroundSize?: string; backgroundPosition?: string }; dataset?: Record<string, string | undefined> }
): AurumSceneController {
  let currentPreset = getAurumScenePreset("ijewelReference");
  let backgroundOverride: string | null = null;
  const studioBackground = "radial-gradient(ellipse at 50% 38%, rgba(255,255,255,.92) 0%, rgba(250,244,234,.76) 26%, rgba(240,228,212,.22) 55%, transparent 72%), linear-gradient(180deg, #d7c8b8 0%, #f1e6d8 49%, #cfc0ad 50%, #e8ded0 100%)";
  const applyBackground = (color:string | null) => {
    if (backgroundElement?.style) {
      backgroundElement.style.backgroundColor = color ?? ("#" + Number(currentPreset.background).toString(16).padStart(6, "0"));
      backgroundElement.style.backgroundImage = color === null && backgroundElement.dataset?.aurumHasModel !== "true" ? studioBackground : "none";
      backgroundElement.style.backgroundSize = "cover";
      backgroundElement.style.backgroundPosition = "center";
    }
    renderer.setClearColor(0x000000, 0);
  };

  return {
    setBackground(id:string) {
      const backgrounds:Record<string,string> = {
        blanco:"#ffffff", marfil:"#f4f1e9", grisClaro:"#e7e7e4", grisMedio:"#a6a6a3", grisOscuro:"#303236", negro:"#090b0e", transparente:"transparent",
      };
      backgroundOverride = id === "escena" ? null : (backgrounds[id] ?? null);
      applyBackground(backgroundOverride);
    },
    apply(id, opts) {
      const preset = getAurumScenePreset(id);
      currentPreset = preset;
      const photo = getAurumPhotographicProfile(id);
      // SceneController es la única autoridad para exposición, intensidad y rotación del environment.
      renderer.toneMapping = id === "ijewelReference" ? THREE.ACESFilmicToneMapping : THREE.AgXToneMapping;
      renderer.toneMappingExposure = photo.exposure;
      environmentController?.setIntensity?.(photo.environmentIntensity);
      environmentController?.setRotation?.(Math.PI * photo.environmentRotation);
      // The studio sweep is a CSS backdrop behind the transparent WebGL canvas.
      // It does not enter the Three.js scene, HDRI lighting, gem refraction or render targets.
      scene.background = null;
      if (backgroundOverride !== null) {
        applyBackground(backgroundOverride);
      } else if (opts?.transparent || id === "transparente") {
        if (backgroundElement?.style) {
          backgroundElement.style.backgroundColor = "transparent";
          backgroundElement.style.backgroundImage = "none";
        }
        renderer.setClearColor(0x000000, 0);
      } else {
        applyBackground(null);
      }

      groundController.updateFromPreset(preset);
      if (id !== "transparente") {
        loadEnvironment(photo.environmentKey);
      } else {
        // Keep the last valid environment for product reflections in transparent mode.
      }
      return preset;
    },
  };
}
