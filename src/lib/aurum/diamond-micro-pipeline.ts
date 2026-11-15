import * as THREE from "three";

export type AurumDiamondMicroTier = "micro" | "small" | "brilliant" | "mixed";


export type AurumDiamondMicroOpticalProfile = {
  scintillationScale: number;
  facetContrastScale: number;
  dispersionScale: number;
  virtualFacetWeight: number;
  fireScale: number;
};

/** Per-stone live optics. Brilliant stones (including the protected center) retain the calibrated baseline. */
export function getAurumDiamondMicroOpticalProfile(tier: Exclude<AurumDiamondMicroTier, "mixed">): AurumDiamondMicroOpticalProfile {
  if (tier === "micro") return { scintillationScale: 0.58, facetContrastScale: 0.84, dispersionScale: 0.94, virtualFacetWeight: 0.025, fireScale: 0.76 };
  if (tier === "small") return { scintillationScale: 0.80, facetContrastScale: 0.92, dispersionScale: 0.98, virtualFacetWeight: 0.045, fireScale: 0.90 };
  return { scintillationScale: 1, facetContrastScale: 1, dispersionScale: 1, virtualFacetWeight: 0.06, fireScale: 1 };
}

export type AurumDiamondMicroProfile = {
  tier: AurumDiamondMicroTier;
  minDiameterPx: number;
  maxDiameterPx: number;
  medianDiameterPx: number;
  meshCount: number;
  sharedAcrossTiers: boolean;
};

export function classifyAurumDiamondScreenSize(diameterPx: number): Exclude<AurumDiamondMicroTier, "mixed"> {
  const px = Number.isFinite(diameterPx) ? Math.max(0, diameterPx) : 0;
  if (px <= 12) return "micro";
  if (px <= 36) return "small";
  return "brilliant";
}

export function getAurumDiamondProjectedDiameterPx(mesh: any, camera: any, viewportHeight: number): number {
  if (!mesh?.geometry || !camera || !Number.isFinite(viewportHeight) || viewportHeight <= 0) return 0;
  const geometry = mesh.geometry;
  if (!geometry.boundingSphere) geometry.computeBoundingSphere?.();
  const sphere = geometry.boundingSphere;
  if (!sphere) return 0;
  mesh.updateWorldMatrix?.(true, false);
  camera.updateWorldMatrix?.(true, false);
  const center = sphere.center.clone().applyMatrix4(mesh.matrixWorld);
  const scale = mesh.getWorldScale ? mesh.getWorldScale(new THREE.Vector3()) : new THREE.Vector3(1, 1, 1);
  const radius = sphere.radius * Math.max(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z));
  if (!Number.isFinite(radius) || radius <= 0) return 0;

  if (camera.isOrthographicCamera) {
    const worldHeight = Math.abs(Number(camera.top) - Number(camera.bottom));
    return worldHeight > 0 ? (2 * radius * viewportHeight) / worldHeight : 0;
  }

  const distance = Math.max(1e-5, center.distanceTo(camera.getWorldPosition(new THREE.Vector3())));
  const fov = THREE.MathUtils.degToRad(Number(camera.fov ?? 50));
  return (radius * viewportHeight) / (distance * Math.tan(fov / 2));
}

function getMaterials(mesh: any): any[] {
  return (Array.isArray(mesh?.material) ? mesh.material : [mesh?.material]).filter(Boolean);
}

function isDiamondMaterial(material: any): boolean {
  const family = String(material?.userData?.aurumGemFamily ?? "").trim().toLowerCase();
  const name = String(material?.name ?? "").trim().toLowerCase();
  return family === "diamante" || Boolean(material?.userData?.aurumDiamondMaterial)
    || /diamond|diamante/.test(name);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

/**
 * Per-stone screen-space optics for diamonds. The renderer applies the selected
 * profile through material uniform references in each mesh's onBeforeRender.
 * Shared materials remain shared; no geometry, normals, BVH or metal state changes.
 */
export function createAurumDiamondMicroPipeline(scene: any, camera: any, getViewportHeight: () => number) {
  const meshes: any[] = [];
  scene?.traverse?.((object: any) => {
    if (!object?.isMesh || !object.geometry) return;
    if (getMaterials(object).some(isDiamondMaterial)) meshes.push(object);
  });

  let lastSignature = "";
  let lastReport: AurumDiamondMicroProfile[] = [];
  const originalCallbacks = new Map<any, (...args: any[]) => void>();

  const applyMeshOptics = (mesh: any) => {
    const tier = (mesh.userData?.aurumDiamondMicroTier ?? "brilliant") as Exclude<AurumDiamondMicroTier, "mixed">;
    const profile = getAurumDiamondMicroOpticalProfile(tier);
    for (const material of getMaterials(mesh)) {
      if (!isDiamondMaterial(material)) continue;
      const uniforms = material.userData?.aurumDiamondMicroUniforms;
      if (!uniforms) continue;
      if (uniforms.scintillationStrength) uniforms.scintillationStrength.value = uniforms.baseScintillationStrength * profile.scintillationScale;
      if (uniforms.facetContrast) uniforms.facetContrast.value = uniforms.baseFacetContrast * profile.facetContrastScale;
      if (uniforms.dispersion) uniforms.dispersion.value = uniforms.baseDispersion * profile.dispersionScale;
      if (uniforms.virtualFacetWeight) uniforms.virtualFacetWeight.value = tier === "brilliant" ? uniforms.baseVirtualFacetWeight : profile.virtualFacetWeight;
      if (uniforms.fireScale) uniforms.fireScale.value = profile.fireScale;
    }
    mesh.userData = { ...(mesh.userData ?? {}), aurumDiamondMicroOpticalProfile: profile };
  };

  for (const mesh of meshes) {
    const original = typeof mesh.onBeforeRender === "function" ? mesh.onBeforeRender : () => {};
    originalCallbacks.set(mesh, original);
    mesh.onBeforeRender = (...args: any[]) => {
      original.apply(mesh, args);
      applyMeshOptics(mesh);
    };
  }

  const update = () => {
    const viewportHeight = Number(getViewportHeight?.() ?? 0);
    if (!Number.isFinite(viewportHeight) || viewportHeight < 2 || !meshes.length) return lastReport;
    const byMaterial = new Map<any, number[]>();
    const projected = meshes.map(mesh => ({ mesh, diameter: getAurumDiamondProjectedDiameterPx(mesh, camera, viewportHeight) }));
    const sortedDiameters = projected.map(item => item.diameter).sort((a, b) => b - a);
    const largest = sortedDiameters[0] ?? 0;
    const secondLargest = sortedDiameters[1] ?? 0;
    const hasDistinctCenter = projected.length === 1 || (largest > 12 && largest > Math.max(secondLargest, 0.01) * 1.35);
    const centerMesh = projected.find(item => item.diameter === largest)?.mesh;

    for (const { mesh, diameter } of projected) {
      const explicitlyProtected = Boolean(mesh.userData?.aurumDiamondCenter || mesh.userData?.aurumDiamondIsCenter)
        || /center|central|main|principal/i.test(String(mesh.userData?.aurumDiamondRole ?? ""));
      const isProtectedCenter = explicitlyProtected || (hasDistinctCenter && mesh === centerMesh);
      const tier = isProtectedCenter ? "brilliant" : classifyAurumDiamondScreenSize(diameter);
      mesh.userData = {
        ...(mesh.userData ?? {}),
        aurumDiamondMicroScreenDiameterPx: Number(diameter.toFixed(2)),
        aurumDiamondMicroTier: tier,
        aurumDiamondMicroCenterProtected: isProtectedCenter,
      };
      for (const material of getMaterials(mesh)) {
        if (!isDiamondMaterial(material)) continue;
        const values = byMaterial.get(material) ?? [];
        values.push(diameter);
        byMaterial.set(material, values);
      }
    }

    const report: AurumDiamondMicroProfile[] = [];
    for (const [material, sizes] of byMaterial) {
      let min = Number.POSITIVE_INFINITY;
      let max = 0;
      for (const size of sizes) {
        min = Math.min(min, size);
        max = Math.max(max, size);
      }
      const mid = median(sizes);
      const minTier = classifyAurumDiamondScreenSize(min);
      const maxTier = classifyAurumDiamondScreenSize(max);
      const sharedAcrossTiers = minTier !== maxTier && max / Math.max(min, 0.01) > 2.5;
      report.push({
        tier: sharedAcrossTiers ? "mixed" : classifyAurumDiamondScreenSize(mid),
        minDiameterPx: Number(min.toFixed(2)),
        maxDiameterPx: Number(max.toFixed(2)),
        medianDiameterPx: Number(mid.toFixed(2)),
        meshCount: sizes.length,
        sharedAcrossTiers,
      });
      material.userData = {
        ...(material.userData ?? {}),
        aurumDiamondMicroProfile: report[report.length - 1],
      };
    }

    const signature = report.map(item => [item.tier, item.meshCount, Math.round(item.medianDiameterPx)].join(":")).sort().join("|");
    if (signature && signature !== lastSignature) {
      lastSignature = signature;
      lastReport = report;
      console.info("[AURUM][DIAMOND MICRO PIPELINE][PROFILE]", {
        viewportHeight,
        diamondMeshes: meshes.length,
        materialGroups: report.length,
        tiers: report.reduce((acc: Record<string, number>, item) => {
          acc[item.tier] = (acc[item.tier] ?? 0) + item.meshCount;
          return acc;
        }, {}),
        sharedAcrossTiers: report.filter(item => item.sharedAcrossTiers).length,
        report,
        mode: "per-mesh optical uniforms; shared materials retained",
      });
    } else {
      lastReport = report;
    }
    return report;
  };

  return {
    update,
    diagnostics: () => ({ diamondMeshes: meshes.length, materialGroups: lastReport.length, profiles: lastReport }),
    dispose: () => {
      for (const mesh of meshes) {
        const original = originalCallbacks.get(mesh);
        if (original) mesh.onBeforeRender = original;
        if (mesh.userData) {
          delete mesh.userData.aurumDiamondMicroScreenDiameterPx;
          delete mesh.userData.aurumDiamondMicroTier;
          delete mesh.userData.aurumDiamondMicroCenterProtected;
          delete mesh.userData.aurumDiamondMicroOpticalProfile;
        }
      }
      for (const mesh of meshes) {
        for (const material of getMaterials(mesh)) {
          const uniforms = material.userData?.aurumDiamondMicroUniforms;
          if (!uniforms) continue;
          if (uniforms.scintillationStrength) uniforms.scintillationStrength.value = uniforms.baseScintillationStrength;
          if (uniforms.facetContrast) uniforms.facetContrast.value = uniforms.baseFacetContrast;
          if (uniforms.dispersion) uniforms.dispersion.value = uniforms.baseDispersion;
          if (uniforms.virtualFacetWeight) uniforms.virtualFacetWeight.value = uniforms.baseVirtualFacetWeight;
          if (uniforms.fireScale) uniforms.fireScale.value = 1;
        }
      }
      originalCallbacks.clear();
      meshes.length = 0;
      lastReport = [];
      lastSignature = "";
    },
  };
}
