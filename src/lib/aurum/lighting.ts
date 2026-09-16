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
    if (light.angle !== undefined) {
      light.angle = cfg.angle;
      light.penumbra = cfg.penumbra;
    }
  };
  return {
    lights,
    create() {
      const mk = (type: string, color: number, cast: boolean) => {
        const light = type === "spot"
          ? new THREE.SpotLight(color, 1, 30, Math.PI * .45, .7, .8)
          : new THREE.PointLight(color, 1, 30, 2);
        light.castShadow = cast;
        scene.add(light);
        return light;
      };
      if (!lights.key) {
        lights.key = mk("spot", 0xffffff, true);
        lights.fill = mk("spot", 0xffffff, false);
        lights.rim = mk("spot", 0xffffff, false);
        lights.gem = mk("point", 0xffffff, false);

        // Large reflection sources: unlike a point/spot source, these produce
        // broad rectangular highlights on polished jewelry. They do not cast
        // shadows; the key spot remains responsible for the contact shadow.
        if (THREE.RectAreaLight) {
          lights.softbox = new THREE.RectAreaLight(0xffffff, 2.2, 7, 4);
          lights.softbox.position.set(3.5, 5.5, 4.5);
          lights.softbox.lookAt(0, 0, 0);
          scene.add(lights.softbox);

          lights.strip = new THREE.RectAreaLight(0xffffff, 1.15, 2.2, 7);
          lights.strip.position.set(-3.5, 3.2, 2.8);
          lights.strip.lookAt(0, 0, 0);
          scene.add(lights.strip);
        }
      }
      apply(lights.key, config.key); configureShadow(lights.key);
      apply(lights.fill, config.fill);
      apply(lights.rim, config.rim);
      apply(lights.gem, config.gem);
      if (lights.softbox) lights.softbox.visible = true;
      if (lights.strip) lights.strip.visible = true;
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
        if (name === "softbox" || name === "strip") {
          const source = name === "softbox" ? [3.5, 5.5, 4.5] : [-3.5, 3.2, 2.8];
          const n = normalizedPosition(source);
          light.position.set(n[0] * rigScale, targetY + n[1] * rigScale, n[2] * rigScale);
          light.lookAt?.(0, targetY, 0);
          return;
        }
        if (light.distance !== undefined) light.distance = distance;
        const source = config?.[name]?.position;
        if (source) {
          const n = normalizedPosition(source);
          light.position.set(n[0] * rigScale, targetY + n[1] * rigScale, n[2] * rigScale);
        }
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
