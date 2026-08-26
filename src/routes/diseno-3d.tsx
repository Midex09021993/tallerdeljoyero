import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ColaLista, Panel, StatCard } from "@/components/AppShell";
import { colaDiseno } from "@/data/taller";
import floral from "@/assets/diseno-floral.jpg";
import colgante from "@/assets/diseno-colgante.jpg";
import gemelos from "@/assets/diseno-gemelos.jpg";
import corona from "@/assets/diseno-corona.jpg";

export const Route = createFileRoute("/diseno-3d")({
  head: () => ({
    meta: [
      { title: "Diseño 3D — Aurum Lab" },
      {
        name: "description",
        content: "Cola de modelado CAD del taller: piezas en diseño, versiones y biblioteca de archivos STL.",
      },
      { property: "og:title", content: "Diseño 3D — Aurum Lab" },
      { property: "og:description", content: "Modelado CAD, versiones y biblioteca de piezas del taller." },
    ],
  }),
  component: Diseno3D,
});

const biblioteca = [
  { img: floral, nombre: "Floral_V1.stl", meta: "Elena Sanz · 2,4 MB" },
  { img: colgante, nombre: "Geom_Pendant.stl", meta: "Nuria Báez · 1,1 MB" },
  { img: gemelos, nombre: "Cufflink_04.stl", meta: "Interno · 0,9 MB" },
  { img: corona, nombre: "Crown_Final.stl", meta: "Jorge Prat · 3,8 MB" },
];

function Diseno3D() {
  return (
    <AppShell
      titulo="Diseño 3D"
      subtitulo="Modelado CAD y validación de piezas antes de impresión"
      acciones={
        <>
          <StatCard etiqueta="En modelado" valor="3" />
          <StatCard etiqueta="Pendiente validar" valor="2" />
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel titulo="Cola de modelado" className="lg:col-span-1">
          <ColaLista items={colaDiseno} />
        </Panel>

        <Panel titulo="Biblioteca de archivos" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 p-6 lg:grid-cols-4">
            {biblioteca.map((b) => (
              <article key={b.nombre}>
                <img
                  src={b.img}
                  alt={b.nombre}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="mb-3 aspect-square w-full rounded-xl border border-border object-cover"
                />
                <p className="text-xs font-medium">{b.nombre}</p>
                <p className="text-xs text-muted-foreground">{b.meta}</p>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
