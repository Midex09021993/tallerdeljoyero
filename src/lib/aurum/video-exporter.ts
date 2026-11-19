import { Recorder } from "canvas-record";

export type AurumVideoOptions = {
  fps?: number | undefined;
  duration?: number | undefined;
  signal?: AbortSignal | undefined;
  onProgress?: ((elapsedSeconds: number, durationSeconds: number) => void) | undefined;
  /** Called before each frame is encoded; the existing AURUM viewer remains the renderer. */
  onFrame?: (elapsedSeconds: number, durationSeconds: number) => void;
  /** DOM element whose CSS backdrop sits behind AURUM's transparent WebGL canvas. */
  backgroundElement?: HTMLElement | null;
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

function escapeXmlAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/\"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Inline CSS background images before drawing the SVG snapshot. A remote URL
 * left inside SVG foreignObject taints the rasterized canvas and makes
 * VideoFrame construction fail. Fetch in CORS mode so the browser enforces
 * the source's permission instead of silently creating a tainted frame.
 */
async function inlineAurumCssBackgroundImages(backgroundImage: string): Promise<string> {
  const matches = Array.from(backgroundImage.matchAll(/url\\((?:\\s*["']([^"']+)["']\\s*|\\s*([^\\s)]+)\\s*)\\)/gi));
  let result = backgroundImage;
  for (const match of matches) {
    const source = (match[1] ?? match[2] ?? "").trim();
    if (!source || /^(?:data:|blob:)/i.test(source)) continue;
    let response: Response;
    try {
      response = await fetch(new URL(source, document.baseURI).href, {
        mode: "cors",
        credentials: "omit",
        cache: "force-cache",
      });
    } catch (error) {
      throw new Error("No se pudo obtener el fondo fotográfico con permisos CORS. Usa una imagen del mismo dominio o habilita Access-Control-Allow-Origin en su servidor.", { cause: error });
    }
    if (!response.ok || response.type === "opaque") {
      throw new Error("El fondo fotográfico no permite captura segura (CORS). El servidor debe permitir el origen de AURUM LAB.");
    }
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("No se pudo codificar el fondo fotográfico."));
      reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el fondo fotográfico."));
      reader.readAsDataURL(blob);
    });
    result = result.replace(match[0], 'url("' + dataUrl + '")');
  }
  return result;
}

/** Build a rasterizable SVG snapshot of the viewer's CSS background, including gradients and images. */
export function createAurumCssBackgroundSvg(element: HTMLElement, width: number, height: number): string {
  const style = window.getComputedStyle(element);
  let backgroundColor = style.backgroundColor;
  let backgroundImage = style.backgroundImage;
  let backgroundSize = style.backgroundSize;
  let backgroundPosition = style.backgroundPosition;
  let backgroundRepeat = style.backgroundRepeat;
  if ((!backgroundColor || backgroundColor === "rgba(0, 0, 0, 0)") && element.parentElement) {
    const parentStyle = window.getComputedStyle(element.parentElement);
    backgroundColor = parentStyle.backgroundColor || "#090b0e";
    if (backgroundImage === "none") {
      backgroundImage = parentStyle.backgroundImage;
      backgroundSize = parentStyle.backgroundSize;
      backgroundPosition = parentStyle.backgroundPosition;
      backgroundRepeat = parentStyle.backgroundRepeat;
    }
  }
  const css = [
    "width:" + width + "px", "height:" + height + "px",
    "background-color:" + (backgroundColor || "#090b0e"),
    "background-image:" + (backgroundImage || "none"),
    "background-size:" + (backgroundSize || "auto"),
    "background-position:" + (backgroundPosition || "center"),
    "background-repeat:" + (backgroundRepeat || "no-repeat"),
  ].join(";");
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="' + escapeXmlAttribute(css) + '"></div></foreignObject></svg>';
}

async function loadAurumBackgroundSnapshot(element: HTMLElement | null | undefined, width: number, height: number): Promise<HTMLImageElement | null> {
  if (!element) return null;
  const svg = createAurumCssBackgroundSvg(element, width, height);
  let backgroundImage = window.getComputedStyle(element).backgroundImage;
  if ((!backgroundImage || backgroundImage === "none") && element.parentElement) {
    backgroundImage = window.getComputedStyle(element.parentElement).backgroundImage;
  }
  const safeBackgroundImage = await inlineAurumCssBackgroundImages(backgroundImage || "none");
  const safeSvg = backgroundImage === safeBackgroundImage
    ? svg
    : svg.replace(escapeXmlAttribute(backgroundImage), escapeXmlAttribute(safeBackgroundImage));
  const blobUrl = URL.createObjectURL(new Blob([safeSvg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = blobUrl;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(blobUrl);
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

  // Composite the CSS backdrop and transparent WebGL canvas into one 2D surface.
  const webglContext = (source.getContext("webgl2") ?? source.getContext("webgl")) as
    | WebGLRenderingContext
    | WebGL2RenderingContext
    | null;
  if (!webglContext) {
    throw new Error("No se pudo recuperar el contexto WebGL original de AURUM para codificar el vídeo.");
  }
  const compositeCanvas = document.createElement("canvas");
  compositeCanvas.width = source.width;
  compositeCanvas.height = source.height;
  const compositeContext = compositeCanvas.getContext("2d", { alpha: false });
  if (!compositeContext) throw new Error("No se pudo crear la superficie de composición del fondo para el vídeo.");
  const backgroundSnapshot = await loadAurumBackgroundSnapshot(options.backgroundElement, source.width, source.height);
  const recordingContext = compositeContext;

  const fps = Math.max(15, Math.min(120, Math.round(options.fps ?? 30)));
  const duration = Math.max(1, Math.min(20, Number(options.duration ?? 5)));
  const framePlan = createAurumVideoFramePlan(duration, fps);
  const recorder = new Recorder(recordingContext, {
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
      // Background first, then the transparent live WebGL canvas.
      if (backgroundSnapshot) recordingContext.drawImage(backgroundSnapshot, 0, 0, compositeCanvas.width, compositeCanvas.height);
      else recordingContext.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);
      recordingContext.drawImage(source, 0, 0, compositeCanvas.width, compositeCanvas.height);
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
