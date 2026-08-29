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
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@tallerdeljoyero.local";

  const missingEnv = [
    ...(!supabaseUrl ? ["SUPABASE_URL"] : []),
    ...(!serviceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
    ...(!vapidPublicKey ? ["VAPID_PUBLIC_KEY"] : []),
    ...(!vapidPrivateKey ? ["VAPID_PRIVATE_KEY"] : []),
  ];

  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!token) return json({ error: "Unauthorized", step: "auth_token" }, 401);

  if (!supabaseUrl || !serviceRoleKey) {
    return json(
      {
        error: "Supabase environment is not configured",
        step: "environment",
        missing: missingEnv,
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

  const { data: canCreate } = await supabase.rpc("es_admin", { _user_id: user.id });
  if (!canCreate) return json({ error: "Forbidden", step: "role_check" }, 403);

  const payload = (await req.json().catch(() => ({}))) as PedidoPayload;
  if (payload.diagnostico) {
    return json({
      ok: missingEnv.length === 0,
      mode: "diagnostico",
      user_id: user.id,
      vapid_public_configured: Boolean(vapidPublicKey),
      vapid_private_configured: Boolean(vapidPrivateKey),
      vapid_subject_configured: Boolean(vapidSubject),
      missing: missingEnv,
    });
  }

  if (missingEnv.length > 0) {
    return json(
      {
        error: "Push environment is not configured",
        step: "vapid_environment",
        missing: missingEnv,
      },
      500,
    );
  }

  if (!payload.pedido_id && !payload.prueba) return json({ error: "Missing pedido_id" }, 400);

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
    title: "Taller del Joyero",
    body: payload.prueba
      ? "Notificaciones activadas correctamente."
      : `Nuevo pedido registrado\n${payload.referencia ?? ""}\n${payload.cliente ?? ""}`.trim(),
    url: payload.prueba
      ? "/inicio"
      : payload.pedido_id
        ? `/pedidos/${payload.pedido_id}`
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
