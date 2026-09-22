import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Quote = {
  id: string;
  numero: string;
  version: number;
  estado: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  fecha_entrega_solicitada: string | null;
  moneda: string;
  subtotal: number;
  descuento: number;
  impuestos: number;
  total: number;
  notas_cliente: string | null;
  cliente_id: string;
  proyecto_joya_id: string | null;
  sede_id: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "PEN",
    minimumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function wrap(text: string, maxChars = 88) {
  const words = clean(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawLabelValue(
  page: any,
  font: any,
  label: string,
  value: string,
  x: number,
  y: number,
) {
  page.drawText(label, { x, y, size: 8, font, color: rgb(0.42, 0.42, 0.45) });
  page.drawText(value || "—", { x, y: y - 13, size: 10, font, color: rgb(0.08, 0.08, 0.1) });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authorization = req.headers.get("Authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "");

    if (!supabaseUrl || !serviceRoleKey || !token) {
      return json({ error: "Sesión no válida." }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user) return json({ error: "Sesión no válida." }, 401);

    const body = await req.json().catch(() => ({}));
    const cotizacionId = clean(body?.cotizacion_id);
    if (!cotizacionId) return json({ error: "Falta cotizacion_id." }, 400);

    const { data: quote, error: quoteError } = await admin
      .from("cotizaciones")
      .select("id,numero,version,estado,fecha_emision,fecha_vencimiento,fecha_entrega_solicitada,moneda,subtotal,descuento,impuestos,total,notas_cliente,cliente_id,proyecto_joya_id,sede_id")
      .eq("id", cotizacionId)
      .maybeSingle();

    if (quoteError || !quote) return json({ error: "Cotización no encontrada." }, 404);

    const [{ data: profile }, { data: roles }, { data: areas }] = await Promise.all([
      admin.from("profiles").select("sede_id").eq("id", user.id).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", user.id),
      admin.from("user_areas").select("area").eq("user_id", user.id),
    ]);

    const esAdmin = (roles ?? []).some((r: any) => r.role === "dueno" || r.role === "gerente");
    const esVentas = (areas ?? []).some((a: any) => clean(a.area).toLowerCase() === "área ventas");
    const mismaSede = !!quote.sede_id && !!profile?.sede_id && quote.sede_id === profile.sede_id;

    if (!esAdmin && (!esVentas || !mismaSede)) {
      return json({ error: "No tienes acceso comercial a esta cotización." }, 403);
    }

    const [{ data: cliente }, { data: proyecto }, { data: sede }, { data: detalles }] = await Promise.all([
      admin.from("clientes").select("nombre,telefono,email").eq("id", quote.cliente_id).maybeSingle(),
      quote.proyecto_joya_id
        ? admin.from("proyectos_joya").select("codigo,nombre,descripcion,metal,ley,peso_estimado,talla,piedras,cantidad_piezas").eq("id", quote.proyecto_joya_id).maybeSingle()
        : Promise.resolve({ data: null }),
      quote.sede_id
        ? admin.from("sedes").select("nombre").eq("id", quote.sede_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin.from("cotizacion_detalles").select("orden,tipo,descripcion,cantidad,unidad,precio_unitario,total_precio").eq("cotizacion_id", quote.id).order("orden"),
    ]);

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page = pdf.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    let y = height - 54;

    page.drawText(clean(sede?.nombre) || "TALLER", { x: 42, y, size: 20, font: bold, color: rgb(0.12, 0.12, 0.14) });
    page.drawText("COTIZACIÓN COMERCIAL", { x: 42, y: y - 24, size: 10, font: bold, color: rgb(0.42, 0.32, 0.16) });
    page.drawText(`${quote.numero} · Versión ${quote.version}`, { x: 375, y, size: 11, font: bold });
    page.drawText(`Emitida: ${quote.fecha_emision ?? "—"}`, { x: 375, y: y - 16, size: 9, font });
    y -= 62;

    page.drawLine({ start: { x: 42, y }, end: { x: width - 42, y }, thickness: 1, color: rgb(0.84, 0.84, 0.86) });
    y -= 28;

    drawLabelValue(page, font, "CLIENTE", clean(cliente?.nombre), 42, y);
    drawLabelValue(page, font, "TALLER", clean(sede?.nombre), 235, y);
    drawLabelValue(page, font, "ESTADO", clean(quote.estado), 420, y);
    y -= 50;

    if (quote.fecha_vencimiento || quote.fecha_entrega_solicitada) {
      drawLabelValue(page, font, "VÁLIDA HASTA", clean(quote.fecha_vencimiento), 42, y);
      drawLabelValue(page, font, "ENTREGA SOLICITADA", clean(quote.fecha_entrega_solicitada), 235, y);
      y -= 50;
    }

    if (proyecto) {
      page.drawText("DETALLE DE LA JOYA", { x: 42, y, size: 11, font: bold });
      y -= 18;
      const specs = [
        ["Proyecto", clean(proyecto.nombre)],
        ["Código", clean(proyecto.codigo)],
        ["Metal", clean(proyecto.metal)],
        ["Ley", clean(proyecto.ley)],
        ["Talla", clean(proyecto.talla)],
        ["Piedras", clean(proyecto.piedras)],
        ["Peso estimado", proyecto.peso_estimado != null ? `${proyecto.peso_estimado} g` : ""],
        ["Cantidad", proyecto.cantidad_piezas != null ? String(proyecto.cantidad_piezas) : ""],
      ];
      let col = 0;
      for (const [label, value] of specs) {
        const x = col === 0 ? 42 : 315;
        drawLabelValue(page, font, label.toUpperCase(), value, x, y);
        col++;
        if (col === 2) { col = 0; y -= 43; }
      }
      if (col !== 0) y -= 43;
      if (clean(proyecto.descripcion)) {
        page.drawText("Descripción", { x: 42, y, size: 8, font, color: rgb(0.42, 0.42, 0.45) });
        y -= 13;
        for (const line of wrap(clean(proyecto.descripcion), 95)) {
          page.drawText(line, { x: 42, y, size: 9, font });
          y -= 12;
        }
        y -= 10;
      }
    }

    page.drawText("PARTIDAS", { x: 42, y, size: 11, font: bold });
    y -= 20;
    page.drawText("Descripción", { x: 42, y, size: 8, font: bold });
    page.drawText("Cant.", { x: 370, y, size: 8, font: bold });
    page.drawText("Total", { x: 475, y, size: 8, font: bold });
    y -= 10;
    page.drawLine({ start: { x: 42, y }, end: { x: width - 42, y }, thickness: 0.7, color: rgb(0.86, 0.86, 0.88) });
    y -= 16;

    for (const item of detalles ?? []) {
      const descriptionLines = wrap(clean(item.descripcion), 55);
      const rowHeight = Math.max(18, descriptionLines.length * 12);
      if (y - rowHeight < 150) {
        page = pdf.addPage([595.28, 841.89]);
        y = height - 55;
      }
      descriptionLines.forEach((line, index) => {
        page.drawText(line, { x: 42, y: y - index * 12, size: 9, font });
      });
      page.drawText(String(item.cantidad ?? 0), { x: 370, y, size: 9, font });
      page.drawText(money(Number(item.total_precio ?? 0), quote.moneda), { x: 445, y, size: 9, font });
      y -= rowHeight + 8;
    }

    if (y < 220) {
      page = pdf.addPage([595.28, 841.89]);
      y = height - 55;
    }
    page.drawLine({ start: { x: 335, y }, end: { x: width - 42, y }, thickness: 0.8, color: rgb(0.82, 0.82, 0.84) });
    y -= 22;
    const totals = [
      ["Subtotal", quote.subtotal],
      ["Descuento", -Number(quote.descuento ?? 0)],
      ["Impuestos", quote.impuestos],
      ["TOTAL", quote.total],
    ];
    for (const [label, value] of totals) {
      const isTotal = label === "TOTAL";
      page.drawText(String(label), { x: 350, y, size: isTotal ? 11 : 9, font: isTotal ? bold : font });
      page.drawText(money(Number(value), quote.moneda), { x: 445, y, size: isTotal ? 12 : 9, font: isTotal ? bold : font });
      y -= isTotal ? 22 : 16;
    }

    if (clean(quote.notas_cliente)) {
      y -= 12;
      page.drawText("OBSERVACIONES", { x: 42, y, size: 10, font: bold });
      y -= 15;
      for (const line of wrap(clean(quote.notas_cliente), 96)) {
        page.drawText(line, { x: 42, y, size: 9, font });
        y -= 12;
      }
    }

    page.drawText("Documento comercial generado por www.tallerdeljoyero.com - Aurum LAB", {
      x: 42,
      y: 28,
      size: 7.5,
      font,
      color: rgb(0.48, 0.48, 0.5),
    });

    const pdfBytes = await pdf.save();
    const path = `${quote.id}/v${quote.version}-${crypto.randomUUID()}.pdf`;

    const { data: previous } = await admin
      .from("cotizacion_documentos_publicos")
      .select("id,storage_path")
      .eq("cotizacion_id", quote.id)
      .eq("version", quote.version)
      .maybeSingle();

    const { error: uploadError } = await admin.storage
      .from("cotizaciones-publicas")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: false });

    if (uploadError) return json({ error: "No se pudo guardar el PDF." }, 500);

    // El bucket es privado en este entorno: se comparte un enlace firmado de larga duración.
    const { data: bucketInfo } = await admin.storage.getBucket("cotizaciones-publicas");
    let publicUrl = `${supabaseUrl}/storage/v1/object/public/cotizaciones-publicas/${path}`;

    if (!bucketInfo?.public) {
      const { data: signed, error: signedError } = await admin.storage
        .from("cotizaciones-publicas")
        .createSignedUrl(path, 60 * 60 * 24 * 365);

      if (signedError || !signed?.signedUrl) {
        await admin.storage.from("cotizaciones-publicas").remove([path]);
        return json({ error: "No se pudo generar el enlace del PDF." }, 500);
      }
      publicUrl = signed.signedUrl;
    }

    const { error: documentError } = await admin
      .from("cotizacion_documentos_publicos")
      .upsert({
        cotizacion_id: quote.id,
        version: quote.version,
        storage_path: path,
        public_url: publicUrl,
        creado_por: user.id,
      }, { onConflict: "cotizacion_id,version" });

    if (documentError) {
      await admin.storage.from("cotizaciones-publicas").remove([path]);
      return json({ error: "No se pudo registrar el PDF." }, 500);
    }

    if (previous?.storage_path && previous.storage_path !== path) {
      await admin.storage.from("cotizaciones-publicas").remove([previous.storage_path]);
    }

    return json({ ok: true, url: publicUrl, version: quote.version });
  } catch (error) {
    console.error("generar-cotizacion-pdf", error);
    return json({ error: error instanceof Error ? error.message : "No se pudo generar el PDF." }, 500);
  }
});
