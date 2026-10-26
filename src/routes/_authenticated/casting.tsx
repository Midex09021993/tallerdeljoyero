import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/casting")({
  head: () => ({
    meta: [{ title: "Casting — Aurum Lab" }],
  }),
  component: CastingPage,
});

function CastingPage() {
  return (
    <AppShell titulo="Casting" subtitulo="Módulo en preparación">
      <div className="min-h-24" aria-label="Contenido del módulo vacío" />
    </AppShell>
  );
}
