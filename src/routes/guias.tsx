import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Calculator, Gem, Layers3 } from "lucide-react";

export const Route = createFileRoute("/guias")({
  head: () => ({
    meta: [
      { title: "Guías técnicas de joyería | Taller del Joyero · AURUM LAB" },
      { name: "description", content: "Guías técnicas de joyería: aleaciones de oro, peso desde modelos 3D, distribución del taller e impresión 3D para fabricación de joyas." },
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
    descripcion: "Aprende cómo calcular oro fino y metal de liga para aleaciones de oro de 18 quilates, 14K y 9K, con fórmulas y ejemplos en gramos.",
    icon: Gem,
    lectura: "6 min de lectura",
    herramienta: "Calculadora de aleación de oro",
  },
  {
    slug: "calcular-peso-joya-modelo-3d",
    categoria: "Diseño y fabricación",
    titulo: "Cómo estimar el peso de una joya a partir de un modelo 3D",
    descripcion: "Descubre cómo calcular el peso aproximado de una joya en 3D con el volumen del modelo, las unidades y la densidad del oro, plata o platino.",
    icon: Layers3,
    lectura: "5 min de lectura",
    herramienta: "Visualizador y calculadora de peso 3D",
  },
  {
    slug: "distribucion-taller-joyeria",
    categoria: "Diseño del taller",
    titulo: "Cómo organizar la distribución de un taller de joyería",
    descripcion: "Planifica las zonas de diseño, producción digital, fundición y acabado con criterios de circulación, instalación y seguridad.",
    icon: Layers3,
    lectura: "7 min de lectura",
    herramienta: "Guía de distribución del taller",
  },
  {
    slug: "impresion-3d-joyeria",
    categoria: "Diseño y fabricación",
    titulo: "Impresión 3D para joyería: del archivo a la pieza",
    descripcion: "Conoce las etapas de preparación del modelo, impresión, lavado, curado y revisión antes de la fundición.",
    icon: Gem,
    lectura: "8 min de lectura",
    herramienta: "Asistente de impresión 3D",
  },
  {
    slug: "fundicion-joyeria-revestimiento-omni-cast",
    categoria: "Fundición y materiales",
    titulo: "Fundición de joyería: guía del revestimiento y preparación del cilindro",
    descripcion: "Guía de fundición de joyería para preparar el cilindro, medir agua y revestimiento y consultar correctamente la ficha técnica de Whip Mix Omni-Cast.",
    icon: Layers3,
    lectura: "7 min de lectura",
    herramienta: "Calculadora de yeso y agua",
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
            <Link to="/auth" className="rounded-full bg-[#17232d] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#293b49]">Acceder</Link>
          </nav>
        </div>
      </header>
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-white via-[#fffdf5] to-[#f4f7fb]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[#ffe99b]/35 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">Conocimiento aplicado al oficio</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">Guías técnicas para trabajar mejor la joyería.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">Resuelve dudas frecuentes del taller: cómo calcular aleaciones de oro de 18K, 14K y 9K, estimar el peso de una joya desde un modelo 3D y preparar un cilindro para fundición. Cada guía explica los conceptos paso a paso y enlaza con herramientas gratuitas para llevar el cálculo a la práctica.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#guias" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#17232d] px-5 text-sm font-semibold text-white transition hover:bg-[#293b49]">Explorar guías <ArrowRight className="size-4" /></a>
            <Link to="/herramientas-publicas" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-[#17232d] transition hover:border-[#d4aa19]"><Calculator className="size-4" /> Ver herramientas gratuitas</Link>
          </div>
        </div>
      </section>
      <section id="guias" className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">Guías publicadas</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Aprende, calcula y aplica</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Contenido práctico para apoyar decisiones del taller. Los cálculos son estimaciones: contrasta siempre los resultados con las especificaciones de los materiales y el proceso de fabricación.</p>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {guias.map((guia) => {
            const Icon = guia.icon;
            return (
              <article key={guia.slug} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_3px_14px_rgba(15,23,42,.035)] transition hover:border-[#dfbd4b] hover:shadow-[0_12px_30px_rgba(15,23,42,.07)] sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-[#fff4c4] text-[#8f6b00]"><Icon className="size-5" /></span>
                  <span className="text-[10px] font-medium text-slate-400">{guia.lectura}</span>
                </div>
                <p className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-[#987400]">{guia.categoria}</p>
                <h3 className="mt-2 text-lg font-bold leading-snug">{guia.titulo}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{guia.descripcion}</p>
                <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Herramienta relacionada</p>
                  <p className="mt-1 text-xs font-semibold text-slate-700">{guia.herramienta}</p>
                </div>
                <Link to="/guias/$slug" params={{ slug: guia.slug }} className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#876500] hover:text-[#5f4900]">Leer guía completa <ArrowRight className="size-4" /></Link>
              </article>
            );
          })}
        </div>
      </section>
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">De la teoría a la práctica</p>
            <h2 className="mt-2 text-xl font-bold">Continúa con una herramienta de tu taller.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Prueba las calculadoras públicas sin crear una cuenta y utiliza los resultados como referencia para tu trabajo.</p>
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
          <div className="flex flex-wrap gap-4"><Link to="/" className="hover:text-[#987400]">Inicio</Link><Link to="/herramientas-publicas" className="hover:text-[#987400]">Herramientas</Link></div>
        </div>
      </footer>
    </main>
  );
}
