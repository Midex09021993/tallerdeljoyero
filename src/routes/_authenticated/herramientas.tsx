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
  | null;

const tarjetaBase =
  "group flex min-h-[220px] w-full flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";

function HerramientasPage() {
  const [herramientaActiva, setHerramientaActiva] = useState<HerramientaInterna>(null);
  const [mostrarIntroAurumRender, setMostrarIntroAurumRender] = useState(false);
  const [mostrarIntroAurumTransfer, setMostrarIntroAurumTransfer] = useState(false);
  const [mostrarIntroAurumConect, setMostrarIntroAurumConect] = useState(false);
  const [mostrarGuiaAurumConect, setMostrarGuiaAurumConect] = useState(false);
  const [pluginAurumConectDisponible, setPluginAurumConectDisponible] = useState(false);
  const [archivoInicial, setArchivoInicial] = useState<File | null>(null);
  const [archivoOrigen, setArchivoOrigen] = useState<{ ruta: string; proyecto: string } | null>(null);
  const [errorArchivoInicial, setErrorArchivoInicial] = useState<string | null>(null);
  const barraHerramientasRef = useRef<HTMLDivElement>(null);
  const herramientaActivaRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    herramientaActivaRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [herramientaActiva]);

  useEffect(() => {
    const controller = new AbortController();
    const pluginUrl = "/downloads/AurumConect-Rhino7-1.0.0.zip";

    fetch(pluginUrl, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
        setPluginAurumConectDisponible(
          response.ok &&
          !contentType.includes("text/html")
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setPluginAurumConectDisponible(false);
      });

    return () => controller.abort();
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
                  <section aria-labelledby="aurum-conect-title" className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                    <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
                      <div className="flex items-start gap-4">
                        <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold"><MonitorDown className="size-6" /></span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Integración CAD · Rhino 7</p>
                          <h2 id="aurum-conect-title" className="mt-1 text-lg font-semibold">AURUM CONECT</h2>
                          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Conecta MatrixGold 3.1 con AURUM RENDER. Instala el complemento para transferir diseños seleccionados desde Rhino 7 a AURUM RENDER.</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-muted-foreground">
                            <span className="rounded-full border border-border px-2.5 py-1">MatrixGold 3.1</span>
                            <span className="rounded-full border border-border px-2.5 py-1">Rhino 7</span>
                            <span className="rounded-full border border-border px-2.5 py-1">Windows</span>
                            <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-gold">Beta</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                        <div className="flex flex-col gap-1">
                          {pluginAurumConectDisponible ? (
                            <a
                              href="/downloads/AurumConect-Rhino7-1.0.0.zip"
                              download="AurumConect-Rhino7-1.0.0.zip"
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                            >
                              <Download className="size-4" /> Descargar AURUM CONECT (.ZIP)
                            </a>
                          ) : (
                            <>
                              <button type="button" disabled aria-disabled="true" className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-muted px-5 py-3 text-sm font-semibold text-muted-foreground opacity-80">
                                <Download className="size-4" /> Complemento no disponible
                              </button>
                              <p className="max-w-xs text-[11px] leading-4 text-muted-foreground">No se encontró el complemento compilado. Inténtalo nuevamente más tarde.</p>
                            </>
                          )}
                        </div>
                        <button type="button" aria-expanded={mostrarGuiaAurumConect} aria-controls="aurum-conect-guia" onClick={() => setMostrarGuiaAurumConect((visible) => !visible)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:border-gold/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
                          {mostrarGuiaAurumConect ? "Ocultar guía" : "Ver guía de instalación"} <ChevronRight className={`size-3.5 transition-transform ${mostrarGuiaAurumConect ? "rotate-90" : ""}`} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 border-t border-border bg-muted/30 px-5 py-3 text-xs leading-5 text-muted-foreground sm:px-6">
                      <Info className="mt-0.5 size-4 shrink-0 text-gold" />
                      <p>Requiere Windows de 64 bits, Rhino 7 y Microsoft Edge WebView2 Runtime. El complemento se distribuye ya compilado; no necesitas Git ni .NET SDK. Versión beta: la carga del complemento y el flujo de transferencia deben validarse en cada entorno Rhino/MatrixGold antes de uso productivo.</p>
                    </div>
                  </section>
                  {mostrarGuiaAurumConect ? (
                    <section id="aurum-conect-guia" aria-labelledby="aurum-conect-guia-title" className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-7">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Guía integrada · Rhino 7</p>
                          <h3 id="aurum-conect-guia-title" className="mt-1 text-xl font-semibold">Instala AURUM CONECT paso a paso</h3>
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Descarga el paquete ZIP, extrae todos sus archivos juntos e instala el .RHP desde esa carpeta.</p>
                        </div>
                        <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[10px] font-semibold text-gold">Versión beta</span>
                      </div>
                      <div className="mt-6 grid gap-6 lg:grid-cols-2">
                        <div>
                          <h4 className="font-semibold">Antes de comenzar</h4>
                          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                            <li>• Windows con Rhino 7 instalado.</li>
                            <li>• Rhino 7 de 64 bits instalado en Windows.</li>
                            <li>• MatrixGold 3.1 instalado dentro de Rhino 7 para el flujo CAD previsto.</li>
                            <li>• Conexión a Internet para acceder a AURUM LAB.</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold">Instalación en Windows</h4>
                          <ol className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                            <li><strong className="text-foreground">1.</strong> Descarga <code className="rounded bg-muted px-1.5 py-0.5 text-xs">AurumConect-Rhino7-1.0.0.rhp</code> desde el botón de esta tarjeta y guárdalo en una carpeta permanente.</li>
                            <li><strong className="text-foreground">2.</strong> Abre Rhino 7 y escribe <code className="rounded bg-muted px-1.5 py-0.5 text-xs">_PlugInManager</code> en la línea de comandos.</li>
                            <li><strong className="text-foreground">3.</strong> En el administrador, pulsa «Install», busca `AurumConect-Rhino7-1.0.0.rhp` dentro de la carpeta extraída y confirma.</li>
                            <li><strong className="text-foreground">4.</strong> Si Windows bloquea el archivo, abre Propiedades del .RHP, marca «Desbloquear» y aplica. Conserva las DLL junto al .RHP.</li>
                            <li><strong className="text-foreground">5.</strong> Ejecuta <code className="rounded bg-muted px-1.5 py-0.5 text-xs">AurumConect</code> en la línea de comandos para abrir el panel AURUM CONECT.</li>
                            <li><strong className="text-foreground">6.</strong> Pulsa «ABRIR AURUM RENDER» para abrir el visor Chromium vinculado a Rhino. Para enviar una selección, pulsa «ENVIAR DISEÑO».</li>
                          </ol>
                        </div>
                      </div>
                      <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
                        <h4 className="font-semibold">Conexión con AURUM RENDER</h4>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">Abre el panel AURUM CONECT y pulsa «ABRIR AURUM RENDER». Inicia sesión en la ventana Chromium. Después selecciona geometría en Rhino/MatrixGold y pulsa «ENVIAR DISEÑO»; la misma ventana recibe el modelo. La transferencia directa está en fase beta y debe validarse con el botón de recepción de AURUM RENDER y los permisos de red local de Chrome.</p>
                      </div>
                      <p className="mt-4 text-xs leading-5 text-muted-foreground">Seguridad: el complemento no solicita ni almacena tu contraseña. La copia .3dm es temporal y el canal local usa 127.0.0.1, un token de un solo uso y una caducidad de 3 minutos. La versión beta debe validarse en cada entorno Rhino/MatrixGold antes de su uso productivo.</p>
                    </section>
                  ) : null}
          </>
        ) : mostrarIntroAurumRender ? (
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
              <Link to="/aurum-render" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
                <Gem className="size-4" /> Ir a Aurum Render <ChevronRight className="size-4" />
              </Link>
            </div>
          </section>
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
