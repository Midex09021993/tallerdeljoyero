import * as THREE from "three";

export type AurumDiamondMicroTier = "micro" | "small" | "brilliant" | "mixed";

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
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Screen-space analyzer for the dedicated micro-diamond pipeline.
 * It is diagnostic-only in this first stage: it never edits materials, normals,
 * metal pixels, BVH data, or the existing central-diamond optical calibration.
 */
export function createAurumDiamondMicroPipeline(scene: any, camera: any, getViewportHeight: () => number) {
  const meshes: any[] = [];
  scene?.traverse?.((object: any) => {
    if (!object?.isMesh || !object.geometry) return;
    if (getMaterials(object).some(isDiamondMaterial)) meshes.push(object);
  });

  let lastSignature = "";
  let lastReport: AurumDiamondMicroProfile[] = [];

  const update = () => {
    const viewportHeight = Number(getViewportHeight?.() ?? 0);
    if (!Number.isFinite(viewportHeight) || viewportHeight < 2 || !meshes.length) return lastReport;
    const byMaterial = new Map<any, number[]>();
    for (const mesh of meshes) {
      const diameter = getAurumDiamondProjectedDiameterPx(mesh, camera, viewportHeight);
      mesh.userData = {
        ...(mesh.userData ?? {}),
        aurumDiamondMicroScreenDiameterPx: Number(diameter.toFixed(2)),
        aurumDiamondMicroTier: classifyAurumDiamondScreenSize(diameter),
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
      const min = Math.min(...sizes);
      const max = Math.max(...sizes);
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
      console.info("[AURUM][DIAMOND MICRO PIPELINE][ANALYSIS]", {
        viewportHeight,
        diamondMeshes: meshes.length,
        materialGroups: report.length,
        tiers: report.reduce((acc: Record<string, number>, item) => {
          acc[item.tier] = (acc[item.tier] ?? 0) + item.meshCount;
          return acc;
        }, {}),
        sharedAcrossTiers: report.filter(item => item.sharedAcrossTiers).length,
        report,
        mode: "analysis-only; optical uniforms unchanged",
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
        if (mesh.userData) {
          delete mesh.userData.aurumDiamondMicroScreenDiameterPx;
          delete mesh.userData.aurumDiamondMicroTier;
        }
      }
      meshes.length = 0;
      lastReport = [];
      lastSignature = "";
    },
  };
}
