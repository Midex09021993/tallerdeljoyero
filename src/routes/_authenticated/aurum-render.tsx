import { createFileRoute } from "@tanstack/react-router";
import { AurumRender } from "@/components/AurumRender";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/aurum-render")({
  head: () => ({
    meta: [
      { title: "AURUM RENDER — Aurum Lab" },
      {
        name: "description",
        content: "Visualizador y renderizador profesional de joyería 3D.",
      },
    ],
  }),
  component: AurumRenderPage,
});

function AurumRenderPage() {
  return (
    <AppShell
      titulo="AURUM RENDER"
      subtitulo="Visualización profesional de joyería 3D"
      atrasMovil={{ to: "/herramientas" }}
    >
      <AurumRender />
    </AppShell>
  );
}
