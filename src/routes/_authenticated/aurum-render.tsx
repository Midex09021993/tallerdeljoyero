import { createFileRoute } from "@tanstack/react-router";
import { AurumRenderShell } from "@/components/AurumRenderShell";

export const Route = createFileRoute("/_authenticated/aurum-render")({
  head: () => ({
    meta: [
      { title: "AURUM RENDER — Estudio de Joyería 3D" },
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
    <main className="fixed inset-0 z-50 overflow-auto bg-[#050608]">
      <AurumRenderShell />
    </main>
  );
}
