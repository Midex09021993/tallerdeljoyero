import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const secciones = [
  { to: "/", label: "Pedidos" },
  { to: "/diseno-3d", label: "Diseño 3D" },
  { to: "/impresion-3d", label: "Impresión 3D" },
  { to: "/corte-laser", label: "Corte Láser" },
  { to: "/taller", label: "Taller" },
  { to: "/inventario", label: "Inventario" },
  { to: "/gestion", label: "Gestión" },
] as const;

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
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col bg-ink text-ink-foreground md:flex">
        <div className="p-8">
          <p className="font-display text-2xl italic text-gold">Aurum Lab</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ink-foreground/40">
            Portal del taller
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {secciones.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              activeOptions={{ exact: s.to === "/" }}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-ink-foreground/60 transition-colors hover:text-ink-foreground"
              activeProps={{ className: "bg-ink-foreground/10 text-gold-bright" }}
            >
              {s.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-ink-foreground/5 p-6">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-full border border-gold/30 bg-gold/20 font-display italic text-gold">
              M
            </div>
            <div>
              <p className="text-xs font-medium">Marco V.</p>
              <p className="text-[10px] text-ink-foreground/40">Maestro joyero</p>
            </div>
          </div>
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
          {secciones.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              activeOptions={{ exact: s.to === "/" }}
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
