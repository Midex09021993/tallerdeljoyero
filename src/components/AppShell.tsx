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
} from "lucide-react";
import type { ReactNode } from "react";
import { areaCoincide, rolEtiqueta, useCerrarSesion, useSesion, type Rol } from "@/lib/auth";

type Seccion = {
  to:
    | "/pedidos"
    | "/diseno-3d"
    | "/impresion-3d"
    | "/casting"
    | "/corte-laser"
    | "/taller"
    | "/ventas"
    | "/inventario"
    | "/gestion"
    | "/monitor"
    | "/operario"
    | "/perfil";
  label: string;
  area?: string;
  roles?: Rol[];
  icono?: typeof LayoutGrid;
};

type AtrasMovil = false | { to?: string; onClick?: () => void };

const secciones: Seccion[] = [
  { to: "/operario", label: "Mi trabajo", roles: ["operario"], icono: LayoutDashboard },
  { to: "/pedidos", label: "Pedidos", area: "Pedidos", icono: ClipboardList },
  { to: "/diseno-3d", label: "Diseño 3D", area: "Diseño 3D", icono: LayoutGrid },
  { to: "/impresion-3d", label: "Impresión 3D", area: "Impresión 3D", icono: Boxes },
  { to: "/casting", label: "Casting", area: "Casting", icono: Landmark },
  { to: "/corte-laser", label: "Corte Láser", area: "Corte Láser", icono: Scissors },
  { to: "/taller", label: "Taller", area: "Taller", icono: Hammer },
  { to: "/ventas", label: "Área ventas", area: "Área ventas", icono: PackageCheck },
  { to: "/inventario", label: "Inventario", area: "Taller", icono: Gauge },
  { to: "/monitor", label: "Monitor de taller", roles: ["monitor"] },
  { to: "/gestion", label: "Gestión", roles: ["dueno", "gerente"], icono: LayoutDashboard },
  { to: "/perfil", label: "Perfil", roles: ["operario"], icono: UserRound },
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

export function AppShell({
  titulo,
  subtitulo,
  acciones,
  atrasMovil = { to: "/inicio" },
  ocultarNavegacion = false,
  encabezadoMovilCompacto = false,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  acciones?: ReactNode;
  atrasMovil?: AtrasMovil;
  ocultarNavegacion?: boolean;
  encabezadoMovilCompacto?: boolean;
  children: ReactNode;
}) {
  const { data: sesion } = useSesion();
  const cerrarSesion = useCerrarSesion();
  const visibles = seccionesVisibles(sesion?.roles, sesion?.areas, sesion?.esAdmin);
  const inicial = (sesion?.perfil.nombre || "?").charAt(0).toUpperCase();
  const mostrarAtrasMovil = atrasMovil !== false;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {!ocultarNavegacion ? (
        <aside className="hidden w-64 shrink-0 flex-col bg-ink text-ink-foreground lg:flex">
          <div className="p-8">
            <p className="font-display text-2xl italic text-gold">Aurum Lab</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ink-foreground/40">
              {sesion?.sede?.nombre ?? "Portal del taller"}
            </p>
          </div>

          <nav className="flex-1 space-y-1 px-4">
            {visibles.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-ink-foreground/60 transition-colors hover:text-ink-foreground"
                activeProps={{ className: "bg-ink-foreground/10 text-gold-bright" }}
              >
                {s.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-ink-foreground/5 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-full border border-gold/30 bg-gold/20 font-display italic text-gold">
                {inicial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{sesion?.perfil.nombre || "Usuario"}</p>
                <p className="truncate text-[10px] text-ink-foreground/40">
                  {sesion ? rolEtiqueta[sesion.rolPrincipal] : ""}
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
              className={`flex w-full gap-2 overflow-x-auto pb-1 lg:w-auto lg:flex-wrap lg:gap-4 ${
                encabezadoMovilCompacto ? "max-lg:hidden" : ""
              }`}
            >
              {acciones}
            </div>
          ) : null}
        </header>

        {!ocultarNavegacion && !sesion?.esAdmin ? (
          <nav
            className={`sticky top-0 z-20 -mx-4 mb-4 border-y border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden ${
              encabezadoMovilCompacto ? "max-lg:hidden" : ""
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{sesion?.perfil.nombre || "Usuario"}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {sesion ? rolEtiqueta[sesion.rolPrincipal] : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void cerrarSesion()}
                className="shrink-0 rounded-full border border-danger/25 bg-danger-soft px-3 py-2 text-xs font-semibold text-danger"
              >
                Cerrar sesión
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {visibles.map((s) => (
                <Link
                  key={s.to}
                  to={s.to}
                  className="shrink-0 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground"
                  activeProps={{ className: "bg-ink text-gold-bright border-transparent" }}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </nav>
        ) : null}

        {children}
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
        <h2 className="text-sm font-medium">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  );
}
