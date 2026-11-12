import { expect, test } from "bun:test";
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
