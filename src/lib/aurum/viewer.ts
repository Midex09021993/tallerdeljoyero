import type { Object3D, PerspectiveCamera, Vector3 } from "three";
import { applyAurumCameraView, applyAurumIJEWELPresentationCamera } from "./camera";

export interface AurumViewerFrame {
  camera: PerspectiveCamera;
  controls: { target: Vector3; update: () => void };
  lights: Record<string, any>;
  groundController: any;
  scene: any;
  renderer: any;
  lightingController?: { scaleToModel?: (radius:number,targetY:number)=>void };
}

export function frameAurumProduct(viewer: AurumViewerFrame, model: Object3D, prepare: (m:Object3D,scale?:number)=>any, applyScene:(id:any)=>void, sceneId:any, category:string="Anillo") {
  // Primera llamada: preparar producto y presentar frontalmente.
  // Siguientes llamadas: "Restablecer vista" solo cambia la cámara para no
  // reaplicar escena/materiales y provocar cambios de color.
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
      Object.values(viewer.lights).forEach((L:any)=>{
        if(!L)return;
        if(L.distance!==undefined)L.distance=lightDistance;
        if(L.castShadow&&L.shadow?.camera){
          L.shadow.camera.near=Math.max(.01,radius*.02);
          L.shadow.camera.far=Math.max(lightDistance,radius*10);
          if("left" in L.shadow.camera){
            const limit=Math.max(radius*2.2,3);
            L.shadow.camera.left=-limit; L.shadow.camera.right=limit;
            L.shadow.camera.top=limit; L.shadow.camera.bottom=-limit;
          }
          L.shadow.camera.updateProjectionMatrix();
        }
        if(L.target){L.target.position.set(0,targetY,0); L.target.updateMatrixWorld();}
      });
    }
    applyScene(sceneId);
    model.userData={...(model.userData??{}),aurumInitialFrameApplied:true};
    if (sceneId === "ijewelReference") applyAurumIJEWELPresentationCamera(viewer.camera, viewer.controls, model); else applyAurumCameraView(viewer.camera, viewer.controls, model, "frontal", category);

    // AurumRender actualiza el estado de vista al cargar. Ese estado puede
    // intentar aplicar "perspectiva" inmediatamente después del encuadre.
    // Reafirmamos el frontal en el siguiente frame, sin tocar materiales ni escena.
    requestAnimationFrame(() => {
      if (model.userData?.["aurumInitialFrameApplied"]) {
        if (sceneId === "ijewelReference") applyAurumIJEWELPresentationCamera(viewer.camera, viewer.controls, model); else applyAurumCameraView(viewer.camera, viewer.controls, model, "frontal", category);
      }
    });
    return;
  }

  // Reset de cámara: la escena de referencia conserva la composición iJewel;
  // las demás escenas usan el frontal de producto estándar.
  if (sceneId === "ijewelReference") applyAurumIJEWELPresentationCamera(viewer.camera, viewer.controls, model);
  else applyAurumCameraView(viewer.camera, viewer.controls, model, "frontal", category);
}


export function resizeAurumViewer(viewer: {
  node: { clientWidth: number; clientHeight: number };
  camera: PerspectiveCamera;
  renderer: any;
  composer?: any;
  ssaoPass?: any;
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
  node: any;
  renderer: any;
  controls?: any;
  observer?: { disconnect: () => void };
  clickHandler?: (event: MouseEvent) => void;
  groundController?: any;
  lightingController?: any;
  environmentController?: any;
  gemEnvironmentController?: { dispose?: (texture?: any) => void };
  gemEnvironment?: any;
  hdriGroundTexture?: any;
  clearSelection?: () => void;
  composer?: any;
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
  THREE: any,
  nodo: HTMLElement,
  options: { pixelRatio?: number; maxDistance?: number; controlsClass?: any } = {}
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
  viewer: { node: HTMLElement; camera: any; renderer: any; composer?: any; ssaoPass?: any; controls?: any },
  render: () => void,
  interaction?: { onStart?: () => void; onEnd?: () => void }
) {
  // AURUM is a product configurator, not a continuously animated game scene.
  // Render only when the camera/scene actually changes. OrbitControls still
  // receives per-frame updates while damping is active, but no RAF is kept
  // alive once the image is stable.
  let frame = 0;
  let stopped = false;
  let paused = false;
  let dirty = true;
  let interactionActive = false;

  const requestRender = () => {
    dirty = true;
    if (!frame && !stopped && !paused) frame = requestAnimationFrame(tick);
  };

  const resize = () => {
    resizeAurumViewer(viewer);
    requestRender();
  };

  const observer = new ResizeObserver(resize);
  observer.observe(viewer.node);

  const onControlChange = () => {
    if (!interactionActive) {
      interactionActive = true;
      interaction?.onStart?.();
    }
    requestRender();
  };
  const onControlEnd = () => {
    if (interactionActive) {
      interactionActive = false;
      interaction?.onEnd?.();
    }
    requestRender();
  };

  viewer.controls?.addEventListener?.("change", onControlChange);
  viewer.controls?.addEventListener?.("end", onControlEnd);

  const tick = () => {
    frame = 0;
    if (stopped || paused) return;

    const changedByControls = Boolean(viewer.controls?.update?.());
    const shouldRender = dirty || changedByControls || interactionActive;

    if (shouldRender) {
      dirty = false;
      render();
    }

    // Damping/autoRotate may continue changing the camera after the input event.
    // Keep the loop alive only while that motion is actually active.
    if (!stopped && (dirty || changedByControls || interactionActive)) {
      frame = requestAnimationFrame(tick);
    }
  };

  resize();
  requestRender();

  return {
    observer,
    get frame() { return frame; },
    invalidate: requestRender,
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
      viewer.controls?.removeEventListener?.("change", onControlChange);
      viewer.controls?.removeEventListener?.("end", onControlEnd);
      observer.disconnect();
    },
    resize,
  };
}