import { supabase } from "@/integrations/supabase/client";

const COOKIE_NAME = "aurum_referral_visitor";
const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const HASH_PATTERN = /^[a-f0-9]{64}$/i;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const item = document.cookie.split("; ").find((part) => part.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

function writeCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
}

async function sha256(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("Este navegador no permite generar una referencia segura.");
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getVisitorHash(): Promise<string> {
  const existing = readCookie(COOKIE_NAME);
  if (existing && HASH_PATTERN.test(existing)) return existing;

  const token = globalThis.crypto?.randomUUID?.();
  if (!token) throw new Error("No se pudo generar el identificador de visita.");
  const hash = await sha256(token);
  writeCookie(COOKIE_NAME, hash, COOKIE_MAX_AGE_SECONDS);
  return hash;
}

/** Registra la primera visita atribuible. La base de datos conserva el primer afiliado. */
export async function registrarVisitaAfiliado(codigo: string): Promise<void> {
  const normalizedCode = codigo.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,64}$/.test(normalizedCode)) return;

  const visitanteHash = await getVisitorHash();
  const { error } = await (supabase as any).rpc("aurum_registrar_visita_afiliado", {
    _codigo: normalizedCode,
    _visitante_hash: visitanteHash,
  });
  if (error) throw error;
}

/** Vincula la visita guardada a la cuenta autenticada; la RPC es idempotente. */
export async function vincularReferidoPendiente(): Promise<void> {
  const visitanteHash = readCookie(COOKIE_NAME);
  if (!visitanteHash || !HASH_PATTERN.test(visitanteHash)) return;

  const { error } = await (supabase as any).rpc("aurum_vincular_referido_afiliado", {
    _visitante_hash: visitanteHash,
  });
  if (error) throw error;
  clearCookie(COOKIE_NAME);
}
