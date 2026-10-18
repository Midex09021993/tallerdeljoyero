import type { Box3, Camera, Light, LightShadow, Object3D, PerspectiveCamera, Scene, Texture, Vector3, WebGLRenderer } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { applyAurumCameraView, applyAurumIJEWELPresentationCamera } from "./camera";

type AurumRuntimeLight = Light & { distance?: number; castShadow?: boolean; shadow?: LightShadow; target?: Object3D };
type AurumRenderer = WebGLRenderer & { renderLists?: { dispose?: () => void } };
type AurumDisposable = { dispose?: () => void };
type AurumComposer = AurumDisposable & { setSize?: (width:number,height:number)=>void };
type AurumControls = OrbitControls;
type AurumGroundController = AurumDisposable & { positionUnderModel: (bounds: Box3) => void; positionBakedShadow?: (bounds: Box3) => void };
type AurumRuntimeCamera = Camera & { near?: number; far?: number; left?: number; right?: number; top?: number; bottom?: number; updateProjectionMatrix?: () => void };

export interface AurumViewerFrame {
  camera: PerspectiveCamera;
  controls: AurumControls | null;
  lights: Record<string, AurumRuntimeLight>;
  groundController: AurumGroundController;
  scene: Scene;
  renderer: AurumRenderer;
  lightingController?: AurumDisposable & { scaleToModel?: (radius:number,targetY:number)=>void };
}

export function frameAurumProduct<TSceneId extends string>(viewer: AurumViewerFrame, model: Object3D, prepare: (m:Object3D,scale?:number)=>{bounds:Box3;size:Vector3;targetY:number}, applyScene:(id:TSceneId)=>void, sceneId:TSceneId, category:string="Anillo") {
  // Primera llamada: preparar producto y presentar frontalmente.
  // Siguientes llamadas: "Restablecer vista" solo cambia la cámara para no
  // reaplicar escena/materiales y provocar cambios de color.
  const controls = viewer.controls;
  if (!controls) return;
  const wasPrepared = !!model.userData?.["aurumInitialFrameApplied"];

  if (!wasPrepared) {
    const prepared=prepare(model,sceneId === "ijewelReference" ? 2.0 : 2.6);
    const bounds=prepared.bounds, size=prepared.size, targetY=prepared.targetY;
    viewer.groundController.positionUnderModel(bounds);
    viewer.groundController.positionBakedShadow?.(bounds);
    const radius=Math.max(size.length()*.5,.8);
    const lightDistance=Math.max(radius*6,12);
    if (viewer.lightingController?.scaleToModel) {
      viewer.lightingController.scaleToModel(radius,targetY);
    } else {
      Object.values(viewer.lights).forEach((L)=>{
        if(!L)return;
        if(L.distance!==undefined)L.distance=lightDistance;
        if(L.castShadow&&L.shadow?.camera){
          const shadowCamera = L.shadow.camera as AurumRuntimeCamera;
          shadowCamera.near=Math.max(.01,radius*.02);
          shadowCamera.far=Math.max(lightDistance,radius*10);
          if("left" in shadowCamera){
            const limit=Math.max(radius*2.2,3);
            shadowCamera.left=-limit; shadowCamera.right=limit;
            shadowCamera.top=limit; shadowCamera.bottom=-limit;
          }
          shadowCamera.updateProjectionMatrix?.();
        }
        if(L.target){L.target.position.set(0,targetY,0); L.target.updateMatrixWorld();}
      });
    }
    applyScene(sceneId);
    model.userData={...(model.userData??{}),aurumInitialFrameApplied:true};
    if (sceneId === "ijewelReference") applyAurumIJEWELPresentationCamera(viewer.camera, controls, model); else applyAurumCameraView(viewer.camera, controls, model, "frontal", category);

    // AurumRender actualiza el estado de vista al cargar. Ese estado puede
    // intentar aplicar "perspectiva" inmediatamente después del encuadre.
    // Reafirmamos el frontal en el siguiente frame, sin tocar materiales ni escena.
    requestAnimationFrame(() => {
      if (model.userData?.["aurumInitialFrameApplied"]) {
        if (sceneId === "ijewelReference") applyAurumIJEWELPresentationCamera(viewer.camera, controls, model); else applyAurumCameraView(viewer.camera, controls, model, "frontal", category);
      }
    });
    return;
  }

  // Restablecer siempre a una vista frontal con encuadre calculado
  // según el tamaño real del modelo. Evita que la cámara fija de referencia
  // vuelva a acercarse demasiado en archivos 3DM con otras unidades.
  applyAurumCameraView(viewer.camera, controls, model, "frontal", category);
}


export function resizeAurumViewer(viewer: {
  node: { clientWidth: number; clientHeight: number };
  camera: PerspectiveCamera;
  renderer: AurumRenderer;
  composer?: AurumComposer;
  ssaoPass?: { setSize?: (width:number,height:number)=>void };
}) {
  const w = viewer.node.clientWidth || 900;
  const h = viewer.node.clientHeight || 600;
  viewer.camera.aspect = w / h;
  viewer.camera.updateProjectionMatrix();
  viewer.renderer.setSize(w, h, false);
  viewer.composer?.setSize?.(w, h);
  viewer.ssaoPass?.setSize?.(w, h);
}

export function disposeAurumViewer(viewer: {
  node: HTMLElement;
  renderer: AurumRenderer;
  controls?: AurumControls | null;
  observer?: { disconnect: () => void };
  clickHandler?: (event: MouseEvent) => void;
  groundController?: AurumDisposable;
  lightingController?: AurumDisposable;
  environmentController?: AurumDisposable;
  gemEnvironmentController?: { dispose?: (texture?: Texture) => void };
  gemEnvironment?: Texture;
  hdriGroundTexture?: Texture;
  clearSelection?: () => void;
  composer?: AurumComposer;
}) {
  viewer.observer?.disconnect();
  if (viewer.clickHandler) viewer.renderer?.domElement?.removeEventListener("click", viewer.clickHandler);
  viewer.controls?.dispose?.();
  viewer.lightingController?.dispose?.();
  viewer.groundController?.dispose?.();
  viewer.clearSelection?.();
  viewer.hdriGroundTexture?.dispose?.();
  viewer.environmentController?.dispose?.();
  viewer.gemEnvironmentController?.dispose?.();
  viewer.composer?.dispose?.();
  viewer.renderer?.renderLists?.dispose?.();
  viewer.renderer?.dispose?.();
  if (viewer.renderer?.domElement?.parentElement === viewer.node) {
    viewer.node.removeChild(viewer.renderer.domElement);
  }
}

export function createAurumWebGLViewer(
  THREE: typeof import("three"),
  nodo: HTMLElement,
  options: { pixelRatio?: number; maxDistance?: number; controlsClass?: new (camera: PerspectiveCamera, domElement: HTMLElement) => OrbitControls } = {}
) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.001, 1000);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    // Capture uses a dedicated render target; the interactive canvas does not
    // need a preserved default framebuffer.
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
  });
  const requestedPixelRatio = Math.max(1, Math.min(2, Number(options.pixelRatio ?? 2)));
  renderer.setPixelRatio(requestedPixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.domElement.className = "block h-full w-full";

  const Controls = options.controlsClass;
  const controls = Controls ? new Controls(camera, renderer.domElement) : null;
  if (controls) {
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.65;
    controls.minDistance = 0.15;
    controls.maxDistance = options.maxDistance ?? 100;
  }

  nodo.appendChild(renderer.domElement);
  return { scene, camera, renderer, controls };
}

export function startAurumViewerLoop(
  viewer: { node: HTMLElement; camera: PerspectiveCamera; renderer: AurumRenderer; composer?: AurumComposer; ssaoPass?: { setSize?: (width:number,height:number)=>void }; controls?: AurumControls | null },
  render: () => void,
  interaction?: { onStart?: () => void; onEnd?: () => void; progressiveFrames?: number }
) {
  // AURUM is a product configurator, not a continuously animated game scene.
  // Render only when the camera/scene actually changes. OrbitControls still
  // receives per-frame updates while damping is active, but no RAF is kept
  // alive once the image is stable.
  let frame = 0;
  let ticking = false;
  let stopped = false;
  let paused = false;
  let dirty = true;
  let interactionActive = false;
  let interactionEnding = false;
  let idleFramesRemaining = 0;
  const progressiveFrames = Math.max(0, Math.min(32, Math.floor(interaction?.progressiveFrames ?? 32)));

  const requestRender = () => {
    dirty = true;
    if (!frame && !ticking && !stopped && !paused) frame = requestAnimationFrame(tick);
  };

  const resize = () => {
    resizeAurumViewer(viewer);
    requestRender();
  };

  const observer = new ResizeObserver(resize);
  observer.observe(viewer.node);

  const onControlStart = () => {
    interactionEnding = false;
    idleFramesRemaining = 0;
    if (!interactionActive) {
      interactionActive = true;
      interaction?.onStart?.();
    }
    requestRender();
  };
  const onControlChange = () => {
    // A change can be caused by damping after pointer-up; do not treat every
    // change event as a new user interaction or the loop may never go idle.
    requestRender();
  };
  const onControlEnd = () => {
    interactionEnding = true;
    requestRender();
  };

  viewer.controls?.addEventListener?.("start", onControlStart);
  viewer.controls?.addEventListener?.("change", onControlChange);
  viewer.controls?.addEventListener?.("end", onControlEnd);

  const tick = () => {
    frame = 0;
    ticking = true;
    if (stopped || paused) { ticking = false; return; }

    const changedByControls = Boolean(viewer.controls?.update?.());

    // Wait until OrbitControls damping has actually settled before restoring
    // the beauty path. This prevents a progressive image accumulating while
    // the camera is still moving.
    if (interactionEnding && !changedByControls) {
      interactionEnding = false;
      interactionActive = false;
      interaction?.onEnd?.();
      idleFramesRemaining = progressiveFrames;
      dirty = true;
    }

    const shouldRender = dirty || changedByControls || interactionActive || idleFramesRemaining > 0;
    if (shouldRender) {
      dirty = false;
      render();
      if (!interactionActive && !interactionEnding && idleFramesRemaining > 0) idleFramesRemaining--;
    }

    // During idle convergence, request a bounded number of frames, then stop.
    ticking = false;
    if (!stopped && !paused && (dirty || changedByControls || interactionActive || interactionEnding || idleFramesRemaining > 0)) {
      frame = requestAnimationFrame(tick);
    }
  };

  resize();
  requestRender();

  return {
    observer,
    get frame() { return frame; },
    invalidate: requestRender,
    // Run a bounded set of frames after switching to the photographic pipeline
    // so TAA/SSR/SSAO can settle without leaving a permanent animation loop.
    converge: (count = progressiveFrames) => {
      idleFramesRemaining = Math.max(idleFramesRemaining, Math.max(1, Math.min(32, Math.floor(count))));
      requestRender();
    },
    pause: () => {
      paused = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    },
    resume: () => {
      if (stopped) return;
      paused = false;
      requestRender();
    },
    stop: () => {
      stopped = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      viewer.controls?.removeEventListener?.("start", onControlStart);
      viewer.controls?.removeEventListener?.("change", onControlChange);
      viewer.controls?.removeEventListener?.("end", onControlEnd);
      observer.disconnect();
    },
    resize,
  };
}