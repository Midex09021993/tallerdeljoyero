import { useEffect, useState } from "react";
import { Activity, Gauge, HardDrive, Monitor, X } from "lucide-react";
import { getAurumPerformanceStatus, type AurumPerformanceMonitor, type AurumPerformanceSnapshot } from "@/lib/aurum/performance-monitor";

type Props = {
  open: boolean;
  onClose: () => void;
  renderer: any;
  monitor: AurumPerformanceMonitor;
};

const EMPTY: AurumPerformanceSnapshot = {
  fps: 0, frameMs: 0, renderMs: 0, bvhMs: 0, maxFrameMs: 0,
  path: "—", calls: 0, triangles: 0, geometries: 0, textures: 0,
  drawBuffer: "—", pixelRatio: 1, webgl: "No disponible",
};

const number = (value: number, digits = 1) =>
  Number.isFinite(value) ? value.toFixed(digits) : "—";
const compact = (value: number) =>
  new Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 }).format(value);

function Metric({ label, value, unit = "" }: { label: string; value: string | number; unit?: string }) {
  return <div className="rounded-lg border border-white/[.07] bg-white/[.035] px-3 py-2">
    <div className="text-[9px] font-medium uppercase tracking-[.12em] text-white/40">{label}</div>
    <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-white">{value}<span className="ml-1 text-[10px] font-normal text-white/40">{unit}</span></div>
  </div>;
}

type IndicatorProps = {
  renderer: any;
  monitor: AurumPerformanceMonitor;
  onClick: () => void;
  expanded: boolean;
};

export function AurumPerformanceIndicator({ renderer, monitor, onClick, expanded }: IndicatorProps) {
  const [status, setStatus] = useState<"idle" | "healthy" | "warning" | "critical">("idle");

  useEffect(() => {
    const update = () => setStatus(getAurumPerformanceStatus(monitor.snapshot(renderer)));
    update();
    const id = window.setInterval(update, 600);
    return () => window.clearInterval(id);
  }, [renderer, monitor]);

  const appearance = {
    idle: {
      dot: "bg-white/35",
      text: "text-white/65",
      title: "Esperando mediciones de AURUM",
      label: "Midiendo",
    },
    healthy: {
      dot: "bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,.7)]",
      text: "text-white/80",
      title: "Rendimiento estable: FPS y tiempos de fotograma saludables",
      label: "Estable",
    },
    warning: {
      dot: "bg-amber-400 shadow-[0_0_7px_rgba(251,191,36,.7)]",
      text: "text-amber-100",
      title: "Carga elevada: revisa FPS, tiempo de fotograma y picos",
      label: "Carga elevada",
    },
    critical: {
      dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,.8)]",
      text: "text-rose-100",
      title: "Carga crítica: el visor está sufriendo caídas o bloqueos importantes",
      label: "Carga crítica",
    },
  }[status];

  return <button
    type="button"
    onClick={onClick}
    className={`absolute right-3 top-3 z-[79] inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#25272b]/95 px-3 py-2 text-[10px] font-semibold tracking-wide shadow-lg backdrop-blur-md transition hover:border-white/25 hover:bg-[#303238] ${appearance.text}`}
    aria-pressed={expanded}
    aria-label={`AURUM Performance: ${appearance.label}. Abrir diagnóstico`}
    title={appearance.title}
  >
    <span className={`size-1.5 shrink-0 rounded-full ${appearance.dot}`}/>
    PERFORMANCE
    {status === "warning" && <span className="sr-only">Carga elevada</span>}
    {status === "critical" && <span className="sr-only">Carga crítica</span>}
  </button>;
}

export function AurumPerformanceMonitorPanel({ open, onClose, renderer, monitor }: Props) {
  const [stats, setStats] = useState(EMPTY);

  useEffect(() => {
    if (!open) return;
    const update = () => setStats(monitor.snapshot(renderer));
    update();
    const id = window.setInterval(update, 600);
    return () => window.clearInterval(id);
  }, [open, renderer, monitor]);

  if (!open) return null;
  const fpsTone = stats.fps >= 50 ? "text-emerald-300" : stats.fps >= 30 ? "text-amber-300" : "text-rose-300";
  const overallStatus = getAurumPerformanceStatus(stats);
  const statusCopy = {
    idle: { label: "Midiendo actividad", tone: "text-white/50", dot: "bg-white/35" },
    healthy: { label: "Rendimiento estable", tone: "text-emerald-300", dot: "bg-emerald-400" },
    warning: { label: "Carga elevada", tone: "text-amber-300", dot: "bg-amber-400" },
    critical: { label: "Carga crítica", tone: "text-rose-300", dot: "bg-rose-500" },
  }[overallStatus];

  return <section className="absolute right-3 top-3 z-[80] w-[min(350px,calc(100%-24px))] overflow-hidden rounded-xl border border-white/10 bg-[#101216]/95 text-white shadow-2xl backdrop-blur-xl" aria-label="Monitor de rendimiento AURUM">
    <header className="flex items-center justify-between border-b border-white/[.08] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-[#c6a45a]/15 text-[#dfc17d]"><Activity size={15}/></span>
        <div><div className="text-[11px] font-semibold tracking-wide">AURUM PERFORMANCE</div><div className="text-[9px] text-white/40">Diagnóstico en tiempo real</div></div>
      </div>
      <button type="button" onClick={onClose} aria-label="Cerrar monitor" className="grid size-7 place-items-center rounded-md text-white/50 transition hover:bg-white/10 hover:text-white"><X size={15}/></button>
    </header>
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between rounded-lg border border-white/[.08] bg-white/[.035] px-3 py-2">
        <span className="text-[9px] font-medium uppercase tracking-[.12em] text-white/40">Estado del visor</span>
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${statusCopy.tone}`}>
          <span className={`size-1.5 rounded-full ${statusCopy.dot}`}/>{statusCopy.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/[.08] bg-white/[.04] p-3">
          <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[.12em] text-white/45"><Gauge size={11}/> Frecuencia</div>
          <div className={`mt-1 text-2xl font-semibold tabular-nums ${fpsTone}`}>{number(stats.fps, 0)}<span className="ml-1 text-[10px] font-normal text-white/40">FPS</span></div>
        </div>
        <div className="rounded-lg border border-white/[.08] bg-white/[.04] p-3">
          <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[.12em] text-white/45"><Monitor size={11}/> Fotograma</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-white">{number(stats.frameMs)}<span className="ml-1 text-[10px] font-normal text-white/40">ms</span></div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Render CPU" value={number(stats.renderMs)} unit="ms"/>
        <Metric label="BVH CPU" value={number(stats.bvhMs)} unit="ms"/>
        <Metric label="Pico frame" value={number(stats.maxFrameMs)} unit="ms"/>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Draw calls" value={compact(stats.calls)}/>
        <Metric label="Triángulos" value={compact(stats.triangles)}/>
        <Metric label="Geometrías GPU" value={compact(stats.geometries)}/>
        <Metric label="Texturas GPU" value={compact(stats.textures)}/>
      </div>
      <div className="flex items-center justify-between border-t border-white/[.08] pt-2 text-[10px]">
        <span className="flex items-center gap-1.5 text-white/45"><HardDrive size={11}/> {stats.webgl}</span>
        <span className="font-mono text-white/65">{stats.drawBuffer} · DPR {number(stats.pixelRatio, 2)}</span>
      </div>
      <div className="flex items-center justify-between text-[9px] text-white/35">
        <span>Ruta: {stats.path === "direct" ? "Direct WebGL" : stats.path === "composer" ? "EffectComposer" : "Esperando fotograma"}</span>
        <span>Ventana móvil 3 s</span>
      </div>
      <p className="text-[9px] leading-relaxed text-white/30">Los FPS representan fotogramas realmente renderizados por AURUM. La memoria muestra contadores de recursos de Three.js, no VRAM física.</p>
    </div>
  </section>;
}
