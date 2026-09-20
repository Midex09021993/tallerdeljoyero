/**
 * AURUM — iJewel reference calibration
 *
 * Single source of truth for values measured directly from the supplied
 * WebGi/iJewel VJSON. These are renderer parameters, not guessed physical
 * substitutes. Keep them immutable so later renderer work can distinguish
 * source-authored values from AURUM approximations.
 */
export const AURUM_IJEWEL_REFERENCE = {
  camera: {
    fov: 25,
    position: [-1.2292039067094442, 9.367439285321952, 3.2772151274423926] as const,
    target: [0, 0, 0] as const,
    distance: 10,
    up: [0, 1, 0] as const,
  },
  scene: {
    environmentIntensity: 1,
    environmentRotation: [0, 0, 0] as const,
    fixedEnvironmentDirection: true,
    backgroundIntensity: 1,
  },
  progressive: {
    enabled: true,
    maxFrameCount: 32,
    jitter: true,
  },
  toneMapping: {
    exposure: 1,
    saturation: 1,
    contrast: 1.1,
  },
  taa: {
    enabled: true,
    feedbackMin: 0.88,
    feedbackMax: 0.97,
  },
  ssr: {
    enabled: true,
    intensity: 1,
    objectRadius: 1,
    autoRadius: true,
    power: 1.1,
    tolerance: 0.5,
    stepCount: 16,
    lowQualityFrames: 0,
    maskFrontRays: true,
    maskFrontFactor: -0.2,
  },
  ssao: {
    enabled: true,
    intensity: 0.25,
    occlusionWorldRadius: 1,
    bias: 0.001,
    falloff: 1.3,
    autoRadius: false,
    projScale: 3784.4844345724664,
    edgeSharpness: 0.3,
    blur: true,
  },
  bloom: {
    enabled: true,
    threshold: 2,
    softThreshold: 0.5,
    intensity: 0.2,
    iterations: 4,
    radius: 0.6,
    power: 1,
  },
  ground: {
    bakedShadows: true,
    groundReflection: false,
    physicalReflections: false,
    size: 8,
    yOffset: 0,
    renderToDepth: true,
    shadowMaxFrameNumber: 400,
  },
  diamondPlugin: {
    enabled: true,
    forceSceneEnvMap: false,
  },
} as const;

export type AurumIJEWELReference = typeof AURUM_IJEWEL_REFERENCE;

export const AURUM_IJEWEL_CAMERA_DIRECTION = [
  AURUM_IJEWEL_REFERENCE.camera.position[0] / AURUM_IJEWEL_REFERENCE.camera.distance,
  AURUM_IJEWEL_REFERENCE.camera.position[1] / AURUM_IJEWEL_REFERENCE.camera.distance,
  AURUM_IJEWEL_REFERENCE.camera.position[2] / AURUM_IJEWEL_REFERENCE.camera.distance,
] as const;
