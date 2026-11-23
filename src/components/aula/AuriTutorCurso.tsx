import { useState } from "react";
import { Bot, X } from "lucide-react";
import { AuriChat, AuriMascota } from "@/components/auri/AuriChat";

type Props = { contexto: string };

export default function AuriTutorCurso({ contexto }: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <div className="my-6 flex flex-col gap-3 rounded-2xl border border-[#e8dcc0] bg-gradient-to-r from-[#fffaf0] via-white to-[#f7f9fb] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-[#e4d3a5] bg-white shadow-sm"><AuriMascota compact /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#9b7936]">AURI TUTOR · GUÍA CONTEXTUAL DEL MÓDULO</p>
            <h4 className="mt-1 text-sm font-semibold text-[#263746]">¿Necesitas ayuda con este apartado?</h4>
            <p className="mt-1 text-xs leading-5 text-[#718096]">Guía local basada en el contenido de este apartado. Tus consultas no se envían a Gemini.</p>
          </div>
        </div>
        <button type="button" onClick={() => setAbierto(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#c4a15a] px-4 py-2.5 text-sm font-semibold text-[#21180a] shadow-sm transition hover:bg-[#b99552] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4a15a]">
          <Bot className="size-4" /> Consultar a AURI
        </button>
      </div>
      {abierto && (
        <div className="fixed inset-0 z-[150] flex h-[100dvh] w-screen flex-col overflow-hidden bg-white pt-[env(safe-area-inset-top)] shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[min(760px,88dvh)] sm:max-h-[88dvh] sm:w-[min(460px,calc(100vw-2rem))] sm:rounded-2xl sm:border sm:border-[#e8dfcc] sm:pt-0" role="dialog" aria-modal="true" aria-label="AURI Tutor del curso">
          <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar AURI Tutor" className="absolute right-3 top-[calc(env(safe-area-inset-top)+10px)] z-30 grid size-9 place-items-center rounded-full border border-[#e8dfcc] bg-white/95 text-[#69737b] shadow-sm transition hover:border-[#c7a65b] hover:text-[#96732e] sm:right-3 sm:top-3"><X className="size-4" /></button>
          <AuriChat modo="publico" rutaActual="/cursos-diseno-3d" contextoCurso={contexto} onContact={() => setAbierto(false)} />
        </div>
      )}
    </>
  );
}
