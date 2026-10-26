import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Gem, Ruler, Sparkles } from "lucide-react";

export const Route = createFileRoute("/comunidad")({
  head: () => ({
    meta: [
      { title: "Comunidad joyera | AURUM LAB" },
      {
        name: "description",
        content: "Guías prácticas, recursos técnicos y formación para profesionales de la joyería. Aprende, comparte y crece con AURUM LAB.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Comunidad joyera | AURUM LAB" },
      {
        property: "og:description",
        content: "Conocimiento práctico para diseñar, fabricar y hacer crecer tu taller de joyería.",
      },
    ],
  }),
  component: ComunidadPage,
});

const guias = [
  {
    id: "aleaciones",
    categoria: "Metalurgia",
    titulo: "Aleaciones de oro: calcula antes de fundir",
    descripcion: "Repasa la relación entre quilataje, oro fino y metal de liga antes de preparar una aleación.",
    icon: Gem,
    lectura: "Guía práctica",
  },
  {
    id: "gemas",
    categoria: "Gemas y medidas",
    titulo: "Del tamaño de una gema a su peso estimado",
    descripcion: "Conoce qué medidas necesitas y por qué la densidad y la forma influyen en la estimación.",
    icon: Ruler,
    lectura: "Conceptos básicos",
  },
  {
    id: "diseno-3d",
    categoria: "Diseño digital",
    titulo: "Prepara tu modelo 3D para presentarlo",
    descripcion: "Buenas prácticas para revisar el modelo y mostrar una pieza con una presentación más cuidada.",
    icon: Sparkles,
    lectura: "Flujo de trabajo",
  },
] as const;

function ComunidadPage() {
  return (
    <main className="min-h-screen bg-[#fffefa] text-[#17232d]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5" aria-label="AURUM LAB, inicio">
            <span className="grid size-9 place-items-center rounded-lg bg-[#f8c928] text-[#17232d]">
              <Gem className="size-5" strokeWidth={2.5} />
            </span>
            <span className="leading-tight">
              <span className="block text-[17px] font-extrabold tracking-tight">AURUM<span className="text-[#bd8d00]"> LAB</span></span>
              <span className="block text-[9px] font-medium uppercase tracking-[.15em] text-slate-500">Comunidad joyera</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600 sm:gap-6" aria-label="Navegación de comunidad">
            <Link to="/directorio" className="transition hover:text-[#987400]">Directorio</Link>
            <Link to="/cursos-diseno-3d" className="hidden transition hover:text-[#987400] sm:inline-flex">Formación</Link>
            <Link to="/" className="transition hover:text-[#987400]">Volver a AURUM LAB</Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-white via-[#fffdf5] to-[#f4f7fb]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[#ffe99b]/35 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">Aprende · Comparte · Crece</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">Conocimiento que impulsa tu taller.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">Guías técnicas, ideas de diseño y recursos para tomar mejores decisiones en tu trabajo joyero.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#guias" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#17232d] px-5 text-sm font-semibold text-white transition hover:bg-[#293b49]">Explorar guías <ArrowRight className="size-4" /></a>
            <Link to="/directorio" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-[#17232d] transition hover:border-[#d4aa19]">Ver talleres y cursos</Link>
          </div>
        </div>
      </section>

      <section id="guias" className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">Biblioteca práctica</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Ideas para el trabajo real</h2>
          </div>
          <span className="text-xs text-slate-500">Contenido especializado en joyería</span>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {guias.map((guia) => {
            const Icon = guia.icon;
            return (
              <article key={guia.id} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_3px_14px_rgba(15,23,42,.035)] transition hover:-translate-y-0.5 hover:border-[#e5c04a] hover:shadow-[0_12px_28px_rgba(15,23,42,.07)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-[#fff4c4] text-[#8f6b00]"><Icon className="size-5" /></span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{guia.lectura}</span>
                </div>
                <p className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-[#987400]">{guia.categoria}</p>
                <h3 className="mt-2 text-lg font-bold leading-snug">{guia.titulo}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{guia.descripcion}</p>
                <a href={`#${guia.id}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#876500] hover:text-[#5f4900]">Leer resumen <ArrowRight className="size-4" /></a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-[.8fr_1.2fr] md:py-16">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">Conocimiento útil</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Guías breves para empezar</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Una base clara para consultar conceptos del oficio y continuar con herramientas especializadas.</p>
            <Link to="/herramientas" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#876500]">Abrir herramientas técnicas <ArrowRight className="size-4" /></Link>
          </div>
          <div className="space-y-6">
            <article id="aleaciones" className="scroll-mt-24">
              <h3 className="flex items-center gap-2 font-bold"><Gem className="size-4 text-[#987400]" /> Aleaciones de oro</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">El quilataje expresa la proporción de oro fino en una aleación. Antes de fundir, define el quilataje objetivo, pesa cada componente con precisión y verifica la fórmula con los procedimientos de control de tu taller. Usa la calculadora de aleaciones para realizar estimaciones y revisa siempre los resultados antes de fabricar.</p>
            </article>
            <article id="gemas" className="scroll-mt-24 border-t border-slate-100 pt-5">
              <h3 className="flex items-center gap-2 font-bold"><Ruler className="size-4 text-[#987400]" /> Medidas y peso de gemas</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">El peso estimado depende de las dimensiones, la forma y la densidad de la gema. Dos piedras del mismo diámetro pueden tener pesos diferentes. Registra las medidas con cuidado y toma la estimación como referencia, no como sustituto del pesaje de una gema real.</p>
            </article>
            <article id="diseno-3d" className="scroll-mt-24 border-t border-slate-100 pt-5">
              <h3 className="flex items-center gap-2 font-bold"><Sparkles className="size-4 text-[#987400]" /> Presentación de modelos 3D</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Antes de compartir un diseño, revisa que la geometría esté completa, orientada correctamente y con una escala coherente. Para comunicar mejor el diseño, elige una vista clara, un material adecuado y una iluminación que permita distinguir los detalles de la pieza.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="flex flex-col justify-between gap-5 rounded-2xl border border-[#eadca7] bg-[#fff9df] p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]">La comunidad crece contigo</p>
            <h2 className="mt-2 text-xl font-bold">Encuentra talleres y formación.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Explora el directorio público de talleres, joyerías y cursos.</p>
          </div>
          <Link to="/directorio" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#17232d] px-5 text-sm font-semibold text-white transition hover:bg-[#293b49]">Abrir directorio <ArrowRight className="size-4" /></Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>AURUM LAB · Tecnología para joyeros</span>
          <div className="flex flex-wrap gap-4"><Link to="/" className="hover:text-[#987400]">Inicio</Link><Link to="/herramientas" className="hover:text-[#987400]">Herramientas</Link><Link to="/directorio" className="hover:text-[#987400]">Directorio</Link></div>
        </div>
      </footer>
    </main>
  );
}
