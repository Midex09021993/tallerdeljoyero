import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CircleDot, Coins, FlaskConical, Gem, Ruler, Scale, Sparkles } from "lucide-react";
import { CalculadoraAleacionOro } from "@/components/CalculadoraAleacionOro";
import { ConversorTallasAnillo } from "@/components/ConversorTallasAnillo";
import { VisorPesoJoyeria } from "@/components/VisorPesoJoyeria";
import { CalculadoraPesoGemas } from "@/components/CalculadoraPesoGemas";
import { CalculadoraYeso } from "@/routes/_authenticated/taller";
import { GeneradorSTLIA } from "@/components/GeneradorSTLIA";

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
  "generador-stl-ia": {
    titulo: "Generador STL con IA",
    metaTitulo: "Generador de modelos STL con IA | Taller del Joyero",
    descripcion: "Explora la herramienta para generar un modelo 3D descargable en formato STL a partir de una imagen.",
    contenido: "El modelo generado debe revisarse antes de utilizarlo en diseño o fabricación. Comprueba escala, geometría, espesores y malla en tu programa 3D antes de imprimir o enviar a producción.",
    id: "stl",
  },
} as const;

type HerramientaSlug = keyof typeof paginas;

export const Route = createFileRoute("/herramientas/$herramienta")({
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
      ],
      links: pagina ? [{ rel: "canonical", href: "https://www.tallerdeljoyero.com/herramientas/" + encodeURIComponent(params.herramienta) }] : [],
    };
  },
  component: HerramientaPublicaPage,
});

function HerramientaPublicaPage() {
  const { herramienta } = Route.useParams();
  const pagina = paginas[herramienta as HerramientaSlug];

  if (!pagina) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#10110f] px-6 text-center text-[#f5f0e7]">
        <section className="max-w-lg">
          <h1 className="font-display text-3xl">Herramienta no encontrada</h1>
          <p className="mt-3 text-sm leading-6 text-white/65">El enlace puede estar incompleto o la herramienta ya no estar disponible.</p>
          <Link to="/herramientas-publicas" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#d8bd7b] px-5 py-3 text-sm font-semibold text-[#171713]"><ArrowLeft className="size-4" /> Ver todas las herramientas</Link>
        </section>
      </main>
    );
  }

  const Icono = pagina.id === "oro" ? Coins : pagina.id === "peso" ? Scale : pagina.id === "yeso" ? FlaskConical : pagina.id === "tallas" ? Ruler : pagina.id === "gemas" ? CircleDot : Sparkles;

  return (
    <main className="min-h-screen bg-[#10110f] text-[#f5f0e7]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(216,189,123,.12),transparent_68%)]" />
      <div className="relative mx-auto w-full max-w-6xl px-4 py-6 sm:px-7 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d8bd7b]/20 pb-5">
          <Link to="/herramientas-publicas" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/65 transition hover:text-[#e5ca8a]"><ArrowLeft className="size-4" /> Todas las herramientas</Link>
          <Link to="/auth" className="text-xs font-semibold uppercase tracking-[.18em] text-[#d8bd7b]">Aurum Lab</Link>
        </header>

        <section className="py-9 sm:py-12">
          <div className="flex items-center gap-3 text-[#d8bd7b]"><span className="grid size-11 place-items-center rounded-xl border border-[#d8bd7b]/25 bg-[#d8bd7b]/[.08]"><Icono className="size-5" /></span><p className="text-[10px] font-bold uppercase tracking-[.22em]">Herramienta gratuita para joyeros</p></div>
          <h1 className="mt-5 max-w-4xl font-display text-3xl italic leading-tight sm:text-5xl">{pagina.titulo}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 sm:text-base">{pagina.descripcion}</p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/50">{pagina.contenido}</p>
        </section>

        <section aria-label={pagina.titulo} className="rounded-2xl border border-[#d8bd7b]/25 bg-[#181915] p-3 shadow-2xl sm:p-6">
          <div className="mx-auto min-h-80 w-full min-w-0 max-w-5xl [&>*]:!mx-auto [&>*]:!w-full [&>*]:!max-w-full">
            {pagina.id === "yeso" ? <CalculadoraYeso compacto /> : null}
            {pagina.id === "oro" ? <CalculadoraAleacionOro compacto /> : null}
            {pagina.id === "tallas" ? <ConversorTallasAnillo /> : null}
            {pagina.id === "peso" ? <VisorPesoJoyeria archivoInicial={null} compacto /> : null}
            {pagina.id === "gemas" ? <CalculadoraPesoGemas /> : null}
            {pagina.id === "stl" ? <GeneradorSTLIA /> : null}
          </div>
        </section>

        <footer className="mt-8 border-t border-white/10 py-6 text-xs leading-6 text-white/40">Los resultados son orientativos y dependen de los datos introducidos y de la configuración de cada herramienta. Verifica las medidas y los cálculos antes de fabricar una pieza.</footer>
      </div>
    </main>
  );
}
