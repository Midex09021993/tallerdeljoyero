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
        <Link
          to="/aurum-render"
          className="group block overflow-hidden rounded-2xl border border-gold/25 bg-ink text-ink-foreground shadow-card transition hover:border-gold/60 hover:shadow-lg"
        >
          <div className="relative flex min-h-[180px] items-end overflow-hidden bg-[radial-gradient(circle_at_65%_35%,rgba(215,173,72,.18),transparent_32%),radial-gradient(circle_at_35%_70%,rgba(255,255,255,.07),transparent_28%),#090b0e] p-6">
            <div className="absolute right-8 top-8 grid size-24 place-items-center rounded-full border border-gold/20 bg-gold/10 text-gold transition group-hover:scale-105">
              <Gem className="size-10" />
            </div>
            <div className="relative z-10">
              <div className="mb-2 text-[10px] uppercase tracking-[.25em] text-gold/70">Studio 3D</div>
              <h2 className="font-display text-3xl italic text-gold">AURUM RENDER</h2>
              <p className="mt-1 max-w-xs text-sm text-ink-foreground/55">
                Visualiza tus modelos de joyería con materiales y escenarios premium.
              </p>
              <span className="mt-5 inline-flex items-center rounded-xl border border-gold/30 bg-gold/10 px-4 py-2 text-xs font-semibold text-gold transition group-hover:bg-gold group-hover:text-black">
                Abrir Studio 3D →
              </span>
            </div>
          </div>
        </Link>
        <CalculadoraYeso />
        <CalculadoraAleacionOro />
        <VisorPesoJoyeria />
        <ConversorTallasAnillo />
      </div>
    </main>
  );
}
