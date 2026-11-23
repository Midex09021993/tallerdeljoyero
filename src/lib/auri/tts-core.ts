// Lógica pura de la voz de AURI (Gemini TTS). Sin APIs de servidor para poder probarla.

export const AURI_TTS_MODEL = "gemini-3.8-flash-lite-tts";
// Solo se usa si el modelo principal no existe para la clave (404).
export const AURI_TTS_FALLBACK_MODEL = "gemini-2.5-flash-preview-tts";
export const AURI_TTS_VOICE = "Sulafat";
export const AURI_TTS_LANGUAGES = ["es-419", "es-ES"] as const;
export const AURI_TTS_MAX_CHARS = 1800;
export const AURI_TTS_RATE_LIMIT = 20;
export const AURI_TTS_RATE_WINDOW_MS = 10 * 60 * 1000;

export type TtsValidation = { ok: true; text: string } | { ok: false; error: string };

/** Acepta únicamente `{ text: string }`; modelo y voz nunca vienen del cliente. */
export function validarSolicitudTts(body: unknown): TtsValidation {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "Solicitud no válida." };
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== "text") return { ok: false, error: "Solicitud no válida." };
  const value = (body as { text?: unknown }).text;
  if (typeof value !== "string") return { ok: false, error: "Solicitud no válida." };
  // eslint-disable-next-line no-control-regex
  const text = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (!text) return { ok: false, error: "No hay texto para leer." };
  if (text.length > AURI_TTS_MAX_CHARS) return { ok: false, error: "El texto es demasiado largo." };
  return { ok: true, text };
}

export function construirPayloadTts(text: string, languageCode: string) {
  return {
    contents: [{
      role: "user",
      parts: [{ text: `Lee en voz alta, en español latinoamericano, con un tono cálido, cercano, amable y profesional, el siguiente texto:\n\n${text}` }],
    }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        languageCode,
        voiceConfig: { prebuiltVoiceConfig: { voiceName: AURI_TTS_VOICE } },
      },
    },
  };
}

type InlinePart = { inlineData?: { mimeType?: unknown; data?: unknown } };

/** Primera parte de audio en la respuesta de generateContent, o null si no hay audio. */
export function extraerAudio(result: unknown): { data: string; mimeType: string } | null {
  const parts = (result as { candidates?: Array<{ content?: { parts?: InlinePart[] } }> } | null)?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  for (const part of parts) {
    const inline = part?.inlineData;
    if (!inline || typeof inline.data !== "string" || !inline.data) continue;
    const mimeType = typeof inline.mimeType === "string" && inline.mimeType ? inline.mimeType : "audio/wav";
    if (!/^audio\//i.test(mimeType)) continue;
    return { data: inline.data, mimeType };
  }
  return null;
}

function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** PCM lineal (audio/L16, audio/pcm) se envuelve en WAV; WAV y otros formatos de audio pasan tal cual. */
export function normalizarAudio(audio: { data: string; mimeType: string }): { audioBase64: string; mimeType: string } {
  const mime = audio.mimeType.toLowerCase();
  if (!/audio\/(l16|pcm)/.test(mime)) {
    const base = mime.split(";")[0]?.trim() || "audio/wav";
    return { audioBase64: audio.data, mimeType: base === "audio/x-wav" || base === "audio/wave" ? "audio/wav" : base };
  }
  const rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000) || 24000;
  const channels = Number(/channels=(\d+)/.exec(mime)?.[1] ?? 1) || 1;
  const pcm = base64ToBytes(audio.data);
  const wav = new Uint8Array(44 + pcm.length);
  const view = new DataView(wav.buffer);
  const writeStr = (offset: number, s: string) => { for (let i = 0; i < s.length; i++) wav[offset + i] = s.charCodeAt(i); };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + pcm.length, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, pcm.length, true);
  wav.set(pcm, 44);
  return { audioBase64: bytesToBase64(wav), mimeType: "audio/wav" };
}

/** Límite por IP en ventana deslizante simple. */
export function crearLimitador(limit = AURI_TTS_RATE_LIMIT, windowMs = AURI_TTS_RATE_WINDOW_MS) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return (ip: string, now = Date.now()) => {
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
    const current = buckets.get(ip);
    if (!current) {
      buckets.set(ip, { count: 1, resetAt: now + windowMs });
      return false;
    }
    current.count += 1;
    return current.count > limit;
  };
}
