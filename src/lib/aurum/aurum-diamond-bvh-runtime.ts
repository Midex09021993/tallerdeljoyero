import * as THREE from "three";
import {
  prepareAurumDiamondBvhExperiment,
  type AurumDiamondBvhApi,
} from "./aurum-diamond-bvh-experimental";

type RecordEntry = {
  originalMaterial: THREE.Material | THREE.Material[];
  experimentalMaterial: THREE.Material;
  family: string;
  setQuality: (quality: "interactive" | "high" | "final") => void;
  dispose: () => void;
};

export type AurumDiamondBvhRuntime = {
  refresh: (model: THREE.Object3D | null | undefined) => void;
  update: () => void;
  /** Temporarily raise diamond-only ray bounces for a still capture. */
  setDiamondQuality: (quality: "interactive" | "high" | "final") => void;
  dispose: () => void;
  diagnostics: () => { activeMeshes: number; triangleCount: number; diamondMeshes: number; diamondTriangleCount: number; enabled: boolean };
};

const getGemFamily = (material: any) =>
  String(
    material?.userData?.aurumGemFamily ??
    material?.userData?.aurumOpticalProfile?.familia ??
    material?.userData?.aurumRuntimeGemOptics?.family ??
    "",
  ).toLocaleLowerCase();

/**
 * Experimental, opt-in-by-call BVH runtime. The caller controls when it is
 * created; the existing material pipeline remains the fallback. Geometry and
 * original materials are retained and restored on teardown.
 */
export async function createAurumDiamondBvhRuntime(options: {
  THREE: typeof THREE;
  RGBELoader: new () => { load: (...args: any[]) => unknown };
  EXRLoader?: new () => { load: (...args: any[]) => unknown };
  url: string;
  camera: THREE.Camera;
  quality?: "interactive" | "high" | "final";
  targetFamilies?: string[];
  onError?: (error: unknown) => void;
}): Promise<AurumDiamondBvhRuntime> {
  const THREE_NS = options.THREE;
  const packageApi = await import("realistic-diamond-shader") as unknown as AurumDiamondBvhApi;
  const isExr = /\.exr(?:$|[?#])/i.test(options.url);
  const Loader = isExr && options.EXRLoader ? options.EXRLoader : options.RGBELoader;
  const environmentMap = await new Promise<THREE.Texture>((resolve, reject) => {
    new Loader().load(
      options.url,
      (texture: THREE.Texture) => {
        texture.mapping = THREE_NS.EquirectangularReflectionMapping;
        texture.colorSpace = THREE_NS.LinearSRGBColorSpace;
        texture.needsUpdate = true;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });

  const entries = new Map<THREE.Mesh, RecordEntry>();
  let disposed = false;

  const releaseEntry = (mesh: THREE.Mesh, restore: boolean) => {
    const entry = entries.get(mesh);
    if (!entry) return;
    if (restore && mesh.material === entry.experimentalMaterial) {
      mesh.material = entry.originalMaterial;
    }
    entry.dispose();
    entries.delete(mesh);
  };

  const refresh = (model: THREE.Object3D | null | undefined) => {
    if (!model || disposed) return;
    const found = new Set<THREE.Mesh>();
    model.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry || mesh.userData?.["aurumInternalInclusion"]) return;
      const existing = entries.get(mesh);
      const currentMaterial = mesh.material as any;
      if (existing && currentMaterial === existing.experimentalMaterial) {
        found.add(mesh);
        return;
      }
      if (existing) releaseEntry(mesh, false);

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      // A BVH material is assigned at mesh level. Never replace a mixed
      // material array (diamond + metal/other gem), because that would repaint
      // unrelated CAD groups as diamond. Leave those meshes on the proven
      // MeshPhysicalMaterial pipeline until per-group BVH support is available.
      const activeGemId = String(mesh.userData?.["aurumActiveGemId"] ?? "").toLocaleLowerCase();
      const targetFamilies = (options.targetFamilies ?? ["Diamante"]).map((family) => family.toLocaleLowerCase());
      const family = materials.length > 0 && materials.every((material) => getGemFamily(material) === getGemFamily(materials[0])) ? getGemFamily(materials[0]) : "";
      const isParaibaCatalogId = /^turmalina_paraiba(?:_|$)/.test(activeGemId);
      const isTargetFamily = materials.length > 0 && materials.every((material) => targetFamilies.includes(getGemFamily(material)) || (isParaibaCatalogId && getGemFamily(material) === "turmalina"));
      if (!isTargetFamily) {
        if (materials.some((material) => targetFamilies.includes(getGemFamily(material)))) {
          options.onError?.(
            new Error("[AURUM BVH] Malla con materiales mixtos omitida para proteger metales y otras gemas."),
          );
        }
        return;
      }

      const isEmerald = family === "esmeralda";
      const isRuby = family === "rubí" || family === "rubi";
      const isSapphire = family === "zafiro" || family === "sapphire";
      const isAmethyst = family === "amatista" || family === "amethyst";
      const isAquamarine = family === "aguamarina" || family === "aquamarine";
      const isCitrine = family === "citrino" || family === "citrine";
      const topazColor = Number(currentMaterial?.color?.getHex?.() ?? 0);
      // Catalog identity is more reliable than hue: topaz variants share "Topacio",
      // while Paraiba is catalogued under the broader "Turmalina" family.
      const isBlueTopaz = activeGemId.includes("topacio_azul") || activeGemId.includes("blue_topaz") || family === "topacio azul" || family === "topacio_azul" || family === "blue topaz" || family === "bluetopaz" || (family === "topacio" && !activeGemId.includes("topacio_imperial") && ((topazColor & 0x0000ff) > ((topazColor >> 16) & 0xff) * 1.15));
      const isImperialTopaz = activeGemId.includes("topacio_imperial") || family === "topacio imperial" || family === "topacio_imperial" || (family === "topacio" && !isBlueTopaz);
      const isParaibaTourmaline = isParaibaCatalogId || family === "turmalina paraíba" || family === "turmalina paraiba" || family === "turmalina_paraiba" || family === "paraiba tourmaline" || family === "paraiba";
      const isTanzanite = family === "tanzanita" || family === "tanzanite";
      const isMoissanite = family === "moissanita" || family === "moissanite";
      try {
        const prepared = prepareAurumDiamondBvhExperiment(packageApi, mesh, {
          transmission: isImperialTopaz ? 0.88 : isParaibaTourmaline ? 0.91 : 0,
          environmentMap,
          camera: options.camera,
          quality: options.quality ?? "interactive",
          environmentIntensity: isEmerald ? 1.5 : isRuby ? 1.0 : isSapphire ? 1.2 : isAmethyst ? 1.35 : isAquamarine ? 1.25 : isCitrine ? 1.2 : isBlueTopaz ? 1.25 : isImperialTopaz ? 1.22 : isParaibaTourmaline ? (activeGemId === "turmalina_paraiba" ? 1.55 : 1.3) : isTanzanite ? 1.25 : isMoissanite ? 1.35 : 1.14,
          dispersion: isEmerald ? 0.0005 : isRuby ? 0.001 : isSapphire ? 0.001 : isAmethyst ? 0.0002 : isAquamarine ? 0.0002 : isCitrine ? 0.0002 : isBlueTopaz ? 0.0002 : isImperialTopaz ? 0.0002 : isParaibaTourmaline ? 0.0002 : isTanzanite ? 0.0002 : isMoissanite ? 0.009 : 0.006,
          ior: isEmerald ? 1.58 : isRuby ? 1.762 : isSapphire ? 1.762 : isAmethyst ? 1.55 : isAquamarine ? 1.577 : isCitrine ? 1.54 : isBlueTopaz ? 1.63 : isImperialTopaz ? 1.63 : isParaibaTourmaline ? 1.64 : isTanzanite ? 1.695 : isMoissanite ? 2.65 : 2.417,
          absorption: isEmerald ? 0.45 : isRuby ? 1.15 : isSapphire ? 0.85 : isAmethyst ? 0.62 : isAquamarine ? 0.45 : isCitrine ? 0.5 : isBlueTopaz ? 0.42 : isImperialTopaz ? 0.48 : isParaibaTourmaline ? (activeGemId === "turmalina_paraiba" ? 0.22 : 0.38) : isTanzanite ? 0.42 : isMoissanite ? 0.18 : 1,
          color: isEmerald ? 0x05683d : isRuby ? 0x9b001b : isSapphire ? 0x123c9a : isAmethyst ? 0x7650b9 : isAquamarine ? 0x72c9df : isCitrine ? 0xd49a22 : isBlueTopaz ? 0x65b9e8 : isImperialTopaz ? (activeGemId.includes("topacio_imperial_minas") ? 0xd88943 : 0xd79b4b) : isParaibaTourmaline ? (activeGemId === "turmalina_paraiba" ? 0x00cfc3 : activeGemId.includes("mozambique") ? 0x27d4cf : activeGemId.includes("etiopia") ? 0x3ad9d1 : 0x19d6d0) : isTanzanite ? 0x5140a8 : isMoissanite ? 0xf4f8ff : 0xffffff,
          reflectivity: isEmerald ? 0.26 : isRuby ? 0.38 : isSapphire ? 0.38 : isAmethyst ? 0.32 : isAquamarine ? 0.30 : isCitrine ? 0.30 : isBlueTopaz ? 0.30 : isImperialTopaz ? 0.30 : isParaibaTourmaline ? (activeGemId === "turmalina_paraiba" ? 0.38 : 0.32) : isTanzanite ? 0.32 : isMoissanite ? 0.48 : 0.46,
          environmentRotationRadians: Number(currentMaterial?.userData?.aurumGemEnvironmentRotation ?? 0),
        });
        entries.set(mesh, {
          originalMaterial: mesh.material,
          experimentalMaterial: prepared.material,
          family,
          setQuality: (quality) => {
            if (family !== "diamante" || !packageApi.setDiamondOptions) return;
            // Higher bounce counts are needed only for a still image; keep the
            // interactive budget low to avoid adding cost to orbiting.
            packageApi.setDiamondOptions(prepared.material, {
              rayBounces: quality === "final" ? 8 : 3,
            });
          },
          dispose: prepared.dispose,
        });
        mesh.material = prepared.material;
        found.add(mesh);
      } catch (error) {
        // Keep the current physical/scintillation material if BVH setup fails.
        options.onError?.(error);
      }
    });

    for (const mesh of [...entries.keys()]) {
      if (!found.has(mesh)) releaseEntry(mesh, mesh.material === entries.get(mesh)?.experimentalMaterial);
    }
  };

  return {
    refresh,
    update() {
      if (disposed) return;
      for (const entry of entries.values()) {
        packageApi.updateDiamondCamera(entry.experimentalMaterial, options.camera);
      }
    },
    setDiamondQuality(quality) {
      if (disposed) return;
      for (const entry of entries.values()) entry.setQuality(quality);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const mesh of [...entries.keys()]) releaseEntry(mesh, true);
      environmentMap.dispose();
    },
    diagnostics() {
      let triangleCount = 0;
      let diamondMeshes = 0;
      let diamondTriangleCount = 0;
      for (const [mesh, entry] of entries) {
        const geometry = mesh.geometry;
        const triangles = Math.floor((geometry.getIndex()?.count ?? geometry.getAttribute("position")?.count ?? 0) / 3);
        triangleCount += triangles;
        if (entry.family === "diamante") {
          diamondMeshes += 1;
          diamondTriangleCount += triangles;
        }
      }
      return {
        activeMeshes: entries.size,
        triangleCount,
        diamondMeshes,
        diamondTriangleCount,
        enabled: entries.size > 0,
      };
    },
  };
}
