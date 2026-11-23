import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { getAurumLightingPreset, type AurumLightingRenderPresetId } from "../aurum-lighting-engine";
import { getAurumReflectionRigProfile } from "../aurum-reflection-engine";

/** The XL softbox is opt-in: missing configuration must never illuminate the scene. */
export const isAurumLargeSoftboxEnabled = (config: any): boolean => config?.largeSoftboxEnabled === true;

export interface AurumLightingController {
  readonly lights: Record<string, any>;
  create: () => void;
  applyPreset: (id: string) => void;
  update: (patch: any) => void;
  scaleToModel: (radius: number, targetY: number) => void;
  applyIJEWELShadowProfile: (profile:any) => boolean;
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
  let activeRigId = "jewelry";
  let lastRadius = 1;
  let lastTargetY = 0;
  let activeIJEWELShadowProfile:any = null;
  // Normal production mode keeps the studio rig active so the lighting panel
  // reflects the actual enabled state of its controls. Use ?aurumDiag=environment
  // only when deliberately isolating HDR/IBL for diagnostics.
  const diagnosticMode = (typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("aurumDiag")
    : null) ?? "standard";
  const diagnosticEnvironmentOnly = diagnosticMode === "environment";
  // Track only controls the user explicitly changed. Scene presets remain the
  // baseline, while touched controls are reapplied after every scene change.
  const manuallyTouched = new Set<string>();

  // The gem slider is intentionally shader-local: a scene PointLight would
  // illuminate the prongs and shank as well as the stone. Publish its state
  // only to gemstone materials and update compiled shader uniforms in place.
  const syncGemShaderLight = () => {
    const light = lights.gem;
    if (!light) return;
    const position = [Number(light.position.x), Number(light.position.y), Number(light.position.z)];
    const enabled = Boolean(config.gem?.enabled);
    const intensity = Math.max(0, Number(config.gem?.intensity ?? 0));
    const radius = Math.max(Number(lastRadius) || 0, 0.001);
    scene.traverse?.((object: any) => {
      if (!object?.isMesh || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material: any) => {
        if (!material?.userData?.aurumGemFamily) return;
        material.userData.aurumGemLightState = { enabled, intensity, position, radius };
        const uniforms = material.userData.aurumGemLightUniforms;
        if (!uniforms) {
          // The light panel can be changed before Three.js has compiled this
          // gemstone's custom shader. Keep the state above and request a fresh
          // material program so onBeforeCompile can register the live uniforms.
          // This runs only on lighting updates, never in the animation loop.
          material.needsUpdate = true;
          return;
        }
        uniforms.position.value.set(position[0], position[1], position[2]);
        uniforms.intensity.value = enabled ? intensity : 0;
        uniforms.radius.value = radius;
      });
    });
  };

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
  const applyIJEWELShadowProfile = () => {
    const light=lights.key;
    const profile=activeIJEWELShadowProfile;
    if(!light?.castShadow || !light.shadow || !profile) return false;
    // Only map fields with a direct equivalent on AURUM's existing SpotLight.
    // The original bake intensity/focus/spread/distance/frustum are not mapped.
    light.shadow.mapSize.set(profile.mapWidth,profile.mapHeight);
    light.shadow.bias=profile.bias;
    light.shadow.radius=profile.shadowRadius;
    if(light.shadow.camera) {
      light.shadow.camera.near=Math.max(.01,Number(profile.near)||.01);
      light.shadow.camera.far=Math.max(light.shadow.camera.near+1,Number(profile.far)||20);
      light.shadow.camera.updateProjectionMatrix?.();
    }
    light.shadow.needsUpdate=true;
    return true;
  };
  const temperatureToRgb = (kelvin:number) => {
    const temperature = Math.max(3200, Math.min(7500, Number(kelvin) || 5500)) / 100;
    const red = temperature <= 66 ? 255 : 329.698727446 * Math.pow(temperature - 60, -0.1332047592);
    const green = temperature <= 66
      ? 99.4708025861 * Math.log(temperature) - 161.1195681661
      : 288.1221695283 * Math.pow(temperature - 60, -0.0755148492);
    const blue = temperature >= 66 ? 255 : temperature <= 19 ? 0 : 138.5177312231 * Math.log(temperature - 10) - 305.0447927307;
    return [red, green, blue].map((value) => Math.max(0, Math.min(255, value)) / 255);
  };
  const applyTemperature = () => {
    const [r,g,b] = temperatureToRgb(Number(config.temperatureK ?? 5500));
    Object.values(lights).forEach((light:any) => {
      if (light?.color?.setRGB) light.color.setRGB(r,g,b,THREE.SRGBColorSpace);
    });
  };
  const applyReflectorPower = () => {
    const rig = getAurumReflectionRigProfile(activeRigId);
    const preset = getAurumLightingPreset(activeRigId);
    const power = Math.max(0, Math.min(6, Number(config.reflectorPower ?? 2)));
    (["softbox","strip","front","kicker","edgeLeft","edgeRight"] as const).forEach((name) => {
      const light = lights[name];
      const profile = rig[name];
      if (!light || !profile) return;
      const manualFrontScale = name === "front" ? Math.max(0, Number(config.front?.intensity ?? 1)) : 1;
      light.intensity = profile.intensity * preset[name] * power * manualFrontScale;
    });
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
      // Three.js requires the RectAreaLight shader uniforms to be initialized
      // before these broad reflection sources are used.
      RectAreaLightUniformsLib.init();
      const mk = (type: string, color: number, cast: boolean) => {
        const light = type === "spot"
          ? new THREE.SpotLight(color, 1, 30, Math.PI * .45, .7, .8)
          : new THREE.PointLight(color, 1, 30, 2);
        light.castShadow = cast;
        scene.add(light);
        // SpotLight.target must belong to the scene so its world matrix is
        // updated correctly; this is important for soft product shadows.
        if (light.target) scene.add(light.target);
        return light;
      };
      if (!lights.key) {
        // Low-energy hemisphere fill: a gentle ambient contribution for the
        // shadow side of gold and gemstones. Keep it subtle so it does not
        // flatten the broad studio reflections or wash out diamond contrast.
        lights.ambient = new THREE.HemisphereLight(0xf3f6ff, 0x6b5540, 0.12);
        lights.ambient.name = "aurum-ambient-fill";
        scene.add(lights.ambient);
        lights.key = mk("spot", 0xffffff, true);
        lights.fill = mk("spot", 0xffffff, false);
        lights.rim = mk("spot", 0xffffff, false);
        lights.gem = mk("point", 0xffffff, false);

        // Large reflection sources: unlike a point/spot source, these produce
        // broad rectangular highlights on polished jewelry. They do not cast
        // shadows; the key spot remains responsible for the contact shadow.
        if (THREE.RectAreaLight) {
          const rig = getAurumReflectionRigProfile("jewelry");
          const createSource = (profile:any) => {
            const light = new THREE.RectAreaLight(0xffffff, profile.intensity, profile.width, profile.height);
            light.position.set(...profile.position);
            light.lookAt(0, 0, 0);
            scene.add(light);
            return light;
          };
          lights.softbox = createSource(rig.softbox);
          lights.strip = createSource(rig.strip);
          lights.front = createSource(rig.front);
          lights.kicker = createSource(rig.kicker);
          lights.edgeLeft = createSource(rig.edgeLeft);
          lights.edgeRight = createSource(rig.edgeRight);

          // Dedicated oversized overhead softbox: a genuinely larger
          // RectAreaLight surface, not an intensity-only imitation.
          lights.largeSoftbox = new THREE.RectAreaLight(
            0xffffff,
            2.2 * Math.max(0, Number(config.largeSoftboxPower ?? 1)),
            24,
            18
          );
          lights.largeSoftbox.name = "aurum-large-overhead-softbox";
          lights.largeSoftbox.position.set(0, 8, 7);
          lights.largeSoftbox.lookAt(0, 0, 0);
          lights.largeSoftbox.visible = isAurumLargeSoftboxEnabled(config);
          scene.add(lights.largeSoftbox);
        }
      }
      apply(lights.key, config.key); configureShadow(lights.key);
      if (lights.ambient) {
        lights.ambient.visible = true;
        lights.ambient.intensity = Math.max(0, Math.min(0.18, Number(config.ambient ?? 0.08)));
      }
      apply(lights.fill, config.fill);
      apply(lights.rim, config.rim);
      apply(lights.gem, config.gem);
      applyTemperature();
      applyReflectorPower();
      if (lights.largeSoftbox) {
        lights.largeSoftbox.visible = isAurumLargeSoftboxEnabled(config);
        lights.largeSoftbox.intensity = 2.2 * Math.max(0, Math.min(4, Number(config.largeSoftboxPower ?? 1)));
      }
      // Gem illumination is applied only by the gemstone shader, never as a
      // scene light that could change the gold/silver reflections.
      if (lights.gem) lights.gem.visible = false;
      // Applying a scene preset calls create() again. Restore the model-scaled
      // positions immediately after config defaults are applied, otherwise
      // the key spotlight is reset to raw coordinates and can miss the jewel.
      this.scaleToModel(lastRadius, lastTargetY);
      if (lights.softbox) lights.softbox.visible = config.reflectors?.softbox ?? false;
      if (lights.strip) lights.strip.visible = config.reflectors?.strip ?? false;
      if (lights.front) lights.front.visible = config.front?.enabled ?? true;
      if (lights.kicker) lights.kicker.visible = config.reflectors?.kicker ?? false;
      if (lights.edgeLeft) lights.edgeLeft.visible = config.reflectors?.edgeLeft ?? false;
      if (lights.edgeRight) lights.edgeRight.visible = config.reflectors?.edgeRight ?? false;
      syncGemShaderLight();

      // Diagnostic mode: isolate the HDR/IBL contribution from every direct
      // and rectangular reflection source. Production behavior is unchanged
      // unless ?aurumDiag=environment is explicitly present in the URL.
      if (diagnosticEnvironmentOnly) {
        // Keep the calibrated environment-only baseline until a user explicitly
        // adjusts a studio control. Then enable only the baseline reflection
        // sources and the specific direct lights the user has touched.
        Object.values(lights).forEach((light:any) => {
          if (light) light.visible = false;
        });
        if (manuallyTouched.size > 0) {
          // In the interactive studio, every visible source must correspond to
          // a control in the panel. Hidden auxiliary reflectors must not keep
          // illuminating the model after the user turns a light off.
          (["softbox", "strip", "kicker", "edgeLeft", "edgeRight"] as const).forEach((name) => {
            if (lights[name]) lights[name].visible = false;
          });
          if (lights.front) lights.front.visible = manuallyTouched.has("front") && Boolean(config.front?.enabled);
          (["key", "fill", "rim", "gem"] as const).forEach((name) => {
            if (!manuallyTouched.has(name) || !lights[name]) return;
            lights[name].visible = name === "gem" ? false : Boolean(config[name]?.enabled);
            lights[name].intensity = Number(config[name]?.intensity ?? lights[name].intensity);
          });
          syncGemShaderLight();
        }
        if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("aurumDiag")) console.info("[AURUM][LIGHTING][DIAGNOSTIC]", {
          mode: diagnosticMode,
          rig: activeRigId,
          environmentUuid: scene.environment?.uuid ?? null,
          environmentPresent: Boolean(scene.environment),
          lights: Object.entries(lights).map(([name, light]: any) => ({
            name,
            type: light?.type ?? light?.constructor?.name ?? "unknown",
            visible: Boolean(light?.visible),
            intensity: Number.isFinite(Number(light?.intensity)) ? Number(light.intensity) : null,
          })),
          allSceneLights: scene.children
            .filter((child: any) => child?.isLight)
            .map((light: any) => ({
              name: light.name || "(unnamed)",
              type: light.type ?? light.constructor?.name ?? "unknown",
              visible: Boolean(light.visible),
              intensity: Number.isFinite(Number(light.intensity)) ? Number(light.intensity) : null,
            })),
        });
      }
    },
    applyPreset(id) {
      const preset = getAurumLightingPreset(id);
      // Los presets sólo ajustan la contribución relativa de las luces.
      // Environment, exposición y fondo pertenecen exclusivamente al SceneController.
      // A scene preset supplies defaults only for controls the user has not
      // manually adjusted. Keep manual slider values stable when changing scenes.
      (["key", "fill", "rim", "gem"] as const).forEach((name) => {
        if (!manuallyTouched.has(name)) {
          config[name] = {...config[name], intensity: preset[name]};
        }
      });

      // The broad sources are the main "shape painters" for polished metal.
      // Apply the scene profile to their actual intensities as well; previously
      // only the spot/point lights changed, leaving the four large reflections
      // identical between scenes.
      activeRigId = id;
      const rig = getAurumReflectionRigProfile(id);
      const sourceSettings = {
        softbox: {light: lights.softbox, profile: rig.softbox, multiplier: preset.softbox},
        strip: {light: lights.strip, profile: rig.strip, multiplier: preset.strip},
        front: {light: lights.front, profile: rig.front, multiplier: preset.front},
        kicker: {light: lights.kicker, profile: rig.kicker, multiplier: preset.kicker},
        edgeLeft: {light: lights.edgeLeft, profile: rig.edgeLeft, multiplier: preset.edgeLeft},
        edgeRight: {light: lights.edgeRight, profile: rig.edgeRight, multiplier: preset.edgeRight},
      };
      Object.values(sourceSettings).forEach((entry:any) => {
        const light = entry.light;
        const profile = entry.profile;
        if (!light || !profile) return;
        light.intensity = profile.intensity * entry.multiplier * Math.max(0, Math.min(6, Number(config.reflectorPower ?? 2)));
        light.width = profile.width;
        light.height = profile.height;
      });

      this.create();
      if (id === "ijewelEnvironmentReference" && !diagnosticEnvironmentOnly) {
        // The supplied iJewel VJSON has no active rectangular studio-reflector rig.
        // Keep AURUM's six RectAreaLights available for other presets and A/B tests,
        // but disable them in this reference profile so the HDR environment is primary.
        (["softbox", "strip", "front", "kicker", "edgeLeft", "edgeRight", "largeSoftbox"] as const)
          .forEach((name) => {
            if (lights[name]) lights[name].visible = false;
          });
      }
      // Reapply the panel's current enabled/intensity state after every preset,
      // not only after an interaction in this session. Otherwise a preset can
      // hide a checked light while the UI still reports it as enabled.
      (["key", "fill", "rim", "gem"] as const).forEach((name) => {
        const light = lights[name];
        if (!light) return;
        light.visible = name === "gem" ? false : Boolean(config[name]?.enabled);
        light.intensity = Number(config[name]?.intensity ?? light.intensity);
      });
      if (lights.front) {
        lights.front.visible = id === "ijewelEnvironmentReference" ? false : Boolean(config.front?.enabled);
        const rig = getAurumReflectionRigProfile(activeRigId);
        const frontPreset = getAurumLightingPreset(activeRigId);
        lights.front.intensity = rig.front.intensity * frontPreset.front * Math.max(0, Number(config.reflectorPower ?? 2)) * Math.max(0, Number(config.front?.intensity) || 0);
      }
      syncGemShaderLight();
      if (diagnosticEnvironmentOnly && manuallyTouched.size > 0) {
        (["softbox", "strip", "kicker", "edgeLeft", "edgeRight"] as const).forEach((name) => {
          if (lights[name]) lights[name].visible = false;
        });
        if (lights.front) lights.front.visible = manuallyTouched.has("front") && Boolean(config.front?.enabled);
      }
      if (lights.front && manuallyTouched.has("front")) {
        const rig = getAurumReflectionRigProfile(activeRigId);
        const preset = getAurumLightingPreset(activeRigId);
        lights.front.visible = Boolean(config.front?.enabled);
        lights.front.intensity = rig.front.intensity * preset.front * Math.max(0, Number(config.reflectorPower ?? 2)) * (Number(config.front?.intensity) || 0);
      }
    },
    update(patch) {
      // Apply only the changed controls. Calling create() here resets the whole
      // lighting rig and then runs the HDR-only visibility filter, which can
      // immediately undo the user's toggle. Direct updates preserve independent
      // on/off state for each light and leave unrelated sources untouched.
      Object.keys(patch ?? {}).forEach((name) => manuallyTouched.add(name));
      Object.assign(config, patch);
      if (patch?.temperatureK !== undefined) applyTemperature();
      if (patch?.reflectorPower !== undefined) applyReflectorPower();
      if (patch?.largeSoftboxEnabled !== undefined && lights.largeSoftbox) {
        lights.largeSoftbox.visible = Boolean(config.largeSoftboxEnabled);
      }
      if (patch?.largeSoftboxPower !== undefined && lights.largeSoftbox) {
        lights.largeSoftbox.intensity = 2.2 * Math.max(0, Math.min(4, Number(config.largeSoftboxPower ?? 1)));
      }

      (["key", "fill", "rim", "gem"] as const).forEach((name) => {
        const cfg = patch?.[name];
        const light = lights[name];
        if (!cfg || !light) return;
        light.visible = name === "gem" ? false : Boolean(cfg.enabled);
        if (Number.isFinite(Number(cfg.intensity))) light.intensity = Number(cfg.intensity);
        // Keep the world-space position assigned by scaleToModel(). The
        // UI only edits enabled/intensity; writing config.position back here
        // would replace model-scaled coordinates with raw defaults and make
        // the key spotlight miss small or large products.
        if (light.angle !== undefined && cfg.angle !== undefined) {
          light.angle = cfg.angle;
          light.penumbra = cfg.penumbra ?? light.penumbra;
        }
      });

      if (patch?.reflectors) {
        (["softbox", "strip", "kicker", "edgeLeft", "edgeRight"] as const).forEach((name) => {
          if (lights[name] && patch.reflectors[name] !== undefined) {
            lights[name].visible = Boolean(patch.reflectors[name]);
          }
        });
      }

      if (patch?.front && lights.front) {
        const rig = getAurumReflectionRigProfile(activeRigId);
        const preset = getAurumLightingPreset(activeRigId);
        lights.front.visible = Boolean(config.front?.enabled);
        lights.front.intensity = rig.front.intensity * preset.front * Math.max(0, Number(config.reflectorPower ?? 2)) * Math.max(0, Number(config.front?.intensity) || 0);
      }

      // Auxiliary reflection sources remain the photographic baseline and
      // are not toggled implicitly by unrelated manual light controls.

      if (patch?.reflectorScale !== undefined) this.scaleToModel(lastRadius, lastTargetY);
      syncGemShaderLight();

      // The environment/HDR remains independent from the manual studio rig.
      if (diagnosticEnvironmentOnly) {
        (["softbox", "strip", "kicker", "edgeLeft", "edgeRight"] as const).forEach((name) => {
          if (lights[name]) lights[name].visible = false;
        });
      }
    },
    applyIJEWELShadowProfile(profile) {
      activeIJEWELShadowProfile=profile??null;
      return applyIJEWELShadowProfile();
    },
    scaleToModel(radius, targetY) {
      // Keep the studio rig composition proportional to the product.
      // The default coordinates are treated as normalized photographic offsets,
      // not fixed world-space positions.
      const safeRadius = Math.max(Number(radius) || 0, 0.001);
      lastRadius = safeRadius;
      lastTargetY = Number(targetY) || 0;
      // Keep positions, source dimensions and light falloff proportional to
      // the actual model; fixed minimum world distances made small pendants
      // appear to have studio lights too far away.
      const rigScale = Math.max(safeRadius * 2.25, 0.01);
      const distance = Math.max(safeRadius * 6, 0.05);
      const reflectorScale = Math.max(0.75, Math.min(3.5, Number(config?.reflectorScale ?? 1.35) || 1.35));
      const sourceScale = Math.max((rigScale / 10) * reflectorScale, 0.01);
      const normalizedPosition = (position: any) => {
        if (!Array.isArray(position) || position.length < 3) return [0, 0, 0] as [number, number, number];
        const maxComponent = Math.max(...position.slice(0, 3).map((v:any) => Math.abs(Number(v) || 0)), 1);
        return position.slice(0, 3).map((v:any) => (Number(v) || 0) / maxComponent) as [number, number, number];
      };
      Object.entries(lights).forEach(([name, light]: any) => {
        if (!light) return;
        if (name === "largeSoftbox") {
          const [nx, ny, nz] = [0.08, 1.0, 0.88] as const;
          light.position.set(nx * rigScale, targetY + ny * rigScale, nz * rigScale);
          light.width = 24 * sourceScale;
          light.height = 18 * sourceScale;
          light.lookAt?.(0, targetY, 0);
          return;
        }
        if (name === "softbox" || name === "strip" || name === "front" || name === "kicker" || name === "edgeLeft" || name === "edgeRight") {
          const rig = getAurumReflectionRigProfile(activeRigId);
          const source = rig[name as "softbox"|"strip"|"front"|"kicker"|"edgeLeft"|"edgeRight"].position;
          const n = normalizedPosition(source);
          light.position.set(n[0] * rigScale, targetY + n[1] * rigScale, n[2] * rigScale);
          if (light.width !== undefined) light.width = rig[name as "softbox"|"strip"|"front"|"kicker"|"edgeLeft"|"edgeRight"].width * sourceScale;
          if (light.height !== undefined) light.height = rig[name as "softbox"|"strip"|"front"|"kicker"|"edgeLeft"|"edgeRight"].height * sourceScale;
          light.lookAt?.(0, targetY, 0);
          return;
        }
        // Keep the gem source close to the stone, above and slightly in front
        // of the product. A distant point light loses most of its useful energy
        // through inverse-square falloff and can appear to do nothing on diamonds.
        if (light.distance !== undefined) light.distance = name === "gem"
          ? Math.max(safeRadius * 4, 0.05)
          : distance;
        const source = config?.[name]?.position;
        if (name === "gem") {
          light.position.set(0, targetY + safeRadius * 1.15, safeRadius * 0.7);
        } else if (source) {
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
          // Small product-photography aiming offset for the key spot:
          // keep the source power and penumbra unchanged while moving its
          // reflection slightly across the ring instead of aiming dead-center.
          const keyAimOffsetX = name === "key" ? -safeRadius * 0.16 : 0;
          light.target.position.set(keyAimOffsetX, targetY, 0);
          light.target.updateMatrixWorld();
        }
      });
      syncGemShaderLight();
      applyIJEWELShadowProfile();

      // Opt-in diagnostic for measuring the actual world-space studio rig
      // after model scaling. It logs measurements only and does not change light behavior.
      if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("aurumDiag") === "lights") {
        const vector = (v:any) => v ? {
          x: Number(v.x.toFixed?.(4) ?? v.x),
          y: Number(v.y.toFixed?.(4) ?? v.y),
          z: Number(v.z.toFixed?.(4) ?? v.z),
        } : null;
        const distanceToTarget = (v:any) => v
          ? Math.sqrt(Number(v.x) ** 2 + (Number(v.y) - lastTargetY) ** 2 + Number(v.z) ** 2)
          : null;
        console.info("[AURUM][LIGHTING][WORLD-RIG]", {
          rig: activeRigId,
          modelRadius: lastRadius,
          targetY: lastTargetY,
          rigScale: Math.max(lastRadius * 2.25, 0.01),
          sources: Object.entries(lights).map(([name, light]:any) => ({
            name,
            type: light?.type ?? light?.constructor?.name ?? "unknown",
            visible: Boolean(light?.visible),
            intensity: Number.isFinite(Number(light?.intensity)) ? Number(light.intensity) : null,
            position: vector(light?.getWorldPosition ? light.getWorldPosition(new THREE.Vector3()) : light?.position),
            target: light?.target
              ? vector(light.target.getWorldPosition ? light.target.getWorldPosition(new THREE.Vector3()) : light.target.position)
              : null,
            distanceToModelCenter: distanceToTarget(light?.getWorldPosition ? light.getWorldPosition(new THREE.Vector3()) : light?.position),
            width: Number.isFinite(Number(light?.width)) ? Number(light.width) : null,
            height: Number.isFinite(Number(light?.height)) ? Number(light.height) : null,
            angleRadians: Number.isFinite(Number(light?.angle)) ? Number(light.angle) : null,
            penumbra: Number.isFinite(Number(light?.penumbra)) ? Number(light.penumbra) : null,
          })),
        });
      }
    },
    dispose() {
      Object.values(lights).forEach((light: any) => {
        if (light?.target) scene.remove(light.target);
        scene.remove(light);
        light.dispose?.();
      });
      Object.keys(lights).forEach(k => delete lights[k]);
    },
  };
}
