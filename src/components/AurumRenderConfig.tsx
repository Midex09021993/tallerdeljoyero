import { useMemo, useState } from "react";
import { Camera, ChevronRight, Gem, Layers3, Lightbulb, SlidersHorizontal, Sparkles } from "lucide-react";
import { AURUM_PHOTOGRAPHIC_PROFILES } from "@/lib/aurum-photographic-scene-engine";
import { AURUM_LIGHTING_RENDER_PRESETS } from "@/lib/aurum-lighting-engine";
import { AURUM_RENDER_QUALITY } from "@/lib/aurum-scene-engine";

type Section = "escenas" | "hdri" | "iluminacion" | "materiales" | "gemas" | "camara" | "post" | "calidad";

const sections: {id:Section; label:string; description:string; icon:any}[] = [
  {id:"escenas",label:"Escenas",description:"Ambientes fotográficos",icon:Layers3},
  {id:"hdri",label:"HDRI",description:"Entornos de reflexión",icon:Sparkles},
  {id:"iluminacion",label:"Iluminación",description:"Fuentes y rigs",icon:Lightbulb},
  {id:"materiales",label:"Materiales",description:"Metales y acabados",icon:Gem},
  {id:"gemas",label:"Gemas",description:"Entornos ópticos",icon:Gem},
  {id:"camara",label:"Cámara",description:"Vistas y encuadre",icon:Camera},
  {id:"post",label:"Postprocesado",description:"Imagen final",icon:SlidersHorizontal},
  {id:"calidad",label:"Calidad",description:"Rendimiento",icon:Sparkles},
];

export function AurumRenderConfig() {
  const [section,setSection]=useState<Section>("escenas");
  const profiles=useMemo(()=>Object.entries(AURUM_PHOTOGRAPHIC_PROFILES),[]);
  return <div className="min-h-full bg-[#070809] p-4 text-white md:p-6">
    <div className="mx-auto max-w-6xl">
      <div className="mb-5">
        <div className="flex items-center gap-2 text-gold"><Gem className="size-5"/><span className="font-display text-xl italic">AURUM RENDER</span></div>
        <h1 className="mt-2 text-2xl font-semibold">Configuración del motor</h1>
        <p className="mt-1 text-sm text-white/40">Panel técnico para calibrar escenas, materiales, iluminación y calidad del render.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <nav className="rounded-2xl border border-white/10 bg-[#0b0d0f]/95 p-2">
          {sections.map(s=>{const I=s.icon;return <button key={s.id} onClick={()=>setSection(s.id)} className={"mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left "+(section===s.id?"bg-gold/10 text-gold":"text-white/55 hover:bg-white/[.03] hover:text-white")}><I className="size-4"/><span className="min-w-0"><span className="block text-[10px] font-semibold uppercase tracking-wider">{s.label}</span><span className="block text-[9px] text-white/30">{s.description}</span></span><ChevronRight className="ml-auto size-3 opacity-40"/></button>})}
        </nav>
        <section className="rounded-2xl border border-white/10 bg-[#0b0d0f]/95 p-5">
          {section==="escenas"&&<><h2 className="text-lg font-semibold">Escenas fotográficas</h2><p className="mt-1 text-xs text-white/40">Cada escena reúne exposición, entorno, iluminación y postprocesado. Los usuarios finales no editan estos valores.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{profiles.map(([id,p])=><div key={id} className="rounded-xl border border-white/10 bg-white/[.025] p-3"><div className="flex items-center justify-between"><span className="text-sm font-medium capitalize">{id.replace(/([A-Z])/g," $1")}</span><span className="rounded-full bg-gold/10 px-2 py-0.5 text-[8px] text-gold">ACTIVA</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-[9px] text-white/40"><span>HDRI <b className="text-white/70">{p.environmentKey}</b></span><span>Gema <b className="text-white/70">{p.gemEnvironmentKey}</b></span><span>Exposición <b className="text-white/70">{p.exposure.toFixed(2)}</b></span><span>Protección <b className="text-white/70">{p.highlightProtection.toFixed(2)}</b></span></div></div>)}</div></>}
          {section==="hdri"&&<><h2 className="text-lg font-semibold">Biblioteca HDRI</h2><p className="mt-1 text-xs text-white/40">Los HDRI son recursos del motor; su intensidad y rotación se consumen desde el perfil fotográfico.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{Object.entries(AURUM_PHOTOGRAPHIC_PROFILES).map(([id,p])=><div key={id} className="rounded-xl border border-white/10 p-3"><div className="text-sm font-medium">{id}</div><div className="mt-1 text-[9px] text-white/35">Metal: {p.environmentKey} · Gema: {p.gemEnvironmentKey}</div></div>)}</div></>}
          {section==="iluminacion"&&<><h2 className="text-lg font-semibold">Rigs de iluminación</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{Object.entries(AURUM_LIGHTING_RENDER_PRESETS).map(([id,p])=><div key={id} className="rounded-xl border border-white/10 p-3"><div className="text-sm font-medium">{id}</div><div className="mt-2 grid grid-cols-3 gap-2 text-[9px] text-white/45"><span>Key {p.key}</span><span>Fill {p.fill}</span><span>Rim {p.rim}</span><span>Softbox {p.softbox}</span><span>Kicker {p.kicker}</span><span>Gem {p.gem}</span></div></div>)}</div></>}
          {section==="calidad"&&<><h2 className="text-lg font-semibold">Perfiles de calidad</h2><div className="mt-5 grid gap-3 sm:grid-cols-3">{Object.entries(AURUM_RENDER_QUALITY).map(([id,q])=><div key={id} className="rounded-xl border border-white/10 p-4"><div className="text-sm font-semibold capitalize">{id}</div><div className="mt-3 space-y-1 text-[9px] text-white/45"><div>Pixel ratio: {q.pixelRatio}×</div><div>Sombras: {q.shadowMapSize}px</div><div>Transmisión: {Math.round(q.transmissionScale*100)}%</div></div></div>)}</div></>}
          {(section==="materiales"||section==="gemas"||section==="camara"||section==="post")&&<div className="grid min-h-[280px] place-items-center text-center"><div><div className="mx-auto grid size-12 place-items-center rounded-2xl border border-gold/20 bg-gold/10 text-gold"><SlidersHorizontal className="size-5"/></div><h2 className="mt-4 text-lg font-semibold">{sections.find(s=>s.id===section)?.label}</h2><p className="mt-1 max-w-md text-xs leading-relaxed text-white/40">Módulo preparado para conectar los parámetros editables del motor. La interfaz pública seguirá ocultando esta configuración.</p></div></div>}
        </section>
      </div>
    </div>
  </div>;
}
