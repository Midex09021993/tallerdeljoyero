import { getAurumScenePreset, type AurumScenePreset } from "../aurum-scene-engine";

export interface AurumSceneBackground {
  id: string;
  color: string | null;
  image: string | null;
}

export interface AurumSceneController {
  apply: (id: string, opts?: { transparent?: boolean }) => AurumScenePreset;
  setBackground: (id: string) => void;
  getBackground: () => AurumSceneBackground;
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
  let activeBackgroundId = "blanco";
  const applyBackground = (color:string | null, image:string | null = null) => {
    if (backgroundElement?.style) {
      backgroundElement.style.backgroundColor = color ?? ("#" + Number(currentPreset.background).toString(16).padStart(6, "0"));
      const isCssGradient = image
        ? /^(?:linear|radial|conic)-gradient\(/i.test(image.trim())
        : false;
      backgroundElement.style.backgroundImage = image
        ? (isCssGradient ? image : `url("${image}")`)
        : "none";
      backgroundElement.style.backgroundSize = image ? "cover" : "";
      backgroundElement.style.backgroundPosition = image ? "center center" : "";
      backgroundElement.style.backgroundRepeat = image ? "no-repeat" : "";
    }
    renderer.setClearColor(0x000000, 0);
  };

  return {
    setBackground(id:string) {
      activeBackgroundId = id;
      const backgrounds:Record<string,string> = {
        blanco:"#ffffff", marfil:"#f4f1e9", grisClaro:"#e7e7e4", grisMedio:"#a6a6a3", grisOscuro:"#303236", negro:"#090b0e", transparente:"transparent",
      };
      backgroundImageOverride =
        id === "estudioFotografico"
          ? "https://packs.ijewel3d.com/files/bg_1_d37cf7c1d8.jpg"
          : id === "auroraBlue"
            ? "radial-gradient(ellipse 42% 70% at 0% 28%, rgba(255,151,111,.98) 0%, rgba(255,181,157,.72) 42%, transparent 100%), radial-gradient(ellipse 58% 90% at 100% 100%, rgba(0,65,164,.98) 0%, rgba(30,104,202,.78) 48%, transparent 100%), linear-gradient(125deg, #f2b5a7 0%, #b7b1d3 38%, #7399d0 68%, #0751a8 100%)"
          : id === "degradadoGrisBlanco"
            ? "linear-gradient(135deg, #ffffff 0%, #eeeeec 48%, #bfc1c0 100%)"
            : null;
      backgroundOverride = id === "escena" ? null : (backgrounds[id] ?? (backgroundImageOverride ? "#f4f4f2" : null));
      applyBackground(backgroundOverride, backgroundImageOverride);
    },
    getBackground() {
      return {
        id: activeBackgroundId,
        color: backgroundOverride,
        image: backgroundImageOverride,
      };
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
