/**
 * AURUM CORE — Viewer Adapter.
 *
 * Exposes the already-created production viewer through stable, read-only
 * service keys. It does not create, resize, render, or dispose Three.js
 * objects; ownership remains with AurumRender and the existing viewer loop.
 */
import { createAurumReadonlyMap } from "./readonly-map";
import type { IAurumCameraControlsContract } from "./module-contracts";

export const AURUM_VIEWER_SERVICES = {
  scene: "aurum.viewer.scene",
  renderer: "aurum.viewer.renderer",
  cameraControls: "aurum.viewer.camera-controls",
  host: "aurum.viewer.host",
} as const;

export interface AurumViewerAdapterInput {
  readonly scene: unknown;
  readonly renderer: unknown;
  readonly cameraControls: IAurumCameraControlsContract;
  readonly host: HTMLElement;
}

export interface AurumViewerAdapter {
  readonly services: ReadonlyMap<string, unknown>;
  readonly ready: true;
  get<T = unknown>(serviceId: string): T | undefined;
}

export function createAurumViewerAdapter(input: AurumViewerAdapterInput): AurumViewerAdapter {
  const services = createAurumReadonlyMap(new Map<string, unknown>([
    [AURUM_VIEWER_SERVICES.scene, input.scene],
    [AURUM_VIEWER_SERVICES.renderer, input.renderer],
    [AURUM_VIEWER_SERVICES.cameraControls, input.cameraControls],
    [AURUM_VIEWER_SERVICES.host, input.host],
  ]));

  return Object.freeze({
    ready: true as const,
    services,
    get<T = unknown>(serviceId: string): T | undefined {
      return services.get(serviceId) as T | undefined;
    },
  });
}
