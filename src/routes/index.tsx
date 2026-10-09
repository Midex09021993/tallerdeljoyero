import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Boxes,
  Calculator,
  CheckCircle2,
  Gem,
  Layers3,
  LockKeyhole,
  PackageCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { HerramientasFlotantes } from "@/components/HerramientasFlotantes";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aurum Lab | Tecnología para talleres de joyería" },
      {
        name: "description",
        content:
          "Herramientas digitales, gestión de talleres, producción y catálogo de joyas en una plataforma creada para el sector joyero.",
      },
      { property: "og:title", content: "Aurum Lab | Tecnología para joyería" },
      {
        property: "og:description",
        content:
          "Calcula, diseña, organiza y conecta tu taller con las herramientas digitales de Aurum Lab.",
      },
    ],
  }),
  component: LandingPublica,
});

const herramientas = [
  {
    icon: Calculator,
    title: "Calculadoras para joyeros",
    text: "Resuelve cálculos de taller con herramientas prácticas para tu trabajo diario.",
  },
  {
    icon: Gem,
    title: "Visualización 3D",
    text: "Explora AURUM Render y presenta tus diseños de joyería.",
  },
  {
    icon: PackageCheck,
    title: "Catálogo digital",
    text: "Publica tus piezas en un escaparate propio y compártelo con tus clientes.",
  },
];

const pasos = [
  {
    numero: "01",
    title: "Explora las herramientas",
    text: "Empieza con utilidades pensadas para el trabajo real del sector joyero.",
  },
  {
    numero: "02",
    title: "Crea el espacio de tu taller",
    text: "Registra tu taller cuando quieras organizar clientes, pedidos y producción.",
  },
  {
    numero: "03",
    title: "Conecta tu trabajo",
    text: "Avanza hacia un flujo de trabajo organizado según las necesidades de tu taller.",
  },
];

function LandingPublica() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#08090b] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[680px] bg-[radial-gradient(ellipse_at_50%_-15%,rgba(212,175,55,.19),transparent_60%)]" />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="Aurum Lab, inicio">
          <span className="grid size-10 place-items-center rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10">
            <Gem className="size-5 text-[#d4af37]" />
          </span>
          <span>
            <span className="block text-sm font-bold tracking-[.18em]">AURUM LAB</span>
            <span className="mt-0.5 block text-[9px] uppercase tracking-[.22em] text-white/40">Tecnología para joyería</span>
          </span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link to="/catalogo-publico" className="hidden text-sm text-white/65 transition hover:text-[#d4af37] sm:inline-flex">
            Catálogo digital
          </Link>
          <Link to="/auth" className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-xs font-semibold transition hover:border-[#d4af37]/60 hover:text-[#d4af37]">
            Acceso al ERP <LockKeyhole className="size-3.5" />
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 md:grid-cols-[1.05fr_.95fr] md:pb-28 md:pt-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/25 bg-[#d4af37]/[.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-[#e4c66a]">
            <Sparkles className="size-3.5" /> Un ecosistema para el sector joyero
          </div>
          <h1 className="mt-7 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Tu taller merece trabajar con <span className="text-[#d4af37]">más precisión.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/60 sm:text-lg sm:leading-8">
            Herramientas digitales, gestión comercial, producción y catálogo de joyas en un mismo ecosistema. Empieza con utilidades gratuitas y crece a tu ritmo.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/auth" hash="herramientas" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-5 py-3.5 text-sm font-bold text-[#101010] transition hover:-translate-y-0.5 hover:bg-[#e7c75f]">
              Explorar herramientas gratuitas <ArrowRight className="size-4" />
            </Link>
            <Link to="/auth" className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-5 py-3.5 text-sm font-semibold text-white/85 transition hover:border-[#d4af37]/50 hover:text-[#e4c66a]">
              Crear mi taller
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/45">
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-[#d4af37]" /> Diseñado para el sector joyero</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-[#d4af37]" /> Empieza por lo que necesitas</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-5 rounded-[32px] bg-[#d4af37]/[.06] blur-2xl" />
          <div className="relative rounded-[28px] border border-white/10 bg-[#111315]/95 p-5 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <p className="text-[10px] uppercase tracking-[.2em] text-[#d4af37]">Aurum Lab</p>
                <h2 className="mt-2 text-xl font-semibold">Todo conectado, a tu manera</h2>
              </div>
              <span className="grid size-11 place-items-center rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/10"><Layers3 className="size-5 text-[#d4af37]" /></span>
            </div>
            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-4 rounded-2xl border border-white/[.07] bg-white/[.025] p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#d4af37]/10"><Calculator className="size-5 text-[#d4af37]" /></span>
                <div><p className="text-sm font-semibold">Herramientas de taller</p><p className="mt-1 text-xs leading-5 text-white/45">Cálculos útiles para el trabajo cotidiano</p></div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-white/[.07] bg-white/[.025] p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#d4af37]/10"><Boxes className="size-5 text-[#d4af37]" /></span>
                <div><p className="text-sm font-semibold">Gestión y producción</p><p className="mt-1 text-xs leading-5 text-white/45">Clientes, pedidos y seguimiento de fabricación</p></div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-white/[.07] bg-white/[.025] p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#d4af37]/10"><Gem className="size-5 text-[#d4af37]" /></span>
                <div><p className="text-sm font-semibold">Diseño y catálogo digital</p><p className="mt-1 text-xs leading-5 text-white/45">Presenta tus piezas y comparte tu trabajo</p></div>
              </div>
            </div>
            <p className="mt-5 text-center text-[10px] leading-5 text-white/35">Una plataforma adaptable a profesionales independientes y talleres de distintos tamaños.</p>
          </div>
        </div>
      </section>

      <section className="relative border-y border-white/[.07] bg-white/[.018]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-20">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#d4af37]">Empieza por lo útil</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Herramientas creadas para tu oficio.</h2>
            <p className="mt-4 text-sm leading-7 text-white/55">Prueba las utilidades disponibles antes de decidir qué parte de la plataforma necesitas para tu taller.</p>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {herramientas.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-2xl border border-white/10 bg-[#101214] p-6 transition hover:-translate-y-1 hover:border-[#d4af37]/35">
                  <span className="grid size-11 place-items-center rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/[.08]"><Icon className="size-5 text-[#d4af37]" /></span>
                  <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 min-h-[3rem] text-sm leading-6 text-white/50">{item.text}</p>
                  <Link to={item.title === "Catálogo digital" ? "/catalogo-publico" : item.title === "Visualización 3D" ? "/aurum-render-public" : "/herramientas-gratuitas"} className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#e4c66a] hover:text-white">
                    Explorar <ArrowRight className="size-3.5" />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-20">
        <div className="grid gap-10 md:grid-cols-[.8fr_1.2fr] md:items-start">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#d4af37]">Un camino sencillo</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Crece a tu ritmo.</h2>
            <p className="mt-4 text-sm leading-7 text-white/55">No todos los talleres trabajan igual. Aurum Lab busca acompañar tanto al profesional independiente como a los equipos con áreas especializadas.</p>
            <Link to="/auth" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-[#101010] transition hover:bg-[#e4c66a]">Conocer la plataforma <ArrowRight className="size-4" /></Link>
          </div>
          <div className="space-y-3">
            {pasos.map((paso) => (
              <div key={paso.numero} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
                <span className="pt-0.5 text-sm font-bold tracking-widest text-[#d4af37]">{paso.numero}</span>
                <div><h3 className="font-semibold">{paso.title}</h3><p className="mt-2 text-sm leading-6 text-white/50">{paso.text}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#d4af37]/15 bg-[#d4af37]/[.055]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/10"><UsersRound className="size-5 text-[#d4af37]" /></span>
            <div><h2 className="text-xl font-semibold">Tu próximo paso empieza aquí.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Explora las herramientas o crea el espacio digital de tu taller cuando estés listo.</p></div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/auth" hash="herramientas" className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold hover:border-[#d4af37]/50">Probar herramientas</Link>
            <Link to="/auth" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#d4af37] px-5 py-3 text-sm font-bold text-[#101010] hover:bg-[#e7c75f]">Solicitar acceso <ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-xs text-white/35 sm:px-8 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} Aurum Lab · Tecnología para el sector joyero</p>
        <div className="flex flex-wrap gap-5">
          <Link to="/catalogo-publico" className="hover:text-[#d4af37]">Catálogo digital</Link>
          <Link to="/transfer" className="hover:text-[#d4af37]">AURUM Transfer</Link>
          <Link to="/auth" className="hover:text-[#d4af37]">Acceso al ERP</Link>
        </div>
      </footer>
      <HerramientasFlotantes />
    </main>
  );
}
