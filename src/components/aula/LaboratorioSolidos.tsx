import { useMemo, useState } from "react";
import ExtrusionViewport from "./ExtrusionViewport";
import RevolveStudio from "./RevolveStudio";
import RingVolumeStudio from "./RingVolumeStudio";
import { Box, CircleDot, RotateCcw, ShieldCheck, X, ArrowUpRight, CheckCircle2, AlertTriangle, Layers3 } from "lucide-react";

type Lab = "extrusion" | "revolution" | "ring" | "inspector";
type LaboratorioSolidosProps = { onlyLab?: Lab };
const shell = "rounded-xl border border-white/10 bg-[#202A35]";
const btn = "rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-[#DCE5ED] transition hover:border-[#C6A15B]/70 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[#C6A15B]/50";
const activeBtn = "border-[#C6A15B] bg-[#C6A15B]/15 text-[#F3D99F]";
const number = (v:number) => Number.isFinite(v) ? v.toFixed(1) : "0.0";

function LabCard({title,tag,description,icon:Icon,onClick,featured=false}:{title:string;tag:string;description:string;icon:typeof Box;onClick:()=>void;featured?:boolean}) {
 if (featured) return <button type="button" onClick={onClick} className="group flex min-h-[190px] w-full flex-col justify-between gap-5 rounded-2xl border border-[#C6A15B]/35 bg-gradient-to-br from-[#171b21] via-[#111820] to-[#0c1219] p-6 text-left text-white shadow-lg transition hover:border-[#D8B979]/70 focus:outline-none focus:ring-2 focus:ring-[#C6A15B]/50 sm:min-h-[218px] sm:flex-row sm:items-center sm:px-7">
  <span className="min-w-0 flex-1">
   <span className="block text-[10px] font-bold uppercase tracking-[.22em] text-amber-300">AURUM LAB · SESIÓN 06 · LABORATORIO PROFESIONAL</span>
   <span className="mt-2 block text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</span>
   <span className="mt-2 block max-w-3xl text-sm leading-6 text-slate-300">{description}</span>
   <span className="mt-4 flex flex-wrap gap-2 text-[10px] text-slate-200"><span className="rounded-full border border-white/15 px-3 py-1.5">Simulador interactivo</span><span className="rounded-full border border-white/15 px-3 py-1.5">Práctica guiada</span><span className="rounded-full border border-white/15 px-3 py-1.5">Rhino 7 aplicado</span></span>
  </span>
  <span className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-gradient-to-b from-amber-200 to-amber-500 px-5 py-3 text-sm font-semibold text-[#21180a] shadow-lg transition group-hover:brightness-105 sm:self-center">Abrir {title} <ArrowUpRight size={17}/></span>
 </button>;
 return <button type="button" onClick={onClick} className="group flex h-full min-w-0 flex-col rounded-xl border border-[#344352] bg-[#202A35] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#C6A15B]/70 hover:bg-[#263442] focus:outline-none focus:ring-2 focus:ring-[#C6A15B]/50">
  <span className="flex size-10 items-center justify-center rounded-lg border border-[#C6A15B]/30 bg-[#C6A15B]/10 text-[#D9B66E]"><Icon size={19}/></span>
  <span className="mt-3 text-[10px] font-bold uppercase tracking-[.17em] text-[#C6A15B]">{tag}</span>
  <span className="mt-1 text-base font-semibold text-[#F1F4F7]">{title}</span>
  <span className="mt-2 flex-1 text-xs leading-5 text-[#B7C3CF]">{description}</span>
  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#E3C47F]">Abrir laboratorio <ArrowUpRight size={14}/></span>
 </button>;
}

export default function LaboratorioSolidos({ onlyLab }: LaboratorioSolidosProps) {
 const [extrusionOpen,setExtrusionOpen]=useState(false);
 const [revolutionOpen,setRevolutionOpen]=useState(false);
 const [ringOpen,setRingOpen]=useState(false);
 const [inspectorOpen,setInspectorOpen]=useState(false);
 const closeExtrusion=()=>setExtrusionOpen(false);
 const closeRevolution=()=>setRevolutionOpen(false);
 const closeRing=()=>setRingOpen(false);
 const closeInspector=()=>{setInspectorOpen(false);setChecked(false);setQuizChoice("");setQuizSubmitted(false);setViewMode("shaded");};
 const [profile,setProfile]=useState<"closed"|"open"|"nonplanar">("closed");
 const [height,setHeight]=useState(0);
 const [scenario,setScenario]=useState<"closed"|"open"|"disconnected">("closed");
 const [checked,setChecked]=useState(false);
 const [viewMode,setViewMode]=useState<"shaded"|"wireframe"|"errors">("shaded");
 const [quizChoice,setQuizChoice]=useState<string>("");
 const [quizSubmitted,setQuizSubmitted]=useState(false);
 const result=useMemo(()=>profile==="closed"?"Puede generar un volumen cerrado si el perfil también es plano y la opción Solid está activada.":profile==="open"?"El perfil está abierto: la extrusión no podrá cerrar ambos extremos como un sólido.":"El perfil no es plano: Rhino puede dejar extremos sin tapar aunque la curva parezca cerrada.",[profile]);
 return <>
  <section className={onlyLab ? "mx-auto mt-7 w-full max-w-[1100px]" : "mx-auto mt-7 w-full max-w-[1100px] overflow-hidden rounded-2xl border border-[#344352] bg-[#171F28] text-[#E8EDF2]"}>
   {!onlyLab && <header className="border-b border-white/10 bg-[#202A35] px-5 py-4 sm:px-6">
    <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#C6A15B]">FADILAB · AURUM LAB · SESIÓN 06</p>
    <div className="mt-1 flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-xl font-semibold tracking-tight text-[#F4F6F8]">LABORATORIOS DE MODELADO DE SÓLIDOS</h3><p className="mt-1 text-xs text-[#B7C3CF]">Experimenta, construye y diagnostica volúmenes antes de trabajar en Rhino.</p></div><span className="rounded-full border border-[#C6A15B]/30 px-3 py-1 text-[10px] font-semibold text-[#E3C47F]">4 laboratorios independientes</span></div>
   </header>}
   <div className={onlyLab ? "w-full" : "grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4"}>
    {(!onlyLab || onlyLab === "extrusion") && <LabCard featured={Boolean(onlyLab)} title="Extrusion Studio" tag="02 · Extrusión" description="Construye volúmenes desde perfiles; experimenta con perfiles cerrados, abiertos y planos y ajusta la altura." icon={Box} onClick={()=>setExtrusionOpen(true)}/> }
    {(!onlyLab || onlyLab === "revolution") && <LabCard featured={Boolean(onlyLab)} title="Revolve Studio" tag="03 · Revolución" description="Estudia cómo el perfil, el eje y el ángulo de giro determinan la forma resultante." icon={RotateCcw} onClick={()=>setRevolutionOpen(true)}/> }
    {(!onlyLab || onlyLab === "ring") && <LabCard featured={Boolean(onlyLab)} title="Ring Volume Studio" tag="04 · Joyería" description="Explora cómo el diámetro interior, el ancho y la sección modifican la proporción del volumen básico de un anillo." icon={CircleDot} onClick={()=>setRingOpen(true)}/> }
    {(!onlyLab || onlyLab === "inspector") && <LabCard featured={Boolean(onlyLab)} title="Solid Inspector" tag="05 · Diagnóstico" description="Distingue un sólido cerrado de una geometría abierta o de componentes desconectados y aprende qué revisar en Rhino." icon={ShieldCheck} onClick={()=>setInspectorOpen(true)}/> }
   </div>
   {!onlyLab && <p className="border-t border-white/10 px-5 py-3 text-[11px] leading-5 text-[#9EADBA]">Estos laboratorios son simuladores didácticos. No ejecutan Rhino ni certifican archivos .3dm; la validación geométrica real se realiza en Rhino 7/MatrixGold.</p>}
  </section>
  {(!onlyLab || onlyLab === "extrusion") && extrusionOpen && <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#080C11]/95 p-2 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label="Extrusion Studio">
   <section className="flex h-[min(96dvh,980px)] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-[#465565] bg-[#111820] text-[#E8EDF2] shadow-[0_30px_100px_rgba(0,0,0,.65)]">
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-[#19232D] px-5 py-3 sm:px-7">
     <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#D2AD68]">FADILAB <span className="px-1 text-slate-500">/</span> AURUM LAB <span className="px-1 text-slate-500">/</span> SESIÓN 06</p><div className="mt-1 flex flex-wrap items-center gap-3"><h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">Extrusion Studio</h2><span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">Entorno interactivo</span></div></div>
     <button type="button" onClick={closeExtrusion} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-[#D2AD68]/60 hover:bg-white/5"><X size={15}/> Salir</button>
    </header>
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_350px] lg:overflow-hidden">
     <main className="flex min-h-[470px] min-w-0 flex-col border-b border-white/10 lg:min-h-0 lg:border-b-0 lg:border-r">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3 sm:px-7">
       <div><p className="text-xs font-semibold text-white">Área de construcción</p><p className="mt-0.5 text-[10px] text-slate-400">Previsualización geométrica · unidades en milímetros</p></div>
       <span className="rounded-full border border-[#D2AD68]/25 bg-[#D2AD68]/10 px-3 py-1.5 text-[10px] font-semibold text-[#E6C887]">Vista 3D interactiva</span>
      </div>
      <div className="relative flex min-h-[360px] flex-1 items-center justify-center overflow-hidden bg-[#0D141B] p-3 sm:p-6">
       <div className="pointer-events-none absolute inset-0 opacity-[.17]" style={{backgroundImage:"linear-gradient(rgba(148,163,184,.22) 1px, transparent 1px),linear-gradient(90deg,rgba(148,163,184,.22) 1px, transparent 1px)",backgroundSize:"32px 32px"}}/>
       <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#18232D]/40 to-transparent"/>
       <ExtrusionViewport profile={profile} height={height}/>
       <div className="absolute bottom-4 left-5 rounded-lg border border-white/10 bg-[#111820]/90 px-3 py-2 text-[10px] text-slate-400 backdrop-blur"><span className="mr-2 inline-block size-1.5 rounded-full bg-emerald-400"/>Vista conceptual actualizada con los parámetros</div>
      </div>
      <div className="grid shrink-0 grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-[#151E27]">
       <div className="px-4 py-3 sm:px-6"><p className="text-[9px] uppercase tracking-wider text-slate-500">Operación</p><p className="mt-1 text-xs font-semibold text-slate-200">Extrusión recta</p></div>
       <div className="px-4 py-3 sm:px-6"><p className="text-[9px] uppercase tracking-wider text-slate-500">Perfil</p><p className="mt-1 text-xs font-semibold text-slate-200">{profile==="closed"?"Cerrado":profile==="open"?"Abierto":"No plano"}</p></div>
       <div className="px-4 py-3 sm:px-6"><p className="text-[9px] uppercase tracking-wider text-slate-500">Altura</p><p className="mt-1 text-xs font-semibold text-[#E6C887]">{height.toFixed(1)} mm</p></div>
      </div>
     </main>
     <aside className="flex min-h-0 flex-col overflow-hidden bg-[#151E27]">
      <div className="border-b border-white/10 px-5 py-5">
       <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#D2AD68]">Empecemos paso a paso</p>
       <h3 className="mt-1 text-lg font-semibold text-white">Crea tu primera extrusión</h3>
       <p className="mt-1 text-[11px] leading-5 text-slate-400">Elige una curva y aumenta su altura para convertirla en una forma 3D.</p>
      </div>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
       <section>
        <h4 className="text-xs font-semibold text-slate-200">1. Elige el tipo de curva</h4>
        <div className="mt-3 grid grid-cols-2 gap-2">
         <button type="button" onClick={()=>setProfile("closed")} aria-pressed={profile==="closed"} className={"rounded-xl border p-3 text-left transition "+(profile==="closed"?"border-[#D2AD68]/70 bg-[#D2AD68]/15 text-[#F0D69F]":"border-white/10 bg-[#101820] text-slate-300 hover:border-white/25")}>
          <span className="block text-xs font-semibold">Cerrada</span><span className="mt-1 block text-[10px] leading-4 opacity-70">Puede formar un sólido</span>
         </button>
         <button type="button" onClick={()=>setProfile("open")} aria-pressed={profile==="open"} className={"rounded-xl border p-3 text-left transition "+(profile==="open"?"border-[#D2AD68]/70 bg-[#D2AD68]/15 text-[#F0D69F]":"border-white/10 bg-[#101820] text-slate-300 hover:border-white/25")}>
          <span className="block text-xs font-semibold">Abierta</span><span className="mt-1 block text-[10px] leading-4 opacity-70">Forma una superficie</span>
         </button>
        </div>
        <p className="mt-2 text-[10px] leading-5 text-slate-500">{profile==="closed"?"Una curva cerrada vuelve al punto inicial. Es la mejor opción para comenzar.":"Una curva abierta tiene dos extremos y genera una superficie sin tapas."}</p>
       </section>
       <section className="border-t border-white/10 pt-5">
        <div className="flex items-center justify-between gap-2"><h4 className="text-xs font-semibold text-slate-200">2. Define la altura</h4><span className="rounded-md bg-[#D2AD68]/10 px-2.5 py-1 text-sm font-bold tabular-nums text-[#E6C887]">{height.toFixed(1)} mm</span></div>
        <input aria-label="Altura de extrusión en milímetros" type="range" min="0" max="30" step="0.1" value={height} onChange={e=>setHeight(Number(e.target.value))} className="mt-5 w-full accent-[#C6A15B]"/>
        <div className="mt-1 flex justify-between text-[9px] text-slate-500"><span>0 mm</span><span>30 mm</span></div>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-[#101820] px-3 py-2.5">
         <span className="text-[10px] text-slate-400">Altura exacta</span>
         <input aria-label="Valor exacto de altura" type="number" min="0" max="30" step="0.1" value={height} onChange={e=>setHeight(Math.min(30,Math.max(0,Number(e.target.value)||0)))} className="ml-auto w-20 bg-transparent text-right text-sm font-semibold text-white outline-none"/>
         <span className="text-[10px] text-slate-500">mm</span>
        </div>
       </section>
       <section className="rounded-xl border border-[#D2AD68]/20 bg-[#D2AD68]/[.06] p-3">
        <div className="flex items-center gap-2"><span className="flex size-6 items-center justify-center rounded-full bg-[#D2AD68]/15 text-[11px] font-bold text-[#E6C887]">3</span><h4 className="text-xs font-semibold text-slate-100">Observa el resultado</h4></div>
        <p className="mt-2 text-[11px] leading-5 text-slate-300">{height===0?"Todavía no hay extrusión. Mueve el control de altura para comenzar.":profile==="closed"?"¡Bien! La curva cerrada genera un volumen con tapas en esta simulación.":"La curva abierta genera una superficie. Observa que sus extremos permanecen abiertos."}</p>
       </section>
       <details className="border-t border-white/10 pt-4">
        <summary className="cursor-pointer text-[11px] font-semibold text-slate-400 hover:text-[#E6C887]">Opciones avanzadas</summary>
        <div className="mt-3 space-y-3">
         <button type="button" onClick={()=>setProfile("nonplanar")} className={"w-full rounded-lg border px-3 py-2 text-left text-[10px] "+(profile==="nonplanar"?"border-amber-400/50 bg-amber-400/10 text-amber-200":"border-white/10 text-slate-300")}>Probar un perfil no plano</button>
         <p className="text-[10px] leading-5 text-slate-500">Un perfil no plano puede impedir que Rhino cierre las tapas. Para volver al ejercicio inicial, selecciona «Cerrada».</p>
         <div className="rounded-lg bg-[#101820] p-3 text-[10px] leading-5 text-slate-400"><strong className="text-slate-200">En Rhino:</strong> selecciona la curva, ejecuta <code className="rounded bg-white/5 px-1">ExtrudeCrv</code> y define la distancia. Activa <code className="rounded bg-white/5 px-1">Solid=Yes</code> cuando corresponda.</div>
        </div>
       </details>
       <button type="button" onClick={()=>{setProfile("closed");setHeight(0);}} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-[#D2AD68]/50 hover:text-white"><RotateCcw size={14}/> Reiniciar ejercicio</button>
      </div>
      <div className="mt-auto border-t border-white/10 px-5 py-3"><p className="text-[9px] leading-4 text-slate-500">Simulador didáctico. La validación geométrica real se realiza en Rhino 7 / MatrixGold.</p></div>
     </aside>
    </div>
    <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-[#19232D] px-5 py-3 sm:px-7"><p className="text-[10px] text-slate-500"><Layers3 className="mr-1 inline" size={13}/> AURUM LAB · Herramienta de aprendizaje geométrico</p><button type="button" onClick={closeExtrusion} className="rounded-lg bg-gradient-to-b from-[#E6CB8C] to-[#B88D48] px-4 py-2.5 text-xs font-bold text-[#21190D] shadow transition hover:brightness-105">Volver a la sesión 06</button></footer>
   </section>
  </div>}
  <RevolveStudio open={(!onlyLab || onlyLab === "revolution") && revolutionOpen} onClose={closeRevolution} />
  <RingVolumeStudio open={(!onlyLab || onlyLab === "ring") && ringOpen} onClose={closeRing} />
  {(!onlyLab || onlyLab === "inspector") && inspectorOpen && <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#080C11]/95 p-2 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label="Solid Inspector">
   <section className="flex h-[min(96dvh,940px)] w-full max-w-[1450px] flex-col overflow-hidden rounded-2xl border border-[#465565] bg-[#111820] text-[#E8EDF2] shadow-[0_30px_100px_rgba(0,0,0,.65)]">
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-[#19232D] px-5 py-3 sm:px-7">
     <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#D2AD68]">FADILAB / AURUM LAB / SESIÓN 06</p><div className="mt-1 flex flex-wrap items-center gap-3"><h2 className="text-lg font-semibold text-white sm:text-xl">Solid Inspector</h2><span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">Diagnóstico interactivo</span></div></div>
     <button type="button" onClick={closeInspector} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-[#D2AD68]/60 hover:bg-white/5"><X size={15}/> Salir</button>
    </header>
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_370px] lg:overflow-hidden">
     <main className="flex min-h-[460px] min-w-0 flex-col border-b border-white/10 lg:min-h-0 lg:border-b-0 lg:border-r">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3 sm:px-7"><div><p className="text-xs font-semibold text-white">Área de inspección</p><p className="mt-0.5 text-[10px] text-slate-400">Compara la geometría y localiza el problema</p></div><span className="rounded-full border border-[#D2AD68]/25 bg-[#D2AD68]/10 px-3 py-1.5 text-[10px] font-semibold text-[#E6C887]">Vista conceptual 3D</span></div>
      <div className="relative flex min-h-[320px] flex-1 items-center justify-center overflow-hidden bg-[#0D141B] p-4 sm:p-7">
       <div className="pointer-events-none absolute inset-0 opacity-[.16]" style={{backgroundImage:"linear-gradient(rgba(148,163,184,.22) 1px, transparent 1px),linear-gradient(90deg,rgba(148,163,184,.22) 1px, transparent 1px)",backgroundSize:"32px 32px"}}/>
       <div className="relative z-10 w-full max-w-[820px]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#D2AD68]">{scenario==="closed"?"01 · Sólido cerrado":scenario==="open"?"02 · Borde abierto":"03 · Piezas separadas"}</span><div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Modo de visualización">{[["shaded","Sombreado"],["wireframe","Alámbrico"],["errors","Errores"]].map(([v,label])=><button key={v} type="button" onClick={()=>setViewMode(v as typeof viewMode)} aria-pressed={viewMode===v} className={"rounded-md border px-2.5 py-1.5 text-[9px] font-semibold transition "+(viewMode===v?"border-[#D2AD68]/60 bg-[#D2AD68]/15 text-[#F0D69F]":"border-white/10 bg-[#111820] text-slate-400 hover:text-white")}>{label}</button>)}</div><span className="rounded-md border border-white/10 bg-[#111820]/90 px-2.5 py-1 text-[9px] text-slate-400">Esquema didáctico · no es geometría CAD</span></div>
        <div className="rounded-2xl border border-white/10 bg-[#101820]/90 p-3 sm:p-5">
         <svg viewBox="0 0 720 420" className="h-auto max-h-[470px] w-full" role="img" aria-label={scenario==="closed"?"Representación de un sólido cerrado":scenario==="open"?"Representación de un sólido con borde abierto":"Representación de dos sólidos separados"}>
          <defs><linearGradient id="inspectorTop" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#E8D19B"/><stop offset="1" stopColor="#A98243"/></linearGradient><linearGradient id="inspectorSide" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#B58C4C"/><stop offset="1" stopColor="#70532C"/></linearGradient></defs>
          {scenario==="closed"?<g stroke="#E1C17B" strokeWidth="3" strokeLinejoin="round"><path d="M190 145 L360 75 L530 145 L360 215 Z" fill="url(#inspectorTop)"/><path d="M190 145 L360 215 L360 340 L190 270 Z" fill="#8F6B38"/><path d="M360 215 L530 145 L530 270 L360 340 Z" fill="url(#inspectorSide)"/><path d="M190 145 L360 75 L530 145" fill="none" stroke="#F1D99F" strokeWidth="4"/><path d="M190 270 L360 340 L530 270" fill="none" stroke="#E8C987" strokeWidth="4"/></g>:scenario==="open"?<g strokeLinejoin="round"><path d="M190 145 L360 75 L530 145 L360 215 Z" fill="url(#inspectorTop)" fillOpacity=".75" stroke="#E1C17B" strokeWidth="3"/><path d="M190 145 L360 215 L360 340 L190 270 Z" fill="#8F6B38" fillOpacity=".75" stroke="#E1C17B" strokeWidth="3"/><path d="M360 215 L530 145 L530 270 L360 340" fill="#70532C" fillOpacity=".45" stroke="#E1C17B" strokeWidth="3" strokeDasharray="9 7"/><path d="M360 340 L190 270" fill="none" stroke="#F59E0B" strokeWidth="7" strokeDasharray="10 8"/><circle cx="275" cy="305" r="7" fill="#F59E0B"/><path d="M275 305 L205 365" stroke="#F59E0B" strokeWidth="2"/><text x="185" y="390" fill="#F4C66A" fontSize="16" fontWeight="600">BORDE DESNUDO</text></g>:<g stroke="#E1C17B" strokeWidth="3" strokeLinejoin="round"><path d="M105 165 L225 115 L345 165 L225 215 Z" fill="url(#inspectorTop)"/><path d="M105 165 L225 215 L225 310 L105 260 Z" fill="#8F6B38"/><path d="M225 215 L345 165 L345 260 L225 310 Z" fill="url(#inspectorSide)"/><path d="M410 165 L510 125 L610 165 L510 205 Z" fill="url(#inspectorTop)"/><path d="M410 165 L510 205 L510 285 L410 245 Z" fill="#8F6B38"/><path d="M510 205 L610 165 L610 245 L510 285 Z" fill="url(#inspectorSide)"/><path d="M355 215 L395 215" stroke="#F59E0B" strokeWidth="3" strokeDasharray="6 6"/><path d="M365 205 L385 225 M385 205 L365 225" stroke="#F59E0B" strokeWidth="3"/></g>}
          {viewMode==="wireframe"&&<g fill="none" stroke="#9FC5D8" strokeWidth="1.5" strokeDasharray="5 5" opacity=".9"><path d="M190 145 L360 75 L530 145 L360 215 L190 145 M190 145 L190 270 L360 340 L530 270 L530 145 M360 215 L360 340"/><path d="M275 110 L445 180 M275 180 L445 250 M275 250 L445 320"/></g>}
          {viewMode==="errors"&&scenario==="open"&&<g fill="none" stroke="#FB923C" strokeWidth="7" strokeLinecap="round"><path d="M360 340 L190 270"/><circle cx="275" cy="305" r="10" fill="#FB923C" stroke="#111820" strokeWidth="3"/></g>}
          {viewMode==="errors"&&scenario==="disconnected"&&<g fill="none" stroke="#FB923C" strokeWidth="4" strokeDasharray="7 7"><path d="M350 215 L400 215"/><path d="M370 202 L390 228 M390 202 L370 228"/></g>}
         </svg>
         <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3"><span className="text-xs font-semibold text-slate-200">{scenario==="closed"?"Caras conectadas · sin bordes desnudos":scenario==="open"?"Hay un borde sin cerrar":"Dos volúmenes sin conexión entre sí"}</span><span className={"rounded-full px-2.5 py-1 text-[9px] font-semibold "+(scenario==="closed"?"bg-emerald-400/10 text-emerald-300":"bg-amber-400/10 text-amber-200")}>{scenario==="closed"?"Condición esperada":scenario==="open"?"Requiere corrección":"No forman una sola pieza"}</span></div>
        </div>
        <p className="mt-3 text-[10px] leading-5 text-slate-500">La ilustración explica el concepto. Para confirmar el estado real, inspecciona el objeto en Rhinoceros.</p>
       </div>
       <div className="absolute bottom-4 left-5 rounded-lg border border-white/10 bg-[#111820]/90 px-3 py-2 text-[10px] text-slate-400"><span className="mr-2 inline-block size-1.5 rounded-full bg-emerald-400"/>Selecciona un escenario para cambiar la geometría</div>
      </div>
      <div className="grid shrink-0 grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-[#151E27]"><div className="px-3 py-3 sm:px-5"><p className="text-[9px] uppercase tracking-wider text-slate-500">Escenario</p><p className="mt-1 text-xs font-semibold text-slate-200">{scenario==="closed"?"Cerrado":scenario==="open"?"Abierto":"Separado"}</p></div><div className="px-3 py-3 sm:px-5"><p className="text-[9px] uppercase tracking-wider text-slate-500">Qué revisar</p><p className="mt-1 text-xs font-semibold text-slate-200">{scenario==="closed"?"Continuidad":scenario==="open"?"Bordes desnudos":"Conexión"}</p></div><div className="px-3 py-3 sm:px-5"><p className="text-[9px] uppercase tracking-wider text-slate-500">Objetivo</p><p className="mt-1 text-xs font-semibold text-[#E6C887]">{scenario==="closed"?"Confirmar":scenario==="open"?"Localizar":"Distinguir"}</p></div></div>
     </main>
     <aside className="flex min-h-0 flex-col overflow-hidden bg-[#151E27]">
      <div className="shrink-0 border-b border-white/10 px-5 py-5"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#D2AD68]">Aprende paso a paso</p><h3 className="mt-1 text-lg font-semibold text-white">¿Tu objeto es un sólido?</h3><p className="mt-1 text-[11px] leading-5 text-slate-400">Reconoce tres situaciones habituales antes de continuar modelando.</p></div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
       <section><h4 className="text-xs font-semibold text-slate-200">1. Elige qué quieres inspeccionar</h4><div className="mt-3 grid grid-cols-3 gap-2">{[["closed","Cerrado","Caras conectadas"],["open","Abierto","Bordes libres"],["disconnected","Separado","Piezas distintas"]].map(([v,l,d])=><button key={v} type="button" onClick={()=>{setScenario(v as typeof scenario);setChecked(false);setQuizChoice("");setQuizSubmitted(false);}} aria-pressed={scenario===v} className={"min-w-0 rounded-xl border p-2.5 text-left transition "+(scenario===v?"border-[#D2AD68]/70 bg-[#D2AD68]/15 text-[#F0D69F]":"border-white/10 bg-[#101820] text-slate-300 hover:border-white/25")}><span className="block text-[11px] font-semibold">{l}</span><span className="mt-1 block text-[9px] leading-4 opacity-70">{d}</span></button>)}</div></section>
       <section className="border-t border-white/10 pt-5"><h4 className="text-xs font-semibold text-slate-200">2. Ejecuta el diagnóstico</h4><p className="mt-1 text-[10px] leading-5 text-slate-400">Selecciona el objeto en Rhino y utiliza la comprobación adecuada.</p><button type="button" onClick={()=>setChecked(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[#E6CB8C] to-[#B88D48] px-3 py-3 text-xs font-bold text-[#21190D] shadow transition hover:brightness-105"><ShieldCheck size={15}/> Analizar escenario</button>
        {checked&&<div className={"mt-3 rounded-xl border p-3 "+(scenario==="closed"?"border-emerald-500/30 bg-emerald-500/[.08]":"border-amber-500/30 bg-amber-500/[.08]")}><div className="flex items-center gap-2 text-xs font-semibold">{scenario==="closed"?<CheckCircle2 size={15} className="text-emerald-300"/>:<AlertTriangle size={15} className="text-amber-300"/>}<span>{scenario==="closed"?"Qué debes confirmar":scenario==="open"?"Señal de borde abierto":"Piezas independientes"}</span></div><p className="mt-2 text-[11px] leading-5 text-slate-300">{scenario==="closed"?"El objeto debe aparecer como una polisuperficie cerrada. Si Rhino lo identifica como cerrado, puede delimitar un volumen.":scenario==="open"?"Un borde desnudo indica que una o varias aristas no están unidas. Localízalas antes de intentar cerrar el objeto.":"La proximidad visual no significa que las piezas estén unidas. Comprueba si se tocan o intersectan antes de intentar una unión booleana."}</p></div>}
       </section>
       <section className="border-t border-white/10 pt-5"><h4 className="text-xs font-semibold text-slate-200">3. Comandos de Rhinoceros</h4><div className="mt-3 space-y-2">{(scenario==="closed"?[["_What","Identifica el tipo de objeto."],["_Properties","Consulta sus propiedades y estado."],["_ShowEdges","Comprueba que no existan bordes desnudos."]]:scenario==="open"?[["_ShowEdges","Activa Naked edges para localizar bordes libres."],["_Join","Une superficies que comparten bordes coincidentes."],["_Cap","Cierra una abertura plana cuando la geometría lo permite."]]:[["_What","Identifica cada objeto por separado."],["_BooleanUnion","Une volúmenes que se intersectan o se tocan correctamente."],["_Join","Solo une piezas con bordes compatibles; no elimina huecos."]]).map(([cmd,desc])=><div key={cmd} className="flex gap-3 rounded-lg border border-white/10 bg-[#101820] p-3"><code className="h-fit shrink-0 rounded-md border border-[#D2AD68]/25 bg-[#D2AD68]/10 px-2 py-1 text-[10px] font-semibold text-[#E6C887]">{cmd}</code><p className="text-[10px] leading-5 text-slate-400">{desc}</p></div>)}</div><p className="mt-3 text-[10px] leading-5 text-slate-500">El guion bajo permite llamar el comando internacional de Rhino aunque la interfaz esté en otro idioma.</p></section>
       <section className="rounded-xl border border-[#D2AD68]/20 bg-[#D2AD68]/[.06] p-3"><div className="flex items-center gap-2"><span className="flex size-6 items-center justify-center rounded-full bg-[#D2AD68]/15 text-[11px] font-bold text-[#E6C887]">!</span><h4 className="text-xs font-semibold text-slate-100">Recuerda</h4></div><p className="mt-2 text-[10px] leading-5 text-slate-300">Un objeto puede parecer cerrado en pantalla y aun así tener bordes desnudos. La apariencia no sustituye al diagnóstico de Rhino.</p></section>
       <section className="border-t border-white/10 pt-5"><h4 className="text-xs font-semibold text-slate-200">4. Comprueba lo aprendido</h4><p className="mt-1 text-[10px] leading-5 text-slate-400">{scenario==="open"?"¿Qué comando te ayuda a localizar los bordes desnudos?":scenario==="disconnected"?"¿Qué comando puede unir dos sólidos que se intersectan correctamente?":"¿Qué comando te permite identificar el tipo de objeto seleccionado?"}</p><div className="mt-3 grid grid-cols-2 gap-2">{["_ShowEdges","_Join","_BooleanUnion","_What"].map(cmd=><button key={cmd} type="button" onClick={()=>{setQuizChoice(cmd);setQuizSubmitted(false);}} aria-pressed={quizChoice===cmd} className={"rounded-lg border px-3 py-2.5 text-left text-[10px] font-semibold transition "+(quizChoice===cmd?"border-[#D2AD68]/70 bg-[#D2AD68]/15 text-[#F0D69F]":"border-white/10 bg-[#101820] text-slate-300 hover:border-white/25")}>{cmd}</button>)}</div><button type="button" disabled={!quizChoice} onClick={()=>setQuizSubmitted(true)} className="mt-2 w-full rounded-lg border border-[#D2AD68]/40 px-3 py-2.5 text-[10px] font-bold text-[#E6C887] transition hover:bg-[#D2AD68]/10 disabled:cursor-not-allowed disabled:opacity-40">Comprobar respuesta</button>{quizSubmitted&&<div className={"mt-2 rounded-lg border p-3 text-[10px] leading-5 "+(quizChoice===(scenario==="open"?"_ShowEdges":scenario==="disconnected"?"_BooleanUnion":"_What")?"border-emerald-500/30 bg-emerald-500/[.08] text-emerald-100":"border-amber-500/30 bg-amber-500/[.08] text-amber-100")}>{quizChoice===(scenario==="open"?"_ShowEdges":scenario==="disconnected"?"_BooleanUnion":"_What")?"¡Correcto! Has elegido una comprobación adecuada para este escenario.":"Todavía no. Revisa los comandos del paso 3 y vuelve a intentarlo."} {scenario==="disconnected"&&quizChoice==="_BooleanUnion"&&"Recuerda: los sólidos deben intersectarse o tocarse de forma válida."}</div>}</section>
       <button type="button" onClick={()=>{setScenario("closed");setChecked(false);setQuizChoice("");setQuizSubmitted(false);setViewMode("shaded");}} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-[#D2AD68]/50 hover:text-white"><RotateCcw size={14}/> Reiniciar ejercicio</button>
      </div>
      <div className="mt-auto shrink-0 border-t border-white/10 px-5 py-3"><p className="text-[9px] leading-4 text-slate-500">Simulador didáctico: no ejecuta Rhino ni valida archivos .3dm. Confirma siempre el resultado en Rhino 7 / MatrixGold.</p></div>
     </aside>
    </div>
    <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-[#19232D] px-5 py-3 sm:px-7"><p className="text-[10px] text-slate-500"><Layers3 className="mr-1 inline" size={13}/> AURUM LAB · Diagnóstico de sólidos</p><button type="button" onClick={closeInspector} className="rounded-lg bg-gradient-to-b from-[#E6CB8C] to-[#B88D48] px-4 py-2.5 text-xs font-bold text-[#21190D] shadow transition hover:brightness-105">Volver a la sesión 06</button></footer>
   </section>
  </div>}
 </>;
}
