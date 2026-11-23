import { describe, expect, test } from "bun:test";
import {
  AURI_TTS_MAX_CHARS,
  AURI_TTS_MODEL,
  AURI_TTS_VOICE,
  construirPayloadTts,
  crearLimitador,
  extraerAudio,
  normalizarAudio,
  validarSolicitudTts,
} from "../src/lib/auri/tts-core";

describe("AURI voz Sulafat", () => {
  test("modelo y voz fijos en servidor", () => {
    expect(AURI_TTS_MODEL).toBe("gemini-3.8-flash-lite-tts");
    const payload = construirPayloadTts("Hola", "es-419");
    expect(payload.generationConfig.responseModalities).toEqual(["AUDIO"]);
    expect(payload.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe(AURI_TTS_VOICE);
    expect(AURI_TTS_VOICE).toBe("Sulafat");
    expect(payload.generationConfig.speechConfig.languageCode).toBe("es-419");
  });

  test("solo acepta { text } y rechaza que el cliente elija modelo o voz", () => {
    expect(validarSolicitudTts({ text: "Hola" })).toEqual({ ok: true, text: "Hola" });
    expect(validarSolicitudTts({ text: "Hola", voice: "Puck" }).ok).toBe(false);
    expect(validarSolicitudTts({ text: "Hola", model: "otro" }).ok).toBe(false);
    expect(validarSolicitudTts({ text: 5 }).ok).toBe(false);
    expect(validarSolicitudTts(["Hola"]).ok).toBe(false);
    expect(validarSolicitudTts(null).ok).toBe(false);
    expect(validarSolicitudTts({ text: "   " }).ok).toBe(false);
  });

  test("máximo 1800 caracteres por solicitud", () => {
    expect(AURI_TTS_MAX_CHARS).toBe(1800);
    expect(validarSolicitudTts({ text: "a".repeat(1800) }).ok).toBe(true);
    expect(validarSolicitudTts({ text: "a".repeat(1801) }).ok).toBe(false);
  });

  test("límite de 20 solicitudes por IP cada 10 minutos", () => {
    const limitado = crearLimitador();
    const t0 = 1_000_000;
    for (let i = 0; i < 20; i++) expect(limitado("1.1.1.1", t0)).toBe(false);
    expect(limitado("1.1.1.1", t0)).toBe(true);
    expect(limitado("2.2.2.2", t0)).toBe(false);
    expect(limitado("1.1.1.1", t0 + 10 * 60 * 1000)).toBe(false);
  });

  test("extrae audio WAV de la respuesta y detecta respuestas sin audio", () => {
    const ok = { candidates: [{ content: { parts: [{ inlineData: { mimeType: "audio/wav", data: "UklGRg==" } }] } }] };
    expect(extraerAudio(ok)).toEqual({ mimeType: "audio/wav", data: "UklGRg==" });
    expect(extraerAudio({ candidates: [{ content: { parts: [{ text: "sin audio" }] } }] })).toBeNull();
    expect(extraerAudio({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: "AAAA" } }] } }] })).toBeNull();
    expect(extraerAudio({})).toBeNull();
    expect(normalizarAudio({ mimeType: "audio/wav", data: "UklGRg==" })).toEqual({ audioBase64: "UklGRg==", mimeType: "audio/wav" });
  });

  test("PCM L16 se envuelve en WAV válido", () => {
    const pcm = btoa(String.fromCharCode(1, 0, 2, 0));
    const out = normalizarAudio({ mimeType: "audio/L16;codec=pcm;rate=24000", data: pcm });
    expect(out.mimeType).toBe("audio/wav");
    const bytes = Uint8Array.from(atob(out.audioBase64), (c) => c.charCodeAt(0));
    expect(bytes.length).toBe(48);
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe("RIFF");
    expect(new DataView(bytes.buffer).getUint32(24, true)).toBe(24000);
  });
});
