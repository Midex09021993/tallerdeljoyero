import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Clock3, Gem } from "lucide-react";
import { SolicitarDemo } from "@/components/SolicitarDemo";

export const Route = createFileRoute("/agenda-demo")({
  head: () => ({
    meta: [
      { title: "Agenda tu demostración | AURUM LAB" },
      { name: "description", content: "Reserva una demostración online personalizada de AURUM LAB y elige el día y horario disponible para conocer la plataforma." },
    ],
  }),
  component: AgendaDemoPublica,
});

function AgendaDemoPublica() {
  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-10 text-[#17232d] sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <header className="rounded-3xl border border-[#e8d49a] bg-white p-6 shadow-sm sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#eadca8] bg-[#fff9df] px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-[#876500]"><Gem className="size-4" /> AURUM LAB · DEMOSTRACIÓN</span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Conoce AURUM LAB en una sesión personalizada</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Elige el día y horario que mejor se adapte a ti. Te mostraremos las herramientas de la plataforma según las necesidades de tu taller.</p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-xl bg-[#faf8f2] px-3 py-2"><CalendarDays className="size-4 text-[#987400]" /> Horarios disponibles actualizados</span>
            <span className="inline-flex items-center gap-2 rounded-xl bg-[#faf8f2] px-3 py-2"><Clock3 className="size-4 text-[#987400]" /> 20–30 minutos · Online</span>
          </div>
          <div className="mt-7">
            <SolicitarDemo abrirAlCargar origen="agenda-demo" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#f8c928] px-6 py-3 text-sm font-bold text-[#17232d] shadow-sm transition hover:bg-[#ffdf65] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19] focus-visible:ring-offset-2" />
          </div>
          <p className="mt-4 text-xs text-slate-500">Selecciona una fecha disponible, elige una hora y completa tus datos para reservar.</p>
        </header>
      </div>
    </main>
  );
}
