import { createFileRoute, Link } from "@tanstack/react-router";
import { CalculadoraYeso } from "@/routes/_authenticated/taller";

export const Route = createFileRoute("/_authenticated/herramientas")({
  head: () => ({
    meta: [
      { title: "Herramientas — Aurum Lab" },
      {
        name: "description",
        content: "Utilidades técnicas para operarios del taller.",
      },
    ],
  }),
  component: HerramientasPage,
});

function HerramientasPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-8 text-foreground sm:px-6 lg:hidden">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-3xl">Herramientas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Utilidades del taller</p>
        </div>
        <Link
          to="/inicio"
          className="shrink-0 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground"
        >
          ← Atrás
        </Link>
      </header>
      <CalculadoraYeso />
    </main>
  );
}
