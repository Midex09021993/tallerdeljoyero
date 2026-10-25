import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Boxes, Calculator, Cloud, Gem, Layers3, Sparkles, UsersRound } from "lucide-react";
import heroJoyeria from "@/assets/diseno-corona.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AURUM LAB | Herramientas y gestión digital para joyeros" },
      {
        name: "description",
        content:
          "Descubre AURUM LAB: herramientas gratuitas para joyeros, visor 3D, gestión del taller, Mi Nube y catálogo digital. Empieza con una herramienta y haz crecer tu taller.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "AURUM LAB — Tecnología para el taller de joyería" },
      {
        property: "og:description",
        content: "Calcula, diseña, organiza y presenta tus joyas con herramientas digitales creadas para joyeros.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.tallerdeljoyero.com/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://www.tallerdeljoyero.com/" }],
  }),
  component: InicioPublico,
});

const soluciones = [
  {
    icon: Calculator,
    titulo: "Herramientas gratuitas",
    texto: "Calcula aleaciones, peso de gemas, tallas y materiales para preparar tus trabajos.",
    enlace: "/herramientas-publicas" as const,
    accion: "Explorar herramientas",
  },
  {
    icon: Gem,
    titulo: "Aurum Render y visor 3D",
    texto: "Visualiza tus diseños y presenta tus piezas con una experiencia digital pensada para joyería.",
    enlace: "/aurum-render-public" as const,
    accion: "Abrir visor 3D",
  },
  {
    icon: Cloud,
    titulo: "Mi Nube",
    texto: "Organiza tus archivos de trabajo y ten tus recursos más a mano desde la plataforma.",
    enlace: "/auth" as const,
    accion: "Conocer la plataforma",
  },
  {
    icon: Layers3,
    titulo: "Catálogo digital",
    texto: "Ordena tus piezas y prepara una presentación más clara para tus clientes.",
    enlace: "/catalogo" as const,
    accion: "Ver catálogo",
  },
];

function InicioPublico() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#10110f] text-[#f5f0e7]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(ellipse_at_top,rgba(216,189,123,.16),transparent_68%)]" />
      <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-7 lg:px-10">
        <Link to="/" className="flex items-center gap-3" aria-label="AURUM LAB, inicio">
          <span className="grid size-10 place-items-center rounded-xl border border-[#d8bd7b]/30 bg-[#d8bd7b]/[.08] text-[#d8bd7b]"><Gem className="size-5" /></span>
          <span>
            <span className="block text-sm font-semibold tracking-[.2em] text-[#e6ce95]">AURUM LAB</span>
            <span className="mt-0.5 block text-[10px] tracking-wide text-white/45">Tecnología para joyeros</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Navegación principal">
          <Link to="/herramientas-publicas" className="hidden min-h-10 items-center rounded-lg px-3 text-sm text-white/70 transition hover:text-[#e6ce95] sm:inline-flex">Herramientas gratuitas</Link>
          <Link to="/auth" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#d8bd7b]/45 px-4 text-xs font-semibold text-[#f0dba8] transition hover:bg-[#d8bd7b]/10 sm:text-sm">Ingresar <ArrowRight className="size-4" /></Link>
        </nav>
      </header>

      <section className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:px-7 sm:pb-20 sm:pt-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-14 lg:px-10 lg:pb-24">
        <div className="relative z-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#d8bd7b]/25 bg-[#d8bd7b]/[.06] px-3 py-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#e6ce95]"><Sparkles className="size-3.5" /> El taller de joyería, conectado</p>
          <h1 className="mt-6 max-w-2xl font-display text-4xl leading-[1.08] sm:text-5xl lg:text-6xl">Tu talento crea joyas. <span className="text-[#d8bd7b]">AURUM LAB impulsa tu taller.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/65 sm:text-lg sm:leading-8">Herramientas técnicas, visualización 3D y recursos digitales para ayudarte a calcular, organizar y presentar tu trabajo joyero.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/herramientas-publicas" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#d8bd7b] px-5 py-3 text-sm font-bold text-[#211c12] transition hover:-translate-y-0.5 hover:brightness-105">Probar herramientas gratis <ArrowRight className="size-4" /></Link>
            <Link to="/auth" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-[#d8bd7b]/45 hover:text-[#e6ce95]">Conocer AURUM LAB</Link>
          </div>
          <p className="mt-4 text-xs text-white/40">Empieza por una herramienta. Sin necesidad de registrarte para explorar las herramientas públicas.</p>
        </div>
        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-4 rounded-[2rem] bg-[#d8bd7b]/[.07] blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-[#d8bd7b]/20 bg-[#191a17] p-2 shadow-2xl shadow-black/30">
            <img src={heroJoyeria} alt="Diseño ornamental de joyería que representa el trabajo creativo de un taller joyero" className="aspect-[4/3] w-full rounded-xl object-cover object-center" fetchPriority="high" />
            <div className="flex items-center justify-between gap-3 px-3 py-4 sm:px-4">
              <div>
                <p className="text-sm font-semibold">Diseño, precisión y oficio</p>
                <p className="mt-1 text-xs text-white/45">Una plataforma creada alrededor del trabajo joyero</p>
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#d8bd7b]/25 text-[#d8bd7b]"><Boxes className="size-5" /></span>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-y border-white/[.07] bg-white/[.018]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-7 sm:py-16 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#d8bd7b]">Un ecosistema para tu oficio</p>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">Soluciones prácticas para cada etapa de tu trabajo</h2>
            <p className="mt-3 text-sm leading-6 text-white/55 sm:text-base">Desde una cuenta rápida hasta la presentación de una pieza, encuentra el recurso que necesitas y avanza a tu ritmo.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {soluciones.map(({ icon: Icono, titulo, texto, enlace, accion }) => (
              <article key={titulo} className="group flex min-h-56 flex-col rounded-2xl border border-white/10 bg-[#171815] p-5 transition duration-200 hover:-translate-y-1 hover:border-[#d8bd7b]/40 hover:bg-[#1b1c18]">
                <span className="grid size-11 place-items-center rounded-xl border border-[#d8bd7b]/25 bg-[#d8bd7b]/[.07] text-[#d8bd7b]"><Icono className="size-5" /></span>
                <h3 className="mt-5 text-base font-semibold">{titulo}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-white/55">{texto}</p>
                <Link to={enlace} className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#e6ce95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8bd7b]">{accion} <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 sm:px-7 sm:py-16 md:flex-row md:items-center md:justify-between lg:px-10">
        <div className="max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#d8bd7b]">Crece con tu taller</p>
          <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">Tu próximo paso empieza con una herramienta.</h2>
          <p className="mt-3 text-sm leading-6 text-white/60 sm:text-base">Explora recursos gratuitos y, cuando estés listo, accede a las funciones de AURUM LAB para centralizar más tareas de tu taller.</p>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          <Link to="/herramientas-publicas" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#d8bd7b] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#211c12] transition hover:brightness-105">Explorar herramientas <ArrowRight className="size-4" /></Link>
          <Link to="/auth" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 px-5 py-3 text-xs font-semibold text-white/75 transition hover:border-[#d8bd7b]/40 hover:text-white"><UsersRound className="size-4" /> Crear o ingresar</Link>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-10">
          <span>AURUM LAB · Tecnología digital para talleres de joyería</span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link to="/herramientas-publicas" className="transition hover:text-[#d8bd7b]">Herramientas gratuitas</Link>
            <Link to="/auth" className="transition hover:text-[#d8bd7b]">Acceso a la plataforma</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
