import { useEffect, useState } from "react";
import { AurumPerformanceIndicator, AurumPerformanceMonitorPanel } from "./AurumPerformanceMonitorPanel";

type Props = {
  performanceOpen: boolean;
  onPerformanceToggle: () => void;
  onPerformanceClose: () => void;
  performanceRenderer: any;
  performanceMonitor: any;
  selectionDiagnostic: any | null;
  selectionName: string | null;
  selectionEnabled: boolean;
  onSelectionClose: () => void;
  cameraActions?: { reset: () => void; front: () => void; side: () => void; top: () => void; zoom: (direction: "in" | "out") => void; rotate: (enabled: boolean) => void } | null;
};

/** Controles de diagnóstico del visor original; no crea ni modifica el renderer. */
export function AurumViewerControlsModule({
  performanceOpen, onPerformanceToggle, onPerformanceClose,
  performanceRenderer, performanceMonitor,
  selectionDiagnostic, selectionName, selectionEnabled, onSelectionClose, cameraActions,
}: Props) {
  const [diagnosticVisible, setDiagnosticVisible] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  useEffect(() => { setAutoRotate(false); }, [cameraActions]);
  useEffect(() => { setDiagnosticVisible(true); }, [selectionDiagnostic, selectionEnabled]);
  const diagnostic = selectionDiagnostic;
  return <>
    <>
      <AurumPerformanceIndicator renderer={performanceRenderer} monitor={performanceMonitor} onClick={onPerformanceToggle} expanded={performanceOpen}/>
      <AurumPerformanceMonitorPanel open={performanceOpen} onClose={onPerformanceClose} renderer={performanceRenderer} monitor={performanceMonitor}/>
    </>
    {cameraActions && <nav className="absolute right-5 top-1/2 z-[78] flex -translate-y-1/2 flex-col items-center gap-1 rounded-2xl border border-white/70 bg-white/65 p-1.5 text-[#292824] shadow-[0_8px_28px_rgba(36,32,20,.10)] backdrop-blur-2xl" aria-label="Controles originales de AURUM VIEWER">
      <button type="button" onClick={() => cameraActions.reset()} title="Reiniciar cámara" aria-label="Reiniciar cámara" className="grid size-9 place-items-center rounded-xl text-black/70 transition-colors hover:bg-white/80 hover:text-[#92743b]"><span className="text-lg leading-none">↺</span></button>
      <button type="button" onClick={() => { const next = !autoRotate; setAutoRotate(next); cameraActions.rotate(next); }} title={autoRotate ? "Detener rotación 360°" : "Activar rotación 360°"} aria-label={autoRotate ? "Detener rotación 360 grados" : "Activar rotación 360 grados"} aria-pressed={autoRotate} className={"grid size-9 place-items-center rounded-xl text-[10px] font-semibold transition-colors " + (autoRotate ? "bg-[#d4af37]/20 text-[#92743b]" : "text-black/70 hover:bg-white/80 hover:text-[#92743b]")}>360°</button>
      <button type="button" onClick={() => { const host = document.fullscreenElement; if (host) void document.exitFullscreen(); else void (document.querySelector('[aria-label="Controles originales de AURUM VIEWER"]')?.parentElement?.parentElement as HTMLElement | null)?.requestFullscreen?.(); }} title="Pantalla completa" aria-label="Pantalla completa" className="grid size-9 place-items-center rounded-xl text-black/70 transition-colors hover:bg-white/80 hover:text-[#92743b]"><span className="text-base leading-none">⛶</span></button>
    </nav>}
    {cameraActions && <div className="absolute bottom-6 right-6 z-[78] flex gap-1 rounded-xl border border-white/35 bg-white/75 p-1 text-black/55 shadow-sm backdrop-blur-2xl" aria-label="Estado del visor">
      <span className="rounded-lg border border-black/10 px-2 py-1 text-[9px]">HDRI</span>
      <span className="rounded-lg border border-black/10 px-2 py-1 text-[9px]">PBR</span>
    </div>}
    {selectionEnabled && diagnostic && diagnosticVisible && <section className="absolute left-3 top-3 z-[75] w-[min(430px,calc(100%-24px))] max-h-[78%] overflow-y-auto rounded-xl border border-[#d4af37]/50 bg-[#101214]/95 p-3 text-[10px] leading-relaxed text-white shadow-2xl backdrop-blur-xl" aria-label="Diagnóstico de selección">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-[.16em] text-[#d4af37]">Diagnóstico de selección <span className="ml-2 text-white/40">Ctrl+Shift+D</span></div>
          <div className="break-words text-xs font-semibold text-white">{selectionName || "Componente"}</div>
          <div className="mt-1 break-all text-[9px] text-white/45">{diagnostic.selected?.uuid ?? "ID no disponible"}</div>
        </div>
        <button type="button" title="Cerrar diagnóstico" onClick={() => { setDiagnosticVisible(false); onSelectionClose(); }} className="rounded-md px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white">✕</button>
      </header>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <div className="rounded-lg bg-white/[.06] p-2"><div className="text-white/45">Categoría</div><div className="font-semibold">{diagnostic.selected?.category ?? "—"}</div></div>
        <div className="rounded-lg bg-white/[.06] p-2"><div className="text-white/45">Capa</div><div className="break-words font-semibold">{diagnostic.selected?.layer || "NO RESUELTA"}</div></div>
        <div className="rounded-lg bg-white/[.06] p-2"><div className="text-white/45">Mallas totales / gemas</div><div className="font-semibold">{diagnostic.counts?.totalMeshes ?? 0} / {diagnostic.counts?.gemstoneMeshes ?? 0}</div></div>
        <div className="rounded-lg bg-white/[.06] p-2"><div className="text-white/45">Gemas en esta capa</div><div className="font-semibold">{diagnostic.counts?.gemstoneMeshesOnSameLayer ?? 0}</div></div>
      </div>
      <div className="mt-2 rounded-lg border border-white/10 p-2">
        <div className="mb-1 font-semibold text-[#d4af37]">Identidad y origen de capa</div>
        <pre className="whitespace-pre-wrap break-words font-sans text-[9px] text-white/75">{JSON.stringify({layerKey:diagnostic.selected?.layerKey,layerId:diagnostic.selected?.layerId,layerIndex:diagnostic.selected?.layerIndex,preservedSource:diagnostic.selected?.preservedSource,resolution:diagnostic.selected?.resolution,objectType:diagnostic.selected?.objectType,geometryType:diagnostic.selected?.geometryType},null,2)}</pre>
      </div>
      <div className="mt-2 rounded-lg border border-white/10 p-2">
        <div className="mb-1 font-semibold text-[#d4af37]">Geometría y material actual</div>
        <pre className="whitespace-pre-wrap break-words font-sans text-[9px] text-white/75">{JSON.stringify(diagnostic.geometry ?? diagnostic.topology ?? {},null,2)}</pre>
      </div>
    </section>}
  </>;
}
