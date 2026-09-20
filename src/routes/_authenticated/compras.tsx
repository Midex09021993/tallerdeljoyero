import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, Panel } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/lib/auth";
import { toast } from "sonner";

type Linea = { material_id: string; cantidad: string; costo_unitario: string; unidad: string };

export const Route = createFileRoute("/_authenticated/compras")({
  head: () => ({ meta: [{ title: "Compras — Aurum Lab" }] }),
  component: ComprasPage,
});

function ComprasPage() {
  const { data: sesion } = useSesion();
  const qc = useQueryClient();
  const [proveedor, setProveedor] = useState("");
  const [notas, setNotas] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([{ material_id: "", cantidad: "", costo_unitario: "", unidad: "" }]);
  const [guardando, setGuardando] = useState(false);

  const { data: compras = [] } = useQuery({
    queryKey: ["compras", sesion?.sede?.id],
    enabled: Boolean(sesion?.sede?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("compras").select("id,numero,proveedor_nombre,estado,fecha_emision,total,moneda,notas").eq("sede_id", sesion!.sede!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: materiales = [] } = useQuery({
    queryKey: ["compras-materiales", sesion?.sede?.id],
    enabled: Boolean(sesion?.sede?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("inventario").select("id,material,codigo,unidad,costo_unitario,activo").eq("sede_id", sesion!.sede!.id).eq("activo", true).order("material");
      if (error) throw error;
      return data ?? [];
    },
  });
  const totalBorrador = useMemo(() => lineas.reduce((s, l) => s + Number(l.cantidad || 0) * Number(l.costo_unitario || 0), 0), [lineas]);

  const seleccionarMaterial = (index: number, id: string) => {
    const m = materiales.find(x => x.id === id);
    setLineas(ls => ls.map((l, i) => i === index ? { ...l, material_id: id, unidad: m?.unidad ?? "", costo_unitario: m?.costo_unitario ? String(m.costo_unitario) : l.costo_unitario } : l));
  };

  const guardarCompra = async () => {
    if (!sesion?.sede?.id || !sesion.esAdmin || !proveedor.trim()) return;
    const validas = lineas.filter(l => l.material_id && Number(l.cantidad) > 0 && Number(l.costo_unitario) >= 0);
    if (!validas.length) { toast.error("Agrega al menos un material válido"); return; }
    setGuardando(true);
    try {
      const numero = "OC-" + new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
      const { data: compra, error } = await supabase.from("compras").insert({ sede_id: sesion.sede.id, numero, proveedor_nombre: proveedor.trim(), estado: "ordenada", subtotal: totalBorrador, total: totalBorrador, notas: notas.trim(), creado_por: sesion.user.id }).select("id").single();
      if (error || !compra) throw error ?? new Error("No se pudo crear la compra");
      const { error: detailError } = await supabase.from("compra_detalles").insert(validas.map(l => ({ compra_id: compra.id, material_id: l.material_id, cantidad: Number(l.cantidad), unidad: l.unidad, costo_unitario: Number(l.costo_unitario), descripcion: materiales.find(m => m.id === l.material_id)?.material ?? "" })));
      if (detailError) { await supabase.from("compras").delete().eq("id", compra.id); throw detailError; }
      toast.success("Orden de compra creada");
      setProveedor(""); setNotas(""); setLineas([{ material_id: "", cantidad: "", costo_unitario: "", unidad: "" }]);
      await qc.invalidateQueries({ queryKey: ["compras", sesion.sede.id] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo guardar la compra"); }
    finally { setGuardando(false); }
  };

  const recibir = async (id: string) => {
    const { error } = await supabase.rpc("recibir_compra", { _compra_id: id });
    if (error) toast.error(error.message);
    else { toast.success("Compra recibida: entrada registrada en Kardex"); await qc.invalidateQueries({ queryKey: ["compras", sesion?.sede?.id] }); await qc.invalidateQueries({ queryKey: ["inventario-real", sesion?.sede?.id] }); }
  };

  return <AppShell titulo="Compras" subtitulo="Abastecimiento, recepción y costo histórico de materiales">
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-gold-deep">Abastecimiento</p><h1 className="mt-1 text-xl font-semibold">Nueva orden de compra</h1><p className="mt-1 text-sm text-muted-foreground">La recepción genera automáticamente la entrada al Kardex con el costo comprado.</p></div>
          <div className="rounded-2xl bg-surface-sunken px-4 py-3 text-right"><p className="text-[9px] uppercase text-muted-foreground">Total</p><p className="text-lg font-bold">S/ {totalBorrador.toFixed(2)}</p></div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><input value={proveedor} onChange={e=>setProveedor(e.target.value)} placeholder="Proveedor / empresa" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm"/><input value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Notas de compra" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm"/></div>
        <div className="mt-4 space-y-2">{lineas.map((l,i)=><div key={i} className="grid gap-2 sm:grid-cols-[1fr_120px_140px_80px]"><select value={l.material_id} onChange={e=>seleccionarMaterial(i,e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-xs"><option value="">Seleccionar material</option>{materiales.map(m=><option key={m.id} value={m.id}>{m.codigo ? m.codigo+" · " : ""}{m.material}</option>)}</select><input type="number" min="0.001" step="0.001" value={l.cantidad} onChange={e=>setLineas(ls=>ls.map((x,j)=>j===i?{...x,cantidad:e.target.value}:x))} placeholder="Cantidad" className="rounded-xl border border-border bg-background px-3 py-2 text-xs"/><input type="number" min="0" step="0.0001" value={l.costo_unitario} onChange={e=>setLineas(ls=>ls.map((x,j)=>j===i?{...x,costo_unitario:e.target.value}:x))} placeholder="Costo unitario" className="rounded-xl border border-border bg-background px-3 py-2 text-xs"/><button type="button" onClick={()=>setLineas(ls=>ls.length===1?ls:ls.filter((_,j)=>j!==i))} className="rounded-xl border border-border px-3 py-2 text-xs">Quitar</button></div>)}</div>
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={()=>setLineas(ls=>[...ls,{material_id:"",cantidad:"",costo_unitario:"",unidad:""}])} className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold">+ Material</button><button type="button" disabled={guardando || !sesion?.esAdmin} onClick={()=>void guardarCompra()} className="rounded-xl bg-ink px-5 py-2.5 text-xs font-semibold text-ink-foreground disabled:opacity-50">{guardando?"Guardando…":"Crear orden de compra"}</button></div>
      </Panel>
      <Panel>
        <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-gold-deep">Historial</p><h2 className="mt-1 text-lg font-semibold">Órdenes de compra</h2></div><span className="rounded-full bg-surface-sunken px-3 py-1 text-[10px] font-semibold">{compras.length} registros</span></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-border text-muted-foreground"><th className="p-2">Orden</th><th className="p-2">Proveedor</th><th className="p-2">Estado</th><th className="p-2">Total</th><th className="p-2"></th></tr></thead><tbody>{compras.map(c=><tr key={c.id} className="border-b border-border/60"><td className="p-2 font-semibold">{c.numero}</td><td className="p-2">{c.proveedor_nombre || "—"}</td><td className="p-2 uppercase">{c.estado}</td><td className="p-2">S/ {Number(c.total).toFixed(2)}</td><td className="p-2 text-right">{c.estado!=="recibida"&&c.estado!=="cancelada"?<button type="button" onClick={()=>void recibir(c.id)} className="rounded-lg border border-border px-3 py-1.5 font-semibold">Recibir</button>:null}</td></tr>)}</tbody></table></div>
      </Panel>
    </div>
  </AppShell>;
}
