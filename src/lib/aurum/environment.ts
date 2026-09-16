import * as THREE from "three";

export interface AurumEnvironmentController {
  environment: THREE.Texture;
  setEnvironment: (texture: THREE.Texture) => THREE.Texture | null;
  dispose: () => void;
}

export function createAurumEnvironment(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  RoomEnvironment: any,
  PMREMGenerator: any
): AurumEnvironmentController {
  const pmrem = new PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const fallback = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environment = fallback;

  return {
    environment: fallback,
    setEnvironment(texture: THREE.Texture) {
      const previous = scene.environment;
      scene.environment = texture;
      return previous && previous !== texture ? previous : null;
    },
    dispose() {
      fallback.dispose?.();
      pmrem.dispose?.();
    },
  };
}
