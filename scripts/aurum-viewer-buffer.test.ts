import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createAurumWebGLViewer, resizeAurumViewer, startAurumViewerLoop } from "../src/lib/aurum/viewer";
import { getAurumRuntimeBudget } from "../src/lib/aurum/runtime-budget";

test("PNG capture resizes and restores the isolated gem render targets", () => {
  const componentSource = readFileSync("src/components/AurumRender.tsx", "utf8");
  const captureStart = componentSource.indexOf("exportPNG:async");
  const captureEnd = componentSource.indexOf("exportGLB:", captureStart);
  const captureBlock = componentSource.slice(captureStart, captureEnd);
  expect(captureStart).toBeGreaterThan(-1);
  expect(captureBlock).toContain("gemMaskPass?.setSize?.(width,height)");
  expect(captureBlock).toContain("diamondSupersamplePass?.setSize?.(width,height)");
  expect(captureBlock).toContain("gemMaskPass?.setSize?.(originalBufferWidth,originalBufferHeight)");
  expect(captureBlock).toContain("diamondSupersamplePass?.setSize?.(originalBufferWidth,originalBufferHeight)");
});

test("Aurora Blue uses the same SVG asset in the viewer and PNG export", () => {
  const sceneSource = readFileSync("src/lib/aurum/scene.ts", "utf8");
  const componentSource = readFileSync("src/components/AurumRender.tsx", "utf8");
  expect(sceneSource).toContain("AURORA_BLUE_DATA_URL");
  expect(sceneSource).toContain('image.startsWith("data:image/svg+xml")');
  expect(componentSource).toContain("drawAuroraBackground(selectedBackground.image)");
  expect(componentSource).not.toContain('context.fillRect(-1, -0.52 / 1.45, 1, (1 - 0.52) / 1.45)');
});

test("the demand-driven viewer preserves its final WebGL frame", () => {
  let rendererOptions: Record<string, unknown> = {};
  const canvas = Object.assign(new EventTarget(), { className: "" });
  const THREE = {
    Scene: class {},
    PerspectiveCamera: class {},
    WebGLRenderer: class {
      domElement = canvas;
      constructor(options: Record<string, unknown>) { rendererOptions = options; }
      setPixelRatio() {}
    },
  };
  const host = { appendChild() {} } as unknown as HTMLElement;

  createAurumWebGLViewer(THREE, host);

  expect(rendererOptions.preserveDrawingBuffer).toBe(true);
  expect(rendererOptions.antialias).toBe(true);
  expect(rendererOptions.alpha).toBe(true);
});

test("the viewer pauses on WebGL context loss and resumes after restoration", () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const scheduled = new Map<number, FrameRequestCallback>();
  let nextFrameId = 1;
  let renderCount = 0;
  let resizeCount = 0;

  class MockResizeObserver {
    constructor(private callback: ResizeObserverCallback) {}
    observe() {}
    disconnect() {}
  }

  const mockWindow = new EventTarget() as EventTarget & { visualViewport?: EventTarget };
  const mockDocument = Object.assign(new EventTarget(), { visibilityState: "visible" }) as Document;
  globalThis.window = mockWindow as unknown as Window & typeof globalThis;
  globalThis.document = mockDocument;
  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    const id = nextFrameId++;
    scheduled.set(id, callback);
    return id;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => {
    scheduled.delete(id);
  }) as typeof cancelAnimationFrame;

  const canvas = new EventTarget() as EventTarget & { parentElement?: HTMLElement };
  const viewer = {
    node: {
      clientWidth: 800,
      clientHeight: 600,
      getBoundingClientRect: () => ({ width: 800, height: 600 }),
    },
    camera: { aspect: 1, updateProjectionMatrix() {} },
    renderer: { domElement: canvas, setSize() { resizeCount++; } },
    controls: null,
  };

  const flushFrame = () => {
    const entry = scheduled.entries().next().value as [number, FrameRequestCallback] | undefined;
    if (!entry) return;
    scheduled.delete(entry[0]);
    entry[1](0);
  };

  try {
    const loop = startAurumViewerLoop(viewer as any, () => { renderCount++; });
    flushFrame();
    const rendersBeforeWake = renderCount;

    // Native WebView2 focus restoration must wake demand rendering without
    // requiring a user click on the canvas.
    mockWindow.dispatchEvent(new Event("focus"));
    expect(scheduled.size).toBeGreaterThan(0);
    flushFrame();
    expect(renderCount).toBeGreaterThan(rendersBeforeWake);

    const rendersBeforeLoss = renderCount;

    const lost = new Event("webglcontextlost", { cancelable: true });
    canvas.dispatchEvent(lost);
    expect(lost.defaultPrevented).toBe(true);
    expect(scheduled.size).toBe(0);

    const restored = new Event("webglcontextrestored");
    canvas.dispatchEvent(restored);
    expect(scheduled.size).toBe(1);
    flushFrame();
    expect(renderCount).toBeGreaterThan(rendersBeforeLoss);
    expect(resizeCount).toBeGreaterThan(0);

    loop.stop();
    expect(scheduled.size).toBe(0);
  } finally {
    globalThis.ResizeObserver = originalResizeObserver;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});


test("the demand-driven loop retries a transient frame exception with bounded recovery", () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const scheduledFrames = new Map<number, FrameRequestCallback>();
  const scheduledTimers = new Map<number, () => void>();
  let nextFrameId = 1;
  let nextTimerId = 1;
  let renderCount = 0;

  class MockResizeObserver {
    constructor(private callback: ResizeObserverCallback) {}
    observe() {}
    disconnect() {}
  }

  const mockWindow = Object.assign(new EventTarget(), {
    setTimeout(callback: () => void) {
      const id = nextTimerId++;
      scheduledTimers.set(id, callback);
      return id;
    },
    clearTimeout(id: number) {
      scheduledTimers.delete(id);
    },
  });
  const mockDocument = Object.assign(new EventTarget(), { visibilityState: "visible" }) as Document;
  globalThis.window = mockWindow as unknown as Window & typeof globalThis;
  globalThis.document = mockDocument;
  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    const id = nextFrameId++;
    scheduledFrames.set(id, callback);
    return id;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => {
    scheduledFrames.delete(id);
  }) as typeof cancelAnimationFrame;

  const flushFrame = () => {
    const entry = scheduledFrames.entries().next().value as [number, FrameRequestCallback] | undefined;
    if (!entry) return;
    scheduledFrames.delete(entry[0]);
    entry[1](0);
  };
  const flushTimer = () => {
    const entry = scheduledTimers.entries().next().value as [number, () => void] | undefined;
    if (!entry) return;
    scheduledTimers.delete(entry[0]);
    entry[1]();
  };

  try {
    const loop = startAurumViewerLoop({
      node: {
        getBoundingClientRect: () => ({ width: 640, height: 480 }),
      },
      camera: { aspect: 1, updateProjectionMatrix() {} },
      renderer: { domElement: new EventTarget(), setSize() {} },
      controls: null,
    } as any, () => {
      renderCount++;
      if (renderCount === 1) throw new Error("simulated transient GPU frame failure");
    });

    flushFrame();
    expect(renderCount).toBe(1);
    expect(scheduledTimers.size).toBe(1);
    expect(scheduledFrames.size).toBe(0);

    // The bounded backoff queues one retry; a transient error must not leave
    // the viewer blank until the next mouse click.
    flushTimer();
    expect(scheduledFrames.size).toBe(1);
    flushFrame();
    expect(renderCount).toBe(2);
    expect(scheduledTimers.size).toBe(0);

    loop.stop();
    expect(scheduledFrames.size).toBe(0);
    expect(scheduledTimers.size).toBe(0);
  } finally {
    globalThis.ResizeObserver = originalResizeObserver;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});


test("the viewer recovers on host wake when WebGL is available but restoration event was missed", () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const scheduled = new Map<number, FrameRequestCallback>();
  let nextFrameId = 1;
  let renderCount = 0;
  let resetStateCount = 0;
  let setRenderTargetCount = 0;
  let contextLost = false;

  class MockResizeObserver {
    constructor(private callback: ResizeObserverCallback) {}
    observe() {}
    disconnect() {}
  }

  const mockWindow = new EventTarget() as EventTarget & { visualViewport?: EventTarget };
  const mockDocument = Object.assign(new EventTarget(), { visibilityState: "visible" }) as Document;
  globalThis.window = mockWindow as unknown as Window & typeof globalThis;
  globalThis.document = mockDocument;
  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    const id = nextFrameId++;
    scheduled.set(id, callback);
    return id;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => {
    scheduled.delete(id);
  }) as typeof cancelAnimationFrame;

  const canvas = new EventTarget();
  const context = { isContextLost: () => contextLost };
  const flushFrame = () => {
    const entry = scheduled.entries().next().value as [number, FrameRequestCallback] | undefined;
    if (!entry) return;
    scheduled.delete(entry[0]);
    entry[1](0);
  };

  try {
    const loop = startAurumViewerLoop({
      node: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
      camera: { aspect: 1, updateProjectionMatrix() {} },
      renderer: {
        domElement: canvas,
        getContext: () => context,
        setSize() {},
        setRenderTarget() { setRenderTargetCount++; },
        resetState() { resetStateCount++; },
      },
      controls: null,
    } as any, () => { renderCount++; });

    flushFrame();
    const beforeContextLoss = renderCount;
    contextLost = true;
    canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
    expect(scheduled.size).toBe(0);

    // Simulate a browser/host that makes the existing context usable again
    // but does not deliver webglcontextrestored to the canvas.
    contextLost = false;
    mockWindow.dispatchEvent(new Event("focus"));
    expect(scheduled.size).toBeGreaterThan(0);
    expect(resetStateCount).toBeGreaterThan(0);
    expect(setRenderTargetCount).toBe(1);
    flushFrame();
    expect(renderCount).toBeGreaterThan(beforeContextLoss);

    loop.stop();
    expect(scheduled.size).toBe(0);
  } finally {
    globalThis.ResizeObserver = originalResizeObserver;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});

test("the viewer reasserts the WebGL drawing surface on host wake without a context-loss event", () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const scheduled = new Map<number, FrameRequestCallback>();
  let nextFrameId = 1;
  let renderCount = 0;
  let resizeCount = 0;
  let resetStateCount = 0;
  let setRenderTargetCount = 0;

  class MockResizeObserver {
    constructor(private callback: ResizeObserverCallback) {}
    observe() {}
    disconnect() {}
  }

  const mockWindow = new EventTarget() as EventTarget & { visualViewport?: EventTarget };
  const mockDocument = Object.assign(new EventTarget(), { visibilityState: "visible" }) as Document;
  globalThis.window = mockWindow as unknown as Window & typeof globalThis;
  globalThis.document = mockDocument;
  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    const id = nextFrameId++;
    scheduled.set(id, callback);
    return id;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => {
    scheduled.delete(id);
  }) as typeof cancelAnimationFrame;

  const flushFrame = () => {
    const entry = scheduled.entries().next().value as [number, FrameRequestCallback] | undefined;
    if (!entry) return;
    scheduled.delete(entry[0]);
    entry[1](0);
  };
  const canvas = Object.assign(new EventTarget(), {
    width: 800,
    height: 600,
    clientWidth: 800,
    clientHeight: 600,
  });

  try {
    const loop = startAurumViewerLoop({
      node: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
      camera: { aspect: 800 / 600, updateProjectionMatrix() {} },
      renderer: {
        domElement: canvas,
        getSize(target: { set: (width: number, height: number) => unknown }) {
          target.set(800, 600);
          return target;
        },
        getPixelRatio: () => 1,
        getContext: () => ({ isContextLost: () => false }),
        setSize() { resizeCount++; },
        setRenderTarget() { setRenderTargetCount++; },
        resetState() { resetStateCount++; },
      },
      controls: null,
    } as any, () => { renderCount++; });

    flushFrame();
    const initialRenders = renderCount;
    expect(resizeCount).toBe(0);

    // Normal orbit input must not force a WebGL/composer resize.
    mockWindow.dispatchEvent(new Event("pointerdown"));
    expect(setRenderTargetCount).toBe(0);
    expect(resetStateCount).toBe(0);
    expect(resizeCount).toBe(0);

    // If the host left the foreground and then misses its focus event, the
    // first pointer press remains a guarded fallback for surface recovery.
    mockWindow.dispatchEvent(new Event("blur"));
    mockWindow.dispatchEvent(new Event("pointerdown"));
    expect(setRenderTargetCount).toBeGreaterThan(0);
    expect(resetStateCount).toBeGreaterThan(0);
    expect(resizeCount).toBeGreaterThan(0);
    flushFrame();
    expect(renderCount).toBeGreaterThan(initialRenders);

    loop.stop();
    expect(scheduled.size).toBe(0);
  } finally {
    globalThis.ResizeObserver = originalResizeObserver;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});



test("viewer resize delegates post-processing target sizing to the composer exactly once", () => {
  let rendererResizeCount = 0;
  let composerResizeCount = 0;
  let directSsaoResizeCount = 0;
  const canvas = { width: 1600, height: 1200 };
  const viewer = {
    node: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
    camera: { aspect: 4 / 3, updateProjectionMatrix() {} },
    renderer: {
      domElement: canvas,
      getPixelRatio: () => 2,
      getSize(target: { set: (width: number, height: number) => unknown }) {
        target.set(640, 480);
        return target;
      },
      setSize() { rendererResizeCount++; },
    },
    composer: { setSize() { composerResizeCount++; } },
    ssaoPass: { setSize() { directSsaoResizeCount++; } },
  };

  const changed = resizeAurumViewer(viewer as any);

  expect(changed).toBe(true);
  expect(rendererResizeCount).toBe(1);
  expect(composerResizeCount).toBe(1);
  expect(directSsaoResizeCount).toBe(0);
});


test("the XL softbox is opt-in when its configuration is missing or disabled", async () => {
  const { isAurumLargeSoftboxEnabled } = await import("../src/lib/aurum/lighting");

  expect(isAurumLargeSoftboxEnabled(undefined)).toBe(false);
  expect(isAurumLargeSoftboxEnabled({})).toBe(false);
  expect(isAurumLargeSoftboxEnabled({ largeSoftboxEnabled: false })).toBe(false);
  expect(isAurumLargeSoftboxEnabled({ largeSoftboxEnabled: true })).toBe(true);
});


test("lighting changes explicitly reset idle TAA accumulation before rendering", () => {
  const postSource = readFileSync("src/lib/aurum/post.ts", "utf8");
  const componentSource = readFileSync("src/components/AurumRender.tsx", "utf8");

  expect(postSource).toContain("const resetTemporalAccumulation=()=>");
  expect(postSource).toContain("taaPass.accumulateIndex=-1;");
  expect(componentSource).toContain("resetTemporalAccumulationRef.current?.();");
  expect(componentSource).toContain("resetTemporalAccumulationRef.current = resetTemporalAccumulation;");
});

test("studio reflector labels distinguish the XL diffuser from the main reflector", () => {
  const componentSource = readFileSync("src/components/AurumRender.tsx", "utf8");

  expect(componentSource).toContain("DIFUSOR AÉREO XL");
  expect(componentSource).toContain('label:"Reflector Cenital de Estudio"');
});


test("Mi Nube persists the complete studio lighting configuration", () => {
  const componentSource = readFileSync("src/components/AurumRender.tsx", "utf8");

  expect(componentSource).toContain("largeSoftboxEnabled: lightingStudio.largeSoftboxEnabled === true");
  expect(componentSource).toContain("largeSoftboxPower: lightingStudio.largeSoftboxPower");
  expect(componentSource).toContain("reflectorPower: lightingStudio.reflectorPower");
  expect(componentSource).toContain("reflectorScale: lightingStudio.reflectorScale");
  expect(componentSource).toContain("reflectors: {");
  expect(componentSource).toContain("patch.largeSoftboxEnabled = guardadas.largeSoftboxEnabled");
  expect(componentSource).toContain("patch.reflectors = reflectorsPatch");
  expect(componentSource).toContain("Missing XL/reflector values deliberately retain the safe default (XL off).");
});


test("the first settled model frame keeps the anti-aliasing composer active", () => {
  const componentSource = readFileSync("src/components/AurumRender.tsx", "utf8");
  const initialFramingStart = componentSource.indexOf('requestAnimationFrame(() => {', componentSource.indexOf('loadAuditStep("load-pipeline-complete"'));
  const initialFramingEnd = componentSource.indexOf('});', initialFramingStart);
  const initialFramingBlock = componentSource.slice(initialFramingStart, initialFramingEnd);

  expect(initialFramingStart).toBeGreaterThan(-1);
  expect(initialFramingBlock).toContain('camaraVista("frontal")');
  expect(initialFramingBlock).toContain("invalidateRenderRef.current?.()");
  expect(initialFramingBlock).not.toContain("liveFastPathRef.current = true");
  expect(initialFramingBlock).not.toContain("aplicarPerfilLive()");
});


test("quality refreshes do not force-disable Gem Mask-protected diamond AA modules", () => {
  const postSource = readFileSync("src/lib/aurum/post.ts", "utf8");
  const qualityStart = postSource.indexOf("const applyQuality=");
  const qualityEnd = postSource.indexOf("const resetTemporalAccumulation=", qualityStart);
  const qualityBlock = postSource.slice(qualityStart, qualityEnd);
  expect(qualityStart).toBeGreaterThan(-1);
  expect(qualityBlock).not.toContain("diamondSupersamplePass.enabled=false");
  expect(qualityBlock).not.toContain("diamondSupersampleCompositePass.enabled=false");
  expect(qualityBlock).not.toContain("gemMaskPass.enabled=false");
  expect(qualityBlock).not.toContain("fxaaPass.enabled=fxaaActive");
  expect(postSource).toContain("applyDiamondPostModules(getAurumPostControls());");
  expect(postSource).toContain("const ssaaEnabled=diamondMaskReady && ssaaRequested && !taaEnabled && canReconstruct");
  expect(postSource).toContain("const fxaaEnabled=diamondMaskReady && fxaaRequested");
  // Quality refreshes delegate settled diamond TAA to the Gem Mask-protected coordinator.
  expect(qualityBlock).toContain("Diamond TAA is owned by applyDiamondPostModules()");
});

test("Aurum exposes diamond-only AA and SSAA as independent modules", () => {
  const componentSource = readFileSync("src/components/AurumRender.tsx", "utf8");
  const controlsSource = readFileSync("src/lib/aurum/post-engine-controls.ts", "utf8");
  const architectureSource = readFileSync("src/components/aurum/AurumArchitectureExplorer.tsx", "utf8");
  const postSource = readFileSync("src/lib/aurum/post.ts", "utf8");
  expect(componentSource).toContain("const liveDiamondAaEnabled = Boolean(livePostControls.gemFxaaEnabled && hasCenterDiamond);");
  expect(componentSource).toContain("setDiamondSupersamplingSettled?.(false)");
  expect(componentSource).toContain("const diamondSsaaActive = Boolean(diamondSupersamplePass?.enabled && diamondSupersampleCompositePass?.enabled);");
  expect(controlsSource).toContain("gemFxaaEnabled: true");
  expect(controlsSource).toContain("diamondSsaaEnabled: value?.gemMaskEnabled === true && value?.diamondSsaaEnabled === true");
  expect(controlsSource).toContain("const normalize = (value: any): AurumPostControls");
  expect(controlsSource).toContain("gemMaskEnabled: value?.gemMaskEnabled === true");
  expect(controlsSource).toContain('const STORAGE_KEY = "aurum:post-engine-controls:v5";');
  expect(controlsSource).toContain("migrated.gemMaskEnabled = true;");
  expect(controlsSource).toContain("migrated.diamondSsaaEnabled = true;");
  expect(controlsSource).toContain("migrated.gemFxaaEnabled = true;");
  expect(componentSource).toContain("gemMaskPass.enabled=getAurumPostControls().gemMaskEnabled");
  expect(componentSource).toContain("composer.render()");
  expect(componentSource).toContain("diamondTaaRendered");
  expect(componentSource).not.toContain("gemMaskPass.renderDiagnosticOverlay?.(renderer)");
  expect(controlsSource).toContain("diamondSsaaEnabled: value?.gemMaskEnabled === true && value?.diamondSsaaEnabled === true");
  expect(controlsSource).toContain("gemFxaaEnabled: true");
  expect(componentSource).toContain("Cadena coordinada: Gem Mask limita el diamante; SSAA trabaja durante el movimiento; TAA acumula hasta 32 muestras con la cámara quieta y toma el relevo de SSAA; FXAA se aplica al final. Los metales y el entorno conservan la imagen base.");
  expect(controlsSource).toContain("diamondSsaaEnabled: true,");
  expect(componentSource).toContain('item.key!=="gemMaskEnabled"&&!diamondPostControls.gemMaskEnabled');
  expect(architectureSource).toContain('estado: "experimental"');
  expect(componentSource).toContain("disabled={blocked}");
  expect(architectureSource).toContain('id: "diamond-ssaa"');
  expect(architectureSource).toContain('onClick={()=>updatePostControl("diamondSsaaEnabled",!postControls.diamondSsaaEnabled)}');
  expect(architectureSource).toContain('onClick={()=>updatePostControl("gemFxaaEnabled",!postControls.gemFxaaEnabled)}');
  expect(postSource).toContain("AURUM DIAMOND SSAA MODULE");
  expect(postSource).toContain("tDiamondHiRes");
  expect(postSource).toContain("float sampleMask=texture2D(tDiamondHiResMask,sampleUv).r;");
  expect(postSource).toContain("const ssaaRequested=controls?.diamondSsaaEnabled===true;");
  expect(postSource).toContain("const renderDiamondSupersampleOverlay=(activeRenderer:any)=>{");
  expect(postSource).toContain("diamondSupersampleCompositePass.render(activeRenderer,null,null,0,false)");
  expect(postSource).toContain("const diamondMeshCandidates:any[]=[];");
  expect(postSource).toContain("const syncCenterDiamondCache=(force=false)=>{");
  expect(postSource).toContain("const isProtectedCenterDiamond=(mesh:any)=>{");
  expect(postSource).toContain("Rebuild the native-resolution occlusion mask for every composed frame.");
  expect(postSource).not.toContain("lastGemMaskCameraState");
  expect(postSource).toContain("const previousViewport=activeRenderer.getViewport(new THREE.Vector4()).clone();");
  expect(postSource).toContain("const previousScissor=activeRenderer.getScissor(new THREE.Vector4()).clone();");
  expect(postSource).toContain("activeRenderer.setViewport(previousViewport);");
  expect(postSource).toContain("activeRenderer.setScissor(previousScissor);");
  expect(postSource).toContain("activeRenderer.setScissorTest(previousScissorTest);");
  expect(postSource).toContain("data.aurumDetectedCategory");
  expect(postSource).toContain("#include <tonemapping_fragment>");
  expect(componentSource).toContain("if(!diamondTaaRendered && diamondOverlayRequested){");
  expect(componentSource).toContain("renderDiamondSupersampleOverlay?.(renderer)");
  const liveBeautyStart = componentSource.indexOf("const diamondOverlayRequested = Boolean");
  const liveBeautyEnd = componentSource.indexOf("const renderCpuMs", liveBeautyStart);
  const liveBeautyBlock = componentSource.slice(liveBeautyStart, liveBeautyEnd);
  expect(liveBeautyStart).toBeGreaterThan(-1);
  expect(liveBeautyBlock).toContain("if(diamondTaaOverlayRequested && composer?.render){");
  expect(liveBeautyBlock).toContain("composer.render();");
  expect(postSource).toContain("const ssaaRequested=controls?.diamondSsaaEnabled===true;");
  expect(postSource).not.toContain("composer.addPass(diamondSupersampleCompositePass)");
  expect(componentSource).toContain('? (diamondFxaaOverlayRequested ? "direct+diamond-ssaa+diamond-fxaa" : "direct+diamond-ssaa")');
  expect(componentSource).toContain("renderDiamondSupersampleOverlay?.(renderer)");
  expect(componentSource).not.toContain("const interactionDprCap = liveDiamondAaEnabled && runtimeBudget.tier === \"web\"");
  expect(postSource).toContain("ensureDiamondSupersampleMaskTarget");
  expect(postSource).toContain("Render the complete optical scene at auxiliary resolution");
  expect(postSource).toContain("activeRenderer.render(scene,camera);");
  expect(postSource).toContain("coveredSamples+=step(0.5,sampleMask);");
  expect(postSource).toContain("if(abs(weight)>0.000001){");
  expect(postSource).toContain("float aurumCatmullRomWeight(float x){");
  expect(postSource).toContain("reconstructed=clamp(reconstructed,minimumSample,maximumSample);");
  expect(postSource).toContain("if(abs(weight)>0.000001){");
  expect(postSource).toContain("if(coveredSamples<0.5 || totalWeight<0.00001) discard;");
  expect(postSource).toContain("mesh.layers.enable(gemMaskLayer)");
});

test("the BVH camera update reuses fixed-size snapshots without per-frame arrays", () => {
  const bvhSource = readFileSync("src/lib/aurum/aurum-diamond-bvh-runtime.ts", "utf8");
  expect(bvhSource).toContain("const cameraStateBuffer = new Float64Array(12);");
  expect(bvhSource).toContain("const lastCameraState = new Float64Array(12);");
  expect(bvhSource).toContain("cameraStateBuffer[11] = camera.far ?? 0;");
  expect(bvhSource).toContain("lastCameraState.set(nextCameraState);");
  expect(bvhSource).not.toContain("const readCameraState = (): number[]");
});

test("selection highlight changes do not invalidate the gemstone mask cache", () => {
  const componentSource = readFileSync("src/components/AurumRender.tsx", "utf8");
  const selectionStart = componentSource.indexOf("const limpiarResaltado = () => {");
  const selectionEnd = componentSource.indexOf("const seleccionarPorClick", selectionStart);
  const selectionBlock = componentSource.slice(selectionStart, selectionEnd);
  expect(selectionStart).toBeGreaterThan(-1);
  expect(selectionBlock).not.toContain("gemMaskPass?.refreshCache?.();");
});

test("diamond SSAA high-resolution beauty target preserves the complete optical scene and masks only the composite", () => {
  const postSource = readFileSync("src/lib/aurum/post.ts", "utf8");
  expect(postSource).toContain("activeRenderer.render(scene,camera);");
  expect(postSource).toContain("renderGemMaskWithOcclusion(activeRenderer,activeMaskTarget);");
  expect(postSource).toContain("diamondSupersampleCompositePass.material.uniforms.tDiamondHiRes.value=activeTarget.texture;");
  expect(postSource).toContain("if(texture2D(gemMask,vUv).r<0.5) discard;");
  expect(postSource).toContain("activeRenderer.setClearColor(0x000000,0);");
  const ssaaStart = postSource.indexOf("diamondSupersamplePass={");
  const ssaaEnd = postSource.indexOf("diamondSupersampleCompositePass=", ssaaStart);
  const ssaaBlock = postSource.slice(ssaaStart, ssaaEnd);
  expect(ssaaStart).toBeGreaterThan(-1);
  expect(ssaaBlock).not.toContain("activeRenderer.render(scene,camera);\\n          } finally {\\n            activeRenderer.toneMapping=previousToneMapping;");
  expect(ssaaBlock).not.toContain("scene.background=null;");
  expect(ssaaBlock).toContain("activeRenderer.render(scene,camera);");
});

test("diamond SSAA never changes the full-scene renderer or composer DPR during motion", () => {
  const componentSource = readFileSync("src/components/AurumRender.tsx", "utf8");
  const postSource = readFileSync("src/lib/aurum/post.ts", "utf8");
  const motionStart = componentSource.indexOf("onStart: () => {", componentSource.indexOf("progressiveFrames:"));
  const motionEnd = componentSource.indexOf("onEnd: () => {", motionStart);
  const settledEnd = componentSource.indexOf("onCancel:", motionEnd);
  const motionBlock = componentSource.slice(motionStart, motionEnd);
  const settledBlock = componentSource.slice(motionEnd, settledEnd > motionEnd ? settledEnd : motionEnd + 9000);
  expect(motionStart).toBeGreaterThan(-1);
  expect(motionEnd).toBeGreaterThan(motionStart);
  expect(motionBlock).toContain("const interactionDpr = renderer.getPixelRatio();");
  expect(motionBlock).not.toContain("renderer.setPixelRatio(");
  expect(motionBlock).not.toContain("composer?.setPixelRatio?.(");
  expect(settledBlock).not.toContain("renderer.setPixelRatio(");
  expect(settledBlock).not.toContain("composer?.setPixelRatio?.(");
  expect(postSource).not.toContain("setViewport(0,0,target.width,target.height)");
  expect(postSource).not.toContain("setViewport(0,0,activeTarget.width,activeTarget.height)");
});

test("diamond AA stays masked in interactive and settled preview modes", () => {
  const componentSource = readFileSync("src/components/AurumRender.tsx", "utf8");
  const postSource = readFileSync("src/lib/aurum/post.ts", "utf8");
  const idleStart = componentSource.indexOf("onEnd: () => {");
  const idleEnd = componentSource.indexOf("onStart:", idleStart);
  const idleBlock = componentSource.slice(idleStart, idleEnd > idleStart ? idleEnd : idleStart + 8000);
  const liveStart = componentSource.indexOf("onStart: () => {", componentSource.indexOf("progressiveFrames:"));
  const liveEnd = componentSource.indexOf("onEnd:", liveStart);
  const liveBlock = componentSource.slice(liveStart, liveEnd);
  const initialAaStart = componentSource.indexOf("const initialTaaRequested = false;");
  const initialAaEnd = componentSource.indexOf("if (idleTaaPass)", initialAaStart);
  const initialAaBlock = componentSource.slice(initialAaStart, initialAaEnd);

  expect(idleStart).toBeGreaterThan(-1);
  expect(idleBlock).toContain("setTemporalMotion?.(false)");
  expect(idleBlock).toContain("settledDiamondTaaActive");
  expect(idleBlock).toContain("bloomPass.enabled = false;");
  expect(idleBlock).toContain("dofPass.enabled = false;");
  expect(liveBlock).toContain("const liveDiamondAaEnabled = Boolean(livePostControls.gemFxaaEnabled && hasCenterDiamond);");
  expect(liveBlock).toContain("setDiamondSupersamplingSettled?.(false)");
  expect(liveBlock).toContain("liveFastPathRef.current = false;");
  expect(postSource).toContain("taaMotionFallback");
  expect(postSource).toContain("const fxaaRequested=controls?.gemFxaaEnabled===true;");
  expect(postSource).not.toContain("composer.addPass(fxaaPass)");
  expect(initialAaBlock).toContain("const initialTaaRequested = false;");
});


test("standard image export composites isolated diamond reconstruction after beauty rendering", () => {
  const componentSource = readFileSync("src/components/AurumRender.tsx", "utf8");
  const postSource = readFileSync("src/lib/aurum/post.ts", "utf8");
  const exportStart = componentSource.indexOf("exportPNG:async");
  const exportEnd = componentSource.indexOf("exportGLB:", exportStart);
  const exportBlock = componentSource.slice(exportStart, exportEnd);

  expect(exportStart).toBeGreaterThan(-1);
  expect(exportBlock).toContain("liveFastPathRef.current=false");
  expect(exportBlock).toContain("...(diamondSupersamplePass?.enabled ? [diamondSupersamplePass] : [])");
  expect(exportBlock).not.toContain("...(fxaaPass?.enabled ? [fxaaPass] : [])");
  expect(postSource).toContain("const fxaaRequested=controls?.gemFxaaEnabled===true;");
  expect(postSource).toContain("const ssaaRequested=controls?.diamondSsaaEnabled===true;");
  expect(exportBlock).toContain("composer.setPixelRatio?.(1)");
  expect(exportBlock).toContain("composer.setSize?.(renderWidth, renderHeight)");
  expect(exportBlock).toContain("resolution?.set?.(1 / renderWidth, 1 / renderHeight)");
  expect(exportBlock).toContain("composer.render()");
  expect(exportBlock).toContain("composer.setSize?.(originalCssWidth, originalCssHeight)");
  expect(exportBlock).toContain("for(const state of capturePassStates)");
});


test("standard image export renders at native output resolution through the live diamond pipeline", () => {
  const componentSource = readFileSync("src/components/AurumRender.tsx", "utf8");
  const exportStart = componentSource.indexOf("exportPNG:async");
  const captureStart = componentSource.indexOf("// Render the same live beauty sequence at the requested output size.", exportStart);
  const captureEnd = componentSource.indexOf("if(options.onCapture)", captureStart);
  const captureBlock = componentSource.slice(captureStart, captureEnd);

  expect(captureStart).toBeGreaterThan(exportStart);
  expect(captureEnd).toBeGreaterThan(captureStart);
  expect(captureBlock).toContain("renderer.setSize(width,height,false)");
  expect(captureBlock).toContain("camara.aspect=width/height");
  expect(captureBlock).toContain("renderer.render(escena,camara)");
  expect(captureBlock).toContain("if(gemMaskPass.enabled) gemMaskPass.render(renderer)");
  expect(captureBlock).toContain("renderDiamondSupersampleOverlay?.(renderer)");
  expect(captureBlock).toContain("renderDiamondFxaaOverlay?.(renderer)");
  expect(captureBlock).toContain("context.drawImage(renderer.domElement,0,0,width,height)");
  expect(captureBlock).toContain("upscaled:false");
  expect(captureBlock).not.toContain("context.drawImage(liveCanvas");
  expect(captureBlock).toContain("captureLoop?.resume?.()");
});

test("gem mask uses a dedicated camera layer instead of per-frame mesh visibility mutation", () => {
  const postSource = readFileSync("src/lib/aurum/post.ts", "utf8");
  const maskStart = postSource.indexOf("const cachedGemMeshes:any[]=[];");
  const maskEnd = postSource.indexOf("// AURUM Soft Edge AA is composited", maskStart);
  const maskBlock = postSource.slice(maskStart, maskEnd);

  expect(maskStart).toBeGreaterThan(-1);
  expect(maskBlock).toContain("const gemMaskLayer=31;");
  expect(maskBlock).toContain("mesh.layers.enable(gemMaskLayer)");
  expect(maskBlock).toContain("camera.layers.mask=gemMaskLayerBit");
  expect(maskBlock).toContain("previousGemLayerMasks");
  expect(maskBlock).toContain("camera.layers.mask=previousCameraLayerMask");
  expect(maskBlock).not.toContain("cachedOccluderMeshes");
  expect(maskBlock).not.toContain(".visible=false");
  expect(maskBlock).not.toContain("cachedOccluderVisibility");
});


test("initial jewel presentation awaits BVH and synchronizes model and camera before first frame", () => {
  const componentSource = readFileSync("src/components/AurumRender.tsx", "utf8");
  const loadStart = componentSource.indexOf("modelo=interno;");
  const loadEnd = componentSource.indexOf("const shaderTarget=modelo;", loadStart);
  const loadBlock = componentSource.slice(loadStart, loadEnd);
  const bvhStart = componentSource.indexOf("const asegurarDiamanteBvh = async");
  const bvhEnd = componentSource.indexOf("let runtimeBudget", bvhStart);
  const bvhBlock = componentSource.slice(bvhStart, bvhEnd);
  const sceneStart = componentSource.indexOf("const aplicarEscenario =");
  const sceneEnd = componentSource.indexOf("const encuadrar =", sceneStart);
  const sceneBlock = componentSource.slice(sceneStart, sceneEnd);

  expect(loadBlock).toContain("await asegurarDiamanteBvh();");
  expect(loadBlock).not.toContain("void asegurarDiamanteBvh();");
  expect(loadBlock).toContain("diamondBvhRuntime?.update();");
  const sceneAddIndex = componentSource.indexOf("escena.add(modelo);", loadStart);
  const gemMaskRefreshIndex = componentSource.indexOf("gemMaskPass?.refreshCache?.();", sceneAddIndex);
  expect(sceneAddIndex).toBeGreaterThan(loadStart);
  expect(gemMaskRefreshIndex).toBeGreaterThan(sceneAddIndex);
  expect(bvhBlock).toContain("modelo.updateMatrixWorld?.(true);");
  expect(bvhBlock).toContain("camara.updateMatrixWorld?.(true);");
  expect(bvhBlock).toContain("runtime.refresh(modelo);");
  expect(bvhBlock).toContain("runtime.update();");
  expect(sceneBlock).not.toContain("liveFastPathRef.current = true;");
});


test("image export resets temporal accumulation and converges the restored live viewport", () => {
  const componentSource = readFileSync("src/components/AurumRender.tsx", "utf8");
  const exportStart = componentSource.indexOf("exportPNG:async");
  const restoreStart = componentSource.indexOf("// Rebuild the settled viewport image after the temporary high-resolution", exportStart);
  const restoreEnd = componentSource.indexOf("if(!dataUrl", restoreStart);
  const restoreBlock = componentSource.slice(restoreStart, restoreEnd);

  expect(exportStart).toBeGreaterThan(-1);
  expect(restoreStart).toBeGreaterThan(exportStart);
  expect(restoreBlock).toContain("resetTemporalAccumulationRef.current?.();");
  expect(restoreBlock).toContain("loop?.resize?.();");
  expect(restoreBlock).toContain("loop?.resume?.();");
  expect(restoreBlock).toContain("loop?.converge?.(4);");
  expect(restoreBlock.indexOf("loop?.resize?.();")).toBeLessThan(restoreBlock.indexOf("loop?.resume?.();"));
  expect(restoreBlock.indexOf("loop?.resume?.();")).toBeLessThan(restoreBlock.indexOf("loop?.converge?.(4);"));
});


test("video export restores the viewer and resumes the demand-driven loop", () => {
  const componentSource = readFileSync("src/components/AurumRender.tsx", "utf8");
  const videoStart = componentSource.indexOf("exportVideo:async");
  const videoEnd = componentSource.indexOf("setDepthOfField:", videoStart);
  const videoBlock = componentSource.slice(videoStart, videoEnd);

  expect(videoStart).toBeGreaterThan(-1);
  expect(videoBlock).toContain("() => loop?.resume?.(),");
  expect(videoBlock).toContain("loop?.setCaptureResizeLock?.(false)");
  expect(videoBlock).toContain("() => loop?.resume?.(),");
  expect(videoBlock).not.toContain("() => loop?.resize?.(),");
});


test("extreme scenes allow stronger settled diamond SSAA while preserving the live-motion cap", () => {
  const budget = getAurumRuntimeBudget(900_001);
  expect(budget.tier).toBe("extreme");
  expect(budget.diamondSupersampleScaleCap).toBe(1.5);
  expect(budget.diamondLiveSupersampleScaleCap).toBe(1.2);
});


test("diamond optical A/B modes isolate the iJewel-inspired shader without changing physical IOR", () => {
  const scintillationSource = readFileSync("src/lib/aurum/scintillation.ts", "utf8");
  const materialSource = readFileSync("src/lib/aurum-material-engine.ts", "utf8");
  expect(scintillationSource).toContain('get("aurumDiamondTest") ?? "source"');
  expect(scintillationSource).toContain('b:{label:"iJewel reference · physical IOR",ior:2.417,dispersion:0.01,rayBounces:5}');
  expect(scintillationSource).toContain('const ijewelEnabled=isDiamond && diamondTestMode!=="a"');
  expect(scintillationSource).toContain('diamondTestMode??"no-diamond-ab-test"');
  expect(scintillationSource).toContain('enabled:ijewelEnabled');
  expect(materialSource).toContain("const physicalIor=Math.max(1.01,Math.min(2.65,Number(material.ior??p.refractiveIndex)));");
  expect(materialSource).toContain("material.ior=physicalIor;");
  expect(materialSource).toContain("aurumIJEWELActive:false");
});
