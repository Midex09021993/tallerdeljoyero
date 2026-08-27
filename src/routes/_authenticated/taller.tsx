import { createFileRoute } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, Panel, StatCard } from "@/components/AppShell";
import { SeguimientoArea } from "@/components/SeguimientoArea";
import { useActualizarTarea, useTareas } from "@/lib/taller-db";

export const Route = createFileRoute("/_authenticated/taller")({
  head: () => ({
    meta: [
      { title: "Taller — Aurum Lab" },
      {
        name: "description",
        content:
          "Bancos de trabajo, tareas de engaste, pulido y fundición asignadas al equipo del taller.",
      },
      { property: "og:title", content: "Taller — Aurum Lab" },
      { property: "og:description", content: "Bancos, tareas y turnos del taller de joyería." },
    ],
  }),
  component: TallerPage,
});

const bancos = [
  { banco: "Banco 1", joyero: "Marco V.", ocupacion: 85 },
  { banco: "Banco 2", joyero: "Irene L.", ocupacion: 60 },
  { banco: "Banco 3", joyero: "Pau G.", ocupacion: 35 },
  { banco: "Fundición", joyero: "Turno 14:30", ocupacion: 100 },
];

const estadosTarea = ["Pendiente", "En curso", "Terminada"];

const proporcionesYeso = [
  { agua: 38, yeso: 62, recomendada: false },
  { agua: 40, yeso: 60, recomendada: true },
  { agua: 42, yeso: 58, recomendada: false },
];

function formatearCantidad(valor: number, decimales = 1) {
  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: decimales,
    minimumFractionDigits: valor > 0 && valor < 10 ? 1 : 0,
  }).format(valor);
}

function TallerPage() {
  const { data: tareas = [], isLoading } = useTareas();
  const actualizar = useActualizarTarea();
  const [diametro, setDiametro] = useState("");
  const [altura, setAltura] = useState("");

  const volumen = useMemo(() => {
    const d = Number(diametro);
    const h = Number(altura);
    if (!Number.isFinite(d) || !Number.isFinite(h) || d <= 0 || h <= 0) return 0;
    const radio = d / 2;
    return Math.PI * radio * radio * h;
  }, [altura, diametro]);

  return (
    <AppShell
      titulo="Taller"
      subtitulo="Engaste, pulido y fundición · 3 joyeros en piso"
      acciones={
        <>
          <StatCard
            etiqueta="Tareas activas"
            valor={String(tareas.filter((t) => t.estado !== "Terminada").length)}
          />
          <StatCard etiqueta="Fundición" valor="14:30 h" />
        </>
      }
    >
      <SeguimientoArea area="Taller" />

      <Panel
        titulo="Calculadora de yeso"
        accion={
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
            <Calculator className="size-3" aria-hidden="true" />
            Joyería 40/60
          </span>
        }
      >
        <div className="space-y-5 p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Diámetro del cilindro (cm)
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={diametro}
                onChange={(e) => setDiametro(e.target.value)}
                placeholder="Ej. 7.5"
                className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Altura del cilindro (cm)
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                placeholder="Ej. 10"
                className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
              />
            </label>
          </div>

          <div className="rounded-xl border border-border bg-surface-muted p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Volumen total
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {volumen > 0 ? `${formatearCantidad(volumen)} ml` : "Ingresa medidas"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Fórmula: V = π x r² x h, con radio = diámetro / 2.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {proporcionesYeso.map((p) => {
              const agua = volumen * (p.agua / 100);
              const yeso = volumen * (p.yeso / 100);
              return (
                <article
                  key={`${p.agua}-${p.yeso}`}
                  className={`rounded-xl border p-4 ${
                    p.recomendada ? "border-gold bg-accent shadow-card" : "border-border bg-card"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">
                        {p.agua}% agua / {p.yeso}% yeso
                      </p>
                      {p.recomendada ? (
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-gold">
                          Recomendada para joyería
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-background p-3">
                      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Agua
                      </dt>
                      <dd className="mt-1 text-xl font-semibold">
                        {volumen > 0 ? formatearCantidad(agua) : "0"} ml
                      </dd>
                    </div>
                    <div className="rounded-lg bg-background p-3">
                      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Yeso
                      </dt>
                      <dd className="mt-1 text-xl font-semibold">
                        {volumen > 0 ? formatearCantidad(yeso) : "0"} g
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel titulo="Tareas del día" className="lg:col-span-2">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-muted">
                {["Tarea", "Responsable", "Banco", "Estado"].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tareas.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-surface-muted/60">
                  <td className="px-6 py-4 text-sm">{t.tarea}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{t.responsable}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{t.banco}</td>
                  <td className="px-6 py-4">
                    <select
                      value={estadosTarea.includes(t.estado) ? t.estado : "Pendiente"}
                      onChange={(e) => actualizar.mutate({ id: t.id, estado: e.target.value })}
                      className="rounded-full bg-accent px-2 py-1 text-[10px] font-semibold uppercase"
                    >
                      {estadosTarea.map((e) => (
                        <option key={e}>{e}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {!isLoading && tareas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-sm text-muted-foreground">
                    Sin tareas registradas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Panel>

        <Panel titulo="Ocupación de bancos">
          <ul className="divide-y divide-border">
            {bancos.map((b) => (
              <li key={b.banco} className="px-6 py-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium">{b.banco}</p>
                  <span className="text-xs text-muted-foreground">{b.joyero}</span>
                </div>
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full bg-gold"
                    style={{ width: `${b.ocupacion}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </AppShell>
  );
}
