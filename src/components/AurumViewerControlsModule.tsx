import React, { useEffect, useState } from "react";
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
};

/** Controles de diagnóstico del visor original; no crea ni modifica el renderer. */
export function AurumViewerControlsModule({
  performanceOpen, onPerformanceToggle, onPerformanceClose,
  performanceRenderer, performanceMonitor,
  selectionDiagnostic, selectionName, selectionEnabled, onSelectionClose,
}: Props) {
  const [diagnosticVisible, setDiagnosticVisible] = useState(true);
  useEffect(() => { setDiagnosticVisible(true); }, [selectionDiagnostic, selectionEnabled]);
  const diagnostic = selectionDiagnostic;
  return <>
    <div className="absolute right-3 top-3 z-[70]">
      <AurumPerformanceIndicator renderer={performanceRenderer} monitor={performanceMonitor} onClick={onPerformanceToggle} expanded={performanceOpen}/>
      <AurumPerformanceMonitorPanel open={performanceOpen} onClose={onPerformanceClose} renderer={performanceRenderer} monitor={performanceMonitor}/>
    </div>
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
