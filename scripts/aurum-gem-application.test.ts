import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { createAurumGemEnvironment } from "../src/lib/aurum/gem-environment";
import { prepareAurumGemLayerIndex } from "../src/lib/aurum/material-application";
import { getAurumRuntimeBudget } from "../src/lib/aurum/runtime-budget";
import { setAurumGemShaderQuality } from "../src/lib/aurum/scintillation";

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
  const capture = source.indexOf("aurumGemTransitionSnapshot:captureAurumGemTransitionState(mesh)");
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
  expect(source).toContain("internalContrast: 1.15");
  expect(source).toContain("highlightShoulder: 0.70");
  expect(source).toContain("faceBrightness: 1.01");
  expect(source).toContain("rimEnergy: 0.025");
  expect(source).toContain('const isDiamond=family.trim().toLowerCase()==="diamante"');
  expect(source).toContain("smoothstep(0.025,0.22,ijSpectralSpread)");
  expect(source).toContain("ijSpectralLuma*0.88");
  expect(source).toContain("ijHighlightPeak-0.90");
});

test("runtime DPR remains unchanged to avoid changing shared metal rendering resolution", () => {
  const source = readFileSync("src/lib/aurum/runtime-budget.ts", "utf8");
  expect(source).toContain("pixelRatioCap:1.72");
  expect(source).toContain("interactionPixelRatio:1.72");
});

test("web-tier models receive 2x diamond-only supersampling without raising shared DPR", () => {
  const web = getAurumRuntimeBudget(200_000);
  expect(web.diamondSupersampleScaleCap).toBe(2);
  expect(web.diamondLiveSupersampleScaleCap).toBe(1.5);
  expect(web.pixelRatioCap).toBe(1.72);
  expect(web.interactionPixelRatio).toBe(1.72);

  const dense = getAurumRuntimeBudget(200_001);
  expect(dense.diamondSupersampleScaleCap).toBe(1.6);
  expect(dense.diamondLiveSupersampleScaleCap).toBe(1.35);
  expect(dense.pixelRatioCap).toBe(1.6);

  expect(getAurumRuntimeBudget(500_001).diamondLiveSupersampleScaleCap).toBe(1.25);
  expect(getAurumRuntimeBudget(900_001).diamondLiveSupersampleScaleCap).toBe(1.15);

  const post = readFileSync("src/lib/aurum/post.ts", "utf8");
  expect(post).toContain("Math.min(diamondSupersampleScaleCap,Math.sqrt(8_500_000/Math.max(1,basePixels)))");
  expect(post).toContain("if(texture2D(gemMask,vUv).r<0.5){gl_FragColor=base;return;}");
  expect(post).toContain("setDiamondSupersampleScaleCap");
});

test("diamond perimeter AA uses the stronger masked edge profile", () => {
  const source = readFileSync("src/lib/aurum/post.ts", "utf8");
  expect(source).toContain("strength:{value:0.76}");
  expect(source).toContain("edgeThreshold:{value:0.18}");
  expect(source).toContain("if(texture2D(gemMask,vUv).r<0.5){gl_FragColor=center;return;}");
});

test("diamond SSAA scale cap is updated through the pipeline-owned state", () => {
  const source = readFileSync("src/lib/aurum/post.ts", "utf8");
  expect(source).toContain("setScaleCap(cap:number)");
  expect(source).toContain("diamondSupersampleScaleCap=Math.max(1,Math.min(2,Number(settledCap)||1))");
  expect(source).toContain("diamondSupersamplePass?.setScaleCap?.(diamondSupersamplingSettled?diamondSupersampleScaleCap:diamondLiveSupersampleScaleCap)");
  expect(source).not.toContain("diamondSupersampleScaleCap=THREE.MathUtils");
});

test("live camera motion keeps diamond-only supersampling active at a reduced adaptive scale", () => {
  const post = readFileSync("src/lib/aurum/post.ts", "utf8");
  const render = readFileSync("src/components/AurumRender.tsx", "utf8");
  expect(post).toContain("diamondSupersamplePass?.setScaleCap?.(next?diamondLiveSupersampleScaleCap:diamondSupersampleScaleCap)");
  expect(post).toContain("controls.diamondSsaaEnabled && hasDiamond && renderer.capabilities?.isWebGL2 !== false");
  expect(post).not.toContain("hasDiamond && diamondSupersamplingSettled && renderer.capabilities");
  expect(render).toContain("runtimeBudget.diamondLiveSupersampleScaleCap");
  expect(render).toContain("diamondSupersamplingEnabled: liveDiamondSsaaActive");
  expect(render).toContain("[diamondSupersamplePass, gemMaskPass, diamondSupersampleCompositePass]");
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
