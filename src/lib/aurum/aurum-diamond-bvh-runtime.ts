import * as THREE from "three";
import { resolveAurumCatalogGemBvhColor, resolveAurumEmeraldBvhProfile, resolveAurumRubyBvhProfile, resolveAurumSapphireBvhProfile } from "./aurum-gem-bvh-profiles";
import {
  prepareAurumDiamondBvhExperiment,
  type AurumDiamondBvhApi,
} from "./aurum-diamond-bvh-experimental";

type RecordEntry = {
  originalMaterial: THREE.Material | THREE.Material[];
  experimentalMaterial: THREE.Material;
  family: string;
  gemId: string;
  activeGemFamily: string;
  setQuality: (quality: "interactive" | "high" | "final") => void;
  dispose: () => void;
};

export type AurumDiamondBvhRuntime = {
  refresh: (model: THREE.Object3D | null | undefined) => void;
  update: () => void;
  /** Temporarily raise diamond-only ray bounces for a still capture. */
  setDiamondQuality: (quality: "interactive" | "high" | "final") => void;
  dispose: () => void;
  diagnostics: () => { activeMeshes: number; triangleCount: number; diamondMeshes: number; diamondTriangleCount: number; familyCounts: Record<string, number>; skippedTargetMeshes: Array<{ mesh: string; materialFamilies: string[]; activeGemFamily: string; reason: string }>; overlappingGemPairs: Array<{ meshA: string; familyA: string; meshB: string; familyB: string; overlapRatio: number }>; enabled: boolean };
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

  const familyCounts: Record<string, number> = {};
  const skippedTargetMeshes: Array<{ mesh: string; materialFamilies: string[]; activeGemFamily: string; reason: string }> = [];

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
    for (const key of Object.keys(familyCounts)) delete familyCounts[key];
    skippedTargetMeshes.length = 0;
    model.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry || mesh.userData?.["aurumInternalInclusion"]) return;
      const existing = entries.get(mesh);
      const currentMaterial = mesh.material as any;
      const activeGemId = String(mesh.userData?.["aurumActiveGemId"] ?? "").toLocaleLowerCase();
      const activeGemFamily = String(mesh.userData?.["aurumActiveGemFamily"] ?? "").toLocaleLowerCase();
      if (existing && currentMaterial === existing.experimentalMaterial
        && existing.gemId === activeGemId
        && existing.activeGemFamily === activeGemFamily) {
        found.add(mesh);
        return;
      }
      // A mesh may keep the experimental shader after its catalog identity changes.
      // Never trust that cached shader across gem selections: restore the prior
      // physical material and dispose the old BVH before classifying the new state.
      // If the caller changed metadata without assigning a matching new material,
      // the family/material consistency check below safely leaves BVH disabled.
      if (existing) releaseEntry(mesh, true);

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      // A BVH material is assigned at mesh level. Never replace a mixed
      // material array (diamond + metal/other gem), because that would repaint
      // unrelated CAD groups as diamond. Leave those meshes on the proven
      // MeshPhysicalMaterial pipeline until per-group BVH support is available.
      const requestedFamilies = (options.targetFamilies ?? ["Diamante"]).map((family) => family.toLocaleLowerCase());
      // Keep all explicitly requested BVH families eligible at the same time.
      // The active material family below selects each mesh's optical profile;
      // mixed-family material arrays remain excluded to protect CAD groups.
      const targetFamilies = requestedFamilies;
      // Layer assignment is the source of truth when a single material lacks
      // family metadata. Never infer a family from a neighboring stone.
      const rawMaterialFamilies = materials.map((material) => getGemFamily(material));
      const canUseLayerFamilyFallback = materials.length === 1 && !rawMaterialFamilies[0] && !!activeGemFamily;
      const materialFamilies = rawMaterialFamilies.map((family) => family || (canUseLayerFamilyFallback ? activeGemFamily : ""));
      for (const materialFamily of materialFamilies) {
        const key = materialFamily || "(sin familia)";
        familyCounts[key] = (familyCounts[key] ?? 0) + 1;
      }
      const uniqueFamilies = [...new Set(materialFamilies)];
      const family = uniqueFamilies.length === 1 ? uniqueFamilies[0] : "";
      const isParaibaCatalogId = /^turmalina_paraiba(?:_|$)/.test(activeGemId);
      const isTargetFamily = materials.length > 0 && materialFamilies.every((materialFamily) => targetFamilies.includes(materialFamily) || (isParaibaCatalogId && materialFamily === "turmalina"));
      const activeFamilyMatches = !activeGemFamily || activeGemFamily === family
        || (activeGemFamily === "rubi" && family === "rubí")
        || (activeGemFamily === "rubí" && family === "rubi")
        || (activeGemFamily === "sapphire" && family === "zafiro")
        || (activeGemFamily === "zafiro" && family === "sapphire")
        || (activeGemFamily === "emerald" && family === "esmeralda");
      // Do not apply a single BVH shader to a material array containing more
      // than one gemstone family (e.g. a CAD mesh combining emerald and small
      // diamond stones). Even when both families are individually supported,
      // a single shader would overwrite their distinct optical identities.
      if (!isTargetFamily || uniqueFamilies.length !== 1 || !activeFamilyMatches) {
        if (materials.some((material) => targetFamilies.includes(getGemFamily(material)) || activeGemFamily.length > 0)) {
          if (skippedTargetMeshes.length < 30) {
            skippedTargetMeshes.push({ mesh: mesh.name || mesh.uuid, materialFamilies: uniqueFamilies, activeGemFamily, reason: !isTargetFamily ? "familia-no-solicitada-o-material-mixto" : uniqueFamilies.length !== 1 ? "familias-mixtas" : "familia-activa-no-coincide" });
          }
          options.onError?.(
            new Error("[AURUM BVH] Malla con familias/materiales mixtos omitida para proteger diamantes secundarios, otras gemas y metales."),
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
      // First-pass BVH eligibility is limited to transparent, faceted crystal families.
      // Opal, pearl, feldspar, labradorite, obsidian and opaque/mineral specimens
      // stay on the native material pipeline until their special optics are modeled.
      const isSpinel = family === "espinela" || family === "spinel";
      const isGarnet = family === "granate" || family === "garnet";
      const isPeridot = family === "peridoto" || family === "peridot";
      const isMorganite = family === "morganita" || family === "morganite";
      const isZircon = family === "zircon" || family === "zircón" || family === "zirconia";
      const isChrysoberyl = family === "crisoberilo" || family === "chrysoberyl" || family === "alejandrita" || family === "alexandrite";
      const isQuartz = family === "cuarzo" || family === "quartz" || family === "ametrino" || family === "ametrine";
      const isOtherTourmaline = family === "turmalina" || family === "tourmaline";
      try {
        const emeraldProfile = isEmerald ? resolveAurumEmeraldBvhProfile(materials[0]) : null;
        const rubyProfile = isRuby ? resolveAurumRubyBvhProfile(materials[0]) : null;
        const sapphireProfile = isSapphire ? resolveAurumSapphireBvhProfile(materials[0]) : null;
        const prepared = prepareAurumDiamondBvhExperiment(packageApi, mesh, {
          ...(emeraldProfile ?? rubyProfile ?? sapphireProfile ?? {}),
          // Controlled test: only the inclusions emerald gets a slight BVH transmission (0.08); other emeralds remain at zero to isolate the visual difference.
          // iJewel's inclusion reference uses transmission 0. Keep the BVH
          // experiment opaque to direct refracted-environment contribution until
          // the shader's optical response is validated; 0.08 visibly risks excess
          // see-through without adding distinct facet structure.
          transmission: (isEmerald || isRuby || isSapphire)
            ? 0
            : (emeraldProfile?.transmission ?? rubyProfile?.transmission ?? sapphireProfile?.transmission ?? (isImperialTopaz ? 0.88 : isParaibaTourmaline ? 0.91 : 0)),
          environmentMap,
          camera: options.camera,
          // Keep small secondary diamonds on interactive quality initially;
          // higher bounce counts are reserved for explicit high/final capture.
          quality: options.quality ?? "interactive",
          environmentIntensity: emeraldProfile?.environmentIntensity ?? rubyProfile?.environmentIntensity ?? sapphireProfile?.environmentIntensity ?? (isEmerald ? 1.5 : isRuby ? 1.0 : isSapphire ? 1.2 : isAmethyst ? 1.35 : isAquamarine ? 1.25 : isCitrine ? 1.2 : isBlueTopaz ? 1.25 : isImperialTopaz ? 1.22 : isParaibaTourmaline ? (activeGemId === "turmalina_paraiba" ? 1.55 : 1.3) : isTanzanite ? 1.25 : isMoissanite ? 1.35 : isZircon ? 1.2 : isSpinel || isGarnet || isPeridot || isMorganite || isChrysoberyl || isQuartz || isOtherTourmaline ? 1.18 : 1.14),
          // Emerald test: disable dispersion entirely while isolating BVH speckles.
          // The green color is authored by the profile; chromatic splitting is not
          // required for emerald and may amplify unstable ray/intersection artifacts.
          dispersion: isEmerald ? 0 : (emeraldProfile?.dispersion ?? rubyProfile?.dispersion ?? sapphireProfile?.dispersion ?? (family === "diamante" ? 0.004 : isRuby ? 0.001 : isSapphire ? 0.001 : isAmethyst || isAquamarine || isCitrine || isBlueTopaz || isImperialTopaz || isParaibaTourmaline || isTanzanite || isSpinel || isGarnet || isPeridot || isMorganite || isChrysoberyl || isQuartz || isOtherTourmaline ? 0.0002 : isZircon ? 0.001 : isMoissanite ? 0.009 : 0.01)),
          ior: emeraldProfile?.ior ?? rubyProfile?.ior ?? sapphireProfile?.ior ?? (isEmerald ? 1.58 : isRuby ? 1.762 : isSapphire ? 1.762 : isAmethyst ? 1.55 : isAquamarine ? 1.577 : isCitrine || isQuartz ? 1.544 : isBlueTopaz || isImperialTopaz ? 1.63 : isParaibaTourmaline || isOtherTourmaline ? 1.62 : isTanzanite ? 1.695 : isMoissanite ? 2.65 : isSpinel ? 1.718 : isGarnet ? 1.78 : isPeridot ? 1.65 : isMorganite ? 1.58 : isZircon ? 1.92 : isChrysoberyl ? 1.75 : 1.55),
          // Match the catalog's iJewel inclusion reference (absorption 1.6)
          // only for this variant; other emerald profiles remain untouched.
          absorption: isEmerald && activeGemId === "esmeralda_inclusiones"
            ? 1.6
            : emeraldProfile?.absorption ?? rubyProfile?.absorption ?? sapphireProfile?.absorption ?? (isEmerald ? 0.45 : isRuby ? 1.15 : isSapphire ? 0.85 : isAmethyst ? 0.62 : isAquamarine ? 0.45 : isCitrine ? 0.5 : isBlueTopaz ? 0.42 : isImperialTopaz ? 0.48 : isParaibaTourmaline ? (activeGemId === "turmalina_paraiba" ? 0.22 : 0.38) : isTanzanite ? 0.42 : isMoissanite ? 0.18 : isSpinel || isGarnet || isPeridot || isMorganite || isZircon || isChrysoberyl || isQuartz || isOtherTourmaline ? 0.45 : 1),
          color: emeraldProfile?.color ?? rubyProfile?.color ?? sapphireProfile?.color ?? (family === "diamante" ? 0xffffff : resolveAurumCatalogGemBvhColor(materials[0], isEmerald ? 0x05683d : isRuby ? 0x9b001b : isSapphire ? 0x123c9a : isAmethyst ? 0x7650b9 : isAquamarine ? 0x72c9df : isCitrine ? 0xd49a22 : isBlueTopaz ? 0x65b9e8 : isImperialTopaz ? (activeGemId.includes("topacio_imperial_minas") ? 0xd88943 : 0xd79b4b) : isParaibaTourmaline ? (activeGemId === "turmalina_paraiba" ? 0x00cfc3 : activeGemId.includes("mozambique") ? 0x27d4cf : activeGemId.includes("etiopia") ? 0x3ad9d1 : 0x19d6d0) : isTanzanite ? 0x5140a8 : isMoissanite ? 0xf4f8ff : 0xffffff)),
          reflectivity: emeraldProfile?.reflectivity ?? rubyProfile?.reflectivity ?? sapphireProfile?.reflectivity ?? (isEmerald ? 0.26 : isRuby ? 0.38 : isSapphire ? 0.38 : isAmethyst ? 0.32 : isAquamarine ? 0.30 : isCitrine ? 0.30 : isBlueTopaz ? 0.30 : isImperialTopaz ? 0.30 : isParaibaTourmaline ? (activeGemId === "turmalina_paraiba" ? 0.38 : 0.32) : isTanzanite ? 0.32 : isMoissanite ? 0.48 : isZircon ? 0.36 : isSpinel || isGarnet || isPeridot || isMorganite || isChrysoberyl || isQuartz || isOtherTourmaline ? 0.30 : 0.46),
          environmentRotationRadians: Number(currentMaterial?.userData?.aurumGemEnvironmentRotation ?? 0),
        });
        entries.set(mesh, {
          originalMaterial: mesh.material,
          experimentalMaterial: prepared.material,
          family,
          gemId: activeGemId,
          activeGemFamily,
          setQuality: (quality) => {
            if (!packageApi.setDiamondOptions) return;
            if (family === "diamante") {
              // Preserve the existing diamond quality policy unchanged.
              packageApi.setDiamondOptions(prepared.material, {
                // 3 interactive bounces are the upstream package's recommended
                // starting point; retain 4 for high and 8 for explicit final stills.
                rayBounces: quality === "final" ? 8 : quality === "high" ? 4 : 3,
              });
              return;
            }
            if (isEmerald) {
              // Match the catalog-specific iJewel bounce reference in real-time
              // as well as high/final quality. The emerald BVH experiment keeps
              // transmission and dispersion at zero to isolate intersection artifacts.
              const emeraldBounces =
                activeGemId === "esmeralda_1"
                  ? 5
                  : activeGemId === "esmeralda_2"
                    ? 2
                    : activeGemId === "esmeralda_3" || activeGemId === "esmeralda_inclusiones"
                      ? 3
                      : 4;
              packageApi.setDiamondOptions(prepared.material, {
                rayBounces: emeraldBounces,
              });
            }
          },
          dispose: prepared.dispose,
        });
        // Apply the catalog-specific quality immediately when the BVH material is
        // created. Without this call, setQuality only runs during later quality
        // transitions, leaving emeralds at the shader package's generic default.
        entries.get(mesh)?.setQuality(options.quality ?? "interactive");
        mesh.material = prepared.material;
        found.add(mesh);
        if (isEmerald && targetFamilies.includes("esmeralda")) {
          console.info("[AURUM][EMERALD BVH] Prototipo aplicado", {
            mesh: mesh.name || mesh.uuid,
            activeGemId,
            family,
            triangles: prepared.diagnostics.triangleCount,
            ior: prepared.diagnostics.ior,
            rayBounces: prepared.diagnostics.rayBounces,
            originalColor: materials[0]?.color?.getHexString?.() ?? null,
            transmission: emeraldProfile?.transmission ?? null,
          });
        }
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
      const diagnosticFamilyCounts: Record<string, number> = {};
      const activeEntries: Array<{ mesh: THREE.Mesh; family: string; bounds: THREE.Box3 }> = [];
      for (const [mesh, entry] of entries) {
        const geometry = mesh.geometry;
        const triangles = Math.floor((geometry.getIndex()?.count ?? geometry.getAttribute("position")?.count ?? 0) / 3);
        diagnosticFamilyCounts[entry.family || "(sin familia)"] = (diagnosticFamilyCounts[entry.family || "(sin familia)"] ?? 0) + 1;
        triangleCount += triangles;
        if (entry.family === "diamante") {
          diamondMeshes += 1;
          diamondTriangleCount += triangles;
        }
        mesh.updateWorldMatrix(true, false);
        activeEntries.push({ mesh, family: entry.family, bounds: new THREE.Box3().setFromObject(mesh, true) });
      }

      // Diagnostic only: detect world-space AABB overlap between separately
      // shaded gem meshes. This does not prove triangle intersection, but helps
      // identify CAD stones whose surfaces may compete in the depth buffer.
      const overlappingGemPairs: Array<{ meshA: string; familyA: string; meshB: string; familyB: string; overlapRatio: number }> = [];
      for (let i = 0; i < activeEntries.length; i += 1) {
        const a = activeEntries[i];
        const sizeA = a.bounds.getSize(new THREE.Vector3());
        const volumeA = Math.max(sizeA.x * sizeA.y * sizeA.z, 1e-12);
        for (let j = i + 1; j < activeEntries.length; j += 1) {
          const b = activeEntries[j];
          if (a.family === b.family || !a.bounds.intersectsBox(b.bounds)) continue;
          const overlap = a.bounds.clone().intersect(b.bounds);
          const size = overlap.getSize(new THREE.Vector3());
          const overlapVolume = Math.max(0, size.x) * Math.max(0, size.y) * Math.max(0, size.z);
          const sizeB = b.bounds.getSize(new THREE.Vector3());
          const volumeB = Math.max(sizeB.x * sizeB.y * sizeB.z, 1e-12);
          const overlapRatio = overlapVolume / Math.min(volumeA, volumeB);
          if (overlapRatio > 0.02) {
            overlappingGemPairs.push({
              meshA: a.mesh.name || a.mesh.uuid,
              familyA: a.family,
              meshB: b.mesh.name || b.mesh.uuid,
              familyB: b.family,
              overlapRatio: Number(overlapRatio.toFixed(4)),
            });
          }
        }
      }
      return {
        activeMeshes: entries.size,
        triangleCount,
        diamondMeshes,
        diamondTriangleCount,
        // Report all model material families seen during refresh, not only
        // entries that successfully received a BVH material.
        familyCounts: { ...familyCounts },
        skippedTargetMeshes: [...skippedTargetMeshes],
        overlappingGemPairs,
        enabled: entries.size > 0,
      };
    },
  };
}
