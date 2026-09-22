import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Plantilla = {
  id: string;
  version: number;
  contenido: Record<string, unknown>;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function wrap(text: string, maxChars = 92) {
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

function money(value: number, currency: string) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "PEN",
    minimumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function colorHex(value: unknown) {
  const raw = clean(value).replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return rgb(0.12, 0.12, 0.14);
  const n = Number.parseInt(raw, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function boolField(content: Record<string, unknown>, key: string, fallback = true) {
  return typeof content[key] === "boolean" ? Boolean(content[key]) : fallback;
}

function textField(content: Record<string, unknown>, key: string, fallback = "") {
  return typeof content[key] === "string" ? content[key] : fallback;
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
    const contratoId = clean(body?.contrato_id);
    if (!contratoId) return json({ error: "Falta contrato_id." }, 400);

    const { data: contrato, error: contratoError } = await admin
      .from("contratos")
      .select("id,numero,version,cliente,telefono,origen,total,abonado,saldo,sede_id,notas,cotizacion_id,identidad_comercial_id,plantilla_contrato_id,plantilla_version,estado_firma")
      .eq("id", contratoId)
      .maybeSingle();

    if (contratoError || !contrato) return json({ error: "Contrato no encontrado." }, 404);

    const [{ data: profile }, { data: roles }] = await Promise.all([
      admin.from("profiles").select("sede_id").eq("id", user.id).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", user.id),
    ]);

    const esAdmin = (roles ?? []).some((r: any) => r.role === "dueno" || r.role === "gerente");
    const mismaSede = !!contrato.sede_id && !!profile?.sede_id && contrato.sede_id === profile.sede_id;
    if (!esAdmin && !mismaSede) {
      return json({ error: "No tienes acceso a este contrato." }, 403);
    }

    let cotizacion: any = null;
    if (contrato.cotizacion_id) {
      const { data } = await admin
        .from("cotizaciones")
        .select("id,numero,version,fecha_emision,fecha_vencimiento,moneda,subtotal,descuento,impuestos,total,cliente_id,proyecto_joya_id,identidad_comercial_id,notas_cliente")
        .eq("id", contrato.cotizacion_id)
        .maybeSingle();
      cotizacion = data;
    }

    const identidadId = contrato.identidad_comercial_id ?? cotizacion?.identidad_comercial_id ?? null;

    const [
      { data: cliente },
      { data: proyecto },
      { data: identidad },
      { data: sede },
      { data: detalles },
      { data: plantilla },
    ] = await Promise.all([
      cotizacion?.cliente_id
        ? admin.from("clientes").select("nombre,telefono,email,dni").eq("id", cotizacion.cliente_id).maybeSingle()
        : Promise.resolve({ data: null }),
      cotizacion?.proyecto_joya_id
        ? admin.from("proyectos_joya").select("codigo,nombre,descripcion,metal,ley,peso_estimado,talla,piedras,cantidad_piezas").eq("id", cotizacion.proyecto_joya_id).maybeSingle()
        : Promise.resolve({ data: null }),
      identidadId
        ? admin.from("identidades_comerciales").select("id,nombre_comercial,razon_social,ruc,logo_url,direccion,ciudad,email,telefono,color_principal,pie_documento").eq("id", identidadId).maybeSingle()
        : Promise.resolve({ data: null }),
      contrato.sede_id
        ? admin.from("sedes").select("nombre").eq("id", contrato.sede_id).maybeSingle()
        : Promise.resolve({ data: null }),
      cotizacion?.id
        ? admin.from("cotizacion_detalles").select("orden,tipo,descripcion,cantidad,unidad,precio_unitario,total_precio").eq("cotizacion_id", cotizacion.id).order("orden")
        : Promise.resolve({ data: [] }),
      identidadId
        ? admin.from("plantillas_contrato").select("id,version,contenido").eq("identidad_comercial_id", identidadId).eq("activa", true).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const defaultContent = {
      titulo: "CONTRATO DE FABRICACIÓN DE JOYERÍA",
      subtitulo: "Documento comercial y de fabricación",
      introduccion: "El presente contrato regula la fabricación de la pieza de joyería descrita en la cotización vinculada y establece las condiciones comerciales y de producción acordadas entre las partes.",
      mostrarIdentidad: true,
      mostrarCotizacion: true,
      mostrarResumenEconomico: true,
      mostrarEspecificaciones: true,
      mostrarFirmas: true,
      etiquetaCliente: "CLIENTE",
      etiquetaRepresentante: "TALLER / JOYERÍA",
      textoAceptacion: "Las partes declaran haber revisado el contenido del presente contrato y aceptar las condiciones indicadas.",
      pie: "Documento contractual generado por el sistema.",
      clausulas: [],
    };

    const contenido = {
      ...defaultContent,
      ...((plantilla?.contenido ?? {}) as Record<string, unknown>),
    } as Record<string, unknown>;

    const clausulas = Array.isArray(contenido.clausulas)
      ? (contenido.clausulas as Array<Record<string, unknown>>).filter((c) => c.activa !== false)
      : [];

    const version = Number(contrato.version ?? cotizacion?.version ?? 1) || 1;
    const plantillaVersion = Number(plantilla?.version ?? contrato.plantilla_version ?? 1) || 1;
    const contratoVersionado = {
      ...contrato,
      version,
      identidad_comercial_id: identidadId,
      plantilla_contrato_id: plantilla?.id ?? contrato.plantilla_contrato_id ?? null,
      plantilla_version: plantillaVersion,
    };

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

    let page = pdf.addPage([595.28, 841.89]);
    let y = page.getHeight() - 48;
    const margin = 42;
    const bottom = 62;
    const accent = colorHex(identidad?.color_principal);

    function newPage() {
      page = pdf.addPage([595.28, 841.89]);
      y = page.getHeight() - 48;
      drawHeader();
    }

    function ensure(space: number) {
      if (y - space < bottom) newPage();
    }

    function line(text: string, size = 9, fontRef = font, x = margin, color = rgb(0.1, 0.1, 0.12)) {
      ensure(16);
      page.drawText(text, { x, y, size, font: fontRef, color });
      y -= size + 5;
    }

    function paragraph(text: string, size = 9, leading = 13) {
      for (const item of wrap(text, 92)) {
        ensure(leading);
        page.drawText(item, { x: margin, y, size, font, color: rgb(0.15, 0.15, 0.17) });
        y -= leading;
      }
      y -= 5;
    }

    function drawHeader() {
      page.drawText(clean(identidad?.nombre_comercial) || clean(sede?.nombre) || "TALLER DEL JOYERO", {
        x: margin, y, size: 18, font: bold, color: accent,
      });
      page.drawText(clean(contenido.subtitulo) || "Documento contractual", {
        x: margin, y: y - 21, size: 9, font, color: rgb(0.42, 0.42, 0.45),
      });
      page.drawText(clean(contrato.numero), {
        x: 405, y, size: 10, font: bold, color: rgb(0.1, 0.1, 0.12),
      });
      page.drawText(`Versión ${version}`, {
        x: 405, y: y - 15, size: 8.5, font, color: rgb(0.42, 0.42, 0.45),
      });
      page.drawLine({
        start: { x: margin, y: y - 28 },
        end: { x: page.getWidth() - margin, y: y - 28 },
        thickness: 1,
        color: accent,
      });
      y -= 45;
    }

    drawHeader();

    page.drawText(clean(contenido.titulo) || "CONTRATO DE FABRICACIÓN DE JOYERÍA", {
      x: margin, y, size: 15, font: bold, color: rgb(0.08, 0.08, 0.1),
    });
    y -= 24;

    if (boolField(contenido, "mostrarIdentidad")) {
      const identidadLine = [
        clean(identidad?.razon_social),
        identidad?.ruc ? `RUC ${clean(identidad.ruc)}` : "",
        clean(identidad?.direccion),
        clean(identidad?.ciudad),
      ].filter(Boolean).join(" · ");
      paragraph(identidadLine || "Identidad comercial registrada en el sistema.", 8.5, 11);
    }

    line(`Fecha de emisión: ${clean(cotizacion?.fecha_emision) || new Date().toISOString().slice(0, 10)}`, 8.5, font, margin, rgb(0.42, 0.42, 0.45));
    if (boolField(contenido, "mostrarCotizacion") && cotizacion) {
      line(`Cotización: ${clean(cotizacion.numero)} · Versión ${cotizacion.version ?? "1"}`, 8.5, font, margin, rgb(0.42, 0.42, 0.45));
    }

    y -= 8;
    page.drawText("PARTES", { x: margin, y, size: 10.5, font: bold, color: accent });
    y -= 17;
    const clienteNombre = clean(cliente?.nombre) || clean(contrato.cliente) || "Cliente";
    const clienteDoc = clean(cliente?.dni);
    const parteCliente = [clienteNombre, clienteDoc ? `DNI ${clienteDoc}` : "", clean(cliente?.telefono || contrato.telefono)].filter(Boolean).join(" · ");
    paragraph(`${textField(contenido, "etiquetaCliente", "CLIENTE")}: ${parteCliente}`, 9, 13);
    paragraph(`${textField(contenido, "etiquetaRepresentante", "TALLER / JOYERÍA")}: ${clean(identidad?.nombre_comercial) || clean(sede?.nombre) || "TALLER DEL JOYERO"}`, 9, 13);

    if (boolField(contenido, "mostrarEspecificaciones") && proyecto) {
      ensure(120);
      page.drawText("ESPECIFICACIONES DE LA JOYA", { x: margin, y, size: 10.5, font: bold, color: accent });
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
      for (const [label, value] of specs) {
        if (!value) continue;
        line(`${label}: ${value}`, 8.7, font);
      }
      if (clean(proyecto.descripcion)) paragraph(clean(proyecto.descripcion), 8.7, 12);
    }

    if (detalles && detalles.length > 0) {
      ensure(80);
      page.drawText("ALCANCE Y PARTIDAS", { x: margin, y, size: 10.5, font: bold, color: accent });
      y -= 18;
      for (const item of detalles as Array<Record<string, unknown>>) {
        const total = Number(item.total_precio ?? 0);
        paragraph(`• ${clean(item.descripcion)} · ${item.cantidad ?? 0} ${clean(item.unidad)} · ${money(total, cotizacion?.moneda ?? "PEN")}`, 8.7, 12);
      }
    }

    if (boolField(contenido, "mostrarResumenEconomico") && cotizacion) {
      ensure(100);
      page.drawText("CONDICIONES ECONÓMICAS", { x: margin, y, size: 10.5, font: bold, color: accent });
      y -= 18;
      const totals = [
        ["Subtotal", Number(cotizacion.subtotal ?? 0)],
        ["Descuento", -Number(cotizacion.descuento ?? 0)],
        ["Impuestos", Number(cotizacion.impuestos ?? 0)],
        ["TOTAL", Number(cotizacion.total ?? contrato.total ?? 0)],
        ["ANTICIPO", Number(contrato.abonado ?? 0)],
        ["SALDO", Math.max(Number(contrato.total ?? cotizacion.total ?? 0) - Number(contrato.abonado ?? 0), 0)],
      ];
      for (const [label, value] of totals) {
        line(`${label}: ${money(value, cotizacion.moneda ?? "PEN")}`, label === "TOTAL" ? 10 : 8.8, label === "TOTAL" ? bold : font);
      }
    }

    if (clean(contenido.introduccion)) {
      ensure(60);
      page.drawText("INTRODUCCIÓN", { x: margin, y, size: 10.5, font: bold, color: accent });
      y -= 18;
      paragraph(clean(contenido.introduccion), 8.9, 13);
    }

    for (const clausula of clausulas) {
      ensure(55);
      page.drawText(clean(clausula.titulo) || "Cláusula", { x: margin, y, size: 10, font: bold, color: rgb(0.1, 0.1, 0.12) });
      y -= 16;
      paragraph(clean(clausula.contenido), 8.8, 13);
    }

    if (clean(cotizacion?.notas_cliente)) {
      ensure(60);
      page.drawText("OBSERVACIONES", { x: margin, y, size: 10.5, font: bold, color: accent });
      y -= 18;
      paragraph(clean(cotizacion.notas_cliente), 8.8, 13);
    }

    if (boolField(contenido, "mostrarFirmas")) {
      ensure(150);
      page.drawText("ACEPTACIÓN Y FIRMAS", { x: margin, y, size: 10.5, font: bold, color: accent });
      y -= 18;
      paragraph(textField(contenido, "textoAceptacion", "Las partes declaran haber revisado el contenido del presente contrato y aceptar las condiciones indicadas."), 8.8, 13);
      y -= 14;
      page.drawLine({ start: { x: margin, y }, end: { x: 250, y }, thickness: 0.8, color: rgb(0.25, 0.25, 0.27) });
      page.drawLine({ start: { x: 315, y }, end: { x: 553, y }, thickness: 0.8, color: rgb(0.25, 0.25, 0.27) });
      y -= 14;
      page.drawText(textField(contenido, "etiquetaCliente", "CLIENTE"), { x: margin, y, size: 8.5, font });
      page.drawText(textField(contenido, "etiquetaRepresentante", "TALLER / JOYERÍA"), { x: 315, y, size: 8.5, font });
      y -= 36;
      page.drawText("Firma / nombre / documento", { x: margin, y, size: 7.5, font: italic, color: rgb(0.45, 0.45, 0.47) });
      page.drawText("Firma / representante", { x: 315, y, size: 7.5, font: italic, color: rgb(0.45, 0.45, 0.47) });
    }

    const pie = clean(contenido.pie) || clean(identidad?.pie_documento);
    page.drawText(pie || "Documento contractual generado por el sistema.", {
      x: margin, y: 32, size: 7.2, font, color: rgb(0.45, 0.45, 0.47),
      maxWidth: page.getWidth() - margin * 2,
    });

    const pdfBytes = await pdf.save();
    const digest = await crypto.subtle.digest("SHA-256", pdfBytes);
    const sha256 = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");

    const path = `contratos/${contrato.id}/v${version}-original-${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await admin.storage
      .from("cotizaciones-publicas")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: false });

    if (uploadError) return json({ error: "No se pudo guardar el PDF del contrato." }, 500);

    const { data: signed, error: signedError } = await admin.storage
      .from("cotizaciones-publicas")
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    if (signedError || !signed?.signedUrl) {
      await admin.storage.from("cotizaciones-publicas").remove([path]);
      return json({ error: "No se pudo generar el enlace del contrato." }, 500);
    }

    const { error: documentError } = await admin.from("contrato_documentos").upsert({
      contrato_id: contrato.id,
      version,
      tipo: "original",
      storage_path: path,
      sha256,
      plantilla_version: plantillaVersion,
      plantilla_contenido: contenido,
      creado_por: user.id,
    }, { onConflict: "contrato_id,version,tipo" });

    if (documentError) {
      await admin.storage.from("cotizaciones-publicas").remove([path]);
      return json({ error: "No se pudo registrar el documento contractual." }, 500);
    }

    const { error: contractUpdateError } = await admin.from("contratos").update({
      identidad_comercial_id: identidadId,
      plantilla_contrato_id: contratoVersionado.plantilla_contrato_id,
      plantilla_version: plantillaVersion,
    }).eq("id", contrato.id);

    if (contractUpdateError) {
      console.error("No se pudo guardar el vínculo de plantilla", contractUpdateError);
    }

    return json({
      ok: true,
      contrato_id: contrato.id,
      numero: contrato.numero,
      version,
      plantilla_version: plantillaVersion,
      sha256,
      url: signed.signedUrl,
    });
  } catch (error) {
    console.error("generar-contrato-pdf", error);
    return json({ error: error instanceof Error ? error.message : "No se pudo generar el contrato." }, 500);
  }
});
