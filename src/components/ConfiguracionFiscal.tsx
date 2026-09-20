import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Panel } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

type Fiscal = { pais_codigo:string; pais_nombre:string; impuesto_nombre:string; tasa:number; activo:boolean };

export function ConfiguracionFiscal() {
  const [items,setItems]=useState<Fiscal[]>([]);
  const [form,setForm]=useState<Fiscal>({pais_codigo:"PE",pais_nombre:"Perú",impuesto_nombre:"IGV",tasa:18,activo:true});
  const [guardando,setGuardando]=useState(false);
  const cargar=async()=>{ const {data,error}=await (supabase as any).from("configuracion_fiscal").select("pais_codigo,pais_nombre,impuesto_nombre,tasa,activo").order("pais_nombre"); if(error) toast.error(error.message); else setItems(data??[]); };
  useEffect(()=>{void cargar()},[]);
  const guardar=async()=>{ setGuardando(true); const {error}=await (supabase as any).rpc("guardar_configuracion_fiscal",{_pais_codigo:form.pais_codigo,_pais_nombre:form.pais_nombre,_impuesto_nombre:form.impuesto_nombre,_tasa:Number(form.tasa),_activo:form.activo}); if(error) toast.error(error.message); else {toast.success("Configuración fiscal guardada"); await cargar();} setGuardando(false); };
  return <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
    <Panel titulo="Nueva / editar país"><div className="space-y-3 p-6">
      <input className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" placeholder="Código país" value={form.pais_codigo} onChange={e=>setForm({...form,pais_codigo:e.target.value.toUpperCase()})}/>
      <input className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" placeholder="País" value={form.pais_nombre} onChange={e=>setForm({...form,pais_nombre:e.target.value})}/>
      <input className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" placeholder="Impuesto" value={form.impuesto_nombre} onChange={e=>setForm({...form,impuesto_nombre:e.target.value})}/>
      <label className="block text-xs text-muted-foreground">Tasa (%)<input type="number" min="0" max="100" step="0.01" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={form.tasa} onChange={e=>setForm({...form,tasa:Number(e.target.value)})}/></label>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.activo} onChange={e=>setForm({...form,activo:e.target.checked})}/> Activo para cotizaciones</label>
      <button disabled={guardando} onClick={()=>void guardar()} className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{guardando?"Guardando…":"Guardar configuración"}</button>
    </div></Panel>
    <Panel titulo="Impuestos por país"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border text-[10px] uppercase text-muted-foreground"><th className="px-4 py-3">País</th><th className="px-4 py-3">Impuesto</th><th className="px-4 py-3">Tasa</th><th className="px-4 py-3">Estado</th></tr></thead><tbody className="divide-y divide-border">{items.map(i=><tr key={i.pais_codigo} onClick={()=>setForm(i)} className="cursor-pointer hover:bg-surface-muted"><td className="px-4 py-3 font-medium">{i.pais_nombre} ({i.pais_codigo})</td><td className="px-4 py-3">{i.impuesto_nombre}</td><td className="px-4 py-3 font-semibold">{i.tasa}%</td><td className="px-4 py-3">{i.activo?"Activo":"Inactivo"}</td></tr>)}</tbody></table></div></Panel>
  </div>;
}
