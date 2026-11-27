import { getAurumScenePreset, type AurumScenePreset } from "../aurum-scene-engine";

const AURORA_BLUE_DATA_URL = "data:image/svg+xml;charset=utf-8," + encodeURIComponent("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1600 900\" preserveAspectRatio=\"none\"><defs><linearGradient id=\"base\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#e9aa9e\"/><stop offset=\".42\" stop-color=\"#c4a9c0\"/><stop offset=\".72\" stop-color=\"#7899c8\"/><stop offset=\"1\" stop-color=\"#2868b1\"/></linearGradient><radialGradient id=\"coral\" cx=\"0\" cy=\"0\" r=\"1\" gradientTransform=\"matrix(1.05 0 0 1.45 0 .48)\"><stop offset=\"0\" stop-color=\"#ffae97\" stop-opacity=\".94\"/><stop offset=\".24\" stop-color=\"#f4a69e\" stop-opacity=\".78\"/><stop offset=\".52\" stop-color=\"#caa3b8\" stop-opacity=\".42\"/><stop offset=\".76\" stop-color=\"#919dca\" stop-opacity=\".12\"/><stop offset=\"1\" stop-color=\"#919dca\" stop-opacity=\"0\"/></radialGradient><radialGradient id=\"blue\" cx=\"0\" cy=\"0\" r=\"1\" gradientTransform=\"matrix(1 0 0 1.45 1 .52)\"><stop offset=\"0\" stop-color=\"#1b5bae\" stop-opacity=\".92\"/><stop offset=\".34\" stop-color=\"#3070c1\" stop-opacity=\".78\"/><stop offset=\".62\" stop-color=\"#5c8bc9\" stop-opacity=\".38\"/><stop offset=\"1\" stop-color=\"#5c8bc9\" stop-opacity=\"0\"/></radialGradient></defs><rect width=\"1600\" height=\"900\" fill=\"url(#base)\"/><rect width=\"1600\" height=\"900\" fill=\"url(#coral)\"/><rect width=\"1600\" height=\"900\" fill=\"url(#blue)\"/></svg>");

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
  backgroundElement?: { style: { backgroundColor: string; backgroundImage?: string; backgroundSize?: string; backgroundPosition?: string; backgroundRepeat?: string } },
  THREE?: any
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
      backgroundElement.style.backgroundSize = image ? (image.startsWith("data:image/svg+xml") ? "100% 100%" : "cover") : "";
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
          : id === "jadeRadial"
            ? "/backgrounds/jade-radial.svg"
            : id === "marfilBone"
              ? "/backgrounds/marfil-bone.svg"
              : id === "turquesaBlanco"
                ? "/backgrounds/turquesa-a-blanco.svg"
                : id === "auroraBlue"
              ? AURORA_BLUE_DATA_URL
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
