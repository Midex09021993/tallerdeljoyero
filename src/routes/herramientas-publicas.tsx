import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CircleDot,
  Coins,
  Gem,
  Ruler,
  Scale,
  Sparkles,
  FlaskConical,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/herramientas-publicas")({
  head: () => ({
    meta: [
      { title: "Herramientas para joyeros — Aurum Lab" },
      {
        name: "description",
        content:
          "Calculadoras técnicas y herramientas gratuitas para el trabajo diario de joyería.",
      },
    ],
  }),
  component: HerramientasPublicasPage,
});


const herramientas = [
  {
    id: "yeso" as const,
    ruta: "yeso-agua" as const,
    categoria: "Calcular y preparar",
    titulo: "¿Cuánto yeso y agua debo preparar?",
    descripcion: "Prepara la mezcla de revestimiento con las proporciones que necesitas.",
    Icono: FlaskConical,
  },
  {
    id: "oro" as const,
    ruta: "aleacion-oro" as const,
    categoria: "Calcular y preparar",
    titulo: "¿Cuánto metal necesito para mi aleación?",
    descripcion: "Calcula las cantidades para ajustar la ley del oro que buscas.",
    Icono: Coins,
  },
  {
    id: "tallas" as const,
    ruta: "tallas-anillos" as const,
    categoria: "Calcular y preparar",
    titulo: "¿A qué talla equivale este anillo?",
    descripcion: "Consulta equivalencias entre distintas escalas de tallas.",
    Icono: Ruler,
  },
  {
    id: "peso" as const,
    ruta: "peso-joya-3d" as const,
    categoria: "Diseñar y visualizar",
    titulo: "¿Cuánto pesará mi modelo 3D?",
    descripcion: "Carga un modelo compatible y estima su peso antes de producirlo.",
    Icono: Scale,
  },
  {
    id: "gemas" as const,
    ruta: "peso-gemas" as const,
    categoria: "Calcular y preparar",
    titulo: "¿Cuánto puede pesar esta gema?",
    descripcion: "Obtén una estimación de peso para gemas de joyería.",
    Icono: CircleDot,
  },
  {
    id: "stl" as const,
    ruta: "generador-stl-ia" as const,
    categoria: "Diseñar y visualizar",
    titulo: "¿Cómo convierto una imagen en un modelo 3D?",
    descripcion: "Genera un modelo 3D desde una imagen con procesamiento local y descarga el STL.",
    Icono: Sparkles,
  },
];

function HerramientasPublicasPage() {
  const [busqueda, setBusqueda] = useState("");
  const termino = busqueda.trim().toLocaleLowerCase("es");
  const herramientasFiltradas = herramientas.filter((herramienta) =>
    !termino || (herramienta.titulo + " " + herramienta.descripcion + " " + herramienta.categoria + " " + herramienta.id).toLocaleLowerCase("es").includes(termino)
  );
  const mostrarRender = !termino || "mostrar diseño cliente joya render aurum".includes(termino) || "aurum render".includes(termino);
  const mostrarTransfer = !termino || "compartir enviar archivos stl pesados transferencia aurum transfer".includes(termino) || "aurum transfer".includes(termino);
  return (
    <main className="min-h-screen bg-[#10110f] text-[#f5f0e7]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(216,189,123,.12),transparent_68%)]" />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-7 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d8bd7b]/20 pb-5">
          <Link
            to="/auth"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-white/65 transition hover:text-[#e5ca8a]"
          >
            <ArrowLeft className="size-4" /> Volver a Aurum Lab
          </Link>
          <div className="flex items-center gap-2 text-[#d8bd7b]">
            <Gem className="size-5" />
            <span className="text-xs font-semibold uppercase tracking-[.22em]">Aurum Lab</span>
          </div>
        </header>

        <section className="py-10 sm:py-14">
          <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#d8bd7b]">
            El arte de crear. La inteligencia de gestionar.
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl italic leading-tight sm:text-5xl">
            ¿Qué necesitas hacer hoy?
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
            Encuentra una solución práctica para tu taller. Elige la tarea que quieres resolver y empieza directamente.
          </p>
        </section>

        <section aria-label="Buscar una tarea" className="mb-8">
          <label htmlFor="buscar-tarea" className="mb-2 block text-sm font-medium text-white/75">¿Qué quieres resolver?</label>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.035] px-4 transition focus-within:border-[#d8bd7b]/60">
            <Search className="size-4 shrink-0 text-[#d8bd7b]" />
            <input id="buscar-tarea" type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Busca oro, peso, yeso, STL..." className="min-h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35" />
          </div>
        </section>
        <section aria-label="Herramientas para resolver tareas del taller" className="space-y-10">
          {(["Calcular y preparar", "Diseñar y visualizar"] as const).map((categoria) => {
            const resultados = herramientasFiltradas.filter((herramienta) => herramienta.categoria === categoria);
            if (!resultados.length) return null;
            return (
            <div key={categoria}>
              <h2 className="mb-4 text-lg font-semibold text-white sm:text-xl">{categoria}</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {resultados.map(({ id, ruta, titulo, descripcion, Icono }) => (
                  <Link
                    key={id}
                    to="/herramientas/$herramienta"
                    params={{ herramienta: ruta }}
                    data-analytics-tool-id={id}
                    data-analytics-tool-name={titulo}
                    className="group flex min-h-48 flex-col rounded-2xl border border-white/10 bg-white/[.02] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#d8bd7b]/55 hover:bg-white/[.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8bd7b]"
                  >
                    <span className="grid size-11 place-items-center rounded-xl border border-[#d8bd7b]/25 bg-[#d8bd7b]/[.08] text-[#d8bd7b]"><Icono className="size-5" /></span>
                    <span className="mt-4 text-base font-semibold">{titulo}</span>
                    <span className="mt-2 flex-1 text-sm leading-6 text-white/55">{descripcion}</span>
                    <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#d8bd7b]">Resolver esta tarea <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
                  </Link>
                ))}
              </div>
            </div>
            );
          })}
          {(!termino || mostrarRender || mostrarTransfer) && <div>
            <h2 className="mb-4 text-lg font-semibold text-white sm:text-xl">Compartir y coordinar</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {mostrarRender && <Link
            to="/auth"
            className="group flex min-h-52 flex-col rounded-2xl border border-white/10 bg-white/[.02] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#d8bd7b]/55 hover:bg-white/[.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8bd7b]"
          >
            <span className="grid size-11 place-items-center rounded-xl border border-[#d8bd7b]/25 bg-[#d8bd7b]/[.08] text-[#d8bd7b]"><Gem className="size-5" /></span>
            <span className="mt-4 text-base font-semibold">¿Cómo puedo mostrar mi diseño a un cliente?</span>
            <span className="mt-2 flex-1 text-sm leading-6 text-white/70">Abre Aurum Render para visualizar y presentar tu joya en 3D.</span>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#d8bd7b]">Abrir visor 3D <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
          </Link>}
          {mostrarTransfer && <Link
            to="/transfer"
            className="group flex min-h-52 flex-col rounded-2xl border border-white/10 bg-white/[.02] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#d8bd7b]/55 hover:bg-white/[.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8bd7b]"
          >
            <span className="grid size-11 place-items-center rounded-xl border border-[#d8bd7b]/25 bg-[#d8bd7b]/[.08] text-[#d8bd7b]"><Sparkles className="size-5" /></span>
            <span className="mt-4 text-base font-semibold">¿Cómo comparto un archivo 3D pesado?</span>
            <span className="mt-2 flex-1 text-sm leading-6 text-white/55">Prepara un enlace privado para enviar modelos y archivos de fabricación.</span>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#d8bd7b]">Compartir archivo <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
          </Link>}
            </div>
          </div>}
          {termino && herramientasFiltradas.length === 0 && !mostrarRender && !mostrarTransfer && <p className="rounded-xl border border-white/10 p-5 text-sm text-white/60">No encontramos una tarea con “{busqueda}”. Prueba con otra palabra, como oro, peso, yeso o STL.</p>}
        </section>

        <footer className="mt-12 border-t border-white/10 py-6 text-xs text-white/35">
          Aurum Lab · Herramientas técnicas para el sector joyero
        </footer>
      </div>
    </main>
  );
}
