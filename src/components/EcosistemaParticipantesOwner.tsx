import { useMemo, useState } from "react";
import { Eye, EyeOff, Crown, Sparkles, CalendarClock, ShieldCheck, ArrowUpRight, X } from "lucide-react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
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
type Participante={id:string;tipo_participante:Tipo;nombre:string;razon_social:string|null;email:string|null;telefono:string|null;ciudad:string|null;descripcion:string|null;estado:Estado;notas_owner:string|null;sede_id:string|null;metadata?:Record<string,unknown>|null;comunidad_visible:boolean};
const tipos:Record<Tipo,string>={organizacion:"Organización",profesional:"Profesional",vendedor:"Vendedor / Comercializador",proveedor:"Proveedor",servicio:"Servicio especializado",talento:"Talento / Prácticas",institucion_educativa:"Institución educativa"};
const empty={tipo_participante:"profesional" as Tipo,nombre:"",razon_social:"",email:"",telefono:"",ciudad:"",descripcion:"",estado:"activo" as Estado,notas_owner:""};

export function EcosistemaParticipantesOwner(){
 const qc=useQueryClient(); const [vincular,setVincular]=useState<Participante|null>(null); const [capacidades,setCapacidades]=useState<Participante|null>(null); const [buscar,setBuscar]=useState(""); const [tipo,setTipo]=useState<"todos"|Tipo>("todos"); const [estado,setEstado]=useState<"todos"|Estado>("activo"); const [edit,setEdit]=useState<Participante|null>(null); const [form,setForm]=useState(empty); const [nuevo,setNuevo]=useState(false); const [saving,setSaving]=useState(false); const [mejorasAbiertas,setMejorasAbiertas]=useState<string|null>(null);
 const {data=[],isLoading,error}=useQuery({queryKey:["ecosistema-participantes"],staleTime:5*60_000,queryFn:async()=>{const {data,error}=await supabase.from("ecosistema_participantes").select("id,tipo_participante,nombre,razon_social,email,telefono,ciudad,descripcion,estado,notas_owner,sede_id,metadata,comunidad_visible").order("nombre");if(error)throw error;return(data??[]) as Participante[]}});
 type CuotaPlan = { plan_id: PlanComercialId; operaciones_comerciales_mes: number; almacenamiento_mib: number; usos_render_mes: number; productos_catalogo_max: number; carpetas_mi_nube_max: number };
 const [cuotasEdit, setCuotasEdit] = useState<Record<string, CuotaPlan>>({});
 const [guardandoCuota, setGuardandoCuota] = useState<string | null>(null);
 const cuotasQuery = useQuery({ queryKey: ["aurum-plan-quotas"], staleTime: 60_000, queryFn: async () => {
   const { data, error } = await supabase.from("aurum_plan_quotas").select("plan_id,operaciones_comerciales_mes,almacenamiento_mib,usos_render_mes,productos_catalogo_max,carpetas_mi_nube_max").order("plan_id");
   if (error) throw error;
   return (data ?? []) as CuotaPlan[];
 }});
 const cuotaActual = (id: PlanComercialId) => cuotasEdit[id] ?? cuotasQuery.data?.find(q => q.plan_id === id);
 const talleresConCatalogo = useMemo(() => data.filter(p => p.tipo_participante === "organizacion" && Boolean(p.sede_id)), [data]);
 const consumoCatalogoQueries = useQueries({
  queries: talleresConCatalogo.map(p => ({
   queryKey: ["owner-catalogo-consumo", p.id],
   queryFn: async () => {
    const { data, error } = await supabase.rpc("aurum_contar_productos_catalogo_owner", { p_participante_id: p.id });
    if (error) throw error;
    if (typeof data !== "number" || !Number.isInteger(data) || data < 0) {
     throw new Error("El contador seguro del catálogo no está disponible. Aplica la migración de medición de cuotas.");
    }
    return data;
   },
   staleTime: 60_000,
  })),
 });
 const consumoCatalogoPorParticipante = useMemo(() => new Map(talleresConCatalogo.map((p, index) => [p.id, consumoCatalogoQueries[index]])), [talleresConCatalogo, consumoCatalogoQueries]);
 type ConsumoMiNube = { carpetas_propias: number; bytes_propios: number; carpetas_compartidas: number; bytes_compartidos: number };
 const consumoMiNubeQueries = useQueries({
  queries: talleresConCatalogo.map(p => ({
   queryKey: ["owner-mi-nube-consumo", p.id],
   queryFn: async (): Promise<ConsumoMiNube> => {
    const { data, error } = await supabase.rpc("aurum_resumen_mi_nube_owner", { p_participante_id: p.id });
    if (error) throw error;
    const fila = Array.isArray(data) ? data[0] : data;
    if (!fila || !Number.isInteger(fila.carpetas_propias) || !Number.isFinite(Number(fila.bytes_propios)) ||
        !Number.isInteger(fila.carpetas_compartidas) || !Number.isFinite(Number(fila.bytes_compartidos)) ||
        Number(fila.carpetas_propias) < 0 || Number(fila.bytes_propios) < 0 ||
        Number(fila.carpetas_compartidas) < 0 || Number(fila.bytes_compartidos) < 0) {
      throw new Error("El resumen seguro de Mi Nube no está disponible. Aplica el SQL de medición de Mi Nube.");
    }
    return {
      carpetas_propias: Number(fila.carpetas_propias),
      bytes_propios: Number(fila.bytes_propios),
      carpetas_compartidas: Number(fila.carpetas_compartidas),
      bytes_compartidos: Number(fila.bytes_compartidos),
    };
   },
   staleTime: 60_000,
  })),
 });
 const consumoMiNubePorParticipante = useMemo(() => new Map(talleresConCatalogo.map((p, index) => [p.id, consumoMiNubeQueries[index]])), [talleresConCatalogo, consumoMiNubeQueries]);
 const formatoEspacioMiNube = (bytes: number) => bytes < 1024 * 1024
  ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  : bytes < 1024 * 1024 * 1024
   ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
   : `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
 async function guardarCuota(id: PlanComercialId) {
   const cuota = cuotaActual(id);
   if (!cuota || [cuota.operaciones_comerciales_mes, cuota.almacenamiento_mib, cuota.productos_catalogo_max, cuota.carpetas_mi_nube_max].some(v => !Number.isInteger(v) || v < -1)) { toast.error("Usa enteros no negativos; -1 significa sin límite."); return; }
   setGuardandoCuota(id);
   try {
     const { error } = await supabase.from("aurum_plan_quotas").update({ operaciones_comerciales_mes: cuota.operaciones_comerciales_mes, almacenamiento_mib: cuota.almacenamiento_mib, productos_catalogo_max: cuota.productos_catalogo_max, carpetas_mi_nube_max: cuota.carpetas_mi_nube_max, updated_at: new Date().toISOString() } as { updated_at: string }).eq("plan_id", id);
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
 async function cambiarVisibilidadComunidad(p: Participante) {
  const nuevoValor = p.comunidad_visible === false;
  try {
    const { error } = await (supabase as any)
      .from("ecosistema_participantes")
      .update({ comunidad_visible: nuevoValor })
      .eq("id", p.id);
    if (error) throw error;
    toast.success(nuevoValor ? "Participante visible en Comunidad" : "Participante oculto de Comunidad");
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["ecosistema-participantes"] }),
      qc.invalidateQueries({ queryKey: ["directorio-comunidad-publica"] }),
    ]);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "No se pudo cambiar la visibilidad. Comprueba que hayas aplicado el SQL de Comunidad.");
  }
 }
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
 async function guardar(){if(!form.nombre.trim()){toast.error("El nombre es obligatorio");return}setSaving(true);try{const payload={...form,nombre:form.nombre.trim(),razon_social:form.razon_social.trim()||null,email:form.email.trim()||null,telefono:form.telefono.trim()||null,ciudad:form.ciudad.trim()||null,descripcion:form.descripcion.trim()||null,notas_owner:form.notas_owner.trim()||null};const r=edit?supabase.from("ecosistema_participantes").update(payload).eq("id",edit.id):supabase.from("ecosistema_participantes").insert(payload);const {error}=await r;if(error)throw error;toast.success(edit?"Participante actualizado":"Participante creado");setEdit(null);setNuevo(false);await Promise.all([qc.invalidateQueries({queryKey:["ecosistema-participantes"]}),qc.invalidateQueries({queryKey:["sedes"]})])}catch(e){toast.error(e instanceof Error?e.message:"No se pudo guardar")}finally{setSaving(false)}}
 async function eliminar(p:Participante){if(!confirm("¿Eliminar a "+p.nombre+"? Esta acción no se puede deshacer."))return;const {error}=await supabase.from("ecosistema_participantes").delete().eq("id",p.id);if(error)toast.error(error.message);else{toast.success("Participante eliminado");await Promise.all([qc.invalidateQueries({queryKey:["ecosistema-participantes"]}),qc.invalidateQueries({queryKey:["sedes"]})])}}
 return <div className="space-y-6">
  <details className="overflow-hidden rounded-xl border border-border bg-card">
   <summary className="cursor-pointer list-none px-5 py-4 font-medium hover:bg-muted/40 [&::-webkit-details-marker]:hidden"><span className="flex items-center justify-between gap-3">Cuotas comerciales por plan <span className="text-xs text-muted-foreground">Desplegar / contraer</span></span></summary>
   <div className="space-y-4 border-t border-border p-4">
    <p className="text-xs text-muted-foreground">Configura los límites por plan. El almacenamiento se introduce en GB y se guarda internamente en MiB. La capacidad de Render se gestionará junto con las carpetas de Mi Nube, no mediante una cuota mensual independiente. -1 significa sin límite.</p>
    {cuotasQuery.error ? <p className="rounded-lg border border-amber-500/30 p-3 text-xs text-amber-700">Aplica primero el SQL de 20261014193000_aurum_plan_quotas.sql en Supabase.</p> : null}
    <div className="grid gap-3 xl:grid-cols-2">{PLANES_COMERCIALES.map(plan => { const q=cuotaActual(plan.id); return <div key={plan.id} className="rounded-xl border border-border p-4">
     <p className="mb-3 font-semibold">{plan.nombre}</p>
     {q ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">{([{key:"productos_catalogo_max",label:"Productos catálogo"},{key:"operaciones_comerciales_mes",label:"Operaciones/mes"},{key:"almacenamiento_mib",label:"Almacenamiento (GB)"},{key:"carpetas_mi_nube_max",label:"Carpetas Mi Nube"}] as const).map(f=> { const valorActual = cuotaActual(plan.id)?.[f.key] ?? q[f.key]; const esAlmacenamiento = f.key === "almacenamiento_mib"; return <label key={f.key} className="text-[10px] text-muted-foreground">{f.label}<Input type="number" min={-1} step={esAlmacenamiento ? 0.1 : 1} className="mt-1" value={esAlmacenamiento && valorActual >= 0 ? Number((valorActual / 1024).toFixed(2)) : valorActual} onChange={e=>{ const valor = Number(e.target.value); const valorGuardado = esAlmacenamiento && valor >= 0 ? Math.round(valor * 1024) : valor; setCuotasEdit(prev=>({...prev,[plan.id]:{...q,...prev[plan.id],[f.key]:valorGuardado}})); }}/></label>})}</div> : <p className="text-xs text-muted-foreground">Cuotas no disponibles hasta aplicar el SQL.</p>}
     <div className="mt-3 flex justify-between text-[10px] text-muted-foreground"><span>-1 = sin límite</span><Button size="sm" disabled={!q||guardandoCuota===plan.id} onClick={()=>void guardarCuota(plan.id)}>{guardandoCuota===plan.id?"Guardando…":"Guardar cuotas"}</Button></div>
    </div>})}</div>
   </div>
  </details>
  <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Participantes</p><p className="mt-1 text-2xl font-semibold">{data.length}</p></div><div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Activos</p><p className="mt-1 text-2xl font-semibold">{data.filter(p=>p.estado==="activo").length}</p></div><div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Talento / Prácticas</p><p className="mt-1 text-2xl font-semibold">{data.filter(p=>p.tipo_participante==="talento").length}</p></div></div>
  <Panel titulo="Ecosistema de participantes"><div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row"><Input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar por nombre, empresa, correo o ciudad…" /><select value={tipo} onChange={e=>setTipo(e.target.value as typeof tipo)} className="rounded-md border border-input bg-background px-3 text-sm"><option value="todos">Todos los tipos</option>{Object.entries(tipos).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><select value={estado} onChange={e=>setEstado(e.target.value as typeof estado)} className="rounded-md border border-input bg-background px-3 text-sm"><option value="todos">Todos los estados</option><option value="activo">Activos</option><option value="pausado">Pausados</option><option value="inactivo">Inactivos</option></select><Button onClick={abrirNuevo}>+ Nuevo participante</Button></div>
  {error?<p className="p-6 text-sm text-destructive">No se pudieron cargar los participantes.</p>:null}{isLoading?<p className="p-6 text-sm text-muted-foreground">Cargando…</p>:null}
  <div className="divide-y divide-border">{lista.map(p=><div key={p.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"><div><p className="font-medium">{p.nombre}</p><p className="text-xs text-muted-foreground">{tipos[p.tipo_participante]}{p.razon_social?" · "+p.razon_social:""}{p.ciudad?" · "+p.ciudad:""}</p><p className="mt-1 text-xs text-muted-foreground">{p.email||"Sin correo"}{p.telefono?" · "+p.telefono:""}</p><p className="mt-1 text-[11px] text-muted-foreground">{p.sede_id?"Sede/taller integrada":"Participante externo"}</p>{p.tipo_participante==="organizacion"&&p.sede_id?<div className="mt-2 max-w-xl space-y-3"><div className="overflow-hidden rounded-2xl border border-[#c5a24a]/40 bg-gradient-to-br from-[#fffdf8] via-[#f8f4e9] to-[#eee5d1] p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#e8dcc0] text-[#98762e]"><Crown className="size-6"/></div><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#9a7833]">Membresía AURUM LAB</p><p className="mt-0.5 text-lg font-bold tracking-tight text-[#252b30]">{obtenerPlanComercial(p.metadata?.["plan_comercial"])?.nombre ?? "Emprendedor"}</p><p className="text-xs text-[#6e6a61]">{obtenerPlanComercial(p.metadata?.["plan_comercial"])?.precioEtiqueta ?? "Gratis"}</p></div></div><span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-emerald-700"><ShieldCheck className="size-3"/> {p.estado==="activo"?"Activo":p.estado}</span></div><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl border border-[#e4dac4] bg-white/70 p-2.5"><p className="text-[9px] uppercase tracking-wider text-[#8a8375]">Catálogo</p><p className="mt-1 text-sm font-semibold text-[#292824] tabular-nums">{consumoCatalogoPorParticipante.get(p.id)?.isLoading?"…":consumoCatalogoPorParticipante.get(p.id)?.isError?"—":consumoCatalogoPorParticipante.get(p.id)?.data??0} <span className="text-xs font-normal text-muted-foreground">/ {(cuotaActual(obtenerPlanComercial(p.metadata?.["plan_comercial"])?.id??"emprendedor")?.productos_catalogo_max??-1)<0?"∞":cuotaActual(obtenerPlanComercial(p.metadata?.["plan_comercial"])?.id??"emprendedor")?.productos_catalogo_max}</span></p></div><div className="rounded-xl border border-[#e4dac4] bg-white/70 p-2.5"><p className="text-[9px] uppercase tracking-wider text-[#8a8375]">Mi Nube</p><p className="mt-1 text-sm font-semibold text-[#292824] tabular-nums">{consumoMiNubePorParticipante.get(p.id)?.isLoading?"Calculando…":consumoMiNubePorParticipante.get(p.id)?.isError?"No disponible":formatoEspacioMiNube(consumoMiNubePorParticipante.get(p.id)?.data?.bytes_propios??0)} <span className="text-xs font-normal text-muted-foreground">/ {(()=>{const q=cuotaActual(obtenerPlanComercial(p.metadata?.["plan_comercial"])?.id??"emprendedor")?.almacenamiento_mib;return q===undefined?"—":q<0?"∞":formatoEspacioMiNube(q*1024*1024)})()}</span></p></div></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] text-[#77756f]"><CalendarClock className="mr-1 inline size-3"/> Renovación: no registrada</p><Button size="sm" variant="outline" className="border-[#c5a24a]/50 bg-white/70 text-[#806325] hover:bg-[#f3ead6]" onClick={()=>setMejorasAbiertas(p.id)}><Sparkles className="mr-1.5 size-3.5"/> Explorar mejoras <ArrowUpRight className="ml-1 size-3"/></Button></div></div><div className="rounded-xl border border-border bg-surface-muted/40 p-3"><label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Administrar plan comercial<select aria-label={`Plan comercial de ${p.nombre}`} value={obtenerPlanComercial(p.metadata?.["plan_comercial"])?.id ?? "emprendedor"} onChange={e=>void asignarPlan(p,e.target.value as PlanComercialId)} className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground"><option value="emprendedor">Emprendedor · Gratis</option><option value="taller">Taller · S/ 29 al mes</option><option value="profesional">Profesional · S/ 79 al mes</option><option value="empresarial">Empresarial · Precio por definir</option></select></label><p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{obtenerPlanComercial(p.metadata?.["plan_comercial"])?.enfoque ?? "Se asignará Emprendedor si todavía no hay un plan registrado."}</p><div className="mt-3 rounded-lg border border-border bg-background p-3">
 <div className="flex items-center justify-between gap-3 text-xs">
  <span className="font-medium">Productos del catálogo</span>
  <span className="font-semibold tabular-nums">{consumoCatalogoPorParticipante.get(p.id)?.isLoading ? "Calculando…" : consumoCatalogoPorParticipante.get(p.id)?.isError ? "No disponible" : `${consumoCatalogoPorParticipante.get(p.id)?.data ?? 0} / ${(cuotaActual(obtenerPlanComercial(p.metadata?.["plan_comercial"])?.id ?? "emprendedor")?.productos_catalogo_max ?? -1) < 0 ? "Ilimitado" : cuotaActual(obtenerPlanComercial(p.metadata?.["plan_comercial"])?.id ?? "emprendedor")?.productos_catalogo_max}`}</span>
 </div>
 {(() => {
  const uso = consumoCatalogoPorParticipante.get(p.id);
  const limite = cuotaActual(obtenerPlanComercial(p.metadata?.["plan_comercial"])?.id ?? "emprendedor")?.productos_catalogo_max;
  const actual = uso?.data ?? 0;
  const pct = limite === undefined || limite < 0 ? 0 : Math.min(100, Math.round(actual / Math.max(1, limite) * 100));
  if (limite === undefined || limite < 0) return <p className="mt-1.5 text-[10px] text-muted-foreground">{limite === undefined ? "Límite no configurado." : "Sin límite fijo de productos."}</p>;
  return <><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`Uso del catálogo de ${p.nombre}`} aria-valuemin={0} aria-valuemax={limite || 1} aria-valuenow={Math.min(actual, limite)}><div className={`h-full rounded-full ${pct >= 90 ? "bg-amber-500" : "bg-gold"}`} style={{ width: `${pct}%` }} /></div><p className="mt-1.5 text-[10px] text-muted-foreground">{pct}% utilizado · {Math.max(0, limite - actual)} disponibles</p></>;
 })()}
 <div className="mt-3 grid gap-2 sm:grid-cols-2">
  {(() => {
   const uso = consumoMiNubePorParticipante.get(p.id);
   const resumen = uso?.data;
   const noDisponible = uso?.isError ? "No disponible" : uso?.isLoading || !resumen ? "Calculando…" : null;
   return <>
    <section className="rounded-lg border border-border bg-background p-3">
     <p className="text-xs font-semibold">Mis archivos</p>
     <div className="mt-2 flex items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">Carpetas propias</span><span className="font-semibold tabular-nums">{noDisponible ?? resumen?.carpetas_propias}</span></div>
     <div className="mt-1 flex items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">Espacio ocupado</span><span className="font-semibold tabular-nums">{noDisponible ?? formatoEspacioMiNube(resumen!.bytes_propios)}</span></div>
     {(() => {
      const planId = obtenerPlanComercial(p.metadata?.["plan_comercial"])?.id ?? "emprendedor";
      const limiteMiB = cuotaActual(planId)?.almacenamiento_mib;
      if (noDisponible) return <p className="mt-2 text-[10px] text-muted-foreground">Capacidad disponible: {noDisponible}</p>;
      if (limiteMiB === undefined) return <p className="mt-2 text-[10px] text-muted-foreground">Capacidad del plan no configurada.</p>;
      if (limiteMiB < 0) return <p className="mt-2 text-[10px] text-muted-foreground">Capacidad del plan: ilimitada.</p>;
      const limiteBytes = limiteMiB * 1024 * 1024;
      const usadosBytes = resumen?.bytes_propios ?? 0;
      const restanteBytes = Math.max(0, limiteBytes - usadosBytes);
      const pct = Math.min(100, Math.round(usadosBytes / Math.max(1, limiteBytes) * 100));
      return <>
       <div className="mt-2 flex items-center justify-between gap-2 text-[10px]"><span className="text-muted-foreground">Capacidad del plan</span><span className="font-semibold tabular-nums">{formatoEspacioMiNube(limiteBytes)}</span></div>
       <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`Uso de almacenamiento de ${p.nombre}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className={`h-full rounded-full ${pct >= 90 ? "bg-amber-500" : "bg-gold"}`} style={{ width: `${pct}%` }} />
       </div>
       <p className="mt-1.5 text-[10px] text-muted-foreground">{pct}% utilizado · {formatoEspacioMiNube(restanteBytes)} disponibles</p>
      </>;
     })()}
    </section>
    <section className="rounded-lg border border-border bg-background p-3">
     <p className="text-xs font-semibold">Carpetas compartidas conmigo</p>
     <div className="mt-2 flex items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">Carpetas recibidas</span><span className="font-semibold tabular-nums">{noDisponible ?? resumen?.carpetas_compartidas}</span></div>
     <div className="mt-1 flex items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">Espacio compartido accesible</span><span className="font-semibold tabular-nums">{noDisponible ?? formatoEspacioMiNube(resumen!.bytes_compartidos)}</span></div>
    </section>
   </>;
  })()}
 </div>
</div></div>:null}</div><div className="flex gap-2"><span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold uppercase">{p.estado}</span><Button variant="outline" size="sm" onClick={()=>void cambiarVisibilidadComunidad(p)} title={p.comunidad_visible===false?"Mostrar en Comunidad":"Ocultar de Comunidad"}>{p.comunidad_visible===false?<Eye className="mr-1 size-3.5"/>:<EyeOff className="mr-1 size-3.5"/>}{p.comunidad_visible===false?"Mostrar en Comunidad":"Ocultar de Comunidad"}</Button><Button variant="outline" size="sm" onClick={()=>setCapacidades(p)}>Capacidades</Button><Button variant="outline" size="sm" onClick={()=>setVincular(p)}>Cuentas</Button><Button variant="outline" size="sm" onClick={()=>editar(p)}>Editar</Button><Button variant="ghost" size="sm" onClick={()=>void eliminar(p)}>Eliminar</Button></div></div>)}{!isLoading&&!lista.length?<p className="p-8 text-sm text-muted-foreground">No hay participantes con estos filtros.</p>:null}</div></Panel>
  {mejorasAbiertas?(()=>{const cliente=data.find(x=>x.id===mejorasAbiertas);const plan=obtenerPlanComercial(cliente?.metadata?.["plan_comercial"]);return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onMouseDown={e=>{if(e.target===e.currentTarget)setMejorasAbiertas(null)}}><div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#c5a24a]/30 bg-card shadow-2xl"><div className="relative overflow-hidden bg-gradient-to-br from-[#182630] via-[#233641] to-[#101a22] p-5 text-white"><button type="button" aria-label="Cerrar mejoras" onClick={()=>setMejorasAbiertas(null)} className="absolute right-3 top-3 rounded-lg p-1.5 text-white/70 hover:bg-white/10"><X className="size-4"/></button><div className="flex items-center gap-2 text-[#d8b967]"><Sparkles className="size-4"/><span className="text-[10px] font-semibold uppercase tracking-[.2em]">AURUM LAB · Upgrade</span></div><h2 className="mt-2 text-xl font-semibold tracking-tight">Haz crecer tu taller</h2><p className="mt-1 max-w-sm text-xs leading-relaxed text-white/70">Revisa tu membresía actual y las opciones para ampliar las capacidades de tu taller.</p></div><div className="space-y-3 p-4"><div className="rounded-xl border border-[#c5a24a]/40 bg-[#faf6eb] p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-[#98762e]">Plan actual</p><div className="mt-1 flex items-center justify-between gap-3"><div><p className="font-semibold text-[#252b30]">{plan?.nombre??"Emprendedor"}</p><p className="text-xs text-muted-foreground">{plan?.precioEtiqueta??"Gratis"}</p></div><Crown className="size-5 text-[#b18a38]"/></div></div><p className="text-xs text-muted-foreground">Los planes y mejoras disponibles se presentan aquí. No se realizará ningún cambio de plan sin autorización del administrador.</p><div className="grid gap-2 sm:grid-cols-2"><div className="rounded-xl border p-3"><p className="text-sm font-medium">Más capacidad</p><p className="mt-1 text-xs text-muted-foreground">Ampliación de catálogo y almacenamiento, según el plan.</p></div><div className="rounded-xl border p-3"><p className="text-sm font-medium">Nuevas herramientas</p><p className="mt-1 text-xs text-muted-foreground">Acceso a módulos y capacidades que se incorporen a AURUM LAB.</p></div></div><div className="flex justify-end"><Button variant="outline" onClick={()=>setMejorasAbiertas(null)}>Cerrar</Button></div></div></div></div>})():null}
  {capacidades?<AsignadorEspecialidades participante={capacidades} onClose={()=>setCapacidades(null)} />:null}
  {(edit!==null||nuevo)?<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={e=>{if(e.target===e.currentTarget){setEdit(null);setNuevo(false)}}}><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-xl"><div className="border-b border-border p-5"><div className="flex justify-between"><div><p className="text-lg font-semibold">{edit?"Editar participante":"Nuevo participante"}</p><p className="text-xs text-muted-foreground">Solo visible y editable por el Dueño.</p></div><button type="button" onClick={()=>{setEdit(null);setNuevo(false)}}>Cerrar</button></div></div><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Tipo<select value={form.tipo_participante} onChange={e=>setForm({...form,tipo_participante:e.target.value as Tipo})} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{Object.entries(tipos).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label className="text-xs text-muted-foreground">Nombre *<Input className="mt-1" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}/></label><label className="text-xs text-muted-foreground">Empresa / razón social<Input className="mt-1" value={form.razon_social} onChange={e=>setForm({...form,razon_social:e.target.value})}/></label><label className="text-xs text-muted-foreground">Correo<Input className="mt-1" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label className="text-xs text-muted-foreground">Teléfono<Input className="mt-1" value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})}/></label><label className="text-xs text-muted-foreground">Ciudad<Input className="mt-1" value={form.ciudad} onChange={e=>setForm({...form,ciudad:e.target.value})}/></label><label className="text-xs text-muted-foreground sm:col-span-2">Descripción<textarea rows={3} value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} className="mt-1 w-full rounded-md border border-input bg-background p-3 text-sm"/></label><label className="text-xs text-muted-foreground">Estado<select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value as Estado})} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="activo">Activo</option><option value="pausado">Pausado</option><option value="inactivo">Inactivo</option></select></label><label className="text-xs text-muted-foreground">Nota interna<textarea rows={2} value={form.notas_owner} onChange={e=>setForm({...form,notas_owner:e.target.value})} className="mt-1 w-full rounded-md border border-input bg-background p-3 text-sm"/></label></div><div className="flex justify-end gap-2 border-t border-border p-5"><Button variant="outline" onClick={()=>{setEdit(null);setNuevo(false)}}>Cancelar</Button><Button disabled={saving} onClick={()=>void guardar()}>{saving?"Guardando…":"Guardar"}</Button></div></div></div>:null}
 </div>
}