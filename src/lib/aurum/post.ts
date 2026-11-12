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
  let fxaaPass:any=null;
  let gemMaskPass:any=null;
  let gradingPass:any=null;

  try {
    // Improve geometric silhouette coverage for polished metal without
    // applying the gemstone-only Soft Edge AA shader to metal pixels.
    // Request up to 8x MSAA; the GPU's real maxSamples is always authoritative.
    const supportsLiveMsaa = Boolean(renderer.capabilities?.isWebGL2);
    const maxLiveSamples = Math.max(0, Number(renderer.capabilities?.maxSamples ?? 0));
    const requestedLiveSamples = Math.max(0, Math.min(8, Number(config?.liveMsaaSamples ?? 8)));
    const liveMsaaSamples = supportsLiveMsaa
      ? Math.min(requestedLiveSamples, maxLiveSamples)
      : 0;
    if (liveMsaaSamples > 0) {
      const { WebGLRenderTarget, HalfFloatType } = await import("three");
      const liveTarget = new WebGLRenderTarget(
        Math.max(1, renderer.domElement.width),
        Math.max(1, renderer.domElement.height),
        { type: HalfFloatType, depthBuffer: true, stencilBuffer: false }
      );
      liveTarget.samples = liveMsaaSamples;
      composer = new EffectComposer(renderer, liveTarget);
    } else {
      composer = new EffectComposer(renderer);
    }
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
        groundReflector:null,
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
    ssaoPass.maxDistance=Math.max(.02,Number(config.ssaoFalloff??(ssaoPass.kernelRadius*2.5)));
    ssaoPass.output=(SSAOPass as any).OUTPUT.Default;
    ssaoPass.aoClamp=Math.max(0,Math.min(1,config.ssaoIntensity??config.intensity??.12));
    composer.addPass(ssaoPass);

    const { UnrealBloomPass }=await import("three/examples/jsm/postprocessing/UnrealBloomPass.js");
    bloomPass=new UnrealBloomPass(
      {x:renderer.domElement.width,y:renderer.domElement.height} as any,
      config.bloomIntensity??.035,Number(config.bloomRadius??.35),config.bloomThreshold??1.5
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
    gradingPass.enabled=!config.capture && Boolean(config.gradeEnabled);
    composer.addPass(gradingPass);

    try {
      const { BokehPass }=await import("three/examples/jsm/postprocessing/BokehPass.js");
      dofPass=new BokehPass(scene,camera,{focus:4.0,aperture:0.00065,maxblur:0.006});
      composer.addPass(dofPass);
    } catch (error) {
      dofPass=null;
      console.error("[AURUM][DOF] BokehPass initialization failed", error);
    }

    const { ShaderPass }=await import("three/examples/jsm/postprocessing/ShaderPass.js");
    vignettePass=new ShaderPass({
      uniforms:{tDiffuse:{value:null},offset:{value:config.vignetteOffset??1.0},darkness:{value:config.vignetteDarkness??.055}},
      vertexShader:`varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`uniform sampler2D tDiffuse; uniform float offset; uniform float darkness; varying vec2 vUv; void main(){vec4 c=texture2D(tDiffuse,vUv); vec2 p=vUv-.5; float d=dot(p,p)*2.0; float vig=smoothstep(offset*.55,offset,d); c.rgb*=1.0-vig*darkness; gl_FragColor=c;}`,
    });
    composer.addPass(vignettePass);

    const { ShaderPass: FXAAShaderPass }=await import("three/examples/jsm/postprocessing/ShaderPass.js");
    const THREE=await import("three");
    // Render a material-ID mask using existing Rhino metadata. The depth prepass
    // includes every object, while the color pass writes white only for gems.
    // This keeps foreground metal occlusion correct without touching materials.
    const gemMaskTarget=new THREE.WebGLRenderTarget(
      Math.max(1,renderer.domElement.width),
      Math.max(1,renderer.domElement.height),
      {format:THREE.RGBAFormat,type:THREE.UnsignedByteType,depthBuffer:true,stencilBuffer:false}
    );
    gemMaskTarget.texture.minFilter=THREE.LinearFilter;
    gemMaskTarget.texture.magFilter=THREE.LinearFilter;
    gemMaskTarget.texture.generateMipmaps=false;
    const depthOnlyMaterial=new THREE.MeshBasicMaterial({
      color:0x000000,side:THREE.DoubleSide,depthTest:true,depthWrite:true,colorWrite:false
    });
    const gemMaskMaterial=new THREE.MeshBasicMaterial({
      color:0xffffff,side:THREE.DoubleSide,depthTest:true,depthWrite:false,
      depthFunc:THREE.EqualDepth,toneMapped:false
    });
    const getAurumRenderCategory=(object:any):string=>{
      let current=object;
      while(current){
        const category=String(current.userData?.aurumRhino?.categoria??"").trim().toLowerCase();
        if(category) return category;
        current=current.parent;
      }
      return "otro";
    };
    gemMaskPass={
      enabled:false,needsSwap:false,clear:false,renderToScreen:false,
      setSize(width:number,height:number){
        gemMaskTarget.setSize(Math.max(1,width),Math.max(1,height));
      },
      render(activeRenderer:any){
        const gemMeshes:any[]=[];
        scene.traverse((object:any)=>{
          if(object?.isMesh && getAurumRenderCategory(object)==="gema") gemMeshes.push(object);
        });
        const previousTarget=activeRenderer.getRenderTarget();
        if(gemMeshes.length===0){
          // Clear stale pixels when a model has no gemstone meshes; never let a
          // previous model's mask cause AA to appear on unrelated metal geometry.
          const previousAutoClear=activeRenderer.autoClear;
          const previousClearColor=activeRenderer.getClearColor(new THREE.Color()).clone();
          const previousClearAlpha=activeRenderer.getClearAlpha();
          try{
            activeRenderer.setRenderTarget(gemMaskTarget);
            activeRenderer.setClearColor(0x000000,0);
            activeRenderer.autoClear=false;
            activeRenderer.clear(true,true,true);
          }finally{
            activeRenderer.autoClear=previousAutoClear;
            activeRenderer.setClearColor(previousClearColor,previousClearAlpha);
            activeRenderer.setRenderTarget(previousTarget);
          }
          fxaaPass.material.uniforms.gemMask.value=gemMaskTarget.texture;
          return;
        }
        const previousOverride=scene.overrideMaterial;
        const previousBackground=scene.background;
        const previousAutoClear=activeRenderer.autoClear;
        const previousClearColor=activeRenderer.getClearColor(new THREE.Color()).clone();
        const previousClearAlpha=activeRenderer.getClearAlpha();
        const meshVisibility:any[]=[];
        scene.traverse((object:any)=>{if(object?.isMesh) meshVisibility.push([object,object.visible]);});
        try{
          activeRenderer.setRenderTarget(gemMaskTarget);
          activeRenderer.setClearColor(0x000000,0);
          activeRenderer.autoClear=false;
          activeRenderer.clear(true,true,true);
          scene.background=null;
          scene.overrideMaterial=depthOnlyMaterial;
          activeRenderer.render(scene,camera);
          scene.traverse((object:any)=>{
            if(object?.isMesh && getAurumRenderCategory(object)!=="gema") object.visible=false;
          });
          scene.overrideMaterial=gemMaskMaterial;
          activeRenderer.render(scene,camera);
        }finally{
          for(const [mesh,visible] of meshVisibility) mesh.visible=visible;
          scene.overrideMaterial=previousOverride;
          scene.background=previousBackground;
          activeRenderer.autoClear=previousAutoClear;
          activeRenderer.setClearColor(previousClearColor,previousClearAlpha);
          activeRenderer.setRenderTarget(previousTarget);
        }
        fxaaPass.material.uniforms.gemMask.value=gemMaskTarget.texture;
      },
      dispose(){
        gemMaskTarget.dispose();
        depthOnlyMaterial.dispose();
        gemMaskMaterial.dispose();
      }
    };
    // AURUM Soft Edge AA is composited only inside pixels belonging to visible
    // gemstone meshes. Metals and all other geometry retain their original pixels.
    fxaaPass=new FXAAShaderPass({
      uniforms:{
        tDiffuse:{value:null},
        gemMask:{value:gemMaskTarget.texture},
        resolution:{value:new THREE.Vector2(1,1)},
        strength:{value:0.16},
        edgeThreshold:{value:0.20},
      },
      vertexShader:`varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`uniform sampler2D tDiffuse; uniform sampler2D gemMask; uniform vec2 resolution; uniform float strength; uniform float edgeThreshold; varying vec2 vUv;
        float luma(vec3 c){return dot(c,vec3(0.2126,0.7152,0.0722));}
        void main(){
          vec4 center=texture2D(tDiffuse,vUv);
          if(texture2D(gemMask,vUv).r<0.5){gl_FragColor=center;return;}
          vec2 px=max(resolution,vec2(0.000001));
          vec2 uv0=vUv+vec2(-px.x,-px.y);
          vec2 uv1=vUv+vec2( px.x,-px.y);
          vec2 uv2=vUv+vec2(-px.x, px.y);
          vec2 uv3=vUv+vec2( px.x, px.y);
          // Only gemstone samples may contribute to the filtered gemstone pixel.
          // Metal/background samples are excluded from the neighborhood entirely.
          float m0=step(0.5,texture2D(gemMask,uv0).r);
          float m1=step(0.5,texture2D(gemMask,uv1).r);
          float m2=step(0.5,texture2D(gemMask,uv2).r);
          float m3=step(0.5,texture2D(gemMask,uv3).r);
          vec3 n0=mix(center.rgb,texture2D(tDiffuse,uv0).rgb,m0);
          vec3 n1=mix(center.rgb,texture2D(tDiffuse,uv1).rgb,m1);
          vec3 n2=mix(center.rgb,texture2D(tDiffuse,uv2).rgb,m2);
          vec3 n3=mix(center.rgb,texture2D(tDiffuse,uv3).rgb,m3);
          float lo=min(luma(center.rgb),min(min(luma(n0),luma(n1)),min(luma(n2),luma(n3))));
          float hi=max(luma(center.rgb),max(max(luma(n0),luma(n1)),max(luma(n2),luma(n3))));
          float edge=smoothstep(edgeThreshold,edgeThreshold*2.0,hi-lo);
          float sampleWeight=max(0.0001,m0+m1+m2+m3);
          vec3 diagonal=(n0*m0+n1*m1+n2*m2+n3*m3)/sampleWeight;
          float blendAmount=edge*strength;
          gl_FragColor=vec4(mix(center.rgb,diagonal,blendAmount),center.a);
        }`,
    });
    fxaaPass.enabled=false;
    composer.addPass(gemMaskPass);
    composer.addPass(fxaaPass);

    const { OutputPass }=await import("three/examples/jsm/postprocessing/OutputPass.js");
    outputPass=new OutputPass();
    composer.addPass(outputPass);
  } catch (error) {
    // Keep the live viewer resilient, but never hide why the photographic
    // pipeline failed: PNG capture diagnostics need the original exception.
    console.error("[AURUM][POST] No se pudo inicializar el compositor fotográfico; se usará render directo.", error);
    lutPass?.lut?.dispose?.();
    composer?.dispose?.();
    composer=null; renderPass=null; taaPass=null; ssrPass=null; ssrSavePass=null; ssrCompositePass=null; ssaoPass=null; bloomPass=null; lutPass=null; gradingPass=null; vignettePass=null; dofPass=null; outputPass=null;
  }

  const diagnosticParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;
  // Official default = validated "environment" profile; "?aurumDiag=standard" for A/B.
  const diagnosticMode = diagnosticParams?.get("aurumDiag") ?? "environment";
  // Controlled A/B switch: only available in environment diagnostic mode.
  // Normal Aurum Render behavior is unchanged unless aurumDiag=environment
  // and aurumSSR=off are both explicitly present in the URL.
  const diagnosticSSROverride = diagnosticParams?.get("aurumSSR");
  const diagnosticDisableSSR = diagnosticMode === "environment" && diagnosticSSROverride === "off";
  // SSR force-on is intentionally suspended in the primary viewer until the
  // reflection audit is complete, including when aurumSSR=on is supplied.
  const diagnosticForceSSR = false;
  // Reversible A/B diagnostic: disable only SSAO to identify artificial dark
  // contact grooves on polished metal. Requires explicit environment mode.
  const diagnosticDisableSSAO = diagnosticMode === "environment"
    && diagnosticParams?.get("aurumSSAO") === "off";
  let lastDiagnosticSignature = "";
  let lastKnownQualityId = "";
  const applyQuality=(next:any, options:{capture?:boolean;width?:number;height?:number}={})=>{
    if(!composer) return;
    const q=next||{};
    const incomingQualityId=String(q?.qualityId??"");
    if(incomingQualityId) lastKnownQualityId=incomingQualityId;
    // Some scene/profile updates re-apply the render-quality object without
    // its UI ID. Preserve the last selected ID for correct pass gating/diagnostics.
    const qualityId=incomingQualityId || lastKnownQualityId;
    // The environment diagnostic deliberately enables the high-quality passes
    // so we can inspect the photographic pipeline even when the adaptive
    // runtime budget reports an empty quality ID / pixel ratio near 1.0.
    // This override is URL-opt-in only; normal rendering keeps its quality gates.
    const diagnosticHigh = diagnosticMode === "environment";
    const high=diagnosticHigh || qualityId==="high" || qualityId==="ultra" || q.pixelRatio>=1.4;
    const ultra=qualityId==="ultra" || q.pixelRatio>=1.55;

    // TAA is opt-in for the interactive viewer: its temporal accumulation can
    // wash out or soften the live jewelry preview when camera motion resets
    // the sample history. Captures keep TAA enabled; preview requires both
    // temporalAA and taa to be explicitly true.
    const isLowQuality=qualityId==="low" || (qualityId==="" && Number(q?.pixelRatio??1.5) <= 1.01);
    taaRequested=Boolean(options.capture) || (config.temporalAA===true && config.taa===true && !isLowQuality);
    const taaEnabled=taaRequested && !temporalMotionActive;
    const progressiveFrames=Math.max(1,Math.min(32,Math.floor(Number(config.progressiveFrameCount??32))));
    const taaSampleLevel=Math.max(0,Math.min(5,Math.ceil(Math.log2(progressiveFrames))));
    const ssrEnabled=!options.capture && (diagnosticForceSSR || (!diagnosticDisableSSR && Boolean(config.ssr))) && high && Boolean(ssrPass) && Boolean(ssrSavePass) && Boolean(ssrCompositePass);
    if(renderPass) renderPass.enabled=true;
    if(fxaaPass){
      const width=Math.max(1,renderer.domElement.width||renderer.domElement.clientWidth||1);
      const height=Math.max(1,renderer.domElement.height||renderer.domElement.clientHeight||1);
      fxaaPass.material.uniforms.resolution.value.set(1/width,1/height);
    }
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
      ssaoPass.enabled=!options.capture && Boolean(config.ssao) && high && !diagnosticDisableSSAO;
      ssaoPass.kernelSize=ultra?24:high?20:12;
      // Keep the live SSAO radius synchronized with the active photographic profile.
      ssaoPass.kernelRadius=Math.max(.01,Number(config.radius??.20));
      const ssaoScale=ultra?.72:high?.82:.70;
      ssaoPass.setSize?.(
        Math.max(1,Math.floor((renderer.domElement.width||renderer.domElement.clientWidth||1)*ssaoScale)),
        Math.max(1,Math.floor((renderer.domElement.height||renderer.domElement.clientHeight||1)*ssaoScale))
      );
      ssaoPass.aoClamp=Math.max(0,Math.min(1,(config.ssaoIntensity??.12)*(ultra?.92:.82)));
      ssaoPass.maxDistance=Math.max(.02,Number(config.ssaoFalloff??(ssaoPass.kernelRadius*2.5)));
    }
    if(bloomPass){
      // Bloom is only active for profiles that explicitly request it and is
      // excluded from the lightweight PNG AA-only capture path.
      bloomPass.enabled=!options.capture && Boolean(config.bloom) && high;
      // The beauty buffer is already tone-mapped by the live material pipeline.
      // A threshold above 1.0 therefore starves UnrealBloomPass of highlights.
      // Use a near-white threshold and a restrained radius/strength so only
      // the brightest specular peaks produce a soft photographic halo.
      // Keep this conservative: the pass is luminance-selective, not material-
      // isolated, so it must not create broad glow around ordinary metal reflections.
      bloomPass.strength=Math.min(0.04,Math.max(0,Number(config.bloomIntensity??0.035)));
      bloomPass.threshold=Math.max(0.94,Math.min(0.995,Number(config.bloomThreshold??0.96)));
      bloomPass.radius=Math.min(0.38,Math.max(0,Number(config.bloomRadius??0.32)));
    }
    if(gradingPass){
      gradingPass.enabled=!options.capture && Boolean(config.gradeEnabled);
      gradingPass.uniforms.contrast.value=Math.max(.5,Math.min(1.8,Number(config.gradeContrast??1)));
      gradingPass.uniforms.saturation.value=Math.max(0,Math.min(2,Number(config.gradeSaturation??1)));
    }
    if(lutPass){
      lutPass.enabled=!options.capture && config.lut!==false && !isLowQuality;
      lutPass.intensity=Math.max(0,Math.min(1,(config.lutIntensity??.08)*(ultra?1:high?.82:.62)));
    }
    if(dofPass){
      // DOF is explicitly opt-in and should work at every viewer quality tier;
      // the viewer's direct-render interaction path keeps it off during orbit/zoom.
      dofPass.enabled=config.dof===true;
      if(dofPass.uniforms){
        dofPass.uniforms.aperture.value=Math.max(0,Number(config.dofAperture??0.00065));
        dofPass.uniforms.maxblur.value=Math.max(0,Number(config.dofMaxBlur??0.006));
      }
      if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("aurumDofDiag")) {
        console.info("[AURUM][DOF] applyQuality", {
          requested: config.dof === true,
          enabled: dofPass.enabled,
          qualityId,
          high,
          ultra,
          aperture: dofPass.uniforms?.aperture?.value,
          maxblur: dofPass.uniforms?.maxblur?.value,
          focus: dofPass.uniforms?.focus?.value,
          passIndex: composer?.passes?.indexOf(dofPass) ?? -1,
          passCount: composer?.passes?.length ?? 0,
        });
      }
    }
    if(vignettePass){
      vignettePass.enabled=!options.capture && config.vignette!==false && !isLowQuality;
      vignettePass.uniforms.darkness.value=Math.max(0,Math.min(.18,Number(config.vignetteDarkness??.055)));
      vignettePass.uniforms.offset.value=Math.max(.55,Math.min(1.4,Number(config.vignetteOffset??1.0)));
    }
    const finalPixelRatio=options.capture?1:Math.max(1,Math.min(1.75,Number(q.pixelRatio??1.5)));
    composer.setPixelRatio?.(finalPixelRatio);
    if(options.capture && Number(options.width)>0 && Number(options.height)>0){
      // A still capture renders the full target size, independent of the
      // viewer's CSS dimensions. Keep DPR at 1 to avoid double scaling.
      composer.setSize?.(Math.floor(Number(options.width)),Math.floor(Number(options.height)));
    }else{
      composer.setSize?.(renderer.domElement.clientWidth||renderer.domElement.width,renderer.domElement.clientHeight||renderer.domElement.height);
    }
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
    if(diagnosticMode === "environment") {
      const state = {
        qualityId,
        pixelRatio: Number(q?.pixelRatio ?? 1.5),
        capture: Boolean(options.capture),
        toneMapping: renderer.toneMapping ?? null,
        toneMappingExposure: renderer.toneMappingExposure ?? null,
        requested: {
          ssao: Boolean(config.ssao),
          bloom: Boolean(config.bloom),
          ssr: Boolean(config.ssr),
          taa: Boolean(config.taa),
          gradeEnabled: Boolean(config.gradeEnabled),
          gradeContrast: Number(config.gradeContrast ?? 1),
          gradeSaturation: Number(config.gradeSaturation ?? 1),
        },
        activePasses: {
          taa: Boolean(taaPass?.enabled),
          ssr: Boolean(ssrPass?.enabled),
          ssao: Boolean(ssaoPass?.enabled),
          bloom: Boolean(bloomPass?.enabled),
          lut: Boolean(lutPass?.enabled),
          grading: Boolean(gradingPass?.enabled),
          vignette: Boolean(vignettePass?.enabled),
        },
        reflectionPipeline: {
          ssrOpacity: Number(ssrPass?.opacity ?? 0),
          ssrResolutionScale: Number(ssrPass?.resolutionScale ?? 0),
          ssrCompositeIntensity: Number(ssrCompositePass?.uniforms?.intensity?.value ?? 0),
          ssrCompositeHasBeauty: Boolean(ssrCompositePass?.uniforms?.tBeauty?.value),
          ssrSelectedMeshCount: Array.isArray(ssrPass?.selects) ? ssrPass.selects.length : null,
          ssrDiagnosticOverride: diagnosticDisableSSR ? "forced-off" : diagnosticForceSSR ? "forced-on" : "default-off",
          ssaoDiagnosticOverride: diagnosticDisableSSAO ? "forced-off" : "default",
          ssaoKernelRadius: Number(ssaoPass?.kernelRadius ?? 0),
          ssaoClamp: Number(ssaoPass?.aoClamp ?? 0),
          ssaoMaxDistance: Number(ssaoPass?.maxDistance ?? 0),
          bloomStrength: Number(bloomPass?.strength ?? 0),
          bloomThreshold: Number(bloomPass?.threshold ?? 0),
          bloomRadius: Number(bloomPass?.radius ?? 0),
        },
      };
      const signature = JSON.stringify(state);
      if (signature !== lastDiagnosticSignature) {
        lastDiagnosticSignature = signature;
        console.info("[AURUM][POST][DIAGNOSTIC]", state);
      }
    }
  };

  let taaRequested=false;
  let temporalMotionActive=false;
  let lastPX=NaN,lastPY=NaN,lastPZ=NaN,lastQX=NaN,lastQY=NaN,lastQZ=NaN,lastQW=NaN;
  let lastLoggedFocus=NaN;
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
      // Three.js BokehPass expects focus as a camera-space distance, not a
      // normalized depth-buffer value. Keep the measured world-space distance
      // so the focus plane stays on the jewelry instead of near the far plane.
      const distance=Number.isFinite(focusDistance) ? Number(focusDistance) : 4;
      const near=Math.max(0.0001,Number(camera.near)||0.1);
      const far=Math.max(near+0.0001,Number(camera.far)||1000);
      const safeDistance=Math.max(near+0.0001,Math.min(far,distance));
      dofPass.uniforms.focus.value=safeDistance;
      if (
        typeof window !== "undefined"
        && new URLSearchParams(window.location.search).has("aurumDofDiag")
        && (!Number.isFinite(lastLoggedFocus) || Math.abs(safeDistance - lastLoggedFocus) >= 0.02)
      ) {
        lastLoggedFocus = safeDistance;
        console.info("[AURUM][DOF] focus plane", {
          worldDistance: distance,
          cameraNear: near,
          cameraFar: far,
          focusUniform: dofPass.uniforms.focus.value,
        });
      }
    }
  };

  const setTemporalMotion=(moving:boolean)=>{
    const next=Boolean(moving);
    const changed=next!==temporalMotionActive;
    temporalMotionActive=next;
    if(!taaPass)return;
    // Hard-disable temporal accumulation on every interaction start, even if
    // a previous state transition left the motion flag unchanged.
    if(next){
      taaPass.enabled=false;
      taaPass.accumulate=false;
      taaPass.accumulateIndex=-1;
      return;
    }
    // At rest, start a fresh history only when the settled profile requested TAA.
    if(changed){
      taaPass.accumulate=false;
      taaPass.accumulateIndex=-1;
      taaPass.enabled=taaRequested;
      if(taaPass.enabled)taaPass.accumulate=true;
    }
  };

  applyQuality(quality);
  const setSSRSelects=(objects:any[])=>{
    if(!ssrPass)return;
    ssrPass.selects=Array.isArray(objects)?objects:[];
  };
  return {composer,renderPass,ssaoPass,ssrPass,ssrSavePass,ssrCompositePass,bloomPass,setSSRSelects,applyQuality,updateTemporal,setTemporalMotion,dofPass,taaPass,fxaaPass,gemMaskPass,outputPass};
}