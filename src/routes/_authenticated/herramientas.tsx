import { createFileRoute, Link } from "@tanstack/react-router";
import { CalculadoraAleacionOro } from "@/components/CalculadoraAleacionOro";
import { ConversorTallasAnillo } from "@/components/ConversorTallasAnillo";
import { AppShell } from "@/components/AppShell";
import { Gem, ScanLine, Send } from "lucide-react";
import { VisorPesoJoyeria } from "@/components/VisorPesoJoyeria";
import { CalculadoraYeso } from "@/routes/_authenticated/taller";
import { CalculadoraPesoGemas } from "@/components/CalculadoraPesoGemas";

export const Route = createFileRoute("/_authenticated/herramientas")({
  head: () => ({
    meta: [
      { title: "Herramientas — Aurum Lab" },
      { name: "description", content: "Utilidades técnicas para operarios del taller." },
    ],
  }),
  component: HerramientasPage,
});

function ProximamenteCard({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 opacity-75 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Próximamente
          </span>
          <h3 className="mt-2 text-lg font-semibold">{titulo}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-surface-muted px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          En desarrollo
        </span>
      </div>
    </article>
  );
}

function HerramientasPage() {
  return (
    <AppShell titulo="Herramientas" subtitulo="Utilidades del taller" atrasMovil={{ to: "/inicio" }}>
      <div className="space-y-8">
        <section className="space-y-4" aria-labelledby="herramientas-disponibles">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
              Herramientas disponibles
            </p>
            <h2 id="herramientas-disponibles" className="mt-1 text-xl font-semibold">
              Listas para usar
            </h2>
          </div>

          <div className="space-y-5">
            <Link
              to="/aurum-render-public"
              className="group block overflow-hidden rounded-2xl border border-gold/25 bg-card text-foreground shadow-card transition hover:border-gold/60 hover:shadow-raised"
            >
              <div className="relative flex min-h-[180px] items-end overflow-hidden bg-[radial-gradient(circle_at_78%_25%,rgba(190,151,72,.12),transparent_30%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--background)))] p-6">
                <div className="absolute right-8 top-8 grid size-24 place-items-center rounded-full border border-gold/20 bg-gold/10 text-gold transition group-hover:scale-105">
                  <Gem className="size-10" />
                </div>
                <div className="relative z-10">
                  <div className="mb-2 text-[10px] uppercase tracking-[.25em] text-gold/70">Studio 3D</div>
                  <h2 className="font-display text-3xl italic text-gold">AURUM RENDER</h2>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                    Visualiza tus modelos de joyería con materiales y escenarios premium.
                  </p>
                  <span className="mt-5 inline-flex items-center rounded-xl border border-gold/30 bg-gold/10 px-4 py-2 text-xs font-semibold text-gold transition group-hover:bg-gold group-hover:text-gold-foreground">
                    Abrir Studio 3D →
                  </span>
                </div>
              </div>
            </Link>

            <Link
              to="/transfer"
              className="group block overflow-hidden rounded-2xl border border-gold/25 bg-ink text-ink-foreground shadow-card transition hover:border-gold/60 hover:shadow-lg"
            >
              <div className="relative flex min-h-[180px] items-end overflow-hidden bg-[radial-gradient(circle_at_78%_25%,rgba(190,151,72,.12),transparent_30%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--background)))] p-6">
                <div className="absolute right-8 top-8 grid size-24 place-items-center rounded-full border border-gold/20 bg-gold/10 text-gold transition group-hover:scale-105">
                  <Send className="size-9" />
                </div>
                <div className="relative z-10">
                  <div className="mb-2 text-[10px] uppercase tracking-[.25em] text-gold/70">Compartir archivos</div>
                  <h2 className="font-display text-3xl italic text-gold">AURUM TRANSFER</h2>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">Envía 3DM, STL, DXF y archivos de fabricación con un enlace privado de un solo uso.</p>
                  <span className="mt-5 inline-flex items-center rounded-xl border border-gold/30 bg-gold/10 px-4 py-2 text-xs font-semibold text-gold transition group-hover:bg-gold group-hover:text-gold-foreground">
                    Transferir archivos →
                  </span>
                </div>
              </div>
            </Link>

            <CalculadoraYeso />
            <CalculadoraAleacionOro />
            <VisorPesoJoyeria />
            <CalculadoraPesoGemas />
            <ConversorTallasAnillo />
            <Link
              to="/vectorizador-laser"
              className="group block rounded-2xl border border-gold/25 bg-card p-5 shadow-card transition hover:border-gold/60 hover:shadow-raised"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">Corte Láser</p>
                  <h2 className="mt-1 text-xl font-semibold">Vectorizador Láser</h2>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                    Convierte imágenes en contornos cerrados y exporta geometría SVG o DXF para fabricación.
                  </p>
                </div>
                <ScanLine className="size-6 shrink-0 text-gold transition group-hover:scale-105" />
              </div>
              <span className="mt-4 inline-flex rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-gold-foreground">
                Abrir vectorizador →
              </span>
            </Link>
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="herramientas-proximamente">
          <div className="border-t border-border pt-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Próximamente
            </p>
            <h2 id="herramientas-proximamente" className="mt-1 text-xl font-semibold">
              Nuevas herramientas
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ProximamenteCard
              titulo="Calculadora de Volumen"
              descripcion="Cálculo de volumen para piezas y componentes de joyería."
            />
            <ProximamenteCard
              titulo="Conversor de Medidas"
              descripcion="Conversión rápida entre unidades de medida utilizadas en joyería."
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
