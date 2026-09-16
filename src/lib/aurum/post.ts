/**
 * AURUM POST PROCESSING PIPELINE v2
 *
 * Post effects are scene-aware and quality-aware. The goal is not to add
 * "effects for effects' sake", but to reproduce the documented jewelry
 * workflow of tone mapping, LUT grading and optional screen-space effects
 * while keeping polished metal highlights clean.
 */
export async function createAurumPostPipeline(
  renderer:any,
  scene:any,
  camera:any,
  config:any,
  quality:any
) {
  const { EffectComposer } = await import("three/examples/jsm/postprocessing/EffectComposer.js");
  const { RenderPass } = await import("three/examples/jsm/postprocessing/RenderPass.js");
  const { SSAOPass } = await import("three/examples/jsm/postprocessing/SSAOPass.js");

  let composer:any=null;
  let ssaoPass:any=null;
  let bloomPass:any=null;
  let lutPass:any=null;
  let outputPass:any=null;

  try {
    composer=new EffectComposer(renderer);
    composer.setPixelRatio?.(Math.max(1,Math.min(2,Number(quality?.pixelRatio??1.5)));
    const renderPass=new RenderPass(scene,camera);
    composer.addPass(renderPass);

    ssaoPass=new SSAOPass(scene,camera,
      Math.max(1,renderer.domElement.width),
      Math.max(1,renderer.domElement.height)
    );
    ssaoPass.kernelRadius=Math.max(.01,config.radius??.20);
    ssaoPass.minDistance=Math.max(.001,config.bias??.018);
    ssaoPass.maxDistance=Math.max(.02,ssaoPass.kernelRadius*2.5);
    ssaoPass.output=(SSAOPass as any).OUTPUT.Default;
    ssaoPass.aoClamp=Math.max(0,Math.min(1,config.ssaoIntensity??config.intensity??.12));
    composer.addPass(ssaoPass);

    const { UnrealBloomPass }=await import("three/examples/jsm/postprocessing/UnrealBloomPass.js");
    bloomPass=new UnrealBloomPass(
      {x:renderer.domElement.width,y:renderer.domElement.height} as any,
      config.bloomIntensity??.035,.35,config.bloomThreshold??1.5
    );
    composer.addPass(bloomPass);

    const { Data3DTexture,RGBAFormat,UnsignedByteType,LinearFilter }=await import("three");
    const { LUTPass }=await import("three/examples/jsm/postprocessing/LUTPass.js");
    const size=16;
    const data=new Uint8Array(size*size*size*4);
    const saturation=1.025,contrast=1.018,warm=.0015;
    let p=0;
    for(let b=0;b<size;b++) for(let g=0;g<size;g++) for(let rr=0;rr<size;rr++){
      const r=rr/(size-1),gg=g/(size-1),bb=b/(size-1);
      const luma=r*.2126+gg*.7152+bb*.0722;
      let cr=luma+(r-luma)*saturation, cg=luma+(gg-luma)*saturation, cb=luma+(bb-luma)*saturation;
      cr=(cr-.5)*contrast+.5+warm; cg=(cg-.5)*contrast+.5; cb=(cb-.5)*contrast+.5-warm*.5;
      data[p++]=Math.round(Math.max(0,Math.min(1,cr))*255);
      data[p++]=Math.round(Math.max(0,Math.min(1,cg))*255);
      data[p++]=Math.round(Math.max(0,Math.min(1,cb))*255);
      data[p++]=255;
    }
    const lutTexture=new Data3DTexture(data,size,size,size);
    lutTexture.format=RGBAFormat; lutTexture.type=UnsignedByteType;
    lutTexture.minFilter=LinearFilter; lutTexture.magFilter=LinearFilter;
    lutTexture.unpackAlignment=1; lutTexture.needsUpdate=true;
    lutPass=new LUTPass({lut:lutTexture});
    composer.addPass(lutPass);

    const { OutputPass }=await import("three/examples/jsm/postprocessing/OutputPass.js");
    outputPass=new OutputPass();
    composer.addPass(outputPass);
  } catch {
    lutPass?.lut?.dispose?.();
    composer?.dispose?.();
    composer=null; ssaoPass=null; bloomPass=null; lutPass=null; outputPass=null;
  }

  const applyQuality=(next:any)=>{
    if(!composer) return;
    const q=next||{};
    const high=q.pixelRatio>=1.5;
    const ultra=q.pixelRatio>=2;
    if(ssaoPass){
      ssaoPass.enabled=Boolean(config.ssao) && (high || ultra);
      ssaoPass.kernelSize=ultra?32:high?24:12;
      ssaoPass.aoClamp=Math.max(0,Math.min(1,(config.ssaoIntensity??.12)*(ultra?1:.82)));
    }
    if(bloomPass){
      bloomPass.enabled=Boolean(config.bloom) && (high || ultra);
      bloomPass.strength=config.bloomIntensity??.035;
      bloomPass.threshold=config.bloomThreshold??1.5;
    }
    if(lutPass){
      lutPass.enabled=config.lut!==false;
      lutPass.intensity=Math.max(0,Math.min(1,(config.lutIntensity??.08)*(ultra?1:high?.82:.62)));
    }
    composer.setPixelRatio?.(Math.max(1,Math.min(2,Number(q.pixelRatio??1.5)));
    composer.setSize?.(renderer.domElement.clientWidth||renderer.domElement.width,renderer.domElement.clientHeight||renderer.domElement.height);
  };

  applyQuality(quality);
  return {composer,ssaoPass,applyQuality};
}
