import * as THREE from "three";

/**
 * AURUM Diamond Pipeline — optical core.
 *
 * This module provides the geometry-aware ray/refraction primitives and
 * explicit diagnostics used by the dedicated diamond renderer. It does not
 * claim that a MeshPhysicalMaterial shader alone traces geometric bounces.
 * The renderer must call traceDiamondRay() with a closed, consistently
 * oriented diamond mesh; incomplete/open CAD meshes are rejected by callers.
 */
export const AURUM_DIAMOND_PIPELINE_VERSION = "0.1.0";

export type AurumDiamondPipelineQuality = "interactive" | "high" | "final";

export type AurumDiamondPipelineConfig = {
  quality: AurumDiamondPipelineQuality;
  maxBounces: number;
  maxDistance: number;
  minimumThroughput: number;
  ior: number;
  dispersion: number;
  rayEpsilon: number;
};

export const AURUM_DIAMOND_PIPELINE_PRESETS: Record<AurumDiamondPipelineQuality, AurumDiamondPipelineConfig> = {
  interactive: {
    quality: "interactive",
    maxBounces: 2,
    maxDistance: 1000,
    minimumThroughput: 0.08,
    ior: 2.417,
    dispersion: 0.01,
    rayEpsilon: 1e-4,
  },
  high: {
    quality: "high",
    maxBounces: 5,
    maxDistance: 1000,
    minimumThroughput: 0.025,
    ior: 2.417,
    dispersion: 0.01,
    rayEpsilon: 1e-4,
  },
  final: {
    quality: "final",
    maxBounces: 8,
    maxDistance: 2000,
    minimumThroughput: 0.008,
    ior: 2.417,
    dispersion: 0.015,
    rayEpsilon: 5e-5,
  },
};

export type AurumDiamondRaySegment = {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  distance: number;
  entering: boolean;
  totalInternalReflection: boolean;
  fresnel: number;
  throughput: number;
  hitObject: THREE.Object3D;
};

export type AurumDiamondRayResult = {
  segments: AurumDiamondRaySegment[];
  escaped: boolean;
  terminatedBy: "environment" | "max-bounces" | "low-throughput" | "no-hit";
  finalDirection: THREE.Vector3;
  throughput: number;
  diagnostics: {
    rayCount: number;
    geometricBounces: number;
    totalInternalReflections: number;
    refractions: number;
  };
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

/** Schlick approximation for unpolarized dielectric Fresnel reflectance. */
export function aurumDiamondFresnel(cosIncident: number, n1: number, n2: number): number {
  const a = Math.max(1e-6, n1);
  const b = Math.max(1e-6, n2);
  const r0 = ((a - b) / (a + b)) ** 2;
  return clamp(r0 + (1 - r0) * (1 - clamp(Math.abs(cosIncident), 0, 1)) ** 5, 0, 1);
}

/**
 * Snell refraction for a normalized incident ray and a normal opposing it.
 * Returns null for total internal reflection.
 */
export function aurumDiamondRefract(
  incident: THREE.Vector3,
  opposingNormal: THREE.Vector3,
  n1: number,
  n2: number,
): THREE.Vector3 | null {
  const i = incident.clone().normalize();
  const n = opposingNormal.clone().normalize();
  const eta = Math.max(1e-6, n1) / Math.max(1e-6, n2);
  const cosI = clamp(-i.dot(n), -1, 1);
  const sinT2 = eta * eta * Math.max(0, 1 - cosI * cosI);
  if (sinT2 >= 1) return null;
  const cosT = Math.sqrt(Math.max(0, 1 - sinT2));
  return i.multiplyScalar(eta).addScaledVector(n, eta * cosI - cosT).normalize();
}

/** Exact vector reflection, returning a normalized outgoing direction. */
export function aurumDiamondReflect(
  incident: THREE.Vector3,
  opposingNormal: THREE.Vector3,
): THREE.Vector3 {
  return incident.clone().reflect(opposingNormal.clone().normalize()).normalize();
}

/**
 * Trace one deterministic ray through a closed diamond mesh.
 *
 * Uses Three.js ray intersections against the supplied geometry, so each
 * bounce follows an actual hit triangle normal instead of an invented
 * "pavilion" normal. The caller must provide the diamond mesh and a scene
 * containing the same mesh; the environment is represented by ray escape.
 *
 * This is a diagnostic/sampling primitive, not a replacement for GPU path
 * tracing across every pixel. It deliberately does not mutate CAD geometry.
 */
export function traceAurumDiamondRay(
  mesh: THREE.Mesh,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  config: Partial<AurumDiamondPipelineConfig> = {},
): AurumDiamondRayResult {
  const quality = config.quality ?? "high";
  const preset = AURUM_DIAMOND_PIPELINE_PRESETS[quality];
  const cfg: AurumDiamondPipelineConfig = {
    ...preset,
    ...config,
    maxBounces: Math.floor(clamp(config.maxBounces ?? preset.maxBounces, 1, 16)),
    maxDistance: clamp(config.maxDistance ?? preset.maxDistance, 1, 1e6),
    minimumThroughput: clamp(config.minimumThroughput ?? preset.minimumThroughput, 0.0001, 0.5),
    ior: clamp(config.ior ?? preset.ior, 1.01, 3.0),
    dispersion: clamp(config.dispersion ?? preset.dispersion, 0, 0.1),
    rayEpsilon: clamp(config.rayEpsilon ?? preset.rayEpsilon, 1e-7, 0.01),
  };

  mesh.updateWorldMatrix(true, false);
  const raycaster = new THREE.Raycaster();
  raycaster.near = cfg.rayEpsilon;
  raycaster.far = cfg.maxDistance;
  const rayOrigin = origin.clone();
  const rayDirection = direction.clone().normalize();
  const segments: AurumDiamondRaySegment[] = [];
  let inside = false;
  let throughput = 1;
  let totalInternalReflections = 0;
  let refractions = 0;
  let escaped = false;
  let terminatedBy: AurumDiamondRayResult["terminatedBy"] = "max-bounces";

  for (let bounce = 0; bounce < cfg.maxBounces; bounce += 1) {
    raycaster.set(rayOrigin, rayDirection);
    const hit = raycaster.intersectObject(mesh, false)[0];
    if (!hit || !hit.face) {
      escaped = true;
      terminatedBy = "environment";
      break;
    }

    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    const outwardNormal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
    const entering = rayDirection.dot(outwardNormal) < 0;
    const opposingNormal = entering ? outwardNormal : outwardNormal.negate();
    const n1 = inside ? cfg.ior : 1;
    const n2 = inside ? 1 : cfg.ior;
    const cosIncident = clamp(-rayDirection.dot(opposingNormal), 0, 1);
    const fresnel = aurumDiamondFresnel(cosIncident, n1, n2);
    const refracted = aurumDiamondRefract(rayDirection, opposingNormal, n1, n2);
    const tir = refracted === null;

    // Sample a physical stochastic branch deterministically from the ray
    // state; callers can seed different incoming directions for convergence.
    const chooseReflection = tir || fresnel >= 0.5;
    let nextDirection: THREE.Vector3;
    if (chooseReflection) {
      nextDirection = aurumDiamondReflect(rayDirection, opposingNormal);
      throughput *= tir ? 0.98 : Math.max(0.05, fresnel);
      if (tir) totalInternalReflections += 1;
    } else {
      nextDirection = refracted!;
      throughput *= Math.max(0.05, 1 - fresnel);
      refractions += 1;
      inside = !inside;
    }

    segments.push({
      origin: hit.point.clone(),
      direction: rayDirection.clone(),
      distance: hit.distance,
      entering,
      totalInternalReflection: tir,
      fresnel,
      throughput,
      hitObject: hit.object,
    });

    if (throughput < cfg.minimumThroughput) {
      terminatedBy = "low-throughput";
      break;
    }

    rayOrigin.copy(hit.point).addScaledVector(nextDirection, cfg.rayEpsilon);
    rayDirection.copy(nextDirection);
  }

  if (segments.length === 0 && !escaped) terminatedBy = "no-hit";
  return {
    segments,
    escaped,
    terminatedBy,
    finalDirection: rayDirection,
    throughput,
    diagnostics: {
      rayCount: 1,
      geometricBounces: segments.length,
      totalInternalReflections,
      refractions,
    },
  };
}

export function getAurumDiamondPipelineDiagnostics(mesh: THREE.Mesh, quality: AurumDiamondPipelineQuality = "high") {
  const geometry = mesh.geometry;
  geometry.computeBoundingBox();
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const triangleCount = Math.floor((index?.count ?? position?.count ?? 0) / 3);
  const preset = AURUM_DIAMOND_PIPELINE_PRESETS[quality];
  return {
    version: AURUM_DIAMOND_PIPELINE_VERSION,
    quality,
    triangleCount,
    hasNormals: Boolean(geometry.getAttribute("normal")),
    hasIndex: Boolean(index),
    boundingBoxAvailable: Boolean(geometry.boundingBox),
    maxBounces: preset.maxBounces,
    geometryMutated: false as const,
    mode: "geometry-intersection-ray-prototype" as const,
    note: "Ray-level geometric prototype; not yet a per-pixel GPU path-tracing pass.",
  };
}
