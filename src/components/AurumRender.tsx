import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronDown, Download, Expand, Gem, Grid3X3, Image as ImageIcon, Maximize2, RotateCcw, SlidersHorizontal, Sparkles, Upload, X, Box } from "lucide-react";

type MaterialId =
  | "oro18a_pulido" | "oro18a_satinado" | "oro18a_mate" | "oro18a_cepillado"
  | "oro18b_rodinado" | "oro18b_pulido" | "oro18b_mate"
  | "oro18r_pulido" | "oro18r_satinado" | "oro18r_mate"
  | "plata925_pulida" | "plata950_pulida" | "plata970_pulida" | "plata_envejecida"
  | "platino_pulido" | "platino_mate";
type EscenarioId = "oscuro" | "claro" | "luxury" | "marmol" | "transparente";
type VistaId = "perspectiva" | "frontal" | "superior" | "lateral";
type IluminacionId = "studioSoft" | "studioHard" | "jewelry" | "luxury";

type MaterialGrupo = "Oro Amarillo" | "Oro Blanco" | "Oro Rosa" | "Plata" | "Platino";
type CategoriaParte = "metal" | "gema" | "otro";
type GemaId = "diamante" | "zafiro" | "rubi" | "esmeralda" | "moissanita" | "citrino" | "amatista" | "topacio";
type GemaConfig = { id:GemaId; nombre:string; color:number; transmission:number; ior:number; roughness:number; envMapIntensity:number };
type MaterialConfig = { id: MaterialId; grupo: MaterialGrupo; nombre: string; color: number; metalness: number; roughness: number; envMapIntensity: number; clearcoat: number };
type ParteModelo = { id: string; nombre: string; tipo: "grupo" | "malla"; nivel: number; capa?: string; colorCapa?: string; categoria: CategoriaParte };
const GEMAS: GemaConfig[] = [
  { id:"diamante", nombre:"Diamante", color:0xf7fbff, transmission:.92, ior:2.42, roughness:.04, envMapIntensity:4.2 },
  { id:"zafiro", nombre:"Zafiro", color:0x2563eb, transmission:.72, ior:1.77, roughness:.06, envMapIntensity:3.2 },
  { id:"rubi", nombre:"Rubí", color:0xd51f35, transmission:.72, ior:1.77, roughness:.06, envMapIntensity:3.2 },
  { id:"esmeralda", nombre:"Esmeralda", color:0x16834b, transmission:.68, ior:1.58, roughness:.07, envMapIntensity:3.0 },
  { id:"moissanita", nombre:"Moissanita", color:0xeef7ff, transmission:.9, ior:2.65, roughness:.035, envMapIntensity:4.0 },
  { id:"citrino", nombre:"Citrino", color:0xe3a51a, transmission:.7, ior:1.54, roughness:.07, envMapIntensity:2.8 },
  { id:"amatista", nombre:"Amatista", color:0x8b5cf6, transmission:.7, ior:1.55, roughness:.07, envMapIntensity:2.8 },
  { id:"topacio", nombre:"Topacio", color:0x67d4ef, transmission:.78, ior:1.63, roughness:.055, envMapIntensity:3.0 },
];

const MATERIALES: MaterialConfig[] = [
  { id: "oro18a_pulido", grupo: "Oro Amarillo", nombre: "Pulido", color: 0xd7ad48, metalness: 1, roughness: .12, envMapIntensity: 2.8, clearcoat: .55 },
  { id: "oro18a_satinado", grupo: "Oro Amarillo", nombre: "Satinado", color: 0xd2aa55, metalness: 1, roughness: .28, envMapIntensity: 2.35, clearcoat: .25 },
  { id: "oro18a_mate", grupo: "Oro Amarillo", nombre: "Mate", color: 0xc7a45a, metalness: 1, roughness: .52, envMapIntensity: 1.8, clearcoat: .08 },
  { id: "oro18a_cepillado", grupo: "Oro Amarillo", nombre: "Cepillado", color: 0xcfa94e, metalness: 1, roughness: .38, envMapIntensity: 2.15, clearcoat: .12 },
  { id: "oro18b_rodinado", grupo: "Oro Blanco", nombre: "Rodinado", color: 0xe9edf2, metalness: 1, roughness: .09, envMapIntensity: 3, clearcoat: .6 },
  { id: "oro18b_pulido", grupo: "Oro Blanco", nombre: "Pulido", color: 0xdfe3e8, metalness: 1, roughness: .13, envMapIntensity: 2.7, clearcoat: .45 },
  { id: "oro18b_mate", grupo: "Oro Blanco", nombre: "Mate", color: 0xcbd0d5, metalness: 1, roughness: .5, envMapIntensity: 1.75, clearcoat: .08 },
  { id: "oro18r_pulido", grupo: "Oro Rosa", nombre: "Pulido", color: 0xd9937e, metalness: 1, roughness: .12, envMapIntensity: 2.75, clearcoat: .5 },
  { id: "oro18r_satinado", grupo: "Oro Rosa", nombre: "Satinado", color: 0xd58f7b, metalness: 1, roughness: .29, envMapIntensity: 2.3, clearcoat: .25 },
  { id: "oro18r_mate", grupo: "Oro Rosa", nombre: "Mate", color: 0xc98573, metalness: 1, roughness: .5, envMapIntensity: 1.8, clearcoat: .08 },
  { id: "plata925_pulida", grupo: "Plata", nombre: "Plata 925 Pulida", color: 0xd7dbe0, metalness: 1, roughness: .1, envMapIntensity: 2.9, clearcoat: .45 },
  { id: "plata950_pulida", grupo: "Plata", nombre: "Plata 950 Pulida", color: 0xcfd4d9, metalness: 1, roughness: .12, envMapIntensity: 2.8, clearcoat: .4 },
  { id: "plata970_pulida", grupo: "Plata", nombre: "Plata 970 Pulida", color: 0xe0e3e6, metalness: 1, roughness: .1, envMapIntensity: 2.9, clearcoat: .45 },
  { id: "plata_envejecida", grupo: "Plata", nombre: "Plata Envejecida", color: 0x777c82, metalness: .92, roughness: .4, envMapIntensity: 1.65, clearcoat: .08 },
  { id: "platino_pulido", grupo: "Platino", nombre: "Pulido", color: 0xc5cbd0, metalness: 1, roughness: .1, envMapIntensity: 2.85, clearcoat: .48 },
  { id: "platino_mate", grupo: "Platino", nombre: "Mate", color: 0xaeb4ba, metalness: 1, roughness: .48, envMapIntensity: 1.8, clearcoat: .08 },
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

const normalizarTexto = (v:any) => String(v ?? "").trim().toLowerCase();
const colorRhinoHex = (c:any): string | undefined => {
  if (!c) return undefined;
  const r = Number(c.r ?? c.R), g = Number(c.g ?? c.G), b = Number(c.b ?? c.B);
  if (![r,g,b].every(Number.isFinite)) return undefined;
  return "#" + [r,g,b].map(n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,"0")).join("");
};
const clasificarCapa = (nombre:string, color?:string): CategoriaParte => {
  const n = normalizarTexto(nombre);
  if (/(piedra|gema|diamante|zafiro|rubi|rubí|esmeralda|moissanita|citrino|amatista|topacio)/.test(n)) return "gema";
  if (/(metal|oro|plata|platino|metalico|metálico)/.test(n)) return "metal";
  if (color) {
    const m = color.match(/^#([0-9a-f]{6})$/i);
    if (m) {
      const x=parseInt(m[1],16), rr=(x>>16)&255, gg=(x>>8)&255, bb=x&255;
      if (gg > rr*1.15 && gg > bb*1.15 && gg > 90) return "metal";
      if (bb > rr*1.15 && bb > gg*1.05 && bb > 90) return "gema";
    }
  }
  return "otro";
};

const GemSwatch = ({ g, selected, onClick }: { g:GemaConfig; selected:boolean; onClick:()=>void }) => {
  const hex = "#" + g.color.toString(16).padStart(6,"0");
  const light = g.id==="diamante" || g.id==="moissanita" ? "#ffffff" : "#ffffff";
  const gradId = "gem-grad-" + g.id;
  return <button
    type="button"
    title={g.nombre}
    aria-label={g.nombre}
    onClick={onClick}
    className={"group rounded-xl p-1.5 transition "+(selected?"bg-gold/10 ring-1 ring-gold":"hover:bg-white/[.045]")}
  >
    <div className="relative mx-auto aspect-square w-full max-w-[68px]">
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible drop-shadow-[0_5px_10px_rgba(0,0,0,.35)]" aria-hidden="true">
        <defs>
          <radialGradient id={gradId} cx="32%" cy="25%" r="78%">
            <stop offset="0%" stopColor={light} stopOpacity=".98"/>
            <stop offset="22%" stopColor={hex} stopOpacity=".95"/>
            <stop offset="66%" stopColor={hex}/>
            <stop offset="100%" stopColor="#050609" stopOpacity=".72"/>
          </radialGradient>
          <clipPath id={"gem-clip-"+g.id}><circle cx="50" cy="50" r="45"/></clipPath>
        </defs>
        <circle cx="50" cy="50" r="46" fill="#090b0e" stroke="rgba(255,255,255,.18)" strokeWidth="2"/>
        <circle cx="50" cy="50" r="45" fill={"url(#"+gradId+")"}/>
        <g clipPath={"url(#gem-clip-"+g.id+")"} stroke="#fff" strokeOpacity=".22" strokeWidth=".8">
          <polygon points="50,6 73,18 92,40 82,70 59,92 34,86 10,65 8,39 27,17" fill={hex} fillOpacity=".45"/>
          <polygon points="50,6 50,50 73,18" fill="#fff" fillOpacity=".24"/>
          <polygon points="50,50 73,18 92,40" fill="#fff" fillOpacity=".08"/>
          <polygon points="50,50 92,40 82,70" fill="#000" fillOpacity=".16"/>
          <polygon points="50,50 82,70 59,92" fill="#fff" fillOpacity=".10"/>
          <polygon points="50,50 59,92 34,86" fill="#000" fillOpacity=".18"/>
          <polygon points="50,50 34,86 10,65" fill="#fff" fillOpacity=".08"/>
          <polygon points="50,50 10,65 8,39" fill="#000" fillOpacity=".12"/>
          <polygon points="50,50 8,39 27,17" fill="#fff" fillOpacity=".10"/>
          <polygon points="50,50 27,17 50,6" fill="#fff" fillOpacity=".34"/>
          <polygon points="35,20 50,12 62,21 53,38 37,34" fill="#fff" fillOpacity=".16" strokeOpacity=".28"/>
          <polygon points="37,34 53,38 50,50 31,43" fill="#000" fillOpacity=".14"/>
          <polygon points="53,38 68,29 78,43 50,50" fill="#fff" fillOpacity=".10"/>
        </g>
        <circle cx="36" cy="27" r="8" fill="#fff" opacity=".28"/>
        <circle cx="32" cy="23" r="3" fill="#fff" opacity=".7"/>
        <circle cx="67" cy="73" r="2.2" fill="#fff" opacity=".5"/>
      </svg>
      {selected&&<span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-gold text-[9px] font-bold text-black">✓</span>}
    </div>
    <span className="mt-1.5 block truncate text-center text-[9px] font-medium text-white/70 group-hover:text-white">{g.nombre}</span>
  </button>;
};

export function AurumRender() {
  const visorRef = useRef<HTMLDivElement>(null), fileRef = useRef<HTMLInputElement>(null);
  const apiRef = useRef<any>(null);
  const [archivo, setArchivo] = useState<string|null>(null), [cargando, setCargando] = useState(false), [error, setError] = useState<string|null>(null), [paso, setPaso] = useState<string|null>(null), [formatoInterno, setFormatoInterno] = useState<string|null>(null), [tamanoGlb, setTamanoGlb] = useState<number|null>(null);
  const [materialId, setMaterialId] = useState<MaterialId>("oro18a_pulido"), [gemaId, setGemaId] = useState<GemaId>("diamante"), [escenarioId, setEscenarioId] = useState<EscenarioId>("oscuro");
  const [captura, setCaptura] = useState<string|null>(null), [vista, setVista] = useState<VistaId>("perspectiva"), [partes, setPartes] = useState<ParteModelo[]>([]), [parteSeleccionada, setParteSeleccionada] = useState<string|null>(null), [parteSeleccionadaNombre, setParteSeleccionadaNombre] = useState<string|null>(null), [parteSeleccionadaCapa, setParteSeleccionadaCapa] = useState<string|null>(null), [parteSeleccionadaCategoria, setParteSeleccionadaCategoria] = useState<CategoriaParte>("otro"), [panel, setPanel] = useState<"materiales"|"escenas"|"iluminacion">("materiales"), [iluminacionId, setIluminacionId] = useState<IluminacionId>("jewelry");

  const materialActivo = useMemo(() => MATERIALES.find(m=>m.id===materialId)!, [materialId]);
  const gemaActiva = useMemo(() => GEMAS.find(g=>g.id===gemaId)!, [gemaId]);
  const [bibliotecaTipo, setBibliotecaTipo] = useState<"metales"|"gemas">("metales");

  useEffect(() => {
    let vivo = true;
    let cleanup = () => {};
    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
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
      let parteActiva:any = null;
      let resaltado:any = null;
      const material = new THREE.MeshPhysicalMaterial({
        color: 0xd7ad48, metalness: 1, roughness: .12, envMapIntensity: 2.8, clearcoat: .55, clearcoatRoughness: .08
      });

      const dispose = (o:any) => o?.traverse((x:any) => {
        if (x.geometry) x.geometry.dispose();
        if (Array.isArray(x.material)) x.material.forEach((m:any)=>m.dispose?.());
        else x.material?.dispose?.();
      });
      const quitar = () => {
        if (modelo) { escena.remove(modelo); dispose(modelo); modelo=null; }
        if (suelo) { escena.remove(suelo); suelo.geometry.dispose(); suelo.material.dispose(); suelo=null; }
        glbInterno = null;
      };
      const configurarMaterial = (mat:any, m:MaterialConfig) => {
        mat.color.setHex(m.color);
        mat.metalness = m.metalness;
        mat.roughness = m.roughness;
        mat.envMapIntensity = m.envMapIntensity;
        mat.clearcoat = m.clearcoat;
        mat.clearcoatRoughness = Math.min(.35, Math.max(.03, m.roughness * .45));
        mat.emissive?.setHex(0x000000);
        mat.emissiveIntensity = 0;
        mat.needsUpdate = true;
      };
      const aplicarGema = (g:GemaConfig, objetivo?:any) => {
        const aplicar = (base:any) => {
          const nuevo = base?.clone ? base.clone() : new THREE.MeshPhysicalMaterial();
          nuevo.color.setHex(g.color);
          nuevo.metalness = 0;
          nuevo.roughness = g.roughness;
          nuevo.transmission = g.transmission;
          nuevo.thickness = 0.35;
          nuevo.ior = g.ior;
          nuevo.clearcoat = .35;
          nuevo.clearcoatRoughness = .04;
          nuevo.envMapIntensity = g.envMapIntensity;
          nuevo.transparent = g.transmission < .9;
          nuevo.opacity = 1;
          nuevo.needsUpdate = true;
          return nuevo;
        };
        const target = objetivo || parteActiva;
        if (!target) return;
        target.material = Array.isArray(target.material) ? target.material.map((base:any)=>aplicar(base)) : aplicar(target.material);
      };

      const aplicarMaterial = (m:MaterialConfig) => {
        configurarMaterial(material, m);
        if (!modelo) return;
        modelo.traverse((x:any) => {
          if (!x.isMesh) return;
          x.castShadow = true;
          x.receiveShadow = true;
          if (parteActiva && x.uuid === parteActiva.uuid) {
            const aplicar = (base:any) => {
              const nuevo = base?.clone ? base.clone() : material.clone();
              configurarMaterial(nuevo, m);
              return nuevo;
            };
            x.material = Array.isArray(x.material) ? x.material.map((base:any)=>aplicar(base)) : aplicar(x.material);
          } else if (!parteActiva) {
            x.material = material;
          }
        });
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
          const {STLLoader}=await import("three/examples/jsm/loaders/STLLoader.js");
          const geo=new STLLoader().parse(buffer); geo.computeVertexNormals();
          return new THREE.Mesh(geo, material);
        }
        if (ext==="obj") {
          const {OBJLoader}=await import("three/examples/jsm/loaders/OBJLoader.js");
          return new OBJLoader().parse(new TextDecoder().decode(buffer));
        }
        if (ext==="fbx") {
          const {FBXLoader}=await import("three/examples/jsm/loaders/FBXLoader.js");
          return new FBXLoader().parse(buffer,"");
        }
        if (ext==="glb") {
          const {GLTFLoader}=await import("three/examples/jsm/loaders/GLTFLoader.js");
          return (await new GLTFLoader().parseAsync(buffer,"")).scene;
        }
        if (ext==="3dm") {
          const { Rhino3dmLoader } = await import("three/examples/jsm/loaders/3DMLoader.js");
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

      const obtenerPartes = (objeto:any):ParteModelo[] => {
        const resultado:ParteModelo[] = [];
        const layers = Array.isArray(objeto?.userData?.layers) ? objeto.userData.layers : [];
        objeto.traverse((x:any) => {
          if (x === objeto) return;
          const esMalla = !!x.isMesh;
          const tieneHijos = Array.isArray(x.children) && x.children.length > 0;
          if (!esMalla && !tieneHijos) return;
          const nombre = (typeof x.name === "string" && x.name.trim()) ? x.name.trim() : (esMalla ? "Malla" : "Componente");
          const attrs = x.userData?.attributes || {};
          const meta = x.userData?.aurumRhino;
          const layerIndex = Number.isInteger(attrs.layerIndex) ? attrs.layerIndex : -1;
          const layer = layerIndex >= 0 ? layers[layerIndex] : undefined;
          const capa = meta?.capa ?? (layer?.name ? String(layer.name) : undefined);
          const colorCapa = meta?.colorCapa ?? colorRhinoHex(layer?.color);
          const categoria = meta?.categoria ?? clasificarCapa(capa || "", colorCapa);
          const nivel = Math.min(2, Math.max(0, x.parent && x.parent !== objeto ? 1 : 0));
          resultado.push({ id: x.uuid, nombre, tipo: esMalla ? "malla" : "grupo", nivel, capa, colorCapa, categoria });
        });
        return resultado;
      };

      const cargar = async(file:File, informar:(paso:string)=>void) => {
        const ext=file.name.split(".").pop()?.toLowerCase();
        if (!ext || !["stl","obj","glb","fbx","3dm"].includes(ext)) {
          throw new Error("Formato no compatible. Usa STL, OBJ, GLB, FBX o 3DM.");
        }
        informar("Procesando archivo...");
        const objeto = await parsearEntrada(file,ext);
        // Rhino trabaja con Z como eje vertical, mientras que AURUM RENDER/Three.js
        // usa Y como eje vertical. Convertimos únicamente los 3DM para conservar
        // la orientación "de pie" con la que el modelo fue diseñado en Rhino.
        if (ext==="3dm") {
          objeto.rotation.x = -Math.PI / 2;
          objeto.updateMatrixWorld(true);
        }
        // Rhino 3DM conserva las capas en userData del objeto raíz y el layerIndex
        // en userData.attributes de cada objeto. Capturamos esa información antes
        // de convertir a GLB para que no se pierda durante la conversión.
        const metadataCapas = ext==="3dm"
          ? obtenerPartes(objeto).filter(p=>p.tipo==="malla").map(p=>({nombre:p.nombre,capa:p.capa,colorCapa:p.colorCapa,categoria:p.categoria}))
          : [];
        informar("Convirtiendo a GLB...");
        const glb = await convertirAGlb(objeto);
        informar("Preparando visualización...");
        const {GLTFLoader}=await import("three/examples/jsm/loaders/GLTFLoader.js");
        const interno=(await new GLTFLoader().parseAsync(glb,"")).scene;
        if (metadataCapas.length) {
          let i=0;
          interno.traverse((x:any)=>{
            if (!x.isMesh) return;
            const meta=metadataCapas[i++];
            if (!meta) return;
            x.userData = {...x.userData, aurumRhino: meta};
          });
        }
        quitar();
        interno.traverse((x:any)=>{
          if (!x.isMesh) return;
          x.castShadow=true; x.receiveShadow=true;
          const meta=x.userData?.aurumRhino;
          if (meta?.categoria==="gema") {
            const g=GEMAS[0];
            const m=new THREE.MeshPhysicalMaterial();
            m.color.setHex(g.color); m.metalness=0; m.roughness=g.roughness; m.transmission=g.transmission; m.thickness=.35; m.ior=g.ior; m.clearcoat=.35; m.clearcoatRoughness=.04; m.envMapIntensity=g.envMapIntensity; m.transparent=g.transmission<.9; x.material=m;
          } else if (meta?.categoria==="metal") {
            const m=MATERIALES[0];
            const mat=x.material?.clone ? x.material.clone() : new THREE.MeshPhysicalMaterial();
            configurarMaterial(mat,m); x.material=mat;
          } else {
            x.material=material;
          }
        });
        modelo=interno;
        setPartes(obtenerPartes(modelo));
        setParteSeleccionada(null);
        setParteSeleccionadaNombre(null); setParteSeleccionadaCapa(null); setParteSeleccionadaCategoria("otro");
        parteActiva=null;
        limpiarResaltado();
        glbInterno=new Blob([glb],{type:"model/gltf-binary"});
        escena.add(modelo);
        if (ext!=="3dm") aplicarMaterial(materialActivo);
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
        gema:aplicarGema,
        escenario:aplicarEscenario,
        iluminacion:aplicarIluminacion,
        reset:encuadrar,
        capturar:()=>{renderer.render(escena,camara);return renderer.domElement.toDataURL("image/png")},
        limpiar:()=>{quitar();parteActiva=null;limpiarResaltado();setPartes([]);setParteSeleccionada(null);setParteSeleccionadaNombre(null);},
    partes:()=>modelo?obtenerPartes(modelo):[],
    seleccionarParte:(id:string)=>{
          if (!id) { parteActiva=null; setParteSeleccionada(null); setParteSeleccionadaNombre(null); limpiarResaltado(); return; }
          let encontrado:any=null;
          modelo?.traverse((x:any)=>{if(x.uuid===id) encontrado=x;});
          if(encontrado) seleccionarMalla(encontrado);
        },
        fullscreen:()=>nodo.requestFullscreen?.(),
        vista:camaraVista,
        glbSize:()=>glbInterno?.size??0,
      };
      const limpiarResaltado = () => {
        if (!resaltado) return;
        escena.remove(resaltado);
        resaltado.geometry?.dispose?.();
        resaltado.material?.dispose?.();
        resaltado = null;
      };
      const seleccionarMalla = (obj:any) => {
        if (!obj?.isMesh) return;
        parteActiva = obj;
        const nombre = (typeof obj.name === "string" && obj.name.trim()) ? obj.name.trim() : "Componente seleccionado";
        const meta = obj.userData?.aurumRhino || {};
        const capa = meta.capa || obj.userData?.attributes?.layerName || null;
        const categoria = (meta.categoria || clasificarCapa(capa || "", meta.colorCapa)) as CategoriaParte;
        setParteSeleccionada(obj.uuid);
        setParteSeleccionadaNombre(nombre);
        setParteSeleccionadaCapa(capa);
        setParteSeleccionadaCategoria(categoria);
        limpiarResaltado();
        if (obj.geometry) {
          const edges = new THREE.EdgesGeometry(obj.geometry, 18);
          resaltado = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color:0xff8a5b,transparent:true,opacity:.95,depthTest:false}));
          resaltado.renderOrder = 20;
          resaltado.position.copy(obj.getWorldPosition(new THREE.Vector3()));
          resaltado.quaternion.copy(obj.getWorldQuaternion(new THREE.Quaternion()));
          resaltado.scale.copy(obj.getWorldScale(new THREE.Vector3()));
          escena.add(resaltado);
        }
      };
      const seleccionarPorClick = (event: MouseEvent) => {
        if (!modelo || cargando) return;
        const rect = renderer.domElement.getBoundingClientRect();
        const pointer = new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(pointer, camara);
        const objetivos:any[] = [];
        modelo.traverse((x:any) => { if (x.isMesh && x.visible) objetivos.push(x); });
        const impacto = raycaster.intersectObjects(objetivos, false)[0];
        if (impacto?.object?.uuid) {
          seleccionarMalla(impacto.object);
        } else {
          // Clic en espacio vacío = quitar selección y devolver la biblioteca
          // a su estado neutro. El último material elegido no queda "pegado".
          parteActiva = null;
          setParteSeleccionada(null);
          setParteSeleccionadaNombre(null);
          setParteSeleccionadaCapa(null);
          setParteSeleccionadaCategoria("otro");
          limpiarResaltado();
        }
      };
      renderer.domElement.addEventListener("click", seleccionarPorClick);

      const resize=()=>{const w=nodo.clientWidth||900,h=nodo.clientHeight||600;camara.aspect=w/h;camara.updateProjectionMatrix();renderer.setSize(w,h,false)};
      resize();
      const obs=new ResizeObserver(resize); obs.observe(nodo);
      let frame=0;
      const animate=()=>{frame=requestAnimationFrame(animate);controles.update();renderer.render(escena,camara)}; animate();
      cleanup=()=>{cancelAnimationFrame(frame);renderer.domElement.removeEventListener("click", seleccionarPorClick);obs.disconnect();limpiarResaltado();quitar();controles.dispose();material.dispose();entorno.dispose();pmrem.dispose();renderer.dispose();renderer.domElement.remove();apiRef.current=null};
    })().catch(e=>vivo&&setError(e?.message||"No se pudo iniciar AURUM RENDER"));
    return()=>{vivo=false;cleanup()};
  },[]);
  useEffect(()=>apiRef.current?.material(materialActivo),[materialActivo]);
  useEffect(()=>apiRef.current?.escenario(escenarioId),[escenarioId]);
  useEffect(()=>apiRef.current?.iluminacion(iluminacionId),[iluminacionId]);
  useEffect(()=>apiRef.current?.vista(vista),[vista]);

  const cargarArchivo=useCallback(async(file:File)=>{setCargando(true);setError(null);setPaso("Procesando archivo...");try{const r=await apiRef.current?.cargar(file,(p:string)=>setPaso(p));setArchivo(file.name);setFormatoInterno("GLB");setTamanoGlb(r?.size??null);setCaptura(null)}catch(e){setError(e instanceof Error?e.message:"No se pudo convertir el modelo");setArchivo(null);setFormatoInterno(null);setTamanoGlb(null)}finally{setCargando(false);setPaso(null)}},[]);
  const limpiar=()=>{apiRef.current?.limpiar();setArchivo(null);setFormatoInterno(null);setTamanoGlb(null);setCaptura(null);setPaso(null);if(fileRef.current)fileRef.current.value=""};
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
          {parteSeleccionada&&<div className="absolute left-5 top-16 z-20 max-w-[75%] rounded-xl border border-[#ff8a5b]/60 bg-black/75 px-3 py-2 text-[10px] font-medium text-white shadow-xl backdrop-blur-xl"><div><span className="text-[#ff8a5b]">Seleccionado:</span> {parteSeleccionadaNombre||"Componente"}</div>{parteSeleccionadaCapa&&<div className="mt-1 text-white/50">Capa Rhino: <span className="text-white/80">{parteSeleccionadaCapa}</span> · {parteSeleccionadaCategoria==="metal"?"Metal":parteSeleccionadaCategoria==="gema"?"Gema":"Otro"}</div>}<div className="mt-1 text-white/35">Elige un material para este componente</div></div>}
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
            <div className="mb-4">
              <p className="text-xs font-semibold">Biblioteca de materiales</p>
              <p className="mt-1 text-[10px] text-white/35">{parteSeleccionada?(`Aplicar a: ${parteSeleccionadaNombre||"componente"}`):"Selecciona una parte del modelo para personalizarla"}</p>
            </div>
            <div className="mb-4 flex rounded-xl border border-white/10 bg-white/[.025] p-1">
              <button type="button" onClick={()=>setBibliotecaTipo("metales")} className={"flex-1 rounded-lg py-2.5 text-[9px] font-semibold uppercase tracking-[.12em] transition "+(bibliotecaTipo==="metales"?"bg-gold/10 text-gold shadow-sm":"text-white/40 hover:text-white")}>
                Metales
              </button>
              <button type="button" onClick={()=>setBibliotecaTipo("gemas")} className={"flex-1 rounded-lg py-2.5 text-[9px] font-semibold uppercase tracking-[.12em] transition "+(bibliotecaTipo==="gemas"?"bg-gold/10 text-gold shadow-sm":"text-white/40 hover:text-white")}>
                Gemas
              </button>
            </div>

            {bibliotecaTipo==="metales"&&<div className="space-y-5">
              {(["Oro Amarillo","Oro Blanco","Oro Rosa","Plata","Platino"] as MaterialGrupo[]).map(grupo=><div key={grupo}>
                <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-[.18em] text-white/30">{grupo}</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {MATERIALES.filter(m=>m.grupo===grupo).map(m=><button key={m.id} type="button" title={m.nombre} aria-label={m.nombre} onClick={()=>{setMaterialId(m.id); apiRef.current?.material(m)}} className={"group rounded-xl p-1.5 transition "+(materialId===m.id?"bg-gold/10 ring-1 ring-gold":"hover:bg-white/[.04]")}>
                    <span className="mx-auto block size-12 rounded-full border border-white/15 shadow-[inset_3px_3px_7px_rgba(255,255,255,.3),inset_-4px_-4px_8px_rgba(0,0,0,.38),0_4px_12px_rgba(0,0,0,.28)]" style={{background:"radial-gradient(circle at 30% 24%,#fff 0%,#"+m.color.toString(16).padStart(6,"0")+" 28%,#"+m.color.toString(16).padStart(6,"0")+" 62%,#08090a 100%)"}}/>
                    <span className="mt-1.5 block truncate text-center text-[8px] font-medium text-white/65 group-hover:text-white">{m.nombre}</span>
                  </button>)}
                </div>
              </div>)}
            </div>}

            {bibliotecaTipo==="gemas"&&<div>
              <div className="mb-3 rounded-xl border border-white/8 bg-white/[.018] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Gem className="size-3.5 text-gold"/>
                  <div>
                    <p className="text-[10px] font-semibold text-white/75">Biblioteca de Gemas</p>
                    <p className="text-[9px] text-white/35">{parteSeleccionada?(`Selecciona una gema para ${parteSeleccionadaNombre||"la pieza"}`):"Selecciona primero una piedra en el modelo"}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {GEMAS.map(g=><GemSwatch key={g.id} g={g} selected={gemaId===g.id} onClick={()=>{setGemaId(g.id); if(parteSeleccionadaCategoria==="gema") apiRef.current?.gema(g);}}/>)}
              </div>
              <p className="mt-4 text-center text-[8px] uppercase tracking-[.14em] text-white/20">Materiales ópticos · PBR · Refracción</p>
            </div>}
          </div>}
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