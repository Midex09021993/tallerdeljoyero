import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_FILES = 10;
const BUCKET = "aurum-transfer";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function safeName(name: string) {
  return name
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._()\- áéíóúÁÉÍÓÚñÑ]/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 180) || "archivo";
}

function storageName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-120) || "archivo";
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

type InFile = { name: string; size: number; type?: string };
type Meta = { name: string; size: number; type: string; path: string };

function validate(files: unknown): InFile[] | string {
  if (!Array.isArray(files) || !files.length) return "Selecciona al menos un archivo.";
  if (files.length > MAX_FILES) return `Máximo ${MAX_FILES} archivos por transferencia.`;
  let total = 0;
  for (const f of files) {
    if (!f || typeof f.name !== "string" || typeof f.size !== "number" || f.size < 0) return "Archivo inválido.";
    total += f.size;
  }
  if (total > MAX_TOTAL_BYTES) return "La transferencia supera el límite de 2 GB.";
  return files as InFile[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));

    // Paso 1: preparar URLs firmadas de subida directa (permite hasta 2 GB).
    if (body.action === "prepare") {
      const files = validate(body.files);
      if (typeof files === "string") return json({ error: files }, 400);
      const token = randomToken();
      const uploads: Array<Meta & { signedUrl: string }> = [];
      for (const f of files) {
        const path = `${token}/${crypto.randomUUID()}-${storageName(f.name)}`;
        const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
        if (error || !data) throw new Error(`No se pudo preparar ${f.name}.`);
        uploads.push({ name: safeName(f.name), size: f.size, type: f.type || "application/octet-stream", path, signedUrl: data.signedUrl });
      }
      return json({ token, uploads });
    }

    // Paso 2: confirmar la transferencia tras verificar que los archivos existen.
    if (body.action === "finalize") {
      const token = typeof body.token === "string" ? body.token : "";
      const files = validate(body.files);
      if (!token || typeof files === "string") return json({ error: typeof files === "string" ? files : "Enlace inválido." }, 400);

      const { data: listed, error: listError } = await supabase.storage.from(BUCKET).list(token, { limit: 100 });
      if (listError) throw listError;
      const sizes = new Map((listed ?? []).map((o) => [`${token}/${o.name}`, Number(o.metadata?.size ?? -1)]));

      const metadata: Meta[] = [];
      let total = 0;
      for (const f of files as Array<InFile & { path?: string }>) {
        const path = String(f.path ?? "");
        if (!path.startsWith(`${token}/`) || !sizes.has(path)) return json({ error: `Falta subir ${f.name}.` }, 400);
        const size = sizes.get(path)!;
        total += size;
        metadata.push({ name: safeName(f.name), size, type: f.type || "application/octet-stream", path });
      }
      if (total > MAX_TOTAL_BYTES) {
        await supabase.storage.from(BUCKET).remove(metadata.map((m) => m.path));
        return json({ error: "La transferencia supera el límite de 2 GB." }, 413);
      }

      const { data: transfer, error: insertError } = await supabase
        .from("aurum_transfers")
        .insert({
          token_hash: await sha256(token),
          files: metadata,
          file_count: metadata.length,
          total_bytes: total,
        })
        .select("id")
        .single();
      if (insertError || !transfer) throw insertError ?? new Error("No se pudo registrar la transferencia.");

      const { error: usageError } = await supabase.from("aurum_transfer_usage").insert({
        transfer_id: transfer.id,
        file_count: metadata.length,
        total_bytes: total,
        status: "available",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      if (usageError) {
        // El registro de métricas es parte de la integridad de la transferencia.
        // Si falla, no dejamos una transferencia válida sin trazabilidad.
        await supabase.from("aurum_transfers").delete().eq("id", transfer.id);
        await supabase.storage.from(BUCKET).remove(metadata.map((m) => m.path));
        throw usageError;
      }

      return json({ token, file_count: metadata.length, total_bytes: total, expires_in_hours: 24 });
    }

    return json({ error: "Acción no válida." }, 400);
  } catch (error) {
    console.error("[aurum-transfer-create]", error);
    return json({ error: error instanceof Error ? error.message : "No se pudo crear la transferencia." }, 500);
  }
});
