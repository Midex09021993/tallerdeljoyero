import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Calculator, Gem } from "lucide-react";

const slugGuia = "calcular-aleaciones-oro-18k-14k-9k";

export const Route = createFileRoute("/guias/$slug")({
  head: ({ params }) => {
    const valida = params.slug === slugGuia;
    const titulo = "Cómo calcular aleaciones de oro de 18K, 14K y 9K";
    const descripcion = "Aprende a calcular el oro fino y el metal de liga en aleaciones de 18K, 14K y 9K, con fórmulas y ejemplos prácticos para joyeros.";
    return {
      meta: [
        { title: valida ? `${titulo} | Guías técnicas AURUM LAB` : "Guía no encontrada | AURUM LAB" },
        { name: "description", content: valida ? descripcion : "La guía técnica que buscas no está disponible." },
        { name: "robots", content: valida ? "index, follow, max-image-preview:large" : "noindex, follow" },
        { property: "og:title", content: titulo },
        { property: "og:description", content: descripcion },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `https://www.tallerdeljoyero.com/guias/${params.slug}` },
      ],
      links: valida ? [{ rel: "canonical", href: `https://www.tallerdeljoyero.com/guias/${slugGuia}` }] : [],
    };
  },
  component: GuiaTecnicaPage,
});

function GuiaTecnicaPage() {
  const { slug } = Route.useParams();
  if (slug !== slugGuia) {
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
        <header className="mt-6 border-b border-slate-200 pb-8">
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">Metalurgia y materiales · Guía técnica</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">Cómo calcular aleaciones de oro de 18K, 14K y 9K</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">Aprende a interpretar el quilataje, calcular la proporción de oro fino y determinar cuánto metal de liga corresponde a una masa teórica de aleación. Utiliza los ejemplos como base de cálculo y verifica siempre la composición real de los materiales de tu taller.</p>
        </header>

        <div className="prose prose-slate mt-8 max-w-none prose-headings:tracking-tight prose-a:text-[#876500]">
          <section>
            <h2>1. ¿Qué significa el quilataje del oro?</h2>
            <p>En una aleación de oro expresada en quilates, el valor indica cuántas partes de oro fino hay por cada 24 partes de masa. Por eso, el oro de 24K se toma como referencia teórica de pureza, mientras que las aleaciones de 18K, 14K y 9K contienen proporciones menores de oro y el resto corresponde a otros metales.</p>
            <ul>
              <li><strong>18K:</strong> 18 ÷ 24 = 0,750; equivale nominalmente a 75 % de oro fino.</li>
              <li><strong>14K:</strong> 14 ÷ 24 ≈ 0,5833; equivale nominalmente a 58,33 % de oro fino.</li>
              <li><strong>9K:</strong> 9 ÷ 24 = 0,375; equivale nominalmente a 37,5 % de oro fino.</li>
            </ul>
            <p>Estas proporciones describen la ley nominal. Los requisitos legales, las tolerancias y las denominaciones comerciales pueden variar según el país; confirma la normativa aplicable antes de marcar o comercializar una pieza.</p>
          </section>

          <section>
            <h2>2. Fórmula básica para calcular el oro fino</h2>
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
            <h2>3. Ejemplos para 10 gramos de aleación</h2>
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
            <h2>4. ¿Qué ocurre si ya tienes oro de otra ley?</h2>
            <p>Cuando se ajusta una aleación existente, no basta con aplicar directamente la tabla anterior: primero hay que conocer la masa y la ley real del material de partida, así como la composición y la ley del metal que se añadirá. El balance debe conservarse entre la masa total y la cantidad de oro fino.</p>
            <p>Para un cálculo general de mezcla, se utiliza el balance:</p>
            <div className="my-5 rounded-xl border border-slate-200 bg-white p-5 text-center">
              <p className="font-bold">Oro fino inicial + oro fino añadido = oro fino final</p>
            </div>
            <p>Si el material de partida contiene soldaduras, recubrimientos, contaminantes o una ley desconocida, la estimación puede no representar la composición efectiva. En esos casos, solicita un análisis apropiado y evita tratar una ley supuesta como si estuviera confirmada.</p>
          </section>

          <section>
            <h2>5. Pasos recomendados antes de fundir</h2>
            <ol>
              <li>Define la ley final y la masa total deseada.</li>
              <li>Verifica la masa, la ley y la procedencia de cada material de partida.</li>
              <li>Calcula el contenido de oro fino y la fracción restante de liga.</li>
              <li>Selecciona una liga compatible con el color, la aplicación y el proceso de fabricación.</li>
              <li>Registra los pesos y verifica el resultado con los controles habituales del taller.</li>
            </ol>
            <p>Los cálculos no sustituyen los procedimientos de seguridad, el control de composición ni las especificaciones del proveedor de la aleación. Utiliza equipo de protección adecuado y sigue las prácticas de fundición de tu taller.</p>
          </section>

          <section>
            <h2>Preguntas frecuentes</h2>
            <h3>¿El oro de 18K siempre contiene exactamente 75 % de oro?</h3>
            <p>18K representa una ley nominal de 18 partes de oro de cada 24, equivalente al 75 %. La conformidad real depende de la composición comprobada y de las tolerancias aplicables.</p>
            <h3>¿Puedo usar cualquier metal para completar la aleación?</h3>
            <p>No. La selección de la liga afecta el color, la dureza, la fundibilidad y otras propiedades. Utiliza una formulación adecuada para la ley, el color y el proceso previstos.</p>
            <h3>¿La calculadora garantiza la ley final después de fundir?</h3>
            <p>No. Una calculadora proporciona una estimación a partir de los datos ingresados. La ley efectiva depende de los materiales reales, el proceso y las pérdidas o contaminaciones; verifica la pieza o el lote con un método apropiado cuando corresponda.</p>
          </section>
        </div>

        <section className="mt-10 rounded-2xl border border-[#eadca7] bg-gradient-to-br from-[#fff9df] to-white p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]">Llévalo a la práctica</p>
              <h2 className="mt-2 text-xl font-bold">Calcula tu aleación de oro</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Introduce los datos de tu material en la calculadora pública y revisa las cantidades estimadas antes de preparar el lote.</p>
            </div>
            <Link to="/herramientas-publicas/aleacion-oro" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#17232d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#293b49]"><Calculator className="size-4" /> Abrir calculadora <ArrowRight className="size-4" /></Link>
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
