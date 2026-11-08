import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabasePublic } from "@/integrations/supabase/client";
import { RegistroTaller } from "@/components/RegistroTaller";
const MiniAurumRender = lazy(() => import("@/components/MiniAurumRender").then((m) => ({ default: m.MiniAurumRender })));
const PrecioOroDiario = lazy(() => import("@/components/PrecioOroDiario").then((m) => ({ default: m.PrecioOroDiario })));
import { ArrowRight, BookOpen, Boxes, Calculator, Check, ChevronDown, Cloud, Gem, Layers3, MonitorSmartphone, PackageCheck, Sparkles, Sprout, ChartNoAxesCombined } from "lucide-react";
import heroColgante from "@/assets/diseno-colgante.jpg";
import heroFloral from "@/assets/diseno-floral.jpg";
import heroGemelos from "@/assets/diseno-gemelos.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AURUM LAB | La plataforma digital para talleres de joyería" },
      {
        name: "description",
        content:
          "Resuelve retos de tu taller joyero con AURUM LAB: cálculos técnicos, diseño 3D, gestión comercial y archivos en una plataforma digital especializada.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "AURUM LAB — Haz crecer tu taller joyero" },
      {
        property: "og:description",
        content: "Menos errores de cálculo, mejores presentaciones y más control del trabajo comercial de tu taller joyero con AURUM LAB.",
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
    etiqueta: "EVITA ERRORES",
    icon: Calculator,
    titulo: "Calcula antes de trabajar el metal",
    texto: "Calcula aleaciones, pesos y medidas. Prepara tus materiales con datos más claros.",
    beneficio: "Más claridad antes de fabricar",
    enlace: "/herramientas-publicas" as const,
    accion: "Calcular materiales",
  },
  {
    numero: "02",
    etiqueta: "PRESENTA MEJOR",
    icon: Gem,
    titulo: "Muestra la joya antes de fabricarla",
    texto: "Muestra tus modelos compatibles en 3D. Así tus clientes pueden revisar el diseño antes de fabricarlo.",
    beneficio: "Alinea expectativas antes de producir",
    enlace: "/aurum-render-public" as const,
    accion: "Explorar visor 3D",
  },
  {
    numero: "03",
    etiqueta: "DA SEGUIMIENTO",
    icon: ChartNoAxesCombined,
    titulo: "Que ningún pedido quede en el olvido",
    texto: "Guarda los datos de tus clientes, cotizaciones, contratos y pedidos. Consulta lo acordado y revisa cada trabajo.",
    beneficio: "Más continuidad entre consulta y pedido",
    enlace: "/auth" as const,
    accion: "Organizar mi área comercial",
  },
  {
    numero: "04",
    etiqueta: "ENCUENTRA Y COMPARTE",
    icon: Cloud,
    titulo: "Tus diseños organizados y listos para compartir",
    texto: "Guarda tus diseños en Mi Nube y crea un catálogo digital. Así tendrás tus piezas listas para compartir.",
    beneficio: "Archivos y presentación conectados",
    enlace: "/auth" as const,
    accion: "Organizar mis archivos",
  },
];


function formatoSoles(valor: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

function PlanesPublicos() {
  const [periodicidad, setPeriodicidad] = useState<"mensual" | "trimestral" | "anual">("mensual");
  const periodos = {
    mensual: { etiqueta: "Mensual", meses: 1, descuento: 0 },
    trimestral: { etiqueta: "Trimestral", meses: 3, descuento: 0.10 },
    anual: { etiqueta: "Anual", meses: 12, descuento: 0.25 },
  } as const;
  const periodo = periodos[periodicidad];
  const planes = [
    {
      nombre: "Emprendedor", precioMensual: 0, gratis: true,
      descripcion: "Usa herramientas básicas para tu taller.",
      funciones: ["Calculadoras y herramientas técnicas", "Visor 3D público", "Explora antes de crecer"],
      destacado: false, accion: "Explorar herramientas", href: "/herramientas-publicas" as const,
    },
    {
      nombre: "Taller", precioMensual: 29, gratis: false,
      descripcion: "Organiza las tareas diarias de tu taller.",
      funciones: ["Clientes y cotizaciones", "Pedidos, ventas y contratos", "Catálogo digital", "Mi Nube y archivos", "Herramientas de diseño y gestión con capacidad limitada"],
      destacado: false, accion: "Acceder a la plataforma", href: "/auth" as const,
    },
    {
      nombre: "Profesional", precioMensual: 79, gratis: false,
      descripcion: "Incluye el plan Taller y ofrece más capacidad.",
      funciones: ["Incluye todo lo que ofrece el plan Taller", "Más espacio para clientes y operaciones", "Más espacio para archivos y catálogo", "Más uso de las herramientas de diseño y gestión"],
      destacado: true, accion: "Acceder a la plataforma", href: "/auth" as const,
    },
    {
      nombre: "Empresarial", precioMensual: null, gratis: false,
      descripcion: "Para talleres y equipos en expansión.",
      funciones: ["Configuración para equipos", "Organización de varias sedes", "Capacidades por taller", "Acompañamiento para definir necesidades"],
      destacado: false, accion: "Consultar solución", href: "/auth" as const,
    },
  ];
  return (
    <>
      <p className="mt-3 text-center text-xs text-slate-500">Elige tu forma de pago. Puedes ahorrar al elegir varios meses.</p>
      <div className="mx-auto mt-4 flex w-fit flex-wrap justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5" role="group" aria-label="Modalidad de pago">
        {(["mensual", "trimestral", "anual"] as const).map((opcion) => (
          <button key={opcion} type="button" onClick={() => setPeriodicidad(opcion)} aria-pressed={periodicidad === opcion}
            className={"rounded-xl px-4 py-2.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19] " + (periodicidad === opcion ? "bg-[#17232d] text-white" : "text-slate-600 hover:bg-slate-100")}>
            {periodos[opcion].etiqueta}{opcion === "trimestral" ? " · 10 % menos" : opcion === "anual" ? " · 25 % menos" : ""}
          </button>
        ))}
      </div>
      <div className="mt-7 grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {planes.map((plan) => {
          const tienePrecio = typeof plan.precioMensual === "number";
          const precioMensual = plan.precioMensual ?? 0;
          const totalPeriodo = precioMensual * periodo.meses * (1 - periodo.descuento);
          return (
            <article key={plan.nombre} className={"relative flex h-full flex-col rounded-2xl border bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,.035)] sm:p-6 " + (plan.destacado ? "border-[#d4aa19] ring-1 ring-[#d4aa19]" : "border-slate-200")}>
              {plan.destacado && <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#f8c928] px-3 py-1 text-[10px] font-bold text-[#17232d]">Más capacidades</span>}
              <h3 className="mt-1 text-lg font-bold text-[#17232d]">{plan.nombre}</h3>
              <p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">{plan.descripcion}</p>
              <div className="mt-5 min-h-[108px]">
                {!tienePrecio && <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#17232d]">A medida</p>}
                {tienePrecio && plan.gratis && <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#17232d]">Gratis</p>}
                {tienePrecio && !plan.gratis && (
                  <>
                    <p className="mt-1 text-2xl font-extrabold tracking-tight text-[#17232d]">{formatoSoles(totalPeriodo)}<span className="ml-1 text-xs font-medium text-slate-500">{periodicidad === "mensual" ? "al mes" : "por " + periodo.meses + " meses"}</span></p>
                    {periodo.descuento > 0 && <p className="mt-1 text-xs text-slate-500"><span className="line-through">{formatoSoles(precioMensual * periodo.meses)}</span> <span className="font-semibold text-emerald-700">Ahorra {formatoSoles(precioMensual * periodo.meses - totalPeriodo)} ({Math.round(periodo.descuento * 100)} %)</span></p>}
                    {periodicidad !== "mensual" && <p className="mt-1 text-[10px] text-slate-500">Equivale a {formatoSoles(totalPeriodo / periodo.meses)} al mes</p>}
                  </>
                )}
              </div>
              <ul className="mt-4 flex-1 space-y-3 border-t border-slate-100 pt-4">
                {plan.funciones.map((funcion) => <li key={funcion} className="flex items-start gap-2 text-xs leading-5 text-slate-600"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />{funcion}</li>)}
              </ul>
              <Link to={plan.href} className={"mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19] " + (plan.destacado ? "bg-[#17232d] text-white hover:bg-[#293b49]" : "border border-slate-300 text-[#17232d] hover:border-[#d4aa19] hover:bg-[#fffbee]")}>
                {plan.accion} <ArrowRight className="size-3.5" />
              </Link>
            </article>
          );
        })}
      </div>
      <p className="mx-auto mt-5 max-w-3xl text-center text-[11px] leading-5 text-slate-500">Precios mensuales: Taller S/ 29 y Profesional S/ 79. Si eliges varios meses, puedes obtener un descuento. Revisa las condiciones de pago y renovación antes de activar el cobro automático.</p>
    </>
  );
}


function PrecioOroDiferido() {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "240px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ contentVisibility: "auto", containIntrinsicSize: "auto 420px" }}>
      {visible ? (
        <Suspense fallback={<div className="min-h-[360px]" aria-label="Cargando cotización del oro" />}>
          <ClientOnly fallback={<div className="min-h-[360px]" />}>
            <PrecioOroDiferido />
          </ClientOnly>
        </Suspense>
      ) : <div className="min-h-[360px]" aria-hidden="true" />}
    </div>
  );
}

type LogoTallerComunidad = {
  tipo: "taller" | "curso";
  participante_id: string;
  nombre: string;
  identidad_nombre: string | null;
  identidad_logo: string | null;
  identidad_pais: string | null;
  imagen_url: string | null;
};

function TalleresDeLaComunidad() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "240px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["logos-talleres-comunidad-home"],
    queryFn: async () => {
      const { data, error } = await (supabasePublic as any).rpc("obtener_directorio_comunidad_publica");
      if (error) throw error;
      return (data ?? []) as LogoTallerComunidad[];
    },
    staleTime: 5 * 60_000,
    retry: 1,
    enabled: visible,
  });

  const talleres = Array.from(new Map(
    data
      .filter((item) => item.tipo === "taller")
      .map((item) => ({
        id: item.participante_id,
        nombre: item.identidad_nombre?.trim() || item.nombre,
        logo: item.identidad_logo?.trim() || item.imagen_url?.trim() || "",
        pais: item.identidad_pais?.trim() || "",
      }))
      .filter((item) => Boolean(item.logo))
      .map((item) => [item.id, item]),
  ).values());

  if (visible && (isError || (!isLoading && talleres.length === 0))) return null;

  const renderTalleres = (duplicado = false) => (
    <div className="aurum-community-marquee-group" aria-hidden={duplicado || undefined}>
      {talleres.map((taller) => (
        <div key={taller.id} className="flex h-24 w-36 shrink-0 flex-col items-center justify-center gap-2 px-3 sm:w-44 lg:w-48" title={duplicado ? undefined : taller.nombre}>
          <img
            src={taller.logo}
            alt={duplicado ? "" : taller.nombre}
            loading="lazy"
            decoding="async"
            className="max-h-14 max-w-full object-contain opacity-90 transition-opacity duration-300 hover:opacity-100 sm:max-h-16"
          />
          {taller.pais && (
            <span className="text-[9px] font-medium uppercase tracking-[.17em] text-slate-400">
              {taller.pais}
            </span>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <section ref={sectionRef} aria-labelledby="talleres-comunidad-titulo" className="overflow-hidden border-y border-slate-100 bg-white">
      <style>{`
        @keyframes aurum-community-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .aurum-community-marquee-track {
          display: flex;
          width: max-content;
          animation: aurum-community-marquee 55s linear infinite;
          will-change: transform;
        }
        .aurum-community-marquee-group {
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          gap: clamp(2.5rem, 5vw, 5rem);
          padding-right: clamp(2.5rem, 5vw, 5rem);
        }
        .aurum-community-marquee-viewport:hover .aurum-community-marquee-track,
        .aurum-community-marquee-viewport:focus-within .aurum-community-marquee-track {
          animation-play-state: paused;
        }
        .aurum-community-marquee-viewport {
          overflow: hidden;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .aurum-community-marquee-viewport::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-[4.5rem] lg:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#9a7418]">AURUM LAB · COMUNIDAD</p>
          <h2 id="talleres-comunidad-titulo" className="mt-3 text-xl font-medium leading-relaxed tracking-[-.015em] text-[#4b5560] sm:text-2xl">
            Talleres de joyería que están explorando nuevas formas de crear y gestionar con AURUM LAB.
          </h2>
        </div>

        {!visible || isLoading ? (
          <div role="status" className="mx-auto mt-12 flex max-w-6xl flex-wrap items-center justify-center gap-x-12 gap-y-8">
            {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-14 w-40 animate-pulse rounded bg-slate-100" />)}
          </div>
        ) : (
          <div role="region" aria-labelledby="talleres-comunidad-titulo" className="aurum-community-marquee-viewport relative mx-auto mt-10 max-w-[1240px] overflow-hidden py-2">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white to-transparent sm:w-16" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent sm:w-16" />
            <div className="aurum-community-marquee-track">
              {renderTalleres()}
              {renderTalleres(true)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function InicioPublico() {
  const [mostrarDemo3D, setMostrarDemo3D] = useState(false);
  const demo3DSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 640px)");
    let observer: IntersectionObserver | null = null;

    const observarDemo3D = () => {
      observer?.disconnect();
      observer = null;

      if (!mediaQuery.matches) {
        setMostrarDemo3D(false);
        return;
      }

      const section = demo3DSectionRef.current;
      if (!section) return;

      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setMostrarDemo3D(true);
            observer?.disconnect();
            observer = null;
          }
        },
        { rootMargin: "150px 0px", threshold: 0 },
      );
      observer.observe(section);
    };

    observarDemo3D();
    mediaQuery.addEventListener("change", observarDemo3D);

    return () => {
      observer?.disconnect();
      mediaQuery.removeEventListener("change", observarDemo3D);
    };
  }, []);

  return (
    <main className="min-h-screen bg-white text-[#17232d]">
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": "https://www.tallerdeljoyero.com/#organization",
            "name": "Taller del Joyero",
            "alternateName": "AURUM LAB",
            "url": "https://www.tallerdeljoyero.com/"
          },
          {
            "@type": "WebSite",
            "@id": "https://www.tallerdeljoyero.com/#website",
            "url": "https://www.tallerdeljoyero.com/",
            "name": "Taller del Joyero",
            "alternateName": "AURUM LAB",
            "inLanguage": "es",
            "publisher": { "@id": "https://www.tallerdeljoyero.com/#organization" }
          },
          {
            "@type": "WebPage",
            "@id": "https://www.tallerdeljoyero.com/#webpage",
            "url": "https://www.tallerdeljoyero.com/",
            "name": "AURUM LAB | La plataforma digital para talleres de joyería",
            "description": "Resuelve retos de tu taller joyero con AURUM LAB: cálculos técnicos, diseño 3D, gestión comercial y archivos en una plataforma digital especializada.",
            "inLanguage": "es",
            "isPartOf": { "@id": "https://www.tallerdeljoyero.com/#website" },
            "about": { "@id": "https://www.tallerdeljoyero.com/#software" }
          },
          {
            "@type": "SoftwareApplication",
            "@id": "https://www.tallerdeljoyero.com/#software",
            "name": "AURUM LAB",
            "alternateName": "Taller del Joyero",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "url": "https://www.tallerdeljoyero.com/",
            "description": "Plataforma digital especializada para talleres de joyería, con herramientas técnicas, visualización 3D y gestión comercial."
          }
        ]
      })}</script>
      <a href="#contenido-principal" className="sr-only z-50 rounded-md bg-white px-4 py-2 font-semibold text-[#17232d] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:ring-2 focus:ring-[#d4aa19]">Saltar al contenido principal</a>
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 shadow-[0_2px_8px_rgba(15,23,42,.05)] backdrop-blur">
        <div className="mx-auto flex min-h-[68px] max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
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
            <Link to="/guias" className="transition hover:text-[#a77a00]">Guías técnicas</Link>
            <Link to="/comunidad" className="transition hover:text-[#a77a00]">Comunidad</Link>
            <a href="#contacto" className="transition hover:text-[#a77a00]">Contacto</a>
          </nav>
          <nav className="order-3 flex w-full items-center gap-5 overflow-x-auto border-t border-slate-100 py-3 text-xs font-medium text-slate-700 lg:hidden" aria-label="Navegación móvil">
            <Link to="/" className="shrink-0">Inicio</Link>
            <Link to="/herramientas-publicas" className="shrink-0">Herramientas</Link>
            <a href="#soluciones" className="shrink-0">Soluciones</a>
            <a href="#como-funciona" className="shrink-0">Cómo funciona</a>
            <Link to="/guias" className="shrink-0">Guías técnicas</Link>
            <Link to="/comunidad" className="shrink-0">Comunidad</Link>
            <a href="#contacto" className="shrink-0">Contacto</a>
          </nav>
          <div className="flex items-center gap-2">
            <RegistroTaller className="hidden min-h-10 items-center justify-center rounded-xl bg-[#f8c928] px-4 text-xs font-bold text-[#17232d] shadow-sm transition hover:bg-[#ffdf65] sm:inline-flex" />
            <Link to="/auth" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold text-[#17232d] transition hover:border-[#d4aa19] sm:text-sm"><MonitorSmartphone className="size-4" /> Ingresar</Link>
          </div>
        </div>
      </header>

      <section id="contenido-principal" className="relative isolate scroll-mt-24 overflow-hidden">
        <div className="pointer-events-none absolute -left-32 top-12 -z-10 size-[28rem] rounded-full bg-[#ffe99b]/70 blur-[90px]" />
        <div className="pointer-events-none absolute right-[28%] top-20 -z-10 size-64 rounded-full bg-[#e9f1ff]/80 blur-[80px]" />
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[.92fr_1.08fr] lg:gap-8 lg:px-12 lg:pb-24 lg:pt-20">
          <div className="relative z-10 max-w-[650px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e5c04a]/50 bg-[#fff9df] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#785b00]"><Sparkles className="size-3.5" /> AURUM LAB · TECNOLOGÍA PARA JOYEROS</span>
            <h1 className="mt-6 text-[2.65rem] font-extrabold leading-[1.06] tracking-[-.045em] text-[#17232d] sm:text-5xl lg:text-[3.8rem]"><span className="block">Herramientas digitales para tu taller de joyería.</span><span className="mt-2 block text-[#9a7400]">Organiza tu taller. Calcula materiales. Muestra tus diseños.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">Organiza tu taller. Calcula materiales. Gestiona ventas y muestra tus joyas en 3D.</p>
            <ul className="mt-7 space-y-4 text-sm font-medium text-[#25323b] sm:text-[15px]">
              <li className="flex items-start gap-3"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-[#fff4c4] text-[#9b7600]"><Check className="size-4" /></span>Calcula materiales y medidas para tu trabajo diario.</li>
              <li className="flex items-start gap-3"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-[#fff4c4] text-[#9b7600]"><Check className="size-4" /></span>Prueba materiales y presenta tus diseños con AURUM RENDER.</li>
              <li className="flex items-start gap-3"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-[#fff4c4] text-[#9b7600]"><Check className="size-4" /></span>Registra a tus clientes. Prepara cotizaciones. Controla pedidos y guarda archivos en Mi Nube.</li>
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <RegistroTaller className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#d4aa19] bg-[#f8c928] px-6 py-3 text-sm font-extrabold text-[#17232d] shadow-lg shadow-amber-900/10 transition hover:-translate-y-0.5 hover:bg-[#ffdf65] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19] focus-visible:ring-offset-2" />
              <Link to="/herramientas-publicas" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/90 px-6 py-3 text-sm font-semibold text-[#17232d] transition hover:border-[#d4aa19] hover:bg-[#fffbee]">Probar herramientas gratis <ArrowRight className="size-4" /></Link>
            </div>
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-emerald-600" /> Crea tu espacio de taller gratuito</span><span aria-hidden="true">·</span><span>Explora herramientas públicas sin registrarte</span></p>
          </div>

          <div className="relative mx-auto w-full max-w-[720px] pb-7 sm:pb-10">
            <div className="absolute inset-x-8 bottom-0 top-12 rounded-[3rem] bg-gradient-to-br from-[#ffe99a]/70 via-[#f8faff] to-[#e4ecf7] blur-2xl" />
            <div className="relative rounded-[1.6rem] border border-slate-200 bg-white p-2.5 shadow-[0_25px_80px_rgba(28,40,52,.15)] sm:p-3">
              <div className="flex h-10 items-center gap-2 border-b border-slate-100 px-3">
                <span className="size-2.5 rounded-full bg-[#ff6b63]" /><span className="size-2.5 rounded-full bg-[#ffce45]" /><span className="size-2.5 rounded-full bg-[#4ac58b]" />
                <div className="mx-auto mr-12 rounded-full bg-slate-100 px-14 py-1 text-[9px] text-slate-400">TU ESPACIO DIGITAL</div>
              </div>
              <div className="grid min-h-[310px] grid-cols-[108px_minmax(0,1fr)] overflow-hidden rounded-b-xl sm:min-h-[365px] sm:grid-cols-[155px_minmax(0,1fr)]">
                <aside className="min-w-0 border-r border-slate-100 bg-[#f8fafc] p-2.5 sm:p-4">
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
                <div className="min-w-0 p-2.5 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="text-[9px] text-slate-400 sm:text-[10px]">TU TALLER DIGITAL</p><p className="mt-1 text-sm font-bold text-[#17232d] sm:text-lg">Tu taller, en orden</p></div>
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
              <div><p className="text-[10px] font-bold text-[#17232d] sm:text-xs">Diseñado para tu oficio</p><p className="mt-1 text-[9px] leading-4 text-slate-500 sm:text-[10px]">Herramientas y archivos para tu taller, en un solo lugar.</p></div>
            </div>
          </div>
        </div>
      </section>

      <PrecioOroDiario />

      <section ref={demo3DSectionRef} id="aurum-render" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 760px" }} className="overflow-hidden border-y border-[#263743] bg-[#111a22] text-white">
        <div className="mx-auto grid max-w-[1440px] items-center gap-9 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[1.05fr_.95fr] lg:gap-14 lg:px-12 lg:py-20">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#d4aa19]/40 bg-[#d4aa19]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-[#f3d66e]"><Sparkles className="size-3.5" /> ESTUDIO 3D PROFESIONAL PARA JOYEROS</p>
            <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">De la precisión 3D a una joya que deslumbra.</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">Crea imágenes de tus joyas a partir de modelos 3D. Elige oro, plata, platino o gemas. Ajusta la luz y los materiales.</p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">Cambia el entorno y crea imágenes de tus piezas. Comparte modelos con el visor 3D.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/auth" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#f8c928] px-5 py-3 text-sm font-bold text-[#17232d] transition hover:bg-[#ffe071] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Descubrir AURUM RENDER <ArrowRight className="size-4" /></Link>
              <Link to="/aurum-render-public" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:border-[#f8c928] hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f8c928]">Probar el visor público 3D</Link>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-400">AURUM RENDER muestra cómo se verán tus joyas. El visor público es independiente. Úsalo para compartir modelos.</p>
          </div>

          <div className="relative mx-auto w-full max-w-[560px]">
            <div className="absolute inset-8 rounded-full bg-[#b58b00]/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#29343e] via-[#171f27] to-[#090d11] p-5 shadow-[0_25px_80px_rgba(0,0,0,.35)] sm:p-7">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[.24em] text-[#f3d66e]">ESTUDIO DIGITAL DE JOYERÍA</p>
                  <p className="mt-1 text-sm font-semibold text-white">AURUM RENDER</p>
                </div>
                <span className="grid size-10 place-items-center rounded-xl border border-[#f8c928]/30 bg-[#f8c928]/10 text-[#f8d85b]"><Gem className="size-5" /></span>
              </div>
              {mostrarDemo3D ? (
                <ClientOnly fallback={null}>
                  <Suspense fallback={<div className="min-h-[270px] sm:min-h-[340px]" aria-label="Cargando demostración 3D" />}>
                    <MiniAurumRender className="min-h-[270px] sm:min-h-[340px]" />
                  </Suspense>
                </ClientOnly>
              ) : (
                <div className="overflow-hidden rounded-xl">
                  <img
                    src={heroColgante}
                    alt="Vista previa de un diseño de joyería presentado en AURUM LAB"
                    loading="lazy"
                    decoding="async"
                    width={800}
                    height={600}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <p className="bg-white/5 px-3 py-2 text-center text-xs text-slate-300">
                    La demostración 3D se activa al acercarte a esta sección.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
                <div className="rounded-lg bg-white/[.04] px-2 py-3"><p className="text-[9px] uppercase tracking-wider text-slate-400">Materiales</p><p className="mt-1 text-xs font-semibold text-white">Metales y gemas</p></div>
                <div className="rounded-lg bg-white/[.04] px-2 py-3"><p className="text-[9px] uppercase tracking-wider text-slate-400">Iluminación</p><p className="mt-1 text-xs font-semibold text-white">Entornos HDR</p></div>
                <div className="rounded-lg bg-white/[.04] px-2 py-3"><p className="text-[9px] uppercase tracking-wider text-slate-400">Captura</p><p className="mt-1 text-xs font-semibold text-white">Foto y vídeo</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="soluciones" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 680px" }} className="border-y border-slate-200 bg-[#f7f9fc]">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">Tecnología pensada para el oficio joyero</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#17232d] sm:text-3xl lg:text-4xl">Menos tiempo resolviendo problemas. Más tiempo creando.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Calcula materiales. Presenta tus diseños. Organiza tu negocio.</p>
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
                <h3 className="text-sm font-bold text-[#17232d]">De la idea al trabajo organizado</h3>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">AURUM LAB reúne herramientas para calcular, diseñar en 3D, gestionar tu taller y crear tu catálogo. Cada plan ofrece distintas funciones.</p>
              </div>
            </div>
            <a href="#planes" className="inline-flex min-h-9 shrink-0 items-center gap-2 self-start text-xs font-bold text-[#765900] transition hover:text-[#17232d] sm:self-center">Conocer los planes<ArrowRight className="size-3.5" /></a>
          </div>
        </div>
      </section>

      <section id="como-funciona" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 680px" }} className="scroll-mt-24 border-y border-slate-200 bg-gradient-to-b from-white to-[#f8fafc]">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">Tu taller, paso a paso</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#17232d] sm:text-3xl lg:text-4xl">Así funciona AURUM LAB</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">Elige una tarea y prueba las herramientas. No necesitas una cuenta para usar los recursos públicos.</p>
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#dfbd4b] hover:shadow-lg sm:p-6">
              <span className="grid size-11 place-items-center rounded-xl bg-[#fff3c1] text-[#8f6b00]"><Calculator className="size-5" /></span>
              <p className="mt-5 text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">01 · Explora</p>
              <h3 className="mt-2 text-lg font-bold">Resuelve tareas del oficio</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">Calcula aleaciones. Estima el peso de gemas y modelos 3D. También puedes convertir tallas.</p>
              <Link to="/herramientas-publicas" className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#765900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19]">Explorar herramientas <ArrowRight className="size-4" /></Link>
            </article>

            <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#dfbd4b] hover:shadow-lg sm:p-6">
              <span className="grid size-11 place-items-center rounded-xl bg-[#eaf1ff] text-[#4d6ba5]"><Gem className="size-5" /></span>
              <p className="mt-5 text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">02 · Visualiza</p>
              <h3 className="mt-2 text-lg font-bold">Presenta tus diseños en 3D</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">Abre archivos Rhino .3dm o carga modelos desde un enlace. El visor público es independiente de AURUM RENDER.</p>
              <Link to="/aurum-render-public" className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#765900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19]">Probar visor 3D <ArrowRight className="size-4" /></Link>
            </article>

            <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#dfbd4b] hover:shadow-lg sm:p-6">
              <span className="grid size-11 place-items-center rounded-xl bg-[#e9f8ef] text-[#27834d]"><Cloud className="size-5" /></span>
              <p className="mt-5 text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">03 · Organiza</p>
              <h3 className="mt-2 text-lg font-bold">Centraliza el trabajo del taller</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">Guarda tus archivos en Mi Nube. Consulta tu catálogo. Inicia sesión para usar estas funciones. El acceso depende de tu plan.</p>
              <Link to="/auth" target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#765900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19]">Conocer la plataforma <ArrowRight className="size-4" /></Link>
            </article>

            <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#dfbd4b] hover:shadow-lg sm:p-6">
              <span className="grid size-11 place-items-center rounded-xl bg-[#fff3c1] text-[#8f6b00]"><Sprout className="size-5" /></span>
              <p className="mt-5 text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">04 · Aprende</p>
              <h3 className="mt-2 text-lg font-bold">Sigue desarrollando tu oficio</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">Lee guías técnicas para joyeros. Comparte con otros profesionales y encuentra recursos para aprender.</p>
              <Link to="/comunidad" className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#765900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19]">Visitar comunidad <ArrowRight className="size-4" /></Link>
            </article>
          </div>

          <div className="mt-7 flex flex-col gap-4 rounded-2xl border border-[#eadca8] bg-[#fffdf5] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h3 className="text-sm font-bold text-[#17232d]">¿Listo para dar el siguiente paso?</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">Prueba los recursos gratuitos. Crea una cuenta para guardar tus trabajos y archivos.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link to="/herramientas-publicas" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#17232d] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#293b49]">Empezar gratis <ArrowRight className="size-4" /></Link>
              <Link to="/auth" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#17232d] transition hover:border-[#d4aa19]">Iniciar sesión</Link>
              <RegistroTaller className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#d4aa19] bg-[#fff4c4] px-4 py-2 text-xs font-bold text-[#5f4900] transition hover:bg-[#ffe99a]" />
            </div>
          </div>
        </div>
      </section>

      <section id="guias-tecnicas" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 560px" }} className="scroll-mt-24 border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <div className="grid items-start gap-8 lg:grid-cols-[.85fr_1.15fr] lg:gap-14">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#eadca8] bg-[#fff9df] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-[#876500]"><BookOpen className="size-3.5" /> Biblioteca práctica del oficio</p>
              <h2 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight text-[#17232d] sm:text-3xl lg:text-4xl">Guías técnicas para tomar mejores decisiones en tu taller.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">Encuentra respuestas a dudas de joyería. Las guías incluyen ejemplos y herramientas para tu taller.</p>
              <Link to="/guias" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#17232d] transition hover:border-[#d4aa19] hover:bg-[#fffbee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19]">Explorar todas las guías <ArrowRight className="size-4" /></Link>
            </div>
            <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-[#f8fafc] shadow-[0_8px_30px_rgba(23,35,45,.045)] transition hover:border-[#dfbd4b] hover:shadow-[0_16px_36px_rgba(23,35,45,.08)]">
              <div className="flex items-start gap-4 p-5 sm:p-7">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-[#eadca7] bg-[#fff4c4] text-[#8f6b00]"><Calculator className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">Metalurgia y materiales · Guía técnica</p>
                  <h3 className="mt-2 text-xl font-bold leading-snug text-[#17232d] sm:text-2xl">Cómo calcular aleaciones de oro de 18K, 14K y 9K</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">Calcula cuánto oro fino y cuánto metal de liga necesitas. Incluye un ejemplo de 10 gramos.</p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Link to="/guias/$slug" params={{ slug: "calcular-aleaciones-oro-18k-14k-9k" }} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#17232d] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#293b49] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19]">Leer guía completa <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" /></Link>
                    <Link to="/herramientas-publicas/$herramienta" params={{ herramienta: "aleacion-oro" }} className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-[#765900] hover:text-[#17232d]">Abrir calculadora <Calculator className="size-3.5" /></Link>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 border-t border-slate-200 bg-white px-5 py-4 text-xs text-slate-600 sm:grid-cols-3 sm:px-7">
                <div className="flex items-center gap-2"><Check className="size-4 shrink-0 text-emerald-600" /> Fórmulas explicadas</div>
                <div className="flex items-center gap-2"><Check className="size-4 shrink-0 text-emerald-600" /> Ejemplos en gramos</div>
                <div className="flex items-center gap-2"><Check className="size-4 shrink-0 text-emerald-600" /> Herramienta relacionada</div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="planes" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 720px" }} className="border-y border-slate-200 bg-[#f8fafc]">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">Planes para cada etapa</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#17232d] sm:text-3xl">Elige cómo quieres crecer.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">Elige un plan para tu taller. Compara las herramientas para gestionar, calcular y diseñar en 3D.</p>
          </div>
          <PlanesPublicos />
        </div>
      </section>

      <TalleresDeLaComunidad />

      <footer id="contacto" className="border-t border-[#263743] bg-[#17232d] text-slate-300">
        <div className="mx-auto max-w-[1440px] px-5 py-9 sm:px-8 sm:py-10 lg:px-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] lg:gap-12">
            <div>
              <Link to="/" className="inline-flex items-center gap-2 text-white" aria-label="AURUM LAB, inicio">
                <span className="grid size-8 place-items-center rounded-lg bg-[#f8c928] text-[#17232d]"><Gem className="size-4" /></span>
                <span className="text-lg font-extrabold tracking-tight">AURUM<span className="text-[#f8c928]"> LAB</span></span>
              </Link>
              <p className="mt-3 max-w-xs text-xs leading-5 text-slate-300">Herramientas digitales para joyeros. Gestiona tu taller, haz cálculos y presenta tus diseños en 3D.</p>
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
                <li><Link to="/guias" className="transition hover:text-[#f8c928]">Guías técnicas</Link></li>
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
