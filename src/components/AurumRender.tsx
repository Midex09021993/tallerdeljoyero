import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyAurumMetal, applyAurumGem, metalPresetFromConfig, gemPresetFromConfig } from "../lib/aurum-material-engine";
import { getAurumGemPreset, createAurumInclusionConfig, generateAurumInclusionPoints, getAurumOpticalProfile, applyAurumOpticalProfile, applyAurumDiamondOptics } from "../lib/aurum-material-engine";
import { getAurumScenePreset, getAurumRenderQuality, AURUM_HDRI_GROUND_DEFAULT } from "../lib/aurum-scene-engine";
import { getAurumShadowConfig } from "../lib/aurum-shadow-engine";
import { getAurumPostConfig } from "../lib/aurum-post-engine";
import { getAurumSsaoConfig } from "../lib/aurum-ssao-engine";
import { AURUM_LIGHTING_DEFAULT } from "../lib/aurum-lighting-engine";
import { Camera, ChevronDown, Download, Expand, Gem, Grid3X3, Image as ImageIcon, Maximize2, RotateCcw, RotateCw, SlidersHorizontal, Sparkles, Upload, X, Box } from "lucide-react";

type MaterialId =
  | "oro18a_pulido" | "oro18a_satinado" | "oro18a_mate" | "oro18a_cepillado"
  | "oro18b_rodinado" | "oro18b_pulido" | "oro18b_mate"
  | "oro18r_pulido" | "oro18r_satinado" | "oro18r_mate"
  | "plata925_pulida" | "plata950_pulida" | "plata970_pulida" | "plata_envejecida"
  | "platino_pulido" | "platino_mate";
type EscenarioId = "oscuro" | "claro" | "luxury" | "marmol" | "transparente";
type VistaId = "perspectiva" | "frontal" | "superior" | "lateral";
type IluminacionId = "studioSoft" | "studioHard" | "jewelry" | "luxury";

type MaterialGrupo = "Oro Amarillo" | "Oro Blanco" | "Oro Rosa" | "Plata" | "Platino" | "Especiales";
type CategoriaParte = "metal" | "gema" | "otro";
type GemaId =
  | "diamante_natural" | "diamante_vs" | "diamante_inclusiones"
  | "zafiro_azul" | "zafiro_intenso" | "zafiro_inclusiones"
  | "rubi_natural" | "rubi_sangre_pichon" | "rubi_inclusiones"
  | "esmeralda_1" | "esmeralda_2" | "esmeralda_3" | "esmeralda_inclusiones"
  | "moissanita_blanca" | "moissanita_brillante"
  | "citrino_natural" | "citrino_intenso"
  | "amatista_natural" | "amatista_intensa"
  | "topacio_azul" | "topacio_imperial";
type GemaConfig = {
  id:GemaId; familia:string; nombre:string; color:number; transmission:number; ior:number; roughness:number; envMapIntensity:number;
  attenuationColor:number; attenuationDistance:number; dispersion:number; iridescence:number;
  inclusionStyle:"ninguna"|"diamante"|"silk"|"velos"; inclusionStrength:number;
};
type MaterialConfig = { id: MaterialId; grupo: MaterialGrupo; nombre: string; color: number; metalness: number; roughness: number; envMapIntensity: number; clearcoat: number; anisotropy?: number; anisotropyRotation?: number };
type ParteModelo = { id: string; nombre: string; tipo: "grupo" | "malla"; nivel: number; capa?: string; colorCapa?: string; categoria: CategoriaParte };
const GEMAS: GemaConfig[] = [
  // Perfil óptico propio de AURUM RENDER. El diamante real tiene RI ~2.42 y
  // dispersión ~0.044; MeshPhysicalMaterial limita IOR a 2.333, por lo que
  // usamos el máximo soportado y una dispersión contenida para evitar arcoíris artificiales.
  { id:"diamante_natural", familia:"Diamante", nombre:"Diamante Natural", color:0xfafcff, transmission:.985, ior:2.333, roughness:.009, envMapIntensity:5.4, attenuationColor:0xf9fcff, attenuationDistance:22, dispersion:.22, iridescence:.008, inclusionStyle:"diamante", inclusionStrength:.08 },
  { id:"diamante_vs", familia:"Diamante", nombre:"Diamante VS", color:0xfcfdff, transmission:.99, ior:2.333, roughness:.006, envMapIntensity:5.8, attenuationColor:0xfbfdff, attenuationDistance:32, dispersion:.24, iridescence:.006, inclusionStyle:"diamante", inclusionStrength:.035 },
  { id:"diamante_inclusiones", familia:"Diamante", nombre:"Diamante · Inclusiones", color:0xf5f9ff, transmission:.975, ior:2.333, roughness:.014, envMapIntensity:5.0, attenuationColor:0xf2f7ff, attenuationDistance:13, dispersion:.20, iridescence:.01, inclusionStyle:"diamante", inclusionStrength:.22 },
  { id:"zafiro_azul", familia:"Zafiro", nombre:"Zafiro Azul Natural", color:0x174a9e, transmission:.9, ior:1.77, roughness:.025, envMapIntensity:4.1, attenuationColor:0x123d91, attenuationDistance:2.4, dispersion:.12, iridescence:.015, inclusionStyle:"silk", inclusionStrength:.08 },
  { id:"zafiro_intenso", familia:"Zafiro", nombre:"Zafiro Azul Intenso", color:0x0d2f78, transmission:.86, ior:1.77, roughness:.03, envMapIntensity:4.3, attenuationColor:0x08265f, attenuationDistance:1.55, dispersion:.1, iridescence:.01, inclusionStyle:"silk", inclusionStrength:.05 },
  { id:"zafiro_inclusiones", familia:"Zafiro", nombre:"Zafiro · Inclusiones", color:0x194a96, transmission:.88, ior:1.77, roughness:.035, envMapIntensity:3.9, attenuationColor:0x123a82, attenuationDistance:2, dispersion:.1, iridescence:.015, inclusionStyle:"silk", inclusionStrength:.24 },
  { id:"rubi_natural", familia:"Rubí", nombre:"Rubí Natural", color:0x9e1020, transmission:.88, ior:1.77, roughness:.028, envMapIntensity:4.1, attenuationColor:0x65070f, attenuationDistance:2.2, dispersion:.11, iridescence:.012, inclusionStyle:"silk", inclusionStrength:.1 },
  { id:"rubi_sangre_pichon", familia:"Rubí", nombre:"Rubí · Sangre de Pichón", color:0x8f0b18, transmission:.9, ior:1.77, roughness:.022, envMapIntensity:4.5, attenuationColor:0x57040b, attenuationDistance:2.7, dispersion:.12, iridescence:.01, inclusionStyle:"silk", inclusionStrength:.06 },
  { id:"rubi_inclusiones", familia:"Rubí", nombre:"Rubí · Inclusiones", color:0x86101b, transmission:.86, ior:1.77, roughness:.038, envMapIntensity:3.8, attenuationColor:0x4f050c, attenuationDistance:1.8, dispersion:.1, iridescence:.012, inclusionStyle:"silk", inclusionStrength:.26 },
  { id:"esmeralda_1", familia:"Esmeralda", nombre:"Esmeralda · Calidad 1", color:0x087c4a, transmission:.83, ior:1.58, roughness:.032, envMapIntensity:4.2, attenuationColor:0x075a36, attenuationDistance:1.8, dispersion:.08, iridescence:.008, inclusionStyle:"velos", inclusionStrength:.08 },
  { id:"esmeralda_2", familia:"Esmeralda", nombre:"Esmeralda · Calidad 2", color:0x087047, transmission:.78, ior:1.58, roughness:.045, envMapIntensity:3.9, attenuationColor:0x064b31, attenuationDistance:1.35, dispersion:.07, iridescence:.006, inclusionStyle:"velos", inclusionStrength:.16 },
  { id:"esmeralda_3", familia:"Esmeralda", nombre:"Esmeralda · Calidad 3", color:0x075b3d, transmission:.72, ior:1.58, roughness:.06, envMapIntensity:3.6, attenuationColor:0x043c29, attenuationDistance:1, dispersion:.06, iridescence:.005, inclusionStyle:"velos", inclusionStrength:.24 },
  { id:"esmeralda_inclusiones", familia:"Esmeralda", nombre:"Esmeralda · Inclusiones", color:0x075f3e, transmission:.75, ior:1.58, roughness:.052, envMapIntensity:3.7, attenuationColor:0x043e29, attenuationDistance:1.1, dispersion:.065, iridescence:.006, inclusionStyle:"velos", inclusionStrength:.34 },
  { id:"moissanita_blanca", familia:"Moissanita", nombre:"Moissanita Blanca", color:0xf4f8ff, transmission:.96, ior:2.65, roughness:.016, envMapIntensity:5.1, attenuationColor:0xf6faff, attenuationDistance:10, dispersion:.9, iridescence:.06, inclusionStyle:"diamante", inclusionStrength:.04 },
  { id:"moissanita_brillante", familia:"Moissanita", nombre:"Moissanita · Brillante", color:0xeaf3ff, transmission:.955, ior:2.65, roughness:.012, envMapIntensity:5.5, attenuationColor:0xf2f8ff, attenuationDistance:12, dispersion:1, iridescence:.08, inclusionStyle:"diamante", inclusionStrength:.02 },
  { id:"citrino_natural", familia:"Citrino", nombre:"Citrino Natural", color:0xd49a22, transmission:.86, ior:1.54, roughness:.035, envMapIntensity:3.7, attenuationColor:0xa96d0c, attenuationDistance:2.5, dispersion:.045, iridescence:.005, inclusionStyle:"velos", inclusionStrength:.08 },
  { id:"citrino_intenso", familia:"Citrino", nombre:"Citrino Intenso", color:0xb8780b, transmission:.8, ior:1.54, roughness:.045, envMapIntensity:3.6, attenuationColor:0x8b5307, attenuationDistance:1.7, dispersion:.04, iridescence:.004, inclusionStyle:"velos", inclusionStrength:.14 },
  { id:"amatista_natural", familia:"Amatista", nombre:"Amatista Natural", color:0x7650b9, transmission:.86, ior:1.55, roughness:.035, envMapIntensity:3.8, attenuationColor:0x57358f, attenuationDistance:2.3, dispersion:.045, iridescence:.005, inclusionStyle:"velos", inclusionStrength:.08 },
  { id:"amatista_intensa", familia:"Amatista", nombre:"Amatista Intensa", color:0x5b319c, transmission:.8, ior:1.55, roughness:.045, envMapIntensity:3.6, attenuationColor:0x3f2076, attenuationDistance:1.7, dispersion:.04, iridescence:.004, inclusionStyle:"velos", inclusionStrength:.13 },
  { id:"topacio_azul", familia:"Topacio", nombre:"Topacio Azul", color:0x65b9e8, transmission:.92, ior:1.63, roughness:.025, envMapIntensity:4.2, attenuationColor:0x4d9acb, attenuationDistance:3.5, dispersion:.055, iridescence:.008, inclusionStyle:"velos", inclusionStrength:.05 },
  { id:"topacio_imperial", familia:"Topacio", nombre:"Topacio Imperial", color:0xd79b4b, transmission:.88, ior:1.63, roughness:.032, envMapIntensity:4, attenuationColor:0xa96722, attenuationDistance:2.5, dispersion:.05, iridescence:.006, inclusionStyle:"velos", inclusionStrength:.08 },
];

const MATERIALES: MaterialConfig[] = [
  { id: "oro18a_pulido", grupo: "Oro Amarillo", nombre: "Pulido", color: 0xd7ad48, metalness: 1, roughness: .12, envMapIntensity: 1.9, clearcoat: .45, anisotropy: .05 },
  { id: "oro18a_satinado", grupo: "Oro Amarillo", nombre: "Satinado", color: 0xd2aa55, metalness: 1, roughness: .28, envMapIntensity: 1.65, clearcoat: .20, anisotropy: .2 },
  { id: "oro18a_mate", grupo: "Oro Amarillo", nombre: "Mate", color: 0xc7a45a, metalness: 1, roughness: .52, envMapIntensity: 1.35, clearcoat: .06, anisotropy: .35 },
  { id: "oro18a_cepillado", grupo: "Oro Amarillo", nombre: "Cepillado", color: 0xcfa94e, metalness: 1, roughness: .38, envMapIntensity: 1.55, clearcoat: .10, anisotropy: .72, anisotropyRotation: .18 },
  { id: "oro18b_rodinado", grupo: "Oro Blanco", nombre: "Rodinado", color: 0xe9edf2, metalness: 1, roughness: .09, envMapIntensity: 2.0, clearcoat: .48, anisotropy: .04 },
  { id: "oro18b_pulido", grupo: "Oro Blanco", nombre: "Pulido", color: 0xdfe3e8, metalness: 1, roughness: .13, envMapIntensity: 1.85, clearcoat: .40, anisotropy: .05 },
  { id: "oro18b_mate", grupo: "Oro Blanco", nombre: "Mate", color: 0xcbd0d5, metalness: 1, roughness: .5, envMapIntensity: 1.75, clearcoat: .08 },
  { id: "oro18r_pulido", grupo: "Oro Rosa", nombre: "Pulido", color: 0xd9937e, metalness: 1, roughness: .12, envMapIntensity: 1.9, clearcoat: .42, anisotropy: .05 },
  { id: "oro18r_satinado", grupo: "Oro Rosa", nombre: "Satinado", color: 0xd58f7b, metalness: 1, roughness: .29, envMapIntensity: 1.6, clearcoat: .20, anisotropy: .18 },
  { id: "oro18r_mate", grupo: "Oro Rosa", nombre: "Mate", color: 0xc98573, metalness: 1, roughness: .5, envMapIntensity: 1.35, clearcoat: .06 },
  { id: "plata925_pulida", grupo: "Plata", nombre: "Plata 925 Pulida", color: 0xd7dbe0, metalness: 1, roughness: .1, envMapIntensity: 2.0, clearcoat: .40 },
  { id: "plata950_pulida", grupo: "Plata", nombre: "Plata 950 Pulida", color: 0xcfd4d9, metalness: 1, roughness: .12, envMapIntensity: 1.9, clearcoat: .38 },
  { id: "plata970_pulida", grupo: "Plata", nombre: "Plata 970 Pulida", color: 0xe0e3e6, metalness: 1, roughness: .1, envMapIntensity: 2.0, clearcoat: .40 },
  { id: "plata_envejecida", grupo: "Plata", nombre: "Plata Envejecida", color: 0x777c82, metalness: .92, roughness: .4, envMapIntensity: 1.65, clearcoat: .08, anisotropy: .08 },
  { id: "platino_pulido", grupo: "Platino", nombre: "Pulido", color: 0xc5cbd0, metalness: 1, roughness: .1, envMapIntensity: 1.95, clearcoat: .42 },
  { id: "platino_mate", grupo: "Platino", nombre: "Mate", color: 0xaeb4ba, metalness: 1, roughness: .48, envMapIntensity: 1.35, clearcoat: .06 },
  // Materiales especiales para presentaciones profesionales y configuraciones premium.
  { id: "oro24_pulido", grupo: "Especiales", nombre: "Oro 24K Pulido", color: 0xf2c94c, metalness: 1, roughness: .075, envMapIntensity: 3.25, clearcoat: .65 },
  { id: "oro18_champan", grupo: "Especiales", nombre: "Oro Champán", color: 0xd9b978, metalness: 1, roughness: .13, envMapIntensity: 2.8, clearcoat: .5 },
  { id: "oro18_verde", grupo: "Especiales", nombre: "Oro Verde", color: 0xb9bd72, metalness: 1, roughness: .14, envMapIntensity: 2.65, clearcoat: .48 },
  { id: "paladio_pulido", grupo: "Especiales", nombre: "Paladio Pulido", color: 0xd4d8dc, metalness: 1, roughness: .09, envMapIntensity: 3.05, clearcoat: .58 },
  { id: "rodio_negro", grupo: "Especiales", nombre: "Rodio Negro", color: 0x252a30, metalness: 1, roughness: .12, envMapIntensity: 1.8, clearcoat: .45 },
  { id: "titanio_pulido", grupo: "Especiales", nombre: "Titanio Pulido", color: 0x8d959d, metalness: .96, roughness: .16, envMapIntensity: 1.75, clearcoat: .34 },
];

const ESCENARIOS: { id: EscenarioId; nombre: string; clase: string; descripcion:string; iluminacion:IluminacionId }[] = [
  { id: "oscuro", nombre: "Estudio Oscuro", descripcion:"Contraste elegante", iluminacion:"jewelry", clase: "bg-[radial-gradient(circle_at_50%_35%,#2b2f35_0%,#101216_48%,#050608_100%)]" },
  { id: "claro", nombre: "Estudio Claro", descripcion:"Luz de joyería profesional", iluminacion:"jewelry", clase: "bg-[radial-gradient(circle_at_50%_30%,#ffffff_0%,#e8e6e1_58%,#c8c5bf_100%)]" },
  { id: "luxury", nombre: "Luxury", descripcion:"Presentación cálida", iluminacion:"luxury", clase: "bg-[radial-gradient(circle_at_50%_30%,#6b4a22_0%,#2b1b0d_42%,#100a06_100%)]" },
  { id: "marmol", nombre: "Mármol", descripcion:"Superficie premium", iluminacion:"studioSoft", clase: "bg-[linear-gradient(125deg,#f2f0eb,#bdbab3_42%,#e5e3de_44%,#c5c2bc_68%,#f0eee9)]" },
  { id: "transparente", nombre: "Transparente", descripcion:"Fondo sin entorno", iluminacion:"studioSoft", clase: "bg-[linear-gradient(45deg,#d9d9d9_25%,transparent_25%),linear-gradient(-45deg,#d9d9d9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#d9d9d9_75%),linear-gradient(-45deg,transparent_75%,#d9d9d9_75%)] bg-[length:14px_14px] bg-[position:0_0,0_7px,7px_-7px,-7px_0]" },
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
  const light = g.familia==="Diamante" || g.familia==="Moissanita" ? "#ffffff" : "#ffffff";
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
  const [materialId, setMaterialId] = useState<MaterialId>("oro18a_pulido"), [gemaId, setGemaId] = useState<GemaId>("diamante_natural"), [escenarioId, setEscenarioId] = useState<EscenarioId>("claro"), [iluminacionId, setIluminacionId] = useState<IluminacionId>("jewelry"), [vista, setVista] = useState<VistaId>("perspectiva");
  const [nombreProyecto, setNombreProyecto] = useState("Diseño de joyería");
  const [categoriaProyecto, setCategoriaProyecto] = useState("Anillo");
  const [captura, setCaptura] = useState<string | null>(null);
  const [parteSeleccionada, setParteSeleccionada] = useState<string | null>(null);
  const [parteSeleccionadaNombre, setParteSeleccionadaNombre] = useState<string | null>(null);
  const [parteSeleccionadaCapa, setParteSeleccionadaCapa] = useState<string | null>(null);
  const [parteSeleccionadaCategoria, setParteSeleccionadaCategoria] = useState<"metal" | "gema" | "otro">("otro");
  const [autoRotando, setAutoRotando] = useState(false);
  const [panel, setPanel] = useState<"materiales" | "escenas" | "iluminacion">("materiales");

  const materialActivo = useMemo(() => MATERIALES.find(m=>m.id===materialId)!, [materialId]);
  const gemaActiva = useMemo(() => GEMAS.find(g=>g.id===gemaId)!, [gemaId]);
  const [bibliotecaTipo, setBibliotecaTipo] = useState<"metales"|"gemas">("metales");
  const [groundVisible, setGroundVisible] = useState(true);
  const [shadowsVisible, setShadowsVisible] = useState(true);

  useEffect(() => {
    let vivo = true;
    let cleanup = () => {};
    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
      const { RGBELoader } = await import("three/examples/jsm/loaders/RGBELoader.js");
      const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
      const { EffectComposer } = await import("three/examples/jsm/postprocessing/EffectComposer.js");
      const { RenderPass } = await import("three/examples/jsm/postprocessing/RenderPass.js");
      const { SSAOPass } = await import("three/examples/jsm/postprocessing/SSAOPass.js");
      const nodo = visorRef.current;      if (!vivo || !nodo) return;
      const escena = new THREE.Scene();
      const camara = new THREE.PerspectiveCamera(38, 1, .001, 1000);
      const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, preserveDrawingBuffer:true, powerPreference:"high-performance" });
      // Render Pro se incorporará en una etapa posterior con el pipeline WebGPU
      // estable. Por ahora el visor WebGL interactivo es el motor oficial.
      const renderQuality = getAurumRenderQuality("balanced");
      const shadowConfig=getAurumShadowConfig();
      const postConfig=getAurumPostConfig();
      const ssaoConfig=getAurumSsaoConfig();
      renderer.setPixelRatio(Math.min(devicePixelRatio,renderQuality.pixelRatio));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.AgXToneMapping;
      // Exposición calibrada para evitar clipping de blancos en metales pulidos y HDRI de estudio.
      renderer.toneMappingExposure = 0.64;
      // Mantiene suficiente resolución para la transmisión de gemas sin convertirla
      // en un render pesado en equipos normales.
      (renderer as any).transmissionResolutionScale = renderQuality.transmissionScale;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.shadowMap.autoUpdate = true;
      renderer.domElement.className = "block h-full w-full";
      nodo.appendChild(renderer.domElement);
      let composer:any = null;
      let ssaoPass:any = null;
      try {
        composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(escena, camara);
        composer.addPass(renderPass);
        ssaoPass = new SSAOPass(escena, camara, 1, 1);
        ssaoPass.kernelRadius = ssaoConfig.radius;
        ssaoPass.minDistance = ssaoConfig.bias;
        ssaoPass.maxDistance = Math.max(.01, ssaoConfig.radius * 2.5);
        ssaoPass.enabled = ssaoConfig.enabled;
        composer.addPass(ssaoPass);
      } catch {
        composer = null;
        ssaoPass = null;
      }

      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      const fallbackEnvironment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
      let entorno = fallbackEnvironment;
      escena.environment = entorno;
      escena.environmentIntensity = 0.11;
      escena.environmentRotation.y = Math.PI * 0.16;
      // Biblioteca HDRI profesional. Cada preset usa un entorno distinto para que
      // los metales tengan reflejos largos y limpios y las gemas reciban luces
      // especulares naturales. RoomEnvironment permanece como fallback offline.
      const hdrUrls: Record<IluminacionId,string> = {
        studioSoft: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/white_studio_05_1k.hdr",
        studioHard: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr",
        jewelry: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/white_studio_04_1k.hdr",
        luxury: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr",
      };
      let entornoGema:any = null;
      const gemEnvironmentUrl = "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/white_studio_05_1k.hdr";
      const aplicarEntornoGema = () => {
        if (!modelo || !entornoGema) return;
        modelo.traverse((x:any) => {
          if (!x.isMesh || !x.material) return;
          const aplicar=(m:any)=>{
            if (!m?.userData?.aurumOpticalProfile) return m;
            m.envMap=entornoGema;
            const familia=m.userData.aurumOpticalProfile;
            m.envMapIntensity = familia==="Diamante" ? 1.55 : familia==="Esmeralda" ? 1.15 : 1.25;
            m.needsUpdate=true;
            return m;
          };
          x.material=Array.isArray(x.material)?x.material.map(aplicar):aplicar(x.material);
        });
      };
      const cargarEntornoGema = () => {
        new RGBELoader().load(gemEnvironmentUrl,(hdrTexture:any)=>{
          if (!vivo) { hdrTexture.dispose?.(); return; }
          try {
            const nuevo=pmrem.fromEquirectangular(hdrTexture).texture;
            hdrTexture.dispose?.();
            const anterior=entornoGema;
            entornoGema=nuevo;
            anterior?.dispose?.();
            aplicarEntornoGema();
          } catch { hdrTexture.dispose?.(); }
        },undefined,()=>{});
      };
      let hdrRequestId = 0;
      const cargarHDRI = (id:IluminacionId) => {
        const requestId = ++hdrRequestId;
        const url = hdrUrls[id] || hdrUrls.jewelry;
        new RGBELoader().load(url, (hdrTexture:any) => {
          if (!vivo || requestId !== hdrRequestId) { hdrTexture.dispose?.(); return; }
          try {
            const hdrEnvironment = pmrem.fromEquirectangular(hdrTexture).texture;
            hdrTexture.dispose?.();
            if (!vivo || requestId !== hdrRequestId) { hdrEnvironment.dispose?.(); return; }
            const anterior = entorno;
            entorno = hdrEnvironment;
            escena.environment = entorno;
            escena.environmentIntensity = 0.10;
            escena.environmentRotation.y = id === "luxury" ? Math.PI * .42 : id === "studioHard" ? Math.PI * .08 : Math.PI * .16;
            anterior?.dispose?.();
          } catch {
            hdrTexture.dispose?.();
          }
        }, undefined, () => {
          // Fallback silencioso: RoomEnvironment mantiene el visor funcional sin red.
        });
      };
      cargarHDRI("jewelry");
      escena.add(new THREE.HemisphereLight(0xfff8e8,0x332a24,0.16));
      const key = new THREE.DirectionalLight(0xffefc8,0.30);
      key.position.set(4,6,5); key.castShadow = true; key.shadow.mapSize.set(1024,1024); escena.add(key);
      const fill = new THREE.DirectionalLight(0xdbe7ff,0.10);
      fill.position.set(-5,3,4); escena.add(fill);
      const rim = new THREE.DirectionalLight(0xffd49a,0.18);
      rim.position.set(2,4,-5); escena.add(rim);
      const top = new THREE.PointLight(0xffffff,0.06,30);
      top.position.set(0,5,1); escena.add(top);
      const aplicarIluminacion = (id:IluminacionId) => {
        const presets:any = {
          studioSoft: {key:0.32,fill:0.10,rim:0.18,top:0.06,exposure:0.64,environment:0.11},
          studioHard: {key:0.42,fill:0.09,rim:0.22,top:0.06,exposure:0.66,environment:0.12},
          jewelry: {key:0.38,fill:0.11,rim:0.20,top:0.06,exposure:0.64,environment:0.11},
          luxury: {key:0.36,fill:0.08,rim:0.24,top:0.06,exposure:0.63,environment:0.10},
        }[id];
        key.intensity=presets.key; fill.intensity=presets.fill; rim.intensity=presets.rim; top.intensity=presets.top; renderer.toneMappingExposure=presets.exposure; escena.environmentIntensity=presets.environment;
        cargarHDRI(id);
      };

      const controles = new OrbitControls(camara,renderer.domElement);
      controles.enableDamping = true; controles.dampingFactor = .07; controles.enablePan = true; controles.enableRotate = true; controles.autoRotate = false; controles.autoRotateSpeed = 0.65;
      controles.minDistance = .15; controles.maxDistance = 100;


      let modelo:any = null;
      let hdriGround:any = null;
      let hdriGroundTexture:any = null;
      const hdriGroundConfig = {...AURUM_HDRI_GROUND_DEFAULT};
      const lightingStudio:any={...AURUM_LIGHTING_DEFAULT};
      const lucesAurum:any={};
      const configurarSombrasAurum=(L:any)=>{
        if(!L?.castShadow) return;
        L.shadow.mapSize.set(shadowConfig.mapSize,shadowConfig.mapSize);
        L.shadow.bias=shadowConfig.bias;
        L.shadow.normalBias=shadowConfig.normalBias;
        L.shadow.radius=shadowConfig.contact?shadowConfig.contactScale:1;
      };
      const crearLucesAurum=()=>{
        const mk=(tipo:string,color:number,cast:boolean)=>{
          const L=tipo==="spot"?new THREE.SpotLight(color,1,30,Math.PI*.45,.7,.8):new THREE.PointLight(color,1,30,2);
          L.castShadow=cast; escena.add(L); return L;
        };
        if(!lucesAurum.key){lucesAurum.key=mk("spot",0xffffff,true);lucesAurum.fill=mk("spot",0xffffff,true);lucesAurum.rim=mk("spot",0xffffff,true);lucesAurum.gem=mk("point",0xffffff,false);}
        const aplicar=(L:any,cfg:any)=>{L.visible=cfg.enabled;L.intensity=cfg.intensity;L.position.set(...cfg.position);if(L.angle!==undefined){L.angle=cfg.angle;L.penumbra=cfg.penumbra;}};
        aplicar(lucesAurum.key,lightingStudio.key); configurarSombrasAurum(lucesAurum.key); aplicar(lucesAurum.fill,lightingStudio.fill); configurarSombrasAurum(lucesAurum.fill); aplicar(lucesAurum.rim,lightingStudio.rim); configurarSombrasAurum(lucesAurum.rim); aplicar(lucesAurum.gem,lightingStudio.gem);
      };
      const actualizarLucesAurum=(patch:any)=>{
        Object.assign(lightingStudio,patch);
        const aplicar=(L:any,cfg:any)=>{if(!L||!cfg)return;L.visible=cfg.enabled;L.intensity=cfg.intensity;L.position.set(...cfg.position);if(L.angle!==undefined){L.angle=cfg.angle;L.penumbra=cfg.penumbra;}};
        aplicar(lucesAurum.key,lightingStudio.key); aplicar(lucesAurum.fill,lightingStudio.fill); aplicar(lucesAurum.rim,lightingStudio.rim); aplicar(lucesAurum.gem,lightingStudio.gem);
      };

      const sceneStudio={
        hdriGround:false, worldRadius:40, tripodHeight:1.2,
        originX:0, originY:0, originZ:0, opacity:1,
        environmentIntensity:1, exposure:.62, ground:true, shadows:true
      };
      const actualizarSceneStudio=(patch:any)=>{
        const next={...sceneStudio,...patch};
        Object.assign(sceneStudio,next);
        Object.assign(hdriGroundConfig,{
          enabled:next.hdriGround, worldRadius:next.worldRadius,
          tripodHeight:next.tripodHeight, originX:next.originX,
          originY:next.originY, originZ:next.originZ, opacity:next.opacity
        });
        escena.environmentIntensity=next.environmentIntensity;
        renderer.toneMappingExposure=next.exposure;
        if(suelo) suelo.visible=next.ground;
        renderer.shadowMap.enabled=next.shadows;
        actualizarHdriGround();
      };


      const crearHdriGround = () => {
        if (!hdriGroundTexture || !hdriGroundConfig.enabled) return;
        if (hdriGround) { escena.remove(hdriGround); hdriGround.geometry?.dispose?.(); }
        const r=Math.max(5,hdriGroundConfig.worldRadius);
        const geo=new THREE.SphereGeometry(r,64,32,0,Math.PI*2,0,Math.PI*.5);
        const mat=new THREE.MeshBasicMaterial({
          map:hdriGroundTexture,
          side:THREE.BackSide,
          transparent:true,
          opacity:hdriGroundConfig.opacity,
          depthWrite:false
        });
        hdriGround=new THREE.Mesh(geo,mat);
        hdriGround.position.set(hdriGroundConfig.originX,hdriGroundConfig.originY+hdriGroundConfig.tripodHeight,hdriGroundConfig.originZ);
        hdriGround.rotation.x=Math.PI;
        hdriGround.renderOrder=-10;
        escena.add(hdriGround);
      };

      const actualizarHdriGround=()=>{
        if(!hdriGroundConfig.enabled){
          if(hdriGround){escena.remove(hdriGround);hdriGround=null;}
          return;
        }
        crearHdriGround();
      };

      let suelo:any = null;
      let glbInterno:Blob|null = null;
      let parteActiva:any = null;
      let resaltado:any = null;
      const material = new THREE.MeshPhysicalMaterial({
        color: 0xd7ad48, metalness: 1, roughness: .12, envMapIntensity: 1.9, clearcoat: .45, clearcoatRoughness: .08
      });

      const dispose = (o:any) => o?.traverse((x:any) => {
        if (x.geometry) x.geometry.dispose();
        if (Array.isArray(x.material)) x.material.forEach((m:any)=>m.dispose?.());
        else x.material?.dispose?.();
      });
      const quitar = () => {        if (modelo) { escena.remove(modelo); dispose(modelo); modelo=null; }
        if (suelo) { escena.remove(suelo); suelo.geometry.dispose(); suelo.material.dispose(); suelo=null; }
        glbInterno = null;
      };
      const configurarMaterial = (mat:any, m:MaterialConfig) => {
        applyAurumMetal(mat, metalPresetFromConfig(m));
      };
      const limpiarInclusiones = (target:any) => {
        const quitar:any[] = [];
        target?.traverse?.((child:any) => { if (child.userData?.aurumInternalInclusion) quitar.push(child); });
        quitar.forEach((child:any) => { child.parent?.remove(child); child.geometry?.dispose?.(); child.material?.dispose?.(); });
      };
      const crearInclusiones = (target:any, g:GemaConfig) => {
        limpiarInclusiones(target);
        const preset = getAurumGemPreset(g.id as string);
        const inclusionConfig = createAurumInclusionConfig(preset, 9173);
        // Compatibilidad con configuraciones antiguas: solo crea inclusiones cuando
        // el preset o la configuración existente las solicita.
        const enabled = preset.inclusions || (!!g.inclusionStrength && g.inclusionStyle!=="ninguna");
        if (!enabled || inclusionConfig.density<=0) return;

        const box = new THREE.Box3().setFromObject(target);
        const size = box.getSize(new THREE.Vector3());
        const minSize = Math.max(Math.min(size.x,size.y,size.z),0.001);
        const points = generateAurumInclusionPoints(inclusionConfig,56);

        points.forEach((p:any) => {
          const material = new THREE.MeshPhysicalMaterial({
            color: inclusionConfig.color,
            metalness: 0,
            roughness: inclusionConfig.type==="silk" ? .34 : .22,
            transmission: inclusionConfig.type==="crystal" ? .48 : .10,
            transparent: true,
            opacity: p.opacity,
            depthWrite: false,
            envMapIntensity: .75
          });
          let geometry:THREE.BufferGeometry;
          if (inclusionConfig.type==="needle" || inclusionConfig.type==="silk") {
            geometry = new THREE.CylinderGeometry(p.size*.16,p.size*.16,p.size*3.2,5);
          } else if (inclusionConfig.type==="feather" || inclusionConfig.type==="veil") {
            geometry = new THREE.TetrahedronGeometry(p.size*1.6,0);
          } else {
            geometry = new THREE.IcosahedronGeometry(p.size,1);
          }
          const inclusion = new THREE.Mesh(geometry,material);
          inclusion.position.set(p.x*size.x*.46,p.y*size.y*.46,p.z*size.z*.46);
          inclusion.rotation.set(p.y*3.1,p.z*4.7,p.x*5.3);
          if (inclusionConfig.type==="silk" || inclusionConfig.type==="needle") {
            inclusion.scale.set(1,1,.35);
          }
          inclusion.userData.aurumInternalInclusion=true;
          inclusion.userData.aurumInclusionType=inclusionConfig.type;
          inclusion.userData.aurumInclusionSeed=inclusionConfig.seed;
          inclusion.renderOrder=12;
          target.add(inclusion);
        });
      };
      const aplicarGema = (g:GemaConfig, objetivo?:any) => {
        const target=objetivo||parteActiva; if(!target) return;
        const box = new THREE.Box3().setFromObject(target);
        const size = box.getSize(new THREE.Vector3());
        const thickness = Math.max(0.015, Math.min(size.x,size.y,size.z) * 0.85);
        const aplicar = (base:any) => {
          const nuevo = base?.clone ? base.clone() : new THREE.MeshPhysicalMaterial();
          const presetId = g.id as string;
          const motorPreset = getAurumGemPreset(presetId);
          applyAurumGem(nuevo, motorPreset, thickness);
                    applyAurumOpticalProfile(nuevo, getAurumOpticalProfile(motorPreset.familia));
                    if (motorPreset.familia==="Diamante") applyAurumDiamondOptics(nuevo);
                    return nuevo;
        };
        target.material=Array.isArray(target.material)?target.material.map((base:any)=>aplicar(base)):aplicar(target.material);
        crearInclusiones(target,g);
        aplicarEntornoGema();
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
        const cfg = ESCENARIOS.find(e=>e.id===id) || ESCENARIOS[0];
        const scenePreset = getAurumScenePreset(id);
        renderer.toneMappingExposure = scenePreset.exposure * postConfig.exposure / .62;
        escena.environmentIntensity = scenePreset.environmentIntensity;
        escena.environmentRotation.y = Math.PI * scenePreset.environmentRotation;
        // Set de estudio profesional disponible desde el inicio, incluso sin modelo cargado.
        if (!suelo) {
          suelo = new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:0xc9c7c2,metalness:.02,roughness:.4}));
          suelo.rotation.x=-Math.PI/2; suelo.position.y=-0.02; suelo.receiveShadow=true; escena.add(suelo);
        }
        if (id==="transparente") { escena.background=null; renderer.setClearColor(0,0); }
        else {
          renderer.setClearColor(0,1);
          const fondos:any={oscuro:0x090b0e,claro:0xc4c5c7,luxury:0x21150c,marmol:0xc9c6bf};
          escena.background = new THREE.Color(fondos[id]);
        }
        if (suelo) {
          suelo.visible = scenePreset.groundVisible;
          suelo.material.color.setHex(scenePreset.ground);
          suelo.material.roughness = scenePreset.groundRoughness;
          suelo.material.metalness = scenePreset.groundMetalness;
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
        // Rhino trabaja con Z como eje vertical, mientras que AURUM RENDER/Three.js        // usa Y como eje vertical. Convertimos únicamente los 3DM para conservar
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
            const gemaBox = new THREE.Box3().setFromObject(x); const gemaSize = gemaBox.getSize(new THREE.Vector3());
            applyAurumGem(m, gemPresetFromConfig(g), Math.min(gemaSize.x,gemaSize.y,gemaSize.z)*.85, g.familia);
            x.material=m; crearInclusiones(x,g); aplicarEntornoGema();
          } else if (meta?.categoria==="metal") {
            const m=MATERIALES[0];
            const mat=x.material?.clone ? x.material.clone() : new THREE.MeshPhysicalMaterial();
            configurarMaterial(mat,m); x.material=mat;
          } else {
            x.material=material;
          }
        });
        modelo=interno;
        setParteSeleccionada(null);
        setParteSeleccionadaNombre(null); setParteSeleccionadaCapa(null); setParteSeleccionadaCategoria("otro");
        parteActiva=null;
        limpiarResaltado();
        glbInterno=new Blob([glb],{type:"model/gltf-binary"});
        escena.add(modelo);
        if (ext!=="3dm") aplicarMaterial(materialActivo);
      };
      const camaraVista=(id:VistaId)=>{
        const p:any={perspectiva:[3.5,2.4,4.6],frontal:[0,0,5],superior:[0,5,.001],lateral:[5,0,0]}[id];
      };
      apiRef.current={
        cargar,
        material:aplicarMaterial,
        gema:aplicarGema,
        escenario:aplicarEscenario,
        hdriGround:(config:any={})=>{
          Object.assign(hdriGroundConfig,config);
          actualizarHdriGround();
        },
        iluminacion:aplicarIluminacion,
        sceneStudio:(patch:any)=>actualizarSceneStudio(patch),
        reset:()=>{ controles.autoRotate=false; setAutoRotando(false); encuadrar(); },
         autoRotar:(activo:boolean)=>{ controles.autoRotate=activo; controles.autoRotateSpeed=0.65; setAutoRotando(activo); },
        capturar:()=>{composer?.render();return renderer.domElement.toDataURL("image/png")},
        limpiar:()=>{quitar();parteActiva=null;limpiarResaltado();setParteSeleccionada(null);setParteSeleccionadaNombre(null);},
    partes:()=>modelo?obtenerPartes(modelo):[],
    seleccionarParte:(id:string)=>{
          if (!id) { parteActiva=null; setParteSeleccionada(null); setParteSeleccionadaNombre(null); limpiarResaltado(); return; }
          let encontrado:any=null;
          modelo?.traverse((x:any)=>{if(x.uuid===id) encontrado=x;});
          if(encontrado) seleccionarMalla(encontrado);
        },
        fullscreen:()=>nodo.requestFullscreen?.(),
        vista:camaraVista,
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
        limpiarResaltado();        if (obj.geometry) {
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
        modelo.traverse((x:any) => { if (x.isMesh && x.visible && !x.userData?.aurumInternalInclusion) objetivos.push(x); });
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

      const resize=()=>{const w=nodo.clientWidth||900,h=nodo.clientHeight||600;camara.aspect=w/h;camara.updateProjectionMatrix();renderer.setSize(w,h,false);composer?.setSize(w,h);ssaoPass?.setSize?.(w,h)};
      resize();
      const obs=new ResizeObserver(resize); obs.observe(nodo);
      let frame=0;
      const animate=()=>{
        frame=requestAnimationFrame(animate);
        controles.update();
        if (composer) composer.render(); else renderer.render(escena,camara);
      };
      animate();
    })().catch(e=>vivo&&setError(e?.message||"No se pudo iniciar AURUM RENDER"));
    return()=>{vivo=false;cancelAnimationFrame(frame);composer?.dispose?.();cleanup()};
  },[]);
  useEffect(()=>apiRef.current?.material(materialActivo),[materialActivo]);
  useEffect(()=>apiRef.current?.escenario(escenarioId),[escenarioId]);
  useEffect(()=>apiRef.current?.iluminacion(iluminacionId),[iluminacionId]);
  useEffect(()=>apiRef.current?.vista(vista),[vista]);

  const cargarArchivo=useCallback(async(file:File)=>{setCargando(true);setError(null);setPaso("Procesando archivo...");try{const r=await apiRef.current?.cargar(file,(p:string)=>setPaso(p));setArchivo(file.name);setFormatoInterno("GLB");setTamanoGlb(r?.size??null);setCaptura(null)}catch(e){setError(e instanceof Error?e.message:"No se pudo convertir el modelo");setArchivo(null);setFormatoInterno(null);setTamanoGlb(null)}finally{setCargando(false);setPaso(null)}},[]);
  const limpiar=()=>{apiRef.current?.limpiar();setArchivo(null);setFormatoInterno(null);setTamanoGlb(null);setCaptura(null);setPaso(null);if(fileRef.current)fileRef.current.value=""};
  const capturarImagen=()=>{const d=apiRef.current?.capturar();if(d)setCaptura(d)};

  const hexColor = (c:number) => "#" + c.toString(16).padStart(6, "0");
  const lightingPanel=(
    <div style={{position:"absolute",right:16,top:330,zIndex:30,width:270,padding:14,borderRadius:14,background:"rgba(12,14,18,.94)",color:"#fff",boxShadow:"0 12px 35px rgba(0,0,0,.35)",border:"1px solid rgba(255,255,255,.10)",fontFamily:"Inter,system-ui"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{fontWeight:700,fontSize:14}}>AURUM LIGHTING STUDIO</div>
        <button type="button" aria-label="Cerrar" onClick={()=>setLightingOpen(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,.5)",cursor:"pointer"}}><X className="size-4"/></button>
      </div>
      <label style={{display:"flex",justifyContent:"space-between",fontSize:12}}>Key <input type="checkbox" checked={lightingStudio.key.enabled} onChange={e=>actualizarLucesAurum({key:{...lightingStudio.key,enabled:e.target.checked}})}/></label>
      <label style={{display:"block",fontSize:11}}>Key intensity<input style={{width:"100%"}} type="range" min="0" max="4" step=".05" value={lightingStudio.key.intensity} onChange={e=>actualizarLucesAurum({key:{...lightingStudio.key,intensity:+e.target.value}})}/></label>
      <label style={{display:"flex",justifyContent:"space-between",fontSize:12}}>Fill <input type="checkbox" checked={lightingStudio.fill.enabled} onChange={e=>actualizarLucesAurum({fill:{...lightingStudio.fill,enabled:e.target.checked}})}/></label>
      <label style={{display:"block",fontSize:11}}>Fill intensity<input style={{width:"100%"}} type="range" min="0" max="3" step=".05" value={lightingStudio.fill.intensity} onChange={e=>actualizarLucesAurum({fill:{...lightingStudio.fill,intensity:+e.target.value}})}/></label>
      <label style={{display:"flex",justifyContent:"space-between",fontSize:12}}>Rim <input type="checkbox" checked={lightingStudio.rim.enabled} onChange={e=>actualizarLucesAurum({rim:{...lightingStudio.rim,enabled:e.target.checked}})}/></label>
      <label style={{display:"block",fontSize:11}}>Rim intensity<input style={{width:"100%"}} type="range" min="0" max="3" step=".05" value={lightingStudio.rim.intensity} onChange={e=>actualizarLucesAurum({rim:{...lightingStudio.rim,intensity:+e.target.value}})}/></label>
      <label style={{display:"flex",justifyContent:"space-between",fontSize:12}}>Gem Light <input type="checkbox" checked={lightingStudio.gem.enabled} onChange={e=>actualizarLucesAurum({gem:{...lightingStudio.gem,enabled:e.target.checked}})}/></label>
      <label style={{display:"block",fontSize:11}}>Gem intensity<input style={{width:"100%"}} type="range" min="0" max="2" step=".05" value={lightingStudio.gem.intensity} onChange={e=>actualizarLucesAurum({gem:{...lightingStudio.gem,intensity:+e.target.value}})}/></label>
    </div>
  );
  const sceneStudioPanel=(
    <div style={{position:"absolute",right:16,top:70,zIndex:30,width:270,padding:14,borderRadius:14,background:"rgba(12,14,18,.94)",color:"#fff",boxShadow:"0 12px 35px rgba(0,0,0,.35)",border:"1px solid rgba(255,255,255,.10)",fontFamily:"Inter,system-ui"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{fontWeight:700,fontSize:14}}>AURUM SCENE STUDIO</div>
        <button type="button" aria-label="Cerrar" onClick={()=>setSceneStudioOpen(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,.5)",cursor:"pointer"}}><X className="size-4"/></button>
      </div>
      <label style={{display:"flex",justifyContent:"space-between",fontSize:12}}>Suelo HDRi <input type="checkbox" checked={sceneStudio.hdriGround} onChange={e=>actualizarSceneStudio({hdriGround:e.target.checked})}/></label>
      <label style={{display:"flex",justifyContent:"space-between",fontSize:12}}>Suelo visible <input type="checkbox" checked={sceneStudio.ground} onChange={e=>actualizarSceneStudio({ground:e.target.checked})}/></label>
      <label style={{display:"flex",justifyContent:"space-between",fontSize:12}}>Sombras <input type="checkbox" checked={sceneStudio.shadows} onChange={e=>actualizarSceneStudio({shadows:e.target.checked})}/></label>
      <label style={{display:"block",fontSize:11}}>Exposición<input style={{width:"100%"}} type="range" min="0" max="2" step=".01" value={sceneStudio.exposure} onChange={e=>actualizarSceneStudio({exposure:+e.target.value})}/></label>
      <label style={{display:"block",fontSize:11}}>Intensidad del entorno<input style={{width:"100%"}} type="range" min="0" max="3" step=".05" value={sceneStudio.environmentIntensity} onChange={e=>actualizarSceneStudio({environmentIntensity:+e.target.value})}/></label>
      <label style={{display:"block",fontSize:11}}>Radio del entorno<input style={{width:"100%"}} type="range" min="5" max="80" step="1" value={sceneStudio.worldRadius} onChange={e=>actualizarSceneStudio({worldRadius:+e.target.value})}/></label>
    </div>
  );

  return (<>
    <button title="AURUM Scene Studio" onClick={()=>setSceneStudioOpen((v:boolean)=>!v)} style={{position:"absolute",right:16,top:16,zIndex:31,width:42,height:42,borderRadius:12,border:"1px solid rgba(255,255,255,.14)",background:"rgba(15,17,22,.9)",color:"#fff",cursor:"pointer"}}>☼</button>
        <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-[#070809] text-white">
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
      <aside className="hidden w-[250px] shrink-0 flex-col border-r border-white/10 bg-[#0b0d0f]/96 shadow-2xl backdrop-blur-xl lg:flex">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-[.18em] text-white/35">Configuración del proyecto</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[.025]">
            <div className="relative aspect-[4/3] overflow-hidden bg-[#17191c]">
              {captura ? <img src={captura} alt="Vista previa del proyecto" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><div className="grid size-14 place-items-center rounded-2xl border border-gold/20 bg-gold/10 text-gold"><Gem className="size-6"/></div></div>}
              {archivo && <span className="absolute bottom-2 left-2 rounded-md border border-white/10 bg-black/65 px-2 py-1 text-[8px] text-white/60 backdrop-blur">Vista 3D</span>}
            </div>
            <button type="button" onClick={capturarImagen} disabled={!archivo} className="flex h-9 w-full items-center justify-center gap-2 border-t border-white/10 text-[9px] font-semibold uppercase tracking-wider text-white/55 transition hover:bg-gold/10 hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"><Camera className="size-3.5"/> Actualizar vista</button>
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[.15em] text-white/35">Nombre del diseño</label>
            <input value={nombreProyecto} onChange={e=>setNombreProyecto(e.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-white/[.025] px-3 text-xs text-white outline-none transition placeholder:text-white/20 focus:border-gold/50" placeholder="Nombre del diseño"/>
          </div>
          <div className="mt-3">
            <label className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[.15em] text-white/35">Tipo de joya</label>
            <select value={categoriaProyecto} onChange={e=>setCategoriaProyecto(e.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-[#121417] px-3 text-xs text-white outline-none focus:border-gold/50">
              {["Anillo","Arete","Collar","Pulsera","Dije","Brazalete","Otro"].map(v=><option key={v}>{v}</option>)}
            </select>
          </div>
          <div className="mt-3">
            <label className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[.15em] text-white/35">Archivo</label>
            <div className="rounded-lg border border-white/10 bg-white/[.02] px-3 py-2.5 text-[9px] text-white/45">{archivo || "Ningún modelo cargado"}</div>
          </div>
          <div className="mt-5 rounded-xl border border-gold/10 bg-gold/[.035] p-3">
            <p className="text-[9px] font-semibold uppercase tracking-[.15em] text-gold/75">Presentación</p>
            <p className="mt-1.5 text-[9px] leading-relaxed text-white/35">Prepara la pieza para visualizarla, cambiar materiales y presentar distintas opciones.</p>          </div>
        </div>
      </aside>
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
          <div className="absolute right-4 top-1/2 z-30 -translate-y-1/2">
            <div className="flex flex-col items-center gap-1 rounded-2xl border border-black/10 bg-white/90 p-1.5 shadow-[0_12px_35px_rgba(0,0,0,.18)] backdrop-blur-xl">
              <button type="button" title="Configuración" aria-label="Configuración" onClick={()=>setPanel("iluminacion")} className="grid size-10 place-items-center rounded-xl text-black/70 transition hover:bg-black/5 hover:text-black"><SlidersHorizontal className="size-[18px]"/></button>
              <button type="button" title="Reiniciar cámara" aria-label="Reiniciar cámara" onClick={()=>apiRef.current?.reset()} className="grid size-10 place-items-center rounded-xl text-black/70 transition hover:bg-black/5 hover:text-black"><RotateCcw className="size-[18px]"/></button>
              <button type="button" title={autoRotando?"Detener giro":"Girar cámara lentamente"} aria-label={autoRotando?"Detener giro":"Girar cámara lentamente"} onClick={()=>apiRef.current?.autoRotar(!autoRotando)} className={"grid size-10 place-items-center rounded-xl transition "+(autoRotando?"bg-gold/20 text-black":"text-black/70 hover:bg-black/5 hover:text-black")}><RotateCw className={"size-[18px] "+(autoRotando?"animate-spin":"")}/></button>
              <button type="button" title="Zoom Extents" aria-label="Zoom Extents" onClick={()=>apiRef.current?.reset()} className="grid size-10 place-items-center rounded-xl text-black/70 transition hover:bg-black/5 hover:text-black"><Maximize2 className="size-[18px]"/></button>
              <button type="button" title="Pantalla completa" aria-label="Pantalla completa" onClick={()=>apiRef.current?.fullscreen()} className="grid size-10 place-items-center rounded-xl text-black/70 transition hover:bg-black/5 hover:text-black"><Expand className="size-[18px]"/></button>
              <div className="my-0.5 h-px w-6 bg-black/10"/>
              <div className="my-0.5 h-px w-6 bg-black/10"/>
              <button type="button" title="Capturar imagen" aria-label="Capturar imagen" onClick={capturarImagen} className="grid size-10 place-items-center rounded-xl text-gold transition hover:bg-gold/10"><Camera className="size-[18px]"/></button>
            </div>
          </div>
          {lightingOpen && lightingPanel}
          {sceneStudioOpen && sceneStudioPanel}
        </div>
        <aside className="absolute bottom-5 right-16 top-16 z-20 hidden w-[250px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d0f]/92 shadow-2xl backdrop-blur-xl lg:flex">
          <div className="flex shrink-0 border-b border-white/10">
            {([["materiales","Materiales"],["escenas","Escenas"],["iluminacion","Iluminación"]] as const).map(([id,nombre])=>(
              <button key={id} type="button" onClick={()=>setPanel(id)} className={"flex-1 px-2 py-2.5 text-[8px] font-semibold uppercase tracking-[.14em] transition "+(panel===id?"bg-gold/15 text-gold":"text-white/40 hover:text-white/70")}>{nombre}</button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {panel==="materiales"&&<>
              <div className="mb-3 flex gap-1 rounded-lg border border-white/10 bg-white/[.02] p-1">
                {([["metales","Metales"],["gemas","Gemas"]] as const).map(([id,nombre])=>(
                  <button key={id} type="button" onClick={()=>setBibliotecaTipo(id)} className={"flex-1 rounded-md px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wider transition "+(bibliotecaTipo===id?"bg-gold text-black":"text-white/45 hover:text-white")}>{nombre}</button>
                ))}
              </div>
              {bibliotecaTipo==="metales"&&(
                <div className="space-y-3">
                  {(["Oro Amarillo","Oro Blanco","Oro Rosa","Plata","Platino","Especiales"] as MaterialGrupo[]).map(grupo=>{
                    const items=MATERIALES.filter(m=>m.grupo===grupo);
                    if(!items.length) return null;
                    return (
                      <div key={grupo}>
                        <p className="mb-1.5 text-[8px] font-semibold uppercase tracking-[.18em] text-white/30">{grupo}</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {items.map(m=>(
                            <button key={m.id} type="button" onClick={()=>setMaterialId(m.id)} className={"flex items-center gap-2 rounded-lg border px-2 py-2 text-left transition "+(materialId===m.id?"border-gold/60 bg-gold/10":"border-white/10 bg-white/[.02] hover:border-white/25")}>
                              <span className="size-4 shrink-0 rounded-full border border-white/20" style={{background:hexColor(m.color)}}/>
                              <span className="truncate text-[9px] text-white/70">{m.nombre}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {bibliotecaTipo==="gemas"&&(
                <div className="grid grid-cols-2 gap-1.5">
                  {GEMAS.map(g=>(
                    <button key={g.id} type="button" onClick={()=>{setGemaId(g.id);apiRef.current?.gema(g)}} className={"flex items-center gap-2 rounded-lg border px-2 py-2 text-left transition "+(gemaId===g.id?"border-gold/60 bg-gold/10":"border-white/10 bg-white/[.02] hover:border-white/25")}>
                      <span className="size-4 shrink-0 rounded-full border border-white/20" style={{background:hexColor(g.color)}}/>
                      <span className="truncate text-[9px] text-white/70">{g.nombre}</span>
                    </button>
                  ))}
                </div>
              )}
            </>}
            {panel==="escenas"&&(
              <div className="space-y-2">
                <div className="rounded-xl border border-white/10 bg-white/[.02] p-2.5">
                  <div className="mb-2 text-[8px] font-semibold uppercase tracking-[.18em] text-white/35">Controles de escena</div>
                  <label className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-[10px] text-white/70 hover:bg-white/5">
                    <span>Ground</span>
                    <input type="checkbox" checked={groundVisible} onChange={e=>{const v=e.target.checked;setGroundVisible(v);apiRef.current?.sceneStudio?.({ground:v});}} />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-[10px] text-white/70 hover:bg-white/5">
                    <span>Sombras</span>
                    <input type="checkbox" checked={shadowsVisible} onChange={e=>{const v=e.target.checked;setShadowsVisible(v);apiRef.current?.sceneStudio?.({shadows:v});}} />
                  </label>
                </div>
                <div className="space-y-1.5">
                {ESCENARIOS.map(e=>(
                  <button key={e.id} type="button" onClick={()=>setEscenarioId(e.id)} className={"flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition "+(escenarioId===e.id?"border-gold/60 bg-gold/10":"border-white/10 bg-white/[.02] hover:border-white/25")}>
                    <span className={"size-7 shrink-0 rounded-md border border-white/15 "+e.clase}/>
                    <span className="min-w-0"><span className="block truncate text-[10px] text-white/80">{e.nombre}</span><span className="block truncate text-[8px] text-white/35">{e.descripcion}</span></span>
                  </button>
                ))}
                </div>
              </div>
            )}
            {panel==="iluminacion"&&(
              <div className="space-y-1.5">
                {ILUMINACIONES.map(l=>(
                  <button key={l.id} type="button" onClick={()=>setIluminacionId(l.id)} className={"flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left transition "+(iluminacionId===l.id?"border-gold/60 bg-gold/10":"border-white/10 bg-white/[.02] hover:border-white/25")}>
                    <span className="text-[10px] text-white/80">{l.nombre}</span>
                    <span className="text-[8px] text-white/35">{l.descripcion}</span>
                  </button>
                ))}
                <button type="button" onClick={()=>setLightingOpen(true)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-gold/35 bg-gold/10 px-2.5 py-2 text-[9px] font-semibold uppercase tracking-wider text-gold transition hover:bg-gold/15">
                  <SlidersHorizontal className="size-3.5"/> Lighting Studio
                </button>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  </div>
</>);
}

