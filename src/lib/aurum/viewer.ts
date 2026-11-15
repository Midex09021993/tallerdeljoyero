import * as THREE from "three";
import type { Object3D, PerspectiveCamera, Vector3 } from "three";
import { applyAurumCameraView, applyAurumIJEWELPresentationCamera, applyAurumPublicViewerCamera } from "./camera";

export interface AurumViewerFrame {
  camera: PerspectiveCamera;
  controls: { target: Vector3; update: () => void };
  lights: Record<string, any>;
  groundController: any;
  scene: any;
  renderer: any;
  lightingController?: { scaleToModel?: (radius:number,targetY:number)=>void };
}

export function frameAurumProduct(viewer: AurumViewerFrame, model: Object3D, prepare: (m:Object3D,scale?:number)=>any, applyScene:(id:any)=>void, sceneId:any, category:string="Anillo", presentationMode:"aurum"|"publicViewer"="aurum", allowPan = false) {
  // Primera llamada: preparar producto y presentar frontalmente.
  // Siguientes llamadas: "Restablecer vista" solo cambia la cámara para no
  // reaplicar escena/materiales y provocar cambios de color.
  const wasPrepared = !!model.userData?.["aurumInitialFrameApplied"];

  if (presentationMode === "publicViewer") {
    if (!wasPrepared) {
      model.updateWorldMatrix(true, true);
      const visibleBounds = new THREE.Box3();
      model.traverse((object: any) => {
        if (!object?.isMesh || !object.geometry || !object.visible || object.userData?.aurumPublicContactShadow) return;
        for (let parent = object.parent; parent; parent = parent.parent) if (!parent.visible) return;
        visibleBounds.expandByObject(object);
      });
      if (visibleBounds.isEmpty()) throw new Error("El modelo no contiene geometría visible para encuadrar.");
      const sourceCenter = visibleBounds.getCenter(new THREE.Vector3());
      model.position.sub(sourceCenter);
      model.updateWorldMatrix(true, true);
      const centeredBounds = new THREE.Box3();
      model.traverse((object: any) => {
        if (!object?.isMesh || !object.geometry || !object.visible) return;
        for (let parent = object.parent; parent; parent = parent.parent) if (!parent.visible) return;
        centeredBounds.expandByObject(object);
      });
      // In public-viewer presentation the early return below bypasses the standard framing path.
      // Position the studio floor from the actual centered model bounds before exposing its toggle.
      viewer.groundController?.positionUnderModel?.(centeredBounds);
      const visibleSphere = centeredBounds.getBoundingSphere(new THREE.Sphere());
      const radius = Math.max(visibleSphere.radius, 0.001);
      // Exact lightweight contact shadow used by PublicCatalogViewer.
      if (typeof document !== "undefined" && viewer.scene) {
        const shadowCanvas = document.createElement("canvas");
        shadowCanvas.width = 256;
        shadowCanvas.height = 256;
        const context = shadowCanvas.getContext("2d");
        if (context) {
          const gradient = context.createRadialGradient(128, 128, 8, 128, 128, 124);
          gradient.addColorStop(0, "rgba(35, 31, 25, 0.22)");
          gradient.addColorStop(0.42, "rgba(45, 40, 34, 0.13)");
          gradient.addColorStop(0.76, "rgba(55, 50, 44, 0.045)");
          gradient.addColorStop(1, "rgba(55, 50, 44, 0)");
          context.fillStyle = gradient;
          context.fillRect(0, 0, 256, 256);
          const texture = new THREE.CanvasTexture(shadowCanvas);
          const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.78, depthWrite: false, toneMapped: false });
          const geometry = new THREE.PlaneGeometry(radius * 3, radius * 2);
          const shadow = new THREE.Mesh(geometry, material);
          shadow.rotation.x = -Math.PI / 2;
          shadow.position.set(visibleSphere.center.x, centeredBounds.min.y - radius * 0.014, visibleSphere.center.z);
          shadow.renderOrder = 1;
          shadow.userData["aurumPublicContactShadow"] = true;
          viewer.scene.add(shadow);
          model.userData = { ...(model.userData ?? {}), aurumPublicContactShadow: shadow };
        }
      }
      model.userData = { ...(model.userData ?? {}), aurumInitialFrameApplied: true, aurumPublicViewerPresentation: true };
    }
    applyAurumPublicViewerCamera(viewer.camera, viewer.controls, model, { enablePan: allowPan });
    return;
  }

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
    if (sceneId === "ijewelReference") applyAurumIJEWELPresentationCamera(viewer.camera, viewer.controls, model); else applyAurumCameraView(viewer.camera, viewer.controls, model, "frontal", category, 0.43092);

    // AurumRender actualiza el estado de vista al cargar. Ese estado puede
    // intentar aplicar "perspectiva" inmediatamente después del encuadre.
    // Reafirmamos el frontal en el siguiente frame, sin tocar materiales ni escena.
    requestAnimationFrame(() => {
      if (model.userData?.["aurumInitialFrameApplied"]) {
        if (sceneId === "ijewelReference") applyAurumIJEWELPresentationCamera(viewer.camera, viewer.controls, model); else applyAurumCameraView(viewer.camera, viewer.controls, model, "frontal", category, 0.43092);
      }
    });
    return;
  }

  // Restablecer siempre a una vista frontal con encuadre calculado
  // según el tamaño real del modelo. Evita que la cámara fija de referencia
  // vuelva a acercarse demasiado en archivos 3DM con otras unidades.
  applyAurumCameraView(viewer.camera, viewer.controls, model, "frontal", category, 0.43092);
}


export function resizeAurumViewer(viewer: {
  node: HTMLElement;
  camera: PerspectiveCamera;
  renderer: any;
  composer?: any;
  ssaoPass?: any;
}, forceSurfaceSync = false) {
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
  // A native host can blank/rebind the WebView2 composition surface while
  // keeping the canvas attributes unchanged. On an explicit host wake, force
  // Three.js to reassert the drawing buffer and post-processing targets.
  const sizeChanged = forceSurfaceSync || logicalSizeChanged || bufferSizeChanged;
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
    // SSAOPass belongs to EffectComposer; composer.setSize() resizes every pass.
    // Calling ssaoPass.setSize() again reallocates its targets redundantly.
    viewer.composer?.setSize?.(w, h);
  }
  // A host resize can happen while demand rendering is idle. Return true for
  // either a buffer or projection change so the caller always schedules the
  // first frame against the final viewport dimensions.
  return sizeChanged || aspectChanged;
}

const disposedAurumViewerRenderers = new WeakSet<object>();

/**
 * Tears down one viewer exactly once.
 *
 * Cleanup is best-effort: a failing controller must not prevent the renderer,
 * composer, or remaining owners from being released. Gem environments are
 * released before the metal environment because they are derived through its
 * PMREM generator.
 */
export function disposeAurumViewer(viewer: {
  node: any;
  renderer: any;
  controls?: any;
  observer?: { disconnect: () => void };
  loop?: { stop?: () => void };
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
  const renderer = viewer.renderer;
  if (renderer && (typeof renderer === "object" || typeof renderer === "function")) {
    if (disposedAurumViewerRenderers.has(renderer)) return;
    // Mark before invoking external callbacks to make re-entrant cleanup safe.
    disposedAurumViewerRenderers.add(renderer);
  }

  const failures: unknown[] = [];
  const attempt = (cleanup: (() => void) | undefined) => {
    if (!cleanup) return;
    try {
      cleanup();
    } catch (error) {
      failures.push(error);
    }
  };

  // Stop RAF and global listeners before destroying anything they can access.
  attempt(() => viewer.loop?.stop?.());
  attempt(() => viewer.observer?.disconnect());
  attempt(() => {
    if (viewer.clickHandler) renderer?.domElement?.removeEventListener("click", viewer.clickHandler);
  });
  attempt(() => viewer.controls?.dispose?.());
  attempt(() => viewer.clearSelection?.());
  attempt(() => viewer.lightingController?.dispose?.());
  attempt(() => viewer.groundController?.dispose?.());
  attempt(() => viewer.hdriGroundTexture?.dispose?.());
  // Gem PMREM textures depend on the environment controller's PMREM generator.
  attempt(() => viewer.gemEnvironmentController?.dispose?.());
  attempt(() => viewer.environmentController?.dispose?.());
  attempt(() => viewer.composer?.dispose?.());
  attempt(() => renderer?.renderLists?.dispose?.());
  attempt(() => renderer?.dispose?.());
  attempt(() => {
    if (renderer?.domElement?.parentElement === viewer.node) {
      viewer.node.removeChild(renderer.domElement);
    }
  });

  if (failures.length) {
    throw new AggregateError(failures, "AURUM viewer cleanup completed with one or more errors.");
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
  // The browser context menu can interrupt a right-button drag before the
  // pan gesture completes. Suppress it only on the WebGL canvas.
  const preventCanvasContextMenu = (event: MouseEvent) => event.preventDefault();
  renderer.domElement.addEventListener("contextmenu", preventCanvasContextMenu);
  if (controls) {
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = true;
    controls.enableRotate = true;
    // Explicit AURUM CAMERA mouse contract: left=orbit, right=pan, middle=dolly.
    // OrbitControls keeps wheel zoom enabled independently of mouse button mapping.
    if (THREE.MOUSE && controls.mouseButtons) {
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };
    }
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.65;
    controls.minDistance = 0.15;
    controls.maxDistance = options.maxDistance ?? 100;
  }

  nodo.appendChild(renderer.domElement);
  return { scene, camera, renderer, controls, disposeCanvasContextMenu: () => {
    renderer.domElement.removeEventListener("contextmenu", preventCanvasContextMenu);
  } };
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
  // A transient GPU/compositor exception must not permanently wedge the
  // demand-driven loop. Retry a small, bounded number of times with backoff;
  // a later host wake or explicit user invalidation can always start fresh.
  let frameRetryTimer: number | null = null;
  let frameRetryAttempts = 0;
  const maxFrameRetryAttempts = 3;
  const progressiveFrames = Math.max(0, Math.min(32, Math.floor(interaction?.progressiveFrames ?? 32)));

  const clearFrameRetry = (resetAttempts = false) => {
    if (frameRetryTimer !== null) {
      window.clearTimeout(frameRetryTimer);
      frameRetryTimer = null;
    }
    if (resetAttempts) frameRetryAttempts = 0;
  };

  const requestRender = (resetRecovery = true) => {
    if (resetRecovery) clearFrameRetry(true);
    dirty = true;
    if (!frame && !ticking && !stopped && !paused) frame = requestAnimationFrame(tick);
  };

  const scheduleFrameRetry = (error: unknown) => {
    if (stopped || paused || frameRetryTimer !== null) return;
    if (frameRetryAttempts >= maxFrameRetryAttempts) {
      dirty = false;
      console.error("[AURUM][VIEWER][FRAME_RECOVERY_EXHAUSTED] Automatic retries stopped after repeated frame failures. A host wake or user action can retry safely.", {
        attempts: frameRetryAttempts,
        canvas: canvas ? { width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight } : null,
        contextLost: Boolean(canvas && viewer.renderer?.getContext?.()?.isContextLost?.()),
      });
      return;
    }
    const delays = [120, 360, 900];
    const delay = delays[Math.min(frameRetryAttempts, delays.length - 1)];
    frameRetryAttempts += 1;
    dirty = true;
    console.warn("[AURUM][VIEWER][FRAME_RECOVERY_SCHEDULED] Retrying a failed frame with bounded backoff.", {
      attempt: frameRetryAttempts,
      maxAttempts: maxFrameRetryAttempts,
      retryInMs: delay,
      error,
    });
    frameRetryTimer = window.setTimeout(() => {
      frameRetryTimer = null;
      if (stopped || paused) return;
      const contextLost = Boolean(canvas && viewer.renderer?.getContext?.()?.isContextLost?.());
      if (contextLost) {
        paused = true;
        dirty = true;
        console.warn("[AURUM][VIEWER][FRAME_RECOVERY_WAITING_FOR_CONTEXT] WebGL context is still lost; waiting for webglcontextrestored.");
        return;
      }
      requestRender(false);
    }, delay);
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
  // A pointer press is common during orbit and must not trigger an expensive
  // forced WebGL/post-target resize. Arm the fallback only after the host
  // actually leaves the foreground or the WebGL context is lost.
  let hostSurfaceSyncPending = false;
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
  // A host can restore the native/WebGL surface without delivering the
  // matching webglcontextrestored event to this canvas. In that case the
  // context is usable again but the demand loop remains paused forever.
  // Recover only when the existing context confirms it is no longer lost;
  // never recreate the renderer, scene, materials, or post-processing chain.
  const wakeFromHost = () => {
    if (stopped) return;
    const context = viewer.renderer?.getContext?.();
    if (context?.isContextLost?.()) {
      console.warn("[AURUM][VIEWER][HOST_WAKE_CONTEXT_STILL_LOST] Waiting for WebGL restoration before resuming.", {
        visibility: document.visibilityState,
      });
      return;
    }

    // WebView2 may lose/rebind its composition surface without reporting a
    // WebGL context-loss event. In that case paused remains false, so the old
    // recovery path only queued a frame while Three.js could retain stale GL
    // state and a stale default framebuffer. Reassert the existing context,
    // drawing buffer and post targets on every native host wake.
    try {
      viewer.renderer?.setRenderTarget?.(null);
      viewer.renderer?.resetState?.();
      resizeAurumViewer(viewer, true);
      viewer.renderer?.resetState?.();
      clearFrameRetry(true);
      const wasPaused = paused;
      hostSurfaceSyncPending = false;
      paused = false;
      dirty = true;
      console.info("[AURUM][VIEWER][HOST_WAKE_SURFACE_SYNC] Re-synchronized the existing WebGL surface and post-processing targets.", {
        recoveredPausedLoop: wasPaused,
        canvas: canvas ? { width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight } : null,
        visibility: document.visibilityState,
      });
    } catch (error) {
      console.error("[AURUM][VIEWER][HOST_WAKE_RECOVERY_ERROR] Could not re-synchronize the existing WebGL renderer.", error);
      return;
    }
    requestRender();
  };
  const onDocumentVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      hostSurfaceSyncPending = true;
      return;
    }
    wakeFromHost();
    scheduleHostResize();
  };
  const onPageShow = () => {
    wakeFromHost();
    scheduleHostResize();
  };
  // Focus/restore is a real host transition and warrants a full surface sync.
  const onHostWake = () => {
    wakeFromHost();
    scheduleHostResize();
  };
  const onHostBlur = () => {
    hostSurfaceSyncPending = true;
  };
  // Pointer input is only a fallback when a preceding blur/visibility loss
  // armed recovery. Normal orbit clicks must never reallocate composer targets.
  const onPointerWake = () => {
    if (!hostSurfaceSyncPending && !paused) return;
    wakeFromHost();
    scheduleHostResize();
  };
  window.addEventListener("resize", scheduleHostResize, { passive: true });
  window.addEventListener("aurum-host-resize", scheduleHostResize);
  document.addEventListener("fullscreenchange", scheduleHostResize);
  window.visualViewport?.addEventListener("resize", scheduleHostResize, { passive: true });
  window.addEventListener("pageshow", onPageShow);
  window.addEventListener("focus", onHostWake);
  window.addEventListener("blur", onHostBlur);
  window.addEventListener("pointerdown", onPointerWake, true);
  document.addEventListener("visibilitychange", onDocumentVisibilityChange);

  const canvas = viewer.renderer?.domElement as HTMLCanvasElement | undefined;
  const onWebGLContextLost = (event: Event) => {
    event.preventDefault();
    paused = true;
    hostSurfaceSyncPending = true;
    clearFrameRetry(true);
    if (frame) cancelAnimationFrame(frame);
    if (hostResizeFrame) cancelAnimationFrame(hostResizeFrame);
    if (hostResizeSettleFrame) cancelAnimationFrame(hostResizeSettleFrame);
    frame = 0;
    hostResizeFrame = 0;
    hostResizeSettleFrame = 0;
    hostResizePassesRemaining = 0;
    dirty = true;
    console.error("[AURUM][VIEWER][WEBGL_CONTEXT_LOST] Rendering paused while the browser restores the GPU context.", {
      canvas: canvas ? { width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight } : null,
      visibility: document.visibilityState,
    });
  };
  const onWebGLContextRestored = () => {
    if (stopped) return;
    try {
      clearFrameRetry(true);
      paused = true;
      wakeFromHost();
      console.info("[AURUM][VIEWER][WEBGL_CONTEXT_RESTORED] Viewer render loop resumed without rebuilding the scene.", {
        canvas: canvas ? { width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight } : null,
      });
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
        frameRetryAttempts = 0;
        if (!interactionActive && !interactionEnding && idleFramesRemaining > 0) idleFramesRemaining--;
      }
    } catch (error) {
      // Recover transient GPU/compositor failures without entering an endless
      // RAF loop. Keep the scene intact and retry only a bounded number of times.
      interactionActive = false;
      interactionEnding = false;
      idleFramesRemaining = 0;
      continuousRendering = false;
      console.error("[AURUM][VIEWER][FRAME_ERROR] Render loop hit an exception; scheduling bounded recovery.", error);
      scheduleFrameRetry(error);
    } finally {
      ticking = false;
      if (!stopped && !paused && frameRetryTimer === null && !frame && (dirty || changedByControls || interactionActive || interactionEnding || idleFramesRemaining > 0 || continuousRendering)) {
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
        frameRetryAttempts = 0;
      } catch (error) {
        dirty = true;
        console.error("[AURUM][VIEWER][IMMEDIATE_RENDER_ERROR] Immediate scene update failed; scheduling bounded recovery.", error);
        scheduleFrameRetry(error);
      }
      if (frameRetryTimer === null && (dirty || interactionActive || interactionEnding || idleFramesRemaining > 0 || continuousRendering)) {
        requestRender(false);
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
      clearFrameRetry(true);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    },
    resume: () => {
      if (stopped) return;
      clearFrameRetry(true);
      paused = false;
      requestRender();
    },
    stop: () => {
      stopped = true;
      clearFrameRetry(true);
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
      window.removeEventListener("blur", onHostBlur);
      window.removeEventListener("pointerdown", onPointerWake, true);
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