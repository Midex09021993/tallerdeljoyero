import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Upload, RotateCcw, Maximize2 } from "lucide-react";

export function AurumRenderClean() {
  const hostRef=useRef<HTMLDivElement>(null);
  const sceneRef=useRef<{scene:THREE.Scene;camera:THREE.PerspectiveCamera;renderer:THREE.WebGLRenderer;controls:OrbitControls;model:THREE.Object3D|null}>(null);
  const [status,setStatus]=useState("Carga una joya 3D");
  useEffect(()=>{
    const host=hostRef.current;if(!host)return;
    const scene=new THREE.Scene(); scene.background=new THREE.Color(0x111318);
    const camera=new THREE.PerspectiveCamera(45,1,.01,1000); camera.position.set(0,0.8,4);
    const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.8;
    renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.dampingFactor=.07;
    const hemi=new THREE.HemisphereLight(0xffffff,0x222222,2.1); scene.add(hemi);
    const key=new THREE.DirectionalLight(0xffffff,3); key.position.set(3,4,5); key.castShadow=true; scene.add(key);
    const fill=new THREE.DirectionalLight(0xc9d8ff,1.2); fill.position.set(-4,2,2); scene.add(fill);
    const rim=new THREE.DirectionalLight(0xffe0b0,1.5); rim.position.set(2,3,-4); scene.add(rim);
    const groundMaterial=new THREE.MeshStandardMaterial({color:0x17191d,roughness:.82,metalness:.02});
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(30,30),groundMaterial);
    ground.rotation.x=-Math.PI/2;ground.position.y=-1.05;ground.receiveShadow=true;scene.add(ground);
    const groundBackdrop=new THREE.Mesh(
      new THREE.CircleGeometry(8,96),
      new THREE.MeshStandardMaterial({color:0x111318,roughness:.9,metalness:0})
    );
    groundBackdrop.rotation.x=-Math.PI/2;
    groundBackdrop.position.y=-1.048;
    groundBackdrop.receiveShadow=true;
    scene.add(groundBackdrop);
    const resize=()=>{const w=host.clientWidth||900,h=host.clientHeight||600;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};
    const ro=new ResizeObserver(resize);ro.observe(host);resize();
    let raf=0;const loop=()=>{raf=requestAnimationFrame(loop);controls.update();renderer.render(scene,camera)};loop();
    sceneRef.current={scene,camera,renderer,controls,model:null};
    return()=>{cancelAnimationFrame(raf);ro.disconnect();controls.dispose();renderer.dispose();host.removeChild(renderer.domElement)};
  },[]);
  const load=async(file:File)=>{if(!sceneRef.current)return;setStatus("Cargando…");
    try{
      const {GLTFLoader}=await import("three/examples/jsm/loaders/GLTFLoader.js");
      const url=URL.createObjectURL(file);const gltf=await new GLTFLoader().loadAsync(url);URL.revokeObjectURL(url);
      const {scene,camera,controls}=sceneRef.current;
      if(sceneRef.current.model)scene.remove(sceneRef.current.model);
      const model=gltf.scene;model.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){m.castShadow=true;m.receiveShadow=true}});
      const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
      model.position.sub(center);scene.add(model);sceneRef.current.model=model;
      const max=Math.max(size.x,size.y,size.z)||1;camera.position.set(0,max*.45,max*2.5);camera.near=max/1000;camera.far=max*100;camera.updateProjectionMatrix();controls.target.set(0,0,0);controls.update();setStatus(file.name);
    }catch(e){console.error(e);setStatus("No se pudo cargar el modelo")}};
  const reset=()=>{const s=sceneRef.current;if(!s)return;s.controls.reset();s.camera.position.set(0,.8,4);s.controls.target.set(0,0,0);s.controls.update()};
  return <div className="flex h-full min-h-[680px] flex-col overflow-hidden rounded-2xl bg-[#0d0f12] text-white">
    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
      <div><div className="text-sm font-semibold tracking-wide">AURUM RENDER CLEAN</div><div className="text-[10px] text-white/45">{status}</div></div>
      <div className="flex gap-2">
        <label className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"><Upload className="mr-2 inline size-3.5"/>Cargar joya<input type="file" accept=".glb,.gltf" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)load(f)}}/></label>
        <button onClick={reset} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs"><RotateCcw className="mr-2 inline size-3.5"/>Reiniciar</button>
        <button onClick={()=>hostRef.current?.requestFullscreen?.()} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs"><Maximize2 className="mr-2 inline size-3.5"/>Pantalla completa</button>
      </div>
    </div>
    <div ref={hostRef} className="min-h-0 flex-1" />
  </div>;
}