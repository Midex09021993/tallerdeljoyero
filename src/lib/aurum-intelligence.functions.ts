import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OWNER_UID = "5d80fd40-b059-42e9-ad57-28ac5cf9899e";
const RUNNER_ISSUER = "tallerdeljoyero";
const RUNNER_AUDIENCE = "aurum-intelligence-runner";
const MAX_TOKEN_SECONDS = 300;
const MAX_FILES = 500;
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".json"]);

type SourceFile = { path: string; content: string };

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replaceAll("+", "-").replaceAll("/", "_");
}

function validateSourceManifest(value: unknown): SourceFile[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_FILES) {
    throw new Error("El proyecto debe contener entre 1 y 500 archivos.");
  }
  let totalBytes = 0;
  const seen = new Set<string>();
  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Manifiesto de archivos no válido.");
    }
    const item = entry as Record<string, unknown>;
    if (Object.keys(item).some((key) => key !== "path" && key !== "content") ||
        typeof item.path !== "string" || typeof item.content !== "string") {
      throw new Error("Cada archivo debe contener únicamente path y content de texto.");
    }
    const path = item.path;
    if (!path || path.length > 240 || path.startsWith("/") || path.includes("\\") ||
        path.split("/").some((part) => !part || part === "." || part === ".." || part.startsWith("."))) {
      throw new Error("Ruta de archivo no permitida.");
    }
    const extension = path.slice(path.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension) || seen.has(path)) {
      throw new Error("Extensión no permitida o ruta duplicada.");
    }
    seen.add(path);
    const bytes = new TextEncoder().encode(item.content).byteLength;
    if (bytes > MAX_FILE_BYTES) throw new Error("Un archivo supera el límite de 1 MiB.");
    totalBytes += bytes;
    if (totalBytes > MAX_TOTAL_BYTES) throw new Error("El proyecto supera el límite total de 10 MiB.");
    return { path, content: item.content };
  });
}

async function createRunnerJwt(secret: string): Promise<string> {
  if (new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error("La firma privada del runner no está configurada correctamente.");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = encodeBase64Url(JSON.stringify({
    iss: RUNNER_ISSUER,
    aud: RUNNER_AUDIENCE,
    sub: OWNER_UID,
    iat: now,
    exp: now + MAX_TOKEN_SECONDS,
    jti: crypto.randomUUID().replace(/-/g, ""),
  }));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  const signatureBytes = new Uint8Array(signature);
  let binary = "";
  for (const byte of signatureBytes) binary += String.fromCharCode(byte);
  const encodedSignature = btoa(binary).replace(/=/g, "").replaceAll("+", "-").replaceAll("/", "_");
  return `${header}.${payload}.${encodedSignature}`;
}

export const verificarAccesoAurumIntelligence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (context.userId !== OWNER_UID) {
      throw new Error("No autorizado para AURUM INTELLIGENCE.");
    }
    return { autorizado: true as const };
  });

/**
 * Sends source text to the isolated runner for manifest validation only.
 * The runner currently discards the temporary workspace and does not execute REA.
 */
export const validarProyectoEnRunner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    if (!data || typeof data !== "object" || Array.isArray(data) ||
        Object.keys(data).some((key) => key !== "files")) {
      throw new Error("Solicitud de análisis no válida.");
    }
    const files = validateSourceManifest((data as { files?: unknown }).files);
    return { files };
  })
  .handler(async ({ context, data }) => {
    if (context.userId !== OWNER_UID) {
      throw new Error("No autorizado para AURUM INTELLIGENCE.");
    }

    const runnerUrl = process.env["AURUM_RUNNER_URL"];
    const signingSecret = process.env["AURUM_RUNNER_JWT_SECRET"];
    if (!runnerUrl || !signingSecret) {
      throw new Error("El servicio aislado todavía no está configurado.");
    }

    const endpoint = new URL("/v1/analyze", runnerUrl);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || (new URL(runnerUrl).pathname !== "/" && new URL(runnerUrl).pathname !== "")) {
      throw new Error("La dirección del runner debe ser HTTPS.");
    }

    const token = await createRunnerJwt(signingSecret);
    const response = await fetch(endpoint, {
      method: "POST",
      redirect: "error",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "cache-control": "no-store",
      },
      body: JSON.stringify({ files: data.files }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      if (response.status === 503) throw new Error("La protección anti-repetición del runner no está disponible.");
      if (response.status === 401) throw new Error("El runner rechazó la autenticación.");
      throw new Error("El runner no pudo validar el proyecto.");
    }
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" ||
        (result as Record<string, unknown>).status !== "validated_and_discarded") {
      throw new Error("El runner devolvió una respuesta no reconocida.");
    }
    return result;
  });


const MAX_PE_BYTES = 4 * 1024 * 1024;

export const analizarBinarioEnRunner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    if (!data || typeof data !== "object" || Array.isArray(data) ||
        Object.keys(data).some((key) => !["fileName", "contentBase64", "mode"].includes(key))) {
      throw new Error("Solicitud de análisis binario no válida.");
    }
    const item = data as Record<string, unknown>;
    if (typeof item.fileName !== "string" ||
        !/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}\.(exe|dll)$/i.test(item.fileName) ||
        typeof item.contentBase64 !== "string" ||
        item.contentBase64.length < 4 ||
        item.contentBase64.length > Math.ceil(MAX_PE_BYTES / 3) * 4 ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(item.contentBase64) ||
        !["managed", "native"].includes(String(item.mode))) {
      throw new Error("Archivo o modo de análisis no válido.");
    }
    return {
      fileName: item.fileName,
      contentBase64: item.contentBase64,
      mode: item.mode as "managed" | "native",
    };
  })
  .handler(async ({ context, data }) => {
    if (context.userId !== OWNER_UID) {
      throw new Error("No autorizado para AURUM INTELLIGENCE.");
    }
    const runnerUrl = process.env["AURUM_RUNNER_URL"];
    const signingSecret = process.env["AURUM_RUNNER_JWT_SECRET"];
    if (!runnerUrl || !signingSecret) {
      throw new Error("El servicio aislado todavía no está configurado.");
    }
    const base = new URL(runnerUrl);
    const endpoint = new URL("/v1/analyze-pe", base);
    if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash ||
        (base.pathname !== "/" && base.pathname !== "")) {
      throw new Error("La dirección del runner debe ser HTTPS.");
    }
    const token = await createRunnerJwt(signingSecret);
    const response = await fetch(endpoint, {
      method: "POST",
      redirect: "error",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "cache-control": "no-store",
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(9 * 60 * 1000),
    });
    if (!response.ok) {
      if (response.status === 503) throw new Error("La protección anti-repetición del runner no está disponible.");
      if (response.status === 401) throw new Error("El runner rechazó la autenticación.");
      if (response.status === 504) throw new Error("El análisis superó el tiempo máximo permitido.");
      throw new Error("El análisis estático no pudo completarse.");
    }
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" ||
        (result as Record<string, unknown>).status !== "static_analysis_complete" ||
        (result as Record<string, unknown>).executed === true) {
      throw new Error("El runner devolvió una respuesta no reconocida.");
    }
    return result;
  });
