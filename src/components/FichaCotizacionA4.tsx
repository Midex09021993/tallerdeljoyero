import type { ReactNode } from "react";

export type FichaCotizacionIdentidad = {
  nombre_comercial?: string | null;
  razon_social?: string | null;
  ruc?: string | null;
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
  metadata?: Record<string, unknown> | null;
};

export type FichaCotizacionProps = {
  numero: string;
  version: number;
  fecha: string;
  vencimiento: string | null;
  entrega: string | null;
  moneda: string;
  cliente: { nombre: string; telefono?: string | null; email?: string | null };
  tallerNombre: string | null;
  identidad: FichaCotizacionIdentidad | null;
  detalles: Array<{ tipo: string; descripcion: string; cantidad: number; unidad: string; precio_unitario: number; total_precio: number }>;
  subtotal: number;
  descuento: number;
  impuestos: number;
  total: number;
  notas: string;
};

const fechaCorta = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? value + "T12:00:00" : value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
};
const dinero = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: /^[A-Z]{3}$/.test(currency) ? currency : "PEN" }).format(Number(value) || 0);
  } catch {
    return "S/ " + (Number(value) || 0).toFixed(2);
  }
};

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return <div><div className="mb-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div><div className="text-[11px] text-slate-800">{children || "—"}</div></div>;
}

export function FichaCotizacionA4({ data }: { data: FichaCotizacionProps }) {
  const identity = data.identidad ?? {};
  const brand = /^#[0-9a-f]{6}$/i.test(identity.color_principal ?? "") ? identity.color_principal! : "#b99a5b";
  const businessName = identity.nombre_comercial || identity.razon_social || data.tallerNombre || "Taller";
  const config = (identity.metadata?.["cotizacion"] && typeof identity.metadata["cotizacion"] === "object" ? identity.metadata["cotizacion"] : {}) as Record<string, unknown>;
  const introduction = typeof config["introduccion"] === "string" ? config["introduccion"] : "Es grato dirigirnos a usted para presentar la siguiente cotización.";
  const terms = Array.isArray(config["terminos"]) ? config["terminos"].filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  const accounts = Array.isArray(config["cuentas_bancarias"]) ? config["cuentas_bancarias"].filter((item) => item && typeof item === "object" && (item as Record<string, unknown>)["activa"] !== false) as Record<string, unknown>[] : [];

  return (
    <div className="bg-slate-100 p-3 sm:p-6">
      <article className="mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-6 py-7 text-slate-800 shadow-xl sm:px-10 sm:py-10" style={{ borderTop: `5px solid ${brand}`, fontFamily: "Arial, Helvetica, sans-serif" }}>
        <header className="grid grid-cols-2 gap-5 border-b border-slate-300 pb-5">
          <div className="flex min-w-0 items-stretch gap-3">
            <div className="flex w-28 shrink-0 items-center justify-center pr-3">
              {identity.logo_url ? <img src={identity.logo_url} alt="Logo del taller" className="max-h-20 max-w-full object-contain" /> : null}
            </div>
            <div className="w-px shrink-0 self-stretch bg-slate-300" aria-hidden="true" />
            <div className="min-w-0 py-1">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">{identity.razon_social || businessName}</h2>
              {identity.ruc ? <p className="mt-1 text-[10px] font-semibold text-slate-400">RUC {identity.ruc}</p> : null}
              {identity.rnp_bienes ? <p className="mt-1 text-[10px] font-semibold text-slate-400">RNP Bienes {identity.rnp_bienes}</p> : null}
              {identity.rpp_servicios ? <p className="mt-1 text-[10px] font-semibold text-slate-400">RPP Servicios {identity.rpp_servicios}</p> : null}
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-600">
            <p className="font-bold text-slate-800">{identity.razon_social || businessName}</p>
            <p>{identity.telefono || identity.whatsapp || ""}</p>
            <p>{identity.email || ""}</p>
            <p>{identity.sitio_web || ""}</p>
            <p className="mt-3 text-sm font-bold tracking-wider" style={{ color: brand }}>COTIZACIÓN</p>
            <p className="font-semibold">{data.numero} · Versión {data.version}</p>
          </div>
        </header>

        <div className="my-5 text-right text-[10px] text-slate-500">{identity.ciudad || data.tallerNombre || ""}, {fechaCorta(data.fecha)}</div>
        <section className="space-y-2">
          <p className="text-[10px] text-slate-500">Sr(a).</p>
          <h3 className="text-sm font-bold uppercase" style={{ color: brand }}>{data.cliente.nombre}</h3>
          <div className="grid grid-cols-2 gap-3 text-[10px] text-slate-600">
            <p>Teléfono: {data.cliente.telefono || "—"}</p><p>Correo: {data.cliente.email || "—"}</p>
          </div>
          <p className="pt-2 text-[11px] leading-5 text-slate-600">{introduction}</p>
        </section>

        <section className="my-6 grid grid-cols-3 gap-4 rounded-sm border border-slate-200 p-3">
          <Dato label="Emisión">{fechaCorta(data.fecha)}</Dato>
          <Dato label="Válida hasta">{fechaCorta(data.vencimiento)}</Dato>
          <Dato label="Entrega solicitada">{fechaCorta(data.entrega)}</Dato>
        </section>

        <section>
          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: brand }}>Detalle de la cotización</h4>
          <table className="w-full table-fixed border-collapse text-left text-[9px]">
            <thead><tr style={{ color: brand }} className="border-y border-slate-400">
              <th className="w-[12%] px-2 py-2">TIPO</th><th className="w-[38%] px-2 py-2">DESCRIPCIÓN</th><th className="w-[12%] px-2 py-2 text-right">CANT.</th><th className="w-[18%] px-2 py-2 text-right">PRECIO UNIT.</th><th className="w-[20%] px-2 py-2 text-right">IMPORTE</th>
            </tr></thead>
            <tbody>{data.detalles.map((item, index) => <tr key={index} className="border-b border-slate-200 align-top">
              <td className="px-2 py-2">{item.tipo.replaceAll("_", " ").toUpperCase()}</td><td className="whitespace-pre-wrap px-2 py-2">{item.descripcion}</td><td className="px-2 py-2 text-right">{item.cantidad} {item.unidad}</td><td className="px-2 py-2 text-right">{dinero(item.precio_unitario, data.moneda)}</td><td className="px-2 py-2 text-right font-semibold">{dinero(item.total_precio, data.moneda)}</td>
            </tr>)}
            {data.detalles.length === 0 ? <tr><td colSpan={5} className="px-2 py-5 text-center text-slate-400">Sin partidas registradas</td></tr> : null}</tbody>
          </table>
        </section>

        <section className="ml-auto mt-5 w-full max-w-[290px] border border-slate-300 text-[10px]">
          <div className="flex justify-between border-b border-slate-200 px-3 py-2"><span>Subtotal</span><span>{dinero(data.subtotal, data.moneda)}</span></div>
          <div className="flex justify-between border-b border-slate-200 px-3 py-2"><span>Descuento</span><span>{dinero(data.descuento, data.moneda)}</span></div>
          <div className="flex justify-between border-b border-slate-200 px-3 py-2"><span>Impuestos</span><span>{dinero(data.impuestos, data.moneda)}</span></div>
          <div className="flex justify-between px-3 py-3 font-bold text-white" style={{ backgroundColor: brand }}><span>TOTAL</span><span>{dinero(data.total, data.moneda)}</span></div>
        </section>

        {data.notas.trim() ? <section className="mt-5"><h4 className="mb-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: brand }}>Observaciones</h4><p className="whitespace-pre-wrap text-[10px] leading-4 text-slate-600">{data.notas}</p></section> : null}

        {terms.length ? <section className="mt-5"><h4 className="mb-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: brand }}>Términos y condiciones</h4><ol className="list-decimal space-y-1 pl-5 text-[9px] leading-4 text-slate-600">{terms.map((term, index) => <li key={index}>{term}</li>)}</ol></section> : null}

        {accounts.length ? <section className="mt-5"><h4 className="mb-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: brand }}>Datos bancarios</h4><div className="grid grid-cols-2 gap-3">{accounts.map((account, index) => <div key={index} className="border border-slate-200 p-2 text-[9px]"><p className="font-bold">{String(account["banco"] ?? "")}</p><p>Cuenta: {String(account["cuenta"] ?? "—")}</p><p>CCI: {String(account["cci"] ?? "—")}</p><p>Titular: {String(account["titular"] ?? "—")}</p></div>)}</div></section> : null}

        <section className="mt-8 grid grid-cols-2 gap-8 pt-5 text-center text-[9px] text-slate-500">
          <div className="border-t border-slate-400 pt-2">Firma del cliente</div><div className="border-t border-slate-400 pt-2">Firma y sello del taller</div>
        </section>
        <footer className="mt-8 border-t border-slate-200 pt-3 text-center text-[8px] text-slate-500">{identity.pie_documento || [identity.telefono || identity.whatsapp, identity.email, identity.ruc ? "RUC " + identity.ruc : ""].filter(Boolean).join(" · ") || businessName}</footer>
      </article>
    </div>
  );
}
