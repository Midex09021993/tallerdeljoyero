import { NavDropdown } from "@/components/nav/NavDropdown";
import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabasePublic } from "@/integrations/supabase/client";
import { RegistroTaller } from "@/components/RegistroTaller";
import { AuriPublicoBoton } from "@/components/auri/AuriPublicoBoton";
import { AurumProductShowcase } from "@/components/AurumProductShowcase";
import { SolicitarDemo } from "@/components/SolicitarDemo";
const MiniAurumRender = lazy(() => import("@/components/MiniAurumRender").then((m) => ({ default: m.MiniAurumRender })));
import { ArrowRight, BookOpen, Boxes, Calculator, Check, Cloud, Gem, Layers3, Menu, MonitorSmartphone, PackageCheck, Sparkles, Sprout, ChartNoAxesCombined, Camera, X, ChevronDown, UsersRound, GraduationCap } from "lucide-react";
import heroColgante from "@/assets/diseno-colgante.jpg";



// En PC de escritorio (pantalla amplia + puntero preciso) los accesos
// se abren en una pestaña independiente. Tablets y móviles conservan la pestaña.
function esPCDeEscritorio() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)").matches;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AURUM LAB | Software para talleres de joyería" },
      {
        name: "description",
        content:
          "Gestiona tu taller de joyería con AURUM LAB. Organiza clientes y pedidos, calcula aleaciones y pesos, y presenta tus diseños con render 3D profesional.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "application-name", content: "AURUM LAB" },
      { property: "og:site_name", content: "AURUM LAB | Taller del Joyero" },
      { property: "og:locale", content: "es_PE" },
      { property: "og:title", content: "AURUM LAB | Software para talleres de joyería" },
      {
        property: "og:description",
        content: "Gestiona tu taller, calcula materiales y crea presentaciones 3D de joyería con AURUM LAB.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.tallerdeljoyero.com/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "AURUM LAB | Software para talleres de joyería" },
      { name: "twitter:description", content: "Gestión de talleres, calculadoras joyeras y render 3D profesional en una sola plataforma." },
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
    titulo: "Calcula tus aleaciones", 
    texto: "Metal exacto para oro 18K, 14K y 9K.",
    beneficio: "Sin registro", 
    enlace: "/herramientas-publicas" as const,
    accion: "Calcular", 
    destacado: true,
    preview: "aleacion",
  },
  {
    numero: "02",
    etiqueta: "PRESENTA MEJOR",
    icon: Gem,
    titulo: "Presenta tus diseños en 3D", 
    texto: "Metales, gemas y luz de estudio para cada diseño.",
    beneficio: "Rhino 7 y Rhino 8", 
    enlace: "/aurum-render-public" as const,
    accion: "Explorar Render", 
    preview: "render",
  },
  {
    numero: "03",
    etiqueta: "DA SEGUIMIENTO",
    icon: ChartNoAxesCombined,
    titulo: "Gestiona tu taller", 
    texto: "Clientes, cotizaciones y pedidos en un solo panel.",
    beneficio: "Todo bajo control", 
    enlace: "/auth" as const,
    accion: "Entrar al taller", 
    preview: "gestion",
  },
  {
    numero: "04",
    etiqueta: "ENCUENTRA Y COMPARTE",
    icon: Cloud,
    titulo: "Organiza y comparte", 
    texto: "Diseños y catálogo digital, listos para compartir.",
    beneficio: "Listo para compartir", 
    enlace: "/auth" as const,
    accion: "Abrir Mi Nube", 
    preview: "nube",
  },
];


function formatoPrecio(valor: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

function PlanesPublicos() {
  const [periodicidad, setPeriodicidad] = useState<"mensual" | "trimestral" | "anual">("mensual");
  const moneda = "USD";

  const { data: cuotasPlanes, isLoading: cargandoCuotas, isError: errorCuotas } = useQuery({
    queryKey: ["planes-comerciales-publicos"],
    queryFn: async () => {
      const { data, error } = await supabasePublic
        .from("aurum_plan_quotas")
        .select("plan_id,operaciones_comerciales_mes,almacenamiento_mib,productos_catalogo_max,carpetas_mi_nube_max");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  const [planCapacidadesAbierto, setPlanCapacidadesAbierto] = useState<string | null>(null);
  const periodos = {
    mensual: { etiqueta: "Mensual", meses: 1, descuento: 0 },
    trimestral: { etiqueta: "Trimestral", meses: 3, descuento: 0.10 },
    anual: { etiqueta: "Anual", meses: 12, descuento: 0.25 },
  } as const;
  const periodo = periodos[periodicidad];
  const precios = { taller: 9, profesional: 24 };
  const planes = [
    {
      id: "emprendedor", nombre: "Emprendedor", precioMensual: 0, gratis: true,
      descripcion: "Empieza con herramientas para tu taller.",
      funciones: ["Calculadoras para el taller", "Visor 3D público", "Conoce AURUM LAB"],
      destacado: false, accion: "Explorar herramientas", href: "/herramientas-publicas" as const,
    },
    {
      id: "taller", nombre: "Taller", precioMensual: precios.taller, gratis: false,
      descripcion: "Lleva el control de tu trabajo diario.",
      funciones: ["Registro de clientes y cotizaciones", "Seguimiento de pedidos, ventas y contratos", "Catálogo digital para tus joyas", "Mi Nube", "Más herramientas según tu plan"],
      destacado: false, accion: "Acceder a la plataforma", href: "/auth" as const,
    },
    {
      id: "profesional", nombre: "Profesional", precioMensual: precios.profesional, gratis: false,
      descripcion: "Incluye todo lo del plan Taller y permite trabajar con más capacidad.",
      funciones: ["Todo lo del plan Taller", "Más espacio para gestionar el trabajo", "Más espacio para guardar archivos", "Más uso de las herramientas"],
      destacado: true, accion: "Acceder a la plataforma", href: "/auth" as const,
    },
    {
      id: "empresarial", nombre: "Empresarial", precioMensual: null, gratis: false,
      descripcion: "Para talleres con varias personas o sedes.",
      funciones: ["Funciones para trabajar en equipo", "Gestión de varias sedes", "Recursos para cada taller", "Ayuda para elegir un plan"],
      destacado: false, accion: "Consultar solución", href: "/auth" as const,
    },
  ];
  return (
    <>
      <p className="mt-4 text-center text-xs font-semibold text-slate-600">Precios en dólares estadounidenses (USD).</p>
      <p className="mt-2 text-center text-xs text-slate-500">Elige un periodo de pago y ahorra.</p>
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
            <article key={plan.nombre} role="button" tabIndex={0} aria-haspopup="dialog" aria-label={"Ver capacidades del plan " + plan.nombre} onClick={() => setPlanCapacidadesAbierto(plan.nombre)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setPlanCapacidadesAbierto(plan.nombre); } }} className={"relative flex h-full cursor-pointer flex-col rounded-2xl border bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,.035)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,23,42,.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19] sm:p-6 " + (plan.destacado ? "border-[#d4aa19] ring-1 ring-[#d4aa19]" : "border-slate-200")}>
              {plan.destacado && <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#f8c928] px-3 py-1 text-[10px] font-bold text-[#17232d]">Más capacidades</span>}
              <h3 className="mt-1 text-lg font-bold text-[#17232d]">{plan.nombre}</h3>
              <p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">{plan.descripcion}</p>
              <div className="mt-5 min-h-[108px]">
                {!tienePrecio && <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#17232d]">A medida</p>}
                {tienePrecio && plan.gratis && <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#17232d]">Gratis</p>}
                {tienePrecio && !plan.gratis && (
                  <>
                    <p className="mt-1 text-2xl font-extrabold tracking-tight text-[#17232d]">{formatoPrecio(totalPeriodo)}<span className="ml-1 text-xs font-medium text-slate-500">{periodicidad === "mensual" ? "al mes" : "por " + periodo.meses + " meses"}</span></p>
                    {periodo.descuento > 0 && <p className="mt-1 text-xs text-slate-500"><span className="line-through">{formatoPrecio(precioMensual * periodo.meses)}</span> <span className="font-semibold text-emerald-700">Ahorra {formatoPrecio(precioMensual * periodo.meses - totalPeriodo)} ({Math.round(periodo.descuento * 100)} %)</span></p>}
                    {periodicidad !== "mensual" && <p className="mt-1 text-[10px] text-slate-500">Equivale a {formatoPrecio(totalPeriodo / periodo.meses)} al mes</p>}
                  </>
                )}
              </div>
              <ul className="mt-4 flex-1 space-y-3 border-t border-slate-100 pt-4">
                {plan.funciones.map((funcion) => <li key={funcion} className="flex items-start gap-2 text-xs leading-5 text-slate-600"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />{funcion}</li>)}
              </ul>
              <Link to={plan.href} onClick={event => event.stopPropagation()} className={"mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19] " + (plan.destacado ? "bg-[#17232d] text-white hover:bg-[#293b49]" : "border border-slate-300 text-[#17232d] hover:border-[#d4aa19] hover:bg-[#fffbee]")}>
                {plan.accion} <ArrowRight className="size-3.5" />
              </Link>
              {planCapacidadesAbierto === plan.nombre && (() => {
                const cuota = cuotasPlanes?.find((item) => item.plan_id === plan.id);
                const formatoLimite = (value: number | null | undefined) =>
                  value == null ? (cargandoCuotas ? "Cargando…" : errorCuotas ? "No disponible" : "—")
                    : value < 0 ? "Sin límite" : value.toLocaleString("es-PE");
                const formatoAlmacenamiento = (mib: number | null | undefined) =>
                  mib == null ? (cargandoCuotas ? "Cargando…" : errorCuotas ? "No disponible" : "—")
                    : mib < 0 ? "Sin límite"
                    : mib >= 1024 ? Number((mib / 1024).toFixed(2)).toLocaleString("es-PE") + " GB"
                    : mib + " MB";
                const campos = [
                  { label: "Productos catálogo", value: formatoLimite(cuota?.productos_catalogo_max) },
                  { label: "Operaciones/mes", value: formatoLimite(cuota?.operaciones_comerciales_mes) },
                  { label: "Almacenamiento", value: formatoAlmacenamiento(cuota?.almacenamiento_mib) },
                  { label: "Carpetas Mi Nube", value: formatoLimite(cuota?.carpetas_mi_nube_max) },
                ];
                return <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto rounded-2xl border border-[#d4aa19] bg-white p-5 shadow-xl sm:p-6" role="dialog" aria-modal="false" aria-labelledby={"capacidades-plan-title-" + plan.nombre}>
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#b58b37]">Capacidades incluidas</p><h3 id={"capacidades-plan-title-" + plan.nombre} className="mt-1 text-lg font-bold text-[#17232d]">Plan {plan.nombre}</h3><p className="mt-1 text-xs text-slate-500">Límites y recursos asignados.</p></div>
                    <button type="button" onClick={event => { event.stopPropagation(); setPlanCapacidadesAbierto(null); }} aria-label="Cerrar capacidades" className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"><X className="size-5" /></button>
                  </div>
                  <div className="mt-5 grid flex-1 content-start grid-cols-2 gap-3">
                    {campos.map(campo => <div key={campo.label} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] leading-4 text-slate-500">{campo.label}</p><p className="mt-1 text-2xl font-semibold tabular-nums text-[#17232d]">{campo.value}</p></div>)}
                  </div>
                  <div className="mt-4 flex justify-end"><button type="button" onClick={event => { event.stopPropagation(); setPlanCapacidadesAbierto(null); }} className="rounded-xl bg-[#17232d] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#293b49]">Volver al plan</button></div>
                </div>;
              })()}
            </article>
          );
        })}
      </div>
      <p className="mx-auto mt-5 max-w-3xl text-center text-[11px] leading-5 text-slate-500">El total depende del periodo elegido. Revisa las condiciones antes de suscribirte.</p>
    </>
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
      if (entry?.isIntersecting) {
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
        <div key={taller.id} className="flex h-32 w-56 shrink-0 flex-col items-center justify-center gap-2 px-3 sm:w-64 lg:w-72" title={duplicado ? undefined : taller.nombre}>
          <img
            src={taller.logo}
            alt={duplicado ? "" : taller.nombre}
            loading="lazy"
            decoding="async"
            className="max-h-20 max-w-full rounded-sm bg-white object-contain opacity-90 transition-opacity duration-300 hover:opacity-100"
            style={{ backgroundColor: "#ffffff" }}
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
            Talleres que forman parte de la comunidad AURUM LAB.
          </h2>
        </div>

        {!visible || isLoading ? (
          <div role="status" className="mx-auto mt-12 flex max-w-6xl flex-wrap items-center justify-center gap-x-12 gap-y-8">
            {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-14 w-40 animate-pulse rounded bg-slate-100" />)}
          </div>
        ) : (
          <div role="region" aria-labelledby="talleres-comunidad-titulo" className="aurum-community-marquee-viewport relative mx-auto mt-10 max-w-[1240px] overflow-hidden py-2">
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
  const [videoDemoAurumAbierto, setVideoDemoAurumAbierto] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [comunidadMovilAbierta, setComunidadMovilAbierta] = useState(false);
  const demo3DSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = mainRef.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-aurum-reveal]:not([data-aurum-tools-reveal])"));
    root.classList.add("aurum-motion-ready");

    // Stagger only nearby siblings so the reveal feels intentional without delaying distant sections.
    const siblingGroups = new Map<HTMLElement, HTMLElement[]>();
    targets.forEach((target) => {
      const parent = target.parentElement;
      if (!parent) return;
      const group = siblingGroups.get(parent) ?? [];
      group.push(target);
      siblingGroups.set(parent, group);
    });
    siblingGroups.forEach((group) => {
      group.forEach((target, index) => {
        target.style.setProperty("--aurum-reveal-delay", `${Math.min(index, 4) * 85}ms`);
      });
    });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") {
      targets.forEach((target) => target.classList.add("aurum-is-visible"));
      return () => {
        root.classList.remove("aurum-motion-ready");
        targets.forEach((target) => target.style.removeProperty("--aurum-reveal-delay"));
      };
    }

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("aurum-is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -48px 0px" });

    targets.forEach((target) => revealObserver.observe(target));
    return () => {
      revealObserver.disconnect();
      root.classList.remove("aurum-motion-ready");
    };
  }, []);

  useEffect(() => {
    const section = mainRef.current?.querySelector<HTMLElement>("#soluciones");
    if (!section) return;
    const targets = Array.from(section.querySelectorAll<HTMLElement>("[data-aurum-tools-reveal]"));
    const revealAll = () => targets.forEach((target) => target.classList.add("aurum-is-visible"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") {
      revealAll();
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        revealAll();
        observer.disconnect();
      }
    }, { threshold: 0.2 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

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
          if (entry?.isIntersecting) {
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
    <main ref={mainRef} className="min-h-screen bg-white text-[#17232d]">
      <style>{`
        @keyframes aurum-hero-enter {
          from { opacity: 0; transform: translate3d(0, 26px, 0) scale(.985); filter: blur(5px); }
          to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
        }
        @keyframes aurum-orb-drift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(18px, -15px, 0) scale(1.06); }
        }
        @keyframes aurum-dashboard-float {
          0%, 100% { transform: translate3d(0, 0, 0) rotateX(0deg); }
          50% { transform: translate3d(0, -10px, 0) rotateX(.35deg); }
        }
        @keyframes aurum-badge-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(248,201,40,0); }
          50% { box-shadow: 0 0 0 7px rgba(248,201,40,.12); }
        }
        @keyframes aurum-preview-glint {
          0%, 72%, 100% { transform: translateX(-140%) skewX(-18deg); opacity: 0; }
          12%, 42% { opacity: .75; }
          58% { transform: translateX(240%) skewX(-18deg); opacity: 0; }
        }
        @keyframes aurum-glow-breathe {
          0%, 100% { opacity: .55; }
          50% { opacity: .9; }
        }
        @keyframes aurum-card-sheen {
          from { transform: translateX(-130%) skewX(-18deg); }
          to { transform: translateX(230%) skewX(-18deg); }
        }
        .aurum-hero-enter { animation: aurum-hero-enter .9s cubic-bezier(.2,.75,.25,1) both; }
        .aurum-hero-enter-delay-1 { animation-delay: .12s; }
        .aurum-hero-enter-delay-2 { animation-delay: .24s; }
        .aurum-hero-enter-delay-3 { animation-delay: .36s; }
        .aurum-motion-ready [data-aurum-reveal] {
          opacity: 0;
          translate: 0 30px;
          transition:
            opacity .75s cubic-bezier(.2,.75,.25,1),
            translate .75s cubic-bezier(.2,.75,.25,1),
            scale .75s cubic-bezier(.2,.75,.25,1);
          transition-delay: var(--aurum-reveal-delay, 0ms);
        }
        .aurum-motion-ready [data-aurum-reveal="scale"] {
          translate: 0 18px;
          scale: .965;
        }
        .aurum-motion-ready [data-aurum-reveal="left"] {
          translate: -34px 0;
        }
        .aurum-motion-ready [data-aurum-reveal].aurum-is-visible {
          opacity: 1;
          translate: 0 0;
          scale: 1;
        }
        .aurum-ambient-orb { animation: aurum-orb-drift 13s ease-in-out infinite; }
        .aurum-ambient-glow { animation: aurum-glow-breathe 8s ease-in-out infinite; }
        .aurum-dashboard-float { animation: aurum-dashboard-float 6s ease-in-out infinite; transform-origin: center center; }
        .aurum-hero-badge { animation: aurum-badge-pulse 3.8s ease-in-out infinite; }
        .aurum-preview-glint { position: relative; isolation: isolate; overflow: hidden; }
        .aurum-preview-glint::after {
          content: "";
          position: absolute;
          z-index: 5;
          inset: 0 auto 0 0;
          width: 34%;
          pointer-events: none;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,.24), transparent);
          animation: aurum-preview-glint 8s ease-in-out infinite;
        }
        .aurum-motion-card { transform: translateZ(0); transition: transform .45s cubic-bezier(.2,.75,.25,1), box-shadow .45s ease, border-color .35s ease; }
        .aurum-motion-card::after {
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: 42%;
          pointer-events: none;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,.48), transparent);
          opacity: 0;
        }
        .aurum-motion-card:hover::after { opacity: 1; animation: aurum-card-sheen .85s ease both; }
        .aurum-motion-card:hover { transform: translateY(-7px); }
        .aurum-motion-card [data-aurum-icon] { transition: transform .45s cubic-bezier(.2,.75,.25,1), background-color .3s ease; }
        .aurum-motion-card:hover [data-aurum-icon] { transform: translateY(-3px) rotate(-5deg) scale(1.06); }
        .aurum-motion-ready [data-aurum-reveal].aurum-is-visible { transition-delay: var(--aurum-reveal-delay, 0ms); }
        @media (prefers-reduced-motion: reduce) {
          .aurum-hero-enter, .aurum-ambient-orb, .aurum-ambient-glow, .aurum-dashboard-float, .aurum-hero-badge, .aurum-preview-glint::after { animation: none !important; }
          .aurum-motion-ready [data-aurum-reveal] { opacity: 1 !important; translate: 0 0 !important; scale: 1 !important; transform: none !important; transition: none !important; }
          .aurum-motion-card, .aurum-motion-card:hover { transform: none !important; transition: none !important; }
          .aurum-motion-card::after { display: none !important; }
        }
      `}</style>
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": "https://www.tallerdeljoyero.com/#organization",
            "name": "AURUM LAB",
            "alternateName": "Taller del Joyero",
            "description": "Plataforma digital especializada en joyería que integra herramientas técnicas, visualización 3D, formación y gestión de talleres. Taller del Joyero es su marca asociada.",
            "slogan": "El arte de crear. La inteligencia de gestionar.",
            "url": "https://www.tallerdeljoyero.com/",
            "logo": {
              "@type": "ImageObject",
              "url": "https://www.tallerdeljoyero.com/brand/aurum-symbol.svg"
            },
            "knowsAbout": [
              "Gestión de talleres de joyería",
              "Diseño CAD 3D para joyería",
              "Renderizado 3D de joyas",
              "Aleaciones y cálculo de metales preciosos",
              "Gemología y manufactura aditiva"
            ]
          },
          {
            "@type": "WebSite",
            "@id": "https://www.tallerdeljoyero.com/#website",
            "url": "https://www.tallerdeljoyero.com/",
            "name": "AURUM LAB",
            "alternateName": "Taller del Joyero",
            "description": "Plataforma digital especializada en joyería. Su sitio reúne herramientas, productos, formación y recursos para profesionales del sector.",
            "inLanguage": "es-PE",
            "publisher": { "@id": "https://www.tallerdeljoyero.com/#organization" }
          },
          {
            "@type": "WebPage",
            "@id": "https://www.tallerdeljoyero.com/#webpage",
            "url": "https://www.tallerdeljoyero.com/",
            "name": "AURUM LAB | Software para talleres de joyería",
            "description": "Plataforma web para talleres de joyería que integra gestión comercial, calculadoras técnicas, visualización y renderizado 3D, formación y recursos especializados.",
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
            "applicationSubCategory": "Software de gestión y diseño 3D para joyería",
            "publisher": { "@id": "https://www.tallerdeljoyero.com/#organization" },
            "operatingSystem": "Web",
            "url": "https://www.tallerdeljoyero.com/",
            "description": "AURUM LAB es software web especializado para talleres de joyería. Integra gestión comercial, calculadoras técnicas, visualización 3D mediante AURUM RENDER, organización de archivos y catálogo digital, y recursos de formación.",
            "featureList": [
              "Cálculo de aleaciones, pesos y medidas",
              "Visualización de modelos de joyería en 3D",
              "Gestión de clientes, cotizaciones, contratos y pedidos",
              "Almacenamiento de archivos y catálogo digital",
              "Formación técnica y recursos de aprendizaje",
              "AURUM RENDER: visualización y renderizado 3D especializado en joyería"
            ],
            "offers": [
              { "@type": "Offer", "name": "Emprendedor", "price": "0", "priceCurrency": "USD", "description": "Plan gratuito con herramientas públicas." },
              { "@type": "Offer", "name": "Taller", "price": "9", "priceCurrency": "USD", "description": "Plan mensual de AURUM LAB.", "priceSpecification": { "@type": "UnitPriceSpecification", "price": "9", "priceCurrency": "USD", "billingDuration": "P1M" } },
              { "@type": "Offer", "name": "Profesional", "price": "24", "priceCurrency": "USD", "description": "Plan mensual de AURUM LAB.", "priceSpecification": { "@type": "UnitPriceSpecification", "price": "24", "priceCurrency": "USD", "billingDuration": "P1M" } }
            ],
            "inLanguage": "es"
          },
          {
            "@type": "ItemList",
            "@id": "https://www.tallerdeljoyero.com/#herramientas",
            "name": "Herramientas de AURUM LAB para talleres de joyería",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Calculadora de aleaciones de oro 18K, 14K y 9K", "url": "https://www.tallerdeljoyero.com/herramientas-publicas", "description": "Calcula proporciones y peso de metal antes de fabricar una pieza." },
              { "@type": "ListItem", "position": 2, "name": "AURUM RENDER, render 3D de joyería", "url": "https://www.tallerdeljoyero.com/aurum-render-public", "description": "Visualiza modelos con metales, gemas e iluminación HDR." },
              { "@type": "ListItem", "position": 3, "name": "Gestión de clientes, cotizaciones y pedidos", "url": "https://www.tallerdeljoyero.com/auth", "description": "Organiza el seguimiento comercial y de producción del taller." },
              { "@type": "ListItem", "position": 4, "name": "Mi Nube y catálogo digital", "url": "https://www.tallerdeljoyero.com/auth", "description": "Guarda archivos de diseño y comparte un catálogo digital." }
            ]
          },
          {
            "@type": "FAQPage",
            "@id": "https://www.tallerdeljoyero.com/#herramientas-faq",
            "mainEntity": [
              { "@type": "Question", "name": "¿Qué es AURUM LAB?", "acceptedAnswer": { "@type": "Answer", "text": "AURUM LAB es un software de gestión para joyerías y talleres de joyería que reúne calculadoras técnicas, render 3D, clientes, cotizaciones, pedidos y catálogo digital." } },
              { "@type": "Question", "name": "¿Cómo calculo cuánto oro necesito para una pieza?", "acceptedAnswer": { "@type": "Answer", "text": "Usa la calculadora de aleaciones de oro de AURUM LAB para calcular proporciones de oro fino y ligadura para 18K, 14K y 9K. El cálculo depende del peso final que ingreses." } },
              { "@type": "Question", "name": "¿AURUM RENDER funciona con Rhino 7 y Rhino 8?", "acceptedAnswer": { "@type": "Answer", "text": "AURUM RENDER es el render 3D de joyería de AURUM LAB y cuenta con complementos AURUM CONNECT para Rhino 7 y Rhino 8." } },
              { "@type": "Question", "name": "¿Puedo probar las herramientas sin crear una cuenta?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Las herramientas públicas de cálculo se pueden explorar sin registro. Para funciones de gestión y Mi Nube necesitas ingresar a tu cuenta." } }
            ]
          }
        ]
      })}</script>
      <a href="#contenido-principal" className="sr-only z-50 rounded-md bg-white px-4 py-2 font-semibold text-[#17232d] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:ring-2 focus:ring-[#d4aa19]">Saltar al contenido principal</a>
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 shadow-[0_2px_8px_rgba(15,23,42,.05)] backdrop-blur">
        <div className="mx-auto flex min-h-[68px] max-w-[1440px] flex-nowrap items-center justify-between gap-2 px-4 sm:gap-4 sm:px-8 lg:px-12">
          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="AURUM LAB, inicio">
            <img
              src="/brand/aurum-symbol.svg"
              alt="Símbolo de AURUM LAB"
              width="40"
              height="40"
              className="size-10 shrink-0 object-contain"
              fetchPriority="high"
            />
            <span className="leading-tight">
              <span className="block text-[17px] font-extrabold tracking-tight text-[#182838]">AURUM<span className="text-[#C5A36B]"> LAB</span></span>
              <span className="hidden text-[9px] font-medium uppercase tracking-[.15em] text-[#687887] sm:block">Tecnología para joyeros</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-[13px] font-medium text-slate-700 lg:flex" aria-label="Navegación principal">
            <Link to="/" className="transition hover:text-[#a77a00]">Inicio</Link>
            <a href="#soluciones" className="transition hover:text-[#a77a00]">Soluciones</a>
            <a href="#como-funciona" className="transition hover:text-[#a77a00]">Cómo funciona</a>
            <Link to="/herramientas-publicas" className="transition hover:text-[#a77a00]">Herramientas</Link>
            <Link to="/guias" className="transition hover:text-[#a77a00]">Guías técnicas</Link>
            <NavDropdown label="Comunidad">
              {(close) => (
                <>
                <Link to="/directorio" onClick={close} role="menuitem" className="flex items-center gap-3 rounded-xl p-3 outline-none transition hover:bg-[#fff9e8] focus-visible:bg-[#fff9e8] focus-visible:ring-2 focus-visible:ring-[#d4aa19]">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff4d5] text-[#9a7418]"><UsersRound className="size-5" /></span>
                  <span><span className="block text-sm font-semibold text-[#17232d]">Red de Joyería</span><span className="mt-0.5 block text-xs text-slate-500">Talleres, joyerías y profesionales</span></span>
                </Link>
                <Link to="/cursos-diseno-3d" onClick={close} role="menuitem" className="flex items-center gap-3 rounded-xl p-3 outline-none transition hover:bg-[#fff9e8] focus-visible:bg-[#fff9e8] focus-visible:ring-2 focus-visible:ring-[#d4aa19]">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff4d5] text-[#9a7418]"><GraduationCap className="size-5" /></span>
                  <span><span className="block text-sm font-semibold text-[#17232d]">Cursos y Formación</span><span className="mt-0.5 block text-xs text-slate-500">Aprende diseño y técnicas joyeras</span></span>
                </Link>
                <Link to="/galeria-joyas" onClick={close} role="menuitem" className="flex items-center gap-3 rounded-xl p-3 outline-none transition hover:bg-[#fff9e8] focus-visible:bg-[#fff9e8] focus-visible:ring-2 focus-visible:ring-[#d4aa19]">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff4d5] text-[#9a7418]"><Gem className="size-5" /></span>
                  <span><span className="block text-sm font-semibold text-[#17232d]">Galería de Diseños</span><span className="mt-0.5 block text-xs text-slate-500">Modelos 3D y recursos digitales</span></span>
                </Link>
                </>
              )}
            </NavDropdown>
            <a href="#contacto" className="transition hover:text-[#a77a00]">Contacto</a>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <RegistroTaller className="hidden min-h-10 items-center justify-center rounded-xl bg-[#f8c928] px-4 text-xs font-bold text-[#17232d] shadow-sm transition hover:bg-[#ffdf65] sm:inline-flex" />
            <a href="/auth" onClick={(event) => { const esDispositivoTactil = navigator.maxTouchPoints > 0 || /Android|iPad|Tablet|Mobile/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); const esPC = !esDispositivoTactil && window.innerWidth >= 1024 && window.matchMedia("(pointer: fine)").matches; if (esPC) { event.preventDefault(); window.open("/auth", "_blank", "noopener,noreferrer"); } }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-[#17232d] transition hover:border-[#d4aa19] lg:px-4 lg:text-sm"><MonitorSmartphone className="size-4" /> Ingresar</a>
            <button
              type="button"
              onClick={() => setMenuMovilAbierto((abierto) => !abierto)}
              className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-[#17232d] shadow-sm transition hover:border-[#d4aa19] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19] lg:hidden"
              aria-label={menuMovilAbierto ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuMovilAbierto}
              aria-controls="menu-principal-movil"
            >
              {menuMovilAbierto ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
        {menuMovilAbierto && (
          <nav id="menu-principal-movil" className="border-t border-slate-200 bg-white px-5 py-3 shadow-lg lg:hidden" aria-label="Navegación móvil">
            <div className="mx-auto grid max-w-[1440px] gap-1">
              <Link to="/" onClick={() => setMenuMovilAbierto(false)} className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-amber-50 hover:text-[#8f6b00]">Inicio</Link>
              <a href="#soluciones" onClick={() => setMenuMovilAbierto(false)} className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-amber-50 hover:text-[#8f6b00]">Soluciones</a>
              <a href="#como-funciona" onClick={() => setMenuMovilAbierto(false)} className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-amber-50 hover:text-[#8f6b00]">Cómo funciona</a>
              <Link to="/herramientas-publicas" onClick={() => setMenuMovilAbierto(false)} className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-amber-50 hover:text-[#8f6b00]">Herramientas</Link>
              <Link to="/guias" onClick={() => setMenuMovilAbierto(false)} className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-amber-50 hover:text-[#8f6b00]">Guías técnicas</Link>
              <div className="rounded-lg">
                <button type="button" onClick={() => setComunidadMovilAbierta((abierta) => !abierta)} aria-expanded={comunidadMovilAbierta} className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-amber-50 hover:text-[#8f6b00]">
                  Comunidad <ChevronDown className={"size-4 transition-transform " + (comunidadMovilAbierta ? "rotate-180" : "")} />
                </button>
                {comunidadMovilAbierta && <div className="ml-3 grid gap-1 border-l-2 border-[#e8d39a] pl-2 pb-2">
                  <Link to="/directorio" onClick={() => setMenuMovilAbierto(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-amber-50">Red de Joyería</Link>
                  <Link to="/cursos-diseno-3d" onClick={() => setMenuMovilAbierto(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-amber-50">Cursos y Formación</Link>
                  <Link to="/galeria-joyas" onClick={() => setMenuMovilAbierto(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-amber-50">Galería de Diseños</Link>
                </div>}
              </div>
              <a href="#contacto" onClick={() => setMenuMovilAbierto(false)} className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-amber-50 hover:text-[#8f6b00]">Contacto</a>
            </div>
          </nav>
        )}
      </header>

      <section id="contenido-principal" className="relative isolate scroll-mt-24 overflow-hidden">
        <div className="aurum-ambient-orb pointer-events-none absolute -left-32 top-12 -z-10 size-[28rem] rounded-full bg-[#ffe99b]/70 blur-[90px]" />
        <div className="aurum-ambient-glow pointer-events-none absolute right-[28%] top-20 -z-10 size-64 rounded-full bg-[#e9f1ff]/80 blur-[80px]" />
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[.92fr_1.08fr] lg:gap-8 lg:px-12 lg:pb-24 lg:pt-20">
          <div className="aurum-hero-enter relative z-10 max-w-[650px]">
            <span className="aurum-hero-badge inline-flex items-center gap-2 rounded-full border border-[#e5c04a]/50 bg-[#fff9df] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#785b00]"><Sparkles className="size-3.5" /> AURUM LAB · TECNOLOGÍA PARA JOYEROS</span>
            <h1 className="mt-6 text-[2.65rem] font-extrabold leading-[1.06] tracking-[-.045em] text-[#17232d] sm:text-5xl lg:text-[3.8rem]">Gestiona tu taller de joyería y presenta diseños en 3D.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">Con <strong>AURUM LAB</strong> organizas clientes y pedidos, calculas materiales y presentas tus modelos de joyería con metales, gemas e iluminación profesional.</p>
            <ul className="mt-7 space-y-4 text-sm font-medium text-[#25323b] sm:text-[15px]">
              <li className="flex items-start gap-3"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-[#fff4c4] text-[#9b7600]"><Check className="size-4" /></span><span>Calcula cuánto metal necesitas para cada pieza.</span></li>
              <li className="flex items-start gap-3"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-[#fff4c4] text-[#9b7600]"><Check className="size-4" /></span><span>Presenta tus modelos con metales, gemas e iluminación en <strong>AURUM RENDER</strong>.</span></li>
              <li className="flex items-start gap-3"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-[#fff4c4] text-[#9b7600]"><Check className="size-4" /></span><span>Organiza clientes, cotizaciones y pedidos.</span></li>
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <SolicitarDemo className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#d4aa19] bg-[#f8c928] px-6 py-3 text-sm font-extrabold text-[#17232d] shadow-lg shadow-amber-900/10 transition hover:-translate-y-0.5 hover:bg-[#ffdf65] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19] focus-visible:ring-offset-2" />
            </div>
            <p className="mt-4 text-xs text-slate-500">Conoce las herramientas y pide una demostración.</p>
          </div>

          <AurumProductShowcase />
        </div>
      </section>

      <section ref={demo3DSectionRef} id="aurum-render" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 760px" }} className="overflow-hidden border-y border-[#263743] bg-[#111a22] text-white">
        <div className="mx-auto grid max-w-[1440px] items-center gap-9 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[1.05fr_.95fr] lg:gap-14 lg:px-12 lg:py-20">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#d4aa19]/40 bg-[#d4aa19]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-[#f3d66e]"><Sparkles className="size-3.5" /> DISEÑO CAD Y VISUALIZACIÓN PROFESIONAL</p>
            <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">Del diseño CAD a una presentación profesional.</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">Crea imágenes 3D de tus modelos de joyería. Explora metales, gemas e iluminación con <strong>AURUM RENDER</strong>.</p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">Conecta Rhino 7 u 8 con <strong>AURUM CONNECT</strong> y lleva tus modelos al estudio de visualización.</p>
            <div className="mt-7">
              <button type="button" onClick={() => setVideoDemoAurumAbierto(true)} className="group relative inline-flex min-h-12 items-center gap-3 overflow-hidden rounded-xl border border-[#e7bd38] bg-gradient-to-r from-[#d6a91b] via-[#f8d65a] to-[#d6a91b] px-5 py-3 text-sm font-extrabold text-[#17232d] shadow-[0_8px_24px_rgba(212,170,25,.18)] transition duration-200 hover:-translate-y-0.5 hover:from-[#e5bb32] hover:via-[#ffe47a] hover:to-[#e5bb32] hover:shadow-[0_12px_30px_rgba(212,170,25,.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f8c928] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111a22]"><span className="grid size-8 place-items-center rounded-lg border border-[#17232d]/10 bg-[#17232d]/[.08] text-[#17232d]"><Camera className="size-4" /></span><span className="text-left"><span className="block">Ver video demostrativo</span><span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[.14em] text-[#5a4300]">AURUM RENDER en acción</span></span><ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[560px]">
            <div className="absolute inset-8 rounded-full bg-[#b58b00]/20 blur-3xl" />
            <div className="relative overflow-visible rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#29343e] via-[#171f27] to-[#090d11] p-5 shadow-[0_25px_80px_rgba(0,0,0,.35)] sm:p-7">
              <img
                src="/brand/rhino-cpp-plugin.webp"
                alt="Emblema del plugin de Rhinoceros con C++"
                width={325}
                height={275}
                loading="lazy"
                decoding="async"
                className="pointer-events-none absolute -left-9 bottom-[8rem] z-30 h-24 w-28 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,.55)] sm:-left-12 sm:bottom-32 sm:h-28 sm:w-32"
              />
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[.24em] text-[#f3d66e]">ESTUDIO DIGITAL DE JOYERÍA</p>
                  <p className="mt-1 text-sm font-semibold text-white">AURUM RENDER</p>
                </div>
                <span className="grid size-10 place-items-center rounded-xl border border-[#f8c928]/30 bg-[#f8c928]/10"><img src="/brand/aurum-symbol.svg" alt="AURUM LAB" className="size-7 object-contain" /></span>
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
                    La vista 3D se activa al llegar a esta sección.
                  </p>
                </div>
              )}
              <style>{`
                @keyframes aurum-rhino-connection-pulse {
                  from { transform: translateX(-110%); }
                  to { transform: translateX(330%); }
                }
                .aurum-rhino-connection-pulse {
                  animation: aurum-rhino-connection-pulse 3.8s ease-in-out infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                  .aurum-rhino-connection-pulse { animation: none; }
                }
              `}</style>
              <div className="aurum-rhino-connection relative mt-3 overflow-visible rounded-xl border border-[#d4aa19]/30 bg-[#d4aa19]/[.06] p-3 pl-12 sm:p-3.5 sm:pl-14">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-white/10 bg-white/[.04] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold text-white sm:text-xs">AURUM CONNECT · Rhino 7</p>
                      <span className="rounded-full border border-[#d4aa19]/35 px-2 py-0.5 text-[9px] font-semibold text-[#f3d66e]">.RHP</span>
                    </div>
                    <p className="text-[10px] leading-4 text-slate-300">Conecta tu entorno Rhino 7 con AURUM RENDER.</p>
                    <Link to="/auth" className="group/rhino inline-flex min-h-8 items-center justify-center gap-2 rounded-lg bg-[#f8c928] px-3 py-2 text-[10px] font-extrabold text-[#17232d] transition-colors hover:bg-[#ffe071] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                      Conocer complemento <ArrowRight className="size-3.5 transition-transform group-hover/rhino:translate-x-0.5" />
                    </Link>
                  </div>
                  <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-[#d4aa19]/35 bg-[#d4aa19]/[.08] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold text-white sm:text-xs">AURUM CONNECT 8 · Rhino 8</p>
                      <span className="rounded-full border border-[#d4aa19]/35 px-2 py-0.5 text-[9px] font-semibold text-[#f3d66e]">.RHP</span>
                    </div>
                    <p className="text-[10px] leading-4 text-slate-300">Complemento nativo independiente para Rhino 8.</p>
                    <Link to="/auth" className="group/rhino inline-flex min-h-8 items-center justify-center gap-2 rounded-lg border border-[#d4aa19]/45 bg-[#f8c928] px-3 py-2 text-[10px] font-extrabold text-[#17232d] transition-colors hover:bg-[#ffe071] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                      Conocer complemento <ArrowRight className="size-3.5 transition-transform group-hover/rhino:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-x-3 bottom-0 h-px overflow-hidden bg-white/10" aria-hidden="true">
                  <span className="aurum-rhino-connection-pulse absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[#f8d85b] to-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
                <div className="rounded-lg bg-white/[.04] px-2 py-3"><p className="text-[9px] uppercase tracking-wider text-slate-400">Materiales</p><p className="mt-1 text-xs font-semibold text-white">Metales y gemas</p></div>
                <div className="rounded-lg bg-white/[.04] px-2 py-3"><p className="text-[9px] uppercase tracking-wider text-slate-400">Iluminación</p><p className="mt-1 text-xs font-semibold text-white">Entornos HDR</p></div>
                <div className="rounded-lg bg-white/[.04] px-2 py-3"><p className="text-[9px] uppercase tracking-wider text-slate-400">Captura</p><p className="mt-1 text-xs font-semibold text-white">Foto y vídeo</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="soluciones" aria-labelledby="herramientas-titulo" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 920px" }} className="border-y border-slate-200 bg-[#f7f9fc]">
        <style>{`
          .aurum-motion-ready #soluciones .aurum-tools-heading [data-aurum-reveal] { transition: opacity .5s cubic-bezier(.22,1,.36,1), translate .5s cubic-bezier(.22,1,.36,1); translate:0 16px; }
          .aurum-motion-ready #soluciones .aurum-tools-heading [data-aurum-reveal].aurum-is-visible { opacity:1; translate:0 0; }
          .aurum-tools-grid { display:grid; grid-template-columns:minmax(0,1fr); gap:1rem; }
          @media(min-width:640px){.aurum-tools-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
          @media(min-width:1280px){.aurum-tools-grid{grid-template-columns:repeat(4,minmax(0,1fr));}}
          @keyframes aurum-tools-edge-glow { 0%,100% {opacity:.18;} 50% {opacity:.48;} }
          .aurum-tools-card { transform:translateY(0); transition:transform .5s cubic-bezier(.22,1,.36,1),box-shadow .5s cubic-bezier(.22,1,.36,1),border-color .4s ease; }
          .aurum-tools-card:hover { transform:translateY(-4px); box-shadow:0 18px 38px rgba(23,35,45,.11); border-color:#d8b64a; }
          .aurum-tools-card[data-featured="true"] { border-color:rgba(190,151,48,.65); box-shadow:0 5px 22px rgba(166,124,24,.07); }
          .aurum-tools-card[data-featured="true"]::after { content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;border:1px solid transparent;background:linear-gradient(110deg,transparent 15%,rgba(230,197,103,.35),transparent 70%) border-box;mask:linear-gradient(#fff 0 0) padding-box,linear-gradient(#fff 0 0);mask-composite:exclude;opacity:0; }
          .aurum-tools-card[data-featured="true"]::after { animation:aurum-tools-edge-glow 5.5s ease-in-out infinite; }
          .aurum-tools-card[data-featured="true"]:hover::after { opacity:.65; }
          .aurum-tools-card [data-aurum-icon] { transition:transform .45s cubic-bezier(.22,1,.36,1),background-color .3s ease; }
          .aurum-tools-card:hover [data-aurum-icon] { transform:rotate(-5deg) scale(1.06); }
          .aurum-tools-card .aurum-tools-arrow { transition:transform .4s cubic-bezier(.22,1,.36,1); }
          .aurum-tools-card:hover .aurum-tools-arrow { transform:translateX(4px); }
          .aurum-tools-number { opacity:0; transform:translateY(5px); transition:opacity .45s ease,transform .45s cubic-bezier(.22,1,.36,1); }
          .aurum-tools-card.aurum-is-visible .aurum-tools-number { opacity:1; transform:translateY(0); }
          .aurum-motion-ready #soluciones .aurum-tools-card[data-aurum-reveal] { translate:0 16px; transition:opacity .5s cubic-bezier(.22,1,.36,1),translate .5s cubic-bezier(.22,1,.36,1),transform .5s cubic-bezier(.22,1,.36,1),box-shadow .5s cubic-bezier(.22,1,.36,1); }
          .aurum-motion-ready #soluciones .aurum-tools-card[data-aurum-reveal].aurum-is-visible { opacity:1; translate:0 0; }
          .aurum-tools-preview { height:112px; overflow:hidden; border:1px solid #e8e8e8; border-radius:12px; background:#f8fafc; }
          .aurum-tools-preview-ui { height:100%; display:flex; flex-direction:column; gap:7px; padding:10px; font-size:9px; color:#475569; }
          .aurum-render-preview { isolation:isolate; }
          .aurum-render-preview::before { content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.04),transparent 55%,rgba(216,181,77,.08));pointer-events:none; }
          .aurum-render-feature { display:flex;min-width:0;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:1px solid #eee4c7;border-radius:8px;background:#fff;padding:5px 3px;text-align:center; }
          .aurum-render-feature-icon { display:grid;place-items:center;width:20px;height:20px;color:#e8c76c; }
          .aurum-render-feature-icon svg { width:16px;height:16px;stroke-width:1.5; }
          .aurum-render-feature-title { font-size:8px;font-weight:800;letter-spacing:.02em;color:#17232d; }
          .aurum-render-feature-detail { font-size:7px;color:#64748b;white-space:nowrap; }
          .aurum-preview-top { display:flex;align-items:center;justify-content:space-between;gap:6px;font-weight:700;color:#263541; }
          .aurum-preview-chip { border-radius:999px;background:#fff3c1;padding:3px 6px;color:#805f00;font-weight:700; }
          .aurum-preview-row { display:flex;align-items:center;gap:5px; }
          .aurum-preview-box { border:1px solid #e5e7eb;border-radius:6px;background:white;padding:5px;flex:1; }
          .aurum-preview-bar { height:4px;border-radius:999px;background:#e8edf2; }
          .aurum-preview-bar.gold { background:#d8b54d; }
          .aurum-tools-faq details { border-bottom:1px solid #e5e7eb; }
          .aurum-tools-faq summary { cursor:pointer;list-style:none; }
          .aurum-tools-faq summary::-webkit-details-marker { display:none; }
          .aurum-tools-faq summary:focus-visible { outline:2px solid #b58b00;outline-offset:4px;border-radius:4px; }
          @media(prefers-reduced-motion:reduce){
            .aurum-tools-heading [data-aurum-reveal],.aurum-tools-card,.aurum-tools-card:hover,.aurum-tools-card [data-aurum-icon],.aurum-tools-arrow,.aurum-tools-number {transition:none!important;transform:none!important;translate:0 0!important;opacity:1!important;}
            .aurum-tools-card[data-featured="true"]::after{display:none;animation:none;}
          }
        `}</style>
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <div className="aurum-tools-heading mx-auto max-w-3xl text-center">
            <p data-aurum-reveal data-aurum-tools-reveal className="text-[10px] font-bold uppercase tracking-[.22em] text-[#806000]">Tecnología pensada para el oficio joyero</p>
            <h2 data-aurum-reveal data-aurum-tools-reveal id="herramientas-titulo" className="mx-auto mt-3 max-w-[48rem] text-balance text-2xl font-extrabold tracking-tight text-[#17232d] sm:text-3xl lg:text-4xl">Calcula, presenta y controla tu taller en un solo lugar.</h2>
            <p data-aurum-reveal data-aurum-tools-reveal className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-700 sm:text-base">Menos merma de metal, mejores presentaciones para tus clientes y cada pedido bajo control.</p>
          </div>
          <ul className="aurum-tools-grid mt-8 list-none p-0">
            {soluciones.map(({ numero, etiqueta, icon: Icono, titulo, texto, beneficio, enlace, accion, destacado, preview }, index) => (
              <li key={titulo} className="min-w-0">
                <article data-aurum-reveal data-aurum-tools-reveal data-featured={destacado ? "true" : "false"} style={{ transitionDelay: (index * 100) + "ms" }} className="aurum-tools-card group relative flex h-full min-h-[360px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_5px_20px_rgba(23,35,45,.035)] sm:p-5">
                  
                  <div className="flex items-center justify-between">
                    <span data-aurum-icon className="grid size-11 place-items-center rounded-xl bg-[#fff1bd] text-[#755600]"><Icono aria-hidden="true" className="size-5" strokeWidth={1.8} /></span>
                    <span className="aurum-tools-number text-[11px] font-bold tracking-[.16em] text-slate-400">{numero}</span>
                  </div>
                  <div className="aurum-tools-preview mt-3" aria-hidden={preview !== "render" ? "true" : undefined}>
                    {preview === "aleacion" && <div className="aurum-tools-preview-ui"><div className="aurum-preview-top"><span>Calculadora de aleación</span><span className="aurum-preview-chip">18K</span></div><div className="aurum-preview-row"><div className="aurum-preview-box"><span>Oro fino</span><div className="aurum-preview-bar gold mt-1 w-3/4" /></div><div className="aurum-preview-box"><span>Ligadura</span><div className="aurum-preview-bar mt-1 w-1/2" /></div></div><div className="aurum-preview-row"><div className="aurum-preview-box flex justify-between"><span>Metal requerido</span><strong className="text-[#806000]">g</strong></div></div></div>}
                    {preview === "render" && <div className="aurum-render-preview relative flex h-full flex-col justify-between overflow-hidden bg-[#fffdf8] p-2.5 text-[#17232d]"><div className="absolute -right-8 -top-10 size-32 rounded-full bg-[#d8b54d]/10 blur-2xl" /><div className="aurum-preview-top relative"><span className="tracking-[.12em] text-[#17232d]">AURUM RENDER</span><span className="aurum-preview-chip">3D</span></div><div className="aurum-render-feature-grid relative grid grid-cols-3 gap-1.5"><div className="aurum-render-feature"><span className="aurum-render-feature-icon"><Gem aria-hidden="true" /></span><span className="aurum-render-feature-title">Materiales</span><span className="aurum-render-feature-detail">Oro · Plata</span></div><div className="aurum-render-feature"><span className="aurum-render-feature-icon"><Sparkles aria-hidden="true" /></span><span className="aurum-render-feature-title">Iluminación</span><span className="aurum-render-feature-detail">HDRI · Gemas</span></div><div className="aurum-render-feature"><span className="aurum-render-feature-icon"><Camera aria-hidden="true" /></span><span className="aurum-render-feature-title">Fotografía</span><span className="aurum-render-feature-detail">Estudio 3D</span></div></div></div>}
                    {preview === "gestion" && <div className="aurum-tools-preview-ui"><div className="aurum-preview-top"><span>Panel de taller</span><span className="aurum-preview-chip">Hoy</span></div><div className="aurum-preview-row"><div className="aurum-preview-box"><strong className="text-sm text-[#17232d]">12</strong><span className="block">Pedidos</span></div><div className="aurum-preview-box"><strong className="text-sm text-[#17232d]">04</strong><span className="block">Cotizaciones</span></div><div className="aurum-preview-box"><strong className="text-sm text-[#17232d]">08</strong><span className="block">Clientes</span></div></div><div className="aurum-preview-bar gold w-4/5" /><div className="aurum-preview-bar w-2/3" /></div>}
                    {preview === "nube" && <div className="aurum-tools-preview-ui"><div className="aurum-preview-top"><span>Mi Nube</span><span className="aurum-preview-chip">Catálogo</span></div><div className="aurum-preview-row"><div className="aurum-preview-box flex items-center gap-2"><span className="rounded bg-[#fff1bd] p-2 text-[#806000]">◇</span><span>Diseños</span></div><div className="aurum-preview-box flex items-center gap-2"><span className="rounded bg-[#e9f0f8] p-2 text-[#48647e]">↗</span><span>Compartir</span></div></div><div className="aurum-preview-bar gold w-3/4" /><div className="aurum-preview-bar w-1/2" /></div>}
                  </div>
                  <p className="mt-3 flex flex-wrap items-center gap-2 text-[9px] font-extrabold tracking-[.18em] text-[#765900]">{etiqueta}{destacado && <span className="rounded-full border border-[#d5b34c] bg-[#fff8dc] px-2 py-0.5 text-[9px] tracking-normal text-[#725400]">Gratis</span>}</p>
                  <h3 className="mt-1 text-base font-bold leading-snug text-[#17232d]">{titulo}</h3>
                  <p className="mt-2 text-sm leading-5 text-slate-700">{texto}</p>
                  <div className="mt-3">
                    <p className="flex items-start gap-2 text-xs font-semibold leading-5 text-[#344250]"><Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#806000]" />{beneficio}</p>
                    <Link to={enlace} title={accion} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d5b34c] bg-[#fffaf0] px-3 py-2 text-xs font-bold text-[#654c00] transition-colors hover:bg-[#fff0bd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b58b00] focus-visible:ring-offset-2">{accion}<ArrowRight aria-hidden="true" className="aurum-tools-arrow size-3.5" /></Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>

        </div>
      </section>

      <section id="como-funciona" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 520px" }} className="scroll-mt-24 border-y border-slate-200 bg-gradient-to-b from-white to-[#f8fafc]">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">Empieza a tu ritmo</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#17232d] sm:text-3xl lg:text-4xl">Empieza a usar AURUM LAB.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">Prueba las herramientas y luego registra tu taller.</p>
          </div>

          <div className="relative mt-10 grid gap-5 md:grid-cols-3">
            <article data-aurum-reveal className="relative flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#fff3c1] text-sm font-extrabold text-[#8f6b00]">01</span>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[#17232d]">Conoce las herramientas</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Prueba las calculadoras sin registrar tu taller.</p>
                <Link to="/herramientas-publicas" className="mt-4 inline-flex min-h-9 items-center gap-2 text-xs font-bold text-[#765900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19]">Explorar herramientas <ArrowRight className="size-3.5" /></Link>
              </div>
            </article>

            <article data-aurum-reveal className="relative flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#eaf1ff] text-sm font-extrabold text-[#4d6ba5]">02</span>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[#17232d]">Registra tu taller</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Registra tu taller para guardar tu información.</p>
                <RegistroTaller className="mt-4 inline-flex min-h-9 items-center gap-2 text-xs font-bold text-[#765900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19]" />
              </div>
            </article>

            <article data-aurum-reveal className="relative flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e9f8ef] text-sm font-extrabold text-[#27834d]">03</span>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[#17232d]">Lleva el control del taller</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Organiza clientes, cotizaciones y pedidos.</p>
                <Link to="/auth" {...(esPCDeEscritorio() ? { target: "_blank" } : {})} rel="noreferrer" className="mt-4 inline-flex min-h-9 items-center gap-2 text-xs font-bold text-[#765900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19]">Acceder a mi taller <ArrowRight className="size-3.5" /></Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="guias-tecnicas" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 560px" }} className="scroll-mt-24 border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <div className="grid items-start gap-8 lg:grid-cols-[.85fr_1.15fr] lg:gap-14">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#eadca8] bg-[#fff9df] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-[#876500]"><BookOpen className="size-3.5" /> Biblioteca práctica del oficio</p>
              <h2 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight text-[#17232d] sm:text-3xl lg:text-4xl">Aprende sobre joyería y materiales.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">Aprende sobre metales, gemas y técnicas de joyería con guías prácticas.</p>
              <Link to="/guias" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#17232d] transition hover:border-[#d4aa19] hover:bg-[#fffbee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19]">Explorar todas las guías <ArrowRight className="size-4" /></Link>
            </div>
            <article data-aurum-reveal className="group overflow-hidden rounded-[26px] border border-[#e5dfcf] bg-white shadow-[0_14px_45px_rgba(23,35,45,.07)] transition duration-300 hover:-translate-y-0.5 hover:border-[#d9bd70] hover:shadow-[0_22px_55px_rgba(23,35,45,.11)]">
              <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(250px,.8fr)]">
                <div className="relative z-10 p-5 sm:p-7 lg:p-8">
                  <div className="flex items-center gap-2">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[#eadca7] bg-gradient-to-br from-[#fff6d8] to-[#f5e4a8] text-[#8f6b00] shadow-sm"><Gem className="size-5" /></span>
                    <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">Metalurgia y materiales <span className="mx-1 text-[#c9b36e]">/</span> Guía técnica destacada</p>
                  </div>
                  <h3 className="mt-5 max-w-xl text-2xl font-extrabold leading-[1.13] tracking-tight text-[#17232d] sm:text-3xl">Cómo preparar aleaciones de oro de <span className="text-[#a77d13]">18K, 14K y 9K</span></h3>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:text-[15px]">Aprende a calcular aleaciones con pasos claros y ejemplos en gramos.</p>
                  <div className="mt-6">
                    <Link to="/herramientas-publicas/$herramienta" params={{ herramienta: "aleacion-oro" }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#b68a24] to-[#d4ad45] px-5 py-3 text-sm font-bold text-white shadow-[0_7px_18px_rgba(166,124,24,.23)] transition hover:-translate-y-0.5 hover:from-[#9e741b] hover:to-[#c39a32] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c69b32] focus-visible:ring-offset-2">Abrir calculadora de aleaciones <ArrowRight className="size-4" /></Link>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-400">Herramienta especializada de AURUM LAB · Acceso directo</p>
                </div>
                <div className="relative flex min-h-[190px] items-center justify-center overflow-hidden border-t border-[#eee7d5] bg-[radial-gradient(ellipse_at_50%_42%,#fff4c8_0%,#f8f5ec_42%,#f3f5f7_100%)] p-5 sm:min-h-[220px] lg:border-l lg:border-t-0">
                  <div className="absolute -right-12 -top-16 size-48 rounded-full border border-[#d8bd72]/30" />
                  <div className="absolute -right-5 -top-9 size-36 rounded-full border border-[#d8bd72]/35" />
                  <div className="absolute bottom-5 left-6 right-6 h-8 rounded-[50%] bg-[#c5a04a]/10 blur-xl" />
                  <div className="relative flex w-full max-w-[310px] items-end justify-center gap-3">
                    <div className="w-[29%]">
                      <div className="flex h-[76px] items-center justify-center rounded-t-lg border border-[#b88c2b] bg-gradient-to-br from-[#f8e8a5] via-[#d4ad48] to-[#a97919] shadow-[0_12px_18px_rgba(124,91,20,.18)]"><span className="text-lg font-black tracking-tight text-[#fff8dc] drop-shadow">18K</span></div>
                      <div className="h-3 -skew-x-6 rounded-b-md border-x border-b border-[#a77b24] bg-gradient-to-r from-[#c0922c] via-[#f0d47b] to-[#a77b24]" />
                    </div>
                    <div className="w-[29%]">
                      <div className="flex h-[62px] items-center justify-center rounded-t-lg border border-[#b88c2b] bg-gradient-to-br from-[#f4e4a1] via-[#cba13c] to-[#a97919] shadow-[0_12px_18px_rgba(124,91,20,.16)]"><span className="text-lg font-black tracking-tight text-[#fff8dc] drop-shadow">14K</span></div>
                      <div className="h-3 -skew-x-6 rounded-b-md border-x border-b border-[#a77b24] bg-gradient-to-r from-[#c0922c] via-[#e8ca69] to-[#a77b24]" />
                    </div>
                    <div className="w-[29%]">
                      <div className="flex h-[49px] items-center justify-center rounded-t-lg border border-[#b88c2b] bg-gradient-to-br from-[#f0dc8d] via-[#bf9631] to-[#956817] shadow-[0_12px_18px_rgba(124,91,20,.14)]"><span className="text-lg font-black tracking-tight text-[#fff8dc] drop-shadow">9K</span></div>
                      <div className="h-3 -skew-x-6 rounded-b-md border-x border-b border-[#956817] bg-gradient-to-r from-[#aa7d22] via-[#dfbf5b] to-[#956817]" />
                    </div>
                  </div>
                  <span className="absolute bottom-4 right-5 rounded-full border border-white/80 bg-white/75 px-3 py-1 text-[9px] font-bold uppercase tracking-[.18em] text-[#987400] shadow-sm">Oro · Leyes</span>
                </div>
              </div>
              <div className="grid gap-3 border-t border-slate-100 bg-[#fffefa] px-5 py-4 text-xs text-slate-600 sm:grid-cols-3 sm:px-7">
                <div className="flex items-center gap-2"><Check className="size-4 shrink-0 text-emerald-600" /> Fórmulas explicadas</div>
                <div className="flex items-center gap-2"><Check className="size-4 shrink-0 text-emerald-600" /> Ejemplos en gramos</div>
                <div className="flex items-center gap-2"><Check className="size-4 shrink-0 text-emerald-600" /> Calculadora especializada</div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="planes" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 720px" }} className="border-y border-slate-200 bg-[#f8fafc]">
        <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">Planes para cada etapa</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#17232d] sm:text-3xl">Planes y precios</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">Compara los planes y elige el ideal para tu taller.</p>
          </div>
          <PlanesPublicos />
        </div>
      </section>

      <TalleresDeLaComunidad />

      <section className="aurum-tools-faq mx-auto max-w-4xl px-5 py-12 sm:px-8 lg:px-12" aria-labelledby="herramientas-faq-titulo">
            <h3 id="herramientas-faq-titulo" className="text-lg font-bold text-[#17232d]">Preguntas frecuentes</h3>
            <details className="py-3"><summary className="font-semibold text-sm text-[#263541]">¿Qué es AURUM LAB?</summary><p className="mt-2 text-sm leading-6 text-slate-700">AURUM LAB es un software de gestión para joyerías y talleres de joyería que reúne calculadoras técnicas, render 3D, clientes, cotizaciones, pedidos y catálogo digital.</p></details>
            <details className="py-3"><summary className="font-semibold text-sm text-[#263541]">¿Cómo calculo cuánto oro necesito para una pieza?</summary><p className="mt-2 text-sm leading-6 text-slate-700">Usa la calculadora de aleaciones de oro de AURUM LAB para calcular proporciones de oro fino y ligadura para 18K, 14K y 9K. El cálculo depende del peso final que ingreses.</p></details>
            <details className="py-3"><summary className="font-semibold text-sm text-[#263541]">¿AURUM RENDER funciona con Rhino 7 y Rhino 8?</summary><p className="mt-2 text-sm leading-6 text-slate-700">AURUM RENDER es el render 3D de joyería de AURUM LAB y cuenta con complementos AURUM CONNECT para Rhino 7 y Rhino 8.</p></details>
            <details className="py-3"><summary className="font-semibold text-sm text-[#263541]">¿Puedo probar las herramientas sin crear una cuenta?</summary><p className="mt-2 text-sm leading-6 text-slate-700">Sí. Las herramientas públicas de cálculo se pueden explorar sin registro desde <Link to="/herramientas-publicas" className="font-semibold text-[#705400] underline underline-offset-2">Herramientas públicas</Link>. Para funciones de gestión y Mi Nube necesitas ingresar a tu cuenta.</p></details>
          </section>


      <footer id="contacto" className="border-t border-[#8c7446] bg-[#17232d] text-slate-300">
        <div className="mx-auto max-w-[1440px] px-5 py-9 sm:px-8 sm:py-10 lg:px-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] lg:gap-12">
            <div>
              <Link to="/" className="inline-flex items-center gap-2.5 text-white" aria-label="AURUM LAB, inicio">
                <img
                  src="/brand/aurum-symbol.svg"
                  alt="Símbolo de AURUM LAB"
                  width="40"
                  height="40"
                  className="size-10 shrink-0 object-contain"
                  loading="lazy"
                />
                <span className="leading-tight">
                  <span className="block text-[17px] font-extrabold tracking-tight text-white">AURUM<span className="text-[#C5A36B]"> LAB</span></span>
                  <span className="block text-[9px] font-medium uppercase tracking-[.15em] text-slate-400">Tecnología para joyeros</span>
                </span>
              </Link>
              <p className="mt-3 max-w-xs text-xs leading-5 text-slate-300"><strong>Software para talleres de joyería</strong> con cálculo, diseño 3D y gestión comercial.</p>
              <a href="mailto:noreply@tallerdeljoyero.com" className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-white transition hover:text-[#f8c928]">noreply@tallerdeljoyero.com <ArrowRight className="size-3.5" /></a>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Plataforma</h2>
              <ul className="mt-3 space-y-3 text-xs">
                <li><Link to="/herramientas-publicas" className="transition hover:text-[#f8c928]">Herramientas para joyeros</Link></li>
                <li><Link to="/aurum-render-public" className="transition hover:text-[#f8c928]">Visor 3D</Link></li>
                <li><Link to="/auth" {...(esPCDeEscritorio() ? { target: "_blank" } : {})} rel="noreferrer" className="transition hover:text-[#f8c928]">Ingresar a AURUM LAB</Link></li>
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
      {videoDemoAurumAbierto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#05080c]/90 p-3 backdrop-blur-md sm:p-6" role="dialog" aria-modal="true" aria-labelledby="aurum-demo-video-title" onClick={(event) => { if (event.target === event.currentTarget) setVideoDemoAurumAbierto(false); }}>
          <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-[#d4aa19]/35 bg-[#101820] shadow-[0_30px_100px_rgba(0,0,0,.65)] sm:rounded-3xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[.22em] text-[#f3d66e]">DEMO · AURUM RENDER</p>
                <h2 id="aurum-demo-video-title" className="mt-1 truncate text-sm font-bold text-white sm:text-base">Visualización profesional de joyería en 3D</h2>
              </div>
              <button type="button" onClick={() => setVideoDemoAurumAbierto(false)} aria-label="Cerrar demostración" className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/15 text-white transition hover:border-[#f8c928] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f8c928]"><X className="size-5" /></button>
            </div>
            <video className="max-h-[72vh] w-full bg-black object-contain" src="/Galaxy-Tab-S7-tallerdeljoyero.com-dwn_j3tja-mr2y.webm" controls autoPlay muted playsInline preload="metadata" />
            <div className="border-t border-white/10 bg-[#101820] px-4 py-5 sm:px-6 sm:py-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm font-semibold text-white">¿Quieres probar AURUM RENDER con tus propios diseños?</p><p className="mt-1 text-xs leading-5 text-slate-300">Regístrate gratis en AURUM LAB y comienza a explorar desde el plan gratuito.</p></div><Link to="/auth" onClick={() => setVideoDemoAurumAbierto(false)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#f8c928] px-5 py-3 text-sm font-extrabold text-[#17232d] transition hover:bg-[#ffe071] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Crear cuenta gratuita <ArrowRight className="size-4" /></Link></div></div>
          </div>
        </div>
      )}
          <AuriPublicoBoton />
</main>
  );
}
