export type AurumVideoOptions = {
  width?: number | undefined;
  height?: number | undefined;
  fps?: number | undefined;
  duration?: number | undefined;
  signal?: AbortSignal | undefined;
  onProgress?: ((elapsedSeconds: number, durationSeconds: number) => void) | undefined;
  /** Called at fixed simulation timestamps before each captured frame. */
  onFrame?: (elapsedSeconds: number, durationSeconds: number) => void;
};

export interface AurumVideoFramePlan {
  readonly index: number;
  readonly timestampSeconds: number;
}

/** Fixed-step frame plan; independent of requestAnimationFrame cadence. */
export function createAurumVideoFramePlan(durationSeconds: number, fps: number): readonly AurumVideoFramePlan[] {
  const safeDuration = Math.max(1, Math.min(20, Number(durationSeconds) || 5));
  const safeFps = Math.max(15, Math.min(120, Math.round(Number(fps) || 30)));
  const frameCount = Math.max(1, Math.round(safeDuration * safeFps));
  return Object.freeze(Array.from({ length: frameCount }, (_, index) => Object.freeze({
    index,
    timestampSeconds: index / safeFps,
  })));
}

const VIDEO_MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

function drawAurumVideoFrame(
  context: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  width: number,
  height: number,
) {
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  // Preserve the source canvas aspect ratio; never stretch the jewelry.
  const scale = Math.min(width / source.width, height / source.height);
  const drawWidth = Math.max(1, Math.round(source.width * scale));
  const drawHeight = Math.max(1, Math.round(source.height * scale));
  const drawX = Math.round((width - drawWidth) / 2);
  const drawY = Math.round((height - drawHeight) / 2);
  context.drawImage(source, drawX, drawY, drawWidth, drawHeight);
}

function waitUntil(deadline: number): Promise<void> {
  const remaining = deadline - performance.now();
  return remaining > 0 ? new Promise((resolve) => window.setTimeout(resolve, remaining)) : Promise.resolve();
}

/**
 * Captures a fixed-step sequence from the existing WebGL viewer.
 *
 * When CanvasCaptureMediaStreamTrack.requestFrame is available, frames are
 * submitted explicitly from a deterministic frame plan (no RAF-driven sampling
 * or dropped simulation steps). MediaRecorder still performs real-time muxing;
 * this is deterministic frame scheduling, not an offline/timestamp-controlled
 * encoder. Browsers without requestFrame retain the realtime RAF fallback.
 */
export async function recordAurumCanvasVideo(
  source: HTMLCanvasElement,
  options: AurumVideoOptions = {},
): Promise<void> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Este navegador no dispone de MediaRecorder para exportar vídeo.");
  }
  if (typeof source.captureStream !== "function") {
    throw new Error("Este navegador no permite capturar el canvas WebGL.");
  }
  const mimeType = VIDEO_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) {
    throw new Error("Este navegador no ofrece un formato de vídeo compatible. Actualiza el navegador o prueba con Chrome o Edge.");
  }

  const width = Math.max(320, Math.min(3840, Math.round(options.width ?? 1280)));
  const height = Math.max(320, Math.min(3840, Math.round(options.height ?? 720)));
  const fps = Math.max(15, Math.min(120, Math.round(options.fps ?? 30)));
  const duration = Math.max(1, Math.min(20, Number(options.duration ?? 5)));
  const framePlan = createAurumVideoFramePlan(duration, fps);
  const effectiveDuration = framePlan.length / fps;
  const output = document.createElement("canvas");
  output.width = width;
  output.height = height;
  const context = output.getContext("2d", { alpha: false });
  if (!context) throw new Error("No se pudo preparar el canvas de vídeo.");

  const stream = output.captureStream(0);
  const videoTrack = stream.getVideoTracks()[0] as (MediaStreamTrack & { requestFrame?: () => void }) | undefined;
  const manualFrameCapture = typeof videoTrack?.requestFrame === "function";
  if (!manualFrameCapture) {
    stream.getTracks().forEach((track) => track.stop());
  }
  const activeStream = manualFrameCapture ? stream : output.captureStream(fps);
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(activeStream, {
      mimeType,
      videoBitsPerSecond: Math.max(8_000_000, Math.min(100_000_000, width * height * fps * 0.18)),
    });
  } catch {
    activeStream.getTracks().forEach((track) => track.stop());
    throw new Error("El navegador detecta MP4, pero no pudo iniciar el codificador.");
  }

  const chunks: BlobPart[] = [];
  let raf = 0;
  let settled = false;
  let abortHandler: (() => void) | undefined;
  let resolveExport: (() => void) | undefined;
  let rejectExport: ((error: Error) => void) | undefined;

  await new Promise<void>((resolve, reject) => {
    resolveExport = resolve;
    rejectExport = reject;
    const cleanup = () => {
      if (raf) cancelAnimationFrame(raf);
      if (abortHandler) options.signal?.removeEventListener("abort", abortHandler);
      activeStream.getTracks().forEach((track) => track.stop());
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      const blob = new Blob(chunks, { type: recorder.mimeType || "video/mp4" });
      if (blob.size < 1024) {
        reject(new Error("La grabación terminó sin datos de vídeo suficientes."));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const extension = (recorder.mimeType || mimeType).toLowerCase().includes("mp4") ? "mp4" : "webm";
      link.download = "aurum-render-video-" + new Date().toISOString().replace(/[:.]/g, "-") + "." + extension;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      resolve();
    };
    const stopWithError = (error: Error) => {
      if (recorder.state !== "inactive") {
        try { recorder.stop(); } catch { /* Keep the original error. */ }
      }
      fail(error);
    };

    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onerror = () => fail(new Error("Falló la codificación del vídeo."));
    recorder.onstop = finish;
    abortHandler = () => stopWithError(new DOMException("Exportación cancelada.", "AbortError"));
    options.signal?.addEventListener("abort", abortHandler, { once: true });
    if (options.signal?.aborted) {
      fail(new DOMException("Exportación cancelada.", "AbortError"));
      return;
    }

    try {
      recorder.start(250);
      if (manualFrameCapture && videoTrack?.requestFrame) {
        void (async () => {
          const startedAt = performance.now();
          for (const frame of framePlan) {
            if (settled || options.signal?.aborted) return;
            const elapsed = frame.timestampSeconds;
            options.onFrame?.(elapsed, effectiveDuration);
            drawAurumVideoFrame(context, source, width, height);
            videoTrack.requestFrame?.();
            options.onProgress?.(Math.min(elapsed, effectiveDuration), effectiveDuration);
            // Pace frame submission at the requested cadence without deriving
            // animation state from elapsed wall-clock time.
            await waitUntil(startedAt + ((frame.index + 1) * 1000) / fps);
          }
          if (!settled) {
            options.onProgress?.(effectiveDuration, effectiveDuration);
            await waitUntil(startedAt + effectiveDuration * 1000 + 100);
            if (!settled && recorder.state !== "inactive") recorder.stop();
          }
        })().catch((error) => stopWithError(error instanceof Error ? error : new Error(String(error))));
        return;
      }

      // Compatibility fallback for browsers lacking manual canvas frame requests.
      const startedAt = performance.now();
      const drawRealtimeFrame = (now: number) => {
        if (settled) return;
        if (options.signal?.aborted) {
          stopWithError(new DOMException("Exportación cancelada.", "AbortError"));
          return;
        }
        const elapsed = Math.max(0, (now - startedAt) / 1000);
        options.onFrame?.(Math.min(elapsed, duration), duration);
        drawAurumVideoFrame(context, source, width, height);
        options.onProgress?.(Math.min(elapsed, duration), duration);
        if (elapsed >= duration) {
          if (recorder.state !== "inactive") recorder.stop();
          return;
        }
        raf = requestAnimationFrame(drawRealtimeFrame);
      };
      raf = requestAnimationFrame(drawRealtimeFrame);
    } catch {
      fail(new Error("No se pudo iniciar la grabación de vídeo."));
    }
  });
}
