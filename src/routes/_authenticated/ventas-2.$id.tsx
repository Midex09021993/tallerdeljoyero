import { useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Banknote, CheckCircle2, CreditCard, History, PackageCheck, Truck, UserRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useContratos, usePagosContratos, usePedidos, resumenFinancieroContrato, estadoClases } from "@/lib/taller-db";
import { fmtFecha } from "@/lib/utils";
import { areaCoincide, useSesion } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ventas-2/$id")({
  head: () => ({ meta: [{ title: "Ficha comercial — Ventas 2" }, { name: "description", content: "Ficha comercial y de entrega del pedido." }] }),
  component: Venta2Detalle,
});

function Venta2Detalle() {
  const { id } = useParams({ from: "/_authenticated/ventas-2/$id" });
  const navigate = useNavigate();
  const { data: sesion } = useSesion();
  const { data: pedidos = [] } = usePedidos();
  const pedido = pedidos.find((p) => p.id === id);
  const puede = Boolean(sesion?.esAdmin || sesion?.areas.some((a) => areaCoincide(a, "Área ventas")));
  const { data: contratos = [] } = useContratos(puede);
  const { data: pagos = [] } = usePagosContratos(contratos, puede);
  const contrato = pedido?.contrato_id ? contratos.find((c) => c.id === pedido.contrato_id) : pedido?.contrato ? contratos.find((c) => c.numero === pedido.contrato) : undefined;
  const pagosPedido = contrato ? pagos.filter((p) => p.contrato_id === contrato.id) : [];
  const resumen = resumenFinancieroContrato(contrato, pagosPedido);
  const [accion, setAccion] = useState<"pago" | "despachar" | "entregar" | null>(null);
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("Abono");
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0,10));
  const [medio, setMedio] = useState(pedido?.medio_envio ?? "Entrega en taller");
  const [guia, setGuia] = useState(pedido?.guia_envio ?? "");
  const [receptor, setReceptor] = useState(pedido?.receptor_envio ?? "");
  const [evidencia, setEvidencia] = useState("");
  const [confirmarSaldoEntrega, setConfirmarSaldoEntrega] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const ejecutar = async (accionEntrega: string, datos: Record<string, unknown> = {}) => {
    setGuardando(true);
    const { error } = await supabase.rpc("transicionar_entrega_pedido", { _pedido_id: id, _accion: accionEntrega, _datos: datos as never });
    setGuardando(false);
    if (error) { toast.error(error.message); return false; }
    toast.success(accionEntrega === "packing" ? "Packing preparado" : accionEntrega === "despachar" ? "Pedido despachado" : accionEntrega === "entregar" ? "Entrega registrada" : "Pedido listo para entrega");
    setAccion(null);
    window.location.reload();
    return true;
  };

  const registrarPago = async () => {
    if (!contrato || !sesion?.user.id) return;
    const valor = Number(monto);
    if (!(valor > 0)) { toast.error("Ingresa un monto válido."); return; }
    if (valor > resumen.saldo) { toast.error("El abono supera el saldo pendiente."); return; }
    setGuardando(true);
    const { error } = await supabase.from("contrato_pagos").insert({ contrato_id: contrato.id, contrato_numero: contrato.numero ?? "", fecha: fechaPago, concepto: concepto.trim() || "Abono", monto: valor, usuario_id: sesion.user.id });
    setGuardando(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pago registrado");
    setMonto(""); setAccion(null); window.location.reload();
  };

  const { data: entregaEventos = [] } = useQuery({
    queryKey: ["ventas-2-entrega-eventos", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("pedido_entrega_eventos").select("id,tipo,usuario_id,datos,created_at").eq("pedido_id", id).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: movimientos = [] } = useQuery({
    queryKey: ["ventas-2-movimientos", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("pedido_movimientos").select("id,area_origen,area_destino,accion,nota,created_at").eq("pedido_id", id).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!pedido) return <AppShell titulo="Ventas 2"><div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No se encontró el pedido.</div></AppShell>;

  const saldo = resumen.origen === "contrato" ? resumen.saldo : pedido.saldo;
  const estado = pedido.estado === "Entregado" || pedido.ventas_estado === "Entregado" ? "Entregado" : pedido.estado === "En Camino" || pedido.ventas_estado === "En Camino" ? "En Camino" : pedido.estado === "Listo para Entrega" || pedido.ventas_estado === "Listo para Entrega" ? "Listo para Entrega" : pedido.ventas_estado || pedido.estado;

  return (
    <AppShell titulo={pedido.referencia} subtitulo={`Gestión comercial · ${pedido.cliente || "Cliente pendiente"}`} acciones={<div className="flex gap-2"><button type="button" onClick={()=>navigate({to:"/ventas-2"})} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold"><ArrowLeft className="size-4"/> Ventas 2</button><Link to="/pedidos-2/$id" params={{id}} className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold">Ver pedido operativo</Link></div>}>
      <section className="rounded-[26px] border border-gold/20 bg-card p-5 shadow-raised sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:justify-between">
          <div><div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${estadoClases[estado]??"bg-surface-muted text-muted-foreground"}`}>{estado}</span>{pedido.medio_envio?<span className="rounded-full bg-surface-muted px-3 py-1 text-[10px] font-semibold">{pedido.medio_envio}</span>:null}</div><h2 className="mt-4 font-display text-3xl">{pedido.trabajo||pedido.pieza||"Pedido"}</h2><p className="mt-2 text-sm text-muted-foreground">{pedido.notas_ventas||"Sin notas comerciales."}</p></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[560px]"><Dato label="Venta" value={money(pedido.importe)}/><Dato label="Cobrado" value={money(resumen.abonado)}/><Dato label="Saldo" value={money(saldo)}/><Dato label="Entrega" value={fmtFecha(pedido.fecha_entrega)||"—"}/></div>
        </div>
        {puede ? <div className="mt-5 flex flex-wrap gap-2">
          {estado === "En Producción" ? <Link to="/pedidos-2/$id" params={{id}} className="inline-flex items-center rounded-xl border border-gold/30 bg-gold/10 px-4 py-2.5 text-xs font-bold text-gold-deep">Ver proceso de producción</Link> : null}
          {estado === "Listo para Entrega" && pedido.packing_estado !== "Preparado" ? <button type="button" onClick={() => void ejecutar("packing")} disabled={guardando} className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold">Preparar packing</button> : null}
          {estado === "Listo para Entrega" && pedido.packing_estado === "Preparado" ? <button type="button" onClick={() => setAccion("despachar")} className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold">Despachar</button> : null}
          {estado === "En Camino" ? <button type="button" onClick={() => setAccion("entregar")} className="rounded-xl bg-success px-4 py-2.5 text-xs font-bold text-white">Registrar entrega</button> : null}
          {contrato && resumen.saldo > 0 ? <button type="button" onClick={() => setAccion("pago")} className="rounded-xl bg-gold px-4 py-2.5 text-xs font-bold text-black">Registrar pago</button> : null}
        </div> : null}
        {accion ? <div className="mt-4 rounded-2xl border border-gold/20 bg-surface-muted p-4">
          {accion === "pago" ? <div className="grid gap-3 sm:grid-cols-4"><input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm"/><input value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Concepto" className="rounded-xl border border-border bg-card px-3 py-2 text-sm"/><input type="number" min="0.01" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} placeholder="Monto" className="rounded-xl border border-border bg-card px-3 py-2 text-sm"/><div className="flex gap-2"><button type="button" disabled={guardando} onClick={() => void registrarPago()} className="rounded-xl bg-gold px-4 py-2 text-xs font-bold text-black">Guardar</button><button type="button" onClick={() => setAccion(null)} className="rounded-xl border border-border px-4 py-2 text-xs">Cancelar</button></div></div>
          : accion === "despachar" ? <div className="grid gap-3 sm:grid-cols-3"><input value={medio} onChange={e => setMedio(e.target.value)} placeholder="Medio de envío o recojo" className="rounded-xl border border-border bg-card px-3 py-2 text-sm"/><input value={guia} onChange={e => setGuia(e.target.value)} placeholder="Guía / referencia" className="rounded-xl border border-border bg-card px-3 py-2 text-sm"/><div className="flex gap-2"><button type="button" disabled={guardando} onClick={() => void ejecutar("despachar", { medio_envio: medio, guia_envio: guia })} className="rounded-xl bg-gold px-4 py-2 text-xs font-bold text-black">Despachar</button><button type="button" onClick={() => setAccion(null)} className="rounded-xl border border-border px-4 py-2 text-xs">Cancelar</button></div></div>
          : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><input value={receptor} onChange={e => setReceptor(e.target.value)} placeholder="Quién recibe" className="rounded-xl border border-border bg-card px-3 py-2 text-sm"/><input value={evidencia} onChange={e => setEvidencia(e.target.value)} placeholder="URL de evidencia (opcional)" className="rounded-xl border border-border bg-card px-3 py-2 text-sm"/>{resumen.saldo > 0 ? <label className="flex items-center gap-2 rounded-xl border border-warning/25 bg-warning-soft px-3 py-2 text-xs text-warning"><input type="checkbox" checked={confirmarSaldoEntrega} onChange={e => setConfirmarSaldoEntrega(e.target.checked)} /> Entregar con saldo pendiente</label> : null}<div className="flex gap-2"><button type="button" disabled={guardando || (resumen.saldo > 0 && !confirmarSaldoEntrega)} onClick={() => { if (resumen.saldo > 0 && !confirmarSaldoEntrega) { toast.error("Confirma que el cliente acepta la entrega con saldo pendiente."); return; } void ejecutar("entregar", { receptor_envio: receptor, evidencia_entrega_url: evidencia, saldo_pendiente_confirmado: resumen.saldo > 0 }); }} className="rounded-xl bg-success px-4 py-2 text-xs font-bold text-white">Confirmar entrega</button><button type="button" onClick={() => setAccion(null)} className="rounded-xl border border-border px-4 py-2 text-xs">Cancelar</button></div></div>}
        </div> : null}
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5"><CreditCard className="size-5 text-gold"/><h3 className="mt-3 text-xs font-bold uppercase tracking-[.16em]">Cobranza</h3><div className="mt-4 space-y-3"><Dato label="Contrato" value={contrato?.numero||pedido.contrato||"Sin contrato"}/><Dato label="Estado" value={resumen.estado}/><Dato label="Total" value={money(resumen.total)}/><Dato label="Abonado" value={money(resumen.abonado)}/><Dato label="Saldo" value={money(resumen.saldo)}/></div></section>
        <section className="rounded-2xl border border-border bg-card p-5"><Truck className="size-5 text-gold"/><h3 className="mt-3 text-xs font-bold uppercase tracking-[.16em]">Despacho</h3><div className="mt-4 space-y-3"><Dato label="Packing" value={pedido.packing_estado||"Pendiente"}/><Dato label="Medio" value={pedido.medio_envio||"Entrega en taller"}/><Dato label="Guía" value={pedido.guia_envio||"—"}/><Dato label="Enviado" value={fmtFecha(pedido.fecha_envio)||"—"}/><Dato label="Receptor" value={pedido.receptor_envio||"—"}/></div></section>
        <section className="rounded-2xl border border-border bg-card p-5"><UserRound className="size-5 text-gold"/><h3 className="mt-3 text-xs font-bold uppercase tracking-[.16em]">Cliente</h3><div className="mt-4 space-y-3"><Dato label="Nombre" value={pedido.cliente||"—"}/><Dato label="Teléfono" value={pedido.telefono||"—"}/><Dato label="Taller / sede" value={pedido.sede_nombre||"Taller no asignado"}/><Dato label="Origen" value={pedido.origen||"—"}/></div></section>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2"><Banknote className="size-5 text-gold"/><h3 className="text-xs font-bold uppercase tracking-[.16em]">Pagos registrados</h3></div><div className="mt-4 space-y-2">{pagosPedido.length?pagosPedido.map(p=><div key={p.id} className="flex items-center justify-between rounded-xl border border-border p-3"><div><p className="text-xs font-semibold">{p.concepto||"Pago"}</p><p className="mt-1 text-[10px] text-muted-foreground">{fmtFecha(p.fecha)} · {p.usuario_nombre||"Usuario"}</p></div><b className="text-sm">{money(p.monto)}</b></div>):<Empty text="No hay pagos registrados en este contrato." />}</div></section>
        <section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2"><PackageCheck className="size-5 text-gold"/><h3 className="text-xs font-bold uppercase tracking-[.16em]">Entrega</h3></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Dato label="Estado" value={estado}/><Dato label="Listo" value={fmtFecha(pedido.fecha_listo_entrega)||"—"}/><Dato label="Despacho" value={fmtFecha(pedido.fecha_envio)||"—"}/><Dato label="Entregado" value={fmtFecha(pedido.fecha_entregado)||"—"}/></div></section>
      </div>

      <section className="mt-5 rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2"><History className="size-5 text-gold"/><h3 className="text-xs font-bold uppercase tracking-[.16em]">Trazabilidad comercial</h3></div><div className="mt-5 space-y-0">{[...entregaEventos.map(e=>({id:`e-${e.id}`,fecha:e.created_at,tipo:"Entrega",titulo:e.tipo,detalle:detalleEvento(e.datos)})),...movimientos.map(m=>({id:`m-${m.id}`,fecha:m.created_at,tipo:"Área",titulo:m.accion||"Movimiento",detalle:m.area_origen?`${m.area_origen} → ${m.area_destino}`:m.area_destino}))].sort((a,b)=>new Date(b.fecha).getTime()-new Date(a.fecha).getTime()).map(e=><div key={e.id} className="relative border-l border-border pb-5 pl-5 last:pb-0"><span className="absolute -left-1.5 top-1 size-3 rounded-full bg-gold ring-4 ring-card"/><p className="text-sm font-semibold">{e.titulo}</p><p className="mt-1 text-xs text-muted-foreground">{e.tipo} · {e.detalle}</p><p className="mt-1 text-[10px] text-muted-foreground">{new Date(e.fecha).toLocaleString("es-PE")}</p></div>)}{!entregaEventos.length&&!movimientos.length?<Empty text="Aún no hay eventos comerciales registrados."/>:null}</div></section>
    </AppShell>
  );
}
function Dato({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-surface-muted px-3 py-2.5"><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-semibold">{value}</p></div>}
function Empty({text}:{text:string}){return <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">{text}</div>}
function money(v:number|null|undefined){return new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN"}).format(Number(v)||0)}

function detalleEvento(datos: unknown){ if(!datos || typeof datos !== "object") return "Evento registrado"; const entries=Object.entries(datos as Record<string,unknown>).filter(([,v])=>v!==null&&v!==undefined&&v!==""); return entries.length ? entries.map(([k,v])=>`${k.replaceAll("_"," ")}: ${String(v)}`).join(" · ") : "Evento registrado"; }
