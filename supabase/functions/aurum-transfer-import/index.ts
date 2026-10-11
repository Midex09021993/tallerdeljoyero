import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const TRANSFER_BUCKET = "aurum-transfer";
const CLOUD_BUCKET = "mi-nube";
const DOWNLOAD_WINDOW_MS = 6 * 60 * 60 * 1000;
const MAX_FILE_BYTES = 500 * 1024 * 1024;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeName(name: string) {
  return name.normalize("NFKC").replace(/[\/\\]/g, "_").replace(/[\u0000-\u001f]/g, "_").slice(0, 180) || "archivo";
}
type FileMeta = { name: string; size: number; type: string; path: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);
  const authorization = req.headers.get("Authorization") ?? "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return json({ error: "Inicia sesión para guardar archivos en Mi Nube." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "La importación no está configurada en el servidor." }, 500);

  let cleanupAdmin: ReturnType<typeof createClient> | null = null;
  let copiedPaths: string[] = [];
  try {
    const authClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${bearer}` } }, auth: { persistSession: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "La sesión no es válida. Inicia sesión e inténtalo de nuevo." }, 401);
    const user = authData.user;
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token : "";
    if (!token || token.length > 256) return json({ error: "Transferencia no válida." }, 400);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    cleanupAdmin = admin;
    const { data: accounts, error: accountError } = await admin
      .from("participante_cuentas")
      .select("participante_id")
      .eq("user_id", user.id)
      .eq("estado", "activo");
    if (accountError) throw accountError;
    const participantIds = (accounts ?? []).map((x: { participante_id: string }) => x.participante_id).filter(Boolean);
    if (!participantIds.length) return json({ error: "Tu cuenta todavía no tiene un taller activo para Mi Nube." }, 403);

    const { data: transfer, error: transferError } = await admin
      .from("aurum_transfers")
      .select("id,status,files,consumed_at,expires_at,imported_at,imported_by")
      .eq("token_hash", await sha256(token))
      .maybeSingle();
    if (transferError) throw transferError;
    if (!transfer || transfer.status !== "consumed" || !transfer.consumed_at) {
      return json({ error: "Primero inicia la descarga de esta transferencia. El enlace todavía no está listo para importar." }, 409);
    }
    if (Date.now() - new Date(transfer.consumed_at).getTime() > DOWNLOAD_WINDOW_MS) {
      return json({ error: "La ventana de importación terminó. Pide que vuelvan a compartirte los archivos." }, 410);
    }
    if (transfer.imported_at) {
      return json({ error: transfer.imported_by === user.id ? "Estos archivos ya se guardaron en tu Mi Nube." : "Esta transferencia ya fue importada por otra cuenta." }, 409);
    }
    const files = Array.isArray(transfer.files) ? transfer.files as FileMeta[] : [];
    if (!files.length) return json({ error: "Los archivos temporales ya fueron eliminados. No se pueden importar." }, 410);
    if (files.some((f) => !f.path || f.size > MAX_FILE_BYTES)) {
      return json({ error: "Mi Nube admite hasta 500 MB por archivo. Esta transferencia contiene un archivo que supera ese límite." }, 413);
    }

    const participantId = participantIds[0];
    const { data: participant, error: participantError } = await admin
      .from("ecosistema_participantes")
      .select("id")
      .eq("id", participantId)
      .eq("estado", "activo")
      .maybeSingle();
    if (participantError) throw participantError;
    if (!participant) return json({ error: "Tu taller no está activo para Mi Nube." }, 403);

    const folder = `AURUM-Transfer-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;
    const storage = admin.storage;
    for (const file of files) {
      const { data: blob, error: downloadError } = await storage.from(TRANSFER_BUCKET).download(file.path);
      if (downloadError || !blob) throw new Error(`No se pudo leer ${safeName(file.name)} desde la transferencia.`);
      const destination = `${participantId}/${user.id}/${folder}/${crypto.randomUUID()}-${safeName(file.name)}`;
      const { error: uploadError } = await storage.from(CLOUD_BUCKET).upload(destination, blob, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (uploadError) throw new Error(`No se pudo guardar ${safeName(file.name)} en Mi Nube.`);
      copiedPaths.push(destination);
    }

    const { data: updated, error: updateError } = await admin
      .from("aurum_transfers")
      .update({ imported_at: new Date().toISOString(), imported_by: user.id })
      .eq("id", transfer.id)
      .is("imported_at", null)
      .select("id")
      .maybeSingle();
    if (updateError || !updated) {
      await storage.from(CLOUD_BUCKET).remove(copiedPaths);
      return json({ error: "La transferencia ya fue importada o cambió de estado. No se guardaron duplicados." }, 409);
    }
    return json({ ok: true, file_count: copiedPaths.length, folder, message: "Archivos guardados en Mi Nube." });
  } catch (error) {
    if (cleanupAdmin && copiedPaths.length) {
      await cleanupAdmin.storage.from(CLOUD_BUCKET).remove(copiedPaths).catch(() => undefined);
    }
    console.error("[aurum-transfer-import]", error);
    return json({ error: error instanceof Error ? error.message : "No se pudieron guardar los archivos." }, 500);
  }
});
