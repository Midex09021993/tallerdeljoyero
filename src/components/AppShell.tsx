import { Link } from "@tanstack/react-router";
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
};

const secciones: Seccion[] = [
  { to: "/operario", label: "Mi trabajo", roles: ["operario"] },
  { to: "/pedidos", label: "Pedidos", area: "Pedidos" },
  { to: "/diseno-3d", label: "Diseño 3D", area: "Diseño 3D" },
  { to: "/impresion-3d", label: "Impresión 3D", area: "Impresión 3D" },
  { to: "/casting", label: "Casting", area: "Casting" },
  { to: "/corte-laser", label: "Corte Láser", area: "Corte Láser" },
  { to: "/taller", label: "Taller", area: "Taller" },
  { to: "/ventas", label: "Área ventas", area: "Área ventas" },
  { to: "/inventario", label: "Inventario", area: "Taller" },
  { to: "/monitor", label: "Monitor de taller", roles: ["monitor"] },
  { to: "/gestion", label: "Gestión", roles: ["dueno", "gerente"] },
  { to: "/perfil", label: "Perfil", roles: ["operario"] },
];

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
  ocultarNavegacion = false,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  acciones?: ReactNode;
  ocultarNavegacion?: boolean;
  children: ReactNode;
}) {
  const { data: sesion } = useSesion();
  const cerrarSesion = useCerrarSesion();
  const visibles = seccionesVisibles(sesion?.roles, sesion?.areas, sesion?.esAdmin);
  const inicial = (sesion?.perfil.nombre || "?").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {!ocultarNavegacion ? (
        <aside className="hidden w-64 shrink-0 flex-col bg-ink text-ink-foreground md:flex">
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

      <main className="min-w-0 flex-1 overflow-y-auto px-4 py-5 pb-8 sm:px-6 lg:p-10">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-8 lg:mb-10">
          <div>
            <h1 className="mb-1 font-display text-2xl sm:mb-2 sm:text-3xl">{titulo}</h1>
            {subtitulo ? <p className="text-sm text-muted-foreground">{subtitulo}</p> : null}
          </div>
          {acciones ? (
            <div className="flex w-full gap-2 overflow-x-auto pb-1 sm:w-auto sm:flex-wrap sm:gap-4">
              {acciones}
            </div>
          ) : null}
        </header>

        {!ocultarNavegacion ? (
          <nav className="sticky top-0 z-20 -mx-4 mb-5 border-y border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {visibles.map((s) => (
                <Link
                  key={s.to}
                  to={s.to}
                  className="shrink-0 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground"
                  activeProps={{ className: "bg-ink text-gold-bright border-transparent" }}
                >
                  {s.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
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
          </nav>
        ) : null}

        {children}
      </main>
    </div>
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
    <div className="min-w-[112px] rounded-xl border border-border bg-card p-3 shadow-card sm:min-w-[140px] sm:p-4">
      <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{etiqueta}</p>
      <p className="text-lg font-medium sm:text-xl">
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
      className={`overflow-hidden rounded-xl border border-border bg-card shadow-card sm:rounded-2xl ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <h2 className="text-sm font-medium">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  );
}
