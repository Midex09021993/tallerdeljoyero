import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RadarProduccion } from "@/components/RadarProduccion";

export const Route = createFileRoute("/_authenticated/monitor")({
  head: () => ({
    meta: [
      { title: "Centro de supervisión — Aurum Lab" },
      {
        name: "description",
        content:
          "Radar operativo del taller de joyería: trabajos, estados, prioridades e incidencias.",
      },
      { property: "og:title", content: "Centro de supervisión — Aurum Lab" },
      {
        property: "og:description",
        content: "Seguimiento operativo de la producción del taller.",
      },
    ],
  }),
  component: MonitorPage,
});

function MonitorPage() {
  return (
    <AppShell
      titulo="Centro de supervisión"
      subtitulo="Radar de producción"
    >
      <RadarProduccion />
    </AppShell>
  );
}
