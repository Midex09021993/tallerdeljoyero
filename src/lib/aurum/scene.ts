import { getAurumScenePreset, type AurumScenePreset } from "../aurum-scene-engine";

export interface AurumSceneController {
  apply: (id: string, opts?: { transparent?: boolean }) => AurumScenePreset;
  setBackground: (id: string) => void;
}

export function createAurumSceneController(
  scene: any,
  renderer: any,
  groundController: any,
  backgroundElement?: { style: { backgroundColor: string; backgroundImage?: string; backgroundSize?: string; backgroundPosition?: string; backgroundRepeat?: string } }
): AurumSceneController {
  let currentPreset = getAurumScenePreset("ijewelReference");
  let backgroundOverride: string | null = null;
  let backgroundImageOverride: string | null = null;
  const applyBackground = (color:string | null, image:string | null = null) => {
    if (backgroundElement?.style) {
      backgroundElement.style.backgroundColor = color ?? ("#" + Number(currentPreset.background).toString(16).padStart(6, "0"));
      backgroundElement.style.backgroundImage = image
        ? (image.startsWith("linear-gradient(") ? image : `url("${image}")`)
        : "none";
      backgroundElement.style.backgroundSize = image ? "cover" : "";
      backgroundElement.style.backgroundPosition = image ? "center center" : "";
      backgroundElement.style.backgroundRepeat = image ? "no-repeat" : "";
    }
    renderer.setClearColor(0x000000, 0);
  };

  return {
    setBackground(id:string) {
      const backgrounds:Record<string,string> = {
        blanco:"#ffffff", marfil:"#f4f1e9", grisClaro:"#e7e7e4", grisMedio:"#a6a6a3", grisOscuro:"#303236", negro:"#090b0e", transparente:"transparent",
      };
      backgroundImageOverride =
        id === "estudioFotografico"
          ? "https://packs.ijewel3d.com/files/bg_1_d37cf7c1d8.jpg"
          : id === "degradadoGrisBlanco"
            ? "linear-gradient(135deg, #ffffff 0%, #eeeeec 48%, #bfc1c0 100%)"
            : null;
      backgroundOverride = id === "escena" ? null : (backgrounds[id] ?? (backgroundImageOverride ? "#f4f4f2" : null));
      applyBackground(backgroundOverride, backgroundImageOverride);
    },
    apply(id, opts) {
      const preset = getAurumScenePreset(id);
      currentPreset = preset;
      scene.background = null;
      if (backgroundOverride !== null) {
        applyBackground(backgroundOverride, backgroundImageOverride);
      } else if (preset.preserveBackground) {
        // Scene cards own only the floor/shadow presentation; Fondos owns the backdrop.
        // In "Según la escena", initialize the CSS backdrop from the scene preset.
        // The transparent WebGL canvas then reveals that backdrop instead of black.
        applyBackground(null);
      } else if (opts?.transparent || id === "transparente") {
        if (backgroundElement?.style) {
          backgroundElement.style.backgroundColor = "transparent";
          backgroundElement.style.backgroundImage = "none";
          backgroundElement.style.backgroundSize = "";
          backgroundElement.style.backgroundPosition = "";
          backgroundElement.style.backgroundRepeat = "";
        }
        renderer.setClearColor(0x000000, 0);
      } else {
        applyBackground(null);
      }

      groundController.updateFromPreset(preset);
      return preset;
    },
  };
}
