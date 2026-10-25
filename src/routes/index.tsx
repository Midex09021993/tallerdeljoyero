import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Boxes, Calculator, Check, ChevronDown, Cloud, Gem, Layers3, MonitorSmartphone, PackageCheck, Sparkles, Sprout, ChartNoAxesCombined } from "lucide-react";
import heroJoyeria from "@/assets/diseno-corona.jpg";

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
    icon: Calculator,
    titulo: "Herramientas para joyeros",
    texto: "Calcula oro, gemas y materiales.",
    enlace: "/herramientas-publicas" as const,
    accion: "Probar gratis",
  },
  {
    icon: Gem,
    titulo: "Aurum Render y visor 3D",
    texto: "Visualiza y presenta tus joyas en 3D.",
    enlace: "/aurum-render-public" as const,
    accion: "Explorar visor 3D",
  },
  {
    icon: Cloud,
    titulo: "Mi Nube",
    texto: "Guarda y organiza tus archivos.",
    enlace: "/auth" as const,
    accion: "Conocer Mi Nube",
  },
  {
    icon: Layers3,
    titulo: "Catálogo digital",
    texto: "Prepara tu catálogo para clientes.",
    enlace: "/catalogo" as const,
    accion: "Ver catálogo",
  },
];

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
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 sm:mt-4">
                    <div className="flex items-center justify-between px-3 py-2"><p className="text-[9px] font-semibold text-slate-700 sm:text-[10px]">Inspiración y diseño</p><span className="text-[8px] text-slate-400">AURUM Render</span></div>
                    <img src={heroJoyeria} alt="Detalle ornamental de una pieza de joyería" className="h-[118px] w-full object-cover object-center sm:h-[155px]" />
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

      <section id="soluciones" className="border-y border-slate-200 bg-[#f8fafc]">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">Una plataforma. Varias soluciones.</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#17232d] sm:text-3xl">Todo empieza con lo que necesitas resolver hoy.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">Cuatro soluciones para el trabajo diario de tu taller.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {soluciones.map(({ icon: Icono, titulo, texto, enlace, accion }) => (
              <article key={titulo} className="group flex min-h-56 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,.035)] transition duration-200 hover:-translate-y-1 hover:border-[#e5c04a] hover:shadow-[0_15px_35px_rgba(15,23,42,.08)]">
                <span className="grid size-11 place-items-center rounded-xl bg-[#fff4c4] text-[#8f6b00]"><Icono className="size-5" /></span>
                <h3 className="mt-5 text-base font-bold text-[#17232d]">{titulo}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{texto}</p>
                <Link to={enlace} className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[#806100] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19]">{accion} <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="crece-con-tu-taller" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">Una plataforma que crece contigo</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#17232d] sm:text-3xl">Empieza con lo que necesitas. Crece con tu taller.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">Activa nuevas capacidades a medida que tu negocio evoluciona. Tú marcas el ritmo; AURUM LAB te acompaña.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-[#e5c04a] hover:shadow-[0_12px_30px_rgba(15,23,42,.07)]">
              <span className="grid size-11 place-items-center rounded-xl bg-[#fff4c4] text-[#8f6b00]"><Sprout className="size-5" /></span>
              <h3 className="mt-4 text-base font-bold text-[#17232d]">Empieza</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Resuelve tareas del día a día con herramientas técnicas.</p>
            </article>
            <article className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-[#e5c04a] hover:shadow-[0_12px_30px_rgba(15,23,42,.07)]">
              <span className="grid size-11 place-items-center rounded-xl bg-[#fff4c4] text-[#8f6b00]"><Gem className="size-5" /></span>
              <h3 className="mt-4 text-base font-bold text-[#17232d]">Diseña</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Visualiza y presenta tus joyas con herramientas 3D.</p>
            </article>
            <article className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-[#e5c04a] hover:shadow-[0_12px_30px_rgba(15,23,42,.07)]">
              <span className="grid size-11 place-items-center rounded-xl bg-[#fff4c4] text-[#8f6b00]"><Cloud className="size-5" /></span>
              <h3 className="mt-4 text-base font-bold text-[#17232d]">Organiza</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Centraliza archivos y recursos de tu taller.</p>
            </article>
            <article className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-[#e5c04a] hover:shadow-[0_12px_30px_rgba(15,23,42,.07)]">
              <span className="grid size-11 place-items-center rounded-xl bg-[#fff4c4] text-[#8f6b00]"><ChartNoAxesCombined className="size-5" /></span>
              <h3 className="mt-4 text-base font-bold text-[#17232d]">Crece</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Incorpora módulos de gestión según las necesidades de tu negocio.</p>
            </article>
          </div>
          <p className="mt-5 text-center text-xs leading-5 text-slate-500">Las funciones disponibles dependen del plan y de los módulos habilitados para cada taller.</p>
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

      <footer id="contacto" className="border-t border-slate-200 bg-[#f8fafc]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <div><p className="font-bold tracking-wide text-[#17232d]">AURUM LAB</p><p className="mt-1">Tecnología digital para talleres de joyería.</p></div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 font-medium">
            <Link to="/herramientas-publicas" className="transition hover:text-[#806100]">Herramientas gratuitas</Link>
            <Link to="/aurum-render-public" className="transition hover:text-[#806100]">Visor 3D</Link>
            <Link to="/auth" target="_blank" rel="noreferrer" className="transition hover:text-[#806100]">Acceso a la plataforma</Link>
          </div>
          <span>© {new Date().getFullYear()} AURUM LAB</span>
        </div>
      </footer>
    </main>
  );
}
