import type { ReactNode } from "react";

export type DocumentoA4Identidad = {
  nombre_comercial?: string | null;
  razon_social?: string | null;
  ruc?: string | null;
  identificador_fiscal_label?: string | null;
  rnp_bienes?: string | null;
  rpp_servicios?: string | null;
  logo_url?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  sitio_web?: string | null;
  color_principal?: string | null;
  pie_documento?: string | null;
  metadata?: Record<string, any> | null;
};

export type DocumentoA4Detalle = {
  descripcion: string;
  cantidad: number;
  unidad?: string | null;
  precio_unitario: number;
  total_precio: number;
};

export type DocumentoA4Props = {
  tipo: "cotizacion" | "contrato";
  numero: string;
  version?: number;
  fecha: string;
  vencimiento?: string | null;
  entrega?: string | null;
  moneda?: string;
  cliente: { nombre: string; telefono?: string | null; email?: string | null; documento?: string | null };
  identidad?: DocumentoA4Identidad | null;
  tallerNombre?: string | null;
  detalles?: DocumentoA4Detalle[];
  subtotal?: number;
  descuento?: number;
  impuestos?: number;
  total: number;
  anticipo?: number;
  saldo?: number;
  notas?: string | null;
  contenidoContrato?: string | null;
};

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char] ?? char));

const moneda = (value: number, currency = "PEN") => new Intl.NumberFormat("es-PE", {
  style: "currency", currency: /^[A-Z]{3}$/.test(currency) ? currency : "PEN", minimumFractionDigits: 2,
}).format(Number(value) || 0);

const fecha = (value?: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value.length === 10 ? value + "T12:00:00" : value);
  return Number.isNaN(parsed.getTime()) ? esc(value) : new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(parsed);
};

function htmlDocumento(data: DocumentoA4Props) {
  const identidad = data.identidad ?? {};
  const config = identidad.metadata?.cotizacion ?? {};
  const color = /^#[0-9a-f]{6}$/i.test(identidad.color_principal ?? "") ? identidad.color_principal! : "#4c9640";
  const nombre = identidad.nombre_comercial || identidad.razon_social || data.tallerNombre || "Taller";
  const razon = identidad.razon_social && identidad.razon_social !== nombre ? identidad.razon_social : "";
  const contacto = [identidad.telefono || identidad.whatsapp, identidad.email, identidad.ruc ? `${identidad.identificador_fiscal_label || "RUC"}: ${identidad.ruc}` : ""].filter(Boolean).join(" · ");
  const terminos = Array.isArray(config.terminos) ? config.terminos.filter((x: unknown) => String(x ?? "").trim()) : [];
  const cuentas = config.mostrar_bancos === false ? [] : Array.isArray(config.cuentas_bancarias) ? config.cuentas_bancarias.filter((x: any) => x && x.activa !== false && (x.banco || x.cuenta || x.cci)) : [];
  const detalles = data.detalles ?? [];
  const introduccion = config.introduccion || "Es grato dirigirnos a usted, con la finalidad de remitir la siguiente cotización.";
  const titulo = data.tipo === "cotizacion" ? "COTIZACIÓN" : "CONTRATO";
  const filas = detalles.map((item) => `<tr><td>${esc(item.descripcion).replace(/\n/g, "<br>")}</td><td class="num">${esc(item.cantidad)} ${esc(item.unidad || "")}</td><td class="num">${moneda(item.precio_unitario, data.moneda)}</td><td class="num">${moneda(item.total_precio, data.moneda)}</td></tr>`).join("");
  const cuerpoContrato = data.contenidoContrato ? `<section class="contract-copy">${esc(data.contenidoContrato).replace(/\n/g, "<br>")}</section>` : "";
  const tabla = data.tipo === "cotizacion" ? `
    <table><thead><tr><th>DESCRIPCIÓN</th><th class="num">CANTIDAD</th><th class="num">PRECIO UNITARIO</th><th class="num">IMPORTE</th></tr></thead><tbody>${filas || '<tr><td colspan="4">Sin conceptos registrados</td></tr>'}</tbody></table>
    <div class="totals"><div><span>Importe sin impuestos</span><strong>${moneda((data.subtotal ?? data.total) - (data.impuestos ?? 0), data.moneda)}</strong></div>${Number(data.descuento) ? `<div><span>Descuento</span><strong>− ${moneda(data.descuento ?? 0, data.moneda)}</strong></div>` : ""}<div><span>Impuestos</span><strong>${moneda(data.impuestos ?? 0, data.moneda)}</strong></div><div class="grand"><span>TOTAL</span><strong>${moneda(data.total, data.moneda)}</strong></div></div>` : `
    <div class="totals contract-total"><div><span>Importe del contrato</span><strong>${moneda(data.total, data.moneda)}</strong></div><div><span>Anticipo / abonado</span><strong>${moneda(data.anticipo ?? 0, data.moneda)}</strong></div><div class="grand"><span>SALDO</span><strong>${moneda(data.saldo ?? (data.total - (data.anticipo ?? 0)), data.moneda)}</strong></div></div>`;
  const bancos = cuentas.length ? `<section class="terms"><h3>DATOS BANCARIOS</h3>${cuentas.map((cuenta: any) => `<p><strong>${esc([cuenta.banco, cuenta.tipo, cuenta.moneda].filter(Boolean).join(" · "))}</strong><br>${esc(cuenta.cuenta ? "N.º Cuenta: " + cuenta.cuenta : "")} ${esc(cuenta.cci ? " · CCI: " + cuenta.cci : "")}<br>${esc(cuenta.titular ? "Titular: " + cuenta.titular : "")}</p>`).join("")}<p>Enviar constancia de pago a ${esc(identidad.email || "")}</p></section>` : "";
  const condiciones = terminos.length ? `<section class="terms"><h3>TÉRMINOS Y CONDICIONES</h3><ol>${terminos.map((t: string) => `<li>${esc(t)}</li>`).join("")}</ol></section>` : "";
  const firma = [config.firma_nombre, config.firma_cargo].filter(Boolean);
  const firmaHtml = firma.length ? `<section class="signature"><p>Atentamente,</p><div class="sign-name">${esc(firma[0] || "")}</div><div>${esc(firma[1] || "")}</div></section>` : `<section class="signature"><p>Agradeciendo por anticipado su atención, nos despedimos de usted.</p><p>Atentamente,</p><div class="sign-name">${esc(config.atendido_por || "")}</div></section>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)} ${esc(data.numero)}</title><style>
    @page{size:A4;margin:14mm 13mm 17mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#222;margin:0;font-size:10pt;line-height:1.4}.toolbar{position:sticky;top:0;display:flex;gap:10px;justify-content:center;padding:12px;background:#171717;z-index:10}.toolbar button{border:0;border-radius:8px;padding:10px 16px;font-weight:700;cursor:pointer}.toolbar .primary{background:#d5b45b;color:#171717}.toolbar .secondary{background:white;color:#171717}.sheet{max-width:210mm;margin:0 auto;padding:0;background:white}.head{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start;border-bottom:1px solid #b9b9b9;padding-bottom:12px}.brand{display:flex;gap:12px;align-items:center;min-width:0}.logo{max-width:32mm;max-height:24mm;object-fit:contain}.brand-text{min-width:0;color:#999;font-size:8pt}.brand-text strong{display:block;color:#666;font-size:10pt}.address{text-align:right;font-size:9pt;font-weight:700;white-space:pre-line}.address .doc-title{display:block;color:${color};font-size:10pt;margin-top:8px}.date{text-align:right;color:#777;margin:17px 0 12px}.greeting{margin:18px 0 10px}.client{font-weight:700;color:${color};font-size:12pt;margin:4px 0 14px}.intro{color:#777;margin:10px 0 16px}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:15px 0}.meta label{display:block;color:${color};font-weight:700;font-size:9pt;margin-bottom:5px}.meta div{color:#777}.section-title{font-weight:700;color:${color};margin:16px 0 8px}table{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:12px;font-size:8.5pt}th,td{border:1px solid #222;padding:5px 6px;vertical-align:top;overflow-wrap:anywhere}th{color:${color};font-size:8pt;text-align:left}th:nth-child(1){width:49%}th:nth-child(2){width:13%}th:nth-child(3){width:19%}th:nth-child(4){width:19%}.num{text-align:right;white-space:normal}.totals{margin:12px 0 20px auto;width:58%;border:1px solid #222;font-size:9pt}.totals div{display:flex;justify-content:space-between;gap:12px;padding:4px 8px;border-bottom:1px solid #ddd}.totals .grand{background:#d9e9f7;font-weight:700;border-bottom:0}.totals .grand strong{background:#087b9a;color:white;padding:2px 6px}.signature{margin:20px 0 14px;color:#777}.signature p{margin:8px 0 14px}.sign-name{font-weight:700;color:#444;margin-top:12px}.terms{margin-top:18px;break-inside:avoid}.terms h3{font-size:9pt;color:#555;margin:0 0 8px}.terms ol{padding-left:24px;margin:0}.terms li{padding-left:8px;margin:0 0 8px}.terms p{margin:8px 0}.contract-copy{white-space:normal;line-height:1.65;margin:22px 0}.footer{position:fixed;bottom:-11mm;left:0;right:0;border-top:1px solid #bbb;padding-top:5px;font-size:7pt;color:#777;display:flex;justify-content:space-between;gap:10px}.footer span{overflow-wrap:anywhere}.avoid-break{break-inside:avoid}
    @media screen{body{background:#e9e9e9}.sheet{margin:20px auto;padding:14mm 13mm 17mm;min-height:297mm;box-shadow:0 4px 24px #0002}.footer{position:static;margin-top:24px}.toolbar{position:sticky}}
    @media print{.toolbar{display:none!important}body{background:white}.sheet{width:auto;max-width:none;margin:0;padding:0;box-shadow:none}.footer{position:fixed}.totals,table,.head,.terms{break-inside:avoid}tr{break-inside:avoid;break-after:auto}a{color:inherit;text-decoration:none}}
    </style></head><body><nav class="toolbar"><button class="primary" onclick="window.print()">Imprimir / Guardar como PDF</button><button class="secondary" onclick="window.close()">Cerrar vista previa</button></nav><main class="sheet">
      <header class="head"><div class="brand">${identidad.logo_url ? `<img class="logo" src="${esc(identidad.logo_url)}" alt="Logo del taller">` : ""}<div class="brand-text"><strong>${esc(nombre)}</strong>${razon ? `<div>${esc(razon)}</div>` : ""}${identidad.ruc ? `<div>${esc(identidad.identificador_fiscal_label || "RUC")} ${esc(identidad.ruc)}</div>` : ""}${identidad.rnp_bienes ? `<div>RNP Bienes ${esc(identidad.rnp_bienes)}</div>` : ""}${identidad.rpp_servicios ? `<div>RPP Servicios ${esc(identidad.rpp_servicios)}</div>` : ""}</div></div><div class="address">${esc(razon || nombre)}<br>${esc(identidad.direccion || "")}<br>${esc(identidad.ciudad || "")}<span class="doc-title">${esc(titulo)} · ${esc(data.numero)}</span></div></header>
      <div class="date">${esc(data.tallerNombre || "")}, ${fecha(data.fecha)}</div><p class="greeting">Sr(a).</p><p class="client">${esc(data.cliente.nombre)}</p><p class="intro">${esc(data.tipo === "cotizacion" ? introduccion : "Documento comercial correspondiente al acuerdo entre las partes.")}</p>
      <section class="meta"><div><label>Fecha de ${data.tipo === "cotizacion" ? "cotización" : "emisión"}</label>${fecha(data.fecha)}</div><div><label>Vencimiento</label>${fecha(data.vencimiento)}</div><div><label>Atendido por</label>${esc(config.atendido_por || "—")}</div></section>
      ${tabla}${data.notas ? `<section class="avoid-break"><h3 class="section-title">OBSERVACIONES</h3><p>${esc(data.notas).replace(/\n/g, "<br>")}</p></section>` : ""}${cuerpoContrato}${firmaHtml}${condiciones}${bancos}
      <footer class="footer"><span>${esc(identidad.pie_documento || contacto || nombre)}</span><span>${esc(identidad.sitio_web || "")}</span></footer>
    </main><script>window.addEventListener('load',()=>{const logo=document.querySelector('.logo');if(logo&&!logo.complete){logo.onload=()=>{};logo.onerror=()=>{logo.style.display='none'}}});</script></body></html>`;
}

export function abrirDocumentoA4(data: DocumentoA4Props) {
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) {
    window.alert("El navegador bloqueó la vista previa. Permite las ventanas emergentes para este sitio e inténtalo de nuevo.");
    return false;
  }
  popup.document.open();
  popup.document.write(htmlDocumento(data));
  popup.document.close();
  return true;
}
