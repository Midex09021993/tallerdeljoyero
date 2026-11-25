import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Gem, Ruler } from "lucide-react";

export const Route = createFileRoute("/guias")({
  head: () => ({
    meta: [
      { title: "Guías técnicas de joyería | Taller del Joyero · AURUM LAB" },
      { name: "description", content: "Guías técnicas de joyería sobre aleaciones de oro, cálculo de leyes y liga, peso de joyas desde modelos 3D, gemología, impresión 3D y fundición." },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Guías técnicas de joyería | AURUM LAB" },
      { property: "og:description", content: "Conocimiento técnico aplicado al trabajo diario de los talleres de joyería." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.tallerdeljoyero.com/guias" },
      { property: "og:site_name", content: "AURUM LAB · Taller del Joyero" },
      { property: "og:locale", content: "es_PE" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Guías técnicas de joyería | AURUM LAB" },
      { name: "twitter:description", content: "Conocimiento técnico aplicado al trabajo diario de los talleres de joyería." },
    ],
    links: [{ rel: "canonical", href: "https://www.tallerdeljoyero.com/guias" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Guías técnicas de joyería | AURUM LAB",
        description: "Conocimiento técnico aplicado al trabajo diario de los talleres de joyería.",
        url: "https://www.tallerdeljoyero.com/guias",
        inLanguage: "es-PE",
        isPartOf: { "@type": "WebSite", name: "Taller del Joyero · AURUM LAB", url: "https://www.tallerdeljoyero.com/" },
        mainEntity: {
          "@type": "ItemList",
          itemListOrder: "https://schema.org/ItemListOrderAscending",
          numberOfItems: guias.length,
          itemListElement: guias.map((guia, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: guia.titulo,
            url: `https://www.tallerdeljoyero.com/guias/${guia.slug}`,
          })),
        },
      }),
    }],
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
    herramientaHref: "/herramientas-publicas/aleacion-oro",
  },
  {
    slug: "convertir-oro-14k-a-18k",
    categoria: "Metalurgia y materiales",
    titulo: "Cómo pasar oro de 14K a 18K: cálculo en gramos",
    descripcion: "Calcula cuánto oro fino añadir para elevar la ley de 14K a 18K, con fórmula y ejemplo práctico.",
    icon: Gem,
    lectura: "4 min de lectura",
    herramienta: "Calculadora de aleación de oro",
    herramientaHref: "/herramientas-publicas/aleacion-oro",
  },
  {
    slug: "bajar-oro-24k-a-18k",
    categoria: "Metalurgia y materiales",
    titulo: "Cómo bajar oro de 24K a 18K calculando la liga",
    descripcion: "Calcula la cantidad teórica de liga para convertir oro fino en una aleación de 18K.",
    icon: Gem,
    lectura: "4 min de lectura",
    herramienta: "Calculadora de aleación de oro",
    herramientaHref: "/herramientas-publicas/aleacion-oro",
  },
  {
    slug: "calcular-oro-fino-18k-14k-9k",
    categoria: "Metalurgia y materiales",
    titulo: "Cuánto oro fino contiene una pieza de 18K, 14K y 9K",
    descripcion: "Consulta las proporciones de oro fino y calcula el contenido de oro puro según el peso de una pieza.",
    icon: Gem,
    lectura: "4 min de lectura",
    herramienta: "Calculadora de aleación de oro",
    herramientaHref: "/herramientas-publicas/aleacion-oro",
  },
  {
    slug: "calcular-liga-oro-18k-14k",
    categoria: "Metalurgia y materiales",
    titulo: "Cómo calcular la liga que debes añadir al oro",
    descripcion: "Fórmula de balance de masa para estimar la liga que se añade al ajustar la ley de oro.",
    icon: Gem,
    lectura: "4 min de lectura",
    herramienta: "Calculadora de aleación de oro",
    herramientaHref: "/herramientas-publicas/aleacion-oro",
  },
  {
    slug: "diferencia-oro-14k-585-milesimas",
    categoria: "Metalurgia y materiales",
    titulo: "Diferencia entre oro 14K, 583 y 585 milésimas",
    descripcion: "Entiende la equivalencia matemática entre quilates y milésimas y cómo afecta a los cálculos.",
    icon: Gem,
    lectura: "4 min de lectura",
    herramienta: "Calculadora de aleación de oro",
    herramientaHref: "/herramientas-publicas/aleacion-oro",
  },
  {
    slug: "calcular-peso-anillo-oro-antes-fundir",
    categoria: "Diseño y fabricación",
    titulo: "Cómo calcular el peso de un anillo de oro antes de fundirlo",
    descripcion: "Estima el peso del anillo desde el volumen CAD y la densidad de la aleación, separando la pieza del sistema de colada.",
    icon: Gem,
    lectura: "5 min de lectura",
    herramienta: "Calculadora de peso 3D",
    herramientaHref: "/herramientas-publicas/peso-joya-3d",
  },
  {
    slug: "calcular-peso-oro-archivo-stl",
    categoria: "Diseño y fabricación",
    titulo: "Cómo calcular el peso de oro desde un archivo STL",
    descripcion: "Valida escala y malla STL, obtiene volumen y estima peso con la densidad del metal.",
    icon: Gem,
    lectura: "5 min de lectura",
    herramienta: "Calculadora de peso 3D",
    herramientaHref: "/herramientas-publicas/peso-joya-3d",
  },
  {
    slug: "calcular-peso-joya-volumen",
    categoria: "Diseño y fabricación",
    titulo: "Cómo calcular el peso de una joya según su volumen",
    descripcion: "Convierte volumen de un modelo a gramos con densidad, unidades correctas y ejemplos.",
    icon: Gem,
    lectura: "4 min de lectura",
    herramienta: "Calculadora de peso 3D",
    herramientaHref: "/herramientas-publicas/peso-joya-3d",
  },
  {
    slug: "cuanto-oro-necesito-fabricar-joya",
    categoria: "Diseño y fabricación",
    titulo: "Cuánto oro necesitas para fabricar una joya",
    descripcion: "Planifica metal para pieza, árbol de colada y margen del proceso sin usar porcentajes universales.",
    icon: Gem,
    lectura: "5 min de lectura",
    herramienta: "Calculadora de peso 3D",
    herramientaHref: "/herramientas-publicas/peso-joya-3d",
  },
  {
    slug: "estimar-peso-oro-impresion-resina",
    categoria: "Diseño y fabricación",
    titulo: "Cómo estimar el peso del oro desde una impresión de resina",
    descripcion: "Estima volumen y masa metálica desde el peso de una impresión, con límites y comprobaciones.",
    icon: Gem,
    lectura: "5 min de lectura",
    herramienta: "Calculadora de peso 3D",
    herramientaHref: "/herramientas-publicas/peso-joya-3d",
  },
  {
    slug: "calcular-peso-joya-modelo-3d",
    categoria: "Diseño y fabricación",
    titulo: "Cómo estimar el peso de una joya a partir de un modelo 3D",
    descripcion: "Descubre cómo calcular el peso aproximado de una joya en 3D con el volumen del modelo, las unidades y la densidad del oro, plata o platino.",
    icon: Gem,
    lectura: "5 min de lectura",
    herramienta: "Visualizador y calculadora de peso 3D",
    herramientaHref: "/herramientas-publicas/peso-joya-3d",
  },
  {
    slug: "calcular-peso-gemas-por-medidas",
    categoria: "Gemología",
    titulo: "Cómo calcular el peso de una gema por sus medidas",
    descripcion: "Aprende a convertir gramos a quilates y estimar el peso de diamantes y gemas según sus dimensiones, forma de talla y gravedad específica.",
    icon: Gem,
    lectura: "6 min de lectura",
    herramienta: "Calculadora de peso de gemas",
    herramientaHref: "/herramientas-publicas/peso-gemas",
  },
  {
    slug: "convertir-tallas-anillos-espana-europa-usa",
    categoria: "Medidas y tallas",
    titulo: "Cómo convertir tallas de anillos entre España, Europa y USA",
    descripcion: "Aprende a medir el diámetro interior de un anillo y consultar equivalencias entre los sistemas de tallaje más utilizados.",
    icon: Ruler,
    lectura: "5 min de lectura",
    herramienta: "Conversor de tallas de anillos",
    herramientaHref: "/herramientas-publicas/tallas-anillos",
  },
  {
    slug: "distribucion-taller-joyeria",
    categoria: "Diseño del taller",
    titulo: "Distribución de un taller de joyería: zonas, flujo y seguridad",
    descripcion: "Aprende a organizar las zonas de diseño CAD, impresión 3D, posprocesado, fundición y acabado con criterios de flujo, ventilación y seguridad.",
    icon: Gem,
    lectura: "10–12 min de lectura",
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
    icon: Gem,
    lectura: "7 min de lectura",
    herramienta: "Calculadora de yeso y agua",
  },
];

function categoriaId(categoria: string) {
  return `categoria-${categoria.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

const categorias = Array.from(new Set(guias.map((guia) => guia.categoria)));

function GuiasPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== "/guias" && pathname !== "/guias/") return <Outlet />;

  return (
    <main className="min-h-screen bg-[#fffefa] text-[#17232d]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5" aria-label="AURUM LAB, inicio">
            <img src="/brand/aurum-symbol.svg" alt="Logotipo de AURUM LAB" width="36" height="36" className="size-9 object-contain" />
            <span className="leading-tight"><span className="block text-[17px] font-extrabold tracking-tight">AURUM<span className="text-[#bd8d00]"> LAB</span></span><span className="block text-[9px] font-medium uppercase tracking-[.15em] text-slate-500">Guías técnicas</span></span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600 sm:gap-6" aria-label="Navegación de guías">
            <Link to="/auth" className="rounded-full bg-[#17232d] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#293b49]">Acceder</Link>
          </nav>
        </div>
      </header>
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-white via-[#fffdf5] to-[#f4f7fb]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[#ffe99b]/35 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">Conocimiento aplicado al oficio</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">Guías técnicas para trabajar mejor la joyería.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">Resuelve dudas concretas del taller con guías paso a paso, fórmulas y ejemplos: aleaciones de oro, oro fino, cálculo de liga, peso 3D, gemas, tallas y fundición. Explora las guías principales y sus microguías especializadas para encontrar una respuesta práctica.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#guias" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#17232d] px-5 text-sm font-semibold text-white transition hover:bg-[#293b49]">Explorar guías <ArrowRight className="size-4" /></a>
          </div>
        </div>
      </section>
      <section id="guias" className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">Guías publicadas</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Aprende, calcula y aplica</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Contenido práctico para apoyar decisiones del taller. Los cálculos son estimaciones: contrasta siempre los resultados con las especificaciones de los materiales y el proceso de fabricación.</p>
        </div>
        <nav aria-label="Categorías de guías técnicas" className="mt-6 flex flex-wrap gap-2">
          {categorias.map((categoria) => (
            <a key={categoria} href={`#${categoriaId(categoria)}-${guias.find((guia) => guia.categoria === categoria)?.slug}`} className="inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-[#d4aa19] hover:text-[#876500]">
              {categoria}
            </a>
          ))}
        </nav>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {guias.map((guia) => {
            const Icon = guia.icon;
            return (
              <article key={guia.slug} id={`${categoriaId(guia.categoria)}-${guia.slug}`} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_3px_14px_rgba(15,23,42,.035)] transition hover:border-[#dfbd4b] hover:shadow-[0_12px_30px_rgba(15,23,42,.07)] sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-[#fff4c4] text-[#8f6b00]"><Icon className="size-5" /></span>
                  <span className="text-[10px] font-medium text-slate-400">{guia.lectura}</span>
                </div>
                <p className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-[#987400]">{guia.categoria}</p>
                <h3 className="mt-2 text-lg font-bold leading-snug">{guia.titulo}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{guia.descripcion}</p>
                <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Herramienta relacionada</p>
                  {"herramientaHref" in guia ? (
                    <a href={guia.herramientaHref} className="mt-1 inline-flex items-center gap-1 text-left text-xs font-semibold text-[#876500] hover:text-[#5f4900]">
                      {guia.herramienta} <ArrowRight className="size-3.5" />
                    </a>
                  ) : (
                    <p className="mt-1 text-xs font-semibold text-slate-700">{guia.herramienta}</p>
                  )}
                </div>
                <Link to="/guias/$slug" params={{ slug: guia.slug }} aria-label={`Leer guía completa: ${guia.titulo}`} className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#876500] hover:text-[#5f4900]">Leer guía completa <ArrowRight className="size-4" /></Link>
              </article>
            );
          })}
        </div>
      </section>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>AURUM LAB · Guías técnicas para joyeros</span>
          <Link to="/" className="hover:text-[#987400]">Inicio</Link>
        </div>
      </footer>
    </main>
  );
}
