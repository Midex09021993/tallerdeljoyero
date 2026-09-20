import { Link, useNavigate } from "@tanstack/react-router";
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
  Users,
  Gem,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";
import { areaCoincide, rolEtiqueta, useCerrarSesion, useSesion, type Rol } from "@/lib/auth";
import { AlertaAutorizacionProduccion } from "@/components/AlertaAutorizacionProduccion";

type Seccion = {
  to:
    | "/pedidos"
    | "/cotizaciones"
    | "/diseno-3d"
    | "/impresion-3d"
    | "/casting"
    | "/corte-laser"
    | "/taller"
    | "/ventas"
    | "/clientes"
    | "/inventario"
    | "/gestion"
    | "/monitor"
    | "/operario"
    | "/perfil"
    | "/aurum-render"
    | "/herramientas";
  label: string;
  area?: string;
  roles?: Rol[];
  icono?: typeof LayoutGrid;
  grupo?: "principal" | "comercial" | "produccion" | "inventario" | "aurum" | "herramientas" | "administracion";
};

type AtrasMovil = false | { to?: string; onClick?: () => void };

const secciones: Seccion[] = [
  { to: "/operario", label: "Mi trabajo", roles: ["operario"], icono: LayoutDashboard, grupo: "principal" },
  { to: "/pedidos", label: "Pedidos", area: "Pedidos", icono: ClipboardList, grupo: "comercial" },
  { to: "/cotizaciones", label: "Cotizaciones", icono: ClipboardList, grupo: "comercial" },
  { to: "/clientes", label: "Clientes", icono: Users, grupo: "comercial" },
  { to: "/diseno-3d", label: "Diseño 3D", area: "Diseño 3D", icono: LayoutGrid, grupo: "produccion" },
  { to: "/aurum-render", label: "AURUM RENDER", area: "Diseño 3D", icono: Gem, grupo: "aurum" },
  { to: "/impresion-3d", label: "Impresión 3D", area: "Impresión 3D", icono: Boxes, grupo: "produccion" },
  { to: "/casting", label: "Casting", area: "Casting", icono: Landmark, grupo: "produccion" },
  { to: "/corte-laser", label: "Corte Láser", area: "Corte Láser", icono: Scissors, grupo: "produccion" },
  { to: "/taller", label: "Taller", area: "Taller", icono: Hammer, grupo: "produccion" },
  { to: "/ventas", label: "Ventas", area: "Área ventas", icono: PackageCheck, grupo: "comercial" },
  { to: "/inventario", label: "Inventario", area: "Taller", icono: Gauge, grupo: "inventario" },
  { to: "/herramientas", label: "Herramientas", area: "Taller", icono: Wrench, grupo: "herramientas" },
  { to: "/monitor", label: "Monitor de taller", roles: ["monitor"], grupo: "principal" },
  { to: "/gestion", label: "Gestión", roles: ["dueno", "gerente"], icono: LayoutDashboard, grupo: "administracion" },
  { to: "/perfil", label: "Perfil", roles: ["operario"], icono: UserRound, grupo: "administracion" },
];

export const modulosAdminMovil = secciones.filter(
  (s) => !["/monitor", "/operario", "/perfil"].includes(s.to),
);

function seccionesVisibles(
  roles: Rol[] | undefined,
  areas: string[] | undefined,
  esAdmin: boolean | undefined,
): Seccion[] {
  if (!roles) return [];
  if (roles.includes("monitor")) return secciones.filter((s) => s.to === "/monitor");
  // El monitor no es un área: solo es visible para usuarios con rol "monitor".
  if (esAdmin) return secciones.filter((s) => !["/monitor", "/operario", "/perfil"].includes(s.to));
  // Los operarios ven la pantalla de cada área que el dueño/gerente les asignó
  // junto con su inicio rápido y perfil. Si aún no tienen áreas, solo ven el inicio.
  const asignadas = areas ?? [];
  const inicio = secciones.filter((s) => s.to === "/operario");
  const porArea = secciones.filter(
    (s) =>
      !["/inventario", "/operario", "/perfil"].includes(s.to) &&
      s.area != null &&
      asignadas.some((area) => areaCoincide(area, s.area)),
  );
  const perfil = secciones.filter((s) => s.to === "/perfil");
  return [...inicio, ...porArea, ...perfil];
}

// Orden visual del menú. Solo cambia la presentación; no cambia rutas, permisos ni lógica.
const ORDEN_MENU: Record<string, number> = {
  // El flujo comercial parte de la cotización; ventas y pedidos vienen después.
  "/clientes": 5,
  "/cotizaciones": 10,
  "/ventas": 20,
  "/pedidos": 30,
  "/inventario": 40,
  "/gestion": 50,
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
  ocultarNavegacion?: boolean;
  encabezadoMovilCompacto?: boolean;
  ocultarAccionesCelular?: boolean;
  children: ReactNode;
}) {
  const { data: sesion } = useSesion();
  const cerrarSesion = useCerrarSesion();
  const visibles = seccionesVisibles(sesion?.roles, sesion?.areas, sesion?.esAdmin);
  const visiblesOrdenadas = ordenarMenu(visibles);
  const inicial = (sesion?.perfil.nombre || "?").charAt(0).toUpperCase();
  const mostrarAtrasMovil = atrasMovil !== false;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {sesion?.esAdmin ? <AlertaAutorizacionProduccion /> : null}
      {!ocultarNavegacion ? (
        <aside className="sticky top-0 hidden h-screen max-h-screen w-64 shrink-0 flex-col overflow-hidden bg-ink text-ink-foreground lg:flex">
          <div className="p-8">
            <p className="font-display text-2xl italic text-gold">Aurum Lab</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ink-foreground/40">
              {sesion?.sede?.nombre ?? "Portal del taller"}
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
