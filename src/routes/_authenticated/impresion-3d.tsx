import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/impresion-3d")({
  head: () => ({
    meta: [{ title: "Impresión 3D — Aurum Lab" }],
  }),
  component: Impresin3DPage,
});

function Impresin3DPage() {
  return (
    <AppShell titulo="Impresión 3D" subtitulo="Módulo en preparación">
      <div className="min-h-24" aria-label="Contenido del módulo vacío" />
    </AppShell>
  );
}
