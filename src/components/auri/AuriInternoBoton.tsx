import { useState } from "react";
import { Bot, X } from "lucide-react";
import { AuriChat } from "./AuriChat";

export function AuriInternoBoton() {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      {abierto ? (
        <div className="fixed inset-0 z-50 flex h-[100dvh] w-screen flex-col overflow-hidden bg-white pt-[env(safe-area-inset-top)] shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[min(680px,85dvh)] sm:max-h-[85dvh] sm:w-[400px] sm:rounded-2xl sm:border sm:border-[#e8dfcc] sm:bg-card sm:pt-0">
          <button
            type="button"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar AURI"
            className="absolute right-3 top-[calc(env(safe-area-inset-top)+10px)] z-30 grid size-9 place-items-center rounded-full border border-[#e8dfcc] bg-white/95 text-[#69737b] shadow-sm transition hover:border-[#c7a65b] hover:text-[#96732e] sm:right-3 sm:top-3"
          >
            <X className="size-4" />
          </button>
          <AuriChat modo="interno" onContact={() => setAbierto(false)} />
        </div>
      ) : (
        <button type="button" onClick={() => setAbierto(true)} aria-label="Abrir AURI" className="fixed bottom-20 right-4 z-40 grid size-14 place-items-center rounded-full border border-gold bg-card text-gold shadow-card transition hover:scale-105 lg:bottom-6 lg:right-6">
          <Bot className="size-6" />
        </button>
      )}
    </>
  );
}
