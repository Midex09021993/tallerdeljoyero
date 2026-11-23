// @ts-nocheck -- AURUM Render engine: strict-mode typing pending; runtime behaviour unchanged.
import * as THREE from "three";
import { resolveAurumDiamondCatalogParameters } from "./aurum-diamond-material";
import { classifyAurumDiamondMeshTiers, getAurumDiamondProjectedDiameterPx, getAurumDiamondMicroOpticalProfile } from "./diamond-micro-pipeline";
import { resolveAurumCatalogGemBvhColor, resolveAurumEmeraldBvhProfile, resolveAurumRubyBvhProfile, resolveAurumSapphireBvhProfile } from "./aurum-gem-bvh-profiles";
import {
  prepareAurumDiamondBvhExperiment,
  type AurumDiamondBvhApi,
  setAurumDiamondBvhOpticalParameters,
} from "./aurum-diamond-bvh-experimental";

type RecordEntry = {
  originalMaterial: THREE.Material | THREE.Material[];
  experimentalMaterial: THREE.Material;
  family: string;
  gemId: string;
  activeGemFamily: string;
  originalDiamondOpticalFamily: unknown;
  baseEnvironmentIntensity: number;
  /** Per-mesh yaw compensation relative to the center diamond reference. */
  environmentRotationOffsetRadians: number;
  environmentRotationCorrection: [number, number, number, number] | null;
  setQuality: (quality: "interactive" | "high" | "final") => void;
  readonly tier: "micro" | "small" | "medium" | "brilliant";
  setTier: (tier: "micro" | "small" | "medium" | "brilliant") => void;
  setSourceDispersion: (dispersion: number) => void;
  setColor: (color: number) => void;
  setProfile: (profile: any) => void;
  dispose: () => void;
};

export type AurumDiamondEnvironmentRotationEuler = { x: number; y: number; z: number };

/**
 * Compose the global YXZ environment rotation with a complete optical-frame
 * correction. The shader applies this matrix to WORLD ray directions.
 */
export function getAurumDiamondEnvironmentRotationEuler(
  baseRotationRadians: number,
  correctionQuaternion: THREE.Quaternion | readonly [number, number, number, number] | null = null,
): AurumDiamondEnvironmentRotationEuler {
  const base = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(0, Number.isFinite(baseRotationRadians) ? baseRotationRadians : 0, 0, "YXZ"),
  );
  const correction = correctionQuaternion instanceof THREE.Quaternion
    ? correctionQuaternion.clone()
    : correctionQuaternion
      ? new THREE.Quaternion(...correctionQuaternion)
      : null;
  if (correction && correction.lengthSq() > 1e-12) {
    base.multiply(new THREE.Matrix4().makeRotationFromQuaternion(correction.normalize()));
  }
  const euler = new THREE.Euler().setFromRotationMatrix(base, "YXZ");
  return {
    x: THREE.MathUtils.radToDeg(euler.x),
    y: THREE.MathUtils.radToDeg(euler.y),
    z: THREE.MathUtils.radToDeg(euler.z),
  };
}

export type AurumDiamondBvhRuntime = {
  refresh: (model: THREE.Object3D | null | undefined) => void;
  /** Rebuild BVH optics only for the assigned stone meshes; unrelated entries remain untouched. */
  refreshTargets: (model: THREE.Object3D | null | undefined, targets: readonly THREE.Mesh[]) => void;
  /** O(1) membership check for already-resolved gem targets; avoids full-model diagnostics in the selection hot path. */
  hasActiveMeshes: (targets: readonly THREE.Mesh[]) => boolean;
  update: () => void;
  updateEnvironment: (rotationRadians: number, intensityScale: number) => void;
  /** Update only the source dispersion of existing diamond BVH materials. */
  setDiamondDispersion: (targets: readonly THREE.Mesh[], dispersion: number) => void;
  /** Update the catalog RGB on already-created BVH diamond shader uniforms. */
  setDiamondColor: (targets: readonly THREE.Mesh[], color: number) => void;
  /** Atomically synchronize the BVH shader and its retained physical fallback to a catalog profile. */
  setDiamondProfile: (targets: readonly THREE.Mesh[], profile: any) => void;
  /** Temporarily raise diamond-only ray bounces for a still capture. */
  setDiamondQuality: (quality: "interactive" | "high" | "final") => void;
  /** Enable/disable one gemstone family without disturbing other BVH entries. */
  setFamilyEnabled: (family: string, enabled: boolean) => void;
  dispose: () => void;
  diagnostics: () => { activeMeshes: number; triangleCount: number; diamondMeshes: number; diamondTriangleCount: number; familyCounts: Record<string, number>; skippedTargetMeshes: Array<{ mesh: string; materialFamilies: string[]; activeGemFamily: string; reason: string }>; diamondOpticalDiagnostics: Array<{ mesh: string; gemId: string; tier: string; opticalProfile: string; ior: number; transmission: number; dispersion: number; gamma: number; reflectivity: number; environmentIntensity: number; rayBounces: number; environmentTextureUuid: string | null }>; centerTargetDiagnostics: Array<{ mesh: string; gemId: string; activeGemFamily: string; centerProtected: boolean; role: string; tier: string; projectedDiameterPx: number; accepted: boolean; reason: string }>; overlappingGemPairs: Array<{ meshA: string; familyA: string; meshB: string; familyB: string; overlapRatio: number }>; enabled: boolean };
};

/** True only for the center stone protected by the shared screen-space analyzer or explicit CAD metadata. */
export function isAurumDiamondBvhCenterTarget(mesh: THREE.Mesh): boolean {
  const data = mesh?.userData ?? {};
  return Boolean(data.aurumDiamondMicroCenterProtected || data.aurumDiamondCenter || data.aurumDiamondIsCenter)
    || /center|central|main|principal/i.test(String(data.aurumDiamondRole ?? ""));
}

function readAurumDiamondRgbBoost(material: THREE.Material): [number, number, number] | null {
  const shaderMaterial = material as THREE.ShaderMaterial & { userData?: Record<string, any> };
  const uniforms = shaderMaterial.uniforms ?? {};
  const candidates = [
    uniforms.boostFactors?.value,
    uniforms.rgbBoost?.value,
    shaderMaterial.userData?.aurumIJEWELUniforms?.boostFactors?.value,
    shaderMaterial.userData?.aurumDiamondUniforms?.boostFactors?.value,
  ];
  const value = candidates.find((candidate) => candidate != null);
  if (value == null) return null;
  if (Array.isArray(value) || ArrayBuffer.isView(value)) {
    const values = Array.from(value as ArrayLike<number>);
    return values.length >= 3 ? [Number(values[0]), Number(values[1]), Number(values[2])] : null;
  }
  if (typeof value === "object" && "x" in value && "y" in value && "z" in value) {
    return [Number(value.x), Number(value.y), Number(value.z)];
  }
  return null;
}

export type AurumDiamondOpticalProfileBaseline = {
  profileId: string;
  dispersion: number;
  environmentIntensity: number;
  reflectivity: number;
  gamma: number;
  rgbBoost: [number, number, number];
  geometryFactor: number;
  squashFactor: number;
  absorptionFactor: number;
  transmission: number;
};

/** Resolve profile values without losing the exact startup calibration when returning to the original catalog profile. */
export function resolveAurumDiamondProfileOptics(
  profile: any,
  baseline: AurumDiamondOpticalProfileBaseline,
) {
  const parameters = resolveAurumDiamondCatalogParameters(profile);
  const profileId = String(profile?.id ?? "");
  const restoringInitialProfile = profileId !== "" && profileId === baseline.profileId;
  if (restoringInitialProfile) {
    // The first render is the optical reference. Catalog metadata can contain
    // generic source values (for example gamma 1.0 / reflectivity 0.5) that
    // differ from the calibrated material actually shown at startup.
    return {
      dispersion: baseline.dispersion,
      environmentIntensity: baseline.environmentIntensity,
      reflectivity: baseline.reflectivity,
      gamma: baseline.gamma,
      rgbBoost: [...baseline.rgbBoost] as [number, number, number],
      geometryFactor: baseline.geometryFactor,
      squashFactor: baseline.squashFactor,
      absorptionFactor: baseline.absorptionFactor,
      transmission: baseline.transmission,
    };
  }
  const boostFactors = parameters.boostFactors ?? profile?.boostFactors;
  return {
    dispersion: Math.max(0, Math.min(0.1, Number(parameters.dispersion ?? profile?.dispersion ?? 0))),
    environmentIntensity: Math.max(0, Number(profile?.envMapIntensity ?? 1.3)),
    reflectivity: Number(parameters.reflectivity ?? 0.5),
    gamma: Number(parameters.gammaFactor ?? 1),
    geometryFactor: Number(parameters.geometryFactor ?? 0.5),
    squashFactor: Number(parameters.squashFactor ?? 0.98),
    absorptionFactor: Math.max(0, Number(parameters.absorptionFactor ?? 1)),
    transmission: Math.max(0, Math.min(1, Number(parameters.transmission ?? profile?.transmission ?? 0))),
    rgbBoost: boostFactors
      ? [Number(boostFactors.x ?? 1), Number(boostFactors.y ?? 1), Number(boostFactors.z ?? 1)]
      : [1, 1, 1],
  };
}

function readAurumDiamondShaderAudit(material: THREE.Material): Record<string, unknown> {
  const shader = material as THREE.ShaderMaterial & { userData?: Record<string, any> };
  const uniforms = shader.uniforms ?? {};
  const aliases: Record<string, string[]> = {
    geometryFactor: ["aurumIJEWELGeometryFactor", "facetSharpness"],
    squashFactor: ["aurumIJEWELSQUASHFactor"],
    absorptionFactor: ["aurumIJEWELAbsorptionFactor", "absorption"],
    transmission: ["aurumIJEWELTransmissionParameter", "transmission"],
    absorption: ["absorption", "aurumIJEWELAbsorptionFactor"],
    reflectivity: ["aurumIJEWELReflectivity", "reflectivity"],
    gamma: ["aurumIJEWELGammaFactor", "gamma"],
  };
  const read = (key: string) => {
    const candidates = [key, ...(aliases[key] ?? [])];
    const value = candidates.map((name) =>
      uniforms[name]?.value
      ?? shader.userData?.aurumIJEWELUniforms?.[name]?.value
      ?? shader.userData?.aurumDiamondUniforms?.[name]?.value
    ).find((candidate) => candidate !== undefined && candidate !== null);
    if (value == null) return null;
    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
    if (Array.isArray(value) || ArrayBuffer.isView(value)) return Array.from(value as ArrayLike<unknown>);
    if (typeof value === "object" && "x" in value && "y" in value && "z" in value) {
      return { x: Number(value.x), y: Number(value.y), z: Number(value.z) };
    }
    return Object.prototype.toString.call(value);
  };
  return {
    dispersion: read("dispersion"), environmentIntensity: read("environmentIntensity"),
    reflectivity: read("reflectivity"), gamma: read("gamma"), ior: read("ior"),
    transmission: read("transmission"), absorption: read("absorption"),
    geometryFactor: read("geometryFactor"), squashFactor: read("squashFactor"), absorptionFactor: read("absorptionFactor"),
    rgbBoost: read("rgbBoost"), boostFactors: read("boostFactors"),
  };
}

function setAurumBvhShaderColor(material: THREE.Material, colorHex: number): void {
  const shaderMaterial = material as THREE.ShaderMaterial;
  const color = new THREE.Color(colorHex);
  const uniform = shaderMaterial.uniforms?.color;
  if (uniform && uniform.value != null) {
    const value = uniform.value as any;
    if (typeof value.setHex === "function") value.setHex(colorHex);
    else if (typeof value.copy === "function") value.copy(color);
    else if (typeof value.setRGB === "function") value.setRGB(color.r, color.g, color.b);
    else if (typeof value.set === "function") value.set(color.r, color.g, color.b);
    else uniform.value = color;
    shaderMaterial.uniformsNeedUpdate = true;
  }
  const userData = material.userData ?? {};
  material.userData = { ...userData, aurumDiamondCatalogColor: colorHex };
}

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
  /** Global gem EXR rotation selected by the scene controller. */
  environmentRotationRadians?: number;
  /** Defaults to true for internally loaded maps; external maps remain caller-owned. */
  ownsEnvironmentMap?: boolean;
  camera: THREE.Camera;
  /** Renderer viewport height, used to share the exact screen-space diamond tiers. */
  getViewportHeight?: () => number;
  quality?: "interactive" | "high" | "final";
  targetFamilies?: string[];
  /** When true, BVH is reserved for the explicitly/inferred protected center diamond. */
  diamondCenterOnly?: boolean;
  /** Enables the new physical IOR / reduced-fire calibration for editor secondary diamonds only. */
  calibrateSecondaryDiamonds?: boolean;
  onError?: (error: unknown) => void;
}): Promise<AurumDiamondBvhRuntime> {
  const diamondRgbAuditEnabled = typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("aurumDiamondRgbAudit") === "1";
  const THREE_NS = options.THREE;
  const packageApi = await import("realistic-diamond-shader") as unknown as AurumDiamondBvhApi;
  const ownsEnvironmentMap = options.environmentMap
    ? options.ownsEnvironmentMap === true
    : true;
  const environmentMap = options.environmentMap ?? await new Promise<THREE.Texture>((resolve, reject) => {
    const isExr = /\.exr(?:$|[?#])/i.test(options.url);
    const Loader = isExr && options.EXRLoader ? options.EXRLoader : options.RGBELoader;
    const loader = new Loader();

    // Match Diamond Optical Lab exactly: EXRLoader.setDataType(THREE.FloatType).
    // The lab parses the same equirectangular EXR into a FloatType DataTexture;
    // production must not silently decode it using the loader's default HalfFloatType.
    if (isExr && typeof loader.setDataType === "function") {
      loader.setDataType(THREE_NS.FloatType);
    }

    loader.load(
      options.url,
      (texture: THREE.Texture) => {
        texture.mapping = THREE_NS.EquirectangularReflectionMapping;
        texture.colorSpace = THREE_NS.LinearSRGBColorSpace;
        texture.generateMipmaps = false;
        texture.minFilter = THREE_NS.LinearFilter;
        texture.magFilter = THREE_NS.LinearFilter;
        texture.unpackAlignment = 1;
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
  const requestedEnvironmentRotationRadians = Number.isFinite(options.environmentRotationRadians)
    ? Number(options.environmentRotationRadians)
    : 0;

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
  const diamondOpticalDiagnostics: Array<{ mesh: string; gemId: string; tier: string; opticalProfile: string; ior: number; transmission: number; dispersion: number; gamma: number; reflectivity: number; environmentIntensity: number; rayBounces: number; environmentTextureUuid: string | null }> = [];
  const centerTargetDiagnostics: Array<{ mesh: string; gemId: string; activeGemFamily: string; centerProtected: boolean; role: string; tier: string; accepted: boolean; reason: string }> = [];

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
      diamondOpticalDiagnostics.length = 0;
      centerTargetDiagnostics.length = 0;
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
    const referenceGemMeshes: THREE.Mesh[] = [];
    let largestDiamondRadius = 0;
    // The orientation anchor is a CAD stone identity, not a material family.
    // Scan gem meshes on every reconciliation so the same center remains the
    // reference when its catalog assignment changes from diamond to ruby, etc.
    model.traverse((object) => {
      const candidate = object as THREE.Mesh;
      if (!candidate.isMesh || !candidate.geometry) return;
      const candidateMaterials = Array.isArray(candidate.material) ? candidate.material : [candidate.material];
      if (candidateMaterials.length !== 1) return;
      const material = candidateMaterials[0];
      const candidateFamily = getGemFamily(material)
        || String(candidate.userData?.aurumActiveGemFamily ?? "").toLocaleLowerCase();
      if (!candidateFamily) return;
      const isGemMaterial = Boolean(material?.userData?.aurumOpticalProfile
        || material?.userData?.aurumGemFamily
        || candidate.userData?.aurumActiveGemId
        || candidate.userData?.aurumActiveGemFamily);
      if (isGemMaterial) referenceGemMeshes.push(candidate);
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
    const viewportHeight = Number(options.getViewportHeight?.() ?? 0);
    const screenTiers = viewportHeight > 1
      ? classifyAurumDiamondMeshTiers(diamondMeshes, options.camera, viewportHeight, options.calibrateSecondaryDiamonds === true)
      : new Map<THREE.Mesh, "micro" | "small" | "medium" | "brilliant">();
    // Infer the protected center only when one diamond is clearly larger
    // than the next candidate. This recovers Rhino/GLB models that carry no
    // explicit center marker while keeping secondary melee on physical optics.
    const projectedDiamondSizes = diamondMeshes.map((mesh) => ({
      mesh,
      diameterPx: getAurumDiamondProjectedDiameterPx(mesh, options.camera, viewportHeight),
    })).filter((entry) => Number.isFinite(entry.diameterPx) && entry.diameterPx > 0)
      .sort((a, b) => b.diameterPx - a.diameterPx);
    const largestProjectedDiamond = projectedDiamondSizes[0];
    const secondLargestProjectedDiamond = projectedDiamondSizes[1];
    const inferredCenterMesh = largestProjectedDiamond
      && (!secondLargestProjectedDiamond || largestProjectedDiamond.diameterPx >= secondLargestProjectedDiamond.diameterPx * 1.5)
      ? largestProjectedDiamond.mesh
      : null;
    const explicitCenterMesh = diamondMeshes.find((mesh) => isAurumDiamondBvhCenterTarget(mesh));
    const projectedReferenceGemSizes = referenceGemMeshes.map((mesh) => ({
      mesh,
      diameterPx: getAurumDiamondProjectedDiameterPx(mesh, options.camera, viewportHeight),
    })).filter((entry) => Number.isFinite(entry.diameterPx) && entry.diameterPx > 0)
      .sort((a, b) => b.diameterPx - a.diameterPx);
    const largestReferenceGem = projectedReferenceGemSizes[0];
    const secondLargestReferenceGem = projectedReferenceGemSizes[1];
    const inferredGemReference = largestReferenceGem
      && (!secondLargestReferenceGem || largestReferenceGem.diameterPx >= secondLargestReferenceGem.diameterPx * 1.5)
      ? largestReferenceGem.mesh
      : null;
    const explicitGemReference = referenceGemMeshes.find((mesh) =>
      Boolean(mesh.userData?.aurumGemOrientationReference
        || mesh.userData?.aurumDiamondCenter
        || mesh.userData?.aurumDiamondIsCenter)
      || /center|central|main|principal/i.test(String(mesh.userData?.aurumDiamondRole ?? mesh.userData?.aurumGemRole ?? "")),
    );
    const centerReferenceMesh = explicitGemReference ?? inferredGemReference ?? explicitCenterMesh ?? inferredCenterMesh;
    if (centerReferenceMesh && !centerReferenceMesh.userData?.aurumGemOrientationReference) {
      centerReferenceMesh.userData = { ...(centerReferenceMesh.userData ?? {}), aurumGemOrientationReference: true };
    }
    // Derive each stone's optical frame from its table normal and in-plane axis.
    // The thin bounding-box axis is an estimate; the correction aligns the full 3D frame.
    const getDiamondOpticalFrame = (mesh: THREE.Mesh) => {
      const geometry = mesh.geometry;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      const bounds = geometry.boundingBox;
      if (!bounds) return null;
      const size = bounds.getSize(new THREE_NS.Vector3());
      const extents = [size.x, size.y, size.z];
      const axes = [0, 1, 2].sort((x, y) => extents[x] - extents[y]);
      const normalAxis = axes[0];
      const referenceAxis = axes[2];
      if (extents[normalAxis] <= 1e-8 || extents[referenceAxis] <= 1e-8
        || extents[normalAxis] / extents[referenceAxis] > 0.9) return null;
      const axisVector = (axis: number) => new THREE_NS.Vector3(axis === 0 ? 1 : 0, axis === 1 ? 1 : 0, axis === 2 ? 1 : 0);
      mesh.updateWorldMatrix(true, false);
      const worldQuaternion = mesh.getWorldQuaternion(new THREE_NS.Quaternion());
      const worldNormal = axisVector(normalAxis).applyQuaternion(worldQuaternion).normalize();
      const worldReference = axisVector(referenceAxis).applyQuaternion(worldQuaternion).normalize();
      worldReference.addScaledVector(worldNormal, -worldReference.dot(worldNormal)).normalize();
      if (worldReference.lengthSq() < 1e-10) return null;
      const worldSide = new THREE_NS.Vector3().crossVectors(worldReference, worldNormal).normalize();
      const opticalBasis = new THREE_NS.Matrix4().makeBasis(worldReference, worldNormal, worldSide);
      return { worldNormal, worldReference, opticalBasis, localNormalAxis: normalAxis, localReferenceAxis: referenceAxis };
    };
    const centerOpticalFrame = centerReferenceMesh ? getDiamondOpticalFrame(centerReferenceMesh) : null;
    const getMeshEnvironmentRotation = (mesh: THREE.Mesh) => {
      const frame = getDiamondOpticalFrame(mesh);
      if (!frame || !centerOpticalFrame) {
        return {
          offsetRadians: 0,
          rotationRadians: requestedEnvironmentRotationRadians,
          rotationEuler: getAurumDiamondEnvironmentRotationEuler(requestedEnvironmentRotationRadians),
          correctionQuaternion: null,
          opticalAxisAlignmentDegrees: null,
          inPlaneTwistDegrees: null,
          tableNormal: frame?.worldNormal.toArray() ?? null,
          referenceAxis: frame?.worldReference.toArray() ?? null,
          localNormalAxis: frame?.localNormalAxis ?? null,
          localReferenceAxis: frame?.localReferenceAxis ?? null,
          frameValid: false,
        };
      }
      const centerNormal = centerOpticalFrame.worldNormal.clone();
      const meshNormal = frame.worldNormal.clone();
      if (centerNormal.dot(meshNormal) < 0) meshNormal.negate();
      const normalAlignmentDegrees = THREE_NS.MathUtils.radToDeg(
        Math.acos(THREE_NS.MathUtils.clamp(centerNormal.dot(meshNormal), -1, 1)),
      );
      const meshBasis = frame.opticalBasis.clone();
      if (centerNormal.dot(frame.worldNormal) < 0) {
        meshBasis.premultiply(new THREE_NS.Matrix4().makeRotationAxis(frame.worldReference, Math.PI));
      }
      const correctionMatrix = centerOpticalFrame.opticalBasis.clone().multiply(meshBasis.clone().invert());
      const correctionQuaternion = new THREE_NS.Quaternion().setFromRotationMatrix(correctionMatrix).normalize();
      const referenceAngle = Math.atan2(
        centerNormal.dot(new THREE_NS.Vector3().crossVectors(centerOpticalFrame.worldReference, frame.worldReference)),
        THREE_NS.MathUtils.clamp(centerOpticalFrame.worldReference.dot(frame.worldReference), -1, 1),
      );
      return {
        offsetRadians: -referenceAngle,
        rotationRadians: requestedEnvironmentRotationRadians - referenceAngle,
        rotationEuler: getAurumDiamondEnvironmentRotationEuler(requestedEnvironmentRotationRadians, correctionQuaternion),
        correctionQuaternion: correctionQuaternion.toArray() as [number, number, number, number],
        opticalAxisAlignmentDegrees: normalAlignmentDegrees,
        inPlaneTwistDegrees: THREE_NS.MathUtils.radToDeg(referenceAngle),
        tableNormal: frame.worldNormal.toArray(),
        referenceAxis: frame.worldReference.toArray(),
        localNormalAxis: frame.localNormalAxis,
        localReferenceAxis: frame.localReferenceAxis,
        frameValid: true,
      };
    };

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
      // Rebuild only when the material instance or gemstone family changes.
      // Diamond catalog identity is synchronized in-place by entry.setProfile(),
      // so switching white/colored diamond profiles keeps the compatible BVH alive.
      // A true family/material change still restores and disposes the old entry.
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
      const hasPublishedTier = publishedTier === "micro" || publishedTier === "small" || publishedTier === "medium" || publishedTier === "brilliant";
      const screenTier = hasPublishedTier
        ? publishedTier
        : screenTiers.get(mesh)
          ?? (mesh.userData?.aurumDiamondMicroCenterProtected
            ? "brilliant"
            : (diamondRadius > 0 && largestDiamondRadius > 0
              ? diamondSizeRatio <= 0.42 ? "small" : options.calibrateSecondaryDiamonds === true && diamondSizeRatio <= 0.65 ? "medium" : "brilliant"
              : "brilliant"));
      const inferredCenter = family === "diamante" && mesh === inferredCenterMesh;
      // A projected-size inference is useful as an optical-frame reference,
      // but it must not turn the largest *secondary* stone into the protected
      // center in the editor. In editor calibration mode only explicit CAD/user
      // center markers protect the focal stone; this lets the "brilliant" tier
      // receive White 1/White 2 source dispersion just like the smaller tiers.
      if (options.calibrateSecondaryDiamonds === true
        && mesh.userData?.aurumDiamondCenterDetection === "projected-size") {
        const cleanedUserData = { ...(mesh.userData ?? {}) };
        delete cleanedUserData.aurumDiamondMicroCenterProtected;
        delete cleanedUserData.aurumDiamondCenterDetection;
        mesh.userData = cleanedUserData;
      }
      const explicitlyProtected = family === "diamante" && isAurumDiamondBvhCenterTarget(mesh);
      if (inferredCenter && !explicitlyProtected && options.calibrateSecondaryDiamonds !== true) {
        mesh.userData = {
          ...(mesh.userData ?? {}),
          aurumDiamondMicroCenterProtected: true,
          aurumDiamondCenterDetection: "projected-size",
        };
      }
      const inferredCenterProtected = inferredCenter && options.calibrateSecondaryDiamonds !== true;
      mesh.userData = {
        ...(mesh.userData ?? {}),
        aurumDiamondMicroTier: screenTier,
        // Public viewer retains inferred-center protection. In the editor, only
        // explicit center identity protects the central optical calibration.
        aurumDiamondMicroCenterProtected: explicitlyProtected || inferredCenterProtected
          || Boolean(mesh.userData?.aurumDiamondMicroCenterProtected),
      };
      const calibrateSecondaryDiamond = options.calibrateSecondaryDiamonds === true
        && family === "diamante"
        && !explicitlyProtected;
      // White diamond profiles share the calibrated White 1 dispersion (0.010).
      // Catalog metadata is authoritative; the fallback must preserve the same
      // value even if a material arrives without its attached .dmat parameters.
      // Other secondary diamond profiles retain their existing 0.006 baseline.
      // Secondary stones consume the exact catalog/.dmat parameters attached
      // to their physical material. The protected center normally retains its
      // approved calibration; Diamante rosado 2 is the explicit exception because
      // its imported .dmat is the requested source calibration for every size.
      const isWhiteDiamondProfile = activeGemId === "diamante_natural"
        || activeGemId === "diamante_vs"
        || activeGemId === "diamante_inclusiones";
      // White catalog profiles define reflectivity/gamma for every stone,
      // including the explicitly protected center. Do not fall back to the
      // legacy 0.46 / 1.09 values merely because center calibration is protected.
      const diamondSourceParameters = (calibrateSecondaryDiamond || isWhiteDiamondProfile || activeGemId === "diamante_rosa_2")
        ? currentMaterial?.userData?.aurumIJEWELParameters ?? null
        : null;
      const initialDiamondParameters = currentMaterial?.userData?.aurumIJEWELParameters ?? {};
      const initialDiamondTransmission = Math.max(0, Math.min(1, Number(currentMaterial?.transmission ?? initialDiamondParameters.transmission ?? 0)));
      const initialDiamondGeometryFactor = Number(initialDiamondParameters.geometryFactor ?? 0.5);
      const initialDiamondSquashFactor = Number(initialDiamondParameters.squashFactor ?? 0.98);
      const initialDiamondAbsorptionFactor = Math.max(0, Number(initialDiamondParameters.absorptionFactor ?? 1));
      let baseDiamondDispersion = family !== "diamante"
        ? undefined
        : diamondSourceParameters
          ? Math.max(0, Number(diamondSourceParameters.dispersion ?? 0.006))
          : !calibrateSecondaryDiamond
            ? 0.010
            : (activeGemId === "diamante_natural"
              || activeGemId === "diamante_vs"
              || activeGemId === "diamante_inclusiones")
              ? 0.010
              : 0.006;
      // Optional center-only mode limits eligibility, but center identification
      // above remains active in all-size production mode.
      if (family === "diamante" && options.diamondCenterOnly) {
        const centerProtected = explicitlyProtected || inferredCenter;
        if (centerTargetDiagnostics.length < 60) {
          centerTargetDiagnostics.push({
            mesh: mesh.name || mesh.uuid,
            get gemId() { return entryGemId; },
            activeGemFamily,
            centerProtected,
            role: String(mesh.userData?.aurumDiamondRole ?? ""),
            tier: screenTier,
            projectedDiameterPx: Number(getAurumDiamondProjectedDiameterPx(mesh, options.camera, viewportHeight).toFixed(2)),
            accepted: centerProtected,
            reason: explicitlyProtected ? "centro-protegido-explicito" : inferredCenter ? "centro-inferido-por-tamano" : "sin-marca-de-centro",
          });
        }
        if (inferredCenter && !explicitlyProtected) {
          mesh.userData = { ...(mesh.userData ?? {}), aurumDiamondMicroCenterProtected: true, aurumDiamondCenterDetection: "projected-size" };
        }
        if (!centerProtected) return;
      }
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
        // Match the approved isolated AURUM BVH optical reference only on the
        // protected center white diamond. Secondary/colored diamonds retain
        // their existing calibrated profiles and tier-dependent energy controls.
        // All diamond tiers share the same EXR texture. Each mesh gets a
        // yaw-only environment correction relative to the center stone.
        const sharedDiamondEnvironmentMap = environmentMap;
        const meshEnvironmentAlignment = family === "diamante"
          ? getMeshEnvironmentRotation(mesh)
          : { offsetRadians: 0, rotationRadians: requestedEnvironmentRotationRadians, worldYawRadians: 0 };
        const sourceEnvironmentOffset = family === "diamante" && diamondSourceParameters
          ? Number(diamondSourceParameters.environmentRotationOffset ?? 0)
          : 0;
        const selectedCatalogDiamondColor = family === "diamante"
        ? Number(mesh.userData?.aurumDiamondCatalogColor
          ?? currentMaterial?.color?.getHex?.()
          ?? (isBlueDiamond ? 0x80c3dc : activeGemId === "diamante_rosa_2" ? 0xf1bcd5 : isPinkDiamond ? 0xf9dfec : 0xffffff))
        : undefined;
      // Catalog .dmat values are authoritative for neutral/white diamonds.
      // Always write an explicit neutral boost when the source has no boost so
      // the shader package default cannot leak energy from a previously selected profile.
      const initialRgbBoost = family === "diamante"
        ? (isBlueDiamond ? [2, 2, 2] as [number, number, number]
          : isPinkDiamond ? [1.3, 1, 1] as [number, number, number]
          : [
              Number(diamondSourceParameters?.boostFactors?.x ?? 1),
              Number(diamondSourceParameters?.boostFactors?.y ?? 1),
              Number(diamondSourceParameters?.boostFactors?.z ?? 1),
            ] as [number, number, number])
        : undefined;
      const prepared = prepareAurumDiamondBvhExperiment(packageApi, mesh, {
          ...(emeraldProfile ?? rubyProfile ?? sapphireProfile ?? {}),
          // The approved A/B reference uses zero direct transmission; internal
          // BVH refraction supplies the visible diamond response.
          // Neutral white diamonds share the exact center-stone optical profile.
          transmission: family === "diamante"
            ? initialDiamondTransmission
            : (useEmeraldBvhOptics || isRuby || isSapphire)
              ? 0
              : (emeraldProfile?.transmission ?? rubyProfile?.transmission ?? sapphireProfile?.transmission ?? (isImperialTopaz ? 0.88 : isParaibaTourmaline ? 0.91 : 0)),
          environmentMap: sharedDiamondEnvironmentMap,
          camera: options.camera,
          // All diamond sizes use the same high-quality BVH path as the
          // center stone. Screen-space tiers still control optical energy,
          // dispersion and stability independently of BVH render quality.
          // Non-diamond gemstone families retain the caller-selected quality.
          quality: family === "diamante" ? "high" : (options.quality ?? "interactive"),
          // Restore the original diamond BVH fire/brightness settings; the emerald experiment remains isolated.
          // Small white melee stones need a gentle neutral energy lift so their
          // compact facets read bright instead of graphite-grey; keep colored
          // diamonds and the center stone on their existing calibrated values.
          // White diamonds share the same base BVH material calibration.
          // The Micro Pipeline applies a restrained dispersion multiplier only
          // to secondary MICRO/SMALL stones; the protected center remains 1:1.
          // Gamma, IOR, environment and the underlying material response stay fixed.
          rgbBoost: initialRgbBoost,
          environmentIntensity: family === "diamante"
            ? (diamondSourceParameters ? Number(currentMaterial?.envMapIntensity ?? 1.30) : (!isBlueDiamond && !isPinkDiamond ? 1.30 : isBlueDiamond ? 1.30 : 1.25))
            : useEmeraldBvhOptics ? 1 : emeraldProfile?.environmentIntensity ?? rubyProfile?.environmentIntensity ?? sapphireProfile?.environmentIntensity ?? (isEmerald ? 1.5 : isRuby ? 1.0 : isSapphire ? 1.2 : isAmethyst ? 1.35 : isAquamarine ? 1.25 : isCitrine ? 1.2 : isBlueTopaz ? 1.25 : isImperialTopaz ? 1.22 : isParaibaTourmaline ? (activeGemId === "turmalina_paraiba" ? 1.55 : 1.3) : isTanzanite ? 1.25 : isMoissanite ? 1.35 : isZircon ? 1.2 : isSpinel || isGarnet || isPeridot || isMorganite || isChrysoberyl || isQuartz || isOtherTourmaline ? 1.18 : 1.14),
          dispersion: family === "diamante"
            ? baseDiamondDispersion
            : useEmeraldBvhOptics ? 0 : (emeraldProfile?.dispersion ?? rubyProfile?.dispersion ?? sapphireProfile?.dispersion ?? (isRuby ? 0.001 : isSapphire ? 0.001 : isAmethyst || isAquamarine || isCitrine || isBlueTopaz || isImperialTopaz || isParaibaTourmaline || isTanzanite || isSpinel || isGarnet || isPeridot || isMorganite || isChrysoberyl || isQuartz || isOtherTourmaline ? 0.0002 : isZircon ? 0.001 : isMoissanite ? 0.009 : 0.01)),
          ior: emeraldProfile?.ior ?? rubyProfile?.ior ?? sapphireProfile?.ior ?? (family === "diamante" ? (diamondSourceParameters ? Number(diamondSourceParameters.refractiveIndex ?? 2.6) : (calibrateSecondaryDiamond ? 2.417 : 2.6)) : isEmerald ? 1.58 : isRuby ? 1.762 : isSapphire ? 1.762 : isAmethyst ? 1.55 : isAquamarine ? 1.577 : isCitrine || isQuartz ? 1.544 : isBlueTopaz || isImperialTopaz ? 1.63 : isParaibaTourmaline || isOtherTourmaline ? 1.62 : isTanzanite ? 1.695 : isMoissanite ? 2.65 : isSpinel ? 1.718 : isGarnet ? 1.78 : isPeridot ? 1.65 : isMorganite ? 1.58 : isZircon ? 1.92 : isChrysoberyl ? 1.75 : 1.55),
          absorption: family === "diamante"
            ? initialDiamondAbsorptionFactor
            : useEmeraldBvhOptics
              ? (activeGemId === "esmeralda_2" ? 1.8 : activeGemId === "esmeralda_1" || activeGemId === "esmeralda_3" || activeGemId === "esmeralda_inclusiones" ? 1.6 : 1.35)
            : emeraldProfile?.absorption ?? rubyProfile?.absorption ?? sapphireProfile?.absorption ?? (isEmerald ? 0.45 : isRuby ? 1.15 : isSapphire ? 0.85 : isAmethyst ? 0.62 : isAquamarine ? 0.45 : isCitrine ? 0.5 : isBlueTopaz ? 0.42 : isImperialTopaz ? 0.48 : isParaibaTourmaline ? (activeGemId === "turmalina_paraiba" ? 0.22 : 0.38) : isTanzanite ? 0.42 : isMoissanite ? 0.18 : isSpinel || isGarnet || isPeridot || isMorganite || isZircon || isChrysoberyl || isQuartz || isOtherTourmaline ? 0.45 : 1),
          color: isEmerald
            ? (activeGemId === "esmeralda_1" ? 0x22dfa3 : activeGemId === "esmeralda_2" ? 0x4fd5b3 : activeGemId === "esmeralda_3" ? 0x19d597 : activeGemId === "esmeralda_inclusiones" ? 0x09e09d : emeraldProfile?.color ?? 0x05683d)
            : rubyProfile?.color ?? sapphireProfile?.color ?? (family === "diamante"
              ? selectedCatalogDiamondColor
              : resolveAurumCatalogGemBvhColor(materials[0], isEmerald ? 0x05683d : isRuby ? 0x9b001b : isSapphire ? 0x123c9a : isAmethyst ? 0x7650b9 : isAquamarine ? 0x72c9df : isCitrine ? 0xd49a22 : isBlueTopaz ? 0x65b9e8 : isImperialTopaz ? (activeGemId.includes("topacio_imperial_minas") ? 0xd88943 : 0xd79b4b) : isParaibaTourmaline ? (activeGemId === "turmalina_paraiba" ? 0x00cfc3 : activeGemId.includes("mozambique") ? 0x27d4cf : activeGemId.includes("etiopia") ? 0x3ad9d1 : 0x19d6d0) : isTanzanite ? 0x5140a8 : isMoissanite ? 0xf4f8ff : 0xffffff)),
          reflectivity: family === "diamante" ? Number(diamondSourceParameters?.reflectivity ?? (isWhiteDiamondProfile ? 0.5 : 0.46)) : isEmerald
            ? (activeGemId === "esmeralda_2" ? 0.31 : activeGemId === "esmeralda_1" || activeGemId === "esmeralda_3" || activeGemId === "esmeralda_inclusiones" ? 0.5 : emeraldProfile?.reflectivity ?? 0.16)
            : rubyProfile?.reflectivity ?? sapphireProfile?.reflectivity ?? (isEmerald ? 0.26 : isRuby ? 0.38 : isSapphire ? 0.38 : isAmethyst ? 0.32 : isAquamarine ? 0.30 : isCitrine ? 0.30 : isBlueTopaz ? 0.30 : isImperialTopaz ? 0.30 : isParaibaTourmaline ? (activeGemId === "turmalina_paraiba" ? 0.38 : 0.32) : isTanzanite ? 0.32 : isMoissanite ? 0.48 : isZircon ? 0.36 : isSpinel || isGarnet || isPeridot || isMorganite || isChrysoberyl || isQuartz || isOtherTourmaline ? 0.30 : 0.46),
          gamma: family === "diamante" ? Number(diamondSourceParameters?.gammaFactor ?? (isWhiteDiamondProfile ? 1 : isPinkDiamond ? 0.90 : 1.09)) : 1.09,
          geometryFactor: initialDiamondGeometryFactor,
          squashFactor: initialDiamondSquashFactor,
          diamondOrientedEnvMap: Number(diamondSourceParameters?.diamondOrientedEnvMap ?? 0),
          // Every diamond starts with the same EXR orientation. Later global
          // environment rotation is applied uniformly through updateEnvironment().
          // Per-mesh family offsets must not rotate melee stones away from the center.
          environmentRotationRadians: family === "diamante"
            ? meshEnvironmentAlignment.rotationRadians + sourceEnvironmentOffset
            : Number(currentMaterial?.userData?.aurumGemEnvironmentRotation ?? 0),
          ...(family === "diamante" ? { environmentRotationEuler: getAurumDiamondEnvironmentRotationEuler(meshEnvironmentAlignment.rotationRadians + sourceEnvironmentOffset, meshEnvironmentAlignment.correctionQuaternion) } : {}),
        });
        let baseDiamondEnvironmentIntensity = prepared.diagnostics.environmentIntensity;
        let baseDiamondReflectivity = family === "diamante" ? Number(diamondSourceParameters?.reflectivity ?? (isWhiteDiamondProfile ? 0.5 : 0.46)) : (prepared.material as any).reflectivity ?? 0.46;
        let baseDiamondGamma = family === "diamante" ? Number(diamondSourceParameters?.gammaFactor ?? (isWhiteDiamondProfile ? 1 : isPinkDiamond ? 0.90 : 1.09)) : 1.09;
        const initialDiamondProfileBaseline: AurumDiamondOpticalProfileBaseline = {
          profileId: activeGemId,
          dispersion: baseDiamondDispersion,
          environmentIntensity: baseDiamondEnvironmentIntensity,
          reflectivity: baseDiamondReflectivity,
          gamma: baseDiamondGamma,
          rgbBoost: initialRgbBoost ?? [1, 1, 1],
          geometryFactor: initialDiamondGeometryFactor,
          squashFactor: initialDiamondSquashFactor,
          absorptionFactor: initialDiamondAbsorptionFactor,
          transmission: initialDiamondTransmission,
        };
        const isProtectedCenter = () => Boolean(
          mesh.userData?.aurumDiamondMicroCenterProtected
          || isAurumDiamondBvhCenterTarget(mesh)
        );
        let currentDiamondTier: "micro" | "small" | "medium" | "brilliant" = screenTier;
        let entryGemId = activeGemId;
        let currentRayBounces = prepared.diagnostics.rayBounces;
        let currentDiamondDispersion = baseDiamondDispersion;
        let currentDiamondEnvironmentIntensity = baseDiamondEnvironmentIntensity;
        let currentDiamondReflectivity = baseDiamondReflectivity;
        let currentDiamondGamma = baseDiamondGamma;
        const applyDiamondTierOptics = (requestedTier: "micro" | "small" | "medium" | "brilliant") => {
          if (family !== "diamante" || !packageApi.setDiamondOptions) return;
          // Apply the complete tier to the BVH material, not only its dispersion.
          // The protected center always receives exact 1:1 calibrated values.
          const effectiveTier = isProtectedCenter() ? "brilliant" : requestedTier;
          const profile = getAurumDiamondMicroOpticalProfile(effectiveTier);
          const dispersion = baseDiamondDispersion * profile.dispersionScale;
          const environmentIntensity = baseDiamondEnvironmentIntensity * profile.environmentIntensityScale;
          // Reflectivity and gamma are calibrated profile controls, not size
          // compensation. Keep their exact catalog values across MICRO/SMALL/
          // MEDIUM/BRILLIANT; size tiers continue to scale dispersion and energy.
          const reflectivity = baseDiamondReflectivity;
          const gamma = baseDiamondGamma;
          packageApi.setDiamondOptions(prepared.material, {
            dispersion,
            environmentIntensity,
            reflectivity,
            gamma,
          });
          currentDiamondDispersion = dispersion;
          currentDiamondEnvironmentIntensity = environmentIntensity;
          currentDiamondReflectivity = reflectivity;
          currentDiamondGamma = gamma;
          currentDiamondTier = effectiveTier;
        };
        const retainedPhysicalMaterial = mesh.material;
        entries.set(mesh, {
          originalMaterial: retainedPhysicalMaterial,
          experimentalMaterial: prepared.material,
          family,
          // Keep the cache identity synchronized with in-place profile changes.
          // The same mesh + BVH shader remains valid across diamond-to-diamond
          // catalog switches; a stale captured gemId would force release/rebuild.
          get gemId() { return entryGemId; },
          activeGemFamily,
          originalDiamondOpticalFamily: mesh.userData?.aurumDiamondOpticalFamily,
          get baseEnvironmentIntensity() { return baseDiamondEnvironmentIntensity; },
          environmentRotationOffsetRadians: meshEnvironmentAlignment.offsetRadians,
          environmentRotationCorrection: meshEnvironmentAlignment.correctionQuaternion,
          get tier() { return currentDiamondTier; },
          setTier: (nextTier: "micro" | "small" | "medium" | "brilliant") => {
            if (family !== "diamante") return;
            applyDiamondTierOptics(nextTier);
          },
          setSourceDispersion: (nextDispersion: number) => {
            if (family !== "diamante") return;
            const next = Math.max(0, Math.min(0.1, Number(nextDispersion) || 0));
            if (next === baseDiamondDispersion) return;
            baseDiamondDispersion = next;
            applyDiamondTierOptics(currentDiamondTier);
          },
          setColor: (nextColor: number) => {
            if (family !== "diamante" || !Number.isFinite(Number(nextColor))) return;
            setAurumBvhShaderColor(prepared.material, Number(nextColor));
          },
          setProfile: (nextProfile: any) => {
            if (family !== "diamante" || !nextProfile) return;
            const parameters = nextProfile.diamondMaterialParameters ?? {};
            const nextColor = Number(nextProfile.color ?? 0xffffff);
            const profileId = String(nextProfile.id ?? "");
            const resolvedOptics = resolveAurumDiamondProfileOptics(nextProfile, initialDiamondProfileBaseline);
            const nextDispersion = resolvedOptics.dispersion;
            const nextEnvironmentIntensity = resolvedOptics.environmentIntensity;
            const isWhiteDiamondProfile = ["diamante_natural", "diamante_vs", "diamante_inclusiones"].includes(profileId);
            const nextReflectivity = isWhiteDiamondProfile ? 0.5 : resolvedOptics.reflectivity;
            const nextGamma = isWhiteDiamondProfile ? 1 : resolvedOptics.gamma;
            // Preserve the established blue/pink response; all other profiles
            // use their explicit catalog boost or a neutral/profile baseline.
            const boost = profileId === "diamante_azul" ? [2, 2, 2]
              : profileId === "diamante_rosa" ? [1.3, 1, 1]
              : resolvedOptics.rgbBoost;
            const transmission = resolvedOptics.transmission;
            const geometryFactor = resolvedOptics.geometryFactor;
            const squashFactor = resolvedOptics.squashFactor;
            const absorption = resolvedOptics.absorptionFactor;
            const ior = Math.max(1, Number(parameters.refractiveIndex ?? nextProfile.ior ?? 2.6));
            const attenuationColor = Number(nextProfile.attenuationColor ?? nextColor);
            const attenuationDistance = Math.max(0.1, Number(nextProfile.attenuationDistance ?? 100));
            baseDiamondDispersion = nextDispersion;
            baseDiamondEnvironmentIntensity = nextEnvironmentIntensity;
            baseDiamondReflectivity = nextReflectivity;
            baseDiamondGamma = nextGamma;
            const retainedMaterials = Array.isArray(retainedPhysicalMaterial) ? retainedPhysicalMaterial : [retainedPhysicalMaterial];
            retainedMaterials.forEach((material: any) => {
              if (!material) return;
              material.color?.setHex(nextColor);
              material.envMapIntensity = nextEnvironmentIntensity;
              material.dispersion = nextDispersion;
              material.transmission = transmission;
              material.ior = ior;
              material.attenuationColor?.setHex(attenuationColor);
              material.attenuationDistance = attenuationDistance;
              material.userData = {
                ...(material.userData ?? {}),
                aurumGemFamily: "Diamante",
                aurumDiamondCatalogProfile: profileId,
                aurumDiamondCatalogColor: nextColor,
                aurumIJEWELParameters: {
                  ...(material.userData?.aurumIJEWELParameters ?? {}),
                  ...parameters,
                  color: nextColor,
                  dispersion: nextDispersion,
                  reflectivity: nextReflectivity,
                  gammaFactor: nextGamma,
                  absorptionFactor: absorption,
                  geometryFactor,
                  squashFactor,
                  transmission,
                  transmissionParameter: transmission,
                  boostFactors: { x: boost[0], y: boost[1], z: boost[2] },
                },
              };
              material.needsUpdate = true;
            });
            setAurumBvhShaderColor(prepared.material, nextColor);
            // Replace the complete mutable shader state in one call. In
            // particular rgbBoost must be written even when neutral, otherwise
            // the previous colored profile can leak into the next white profile.
            packageApi.setDiamondOptions?.(prepared.material, {
              dispersion: nextDispersion,
              environmentIntensity: nextEnvironmentIntensity,
              reflectivity: nextReflectivity,
              gamma: nextGamma,
              transmission,
              ior,
              absorption,
              // Keep geometric facet normals intact; Geometry Factor has its own BVH uniform.
              facetSharpness: 1,
              rgbBoost: boost,
            });
            setAurumDiamondBvhOpticalParameters(prepared.material, {
              geometryFactor,
              squashFactor,
              absorptionFactor: absorption,
              transmission,
            });
            entryGemId = profileId;
            applyDiamondTierOptics(currentDiamondTier);
            if (diamondRgbAuditEnabled) {
              console.info("[AURUM][DIAMOND][OPTICS_PROFILE_SYNC]", {
              mesh: mesh.name || mesh.uuid,
              profileId,
              tier: currentDiamondTier,
              centerProtected: isProtectedCenter(),
              requested: {
                envMapIntensity: nextEnvironmentIntensity,
                dispersion: nextDispersion,
                reflectivity: nextReflectivity,
                gamma: nextGamma,
                ior,
                transmission,
                absorption,
                absorptionFactor: absorption,
                geometryFactor,
                squashFactor,
                rgbBoost: boost,
              },
              effectiveShader: {
                ...readAurumDiamondShaderAudit(prepared.material),
                rgbBoost: readAurumDiamondRgbBoost(prepared.material),
              },
              retainedPhysical: retainedMaterials.map((material: any) => ({
                envMapIntensity: material?.envMapIntensity ?? null,
                dispersion: material?.dispersion ?? null,
                reflectivity: material?.userData?.aurumIJEWELParameters?.reflectivity ?? null,
                gamma: material?.userData?.aurumIJEWELParameters?.gammaFactor ?? null,
                ior: material?.ior ?? null,
                transmission: material?.transmission ?? null,
                geometryFactor: material?.userData?.aurumIJEWELParameters?.geometryFactor ?? null,
                squashFactor: material?.userData?.aurumIJEWELParameters?.squashFactor ?? null,
                absorptionFactor: material?.userData?.aurumIJEWELParameters?.absorptionFactor ?? null,
                rgbBoost: material?.userData?.aurumIJEWELParameters?.boostFactors ?? null,
              })),
            });
            }
          },
          setQuality: (quality) => {
            if (!packageApi.setDiamondOptions) return;
            if (family === "diamante") {
              // One source of truth: the requested BVH quality determines
              // internal ray bounces for every diamond, regardless of size or color.
              const rayBounces = diamondSourceParameters
                ? Math.max(1, Math.min(8, Math.floor(Number(diamondSourceParameters.rayBounces ?? 5))))
                : quality === "final" ? 5 : quality === "high" ? 4 : 3;
              packageApi.setDiamondOptions(prepared.material, { rayBounces });
              currentRayBounces = rayBounces;
              console.info("[AURUM][DIAMOND][BVH_QUALITY_UPDATED]", {
                mesh: mesh.name || mesh.uuid,
                tier: currentDiamondTier,
                quality,
                rayBounces: currentRayBounces,
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
        // Apply the initial screen-size optical tier immediately. This is also
        // used after Micro Pipeline is re-enabled, while protected centers remain 1:1.
        applyDiamondTierOptics(screenTier);
        // Apply the catalog-specific quality immediately when the BVH material is
        // created. Without this call, setQuality only runs during later quality
        // transitions, leaving emeralds at the shader package's generic default.
        entries.get(mesh)?.setQuality(family === "diamante" ? "high" : (options.quality ?? "interactive"));
        if (family === "diamante") {
          if (diamondRgbAuditEnabled) {
            console.info("[AURUM][DIAMOND][OPTICS_INITIAL]", {
              mesh: mesh.name || mesh.uuid,
              profileId: activeGemId,
              tier: currentDiamondTier,
              centerProtected: isProtectedCenter(),
              requested: {
                envMapIntensity: baseDiamondEnvironmentIntensity,
                dispersion: baseDiamondDispersion,
                reflectivity: baseDiamondReflectivity,
                gamma: baseDiamondGamma,
                ior: prepared.diagnostics.ior,
                geometryFactor: initialDiamondGeometryFactor,
                squashFactor: initialDiamondSquashFactor,
                absorptionFactor: initialDiamondAbsorptionFactor,
                transmission: initialDiamondTransmission,
                rayBounces: prepared.diagnostics.rayBounces,
                rgbBoost: initialRgbBoost ?? "package-default",
              },
              effectiveShader: {
                ...readAurumDiamondShaderAudit(prepared.material),
                rgbBoost: readAurumDiamondRgbBoost(prepared.material),
              },
              retainedPhysical: retainedMaterials.map((material: any) => ({
                envMapIntensity: material?.envMapIntensity ?? null,
                dispersion: material?.dispersion ?? null,
                reflectivity: material?.userData?.aurumIJEWELParameters?.reflectivity ?? null,
                gamma: material?.userData?.aurumIJEWELParameters?.gammaFactor ?? null,
                ior: material?.ior ?? null,
                transmission: material?.transmission ?? null,
                rgbBoost: material?.userData?.aurumIJEWELParameters?.boostFactors ?? null,
              })),
            });
          }
          diamondOpticalDiagnostics.push({
            mesh: mesh.name || mesh.uuid,
            gemId: activeGemId,
            tier: currentDiamondTier,
            opticalProfile: !isBlueDiamond && !isPinkDiamond
              ? calibrateSecondaryDiamond ? (diamondSourceParameters ? "catalog-dmat-secondary-profile" : "white-secondary-size-calibrated") : "white-shared-center-profile"
              : isBlueDiamond ? "blue-calibrated" : "pink-calibrated",
            ior: prepared.diagnostics.ior,
            transmission: !isBlueDiamond && !isPinkDiamond ? 0 : 0.05,
            dispersion: currentDiamondDispersion,
            gamma: currentDiamondGamma,
            reflectivity: currentDiamondReflectivity,
            environmentIntensity: currentDiamondEnvironmentIntensity,
            rayBounces: currentRayBounces,
            environmentTextureUuid: environmentMap?.uuid ?? null,
          });
          console.info("[AURUM][DIAMOND][BVH_QUALITY_APPLIED]", {
            mesh: mesh.name || mesh.uuid,
            tier: currentDiamondTier,
            quality: "high",
            rayBounces: currentRayBounces,
            environmentRotationRadians: 0,
          });
        }
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

    // Apply compensation using the geometry-derived table frame, not Euler Y.
    const perDiamondAlignment = [...entries.entries()]
      .filter(([, entry]) => entry.family === "diamante")
      .map(([mesh, entry]) => {
        const alignment = getMeshEnvironmentRotation(mesh);
        entry.environmentRotationOffsetRadians = alignment.offsetRadians;
        entry.environmentRotationCorrection = alignment.correctionQuaternion;
        packageApi.setDiamondEnvironmentRotation?.(entry.experimentalMaterial, alignment.rotationEuler);
        return {
          mesh: mesh.name || mesh.uuid,
          relativeOpticalRotationRadians: alignment.offsetRadians,
          appliedRotationRadians: alignment.rotationRadians,
          opticalAxisAlignmentDegrees: alignment.opticalAxisAlignmentDegrees,
          inPlaneTwistDegrees: alignment.inPlaneTwistDegrees,
          correctionQuaternion: alignment.correctionQuaternion,
          tableNormalWorld: alignment.tableNormal,
          inPlaneReferenceWorld: alignment.referenceAxis,
          localNormalAxis: alignment.localNormalAxis,
          localReferenceAxis: alignment.localReferenceAxis,
          frameValid: alignment.frameValid,
        };
      });
    console.info("[AURUM][DIAMOND][CENTER_RELATIVE_EXR_ALIGNMENT]", {
      referenceMesh: centerReferenceMesh?.name || centerReferenceMesh?.uuid || null,
      referenceTableNormalWorld: centerOpticalFrame?.worldNormal.toArray() ?? null,
      referenceInPlaneAxisWorld: centerOpticalFrame?.worldReference.toArray() ?? null,
      referenceFrameValid: Boolean(centerOpticalFrame),
      requestedRotationRadians: requestedEnvironmentRotationRadians,
      alignedDiamondMeshes: perDiamondAlignment.length,
      perDiamondAlignment,
    });
  };

  return {
    refresh,
    refreshTargets(model, targets) {
      if (!targets?.length) return;
      refresh(model, targets);
    },
    setDiamondDispersion(targets, dispersion) {
      if (disposed || !targets?.length) return;
      const selected = new Set(targets);
      for (const [mesh, entry] of entries) {
        if (selected.has(mesh) && entry.family === "diamante") entry.setSourceDispersion(dispersion);
      }
    },
    setDiamondColor(targets, color) {
      if (disposed || !targets?.length || !Number.isFinite(Number(color))) return;
      const selected = new Set(targets);
      for (const [mesh, entry] of entries) {
        if (selected.has(mesh) && entry.family === "diamante") entry.setColor(Number(color));
      }
    },
    setDiamondProfile(targets, profile) {
      if (disposed || !targets?.length || !profile) return;
      const selected = new Set(targets);
      for (const [mesh, entry] of entries) {
        if (selected.has(mesh) && entry.family === "diamante") entry.setProfile(profile);
      }
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
        if ((nextTier === "micro" || nextTier === "small" || nextTier === "medium" || nextTier === "brilliant") && nextTier !== entry.tier) {
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
      const requestedRotation = Number.isFinite(rotationRadians) ? rotationRadians : 0;
      for (const entry of entries.values()) {
        const rotationEuler = entry.family === "diamante"
          ? getAurumDiamondEnvironmentRotationEuler(
              requestedRotation,
              entry.environmentRotationCorrection,
            )
          : { x: 0, y: THREE_NS.MathUtils.radToDeg(requestedRotation), z: 0 };
        packageApi.setDiamondEnvironmentRotation?.(entry.experimentalMaterial, rotationEuler);
        const tierProfile = entry.family === "diamante"
          ? getAurumDiamondMicroOpticalProfile(entry.tier)
          : null;
        packageApi.setDiamondOptions?.(entry.experimentalMaterial, {
          environmentIntensity: Math.max(0, Math.min(2.5,
            entry.baseEnvironmentIntensity * safeScale * (tierProfile?.environmentIntensityScale ?? 1)
          )),
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
        diamondOpticalDiagnostics: [...diamondOpticalDiagnostics],
        centerTargetDiagnostics: [...centerTargetDiagnostics],
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
