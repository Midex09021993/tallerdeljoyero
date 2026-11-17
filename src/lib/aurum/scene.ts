import { getAurumScenePreset, type AurumScenePreset } from "../aurum-scene-engine";

const AURORA_BLUE_DATA_URL = "data:image/svg+xml;charset=utf-8," + encodeURIComponent("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1600 900\" preserveAspectRatio=\"none\"><defs><linearGradient id=\"base\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#e9aa9e\"/><stop offset=\".42\" stop-color=\"#c4a9c0\"/><stop offset=\".72\" stop-color=\"#7899c8\"/><stop offset=\"1\" stop-color=\"#2868b1\"/></linearGradient><radialGradient id=\"coral\" cx=\"0\" cy=\"0\" r=\"1\" gradientTransform=\"matrix(1.05 0 0 1.45 0 .48)\"><stop offset=\"0\" stop-color=\"#ffae97\" stop-opacity=\".94\"/><stop offset=\".24\" stop-color=\"#f4a69e\" stop-opacity=\".78\"/><stop offset=\".52\" stop-color=\"#caa3b8\" stop-opacity=\".42\"/><stop offset=\".76\" stop-color=\"#919dca\" stop-opacity=\".12\"/><stop offset=\"1\" stop-color=\"#919dca\" stop-opacity=\"0\"/></radialGradient><radialGradient id=\"blue\" cx=\"0\" cy=\"0\" r=\"1\" gradientTransform=\"matrix(1 0 0 1.45 1 .52)\"><stop offset=\"0\" stop-color=\"#1b5bae\" stop-opacity=\".92\"/><stop offset=\".34\" stop-color=\"#3070c1\" stop-opacity=\".78\"/><stop offset=\".62\" stop-color=\"#5c8bc9\" stop-opacity=\".38\"/><stop offset=\"1\" stop-color=\"#5c8bc9\" stop-opacity=\"0\"/></radialGradient></defs><rect width=\"1600\" height=\"900\" fill=\"url(#base)\"/><rect width=\"1600\" height=\"900\" fill=\"url(#coral)\"/><rect width=\"1600\" height=\"900\" fill=\"url(#blue)\"/></svg>");

export interface AurumSceneBackground {
  id: string;
  color: string | null;
  image: string | null;
}

export interface AurumSceneController {
  apply: (id: string, opts?: { transparent?: boolean }) => AurumScenePreset;
  applyStage: (id: string, productRoot?: any) => void;
  clearStage: () => void;
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
  let stageGroup: any = null;
  const clearStage = () => {
    if (!stageGroup) return;
    scene.remove(stageGroup);
    stageGroup.traverse((object: any) => {
      if (object.geometry && object.userData?.aurumPresentationStage) object.geometry.dispose?.();
      if (object.material && object.userData?.aurumPresentationStage) {
        if (Array.isArray(object.material)) object.material.forEach((material: any) => material.dispose?.());
        else object.material.dispose?.();
      }
    });
    stageGroup = null;
  };
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
    clearStage,
    applyStage(id: string, productRoot?: any) {
      clearStage();
      if (!productRoot || id === "transparente" || id === "estudioRosaPremium") return;
      // Use the product's world-space bounds; the stage remains a sibling of the
      // model so it cannot alter gem hierarchy, material assignment or exports.
      if (!THREE?.Box3 || !THREE?.Vector3) return;
      const box = new THREE.Box3().setFromObject(productRoot);
      if (box.isEmpty()) return;
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const width = Math.max(size.x, size.z, 0.25);
      const height = Math.max(size.y, 0.25);
      const floorY = box.min.y - Math.max(height * 0.035, 0.015);
      const palette: Record<string, { top: number; side: number; arch: number }> = {
        ijewel11: { top: 0x9f3038, side: 0x571b22, arch: 0xc45b60 },
        ijewel12: { top: 0x496887, side: 0x263d59, arch: 0x8da9c4 },
        ijewel09: { top: 0x242830, side: 0x11151c, arch: 0x596575 },
        ijewel10: { top: 0x343a45, side: 0x171c25, arch: 0x8793a4 },
      };
      const colors = palette[id] ?? { top: 0xe8e6e1, side: 0xb9b5ad, arch: 0xd1c7b5 };
      const group = new THREE.Group();
      group.name = "AURUM_MODEL_STAGE";
      group.userData.aurumPresentationStage = true;
      const makeMesh = (geometry: any, color: number, roughness = 0.72) => {
        const material = new THREE.MeshStandardMaterial({ color, metalness: 0, roughness });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.aurumPresentationStage = true;
        mesh.receiveShadow = true;
        mesh.castShadow = false;
        group.add(mesh);
        return mesh;
      };
      const radius = width * 0.62;
      const platformHeight = Math.max(height * 0.025, 0.012);
      const platformTopY = box.min.y - Math.max(height * 0.008, 0.002);
      const platform = makeMesh(new THREE.CylinderGeometry(radius * 0.94, radius, platformHeight, 96, 1), colors.side);
      platform.position.set(center.x, platformTopY - platformHeight * 0.5, center.z);
      const topThickness = Math.max(platformHeight * 0.18, 0.004);
      const top = makeMesh(new THREE.CylinderGeometry(radius * 0.94, radius * 0.94, topThickness, 96, 1), colors.top, 0.48);
      top.position.set(center.x, platformTopY - topThickness * 0.5, center.z);
      const ringRadius = Math.max(width, height * 0.72) * 0.57;
      const arch = makeMesh(new THREE.TorusGeometry(ringRadius, Math.max(width * 0.009, 0.006), 12, 96), colors.arch, 0.58);
      arch.position.set(center.x, box.min.y + height * 0.56, box.min.z - Math.max(size.z * 0.28, width * 0.16));
      arch.scale.y = Math.max(0.72, Math.min(1.25, height / Math.max(width, 0.01)));
      group.traverse((object: any) => {
        if (object.isMesh) object.userData.aurumPresentationStage = true;
      });
      scene.add(group);
      stageGroup = group;
    },
    setBackground(id:string) {
      activeBackgroundId = id;
      const backgrounds:Record<string,string> = {
        blanco:"#ffffff", marfil:"#f4f1e9", grisClaro:"#e7e7e4", grisMedio:"#a6a6a3", grisOscuro:"#303236", negro:"#090b0e", transparente:"transparent",
      };
      backgroundImageOverride =
        id === "estudioFotografico"
          ? "/backgrounds/aurum-estudio-fotografico.svg"
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
