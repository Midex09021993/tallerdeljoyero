/**
 * AURUM CORE — Scene Adapter.
 *
 * Wraps the existing scene controller behind a stable service contract.
 * Scene presets, backgrounds and floor behaviour remain implemented by the
 * production scene module; this adapter does not change their visual logic.
 */
import type { AurumSceneBackground, AurumSceneController } from "../scene";
import type { AurumScenePreset } from "../../aurum-scene-engine";

import { createAurumReadonlyMap } from "./readonly-map";

export const AURUM_SCENE_SERVICES = {
  controller: "aurum.scene.controller",
} as const;

export interface AurumSceneAdapter {
  readonly services: ReadonlyMap<string, unknown>;
  readonly controller: AurumSceneController;
  apply(id: string, options?: { transparent?: boolean }): AurumScenePreset;
  setBackground(id: string): void;
  getBackground(): AurumSceneBackground;
}

export function createAurumSceneAdapter(controller: AurumSceneController): AurumSceneAdapter {
  const services = createAurumReadonlyMap(new Map<string, unknown>([[AURUM_SCENE_SERVICES.controller, controller]]));

  return Object.freeze({
    services,
    controller,
    apply(id: string, options?: { transparent?: boolean }): AurumScenePreset {
      return controller.apply(id, options);
    },
    setBackground(id: string): void {
      controller.setBackground(id);
    },
    getBackground(): AurumSceneBackground {
      return controller.getBackground();
    },
  });
}
