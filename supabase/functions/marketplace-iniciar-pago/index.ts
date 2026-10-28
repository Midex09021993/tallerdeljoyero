import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const accessToken = Deno.env.get("MP_ACCESS_TOKEN");
    const appBaseUrl = Deno.env.get("APP_BASE_URL");
    if (!supabaseUrl || !anonKey || !serviceKey || !accessToken || !appBaseUrl) {
      return json({ error: "Los pagos aún no están configurados. Contacta con soporte." }, 503);
    }

    const baseUrl = new URL(appBaseUrl);
    if (baseUrl.protocol !== "https:" || !["www.tallerdeljoyero.com", "tallerdeljoyero.com"].includes(baseUrl.hostname)) {
      return json({ error: "La URL pública de la tienda no está configurada de forma segura." }, 503);
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Inicia sesión para comprar." }, 401);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "La sesión no es válida." }, 401);

    const body = await req.json().catch(() => ({}));
    const archivoId = String(body?.archivo_id ?? "").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(archivoId)) {
      return json({ error: "El archivo seleccionado no es válido." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: archivo, error: archivoError } = await admin
      .from("archivos_digitales_marketplace")
      .select("id, titulo, precio, moneda, estado, vendedor_usuario_id")
      .eq("id", archivoId)
      .eq("estado", "publicado")
      .maybeSingle();
    if (archivoError) throw archivoError;
    if (!archivo) return json({ error: "Este recurso ya no está disponible." }, 404);
    if (archivo.vendedor_usuario_id === authData.user.id) return json({ error: "No puedes comprar tu propia publicación." }, 400);
    if (archivo.moneda !== "PEN") return json({ error: "Por ahora solo se pueden comprar publicaciones en soles (PEN). Las publicaciones en USD no se cobran hasta definir la conversión de moneda." }, 400);
    const precio = Number(archivo.precio);
    if (!Number.isFinite(precio) || precio <= 0 || Math.round(precio * 100) <= 0) {
      return json({ error: "El precio publicado no es válido." }, 400);
    }

    const comision = Math.round(precio * 20) / 100;
    const importeVendedor = Math.round((precio - comision) * 100) / 100;
    const { data: compra, error: compraError } = await admin
      .from("compras_archivos_digitales")
      .insert({
        archivo_id: archivo.id,
        comprador_usuario_id: authData.user.id,
        vendedor_usuario_id: archivo.vendedor_usuario_id,
        precio_pagado: precio,
        moneda: "PEN",
        estado_pago: "pendiente",
        proveedor_pago: "mercado_pago",
        comision_plataforma: comision,
        importe_vendedor: importeVendedor,
      })
      .select("id")
      .single();
    if (compraError) throw compraError;

    const origin = baseUrl.origin;
    const webhookUrl = supabaseUrl.replace(/\/$/, "") + "/functions/v1/marketplace-pago-webhook";
    const preferenceResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
        "X-Idempotency-Key": compra.id,
      },
      body: JSON.stringify({
        items: [{
          id: archivo.id,
          title: String(archivo.titulo).slice(0, 250),
          description: "Archivo digital de joyería",
          quantity: 1,
          currency_id: "PEN",
          unit_price: precio,
        }],
        external_reference: compra.id,
        notification_url: webhookUrl,
        back_urls: {
          success: origin + "/marketplace-mis-compras?payment=success",
          pending: origin + "/marketplace-mis-compras?payment=pending",
          failure: origin + "/marketplace-mis-compras?payment=failure",
        },
        auto_return: "approved",
        metadata: { compra_id: compra.id, archivo_id: archivo.id, comprador_usuario_id: authData.user.id },
        statement_descriptor: "TALLER JOYERO",
      }),
    });
    const preference = await preferenceResponse.json().catch(() => ({}));
    if (!preferenceResponse.ok || typeof preference?.init_point !== "string") {
      await admin.from("compras_archivos_digitales").update({ estado_pago: "fallido" }).eq("id", compra.id).eq("estado_pago", "pendiente");
      console.error("Mercado Pago preference error", preferenceResponse.status, preference?.message ?? preference?.error ?? "unknown");
      return json({ error: "No se pudo iniciar el pago. Inténtalo nuevamente más tarde." }, 502);
    }

    const { error: updateError } = await admin
      .from("compras_archivos_digitales")
      .update({ preferencia_pago: String(preference.id ?? "") })
      .eq("id", compra.id);
    if (updateError) throw updateError;

    return json({ ok: true, compra_id: compra.id, init_point: preference.init_point, sandbox_init_point: preference.sandbox_init_point ?? null });
  } catch (error) {
    console.error("marketplace-iniciar-pago", error);
    return json({ error: "No se pudo iniciar el pago en este momento." }, 500);
  }
});
