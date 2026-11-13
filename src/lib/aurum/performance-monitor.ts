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
  sampleCount: number;
  hasRecentFrame: boolean;
};

const WINDOW_MS = 3000;
const MAX_FRAMES = 180;

export function createAurumPerformanceMonitor() {
  const frames: AurumPerformanceFrame[] = [];
  let maxFrameMs = 0;
  let latestFrame: AurumPerformanceFrame | null = null;

  const recordFrame = (frame: AurumPerformanceFrame) => {
    if (![frame.frameMs, frame.renderMs, frame.bvhMs].every(Number.isFinite)) return;
    frames.push(frame);
    latestFrame = frame;
    maxFrameMs = Math.max(maxFrameMs, frame.frameMs);
    while (frames.length > MAX_FRAMES || (frames[0] && frame.timestamp - frames[0].timestamp > WINDOW_MS)) {
      frames.shift();
    }
    maxFrameMs = frames.reduce((peak, item) => Math.max(peak, item.frameMs), 0);
  };

  const snapshot = (renderer: any): AurumPerformanceSnapshot => {
    const now = performance.now();
    while (frames[0] && now - frames[0].timestamp > WINDOW_MS) frames.shift();
    const latest = latestFrame;
    const count = frames.length;
    const average = (key: "frameMs" | "renderMs" | "bvhMs") =>
      count ? frames.reduce((sum, item) => sum + item[key], 0) / count : 0;
    const elapsed = count > 1 ? Math.max(1, frames[count - 1].timestamp - frames[0].timestamp) : 0;
    const hasRecentFrame = Boolean(latest && now - latest.timestamp <= WINDOW_MS);
    const gl = renderer?.getContext?.();
    let webgl: AurumPerformanceSnapshot["webgl"] = "No disponible";
    try {
      if (gl) webgl = gl instanceof WebGL2RenderingContext ? "WebGL 2" : "WebGL 1";
    } catch {
      webgl = "No disponible";
    }
    const canvas = renderer?.domElement;
    return {
      fps: hasRecentFrame && elapsed > 0 ? ((count - 1) * 1000) / elapsed : 0,
      frameMs: count ? average("frameMs") : latest?.frameMs ?? 0,
      renderMs: count ? average("renderMs") : latest?.renderMs ?? 0,
      bvhMs: count ? average("bvhMs") : latest?.bvhMs ?? 0,
      maxFrameMs,
      path: latest?.path ?? "—",
      calls: Number(renderer?.info?.render?.calls ?? 0),
      triangles: Number(renderer?.info?.render?.triangles ?? 0),
      geometries: Number(renderer?.info?.memory?.geometries ?? 0),
      textures: Number(renderer?.info?.memory?.textures ?? 0),
      drawBuffer: canvas ? `${canvas.width} × ${canvas.height}` : "—",
      pixelRatio: Number(renderer?.getPixelRatio?.() ?? 1),
      webgl,
      sampleCount: hasRecentFrame ? count : 0,
      hasRecentFrame,
    };
  };

  const reset = () => {
    frames.length = 0;
    latestFrame = null;
    maxFrameMs = 0;
  };

  return { recordFrame, snapshot, reset };
}

export type AurumPerformanceMonitor = ReturnType<typeof createAurumPerformanceMonitor>;

export type AurumPerformanceStatus = "idle" | "healthy" | "warning" | "critical";

/**
 * Classifies recent measured renderer load, not estimated GPU utilization.
 * The rolling sample window is shared with the performance monitor (3 seconds).
 */
export function getAurumPerformanceStatus(snapshot: AurumPerformanceSnapshot): AurumPerformanceStatus {
  if (!snapshot.hasRecentFrame || snapshot.sampleCount < 2) return "idle";
  if (snapshot.fps < 30 || snapshot.frameMs >= 50 || snapshot.maxFrameMs >= 250) return "critical";
  if (snapshot.fps < 50 || snapshot.frameMs >= 25 || snapshot.maxFrameMs >= 100) return "warning";
  return "healthy";
}
