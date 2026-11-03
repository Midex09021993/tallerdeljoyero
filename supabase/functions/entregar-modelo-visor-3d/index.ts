import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 404) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function isSafeModelPath(path: string, ownerId: string) {
  return Boolean(path) &&
    path.length <= 1024 &&
    !path.startsWith("/") &&
    !path.includes("\\") &&
    path.split("/").every((part) => part && part !== "." && part !== "..") &&
    path.split("/")[1] === ownerId &&
    /\.glb$/i.test(path);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Método no permitido." }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !service) return json({ error: "Visor 3D no configurado." }, 503);

    const token = new URL(req.url).searchParams.get("token")?.trim() ?? "";
    if (!/^[a-f0-9]{24}$/.test(token)) return json({ error: "Enlace no válido o caducado." });

    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: link, error: linkError } = await admin
      .from("visor_3d_enlaces")
      .select("propietario_id, modelo_ruta, expira_en")
      .eq("token", token)
      .gt("expira_en", new Date().toISOString())
      .maybeSingle();

    if (linkError) throw linkError;
    if (!link || new Date(link.expira_en).getTime() <= Date.now()) {
      return json({ error: "Enlace no válido o caducado." });
    }

    const modelPath = typeof link.modelo_ruta === "string" ? link.modelo_ruta : "";
    if (!isSafeModelPath(modelPath, link.propietario_id)) {
      return json({ error: "El modelo compartido no está disponible." });
    }

    const { data: model, error: downloadError } = await admin.storage
      .from("mi-nube")
      .download(modelPath);
    if (downloadError || !model) {
      if (downloadError) console.error("entregar-modelo-visor-3d storage", downloadError.message);
      return json({ error: "No se pudo cargar el modelo compartido." });
    }

    return new Response(model.stream(), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "model/gltf-binary",
        "Content-Length": String(model.size),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    });
  } catch (error) {
    console.error("entregar-modelo-visor-3d", error);
    return json({ error: "No se pudo entregar el modelo 3D." }, 500);
  }
});
