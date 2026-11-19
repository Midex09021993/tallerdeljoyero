import { Recorder } from "canvas-record";

export type AurumVideoOptions = {
  fps?: number | undefined;
  duration?: number | undefined;
  signal?: AbortSignal | undefined;
  onProgress?: ((elapsedSeconds: number, durationSeconds: number) => void) | undefined;
  /** Called before each frame is encoded; the existing AURUM viewer remains the renderer. */
  onFrame?: (elapsedSeconds: number, durationSeconds: number) => void | Promise<void>;
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

type AurumBackgroundLayer = { kind: "gradient"; value: string } | { kind: "image"; value: string };

function splitCssArguments(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "(") depth++;
    else if (value[i] === ")") depth--;
    else if (value[i] === "," && depth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

export function parseAurumBackgroundLayers(backgroundImage: string): AurumBackgroundLayer[] {
  if (!backgroundImage || backgroundImage === "none") return [];
  const layers: AurumBackgroundLayer[] = [];
  const parts = splitCssArguments(backgroundImage);
  for (const part of parts) {
    if (/^(?:linear|radial)-gradient\(/i.test(part)) {
      layers.push({ kind: "gradient", value: part });
      continue;
    }
    const urlMatch = part.match(/^url\((?:\s*["']([^"']+)["']\s*|\s*([^\s)]+)\s*)\)$/i);
    if (urlMatch) layers.push({ kind: "image", value: (urlMatch[1] ?? urlMatch[2] ?? "").trim() });
  }
  return layers;
}

function parseAurumGradientStop(stop: string): { color: string; position: number | null } | null {
  const match = stop.match(/^(.*?)(?:\s+(-?\d+(?:\.\d+)?)(%))?$/);
  if (!match?.[1]?.trim()) return null;
  return { color: match[1].trim(), position: match[2] === undefined ? null : Number(match[2]) / 100 };
}

function paintAurumCssGradient(context: CanvasRenderingContext2D, css: string, width: number, height: number): boolean {
  const match = css.match(/^(linear|radial)-gradient\((.*)\)$/i);
  if (!match) return false;
  const args = splitCssArguments(match[2] ?? "");
  if (args.length < 2) return false;
  const isRadial = (match[1] ?? "").toLowerCase() === "radial";
  let descriptor: string = args[0] ?? "";
  let stopsInput = args;
  if (/^(?:to\s|[-+]?\d)/i.test(descriptor) || /^(?:circle|ellipse|closest|farthest)/i.test(descriptor)) stopsInput = args.slice(1);
  else descriptor = "180deg";
  const stops = stopsInput.map(parseAurumGradientStop).filter((x): x is {color:string;position:number|null} => Boolean(x));
  if (stops.length < 2) return false;
  const angleMatch = descriptor.match(/(-?\d+(?:\.\d+)?)deg/i);
  const angle = angleMatch ? Number(angleMatch[1]) * Math.PI / 180 : Math.PI;
  const dx = Math.sin(angle), dy = -Math.cos(angle);
  const extent = Math.abs(width * dx) / 2 + Math.abs(height * dy) / 2;
  const gradient = isRadial
    ? context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.hypot(width, height) / 2)
    : context.createLinearGradient(width / 2 - dx * extent, height / 2 - dy * extent, width / 2 + dx * extent, height / 2 + dy * extent);
  stops.forEach((stop, index) => {
    const position = stop.position ?? index / Math.max(1, stops.length - 1);
    gradient.addColorStop(Math.max(0, Math.min(1, position)), stop.color);
  });
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  return true;
}

async function fetchAurumBackgroundImage(source: string): Promise<ImageBitmap> {
  let response: Response;
  try {
    response = await fetch(new URL(source, document.baseURI).href, { mode: "cors", credentials: "omit", cache: "force-cache" });
  } catch (error) {
    throw new Error("No se pudo cargar el fondo con permisos CORS. El recurso debe ser local o permitir el origen de AURUM LAB.", { cause: error });
  }
  if (!response.ok || response.type === "opaque") {
    throw new Error("El fondo no permite captura segura. Aloja la imagen en AURUM o habilita CORS en su servidor.");
  }
  return createImageBitmap(await response.blob());
}

function drawAurumBackgroundImage(context: CanvasRenderingContext2D, image: CanvasImageSource, width: number, height: number, size: string): void {
  if (size === "100% 100%") {
    context.drawImage(image, 0, 0, width, height);
    return;
  }
  const source = image as CanvasImageSource & { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number };
  const imageWidth = source.naturalWidth ?? source.width ?? width;
  const imageHeight = source.naturalHeight ?? source.height ?? height;
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

/** Rasterize AURUM's CSS background directly into a clean 2D canvas; no SVG foreignObject. */
async function loadAurumBackgroundSnapshot(element: HTMLElement | null | undefined, width: number, height: number): Promise<HTMLCanvasElement | null> {
  if (!element) return null;
  const style = window.getComputedStyle(element);
  let backgroundColor = style.backgroundColor;
  let backgroundImage = style.backgroundImage;
  let backgroundSize = style.backgroundSize;
  if ((!backgroundColor || backgroundColor === "rgba(0, 0, 0, 0)") && element.parentElement) {
    const parentStyle = window.getComputedStyle(element.parentElement);
    backgroundColor = parentStyle.backgroundColor || "#090b0e";
    if (!backgroundImage || backgroundImage === "none") {
      backgroundImage = parentStyle.backgroundImage;
      backgroundSize = parentStyle.backgroundSize;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("No se pudo crear el fondo 2D para el vídeo.");
  context.fillStyle = backgroundColor && backgroundColor !== "rgba(0, 0, 0, 0)" ? backgroundColor : "#090b0e";
  context.fillRect(0, 0, width, height);
  const layers = parseAurumBackgroundLayers(backgroundImage || "none");
  // CSS paints the first background layer on top; paint in reverse order.
  for (const layer of [...layers].reverse()) {
    if (layer.kind === "gradient") {
      if (!paintAurumCssGradient(context, layer.value, width, height)) {
        throw new Error("El degradado del fondo usa una sintaxis no compatible con la captura MP4.");
      }
    } else {
      const bitmap = await fetchAurumBackgroundImage(layer.value);
      try { drawAurumBackgroundImage(context, bitmap, width, height, backgroundSize || "cover"); }
      finally { bitmap.close(); }
    }
  }
  try { context.getImageData(0, 0, 1, 1); }
  catch (error) { throw new Error("El fondo 2D no está autorizado para captura. Revisa CORS del recurso.", { cause: error }); }
  return canvas;
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
  // Test the exact composite (backdrop + live WebGL canvas) before passing its
  // canvas to VideoFrame. Checking only the WebGL source misses taint introduced
  // by a CSS background snapshot.
  try {
    if (backgroundSnapshot) recordingContext.drawImage(backgroundSnapshot, 0, 0, compositeCanvas.width, compositeCanvas.height);
    else recordingContext.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);
    recordingContext.drawImage(source, 0, 0, compositeCanvas.width, compositeCanvas.height);
    recordingContext.getImageData(0, 0, 1, 1);
    recordingContext.clearRect(0, 0, compositeCanvas.width, compositeCanvas.height);
  } catch (error) {
    throw new Error("La composición del vídeo (fondo o canvas WebGL) contiene una imagen sin permisos CORS. El fondo se valida por separado; revisa las texturas del modelo y los recursos externos del visor.", { cause: error });
  }

  const fps = Math.max(15, Math.min(120, Math.round(options.fps ?? 30)));
  const duration = Math.max(1, Math.min(20, Number(options.duration ?? 5)));
  const framePlan = createAurumVideoFramePlan(duration, fps);
  const recorder = new Recorder(recordingContext as unknown as WebGLRenderingContext, {
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
      // Allow the live renderer to finish a full-quality settled frame before encoding.
      await options.onFrame?.(frame.timestampSeconds, framePlan.length / fps);
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
