import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 10;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
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

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const uploadedPaths: string[] = [];

  try {
    const form = await req.formData();
    const files = form.getAll("files").filter((value): value is File => value instanceof File);

    if (!files.length) return json({ error: "Selecciona al menos un archivo." }, 400);
    if (files.length > MAX_FILES) return json({ error: `Máximo ${MAX_FILES} archivos por transferencia.` }, 400);

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      return json({ error: "La transferencia supera el límite de 50 MB." }, 413);
    }

    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        return json({ error: `${file.name} supera el límite de 50 MB.` }, 413);
      }
    }

    const token = randomToken();
    const tokenHash = await sha256(token);
    const metadata: Array<{ name: string; size: number; type: string; path: string }> = [];

    for (const file of files) {
      const name = safeName(file.name);
      const path = `${token}/${crypto.randomUUID()}-${name}`;
      const bytes = new Uint8Array(await file.arrayBuffer());

      const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
        cacheControl: "0",
      });

      if (error) throw new Error(`No se pudo guardar ${file.name}: ${error.message}`);
      uploadedPaths.push(path);
      metadata.push({ name, size: file.size, type: file.type || "application/octet-stream", path });
    }

    const { error: insertError } = await supabase.from("aurum_transfers").insert({
      token_hash: tokenHash,
      files: metadata,
      file_count: metadata.length,
      total_bytes: totalBytes,
    });

    if (insertError) throw insertError;

    return json({
      token,
      file_count: metadata.length,
      total_bytes: totalBytes,
      expires_in_hours: 24,
    });
  } catch (error) {
    if (uploadedPaths.length) {
      await supabase.storage.from(BUCKET).remove(uploadedPaths).catch(() => undefined);
    }
    console.error("[aurum-transfer-create]", error);
    return json({ error: error instanceof Error ? error.message : "No se pudo crear la transferencia." }, 500);
  }
});
