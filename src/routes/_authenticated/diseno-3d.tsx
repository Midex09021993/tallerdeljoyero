import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/diseno-3d")({
  head: () => ({
    meta: [{ title: "Diseño 3D — Aurum Lab" }],
  }),
  component: Diseo3DPage,
});

function Diseo3DPage() {
  return (
    <AppShell titulo="Diseño 3D" subtitulo="Módulo en preparación">
      <div className="min-h-24" aria-label="Contenido del módulo vacío" />
    </AppShell>
  );
}
