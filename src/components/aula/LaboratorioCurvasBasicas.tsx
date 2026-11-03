import { useState, type PointerEvent } from "react";
import { CheckCircle2, Circle, CornerDownLeft, Eraser, Grid3X3, Minus, MousePointer2, Pencil, RotateCcw, Square, Undo2, X } from "lucide-react";

type Point = { x: number; y: number };
type Tool = "line" | "polyline" | "circle" | "rectangle";
type Shape = { tool: Tool; points: Point[] };
type Props = { onClose: () => void };

const TOOLS: { id: Tool; name: string; command: string; short: string; goal: string; instruction: string; required: string; color: string }[] = [
  { id: "line", name: "Línea", command: "_Line", short: "LINE", goal: "Construye un segmento recto entre dos puntos.", instruction: "Haz clic en el punto inicial y después en el punto final. La línea se completa con dos puntos.", required: "2 puntos", color: "#C6A15B" },
  { id: "polyline", name: "Polilínea", command: "_Polyline", short: "POLYLINE", goal: "Conecta varios segmentos en una sola curva continua.", instruction: "Marca al menos cuatro vértices para construir tres tramos conectados. Después pulsa «Terminar polilínea».", required: "4 vértices", color: "#C6A15B" },
  { id: "circle", name: "Círculo", command: "_Circle", short: "CIRCLE", goal: "Crea una curva circular indicando centro y radio.", instruction: "Haz clic para fijar el centro y vuelve a hacer clic para definir el radio.", required: "Centro + radio", color: "#C6A15B" },
  { id: "rectangle", name: "Rectángulo", command: "_Rectangle", short: "RECTANGLE", goal: "Define un contorno rectangular mediante dos esquinas opuestas.", instruction: "Marca una primera esquina y después la esquina diagonalmente opuesta.", required: "2 esquinas", color: "#C6A15B" },
];

const GRID = Array.from({ length: 21 }, (_, i) => i * 40);
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const fmt = (n: number) => n.toFixed(0);

export default function LaboratorioCurvasBasicas({ onClose }: Props) {
  const [tool, setTool] = useState<Tool>("line");
  const [draft, setDraft] = useState<Point[]>([]);
  const [polylineFinished, setPolylineFinished] = useState(false);
  const [completed, setCompleted] = useState<Partial<Record<Tool, Shape>>>({});
  const [message, setMessage] = useState("Selecciona una herramienta y comienza a marcar puntos en el plano.");
  const [showGrid, setShowGrid] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [score, setScore] = useState(0);
  const current = TOOLS.find(item => item.id === tool)!;
  const doneCount = Object.keys(completed).length;
  const currentShape = completed[tool];

  const toPoint = (event: PointerEvent<SVGSVGElement>): Point => {
    const svg = event.currentTarget;
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    return { x: clamp(local.x, 20, 780), y: clamp(local.y, 20, 500) };
  };

  const addPoint = (event: PointerEvent<SVGSVGElement>) => {
    if (completed[tool] || (tool === "polyline" && polylineFinished)) return;
    const point = toPoint(event);
    if (tool === "line" || tool === "circle" || tool === "rectangle") {
      const next = [...draft, point].slice(-2);
      setDraft(next);
      if (next.length === 2) {
        setMessage(tool === "line" ? "Segmento creado. Comprueba sus dos extremos y registra el ejercicio." : tool === "circle" ? `Círculo creado · radio visual: ${fmt(distance(next[0]!, next[1]!))} unidades.` : "Rectángulo creado a partir de dos esquinas opuestas.");
      } else {
        setMessage(tool === "line" ? "Punto inicial definido. Ahora marca el punto final." : tool === "circle" ? "Centro definido. Marca un segundo punto para establecer el radio." : "Primera esquina definida. Marca la esquina opuesta.");
      }
      return;
    }
    setDraft(prev => [...prev, point]);
    setMessage(`Vértice ${draft.length + 1} añadido. Marca el siguiente punto o termina la polilínea.`);
  };

  const finishPolyline = () => {
    if (tool !== "polyline" || draft.length < 4) {
      setMessage("La polilínea necesita al menos cuatro vértices para completar tres tramos.");
      return;
    }
    setPolylineFinished(true);
    setMessage("Polilínea terminada. Revisa la continuidad de sus segmentos y registra el ejercicio.");
  };

  const register = () => {
    if (completed[tool]) {
      setMessage("Este ejercicio ya está registrado. Puedes reiniciarlo para practicar de nuevo.");
      return;
    }
    const enough = tool === "line" || tool === "circle" || tool === "rectangle" ? draft.length === 2 : draft.length >= 4 && polylineFinished;
    if (!enough) {
      setMessage(tool === "polyline" ? "Añade al menos cuatro vértices y pulsa «Terminar polilínea» antes de validar." : "Completa los dos puntos requeridos antes de registrar.");
      return;
    }
    if (tool === "polyline" && draft.length < 4) return;
    const snapshot = { tool, points: [...draft] } as Shape;
    setCompleted(prev => ({ ...prev, [tool]: snapshot }));
    setScore(prev => prev + 25);
    setMessage(`¡Correcto! ${current.name} registrada. Has demostrado cómo construir esta geometría.`);
  };

  const resetCurrent = () => {
    setDraft([]);
    setPolylineFinished(false);
    setScore(prev => Math.max(0, prev - (completed[tool] ? 25 : 0)));
    setCompleted(prev => { const next = { ...prev }; delete next[tool]; return next; });
    setMessage("Área de trabajo limpia. Puedes repetir el ejercicio.");
  };
  const resetAll = () => {
    setDraft([]);
    setPolylineFinished(false);
    setCompleted({});
    setScore(0);
    setMessage("Laboratorio reiniciado. Vuelve a construir las cuatro geometrías.");
    setTool("line");
  };
  const selectTool = (next: Tool) => {
    setTool(next);
    setDraft([]);
    setPolylineFinished(false);
    setMessage(`Herramienta ${TOOLS.find(item => item.id === next)!.name} seleccionada. ${TOOLS.find(item => item.id === next)!.instruction}`);
  };

  const drawShape = (shape: Shape, opacity = 1) => {
    const pts = shape.points;
    if (shape.tool === "line" && pts.length === 2) return <line x1={pts[0]!.x} y1={pts[0]!.y} x2={pts[1]!.x} y2={pts[1]!.y} stroke={TOOLS[0].color} strokeWidth="4" strokeLinecap="round" opacity={opacity}/>;
    if (shape.tool === "polyline" && pts.length >= 2) return <polyline points={pts.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke={TOOLS[1].color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity={opacity}/>;
    if (shape.tool === "circle" && pts.length === 2) return <circle cx={pts[0]!.x} cy={pts[0]!.y} r={distance(pts[0]!, pts[1]!)} fill="rgba(139,212,167,.08)" stroke={TOOLS[2].color} strokeWidth="4" opacity={opacity}/>;
    if (shape.tool === "rectangle" && pts.length === 2) return <rect x={Math.min(pts[0]!.x, pts[1]!.x)} y={Math.min(pts[0]!.y, pts[1]!.y)} width={Math.abs(pts[1]!.x-pts[0]!.x)} height={Math.abs(pts[1]!.y-pts[0]!.y)} fill="rgba(183,160,237,.08)" stroke={TOOLS[3].color} strokeWidth="4" opacity={opacity}/>;
    return null;
  };

  const drawDraft = () => {
    if (!draft.length) return null;
    if (tool === "line" && draft.length === 2) return drawShape({ tool, points: draft });
    if (tool === "circle" && draft.length === 2) return drawShape({ tool, points: draft });
    if (tool === "rectangle" && draft.length === 2) return drawShape({ tool, points: draft });
    if (tool === "polyline" && draft.length >= 2) return <polyline points={draft.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke={TOOLS[1].color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={polylineFinished ? undefined : "8 4"}/>;
    return null;
  };

  return <div className="fixed inset-0 z-[125] flex h-[100dvh] flex-col overflow-hidden bg-[#171C24] text-[#E8EDF2]" role="dialog" aria-modal="true" aria-label="Curve Lab · Curvas básicas de Rhino">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#222B36] px-4 py-3 sm:px-6">
      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#D8B979]">FADILAB · SESIÓN 02 · RHINO 7</p><h2 className="text-lg font-semibold tracking-tight sm:text-xl">CURVE LAB <span className="font-normal text-[#AAB7C5]">/ Curvas básicas</span></h2><p className="text-xs text-[#AAB7C5]">Trazado geométrico · Plano XY · Unidades visuales</p></div>
      <div className="flex items-center gap-2"><div className="hidden rounded-xl border border-[#e8dfd0] bg-[#faf8f3] px-3 py-2 sm:block"><p className="text-[9px] font-semibold uppercase tracking-wider text-[#8a7655]">Progreso</p><p className="text-sm font-bold tabular-nums text-[#5e4828]">{doneCount}/4 · {score} pts</p></div><button type="button" onClick={resetAll} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-[#D0D8E0] hover:bg-[#f5f6f7]"><RotateCcw className="size-3.5"/> Reiniciar</button><button type="button" onClick={onClose} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-[#D0D8E0] hover:bg-[#f5f6f7]"><X className="size-4"/></button></div>
    </header>
    <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#1D2630] px-4 py-2 sm:px-6"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e8e3da]"><div className="h-full rounded-full bg-[#C6A15B] transition-all" style={{ width: `${doneCount/4*100}%` }}/></div><span className="text-[10px] font-semibold text-[#D8B979]">{doneCount===4 ? "Práctica completada" : `Ejercicio ${doneCount+1} de 4`}</span></div>
    <nav className="grid shrink-0 grid-cols-4 gap-1.5 border-b border-white/10 bg-[#222B36] px-3 py-2 sm:gap-2 sm:px-6 sm:py-3">{TOOLS.map(item => <button key={item.id} type="button" onClick={() => selectTool(item.id)} aria-pressed={tool===item.id} className={`flex min-w-0 items-center justify-center gap-2 rounded-xl border px-2 py-2.5 text-left transition sm:justify-start sm:px-3 ${tool===item.id ? "border-[#b99552] bg-[#fbf5e8] text-[#6d5122] shadow-sm" : "border-white/10 bg-[#222B36] text-[#AAB7C5] hover:border-[#c8b17e]"}`}>{item.id==="line"?<Minus className="size-4 shrink-0"/>:item.id==="polyline"?<Pencil className="size-4 shrink-0"/>:item.id==="circle"?<Circle className="size-4 shrink-0"/>:<Square className="size-4 shrink-0"/>}<span className="min-w-0"><span className="block text-[9px] font-bold uppercase tracking-wider opacity-70">{item.short}</span><span className="block truncate text-xs font-semibold">{item.name}</span></span>{completed[item.id]&&<CheckCircle2 className="hidden size-4 shrink-0 text-emerald-600 sm:block"/>}</button>)}</nav>
    <main className="grid min-h-0 flex-1 gap-3 overflow-hidden p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#222B36] shadow-sm">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4"><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#8b7857]">Área de construcción · Viewport</p><h3 className="text-sm font-semibold">{current.name} <span className="font-normal text-[#8a929d]">· {current.command}</span></h3></div><div className="flex items-center gap-1.5"><button type="button" onClick={() => setShowGrid(v => !v)} className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold ${showGrid?"border-[#d8c49d] bg-[#fbf7ed] text-[#775b2c]":"border-white/15 text-[#AAB7C5]"}`}><Grid3X3 className="mr-1 inline size-3.5"/>{showGrid?"Cuadrícula":"Sin cuadrícula"}</button><button type="button" onClick={() => setShowCoordinates(v => !v)} className="rounded-lg border border-[#e1e5e9] px-2.5 py-1.5 text-[10px] font-semibold text-[#687585]"><MousePointer2 className="mr-1 inline size-3.5"/>{showCoordinates?"Coordenadas":"Puntos"}</button></div></div>
        <div className="relative min-h-0 flex-1 overflow-hidden bg-[#171C24]">
          <svg viewBox="0 0 800 520" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full touch-none" onPointerDown={addPoint} role="img" aria-label={`Plano interactivo para dibujar ${current.name.toLowerCase()}`}>
            {showGrid&&<g stroke="#354454" strokeWidth="1">{GRID.map(v=><line key={`v${v}`} x1={v} y1="0" x2={v} y2="520"/>)}{Array.from({length:14},(_,i)=><line key={`h${i}`} x1="0" y1={i*40} x2="800" y2={i*40}/>)}</g>}
            <path d="M0 260 H800 M400 0 V520" stroke="#8294A8" strokeWidth="1.2" strokeDasharray="7 6" opacity=".7"/>
            <text x="785" y="250" fill="#AAB7C5" textAnchor="end" fontSize="12">X+</text><text x="412" y="18" fill="#AAB7C5" fontSize="12">Y+</text><text x="14" y="505" fill="#8294A8" fontSize="11">PLANO XY · VISTA SUPERIOR (TOP)</text>
            {Object.values(completed).filter((s): s is Shape => !!s).map((shape,i)=><g key={`done-${i}`}>{drawShape(shape,.48)}</g>)}
            {drawDraft()}
            {draft.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r="7" fill={current.color} stroke="#101820" strokeWidth="2"/>{showCoordinates&&<text x={p.x+10} y={p.y-10} fill="#e9eef4" fontSize="12">{fmt(p.x)}, {fmt(520-p.y)}</text>}</g>)}
            {currentShape&&<g>{drawShape(currentShape,1)}</g>}
          </svg>
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/10 bg-[#101820]/95 px-3 py-2 text-[10px] text-[#D0D8E0] shadow-lg"><span className="font-semibold text-[#D8B979]">Clic izquierdo</span> · colocar puntos <span className="mx-1 text-slate-500">|</span> <span className="text-slate-400">Cuadrícula de referencia</span></div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#fbfaf7] px-3 py-2.5 sm:px-4"><p className="min-w-0 text-[10px] text-[#AAB7C5]">{draft.length} punto(s) colocados · {current.required}</p><div className="flex flex-wrap gap-1.5"><button type="button" onClick={() => { setDraft(prev=>prev.slice(0,-1)); setPolylineFinished(false); }} disabled={!draft.length||!!completed[tool]} className="rounded-lg border border-white/15 bg-[#222B36] px-2.5 py-2 text-[10px] font-semibold text-[#D0D8E0] disabled:opacity-40"><Undo2 className="mr-1 inline size-3.5"/> Deshacer punto</button><button type="button" onClick={resetCurrent} className="rounded-lg border border-white/15 bg-[#222B36] px-2.5 py-2 text-[10px] font-semibold text-[#D0D8E0]"><Eraser className="mr-1 inline size-3.5"/> Limpiar</button>{tool==="polyline"&&<button type="button" onClick={finishPolyline} disabled={draft.length<4} className="rounded-lg border border-[#b9dce2] bg-[#eff9fa] px-2.5 py-2 text-[10px] font-semibold text-[#27616a] disabled:opacity-40"><CornerDownLeft className="mr-1 inline size-3.5"/> Terminar polilínea</button>}</div></div>
      </section>
      <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
        <section className="rounded-2xl border border-white/10 bg-[#222B36] p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-[9px] font-bold uppercase tracking-[.17em] text-[#D8B979]">Ficha de herramienta</p><span className="rounded-md bg-[#303B47] px-2 py-1 text-[9px] font-bold text-[#D0B77E]">{current.short}</span></div><h3 className="mt-2 text-lg font-semibold text-[#E8EDF2]">{current.name}</h3><p className="mt-1 text-xs leading-5 text-[#AAB7C5]">{current.goal}</p><div className="mt-3 rounded-xl border border-white/10 bg-[#1D2630] p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-[#D8B979]">Procedimiento</p><p className="mt-1 text-xs leading-5 text-[#D0D8E0]">{current.instruction}</p></div><div className="mt-3 flex items-center justify-between rounded-lg bg-[#303B47] px-3 py-2"><span className="text-[10px] text-[#AAB7C5]">Entrada Rhino</span><code className="text-xs font-bold text-[#E8EDF2]">{current.command}</code></div></section>
        <section className="rounded-2xl border border-white/10 bg-[#222B36] p-4 shadow-sm"><div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[#C6A15B]"/><h4 className="text-sm font-semibold">Comprobación</h4></div><p className="mt-2 text-xs leading-5 text-[#AAB7C5]">Completa el trazado y registra la práctica. Cada herramienta suma 25 puntos.</p><button type="button" onClick={register} disabled={!!completed[tool]} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#C6A15B] px-3 py-3 text-xs font-bold text-[#171C24] shadow-sm disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 className="size-4"/> {completed[tool]?"Ejercicio registrado":"Validar ejercicio"}</button><div className="mt-3 min-h-[54px] rounded-lg border border-white/10 bg-[#1D2630] p-3 text-[11px] leading-5 text-[#D0D8E0]" aria-live="polite">{message}</div></section>
        <section className="rounded-2xl border border-white/10 bg-[#222B36] p-4 shadow-sm"><h4 className="text-sm font-semibold">Progreso de la sesión</h4><div className="mt-3 space-y-2">{TOOLS.map((item,i)=><div key={item.id} className="flex items-center justify-between gap-2 text-xs"><span className="text-[#D0D8E0]">{String(i+1).padStart(2,"0")} · {item.name}</span>{completed[item.id]?<span className="inline-flex items-center gap-1 font-semibold text-[#65B995]"><CheckCircle2 className="size-3.5"/> Validado</span>:<span className="text-[#8294A8]">Pendiente</span>}</div>)}</div></section>
      </aside>
    </main>
    {doneCount===4&&<div className="fixed bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-xl border border-emerald-200 bg-[#222B36] px-4 py-3 text-center text-xs font-semibold text-[#65B995] shadow-xl">¡Excelente trabajo! Has completado los cuatro ejercicios del Curve Lab.</div>}
  </div>;
}
