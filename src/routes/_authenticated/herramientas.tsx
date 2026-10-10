import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalculadoraAleacionOro } from "@/components/CalculadoraAleacionOro";
import { ConversorTallasAnillo } from "@/components/ConversorTallasAnillo";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft, Calculator, Gem, Ruler, ScanLine, Scale, Sparkles, Send, CircleDot } from "lucide-react";
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

type HerramientaInterna =
  | "yeso"
  | "aleacion"
  | "peso"
  | "gemas"
  | "tallas"
  | null;

const tarjetaBase =
  "group flex min-h-[220px] w-full flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";

function HerramientasPage() {
  const [herramientaActiva, setHerramientaActiva] = useState<HerramientaInterna>(null);

  const titulos: Record<Exclude<HerramientaInterna, null>, string> = {
    yeso: "Calculadora de yeso",
    aleacion: "Calculadora de aleación de oro",
    peso: "Visualizador y peso 3D",
    gemas: "Calculadora de peso de gemas",
    tallas: "Conversor de tallas de anillo",
  };

  const opciones = [
    { id: "yeso" as const, titulo: "Yeso", Icono: Calculator },
    { id: "aleacion" as const, titulo: "Aleación de oro", Icono: Sparkles },
    { id: "peso" as const, titulo: "Peso 3D", Icono: Scale },
    { id: "gemas" as const, titulo: "Peso de gemas", Icono: CircleDot },
    { id: "tallas" as const, titulo: "Tallas de anillo", Icono: Ruler },
  ];

  return (
    <AppShell
      titulo="Herramientas"
      subtitulo="Utilidades técnicas del taller"
      atrasMovil={{ to: "/inicio" }}
    >
      <div className="mx-auto w-full max-w-[1440px] space-y-5">
        <section aria-label="Seleccionar herramienta" className="rounded-2xl border border-border bg-card p-2 shadow-card">
          <div className="scrollbar-hidden flex gap-2 overflow-x-auto">
            <Link
              to="/aurum-render-public"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border px-3.5 text-sm font-medium text-muted-foreground transition hover:border-gold/50 hover:text-foreground"
            >
              <Gem className="size-4 text-gold" /> Aurum Render
            </Link>
            <Link
              to="/transfer"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border px-3.5 text-sm font-medium text-muted-foreground transition hover:border-gold/50 hover:text-foreground"
            >
              <Send className="size-4 text-gold" /> Aurum Transfer
            </Link>
            {opciones.map(({ id, titulo, Icono }) => (
              <button
                key={id}
                type="button"
                onClick={() => setHerramientaActiva(id)}
                aria-pressed={herramientaActiva === id}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                  herramientaActiva === id
                    ? "border-gold/40 bg-gold/10 text-gold"
                    : "border-border text-muted-foreground hover:border-gold/50 hover:text-foreground"
                }`}
              >
                <Icono className="size-4" />
                {titulo}
              </button>
            ))}
            <Link
              to="/vectorizador-laser"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border px-3.5 text-sm font-medium text-muted-foreground transition hover:border-gold/50 hover:text-foreground"
            >
              <ScanLine className="size-4 text-gold" /> Vectorizador láser
            </Link>
          </div>
        </section>

        {herramientaActiva ? (
          <section className="mx-auto min-h-[680px] w-full max-w-[1200px] overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-card sm:p-5 lg:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Aurum Lab · Herramienta activa</p>
                <h2 className="mt-1 text-xl font-semibold">{titulos[herramientaActiva]}</h2>
              </div>
              <button
                type="button"
                onClick={() => setHerramientaActiva(null)}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground transition hover:border-gold/50 hover:text-foreground"
              >
                <ArrowLeft className="size-4" /> Volver al catálogo
              </button>
            </div>
            <div className="mx-auto min-h-[560px] w-full min-w-0 max-w-full [&>*]:!mx-auto [&>*]:!w-full [&>*]:!max-w-full">
              {herramientaActiva === "yeso" ? <CalculadoraYeso /> : null}
              {herramientaActiva === "aleacion" ? <CalculadoraAleacionOro /> : null}
              {herramientaActiva === "peso" ? <VisorPesoJoyeria /> : null}
              {herramientaActiva === "gemas" ? <CalculadoraPesoGemas /> : null}
              {herramientaActiva === "tallas" ? <ConversorTallasAnillo /> : null}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-border bg-card/50 px-5 py-12 text-center sm:py-16">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-gold/25 bg-gold/10 text-gold">
              <Calculator className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Selecciona una herramienta</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Usa la barra superior para cambiar de herramienta. El área de trabajo mantiene un marco y ancho comunes.
            </p>
          </section>
        )}

        <section className="border-t border-border pt-5" aria-labelledby="herramientas-proximamente">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Próximamente</p>
          <h2 id="herramientas-proximamente" className="mt-1 text-lg font-semibold">Nuevas herramientas</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ProximamenteCard titulo="Calculadora de volumen" descripcion="Cálculo de volumen para piezas y componentes de joyería." />
            <ProximamenteCard titulo="Conversor de medidas" descripcion="Conversión rápida entre unidades utilizadas en joyería." />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
