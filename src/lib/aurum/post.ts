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
  let ssrPass:any=null;
  let ssrSavePass:any=null;
  let ssrCompositePass:any=null;
  let ssaoPass:any=null;
  let bloomPass:any=null;
  let lutPass:any=null;
  let vignettePass:any=null;
  let dofPass:any=null;
  let outputPass:any=null;
  let gradingPass:any=null;

  try {
    composer=new EffectComposer(renderer);
    composer.setPixelRatio?.(Math.max(1,Math.min(2,Number(quality?.pixelRatio??1.5))));
    renderPass=new RenderPass(scene,camera);
    composer.addPass(renderPass);

    try {
      const { TAARenderPass }=await import("three/examples/jsm/postprocessing/TAARenderPass.js");
      taaPass=new TAARenderPass(scene,camera);
      taaPass.accumulate=false;
      taaPass.sampleLevel=2;
      taaPass.unbiased=true;
      composer.addPass(taaPass);
    } catch {
      taaPass=null;
    }

    try {
      // Save the converged TAA beauty before SSR. SSRPass r185 rerenders the
      // scene internally, so this saved beauty lets us compose its reflection
      // result over the progressive image instead of discarding TAA.
      const { SavePass }=await import("three/examples/jsm/postprocessing/SavePass.js");
      const { ShaderPass }=await import("three/examples/jsm/postprocessing/ShaderPass.js");
      const { SSRPass }=await import("three/examples/jsm/postprocessing/SSRPass.js");

      ssrSavePass=new SavePass();
      ssrSavePass.enabled=false;
      composer.addPass(ssrSavePass);

      ssrPass=new SSRPass({
        renderer,
        scene,
        camera,
        width:Math.max(1,renderer.domElement.width),
        height:Math.max(1,renderer.domElement.height),
        selects:[],
      });
      ssrPass.output=SSRPass.OUTPUT.SSR;
      ssrPass.opacity=1;
      ssrPass.blur=true;
      ssrPass.fresnel=true;
      ssrPass.distanceAttenuation=true;
      ssrPass.resolutionScale=.65;
      ssrPass.enabled=false;
      composer.addPass(ssrPass);

      ssrCompositePass=new ShaderPass({
        uniforms:{
          tDiffuse:{value:null},
          tBeauty:{value:null},
          intensity:{value:1},
        },
        vertexShader:`varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader:`uniform sampler2D tDiffuse; uniform sampler2D tBeauty; uniform float intensity; varying vec2 vUv;
          void main(){
            vec4 beauty=texture2D(tBeauty,vUv);
            vec4 reflection=texture2D(tDiffuse,vUv);
            gl_FragColor=vec4(beauty.rgb+reflection.rgb*reflection.a*intensity,beauty.a);
          }`,
      });
      ssrCompositePass.enabled=false;
      composer.addPass(ssrCompositePass);
    } catch {
      ssrPass=null;
      ssrSavePass=null;
      ssrCompositePass=null;
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
    const saturation=Math.max(0,Number(config.saturation??1.018));
    const contrast=Math.max(0,Number(config.contrast??1.018));
    const warm=.0015;
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

    const { ShaderPass: GradingShaderPass }=await import("three/examples/jsm/postprocessing/ShaderPass.js");
    gradingPass=new GradingShaderPass({
      uniforms:{tDiffuse:{value:null},contrast:{value:Number(config.gradeContrast??1)},saturation:{value:Number(config.gradeSaturation??1)}},
      vertexShader:`varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`uniform sampler2D tDiffuse; uniform float contrast; uniform float saturation; varying vec2 vUv; void main(){vec4 c=texture2D(tDiffuse,vUv); float l=dot(c.rgb,vec3(.2126,.7152,.0722)); c.rgb=mix(vec3(l),c.rgb,saturation); c.rgb=(c.rgb-.5)*contrast+.5; gl_FragColor=c;}`,
    });
    gradingPass.enabled=Boolean(config.gradeEnabled);
    composer.addPass(gradingPass);

    try {
      const { BokehPass }=await import("three/examples/jsm/postprocessing/BokehPass.js");
      dofPass=new BokehPass(scene,camera,{focus:4.0,aperture:0.00065,maxblur:0.006});
      composer.addPass(dofPass);
    } catch {
      dofPass=null;
    }

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
    composer=null; renderPass=null; taaPass=null; ssrPass=null; ssrSavePass=null; ssrCompositePass=null; ssaoPass=null; bloomPass=null; lutPass=null; gradingPass=null; vignettePass=null; dofPass=null; outputPass=null;
  }

  const applyQuality=(next:any)=>{
    if(!composer) return;
    const q=next||{};
    const high=q.pixelRatio>=1.4;
    const ultra=q.pixelRatio>=1.55;

    // iJewel VJSON explicitly enables progressive jitter + TAA. In Three r185,
    // sampleLevel=5 gives the 32-jitter sequence. SSR is composed over the
    // saved TAA beauty so neither stage is silently discarded.
    const taaEnabled=config.taa!==false;
    const progressiveFrames=Math.max(1,Math.min(32,Math.floor(Number(config.progressiveFrameCount??32))));
    const taaSampleLevel=Math.max(0,Math.min(5,Math.ceil(Math.log2(progressiveFrames))));
    const ssrEnabled=Boolean(config.ssr) && high && Boolean(ssrPass) && Boolean(ssrSavePass) && Boolean(ssrCompositePass);
    if(renderPass) renderPass.enabled=true;
    if(taaPass){
      taaPass.enabled=taaEnabled;
      taaPass.accumulate=taaEnabled;
      taaPass.sampleLevel=ultra||high?taaSampleLevel:Math.min(3,taaSampleLevel);
    }
    if(ssrSavePass){
      ssrSavePass.enabled=ssrEnabled;
    }
    if(ssrPass){
      ssrPass.enabled=ssrEnabled;
      ssrPass.output=(ssrPass.constructor as any).OUTPUT?.SSR ?? 1;
      ssrPass.opacity=Math.max(0,Number(config.ssrIntensity??1));
      ssrPass.blur=true;
      ssrPass.fresnel=true;
      ssrPass.distanceAttenuation=true;
      ssrPass.resolutionScale=ultra?.85:high?.65:.45;
      if(Number.isFinite(Number(config.ssrMaxDistance))) ssrPass.maxDistance=Math.max(.05,Number(config.ssrMaxDistance));
      if(Number.isFinite(Number(config.ssrThickness))) ssrPass.thickness=Math.max(.001,Number(config.ssrThickness));
    }
    if(ssrCompositePass){
      ssrCompositePass.enabled=ssrEnabled;
      ssrCompositePass.uniforms.intensity.value=Math.max(0,Number(config.ssrIntensity??1));
      ssrCompositePass.uniforms.tBeauty.value=ssrSavePass?.renderTarget?.texture??null;
    }

    if(ssaoPass){
      ssaoPass.enabled=Boolean(config.ssao) && high;
      ssaoPass.kernelSize=ultra?24:high?20:12;
      const ssaoScale=ultra?.72:high?.82:.70;
      ssaoPass.setSize?.(
        Math.max(1,Math.floor((renderer.domElement.width||renderer.domElement.clientWidth||1)*ssaoScale)),
        Math.max(1,Math.floor((renderer.domElement.height||renderer.domElement.clientHeight||1)*ssaoScale))
      );
      ssaoPass.aoClamp=Math.max(0,Math.min(1,(config.ssaoIntensity??.12)*(ultra?.92:.82)));
    }
    if(bloomPass){
      bloomPass.enabled=Boolean(config.bloom) && high;
      bloomPass.strength=config.bloomIntensity??.035;
      bloomPass.threshold=config.bloomThreshold??1.5;
    }
    if(gradingPass){
      gradingPass.enabled=Boolean(config.gradeEnabled);
      gradingPass.uniforms.contrast.value=Math.max(.5,Math.min(1.8,Number(config.gradeContrast??1)));
      gradingPass.uniforms.saturation.value=Math.max(0,Math.min(2,Number(config.gradeSaturation??1)));
    }
    if(lutPass){
      lutPass.enabled=config.lut!==false;
      lutPass.intensity=Math.max(0,Math.min(1,(config.lutIntensity??.08)*(ultra?1:high?.82:.62)));
    }
    if(dofPass){
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
    if(ssrSavePass){
      ssrSavePass.setSize?.(
        renderer.domElement.width||renderer.domElement.clientWidth||1,
        renderer.domElement.height||renderer.domElement.clientHeight||1
      );
    }
    if(ssrPass){
      ssrPass.setSize?.(
        renderer.domElement.width||renderer.domElement.clientWidth||1,
        renderer.domElement.height||renderer.domElement.clientHeight||1
      );
      ssrPass.resolutionScale=ultra?.85:high?.65:.45;
    }
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
    if(taaPass && moved){
      // Preserve the accumulated image while the camera is still; restart
      // the 32-sample progressive sequence only after actual motion.
      taaPass.accumulate=true;
      taaPass.accumulateIndex=-1;
    }
    lastPX=p.x; lastPY=p.y; lastPZ=p.z;
    lastQX=q.x; lastQY=q.y; lastQZ=q.z; lastQW=q.w;
    if(dofPass?.enabled && dofPass.uniforms){
      const focus=Number.isFinite(focusDistance) ? Number(focusDistance) : 4;
      dofPass.uniforms.focus.value=Math.max(.5,focus);
    }
  };

  applyQuality(quality);
  const setSSRSelects=(objects:any[])=>{
    if(!ssrPass)return;
    ssrPass.selects=Array.isArray(objects)?objects:[];
  };
  return {composer,ssaoPass,ssrPass,setSSRSelects,applyQuality,updateTemporal,dofPass,taaPass};
}
