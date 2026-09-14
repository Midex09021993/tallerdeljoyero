import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronDown, Download, Expand, Gem, Grid3X3, Image as ImageIcon, Maximize2, RotateCcw, SlidersHorizontal, Sparkles, Upload, X } from "lucide-react";

type MaterialId =
  | "oro18a_pulido" | "oro18a_satinado" | "oro18a_mate" | "oro18a_cepillado"
  | "oro18b_rodinado" | "oro18b_pulido" | "oro18b_mate"
  | "oro18r_pulido" | "oro18r_satinado" | "oro18r_mate"
  | "plata925_pulida" | "plata950_pulida" | "plata970_pulida" | "plata_envejecida"
  | "platino_pulido" | "platino_mate";
type GemaId = "diamante" | "zafiro" | "rubi" | "esmeralda" | "moissanita" | "citrino" | "amatista" | "topacio";
type AssetId = MaterialId | GemaId;
type MaterialGrupo = "Oro Amarillo" | "Oro Blanco" | "Oro Rosa" | "Plata" | "Platino";
type EscenarioId = "oscuro" | "claro" | "luxury" | "marmol" | "transparente";
type VistaId = "perspectiva" | "frontal" | "superior" | "lateral";
type IluminacionId = "studioSoft" | "studioHard" | "jewelry" | "luxury";
type AssetConfig = { id: AssetId; grupo: "Metal" | "Gema"; categoria: string; nombre: string; color: number; metalness: number; roughness: number; envMapIntensity: number; clearcoat: number; transmission?: number; ior?: number; thickness?: number; };
const MATERIALES: AssetConfig[] = [
  { id: "oro18a_pulido", grupo: "Metal", categoria: "Oro Amarillo", nombre: "Pulido", color: 0xd7ad48, metalness: 1, roughness: .12, envMapIntensity: 2.8, clearcoat: .55 },
  { id: "oro18a_satinado", grupo: "Metal", categoria: "Oro Amarillo", nombre: "Satinado", color: 0xd2aa55, metalness: 1, roughness: .28, envMapIntensity: 2.35, clearcoat: .25 },
  { id: "oro18a_mate", grupo: "Metal", categoria: "Oro Amarillo", nombre: "Mate", color: 0xc7a45a, metalness: 1, roughness: .52, envMapIntensity: 1.8, clearcoat: .08 },
  { id: "oro18a_cepillado", grupo: "Metal", categoria: "Oro Amarillo", nombre: "Cepillado", color: 0xcfa94e, metalness: 1, roughness: .38, envMapIntensity: 2.15, clearcoat: .12 },
  { id: "oro18b_rodinado", grupo: "Metal", categoria: "Oro Blanco", nombre: "Rodinado", color: 0xe9edf2, metalness: 1, roughness: .09, envMapIntensity: 3, clearcoat: .6 },
  { id: "oro18b_pulido", grupo: "Metal", categoria: "Oro Blanco", nombre: "Pulido", color: 0xdfe3e8, metalness: 1, roughness: .13, envMapIntensity: 2.7, clearcoat: .45 },
  { id: "oro18b_mate", grupo: "Metal", categoria: "Oro Blanco", nombre: "Mate", color: 0xcbd0d5, metalness: 1, roughness: .5, envMapIntensity: 1.75, clearcoat: .08 },
  { id: "oro18r_pulido", grupo: "Metal", categoria: "Oro Rosa", nombre: "Pulido", color: 0xd9937e, metalness: 1, roughness: .12, envMapIntensity: 2.75, clearcoat: .5 },
  { id: "oro18r_satinado", grupo: "Metal", categoria: "Oro Rosa", nombre: "Satinado", color: 0xd58f7b, metalness: 1, roughness: .29, envMapIntensity: 2.3, clearcoat: .25 },
  { id: "oro18r_mate", grupo: "Metal", categoria: "Oro Rosa", nombre: "Mate", color: 0xc98573, metalness: 1, roughness: .5, envMapIntensity: 1.8, clearcoat: .08 },
  { id: "plata925_pulida", grupo: "Metal", categoria: "Plata", nombre: "Plata 925 Pulida", color: 0xd7dbe0, metalness: 1, roughness: .1, envMapIntensity: 2.9, clearcoat: .45 },
  { id: "plata950_pulida", grupo: "Metal", categoria: "Plata", nombre: "Plata 950 Pulida", color: 0xcfd4d9, metalness: 1, roughness: .12, envMapIntensity: 2.8, clearcoat: .4 },
  { id: "plata970_pulida", grupo: "Metal", categoria: "Plata", nombre: "Plata 970 Pulida", color: 0xe0e3e6, metalness: 1, roughness: .1, envMapIntensity: 2.9, clearcoat: .45 },
  { id: "plata_envejecida", grupo: "Metal", categoria: "Plata", nombre: "Plata Envejecida", color: 0x777c82, metalness: .92, roughness: .4, envMapIntensity: 1.65, clearcoat: .08 },
  { id: "platino_pulido", grupo: "Metal", categoria: "Platino", nombre: "Pulido", color: 0xc5cbd0, metalness: 1, roughness: .1, envMapIntensity: 2.85, clearcoat: .48 },
  { id: "platino_mate", grupo: "Metal", categoria: "Platino", nombre: "Mate", color: 0xaeb4ba, metalness: 1, roughness: .48, envMapIntensity: 1.8, clearcoat: .08 },
  { id: "diamante", grupo: "Gema", categoria: "Gemas", nombre: "Diamante", color: 0xe9f5ff, metalness: 0, roughness: .06, envMapIntensity: 3.5, clearcoat: 1, transmission: .95, ior: 2.42, thickness: .8 },
  { id: "zafiro", grupo: "Gema", categoria: "Gemas", nombre: "Zafiro", color: 0x1855b8, metalness: 0, roughness: .07, envMapIntensity: 3.2, clearcoat: 1, transmission: .9, ior: 1.77, thickness: .9 },
  { id: "rubi", grupo: "Gema", categoria: "Gemas", nombre: "Rubí", color: 0xa8172d, metalness: 0, roughness: .08, envMapIntensity: 3.1, clearcoat: 1, transmission: .88, ior: 1.77, thickness: .9 },
  { id: "esmeralda", grupo: "Gema", categoria: "Gemas", nombre: "Esmeralda", color: 0x0b8f61, metalness: 0, roughness: .08, envMapIntensity: 3.1, clearcoat: 1, transmission: .9, ior: 1.57, thickness: .9 },
  { id: "moissanita", grupo: "Gema", categoria: "Gemas", nombre: "Moissanita", color: 0xe9fbff, metalness: 0, roughness: .045, envMapIntensity: 3.8, clearcoat: 1, transmission: .96, ior: 2.65, thickness: .75 },
  { id: "citrino", grupo: "Gema", categoria: "Gemas", nombre: "Citrino", color: 0xd9a51e, metalness: 0, roughness: .09, envMapIntensity: 2.9, clearcoat: 1, transmission: .9, ior: 1.54, thickness: .9 },
  { id: "amatista", grupo: "Gema", categoria: "Gemas", nombre: "Amatista", color: 0x8051b8, metalness: 0, roughness: .08, envMapIntensity: 3, clearcoat: 1, transmission: .9, ior: 1.54, thickness: .9 },
  { id: "topacio", grupo: "Gema", categoria: "Gemas", nombre: "Topacio", color: 0x8ed8ee, metalness: 0, roughness: .07, envMapIntensity: 3.2, clearcoat: 1, transmission: .93, ior: 1.63, thickness: .85 },
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
const ILUMINACIONES: { id: IluminacionId; nombre: string; descripcion: string }[] = [
  { id: "studioSoft", nombre: "Studio Soft", descripcion: "Suave" },
  { id: "studioHard", nombre: "Studio Hard", descripcion: "Contraste" },
  { id: "jewelry", nombre: "Jewelry", descripcion: "Detalle" },
  { id: "luxury", nombre: "Luxury", descripcion: "Dramática" },
];

export function AurumRender() {
  const visorRef = useRef<HTMLDivElement>(null), fileRef = useRef<HTMLInputElement>(null);
  const apiRef = useRef<any>(null);
  const [archivo, setArchivo] = useState<string|null>(null), [cargando, setCargando] = useState(false), [error, setError] = useState<string|null>(null), [paso, setPaso] = useState<string|null>(null), [formatoInterno, setFormatoInterno] = useState<string|null>(null), [tamanoGlb, setTamanoGlb] = useState<number|null>(null);
  const [materialId, setMaterialId] = useState<AssetId>("oro18a_pulido"), [escenarioId, setEscenarioId] = useState<EscenarioId>("oscuro");
  const [categoriaMaterial, setCategoriaMaterial] = useState<"metales"|"gemas"|"partes">("metales");
  const [partes, setPartes] = useState<{id:string;nombre:string;tipo:string}[]>([]);
  const [parteSeleccionada, setParteSeleccionada] = useState<string|null>(null);
  const [captura, setCaptura] = useState<string|null>(null), [vista, setVista] = useState<VistaId>("perspectiva"), [panel, setPanel] = useState<"materiales"|"escenas"|"iluminacion">("materiales"), [iluminacionId, setIluminacionId] = useState<IluminacionId>("jewelry");

  const materialActivo = useMemo(() => MATERIALES.find(m=>m.id===materialId)!, [materialId]);

  useEffect(() => {
    let vivo = true;
    let cleanup = () => {};
    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
      const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");
      const { GLTFExporter } = await import("three/addons/exporters/GLTFExporter.js");
      const nodo = visorRef.current;
      if (!vivo || !nodo) return;
      const escena = new THREE.Scene();
      const camara = new THREE.PerspectiveCamera(38, 1, .001, 1000);
      const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, preserveDrawingBuffer:true, powerPreference:"high-performance" });
      renderer.setPixelRatio(Math.min(devicePixelRatio,2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.55;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.className = "block h-full w-full";
      nodo.appendChild(renderer.domElement);

      const pmrem = new THREE.PMREMGenerator(renderer);
      const entorno = pmrem.fromScene(new RoomEnvironment(), .04).texture;
      escena.environment = entorno;
      escena.add(new THREE.HemisphereLight(0xfff8e8,0x332a24,2.5));
      const key = new THREE.DirectionalLight(0xffefc8,6);
      key.position.set(4,6,5); key.castShadow = true; key.shadow.mapSize.set(1024,1024); escena.add(key);
      const fill = new THREE.DirectionalLight(0xdbe7ff,4);
      fill.position.set(-5,3,4); escena.add(fill);
      const rim = new THREE.DirectionalLight(0xffd49a,5);
      rim.position.set(2,4,-5); escena.add(rim);
      const top = new THREE.PointLight(0xffffff,3,30);
      top.position.set(0,5,1); escena.add(top);
      const aplicarIluminacion = (id:IluminacionId) => {
        const presets:any = {
          studioSoft: {key:4.5,fill:3.8,rim:3.5,top:2.2,exposure:1.5},
          studioHard: {key:7,fill:2.2,rim:6,top:2.8,exposure:1.55},
          jewelry: {key:6,fill:4.5,rim:5.5,top:3.5,exposure:1.65},
          luxury: {key:5,fill:2.5,rim:7,top:2.5,exposure:1.6},
        }[id];
        key.intensity=presets.key; fill.intensity=presets.fill; rim.intensity=presets.rim; top.intensity=presets.top; renderer.toneMappingExposure=presets.exposure;
      };

      const controles = new OrbitControls(camara,renderer.domElement);
      controles.enableDamping = true; controles.dampingFactor = .07; controles.enablePan = true;
      controles.minDistance = .15; controles.maxDistance = 100;

      let modelo:any = null;
      let suelo:any = null;
      let glbInterno:Blob|null = null;
      const materialesCache = new Map<string, any>();
      const crearMaterial = (m:AssetConfig) => {
        const existente = materialesCache.get(m.id); if (existente) return existente;
        const mat = new THREE.MeshPhysicalMaterial({
          color:m.color, metalness:m.metalness, roughness:m.roughness, envMapIntensity:m.envMapIntensity,
          clearcoat:m.clearcoat, clearcoatRoughness:Math.min(.35,Math.max(.03,m.roughness*.45)),
          transmission:m.transmission ?? 0, ior:m.ior ?? 1.5, thickness:m.thickness ?? 0.5,
        });
        materialesCache.set(m.id,mat); return mat;
      };

      const materialesCacheHas = (mat:any) => Array.from(materialesCache.values()).includes(mat);
      const dispose = (o:any) => o?.traverse((x:any) => {
        if (x.geometry) x.geometry.dispose();
        if (Array.isArray(x.material)) x.material.forEach((m:any)=>m.dispose?.());
        else if (x.material && !materialesCacheHas(x.material)) x.material?.dispose?.();
      });
      const quitar = () => {
        if (modelo) { escena.remove(modelo); dispose(modelo); modelo=null; }
        if (suelo) { escena.remove(suelo); suelo.geometry.dispose(); suelo.material.dispose(); suelo=null; }
        glbInterno = null;
      };
      const aplicarMaterial = (m:AssetConfig) => {
        if (!modelo) return;
        const mat = crearMaterial(m);
        modelo.traverse((x:any) => { if (x.isMesh) { x.material=mat; x.castShadow=true; x.receiveShadow=true; } });
      };
      const aplicarMaterialParte = (id:string, m:AssetConfig) => {
        if (!modelo) return;
        const mat=crearMaterial(m);
        modelo.traverse((x:any) => { if (x.isMesh && x.userData.aurumId===id) { x.material=mat; x.castShadow=true; x.receiveShadow=true; } });
      };
      const listarPartes = () => {
        if (!modelo) return [];
        const out:{id:string;nombre:string;tipo:string}[]=[];
        let i=0;
        modelo.traverse((x:any) => {
          if (x.isMesh) {
            const id=x.userData.aurumId || `mesh-${i++}`; x.userData.aurumId=id;
            out.push({id,nombre:x.name || `Componente ${out.length+1}`,tipo:"Malla"});
          }
        });
        return out;
      };
      const aplicarEscenario = (id:EscenarioId) => {
        if (id==="transparente") { escena.background=null; renderer.setClearColor(0,0); }
        else {
          renderer.setClearColor(0,1);
          escena.background = new THREE.Color(({oscuro:0x090b0e,claro:0xe7e5e0,luxury:0x21150c,marmol:0xcfccc5} as any)[id]);
        }
        if (suelo) {
          suelo.visible = id!=="transparente";
          suelo.material.color.setHex(id==="marmol"?0xc5c2bc:id==="luxury"?0x20140b:0x15181c);
          suelo.material.roughness = id==="marmol"?.25:.3;
        }
      };
      const encuadrar = () => {
        if (!modelo) return;
        modelo.updateMatrixWorld(true);
        const b = new THREE.Box3().setFromObject(modelo);
        const center = b.getCenter(new THREE.Vector3());
        const size = b.getSize(new THREE.Vector3());
        const max = Math.max(size.x,size.y,size.z)||1;
        modelo.position.set(0,0,0);
        modelo.scale.setScalar(2.6/max);
        modelo.position.sub(center);
        modelo.updateMatrixWorld(true);
        const bf = new THREE.Box3().setFromObject(modelo);
        const h = bf.getSize(new THREE.Vector3()).y||1;
        if (!suelo) {
          suelo = new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshStandardMaterial({color:0x15181c,metalness:.05,roughness:.3}));
          suelo.rotation.x=-Math.PI/2; suelo.receiveShadow=true; escena.add(suelo);
        }
        suelo.position.y = bf.min.y-Math.max(h*.035,.015);
        aplicarEscenario(escenarioId);
        camara.position.set(3.5,2.4,4.6);
        controles.target.set(0,0,0); controles.update();
      };

      // Adaptadores de entrada: cada formato produce un Object3D común.
      // Rhino 3DM se decodifica con Rhino3dmLoader/WebAssembly y después
      // sigue exactamente el mismo flujo: Object3D -> GLB interno -> WebGL.
      const parsearEntrada = async (file:File, ext:string) => {
        const buffer = await file.arrayBuffer();
        if (ext==="stl") {
          const {STLLoader}=await import("three/addons/loaders/STLLoader.js");
          const geo=new STLLoader().parse(buffer); geo.computeVertexNormals();
          return new THREE.Mesh(geo, crearMaterial(MATERIALES[0]));
        }
        if (ext==="obj") {
          const {OBJLoader}=await import("three/addons/loaders/OBJLoader.js");
          return new OBJLoader().parse(new TextDecoder().decode(buffer));
        }
        if (ext==="fbx") {
          const {FBXLoader}=await import("three/addons/loaders/FBXLoader.js");
          return new FBXLoader().parse(buffer,"");
        }
        if (ext==="glb") {
          const {GLTFLoader}=await import("three/addons/loaders/GLTFLoader.js");
          return (await new GLTFLoader().parseAsync(buffer,"")).scene;
        }
        if (ext==="3dm") {
          const { Rhino3dmLoader } = await import("three/addons/loaders/3DMLoader.js");
          const loader = new Rhino3dmLoader();
          loader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@8.32.2/");
          loader.setWorkerLimit(2);
          return await new Promise<any>((resolve, reject) => {
            loader.parse(buffer, resolve, reject);
          });
        }
        throw new Error("Formato no compatible.");
      };

      const convertirAGlb = (objeto:any) => new Promise<ArrayBuffer>((resolve,reject) => {
        const exportador = new GLTFExporter();
        exportador.parse(objeto,(resultado:any) => {
          if (resultado instanceof ArrayBuffer) resolve(resultado);
          else reject(new Error("No se pudo generar el GLB interno."));
        },(e:any)=>reject(e),{binary:true,onlyVisible:true,trs:false});
      });

      const cargar = async(file:File, informar:(paso:string)=>void) => {
        const ext=file.name.split(".").pop()?.toLowerCase();
        if (!ext || !["stl","obj","glb","fbx","3dm"].includes(ext)) {
          throw new Error("Formato no compatible. Usa STL, OBJ, GLB, FBX o 3DM.");
        }
        informar("Procesando archivo...");
        const objeto = await parsearEntrada(file,ext);
        informar("Convirtiendo a GLB...");
        const glb = await convertirAGlb(objeto);
        informar("Preparando visualización...");
        const {GLTFLoader}=await import("three/addons/loaders/GLTFLoader.js");
        const interno=(await new GLTFLoader().parseAsync(glb,"")).scene;
        quitar();
        interno.traverse((x:any)=>{if(x.isMesh){x.userData.aurumId=`mesh-${Math.random().toString(36).slice(2,9)}`;x.material=crearMaterial(MATERIALES[0]);x.castShadow=true;x.receiveShadow=true;}});
        modelo=interno;
        glbInterno=new Blob([glb],{type:"model/gltf-binary"});
        escena.add(modelo);
        aplicarMaterial(materialActivo);
        setPartes(listarPartes());
        setParteSeleccionada(null);
        encuadrar();
        return {size:glb.byteLength, ext};
      };
      const camaraVista=(id:VistaId)=>{
        const p:any={perspectiva:[3.5,2.4,4.6],frontal:[0,0,5],superior:[0,5,.001],lateral:[5,0,0]}[id];
        camara.position.set(...p); controles.target.set(0,0,0); controles.update();
      };
      apiRef.current={
        cargar,
        material:aplicarMaterial,
        materialParte:aplicarMaterialParte,
        partes:listarPartes,
        escenario:aplicarEscenario,
        iluminacion:aplicarIluminacion,
        reset:encuadrar,
        capturar:()=>{renderer.render(escena,camara);return renderer.domElement.toDataURL("image/png")},
        limpiar:quitar,
        fullscreen:()=>nodo.requestFullscreen?.(),
        vista:camaraVista,
        glbSize:()=>glbInterno?.size??0,
      };
      const resize=()=>{const w=nodo.clientWidth||900,h=nodo.clientHeight||600;camara.aspect=w/h;camara.updateProjectionMatrix();renderer.setSize(w,h,false)};
      resize();
      const obs=new ResizeObserver(resize); obs.observe(nodo);
      let frame=0;
      const animate=()=>{frame=requestAnimationFrame(animate);controles.update();renderer.render(escena,camara)}; animate();
      cleanup=()=>{cancelAnimationFrame(frame);obs.disconnect();quitar();controles.dispose();materialesCache.forEach((m:any)=>m.dispose?.());entorno.dispose();pmrem.dispose();renderer.dispose();renderer.domElement.remove();apiRef.current=null};
    })().catch(e=>vivo&&setError(e?.message||"No se pudo iniciar AURUM RENDER"));
    return()=>{vivo=false;cleanup()};
  },[]);
  useEffect(()=>{ if (parteSeleccionada) apiRef.current?.materialParte(parteSeleccionada,materialActivo); else apiRef.current?.material(materialActivo); },[materialActivo,parteSeleccionada]);
  useEffect(()=>apiRef.current?.escenario(escenarioId),[escenarioId]);
  useEffect(()=>apiRef.current?.iluminacion(iluminacionId),[iluminacionId]);
  useEffect(()=>apiRef.current?.vista(vista),[vista]);

  const cargarArchivo=useCallback(async(file:File)=>{setCargando(true);setError(null);setPaso("Procesando archivo...");try{const r=await apiRef.current?.cargar(file,(p:string)=>setPaso(p));setArchivo(file.name);setFormatoInterno("GLB");setTamanoGlb(r?.size??null);setCaptura(null)}catch(e){setError(e instanceof Error?e.message:"No se pudo convertir el modelo");setArchivo(null);setFormatoInterno(null);setTamanoGlb(null)}finally{setCargando(false);setPaso(null)}},[]);
  const limpiar=()=>{apiRef.current?.limpiar();setPartes([]);setParteSeleccionada(null);setCategoriaMaterial("metales");setArchivo(null);setFormatoInterno(null);setTamanoGlb(null);setCaptura(null);setPaso(null);if(fileRef.current)fileRef.current.value=""};
  const capturarImagen=()=>{const d=apiRef.current?.capturar();if(d)setCaptura(d)};

  return <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-[#070809] text-white">
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0b0c0e]/95 px-4 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-3">
        <Gem className="size-5 shrink-0 text-gold"/>
        <div className="min-w-0"><div className="font-display text-xl italic leading-none text-gold">AURUM RENDER</div><div className="mt-1 text-[8px] uppercase tracking-[.24em] text-white/35">Jewelry Visualization Studio</div></div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={()=>fileRef.current?.click()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-gold/35 bg-gold/10 px-3 text-[10px] font-semibold uppercase tracking-wider text-gold hover:bg-gold/15"><Upload className="size-3.5"/> {archivo?"Cambiar modelo":"Cargar modelo"}</button>
        <input ref={fileRef} type="file" accept=".stl,.obj,.glb,.fbx,.3dm" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)void cargarArchivo(f)}}/>
      </div>
    </header>
    <div className="flex min-h-0 flex-1">
      <main className="relative min-w-0 flex-1 bg-[#090b0e]">
        <div ref={visorRef} className="absolute inset-0">
          {!archivo&&!cargando&&<div className="pointer-events-none absolute inset-0 z-10 grid place-items-center p-8 text-center"><div><div className="mx-auto grid size-20 place-items-center rounded-3xl border border-gold/20 bg-gold/10 text-gold"><Upload className="size-8"/></div><h2 className="mt-5 text-xl font-semibold text-white">Carga tu diseño de joyería</h2><p className="mt-2 text-sm text-white/40">STL · OBJ · GLB · FBX · Rhino 3DM</p><p className="mt-4 text-[9px] uppercase tracking-[.2em] text-white/25">Rotar · Zoom · Pan</p></div></div>}
          {cargando&&<div className="absolute inset-0 z-30 grid place-items-center bg-black/35 backdrop-blur-sm"><div className="rounded-2xl border border-gold/20 bg-black/70 px-7 py-5 text-center text-sm text-white/80"><div className="mx-auto mb-3 size-5 animate-spin rounded-full border-2 border-white/20 border-t-gold"/>{paso||"Preparando visualización..."}</div></div>}
          {error&&<div className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-red-400/20 bg-red-950/80 px-4 py-2 text-xs text-red-200">{error}</div>}
          {archivo&&<div className="absolute left-5 top-5 z-20 max-w-[60%] truncate rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[10px] text-white/55 backdrop-blur">{archivo} <span className="ml-2 text-gold/80">· GLB interno</span></div>}
          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-1 rounded-xl border border-white/10 bg-[#0b0c0e]/80 p-1 shadow-2xl backdrop-blur-xl">
            {VISTAS.map(v=><button key={v.id} type="button" title={v.nombre} onClick={()=>setVista(v.id)} className={"rounded-lg px-3 py-2 text-[9px] uppercase tracking-wider transition "+(vista===v.id?"bg-gold text-black":"text-white/45 hover:text-white")}>{v.nombre}</button>)}
          </div>
          <div className="absolute bottom-5 left-5 z-20 hidden rounded-full border border-white/10 bg-black/45 px-3 py-2 text-[9px] uppercase tracking-[.16em] text-white/35 backdrop-blur lg:block">AURUM RENDER · Tiempo real</div>
        </div>
      </main>
      <aside className="flex w-[320px] shrink-0 flex-col border-l border-white/10 bg-[#0d0f11]/96 shadow-2xl backdrop-blur-xl xl:w-[350px]">
        <div className="grid shrink-0 grid-cols-3 border-b border-white/10">
          <button type="button" onClick={()=>setPanel("materiales")} className={"flex flex-col items-center gap-1 px-2 py-3 text-[9px] uppercase tracking-wider "+(panel==="materiales"?"bg-gold/10 text-gold":"text-white/35 hover:text-white")}><Sparkles className="size-4"/>Materiales</button>
          <button type="button" onClick={()=>setPanel("escenas")} className={"flex flex-col items-center gap-1 border-x border-white/10 px-2 py-3 text-[9px] uppercase tracking-wider "+(panel==="escenas"?"bg-gold/10 text-gold":"text-white/35 hover:text-white")}><ImageIcon className="size-4"/>Escenarios</button>
          <button type="button" onClick={()=>setPanel("iluminacion")} className={"flex flex-col items-center gap-1 px-2 py-3 text-[9px] uppercase tracking-wider "+(panel==="iluminacion"?"bg-gold/10 text-gold":"text-white/35 hover:text-white")}><Sparkles className="size-4"/>Luz</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {panel==="materiales"&&<div>
            <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold">Configurador de joyería</p><p className="mt-1 text-[10px] text-white/35">{parteSeleccionada?"Material aplicado al componente seleccionado":"Selecciona una parte o aplica a toda la pieza"}</p></div></div>
            <div className="mb-4 grid grid-cols-3 rounded-xl border border-white/10 bg-black/20 p-1">
              {([["metales","Metales"],["gemas","Gemas"],["partes","Partes"]] as const).map(([id,nombre])=><button key={id} type="button" onClick={()=>setCategoriaMaterial(id)} className={"rounded-lg px-2 py-2 text-[9px] uppercase tracking-wider "+(categoriaMaterial===id?"bg-gold text-black":"text-white/40 hover:text-white")}>{nombre}</button>)}
            </div>
            {categoriaMaterial==="partes"&&<div className="space-y-1">
              {partes.length===0?<div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-[10px] text-white/30">Carga un modelo para ver su estructura.</div>:<>
                <button type="button" onClick={()=>setParteSeleccionada(null)} className={"mb-2 flex w-full items-center gap-2 rounded-xl border p-3 text-left text-[10px] "+(!parteSeleccionada?"border-gold bg-gold/10 text-gold":"border-white/10 text-white/55")}> <Grid3X3 className="size-4"/> Toda la pieza</button>
                {partes.map((p,i)=><button key={p.id} type="button" onClick={()=>setParteSeleccionada(p.id)} className={"flex w-full items-center gap-2 rounded-xl border p-2.5 text-left text-[10px] "+(parteSeleccionada===p.id?"border-gold bg-gold/10 text-gold":"border-white/10 text-white/55 hover:border-gold/40")}><ChevronDown className="size-3 opacity-40"/><span className="truncate">{p.nombre}</span><span className="ml-auto text-[8px] text-white/20">{p.tipo}</span></button>)}
              </>}
            </div>}
            {categoriaMaterial!=="partes"&&<div className="space-y-5">
              {categoriaMaterial==="metales"&&(["Oro Amarillo","Oro Blanco","Oro Rosa","Plata","Platino"] as string[]).map(grupo=><div key={grupo}><p className="mb-2 text-[9px] font-semibold uppercase tracking-[.18em] text-white/30">{grupo}</p><div className="grid grid-cols-4 gap-2">{MATERIALES.filter(m=>m.grupo==="Metal"&&m.categoria===grupo).map(m=><button key={m.id} type="button" title={m.nombre} onClick={()=>setMaterialId(m.id)} className={"rounded-xl p-2 transition "+(materialId===m.id?"bg-gold/10 ring-1 ring-gold":"hover:bg-white/[.04]")}><span className="mx-auto block size-11 rounded-full border border-white/15 shadow-[inset_2px_2px_5px_rgba(255,255,255,.28),inset_-3px_-3px_7px_rgba(0,0,0,.35),0_3px_10px_rgba(0,0,0,.3)]" style={{background:"radial-gradient(circle at 32% 28%, #ffffffaa 0%, #"+m.color.toString(16).padStart(6,"0")+" 38%, #00000055 100%)"}}/><span className="mt-1.5 block truncate text-center text-[9px] font-medium text-white/65">{m.nombre}</span></button>)}</div></div>)}
              {categoriaMaterial==="gemas"&&<div><p className="mb-2 text-[9px] font-semibold uppercase tracking-[.18em] text-white/30">Gemas</p><div className="grid grid-cols-4 gap-2">{MATERIALES.filter(m=>m.grupo==="Gema").map(m=><button key={m.id} type="button" title={m.nombre} onClick={()=>setMaterialId(m.id)} className={"rounded-xl p-2 transition "+(materialId===m.id?"bg-gold/10 ring-1 ring-gold":"hover:bg-white/[.04]")}><span className="mx-auto block size-11 rounded-full border border-white/25 shadow-[inset_2px 2px 6px_rgba(255,255,255,.4),0 3px 10px_rgba(0,0,0,.3)]" style={{background:"radial-gradient(circle at 30% 25%, #ffffffcc 0%, #"+m.color.toString(16).padStart(6,"0")+" 42%, #00000055 100%)"}}/><span className="mt-1.5 block truncate text-center text-[9px] font-medium text-white/65">{m.nombre}</span></button>)}</div><p className="mt-3 text-[9px] leading-relaxed text-white/25">Las gemas usan transmisión, refracción, índice óptico y clearcoat para una apariencia más realista.</p></div>}
            </div>}
          </div>
          {panel==="escenas"&&<div><div className="mb-4"><p className="text-xs font-semibold">Escenarios</p><p className="mt-1 text-[10px] text-white/35">Entornos de presentación comercial</p></div><div className="grid grid-cols-2 gap-2">{ESCENARIOS.map(e=><button key={e.id} type="button" onClick={()=>setEscenarioId(e.id)} className={"overflow-hidden rounded-xl border text-left transition "+(escenarioId===e.id?"border-gold ring-1 ring-gold":"border-white/10 hover:border-gold/40")}><div className={"h-14 "+e.clase}/><div className="p-2 text-[9px] font-semibold text-white/70">{e.nombre}</div></button>)}</div></div>}
          {panel==="iluminacion"&&<div><div className="mb-4"><p className="text-xs font-semibold">Iluminación</p><p className="mt-1 text-[10px] text-white/35">Presets de estudio para joyería</p></div><div className="space-y-2">{ILUMINACIONES.map(l=><button key={l.id} type="button" onClick={()=>setIluminacionId(l.id)} className={"flex w-full items-center justify-between rounded-xl border p-3 text-left transition "+(iluminacionId===l.id?"border-gold bg-gold/10":"border-white/10 hover:border-gold/40")}><span><span className="block text-[10px] font-semibold text-white/80">{l.nombre}</span><span className="text-[9px] text-white/30">{l.descripcion}</span></span><span className="size-7 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,transparent_38%),radial-gradient(circle,#c9a45d,#28201a)]"/></button>)}</div></div>}
        </div>
        <div className="shrink-0 border-t border-white/10 p-3">
          <p className="mb-2 px-1 text-[8px] font-semibold uppercase tracking-[.18em] text-white/25">Herramientas</p>
          <div className="grid grid-cols-5 gap-1">
            <button type="button" title="Configuración" onClick={()=>setPanel("iluminacion")} className="grid h-10 place-items-center rounded-lg border border-white/10 text-white/45 hover:border-gold/40 hover:text-gold"><SlidersHorizontal className="size-4"/></button>
            <button type="button" title="Reiniciar cámara" onClick={()=>apiRef.current?.reset()} className="grid h-10 place-items-center rounded-lg border border-white/10 text-white/45 hover:border-gold/40 hover:text-gold"><RotateCcw className="size-4"/></button>
            <button type="button" title="Zoom Extents" onClick={()=>apiRef.current?.reset()} className="grid h-10 place-items-center rounded-lg border border-white/10 text-white/45 hover:border-gold/40 hover:text-gold"><Maximize2 className="size-4"/></button>
            <button type="button" title="Pantalla completa" onClick={()=>apiRef.current?.fullscreen()} className="grid h-10 place-items-center rounded-lg border border-white/10 text-white/45 hover:border-gold/40 hover:text-gold"><Expand className="size-4"/></button>
            <button type="button" title="Capturar imagen" onClick={capturarImagen} className="grid h-10 place-items-center rounded-lg border border-gold/30 bg-gold/10 text-gold hover:bg-gold/15"><Camera className="size-4"/></button>
          </div>
          {captura&&<button type="button" onClick={()=>{const a=document.createElement("a");a.href=captura;a.download="aurum-render-"+Date.now()+".png";a.click()}} className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-gold text-[10px] font-semibold uppercase tracking-wider text-black"><Download className="size-3.5"/> Descargar PNG</button>}
        </div>
      </aside>
    </div>
  </div>;
}