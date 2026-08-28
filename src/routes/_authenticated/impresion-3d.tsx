import { createFileRoute } from "@tanstack/react-router";
import { AreaOperario, PedidosArea } from "@/components/PedidosArea";
import { AppShell, StatCard } from "@/components/AppShell";
import { usePedidosDeArea } from "@/hooks/use-pedidos-area";
import { SelectorSedeDueno, useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
import { useInventario } from "@/lib/taller-db";
import { useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/impresion-3d")({
  head: () => ({
    meta: [
      { title: "Impresión 3D - Aurum Lab" },
      {
        name: "description",
        content: "Pedidos reales asignados a impresión 3D y consumo de resina castable del taller.",
      },
      { property: "og:title", content: "Impresión 3D - Aurum Lab" },
      { property: "og:description", content: "Pedidos reales de impresión 3D del taller." },
    ],
  }),
  component: Impresion3D,
});

function Impresion3D() {
  const { data: sesion } = useSesion();
  if (sesion?.rolPrincipal === "operario") return <AreaOperario area="Impresión 3D" />;
  return <Impresion3DCompleta />;
}

function Impresion3DCompleta() {
  const { pedidos, enTrabajo } = usePedidosDeArea("Impresión 3D");
  const { data: inventario = [] } = useInventario();
  const { esDueno, sedeFiltro, setSedeFiltro, sedes, etiquetaSede, sedeSeleccionada } =
    useSedeFiltroDueno();
  const resina = inventario
    .filter((m) => !sedeSeleccionada || m.sede_id == null || m.sede_id === sedeSeleccionada.id)
    .find((m) => m.material.toLowerCase().includes("resina"));

  return (
    <AppShell
      titulo="Impresión 3D"
      subtitulo={`Pedidos que requieren impresión de resina · ${etiquetaSede}`}
      acciones={
        <>
          <SelectorSedeDueno
            esDueno={esDueno}
            sedes={sedes}
            value={sedeFiltro}
            onChange={setSedeFiltro}
          />
          <StatCard
            etiqueta="Resina 3D"
            valor={resina ? `${resina.stock} ${resina.unidad}` : "-"}
            tono={resina && resina.stock < resina.minimo ? "negativo" : "neutro"}
          />
          <StatCard etiqueta="Asignados" valor={String(pedidos.length)} />
          <StatCard etiqueta="En trabajo" valor={String(enTrabajo.length)} />
        </>
      }
    >
      <PedidosArea area="Impresión 3D" titulo="Pedidos asignados a Impresión 3D" />
    </AppShell>
  );
}
