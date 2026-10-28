import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Gem, Ruler, Sparkles, Printer, LayoutGrid, ShieldCheck, Workflow } from "lucide-react";

export const Route = createFileRoute("/comunidad")({
  head: () => ({
    meta: [
      { title: "Comunidad joyera | AURUM LAB" },
      {
        name: "description",
        content: "Guías prácticas, recursos técnicos y formación para profesionales de la joyería. Aprende, comparte y crece con AURUM LAB.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Comunidad joyera | AURUM LAB" },
      {
        property: "og:description",
        content: "Conocimiento práctico para diseñar, fabricar y hacer crecer tu taller de joyería.",
      },
    ],
  }),
  component: ComunidadPage,
});

const guias = [
  {
    id: "aleaciones",
    categoria: "Metalurgia",
    titulo: "Aleaciones de oro: calcula antes de fundir",
    descripcion: "Repasa la relación entre quilataje, oro fino y metal de liga antes de preparar una aleación.",
    icon: Gem,
    lectura: "Guía práctica",
  },
  {
    id: "gemas",
    categoria: "Gemas y medidas",
    titulo: "Del tamaño de una gema a su peso estimado",
    descripcion: "Conoce qué medidas necesitas y por qué la densidad y la forma influyen en la estimación.",
    icon: Ruler,
    lectura: "Conceptos básicos",
  },
  {
    id: "diseno-3d",
    categoria: "Diseño digital",
    titulo: "Prepara tu modelo 3D para presentarlo",
    descripcion: "Buenas prácticas para revisar el modelo y mostrar una pieza con una presentación más cuidada.",
    icon: Sparkles,
    lectura: "Flujo de trabajo",
  },
  {
    id: "impresion-3d",
    categoria: "Fabricación digital",
    titulo: "Impresión 3D para joyería: del archivo a la pieza",
    descripcion: "Prepara geometría, orientación y soportes con criterio de taller para lograr detalles limpios y una producción más predecible.",
    icon: Printer,
    lectura: "Guía de taller",
  },
  {
    id: "distribucion-taller",
    categoria: "Diseño del taller",
    titulo: "Distribución de ambientes para un taller de joyería",
    descripcion: "Organiza diseño 3D, impresión, lavado, curado y fundición con un plano de referencia y criterios de circulación y seguridad.",
    icon: LayoutGrid,
    lectura: "Plano técnico",
  },
] as const;

function ComunidadPage() {
  return (
    <main className="min-h-screen bg-[#fffefa] text-[#17232d]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5" aria-label="AURUM LAB, inicio">
            <span className="grid size-9 place-items-center rounded-lg bg-[#f8c928] text-[#17232d]">
              <Gem className="size-5" strokeWidth={2.5} />
            </span>
            <span className="leading-tight">
              <span className="block text-[17px] font-extrabold tracking-tight">AURUM<span className="text-[#bd8d00]"> LAB</span></span>
              <span className="block text-[9px] font-medium uppercase tracking-[.15em] text-slate-500">Comunidad joyera</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600 sm:gap-6" aria-label="Navegación de comunidad">
            <Link to="/comunidad#guias" className="hidden transition hover:text-[#987400] sm:inline-flex">Biblioteca</Link>
            <Link to="/directorio" className="transition hover:text-[#987400]">Directorio</Link>
            <Link to="/galeria-joyas" className="rounded-full bg-[#17232d] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#293b49] sm:px-4">Tienda 3D</Link>
            <Link to="/" className="transition hover:text-[#987400]">Volver a AURUM LAB</Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-white via-[#fffdf5] to-[#f4f7fb]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[#ffe99b]/35 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">Aprende · Comparte · Crece</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">Conocimiento que impulsa tu taller.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">Guías técnicas, ideas de diseño y recursos para tomar mejores decisiones en tu trabajo joyero.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#guias" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#17232d] px-5 text-sm font-semibold text-white transition hover:bg-[#293b49]">Explorar guías <ArrowRight className="size-4" /></a>
            <Link to="/directorio" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-[#17232d] transition hover:border-[#d4aa19]">Ver talleres y cursos</Link>
            <Link to="/galeria-joyas" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d4aa19] bg-[#fff8d8] px-5 text-sm font-semibold text-[#604900] transition hover:bg-[#ffefad]">Explorar Tienda 3D <ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </section>

      <section id="guias" className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">Biblioteca práctica</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Ideas para el trabajo real</h2>
          </div>
          <span className="text-xs text-slate-500">Contenido especializado en joyería</span>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {guias.map((guia) => {
            const Icon = guia.icon;
            return (
              <article key={guia.id} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_3px_14px_rgba(15,23,42,.035)] transition hover:-translate-y-0.5 hover:border-[#e5c04a] hover:shadow-[0_12px_28px_rgba(15,23,42,.07)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-[#fff4c4] text-[#8f6b00]"><Icon className="size-5" /></span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{guia.lectura}</span>
                </div>
                <p className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-[#987400]">{guia.categoria}</p>
                <h3 className="mt-2 text-lg font-bold leading-snug">{guia.titulo}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{guia.descripcion}</p>
                <a href={`#${guia.id}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#876500] hover:text-[#5f4900]">Leer resumen <ArrowRight className="size-4" /></a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-[.8fr_1.2fr] md:py-16">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">Conocimiento útil</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Guías breves para empezar</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Una base clara para consultar conceptos del oficio y continuar con herramientas especializadas.</p>
            <Link to="/herramientas" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#876500]">Abrir herramientas técnicas <ArrowRight className="size-4" /></Link>
          </div>
          <div className="space-y-6">
            <article id="aleaciones" className="scroll-mt-24">
              <h3 className="flex items-center gap-2 font-bold"><Gem className="size-4 text-[#987400]" /> Aleaciones de oro</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">El quilataje expresa la proporción de oro fino en una aleación. Antes de fundir, define el quilataje objetivo, pesa cada componente con precisión y verifica la fórmula con los procedimientos de control de tu taller. Usa la calculadora de aleaciones para realizar estimaciones y revisa siempre los resultados antes de fabricar.</p>
            </article>
            <article id="gemas" className="scroll-mt-24 border-t border-slate-100 pt-5">
              <h3 className="flex items-center gap-2 font-bold"><Ruler className="size-4 text-[#987400]" /> Medidas y peso de gemas</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">El peso estimado depende de las dimensiones, la forma y la densidad de la gema. Dos piedras del mismo diámetro pueden tener pesos diferentes. Registra las medidas con cuidado y toma la estimación como referencia, no como sustituto del pesaje de una gema real.</p>
            </article>
            <article id="diseno-3d" className="scroll-mt-24 border-t border-slate-100 pt-5">
              <h3 className="flex items-center gap-2 font-bold"><Sparkles className="size-4 text-[#987400]" /> Presentación de modelos 3D</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Antes de compartir un diseño, revisa que la geometría esté completa, orientada correctamente y con una escala coherente. Para comunicar mejor el diseño, elige una vista clara, un material adecuado y una iluminación que permita distinguir los detalles de la pieza.</p>
            </article>
            <article id="impresion-3d" className="scroll-mt-24 border-t border-slate-100 pt-5">
              <h3 className="flex items-center gap-2 font-bold"><Printer className="size-4 text-[#987400]" /> Impresión 3D de joyería: precisión desde el diseño</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Una buena impresión comienza antes de encender la máquina. Revisa la escala del archivo, la continuidad de la malla y las zonas delicadas: galerías, calados, grabados, engastes y filigranas. Evita paredes excesivamente gruesas y detalles más finos de lo que permiten tu impresora y el material. La orientación debe equilibrar la calidad de superficie, la resistencia durante la impresión y la facilidad para retirar soportes sin marcar las caras visibles.</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">Selecciona la resina según el objetivo. Para prototipos y validación visual, prioriza estabilidad y detalle; para microfundición, utiliza una resina formulada específicamente para colado y sigue su ficha técnica. Lava y seca la pieza por completo y realiza el poscurado indicado por el fabricante. Si se va a fundir, diseña la alimentación con el proceso de colado en mente y respeta el revestimiento y la curva de eliminación recomendados para esa combinación de resina, inversión y horno.</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">Antes de producir una serie, imprime una prueba de las zonas críticas y registra orientación, altura de capa, soportes, lavado y poscurado. Ese pequeño protocolo ayuda a repetir resultados, reducir marcas y proteger los detalles finos de cada diseño.</p>
              <div className="mt-5 rounded-2xl border border-[#eadca7] bg-gradient-to-br from-[#fff9df] to-white p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]">Llévalo a la práctica</p>
                    <h4 className="mt-2 text-lg font-bold text-[#17232d]">Analiza tu archivo STL en AURUM LAB</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Antes de imprimir, utiliza el Asistente de impresión 3D para revisar dimensiones, número de triángulos y bordes abiertos, y estimar el consumo y el coste de resina según los parámetros que introduzcas. La inspección es una ayuda inicial: no sustituye una reparación completa de malla ni la validación en el software de preparación de impresión.</p>
                  </div>
                  <a href="/herramientas?asistente=1" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#17232d] px-5 text-sm font-semibold text-white transition hover:bg-[#293b49]">Abrir analizador STL <ArrowRight className="size-4" /></a>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
                <a href="https://formlabs.com/white-papers/introduction-to-casting-for-3d-printed-jewelry-patterns/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#876500] hover:text-[#5f4900]">Guía de diseño y colado <ArrowRight className="size-3.5" /></a>
                <a href="https://formlabs.com/support/Introduction-to-casting-with-Formlabs-resins/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#876500] hover:text-[#5f4900]">Preparación de resinas <ArrowRight className="size-3.5" /></a>
              </div>
            </article>
            <article id="distribucion-taller" className="scroll-mt-24 border-t border-slate-100 pt-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">Diseño del taller · Plano de referencia</p>
                  <h3 className="mt-2 flex items-center gap-2 text-xl font-bold tracking-tight"><LayoutGrid className="size-5 text-[#987400]" /> Distribución de ambientes para un taller de joyería</h3>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Un taller bien organizado no depende solo de dónde cabe cada máquina. La distribución debe facilitar el recorrido del trabajo, separar procesos incompatibles y dejar espacio para operar, limpiar y mantener los equipos con seguridad. El plano de referencia recibido presenta tres ambientes diferenciados y señala las medidas en centímetros.</p>
                </div>
                <span className="rounded-full border border-[#eadca7] bg-[#fff9df] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#876500]">Guía técnica</span>
              </div>

              <div className="mt-6 grid gap-3 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-[#fbfcfd] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#987400]">01 · Producción digital</span>
                    <span className="text-xs font-semibold text-slate-500">120 × 90 cm</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-1.5">
                    <div className="flex min-h-16 items-center justify-center rounded-lg border border-[#e5c04a] bg-[#fff4c4] p-2 text-center text-[10px] font-semibold text-[#604900]">Impresora</div>
                    <div className="flex min-h-16 items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-center text-[10px] font-semibold text-slate-600">Lavado</div>
                    <div className="flex min-h-16 items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-center text-[10px] font-semibold text-slate-600">Curado</div>
                    <div className="col-span-3 flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-center text-[10px] font-semibold text-slate-600">Limpieza y preparación</div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">Mantén ordenados los pasos de impresión y posprocesado; consulta las fichas de seguridad de resinas, disolventes y equipos.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-[#fbfcfd] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#987400]">02 · Diseño digital</span>
                    <span className="text-xs font-semibold text-slate-500">120 × 120 cm</span>
                  </div>
                  <div className="mt-4 flex min-h-[142px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-3">
                    <div className="w-full max-w-[180px] rounded-lg border border-[#e5c04a] bg-[#fff4c4] px-3 py-3 text-center text-xs font-semibold text-[#604900]">Mesa de computadora</div>
                    <div className="mt-2 h-4 w-24 rounded-b-lg border-x border-b border-slate-300" />
                    <div className="mt-1 rounded-full border border-slate-300 bg-slate-100 px-5 py-2 text-[10px] text-slate-600">Silla y espacio de uso</div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">Deja espacio para sentarse, levantarse y acceder al equipo sin invadir la circulación de otras áreas.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-[#fbfcfd] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#987400]">03 · Casting / fundición</span>
                    <span className="text-xs font-semibold text-slate-500">160 × 120 cm</span>
                  </div>
                  <div className="mt-4 grid min-h-[142px] grid-cols-[1.2fr_1.1fr_.7fr] gap-1.5">
                    <div className="flex items-center justify-center rounded-lg border border-[#e5c04a] bg-[#fff4c4] p-2 text-center text-[10px] font-semibold text-[#604900]">Horno</div>
                    <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-center text-[10px] font-semibold text-slate-600">Vacío</div>
                    <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-center text-[10px] font-semibold text-slate-600">Fundición</div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">Comprueba requisitos de instalación, extracción, distancias térmicas y acceso de mantenimiento para cada máquina.</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">Esquema editorial orientativo basado en las tres zonas del plano aportado; no sustituye el plano técnico original ni está a escala.</p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="flex items-center gap-2 text-sm font-bold"><Workflow className="size-4 text-[#987400]" /> Diseña el recorrido antes de instalar</h4>
                  <ol className="mt-3 space-y-2 pl-4 text-sm leading-6 text-slate-600 list-decimal">
                    <li><strong className="text-[#17232d]">Diseño:</strong> modelado y revisión del archivo.</li>
                    <li><strong className="text-[#17232d]">Fabricación digital:</strong> impresión, lavado y curado según el material.</li>
                    <li><strong className="text-[#17232d]">Fundición:</strong> preparación del molde, ciclo térmico y colado cuando el proceso lo requiera.</li>
                    <li><strong className="text-[#17232d]">Acabado:</strong> considera un puesto separado para operaciones que generen polvo, partículas o residuos.</li>
                  </ol>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="size-4 text-[#987400]" /> Seguridad y circulación</h4>
                  <ul className="mt-3 space-y-2 pl-4 text-sm leading-6 text-slate-600 list-disc">
                    <li>No bloquees pasillos, puertas, salidas ni accesos a equipos de emergencia.</li>
                    <li>Valida extracción y ventilación según las sustancias y máquinas instaladas.</li>
                    <li>Separa las fuentes de calor de resinas, disolventes y materiales combustibles según sus fichas de seguridad y normativa local.</li>
                    <li>Reserva espacio para abrir tapas, cargar equipos, retirar piezas y realizar mantenimiento.</li>
                  </ul>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-[#eadca7] bg-[#fff9df] p-4 sm:p-5">
                <h4 className="text-sm font-bold text-[#604900]">Antes de dar por aprobado el plano</h4>
                <p className="mt-2 text-sm leading-6 text-slate-700">Las medidas 120 × 90 cm, 120 × 120 cm y 160 × 120 cm se transcriben como dimensiones recomendadas por zona en el documento de referencia. El propio plano indica que las dimensiones de maquinaria son reales y están expresadas en centímetros. No se especifican aquí el modelo exacto de cada equipo, las distancias de seguridad exigidas ni la normativa aplicable al local: confirma esos datos con los fabricantes y con un profesional competente antes de ejecutar la instalación.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="border-y border-[#263743] bg-[#111a22] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8 sm:py-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#f3d66e]">Tienda 3D · Archivos digitales</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Diseños listos para llevar a tu taller.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">Explora modelos 3D, archivos CAD y planos técnicos publicados para la venta. La biblioteca sigue siendo tu espacio de aprendizaje; aquí encontrarás productos digitales con precio y formatos indicados.</p>
          </div>
          <Link to="/galeria-joyas" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#f8c928] px-5 py-3 text-sm font-bold text-[#17232d] transition hover:bg-[#ffe071]">Visitar Tienda 3D <ArrowRight className="size-4" /></Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="flex flex-col justify-between gap-5 rounded-2xl border border-[#eadca7] bg-[#fff9df] p-6 sm:flex-row sm:items-center sm:p-8>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]">La comunidad crece contigo</p>
            <h2 className="mt-2 text-xl font-bold">Encuentra talleres y formación.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Explora el directorio público de talleres, joyerías y cursos.</p>
          </div>
          <Link to="/directorio" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#17232d] px-5 text-sm font-semibold text-white transition hover:bg-[#293b49]">Abrir directorio <ArrowRight className="size-4" /></Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>AURUM LAB · Tecnología para joyeros</span>
          <div className="flex flex-wrap gap-4"><Link to="/" className="hover:text-[#987400]">Inicio</Link><Link to="/herramientas" className="hover:text-[#987400]">Herramientas</Link><Link to="/directorio" className="hover:text-[#987400]">Directorio</Link></div>
        </div>
      </footer>
    </main>
  );
}
