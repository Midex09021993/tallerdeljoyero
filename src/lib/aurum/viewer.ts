import type { Object3D, PerspectiveCamera, Vector3 } from "three";

export interface AurumViewerFrame {
  camera: PerspectiveCamera;
  controls: { target: Vector3; update: () => void };
  lights: Record<string, any>;
  groundController: any;
  scene: any;
  renderer: any;
  lightingController?: { scaleToModel?: (radius:number,targetY:number)=>void };
}

export function frameAurumProduct(viewer: AurumViewerFrame, model: Object3D, prepare: (m:Object3D,scale?:number)=>any, applyScene:(id:any)=>void, sceneId:any) {
  const prepared=prepare(model,2.6);
  const bounds=prepared.bounds, size=prepared.size, targetY=prepared.targetY;
  viewer.groundController.positionUnderModel(bounds);
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
  const maxDimension=Math.max(size.x,size.y,size.z,0.001);
  const fovRad=(viewer.camera.fov * Math.PI) / 180;
  const fitDistance=(maxDimension * 0.50) / Math.tan(fovRad / 2);
  const framingMultiplier = sceneId === "producto" ? 1.40 : 1.08;
  const distance=Math.max(fitDistance * framingMultiplier,3.2);
  const aimY=targetY + Math.max(size.y*.035, .025);
  // Product-shot camera: use a visible but restrained downward angle so the
  // studio floor can enter the lower frame. The previous .075 lift was visually
  // too small to reveal the ground plane, so the product still read like it was
  // floating on a flat canvas. Keep the target fixed to preserve the ring framing.
  const cameraLift = sceneId === "producto" ? Math.max(size.y*.24, .12) : 0;
  viewer.camera.position.set(0, aimY + cameraLift, distance);
  viewer.controls.target.set(0,aimY,0);
  viewer.camera.lookAt(0,aimY,0);
  viewer.camera.updateProjectionMatrix();
  viewer.controls.update();
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
  render: () => void
) {
  let frame = 0;
  const resize = () => resizeAurumViewer(viewer);
  const observer = new ResizeObserver(resize);
  observer.observe(viewer.node);
  resize();
  const animate = () => {
    frame = requestAnimationFrame(animate);
    viewer.controls?.update?.();
    render();
  };
  animate();
  return {
    observer,
    get frame() { return frame; },
    stop: () => cancelAnimationFrame(frame),
    resize,
  };
}