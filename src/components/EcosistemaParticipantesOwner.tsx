import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Panel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { VincularCuentaParticipante } from "@/components/VincularCuentaParticipante";
import { Asignador as AsignadorEspecialidades } from "@/components/EspecialidadesOwner";
import { obtenerPlanComercial, PLANES_COMERCIALES, type PlanComercialId } from "@/lib/planes-comerciales";

type Tipo = "organizacion"|"profesional"|"vendedor"|"proveedor"|"servicio"|"talento"|"institucion_educativa";
type Estado = "activo"|"pausado"|"inactivo";
type Participante={id:string;tipo_participante:Tipo;nombre:string;razon_social:string|null;email:string|null;telefono:string|null;ciudad:string|null;descripcion:string|null;estado:Estado;notas_owner:string|null;sede_id:string|null;metadata?:Record<string,unknown>|null};
const tipos:Record<Tipo,string>={organizacion:"Organización",profesional:"Profesional",vendedor:"Vendedor / Comercializador",proveedor:"Proveedor",servicio:"Servicio especializado",talento:"Talento / Prácticas",institucion_educativa:"Institución educativa"};
const empty={tipo_participante:"profesional" as Tipo,nombre:"",razon_social:"",email:"",telefono:"",ciudad:"",descripcion:"",estado:"activo" as Estado,notas_owner:""};

export function EcosistemaParticipantesOwner(){
 const qc=useQueryClient(); const [vincular,setVincular]=useState<Participante|null>(null); const [capacidades,setCapacidades]=useState<Participante|null>(null); const [buscar,setBuscar]=useState(""); const [tipo,setTipo]=useState<"todos"|Tipo>("todos"); const [estado,setEstado]=useState<"todos"|Estado>("activo"); const [edit,setEdit]=useState<Participante|null>(null); const [form,setForm]=useState(empty); const [nuevo,setNuevo]=useState(false); const [saving,setSaving]=useState(false);
 const {data=[],isLoading,error}=useQuery({queryKey:["ecosistema-participantes"],staleTime:15_000,queryFn:async()=>{const {data,error}=await supabase.from("ecosistema_participantes").select("*").order("nombre");if(error)throw error;return(data??[]) as Participante[]}});
 type CuotaPlan = { plan_id: PlanComercialId; operaciones_comerciales_mes: number; almacenamiento_mib: number; usos_render_mes: number; productos_catalogo_max: number };
 const [cuotasEdit, setCuotasEdit] = useState<Record<string, CuotaPlan>>({});
 const [guardandoCuota, setGuardandoCuota] = useState<string | null>(null);
 const cuotasQuery = useQuery({ queryKey: ["aurum-plan-quotas"], staleTime: 60_000, queryFn: async () => {
   const { data, error } = await supabase.from("aurum_plan_quotas").select("plan_id,operaciones_comerciales_mes,almacenamiento_mib,usos_render_mes,productos_catalogo_max").order("plan_id");
   if (error) throw error;
   return (data ?? []) as CuotaPlan[];
 }});
 const cuotaActual = (id: PlanComercialId) => cuotasEdit[id] ?? cuotasQuery.data?.find(q => q.plan_id === id);
 async function guardarCuota(id: PlanComercialId) {
   const cuota = cuotaActual(id);
   if (!cuota || [cuota.operaciones_comerciales_mes, cuota.almacenamiento_mib, cuota.usos_render_mes, cuota.productos_catalogo_max].some(v => !Number.isInteger(v) || v < -1)) { toast.error("Usa enteros no negativos; -1 significa sin límite."); return; }
   setGuardandoCuota(id);
   try {
     const { error } = await supabase.from("aurum_plan_quotas").update({ operaciones_comerciales_mes: cuota.operaciones_comerciales_mes, almacenamiento_mib: cuota.almacenamiento_mib, usos_render_mes: cuota.usos_render_mes, productos_catalogo_max: cuota.productos_catalogo_max, updated_at: new Date().toISOString() }).eq("plan_id", id);
     if (error) throw error;
     toast.success("Cuotas guardadas");
     setCuotasEdit(prev => { const next = { ...prev }; delete next[id]; return next; });
     await qc.invalidateQueries({ queryKey: ["aurum-plan-quotas"] });
   } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudieron guardar las cuotas"); }
   finally { setGuardandoCuota(null); }
 }
 const lista=useMemo(()=>data.filter(p=>(tipo==="todos"||p.tipo_participante===tipo)&&(estado==="todos"||p.estado===estado)&&(!buscar.trim()||[p.nombre,p.razon_social,p.email,p.ciudad].some(v=>(v??"").toLowerCase().includes(buscar.trim().toLowerCase())))),[data,tipo,estado,buscar]);
 function abrirNuevo(){setEdit(null);setForm({...empty});setNuevo(true)}
 function editar(p:Participante){setNuevo(false);setEdit(p);setForm({tipo_participante:p.tipo_participante,nombre:p.nombre,razon_social:p.razon_social??"",email:p.email??"",telefono:p.telefono??"",ciudad:p.ciudad??"",descripcion:p.descripcion??"",estado:p.estado,notas_owner:p.notas_owner??""})}
 async function asignarPlan(p: Participante, planId: PlanComercialId) {
  if (p.tipo_participante !== "organizacion" || !p.sede_id) {
    toast.error("El plan comercial solo se asigna a organizaciones integradas a un taller.");
    return;
  }
  try {
    const metadata = { ...(p.metadata ?? {}), plan_comercial: planId };
    const { error } = await supabase.from("ecosistema_participantes").update({ metadata }).eq("id", p.id);
    if (error) throw error;
    toast.success("Plan comercial asignado");
    await qc.invalidateQueries({ queryKey: ["ecosistema-participantes"] });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "No se pudo asignar el plan");
  }
 }
 async function guardar(){if(!form.nombre.trim()){toast.error("El nombre es obligatorio");return}setSaving(true);try{const payload={...form,nombre:form.nombre.trim(),razon_social:form.razon_social.trim()||null,email:form.email.trim()||null,telefono:form.telefono.trim()||null,ciudad:form.ciudad.trim()||null,descripcion:form.descripcion.trim()||null,notas_owner:form.notas_owner.trim()||null};const r=edit?supabase.from("ecosistema_participantes").update(payload).eq("id",edit.id):supabase.from("ecosistema_participantes").insert(payload);const {error}=await r;if(error)throw error;toast.success(edit?"Participante actualizado":"Participante creado");setEdit(null);setNuevo(false);await qc.invalidateQueries({queryKey:["ecosistema-participantes"]})}catch(e){toast.error(e instanceof Error?e.message:"No se pudo guardar")}finally{setSaving(false)}}
 async function eliminar(p:Participante){if(!confirm("¿Eliminar a "+p.nombre+"? Esta acción no se puede deshacer."))return;const {error}=await supabase.from("ecosistema_participantes").delete().eq("id",p.id);if(error)toast.error(error.message);else{toast.success("Participante eliminado");await qc.invalidateQueries({queryKey:["ecosistema-participantes"]})}}
 return <div className="space-y-6">
  <details className="overflow-hidden rounded-xl border border-border bg-card">
   <summary className="cursor-pointer list-none px-5 py-4 font-medium hover:bg-muted/40 [&::-webkit-details-marker]:hidden"><span className="flex items-center justify-between gap-3">Cuotas comerciales por plan <span className="text-xs text-muted-foreground">Desplegar / contraer</span></span></summary>
   <div className="space-y-4 border-t border-border p-4">
    <p className="text-xs text-muted-foreground">Configura los límites por plan. El catálogo bloquea altas que superen la cuota en la base de datos; operaciones, almacenamiento y Render aún requieren sus controles. -1 significa sin límite.</p>
    {cuotasQuery.error ? <p className="rounded-lg border border-amber-500/30 p-3 text-xs text-amber-700">Aplica primero el SQL de 20261014193000_aurum_plan_quotas.sql en Supabase.</p> : null}
    <div className="grid gap-3 xl:grid-cols-2">{PLANES_COMERCIALES.map(plan => { const q=cuotaActual(plan.id); return <div key={plan.id} className="rounded-xl border border-border p-4">
     <p className="mb-3 font-semibold">{plan.nombre}</p>
     {q ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{([{key:"productos_catalogo_max",label:"Productos catálogo"},{key:"operaciones_comerciales_mes",label:"Operaciones/mes"},{key:"almacenamiento_mib",label:"Mi Nube MiB"},{key:"usos_render_mes",label:"Render/mes"}] as const).map(f=> <label key={f.key} className="text-[10px] text-muted-foreground">{f.label}<Input type="number" min={-1} step={1} className="mt-1" value={cuotaActual(plan.id)?.[f.key] ?? q[f.key]} onChange={e=>setCuotasEdit(prev=>({...prev,[plan.id]:{...q,...prev[plan.id],[f.key]:Number(e.target.value)}}))}/></label>)}</div> : <p className="text-xs text-muted-foreground">Cuotas no disponibles hasta aplicar el SQL.</p>}
     <div className="mt-3 flex justify-between text-[10px] text-muted-foreground"><span>-1 = sin límite</span><Button size="sm" disabled={!q||guardandoCuota===plan.id} onClick={()=>void guardarCuota(plan.id)}>{guardandoCuota===plan.id?"Guardando…":"Guardar cuotas"}</Button></div>
    </div>})}</div>
   </div>
  </details>
  <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Participantes</p><p className="mt-1 text-2xl font-semibold">{data.length}</p></div><div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Activos</p><p className="mt-1 text-2xl font-semibold">{data.filter(p=>p.estado==="activo").length}</p></div><div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Talento / Prácticas</p><p className="mt-1 text-2xl font-semibold">{data.filter(p=>p.tipo_participante==="talento").length}</p></div></div>
  <Panel titulo="Ecosistema de participantes"><div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row"><Input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar por nombre, empresa, correo o ciudad…" /><select value={tipo} onChange={e=>setTipo(e.target.value as typeof tipo)} className="rounded-md border border-input bg-background px-3 text-sm"><option value="todos">Todos los tipos</option>{Object.entries(tipos).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><select value={estado} onChange={e=>setEstado(e.target.value as typeof estado)} className="rounded-md border border-input bg-background px-3 text-sm"><option value="todos">Todos los estados</option><option value="activo">Activos</option><option value="pausado">Pausados</option><option value="inactivo">Inactivos</option></select><Button onClick={abrirNuevo}>+ Nuevo participante</Button></div>
  {error?<p className="p-6 text-sm text-destructive">No se pudieron cargar los participantes.</p>:null}{isLoading?<p className="p-6 text-sm text-muted-foreground">Cargando…</p>:null}
  <div className="divide-y divide-border">{lista.map(p=><div key={p.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"><div><p className="font-medium">{p.nombre}</p><p className="text-xs text-muted-foreground">{tipos[p.tipo_participante]}{p.razon_social?" · "+p.razon_social:""}{p.ciudad?" · "+p.ciudad:""}</p><p className="mt-1 text-xs text-muted-foreground">{p.email||"Sin correo"}{p.telefono?" · "+p.telefono:""}</p><p className="mt-1 text-[11px] text-muted-foreground">{p.sede_id?"Sede/taller integrada":"Participante externo"}</p>{p.tipo_participante==="organizacion"&&p.sede_id?<div className="mt-2 max-w-xl rounded-lg border border-border bg-surface-muted/40 p-3"><label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Plan comercial del taller<select aria-label={`Plan comercial de ${p.nombre}`} value={obtenerPlanComercial(p.metadata?.["plan_comercial"])?.id ?? "emprendedor"} onChange={e=>void asignarPlan(p,e.target.value as PlanComercialId)} className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground"><option value="emprendedor">Emprendedor · Gratis</option><option value="taller">Taller · S/ 29 al mes</option><option value="profesional">Profesional · S/ 79 al mes</option><option value="empresarial">Empresarial · Precio por definir</option></select></label><p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{obtenerPlanComercial(p.metadata?.["plan_comercial"])?.enfoque ?? "Se asignará Emprendedor si todavía no hay un plan registrado."}</p><p className="mt-1 text-[10px] font-medium text-amber-600">El límite de productos del catálogo sí se valida en base de datos; los demás límites aún están pendientes.</p></div>:null}</div><div className="flex gap-2"><span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold uppercase">{p.estado}</span><Button variant="outline" size="sm" onClick={()=>setCapacidades(p)}>Capacidades</Button><Button variant="outline" size="sm" onClick={()=>setVincular(p)}>Cuentas</Button><Button variant="outline" size="sm" onClick={()=>editar(p)}>Editar</Button><Button variant="ghost" size="sm" onClick={()=>void eliminar(p)}>Eliminar</Button></div></div>)}{!isLoading&&!lista.length?<p className="p-8 text-sm text-muted-foreground">No hay participantes con estos filtros.</p>:null}</div></Panel>
  {capacidades?<AsignadorEspecialidades participante={capacidades} onClose={()=>setCapacidades(null)} />:null}
  {(edit!==null||nuevo)?<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={e=>{if(e.target===e.currentTarget){setEdit(null);setNuevo(false)}}}><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-xl"><div className="border-b border-border p-5"><div className="flex justify-between"><div><p className="text-lg font-semibold">{edit?"Editar participante":"Nuevo participante"}</p><p className="text-xs text-muted-foreground">Solo visible y editable por el Dueño.</p></div><button type="button" onClick={()=>{setEdit(null);setNuevo(false)}}>Cerrar</button></div></div><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Tipo<select value={form.tipo_participante} onChange={e=>setForm({...form,tipo_participante:e.target.value as Tipo})} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{Object.entries(tipos).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label className="text-xs text-muted-foreground">Nombre *<Input className="mt-1" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}/></label><label className="text-xs text-muted-foreground">Empresa / razón social<Input className="mt-1" value={form.razon_social} onChange={e=>setForm({...form,razon_social:e.target.value})}/></label><label className="text-xs text-muted-foreground">Correo<Input className="mt-1" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label className="text-xs text-muted-foreground">Teléfono<Input className="mt-1" value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})}/></label><label className="text-xs text-muted-foreground">Ciudad<Input className="mt-1" value={form.ciudad} onChange={e=>setForm({...form,ciudad:e.target.value})}/></label><label className="text-xs text-muted-foreground sm:col-span-2">Descripción<textarea rows={3} value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} className="mt-1 w-full rounded-md border border-input bg-background p-3 text-sm"/></label><label className="text-xs text-muted-foreground">Estado<select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value as Estado})} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="activo">Activo</option><option value="pausado">Pausado</option><option value="inactivo">Inactivo</option></select></label><label className="text-xs text-muted-foreground">Nota interna<textarea rows={2} value={form.notas_owner} onChange={e=>setForm({...form,notas_owner:e.target.value})} className="mt-1 w-full rounded-md border border-input bg-background p-3 text-sm"/></label></div><div className="flex justify-end gap-2 border-t border-border p-5"><Button variant="outline" onClick={()=>{setEdit(null);setNuevo(false)}}>Cancelar</Button><Button disabled={saving} onClick={()=>void guardar()}>{saving?"Guardando…":"Guardar"}</Button></div></div></div>:null}
 </div>
}