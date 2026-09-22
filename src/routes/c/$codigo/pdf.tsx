import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/c/$codigo/pdf")({
  head: () => ({
    meta: [
      { title: "PDF de cotización — Taller del Joyero" },
      { name: "description", content: "Documento PDF de la cotización compartida." },
    ],
  }),
  component: CotizacionPdf,
});

function CotizacionPdf() {
  const { codigo } = Route.useParams();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let objectUrl: string | null = null;
    let activo = true;

    void (async () => {
      const { data, error: invokeError } = await supabase.functions.invoke("ver-cotizacion-pdf", {
        body: { codigo: codigo.trim().toUpperCase() },
      });

      if (invokeError || !data) {
        if (activo) setError(invokeError?.message ?? "No se pudo abrir el PDF.");
        return;
      }

      if (data instanceof Blob) {
        objectUrl = URL.createObjectURL(data);
        if (activo) setUrl(objectUrl);
      } else if (activo) {
        setError("La respuesta del PDF no es válida.");
      }
    })();

    return () => {
      activo = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [codigo]);

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-surface px-6">
        <div className="text-center">
          <p className="text-sm text-destructive">{error}</p>
          <a href={`/c/${codigo}`} className="mt-3 inline-block text-sm font-medium text-primary underline">
            Volver a la cotización
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface">
      {url ? (
        <iframe title="PDF de cotización" src={url} className="h-screen w-full border-0" />
      ) : (
        <div className="grid min-h-screen place-items-center px-6">
          <p className="text-sm text-muted-foreground">Abriendo PDF…</p>
        </div>
      )}
    </main>
  );
}
