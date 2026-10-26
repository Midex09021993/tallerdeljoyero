import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/corte-laser")({
  head: () => ({
    meta: [{ title: "Corte Láser — Aurum Lab" }],
  }),
  component: CorteLserPage,
});

function CorteLserPage() {
  return (
    <AppShell titulo="Corte Láser" subtitulo="Módulo en preparación">
      <div className="min-h-24" aria-label="Contenido del módulo vacío" />
    </AppShell>
  );
}
