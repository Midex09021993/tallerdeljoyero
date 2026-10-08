import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type WelcomePayload = {
  nombre?: string;
  taller?: string;
  email?: string;
  loginUrl?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function esc(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char] ?? char));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as WelcomePayload;
    const nombre = body.nombre?.trim();
    const taller = body.taller?.trim();
    const email = body.email?.trim().toLowerCase();
    const loginUrl = body.loginUrl?.trim();

    if (!nombre || !taller || !email || !loginUrl) {
      return Response.json({ ok: false, error: "Datos de bienvenida incompletos" }, { status: 400, headers: corsHeaders });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("AURUM_FROM_EMAIL") || "Aurum Lab <noreply@tallerdeljoyero.com>";

    if (!apiKey) {
      console.error("[aurum-welcome-email] Falta RESEND_API_KEY");
      return Response.json({ ok: false, error: "Servicio de correo no configurado" }, { status: 503, headers: corsHeaders });
    }

    const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#090a0b;color:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:620px;margin:0 auto;padding:40px 20px">
    <div style="border:1px solid #3b321b;border-radius:18px;background:#111315;padding:32px">
      <p style="margin:0;color:#d4af37;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">AURUM LAB</p>
      <h1 style="margin:18px 0 10px;font-size:28px;color:#fff">Tu taller ya está listo</h1>
      <p style="color:#c5c5c5;line-height:1.6">Hola ${esc(nombre)}, hemos creado tu espacio de trabajo en Aurum Lab.</p>
      <div style="margin:24px 0;padding:18px;border:1px solid #292929;border-radius:12px;background:#0b0c0d">
        <p style="margin:0 0 8px;color:#8f8f8f;font-size:12px;text-transform:uppercase;letter-spacing:1px">Taller</p>
        <p style="margin:0;color:#fff;font-size:18px;font-weight:700">${esc(taller)}</p>
        <p style="margin:16px 0 0;color:#8f8f8f;font-size:12px;text-transform:uppercase;letter-spacing:1px">Correo de acceso</p>
        <p style="margin:6px 0 0;color:#fff">${esc(email)}</p>
      </div>
      <p style="color:#c5c5c5;line-height:1.6">Usa la contraseña que elegiste durante el registro. Por seguridad, Aurum Lab nunca envía contraseñas por correo.</p>
      <p style="text-align:center;margin:30px 0">
        <a href="${esc(loginUrl)}" style="display:inline-block;background:#d4af37;color:#111315;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:10px">Entrar a Aurum Lab</a>
      </p>
      <p style="margin:26px 0 0;color:#777;font-size:12px;line-height:1.5">Si no realizaste este registro, ignora este mensaje y contacta con el administrador de Aurum Lab.</p>
    </div>
  </div>
</body>
</html>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Bienvenido a Aurum Lab · ${taller}`,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[aurum-welcome-email] Resend:", result);
      return Response.json({ ok: false, error: "El proveedor de correo rechazó el envío" }, { status: 502, headers: corsHeaders });
    }

    return Response.json({ ok: true, id: result.id ?? null }, { headers: corsHeaders });
  } catch (error) {
    console.error("[aurum-welcome-email]", error);
    return Response.json({ ok: false, error: "No se pudo enviar el correo de bienvenida" }, { status: 500, headers: corsHeaders });
  }
});
