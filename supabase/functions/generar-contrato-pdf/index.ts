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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
    const authorization = req.headers.get("Authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "");

    if (!supabaseUrl || !serviceRoleKey || !anonKey || !token) {
      return json({ error: "Sesión no válida." }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user) return json({ error: "Sesión no válida." }, 401);

    // Cliente con la sesión del usuario: el RLS de contratos (interno + misma sede)
    // decide si el usuario puede ver el contrato. No se amplían permisos.
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const body = await req.json().catch(() => ({}));
    const contratoId = clean(body?.contrato_id);
    const accion = clean(body?.accion) || "generar";
    if (!contratoId) return json({ error: "Falta contrato_id." }, 400);

    const { data: contrato, error: contratoError } = await userClient
      .from("contratos")
      .select("id,numero,cliente,telefono,origen,total,abonado,sede_id,notas,cotizacion_id,pdf_storage_path,pdf_sha256,pdf_generado_at")
      .eq("id", contratoId)
      .maybeSingle();

    if (contratoError || !contrato) return json({ error: "Contrato no encontrado o sin acceso." }, 404);

    if (accion === "ver") {
      if (!contrato.pdf_storage_path) return json({ error: "El contrato aún no tiene PDF generado." }, 404);
      const { data: signed, error: signedError } = await admin.storage
        .from("cotizaciones-publicas")
        .createSignedUrl(contrato.pdf_storage_path, 60 * 10);
      if (signedError || !signed?.signedUrl) return json({ error: "No se pudo abrir el documento." }, 500);
      return json({ ok: true, url: signed.signedUrl, sha256: contrato.pdf_sha256, generado_at: contrato.pdf_generado_at });
    }

    // Generar exige poder actualizar el contrato (administrador de la misma sede).
    const { data: esAdmin } = await userClient.rpc("es_admin", { _user_id: user.id });
    if (!esAdmin) return json({ error: "No tienes permiso para generar este contrato." }, 403);

    let cotizacion: any = null;
    if (contrato.cotizacion_id) {
      const { data } = await admin
        .from("cotizaciones")
        .select("id,numero,version,fecha_emision,fecha_vencimiento,moneda,subtotal,descuento,impuestos,total,cliente_id,proyecto_joya_id,identidad_comercial_id,identidad_comercial,notas_cliente,sede_id")
        .eq("id", contrato.cotizacion_id)
        .maybeSingle();
      // La cotización vinculada debe pertenecer al mismo taller.
      if (data && (!data.sede_id || data.sede_id === contrato.sede_id)) cotizacion = data;
    }

    const identidadId = cotizacion?.identidad_comercial_id ?? null;

    const [
      { data: cliente },
      { data: proyecto },
      { data: identidadActual },
      { data: sede },
      { data: detalles },
    ] = await Promise.all([
      cotizacion?.cliente_id
        ? admin.from("clientes").select("nombre,telefono,email,documento").eq("id", cotizacion.cliente_id).maybeSingle()
        : Promise.resolve({ data: null }),
      cotizacion?.proyecto_joya_id
        ? admin.from("proyectos_joya").select("codigo,nombre,descripcion,metal,ley,peso_estimado,talla,piedras,cantidad_piezas").eq("id", cotizacion.proyecto_joya_id).maybeSingle()
        : Promise.resolve({ data: null }),
      identidadId
        ? admin.from("identidades_comerciales").select("id,nombre_comercial,razon_social,ruc,logo_url,direccion,ciudad,email,telefono,color_principal,pie_documento").eq("id", identidadId).maybeSingle()
        : contrato.sede_id
          ? admin.from("identidades_comerciales").select("id,nombre_comercial,razon_social,ruc,logo_url,direccion,ciudad,email,telefono,color_principal,pie_documento").eq("sede_id", contrato.sede_id).eq("activa", true).limit(1).maybeSingle()
          : Promise.resolve({ data: null }),
      contrato.sede_id
        ? admin.from("sedes").select("nombre").eq("id", contrato.sede_id).maybeSingle()
        : Promise.resolve({ data: null }),
      cotizacion?.id
        ? admin.from("cotizacion_detalles").select("orden,tipo,descripcion,cantidad,unidad,precio_unitario,total_precio").eq("cotizacion_id", cotizacion.id).order("orden")
        : Promise.resolve({ data: [] }),
    ]);

    const identidad = cotizacion?.identidad_comercial && typeof cotizacion.identidad_comercial === "object" && Object.keys(cotizacion.identidad_comercial).length > 0
      ? { ...(identidadActual ?? {}), ...(cotizacion.identidad_comercial as Record<string, unknown>) }
      : identidadActual;

    const contenido: Record<string, unknown> = {
      titulo: "CONTRATO DE FABRICACIÓN DE JOYERÍA",
      subtitulo: "Documento comercial y de fabricación",
      introduccion: "El presente contrato regula la fabricación de la pieza de joyería descrita y establece las condiciones comerciales y de producción acordadas entre las partes.",
      mostrarIdentidad: true,
      mostrarCotizacion: true,
      mostrarResumenEconomico: true,
      mostrarEspecificaciones: true,
      mostrarFirmas: true,
      etiquetaCliente: "CLIENTE",
      etiquetaRepresentante: "TALLER / JOYERÍA",
      textoAceptacion: "Las partes declaran haber revisado el contenido del presente contrato y aceptar las condiciones indicadas.",
      pie: "Documento contractual generado por AURUM LAB.",
      clausulas: [
        { titulo: "PRIMERA · OBJETO", contenido: "El taller se compromete a fabricar la pieza descrita en este documento conforme a las especificaciones acordadas con el cliente." },
        { titulo: "SEGUNDA · PRECIO Y FORMA DE PAGO", contenido: "El cliente abona un anticipo al firmar el presente contrato. El saldo pendiente deberá cancelarse en su totalidad antes o al momento de la entrega de la pieza." },
        { titulo: "TERCERA · PLAZO DE ENTREGA", contenido: "El plazo de fabricación se computa desde la aprobación del diseño y el pago del anticipo. Cambios solicitados por el cliente pueden ampliar dicho plazo." },
        { titulo: "CUARTA · MODIFICACIONES", contenido: "Toda modificación posterior a la aprobación del diseño podrá generar costos adicionales, que serán informados al cliente antes de su ejecución." },
        { titulo: "QUINTA · TOLERANCIAS", contenido: "El peso final del metal puede variar ligeramente respecto al estimado por la naturaleza artesanal del proceso; dicha variación se ajustará en la liquidación final." },
        { titulo: "SEXTA · CANCELACIÓN", contenido: "Si el cliente cancela el trabajo una vez iniciada la producción, el anticipo se destinará a cubrir los materiales y la mano de obra empleados." },
      ],
    };

    const clausulas = (contenido.clausulas as Array<Record<string, unknown>>);
    const version = Number(cotizacion?.version ?? 1) || 1;
    const totalContrato = Number(contrato.total ?? 0) > 0 ? Number(contrato.total) : Number(cotizacion?.total ?? 0);
    const abonadoContrato = Number(contrato.abonado ?? 0);
    const saldoContrato = Math.max(totalContrato - abonadoContrato, 0);
    const monedaContrato = cotizacion?.moneda ?? "PEN";

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

    let page = pdf.addPage([595.28, 841.89]);
    let y = page.getHeight() - 48;
    const margin = 42;
    const bottom = 62;
    // Identidad documental coherente con la cotización FADILAB: verde y azul claro.
    const accent = rgb(0.30, 0.59, 0.25);
    const totalBlue = rgb(0.03, 0.40, 0.55);
    const softBlue = rgb(0.84, 0.91, 0.97);
    let embeddedLogo: any = null;
    if (clean(identidad?.logo_url)) {
      try {
        const response = await fetch(clean(identidad.logo_url));
        if (response.ok) {
          const bytes = new Uint8Array(await response.arrayBuffer());
          const type = response.headers.get("content-type") ?? "";
          embeddedLogo = type.includes("png")
            ? await pdf.embedPng(bytes)
            : type.includes("jpeg") || type.includes("jpg")
              ? await pdf.embedJpg(bytes)
              : null;
        }
      } catch {
        // El logo es opcional; no debe impedir la generación del contrato.
      }
    }

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
      const pageWidth = page.getWidth();
      const company = clean(identidad?.nombre_comercial) || clean(sede?.nombre) || "TALLER DEL JOYERO";
      const legal = clean(identidad?.razon_social);
      // El encabezado mantiene el logotipo a la izquierda, como en la referencia.
      const logoX = margin + 3;
      const textX = embeddedLogo ? margin + 92 : margin;
      if (embeddedLogo) {
        const scale = Math.min(68 / embeddedLogo.width, 52 / embeddedLogo.height);
        page.drawImage(embeddedLogo, {
          x: logoX, y: y - 51,
          width: embeddedLogo.width * scale, height: embeddedLogo.height * scale,
        });
      }
      page.drawText(company, {
        x: textX, y, size: 12, font: bold, color: accent,
      });
      if (legal && legal !== company) {
        page.drawText(legal, { x: textX, y: y - 14, size: 8, font: bold, color: rgb(0.58, 0.58, 0.58) });
      }
      const fiscal = clean(identidad?.ruc) ? `RUC ${clean(identidad.ruc)}` : "";
      const address = [clean(identidad?.direccion), clean(identidad?.ciudad)].filter(Boolean);
      let ly = y - (legal && legal !== company ? 27 : 16);
      if (fiscal) {
        page.drawText(fiscal, { x: textX, y: ly, size: 7.4, font, color: rgb(0.58, 0.58, 0.58) });
        ly -= 10;
      }
      const rightLines = [...address, clean(identidad?.telefono), clean(identidad?.email)].filter(Boolean).slice(0, 4);
      let ry = y;
      for (const text of rightLines) {
        const tw = font.widthOfTextAtSize(text, 7.3);
        page.drawText(text, {
          x: Math.max(pageWidth - margin - 205, pageWidth - margin - tw),
          y: ry, size: 7.3, font: bold, color: rgb(0.1, 0.1, 0.1),
        });
        ry -= 10;
      }
      page.drawText(clean(contrato.numero), {
        x: pageWidth - margin - 145, y: y - 48, size: 9, font: bold, color: rgb(0.1, 0.1, 0.1),
      });
      page.drawText(`Versión ${version}`, {
        x: pageWidth - margin - 145, y: y - 60, size: 7.5, font, color: rgb(0.58, 0.58, 0.58),
      });
      page.drawLine({
        start: { x: margin, y: y - 72 },
        end: { x: pageWidth - margin, y: y - 72 },
        thickness: 0.8,
        color: rgb(0.70, 0.70, 0.70),
      });
      y -= 89;
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

    line(`Fecha de emisión: ${(clean(cotizacion?.fecha_emision) || new Date().toISOString()).slice(0, 10).split("-").reverse().join("/")}`, 8.5, font, margin, rgb(0.42, 0.42, 0.45));
    if (boolField(contenido, "mostrarCotizacion") && cotizacion) {
      line(`Cotización: ${clean(cotizacion.numero)} · Versión ${cotizacion.version ?? "1"}`, 8.5, font, margin, rgb(0.42, 0.42, 0.45));
    }

    y -= 8;
    page.drawText("PARTES", { x: margin, y, size: 10.5, font: bold, color: accent });
    y -= 17;
    const clienteNombre = clean(cliente?.nombre) || clean(contrato.cliente) || "Cliente";
    const clienteDoc = clean(cliente?.documento);
    const parteCliente = [clienteNombre, clienteDoc ? `Doc. ${clienteDoc}` : "", clean(cliente?.telefono || contrato.telefono)].filter(Boolean).join(" · ");
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

    if (boolField(contenido, "mostrarResumenEconomico")) {
      ensure(110);
      page.drawText("CONDICIONES ECONÓMICAS", { x: margin, y, size: 10.5, font: bold, color: accent });
      y -= 18;
      const totals: Array<[string, number]> = cotizacion
        ? [
            ["Importe sin impuestos", Number(cotizacion.subtotal ?? 0)],
            ["Descuento", -Number(cotizacion.descuento ?? 0)],
            ["IGV / IMPUESTOS", Number(cotizacion.impuestos ?? 0)],
          ]
        : [];
      totals.push(["TOTAL", totalContrato], ["ANTICIPO / ABONADO", abonadoContrato], ["SALDO PENDIENTE", saldoContrato]);
      const boxX = 325;
      const boxW = page.getWidth() - margin - boxX;
      for (const [label, value] of totals) {
        ensure(18);
        const fuerte = label === "TOTAL" || label === "SALDO PENDIENTE";
        const rowH = 16;
        page.drawRectangle({
          x: boxX, y: y - 4, width: boxW, height: rowH,
          color: fuerte ? totalBlue : softBlue,
          borderColor: rgb(0.1, 0.1, 0.1), borderWidth: 0.5,
        });
        const labelColor = fuerte ? rgb(1, 1, 1) : rgb(0.1, 0.1, 0.1);
        page.drawText(label, { x: boxX + 5, y: y + 1, size: fuerte ? 8.1 : 7.4, font: fuerte ? bold : font, color: labelColor });
        const amount = money(value, monedaContrato);
        const amountFont = fuerte ? bold : font;
        const amountSize = fuerte ? 8 : 7.2;
        page.drawText(amount, {
          x: boxX + boxW - amountFont.widthOfTextAtSize(amount, amountSize) - 5,
          y: y + 1, size: amountSize, font: amountFont, color: labelColor,
        });
        y -= rowH;
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
      // La aceptación puede ocupar varias líneas y provocar un salto de página.
      // Reservar de nuevo el espacio evita que las firmas queden fuera del papel.
      ensure(72);
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

    const pie = clean(identidad?.pie_documento) || clean(contenido.pie) || "Documento contractual generado por AURUM LAB.";
    const paginas = pdf.getPages();
    paginas.forEach((p, i) => {
      p.drawLine({ start: { x: margin, y: 44 }, end: { x: p.getWidth() - margin, y: 44 }, thickness: 0.5, color: rgb(0.82, 0.82, 0.84) });
      p.drawText(pie.slice(0, 110), { x: margin, y: 30, size: 7.2, font, color: rgb(0.45, 0.45, 0.47) });
      p.drawText(`Página ${i + 1} de ${paginas.length}`, { x: p.getWidth() - margin - 62, y: 30, size: 7.2, font, color: rgb(0.45, 0.45, 0.47) });
    });

    const pdfBytes = await pdf.save();
    const digest = await crypto.subtle.digest("SHA-256", pdfBytes);
    const sha256 = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");

    const path = `contratos/${contrato.id}/v${version}-${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await admin.storage
      .from("cotizaciones-publicas")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: false });

    if (uploadError) return json({ error: "No se pudo guardar el PDF del contrato." }, 500);

    const generadoAt = new Date().toISOString();
    const { error: updateError } = await userClient
      .from("contratos")
      .update({ pdf_storage_path: path, pdf_sha256: sha256, pdf_generado_at: generadoAt })
      .eq("id", contrato.id);

    if (updateError) {
      await admin.storage.from("cotizaciones-publicas").remove([path]);
      return json({ error: "No se pudo registrar el documento contractual." }, 500);
    }

    if (contrato.pdf_storage_path && contrato.pdf_storage_path !== path) {
      await admin.storage.from("cotizaciones-publicas").remove([contrato.pdf_storage_path]);
    }

    // Enlace de corta duración solo para abrirlo ahora; no se persiste.
    const { data: signed } = await admin.storage
      .from("cotizaciones-publicas")
      .createSignedUrl(path, 60 * 10);

    return json({
      ok: true,
      contrato_id: contrato.id,
      numero: contrato.numero,
      paginas: paginas.length,
      sha256,
      generado_at: generadoAt,
      url: signed?.signedUrl ?? null,
    });
  } catch (error) {
    console.error("generar-contrato-pdf", error);
    return json({ error: error instanceof Error ? error.message : "No se pudo generar el contrato." }, 500);
  }
});
