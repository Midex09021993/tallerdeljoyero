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
  {id:"signature-gold",name:"Signature Gold",description:"Oro amarillo · estudio blanco",materialId:"oro18a_ijewel_premium",sceneId:"ijewel01",lightingId:"studioSoft",backgroundId:"blanco",swatch:"linear-gradient(145deg,#fff 0%,#f1eee7 48%,#c9c0ae 100%)",accent:"#c7a15a",premium:true},
  {id:"white-platinum",name:"White Platinum",description:"Metal blanco · estudio frío",materialId:"oro18b_ijewel_premium",sceneId:"ijewel07",lightingId:"studioSoft",backgroundId:"grisClaro",swatch:"linear-gradient(145deg,#fff 0%,#dce2e7 50%,#8795a3 100%)",accent:"#aebbc6",premium:true},
  {id:"rose-editorial",name:"Rose Editorial",description:"Oro rosa · luz editorial",materialId:"oro18r_ijewel_premium",sceneId:"ijewel04",lightingId:"jewelry",backgroundId:"marfil",swatch:"linear-gradient(145deg,#f5d8ce 0%,#d9a99c 48%,#8e625e 100%)",accent:"#c98c7b",premium:true},
  {id:"silver-gallery",name:"Silver Gallery",description:"Plata pulida · galería neutra",materialId:"plata925_pulida",sceneId:"ijewel02",lightingId:"studioSoft",backgroundId:"grisClaro",swatch:"linear-gradient(145deg,#fff 0%,#d8dde2 48%,#8c969e 100%)",accent:"#c2cbd2"},
  {id:"champagne",name:"Champagne",description:"Oro champán · marfil cálido",materialId:"oro18_champan",sceneId:"ijewel03",lightingId:"jewelry",backgroundId:"marfil",swatch:"linear-gradient(145deg,#fff5dd 0%,#d6bd88 48%,#8e7551 100%)",accent:"#c7a76b"},
  {id:"gold-satin",name:"Gold Satin",description:"Oro satinado · luz suave",materialId:"oro18a_satinado",sceneId:"ijewel05",lightingId:"studioSoft",backgroundId:"blanco",swatch:"linear-gradient(145deg,#fff7e6 0%,#d7b66d 50%,#8c6d32 100%)",accent:"#c49b4b"},
  {id:"gold-matte",name:"Gold Matte",description:"Oro mate · estudio limpio",materialId:"oro18a_mate",sceneId:"ijewel06",lightingId:"studioSoft",backgroundId:"grisClaro",swatch:"linear-gradient(145deg,#f5f2e9 0%,#c7a45a 50%,#77603a 100%)",accent:"#b18e4c"},
  {id:"midnight",name:"Midnight",description:"Rodio negro · contraste dramático",materialId:"rodio_negro",sceneId:"ijewel10",lightingId:"luxury",backgroundId:"negro",swatch:"linear-gradient(145deg,#59606a 0%,#171b24 52%,#050608 100%)",accent:"#707d91",premium:true},
  {id:"holiday-red",name:"Holiday Red",description:"Oro amarillo · escena roja",materialId:"oro18a_pulido",sceneId:"ijewel11",lightingId:"luxury",backgroundId:"blanco",swatch:"linear-gradient(145deg,#f7d7d1 0%,#b52632 52%,#4e0b16 100%)",accent:"#b52632",premium:true},
  {id:"aurora-blue",name:"Aurora Blue",description:"Oro amarillo · fondo Aurora",materialId:"oro18a_ijewel_premium",sceneId:"ijewel12",lightingId:"studioSoft",backgroundId:"auroraBlue",swatch:"linear-gradient(135deg,#f4b2a5 0%,#b8afd0 48%,#1f62ae 100%)",accent:"#3974b8",premium:true},
  {id:"platinum-soft",name:"Platinum Soft",description:"Platino pulido · fondo perla",materialId:"platino_pulido",sceneId:"ijewel08",lightingId:"jewelry",backgroundId:"marfil",swatch:"linear-gradient(145deg,#fff 0%,#e3e5e5 48%,#a7aeb3 100%)",accent:"#b6bec4"},
  {id:"black-editorial",name:"Black Editorial",description:"Rodio negro · fondo profundo",materialId:"rodio_negro",sceneId:"ijewel09",lightingId:"luxury",backgroundId:"negro",swatch:"linear-gradient(145deg,#59606a 0%,#292d34 48%,#090b0e 100%)",accent:"#8b929b"},
  {id:"warm-gold",name:"Warm Gold",description:"Oro cálido · fotografía comercial",materialId:"oro18a_calido",sceneId:"ijewel01",lightingId:"jewelry",backgroundId:"marfil",swatch:"linear-gradient(145deg,#fff0ca 0%,#ddad45 48%,#8a6428 100%)",accent:"#d6a746"},
  {id:"rose-satin",name:"Rose Satin",description:"Oro rosa satinado · editorial",materialId:"oro18r_satinado",sceneId:"ijewel04",lightingId:"studioSoft",backgroundId:"marfil",swatch:"linear-gradient(145deg,#f9e5df 0%,#d18b76 48%,#85544b 100%)",accent:"#c98778"},
  {id:"palladium",name:"Palladium",description:"Paladio pulido · estudio gris",materialId:"paladio_pulido",sceneId:"ijewel07",lightingId:"studioHard",backgroundId:"grisClaro",swatch:"linear-gradient(145deg,#f9fbfd 0%,#cbd2d9 48%,#697681 100%)",accent:"#9eabb5"},
  {id:"gold-24k",name:"Gold 24K",description:"Oro 24K · lujo cálido",materialId:"oro24_pulido",sceneId:"ijewel03",lightingId:"luxury",backgroundId:"marfil",swatch:"linear-gradient(145deg,#fff0b5 0%,#e9bb3f 48%,#89651d 100%)",accent:"#d9ae39"},
];

function StageArtwork({accent}:{accent:string}) {
  return <svg viewBox="0 0 120 82" className="absolute inset-0 h-full w-full" aria-hidden="true">
    <defs>
      <linearGradient id={"stage-metal-"+accent.replace("#","")} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity=".95"/>
        <stop offset=".42" stopColor={accent}/>
        <stop offset="1" stopColor="#51412b" stopOpacity=".75"/>
      </linearGradient>
      <filter id="stage-shadow"><feGaussianBlur stdDeviation="1.6"/></filter>
    </defs>
    <ellipse cx="60" cy="69" rx="35" ry="5" fill="#000" opacity=".16" filter="url(#stage-shadow)"/>
    <path d="M19 15 C30 34 42 43 60 46 C78 43 90 34 101 15" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.5"/>
    <path d="M19 15 C30 34 42 43 60 46 C78 43 90 34 101 15" fill="none" stroke={"url(#stage-metal-"+accent.replace("#","")+")"} strokeWidth="2.8" strokeLinecap="round"/>
    <path d="M60 43 C49 51 45 59 60 70 C75 59 71 51 60 43Z" fill="#fff" fillOpacity=".32" stroke={accent} strokeWidth="1.3"/>
    <path d="M60 48 L55 56 L60 65 L65 56Z" fill="#fff" fillOpacity=".42" stroke="#fff" strokeOpacity=".65" strokeWidth=".7"/>
    <circle cx="60" cy="43" r="3.2" fill="#fff" stroke={accent} strokeWidth="1"/>
    <path d="M29 24 Q60 8 91 24" fill="none" stroke="#fff" strokeOpacity=".38" strokeWidth="1"/>
  </svg>;
}

export function AurumModelStage({onApply}:{onApply:(preset:AurumModelStagePreset)=>boolean|void}) {
  const [selectedId,setSelectedId]=useState(PRESETS[0]!.id);
  const [autoApply,setAutoApply]=useState(false);
  const [premiumOnly,setPremiumOnly]=useState(false);
  const [lastAppliedId,setLastAppliedId]=useState<string|null>(null);
  const selected=useMemo(()=>PRESETS.find(p=>p.id===selectedId)??PRESETS[0]!,[selectedId]);
  const visiblePresets=useMemo(()=>PRESETS.filter(p=>!premiumOnly||p.premium),[premiumOnly]);
  const lastApplied=PRESETS.find(p=>p.id===lastAppliedId);

  const apply=(preset:AurumModelStagePreset)=>{
    const result=onApply(preset);
    if(result!==false) setLastAppliedId(preset.id);
  };
  const select=(preset:AurumModelStagePreset)=>{
    setSelectedId(preset.id);
    if(autoApply) apply(preset);
  };

  return <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#f0f0f2] px-3 py-3">
    <div className="mb-3 flex items-center justify-between gap-2 px-1">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#92743b]">AURUM LAB</div>
        <h2 className="mt-0.5 text-sm font-semibold text-[#303038]">ModelStage</h2>
      </div>
      <Sparkles className="size-4 text-[#7775ff]"/>
    </div>

    <div className="mb-3 flex items-center justify-between px-1">
      <span className="text-[11px] font-medium text-[#777781]">Apply config</span>
      <button type="button" role="switch" aria-label="Apply config" aria-checked={autoApply} onClick={()=>setAutoApply(v=>!v)} className={"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors "+(autoApply?"bg-[#7775ff]":"bg-[#d6d6dc]")}>
        <span className={"inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform "+(autoApply?"translate-x-[18px]":"translate-x-1")}/>
      </button>
    </div>

    <div className="mb-2 grid grid-cols-2 gap-2">
      <button type="button" title="Restaurar el último preset aplicado" disabled={!lastApplied} onClick={()=>lastApplied&&apply(lastApplied)} className="relative flex aspect-[1.25/1] items-center justify-center rounded-lg border border-[#c7c6ff] bg-white text-[#6868f2] shadow-sm transition hover:bg-[#f8f8ff] disabled:cursor-not-allowed disabled:opacity-45">
        <RotateCcw className="size-7"/>
      </button>
      <button type="button" aria-pressed={premiumOnly} onClick={()=>setPremiumOnly(v=>!v)} className={"relative flex aspect-[1.25/1] items-center justify-center rounded-lg border text-white transition "+(premiumOnly?"border-[#7775ff] bg-[#6262d8]":"border-[#d7d7df] bg-[#62626d] hover:bg-[#555561]")}>
        <span className="rounded-full bg-[#7775ff] px-3 py-1 text-[10px] font-bold shadow">Premium</span>
      </button>
    </div>

    <div className="grid grid-cols-2 gap-2 pb-3">
      {visiblePresets.map(preset=><button key={preset.id} type="button" title={preset.name+" · "+preset.description} aria-label={preset.name} aria-pressed={selectedId===preset.id} onClick={()=>select(preset)} className={"group relative min-w-0 overflow-hidden rounded-lg border bg-white transition "+(selectedId===preset.id?"border-[#7775ff] shadow-[0_0_0_1px_#7775ff]":"border-white hover:border-[#c9c8ff]")}>
        <span className="relative block aspect-[1.42/1] overflow-hidden" style={{background:preset.swatch}}>
          <StageArtwork accent={preset.accent}/>
          {selectedId===preset.id&&<span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-[#7775ff] text-white"><Check className="size-2.5"/></span>}
        </span>
        <span className="sr-only">{preset.name}</span>
      </button>)}
    </div>

    {!autoApply&&<div className="sticky bottom-0 mt-auto border-t border-[#dedee4] bg-[#f0f0f2]/95 pt-2">
      <div className="mb-1 truncate text-[10px] font-semibold text-[#44444c]">{selected.name}</div>
      <button type="button" onClick={()=>apply(selected)} className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#6969e8] px-3 text-[10px] font-semibold text-white shadow-sm transition hover:bg-[#5858d2]">
        <WandSparkles className="size-3.5"/> Apply config
      </button>
    </div>}
  </div>;
}
