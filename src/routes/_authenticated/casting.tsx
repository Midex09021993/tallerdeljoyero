import { createFileRoute } from "@tanstack/react-router";
import { AreaOperario, PedidosArea } from "@/components/PedidosArea";
import { AppShell, StatCard } from "@/components/AppShell";
import { usePedidosDeArea } from "@/hooks/use-pedidos-area";
import { SelectorSedeDueno, useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
import { useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/casting")({
  head: () => ({
    meta: [
      { title: "Casting - Aurum Lab" },
      {
        name: "description",
        content: "Pedidos reales asignados al proceso de casting dentro del flujo del taller.",
      },
      { property: "og:title", content: "Casting - Aurum Lab" },
      { property: "og:description", content: "Pedidos reales de casting del taller." },
    ],
  }),
  component: Casting,
});

function Casting() {
  const { data: sesion } = useSesion();
  if (sesion?.rolPrincipal === "operario") return <AreaOperario area="Casting" />;
  return <CastingCompleto />;
}

function CastingCompleto() {
  const { pedidos, enTrabajo } = usePedidosDeArea("Casting");
  const { esDueno, sedeFiltro, setSedeFiltro, sedes, etiquetaSede } = useSedeFiltroDueno();

  return (
    <AppShell
      titulo="Casting"
      subtitulo={`Pedidos que requieren casting o fundición · ${etiquetaSede}`}
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
      <PedidosArea area="Casting" titulo="Pedidos asignados a Casting" />
    </AppShell>
  );
}
