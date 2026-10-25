import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Boxes, Calculator, Check, ChevronDown, Cloud, Gem, Layers3, MonitorSmartphone, PackageCheck, Sparkles, Sprout, ChartNoAxesCombined } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AURUM LAB | La plataforma digital para talleres de joyería" },
      {
        name: "description",
        content:
          "Digitaliza tu taller joyero con AURUM LAB: herramientas gratuitas, visor 3D, Mi Nube y catálogo digital. Explora soluciones prácticas para tu trabajo.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "AURUM LAB — Haz crecer tu taller joyero" },
      {
        property: "og:description",
        content: "Herramientas técnicas y soluciones digitales para calcular, diseñar, organizar y presentar tus joyas.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.tallerdeljoyero.com/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://www.tallerdeljoyero.com/" }],
  }),
  component: InicioPublico,
});

const soluciones = [
  {
    numero: "01",
    etiqueta: "CALCULAR",
    icon: Calculator,
    titulo: "Calcula con precisión",
    texto: "Resuelve cálculos de aleaciones, peso de gemas, tallas y materiales para tomar mejores decisiones en tu trabajo.",
    beneficio: "Menos dudas en el banco de trabajo",
    enlace: "/herramientas-publicas" as const,
    accion: "Explorar herramientas",
  },
  {
    numero: "02",
    etiqueta: "DISEÑAR",
    icon: Gem,
    titulo: "Visualiza tu joya en 3D",
    texto: "Presenta diseños con una visualización profesional antes de llevarlos a la siguiente etapa.",
    beneficio: "Una presentación más clara para tus clientes",
    enlace: "/aurum-render-public" as const,
    accion: "Abrir visor 3D",
  },
  {
    numero: "03",
    etiqueta: "ORGANIZAR",
    icon: Cloud,
    titulo: "Ten tus archivos organizados",
    texto: "Centraliza modelos y recursos digitales para mantener el trabajo de tu taller más ordenado.",
    beneficio: "Tus recursos en un solo espacio",
    enlace: "/auth" as const,
    accion: "Conocer Mi Nube",
  },
  {
    numero: "04",
    etiqueta: "PRESENTAR",
    icon: Layers3,
    titulo: "Muestra tus piezas con claridad",
    texto: "Organiza las joyas que quieres compartir y prepara una presentación digital para tus clientes.",
    beneficio: "Una vitrina digital para tu trabajo",
    enlace: "/auth" as const,
    accion: "Acceder al catálogo",
  },
];


type PeriodicidadPlan = "mensual" | "trimestral" | "anual";

function formatoSoles(valor: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

function PlanesPublicos() {
  const [periodicidad, setPeriodicidad] = useState<PeriodicidadPlan>("mensual");
  const planes = [
    {
      nombre: "Emprendedor",
      precioMensual: 0,
      gratis: true,
      descripcion: "Empieza con herramientas útiles para joyería.",
      funciones: ["Calculadoras y herramientas técnicas", "Visor 3D público", "Explora antes de crecer"],
      destacado: false,
      accion: "Explorar herramientas",
      href: "/herramientas-publicas" as const,
    },
    {
      nombre: "Taller",
      precioMensual: 29,
      gratis: false,
      descripcion: "Ordena la gestión diaria de tu negocio.",
      funciones: ["Clientes y cotizaciones", "Pedidos, ventas y contratos", "Catálogo digital", "Mi Nube para tus archivos"],
      destacado: false,
      accion: "Acceder a la plataforma",
      href: "/auth" as const,
    },
    {
      nombre: "Profesional",
      precioMensual: 59,
      gratis: false,
      descripcion: "Conecta la gestión con el trabajo productivo.",
      funciones: ["Gestión comercial integrada", "Inventario y compras", "Aurum Render y diseño 3D", "Capacidades de fabricación", "Catálogo y archivos ampliados"],
      destacado: true,
      accion: "Acceder a la plataforma",
      href: "/auth" as const,
    },
    {
      nombre: "Empresarial",
      precioMensual: null,
      gratis: false,
      descripcion: "Para operaciones que necesitan crecer.",
      funciones: ["Configuración para equipos", "Organización de varias sedes", "Capacidades por taller", "Acompañamiento para definir necesidades"],
      destacado: false,
      accion: "Consultar solución",
      href: "/auth" as const,
    },
  ];
  const meses = periodicidad === "mensual" ? 1 : periodicidad === "trimestral" ? 3 : 12;
  const descuento = periodicidad === "trimestral" ? 0.1 : periodicidad === "anual" ? 0.25 : 0;
  const nombrePeriodo = periodicidad === "mensual" ? "mes" : periodicidad === "trimestral" ? "trimestre" : "año";
  const etiquetaPrecioMensual = periodicidad === "mensual" ? "al mes" : "al mes";
  return (
    <>
      <div className="mx-auto mt-7 flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-xl bg-slate-200/70 p-1">
        {([
          { id: "mensual", label: "Mensual", descuento: "" },
          { id: "trimestral", label: "Trimestral", descuento: "-10%" },
          { id: "anual", label: "Anual", descuento: "-25%" },
        ] as const).map((opcion) => (
          <button key={opcion.id} type="button" aria-pressed={periodicidad === opcion.id} onClick={() => setPeriodicidad(opcion.id)} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition sm:px-5 ${periodicidad === opcion.id ? "bg-[#17232d] text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-[#17232d]"}`}>
            {opcion.label}
            {opcion.descuento && <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${periodicidad === opcion.id ? "bg-emerald-600 text-white" : "bg-emerald-700 text-white"}`}>{opcion.descuento}</span>}
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        {periodicidad === "mensual" ? "Tarifa mensual de referencia." : `Ahorra ${Math.round(descuento * 100)}% frente al pago mensual.`}
      </p>
      <div className="mt-7 grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {planes.map((plan) => {
          const tienePrecio = typeof plan.precioMensual === "number";
          const precioMensual = plan.precioMensual ?? 0;
          const totalOriginal = precioMensual * meses;
          const totalFinal = totalOriginal * (1 - descuento);
          const equivalenteMensual = totalFinal / meses;
          return (
            <article key={plan.nombre} className={`relative flex h-full flex-col rounded-2xl border bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,.035)] sm:p-6 ${plan.destacado ? "border-[#d4aa19] ring-1 ring-[#d4aa19]" : "border-slate-200"}`}>
              {plan.destacado && <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#f8c928] px-3 py-1 text-[10px] font-bold text-[#17232d]">Más capacidades</span>}
              <h3 className="mt-1 text-lg font-bold text-[#17232d]">{plan.nombre}</h3>
              <p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">{plan.descripcion}</p>
              <div className="mt-5 min-h-[108px]">
                {!tienePrecio && <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#17232d]">A medida</p>}
                {tienePrecio && plan.gratis && <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#17232d]">Gratis</p>}
                {tienePrecio && !plan.gratis && (
                  <>
                    {descuento > 0 && <p className="text-xs text-slate-400 line-through">{formatoSoles(precioMensual)} / mes</p>}
                    <p className="mt-1 text-2xl font-extrabold tracking-tight text-[#17232d]">{formatoSoles(equivalenteMensual)}<span className="ml-1 text-xs font-medium text-slate-500">{etiquetaPrecioMensual}</span></p>
                    {descuento > 0 && <p className="mt-1 text-[11px] font-medium text-emerald-700">Ahorras {formatoSoles(totalOriginal - totalFinal)} en este período</p>}
                    {periodicidad !== "mensual" && <p className="mt-1 text-xs leading-5 text-slate-500">Total a pagar por {nombrePeriodo}: <strong className="text-[#17232d]">{formatoSoles(totalFinal)}</strong></p>}
                  </>
                )}
              </div>
              <ul className="mt-4 flex-1 space-y-3 border-t border-slate-100 pt-4">
                {plan.funciones.map((funcion) => <li key={funcion} className="flex items-start gap-2 text-xs leading-5 text-slate-600"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />{funcion}</li>)}
              </ul>
              <Link to={plan.href} className={`mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19] ${plan.destacado ? "bg-[#17232d] text-white hover:bg-[#293b49]" : "border border-slate-300 text-[#17232d] hover:border-[#d4aa19] hover:bg-[#fffbee]"}`}>
                {plan.accion} <ArrowRight className="size-3.5" />
              </Link>
            </article>
          );
        })}
      </div>
      <p className="mx-auto mt-5 max-w-3xl text-center text-[11px] leading-5 text-slate-500">Los descuentos del 10% trimestral y 25% anual son cálculos de presentación sobre las tarifas mensuales de referencia; las modalidades de cobro deben confirmarse comercialmente. Cada taller puede habilitar capacidades según sus procesos. Los límites y módulos incluidos deben verificarse en las condiciones de cada plan.</p>
    </>
  );
}

function InicioPublico() {
  return (
    <main className="min-h-screen bg-white text-[#17232d]">
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 shadow-[0_2px_8px_rgba(15,23,42,.05)] backdrop-blur">
        <div className="mx-auto flex min-h-[68px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="AURUM LAB, inicio">
            <span className="grid size-9 place-items-center rounded-lg bg-[#f8c928] text-[#17232d]"><Gem className="size-5" strokeWidth={2.5} /></span>
            <span className="leading-tight">
              <span className="block text-[17px] font-extrabold tracking-tight">AURUM<span className="text-[#bd8d00]"> LAB</span></span>
              <span className="block text-[9px] font-medium uppercase tracking-[.15em] text-slate-500">Tecnología para joyeros</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-[13px] font-medium text-slate-700 lg:flex" aria-label="Navegación principal">
            <Link to="/" className="transition hover:text-[#a77a00]">Inicio</Link>
            <Link to="/herramientas-publicas" className="inline-flex items-center gap-1 transition hover:text-[#a77a00]">Herramientas <ChevronDown className="size-3.5" /></Link>
            <a href="#soluciones" className="inline-flex items-center gap-1 transition hover:text-[#a77a00]">Soluciones <ChevronDown className="size-3.5" /></a>
            <a href="#como-funciona" className="transition hover:text-[#a77a00]">Cómo funciona</a>
            <Link to="/comunidad" className="transition hover:text-[#a77a00]">Comunidad</Link>
            <a href="#contacto" className="transition hover:text-[#a77a00]">Contacto</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#17232d] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#293b49] sm:text-sm"><MonitorSmartphone className="size-4" /> Ingresar</Link>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -left-32 top-12 -z-10 size-[28rem] rounded-full bg-[#ffe99b]/70 blur-[90px]" />
        <div className="pointer-events-none absolute right-[28%] top-20 -z-10 size-64 rounded-full bg-[#e9f1ff]/80 blur-[80px]" />
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[.92fr_1.08fr] lg:gap-8 lg:px-12 lg:pb-24 lg:pt-20">
          <div className="relative z-10 max-w-[650px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e5c04a]/50 bg-[#fff9df] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#785b00]"><Sparkles className="size-3.5" /> AURUM LAB · TECNOLOGÍA PARA JOYEROS</span>
            <h1 className="mt-6 text-[2.65rem] font-extrabold leading-[1.06] tracking-[-.045em] text-[#17232d] sm:text-5xl lg:text-[3.8rem]"><span className="block">El arte de crear.</span><span className="mt-2 block text-[#9a7400]">La inteligencia de gestionar.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">Todo lo que tu taller necesita para calcular, diseñar y organizar mejor.</p>
            <ul className="mt-7 space-y-4 text-sm font-medium text-[#25323b] sm:text-[15px]">
              <li className="flex items-start gap-3"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-[#fff4c4] text-[#9b7600]"><Check className="size-4" /></span>Herramientas técnicas gratuitas para el día a día.</li>
              <li className="flex items-start gap-3"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-[#fff4c4] text-[#9b7600]"><Check className="size-4" /></span>Visualización 3D y recursos para presentar tus diseños.</li>
              <li className="flex items-start gap-3"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-[#fff4c4] text-[#9b7600]"><Check className="size-4" /></span>Archivos y catálogo de tu taller en un ecosistema digital.</li>
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/herramientas-publicas" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#17232d] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-[#293b49]">Explorar herramientas <ArrowRight className="size-4" /></Link>
              <Link to="/auth" target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white/80 px-6 py-3 text-sm font-semibold text-[#17232d] transition hover:border-[#d4aa19] hover:bg-[#fffbee]">Entrar a AURUM LAB</Link>
            </div>
            <p className="mt-4 text-xs text-slate-500">Empieza gratis. Sin registro para las herramientas públicas.</p>
          </div>

          <div className="relative mx-auto w-full max-w-[720px] pb-7 sm:pb-10">
            <div className="absolute inset-x-8 bottom-0 top-12 rounded-[3rem] bg-gradient-to-br from-[#ffe99a]/70 via-[#f8faff] to-[#e4ecf7] blur-2xl" />
            <div className="relative rounded-[1.6rem] border border-slate-200 bg-white p-2.5 shadow-[0_25px_80px_rgba(28,40,52,.15)] sm:p-3">
              <div className="flex h-10 items-center gap-2 border-b border-slate-100 px-3">
                <span className="size-2.5 rounded-full bg-[#ff6b63]" /><span className="size-2.5 rounded-full bg-[#ffce45]" /><span className="size-2.5 rounded-full bg-[#4ac58b]" />
                <div className="mx-auto mr-12 rounded-full bg-slate-100 px-14 py-1 text-[9px] text-slate-400">app.tallerdeljoyero.com</div>
              </div>
              <div className="grid min-h-[310px] grid-cols-[126px_1fr] overflow-hidden rounded-b-xl sm:min-h-[365px] sm:grid-cols-[155px_1fr]">
                <aside className="border-r border-slate-100 bg-[#f8fafc] p-3 sm:p-4">
                  <div className="mb-5 flex items-center gap-2 text-[10px] font-extrabold text-[#17232d] sm:text-xs"><span className="grid size-6 place-items-center rounded-md bg-[#ffcf24]"><Gem className="size-3.5" /></span>AURUM LAB</div>
                  <p className="mb-2 text-[8px] font-bold uppercase tracking-wider text-slate-400 sm:text-[9px]">Tu espacio</p>
                  <div className="space-y-1.5 text-[9px] text-slate-600 sm:text-[11px]">
                    <div className="flex items-center gap-2 rounded-lg bg-[#fff2bd] px-2 py-2 font-semibold text-[#665000]"><Boxes className="size-3.5" /> Resumen</div>
                    <div className="flex items-center gap-2 px-2 py-2"><Cloud className="size-3.5" /> Mi Nube</div>
                    <div className="flex items-center gap-2 px-2 py-2"><Gem className="size-3.5" /> Diseños 3D</div>
                    <div className="flex items-center gap-2 px-2 py-2"><Layers3 className="size-3.5" /> Catálogo</div>
                  </div>
                  <div className="mt-6 rounded-lg border border-slate-200 bg-white p-2">
                    <p className="text-[8px] font-semibold text-slate-700 sm:text-[9px]">¿Necesitas calcular?</p>
                    <p className="mt-1 text-[8px] leading-4 text-slate-400">Abre las herramientas gratuitas.</p>
                    <div className="mt-2 h-1.5 rounded-full bg-[#ffcf24]" />
                  </div>
                </aside>
                <div className="min-w-0 p-3 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="text-[9px] text-slate-400 sm:text-[10px]">TU TALLER DIGITAL</p><h2 className="mt-1 text-sm font-bold text-[#17232d] sm:text-lg">Todo para tu taller, en un lugar</h2></div>
                    <span className="rounded-full bg-[#e9f8ef] px-2 py-1 text-[8px] font-semibold text-[#27834d] sm:text-[9px]">Espacio de trabajo</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
                    <div className="rounded-xl border border-slate-100 bg-white p-2 shadow-sm sm:p-3"><span className="grid size-7 place-items-center rounded-lg bg-[#fff4c4] text-[#967300]"><Calculator className="size-3.5" /></span><p className="mt-2 text-[9px] font-semibold text-slate-700 sm:text-[11px]">Herramientas técnicas</p><p className="mt-1 text-[8px] text-slate-400 sm:text-[9px]">Cálculos para tu oficio</p></div>
                    <div className="rounded-xl border border-slate-100 bg-white p-2 shadow-sm sm:p-3"><span className="grid size-7 place-items-center rounded-lg bg-[#eaf1ff] text-[#4d6ba5]"><Cloud className="size-3.5" /></span><p className="mt-2 text-[9px] font-semibold text-slate-700 sm:text-[11px]">Mi Nube</p><p className="mt-1 text-[8px] text-slate-400 sm:text-[9px]">Tus archivos organizados</p></div>
                  </div>
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-white via-[#fffdf6] to-[#f2f5f8] sm:mt-4">
                    <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                      <p className="text-[9px] font-semibold text-slate-700 sm:text-[10px]">Diseña y visualiza tus joyas</p>
                      <span className="text-[8px] font-semibold tracking-wide text-[#987400]">AURUM RENDER</span>
                    </div>
                    <div className="flex min-h-[118px] items-center gap-3 p-3 sm:min-h-[155px] sm:gap-4 sm:p-5">
                      <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-[#eadca7] bg-[#fff5ce] text-[#8d6b00] sm:size-16">
                        <Gem className="size-6 sm:size-8" strokeWidth={1.6} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#17232d] sm:text-sm">Estudio profesional de joyería 3D</p>
                        <p className="mt-1 text-[10px] leading-4 text-slate-500 sm:text-xs sm:leading-5">Explora el visor público y carga un modelo compatible para visualizar tu diseño.</p>
                        <Link to="/aurum-render-public" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#17232d] px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-[#293b49] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19] sm:text-xs">
                          Abrir visor 3D <ArrowRight className="size-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-1 left-3 flex max-w-[205px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_12px_35px_rgba(28,40,52,.14)] sm:bottom-0 sm:left-0 sm:max-w-[235px] sm:p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff2bd] text-[#8c6a00]"><PackageCheck className="size-5" /></span>
              <div><p className="text-[10px] font-bold text-[#17232d] sm:text-xs">Diseñado para tu oficio</p><p className="mt-1 text-[9px] leading-4 text-slate-500 sm:text-[10px]">Recursos digitales en un solo ecosistema.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section id="soluciones" className="border-y border-slate-200 bg-[#f7f9fc]">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">Tecnología pensada para el oficio joyero</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#17232d] sm:text-3xl lg:text-4xl">¿Qué necesitas resolver en tu taller?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Soluciones concretas para diseñar, organizar y presentar tu trabajo, en un solo ecosistema.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {soluciones.map(({ numero, etiqueta, icon: Icono, titulo, texto, beneficio, enlace, accion }) => (
              <article key={titulo} className="group relative flex min-h-[290px] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_5px_20px_rgba(23,35,45,.035)] transition duration-200 hover:-translate-y-1 hover:border-[#dfbd4b] hover:shadow-[0_18px_40px_rgba(23,35,45,.09)] sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-12 place-items-center rounded-xl bg-[#fff3c1] text-[#8f6b00] transition-colors group-hover:bg-[#ffdf65]"><Icono className="size-5" strokeWidth={1.8} /></span>
                  <span className="text-[11px] font-semibold tracking-[.16em] text-slate-300">{numero}</span>
                </div>
                <p className="mt-5 text-[9px] font-bold tracking-[.18em] text-[#9a7600]">{etiqueta}</p>
                <h3 className="mt-2 text-lg font-bold leading-snug text-[#17232d]">{titulo}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{texto}</p>
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-[11px] leading-5 text-slate-500"><span className="mr-1.5 text-[#b58b00]">✓</span>{beneficio}</p>
                  <Link to={enlace} className="mt-4 inline-flex min-h-9 items-center gap-2 text-xs font-bold text-[#765900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19] focus-visible:ring-offset-2">{accion}<ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" /></Link>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#eadca8] bg-[#fffdf5] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#ffefad] text-[#8f6b00]"><Layers3 className="size-5" /></span>
              <div>
                <h3 className="text-sm font-bold text-[#17232d]">Un ecosistema que crece contigo</h3>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">Empieza con lo que necesitas y habilita nuevas capacidades conforme evoluciona tu taller. Las funciones disponibles dependen de tu plan y de los módulos activados.</p>
              </div>
            </div>
            <a href="#planes" className="inline-flex min-h-9 shrink-0 items-center gap-2 self-start text-xs font-bold text-[#765900] transition hover:text-[#17232d] sm:self-center">Conocer los planes<ArrowRight className="size-3.5" /></a>
          </div>
        </div>
      </section>

      <section id="crece-con-tu-taller" className="border-y border-slate-200 bg-[#f7f9fc]">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">Un ecosistema para el oficio joyero</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#17232d] sm:text-3xl lg:text-4xl">Cada taller es diferente. AURUM LAB crece contigo.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Encuentra las herramientas que se adaptan a tu forma de trabajar y activa nuevas capacidades cuando las necesites.</p>
          </div>
          <div className="mt-9 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_20px_rgba(23,35,45,.035)] transition duration-200 hover:-translate-y-1 hover:border-[#dfbd4b] hover:shadow-[0_18px_40px_rgba(23,35,45,.09)]">
              <div className="aspect-[5/3] overflow-hidden bg-[#f5f2eb]">
                <img src={heroJoyeria} alt="Diseño de joyería con detalles ornamentales" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-[9px] font-bold tracking-[.18em] text-[#987400]">PRECISIÓN Y OFICIO</p>
                <h3 className="mt-2 text-lg font-bold leading-snug text-[#17232d]">Taller artesanal</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">Calcula aleaciones, peso de gemas, tallas y materiales con herramientas técnicas.</p>
                <Link to="/herramientas-publicas" className="mt-5 inline-flex min-h-9 items-center gap-2 text-xs font-bold text-[#765900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19] focus-visible:ring-offset-2">Explorar herramientas <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" /></Link>
              </div>
            </article>
            <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_20px_rgba(23,35,45,.035)] transition duration-200 hover:-translate-y-1 hover:border-[#dfbd4b] hover:shadow-[0_18px_40px_rgba(23,35,45,.09)]">
              <div className="aspect-[5/3] overflow-hidden bg-[#f5f2eb]">
                <img src={heroColgante} alt="Diseño de colgante de joyería" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-[9px] font-bold tracking-[.18em] text-[#987400]">DISEÑO DIGITAL</p>
                <h3 className="mt-2 text-lg font-bold leading-snug text-[#17232d]">Diseño y fabricación 3D</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">Visualiza diseños y prepara presentaciones de tus piezas con herramientas 3D.</p>
                <Link to="/aurum-render-public" className="mt-5 inline-flex min-h-9 items-center gap-2 text-xs font-bold text-[#765900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19] focus-visible:ring-offset-2">Descubrir el visor 3D <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" /></Link>
              </div>
            </article>
            <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_20px_rgba(23,35,45,.035)] transition duration-200 hover:-translate-y-1 hover:border-[#dfbd4b] hover:shadow-[0_18px_40px_rgba(23,35,45,.09)]">
              <div className="aspect-[5/3] overflow-hidden bg-[#f5f2eb]">
                <img src={heroFloral} alt="Detalle ornamental de una pieza de joyería" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-[9px] font-bold tracking-[.18em] text-[#987400]">ORGANIZACIÓN</p>
                <h3 className="mt-2 text-lg font-bold leading-snug text-[#17232d]">Gestión del taller</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">Accede a archivos, clientes y capacidades de gestión según las necesidades de tu operación.</p>
                <Link to="/auth" className="mt-5 inline-flex min-h-9 items-center gap-2 text-xs font-bold text-[#765900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19] focus-visible:ring-offset-2">Conocer la plataforma <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" /></Link>
              </div>
            </article>
            <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_20px_rgba(23,35,45,.035)] transition duration-200 hover:-translate-y-1 hover:border-[#dfbd4b] hover:shadow-[0_18px_40px_rgba(23,35,45,.09)]">
              <div className="aspect-[5/3] overflow-hidden bg-[#f5f2eb]">
                <img src={heroGemelos} alt="Diseño de gemelos de joyería" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-[9px] font-bold tracking-[.18em] text-[#987400]">PRESENTACIÓN COMERCIAL</p>
                <h3 className="mt-2 text-lg font-bold leading-snug text-[#17232d]">Comercialización de joyas</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">Organiza tus piezas y prepara una presentación digital para tus clientes.</p>
                <Link to="/auth" className="mt-5 inline-flex min-h-9 items-center gap-2 text-xs font-bold text-[#765900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19] focus-visible:ring-offset-2">Acceder al catálogo <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" /></Link>
              </div>
            </article>
          </div>
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#eadca8] bg-[#fffdf5] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#ffefad] text-[#8f6b00]"><Layers3 className="size-5" /></span>
              <div>
                <h3 className="text-sm font-bold text-[#17232d]">Empieza con lo que necesitas. Amplía cuando estés listo.</h3>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">Las capacidades disponibles dependen de tu plan y de los módulos habilitados para tu taller.</p>
              </div>
            </div>
            <a href="#planes" className="inline-flex min-h-9 shrink-0 items-center gap-2 self-start text-xs font-bold text-[#765900] transition hover:text-[#17232d] sm:self-center">Conocer los planes <ArrowRight className="size-3.5" /></a>
          </div>
        </div>
      </section>

      <section id="planes" className="border-y border-slate-200 bg-[#f8fafc]">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">Planes para cada etapa</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#17232d] sm:text-3xl">Elige cómo quieres crecer.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">Empieza con lo esencial y amplía las capacidades de tu taller cuando lo necesites.</p>
          </div>
          <PlanesPublicos />
        </div>
      </section>

      <section id="como-funciona" className="mx-auto grid max-w-[1440px] gap-8 px-5 py-14 sm:px-8 sm:py-16 md:grid-cols-[1fr_auto] md:items-center lg:px-12">
        <div className="max-w-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">Empieza a tu ritmo</p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#17232d] sm:text-3xl">Empieza gratis. Crece a tu ritmo.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Prueba las herramientas sin registrarte. Crea tu cuenta cuando quieras dar el siguiente paso.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
          <Link to="/herramientas-publicas" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#17232d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#293b49]">Probar gratis <ArrowRight className="size-4" /></Link>
          <Link to="/auth" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-[#17232d] transition hover:border-[#d4aa19] hover:bg-[#fffbee]">Crear cuenta o ingresar</Link>
        </div>
      </section>

      <footer id="contacto" className="border-t border-[#263743] bg-[#17232d] text-slate-300">
        <div className="mx-auto max-w-[1440px] px-5 py-9 sm:px-8 sm:py-10 lg:px-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] lg:gap-12">
            <div>
              <Link to="/" className="inline-flex items-center gap-2 text-white" aria-label="AURUM LAB, inicio">
                <span className="grid size-8 place-items-center rounded-lg bg-[#f8c928] text-[#17232d]"><Gem className="size-4" /></span>
                <span className="text-lg font-extrabold tracking-tight">AURUM<span className="text-[#f8c928]"> LAB</span></span>
              </Link>
              <p className="mt-3 max-w-xs text-xs leading-5 text-slate-300">Tecnología digital para talleres de joyería. Crece a tu ritmo.</p>
              <a href="mailto:noreply@tallerdeljoyero.com" className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-white transition hover:text-[#f8c928]">noreply@tallerdeljoyero.com <ArrowRight className="size-3.5" /></a>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Plataforma</h2>
              <ul className="mt-3 space-y-3 text-xs">
                <li><Link to="/herramientas-publicas" className="transition hover:text-[#f8c928]">Herramientas para joyeros</Link></li>
                <li><Link to="/aurum-render-public" className="transition hover:text-[#f8c928]">Visor 3D</Link></li>
                <li><Link to="/auth" target="_blank" rel="noreferrer" className="transition hover:text-[#f8c928]">Ingresar a AURUM LAB</Link></li>
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Recursos y contacto</h2>
              <ul className="mt-3 space-y-3 text-xs">
                <li><Link to="/comunidad" className="transition hover:text-[#f8c928]">Comunidad</Link></li>
                <li><a href="mailto:noreply@tallerdeljoyero.com" className="transition hover:text-[#f8c928]">Escríbenos</a></li>
                <li><a href="#planes" className="transition hover:text-[#f8c928]">Planes</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-4 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} AURUM LAB · Taller del Joyero</span>
            <span>El arte de crear. La inteligencia de gestionar.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
