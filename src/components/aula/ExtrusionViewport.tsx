import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type ProfileMode = "closed" | "open" | "nonplanar";
type Point2 = { x: number; y: number };
type DirectionMode = "positive" | "negative" | "symmetric";
type DisplayMode = "solid" | "wireframe" | "transparent";
type CameraView = "iso" | "top" | "front" | "side";

const initialPoints: Point2[] = [
  { x: -2.1, y: -1.25 },
  { x: -2.1, y: 1.25 },
  { x: 2.1, y: 1.25 },
  { x: 2.1, y: -1.25 },
];
const presets: Record<string, Point2[]> = {
  rectangle: initialPoints,
  shield: [{ x: -2, y: 1.5 }, { x: 2, y: 1.5 }, { x: 1.5, y: -0.8 }, { x: 0, y: -1.8 }, { x: -1.5, y: -0.8 }],
  arch: [{ x: -2, y: -1.2 }, { x: -2, y: 0.5 }, { x: -1, y: 1.6 }, { x: 1, y: 1.6 }, { x: 2, y: 0.5 }, { x: 2, y: -1.2 }],
};

function polygonArea(points: Point2[]) {
  return Math.abs(points.reduce((sum, p, i) => {
    const next = points[(i + 1) % points.length];
    return sum + p.x * next.y - next.x * p.y;
  }, 0)) / 2;
}
function perimeter(points: Point2[], closed: boolean) {
  return points.reduce((sum, p, i) => {
    if (!closed && i === points.length - 1) return sum;
    const q = points[(i + 1) % points.length];
    return sum + Math.hypot(q.x - p.x, q.y - p.y);
  }, 0);
}
function intersects(a: Point2, b: Point2, c: Point2, d: Point2) {
  const cross = (p: Point2, q: Point2, r: Point2) => (q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  const ab1 = cross(a,b,c), ab2 = cross(a,b,d), cd1 = cross(c,d,a), cd2 = cross(c,d,b);
  return ab1 * ab2 < 0 && cd1 * cd2 < 0;
}
function hasSelfIntersection(points: Point2[]) {
  const n = points.length;
  for (let i=0;i<n;i++) for (let j=i+1;j<n;j++) {
    if (Math.abs(i-j)<=1 || (i===0 && j===n-1)) continue;
    if (intersects(points[i],points[(i+1)%n],points[j],points[(j+1)%n])) return true;
  }
  return false;
}

export default function ExtrusionViewport({ profile, height, onHeightChange }: { profile: ProfileMode; height: number; onHeightChange?: (value:number)=>void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<Point2[]>(initialPoints);
  const [selected, setSelected] = useState(0);
  const [showSource, setShowSource] = useState(true);
  const [showResult, setShowResult] = useState(true);
  const [direction, setDirection] = useState<DirectionMode>("positive");
  const [display, setDisplay] = useState<DisplayMode>("solid");
  const [cameraView, setCameraView] = useState<CameraView>("iso");
  const [preset, setPreset] = useState("rectangle");

  const closed = profile !== "open";
  const area = useMemo(() => closed && profile === "closed" ? polygonArea(points) : null, [closed, profile, points]);
  const length = useMemo(() => perimeter(points, closed), [points, closed]);
  const volume = area === null ? null : area * height;
  const selfIntersecting = useMemo(() => closed && profile === "closed" && hasSelfIntersection(points), [closed, profile, points]);
  const validForSolid = profile === "closed" && !selfIntersecting && points.length >= 3;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0d141b");
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.up.set(0, 0, 1);
    if (cameraView === "top") { camera.up.set(0, 1, 0); camera.position.set(0, 0, 12); }
    else if (cameraView === "front") camera.position.set(0, -12, 0);
    else if (cameraView === "side") camera.position.set(12, 0, 0);
    else camera.position.set(7.5, -8.5, 7);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.className = "block h-full w-full touch-none";
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xdce8f5, 0x26313d, 2.1));
    const key = new THREE.DirectionalLight(0xffe2ad, 3.2);
    key.position.set(-4, -5, 9); scene.add(key);
    const fill = new THREE.DirectionalLight(0x9bbbd8, 1.1);
    fill.position.set(5, 4, 3); scene.add(fill);

    const grid = new THREE.GridHelper(14, 28, 0x526170, 0x26323e);
    grid.rotation.x = Math.PI / 2;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.34;
    scene.add(grid);
    const axes = new THREE.AxesHelper(2.3);
    axes.position.set(-3.3, -2.2, 0.02);
    scene.add(axes);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.target.set(0, 0, direction === "symmetric" ? 0 : Math.max(0, height / 20));
    controls.minDistance = 4;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI;

    const sourceGroup = new THREE.Group();
    const resultGroup = new THREE.Group();
    scene.add(sourceGroup, resultGroup);
    const sourcePoints = points.map((p, i) => new THREE.Vector3(p.x, p.y, profile === "nonplanar" ? (i % 2 === 0 ? 0.45 : -0.35) : 0));
    const distance = height / 10;
    const baseZ = direction === "negative" ? -distance : direction === "symmetric" ? -distance / 2 : 0;
    const topZ = baseZ + distance;

    if (showSource && sourcePoints.length > 1) {
      const linePoints = [...sourcePoints];
      if (closed && linePoints.length > 2) linePoints.push(linePoints[0].clone());
      sourceGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePoints), new THREE.LineBasicMaterial({ color: 0xf2d69b })));
      const pointGeometry = new THREE.SphereGeometry(0.085, 18, 12);
      sourcePoints.forEach((p, index) => {
        const handle = new THREE.Mesh(pointGeometry, new THREE.MeshStandardMaterial({ color: 0xf0d69f, emissive: 0x4b3517, roughness: 0.35, metalness: 0.15 }));
        handle.position.copy(p);
        handle.userData.pointIndex = index;
        sourceGroup.add(handle);
      });
    }

    if (showResult && height > 0 && sourcePoints.length >= 2) {
      const material = new THREE.MeshStandardMaterial({
        color: 0xb88f50, metalness: 0.28, roughness: 0.42, side: THREE.DoubleSide,
        transparent: display === "transparent", opacity: display === "transparent" ? 0.32 : 1,
        wireframe: display === "wireframe",
      });
      if (profile === "closed" && validForSolid) {
        const shape = new THREE.Shape();
        shape.moveTo(sourcePoints[0].x, sourcePoints[0].y);
        sourcePoints.slice(1).forEach(p => shape.lineTo(p.x, p.y));
        shape.closePath();
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: distance, bevelEnabled: false, curveSegments: 1, steps: 1 });
        geometry.translate(0, 0, baseZ);
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, material); resultGroup.add(mesh);
        if (display !== "wireframe") resultGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 22), new THREE.LineBasicMaterial({ color: 0xf0d69f })));
      } else {
        const vertices: number[] = [];
        const indices: number[] = [];
        const segmentCount = closed ? sourcePoints.length : sourcePoints.length - 1;
        for (let i=0;i<segmentCount;i++) {
          const p=sourcePoints[i], q=sourcePoints[(i+1)%sourcePoints.length], b=vertices.length/3;
          vertices.push(p.x,p.y,p.z+baseZ, q.x,q.y,q.z+baseZ, q.x,q.y,q.z+topZ, p.x,p.y,p.z+topZ);
          indices.push(b,b+1,b+2,b,b+2,b+3);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
        geometry.setIndex(indices); geometry.computeVertexNormals();
        resultGroup.add(new THREE.Mesh(geometry,material));
        const moved = sourcePoints.map(p=>new THREE.Vector3(p.x,p.y,p.z+topZ));
        if (closed) moved.push(moved[0].clone());
        resultGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(moved),new THREE.LineBasicMaterial({color:0x9fb2c5})));
      }
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0,0,1),0);
    const dragPoint = new THREE.Vector3();
    let activeHandle: THREE.Object3D | null = null;
    const onPointerDown = (event: PointerEvent) => {
      const rect=renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
      raycaster.setFromCamera(pointer,camera);
      const handles: THREE.Object3D[]=[];
      sourceGroup.traverse(o=>{if(o instanceof THREE.Mesh && o.userData.pointIndex !== undefined) handles.push(o);});
      const hit=raycaster.intersectObjects(handles,false)[0];
      if(!hit) return;
      activeHandle=hit.object; controls.enabled=false;
      renderer.domElement.setPointerCapture(event.pointerId);
      setSelected(Number(activeHandle.userData.pointIndex));
    };
    const onPointerMove = (event: PointerEvent) => {
      if(!activeHandle) return;
      const rect=renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
      raycaster.setFromCamera(pointer,camera);
      if(raycaster.ray.intersectPlane(dragPlane,dragPoint)) activeHandle.position.set(dragPoint.x,dragPoint.y,profile==="nonplanar"?activeHandle.position.z:0);
    };
    const onPointerUp = () => {
      if(!activeHandle) return;
      const index=Number(activeHandle.userData.pointIndex);
      const next=points.map((p,i)=>i===index?{x:Number(activeHandle!.position.x.toFixed(2)),y:Number(activeHandle!.position.y.toFixed(2))}:p);
      activeHandle=null; controls.enabled=true; setPoints(next);
    };
    renderer.domElement.addEventListener("pointerdown",onPointerDown);
    renderer.domElement.addEventListener("pointermove",onPointerMove);
    renderer.domElement.addEventListener("pointerup",onPointerUp);
    renderer.domElement.addEventListener("pointercancel",onPointerUp);

    const resize=()=>{const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    const observer=new ResizeObserver(resize); observer.observe(host); resize();
    let frame=0;
    const animate=()=>{frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}; animate();

    return ()=>{
      cancelAnimationFrame(frame); observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown",onPointerDown);
      renderer.domElement.removeEventListener("pointermove",onPointerMove);
      renderer.domElement.removeEventListener("pointerup",onPointerUp);
      renderer.domElement.removeEventListener("pointercancel",onPointerUp);
      controls.dispose();
      scene.traverse(object=>{
        if(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments){
          object.geometry.dispose();
          const materials=Array.isArray(object.material)?object.material:[object.material];
          materials.forEach(m=>m.dispose());
        }
      });
      renderer.dispose(); renderer.domElement.remove();
    };
  },[profile,height,points,showSource,showResult,direction,display,cameraView]);

  useEffect(()=>{
    const host=hostRef.current;
    const canvas=host?.querySelector("canvas");
    if(!canvas) return;
    const view=(view:CameraView)=>{
      const rendererCanvas=canvas;
      const rect=rendererCanvas.getBoundingClientRect();
      if(!rect.width||!rect.height) return;
      // Camera is recreated with the scene; changing the view is handled by the view state below.
    };
    view(cameraView);
  },[cameraView]);

  const addPoint=()=>{if(points.length>=12)return;const last=points[points.length-1];setPoints([...points,{x:Number((last.x+0.8).toFixed(2)),y:Number((last.y-0.35).toFixed(2))}]);setSelected(points.length);};
  const removePoint=()=>{if(points.length<=(profile==="closed"?3:2))return;setPoints(points.filter((_,i)=>i!==selected));setSelected(Math.max(0,Math.min(selected,points.length-2)));};
  const updatePoint=(axis:"x"|"y",value:number)=>setPoints(points.map((p,i)=>i===selected?{...p,[axis]:value}:p));
  const applyPreset=(name:string)=>{setPreset(name);setPoints(presets[name].map(p=>({...p})));setSelected(0);};

  return <div className="relative z-10 flex h-full min-h-[420px] w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0d141b]/90">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#151e27]/95 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300"><span className="font-semibold text-[#e6c887]">Perfil de entrada</span><span className="text-slate-500">{preset==="rectangle"?"Rectangular":preset==="shield"?"Escudo":"Arco"} · {profile==="open"?"abierto":"cerrado"}</span></div>
      <button type="button" onClick={()=>{setPoints(initialPoints);setSelected(0);setPreset("rectangle");}} className="rounded-md border border-white/10 px-3 py-1.5 text-[10px] text-slate-300 hover:border-[#d2ad68]/50">Restablecer forma</button>
    </div>
    <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-[#101820] px-4 py-2.5">
      <label className="flex items-center gap-2 text-[10px] text-slate-400"><span>Forma</span><select aria-label="Forma del perfil" value={preset} onChange={e=>applyPreset(e.target.value)} className="rounded-md border border-white/10 bg-[#17212b] px-3 py-2 text-[11px] text-slate-100"><option value="rectangle">Rectangular</option><option value="shield">Escudo</option><option value="arch">Arco</option></select></label>
      <span className="ml-auto text-[10px] text-slate-500">Arrastra los puntos para cambiar la forma · gira la vista con el ratón</span>
    </div>
    <div className="relative min-h-0 flex-1">
      <div ref={hostRef} className="absolute inset-0"/>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-white/10 bg-[#101820]/85 px-2.5 py-1.5 text-[9px] text-slate-400">La geometría se actualiza al soltar cada nodo</div>
      <div className="absolute right-3 top-3 rounded-md border border-white/10 bg-[#101820]/90 px-2.5 py-1.5 text-[9px] font-semibold text-[#e6c887]">{height.toFixed(1)} mm · {height===0?"Perfil sin extruir":profile==="closed"?"Sólido":profile==="open"?"Superficie abierta":"Superficie lateral sin tapas"}</div>
    </div>
    <details className="border-t border-white/10 bg-[#111a23]">
      <summary className="cursor-pointer px-4 py-3 text-[10px] font-semibold text-slate-400 hover:text-[#e6c887]">Herramientas avanzadas · edición de puntos y visualización</summary>
      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-[#151e27]/95 px-3 py-2">
      <span className="text-[10px] font-semibold text-slate-300">Punto {selected+1}</span>
      <label className="flex items-center gap-1.5 text-[10px] text-slate-400">X <input type="number" step="0.1" value={points[selected]?.x??0} onChange={e=>updatePoint("x",Number(e.target.value))} className="w-16 rounded border border-white/10 bg-[#0d141b] px-2 py-1 text-right text-slate-100"/></label>
      <label className="flex items-center gap-1.5 text-[10px] text-slate-400">Y <input type="number" step="0.1" value={points[selected]?.y??0} onChange={e=>updatePoint("y",Number(e.target.value))} className="w-16 rounded border border-white/10 bg-[#0d141b] px-2 py-1 text-right text-slate-100"/></label>
      <span className="ml-auto text-[9px] text-slate-500">Three.js · {display==="solid"?"Sólido":display==="wireframe"?"Alámbrico":"Transparente"}</span>
    </div>
    <div className="grid grid-cols-2 gap-px border-t border-white/10 bg-white/10 sm:grid-cols-4">
      <div className="bg-[#111a23] px-3 py-2"><p className="text-[9px] text-slate-500">Longitud del perfil</p><p className="text-xs font-semibold text-slate-200">{length.toFixed(2)} mm</p></div>
      <div className="bg-[#111a23] px-3 py-2"><p className="text-[9px] text-slate-500">Área del perfil</p><p className="text-xs font-semibold text-slate-200">{area===null?"—":area.toFixed(2)+" mm²"}</p></div>
      <div className="bg-[#111a23] px-3 py-2"><p className="text-[9px] text-slate-500">Volumen teórico</p><p className="text-xs font-semibold text-[#e6c887]">{volume===null?"—":volume.toFixed(2)+" mm³"}</p></div>
      <div className="bg-[#111a23] px-3 py-2"><p className="text-[9px] text-slate-500">Diagnóstico</p><p className={"text-xs font-semibold "+(selfIntersecting?"text-amber-300":validForSolid?"text-emerald-300":"text-slate-400")}>{selfIntersecting?"Autointersección":validForSolid?"Perfil apto":"Superficie abierta"}</p></div>
    </div>
    <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-[#101820] px-3 py-2">
      <label className="flex items-center gap-2 text-[10px] text-slate-400">Dirección <select value={direction} onChange={e=>setDirection(e.target.value as DirectionMode)} className="rounded-md border border-white/10 bg-[#17212b] px-2 py-1.5 text-[10px] text-slate-200"><option value="positive">Positiva +Z</option><option value="negative">Negativa −Z</option><option value="symmetric">Simétrica</option></select></label>
      <label className="flex items-center gap-2 text-[10px] text-slate-400">Visualización <select value={display} onChange={e=>setDisplay(e.target.value as DisplayMode)} className="rounded-md border border-white/10 bg-[#17212b] px-2 py-1.5 text-[10px] text-slate-200"><option value="solid">Sólido</option><option value="wireframe">Alámbrico</option><option value="transparent">Transparente</option></select></label>
      <div className="ml-auto flex gap-1">{(["iso","top","front","side"] as CameraView[]).map(v=><button key={v} type="button" onClick={()=>setCameraView(v)} className={"rounded-md border px-2 py-1.5 text-[9px] "+(cameraView===v?"border-[#d2ad68]/60 bg-[#d2ad68]/10 text-[#f0d69f]":"border-white/10 text-slate-400")}>{v==="iso"?"Iso":v==="top"?"Superior":v==="front"?"Frontal":"Lateral"}</button>)}</div>
    </div>
      <div className="px-3 py-2 text-[9px] leading-4 text-slate-500">{height===0?"Distancia 0 mm: se conserva únicamente la curva de entrada; no existe superficie ni volumen extruido.":profile==="open"?"Perfil abierto: se genera una superficie lateral sin tapas.":profile==="nonplanar"?"Perfil no plano: se generan caras laterales; no se calculan tapas planas.":selfIntersecting?"Corrige los cruces del contorno antes de considerar válido el sólido.": "El volumen es una estimación didáctica basada en el área del perfil y la distancia de extrusión."}</div>
    </details>
  </div>;
}
