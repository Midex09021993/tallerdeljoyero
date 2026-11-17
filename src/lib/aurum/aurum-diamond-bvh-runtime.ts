// @ts-nocheck -- AURUM Render engine: strict-mode typing pending; runtime behaviour unchanged.
import * as THREE from "three";
import { classifyAurumDiamondMeshTiers } from "./diamond-micro-pipeline";
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
  originalDiamondOpticalFamily: unknown;
  baseEnvironmentIntensity: number;
  setQuality: (quality: "interactive" | "high" | "final") => void;
  readonly tier: "micro" | "small" | "brilliant";
  setTier: (tier: "micro" | "small" | "brilliant") => void;
  dispose: () => void;
};

export type AurumDiamondBvhRuntime = {
  refresh: (model: THREE.Object3D | null | undefined) => void;
  /** Rebuild BVH optics only for the assigned stone meshes; unrelated entries remain untouched. */
  refreshTargets: (model: THREE.Object3D | null | undefined, targets: readonly THREE.Mesh[]) => void;
  /** O(1) membership check for already-resolved gem targets; avoids full-model diagnostics in the selection hot path. */
  hasActiveMeshes: (targets: readonly THREE.Mesh[]) => boolean;
  update: () => void;
  updateEnvironment: (rotationRadians: number, intensityScale: number) => void;
  /** Temporarily raise diamond-only ray bounces for a still capture. */
  setDiamondQuality: (quality: "interactive" | "high" | "final") => void;
  /** Enable/disable one gemstone family without disturbing other BVH entries. */
  setFamilyEnabled: (family: string, enabled: boolean) => void;
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
  /** Shared gem HDR texture owned by the public viewer when supplied. */
  environmentMap?: THREE.Texture;
  /** Defaults to true for internally loaded maps; external maps remain caller-owned. */
  ownsEnvironmentMap?: boolean;
  camera: THREE.Camera;
  /** Renderer viewport height, used to share the exact screen-space diamond tiers. */
  getViewportHeight?: () => number;
  quality?: "interactive" | "high" | "final";
  targetFamilies?: string[];
  onError?: (error: unknown) => void;
}): Promise<AurumDiamondBvhRuntime> {
  const THREE_NS = options.THREE;
  const packageApi = await import("realistic-diamond-shader") as unknown as AurumDiamondBvhApi;
  const ownsEnvironmentMap = options.environmentMap
    ? options.ownsEnvironmentMap === true
    : true;
  const environmentMap = options.environmentMap ?? await new Promise<THREE.Texture>((resolve, reject) => {
    const isExr = /\.exr(?:$|[?#])/i.test(options.url);
    const Loader = isExr && options.EXRLoader ? options.EXRLoader : options.RGBELoader;
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
  const disabledFamilies = new Set<string>();
  let lastModel: THREE.Object3D | null = null;
  let disposed = false;

  // Camera uniforms are shared by all BVH gems. Avoid rewriting them when
  // multiple invalidations/API calls occur without an actual camera change.
  // Reset after refresh so newly-created BVH materials always receive a camera update.
  // Reuse fixed-size camera snapshots in the hot render loop. A separate
  // previous-state buffer is required because readCameraState mutates in place.
  const cameraStateBuffer = new Float64Array(12);
  const lastCameraState = new Float64Array(12);
  let hasLastCameraState = false;
  const readCameraState = (): Float64Array => {
    const camera = options.camera as any;
    const position = camera.position;
    const quaternion = camera.quaternion;
    cameraStateBuffer[0] = position?.x ?? 0;
    cameraStateBuffer[1] = position?.y ?? 0;
    cameraStateBuffer[2] = position?.z ?? 0;
    cameraStateBuffer[3] = quaternion?.x ?? 0;
    cameraStateBuffer[4] = quaternion?.y ?? 0;
    cameraStateBuffer[5] = quaternion?.z ?? 0;
    cameraStateBuffer[6] = quaternion?.w ?? 1;
    cameraStateBuffer[7] = camera.zoom ?? 1;
    cameraStateBuffer[8] = camera.fov ?? 0;
    cameraStateBuffer[9] = camera.aspect ?? 0;
    cameraStateBuffer[10] = camera.near ?? 0;
    cameraStateBuffer[11] = camera.far ?? 0;
    return cameraStateBuffer;
  };

  const familyCounts: Record<string, number> = {};
  const skippedTargetMeshes: Array<{ mesh: string; materialFamilies: string[]; activeGemFamily: string; reason: string }> = [];

  const releaseEntry = (mesh: THREE.Mesh, restore: boolean) => {
    const entry = entries.get(mesh);
    if (!entry) return;
    if (restore && mesh.material === entry.experimentalMaterial) {
      mesh.material = entry.originalMaterial;
    }
    if (entry.family === "diamante") {
      if (entry.originalDiamondOpticalFamily === undefined) delete mesh.userData.aurumDiamondOpticalFamily;
      else mesh.userData.aurumDiamondOpticalFamily = entry.originalDiamondOpticalFamily;
    }
    entry.dispose();
    entries.delete(mesh);
  };

  const refresh = (model: THREE.Object3D | null | undefined, targetMeshes?: readonly THREE.Mesh[]) => {
    if (!model || disposed) return;
    lastModel = model;
    hasLastCameraState = false;
    const isModelDescendant=(object:THREE.Object3D)=>{
      let current:THREE.Object3D|null=object;
      while(current){
        if(current===model)return true;
        current=current.parent;
      }
      return false;
    };
    const validTargetMeshes=targetMeshes?.filter(isModelDescendant) ?? [];
    const targetSet = targetMeshes?.length ? new Set(validTargetMeshes) : null;
    if(targetMeshes?.length && !targetSet?.size)return;
    const targetedRefresh = Boolean(targetSet);
    const found = new Set<THREE.Mesh>();
    if (!targetedRefresh) {
      for (const key of Object.keys(familyCounts)) delete familyCounts[key];
      skippedTargetMeshes.length = 0;
    }

    // A targeted non-diamond change must not scan the full CAD assembly.
    // Only diamond refreshes need the model-wide size ratio used for melee optics.
    const targetContainsDiamond = !targetSet || [...targetSet].some((mesh) => {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const family = materials.length === 1
        ? getGemFamily(materials[0]) || String(mesh.userData?.aurumActiveGemFamily ?? "").toLocaleLowerCase()
        : "";
      return family === "diamante";
    });
    if (targetContainsDiamond) model.updateMatrixWorld(true);
    else targetSet?.forEach((mesh) => mesh.updateWorldMatrix(true, false));

    const diamondRadiusByMesh = new Map<THREE.Mesh, number>();
    const diamondMeshes: THREE.Mesh[] = [];
    let largestDiamondRadius = 0;
    if (targetContainsDiamond) {
      model.traverse((object) => {
        const candidate = object as THREE.Mesh;
        if (!candidate.isMesh || !candidate.geometry) return;
        const candidateMaterials = Array.isArray(candidate.material) ? candidate.material : [candidate.material];
        if (candidateMaterials.length !== 1) return;
        const candidateFamily = getGemFamily(candidateMaterials[0])
          || String(candidate.userData?.aurumActiveGemFamily ?? "").toLocaleLowerCase();
        if (candidateFamily !== "diamante") return;
        if (!candidate.geometry.boundingSphere) candidate.geometry.computeBoundingSphere();
        const localRadius = candidate.geometry.boundingSphere?.radius ?? 0;
        const worldScale = candidate.getWorldScale(new THREE_NS.Vector3());
        const radius = localRadius * Math.max(Math.abs(worldScale.x), Math.abs(worldScale.y), Math.abs(worldScale.z));
        if (!Number.isFinite(radius) || radius <= 0) return;
        diamondRadiusByMesh.set(candidate, radius);
        diamondMeshes.push(candidate);
        largestDiamondRadius = Math.max(largestDiamondRadius, radius);
      });
    }
    const viewportHeight = Number(options.getViewportHeight?.() ?? 0);
    const screenTiers = viewportHeight > 1
      ? classifyAurumDiamondMeshTiers(diamondMeshes, options.camera, viewportHeight)
      : new Map<THREE.Mesh, "micro" | "small" | "brilliant">();

    const processMesh = (object: THREE.Object3D) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry || mesh.userData?.["aurumInternalInclusion"]) return;
      if (targetSet && !targetSet.has(mesh)) return;
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
      if (!targetedRefresh) {
        for (const materialFamily of materialFamilies) {
          const key = materialFamily || "(sin familia)";
          familyCounts[key] = (familyCounts[key] ?? 0) + 1;
        }
      }
      const uniqueFamilies = [...new Set(materialFamilies)];
      const family = uniqueFamilies.length === 1 ? uniqueFamilies[0] : "";
      if (family && disabledFamilies.has(family)) return;
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
          if (!targetedRefresh && skippedTargetMeshes.length < 30) {
            skippedTargetMeshes.push({ mesh: mesh.name || mesh.uuid, materialFamilies: uniqueFamilies, activeGemFamily, reason: !isTargetFamily ? "familia-no-solicitada-o-material-mixto" : uniqueFamilies.length !== 1 ? "familias-mixtas" : "familia-activa-no-coincide" });
          }
          options.onError?.(
            new Error("[AURUM BVH] Malla con familias/materiales mixtos omitida para proteger diamantes secundarios, otras gemas y metales."),
          );
        }
        return;
      }

      const isEmerald = family === "esmeralda";
      // Each diamond variant gets its own iJewel-calibrated BVH optics.
      // Emerald optics remain exclusive to emeralds; Diamante VS no longer borrows them.
      const isBlueDiamond = activeGemId === "diamante_azul";
      const isPinkDiamond = activeGemId === "diamante_rosa";
      const diamondRadius = diamondRadiusByMesh.get(mesh) ?? 0;
      const diamondSizeRatio = largestDiamondRadius > 0 ? diamondRadius / largestDiamondRadius : 1;
      // Use the same screen-space tier as the physical shader. The legacy
      // radius ratio is only a fallback for callers that cannot provide viewport size.
      const publishedTier = mesh.userData?.aurumDiamondMicroTier;
      // Prefer the live analyzer's hysteresis-stabilized tier when present.
      // This keeps refresh/rebuild consistent with per-frame classification and
      // lets teardown publish "brilliant" before the analyzer releases the mesh.
      const hasPublishedTier = publishedTier === "micro" || publishedTier === "small" || publishedTier === "brilliant";
      const screenTier = hasPublishedTier
        ? publishedTier
        : screenTiers.get(mesh)
          ?? (mesh.userData?.aurumDiamondMicroCenterProtected
            ? "brilliant"
            : (diamondRadius > 0 && largestDiamondRadius > 0 && diamondSizeRatio <= 0.42 ? "small" : "brilliant"));
      mesh.userData = {
        ...(mesh.userData ?? {}),
        aurumDiamondMicroTier: screenTier,
        // Preserve the screen-space pipeline's explicit center decision.
        // A large secondary stone may also be "brilliant" without being the center.
        aurumDiamondMicroCenterProtected: Boolean(mesh.userData?.aurumDiamondMicroCenterProtected)
          || Boolean(mesh.userData?.aurumDiamondCenter || mesh.userData?.aurumDiamondIsCenter)
          || /center|central|main|principal/i.test(String(mesh.userData?.aurumDiamondRole ?? "")),
      };
      const isSmallSecondaryDiamond = family === "diamante" && screenTier !== "brilliant";
      const isNeutralMicroDiamond = family === "diamante" && screenTier === "micro" && !isBlueDiamond && !isPinkDiamond;
      const isNeutralSmallDiamond = family === "diamante" && screenTier === "small" && !isBlueDiamond && !isPinkDiamond;
      const useEmeraldBvhOptics = isEmerald;
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
        const emeraldProfile = useEmeraldBvhOptics ? resolveAurumEmeraldBvhProfile(materials[0]) : null;
        const rubyProfile = isRuby ? resolveAurumRubyBvhProfile(materials[0]) : null;
        const sapphireProfile = isSapphire ? resolveAurumSapphireBvhProfile(materials[0]) : null;
        const prepared = prepareAurumDiamondBvhExperiment(packageApi, mesh, {
          ...(emeraldProfile ?? rubyProfile ?? sapphireProfile ?? {}),
          // Controlled test: only the inclusions emerald gets a slight BVH transmission (0.08); other emeralds remain at zero to isolate the visual difference.
          // iJewel's inclusion reference uses transmission 0. Keep the BVH
          // experiment opaque to direct refracted-environment contribution until
          // the shader's optical response is validated; 0.08 visibly risks excess
          // see-through without adding distinct facet structure.
          transmission: family === "diamante"
            ? 0.05
            : (useEmeraldBvhOptics || isRuby || isSapphire)
              ? 0
              : (emeraldProfile?.transmission ?? rubyProfile?.transmission ?? sapphireProfile?.transmission ?? (isImperialTopaz ? 0.88 : isParaibaTourmaline ? 0.91 : 0)),
          environmentMap,
          camera: options.camera,
          // Keep small secondary diamonds on interactive quality initially;
          // higher bounce counts are reserved for explicit high/final capture.
          quality: family === "diamante" && !isSmallSecondaryDiamond ? "high" : (options.quality ?? "interactive"),
          // Restore the original diamond BVH fire/brightness settings; the emerald experiment remains isolated.
          // Small white melee stones need a gentle neutral energy lift so their
          // compact facets read bright instead of graphite-grey; keep colored
          // diamonds and the center stone on their existing calibrated values.
          rgbBoost: family === "diamante"
            ? (isNeutralMicroDiamond ? [1.10, 1.10, 1.10]
              : isNeutralSmallDiamond ? [1.14, 1.14, 1.14]
              : isSmallSecondaryDiamond && !isBlueDiamond && !isPinkDiamond
                ? [1.16, 1.16, 1.16]
                : isBlueDiamond ? [2, 2, 2] : isPinkDiamond ? [1.3, 1, 1] : mesh.userData?.aurumDiamondMicroCenterProtected ? [1.25, 1.25, 1.25] : [1.18, 1.18, 1.18])
            : undefined,
          // Small white melee: lower internal energy to prevent dense, sand-like
          // flicker while retaining enough neutral radiance to read as diamond.
          // Center, blue/pink diamonds and every non-diamond gemstone keep their calibration.
          environmentIntensity: family === "diamante"
            ? (isNeutralMicroDiamond ? 1.20
              : isNeutralSmallDiamond ? 1.30
              : isSmallSecondaryDiamond ? 1.32
              : isBlueDiamond ? 1.30
              : isPinkDiamond ? 1.25
              : 1.42)
            : useEmeraldBvhOptics ? 1 : emeraldProfile?.environmentIntensity ?? rubyProfile?.environmentIntensity ?? sapphireProfile?.environmentIntensity ?? (isEmerald ? 1.5 : isRuby ? 1.0 : isSapphire ? 1.2 : isAmethyst ? 1.35 : isAquamarine ? 1.25 : isCitrine ? 1.2 : isBlueTopaz ? 1.25 : isImperialTopaz ? 1.22 : isParaibaTourmaline ? (activeGemId === "turmalina_paraiba" ? 1.55 : 1.3) : isTanzanite ? 1.25 : isMoissanite ? 1.35 : isZircon ? 1.2 : isSpinel || isGarnet || isPeridot || isMorganite || isChrysoberyl || isQuartz || isOtherTourmaline ? 1.18 : 1.14),
          // Chromatic splitting is restrained on small white melee to avoid
          // unstable sub-pixel color fragments that read as moving particles.
          dispersion: family === "diamante"
            ? (isNeutralMicroDiamond ? 0.0003
              : isNeutralSmallDiamond ? 0.0008
              : isSmallSecondaryDiamond ? 0.0015
              : activeGemId === "diamante_natural" ? 0.006 : 0.004)
            : useEmeraldBvhOptics ? 0 : (emeraldProfile?.dispersion ?? rubyProfile?.dispersion ?? sapphireProfile?.dispersion ?? (isRuby ? 0.001 : isSapphire ? 0.001 : isAmethyst || isAquamarine || isCitrine || isBlueTopaz || isImperialTopaz || isParaibaTourmaline || isTanzanite || isSpinel || isGarnet || isPeridot || isMorganite || isChrysoberyl || isQuartz || isOtherTourmaline ? 0.0002 : isZircon ? 0.001 : isMoissanite ? 0.009 : 0.01)),
          ior: emeraldProfile?.ior ?? rubyProfile?.ior ?? sapphireProfile?.ior ?? (family === "diamante" ? 2.417 : isEmerald ? 1.58 : isRuby ? 1.762 : isSapphire ? 1.762 : isAmethyst ? 1.55 : isAquamarine ? 1.577 : isCitrine || isQuartz ? 1.544 : isBlueTopaz || isImperialTopaz ? 1.63 : isParaibaTourmaline || isOtherTourmaline ? 1.62 : isTanzanite ? 1.695 : isMoissanite ? 2.65 : isSpinel ? 1.718 : isGarnet ? 1.78 : isPeridot ? 1.65 : isMorganite ? 1.58 : isZircon ? 1.92 : isChrysoberyl ? 1.75 : 1.55),
          // Match the catalog's iJewel inclusion reference (absorption 1.6)
          // only for this variant; other emerald profiles remain untouched.
          absorption: useEmeraldBvhOptics
            ? (activeGemId === "esmeralda_2" ? 1.8 : activeGemId === "esmeralda_1" || activeGemId === "esmeralda_3" || activeGemId === "esmeralda_inclusiones" ? 1.6 : 1.35)
            : emeraldProfile?.absorption ?? rubyProfile?.absorption ?? sapphireProfile?.absorption ?? (isEmerald ? 0.45 : isRuby ? 1.15 : isSapphire ? 0.85 : isAmethyst ? 0.62 : isAquamarine ? 0.45 : isCitrine ? 0.5 : isBlueTopaz ? 0.42 : isImperialTopaz ? 0.48 : isParaibaTourmaline ? (activeGemId === "turmalina_paraiba" ? 0.22 : 0.38) : isTanzanite ? 0.42 : isMoissanite ? 0.18 : isSpinel || isGarnet || isPeridot || isMorganite || isZircon || isChrysoberyl || isQuartz || isOtherTourmaline ? 0.45 : 1),
          color: isEmerald
            ? (activeGemId === "esmeralda_1" ? 0x22dfa3 : activeGemId === "esmeralda_2" ? 0x4fd5b3 : activeGemId === "esmeralda_3" ? 0x19d597 : activeGemId === "esmeralda_inclusiones" ? 0x09e09d : emeraldProfile?.color ?? 0x05683d)
            : rubyProfile?.color ?? sapphireProfile?.color ?? (family === "diamante" ? (isBlueDiamond ? 0xb5cbdd : isPinkDiamond ? 0xf9dfec : 0xfffcf7) : resolveAurumCatalogGemBvhColor(materials[0], isEmerald ? 0x05683d : isRuby ? 0x9b001b : isSapphire ? 0x123c9a : isAmethyst ? 0x7650b9 : isAquamarine ? 0x72c9df : isCitrine ? 0xd49a22 : isBlueTopaz ? 0x65b9e8 : isImperialTopaz ? (activeGemId.includes("topacio_imperial_minas") ? 0xd88943 : 0xd79b4b) : isParaibaTourmaline ? (activeGemId === "turmalina_paraiba" ? 0x00cfc3 : activeGemId.includes("mozambique") ? 0x27d4cf : activeGemId.includes("etiopia") ? 0x3ad9d1 : 0x19d6d0) : isTanzanite ? 0x5140a8 : isMoissanite ? 0xf4f8ff : 0xffffff)),
          reflectivity: family === "diamante" ? (isBlueDiamond ? 0.46 : 0.46) : isEmerald
            ? (activeGemId === "esmeralda_2" ? 0.31 : activeGemId === "esmeralda_1" || activeGemId === "esmeralda_3" || activeGemId === "esmeralda_inclusiones" ? 0.5 : emeraldProfile?.reflectivity ?? 0.16)
            : rubyProfile?.reflectivity ?? sapphireProfile?.reflectivity ?? (isEmerald ? 0.26 : isRuby ? 0.38 : isSapphire ? 0.38 : isAmethyst ? 0.32 : isAquamarine ? 0.30 : isCitrine ? 0.30 : isBlueTopaz ? 0.30 : isImperialTopaz ? 0.30 : isParaibaTourmaline ? (activeGemId === "turmalina_paraiba" ? 0.38 : 0.32) : isTanzanite ? 0.32 : isMoissanite ? 0.48 : isZircon ? 0.36 : isSpinel || isGarnet || isPeridot || isMorganite || isChrysoberyl || isQuartz || isOtherTourmaline ? 0.30 : 0.46),
          gamma: family === "diamante" ? (isBlueDiamond ? 1.09 : isNeutralMicroDiamond ? 0.96 : isNeutralSmallDiamond ? 0.94 : 0.90) : 1.09,
          environmentRotationRadians: Number(currentMaterial?.userData?.aurumGemEnvironmentRotation ?? 0),
        });
        let currentDiamondTier: "micro" | "small" | "brilliant" = screenTier;
        entries.set(mesh, {
          originalMaterial: mesh.material,
          experimentalMaterial: prepared.material,
          family,
          gemId: activeGemId,
          activeGemFamily,
          originalDiamondOpticalFamily: mesh.userData?.aurumDiamondOpticalFamily,
          baseEnvironmentIntensity: prepared.diagnostics.environmentIntensity,
          get tier() { return currentDiamondTier; },
          setTier: (nextTier) => {
            if (family !== "diamante" || nextTier === currentDiamondTier || !packageApi.setDiamondOptions) return;
            // Keep blue/pink catalog calibrations untouched. Neutral white diamonds
            // follow the same MICRO/SMALL profiles as the physical shader, and
            // restore their original center/natural profile when they grow again.
            if (!isBlueDiamond && !isPinkDiamond) {
              const isMicro = nextTier === "micro";
              const isSmall = nextTier === "small";
              const baseEnvironment = 1.42;
              const baseDispersion = activeGemId === "diamante_natural" ? 0.006 : 0.004;
              packageApi.setDiamondOptions(prepared.material, {
                rgbBoost: isMicro ? [1.10, 1.10, 1.10] : isSmall ? [1.14, 1.14, 1.14] : [1.18, 1.18, 1.18],
                environmentIntensity: isMicro ? 1.20 : isSmall ? 1.30 : baseEnvironment,
                dispersion: isMicro ? 0.0003 : isSmall ? 0.0008 : baseDispersion,
                gamma: isMicro ? 0.96 : isSmall ? 0.94 : 0.90,
                rayBounces: isMicro ? 2 : isSmall ? 3 : 5,
              });
            }
            currentDiamondTier = nextTier;
          },
          setQuality: (quality) => {
            if (!packageApi.setDiamondOptions) return;
            if (family === "diamante") {
              // Match the audited secondary-diamond minimum while preserving calibrated center/blue values.
              // Secondary melee uses 4; blue uses 6 and center white references use 5.
              packageApi.setDiamondOptions(prepared.material, {
                // Fewer internal bounces on tiny white melee reduce unstable
                // high-frequency sparkle; the center and colored variants stay calibrated.
                rayBounces: currentDiamondTier === "micro" ? 2 : currentDiamondTier === "small" ? 3 : isBlueDiamond ? 6 : 5,
              });
              return;
            }
            if (isEmerald) {
              // Match the catalog-specific iJewel bounce reference in real-time
              // as well as high/final quality. The emerald BVH experiment keeps
              // transmission and dispersion at zero to isolate intersection artifacts.
              const emeraldBounces =
                activeGemId === "esmeralda_1" || activeGemId === "esmeralda_2"
                  ? 5
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
        entries.get(mesh)?.setQuality(family === "diamante" ? "high" : (options.quality ?? "interactive"));
        mesh.material = prepared.material;
        // Preserve the CAD stone identity on the mesh while BVH replaces its physical material.
        // Downstream diamond-only classifiers must not depend on experimental shader metadata.
        if (family === "diamante") {
          mesh.userData = { ...(mesh.userData ?? {}), aurumDiamondOpticalFamily: "diamante" };
          prepared.material.userData = { ...(prepared.material.userData ?? {}), aurumGemFamily: "Diamante", aurumDiamondMaterial: true };
        }
        if (family === "diamante" && mesh.userData?.aurumDiamondMicroCenterProtected) {
          console.info("[AURUM][DIAMOND][BVH] Perfil óptico central activo", {
            mesh: mesh.name || mesh.uuid,
            gemId: activeGemId,
            dispersion: prepared.material.uniforms?.dispersion?.value ?? 0.006,
            rayBounces: prepared.diagnostics.rayBounces,
            environmentIntensity: prepared.diagnostics.environmentIntensity,
            toneMapping: "HDR lineal; ACES interno retirado",
          });
        }
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
    };

    if (targetSet) targetSet.forEach(processMesh);
    else model.traverse(processMesh);

    for (const mesh of [...entries.keys()]) {
      if (targetSet && !targetSet.has(mesh)) continue;
      if (!found.has(mesh)) releaseEntry(mesh, mesh.material === entries.get(mesh)?.experimentalMaterial);
    }
  };

  return {
    refresh,
    refreshTargets(model, targets) {
      if (!targets?.length) return;
      refresh(model, targets);
    },
    hasActiveMeshes(targets) {
      if (disposed || entries.size === 0 || !targets?.length) return false;
      return targets.some((mesh) => entries.has(mesh));
    },
    update() {
      if (disposed || entries.size === 0) return;
      const nextCameraState = readCameraState();
      let cameraUnchanged = hasLastCameraState;
      if (cameraUnchanged) {
        for (let index = 0; index < nextCameraState.length; index++) {
          if (nextCameraState[index] !== lastCameraState[index]) {
            cameraUnchanged = false;
            break;
          }
        }
      }
      // The physical diamond pipeline runs immediately before this update and
      // publishes the shared screen-space tier on each mesh. Retune only when a
      // BVH diamond crosses a tier boundary; never rebuild its BVH for zoom/orbit.
      for (const [mesh, entry] of entries) {
        if (entry.family !== "diamante") continue;
        const nextTier = mesh.userData?.aurumDiamondMicroTier;
        if ((nextTier === "micro" || nextTier === "small" || nextTier === "brilliant") && nextTier !== entry.tier) {
          entry.setTier(nextTier);
        }
      }
      if (cameraUnchanged) return;
      for (const entry of entries.values()) {
        packageApi.updateDiamondCamera(entry.experimentalMaterial, options.camera);
      }
      // Commit only after every material accepted the camera update. If one
      // update throws, the next render frame retries instead of staying stale.
      lastCameraState.set(nextCameraState);
      hasLastCameraState = true;
    },
    updateEnvironment(rotationRadians, intensityScale) {
      if (disposed) return;
      const safeScale = Number.isFinite(intensityScale) ? Math.max(0.75, Math.min(1.35, intensityScale)) : 1;
      const rotationDegrees = THREE_NS.MathUtils.radToDeg(Number.isFinite(rotationRadians) ? rotationRadians : 0);
      for (const entry of entries.values()) {
        packageApi.setDiamondEnvironmentRotation?.(entry.experimentalMaterial, { x: 0, y: rotationDegrees, z: 0 });
        packageApi.setDiamondOptions?.(entry.experimentalMaterial, {
          environmentIntensity: Math.max(0, Math.min(2.5, entry.baseEnvironmentIntensity * safeScale)),
        });
      }
    },
    setDiamondQuality(quality) {
      if (disposed) return;
      for (const entry of entries.values()) entry.setQuality(quality);
    },
    setFamilyEnabled(family, enabled) {
      if (disposed) return;
      const key = String(family ?? "").trim().toLocaleLowerCase();
      if (!key) return;
      if (enabled) {
        if (!disabledFamilies.delete(key)) return;
        if (lastModel) refresh(lastModel);
        return;
      }
      disabledFamilies.add(key);
      for (const [mesh, entry] of [...entries]) {
        if (entry.family === key) releaseEntry(mesh, true);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const mesh of [...entries.keys()]) releaseEntry(mesh, true);
      if (ownsEnvironmentMap) environmentMap.dispose();
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
        gemEnvironment: {
          loaded: Boolean(environmentMap?.isTexture),
          url: options.url,
          textureUuid: environmentMap?.uuid ?? null,
          mapping: environmentMap?.mapping ?? null,
          colorSpace: environmentMap?.colorSpace ?? null,
          ownedByRuntime: ownsEnvironmentMap,
        },
        enabled: entries.size > 0,
      };
    },
  };
}
