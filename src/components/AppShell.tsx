import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  ClipboardList,
  Gauge,
  Hammer,
  Landmark,
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
  ShoppingBag,
  Cloud,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { areaCoincide, rolEtiqueta, useCerrarSesion, useSesion, type Rol } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { TODAS_LAS_SEDES, useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
import { AlertaAutorizacionProduccion } from "@/components/AlertaAutorizacionProduccion";
import { ResumenPlanComercial } from "@/components/ResumenPlanComercial";

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
    | "/aurum-render"
    | "/herramientas"
    | "/mi-nube"
    | "/migracion"
    | "/catalogo"
    | "/servicios-externos"
    | "/tienda-admin";
  label: string;
  area?: string;
  roles?: Rol[];
  icono?: typeof LayoutGrid;
  grupo?: "principal" | "comercial" | "produccion" | "inventario" | "aurum" | "herramientas" | "administracion";
};

type AtrasMovil = false | { to?: string; onClick?: () => void };

const secciones: Seccion[] = [
  { to: "/inicio", label: "Inicio", roles: ["dueno", "gerente"], icono: LayoutDashboard, grupo: "principal" },
  { to: "/operario", label: "Mi trabajo", roles: ["operario"], icono: LayoutDashboard, grupo: "principal" },
  { to: "/pedidos", label: "Pedidos", area: "Pedidos", icono: ClipboardList, grupo: "comercial" },
  { to: "/cotizaciones", label: "Cotizaciones", icono: ClipboardList, grupo: "comercial" },
  { to: "/contratos", label: "Contratos", icono: FileText, grupo: "comercial" },
  { to: "/clientes", label: "Clientes", icono: Users, grupo: "comercial" },
  { to: "/diseno-3d", label: "Diseño 3D", area: "Diseño 3D", icono: LayoutGrid, grupo: "produccion" },
  { to: "/aurum-render", label: "AURUM RENDER", area: "Diseño 3D", icono: Gem, grupo: "aurum" },
  { to: "/impresion-3d", label: "Impresión 3D", area: "Impresión 3D", icono: Boxes, grupo: "produccion" },
  { to: "/casting", label: "Casting", area: "Casting", icono: Landmark, grupo: "produccion" },
  { to: "/corte-laser", label: "Corte Láser", area: "Corte Láser", icono: Scissors, grupo: "produccion" },
  { to: "/taller", label: "Taller", area: "Taller", icono: Hammer, grupo: "produccion" },
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
  { to: "/tienda-admin", label: "Tienda FADILAB", roles: ["dueno", "gerente"], icono: ShoppingBag, grupo: "administracion" },
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
    queryKey: ["menu-capacidades", esDueno, sedeFiltro, sesion?.sede?.id],
    enabled: Boolean(sesion?.esAdmin),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sede_especialidades")
        .select("sede_id, especialidades!inner(nombre)");
      if (error) throw error;

      const filas = (data ?? []) as Array<{
        sede_id: string;
        especialidades: { nombre: string } | { nombre: string }[] | null;
      }>;

      const sedeObjetivo = esDueno && sedeFiltro !== TODAS_LAS_SEDES
        ? sedeFiltro
        : !esDueno
          ? sesion?.sede?.id ?? null
          : null;

      const nombres = filas
        .filter((fila) => !sedeObjetivo || fila.sede_id === sedeObjetivo)
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
    enabled: Boolean(sesion?.esAdmin || sesion?.sede?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sede_modalidades")
        .select("sede_id,produccion_activa,servicios_externos_activos");
      if (error) throw error;

      const sedeObjetivo = esDueno && sedeFiltro !== TODAS_LAS_SEDES
        ? sedeFiltro
        : !esDueno
          ? sesion?.sede?.id ?? null
          : null;

      const filas = (data ?? []).filter(
        (fila) => !sedeObjetivo || fila.sede_id === sedeObjetivo,
      );

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
      if (s.grupo === "produccion" || s.to === "/aurum-render") {
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
      if (s.grupo !== "produccion" && s.to !== "/aurum-render") return true;
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
  "/cotizaciones": 10,
  "/contratos": 15,
  "/pedidos": 20,
  "/ventas": 30,
  "/inventario": 40,
  "/compras": 45,
  "/gestion": 50,
  "/migracion": 55,
  "/mi-nube": 48,
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
    visibles.filter((s) => s.to !== "/tienda-admin" || /fadilab/i.test(sesion?.participante?.nombre ?? "")),
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
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);
  const esRutaProduccion = [
    "/diseno-3d",
    "/impresion-3d",
    "/casting",
    "/corte-laser",
    "/taller",
    "/aurum-render",
  ].includes(pathname);
  const esRutaServiciosExternos = pathname === "/servicios-externos";
  const capacidadesPorRuta: Record<string, string> = {
    "/clientes": "Clientes", "/cotizaciones": "Cotizaciones", "/contratos": "Contratos",
    "/pedidos": "Pedidos", "/ventas": "Ventas", "/catalogo": "Catálogo",
    "/inventario": "Inventario", "/compras": "Compras", "/herramientas": "Herramientas",
    "/mi-nube": "Mi nube", "/diseno-3d": "Diseño 3D", "/impresion-3d": "Impresión 3D",
    "/casting": "Casting", "/corte-laser": "Corte Láser", "/taller": "Taller",
    "/aurum-render": "Diseño 3D",
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
    <div className="flex min-h-screen bg-background text-foreground">
      {sesion?.esAdmin ? <AlertaAutorizacionProduccion /> : null}
      {!ocultarNavegacion ? (
        <aside className="sticky top-0 hidden h-screen max-h-screen w-64 shrink-0 flex-col overflow-hidden bg-ink text-ink-foreground lg:flex">
          <div className="p-8">
            <p className="font-display text-2xl italic text-gold">Aurum Lab</p>
            <p className="mt-1 truncate text-[10px] uppercase tracking-[0.2em] text-ink-foreground/40">
              {sesion?.participante?.nombre ?? sesion?.sede?.nombre ?? ""}
            </p>
          </div>

          <div className="relative min-h-0 flex-1">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-ink via-ink/85 to-transparent" aria-hidden="true" />
            <nav className="scrollbar-hidden h-full space-y-1 overflow-y-auto px-4 pb-8">
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
                <div key={grupo} className="pt-2 first:pt-0">
                  <p className="px-4 pb-2 pt-2 text-[9px] font-bold uppercase tracking-[0.2em] text-ink-foreground/30">{nombres[grupo]}</p>
                  <div className="space-y-1">
                    {items.map((s) => {
                      const Icon = s.icono;
                      return (
                        <Link key={s.to} to={s.to}
                          className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-ink-foreground/60 transition-colors hover:bg-ink-foreground/5 hover:text-ink-foreground"
                          activeProps={{ className: "bg-ink-foreground/10 text-gold-bright" }}>
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

          <ResumenPlanComercial />

          <div className="shrink-0 border-t border-ink-foreground/5 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-full border border-gold/30 bg-gold/20 font-display italic text-gold">
                {inicial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{nombreVisible}</p>
                <p className="truncate text-[10px] text-ink-foreground/40">
                  {sesion ? rolEtiqueta[sesion.rolPrincipal] : ""}
                  {tallerVisible && nombrePersonal ? ` · ${tallerVisible}` : ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void cerrarSesion()}
              className="w-full rounded-lg border border-ink-foreground/15 py-2 text-[10px] uppercase tracking-wider text-ink-foreground/60 transition-colors hover:text-ink-foreground"
            >
              Cerrar sesión
            </button>
          </div>
        </aside>
      ) : null}

      <main
        className={`min-w-0 flex-1 overflow-y-auto px-4 py-4 pb-8 sm:px-5 lg:p-10 ${
          encabezadoMovilCompacto ? "max-lg:px-3 max-lg:py-2 max-lg:pb-5" : ""
        }`}
      >
        <header
          className={`mb-4 flex flex-wrap items-end justify-between gap-3 lg:mb-10 lg:gap-4 ${
            encabezadoMovilCompacto
              ? "max-lg:sticky max-lg:top-0 max-lg:z-30 max-lg:-mx-3 max-lg:mb-2 max-lg:justify-end max-lg:bg-background/95 max-lg:px-3 max-lg:py-2 max-lg:backdrop-blur"
              : ""
          }`}
        >
          <div className="flex w-full items-start justify-between gap-2 lg:w-auto lg:flex-nowrap lg:justify-between lg:gap-3">
            <div
              className={`min-w-0 max-lg:flex-1 ${encabezadoMovilCompacto ? "max-lg:hidden" : ""}`}
            >
              <h1 className="mb-0.5 truncate font-display text-2xl sm:text-3xl lg:mb-2">
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
        </header>

        {!ocultarNavegacion && Boolean(sesion?.roles?.length) ? (
          <nav className="sticky top-0 z-20 -mx-4 mb-4 border-y border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
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
                <button
                  type="button"
                  onClick={() => void cerrarSesion()}
                  className="min-h-11 rounded-xl border border-danger/25 bg-danger-soft px-3 text-xs font-semibold text-danger"
                >
                  Salir
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
                      <h2 className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{nombres[grupo]}</h2>
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
}: {
  titulo: string;
  accion?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-border bg-card shadow-card lg:rounded-2xl ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 lg:px-6 lg:py-4">
        <h2 className="text-sm font-medium text-foreground">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  );
}
