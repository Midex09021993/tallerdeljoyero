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
  } catch {
    composer?.dispose?.();
    composer = null;
    ssaoPass = null;
  }

  if (!composer) return { composer: null, ssaoPass: null };
  return { composer, ssaoPass };
}
