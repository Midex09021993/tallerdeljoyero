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
    const participante = (cuenta as any)?.ecosistema_participantes;
    const mismoParticipante = !!quote.participante_id && !!participante?.participante_id && quote.participante_id === participante.participante_id;

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

    const identidadConfig = (quote.identidad_comercial && typeof quote.identidad_comercial === "object" ? quote.identidad_comercial : identidad) as any;
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
    const accent = rgb(0.43, 0.31, 0.12);
    const ink = rgb(0.10, 0.10, 0.12);
    const muted = rgb(0.40, 0.40, 0.43);
    const line = rgb(0.82, 0.82, 0.84);
    const soft = rgb(0.96, 0.95, 0.93);

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

    function drawHeader() {
      const logoIncluded = Boolean(embeddedLogo);
      if (embeddedLogo) {
        const scale = Math.min(82 / embeddedLogo.width, 52 / embeddedLogo.height);
        page.drawImage(embeddedLogo, { x: margin, y: y - 45, width: embeddedLogo.width * scale, height: embeddedLogo.height * scale });
      }

      const x = logoIncluded ? 140 : margin;
      page.drawText(businessName, { x, y, size: 16, font: bold, color: ink });
      if (legalName && legalName !== businessName) page.drawText(legalName, { x, y: y - 17, size: 8.5, font, color: muted });
      const fiscalLines = [
        fiscal ? `${fiscalLabel} ${fiscal}` : "",
        identity.rnp_bienes ? `RNP Bienes ${clean(identity.rnp_bienes)}` : "",
        identity.rpp_servicios ? `RPP Servicios ${clean(identity.rpp_servicios)}` : "",
      ].filter(Boolean);
      fiscalLines.forEach((t: string, i: number) => page.drawText(t, { x, y: y - 31 - i * 10, size: 7.3, font, color: muted }));

      const rightX = width - 190;
      page.drawText("COTIZACIÓN", { x: rightX, y, size: 11.5, font: bold, color: accent });
      page.drawText(`${quote.numero} · Versión ${quote.version}`, { x: rightX, y: y - 17, size: 8.8, font: bold, color: ink });
      page.drawText(`Emitida: ${formatDate(quote.fecha_emision)}`, { x: rightX, y: y - 31, size: 7.7, font, color: muted });

      const contactLines = [address, city, phone, email, website].filter(Boolean);
      let cy = y - 55;
      contactLines.slice(0, 4).forEach((t: string) => { page.drawText(t, { x: rightX, y: cy, size: 6.8, font, color: muted }); cy -= 9; });
      y -= Math.max(76, 78 + Math.min(2, fiscalLines.length) * 5);
      page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: accent });
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
      page.drawText(`Fecha de cotización: ${formatDate(quote.fecha_emision)}`, { x: rx, y: y - 13, size: 7.7, font });
      page.drawText(`Vencimiento: ${formatDate(quote.fecha_vencimiento)}`, { x: rx, y: y - 26, size: 7.7, font });
      page.drawText(`Atendido por: ${atendidoPor || "—"}`, { x: rx, y: y - 39, size: 7.7, font });
      if (clean(quote.fecha_entrega_solicitada)) page.drawText(`Entrega: ${formatDate(quote.fecha_entrega_solicitada)}`, { x: rx, y: y - 52, size: 7.7, font });
      y -= 70;
    };

    const drawTableHeader = () => {
      page.drawRectangle({ x: margin, y: y - 17, width: width - margin * 2, height: 20, color: soft });
      const cols = { desc: margin + 7, qty: 340, unit: 382, tax: 448, total: 505 };
      page.drawText("DESCRIPCIÓN", { x: cols.desc, y: y - 10, size: 7.1, font: bold, color: ink });
      page.drawText("CANTIDAD", { x: cols.qty, y: y - 10, size: 6.7, font: bold, color: ink });
      page.drawText("PRECIO", { x: cols.unit, y: y - 10, size: 7.1, font: bold, color: ink });
      page.drawText("IMPUESTOS", { x: cols.tax, y: y - 10, size: 6.5, font: bold, color: ink });
      page.drawText("IMPORTE", { x: cols.total, y: y - 10, size: 7.1, font: bold, color: ink });
      y -= 25;
    };

    drawHeader();
    drawTwoColumnInfo();

    if (clean(docConfig.introduccion)) {
      ensure(55);
      page.drawText("DE NUESTRA CONSIDERACIÓN", { x: margin, y, size: 8.5, font: bold, color: accent });
      y -= 15;
      for (const l of wrapPdf(clean(docConfig.introduccion), 98)) { page.drawText(l, { x: margin, y, size: 8.5, font, color: ink }); y -= 11; }
      y -= 7;
    }

    page.drawText("DETALLE DE LA COTIZACIÓN", { x: margin, y, size: 9.5, font: bold, color: accent });
    y -= 15;
    drawTableHeader();

    const lineBaseTotal = (detalles ?? []).reduce((sum: number, item: any) => sum + Math.max(0, Number(item.cantidad ?? 0) * Number(item.precio_unitario ?? 0)), 0);
    for (const item of detalles ?? []) {
      const base = Math.max(0, Number(item.cantidad ?? 0) * Number(item.precio_unitario ?? 0));
      const tax = lineBaseTotal > 0 ? Number(quote.impuestos ?? 0) * base / lineBaseTotal : 0;
      const importe = base + tax;
      const lines = wrapPdf(clean(item.descripcion), 48);
      const rowHeight = Math.max(20, lines.length * 11 + 4);
      ensure(rowHeight + 8);
      const cols = { desc: margin + 7, qty: 340, unit: 382, tax: 448, total: 505 };
      lines.forEach((t: string, i: number) => page.drawText(t, { x: cols.desc, y: y - i * 11, size: 7.7, font, color: ink }));
      page.drawText(String(item.cantidad ?? 0), { x: cols.qty, y, size: 7.7, font });
      page.drawText(money(Number(item.precio_unitario ?? 0), quote.moneda), { x: cols.unit, y, size: 7.0, font });
      page.drawText(money(tax, quote.moneda), { x: cols.tax, y, size: 7.0, font });
      page.drawText(money(importe, quote.moneda), { x: cols.total, y, size: 7.0, font });
      y -= rowHeight;
      page.drawLine({ start: { x: margin, y: y + 4 }, end: { x: width - margin, y: y + 4 }, thickness: 0.3, color: line });
    }

    ensure(100);
    y -= 7;
    const totalsX = 365;
    const totals = [
      ["Subtotal", Number(quote.subtotal ?? 0)],
      ["Descuento", -Number(quote.descuento ?? 0)],
      ["IGV / Impuestos", Number(quote.impuestos ?? 0)],
      ["TOTAL", Number(quote.total ?? 0)],
    ];
    for (const [label, value] of totals) {
      const isTotal = label === "TOTAL";
      if (isTotal) page.drawLine({ start: { x: totalsX, y: y + 7 }, end: { x: width - margin, y: y + 7 }, thickness: 0.8, color: accent });
      page.drawText(label, { x: totalsX, y, size: isTotal ? 9.5 : 8, font: isTotal ? bold : font, color: ink });
      page.drawText(money(Number(value), quote.moneda), { x: 472, y, size: isTotal ? 10.5 : 8, font: isTotal ? bold : font, color: isTotal ? accent : ink });
      y -= isTotal ? 20 : 15;
    }

    if (clean(quote.notas_cliente)) {
      ensure(55);
      y -= 6;
      page.drawText("OBSERVACIONES", { x: margin, y, size: 8.8, font: bold, color: accent }); y -= 14;
      for (const l of wrapPdf(clean(quote.notas_cliente), 98)) { page.drawText(l, { x: margin, y, size: 8.2, font }); y -= 11; }
    }

    if (terminos.length) {
      ensure(65);
      y -= 10;
      page.drawText("TÉRMINOS Y CONDICIONES", { x: margin, y, size: 8.8, font: bold, color: accent }); y -= 14;
      for (let i = 0; i < terminos.length; i++) {
        const lines = wrapPdf(clean(terminos[i]), 94);
        ensure(18 + lines.length * 10);
        page.drawText(`${i + 1}.`, { x: margin, y, size: 7.8, font: bold });
        lines.forEach((t: string, j: number) => page.drawText(t, { x: margin + 15, y: y - j * 10, size: 7.8, font }));
        y -= lines.length * 10 + 7;
      }
    }

    if (docConfig.mostrar_bancos && cuentas.length) {
      ensure(70);
      y -= 7;
      page.drawText("DATOS BANCARIOS", { x: margin, y, size: 8.8, font: bold, color: accent }); y -= 14;
      for (const cuenta of cuentas) {
        const bankLine = [clean(cuenta.banco), clean(cuenta.tipo), clean(cuenta.moneda)].filter(Boolean).join(" · ");
        ensure(34);
        if (bankLine) { page.drawText(bankLine, { x: margin, y, size: 7.8, font: bold }); y -= 11; }
        const dataLine = [
          cuenta.cuenta ? `Cuenta: ${clean(cuenta.cuenta)}` : "",
          cuenta.cci ? `CCI: ${clean(cuenta.cci)}` : "",
        ].filter(Boolean).join("    ");
        if (dataLine) { page.drawText(dataLine, { x: margin, y, size: 7.5, font }); y -= 10; }
        if (cuenta.titular) { page.drawText(`Titular: ${clean(cuenta.titular)}`, { x: margin, y, size: 7.5, font }); y -= 10; }
        y -= 4;
      }
    }

    if (clean(docConfig.firma_nombre) || clean(docConfig.firma_cargo)) {
      ensure(58);
      y -= 8;
      page.drawText("ATENTAMENTE", { x: margin, y, size: 8, font, color: muted }); y -= 22;
      if (clean(docConfig.firma_nombre)) { page.drawText(clean(docConfig.firma_nombre), { x: margin, y, size: 9, font: bold }); y -= 12; }
      if (clean(docConfig.firma_cargo)) { page.drawText(clean(docConfig.firma_cargo), { x: margin, y, size: 7.8, font, color: muted }); y -= 12; }
    }

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
