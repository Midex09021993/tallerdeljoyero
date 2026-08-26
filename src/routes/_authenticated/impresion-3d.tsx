import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ColaProcesos, Panel, StatCard } from "@/components/AppShell";
import { useActualizarProceso, useInventario, useProcesos } from "@/lib/taller-db";

export const Route = createFileRoute("/_authenticated/impresion-3d")({
  head: () => ({
    meta: [
      { title: "Impresión 3D — Aurum Lab" },
      {
        name: "description",
        content: "Estado de impresoras de resina, cola de impresión y consumo de resina castable del taller.",
      },
      { property: "og:title", content: "Impresión 3D — Aurum Lab" },
      { property: "og:description", content: "Impresoras, cola de trabajos y consumo de resina." },
    ],
  }),
  component: Impresion3D,
});

const impresoras = [
  { nombre: "Formlabs 3B+ (A)", estado: "ACTIVA", trabajo: "Cera sortija #4395", restante: "1 h 14 m", pct: 72 },
  { nombre: "Formlabs 3B+ (B)", estado: "ACTIVA", trabajo: "Soporte gata", restante: "45 m", pct: 25 },
  { nombre: "Phrozen Sonic Mini", estado: "LIBRE", trabajo: "—", restante: "—", pct: 0 },
];

function Impresion3D() {
  const { data: cola = [], isLoading } = useProcesos("impresion");
  const actualizar = useActualizarProceso("impresion");
  const { data: inventario = [] } = useInventario();
  const resina = inventario.find((m) => m.material.toLowerCase().includes("resina"));
  return (
    <AppShell
      titulo="Impresión 3D"
      subtitulo="Resina castable · 2 impresoras activas"
      acciones={
        <>
          <StatCard
            etiqueta="Resina 3D"
            valor={resina ? `${resina.stock} ${resina.unidad}` : "—"}
            tono={resina && resina.stock < resina.minimo ? "negativo" : "neutro"}
          />
          <StatCard etiqueta="Trabajos en cola" valor={String(cola.length)} />
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel titulo="Impresoras" className="lg:col-span-2">
          <ul className="divide-y divide-border">
            {impresoras.map((i) => (
              <li key={i.nombre} className="px-6 py-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{i.nombre}</p>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                      i.estado === "ACTIVA" ? "bg-success-soft text-success" : "bg-surface-muted text-muted-foreground"
                    }`}
                  >
                    {i.estado}
                  </span>
                </div>
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${i.pct}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                  <span>{i.trabajo}</span>
                  <span>{i.restante}</span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel titulo="Cola de impresión">
          <ColaProcesos
            items={cola}
            cargando={isLoading}
            onProgreso={(id, progreso) => actualizar.mutate({ id, progreso })}
          />
        </Panel>
      </div>
    </AppShell>
  );
}
