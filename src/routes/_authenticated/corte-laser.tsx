import { createFileRoute, Link } from "@tanstack/react-router";
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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/20 bg-card p-4 shadow-card">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Diseño para fabricación</p>
          <p className="mt-1 text-sm text-muted-foreground">Convierte una imagen en una curva cerrada para corte o grabado.</p>
        </div>
        <Link to="/vectorizador-laser" className="rounded-lg bg-gold px-4 py-2.5 text-xs font-semibold text-gold-foreground">Abrir Vectorizador →</Link>
      </div>
      <PedidosArea area="Corte Láser" titulo="Pedidos asignados a Corte Láser" />
    </AppShell>
  );
}
