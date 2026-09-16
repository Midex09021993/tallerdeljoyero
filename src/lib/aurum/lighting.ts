import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

import { getAurumLightingPreset, type AurumLightingRenderPresetId } from "../aurum-lighting-engine";

export interface AurumLightingController {
  readonly lights: Record<string, any>;
  create: () => void;
  applyPreset: (id: string) => void;
  update: (patch: any) => void;
  scaleToModel: (radius: number, targetY: number) => void;
  dispose: () => void;
}

export function createAurumLightingController(
  THREE: any,
  scene: any,
  config: any,
  shadowConfig: any,
  renderQuality: any
): AurumLightingController {
  const lights: any = {};
  RectAreaLightUniformsLib.init();
  const configureShadow = (light: any) => {
    if (!light?.castShadow) return;
    const requestedSize = Number(renderQuality?.shadowMapSize);
    const configuredSize = Number(shadowConfig?.mapSize);
    const mapSize = Math.max(
      512,
      Math.min(
        Number.isFinite(configuredSize) ? configuredSize : 2048,
        Number.isFinite(requestedSize) ? requestedSize : 2048
      )
    );
    light.shadow.mapSize.set(mapSize, mapSize);
    light.shadow.bias = shadowConfig.bias;
    light.shadow.normalBias = shadowConfig.normalBias;
    light.shadow.radius = shadowConfig.contact ? shadowConfig.contactScale : 1;
  };
  const apply = (light: any, cfg: any) => {
    if (!light || !cfg) return;
    light.visible = cfg.enabled;
    light.intensity = cfg.intensity;
    light.position.set(...cfg.position);
    if (light.isRectAreaLight) {
      light.lookAt(0, 0, 0);
      return;
    }
    if (light.angle !== undefined) {
      light.angle = cfg.angle;
      light.penumbra = cfg.penumbra;
    }
  };
  return {
    lights,
    create() {
      const mkArea = (width:number,height:number) =>
        new THREE.RectAreaLight(0xffffff, 0, width, height);
      if (!lights.key) {
        // Large rectangular sources emulate photographic softboxes. They create
        // broad specular reflections instead of point-like hot spots on polished metal.
        lights.key = mkArea(5, 3.2);
        lights.fill = mkArea(4.2, 2.8);
        lights.rim = mkArea(3.6, 2.2);
        lights.gem = new THREE.PointLight(0xffffff, 0, 30, 2);
        scene.add(lights.key, lights.fill, lights.rim, lights.gem);
      }
      apply(lights.key, config.key); configureShadow(lights.key);
      apply(lights.fill, config.fill);
      apply(lights.rim, config.rim);
      apply(lights.gem, config.gem);
    },
    applyPreset(id) {
      const preset = getAurumLightingPreset(id);
      // Los presets sólo ajustan la contribución relativa de las luces.
      // Environment, exposición y fondo pertenecen exclusivamente al SceneController.
      Object.assign(config, {
        key: {...config.key, intensity: preset.key},
        fill: {...config.fill, intensity: preset.fill},
        rim: {...config.rim, intensity: preset.rim},
        gem: {...config.gem, intensity: preset.gem},
      });
      this.create();
    },
    update(patch) {
      Object.assign(config, patch);
      this.create();
    },
    scaleToModel(radius, targetY) {
      // Keep the studio rig composition proportional to the product.
      // The default coordinates are treated as normalized photographic offsets,
      // not fixed world-space positions.
      const safeRadius = Math.max(Number(radius) || 0, 0.001);
      const rigScale = Math.max(safeRadius * 2.25, 1.8);
      const distance = Math.max(safeRadius * 6, 12);
      const normalizedPosition = (position: any) => {
        if (!Array.isArray(position) || position.length < 3) return [0, 0, 0];
        const maxComponent = Math.max(...position.slice(0, 3).map((v:any) => Math.abs(Number(v) || 0)), 1);
        return position.slice(0, 3).map((v:any) => (Number(v) || 0) / maxComponent);
      };
      Object.entries(lights).forEach(([name, light]: any) => {
        if (!light) return;
        if (light.distance !== undefined) light.distance = distance;
        const source = config?.[name]?.position;
        if (source) {
          const n = normalizedPosition(source);
          light.position.set(n[0] * rigScale, targetY + n[1] * rigScale, n[2] * rigScale);
          if (light.isRectAreaLight) {
            const size = Math.max(rigScale * 1.35, 2.4);
            if (name === "key") {
              light.width = size * 1.45;
              light.height = size * .82;
            } else if (name === "fill") {
              light.width = size * 1.15;
              light.height = size * .72;
            } else {
              light.width = size;
              light.height = size * .60;
            }
            light.lookAt(0, targetY + safeRadius * .10, 0);
          }
        }
        if (light.isRectAreaLight) continue;
        if (light.castShadow && light.shadow?.camera) {
          light.shadow.camera.near = Math.max(.01, radius * .02);
          light.shadow.camera.far = Math.max(distance, radius * 10);
          if ("left" in light.shadow.camera) {
            const limit = Math.max(radius * 2.2, 3);
            light.shadow.camera.left = -limit;
            light.shadow.camera.right = limit;
            light.shadow.camera.top = limit;
            light.shadow.camera.bottom = -limit;
          }
          light.shadow.camera.updateProjectionMatrix?.();
        }
        if (light.target) {
          light.target.position.set(0, targetY, 0);
          light.target.updateMatrixWorld();
        }
      });
    },
    dispose() {
      Object.values(lights).forEach((light: any) => {
        scene.remove(light);
        light.dispose?.();
      });
      Object.keys(lights).forEach(k => delete lights[k]);
    },
  };
}
