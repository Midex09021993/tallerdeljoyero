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
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = req.headers.get("Authorization");

    if (!url || !anonKey || !serviceKey) return json({ error: "Servicio de enlaces no configurado." }, 503);
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Debes iniciar sesión para compartir una joya." }, 401);

    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    const user = authData.user;
    if (authError || !user) return json({ error: "La sesión no es válida. Vuelve a iniciar sesión." }, 401);

    const body = await req.json().catch(() => ({}));
    const modelPath = typeof body?.modelo_ruta === "string" ? body.modelo_ruta.trim() : "";
    const name = typeof body?.nombre === "string" ? body.nombre.trim().slice(0, 120) : "joya-compartida";

    if (!isSafeModelPath(modelPath, user.id)) {
      return json({ error: "El modelo debe ser un GLB perteneciente a tu Mi Nube." }, 400);
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const separator = modelPath.lastIndexOf("/");
    const folderPath = separator >= 0 ? modelPath.slice(0, separator) : "";
    const fileName = modelPath.slice(separator + 1);
    const { data: storedObjects, error: objectError } = await admin.storage
      .from("mi-nube")
      .list(folderPath, { limit: 1000, search: fileName });

    if (objectError) throw objectError;
    if (!(storedObjects ?? []).some((item) => item.name === fileName)) {
      return json({ error: "No se encontró el GLB en tu Mi Nube." }, 404);
    }

    const tokenBytes = crypto.getRandomValues(new Uint8Array(12));
    const token = Array.from(tokenBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const expiraEn = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await admin.from("visor_3d_enlaces").insert({
      token,
      propietario_id: user.id,
      modelo_url: null,
      modelo_ruta: modelPath,
      nombre: name || "joya-compartida",
      expira_en: expiraEn,
    });

    if (insertError) throw insertError;

    return json({ ok: true, token, expira_en: expiraEn, nombre: name || "joya-compartida" });
  } catch (error) {
    console.error("crear-enlace-visor-3d", error);
    return json({ error: "No se pudo crear el enlace del visor 3D." }, 500);
  }
});
