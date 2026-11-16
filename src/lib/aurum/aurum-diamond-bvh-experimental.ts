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
const MAX_DIAMOND_DISPERSION = 0.044;

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
  /** Apply scale-aware ray origin bias only to diamond BVH materials. */
  adaptiveRayEpsilon?: boolean;
  /** Accumulate all internal refracted exits for the focal diamond only. */
  accumulateInternalExits?: boolean;
  /** Enable bounded facet fire and view-dependent scintillation on the focal diamond only. */
  enableDiamondEffects?: boolean;
  fireIntensity?: number;
  scintillationIntensity?: number;
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
    dispersion: Math.max(0, Math.min(MAX_DIAMOND_DISPERSION, options.dispersion ?? 0.006)),
    environmentIntensity: Math.max(0, Math.min(2.5, options.environmentIntensity ?? 1.14)),
    rayBounces,
    facetSharpness: 1,
    reflectivity: Math.max(0, Math.min(1, options.reflectivity ?? 0.46)),
    color: options.color ?? 0xffffff,
    absorption: Math.max(0, options.absorption ?? 1),
    transmission: Math.max(0, Math.min(1, options.transmission ?? 0)),
    ...(options.rgbBoost ? { rgbBoost: options.rgbBoost } : {}),
    gamma: Math.max(0.1, Math.min(3, options.gamma ?? 1.09)),
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
  if (options.enableDiamondEffects) {
    const fireIntensity = Math.max(0, Math.min(0.75, options.fireIntensity ?? 0.55));
    const scintillationIntensity = Math.max(0, Math.min(0.35, options.scintillationIntensity ?? 0.22));
    const uniformAnchor = "  precision highp float;";
    if (!material.fragmentShader.includes(uniformAnchor)) {
      throw new Error("[AURUM diamond BVH] No se pudo insertar los uniformes de efectos.");
    }
    material.fragmentShader = material.fragmentShader.replace(
      uniformAnchor,
      `${uniformAnchor}\n uniform float aurumDiamondFireIntensity;\n uniform float aurumDiamondScintillationIntensity;`,
    );
    const hdrOutput = "gl_FragColor = vec4(hdrColor, 1.0);";
    const effectOutput = `float aurumFacetView = clamp(abs(dot(normalize(view), normalize(worldNormal))), 0.0, 1.0);
    float aurumFireLobe = pow(clamp(1.0 - aurumFacetView, 0.0, 1.0), 7.0);
    float aurumScintillationLobe = pow(max(dot(reflect(incident, worldNormal), view), 0.0), 48.0);
    vec3 aurumFireSpectrum = vec3(0.32, 0.62, 1.0) * aurumFireLobe * aurumDiamondFireIntensity;
    hdrColor += aurumFireSpectrum * max(internalTransmission, vec3(0.0)) * 0.42;
    hdrColor *= 1.0 + aurumScintillationLobe * aurumDiamondScintillationIntensity;
    gl_FragColor = vec4(hdrColor, 1.0);`;
    if (!material.fragmentShader.includes(hdrOutput)) {
      throw new Error("[AURUM diamond BVH] No se encontró la salida HDR para activar los efectos.");
    }
    material.fragmentShader = material.fragmentShader.replace(hdrOutput, effectOutput);
    material.uniforms.aurumDiamondFireIntensity = { value: fireIntensity };
    material.uniforms.aurumDiamondScintillationIntensity = { value: scintillationIntensity };
    material.needsUpdate = true;
  }
  if (options.accumulateInternalExits) {
    const declarations = [
      "    vec3 internalExitR = ray;",
      "    vec3 internalExitG = ray;",
      "    vec3 internalExitB = ray;",
      "    float internalExitWeight = 0.0;",
    ].join("\n");
    const strongestOnlyBranch = [
      "          } else if (exitWeight > internalExitWeight) {",
      "            internalExitR = length(exitR) > 0.001 ? exitR : exitG;",
      "            internalExitG = exitG;",
      "            internalExitB = length(exitB) > 0.001 ? exitB : exitG;",
      "            internalExitWeight = exitWeight;",
      "          }",
    ].join("\n");
    const strongestOnlyTail = [
      "    if (internalExitWeight > 0.001) {",
      "      accumulated += sampleChromaticEnv(internalExitR, internalExitG, internalExitB) * internalExitWeight;",
      "    }",
    ].join("\n");
    if (!material.fragmentShader.includes(declarations)
      || !material.fragmentShader.includes(strongestOnlyBranch)
      || !material.fragmentShader.includes(strongestOnlyTail)) {
      throw new Error("[AURUM diamond BVH] No se pudo adaptar la acumulación de rebotes; se conserva el material original.");
    }
    material.fragmentShader = material.fragmentShader
      .replace(declarations, "    vec3 accumulatedInternalExits = vec3(0.0);")
      .replace(strongestOnlyBranch, `          } else {
            // Sum every internal refracted exit branch. Fresnel reflection
            // weight is carried forward to the next internal bounce.
            accumulatedInternalExits += sampleChromaticEnv(
              length(exitR) > 0.001 ? exitR : exitG,
              exitG,
              length(exitB) > 0.001 ? exitB : exitG
            ) * exitWeight;
          }`)
      .replace(strongestOnlyTail, "    accumulated += accumulatedInternalExits;");
  }
  // The upstream BVH uses a fixed 1e-4 ray-origin offset. CAD jewelry may
  // be authored in millimetres or metres, so use a scale-aware bias for diamond
  // meshes only. If the upstream bundle changes, leave its shader untouched.
  let adaptiveRayEpsilon: number | null = null;
  if (options.adaptiveRayEpsilon) {
    geometry.computeBoundingBox?.();
    const boundsSize = geometry.boundingBox?.getSize(new THREE.Vector3());
    const diagonal = boundsSize?.length?.() ?? 0;
    adaptiveRayEpsilon = Number.isFinite(diagonal) && diagonal > 0
      ? Math.max(1e-7, Math.min(1e-3, diagonal * 1e-5))
      : 1e-4;
    const rayOffsetPattern = /position\s*=\s*hitPosition\s*\+\s*ray\s*\*\s*0\.0001\s*;/;
    if (rayOffsetPattern.test(material.fragmentShader)) {
      const precisionPattern = /(precision\s+highp\s+float\s*;)/;
      if (precisionPattern.test(material.fragmentShader)) {
        material.fragmentShader = material.fragmentShader.replace(
          precisionPattern,
          `$1\n uniform float aurumRayEpsilon;`,
        ).replace(rayOffsetPattern, "position = hitPosition + ray * aurumRayEpsilon;");
        material.uniforms.aurumRayEpsilon = { value: adaptiveRayEpsilon };
        material.needsUpdate = true;
      } else {
        console.warn("[AURUM][DIAMOND][BVH] No se encontró la declaración de precisión GLSL; se conserva el epsilon original.");
        adaptiveRayEpsilon = null;
      }
    } else {
      console.warn("[AURUM][DIAMOND][BVH] El paquete cambió el avance de rayo; se conserva el epsilon original.");
      adaptiveRayEpsilon = null;
    }
  }

  const rotation = THREE.MathUtils.radToDeg(options.environmentRotationRadians ?? 0);
  api.setDiamondEnvironmentRotation?.(material, { x: 0, y: rotation, z: 0 });

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
