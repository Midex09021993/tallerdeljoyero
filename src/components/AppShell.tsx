import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  ClipboardList,
  Gauge,
  Landmark,
  CalendarDays,
  LayoutDashboard,
  LayoutGrid,
  PackageCheck,
  Scissors,
  UserRound,
  ExternalLink,
  Users,
  Gem,
  FileSpreadsheet,
  FileText,
  Wrench,
  BookOpen,
  GraduationCap,
  ShoppingBag,
  Cloud,
  BrainCircuit,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { areaCoincide, rolEtiqueta, useCerrarSesion, useSesion, type Rol } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { TODAS_LAS_SEDES, useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
import { AlertaAutorizacionProduccion } from "@/components/AlertaAutorizacionProduccion";
import { AuriInternoBoton } from "@/components/auri/AuriInternoBoton";
import { puedeAccederAurumIntelligence } from "@/lib/aurum-intelligence-access";

type Seccion = {
  to:
    | "/inicio"
    | "/pedidos"
    | "/cotizaciones"
    | "/contratos"
    | "/diseno-3d"
    | "/impresion-3d"
    | "/casting"
    | "/corte-laser"
    | "/taller"
    | "/ventas"
    | "/clientes"
    | "/inventario"
    | "/compras"
    | "/gestion"
    | "/monitor"
    | "/operario"
    | "/perfil"
    | "/mensajes"
    | "/agenda"
    | "/aurum-render"
    | "/aurum-intelligence"
    | "/herramientas"
    | "/mi-nube"
    | "/migracion"
    | "/catalogo"
    | "/cursos-formacion"
    | "/aula-formacion"
    | "/servicios-externos"
    | "/tienda-admin"
    | "/afiliados";
  label: string;
  area?: string;
  roles?: Rol[];
  icono?: typeof LayoutGrid;
  grupo?: "principal" | "comercial" | "produccion" | "inventario" | "aurum" | "herramientas" | "aprendizaje" | "administracion";
};

type AtrasMovil = false | { to?: string; onClick?: () => void };

const secciones: Seccion[] = [
  { to: "/inicio", label: "Inicio", roles: ["dueno", "gerente"], icono: LayoutDashboard, grupo: "principal" },
  { to: "/agenda", label: "Agenda", roles: ["dueno", "gerente"], icono: CalendarDays, grupo: "principal" },
  { to: "/operario", label: "Mi trabajo", roles: ["operario"], icono: LayoutDashboard, grupo: "principal" },
  { to: "/pedidos", label: "Pedidos", area: "Pedidos", icono: ClipboardList, grupo: "comercial" },
  { to: "/cotizaciones", label: "Cotizaciones", icono: ClipboardList, grupo: "comercial" },
  { to: "/contratos", label: "Contratos", icono: FileText, grupo: "comercial" },
  { to: "/clientes", label: "Clientes", icono: Users, grupo: "comercial" },
  { to: "/diseno-3d", label: "Diseño 3D", area: "Diseño 3D", icono: LayoutGrid, grupo: "produccion" },
  { to: "/aurum-render", label: "AURUM RENDER", icono: Gem, grupo: "aurum" },
  { to: "/aurum-intelligence", label: "AURUM INTELLIGENCE", roles: ["dueno"], icono: BrainCircuit, grupo: "aurum" },
  { to: "/impresion-3d", label: "Impresión 3D", area: "Impresión 3D", icono: Boxes, grupo: "produccion" },
  { to: "/casting", label: "Casting", area: "Casting", icono: Landmark, grupo: "produccion" },
  { to: "/corte-laser", label: "Corte Láser", area: "Corte Láser", icono: Scissors, grupo: "produccion" },
  { to: "/servicios-externos", label: "Servicios externos", icono: ExternalLink, grupo: "produccion" },
  { to: "/ventas", label: "Ventas", area: "Área ventas", icono: PackageCheck, grupo: "comercial" },
  { to: "/inventario", label: "Inventario", area: "Taller", icono: Gauge, grupo: "inventario" },
  { to: "/compras", label: "Compras", roles: ["dueno", "gerente"], icono: Boxes, grupo: "inventario" },
  { to: "/herramientas", label: "Herramientas", area: "Taller", icono: Wrench, grupo: "herramientas" },
  { to: "/mi-nube", label: "Mi nube", icono: Cloud, grupo: "herramientas" },
  { to: "/monitor", label: "Monitor de taller", roles: ["monitor"], grupo: "principal" },
  { to: "/gestion", label: "Gestión", roles: ["dueno", "gerente"], icono: LayoutDashboard, grupo: "administracion" },
  { to: "/migracion", label: "Migración", roles: ["dueno", "gerente"], icono: FileSpreadsheet, grupo: "administracion" },
  { to: "/catalogo", label: "Catálogo", icono: BookOpen, grupo: "comercial" },
  { to: "/cursos-formacion", label: "Cursos y formación", area: "Cursos y formación", icono: BookOpen, grupo: "aprendizaje" },
  { to: "/aula-formacion", label: "Aula de formación", roles: ["dueno", "gerente", "operario"], icono: GraduationCap, grupo: "aprendizaje" },
  { to: "/tienda-admin", label: "Tienda FADILAB", roles: ["dueno", "gerente"], icono: ShoppingBag, grupo: "administracion" },
  { to: "/afiliados", label: "Afiliados", icono: Users, grupo: "administracion" },
  { to: "/perfil", label: "Perfil", roles: ["operario"], icono: UserRound, grupo: "administracion" },
];

export const modulosAdminMovil = secciones.filter(
  (s) => !["/inicio", "/monitor", "/operario", "/perfil"].includes(s.to),
);

const CAPACIDADES_MENU = [
  "Diseño 3D",
  "Impresión 3D",
  "Casting",
  "Corte Láser",
  "Taller",
] as const;

const CAPACIDADES_COMERCIALES_MENU: Record<string, string> = {
  "/pedidos": "Pedidos",
  "/cotizaciones": "Cotizaciones",
  "/contratos": "Contratos",
  "/clientes": "Clientes",
  "/ventas": "Ventas",
  "/catalogo": "Catálogo",
  "/cursos-formacion": "Cursos y formación",
};

const CAPACIDADES_SISTEMA_MENU: Record<string, string> = {
  "/inventario": "Inventario",
  "/compras": "Compras",
  "/herramientas": "Herramientas",
  "/mi-nube": "Mi nube",
  "/migracion": "Migración",
};

export function useCapacidadesMenu(sesion: ReturnType<typeof useSesion>["data"]) {
  const { esDueno, sedeFiltro } = useSedeFiltroDueno();

  return useQuery({
    queryKey: ["menu-capacidades", esDueno, sedeFiltro, sesion?.sede?.id, sesion?.perfil.sede_id],
    staleTime: 60_000,
    enabled: Boolean(sesion?.esAdmin),
    queryFn: async () => {
      // El menú debe seguir la misma sede que configura Gestión.
      // En "Todas las sedes", el dueño conserva como contexto base su sede de perfil;
      // no mezclamos capacidades de otras sedes, porque una opción desactivada aquí
      // podría reaparecer por estar activa en otra sede.
      const sedeObjetivo = esDueno
        ? (sedeFiltro !== TODAS_LAS_SEDES ? sedeFiltro : sesion?.perfil.sede_id ?? null)
        : sesion?.sede?.id ?? null;

      // Consulta solo las capacidades de la sede que corresponde al contexto del menú.
      const consulta = supabase
        .from("sede_especialidades")
        .select("sede_id, especialidades!inner(nombre)");
      const { data, error } = sedeObjetivo
        ? await consulta.eq("sede_id", sedeObjetivo)
        : await consulta;
      if (error) throw error;

      const filas = (data ?? []) as Array<{
        sede_id: string;
        especialidades: { nombre: string } | { nombre: string }[] | null;
      }>;

      const nombres = filas
        .flatMap((fila) => {
          if (!fila.especialidades) return [];
          return Array.isArray(fila.especialidades)
            ? fila.especialidades.map((e) => e.nombre)
            : [fila.especialidades.nombre];
        });

      return [...new Set(nombres)];
    },
  });
}

export function useModalidadesMenu(sesion: ReturnType<typeof useSesion>["data"]) {
  const { esDueno, sedeFiltro } = useSedeFiltroDueno();

  return useQuery({
    queryKey: ["menu-modalidades", esDueno, sedeFiltro, sesion?.sede?.id],
    staleTime: 60_000,
    enabled: Boolean(sesion?.esAdmin || sesion?.sede?.id),
    queryFn: async () => {
      const sedeObjetivo = esDueno && sedeFiltro !== TODAS_LAS_SEDES
        ? sedeFiltro
        : !esDueno
          ? sesion?.sede?.id ?? null
          : null;

      // Filtra en Supabase para una sede concreta; la vista global del dueño conserva todas.
      const consulta = supabase
        .from("sede_modalidades")
        .select("sede_id,produccion_activa,servicios_externos_activos");
      const { data, error } = sedeObjetivo
        ? await consulta.eq("sede_id", sedeObjetivo)
        : await consulta;
      if (error) throw error;

      const filas = data ?? [];

      return {
        produccionActiva: filas.some((fila) => fila.produccion_activa),
        serviciosExternosActivos: filas.some((fila) => fila.servicios_externos_activos),
      };
    },
  });
}

function seccionesVisibles(
  roles: Rol[] | undefined,
  esAdmin: boolean | undefined,
  capacidades: string[] | undefined,
  modalidades:
    | {
        produccionActiva: boolean;
        serviciosExternosActivos: boolean;
      }
    | undefined,
): Seccion[] {
  if (!roles) return [];
  if (roles.includes("monitor")) return secciones.filter((s) => s.to === "/monitor");
  // El monitor no es un área: solo es visible para usuarios con rol "monitor".
  if (esAdmin) {
    if (!capacidades) return secciones.filter((s) => !["/monitor", "/operario", "/perfil"].includes(s.to));
    const habilitadas = new Set(capacidades);
    return secciones.filter((s) => {
      if (["/monitor", "/operario", "/perfil"].includes(s.to)) return false;
      if (s.to === "/servicios-externos") return Boolean(modalidades?.serviciosExternosActivos);
      if (s.grupo === "produccion") {
        if (!modalidades?.produccionActiva) return false;
      }
      // Catálogo es una capacidad comercial configurable de la sede.
      // Si está desactivado en Gestión, no aparece en el menú.
      const capacidadComercial = CAPACIDADES_COMERCIALES_MENU[s.to];
      if (capacidadComercial) return habilitadas.has(capacidadComercial);
      const capacidadSistema = CAPACIDADES_SISTEMA_MENU[s.to];
      if (capacidadSistema) return habilitadas.has(capacidadSistema);
      // Gestión siempre permanece visible porque es el lugar desde donde
      // el dueño/gerente puede volver a configurar las capacidades del taller.
      if (s.to === "/gestion") return true;
      if (s.grupo !== "produccion") return true;
      if (!s.area || !CAPACIDADES_MENU.some((area) => areaCoincide(area, s.area))) return true;
      return habilitadas.has(CAPACIDADES_MENU.find((area) => areaCoincide(area, s.area)) ?? "");
    });
  }
  // El operario usa una única bandeja: /operario.
  // Las áreas se consultan dentro de cada trabajo; no deben convertirse en
  // navegación adicional. Herramientas y Perfil quedan como acciones secundarias
  // dentro de su experiencia de trabajo.
  const inicio = secciones.filter(
    (s) =>
      s.to === "/operario" ||
      s.to === "/agenda" ||
      s.to === "/afiliados" ||
      (s.to === "/aula-formacion" && (roles.includes("gerente") || roles.includes("operario") || roles.includes("dueno"))) ||
      (s.to === "/servicios-externos" && Boolean(modalidades?.serviciosExternosActivos)),
  );
  const perfil = secciones.filter((s) => s.to === "/perfil");
  return [...inicio, ...perfil];
}

// Orden visual del menú. Solo cambia la presentación; no cambia rutas, permisos ni lógica.
const ORDEN_MENU: Record<string, number> = {
  // El orden visual no implica dependencia: Pedidos puede operar sin Cotizaciones.
  "/inicio": 0,
  "/clientes": 5,
  "/catalogo": 35,
  "/cursos-formacion": 36,
  "/cotizaciones": 10,
  "/contratos": 15,
  "/pedidos": 20,
  "/ventas": 30,
  "/inventario": 40,
  "/compras": 45,
  "/gestion": 50,
  "/migracion": 55,
  "/mi-nube": 48,
  "/aurum-intelligence": 998,
  "/aurum-render": 999,
};

function ordenarMenu(items: Seccion[]): Seccion[] {
  return [...items].sort((a, b) => (ORDEN_MENU[a.to] ?? 50) - (ORDEN_MENU[b.to] ?? 50));
}

export function AppShell({
  titulo,
  subtitulo,
  acciones,
  atrasMovil = { to: "/inicio" },
  ocultarNavegacion = false,
  modoAulaExpandida = false,
  ocultarEncabezado = false,
  encabezadoMovilCompacto = false,
  ocultarAccionesCelular = false,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  acciones?: ReactNode;
  atrasMovil?: AtrasMovil;
  encabezadoMovilCompacto?: boolean;
  ocultarAccionesCelular?: boolean;
  ocultarNavegacion?: boolean;
  modoAulaExpandida?: boolean;
  ocultarEncabezado?: boolean;
  children: ReactNode;
}) {
  const { data: sesion } = useSesion();
  const cerrarSesion = useCerrarSesion();
  const { data: capacidadesMenu, isSuccess: capacidadesCargadas, isError: capacidadesError, isLoading: capacidadesLoading } = useCapacidadesMenu(sesion);
  const { data: modalidadesMenu, isSuccess: modalidadesCargadas, isError: modalidadesError, isLoading: modalidadesLoading } = useModalidadesMenu(sesion);
  const { esDueno, sedeFiltro } = useSedeFiltroDueno();
  const alcanceGlobalDueno = Boolean(esDueno && sedeFiltro === TODAS_LAS_SEDES);
  const visibles = seccionesVisibles(
    sesion?.roles,
    sesion?.esAdmin,
    capacidadesCargadas ? capacidadesMenu : undefined,
    modalidadesCargadas ? modalidadesMenu : undefined,
  );
  const visiblesOrdenadas = ordenarMenu(
    visibles.filter((s) => {
      if (s.to === "/aurum-intelligence" && !puedeAccederAurumIntelligence(sesion?.user.id)) return false;
      if (s.to === "/tienda-admin" && !/fadilab/i.test(sesion?.participante?.nombre ?? "")) return false;
      return true;
    }),
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const nombrePersonal = [sesion?.perfil.nombre, sesion?.perfil.apellidos]
    .map((valor) => valor?.trim())
    .filter(Boolean)
    .join(" ");
  // Las cuentas internas pueden usar usuario@taller.local como credencial técnica.
  // Nunca lo mostramos como identidad visual: si falta el nombre personal,
  // mostramos el taller/participante asociado y mantenemos el rol debajo.
  const nombreVisible =
    nombrePersonal ||
    sesion?.participante?.nombre?.trim() ||
    (sesion?.perfil.usuario?.trim() && !sesion.perfil.usuario.trim().includes("@taller.local")
      ? sesion.perfil.usuario.trim()
      : "") ||
    "Usuario";
  const tallerVisible = sesion?.participante?.nombre?.trim() || sesion?.sede?.nombre?.trim() || "";
  const inicial = nombreVisible.charAt(0).toUpperCase();
  const mostrarAtrasMovil = atrasMovil !== false;
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const seccionActual = [...visiblesOrdenadas].sort((a, b) => b.to.length - a.to.length).find((s) => pathname === s.to || pathname.startsWith(`${s.to}/`));
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);
  const esRutaProduccion = [
    "/diseno-3d",
    "/impresion-3d",
    "/casting",
    "/corte-laser",
    "/taller",
  ].includes(pathname);
  const esRutaServiciosExternos = pathname === "/servicios-externos";
  const capacidadesPorRuta: Record<string, string> = {
    "/clientes": "Clientes", "/cotizaciones": "Cotizaciones", "/contratos": "Contratos",
    "/pedidos": "Pedidos", "/ventas": "Ventas", "/catalogo": "Catálogo",
    "/cursos-formacion": "Cursos y formación",
    "/inventario": "Inventario", "/compras": "Compras", "/herramientas": "Herramientas",
    "/mi-nube": "Mi nube", "/diseno-3d": "Diseño 3D", "/impresion-3d": "Impresión 3D",
    "/casting": "Casting", "/corte-laser": "Corte Láser", "/taller": "Taller",
  };
  const rutaCapacidad = Object.keys(capacidadesPorRuta).find(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  );
  const capacidadRequerida = rutaCapacidad ? capacidadesPorRuta[rutaCapacidad] : null;
  const requiereModalidad = esRutaProduccion || esRutaServiciosExternos;
  const verificacionBloqueada = Boolean(
    sesion?.esAdmin && !alcanceGlobalDueno && (
      (capacidadRequerida && (capacidadesLoading || capacidadesError)) ||
      (requiereModalidad && (modalidadesLoading || modalidadesError))
    ),
  );
  const capacidadBloqueada = Boolean(
    sesion?.esAdmin && !alcanceGlobalDueno && capacidadesCargadas && capacidadRequerida &&
    !capacidadesMenu?.includes(capacidadRequerida),
  );
  const modalidadBloqueada = Boolean(
    sesion?.esAdmin && !alcanceGlobalDueno && modalidadesCargadas && (
      (esRutaProduccion && !modalidadesMenu?.produccionActiva) ||
      (esRutaServiciosExternos && !modalidadesMenu?.serviciosExternosActivos)
    ),
  );


  return (
    <div className={`flex min-h-screen bg-background text-foreground transition-[height] duration-300 ${!modoAulaExpandida && !pathname.startsWith("/aula-formacion") && !pathname.startsWith("/aula-comandos") && !pathname.startsWith("/aurum-render") ? "aurum-erp-theme" : ""} ${modoAulaExpandida ? "h-[100dvh] min-h-0 overflow-hidden" : ""}`}>
      {sesion?.esAdmin ? <AlertaAutorizacionProduccion /> : null}
      {!ocultarNavegacion ? (
        <aside aria-hidden={modoAulaExpandida} className={`sticky top-0 hidden h-screen max-h-screen shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#182838] text-[#F5F1E8] shadow-[10px_0_30px_-22px_rgba(18,32,46,.42)] transition-[width,opacity,transform] duration-300 ease-in-out lg:flex ${modoAulaExpandida ? "pointer-events-none w-0 -translate-x-4 border-r-0 opacity-0 xl:w-0" : "w-64 xl:w-72"}`}>
          <div className="border-b border-white/10 bg-gradient-to-br from-[#293B4A] to-[#182838] px-6 py-7 xl:px-7">
            <p className="font-display text-2xl italic text-[#C5A36B]">Aurum Lab</p>
            <p className="mt-1 truncate text-[10px] uppercase tracking-[0.2em] text-[#B8C2CC]">
              {sesion?.participante?.nombre ?? sesion?.sede?.nombre ?? ""}
            </p>
          </div>

          <div className="relative min-h-0 flex-1">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-[#182838] via-[#182838]/90 to-transparent" aria-hidden="true" />
            <nav className="scrollbar-hidden h-full space-y-1 overflow-y-auto px-4 pb-8">
            {(["principal", "comercial", "produccion", "inventario", "aurum", "herramientas", "aprendizaje", "administracion"] as const).map((grupo) => {
              const items = visiblesOrdenadas.filter((s) => s.grupo === grupo);
              if (items.length === 0) return null;
              const nombres = {
                principal: "Principal",
                comercial: "Comercial",
                produccion: "Producción",
                inventario: "Inventario",
                aurum: "AURUM Studio",
                herramientas: "Herramientas",
                aprendizaje: "Aprendizaje",
                administracion: "Administración",
              } as const;
              return (
                <div key={grupo} className="pt-2 first:pt-0">
                  <p className="px-4 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B8C2CC]">{nombres[grupo]}</p>
                  <div className="space-y-1">
                    {items.map((s) => {
                      const Icon = s.icono;
                      const activo = pathname === s.to;
                      const clases = `flex min-h-11 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 xl:px-4 ${
                        activo
                          ? "border-[#C5A36B]/45 bg-[#C5A36B]/15 text-[#F5E5C4] shadow-[inset_3px_0_0_0_#C5A36B]"
                          : "border-transparent text-[#E0E5E9] hover:border-white/10 hover:bg-white/[0.07] hover:text-white"
                      }`;
                      if (s.to === "/herramientas") {
                        return (
                          <a key={s.to} href={s.to} className={clases} aria-current={activo ? "page" : undefined}>
                            {Icon ? <Icon className="size-4 shrink-0 opacity-70" /> : null}
                            {s.label}
                          </a>
                        );
                      }
                      return (
                        <Link
                          key={s.to}
                          to={s.to}
                          activeOptions={{ exact: true }}
                          className={clases}
                          activeProps={{ className: "border-[#C5A36B]/45 bg-[#C5A36B]/15 text-[#F5E5C4] shadow-[inset_3px_0_0_0_#C5A36B]" }}
                        >
                          {Icon ? <Icon className="size-4 shrink-0 opacity-70" /> : null}
                          {s.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            </nav>
          </div>

          <div className="shrink-0 border-t border-white/10 bg-[#142331] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-full border border-[#C5A36B]/35 bg-[#C5A36B]/10 font-display italic text-[#E8CC9A]">
                {inicial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[#F5F1E8]">{nombreVisible}</p>
                <p className="truncate text-[10px] text-[#B8C2CC]">
                  {sesion ? rolEtiqueta[sesion.rolPrincipal] : ""}
                  {tallerVisible && nombrePersonal ? ` · ${tallerVisible}` : ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void cerrarSesion()}
              className="w-full rounded-lg border border-white/15 bg-white/[0.03] py-2 text-[10px] uppercase tracking-wider text-[#E0E5E9] transition-colors hover:border-[#C5A36B]/45 hover:bg-white/[0.07] hover:text-white"
            >
              Cerrar sesión
            </button>
          </div>
        </aside>
      ) : null}

      <main
        className={`min-w-0 flex-1 overflow-y-auto px-3 py-4 pb-8 sm:px-5 lg:p-8 xl:p-10 ${modoAulaExpandida ? "min-h-0 !overflow-hidden !p-0" : ""} ${
          encabezadoMovilCompacto ? "max-lg:px-3 max-lg:pt-0 max-lg:pb-5" : ""
        }`}
      >
        {!ocultarEncabezado && <header
          className={`${modoAulaExpandida ? "hidden" : ""} mb-4 flex flex-wrap items-end justify-between gap-3 lg:mb-8 lg:gap-4 ${
            encabezadoMovilCompacto
              ? "max-lg:sticky max-lg:top-0 max-lg:z-30 max-lg:-mx-3 max-lg:mb-2 max-lg:justify-end max-lg:bg-background/95 max-lg:px-3 max-lg:py-2 max-lg:backdrop-blur"
              : ""
          } ${atrasMovil === false && !acciones ? "max-lg:hidden" : ""}`}
        >
          <div className="flex w-full items-start justify-between gap-2 lg:w-auto lg:flex-nowrap lg:justify-between lg:gap-3">
            <div
              className={`min-w-0 max-lg:flex-1 ${encabezadoMovilCompacto ? "max-lg:hidden" : ""}`}
            >
              <h1 className="mb-1 truncate font-display text-2xl leading-tight tracking-tight sm:text-3xl lg:mb-2 max-lg:hidden">
                {titulo}
              </h1>
              {subtitulo ? (
                <p className="hidden text-sm text-muted-foreground lg:block">{subtitulo}</p>
              ) : null}
            </div>
            {mostrarAtrasMovil ? (
              <MobileBackButton atrasMovil={atrasMovil} className="max-lg:ml-auto" />
            ) : null}
          </div>
          {acciones ? (
            <div
              className={`flex w-full flex-wrap items-center gap-2 pb-1 lg:w-auto lg:gap-4 ${
                encabezadoMovilCompacto ? "max-lg:hidden" : ""
              } ${ocultarAccionesCelular ? "max-sm:hidden" : ""}`}
            >
              {acciones}
            </div>
          ) : null}
        </header>}

        {!ocultarNavegacion && !modoAulaExpandida && Boolean(sesion?.roles?.length) ? (
          <nav className={`sticky top-0 z-20 mb-4 border-y border-border bg-background/95 py-3 backdrop-blur lg:hidden ${encabezadoMovilCompacto ? "max-lg:-mx-3 max-lg:px-3" : "-mx-4 px-4"}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-full border border-gold/25 bg-gold/10 font-semibold text-gold-deep">
                  {inicial}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{nombreVisible}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {sesion ? rolEtiqueta[sesion.rolPrincipal] : ""}
                    {tallerVisible && nombrePersonal ? ` · ${tallerVisible}` : ""}
                  </p>
                  {seccionActual ? <p className="mt-0.5 truncate text-[10px] font-semibold text-gold-deep">{seccionActual.label}</p> : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((open) => !open)}
                  className="inline-flex size-11 items-center justify-center rounded-xl border border-border bg-card p-0 shadow-card"
                  aria-expanded={mobileMenuOpen}
                  aria-controls="navegacion-movil-modulos"
                  aria-label={mobileMenuOpen ? "Cerrar menú de módulos" : "Abrir menú de módulos"}
                >
                  {mobileMenuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {mobileMenuOpen ? (
              <div id="navegacion-movil-modulos" className="mt-3 max-h-[65dvh] overflow-y-auto rounded-2xl border border-border bg-card p-3 shadow-raised">
                {(["principal", "comercial", "produccion", "inventario", "aurum", "herramientas", "administracion"] as const).map((grupo) => {
                  const items = visiblesOrdenadas.filter((s) => s.grupo === grupo);
                  if (items.length === 0) return null;
                  const nombres = {
                    principal: "Principal",
                    comercial: "Comercial",
                    produccion: "Producción",
                    inventario: "Inventario",
                    aurum: "AURUM Studio",
                    herramientas: "Herramientas",
                    administracion: "Administración",
                  } as const;
                  return (
                    <section key={grupo} className="mb-3 last:mb-0">
                      <h2 className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{nombres[grupo]}</h2>
                      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {items.map((s) => {
                          const Icon = s.icono;
                          return (
                            <Link
                              key={s.to}
                              to={s.to}
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              activeProps={{ className: "bg-gold/10 text-gold-deep font-semibold" }}
                            >
                              {Icon ? <Icon className="size-4 shrink-0" aria-hidden="true" /> : null}
                              <span className="min-w-0">{s.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
                <div className="mt-4 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => void cerrarSesion()}
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    <LogOut className="size-4 shrink-0" aria-hidden="true" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            ) : null}
          </nav>
        ) : null}

        {verificacionBloqueada ? (
          <Panel titulo={capacidadesError || modalidadesError ? "No se pudo verificar el acceso" : "Verificando acceso"}>
            <div className="p-6">
              <p className="text-sm text-muted-foreground">
                {capacidadesError || modalidadesError
                  ? "No se pudo comprobar la configuración de este taller. Por seguridad, el módulo permanece bloqueado. Inténtalo de nuevo o vuelve a Gestión."
                  : "Estamos comprobando las capacidades y modalidades de este taller. Espera un momento antes de continuar."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    window.location.reload();
                  }}
                  className="rounded-lg border border-border px-4 py-2.5 text-xs font-semibold"
                >
                  Reintentar
                </button>
                <Link to="/gestion" className="inline-flex rounded-lg bg-gold px-4 py-2.5 text-xs font-semibold text-black">
                  Ir a Gestión
                </Link>
              </div>
            </div>
          </Panel>
        ) : capacidadBloqueada ? (
          <Panel titulo="Módulo desactivado">
            <div className="p-6">
              <p className="text-sm text-muted-foreground">
                Este módulo no está habilitado para la configuración actual de este taller.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                El dueño o gerente puede revisar las capacidades desde Gestión → Capacidades del taller.
              </p>
              <Link to="/gestion" className="mt-4 inline-flex rounded-lg bg-gold px-4 py-2.5 text-xs font-semibold text-black">
                Ir a Gestión
              </Link>
            </div>
          </Panel>
        ) : modalidadBloqueada ? (
          <Panel titulo="Modalidad desactivada">
            <div className="p-6">
              <p className="text-sm text-muted-foreground">
                Esta modalidad no está activa para este taller.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                El dueño o gerente puede activarla desde Gestión → Capacidades del taller.
              </p>
              <Link
                to="/gestion"
                className="mt-4 inline-flex rounded-lg bg-gold px-4 py-2.5 text-xs font-semibold text-black"
              >
                Ir a Gestión
              </Link>
            </div>
          </Panel>
        ) : children}
      </main>
      {sesion && !pathname.startsWith("/aurum-render") ? <AuriInternoBoton /> : null}
    </div>
  );
}

export function MobileBackButton({
  atrasMovil = { to: "/inicio" },
  className = "",
}: {
  atrasMovil?: AtrasMovil;
  className?: string;
}) {
  const navigate = useNavigate();

  const volver = () => {
    if (atrasMovil && typeof atrasMovil === "object" && atrasMovil.onClick) {
      atrasMovil.onClick();
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    const destino =
      atrasMovil && typeof atrasMovil === "object" && atrasMovil.to ? atrasMovil.to : "/inicio";
    void navigate({ to: destino as never });
  };

  return (
    <button
      type="button"
      onClick={volver}
      className={`inline-flex shrink-0 items-center rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground shadow-card transition hover:text-foreground active:scale-[0.98] lg:hidden ${className}`}
      aria-label="Atrás"
    >
      ← Atrás
    </button>
  );
}

export function StatCard({
  etiqueta,
  valor,
  delta,
  tono = "neutro",
}: {
  etiqueta: string;
  valor: string;
  delta?: string;
  tono?: "neutro" | "positivo" | "negativo";
}) {
  const tonoClase =
    tono === "positivo"
      ? "text-success"
      : tono === "negativo"
        ? "text-danger"
        : "text-muted-foreground";
  return (
    <div className="min-w-[104px] rounded-xl border border-border bg-card p-2.5 shadow-card lg:min-w-[140px] lg:p-4">
      <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{etiqueta}</p>
      <p className="text-base font-medium lg:text-xl">
        {valor} {delta ? <span className={`text-xs font-normal ${tonoClase}`}>{delta}</span> : null}
      </p>
    </div>
  );
}

export function Panel({
  titulo,
  accion,
  children,
  className = "",
  colapsable = false,
  defaultOpen = true,
}: {
  titulo: string;
  accion?: ReactNode;
  children: ReactNode;
  className?: string;
  colapsable?: boolean;
  defaultOpen?: boolean;
}) {
  if (colapsable) {
    return (
      <details open={defaultOpen} className={`overflow-hidden rounded-xl border border-border bg-card shadow-card lg:rounded-2xl ${className}`}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:hidden hover:bg-muted/40 lg:px-6 lg:py-4 [&::-webkit-details-marker]:hidden">
          <span className="text-sm font-medium text-foreground">{titulo}</span>
          <span aria-hidden="true" className="text-muted-foreground transition-transform [[open]>&]:rotate-180">⌄</span>
        </summary>
        <div className="border-t border-border">{children}</div>
      </details>
    );
  }
  return (
    <section className={`overflow-hidden rounded-xl border border-border bg-card shadow-card lg:rounded-2xl ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 lg:px-6 lg:py-4">
        <h2 className="text-sm font-medium text-foreground">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  );
}
