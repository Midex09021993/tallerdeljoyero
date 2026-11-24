import { useEffect, useState } from "react";
import { registrarVisitaAfiliado } from "@/lib/aurum-afiliados-referral";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, BookOpen, Bot, CalendarDays, CheckCircle2, Clock3, Gem, GraduationCap,
  Layers3, Monitor, MousePointer2, PenTool, Ruler, ShieldCheck, UsersRound,
  Sparkles, Target, X,
} from "lucide-react";

export const Route = createFileRoute("/cursos-diseno-3d")({
  head: () => ({
    meta: [
      { title: "Diseño CAD 3D para Joyería con IA – Nivel 1 | AURUM LAB" },
      {
        name: "description",
        content: "Aprende diseño CAD 3D para joyería con docente, laboratorios interactivos y AURI Tutor, nuestro asistente de inteligencia artificial integrado en AURUM LAB.",
      },
      { property: "og:title", content: "Diseño CAD 3D para Joyería y Manufactura Aditiva con IA – Nivel 1 | AURUM LAB" },
      { property: "og:description", content: "Curso online en vivo de Rhinoceros para joyería, con docente, 10 sesiones y laboratorios interactivos." },
      { property: "og:url", content: "https://www.tallerdeljoyero.com/cursos-diseno-3d" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
    ],
    links: [{ rel: "canonical", href: "https://www.tallerdeljoyero.com/cursos-diseno-3d" }],
  }),
  component: CursosDiseno3DPage,
});

const courseStructuredData = {
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "Diseño CAD 3D para Joyería y Manufactura Aditiva con Inteligencia Artificial – Nivel 1",
  "description": "Curso online en vivo de CAD 3D para joyería con 10 sesiones, laboratorios interactivos y acompañamiento de AURI Tutor, el asistente de inteligencia artificial de AURUM LAB.",
  "inLanguage": "es-PE",
  "educationalLevel": "Nivel 1",
  "timeRequired": "PT20H",
  "provider": {
    "@type": "Organization",
    "name": "AURUM LAB",
    "url": "https://www.tallerdeljoyero.com/"
  },
  "hasCourseInstance": {
    "@type": "CourseInstance",
    "courseWorkload": "10 sesiones · 20 horas académicas",
    "courseMode": "Online",
    "startDate": "2026-11-30"
  },
  "offers": {
    "@type": "Offer",
    "price": "230",
    "priceCurrency": "USD",
    "url": "https://www.tallerdeljoyero.com/cursos-diseno-3d#inversion"
  }
} as const;

const sesiones = [
  { n: "01", title: "Entorno digital y navegación en Rhinoceros", detail: "Conoce la interfaz, las vistas, los ejes, la configuración inicial y los movimientos de cámara.", practica: "Rhino Viewport Trainer · recorrido guiado por el espacio 3D" },
  { n: "02", title: "Geometría básica y organización del proyecto", detail: "Crea líneas, polilíneas, círculos y rectángulos. Reconoce objetos y organiza componentes mediante capas.", practica: "Geometry Lab · Curve Lab · laboratorio de capas MatrixGold" },
  { n: "03", title: "Modelado preciso y herramientas de referencia", detail: "Trabaja con coordenadas absolutas, relativas y polares; restricciones de distancia y ángulo, Osnap y SmartTrack.", practica: "Entrenador Osnap · simulador SmartTrack · práctica integradora de placa base" },
  { n: "04", title: "Edición y transformación de curvas", detail: "Aplica Fillet, Chamfer, Offset, Trim, Split, Extend, Join, Move, Copy, Rotate y Scale.", practica: "Curve Editor · práctica de edición y transformación de perfiles" },
  { n: "05", title: "Curvas NURBS y continuidad", detail: "Crea y edita curvas libres, controla puntos, reconstruye perfiles y estudia continuidad y suavidad.", practica: "NURBS Studio · práctica de perfil orgánico para joyería" },
  { n: "06", title: "Modelado de sólidos para joyería", detail: "Construye volúmenes mediante extrusión y revolución; revisa anillos y comprueba sólidos cerrados.", practica: "Laboratorios de extrusión, revolución, anillo e inspección de sólidos" },
  { n: "07", title: "Creación y edición de superficies", detail: "Prepara curvas guía, estudia barridos y revolución por carril, y modela formas orgánicas simples.", practica: "Práctica guiada de construcción de superficies" },
  { n: "08", title: "Validación y preparación del modelo", detail: "Comprueba sólidos, detecta problemas geométricos, realiza limpieza y revisa espesores y detalles.", practica: "Práctica guiada de revisión y control geométrico" },
  { n: "09", title: "Exportación y presentación del diseño", detail: "Prepara archivos STL, comprueba la exportación, conoce el prototipado en resina e introduce el renderizado.", practica: "Exportación STL e introducción a AURUM RENDER" },
  { n: "10", title: "Proyecto integrador y presentación final", detail: "Desarrolla y revisa un proyecto, prepara el modelo para fabricación y presenta el resultado.", practica: "Proyecto final · evaluación y cierre del curso" },
] as const;

const laboratorios = [
  { icon: MousePointer2, title: "Rhino Viewport Trainer", desc: "Aprende a moverte por las vistas 3D, usar zoom y orbitar modelos." },
  { icon: Layers3, title: "Geometry Lab y Curve Lab", desc: "Crea geometrías y curvas básicas con ejercicios interactivos." },
  { icon: Ruler, title: "Coordenadas, Osnap y SmartTrack", desc: "Practica coordenadas, referencias y alineaciones paso a paso." },
  { icon: PenTool, title: "Curve Editor y NURBS Studio", desc: "Edita curvas, mueve puntos y compara su continuidad." },
  { icon: Monitor, title: "Laboratorios de sólidos", desc: "Practica extrusiones, revoluciones y modelado de anillos." },
  { icon: Target, title: "Prácticas de organización por capas", desc: "Ordena las piezas de tu proyecto con capas." },
] as const;

const complementos = [
  { icon: Gem, title: "AURUM RENDER", desc: "Conoce el flujo de visualización y presentación de modelos de joyería." },
  { icon: Ruler, title: "Calculadoras técnicas", desc: "Complementa tu trabajo con cálculos de aleaciones, medidas y pesos." },
  { icon: Layers3, title: "Mi Nube", desc: "Organiza y conserva los archivos de tus proyectos." },
] as const;

function CursosDiseno3DPage() {
  const [programaAbierto, setProgramaAbierto] = useState(false);
  const [bonoAbierto, setBonoAbierto] = useState(false);
  const [nivelEscrito, setNivelEscrito] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get("ref");
    if (!codigo) return;

    let vigente = true;
    void registrarVisitaAfiliado(codigo)
      .catch((error) => console.warn("[afiliados] No se pudo registrar la visita:", error))
      .finally(() => {
        if (!vigente) return;
        params.delete("ref");
        const query = params.toString();
        const cleanUrl = window.location.pathname + (query ? `?${query}` : "") + window.location.hash;
        window.history.replaceState(window.history.state, "", cleanUrl);
      });

    return () => { vigente = false; };
  }, []);

  useEffect(() => {
    // La escritura es parte visible de la identidad del curso:
    // se ejecuta también cuando el sistema solicita reducir movimiento.
    setNivelEscrito(0);
    let letras = 0;
    let escritura: number | undefined;
    let pausa: number | undefined;
    const inicio = window.setTimeout(() => {
      escritura = window.setInterval(() => {
        if (letras < 7) {
          letras += 1;
          setNivelEscrito(letras);
          if (letras === 7) {
            pausa = window.setTimeout(() => {
              letras = 0;
              setNivelEscrito(0);
            }, 1400);
          }
        }
      }, 850);
    }, 500);
    return () => {
      window.clearTimeout(inicio);
      if (escritura !== undefined) window.clearInterval(escritura);
      if (pausa !== undefined) window.clearTimeout(pausa);
    };
  }, []);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseStructuredData) }} />
    <main className="min-h-screen bg-[#f7f6f2] text-[#1d2b39]">
      <header className="sticky top-0 z-30 border-b border-[#e7e2d8] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-7 lg:px-10">
          <Link to="/herramientas" className="flex items-center gap-2.5">
            <img src="/brand/aurum-symbol.svg" alt="AURUM LAB" width="42" height="34" className="h-9 w-10 shrink-0 object-contain" />
            <span><span className="block text-sm font-bold tracking-wide text-[#1d2b39]">AURUM LAB</span><span className="block text-[9px] uppercase tracking-[.2em] text-[#718096]">Formación profesional</span></span>
          </Link>
          <nav className="hidden items-center gap-6 text-xs font-medium text-[#586b7e] md:flex">
            <a href="#programa" onClick={(event) => { event.preventDefault(); setProgramaAbierto(true); window.setTimeout(() => document.getElementById("programa")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80); }} className="hover:text-[#a77d32]">Programa</a>
            <a href="#laboratorios" className="hover:text-[#a77d32]">Laboratorios</a>
            <a href="#auri-tutor" className="hover:text-[#a77d32]">AURI Tutor</a>
            <a href="#inversion" className="hover:text-[#a77d32]">Inversión</a>
          </nav>
          <Link to="/auth" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#e9c65f] px-4 text-xs font-bold text-[#202b35] shadow-sm transition hover:bg-[#dfb83e]">Registro gratuito <ArrowRight className="size-4" /></Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#e8e1d4] bg-white">
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 size-[28rem] rounded-full bg-[#fff2c5]/70 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 size-[26rem] rounded-full bg-[#e6edf4]/80 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-start gap-8 px-4 py-9 sm:px-7 sm:py-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-9 lg:px-10 lg:py-10 xl:gap-12">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#e8d7a4] bg-[#fff9e9] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-[#967020]"><Sparkles className="size-3.5" /> Formación aplicada a la joyería</p>
            
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.02] tracking-tight text-[#1d2b39] sm:text-5xl lg:text-[3.15rem] xl:text-[3.55rem]">Diseño CAD 3D para Joyería y Manufactura Aditiva con Inteligencia Artificial <span className="text-[#b58b37]">– <span className="inline-block min-w-[1ch] whitespace-nowrap border-r-2 border-[#b58b37] pr-[.08em] align-bottom animate-pulse" style={{ borderRightColor: nivelEscrito >= 7 ? "transparent" : "#b58b37" }}>{ "Nivel 1".slice(0, nivelEscrito) }<span className="sr-only">Nivel 1</span></span></span></h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#52677b] sm:text-lg sm:leading-7">Formación profesional en diseño 3D, modelado de joyería, fabricación digital e inteligencia artificial aplicada.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#ead7a5] bg-[#fff8e6] px-3 py-2 text-xs font-bold text-[#8d6926]"><Clock3 className="size-4" /> Inicio de clases: 30 de noviembre</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#dce7ef] bg-white px-3 py-2 text-xs font-semibold text-[#40576c]"><Monitor className="size-4 text-[#a17a2e]" /> Clases online en vivo con docente</span>
              <a href="#auri-tutor" className="inline-flex items-center gap-2 rounded-full border border-[#d8e4ed] bg-[#f5f9fc] px-3 py-2 text-xs font-bold text-[#36536b] transition hover:border-[#b58b37]"><Bot className="size-4 text-[#a17a2e]" /> Incluye AURI Tutor · IA propia</a>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/auth" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#e9c65f] px-5 text-sm font-bold text-[#202b35] shadow-md shadow-[#b58b37]/15 transition hover:-translate-y-0.5 hover:bg-[#dfb83e]">Registrarme gratis <ArrowRight className="size-4" /></Link>
              <button type="button" aria-expanded={programaAbierto} aria-controls="programa" onClick={() => setProgramaAbierto((abierto) => !abierto)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#d9e0e6] bg-white px-5 text-sm font-semibold text-[#33485b] transition hover:border-[#c5a45a]">{programaAbierto ? "Ocultar programa" : "Ver las 10 sesiones"} <span aria-hidden="true" className={`transition-transform ${programaAbierto ? "rotate-180" : ""}`}>⌄</span></button>
            </div>
            <p className="mt-5 max-w-[22rem] text-xs leading-5 text-[#738397]">Crear tu cuenta en AURUM LAB es gratuito. La matrícula del curso es independiente.</p>
          </div>
          <div className="relative lg:mt-[3.35rem]">
            <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-[#f8e8b5] via-white to-[#dfe8f0] blur-xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-[#e5dfd3] bg-white p-4 shadow-[0_20px_55px_rgba(31,45,58,.11)] sm:p-5 lg:p-6">
              <div className="flex items-center justify-between border-b border-[#edf0f2] pb-4">
                <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a17a2e]">Tu ruta de aprendizaje</p><p className="mt-1 text-sm font-semibold text-[#243547]">De los fundamentos al proyecto final</p></div>
                <span className="grid size-11 place-items-center rounded-2xl bg-[#fff3cc] text-[#a17a2e]"><GraduationCap className="size-6" /></span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[{icon:Clock3,value:"20 horas",label:"académicas"},{icon:BookOpen,value:"10 sesiones",label:"de 2 horas"},{icon:Monitor,value:"Nivel inicial",label:"progresivo"},{icon:ShieldCheck,value:"Práctica",label:"con laboratorios"}].map((item)=><div key={item.value} className="rounded-xl border border-[#e9edf0] bg-[#fbfcfd] p-3"><item.icon className="size-4 text-[#b18a3e]" /><p className="mt-2 text-base font-bold text-[#23374a]">{item.value}</p><p className="text-xs text-[#718196]">{item.label}</p></div>)}
              </div>
              <div className="mt-4 rounded-xl border border-[#eadcb7] bg-[#fffaf0] p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#98742f]">Al finalizar</p>
                <p className="mt-1 text-sm leading-6 text-[#53677a]">Aprenderás desde la navegación básica hasta validar y exportar un modelo de joyería.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {programaAbierto && <section id="programa" className="scroll-mt-24 mx-auto max-w-7xl px-4 py-14 sm:px-7 lg:px-10 lg:py-20" aria-label="Programa académico">
        <div className="max-w-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#a17a2e]">Programa académico</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#1d2b39] sm:text-4xl">10 sesiones para construir tu base en modelado 3D</h2>
          <p className="mt-4 text-sm leading-7 text-[#64778a]">Son 10 sesiones de 2 horas. Aprenderás un tema por clase y lo practicarás en el Aula de Formación.</p>
        </div>
        <div className="mt-8 grid gap-3 lg:grid-cols-2">
          {sesiones.map((s)=><article key={s.n} className="group rounded-2xl border border-[#e5e8e9] bg-white p-5 shadow-[0_5px_18px_rgba(31,45,58,.035)] transition hover:-translate-y-0.5 hover:border-[#d8bd7b] hover:shadow-md sm:p-6">
            <div className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#eadcb7] bg-[#fff9e9] text-sm font-bold text-[#9a742d]">{s.n}</span>
              <div className="min-w-0"><h3 className="text-base font-bold text-[#26394b]">{s.title}</h3><p className="mt-2 text-sm leading-6 text-[#687b8d]">{s.detail}</p><div className="mt-3 rounded-lg bg-[#f5f7f8] px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#9b7938]">Práctica y laboratorio</p><p className="mt-1 text-xs leading-5 text-[#53677a]">{s.practica}</p></div></div>
            </div>
          </article>)}
        </div>
      </section>}

      <section id="laboratorios" className="scroll-mt-24 border-y border-[#e2e7eb] bg-[#edf1f4]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-7 lg:px-10 lg:py-18">
          <div className="max-w-3xl"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#9b7835]">Práctica interactiva de CAD 3D</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#1d2b39] sm:text-4xl">Laboratorios interactivos de Rhinoceros para joyería</h2><p className="mt-4 text-sm leading-7 text-[#5e7183]">Practica CAD 3D para joyería con Rhinoceros. Entrena navegación, geometría, curvas, coordenadas, Osnap y SmartTrack. También trabaja superficies y sólidos. Cada laboratorio te guía con ejercicios para preparar modelos para fabricación.</p></div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {laboratorios.map(({icon:Icon,title,desc})=><article key={title} className="rounded-2xl border border-white bg-white p-5 shadow-sm"><span className="grid size-11 place-items-center rounded-xl bg-[#fff3cc] text-[#9d772e]"><Icon className="size-5" /></span><h3 className="mt-4 font-bold text-[#26394b]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#6a7c8d]">{desc}</p></article>)}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#d9e1e7] bg-white p-5"><p className="max-w-2xl text-sm leading-6 text-[#607487]">Los laboratorios complementan las 10 sesiones. Accede a las clases y ejercicios desde el Aula de Formación.</p><Link to="/auth" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#d7bd7d] bg-[#fffaf0] px-4 text-xs font-bold text-[#806126] hover:bg-[#fff2cf]">Conocer el Aula <ArrowRight className="size-4" /></Link></div>
        </div>
      </section>

      <section id="auri-tutor" className="scroll-mt-24 overflow-hidden border-y border-[#e7dfcd] bg-white">
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-7 lg:grid-cols-[1.1fr_.9fr] lg:px-10 lg:py-16">
          <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-0 size-72 rounded-full bg-[#fff0c5]/60 blur-3xl" />
          <div className="relative order-2 flex items-center justify-center lg:order-1">
            <div className="absolute size-64 rounded-full bg-gradient-to-br from-[#fff2c9] to-[#e7eef5] blur-2xl" />
            <img src="/Robot%20futurista%20sonriente%20con%20pulgar%20arriba.png" alt="AURI, asistente de inteligencia artificial de AURUM LAB" width="360" height="420" loading="lazy" decoding="async" className="relative z-10 h-auto max-h-[22rem] w-64 object-contain drop-shadow-[0_18px_24px_rgba(31,45,58,.16)] sm:w-72" />
          </div>
          <div className="relative order-1 lg:order-2">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#e7d6a6] bg-[#fff9e9] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-[#967020]"><Bot className="size-3.5" /> Tecnología propia de AURUM LAB</p>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight text-[#1d2b39] sm:text-4xl">Conoce a <span className="text-[#b58b37]">AURI Tutor</span>, tu asistente inteligente durante el aprendizaje</h2>
            <p className="mt-4 text-sm leading-7 text-[#5e7183] sm:text-base">No aprenderás solo. AURI es nuestro asistente de inteligencia artificial integrado en AURUM LAB y estará disponible como apoyo durante tu formación, dentro del Aula y también fuera de las clases.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#e6eaf0] bg-[#fbfcfd] p-4"><BookOpen className="size-5 text-[#a17a2e]" /><h3 className="mt-3 text-sm font-bold text-[#26394b]">Aclara tus dudas</h3><p className="mt-1 text-xs leading-5 text-[#6a7c8d]">Consulta conceptos y herramientas de diseño CAD 3D mientras avanzas en el curso.</p></div>
              <div className="rounded-xl border border-[#e6eaf0] bg-[#fbfcfd] p-4"><Sparkles className="size-5 text-[#a17a2e]" /><h3 className="mt-3 text-sm font-bold text-[#26394b]">Refuerza lo aprendido</h3><p className="mt-1 text-xs leading-5 text-[#6a7c8d]">Pide explicaciones paso a paso y orientación para repasar los temas de clase.</p></div>
            </div>
            <p className="mt-5 border-l-2 border-[#d5b45f] pl-4 text-sm font-semibold leading-6 text-[#344b60]">Docente, laboratorios interactivos y un asistente de IA propio: una nueva forma de aprender joyería digital.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-7 lg:px-10 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_.8fr]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#a17a2e]">Diseña en Rhino · Renderiza con AURUM LAB</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#1d2b39] sm:text-4xl">Visualiza tus joyas mientras las diseñas</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#64778a]">Con una cuenta gratuita de AURUM LAB puedes usar AURUM RENDER y nuestros plugins compatibles con Rhinoceros 7 y 8. Envía tus modelos a renderizar mientras diseñas. Prueba metales, gemas e iluminación en tu flujo de trabajo.</p>
            <div className="relative mt-6 overflow-visible rounded-2xl border border-[#e5d7b5] bg-gradient-to-r from-[#fffaf0] to-white p-5 pl-24 shadow-sm sm:pl-28">
              <img src="/brand/rhino-cpp-plugin.webp" alt="Plugin de Rhinoceros para conectar con AURUM RENDER" width={325} height={275} loading="lazy" decoding="async" className="pointer-events-none absolute -left-3 top-1/2 h-28 w-28 -translate-y-1/2 object-contain drop-shadow-[0_8px_12px_rgba(31,45,58,.22)] sm:-left-5 sm:h-36 sm:w-36" />
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#a17a2e]">Conexión con Rhinoceros</p>
              <h3 className="mt-1 text-base font-bold text-[#24374a]">Tu diseño y tu render, en un mismo flujo</h3>
              <p className="mt-1 text-xs leading-5 text-[#687b8d]">Conecta Rhinoceros 7 u 8 con AURUM RENDER mediante nuestro plugin.</p>
              <Link to="/auth" className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#e9c65f] px-3.5 text-xs font-bold text-[#202b35] transition hover:bg-[#dfb83e]">Crear cuenta gratuita <ArrowRight className="size-3.5" /></Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">{complementos.map(({icon:Icon,title,desc})=><div key={title} className="rounded-xl border border-[#e5e8e9] bg-white p-4"><Icon className="size-5 text-[#a17a2e]" /><h3 className="mt-3 text-sm font-bold text-[#2a3d4f]">{title}</h3><p className="mt-1 text-xs leading-5 text-[#718196]">{desc}</p></div>)}</div>
          </div>
          <aside id="inversion" className="scroll-mt-24 rounded-[1.6rem] border border-[#e4d5ad] bg-white p-6 shadow-[0_18px_55px_rgba(31,45,58,.09)] sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#9b762e]">Matrícula · Lanzamiento</p>
            <h2 className="mt-2 text-xl font-bold text-[#24374a]">Invierte en tu formación profesional</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl border border-[#ead7a5] bg-[#fffaf0] px-3 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff0c4] text-[#98712a]"><CalendarDays className="size-5" /></span>
                <span><span className="block text-[10px] font-bold uppercase tracking-[.16em] text-[#98712a]">Próximo inicio</span><span className="mt-0.5 block text-sm font-bold text-[#26394b]">30 de noviembre de 2026</span></span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-[#ead7a5] bg-[#fffaf0] px-3 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff0c4] text-[#98712a]"><UsersRound className="size-5" /></span>
                <span><span className="block text-[10px] font-bold uppercase tracking-[.16em] text-[#98712a]">Cupos limitados</span><span className="mt-0.5 block text-sm font-bold text-[#26394b]">Quedan <strong className="rounded-md bg-[#f5e4ad] px-1.5 text-[#7d5818]">8</strong> de 15 cupos</span></span>
              </div>
            </div>
            <div className="mt-4 flex gap-1.5 rounded-lg bg-[#f6f7f8] p-3" aria-label="8 de 15 cupos disponibles">
              {Array.from({ length: 15 }, (_, index) => <span key={index} className={`h-3 flex-1 rounded-sm ${index < 8 ? "bg-[#c49a42]" : "bg-[#cfd4da]"}`} />)}
            </div>
            <div className="mt-5 rounded-xl bg-[#fff9e9] p-5">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-semibold text-[#7a8793]">Precio regular</p><p className="mt-1 text-2xl font-semibold text-[#89939d] line-through">US$ 250</p></div>
                <span className="rounded-xl bg-[#d49b18] px-3 py-2 text-center text-xs font-extrabold uppercase leading-tight text-white shadow-sm">Precio<br />promocional final</span>
              </div>
              <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1"><span className="text-sm font-bold text-[#9b762e]">Precio final</span><span className="text-5xl font-bold tracking-tight text-[#1e3042]">US$ 230</span></div>
              <p className="mt-3 inline-flex rounded-full bg-[#e0f5eb] px-3 py-1.5 text-xs font-bold text-[#176b49]">✓ Ahorro: US$ 20 (8 % de descuento)</p>
            </div>

            <section className="mt-5 overflow-hidden rounded-2xl border border-[#d9c18a] bg-gradient-to-br from-[#fffaf0] via-white to-[#f3f6f8] p-5" aria-labelledby="bono-profesionalizacion">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#98712a]">Bono de lanzamiento · 5 beneficiarios</p>
                  <h3 id="bono-profesionalizacion" className="mt-1 text-xl font-bold leading-tight text-[#24374a]">Bono de Profesionalización AURUM LAB</h3>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#ead7a5] bg-[#fff1c9] text-[#98712a]"><Sparkles className="size-5" /></span>
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="text-3xl font-extrabold tracking-tight text-[#24374a]">12 meses</span>
                <span className="pb-1 text-xs font-bold uppercase tracking-wide text-[#98712a]">Plan Profesional incluidos</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#627487]">Inscríbete entre los próximos 5 alumnos y recibe 12 meses del Plan Profesional de AURUM LAB sin costo adicional.</p>
              <button type="button" onClick={() => setBonoAbierto(true)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#d6bd7e] bg-white px-4 text-sm font-bold text-[#76591e] transition hover:bg-[#fff4d7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b58b37]">
                Descubrir qué incluye el Plan Profesional <ArrowRight className="size-4" />
              </button>
              <p className="mt-3 text-[10px] leading-4 text-[#7a8793]">Promoción limitada a las primeras 5 matrículas confirmadas. El beneficio se activa después de verificar el pago y no tiene renovación automática.</p>
            </section>

            <ul className="mt-5 space-y-3 text-sm text-[#5d7183]">
              <li className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-[#a17a2e]" /> Clases online en vivo con docente</li>
              <li className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-[#a17a2e]" /> 10 sesiones guiadas · 20 horas académicas</li>
              <li className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-[#a17a2e]" /> Programa de nivel inicial</li>
              <li className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-[#a17a2e]" /> Laboratorios interactivos de práctica</li>
              <li className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-[#a17a2e]" /> AURI Tutor: asistente de IA propio durante tu formación</li>
              <li className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-[#a17a2e]" /> Bono de Profesionalización: 12 meses del Plan Profesional incluidos</li>
              <li className="flex gap-2"><CheckCircle2 className="size-4 shrink-0 text-[#a17a2e]" /> Registro de cuenta AURUM LAB gratuito</li>
            </ul>
            <Link to="/auth" className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d9a51e] to-[#b98213] px-5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(181,139,55,.22)] transition hover:-translate-y-0.5 hover:brightness-105">Crear cuenta e iniciar matrícula · US$ 230 <ArrowRight className="size-4" /></Link>
            <p className="mt-3 text-center text-[11px] leading-5 text-[#82909d]">El precio final de matrícula es US$ 230 (ahorro de US$ 20 frente al precio regular). Crear tu cuenta en AURUM LAB es gratuito; después podrás continuar con la gestión de tu matrícula. Inicio previsto: 30 de noviembre de 2026. Cupos limitados: 15 en total.</p>
          </aside>
        </div>
      </section>

      <section className="border-t border-[#e5e1d8] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:px-7 md:flex-row md:items-center md:justify-between lg:px-10">
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#9b762e]">Empieza hoy</p><h2 className="mt-2 font-display text-2xl font-semibold text-[#1d2b39]">Da el siguiente paso en tu formación joyera</h2><p className="mt-2 text-sm text-[#687b8d]">Regístrate gratis en AURUM LAB y conoce el acceso al programa.</p></div>
          <Link to="/auth" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#e9c65f] px-5 text-sm font-bold text-[#202b35] hover:bg-[#dfb83e]">Crear mi cuenta gratis <ArrowRight className="size-4" /></Link>
        </div>
      </section>
      {bonoAbierto && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-[#142333]/65 p-3 backdrop-blur-sm sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setBonoAbierto(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="bono-modal-titulo" className="relative my-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-[#e4d5ad] bg-white shadow-[0_28px_90px_rgba(10,20,30,.32)]">
            <div className="relative bg-gradient-to-r from-[#fff7df] via-white to-[#eaf0f5] px-5 py-5 sm:px-8 sm:py-6">
              <button type="button" aria-label="Cerrar detalles del Plan Profesional" onClick={() => setBonoAbierto(false)} className="absolute right-4 top-4 grid size-9 place-items-center rounded-full border border-[#e2d8c4] bg-white/90 text-[#526273] transition hover:bg-white"><X className="size-4" /></button>
              <div className="flex flex-col gap-5 pr-10 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#98712a]">Bono de lanzamiento · 5 beneficiarios</p>
                  <h2 id="bono-modal-titulo" className="mt-2 font-display text-3xl font-semibold leading-tight text-[#1d2b39] sm:text-4xl">Un año para profesionalizar tu taller</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5d7183]">Inscríbete entre los próximos 5 alumnos y recibe 12 meses del Plan Profesional de AURUM LAB sin costo adicional.</p>
                </div>
                <div className="inline-flex shrink-0 items-center gap-3 self-start rounded-2xl border border-[#e4d2a5] bg-white/90 px-4 py-3 sm:self-center">
                  <span className="grid size-11 place-items-center rounded-xl bg-[#fff0c4] text-[#98712a]"><Sparkles className="size-5" /></span>
                  <span><span className="block text-2xl font-extrabold text-[#24374a]">12 meses</span><span className="block text-[10px] font-bold uppercase tracking-wider text-[#98712a]">Plan Profesional incluidos</span></span>
                </div>
              </div>
            </div>
            <div className="px-5 py-5 sm:px-8 sm:py-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-[#24374a]">Toda esta capacidad para tu taller</h3>
                  <p className="mt-1 text-xs text-[#738397]">Recursos incluidos en el Plan Profesional.</p>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#98712a]">5 capacidades clave</span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { value: "1.000", label: "productos en catálogo", detail: "Organiza y presenta tus joyas." },
                  { value: "1.500", label: "operaciones al mes", detail: "Gestiona la actividad comercial." },
                  { value: "10 GB", label: "Mi Nube", detail: "Almacena archivos y proyectos." },
                  { value: "200", label: "carpetas", detail: "Clasifica trabajos y documentos." },
                  { value: "Ilimitado", label: "AURUM RENDER", detail: "Renderiza sin límite mensual de usos." },
                ].map((item) => <div key={item.label} className="rounded-xl border border-[#e7e9e9] bg-[#fbfcfd] p-3 sm:p-3.5">
                  <p className="text-2xl font-extrabold tracking-tight text-[#24374a]">{item.value}</p>
                  <p className="mt-1 text-[11px] font-bold text-[#9a742d]">{item.label}</p>
                  <p className="mt-1 text-[10px] leading-4 text-[#718196]">{item.detail}</p>
                </div>)}
              </div>
              <div className="mt-3 flex flex-col gap-2 rounded-xl border border-[#e7e1d4] bg-[#fffaf0] px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                <h3 className="shrink-0 text-sm font-bold text-[#24374a]">Herramientas de gestión</h3>
                <p className="text-xs leading-5 text-[#627487]">Clientes · Cotizaciones · Pedidos · Contratos · Ventas · Catálogo digital</p>
              </div>
              <div className="mt-3 flex flex-col gap-3 border-t border-[#edf0f2] pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex max-w-2xl items-start gap-2 text-[10px] leading-4 text-[#718196]"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#98712a]" /><span>Válido para las primeras cinco matrículas con pago confirmado. Beneficio por 12 meses, sin renovación automática. Si ya tienes el Plan Profesional, se amplía tu vencimiento vigente.</span></p>
                <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
                  <button type="button" onClick={() => setBonoAbierto(false)} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#d9e0e6] px-4 text-xs font-semibold text-[#40576c] hover:bg-[#f7f8f9]">Cerrar</button>
                  <Link to="/auth" onClick={() => setBonoAbierto(false)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#e9c65f] px-4 text-xs font-bold text-[#202b35] shadow-sm transition hover:bg-[#dfb83e]">Quiero matricularme <ArrowRight className="size-4" /></Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
      <footer className="bg-[#203243] text-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-white/65 sm:px-7 lg:px-10"><span>AURUM LAB · Formación para profesionales de la joyería</span><span>El arte de crear. La inteligencia de gestionar.</span></div></footer>
    </main>
    </>
  );
}
