import { useState } from "react";
import { Bot, X } from "lucide-react";
import { AuriChat } from "./AuriChat";

export function AuriInternoBoton() {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      {abierto ? (
        <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-card p-2 shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[400px] sm:rounded-2xl">
          <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar AURI" className="absolute right-4 top-4 z-10 grid size-8 place-items-center rounded-full bg-card text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
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
