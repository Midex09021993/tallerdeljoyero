import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

type ConsultaComercialInput = {
  nombre: string;
  email: string;
  telefono?: string;
  interes: "aurum_lab" | "aurum_render" | "curso_cad_joyeria" | "joya_personalizada" | "otra_consulta";
  mensaje: string;
  website?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INTERESES_VALIDOS = new Set([
  "aurum_lab",
  "aurum_render",
  "curso_cad_joyeria",
  "joya_personalizada",
  "otra_consulta",
]);

export const enviarConsultaComercial = createServerFn({ method: "POST" })
  .inputValidator((input: ConsultaComercialInput) => input)
  .handler(async ({ data }) => {
    const nombre = data.nombre?.trim();
    const email = data.email?.trim().toLowerCase();
    const telefono = data.telefono?.trim() ?? "";
    const mensaje = data.mensaje?.trim();
    const interes = data.interes;

    // Campo trampa para bots: responder de forma neutra sin guardar ni enviar.
    if (data.website?.trim()) return { ok: true, correoEnviado: false };
    if (!nombre || nombre.length < 2 || nombre.length > 120) throw new Error("Escribe tu nombre (entre 2 y 120 caracteres).");
    if (!email || email.length > 160 || !EMAIL_RE.test(email)) throw new Error("Escribe un correo electrónico válido.");
    if (telefono.length > 40) throw new Error("El teléfono no puede superar los 40 caracteres.");
    if (!INTERESES_VALIDOS.has(interes)) throw new Error("Selecciona el tema que te interesa.");
    if (!mensaje || mensaje.length < 5 || mensaje.length > 2000) throw new Error("El mensaje debe tener entre 5 y 2000 caracteres.");

    const { supabaseAdmin: adminTipado } = await import("@/integrations/supabase/client.server");
    // consultas_comerciales aún no figura en los tipos generados.
    const supabaseAdmin = adminTipado as unknown as SupabaseClient;
    // Límite básico por correo: máximo 3 consultas en una ventana de 10 minutos.
    // Complementa el campo trampa; no sustituye un CAPTCHA o rate limit de infraestructura.
    const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recientes, error: errorRecientes } = await supabaseAdmin
      .from("consultas_comerciales")
      .select("id")
      .eq("email", email)
      .gte("created_at", desde)
      .limit(3);
    if (errorRecientes) {
      console.error("[contacto-comercial] No se pudo comprobar el límite de consultas:", errorRecientes);
      throw new Error("No pudimos procesar tu consulta en este momento. Inténtalo nuevamente.");
    }
    if ((recientes ?? []).length >= 3) {
      throw new Error("Ya recibimos varias consultas desde este correo. Espera unos minutos antes de intentarlo otra vez.");
    }

    const { data: consulta, error } = await supabaseAdmin
      .from("consultas_comerciales")
      .insert({
        nombre,
        email,
        telefono: telefono || null,
        interes,
        mensaje,
        estado: "nuevo",
      })
      .select("id")
      .single();

    if (error || !consulta) {
      console.error("[contacto-comercial] No se pudo guardar la consulta:", error);
      throw new Error("No pudimos registrar tu consulta en este momento. Inténtalo nuevamente.");
    }

    let correoEnviado = false;
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const [adminResult, visitorResult] = await Promise.all([
        sendTemplateEmail("contacto-admin", "mgld_09@hotmail.com", {
          templateData: { nombre, email, telefono, interes, mensaje, consultaId: consulta.id },
          replyTo: email,
          idempotencyKey: `contacto-admin-${consulta.id}`,
        }),
        sendTemplateEmail("contacto-visitante", email, {
          templateData: { nombre, email, interes },
          idempotencyKey: `contacto-visitante-${consulta.id}`,
        }),
      ]);
      correoEnviado = adminResult.sent && visitorResult.sent;
    } catch (emailError) {
      // La consulta ya está guardada; un fallo de correo no debe perder el contacto.
      console.error("[contacto-comercial] Consulta guardada, pero falló el correo:", emailError);
    }

    return { ok: true, correoEnviado };
  });
