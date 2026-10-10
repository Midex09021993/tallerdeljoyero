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

  if (herramientaActiva) {
    const titulos: Record<Exclude<HerramientaInterna, null>, string> = {
      yeso: "Calculadora de yeso",
      aleacion: "Calculadora de aleación de oro",
      peso: "Visualizador y peso 3D",
      gemas: "Calculadora de peso de gemas",
      tallas: "Conversor de tallas de anillo",
    };
    return (
      <AppShell titulo={titulos[herramientaActiva]} subtitulo="Herramientas técnicas de Aurum Lab" atrasMovil={{ to: "/inicio" }}>
        <div className="mb-5">
          <button
            type="button"
            onClick={() => setHerramientaActiva(null)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:border-gold/50"
          >
            <ArrowLeft className="size-4" />
            Todas las herramientas
          </button>
        </div>
        <div className="min-w-0">
          {herramientaActiva === "yeso" ? <CalculadoraYeso /> : null}
          {herramientaActiva === "aleacion" ? <CalculadoraAleacionOro /> : null}
          {herramientaActiva === "peso" ? <VisorPesoJoyeria /> : null}
          {herramientaActiva === "gemas" ? <CalculadoraPesoGemas /> : null}
          {herramientaActiva === "tallas" ? <ConversorTallasAnillo /> : null}
        </div>
      </AppShell>
    );
  }

  const herramientaCard = (
    titulo: string,
    descripcion: string,
    categoria: string,
    Icono: typeof Calculator,
    onClick: () => void,
  ) => (
    <button key={titulo} type="button" onClick={onClick} className={tarjetaBase}>
      <div className="flex w-full items-start justify-between gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
          <Icono className="size-5" />
        </span>
        <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Abrir herramienta
        </span>
      </div>
      <div className="mt-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">{categoria}</p>
        <h3 className="mt-1 text-lg font-semibold leading-snug text-foreground">{titulo}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{descripcion}</p>
      </div>
      <span className="mt-auto pt-5 text-sm font-semibold text-gold">Abrir →</span>
    </button>
  );

  return (
    <AppShell titulo="Herramientas" subtitulo="Utilidades técnicas del taller" atrasMovil={{ to: "/inicio" }}>
      <div className="space-y-8">
        <section className="space-y-4" aria-labelledby="herramientas-disponibles">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
              Aurum Lab
            </p>
            <h2 id="herramientas-disponibles" className="mt-1 text-xl font-semibold">
              Centro de herramientas
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Selecciona una herramienta para abrirla. Todas las opciones mantienen el mismo formato visual.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Link to="/aurum-render-public" className={tarjetaBase}>
              <div className="flex w-full items-start justify-between gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold"><Gem className="size-5" /></span>
                <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Studio 3D</span>
              </div>
              <div className="mt-5">
                <h3 className="text-lg font-semibold text-foreground">Aurum Render</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Visualiza modelos de joyería con materiales y escenarios de renderizado.</p>
              </div>
              <span className="mt-auto pt-5 text-sm font-semibold text-gold">Abrir →</span>
            </Link>

            <Link to="/transfer" className={tarjetaBase}>
              <div className="flex w-full items-start justify-between gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold"><Send className="size-5" /></span>
                <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Archivos</span>
              </div>
              <div className="mt-5">
                <h3 className="text-lg font-semibold text-foreground">Aurum Transfer</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Comparte archivos 3DM, STL y DXF mediante enlaces privados.</p>
              </div>
              <span className="mt-auto pt-5 text-sm font-semibold text-gold">Abrir →</span>
            </Link>

            {herramientaCard("Calculadora de yeso", "Calcula agua y revestimiento según las medidas del cilindro.", "Fundición", Calculator, () => setHerramientaActiva("yeso"))}
            {herramientaCard("Aleación de oro", "Calcula las proporciones de metales para alcanzar la ley deseada.", "Metalurgia", Sparkles, () => setHerramientaActiva("aleacion"))}
            {herramientaCard("Visualizador y peso 3D", "Visualiza la pieza y estima su peso según material y volumen.", "Diseño y peso", Scale, () => setHerramientaActiva("peso"))}
            {herramientaCard("Peso de gemas", "Calcula el peso estimado de piedras según sus medidas y forma.", "Gemología", CircleDot, () => setHerramientaActiva("gemas"))}
            {herramientaCard("Conversor de tallas", "Convierte medidas de anillos entre sistemas de tallaje.", "Medición", Ruler, () => setHerramientaActiva("tallas"))}

            <Link to="/vectorizador-laser" className={tarjetaBase}>
              <div className="flex w-full items-start justify-between gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold"><ScanLine className="size-5" /></span>
                <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fabricación</span>
              </div>
              <div className="mt-5">
                <h3 className="text-lg font-semibold text-foreground">Vectorizador láser</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Convierte imágenes en contornos y exporta geometría SVG o DXF.</p>
              </div>
              <span className="mt-auto pt-5 text-sm font-semibold text-gold">Abrir →</span>
            </Link>
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="herramientas-proximamente">
          <div className="border-t border-border pt-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Próximamente</p>
            <h2 id="herramientas-proximamente" className="mt-1 text-xl font-semibold">Nuevas herramientas</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <ProximamenteCard titulo="Calculadora de volumen" descripcion="Cálculo de volumen para piezas y componentes de joyería." />
            <ProximamenteCard titulo="Conversor de medidas" descripcion="Conversión rápida entre unidades utilizadas en joyería." />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
