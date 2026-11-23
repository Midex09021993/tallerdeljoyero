import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, RotateCcw, ShieldCheck, X } from "lucide-react";

type Escenario = "cerrado" | "abierto" | "duplicado" | "delgado";
const escenarios: Array<{id:Escenario;nombre:string;detalle:string;hallazgo:string}> = [
  {id:"cerrado",nombre:"Volumen cerrado",detalle:"Las caras forman un volumen continuo.",hallazgo:"Condición geométrica favorable; confirma el estado del sólido en Rhino."},
  {id:"abierto",nombre:"Borde desnudo",detalle:"Existe una abertura en la geometría.",hallazgo:"No lo consideres un sólido cerrado. Localiza y revisa los bordes desnudos en Rhino."},
  {id:"duplicado",nombre:"Geometría duplicada",detalle:"Dos elementos coinciden o se superponen.",hallazgo:"Comprueba objetos duplicados y superficies solapadas antes de unir o exportar."},
  {id:"delgado",nombre:"Detalle muy fino",detalle:"Una zona del modelo tiene una sección reducida.",hallazgo:"Contrasta el espesor con las especificaciones del proceso, material y fabricante."}
];
const checks = [
  {id:"solid",label:"He comprobado si el objeto es un sólido cerrado"},
  {id:"edges",label:"He revisado bordes desnudos y superficies abiertas"},
  {id:"duplicates",label:"He buscado objetos duplicados o solapados"},
  {id:"thickness",label:"He revisado espesores, uniones y detalles pequeños"},
  {id:"backup",label:"He conservado una copia antes de reparar"}
];

export default function LaboratorioValidacionModelo() {
 const [abierto,setAbierto]=useState(false);
 const [escenario,setEscenario]=useState<Escenario>("cerrado");
 const [modoVista,setModoVista]=useState<"sombreado"|"alambre"|"defectos">("sombreado");
 const [espesor,setEspesor]=useState(1.2);
 const [seleccion,setSeleccion]=useState<string[]>([]);
 const [nota,setNota]=useState("");
 const [resultado,setResultado]=useState(false);
 const actual=escenarios.find(x=>x.id===escenario)!;
 const completo=checks.every(x=>seleccion.includes(x.id));
 const estado=useMemo(()=>escenario==="cerrado"?"Geometría conceptual cerrada":escenario==="abierto"?"Abertura detectada":escenario==="duplicado"?"Posible duplicidad":"Espesor por verificar",[escenario]);
 const reset=()=>{setEscenario("cerrado");setModoVista("sombreado");setEspesor(1.2);setSeleccion([]);setNota("");setResultado(false);};
 const toggle=(id:string)=>{setSeleccion(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);setResultado(false);};
 return <>
  <section className="mt-7 overflow-hidden rounded-2xl border border-[#344352] bg-[#171F28] text-[#E8EDF2]">
   <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
    <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-300">FADILAB · SESIÓN 08 · LABORATORIO INDEPENDIENTE</p><h4 className="mt-1 text-xl font-semibold">MODEL VALIDATION LAB</h4><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">Inspecciona condiciones geométricas, detecta defectos conceptuales y organiza una revisión previa a fabricación.</p><div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-300"><span className="rounded-full border border-white/15 px-3 py-1.5">Sólidos y bordes</span><span className="rounded-full border border-white/15 px-3 py-1.5">Duplicados</span><span className="rounded-full border border-white/15 px-3 py-1.5">Espesores y detalles</span></div></div>
    <button type="button" onClick={()=>setAbierto(true)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-b from-amber-200 to-amber-500 px-5 py-3 text-sm font-bold text-[#21180A] shadow-lg hover:brightness-105"><ShieldCheck className="size-4"/> Abrir laboratorio</button>
   </div>
   <p className="border-t border-white/10 px-5 py-3 text-[11px] leading-5 text-[#9EADBA]">Simulador didáctico: no analiza archivos 3DM ni sustituye comandos de Rhino como ShowEdges, SelDup o las herramientas de análisis. Los espesores admisibles dependen del proceso y del fabricante.</p>
  </section>
  {abierto && <div className="fixed inset-0 z-[160] flex h-[100dvh] flex-col overflow-hidden bg-[#10141A] text-white" role="dialog" aria-modal="true" aria-label="Model Validation Lab · Sesión 08">
   <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#1C2129] px-4 py-3 sm:px-6"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-300">FADILAB / AURUM LAB / SESIÓN 08</p><h2 className="text-lg font-semibold">Model Validation Lab</h2><p className="text-[11px] text-slate-400">Inspección conceptual antes de fabricación</p></div><div className="flex gap-2"><button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/5"><RotateCcw className="size-3.5"/> Reiniciar</button><button type="button" onClick={()=>setAbierto(false)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold hover:border-amber-300/60"><X className="size-4"/> Cerrar</button></div></header>
   <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_380px] lg:overflow-hidden">
    <main className="flex min-h-[420px] min-w-0 flex-col border-b border-white/10 lg:min-h-0 lg:border-b-0 lg:border-r">
     <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-3"><div><p className="text-xs font-semibold">Área de inspección</p><p className="text-[10px] text-slate-400">Vista esquemática · geometría de referencia</p></div><div className="flex gap-1.5">{(["sombreado","alambre","defectos"] as const).map(v=><button key={v} type="button" onClick={()=>setModoVista(v)} aria-pressed={modoVista===v} className={`rounded-lg border px-2.5 py-1.5 text-[10px] capitalize ${modoVista===v?"border-[#D2AD68] bg-[#D2AD68]/15 text-[#F1D9A6]":"border-white/15 text-slate-300"}`}>{v}</button>)}</div></div>
     <div className="relative flex min-h-[310px] flex-1 items-center justify-center overflow-hidden bg-[#0D141B] p-3 sm:p-6">
      <svg viewBox="0 0 640 420" role="img" aria-label={`Modelo conceptual: ${actual.nombre}`} className="h-full max-h-[560px] w-full">
       <defs><pattern id="validationGrid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#334155" strokeWidth=".7"/></pattern><linearGradient id="validationGold" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#F2D99C"/><stop offset=".5" stopColor="#B88B3F"/><stop offset="1" stopColor="#705126"/></linearGradient></defs>
       <rect width="640" height="420" fill="url(#validationGrid)"/>
       {escenario==="duplicado" ? <g transform="translate(0 0)"><path d="M150 145 L300 80 L450 145 L300 210 Z M150 145 L150 280 L300 345 L300 210 M300 210 L450 145 L450 280 L300 345" fill="url(#validationGold)" fillOpacity=".8" stroke="#E8C987" strokeWidth="3"/><g transform="translate(38 -22)" opacity=".58"><path d="M150 145 L300 80 L450 145 L300 210 Z M150 145 L150 280 L300 345 L300 210 M300 210 L450 145 L450 280 L300 345" fill="none" stroke="#FB923C" strokeWidth="4" strokeDasharray="9 7"/></g><path d="M465 95 L510 50 M490 50 H510 V70" fill="none" stroke="#FB923C" strokeWidth="4"/><text x="475" y="120" fill="#FDBA74" fontSize="14">Superposición</text></g>
       : <g><path d="M150 145 L300 80 L450 145 L300 210 Z" fill="url(#validationGold)" fillOpacity={escenario==="abierto"?.78:1} stroke="#E8C987" strokeWidth="3"/><path d="M150 145 L150 280 L300 345 L300 210 Z" fill="#8F6B38" stroke="#E8C987" strokeWidth="3"/>{escenario!=="abierto"&&<path d="M300 210 L450 145 L450 280 L300 345 Z" fill="#70532C" stroke="#E8C987" strokeWidth="3"/>}{escenario==="abierto"&&<path d="M300 210 L450 145 L450 280" fill="none" stroke="#FB923C" strokeWidth="6" strokeDasharray="10 7"/>}{escenario==="delgado"&&<g><path d="M220 178 L300 145 L380 178 L300 212" fill="none" stroke="#FB923C" strokeWidth={Math.max(2,espesor*2)} /><path d="M300 145 L300 212" stroke="#FDE68A" strokeDasharray="4 4" strokeWidth="2"/><text x="385" y="175" fill="#FDBA74" fontSize="14">{espesor.toFixed(1)} mm · referencia</text></g>}</g>}
       {modoVista!=="sombreado"&&<g fill="none" stroke={modoVista==="defectos"?"#FB923C":"#9FC5D8"} strokeWidth="2" strokeDasharray={modoVista==="defectos"?"7 5":"4 5"} opacity=".95"><path d="M150 145 L300 80 L450 145 L300 210 L150 145 M150 145 V280 L300 345 L450 280 V145 M300 210 V345"/>{escenario==="abierto"&&<path d="M300 210 L450 145 L450 280" stroke="#FB923C" strokeWidth="6"/>}</g>}
       <text x="20" y="28" fill="#AAB7C5" fontSize="12">DIAGNÓSTICO VISUAL · {actual.nombre.toUpperCase()}</text><text x="20" y="395" fill="#AAB7C5" fontSize="11">{modoVista.toUpperCase()} · {estado.toUpperCase()}</text>
      </svg>
     </div>
     <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-[#151E27]"><div className="px-4 py-3"><p className="text-[9px] uppercase text-slate-500">Escenario</p><p className="mt-1 text-xs font-semibold">{actual.nombre}</p></div><div className="px-4 py-3"><p className="text-[9px] uppercase text-slate-500">Vista</p><p className="mt-1 text-xs font-semibold">{modoVista}</p></div><div className="px-4 py-3"><p className="text-[9px] uppercase text-slate-500">Espesor visual</p><p className="mt-1 text-xs font-semibold text-amber-200">{espesor.toFixed(1)} mm</p></div></div>
    </main>
    <aside className="min-h-0 space-y-4 overflow-y-auto bg-[#151E27] p-4 sm:p-5">
     <section><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#D2AD68]">Selecciona un caso</p><div className="mt-3 grid grid-cols-2 gap-2">{escenarios.map(s=><button key={s.id} type="button" onClick={()=>{setEscenario(s.id);setResultado(false);}} aria-pressed={escenario===s.id} className={`rounded-xl border p-3 text-left ${escenario===s.id?"border-[#D2AD68]/70 bg-[#D2AD68]/15":"border-white/10 bg-[#101820] hover:border-white/25"}`}><span className="block text-xs font-semibold">{s.nombre}</span><span className="mt-1 block text-[10px] leading-4 text-slate-400">{s.detalle}</span></button>)}</div></section>
     {escenario==="delgado"&&<section className="rounded-xl border border-white/10 bg-[#222B36] p-4"><label className="flex justify-between text-xs">Espesor de referencia <b>{espesor.toFixed(1)} mm</b></label><input type="range" min=".3" max="3" step=".1" value={espesor} onChange={e=>{setEspesor(+e.target.value);setResultado(false);}} className="mt-3 w-full accent-[#C6A15B]"/><p className="mt-2 text-[10px] leading-5 text-slate-400">Este control solo modifica la ilustración. No establece un espesor mínimo universal ni determina la viabilidad de fabricación.</p></section>}
     <section className="rounded-xl border border-white/10 bg-[#222B36] p-4"><div className="flex items-center gap-2"><AlertTriangle className="size-4 text-[#D8B979]"/><h3 className="text-sm font-semibold">Hallazgo del escenario</h3></div><p className="mt-2 text-xs leading-5 text-slate-300">{actual.hallazgo}</p><p className="mt-3 text-[10px] leading-5 text-slate-400">En Rhino, utiliza herramientas de análisis y comprueba el objeto real. No repares automáticamente sin identificar la causa.</p></section>
     <section className="rounded-xl border border-white/10 bg-[#222B36] p-4"><div className="flex items-center gap-2"><ClipboardCheck className="size-4 text-[#D8B979]"/><h3 className="text-sm font-semibold">Lista de inspección</h3></div><div className="mt-3 space-y-3">{checks.map(c=><label key={c.id} className="flex cursor-pointer items-start gap-2.5 text-xs leading-5 text-slate-300"><input type="checkbox" checked={seleccion.includes(c.id)} onChange={()=>toggle(c.id)} className="mt-0.5 accent-[#C6A15B]"/><span>{c.label}</span></label>)}</div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gradient-to-r from-amber-300 to-[#B99552] transition-all" style={{width:`${seleccion.length/checks.length*100}%`}}/></div><p className="mt-2 text-[10px] text-slate-400">{seleccion.length} de {checks.length} verificaciones marcadas</p></section>
     <section className="rounded-xl border border-[#C6A15B]/25 bg-[#C6A15B]/5 p-4"><h3 className="text-sm font-semibold">Registro de revisión</h3><textarea value={nota} onChange={e=>setNota(e.target.value)} rows={3} placeholder="Anota defectos encontrados y correcciones realizadas…" className="mt-3 w-full rounded-lg border border-white/10 bg-[#101820] px-3 py-2 text-xs text-white placeholder:text-slate-500"/><button type="button" disabled={!completo} onClick={()=>setResultado(true)} className="mt-3 w-full rounded-lg bg-[#C6A15B] px-3 py-2.5 text-xs font-bold text-[#17130B] disabled:cursor-not-allowed disabled:opacity-40">Finalizar checklist</button>{resultado&&<p className="mt-2 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 className="size-4"/> Checklist revisado en esta ventana. Guarda tus observaciones en tu archivo de práctica.</p>}</section>
     <p className="text-[10px] leading-5 text-slate-500">La lista es una guía de estudio local: no se envía al expediente del alumno ni sustituye la validación de un técnico o fabricante.</p>
    </aside>
   </div>
  </div>}
 </>;
}
