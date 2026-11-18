import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  const bearer = (req.headers.get("Authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return json({ error: "Inicia sesión para consultar el estado del NAS." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ status: "unknown", message: "Comprobación no configurada." }, 200);

  try {
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "La sesión no es válida." }, 401);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: accounts, error: accountError } = await admin
      .from("participante_cuentas")
      .select("participante_id")
      .eq("user_id", authData.user.id)
      .eq("estado", "activo");
    if (accountError) throw accountError;
    const participantIds = (accounts ?? []).map((x: { participante_id: string }) => x.participante_id).filter(Boolean);
    if (!participantIds.length) return json({ error: "Tu cuenta no tiene un taller activo." }, 403);

    const baseUrl = Deno.env.get("NEXTCLOUD_URL")?.trim().replace(/\/+$/, "");
    const username = Deno.env.get("NEXTCLOUD_USERNAME")?.trim();
    const appPassword = Deno.env.get("NEXTCLOUD_APP_PASSWORD");
    if (!baseUrl || !username || !appPassword) {
      return json({ status: "not_configured", message: "Pendiente de configurar el acceso seguro." });
    }

    let parsed: URL;
    try {
      parsed = new URL(baseUrl);
    } catch {
      return json({ status: "not_configured", message: "La dirección de Nextcloud no es válida." });
    }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      return json({ status: "not_configured", message: "La conexión debe usar una URL HTTPS válida." });
    }

    const davUrl = new URL(`remote.php/dav/files/${encodeURIComponent(username)}/`, baseUrl.endsWith("/") ? baseUrl : baseUrl + "/");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(davUrl, {
        method: "PROPFIND",
        headers: {
          Authorization: `Basic ${btoa(`${username}:${appPassword}`)}`,
          Depth: "0",
          "Content-Type": "application/xml; charset=utf-8",
        },
        body: `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>`,
        signal: controller.signal,
        redirect: "error",
      });
      if (response.status === 207 || response.status === 200) {
        return json({ status: "online", message: "Conectado" });
      }
      if (response.status === 401 || response.status === 403) {
        return json({ status: "misconfigured", message: "Nextcloud responde, pero las credenciales o permisos deben revisarse." });
      }
      return json({ status: "offline", message: "Nextcloud no responde correctamente." });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[nextcloud-status] comprobación fallida", error instanceof Error ? error.name : "unknown");
    return json({ status: "offline", message: "No se pudo contactar con Nextcloud." });
  }
});
