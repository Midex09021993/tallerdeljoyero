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
          ? "/backgrounds/aurum-estudio-fotografico.svg"
          : id === "auroraBlue"
            ? "radial-gradient(ellipse 105% 145% at 0% 48%, rgba(255,174,151,.94) 0%, rgba(244,166,158,.78) 24%, rgba(202,163,184,.42) 52%, rgba(145,157,202,.12) 76%, transparent 100%), radial-gradient(ellipse 100% 145% at 100% 52%, rgba(27,91,174,.92) 0%, rgba(48,112,193,.78) 34%, rgba(92,139,201,.38) 62%, transparent 100%), linear-gradient(112deg, #e9aa9e 0%, #c4a9c0 42%, #7899c8 72%, #2868b1 100%)"
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
