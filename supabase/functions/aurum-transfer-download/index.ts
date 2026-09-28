import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const BUCKET = "aurum-transfer";
// Ventana de descarga directa desde Storage tras reclamar el enlace (soporta archivos de hasta 2 GB).
const DOWNLOAD_WINDOW_SECONDS = 6 * 60 * 60;

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

type FileMeta = { name: string; size: number; type: string; path: string };
type Client = ReturnType<typeof createClient>;

// Limpieza oportunista: borra archivos de transferencias consumidas cuya ventana ya pasó y de las expiradas.
async function sweep(supabase: Client) {
  const cutoff = new Date(Date.now() - DOWNLOAD_WINDOW_SECONDS * 1000).toISOString();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("aurum_transfers")
    .select("id,files,status")
    .or(`and(status.eq.consumed,consumed_at.lt.${cutoff}),and(status.eq.available,expires_at.lt.${now})`)
    .neq("files", "[]")
    .limit(20);
  for (const row of (data ?? []) as Array<{ id: string; files: FileMeta[]; status: string }>) {
    const paths = (row.files ?? []).map((f) => f.path).filter(Boolean);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    await supabase
      .from("aurum_transfers")
      .update({ files: [], status: row.status === "available" ? "expired" : row.status })
      .eq("id", row.id);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try { await sweep(supabase); } catch (e) { console.error("[aurum-transfer-download] sweep", e); }

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const token = req.method === "GET"
    ? new URL(req.url).searchParams.get("token") ?? ""
    : typeof body.token === "string" ? body.token : "";
  if (!token) return json({ error: "Enlace inválido." }, 400);
  const tokenHash = await sha256(token);

  // Información pública (sin consumir).
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("aurum_transfers")
      .select("file_count,total_bytes,expires_at,status,files")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (error || !data || data.status !== "available" || new Date(data.expires_at) <= new Date()) {
      return json({ error: "Esta transferencia ya no está disponible." }, 404);
    }
    const files = Array.isArray(data.files)
      ? (data.files as FileMeta[]).map((f) => ({ name: f.name, size: f.size, type: f.type }))
      : [];
    return json({ available: true, file_count: data.file_count, total_bytes: data.total_bytes, expires_at: data.expires_at, files });
  }

  // Finalizar: el receptor terminó de descargar → eliminar archivos.
  if (body.action === "finish") {
    const { data } = await supabase
      .from("aurum_transfers")
      .select("id,files,status")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (data && data.status === "consumed") {
      const paths = ((data.files ?? []) as FileMeta[]).map((f) => f.path).filter(Boolean);
      if (paths.length) {
        const { error } = await supabase.storage.from(BUCKET).remove(paths);
        if (error) return json({ error: "No se pudieron eliminar los archivos." }, 500);
      }
      await supabase.from("aurum_transfers").update({ files: [] }).eq("id", data.id);
    }
    return json({ ok: true });
  }

  // Reclamar (un solo uso) y entregar URLs firmadas de descarga directa.
  const { data: transfer, error: claimError } = await supabase
    .rpc("claim_aurum_transfer", { _token_hash: tokenHash })
    .maybeSingle();
  const t = transfer as { id?: string; status?: string; files?: FileMeta[] } | null;
  if (claimError || !t?.id || t.status !== "processing" || !Array.isArray(t.files) || !t.files.length) {
    return json({ error: "Esta transferencia ya fue descargada, expiró o dejó de estar disponible." }, 410);
  }

  const out: Array<{ name: string; size: number; url: string }> = [];
  for (const f of t.files) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(f.path, DOWNLOAD_WINDOW_SECONDS, { download: f.name });
    if (error || !data?.signedUrl) {
      await supabase.rpc("release_aurum_transfer", { _transfer_id: t.id });
      return json({ error: "No se pudo preparar la descarga. El enlace sigue disponible para volver a intentarlo." }, 500);
    }
    out.push({ name: f.name, size: f.size, url: data.signedUrl });
  }

  const { error: consumeError } = await supabase
    .from("aurum_transfers")
    .update({ status: "consumed", consumed_at: new Date().toISOString() })
    .eq("id", t.id)
    .eq("status", "processing");
  if (consumeError) console.error("[aurum-transfer-download] consume", consumeError);

  return json({ files: out, expires_in_seconds: DOWNLOAD_WINDOW_SECONDS });
});
