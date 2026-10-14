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
function clean(value: unknown, max = 160) { return String(value ?? "").trim().slice(0, max); }

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) return json({ error: "Visor 3D no configurado." }, 503);
    const body = await req.json().catch(() => ({}));
    const slug = clean(body?.slug, 100).toLowerCase();
    const productSlug = clean(body?.producto, 100).toLowerCase();
    if (!slug || !productSlug) return json({ error: "Falta identificar la publicación." }, 400);

    // La ficha debe existir en el catálogo público antes de firmar cualquier archivo.
    const publicClient = createClient(url, anon, { auth: { persistSession: false } });
    const { data: rows, error: publicError } = await publicClient.rpc("obtener_catalogo_publico", { _slug: slug });
    if (publicError) throw publicError;
    const product = (rows ?? []).find((row: Record<string, unknown>) =>
      String(row.slug ?? "").toLowerCase() === slug &&
      (String(row.producto_slug ?? "").toLowerCase() === productSlug ||
       String(row.producto_id ?? "").toLowerCase() === productSlug)
    );
    if (!product?.producto_id) return json({ error: "La joya no está publicada." }, 404);

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: storedProduct, error: productError } = await admin.from("catalogo_productos")
      .select("id, participante_id").eq("id", product.producto_id).maybeSingle();
    if (productError) throw productError;
    if (!storedProduct?.participante_id) return json({ error: "La publicación no está disponible." }, 404);

    const { data: link, error: linkError } = await admin.from("catalogo_proyectos_nube")
      .select("producto_id, participante_id, archivos")
      .eq("producto_id", storedProduct.id).eq("participante_id", storedProduct.participante_id).maybeSingle();
    if (linkError) throw linkError;
    if (!link || !Array.isArray(link.archivos)) return json({ error: "Esta publicación no tiene un modelo 3D vinculado." }, 404);

    const candidates = link.archivos.filter((file: Record<string, unknown>) =>
      file && file.origen === "supabase" &&
      /\.3dm$/i.test(String(file.nombre ?? file.ruta ?? "")) &&
      typeof file.ruta === "string"
    );
    const file = candidates[0];
    if (!file) return json({ error: "No encontramos un archivo 3DM compatible en el proyecto vinculado." }, 404);
    const ruta = String(file.ruta);
    if (!ruta || ruta.startsWith("/") || ruta.split("/").some((part) => part === "..") || ruta.includes("\\") || ruta.length > 1024) {
      return json({ error: "La ruta del modelo no es válida." }, 400);
    }
    const { data: signed, error: signedError } = await admin.storage.from("mi-nube").createSignedUrl(ruta, 5 * 60);
    if (signedError || !signed?.signedUrl) throw signedError ?? new Error("No se pudo preparar el modelo 3D.");
    return json({ ok: true, url: signed.signedUrl, nombre: clean(file.nombre, 180) });
  } catch (error) {
    console.error("catalogo-modelo-3d-publico", error);
    return json({ error: "No se pudo preparar el visor 3D en este momento." }, 500);
  }
});
