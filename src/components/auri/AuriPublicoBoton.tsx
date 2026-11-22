import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { X } from "lucide-react";
import { AuriChat, AuriMascota } from "@/components/auri/AuriChat";

export function AuriPublicoBoton() {
  const [abierto, setAbierto] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <>
      {abierto ? (
        <div className="fixed inset-0 z-[90] flex h-[100dvh] w-screen flex-col overflow-hidden bg-white pt-[env(safe-area-inset-top)] shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[min(700px,86dvh)] sm:max-h-[86dvh] sm:w-[420px] sm:rounded-2xl sm:border sm:border-[#e8dfcc] sm:pt-0">
          <button
            type="button"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar asistente AURI"
            className="absolute right-3 top-[calc(env(safe-area-inset-top)+10px)] z-30 grid size-9 place-items-center rounded-full border border-[#e8dfcc] bg-white/95 text-[#69737b] shadow-sm transition hover:border-[#c7a65b] hover:text-[#96732e] sm:right-3 sm:top-3"
          >
            <X className="size-4" />
          </button>
          <AuriChat modo="publico" onContact={() => setAbierto(false)} rutaActual={pathname} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Conversar con AURI, guía virtual de Taller del Joyero"
          className="fixed bottom-5 right-4 z-[80] flex min-h-16 items-center gap-2.5 rounded-full border border-[#d8c28b] bg-white/95 py-2 pl-2 pr-4 text-left shadow-[0_10px_35px_rgba(38,55,70,.18)] backdrop-blur transition hover:-translate-y-1 hover:shadow-[0_14px_40px_rgba(38,55,70,.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7a65b] sm:bottom-6 sm:right-6"
        >
          <span className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-[#fffdf7] to-[#f1e6c9]">
            <AuriMascota compact />
          </span>
          <span className="flex flex-col">
            <span className="text-xs font-bold text-[#263746]">¿Hablamos?</span>
            <span className="text-[10px] text-[#8a7548]">Pregunta a AURI</span>
          </span>
          <span className="ml-1 size-2 rounded-full bg-[#4b9b79]" />
        </button>
      )}
    </>
  );
}
