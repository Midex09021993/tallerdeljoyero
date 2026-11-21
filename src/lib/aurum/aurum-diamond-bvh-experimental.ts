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

/** Add and synchronize catalog optical controls missing from the upstream BVH package. */
export function setAurumDiamondBvhOpticalParameters(
  material: THREE.Material,
  values: { geometryFactor?: number; squashFactor?: number; absorptionFactor?: number; transmission?: number },
): void {
  if (!(material instanceof THREE.ShaderMaterial)) return;
  const uniforms = material.uniforms;
  let shaderPatched = false;
  if (!uniforms["geometryFactor"]) uniforms["geometryFactor"] = { value: 0.5 };
  if (!uniforms["squashFactor"]) uniforms["squashFactor"] = { value: 0.98 };
  if (!material.fragmentShader.includes("uniform float geometryFactor;")) {
    material.fragmentShader = material.fragmentShader.replace(
      "uniform float facetSharpness;",
      "uniform float facetSharpness;\n  uniform float geometryFactor;\n  uniform float squashFactor;",
    );
    shaderPatched = true;
  }
  if (!material.fragmentShader.includes("AURUM_BVH_SQUASH_CONTROL")) {
    material.fragmentShader = material.fragmentShader.replace(
      "if (length(entryRay) < 0.001) entryRay = reflect(localIncident, localNormal);",
      "if (length(entryRay) < 0.001) entryRay = reflect(localIncident, localNormal);\n    // AURUM_BVH_SQUASH_CONTROL\n    entryRay = normalize(mix(entryRay, localNormal, clamp(1.0 - squashFactor, 0.0, 0.08)));",
    );
    shaderPatched = true;
  }
  if (!material.fragmentShader.includes("AURUM_BVH_ABSORPTION_CONTROL")) {
    material.fragmentShader = material.fragmentShader.replace(
      "if (absorption > 1.001) accumulated *= exp(-vec3(0.04) * (absorption - 1.0) * totalDistance);",
      "// AURUM_BVH_ABSORPTION_CONTROL: neutral at 1.0; bounded attenuation above/below the calibrated baseline.\n    accumulated *= exp(-vec3((absorption - 1.0) * 0.12));",
    );
    shaderPatched = true;
  }
  if (!material.fragmentShader.includes("AURUM_BVH_GEOMETRY_CONTROL")) {
    material.fragmentShader = material.fragmentShader.replace(
      "gl_FragColor = vec4(aces(hdrColor), 1.0);",
      "// AURUM_BVH_GEOMETRY_CONTROL\n    hdrColor *= mix(0.96, 1.0, clamp(geometryFactor, 0.0, 1.0));\n    gl_FragColor = vec4(aces(hdrColor), 1.0);",
    );
    shaderPatched = true;
  }
  const set = (key: string, value: number | undefined, min: number, max: number) => {
    if (value === undefined || !Number.isFinite(Number(value))) return;
    const uniform = uniforms[key];
    if (!uniform) return;
    uniform.value = Math.max(min, Math.min(max, Number(value)));
  };
  set("geometryFactor", values.geometryFactor, 0, 1);
  set("squashFactor", values.squashFactor, 0, 1);
  set("absorption", values.absorptionFactor, 0, 20);
  set("transmission", values.transmission, 0, 1);
  material.userData = {
    ...(material.userData ?? {}),
    aurumDiamondBvhOpticalControls: {
      geometryFactor: uniforms["geometryFactor"],
      squashFactor: uniforms["squashFactor"],
      absorptionFactor: uniforms["absorption"],
      transmission: uniforms["transmission"],
    },
  };
  if (shaderPatched) material.needsUpdate = true;
}

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
    facetSharpness: 1,
    reflectivity: Math.max(0, Math.min(1, options.reflectivity ?? 0.46)),
    color: options.color ?? 0xffffff,
    absorption: Math.max(0, options.absorption ?? 1),
    transmission: Math.max(0, Math.min(1, options.transmission ?? 0)),
    ...(options.rgbBoost ? { rgbBoost: options.rgbBoost } : {}),
    gamma: Math.max(0.1, Math.min(3, options.gamma ?? 1.09)),
    diamondOrientedEnvMap: Number(options.diamondOrientedEnvMap ?? 0),
  });

  if (material instanceof THREE.ShaderMaterial) {
    setAurumDiamondBvhOpticalParameters(material, {
      geometryFactor: options.geometryFactor ?? 0.5,
      squashFactor: options.squashFactor ?? 0.98,
      absorptionFactor: options.absorption ?? 1,
      transmission: options.transmission ?? 0,
    });
  }

  if (!(material instanceof THREE.Material)) {
    throw new Error("[AURUM diamond BVH] El paquete no devolvió un material Three.js.");
  }

  // Preserve diamond HDR radiance for a single tone-mapping pass.
  // Fail closed to the original material fallback if the package output changes.
  if (!(material instanceof THREE.ShaderMaterial)) {
    throw new Error("[AURUM diamond BVH] El paquete no devolvió un ShaderMaterial compatible.");
  }
  // AURUM Gem light is shader-local: it must affect the stone without lighting metal or prongs.
  // The source uses the existing world-space point position and model-scaled radius.
  const gemLightUniforms = {
    position: { value: new THREE.Vector3() },
    intensity: { value: 0 },
    radius: { value: 1 },
  };
  material.uniforms.aurumGemLightPosition = gemLightUniforms.position;
  material.uniforms.aurumGemLightIntensity = gemLightUniforms.intensity;
  material.uniforms.aurumGemLightRadius = gemLightUniforms.radius;

  const acesOutput = "gl_FragColor = vec4(aces(hdrColor), 1.0);";
  if (!material.fragmentShader.includes(acesOutput)) {
    throw new Error("[AURUM diamond BVH] No se encontró la salida ACES esperada; se conserva el material original.");
  }
  material.fragmentShader = material.fragmentShader.replace(
    "uniform float facetSharpness;",
    "uniform float facetSharpness;\\n  uniform vec3 aurumGemLightPosition;\\n  uniform float aurumGemLightIntensity;\\n  uniform float aurumGemLightRadius;",
  );
  if (!material.fragmentShader.includes("uniform vec3 aurumGemLightPosition;")) {
    throw new Error("[AURUM diamond BVH] No se pudieron registrar los uniformes de luz Gem.");
  }
  material.fragmentShader = material.fragmentShader.replace(
    acesOutput,
    "// AURUM_BVH_GEM_LIGHT: localized surface response; BVH rays and optical transport remain unchanged.\\n    vec3 gemLightVector = aurumGemLightPosition - vWorldPos;\\n    float gemLightDistance = length(gemLightVector);\\n    vec3 gemLightDirection = gemLightDistance > 0.0001 ? gemLightVector / gemLightDistance : vec3(0.0, 1.0, 0.0);\\n    float gemLightRadiusSafe = max(aurumGemLightRadius, 0.001);\\n    float gemLightRange = 1.0 - smoothstep(2.0, 4.0, gemLightDistance / gemLightRadiusSafe);\\n    float gemLightAttenuation = gemLightRange / (1.0 + pow(gemLightDistance / gemLightRadiusSafe, 2.0));\\n    float gemLightDiffuse = max(dot(worldNormal, gemLightDirection), 0.0);\\n    vec3 gemLightHalfVector = normalize(gemLightDirection + view);\\n    float gemLightSpecular = pow(max(dot(worldNormal, gemLightHalfVector), 0.0), 36.0);\\n    float gemLightEnergy = max(aurumGemLightIntensity, 0.0) * gemLightAttenuation;\\n    hdrColor += vec3(gemLightEnergy * (0.22 * gemLightDiffuse + 0.12 * gemLightSpecular));\\n    gl_FragColor = vec4(hdrColor, 1.0);",
  );
  material.userData = {
    ...(material.userData ?? {}),
    aurumGemFamily: "Diamante",
    aurumGemLightUniforms: gemLightUniforms,
    aurumGemLightState: { enabled: false, intensity: 0, position: [0, 0, 0], radius: 1 },
    aurumDiamondBvhGemLight: true,
  };
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
