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

  try {
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    ssaoPass = new SSAOPass(scene, camera, 1, 1);
    ssaoPass.kernelRadius = ssaoConfig.radius;
    ssaoPass.minDistance = ssaoConfig.bias;
    ssaoPass.maxDistance = Math.max(.01, ssaoConfig.radius * 2.5);
    ssaoPass.output = (SSAOPass as any).OUTPUT.Default;
    ssaoPass.enabled = ssaoConfig.enabled;
    ssaoPass.kernelSize = Math.min(16, Math.max(8, ssaoConfig.kernelSize ?? 16));
    ssaoPass.aoClamp = Math.max(0, Math.min(1, ssaoConfig.intensity ?? 0.22));
    composer.addPass(ssaoPass);

    if (ssaoConfig.bloom) {
      const { UnrealBloomPass } = await import("three/examples/jsm/postprocessing/UnrealBloomPass.js");
      const bloom = new UnrealBloomPass(
        { x: renderer.domElement.width, y: renderer.domElement.height },
        ssaoConfig.bloomIntensity ?? 0.08,
        0.4,
        ssaoConfig.bloomThreshold ?? 1.35
      );
      composer.addPass(bloom);
    }
  } catch {
    composer = null;
    ssaoPass = null;
  }

  if (!composer) return { composer: null, ssaoPass: null };
  return { composer, ssaoPass };
}
