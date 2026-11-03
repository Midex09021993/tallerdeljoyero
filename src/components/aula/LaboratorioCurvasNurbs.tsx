import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleHelp, RotateCcw, Target, WandSparkles } from "lucide-react";

type Point = { x: number; y: number };
type Props = { initialModule?: number; onClose: () => void };

const INITIAL: Point[] = [
  { x: 95, y: 260 }, { x: 175, y: 85 }, { x: 300, y: 95 }, { x: 405, y: 260 },
];

function catmullRom(points: Point[]) {
  if (points.length < 2) return "";
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function LaboratorioCurvasNurbs({ initialModule = 0, onClose }: Props) {
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<"control" | "interpolada">("control");
  const [points, setPoints] = useState<Point[]>(INITIAL);
  const [active, setActive] = useState<number | null>(null);
  const [showPolygon, setShowPolygon] = useState(true);
  const [answer, setAnswer] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);
  const [task, setTask] = useState(0);
  const path = useMemo(() => mode === "control"
    ? `M ${points[0]!.x} ${points[0]!.y} C ${points[1]!.x} ${points[1]!.y}, ${points[2]!.x} ${points[2]!.y}, ${points[3]!.x} ${points[3]!.y}`
    : catmullRom(points), [mode, points]);
  const movePoint = (event: React.PointerEvent<SVGSVGElement>) => {
    if (active === null) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(45, Math.min(455, ((event.clientX - rect.left) / rect.width) * 520));
    const y = Math.max(35, Math.min(325, ((event.clientY - rect.top) / rect.height) * 360));
    setPoints(prev => prev.map((p, i) => i === active ? { x, y } : p));
  };
  const reset = () => { setPoints(INITIAL); setMode("control"); setAnswer(null); setChecked(false); setCompleted(false); setShowOriginal(true); setTask(0); };
  const tasks = [
    { title: "Modifica la silueta sin perder el control", detail: "Arrastra el segundo o tercer punto de control y observa cómo cambia la curva. Los puntos de control orientan la forma, pero la curva no tiene que pasar por ellos.", target: "point" },
    { title: "Compara los dos métodos de construcción", detail: "Cambia entre Curva por puntos de control e Interpolación. Observa qué sucede con los puntos marcados.", target: "compare" },
    { title: "Decide qué método conviene", detail: "Responde según el comportamiento geométrico que acabas de observar.", target: "quiz" },
  ];
  const advance = () => { setTask(v => Math.min(2, v + 1)); setAnswer(null); setChecked(false); };
  if (!started) return <section className="mt-7 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-background to-background p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold-deep">AURUM LAB · Sesión 05 · Prototipo 01</p><h4 className="mt-1 text-lg font-semibold">Estudio de curvas · Curve vs InterpCrv</h4><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Construye, manipula y compara perfiles mediante una mesa de trabajo vectorial interactiva.</p><p className="mt-2 text-xs text-muted-foreground">3 desafíos · manipulación directa · comprobación técnica</p></div><button type="button" onClick={() => setStarted(true)} className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-black shadow-sm hover:brightness-105"><WandSparkles className="size-4"/> Iniciar estudio <ArrowRight className="size-4"/></button></div>
  </section>;
  return <div className="fixed inset-0 z-[120] overflow-y-auto bg-[#0d1117] text-slate-100">
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#111820]/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-400">AURUM LAB / GEOMETRY STUDIO</p><h2 className="text-base font-semibold sm:text-lg">Estudio de curvas NURBS</h2><p className="text-xs text-slate-400">Sesión 05 · Desafío {task + 1} de 3</p></div><div className="flex items-center gap-2"><button onClick={reset} className="rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/5"><RotateCcw className="mr-1 inline size-3.5"/> Reiniciar</button><button onClick={onClose} className="rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/5">Volver a lectura</button></div></div>
      <div className="mx-auto mt-3 h-1 max-w-[1600px] overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-400 transition-all" style={{width:`${(task + (completed ? 1 : 0)) / 3 * 100}%`}}/></div>
    </header>
    <main className="mx-auto grid max-w-[1600px] gap-4 p-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(340px,.75fr)] lg:p-5">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#151c24] shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3"><div><p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Viewport · plano XY</p><p className="text-sm font-medium">Perfil orgánico de referencia</p></div><div className="flex gap-2"><button onClick={() => setMode("control")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${mode==="control"?"bg-amber-400 text-black":"border border-white/15 text-slate-300"}`}>Curve</button><button onClick={() => setMode("interpolada")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${mode==="interpolada"?"bg-amber-400 text-black":"border border-white/15 text-slate-300"}`}>InterpCrv</button></div></div>
        <div className="p-2 sm:p-4"><svg viewBox="0 0 520 360" className="h-[min(58vh,620px)] w-full touch-none rounded-xl bg-[#10151b]" onPointerMove={movePoint} onPointerUp={() => setActive(null)} onPointerCancel={() => setActive(null)} role="img" aria-label="Mesa de trabajo interactiva de curvas">
          {Array.from({length:14},(_,i)=><g key={i}><line x1={20+i*38} y1="12" x2={20+i*38} y2="348" stroke="#29333e" strokeWidth=".8"/><line x1="12" y1={15+i*25} x2="508" y2={15+i*25} stroke="#29333e" strokeWidth=".8"/></g>)}
          <line x1="260" y1="12" x2="260" y2="348" stroke="#52606d"/><line x1="12" y1="180" x2="508" y2="180" stroke="#52606d"/>
          {showOriginal && <path d={`M ${INITIAL[0]!.x} ${INITIAL[0]!.y} C ${INITIAL[1]!.x} ${INITIAL[1]!.y}, ${INITIAL[2]!.x} ${INITIAL[2]!.y}, ${INITIAL[3]!.x} ${INITIAL[3]!.y}`} fill="none" stroke="#7b8794" strokeWidth="2" strokeDasharray="7 7" opacity=".65"/>}
          {showPolygon && <polyline points={points.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke="#3dd6a0" strokeWidth="1.6" strokeDasharray="5 5"/>}
          <path d={path} fill="none" stroke="#efbd59" strokeWidth="4" strokeLinecap="round"/>
          {points.map((p,i)=><g key={i} onPointerDown={e=>{e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);setActive(i);}} className="cursor-grab active:cursor-grabbing"><circle cx={p.x} cy={p.y} r="12" fill="#3dd6a0" opacity=".14"/><circle cx={p.x} cy={p.y} r="5.5" fill="#3dd6a0" stroke="#08130f" strokeWidth="2"/><text x={p.x+9} y={p.y-10} fill="#d9e4ec" fontSize="10">P{i+1}</text></g>)}
        </svg></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-[11px] text-slate-400"><div className="flex flex-wrap gap-4"><span><i className="mr-1 inline-block size-2 rounded-full bg-amber-400"/> Curva</span><span><i className="mr-1 inline-block size-2 rounded-full bg-emerald-400"/> Puntos / polígono de control</span><span><i className="mr-1 inline-block size-2 rounded-full bg-slate-500"/> Referencia original</span></div><button onClick={()=>setShowPolygon(v=>!v)} className="rounded-md border border-white/15 px-3 py-1.5 hover:bg-white/5">{showPolygon?"Ocultar":"Mostrar"} polígono</button></div>
      </section>
      <aside className="flex flex-col gap-4">
        <section className="rounded-2xl border border-white/10 bg-[#151c24] p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Desafío {task+1}</p><Target className="size-4 text-amber-400"/></div><h3 className="mt-2 text-lg font-semibold">{tasks[task]!.title}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{tasks[task]!.detail}</p>
          {task===0 && <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs font-semibold text-slate-200">Instrucción de trabajo</p><p className="mt-1 text-xs leading-5 text-slate-400">Arrastra P2 o P3 dentro del viewport. Activa y desactiva el polígono para comprender la relación entre los controles y la curva.</p><button onClick={()=>setCompleted(true)} className="mt-3 w-full rounded-lg bg-amber-400 px-3 py-2.5 text-sm font-semibold text-black">He comprendido la edición</button></div>}
          {task===1 && <div className="mt-4 space-y-3"><div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-300">{mode==="control"?"En Curve, los puntos son controles: la curva responde a su posición y generalmente no pasa por ellos.":"En InterpCrv, la curva pasa por las ubicaciones indicadas. La forma resultante depende de la interpolación y parametrización."}</div><button onClick={()=>setShowOriginal(v=>!v)} className="w-full rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/5">{showOriginal?"Ocultar":"Mostrar"} curva original de referencia</button><button onClick={()=>setCompleted(true)} className="w-full rounded-lg bg-amber-400 px-3 py-2.5 text-sm font-semibold text-black">He comparado ambos métodos</button></div>}
          {task===2 && <div className="mt-4 space-y-3"><p className="text-xs font-semibold text-slate-200">¿Qué afirmación es correcta?</p>{[{v:"a",t:"Curve pasa por todos los puntos marcados; InterpCrv los usa solo como controles."},{v:"b",t:"Curve usa puntos de control; InterpCrv genera una curva que pasa por los puntos indicados."},{v:"c",t:"Ambos comandos generan siempre la misma curva."}].map(o=><button key={o.v} onClick={()=>{setAnswer(o.v);setChecked(false);}} className={`block w-full rounded-xl border p-3 text-left text-xs leading-5 ${answer===o.v?"border-amber-400 bg-amber-400/10":"border-white/10 hover:border-white/30"}`}>{o.t}</button>)}<button disabled={!answer} onClick={()=>setChecked(true)} className="w-full rounded-lg bg-amber-400 px-3 py-2.5 text-sm font-semibold text-black disabled:opacity-40">Comprobar respuesta</button>{checked && <div className={`rounded-lg p-3 text-xs leading-5 ${answer==="b"?"bg-emerald-400/10 text-emerald-200":"bg-rose-400/10 text-rose-200"}`}>{answer==="b"?"Correcto. Has distinguido los puntos de control de los puntos de interpolación.":"Todavía no. Revisa qué relación tiene la curva con los puntos que seleccionas y vuelve a intentarlo."}</div>}</div>}
        </section>
        <section className="rounded-2xl border border-white/10 bg-[#151c24] p-4"><div className="flex items-center gap-2"><CircleHelp className="size-4 text-amber-400"/><h4 className="text-sm font-semibold">Aplicación en joyería</h4></div><p className="mt-2 text-xs leading-5 text-slate-300">Para diseñar un contorno orgánico de colgante, InterpCrv resulta útil cuando necesitas que la curva atraviese puntos de una silueta definida. Curve resulta útil cuando quieres gobernar la forma con una estructura de control editable. La elección depende del diseño y de la edición posterior.</p><div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Comandos Rhino 7</p><p className="mt-1 font-mono text-xs text-amber-300">Curve · InterpCrv · PointsOn · PointsOff</p></div></section>
        <div className="flex gap-2"><button disabled={task===0} onClick={()=>{setTask(v=>v-1);setCompleted(false);setAnswer(null);setChecked(false);}} className="flex-1 rounded-lg border border-white/15 px-3 py-2.5 text-xs disabled:opacity-30"><ArrowLeft className="mr-1 inline size-3.5"/> Anterior</button>{task<2?<button disabled={!completed && task!==2} onClick={advance} className="flex-1 rounded-lg bg-amber-400 px-3 py-2.5 text-xs font-semibold text-black disabled:opacity-35">Siguiente desafío <ArrowRight className="ml-1 inline size-3.5"/></button>:<button disabled={!checked||answer!=="b"} onClick={()=>setCompleted(true)} className="flex-1 rounded-lg bg-amber-400 px-3 py-2.5 text-xs font-semibold text-black disabled:opacity-35">Finalizar prototipo <CheckCircle2 className="ml-1 inline size-3.5"/></button>}</div>
        {task===2&&checked&&answer==="b"&&<div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200"><CheckCircle2 className="mr-2 inline size-4"/> Desafío superado. Has completado el prototipo de creación de curvas.</div>}
      </aside>
    </main>
  </div>;
}
