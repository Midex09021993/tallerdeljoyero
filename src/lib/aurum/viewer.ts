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

  // Restablecer siempre a una vista frontal con encuadre calculado
  // según el tamaño real del modelo. Evita que la cámara fija de referencia
  // vuelva a acercarse demasiado en archivos 3DM con otras unidades.
  applyAurumCameraView(viewer.camera, viewer.controls, model, "frontal", category);
}


export function resizeAurumViewer(viewer: {
  node: HTMLElement;
  camera: PerspectiveCamera;
  renderer: any;
  composer?: any;
  ssaoPass?: any;
}) {
  // Measure the committed layout, not clientWidth/clientHeight fallbacks.
  // During WinForms/WebView2 maximize/restore the host can briefly report a
  // zero-sized viewport. Resizing WebGL to an invented 900x600 at that moment
  // leaves the drawing buffer out of sync with the final embedded viewport.
  const rect = viewer.node.getBoundingClientRect();
  const w = Math.floor(rect.width);
  const h = Math.floor(rect.height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 2 || h < 2) return false;

  // Three.js writes into the supplied Vector2-like target. The previous
  // target returned a new object without mutating itself, so x/y stayed
  // undefined and every resize was incorrectly treated as a size change.
  const sizeTarget = {
    x: 0,
    y: 0,
    set(x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    },
  };
  const currentSize = viewer.renderer?.getSize?.(sizeTarget);
  const logicalSizeChanged = !currentSize ||
    Math.round(currentSize.x) !== w ||
    Math.round(currentSize.y) !== h;
  const pixelRatio = Math.max(1, Number(viewer.renderer?.getPixelRatio?.() ?? 1));
  const canvas = viewer.renderer?.domElement as HTMLCanvasElement | undefined;
  // A fullscreen transition can leave Three.js' logical size correct while
  // the actual drawing buffer still has the previous dimensions. Check both.
  const bufferSizeChanged = Boolean(canvas) && (
    Math.abs(canvas!.width - Math.floor(w * pixelRatio)) > 1 ||
    Math.abs(canvas!.height - Math.floor(h * pixelRatio)) > 1
  );
  const sizeChanged = logicalSizeChanged || bufferSizeChanged;
  const nextAspect = w / h;
  const aspectChanged = Math.abs(Number(viewer.camera.aspect) - nextAspect) > 0.0001;

  if (aspectChanged) {
    viewer.camera.aspect = nextAspect;
    viewer.camera.updateProjectionMatrix();
  }
  if (sizeChanged || aspectChanged) {
    // Update the existing renderer and post pipeline in place. Never recreate
    // the WebGL context, scene, camera, materials or optical configuration.
    viewer.renderer.setSize(w, h, false);
    viewer.composer?.setSize?.(w, h);
    viewer.ssaoPass?.setSize?.(w, h);
  }
  // A host resize can happen while demand rendering is idle. Return true for
  // either a buffer or projection change so the caller always schedules the
  // first frame against the final viewport dimensions.
  return sizeChanged || aspectChanged;
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
    // The demand-driven loop stops once the image settles. Preserve the last
    // frame so browser compositing cannot clear the idle interactive canvas.
    preserveDrawingBuffer: true,
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
  let continuousRendering = false;
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

  // Native desktop hosts (including Rhino's WebView2) can resize or restore
  // their top-level window without producing a reliable observer notification
  // for the embedded canvas. Re-sync the existing renderer on host viewport
  // and visibility transitions; never recreate the WebGL context or scene.
  let hostResizeFrame = 0;
  let hostResizeSettleFrame = 0;
  let hostResizePassesRemaining = 0;
  const scheduleHostResize = () => {
    if (stopped) return;
    // Internal fullscreen can settle over several layout/compositor frames.
    // Keep a short bounded retry window instead of trusting one ResizeObserver
    // notification; every pass resizes the existing WebGL resources in place.
    hostResizePassesRemaining = Math.max(hostResizePassesRemaining, 4);
    if (hostResizeFrame || hostResizeSettleFrame) return;
    const runResizePass = () => {
      hostResizeSettleFrame = 0;
      if (stopped) {
        hostResizePassesRemaining = 0;
        return;
      }
      if (!paused) resize();
      hostResizePassesRemaining -= 1;
      if (hostResizePassesRemaining > 0) {
        hostResizeSettleFrame = requestAnimationFrame(runResizePass);
      }
    };
    hostResizeFrame = requestAnimationFrame(() => {
      hostResizeFrame = 0;
      hostResizeSettleFrame = requestAnimationFrame(runResizePass);
    });
  };
  const onDocumentVisibilityChange = () => {
    if (document.visibilityState === "visible") scheduleHostResize();
  };
  const onPageShow = () => scheduleHostResize();
  // WebView2 can restore its native composition surface without a reliable
  // ResizeObserver notification. A focus/pointer wake must request a frame
  // immediately; the bounded resize pass then reconciles the final viewport.
  const onHostWake = () => {
    requestRender();
    scheduleHostResize();
  };
  window.addEventListener("resize", scheduleHostResize, { passive: true });
  window.addEventListener("aurum-host-resize", scheduleHostResize);
  document.addEventListener("fullscreenchange", scheduleHostResize);
  window.visualViewport?.addEventListener("resize", scheduleHostResize, { passive: true });
  window.addEventListener("pageshow", onPageShow);
  window.addEventListener("focus", onHostWake);
  window.addEventListener("pointerdown", onHostWake, true);
  document.addEventListener("visibilitychange", onDocumentVisibilityChange);

  const canvas = viewer.renderer?.domElement as HTMLCanvasElement | undefined;
  const onWebGLContextLost = (event: Event) => {
    event.preventDefault();
    paused = true;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    dirty = true;
    console.warn("[AURUM][VIEWER][WEBGL_CONTEXT_LOST] Rendering paused while the browser restores the GPU context.");
  };
  const onWebGLContextRestored = () => {
    if (stopped) return;
    try {
      resizeAurumViewer(viewer);
      paused = false;
      dirty = true;
      console.info("[AURUM][VIEWER][WEBGL_CONTEXT_RESTORED] Viewer render loop resumed.");
      requestRender();
    } catch (error) {
      console.error("[AURUM][VIEWER][WEBGL_CONTEXT_RECOVERY_ERROR] Could not resume after context restoration.", error);
    }
  };
  canvas?.addEventListener("webglcontextlost", onWebGLContextLost, false);
  canvas?.addEventListener("webglcontextrestored", onWebGLContextRestored, false);

  const onControlStart = () => {
    interactionEnding = false;
    idleFramesRemaining = 0;
    if (!interactionActive) {
      interactionActive = true;
      try {
        interaction?.onStart?.();
      } catch (error) {
        interactionActive = false;
        console.error("[AURUM][VIEWER][INTERACTION_START_ERROR]", error);
      }
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
    if (stopped || paused || ticking) return;
    ticking = true;
    let changedByControls = false;
    try {
      changedByControls = Boolean(viewer.controls?.update?.());

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

      const shouldRender = dirty || changedByControls || interactionActive || idleFramesRemaining > 0 || continuousRendering;
      if (shouldRender) {
        dirty = false;
        render();
        if (!interactionActive && !interactionEnding && idleFramesRemaining > 0) idleFramesRemaining--;
      }
    } catch (error) {
      // Prevent one failed frame from permanently wedging the demand-driven RAF.
      // Stop automatic retries to avoid a hot error loop; a later invalidate()
      // or user interaction can request another frame.
      dirty = false;
      interactionActive = false;
      interactionEnding = false;
      idleFramesRemaining = 0;
      continuousRendering = false;
      console.error("[AURUM][VIEWER][FRAME_ERROR] Render loop suspended after an exception.", error);
    } finally {
      ticking = false;
      if (!stopped && !paused && !frame && (dirty || changedByControls || interactionActive || interactionEnding || idleFramesRemaining > 0 || continuousRendering)) {
        frame = requestAnimationFrame(tick);
      }
    }
  };

  resize();
  requestRender();

  return {
    observer,
    get frame() { return frame; },
    invalidate: requestRender,
    // Present material/scene mutations immediately without waiting for camera input.
    // Consume a queued demand frame to avoid rendering the same state twice.
    // If a frame is already executing, leave the next frame dirty instead.
    renderNow: () => {
      if (stopped || paused) return;
      if (ticking) {
        dirty = true;
        return;
      }
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      dirty = false;
      try {
        render();
      } catch (error) {
        dirty = true;
        console.error("[AURUM][VIEWER][IMMEDIATE_RENDER_ERROR] Immediate scene update failed; scheduling a safe retry.", error);
      }
      if (dirty || interactionActive || interactionEnding || idleFramesRemaining > 0 || continuousRendering) {
        requestRender();
      }
    },
    // Keep rendering every frame for time-based exports such as turntable video.
    // Always disable this in a finally block so the editor returns to demand rendering.
    setContinuousRendering: (active: boolean) => {
      continuousRendering = active;
      if (active) requestRender();
    },
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
      window.removeEventListener("resize", scheduleHostResize);
      window.removeEventListener("aurum-host-resize", scheduleHostResize);
      document.removeEventListener("fullscreenchange", scheduleHostResize);
      window.visualViewport?.removeEventListener("resize", scheduleHostResize);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onHostWake);
      window.removeEventListener("pointerdown", onHostWake, true);
      document.removeEventListener("visibilitychange", onDocumentVisibilityChange);
      if (hostResizeFrame) cancelAnimationFrame(hostResizeFrame);
      if (hostResizeSettleFrame) cancelAnimationFrame(hostResizeSettleFrame);
      hostResizeFrame = 0;
      hostResizeSettleFrame = 0;
      hostResizePassesRemaining = 0;
      canvas?.removeEventListener("webglcontextlost", onWebGLContextLost);
      canvas?.removeEventListener("webglcontextrestored", onWebGLContextRestored);
      observer.disconnect();
    },
    resize,
  };
}