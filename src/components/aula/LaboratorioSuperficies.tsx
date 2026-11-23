import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, RotateCcw, Waves, X } from "lucide-react";

type Operacion = "barrido" | "carril" | "organica";
const operaciones: Array<{id:Operacion; nombre:string; comando:string; objetivo:string}> = [
  { id:"barrido", nombre:"Barrido por carril", comando:"Sweep1", objetivo:"Desplazar una sección a lo largo de una curva guía para construir una superficie." },
  { id:"carril", nombre:"Revolución por carril", comando:"Sweep1 / Sweep2", objetivo:"Relacionar un perfil con una trayectoria y revisar cómo cambia la forma al orientar las curvas." },
  { id:"organica", nombre:"Forma orgánica", comando:"Sweep1", objetivo:"Aplicar perfiles y guías a una pieza decorativa sencilla, manteniendo una transición visual controlada." }
];

export default function LaboratorioSuperficies() {
  const [abierto,setAbierto]=useState(false);
  const [operacion,setOperacion]=useState<Operacion>("barrido");
  const [secciones,setSecciones]=useState(3);
  const [curvatura,setCurvatura]=useState(42);
  const [giro,setGiro]=useState(0);
  const [perfil,setPerfil]=useState<"circular"|"ovalado"|"rectangular">("circular");
  const [pasos,setPasos]=useState<string[]>([]);
  const [respuesta,setRespuesta]=useState("");
  const [verificado,setVerificado]=useState(false);
  const actual=operaciones.find(x=>x.id===operacion)!;
  const progreso=pasos.length;
  const path=useMemo(()=>operacion==="carril"
    ? `M 90 245 C 180 ${245-curvatura} 300 ${245+curvatura/2} 405 165`
    : operacion==="organica"
      ? `M 75 220 C 145 ${110+curvatura/3} 250 ${310-curvatura/2} 425 150`
      : `M 75 220 C 165 ${220-curvatura} 285 ${220+curvatura/2} 425 155`,[operacion,curvatura]);
  const reset=()=>{setOperacion("barrido");setSecciones(3);setCurvatura(42);setGiro(0);setPerfil("circular");setPasos([]);setRespuesta("");setVerificado(false);};
  const togglePaso=(id:string)=>setPasos(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  return <>
    <section className="mt-7 overflow-hidden rounded-2xl border border-[#344352] bg-[#171F28] text-[#E8EDF2]">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-300">FADILAB · SESIÓN 07 · LABORATORIO INDEPENDIENTE</p><h4 className="mt-1 text-xl font-semibold">SURFACE STUDIO</h4><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">Experimenta con perfiles, curvas guía y trayectorias para comprender cómo se construyen superficies aplicadas a formas de joyería.</p><div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-300"><span className="rounded-full border border-white/15 px-3 py-1.5">Barrido</span><span className="rounded-full border border-white/15 px-3 py-1.5">Revolución por carril</span><span className="rounded-full border border-white/15 px-3 py-1.5">Forma orgánica</span></div></div>
        <button type="button" onClick={()=>setAbierto(true)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-b from-amber-200 to-amber-500 px-5 py-3 text-sm font-bold text-[#21180A] shadow-lg hover:brightness-105"><Waves className="size-4"/> Abrir laboratorio <ArrowRight className="size-4"/></button>
      </div>
      <p className="border-t border-white/10 px-5 py-3 text-[11px] leading-5 text-[#9EADBA]">Simulador didáctico: la vista representa relaciones conceptuales entre perfil y trayectoria. No ejecuta comandos de Rhino ni certifica superficies NURBS reales.</p>
    </section>
    {abierto && <div className="fixed inset-0 z-[160] flex h-[100dvh] flex-col overflow-hidden bg-[#10141A] text-white" role="dialog" aria-modal="true" aria-label="Surface Studio · Sesión 07">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#1C2129] px-4 py-3 sm:px-6"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-300">FADILAB / AURUM LAB / SESIÓN 07</p><h2 className="text-lg font-semibold">Surface Studio</h2><p className="text-[11px] text-slate-400">Laboratorio didáctico de creación y edición de superficies</p></div><div className="flex gap-2"><button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/5"><RotateCcw className="size-3.5"/> Reiniciar</button><button type="button" onClick={()=>setAbierto(false)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold hover:border-amber-300/60"><X className="size-4"/> Cerrar</button></div></header>
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden">
        <main className="flex min-h-[430px] min-w-0 flex-col border-b border-white/10 lg:min-h-0 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-3"><div><p className="text-xs font-semibold">Viewport conceptual</p><p className="text-[10px] text-slate-400">Dorado: superficie · Azul: perfil · Verde: trayectoria</p></div><span className="rounded-full border border-amber-300/25 px-3 py-1 text-[10px] text-amber-200">{actual.comando}</span></div>
          <div className="relative flex min-h-[320px] flex-1 items-center justify-center overflow-hidden bg-[#0D141B] p-3 sm:p-6">
            <svg viewBox="0 0 500 330" role="img" aria-label="Esquema interactivo de una superficie construida a lo largo de una trayectoria" className="h-full max-h-[520px] w-full">
              <defs><pattern id="surfaceGrid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#334155" strokeWidth=".7"/></pattern><linearGradient id="surfaceGold" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#F2D99C"/><stop offset=".5" stopColor="#B88B3F"/><stop offset="1" stopColor="#705126"/></linearGradient></defs>
              <rect width="500" height="330" fill="url(#surfaceGrid)"/>
              <path d={path} fill="none" stroke="#5ED6A2" strokeWidth="3" strokeDasharray="8 6"/>
              {Array.from({length:secciones},(_,i)=>{const x=95+i*(300/Math.max(1,secciones-1));const y=220-(curvatura*(x-95)/330);return <g key={i} transform={`translate(${x} ${y}) rotate(${giro+i*5})`}><ellipse rx={perfil==="circular"?22:perfil==="ovalado"?29:25} ry={perfil==="circular"?22:perfil==="ovalado"?14:18} fill="none" stroke="#9FC5D8" strokeWidth="2.5" strokeDasharray="5 4"/><circle r="3" fill="#DCEAF4"/></g>;})}
              <path d={path} fill="none" stroke="url(#surfaceGold)" strokeWidth={perfil==="rectangular"?35:28} strokeLinecap="round" opacity=".86"/>
              <path d={path} fill="none" stroke="#F5E5BD" strokeWidth="1.5" strokeDasharray="3 8" opacity=".9"/>
              <text x="18" y="24" fill="#AAB7C5" fontSize="11">PERFIL + TRAYECTORIA → SUPERFICIE</text>
              <text x="18" y="310" fill="#AAB7C5" fontSize="10">{secciones} secciones · curvatura visual {curvatura} · giro {giro}°</text>
            </svg>
          </div>
          <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-[#151E27]"><div className="px-4 py-3"><p className="text-[9px] uppercase text-slate-500">Operación</p><p className="mt-1 text-xs font-semibold">{actual.nombre}</p></div><div className="px-4 py-3"><p className="text-[9px] uppercase text-slate-500">Perfil</p><p className="mt-1 text-xs font-semibold">{perfil}</p></div><div className="px-4 py-3"><p className="text-[9px] uppercase text-slate-500">Secciones</p><p className="mt-1 text-xs font-semibold text-amber-200">{secciones}</p></div></div>
        </main>
        <aside className="min-h-0 space-y-4 overflow-y-auto bg-[#151E27] p-4 sm:p-5">
          <section><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#D2AD68]">Selecciona la operación</p><div className="mt-3 grid gap-2">{operaciones.map(op=><button key={op.id} type="button" onClick={()=>{setOperacion(op.id);setVerificado(false);}} aria-pressed={operacion===op.id} className={`rounded-xl border p-3 text-left ${operacion===op.id?"border-[#D2AD68]/70 bg-[#D2AD68]/15":"border-white/10 bg-[#101820] hover:border-white/25"}`}><span className="block text-xs font-semibold">{op.nombre}</span><span className="mt-1 block text-[10px] leading-4 text-slate-400">{op.objetivo}</span></button>)}</div></section>
          <section className="space-y-4 border-t border-white/10 pt-4"><div><label className="flex justify-between text-xs">Número de secciones <b>{secciones}</b></label><input type="range" min="2" max="6" value={secciones} onChange={e=>{setSecciones(+e.target.value);setVerificado(false);}} className="mt-2 w-full accent-[#C6A15B]"/></div><div><label className="flex justify-between text-xs">Curvatura de trayectoria <b>{curvatura}</b></label><input type="range" min="10" max="90" value={curvatura} onChange={e=>{setCurvatura(+e.target.value);setVerificado(false);}} className="mt-2 w-full accent-[#C6A15B]"/></div><div><label className="block text-xs">Tipo de perfil</label><div className="mt-2 grid grid-cols-3 gap-2">{(["circular","ovalado","rectangular"] as const).map(v=><button key={v} type="button" onClick={()=>{setPerfil(v);setVerificado(false);}} className={`rounded-lg border px-2 py-2 text-[10px] capitalize ${perfil===v?"border-[#C6A15B] bg-[#C6A15B]/15 text-[#F1D9A6]":"border-white/15 text-slate-300"}`}>{v}</button>)}</div></div><div><label className="flex justify-between text-xs">Giro de las secciones <b>{giro}°</b></label><input type="range" min="-90" max="90" step="5" value={giro} onChange={e=>{setGiro(+e.target.value);setVerificado(false);}} className="mt-2 w-full accent-[#C6A15B]"/></div></section>
          <section className="rounded-xl border border-white/10 bg-[#222B36] p-4"><h3 className="text-sm font-semibold">Procedimiento en Rhino</h3><ol className="mt-3 space-y-2 text-xs leading-5 text-slate-300"><li>1. Prepara y organiza perfiles, secciones y carriles en capas.</li><li>2. Comprueba posición, dirección y continuidad de las curvas.</li><li>3. Ejecuta {actual.comando} y selecciona las curvas en el orden solicitado por Rhino.</li><li>4. Revisa la orientación de las secciones y la transición de la superficie.</li><li>5. Guarda una copia editable y nombra claramente el resultado.</li></ol><p className="mt-3 text-[10px] leading-5 text-slate-400">{actual.objetivo}</p></section>
          <section className="rounded-xl border border-white/10 bg-[#222B36] p-4"><h3 className="text-sm font-semibold">Comprobación de aprendizaje</h3><p className="mt-2 text-xs leading-5 text-slate-400">¿Qué elemento define el recorrido de un barrido?</p><div className="mt-2 space-y-2">{[{v:"perfil",l:"La curva de sección"},{v:"guia",l:"La curva guía o carril"},{v:"capa",l:"El nombre de la capa"}].map(o=><label key={o.v} className="flex cursor-pointer items-center gap-2 text-xs text-slate-300"><input type="radio" name="surfaceQuiz" value={o.v} checked={respuesta===o.v} onChange={()=>{setRespuesta(o.v);setVerificado(false);}} className="accent-[#C6A15B]"/>{o.l}</label>)}</div><button type="button" disabled={!respuesta} onClick={()=>setVerificado(true)} className="mt-3 w-full rounded-lg bg-[#C6A15B] px-3 py-2.5 text-xs font-bold text-[#17130B] disabled:opacity-40">Comprobar respuesta</button>{verificado&&<p className={`mt-2 text-xs ${respuesta==="guia"?"text-emerald-300":"text-amber-200"}`}>{respuesta==="guia"?"Correcto: la curva guía controla el recorrido.":"Revisa la diferencia: el perfil define la sección; la guía determina el recorrido."}</p>}</section>
          <section className="rounded-xl border border-[#C6A15B]/25 bg-[#C6A15B]/5 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#D8B979]">Registro de práctica</p><p className="mt-1 text-xs leading-5 text-slate-300">{progreso} de 3 operaciones revisadas en esta ventana.</p>{operaciones.map(op=><label key={op.id} className="mt-2 flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={pasos.includes(op.id)} onChange={()=>togglePaso(op.id)} className="accent-[#C6A15B]"/>{op.nombre}</label>)}</section>
        </aside>
      </div>
    </div>}
  </>;
}
