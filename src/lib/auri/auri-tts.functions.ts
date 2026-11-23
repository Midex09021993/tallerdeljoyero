import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import {
  AURI_TTS_FALLBACK_MODEL,
  AURI_TTS_LANGUAGES,
  AURI_TTS_MODEL,
  construirPayloadTts,
  crearLimitador,
  extraerAudio,
  normalizarAudio,
  validarSolicitudTts,
} from "./tts-core";

export type AuriTtsResult = { audioBase64: string; mimeType: string; error?: undefined } | { audioBase64?: undefined; mimeType?: undefined; error: string };

const NO_DISPONIBLE = "La voz de AURI no está disponible temporalmente.";
const limitado = crearLimitador();
let principalNoExiste = false;

/**
 * Locución pública de respuestas de AURI con Gemini TTS (voz Sulafat).
 * Modelo y voz son fijos en servidor; no recibe contexto privado ni guarda audio.
 */
export const auriTts = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const result = validarSolicitudTts(data);
    if (!result.ok) throw new Error(result.error);
    return { text: result.text };
  })
  .handler(async ({ data }): Promise<AuriTtsResult> => {
    try {
      const apiKey = process.env["GEMINI_API_KEY"];
      if (!apiKey) return { error: NO_DISPONIBLE };
      const ip = (getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for") ?? "unknown").split(",")[0]?.trim().slice(0, 80) || "unknown";
      if (limitado(ip)) return { error: "Demasiadas solicitudes de voz. Espera unos minutos." };

      const modelos = principalNoExiste ? [AURI_TTS_FALLBACK_MODEL] : [AURI_TTS_MODEL, AURI_TTS_FALLBACK_MODEL];
      let lastStatus = 503;
      for (const model of modelos) {
        for (const languageCode of AURI_TTS_LANGUAGES) {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify(construirPayloadTts(data.text, languageCode)),
            signal: AbortSignal.timeout(25_000),
          });
          lastStatus = response.status;
          if (response.ok) {
            const audio = extraerAudio(await response.json());
            if (!audio) {
              console.warn("AURI TTS response without audio", { model });
              return { error: NO_DISPONIBLE };
            }
            return normalizarAudio(audio);
          }
          await response.body?.cancel();
          // 400 con es-419: se reintenta con es-ES; cualquier otro error pasa al siguiente modelo o termina.
          if (response.status === 400 && languageCode === AURI_TTS_LANGUAGES[0]) continue;
          break;
        }
        if (lastStatus === 404 && model === AURI_TTS_MODEL) {
          principalNoExiste = true;
          console.warn("AURI TTS primary model not found; using fallback", { model });
          continue;
        }
        break;
      }
      console.warn("AURI TTS unavailable", { status: lastStatus });
      return { error: NO_DISPONIBLE };
    } catch (error) {
      console.error("AURI TTS failed", error instanceof Error ? error.name : "error");
      return { error: NO_DISPONIBLE };
    }
  });
