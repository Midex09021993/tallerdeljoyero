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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = req.headers.get("Authorization");

    if (!url || !anonKey || !serviceKey) return json({ error: "Servicio de enlaces no configurado." }, 503);
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Debes iniciar sesión para revocar el enlace." }, 401);

    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    const user = authData.user;
    if (authError || !user) return json({ error: "La sesión no es válida. Vuelve a iniciar sesión." }, 401);

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!/^[a-f0-9]{24}$/.test(token)) return json({ error: "Identificador de enlace no válido." }, 400);

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: link, error: lookupError } = await admin
      .from("visor_3d_enlaces")
      .select("token")
      .eq("token", token)
      .eq("propietario_id", user.id)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!link) return json({ error: "El enlace no existe o no te pertenece." }, 404);

    const { error: deleteError } = await admin
      .from("visor_3d_enlaces")
      .delete()
      .eq("token", token)
      .eq("propietario_id", user.id);

    if (deleteError) throw deleteError;
    return json({ ok: true });
  } catch (error) {
    console.error("revocar-enlace-visor-3d", error);
    return json({ error: "No se pudo revocar el enlace del visor 3D." }, 500);
  }
});
