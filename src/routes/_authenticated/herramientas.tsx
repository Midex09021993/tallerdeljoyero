import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalculadoraAleacionOro } from "@/components/CalculadoraAleacionOro";
import { ConversorTallasAnillo } from "@/components/ConversorTallasAnillo";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft, ChevronLeft, ChevronRight, Calculator, Gem, Ruler, Scale, Send, CircleDot, Sparkles, Download, MonitorDown, Info, ShieldCheck, FileUp, Link2 } from "lucide-react";
import { VisorPesoJoyeria } from "@/components/VisorPesoJoyeria";
import { CalculadoraYeso } from "@/components/CalculadoraYesoAgua";
import { CalculadoraPesoGemas } from "@/components/CalculadoraPesoGemas";
import { AsistenteImpresion3D } from "@/components/AsistenteImpresion3D";
import { AurumCausticsLab } from "@/components/aurum-caustics/AurumCausticsLab";
import { AurumArchitectureExplorer } from "@/components/aurum/AurumArchitectureExplorer";
import { useSesion } from "@/lib/auth";
import { canViewAurumInternalArchitecture } from "@/lib/aurum/aurum-internal-access";


export const Route = createFileRoute("/_authenticated/herramientas")({
  head: () => ({
    meta: [
      { title: "Herramientas — Aurum Lab" },
      { name: "description", content: "Utilidades técnicas para operarios del taller." },
    ],
  }),
  component: HerramientasPage,
});

type HerramientaInterna =
  | "yeso"
  | "aleacion"
  | "peso"
  | "gemas"
  | "tallas"
  | "impresion"
  | "caustics"
  | null;

const tarjetaBase =
  "group flex min-h-[220px] w-full flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";

function HerramientasPage() {
  const { data: sesion } = useSesion();
  const puedeVerTecnologiaInternaAurum = canViewAurumInternalArchitecture(sesion?.participante?.nombre);
  const [herramientaActiva, setHerramientaActiva] = useState<HerramientaInterna>(null);
  const [mostrarIntroAurumRender, setMostrarIntroAurumRender] = useState(false);
  const [mostrarArquitecturaAurum, setMostrarArquitecturaAurum] = useState(false);

  const [mostrarIntroAurumTransfer, setMostrarIntroAurumTransfer] = useState(false);
  const [mostrarIntroAurumConect, setMostrarIntroAurumConect] = useState(false);
  const [mostrarGuiaAurumConect, setMostrarGuiaAurumConect] = useState(false);
  const [paqueteAurumConectDisponible, setPaqueteAurumConectDisponible] = useState(false);
  const [archivoInicial, setArchivoInicial] = useState<File | null>(null);
  const [archivoOrigen, setArchivoOrigen] = useState<{ ruta: string; proyecto: string } | null>(null);
  const [errorArchivoInicial, setErrorArchivoInicial] = useState<string | null>(null);
  const barraHerramientasRef = useRef<HTMLDivElement>(null);
  const herramientaActivaRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    herramientaActivaRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [herramientaActiva]);

  useEffect(() => {
    // El release oficial 1.0.12 se publica desde el repositorio de construcción del complemento.
    setPaqueteAurumConectDisponible(true);
  }, []);

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
    caustics: "AURUM CAUSTICS · Laboratorio óptico",
  };

  const opciones = [
    { id: "yeso" as const, titulo: "Yeso", Icono: Calculator },
    { id: "aleacion" as const, titulo: "Aleación de oro", Icono: Sparkles },
    { id: "peso" as const, titulo: "Peso 3D", Icono: Scale },
    { id: "gemas" as const, titulo: "Peso de gemas", Icono: CircleDot },
    { id: "tallas" as const, titulo: "Tallas de anillo", Icono: Ruler },
    { id: "impresion" as const, titulo: "Impresión 3D", Icono: CircleDot },
    { id: "caustics" as const, titulo: "AURUM CAUSTICS", Icono: Gem },
  ];

  return (
    <AppShell
      titulo="Herramientas"
      subtitulo="Utilidades técnicas del taller"
      atrasMovil={{ to: "/inicio" }}
    >
      <div className="mx-auto w-full max-w-[1440px] space-y-5">
        <section aria-label="Seleccionar herramienta" className="relative rounded-2xl border border-border bg-card p-2 shadow-card">
          <button type="button" onClick={() => desplazarBarra(-1)} aria-label="Desplazar herramientas a la izquierda" className="absolute left-2 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-border bg-card/95 text-foreground shadow-md backdrop-blur transition hover:border-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><ChevronLeft className="size-4" /></button>
          <div ref={barraHerramientasRef} className="scrollbar-hidden flex gap-2 overflow-x-auto scroll-smooth px-9 [overscroll-behavior-x:contain] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => { setHerramientaActiva(null); setMostrarIntroAurumRender(true); setMostrarIntroAurumTransfer(false); setMostrarIntroAurumConect(false); setMostrarGuiaAurumConect(false); }}
              aria-pressed={mostrarIntroAurumRender}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition hover:border-gold/50 hover:text-foreground ${mostrarIntroAurumRender ? "border-gold/40 bg-gold/10 text-gold" : "border-border text-muted-foreground"}`}
            >
              <Gem className="size-4 text-gold" /> Aurum Render
            </button>
            <button
              type="button"
              onClick={() => { setHerramientaActiva(null); setMostrarIntroAurumRender(false); setMostrarIntroAurumTransfer(true); setMostrarIntroAurumConect(false); setMostrarGuiaAurumConect(false); }}
              aria-pressed={mostrarIntroAurumTransfer}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition hover:border-gold/50 hover:text-foreground ${mostrarIntroAurumTransfer ? "border-gold/40 bg-gold/10 text-gold" : "border-border text-muted-foreground"}`}
            >
              <Send className="size-4 text-gold" /> Aurum Transfer
            </button>
            <button
              type="button"
              onClick={() => { setHerramientaActiva(null); setMostrarIntroAurumRender(false); setMostrarIntroAurumTransfer(false); setMostrarIntroAurumConect(true); setMostrarGuiaAurumConect(false); }}
              aria-pressed={mostrarIntroAurumConect}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition hover:border-gold/50 hover:text-foreground ${mostrarIntroAurumConect ? "border-gold/40 bg-gold/10 text-gold" : "border-border text-muted-foreground"}`}
            >
              <MonitorDown className="size-4 text-gold" /> Aurum Conect
            </button>
            {opciones.map(({ id, titulo, Icono }) => (
              <button
                key={id}
                ref={herramientaActiva === id ? herramientaActivaRef : undefined}
                type="button"
                onClick={() => { setHerramientaActiva(id); setMostrarIntroAurumRender(false); setMostrarIntroAurumTransfer(false); setMostrarIntroAurumConect(false); setMostrarGuiaAurumConect(false); }}
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

        {mostrarIntroAurumConect ? (
          <>
            <section aria-labelledby="aurum-conect-rhino7-title" className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold"><MonitorDown className="size-6" /></span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Integración CAD · Rhino 7</p>
                    <h2 id="aurum-conect-rhino7-title" className="mt-1 text-lg font-semibold">AURUM CONECT</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Conecta MatrixGold 3.1 con AURUM RENDER. Instala el complemento .RHP para enviar el documento Rhino completo a AURUM RENDER.</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-muted-foreground"><span className="rounded-full border border-border px-2.5 py-1">MatrixGold 3.1</span><span className="rounded-full border border-border px-2.5 py-1">Rhino 7</span><span className="rounded-full border border-border px-2.5 py-1">Windows x64</span><span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-gold">Beta</span></div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:min-w-[270px]">
                  <a href="https://github.com/Midex09021993/aurum-conect-build/releases/download/v1.0.12/AurumConect-Rhino7-1.0.12.rhp" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><Download className="size-4" /> Descargar complemento Rhino 7 (.RHP)</a>
                  <p className="text-center text-[11px] leading-4 text-muted-foreground">Archivo .RHP listo para instalar desde _PlugInManager.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 border-t border-border bg-muted/30 px-5 py-3 text-xs leading-5 text-muted-foreground sm:px-6"><Info className="mt-0.5 size-4 shrink-0 text-gold" /><p>Requiere Windows de 64 bits, Rhino 7, .NET Framework 4.8 y Microsoft Edge WebView2 Evergreen Runtime x64. MatrixGold 3.1 es necesario solo si trabajarás con ese entorno CAD.</p></div>
            </section>

            <section aria-labelledby="aurum-conect-rhino8-title" className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold"><MonitorDown className="size-6" /></span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Integración CAD · Rhino 8</p>
                    <h2 id="aurum-conect-rhino8-title" className="mt-1 text-lg font-semibold">AURUM CONECT 8</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Complemento nativo precompilado para Rhino 8. Descarga el archivo .RHP y cárgalo desde el administrador de complementos de Rhino.</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-muted-foreground"><span className="rounded-full border border-border px-2.5 py-1">Rhino 8.20+</span><span className="rounded-full border border-border px-2.5 py-1">.NET 8</span><span className="rounded-full border border-border px-2.5 py-1">Windows x64</span><span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-400">Interfaz comprobada · Rhino 8.33</span></div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:min-w-[270px]">
                  <a href="https://raw.githubusercontent.com/Midex09021993/tallerdeljoyero/main/integrations/rhino8-aurum-conect/AurumConect8.rhp" target="_blank" rel="noopener noreferrer" download="AurumConect8.rhp" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><Download className="size-4" /> Descargar complemento Rhino 8 (.RHP)</a>
                  <p className="text-center text-[11px] leading-4 text-muted-foreground">Archivo .RHP precompilado · versión 1.0.0.0.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 border-t border-border bg-muted/30 px-5 py-3 text-xs leading-5 text-muted-foreground sm:px-6"><Info className="mt-0.5 size-4 shrink-0 text-gold" /><p>Requiere Windows de 64 bits, Rhino 8.20 o posterior y Microsoft Edge WebView2 Evergreen Runtime x64. No necesitas instalar .NET SDK 8 ni compilar el complemento.</p></div>
            </section>

            <div className="flex justify-end">
              <button type="button" aria-expanded={mostrarGuiaAurumConect} aria-controls="aurum-conect-guia" onClick={() => setMostrarGuiaAurumConect((visible) => !visible)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:border-gold/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">{mostrarGuiaAurumConect ? "Ocultar guía de instalación" : "Ver guías de instalación"} <ChevronRight className={`size-3.5 transition-transform ${mostrarGuiaAurumConect ? "rotate-90" : ""}`} /></button>
            </div>

            {mostrarGuiaAurumConect ? (
              <section id="aurum-conect-guia" aria-labelledby="aurum-conect-guia-title" className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-7">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Guías integradas · Rhino 7 y Rhino 8</p><h3 id="aurum-conect-guia-title" className="mt-1 text-xl font-semibold">Instala AURUM CONECT paso a paso</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Selecciona las instrucciones correspondientes a la versión de Rhinoceros instalada. Cada complemento se guarda en la carpeta Plug-ins de su propia versión.</p></div>
                <div className="mt-6 grid gap-6 xl:grid-cols-2">
                  <div className="rounded-xl border border-border p-4 sm:p-5">
                    <h4 className="text-base font-semibold">Rhino 7 · Instalación del .RHP</h4>
                    <h5 className="mt-4 font-semibold">Antes de comenzar</h5>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground"><li>• Windows de 64 bits y Rhino 7 de 64 bits.</li><li>• Microsoft Edge WebView2 Evergreen Runtime x64. <a className="font-medium text-gold underline" href="https://aka.ms/MicrosoftEdgeWebView2RuntimeInstallerX64" target="_blank" rel="noopener noreferrer">Descargar desde Microsoft</a>.</li><li>• .NET Framework 4.8.</li><li>• MatrixGold 3.1 si vas a trabajar con ese entorno CAD.</li></ul>
                    <h5 className="mt-4 font-semibold">Instalación en Windows</h5>
                    <ol className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground"><li><strong className="text-foreground">1.</strong> Descarga <code className="rounded bg-muted px-1.5 py-0.5 text-xs">AurumConect-Rhino7-1.0.12.rhp</code>.</li><li><strong className="text-foreground">2.</strong> Copia el archivo en <code className="rounded bg-muted px-1.5 py-0.5 text-xs break-all">C:\Program Files\Rhino 7\Plug-ins</code>. Acepta el permiso de administrador si Windows lo solicita.</li><li><strong className="text-foreground">3.</strong> Abre Rhino 7 y ejecuta <code className="rounded bg-muted px-1.5 py-0.5 text-xs">_PlugInManager</code>.</li><li><strong className="text-foreground">4.</strong> Pulsa «Install», selecciona el archivo .RHP en esa carpeta y confirma que quede habilitado.</li><li><strong className="text-foreground">5.</strong> Ejecuta <code className="rounded bg-muted px-1.5 py-0.5 text-xs">AurumConect</code> para abrir el panel y prueba el envío a AURUM RENDER.</li></ol>
                    <p className="mt-4 text-xs leading-5 text-muted-foreground">Para actualizarlo, cierra Rhino, reemplaza el .RHP anterior por la nueva versión y vuelve a comprobarlo en _PlugInManager.</p>
                  </div>
                  <div className="rounded-xl border border-border p-4 sm:p-5">
                    <h4 className="text-base font-semibold">Rhino 8 · Instalación del .RHP</h4>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Descarga el complemento precompilado para Rhino 8. No uses el archivo de Rhino 7: son complementos distintos. La interfaz de AURUM CONECT 8 ya se abrió correctamente en Rhino 8.33.</p>
                    <h5 className="mt-4 font-semibold">Antes de comenzar</h5>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground"><li>• Windows de 64 bits y Rhino 8.20 o posterior.</li><li>• Microsoft Edge WebView2 Evergreen Runtime x64. <a className="font-medium text-gold underline" href="https://aka.ms/MicrosoftEdgeWebView2RuntimeInstallerX64" target="_blank" rel="noopener noreferrer">Descargar desde Microsoft</a>.</li></ul>
                    <h5 className="mt-4 font-semibold">Instalación en Rhino 8</h5>
                    <ol className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground"><li><strong className="text-foreground">1.</strong> Descarga <code className="rounded bg-muted px-1.5 py-0.5 text-xs">AurumConect8.rhp</code> desde el botón superior y guárdalo en una carpeta permanente.</li><li><strong className="text-foreground">2.</strong> Abre Rhino 8 y ejecuta <code className="rounded bg-muted px-1.5 py-0.5 text-xs">_PlugInManager</code>.</li><li><strong className="text-foreground">3.</strong> Usa la opción para instalar/cargar un complemento, selecciona <code className="rounded bg-muted px-1.5 py-0.5 text-xs">AurumConect8.rhp</code> y confirma la carga.</li><li><strong className="text-foreground">4.</strong> Comprueba que AURUM CONECT 8 esté habilitado y ejecuta <code className="rounded bg-muted px-1.5 py-0.5 text-xs">AurumConect</code> para abrir el panel.</li></ol>
                    <p className="mt-4 text-xs leading-5 text-muted-foreground">La apertura del panel ya se comprobó en Rhino 8.33. La transferencia de geometría desde Rhino 8 todavía debe validarse. El complemento tiene identidad propia y no sustituye al de Rhino 7. Para actualizarlo, cierra Rhino, reemplaza el .RHP anterior por la nueva versión y vuelve a cargarlo desde _PlugInManager.</p>
                  </div>
                </div>
                <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4"><h4 className="font-semibold">Flujo de conexión y seguridad</h4><p className="mt-2 text-sm leading-6 text-muted-foreground">Ambas versiones transfieren una copia temporal del documento mediante un servidor local 127.0.0.1, token criptográfico de un solo uso y caducidad de 3 minutos. El límite de transferencia de AURUM CONECT es 500 MiB. El archivo no se envía a Supabase ni a almacenamiento público. Para enviar cambios posteriores, vuelve a ejecutar el comando de actualización.</p></div>
              </section>
            ) : null}
          </>
        ) : mostrarIntroAurumRender ? (
          <>
          <section className="mx-auto w-full max-w-[1200px] overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-gold/10 via-card to-card px-6 py-10 sm:px-10 sm:py-14">
              <div className="max-w-3xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold">Aurum Lab · Visualización 3D para joyería</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">AURUM RENDER</h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Lleva tus diseños de joyería a una experiencia de visualización 3D. Inspecciona tus piezas, explora sus materiales y presenta cada detalle desde distintos ángulos.
                </p>
              </div>
              <div className="pointer-events-none absolute -right-12 -top-12 hidden size-64 rounded-full border border-gold/20 sm:block" />
              <div className="pointer-events-none absolute -right-3 -top-3 hidden size-44 rounded-full border border-gold/20 sm:block" />
            </div>
            <div className="grid gap-6 p-6 sm:grid-cols-3 sm:p-8">
              <article>
                <div className="mb-3 grid size-10 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold"><Gem className="size-5" /></div>
                <h3 className="font-semibold">Materiales de joyería</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Visualiza metales y gemas con materiales especializados para apreciar sus reflejos, tonos y apariencia.</p>
              </article>
              <article>
                <div className="mb-3 grid size-10 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold"><Sparkles className="size-5" /></div>
                <h3 className="font-semibold">Iluminación y acabado</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Explora la respuesta visual de la pieza mediante entornos e iluminación pensados para la presentación de joyas.</p>
              </article>
              <article>
                <div className="mb-3 grid size-10 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold"><MonitorDown className="size-5" /></div>
                <h3 className="font-semibold">Inspección del diseño</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Rota y observa el modelo para revisar su volumen, proporciones y detalles desde diferentes perspectivas.</p>
              </article>
            </div>
            <div className="flex flex-col items-start justify-between gap-4 border-t border-border bg-muted/20 px-6 py-5 sm:flex-row sm:items-center sm:px-8">
              <div>
                <h3 className="font-semibold">¿Listo para visualizar tu diseño?</h3>
                <p className="mt-1 text-sm text-muted-foreground">Abre Aurum Render cuando hayas terminado de conocer sus funciones.</p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                {puedeVerTecnologiaInternaAurum ? <button
                  type="button"
                  aria-expanded={mostrarArquitecturaAurum}
                  aria-controls="aurum-render-arquitectura"
                  onClick={() => setMostrarArquitecturaAurum((visible) => !visible)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:border-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <Info className="size-4 text-gold" />
                  {mostrarArquitecturaAurum ? "Ocultar tecnología" : "Conocer nuestra tecnología"}
                  <ChevronRight className={`size-4 transition-transform ${mostrarArquitecturaAurum ? "rotate-90" : ""}`} />
                </button> : null}
                <Link to="/aurum-render" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
                  <Gem className="size-4" /> Ir a Aurum Render <ChevronRight className="size-4" />
                </Link>
              </div>
            </div>
          </section>
          {puedeVerTecnologiaInternaAurum && mostrarArquitecturaAurum ? (
            <section id="aurum-render-arquitectura" aria-labelledby="aurum-render-arquitectura-title" className="mx-auto w-full max-w-[1200px] overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <div className="border-b border-border bg-gradient-to-br from-gold/10 via-card to-card px-6 py-7 sm:px-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">Tecnología desarrollada por AURUM LAB</p>
                <h2 id="aurum-render-arquitectura-title" className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">¿Cómo está construido AURUM RENDER?</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Three.js y WebGL forman la base gráfica. Sobre ellos, AURUM RENDER integra contratos modulares, motores especializados, pipelines de importación y geometría, y flujos separados de captura de imagen, vídeo y render final.
                </p>
              </div>
              <AurumArchitectureExplorer />
              <div className="border-t border-border bg-muted/20 px-5 py-4 sm:px-7">
                <h3 className="text-sm font-semibold">Una tecnología que evoluciona desde su propia base</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  AURUM RENDER no es un motor gráfico creado desde cero: es una tecnología de visualización de joyería desarrollada sobre Three.js, con módulos, perfiles y pipelines propios. Estamos evolucionando su arquitectura para separar estos módulos y habilitar extensiones especializadas sin comprometer la calidad visual del motor.
                </p>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">Algunas capacidades ópticas avanzadas continúan en fase experimental; no todas representan todavía simulación física completa.</p>
                <p className="mt-3 text-[11px] font-medium text-muted-foreground">Documentación técnica interna · Acceso exclusivo FADILAB.</p>
              </div>
            </section>
          ) : null}
          </>
        ) : mostrarIntroAurumTransfer ? (
          <section className="mx-auto w-full max-w-[1200px] overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-gold/10 via-card to-card px-6 py-10 sm:px-10 sm:py-14">
              <div className="max-w-3xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold">Aurum Lab · Transferencia segura de archivos</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">AURUM TRANSFER</h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Envía modelos 3D y archivos de fabricación mediante enlaces privados de un solo uso. Prepara tus archivos, genera un enlace y compártelo con quien necesite recibirlos.</p>
              </div>
              <div className="pointer-events-none absolute -right-12 -top-12 hidden size-64 rounded-full border border-gold/20 sm:block" />
              <div className="pointer-events-none absolute -right-3 -top-3 hidden size-44 rounded-full border border-gold/20 sm:block" />
            </div>
            <div className="grid gap-6 p-6 sm:grid-cols-3 sm:p-8">
              <article>
                <div className="mb-3 grid size-10 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold"><ShieldCheck className="size-5" /></div>
                <h3 className="font-semibold">Enlaces privados de un solo uso</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Comparte archivos mediante un enlace privado cuyo acceso se consume al completar la descarga.</p>
              </article>
              <article>
                <div className="mb-3 grid size-10 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold"><FileUp className="size-5" /></div>
                <h3 className="font-semibold">Hasta 10 archivos por envío</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Agrupa modelos y documentos en una transferencia de hasta 2 GB en total.</p>
              </article>
              <article>
                <div className="mb-3 grid size-10 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold"><Link2 className="size-5" /></div>
                <h3 className="font-semibold">Comparte con tu equipo o cliente</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Genera un enlace para entregar diseños y archivos de fabricación sin adjuntar archivos pesados al correo.</p>
              </article>
            </div>
            <div className="flex flex-col items-start justify-between gap-4 border-t border-border bg-muted/20 px-6 py-5 sm:flex-row sm:items-center sm:px-8">
              <div>
                <h3 className="font-semibold">¿Listo para enviar tus archivos?</h3>
                <p className="mt-1 text-sm text-muted-foreground">Abre AURUM Transfer para preparar tu primera transferencia.</p>
              </div>
              <Link to="/transfer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
                <Send className="size-4" /> Ir a Aurum Transfer <ChevronRight className="size-4" />
              </Link>
            </div>
          </section>
        ) : herramientaActiva ? (
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
              {herramientaActiva === "caustics" ? <AurumCausticsLab /> : null}
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

      </div>
    </AppShell>
  );
}