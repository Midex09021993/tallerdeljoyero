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
import { useSesion } from "@/lib/auth";

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
  const puedeVerTecnologiaInternaAurum = sesion?.participante?.nombre.trim().toLocaleUpperCase() === "FADILAB";
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
    // El release del único .RHP ya está publicado y verificado.
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
                  <section aria-labelledby="aurum-conect-title" className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                    <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
                      <div className="flex items-start gap-4">
                        <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold"><MonitorDown className="size-6" /></span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Integración CAD · Rhino 7</p>
                          <h2 id="aurum-conect-title" className="mt-1 text-lg font-semibold">AURUM CONECT</h2>
                          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Conecta MatrixGold 3.1 con AURUM RENDER. Instala el archivo .RHP para cargar automáticamente el documento Rhino completo en AURUM RENDER.</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-muted-foreground">
                            <span className="rounded-full border border-border px-2.5 py-1">MatrixGold 3.1</span>
                            <span className="rounded-full border border-border px-2.5 py-1">Rhino 7</span>
                            <span className="rounded-full border border-border px-2.5 py-1">Windows</span>
                            <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-gold">Beta</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:min-w-[250px]">
                        {paqueteAurumConectDisponible ? (
                          <a
                            href="https://github.com/Midex09021993/aurum-conect-build/releases/download/v1.0.11/AurumConect-Rhino7-1.0.11.rhp"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                          >
                            <Download className="size-4" /> Descargar complemento para Rhino 7 (.RHP)
                          </a>
                        ) : (
                          <button type="button" disabled aria-disabled="true" className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-muted px-5 py-3 text-sm font-semibold text-muted-foreground opacity-80">
                            <Download className="size-4" /> Descargar AURUM CONECT (.RHP)
                          </button>
                        )}
                        {paqueteAurumConectDisponible ? (
                          <p className="text-center text-[11px] leading-4 text-muted-foreground">Un solo archivo .RHP. Las bibliotecas WebView2 están integradas en el complemento.</p>
                        ) : null}
                        <button type="button" aria-expanded={mostrarGuiaAurumConect} aria-controls="aurum-conect-guia" onClick={() => setMostrarGuiaAurumConect((visible) => !visible)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:border-gold/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
                          {mostrarGuiaAurumConect ? "Ocultar guía" : "Ver guía de instalación"} <ChevronRight className={`size-3.5 transition-transform ${mostrarGuiaAurumConect ? "rotate-90" : ""}`} />
                        </button>
                        {!paqueteAurumConectDisponible ? (
                          <p className="max-w-xs text-[11px] leading-4 text-muted-foreground">Descarga directa de AURUM CONECT 1.0.11 para Rhino 7 x64.</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 border-t border-border bg-muted/30 px-5 py-3 text-xs leading-5 text-muted-foreground sm:px-6">
                      <Info className="mt-0.5 size-4 shrink-0 text-gold" />
                      <p>Requiere Windows de 64 bits, Rhino 7 y Microsoft Edge WebView2 Runtime para la ventana integrada. El archivo .RHP incluye sus bibliotecas WebView2. Microsoft Edge WebView2 Runtime debe estar instalado en Windows para usar la ventana integrada. Versión beta: la carga del complemento y el flujo de transferencia deben validarse en cada entorno Rhino/MatrixGold antes de uso productivo.</p>
                    </div>
                  </section>
                  {mostrarGuiaAurumConect ? (
                    <section id="aurum-conect-guia" aria-labelledby="aurum-conect-guia-title" className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-7">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Guía integrada · Rhino 7</p>
                          <h3 id="aurum-conect-guia-title" className="mt-1 text-xl font-semibold">Instala AURUM CONECT paso a paso</h3>
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Descarga el único archivo .RHP e instálalo desde el administrador de complementos de Rhino 7. La versión 1.0.11 refuerza la recuperación del visor al cambiar el tamaño, minimizar o restaurar la ventana. No necesitas ZIP ni DLL adicionales: las bibliotecas WebView2 están integradas.</p>
                        </div>
                        <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[10px] font-semibold text-gold">Versión beta</span>
                      </div>
                      <div className="mt-6 grid gap-6 lg:grid-cols-2">
                        <div>
                          <h4 className="font-semibold">Antes de comenzar</h4>
                          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                            <li>• Windows de 64 bits y Rhino 7 de 64 bits.</li>
                            <li>• Microsoft Edge WebView2 Evergreen Runtime (x64). <a className="font-medium text-gold underline underline-offset-2" href="https://aka.ms/MicrosoftEdgeWebView2RuntimeInstallerX64" target="_blank" rel="noopener noreferrer">Descargar desde Microsoft</a>.</li>
                            <li>• .NET Framework 4.8, necesario para el complemento Rhino 7 (normalmente ya está instalado con las actualizaciones de Windows).</li>
                            <li>• MatrixGold 3.1 dentro de Rhino 7 si vas a trabajar con ese entorno CAD; no es requisito para abrir Rhino y cargar el complemento.</li>
                            <li>• Conexión a Internet e inicio de sesión en AURUM LAB para abrir AURUM RENDER.</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold">Instalación en Windows</h4>
                          <ol className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                            <li><strong className="text-foreground">1.</strong> Descarga <code className="rounded bg-muted px-1.5 py-0.5 text-xs">AurumConect-Rhino7-1.0.11.rhp</code>.</li>
                            <li><strong className="text-foreground">2.</strong> Guarda el archivo .RHP en una carpeta permanente de tu equipo. Puedes usar la carpeta de complementos de Rhino 7, pero no es obligatorio copiarlo a Program Files.</li>
                            <li><strong className="text-foreground">3.</strong> Abre Rhino 7 y escribe <code className="rounded bg-muted px-1.5 py-0.5 text-xs">_PlugInManager</code> en la línea de comandos.</li>
                            <li><strong className="text-foreground">4.</strong> En _PlugInManager, selecciona «Install» (Instalar), busca <code className="rounded bg-muted px-1.5 py-0.5 text-xs">AurumConect-Rhino7-1.0.11.rhp</code> en la carpeta donde lo guardaste y confirma. Verifica que el complemento quede habilitado.</li>
                            <li><strong className="text-foreground">5.</strong> En la línea de comandos de Rhino escribe <code className="rounded bg-muted px-1.5 py-0.5 text-xs">AurumConect</code>. Debe abrirse el panel AURUM CONECT.</li>
                            <li><strong className="text-foreground">6.</strong> En el panel pulsa «ABRIR AURUM RENDER · CARGAR DOCUMENTO». AURUM CONECT prepara y transfiere automáticamente una copia del documento Rhino completo y abre la ventana integrada. No necesitas seleccionar objetos ni pulsar un segundo botón de envío.</li>
                          </ol>
                        </div>
                      </div>
                      <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
                        <h4 className="font-semibold">¿Dónde queda guardado el complemento?</h4>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">Guarda el .RHP en una ubicación permanente elegida por ti y regístralo desde esa ruta con _PlugInManager. No muevas ni elimines el archivo después de registrarlo; para actualizarlo, cierra Rhino, sustituye la versión anterior y vuelve a registrarla.</p>
                        <h4 className="mt-4 font-semibold">Conexión y primera prueba</h4>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">Abre el panel AURUM CONECT y pulsa «ABRIR AURUM RENDER · CARGAR DOCUMENTO». Se abre la ventana integrada y se transfiere una copia temporal del documento Rhino completo (no solo la selección). No es una sincronización en vivo: para enviar cambios posteriores, vuelve a ejecutar el comando desde el panel.</p>
                      </div>
                      <p className="mt-4 text-xs leading-5 text-muted-foreground">Seguridad y solución de problemas: el complemento no solicita ni almacena tu contraseña. La copia .3dm es temporal y el canal local usa 127.0.0.1, un token de un solo uso y una caducidad de 3 minutos. La versión 1.0.11 sincroniza el viewport en varios ciclos tras maximizar, restaurar, redimensionar o reactivar la ventana y realiza hasta dos intentos de recuperación si WebView2 informa de un fallo de Chromium. Si el visor no se recupera, revisa el registro <code className="rounded bg-muted px-1.5 py-0.5 text-xs">%LOCALAPPDATA%\AurumLab\AurumConect\Logs\AurumConect-1.0.11.log</code>. Si no abre la ventana integrada, instala o repara Microsoft Edge WebView2 Evergreen Runtime x64 y reinicia Rhino. Si el comando AurumConect no existe, verifica en _PlugInManager que el complemento esté instalado y habilitado. Versión 1.0.11 beta.</p>
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
                  Utilizamos Three.js y WebGL como base gráfica y desarrollamos sobre ellos módulos especializados para visualizar joyería: materiales, gemas, iluminación, geometría y captura de alta calidad.
                </p>
              </div>
              <div className="border-b border-border bg-muted/10 px-5 py-6 sm:px-8">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Mapa de arquitectura</p>
                    <h3 className="mt-1 text-lg font-semibold text-foreground">AURUM RENDER · Arquitectura modular</h3>
                  </div>
                  <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[10px] font-semibold text-gold">Evolución por módulos</span>
                </div>
                <div className="mx-auto max-w-4xl">
                  <div className="mx-auto max-w-md rounded-xl border border-gold/40 bg-card px-4 py-3 text-center shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Capa de aplicación</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">AURUM RENDER</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Three.js · WebGL · GPU</p>
                  </div>
                  <div className="mx-auto h-6 w-px bg-border" />
                  <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card px-4 py-3 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Infraestructura común</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">AURUM CORE</p>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="rounded-lg bg-muted/50 px-2 py-2"><p className="text-xs font-semibold">Plugin Registry</p><p className="text-[10px] text-muted-foreground">Dependencias y ciclo de vida</p></div>
                      <div className="rounded-lg bg-muted/50 px-2 py-2"><p className="text-xs font-semibold">Event Bus</p><p className="text-[10px] text-muted-foreground">Comunicación entre módulos</p></div>
                      <div className="rounded-lg bg-muted/50 px-2 py-2"><p className="text-xs font-semibold">Resource Scope</p><p className="text-[10px] text-muted-foreground">Propiedad y liberación</p></div>
                    </div>
                  </div>
                  <div className="mx-auto h-6 w-px bg-border" />
                  <div className="rounded-xl border border-border bg-card p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Adaptadores y motores especializados</p>
                      <p className="text-[10px] text-muted-foreground">Conectado = integración inicial · En evolución = siguiente fase</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3"><p className="text-xs font-semibold">Viewer Adapter</p><p className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-400">Conectado</p></div>
                      <div className="rounded-lg border border-border p-3"><p className="text-xs font-semibold">Scene Adapter</p><p className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-400">Conectado</p></div>
                      <div className="rounded-lg border border-border p-3"><p className="text-xs font-semibold">Light Engine</p><p className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-400">Conectado</p></div>
                      <div className="rounded-lg border border-border p-3"><p className="text-xs font-semibold">Metal Engine</p><p className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-400">Conectado</p></div>
                      <div className="rounded-lg border border-border p-3"><p className="text-xs font-semibold">Gem Engine</p><p className="mt-1 text-[10px] text-muted-foreground">Siguiente fase</p></div>
                      <div className="rounded-lg border border-border p-3"><p className="text-xs font-semibold">Final Render Pipeline</p><p className="mt-1 text-[10px] text-muted-foreground">Siguiente fase</p></div>
                    </div>
                  </div>
                  <div className="mx-auto h-6 w-px bg-border" />
                  <div className="rounded-xl border border-dashed border-border px-4 py-3 text-center">
                    <p className="text-xs font-semibold text-foreground">Recursos de producción</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">Escena · Cámara · Renderer · Controles · Geometría · Materiales · HDRI · GPU</p>
                  </div>
                </div>
                <p className="mx-auto mt-3 max-w-4xl text-[11px] leading-5 text-muted-foreground">Viewer Adapter, Scene Adapter y Lighting Adapter ya exponen el visor, las escenas y el controlador de iluminación mediante contratos estables. Los motores de materiales y gemas siguen funcionando con su implementación actual y se conectarán progresivamente, sin reemplazar ni recalibrar el motor óptico de producción en esta etapa.</p>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-3">
                <article className="rounded-xl border border-border p-4">
                  <div className="mb-3 grid size-9 place-items-center rounded-lg border border-gold/25 bg-gold/10 text-gold"><MonitorDown className="size-4" /></div>
                  <h3 className="text-sm font-semibold">Base gráfica · Three.js + WebGL</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">Gestiona la escena 3D, cámara, geometría y renderizado acelerado por GPU en el navegador.</p>
                </article>
                <article className="rounded-xl border border-border p-4">
                  <div className="mb-3 grid size-9 place-items-center rounded-lg border border-gold/25 bg-gold/10 text-gold"><Gem className="size-4" /></div>
                  <h3 className="text-sm font-semibold">Gem Engine</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">Perfiles por familia de gema, transmisión, índice de refracción, dispersión dinámica y respuesta visual especializada.</p>
                </article>
                <article className="rounded-xl border border-border p-4">
                  <div className="mb-3 grid size-9 place-items-center rounded-lg border border-gold/25 bg-gold/10 text-gold"><Sparkles className="size-4" /></div>
                  <h3 className="text-sm font-semibold">Metal Engine</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">Materiales PBR y perfiles para representar oro, plata, platino y sus diferentes acabados.</p>
                </article>
                <article className="rounded-xl border border-border p-4">
                  <div className="mb-3 grid size-9 place-items-center rounded-lg border border-gold/25 bg-gold/10 text-gold"><Sparkles className="size-4" /></div>
                  <h3 className="text-sm font-semibold">Light & Environment</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">Iluminación de estudio, presets y entornos HDRI diferenciados para metales y gemas.</p>
                </article>
                <article className="rounded-xl border border-border p-4">
                  <div className="mb-3 grid size-9 place-items-center rounded-lg border border-gold/25 bg-gold/10 text-gold"><MonitorDown className="size-4" /></div>
                  <h3 className="text-sm font-semibold">Geometry & Optimization</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">Preparación de modelos, análisis de mallas, aceleración BVH, cachés y calidad adaptativa según la carga.</p>
                </article>
                <article className="rounded-xl border border-border p-4">
                  <div className="mb-3 grid size-9 place-items-center rounded-lg border border-gold/25 bg-gold/10 text-gold"><Gem className="size-4" /></div>
                  <h3 className="text-sm font-semibold">Final Render Pipeline</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">Postprocesamiento y una ruta de captura final especializada que utiliza GPU path tracing.</p>
                </article>
              </div>
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
