import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Falta Authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "";
    const missing = [
      ["SUPABASE_URL", supabaseUrl],
      ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey],
      ["VAPID_PUBLIC_KEY", vapidPublicKey],
      ["VAPID_PRIVATE_KEY", vapidPrivateKey],
      ["VAPID_SUBJECT", vapidSubject],
    ].filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) return json({ ok: false, missing }, 500);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Sesión no válida" }, 401);
    const userId = userData.user.id;

    const payload = await req.json().catch(() => ({}));
    const prueba = Boolean(payload.prueba);
    const diagnostico = Boolean(payload.diagnostico);

    if (prueba || diagnostico) {
      const { data: adminRole } = await admin.rpc("es_admin", { _user_id: userId });
      if (!adminRole) return json({ error: "No autorizado" }, 403);
    } else {
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
      const internos = (roles ?? []).map((r) => String(r.role)).filter((r) => r !== "cliente");
      if (!internos.length) return json({ error: "No autorizado" }, 403);
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    if (diagnostico) return json({ ok: true, diagnostico: true });

    let referencia = String(payload.referencia ?? "");
    let cliente = String(payload.cliente ?? "");
    let sedeNombre = String(payload.sede ?? "");
    let registradorNombre = String(payload.registrado_por ?? "");
    const pedidoId = String(payload.pedido_id ?? "");

    if (!prueba && pedidoId) {
      const { data: pedido } = await admin.from("pedidos").select("id, referencia, cliente, sede_id").eq("id", pedidoId).maybeSingle();
      if (pedido) {
        referencia ||= pedido.referencia ?? "";
        cliente ||= pedido.cliente ?? "";
        if (!sedeNombre && pedido.sede_id) {
          const { data: sede } = await admin.from("sedes").select("nombre").eq("id", pedido.sede_id).maybeSingle();
          sedeNombre = sede?.nombre ?? "";
        }
      }
    }

    if (!registradorNombre) {
      const { data: profile } = await admin.from("profiles").select("nombre").eq("id", userId).maybeSingle();
      registradorNombre = profile?.nombre ?? "";
    }

    const { data: owners, error: ownersError } = await admin.from("user_roles").select("user_id").eq("rol", "dueno");
    if (ownersError) return json({ error: ownersError.message }, 500);
    const ownerIds = [...new Set((owners ?? []).map((row) => row.user_id).filter(Boolean))];
    if (!ownerIds.length) return json({ ok: true, sent: 0, reason: "No hay usuarios dueno" });

    const { data: subscriptions, error: subscriptionsError } = await admin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", ownerIds);
    if (subscriptionsError) return json({ error: subscriptionsError.message }, 500);

    const body = prueba
      ? "Notificaciones activadas correctamente."
      : [
          "Nuevo pedido registrado",
          "",
          `Código: ${referencia}`,
          `Cliente: ${cliente}`,
          `Sede: ${sedeNombre}`,
          `Registrado por: ${registradorNombre}`,
        ].join("\n");

    const notification = JSON.stringify({
      title: "🔔 Taller del Joyero",
      body,
      url: prueba ? "/inicio" : pedidoId ? `/pedidos/${pedidoId}` : "/pedidos",
    });

    let sent = 0;
    const deadIds: string[] = [];
    for (const subscription of subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          notification,
        );
        sent += 1;
      } catch (error) {
        const status = Number((error as { statusCode?: unknown })?.statusCode ?? 0);
        if (status === 404 || status === 410) deadIds.push(subscription.id);
      }
    }
    if (deadIds.length) await admin.from("push_subscriptions").delete().in("id", deadIds);
    return json({ ok: true, sent, owners: ownerIds.length, body });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
