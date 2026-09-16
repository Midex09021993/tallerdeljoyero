export interface AurumEnvironmentController {
  fallback: any;
  current: any;
  load: (
    url: string,
    requestId: number,
    isCurrent: () => boolean,
    onLoaded: (texture: any) => void,
    onError?: () => void
  ) => void;
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

  const fallback = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environment = fallback;

  let current = fallback;

  return {
    fallback,
    get current() {
      return current;
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
