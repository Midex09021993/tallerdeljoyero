import { createClient } from "npm:@supabase/supabase-js@2";
import { isTransferRateLimited } from "../_shared/aurum-transfer-rate-limit.ts";
import { isTransferFileCleanupDue, TRANSFER_FILE_CLEANUP_WINDOW_MS } from "../_shared/aurum-transfer-orphan-cleanup.ts";

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


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const action = req.method === "GET" ? "info" : body.action === "finish" ? "finish" : "claim";
  if (isTransferRateLimited(action, req.headers)) {
    return new Response(JSON.stringify({ error: "Has alcanzado el límite temporal de solicitudes de AURUM Transfer. Inténtalo más tarde." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Retry-After": "600" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Limpieza oportunista local al handler: evita incompatibilidades de tipos genéricos
  // entre versiones de SupabaseClient sin cambiar el comportamiento de limpieza.
  const sweep = async () => {
    const now = new Date().toISOString();
    const cutoff = new Date(Date.now() - TRANSFER_FILE_CLEANUP_WINDOW_MS).toISOString();
    const [activeResult, expiredResult] = await Promise.all([
      supabase
        .from("aurum_transfers")
        .select("id,files,status,expires_at,consumed_at")
        .or(`and(status.eq.consumed,consumed_at.lt.${cutoff}),and(status.eq.available,expires_at.lt.${now}),and(status.eq.processing,expires_at.lt.${now})`)
        .neq("files", "[]")
        .limit(20),
      supabase
        .from("aurum_transfers")
        .select("id,files,status,expires_at,consumed_at")
        .eq("status", "expired")
        .neq("files", "[]")
        .limit(20),
    ]);
    if (activeResult.error) throw activeResult.error;
    if (expiredResult.error) throw expiredResult.error;
    const rows = [...(activeResult.data ?? []), ...(expiredResult.data ?? [])]
      .filter((row, index, all) => all.findIndex((candidate) => candidate.id === row.id) === index)
      .filter((row) => isTransferFileCleanupDue(row.status, row.expires_at, row.consumed_at));
    for (const row of rows as Array<{ id: string; files: FileMeta[]; status: string; expires_at: string; consumed_at: string | null }>) {
      const paths = (row.files ?? []).map((f) => f.path).filter(Boolean);
      if (paths.length) {
        const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths);
        // Retain DB paths when Storage fails so cleanup can retry.
        if (removeError) {
          console.warn("[aurum-transfer-download] remove expired files", row.id, removeError);
          continue;
        }
      }
      const expiredStatus = row.status === "available" || row.status === "processing" ? "expired" : row.status;
      const { error: updateError } = await supabase
        .from("aurum_transfers")
        .update({ files: [], status: expiredStatus })
        .eq("id", row.id);
      if (updateError) console.warn("[aurum-transfer-download] clear expired metadata", row.id, updateError);
    }
  };
  try { await sweep(); } catch (e) { console.error("[aurum-transfer-download] sweep", e); }

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
  if (consumeError) {
    console.error("[aurum-transfer-download] consume", consumeError);
    // No entregar URLs si el enlace no quedó marcado como consumido: se evita
    // dejar una transferencia atascada en "processing" o romper el uso único.
    await supabase.rpc("release_aurum_transfer", { _transfer_id: t.id });
    return json({ error: "No se pudo confirmar la transferencia. El enlace sigue disponible para volver a intentarlo." }, 500);
  }

  // El historial se sincroniza mediante trigger sobre aurum_transfers.
  // Así una descarga nunca puede quedar fuera de las métricas por un fallo secundario.

  return json({ files: out, expires_in_seconds: DOWNLOAD_WINDOW_SECONDS });
});
