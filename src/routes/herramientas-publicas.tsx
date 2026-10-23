import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
      { title: "Herramientas para joyeros — Aurum Lab" },
      {
        name: "description",
        content:
          "Calculadoras técnicas y herramientas gratuitas para el trabajo diario de joyería.",
      },
    ],
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
  {
    id: "stl" as const,
    ruta: "generador-stl-ia" as const,
    categoria: "Diseñar y visualizar",
    titulo: "¿Cómo creo un modelo 3D a partir de una imagen?",
    descripcion: "Transforma una imagen en un modelo 3D y descarga el archivo STL para seguir trabajando en tu diseño.",
    palabrasClave: "imagen inteligencia artificial ia generar diseno archivo stl modelo modelar imprimir impresion 3d foto dibujo convertir crear",
    Icono: Sparkles,
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

function HerramientasPublicasPage() {
  const [busqueda, setBusqueda] = useState("");
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
    <main className="min-h-screen bg-[#10110f] text-[#f5f0e7]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(216,189,123,.12),transparent_68%)]" />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-7 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d8bd7b]/20 pb-5">
          <Link
            to="/auth"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-white/65 transition hover:text-[#e5ca8a]"
          >
            <ArrowLeft className="size-4" /> Volver a Aurum Lab
          </Link>
          <div className="flex items-center gap-2 text-[#d8bd7b]">
            <Gem className="size-5" />
            <span className="text-xs font-semibold uppercase tracking-[.22em]">Aurum Lab</span>
          </div>
        </header>

        <section className="py-10 sm:py-14">
          <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#d8bd7b]">
            El arte de crear. La inteligencia de gestionar.
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl italic leading-tight sm:text-5xl">
            ¿Qué necesitas hacer hoy?
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
            Encuentra una solución práctica para tu taller. Elige la tarea que quieres resolver y empieza directamente.
          </p>
        </section>

        <section aria-label="Buscar una tarea" className="mb-8">
          <label htmlFor="buscar-tarea" className="mb-2 block text-sm font-medium text-white/75">¿Qué quieres resolver?</label>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.035] px-4 transition focus-within:border-[#d8bd7b]/60">
            <Search className="size-4 shrink-0 text-[#d8bd7b]" />
            <input id="buscar-tarea" type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Busca oro, peso, yeso, STL..." className="min-h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35" />
          </div>
        </section>
        <section aria-label="Herramientas para resolver tareas del taller" className="space-y-10">
          {(["Calcular y preparar", "Diseñar y visualizar"] as const).map((categoria) => {
            const resultados = herramientasFiltradas.filter((herramienta) => herramienta.categoria === categoria);
            if (!resultados.length) return null;
            return (
            <div key={categoria}>
              <h2 className="mb-4 text-lg font-semibold text-white sm:text-xl">{categoria}</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {resultados.map(({ id, ruta, titulo, descripcion, Icono }) => (
                  <Link
                    key={id}
                    to="/herramientas/$herramienta"
                    params={{ herramienta: ruta }}
                    data-analytics-tool-id={id}
                    data-analytics-tool-name={titulo}
                    className="group flex min-h-48 flex-col rounded-2xl border border-white/10 bg-white/[.02] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#d8bd7b]/55 hover:bg-white/[.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8bd7b]"
                  >
                    <span className="grid size-11 place-items-center rounded-xl border border-[#d8bd7b]/25 bg-[#d8bd7b]/[.08] text-[#d8bd7b]"><Icono className="size-5" /></span>
                    <span className="mt-4 text-base font-semibold">{titulo}</span>
                    <span className="mt-2 flex-1 text-sm leading-6 text-white/55">{descripcion}</span>
                    <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#d8bd7b]">Resolver esta tarea <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
                  </Link>
                ))}
              </div>
            </div>
            );
          })}
          {(!termino || ["visor", "3d", "joya", "joyas", "modelo", "visualizar", "ver", "rhino"].some((palabra) => termino.includes(palabra))) && <div>
            <h2 className="mb-4 text-lg font-semibold text-white sm:text-xl">Diseñar y visualizar</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Link
                to="/aurum-render-public"
                className="group flex min-h-52 flex-col rounded-2xl border border-emerald-400/20 bg-emerald-400/[.025] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300/50 hover:bg-emerald-400/[.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                <span className="grid size-11 place-items-center rounded-xl border border-emerald-300/25 bg-emerald-300/[.08] text-emerald-200"><Eye className="size-5" /></span>
                <span className="mt-4 flex items-center gap-2 text-base font-semibold">Visor 3D de Joyas <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-200">Público</span></span>
                <span className="mt-2 flex-1 text-sm leading-6 text-white/55">Abre un modelo Rhino .3dm y explora la joya en el navegador. No necesitas iniciar sesión ni subir el archivo a tu cuenta.</span>
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-emerald-200">Abrir visor público <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
              </Link>
            </div>
          </div>}
          {(!termino || mostrarRender || mostrarTransfer) && <div>
            <h2 className="mb-4 text-lg font-semibold text-white sm:text-xl">Compartir y coordinar</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {mostrarRender && <Link
            to="/auth"
            className="group flex min-h-52 flex-col rounded-2xl border border-white/10 bg-white/[.02] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#d8bd7b]/55 hover:bg-white/[.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8bd7b]"
          >
            <span className="grid size-11 place-items-center rounded-xl border border-[#d8bd7b]/25 bg-[#d8bd7b]/[.08] text-[#d8bd7b]"><Gem className="size-5" /></span>
            <span className="mt-4 text-base font-semibold">¿Cómo puedo mostrar mi diseño a un cliente?</span>
            <span className="mt-2 flex-1 text-sm leading-6 text-white/70">Abre Aurum Render para visualizar y presentar tu joya en 3D.</span>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#d8bd7b]">Abrir visor 3D <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
          </Link>}
          {mostrarTransfer && <Link
            to="/transfer"
            className="group flex min-h-52 flex-col rounded-2xl border border-white/10 bg-white/[.02] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#d8bd7b]/55 hover:bg-white/[.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8bd7b]"
          >
            <span className="grid size-11 place-items-center rounded-xl border border-[#d8bd7b]/25 bg-[#d8bd7b]/[.08] text-[#d8bd7b]"><Sparkles className="size-5" /></span>
            <span className="mt-4 text-base font-semibold">¿Cómo comparto un archivo 3D pesado?</span>
            <span className="mt-2 flex-1 text-sm leading-6 text-white/55">Prepara un enlace privado para enviar modelos y archivos de fabricación.</span>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#d8bd7b]">Compartir archivo <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
          </Link>}
            </div>
          </div>}
          {mostrarCotizar && <div>
            <h2 className="mb-4 text-lg font-semibold text-white sm:text-xl">Cotizar y entregar</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Link to="/cotizaciones" className="group flex min-h-48 flex-col rounded-2xl border border-white/10 bg-white/[.02] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#d8bd7b]/55 hover:bg-white/[.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8bd7b]">
                <span className="grid size-11 place-items-center rounded-xl border border-[#d8bd7b]/25 bg-[#d8bd7b]/[.08] text-[#d8bd7b]"><Coins className="size-5" /></span>
                <span className="mt-4 text-base font-semibold">¿Cuánto debo cobrar por una joya?</span>
                <span className="mt-2 flex-1 text-sm leading-6 text-white/55">Accede a Aurum Lab para consultar las herramientas de cotización disponibles para tu taller.</span>
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#d8bd7b]">Entrar a Aurum Lab <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
              </Link>
              <Link to="/catalogo" className="group flex min-h-48 flex-col rounded-2xl border border-white/10 bg-white/[.02] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#d8bd7b]/55 hover:bg-white/[.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8bd7b]">
                <span className="grid size-11 place-items-center rounded-xl border border-[#d8bd7b]/25 bg-[#d8bd7b]/[.08] text-[#d8bd7b]"><Gem className="size-5" /></span>
                <span className="mt-4 text-base font-semibold">¿Cómo consulto la ficha técnica de una pieza?</span>
                <span className="mt-2 flex-1 text-sm leading-6 text-white/55">Abre el catálogo de tu taller para consultar y preparar fichas técnicas de tus piezas.</span>
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#d8bd7b]">Abrir catálogo <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></span>
              </Link>
            </div>
          </div>}
          {termino && herramientasFiltradas.length === 0 && !mostrarRender && !mostrarTransfer && !mostrarCotizar && <p className="rounded-xl border border-white/10 p-5 text-sm text-white/60">No encontramos una tarea con “{busqueda}”. Prueba con otra palabra, como oro, peso, yeso o STL.</p>}
        </section>

        <section aria-labelledby="crear-taller-publico" className="mt-12 overflow-hidden rounded-2xl border border-[#d8bd7b]/25 bg-gradient-to-br from-[#d8bd7b]/[.10] via-white/[.025] to-transparent p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#d8bd7b]">Da el siguiente paso</p>
              <h2 id="crear-taller-publico" className="mt-2 text-xl font-semibold text-[#f5f0e7] sm:text-2xl">Lleva las herramientas de tu taller a un solo lugar.</h2>
              <p className="mt-2 text-sm leading-6 text-white/60">Crea tu taller en AURUM LAB para explorar sus capacidades de gestión, diseño, cotización y catálogo digital. También podrás seguir las novedades de la comunidad joyera.</p>
            </div>
            <Link to="/auth#crear-taller" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#d8bd7b] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#211c12] transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8bd7b] focus-visible:ring-offset-2 focus-visible:ring-offset-[#10110f]">Crear mi taller <ArrowRight className="size-4" /></Link>
          </div>
        </section>

        <footer className="mt-8 border-t border-white/10 py-6 text-xs text-white/35">
          Aurum Lab · Herramientas técnicas para el sector joyero
        </footer>
      </div>
    </main>
  );
}
