import { useState } from "react";
import { Sparkles } from "lucide-react";
import { AURUM_HDRI_URLS, AURUM_GEM_HDRI_URLS } from "../lib/aurum-photographic-scene-engine";

type Props = { apiRef: { current: any } };

const metalSwatches = [
  "radial-gradient(ellipse at 30% 20%,#fff7d8 0%,#9b8d65 18%,#252a2e 43%,#e5d6ad 58%,#55565a 76%,#17191c 100%)",
  "linear-gradient(135deg,#dce5ec,#59636d 28%,#f5f6f7 42%,#30363d 61%,#c8d0d6 80%,#22272d)",
  "radial-gradient(ellipse at 30% 25%,#fff 0%,#b5c5d5 18%,#5a6877 38%,#e8edf1 54%,#3b4148 76%,#17191c 100%)",
  "linear-gradient(145deg,#f6d7a1,#8a5730 28%,#fff1cc 45%,#5b3824 65%,#d9a45b 80%,#332117)",
  "linear-gradient(135deg,#fff,#e8edf0 30%,#9ba6ae 50%,#fdfdfd 64%,#69737b 82%,#e1e7eb)",
  "radial-gradient(ellipse at 30% 25%,#fff 0%,#d9dce0 20%,#5c626a 42%,#fafafa 60%,#4a4e54 82%,#16181b 100%)"
];
const gemSwatches = [
  "radial-gradient(circle at 35% 25%,#fff 0%,#dfefff 18%,#8db7e8 34%,#343e68 61%,#101521 100%)",
  "linear-gradient(135deg,#fff,#d8e3ee 30%,#7d8ea6 52%,#f5f8fc 68%,#68798d 86%,#202733)",
  "radial-gradient(circle at 35% 25%,#fff 0%,#dbe5ec 18%,#9da9b5 36%,#4c5665 62%,#171d25 100%)",
  "linear-gradient(145deg,#ffe6a7,#c8a4ec 25%,#8d72c6 46%,#f7d9fb 61%,#50458e 82%,#17162b)",
  "linear-gradient(135deg,#fff,#f3c9c9 28%,#b35d73 49%,#ffe5d9 67%,#6c263d 86%,#25131e)",
  "radial-gradient(circle at 35% 25%,#fff 0%,#f6f7f8 16%,#c4d7ed 34%,#e9f4ff 48%,#829ab8 72%,#303d52 100%)"
];

export function AurumEnvironmentPicker({ apiRef }: Props) {
  const [tipo, setTipo] = useState<"metales" | "gemas">("metales");
  const [metal, setMetal] = useState("jewelry");
  const [gema, setGema] = useState("gemNeutral");
  const resources = tipo === "metales" ? AURUM_HDRI_URLS : AURUM_GEM_HDRI_URLS;
  return <section className="border-b border-white/10 px-4 py-3">
    <div className="mb-3 flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm font-medium"><Sparkles className="size-4 text-[#d4af37]"/>Environment</span>
      <span className="text-[9px] uppercase tracking-wider text-white/30">HDRI</span>
    </div>
    <div className="mb-3 grid grid-cols-2 rounded-xl border border-white/10 bg-black/20 p-1">
      <button type="button" onClick={() => setTipo("metales")} className={"rounded-lg px-2 py-2 text-[10px] font-semibold transition "+(tipo==="metales"?"bg-white/10 text-[#e3c56e] shadow-inner":"text-white/45 hover:text-white")}>HDR Metales</button>
      <button type="button" onClick={() => setTipo("gemas")} className={"rounded-lg px-2 py-2 text-[10px] font-semibold transition "+(tipo==="gemas"?"bg-white/10 text-sky-200 shadow-inner":"text-white/45 hover:text-white")}>HDR Gemas</button>
    </div>
    <div className="grid grid-cols-3 gap-2.5">
      {Object.entries(resources).filter(([id]) => tipo !== "metales" || id !== "ijewelGem").map(([id], index) => {
        const active = tipo === "metales" ? metal === id : gema === id;
        const background = (tipo === "metales" ? metalSwatches : gemSwatches)[index % 6];
        return <button key={id} type="button" title={id} aria-label={(tipo==="metales"?"HDR metal ":"HDR gema ")+id} onClick={() => {
          if (tipo === "metales") { setMetal(id); apiRef.current?.hdriMetal?.(id); }
          else { setGema(id); apiRef.current?.hdriGema?.(id); }
        }} className={"group min-w-0 rounded-xl p-1.5 text-center transition "+(active?"bg-white/[.075]":"hover:bg-white/[.04]")}>
          <span className={"relative mx-auto grid aspect-square w-full max-w-[72px] place-items-center overflow-hidden rounded-full border-2 transition "+(active?(tipo==="metales"?"border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,.25)]":"border-sky-300 shadow-[0_0_15px_rgba(125,211,252,.22)]"):"border-white/10 group-hover:border-white/30")}>
            <span className="absolute inset-0" style={{background}}/>
            <span className="absolute inset-0 rounded-full" style={{background:"radial-gradient(ellipse at 28% 18%,rgba(255,255,255,.88),rgba(255,255,255,.12) 24%,transparent 44%),linear-gradient(115deg,transparent 24%,rgba(255,255,255,.5) 37%,transparent 49%,rgba(0,0,0,.28) 73%,transparent 83%)"}}/>
            {active && <span className="absolute bottom-0 right-0 grid size-4 place-items-center rounded-full bg-white text-[#101214]"><span className="text-[10px] font-bold">✓</span></span>}
          </span>
          <span className="mt-1.5 block truncate text-[9px] text-white/65">{id.replace(/([A-Z])/g," $1").replace(/^./,c=>c.toUpperCase())}</span>
        </button>;
      })}
    </div>
    <p className="mt-3 text-[9px] leading-relaxed text-white/30">{tipo==="metales"?"Cambiar el entorno modifica los reflejos del metal sin sustituir el HDR independiente de las gemas.":"Este entorno se aplica sólo a las gemas; el HDR de los metales permanece intacto."}</p>
  </section>;
}
