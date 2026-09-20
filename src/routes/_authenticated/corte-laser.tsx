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
      <PedidosArea area="Corte Láser" titulo="Pedidos asignados a Corte Láser" />
    </AppShell>
  );
}
