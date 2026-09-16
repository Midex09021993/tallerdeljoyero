export interface AurumEnvironmentController {
  fallback: any;
  current: any;
  fromEquirectangular: (hdrTexture: any) => any;
  load: (
    url: string,
    requestId: number,
    isCurrent: () => boolean,
    onLoaded: (texture: any) => void,
    onError?: () => void
  ) => void;
  rotation: number;
  intensity: number;
  setRotation: (radians: number) => void;
  setIntensity: (value: number) => void;
  dispose: (extraTexture?: any) => void;
}

export function createAurumEnvironment(
  renderer: any,
  scene: any,
  THREE: any,
  RoomEnvironment: any,
  RGBELoader: any
): AurumEnvironmentController {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const fallbackScene = new RoomEnvironment();
  const fallback = pmrem.fromScene(fallbackScene, .04).texture;
  fallbackScene.dispose?.();
  scene.environment = fallback;

  let current = fallback;
  let rotation = 0;
  let intensity = 1;

  return {
    fallback,
    get current() {
      return current;
    },
    fromEquirectangular(hdrTexture: any) {
      return pmrem.fromEquirectangular(hdrTexture).texture;
    },
    get rotation() { return rotation; },
    get intensity() { return intensity; },
    setRotation(radians: number) {
      rotation = Number.isFinite(radians) ? radians : 0;
      // PMREM textures are world-oriented; rotate the environment through
      // scene.environmentRotation when the renderer supports it.
      if (scene.environmentRotation?.set) {
        scene.environmentRotation.set(0, rotation, 0);
      } else if (scene.environmentRotation) {
        scene.environmentRotation.y = rotation;
      }
    },
    setIntensity(value: number) {
      intensity = Math.max(0, Number.isFinite(value) ? value : 1);
      if ("environmentIntensity" in scene) {
        scene.environmentIntensity = intensity;
      }
    },
    load(url, requestId, isCurrent, onLoaded, onError) {
      new RGBELoader().load(url, (hdrTexture: any) => {
        if (!isCurrent()) {
          hdrTexture.dispose?.();
          return;
        }
        try {
          const next = pmrem.fromEquirectangular(hdrTexture).texture;
          hdrTexture.dispose?.();
          if (!isCurrent()) {
            next.dispose?.();
            return;
          }
          const previous = current;
          current = next;
          scene.environment = next;
          if (previous && previous !== fallback) previous.dispose?.();
          onLoaded(next);
        } catch {
          hdrTexture.dispose?.();
          onError?.();
        }
      }, undefined, () => {
        // RoomEnvironment permanece como fallback silencioso cuando falla la red.
        onError?.();
      });
    },
    dispose(extraTexture?: any) {
      if (extraTexture && extraTexture !== current && extraTexture !== fallback) {
        extraTexture.dispose?.();
      }
      if (current && current !== fallback) current.dispose?.();
      fallback?.dispose?.();
      pmrem.dispose?.();
    },
  };
}
