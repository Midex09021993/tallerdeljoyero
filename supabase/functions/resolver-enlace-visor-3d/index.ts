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
      .select("token, propietario_id, modelo_url, modelo_ruta, nombre, expira_en")
      .eq("token", token)
      .gt("expira_en", new Date().toISOString())
      .maybeSingle();

    if (enlaceError) {
      // Compatibility for environments where the model_ruta migration has not yet
      // been applied. This fallback preserves the old behavior but cannot renew URLs.
      if (/modelo_ruta|column .* does not exist/i.test(enlaceError.message)) {
        const { data, error } = await admin.rpc("resolver_enlace_visor_3d", { _token: token });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : null;
        if (!row || new Date(row.expira_en).getTime() <= Date.now()) {
          return json({ error: "Enlace no válido o caducado." }, 404);
        }
        return json({ ok: true, url: row.modelo_url, nombre: row.nombre, expira_en: row.expira_en });
      }
      throw enlaceError;
    }

    if (!enlace || new Date(enlace.expira_en).getTime() <= Date.now()) {
      return json({ error: "Enlace no válido o caducado." }, 404);
    }

    let modelUrl = enlace.modelo_url as string;
    const modelPath = typeof enlace.modelo_ruta === "string" ? enlace.modelo_ruta : "";

    if (modelPath) {
      const safePath = !modelPath.startsWith("/") &&
        !modelPath.includes("\\") &&
        modelPath.split("/").every((part) => part && part !== "." && part !== "..") &&
        modelPath.length <= 1024 &&
        modelPath.split("/")[1] === enlace.propietario_id;

      if (!safePath) return json({ error: "La ruta del modelo no es válida." }, 400);

      const { data: signed, error: signedError } = await admin.storage
        .from("mi-nube")
        .createSignedUrl(modelPath, 5 * 60);
      if (signedError || !signed?.signedUrl) throw signedError ?? new Error("No se pudo preparar el modelo 3D.");
      modelUrl = signed.signedUrl;
    }

    if (!modelUrl || !modelUrl.startsWith("https://")) {
      return json({ error: "El modelo no está disponible." }, 404);
    }

    return json({
      ok: true,
      url: modelUrl,
      nombre: enlace.nombre,
      expira_en: enlace.expira_en,
    });
  } catch (error) {
    console.error("resolver-enlace-visor-3d", error);
    return json({ error: "No se pudo preparar el visor 3D en este momento." }, 500);
  }
});
