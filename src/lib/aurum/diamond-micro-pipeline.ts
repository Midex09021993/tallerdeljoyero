import * as THREE from "three";

export type AurumDiamondMicroTier = "micro" | "small" | "medium" | "brilliant" | "mixed";


export type AurumDiamondMicroOpticalProfile = {
  scintillationScale: number;
  facetContrastScale: number;
  dispersionScale: number;
  virtualFacetWeight: number;
  fireScale: number;
  /** BVH controls supported by realistic-diamond-shader. */
  environmentIntensityScale: number;
  reflectivityScale: number;
  gammaScale: number;
};

/** Per-stone live optics. Brilliant stones (including the protected center) retain the calibrated baseline. */
export function getAurumDiamondMicroOpticalProfile(tier: Exclude<AurumDiamondMicroTier, "mixed">): AurumDiamondMicroOpticalProfile {
  // Secondary melee keeps the same neutral-white identity as the center.
  // Size tiers stabilize fine sparkle/contrast without suppressing the source
  // dispersion or darkening the stones into a grey appearance.
  if (tier === "micro") return { scintillationScale: 0.78, facetContrastScale: 0.96, dispersionScale: 0.88, virtualFacetWeight: 0.06, fireScale: 0.88, environmentIntensityScale: 0.98, reflectivityScale: 0.96, gammaScale: 1.01 };
  if (tier === "small") return { scintillationScale: 0.86, facetContrastScale: 0.98, dispersionScale: 0.92, virtualFacetWeight: 0.06, fireScale: 0.92, environmentIntensityScale: 0.99, reflectivityScale: 0.98, gammaScale: 1.005 };
  if (tier === "medium") return { scintillationScale: 0.94, facetContrastScale: 0.99, dispersionScale: 0.96, virtualFacetWeight: 0.06, fireScale: 0.97, environmentIntensityScale: 1, reflectivityScale: 0.99, gammaScale: 1 };
  return { scintillationScale: 1, facetContrastScale: 1, dispersionScale: 1, virtualFacetWeight: 0.06, fireScale: 1, environmentIntensityScale: 1, reflectivityScale: 1, gammaScale: 1 };
}

export type AurumDiamondMicroProfile = {
  tier: AurumDiamondMicroTier;
  minDiameterPx: number;
  maxDiameterPx: number;
  medianDiameterPx: number;
  meshCount: number;
  sharedAcrossTiers: boolean;
};

export function classifyAurumDiamondScreenSize(
  diameterPx: number,
  referenceDiameterPx = 0,
  includeMediumTier = false,
): Exclude<AurumDiamondMicroTier, "mixed"> {
  const px = Number.isFinite(diameterPx) ? Math.max(0, diameterPx) : 0;
  const reference = Number.isFinite(referenceDiameterPx) ? Math.max(0, referenceDiameterPx) : 0;
  if (px <= 12) return "micro";
  // Secondary melee can exceed the absolute 36px threshold at close camera
  // distances. Classify it relative to a clearly dominant center stone too.
  if (px <= 36 || (reference > px && px <= reference * 0.35)) return "small";
  if (includeMediumTier && (px <= 72 || (reference > px && px <= reference * 0.65))) return "medium";
  return "brilliant";
}

/**
 * Hysteresis for live zoom/orbit classification. Separate enter/exit thresholds
 * prevent a stone hovering at a boundary from switching optical profiles every frame.
 */
export function stabilizeAurumDiamondScreenTier(
  diameterPx: number,
  previousTier?: Exclude<AurumDiamondMicroTier, "mixed">,
  referenceDiameterPx = 0,
  includeMediumTier = false,
): Exclude<AurumDiamondMicroTier, "mixed"> {
  const px = Number.isFinite(diameterPx) ? Math.max(0, diameterPx) : 0;
  const reference = Number.isFinite(referenceDiameterPx) ? Math.max(0, referenceDiameterPx) : 0;
  const relativeSmall = reference > px && px <= reference * 0.35;
  const relativeSmallExit = reference > px && px <= reference * 0.40;
  const relativeMedium = reference > px && px <= reference * 0.65;
  const relativeMediumExit = reference > px && px <= reference * 0.70;
  if (!previousTier) return classifyAurumDiamondScreenSize(px, reference, includeMediumTier);
  if (includeMediumTier) {
    if (previousTier === "micro") return px > 14 ? classifyAurumDiamondScreenSize(px, reference, true) : "micro";
    if (previousTier === "small") {
      if (px <= 10) return "micro";
      if (px > 40 && !relativeSmallExit) return px > 80 && !relativeMediumExit ? "brilliant" : "medium";
      return "small";
    }
    if (previousTier === "medium") {
      if (px <= 32 || relativeSmall) return "small";
      if (px > 80 && !relativeMediumExit) return "brilliant";
      return "medium";
    }
    if (px <= 10) return "micro";
    if (px <= 32 || relativeSmall) return "small";
    if (px <= 64 || relativeMedium) return "medium";
    return "brilliant";
  }
  if (previousTier === "micro") {
    if (px > 40 && !relativeSmall) return "brilliant";
    return px > 14 ? "small" : "micro";
  }
  if (previousTier === "small") {
    if (px <= 10) return "micro";
    return px > 40 && !relativeSmallExit ? "brilliant" : "small";
  }
  if (px <= 10) return "micro";
  if (px <= 32 || relativeSmall) return "small";
  return "brilliant";
}

/** Shared screen-space classification used by both the physical and BVH diamond paths. */
export function classifyAurumDiamondMeshTiers(
  meshes: readonly any[],
  camera: any,
  viewportHeight: number,
  includeMediumTier = false,
): Map<any, Exclude<AurumDiamondMicroTier, "mixed">> {
  const projected = meshes.map(mesh => ({
    mesh,
    diameter: getAurumDiamondProjectedDiameterPx(mesh, camera, viewportHeight),
  }));
  const sorted = projected.map(item => item.diameter).sort((a, b) => b - a);
  const largest = sorted[0] ?? 0;
  const secondLargest = sorted[1] ?? 0;
  const hasDistinctCenter = largest > 12 && largest > Math.max(secondLargest, 0.01) * 1.35;
  const centerMesh = projected.find(item => item.diameter === largest)?.mesh;
  const tiers = new Map<any, Exclude<AurumDiamondMicroTier, "mixed">>();
  for (const { mesh, diameter } of projected) {
    const explicitlyProtected = Boolean(mesh.userData?.aurumDiamondCenter || mesh.userData?.aurumDiamondIsCenter)
      || /center|central|main|principal/i.test(String(mesh.userData?.aurumDiamondRole ?? ""));
    const protectedCenter = explicitlyProtected || (hasDistinctCenter && mesh === centerMesh);
    tiers.set(mesh, protectedCenter ? "brilliant" : classifyAurumDiamondScreenSize(diameter, hasDistinctCenter ? largest : 0, includeMediumTier));
  }
  return tiers;
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

function isDiamondMaterial(material: any, mesh?: any): boolean {
  // The active catalog assignment exists before BVH publishes its optical marker.
  // Accept the same stable mesh identity used by Gem Mask so the screen-space
  // classifier can protect the center stone before the mask cache is synchronized.
  const data = mesh?.userData ?? {};
  const meshFamilies = [
    data.aurumDiamondOpticalFamily,
    data.aurumActiveGemFamily,
    data.aurumGemFamily,
  ].map((value: any) => String(value ?? "").trim().toLowerCase());
  const meshIds = [data.aurumActiveGemId, data.aurumGemId]
    .map((value: any) => String(value ?? "").trim().toLowerCase());
  const meshIsDiamond = meshFamilies.includes("diamante")
    || meshIds.some((value: string) => value.startsWith("diamante"));
  const family = String(material?.userData?.aurumGemFamily ?? "").trim().toLowerCase();
  const name = String(material?.name ?? "").trim().toLowerCase();
  return meshIsDiamond || family === "diamante" || Boolean(material?.userData?.aurumDiamondMaterial)
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
export function createAurumDiamondMicroPipeline(scene: any, camera: any, getViewportHeight: () => number, options: { includeMediumTier?: boolean } = {}) {
  const meshes: any[] = [];
  const originalCallbacks = new Map<any, { original: (...args: any[]) => void; wrapped: (...args: any[]) => void }>();

  let lastSignature = "";
  let lastReport: AurumDiamondMicroProfile[] = [];
  let enabled = true;
  const applyMeshOptics = (mesh: any) => {
    if (!enabled) return;
    const tier = (mesh.userData?.aurumDiamondMicroTier ?? "brilliant") as Exclude<AurumDiamondMicroTier, "mixed">;
    const profile = getAurumDiamondMicroOpticalProfile(tier);
    for (const material of getMaterials(mesh)) {
      if (!isDiamondMaterial(material, mesh)) continue;
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

  const refresh = () => {
    const currentDiamonds = new Set<any>();
    scene?.traverse?.((object: any) => {
      if (object?.isMesh && object.geometry && getMaterials(object).some((material) => isDiamondMaterial(material, object))) {
        currentDiamonds.add(object);
      }
    });

    for (const mesh of [...meshes]) {
      if (currentDiamonds.has(mesh)) continue;
      const callbacks = originalCallbacks.get(mesh);
      if (callbacks && mesh.onBeforeRender === callbacks.wrapped) {
        mesh.onBeforeRender = callbacks.original;
      }
      originalCallbacks.delete(mesh);
      const index = meshes.indexOf(mesh);
      if (index >= 0) meshes.splice(index, 1);
      if (mesh.userData) {
        delete mesh.userData.aurumDiamondMicroScreenDiameterPx;
        delete mesh.userData.aurumDiamondMicroTier;
        delete mesh.userData.aurumDiamondMicroCenterProtected;
        delete mesh.userData.aurumDiamondMicroOpticalProfile;
      }
    }

    for (const mesh of currentDiamonds) {
      if (originalCallbacks.has(mesh)) continue;
      const original = typeof mesh.onBeforeRender === "function" ? mesh.onBeforeRender : () => {};
      const wrapped = (...args: any[]) => {
        original.apply(mesh, args);
        applyMeshOptics(mesh);
      };
      originalCallbacks.set(mesh, { original, wrapped });
      mesh.onBeforeRender = wrapped;
      meshes.push(mesh);
    }
    lastSignature = "";
    return meshes.length;
  };

  refresh();

  const update = () => {
    const viewportHeight = Number(getViewportHeight?.() ?? 0);
    if (!enabled || !Number.isFinite(viewportHeight) || viewportHeight < 2 || !meshes.length) return lastReport;
    const byMaterial = new Map<any, Array<{ diameter: number; tier: Exclude<AurumDiamondMicroTier, "mixed"> }>>();
    const projected = meshes.map(mesh => ({ mesh, diameter: getAurumDiamondProjectedDiameterPx(mesh, camera, viewportHeight) }));
    const sortedDiameters = projected.map(item => item.diameter).sort((a, b) => b - a);
    const largest = sortedDiameters[0] ?? 0;
    const secondLargest = sortedDiameters[1] ?? 0;
    let sharedReferenceDiameter = 0;
    scene?.traverse?.((object: any) => {
      if (!object?.isMesh || !object.userData?.aurumGemOrientationReference) return;
      sharedReferenceDiameter = Math.max(
        sharedReferenceDiameter,
        getAurumDiamondProjectedDiameterPx(object, camera, viewportHeight),
      );
    });
    const referenceDiameter = sharedReferenceDiameter > 0 ? sharedReferenceDiameter : largest;
    const hasDistinctCenter = referenceDiameter > 12
      && referenceDiameter > Math.max(secondLargest, 0.01) * 1.35;
    const centerMesh = sharedReferenceDiameter > 0
      ? undefined
      : projected.find(item => item.diameter === largest)?.mesh;
    const relativeCenterDiameter = hasDistinctCenter ? referenceDiameter : 0;

    for (const { mesh, diameter } of projected) {
      const explicitlyProtected = Boolean(mesh.userData?.aurumDiamondCenter || mesh.userData?.aurumDiamondIsCenter)
        || /center|central|main|principal/i.test(String(mesh.userData?.aurumDiamondRole ?? ""));
      const isProtectedCenter = explicitlyProtected || (hasDistinctCenter && mesh === centerMesh);
      const previousTier = mesh.userData?.aurumDiamondMicroTier as Exclude<AurumDiamondMicroTier, "mixed"> | undefined;
      const tier = isProtectedCenter ? "brilliant" : stabilizeAurumDiamondScreenTier(diameter, previousTier, relativeCenterDiameter, options.includeMediumTier === true);
      mesh.userData = {
        ...(mesh.userData ?? {}),
        aurumDiamondMicroScreenDiameterPx: Number(diameter.toFixed(2)),
        aurumDiamondMicroTier: tier,
        aurumDiamondMicroCenterProtected: isProtectedCenter,
      };
      for (const material of getMaterials(mesh)) {
        // Pass the owning mesh so active catalog identity and Rhino layer metadata
        // participate in the same classification used during scene discovery.
        if (!isDiamondMaterial(material, mesh)) continue;
        const values = byMaterial.get(material) ?? [];
        values.push({ diameter, tier });
        byMaterial.set(material, values);
      }
    }

    const report: AurumDiamondMicroProfile[] = [];
    for (const [material, entries] of byMaterial) {
      let min = Number.POSITIVE_INFINITY;
      let max = 0;
      for (const entry of entries) {
        min = Math.min(min, entry.diameter);
        max = Math.max(max, entry.diameter);
      }
      const mid = median(entries.map(entry => entry.diameter));
      const distinctTiers = new Set(entries.map(entry => entry.tier));
      const sharedAcrossTiers = distinctTiers.size > 1;
      report.push({
        tier: sharedAcrossTiers ? "mixed" : (entries[0]?.tier ?? classifyAurumDiamondScreenSize(mid)),
        minDiameterPx: Number(min.toFixed(2)),
        maxDiameterPx: Number(max.toFixed(2)),
        medianDiameterPx: Number(mid.toFixed(2)),
        meshCount: entries.length,
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
    setEnabled(next: boolean) {
      const value = Boolean(next);
      if (enabled === value) return;
      enabled = value;
      if (!enabled) {
        for (const mesh of meshes) {
          // Publish the calibrated baseline tier as well as restoring shader uniforms.
          // The BVH runtime consumes this metadata on its next frame, so it must
          // not retain a stale MICRO/SMALL profile while this analyzer is paused.
          mesh.userData = {
            ...(mesh.userData ?? {}),
            aurumDiamondMicroTier: "brilliant",
            aurumDiamondMicroOpticalProfile: getAurumDiamondMicroOpticalProfile("brilliant"),
          };
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
      } else {
        lastSignature = "";
        update();
        meshes.forEach(applyMeshOptics);
      }
    },
    diagnostics: () => ({ enabled, diamondMeshes: meshes.length, materialGroups: lastReport.length, profiles: lastReport }),
    refresh,
    dispose: () => {
      for (const mesh of meshes) {
        const callbacks = originalCallbacks.get(mesh);
        if (callbacks && mesh.onBeforeRender === callbacks.wrapped) mesh.onBeforeRender = callbacks.original;
        if (mesh.userData) {
          // Keep a neutral tier marker after teardown: the BVH runtime may outlive
          // this analyzer and must not retain a stale MICRO/SMALL optical profile.
          mesh.userData.aurumDiamondMicroTier = "brilliant";
          mesh.userData.aurumDiamondMicroOpticalProfile = getAurumDiamondMicroOpticalProfile("brilliant");
          delete mesh.userData.aurumDiamondMicroScreenDiameterPx;
          delete mesh.userData.aurumDiamondMicroCenterProtected;
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
