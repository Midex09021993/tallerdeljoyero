import { createFileRoute, Link } from "@tanstack/react-router";
import { CalculadoraAleacionOro } from "@/components/CalculadoraAleacionOro";
import { ConversorTallasAnillo } from "@/components/ConversorTallasAnillo";
import { MobileBackButton } from "@/components/AppShell";
import { Gem } from "lucide-react";
import { VisorPesoJoyeria } from "@/components/VisorPesoJoyeria";
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
      <header className="sticky top-0 z-30 -mx-4 mb-3 flex items-center justify-between gap-3 bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="min-w-0">
          <h1 className="truncate font-display text-3xl">Herramientas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Utilidades del taller</p>
        </div>
        <MobileBackButton atrasMovil={{ to: "/inicio" }} />
      </header>
      <div className="space-y-6">
        <Link to="/aurum-render" className="flex items-center gap-3 rounded-2xl border border-gold/30 bg-ink px-4 py-4 text-ink-foreground shadow-card transition hover:border-gold">
          <Gem className="size-5 text-gold" aria-hidden="true" />
          <span className="flex-1"><span className="block font-display text-lg italic text-gold">AURUM RENDER</span><span className="block text-xs text-ink-foreground/50">Visualizador profesional de joyería 3D</span></span>
          <span className="text-gold">→</span>
        </Link>
        <CalculadoraYeso />
        <CalculadoraAleacionOro />
        <VisorPesoJoyeria />
        <ConversorTallasAnillo />
      </div>
    </main>
  );
}
