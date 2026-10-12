import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  Boxes,
  Calculator,
  Check,
  Gem,
  Layers3,
  Ruler,
  Sparkles,
  Droplets,
  Scale,
  ShieldCheck,
  Workflow,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Taller del Joyero | Herramientas y gestión profesional de joyería" },
      {
        name: "description",
        content:
          "Calculadoras de joyería y herramientas digitales para talleres: aleaciones de oro, peso 3D, gemas, yeso de inversión, tallas y gestión del trabajo.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Taller del Joyero" },
      {
        property: "og:title",
        content: "Taller del Joyero | Tecnología para el oficio joyero",
      },
      {
        property: "og:description",
        content:
          "Calcula, diseña y organiza el trabajo de tu taller con herramientas creadas para el oficio joyero.",
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
    numero: "01",
    titulo: "Aleaciones de oro",
    texto: "Calcula mezclas y cantidades de metales según el quilataje que necesitas.",
  },
  {
    icon: Boxes,
    numero: "02",
    titulo: "Peso y visualización 3D",
    texto: "Explora modelos tridimensionales y estima el peso de tus piezas.",
  },
  {
    icon: Scale,
    numero: "03",
    titulo: "Peso de gemas",
    texto: "Estima quilates a partir de las medidas de tus piedras.",
  },
  {
    icon: Droplets,
    numero: "04",
    titulo: "Yeso de inversión",
    texto: "Calcula las cantidades para preparar moldes de fundición.",
  },
  {
    icon: Ruler,
    numero: "05",
    titulo: "Tallas de anillos",
    texto: "Consulta equivalencias para distintas escalas de tallas.",
  },
  {
    icon: Gem,
    numero: "06",
    titulo: "Catálogo de joyas",
    texto: "Presenta y comparte tus piezas mediante un catálogo digital.",
  },
];

const modulos = [
  { icon: Workflow, titulo: "Pedidos y producción", texto: "Sigue el trabajo desde la solicitud hasta la entrega." },
  { icon: Calculator, titulo: "Cotizaciones y contratos", texto: "Ordena la parte comercial de cada trabajo." },
  { icon: Layers3, titulo: "Inventario y materiales", texto: "Organiza los recursos y procesos de tu taller." },
  { icon: ShieldCheck, titulo: "Espacio de trabajo", texto: "Accede a las funciones habilitadas para tu cuenta." },
];

function LandingPublica() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f4ef] text-[#211d19]">
      <header className="sticky top-0 z-30 border-b border-[#211d1912] bg-[#f7f4ef]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-8 sm:py-4">
          <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Taller del Joyero, inicio">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#211d19] text-[#e0bd76]">
              <Gem className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-base leading-tight sm:text-lg">Taller del Joyero</span>
              <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[.17em] text-[#8b6b36]">Tecnología para joyeros</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 md:flex" aria-label="Navegación principal">
            <a href="#herramientas" className="text-sm text-[#6e655b] transition hover:text-[#211d19]">Herramientas</a>
            <a href="#plataforma" className="text-sm text-[#6e655b] transition hover:text-[#211d19]">Plataforma</a>
            <Link to="/catalogo-publico" className="text-sm text-[#6e655b] transition hover:text-[#211d19]">Catálogos</Link>
          </nav>
          <Link
            to="/auth#herramientas"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#211d19] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#40372d] sm:px-5 sm:py-3 sm:text-sm"
          >
            <span className="hidden xs:inline">Probar herramientas</span><span className="xs:hidden">Probar</span>
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="relative isolate">
        <div className="pointer-events-none absolute -right-32 -top-20 -z-10 size-[28rem] rounded-full bg-[#d9bd84]/25 blur-3xl sm:size-[38rem]" />
        <div className="pointer-events-none absolute -left-40 top-72 -z-10 size-80 rounded-full bg-white/80 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:pb-28 lg:pt-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#8b6b3630] bg-white/70 px-3.5 py-2 text-[9px] font-bold uppercase tracking-[.19em] text-[#8b6b36] sm:text-[10px]">
              <Sparkles className="size-3.5" aria-hidden="true" /> Creado para el oficio joyero
            </p>
            <h1 className="mt-6 max-w-3xl font-display text-[2.65rem] leading-[1.04] tracking-[-.045em] sm:text-6xl lg:text-[4.35rem]">
              Tu taller. Tu oficio. <span className="text-[#9b773d]">Todo mejor conectado.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#6e655b] sm:text-lg sm:leading-8">
              Herramientas técnicas y gestión digital para ayudarte a calcular materiales, visualizar joyas y organizar el trabajo diario de tu taller.
            </p>
            <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
              <Link to="/auth#herramientas" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#211d19] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#211d19]/10 transition hover:-translate-y-0.5 hover:bg-[#40372d]">
                Probar herramientas gratis <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <a href="#plataforma" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#211d1925] bg-white/60 px-6 py-3.5 text-sm font-semibold transition hover:bg-white">
                Explorar la plataforma <ArrowDown className="size-4" aria-hidden="true" />
              </a>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#74695d]">
              <span className="inline-flex items-center gap-2"><Check className="size-3.5 text-[#8b6b36]" /> Herramientas especializadas</span>
              <span className="inline-flex items-center gap-2"><Check className="size-3.5 text-[#8b6b36]" /> Acceso desde el navegador</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-[#e3d2ad]/70 via-white/20 to-[#bca16c]/30 blur-xl" />
            <div className="relative overflow-hidden rounded-[1.8rem] border border-white/80 bg-[#211d19] p-4 shadow-2xl shadow-[#211d19]/15 sm:rounded-[2rem] sm:p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[.2em] text-[#d6b873]">Espacio de trabajo</p>
                  <p className="mt-1 font-display text-xl text-white sm:text-2xl">Taller del Joyero</p>
                </div>
                <span className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/5 text-[#e0bd76]">
                  <Gem className="size-5" aria-hidden="true" />
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4 sm:p-5">
                  <span className="grid size-9 place-items-center rounded-xl bg-[#e0bd76]/15 text-[#e0bd76]"><Calculator className="size-4" /></span>
                  <p className="mt-5 text-sm font-semibold text-white">Cálculos técnicos</p>
                  <p className="mt-1 text-xs leading-5 text-white/55">Aleaciones, pesos y moldes</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4 sm:p-5">
                  <span className="grid size-9 place-items-center rounded-xl bg-[#e0bd76]/15 text-[#e0bd76]"><Boxes className="size-4" /></span>
                  <p className="mt-5 text-sm font-semibold text-white">Modelos 3D</p>
                  <p className="mt-1 text-xs leading-5 text-white/55">Visualización y estimación</p>
                </div>
                <div className="col-span-2 flex items-center gap-4 rounded-2xl bg-[#e0bd76] p-4 text-[#211d19] sm:p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#211d19]/10"><Layers3 className="size-5" /></span>
                  <div className="min-w-0">
                    <p className="font-display text-lg sm:text-xl">Gestión para tu taller</p>
                    <p className="mt-1 text-xs leading-5 text-[#211d19]/70">Pedidos, cotizaciones, contratos y organización del trabajo</p>
                  </div>
                  <ArrowRight className="ml-auto size-5 shrink-0" aria-hidden="true" />
                </div>
              </div>
              <p className="px-1 pb-1 pt-4 text-center text-[10px] tracking-wide text-white/40">Herramientas digitales pensadas para el trabajo joyero</p>
            </div>
            <div className="absolute -bottom-5 -left-2 hidden rounded-2xl border border-[#211d1910] bg-white px-4 py-3 shadow-lg sm:block">
              <p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#8b6b36]">Un solo lugar</p>
              <p className="mt-1 text-sm font-semibold">Del cálculo a la gestión</p>
            </div>
          </div>
        </div>
      </section>

      <section id="herramientas" className="scroll-mt-24 bg-white/75 px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[.23em] text-[#8b6b36]">Empieza por aquí</p>
              <h2 className="mt-3 font-display text-3xl tracking-tight sm:text-5xl">Herramientas que resuelven tareas reales</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#6e655b] sm:text-base">Prueba utilidades especializadas para cálculos y procesos habituales de joyería.</p>
            </div>
            <Link to="/auth#herramientas" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#8b6b36] underline underline-offset-4">
              Ver herramientas disponibles <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3">
            {herramientas.map(({ icon: Icon, numero, titulo, texto }) => (
              <article key={titulo} className="group rounded-3xl border border-[#211d1912] bg-[#f7f4ef] p-5 transition duration-200 hover:-translate-y-1 hover:border-[#b99b61]/50 hover:bg-white hover:shadow-xl hover:shadow-[#211d19]/5 sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-2xl bg-[#8b6b3612] text-[#8b6b36] transition group-hover:bg-[#211d19] group-hover:text-[#e0bd76]"><Icon className="size-5" aria-hidden="true" /></span>
                  <span className="font-mono text-xs text-[#b7aa98]">{numero}</span>
                </div>
                <h3 className="mt-5 font-display text-xl sm:text-2xl">{titulo}</h3>
                <p className="mt-2 min-h-[3.5rem] text-sm leading-6 text-[#6e655b]">{texto}</p>
                <Link to="/auth#herramientas" className="mt-5 inline-flex min-h-9 items-center gap-2 text-xs font-bold text-[#8b6b36]">
                  Probar herramienta <ArrowRight className="size-3.5 transition group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="plataforma" className="scroll-mt-24 px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:gap-16">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.23em] text-[#8b6b36]">Más que calculadoras</p>
            <h2 className="mt-3 font-display text-3xl leading-tight tracking-tight sm:text-5xl">También puedes organizar el trabajo de tu taller.</h2>
            <p className="mt-5 text-sm leading-7 text-[#6e655b] sm:text-base">
              Taller del Joyero reúne herramientas técnicas y módulos de gestión para acompañar distintas etapas del trabajo, según las funciones disponibles en tu cuenta.
            </p>
            <Link to="/auth#crear-taller" className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#211d19] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#40372d]">
              Conocer la plataforma <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {modulos.map(({ icon: Icon, titulo, texto }, index) => (
              <article key={titulo} className="rounded-3xl border border-[#211d1912] bg-white/65 p-5 sm:p-6">
                <span className="grid size-10 place-items-center rounded-xl bg-[#211d1907] text-[#8b6b36]"><Icon className="size-5" aria-hidden="true" /></span>
                <p className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-[#aa9470]">Módulo 0{index + 1}</p>
                <h3 className="mt-2 font-display text-xl">{titulo}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6e655b]">{texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 sm:pb-24">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[1.8rem] bg-[#211d19] p-7 text-white sm:rounded-[2rem] sm:p-12 lg:p-14">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[.23em] text-[#e0bd76]">Tu próximo paso</p>
              <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">Dedica más tiempo al oficio. Simplifica lo demás.</h2>
              <p className="mt-4 text-sm leading-7 text-white/65 sm:text-base">Explora las herramientas públicas y conoce cómo Taller del Joyero puede acompañar el trabajo de tu taller.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <Link to="/auth#herramientas" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#e0bd76] px-6 py-3.5 text-sm font-bold text-[#211d19] transition hover:bg-[#f0d69c]">
                Probar herramientas <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link to="/catalogo-publico" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">
                Explorar catálogos
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#211d1915] px-5 py-7 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs text-[#80766a] sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="font-semibold text-[#51483d]">Taller del Joyero</Link>
          <p>Herramientas digitales para el trabajo joyero.</p>
          <p>© {new Date().getFullYear()} Taller del Joyero</p>
        </div>
      </footer>
    </main>
  );
}
