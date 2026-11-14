/** Pixel-level visual regression utilities for AURUM viewer captures. */
export interface AurumRgbaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array | Uint8ClampedArray;
}

export interface AurumVisualRegressionOptions {
  /** Per-channel absolute delta treated as noise (0-255). */
  readonly channelTolerance?: number;
  /** Maximum allowed percentage of pixels outside the channel tolerance. */
  readonly maximumChangedPixelRatio?: number;
  /** Optional RGBA mask; alpha > 0 includes a pixel, alpha = 0 ignores it. */
  readonly mask?: Uint8Array | Uint8ClampedArray;
}

export interface AurumVisualRegressionReport {
  readonly status: "passed" | "failed";
  readonly width: number;
  readonly height: number;
  readonly comparedPixels: number;
  readonly changedPixels: number;
  readonly changedPixelRatio: number;
  readonly meanAbsoluteError: number;
  readonly maximumChannelError: number;
}

/**
 * Compares two same-size RGBA captures without browser or GPU dependencies.
 * This is deliberately a comparator only: callers own screenshot acquisition
 * and must use the same camera, viewport, quality profile and color space.
 */
export function compareAurumVisualCaptures(
  reference: AurumRgbaImage,
  actual: AurumRgbaImage,
  options: AurumVisualRegressionOptions = {},
): AurumVisualRegressionReport {
  if (!Number.isInteger(reference.width) || !Number.isInteger(reference.height)
    || reference.width <= 0 || reference.height <= 0) {
    throw new Error("AURUM visual regression: dimensiones de referencia inválidas.");
  }
  if (reference.width !== actual.width || reference.height !== actual.height) {
    throw new Error("AURUM visual regression: las capturas deben tener las mismas dimensiones.");
  }
  const expectedLength = reference.width * reference.height * 4;
  if (reference.data.length !== expectedLength || actual.data.length !== expectedLength) {
    throw new Error("AURUM visual regression: el buffer RGBA no coincide con las dimensiones.");
  }
  const mask = options.mask;
  if (mask && mask.length !== expectedLength) {
    throw new Error("AURUM visual regression: la máscara debe tener el mismo tamaño RGBA.");
  }
  const tolerance = Math.max(0, Math.min(255, Math.round(options.channelTolerance ?? 8)));
  const maximumChangedPixelRatio = Math.max(0, Math.min(1, options.maximumChangedPixelRatio ?? 0.002));
  let comparedPixels = 0;
  let changedPixels = 0;
  let totalAbsoluteError = 0;
  let maximumChannelError = 0;

  for (let offset = 0; offset < expectedLength; offset += 4) {
    if (mask && mask[offset + 3] === 0) continue;
    comparedPixels += 1;
    let pixelChanged = false;
    for (let channel = 0; channel < 4; channel += 1) {
      const error = Math.abs(reference.data[offset + channel]! - actual.data[offset + channel]!);
      totalAbsoluteError += error;
      if (error > maximumChannelError) maximumChannelError = error;
      if (error > tolerance) pixelChanged = true;
    }
    if (pixelChanged) changedPixels += 1;
  }

  const changedPixelRatio = comparedPixels === 0 ? 0 : changedPixels / comparedPixels;
  const meanAbsoluteError = comparedPixels === 0 ? 0 : totalAbsoluteError / (comparedPixels * 4);
  return Object.freeze({
    status: changedPixelRatio <= maximumChangedPixelRatio ? "passed" : "failed",
    width: reference.width,
    height: reference.height,
    comparedPixels,
    changedPixels,
    changedPixelRatio,
    meanAbsoluteError,
    maximumChannelError,
  });
}
