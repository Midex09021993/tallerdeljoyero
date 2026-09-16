/**
 * AURUM POST PROCESSING PIPELINE
 * Encapsula el compositor sin cambiar el look del render base.
 * Los efectos permanecen gobernados por su configuración existente.
 */
export async function createAurumPostPipeline(
  renderer: any,
  scene: any,
  camera: any,
  ssaoConfig: any
) {
  const { EffectComposer } = await import("three/examples/jsm/postprocessing/EffectComposer.js");
  const { RenderPass } = await import("three/examples/jsm/postprocessing/RenderPass.js");
  const { SSAOPass } = await import("three/examples/jsm/postprocessing/SSAOPass.js");

  let composer: any = null;
  let ssaoPass: any = null;
  let lutPass: any = null;

  try {
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    ssaoPass = new SSAOPass(
      scene,
      camera,
      Math.max(1, renderer.domElement.width),
      Math.max(1, renderer.domElement.height)
    );
    ssaoPass.kernelRadius = Math.max(0.01, ssaoConfig.radius ?? 0.28);
    ssaoPass.minDistance = Math.max(0.001, ssaoConfig.bias ?? 0.025);
    ssaoPass.maxDistance = Math.max(0.02, ssaoPass.kernelRadius * 2.5);
    ssaoPass.output = (SSAOPass as any).OUTPUT.Default;
    // SSAO remains explicitly opt-in. The current jewelry presentation keeps it off.
    ssaoPass.enabled = ssaoConfig.enabled === true;
    ssaoPass.kernelSize = Math.min(32, Math.max(8, ssaoConfig.kernelSize ?? 16));
    ssaoPass.aoClamp = Math.max(0, Math.min(1, ssaoConfig.intensity ?? 0.22));
    composer.addPass(ssaoPass);

    // Bloom is also opt-in and does not participate in the base render.
    if (ssaoConfig.bloom === true) {
      const { UnrealBloomPass } = await import("three/examples/jsm/postprocessing/UnrealBloomPass.js");
      const bloom = new UnrealBloomPass(
        { x: renderer.domElement.width, y: renderer.domElement.height } as any,
        ssaoConfig.bloomIntensity ?? 0.08,
        0.4,
        ssaoConfig.bloomThreshold ?? 1.35
      );
      composer.addPass(bloom);
    }
    // Color grading: iJewel documents LUT color correction for precious metals.
    // We keep a subtle procedural jewelry LUT locally so the render does not depend
    // on another network asset. The effect is intentionally low-intensity.
    if (ssaoConfig.lut === true) {
      const { Data3DTexture, RGBAFormat, UnsignedByteType, LinearFilter } = await import("three");
      const { LUTPass } = await import("three/examples/jsm/postprocessing/LUTPass.js");
      const size = 16;
      const data = new Uint8Array(size * size * size * 4);
      const saturation = 1.035;
      const contrast = 1.025;
      const warm = 0.002;
      let p = 0;
      for (let b = 0; b < size; b++) {
        for (let g = 0; g < size; g++) {
          for (let r = 0; r < size; r++) {
            const rf = r / (size - 1), gf = g / (size - 1), bf = b / (size - 1);
            const luma = rf * 0.2126 + gf * 0.7152 + bf * 0.0722;
            let rr = luma + (rf - luma) * saturation;
            let gg = luma + (gf - luma) * saturation;
            let bb = luma + (bf - luma) * saturation;
            rr = (rr - 0.5) * contrast + 0.5 + warm;
            gg = (gg - 0.5) * contrast + 0.5;
            bb = (bb - 0.5) * contrast + 0.5 - warm * 0.5;
            data[p++] = Math.round(Math.max(0, Math.min(1, rr)) * 255);
            data[p++] = Math.round(Math.max(0, Math.min(1, gg)) * 255);
            data[p++] = Math.round(Math.max(0, Math.min(1, bb)) * 255);
            data[p++] = 255;
          }
        }
      }
      const lutTexture = new Data3DTexture(data, size, size, size);
      lutTexture.format = RGBAFormat;
      lutTexture.type = UnsignedByteType;
      lutTexture.minFilter = LinearFilter;
      lutTexture.magFilter = LinearFilter;
      lutTexture.unpackAlignment = 1;
      lutTexture.needsUpdate = true;
      lutPass = new LUTPass({ lut: lutTexture });
      lutPass.intensity = Math.max(0, Math.min(1, ssaoConfig.lutIntensity ?? 0.12));
      composer.addPass(lutPass);
    }

  } catch {
    lutPass?.lut?.dispose?.();
    composer?.dispose?.();
    composer = null;
    ssaoPass = null;
  }

  if (!composer) return { composer: null, ssaoPass: null };
  return { composer, ssaoPass };
}
