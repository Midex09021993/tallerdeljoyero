import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Calculator, Gem } from "lucide-react";
import { MicroGuiaOro, microGuiasOro, type MicroGuiaOroSlug } from "@/components/seo/MicroGuiaAleaciones";
import { MicroGuiaPeso3D, microGuiasPeso3D, type MicroGuiaPeso3DSlug } from "@/components/seo/MicroGuiasPeso3D";

const slugGuia = "calcular-aleaciones-oro-18k-14k-9k";
const slugPeso = "calcular-peso-joya-modelo-3d";
const slugPlano = "distribucion-taller-joyeria";
const slugImpresion = "impresion-3d-joyeria";
const slugFundicion = "fundicion-joyeria-revestimiento-omni-cast";
const slugGemas = "calcular-peso-gemas-por-medidas";
const slugTallas = "convertir-tallas-anillos-espana-europa-usa";

export const Route = createFileRoute("/guias/$slug")({
  head: ({ params }) => {
    const valida = [slugGuia, slugPeso, slugPlano, slugImpresion, slugFundicion, slugGemas, slugTallas, ...Object.keys(microGuiasOro), ...Object.keys(microGuiasPeso3D)].includes(params.slug);
    const micro = microGuiasOro[params.slug as MicroGuiaOroSlug];
    const microPeso = microGuiasPeso3D[params.slug as MicroGuiaPeso3DSlug];
    const titulo = microPeso?.title ?? micro?.title ?? (params.slug === slugPeso ? "Cómo estimar el peso de una joya desde un modelo 3D" : params.slug === slugPlano ? "Distribución de un taller de joyería: zonas, flujo y seguridad" : params.slug === slugImpresion ? "Impresión 3D para joyería: del archivo a la pieza" : params.slug === slugFundicion ? "Fundición de joyería: guía del revestimiento y preparación del cilindro" : params.slug === slugGemas ? "Cómo estimar el peso de una gema por sus medidas" : params.slug === slugTallas ? "Cómo convertir tallas de anillos entre España, Europa y USA" : "Cómo calcular aleaciones de oro de 18K, 14K y 9K");
    const descripcion = microPeso?.description ?? micro?.description ?? (params.slug === slugPeso ? "Guía técnica para validar el volumen de un modelo 3D, controlar unidades y estimar la masa de una joya según la densidad de su aleación." : params.slug === slugPlano ? "Guía para organizar zonas de diseño CAD, impresión 3D, posprocesado, fundición y acabado, con criterios de circulación, ventilación y seguridad." : params.slug === slugImpresion ? "Etapas de impresión 3D para joyería, desde la preparación del archivo hasta el posprocesado y la fundición." : params.slug === slugFundicion ? "Guía práctica en español para entender el revestimiento de fundición, la proporción agua/polvo, el calentamiento del cilindro y las referencias del manual Whip Mix Omni-Cast." : params.slug === slugGemas ? "Guía gemológica para estimar el peso en quilates mediante dimensiones, gravedad específica, forma de talla y proporciones de la piedra." : params.slug === slugTallas ? "Aprende a medir el diámetro interior de un anillo y consultar equivalencias de tallas de España, Europa ISO y Estados Unidos." : "Aprende a calcular el oro fino y el metal de liga en aleaciones de 18K, 14K y 9K, con fórmulas y ejemplos prácticos para joyeros.");
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
  if (![slugGuia, slugPeso, slugPlano, slugImpresion, slugFundicion, slugGemas, slugTallas, ...Object.keys(microGuiasOro), ...Object.keys(microGuiasPeso3D)].includes(slug)) {
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

  if (Object.prototype.hasOwnProperty.call(microGuiasOro, slug)) return <MicroGuiaOro slug={slug as MicroGuiaOroSlug} />;

  if (Object.prototype.hasOwnProperty.call(microGuiasPeso3D, slug)) return <MicroGuiaPeso3D slug={slug as MicroGuiaPeso3DSlug} />;

  if (slug === slugGemas) {
    return (
      <main className="min-h-screen bg-[#fffefa] text-[#17232d]">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex min-h-[68px] max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
            <Link to="/guias" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#987400]"><ArrowLeft className="size-4" /> Todas las guías</Link>
            <Link to="/herramientas-publicas/$herramienta" params={{ herramienta: "peso-gemas" }} className="rounded-full bg-[#17232d] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#293b49]">Calculadora de peso de gemas</Link>
          </div>
        </header>
        <article className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
          <nav aria-label="Ruta de navegación" className="text-xs text-slate-500"><Link to="/guias" className="hover:text-[#876500]">Guías técnicas</Link><span aria-hidden="true"> / </span><span>Gemología</span></nav>
          <header className="relative mt-6 overflow-hidden rounded-[1.75rem] border border-[#eadca7] bg-gradient-to-br from-[#fff9e8] via-white to-[#f5f7fa] p-6 pb-8 sm:p-9">
            <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full border-[24px] border-[#f5e8bd]/45" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#e8d7a4] bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">Gemología</span><span className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">Manual técnico · AURUM LAB</span></div>
              <h1 className="mt-5 max-w-3xl text-3xl font-extrabold leading-[1.08] tracking-tight text-[#17232d] sm:text-5xl">Cómo estimar el peso de una gema por sus medidas</h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">Aprende a convertir dimensiones en una estimación de quilates mediante la forma de talla, la gravedad específica y las proporciones de la piedra. Una metodología práctica para el taller, con sus alcances y límites gemológicos.</p>
              <div className="mt-6 flex flex-wrap gap-2"><span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">Nivel: básico–intermedio</span><span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">Lectura: 10–12 min</span><span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">Unidades: mm · ct · g</span></div>
            </div>
          </header>

          <section className="mt-7 grid gap-3 sm:grid-cols-3" aria-label="Conceptos gemológicos clave">
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quilate métrico</p><p className="mt-1 text-2xl font-extrabold text-[#17232d]">0,20 g</p><p className="text-xs text-slate-500">Equivalencia exacta de 1 ct</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Gravedad específica</p><p className="mt-1 text-2xl font-extrabold text-[#17232d]">SG</p><p className="text-xs text-slate-500">Relación con igual volumen de agua</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Factor de forma</p><p className="mt-1 text-2xl font-extrabold text-[#17232d]">Talla</p><p className="text-xs text-slate-500">Compensa el volumen geométrico aproximado</p></div>
          </section>

          <aside className="mt-7 rounded-2xl border border-slate-200 bg-[#f7f8fa] p-5 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">En esta guía</p>
            <div className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#quilate">01 · El quilate métrico</a>
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#medicion">02 · Medir la gema</a>
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#sg">03 · Gravedad específica</a>
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#forma">04 · Forma y factor de talla</a>
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#formula">05 · Fórmula y ejemplo</a>
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#perfil">06 · Proporciones y correcciones</a>
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#calculadora">07 · Usar la calculadora</a>
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#limites">08 · Límites y control</a>
            </div>
          </aside>

          <div className="prose prose-slate mt-8 max-w-none prose-headings:scroll-mt-24 prose-headings:tracking-tight prose-headings:font-bold prose-headings:text-[#17232d] prose-h2:mb-3 prose-h2:mt-12 prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-3 prose-p:leading-7 prose-li:leading-7 prose-a:text-[#876500] [&_p]:text-justify [&_li]:text-justify">
            <section>
              <h2 id="quilate">01. El quilate métrico: masa, no tamaño</h2>
              <p>En gemología, el quilate métrico (ct) es una unidad de masa. Un quilate equivale exactamente a 0,20 gramos o 200 miligramos y se divide en 100 puntos. Por tanto, 0,50 ct equivale a medio quilate y 1,25 ct equivale a un quilate y veinticinco puntos.</p>
              <div className="not-prose my-6 rounded-2xl border border-[#eadca7] bg-[#fff9df] p-5 text-center sm:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#987400]">Conversión fundamental</p><p className="mt-2 text-xl font-extrabold text-[#604900] sm:text-2xl">1 ct = 0,20 g</p><p className="mt-2 text-sm text-slate-600">Quilates = gramos × 5 · Gramos = quilates × 0,20</p></div>
              <p>No confundas el quilate de las gemas (ct), que expresa masa, con el quilate del oro (K), que expresa proporción de oro fino en una aleación. Son conceptos y magnitudes diferentes.</p>
            </section>

            <section>
              <h2 id="medicion">02. Cómo medir correctamente una gema</h2>
              <p>Para estimar el peso de una piedra suelta necesitas, como mínimo, largo, ancho y profundidad en milímetros. La medición debe seguir los ejes máximos de la piedra y no la dimensión aparente de una fotografía.</p>
              <ul>
                <li><strong>Largo:</strong> dimensión máxima de extremo a extremo en la vista superior.</li>
                <li><strong>Ancho:</strong> dimensión perpendicular al largo, también en vista superior.</li>
                <li><strong>Profundidad:</strong> distancia desde la parte superior de la corona hasta la base del pabellón o del cabujón.</li>
                <li><strong>Forma:</strong> identifica el contorno de la talla: redonda, oval, esmeralda/rectangular, cuadrada, pera, marquise, corazón o cabujón, entre otras.</li>
                <li><strong>Perfil:</strong> observa la altura de la corona, el grosor de la cintura, la profundidad del pabellón y cualquier abultamiento inferior.</li>
              </ul>
              <p>En una piedra montada, la montura puede ocultar la cintura o el pabellón e impedir medir la profundidad real. En ese caso, documenta qué dimensiones son observadas y cuáles son estimadas; la incertidumbre aumenta.</p>
            </section>

            <section>
              <h2 id="sg">03. Gravedad específica: por qué dos gemas del mismo tamaño pesan distinto</h2>
              <p>La gravedad específica (SG) expresa la relación entre la densidad de un material y la densidad del agua de referencia. En gemología se utiliza para describir cuánto pesa una gema respecto de un volumen igual de agua. Es un parámetro del material, no de la forma de la talla.</p>
              <p>Por ejemplo, el diamante tiene una SG aproximada de 3,52, mientras que el corindón (rubí y zafiro) suele situarse alrededor de 4,0. Por ello, dos piedras con dimensiones y proporciones semejantes pueden tener masas diferentes si están hechas de materiales distintos.</p>
              <p>La SG puede variar dentro de una especie por composición, sustituciones químicas, inclusiones y otras características. Utiliza rangos de referencia gemológicos y no supongas que una cifra única identifica por sí sola una piedra.</p>
            </section>

            <section>
              <h2 id="forma">04. La forma de talla y el factor de forma</h2>
              <p>Largo × ancho × profundidad describe el volumen de una caja rectangular, no el volumen real de una gema facetada. Para aproximar el volumen de la piedra se aplica un factor de forma, que varía según el contorno y el tipo de talla.</p>
              <p>Una talla redonda brillante, una oval, una esmeralda rectangular y un cabujón no ocupan la misma fracción de la caja imaginaria que contiene sus dimensiones. Por eso no existe un único factor universal que sea correcto para todas las formas.</p>
              <p>Los métodos publicados por GIA emplean factores de forma basados en mediciones de piedras y distinguen la silueta vista desde arriba y las variaciones de perfil. Las fórmulas de estimación son aproximaciones estadísticas para piedras de proporciones habituales, no sustitutos de una medición directa.</p>
            </section>

            <section>
              <h2 id="formula">05. Fórmula de estimación y ejemplo práctico</h2>
              <p>Una forma general de expresar el método es:</p>
              <div className="not-prose my-6 rounded-2xl border border-[#eadca7] bg-[#fff9df] p-5 text-center sm:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#987400]">Modelo de estimación</p><p className="mt-2 text-lg font-extrabold text-[#604900] sm:text-xl">Peso (ct) ≈ L × A × P × SG × F</p><p className="mt-2 text-xs leading-5 text-slate-600">L, A y P en milímetros · SG = gravedad específica · F = factor de forma calibrado para la talla</p></div>
              <p>El factor F incorpora la geometría aproximada y la conversión de unidades según la convención de la fórmula utilizada. No mezcles factores de distintas tablas o metodologías: comprueba siempre sus unidades y definición.</p>
              <p><strong>Ejemplo ilustrativo:</strong> una gema oval de 8 × 6 × 4 mm, con SG supuesta de 3,52 y un factor de forma de 0,0020 tomado de una tabla de estimación para ovales bien proporcionados:</p>
              <ol><li>Multiplica las dimensiones: 8 × 6 × 4 = 192.</li><li>Multiplica por la SG: 192 × 3,52 = 675,84.</li><li>Aplica el factor de forma: 675,84 × 0,0020 ≈ 1,35 ct.</li></ol>
              <p>El resultado es una estimación didáctica condicionada a que la forma, la SG y las proporciones coincidan con los supuestos. No debe interpretarse como el peso real de una piedra concreta.</p>
            </section>

            <section>
              <h2 id="perfil">06. Proporciones: cintura, corona y pabellón</h2>
              <p>Dos gemas con el mismo contorno y las mismas medidas máximas pueden diferir en peso por su perfil. Una piedra más profunda puede contener más volumen; una cintura más gruesa también puede aumentar la masa. Una corona alta, un pabellón abultado o una culata pronunciada pueden apartar la piedra de las proporciones promedio asumidas por la fórmula.</p>
              <ul><li><strong>Cintura delgada:</strong> puede reducir la masa respecto al modelo promedio.</li><li><strong>Cintura gruesa:</strong> puede incrementarla.</li><li><strong>Pabellón profundo o abultado:</strong> puede añadir volumen que no se aprecia en la vista superior.</li><li><strong>Proporciones poco habituales:</strong> pueden hacer que la estimación se desvíe de forma significativa.</li></ul>
              <p>GIA describe el uso de factores de corrección para piedras cuyo perfil difiere de las proporciones de referencia. En una práctica profesional, no apliques porcentajes improvisados: utiliza una metodología publicada y registra cualquier corrección que realices.</p>
            </section>

            <section>
              <h2 id="calculadora">07. Cómo utilizar la calculadora de peso de gemas de AURUM LAB</h2>
              <ol><li>Si ya conoces la masa en gramos, utiliza el modo «Peso real» para convertirla a quilates.</li><li>Si necesitas estimar una piedra, selecciona «Estimar por medidas».</li><li>Elige el material correcto y la forma de talla que mejor represente la gema.</li><li>Introduce largo, ancho y profundidad en milímetros, utilizando medidas fiables.</li><li>Revisa el resultado en quilates y gramos y considera el rango orientativo si la herramienta lo proporciona.</li></ol>
              <p>La selección de material y forma es esencial: la herramienta aplica los parámetros asociados a esas opciones. Si no conoces con seguridad el material o la talla, el resultado debe considerarse preliminar.</p>
            </section>

            <section>
              <h2 id="limites">08. Límites del método y control gemológico</h2>
              <p>La estimación por dimensiones es especialmente útil cuando la gema no puede retirarse de una montura o cuando se necesita una referencia inicial. Sin embargo, no sustituye el pesaje de una piedra suelta con una balanza gemológica calibrada.</p>
              <ul><li>Las medidas imprecisas afectan directamente al cálculo.</li><li>La SG debe corresponder al material real y puede presentar variaciones naturales.</li><li>Las tallas comerciales no siempre siguen proporciones promedio.</li><li>Los tratamientos, rellenos, ensamblajes o materiales compuestos pueden invalidar una estimación basada en una gema sólida homogénea.</li><li>En piedras montadas, parte de la geometría puede quedar oculta.</li></ul>
              <p>Para tasación, compraventa, certificación o documentación comercial, registra el peso medido cuando sea posible. Si solo dispones de una estimación, identifícala expresamente como tal y no la presentes como peso certificado.</p>
            </section>

            <section>
              <h2>Preguntas frecuentes</h2>
              <h3>¿Cuántos quilates equivale un gramo?</h3><p>Un gramo equivale a cinco quilates métricos, porque 1 ct corresponde a 0,20 g.</p>
              <h3>¿Dos diamantes del mismo diámetro pesan lo mismo?</h3><p>No necesariamente. La profundidad, las proporciones de la talla y el grosor de la cintura pueden cambiar el volumen y el peso.</p>
              <h3>¿Puedo estimar el peso de una esmeralda o un rubí por sus medidas?</h3><p>Sí, como aproximación, si conoces el material, utilizas una SG razonable y eliges el factor de forma adecuado. Las proporciones reales pueden hacer que el resultado varíe.</p>
              <h3>¿La estimación reemplaza el peso de una balanza?</h3><p>No. Es una referencia orientativa. Para conocer la masa real de una piedra suelta, utiliza una balanza gemológica calibrada.</p>
              <h3>¿Puedo estimar una gema que ya está engastada?</h3><p>Es posible si puedes obtener medidas suficientemente fiables, pero la montura puede ocultar la profundidad y las proporciones. Indica siempre que se trata de una estimación.</p>
            </section>
          </div>

          <section className="not-prose mt-10 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">Bibliografía y referencias</p>
            <h2 className="mt-2 text-xl font-bold text-[#17232d]">Fuentes gemológicas consultadas</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Esta guía es una síntesis didáctica original de AURUM LAB. Las fuentes siguientes respaldan las unidades, los principios de gravedad específica y los métodos de estimación por forma y proporciones.</p>
            <ol className="mt-5 space-y-4 text-sm leading-6 text-slate-700">
              <li><strong>Gemological Institute of America (GIA).</strong> 4Cs: Carat Weight. Define el quilate métrico, su equivalencia de 0,20 gramos y la división en puntos. <a className="font-semibold text-[#876500] underline" href="https://www.gia.edu/gia-about/4cs-carat" target="_blank" rel="noreferrer">Consultar GIA</a>.</li>
              <li><strong>GIA, Gems &amp; Gemology.</strong> Estimating Weights of Mounted Colored Gemstones. Explica el uso de dimensiones, gravedad específica, factor de forma y correcciones de perfil a partir de muestras medidas. <a className="font-semibold text-[#876500] underline" href="https://www.gia.edu/gems-gemology/fall-1998-estimating-weights-mounted-stones-carmona" target="_blank" rel="noreferrer">Consultar artículo técnico</a>.</li>
              <li><strong>International Gem Society (IGS).</strong> Specific Gravity Values of Selected Gems. Referencia introductoria de valores y rangos de gravedad específica de materiales gemológicos. <a className="font-semibold text-[#876500] underline" href="https://www.gemsociety.org/article/select-gems-ordered-density/" target="_blank" rel="noreferrer">Consultar tabla de SG</a>.</li>
              <li><strong>IGS.</strong> How to Estimate Gem Weight in a Jewelry Setting. Describe mediciones, fórmulas por forma y limitaciones por proporciones. <a className="font-semibold text-[#876500] underline" href="https://www.gemsociety.org/article/estimating-gem-weight/" target="_blank" rel="noreferrer">Consultar metodología</a>.</li>
            </ol>
            <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">Nota: los factores de forma varían según la fuente, la geometría y la población de piedras utilizada para calibrarlos. El ejemplo numérico es ilustrativo y no constituye una fórmula universal ni un certificado gemológico.</p>
          </section>

          <section className="mt-10 rounded-2xl border border-[#eadca7] bg-gradient-to-br from-[#fff9df] to-white p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]">Llévalo a la práctica</p>
            <h2 className="mt-2 text-xl font-bold">Estima el peso de tu gema</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Introduce las dimensiones, selecciona el material y la talla y utiliza el resultado como referencia antes de confirmar el peso real.</p>
            <Link to="/herramientas-publicas/$herramienta" params={{ herramienta: "peso-gemas" }} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#17232d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#293b49]"><ArrowRight className="size-4" /> Abrir calculadora de peso de gemas</Link>
          </section>
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold">Guías especializadas sobre peso de joyas</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Continúa con una consulta específica de cálculo, preparación o fabricación:</p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              <li><Link to="/guias/$slug" params={{ slug: "calcular-peso-anillo-oro-antes-fundir" }} className="text-sm font-semibold text-[#876500] hover:underline">Calcular peso de un anillo antes de fundirlo →</Link></li>
              <li><Link to="/guias/$slug" params={{ slug: "calcular-peso-oro-archivo-stl" }} className="text-sm font-semibold text-[#876500] hover:underline">Calcular peso de oro desde STL →</Link></li>
              <li><Link to="/guias/$slug" params={{ slug: "calcular-peso-joya-volumen" }} className="text-sm font-semibold text-[#876500] hover:underline">Peso de joya según volumen →</Link></li>
              <li><Link to="/guias/$slug" params={{ slug: "cuanto-oro-necesito-fabricar-joya" }} className="text-sm font-semibold text-[#876500] hover:underline">Cuánto metal necesito para fabricar →</Link></li>
              <li><Link to="/guias/$slug" params={{ slug: "estimar-peso-oro-impresion-resina" }} className="text-sm font-semibold text-[#876500] hover:underline">Estimar oro desde impresión de resina →</Link></li>
            </ul>
          </section>
          <div className="mt-8 border-t border-slate-200 pt-6"><Link to="/guias" className="inline-flex items-center gap-2 text-sm font-semibold text-[#876500]"><ArrowLeft className="size-4" /> Volver a las guías técnicas</Link></div>
        </article>
      </main>
    );
  }

  if (slug === slugTallas) {
    const capitulos = [
      ["#medidas", "1. Diámetro y circunferencia"],
      ["#sistemas", "2. España, Europa ISO y USA"],
      ["#relacion", "3. Cómo se relacionan las medidas"],
      ["#medir-anillo", "4. Medir un anillo existente"],
      ["#medir-dedo", "5. Medir directamente el dedo"],
      ["#pantalla", "6. Medición visual en pantalla"],
      ["#fabricacion", "7. Criterios para fabricación"],
      ["#errores", "8. Errores frecuentes y control final"],
    ] as const;
    return (
      <main className="min-h-screen bg-[#fffefa] text-[#17232d]">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex min-h-[68px] max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
            <Link to="/guias" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#987400]"><ArrowLeft className="size-4" /> Todas las guías</Link>
            <Link to="/herramientas-publicas/$herramienta" params={{ herramienta: "tallas-anillos" }} className="rounded-full bg-[#17232d] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#293b49]">Abrir conversor</Link>
          </div>
        </header>
        <article className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
          <nav aria-label="Ruta de navegación" className="text-xs text-slate-500"><Link to="/guias" className="hover:text-[#876500]">Guías técnicas</Link><span aria-hidden="true"> / </span><span>Medidas y tallas</span></nav>
          <header className="mt-6 border-b border-slate-200 pb-8">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">Medidas y tallas · Manual técnico AURUM LAB</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">Cómo convertir tallas de anillos entre España, Europa y USA</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">Una talla no es un número universal. Para convertirla sin confusiones, identifica el sistema de origen, mide correctamente el diámetro interior y contrasta la equivalencia con la circunferencia correspondiente.</p>
            <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-medium text-slate-600"><span className="rounded-full border border-slate-200 px-3 py-1.5">Diámetro en mm</span><span className="rounded-full border border-slate-200 px-3 py-1.5">España · Europa ISO · USA</span><span className="rounded-full border border-slate-200 px-3 py-1.5">Control para taller</span></div>
          </header>
          <nav aria-label="Contenido de la guía" className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]">Contenido de la guía</p>
            <ol className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {capitulos.map(([href, label]) => <li key={href}><a className="text-slate-600 underline-offset-4 hover:text-[#876500] hover:underline" href={href}>{label}</a></li>)}
            </ol>
          </nav>
          <div className="prose prose-slate mt-9 max-w-none prose-headings:tracking-tight prose-a:text-[#876500] [&_p]:text-justify [&_li]:text-justify">
            <section id="medidas" className="scroll-mt-8">
              <h2>1. Diámetro interior y circunferencia: dos medidas diferentes</h2>
              <p>El diámetro interior (D) es la distancia recta entre dos puntos opuestos de la abertura del anillo, pasando por el centro. La circunferencia interior (C) es la longitud del contorno de esa abertura. Se expresan en milímetros, pero no son intercambiables.</p>
              <p>La relación geométrica es <strong>C = π × D</strong>, donde π ≈ 3,1416. Por ejemplo, un diámetro interior de 19,6 mm corresponde a una circunferencia geométrica aproximada de 61,6 mm. La medida real de tallaje puede depender del método y del instrumento normalizado utilizado.</p>
              <p>La norma ISO 8653:2016 define la talla mediante la circunferencia del mayor cilindro que puede introducirse en el anillo y establece un método de control con mandril o palo medidor de anillos. Por eso, para control de fabricación conviene medir con instrumental apropiado y no depender únicamente de una conversión matemática.</p>
            </section>
            <section id="sistemas" className="scroll-mt-8">
              <h2>2. Diferencias entre España, Europa ISO y Estados Unidos</h2>
              <h3>España</h3>
              <p>La numeración española utilizada por muchas tablas comerciales es distinta de la numeración europea ISO. En la tabla de referencia integrada en el conversor de AURUM LAB, por ejemplo, el diámetro de 19,6 mm aparece asociado a talla española 22.</p>
              <h3>Europa ISO</h3>
              <p>La designación ISO se basa en la circunferencia interior expresada en milímetros. En la tabla de referencia del conversor, el mismo ejemplo de 19,6 mm se relaciona con la referencia europea ISO 62. No confundas este valor con el diámetro en milímetros.</p>
              <h3>Estados Unidos (USA)</h3>
              <p>El sistema estadounidense utiliza números y, en algunas tablas, fracciones de talla. La equivalencia puede variar ligeramente entre tablas comerciales y fabricantes. El conversor presenta la referencia USA que corresponde a su tabla configurada; si el proveedor trabaja con otra tabla, confirma su estándar antes de emitir una orden.</p>
              <p><strong>Importante:</strong> no existe una conversión fiable por simple sustitución del número. Selecciona el sistema correcto en la herramienta y consulta la fila equivalente.</p>
            </section>
            <section id="relacion" className="scroll-mt-8">
              <h2>3. Cómo se relacionan las medidas</h2>
              <p>Para entender la relación entre los sistemas, utiliza el diámetro como medida física de partida y la circunferencia como referencia geométrica. El conversor busca una fila de su tabla y devuelve las tallas española, europea ISO y USA disponibles.</p>
              <div className="not-prose my-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="px-4 py-3">Diámetro interior</th><th className="px-4 py-3">España</th><th className="px-4 py-3">Europa ISO</th><th className="px-4 py-3">USA</th></tr></thead>
                  <tbody><tr className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">19,6 mm</td><td className="px-4 py-3">22</td><td className="px-4 py-3">62</td><td className="px-4 py-3">9 3/4</td></tr></tbody>
                </table>
                <p className="px-4 pb-3 text-[11px] text-slate-500">Ejemplo tomado de la tabla predeterminada del conversor. La configuración de tallas puede actualizarse; consulta siempre el resultado vigente en la herramienta.</p>
              </div>
              <p>La tabla del conversor es una herramienta de equivalencia, no una certificación metrológica. Si una talla queda entre dos referencias o no aparece en la tabla, mide con un anillero y confirma el criterio del fabricante.</p>
            </section>
            <section id="medir-anillo" className="scroll-mt-8">
              <h2>4. Cómo medir un anillo que ya tienes</h2>
              <ol>
                <li>Escoge un anillo que ajuste correctamente en el dedo y la mano donde se utilizará.</li>
                <li>Comprueba que el aro no esté ovalado, golpeado ni deformado.</li>
                <li>Coloca el anillo sobre una superficie plana y mide la abertura interior, de borde interno a borde interno.</li>
                <li>Mide pasando por el centro; no incluyas el espesor del metal ni midas el diámetro exterior.</li>
                <li>Repite la lectura en dos direcciones perpendiculares. Si los valores difieren, revisa la circularidad del aro.</li>
                <li>Introduce el diámetro en milímetros en el modo «Diámetro interno» y compara la equivalencia devuelta.</li>
              </ol>
              <p>Un calibre puede ayudar a leer el diámetro, pero la presión de las puntas y la inclinación afectan el resultado. Para una inspección de taller, contrasta con un mandril de anillos calibrado.</p>
            </section>
            <section id="medir-dedo" className="scroll-mt-8">
              <h2>5. Cómo medir directamente el dedo</h2>
              <p>Cuando no existe un anillo de referencia, utiliza un juego de anilleros o calibres de dedo del sistema que emplea tu taller. La pieza de prueba debe pasar por el nudillo sin forzar y quedar asentada de forma cómoda en la base del dedo.</p>
              <ul>
                <li>Realiza más de una prueba y confirma que el anillero no quede demasiado ajustado ni gire con excesiva holgura.</li>
                <li>Evita tomar una decisión con las manos muy frías o inmediatamente después de una actividad que las haya calentado.</li>
                <li>Si el nudillo es notablemente más ancho que la base del dedo, evalúa el paso y la retención, no solo la medida de la base.</li>
                <li>En anillos anchos, prueba un ancho similar al diseño final, porque la sensación de ajuste puede cambiar.</li>
              </ul>
              <p>La medida del dedo y la medida interior de un anillo existente son procedimientos distintos. No conviertas una circunferencia tomada con cinta flexible en una talla de producción sin validarla con un anillero.</p>
            </section>
            <section id="pantalla" className="scroll-mt-8">
              <h2>6. Medición visual en pantalla: calibra antes de usar</h2>
              <p>El modo «Medir anillo» del conversor permite ajustar una referencia visual y después comparar el diámetro del aro con un círculo mostrado en pantalla. Antes de usarlo, selecciona una referencia física admitida y ajusta su representación hasta que coincida con la medida real.</p>
              <ol>
                <li>Selecciona la moneda peruana de S/1 (25,5 mm) o una tarjeta bancaria (85,6 mm) si el tamaño de pantalla lo permite.</li>
                <li>Coloca la referencia física sobre la guía y ajusta el control de calibración hasta igualar sus dimensiones.</li>
                <li>Confirma la calibración; no cambies el zoom del navegador ni la escala de pantalla durante la medición.</li>
                <li>Coloca el anillo sobre el círculo y ajusta su diámetro hasta que coincida con el borde interior.</li>
                <li>Lee la equivalencia y verifica el resultado con un instrumento físico.</li>
              </ol>
              <p>La medición en pantalla depende de la calibración, del dispositivo, del zoom y del ajuste visual de quien la utiliza. Es orientativa: no debe ser el único control para fabricar, vender o modificar una joya.</p>
            </section>
            <section id="fabricacion" className="scroll-mt-8">
              <h2>7. Criterios de talla para fabricación y control de calidad</h2>
              <p>Antes de fabricar, registra el sistema solicitado y la medida física de referencia. En una ficha técnica conviene anotar el diámetro interior, la circunferencia o designación ISO cuando corresponda, el ancho del aro y el instrumento utilizado.</p>
              <ul>
                <li><strong>Perfil interior:</strong> los perfiles planos y redondeados no siempre se sienten igual aunque la dimensión nominal sea similar.</li>
                <li><strong>Ancho del aro:</strong> un anillo ancho puede sentirse más ajustado que uno estrecho de la misma talla nominal.</li>
                <li><strong>Forma:</strong> diseños cuadrados, anillos tipo sello, aros entrelazados o deformados requieren atención especial durante la medición.</li>
                <li><strong>Tolerancia:</strong> acuerda con el cliente o proveedor el método de aceptación y la tolerancia de fabricación; no la deduzcas de una tabla de conversión.</li>
                <li><strong>Verificación:</strong> utiliza mandril y anilleros adecuados, revisados y compatibles con el sistema de designación requerido.</li>
              </ul>
              <p>ISO 8653:2016 está orientada al método de medición y designación del tamaño del anillo para control y fabricación. La norma también contempla el uso de juegos de anilleros para determinar la talla en la relación joyero-cliente.</p>
            </section>
            <section id="errores" className="scroll-mt-8">
              <h2>8. Errores frecuentes y control final</h2>
              <ul>
                <li>Confundir diámetro con circunferencia o escribir una medida sin unidad.</li>
                <li>Usar una talla USA como si fuera una talla española o europea.</li>
                <li>Medir el exterior del anillo en lugar de su abertura interior.</li>
                <li>Medir un aro ovalado en una sola dirección.</li>
                <li>Usar la medición en pantalla sin calibrar o cambiar el zoom después de calibrar.</li>
                <li>Fabricar con una equivalencia aproximada sin validar el anillero y el sistema del proveedor.</li>
              </ul>
              <h3>Lista de comprobación antes de fabricar</h3>
              <ol>
                <li>¿Está identificado el sistema de talla solicitado?</li>
                <li>¿La medida está expresada en milímetros y corresponde al interior?</li>
                <li>¿El aro o el anillero están en buen estado y correctamente calibrados?</li>
                <li>¿Se consideraron el ancho y el perfil interior del diseño?</li>
                <li>¿Se confirmó la talla final con el cliente o responsable de producción?</li>
              </ol>
              <h3>Preguntas frecuentes</h3>
              <h4>¿Cómo convierto una talla española a USA?</h4>
              <p>Selecciona «Talla España», introduce el número y consulta el valor USA que devuelve la tabla configurada. Comprueba que el proveedor utiliza el mismo sistema de referencia.</p>
              <h4>¿La talla europea ISO es el diámetro interior?</h4>
              <p>No. La designación ISO se relaciona con la circunferencia interior en milímetros; el diámetro es otra magnitud. Por eso una talla ISO 62 no significa que el anillo tenga 62 mm de diámetro.</p>
              <h4>¿El conversor garantiza la talla exacta?</h4>
              <p>No. Devuelve la equivalencia disponible en su tabla y puede aproximar al valor más cercano cuando se introduce un diámetro intermedio. Para producción, venta o ajuste final, confirma con instrumental físico.</p>
              <h4>¿Puedo utilizar una medición de pantalla para fabricar?</h4>
              <p>Úsala solo como orientación. La escala puede variar según el dispositivo, la calibración y el zoom; valida siempre con un anillero o mandril adecuado.</p>
            </section>
            <section className="not-prose mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]">Referencias técnicas</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li><a href="https://www.iso.org/standard/65408.html" target="_blank" rel="noreferrer" className="underline underline-offset-4">ISO 8653:2016 — Jewellery: Ring-sizes, definition, measurement and designation</a></li>
                <li><a href="https://preview.sist.si/sist-preview/65408/3a0e7031aeea462e8e3157757e89edcf/ISO-8653-2016.pdf" target="_blank" rel="noreferrer" className="underline underline-offset-4">Vista previa del texto ISO 8653:2016</a></li>
              </ul>
              <p className="mt-3 text-xs leading-5 text-slate-500">La norma ISO establece un método de medición y designación. Las equivalencias España y USA mostradas por el conversor corresponden a su tabla comercial configurada y no deben interpretarse como una tabla oficial publicada por ISO.</p>
            </section>
          </div>
          <section className="mt-10 rounded-2xl border border-[#eadca7] bg-gradient-to-br from-[#fff9df] to-white p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]">Llévalo a la práctica</p>
            <h2 className="mt-2 text-xl font-bold">Consulta las equivalencias de tallas</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Busca por diámetro interior, talla española, referencia europea ISO o talla americana. También puedes calibrar la medición visual de pantalla.</p>
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
        <article className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
          <nav aria-label="Ruta de navegación" className="text-xs text-slate-500"><Link to="/guias" className="hover:text-[#876500]">Guías técnicas</Link><span aria-hidden="true"> / </span><span>Diseño y fabricación</span></nav>
          <header className="relative mt-6 overflow-hidden rounded-[1.75rem] border border-[#eadca7] bg-gradient-to-br from-[#fff9e8] via-white to-[#f5f7fa] p-6 pb-8 sm:p-9">
            <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full border-[24px] border-[#f5e8bd]/45" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#e8d7a4] bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">Diseño y fabricación</span>
                <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">Manual técnico · AURUM LAB</span>
              </div>
              <h1 className="mt-5 max-w-3xl text-3xl font-extrabold leading-[1.08] tracking-tight text-[#17232d] sm:text-5xl">Cómo estimar el peso de una joya desde un modelo 3D</h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">Convierte el volumen digital de una pieza en una estimación de masa. Aprende a validar la geometría, revisar las unidades, seleccionar una densidad coherente y entender qué factores hacen que el peso final pueda variar.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">Nivel: básico–intermedio</span>
                <span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">Lectura: 8–10 min</span>
                <span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">Unidades: mm³ · cm³ · g</span>
              </div>
            </div>
          </header>

          <section className="mt-7 grid gap-3 sm:grid-cols-3" aria-label="Conceptos clave">
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Geometría</p><p className="mt-1 text-xl font-extrabold text-[#17232d]">Volumen</p><p className="text-xs text-slate-500">El espacio ocupado por el metal</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Material</p><p className="mt-1 text-xl font-extrabold text-[#17232d]">Densidad</p><p className="text-xs text-slate-500">Masa por unidad de volumen</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Resultado</p><p className="mt-1 text-xl font-extrabold text-[#17232d]">Masa (g)</p><p className="text-xs text-slate-500">Estimación teórica del metal</p></div>
          </section>

          <aside className="mt-7 rounded-2xl border border-slate-200 bg-[#f7f8fa] p-5 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">En esta guía</p>
            <div className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#principio">01 · Volumen y densidad</a>
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#validar-modelo">02 · Validar el modelo</a>
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#unidades">03 · Controlar las unidades</a>
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#densidades">04 · Elegir la densidad</a>
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#ejemplo">05 · Ejemplo de cálculo</a>
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#flujo">06 · Flujo de trabajo</a>
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#desviaciones">07 · Diferencias con la pieza real</a>
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#control-final">08 · Lista de control</a>
            </div>
          </aside>

          <div className="prose prose-slate mt-8 max-w-none prose-headings:scroll-mt-24 prose-headings:tracking-tight prose-headings:font-bold prose-headings:text-[#17232d] prose-h2:mb-3 prose-h2:mt-12 prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-3 prose-p:leading-7 prose-li:leading-7 prose-a:text-[#876500] [&_p]:text-justify [&_li]:text-justify">
            <section>
              <h2 id="principio">01. El principio: volumen × densidad</h2>
              <p>El peso teórico de una pieza maciza se obtiene a partir de dos datos: el volumen de material que contiene el modelo y la densidad del material elegido. La relación física es sencilla, pero su fiabilidad depende de que ambos datos sean correctos y utilicen unidades compatibles.</p>
              <div className="not-prose my-6 rounded-2xl border border-[#eadca7] bg-[#fff9df] p-5 text-center sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#987400]">Fórmula fundamental</p>
                <p className="mt-2 text-xl font-extrabold text-[#604900] sm:text-2xl">Masa = Volumen × Densidad</p>
                <p className="mt-2 text-xs text-slate-600">g = cm³ × g/cm³</p>
              </div>
              <p>El resultado representa la masa teórica del material contenido en el volumen medido. No es, por sí solo, una predicción completa del peso de la pieza terminada ni del metal que debes comprar para producirla.</p>
            </section>

            <section>
              <h2 id="validar-modelo">02. Validar la geometría antes de medir</h2>
              <p>Un archivo visualmente correcto puede contener errores que alteren el cálculo: superficies abiertas, caras duplicadas, sólidos superpuestos o componentes internos que no deberían formar parte del metal. Antes de medir, revisa la geometría y confirma que el volumen represente el material real de la pieza.</p>
              <ul>
                <li><strong>Sólidos cerrados:</strong> comprueba que las superficies delimiten un volumen completo. En mallas, verifica que sean cerradas y estén correctamente orientadas.</li>
                <li><strong>Espesores reales:</strong> revisa paredes, fondos, galerías, brazos y zonas caladas. No conviertas una superficie sin espesor en un volumen imaginario.</li>
                <li><strong>Duplicados y solapes:</strong> evita contar dos veces el mismo material o sumar cuerpos que se interpenetran.</li>
                <li><strong>Huecos y cavidades:</strong> distingue los vacíos de diseño del volumen que realmente ocupará el metal.</li>
                <li><strong>Componentes separados:</strong> identifica piedras, gomas, insertos, pasadores y piezas de otro material para no sumarlos a la masa del metal equivocado.</li>
              </ul>
              <p>Si trabajas en Rhinoceros, el comando <strong>Volume</strong> permite consultar el volumen de superficies, polisuperficies y mallas compatibles. La documentación de McNeel advierte que, cuando se usan objetos que no son sólidos, el usuario debe asegurarse de que las superficies realmente encierren el volumen y tengan normales orientadas correctamente.</p>
            </section>

            <section>
              <h2 id="unidades">03. Controlar las unidades: el error que más altera el resultado</h2>
              <p>La escala del archivo debe confirmarse antes de calcular. Un modelo diseñado en milímetros no puede interpretarse como si sus coordenadas estuvieran en centímetros. También debes convertir el volumen a una unidad compatible con la densidad seleccionada.</p>
              <div className="not-prose my-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full min-w-[320px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Conversión</th><th className="px-4 py-3">Equivalencia</th></tr></thead>
                  <tbody>
                    <tr className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">Longitud</td><td className="px-4 py-3">10 mm = 1 cm</td></tr>
                    <tr className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">Volumen</td><td className="px-4 py-3">1 cm³ = 1.000 mm³</td></tr>
                    <tr className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">Densidad</td><td className="px-4 py-3">Se expresa habitualmente en g/cm³</td></tr>
                  </tbody>
                </table>
              </div>
              <p>Si la herramienta recibe el volumen en mm³ y la densidad en g/cm³, la operación debe incluir la conversión de mm³ a cm³. Comprueba qué unidad muestra el resultado de tu herramienta y no asumas que todos los formatos de archivo conservan la unidad de trabajo original.</p>
            </section>

            <section>
              <h2 id="densidades">04. Seleccionar una densidad adecuada al material</h2>
              <p>La densidad no depende únicamente del nombre del metal. El oro puro, la plata pura y el platino puro tienen densidades diferentes; las aleaciones de joyería también cambian según su composición. En particular, dos aleaciones de oro de la misma ley pueden tener densidades distintas si cambia la proporción de cobre, plata, paladio u otros elementos.</p>
              <div className="not-prose my-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Material de referencia</th><th className="px-4 py-3">Densidad aprox. (g/cm³)</th><th className="px-4 py-3">Observación</th></tr></thead>
                  <tbody>
                    <tr className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">Oro puro</td><td className="px-4 py-3">19,28</td><td className="px-4 py-3">Referencia del elemento, no de oro 18K</td></tr>
                    <tr className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">Plata pura</td><td className="px-4 py-3">10,50</td><td className="px-4 py-3">La plata 925 tiene otra densidad</td></tr>
                    <tr className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">Platino puro</td><td className="px-4 py-3">21,46</td><td className="px-4 py-3">El platino 950 es una aleación</td></tr>
                    <tr className="border-t border-slate-100"><td className="px-4 py-3 font-semibold">Oro 18K (ejemplo Ag/Cu)</td><td className="px-4 py-3">15,4</td><td className="px-4 py-3">Ejemplo específico citado por LBMA</td></tr>
                  </tbody>
                </table>
              </div>
              <p>Los valores de oro, plata y platino puros proceden de datos tabulados por USGS. LBMA señala que una aleación de oro de 18 quilates con proporciones iguales de plata y cobre tiene una densidad aproximada de 15,4 g/cm³; no debe generalizarse ese valor a todas las variantes de oro 18K. Para presupuestar una pieza, utiliza la densidad de la aleación concreta que vas a fundir, preferiblemente confirmada por el proveedor o por la ficha técnica.</p>
              <p><strong>Regla de taller:</strong> si no conoces la composición de la aleación, declara el resultado como estimación y evita presentar más decimales de los que justifican los datos de entrada.</p>
            </section>

            <section>
              <h2 id="ejemplo">05. Ejemplo práctico: estimar una pieza de 250 mm³</h2>
              <p>Supongamos que el volumen metálico validado del modelo es de 250 mm³ y, solo para este ejemplo, se utiliza una densidad de 15,4 g/cm³ correspondiente al ejemplo de oro 18K con proporciones iguales de plata y cobre descrito por LBMA.</p>
              <ol>
                <li>Convierte el volumen: 250 mm³ ÷ 1.000 = 0,25 cm³.</li>
                <li>Multiplica por la densidad: 0,25 cm³ × 15,4 g/cm³ = 3,85 g.</li>
                <li>Interpreta el resultado: la masa teórica del metal del modelo es aproximadamente 3,85 g.</li>
              </ol>
              <div className="not-prose my-5 rounded-2xl border border-[#eadca7] bg-[#fff9df] p-5 sm:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#987400]">Resultado del ejemplo</p>
                <p className="mt-2 text-3xl font-extrabold text-[#604900]">3,85 g</p>
                <p className="mt-1 text-sm text-slate-600">Masa teórica para 0,25 cm³ a 15,4 g/cm³. No incluye canales, árbol, pérdidas ni componentes adicionales.</p>
              </div>
              <p>Si cambia la densidad seleccionada, cambia el resultado aunque el volumen permanezca igual. Por eso no conviene reutilizar una densidad genérica para todos los colores, leyes y proveedores.</p>
            </section>

            <section>
              <h2 id="flujo">06. Procedimiento recomendado en AURUM LAB</h2>
              <ol>
                <li><strong>Prepara:</strong> exporta o carga el modelo en el formato admitido por el visualizador.</li>
                <li><strong>Comprueba:</strong> confirma escala, unidades, cuerpos duplicados, huecos y superficies abiertas.</li>
                <li><strong>Calcula:</strong> obtén el volumen de la geometría que representa exclusivamente el metal.</li>
                <li><strong>Selecciona:</strong> elige el metal o la densidad correspondiente a la aleación prevista.</li>
                <li><strong>Registra:</strong> anota volumen, densidad utilizada, unidad y masa estimada para poder repetir el cálculo.</li>
                <li><strong>Contrasta:</strong> compara la estimación con una pieza fabricada y pesada para conocer el comportamiento real de tu proceso.</li>
              </ol>
              <p>La herramienta pública de AURUM LAB está pensada para apoyar esta estimación desde un modelo 3D. Los nombres de materiales y densidades disponibles en el selector son los parámetros que debes revisar antes de interpretar el resultado.</p>
            </section>

            <section>
              <h2 id="desviaciones">07. Por qué el peso calculado puede diferir del peso final</h2>
              <p>El cálculo volumen × densidad estima la masa del material representado en el modelo. El peso de la pieza terminada puede variar por modificaciones del diseño, tolerancias, porosidad, mecanizado, limado, pulido, soldaduras, componentes añadidos o sustitución de materiales.</p>
              <ul>
                <li><strong>Canales y árbol de colada:</strong> si no están incluidos en el modelo, su metal no forma parte del resultado calculado.</li>
                <li><strong>Acabado:</strong> el lijado y pulido pueden retirar material; el resultado final dependerá de cuánto se elimine.</li>
                <li><strong>Piedras:</strong> separa el volumen y la masa de las gemas del metal, especialmente si el modelo incluye engastes o piedras de referencia.</li>
                <li><strong>Aleación real:</strong> la densidad depende de la composición exacta, no solo de los quilates.</li>
                <li><strong>Fabricación:</strong> las pérdidas, rebabas, uniones y ajustes se deben evaluar según el proceso real del taller.</li>
              </ul>
              <p>No apliques un porcentaje universal de merma sin datos. Construye tu propio margen a partir de registros de producción comparando el peso estimado, el peso antes del acabado y el peso final.</p>
            </section>

            <section>
              <h2 id="control-final">08. Lista de control antes de presupuestar</h2>
              <ul>
                <li>El modelo corresponde a la versión final del diseño.</li>
                <li>La unidad del archivo y la unidad de volumen están verificadas.</li>
                <li>El volumen corresponde al metal, sin duplicados ni cuerpos auxiliares.</li>
                <li>Las mallas o superficies delimitan correctamente un volumen.</li>
                <li>La densidad coincide con la aleación y el proveedor previstos.</li>
                <li>Las piedras y componentes de otros materiales están separados.</li>
                <li>El resultado está identificado como masa teórica, no como peso final garantizado.</li>
              </ul>
            </section>

            <section>
              <h2>Preguntas frecuentes</h2>
              <h3>¿Cómo calcular el peso de una joya desde un STL?</h3>
              <p>Valida primero que la malla represente un volumen cerrado y tenga la escala correcta. Obtén el volumen, conviértelo a una unidad compatible con la densidad y aplica masa = volumen × densidad.</p>
              <h3>¿Una joya del mismo volumen pesa igual en oro y plata?</h3>
              <p>No. La masa depende de la densidad. Además, la densidad de una aleación de oro o plata depende de su composición concreta.</p>
              <h3>¿Puedo usar la densidad del oro puro para oro 18K?</h3>
              <p>No es recomendable. El oro 18K contiene otros metales y su densidad es inferior a la del oro puro; utiliza la densidad de la aleación concreta.</p>
              <h3>¿El resultado incluye el árbol de colada y las pérdidas?</h3>
              <p>Solo si esos volúmenes están incluidos en la geometría que se calcula. El margen de proceso debe estimarse con los datos reales del taller.</p>
              <h3>¿Qué hago si el modelo tiene superficies abiertas?</h3>
              <p>Repara la geometría y confirma que delimite un volumen válido antes de confiar en el cálculo. Un modelo visualmente cerrado no garantiza por sí mismo que el volumen se esté midiendo correctamente.</p>
            </section>
          </div>

          <section className="not-prose mt-10 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">Bibliografía y referencias</p>
            <h2 className="mt-2 text-xl font-bold text-[#17232d]">Fuentes técnicas consultadas</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Las fórmulas y los ejemplos didácticos son elaboración de AURUM LAB. Las fuentes siguientes respaldan las propiedades físicas y los criterios de medición de volumen.</p>
            <ol className="mt-5 space-y-4 text-sm leading-6 text-slate-700">
              <li><strong>U.S. Geological Survey (USGS).</strong> Tablas de propiedades minerales y elementos; incluye densidades tabuladas de plata, oro y platino a temperatura ambiente. <a className="font-semibold text-[#876500] underline" href="https://pubs.usgs.gov/tei/822/report.pdf" target="_blank" rel="noreferrer">Consultar tabla técnica</a>.</li>
              <li><strong>London Bullion Market Association (LBMA).</strong> Density of Gold. Explica densidad, temperatura y variación de densidad al alear oro con plata y cobre; cita un ejemplo de oro 18K de 15,4 g/cm³. <a className="font-semibold text-[#876500] underline" href="https://www.lbma.org.uk/wonders-of-gold/items/density-of-gold" target="_blank" rel="noreferrer">Consultar publicación</a>.</li>
              <li><strong>McNeel Rhinoceros.</strong> Comando Volume. Documenta el cálculo de volumen en superficies, polisuperficies, mallas y SubD, además de la configuración de unidades. <a className="font-semibold text-[#876500] underline" href="https://docs.mcneel.com/rhino/8/help/es-es/commands/volume.htm" target="_blank" rel="noreferrer">Consultar documentación oficial</a>.</li>
              <li><strong>McNeel Rhinoceros.</strong> Volume mass properties. Explica las condiciones geométricas necesarias para calcular correctamente el volumen de objetos no sólidos y la orientación de sus normales. <a className="font-semibold text-[#876500] underline" href="https://docs.mcneel.com/rhino/mac/help/en-us/information/massproperties.htm" target="_blank" rel="noreferrer">Consultar documentación técnica</a>.</li>
            </ol>
            <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">Nota técnica: las densidades de elementos puros no deben utilizarse como si fueran densidades de aleaciones comerciales. Para una estimación de producción, confirma la densidad del material exacto con su proveedor o ficha técnica.</p>
          </section>

          <section className="mt-10 rounded-2xl border border-[#eadca7] bg-gradient-to-br from-[#fff9df] to-white p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]">Llévalo a la práctica</p>
            <h2 className="mt-2 text-xl font-bold">Estima el peso de tu modelo 3D</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Carga tu diseño, revisa la geometría y selecciona el material para obtener una referencia de masa antes de fabricar.</p>
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
          <div className="mx-auto flex min-h-[68px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
            <Link to="/guias" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#987400]"><ArrowLeft className="size-4" /> Todas las guías</Link>
            <Link to="/auth" className="rounded-full bg-[#17232d] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#293b49]">Acceder a AURUM LAB</Link>
          </div>
        </header>
        <article className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
          <nav aria-label="Ruta de navegación" className="text-xs text-slate-500"><Link to="/guias" className="hover:text-[#876500]">Guías técnicas</Link><span aria-hidden="true"> / </span><span>Diseño del taller</span></nav>
          <header className="relative mt-6 overflow-hidden rounded-[1.75rem] border border-[#eadca7] bg-gradient-to-br from-[#fff9e8] via-white to-[#f3f6fa] p-6 pb-8 sm:p-10">
            <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 size-64 rounded-full border-[28px] border-[#f5e8bd]/45" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#e8d7a4] bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">Diseño del taller</span>
                <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">Manual técnico · AURUM LAB</span>
              </div>
              <h1 className="mt-5 max-w-3xl text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">Distribución de un taller de joyería: zonas, flujo de trabajo y seguridad</h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">Diseña un espacio donde el trabajo avance desde el diseño hasta el acabado sin cruces innecesarios. Aprende a separar procesos limpios, producción digital, operaciones con polvo y trabajos térmicos, tomando como referencia las dimensiones reales de tu local y tus equipos.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">Nivel: básico–intermedio</span>
                <span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">Lectura: 10–12 min</span>
                <span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">Aplicación: taller pequeño o mediano</span>
              </div>
            </div>
          </header>

          <section className="mt-7 grid gap-3 sm:grid-cols-3" aria-label="Principios de distribución">
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">01 · Flujo</p><p className="mt-2 text-base font-bold">Una ruta lógica</p><p className="mt-1 text-sm leading-5 text-slate-600">Evita retrocesos, cruces y traslados de piezas entre zonas incompatibles.</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">02 · Separación</p><p className="mt-2 text-base font-bold">Procesos diferenciados</p><p className="mt-1 text-sm leading-5 text-slate-600">Controla polvo, vapores, resinas, productos químicos y fuentes de calor.</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">03 · Seguridad</p><p className="mt-2 text-base font-bold">Instalaciones adecuadas</p><p className="mt-1 text-sm leading-5 text-slate-600">Dimensiona ventilación, electricidad, almacenamiento y evacuación según el riesgo.</p></div>
          </section>

          <aside className="mt-7 rounded-2xl border border-slate-200 bg-[#f7f8fa] p-5 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">Contenido de la guía</p>
            <div className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#flujo">01 · Diseñar el flujo de trabajo</a>
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#zonas">02 · Definir las zonas del taller</a>
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#esquema">03 · Leer un esquema de distribución</a>
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#medidas">04 · Medir el local y los equipos</a>
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#instalaciones">05 · Planificar instalaciones</a>
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#seguridad">06 · Separación, ventilación y seguridad</a>
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#errores">07 · Errores frecuentes</a>
              <a className="font-medium text-slate-700 hover:text-[#876500]" href="#checklist">08 · Lista de verificación</a>
            </div>
          </aside>

          <div className="prose prose-slate mt-9 max-w-none prose-headings:tracking-tight [&_p]:text-justify [&_li]:text-justify">
            <section>
              <h2 id="flujo">01. Diseña primero el flujo de trabajo</h2>
              <p>Antes de comprar mobiliario o instalar máquinas, representa el recorrido habitual de una pieza. En un taller que combina diseño CAD, impresión 3D, fundición y acabado, el flujo general puede ser:</p>
              <ol>
                <li><strong>Diseño y preparación:</strong> modelado, revisión del archivo y planificación de fabricación.</li>
                <li><strong>Producción digital:</strong> preparación e impresión del patrón, cuando el proceso lo requiera.</li>
                <li><strong>Posprocesado:</strong> lavado, secado, curado y revisión de la pieza impresa, de acuerdo con la ficha técnica de la resina.</li>
                <li><strong>Preparación de fundición:</strong> montaje del árbol, revestimiento y acondicionamiento del cilindro.</li>
                <li><strong>Fundición y recuperación:</strong> operación térmica, enfriamiento y extracción siguiendo el procedimiento validado.</li>
                <li><strong>Acabado y control:</strong> corte de bebederos, limado, lijado, pulido, limpieza e inspección final.</li>
              </ol>
              <p>No todos los talleres realizan todas estas etapas en el mismo local. Si una operación se terceriza, diseña el flujo para recibir y entregar piezas sin mezclar materiales limpios con residuos de producción.</p>
            </section>

            <section>
              <h2 id="zonas">02. Define las zonas funcionales</h2>
              <p>Piensa en zonas por tipo de proceso, no solamente por máquina. Una misma mesa puede cumplir varias funciones si las tareas son compatibles y se mantiene un procedimiento claro de limpieza y almacenamiento.</p>
              <div className="not-prose my-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600"><tr><th className="border-b border-slate-200 px-4 py-3">Zona</th><th className="border-b border-slate-200 px-4 py-3">Actividades y equipos</th><th className="border-b border-slate-200 px-4 py-3">Criterio de ubicación</th></tr></thead>
                  <tbody>
                    <tr><td className="border-b border-slate-100 px-4 py-3 font-semibold">Diseño y administración</td><td className="border-b border-slate-100 px-4 py-3">CAD, computadora, revisión de modelos, documentación y atención.</td><td className="border-b border-slate-100 px-4 py-3">Área limpia, seca, iluminada y alejada de polvo y calor.</td></tr>
                    <tr><td className="border-b border-slate-100 px-4 py-3 font-semibold">Impresión 3D</td><td className="border-b border-slate-100 px-4 py-3">Impresora, estación de materiales y accesorios compatibles.</td><td className="border-b border-slate-100 px-4 py-3">Superficie estable; condiciones ambientales y eléctricas del fabricante.</td></tr>
                    <tr><td className="border-b border-slate-100 px-4 py-3 font-semibold">Posprocesado</td><td className="border-b border-slate-100 px-4 py-3">Lavado, secado, curado y gestión de residuos de resina.</td><td className="border-b border-slate-100 px-4 py-3">Separación de alimentos y puestos limpios; ventilación y almacenamiento según SDS.</td></tr>
                    <tr><td className="border-b border-slate-100 px-4 py-3 font-semibold">Fundición</td><td className="border-b border-slate-100 px-4 py-3">Horno, equipo de colada, cilindros y herramientas térmicas.</td><td className="border-b border-slate-100 px-4 py-3">Sector específico, materiales combustibles apartados y extracción diseñada para el proceso.</td></tr>
                    <tr><td className="border-b border-slate-100 px-4 py-3 font-semibold">Acabado y pulido</td><td className="border-b border-slate-100 px-4 py-3">Corte, limado, lijado, pulido y recuperación de partículas metálicas.</td><td className="border-b border-slate-100 px-4 py-3">Captación localizada de polvo; recuperación de metales y limpieza controlada.</td></tr>
                    <tr><td className="px-4 py-3 font-semibold">Almacén y despacho</td><td className="px-4 py-3">Materias primas, consumibles identificados, piezas terminadas y embalaje.</td><td className="px-4 py-3">Estanterías estables, inventario separado y acceso sin bloquear rutas de salida.</td></tr>
                  </tbody>
                </table>
              </div>
              <p>En locales pequeños, algunas zonas pueden compartir un mismo ambiente, pero no deben compartir indiscriminadamente el aire, las superficies ni los recipientes. Separa físicamente las tareas que generen polvo, vapores, salpicaduras o calor.</p>
            </section>

            <section>
              <h2 id="esquema">03. Esquema orientativo de distribución</h2>
              <p>El siguiente esquema muestra relaciones entre áreas, no un plano arquitectónico ni una propuesta a escala. La posición real depende de puertas, ventanas, columnas, instalaciones, equipos y rutas de evacuación.</p>
              <div className="not-prose my-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <p className="text-xs font-bold uppercase tracking-[.15em] text-slate-600">Ejemplo conceptual · no a escala</p>
                  <span className="rounded-full bg-[#fff4c4] px-3 py-1 text-[10px] font-bold text-[#876500]">Flujo por etapas</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-blue-800">Área limpia</p><p className="mt-2 font-bold text-slate-800">Diseño CAD y administración</p><p className="mt-1 text-xs leading-5 text-slate-600">Modelado, revisión, documentación y recepción.</p></div>
                  <div className="rounded-xl border border-violet-200 bg-violet-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-violet-800">Producción digital</p><p className="mt-2 font-bold text-slate-800">Impresión 3D y posprocesado</p><p className="mt-1 text-xs leading-5 text-slate-600">Impresión, lavado, secado y curado en puestos diferenciados.</p></div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Zona térmica</p><p className="mt-2 font-bold text-slate-800">Preparación y fundición</p><p className="mt-1 text-xs leading-5 text-slate-600">Cilindros, hornos y colada con controles propios.</p></div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Acabado</p><p className="mt-2 font-bold text-slate-800">Lijado, pulido y control final</p><p className="mt-1 text-xs leading-5 text-slate-600">Captación de partículas, recuperación de metal e inspección.</p></div>
                </div>
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Secuencia de referencia</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">Diseño → Impresión → Posprocesado → Preparación → Fundición → Acabado → Inspección</p>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-slate-500">La secuencia no significa que todas las áreas deban estar contiguas. Mantén separadas las fuentes de polvo, vapores y calor, y valida el sentido de ventilación con un profesional competente.</p>
              </div>
            </section>

            <section>
              <h2 id="medidas">04. Mide el local y cada equipo antes de distribuir</h2>
              <p>Levanta un plano sencillo con las dimensiones interiores reales. Registra también los elementos que condicionan el montaje: columnas, desniveles, puertas, ventanas, tableros eléctricos, puntos de agua, desagües y recorridos de ventilación.</p>
              <ul>
                <li><strong>Huella del equipo:</strong> ancho, fondo y altura indicados por el fabricante.</li>
                <li><strong>Área de operación:</strong> espacio para abrir tapas, cargar materiales, retirar piezas y trabajar sin posturas forzadas.</li>
                <li><strong>Mantenimiento:</strong> acceso a filtros, conexiones, paneles, motores y componentes que deban revisarse.</li>
                <li><strong>Circulación:</strong> paso de personas y traslado de cilindros, bandejas y piezas sin invadir salidas ni zonas calientes.</li>
                <li><strong>Almacenamiento:</strong> espacio separado y señalizado para materias primas, químicos, residuos y piezas terminadas.</li>
              </ul>
              <p>No existe una medida única de pasillo o separación que sirva para cualquier taller. Las dimensiones exigibles dependen del uso del local, aforo, equipos, riesgo y normativa aplicable. Verifica el proyecto con un profesional y con las autoridades competentes antes de ejecutar obras.</p>
            </section>

            <section>
              <h2 id="instalaciones">05. Planifica las instalaciones desde el plano</h2>
              <h3>Electricidad</h3>
              <p>Identifica la potencia y tensión requeridas por cada equipo, la puesta a tierra, protecciones, circuitos y condiciones de instalación indicadas por el fabricante. No conectes hornos, compresores o máquinas de alta demanda a extensiones improvisadas. La evaluación y ejecución deben quedar a cargo de personal electricista calificado.</p>
              <h3>Agua y desagüe</h3>
              <p>Ubica lavaderos y puntos de limpieza donde puedan gestionarse residuos sin contaminar drenajes. No viertas resinas, solventes, lodos de pulido, revestimiento ni soluciones químicas al desagüe; consulta sus fichas de seguridad y el sistema local de gestión de residuos.</p>
              <h3>Ventilación y extracción</h3>
              <p>La ventilación general del ambiente no reemplaza la captación localizada en el punto donde se produce polvo, humo o vapor. El diseño debe considerar el contaminante, el caudal, la campana, los ductos, la descarga segura, el aire de reposición y el mantenimiento de filtros. No improvises extractores domésticos para procesos de fundición, pulido o manipulación de químicos.</p>
              <h3>Iluminación y ergonomía</h3>
              <p>Combina iluminación general uniforme con luz de tarea en bancos de engaste, limado e inspección. Ajusta altura de mesas, asiento, apoyos y ubicación de herramientas al trabajo y a la persona que lo realiza.</p>
            </section>

            <section>
              <h2 id="seguridad">06. Separa riesgos y controla la exposición</h2>
              <ul>
                <li><strong>Calor y combustibles:</strong> mantén hornos y operaciones de colada en un sector definido, con superficies y distancias compatibles con el equipo y sin almacenamiento improvisado de materiales combustibles.</li>
                <li><strong>Polvo de pulido:</strong> utiliza sistemas de captación diseñados para la operación. El polvo puede contener partículas metálicas y compuestos abrasivos; evita dispersarlo con aire comprimido o barrido en seco.</li>
                <li><strong>Revestimientos:</strong> la manipulación y retirada de revestimiento puede generar polvo respirable. Sigue la ficha de seguridad, controla el polvo en origen y define el equipo de protección con una evaluación de riesgos.</li>
                <li><strong>Resinas y solventes:</strong> consulta la SDS de cada producto, conserva envases identificados y cerrados, separa materiales incompatibles y aplica las condiciones de ventilación y almacenamiento indicadas por el fabricante.</li>
                <li><strong>Emergencias:</strong> mantén salidas, tableros, extintores y botiquín accesibles; señaliza rutas y capacita al personal según los riesgos reales del taller.</li>
              </ul>
              <p>En Perú, la planificación de seguridad y salud debe considerar la Ley N.º 29783 y su reglamento, además de las disposiciones sectoriales y municipales que correspondan. La evaluación de peligros y riesgos debe realizarse para las actividades y puestos concretos del taller.</p>
            </section>

            <section>
              <h2 id="errores">07. Errores frecuentes al organizar el taller</h2>
              <ul>
                <li>Comprar equipos antes de medir accesos, espacio de operación y necesidades de mantenimiento.</li>
                <li>Colocar la computadora o los modelos terminados junto a polvo de pulido, vapores o salpicaduras.</li>
                <li>Ubicar resinas, solventes o embalajes combustibles junto a hornos y fuentes de calor.</li>
                <li>Confiar únicamente en ventanas o ventiladores para controlar emisiones generadas por una máquina.</li>
                <li>Mezclar polvo de metales preciosos con basura común y perder material recuperable.</li>
                <li>Usar pasillos como almacenamiento temporal y bloquear rutas de evacuación.</li>
                <li>No reservar espacio para limpieza, filtros, mantenimiento y crecimiento del taller.</li>
              </ul>
            </section>

            <section>
              <h2 id="checklist">08. Lista de verificación antes de instalar</h2>
              <div className="not-prose my-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">Checklist de planificación</p>
                <ul className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                  <li className="flex gap-2"><span className="font-bold text-[#987400]">□</span> Plano del local con medidas verificadas.</li>
                  <li className="flex gap-2"><span className="font-bold text-[#987400]">□</span> Inventario de equipos y fichas técnicas.</li>
                  <li className="flex gap-2"><span className="font-bold text-[#987400]">□</span> Flujo de trabajo y zonas definidos.</li>
                  <li className="flex gap-2"><span className="font-bold text-[#987400]">□</span> Accesos, pasillos y salidas despejados.</li>
                  <li className="flex gap-2"><span className="font-bold text-[#987400]">□</span> Circuitos eléctricos y puesta a tierra evaluados.</li>
                  <li className="flex gap-2"><span className="font-bold text-[#987400]">□</span> Ventilación y extracción dimensionadas.</li>
                  <li className="flex gap-2"><span className="font-bold text-[#987400]">□</span> Almacenamiento y residuos organizados.</li>
                  <li className="flex gap-2"><span className="font-bold text-[#987400]">□</span> Equipos de emergencia y señalización previstos.</li>
                  <li className="flex gap-2"><span className="font-bold text-[#987400]">□</span> Espacio de mantenimiento y limpieza reservado.</li>
                  <li className="flex gap-2"><span className="font-bold text-[#987400]">□</span> Instalación revisada por personal competente.</li>
                </ul>
              </div>
              <p>Haz una prueba de recorrido antes de fijar los equipos: simula el traslado de una pieza, una bandeja y un cilindro, y comprueba que las tareas se puedan realizar sin cruzar zonas de riesgo ni bloquear accesos.</p>
            </section>

            <section className="not-prose mt-10 rounded-2xl border border-slate-200 bg-[#f7f8fa] p-5 sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">Referencias técnicas</p>
              <h2 className="mt-2 text-xl font-bold text-[#17232d]">Documentación para profundizar</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                <li><strong>Perú · Ley N.º 29783, Ley de Seguridad y Salud en el Trabajo.</strong> Marco nacional para la prevención de riesgos laborales. <a className="font-semibold text-[#876500] underline" href="https://www.gob.pe/institucion/congreso-de-la-republica/normas-legales/462576-29783" target="_blank" rel="noreferrer">Consultar texto oficial</a>.</li>
                <li><strong>Perú · D.S. N.º 005-2012-TR.</strong> Reglamento de la Ley de Seguridad y Salud en el Trabajo. <a className="font-semibold text-[#876500] underline" href="https://www.gob.pe/institucion/presidencia/normas-legales/462577" target="_blank" rel="noreferrer">Consultar reglamento</a>.</li>
                <li><strong>OSHA · 29 CFR 1910.94, Ventilation.</strong> Referencia técnica estadounidense sobre sistemas de extracción para operaciones de esmerilado, pulido y abrillantado de metales; no sustituye la normativa peruana. <a className="font-semibold text-[#876500] underline" href="https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.94" target="_blank" rel="noreferrer">Consultar estándar</a>.</li>
                <li><strong>California DTSC · Jewelry Manufacturing Pollution Prevention.</strong> Recomendaciones de prevención de contaminación para fundición, manipulación de revestimientos, esmerilado y pulido en joyería. <a className="font-semibold text-[#876500] underline" href="https://dtsc.ca.gov/jewelry-manufacturing-pollution-prevention-recommendations-fact-sheet/" target="_blank" rel="noreferrer">Consultar recomendaciones</a>.</li>
              </ul>
              <p className="mt-5 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">Esta guía ofrece criterios de organización general. No es un plano de ingeniería, una memoria de cálculo ni una certificación de seguridad. Las instalaciones, dimensiones exigibles y controles deben validarse para el inmueble, los equipos, los materiales y la normativa vigente.</p>
            </section>

            <section>
              <h2>Preguntas frecuentes</h2>
              <h3>¿Qué zona debo planificar primero?</h3>
              <p>Empieza por las operaciones con mayores requisitos de instalación y control, como fundición, extracción de polvo y posprocesado químico. Después ubica las áreas limpias y el almacenamiento, manteniendo un flujo claro entre etapas.</p>
              <h3>¿Puedo tener impresión 3D y fundición en el mismo ambiente?</h3>
              <p>Depende de los equipos, materiales, ventilación y evaluación de riesgos. No coloques impresoras, resinas ni solventes junto a fuentes de calor. Si comparten local, la separación física y los controles de ventilación deben ser diseñados y validados por personal competente.</p>
              <h3>¿La ventilación general es suficiente para pulir?</h3>
              <p>No debe asumirse. El pulido puede liberar polvo metálico y partículas de compuestos abrasivos; se requiere evaluar la captación en el punto de generación y el sistema de recuperación correspondiente.</p>
              <h3>¿Qué medidas exactas debe tener cada zona?</h3>
              <p>No hay una medida universal. Depende de las dimensiones del equipo, el espacio para operarlo y mantenerlo, la circulación, el aforo y los requisitos normativos del inmueble. Mide y valida el plano antes de instalar.</p>
            </section>
          </div>

          <section className="mt-10 rounded-2xl border border-[#eadca7] bg-gradient-to-br from-[#fff9df] to-white p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]">Llévalo a la práctica</p>
                <h2 className="mt-2 text-xl font-bold">Prepara tu flujo de fabricación digital</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Conecta el área de diseño con la preparación de modelos y revisa la geometría antes de imprimir. El asistente ayuda a detectar incidencias del archivo, pero no sustituye su reparación ni la validación de la impresión.</p>
              </div>
              <Link to="/herramientas-publicas" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#17232d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#293b49]"><ArrowRight className="size-4" /> Ver herramientas técnicas</Link>
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

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">Microguías especializadas</p>
          <h2 className="mt-2 text-xl font-bold text-[#17232d]">Resuelve cálculos específicos de aleaciones de oro</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Consulta guías breves con fórmulas y ejemplos para conversiones concretas. Todas están conectadas con la calculadora de aleaciones.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["convertir-oro-14k-a-18k", "Cómo pasar oro de 14K a 18K"],
              ["bajar-oro-24k-a-18k", "Cómo bajar oro de 24K a 18K"],
              ["calcular-oro-fino-18k-14k-9k", "Cuánto oro fino contiene 18K, 14K y 9K"],
              ["calcular-liga-oro-18k-14k", "Cómo calcular la liga que debes añadir"],
              ["diferencia-oro-14k-585-milesimas", "Diferencia entre 14K, 583 y 585"],
            ].map(([microSlug, label]) => (
              <Link key={microSlug} to="/guias/$slug" params={{ slug: microSlug ?? "" }} className="group flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm font-semibold text-slate-700 transition hover:border-[#d9bd70] hover:bg-[#fffaf0]">
                <span>{label}</span><ArrowRight className="mt-0.5 size-4 shrink-0 text-[#987400] transition group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </section>

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
