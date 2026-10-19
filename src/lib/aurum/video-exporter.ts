export type AurumVideoOptions = {
  width?: number;
  height?: number;
  fps?: number;
  duration?: number;
  signal?: AbortSignal;
  onProgress?: (elapsedSeconds: number, durationSeconds: number) => void;
};

const VIDEO_MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

/**
 * Records the live WebGL canvas through a dedicated output canvas. It never
 * resizes the live renderer or changes its materials/rendering pipeline.
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
  const height = Math.max(320, Math.min(2160, Math.round(options.height ?? 720)));
  const fps = Math.max(15, Math.min(120, Math.round(options.fps ?? 30)));
  const duration = Math.max(1, Math.min(20, Number(options.duration ?? 5)));
  const output = document.createElement("canvas");
  output.width = width;
  output.height = height;
  const context = output.getContext("2d", { alpha: false });
  if (!context) throw new Error("No se pudo preparar el canvas de vídeo.");

  const stream = output.captureStream(fps);
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: Math.max(4_000_000, Math.min(100_000_000, width * height * fps * 0.06)) });
  } catch {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("El navegador detecta MP4, pero no pudo iniciar el codificador.");
  }

  const chunks: BlobPart[] = [];
  let raf = 0;
  let startedAt = 0;
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
      const blob = new Blob(chunks, { type: recorder.mimeType || "video/mp4" });
      if (blob.size < 1024) {
        reject(new Error("La grabación terminó sin datos de vídeo suficientes."));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const extension = (recorder.mimeType || mimeType).toLowerCase().includes("mp4") ? "mp4" : "webm";
      link.download = "aurum-giro-" + new Date().toISOString().replace(/[:.]/g, "-") + "." + extension;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      resolve();
    };
    const drawFrame = (now: number) => {
      if (settled) return;
      if (options.signal?.aborted) {
        if (recorder.state !== "inactive") recorder.stop();
        fail(new DOMException("Exportación cancelada.", "AbortError"));
        return;
      }
      const elapsed = Math.max(0, (now - startedAt) / 1000);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      const sourceAspect = source.width / Math.max(1, source.height);
      const outputAspect = width / height;
      const drawWidth = sourceAspect > outputAspect ? width : height * sourceAspect;
      const drawHeight = sourceAspect > outputAspect ? width / sourceAspect : height;
      context.drawImage(source, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      options.onProgress?.(Math.min(elapsed, duration), duration);
      if (elapsed >= duration) {
        if (recorder.state !== "inactive") recorder.stop();
        return;
      }
      raf = requestAnimationFrame(drawFrame);
    };

    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onerror = () => fail(new Error("Falló la codificación del vídeo MP4."));
    recorder.onstop = finish;
    abortHandler = () => {
      if (recorder.state !== "inactive") recorder.stop();
      fail(new DOMException("Exportación cancelada.", "AbortError"));
    };
    options.signal?.addEventListener("abort", abortHandler, { once: true });
    if (options.signal?.aborted) {
      fail(new DOMException("Exportación cancelada.", "AbortError"));
      return;
    }
    try {
      recorder.start(250);
      startedAt = performance.now();
      raf = requestAnimationFrame(drawFrame);
    } catch {
      fail(new Error("No se pudo iniciar la grabación MP4."));
    }
  });
}
