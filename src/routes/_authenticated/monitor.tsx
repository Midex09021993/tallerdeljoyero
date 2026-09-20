import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  CircleDot,
  Clock3,
  Factory,
  Layers3,
  PackageCheck,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SelectorSedeDueno, useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
import { AREAS, areaCoincide } from "@/lib/auth";
import { esEstadoFinalPedido, pedidoEnRecepcion, usePedidosSelector } from "@/lib/taller-db";
import { useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/monitor")({
  head: () => ({
    meta: [
      { title: "Monitor de taller — Aurum Lab" },
      {
        name: "description",
        content:
          "Pantalla de producción del taller de joyería: cada área con su cantidad de pedidos y detalle desplegable.",
      },
      { property: "og:title", content: "Monitor de taller — Aurum Lab" },
      { property: "og:description", content: "Producción en vivo por área del taller de joyería." },
    ],
  }),
  component: MonitorPage,
});

function MonitorPage() {
  const { data: pedidos = [], isLoading } = usePedidosSelector();
  const { data: sesion } = useSesion();
  const { esDueno, sedeFiltro, setSedeFiltro, sedes, filtrarPedidos, etiquetaSede } =
    useSedeFiltroDueno();
  const [abierta, setAbierta] = useState<string | null>(null);
  const pedidosPorSede = filtrarPedidos(pedidos);

  const areas = useMemo(
    () =>
      AREAS.map((area) => ({
        area,
        lista: pedidosPorSede.filter(
          (p) =>
            !esEstadoFinalPedido(p.estado) &&
            !pedidoEnRecepcion(p.estado) &&
            areaCoincide(p.area_actual, area),
        ),
      })),
    [pedidosPorSede],
  );

  const totalActivos = areas.reduce((total, item) => total + item.lista.length, 0);
  const areasActivas = areas.filter((item) => item.lista.length > 0).length;
  const ultimaActividad = areas
    .flatMap((item) => item.lista)
    .sort(
      (a, b) =>
        new Date(b.area_desde ?? b.fecha_ingreso).getTime() -
        new Date(a.area_desde ?? a.fecha_ingreso).getTime(),
    )[0];

  return (
    <AppShell
      titulo="Monitor de taller"
      subtitulo={
        isLoading
          ? "Sincronizando producción…"
          : sesion?.esDueno
            ? `Producción en vivo · ${etiquetaSede}`
            : (sesion?.sede?.nombre ?? "Producción en vivo")
      }
      acciones={
        <SelectorSedeDueno
          esDueno={esDueno}
          sedes={sedes}
          value={sedeFiltro}
          onChange={setSedeFiltro}
        />
      }
    >
      <div className="relative overflow-hidden rounded-[28px] border border-ink/10 bg-ink px-6 py-7 text-ink-foreground shadow-[0_24px_70px_-35px_rgba(0,0,0,0.45)] sm:px-8 lg:px-10">
        <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-white/5 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gold">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-gold" />
              </span>
              Producción en vivo
            </div>
            <h2 className="font-display text-3xl italic tracking-tight sm:text-4xl">
              El taller, de un vistazo.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-foreground/55">
              Estado operativo por área, pedidos activos y última actividad. Una pantalla pensada
              para supervisar sin entrar a cada módulo.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <Activity className="size-4 text-gold" />
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/35">Estado</p>
              <p className="text-sm font-medium">Operación activa</p>
            </div>
          </div>
        </div>

        <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
          <Metric icon={Layers3} label="Pedidos activos" value={totalActivos} />
          <Metric icon={Factory} label="Áreas trabajando" value={areasActivas} />
          <Metric
            icon={Clock3}
            label="Última actividad"
            value={
              ultimaActividad
                ? new Date(ultimaActividad.area_desde ?? ultimaActividad.fecha_ingreso).toLocaleTimeString(
                    "es-PE",
                    { hour: "2-digit", minute: "2-digit" },
                  )
                : "—"
            }
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {areas.map(({ area, lista }) => {
          const activa = abierta === area;
          return (
            <section
              key={area}
              className={`group overflow-hidden rounded-[22px] border transition-all duration-300 ${
                activa
                  ? "border-gold/50 bg-ink text-ink-foreground shadow-[0_20px_50px_-30px_rgba(0,0,0,0.65)]"
                  : "border-border bg-card hover:-translate-y-0.5 hover:border-gold/30 hover:shadow-[0_18px_45px_-32px_rgba(0,0,0,0.45)]"
              }`}
            >
              <button
                type="button"
                onClick={() => setAbierta(activa ? null : area)}
                className="w-full p-5 text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`grid size-10 place-items-center rounded-xl ${
                        activa ? "bg-gold/15 text-gold" : "bg-surface-muted text-muted-foreground"
                      }`}
                    >
                      <Factory className="size-4" />
                    </div>
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                        activa ? "text-white/45" : "text-muted-foreground"
                      }`}>
                        Área
                      </p>
                      <h3 className="mt-0.5 font-display text-xl">{area}</h3>
                    </div>
                  </div>
                  <span
                    className={`grid size-10 place-items-center rounded-full font-display text-xl ${
                      lista.length
                        ? activa
                          ? "bg-gold text-ink"
                          : "bg-gold/10 text-gold"
                        : "bg-surface-muted text-muted-foreground"
                    }`}
                  >
                    {lista.length}
                  </span>
                </div>

                <div className={`mt-5 flex items-center justify-between border-t pt-4 ${
                  activa ? "border-white/10" : "border-border"
                }`}>
                  <span className={`text-xs ${activa ? "text-white/50" : "text-muted-foreground"}`}>
                    {lista.length === 1 ? "1 pedido en proceso" : `${lista.length} pedidos en proceso`}
                  </span>
                  <ArrowUpRight
                    className={`size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                      activa ? "text-gold" : "text-muted-foreground"
                    }`}
                  />
                </div>
              </button>

              {activa ? (
                <div className="border-t border-white/10 px-5 pb-5">
                  {lista.length === 0 ? (
                    <div className="flex items-center gap-3 py-5 text-xs text-white/45">
                      <CheckCircle2 className="size-4 text-gold" />
                      Área disponible
                    </div>
                  ) : (
                    <div className="space-y-2 pt-3">
                      {lista.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                <span className="text-gold">{p.referencia}</span>
                                <span className="text-white/35"> · </span>
                                {p.pieza}
                              </p>
                              <p className="mt-1 truncate text-xs text-white/50">
                                {p.cliente}
                                {sesion?.esDueno && p.sede_nombre ? ` · ${p.sede_nombre}` : ""}
                              </p>
                            </div>
                            <CircleDot className="mt-0.5 size-4 shrink-0 text-gold/70" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      {!isLoading && totalActivos === 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-card px-6 py-8 text-center">
          <Sparkles className="mx-auto size-5 text-gold" />
          <p className="mt-3 text-sm font-medium">El taller está despejado.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            No hay pedidos activos en producción en este momento.
          </p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-6 rounded-2xl border border-border bg-card px-6 py-8 text-center">
          <PackageCheck className="mx-auto size-5 animate-pulse text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">Sincronizando producción…</p>
        </div>
      ) : null}
    </AppShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Layers3;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex items-center gap-2 text-white/40">
        <Icon className="size-3.5" />
        <span className="text-[9px] font-bold uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="mt-1 font-display text-2xl text-white">{value}</p>
    </div>
  );
}
