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
    // Keep SSAO disabled until the base render is fully validated; the pipeline is ready for controlled activation.
    ssaoPass.enabled = false;
    ssaoPass.kernelRadius = ssaoConfig.radius;
    ssaoPass.minDistance = ssaoConfig.bias;
    ssaoPass.maxDistance = Math.max(.01, ssaoConfig.radius * 2.5);
    ssaoPass.output = (SSAOPass as any).OUTPUT.Default;
    ssaoPass.enabled = ssaoConfig.enabled;
    ssaoPass.kernelSize = Math.min(16, Math.max(8, ssaoConfig.kernelSize ?? 16));
    ssaoPass.aoClamp = 0.45;
    composer.addPass(ssaoPass);
  } catch {
    composer = null;
    ssaoPass = null;
  }

  return { composer, ssaoPass };
}
