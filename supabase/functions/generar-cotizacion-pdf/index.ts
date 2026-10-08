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
        ? admin.from("identidades_comerciales").select("nombre_comercial,razon_social,ruc,logo_url").eq("id", quote.identidad_comercial_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin.from("cotizacion_detalles").select("orden,tipo,descripcion,cantidad,unidad,precio_unitario,total_precio").eq("cotizacion_id", quote.id).order("orden"),
    ]);

    const identidad = quote.identidad_comercial && typeof quote.identidad_comercial === "object" && Object.keys(quote.identidad_comercial).length > 0
      ? { ...(identidadActual ?? {}), ...(quote.identidad_comercial as Record<string, unknown>) }
      : identidadActual;

    const identidadConfig = (quote.identidad_comercial && typeof quote.identidad_comercial === "object" ? quote.identidad_comercial : identidad) as any;
    const docConfig = identidadConfig?.metadata?.cotizacion ?? {};
    const terminos = Array.isArray(docConfig.terminos) ? docConfig.terminos.filter((x: unknown) => clean(x)) : [];
    const cuentas = Array.isArray(docConfig.cuentas_bancarias) ? docConfig.cuentas_bancarias.filter((x: CuentaBancaria) => x?.activa !== false && (x.banco || x.cuenta || x.cci)) : [];

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const pageSize: [number, number] = [595.28, 841.89];
    const margin = 42;
    const bottom = 55;
    let page = pdf.addPage(pageSize);
    let { width, height } = page.getSize();
    let y = height - 42;

    const drawFooter = (p: any) => {
      p.drawLine({ start: { x: margin, y: 42 }, end: { x: width - margin, y: 42 }, thickness: 0.6, color: rgb(0.82,0.82,0.84) });
      p.drawText(clean(identidadConfig?.pie_documento) || clean(identidadConfig?.email) || "Documento comercial generado por Aurum Lab", { x: margin, y: 27, size: 7, font, color: rgb(0.48,0.48,0.5) });
      p.drawText(`Página ${pdf.getPageCount()}`, { x: width - 85, y: 27, size: 7, font, color: rgb(0.48,0.48,0.5) });
    };
    const nuevaPagina = () => {
      drawFooter(page);
      page = pdf.addPage(pageSize);
      width = page.getSize().width; height = page.getSize().height; y = height - 42;
    };
    const asegurarEspacio = (alto: number) => { if (y - alto < bottom) nuevaPagina(); };
    const drawWrapped = (text: string, x: number, maxChars: number, size = 9, gap = 12) => {
      for (const line of wrap(text, maxChars)) { asegurarEspacio(gap); page.drawText(line, { x, y, size, font }); y -= gap; }
    };

    let logoIncluido = false;
    if (clean(identidadConfig?.logo_url)) {
      try {
        const response = await fetch(clean(identidadConfig.logo_url));
        if (response.ok) {
          const bytes = new Uint8Array(await response.arrayBuffer());
          const contentType = response.headers.get("content-type") ?? "";
          const image = contentType.includes("png") ? await pdf.embedPng(bytes) : contentType.includes("jpeg") || contentType.includes("jpg") ? await pdf.embedJpg(bytes) : null;
          if (image) { const scale = Math.min(105 / image.width, 58 / image.height); page.drawImage(image, { x: margin, y: y - 48, width: image.width * scale, height: image.height * scale }); logoIncluido = true; }
        }
      } catch {}
    }
    const xTexto = logoIncluido ? 165 : margin;
    page.drawText(clean(identidadConfig?.nombre_comercial) || clean(sede?.nombre) || "TALLER DEL JOYERO", { x: xTexto, y, size: 18, font: bold, color: rgb(0.12,0.12,0.14) });
    page.drawText(clean(identidadConfig?.razon_social) || "", { x: xTexto, y: y - 19, size: 9, font });
    const fiscales = [
      identidadConfig?.ruc ? `${clean(identidadConfig.identificador_fiscal_label) || "RUC"} ${clean(identidadConfig.ruc)}` : "",
      identidadConfig?.rnp_bienes ? `RNP Bienes ${clean(identidadConfig.rnp_bienes)}` : "",
      identidadConfig?.rpp_servicios ? `RPP Servicios ${clean(identidadConfig.rpp_servicios)}` : "",
    ].filter(Boolean).join(" · ");
    if (fiscales) page.drawText(fiscales, { x: xTexto, y: y - 33, size: 7.5, font, color: rgb(0.35,0.35,0.38) });
    page.drawText("COTIZACIÓN", { x: width - 165, y, size: 12, font: bold, color: rgb(0.42,0.32,0.16) });
    page.drawText(`${quote.numero} · Versión ${quote.version}`, { x: width - 165, y: y - 18, size: 9, font: bold });
    page.drawText(`Fecha: ${quote.fecha_emision ?? "—"}`, { x: width - 165, y: y - 33, size: 8, font });
    y -= 70;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.78,0.78,0.8) });
    y -= 24;

    drawLabelValue(page, font, "CLIENTE", clean(cliente?.nombre), margin, y);
    drawLabelValue(page, font, "TELÉFONO", clean(cliente?.telefono), 235, y);
    drawLabelValue(page, font, "EMAIL", clean(cliente?.email), 390, y);
    y -= 46;
    drawLabelValue(page, font, "VÁLIDA HASTA", clean(quote.fecha_vencimiento), margin, y);
    drawLabelValue(page, font, "ENTREGA SOLICITADA", clean(quote.fecha_entrega_solicitada), 235, y);
    drawLabelValue(page, font, "MONEDA", clean(quote.moneda), 390, y);
    y -= 42;

    if (clean(docConfig.introduccion)) { page.drawText(clean(docConfig.introduccion), { x: margin, y, size: 9, font }); y -= 25; }

    if (proyecto) {
      asegurarEspacio(115);
      page.drawText("DETALLE DE LA JOYA", { x: margin, y, size: 10, font: bold }); y -= 17;
      const specs = [["Proyecto",clean(proyecto.nombre)],["Código",clean(proyecto.codigo)],["Metal",clean(proyecto.metal)],["Ley",clean(proyecto.ley)],["Talla",clean(proyecto.talla)],["Piedras",clean(proyecto.piedras)],["Peso",proyecto.peso_estimado != null ? `${proyecto.peso_estimado} g` : ""],["Cantidad",proyecto.cantidad_piezas != null ? String(proyecto.cantidad_piezas) : ""]];
      for (let i=0;i<specs.length;i+=2) { drawLabelValue(page,font,specs[i][0].toUpperCase(),specs[i][1],margin,y); if(specs[i+1]) drawLabelValue(page,font,specs[i+1][0].toUpperCase(),specs[i+1][1],310,y); y-=34; }
      if (clean(proyecto.descripcion)) { page.drawText("Descripción", { x: margin, y, size: 8, font, color: rgb(0.42,0.42,0.45) }); y-=13; drawWrapped(clean(proyecto.descripcion),margin,96,8.5,11); y-=6; }
    }

    asegurarEspacio(125);
    page.drawText("DETALLE DE LA COTIZACIÓN", { x: margin, y, size: 10, font: bold }); y -= 19;
    const cols = { desc: margin, qty: 335, unit: 380, tax: 450, total: 505 };
    page.drawText("DESCRIPCIÓN", { x: cols.desc, y, size: 7.5, font: bold });
    page.drawText("CANT.", { x: cols.qty, y, size: 7.5, font: bold });
    page.drawText("PRECIO", { x: cols.unit, y, size: 7.5, font: bold });
    page.drawText("IMP.", { x: cols.tax, y, size: 7.5, font: bold });
    page.drawText("IMPORTE", { x: cols.total, y, size: 7.5, font: bold });
    y -= 9; page.drawLine({ start:{x:margin,y},end:{x:width-margin,y},thickness:0.8,color:rgb(0.72,0.72,0.74)}); y-=15;

    const lineBaseTotal = (detalles ?? []).reduce((sum: number, item: any) => sum + Math.max(0, Number(item.cantidad ?? 0) * Number(item.precio_unitario ?? 0)), 0);
    for (const item of detalles ?? []) {
      const base = Math.max(0, Number(item.cantidad ?? 0) * Number(item.precio_unitario ?? 0));
      const impuestoLinea = lineBaseTotal > 0 ? Number(quote.impuestos ?? 0) * base / lineBaseTotal : 0;
      const importe = base;
      const lines = wrap(clean(item.descripcion), 48);
      const rowHeight = Math.max(18, lines.length * 11);
      asegurarEspacio(rowHeight + 10);
      lines.forEach((line, index) => page.drawText(line, { x: cols.desc, y:index === 0 ? y : y-index*11, size: 8.2, font }));
      page.drawText(String(item.cantidad ?? 0), { x: cols.qty, y, size: 8.2, font });
      page.drawText(money(Number(item.precio_unitario ?? 0), quote.moneda), { x: cols.unit, y, size: 7.7, font });
      page.drawText(money(impuestoLinea, quote.moneda), { x: cols.tax, y, size: 7.7, font });
      page.drawText(money(importe, quote.moneda), { x: cols.total, y, size: 7.7, font });
      y -= rowHeight + 7; page.drawLine({ start:{x:margin,y:y+3},end:{x:width-margin,y:y+3},thickness:0.35,color:rgb(0.88,0.88,0.89)});
    }

    asegurarEspacio(100); y -= 6;
    const totalsX = 360;
    const totals = [["Subtotal", Number(quote.subtotal ?? 0)],["Descuento", -Number(quote.descuento ?? 0)],["Impuestos", Number(quote.impuestos ?? 0)],["TOTAL", Number(quote.total ?? 0)]];
    for (const [label,value] of totals) { const isTotal = label === "TOTAL"; page.drawText(String(label), {x:totalsX,y,size:isTotal?10:8.5,font:isTotal?bold:font}); page.drawText(money(Number(value),quote.moneda), {x:450,y,size:isTotal?11:8.5,font:isTotal?bold:font}); y -= isTotal?21:15; }

    if (clean(quote.notas_cliente)) { y -= 8; asegurarEspacio(45); page.drawText("OBSERVACIONES", {x:margin,y,size:9.5,font:bold}); y-=14; drawWrapped(clean(quote.notas_cliente),margin,96,8.5,11); }

    if (terminos.length) { y -= 10; asegurarEspacio(60); page.drawText("TÉRMINOS Y CONDICIONES", {x:margin,y,size:9.5,font:bold}); y-=15; for(let i=0;i<terminos.length;i++){ asegurarEspacio(28); const texto=clean(terminos[i]); page.drawText(`${i+1}.`,{x:margin,y,size:8.2,font:bold}); const lines=wrap(texto,92); for(let j=0;j<lines.length;j++){ if(j>0){asegurarEspacio(12);y-=11;} page.drawText(lines[j],{x:margin+15,y,size:8.2,font}); y-=11; } y-=3; } }

    if (docConfig.mostrar_bancos && cuentas.length) { y -= 8; asegurarEspacio(80); page.drawText("DATOS BANCARIOS", {x:margin,y,size:9.5,font:bold}); y-=15; for(const cuenta of cuentas){ asegurarEspacio(38); page.drawText(`${clean(cuenta.banco)} · ${clean(cuenta.tipo)} · ${clean(cuenta.moneda)}`,{x:margin,y,size:8.2,font:bold}); y-=11; if(clean(cuenta.cuenta)) { page.drawText(`Cuenta: ${clean(cuenta.cuenta)}`,{x:margin,y,size:8,font}); y-=10; } if(clean(cuenta.cci)) { page.drawText(`CCI: ${clean(cuenta.cci)}`,{x:200,y:y+10,size:8,font}); } if(clean(cuenta.titular)) { page.drawText(`Titular: ${clean(cuenta.titular)}`,{x:margin,y,size:8,font}); y-=10; } y-=5; } }

    asegurarEspacio(65); y -= 8; page.drawText("ATENTAMENTE", {x:margin,y,size:8,font}); y-=18; if(clean(docConfig.firma_nombre)) page.drawText(clean(docConfig.firma_nombre),{x:margin,y,size:9,font:bold}); if(clean(docConfig.firma_cargo)){ y-=12; page.drawText(clean(docConfig.firma_cargo),{x:margin,y,size:8,font}); }
    drawFooter(page);

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
