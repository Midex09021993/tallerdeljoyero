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
    titulo: "Calculadora de aleación de oro: calcula la liga en gramos",
    metaTitulo: "Calculadora de aleación de oro y liga en gramos | AURUM LAB",
    descripcion: "Calcula la cantidad estimada de liga para ajustar la ley del oro y preparar aleaciones de 18K, 14K y otras purezas en joyería.",
    contenido: "Introduce el peso del oro inicial y su quilataje, define la ley final y estima cuántos gramos de metal de liga necesitas. Selecciona el color de oro y consulta el cálculo según la receta configurada.",
    id: "oro",
    guiaSlug: "calcular-aleaciones-oro-18k-14k-9k",
    secciones: [
      {
        titulo: "Cómo calcular una aleación de oro y la cantidad de liga por quilates",
        parrafos: [
          "El quilataje expresa la proporción de oro fino dentro de una aleación de 24 partes. Por ejemplo, una aleación de 18 quilates representa 18 partes de oro fino de cada 24; el resto corresponde a otros metales.",
          "Para estimar la liga que debes añadir, la calculadora toma la masa inicial, la ley de partida y la ley objetivo. El resultado es teórico y depende de que los datos introducidos y la receta seleccionada correspondan al material real."
        ]
      },
      {
        titulo: "Cálculo de oro de 18K, 14K y otras leyes de pureza",
        parrafos: [
          "La herramienta permite seleccionar leyes habituales o introducir una ley personalizada. Úsala para planificar el ajuste desde una ley inicial superior hacia una ley final inferior; comprueba que la ley de partida sea mayor que la ley deseada.",
          "El color amarillo, blanco, rosa o naranja se calcula con la receta de metales de liga configurada en la herramienta. La composición de una aleación comercial puede variar según el fabricante y la aplicación."
        ]
      }
    ],
    preguntas: [
      { pregunta: "¿Cuántos gramos de liga necesito para preparar oro de 18 quilates?", respuesta: "Depende del peso y de la ley del oro de partida. Introduce ambos valores y selecciona 18K como ley final para obtener una estimación según la receta configurada." },
      { pregunta: "¿Cómo calcular una aleación de oro de 14K o 9K?", respuesta: "Puedes seleccionar una ley disponible o introducir una ley personalizada. Verifica que la ley inicial sea superior a la ley final para que el cálculo sea aplicable." },
      { pregunta: "¿La calculadora ofrece recetas para oro amarillo, blanco y rosa?", respuesta: "La herramienta distribuye la cantidad estimada de liga según la receta configurada para cada color. No sustituye la ficha técnica de una aleación comercial ni un análisis de laboratorio." }
    ]
  },
  "peso-joya-3d": {
    titulo: "Visualizador y calculadora de peso 3D",
    metaTitulo: "Calculadora de peso de joyas 3D | Taller del Joyero",
    descripcion: "Carga un modelo 3D compatible para estimar el peso de una joya según el metal y su densidad.",
    contenido: "Carga un archivo 3D compatible, selecciona el metal y revisa el peso teórico estimado a partir del volumen del modelo y la densidad configurada.",
    id: "peso",
    guiaSlug: "calcular-peso-joya-modelo-3d",
    secciones: [
      {
        titulo: "Cómo calcular el peso de una joya desde un archivo 3D",
        parrafos: [
          "La estimación de peso relaciona el volumen de la geometría con la densidad del material seleccionado. Por eso, la escala del archivo y las unidades del modelo deben ser correctas antes de interpretar el resultado.",
          "Un mismo diseño puede tener pesos distintos en oro, plata o platino porque cada metal y aleación tiene una densidad diferente. Selecciona el material que realmente planeas utilizar."
        ]
      },
      {
        titulo: "Qué revisar antes de usar el resultado",
        parrafos: [
          "Comprueba que el modelo represente la pieza que deseas fabricar y que no tenga errores de escala o geometría. El peso calculado es una referencia teórica: puede variar respecto a la pieza terminada por el proceso de fabricación, los ajustes de aleación, las gemas, soldaduras y otros componentes.",
          "Si el diseño incluye piedras, considera su peso por separado. No interpretes el resultado del metal como el peso total de una joya montada."
        ]
      }
    ],
    preguntas: [
      { pregunta: "¿Puedo calcular el peso de una joya desde un archivo STL?", respuesta: "La herramienta admite archivos 3D compatibles. Si tu archivo STL se puede cargar correctamente, podrás estimar el peso según el volumen y el metal seleccionado." },
      { pregunta: "¿Por qué cambia el peso cuando selecciono otro metal?", respuesta: "Porque el cálculo utiliza la densidad configurada para cada material. Para un mismo volumen, un metal más denso produce un peso teórico mayor." },
      { pregunta: "¿El peso calculado será igual al de la joya fundida?", respuesta: "No necesariamente. Es una estimación basada en el modelo y la densidad seleccionada; el proceso de fabricación, la aleación real y los componentes añadidos pueden modificar el peso final." }
    ]
  },
  "yeso-agua": {
    titulo: "Calculadora de yeso y agua para fundición de joyería",
    metaTitulo: "Calculadora de yeso y agua para fundición de joyería | AURUM LAB",
    descripcion: "Calcula la cantidad estimada de revestimiento y agua para cilindros de fundición de joyería según sus medidas y la proporción configurada para el material.",
    contenido: "Introduce el diámetro interior, la altura útil y el tipo de cilindro para calcular una referencia de polvo de revestimiento y agua antes del proceso de fundición a la cera perdida.",
    id: "yeso",
    guiaSlug: "fundicion-joyeria-revestimiento-omni-cast",
    secciones: [
      {
        titulo: "Cómo calcular yeso y agua para un cilindro de fundición de joyería",
        parrafos: [
          "La cantidad de mezcla depende del volumen útil del cilindro. Para obtener una estimación más representativa, mide el diámetro interior y la altura que realmente ocupará el revestimiento.",
          "Selecciona el tipo de tarro correspondiente y revisa las cantidades calculadas antes de preparar la mezcla. Las dimensiones nominales pueden diferir de las medidas interiores del recipiente."
        ]
      },
      {
        titulo: "Proporción de agua y polvo de revestimiento para fundición en joyería",
        parrafos: [
          "No todos los revestimientos para fundición utilizan la misma relación de agua y polvo. Sigue siempre la ficha técnica vigente del fabricante para el producto exacto que estás utilizando.",
          "Las cantidades de esta calculadora se basan en las proporciones configuradas en la herramienta. No deben interpretarse como una dosificación universal ni sustituir las instrucciones específicas del fabricante."
        ]
      }
    ],
    preguntas: [
      { pregunta: "¿Cómo calcular la cantidad de revestimiento para un cilindro de joyería?", respuesta: "Mide el diámetro interior y la altura útil del cilindro, selecciona el tipo de tarro y consulta la estimación que entrega la herramienta." },
      { pregunta: "¿La proporción de agua y polvo es igual para todos los revestimientos de fundición?", respuesta: "No. La proporción depende del producto. Consulta la ficha técnica del revestimiento que vas a utilizar y no extrapoles las instrucciones de una marca a otra." },
      { pregunta: "¿La calculadora sirve para cualquier marca de revestimiento de fundición?", respuesta: "No debe asumirse eso. La herramienta utiliza las proporciones configuradas en ella; verifica siempre que sean adecuadas para el revestimiento concreto y sus instrucciones vigentes." }
    ]
  },
  "tallas-anillos": {
    titulo: "Conversor de tallas de anillos: España, Europa y USA",
    metaTitulo: "Conversor de tallas de anillos: España, Europa y USA | AURUM LAB",
    descripcion: "Convierte tallas de anillos de España, Europa y USA. Consulta equivalencias entre sistemas o encuentra tu talla a partir del diámetro interior en milímetros.",
    contenido: "Selecciona el sistema de tallaje, introduce una talla conocida o mide el diámetro interior de tu anillo en milímetros. Consulta la equivalencia disponible y utiliza la medición visual en pantalla después de calibrarla.",
    id: "tallas",
    guiaSlug: "convertir-tallas-anillos-espana-europa-usa",
    secciones: [
      {
        titulo: "Cómo saber la talla de un anillo midiendo su diámetro interior",
        parrafos: [
          "Una forma práctica de estimar tu talla es medir el diámetro interior de un anillo que te quede bien. Mide en milímetros, de un borde interior al opuesto, pasando por el centro y sin incluir el grosor del aro.",
          "Introduce el diámetro en milímetros y el conversor lo compara con su tabla de equivalencias. Cuando existe correspondencia, puedes consultar las referencias de España, Europa (ISO) y Estados Unidos (USA)."
        ]
      },
      {
        titulo: "Tabla de equivalencias de tallas de anillos: España, Europa y USA",
        parrafos: [
          "España, Europa y Estados Unidos utilizan referencias de tallaje diferentes. Antes de elegir una equivalencia, identifica el sistema de origen y confirma que el sistema de destino coincide con el utilizado por tu joyería o proveedor.",
          "Para medir un anillo en pantalla, calibra primero la escala con una referencia física. El tamaño del monitor y el zoom del navegador pueden alterar la medición; confirma siempre el resultado con un anillero o instrumento físico antes de fabricar."
        ]
      }
    ],
    preguntas: [
      { pregunta: "¿Cómo convertir una talla de anillo de España a USA?", respuesta: "Selecciona España como sistema de origen, introduce la talla y consulta la equivalencia USA que ofrece la tabla. Confirma la referencia con el sistema utilizado por tu proveedor antes de fabricar o vender." },
      { pregunta: "¿Cómo saber mi talla de anillo midiendo el diámetro interior?", respuesta: "Mide en milímetros el espacio interior del anillo, de lado a lado y pasando por el centro. Introduce el valor en el conversor para consultar la equivalencia más cercana disponible." },
      { pregunta: "¿Puedo medir mi talla de anillo en la pantalla?", respuesta: "La medición en pantalla es orientativa y depende de una calibración correcta. Para fabricación, venta o ajuste definitivo, confirma siempre la medida con un anillero físico." }
    ]
  },
  "peso-gemas": {
    titulo: "Calculadora de peso de gemas en quilates y gramos",
    metaTitulo: "Calculadora de peso de gemas en quilates y gramos | AURUM LAB",
    descripcion: "Calcula el peso de gemas en quilates (ct). Convierte gramos a quilates y estima el peso de diamantes y otras piedras por sus medidas y talla.",
    contenido: "Convierte el peso de una piedra de gramos a quilates o estima su peso a partir de las dimensiones, la forma de talla y el material seleccionado.",
    id: "gemas",
    guiaSlug: "calcular-peso-gemas-por-medidas",
    secciones: [
      {
        titulo: "Cómo convertir gramos a quilates (ct) de una gema",
        parrafos: [
          "El quilate métrico (ct) es una unidad de masa utilizada para gemas. Un quilate equivale a 0,20 gramos, es decir, 200 miligramos; un quilate se divide en 100 puntos.",
          "Si conoces el peso en gramos, utiliza el modo de conversión para obtener el equivalente en quilates, puntos y miligramos."
        ]
      },
      {
        titulo: "Cómo calcular el peso de diamantes y gemas por medidas",
        parrafos: [
          "La estimación por dimensiones considera el largo, el ancho, la profundidad, la forma de talla y la gravedad específica asociada al material seleccionado. Las proporciones reales de la piedra pueden hacer que el peso se aparte de la estimación.",
          "En gemas facetadas, el perfil de la corona, el pabellón y la cintura influye en el volumen. Por eso, el resultado debe utilizarse como referencia y no como sustituto de una balanza gemológica."
        ]
      }
    ],
    preguntas: [
      { pregunta: "¿Cuántos quilates son 1 gramo de una gema?", respuesta: "Un gramo equivale a 5 quilates métricos, porque cada quilate equivale a 0,20 gramos." },
      { pregunta: "¿Cómo estimar el peso de un diamante por sus medidas?", respuesta: "Sí, se puede obtener una estimación si se conocen las dimensiones y la forma de talla. El peso real depende también de las proporciones y del perfil de la piedra." },
      { pregunta: "¿La estimación sirve para cualquier tipo de gema?", respuesta: "La herramienta ofrece materiales y formas configurados. La precisión depende de que el material, la gravedad específica y los parámetros de talla representen la piedra real; confirma el peso con una balanza cuando sea necesario." }
    ]
  },
} as const;
type HerramientaSlug = keyof typeof paginas;

export const Route = createFileRoute("/herramientas-publicas/$herramienta")({
  head: ({ params }) => {
    const pagina = paginas[params.herramienta as HerramientaSlug];
    const canonical = pagina
      ? "https://www.tallerdeljoyero.com/herramientas-publicas/" + encodeURIComponent(params.herramienta)
      : undefined;
    const title = pagina?.metaTitulo ?? "Herramientas para joyeros | AURUM LAB";
    const description = pagina?.descripcion ?? "Herramientas técnicas para el trabajo diario de joyería.";
    const structuredData = pagina
      ? {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "SoftwareApplication",
              name: pagina.titulo,
              description: pagina.descripcion,
              applicationCategory: "UtilitiesApplication",
              operatingSystem: "Web",
              isAccessibleForFree: true,
              offers: { "@type": "Offer", price: "0", priceCurrency: "PEN" },
              url: canonical,
              inLanguage: "es-PE",
              publisher: { "@type": "Organization", name: "AURUM LAB", url: "https://www.tallerdeljoyero.com/" },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Inicio", item: "https://www.tallerdeljoyero.com/" },
                { "@type": "ListItem", position: 2, name: "Herramientas para joyeros", item: "https://www.tallerdeljoyero.com/herramientas-publicas" },
                { "@type": "ListItem", position: 3, name: pagina.titulo, item: canonical },
              ],
            },
            {
              "@type": "FAQPage",
              mainEntity: pagina.preguntas.map((item) => ({
                "@type": "Question",
                name: item.pregunta,
                acceptedAnswer: { "@type": "Answer", text: item.respuesta },
              })),
            },
          ],
        }
      : undefined;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: pagina ? "index, follow, max-image-preview:large" : "noindex, follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "AURUM LAB" },
        { property: "og:locale", content: "es_PE" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(canonical ? [{ property: "og:url", content: canonical }] : []),
      ],
      links: canonical ? [{ rel: "canonical", href: canonical }] : [],
      scripts: structuredData
        ? [{ type: "application/ld+json", children: JSON.stringify(structuredData) }]
        : [],
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

        <section aria-labelledby="contenido-tecnico-herramienta" className="mx-auto mt-10 max-w-4xl space-y-8 px-1 sm:mt-14">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">Información técnica</p>
            <h2 id="contenido-tecnico-herramienta" className="mt-2 text-2xl font-bold tracking-tight text-[#17232d]">{pagina.secciones[0].titulo}</h2>
            {pagina.secciones[0].parrafos.map((parrafo) => <p key={parrafo} className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">{parrafo}</p>)}
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#17232d]">{pagina.secciones[1].titulo}</h2>
            {pagina.secciones[1].parrafos.map((parrafo) => <p key={parrafo} className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">{parrafo}</p>)}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-xl font-bold tracking-tight text-[#17232d]">{pagina.id === "yeso" ? "Preguntas frecuentes sobre yeso, agua y revestimiento de fundición" : pagina.id === "oro" ? "Preguntas frecuentes sobre aleaciones de oro y metales de liga" : pagina.id === "gemas" ? "Preguntas frecuentes sobre el peso de las gemas" : pagina.id === "tallas" ? "Preguntas frecuentes sobre tallas y equivalencias de anillos" : "Preguntas frecuentes"}</h2>
            <div className="mt-4 divide-y divide-slate-100">
              {pagina.preguntas.map((item) => (
                <div key={item.pregunta} className="py-4 first:pt-0 last:pb-0">
                  <h3 className="text-sm font-semibold text-[#17232d]">{item.pregunta}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.respuesta}</p>
                </div>
              ))}
            </div>
          </div>
          {pagina.guiaSlug ? (
            <div className="rounded-2xl border border-[#e8dfc7] bg-[#fffaf0] p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
              <div>
                <h2 className="text-base font-semibold text-[#17232d]">Profundiza con la guía técnica relacionada</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Amplía los conceptos y consulta recomendaciones para aplicar el cálculo en tu taller.</p>
              </div>
              <Link to="/guias/$slug" params={{ slug: pagina.guiaSlug }} className="mt-4 inline-flex min-h-10 shrink-0 items-center gap-2 text-sm font-semibold text-[#876500] hover:text-[#5f4900] sm:mt-0">Leer guía técnica <ArrowLeft className="size-4 rotate-180" /></Link>
            </div>
          ) : null}
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
