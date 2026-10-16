import * as THREE from "three";
import {
  prepareAurumDiamondBvhExperiment,
  type AurumDiamondBvhApi,
} from "./aurum-diamond-bvh-experimental";

type RecordEntry = {
  originalMaterial: THREE.Material | THREE.Material[];
  experimentalMaterial: THREE.Material;
  dispose: () => void;
};

export type AurumDiamondBvhRuntime = {
  refresh: (model: THREE.Object3D | null | undefined) => void;
  update: () => void;
  dispose: () => void;
  diagnostics: () => { activeMeshes: number; triangleCount: number; enabled: boolean };
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
      (texture) => {
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
      if (!mesh.isMesh || !mesh.geometry || mesh.userData?.aurumInternalInclusion) return;
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
      const targetFamilies = (options.targetFamilies ?? ["Diamante"]).map((family) => family.toLocaleLowerCase());
      const family = materials.length > 0 && materials.every((material) => getGemFamily(material) === getGemFamily(materials[0])) ? getGemFamily(materials[0]) : "";
      const isTargetFamily = materials.length > 0 && materials.every((material) => targetFamilies.includes(getGemFamily(material)));
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
      try {
        const prepared = prepareAurumDiamondBvhExperiment(packageApi, mesh, {
          environmentMap,
          camera: options.camera,
          quality: options.quality ?? "interactive",
          environmentIntensity: isEmerald ? 1.5 : isRuby ? 1.0 : isSapphire ? 1.2 : isAmethyst ? 1.35 : isAquamarine ? 1.25 : isCitrine ? 1.2 : 1.14,
          dispersion: isEmerald ? 0.0005 : isRuby ? 0.001 : isSapphire ? 0.001 : isAmethyst ? 0.0002 : isAquamarine ? 0.0002 : isCitrine ? 0.0002 : 0.006,
          ior: isEmerald ? 1.58 : isRuby ? 1.762 : isSapphire ? 1.762 : isAmethyst ? 1.55 : isAquamarine ? 1.577 : isCitrine ? 1.54 : 2.417,
          absorption: isEmerald ? 0.45 : isRuby ? 1.15 : isSapphire ? 0.85 : isAmethyst ? 0.62 : isAquamarine ? 0.45 : isCitrine ? 0.5 : 1,
          color: isEmerald ? 0x05683d : isRuby ? 0x9b001b : isSapphire ? 0x123c9a : isAmethyst ? 0x7650b9 : isAquamarine ? 0x72c9df : isCitrine ? 0xd49a22 : 0xffffff,
          reflectivity: isEmerald ? 0.26 : isRuby ? 0.38 : isSapphire ? 0.38 : isAmethyst ? 0.32 : isAquamarine ? 0.30 : isCitrine ? 0.30 : 0.46,
          environmentRotationRadians: Number(currentMaterial?.userData?.aurumGemEnvironmentRotation ?? 0),
        });
        entries.set(mesh, {
          originalMaterial: mesh.material,
          experimentalMaterial: prepared.material,
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
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const mesh of [...entries.keys()]) releaseEntry(mesh, true);
      environmentMap.dispose();
    },
    diagnostics() {
      let triangleCount = 0;
      for (const mesh of entries.keys()) {
        const geometry = mesh.geometry;
        triangleCount += Math.floor((geometry.getIndex()?.count ?? geometry.getAttribute("position")?.count ?? 0) / 3);
      }
      return { activeMeshes: entries.size, triangleCount, enabled: entries.size > 0 };
    },
  };
}
