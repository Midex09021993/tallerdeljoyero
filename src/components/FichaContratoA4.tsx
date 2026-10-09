import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ContratoVista = {
  id: string;
  numero: string;
  cliente: string;
  telefono?: string | null;
  total: number;
  abonado: number;
  saldo: number;
  sede_id?: string | null;
  sede_nombre?: string | null;
  notas?: string | null;
  created_at?: string | null;
};

export function FichaContratoA4({ contrato }: { contrato: ContratoVista }) {
  const [abierta, setAbierta] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function abrirVistaPrevia() {
    if (generando) return;
    setGenerando(true);
    setError("");
    try {
      // La vista previa muestra el mismo archivo PDF que se descarga y comparte.
      // La Edge Function conserva la autorización, la trazabilidad y el almacenamiento actuales.
      const { data, error: pdfError } = await supabase.functions.invoke("generar-contrato-pdf", {
        body: { contrato_id: contrato.id, accion: "generar" },
      });
      if (pdfError || !data?.url) {
        setError(data?.error ?? pdfError?.message ?? "No se pudo generar el PDF del contrato.");
        return;
      }
      setPdfUrl(data.url as string);
      setAbierta(true);
    } catch {
      setError("No se pudo generar el PDF del contrato. Inténtalo nuevamente.");
    } finally {
      setGenerando(false);
    }
  }

  return <>
    <button type="button" onClick={() => void abrirVistaPrevia()} disabled={generando}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-surface-muted disabled:opacity-50">
      {generando ? "Preparando PDF…" : "Vista previa A4 (PDF real)"}
    </button>
    {error ? <p role="alert" className="mt-2 max-w-sm text-xs text-destructive">{error}</p> : null}
    {abierta && pdfUrl ? <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900/90 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Vista previa A4 del contrato">
      <div className="mx-auto mb-3 flex w-full max-w-[210mm] justify-end gap-2">
        <a href={pdfUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow">Abrir PDF</a>
        <button type="button" onClick={() => setAbierta(false)} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow">
          <X size={16}/> Cerrar vista previa
        </button>
      </div>
      <iframe title="Vista previa del PDF de contrato" src={pdfUrl} className="mx-auto min-h-0 w-full max-w-[210mm] flex-1 rounded bg-white shadow-2xl" />
    </div> : null}
  </>;
}
