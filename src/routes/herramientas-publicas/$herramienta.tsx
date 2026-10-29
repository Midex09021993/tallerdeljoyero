import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { registrarEvento } from "@/lib/analytics";
import { ArrowLeft, CircleDot, Coins, FlaskConical, Gem, Ruler, Scale, Sparkles } from "lucide-react";
import { CalculadoraAleacionOro } from "@/components/CalculadoraAleacionOro";
import { ConversorTallasAnillo } from "@/components/ConversorTallasAnillo";
import { CalculadoraPesoGemas } from "@/components/CalculadoraPesoGemas";
import { VisorPesoJoyeria } from "@/components/VisorPesoJoyeria";
import { CalculadoraYeso } from "@/components/CalculadoraYesoAgua";

const paginas = {
  "aleacion-oro": {
    titulo: "Calculadora de aleación de oro",
    metaTitulo: "Calculadora de aleación de oro en gramos | Taller del Joyero",
    descripcion: "Calcula cuánta liga debes añadir para ajustar la ley del oro y preparar aleaciones de joyería.",
    contenido: "Introduce el peso y los quilates reales de tu oro, elige la ley final y consulta la cantidad estimada de metal de liga. Comprueba los datos de partida antes de pesar y fundir.",
    id: "oro",
  },
  "peso-joya-3d": {
    titulo: "Visualizador y calculadora de peso 3D",
    metaTitulo: "Calculadora de peso de joyas 3D | Taller del Joyero",
    descripcion: "Carga un modelo 3D compatible para estimar el peso de una joya según el metal y su densidad.",
    contenido: "Esta herramienta ayuda a estimar el peso teórico de una pieza a partir de su modelo tridimensional y el metal seleccionado. El resultado depende de la geometría, las unidades y la densidad configurada; no sustituye el pesaje de la pieza terminada.",
    id: "peso",
  },
  "yeso-agua": {
    titulo: "Calculadora de yeso y agua para joyería",
    metaTitulo: "Calculadora de yeso y agua para fundición de joyería | Taller del Joyero",
    descripcion: "Calcula cantidades estimadas de agua y revestimiento para preparar cilindros de fundición de joyería.",
    contenido: "Indica las medidas del cilindro y el tipo de tarro para obtener una estimación de la mezcla. Respeta siempre la ficha técnica del fabricante del revestimiento y ajusta la preparación al material que utilizas.",
    id: "yeso",
  },
  "tallas-anillos": {
    titulo: "Conversor de tallas de anillos",
    metaTitulo: "Conversor de tallas de anillos | Taller del Joyero",
    descripcion: "Consulta equivalencias de tallas de anillos entre diferentes sistemas de medida.",
    contenido: "Utiliza el conversor como referencia para comparar sistemas de tallas. Antes de fabricar o encargar una pieza, confirma la medida con un anillero o método de medición adecuado.",
    id: "tallas",
  },
  "peso-gemas": {
    titulo: "Calculadora de peso de gemas",
    metaTitulo: "Calculadora de peso de gemas para joyería | Taller del Joyero",
    descripcion: "Estima el peso de gemas para trabajos de joyería a partir de sus medidas y parámetros disponibles.",
    contenido: "La estimación depende de la forma, las dimensiones y la densidad de la gema. En piedras talladas, las proporciones de la talla pueden alterar el resultado; usa el valor como orientación y confirma el peso con una balanza cuando sea necesario.",
    id: "gemas",
  },
} as const;

type HerramientaSlug = keyof typeof paginas;

export const Route = createFileRoute("/herramientas-publicas/$herramienta")({
  head: ({ params }) => {
    const pagina = paginas[params.herramienta as HerramientaSlug];
    return {
      meta: [
        { title: pagina?.metaTitulo ?? "Herramientas para joyeros | Taller del Joyero" },
        { name: "description", content: pagina?.descripcion ?? "Herramientas técnicas para el trabajo diario de joyería." },
        { name: "robots", content: pagina ? "index, follow, max-image-preview:large" : "noindex, follow" },
        { property: "og:title", content: pagina?.metaTitulo ?? "Herramientas para joyeros | Taller del Joyero" },
        { property: "og:description", content: pagina?.descripcion ?? "Herramientas técnicas para joyería." },
        { property: "og:type", content: "website" },
        ...(pagina ? [{ property: "og:url", content: "https://www.tallerdeljoyero.com/herramientas-publicas/" + encodeURIComponent(params.herramienta) }] : []),
      ],
      links: pagina ? [{ rel: "canonical", href: "https://www.tallerdeljoyero.com/herramientas-publicas/" + encodeURIComponent(params.herramienta) }] : [],
    };
  },
  component: HerramientaPublicaPage,
});

function HerramientaPublicaPage() {
  const { herramienta } = Route.useParams();
  const pagina = paginas[herramienta as HerramientaSlug];

  useEffect(() => {
    if (!pagina) return;
    registrarEvento("tool_opened", {
      tool_id: pagina.id,
      tool_name: pagina.titulo,
      source: "public_tool_route",
    });
  }, [herramienta, pagina]);

  if (!pagina) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fffefa] px-6 text-center text-[#17232d]">
        <section className="max-w-lg">
          <h1 className="font-display text-3xl">Herramienta no encontrada</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">El enlace puede estar incompleto o la herramienta ya no estar disponible.</p>
          <Link to="/herramientas-publicas" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#b8860b] px-5 py-3 text-sm font-semibold text-white"><ArrowLeft className="size-4" /> Ver todas las herramientas</Link>
        </section>
      </main>
    );
  }

  const Icono = pagina.id === "oro" ? Coins : pagina.id === "peso" ? Scale : pagina.id === "yeso" ? FlaskConical : pagina.id === "tallas" ? Ruler : pagina.id === "gemas" ? CircleDot : Sparkles;

  return (
    <main className="min-h-screen bg-[#fffefa] text-[#17232d]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(212,170,25,.16),transparent_68%)]" />
      <div className="relative mx-auto w-full max-w-6xl px-4 py-6 sm:px-7 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <Link to="/herramientas-publicas" className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-600 transition hover:text-[#e5ca8a]"><ArrowLeft className="size-4" /> Todas las herramientas</Link>
          <Link to="/auth" className="text-xs font-semibold uppercase tracking-[.18em] text-[#987400]">Aurum Lab</Link>
        </header>

        <section className="py-9 sm:py-12">
          <div className="flex items-center gap-3 text-[#987400]"><span className="grid size-11 place-items-center rounded-xl border border-[#e5c04a]/60 bg-[#fff4c4]"><Icono className="size-5" /></span><p className="text-[10px] font-bold uppercase tracking-[.22em]">Herramienta gratuita para joyeros</p></div>
          <h1 className="mt-5 max-w-4xl font-display text-3xl italic leading-tight sm:text-5xl">{pagina.titulo}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{pagina.descripcion}</p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">{pagina.contenido}</p>
        </section>

        <section aria-label={pagina.titulo} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-6">
          <div className="mx-auto min-h-80 w-full min-w-0 max-w-5xl [&>*]:!mx-auto [&>*]:!w-full [&>*]:!max-w-full">
            {pagina.id === "yeso" ? <CalculadoraYeso compacto /> : null}
            {pagina.id === "oro" ? <CalculadoraAleacionOro compacto /> : null}
            {pagina.id === "tallas" ? <ConversorTallasAnillo /> : null}
            {pagina.id === "peso" ? <VisorPesoJoyeria compacto modoPublico /> : null}
            {pagina.id === "gemas" ? <CalculadoraPesoGemas /> : null}
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-[#263743] bg-[#111a22] text-white sm:grid sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8 sm:p-7">
          <div className="p-5 sm:p-0">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#f3d66e]">Lleva tu taller al siguiente nivel</p>
            <h2 className="mt-2 font-display text-2xl leading-tight sm:text-3xl">La herramienta resuelve una tarea. AURUM LAB te ayuda a organizar el trabajo.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Conoce las funciones para gestionar clientes, cotizaciones, pedidos, catálogo digital y archivos de tu taller. Puedes explorar las herramientas públicas sin registrarte.</p>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-200">
              <li className="flex items-center gap-2"><span aria-hidden="true" className="size-1.5 rounded-full bg-[#f3d66e]" />Gestión comercial</li>
              <li className="flex items-center gap-2"><span aria-hidden="true" className="size-1.5 rounded-full bg-[#f3d66e]" />Mi Nube y catálogo</li>
              <li className="flex items-center gap-2"><span aria-hidden="true" className="size-1.5 rounded-full bg-[#f3d66e]" />Diseño y visualización 3D</li>
            </ul>
          </div>
          <div className="flex flex-col gap-3 p-5 pt-0 sm:min-w-52 sm:p-0">
            <Link to="/auth" target="_blank" rel="noreferrer" onClick={() => registrarEvento("platform_opened", { source: "public_tool_cta", tool_id: pagina.id, tool_name: pagina.titulo })} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#f8c928] px-5 py-3 text-sm font-bold text-[#17232d] transition hover:bg-[#ffe071] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Conocer AURUM LAB <ArrowLeft className="size-4 rotate-180" /></Link>
            <Link to="/herramientas-publicas" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-[#f8c928]">Seguir usando herramientas</Link>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#e8dfc7] bg-[#fffaf0] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <h2 className="font-display text-xl text-[#17232d]">Aprende más sobre técnicas de joyería</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Consulta nuestras guías técnicas para entender los cálculos y aplicarlos con mayor seguridad en tu taller.</p>
          </div>
          <div className="mt-4 flex shrink-0 flex-wrap gap-3 sm:mt-0">
            <Link to="/guias" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#d8bd7b]/40 px-5 py-3 text-sm font-semibold text-[#987400] transition hover:bg-[#d8bd7b]/10">Ver guías técnicas <ArrowLeft className="size-4 rotate-180" /></Link>
          </div>
        </section>

        <footer className="mt-8 border-t border-slate-200 py-6 text-xs leading-6 text-slate-500">Los resultados son orientativos y dependen de los datos introducidos y de la configuración de cada herramienta. Verifica las medidas y los cálculos antes de fabricar una pieza.</footer>
      </div>
    </main>
  );
}
