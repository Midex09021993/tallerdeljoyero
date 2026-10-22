import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Printer } from "lucide-react";
import { AsistenteImpresion3D } from "@/components/AsistenteImpresion3D";
import { AreaOperario, PedidosArea } from "@/components/PedidosArea";
import { AppShell, StatCard } from "@/components/AppShell";
import { usePedidosDeArea } from "@/hooks/use-pedidos-area";
import { useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
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
  const [mostrarAsistente, setMostrarAsistente] = useState(false);
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
      ocultarAccionesCelular
      acciones={
        <>
          
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
      <section className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold"><Printer className="size-5" /></span>
            <div>
              <h2 className="font-semibold">Asistente de impresión para joyería</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Inspecciona modelos STL y estima consumo de resina calcinable y coste de máquina antes de preparar la microfusión.</p>
            </div>
          </div>
          <button type="button" onClick={() => setMostrarAsistente((actual) => !actual)} aria-expanded={mostrarAsistente} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gold/50 bg-gold/[0.08] px-4 py-2 text-sm font-semibold transition hover:bg-gold/[0.14]">
            <Printer className="size-4" /> {mostrarAsistente ? "Ocultar asistente" : "Abrir asistente"}
          </button>
        </div>
        {mostrarAsistente && <div className="mt-5 border-t border-border pt-5"><AsistenteImpresion3D /></div>}
      </section>
      <PedidosArea area="Impresión 3D" titulo="Pedidos asignados a Impresión 3D" />
    </AppShell>
  );
}
