import { createFileRoute } from "@tanstack/react-router";
import { SeguimientoArea } from "@/components/SeguimientoArea";
import { AppShell, ColaProcesos, Panel, StatCard } from "@/components/AppShell";
import { useActualizarProceso, useProcesos } from "@/lib/taller-db";

export const Route = createFileRoute("/_authenticated/corte-laser")({
  head: () => ({
    meta: [
      { title: "Corte láser — Aurum Lab" },
      {
        name: "description",
        content: "Cola de corte y grabado láser: chapas, mallas y placas con sus parámetros de máquina.",
      },
      { property: "og:title", content: "Corte láser — Aurum Lab" },
      { property: "og:description", content: "Corte y grabado láser de piezas del taller de joyería." },
    ],
  }),
  component: CorteLaser,
});

const parametros = [
  { pieza: "Base 18k mate", espesor: "0,8 mm", potencia: "65 %", velocidad: "12 mm/s" },
  { pieza: "Malla cenefa", espesor: "0,4 mm", potencia: "48 %", velocidad: "18 mm/s" },
  { pieza: "Placa grabada", espesor: "1,2 mm", potencia: "30 %", velocidad: "25 mm/s" },
];

function CorteLaser() {
  const { data: cola = [], isLoading } = useProcesos("laser");
  const actualizar = useActualizarProceso("laser");
  return (
    <AppShell
      titulo="Corte Láser"
      subtitulo="Fibra 30 W · 3 trabajos en cola"
      acciones={
        <>
          <StatCard etiqueta="Máquina" valor="Operativa" />
          <StatCard etiqueta="Trabajos en cola" valor={String(cola.length)} />
        </>
      }
    >
      <SeguimientoArea area="Servicio láser" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel titulo="Cola de corte">
          <ColaProcesos
            items={cola}
            cargando={isLoading}
            onProgreso={(id, progreso) => actualizar.mutate({ id, progreso })}
          />
        </Panel>

        <Panel titulo="Parámetros de máquina">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-muted">
                {["Pieza", "Espesor", "Potencia", "Velocidad"].map((h) => (
                  <th key={h} className="px-6 py-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {parametros.map((p) => (
                <tr key={p.pieza} className="transition-colors hover:bg-surface-muted/60">
                  <td className="px-6 py-4 text-sm">{p.pieza}</td>
                  <td className="px-6 py-4 text-sm tabular-nums text-muted-foreground">{p.espesor}</td>
                  <td className="px-6 py-4 text-sm tabular-nums text-muted-foreground">{p.potencia}</td>
                  <td className="px-6 py-4 text-sm tabular-nums text-muted-foreground">{p.velocidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </AppShell>
  );
}
