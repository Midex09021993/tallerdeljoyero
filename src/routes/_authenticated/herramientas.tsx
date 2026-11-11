import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalculadoraAleacionOro } from "@/components/CalculadoraAleacionOro";
import { ConversorTallasAnillo } from "@/components/ConversorTallasAnillo";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft, ChevronLeft, ChevronRight, Calculator, Gem, Ruler, Scale, Send, CircleDot, Sparkles, Download, MonitorDown, Info } from "lucide-react";
import { VisorPesoJoyeria } from "@/components/VisorPesoJoyeria";
import { CalculadoraYeso } from "@/components/CalculadoraYesoAgua";
import { CalculadoraPesoGemas } from "@/components/CalculadoraPesoGemas";
import { AsistenteImpresion3D } from "@/components/AsistenteImpresion3D";

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
    <article className="rounded-2xl border border-border bg-card p-5 shadow-card">
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
  | "impresion"
  | null;

const tarjetaBase =
  "group flex min-h-[220px] w-full flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";

function HerramientasPage() {
  const [herramientaActiva, setHerramientaActiva] = useState<HerramientaInterna>(null);
  const [archivoInicial, setArchivoInicial] = useState<File | null>(null);
  const [archivoOrigen, setArchivoOrigen] = useState<{ ruta: string; proyecto: string } | null>(null);
  const [errorArchivoInicial, setErrorArchivoInicial] = useState<string | null>(null);
  const barraHerramientasRef = useRef<HTMLDivElement>(null);
  const herramientaActivaRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    herramientaActivaRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [herramientaActiva]);

  const desplazarBarra = (direccion: -1 | 1) => {
    barraHerramientasRef.current?.scrollBy({ left: direccion * 260, behavior: "smooth" });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("asistente") === "1" || params.get("herramienta") === "impresion") {
      setHerramientaActiva("impresion");
    } else if (params.get("recuperarPeso") === "1" && window.sessionStorage.getItem("aurum_peso_draft")) {
      setHerramientaActiva("peso");
    }
    const url = params.get("archivoUrl");
    const nombre = params.get("archivoNombre") || "modelo.stl";
    const ruta = params.get("archivoRuta");
    const proyecto = params.get("proyectoNombre") || "";
    if (ruta) setArchivoOrigen({ ruta, proyecto });
    if (!url) return;
    let cancelado = false;
    if (params.get("asistente") !== "1" && params.get("herramienta") !== "impresion") setHerramientaActiva("peso");
    (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("No se pudo descargar el STL desde Mi Nube.");
        const blob = await response.blob();
        const archivo = new File([blob], nombre, { type: "model/stl" });
        if (!cancelado) setArchivoInicial(archivo);
      } catch (error) {
        if (!cancelado) setErrorArchivoInicial(error instanceof Error ? error.message : "No se pudo abrir el archivo.");
      }
    })();
    return () => { cancelado = true; };
  }, []);

  const titulos: Record<Exclude<HerramientaInterna, null>, string> = {
    yeso: "Calculadora de yeso",
    aleacion: "Calculadora de aleación de oro",
    peso: "Visualizador y peso 3D",
    gemas: "Calculadora de peso de gemas",
    tallas: "Conversor de tallas de anillo",
    impresion: "Asistente de impresión 3D",
  };

  const opciones = [
    { id: "yeso" as const, titulo: "Yeso", Icono: Calculator },
    { id: "aleacion" as const, titulo: "Aleación de oro", Icono: Sparkles },
    { id: "peso" as const, titulo: "Peso 3D", Icono: Scale },
    { id: "gemas" as const, titulo: "Peso de gemas", Icono: CircleDot },
    { id: "tallas" as const, titulo: "Tallas de anillo", Icono: Ruler },
    { id: "impresion" as const, titulo: "Impresión 3D", Icono: CircleDot },
  ];

  return (
    <AppShell
      titulo="Herramientas"
      subtitulo="Utilidades técnicas del taller"
      atrasMovil={{ to: "/inicio" }}
    >
      <div className="mx-auto w-full max-w-[1440px] space-y-5">
        <section aria-labelledby="aurum-conect-title" className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold"><MonitorDown className="size-6" /></span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Integración CAD · Rhino 7</p>
                <h2 id="aurum-conect-title" className="mt-1 text-lg font-semibold">AURUM CONECT</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Conecta MatrixGold 3.1 con AURUM RENDER. Descarga el complemento para preparar y transferir el diseño seleccionado desde Rhino 7.</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-muted-foreground">
                  <span className="rounded-full border border-border px-2.5 py-1">MatrixGold 3.1</span>
                  <span className="rounded-full border border-border px-2.5 py-1">Rhino 7</span>
                  <span className="rounded-full border border-border px-2.5 py-1">Windows</span>
                  <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-gold">Beta</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
              <a href="https://raw.githubusercontent.com/Midex09021993/tallerdeljoyero/main/integrations/rhino7-aurum-prototype/Instalar-AURUM-Render-Bridge.bat" download="Instalar-AURUM-CONECT.bat" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
                <Download className="size-4" /> Descargar instalador
              </a>
              <a href="https://github.com/Midex09021993/tallerdeljoyero/blob/main/integrations/rhino7-aurum-prototype/INSTALADOR.md" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:border-gold/50 hover:text-foreground">
                Ver guía de instalación <ArrowLeft className="size-3.5 rotate-180" />
              </a>
            </div>
          </div>
          <div className="flex items-start gap-2 border-t border-border bg-muted/30 px-5 py-3 text-xs leading-5 text-muted-foreground sm:px-6">
            <Info className="mt-0.5 size-4 shrink-0 text-gold" />
            <p>Requiere Rhino 7 y .NET SDK con soporte para .NET Framework 4.8. Esta versión beta debe probarse en el equipo antes de utilizarse en producción; la transferencia y la conservación de todos los ajustes aún requieren validación.</p>
          </div>
        </section>
        <section aria-label="Seleccionar herramienta" className="relative rounded-2xl border border-border bg-card p-2 shadow-card">
          <button type="button" onClick={() => desplazarBarra(-1)} aria-label="Desplazar herramientas a la izquierda" className="absolute left-2 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-border bg-card/95 text-foreground shadow-md backdrop-blur transition hover:border-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><ChevronLeft className="size-4" /></button>
          <div ref={barraHerramientasRef} className="scrollbar-hidden flex gap-2 overflow-x-auto scroll-smooth px-9 [overscroll-behavior-x:contain] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link
              to="/aurum-render"
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
                ref={herramientaActiva === id ? herramientaActivaRef : undefined}
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
          </div>
          <button type="button" onClick={() => desplazarBarra(1)} aria-label="Desplazar herramientas a la derecha" className="absolute right-2 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-border bg-card/95 text-foreground shadow-md backdrop-blur transition hover:border-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><ChevronRight className="size-4" /></button>
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
              {herramientaActiva === "peso" ? <><VisorPesoJoyeria archivoInicial={archivoInicial} archivoOrigen={archivoOrigen} />{errorArchivoInicial && <p role="alert" className="mt-3 text-sm text-destructive">{errorArchivoInicial}</p>}</> : null}
              {herramientaActiva === "gemas" ? <CalculadoraPesoGemas /> : null}
              {herramientaActiva === "tallas" ? <ConversorTallasAnillo /> : null}
              {herramientaActiva === "impresion" ? <AsistenteImpresion3D /> : null}
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
