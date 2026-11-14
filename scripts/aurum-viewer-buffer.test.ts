import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createAurumWebGLViewer, resizeAurumViewer, startAurumViewerLoop } from "../src/lib/aurum/viewer";

test("the demand-driven viewer preserves its final WebGL frame", () => {
  let rendererOptions: Record<string, unknown> = {};
  const canvas = { className: "" };
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
      cameraControls: { getAspect: () => 1, setAspect: () => undefined, update: () => false },
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
      cameraControls: { getAspect: () => 800 / 600, setAspect: () => undefined, update: () => false },
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
    cameraControls: { getAspect: () => 4 / 3, setAspect: () => undefined, update: () => false },
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


test("the first settled model frame uses the AURUM CAMERA contract without a competing delayed preset", () => {
  const componentSource = readFileSync("src/components/AurumRender.tsx", "utf8");
  const framingStart = componentSource.indexOf("const encuadrar = () => {");
  const framingEnd = componentSource.indexOf("// Adaptadores de entrada", framingStart);
  const framingBlock = componentSource.slice(framingStart, framingEnd);
  const loadComplete = componentSource.indexOf('loadAuditStep("load-pipeline-complete"');
  const loadTail = componentSource.slice(loadComplete, componentSource.indexOf("};", loadComplete));

  expect(framingStart).toBeGreaterThan(-1);
  expect(framingBlock).toContain("frameAurumProduct({");
  expect(framingBlock).toContain("cameraControls: cameraControlsContract");
  expect(framingBlock).toContain("invalidateRenderRef.current?.()");
  expect(loadComplete).toBeGreaterThan(-1);
  expect(loadTail).not.toContain('camaraVista("frontal")');
  expect(loadTail).not.toContain("requestAnimationFrame");
});


test("Aurum uses the same beauty composer chain during camera motion and at rest", () => {
  const componentSource = readFileSync("src/components/AurumRender.tsx", "utf8");
  const start = componentSource.indexOf("onStart: () => {");
  const end = componentSource.indexOf("onEnd: () => {", start);
  const liveBlock = componentSource.slice(start, end);
  const idleEnd = componentSource.indexOf("onStart:", end);
  const idleBlock = componentSource.slice(end, idleEnd > end ? idleEnd : end + 8000);

  expect(start).toBeGreaterThan(-1);
  expect(liveBlock).toContain("new Set([renderPass, ...(interactiveEdgeAa ? [surfaceEdgeAaPass] : []), outputPass])");
  expect(liveBlock).toContain("if (gemMaskPass) gemMaskPass.enabled = false;");
  expect(liveBlock).toContain("if (fxaaPass) fxaaPass.enabled = false;");
  expect(liveBlock).not.toContain("new Set([renderPass, gemMaskPass, fxaaPass");
  expect(idleBlock).toContain("new Set([\n              renderPass,\n              gemMaskPass,\n              fxaaPass,");
  expect(idleBlock).toContain("sameBeautyPipelineAvailable");
  expect(liveBlock).toContain("sameBeautyPipelineAvailable");
  expect(liveBlock).toContain('renderPipelineContract.setMode("LIVE_MOTION")');
  expect(idleBlock).toContain('renderPipelineContract.setMode("RESTING_SETTLED")');
  expect(liveBlock).toContain("liveFastPathRef.current = !sameBeautyPipelineAvailable;");
  expect(idleBlock).toContain("liveFastPathRef.current = !sameBeautyPipelineAvailable;");
  expect(idleBlock).toContain("idleTaaPass.enabled = false;");
  expect(idleBlock).toContain("bloomPass.enabled = false;");
  expect(idleBlock).toContain("dofPass.enabled = false;");
  expect(idleBlock).toContain("ssrPass.enabled = false;");
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

test("the initial and settled viewport keep temporal and photographic passes out of the shared preview", () => {
  const componentSource = readFileSync("src/components/AurumRender.tsx", "utf8");
  const idleStart = componentSource.indexOf("onEnd: () => {");
  const idleEnd = componentSource.indexOf("onStart:", idleStart);
  const idleBlock = componentSource.slice(idleStart, idleEnd > idleStart ? idleEnd : idleStart + 8000);
  const initialAaStart = componentSource.indexOf("const initialTaaRequested = false;");
  const initialAaEnd = componentSource.indexOf("if (idleTaaPass)", initialAaStart);
  const initialAaBlock = componentSource.slice(initialAaStart, initialAaEnd);

  expect(idleStart).toBeGreaterThan(-1);
  expect(idleBlock).toContain("idleTaaPass.enabled = false;");
  expect(idleBlock).toContain("bloomPass.enabled = false;");
  expect(idleBlock).toContain("dofPass.enabled = false;");
  expect(initialAaBlock).toContain("const initialTaaRequested = false;");
});


test("standard image export reproduces the LIVE gem-mask and FXAA composer", () => {
  const componentSource = readFileSync("src/components/AurumRender.tsx", "utf8");
  const exportStart = componentSource.indexOf("exportPNG:async");
  const exportEnd = componentSource.indexOf("exportGLB:", exportStart);
  const exportBlock = componentSource.slice(exportStart, exportEnd);

  expect(exportStart).toBeGreaterThan(-1);
  expect(exportBlock).toContain("liveFastPathRef.current=false");
  expect(exportBlock).toContain("new Set([renderPass, gemMaskPass, fxaaPass, outputPass])");
  expect(exportBlock).toContain("composer.setPixelRatio?.(1)");
  expect(exportBlock).toContain("composer.setSize?.(renderWidth, renderHeight)");
  expect(exportBlock).toContain("resolution?.set?.(1 / renderWidth, 1 / renderHeight)");
  expect(exportBlock).toContain("composer.render()");
  expect(exportBlock).toContain("composer.setSize?.(originalCssWidth, originalCssHeight)");
  expect(exportBlock).toContain("for(const state of capturePassStates)");
});


test("gem mask uses a dedicated camera layer instead of per-frame mesh visibility mutation", () => {
  const postSource = readFileSync("src/lib/aurum/post.ts", "utf8");
  const maskStart = postSource.indexOf("const cachedGemMeshes:any[]=[];");
  const maskEnd = postSource.indexOf("// AURUM Soft Edge AA is composited", maskStart);
  const maskBlock = postSource.slice(maskStart, maskEnd);

  expect(maskStart).toBeGreaterThan(-1);
  expect(maskBlock).toContain("const gemMaskLayer=31;");
  expect(maskBlock).toContain("object.layers.enable(gemMaskLayer)");
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
  expect(bvhBlock).toContain("cameraControlsContract.update();");
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


test("video export restores the original live viewport through bounded cleanup", () => {
  const componentSource = readFileSync("src/components/AurumRender.tsx", "utf8");
  const videoStart = componentSource.indexOf("exportVideo:async");
  const restoreStart = componentSource.indexOf("const restoreFailures = runAurumMediaExportCleanup([", videoStart);
  const restoreEnd = componentSource.indexOf("if(restoreFailures.length)", restoreStart);
  const restoreBlock = componentSource.slice(restoreStart, restoreEnd);

  expect(videoStart).toBeGreaterThan(-1);
  expect(restoreStart).toBeGreaterThan(videoStart);
  expect(restoreBlock).toContain("videoFramePipeline?.restore()");
  expect(restoreBlock).toContain("cameraControlsContract.restoreState(originalCameraState)");
  expect(restoreBlock).toContain("resetTemporalAccumulationRef.current?.()");
  expect(restoreBlock).toContain("loop?.resize?.()");
  expect(restoreBlock).toContain("loop?.invalidate?.()");
  expect(restoreBlock).toContain("loop?.resume?.()");
  expect(restoreBlock).toContain("loop?.converge?.(4)");
  expect(restoreBlock.indexOf("videoFramePipeline?.restore()")).toBeLessThan(restoreBlock.indexOf("camara.position.copy(originalCameraPosition)"));
  expect(restoreBlock.indexOf("cameraControlsContract.restoreState(originalCameraState)")).toBeGreaterThan(-1);
  expect(restoreBlock.indexOf("loop?.resize?.()")).toBeLessThan(restoreBlock.indexOf("loop?.resume?.()"));
  expect(restoreBlock.indexOf("loop?.resume?.()")).toBeLessThan(restoreBlock.indexOf("loop?.converge?.(4)"));
});
