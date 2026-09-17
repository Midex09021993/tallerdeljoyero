import webPush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

type PedidoPayload = {
  pedido_id?: string;
  referencia?: string;
  cliente?: string;
  prueba?: boolean;
  diagnostico?: boolean;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");
  const envDiagnostic = diagnosticarEntornoPush({
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    VAPID_PUBLIC_KEY: vapidPublicKey,
    VAPID_PRIVATE_KEY: vapidPrivateKey,
    VAPID_SUBJECT: vapidSubject,
  });

  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!token) return json({ error: "Unauthorized", step: "auth_token" }, 401);

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("push_environment_error", {
      step: "supabase_environment",
      missing: envDiagnostic.missing,
      empty: envDiagnostic.empty,
      configured: envDiagnostic.configured,
    });
    return json(
      {
        error: "Supabase environment is not configured",
        step: "environment",
        missing: envDiagnostic.missing,
        empty: envDiagnostic.empty,
        configured: envDiagnostic.configured,
      },
      500,
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return json({ error: "Unauthorized", step: "auth_user", detail: userError?.message }, 401);
  }

  const payload = (await req.json().catch(() => ({}))) as PedidoPayload;

  // Las pruebas de notificación siguen siendo exclusivas de Dueño/Gerente.
  if (payload.prueba || payload.diagnostico) {
    const { data: canAdmin } = await supabase.rpc("es_admin", { _user_id: user.id });
    if (!canAdmin) return json({ error: "Forbidden", step: "role_check" }, 403);
  } else {
    // Un pedido puede ser registrado por un usuario interno distinto del Dueño.
    // La notificación debe llegar al Dueño igualmente. Los clientes no pueden
    // usar este canal interno para generar avisos.
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (rolesError) return json({ error: rolesError.message, step: "role_check" }, 500);

    const esUsuarioInterno = (roles ?? []).some((row) => row.role !== "cliente");
    if (!esUsuarioInterno) return json({ error: "Forbidden", step: "role_check" }, 403);
  }

  if (payload.diagnostico) {
    console.info("push_environment_diagnostic", {
      ok: envDiagnostic.ok,
      missing: envDiagnostic.missing,
      empty: envDiagnostic.empty,
      configured: envDiagnostic.configured,
    });
    return json({
      ok: envDiagnostic.ok,
      mode: "diagnostico",
      user_id: user.id,
      missing: envDiagnostic.missing,
      empty: envDiagnostic.empty,
      configured: envDiagnostic.configured,
      message: envDiagnostic.ok
        ? "Push environment configured"
        : `Falta configurar: ${[...envDiagnostic.missing, ...envDiagnostic.empty].join(", ")}`,
    });
  }

  if (!envDiagnostic.ok) {
    console.error("push_environment_error", {
      step: "vapid_environment",
      missing: envDiagnostic.missing,
      empty: envDiagnostic.empty,
      configured: envDiagnostic.configured,
    });
    return json(
      {
        error: "Push environment is not configured",
        step: "vapid_environment",
        missing: envDiagnostic.missing,
        empty: envDiagnostic.empty,
        configured: envDiagnostic.configured,
        message: `Falta configurar: ${[...envDiagnostic.missing, ...envDiagnostic.empty].join(", ")}`,
      },
      500,
    );
  }

  if (!payload.pedido_id && !payload.prueba) return json({ error: "Missing pedido_id" }, 400);

  let pedidoReal: { id: string; referencia: string; cliente: string; sede_id: string | null } | null = null;
  let sedeNombre = "Sin sede";
  let registradorNombre = user.email ?? "Usuario interno";

  if (!payload.prueba) {
    const { data: pedido, error: pedidoError } = await supabase
      .from("pedidos")
      .select("id, referencia, cliente, sede_id")
      .eq("id", payload.pedido_id)
      .maybeSingle();
    if (pedidoError) return json({ error: pedidoError.message, step: "pedido_query" }, 500);
    if (!pedido) return json({ error: "Pedido no encontrado", step: "pedido_query" }, 404);
    pedidoReal = pedido;

    const [{ data: sede, error: sedeError }, { data: perfil, error: perfilError }] = await Promise.all([
      pedido.sede_id
        ? supabase.from("sedes").select("nombre").eq("id", pedido.sede_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from("profiles").select("nombre").eq("id", user.id).maybeSingle(),
    ]);

    if (sedeError) return json({ error: sedeError.message, step: "sede_query" }, 500);
    if (perfilError) return json({ error: perfilError.message, step: "profile_query" }, 500);

    sedeNombre = sede?.nombre?.trim() || "Sin sede";
    registradorNombre = perfil?.nombre?.trim() || user.email || "Usuario interno";
  }

  const { data: duenos, error: duenosError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "dueno");
  if (duenosError) return json({ error: duenosError.message, step: "owners_query" }, 500);

  const duenoIds = [...new Set((duenos ?? []).map((dueno) => dueno.user_id))];
  if (duenoIds.length === 0) return json({ ok: true, enviados: 0 });

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", duenoIds);
  if (error) return json({ error: error.message, step: "subscriptions_query" }, 500);

  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const body = JSON.stringify({
    title: "🔔 Taller del Joyero",
    body: payload.prueba
      ? "Notificaciones activadas correctamente."
      : [
          "Nuevo pedido registrado",
          "",
          `Código: ${pedidoReal?.referencia ?? payload.referencia ?? ""}`,
          `Cliente: ${pedidoReal?.cliente ?? payload.cliente ?? ""}`,
          `Sede: ${sedeNombre}`,
          `Registrado por: ${registradorNombre}`,
        ].join("\n"),
    url: payload.prueba
      ? "/inicio"
      : pedidoReal?.id
        ? `/pedidos/${pedidoReal.id}`
        : "/pedidos",
  });

  let enviados = 0;
  await Promise.all(
    ((subscriptions ?? []) as PushSubscriptionRow[]).map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
        );
        enviados += 1;
      } catch (error) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number(error.statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
        }
        console.error("push_send_error", {
          subscription_id: subscription.id,
          statusCode,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }),
  );

  return json({ ok: true, enviados });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

type EntornoPush = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
};

function diagnosticarEntornoPush(env: EntornoPush) {
  const required = Object.keys(env) as Array<keyof EntornoPush>;
  const missing: string[] = [];
  const empty: string[] = [];
  const configured: Record<string, boolean> = {};

  for (const key of required) {
    const value = env[key];
    const exists = value !== undefined;
    const hasValue = typeof value === "string" && value.trim().length > 0;
    configured[key] = hasValue;
    if (!exists) missing.push(key);
    else if (!hasValue) empty.push(key);
  }

  return {
    ok: missing.length === 0 && empty.length === 0,
    missing,
    empty,
    configured,
  };
}
