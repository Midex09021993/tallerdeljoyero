import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronDown, Download, Expand, Gem, Grid3X3, Image as ImageIcon, Maximize2, RotateCcw, SlidersHorizontal, Sparkles, Upload, X } from "lucide-react";

type MaterialId = "oro18a" | "oro18b" | "oro18r" | "plata950" | "platino";
type EscenarioId = "oscuro" | "claro" | "luxury" | "marmol" | "transparente";
type VistaId = "perspectiva" | "frontal" | "superior" | "lateral";

type MaterialConfig = { id: MaterialId; nombre: string; color: number; metalness: number; roughness: number; envMapIntensity: number; clearcoat: number };
const MATERIALES: MaterialConfig[] = [
  { id: "oro18a", nombre: "Oro 18K Amarillo", color: 0xd7ad48, metalness: 1, roughness: .17, envMapIntensity: 2.5, clearcoat: .4 },
  { id: "oro18b", nombre: "Oro 18K Blanco", color: 0xe0e3e6, metalness: 1, roughness: .13, envMapIntensity: 2.65, clearcoat: .35 },
  { id: "oro18r", nombre: "Oro 18K Rosa", color: 0xd9937e, metalness: 1, roughness: .18, envMapIntensity: 2.45, clearcoat: .4 },
  { id: "plata950", nombre: "Plata 950", color: 0xc4c9ce, metalness: 1, roughness: .15, envMapIntensity: 2.7, clearcoat: .28 },
  { id: "platino", nombre: "Platino", color: 0xb9bec3, metalness: 1, roughness: .2, envMapIntensity: 2.55, clearcoat: .25 },
];
const ESCENARIOS: { id: EscenarioId; nombre: string; clase: string }[] = [
  { id: "oscuro", nombre: "Estudio Oscuro", clase: "bg-[#090b0e]" },
  { id: "claro", nombre: "Estudio Claro", clase: "bg-[#e7e5e0]" },
  { id: "luxury", nombre: "Luxury", clase: "bg-[#21150c]" },
  { id: "marmol", nombre: "Mármol", clase: "bg-[#cfccc5]" },
  { id: "transparente", nombre: "Transparente", clase: "bg-[linear-gradient(45deg,#d9d9d9_25%,transparent_25%),linear-gradient(-45deg,#d9d9d9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#d9d9d9_75%),linear-gradient(-45deg,transparent_75%,#d9d9d9_75%)] bg-[length:14px_14px] bg-[position:0_0,0_7px,7px_-7px,-7px_0]" },
];
const VISTAS: { id: VistaId; nombre: string }[] = [
  { id: "perspectiva", nombre: "Perspectiva" }, { id: "frontal", nombre: "Frontal" }, { id: "superior", nombre: "Superior" }, { id: "lateral", nombre: "Lateral" },
];

export function AurumRender() {
  const visorRef = useRef<HTMLDivElement>(null), fileRef = useRef<HTMLInputElement>(null);
  const apiRef = useRef<any>(null);
  const [archivo, setArchivo] = useState<string|null>(null), [cargando, setCargando] = useState(false), [error, setError] = useState<string|null>(null);
  const [materialId, setMaterialId] = useState<MaterialId>("oro18a"), [escenarioId, setEscenarioId] = useState<EscenarioId>("oscuro");
  const [captura, setCaptura] = useState<string|null>(null), [vista, setVista] = useState<VistaId>("perspectiva"), [panel, setPanel] = useState<"materiales"|"escenas">("materiales");

  const materialActivo = useMemo(() => MATERIALES.find(m=>m.id===materialId)!, [materialId]);

  useEffect(() => {
    let vivo=true, cleanup=()=>{};
    (async()=>{
      const THREE=await import("three"), {OrbitControls}=await import("three/examples/jsm/controls/OrbitControls.js"), {RoomEnvironment}=await import("three/examples/jsm/environments/RoomEnvironment.js");
      const nodo=visorRef.current; if(!vivo||!nodo)return;
      const escena=new THREE.Scene(), camara=new THREE.PerspectiveCamera(38,1,.001,1000);
      const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:"high-performance"});
      renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.55; renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.domElement.className="block h-full w-full"; nodo.appendChild(renderer.domElement);
      const pmrem=new THREE.PMREMGenerator(renderer), entorno=pmrem.fromScene(new RoomEnvironment(),.04).texture; escena.environment=entorno;
      escena.add(new THREE.HemisphereLight(0xfff8e8,0x332a24,2.5));
      const key=new THREE.DirectionalLight(0xffefc8,6); key.position.set(4,6,5); key.castShadow=true; key.shadow.mapSize.set(1024,1024); escena.add(key);
      const fill=new THREE.DirectionalLight(0xdbe7ff,4); fill.position.set(-5,3,4); escena.add(fill);
      const rim=new THREE.DirectionalLight(0xffd49a,5); rim.position.set(2,4,-5); escena.add(rim);
      const top=new THREE.PointLight(0xffffff,3,30); top.position.set(0,5,1); escena.add(top);
      const controles=new OrbitControls(camara,renderer.domElement); controles.enableDamping=true; controles.dampingFactor=.07; controles.enablePan=true; controles.minDistance=.15; controles.maxDistance=100;
      let modelo:any=null, suelo:any=null;
      const material=new THREE.MeshPhysicalMaterial({color:MATERIALES[0].color,metalness:1,roughness:.17,envMapIntensity:2.5,clearcoat:.4,clearcoatRoughness:.12});
      const dispose=(o:any)=>o?.traverse((x:any)=>{if(x.geometry)x.geometry.dispose()});
      const quitar=()=>{if(modelo){escena.remove(modelo);dispose(modelo);modelo=null} if(suelo){escena.remove(suelo);suelo.geometry.dispose();suelo.material.dispose();suelo=null}};
      const aplicarMaterial=(m:MaterialConfig)=>{material.color.setHex(m.color);material.roughness=m.roughness;material.envMapIntensity=m.envMapIntensity;material.clearcoat=m.clearcoat;material.needsUpdate=true};
      const aplicarEscenario=(id:EscenarioId)=>{if(id==="transparente"){escena.background=null;renderer.setClearColor(0,0)}else{renderer.setClearColor(0,1);escena.background=new THREE.Color(({oscuro:0x090b0e,claro:0xe7e5e0,luxury:0x21150c,marmol:0xcfccc5} as any)[id])} if(suelo){suelo.visible=id!=="transparente";suelo.material.color.setHex(id==="marmol"?0xc5c2bc:id==="luxury"?0x20140b:0x15181c);suelo.material.roughness=id==="marmol"?.25:.3}};
      const encuadrar=()=>{if(!modelo)return;modelo.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(modelo),center=b.getCenter(new THREE.Vector3()),size=b.getSize(new THREE.Vector3()),max=Math.max(size.x,size.y,size.z)||1;modelo.position.set(0,0,0);modelo.scale.setScalar(2.6/max);modelo.position.sub(center);modelo.updateMatrixWorld(true);const bf=new THREE.Box3().setFromObject(modelo),h=bf.getSize(new THREE.Vector3()).y||1;if(!suelo){suelo=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshStandardMaterial({color:0x15181c,metalness:.05,roughness:.3}));suelo.rotation.x=-Math.PI/2;suelo.receiveShadow=true;escena.add(suelo)}suelo.position.y=bf.min.y-Math.max(h*.035,.015);aplicarEscenario(escenarioId);camara.position.set(3.5,2.4,4.6);controles.target.set(0,0,0);controles.update()};
      const cargar=async(file:File)=>{const ext=file.name.split(".").pop()?.toLowerCase();if(!ext||!["stl","obj","glb","fbx"].includes(ext))throw new Error("Formato no compatible. Usa STL, OBJ, GLB o FBX.");const buffer=await file.arrayBuffer();let objeto:any;if(ext==="stl"){const {STLLoader}=await import("three/examples/jsm/loaders/STLLoader.js");const geo=new STLLoader().parse(buffer);geo.computeVertexNormals();objeto=new THREE.Mesh(geo,material)}else if(ext==="obj"){const {OBJLoader}=await import("three/examples/jsm/loaders/OBJLoader.js");objeto=new OBJLoader().parse(new TextDecoder().decode(buffer))}else if(ext==="glb"){const {GLTFLoader}=await import("three/examples/jsm/loaders/GLTFLoader.js");objeto=(await new GLTFLoader().parseAsync(buffer,"")).scene}else{const {FBXLoader}=await import("three/examples/jsm/loaders/FBXLoader.js");objeto=new FBXLoader().parse(buffer,"")}quitar();objeto.traverse((x:any)=>{if(x.isMesh){x.material=material;x.castShadow=true;x.receiveShadow=true}});modelo=objeto;escena.add(modelo);aplicarMaterial(materialActivo);encuadrar()};
      const camaraVista=(id:VistaId)=>{const p:any={perspectiva:[3.5,2.4,4.6],frontal:[0,0,5],superior:[0,5,.001],lateral:[5,0,0]}[id];camara.position.set(...p);controles.target.set(0,0,0);controles.update()};
      apiRef.current={cargar,material:aplicarMaterial,escenario:aplicarEscenario,reset:encuadrar,capturar:()=>{renderer.render(escena,camara);return renderer.domElement.toDataURL("image/png")},limpiar:quitar,fullscreen:()=>nodo.requestFullscreen?.(),vista:camaraVista};
      const resize=()=>{const w=nodo.clientWidth||900,h=nodo.clientHeight||600;camara.aspect=w/h;camara.updateProjectionMatrix();renderer.setSize(w,h,false)}; resize(); const obs=new ResizeObserver(resize);obs.observe(nodo);let frame=0;const animate=()=>{frame=requestAnimationFrame(animate);controles.update();renderer.render(escena,camara)};animate();
      cleanup=()=>{cancelAnimationFrame(frame);obs.disconnect();quitar();controles.dispose();material.dispose();entorno.dispose();pmrem.dispose();renderer.dispose();renderer.domElement.remove();apiRef.current=null};
    })().catch(e=>vivo&&setError(e?.message||"No se pudo iniciar AURUM RENDER"));
    return()=>{vivo=false;cleanup()};
  },[]);
  useEffect(()=>apiRef.current?.material(materialActivo),[materialActivo]);
  useEffect(()=>apiRef.current?.escenario(escenarioId),[escenarioId]);
  useEffect(()=>apiRef.current?.vista(vista),[vista]);

  const cargarArchivo=useCallback(async(file:File)=>{setCargando(true);setError(null);try{await apiRef.current?.cargar(file);setArchivo(file.name);setCaptura(null)}catch(e){setError(e instanceof Error?e.message:"No se pudo cargar el modelo");setArchivo(null)}finally{setCargando(false)}},[]);
  const limpiar=()=>{apiRef.current?.limpiar();setArchivo(null);setCaptura(null);if(fileRef.current)fileRef.current.value=""};
  const captura=()=>{const d=apiRef.current?.capturar();if(d)setCaptura(d)};

  return <div className="space-y-4">
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-ink px-5 py-4 text-ink-foreground sm:px-7">
        <div className="flex items-center gap-3"><Gem className="size-5 text-gold"/><div><div className="font-display text-2xl italic text-gold">AURUM RENDER</div><div className="text-[10px] uppercase tracking-[.22em] text-ink-foreground/45">Jewelry 3D Studio · Fase 1</div></div></div>
        <button type="button" onClick={()=>fileRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 text-xs font-semibold text-gold hover:bg-gold/15"><Upload className="size-4"/> {archivo?"Cambiar modelo":"Cargar modelo"}</button>
        <input ref={fileRef} type="file" accept=".stl,.obj,.glb,.fbx" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)void cargarArchivo(f)}}/>
      </header>
      <div className="relative bg-[#090b0e]">
        <div ref={visorRef} className="relative min-h-[560px] lg:min-h-[720px]">
          {!archivo&&!cargando&&<div className="pointer-events-none absolute inset-0 z-10 grid place-items-center p-8 text-center"><div><div className="mx-auto grid size-20 place-items-center rounded-3xl border border-gold/20 bg-gold/10 text-gold"><Upload className="size-8"/></div><h2 className="mt-5 text-xl font-semibold text-white">Arrastra tu modelo 3D aquí</h2><p className="mt-2 text-sm text-white/45">STL · OBJ · GLB · FBX</p></div></div>}
          {cargando&&<div className="absolute inset-0 z-30 grid place-items-center bg-black/35 backdrop-blur-sm"><div className="rounded-2xl border border-white/10 bg-black/60 px-6 py-4 text-sm text-white/80">Procesando modelo…</div></div>}
          {error&&<div className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-red-400/20 bg-red-950/70 px-4 py-2 text-xs text-red-200">{error}</div>}
          {archivo&&<div className="absolute left-5 top-5 z-20 max-w-[55%] truncate rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-xs text-white/65 backdrop-blur">{archivo}</div>}
          <div className="absolute right-5 top-5 z-20 flex gap-2">
            <button type="button" title="Auto centrar" onClick={()=>apiRef.current?.reset()} className="grid size-10 place-items-center rounded-full border border-white/10 bg-black/45 text-white/75 backdrop-blur hover:text-gold"><Maximize2 className="size-4"/></button>
            <button type="button" title="Pantalla completa" onClick={()=>apiRef.current?.fullscreen()} className="grid size-10 place-items-center rounded-full border border-white/10 bg-black/45 text-white/75 backdrop-blur hover:text-gold"><Expand className="size-4"/></button>
            {archivo&&<button type="button" title="Quitar modelo" onClick={limpiar} className="grid size-10 place-items-center rounded-full border border-white/10 bg-black/45 text-white/75 backdrop-blur hover:text-gold"><X className="size-4"/></button>}
          </div>
          {archivo&&<div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-1 rounded-2xl border border-white/10 bg-black/55 p-1 backdrop-blur">
            {VISTAS.map(v=><button key={v.id} type="button" onClick={()=>setVista(v.id)} className={"rounded-xl px-3 py-2 text-[10px] uppercase tracking-wider transition "+(vista===v.id?"bg-gold text-black":"text-white/55 hover:text-white")}>{v.nombre}</button>)}
          </div>}
          <div className="absolute bottom-5 left-5 z-20 hidden rounded-full border border-white/10 bg-black/45 px-3 py-2 text-[9px] uppercase tracking-[.16em] text-white/40 backdrop-blur md:block">Rotar · Zoom · Pan</div>
        </div>
      </div>
      <div className="grid border-t border-border lg:grid-cols-[1fr_auto]">
        <div className="flex overflow-x-auto">
          <button type="button" onClick={()=>setPanel("materiales")} className={"flex items-center gap-2 border-r border-border px-5 py-4 text-xs font-semibold "+(panel==="materiales"?"text-gold":"text-muted-foreground")}><Sparkles className="size-4"/> Materiales</button>
          <button type="button" onClick={()=>setPanel("escenas")} className={"flex items-center gap-2 border-r border-border px-5 py-4 text-xs font-semibold "+(panel==="escenas"?"text-gold":"text-muted-foreground")}><ImageIcon className="size-4"/> Escenarios</button>
          <button type="button" onClick={()=>apiRef.current?.reset()} className="flex items-center gap-2 px-5 py-4 text-xs font-semibold text-muted-foreground hover:text-foreground"><RotateCcw className="size-4"/> Reset</button>
        </div>
        <div className="flex items-center gap-2 p-2 sm:p-3">
          <button type="button" onClick={captura} className="inline-flex h-10 items-center gap-2 rounded-xl border border-input px-3 text-xs font-semibold hover:border-gold"><Camera className="size-4"/> Capturar</button>
          {captura&&<button type="button" onClick={()=>{const a=document.createElement("a");a.href=captura;a.download="aurum-render-"+Date.now()+".png";a.click()}} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground"><Download className="size-4"/> Descargar PNG</button>}
        </div>
      </div>
      <div className="border-t border-border bg-background p-5 sm:p-6">
        {panel==="materiales"?<div><div className="mb-4 flex items-center justify-between"><div><p className="text-sm font-semibold">Materiales PBR</p><p className="text-[11px] text-muted-foreground">Acabados premium para presentación de joyería</p></div><SlidersHorizontal className="size-4 text-muted-foreground"/></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{MATERIALES.map(m=><button key={m.id} type="button" onClick={()=>setMaterialId(m.id)} className={"group rounded-2xl border p-3 text-left transition "+(materialId===m.id?"border-gold bg-accent":"border-input hover:border-gold/50")}><span className="mx-auto block size-10 rounded-full border border-black/10 shadow-inner" style={{background:"#"+m.color.toString(16).padStart(6,"0")}}/><span className="mt-2 block text-center text-[11px] font-semibold leading-tight">{m.nombre}</span></button>)}</div></div>
        :<div><div className="mb-4"><p className="text-sm font-semibold">Escenarios de presentación</p><p className="text-[11px] text-muted-foreground">Ambientes para mostrar la pieza en distintos contextos comerciales</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{ESCENARIOS.map(e=><button key={e.id} type="button" onClick={()=>setEscenarioId(e.id)} className={"overflow-hidden rounded-2xl border text-left transition "+(escenarioId===e.id?"border-gold ring-1 ring-gold":"border-input hover:border-gold/50")}><div className={"h-16 "+e.clase}/><div className="flex items-center justify-between p-3 text-[11px] font-semibold">{e.nombre}<ChevronDown className="size-3 text-muted-foreground"/></div></button>)}</div></div>}
      </div>
    </section>
    <div className="flex items-center gap-2 px-1 text-[10px] text-muted-foreground"><Grid3X3 className="size-3.5"/> Procesamiento local en navegador · Sin costos, precios ni cotizaciones en Fase 1</div>
  </div>;
}