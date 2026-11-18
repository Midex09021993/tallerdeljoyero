import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { createAurumGemEnvironment } from "../src/lib/aurum/gem-environment";
import { prepareAurumGemLayerIndex } from "../src/lib/aurum/material-application";
import { getAurumRuntimeBudget } from "../src/lib/aurum/runtime-budget";
import { setAurumGemShaderQuality } from "../src/lib/aurum/scintillation";
import { createAurumDiamondMicroPipeline } from "../src/lib/aurum/diamond-micro-pipeline";

test("diamond micro classifier protects the center from active catalog identity before BVH metadata exists", () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  const diamondGeometry = new THREE.SphereGeometry(1, 16, 12);
  const diamondMaterial = new THREE.MeshPhysicalMaterial();
  const diamond = new THREE.Mesh(diamondGeometry, diamondMaterial);
  diamond.userData = {
    aurumActiveGemFamily: "Diamante",
    aurumActiveGemId: "diamante_natural",
    aurumRhino: { categoria: "gema", capa: "Gem 01" },
  };
  scene.add(diamond);

  const emeraldGeometry = new THREE.SphereGeometry(0.35, 12, 8);
  const emeraldMaterial = new THREE.MeshPhysicalMaterial();
  emeraldMaterial.userData = { aurumGemFamily: "Esmeralda" };
  const emerald = new THREE.Mesh(emeraldGeometry, emeraldMaterial);
  emerald.userData = { aurumRhino: { categoria: "gema", capa: "Gem 02" } };
  emerald.position.x = 1.5;
  scene.add(emerald);

  const pipeline = createAurumDiamondMicroPipeline(scene, camera, () => 600);
  pipeline.refresh();
  pipeline.update();

  expect(pipeline.diagnostics().diamondMeshes).toBe(1);
  expect(diamond.userData.aurumDiamondMicroCenterProtected).toBe(true);
  expect(emerald.userData.aurumDiamondMicroCenterProtected).toBeUndefined();

  pipeline.dispose();
  diamondGeometry.dispose();
  diamondMaterial.dispose();
  emeraldGeometry.dispose();
  emeraldMaterial.dispose();
});

test("gem environment updates only the meshes resolved for the selected stone", () => {
  const controller = createAurumGemEnvironment({}, class {}, class {});
  const targetMaterial = new THREE.MeshPhysicalMaterial();
  targetMaterial.userData = {
    aurumOpticalProfile: { familia: "Esmeralda" },
    aurumGemFamily: "Esmeralda",
    aurumGemBaseEnvIntensity: 1,
    aurumGemEnvironmentUniforms: { value: 0 },
  };
  targetMaterial.envMapRotation = new THREE.Euler();
  const unrelatedMaterial = new THREE.MeshPhysicalMaterial();
  unrelatedMaterial.userData = {
    aurumOpticalProfile: { familia: "Diamante" },
    aurumGemFamily: "Diamante",
  };
  unrelatedMaterial.envMapRotation = new THREE.Euler();
  const target = new THREE.Mesh(new THREE.BufferGeometry(), targetMaterial);
  const unrelated = new THREE.Mesh(new THREE.BufferGeometry(), unrelatedMaterial);
  const environment = new THREE.Texture();

  controller.applyToTargets([target], environment, { rotation: 0.2, intensityScale: 1 });

  expect(targetMaterial.envMap).toBe(environment);
  expect(targetMaterial.userData.aurumGemEnvironmentUniforms.value).toBe(targetMaterial.envMapIntensity);
  expect(unrelatedMaterial.envMap).toBeNull();
  expect(controller.diagnostics()).toMatchObject({
    loaded: false,
    url: null,
    appliedMeshes: 1,
    appliedMaterials: 1,
  });

  environment.dispose();
  targetMaterial.dispose();
  unrelatedMaterial.dispose();
  target.geometry.dispose();
  unrelated.geometry.dispose();
});

test("gem layer index is prepared once and rebuilt for a reused scene root", () => {
  const scene = new THREE.Scene();
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.MeshPhysicalMaterial();
  const gem = new THREE.Mesh(geometry, material);
  gem.userData = { aurumRhino: { categoria: "gema", capa: "Gem 01" } };
  scene.add(gem);

  const first = prepareAurumGemLayerIndex(scene);
  expect(first?.byLayerName.get("gem 01")).toEqual([gem]);

  gem.userData.aurumRhino.categoria = "metal";
  const rebuilt = prepareAurumGemLayerIndex(scene);
  expect(rebuilt?.byLayerName.has("gem 01")).toBe(false);

  scene.remove(gem);
  geometry.dispose();
  material.dispose();
});

test("selected gem paints before optional enrichment and thickness work", () => {
  const source = readFileSync("src/lib/aurum/material-application.ts", "utf8");
  const start = source.indexOf("export function applyAurumGemToTarget");
  const end = source.indexOf("export function clearAurumGemFromTarget", start);
  const apply = source.slice(start, end);

  expect(apply.indexOf("applyGemEnvironment(targets);")).toBeGreaterThan(-1);
  expect(apply.indexOf("applyGemEnvironment(targets);")).toBeLessThan(
    apply.indexOf("enrichmentJobs.forEach") === -1
      ? apply.indexOf("runNextEnrichmentJob")
      : apply.indexOf("enrichmentJobs.forEach"),
  );
  expect(apply).toContain("requestIdleCallback");
  expect(apply).toContain("buildAurumThicknessMap");
  expect(apply).toContain("aurumGemApplicationToken");
});

test("targeted BVH refresh avoids processing unrelated scene meshes", () => {
  const source = readFileSync("src/lib/aurum/aurum-diamond-bvh-runtime.ts", "utf8");
  expect(source).toContain("refreshTargets(model, targets)");
  expect(source).toContain("if (targetSet) targetSet.forEach(processMesh);");
  expect(source).toContain("const targetContainsDiamond = !targetSet");
});

test("AURUM gem transition snapshots before material replacement and blends only after first paint", () => {
  const source = readFileSync("src/components/AurumRender.tsx", "utf8");
  const capture = source.indexOf("next.aurumGemTransitionSnapshot=captureAurumGemTransitionState(mesh);");
  const apply = source.indexOf("const applied=applyAurumGemToTarget");
  const firstPaint = source.indexOf("viewerLoopRef.current?.renderNow?.()", apply);
  const transition = source.indexOf("createAurumGemTransition(", firstPaint);

  expect(capture).toBeGreaterThan(-1);
  expect(capture).toBeGreaterThan(apply);
  expect(capture).toBeLessThan(firstPaint);
  expect(firstPaint).toBeGreaterThan(apply);
  expect(transition).toBeGreaterThan(firstPaint);
  expect(source).toContain("gemTransitionRef.current?.cancel?.()");
  expect(source).toContain("gemTransitionRef.current?.cancel?.();");
  expect(source).toContain("gemTransitionRef.current=null;");
  expect(source).toContain("gemTransitionRef.current=previousAppearance.length");
  expect(source).toContain("gemTransitionRef.current?.active");
  expect(source).toContain("gemTransitionRef.current=null;");
  const transitionComplete = source.indexOf("gemTransitionRef.current=null;", transition);
  const bvhRefresh = source.indexOf("scheduleIdle();", transitionComplete);
  expect(transitionComplete).toBeGreaterThan(transition);
  expect(bvhRefresh).toBeGreaterThan(transitionComplete);
  expect(source).toContain("BVH may replace the physical material, so it must wait");
});

test("diamond live optical tuning matches the approved diamond-only calibration", () => {
  const source = readFileSync("src/lib/aurum/scintillation.ts", "utf8");
  expect(source).toContain("internalContrast: 1.04");
  expect(source).toContain("highlightShoulder: 0.85");
  expect(source).toContain("faceBrightness: 1.00");
  expect(source).toContain("rimEnergy: 0.025");
  expect(source).toContain('const isDiamond=family.trim().toLowerCase()==="diamante"');
  expect(source).toContain("smoothstep(0.025,0.22,ijSpectralSpread)");
  expect(source).toContain("ijSpectralLuma*0.88");
  expect(source).toContain("ijHighlightPeak-0.86");
  const bvh = readFileSync("src/lib/aurum/aurum-diamond-bvh-runtime.ts", "utf8");
  expect(bvh).toContain('isNeutralMicroDiamond ? 0.96 : isNeutralSmallDiamond ? 0.94 : 0.90');
  expect(bvh).toContain('gamma: isMicro ? 0.96 : isSmall ? 0.94 : 0.90');
});

test("runtime DPR remains unchanged to avoid changing shared metal rendering resolution", () => {
  const source = readFileSync("src/lib/aurum/runtime-budget.ts", "utf8");
  expect(source).toContain("pixelRatioCap:1.72");
  expect(source).toContain("interactionPixelRatio:1.72");
});

test("web-tier models receive 2x diamond-only supersampling without raising shared DPR", () => {
  const web = getAurumRuntimeBudget(200_000);
  expect(web.diamondSupersampleScaleCap).toBe(2.2);
  expect(web.diamondLiveSupersampleScaleCap).toBe(1.75);
  expect(web.pixelRatioCap).toBe(1.72);
  expect(web.interactionPixelRatio).toBe(1.72);

  const dense = getAurumRuntimeBudget(200_001);
  expect(dense.diamondSupersampleScaleCap).toBe(1.8);
  expect(dense.diamondLiveSupersampleScaleCap).toBe(1.5);
  expect(dense.pixelRatioCap).toBe(1.6);

  expect(getAurumRuntimeBudget(500_001).diamondSupersampleScaleCap).toBe(1.65);
  expect(getAurumRuntimeBudget(500_001).diamondLiveSupersampleScaleCap).toBe(1.5);
  expect(getAurumRuntimeBudget(900_001).diamondSupersampleScaleCap).toBe(1.7);
  expect(getAurumRuntimeBudget(900_001).diamondLiveSupersampleScaleCap).toBe(1.5);

  const bvh = readFileSync("src/lib/aurum/aurum-diamond-bvh-runtime.ts", "utf8");
  const micro = readFileSync("src/lib/aurum/diamond-micro-pipeline.ts", "utf8");
  expect(bvh).toContain("aurumDiamondOpticalFamily: \"diamante\"");
  expect(bvh).toContain("originalDiamondOpticalFamily");
  expect(micro).toContain("data.aurumActiveGemFamily,");
  expect(micro).toContain("data.aurumGemFamily,");
  expect(micro).toContain("data.aurumActiveGemId");
  const component = readFileSync("src/components/AurumRender.tsx", "utf8");
  expect(component).toContain("diamondMicroPipeline.refresh();\n        diamondMicroPipeline.update();\n        // Synchronize the newly prepared gemstone BVH");
  expect(component).toContain("diamondBvhRuntime.refresh(modelo);\n              // Re-index after BVH material replacement");
  const post = readFileSync("src/lib/aurum/post.ts", "utf8");
  expect(post).toContain("const firstNonEmpty=(values:any[])=>");
  expect(post).toContain("data.aurumActiveGemFamily,");
  expect(post).toContain("data.aurumGemFamily,");
  expect(post).toContain("data.aurumDiamondOpticalFamily,");
  expect(post).toContain("readRenderTargetPixels(gemMaskTarget,0,0,width,height,pixels)");
  expect(post).toContain("requestDiagnostics(){");
  expect(post).toContain("cachedCenterMeshes:cachedGemMeshes.length,");
  expect(post).toContain("maskCoveragePercent:gemMaskCoveragePercent,");
  expect(post).toContain("Math.min(diamondSupersampleScaleCap,Math.sqrt(4_500_000/Math.max(1,basePixels)))");
  expect(post).toContain("if(texture2D(gemMask,vUv).r<0.5){gl_FragColor=base;return;}");
  expect(post).toContain("setDiamondSupersampleScaleCap");
});

test("diamond SSAA mask isolates material groups and never paints adjacent metal groups", () => {
  const post = readFileSync("src/lib/aurum/post.ts", "utf8");
  expect(post).toContain("const getDiamondMaterialSlots=(mesh:any):Set<number>");
  expect(post).toContain("data.aurumDiamondMicroCenterProtected===true");
  expect(post).toContain("const isProtectedCenterDiamond=(mesh:any)=>{");
  expect(post).toContain("diamondMeshCandidates.filter(isProtectedCenterDiamond)");
  expect(post).toContain("syncCenterDiamondCache();");
  expect(post).toContain("materials.length===1&&objectIsDiamond");
  expect(post).toContain('const isGemLayer=/^gem 0?[1-4]$/.test(layerName);');
  expect(post).toContain("const firstNonEmpty=(values:any[])=>");
  expect(post).toContain('isGemLayer&&category==="gema"&&family');
  expect(post).toContain('isGemLayer&&category==="gema"&&(');
  expect(post).toContain("diamondMaskMaterialsByMesh.set(mesh,materials.map");
  expect(post).toContain("colorWrite:false,toneMapped:false");
  expect(post).toContain("scene.overrideMaterial=null;");
  expect(post).toContain("mesh.material=diamondMaskMaterialsByMesh.get(mesh)??gemMaskMaterial;");
  expect(post).toContain("mesh.material=material;");
  expect(post).toContain("renderGemMaskWithOcclusion(activeRenderer,activeMaskTarget);");
  expect(post).toContain("renderGemMaskWithOcclusion(activeRenderer,gemMaskTarget);");
});

test("diamond SSAA keeps the auxiliary render linear HDR and applies native tone mapping only in the overlay", () => {
  const post = readFileSync("src/lib/aurum/post.ts", "utf8");
  const auxiliaryStart = post.indexOf("const previousToneMapping=activeRenderer.toneMapping;", post.indexOf("diamondSupersamplePass={"));
  const auxiliaryEnd = post.indexOf("activeRenderer.toneMapping=previousToneMapping;", auxiliaryStart);
  const auxiliaryBlock = post.slice(auxiliaryStart, auxiliaryEnd + "activeRenderer.toneMapping=previousToneMapping;".length);
  expect(auxiliaryStart).toBeGreaterThan(-1);
  expect(auxiliaryBlock).toContain("activeRenderer.toneMapping=THREE.NoToneMapping;");
  expect(auxiliaryBlock).toContain("activeRenderer.render(scene,camera);");
  expect(auxiliaryBlock).toContain("activeRenderer.toneMapping=previousToneMapping;");
  expect(post).toContain("diamondSupersampleCompositePass.material.toneMapped=true;");
  expect(post).toContain("#include <tonemapping_fragment>");
  expect(post).toContain("#include <colorspace_fragment>");
  expect(post).toContain("type:THREE.HalfFloatType");
});

test("Gem Mask stays internal after visual validation and never tints the beauty render", () => {
  const post = readFileSync("src/lib/aurum/post.ts", "utf8");
  expect(post).toContain("gemMaskDiagnosticCamera.position.z=1;");
  expect(post).toContain("gemMaskDiagnosticMaterial.uniforms[\"uMask\"]!.value=gemMaskTarget.texture");
  const component = readFileSync("src/components/AurumRender.tsx", "utf8");
  expect(post).toContain("renderDiagnosticOverlay(activeRenderer:any)");
  expect(post).toContain("gemMaskDiagnosticScene");
  expect(post).toContain("coverage<0.5) discard");
  expect(component).toContain("gemMaskPass.enabled=getAurumPostControls().gemMaskEnabled");
  expect(component).not.toContain("gemMaskPass.renderDiagnosticOverlay?.(renderer)");
  expect(component).toContain("gemMaskDiagnosticsRef.current = gemMaskPass;");
  expect(component).toContain("requestGemMaskDiagnostics");
  expect(component).toContain("aurum-gem-mask-diagnostics-ready");
  expect(component).toContain("diamondControlDiagnostics.gemMask?.maskCoveragePercent");
  expect(component).toContain("viewerLoopRef.current?.invalidate?.();");
});

test("diamond AA stages are coordinated behind Gem Mask with settled TAA", () => {
  const controls = readFileSync("src/lib/aurum/post-engine-controls.ts", "utf8");
  const post = readFileSync("src/lib/aurum/post.ts", "utf8");
  const render = readFileSync("src/components/AurumRender.tsx", "utf8");
  expect(controls).toContain("gemFxaaEnabled: value?.gemMaskEnabled === true && value?.gemFxaaEnabled === true");
  expect(controls).toContain("diamondSsaaEnabled: value?.gemMaskEnabled === true && value?.diamondSsaaEnabled === true");
  expect(controls).toContain("diamondTaaEnabled: value?.gemMaskEnabled === true && value?.diamondTaaEnabled === true");
  expect(controls).toContain("diamondTaaEnabled: true,");
  expect(post).toContain("const fxaaEnabled=diamondMaskReady && fxaaRequested;");
  expect(post).toContain("float aurumCatmullRomWeight(float x){");
  expect(post).toContain("aurumCatmullRomWeight");
  expect(post).toContain("if(totalWeight<0.00001) discard;");
  expect(post).toContain("const renderDiamondFxaaOverlay=(activeRenderer:any)=>");
  expect(post).toContain("let gemMaskTarget:any=null;");
  expect(post).toContain("let ensureDiamondFxaaSnapshotTexture:any=null;");
  expect(post).toContain("ensureDiamondFxaaSnapshotTexture=(width:number,height:number,activeRenderer:any)=>{");
  expect(post).toContain("gemMaskTarget=new THREE.WebGLRenderTarget(");
  expect(post).toContain("ensureDiamondFxaaSnapshotTexture(width,height,activeRenderer)");
  expect(post).toContain("activeRenderer.copyFramebufferToTexture(snapshot,new THREE.Vector2(0,0))");
  expect(post).toContain("fxaaPass.render(activeRenderer,null,{texture:snapshot},0,false)");
  expect(post).toContain("if(centerMask<0.5) discard;");
  expect(post).not.toContain("ensureDiamondSupersampleFxaaTarget");
  expect(post).not.toContain("renderFxaa(activeRenderer,enabled:boolean)");
  expect(render).toContain('const blocked=item.key!=="gemMaskEnabled"&&!diamondPostControls.gemMaskEnabled;');
  expect(render).toContain("composer.render()");
  expect(render).toContain("progressiveFrames: getAurumPostControls().diamondTaaEnabled ? 32");
  expect(render).toContain("setAurumPostControls({diamondSsaaEnabled:!enabled})");
  expect(render).toContain("subscribeAurumPostControls((controls) => {");
  expect(render).toContain("setDiamondPostControls(controls);");
  expect(render).toContain("return subscribeAurumPostControls((controls) => {");
  expect(render).toContain("renderDiamondFxaaOverlay?.(renderer)");
  expect(render).toContain("renderer.render(escena,camara);");
  expect(render).not.toContain("renderDiamondFxaaFrame?.(renderer)");
  expect(post).not.toContain("composer.addPass(fxaaPass)");
});

test("native FXAA target preserves renderer state and applies output color conversion only once", () => {
  const post = readFileSync("src/lib/aurum/post.ts", "utf8");
  const start = post.indexOf("const renderDiamondFxaaOverlay=(activeRenderer:any)=>");
  const end = post.indexOf("const renderDiamondSupersampleOverlay=", start);
  const pass = post.slice(start, end);
  expect(start).toBeGreaterThan(-1);
  expect(pass).toContain("activeRenderer.setRenderTarget(null)");
  expect(pass).toContain("activeRenderer.copyFramebufferToTexture(snapshot,new THREE.Vector2(0,0))");
  expect(pass).toContain("previousTarget");
  expect(pass).toContain("previousViewport");
  expect(pass).toContain("previousScissor");
  expect(pass).toContain("previousAutoClear");
  expect(pass).not.toContain("diamondSupersample");
  expect(post).toContain("diamondFxaaSnapshotTexture.colorSpace=THREE.NoColorSpace");
  expect(post).toContain("aurumSrgbToLinear(sampledCenter.rgb)");
  expect(post).toContain("return aurumSrgbToLinear(texture2D(tDiffuse,uv).rgb);");
  expect(post).toContain("#include <colorspace_fragment>");
  expect(post).toContain("fxaaPass.material.toneMapped=false");
  expect(post).toContain("fxaaPass.material.depthTest=false");
  expect(post).toContain("fxaaPass.material.depthWrite=false");
  expect(post).toContain("fxaaPass.material.blending=THREE.NoBlending");
});

test("SSAA mask is generated once natively and once at auxiliary resolution, then FXAA overlays after reconstruction", () => {
  const post = readFileSync("src/lib/aurum/post.ts", "utf8");
  const render = readFileSync("src/components/AurumRender.tsx", "utf8");
  const ssaaStart = post.indexOf("const renderDiamondSupersampleOverlay=(activeRenderer:any)=>");
  const ssaaEnd = post.indexOf("const resetTemporalAccumulation=", ssaaStart);
  const ssaaBlock = post.slice(ssaaStart, ssaaEnd);
  const frameStart = render.indexOf("const diamondFxaaOverlayRequested =");
  const frameEnd = render.indexOf("const renderCpuMs", frameStart);
  const frameBlock = render.slice(frameStart, frameEnd);
  expect(ssaaStart).toBeGreaterThan(-1);
  expect(ssaaBlock).not.toContain("gemMaskPass.render(activeRenderer)");
  expect(ssaaBlock).toContain("diamondSupersamplePass.render(activeRenderer)");
  expect(post).toContain("get targetWidth(){ return diamondSupersampleTarget?.width??0; }");
  expect(post).toContain("get targetHeight(){ return diamondSupersampleTarget?.height??0; }");
  expect(post).toContain("get renderCount(){ return diamondSupersampleRenderCount; }");
  expect(post).toContain("diamondSupersampleRenderCount+=1;");
  expect(render).toContain('[AURUM][DIAMOND_AA][EXECUTION]');
  expect(render).toContain("ssaaTargetWidth: Number(diamondSupersamplePass?.targetWidth ?? 0)");
  expect(render).toContain("ssaaRenderCount: Number(diamondSupersamplePass?.renderCount ?? 0)");
  expect(render).toContain('[AURUM][DIAMOND_AA][SSAA_RESULT]');
  expect(render).toContain("diamondSsaaOverlayRendered=Boolean(renderDiamondSupersampleOverlay?.(renderer))");
  expect(post).toContain("diamondSupersampleTarget.setSize(width,height);");
  expect(post).toContain("diamondSupersampleScaleCap=Math.max(1,Math.min(2.2,Number(cap)||1))");
  expect(post).toContain("// Count only completed auxiliary beauty + mask renders.");
  expect(frameBlock.indexOf("renderDiamondSupersampleOverlay?.(renderer)")).toBeLessThan(frameBlock.indexOf("renderDiamondFxaaOverlay?.(renderer)"));
  expect(frameBlock).not.toContain("&& !diamondSupersamplePass?.enabled");
});

test("diamond perimeter AA uses the stronger masked edge profile", () => {
  const source = readFileSync("src/lib/aurum/post.ts", "utf8");
  expect(source).toContain("strength:{value:0.76}");
  expect(source).toContain("edgeThreshold:{value:0.0312}");
  expect(source).toContain("float centerMask=texture2D(gemMask,vUv).r;");
  expect(source).toContain("float boundary=1.0-min(min(min(mN,mS),min(mE,mW)),min(min(mNW,mNE),min(mSW,mSE)));");
  expect(source).toContain("vec3 sampleGem(vec2 uv,vec3 fallbackColor)");
  expect(source).toContain("float dirX=-((lNW+lNE)-(lSW+lSE));");
  expect(source).toContain("float threshold=max(edgeThreshold,lMax*0.125);");
  expect(source).toContain("#include <colorspace_fragment>");
  expect(source).not.toContain("outsideNeighbor=1.0-min(min(m0,m1),min(m2,m3))");
});

test("legacy Post Engine preferences migrate to mask-isolated AA without enabling full-frame AA", () => {
  const controls = readFileSync("src/lib/aurum/post-engine-controls.ts", "utf8");
  const post = readFileSync("src/lib/aurum/post.ts", "utf8");
  expect(controls).toContain("diamondSsaaEnabled: value?.gemMaskEnabled === true && value?.diamondSsaaEnabled === true");
  expect(controls).toContain("surfaceEdgeAaEnabled: false");
  expect(controls).toContain("taaEnabled: false");
  expect(controls).toContain("const migrated = normalize(JSON.parse(legacy));");
  expect(controls).toContain("migrated.diamondTaaEnabled = migrated.gemMaskEnabled;");
  expect(post).toContain("removePass(taaPass);");
  expect(post).toContain("diamondTaaSavePass, taaPass, diamondTaaCompositePass");
  expect(post).toContain("const taaEnabled=diamondMaskReady && controls?.diamondTaaEnabled===true && !temporalMotionActive");
  expect(post).toContain("taaPass.sampleLevel=0;");
  expect(post).not.toContain("taaPass.sampleLevel=5;");
  expect(post).toContain("one jittered sample per idle frame");
  expect(post).not.toContain("taaRequested=Boolean(options.capture && postControls.taaEnabled)");
});

test("diamond SSAA restores the complete renderer and scene state after its auxiliary transaction", () => {
  const post = readFileSync("src/lib/aurum/post.ts", "utf8");
  const start = post.indexOf("diamondSupersamplePass={");
  const end = post.indexOf("diamondSupersampleCompositePass=new FXAAShaderPass", start);
  const pass = post.slice(start, end);
  for (const state of [
    "previousToneMapping",
    "previousToneMappingExposure",
    "previousOutputColorSpace",
    "previousLocalClippingEnabled",
    "previousClippingPlanes",
    "previousShadowAutoUpdate",
    "previousXrEnabled",
    "previousSortObjects",
    "previousSceneOverride",
    "previousSceneBackground",
  ]) expect(pass).toContain(state);
  expect(pass).toContain("activeRenderer.outputColorSpace=previousOutputColorSpace;");
  expect(pass).toContain("scene.overrideMaterial=previousSceneOverride;");
  expect(pass).toContain("scene.background=previousSceneBackground;");
  expect(pass).toContain("renderGemMaskWithOcclusion(activeRenderer,activeMaskTarget);");
});

test("diamond-only post composites preserve every pixel outside the diamond mask", () => {
  const post = readFileSync("src/lib/aurum/post.ts", "utf8");
  expect(post).toContain("if(texture2D(gemMask,vUv).r<0.5){gl_FragColor=base;return;}");
  expect(post).toContain("if(texture2D(gemMask,uv).r<0.5) return fallbackColor;");
  expect(post).toContain("vec3 result=center.rgb;");
  expect(post).toContain("gl_FragColor=vec4(result,center.a);");
  expect(post).toContain("if(surfaceEdgeAaPass) surfaceEdgeAaPass.enabled=false;");
});

test("diamond SSAA scale cap is updated through the pipeline-owned state", () => {
  const source = readFileSync("src/lib/aurum/post.ts", "utf8");
  expect(source).toContain("setScaleCap(cap:number)");
  expect(source).toContain("diamondSupersampleScaleCap=Math.max(1,Math.min(2.2,Number(settledCap)||1))");
  expect(source).toContain("diamondSupersampleActiveScaleCap=diamondSupersamplingSettled?diamondSupersampleScaleCap:diamondLiveSupersampleScaleCap;");
  expect(source).toContain("diamondSupersampleActiveScaleCap=Math.max(1,Math.min(2.2,Number(cap)||1));");
  expect(source).toContain("get settledScaleCap(){ return diamondSupersampleScaleCap; }");
  expect(source).toContain("get liveScaleCap(){ return diamondLiveSupersampleScaleCap; }");
  expect(source).toContain("get activeScaleCap(){ return diamondSupersampleActiveScaleCap; }");
  expect(source).not.toContain("diamondSupersampleScaleCap=THREE.MathUtils");
});

test("live camera motion keeps diamond-only supersampling active at a reduced adaptive scale", () => {
  const post = readFileSync("src/lib/aurum/post.ts", "utf8");
  const render = readFileSync("src/components/AurumRender.tsx", "utf8");
  expect(post).toContain("diamondSupersampleActiveScaleCap=next?diamondLiveSupersampleScaleCap:diamondSupersampleScaleCap;");
  expect(post).toContain("diamondSupersamplePass?.setScaleCap?.(diamondSupersampleActiveScaleCap);");
  expect(post).toContain("const ssaaRequested=controls?.diamondSsaaEnabled===true;");
  expect(post).toContain("const fxaaRequested=controls?.gemFxaaEnabled===true;");
  expect(post).toContain("if(fxaaPass) fxaaPass.enabled=fxaaEnabled;");
  expect(post).not.toContain("hasDiamond && diamondSupersamplingSettled && renderer.capabilities");
  expect(render).toContain("runtimeBudget.diamondLiveSupersampleScaleCap");
  expect(render).toContain("renderDiamondSupersampleOverlay?.(renderer)");
  expect(render).toContain("motionState:String(diamondSupersamplePass?.motionState??\"unknown\")");
  expect(render).toContain("settledScaleCap:Number(diamondSupersamplePass?.settledScaleCap??0)");
  expect(render).toContain("liveScaleCap:Number(diamondSupersamplePass?.liveScaleCap??0)");
  expect(render).toContain("activeScaleCap:Number(diamondSupersamplePass?.activeScaleCap??0)");
  expect(render).not.toContain("const diamondSsaaOverlayActive=");
  expect(render).toContain('? (diamondFxaaOverlayRequested ? "direct+diamond-ssaa+diamond-fxaa" : "direct+diamond-ssaa")');
  expect(render).toContain("if(diamondOverlayRequested) renderDiamondSupersampleOverlay?.(renderer);");
  expect(render).toContain("if(diamondFxaaOverlayRequested)");
  expect(render).toContain("renderer.render(escena,camara);");
  expect(post).not.toContain("composer.addPass(fxaaPass)");
});


test("colored gemstones use the native LIVE color pipeline and restore BEAUTY optics", () => {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xb00024,
    transmission: 0.62,
    ior: 1.76,
    dispersion: 0.12,
    iridescence: 0.25,
  });
  const beautyCompile = () => {};
  const beautyCacheKey = () => "aurum-beauty-ruby";
  material.onBeforeCompile = beautyCompile;
  material.customProgramCacheKey = beautyCacheKey;
  material.userData = {
    aurumGemFamily: "Rubí",
    aurumBeautyOnBeforeCompile: beautyCompile,
    aurumBeautyProgramCacheKey: beautyCacheKey,
    aurumLiveShaderQuality: "beauty",
  };

  setAurumGemShaderQuality(material, "live");
  expect(material.userData.aurumLiveShaderQuality).toBe("live");
  expect(material.onBeforeCompile).not.toBe(beautyCompile);
  expect(material.dispersion).toBe(0);
  expect(material.iridescence).toBe(0);
  expect(material.transmission).toBe(0.62);
  expect(material.ior).toBe(1.76);

  setAurumGemShaderQuality(material, "beauty");
  expect(material.userData.aurumLiveShaderQuality).toBe("beauty");
  expect(material.onBeforeCompile).toBe(beautyCompile);
  expect(material.customProgramCacheKey).toBe(beautyCacheKey);
  expect(material.dispersion).toBe(0.12);
  expect(material.iridescence).toBe(0.25);
  expect(material.transmission).toBe(0.62);

  material.dispose();
});

test("the dedicated diamond shader remains active when the viewport switches to LIVE", () => {
  const material = new THREE.MeshPhysicalMaterial({ dispersion: 0.18, iridescence: 0.1 });
  const beautyCompile = () => {};
  const beautyCacheKey = () => "aurum-diamond-beauty";
  material.onBeforeCompile = beautyCompile;
  material.customProgramCacheKey = beautyCacheKey;
  material.userData = {
    aurumGemFamily: "Diamante",
    aurumBeautyOnBeforeCompile: beautyCompile,
    aurumBeautyProgramCacheKey: beautyCacheKey,
    aurumLiveShaderQuality: "beauty",
  };

  setAurumGemShaderQuality(material, "live");

  expect(material.userData.aurumLiveShaderQuality).toBe("beauty");
  expect(material.onBeforeCompile).toBe(beautyCompile);
  expect(material.dispersion).toBe(0.18);
  expect(material.iridescence).toBe(0.1);

  material.dispose();
});

test("Aurum Render enables LIVE gemstone quality and reapplies it after catalog material changes", () => {
  const source = readFileSync("src/components/AurumRender.tsx", "utf8");
  expect(source).toContain("const live=forceLive ?? true;");
  const applyGem = source.indexOf("const aplicarGema =");
  const liveReapply = source.indexOf("aplicarPerfilLive();", applyGem);
  const maskRefresh = source.indexOf("gemMaskPass?.refreshCache?.();", liveReapply);
  expect(liveReapply).toBeGreaterThan(applyGem);
  expect(maskRefresh).toBeGreaterThan(liveReapply);
});


test("loading a CAD model refreshes the screen-space diamond analyzer before Gem Mask cache", () => {
  const source = readFileSync("src/components/AurumRender.tsx", "utf8");
  const addModel = source.indexOf("escena.add(modelo);");
  const microRefresh = source.indexOf("diamondMicroPipelineRef.current?.refresh?.();", addModel);
  const maskRefresh = source.indexOf("gemMaskPass?.refreshCache?.();", microRefresh);
  expect(addModel).toBeGreaterThanOrEqual(0);
  expect(microRefresh).toBeGreaterThan(addModel);
  expect(maskRefresh).toBeGreaterThan(microRefresh);
});

test("Aurum Render never enables full-surface edge AA while diamond-only quality is in scope", () => {
  const post = readFileSync("src/lib/aurum/post.ts", "utf8");
  const render = readFileSync("src/components/AurumRender.tsx", "utf8");
  expect(post).toContain("if(surfaceEdgeAaPass) surfaceEdgeAaPass.enabled=false;");
  expect(post).not.toContain("surfaceEdgeAaPass.enabled=postControls.surfaceEdgeAaEnabled");
  expect(post).not.toContain("surfaceEdgeAaPass.enabled=Boolean(controls.surfaceEdgeAaEnabled)");
  expect(render).toContain("surfaceEdgeAaEnabled:false,outputPass");
});


test("global renderer and composer MSAA stay disabled for diamond-only antialiasing", () => {
  const viewer = readFileSync("src/lib/aurum/viewer.ts", "utf8");
  const edgeManager = readFileSync("src/lib/aurum/edge-quality/edge-quality-manager.ts", "utf8");
  expect(viewer).toContain("antialias: true");
  expect(viewer).not.toContain("antialias: false");
  expect(edgeManager).toContain("configureAurumComposerMsaa(renderer, composer, 4)");
  expect(edgeManager).not.toContain("configureAurumComposerMsaa(renderer, composer, 0)");
});

test("Gem Mask diagnostics button requests a one-shot readback and renders the demand-driven viewer immediately", () => {
  const render = readFileSync("src/components/AurumRender.tsx", "utf8");
  const viewer = readFileSync("src/lib/aurum/viewer.ts", "utf8");
  expect(render).toContain("onClick={requestGemMaskDiagnostics}");
  expect(render).toContain("maskPass.requestDiagnostics();");
  expect(render).toContain("if (loop?.renderNow) loop.renderNow();");
  expect(render).toContain('setGemMaskDiagnosticStatus("pending")');
  expect(render).toContain('setGemMaskDiagnosticStatus(maskPixels < 0 ? "error" : "ready")');
  expect(viewer).toContain("renderNow: () => {");
});


test("diamond FXAA preference survives a failed masked overlay and retries on the next frame", () => {
  const post = readFileSync("src/lib/aurum/post.ts", "utf8");
  const render = readFileSync("src/components/AurumRender.tsx", "utf8");
  const start = post.indexOf("const renderDiamondFxaaOverlay=(activeRenderer:any)=>");
  const end = post.indexOf("const renderDiamondSupersampleOverlay=", start);
  const overlay = post.slice(start, end);
  expect(start).toBeGreaterThan(-1);
  expect(overlay).toContain("Masked overlay failed; preserving the direct beauty frame.");
  expect(overlay).toContain("if(failed){");
  expect(overlay).not.toContain("fxaaPass.enabled=false");
  const frameStart = render.indexOf("const renderedWithDiamondFxaaOverlay=Boolean(renderDiamondFxaaOverlay?.(renderer));");
  const frameEnd = render.indexOf("// SSAA composites only the classified diamond pixels", frameStart);
  const frameFallback = render.slice(frameStart, frameEnd);
  expect(frameStart).toBeGreaterThan(-1);
  expect(frameFallback).toContain("renderer.render(escena,camara);");
  expect(frameFallback).not.toContain("setAurumPostControls({gemFxaaEnabled:false})");
  expect(frameFallback).not.toContain("setDiamondPostControls(safeControls)");
});


test("diamond scintillation widens only the diamond angular response and reports BVH-owned gem HDR separately", () => {
  const scintillation = readFileSync("src/lib/aurum/scintillation.ts", "utf8");
  const bvh = readFileSync("src/lib/aurum/aurum-diamond-bvh-runtime.ts", "utf8");
  expect(scintillation).toContain('smoothstep(${isDiamond ? "0.92" : "0.94"}-aurumDiamondFacetAA,0.997+aurumDiamondFacetAA,aurumFacing)');
  expect(bvh).toContain("gemEnvironment: {");
  expect(bvh).toContain("loaded: Boolean(environmentMap?.isTexture)");
  expect(bvh).toContain("textureUuid: environmentMap?.uuid ?? null");
});
