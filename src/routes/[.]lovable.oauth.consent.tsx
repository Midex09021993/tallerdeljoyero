import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, Check, LockKeyhole, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ETIQUETAS_SCOPE: Record<string, string> = {
  openid: "Confirmar tu identidad",
  email: "Ver tu correo electrónico",
  profile: "Ver tu perfil básico",
};

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // SSR has no localStorage session and would redirect signed-in users.
  ssr: false,
  head: () => ({
    meta: [
      { title: "Autorizar asistente — AURUM LAB" },
      { name: "description", content: "Autoriza a un asistente externo a consultar AURUM LAB con tu cuenta." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Autorizar asistente — AURUM LAB" },
      { property: "og:description", content: "Autoriza a un asistente externo a consultar AURUM LAB con tu cuenta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Falta el identificador de la autorización.");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ href: `/auth?next=${encodeURIComponent(next)}` });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.searchStr).get("authorization_id") ?? "";
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message || "La solicitud de autorización no es válida o ha caducado.");
    const immediate = (data as { redirect_url?: string; redirect_to?: string } | null)?.redirect_url ?? (data as { redirect_to?: string } | null)?.redirect_to;
    if (immediate && !(data as { client?: unknown } | null)?.client) throw redirect({ href: immediate });
    const { data: userData } = await supabase.auth.getUser();
    return { details: data as AuthorizationDetails | null, email: userData.user?.email ?? null };
  },
  component: Consent,
  pendingComponent: () => (
    <Marco><p className="text-sm text-muted-foreground" role="status">Cargando solicitud de autorización…</p></Marco>
  ),
  errorComponent: ({ error }) => (
    <Marco>
      <h1 className="text-lg font-semibold">No se pudo cargar esta autorización</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
      <p className="mt-4 text-xs text-muted-foreground">Vuelve a iniciar la conexión desde tu asistente.</p>
    </Marco>
  ),
});

type AuthorizationDetails = {
  client?: { name?: string; client_name?: string; uri?: string; client_uri?: string } | null;
  redirect_uri?: string;
  scope?: string;
};

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <img src="/brand/aurum-symbol.svg" alt="" width="36" height="36" className="size-9" />
          <span className="text-lg font-extrabold tracking-tight">AURUM <span className="text-gold">LAB</span></span>
        </div>
        {children}
      </div>
    </main>
  );
}

function Consent() {
  const { details, email } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cliente = details?.client?.name ?? details?.client?.client_name ?? "Un asistente externo";
  const destino = (() => {
    try { return details?.redirect_uri ? new URL(details.redirect_uri).host : null; } catch { return null; }
  })();
  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error: err } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorization_id)
      : await supabase.auth.oauth.denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(approve ? `No se pudo aprobar: ${err.message}` : `No se pudo cancelar: ${err.message}`);
      return;
    }
    const result = data as { redirect_url?: string; redirect_to?: string } | null;
    const target = result?.redirect_url ?? result?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("El servidor de autorización no devolvió a dónde volver.");
      return;
    }
    window.location.href = target;
  }

  return (
    <Marco>
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-gold"><Bot className="size-4" /> Integración de asistente</div>
      <h1 className="mt-2 text-xl font-semibold">Conectar {cliente} con AURUM LAB</h1>
      <p className="mt-2 text-sm text-muted-foreground">{cliente} podrá consultar pedidos, producción, contratos y clientes como tú, con tus mismos permisos.</p>

      <dl className="mt-5 space-y-2 rounded-xl bg-surface-muted p-4 text-xs">
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Cuenta</dt><dd className="font-medium">{email ?? "Sesión actual"}</dd></div>
        {destino ? <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Vuelve a</dt><dd className="font-medium break-all">{destino}</dd></div> : null}
      </dl>

      {scopes.length > 0 ? (
        <ul className="mt-4 space-y-1.5 text-sm">
          {scopes.map((s) => (
            <li key={s} className="flex items-center gap-2"><Check className="size-4 text-gold" /> {ETIQUETAS_SCOPE[s] ?? `Permiso adicional: ${s}`}</li>
          ))}
        </ul>
      ) : null}

      <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" /> Solo lectura. No incluye costes ni notas internas, y no salta los permisos de tu rol.</p>

      {error ? <p role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger/5 p-3 text-xs text-danger">{error}</p> : null}

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <button type="button" disabled={busy} onClick={() => decide(false)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-surface-muted disabled:opacity-50"><X className="size-4" /> Cancelar conexión</button>
        <button type="button" disabled={busy} onClick={() => decide(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-gold-foreground shadow-card disabled:opacity-50"><LockKeyhole className="size-4" /> {busy ? "Procesando…" : "Autorizar"}</button>
      </div>
    </Marco>
  );
}
