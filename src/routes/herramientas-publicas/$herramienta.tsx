import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { registrarEvento } from "@/lib/analytics";
import { ArrowLeft, CircleDot, Coins, FlaskConical, Gem, Ruler, Scale, Sparkles } from "lucide-react";
import { CalculadoraAleacionOro } from "@/components/CalculadoraAleacionOro";
import { ConversorTallasAnillo } from "@/components/ConversorTallasAnillo";
import { CalculadoraPesoGemas } from "@/components/CalculadoraPesoGemas";
import { VisorPesoJoyeria } from "@/components/VisorPesoJoyeria";
import { CalculadoraYeso } from "@/components/CalculadoraYesoAgua";

const guiasOroRelacionadas: ReadonlyArray<readonly [string, string]> = [
  ["calcular-oro-fino-18k-14k-9k", "Oro fino en 18K, 14K y 9K"],
  ["calcular-liga-oro-18k-14k", "Calcular la liga que debes añadir"],
  ["diferencia-oro-14k-585-milesimas", "14K, 583 y 585 milésimas"],
  ["bajar-oro-24k-a-18k", "Bajar oro de 24K a 18K"],
];

const paginas = {
  "aleacion-oro": {
    titulo: "Calculadora de aleación de oro: calcula la liga en gramos",
    metaTitulo: "Calculadora de aleación de oro 18K, 14K y 9K | AURUM LAB",
    descripcion: "Calcula cuántos gramos de liga añadir para ajustar oro a 18K, 14K o 9K. Calculadora de aleaciones para joyeros con balance de masa, leyes personalizadas y recetas de color configuradas.",
    contenido: "Introduce el peso de tu oro, la ley inicial y el quilataje objetivo. Obtén una estimación de la liga que debes añadir en gramos y consulta la distribución por color según las recetas configuradas. Útil para planificar ajustes de ley en el taller; verifica la composición y la ley real del material antes de fabricar.",
    palabrasClave: ["calculadora de aleación de oro", "calcular liga de oro en gramos", "oro 18K", "oro 14K", "oro 9K", "bajar ley del oro", "aleación de oro para joyería", "quilataje", "oro fino", "metal de liga"],
    id: "oro",
    guiaSlug: "calcular-aleaciones-oro-18k-14k-9k",
    secciones: [
      {
        titulo: "Cómo calcular una aleación de oro y la cantidad de liga por quilates",
        parrafos: [
          "El quilataje expresa la proporción de oro fino dentro de una aleación de 24 partes. El oro de 18K equivale nominalmente a 18/24 (75 %), 14K a 14/24 y 9K a 9/24. El resto de la masa corresponde a otros metales.",
          "Para estimar la liga que debes añadir, la calculadora toma la masa inicial, la ley de partida y la ley objetivo. El resultado es teórico y depende de que los datos introducidos y la receta seleccionada correspondan al material real."
        ]
      },
      {
        titulo: "Cálculo de oro de 18K, 14K y otras leyes de pureza",
        parrafos: [
          "La herramienta permite seleccionar leyes habituales o introducir una ley personalizada. Este cálculo de adición de liga se aplica al ajuste desde una ley inicial superior hacia una ley final inferior; comprueba que la ley de partida sea mayor que la ley deseada.",
          "El color amarillo, blanco, rosa o naranja se calcula con la receta de metales de liga configurada en la herramienta. La composición de una aleación comercial puede variar según el fabricante y la aplicación."
        ]
      }
    ],
    preguntas: [
      { pregunta: "¿Cuántos gramos de liga necesito para preparar oro de 18 quilates?", respuesta: "Depende del peso y de la ley del oro de partida. Introduce ambos valores y selecciona 18K como ley final para obtener una estimación según la receta configurada." },
      { pregunta: "¿Cómo calcular una aleación de oro de 14K o 9K?", respuesta: "Puedes seleccionar una ley disponible o introducir una ley personalizada. Verifica que la ley inicial sea superior a la ley final para que el cálculo sea aplicable." },
      { pregunta: "¿La calculadora ofrece recetas para oro amarillo, blanco y rosa?", respuesta: "La herramienta distribuye la cantidad estimada de liga según la receta configurada para cada color. No sustituye la ficha técnica de una aleación comercial ni un análisis de laboratorio." },
      { pregunta: "¿Cuál es la fórmula para calcular la liga que se añade al oro?", respuesta: "Primero calcula el peso final teórico: peso inicial × ley inicial ÷ ley objetivo. Después resta el peso inicial. La fórmula supone que la liga añadida no contiene oro fino y que la ley objetivo es menor que la ley inicial." },
      { pregunta: "¿18K equivale a qué porcentaje de oro fino?", respuesta: "18K nominal equivale a 18 de 24 partes, es decir, 75 % de oro fino o 750 milésimas. La ley real del lote puede requerir ensayo o documentación." },
      { pregunta: "¿La calculadora reemplaza un ensayo de oro?", respuesta: "No. Es una estimación matemática basada en los valores ingresados. No analiza el material ni confirma su ley real. Considera las pérdidas del proceso y verifica la composición con los procedimientos de control de tu taller." }
    ]
  },
  "peso-joya-3d": {
    titulo: "Calculadora de peso de joyas 3D: estima el metal desde tu modelo",
    metaTitulo: "Calculadora de peso de joyas 3D: STL, OBJ y GLB | AURUM LAB",
    descripcion: "Calcula el peso estimado de una joya desde un modelo 3D STL, OBJ, GLB o FBX. Selecciona oro o plata y estima el metal según el volumen y la densidad.",
    contenido: "Carga tu modelo 3D, elige la aleación de oro o plata y añade el peso real del árbol de colada para estimar el metal necesario. También puedes estimar el peso del metal a partir del peso de una impresión en resina compatible.",
    id: "peso",
    guiaSlug: "calcular-peso-joya-modelo-3d",
    secciones: [
      {
        titulo: "Cómo calcular el peso de una joya 3D usando un archivo STL, OBJ o GLB",
        parrafos: [
          "La calculadora procesa el volumen de la geometría 3D y lo relaciona con la densidad del metal seleccionado. Para obtener una estimación útil, el modelo debe conservar la escala correcta y utilizar unidades conocidas antes de cargarlo.",
          "Un mismo diseño puede tener pesos distintos según la aleación seleccionada. El oro de 18K, el oro de 14K y las aleaciones de plata no tienen la misma densidad; elige el material que corresponda al proyecto para obtener una referencia más adecuada."
        ]
      },
      {
        titulo: "Peso del árbol de colada y estimación desde una impresión 3D",
        parrafos: [
          "Si conoces el peso adicional del tronco, las ramas y el botón o reservorio, introdúcelo en el campo del árbol de colada para incorporarlo a la estimación. Como método alternativo, puedes introducir el peso de la impresión en resina limpia, seca y sin soportes, y seleccionar el tipo de resina disponible en la herramienta.",
          "El cálculo basado en el modelo representa una estimación del metal según su volumen y densidad; no equivale necesariamente al peso final de la pieza fundida. Si el diseño incluye gemas, soldaduras u otros componentes, considera sus pesos por separado. Verifica también que el archivo no tenga errores de escala o geometría."
        ]
      }
    ],
    preguntas: [
      { pregunta: "¿Qué formatos 3D puedo usar para calcular el peso de una joya?", respuesta: "La herramienta permite cargar archivos STL, OBJ, GLB y FBX. El resultado depende de que el modelo se procese correctamente y conserve la escala y las unidades adecuadas." },
      { pregunta: "¿Cómo influye el tipo de oro o plata en el peso calculado?", respuesta: "El cálculo utiliza la densidad configurada para la aleación seleccionada. Para un mismo volumen, las distintas aleaciones pueden producir pesos estimados diferentes." },
      { pregunta: "¿Puedo incluir el árbol de colada o calcular el metal desde el peso de una impresión en resina?", respuesta: "Sí. Puedes añadir el peso real del árbol de colada y, como método alternativo, introducir el peso de una impresión limpia, seca y sin soportes junto con el tipo de resina seleccionado. Ambas opciones ofrecen estimaciones; comprueba los datos y las condiciones de uso antes de fabricar." }
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
              "@type": "Organization",
              "@id": "https://www.tallerdeljoyero.com/#organization",
              name: "Taller del Joyero · AURUM LAB",
              url: "https://www.tallerdeljoyero.com/",
              description: "Plataforma digital y recursos técnicos para talleres, joyeros y profesionales de la fabricación de joyería.",
            },
            {
              "@type": "WebPage",
              "@id": canonical + "#webpage",
              url: canonical,
              name: pagina.metaTitulo,
              description: pagina.descripcion,
              inLanguage: "es-PE",
              isPartOf: { "@type": "WebSite", "@id": "https://www.tallerdeljoyero.com/#website", name: "Taller del Joyero · AURUM LAB", url: "https://www.tallerdeljoyero.com/" },
              publisher: { "@id": "https://www.tallerdeljoyero.com/#organization" },
              mainEntity: { "@id": canonical + "#software" },
              ...(pagina.id === "oro" ? { about: ["aleaciones de oro", "quilataje", "oro fino", "metales de liga", "metalurgia de joyería"] } : {}),
            },
            {
              "@type": "SoftwareApplication",
              "@id": canonical + "#software",
              name: pagina.titulo,
              description: pagina.descripcion,
              applicationCategory: "UtilitiesApplication",
              applicationSubCategory: "Calculadora de metalurgia para joyería",
              operatingSystem: "Web",
              isAccessibleForFree: true,
              offers: { "@type": "Offer", price: "0", priceCurrency: "PEN" },
              url: canonical,
              inLanguage: "es-PE",
              ...(pagina.id === "oro" ? { keywords: pagina.palabrasClave.join(", "), featureList: ["Ajuste de ley del oro", "Estimación de liga en gramos", "Cálculo para distintas leyes de quilataje", "Distribución según recetas de color configuradas"] } : {}),
              publisher: { "@id": "https://www.tallerdeljoyero.com/#organization" },
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
        ...(pagina.id === "oro" ? [{ name: "keywords", content: pagina.palabrasClave.join(", ") }] : []),
        { name: "robots", content: pagina ? "index, follow, max-image-preview:large" : "noindex, follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "AURUM LAB" },
        { property: "og:locale", content: "es_PE" },
        ...(pagina.id === "oro" ? [
          { property: "og:image", content: "https://www.tallerdeljoyero.com/og-aleacion-oro.svg" },
          { property: "og:image:secure_url", content: "https://www.tallerdeljoyero.com/og-aleacion-oro.svg" },
          { property: "og:image:type", content: "image/svg+xml" },
          { property: "og:image:width", content: "1200" },
          { property: "og:image:height", content: "630" },
          { property: "og:image:alt", content: "AURUM LAB: calculadora de aleación de oro en gramos para 18K, 14K y 9K" },
        ] : []),
        { name: "twitter:card", content: pagina.id === "oro" ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(pagina.id === "oro" ? [{ name: "twitter:image", content: "https://www.tallerdeljoyero.com/og-aleacion-oro.svg" }] : []),
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
  const guiaSlug = pagina.guiaSlug;

  return (
    <main className="min-h-screen bg-[#fffefa] text-[#17232d]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(212,170,25,.16),transparent_68%)]" />
      <div className="relative mx-auto w-full max-w-6xl px-4 py-6 sm:px-7 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <Link to="/herramientas-publicas" className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-600 transition hover:text-[#e5ca8a]"><ArrowLeft className="size-4" /> Todas las herramientas</Link>
          <Link to="/auth" className="text-xs font-semibold uppercase tracking-[.18em] text-[#987400]">Aurum Lab</Link>
        </header>

        <section className={pagina.id === "oro" ? "py-5 sm:py-7" : "py-9 sm:py-12"}>
          <div className="flex items-center gap-3 text-[#987400]"><span className="grid size-11 place-items-center rounded-xl border border-[#e5c04a]/60 bg-[#fff4c4]"><Icono className="size-5" /></span><p className="text-[10px] font-bold uppercase tracking-[.22em]">Herramienta gratuita para joyeros</p></div>
          <h1 className={pagina.id === "oro" ? "mt-3 max-w-4xl font-display text-3xl italic leading-tight sm:text-4xl" : "mt-5 max-w-4xl font-display text-3xl italic leading-tight sm:text-5xl"}>{pagina.titulo}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">{pagina.descripcion}</p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{pagina.contenido}</p>
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

        <section aria-labelledby="contenido-tecnico-herramienta" className="mx-auto mt-8 max-w-4xl space-y-5 px-1 sm:mt-10">
          {pagina.id === "oro" ? (
            <div className="rounded-2xl border border-[#e8dfc7] bg-[#fffaf0] p-5 sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">Referencia rápida · Metalurgia de joyería</p>
              <h2 id="contenido-tecnico-herramienta" className="mt-2 text-xl font-bold tracking-tight text-[#17232d]">Cómo se calcula la liga para bajar la ley del oro</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">El cálculo conserva la cantidad de oro fino: primero se estima la masa final necesaria para alcanzar la ley objetivo y después se resta el peso inicial.</p>
              <div className="mt-3 rounded-xl border border-[#eadfbe] bg-white p-3">
                <p className="text-xs font-semibold text-[#72560d]">Fórmula teórica</p>
                <p className="mt-1 font-mono text-sm text-[#17232d]">Peso final = peso inicial × ley inicial ÷ ley final</p>
                <p className="mt-1 font-mono text-sm text-[#17232d]">Liga a añadir = peso final − peso inicial</p>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-600">Ejemplo orientativo: al bajar 10 g de oro de 24K a 18K, la masa final teórica es 13,33 g y se añadirían aproximadamente 3,33 g de liga sin oro. El resultado real depende de la ley verificada, la composición y las pérdidas del proceso.</p>
            </div>
          ) : null}
          <details className="group rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" open={pagina.id !== "oro"}>
            <summary className="cursor-pointer list-none text-base font-bold text-[#17232d] marker:hidden">
              <span className="flex items-center justify-between gap-3"><span><span className="mb-1 block text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">Información técnica</span>{pagina.secciones[0].titulo}</span><span aria-hidden="true" className="text-xl text-[#987400] transition group-open:rotate-45">+</span></span>
            </summary>
            <div className="mt-3">
              {pagina.secciones[0].parrafos.map((parrafo) => <p key={parrafo} className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">{parrafo}</p>)}
            </div>
          </details>
          <details className="group rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" open={pagina.id !== "oro"}>
            <summary className="cursor-pointer list-none text-base font-bold text-[#17232d] marker:hidden">
              <span className="flex items-center justify-between gap-3"><span>{pagina.secciones[1].titulo}</span><span aria-hidden="true" className="text-xl text-[#987400] transition group-open:rotate-45">+</span></span>
            </summary>
            <div className="mt-3">
              {pagina.secciones[1].parrafos.map((parrafo) => <p key={parrafo} className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">{parrafo}</p>)}
            </div>
          </details>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-xl font-bold tracking-tight text-[#17232d]">{pagina.id === "yeso" ? "Preguntas frecuentes sobre yeso, agua y revestimiento de fundición" : pagina.id === "oro" ? "Preguntas frecuentes sobre aleaciones de oro y metales de liga" : pagina.id === "gemas" ? "Preguntas frecuentes sobre el peso de las gemas" : pagina.id === "tallas" ? "Preguntas frecuentes sobre tallas y equivalencias de anillos" : pagina.id === "peso" ? "Preguntas frecuentes sobre el peso de joyas en 3D" : "Preguntas frecuentes"}</h2>
            <div className="mt-4 divide-y divide-slate-100">
              {pagina.preguntas.map((item) => (
                <details key={item.pregunta} className="group py-3 first:pt-0 last:pb-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[#17232d]">{item.pregunta}<span aria-hidden="true" className="text-lg text-[#987400] transition group-open:rotate-45">+</span></summary>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.respuesta}</p>
                </details>
              ))}
            </div>
          </div>
          {pagina.id === "oro" ? (
            <section aria-labelledby="guia-oro-relacionada" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 id="guia-oro-relacionada" className="text-lg font-bold text-[#17232d]">Guías relacionadas para calcular oro y aleaciones</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Amplía el cálculo con equivalencias de quilataje, contenido de oro fino y ejemplos de balance de masa.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {guiasOroRelacionadas.map(([slug, label]) => <Link key={slug} to="/guias/$slug" params={{ slug }} className="inline-flex rounded-full border border-[#e8dfc7] bg-[#fffaf0] px-3 py-2 text-xs font-semibold text-[#876500] transition hover:bg-[#fff2cf]">{label}</Link>)}
              </div>
            </section>
          ) : null}
          {guiaSlug ? (
            <div className="rounded-2xl border border-[#e8dfc7] bg-[#fffaf0] p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
              <div>
                <h2 className="text-base font-semibold text-[#17232d]">Profundiza con la guía técnica relacionada</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Amplía los conceptos y consulta recomendaciones para aplicar el cálculo en tu taller.</p>
              </div>
              <Link to="/guias/$slug" params={{ slug: guiaSlug }} className="mt-4 inline-flex min-h-10 shrink-0 items-center gap-2 text-sm font-semibold text-[#876500] hover:text-[#5f4900] sm:mt-0">Leer guía técnica <ArrowLeft className="size-4 rotate-180" /></Link>
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
