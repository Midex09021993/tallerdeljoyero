import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Boxes, Calculator, Gem, Ruler, Sparkles, Droplets, Scale } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Taller del Joyero | Herramientas y gestión profesional de joyería" },
      {
        name: "description",
        content:
          "Herramientas para joyeros: cálculo de aleaciones de oro, peso de joyas 3D, gemas, yeso de inversión y tallas de anillos. Gestión profesional para talleres de joyería.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Taller del Joyero" },
      {
        property: "og:title",
        content: "Taller del Joyero | Herramientas para profesionales de la joyería",
      },
      {
        property: "og:description",
        content:
          "Calculadoras y herramientas para el trabajo diario del joyero: aleaciones, peso 3D, gemas, moldes y tallas.",
      },
      { property: "og:url", content: "https://www.tallerdeljoyero.com/" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://www.tallerdeljoyero.com/" }],
  }),
  component: LandingPublica,
});

const herramientas = [
  {
    icon: Calculator,
    titulo: "Aleaciones de oro",
    texto: "Planifica mezclas de oro por quilataje y calcula los metales necesarios para tu aleación.",
  },
  {
    icon: Boxes,
    titulo: "Peso y visualización 3D",
    texto: "Prepara estimaciones de peso para piezas de joyería y trabaja con modelos tridimensionales.",
  },
  {
    icon: Scale,
    titulo: "Peso de gemas",
    texto: "Estima quilates a partir de medidas y consulta equivalencias de peso de piedras.",
  },
  {
    icon: Droplets,
    titulo: "Yeso de inversión",
    texto: "Calcula cantidades de agua y revestimiento para preparar moldes de fundición.",
  },
  {
    icon: Ruler,
    titulo: "Tallas de anillos",
    texto: "Consulta equivalencias de tallas para trabajar con distintas escalas de medida.",
  },
  {
    icon: Gem,
    titulo: "Diseño y catálogo de joyas",
    texto: "Organiza la presentación de tus piezas y comparte catálogos digitales de tu taller.",
  },
];

function LandingPublica() {
  return (
    <main className="min-h-screen bg-[#f7f4ef] text-[#211d19]">
      <header className="border-b border-[#211d1915] bg-[#f7f4ef]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="Taller del Joyero, inicio">
            <span className="grid size-10 place-items-center rounded-xl bg-[#211d19] text-[#e0bd76]">
              <Gem className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-display text-lg leading-tight">Taller del Joyero</span>
              <span className="block text-[9px] font-semibold uppercase tracking-[.2em] text-[#8b6b36]">Herramientas profesionales</span>
            </span>
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-full bg-[#211d19] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#40372d]"
          >
            Probar herramientas <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-28 -top-28 size-96 rounded-full bg-[#d9bd84]/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.1fr_.9fr] lg:py-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#8b6b3630] bg-white/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#8b6b36]">
              <Sparkles className="size-3.5" aria-hidden="true" /> Para el oficio joyero
            </p>
            <h1 className="mt-6 max-w-3xl font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Herramientas precisas para crear mejores joyas.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#6e655b] sm:text-lg">
              Calcula aleaciones de oro, estima el peso de piezas y gemas, prepara moldes y organiza el trabajo de tu taller desde un solo lugar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth#herramientas" className="inline-flex items-center gap-2 rounded-full bg-[#211d19] px-6 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5">
                Probar herramientas <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <a href="#herramientas" className="inline-flex items-center rounded-full border border-[#211d1930] bg-white/60 px-6 py-4 text-sm font-semibold transition hover:bg-white">
                Explorar herramientas
              </a>
            </div>
            <p className="mt-5 text-xs leading-6 text-[#80766a]">
              Diseñado para apoyar el trabajo técnico de joyeros, orfebres y talleres de fabricación.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[28px] bg-[#211d19] p-6 text-white shadow-xl sm:translate-y-7">
              <Calculator className="size-7 text-[#e0bd76]" aria-hidden="true" />
              <h2 className="mt-8 font-display text-2xl">Cálculos de taller</h2>
              <p className="mt-2 text-sm leading-6 text-white/65">Aleaciones, pesos, proporciones y medidas con una experiencia clara.</p>
            </div>
            <div className="rounded-[28px] border border-[#211d1915] bg-white/75 p-6 sm:mt-12">
              <Gem className="size-7 text-[#8b6b36]" aria-hidden="true" />
              <h2 className="mt-8 font-display text-2xl">Diseño y presentación</h2>
              <p className="mt-2 text-sm leading-6 text-[#6e655b]">Herramientas digitales para acompañar el desarrollo y la presentación de joyas.</p>
            </div>
            <div className="rounded-[28px] border border-[#211d1915] bg-white/75 p-6 sm:col-span-2">
              <div className="flex items-start gap-4">
                <Boxes className="mt-1 size-7 shrink-0 text-[#8b6b36]" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-2xl">Una plataforma para el oficio joyero</h2>
                  <p className="mt-2 text-sm leading-6 text-[#6e655b]">Reúne herramientas técnicas y gestión de taller para ayudarte a trabajar con más orden y criterio.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="herramientas" className="bg-white/70 px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#8b6b36]">Herramientas para joyeros</p>
            <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Resuelve los cálculos habituales de tu taller</h2>
            <p className="mt-4 text-sm leading-7 text-[#6e655b]">
              Desde preparar una aleación hasta estimar el peso de una gema, encuentra herramientas pensadas para las tareas habituales de la joyería.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {herramientas.map(({ icon: Icon, titulo, texto }) => (
              <article key={titulo} className="rounded-3xl border border-[#211d1912] bg-[#f7f4ef] p-6 transition hover:-translate-y-1 hover:shadow-lg">
                <span className="grid size-11 place-items-center rounded-2xl bg-[#8b6b3612] text-[#8b6b36]">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-display text-2xl">{titulo}</h3>
                <p className="mt-3 text-sm leading-7 text-[#6e655b]">{texto}</p>
                <Link to="/auth#herramientas" className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[#8b6b36] underline underline-offset-4">Probar herramienta <ArrowRight className="size-3.5" aria-hidden="true" /></Link>
              </article>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-3xl bg-[#211d19] p-7 text-white sm:flex-row sm:items-center sm:p-9">
            <div>
              <h2 className="font-display text-3xl">Lleva tus procesos a un solo lugar</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Ingresa a Taller del Joyero para conocer las herramientas disponibles para tu cuenta y tu taller.</p>
            </div>
            <Link to="/auth#herramientas" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#e0bd76] px-5 py-3 text-xs font-bold text-[#211d19]">
              Probar herramientas <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl">¿Para quién es Taller del Joyero?</h2>
            <p className="mt-3 text-sm leading-7 text-[#6e655b]">
              Para joyeros, orfebres, diseñadores y equipos de taller que necesitan apoyo en cálculos de materiales, fabricación y organización de sus operaciones.
            </p>
          </div>
          <div>
            <h2 className="font-display text-3xl">Catálogos digitales para joyerías</h2>
            <p className="mt-3 text-sm leading-7 text-[#6e655b]">
              Cada taller puede compartir sus piezas mediante enlaces de catálogo público cuando esa función está habilitada.
            </p>
            <Link to="/catalogo-publico" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#8b6b36] underline underline-offset-4">
              Conocer los catálogos digitales <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#211d1915] px-5 py-7 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-xs text-[#80766a] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Taller del Joyero</p>
          <p>Herramientas digitales para el trabajo joyero.</p>
        </div>
      </footer>
    </main>
  );
}
