import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Download, ExternalLink, Info, MonitorDown } from "lucide-react";

const scriptUrl =
  "https://raw.githubusercontent.com/Midex09021993/tallerdeljoyero/main/integrations/rhino7-aurum-prototype/AurumRenderBridge.py";
const sourceUrl =
  "https://github.com/Midex09021993/tallerdeljoyero/blob/main/integrations/rhino7-aurum-prototype/AurumRenderBridge.py";
const guideUrl =
  "https://github.com/Midex09021993/tallerdeljoyero/blob/main/integrations/rhino7-aurum-prototype/README.md";

export const Route = createFileRoute("/_authenticated/aurum-render-plugin")({
  head: () => ({
    meta: [
      { title: "Complemento Rhino — AURUM Render" },
      { name: "description", content: "Descarga y guía del prototipo de integración AURUM Render para Rhino 7." },
    ],
  }),
  component: AurumRenderPluginPage,
});

function AurumRenderPluginPage() {
  return (
    <main className="min-h-screen bg-[#08090b] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-3xl">
        <a href="/aurum-render" className="inline-flex items-center gap-2 text-sm text-white/65 transition hover:text-white">
          <ArrowLeft className="size-4" /> Volver a AURUM Render
        </a>

        <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#111316]">
          <div className="border-b border-white/10 bg-gradient-to-br from-[#242019] to-[#111316] p-6 sm:p-9">
            <div className="flex items-center gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl border border-[#c7a45b]/40 bg-[#c7a45b]/10 text-[#d8b66c]">
                <MonitorDown className="size-7" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d8b66c]">AURUM LAB · Integraciones</p>
                <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">AURUM Render Bridge</h1>
                <p className="mt-1 text-sm text-white/60">Rhino 7 · Prototipo inicial</p>
              </div>
            </div>
            <p className="mt-6 max-w-2xl text-sm leading-6 text-white/70">
              Prepara una copia de los objetos seleccionados en Rhino 7 y abre AURUM Render en el navegador. Esta versión es un script de prueba, no un instalador de Rhino.
            </p>
          </div>

          <div className="space-y-5 p-6 sm:p-9">
            <div className="flex gap-3 rounded-2xl border border-amber-200/20 bg-amber-100/5 p-4 text-sm leading-6 text-white/75">
              <Info className="mt-0.5 size-5 shrink-0 text-[#d8b66c]" />
              <p><strong className="text-white">Estado experimental.</strong> La carga automática y la transferencia segura hacia el editor web aún no están conectadas. No se ha validado en una instalación real de MatrixGold 3.1.</p>
            </div>

            <div>
              <h2 className="font-semibold">Descargar el script</h2>
              <p className="mt-1 text-sm leading-6 text-white/60">Guarda el archivo Python y ejecútalo desde el editor de scripts de Rhino 7. El documento original no debería modificarse; el prototipo crea una copia temporal.</p>
              <a
                href={scriptUrl}
                className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#c7a45b] px-5 py-3 text-sm font-semibold text-[#17130b] transition hover:bg-[#d9bb79]"
              >
                <Download className="size-4" /> Descargar script (.py)
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <a href={guideUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-4 text-sm transition hover:bg-white/5">
                <span><strong className="block">Guía de instalación</strong><span className="mt-1 block text-white/55">Pasos y limitaciones</span></span>
                <ExternalLink className="size-4 shrink-0 text-white/50" />
              </a>
              <a href={sourceUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-4 text-sm transition hover:bg-white/5">
                <span><strong className="block">Ver código fuente</strong><span className="mt-1 block text-white/55">Repositorio oficial</span></span>
                <ExternalLink className="size-4 shrink-0 text-white/50" />
              </a>
            </div>
          </div>
        </section>
        <p className="mt-5 text-center text-xs leading-5 text-white/35">AURUM Render Bridge · Prototipo no certificado · Usa una copia de seguridad de tus archivos CAD.</p>
      </div>
    </main>
  );
}
