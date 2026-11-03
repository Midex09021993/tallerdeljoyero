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
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !service) return json({ error: "Visor 3D no configurado." }, 503);

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!/^[a-f0-9]{24}$/.test(token)) return json({ error: "Enlace no válido o caducado." }, 404);

    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: enlace, error: enlaceError } = await admin
      .from("visor_3d_enlaces")
      .select("token, propietario_id, modelo_ruta, nombre, expira_en")
      .eq("token", token)
      .gt("expira_en", new Date().toISOString())
      .maybeSingle();

    if (enlaceError) throw enlaceError;

    if (!enlace || new Date(enlace.expira_en).getTime() <= Date.now()) {
      return json({ error: "Enlace no válido o caducado." }, 404);
    }

    const modelPath = typeof enlace.modelo_ruta === "string" ? enlace.modelo_ruta : "";
    const safePath = Boolean(modelPath) &&
      !modelPath.startsWith("/") &&
      !modelPath.includes("\\") &&
      modelPath.split("/").every((part) => part && part !== "." && part !== "..") &&
      modelPath.length <= 1024 &&
      modelPath.split("/")[1] === enlace.propietario_id &&
      /\.glb$/i.test(modelPath);

    if (!safePath) {
      return json({ error: "El modelo público no está disponible. Genera un enlace nuevo desde Mi Nube." }, 404);
    }

    // The browser receives only this tokenized Edge Function URL, never a
    // Supabase Storage signed URL or the private object path.
    const modelUrl = new URL("/functions/v1/entregar-modelo-visor-3d", url);
    modelUrl.searchParams.set("token", token);

    return json({
      ok: true,
      url: modelUrl.toString(),
      nombre: enlace.nombre,
      expira_en: enlace.expira_en,
    });
  } catch (error) {
    console.error("resolver-enlace-visor-3d", error);
    return json({ error: "No se pudo preparar el visor 3D en este momento." }, 500);
  }
});
