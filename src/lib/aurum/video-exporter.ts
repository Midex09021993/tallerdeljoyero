export type AurumVideoOptions = {
  /** Output dimensions are intentionally ignored: capture keeps the source canvas bitmap. */
  width?: number | undefined;
  height?: number | undefined;
  fps?: number | undefined;
  duration?: number | undefined;
  signal?: AbortSignal | undefined;
  onProgress?: ((elapsedSeconds: number, durationSeconds: number) => void) | undefined;
  /** Called before each requested capture frame; the live viewer remains the renderer. */
  onFrame?: (elapsedSeconds: number, durationSeconds: number) => void;
};

export interface AurumVideoFramePlan {
  readonly index: number;
  readonly timestampSeconds: number;
}

/** Fixed-step callback plan; independent of requestAnimationFrame cadence. */
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

function waitUntil(deadline: number): Promise<void> {
  const remaining = deadline - performance.now();
  return remaining > 0 ? new Promise((resolve) => window.setTimeout(resolve, remaining)) : Promise.resolve();
}

/**
 * Records the original WebGL canvas directly. No intermediary 2D canvas,
 * drawImage, resampling, letterboxing, or output-size conversion is performed.
 * The encoded bitmap therefore has exactly source.width × source.height pixels.
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
  if (source.width < 2 || source.height < 2) {
    throw new Error("El canvas WebGL no tiene una resolución válida.");
  }
  const mimeType = VIDEO_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) {
    throw new Error("Este navegador no ofrece un formato de vídeo compatible. Actualiza el navegador o prueba con Chrome o Edge.");
  }

  const fps = Math.max(15, Math.min(120, Math.round(options.fps ?? 30)));
  const duration = Math.max(1, Math.min(20, Number(options.duration ?? 5)));
  const framePlan = createAurumVideoFramePlan(duration, fps);
  const effectiveDuration = framePlan.length / fps;

  // Prefer explicit frame requests on the original canvas. Fallback captureStream
  // still records that same canvas directly at the browser's requested cadence.
  let stream = source.captureStream(0);
  let videoTrack = stream.getVideoTracks()[0] as (MediaStreamTrack & { requestFrame?: () => void }) | undefined;
  const manualFrameCapture = typeof videoTrack?.requestFrame === "function";
  if (!manualFrameCapture) {
    stream.getTracks().forEach((track) => track.stop());
    stream = source.captureStream(fps);
    videoTrack = stream.getVideoTracks()[0] as (MediaStreamTrack & { requestFrame?: () => void }) | undefined;
  }

  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: Math.max(8_000_000, Math.min(100_000_000, source.width * source.height * fps * 0.18)),
    });
  } catch {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("El navegador detecta MP4, pero no pudo iniciar el codificador.");
  }

  const chunks: BlobPart[] = [];
  let raf = 0;
  let settled = false;
  let abortHandler: (() => void) | undefined;

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      if (raf) cancelAnimationFrame(raf);
      if (abortHandler) options.signal?.removeEventListener("abort", abortHandler);
      stream.getTracks().forEach((track) => track.stop());
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
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType });
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
      const startedAt = performance.now();
      if (manualFrameCapture && videoTrack?.requestFrame) {
        void (async () => {
          for (const frame of framePlan) {
            if (settled || options.signal?.aborted) return;
            const elapsed = frame.timestampSeconds;
            options.onFrame?.(elapsed, effectiveDuration);
            videoTrack?.requestFrame?.();
            options.onProgress?.(elapsed, effectiveDuration);
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

      // Browser fallback: update animation on RAF; the browser captures the
      // original WebGL canvas stream directly. No pixel-copy operation occurs.
      const drawRealtimeFrame = (now: number) => {
        if (settled) return;
        if (options.signal?.aborted) {
          stopWithError(new DOMException("Exportación cancelada.", "AbortError"));
          return;
        }
        const elapsed = Math.max(0, (now - startedAt) / 1000);
        options.onFrame?.(Math.min(elapsed, duration), duration);
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
