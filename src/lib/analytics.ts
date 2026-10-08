import { supabase } from "@/integrations/supabase/client";

export type AurumAnalyticsEvent =
  | "page_view"
  | "tool_opened"
  | "render_opened"
  | "platform_opened"
  | "catalog_opened"
  | "product_viewed"
  | "whatsapp_clicked"
  | "access_request_started"
  | "access_request_submitted"
  | "login_started"
  | "login_completed";

const SESSION_KEY = "aurum_analytics_session";
const LOGIN_STARTED_KEY = "aurum_login_started";

function sessionId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const value =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(SESSION_KEY, value);
  return value;
}

export function registrarEvento(
  event: AurumAnalyticsEvent,
  metadata: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined") return;

  const payload = {
    event_name: event,
    session_id: sessionId(),
    path: window.location.pathname,
    referrer: document.referrer || null,
    metadata: {
      ...metadata,
      language: navigator.language || null,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    },
  };

  void supabase
    .from("aurum_analytics_events")
    .insert(payload)
    .then(({ error }) => {
      if (error && import.meta.env.DEV) {
        console.debug("[Aurum Analytics]", error.message);
      }
    });
}

export function marcarInicioLogin(): void {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(LOGIN_STARTED_KEY, "1");
  }
}

export function consumirInicioLogin(): boolean {
  if (typeof window === "undefined") return false;
  const started = window.sessionStorage.getItem(LOGIN_STARTED_KEY) === "1";
  if (started) window.sessionStorage.removeItem(LOGIN_STARTED_KEY);
  return started;
}
