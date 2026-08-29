import webPush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

type PedidoPayload = {
  pedido_id?: string;
  referencia?: string;
  cliente?: string;
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

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return json({ error: "Push environment is not configured" }, 500);
  }

  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!token) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  const { data: canCreate } = await supabase.rpc("es_admin", { _user_id: user.id });
  if (!canCreate) return json({ error: "Forbidden" }, 403);

  const payload = (await req.json().catch(() => ({}))) as PedidoPayload;
  if (!payload.pedido_id) return json({ error: "Missing pedido_id" }, 400);

  const { data: duenos, error: duenosError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "dueno");
  if (duenosError) return json({ error: duenosError.message }, 500);

  const duenoIds = [...new Set((duenos ?? []).map((dueno) => dueno.user_id))];
  if (duenoIds.length === 0) return json({ ok: true, enviados: 0 });

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", duenoIds);
  if (error) return json({ error: error.message }, 500);

  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const body = JSON.stringify({
    title: "Taller del Joyero",
    body: `Nuevo pedido registrado\n${payload.referencia ?? ""}\n${payload.cliente ?? ""}`.trim(),
    url: payload.pedido_id ? `/pedidos/${payload.pedido_id}` : "/pedidos",
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
