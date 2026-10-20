import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Box,
  Calculator,
  CheckCircle2,
  Download,
  Gem,
  Layers3,
  Send,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/cursos-diseno-3d")({
  head: () => ({
    meta: [
      { title: "Diseño 3D para Joyería | Taller del Joyero" },
      {
        name: "description",
        content:
          "Explora recursos y herramientas digitales para aprender, practicar y presentar diseños 3D de joyería en Taller del Joyero.",
      },
      { property: "og:title", content: "Diseño 3D para Joyería | Taller del Joyero" },
      {
        property: "og:description",
        content:
          "Recursos de práctica, visualización 3D y herramientas técnicas para estudiantes de diseño de joyería.",
      },
    ],
  }),
  component: CursosDiseno3DPage,
});

const recursos = [
  {
    icon: Box,
    titulo: "AURUM Render",
    descripcion:
      "Visualiza modelos de joyería y explora cómo presentar un diseño con una apariencia más profesional.",
    enlace: "/auth",
    accion: "Explorar AURUM Lab",
  },
  {
    icon: Send,
    titulo: "AURUM Transfer",
    descripcion:
      "Prepara enlaces privados para compartir archivos de diseño y modelos con compañeros o instructores.",
    enlace: "/transfer",
    accion: "Compartir archivos",
  },
  {
    icon: Calculator,
    titulo: "Calculadoras técnicas",
    descripcion:
      "Accede a utilidades para estimar peso 3D, peso de gemas, tallas de anillos y aleaciones.",
    enlace: "/herramientas-publicas",
    accion: "Ver herramientas",
  },
  {
    icon: Layers3,
    titulo: "Biblioteca de práctica",
    descripcion:
      "Organiza tus propios modelos, referencias y materiales de trabajo. Los recursos de clase se publicarán cuando estén autorizados.",
    enlace: "/herramientas-publicas",
    accion: "Explorar recursos",
  },
] as const;

function CursosDiseno3DPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#10110f] text-[#f5f0e7]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(ellipse_at_top,rgba(216,189,123,.17),transparent_68%)]"
      />
      <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-7 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <Link
            to="/herramientas-publicas"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-white/65 transition hover:text-[#e5ca8a]"
          >
            <Gem className="size-5 text-[#d8bd7b]" />
            <span className="font-semibold">Taller del Joyero</span>
          </Link>
          <Link
            to="/auth"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d8bd7b]/35 px-4 text-sm font-medium text-[#e5ca8a] transition hover:bg-[#d8bd7b]/10"
          >
            Entrar al ecosistema <ArrowRight className="size-4" />
          </Link>
        </header>

        <section className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.1fr_.9fr] lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#d8bd7b]/25 bg-[#d8bd7b]/[.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-[#e5ca8a]">
              <Sparkles className="size-3.5" /> Formación y práctica digital
            </p>
            <h1 className="mt-6 max-w-3xl font-display text-4xl italic leading-tight sm:text-6xl">
              Lleva tus ideas de joyería del concepto al <span className="text-[#e5ca8a]">diseño 3D</span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
              Un punto de partida para estudiantes y profesionales que quieren aprender,
              practicar y presentar sus diseños con herramientas digitales pensadas para
              el sector joyero.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#recursos"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d8bd7b] px-5 text-sm font-semibold text-[#17140d] transition hover:bg-[#e5ca8a]"
              >
                Explorar recursos gratuitos <ArrowRight className="size-4" />
              </a>
              <Link
                to="/herramientas-publicas"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 px-5 text-sm font-semibold text-white/80 transition hover:border-[#d8bd7b]/50"
              >
                Ver herramientas
              </Link>
            </div>
            <p className="mt-4 max-w-xl text-xs leading-5 text-white/35">
              Los cursos, fechas y condiciones de inscripción deben confirmarse con la
              instructora. Esta página reúne recursos del ecosistema y no procesa matrículas.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-[#d8bd7b]/[.06] blur-2xl" />
            <div className="relative rounded-[1.75rem] border border-[#d8bd7b]/20 bg-[#181916] p-5 shadow-2xl sm:p-7">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#d8bd7b]">Flujo de aprendizaje</p>
                  <p className="mt-1 text-sm text-white/75">Diseña · Visualiza · Comparte</p>
                </div>
                <Gem className="size-6 text-[#d8bd7b]" />
              </div>
              <div className="mt-5 space-y-3">
                {[
                  { n: "01", title: "Prepara tu modelo", detail: "Trabaja con tu archivo CAD compatible." },
                  { n: "02", title: "Explora la presentación", detail: "Abre AURUM Render desde el ecosistema." },
                  { n: "03", title: "Comparte y revisa", detail: "Utiliza enlaces para intercambiar archivos." },
                ].map((step) => (
                  <div key={step.n} className="flex gap-4 rounded-xl border border-white/[.08] bg-white/[.025] p-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[#d8bd7b]/25 text-xs font-semibold text-[#d8bd7b]">{step.n}</span>
                    <div>
                      <h2 className="text-sm font-semibold">{step.title}</h2>
                      <p className="mt-1 text-xs leading-5 text-white/45">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-2 text-xs text-white/40">
                <CheckCircle2 className="size-4 text-[#d8bd7b]" />
                Recursos complementarios a la formación, no sustituyen al curso.
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="scroll-mt-8 border-t border-white/10 py-12 sm:py-16">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#d8bd7b]">Tu espacio de práctica</p>
            <h2 className="mt-3 font-display text-3xl italic sm:text-4xl">Herramientas útiles para estudiantes de joyería</h2>
            <p className="mt-3 text-sm leading-7 text-white/55">
              Prueba los recursos públicos y descubre otras herramientas que pueden acompañarte
              durante tus prácticas y proyectos personales.
            </p>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {recursos.map(({ icon: Icon, titulo, descripcion, enlace, accion }) => (
              <article key={titulo} className="flex min-h-64 flex-col rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:border-[#d8bd7b]/40 hover:bg-white/[.04]">
                <span className="grid size-11 place-items-center rounded-xl border border-[#d8bd7b]/25 bg-[#d8bd7b]/[.07] text-[#d8bd7b]">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{titulo}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-white/50">{descripcion}</p>
                <Link to={enlace} className="mt-5 inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-[#e5ca8a] hover:text-white">
                  {accion} <ArrowRight className="size-3.5" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-[#d8bd7b]/20 bg-[#d8bd7b]/[.055] p-6 sm:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#d8bd7b]">Siguiente paso</p>
              <h2 className="mt-2 font-display text-2xl italic sm:text-3xl">Empieza a explorar el ecosistema joyero</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Crea tu acceso para conocer los módulos disponibles. Para fechas, precios e
                inscripción a los cursos, consulta directamente los canales oficiales de la instructora.
              </p>
            </div>
            <Link to="/auth" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#d8bd7b] px-5 text-sm font-semibold text-[#17140d] transition hover:bg-[#e5ca8a]">
              Crear cuenta o entrar <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-6 text-xs text-white/35">
          <span>Taller del Joyero · Recursos para la comunidad joyera</span>
          <span className="inline-flex items-center gap-2"><BookOpen className="size-4" /> Aprendizaje y práctica profesional</span>
        </footer>
      </div>
    </main>
  );
}
