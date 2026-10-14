import type { Camera, Scene, WebGLRenderer, WebGLRenderTarget } from "three";

/**
 * Minimal adapter for the capture-only WebGL path-tracing experiment.
 *
 * This module deliberately does not import or initialize a path tracer, alter
 * the live viewer, or convert Aurum materials. The caller must pass an isolated
 * capture scene whose materials are compatible with the selected path tracer.
 */
export interface AurumPathTracerAdapter {
  target: WebGLRenderTarget;
  samples: number;
  setSceneAsync(scene: Scene, camera: Camera, options?: { onProgress?: (progress: number) => void }): Promise<void>;
  renderSample(): void;
  reset(): void;
  dispose(): void;
}

export interface AurumPathTraceCaptureOptions {
  /** Number of progressive samples. Keep conservative for browser memory/time. */
  samples?: number;
  /** Output image type. PNG is lossless and recommended for comparisons. */
  mimeType?: "image/png" | "image/jpeg" | "image/webp";
  /** JPEG/WebP quality; ignored by PNG. */
  quality?: number;
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Render a supplied, isolated scene using an already-created path tracer.
 * This helper intentionally does not change renderer, camera, scene materials,
 * or the interactive viewer. It only reads the tracer's render target.
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

  await tracer.setSceneAsync(scene, camera);
  tracer.reset();

  for (let sample = 0; sample < samples; sample += 1) {
    tracer.renderSample();
    options.onProgress?.(sample + 1, samples);
  }

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
