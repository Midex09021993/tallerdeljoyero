import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) return json({ error: "Descargas digitales no configuradas." }, 503);

    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Inicia sesión para acceder a tus compras." }, 401);

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "La sesión no es válida." }, 401);

    const body = await req.json().catch(() => ({}));
    const compraId = String(body?.compra_id ?? "").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(compraId)) {
      return json({ error: "La compra indicada no es válida." }, 400);
    }

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: compra, error: compraError } = await admin
      .from("compras_archivos_digitales")
      .select("id, archivo_id, comprador_usuario_id, estado_pago")
      .eq("id", compraId)
      .eq("comprador_usuario_id", userData.user.id)
      .maybeSingle();
    if (compraError) throw compraError;
    if (!compra) return json({ error: "No encontramos esa compra en tu cuenta." }, 404);
    if (compra.estado_pago !== "pagado") return json({ error: "La compra aún no está confirmada; la descarga no está disponible." }, 403);

    const { data: archivo, error: archivoError } = await admin
      .from("archivos_digitales_marketplace")
      .select("id, titulo, bucket_archivo, ruta_archivo, nombre_archivo, estado")
      .eq("id", compra.archivo_id)
      .maybeSingle();
    if (archivoError) throw archivoError;
    if (!archivo || !["publicado", "pausado"].includes(archivo.estado)) {
      return json({ error: "Este archivo ya no está disponible para descarga." }, 404);
    }
    if (archivo.bucket_archivo !== "mi-nube") return json({ error: "El origen del archivo no es válido." }, 400);
    const ruta = String(archivo.ruta_archivo ?? "");
    if (!ruta || ruta.startsWith("/") || ruta.split("/").some((part) => part === "..") || ruta.includes("\\") || ruta.length > 1024) {
      return json({ error: "La ruta del archivo no es válida." }, 400);
    }

    const { data: signed, error: signedError } = await admin.storage
      .from("mi-nube")
      .createSignedUrl(ruta, 90, { download: String(archivo.nombre_archivo).slice(0, 255) });
    if (signedError || !signed?.signedUrl) throw signedError ?? new Error("No se pudo generar el enlace de descarga.");
    return json({ ok: true, url: signed.signedUrl, nombre: archivo.nombre_archivo, expira_en_segundos: 90 });
  } catch (error) {
    console.error("marketplace-descargar-archivo", error);
    return json({ error: "No se pudo preparar la descarga en este momento." }, 500);
  }
});
