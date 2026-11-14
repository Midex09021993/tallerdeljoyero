import { getAurumPostControls, subscribeAurumPostControls } from "./post-engine-controls";
import {
  configureAurumEdgeQuality,
  createAurumSurfaceEdgeAaPass,
  setAurumEdgeAaResolution,
  getAurumEdgeAaProfile,
} from "./edge-quality";

/**
 * Configure the gem classification target as categorical data.
 * Nearest sampling preserves a strict gem/non-gem boundary; color filtering
 * remains in the beauty buffer and is applied only after the binary mask gate.
 */
export function configureAurumGemMaskTexture(texture:any, three:any) {
  texture.minFilter=three.NearestFilter;
  texture.magFilter=three.NearestFilter;
  texture.generateMipmaps=false;
  texture.colorSpace=three.NoColorSpace;
  texture.needsUpdate=true;
  return texture;
}

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
  let surfaceEdgeAaPass:any=null;
  let gemMaskPass:any=null;
  let gradingPass:any=null;
  let composerMsaaSamples=0;

  try {
    composer=new EffectComposer(renderer);
    const edgeQuality=configureAurumEdgeQuality(renderer,composer);
    composerMsaaSamples=edgeQuality.msaa.activeSamples;
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
    // This is a categorical ID mask, not an image: never interpolate metal
    // and gemstone coverage at their shared boundary.
    configureAurumGemMaskTexture(gemMaskTarget.texture,THREE);
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
    // Scene classification is stable between model/selection-geometry changes.
    // Reuse these arrays on every frame instead of traversing the whole scene
    // and allocating visibility snapshots inside the hot render path.
    const cachedGemMeshes:any[]=[];
    const previousGemLayerMasks=new Map<any,number>();
    const gemMaskLayer=31;
    const gemMaskLayerBit=1<<gemMaskLayer;
    const cachedClearColor=new THREE.Color();
    let lastGemMaskCameraState:number[]|null=null;
    const readGemMaskCameraState=():number[]=>{
      const position=camera.position;
      const quaternion=camera.quaternion;
      const projection=camera.projectionMatrix?.elements??[];
      const world=camera.matrixWorld?.elements??[];
      return [
        position?.x??0,position?.y??0,position?.z??0,
        quaternion?.x??0,quaternion?.y??0,quaternion?.z??0,quaternion?.w??1,
        ...projection,...world,
      ];
    };
    const refreshGemMaskCache=()=>{
      // A scene/model refresh invalidates the cached mask even if the camera
      // happens to remain at the same transform.
      lastGemMaskCameraState=null;
      // Restore any previous classification before rebuilding. This keeps the
      // dedicated mask layer isolated from the beauty camera and other systems.
      for(const [mesh,originalMask] of previousGemLayerMasks){
        if(mesh?.layers) mesh.layers.mask=originalMask;
      }
      previousGemLayerMasks.clear();
      cachedGemMeshes.length=0;
      scene.traverse((object:any)=>{
        if(!object?.isMesh) return;
        if(getAurumRenderCategory(object)!=="gema") return;
        cachedGemMeshes.push(object);
        if(object.layers){
          previousGemLayerMasks.set(object,object.layers.mask);
          object.layers.enable(gemMaskLayer);
        }
      });
    };
    refreshGemMaskCache();
    gemMaskPass={
      enabled:false,needsSwap:false,clear:false,renderToScreen:false,
      refreshCache:refreshGemMaskCache,
      setSize(width:number,height:number){
        gemMaskTarget.setSize(Math.max(1,width),Math.max(1,height));
      },
      render(activeRenderer:any){
        const gemMeshes=cachedGemMeshes;
        const cameraState=readGemMaskCameraState();
        if(
          lastGemMaskCameraState
          && cameraState.length===lastGemMaskCameraState.length
          && cameraState.every((value,index)=>value===lastGemMaskCameraState![index])
        ){
          // Progressive settled frames reuse the exact same camera-space mask.
          // Camera motion or refreshGemMaskCache() invalidates it automatically.
          return;
        }
        lastGemMaskCameraState=cameraState;
        const previousTarget=activeRenderer.getRenderTarget();
        if(gemMeshes.length===0){
          // Clear stale pixels when a model has no gemstone meshes; never let a
          // previous model's mask cause AA to appear on unrelated metal geometry.
          const previousAutoClear=activeRenderer.autoClear;
          activeRenderer.getClearColor(cachedClearColor);
          const previousClearColor=cachedClearColor;
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
        const previousCameraLayerMask=camera.layers?.mask;
        activeRenderer.getClearColor(cachedClearColor);
        const previousClearColor=cachedClearColor;
        const previousClearAlpha=activeRenderer.getClearAlpha();
        try{
          activeRenderer.setRenderTarget(gemMaskTarget);
          activeRenderer.setClearColor(0x000000,0);
          activeRenderer.autoClear=false;
          activeRenderer.clear(true,true,true);
          scene.background=null;
          // Pass 1: preserve the camera's original layer mask so every visible
          // surface (including foreground metal) writes depth for occlusion.
          scene.overrideMaterial=depthOnlyMaterial;
          activeRenderer.render(scene,camera);
          // Pass 2: render only gems through a dedicated layer. This replaces
          // per-frame visibility snapshots and N mesh.visible writes/restores.
          scene.overrideMaterial=gemMaskMaterial;
          if(camera.layers) camera.layers.mask=gemMaskLayerBit;
          activeRenderer.render(scene,camera);
        }finally{
          if(camera.layers && previousCameraLayerMask!==undefined){
            camera.layers.mask=previousCameraLayerMask;
          }
          scene.overrideMaterial=previousOverride;
          scene.background=previousBackground;
          activeRenderer.autoClear=previousAutoClear;
          activeRenderer.setClearColor(previousClearColor,previousClearAlpha);
          activeRenderer.setRenderTarget(previousTarget);
        }
        fxaaPass.material.uniforms.gemMask.value=gemMaskTarget.texture;
      },
      dispose(){
        for(const [mesh,originalMask] of previousGemLayerMasks){
          if(mesh?.layers) mesh.layers.mask=originalMask;
        }
        previousGemLayerMasks.clear();
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
    // Gem-specific AA keeps its categorical mask so metal pixels never bleed
    // into gemstone edges. It is enabled only for settled/high-quality frames.
    fxaaPass.enabled=false;
    composer.addPass(gemMaskPass);
    composer.addPass(fxaaPass);

    // Conservative full-surface edge AA for polished metal silhouettes and
    // CAD curves. It is intentionally disabled during camera motion and uses
    // a low blend strength to avoid softening specular detail.
    surfaceEdgeAaPass=createAurumSurfaceEdgeAaPass(FXAAShaderPass,THREE);
    composer.addPass(surfaceEdgeAaPass);

    const { OutputPass }=await import("three/examples/jsm/postprocessing/OutputPass.js");
    outputPass=new OutputPass();
    composer.addPass(outputPass);
  } catch (error) {
    // Keep the live viewer resilient, but never hide why the photographic
    // pipeline failed: PNG capture diagnostics need the original exception.
    console.error("[AURUM][POST] No se pudo inicializar el compositor fotográfico; se usará render directo.", error);
    lutPass?.lut?.dispose?.();
    composer?.dispose?.();
    composer=null; renderPass=null; taaPass=null; ssrPass=null; ssrSavePass=null; ssrCompositePass=null; ssaoPass=null; bloomPass=null; lutPass=null; gradingPass=null; vignettePass=null; dofPass=null; outputPass=null; fxaaPass=null; surfaceEdgeAaPass=null; gemMaskPass=null;
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
  let lastKnownBudgetTier = "web";
  let lastKnownHighQuality = false;
  const applyQuality=(next:any, options:{capture?:boolean;width?:number;height?:number}={})=>{
    if(!composer) return;
    const q=next||{};
    const incomingQualityId=String(q?.qualityId??"");
    if(incomingQualityId) lastKnownQualityId=incomingQualityId;
    if(q?.runtimeBudgetTier) lastKnownBudgetTier=String(q.runtimeBudgetTier);
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
    lastKnownHighQuality=high;

    // The photographic profile's canonical switch is "taa". Older preview
    // code also required "temporalAA", a field that the active iJewel profile
    // does not define; that silently disabled TAA after every model load.
    // Motion is handled separately by setTemporalMotion(), never by hiding
    // the configured settled TAA request.
    const isLowQuality=qualityId==="low" || (qualityId==="" && Number(q?.pixelRatio??1.5) <= 1.01);
    // TAA remains capture-only; the Post Engine switch controls whether
    // explicit still captures request temporal accumulation.
    const postControls=getAurumPostControls();
    taaRequested=Boolean(options.capture && postControls.taaEnabled);
    const taaEnabled=taaRequested;
    // Edge AA is a settled-quality treatment: never add fullscreen filtering
    // work to the direct-render orbit path. Still captures may use it explicitly.
    const edgeAaMode=options.capture ? "capture" : "settled";
    const edgeAaProfile=getAurumEdgeAaProfile(qualityId || (high ? "high" : "low"),lastKnownBudgetTier,edgeAaMode);
    const edgeAaEnabled=postControls.gemFxaaEnabled;
    if(gemMaskPass) gemMaskPass.enabled=edgeAaEnabled;
    if(fxaaPass) fxaaPass.enabled=edgeAaEnabled;
    if(surfaceEdgeAaPass) {
      surfaceEdgeAaPass.enabled=postControls.surfaceEdgeAaEnabled;
      const strength=surfaceEdgeAaPass.material?.uniforms?.strength;
      if(strength) strength.value=edgeAaProfile.strength;
    }
    // Keep the interactive/settled preview responsive with one convergence frame.
    // Still captures retain the full 32-frame temporal budget for final image quality.
    const progressiveFrames=options.capture
      ? 32
      : Math.max(1,Math.min(32,Math.floor(Number(config.progressiveFrameCount??1))));
    const taaSampleLevel=Math.max(0,Math.min(5,Math.ceil(Math.log2(progressiveFrames))));
    const ssrEnabled=false;
    if(renderPass) renderPass.enabled=true;
    const updateEdgeAaResolution=()=>{
      // Use the actual composer target dimensions (including capture sizing),
      // not CSS dimensions, so one shader texel maps to one output pixel.
      const target=composer?.renderTarget1??composer?.readBuffer;
      const width=Math.max(1,Number(target?.width)||Number(renderer.domElement.width)||Number(renderer.domElement.clientWidth)||1);
      const height=Math.max(1,Number(target?.height)||Number(renderer.domElement.height)||Number(renderer.domElement.clientHeight)||1);
      const inverseWidth=1/width;
      const inverseHeight=1/height;
      if(fxaaPass?.material?.uniforms?.resolution?.value){
        fxaaPass.material.uniforms.resolution.value.set(inverseWidth,inverseHeight);
      }
      setAurumEdgeAaResolution(surfaceEdgeAaPass,width,height);
    };
    updateEdgeAaResolution();
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
      // Diagnostic isolation: keep SSAO disabled in both moving and settled
      // live-view states so its contribution to the diffuse halo can be tested.
      // Preserve the profile parameters for a later controlled A/B comparison.
      ssaoPass.enabled=false;
      ssaoPass.kernelSize=ultra?24:high?20:12;
      ssaoPass.kernelRadius=Math.max(.01,Number(config.radius??.20));
      ssaoPass.aoClamp=Math.max(0,Math.min(1,(config.ssaoIntensity??.12)*(ultra?.92:.82)));
      ssaoPass.maxDistance=Math.max(.02,Number(config.ssaoFalloff??(ssaoPass.kernelRadius*2.5)));
    }
    if(bloomPass){
      // Diagnostic isolation: disable Bloom in the live composer to verify
      // whether bright metal reflections are producing the visible halo.
      // Keep the configured intensity/threshold intact for a later controlled
      // A/B test; capture paths already select their own pass set.
      bloomPass.enabled=false;
      bloomPass.strength=Math.min(0.04,Math.max(0,Number(config.bloomIntensity??0.035)));
      bloomPass.threshold=Math.max(0.94,Math.min(0.995,Number(config.bloomThreshold??0.96)));
      bloomPass.radius=Math.min(0.38,Math.max(0,Number(config.bloomRadius??0.32)));
    }
    if(gradingPass){
      gradingPass.enabled=false;
      gradingPass.uniforms.contrast.value=Math.max(.5,Math.min(1.8,Number(config.gradeContrast??1)));
      gradingPass.uniforms.saturation.value=Math.max(0,Math.min(2,Number(config.gradeSaturation??1)));
    }
    if(lutPass){
      lutPass.enabled=false;
      lutPass.intensity=Math.max(0,Math.min(1,(config.lutIntensity??.08)*(ultra?1:high?.82:.62)));
    }
    if(dofPass){
      // DOF is explicitly opt-in and should work at every viewer quality tier;
      // the viewer's direct-render interaction path keeps it off during orbit/zoom.
      dofPass.enabled=false;
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
      vignettePass.enabled=false;
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
    updateEdgeAaResolution();
    if(ssaoPass && !options.capture){
      // Composer sizes every pass at the full output resolution. Reapply the
      // intentional SSAO quality scale once so AO does not silently move to full DPR.
      const ssaoScale=ultra?.72:high?.82:.70;
      ssaoPass.setSize?.(
        Math.max(1,Math.floor((renderer.domElement.width||renderer.domElement.clientWidth||1)*ssaoScale)),
        Math.max(1,Math.floor((renderer.domElement.height||renderer.domElement.clientHeight||1)*ssaoScale))
      );
    }
    if(ssrPass){
      // EffectComposer.setSize() already resizes every pass using its active DPR.
      // Only update SSR quality here; a second setSize() reallocates its targets.
      ssrPass.resolutionScale=ultra?.85:high?.65:.45;
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
          gemstoneEdgeAa: Boolean(fxaaPass?.enabled && gemMaskPass?.enabled),
          surfaceEdgeAa: Boolean(surfaceEdgeAaPass?.enabled),
          surfaceEdgeAaStrength: Number(surfaceEdgeAaPass?.material?.uniforms?.strength?.value ?? 0),
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

  const resetTemporalAccumulation=()=>{
    if(!taaPass)return;
    // A scene-lighting change invalidates the accumulated beauty frame even
    // when the camera is stationary. Keep the existing TAA quality/settings.
    taaPass.accumulateIndex=-1;
    taaPass.accumulate=Boolean(taaPass.enabled && !temporalMotionActive);
  };

  const setTemporalMotion=(moving:boolean)=>{
    const next=Boolean(moving);
    const changed=next!==temporalMotionActive;
    temporalMotionActive=next;
    const edgeAaProfile=getAurumEdgeAaProfile(lastKnownQualityId || (lastKnownHighQuality ? "high" : "low"),lastKnownBudgetTier,next ? "live" : "settled");
    const postControls=getAurumPostControls();
    const edgeAaEnabled=postControls.gemFxaaEnabled;
    if(gemMaskPass) gemMaskPass.enabled=edgeAaEnabled;
    if(fxaaPass) fxaaPass.enabled=edgeAaEnabled;
    if(surfaceEdgeAaPass) {
      surfaceEdgeAaPass.enabled=postControls.surfaceEdgeAaEnabled;
      const strength=surfaceEdgeAaPass.material?.uniforms?.strength;
      if(strength) strength.value=edgeAaProfile.strength;
    }
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
  // Reflect Post Engine switches immediately without waiting for a quality/profile rebuild.
  const unsubscribePostControls=subscribeAurumPostControls((controls)=>{
    const enabled=Boolean(controls.gemFxaaEnabled);
    if(gemMaskPass) gemMaskPass.enabled=enabled;
    if(fxaaPass) fxaaPass.enabled=enabled;
    if(surfaceEdgeAaPass) surfaceEdgeAaPass.enabled=Boolean(controls.surfaceEdgeAaEnabled);
  });
  if(composer?.dispose){
    const disposeComposer=composer.dispose.bind(composer);
    composer.dispose=()=>{
      unsubscribePostControls();
      disposeComposer();
    };
  }
  const setSSRSelects=(objects:any[])=>{
    if(!ssrPass)return;
    ssrPass.selects=Array.isArray(objects)?objects:[];
  };
  return {composer,renderPass,ssaoPass,ssrPass,ssrSavePass,ssrCompositePass,bloomPass,setSSRSelects,applyQuality,updateTemporal,resetTemporalAccumulation,setTemporalMotion,dofPass,taaPass,fxaaPass,surfaceEdgeAaPass,gemMaskPass,outputPass,msaaSamples:composerMsaaSamples};
}