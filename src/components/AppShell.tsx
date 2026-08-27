import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { rolEtiqueta, useCerrarSesion, useSesion, type Rol } from "@/lib/auth";

type Seccion = {
  to:
    | "/perdidos"
    | "/diseno-3d"
    | "/impresion-3d"
    | "/corte-laser"
    | "/taller"
    | "/inventario"
    | "/gestion"
    | "/monitor";
  label: string;
  area?: string;
  roles?: Rol[];
};

const secciones: Seccion[] = [
  { to: "/pedidos", label: "Pedidos", area: "Mis pedidos" },
  { to: "/diseno-3d", label: "Diseño 3D", area: "Diseño 3D" },
  { to: "/impresion-3d", label: "Impresión 3D", area: "Impresión 3D" },
  { to: "/corte-laser", label: "Servicio láser", area: "Servicio láser" },
  { to: "/taller", label: "Taller", area: "Taller" },
  { to: "/inventario", label: "Inventario", area: "Taller" },
  { to: "/monitor", label: "Monitor de taller", roles: ["monitor"] },
  { to: "/gestion", label: "Gestión", roles: ["dueno", "gerente"] },
];

function seccionesVisibles(
  roles: Rol[] | undefined,
  areas: string[] | undefined,
  esAdmin: boolean | undefined,
): Seccion[] {
  if (!roles) return [];
  if (roles.includes("monitor")) return secciones.filter((s) => s.to === "/monitor");
  // El monitor no es un área: solo es visible para usuarios con rol "monitor".
  if (esAdmin) return secciones.filter((s) => s.to !== "/monitor");
  // Los operarios ven la pantalla de cada área que el dueño/gerente les asignó
  // (además de Inventario). Si aún no tienen áreas, se les deja Taller.
  const asignadas = areas ?? [];
  const porArea = secciones.filter((s) => s.to !== "/inventario" && s.area != null && asignadas.includes(s.area));
  const inventario = secciones.filter((s) => s.to === "/inventario");
  if (porArea.length === 0) {
    return secciones.filter((s) => s.to === "/taller" || s.to === "/inventario");
  }
  return [...porArea, ...inventario];
}

export function AppShell({
  titulo,
  subtitulo,
  acciones,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  acciones?: ReactNode;
  children: ReactNode;
}) {
  const { data: sesion } = useSesion();
  const cerrarSesion = useCerrarSesion();
  const visibles = seccionesVisibles(sesion?.roles, sesion?.areas, sesion?.esAdmin);
  const inicial = (sesion?.perfil.nombre || "?").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
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

      <main className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-10">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mb-2 font-display text-3xl">{titulo}</h1>
            {subtitulo ? <p className="text-sm text-muted-foreground">{subtitulo}</p> : null}
          </div>
          {acciones ? <div className="flex gap-4">{acciones}</div> : null}
        </header>

        <nav className="mb-8 flex flex-wrap gap-2 md:hidden">
          {visibles.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground"
              activeProps={{ className: "bg-ink text-gold-bright border-transparent" }}
            >
              {s.label}
            </Link>
          ))}
        </nav>

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
    tono === "positivo" ? "text-success" : tono === "negativo" ? "text-danger" : "text-muted-foreground";
  return (
    <div className="min-w-[140px] rounded-xl border border-border bg-card p-4 shadow-card">
      <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{etiqueta}</p>
      <p className="text-xl font-medium">
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
    <section className={`overflow-hidden rounded-2xl border border-border bg-card shadow-card ${className}`}>
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-sm font-medium">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  );
}

export function ColaLista({
  items,
}: {
  items: { ref: string; pieza: string; cliente: string; detalle: string; progreso: number }[];
}) {
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.ref} className="px-6 py-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium">{item.pieza}</p>
            <span className="text-xs text-muted-foreground">{item.ref}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.cliente} · {item.detalle}
          </p>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-gold" style={{ width: `${item.progreso}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ColaProcesos({
  items,
  onProgreso,
  cargando,
}: {
  items: { id: string; referencia: string; pieza: string; cliente: string; detalle: string; progreso: number }[];
  onProgreso?: (id: string, progreso: number) => void;
  cargando?: boolean;
}) {
  if (cargando) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">Cargando…</p>;
  }
  if (items.length === 0) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">Sin trabajos en cola.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="px-6 py-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium">{item.pieza}</p>
            <span className="text-xs text-muted-foreground">{item.referencia}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.cliente} · {item.detalle}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full rounded-full bg-gold" style={{ width: `${item.progreso}%` }} />
            </div>
            <span className="w-10 text-right text-[10px] tabular-nums text-muted-foreground">{item.progreso}%</span>
            {onProgreso ? (
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="Reducir progreso"
                  onClick={() => onProgreso(item.id, Math.max(0, item.progreso - 10))}
                  className="size-6 rounded border border-border text-xs transition-colors hover:bg-surface-muted"
                >
                  −
                </button>
                <button
                  type="button"
                  aria-label="Aumentar progreso"
                  onClick={() => onProgreso(item.id, Math.min(100, item.progreso + 10))}
                  className="size-6 rounded border border-border text-xs transition-colors hover:bg-surface-muted"
                >
                  +
                </button>
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
