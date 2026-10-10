// @ts-nocheck
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ContratoVista = {
  id: string; numero: string; cliente: string; telefono?: string | null;
  total: number; abonado: number; saldo: number; sede_id?: string | null;
  sede_nombre?: string | null; notas?: string | null; created_at?: string | null;
};
type Identidad = {
  id?: string;
  nombre_comercial?: string | null; razon_social?: string | null; ruc?: string | null;
  logo_url?: string | null; direccion?: string | null; ciudad?: string | null;
  telefono?: string | null; email?: string | null; color_principal?: string | null;
};
type Clausula = { titulo?: string; contenido?: string; activa?: boolean };

const fecha = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? value + "T12:00:00" : value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long", year: "numeric" }).format(date);
};
const moneda = (value: number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(value) || 0);

export function FichaContratoA4({ contrato }: { contrato: ContratoVista }) {
  const [abierta, setAbierta] = useState(false);
  const [identidad, setIdentidad] = useState<Identidad>({});
  const [contenido, setContenido] = useState<{ titulo?: string; introduccion?: string; clausulas?: Clausula[]; textoAceptacion?: string; mostrarFirmas?: boolean }>({});
  useEffect(() => {
    if (!abierta) return;
    let vigente = true;
    void (async () => {
      let identidadCargada: Identidad = {};
      if (contrato.sede_id) {
        const { data } = await supabase.from("identidades_comerciales")
          .select("id,nombre_comercial,razon_social,ruc,logo_url,direccion,ciudad,telefono,email,color_principal")
          .eq("sede_id", contrato.sede_id).eq("activa", true).limit(1).maybeSingle();
        if (data) {
          identidadCargada = data as Identidad;
          if (vigente) setIdentidad(identidadCargada);
        }
      }
      const { data: plantilla } = identidadCargada.id
        ? await supabase.from("plantillas_contrato")
            .select("contenido").eq("identidad_comercial_id", identidadCargada.id).maybeSingle()
        : { data: null };
      if (vigente && plantilla?.contenido && typeof plantilla.contenido === "object") {
        setContenido(plantilla.contenido as typeof contenido);
      }
    })();
    return () => { vigente = false; };
  }, [abierta, contrato.sede_id]);

  const brand = /^#[0-9a-f]{6}$/i.test(identidad.color_principal ?? "") ? identidad.color_principal! : "#b99a22";
  const clausulas = (contenido.clausulas ?? []).filter(c => c.activa !== false && (c.titulo || c.contenido));
  const nombreTaller = identidad.razon_social || identidad.nombre_comercial || contrato.sede_nombre || "Taller";
  return <>
    <button type="button" onClick={() => setAbierta(true)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-surface-muted">
      Vista previa A4
    </button>
    {abierta ? <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/70 p-3 sm:p-8" role="dialog" aria-modal="true" aria-label="Vista previa A4 del contrato">
      <style>{`@page { size: A4; margin: 0; } @media print { body * { visibility: hidden !important; } .contrato-a4-print, .contrato-a4-print * { visibility: visible !important; } .contrato-a4-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 210mm !important; min-height: 297mm !important; margin: 0 !important; box-shadow: none !important; } .contrato-a4-toolbar { display: none !important; } }`}</style>
      <div className="contrato-a4-toolbar mx-auto mb-3 flex max-w-[210mm] justify-end gap-2">
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-[#b99a24] px-3 py-2 text-sm font-semibold text-slate-900 shadow"><span aria-hidden="true">▣</span> Descargar PDF</button>
        <button type="button" onClick={() => setAbierta(false)} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow"><X size={16}/> Cerrar</button>
      </div>
      <article className="contrato-a4-print mx-auto flex min-h-[297mm] w-full max-w-[210mm] flex-col bg-white px-7 py-8 text-slate-800 shadow-2xl sm:px-12 sm:py-11" style={{ borderTop: "5px solid " + brand, fontFamily: "Arial, Helvetica, sans-serif" }}>
        <header className="grid grid-cols-2 gap-5 border-b border-slate-300 pb-5">
          <div className="flex min-w-0 items-stretch gap-3">
            <div className="flex w-24 shrink-0 items-center justify-center pr-2">{identidad.logo_url ? <img src={identidad.logo_url} alt="Logo del taller" className="max-h-20 max-w-full object-contain"/> : <span className="text-xs font-bold text-slate-400">{identidad.nombre_comercial || "AURUM LAB"}</span>}</div>
            <div className="w-px shrink-0 bg-slate-300"/>
            <div className="min-w-0 py-1"><h2 className="text-sm font-bold uppercase text-slate-500">{nombreTaller}</h2>{identidad.ruc ? <p className="mt-1 text-[10px] text-slate-500">RUC {identidad.ruc}</p> : null}</div>
          </div>
          <div className="text-right text-[10px] leading-4"><p className="text-sm font-bold tracking-wider" style={{color:brand}}>CONTRATO</p><p className="mb-2 font-semibold">{contrato.numero}</p><p className="font-bold uppercase">{nombreTaller}</p>{identidad.direccion ? <p className="uppercase">{identidad.direccion}</p> : null}{identidad.ciudad ? <p className="uppercase">{identidad.ciudad}</p> : null}</div>
        </header>
        <div className="my-5 text-right text-[10px] text-slate-500">{identidad.ciudad || contrato.sede_nombre || ""}, {fecha(contrato.created_at)}</div>
        <section className="space-y-2"><p className="text-[10px] text-slate-500">CONTRATO ENTRE LAS PARTES</p><h1 className="text-base font-bold uppercase" style={{color:brand}}>{contenido.titulo || "CONTRATO DE FABRICACIÓN DE JOYERÍA"}</h1><p className="text-[11px] leading-5 text-slate-600">{contenido.introduccion || "El presente contrato establece las condiciones comerciales y de fabricación acordadas entre las partes."}</p></section>
        <section className="my-5 grid grid-cols-2 gap-4 rounded-sm border border-slate-200 p-3"><div><p className="mb-1 text-[8px] font-semibold uppercase tracking-wider text-slate-500">CLIENTE</p><p className="text-[11px] font-bold uppercase">{contrato.cliente}</p>{contrato.telefono ? <p className="mt-1 text-[9px] text-slate-500">Tel. {contrato.telefono}</p> : null}</div><div><p className="mb-1 text-[8px] font-semibold uppercase tracking-wider text-slate-500">TALLER / JOYERÍA</p><p className="text-[11px] font-bold uppercase">{nombreTaller}</p><p className="mt-1 text-[9px] text-slate-500">Fecha: {fecha(contrato.created_at)}</p></div></section>
        <section><h2 className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{color:brand}}>CONDICIONES ECONÓMICAS</h2><div className="ml-auto w-full max-w-[300px] border border-slate-300 text-[10px]"><div className="flex justify-between border-b border-slate-200 px-3 py-2"><span>Total del contrato</span><span>{moneda(contrato.total)}</span></div><div className="flex justify-between border-b border-slate-200 px-3 py-2"><span>Anticipo / abonado</span><span>{moneda(contrato.abonado)}</span></div><div className="flex justify-between px-3 py-2 font-bold text-white" style={{backgroundColor:brand}}><span>Saldo pendiente</span><span>{moneda(contrato.saldo)}</span></div></div></section>
        {contrato.notas?.trim() ? <section className="mt-5"><h2 className="mb-1 text-[9px] font-bold uppercase tracking-wider" style={{color:brand}}>OBSERVACIONES</h2><p className="whitespace-pre-wrap text-[10px] leading-4 text-slate-600">{contrato.notas}</p></section> : null}
        
        
        {contenido.mostrarFirmas !== false ? <section className="mt-12 grid grid-cols-2 gap-12 pt-3 text-center text-[9px]"><div className="border-t border-slate-400 pt-2">EL CLIENTE</div><div className="border-t border-slate-400 pt-2">EL TALLER / REPRESENTANTE</div></section> : null}
        <footer className="mt-auto grid grid-cols-3 gap-3 border-t border-slate-300 pt-2 text-[8px] text-slate-400"><div className="text-left">{identidad.telefono ? `Tel: ${identidad.telefono}` : ""}</div><div className="text-center">{identidad.email ? `Correo: ${identidad.email}` : ""}</div><div className="text-right">{identidad.ruc ? `RUC: ${identidad.ruc}` : ""}</div></footer>
      </article>
    </div> : null}
  </>;
}
