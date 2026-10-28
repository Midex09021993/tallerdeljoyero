import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Calculator, Gem, Layers3, Wallet } from "lucide-react";

export const Route = createFileRoute("/guias")({
  head: () => ({
    meta: [
      { title: "Guías técnicas de joyería | Taller del Joyero · AURUM LAB" },
      { name: "description", content: "Guías prácticas para joyeros: aleaciones y quilataje del oro, peso de joyas, diseño 3D, fabricación y gestión de talleres." },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Guías técnicas de joyería | AURUM LAB" },
      { property: "og:description", content: "Conocimiento técnico aplicado al trabajo diario de los talleres de joyería." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.tallerdeljoyero.com/guias" },
    ],
    links: [{ rel: "canonical", href: "https://www.tallerdeljoyero.com/guias" }],
  }),
  component: GuiasPage,
});

const guias = [
  {
    slug: "calcular-aleaciones-oro-18k-14k-9k",
    categoria: "Metalurgia y materiales",
    titulo: "Cómo calcular aleaciones de oro de 18K, 14K y 9K",
    descripcion: "Comprende la relación entre quilataje, oro fino y metal de liga, con fórmulas y ejemplos para preparar tus cálculos antes de fundir.",
    icon: Gem,
    tiempo: "Guía técnica",
    publicada: true,
  },
  {
    slug: "calcular-peso-joya-modelo-3d",
    categoria: "Diseño y fabricación",
    titulo: "Cómo estimar el peso de una joya a partir de un modelo 3D",
    descripcion: "Conoce qué datos afectan la estimación del peso y cómo revisar las unidades, el volumen y la densidad del material.",
    icon: Layers3,
    tiempo: "Próxima guía",
    publicada: false,
  },
  {
    slug: "costos-presupuestos-taller-joyeria",
    categoria: "Costos y gestión",
    titulo: "Cómo organizar los costos y presupuestos de un taller de joyería",
    descripcion: "Una futura guía para separar materiales, mano de obra, procesos externos y margen al preparar una cotización.",
    icon: Wallet,
    tiempo: "Próxima guía",
    publicada: false,
  },
];

function GuiasPage() {
  return (
    <main className="min-h-screen bg-[#fffefa] text-[#17232d]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5" aria-label="AURUM LAB, inicio">
            <span className="grid size-9 place-items-center rounded-lg bg-[#f8c928] text-[#17232d]"><Gem className="size-5" strokeWidth={2.5} /></span>
            <span className="leading-tight"><span className="block text-[17px] font-extrabold tracking-tight">AURUM<span className="text-[#bd8d00]"> LAB</span></span><span className="block text-[9px] font-medium uppercase tracking-[.15em] text-slate-500">Guías técnicas</span></span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600 sm:gap-6" aria-label="Navegación de guías">
            <Link to="/herramientas-publicas" className="transition hover:text-[#987400]">Herramientas</Link>
            <Link to="/directorio" className="transition hover:text-[#987400]">Directorio</Link>
            <Link to="/auth" className="rounded-full bg-[#17232d] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#293b49]">Acceder</Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-white via-[#fffdf5] to-[#f4f7fb]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[#ffe99b]/35 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">Conocimiento aplicado al oficio</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">Guías técnicas para trabajar mejor la joyería.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">Fórmulas, procedimientos y criterios prácticos para tomar mejores decisiones en el taller. Cada guía conecta la explicación con herramientas útiles de AURUM LAB.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#guias" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#17232d] px-5 text-sm font-semibold text-white transition hover:bg-[#293b49]">Explorar guías <ArrowRight className="size-4" /></a>
            <Link to="/herramientas-publicas" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-[#17232d] transition hover:border-[#d4aa19]"><Calculator className="size-4" /> Probar herramientas</Link>
          </div>
        </div>
      </section>

      <section id="guias" className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">Biblioteca editorial</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Conocimiento útil para el trabajo real</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Publicaremos contenido especializado y revisado, con ejemplos claros, límites de cálculo y enlaces a herramientas relacionadas.</p>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {guias.map((guia) => {
            const Icon = guia.icon;
            return (
              <article key={guia.slug} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_3px_14px_rgba(15,23,42,.035)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-[#fff4c4] text-[#8f6b00]"><Icon className="size-5" /></span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{guia.tiempo}</span>
                </div>
                <p className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-[#987400]">{guia.categoria}</p>
                <h3 className="mt-2 text-lg font-bold leading-snug">{guia.titulo}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{guia.descripcion}</p>
                {guia.publicada ? (
                  <Link to="/guias/$slug" params={{ slug: guia.slug }} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#876500] hover:text-[#5f4900]">Leer guía completa <ArrowRight className="size-4" /></Link>
                ) : (
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-slate-400">En preparación</span>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">De la teoría a la práctica</p>
            <h2 className="mt-2 text-xl font-bold">Aplica lo aprendido en tu taller.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Utiliza las calculadoras públicas y explora las funciones de AURUM LAB cuando necesites continuar con tu trabajo.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/herramientas-publicas" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#17232d] px-5 text-sm font-semibold text-white transition hover:bg-[#293b49]">Ver herramientas <ArrowRight className="size-4" /></Link>
            <Link to="/auth" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d4aa19] bg-[#fff8d8] px-5 text-sm font-semibold text-[#604900] transition hover:bg-[#ffefad]">Crear cuenta</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>AURUM LAB · Guías técnicas para joyeros</span>
          <div className="flex flex-wrap gap-4"><Link to="/" className="hover:text-[#987400]">Inicio</Link><Link to="/herramientas-publicas" className="hover:text-[#987400]">Herramientas</Link><Link to="/directorio" className="hover:text-[#987400]">Directorio</Link></div>
        </div>
      </footer>
    </main>
  );
}
