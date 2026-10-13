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
    titulo: "Yeso / Agua",
    descripcion: "Calcula proporciones para preparar mezclas de revestimiento.",
    Icono: FlaskConical,
  },
  {
    id: "oro" as const,
    ruta: "aleacion-oro" as const,
    titulo: "Aleación de oro",
    descripcion: "Calcula los metales necesarios para obtener la ley deseada.",
    Icono: Coins,
  },
  {
    id: "tallas" as const,
    ruta: "tallas-anillos" as const,
    titulo: "Conversor de tallas",
    descripcion: "Consulta equivalencias entre escalas de tallas de anillos.",
    Icono: Ruler,
  },
  {
    id: "peso" as const,
    ruta: "peso-joya-3d" as const,
    titulo: "Visualizador y peso 3D",
    descripcion: "Carga un modelo compatible y consulta su estimación de peso.",
    Icono: Scale,
  },
  {
    id: "gemas" as const,
    ruta: "peso-gemas" as const,
    titulo: "Peso de gemas",
    descripcion: "Calcula estimaciones de peso para gemas de joyería.",
    Icono: CircleDot,
  },
  {
    id: "stl" as const,
    ruta: "generador-stl-ia" as const,
    titulo: "Generador STL con IA",
    descripcion: "Reconstruye un modelo 3D desde una imagen con procesamiento local y descarga STL.",
    Icono: Sparkles,
  },
];

function HerramientasPublicasPage() {
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
            Recursos técnicos para joyeros
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl italic leading-tight sm:text-5xl">
            Herramientas para el trabajo real del taller
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
            Calcula, convierte y visualiza desde un solo lugar. Selecciona una herramienta
            para abrirla sin salir de este catálogo.
          </p>
        </section>

        <section aria-label="Catálogo de herramientas" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {herramientas.map(({ id, ruta, titulo, descripcion, Icono }) => (
            <Link
              key={id}
              to="/herramientas/$herramienta"
              params={{ herramienta: ruta }}
              className="group flex min-h-52 flex-col rounded-2xl border border-white/10 bg-white/[.02] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#d8bd7b]/55 hover:bg-white/[.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8bd7b]"
            >
              <span className="grid size-11 place-items-center rounded-xl border border-[#d8bd7b]/25 bg-[#d8bd7b]/[.08] text-[#d8bd7b]"><Icono className="size-5" /></span>
              <span className="mt-4 text-base font-semibold">{titulo}</span>
              <span className="mt-2 flex-1 text-sm leading-6 text-white/55">{descripcion}</span>
              <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#d8bd7b]">Abrir herramienta <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
            </Link>
          ))}
          <Link
            to="/aurum-render-public"
            className="group flex min-h-52 flex-col rounded-2xl border border-white/10 bg-white/[.02] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#d8bd7b]/55 hover:bg-white/[.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8bd7b]"
          >
            <span className="grid size-11 place-items-center rounded-xl border border-[#d8bd7b]/25 bg-[#d8bd7b]/[.08] text-[#d8bd7b]"><Gem className="size-5" /></span>
            <span className="mt-4 text-base font-semibold">AURUM Render</span>
            <span className="mt-2 flex-1 text-sm leading-6 text-white/55">Explora tus diseños 3D con materiales y ambientes de presentación.</span>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#d8bd7b]">Abrir estudio 3D <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
          </Link>
          <Link
            to="/transfer"
            className="group flex min-h-52 flex-col rounded-2xl border border-white/10 bg-white/[.02] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#d8bd7b]/55 hover:bg-white/[.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8bd7b]"
          >
            <span className="grid size-11 place-items-center rounded-xl border border-[#d8bd7b]/25 bg-[#d8bd7b]/[.08] text-[#d8bd7b]"><Sparkles className="size-5" /></span>
            <span className="mt-4 text-base font-semibold">AURUM Transfer</span>
            <span className="mt-2 flex-1 text-sm leading-6 text-white/55">Prepara un enlace privado para compartir modelos y archivos de fabricación.</span>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#d8bd7b]">Abrir transferencia <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
          </Link>
        </section>

        <footer className="mt-12 border-t border-white/10 py-6 text-xs text-white/35">
          Aurum Lab · Herramientas técnicas para el sector joyero
        </footer>
      </div>
    </main>
  );
}
