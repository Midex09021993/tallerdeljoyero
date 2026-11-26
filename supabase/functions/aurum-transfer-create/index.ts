import { createClient } from "npm:@supabase/supabase-js@2";
import { isTransferRateLimited } from "../_shared/aurum-transfer-rate-limit.ts";
import { isTransferTokenFolder, staleUploadPaths, MAX_ORPHAN_FOLDERS_PER_SWEEP } from "../_shared/aurum-transfer-orphan-cleanup.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_FILES = 10;
const BUCKET = "aurum-transfer";
// Cursor local por instancia para recorrer páginas del bucket sin una consulta ilimitada.
let orphanSweepOffset = 0;

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

// Tipos de contenido activo (páginas web, scripts, ejecutables) que no se aceptan:
// AURUM Transfer es para modelos 3D, imágenes, documentos y archivos comprimidos.
const BLOCKED_EXTENSIONS = new Set([
  "html", "htm", "xhtml", "shtml", "svg", "svgz", "xml", "xsl", "js", "mjs", "cjs", "jsx", "ts", "tsx",
  "php", "phtml", "asp", "aspx", "jsp", "cgi", "pl", "py", "rb", "sh", "bash", "ps1", "psm1", "vbs", "vbe",
  "wsf", "hta", "bat", "cmd", "com", "exe", "msi", "msp", "scr", "pif", "cpl", "dll", "jar", "apk", "app",
  "dmg", "pkg", "deb", "rpm", "reg", "lnk", "swf",
]);
const BLOCKED_MIME = [
  /^text\/html/i, /^application\/xhtml/i, /^image\/svg/i, /xml$/i, /javascript/i, /ecmascript/i,
  /^text\/x-(sh|shellscript|php|perl|python|script)/i, /^application\/x-(sh|csh|php|perl|python|msdownload|msdos-program|executable|httpd)/i,
  /^application\/(vnd\.microsoft\.portable-executable|java-archive|vnd\.android\.package-archive|hta)/i,
];
const MIME_RE = /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/i;

function blockedFile(name: string, type: string): boolean {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (name.includes(".") && BLOCKED_EXTENSIONS.has(ext)) return true;
  return BLOCKED_MIME.some((re) => re.test(type));
}

function normalizeType(type: unknown): string | null {
  if (type === undefined || type === null || type === "") return "application/octet-stream";
  if (typeof type !== "string") return null;
  const clean = type.split(";")[0].trim().toLowerCase();
  return MIME_RE.test(clean) ? clean : null;
}
type Meta = { name: string; size: number; type: string; path: string };


function validate(files: unknown): InFile[] | string {
  if (!Array.isArray(files) || !files.length) return "Selecciona al menos un archivo.";
  if (files.length > MAX_FILES) return `Máximo ${MAX_FILES} archivos por transferencia.`;
  let total = 0;
  for (const f of files) {
    if (!f || typeof f.name !== "string" || !f.name.trim() || f.name.length > 255 || typeof f.size !== "number" || !Number.isFinite(f.size) || f.size < 0) return "Archivo inválido.";
    const type = normalizeType(f.type);
    if (!type) return `Tipo de archivo no válido: ${safeName(f.name)}.`;
    if (blockedFile(f.name, type)) return `Tipo de archivo no permitido: ${safeName(f.name)}.`;
    f.type = type;
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

  async function sweepOrphanUploads() {
    try {
      const offset = orphanSweepOffset;
      const { data: folders, error: rootError } = await supabase.storage.from(BUCKET).list("", { limit: 100, offset });
      if (rootError) throw rootError;
      orphanSweepOffset = (folders ?? []).length === 100 ? offset + 100 : 0;
      const candidates = (folders ?? []).filter((entry) => isTransferTokenFolder(entry.name)).slice(0, 25);
      let cleanedFolders = 0;
      for (const folder of candidates) {
        if (cleanedFolders >= MAX_ORPHAN_FOLDERS_PER_SWEEP) break;
        const tokenHash = await sha256(folder.name);
        const { data: registered, error: lookupError } = await supabase
          .from("aurum_transfers")
          .select("id")
          .eq("token_hash", tokenHash)
          .maybeSingle();
        if (lookupError) {
          console.warn("[aurum-transfer-create] orphan lookup", lookupError);
          continue;
        }
        if (registered) continue;
        cleanedFolders += 1;
  
        const { data: objects, error: listError } = await supabase.storage.from(BUCKET).list(folder.name, { limit: 100, offset: 0 });
        if (listError) {
          console.warn("[aurum-transfer-create] orphan list", listError);
          continue;
        }
        const paths = staleUploadPaths(folder.name, objects ?? []);
        if (paths.length) {
          const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths);
          if (removeError) console.warn("[aurum-transfer-create] orphan remove", removeError);
        }
      }
    } catch (error) {
      // Limpieza preventiva: nunca debe bloquear una transferencia legítima.
      console.warn("[aurum-transfer-create] orphan sweep", error);
    }
  }

  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "prepare" || body.action === "finalize") {
      const action = body.action;
      if (isTransferRateLimited(action, req.headers)) {
        return new Response(JSON.stringify({ error: "Has alcanzado el límite temporal de solicitudes de AURUM Transfer. Inténtalo más tarde." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Retry-After": action === "prepare" ? "900" : "900" },
        });
      }
    }

    // Paso 1: preparar URLs firmadas de subida directa (permite hasta 2 GB).
    if (body.action === "prepare") {
      await sweepOrphanUploads(supabase);
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
      if (!/^[A-Za-z0-9_-]{43}$/.test(token) || typeof files === "string") return json({ error: typeof files === "string" ? files : "Enlace inválido." }, 400);

      const { data: listed, error: listError } = await supabase.storage.from(BUCKET).list(token, { limit: 100 });
      if (listError) throw listError;
      const sizes = new Map((listed ?? []).map((o) => [`${token}/${o.name}`, Number(o.metadata?.size ?? -1)]));
      const storedTypes = new Map((listed ?? []).map((o) => [`${token}/${o.name}`, String(o.metadata?.mimetype ?? "")]));

      const metadata: Meta[] = [];
      let total = 0;
      for (const f of files as Array<InFile & { path?: string }>) {
        const path = String(f.path ?? "");
        const basename = path.slice(token.length + 1);
        if (!path.startsWith(token + "/") || path.split("/").length !== 2 || !/^[a-zA-Z0-9._-]{1,180}$/.test(basename) || !sizes.has(path)) return json({ error: `Falta subir ${f.name}.` }, 400);
        const size = sizes.get(path)!;
        // Comprobar también el tipo con el que realmente se guardó el archivo.
        const storedType = storedTypes.get(path) ?? "";
        if (blockedFile(path, storedType) || blockedFile(f.name, storedType)) {
          await supabase.storage.from(BUCKET).remove((listed ?? []).map((o) => `${token}/${o.name}`));
          return json({ error: `Tipo de archivo no permitido: ${safeName(f.name)}.` }, 400);
        }
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
