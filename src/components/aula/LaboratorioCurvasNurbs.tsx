import { useEffect, useMemo, useState, type PointerEvent } from "react";
import { Activity, ArrowLeft, ArrowRight, CheckCircle2, CircleHelp, Eye, EyeOff, Gauge, Layers3, Move, RotateCcw, Ruler, ScanLine, Sparkles, Target, WandSparkles } from "lucide-react";

type Point = { x: number; y: number };
type Props = { initialModule?: number; activeModule?: number; embedded?: boolean; onModuleChange?: (module: number) => void; onClose: () => void };

const ORIGINAL: Point[] = [
  { x: 58, y: 250 }, { x: 112, y: 94 }, { x: 190, y: 72 },
  { x: 272, y: 190 }, { x: 350, y: 240 }, { x: 432, y: 104 }, { x: 480, y: 248 },
];
const MODULES = [
  { title: "Curve vs InterpCrv", short: "Construcción", icon: Activity, goal: "Distingue una curva gobernada por controles de otra que interpola posiciones definidas." },
  { title: "Puntos de control", short: "Edición", icon: Move, goal: "Modifica la silueta moviendo controles y observa cómo se distribuye su influencia." },
  { title: "Rebuild Studio", short: "Grado y puntos", icon: ScanLine, goal: "Reconstruye la curva cambiando grado y número de controles sin perder de vista la desviación." },
  { title: "Continuidad", short: "G0 · G1 · G2", icon: Activity, goal: "Interpreta posición, tangencia y curvatura en una transición de perfil." },
  { title: "Curve Cleanup", short: "Diagnóstico", icon: Layers3, goal: "Identifica perfiles abiertos, cruces y puntos innecesarios antes de construir superficies." },
  { title: "Reto de joyería", short: "Integración", icon: Sparkles, goal: "Aplica las decisiones anteriores al diseño de un perfil orgánico para un colgante." },
];

function knots(count: number, degree: number) {
  const n = count - 1, m = n + degree + 1;
  return Array.from({ length: m + 1 }, (_, i) => i <= degree ? 0 : i >= m - degree ? 1 : (i - degree) / (m - 2 * degree));
}
function basis(i: number, p: number, u: number, k: number[]): number {
  if (p === 0) return (k[i]! <= u && u < k[i + 1]!) || (u === 1 && k[i + 1] === 1 && k[i]! < 1) ? 1 : 0;
  const leftDen = k[i + p]! - k[i]!;
  const rightDen = k[i + p + 1]! - k[i + 1]!;
  const left = leftDen ? ((u - k[i]!) / leftDen) * basis(i, p - 1, u, k) : 0;
  const right = rightDen ? ((k[i + p + 1]! - u) / rightDen) * basis(i + 1, p - 1, u, k) : 0;
  return left + right;
}
function nurbs(points: Point[], degree: number, weights: number[] = []) {
  if (points.length < 2) return points;
  const p = Math.max(1, Math.min(degree, points.length - 1));
  const k = knots(points.length, p);
  return Array.from({ length: 181 }, (_, step) => {
    const u = step / 180;
    let x = 0, y = 0, den = 0;
    points.forEach((pt, i) => {
      const w = weights[i] ?? 1, b = basis(i, p, u, k) * w;
      x += pt.x * b; y += pt.y * b; den += b;
    });
    return { x: den ? x / den : points[0]!.x, y: den ? y / den : points[0]!.y };
  });
}
function interp(points: Point[]) {
  if (points.length < 2) return points;
  const out: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[Math.max(0, i - 1)]!, b = points[i]!, c = points[i + 1]!, d = points[Math.min(points.length - 1, i + 2)]!;
    for (let j = 0; j < 30; j++) {
      const t = j / 30, t2 = t * t, t3 = t2 * t;
      out.push({ x: .5 * ((2*b.x)+(-a.x+c.x)*t+(2*a.x-5*b.x+4*c.x-d.x)*t2+(-a.x+3*b.x-3*c.x+d.x)*t3), y: .5 * ((2*b.y)+(-a.y+c.y)*t+(2*a.y-5*b.y+4*c.y-d.y)*t2+(-a.y+3*b.y-3*c.y+d.y)*t3) });
    }
  }
  out.push(points[points.length - 1]!);
  return out;
}
function pathOf(points: Point[]) { return points.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" "); }
function distance(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.y - b.y); }

export default function LaboratorioCurvasNurbs({ initialModule = 0, activeModule, embedded = false, onModuleChange, onClose }: Props) {
  const [started, setStarted] = useState(false);
  const [infoTab, setInfoTab] = useState<"guide" | "practice" | "objective">("guide");
  const [module, setModule] = useState(Math.max(0, Math.min(5, activeModule ?? initialModule)));
  useEffect(() => {
    if (activeModule !== undefined) setModule(Math.max(0, Math.min(5, activeModule)));
  }, [activeModule]);
  const goToModule = (nextModule: number) => {
    const normalized = Math.max(0, Math.min(5, nextModule));
    setModule(normalized);
    onModuleChange?.(normalized);
  };
  const [points, setPoints] = useState<Point[]>(ORIGINAL);
  const [active, setActive] = useState<number | null>(null);
  const [degree, setDegree] = useState(3);
  const [rebuildCount, setRebuildCount] = useState(5);
  const [curveMode, setCurveMode] = useState<"nurbs" | "interp">("nurbs");
  const [showPolygon, setShowPolygon] = useState(true);
  const [showOriginal, setShowOriginal] = useState(true);
  const [weights, setWeights] = useState<number[]>(Array(7).fill(1));
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState<number[]>([]);
  const [evidence, setEvidence] = useState<boolean[]>(Array(6).fill(false));
  const [validationMessage, setValidationMessage] = useState("");
  const [rationalAdjusted, setRationalAdjusted] = useState(false);
  const [cleanupMode, setCleanupMode] = useState<"clean" | "open" | "cross">("open");
  const [continuityMode, setContinuityMode] = useState<"G0" | "G1" | "G2">("G0");
  const currentDegree = Math.min(degree, points.length - 1);
  const nurbsPoints = useMemo(() => nurbs(points, currentDegree, weights), [points, currentDegree, weights]);
  const renderedPoints = useMemo(() => curveMode === "nurbs" ? nurbsPoints : interp(points), [curveMode, nurbsPoints, points]);
  const originalPath = useMemo(() => pathOf(nurbs(ORIGINAL, 3)), []);
  const curvePath = useMemo(() => pathOf(renderedPoints), [renderedPoints]);
  const movePoint = (event: PointerEvent<SVGSVGElement>) => {
    if (active === null) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = Math.min(rect.width / 520, rect.height / 340);
    const offsetX = (rect.width - 520 * scale) / 2;
    const offsetY = (rect.height - 340 * scale) / 2;
    const x = Math.max(25, Math.min(495, (event.clientX - rect.left - offsetX) / scale));
    const y = Math.max(25, Math.min(315, (event.clientY - rect.top - offsetY) / scale));
    setPoints(prev => prev.map((pt, i) => i === active ? { x, y } : pt));
    setEvidence(prev => prev.map((v, i) => i === 1 ? true : v));
  };
  const reset = () => { setPoints(ORIGINAL); setDegree(3); setRebuildCount(5); setCurveMode("nurbs"); setWeights(Array(7).fill(1)); setAnswer(""); setChecked(false); setShowOriginal(true); setEvidence(Array(6).fill(false)); setValidationMessage(""); setRationalAdjusted(false); };
  const markDone = () => setDone(prev => prev.includes(module) ? prev : [...prev, module]);
  const next = () => { markDone(); goToModule(module + 1); setAnswer(""); setChecked(false); };
  const curveLength = renderedPoints.slice(1).reduce((sum, p, i) => sum + distance(p, renderedPoints[i]!), 0);
  const maxDeviation = Math.max(...renderedPoints.map((p, i) => distance(p, nurbsPoints[Math.min(nurbsPoints.length - 1, Math.round(i * (nurbsPoints.length - 1) / Math.max(1, renderedPoints.length - 1)))]!)));
  const controlPoints = points;
  const cleanupPoints: Point[] = cleanupMode === "cross"
    ? [{ x: 72, y: 80 }, { x: 448, y: 280 }, { x: 72, y: 280 }, { x: 448, y: 80 }]
    : cleanupMode === "open"
      ? [{ x: 58, y: 250 }, { x: 112, y: 94 }, { x: 190, y: 72 }, { x: 272, y: 190 }, { x: 350, y: 240 }, { x: 432, y: 104 }, { x: 480, y: 248 }]
      : cleanupMode === "clean"
        ? [{ x: 250, y: 58 }, { x: 390, y: 132 }, { x: 350, y: 260 }, { x: 150, y: 260 }, { x: 110, y: 132 }, { x: 250, y: 58 }]
        : ORIGINAL;
  const cleanupPath = pathOf(cleanupMode === "cross" ? cleanupPoints : nurbs(cleanupPoints, 3)) + (cleanupMode === "clean" ? " Z" : "");
  const rebuildCurve = () => {
    const source = nurbsPoints;
    const nextPoints = Array.from({ length: rebuildCount }, (_, i) => source[Math.round(i * (source.length - 1) / (rebuildCount - 1))]!);
    setPoints(nextPoints);
    setWeights(Array(rebuildCount).fill(1));
    setDegree(Math.min(degree, rebuildCount - 1));
    setEvidence(prev => prev.map((v, i) => i === 2 ? true : v));
    setValidationMessage("Reconstrucción aplicada: se generó una nueva distribución de puntos sobre la curva evaluada.");
  };
  const canComplete = (index: number) => index === 5 ? evidence[5] && answer !== "" && rationalAdjusted : evidence[index];
  const completeModule = () => {
    if (!canComplete(module)) {
      setChecked(true);
      setValidationMessage(module === 0 ? "Cambia entre Curve e InterpCrv para comparar ambos métodos."
        : module === 1 ? "Arrastra al menos un punto de control para demostrar la edición."
        : module === 2 ? "Ajusta los parámetros y ejecuta Rebuild."
        : module === 3 ? "Selecciona G0, G1 o G2 en el comparador para analizar la unión."
        : module === 4 ? "Selecciona el escenario de perfil ordenado y revisa el diagnóstico."
        : "Selecciona una decisión de diseño y modifica el peso racional del tercer punto.");
      return;
    }
    setDone(prev => prev.includes(module) ? prev : [...prev, module]);
    setChecked(true);
    setValidationMessage("Práctica completada en esta sesión.");
  };
  if (!started && !embedded) return <section className="mt-7 overflow-hidden rounded-2xl border border-[#b79558]/40 bg-gradient-to-br from-[#211b11] via-[#151b22] to-[#10151b] p-5 text-white sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-5"><div className="max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-amber-300">AURUM LAB · Sesión 05 · Laboratorio profesional</p><h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">NURBS STUDIO</h3><p className="mt-2 text-sm leading-6 text-slate-300">Una mesa de trabajo interactiva para construir, editar, reconstruir y diagnosticar perfiles de joyería. Seis módulos, geometría manipulable y retos guiados.</p><div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-300"><span className="rounded-full border border-white/15 px-3 py-1.5">6 módulos prácticos</span><span className="rounded-full border border-white/15 px-3 py-1.5">Curvas NURBS racionales</span><span className="rounded-full border border-white/15 px-3 py-1.5">Rhino 7 aplicado</span></div></div><button type="button" onClick={() => setStarted(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#f3d28b] to-[#bd9143] px-5 py-3 text-sm font-bold text-[#21180a] shadow-lg shadow-black/30 hover:brightness-105"><WandSparkles className="size-4"/> Abrir NURBS Studio <ArrowRight className="size-4"/></button></div>
  </section>;
  return <div className={embedded ? "relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#090d12] text-slate-100" : "fixed inset-0 z-[120] flex h-[100dvh] flex-col overflow-hidden bg-[#090d12] text-slate-100"}>
    <header className={`${embedded ? "relative" : "sticky top-0 z-30"} border-b border-white/10 bg-[#0e141b]/95 px-3 py-3 backdrop-blur-xl sm:px-5`}>
      <div className="mx-auto flex max-w-[1700px] flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-300">AURUM LAB / NURBS STUDIO</p><h2 className="text-lg font-semibold sm:text-xl">Curvas NURBS avanzadas</h2><p className="text-xs text-slate-400">Sesión 05 · {MODULES[module]!.title}</p></div><div className="flex items-center gap-2"><span className="hidden rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 sm:inline-flex">{done.length}/6 módulos completados</span><button onClick={reset} className="rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/5"><RotateCcw className="mr-1 inline size-3.5"/> Reiniciar</button><button onClick={onClose} className="rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/5">{embedded ? "Ocultar laboratorio" : "Cerrar laboratorio"}</button></div></div>
      <div className="mx-auto mt-3 h-1 max-w-[1700px] overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-600 transition-all" style={{ width: `${done.length / 6 * 100}%` }}/></div>
    </header>
    <main className={`${embedded ? "mx-auto max-w-[1700px] space-y-4 p-3 sm:p-5" : "min-h-0 flex-1 overflow-y-auto overscroll-contain"} `}><div className="mx-auto max-w-[1800px] space-y-4 p-3 sm:p-5 lg:p-6">
      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">{MODULES.map((item, i) => { const Icon = item.icon; return <button key={item.title} onClick={() => { goToModule(i); setAnswer(""); setChecked(false); setValidationMessage(""); }} className={`flex min-h-[76px] items-center gap-3 rounded-xl border p-3 text-left transition ${module === i ? "border-amber-300/80 bg-gradient-to-br from-[#4a3718] to-[#20242a] shadow-lg shadow-amber-950/20" : "border-white/10 bg-[#131a22] hover:border-white/25"}`}><span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${module === i ? "bg-amber-300 text-[#201607]" : "bg-white/5 text-slate-300"}`}>{done.includes(i) ? <CheckCircle2 className="size-5"/> : <Icon className="size-5"/>}</span><span><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">0{i + 1} · {item.short}</span><span className="mt-1 block text-xs font-semibold leading-4 text-white">{item.title}</span></span></button>; })}</nav>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,.8fr)]">
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#121922] shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Viewport · plano XY · unidades visuales</p><h3 className="text-sm font-semibold">{MODULES[module]!.title}</h3></div><div className="flex flex-wrap gap-2"><button onClick={() => { setCurveMode("nurbs"); if (module === 0) setEvidence(prev => prev.map((v, i) => i === 0 ? true : v)); }} className={`rounded-lg px-3 py-2 text-xs font-semibold ${curveMode === "nurbs" ? "bg-amber-300 text-black" : "border border-white/15 text-slate-300"}`}>Curve · NURBS</button><button onClick={() => { setCurveMode("interp"); if (module === 0) setEvidence(prev => prev.map((v, i) => i === 0 ? true : v)); }} className={`rounded-lg px-3 py-2 text-xs font-semibold ${curveMode === "interp" ? "bg-amber-300 text-black" : "border border-white/15 text-slate-300"}`}>InterpCrv · guía</button></div></div>
          <div className="p-2 sm:p-4"><svg viewBox="0 0 520 340" className="h-[clamp(340px,55vh,680px)] w-full touch-none rounded-xl bg-[#0c1219] 2xl:h-[clamp(440px,62vh,760px)]" onPointerMove={movePoint} onPointerUp={() => setActive(null)} onPointerCancel={() => setActive(null)} role="img" aria-label="Editor interactivo de curvas NURBS">
            {Array.from({ length: 14 }, (_, i) => <g key={i}><line x1={20 + i * 38} y1="8" x2={20 + i * 38} y2="332" stroke="#263341" strokeWidth=".8"/><line x1="10" y1={12 + i * 24} x2="510" y2={12 + i * 24} stroke="#263341" strokeWidth=".8"/></g>)}
            <line x1="260" y1="8" x2="260" y2="332" stroke="#536273" strokeWidth="1"/><line x1="10" y1="170" x2="510" y2="170" stroke="#536273" strokeWidth="1"/>
            {module === 3 ? <g>
              <path d="M 58 250 C 140 220 210 160 260 170" fill="none" stroke="#f2bd58" strokeWidth="5" strokeLinecap="round"/>
              <path d={continuityMode === "G0" ? "M 260 170 C 310 80 365 100 470 250" : continuityMode === "G1" ? "M 260 170 C 310 180 365 100 470 250" : "M 260 170 C 310 180 340 260 470 260"} fill="none" stroke="#55c6d8" strokeWidth="5" strokeLinecap="round"/>
              <path d="M 58 250 C 140 220 210 160 260 170" fill="none" stroke="#f2bd58" strokeWidth="1.5" strokeDasharray="5 6" opacity=".35"/>
              <circle cx="260" cy="170" r="9" fill="#f2bd58" fillOpacity=".18" stroke="#f2bd58" strokeWidth="2"/>
              <circle cx="260" cy="170" r="3.5" fill="#fff1c2"/>
              <text x="260" y="148" textAnchor="middle" fill="#fff1c2" fontSize="12" fontWeight="700">UNIÓN</text>
              <path d="M 210 160 L 260 170" stroke="#f2bd58" strokeWidth="1.5" strokeDasharray="4 4"/>
              <path d={continuityMode === "G0" ? "M 260 170 L 310 80" : "M 260 170 L 310 180"} stroke="#a78bfa" strokeWidth="2" strokeDasharray="5 4"/>
              <text x="72" y="292" fill="#f2bd58" fontSize="11" fontWeight="600">CURVA A</text>
              <text x="390" y="292" fill="#55c6d8" fontSize="11" fontWeight="600">CURVA B</text>
              <text x="260" y="320" textAnchor="middle" fill="#94a3b8" fontSize="10">{continuityMode === "G0" ? "Coinciden los extremos · cambia la dirección" : continuityMode === "G1" ? "Misma dirección tangente · cambia la curvatura" : "Tangencia y curvatura enlazadas"}</text>
            </g> : <>
              {showOriginal && <path d={originalPath} fill="none" stroke="#778493" strokeWidth="2" strokeDasharray="6 7" opacity=".6"/>}
              {showPolygon && module !== 4 && <polyline points={controlPoints.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#55c6d8" strokeWidth="1.5" strokeDasharray="5 5"/>}
              <path d={module === 4 ? cleanupPath : curvePath} fill="none" stroke={module === 4 && cleanupMode === "cross" ? "#fb7185" : "#f2bd58"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              {points.map((p, i) => <g key={i} onPointerDown={e => { e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId); setActive(i); }} className="cursor-grab active:cursor-grabbing"><circle cx={p.x} cy={p.y} r="12" fill="#f2bd58" opacity=".13"/><circle cx={p.x} cy={p.y} r="5.5" fill="#f2bd58" stroke="#201607" strokeWidth="2"/><text x={p.x + 9} y={p.y - 9} fill="#e5edf4" fontSize="10">P{i + 1}</text></g>)}
            </>}
          </svg></div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-[11px] text-slate-400">{module === 3 ? <div className="flex flex-wrap gap-4"><span><i className="mr-1 inline-block size-2 rounded-full bg-amber-300"/> Curva A</span><span><i className="mr-1 inline-block size-2 rounded-full bg-cyan-300"/> Curva B</span><span><i className="mr-1 inline-block size-2 rounded-full bg-violet-300"/> Dirección tangente</span></div> : <><div className="flex flex-wrap gap-4"><span><i className="mr-1 inline-block size-2 rounded-full bg-amber-300"/> Curva activa</span><span><i className="mr-1 inline-block size-2 rounded-full bg-cyan-300"/> Polígono de control</span><span><i className="mr-1 inline-block size-2 rounded-full bg-slate-500"/> Original</span></div><div className="flex gap-2"><button onClick={() => setShowPolygon(v => !v)} className="rounded-md border border-white/15 px-2.5 py-1.5">{showPolygon ? <EyeOff className="mr-1 inline size-3"/> : <Eye className="mr-1 inline size-3"/>} Polígono</button><button onClick={() => setShowOriginal(v => !v)} className="rounded-md border border-white/15 px-2.5 py-1.5">Original</button></div></>}</div>
        </section>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-[#121922] p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-amber-300">Panel de parámetros</p><Gauge className="size-4 text-amber-300"/></div>
            {(module === 2 || module === 0 || module === 1) && <><label className="mt-4 flex items-center justify-between text-xs font-medium">Grado NURBS <strong className="text-amber-300">{currentDegree}</strong></label><input type="range" min="1" max={Math.max(1, points.length - 1)} value={currentDegree} onChange={e => setDegree(Number(e.target.value))} className="mt-2 w-full accent-amber-300"/><div className="flex justify-between text-[10px] text-slate-500"><span>1 · Poligonal</span><span>{points.length - 1} · Máximo</span></div>
              <label className="mt-4 flex items-center justify-between text-xs font-medium">Puntos nuevos <strong className="text-amber-300">{rebuildCount}</strong></label><input type="range" min="4" max="9" value={rebuildCount} onChange={e => setRebuildCount(Number(e.target.value))} className="mt-2 w-full accent-amber-300"/><button onClick={rebuildCurve} className="mt-3 w-full rounded-lg bg-amber-300 px-3 py-2.5 text-xs font-bold text-black hover:bg-amber-200">Aplicar Rebuild</button><p className="mt-1 text-[10px] text-slate-500">Muestrea la curva actual y crea una nueva distribución de controles.</p></>}
            {module === 2 && <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs font-semibold">Comparación de reconstrucción</p><p className="mt-1 text-xs leading-5 text-slate-400">Prueba grados 1, 2 y 3. Observa cómo cambia la flexibilidad. En Rhino, Rebuild crea una nueva estructura de control; aquí se visualiza el efecto del grado sobre la misma geometría de referencia.</p></div>}
            {module === 3 && <div className="mt-4 space-y-3">
               <div className="rounded-xl border border-violet-400/20 bg-violet-400/5 p-3"><p className="text-xs font-semibold text-violet-200">Comparador de continuidad · dos curvas</p><p className="mt-1 text-xs leading-5 text-slate-400">Selecciona un nivel y observa la unión en el viewport. La curva A permanece fija; la curva B cambia para mostrar qué condición se conserva.</p></div>
               <div className="grid grid-cols-3 gap-2">{([{id:"G0",label:"G0",sub:"Posición"},{id:"G1",label:"G1",sub:"Tangencia"},{id:"G2",label:"G2",sub:"Curvatura"}] as const).map(item=><button key={item.id} type="button" onClick={()=>{setContinuityMode(item.id);setEvidence(prev=>prev.map((v,i)=>i===3?true:v));setValidationMessage("");}} aria-pressed={continuityMode===item.id} className={`rounded-lg border p-2 text-left transition ${continuityMode===item.id?"border-amber-300 bg-amber-300/10 text-amber-100":"border-white/10 text-slate-300 hover:border-white/25"}`}><span className="block text-sm font-bold">{item.label}</span><span className="mt-1 block text-[10px]">{item.sub}</span></button>)}</div>
               <div className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-xs font-semibold text-slate-100">{continuityMode==="G0"?"G0 · Coincidencia de posición":continuityMode==="G1"?"G1 · Continuidad de tangencia":"G2 · Continuidad de curvatura"}</p><p className="mt-1 text-[11px] leading-5 text-slate-400">{continuityMode==="G0"?"Las curvas comparten el mismo punto final, pero sus direcciones pueden formar un quiebre visible.":continuityMode==="G1"?"Las tangentes tienen la misma dirección en la unión; desaparece el quiebre, aunque la curvatura todavía puede variar.":"Se conserva la tangencia y también la curvatura en la unión, logrando una transición visual más fluida."}</p></div>
             </div>}
            {module === 4 && <div className="mt-4 space-y-2"><p className="text-xs font-semibold">Condición del perfil</p>{[{v:"open",t:"Extremos abiertos"},{v:"cross",t:"Autointersección visual"},{v:"clean",t:"Perfil ordenado"}].map(x => <button key={x.v} onClick={() => { setCleanupMode(x.v as typeof cleanupMode); if (x.v === "clean") setEvidence(prev => prev.map((v, i) => i === 4 ? true : v)); }} className={`w-full rounded-lg border p-2.5 text-left text-xs ${cleanupMode === x.v ? "border-amber-300 bg-amber-300/10 text-amber-100" : "border-white/10 text-slate-300"}`}>{x.t}</button>)}<p className="text-[10px] leading-4 text-slate-400">{cleanupMode === "cross" ? "ALERTA: perfil con cruce visible. No debe usarse para generar un contorno cerrado." : cleanupMode === "open" ? "ATENCIÓN: extremos abiertos. Comprueba si el diseño requiere un contorno cerrado." : "PERFIL ORDENADO: escenario de referencia seleccionado. Aún debes validar tolerancias y continuidad en Rhino."}</p></div>}
            {module === 5 && <div className="mt-4 space-y-2"><label className="flex items-center justify-between text-xs">Peso del punto activo <strong>{(weights[2] ?? 1).toFixed(1)}</strong></label><input type="range" min=".5" max="2.5" step=".1" value={weights[2] ?? 1} onChange={e => { setWeights(prev => prev.map((w, i) => i === 2 ? Number(e.target.value) : w)); setRationalAdjusted(true); setEvidence(prev => prev.map((v, i) => i === 5 ? true : v)); }} className="w-full accent-amber-300"/><p className="text-[10px] leading-5 text-slate-400">Los pesos modifican la influencia racional de los puntos de control sin moverlos.</p></div>}
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-4"><div className="rounded-lg bg-black/20 p-3"><p className="text-[10px] text-slate-500">Longitud aprox.</p><p className="mt-1 text-sm font-semibold tabular-nums">{curveLength.toFixed(1)} u</p></div><div className="rounded-lg bg-black/20 p-3"><p className="text-[10px] text-slate-500">Diferencia visual</p><p className="mt-1 text-sm font-semibold tabular-nums">{maxDeviation.toFixed(1)} u</p></div></div>
          </section>
          <section className="rounded-2xl border border-white/10 bg-[#121922] p-4"><div className="flex items-center gap-2"><CircleHelp className="size-4 text-amber-300"/><h4 className="text-sm font-semibold">Objetivo del módulo</h4></div><p className="mt-2 text-xs leading-5 text-slate-300">{MODULES[module]!.goal}</p><div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Aplicación en joyería</p><p className="mt-1 text-xs leading-5 text-slate-300">Un perfil controlado mejora la calidad visual de un aro, bisel o contorno ornamental y reduce problemas al generar superficies posteriores.</p></div></section>
        </aside>
      </div>
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#121922] shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-amber-300">Centro de aprendizaje</p><h3 className="mt-1 text-sm font-semibold">Explora, comprende y aplica</h3></div>
          <div className="flex flex-wrap gap-1 rounded-xl bg-black/25 p-1">
            {([{id:"guide",label:"Guía técnica"},{id:"practice",label:"Práctica guiada"},{id:"objective",label:"Objetivo y aplicación"}] as const).map(tab=><button key={tab.id} type="button" onClick={()=>setInfoTab(tab.id)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${infoTab===tab.id?"bg-amber-300 text-[#21180a]":"text-slate-300 hover:bg-white/5"}`}>{tab.label}</button>)}
          </div>
        </div>
        <div className="p-4 sm:p-5">
          {infoTab === "guide" && <div className="max-w-5xl">
            <div className="flex items-center gap-2"><Ruler className="size-4 text-amber-300"/><h4 className="text-sm font-semibold">{module === 3 ? "Lectura de continuidad y curvatura" : module === 4 ? "Lista de diagnóstico geométrico" : "Guía técnica · Rhino 7"}</h4></div>
            {module === 3 ? <div className="mt-4 grid gap-3 md:grid-cols-3">{[{t:"G0 · Posición",d:"Los extremos coinciden. No implica suavidad."},{t:"G1 · Tangencia",d:"Además de coincidir, comparten dirección tangente."},{t:"G2 · Curvatura",d:"La transición mantiene continuidad de curvatura."}].map(x=><article key={x.t} className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-sm font-semibold text-amber-200">{x.t}</p><p className="mt-2 text-sm leading-6 text-slate-400">{x.d}</p></article>)}</div> : module === 4 ? <div className="mt-4 grid gap-2 md:grid-cols-2">{[
              {label:"Cierre del contorno",value:cleanupMode==="clean"?"Cerrado en el escenario":"Abierto · requiere cierre si se necesita un perfil cerrado",ok:cleanupMode==="clean"},
              {label:"Autointersecciones",value:cleanupMode==="cross"?"Cruce detectado visualmente":"Sin cruce visible en este escenario",ok:cleanupMode!=="cross"},
              {label:"Duplicados y segmentos cortos",value:"Pendiente de validar con SelDup en Rhino",ok:false},
              {label:"Tolerancia y continuidad",value:"Pendiente de validar con herramientas de análisis de Rhino",ok:false}
            ].map(item=><div key={item.label} className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/15 p-3 text-sm"><CheckCircle2 className={`mt-0.5 size-4 shrink-0 ${item.ok?"text-emerald-400":"text-amber-300"}`}/><span><strong className="block text-slate-200">{item.label}</strong><span className="mt-1 block leading-5 text-slate-400">{item.value}</span></span></div>)}</div> : <div className="mt-4 flex flex-wrap gap-2 font-mono text-sm text-amber-200">{(module===0?["Curve","InterpCrv"]:module===1?["PointsOn · F10","PointsOff · F11","Move"]:module===2?["Rebuild","Degree","Point count"]:["Curve","Rebuild","CurvatureGraph"]).map(x=><span key={x} className="rounded-lg border border-amber-300/20 bg-amber-300/5 px-3 py-2.5">{x}</span>)}</div>}
          </div>}
          {infoTab === "practice" && <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,.65fr)]">
            <div className="max-w-4xl">
              <div className="flex items-center gap-2"><Target className="size-4 text-amber-300"/><h4 className="text-sm font-semibold">Práctica guiada · {MODULES[module]!.title}</h4></div>
              {module===0 && <><p className="mt-3 text-sm leading-6 text-slate-300">Alterna Curve e InterpCrv. En el primer caso, los puntos gobiernan la forma; en el segundo, la curva interpolada atraviesa las posiciones marcadas. Esta vista usa una interpolación Catmull–Rom como aproximación visual, no replica el algoritmo interno de Rhino.</p><button onClick={()=>{setCurveMode(v=>v==="nurbs"?"interp":"nurbs");setEvidence(prev=>prev.map((v,i)=>i===0?true:v));}} className="mt-4 rounded-lg bg-amber-300 px-5 py-3 text-sm font-bold text-black">Alternar tipo de curva</button></>}
              {module===1 && <p className="mt-3 text-sm leading-6 text-slate-300">Arrastra los nodos dorados directamente en el viewport. Observa el polígono cian y cómo el cambio de un control afecta a la curva completa.</p>}
              {module===2 && <p className="mt-3 text-sm leading-6 text-slate-300">Cambia el grado y compara el resultado. En un flujo real de Rhino, duplica la curva y aplica Rebuild para evaluar desviaciones antes de sustituir el original.</p>}
              {module===3 && <p className="mt-3 text-sm leading-6 text-slate-300">Compara G0, G1 y G2 con dos curvas enlazadas. Observa el punto de unión, la dirección de salida y la suavidad del cambio. Después explica qué nivel de continuidad elegirías para el perfil visible de un aro o una montura.</p>}
              {module===4 && <p className="mt-3 text-sm leading-6 text-slate-300">Escoge un escenario en el inspector y ejecuta la lista de comprobación. En Rhino valida con SelOpenCrv, SelDup, ShowEnds y las herramientas de análisis pertinentes.</p>}
              {module===5 && <p className="mt-3 text-sm leading-6 text-slate-300">Ajusta el peso racional del tercer control y observa cómo atrae la curva. Define una silueta equilibrada, conserva una copia original y explica por qué tu perfil es adecuado para un colgante.</p>}
              {module===5 && <div className="mt-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Decisión de diseño</p>{["Perfil suave y orgánico","Perfil simétrico y técnico","Perfil ornamental asimétrico"].map(x=><button key={x} onClick={()=>{setAnswer(x);setEvidence(prev=>prev.map((v,i)=>i===5?true:v));}} className={`mt-2 w-full rounded-lg border p-3 text-left text-sm ${answer===x?"border-amber-300 bg-amber-300/10 text-amber-100":"border-white/10 text-slate-300"}`}>{x}</button>)}</div>}
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-bold uppercase tracking-wider text-amber-300">Tu avance</p><p className="mt-2 text-sm text-slate-300">{done.includes(module)?"Este módulo ya figura como completado.":"Completa la acción solicitada y valida tu práctica."}</p><button onClick={completeModule} className="mt-4 w-full rounded-lg border border-amber-300/40 px-4 py-3 text-sm font-semibold text-amber-200 hover:bg-amber-300/10">{module===5?"Validar reto final":"Validar práctica"}</button>{checked&&<p className={`mt-3 text-sm ${done.includes(module)?"text-emerald-300":"text-amber-200"}`}><CheckCircle2 className="mr-1 inline size-4"/>{validationMessage}</p>}</div>
          </div>}
          {infoTab === "objective" && <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,.8fr)]">
            <div><div className="flex items-center gap-2"><CircleHelp className="size-4 text-amber-300"/><h4 className="text-sm font-semibold">Objetivo del módulo</h4></div><p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">{MODULES[module]!.goal}</p></div>
            <div className="rounded-xl border border-amber-300/15 bg-amber-300/5 p-4"><p className="text-xs font-bold uppercase tracking-wider text-amber-300">Aplicación en joyería</p><p className="mt-2 text-sm leading-6 text-slate-300">Un perfil controlado mejora la calidad visual de un aro, bisel o contorno ornamental y reduce problemas al generar superficies posteriores.</p></div>
          </div>}
        </div>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#121922] p-4"><button disabled={module === 0} onClick={() => { goToModule(module - 1); setChecked(false); }} className="rounded-lg border border-white/15 px-4 py-2.5 text-xs disabled:opacity-30"><ArrowLeft className="mr-1 inline size-3.5"/> Módulo anterior</button><p className="text-xs text-slate-400">Módulo {module + 1} de 6 · {done.length} completados</p><button disabled={!done.includes(module)} onClick={() => module < 5 ? next() : onClose()} className="rounded-lg bg-gradient-to-b from-[#f3d28b] to-[#bd9143] px-4 py-2.5 text-xs font-bold text-[#21180a] disabled:cursor-not-allowed disabled:opacity-40">{module === 5 ? "Finalizar laboratorio" : "Siguiente módulo"} <ArrowRight className="ml-1 inline size-3.5"/></button></footer>
      </div></main>
  </div>;
}
