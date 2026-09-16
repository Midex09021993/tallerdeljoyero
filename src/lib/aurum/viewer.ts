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
  const visualRadius=Math.max(size.length()*.5,1.3);
  const distance=Math.max(visualRadius*1.55,3.15);
  viewer.camera.position.set(distance*.72,distance*.40,distance);
  viewer.controls.target.set(0,targetY,0);
  viewer.camera.lookAt(0,targetY,0);
  viewer.camera.updateProjectionMatrix();
  viewer.controls.update();
}


export function resizeAurumViewer(viewer: {
  node: { clientWidth: number; clientHeight: number };
  camera: any;
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
  // Detener primero los observadores y listeners antes de liberar WebGL.
  viewer.observer?.disconnect();
  if (viewer.clickHandler) viewer.renderer?.domElement?.removeEventListener("click", viewer.clickHandler);
  viewer.controls?.dispose?.();
  viewer.lightingController?.dispose?.();
  viewer.groundController?.dispose?.();
  viewer.clearSelection?.();
  viewer.hdriGroundTexture?.dispose?.();
  viewer.environmentController?.dispose?.();
  viewer.gemEnvironmentController?.dispose?.(viewer.gemEnvironment);
  viewer.composer?.dispose?.();
  viewer.renderer?.renderLists?.dispose?.();
  viewer.renderer?.dispose?.();
  if (viewer.renderer?.domElement?.parentElement === viewer.node) {
    viewer.node.removeChild(viewer.renderer.domElement);
  }
}
