import { createClient } from "npm:@supabase/supabase-js@2";
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
  identidad_comercial_id: string | null;
};

type CuentaBancaria = { banco?: string; tipo?: string; moneda?: string; cuenta?: string; cci?: string; titular?: string; activa?: boolean };

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
      .select("id,numero,version,estado,fecha_emision,fecha_vencimiento,fecha_entrega_solicitada,moneda,subtotal,descuento,impuestos,total,notas_cliente,cliente_id,proyecto_joya_id,sede_id,participante_id,identidad_comercial_id,identidad_comercial")
      .eq("id", cotizacionId)
      .maybeSingle();

    if (quoteError || !quote) return json({ error: "Cotización no encontrada." }, 404);
    const quoteData = quote;

    const [{ data: roles }, { data: areas }, { data: cuenta }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", user.id),
      admin.from("user_areas").select("area").eq("user_id", user.id),
      admin
        .from("participante_cuentas")
        .select("participante_id, ecosistema_participantes!inner(id,sede_id,estado)")
        .eq("user_id", user.id)
        .eq("estado", "activo")
        .eq("ecosistema_participantes.estado", "activo")
        .limit(1)
        .maybeSingle(),
    ]);

    const esDueno = (roles ?? []).some((r: any) => r.role === "dueno");
    const esGerente = (roles ?? []).some((r: any) => r.role === "gerente");
    const esVentas = (areas ?? []).some((a: any) => clean(a.area).toLowerCase() === "área ventas");
    const participanteIdUsuario = clean((cuenta as any)?.participante_id);
    const mismoParticipante = !!quote.participante_id && !!participanteIdUsuario && quote.participante_id === participanteIdUsuario;

    if (!esDueno && (!esGerente || !mismoParticipante) && (!esVentas || !mismoParticipante)) {
      return json({ error: "No tienes acceso comercial a esta cotización." }, 403);
    }

    const [{ data: cliente }, { data: proyecto }, { data: sede }, { data: identidadActual }, { data: detalles }] = await Promise.all([
      admin.from("clientes").select("nombre,telefono,email").eq("id", quote.cliente_id).maybeSingle(),
      quote.proyecto_joya_id
        ? admin.from("proyectos_joya").select("codigo,nombre,descripcion,metal,ley,peso_estimado,talla,piedras,cantidad_piezas").eq("id", quote.proyecto_joya_id).maybeSingle()
        : Promise.resolve({ data: null }),
      quote.participante_id
        ? admin.from("ecosistema_participantes").select("nombre").eq("id", quote.participante_id).maybeSingle()
        : Promise.resolve({ data: null }),
      quote.identidad_comercial_id
        ? admin.from("identidades_comerciales").select("nombre_comercial,razon_social,ruc,rnp_bienes,rpp_servicios,logo_url,email,telefono,whatsapp,direccion,ciudad,sitio_web,color_principal,pie_documento,identificador_fiscal_label,metadata").eq("id", quote.identidad_comercial_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin.from("cotizacion_detalles").select("orden,tipo,descripcion,cantidad,unidad,precio_unitario,total_precio").eq("cotizacion_id", quote.id).order("orden"),
    ]);

    const identidad = quote.identidad_comercial && typeof quote.identidad_comercial === "object" && Object.keys(quote.identidad_comercial).length > 0
      ? { ...(identidadActual ?? {}), ...(quote.identidad_comercial as Record<string, unknown>) }
      : identidadActual;

    // Usa la instantánea comercial como fuente prioritaria y completa campos ausentes
    // con la identidad actual vinculada a la cotización.
    const identidadConfig = (identidad ?? {}) as any;
    const docConfig = identidadConfig?.metadata?.cotizacion ?? {};
    const atendidoPor = clean(docConfig.atendido_por) || clean(docConfig.responsable_nombre);
    const atendidoCargo = clean(docConfig.responsable_cargo);
    const terminos = Array.isArray(docConfig.terminos) ? docConfig.terminos.filter((x: unknown) => clean(x)) : [];
    const cuentas = Array.isArray(docConfig.cuentas_bancarias) ? docConfig.cuentas_bancarias.filter((x: CuentaBancaria) => x?.activa !== false && (x.banco || x.cuenta || x.cci)) : [];

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const pageSize: [number, number] = [595.28, 841.89];
    const margin = 42;
    const bottom = 58;
    // Paleta coherente con la ficha comercial A4 aprobada en la interfaz.
    const brandHex = /^#[0-9a-f]{6}$/i.test(clean((identidadConfig as any)?.color_principal)) ? clean((identidadConfig as any).color_principal) : "#b99a5b";
    const hex = brandHex.replace("#", "");
    const accent = rgb(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255);
    const ink = rgb(0.12, 0.15, 0.19);
    const muted = rgb(0.38, 0.42, 0.47);
    const line = rgb(0.88, 0.89, 0.91);
    const soft = rgb(0.96, 0.96, 0.96);
    const totalBlue = accent;

    let page = pdf.addPage(pageSize);
    let { width, height } = page.getSize();
    let y = height - 38;
    let pageNumber = 1;

    const identity = identidadConfig ?? {};

    // El logo se carga una sola vez antes de dibujar el encabezado.
    // Así el render del PDF permanece síncrono y seguro al crear páginas nuevas.
    let embeddedLogo: any = null;
    if (clean(identity.logo_url)) {
      try {
        const response = await fetch(clean(identity.logo_url));
        if (response.ok) {
          const bytes = new Uint8Array(await response.arrayBuffer());
          const type = response.headers.get("content-type") ?? "";
          embeddedLogo = type.includes("png")
            ? await pdf.embedPng(bytes)
            : type.includes("jpeg") || type.includes("jpg")
              ? await pdf.embedJpg(bytes)
              : null;
        }
      } catch {}
    }
    const contact = identidadActual ?? {};
    const businessName = clean(identity.nombre_comercial) || clean(identity.razon_social) || clean(sede?.nombre) || "AURUM LAB";
    const legalName = clean(identity.razon_social);
    const fiscal = clean(identity.ruc);
    const address = clean(identity.direccion);
    const city = clean(identity.ciudad);
    const phone = clean(identity.telefono) || clean(identity.whatsapp);
    const email = clean(identity.email);
    const website = clean(identity.sitio_web);
    const fiscalLabel = clean(identity.identificador_fiscal_label) || "RUC";

    const formatDate = (value: string | null | undefined) => {
      if (!value) return "—";
      const d = new Date(value + (value.length === 10 ? "T00:00:00" : ""));
      if (Number.isNaN(d.getTime())) return value;
      return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
    };

    const drawFooter = (p: any, n: number) => {
      p.drawLine({ start: { x: margin, y: 42 }, end: { x: width - margin, y: 42 }, thickness: 0.55, color: line });
      const footer = clean(identity.pie_documento) || [phone && `Tel: ${phone}`, email && `Correo: ${email}`, fiscal && `${fiscalLabel}: ${fiscal}`].filter(Boolean).join("    ") || "Documento comercial generado por Aurum Lab";
      p.drawText(footer, { x: margin, y: 27, size: 6.8, font, color: muted });
      p.drawText(`Página ${n}`, { x: width - 78, y: 27, size: 6.8, font, color: muted });
    };

    const newPage = () => {
      drawFooter(page, pageNumber);
      page = pdf.addPage(pageSize);
      pageNumber += 1;
      width = page.getSize().width;
      height = page.getSize().height;
      y = height - 38;
      drawHeader();
    };

    const ensure = (needed: number) => {
      if (y - needed < bottom) newPage();
    };

    const wrapPdf = (text: string, maxChars: number) => wrap(clean(text), maxChars);

    // Los textos variables se dibujan línea por línea para que nunca invadan
    // el pie de página cuando una observación o condición es extensa.
    const drawWrappedParagraph = (
      text: string,
      maxChars: number,
      size: number,
      leading: number,
      color = ink,
      x = margin,
    ) => {
      for (const line of wrapPdf(text, maxChars)) {
        ensure(leading + 2);
        page.drawText(line, { x, y, size, font, color });
        y -= leading;
      }
    };

    function drawHeader() {
      const logoIncluded = Boolean(embeddedLogo);
      if (embeddedLogo) {
        const scale = Math.min(78 / embeddedLogo.width, 58 / embeddedLogo.height);
        page.drawImage(embeddedLogo, { x: margin + 8, y: y - 61, width: embeddedLogo.width * scale, height: embeddedLogo.height * scale });
        page.drawLine({
          start: { x: margin + 94, y: y + 7 },
          end: { x: margin + 94, y: y - 64 },
          thickness: 0.7,
          color: line,
        });
      }

      // Bloque corporativo izquierdo: logo, divisor vertical y datos registrales.
      const leftX = logoIncluded ? margin + 105 : margin + 4;
      page.drawText(businessName, { x: leftX, y: y - 2, size: 12, font: bold, color: accent });
      if (legalName && legalName !== businessName) {
        page.drawText(legalName, { x: leftX, y: y - 15, size: 8.2, font: bold, color: muted });
      }
      const fiscalLines = [
        fiscal ? `${fiscalLabel} ${fiscal}` : "",
        identity.rnp_bienes ? `RNP Bienes ${clean(identity.rnp_bienes)}` : "",
        identity.rpp_servicios ? `RPP Servicios ${clean(identity.rpp_servicios)}` : "",
      ].filter(Boolean);
      fiscalLines.forEach((t: string, i: number) => page.drawText(t, {
        x: leftX, y: y - 27 - i * 10, size: 7.1, font, color: muted,
      }));

      // Referencia documental arriba; domicilio comercial debajo, alineados a la derecha.
      const rightX = width - margin - 4;
      page.drawText("COTIZACIÓN", {
        x: rightX - font.widthOfTextAtSize("COTIZACIÓN", 9) * 1.0, y: y - 2, size: 9, font: bold, color: accent,
      });
      const quoteReference = `${quoteData.numero} · Versión ${quoteData.version}`;
      page.drawText(quoteReference, {
        x: rightX - font.widthOfTextAtSize(quoteReference, 7.6), y: y - 14, size: 7.6, font: bold, color: ink,
      });
      page.drawText(`Emitida: ${formatDate(quoteData.fecha_emision)}`, {
        x: rightX - font.widthOfTextAtSize(`Emitida: ${formatDate(quoteData.fecha_emision)}`, 7.2), y: y - 25, size: 7.2, font, color: muted,
      });

      const rightLines = [legalName || businessName, address, city]
        .filter(Boolean).slice(0, 3);
      let ry = y - 40;
      for (const text of rightLines) {
        const size = 7.7;
        const tw = font.widthOfTextAtSize(text, size);
        page.drawText(text, { x: Math.max(width - margin - 210, rightX - tw), y: ry, size, font: bold, color: ink });
        ry -= 11;
      }

      y -= 88;
      page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.8, color: rgb(0.70, 0.70, 0.70) });
      y -= 18;
    }

    const drawTwoColumnInfo = () => {
      ensure(72);
      page.drawText("Sr(a).", { x: margin, y, size: 7.5, font, color: muted });
      page.drawText(clean(cliente?.nombre) || "—", { x: margin, y: y - 13, size: 11, font: bold, color: ink });
      if (clean(cliente?.telefono) || clean(cliente?.email)) {
        page.drawText([clean(cliente?.telefono), clean(cliente?.email)].filter(Boolean).join(" · "), { x: margin, y: y - 27, size: 7.2, font, color: muted });
      }
      const rx = 330;
      page.drawText("DATOS DE LA COTIZACIÓN", { x: rx, y, size: 7.5, font: bold, color: muted });
      page.drawText(`Fecha de cotización: ${formatDate(quoteData.fecha_emision)}`, { x: rx, y: y - 13, size: 7.7, font });
      page.drawText(`Vencimiento: ${formatDate(quote.fecha_vencimiento)}`, { x: rx, y: y - 26, size: 7.7, font });
      page.drawText(`Atendido por: ${atendidoPor || "—"}`, { x: rx, y: y - 39, size: 7.7, font });
      if (clean(quote.fecha_entrega_solicitada)) page.drawText(`Entrega: ${formatDate(quote.fecha_entrega_solicitada)}`, { x: rx, y: y - 52, size: 7.7, font });
      y -= 70;
    };

    const tableX = [margin, 342, 386, 432, 478, width - margin];
    const cols = { desc: tableX[0] + 4, qty: tableX[1] + 4, unit: tableX[2] + 4, tax: tableX[3] + 4, total: tableX[4] + 4 };
    const drawTableHeader = () => {
      const top = y;
      const h = 18;
      page.drawRectangle({ x: margin, y: top - h, width: width - margin * 2, height: h, borderColor: ink, borderWidth: 0.8 });
      for (const x of tableX.slice(1, -1)) {
        page.drawLine({ start: { x, y: top }, end: { x, y: top - h }, thickness: 0.8, color: ink });
      }
      const headers = [
        ["DESCRIPCIÓN", tableX[0] + 3],
        ["CANTIDAD", tableX[1] + 2],
        ["PRECIO", tableX[2] + 3],
        ["IMPUESTOS", tableX[3] + 2],
        ["IMPORTE", tableX[4] + 3],
      ];
      headers.forEach(([label, x]) => page.drawText(String(label), {
        x: Number(x), y: top - 12, size: 6.6, font: bold, color: accent,
      }));
      y -= h;
    };

    drawHeader();
    drawTwoColumnInfo();

    if (clean(docConfig.introduccion)) {
      ensure(55);
      page.drawText("DE NUESTRA CONSIDERACIÓN", { x: margin, y, size: 8.5, font: bold, color: accent });
      y -= 15;
      drawWrappedParagraph(clean(docConfig.introduccion), 98, 8.5, 11);
      y -= 7;
    }

    ensure(60);
    page.drawText("DETALLE DE LA COTIZACIÓN", { x: margin, y, size: 9.5, font: bold, color: accent });
    y -= 15;
    drawTableHeader();

    // Presentación por línea al estilo de referencia. Los impuestos y descuentos
    // se distribuyen proporcionalmente solo para mostrar el desglose, sin alterar los totales guardados.
    const items = detalles ?? [];
    // Prioriza el importe de línea persistido; solo calcula cantidad × precio
    // cuando la fila antigua no tenga total_precio.
    const bases = items.map((item: any) => {
      const totalGuardado = item.total_precio == null ? Number.NaN : Number(item.total_precio);
      const calculado = Number(item.cantidad ?? 0) * Number(item.precio_unitario ?? 0);
      return Math.max(0, Number.isFinite(totalGuardado) ? totalGuardado : calculado);
    });
    const sumaBases = bases.reduce((sum: number, value: number) => sum + value, 0);
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const base = bases[idx];
      const proporcion = sumaBases > 0 ? base / sumaBases : 0;
      const descuentoLinea = Number(quote.descuento ?? 0) * proporcion;
      const baseNeta = Math.max(0, base - descuentoLinea);
      const impuestoLinea = Number(quote.impuestos ?? 0) * proporcion;
      const importeLinea = baseNeta + impuestoLinea;
      const lines = wrapPdf(clean(item.descripcion) || "—", 55);
      let offset = 0;
      let firstSegment = true;

      // Una descripción excepcionalmente larga se divide en filas continuadas.
      // Así se conserva todo el texto sin dibujar contenido fuera de la página.
      while (offset < lines.length) {
        if (y - 19 < bottom + 20) {
          newPage();
          drawTableHeader();
        }

        const availableLines = Math.max(1, Math.floor((y - (bottom + 20) - 5) / 10));
        const segmentLines = lines.slice(offset, offset + availableLines);
        const rowHeight = Math.max(19, segmentLines.length * 10 + 5);
        if (y - rowHeight < bottom + 20) {
          newPage();
          drawTableHeader();
          continue;
        }

        const top = y + 4;
        const rowBottom = y - rowHeight + 2;
        page.drawRectangle({
          x: margin, y: rowBottom, width: width - margin * 2, height: rowHeight + 2,
          borderColor: ink, borderWidth: 0.65,
        });
        for (const x of tableX.slice(1, -1)) {
          page.drawLine({ start: { x, y: top }, end: { x, y: rowBottom }, thickness: 0.65, color: ink });
        }
        segmentLines.forEach((line: string, lineIndex: number) => page.drawText(line, {
          x: cols.desc, y: y - lineIndex * 10, size: 7.2, font, color: ink,
        }));

        if (firstSegment) {
          const qtyText = `${item.cantidad ?? 0} ${clean(item.unidad)}`.trim();
          page.drawText(qtyText.slice(0, 15), { x: cols.qty, y, size: 7.0, font, color: ink });
          page.drawText(money(Number(item.precio_unitario ?? 0), quote.moneda), {
            x: cols.unit, y, size: 6.4, font, color: ink,
          });
          page.drawText(money(impuestoLinea, quote.moneda), {
            x: cols.tax, y, size: 6.4, font, color: ink,
          });
          page.drawText(money(importeLinea, quote.moneda), {
            x: cols.total, y, size: 6.4, font: bold, color: ink,
          });
          firstSegment = false;
        }

        offset += segmentLines.length;
        y = rowBottom - 2;
        if (offset < lines.length) {
          newPage();
          drawTableHeader();
        }
      }
    }

    ensure(105);
    y -= 9;
    const totalsX = 350;
    const totalsW = width - margin - totalsX;
    const totals = [
      ["Importe sin impuestos", Number(quote.subtotal ?? 0)],
      ["Descuento", -Number(quote.descuento ?? 0)],
      ["IGV", Number(quote.impuestos ?? 0)],
      ["TOTAL", Number(quote.total ?? 0)],
    ];
    for (const [label, value] of totals) {
      const isTotal = label === "TOTAL";
      const rowH = isTotal ? 17 : 14;
      if (isTotal) {
        page.drawRectangle({ x: totalsX, y: y - rowH + 3, width: totalsW, height: rowH, color: totalBlue, borderColor: ink, borderWidth: 0.6 });
      } else {
        page.drawRectangle({ x: totalsX, y: y - rowH + 3, width: totalsW, height: rowH, color: soft, borderColor: ink, borderWidth: 0.55 });
      }
      page.drawText(String(label), {
        x: totalsX + 5, y: y - rowH + 7, size: isTotal ? 8.1 : 7.4,
        font: isTotal ? bold : font, color: isTotal ? rgb(1, 1, 1) : ink,
      });
      const amount = money(Number(value), quote.moneda);
      const amountWidth = (isTotal ? bold : font).widthOfTextAtSize(amount, isTotal ? 8 : 7.2);
      page.drawText(amount, {
        x: totalsX + totalsW - amountWidth - 5, y: y - rowH + 7,
        size: isTotal ? 8 : 7.2, font: isTotal ? bold : font,
        color: isTotal ? rgb(1, 1, 1) : ink,
      });
      y -= rowH;
    }

    if (clean(quote.notas_cliente)) {
      ensure(55);
      y -= 6;
      page.drawText("OBSERVACIONES", { x: margin, y, size: 8.8, font: bold, color: accent }); y -= 14;
      drawWrappedParagraph(clean(quote.notas_cliente), 98, 8.2, 11);
    }

    if (terminos.length) {
      ensure(65);
      y -= 10;
      page.drawText("TÉRMINOS Y CONDICIONES", { x: margin, y, size: 8.8, font: bold, color: accent }); y -= 14;
      for (let i = 0; i < terminos.length; i++) {
        const lines = wrapPdf(clean(terminos[i]), 94);
        ensure(18 + lines.length * 10);
        page.drawText(`${i + 1}.`, { x: margin, y, size: 7.8, font: bold });
        lines.forEach((t: string) => {
          ensure(12);
          page.drawText(t, { x: margin + 15, y, size: 7.8, font });
          y -= 10;
        });
        y -= 7;
      }
    }

    if (docConfig.mostrar_bancos && cuentas.length) {
      ensure(70);
      y -= 7;
      page.drawText("DATOS BANCARIOS", { x: margin, y, size: 8.8, font: bold, color: accent }); y -= 14;
      for (const cuenta of cuentas) {
        const bankLine = [clean(cuenta.banco), clean(cuenta.tipo), clean(cuenta.moneda)].filter(Boolean).join(" · ");
        ensure(34);
        if (bankLine) { ensure(13); page.drawText(bankLine, { x: margin, y, size: 7.8, font: bold }); y -= 11; }
        const dataLine = [
          cuenta.cuenta ? `Cuenta: ${clean(cuenta.cuenta)}` : "",
          cuenta.cci ? `CCI: ${clean(cuenta.cci)}` : "",
        ].filter(Boolean).join("    ");
        if (dataLine) { ensure(12); page.drawText(dataLine, { x: margin, y, size: 7.5, font }); y -= 10; }
        if (cuenta.titular) { ensure(12); page.drawText(`Titular: ${clean(cuenta.titular)}`, { x: margin, y, size: 7.5, font }); y -= 10; }
        y -= 4;
      }
    }

    ensure(58);
    y -= 8;
    const signatureWidth = (width - margin * 2 - 60) / 2;
    page.drawLine({ start: { x: margin, y }, end: { x: margin + signatureWidth, y }, thickness: 0.6, color: muted });
    page.drawLine({ start: { x: margin + signatureWidth + 60, y }, end: { x: width - margin, y }, thickness: 0.6, color: muted });
    page.drawText("Firma del cliente", { x: margin, y: y - 13, size: 7.5, font, color: muted });
    page.drawText("Firma y sello del taller", { x: margin + signatureWidth + 60, y: y - 13, size: 7.5, font, color: muted });

    drawFooter(page, pageNumber);
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
