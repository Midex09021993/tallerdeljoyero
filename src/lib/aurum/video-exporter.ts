import { Recorder } from "canvas-record";

export type AurumVideoOptions = {
  fps?: number | undefined;
  duration?: number | undefined;
  signal?: AbortSignal | undefined;
  onProgress?: ((elapsedSeconds: number, durationSeconds: number) => void) | undefined;
  /** Called before each frame is encoded; the existing AURUM viewer remains the renderer. */
  onFrame?: (elapsedSeconds: number, durationSeconds: number) => void;
};

export interface AurumVideoFramePlan {
  readonly index: number;
  readonly timestampSeconds: number;
}

const MAX_WEB_CODECS_MP4_PIXELS = 9_437_184;

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

/**
 * canvas-record 5.5.1 passes bitrateMode into estimateBitRate's numeric
 * motionRank slot, producing NaN. Supply a validated explicit bitrate; the
 * library spreads encoderOptions after its faulty estimate, so this wins.
 */
export function calculateAurumVideoBitrate(width: number, height: number, fps: number): number {
  const safeWidth = Math.floor(width);
  const safeHeight = Math.floor(height);
  const safeFps = Math.round(fps);
  if (![safeWidth, safeHeight, safeFps].every(Number.isFinite) || safeWidth < 2 || safeHeight < 2 || safeFps < 1) {
    throw new Error("No se pudo calcular una tasa de bits válida para el vídeo AURUM.");
  }
  const estimated = safeWidth * safeHeight * safeFps * 4 * 0.07 * 0.75;
  const bitrate = estimated >= 1_000_000
    ? Math.round(estimated / 1_000_000) * 1_000_000
    : Math.round(estimated / 1_000) * 1_000;
  if (!Number.isSafeInteger(bitrate) || bitrate <= 0) {
    throw new Error("La tasa de bits calculada para el vídeo AURUM está fuera de rango.");
  }
  return bitrate;
}

/** H.264/WebCodecs MP4 frame limit documented by canvas-record. */
export function assertAurumVideoFrameBudget(width: number, height: number): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 2 || height < 2) {
    throw new Error("El canvas de AURUM no tiene dimensiones válidas para exportar vídeo.");
  }
  const pixels = Math.floor(width) * Math.floor(height);
  if (pixels > MAX_WEB_CODECS_MP4_PIXELS) {
    throw new Error(
      `La resolución solicitada (${width} × ${height}) supera el límite de ${MAX_WEB_CODECS_MP4_PIXELS.toLocaleString("en-US")} píxeles por fotograma del codificador MP4 H.264. Usa 4K horizontal/vertical o reduce la resolución.`,
    );
  }
}

function downloadAurumVideo(output: ArrayBuffer | Uint8Array | Blob[] | undefined): void {
  if (!output) throw new Error("El codificador terminó sin devolver un archivo de vídeo.");
  const parts: BlobPart[] = Array.isArray(output)
    ? output
    : output instanceof Uint8Array
      ? [output.slice().buffer as ArrayBuffer]
      : [output as ArrayBuffer];
  const blob = new Blob(parts, { type: "video/mp4" });
  if (blob.size < 1024) {
    throw new Error("El codificador devolvió un MP4 vacío o incompleto.");
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "aurum-render-video-" + new Date().toISOString().replace(/[:.]/g, "-") + ".mp4";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Encodes the existing WebGL drawing buffer frame-by-frame with canvas-record.
 * AURUM remains responsible for rendering; canvas-record handles MP4 encoding
 * and muxing via WebCodecs, with its bundled H.264/WASM fallback.
 */
export async function recordAurumCanvasVideo(
  source: HTMLCanvasElement,
  options: AurumVideoOptions = {},
): Promise<void> {
  const browserVideoApis = globalThis as typeof globalThis & {
    VideoFrame?: unknown;
    VideoEncoder?: unknown;
  };
  if (typeof browserVideoApis.VideoFrame === "undefined" && typeof browserVideoApis.VideoEncoder === "undefined") {
    // canvas-record can fall back to its bundled H.264/WASM encoder; this is
    // only a diagnostic, not a hard failure.
    console.info("[AURUM][VIDEO] WebCodecs unavailable; canvas-record will use its H.264/WASM fallback when supported.");
  }
  if (typeof source.getContext !== "function" || source.width < 2 || source.height < 2) {
    throw new Error("El canvas WebGL de AURUM no tiene una resolución válida.");
  }
  assertAurumVideoFrameBudget(source.width, source.height);

  const context = (source.getContext("webgl2") ?? source.getContext("webgl")) as
    | WebGLRenderingContext
    | WebGL2RenderingContext
    | null;
  if (!context) {
    throw new Error("No se pudo recuperar el contexto WebGL original de AURUM para codificar el vídeo.");
  }

  const fps = Math.max(15, Math.min(120, Math.round(options.fps ?? 30)));
  const duration = Math.max(1, Math.min(20, Number(options.duration ?? 5)));
  const framePlan = createAurumVideoFramePlan(duration, fps);
  const recorder = new Recorder(context, {
    name: "aurum-render",
    duration: framePlan.length / fps,
    frameRate: fps,
    extension: "mp4",
    target: "in-browser",
    download: false,
    encoderOptions: {
      latencyMode: "quality",
      bitrateMode: "variable",
      // Explicit unsigned-long-long integer avoids canvas-record 5.5.1's
      // estimateBitRate argument-order bug (NaN passed to VideoEncoder).
      bitrate: calculateAurumVideoBitrate(source.width, source.height, fps),
    },
  }) as unknown as {
    start(options?: { initOnly?: boolean }): Promise<void>;
    step(): Promise<void>;
    stop(): Promise<ArrayBuffer | Uint8Array | Blob[] | undefined>;
    dispose(): Promise<void>;
  };

  let started = false;
  let stopped = false;
  try {
    if (options.signal?.aborted) throw new DOMException("Exportación cancelada.", "AbortError");
    await recorder.start({ initOnly: true });
    started = true;

    for (const frame of framePlan) {
      if (options.signal?.aborted) throw new DOMException("Exportación cancelada.", "AbortError");
      options.onFrame?.(frame.timestampSeconds, framePlan.length / fps);
      // onFrame renders synchronously through AURUM's real live render path.
      // Recorder.step() immediately snapshots that canvas into a VideoFrame.
      await recorder.step();
      options.onProgress?.((frame.index + 1) / fps, framePlan.length / fps);
      // Yield to the UI between expensive encode operations so progress/cancel
      // controls remain responsive during high-resolution exports.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }

    const output = await recorder.stop();
    stopped = true;
    downloadAurumVideo(output);
    options.onProgress?.(framePlan.length / fps, framePlan.length / fps);
  } catch (error) {
    if (started && !stopped) {
      try {
        await recorder.stop();
      } catch (stopError) {
        console.error("[AURUM][VIDEO] Failed to finalize partial MP4 after export error.", stopError);
      }
    }
    if (error instanceof Error) throw error;
    throw new Error("La exportación MP4 falló por un error desconocido.");
  } finally {
    try {
      await recorder.dispose();
    } catch (disposeError) {
      console.warn("[AURUM][VIDEO] Recorder cleanup reported an error.", disposeError);
    }
  }
}
