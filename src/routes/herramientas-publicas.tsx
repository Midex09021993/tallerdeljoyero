import { useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CircleDot,
  Coins,
  Gem,
  Eye,
  Ruler,
  Scale,
  Sparkles,
  FlaskConical,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/herramientas-publicas")({
  head: () => ({
    meta: [
      { title: "Calculadoras para joyería: oro, gemas y peso 3D | AURUM LAB" },
      {
        name: "description",
        content:
          "Calcula aleaciones, peso de gemas, tallas de anillos y revestimiento para fundición con herramientas de joyería.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Calculadoras para joyería: oro, gemas y peso 3D | AURUM LAB" },
      { property: "og:url", content: "https://tallerdeljoyero.com/herramientas-publicas" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Calculadoras para joyería: oro, gemas y peso 3D | AURUM LAB" },
      { name: "twitter:description", content: "Calcula aleaciones, peso de gemas, tallas de anillos y revestimiento para fundición con herramientas de joyería." },
      { property: "og:description", content: "Calcula aleaciones, peso de gemas, tallas de anillos y revestimiento para fundición con herramientas de joyería." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "AURUM LAB" },
      { property: "og:locale", content: "es_PE" },
    ],
    links: [{ rel: "canonical", href: "https://tallerdeljoyero.com/herramientas-publicas" }],
  }),
  component: HerramientasPublicasPage,
});


const herramientas = [
  {
    id: "yeso" as const,
    ruta: "yeso-agua" as const,
    categoria: "Calcular y preparar",
    titulo: "¿Cuánto revestimiento y agua necesito para el molde?",
    descripcion: "Calcula la cantidad de revestimiento y agua para preparar el cilindro de fundición.",
    palabrasClave: "revestimiento fundicion cilindro agua mezcla preparar yeso polvo molde cera vaciado colada",
    Icono: FlaskConical,
  },
  {
    id: "oro" as const,
    ruta: "aleacion-oro" as const,
    categoria: "Calcular y preparar",
    titulo: "¿Cómo preparo una aleación de oro?",
    descripcion: "Calcula cuánto oro puro y cuánto metal de liga necesitas para alcanzar los quilates deseados.",
    palabrasClave: "oro quilates ley liga aleacion gramos metal fundir fundicion mezclar calcular pureza 18k 14k 24k amarillo blanco rosa",
    Icono: Coins,
  },
  {
    id: "tallas" as const,
    ruta: "tallas-anillos" as const,
    categoria: "Calcular y preparar",
    titulo: "¿Qué talla de anillo necesito?",
    descripcion: "Convierte medidas del anillo y consulta equivalencias entre sistemas de tallaje.",
    palabrasClave: "anillo anillos medida talla tallas equivalencia dedo circunferencia diametro aro numero medir",
    Icono: Ruler,
  },
  {
    id: "peso" as const,
    ruta: "peso-joya-3d" as const,
    categoria: "Diseñar y visualizar",
    titulo: "¿Cuánto metal necesitaré para mi modelo 3D?",
    descripcion: "Carga un archivo 3D compatible para estimar el peso de la pieza antes de fabricarla.",
    palabrasClave: "stl archivo modelo imprimir imprimirlo impresion 3d gramos peso metal volumen diseno cad fabricar fabricar pieza",
    Icono: Scale,
  },
  {
    id: "gemas" as const,
    ruta: "peso-gemas" as const,
    categoria: "Calcular y preparar",
    titulo: "¿Cuántos quilates tiene esta piedra?",
    descripcion: "Estima el peso de una gema a partir de sus medidas y el tipo de piedra.",
    palabrasClave: "piedra piedras diamante gema gemas quilates peso medidas talla largo ancho alto esmeralda rubi zafiro ct",
    Icono: CircleDot,
  },
];

function normalizarBusqueda(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const seoStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://tallerdeljoyero.com/#organization",
      "name": "AURUM LAB",
      "alternateName": "Taller del Joyero",
      "url": "https://tallerdeljoyero.com/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://tallerdeljoyero.com/brand/aurum-symbol.svg"
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://tallerdeljoyero.com/#website",
      "url": "https://tallerdeljoyero.com/",
      "name": "AURUM LAB | Taller del Joyero",
      "publisher": { "@id": "https://tallerdeljoyero.com/#organization" },
      "inLanguage": "es-PE"
    },
    {
      "@type": "WebPage",
      "@id": "https://tallerdeljoyero.com/herramientas-publicas#webpage",
      "url": "https://tallerdeljoyero.com/herramientas-publicas",
      "name": "Calculadoras para joyería: oro, gemas y peso 3D | AURUM LAB",
      "description": "Calcula aleaciones, peso de gemas, tallas de anillos y revestimiento para fundición con herramientas de joyería.",
      "isPartOf": { "@id": "https://tallerdeljoyero.com/#website" },
      "about": { "@id": "https://tallerdeljoyero.com/#organization" },
      "breadcrumb": { "@id": "https://tallerdeljoyero.com/herramientas-publicas#breadcrumb" },
      "inLanguage": "es-PE"
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://tallerdeljoyero.com/herramientas-publicas#breadcrumb",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Inicio",
          "item": "https://tallerdeljoyero.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Herramientas públicas",
          "item": "https://tallerdeljoyero.com/herramientas-publicas"
        }
      ]
    }
  ]
};

function HerramientasPublicasPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [busqueda, setBusqueda] = useState("");

  if (pathname !== "/herramientas-publicas" && pathname !== "/herramientas-publicas/") {
    return <Outlet />;
  }
  const termino = normalizarBusqueda(busqueda);
  const terminos = termino.split(/\s+/).filter(Boolean);
  const herramientasFiltradas = herramientas.filter((herramienta) => {
    if (!termino) return true;
    const contenido = normalizarBusqueda([
      herramienta.titulo,
      herramienta.descripcion,
      herramienta.categoria,
      herramienta.id,
      herramienta.palabrasClave,
    ].join(" "));
    // Cada palabra puede coincidir con el nombre, la descripción o un sinónimo cotidiano.
    return terminos.every((palabra) => contenido.includes(palabra));
  });
  const palabrasRender = ["mostrar", "diseno", "cliente", "joya", "joyas", "render", "aurum", "visualizar", "presentar", "3d", "ver", "ensenar"];
  const palabrasTransfer = ["compartir", "enviar", "archivo", "archivos", "stl", "pesado", "pesados", "transferencia", "transfer", "mandar", "pasar"];
  const palabrasCotizar = ["cotizar", "cotizacion", "precio", "cobrar", "presupuesto", "cliente", "ficha", "tecnica", "tecnico"];
  const coincideConPalabras = (palabras: string[]) => terminos.some((terminoBuscado) =>
    palabras.some((palabra) => palabra.includes(terminoBuscado) || terminoBuscado.includes(palabra))
  );
  const mostrarRender = !termino || coincideConPalabras(palabrasRender);
  const mostrarTransfer = !termino || coincideConPalabras(palabrasTransfer);
  const mostrarCotizar = !termino || coincideConPalabras(palabrasCotizar);
  return (
    <>
      <script type="application/ld+json">{JSON.stringify(seoStructuredData)}</script>
      <main className="min-h-screen bg-[#fffefa] text-[#17232d]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(248,201,40,.16),transparent_68%)]" />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-7 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-[#987400]"
          >
            <ArrowLeft className="size-4" /> Volver a AURUM LAB
          </Link>
          <Link to="/" aria-label="AURUM LAB — Inicio" className="inline-flex items-center text-[#987400] transition-opacity hover:opacity-80">
            <img src="/brand/aurum-symbol.svg" alt="AURUM LAB" width={36} height={28} className="h-7 w-9 object-contain" />
          </Link>
        </header>

        <section className="py-10 sm:py-14">
          <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#987400]">
            El arte de crear. La inteligencia de gestionar.
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl italic leading-tight sm:text-5xl">
            Herramientas técnicas para joyeros y talleres de joyería
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Calcula aleaciones, pesos de gemas, medidas de anillos y materiales para fundición con herramientas especializadas.
          </p>
        </section>

        <section aria-label="Buscar una tarea" className="mb-8">
          <label htmlFor="buscar-tarea" className="mb-2 block text-sm font-medium text-slate-700">¿Qué quieres resolver?</label>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-[#d8bd7b]/60">
            <Search className="size-4 shrink-0 text-[#987400]" />
            <input id="buscar-tarea" type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Busca oro, peso, yeso, gemas..." aria-describedby="ayuda-busqueda" className="min-h-12 w-full bg-transparent text-sm text-[#17232d] outline-none placeholder:text-slate-400" />
            {busqueda && <button type="button" onClick={() => setBusqueda("")} className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-white/10 hover:text-[#17232d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19]" aria-label="Limpiar búsqueda">Limpiar</button>}
          </div>
          <p id="ayuda-busqueda" className="mt-2 text-xs text-slate-500">Busca por material, medida o tarea. Por ejemplo: oro, talla, archivo 3D o quilates.</p>
        </section>
        <section aria-label="Herramientas para resolver tareas del taller" className="space-y-10">
          {(["Calcular y preparar", "Diseñar y visualizar"] as const).map((categoria) => {
            const resultados = herramientasFiltradas.filter((herramienta) => herramienta.categoria === categoria);
            if (!resultados.length) return null;
            return (
            <div key={categoria}>
              <h2 className="mb-4 text-lg font-semibold text-[#17232d] sm:text-xl">{categoria === "Calcular y preparar" ? "Calculadoras de joyería y herramientas para fundición" : "Herramientas de diseño y visualización 3D"}</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {resultados.map(({ id, ruta, titulo, descripcion, Icono }) => (
                  <Link
                    key={id}
                    to="/herramientas-publicas/$herramienta"
                    params={{ herramienta: ruta }}
                    data-analytics-tool-id={id}
                    data-analytics-tool-name={titulo}
                    className="group flex min-h-48 flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#e5c04a] hover:bg-[#fffbee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19]"
                  >
                    <span className="grid size-11 place-items-center rounded-xl border border-[#e5c04a]/60 bg-[#fff4c4] text-[#987400]"><Icono className="size-5" /></span>
                    <h3 className="mt-4 text-base font-semibold">{titulo}</h3>
                    <span className="mt-2 flex-1 text-sm leading-6 text-slate-600">{descripcion}</span>
                    <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#987400]">Resolver esta tarea <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
                  </Link>
                ))}
              </div>
            </div>
            );
          })}
          {(!termino || ["visor", "3d", "joya", "joyas", "modelo", "visualizar", "ver", "rhino"].some((palabra) => termino.includes(palabra))) && <div>
            <h2 className="mb-4 text-lg font-semibold text-[#17232d] sm:text-xl">Visualizador 3D de joyas online</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Link
                to="/aurum-render-public"
                className="group flex min-h-52 flex-col rounded-2xl border border-emerald-200 bg-white p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                <span className="grid size-11 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800"><Eye className="size-5" /></span>
                <span className="mt-4 flex items-center gap-2 text-base font-semibold">Visor 3D de Joyas <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-800">Público</span></span>
                <span className="mt-2 flex-1 text-sm leading-6 text-slate-600">Carga un archivo Rhino .3dm desde tu equipo y explora la joya en el navegador. El archivo se procesa localmente y no se guarda en tu cuenta.</span>
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-emerald-800">Abrir visor público <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
              </Link>
            </div>
          </div>}
          {(!termino || mostrarRender || mostrarTransfer) && <div>
            <h2 className="mb-4 text-lg font-semibold text-[#17232d] sm:text-xl">Compartir diseños y archivos de joyería</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {mostrarRender && <Link
            to="/auth"
            className="group flex min-h-52 flex-col rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#e5c04a] hover:bg-[#fffbee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19]"
          >
            <span className="grid size-11 place-items-center rounded-xl border border-[#e5c04a]/60 bg-[#fff4c4] text-[#987400]"><Gem className="size-5" /></span>
            <span className="mt-3 inline-flex w-fit items-center rounded-full border border-[#e8d7a4] bg-[#fff9e9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#8b6b28]">Dentro de AURUM LAB · Requiere iniciar sesión</span>
            <span className="mt-3 text-base font-semibold">Presenta tu diseño con AURUM RENDER</span>
            <span className="mt-2 flex-1 text-sm leading-6 text-slate-600">Accede a AURUM RENDER para visualizar tu modelo y preparar su presentación.</span>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#987400]">Acceder a AURUM LAB <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
          </Link>}
          {mostrarTransfer && <Link
            to="/transfer"
            className="group flex min-h-52 flex-col rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#e5c04a] hover:bg-[#fffbee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19]"
          >
            <span className="grid size-11 place-items-center rounded-xl border border-[#e5c04a]/60 bg-[#fff4c4] text-[#987400]"><Sparkles className="size-5" /></span>
            <span className="mt-4 text-base font-semibold">¿Cómo comparto un archivo 3D pesado?</span>
            <span className="mt-2 flex-1 text-sm leading-6 text-slate-600">Comparte modelos y archivos de fabricación mediante las opciones disponibles en AURUM TRANSFERS.</span>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#987400]">Compartir archivo <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
          </Link>}
            </div>
          </div>}
          {mostrarCotizar && <div>
            <h2 className="mb-4 text-lg font-semibold text-[#17232d] sm:text-xl">Cotizaciones y fichas técnicas de joyería</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Link to="/cotizaciones" className="group flex min-h-48 flex-col rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#e5c04a] hover:bg-[#fffbee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19]">
                <span className="grid size-11 place-items-center rounded-xl border border-[#e5c04a]/60 bg-[#fff4c4] text-[#987400]"><Coins className="size-5" /></span>
                <span className="mt-3 inline-flex w-fit items-center rounded-full border border-[#e8d7a4] bg-[#fff9e9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#8b6b28]">Dentro de AURUM LAB · Requiere iniciar sesión</span>
                <span className="mt-3 text-base font-semibold">Gestiona cotizaciones de joyería</span>
                <span className="mt-2 flex-1 text-sm leading-6 text-slate-600">Consulta las herramientas de cotización y organiza la información comercial de tu taller.</span>
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#987400]">Acceder a AURUM LAB <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
              </Link>
              <Link to="/catalogo" className="group flex min-h-48 flex-col rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#e5c04a] hover:bg-[#fffbee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19]">
                <span className="grid size-11 place-items-center rounded-xl border border-[#e5c04a]/60 bg-[#fff4c4] text-[#987400]"><Gem className="size-5" /></span>
                <span className="mt-3 inline-flex w-fit items-center rounded-full border border-[#e8d7a4] bg-[#fff9e9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#8b6b28]">Dentro de AURUM LAB · Requiere iniciar sesión</span>
                <span className="mt-3 text-base font-semibold">Consulta el catálogo de tu taller</span>
                <span className="mt-2 flex-1 text-sm leading-6 text-slate-600">Organiza tus piezas y consulta la información técnica disponible en tu catálogo.</span>
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#987400]">Acceder a AURUM LAB <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
              </Link>
            </div>
          </div>}
          {termino && herramientasFiltradas.length === 0 && !mostrarRender && !mostrarTransfer && !mostrarCotizar && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center"><Search className="mx-auto size-6 text-slate-400" /><p className="mt-3 text-sm font-medium text-slate-800">No encontramos una tarea con “{busqueda}”.</p><p className="mt-1 text-sm text-[#17232d]/50">Prueba con oro, peso, yeso, gemas o visor 3D.</p><button type="button" onClick={() => setBusqueda("")} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-[#e5c04a]/60 px-4 text-xs font-semibold text-[#987400] transition hover:bg-[#d8bd7b]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19]">Ver todas las herramientas</button></div>}
        </section>

        <section aria-labelledby="crear-taller-publico" className="mt-12 overflow-hidden rounded-2xl border border-[#e5c04a]/60 bg-gradient-to-br from-[#fff8df] via-white to-[#f8fafc] p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">Da el siguiente paso</p>
              <h2 id="crear-taller-publico" className="mt-2 text-xl font-semibold text-[#17232d] sm:text-2xl">Organiza el trabajo de tu taller con AURUM LAB.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Crea tu taller en AURUM LAB para explorar sus capacidades de gestión, diseño, cotización y catálogo digital. También podrás seguir las novedades de la comunidad joyera.</p>
            </div>
            <Link to="/auth" hash="crear-taller" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#d8bd7b] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#17232d] transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19] focus-visible:ring-offset-2 focus-visible:ring-offset-white">Crear mi taller <ArrowRight className="size-4" /></Link>
          </div>
        </section>

        <footer className="mt-8 border-t border-slate-200 py-6 text-xs text-slate-400">
          Aurum Lab · Herramientas técnicas para el sector joyero
        </footer>
      </div>
      </main>
    </>
  );
}
