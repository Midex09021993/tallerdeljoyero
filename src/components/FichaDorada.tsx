import type { ReactNode } from "react";
import {
  Boxes,
  ChartNoAxesCombined,
  CircleAlert,
  Layers3,
} from "lucide-react";

export type FichaDoradaTipo = "materiales" | "bajo" | "movimientos" | "areas";

export type FichaDoradaProps = {
  tipo?: FichaDoradaTipo;
  indicador: string;
  titulo: string;
  valor: ReactNode;
  descripcion: string;
  activa?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  icono?: ReactNode;
};

const iconosPorTipo: Record<FichaDoradaTipo, ReactNode> = {
  materiales: <Boxes className="size-5" strokeWidth={1.8} />,
  bajo: <CircleAlert className="size-5" strokeWidth={1.8} />,
  movimientos: <ChartNoAxesCombined className="size-5" strokeWidth={1.8} />,
  areas: <Layers3 className="size-5" strokeWidth={1.8} />,
};

const fichaDoradaBase =
  "group relative min-h-[150px] overflow-visible rounded-2xl border bg-card p-5 text-left " +
  "transition-all duration-300 ease-out " +
  "hover:-translate-y-1 hover:border-gold/70 hover:shadow-[0_14px_36px_-18px_hsl(var(--gold)/0.65)] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60";

export function FichaDorada({
  tipo,
  indicador,
  titulo,
  valor,
  descripcion,
  activa = false,
  disabled = false,
  onClick,
  icono,
}: FichaDoradaProps) {
  const interactiva = !disabled && Boolean(onClick);
  const iconoFinal = icono ?? (tipo ? iconosPorTipo[tipo] : <span className="text-xs font-bold">✦</span>);

  return (
    <button
      type="button"
      disabled={!interactiva}
      onClick={onClick}
      className={[
        fichaDoradaBase,
        disabled ? "cursor-default" : "cursor-pointer",
        activa
          ? "border-gold/70 shadow-[0_10px_30px_-18px_hsl(var(--gold)/0.7)]"
          : "border-gold/20",
      ].join(" ")}
    >
      <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gold/[0.025] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <span className="relative flex items-start justify-between gap-4">
        <span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-gold/75">
            {indicador}
          </span>
          <span className="mt-2 block text-lg font-semibold text-foreground transition-colors duration-300 group-hover:text-gold">
            {titulo}
          </span>
        </span>

        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-gold/20 bg-gold/10 text-gold transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-125 group-hover:rotate-12">
          {iconoFinal}
        </span>
      </span>

      <span className="relative mt-7 flex items-end justify-between gap-3">
        <span>
          <span className="block text-2xl font-semibold tabular-nums">{valor}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{descripcion}</span>
        </span>

        {interactiva ? (
          <span className="translate-x-0 text-sm text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-gold">
            →
          </span>
        ) : null}
      </span>
    </button>
  );
}


/**
 * FichaAurum: contenedor estándar para cualquier módulo del ERP.
 * Regla UX: fondo claro, borde neutro/dorado, sombra suave. No usar bg-ink,
 * fondos negros ni text-white en fichas del ERP. Los estados se expresan
 * con los tokens semánticos success/warning/danger/info.
 */
export function FichaAurum({
  children,
  className = "",
  interactiva = false,
}: {
  children: ReactNode;
  className?: string;
  interactiva?: boolean;
}) {
  return (
    <section
      className={[
        "relative overflow-hidden rounded-2xl border border-gold/20 bg-card text-foreground shadow-card",
        interactiva
          ? "transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-raised"
          : "",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

export const AURUM_FICHA_UI = {
  card: "rounded-2xl border border-gold/20 bg-card text-foreground shadow-card",
  cardRaised: "rounded-2xl border border-gold/25 bg-card text-foreground shadow-raised",
  sunken: "rounded-xl border border-border bg-surface-sunken",
  primaryAction: "rounded-xl border border-gold/30 bg-gold text-gold-foreground shadow-card transition hover:shadow-raised",
  secondaryAction: "rounded-xl border border-gold/25 bg-card text-gold-deep shadow-card transition hover:border-gold/50 hover:bg-gold/5",
  status: "rounded-full border border-gold/25 bg-gold/10 text-gold-deep",
} as const;
