import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Método no permitido.", 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) return errorResponse("Servicio no configurado.", 500);

    const body = await req.json().catch(() => ({}));
    const codigo = String(body?.codigo ?? "").trim().toUpperCase();

    if (!/^[A-Z0-9]{8}$/.test(codigo)) {
      return errorResponse("Código de cotización no válido.", 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: quote, error: quoteError } = await admin
      .from("cotizaciones")
      .select("id,estado")
      .eq("seguimiento_codigo", codigo)
      .in("estado", ["enviada", "aprobada", "rechazada", "vencida"])
      .maybeSingle();

    if (quoteError) {
      console.error("ver-cotizacion-pdf quote", quoteError);
      return errorResponse("No se pudo consultar la cotización.", 500);
    }
    if (!quote) return errorResponse("Cotización no encontrada.", 404);

    const { data: document, error: documentError } = await admin
      .from("cotizacion_documentos_publicos")
      .select("storage_path")
      .eq("cotizacion_id", quote.id)
      .eq("version", (await admin.from("cotizaciones").select("version").eq("id", quote.id).single()).data?.version ?? 0)
      .maybeSingle();

    if (documentError) {
      console.error("ver-cotizacion-pdf document", documentError);
      return errorResponse("No se pudo localizar el PDF.", 500);
    }
    if (!document?.storage_path) return errorResponse("La cotización todavía no tiene un PDF generado.", 404);

    const { data: file, error: downloadError } = await admin.storage
      .from("cotizaciones-publicas")
      .download(document.storage_path);

    if (downloadError || !file) {
      console.error("ver-cotizacion-pdf download", downloadError);
      return errorResponse("No se pudo recuperar el PDF.", 500);
    }

    return new Response(file, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("ver-cotizacion-pdf", error);
    return errorResponse(error instanceof Error ? error.message : "No se pudo abrir el PDF.", 500);
  }
});
