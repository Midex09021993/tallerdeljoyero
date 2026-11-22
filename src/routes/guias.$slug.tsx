import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Calculator, Gem } from "lucide-react";

const slugGuia = "calcular-aleaciones-oro-18k-14k-9k";
const slugPeso = "calcular-peso-joya-modelo-3d";
const slugPlano = "distribucion-taller-joyeria";
const slugImpresion = "impresion-3d-joyeria";
const slugFundicion = "fundicion-joyeria-revestimiento-omni-cast";
const slugGemas = "calcular-peso-gemas-por-medidas";
const slugTallas = "convertir-tallas-anillos-espana-europa-usa";

export const Route = createFileRoute("/guias/$slug")({
  head: ({ params }) => {
    const valida = [slugGuia, slugPeso, slugPlano, slugImpresion, slugFundicion, slugGemas, slugTallas].includes(params.slug);
    const titulo = params.slug === slugPeso ? "Cómo estimar el peso de una joya a partir de un modelo 3D" : params.slug === slugPlano ? "Cómo organizar la distribución de un taller de joyería" : params.slug === slugImpresion ? "Impresión 3D para joyería: del archivo a la pieza" : params.slug === slugFundicion ? "Fundición de joyería: guía del revestimiento y preparación del cilindro" : params.slug === slugGemas ? "Cómo calcular el peso de una gema por sus medidas" : params.slug === slugTallas ? "Cómo convertir tallas de anillos entre España, Europa y USA" : "Cómo calcular aleaciones de oro de 18K, 14K y 9K";
    const descripcion = params.slug === slugPeso ? "Aprende a preparar un modelo 3D y estimar el peso teórico de una joya según su volumen, unidades y densidad del metal." : params.slug === slugPlano ? "Criterios prácticos para distribuir zonas de diseño, impresión, fundición y acabado en un taller de joyería." : params.slug === slugImpresion ? "Etapas de impresión 3D para joyería, desde la preparación del archivo hasta el posprocesado y la fundición." : params.slug === slugFundicion ? "Guía práctica en español para entender el revestimiento de fundición, la proporción agua/polvo, el calentamiento del cilindro y las referencias del manual Whip Mix Omni-Cast." : params.slug === slugGemas ? "Aprende a convertir gramos a quilates y estimar el peso de diamantes y gemas por dimensiones, forma de talla y gravedad específica." : params.slug === slugTallas ? "Aprende a medir el diámetro interior de un anillo y consultar equivalencias de tallas de España, Europa ISO y Estados Unidos." : "Aprende a calcular el oro fino y el metal de liga en aleaciones de 18K, 14K y 9K, con fórmulas y ejemplos prácticos para joyeros.";
    return {
      meta: [
        { title: valida ? `${titulo} | Guías técnicas AURUM LAB` : "Guía no encontrada | AURUM LAB" },
        { name: "description", content: valida ? descripcion : "La guía técnica que buscas no está disponible." },
        { name: "robots", content: valida ? "index, follow, max-image-preview:large" : "noindex, follow" },
        { property: "og:title", content: titulo },
        { property: "og:description", content: descripcion },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `https://www.tallerdeljoyero.com/guias/${params.slug}` },
        { property: "og:site_name", content: "AURUM LAB · Taller del Joyero" },
        { property: "og:locale", content: "es_PE" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: titulo },
        { name: "twitter:description", content: descripcion },
      ],
      links: valida ? [{ rel: "canonical", href: `https://www.tallerdeljoyero.com/guias/${params.slug}` }] : [],
      scripts: valida ? [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: titulo,
          description: descripcion,
          mainEntityOfPage: `https://www.tallerdeljoyero.com/guias/${params.slug}`,
          url: `https://www.tallerdeljoyero.com/guias/${params.slug}`,
          inLanguage: "es-PE",
          publisher: {
            "@type": "Organization",
            name: "Taller del Joyero · AURUM LAB",
            url: "https://www.tallerdeljoyero.com/",
          },
        }),
      }] : [],
    };
  },
  component: GuiaTecnicaPage,
});

function GuiaTecnicaPage() {
  const { slug } = Route.useParams();
  if (![slugGuia, slugPeso, slugPlano, slugImpresion, slugFundicion, slugGemas, slugTallas].includes(slug)) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fffefa] px-5 text-center text-[#17232d]">
        <div className="max-w-lg">
          <h1 className="text-3xl font-bold">Guía no encontrada</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Esta guía todavía no está publicada o el enlace es incorrecto.</p>
          <Link to="/guias" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#17232d] px-5 py-3 text-sm font-semibold text-white"><ArrowLeft className="size-4" /> Volver a las guías</Link>
        </div>
      </main>
    );
  }

  if (slug === slugGemas) {
    return (
      <main className="min-h-screen bg-[#fffefa] text-[#17232d]">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex min-h-[68px] max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
            <Link to="/guias" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#987400]"><ArrowLeft className="size-4" /> Todas las guías</Link>
            <Link to="/herramientas-publicas/$herramienta" params={{ herramienta: "peso-gemas" }} className="rounded-full bg-[#17232d] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#293b49]">Calculadora de peso de gemas</Link>
          </div>
        </header>
        <article className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
          <nav aria-label="Ruta de navegación" className="text-xs text-slate-500"><Link to="/guias" className="hover:text-[#876500]">Guías técnicas</Link><span aria-hidden="true"> / </span><span>Gemología</span></nav>
          <header className="mt-6 border-b border-slate-200 pb-8">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">Gemología · Guía técnica</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">Cómo calcular el peso de una gema por sus medidas</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">El peso de una gema se expresa habitualmente en quilates. Si no tienes una balanza a mano, sus dimensiones, forma y gravedad específica permiten obtener una estimación, siempre que se conozcan las limitaciones del método.</p>
          </header>
          <div className="prose prose-slate mt-8 max-w-none prose-headings:scroll-mt-24 prose-headings:tracking-tight prose-headings:font-bold prose-headings:text-[#17232d] prose-h2:mb-3 prose-h2:mt-12 prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-3 prose-p:leading-7 prose-li:leading-7 prose-a:text-[#876500] [&_p]:text-justify [&_li]:text-justify">
            <h2>1. Qué significa el quilate en gemología</h2>
            <p>El quilate métrico (ct) es una unidad de masa, no una medida de tamaño. Un quilate equivale exactamente a 0,20 gramos o 200 miligramos, y se divide en 100 puntos. Por eso, dos piedras con el mismo diámetro pueden tener pesos diferentes si cambian su material o sus proporciones.</p>
            <p>Para convertir un peso conocido en gramos a quilates, multiplica los gramos por cinco. Para convertir quilates a gramos, multiplica los quilates por 0,20.</p>
            <h2>2. Qué medidas necesitas para estimar el peso</h2>
            <p>La estimación por dimensiones requiere largo, ancho y profundidad en milímetros. También debes seleccionar el material y la forma de talla que más se aproxime a la piedra que estás evaluando.</p>
            <ul>
              <li>Mide la piedra en sus dimensiones máximas y utiliza milímetros.</li>
              <li>Identifica si la forma es redonda, oval, esmeralda, rectangular, marquise, pera, cuadrada, cushion o cabujón.</li>
              <li>Selecciona el material correcto, porque la gravedad específica influye directamente en la estimación.</li>
              <li>Considera la profundidad y el perfil real; no todas las piedras de una misma forma tienen las mismas proporciones.</li>
            </ul>
            <h2>3. Por qué importa la forma de talla y la gravedad específica</h2>
            <p>Las dimensiones por sí solas no determinan el peso. La gravedad específica representa la relación entre la densidad del material y la del agua; junto con el volumen aproximado y un factor de forma, permite estimar la masa.</p>
            <p>Una corona alta, un pabellón profundo, una cintura gruesa o un domo pronunciado pueden cambiar el volumen real respecto al supuesto por una forma promedio. La herramienta permite aplicar una corrección manual de perfil, pero esa corrección debe basarse en una medición o criterio gemológico razonable.</p>
            <h2>4. Cómo utilizar la calculadora de peso de gemas</h2>
            <ol>
              <li>Para convertir un peso conocido, abre el modo «Peso real» e introduce los gramos.</li>
              <li>Para estimar por dimensiones, selecciona «Estimar por medidas».</li>
              <li>Elige el material y la forma de talla más adecuados.</li>
              <li>Introduce largo, ancho y profundidad en milímetros.</li>
              <li>Revisa el peso estimado, el equivalente en gramos y el rango orientativo.</li>
            </ol>
            <h2>5. Cuándo debes confirmar el peso con una balanza</h2>
            <p>La estimación no sustituye el pesaje directo. Para una tasación, compraventa, certificación o ficha técnica definitiva, utiliza una balanza gemológica calibrada y registra el peso real. En piedras montadas, las dimensiones visibles pueden no representar toda la geometría y el acceso para medir la profundidad puede ser limitado.</p>
            <h2>Preguntas frecuentes sobre el peso de las gemas</h2>
            <h3>¿Cuántos quilates equivale un gramo?</h3>
            <p>Un gramo equivale a cinco quilates métricos, porque un quilate corresponde a 0,20 gramos.</p>
            <h3>¿Dos diamantes del mismo diámetro pesan lo mismo?</h3>
            <p>No necesariamente. La profundidad, las proporciones de la talla y el perfil pueden variar y modificar el volumen y el peso.</p>
            <h3>¿Puedo estimar el peso de una esmeralda o un rubí por sus medidas?</h3>
            <p>Puedes obtener una estimación si seleccionas el material y la forma adecuados y dispones de dimensiones fiables. La precisión dependerá de la gravedad específica configurada y de cuánto se parezca la piedra real al perfil promedio utilizado.</p>
            <h3>¿La estimación reemplaza el peso de una balanza?</h3>
            <p>No. Es una referencia orientativa. Para determinar el peso real, utiliza una balanza gemológica.</p>
          </div>
          <section className="mt-10 rounded-2xl border border-[#eadca7] bg-gradient-to-br from-[#fff9df] to-white p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]">Llévalo a la práctica</p>
            <h2 className="mt-2 text-xl font-bold">Convierte gramos a quilates o estima una gema</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Utiliza las dimensiones y los parámetros de tu piedra para obtener una referencia antes de confirmar su peso real.</p>
            <Link to="/herramientas-publicas/$herramienta" params={{ herramienta: "peso-gemas" }} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#17232d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#293b49]"><ArrowRight className="size-4" /> Abrir calculadora de peso de gemas</Link>
          </section>
          <div className="mt-8 border-t border-slate-200 pt-6"><Link to="/guias" className="inline-flex items-center gap-2 text-sm font-semibold text-[#876500]"><ArrowLeft className="size-4" /> Volver a las guías técnicas</Link></div>
        </article>
      </main>
    );
  }

  if (slug === slugTallas) {
    return (
      <main className="min-h-screen bg-[#fffefa] text-[#17232d]">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex min-h-[68px] max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
            <Link to="/guias" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#987400]"><ArrowLeft className="size-4" /> Todas las guías</Link>
            <Link to="/herramientas-publicas/$herramienta" params={{ herramienta: "tallas-anillos" }} className="rounded-full bg-[#17232d] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#293b49]">Conversor de tallas</Link>
          </div>
        </header>
        <article className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
          <nav aria-label="Ruta de navegación" className="text-xs text-slate-500"><Link to="/guias" className="hover:text-[#876500]">Guías técnicas</Link><span aria-hidden="true"> / </span><span>Medidas y tallas</span></nav>
          <header className="mt-6 border-b border-slate-200 pb-8">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">Medidas y tallas · Guía técnica</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">Cómo convertir tallas de anillos entre España, Europa y USA</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">Las tallas de anillos utilizan sistemas de numeración distintos según el país o la referencia comercial. Para convertir una medida correctamente, primero identifica el sistema de origen y confirma el diámetro interior o la circunferencia del aro.</p>
          </header>
          <div className="prose prose-slate mt-8 max-w-none prose-headings:tracking-tight prose-a:text-[#876500] [&_p]:text-justify [&_li]:text-justify">
            <h2>1. Diferencia entre diámetro interior y circunferencia</h2>
            <p>El diámetro interior es la distancia recta entre dos puntos opuestos de la parte interna del anillo. La circunferencia interior es la longitud del contorno. Ambos valores describen el tamaño interior, pero no son la misma medida.</p>
            <p>Si mides el diámetro, hazlo en milímetros y evita incluir el grosor del metal. Una medición inclinada o tomada sobre el exterior del aro puede producir una talla incorrecta.</p>
            <h2>2. Identifica el sistema de tallaje</h2>
            <p>España, Europa ISO y Estados Unidos utilizan referencias numéricas diferentes. Antes de interpretar una talla, confirma si el dato corresponde al sistema español, europeo ISO o americano (USA). No compares números de sistemas distintos como si fueran equivalentes.</p>
            <p>El conversor de Taller del Joyero permite buscar por diámetro interno, talla española, talla europea ISO o talla americana y muestra las equivalencias que contiene su tabla de referencia.</p>
            <h2>3. Cómo medir un anillo que ya tienes</h2>
            <ol>
              <li>Elige un anillo que ajuste correctamente en el dedo correspondiente.</li>
              <li>Colócalo sobre una superficie plana y mide el diámetro interior en milímetros.</li>
              <li>Evita medir el borde exterior o incluir el grosor del aro.</li>
              <li>Introduce el diámetro en el conversor y revisa las equivalencias disponibles.</li>
              <li>Si el resultado queda entre dos referencias, confirma con un anillero físico antes de fabricar.</li>
            </ol>
            <h2>4. Medición visual en pantalla: calibra antes de usar</h2>
            <p>La herramienta también permite ajustar una referencia física para calibrar la escala de la pantalla y comparar visualmente un anillo. Esta medición depende del tamaño de pantalla, el zoom del navegador y la precisión de la calibración.</p>
            <p>Utiliza la medición en pantalla como orientación, no como patrón metrológico. Para producción, venta o ajuste final, utiliza un anillero o instrumento físico adecuado.</p>
            <h2>5. Recomendaciones para evitar errores de talla</h2>
            <ul>
              <li>Confirma el país o sistema de la talla que te proporciona el cliente.</li>
              <li>Mide el diámetro interior, no el diámetro exterior.</li>
              <li>Comprueba que el anillo no esté deformado.</li>
              <li>Ten en cuenta que el ancho del diseño y la comodidad de uso pueden influir en el ajuste percibido.</li>
              <li>Verifica la talla final con herramientas físicas antes de fabricar una pieza a medida.</li>
            </ul>
            <h2>Preguntas frecuentes sobre tallas de anillos</h2>
            <h3>¿Cómo convierto una talla de España a USA?</h3>
            <p>Introduce la talla española en el modo correspondiente del conversor y consulta la equivalencia USA que devuelve la tabla. Comprueba siempre que el proveedor utilice el mismo estándar de referencia.</p>
            <h3>¿Cómo sé mi talla de anillo midiendo el diámetro?</h3>
            <p>Mide el diámetro interior de un anillo que ajuste bien y registra el valor en milímetros. Después, introdúcelo en el modo de diámetro interno para consultar la talla más cercana de la tabla.</p>
            <h3>¿El conversor de tallas ofrece una medida exacta?</h3>
            <p>Ofrece una equivalencia basada en su tabla. Las diferencias entre estándares y la precisión de la medición pueden afectar el resultado; confirma la medida con un anillero físico para fabricar.</p>
          </div>
          <section className="mt-10 rounded-2xl border border-[#eadca7] bg-gradient-to-br from-[#fff9df] to-white p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]">Llévalo a la práctica</p>
            <h2 className="mt-2 text-xl font-bold">Consulta equivalencias de tallas de anillos</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Busca por diámetro interior o por el sistema de tallaje que ya conoces.</p>
            <Link to="/herramientas-publicas/$herramienta" params={{ herramienta: "tallas-anillos" }} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#17232d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#293b49]"><ArrowRight className="size-4" /> Abrir conversor de tallas</Link>
          </section>
          <div className="mt-8 border-t border-slate-200 pt-6"><Link to="/guias" className="inline-flex items-center gap-2 text-sm font-semibold text-[#876500]"><ArrowLeft className="size-4" /> Volver a las guías técnicas</Link></div>
        </article>
      </main>
    );
  }

  if (slug === slugFundicion) {
    return (
      <main className="min-h-screen bg-[#fffefa] text-[#17232d]">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex min-h-[68px] max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
            <Link to="/guias" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#987400]"><ArrowLeft className="size-4" /> Todas las guías</Link>
            <Link to="/herramientas-publicas/$herramienta" params={{ herramienta: "yeso-agua" }} className="rounded-full bg-[#17232d] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#293b49]">Calculadora de yeso y agua</Link>
          </div>
        </header>
        <article className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
          <nav aria-label="Ruta de navegación" className="text-xs text-slate-500"><Link to="/guias" className="hover:text-[#876500]">Guías técnicas</Link><span aria-hidden="true"> / </span><span>Fundición y revestimientos</span></nav>
          <header className="mt-6 border-b border-slate-200 pb-8">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">Fundición y materiales · Guía técnica</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">Fundición de joyería: guía del revestimiento y preparación del cilindro</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">Una preparación consistente del cilindro empieza por medir correctamente, seguir la ficha del revestimiento y coordinar la mezcla, el fraguado y el ciclo de horno. Esta guía incorpora información legible de la ficha de producto Whip Mix Omni-Cast como referencia de fabricante, sin convertirla en una receta universal.</p>
          </header>
          <div className="prose prose-slate mt-8 max-w-none prose-headings:tracking-tight prose-a:text-[#876500] [&_p]:text-justify [&_li]:text-justify">
            <h2>1. Qué aporta la ficha de Omni-Cast</h2>
            <p>La ficha de Whip Mix describe Omni-Cast como un revestimiento para fundición de joyería y presenta referencias de proporción de mezcla, procedimiento de mezclado y temperaturas para distintos metales. También indica un uso para temperaturas de colado de hasta 1.350 °C. Ese dato corresponde al producto descrito en la ficha; no significa que todas las aleaciones deban colarse a esa temperatura.</p>
            <p>El documento incluye una tabla de temperaturas del metal y del cilindro para distintas aleaciones. Antes de usar un valor concreto, comprueba que coincida con la aleación exacta, el equipo y la versión completa de las instrucciones del fabricante. No extrapoles un valor de oro amarillo a oro blanco ni de una ley a otra.</p>
            <h2>2. Proporción de mezcla: sigue el sistema del producto</h2>
            <p>La ficha de Omni-Cast presenta relaciones de agua respecto al polvo, mientras que la calculadora pública de Taller del Joyero conserva su propio sistema de proporciones 38/62, 40/60 y 42/58. Son formas de expresar la mezcla distintas y no deben intercambiarse automáticamente.</p>
            <p><strong>Importante:</strong> esta guía no cambia la calculadora ni recomienda sustituir sus proporciones. Para preparar Omni-Cast, utiliza la relación agua/polvo que figure en la ficha técnica completa de ese producto y mide con precisión el agua y el polvo. No apliques la proporción de un revestimiento a otro sin autorización del fabricante.</p>
            <h2>3. Calcula primero el volumen del cilindro</h2>
            <p>La cantidad de revestimiento depende del volumen que debe llenarse y de las características del cilindro. Mide el diámetro interior y la altura útil con el cilindro real; no te bases únicamente en una medida nominal si el recipiente tiene paredes, base u otra geometría que reduzca el volumen disponible.</p>
            <p>La calculadora de yeso y agua de AURUM LAB estima la mezcla a partir del diámetro, la altura y el tipo de tarro seleccionado. Sus resultados dependen de la configuración actual y deben tratarse como estimaciones para las proporciones que ofrece la herramienta, no como una dosificación validada para Omni-Cast.</p>
            <h2>4. Mezclado y llenado del cilindro</h2>
            <ol>
              <li>Confirma el nombre exacto del revestimiento y consulta su ficha técnica vigente.</li>
              <li>Pesa el polvo y mide el agua con instrumentos adecuados; respeta la relación indicada por el fabricante.</li>
              <li>Sigue el orden de incorporación, el tiempo de mezcla y las condiciones de vacío indicados para el producto y el equipo.</li>
              <li>Vierte de forma controlada y sigue las instrucciones para llenar y desgasificar el cilindro.</li>
              <li>Respeta el tiempo de fraguado antes de iniciar el ciclo de calentamiento.</li>
            </ol>
            <p>Los tiempos de trabajo, mezclado, vacío y fraguado dependen del revestimiento, la temperatura ambiente, la cantidad preparada y el equipo. No uses tiempos de una ficha como estándar para otros productos.</p>
            <h2>5. Calentamiento del cilindro y temperatura de colado</h2>
            <p>La temperatura del cilindro al momento del colado y la temperatura del metal son parámetros diferentes. La tabla de Omni-Cast ofrece referencias por metal o aleación; el programa de calentamiento debe consultarse por separado y respetar las instrucciones del sistema de revestimiento, del patrón y del horno.</p>
            <ul>
              <li>Identifica la aleación exacta y consulta su recomendación de colado.</li>
              <li>Comprueba el tamaño y el número de cilindros, el patrón utilizado y la capacidad del horno.</li>
              <li>No adoptes una temperatura máxima del producto como temperatura de trabajo para todas las piezas.</li>
              <li>Si cambias de aleación, revestimiento o resina calcinable, vuelve a validar el ciclo con las fichas de los fabricantes.</li>
            </ul>
            <h2>6. Lista de comprobación antes de fundir</h2>
            <ul>
              <li>Revestimiento identificado y ficha técnica disponible.</li>
              <li>Diámetro y altura del cilindro comprobados.</li>
              <li>Agua y polvo medidos según la proporción específica del producto.</li>
              <li>Mezclado, vacío y fraguado realizados según las instrucciones aplicables.</li>
              <li>Ciclo de calentamiento y temperatura de colado confirmados para la aleación real.</li>
              <li>Ventilación, protección personal y manejo de equipos calientes previstos.</li>
            </ul>
            <h2>Preguntas frecuentes</h2>
            <h3>¿La calculadora de Taller del Joyero está configurada para Omni-Cast?</h3>
            <p>No. La herramienta conserva sus proporciones y su cálculo actual por medidas del cilindro. Esta guía utiliza el manual de Omni-Cast como material de consulta, sin alterar esa configuración.</p>
            <h3>¿Puedo usar las temperaturas de Omni-Cast con cualquier revestimiento?</h3>
            <p>No. Los datos pertenecen a la ficha del producto y no deben extrapolarse a otros revestimientos ni a todas las aleaciones. Consulta las instrucciones correspondientes al producto y al metal que vas a fundir.</p>
            <h3>¿La temperatura máxima indicada es la temperatura que debo usar siempre?</h3>
            <p>No. Es un límite de uso anunciado para el producto, no una temperatura única para todos los trabajos. La temperatura concreta depende de la aleación y del procedimiento validado para la pieza.</p>
            <p>Esta guía es informativa. La ficha de una sola página adjunta no proporciona todos los detalles necesarios para definir un procedimiento completo de fundición; consulta la documentación técnica completa y vigente de Whip Mix antes de trabajar.</p>
          </div>
          <section className="mt-10 rounded-2xl border border-[#eadca7] bg-gradient-to-br from-[#fff9df] to-white p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]">Llévalo a la práctica</p>
            <h2 className="mt-2 text-xl font-bold">Calcula las cantidades para tu cilindro</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Utiliza la herramienta para estimar cantidades según las proporciones que ofrece y verifica siempre la ficha técnica del revestimiento que vas a utilizar.</p>
            <Link to="/herramientas-publicas/$herramienta" params={{ herramienta: "yeso-agua" }} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#17232d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#293b49]"><Calculator className="size-4" /> Abrir calculadora de yeso y agua</Link>
          </section>
          <div className="mt-8 border-t border-slate-200 pt-6"><Link to="/guias" className="inline-flex items-center gap-2 text-sm font-semibold text-[#876500]"><ArrowLeft className="size-4" /> Volver a las guías técnicas</Link></div>
        </article>
      </main>
    );
  }

  if (slug === slugPeso) {
    return (
      <main className="min-h-screen bg-[#fffefa] text-[#17232d]">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex min-h-[68px] max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
            <Link to="/guias" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#987400]"><ArrowLeft className="size-4" /> Todas las guías</Link>
            <Link to="/herramientas-publicas/$herramienta" params={{ herramienta: "peso-joya-3d" }} className="rounded-full bg-[#17232d] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#293b49]">Abrir herramienta 3D</Link>
          </div>
        </header>
        <article className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
          <nav aria-label="Ruta de navegación" className="text-xs text-slate-500"><Link to="/guias" className="hover:text-[#876500]">Guías técnicas</Link><span aria-hidden="true"> / </span><span>Diseño y fabricación</span></nav>
          <header className="mt-6 border-b border-slate-200 pb-8">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">Diseño y fabricación · Guía técnica</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">Cómo estimar el peso de una joya a partir de un modelo 3D</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">Un modelo 3D ayuda a anticipar el consumo de metal antes de fabricar una pieza. Para que la estimación sea útil, revisa la geometría, las unidades y el material elegido; el resultado no equivale al peso final de una pieza fundida o terminada.</p>
          </header>
          <div className="prose prose-slate mt-8 max-w-none prose-headings:tracking-tight prose-a:text-[#876500] [&_p]:text-justify [&_li]:text-justify">
            <h2>1. Prepara el modelo antes de calcular</h2>
            <ul>
              <li>Comprueba que el archivo represente la geometría que realmente se fabricará, incluidas paredes, huecos y detalles importantes.</li>
              <li>Verifica la unidad de medida. Un archivo interpretado en milímetros como si estuviera en centímetros puede alterar drásticamente el resultado.</li>
              <li>Busca superficies abiertas, piezas duplicadas o geometría interna no deseada que pueda afectar el volumen calculado.</li>
            </ul>
            <h2>2. El peso depende del volumen y la densidad</h2>
            <p>La relación básica es <strong>masa = volumen × densidad</strong>. El volumen y la densidad deben utilizar unidades compatibles. Si cambias de plata a oro, platino u otra aleación, el peso estimado cambia aunque la geometría sea la misma.</p>
            <h2>3. Utiliza la herramienta de AURUM LAB</h2>
            <ol>
              <li>Abre el visualizador y calculadora de peso 3D.</li>
              <li>Carga un archivo compatible y espera a que termine de procesarse.</li>
              <li>Selecciona el metal o la densidad que corresponda al material previsto.</li>
              <li>Revisa el resultado y confirma las unidades y la geometría antes de presupuestar.</li>
            </ol>
            <h2>4. Interpreta el resultado como una estimación</h2>
            <p>El cálculo no incluye automáticamente todas las variables de fabricación. Canales de colada, soportes, acabado, piedras y otros componentes pueden afectar el peso y el consumo real. Define el margen de material según el proceso habitual de tu taller.</p>
            <h2>Lista rápida de comprobación</h2>
            <ul>
              <li>¿El modelo está en la unidad correcta y tiene un volumen válido?</li>
              <li>¿La densidad corresponde a la aleación real y no solo al nombre genérico del metal?</li>
              <li>¿Separaste el peso del metal del peso de las gemas u otros componentes?</li>
              <li>¿Prevés un margen de fabricación basado en tu proceso?</li>
            </ul>
            <h2>Preguntas frecuentes sobre el peso de una joya en 3D</h2>
            <h3>¿Cómo calcular el peso de una joya a partir de un archivo STL o 3D?</h3>
            <p>Primero confirma que el modelo tenga la escala y las unidades correctas y que represente el volumen de la pieza. Después, aplica una densidad compatible con el metal elegido. La estimación depende de que la geometría y el material estén correctamente definidos.</p>
            <h3>¿Una misma joya pesa igual en plata y en oro?</h3>
            <p>No. Si el volumen se mantiene, la masa cambia con la densidad del material. Además, la densidad concreta puede variar según la aleación; utiliza el valor que corresponda al material que realmente vas a trabajar.</p>
            <h3>¿El resultado de la calculadora es el peso final de la pieza?</h3>
            <p>No necesariamente. Es una estimación teórica del modelo y no contempla automáticamente todas las pérdidas de fabricación, los canales de colada, el acabado ni el peso de piedras y otros componentes.</p>
            <p>Si también necesitas estimar la composición de una aleación, consulta nuestra <a href="/guias/calcular-aleaciones-oro-18k-14k-9k">guía para calcular aleaciones de oro de 18K, 14K y 9K</a> y verifica los datos antes de preparar el lote.</p>
            <h3>¿Por qué puede diferir el peso calculado del peso de la pieza terminada?</h3>
            <p>El cálculo se basa en el volumen representado por el modelo y en la densidad seleccionada. La aleación real, las modificaciones del diseño, las piedras, los componentes añadidos y las etapas de fabricación pueden cambiar el resultado. Compara siempre la estimación con las condiciones reales de tu proceso.</p>
          </div>
          <section className="mt-10 rounded-2xl border border-[#eadca7] bg-gradient-to-br from-[#fff9df] to-white p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]">Llévalo a la práctica</p>
            <h2 className="mt-2 text-xl font-bold">Estima el peso de tu modelo 3D</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Abre la herramienta pública y revisa la estimación con el archivo y el material que utilizarás.</p>
            <Link to="/herramientas-publicas/$herramienta" params={{ herramienta: "peso-joya-3d" }} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#17232d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#293b49]"><ArrowRight className="size-4" /> Abrir calculadora de peso 3D</Link>
          </section>
          <div className="mt-8 border-t border-slate-200 pt-6"><Link to="/guias" className="inline-flex items-center gap-2 text-sm font-semibold text-[#876500]"><ArrowLeft className="size-4" /> Volver a las guías técnicas</Link></div>
        </article>
      </main>
    );
  }


  if (slug === slugPlano) {
    return (
      <main className="min-h-screen bg-[#fffefa] text-[#17232d]">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex min-h-[68px] max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
            <Link to="/guias" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#987400]"><ArrowLeft className="size-4" /> Todas las guías</Link>
            <Link to="/auth" className="rounded-full bg-[#17232d] px-4 py-2.5 text-xs font-semibold text-white">Acceder a AURUM LAB</Link>
          </div>
        </header>
        <article className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
          <nav aria-label="Ruta de navegación" className="text-xs text-slate-500"><Link to="/guias">Guías técnicas</Link><span aria-hidden="true"> / </span><span>Diseño del taller</span></nav>
          <header className="mt-6 border-b border-slate-200 pb-8">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">Diseño del taller · Guía técnica</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">Cómo organizar la distribución de un taller de joyería</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">Una distribución clara ayuda a trabajar con orden, reduce recorridos innecesarios y permite separar tareas que requieren condiciones distintas. Adapta cualquier plano a las dimensiones reales del local y de tus equipos.</p>
          </header>
          <div className="prose prose-slate mt-8 max-w-none prose-headings:tracking-tight [&_p]:text-justify [&_li]:text-justify">
            <h2>1. Define las zonas según el flujo de trabajo</h2>
            <p>Antes de mover máquinas, dibuja el recorrido de una pieza desde el diseño hasta el acabado. Considera zonas diferenciadas para:</p>
            <ul>
              <li><strong>Diseño digital:</strong> computadora, modelado CAD y revisión de archivos.</li>
              <li><strong>Producción digital:</strong> impresora 3D y el espacio necesario para retirar las piezas.</li>
              <li><strong>Posprocesado:</strong> lavado, secado y curado, según las instrucciones de la resina y del fabricante.</li>
              <li><strong>Fundición:</strong> equipos térmicos y auxiliares instalados de acuerdo con sus requisitos técnicos.</li>
              <li><strong>Acabado:</strong> limado, pulido y otras operaciones que pueden generar polvo o residuos.</li>
            </ul>
            <h2>2. Planifica con las dimensiones reales</h2>
            <p>Mide el local, las puertas y los pasillos. Para cada equipo registra ancho, fondo, altura, apertura de tapas, acceso para mantenimiento y espacio de trabajo del operario. No tomes las dimensiones de un esquema orientativo como medidas universales: varían según el modelo de máquina y el fabricante.</p>
            <h2>3. Separa procesos incompatibles</h2>
            <p>Evita ubicar fuentes de calor junto a resinas, disolventes o materiales combustibles. Las operaciones que generan polvo, vapores o partículas pueden necesitar extracción específica. Consulta las fichas de seguridad de cada producto y las instrucciones de instalación de cada equipo.</p>
            <h2>4. Mantén libres la circulación y las salidas</h2>
            <ul>
              <li>No bloquees puertas, pasillos ni accesos a equipos de emergencia.</li>
              <li>Deja espacio para cargar y descargar equipos, limpiar y hacer mantenimiento.</li>
              <li>Organiza herramientas y consumibles cerca de su zona de uso sin invadir las rutas de circulación.</li>
              <li>Verifica ventilación, extracción eléctrica y requisitos de seguridad con profesionales competentes.</li>
            </ul>
            <h2>5. Lista de comprobación antes de instalar</h2>
            <ul>
              <li>¿El plano incluye las medidas reales del local y de los equipos?</li>
              <li>¿Se ha previsto espacio para operar y mantener cada máquina?</li>
              <li>¿Están separadas las fuentes de calor de los materiales sensibles?</li>
              <li>¿La ventilación y la extracción corresponden a los procesos que se realizarán?</li>
              <li>¿Se mantienen libres las salidas y los accesos de emergencia?</li>
            </ul>
            <p>Esta guía ofrece criterios de planificación general; no sustituye un plano de instalación aprobado ni las indicaciones del fabricante o la normativa local.</p>
          </div>
          <section className="mt-10 rounded-2xl border border-[#eadca7] bg-gradient-to-br from-[#fff9df] to-white p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]">Llévalo a la práctica</p>
            <h2 className="mt-2 text-xl font-bold">Organiza el flujo de tu taller</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Usa esta lista como punto de partida y contrasta el plano con las dimensiones de tus equipos.</p>
            <Link to="/herramientas-publicas" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#17232d] px-5 py-3 text-sm font-semibold text-white"><ArrowRight className="size-4" /> Ver herramientas técnicas</Link>
          </section>
          <div className="mt-8 border-t border-slate-200 pt-6"><Link to="/guias" className="inline-flex items-center gap-2 text-sm font-semibold text-[#876500]"><ArrowLeft className="size-4" /> Volver a las guías técnicas</Link></div>
        </article>
      </main>
    );
  }

  if (slug === slugImpresion) {
    return (
      <main className="min-h-screen bg-[#fffefa] text-[#17232d]">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex min-h-[68px] max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
            <Link to="/guias" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#987400]"><ArrowLeft className="size-4" /> Todas las guías</Link>
            <Link to="/auth" className="rounded-full bg-[#17232d] px-4 py-2.5 text-xs font-semibold text-white">Acceder a AURUM LAB</Link>
          </div>
        </header>
        <article className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
          <nav aria-label="Ruta de navegación" className="text-xs text-slate-500"><Link to="/guias">Guías técnicas</Link><span aria-hidden="true"> / </span><span>Diseño y fabricación</span></nav>
          <header className="mt-6 border-b border-slate-200 pb-8">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">Diseño y fabricación · Guía técnica</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">Impresión 3D para joyería: del archivo a la pieza</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">La impresión 3D puede acelerar la validación de un diseño y preparar patrones para procesos posteriores. El resultado depende del modelo, la tecnología de impresión, el material y el posprocesado indicado por el fabricante.</p>
          </header>
          <div className="prose prose-slate mt-8 max-w-none prose-headings:tracking-tight [&_p]:text-justify [&_li]:text-justify">
            <h2>1. Revisa el archivo antes de imprimir</h2>
            <ul>
              <li>Comprueba unidades y escala del modelo.</li>
              <li>Verifica que la geometría esté cerrada y no tenga caras duplicadas o paredes involuntariamente delgadas.</li>
              <li>Revisa canales, cavidades, engastes y detalles que deban conservarse tras el posprocesado.</li>
              <li>Orienta la pieza teniendo en cuenta las recomendaciones del software y de la impresora.</li>
            </ul>
            <h2>2. Elige una resina adecuada al objetivo</h2>
            <p>No todas las resinas sirven para el mismo propósito. Una resina para prototipado visual no necesariamente es apta para fundición. Confirma que el material sea compatible con tu impresora, el proceso térmico y el revestimiento que utilizas.</p>
            <h2>3. Configura y prepara la impresión</h2>
            <p>Utiliza los parámetros recomendados para la combinación exacta de impresora y material. Revisa soportes, espesor de capa, exposición y limpieza del tanque según las instrucciones del fabricante; evita copiar perfiles de otra resina sin validarlos.</p>
            <h2>4. Lava y cura según las instrucciones</h2>
            <p>El lavado, secado y curado deben seguir la ficha técnica del material. Usa protección personal y ventilación adecuadas, gestiona los residuos según la normativa aplicable y no manipules resina sin curar sin las precauciones indicadas por el fabricante.</p>
            <h2>5. Comprueba la pieza antes del siguiente proceso</h2>
            <ul>
              <li>Busca soportes mal retirados, deformaciones y detalles perdidos.</li>
              <li>Confirma que la pieza esté limpia y posprocesada correctamente.</li>
              <li>Si se utilizará para fundición, sigue el ciclo de quemado y las instrucciones del sistema de revestimiento y de la resina castable específica.</li>
            </ul>
            <h2>Lista rápida antes de producir</h2>
            <ul>
              <li>Archivo y unidades revisados.</li>
              <li>Resina compatible con el objetivo de fabricación.</li>
              <li>Parámetros verificados para el equipo exacto.</li>
              <li>Lavado, secado y curado según ficha técnica.</li>
              <li>Proceso de fundición validado por el fabricante del material.</li>
            </ul>
            <p>La guía es informativa. Las condiciones concretas dependen de los equipos, consumibles y normas de seguridad del taller.</p>
          </div>
          <section className="mt-10 rounded-2xl border border-[#eadca7] bg-gradient-to-br from-[#fff9df] to-white p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]">Llévalo a la práctica</p>
            <h2 className="mt-2 text-xl font-bold">Continúa con tus herramientas</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Prepara el modelo y revisa las herramientas disponibles para acompañar tu flujo de fabricación digital.</p>
            <Link to="/herramientas-publicas" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#17232d] px-5 py-3 text-sm font-semibold text-white"><ArrowRight className="size-4" /> Ver herramientas técnicas</Link>
          </section>
          <div className="mt-8 border-t border-slate-200 pt-6"><Link to="/guias" className="inline-flex items-center gap-2 text-sm font-semibold text-[#876500]"><ArrowLeft className="size-4" /> Volver a las guías técnicas</Link></div>
        </article>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#fffefa] text-[#17232d]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[68px] max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/guias" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#987400]"><ArrowLeft className="size-4" /> Todas las guías</Link>
          <Link to="/auth" className="rounded-full bg-[#17232d] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#293b49]">Acceder a AURUM LAB</Link>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
        <nav aria-label="Ruta de navegación" className="text-xs text-slate-500"><Link to="/guias" className="hover:text-[#876500]">Guías técnicas</Link><span aria-hidden="true"> / </span><span>Metalurgia y materiales</span></nav>
        <header className="relative mt-6 overflow-hidden rounded-[1.75rem] border border-[#eadca7] bg-gradient-to-br from-[#fff9e8] via-white to-[#f5f7fa] p-6 pb-8 sm:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full border-[24px] border-[#f5e8bd]/45" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#e8d7a4] bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">Metalurgia y materiales</span>
              <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">Manual técnico · AURUM LAB</span>
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-extrabold leading-[1.08] tracking-tight text-[#17232d] sm:text-5xl">Cálculo de aleaciones de oro: 18K, 14K y 9K</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">Una guía práctica para interpretar la ley, calcular el contenido de oro fino y planificar ajustes de masa con balance metalúrgico. Incluye fórmulas, ejemplos de taller, controles y límites del cálculo.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">Nivel: básico–intermedio</span>
              <span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">Lectura: 8–10 min</span>
              <span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">Unidades: g · ‰ · K</span>
            </div>
          </div>
        </header>

        <section className="mt-7 grid gap-3 sm:grid-cols-3" aria-label="Resumen de leyes nominales">
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Oro 18K</p><p className="mt-1 text-2xl font-extrabold text-[#17232d]">750‰</p><p className="text-xs text-slate-500">75,0 % de oro fino nominal</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Oro 14K</p><p className="mt-1 text-2xl font-extrabold text-[#17232d]">583,3‰</p><p className="text-xs text-slate-500">58,33 % de oro fino teórico</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Oro 9K</p><p className="mt-1 text-2xl font-extrabold text-[#17232d]">375‰</p><p className="text-xs text-slate-500">37,5 % de oro fino nominal</p></div>
        </section>

        <aside className="mt-7 rounded-2xl border border-slate-200 bg-[#f7f8fa] p-5 sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">En esta guía</p>
          <div className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <a className="font-medium text-slate-700 hover:text-[#876500]" href="#ley-oro">01 · Interpretar la ley del oro</a>
            <a className="font-medium text-slate-700 hover:text-[#876500]" href="#formula-oro-fino">02 · Fórmula de oro fino</a>
            <a className="font-medium text-slate-700 hover:text-[#876500]" href="#ejemplo-10g">03 · Ejemplo de 10 gramos</a>
            <a className="font-medium text-slate-700 hover:text-[#876500]" href="#balance-masa">04 · Balance de masa</a>
            <a className="font-medium text-slate-700 hover:text-[#876500]" href="#bajar-ley">05 · Reducir la ley</a>
            <a className="font-medium text-slate-700 hover:text-[#876500]" href="#subir-ley">06 · Elevar la ley</a>
            <a className="font-medium text-slate-700 hover:text-[#876500]" href="#mezclar-aleaciones">07 · Mezclar aleaciones</a>
            <a className="font-medium text-slate-700 hover:text-[#876500]" href="#controles">08 · Controles y límites</a>
          </div>
        </aside>

        <div className="prose prose-slate mt-8 max-w-none prose-headings:tracking-tight prose-a:text-[#876500] [&_p]:text-justify [&_li]:text-justify">
          <section>
            <h2 id="ley-oro">01. Interpretar la ley del oro</h2>
            <p>En una aleación de oro expresada en quilates, el valor indica cuántas partes de oro fino hay por cada 24 partes de masa. Por eso, el oro de 24K se toma como referencia teórica de pureza, mientras que las aleaciones de 18K, 14K y 9K contienen proporciones menores de oro y el resto corresponde a otros metales.</p>
            <ul>
              <li><strong>18K:</strong> 18 ÷ 24 = 0,750; equivale nominalmente a 75 % de oro fino.</li>
              <li><strong>14K:</strong> 14 ÷ 24 ≈ 0,5833; equivale nominalmente a 58,33 % de oro fino.</li>
              <li><strong>9K:</strong> 9 ÷ 24 = 0,375; equivale nominalmente a 37,5 % de oro fino.</li>
            </ul>
            <p>Estas proporciones describen la ley nominal. Los requisitos legales, las tolerancias y las denominaciones comerciales pueden variar según el país; confirma la normativa aplicable antes de marcar o comercializar una pieza.</p>
          </section>

          <section>
            <h2 id="formula-oro-fino">02. Calcular el contenido de oro fino</h2>
            <p>Para una masa total teórica conocida, calcula el contenido de oro fino multiplicando la masa por la ley expresada como fracción:</p>
            <div className="my-5 rounded-xl border border-[#eadca7] bg-[#fff9df] p-5 text-center">
              <p className="text-lg font-bold text-[#604900]">Oro fino = masa total × (quilates ÷ 24)</p>
            </div>
            <p>El metal de liga teórico es la diferencia entre la masa total y el oro fino:</p>
            <div className="my-5 rounded-xl border border-slate-200 bg-white p-5 text-center">
              <p className="text-lg font-bold">Metal de liga = masa total − oro fino</p>
            </div>
          </section>

          <section>
            <h2 id="ejemplo-10g">03. Ejemplo de cálculo para 10 gramos</h2>
            <p>Si el objetivo es preparar 10 g de aleación final y se parte de componentes puros con masa suficiente, las cantidades teóricas son:</p>
            <div className="my-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[320px] border-collapse text-left text-sm">
                <thead className="bg-slate-50"><tr><th className="border-b border-slate-200 px-4 py-3">Ley objetivo</th><th className="border-b border-slate-200 px-4 py-3">Oro fino</th><th className="border-b border-slate-200 px-4 py-3">Metal de liga</th></tr></thead>
                <tbody>
                  <tr><td className="border-b border-slate-100 px-4 py-3 font-semibold">18K</td><td className="border-b border-slate-100 px-4 py-3">7,50 g</td><td className="border-b border-slate-100 px-4 py-3">2,50 g</td></tr>
                  <tr><td className="border-b border-slate-100 px-4 py-3 font-semibold">14K</td><td className="border-b border-slate-100 px-4 py-3">5,83 g aprox.</td><td className="border-b border-slate-100 px-4 py-3">4,17 g aprox.</td></tr>
                  <tr><td className="px-4 py-3 font-semibold">9K</td><td className="px-4 py-3">3,75 g</td><td className="px-4 py-3">6,25 g</td></tr>
                </tbody>
              </table>
            </div>
            <p>Las cantidades son teóricas y están redondeadas para facilitar la lectura. Para un lote real, calcula con la precisión de tu balanza y considera la ley certificada de cada insumo. La composición del metal de liga depende del color y de las propiedades que se busquen en la aleación; no todos los metales de liga son intercambiables.</p>
          </section>

          <section>
            <h2 id="balance-masa">04. Ajustar una aleación mediante balance de masa</h2>
            <p>Para modificar la ley de un lote, registra la masa inicial y la finura de oro de cada material. La finura se expresa como fracción másica: por ejemplo, 18K nominal equivale a 18/24 = 0,750. El balance conserva la masa de oro fino antes y después de añadir material.</p>
            <div className="my-5 rounded-xl border border-[#eadca7] bg-[#fff9df] p-5 text-center">
              <p className="font-bold text-[#604900]">m inicial × f inicial + m añadido × f añadido = m final × f objetivo</p>
            </div>
            <p>En estas expresiones, <strong>m</strong> representa masa en gramos y <strong>f</strong> la fracción másica de oro fino. Las fórmulas suponen que las leyes de entrada son conocidas y que el proceso no introduce pérdidas ni contaminación.</p>
          </section>

          <section>
            <h2 id="bajar-ley">05. Reducir la ley añadiendo metal de liga</h2>
            <p>Cuando se añade una liga que no contiene oro fino (f añadido = 0), la masa de liga necesaria es:</p>
            <div className="my-5 rounded-xl border border-slate-200 bg-white p-5 text-center">
              <p className="font-bold">x = m inicial × (f inicial − f objetivo) ÷ f objetivo</p>
            </div>
            <p><strong>Ejemplo:</strong> para bajar 100 g de oro fino 24K a 18K (f objetivo = 0,750), se necesitan 33,33 g de liga sin oro. La masa teórica final será 133,33 g.</p>
            <p>La fórmula determina la masa total de liga. El reparto entre cobre, plata, zinc, paladio u otros componentes depende de una formulación metalúrgica apropiada para el color, las propiedades y el proceso; no debe asumirse que una receta genérica sirve para todas las aleaciones.</p>
          </section>

          <section>
            <h2 id="subir-ley">06. Elevar la ley añadiendo oro fino</h2>
            <p>Si se añade oro fino de 24K (f añadido = 1) para elevar la ley, la masa necesaria es:</p>
            <div className="my-5 rounded-xl border border-slate-200 bg-white p-5 text-center">
              <p className="font-bold">x = m inicial × (f objetivo − f inicial) ÷ (1 − f objetivo)</p>
            </div>
            <p><strong>Ejemplo:</strong> para elevar 100 g de 14K exacto (14/24 = 0,583333) a 18K (0,750), se añaden 66,67 g de oro fino. La masa teórica final será 166,67 g.</p>
            <p>Si el material inicial está ensayado a 585‰, utiliza f = 0,585 en el cálculo en lugar de sustituirlo automáticamente por 14/24. El quilataje nominal y la finura ensayada no siempre son idénticos.</p>
          </section>

          <section>
            <h2 id="mezclar-aleaciones">07. Mezclar dos aleaciones de ley conocida</h2>
            <p>Para mezclar un lote inicial con una segunda aleación de finura conocida y alcanzar una ley intermedia:</p>
            <div className="my-5 rounded-xl border border-slate-200 bg-white p-5 text-center">
              <p className="font-bold">x = m inicial × (f objetivo − f inicial) ÷ (f añadido − f objetivo)</p>
            </div>
            <p><strong>Ejemplo:</strong> para mezclar 100 g de 14K exacto con una aleación de 18K y obtener 16K, se añaden 100 g de la aleación de 18K. El resultado teórico es 200 g a 16K (666,67‰).</p>
            <p>La ley objetivo debe quedar estrictamente entre las leyes de ambos materiales. Esta operación calcula la ley media de oro; no garantiza por sí sola compatibilidad de color, dureza, soldabilidad ni comportamiento metalúrgico.</p>
          </section>

          <section>
            <h2 id="controles">08. Controles y límites del cálculo</h2>
            <ul>
              <li>Utiliza la ley ensayada o documentada de cada material siempre que esté disponible.</li>
              <li>No asumas que piezas usadas, soldaduras, recubrimientos o lotes mezclados tienen una ley uniforme.</li>
              <li>Las pérdidas de proceso, contaminación y cambios de composición pueden hacer que la ley real difiera del resultado teórico.</li>
              <li>Registra las masas de entrada y verifica el lote con un método de ensayo apropiado antes de certificar o marcar su ley.</li>
              <li>La calculadora no sustituye la ficha técnica de una liga comercial ni las indicaciones del proveedor.</li>
            </ul>
          </section>

          <section>
            <h2>9. Pasos recomendados antes de fundir</h2>
            <ol>
              <li>Define la ley final y la masa total deseada.</li>
              <li>Verifica la masa, la ley y la procedencia de cada material de partida.</li>
              <li>Calcula el contenido de oro fino y la fracción restante de liga.</li>
              <li>Selecciona una liga compatible con el color, la aplicación y el proceso de fabricación.</li>
              <li>Registra los pesos y verifica el resultado con los controles habituales del taller.</li>
            </ol>
            <p>Los cálculos no sustituyen los procedimientos de seguridad, el control de composición ni las especificaciones del proveedor de la aleación. Utiliza equipo de protección adecuado y sigue las prácticas de fundición de tu taller.</p>
          </section>

          <section className="not-prose mt-10 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">Bibliografía y referencias</p>
            <h2 className="mt-2 text-xl font-bold text-[#17232d]">Fuentes técnicas consultadas</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Esta guía es una explicación didáctica original de AURUM LAB. Las referencias siguientes respaldan los conceptos de finura, identificación de ley y composición; no sustituyen la norma aplicable ni el ensayo del lote.</p>
            <ol className="mt-5 space-y-4 text-sm leading-6 text-slate-700">
              <li><strong>Instituto Nacional de Calidad (INACAL, Perú).</strong> Recomendaciones sobre la identificación clara e indeleble de la ley del metal precioso en productos de joyería y orfebrería. <a className="font-semibold text-[#876500] underline" href="https://www.gob.pe/institucion/inacal/noticias/1162243-dia-de-la-madre-inacal-recomienda-elegir-regalos-con-criterios-de-seguridad-y-calidad" target="_blank" rel="noreferrer">Consultar publicación oficial</a>.</li>
              <li><strong>World Gold Council.</strong> Gold Jewellery: Colour, Carat & Purity. Referencia internacional sobre quilataje y finuras habituales; explica, entre otros puntos, la diferencia entre 14K teórico (14/24) y la marca comercial 585‰ usada en muchos mercados. <a className="font-semibold text-[#876500] underline" href="https://www.gold.org/about-gold/about-gold-jewellery" target="_blank" rel="noreferrer">Consultar documento</a>.</li>
              <li><strong>World Gold Council.</strong> Gold Hallmarks & Makers Marks. Contexto sobre marcas de finura, identificación y diferencias entre sistemas nacionales. <a className="font-semibold text-[#876500] underline" href="https://www.gold.org/about-gold/about-gold-jewellery/gold-hallmarks" target="_blank" rel="noreferrer">Consultar documento</a>.</li>
              <li><strong>GOV.UK.</strong> Hallmarking: practical guidance – summary. Ejemplo regulatorio del Reino Unido sobre finura expresada en partes por mil y marcas de contraste. Se cita como referencia comparativa, no como legislación peruana. <a className="font-semibold text-[#876500] underline" href="https://www.gov.uk/government/publications/hallmarking-guidance-notes/hallmarking-is-the-law-guidance-summary" target="_blank" rel="noreferrer">Consultar guía oficial</a>.</li>
            </ol>
            <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">Criterio editorial: los cálculos de masa de esta guía son balances teóricos. Para declarar o marcar la ley de una pieza, confirma la composición mediante documentación o ensayo apropiado y revisa los requisitos vigentes del mercado donde se comercializa.</p>
          </section>

          <section>
            <h2>Preguntas frecuentes</h2>
            <h3>¿El oro de 18K siempre contiene exactamente 75 % de oro?</h3>
            <p>18K representa una ley nominal de 18 partes de oro de cada 24, equivalente al 75 %. La conformidad real depende de la composición comprobada y de las tolerancias aplicables.</p>
            <h3>¿Puedo usar cualquier metal para completar la aleación?</h3>
            <p>No. La selección de la liga afecta el color, la dureza, la fundibilidad y otras propiedades. Utiliza una formulación adecuada para la ley, el color y el proceso previstos.</p>
            <h3>¿La calculadora garantiza la ley final después de fundir?</h3>
            <p>No. Una calculadora proporciona una estimación a partir de los datos ingresados. La ley efectiva depende de los materiales reales, el proceso y las pérdidas o contaminaciones; verifica la pieza o el lote con un método apropiado cuando corresponda.</p>
            <h3>¿Cómo estimo el peso de la joya antes de calcular la aleación?</h3>
            <p>Si ya tienes un diseño tridimensional, puedes estimar primero su masa teórica a partir del volumen y de la densidad del metal. Consulta también nuestra <a href="/guias/calcular-peso-joya-modelo-3d">guía para estimar el peso de una joya desde un modelo 3D</a>. Esa estimación ayuda a planificar material, pero no reemplaza la verificación de la ley ni el pesaje final.</p>
          </section>
        </div>

        <section className="mt-10 rounded-2xl border border-[#eadca7] bg-gradient-to-br from-[#fff9df] to-white p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]">Llévalo a la práctica</p>
              <h2 className="mt-2 text-xl font-bold">Calcula tu aleación de oro</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Introduce los datos de tu material en la calculadora pública y revisa las cantidades estimadas antes de preparar el lote.</p>
            </div>
            <Link to="/herramientas-publicas/$herramienta" params={{ herramienta: "aleacion-oro" }} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#17232d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#293b49]"><Calculator className="size-4" /> Abrir calculadora <ArrowRight className="size-4" /></Link>
          </div>
        </section>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
          <Link to="/guias" className="inline-flex items-center gap-2 text-sm font-semibold text-[#876500] hover:text-[#5f4900]"><ArrowLeft className="size-4" /> Más guías técnicas</Link>
          <Link to="/auth" className="inline-flex items-center gap-2 text-sm font-semibold text-[#17232d] hover:text-[#876500]">Explorar AURUM LAB <ArrowRight className="size-4" /></Link>
        </div>
      </article>
    </main>
  );
}
