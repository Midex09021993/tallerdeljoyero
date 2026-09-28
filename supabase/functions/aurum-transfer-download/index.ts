import { createClient } from "npm:@supabase/supabase-js@2";
import { Zip, ZipPassThrough } from "npm:fflate@0.8.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const BUCKET = "aurum-transfer";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getToken(req: Request) {
  if (req.method === "GET") return new URL(req.url).searchParams.get("token") ?? "";
  const body = await req.json().catch(() => ({}));
  return typeof body.token === "string" ? body.token : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const token = await getToken(req);
  if (!token) return json({ error: "Enlace inválido." }, 400);

  const tokenHash = await sha256(token);

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
      ? data.files.map((file: { name: string; size: number; type: string }) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        }))
      : [];

    return json({
      available: true,
      file_count: data.file_count,
      total_bytes: data.total_bytes,
      expires_at: data.expires_at,
      files,
    });
  }

  const { data: transfer, error: claimError } = await supabase
    .rpc("claim_aurum_transfer", { _token_hash: tokenHash })
    .maybeSingle();

  if (claimError || !transfer) {
    return json({ error: "Esta transferencia ya fue descargada, expiró o dejó de estar disponible." }, 410);
  }

  const files: Array<{ name: string; path: string }> = Array.isArray(transfer.files) ? transfer.files : [];

  // Verifica que todos los archivos sigan accesibles antes de empezar a transmitir.
  const sources: Array<{ name: string; url: string }> = [];
  for (const file of files) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(file.path, 600);
    if (error || !data?.signedUrl) {
      await supabase.rpc("release_aurum_transfer", { _transfer_id: transfer.id });
      return json({ error: "No se pudo preparar la descarga. El enlace sigue disponible para volver a intentarlo." }, 500);
    }
    sources.push({ name: file.name, url: data.signedUrl });
  }

  // ZIP en streaming (sin cargar 500 MB en memoria).
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let failed = false;
      const zip = new Zip((err, chunk, final) => {
        if (err) { failed = true; controller.error(err); return; }
        controller.enqueue(chunk);
        if (final) controller.close();
      });
      try {
        const used = new Set<string>();
        for (const src of sources) {
          let name = src.name;
          for (let i = 1; used.has(name); i++) name = `${i}-${src.name}`;
          used.add(name);
          const entry = new ZipPassThrough(name);
          zip.add(entry);
          const res = await fetch(src.url);
          if (!res.ok || !res.body) throw new Error(`No se pudo recuperar ${src.name}.`);
          const reader = res.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            entry.push(value);
          }
          entry.push(new Uint8Array(0), true);
        }
        zip.end();
        if (failed) throw new Error("zip");
        await supabase.storage.from(BUCKET).remove(files.map((f) => f.path));
        await supabase.from("aurum_transfers").update({
          status: "consumed",
          consumed_at: new Date().toISOString(),
        }).eq("id", transfer.id).eq("status", "processing");
      } catch (error) {
        console.error("[aurum-transfer-download]", error);
        await supabase.rpc("release_aurum_transfer", { _transfer_id: transfer.id });
        try { controller.error(error); } catch { /* ya cerrado */ }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="AURUM-Transfer.zip"',
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
});
