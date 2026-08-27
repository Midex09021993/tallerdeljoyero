import { createFileRoute } from "@tanstack/react-router";
import { SeguimientoArea } from "@/components/SeguimientoArea";
import { AppShell, StatCard } from "@/components/AppShell";
import { usePedidos } from "@/lib/taller-db";

export const Route = createFileRoute("/_authenticated/ventas")({
  head: () => ({
    meta: [
      { title: "Área ventas — Aurum Lab" },
      {
        name: "description",
        content:
          "Pedidos listos para atención comercial, coordinación con cliente y entrega en la joyería.",
      },
      { property: "og:title", content: "Área ventas — Aurum Lab" },
      {
        property: "og:description",
        content: "Seguimiento de pedidos asignados al área comercial.",
      },
    ],
  }),
  component: VentasPage,
});

function VentasPage() {
  const { data: pedidos = [] } = usePedidos();
  const enVentas = pedidos.filter((p) => p.area_actual === "Área ventas");

  return (
    <AppShell
      titulo="Área ventas"
      subtitulo="Pedidos listos para coordinar, entregar o cerrar con el cliente"
      acciones={
        <>
          <StatCard etiqueta="En ventas" valor={String(enVentas.length)} />
          <StatCard
            etiqueta="Próximas entregas"
            valor={String(enVentas.filter((p) => Boolean(p.fecha_entrega)).length)}
          />
        </>
      }
    >
      <SeguimientoArea area="Área ventas" />
    </AppShell>
  );
}
