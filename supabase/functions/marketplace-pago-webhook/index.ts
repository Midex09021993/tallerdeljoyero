import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function validarFirma(signatureHeader: string, requestId: string, dataId: string, secret: string): Promise<boolean> {
  const values = Object.fromEntries(signatureHeader.split(",").map((part) => {
    const [key, ...rest] = part.trim().split("=");
    return [key, rest.join("=")];
  }));
  if (!values.ts || !values.v1) return false;
  const manifiesto = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${values.ts};`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(manifiesto)));
  const firmaEsperada = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (firmaEsperada.length !== values.v1.length) return false;
  let diferencia = 0;
  for (let i = 0; i < firmaEsperada.length; i++) diferencia |= firmaEsperada.charCodeAt(i) ^ values.v1.charCodeAt(i);
  return diferencia === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const accessToken = Deno.env.get("MP_ACCESS_TOKEN");
    const webhookSecret = Deno.env.get("MP_WEBHOOK_SECRET");
    if (!supabaseUrl || !serviceKey || !accessToken || !webhookSecret) return json({ error: "Webhook no configurado." }, 503);

    const body = await req.json().catch(() => ({}));
    const type = String(body?.type ?? body?.topic ?? "");
    const dataId = String(body?.data?.id ?? new URL(req.url).searchParams.get("data.id") ?? new URL(req.url).searchParams.get("id") ?? "").trim();
    if (type !== "payment" || !/^\d+$/.test(dataId)) return json({ ok: true, ignored: true });

    const signature = req.headers.get("x-signature") ?? "";
    const requestId = req.headers.get("x-request-id") ?? "";
    if (!signature || !requestId || !await validarFirma(signature, requestId, dataId, webhookSecret)) {
      return json({ error: "Firma de notificación no válida." }, 401);
    }

    const paymentResponse = await fetch("https://api.mercadopago.com/v1/payments/" + encodeURIComponent(dataId), {
      headers: { Authorization: "Bearer " + accessToken },
    });
    const payment = await paymentResponse.json().catch(() => ({}));
    if (!paymentResponse.ok) {
      console.error("Mercado Pago payment lookup failed", paymentResponse.status);
      return json({ error: "No se pudo verificar el pago." }, 502);
    }

    const compraId = String(payment?.external_reference ?? payment?.metadata?.compra_id ?? "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(compraId)) {
      return json({ ok: true, ignored: true });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: compra, error: compraError } = await admin
      .from("compras_archivos_digitales")
      .select("id, precio_pagado, moneda, estado_pago, proveedor_pago, referencia_pago")
      .eq("id", compraId)
      .eq("proveedor_pago", "mercado_pago")
      .maybeSingle();
    if (compraError) throw compraError;
    if (!compra) return json({ ok: true, ignored: true });

    const amount = Number(payment?.transaction_amount);
    const expectedAmount = Number(compra.precio_pagado);
    if (String(payment?.external_reference ?? "") !== compra.id ||
        payment?.currency_id !== compra.moneda ||
        !Number.isFinite(amount) ||
        Math.abs(amount - expectedAmount) > 0.001) {
      console.error("Marketplace payment amount/reference mismatch", { compraId, paymentId: dataId });
      return json({ error: "Los datos del pago no coinciden con la compra." }, 400);
    }

    const status = String(payment?.status ?? "");
    if (status === "approved") {
      if (compra.estado_pago === "pagado" && compra.referencia_pago === dataId) return json({ ok: true, duplicate: true });
      const { error } = await admin.from("compras_archivos_digitales")
        .update({ estado_pago: "pagado", referencia_pago: dataId, pagado_en: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", compra.id)
        .eq("estado_pago", "pendiente");
      if (error) throw error;
      return json({ ok: true, status: "pagado" });
    }
    if (status === "rejected" || status === "cancelled") {
      await admin.from("compras_archivos_digitales")
        .update({ estado_pago: "fallido", referencia_pago: dataId, updated_at: new Date().toISOString() })
        .eq("id", compra.id)
        .eq("estado_pago", "pendiente");
    } else if (status === "refunded" || status === "charged_back") {
      await admin.from("compras_archivos_digitales")
        .update({ estado_pago: status === "refunded" ? "reembolsado" : "disputado", referencia_pago: dataId, updated_at: new Date().toISOString() })
        .eq("id", compra.id);
    }
    return json({ ok: true, status });
  } catch (error) {
    console.error("marketplace-pago-webhook", error);
    return json({ error: "No se pudo procesar la notificación." }, 500);
  }
});
