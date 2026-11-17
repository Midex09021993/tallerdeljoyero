import { useMemo, useState } from "react";
import { Camera, Check, Download, RotateCcw, X } from "lucide-react";

type View = "frontal" | "lateral" | "superior" | "perspectiva";
type Snapshot = {
  view: View; capturedAt: string;
  position: [number, number, number]; quaternion: [number, number, number, number];
  target: [number, number, number]; up: [number, number, number];
  fov: number; aspect: number; zoom: number; near: number; far: number;
  distance: number; projectedWidth: number; projectedHeight: number;
  projectedCenter: [number, number];
};
const VIEWS: {id:View;label:string;hint:string}[] = [
  {id:"frontal",label:"Frontal",hint:"Referencia maestra"},
  {id:"lateral",label:"Lateral",hint:"Giro de 90°"},
  {id:"superior",label:"Superior",hint:"Cámara desde arriba"},
  {id:"perspectiva",label:"Perspectiva 3/4",hint:"Vista de presentación"},
];

export function AurumCameraCalibrationPanel({hasModel,onClose,onSelectView,captureSnapshot,applySnapshot}:{
  hasModel:boolean; onClose:()=>void; onSelectView:(view:View)=>void;
  captureSnapshot:(view:View)=>Snapshot|null; applySnapshot:(snapshot:Snapshot)=>boolean;
}) {
  const [active,setActive]=useState<View>("frontal");
  const [snapshots,setSnapshots]=useState<Partial<Record<View,Snapshot>>>({});
  const [message,setMessage]=useState("Selecciona una vista, ajusta la cámara y captura su referencia.");
  const completed=useMemo(()=>VIEWS.filter(v=>snapshots[v.id]).length,[snapshots]);
  const choose=(view:View)=>{setActive(view);onSelectView(view);setMessage("Ajusta la cámara alrededor de la joya y captura el encuadre.");};
  const capture=()=>{const value=captureSnapshot(active);if(!value){setMessage("No se pudo leer la cámara. Comprueba que haya una joya cargada.");return;}setSnapshots(old=>({...old,[active]:value}));setMessage("Referencia "+VIEWS.find(v=>v.id===active)?.label+" capturada.");};
  const apply=(view:View)=>{const value=snapshots[view];if(value&&applySnapshot(value)){setActive(view);setMessage("Referencia aplicada al visor.");}};
  const exportJson=()=>{const payload={format:"AURUM_CAMERA_CALIBRATION",version:1,createdAt:new Date().toISOString(),coordinateSystem:"AURUM world space",references:snapshots};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="aurum-camera-calibration.json";a.click();URL.revokeObjectURL(url);setMessage("Calibración exportada en JSON.");};
  return <div className="fixed inset-0 z-[150] flex items-start justify-end bg-black/25 p-3 backdrop-blur-[2px]" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section role="dialog" aria-modal="true" aria-labelledby="aurum-camera-calibration-title" className="flex max-h-[min(900px,calc(100vh-24px))] w-full max-w-[410px] flex-col overflow-hidden rounded-2xl border border-[#d9c99f] bg-[#fbfaf7] text-[#292824] shadow-[0_24px_80px_rgba(0,0,0,.28)]">
      <header className="flex items-start justify-between gap-3 border-b border-[#e8e1d3] bg-white px-4 py-3"><div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-[#92743b]"><Camera className="size-3.5"/> AURUM LAB · CÁMARAS</div><h2 id="aurum-camera-calibration-title" className="mt-1 text-base font-semibold">Calibración por referencias</h2><p className="mt-1 text-[10px] text-[#77756f]">Captura la posición real de cámara para cada orientación.</p></div><button type="button" aria-label="Cerrar calibrador" onClick={onClose} className="rounded-lg p-2 text-[#77756f] hover:bg-[#f1eee7]"><X className="size-4"/></button></header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {!hasModel?<div className="rounded-xl border border-dashed border-[#d8d0c1] bg-white p-5 text-center text-xs text-[#77756f]">Carga una joya para comenzar.</div>:<>
          <section className="rounded-xl border border-[#e8e1d3] bg-white p-3"><div className="mb-2 flex justify-between text-xs"><b>Referencias maestras</b><span className="tabular-nums text-[#92743b]">{completed}/4 capturadas</span></div><div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#eee9df]"><div className="h-full rounded-full bg-[#b99642]" style={{width:`${completed*25}%`}}/></div><div className="grid grid-cols-2 gap-2">{VIEWS.map((v,i)=><button key={v.id} type="button" onClick={()=>choose(v.id)} className={`rounded-xl border p-3 text-left ${active===v.id?"border-[#b99642] bg-[#f6f0e2]":"border-[#e8e1d3] bg-[#fdfcf9] hover:border-[#c9ad6d]"}`}><div className="flex items-center justify-between text-xs font-semibold"><span>{String(i+1).padStart(2,"0")} · {v.label}</span>{snapshots[v.id]?<Check className="size-3.5 text-[#8b713b]"/>:<span className="size-2 rounded-full bg-[#d8d2c7]"/>}</div><div className="mt-1 text-[9px] text-[#858178]">{snapshots[v.id]?"Referencia guardada":v.hint}</div></button>)}</div></section>
          <section className="rounded-xl border border-[#e8e1d3] bg-white p-3"><b className="text-xs">Paso actual: {VIEWS.find(v=>v.id===active)?.label}</b><ol className="mt-2 list-decimal space-y-1 pl-4 text-[10px] leading-relaxed text-[#77756f]"><li>Selecciona la orientación.</li><li>Gira la cámara alrededor de la joya hasta conseguir el encuadre deseado.</li><li>Captura posición, rotación, objetivo, FOV y medidas proyectadas.</li></ol><button type="button" onClick={capture} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#d4af37] px-3 py-3 text-xs font-semibold text-[#292824] hover:bg-[#e1bf50]"><Camera className="size-4"/> Capturar referencia actual</button>{snapshots[active]&&<button type="button" onClick={()=>apply(active)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[#d9c99f] bg-[#faf7ef] px-3 py-2.5 text-[11px] font-semibold text-[#725b2d]"><RotateCcw className="size-3.5"/> Recuperar esta referencia</button>}</section>
          <section className="rounded-xl border border-[#e8e1d3] bg-white p-3"><b className="mb-2 block text-xs">Mediciones capturadas</b>{snapshots[active]?<div className="grid grid-cols-2 gap-2 text-[10px]">{[["Distancia",snapshots[active]!.distance.toFixed(4)],["FOV",snapshots[active]!.fov.toFixed(3)+"°"],["Ancho proyectado",snapshots[active]!.projectedWidth.toFixed(4)],["Alto proyectado",snapshots[active]!.projectedHeight.toFixed(4)],["Centro X · Y",snapshots[active]!.projectedCenter.map(n=>n.toFixed(4)).join(" · ")]].map(([label,value])=><div key={label} className="rounded-lg bg-[#f7f5ef] p-2"><div className="text-[#858178]">{label}</div><div className="mt-1 font-semibold tabular-nums">{value}</div></div>)}</div>:<p className="text-[10px] text-[#858178]">Todavía no hay una referencia capturada para esta vista.</p>}</section>
        </>}
      </div>
      <footer className="border-t border-[#e8e1d3] bg-white p-3"><p role="status" aria-live="polite" className="mb-2 min-h-8 text-[10px] leading-relaxed text-[#77756f]">{message}</p><div className="flex gap-2"><button type="button" onClick={()=>setSnapshots({})} disabled={!completed} className="flex-1 rounded-lg border border-[#e5dfd3] bg-white px-3 py-2.5 text-[10px] font-medium text-[#77756f] disabled:opacity-40">Limpiar capturas</button><button type="button" onClick={exportJson} disabled={!completed} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-[#c9ad6d] bg-[#f5efdf] px-3 py-2.5 text-[10px] font-semibold text-[#725b2d] disabled:opacity-40"><Download className="size-3.5"/> Exportar JSON</button></div></footer>
    </section>
  </div>;
}
