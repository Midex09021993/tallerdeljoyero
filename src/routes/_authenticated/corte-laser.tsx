import { createFileRoute } from "@tanstack/react-router";
import { AreaOperario, PedidosArea } from "@/components/PedidosArea";
import { AppShell, StatCard } from "@/components/AppShell";
import { usePedidosDeArea } from "@/hooks/use-pedidos-area";
import { SelectorSedeDueno, useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
import { useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/corte-laser")({
  head: () => ({
    meta: [
      { title: "Corte Láser - Aurum Lab" },
      {
        name: "description",
        content: "Pedidos reales asignados a corte y grabado láser dentro del flujo del taller.",
      },
      { property: "og:title", content: "Corte Láser - Aurum Lab" },
      { property: "og:description", content: "Pedidos reales de corte láser del taller." },
    ],
  }),
  component: CorteLaser,
});

function CorteLaser() {
  const { data: sesion } = useSesion();
  if (sesion?.rolPrincipal === "operario") return <AreaOperario area="Corte Láser" />;
  return <CorteLaserCompleto />;
}

function FichaDoradaPrueba() {
  return (
    <article className="mb-5 rounded-2xl border border-gold/30 bg-card p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-gold hover:shadow-raised">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Prueba controlada</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">Ficha dorada</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta ficha es temporal y solo sirve para probar el efecto visual.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-gold/10 px-3 py-1 text-[10px] font-semibold uppercase text-gold">
          Corte Láser
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
        <div className="rounded-xl bg-surface-muted p-3">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Hover</p>
          <p className="mt-1 font-medium text-foreground">Elevación + brillo</p>
        </div>
        <div className="rounded-xl bg-surface-muted p-3">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Borde</p>
          <p className="mt-1 font-medium text-foreground">Dorado</p>
        </div>
        <div className="rounded-xl bg-surface-muted p-3 sm:col-span-1 col-span-2">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Estado</p>
          <p className="mt-1 font-medium text-foreground">Solo prueba</p>
        </div>
      </div>
    </article>
  );
}

function CorteLaserCompleto() {
  const { pedidos, enTrabajo } = usePedidosDeArea("Corte Láser");
  const { esDueno, sedeFiltro, setSedeFiltro, sedes, etiquetaSede } = useSedeFiltroDueno();

  return (
    <AppShell
      titulo="Corte Láser"
      subtitulo={`Pedidos que requieren corte o grabado · ${etiquetaSede}`}
      ocultarAccionesCelular
      acciones={
        <>
          <SelectorSedeDueno
            esDueno={esDueno}
            sedes={sedes}
            value={sedeFiltro}
            onChange={setSedeFiltro}
          />
          <StatCard etiqueta="Asignados" valor={String(pedidos.length)} />
          <StatCard etiqueta="En trabajo" valor={String(enTrabajo.length)} />
        </>
      }
    >
      <FichaDoradaPrueba />
      <PedidosArea area="Corte Láser" titulo="Pedidos asignados a Corte Láser" variante="ficha-dorada" />
    </AppShell>
  );
}
