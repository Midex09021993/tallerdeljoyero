import { useMemo, useState } from "react";
import ExtrusionViewport from "./ExtrusionViewport";
import RevolveStudio from "./RevolveStudio";
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
 const closeInspector=()=>{setInspectorOpen(false);setChecked(false);};
 const [profile,setProfile]=useState<"closed"|"open"|"nonplanar">("closed");
 const [height,setHeight]=useState(0);
 const [ringInner,setRingInner]=useState(17);
 const [ringWidth,setRingWidth]=useState(5);
 const [ringSection,setRingSection]=useState(2);
 const [ringProfile,setRingProfile]=useState<"rectangular"|"comfort"|"half-round">("rectangular");
 const [scenario,setScenario]=useState<"closed"|"open"|"disconnected">("closed");
 const [checked,setChecked]=useState(false);
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
  {(!onlyLab || onlyLab === "ring") && ringOpen && <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#080C11]/95 p-2 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label="Ring Volume Studio">
   <section className="flex h-[min(96dvh,960px)] w-full max-w-[1440px] flex-col overflow-hidden rounded-2xl border border-[#465565] bg-[#111820] text-[#E8EDF2] shadow-[0_30px_100px_rgba(0,0,0,.65)]">
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#19232D] px-5 py-3 sm:px-7">
     <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#D2AD68]">FADILAB / AURUM LAB / SESIÓN 06</p><div className="mt-1 flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-white sm:text-xl">Ring Volume Studio</h2><span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">Práctica guiada</span></div></div>
     <button type="button" onClick={closeRing} className={btn+" flex shrink-0 items-center gap-2"}><X size={15}/> Salir</button>
    </header>
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden">
     <main className="flex min-h-[520px] min-w-0 flex-col border-b border-white/10 lg:min-h-0 lg:border-b-0 lg:border-r">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-3 sm:px-7"><div><p className="text-xs font-semibold text-white">Área de construcción</p><p className="mt-0.5 text-[10px] text-slate-400">Proporciones del aro · unidades en milímetros</p></div><span className="rounded-full border border-[#D2AD68]/25 bg-[#D2AD68]/10 px-3 py-1.5 text-[10px] font-semibold text-[#E6C887]">Vista conceptual 3D</span></div>
      <div className="grid min-h-0 flex-1 gap-3 bg-[#0D141B] p-4 sm:p-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(220px,.7fr)]">
       <div className="relative flex min-h-[300px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#111A23] p-3">
        <div className="pointer-events-none absolute inset-0 opacity-[.18]" style={{backgroundImage:"linear-gradient(rgba(148,163,184,.18) 1px, transparent 1px),linear-gradient(90deg,rgba(148,163,184,.18) 1px, transparent 1px)",backgroundSize:"30px 30px"}}/>
        <svg viewBox="0 0 520 360" className="relative z-10 h-auto max-h-[440px] w-full" role="img" aria-label="Vista superior conceptual de un anillo con cotas de diámetro interior">
         <defs><linearGradient id="ringStudioGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F5DFA8"/><stop offset=".48" stopColor="#C49A54"/><stop offset="1" stopColor="#76572F"/></linearGradient><linearGradient id="ringStudioShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E5C783"/><stop offset="1" stopColor="#75552D"/></linearGradient></defs>
         <ellipse cx="250" cy="160" rx={Math.min(190,140+(ringInner-12)*2)} ry={Math.min(104,75+(ringInner-12)*1.3)} fill="none" stroke="#5A4529" strokeWidth={Math.max(12,ringSection*10+8)} opacity=".8"/>
         <ellipse cx="250" cy="150" rx={Math.min(190,140+(ringInner-12)*2)} ry={Math.min(104,75+(ringInner-12)*1.3)} fill="none" stroke="url(#ringStudioGold)" strokeWidth={Math.max(12,ringSection*10+8)}/>
         <ellipse cx="250" cy="150" rx={Math.min(190,140+(ringInner-12)*2)} ry={Math.min(104,75+(ringInner-12)*1.3)} fill="none" stroke="#F2D99E" strokeWidth="1.5" opacity=".9"/>
         <ellipse cx="250" cy="150" rx={Math.max(48,Math.min(190,140+(ringInner-12)*2)-Math.max(12,ringSection*10+8))} ry={Math.max(26,Math.min(104,75+(ringInner-12)*1.3)-Math.max(12,ringSection*10+8)*.55)} fill="none" stroke="#F2D99E" strokeWidth="2" opacity=".8"/>
         <path d="M86 150 V260 M414 150 V260 M86 248 H414 M80 242 L86 248 L80 254 M420 242 L414 248 L420 254" fill="none" stroke="#D2AD68" strokeWidth="1.6"/>
         <text x="250" y="278" textAnchor="middle" fill="#E6C887" fontSize="13" fontWeight="600">Ø interior · {ringInner} mm</text>
         <path d="M370 48 H430 V82" fill="none" stroke="#D2AD68" strokeWidth="1.5"/><text x="434" y="46" fill="#E6C887" fontSize="11">Sección</text><text x="434" y="61" fill="#B7C3CF" fontSize="11">{ringSection} mm</text>
         <text x="250" y="332" textAnchor="middle" fill="#9EADBA" fontSize="11">Vista superior · forma y espesor conceptual</text>
        </svg>
        <span className="absolute bottom-3 left-3 rounded-lg border border-white/10 bg-[#101820]/90 px-3 py-2 text-[10px] text-slate-400">La vista responde a los cambios de dimensión</span>
       </div>
       <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <section className="rounded-xl border border-white/10 bg-[#151E27] p-4"><div className="flex items-center justify-between gap-2"><h3 className="text-xs font-semibold text-white">Perfil de la sección</h3><span className="text-[9px] uppercase tracking-wider text-slate-500">Corte lateral</span></div>
         <svg viewBox="0 0 300 170" className="mt-2 w-full" role="img" aria-label="Perfil transversal del aro"><defs><linearGradient id="ringSectionGold" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#F1D79B"/><stop offset="1" stopColor="#99713B"/></linearGradient></defs>
          {ringProfile==="rectangular"?<rect x="74" y="48" width="152" height="58" rx="3" fill="url(#ringSectionGold)" stroke="#F1D79B" strokeWidth="2"/>:ringProfile==="comfort"?<path d="M74 106 Q74 48 112 48 H188 Q226 48 226 106 Q150 119 74 106Z" fill="url(#ringSectionGold)" stroke="#F1D79B" strokeWidth="2"/>:<path d="M74 106 Q74 48 150 48 Q226 48 226 106Z" fill="url(#ringSectionGold)" stroke="#F1D79B" strokeWidth="2"/>}
          <path d="M74 126 V139 M226 126 V139 M74 134 H226 M68 128 L74 134 L68 140 M232 128 L226 134 L232 140" stroke="#D2AD68" fill="none" strokeWidth="1.4"/><text x="150" y="153" textAnchor="middle" fill="#E6C887" fontSize="10">{ringWidth} mm · ancho</text>
          <path d="M244 48 H260 M244 106 H260 M253 48 V106" stroke="#D2AD68" fill="none" strokeWidth="1.4"/><text x="263" y="80" fill="#E6C887" fontSize="10">{ringSection}</text>
         </svg>
         <p className="text-[10px] leading-4 text-slate-400">{ringProfile==="rectangular"?"Perfil recto: caras planas y esquinas definidas.":ringProfile==="comfort"?"Perfil confort: interior y exterior suavemente curvados.":"Media caña: sección exterior redondeada."}</p>
        </section>
        <section className="rounded-xl border border-white/10 bg-[#151E27] p-4"><h3 className="text-xs font-semibold text-white">Resumen dimensional</h3><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-[#0F1720] p-2"><p className="text-[9px] text-slate-500">Interior</p><p className="mt-1 text-sm font-semibold text-white">{ringInner}</p><p className="text-[9px] text-slate-500">mm</p></div><div className="rounded-lg bg-[#0F1720] p-2"><p className="text-[9px] text-slate-500">Ancho</p><p className="mt-1 text-sm font-semibold text-white">{ringWidth}</p><p className="text-[9px] text-slate-500">mm</p></div><div className="rounded-lg bg-[#0F1720] p-2"><p className="text-[9px] text-slate-500">Espesor</p><p className="mt-1 text-sm font-semibold text-white">{ringSection}</p><p className="text-[9px] text-slate-500">mm</p></div></div></section>
       </div>
      </div>
     </main>
     <aside className="flex min-h-0 flex-col overflow-hidden bg-[#151E27]">
      <div className="border-b border-white/10 px-5 py-5"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#D2AD68]">Aprende paso a paso</p><h3 className="mt-1 text-lg font-semibold text-white">Diseña la proporción de un aro</h3><p className="mt-1 text-[11px] leading-5 text-slate-400">Modifica tres medidas y observa cómo cambia la sección del anillo.</p></div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
       <section><h4 className="text-xs font-semibold text-slate-200">1. Elige la forma del perfil</h4><div className="mt-3 grid grid-cols-3 gap-2">{[["rectangular","Recto"],["comfort","Confort"],["half-round","Media caña"]].map(([value,label])=><button key={value} type="button" aria-pressed={ringProfile===value} onClick={()=>setRingProfile(value as typeof ringProfile)} className={"rounded-lg border px-2 py-2.5 text-[10px] font-semibold transition "+(ringProfile===value?"border-[#D2AD68]/70 bg-[#D2AD68]/15 text-[#F0D69F]":"border-white/10 bg-[#101820] text-slate-300 hover:border-white/25")}>{label}</button>)}</div><p className="mt-2 text-[10px] leading-4 text-slate-500">La sección es el perfil que se gira alrededor del eje para formar el aro.</p></section>
       <section className="space-y-4 border-t border-white/10 pt-5"><h4 className="text-xs font-semibold text-slate-200">2. Ajusta las dimensiones</h4>
        <label className="block text-xs text-slate-300"><span className="flex justify-between gap-2"><span>Diámetro interior</span><strong className="text-[#E6C887]">{ringInner.toFixed(1)} mm</strong></span><input aria-label="Diámetro interior en milímetros" type="range" min="12" max="24" step=".5" value={ringInner} onChange={e=>setRingInner(Number(e.target.value))} className="mt-3 w-full accent-[#C6A15B]"/><span className="flex justify-between text-[9px] text-slate-500"><span>12 mm</span><span>24 mm</span></span></label>
        <label className="block text-xs text-slate-300"><span className="flex justify-between gap-2"><span>Ancho del aro</span><strong className="text-[#E6C887]">{ringWidth.toFixed(1)} mm</strong></span><input aria-label="Ancho del aro en milímetros" type="range" min="2" max="10" step=".5" value={ringWidth} onChange={e=>setRingWidth(Number(e.target.value))} className="mt-3 w-full accent-[#C6A15B]"/><span className="flex justify-between text-[9px] text-slate-500"><span>2 mm</span><span>10 mm</span></span></label>
        <label className="block text-xs text-slate-300"><span className="flex justify-between gap-2"><span>Espesor de sección</span><strong className="text-[#E6C887]">{ringSection.toFixed(1)} mm</strong></span><input aria-label="Espesor de sección en milímetros" type="range" min="1" max="5" step=".5" value={ringSection} onChange={e=>setRingSection(Number(e.target.value))} className="mt-3 w-full accent-[#C6A15B]"/><span className="flex justify-between text-[9px] text-slate-500"><span>1 mm</span><span>5 mm</span></span></label>
       </section>
       <section className="rounded-xl border border-emerald-400/20 bg-emerald-400/[.06] p-3"><div className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-300"/><h4 className="text-xs font-semibold text-emerald-200">Observa el cambio</h4></div><p className="mt-2 text-[11px] leading-5 text-slate-300">El diámetro define el espacio interior; el ancho determina cuánto ocupa el aro sobre el dedo y el espesor modifica la sección del material. Son proporciones de aprendizaje, no medidas de fabricación certificadas.</p></section>
       <section className="border-t border-white/10 pt-5"><h4 className="text-xs font-semibold text-slate-200">3. Llévalo a Rhinoceros</h4><div className="mt-3 rounded-xl border border-[#D2AD68]/25 bg-[#D2AD68]/[.07] p-3"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#D2AD68]">Comando principal de Rhino</p><p className="mt-1 text-xl font-bold text-[#F0D69F]">Revolve</p><p className="mt-1 text-[10px] leading-4 text-slate-300">Gira una curva de sección alrededor de un eje para generar el volumen del aro.</p></div><ol className="mt-3 space-y-2 text-[10px] leading-5 text-slate-300"><li><span className="mr-2 font-bold text-[#D2AD68]">01</span>Dibuja una sección cerrada en una vista lateral.</li><li><span className="mr-2 font-bold text-[#D2AD68]">02</span>Coloca la sección a la distancia del eje que corresponda al diámetro interior.</li><li><span className="mr-2 font-bold text-[#D2AD68]">03</span>Selecciona la sección, escribe <code className="rounded bg-black/30 px-1.5 py-0.5 text-[#F0D69F]">Revolve</code> y define el eje.</li><li><span className="mr-2 font-bold text-[#D2AD68]">04</span>Introduce <strong className="text-white">360°</strong> para completar la vuelta.</li></ol><p className="mt-3 text-[10px] leading-4 text-slate-500">Consejo: usa <code className="rounded bg-black/30 px-1">Fillet</code> para suavizar esquinas de la sección antes de revolucionarla, si el diseño lo requiere.</p></section>
       <button type="button" onClick={()=>{setRingInner(17);setRingWidth(5);setRingSection(2);setRingProfile("rectangular");}} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-[#D2AD68]/50 hover:text-white"><RotateCcw size={14}/> Restablecer ejercicio</button>
      </div>
      <div className="mt-auto border-t border-white/10 px-5 py-3"><p className="text-[9px] leading-4 text-slate-500">Simulador conceptual · valida el perfil y el sólido final en Rhino 7 / MatrixGold.</p></div>
     </aside>
    </div>
    <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-[#19232D] px-5 py-3 sm:px-7"><p className="text-[10px] text-slate-500"><Layers3 className="mr-1 inline" size={13}/> AURUM LAB · Modelado de anillos</p><button type="button" onClick={closeRing} className="rounded-lg bg-gradient-to-b from-[#E6CB8C] to-[#B88D48] px-4 py-2.5 text-xs font-bold text-[#21190D] shadow transition hover:brightness-105">Volver a la sesión 06</button></footer>
   </section>
  </div>}
  {(!onlyLab || onlyLab === "inspector") && inspectorOpen && <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-2 sm:p-5" role="dialog" aria-modal="true" aria-label="Solid Inspector">
   <section className="flex h-[min(94dvh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#526171] bg-[#171F28] text-[#E8EDF2] shadow-2xl">
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#202A35] px-4 py-3 sm:px-6">
     <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#C6A15B]">AURUM LAB · SESIÓN 06</p><h2 className="mt-0.5 text-lg font-semibold text-white">Solid Inspector</h2></div>
     <button type="button" onClick={closeInspector} className={btn+" flex items-center gap-2"}><X size={16}/> Cerrar</button>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
     {(false || false) && <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(270px,.8fr)]">
      <div className={shell+" p-3 sm:p-5"}>
       <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold text-white">Vista conceptual del resultado</p><p className="text-[11px] text-[#9EADBA]">Representación esquemática, no geometría CAD real</p></div><span className="rounded-md bg-[#C6A15B]/10 px-2 py-1 text-[10px] text-[#E3C47F]">{false?"EXTRUSIÓN":"REVOLUCIÓN"}</span></div>
       <div className="mt-3 flex min-h-[270px] items-center justify-center rounded-lg border border-white/5 bg-[#141B23] p-3">
        <svg viewBox="0 0 520 300" className="h-auto max-h-[360px] w-full" role="img" aria-label="Esquema conceptual del volumen">
         <defs><linearGradient id="solidGold" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#E8D19B"/><stop offset=".55" stopColor="#A98243"/><stop offset="1" stopColor="#6D542F"/></linearGradient></defs>
         {false ? <g transform="translate(0 4)"><path d={profile==="open"?"M125 190 L125 110 L220 75 L300 110":"M125 190 L125 110 L220 75 L315 110 L315 190 Z"} fill="none" stroke="#D9B66E" strokeWidth="3"/><path d={profile==="open"?"M205 225 L205 145 L300 110":"M205 225 L205 145 L300 110 L395 145 L395 225 Z"} fill="none" stroke="#D9B66E" strokeWidth="2.5"/>{profile==="closed"&&<><path d="M125 110 L205 145 L300 110 L220 75 Z" fill="url(#solidGold)" opacity=".65"/><path d="M315 110 L395 145 L395 225 L315 190 Z" fill="url(#solidGold)" opacity=".75"/><path d="M125 190 L205 225 L395 225 L315 190 Z" fill="#8E6B36" opacity=".8"/></>}<path d="M340 80 L340 36 M334 45 L340 36 L346 45" stroke="#C6A15B" strokeWidth="2" fill="none"/><text x="352" y="43" fill="#E3C47F" fontSize="12">Altura {height} mm</text></g>
         : <g><ellipse cx="260" cy="153" rx="150" ry="72" fill="none" stroke="#D9B66E" strokeWidth="3"/><ellipse cx="260" cy="153" rx="72" ry="34" fill="none" stroke="#D9B66E" strokeWidth="3"/><path d="M110 153 C110 196 177 225 260 225 C343 225 410 196 410 153 L410 176 C410 219 343 248 260 248 C177 248 110 219 110 176 Z" fill="url(#solidGold)" opacity=".9"/><path d="M188 153 C188 173 220 187 260 187 C300 187 332 173 332 153 L332 166 C332 185 300 200 260 200 C220 200 188 185 188 166 Z" fill="#6D542F"/><path d="M260 153 L410 153" stroke="#C6A15B" strokeDasharray="4 4"/><text x="270" y="139" fill="#E3C47F" fontSize="12">Eje</text><path d="M420 120 A165 80 0 0 1 410 185" fill="none" stroke="#C6A15B" strokeWidth="2"/><text x="420" y="110" fill="#E3C47F" fontSize="12">{angle}°</text></g>}
        </svg>
       </div>
       <p className="mt-3 rounded-lg border border-white/10 bg-[#141B23] px-3 py-2 text-xs text-[#B7C3CF]">{false?"Laboratorio independiente · Extrusión":"Laboratorio independiente · Revolución"}</p>
      </div>
      <aside className="space-y-4">
       <div className={shell+" p-4"}><h3 className="text-sm font-semibold text-white">Parámetros de construcción</h3>
        {false?<><label className="mt-4 block text-xs text-[#C7D1DA]">Condición del perfil</label><div className="mt-2 grid grid-cols-3 gap-1">{[["closed","Cerrado"],["open","Abierto"],["nonplanar","No plano"]].map(([v,l])=><button key={v} type="button" onClick={()=>setProfile(v as typeof profile)} className={btn+(profile===v?" "+activeBtn:"")+" px-1"}>{l}</button>)}</div><label className="mt-4 flex justify-between text-xs text-[#C7D1DA]">Altura <strong className="text-[#E3C47F]">{height} mm</strong></label><input type="range" min="2" max="30" value={height} onChange={e=>setHeight(Number(e.target.value))} className="mt-2 w-full accent-[#C6A15B]"/></>:<><label className="mt-4 flex justify-between text-xs text-[#C7D1DA]">Ángulo de revolución <strong className="text-[#E3C47F]">{angle}°</strong></label><input type="range" min="45" max="360" step="15" value={angle} onChange={e=>setAngle(Number(e.target.value))} className="mt-2 w-full accent-[#C6A15B]"/><p className="mt-3 text-xs leading-5 text-[#9EADBA]">La revolución depende del perfil y del eje seleccionado. Una vuelta completa utiliza 360°.</p></>}
       </div>
       <div className={shell+" p-4"}><h3 className="text-sm font-semibold text-white">Lectura del resultado</h3><p className="mt-2 text-xs leading-5 text-[#C7D1DA]">{false?result:angle===360?"Una revolución completa puede cerrar la forma alrededor del eje si el perfil y la construcción son adecuados.": "Una revolución parcial deja una abertura angular; revisa si el resultado requiere tapas y uniones adicionales."}</p><p className="mt-3 rounded-lg border border-[#C6A15B]/20 bg-[#C6A15B]/5 p-3 text-[11px] leading-5 text-[#E3D5B8]">En Rhino 7: revisa la opción Solid al extruir una curva cerrada y plana. Para una revolución, el resultado depende del perfil, el eje y el ángulo; no asumas que cualquier revolución genera automáticamente un sólido.</p></div>
      </aside>
     </div>}
     {false && <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(270px,.8fr)]">
      <div className={shell+" p-4 sm:p-5"}><p className="text-sm font-semibold text-white">Sección y proporción del anillo</p><p className="text-[11px] text-[#9EADBA]">Modelo conceptual paramétrico para estudiar dimensiones</p><div className="mt-4 flex min-h-[300px] items-center justify-center rounded-lg bg-[#141B23] p-3"><svg viewBox="0 0 520 320" className="w-full max-h-[380px]" role="img" aria-label="Anillo esquemático con sección y diámetro interior"><defs><linearGradient id="ringGold" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#F0D99F"/><stop offset=".55" stopColor="#B58C4C"/><stop offset="1" stopColor="#70532C"/></linearGradient></defs><ellipse cx="260" cy="150" rx={Math.min(170,ringInner*5.5)} ry={Math.min(86,ringInner*2.8)} fill="none" stroke="url(#ringGold)" strokeWidth={Math.max(10,ringWidth*5)}/><ellipse cx="260" cy="150" rx={Math.min(170,ringInner*5.5)-Math.max(10,ringWidth*5)*.48} ry={Math.min(86,ringInner*2.8)-Math.max(10,ringWidth*5)*.48} fill="none" stroke="#E7D3A3" strokeWidth="2" opacity=".7"/><path d="M90 260 H430 M90 254 V266 M430 254 V266" stroke="#C6A15B" strokeWidth="1.5"/><text x="260" y="282" textAnchor="middle" fill="#E3C47F" fontSize="13">Ø interior conceptual: {ringInner} mm</text><path d="M420 70 L455 70 L455 110" fill="none" stroke="#C6A15B"/><text x="460" y="67" fill="#E3C47F" fontSize="11">Sección</text><text x="460" y="82" fill="#B7C3CF" fontSize="11">{ringSection} mm</text></svg></div><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-[#141B23] p-2"><p className="text-[10px] text-[#9EADBA]">Diámetro</p><p className="text-sm font-semibold text-white">{ringInner} mm</p></div><div className="rounded-lg bg-[#141B23] p-2"><p className="text-[10px] text-[#9EADBA]">Ancho</p><p className="text-sm font-semibold text-white">{ringWidth} mm</p></div><div className="rounded-lg bg-[#141B23] p-2"><p className="text-[10px] text-[#9EADBA]">Sección</p><p className="text-sm font-semibold text-white">{ringSection} mm</p></div></div></div>
      <aside className={shell+" space-y-4 p-4"}><h3 className="text-sm font-semibold text-white">Ajusta las dimensiones</h3>{[[ringInner,setRingInner,"Diámetro interior",12,24,"mm"],[ringWidth,setRingWidth,"Ancho del aro",2,10,"mm"],[ringSection,setRingSection,"Espesor de sección",1,5,"mm"]].map(([v,set,label,min,max,unit])=><label key={String(label)} className="block text-xs text-[#C7D1DA]"><span className="flex justify-between">{label as string}<strong className="text-[#E3C47F]">{number(v as number)} {unit as string}</strong></span><input type="range" min={min as number} max={max as number} step=".5" value={v as number} onChange={e=>(set as (n:number)=>void)(Number(e.target.value))} className="mt-2 w-full accent-[#C6A15B]"/></label>)}<p className="rounded-lg border border-white/10 bg-[#141B23] p-3 text-[11px] leading-5 text-[#B7C3CF]">En Rhino, dibuja una sección cerrada adecuada y ubícala respecto al eje de revolución. Estos controles enseñan la relación dimensional; no calculan talla comercial, peso ni tolerancias de fabricación.</p><button type="button" onClick={()=>{setRingInner(17);setRingWidth(5);setRingSection(2);}} className={btn+" flex items-center gap-2"}><RotateCcw size={14}/> Restablecer dimensiones</button></aside>
     </div>}
     {true && <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
      <div className={shell+" p-4 sm:p-5"}><p className="text-sm font-semibold text-white">Escenarios de diagnóstico</p><div className="mt-3 grid grid-cols-3 gap-2">{[["closed","Cerrado"],["open","Abierto"],["disconnected","Separado"]].map(([v,l])=><button key={v} type="button" onClick={()=>{setScenario(v as typeof scenario);setChecked(false);}} className={btn+(scenario===v?" "+activeBtn:"")+" px-1"}>{l}</button>)}</div><div className="mt-4 flex min-h-[300px] items-center justify-center rounded-lg bg-[#141B23] p-3"><svg viewBox="0 0 520 300" className="w-full max-h-[360px]" role="img" aria-label="Escenario geométrico de inspección"><path d="M120 185 L120 100 L250 55 L380 100 L380 185 Z" fill="#B58C4C" fillOpacity=".24" stroke="#D9B66E" strokeWidth="3"/><path d="M120 185 L250 235 L380 185" fill="none" stroke="#D9B66E" strokeWidth="3"/><path d="M120 100 L250 150 L380 100" fill="none" stroke="#D9B66E" strokeWidth="2" opacity=".7"/>{scenario==="open"&&<path d="M120 185 L250 235" stroke="#F59E0B" strokeWidth="5" strokeDasharray="7 5"/>}{scenario==="disconnected"&&<g transform="translate(28 -20)"><path d="M370 205 L420 180 L470 205 L420 230 Z" fill="#B58C4C" fillOpacity=".4" stroke="#D9B66E" strokeWidth="2"/></g>}<text x="260" y="275" fill="#9EADBA" fontSize="12" textAnchor="middle">{scenario==="closed"?"Caras unidas · volumen cerrado":scenario==="open"?"Borde desnudo · falta continuidad":"Dos piezas sin unión geométrica"}</text></svg></div></div>
      <aside className={shell+" p-4"}><h3 className="text-sm font-semibold text-white">Inspección en Rhino</h3><p className="mt-2 text-xs leading-5 text-[#B7C3CF]">Selecciona un escenario y decide qué comprobación corresponde.</p><button type="button" onClick={()=>setChecked(true)} className="mt-4 w-full rounded-lg bg-[#C6A15B] px-3 py-2.5 text-xs font-bold text-[#171F28] hover:bg-[#D7B96F]">Analizar escenario</button>{checked&&<div className={"mt-3 rounded-lg border p-3 "+(scenario==="closed"?"border-emerald-500/30 bg-emerald-500/10":"border-amber-500/30 bg-amber-500/10")}><div className="flex items-center gap-2 text-xs font-semibold">{scenario==="closed"?<CheckCircle2 size={15}/>:<AlertTriangle size={15}/>} {scenario==="closed"?"Volumen cerrado en el esquema":scenario==="open"?"Se detecta un borde abierto":"Se detectan componentes separados"}</div><p className="mt-2 text-[11px] leading-5 text-[#D2DCE5]">{scenario==="closed"?"En Rhino confirma el tipo de objeto con What o Propiedades y comprueba que sea una polisuperficie cerrada.":scenario==="open"?"Usa ShowEdges y activa Naked edges. Localiza los bordes desnudos y revisa si las superficies se pueden unir o tapar.": "Selecciona cada pieza por separado, revisa la estructura y decide si debe unirse mediante una operación válida; no confundas proximidad visual con unión."}</p></div>}<div className="mt-4 rounded-lg border border-white/10 bg-[#141B23] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#C6A15B]">Comandos de referencia</p><p className="mt-2 text-xs leading-5 text-[#B7C3CF]">What · ShowEdges · Join · Cap · Properties</p></div></aside>
     </div>}
    </div>
    <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#202A35] px-4 py-3 sm:px-6"><p className="text-[10px] text-[#9EADBA]"><Layers3 className="mr-1 inline" size={13}/> Simulación conceptual · valida siempre el modelo en Rhino 7/MatrixGold</p><button type="button" onClick={closeInspector} className={btn}>Volver a la sesión 06</button></footer>
   </section>
  </div>}
 </>;
}
