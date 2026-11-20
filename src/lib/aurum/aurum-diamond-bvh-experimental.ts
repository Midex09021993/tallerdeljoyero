import * as THREE from "three";

/**
 * Opt-in adapter contract for the experimental Apache-2.0 BVH diamond shader.
 *
 * This module intentionally has no static dependency on
 * "realistic-diamond-shader". The application must load that package and pass
 * its exported API here only after its dependency and lockfile are installed.
 * This keeps the current production viewer and its fallback buildable while
 * the experiment is being wired and verified.
 */
export type AurumDiamondBvhApi = {
  createDiamondBVH: (geometry: THREE.BufferGeometry) => {
    bvh: unknown;
    boundsTree?: unknown;
  };
  createDiamondMaterial: (options: Record<string, unknown>) => THREE.Material;
  updateDiamondCamera: (material: THREE.Material, camera: THREE.Camera) => void;
  setDiamondEnvironmentRotation?: (
    material: THREE.Material,
    rotation?: { x?: number; y?: number; z?: number },
  ) => void;
  setDiamondOptions?: (material: THREE.Material, options: Record<string, unknown>) => void;
};

export type AurumDiamondBvhSetupOptions = {
  environmentMap: THREE.Texture;
  camera: THREE.Camera;
  quality?: "interactive" | "high" | "final";
  environmentIntensity?: number;
  dispersion?: number;
  environmentRotationRadians?: number;
  /** Fully composed world-space YXZ environment orientation in degrees. */
  environmentRotationEuler?: { x: number; y: number; z: number };
  ior?: number;
  absorption?: number;
  color?: THREE.ColorRepresentation;
  reflectivity?: number;
  /** Optical transmission for non-diamond gemstone experiments; diamond stays at 0 by default. */
  transmission?: number;
  /** Optional per-channel radiance scale; defaults to the upstream shader setting. */
  rgbBoost?: [number, number, number];
  /** Match per-material gamma stored in the iJewel diamond material. */
  gamma?: number;
  /** Source DiamondMaterial shape controls forwarded to compatible BVH adapters. */
  geometryFactor?: number;
  squashFactor?: number;
  diamondOrientedEnvMap?: number;
};

export type AurumDiamondBvhSetup = {
  material: THREE.Material;
  update: () => void;
  dispose: () => void;
  diagnostics: {
    triangleCount: number;
    ior: number;
    rayBounces: number;
    environmentIntensity: number;
    geometryMutated: false;
    rendererRequired: "WebGL2";
  };
};

const QUALITY_BOUNCES = {
  interactive: 3,
  high: 4,
  final: 5,
} as const;

/**
 * Prepare an experimental material for one diamond mesh.
 *
 * This does not assign the material to the mesh. The caller must retain the
 * original material and only swap this material behind an explicit experiment
 * flag, with a catch/fallback path. CAD geometry is never modified here.
 */
export function prepareAurumDiamondBvhExperiment(
  api: AurumDiamondBvhApi,
  mesh: THREE.Mesh,
  options: AurumDiamondBvhSetupOptions,
): AurumDiamondBvhSetup {
  if (!mesh?.isMesh || !mesh.geometry?.getAttribute("position")) {
    throw new Error("[AURUM diamond BVH] La malla no contiene geometría utilizable.");
  }
  if (!options.environmentMap?.isTexture) {
    throw new Error("[AURUM diamond BVH] Falta la textura HDR/EXR de entorno.");
  }

  const quality = options.quality ?? "interactive";
  const rayBounces = QUALITY_BOUNCES[quality];
  const geometry = mesh.geometry;
  const position = geometry.getAttribute("position");
  const triangleCount = Math.floor(
    (geometry.getIndex()?.count ?? position.count) / 3,
  );

  if (triangleCount < 4) {
    throw new Error("[AURUM diamond BVH] La geometría tiene muy pocas facetas.");
  }

  // This package's BVH is built from the actual faceted CAD geometry. Do not
  // recompute/smooth normals or replace the imported BufferGeometry.
  const { bvh } = api.createDiamondBVH(geometry);
  const material = api.createDiamondMaterial({
    environmentMap: options.environmentMap,
    bvh,
    ior: Math.max(1, options.ior ?? 2.417),
    dispersion: Math.max(0, Math.min(0.02, options.dispersion ?? 0.006)),
    environmentIntensity: Math.max(0, Math.min(2.5, options.environmentIntensity ?? 1.14)),
    rayBounces,
    facetSharpness: Math.max(0, Math.min(1, Number(options.geometryFactor ?? 0.5))),
    reflectivity: Math.max(0, Math.min(1, options.reflectivity ?? 0.46)),
    color: options.color ?? 0xffffff,
    absorption: Math.max(0, options.absorption ?? 1),
    transmission: Math.max(0, Math.min(1, options.transmission ?? 0)),
    ...(options.rgbBoost ? { rgbBoost: options.rgbBoost } : {}),
    gamma: Math.max(0.1, Math.min(3, options.gamma ?? 1.09)),
    // The upstream BVH package exposes facetSharpness, not geometryFactor.
    // Map the catalog geometry control to that supported uniform. squashFactor
    // belongs to the native AURUM shader and has no BVH-package equivalent.
    facetSharpness: Math.max(0, Math.min(1, Number(options.geometryFactor ?? 0.5))),
    diamondOrientedEnvMap: Number(options.diamondOrientedEnvMap ?? 0),
  });

  if (!(material instanceof THREE.Material)) {
    throw new Error("[AURUM diamond BVH] El paquete no devolvió un material Three.js.");
  }

  // Preserve diamond HDR radiance for a single tone-mapping pass.
  // Fail closed to the original material fallback if the package output changes.
  if (!(material instanceof THREE.ShaderMaterial)) {
    throw new Error("[AURUM diamond BVH] El paquete no devolvió un ShaderMaterial compatible.");
  }
  const acesOutput = "gl_FragColor = vec4(aces(hdrColor), 1.0);";
  if (!material.fragmentShader.includes(acesOutput)) {
    throw new Error("[AURUM diamond BVH] No se encontró la salida ACES esperada; se conserva el material original.");
  }
  material.fragmentShader = material.fragmentShader.replace(
    acesOutput,
    "gl_FragColor = vec4(hdrColor, 1.0);",
  );
  material.needsUpdate = true;

  const rotation = THREE.MathUtils.radToDeg(options.environmentRotationRadians ?? 0);
  api.setDiamondEnvironmentRotation?.(
    material,
    options.environmentRotationEuler ?? { x: 0, y: rotation, z: 0 },
  );

  let disposed = false;
  return {
    material,
    update() {
      if (!disposed) api.updateDiamondCamera(material, options.camera);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      material.dispose();
    },
    diagnostics: {
      triangleCount,
      ior: Math.max(1, options.ior ?? 2.417),
      rayBounces,
      environmentIntensity: Math.max(0, Math.min(2.5, options.environmentIntensity ?? 1.14)),
      geometryMutated: false,
      rendererRequired: "WebGL2",
    },
  };
}
