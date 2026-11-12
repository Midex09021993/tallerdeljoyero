import { expect, test } from "bun:test";
import { createAurumWebGLViewer, startAurumViewerLoop } from "../src/lib/aurum/viewer";

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
