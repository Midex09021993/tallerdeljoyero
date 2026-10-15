import type { Camera, Scene, WebGLRenderer, WebGLRenderTarget } from "three";

/**
 * Adapter boundary for the optional, capture-only WebGL path-tracing engine.
 *
 * The live Aurum viewer remains the owner of the interactive renderer. Callers
 * must provide an isolated scene and a tracer built against the same WebGL
 * renderer; this helper never mutates live materials or replaces the viewer.
 */
export interface AurumPathTracerAdapter {
  target: WebGLRenderTarget;
  samples: number;
  setSceneAsync(
    scene: Scene,
    camera: Camera,
    options?: { onProgress?: (progress: number) => void },
  ): Promise<void>;
  renderSample(): void;
  reset(): void;
  dispose(): void;
}

export interface AurumPathTraceCaptureOptions {
  /** Progressive samples. The browser gets a frame between samples. */
  samples?: number;
  /** Output image type. PNG is lossless and recommended for comparisons. */
  mimeType?: "image/png" | "image/jpeg" | "image/webp";
  /** JPEG/WebP quality; ignored by PNG. */
  quality?: number;
  /** Called after each sample has been rendered. */
  onProgress?: (completed: number, total: number) => void;
  /** Optional cancellation signal; the caller retains ownership of the tracer. */
  signal?: AbortSignal;
}

const yieldToBrowser = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new DOMException("Aurum path-traced capture was cancelled.", "AbortError");
  }
};

/**
 * Render an isolated scene using an already-created path tracer and return a
 * data URL. Sampling is deliberately asynchronous so a high-quality capture
 * does not monopolize the browser's main thread for the whole render.
 */
export async function captureAurumPathTracedScene(
  renderer: WebGLRenderer,
  tracer: AurumPathTracerAdapter,
  scene: Scene,
  camera: Camera,
  options: AurumPathTraceCaptureOptions = {},
): Promise<string> {
  const samples = Math.max(1, Math.min(256, Math.floor(options.samples ?? 64)));
  const mimeType = options.mimeType ?? "image/png";
  const quality = Math.max(0, Math.min(1, options.quality ?? 0.94));

  if (renderer.getContext().isContextLost()) {
    throw new Error("Aurum's WebGL context is lost; the path-traced capture cannot start.");
  }

  throwIfAborted(options.signal);
  await tracer.setSceneAsync(scene, camera, {
    onProgress: () => throwIfAborted(options.signal),
  });
  tracer.reset();

  for (let sample = 0; sample < samples; sample += 1) {
    throwIfAborted(options.signal);
    tracer.renderSample();
    options.onProgress?.(sample + 1, samples);
    // Yield every sample to keep the UI responsive and allow cancellation.
    if (sample + 1 < samples) await yieldToBrowser();
  }

  throwIfAborted(options.signal);
  const target = tracer.target;
  if (!target?.width || !target?.height) {
    throw new Error("Aurum path tracer did not produce a valid render target.");
  }

  const width = target.width;
  const height = target.height;
  const pixels = new Uint8Array(width * height * 4);
  renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create the path-traced capture canvas.");

  const image = context.createImageData(width, height);
  const rowSize = width * 4;
  for (let y = 0; y < height; y += 1) {
    const sourceOffset = (height - 1 - y) * rowSize;
    image.data.set(pixels.subarray(sourceOffset, sourceOffset + rowSize), y * rowSize);
  }
  context.putImageData(image, 0, 0);

  const dataUrl = canvas.toDataURL(mimeType, quality);
  if (!dataUrl || dataUrl.length < 1000) {
    throw new Error("Aurum path-traced capture is empty.");
  }
  return dataUrl;
}
