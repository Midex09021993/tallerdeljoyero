import { getAurumPostControls, subscribeAurumPostControls } from "./post-engine-controls";
import {
  configureAurumEdgeQuality,
  createAurumSurfaceEdgeAaPass,
  setAurumEdgeAaResolution,
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
  let diamondTaaSavePass:any=null;
  let diamondTaaCompositePass:any=null;
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
  let diamondSupersamplePass:any=null;
  let diamondSupersampleCompositePass:any=null;
  let diamondSupersampleTarget:any=null;
  let diamondSupersampleMaskTarget:any=null;
  let diamondSupersampleFxaaTarget:any=null;
  let gradingPass:any=null;
  let composerMsaaSamples=0;
  // Shared SSAA state lives at the pipeline scope because motion controls are
  // exposed after the composer-initialization try block has completed.
  let diamondSupersampleBaseWidth=Math.max(1,renderer.domElement.width);
  let diamondSupersampleBaseHeight=Math.max(1,renderer.domElement.height);
  let diamondSupersampleScale=2;
  let diamondSupersampleScaleCap=2;
  let diamondLiveSupersampleScaleCap=1.5;
  let diamondSupersamplingSettled=true;
  const updateDiamondSupersampleScale=()=>{
    const basePixels=diamondSupersampleBaseWidth*diamondSupersampleBaseHeight;
    diamondSupersampleScale=basePixels>8_500_000
      ? 1
      : Math.max(1,Math.min(diamondSupersampleScaleCap,Math.sqrt(8_500_000/Math.max(1,basePixels))));
    return diamondSupersampleScale>=1;
  };

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
    // Optional 2x reference render. It renders the complete scene so the
    // diamond keeps physically correct transmission/refraction and occlusion.
    // Its result is composited ONLY through the center-diamond mask.
    // Shared SSAA state is declared at pipeline scope for motion-control access.
    const ensureDiamondSupersampleTarget=()=>{
      if(!updateDiamondSupersampleScale()) return null;
      if(!diamondSupersampleTarget){
        diamondSupersampleTarget=new THREE.WebGLRenderTarget(
          Math.max(2,Math.floor(diamondSupersampleBaseWidth*diamondSupersampleScale)),
          Math.max(2,Math.floor(diamondSupersampleBaseHeight*diamondSupersampleScale)),
          {format:THREE.RGBAFormat,type:THREE.HalfFloatType,depthBuffer:true,stencilBuffer:false}
        );
        diamondSupersampleTarget.texture.minFilter=THREE.LinearFilter;
        diamondSupersampleTarget.texture.magFilter=THREE.LinearFilter;
        diamondSupersampleTarget.texture.generateMipmaps=false;
        diamondSupersampleTarget.texture.colorSpace=THREE.NoColorSpace;
        if(diamondSupersampleCompositePass){
          diamondSupersampleCompositePass.material.uniforms.tDiamondHiRes.value=diamondSupersampleTarget.texture;
        }
      }
      return diamondSupersampleTarget;
    };
    const ensureDiamondSupersampleMaskTarget=()=>{
      if(!updateDiamondSupersampleScale()) return null;
      const width=Math.max(2,Math.floor(diamondSupersampleBaseWidth*diamondSupersampleScale));
      const height=Math.max(2,Math.floor(diamondSupersampleBaseHeight*diamondSupersampleScale));
      if(!diamondSupersampleMaskTarget){
        diamondSupersampleMaskTarget=new THREE.WebGLRenderTarget(width,height,{
          format:THREE.RGBAFormat,type:THREE.UnsignedByteType,depthBuffer:true,stencilBuffer:false
        });
        configureAurumGemMaskTexture(diamondSupersampleMaskTarget.texture,THREE);
      }else if(diamondSupersampleMaskTarget.width!==width||diamondSupersampleMaskTarget.height!==height){
        diamondSupersampleMaskTarget.setSize(width,height);
      }
      if(diamondSupersampleCompositePass?.material?.uniforms?.tDiamondHiResMask){
        diamondSupersampleCompositePass.material.uniforms.tDiamondHiResMask.value=diamondSupersampleMaskTarget.texture;
      }
      return diamondSupersampleMaskTarget;
    };
    const ensureDiamondSupersampleFxaaTarget=()=>{
      if(!updateDiamondSupersampleScale()) return null;
      const width=Math.max(2,Math.floor(diamondSupersampleBaseWidth*diamondSupersampleScale));
      const height=Math.max(2,Math.floor(diamondSupersampleBaseHeight*diamondSupersampleScale));
      if(!diamondSupersampleFxaaTarget){
        diamondSupersampleFxaaTarget=new THREE.WebGLRenderTarget(width,height,{format:THREE.RGBAFormat,type:THREE.HalfFloatType,depthBuffer:false,stencilBuffer:false});
        diamondSupersampleFxaaTarget.texture.minFilter=THREE.LinearFilter;
        diamondSupersampleFxaaTarget.texture.magFilter=THREE.LinearFilter;
        diamondSupersampleFxaaTarget.texture.generateMipmaps=false;
        diamondSupersampleFxaaTarget.texture.colorSpace=THREE.NoColorSpace;
      }else if(diamondSupersampleFxaaTarget.width!==width||diamondSupersampleFxaaTarget.height!==height){
        diamondSupersampleFxaaTarget.setSize(width,height);
      }
      return diamondSupersampleFxaaTarget;
    };
    const depthOnlyMaterial=new THREE.MeshBasicMaterial({
      color:0x000000,side:THREE.DoubleSide,depthTest:true,depthWrite:true,colorWrite:false
    });
    const gemMaskMaterial=new THREE.MeshBasicMaterial({
      color:0xffffff,side:THREE.DoubleSide,depthTest:true,depthWrite:false,
      depthFunc:THREE.LessEqualDepth,toneMapped:false
    });
    // Non-diamond material groups participate in the full-scene depth prepass,
    // but cannot write color or depth during the diamond-only mask pass.
    const nonDiamondMaskMaterial=new THREE.MeshBasicMaterial({
      color:0x000000,side:THREE.DoubleSide,depthTest:true,depthWrite:false,
      colorWrite:false,toneMapped:false
    });
    const isDiamondFamily=(value:any)=>String(value??"").trim().toLowerCase()==="diamante";
    const getDiamondMaterialSlots=(mesh:any):Set<number>=>{
      const materials=Array.isArray(mesh?.material)?mesh.material:[mesh?.material];
      const data=mesh?.userData??{};
      const rhino=data.aurumRhino??{};
      const family=isDiamondFamily(data.aurumActiveGemFamily??data.aurumGemFamily)
        || String(data.aurumActiveGemId??data.aurumGemId??"").trim().toLowerCase().startsWith("diamante");
      const category=String(rhino.categoria??data.aurumDetectedCategory??data.aurumCategory??"").trim().toLowerCase();
      const layerName=String(
        rhino.capa
        ?? data.aurumDetectedLayer
        ?? data.aurumRhinoSource?.layerName
        ?? data.aurumRhinoInstanceSource?.layerName
        ?? data.attributes?.layerName
        ?? data.attributes?.LayerName
        ?? data.layerName
        ?? ""
      ).trim().toLowerCase().replace(/[_-]+/g," ").replace(/\s+/g," ");
      // Rhino's Gem 01–04 layers define the gemstone domain, not the
      // gemstone identity by themselves. Require the explicit gema category
      // AND diamond family metadata so metal meshes sharing a layer cannot
      // enter the diamond mask.
      const isGemLayer=/^gem 0?[1-4]$/.test(layerName);
      const objectIsDiamond=isGemLayer&&category==="gema"&&family;
      const diamondSlots=new Set<number>();
      materials.forEach((material:any,index:number)=>{
        // For multi-material meshes, trust each slot's own family metadata.
        // Object-level tags may classify a single-material mesh only; they must
        // never turn adjacent metal groups into diamond mask pixels.
        const slotIsDiamond=isGemLayer&&category==="gema"&&(
          isDiamondFamily(material?.userData?.aurumGemFamily)
          || (materials.length===1&&objectIsDiamond)
        );
        if(slotIsDiamond) diamondSlots.add(index);
      });
      if(materials.length===1&&objectIsDiamond&&!mesh?.geometry?.groups?.length) return diamondSlots;
      if(materials.length>1){
        const groups=Array.isArray(mesh?.geometry?.groups)?mesh.geometry.groups:[];
        const visibleDiamondGroup=groups.some((group:any)=>diamondSlots.has(Number(group?.materialIndex??0)));
        if(!visibleDiamondGroup) diamondSlots.clear();
      }
      return diamondSlots;
    };
    const cachedGemMeshes:any[]=[];
    const diamondMaskMaterialsByMesh=new Map<any,any>();
    // Beauty materials used by the isolated SSAA pass. Multi-material meshes
    // keep their original diamond slots; every non-diamond slot is colorless.
    const diamondSupersampleMaterialsByMesh=new Map<any,any>();
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
      lastGemMaskCameraState=null;
      for(const [mesh,originalMask] of previousGemLayerMasks){
        if(mesh?.layers) mesh.layers.mask=originalMask;
      }
      previousGemLayerMasks.clear();
      cachedGemMeshes.length=0;
      diamondMaskMaterialsByMesh.clear();
      diamondSupersampleMaterialsByMesh.clear();
      const centerDiamondMeshes:any[]=[];
      scene.updateMatrixWorld?.(true);
      scene.traverse((object:any)=>{
        if(!object?.isMesh||!object.geometry||object.userData?.aurumInternalInclusion) return;
        const slots=getDiamondMaterialSlots(object);
        if(slots.size===0) return;
        const materials=Array.isArray(object.material)?object.material:[object.material];
        if(materials.length>1){
          const groups=Array.isArray(object.geometry.groups)?object.geometry.groups:[];
          if(!groups.some((group:any)=>slots.has(Number(group?.materialIndex??0)))) return;
          diamondMaskMaterialsByMesh.set(object,materials.map((_:any,index:number)=>slots.has(index)?gemMaskMaterial:nonDiamondMaskMaterial));
          diamondSupersampleMaterialsByMesh.set(object,materials.map((material:any,index:number)=>slots.has(index)?material:nonDiamondMaskMaterial));
        }else{
          diamondMaskMaterialsByMesh.set(object,gemMaskMaterial);
          diamondSupersampleMaterialsByMesh.set(object,object.material);
        }
        centerDiamondMeshes.push(object);
      });
      centerDiamondMeshes.forEach((mesh:any)=>{
        cachedGemMeshes.push(mesh);
        if(mesh.layers){
          previousGemLayerMasks.set(mesh,mesh.layers.mask);
          mesh.layers.enable(gemMaskLayer);
        }
      });
    };
    const renderGemMaskWithOcclusion=(activeRenderer:any,target:any)=>{
      // A mask render is an isolated GPU transaction. Render targets carry
      // their own viewport state in Three.js, so restoring only the target is
      // insufficient: the next beauty/composer pass can inherit mask sizing.
      const previousTarget=activeRenderer.getRenderTarget();
      const previousViewport=activeRenderer.getViewport(new THREE.Vector4()).clone();
      const previousScissor=activeRenderer.getScissor(new THREE.Vector4()).clone();
      const previousScissorTest=activeRenderer.getScissorTest?.()??false;
      const previousOverride=scene.overrideMaterial;
      const previousBackground=scene.background;
      const previousAutoClear=activeRenderer.autoClear;
      const previousCameraLayerMask=camera.layers?.mask;
      const previousClearColor=activeRenderer.getClearColor(new THREE.Color()).clone();
      const previousClearAlpha=activeRenderer.getClearAlpha();
      const previousToneMapping=activeRenderer.toneMapping;
      const previousToneMappingExposure=activeRenderer.toneMappingExposure;
      const previousOutputColorSpace=activeRenderer.outputColorSpace;
      const originalMaterials:any[]=[];
      try{
        activeRenderer.setRenderTarget(target);
        /* target viewport is applied by setRenderTarget; keep the renderer DPR out of this size */
        activeRenderer.setScissorTest(false);
        activeRenderer.setClearColor(0x000000,0);
        activeRenderer.autoClear=false;
        activeRenderer.clear(true,true,true);
        scene.background=null;
        // Pass 1: every visible scene surface writes depth, so metal prongs
        // correctly occlude the diamond without becoming mask color themselves.
        scene.overrideMaterial=depthOnlyMaterial;
        if(camera.layers&&previousCameraLayerMask!==undefined) camera.layers.mask=previousCameraLayerMask;
        activeRenderer.render(scene,camera);
        // Pass 2: render only diamond material groups. Non-diamond groups use
        // colorWrite=false and depthWrite=false; they cannot leak into the mask.
        scene.overrideMaterial=null;
        for(const mesh of cachedGemMeshes){
          originalMaterials.push([mesh,mesh.material]);
          mesh.material=diamondMaskMaterialsByMesh.get(mesh)??gemMaskMaterial;
        }
        if(camera.layers) camera.layers.mask=gemMaskLayerBit;
        activeRenderer.render(scene,camera);
      }finally{
        for(let index=originalMaterials.length-1;index>=0;index--){
          const [mesh,material]=originalMaterials[index];
          mesh.material=material;
        }
        if(camera.layers&&previousCameraLayerMask!==undefined) camera.layers.mask=previousCameraLayerMask;
        scene.overrideMaterial=previousOverride;
        scene.background=previousBackground;
        activeRenderer.autoClear=previousAutoClear;
        activeRenderer.toneMapping=previousToneMapping;
        activeRenderer.toneMappingExposure=previousToneMappingExposure;
        activeRenderer.outputColorSpace=previousOutputColorSpace;
        activeRenderer.setClearColor(previousClearColor,previousClearAlpha);
        activeRenderer.setRenderTarget(previousTarget);
        activeRenderer.setViewport(previousViewport);
        activeRenderer.setScissor(previousScissor);
        activeRenderer.setScissorTest(previousScissorTest);
      }
    };
    refreshGemMaskCache();
    gemMaskPass={
      enabled:false,needsSwap:false,clear:false,renderToScreen:false,
      get hasDiamondMeshes(){ return cachedGemMeshes.length>0; },
      refreshCache:refreshGemMaskCache,
      setSize(width:number,height:number){
        lastGemMaskCameraState=null;
        gemMaskTarget.setSize(Math.max(1,width),Math.max(1,height));
      },
      render(activeRenderer:any){
        const cameraState=readGemMaskCameraState();
        if(lastGemMaskCameraState&&cameraState.length===lastGemMaskCameraState.length&&cameraState.every((value,index)=>value===lastGemMaskCameraState![index])) return;
        lastGemMaskCameraState=cameraState;
        if(cachedGemMeshes.length===0){
          const previousTarget=activeRenderer.getRenderTarget();
          const previousViewport=activeRenderer.getViewport(new THREE.Vector4()).clone();
          const previousScissor=activeRenderer.getScissor(new THREE.Vector4()).clone();
          const previousScissorTest=activeRenderer.getScissorTest?.()??false;
          const previousAutoClear=activeRenderer.autoClear;
          const previousClearColor=activeRenderer.getClearColor(new THREE.Color()).clone();
          const previousClearAlpha=activeRenderer.getClearAlpha();
          try{
            activeRenderer.setRenderTarget(gemMaskTarget);
            
            activeRenderer.setScissorTest(false);
            activeRenderer.setClearColor(0x000000,0);
            activeRenderer.autoClear=false;
            activeRenderer.clear(true,true,true);
          }finally{
            activeRenderer.autoClear=previousAutoClear;
            activeRenderer.setClearColor(previousClearColor,previousClearAlpha);
            activeRenderer.setRenderTarget(previousTarget);
            activeRenderer.setViewport(previousViewport);
            activeRenderer.setScissor(previousScissor);
            activeRenderer.setScissorTest(previousScissorTest);
          }
        }else{
          renderGemMaskWithOcclusion(activeRenderer,gemMaskTarget);
        }
        fxaaPass.material.uniforms.gemMask.value=gemMaskTarget.texture;
      },
      dispose(){
        for(const [mesh,originalMask] of previousGemLayerMasks){
          if(mesh?.layers) mesh.layers.mask=originalMask;
        }
        previousGemLayerMasks.clear();
        diamondMaskMaterialsByMesh.clear();
        diamondSupersampleMaterialsByMesh.clear();
        gemMaskTarget.dispose();
        depthOnlyMaterial.dispose();
        gemMaskMaterial.dispose();
        nonDiamondMaskMaterial.dispose();
      }
    };
    // AURUM DIAMOND SSAA MODULE: render the complete optical scene into an
    // auxiliary linear-HDR target to preserve transmission and refraction.
    // A categorical mask restricts the final composite to the visible diamond.
    diamondSupersamplePass={
      enabled:false,needsSwap:false,clear:false,renderToScreen:false,
      get scale(){ return diamondSupersampleScale; },
      setSize(width:number,height:number){
        diamondSupersampleBaseWidth=Math.max(1,Math.floor(width));
        diamondSupersampleBaseHeight=Math.max(1,Math.floor(height));
        const canRender=updateDiamondSupersampleScale();
        if(diamondSupersampleCompositePass?.material?.uniforms?.reconstructionScale){
          diamondSupersampleCompositePass.material.uniforms.reconstructionScale.value=diamondSupersampleScale;
        }
        const targetWidth=canRender?Math.max(2,Math.floor(diamondSupersampleBaseWidth*diamondSupersampleScale)):2;
        const targetHeight=canRender?Math.max(2,Math.floor(diamondSupersampleBaseHeight*diamondSupersampleScale)):2;
        diamondSupersampleTarget?.setSize?.(targetWidth,targetHeight);
        if(diamondSupersampleCompositePass){
          diamondSupersampleCompositePass.material.uniforms.hiResTexel.value.set(1/targetWidth,1/targetHeight);
          diamondSupersampleCompositePass.material.uniforms.reconstructionScale.value=diamondSupersampleScale;
          if(diamondSupersampleTarget) diamondSupersampleCompositePass.material.uniforms.tDiamondHiRes.value=diamondSupersampleTarget.texture;
        }
        ensureDiamondSupersampleMaskTarget();
        ensureDiamondSupersampleFxaaTarget();
      },
      canRender(){ return updateDiamondSupersampleScale(); },
      setScaleCap(cap:number){
        diamondSupersampleScaleCap=Math.max(1,Math.min(2,Number(cap)||1));
        updateDiamondSupersampleScale();
        const targetWidth=Math.max(2,Math.floor(diamondSupersampleBaseWidth*diamondSupersampleScale));
        const targetHeight=Math.max(2,Math.floor(diamondSupersampleBaseHeight*diamondSupersampleScale));
        diamondSupersampleTarget?.setSize?.(targetWidth,targetHeight);
        if(diamondSupersampleCompositePass){
          diamondSupersampleCompositePass.material.uniforms.hiResTexel.value.set(1/targetWidth,1/targetHeight);
          diamondSupersampleCompositePass.material.uniforms.reconstructionScale.value=diamondSupersampleScale;
          if(diamondSupersampleTarget) diamondSupersampleCompositePass.material.uniforms.tDiamondHiRes.value=diamondSupersampleTarget.texture;
        }
        ensureDiamondSupersampleMaskTarget();
        ensureDiamondSupersampleFxaaTarget();
      },
      render(activeRenderer:any){
        let activeTarget:any=null;
        try { activeTarget=ensureDiamondSupersampleTarget(); }
        catch(error){
          diamondSupersamplePass.enabled=false;
          diamondSupersampleCompositePass && (diamondSupersampleCompositePass.enabled=false);
          console.warn("[AURUM][DIAMOND SSAA] Auxiliary target unavailable; module suspended.",error);
          return;
        }
        if(!activeTarget || !updateDiamondSupersampleScale()) return;
        if(diamondSupersampleCompositePass?.material?.uniforms){
          diamondSupersampleCompositePass.material.uniforms.tDiamondHiRes.value=activeTarget.texture;
          diamondSupersampleCompositePass.material.uniforms.hiResTexel.value.set(1/activeTarget.width,1/activeTarget.height);
          diamondSupersampleCompositePass.material.uniforms.reconstructionScale.value=diamondSupersampleScale;
        }
        const activeMaskTarget=ensureDiamondSupersampleMaskTarget();
        if(!activeMaskTarget) return;
        const previousTarget=activeRenderer.getRenderTarget();
        const previousAutoClear=activeRenderer.autoClear;
        const previousViewport=new THREE.Vector4();
        const previousScissor=new THREE.Vector4();
        const previousScissorTest=activeRenderer.getScissorTest?.()??false;
        const previousClearColor=new THREE.Color();
        const previousClearAlpha=activeRenderer.getClearAlpha();
        const previousToneMapping=activeRenderer.toneMapping;
        const previousToneMappingExposure=activeRenderer.toneMappingExposure;
        const previousOutputColorSpace=activeRenderer.outputColorSpace;
        const previousLocalClippingEnabled=activeRenderer.localClippingEnabled;
        const previousClippingPlanes=activeRenderer.clippingPlanes;
        const previousShadowAutoUpdate=activeRenderer.shadowMap?.autoUpdate;
        const previousXrEnabled=activeRenderer.xr?.enabled;
        const previousSortObjects=activeRenderer.sortObjects;
        const previousSceneOverride=scene.overrideMaterial;
        const previousSceneBackground=scene.background;
        activeRenderer.getViewport(previousViewport);
        activeRenderer.getScissor(previousScissor);
        activeRenderer.getClearColor(previousClearColor);
        try{
          activeRenderer.setRenderTarget(activeTarget);
          
          activeRenderer.setScissorTest(false);
          activeRenderer.autoClear=false;
          // Render the complete optical scene at auxiliary resolution so
          // transmission, environment, lights, prongs and occluders are retained.
          // Only the final composite is restricted to the visible diamond mask.
          activeRenderer.setClearColor(0x000000,0);
          activeRenderer.clear(true,true,true);
          activeRenderer.toneMapping=THREE.NoToneMapping;
          activeRenderer.render(scene,camera);
          renderGemMaskWithOcclusion(activeRenderer,activeMaskTarget);
          if(diamondSupersampleCompositePass?.material?.uniforms?.tDiamondHiRes){
            diamondSupersampleCompositePass.material.uniforms.tDiamondHiRes.value=activeTarget.texture;
          }
        }catch(error){
          diamondSupersamplePass.enabled=false;
          diamondSupersampleCompositePass && (diamondSupersampleCompositePass.enabled=false);
          console.warn("[AURUM][DIAMOND SSAA] Reference render failed; module suspended.",error);
        }finally{
          activeRenderer.setRenderTarget(previousTarget);
          activeRenderer.setViewport(previousViewport);
          activeRenderer.setScissor(previousScissor);
          activeRenderer.setScissorTest(previousScissorTest);
          activeRenderer.autoClear=previousAutoClear;
          activeRenderer.setClearColor(previousClearColor,previousClearAlpha);
          activeRenderer.toneMapping=previousToneMapping;
          activeRenderer.toneMappingExposure=previousToneMappingExposure;
          activeRenderer.outputColorSpace=previousOutputColorSpace;
          activeRenderer.localClippingEnabled=previousLocalClippingEnabled;
          activeRenderer.clippingPlanes=previousClippingPlanes;
          if(activeRenderer.shadowMap&&previousShadowAutoUpdate!==undefined) activeRenderer.shadowMap.autoUpdate=previousShadowAutoUpdate;
          if(activeRenderer.xr&&previousXrEnabled!==undefined) activeRenderer.xr.enabled=previousXrEnabled;
          activeRenderer.sortObjects=previousSortObjects;
          scene.overrideMaterial=previousSceneOverride;
          scene.background=previousSceneBackground;
        }
      },
      renderFxaa(activeRenderer:any,enabled:boolean){
        const target=ensureDiamondSupersampleFxaaTarget();
        if(!enabled || !fxaaPass || !target || !diamondSupersampleTarget || !diamondSupersampleMaskTarget){
          if(diamondSupersampleCompositePass?.material?.uniforms?.tDiamondHiRes && diamondSupersampleTarget){
            diamondSupersampleCompositePass.material.uniforms.tDiamondHiRes.value=diamondSupersampleTarget.texture;
          }
          return false;
        }
        const uniforms=fxaaPass.material?.uniforms??{};
        const previousDiffuse=uniforms.tDiffuse?.value;
        const previousMask=uniforms.gemMask?.value;
        const previousResolution=uniforms.resolution?.value?.clone?.();
        const previousEnabled=fxaaPass.enabled;
        const previousRenderToScreen=fxaaPass.renderToScreen;
        try{
          fxaaPass.enabled=true;
          fxaaPass.renderToScreen=false;
          if(uniforms.gemMask) uniforms.gemMask.value=diamondSupersampleMaskTarget.texture;
          if(uniforms.resolution?.value) uniforms.resolution.value.set(1/target.width,1/target.height);
          // FXAA reads and writes only auxiliary scene targets.
          fxaaPass.render(activeRenderer,target,diamondSupersampleTarget,0,false);
          if(diamondSupersampleCompositePass?.material?.uniforms?.tDiamondHiRes){
            diamondSupersampleCompositePass.material.uniforms.tDiamondHiRes.value=target.texture;
          }
          return true;
        }finally{
          if(uniforms.tDiffuse) uniforms.tDiffuse.value=previousDiffuse;
          if(uniforms.gemMask) uniforms.gemMask.value=previousMask;
          if(uniforms.resolution?.value&&previousResolution) uniforms.resolution.value.copy(previousResolution);
          fxaaPass.enabled=previousEnabled;
          fxaaPass.renderToScreen=previousRenderToScreen;
        }
      },
      dispose(){
        diamondSupersampleTarget?.dispose?.();
        diamondSupersampleTarget=null;
        diamondSupersampleMaskTarget?.dispose?.();
        diamondSupersampleMaskTarget=null;
        diamondSupersampleFxaaTarget?.dispose?.();
        diamondSupersampleFxaaTarget=null;
      },
    };
    diamondSupersampleCompositePass=new FXAAShaderPass({
      uniforms:{
        tDiamondHiRes:{value:diamondSupersampleTarget?.texture??null},
        gemMask:{value:gemMaskTarget.texture},
        toneMappingExposure:{value:renderer.toneMappingExposure??1},
        tDiamondHiResMask:{value:diamondSupersampleMaskTarget?.texture??null},
        hiResTexel:{value:new THREE.Vector2(1/Math.max(2,Math.floor(diamondSupersampleBaseWidth*diamondSupersampleScale)),1/Math.max(2,Math.floor(diamondSupersampleBaseHeight*diamondSupersampleScale)))},
        reconstructionScale:{value:diamondSupersampleScale},
      },
      vertexShader:`varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`#include <tonemapping_pars_fragment>
        #include <colorspace_pars_fragment>
        uniform sampler2D tDiamondHiRes; uniform sampler2D gemMask; uniform sampler2D tDiamondHiResMask; uniform vec2 hiResTexel; uniform float reconstructionScale; varying vec2 vUv;
        float aurumCatmullRomWeight(float x){
          x=abs(x);
          if(x<1.0) return 1.5*x*x*x-2.5*x*x+1.0;
          if(x<2.0) return -0.5*x*x*x+2.5*x*x-4.0*x+2.0;
          return 0.0;
        }
        void main(){
          // This is a true overlay: discard means the framebuffer is not
          // written at all outside the original-resolution diamond mask.
          if(texture2D(gemMask,vUv).r<0.5) discard;
          // FXAA-only mode renders at native resolution: copy that result
          // directly instead of applying the supersampling reconstruction filter.
          if(reconstructionScale<=1.001){
            if(texture2D(tDiamondHiResMask,vUv).r<0.5) discard;
            gl_FragColor=texture2D(tDiamondHiRes,vUv);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
            return;
          }
          // Reconstruct from the high-resolution optical scene, but reject
          // every tap outside the diamond mask. This prevents background,
          // metal and mask-exterior colors from bleeding into the girdle.
          vec4 accumulated=vec4(0.0);
          float totalWeight=0.0;
          for(int y=0;y<4;y++){
            float oy=float(y)-1.5;
            float wy=aurumCatmullRomWeight(oy/reconstructionScale);
            for(int x=0;x<4;x++){
              float ox=float(x)-1.5;
              float wx=aurumCatmullRomWeight(ox/reconstructionScale);
              float weight=wx*wy;
              vec2 sampleUv=clamp(vUv+vec2(ox,oy)*hiResTexel,vec2(0.0),vec2(1.0));
              float sampleMask=texture2D(tDiamondHiResMask,sampleUv).r;
              if(sampleMask>=0.5 && abs(weight)>0.000001){
                accumulated+=texture2D(tDiamondHiRes,sampleUv)*weight;
                totalWeight+=weight;
              }
            }
          }
          // Near a very thin silhouette there may be no valid high-res tap.
          // Preserve the original pixel rather than borrowing the environment.
          if(abs(totalWeight)<0.00001) discard;
          gl_FragColor=accumulated/totalWeight;
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    diamondSupersampleCompositePass.enabled=false;
    diamondSupersampleCompositePass.clear=false;
    diamondSupersampleCompositePass.renderToScreen=true;
    // This pass owns the one and only tone-mapping/output conversion for the
    // linear HDR auxiliary render. It must participate in renderer tone mapping.
    if(diamondSupersampleCompositePass.material) diamondSupersampleCompositePass.material.toneMapped=true;
    diamondSupersampleCompositePass.setSize=(width:number,height:number)=>{
      diamondSupersampleBaseWidth=Math.max(1,Math.floor(width));
      diamondSupersampleBaseHeight=Math.max(1,Math.floor(height));
      updateDiamondSupersampleScale();
      const hiWidth=Math.max(2,Math.floor(diamondSupersampleBaseWidth*diamondSupersampleScale));
      const hiHeight=Math.max(2,Math.floor(diamondSupersampleBaseHeight*diamondSupersampleScale));
      diamondSupersampleTarget?.setSize?.(hiWidth,hiHeight);
      diamondSupersampleFxaaTarget?.setSize?.(hiWidth,hiHeight);
      diamondSupersampleCompositePass.material.uniforms.hiResTexel.value.set(1/hiWidth,1/hiHeight);
      diamondSupersampleCompositePass.material.uniforms.reconstructionScale.value=diamondSupersampleScale;
    };
    // Diamond reconstruction stays detached from EffectComposer. The full-scene
    // auxiliary target preserves transmission; the final composite writes only
    // through the categorical diamond mask.


    // Diamond-only TAA: save the pre-TAA beauty and composite the temporal result
    // only through the center-diamond mask, preserving every metal/environment pixel.
    try {
      const { SavePass } = await import("three/examples/jsm/postprocessing/SavePass.js");
      const { ShaderPass } = await import("three/examples/jsm/postprocessing/ShaderPass.js");
      diamondTaaSavePass = new SavePass();
      diamondTaaSavePass.enabled = false;
      diamondTaaCompositePass = new ShaderPass({
        uniforms: {
          tDiffuse: { value: null },
          tDiamondBase: { value: diamondTaaSavePass.renderTarget.texture },
          gemMask: { value: gemMaskTarget.texture },
        },
        vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D tDiamondBase; uniform sampler2D gemMask; varying vec2 vUv;
          void main(){
            vec4 base=texture2D(tDiamondBase,vUv);
            if(texture2D(gemMask,vUv).r<0.5){gl_FragColor=base;return;}
            gl_FragColor=texture2D(tDiffuse,vUv);
          }`,
      });
      diamondTaaCompositePass.enabled = false;
    } catch (error) {
      diamondTaaSavePass = null;
      diamondTaaCompositePass = null;
      console.warn("[AURUM][DIAMOND TAA] Masked temporal composite unavailable.", error);
    }

    // AURUM Soft Edge AA is composited only inside pixels belonging to visible
    // gemstone meshes. Metals and all other geometry retain their original pixels.
    fxaaPass=new FXAAShaderPass({
      uniforms:{
        tDiffuse:{value:null},
        gemMask:{value:gemMaskTarget.texture},
        resolution:{value:new THREE.Vector2(1,1)},
        // Stronger, lower-threshold filtering is confined to the gemstone mask.
        // This improves the girdle silhouette without touching metal pixels.
        strength:{value:0.76},
        edgeThreshold:{value:0.18},
      },
      vertexShader:`varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`uniform sampler2D tDiffuse; uniform sampler2D gemMask; uniform vec2 resolution; uniform float strength; uniform float edgeThreshold; varying vec2 vUv;
        float luma(vec3 c){return dot(c,vec3(0.2126,0.7152,0.0722));}
        void main(){
          vec4 center=texture2D(tDiffuse,vUv);
          float centerMask=texture2D(gemMask,vUv).r;
          if(centerMask<0.5){gl_FragColor=center;return;}
          vec2 px=max(resolution,vec2(0.000001));
          vec2 uv0=vUv+vec2(-px.x,-px.y);
          vec2 uv1=vUv+vec2( px.x,-px.y);
          vec2 uv2=vUv+vec2(-px.x, px.y);
          vec2 uv3=vUv+vec2( px.x, px.y);
          // Restrict this complementary FXAA pass to the diamond silhouette.
          // Internal facet boundaries keep their original crisp optical detail.
          float m0=texture2D(gemMask,uv0).r;
          float m1=texture2D(gemMask,uv1).r;
          float m2=texture2D(gemMask,uv2).r;
          float m3=texture2D(gemMask,uv3).r;
          float outsideNeighbor=1.0-min(min(m0,m1),min(m2,m3));
          if(outsideNeighbor<0.5){gl_FragColor=center;return;}
          vec3 n0=texture2D(tDiffuse,uv0).rgb;
          vec3 n1=texture2D(tDiffuse,uv1).rgb;
          vec3 n2=texture2D(tDiffuse,uv2).rgb;
          vec3 n3=texture2D(tDiffuse,uv3).rgb;
          float lo=min(luma(center.rgb),min(min(luma(n0),luma(n1)),min(luma(n2),luma(n3))));
          float hi=max(luma(center.rgb),max(max(luma(n0),luma(n1)),max(luma(n2),luma(n3))));
          float edge=smoothstep(edgeThreshold,edgeThreshold*2.0,hi-lo);
          // Build the edge reference from gemstone-covered neighbors only.
          // Sampling outside-mask colors here would pull metal/background tones
          // into the diamond girdle and create a colored fringe.
          float gem0=step(0.5,m0);
          float gem1=step(0.5,m1);
          float gem2=step(0.5,m2);
          float gem3=step(0.5,m3);
          float gemNeighborCount=gem0+gem1+gem2+gem3;
          if(gemNeighborCount<0.5){gl_FragColor=center;return;}
          vec3 gemNeighborColor=(n0*gem0+n1*gem1+n2*gem2+n3*gem3)/gemNeighborCount;
          float blendAmount=edge*strength*outsideNeighbor;
          gl_FragColor=vec4(mix(center.rgb,gemNeighborColor,blendAmount),center.a);
        }`,
    });
    // Gem-specific AA keeps its categorical mask so metal pixels never bleed
    // into gemstone edges. It is enabled only for settled/high-quality frames.
    fxaaPass.enabled=false;
    // The diagnostic mask may be rendered on demand, but it is never part of
    // the beauty composer. Diamond FXAA/SSAA stay detached until the isolated
    // compositor is implemented and pixel-diff validated.
    // Diamond SSAA and FXAA are intentionally detached from EffectComposer.
    // Their legacy implementations remain suspended until a separate-target
    // compositor can preserve the base frame outside the diamond mask.
    if (diamondTaaSavePass && diamondTaaCompositePass && taaPass) {
      composer.addPass(diamondTaaSavePass);
      composer.addPass(diamondTaaCompositePass);
      const removePass = (pass:any) => {
        const index = composer.passes.indexOf(pass);
        if (index >= 0) composer.passes.splice(index, 1);
      };
      removePass(taaPass);
      removePass(diamondTaaSavePass);
      removePass(diamondTaaCompositePass);
      const ssaaIndex = composer.passes.indexOf(diamondSupersamplePass);
      composer.passes.splice(ssaaIndex + 1, 0, diamondTaaSavePass, taaPass);
      const maskIndex = composer.passes.indexOf(gemMaskPass);
      composer.passes.splice(maskIndex + 1, 0, diamondTaaCompositePass);
      // TAA is the final diamond reconstruction stage; it must run after SSAA.
      composer.passes.splice(composer.passes.indexOf(diamondTaaCompositePass), 1);
      composer.passes.splice(composer.passes.indexOf(diamondSupersampleCompositePass) + 1, 0, diamondTaaCompositePass);
    }

    // Conservative full-surface edge AA for polished metal silhouettes and
    // CAD curves. It is intentionally disabled during camera motion and uses
    // a low blend strength to avoid softening specular detail.
    surfaceEdgeAaPass=createAurumSurfaceEdgeAaPass(FXAAShaderPass,THREE);
    // Full-surface edge AA is retired from the beauty composer; it can alter
    // metal and environment pixels and is outside the diamond-only scope.

    const { OutputPass }=await import("three/examples/jsm/postprocessing/OutputPass.js");
    outputPass=new OutputPass();
    composer.addPass(outputPass);
  } catch (error) {
    // Keep the live viewer resilient, but never hide why the photographic
    // pipeline failed: PNG capture diagnostics need the original exception.
    console.error("[AURUM][POST] No se pudo inicializar el compositor fotográfico; se usará render directo.", error);
    lutPass?.lut?.dispose?.();
    diamondSupersampleTarget?.dispose?.();
    diamondSupersampleTarget=null;
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
    // Restore the unfiltered beauty render while the diamond optics are recovered.
    taaRequested = false;
    const taaEnabled = false;
    const edgeAaEnabled = false;
    const ssaaActive = false;
    const fxaaActive = false;
    if(diamondSupersamplePass) diamondSupersamplePass.enabled=false;
    if(diamondSupersampleCompositePass) diamondSupersampleCompositePass.enabled=false;
    if(gemMaskPass) gemMaskPass.enabled=false;
    if(fxaaPass) fxaaPass.enabled=fxaaActive;
    if(taaPass) { taaPass.enabled=false; taaPass.accumulate=false; }
    if(diamondTaaSavePass) diamondTaaSavePass.enabled=false;
    if(diamondTaaCompositePass) diamondTaaCompositePass.enabled=false;
    // Metal is out of scope for the diamond-quality work: never run the
    // full-surface edge filter in the live/capture composer.
    if(surfaceEdgeAaPass) surfaceEdgeAaPass.enabled=false;
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
    // Re-apply the user's diamond-only switches after quality changes reset pass state.
    applyDiamondPostModules(getAurumPostControls());
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

  // Render the isolated diamond reconstruction over an already completed beauty frame.
  const renderDiamondSupersampleOverlay=(activeRenderer:any)=>{
    if(!gemMaskPass?.enabled || !diamondSupersamplePass?.enabled || !diamondSupersampleCompositePass?.enabled) return false;
    try{
      gemMaskPass.render(activeRenderer);
      diamondSupersamplePass.render(activeRenderer);
      if(!diamondSupersamplePass.enabled || !diamondSupersampleCompositePass.enabled) return false;
      diamondSupersamplePass.renderFxaa(activeRenderer,Boolean(fxaaPass?.enabled));
      const previousTarget=activeRenderer.getRenderTarget();
      const previousAutoClear=activeRenderer.autoClear;
      const previousScissorTest=activeRenderer.getScissorTest?.()??false;
      try{
        activeRenderer.setRenderTarget(null);
        
        activeRenderer.setScissorTest(false);
        activeRenderer.autoClear=false;
        diamondSupersampleCompositePass.render(activeRenderer,null,null,0,false);
      }finally{
        activeRenderer.setRenderTarget(previousTarget);
        activeRenderer.setScissorTest(previousScissorTest);
        activeRenderer.autoClear=previousAutoClear;
      }
      return true;
    }catch(error){
      diamondSupersamplePass.enabled=false;
      diamondSupersampleCompositePass.enabled=false;
      console.warn("[AURUM][DIAMOND COMPOSITE] Isolated overlay failed; base beauty frame preserved.",error);
      return false;
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
    diamondSupersamplingSettled=!next;
    diamondSupersamplePass?.setScaleCap?.(next?diamondLiveSupersampleScaleCap:diamondSupersampleScaleCap);
    const postControls=getAurumPostControls();
    // Apply the active live/settled supersampling cap before selecting the
    // diamond-only SSAA path; masked FXAA remains the capability fallback.
    applyDiamondPostModules(postControls);
    // Preserve metal pixels: Surface Edge AA is deliberately excluded.
    if(surfaceEdgeAaPass) surfaceEdgeAaPass.enabled=false;
    if(!taaPass)return;
    // Never accumulate while the camera moves; restart temporal history at rest.
    if(next){
      taaPass.enabled=false;
      taaPass.accumulate=false;
      taaPass.accumulateIndex=-1;
      if(diamondTaaSavePass) diamondTaaSavePass.enabled=false;
      if(diamondTaaCompositePass) diamondTaaCompositePass.enabled=false;
      return;
    }
    if(changed){
      taaPass.accumulate=false;
      taaPass.accumulateIndex=-1;
      applyDiamondPostModules(postControls);
      if(taaPass.enabled)taaPass.accumulate=true;
    }
  };

  applyQuality(quality);
  // Reflect Post Engine switches immediately without waiting for a quality/profile rebuild.
  function applyDiamondPostModules(controls:any){
    const maskEnabled=controls?.gemMaskEnabled===true;
    const hasMaskTarget=Boolean(gemMaskPass);
    const hasDiamondMeshes=Boolean(gemMaskPass?.hasDiamondMeshes);
    const diamondMaskReady=maskEnabled && hasMaskTarget && hasDiamondMeshes;
    const ssaaRequested=controls?.diamondSsaaEnabled===true;
    const fxaaRequested=controls?.gemFxaaEnabled===true;
    const requestedScale=ssaaRequested
      ? (diamondSupersamplingSettled?diamondSupersampleScaleCap:diamondLiveSupersampleScaleCap)
      : 1;
    diamondSupersamplePass?.setScaleCap?.(requestedScale);
    const canReconstruct=Boolean(diamondSupersamplePass?.canRender?.());
    const ssaaEnabled=diamondMaskReady && ssaaRequested && canReconstruct && Number(diamondSupersamplePass?.scale??1)>1.001;
    const fxaaEnabled=diamondMaskReady && fxaaRequested && canReconstruct;
    const reconstructionEnabled=ssaaEnabled || fxaaEnabled;
    const taaMotionFallback=diamondMaskReady && controls?.diamondTaaEnabled===true && temporalMotionActive;
    const taaEnabled=diamondMaskReady && controls?.diamondTaaEnabled===true && !temporalMotionActive && Boolean(taaPass && diamondTaaSavePass && diamondTaaCompositePass);
    if(gemMaskPass) gemMaskPass.enabled=diamondMaskReady && (reconstructionEnabled || taaEnabled);
    if(diamondSupersamplePass) diamondSupersamplePass.enabled=reconstructionEnabled;
    if(diamondSupersampleCompositePass) diamondSupersampleCompositePass.enabled=reconstructionEnabled;
    if(taaPass){
      const wasEnabled=Boolean(taaPass.enabled);
      taaPass.enabled=taaEnabled;
      taaPass.accumulate=taaEnabled;
      if(taaEnabled){
        taaPass.sampleLevel=5;
        if(!wasEnabled) taaPass.accumulateIndex=-1;
      }
    }
    if(diamondTaaSavePass) diamondTaaSavePass.enabled=taaEnabled;
    if(diamondTaaCompositePass) diamondTaaCompositePass.enabled=taaEnabled;
    if(fxaaPass) fxaaPass.enabled=fxaaEnabled;
    if(surfaceEdgeAaPass) surfaceEdgeAaPass.enabled=false;
    return {
      gemMask:Boolean(gemMaskPass?.enabled),
      ssaa:Boolean(ssaaEnabled),
      fxaa:Boolean(fxaaEnabled),
      taa:Boolean(taaPass?.enabled && diamondTaaCompositePass?.enabled),
      taaMotionFallback:Boolean(taaMotionFallback && fxaaEnabled),
      blockedByMask:!maskEnabled && Boolean(ssaaRequested || fxaaRequested || controls?.diamondTaaEnabled),
      hasDiamondMeshes,
    };
  }
  const setDiamondSupersampleScaleCap=(settledCap:number,liveCap?:number)=>{
    diamondSupersampleScaleCap=Math.max(1,Math.min(2,Number(settledCap)||1));
    diamondLiveSupersampleScaleCap=Math.max(1,Math.min(diamondSupersampleScaleCap,Number(liveCap??settledCap)||1));
    diamondSupersamplePass?.setScaleCap?.(diamondSupersamplingSettled?diamondSupersampleScaleCap:diamondLiveSupersampleScaleCap);
  };
  const setDiamondSupersamplingSettled=(settled:boolean)=>{
    diamondSupersamplingSettled=Boolean(settled);
    diamondSupersamplePass?.setScaleCap?.(diamondSupersamplingSettled?diamondSupersampleScaleCap:diamondLiveSupersampleScaleCap);
    return Boolean(applyDiamondPostModules(getAurumPostControls())?.ssaa);
  };
  const unsubscribePostControls=subscribeAurumPostControls((controls)=>{
    applyDiamondPostModules(controls);
    // The current diamond-only scope must never activate a full-surface pass.
    if(surfaceEdgeAaPass) surfaceEdgeAaPass.enabled=false;
  });
  if(composer?.dispose){
    const disposeComposer=composer.dispose.bind(composer);
    composer.dispose=()=>{
      unsubscribePostControls();
      gemMaskPass?.dispose?.();
      diamondSupersamplePass?.dispose?.();
      diamondSupersampleCompositePass?.material?.dispose?.();
      diamondSupersampleCompositePass?.fsQuad?.dispose?.();
      fxaaPass?.material?.dispose?.();
      fxaaPass?.fsQuad?.dispose?.();
      surfaceEdgeAaPass?.dispose?.();
      disposeComposer();
    };
  }
  const originalComposerSetSize=composer?.setSize?.bind(composer);
  if(composer && originalComposerSetSize){
    composer.setSize=(width:number,height:number)=>{
      originalComposerSetSize(width,height);
      const actualWidth=Math.max(1,Number(renderer.domElement.width)||Math.floor(width));
      const actualHeight=Math.max(1,Number(renderer.domElement.height)||Math.floor(height));
      gemMaskPass?.setSize?.(actualWidth,actualHeight);
      diamondSupersamplePass?.setSize?.(actualWidth,actualHeight);
      diamondSupersampleCompositePass?.setSize?.(actualWidth,actualHeight);
    };
  }
  const setSSRSelects=(objects:any[])=>{
    if(!ssrPass)return;
    ssrPass.selects=Array.isArray(objects)?objects:[];
  };
  return {composer,renderPass,ssaoPass,ssrPass,ssrSavePass,ssrCompositePass,bloomPass,setSSRSelects,applyQuality,updateTemporal,resetTemporalAccumulation,setTemporalMotion,setDiamondSupersamplingSettled,setDiamondSupersampleScaleCap,renderDiamondSupersampleOverlay,diamondSupersamplePass,diamondSupersampleCompositePass,diamondTaaSavePass,diamondTaaCompositePass,dofPass,taaPass,fxaaPass,surfaceEdgeAaPass,gemMaskPass,outputPass,msaaSamples:composerMsaaSamples};
}