import { createClient } from "npm:@supabase/supabase-js@2";
import { isTransferImportRateLimited } from "../_shared/aurum-transfer-import-rate-limit.ts";
import { isTransferImportClaimRecoverable, TRANSFER_IMPORT_CLAIM_TIMEOUT_MS } from "../_shared/aurum-transfer-import-claim.ts";

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

  let cleanupCopiedFiles: (() => Promise<void>) | null = null;
  let copiedPaths: string[] = [];
  let importClaim: { transferId: string; claimAt: string } | null = null;
  try {
    const authClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${bearer}` } }, auth: { persistSession: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "La sesión no es válida. Inicia sesión e inténtalo de nuevo." }, 401);
    const user = authData.user;
    if (isTransferImportRateLimited(user.id)) return json({ error: "Has alcanzado el límite temporal de importaciones. Inténtalo más tarde." }, 429);
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token : "";
    if (!token || token.length > 256) return json({ error: "Transferencia no válida." }, 400);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    cleanupCopiedFiles = async () => {
      if (copiedPaths.length) {
        const { error: removeError } = await admin.storage.from(CLOUD_BUCKET).remove(copiedPaths);
        if (removeError) {
          console.warn("cleanup copied files failed", removeError);
          return;
        }
      }
      if (importClaim) {
        const { error: releaseError } = await admin.from("aurum_transfers")
          .update({ imported_at: null, imported_by: null })
          .eq("id", importClaim.transferId)
          .eq("imported_at", importClaim.claimAt)
          .is("imported_by", null);
        if (releaseError) console.warn("release import claim failed", releaseError);
        else importClaim = null;
      }
    };
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
    if (transfer.imported_at && transfer.imported_by) {
      return json({ error: transfer.imported_by === user.id ? "Estos archivos ya se guardaron en tu Mi Nube." : "Esta transferencia ya fue importada por otra cuenta." }, 409);
    }
    if (transfer.imported_at && !isTransferImportClaimRecoverable(transfer.imported_at, transfer.imported_by)) {
      return json({ error: "Esta transferencia está siendo importada. Inténtalo más tarde." }, 409);
    }
    const files = Array.isArray(transfer.files) ? transfer.files as FileMeta[] : [];
    if (!files.length) return json({ error: "Los archivos temporales ya fueron eliminados. No se pueden importar." }, 410);
    if (files.some((f) => !f.path || f.size > MAX_FILE_BYTES)) {
      return json({ error: "Mi Nube admite hasta 500 MB por archivo. Esta transferencia contiene un archivo que supera ese límite." }, 413);
    }

    // Si la cuenta pertenece a varios talleres, nunca elegir uno implícitamente.
    // La interfaz envía el taller activo; se conserva compatibilidad para cuentas con uno solo.
    const requestedParticipantId = typeof body.participantId === "string" ? body.participantId.trim() : "";
    const participantId = requestedParticipantId || (participantIds.length === 1 ? participantIds[0] : "");
    if (!participantId || !participantIds.includes(participantId)) {
      return json({ error: "Selecciona un taller activo al que tengas acceso para guardar estos archivos." }, 403);
    }

    const { data: participant, error: participantError } = await admin
      .from("ecosistema_participantes")
      .select("id")
      .eq("id", participantId)
      .eq("estado", "activo")
      .maybeSingle();
    if (participantError) throw participantError;
    if (!participant) return json({ error: "Tu taller no está activo para Mi Nube." }, 403);

    // Reservar la importación de forma atómica antes de copiar, evitando dos usuarios/cargas simultáneas.
    // Las reservas abandonadas pueden recuperarse tras 30 minutos; los imports completos tienen imported_by.
    const claimAt = new Date().toISOString();
    const staleClaimCutoff = new Date(Date.now() - TRANSFER_IMPORT_CLAIM_TIMEOUT_MS).toISOString();
    const { data: claim, error: claimError } = await admin.from("aurum_transfers")
      .update({ imported_at: claimAt, imported_by: null })
      .eq("id", transfer.id)
      .or(`imported_at.is.null,and(imported_by.is.null,imported_at.lt.${staleClaimCutoff})`)
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claim) return json({ error: "Esta transferencia está siendo importada o ya fue importada. Inténtalo más tarde." }, 409);
    importClaim = { transferId: transfer.id, claimAt };

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
      if (uploadError) throw new Error(`No se pudo guardar ${safeName(file.name)} en Mi Nube: ${uploadError.message}`);
      copiedPaths.push(destination);
    }

    const { data: updated, error: updateError } = await admin
      .from("aurum_transfers")
      .update({ imported_at: new Date().toISOString(), imported_by: user.id })
      .eq("id", transfer.id)
      .eq("imported_at", claimAt)
      .is("imported_by", null)
      .select("id")
      .maybeSingle();
    if (updateError || !updated) {
      await cleanupCopiedFiles();
      return json({ error: "La transferencia ya fue importada o cambió de estado. No se guardaron duplicados." }, 409);
    }
    importClaim = null; // Ya se confirmó imported_by: no liberar la reserva.
    return json({ ok: true, file_count: copiedPaths.length, folder, message: "Archivos guardados en Mi Nube." });
  } catch (error) {
    if (cleanupCopiedFiles) {
      await cleanupCopiedFiles().catch(() => undefined);
    }
    console.error("[aurum-transfer-import]", error);
    return json({ error: error instanceof Error ? error.message : "No se pudieron guardar los archivos." }, 500);
  }
});
