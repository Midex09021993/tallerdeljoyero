import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const CHUNK_SIZE = 4 * 1024 * 1024;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
function safeSegment(value: string) {
  return value.normalize("NFKC").replace(/[\/\\]/g, "_").replace(/[\u0000-\u001f]/g, "_").replace(/^\.+|\.+$/g, "").slice(0, 160);
}
function xmlValue(block: string, name: string) {
  const match = block.match(new RegExp("<(?:[A-Za-z0-9_-]+:)?" + name + "\\b[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_-]+:)?" + name + "\\s*>", "i"));
  return match?.[1]?.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'") ?? "";
}
function hrefPath(href: string, baseUrl: string) {
  try { return new URL(href, baseUrl).pathname; } catch { return ""; }
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "Método no permitido." }, 405);
  const bearer = (req.headers.get("Authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return json({ error: "Inicia sesión para acceder a los archivos del NAS." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "La función no está configurada en el servidor." }, 500);

  try {
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${bearer}` } }, auth: { persistSession: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "La sesión no es válida." }, 401);
    const user = authData.user;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: accounts, error: accountError } = await admin.from("participante_cuentas")
      .select("participante_id").eq("user_id", user.id).eq("estado", "activo");
    if (accountError) throw accountError;
    const participantIds = (accounts ?? []).map((x: { participante_id: string }) => x.participante_id).filter(Boolean);
    if (!participantIds.length) return json({ error: "Tu cuenta no tiene un taller activo." }, 403);
    let requestedParticipantId = "";
    if (req.method === "GET") {
      requestedParticipantId = new URL(req.url).searchParams.get("participantId") ?? "";
    } else if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const form = await req.clone().formData();
      requestedParticipantId = String(form.get("participantId") ?? "");
    } else {
      const body = await req.clone().json().catch(() => ({}));
      requestedParticipantId = typeof body.participantId === "string" ? body.participantId : "";
    }
    const participantId = requestedParticipantId || (participantIds.length === 1 ? participantIds[0] : "");
    if (!participantId || !participantIds.includes(participantId)) return json({ error: "Selecciona un taller al que tengas acceso." }, 403);

    const baseUrl = Deno.env.get("NEXTCLOUD_URL")?.trim().replace(/\/+$/, "");
    const username = Deno.env.get("NEXTCLOUD_USERNAME")?.trim();
    const appPassword = Deno.env.get("NEXTCLOUD_APP_PASSWORD");
    if (!baseUrl || !username || !appPassword) return json({ error: "La conexión con Nextcloud no está configurada." }, 503);
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return json({ error: "La URL de Nextcloud debe ser HTTPS y no contener credenciales." }, 503);

    const root = `AurumLab/${participantId}/${user.id}`;
    const davRoot = new URL(`remote.php/dav/files/${encodeURIComponent(username)}/`, baseUrl.endsWith("/") ? baseUrl : baseUrl + "/");
    const auth = `Basic ${btoa(`${username}:${appPassword}`)}`;
    const dav = (segments: string[]) => new URL(segments.map((s) => encodeURIComponent(s)).join("/"), davRoot);
    const ensureCollection = async (segments: string[]) => {
      const current: string[] = [];
      for (const segment of segments) {
        current.push(segment);
        const response = await fetch(dav(current), { method: "MKCOL", headers: { Authorization: auth }, redirect: "error" });
        if (![201, 405, 409].includes(response.status)) {
          const status = response.status;
          await response.body?.cancel();
          throw new Error(`Nextcloud no pudo preparar la carpeta (HTTP ${status}).`);
        }
        await response.body?.cancel();
      }
    };
    const listDirectory = async (segments: string[]) => {
      const response = await fetch(dav([...segments, ""]), {
        method: "PROPFIND", headers: { Authorization: auth, Depth: "1", "Content-Type": "application/xml; charset=utf-8" },
        body: `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/><d:getcontentlength/><d:getlastmodified/><d:getcontenttype/></d:prop></d:propfind>`,
        redirect: "error",
      });
      if (response.status !== 207 && response.status !== 200) {
        await response.body?.cancel();
        if (response.status === 404) return [];
        throw new Error(`No se pudo listar la carpeta del NAS (HTTP ${response.status}).`);
      }
      const xml = await response.text();
      const blocks = xml.match(/<(?:[A-Za-z0-9_-]+:)?response\b[\s\S]*?<\/(?:[A-Za-z0-9_-]+:)?response\s*>/gi) ?? [];
      const currentUrl = dav([...segments, ""]).pathname;
      return blocks.map((block) => {
        const href = xmlValue(block, "href");
        const path = hrefPath(href, baseUrl);
        let relative = path.startsWith(currentUrl) ? path.slice(currentUrl.length) : "";
        try { relative = relative.split("/").filter(Boolean).map(decodeURIComponent).join("/"); } catch { /* ignore malformed href */ }
        if (!relative || relative.includes("/")) return null;
        const resourceType = xmlValue(block, "resourcetype");
        return {
          name: relative,
          folder: /<(?:[A-Za-z0-9_-]+:)?collection\b/i.test(resourceType),
          bytes: Number(xmlValue(block, "getcontentlength") || 0),
          updated: xmlValue(block, "getlastmodified") || null,
        };
      }).filter(Boolean) as Array<{name:string;folder:boolean;bytes:number;updated:string|null}>;
    };

    if (req.method === "GET") {
      const url = new URL(req.url);
      const folder = safeSegment(url.searchParams.get("folder") ?? "");
      const name = safeSegment(url.searchParams.get("name") ?? "");
      if (!folder || !name || folder !== url.searchParams.get("folder") || name !== url.searchParams.get("name")) return json({ error: "Ruta de archivo no válida." }, 400);
      const response = await fetch(dav([root, folder, name]), { headers: { Authorization: auth }, redirect: "error" });
      if (!response.ok || !response.body) {
        await response.body?.cancel();
        return json({ error: response.status === 404 ? "El vídeo no existe en el NAS." : `No se pudo descargar el vídeo (HTTP ${response.status}).` }, response.status === 404 ? 404 : 502);
      }
      return new Response(response.body, { status: 200, headers: {
        ...corsHeaders, "Content-Type": response.headers.get("Content-Type") ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "no-store",
      }});
    }

    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      if (form.get("action") !== "chunk") return json({ error: "Acción de subida no válida." }, 400);
      const uploadId = String(form.get("uploadId") ?? "");
      const folder = safeSegment(String(form.get("folder") ?? ""));
      const filename = safeSegment(String(form.get("filename") ?? ""));
      const chunkIndex = Number(form.get("chunkIndex"));
      const totalChunks = Number(form.get("totalChunks"));
      const chunk = form.get("chunk");
      if (!/^[A-Za-z0-9-]{20,50}$/.test(uploadId) || !folder || !filename || !Number.isInteger(chunkIndex) || !Number.isInteger(totalChunks) || totalChunks < 1 || totalChunks > 10000 || chunkIndex < 0 || chunkIndex >= totalChunks || !(chunk instanceof File) || chunk.size > CHUNK_SIZE + 1024) {
        return json({ error: "Fragmento de vídeo no válido." }, 400);
      }
      const uploadRoot = ["remote.php", "dav", "uploads", username, uploadId];
      const mkcol = await fetch(new URL(uploadRoot.map(encodeURIComponent).join("/"), baseUrl.endsWith("/") ? baseUrl + "/" : baseUrl + "/"), { method: "MKCOL", headers: { Authorization: auth }, redirect: "error" });
      if (![201, 405].includes(mkcol.status)) {
        const status = mkcol.status; await mkcol.body?.cancel();
        if (status !== 409) throw new Error(`Nextcloud no pudo preparar la subida fragmentada (HTTP ${status}).`);
      } else await mkcol.body?.cancel();
      const chunkUrl = new URL([...uploadRoot, String(chunkIndex + 1).padStart(5, "0")].map(encodeURIComponent).join("/"), baseUrl.endsWith("/") ? baseUrl + "/" : baseUrl + "/");
      const uploaded = await fetch(chunkUrl, { method: "PUT", headers: { Authorization: auth, "Content-Type": "application/octet-stream" }, body: chunk, redirect: "error" });
      if (!uploaded.ok && uploaded.status !== 201 && uploaded.status !== 204) {
        const status = uploaded.status; await uploaded.body?.cancel();
        return json({ error: `Nextcloud rechazó el fragmento ${chunkIndex + 1} (HTTP ${status}).` }, 502);
      }
      await uploaded.body?.cancel();
      return json({ ok: true, chunk: chunkIndex });
    }

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "";
    if (action === "list") {
      const folders = await listDirectory(root);
      const result = [];
      for (const item of folders) {
        if (!item.folder) continue;
        const files = await listDirectory([root, item.name]);
        for (const file of files) {
          if (file.folder || !/\.(mp4|mov|webm|m4v|avi|mkv)$/i.test(file.name)) continue;
          result.push({ name: file.name, folder: item.name, bytes: file.bytes, updated: file.updated });
        }
      }
      return json({ ok: true, files: result });
    }
    if (action === "finalize") {
      const uploadId = typeof body.uploadId === "string" ? body.uploadId : "";
      const folder = safeSegment(typeof body.folder === "string" ? body.folder : "");
      const filename = safeSegment(typeof body.filename === "string" ? body.filename : "");
      const totalBytes = Number(body.totalBytes);
      if (!/^[A-Za-z0-9-]{20,50}$/.test(uploadId) || !folder || !filename || !Number.isSafeInteger(totalBytes) || totalBytes < 1) return json({ error: "Datos de finalización no válidos." }, 400);
      await ensureCollection(["AurumLab", participantId, user.id, folder]);
      const source = new URL(["remote.php", "dav", "uploads", username, uploadId, ".file"].map(encodeURIComponent).join("/"), baseUrl.endsWith("/") ? baseUrl + "/" : baseUrl + "/");
      const destination = dav([root, folder, filename]);
      const moved = await fetch(source, { method: "MOVE", headers: { Authorization: auth, Destination: destination.toString(), "OC-Total-Length": String(totalBytes), "OC-Chunked": "1", Overwrite: "F" }, redirect: "error" });
      if (moved.status !== 201 && moved.status !== 204) {
        const status = moved.status; await moved.body?.cancel();
        return json({ error: `Nextcloud no pudo finalizar el vídeo (HTTP ${status}).` }, 502);
      }
      await moved.body?.cancel();
      return json({ ok: true, folder, name: filename, bytes: totalBytes });
    }
    if (action === "delete") {
      const folder = safeSegment(typeof body.folder === "string" ? body.folder : "");
      const filename = safeSegment(typeof body.name === "string" ? body.name : "");
      if (!folder || !filename) return json({ error: "Archivo no válido." }, 400);
      const response = await fetch(dav([root, folder, filename]), { method: "DELETE", headers: { Authorization: auth }, redirect: "error" });
      if (response.status !== 204 && response.status !== 200 && response.status !== 404) {
        const status = response.status; await response.body?.cancel();
        return json({ error: `No se pudo eliminar el vídeo (HTTP ${status}).` }, 502);
      }
      await response.body?.cancel();
      return json({ ok: true });
    }
    return json({ error: "Acción no válida." }, 400);
  } catch (error) {
    console.error("[nextcloud-video-files]", error instanceof Error ? error.message : "unknown");
    return json({ error: error instanceof Error ? error.message : "No se pudo completar la operación en el NAS." }, 500);
  }
});
