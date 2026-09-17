import { createFileRoute } from "@tanstack/react-router";
import { AurumRenderShell } from "@/components/AurumRenderShell";

export const Route = createFileRoute("/aurum-render-public")({
  head: () => ({
    meta: [
      { title: "AURUM RENDER — Estudio de Joyería 3D" },
      {
        name: "description",
        content: "Estudio profesional de visualización 3D de joyería de Aurum Lab.",
      },
      { property: "og:title", content: "AURUM RENDER — Estudio de Joyería 3D" },
      {
        property: "og:description",
        content: "Visualiza tu diseño de joyería con materiales y ambientes profesionales.",
      },
    ],
  }),
  component: AurumRenderPublicPage,
});

function AurumRenderPublicPage() {
  return <AurumRenderShell />;
}
