/**
 * AURUM CORE — Final Render Adapter.
 *
 * Owns the stable service boundary for still-image path tracing. The isolated
 * path-tracer implementation remains responsible for scene cloning, samples,
 * bounces, HDRI loading, GPU capability checks and renderer-state restoration.
 */
import {
  aurumPathTracerSupported,
  renderAurumPathTracedImage,
  type AurumFinalRenderOptions,
} from "../path-tracer-final";
import type * as THREE from "three";

export const AURUM_FINAL_RENDER_SERVICES = {
  supported: "aurum.final-render.supported",
  renderImage: "aurum.final-render.image",
} as const;

export interface AurumFinalRenderEngine {
  supported(renderer: THREE.WebGLRenderer): boolean;
  renderImage(
    renderer: THREE.WebGLRenderer,
    model: THREE.Object3D,
    camera: THREE.PerspectiveCamera,
    options: AurumFinalRenderOptions,
  ): Promise<string>;
}

export interface AurumFinalRenderAdapter extends AurumFinalRenderEngine {
  readonly services: ReadonlyMap<string, unknown>;
}

export function createAurumFinalRenderAdapter(
  engine: AurumFinalRenderEngine = {
    supported: aurumPathTracerSupported,
    renderImage: renderAurumPathTracedImage,
  },
): AurumFinalRenderAdapter {
  const services = new Map<string, unknown>([
    [AURUM_FINAL_RENDER_SERVICES.supported, engine.supported],
    [AURUM_FINAL_RENDER_SERVICES.renderImage, engine.renderImage],
  ]);

  const adapter: AurumFinalRenderAdapter = {
    services: services as ReadonlyMap<string, unknown>,
    supported: (renderer) => engine.supported(renderer),
    renderImage: (renderer, model, camera, options) =>
      engine.renderImage(renderer, model, camera, options),
  };
  return Object.freeze(adapter);
}
