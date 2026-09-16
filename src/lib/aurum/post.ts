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
  let renderPass:any=null;
  let taaPass:any=null;
  let ssaoPass:any=null;
  let bloomPass:any=null;
  let lutPass:any=null;
  let vignettePass:any=null;
  let dofPass:any=null;
  let outputPass:any=null;

  try {
    composer=new EffectComposer(renderer);
    composer.setPixelRatio?.(Math.max(1,Math.min(2,Number(quality?.pixelRatio??1.5))));
    renderPass=new RenderPass(scene,camera);
    composer.addPass(renderPass);

    // Temporal AA is deliberately kept as an optional Ultra layer. Three.js
    // accumulates jittered samples when the camera is static; while the user
    // moves the jewelry we temporarily reset accumulation to avoid ghosting.
    try {
      const { TAARenderPass }=await import("three/examples/jsm/postprocessing/TAARenderPass.js");
      taaPass=new TAARenderPass(scene,camera);
      taaPass.accumulate=false;
      // A jewelry viewport benefits more from stable temporal accumulation than
      // from a large sample burst. Keep Ultra at 4 samples; the camera is reset
      // while moving and accumulation resumes only when the product is stable.
      taaPass.sampleLevel=2;
      taaPass.unbiased=true;
      composer.addPass(taaPass);
    } catch {
      taaPass=null;
    }

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

    // Controlled depth of field: kept very shallow because jewelry product
    // photography should preserve the ring silhouette while giving the hero
    // stone a photographic separation. Enabled only at Ultra.
    try {
      const { BokehPass }=await import("three/examples/jsm/postprocessing/BokehPass.js");
      dofPass=new BokehPass(scene,camera,{
        focus:4.0,
        aperture:0.00065,
        maxblur:0.006
      });
      composer.addPass(dofPass);
    } catch {
      dofPass=null;
    }

    // Subtle photographic vignette: iJewel exposes vignette as a post effect;
    // here it is intentionally restrained so the jewelry remains the subject.
    const { ShaderPass }=await import("three/examples/jsm/postprocessing/ShaderPass.js");
    vignettePass=new ShaderPass({
      uniforms:{tDiffuse:{value:null},offset:{value:config.vignetteOffset??1.0},darkness:{value:config.vignetteDarkness??.055}},
      vertexShader:`varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`uniform sampler2D tDiffuse; uniform float offset; uniform float darkness; varying vec2 vUv; void main(){vec4 c=texture2D(tDiffuse,vUv); vec2 p=vUv-.5; float d=dot(p,p)*2.0; float vig=smoothstep(offset*.55,offset,d); c.rgb*=1.0-vig*darkness; gl_FragColor=c;}`,
    });
    composer.addPass(vignettePass);

    const { OutputPass }=await import("three/examples/jsm/postprocessing/OutputPass.js");
    outputPass=new OutputPass();
    composer.addPass(outputPass);
  } catch {
    lutPass?.lut?.dispose?.();
    composer?.dispose?.();
    composer=null; renderPass=null; taaPass=null; ssaoPass=null; bloomPass=null; lutPass=null; vignettePass=null; dofPass=null; outputPass=null;
  }

  const applyQuality=(next:any)=>{
    if(!composer) return;
    const q=next||{};
    const high=q.pixelRatio>=1.5;
    const ultra=q.pixelRatio>=2;
    if(renderPass){
      renderPass.enabled=!(ultra && config.taa!==false);
    }
    if(taaPass){
      // Ultra uses accumulation only when the scene is stable. The caller can
      // reset it through updateTemporal() whenever the camera moves.
      taaPass.enabled=ultra && config.taa!==false;
      taaPass.accumulate=ultra && config.taa!==false;
      taaPass.sampleLevel=2;
    }
    if(ssaoPass){
      ssaoPass.enabled=Boolean(config.ssao) && (high || ultra);
      // SSAO is a secondary contact cue. Render it below the final drawing
      // resolution so Ultra spends its extra budget on the jewelry itself.
      ssaoPass.kernelSize=ultra?24:high?20:12;
      const ssaoScale=ultra?.72:high?.82:.70;
      ssaoPass.setSize?.(
        Math.max(1,Math.floor((renderer.domElement.width||renderer.domElement.clientWidth||1)*ssaoScale)),
        Math.max(1,Math.floor((renderer.domElement.height||renderer.domElement.clientHeight||1)*ssaoScale))
      );
      ssaoPass.aoClamp=Math.max(0,Math.min(1,(config.ssaoIntensity??.12)*(ultra?.92:.82)));
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
    if(dofPass){
      // DOF is a capture/photography effect, not an interactive quality tax.
      // The photographic profiles decide when it is explicitly requested.
      dofPass.enabled=ultra && config.dof===true;
      if(dofPass.uniforms){
        dofPass.uniforms.aperture.value=Math.max(0,Number(config.dofAperture??0.00065));
        dofPass.uniforms.maxblur.value=Math.max(0,Number(config.dofMaxBlur??0.006));
      }
    }
    if(vignettePass){
      vignettePass.enabled=config.vignette!==false;
      vignettePass.uniforms.darkness.value=Math.max(0,Math.min(.18,Number(config.vignetteDarkness??.055)));
      vignettePass.uniforms.offset.value=Math.max(.55,Math.min(1.4,Number(config.vignetteOffset??1.0)));
    }
    const finalPixelRatio=Math.max(1,Math.min(1.75,Number(q.pixelRatio??1.5)));
    composer.setPixelRatio?.(finalPixelRatio);
    composer.setSize?.(renderer.domElement.clientWidth||renderer.domElement.width,renderer.domElement.clientHeight||renderer.domElement.height);
    if(ssaoPass){
      const ssaoScale=ultra?.72:high?.82:.70;
      ssaoPass.setSize?.(
        Math.max(1,Math.floor((renderer.domElement.width||renderer.domElement.clientWidth||1)*ssaoScale)),
        Math.max(1,Math.floor((renderer.domElement.height||renderer.domElement.clientHeight||1)*ssaoScale))
      );
    }
  };

  let lastPX=NaN,lastPY=NaN,lastPZ=NaN,lastQX=NaN,lastQY=NaN,lastQZ=NaN,lastQW=NaN;
  const updateTemporal=(focusDistance?:number)=>{
    const p=camera.position, q=camera.quaternion;
    const moved=!Number.isFinite(lastPX)
      || Math.abs(p.x-lastPX)>1e-5 || Math.abs(p.y-lastPY)>1e-5 || Math.abs(p.z-lastPZ)>1e-5
      || Math.abs(q.x-lastQX)>1e-5 || Math.abs(q.y-lastQY)>1e-5 || Math.abs(q.z-lastQZ)>1e-5 || Math.abs(q.w-lastQW)>1e-5;
    if(taaPass){
      if(moved){
        taaPass.accumulateIndex=-1;
        taaPass.accumulate=false;
      }else if(taaPass.enabled && config.taa!==false){
        taaPass.accumulate=true;
      }
    }
    lastPX=p.x; lastPY=p.y; lastPZ=p.z;
    lastQX=q.x; lastQY=q.y; lastQZ=q.z; lastQW=q.w;
    if(dofPass?.enabled && dofPass.uniforms){
      // BokehPass focus is measured along the camera look direction. Using the
      // camera-to-target distance keeps focus attached to the product while zooming.
      const focus=Number.isFinite(focusDistance) ? Number(focusDistance) : 4;
      dofPass.uniforms.focus.value=Math.max(.5,focus);
    }
  };

  applyQuality(quality);
  return {composer,ssaoPass,applyQuality,updateTemporal,dofPass,taaPass};
}
