import { useMemo, useState } from "react";
import { Check, RotateCcw, Sparkles, WandSparkles } from "lucide-react";

export type AurumModelStagePreset = {
  id: string;
  name: string;
  description: string;
  materialId: string;
  sceneId: string;
  lightingId: string;
  backgroundId: string;
  swatch: string;
  accent: string;
  premium?: boolean;
};

const PRESETS: AurumModelStagePreset[] = [
  {id:"signature-gold",name:"Signature Gold",description:"Oro amarillo · estudio blanco",materialId:"oro18a_ijewel_premium",sceneId:"ijewel01",lightingId:"studioSoft",backgroundId:"blanco",swatch:"linear-gradient(145deg,#fff 0%,#ece8df 48%,#c9bda8 100%)",accent:"#c7a15a"},
  {id:"rose-editorial",name:"Rose Editorial",description:"Oro rosa · luz editorial",materialId:"oro18r_ijewel_premium",sceneId:"ijewel04",lightingId:"jewelry",backgroundId:"marfil",swatch:"linear-gradient(145deg,#f5d8ce 0%,#d9a99c 48%,#8e625e 100%)",accent:"#c98c7b"},
  {id:"white-platinum",name:"White Platinum",description:"Metal blanco · estudio frío",materialId:"platino_pulido",sceneId:"ijewel07",lightingId:"studioSoft",backgroundId:"grisClaro",swatch:"linear-gradient(145deg,#fff 0%,#dce2e7 50%,#82909e 100%)",accent:"#aebbc6"},
  {id:"midnight",name:"Midnight",description:"Rodio negro · contraste dramático",materialId:"rodio_negro",sceneId:"ijewel10",lightingId:"luxury",backgroundId:"negro",swatch:"linear-gradient(145deg,#59606a 0%,#171b24 52%,#050608 100%)",accent:"#707d91"},
  {id:"holiday-red",name:"Holiday Red",description:"Oro amarillo · escena roja",materialId:"oro18a_pulido",sceneId:"ijewel11",lightingId:"luxury",backgroundId:"blanco",swatch:"linear-gradient(145deg,#f7d7d1 0%,#b52632 52%,#4e0b16 100%)",accent:"#b52632",premium:true},
  {id:"aurora-blue",name:"Aurora Blue",description:"Oro amarillo · fondo Aurora",materialId:"oro18a_ijewel_premium",sceneId:"ijewel12",lightingId:"studioSoft",backgroundId:"auroraBlue",swatch:"linear-gradient(135deg,#f4b2a5 0%,#b8afd0 48%,#1f62ae 100%)",accent:"#3974b8"},
];

export function AurumModelStage({onApply}:{onApply:(preset:AurumModelStagePreset)=>boolean|void}) {
  const [selectedId,setSelectedId]=useState(PRESETS[0]!.id);
  const [autoApply,setAutoApply]=useState(false);
  const [lastAppliedId,setLastAppliedId]=useState<string|null>(null);
  const selected=useMemo(()=>PRESETS.find(p=>p.id===selectedId)??PRESETS[0]!,[selectedId]);
  const lastApplied=PRESETS.find(p=>p.id===lastAppliedId);

  const apply=(preset:AurumModelStagePreset)=>{
    const result=onApply(preset);
    if(result!==false) setLastAppliedId(preset.id);
  };

  return <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#f9f8f5] px-3 py-3">
    <div className="mb-3 flex items-start justify-between gap-2">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#92743b]">AURUM LAB · PRESENTACIÓN</div>
        <h2 className="mt-1 text-base font-semibold text-[#292824]">ModelStage</h2>
        <p className="mt-1 text-[10px] leading-relaxed text-[#77756f]">Presets coordinados de material, escena, iluminación y fondo.</p>
      </div>
      <Sparkles className="mt-1 size-5 text-[#b18b42]"/>
    </div>

    <div className="mb-3 flex items-center justify-between rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-[#45433e]">Apply config</div>
        <p className="mt-0.5 text-[9px] text-[#8a857b]">Aplicar al seleccionar un preset</p>
      </div>
      <button type="button" role="switch" aria-label="Aplicar configuración automáticamente" aria-checked={autoApply} onClick={()=>setAutoApply(v=>!v)} className={"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors "+(autoApply?"bg-[#a88743]":"bg-[#c9c6bf]")}>
        <span className={"inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform "+(autoApply?"translate-x-[18px]":"translate-x-1")}/>
      </button>
    </div>

    <div className="mb-3 grid grid-cols-2 gap-2">
      <button type="button" title="Volver al último preset aplicado" disabled={!lastApplied} onClick={()=>lastApplied&&apply(lastApplied)} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e2ddd3] bg-white text-[10px] font-medium text-[#55534d] transition hover:bg-[#f4efe5] disabled:cursor-not-allowed disabled:opacity-40">
        <RotateCcw className="size-4"/> Restaurar último
      </button>
      <div className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d8c69d] bg-[#f5f0e5] text-[10px] font-semibold text-[#80652e]">
        <WandSparkles className="size-4"/> AURUM Presets
      </div>
    </div>

    <p className="mb-3 rounded-lg border border-[#e6e1d8] bg-white/70 px-2.5 py-2 text-[9px] leading-relaxed text-[#77756f]">El preset aplica el acabado a las piezas metálicas compatibles y conserva las gemas. También configura escena, iluminación y fondo.</p>
    <div className="mb-2 flex items-center justify-between">
      <span className="text-[10px] font-semibold uppercase tracking-[.13em] text-[#92743b]">Model stages</span>
      <span className="text-[9px] text-[#99968d]">{PRESETS.length} configuraciones</span>
    </div>
    <div className="grid grid-cols-2 gap-2.5 pb-3">
      {PRESETS.map(preset=><button key={preset.id} type="button" aria-pressed={selectedId===preset.id} onClick={()=>{setSelectedId(preset.id);if(autoApply)apply(preset);}} className={"group min-w-0 overflow-hidden rounded-xl border bg-white text-left transition "+(selectedId===preset.id?"border-[#9a7a39] shadow-[0_0_0_2px_rgba(176,141,66,.13)]":"border-[#e7e2d9] hover:border-[#c9b78f]")}>
        <span className="relative block aspect-[4/3] overflow-hidden" style={{background:preset.swatch}}>
          <span className="absolute inset-x-[18%] bottom-[12%] h-[23%] rounded-[45%_45%_20%_20%] border border-white/65 bg-white/25 shadow-[0_7px_12px_rgba(0,0,0,.14)]"/>
          <span className="absolute left-1/2 top-[18%] h-[44%] w-[32%] -translate-x-1/2 rounded-[48%_48%_42%_42%] border border-white/70 bg-white/30 shadow-[0_5px_12px_rgba(0,0,0,.12)]"/>
          <span className="absolute left-1/2 top-[28%] size-[18%] -translate-x-1/2 rotate-45 rounded-[3px] border border-white/80 bg-white/55 shadow-[0_1px_5px_rgba(255,255,255,.5)]"/>
          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/35 px-1.5 py-1 text-[7px] font-semibold uppercase tracking-wide text-white">STAGE</span>
          {preset.premium&&<span className="absolute right-1.5 top-1.5 rounded-full bg-[#4f5361]/85 px-2 py-1 text-[7px] font-bold text-white">PREMIUM</span>}
          {selectedId===preset.id&&<span className="absolute right-1.5 bottom-1.5 grid size-5 place-items-center rounded-full bg-[#a88743] text-white"><Check className="size-3"/></span>}
        </span>
        <span className="block px-2.5 py-2">
          <span className="block truncate text-[10px] font-semibold text-[#3e3c37]">{preset.name}</span>
          <span className="mt-0.5 block min-h-7 text-[9px] leading-relaxed text-[#858178]">{preset.description}</span>
        </span>
      </button>)}
    </div>

    <div className="mt-auto rounded-xl border border-[#e6e1d8] bg-white p-3">
      <div className="mb-1 text-[9px] font-semibold uppercase tracking-[.13em] text-[#92743b]">Configuración seleccionada</div>
      <div className="text-xs font-semibold text-[#3e3c37]">{selected.name}</div>
      <div className="mt-1 text-[9px] leading-relaxed text-[#858178]">Material: {selected.materialId.replaceAll("_"," ")}<br/>Escena: {selected.sceneId} · Luz: {selected.lightingId}<br/>Fondo: {selected.backgroundId}</div>
      <button type="button" onClick={()=>apply(selected)} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#b99642]/60 bg-[#b99642] px-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#9f7d36]">
        <WandSparkles className="size-4"/> Aplicar configuración
      </button>
    </div>
  </div>;
}
