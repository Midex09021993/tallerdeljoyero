import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, Panel, StatCard } from "@/components/AppShell";
import { fmtFecha } from "@/lib/utils";
import { useActualizarTarea, usePedidos, useTareas } from "@/lib/taller-db";

export const Route = createFileRoute("/_authenticated/taller")({
  head: () => ({
    meta: [
      { title: "Taller — Aurum Lab" },
      {
        name: "description",
        content: "Bancos de trabajo, tareas de engaste, pulido y fundición asignadas al equipo del taller.",
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

function TallerPage() {
  const { data: tareas = [], isLoading } = useTareas();
  const { data: pedidos = [] } = usePedidos();
  const navigate = useNavigate();
  const actualizar = useActualizarTarea();
  const enTaller = pedidos.filter(
    (p) => p.area_actual === "Taller" || p.area_actual === "Casting",
  );
  return (
    <AppShell
      titulo="Taller"
      subtitulo="Engaste, pulido y fundición · 3 joyeros en piso"
      acciones={
        <>
          <StatCard etiqueta="Tareas activas" valor={String(tareas.filter((t) => t.estado !== "Terminada").length)} />
          <StatCard etiqueta="Fundición" valor="14:30 h" />
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel titulo="Tareas del día" className="lg:col-span-2">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-muted">
                {["Tarea", "Responsable", "Banco", "Estado"].map((h) => (
                  <th key={h} className="px-6 py-3 text-[10px] uppercase tracking-wider text-muted-foreground">
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
                  <div className="h-full rounded-full bg-gold" style={{ width: `${b.ocupacion}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </AppShell>
  );
}
