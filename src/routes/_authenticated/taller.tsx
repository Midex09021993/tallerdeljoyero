import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/taller")({
  head: () => ({
    meta: [{ title: "Taller — Aurum Lab" }],
  }),
  component: TallerPage,
});

function TallerPage() {
  return (
    <AppShell titulo="Taller" subtitulo="Módulo en preparación">
      <div className="min-h-24" aria-label="Contenido del módulo vacío" />
    </AppShell>
  );
}
