export type AurumPerformanceFrame = {
  frameMs: number;
  renderMs: number;
  bvhMs: number;
  path: "direct" | "composer";
  timestamp: number;
};

export type AurumPerformanceSnapshot = {
  fps: number;
  frameMs: number;
  renderMs: number;
  bvhMs: number;
  maxFrameMs: number;
  path: "direct" | "composer" | "—";
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  drawBuffer: string;
  pixelRatio: number;
  webgl: "WebGL 2" | "WebGL 1" | "No disponible";
};

const WINDOW_MS = 3000;
const MAX_FRAMES = 180;

export function createAurumPerformanceMonitor() {
  const frames: AurumPerformanceFrame[] = [];
  let maxFrameMs = 0;

  const recordFrame = (frame: AurumPerformanceFrame) => {
    if (![frame.frameMs, frame.renderMs, frame.bvhMs].every(Number.isFinite)) return;
    frames.push(frame);
    maxFrameMs = Math.max(maxFrameMs, frame.frameMs);
    while (frames.length > MAX_FRAMES || (frames[0] && frame.timestamp - frames[0].timestamp > WINDOW_MS)) {
      frames.shift();
    }
    if (frames.length < 2) maxFrameMs = frame.frameMs;
  };

  const snapshot = (renderer: any): AurumPerformanceSnapshot => {
    const latest = frames[frames.length - 1];
    const count = frames.length;
    const average = (key: "frameMs" | "renderMs" | "bvhMs") =>
      count ? frames.reduce((sum, item) => sum + item[key], 0) / count : 0;
    const elapsed = count > 1 ? Math.max(1, frames[count - 1].timestamp - frames[0].timestamp) : 0;
    const gl = renderer?.getContext?.();
    let webgl: AurumPerformanceSnapshot["webgl"] = "No disponible";
    try {
      if (gl) webgl = gl instanceof WebGL2RenderingContext ? "WebGL 2" : "WebGL 1";
    } catch {
      webgl = "No disponible";
    }
    const canvas = renderer?.domElement;
    return {
      fps: elapsed > 0 ? ((count - 1) * 1000) / elapsed : 0,
      frameMs: average("frameMs"),
      renderMs: average("renderMs"),
      bvhMs: average("bvhMs"),
      maxFrameMs,
      path: latest?.path ?? "—",
      calls: Number(renderer?.info?.render?.calls ?? 0),
      triangles: Number(renderer?.info?.render?.triangles ?? 0),
      geometries: Number(renderer?.info?.memory?.geometries ?? 0),
      textures: Number(renderer?.info?.memory?.textures ?? 0),
      drawBuffer: canvas ? `${canvas.width} × ${canvas.height}` : "—",
      pixelRatio: Number(renderer?.getPixelRatio?.() ?? 1),
      webgl,
    };
  };

  const reset = () => {
    frames.length = 0;
    maxFrameMs = 0;
  };

  return { recordFrame, snapshot, reset };
}

export type AurumPerformanceMonitor = ReturnType<typeof createAurumPerformanceMonitor>;
