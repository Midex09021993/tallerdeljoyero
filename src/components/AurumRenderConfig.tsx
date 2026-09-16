import { useMemo, useState } from "react";
import { Camera, ChevronRight, Gem, Layers3, Lightbulb, SlidersHorizontal, Sparkles, Boxes } from "lucide-react";
import { AURUM_PHOTOGRAPHIC_PROFILES } from "@/lib/aurum-photographic-scene-engine";
import { AURUM_LIGHTING_RENDER_PRESETS } from "@/lib/aurum-lighting-engine";
import { AURUM_RENDER_QUALITY, AURUM_HDRI_LIBRARY } from "@/lib/aurum-scene-engine";
import { MATERIALES, GEMAS, ESCENARIOS } from "@/lib/aurum/catalog";

type Section = "escenas" | "hdri" | "iluminacion" | "materiales" | "gemas" | "camara" | "post" | "calidad";

const sections: {id:Section; label:string; description:string; icon:any}[] = [
  {id:"escenas",label:"Escenas",description:"Ambientes fotográficos",icon:Layers3},
  {id:"hdri",label:"HDRI",description:"Entornos de reflexión",icon:Sparkles},
  {id:"iluminacion",label:"Iluminación",description:"Fuentes y rigs",icon:Lightbulb},
  {id:"materiales",label:"Materiales",description:"Metales y acabados",icon:Boxes},
  {id:"gemas",label:"Gemas",description:"Piedras y óptica",icon:Gem},
  {id:"camara",label:"Cámara",description:"Vistas y encuadre",icon:Camera},
  {id:"post",label:"Postprocesado",description:"Imagen final",icon:SlidersHorizontal},
  {id:"calidad",label:"Calidad",description:"Rendimiento",icon:Sparkles},
];

const pretty=(value:string)=>value.replace(/([A-Z])/g," $1").replace(/_/g," ").replace(/\b\w/g,m=>m.toUpperCase());

export function AurumRenderConfig() {
  const [section,setSection]=useState<Section>("escenas");
  const [materialGroup,setMaterialGroup]=useState("Todos");
  const [gemFamily,setGemFamily]=useState("Todas");
  const profiles=useMemo(()=>Object.entries(AURUM_PHOTOGRAPHIC_PROFILES),[]);
  const materialGroups=useMemo(()=>["Todos",...Array.from(new Set(MATERIALES.map(m=>m.grupo)))],[]);
  const gemFamilies=useMemo(()=>["Todas",...Array.from(new Set(GEMAS.map(g=>g.familia)))],[]);
  const visibleMaterials=useMemo(()=>materialGroup==="Todos"?MATERIALES:MATERIALES.filter(m=>m.grupo===materialGroup),[materialGroup]);
  const visibleGems=useMemo(()=>gemFamily==="Todas"?GEMAS:GEMAS.filter(g=>g.familia===gemFamily),[gemFamily]);

  return <div className="min-h-full bg-[#070809] p-4 text-white md:p-6">
    <div className="mx-auto max-w-7xl">
      <div className="mb-5">
        <div className="flex items-center gap-2 text-gold"><Gem className="size-5"/><span className="font-display text-xl italic">AURUM RENDER</span></div>
        <h1 className="mt-2 text-2xl font-semibold">Configuración del motor</h1>
        <p className="mt-1 text-sm text-white/40">Centro técnico del motor fotográfico. Los perfiles se consumen directamente desde los catálogos de AURUM.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[225px_1fr]">
        <nav className="rounded-2xl border border-white/10 bg-[#0b0d0f]/95 p-2">
          {sections.map(s=>{const I=s.icon;return <button key={s.id} onClick={()=>setSection(s.id)} className={"mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left "+(section===s.id?"bg-gold/10 text-gold":"text-white/55 hover:bg-white/[.03] hover:text-white")}><I className="size-4"/><span className="min-w-0"><span className="block text-[10px] font-semibold uppercase tracking-wider">{s.label}</span><span className="block text-[9px] text-white/30">{s.description}</span></span><ChevronRight className="ml-auto size-3 opacity-40"/></button>})}
        </nav>
        <section className="rounded-2xl border border-white/10 bg-[#0b0d0f]/95 p-5">
          {section==="escenas"&&<><Header title="Escenas fotográficas" text="Catálogo unificado: escena, HDRI, iluminación, exposición y postprocesado."/><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{ESCENARIOS.map(s=>{const p=profiles.find(([id])=>id===s.id)?.[1];return <div key={s.id} className="rounded-xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center justify-between"><span className="text-sm font-medium">{s.nombre}</span><span className="rounded-full bg-gold/10 px-2 py-0.5 text-[8px] text-gold">{s.iluminacion}</span></div><p className="mt-1 text-[10px] text-white/35">{s.descripcion}</p>{p&&<div className="mt-3 grid grid-cols-2 gap-2 text-[9px] text-white/40"><span>HDRI <b className="text-white/70">{p.environmentKey}</b></span><span>Gema <b className="text-white/70">{p.gemEnvironmentKey}</b></span><span>Exposición <b className="text-white/70">{p.exposure.toFixed(2)}</b></span><span>Protección <b className="text-white/70">{p.highlightProtection.toFixed(2)}</b></span></div>}</div>})}</div></>}

          {section==="hdri"&&<><Header title="Biblioteca HDRI" text="Recursos de entorno separados de la configuración de materiales y gemas."/><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{AURUM_HDRI_LIBRARY.map(h=><div key={h.id} className="rounded-xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center gap-2"><Sparkles className="size-4 text-gold"/><span className="text-sm font-medium">{h.name}</span></div><div className="mt-2 text-[9px] text-white/40">{h.purpose} · {h.license}</div><div className="mt-2 truncate text-[8px] text-white/20">{h.sourceUrl}</div></div>)}</div></>}

          {section==="iluminacion"&&<><Header title="Rigs de iluminación" text="Relaciones de fuentes para fotografía de joyería. La forma de la reflexión es independiente de la exposición global."/><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Object.entries(AURUM_LIGHTING_RENDER_PRESETS).map(([id,p])=><div key={id} className="rounded-xl border border-white/10 bg-white/[.025] p-4"><div className="text-sm font-medium">{pretty(id)}</div><div className="mt-3 grid grid-cols-3 gap-2 text-[9px] text-white/45"><span>Key {p.key}</span><span>Fill {p.fill}</span><span>Rim {p.rim}</span><span>Softbox {p.softbox}</span><span>Kicker {p.kicker}</span><span>Gema {p.gem}</span></div></div>)}</div></>}

          {section==="materiales"&&<><Header title="Catálogo de materiales" text="Materiales PBR disponibles. La selección está separada de la escena y de la configuración técnica."/><div className="mt-4 flex flex-wrap gap-2">{materialGroups.map(g=><button key={g} onClick={()=>setMaterialGroup(g)} className={"rounded-full border px-3 py-1.5 text-[10px] "+(materialGroup===g?"border-gold/40 bg-gold/10 text-gold":"border-white/10 text-white/50 hover:text-white")}>{g}</button>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{visibleMaterials.map(m=><div key={m.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.025] p-3"><div><div className="text-xs font-medium">{m.nombre}</div><div className="mt-1 text-[9px] text-white/35">{m.grupo} · {m.id}</div></div><div className="size-7 rounded-full border border-white/10" style={{backgroundColor:"#"+m.color.toString(16).padStart(6,"0")}}/></div>)}</div><div className="mt-4 text-[9px] text-white/30">{visibleMaterials.length} materiales disponibles</div></>}

          {section==="gemas"&&<><Header title="Catálogo de gemas" text="Familias, variantes e inclusiones disponibles para el pipeline óptico de AURUM."/><div className="mt-4 flex flex-wrap gap-2">{gemFamilies.map(g=><button key={g} onClick={()=>setGemFamily(g)} className={"rounded-full border px-3 py-1.5 text-[10px] "+(gemFamily===g?"border-gold/40 bg-gold/10 text-gold":"border-white/10 text-white/50 hover:text-white")}>{g}</button>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{visibleGems.map(g=><div key={g.id} className="rounded-xl border border-white/10 bg-white/[.025] p-3"><div className="flex items-center justify-between"><div><div className="text-xs font-medium">{g.nombre}</div><div className="mt-1 text-[9px] text-white/35">IOR {g.ior.toFixed(3)} · Transmisión {Math.round(g.transmission*100)}%</div></div><div className="size-7 rounded-full border border-white/10" style={{backgroundColor:"#"+g.color.toString(16).padStart(6,"0")}}/></div><div className="mt-2 text-[9px] text-white/30">Inclusiones: {g.inclusionStyle} · Dispersión {g.dispersion}</div></div>)}</div><div className="mt-4 text-[9px] text-white/30">{visibleGems.length} variantes disponibles</div></>}

          {(section==="camara"||section==="post")&&<div className="grid min-h-[280px] place-items-center text-center"><div><div className="mx-auto grid size-12 place-items-center rounded-2xl border border-gold/20 bg-gold/10 text-gold"><SlidersHorizontal className="size-5"/></div><h2 className="mt-4 text-lg font-semibold">{sections.find(s=>s.id===section)?.label}</h2><p className="mt-1 max-w-md text-xs leading-relaxed text-white/40">Módulo preparado para conectar los parámetros editables del motor sin exponerlos en el visor público.</p></div></div>}

          {section==="calidad"&&<><Header title="Perfiles de calidad" text="Perfiles que equilibran calidad visual y rendimiento del navegador."/><div className="mt-5 grid gap-3 sm:grid-cols-3">{Object.entries(AURUM_RENDER_QUALITY).map(([id,q])=><div key={id} className="rounded-xl border border-white/10 bg-white/[.025] p-4"><div className="text-sm font-semibold capitalize">{id}</div><div className="mt-3 space-y-1 text-[9px] text-white/45"><div>Pixel ratio: {q.pixelRatio}×</div><div>Sombras: {q.shadowMapSize}px</div><div>Transmisión: {Math.round(q.transmissionScale*100)}%</div></div></div>)}</div></>}
        </section>
      </div>
    </div>
  </div>;
}

function Header({title,text}:{title:string;text:string}) {
  return <div><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-xs text-white/40">{text}</p></div>;
}
