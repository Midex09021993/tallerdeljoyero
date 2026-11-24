import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, Clock3, Video, Plus, CheckCircle2, XCircle, CalendarCheck, UserRound, Building2, RefreshCw, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Aurum Lab" }] }),
  component: AgendaPage,
});

type Horario = { id: string; inicio_at: string; fin_at: string; zona_horaria: string; };
type DiaDisponibilidad = { fecha: string; disponible: boolean };
type Evento = { id: string; titulo: string; tipo: "reunion" | "capacitacion" | "evento" | "bloqueo" | "vacaciones" | "otro"; descripcion: string | null; inicio_at: string; fin_at: string; todo_el_dia: boolean; };
type SolicitudDemo = { id: string; empresa: string; nombre: string; telefono: string; email: string; interes: string; horario_preferido: string | null; estado: "pendiente" | "contactado" | "demo_agendada" | "cerrado"; created_at: string; fecha_reunion_at: string | null; };
type Reserva = {
  id: string; horario_id: string; tema: string; descripcion: string | null; estado: "pendiente" | "confirmada" | "cancelada" | "realizada";
  enlace_reunion: string | null; nota_administrador: string | null; created_at: string; inicio_at: string; fin_at: string;
  solicitante_nombre: string; taller_nombre: string; solicitante_id: string;
};
const db = supabase as any;
const temas = ["Configuración inicial de la plataforma", "Gestión de clientes, cotizaciones y pedidos", "Catálogo digital y visor 3D", "AURUM RENDER y herramientas de diseño", "Mi Nube y archivos", "Capacitación general", "Otra consulta"];
const tipoEventoLabel: Record<Evento["tipo"], string> = { reunion: "Reunión", capacitacion: "Capacitación", evento: "Evento", bloqueo: "Bloqueo", vacaciones: "Vacaciones", otro: "Otro" };
const estadoLabel: Record<Reserva["estado"], string> = { pendiente: "Pendiente", confirmada: "Confirmada", cancelada: "Cancelada", realizada: "Realizada" };
const estadoClass: Record<Reserva["estado"], string> = {
  pendiente: "border-amber-300 bg-amber-50 text-amber-800",
  confirmada: "border-emerald-300 bg-emerald-50 text-emerald-800",
  cancelada: "border-border bg-muted text-muted-foreground",
  realizada: "border-sky-300 bg-sky-50 text-sky-800",
};
function fechaHora(value: string) {
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
function fechaLocal(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}
function AgendaPage() {
  const { data: sesion } = useSesion();
  const qc = useQueryClient();
  const esAdministrador = Boolean(sesion?.esDueno && (sesion.participante?.nombre.trim().toLocaleLowerCase("es") === "fadilab" || sesion.participantes.some((p) => p.nombre.trim().toLocaleLowerCase("es") === "fadilab")));
  const [horarioSeleccionado, setHorarioSeleccionado] = useState("");
  const [tema, setTema] = useState(temas[0]);
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState(() => fechaLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)).slice(0, 10));
  const [horaInicio, setHoraInicio] = useState("10:00");
  const [horaFin, setHoraFin] = useState("10:30");
  const [filtro, setFiltro] = useState<"todas" | "pendiente" | "confirmada" | "realizada">("todas");
  const [mesVisible, setMesVisible] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [eventoTitulo, setEventoTitulo] = useState("");
  const [eventoTipo, setEventoTipo] = useState<Evento["tipo"]>("reunion");
  const [eventoDescripcion, setEventoDescripcion] = useState("");
  const [eventoInicio, setEventoInicio] = useState("09:00");
  const [eventoFin, setEventoFin] = useState("10:00");
  const [mostrarFormularioEvento, setMostrarFormularioEvento] = useState(false);
  const [mostrarPublicacionHorarios, setMostrarPublicacionHorarios] = useState(false);

  const horarios = useQuery<Horario[]>({
    queryKey: ["agenda-horarios"],
    enabled: Boolean(sesion?.user.id),
    queryFn: async () => {
      const { data, error } = await db.rpc("agenda_listar_horarios");
      if (error) throw error;
      return (data ?? []) as Horario[];
    },
  });
  const inicioMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1);
  const finMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 1);
  const diasDisponibilidad = useQuery<DiaDisponibilidad[]>({
    queryKey: ["agenda-dias-disponibilidad", mesVisible.getFullYear(), mesVisible.getMonth()],
    enabled: Boolean(sesion?.user.id && esAdministrador),
    queryFn: async () => {
      const desde = [inicioMes.getFullYear(), String(inicioMes.getMonth() + 1).padStart(2, "0"), "01"].join("-");
      const hasta = [finMes.getFullYear(), String(finMes.getMonth() + 1).padStart(2, "0"), "01"].join("-");
      const { data, error } = await db.rpc("agenda_listar_dias_disponibilidad", { _desde: desde, _hasta: hasta });
      if (error) throw error;
      return (data ?? []) as DiaDisponibilidad[];
    },
  });
  const eventos = useQuery<Evento[]>({
    queryKey: ["agenda-eventos", mesVisible.getFullYear(), mesVisible.getMonth()],
    enabled: Boolean(sesion?.user.id && esAdministrador),
    queryFn: async () => {
      const { data, error } = await db.rpc("agenda_listar_eventos", { _desde: inicioMes.toISOString(), _hasta: finMes.toISOString() });
      if (error) throw error;
      return (data ?? []) as Evento[];
    },
  });
  const solicitudesDemo = useQuery<SolicitudDemo[]>({
    queryKey: ["agenda-solicitudes-demo"],
    enabled: Boolean(sesion?.user.id && esAdministrador),
    queryFn: async () => {
      const { data, error } = await db.rpc("agenda_listar_solicitudes_demo");
      if (error) throw error;
      return (data ?? []) as SolicitudDemo[];
    },
    refetchInterval: 30_000,
  });
  const reservas = useQuery<Reserva[]>({
    queryKey: ["agenda-reservas", sesion?.user.id, esAdministrador],
    enabled: Boolean(sesion?.user.id),
    queryFn: async () => {
      const { data, error } = await db.rpc("agenda_listar_reservas");
      if (error) throw error;
      return (data ?? []) as Reserva[];
    },
  });
  const invalidar = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["agenda-horarios"] }),
      qc.invalidateQueries({ queryKey: ["agenda-dias-disponibilidad"] }),
      qc.invalidateQueries({ queryKey: ["agenda-reservas"] }),
      qc.invalidateQueries({ queryKey: ["agenda-eventos"] }),
      qc.invalidateQueries({ queryKey: ["agenda-solicitudes-demo"] }),
    ]);
  };
  const reservar = useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc("agenda_reservar", { _horario_id: horarioSeleccionado, _tema: tema, _descripcion: descripcion.trim() || null });
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Solicitud enviada", { description: "El administrador revisará tu solicitud y confirmará la asesoría." }); setHorarioSeleccionado(""); setDescripcion(""); await invalidar(); },
    onError: (error: Error) => toast.error("No se pudo reservar", { description: error.message }),
  });
  const cambiarDisponibilidadDia = useMutation({
    mutationFn: async (disponible: boolean) => {
      const { error } = await db.rpc("agenda_establecer_disponibilidad_dia", {
        _fecha: fechaSeleccionada,
        _disponible: disponible,
      });
      if (error) throw error;
    },
    onSuccess: async (_data, disponible) => {
      toast.success(disponible ? "Día habilitado" : "Día bloqueado", {
        description: disponible
          ? "Ahora puedes publicar horarios para este día."
          : "No se ofrecerán nuevos horarios de este día. Las reservas existentes se conservan.",
      });
      await invalidar();
    },
    onError: (error: Error) => toast.error("No se pudo actualizar el día", { description: error.message }),
  });
  const crearHorario = useMutation({
    mutationFn: async () => {
      const fechaBloque = esAdministrador ? fechaSeleccionada : fecha;
      const inicio = new Date(`${fechaBloque}T${horaInicio}:00`);
      const fin = new Date(`${fechaBloque}T${horaFin}:00`);
      if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(fin.getTime()) || fin <= inicio || inicio <= new Date()) throw new Error("Selecciona una fecha futura y una hora final posterior a la inicial.");
      const { error } = await db.rpc("agenda_crear_horario", { _inicio_at: inicio.toISOString(), _fin_at: fin.toISOString(), _zona_horaria: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Lima" });
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Horario publicado"); await invalidar(); },
    onError: (error: Error) => toast.error("No se pudo crear el horario", { description: error.message }),
  });
  const crearEvento = useMutation({
    mutationFn: async () => {
      const inicio = new Date(`${fechaSeleccionada}T${eventoInicio}:00`);
      const fin = new Date(`${fechaSeleccionada}T${eventoFin}:00`);
      if (eventoTitulo.trim().length < 3) throw new Error("Escribe un título de al menos 3 caracteres.");
      if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(fin.getTime()) || fin <= inicio || inicio <= new Date()) throw new Error("Selecciona un horario futuro y una hora final posterior.");
      const { error } = await db.rpc("agenda_crear_evento", { _titulo: eventoTitulo.trim(), _tipo: eventoTipo, _descripcion: eventoDescripcion.trim() || null, _inicio_at: inicio.toISOString(), _fin_at: fin.toISOString(), _todo_el_dia: false });
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Evento agregado al calendario", { description: "Ese bloque ya no estará disponible para asesorías." }); setEventoTitulo(""); setEventoDescripcion(""); setMostrarFormularioEvento(false); await invalidar(); },
    onError: (error: Error) => toast.error("No se pudo agregar el evento", { description: error.message }),
  });
  const eliminarEvento = useMutation({
    mutationFn: async (id: string) => { const { error } = await db.rpc("agenda_eliminar_evento", { _evento_id: id }); if (error) throw error; },
    onSuccess: async () => { toast.success("Evento eliminado"); await invalidar(); },
    onError: (error: Error) => toast.error("No se pudo eliminar el evento", { description: error.message }),
  });
  const actualizarReserva = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: Reserva["estado"] }) => {
      const { error } = await db.rpc("agenda_actualizar_reserva", { _reserva_id: id, _estado: estado, _enlace_reunion: null, _nota_administrador: null });
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Reserva actualizada"); await invalidar(); },
    onError: (error: Error) => toast.error("No se pudo actualizar", { description: error.message }),
  });
  const actualizarSolicitudDemo = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: SolicitudDemo["estado"] }) => {
      const { error } = await db.rpc("agenda_actualizar_solicitud_demo", { _solicitud_id: id, _estado: estado });
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Solicitud actualizada"); await qc.invalidateQueries({ queryKey: ["agenda-solicitudes-demo"] }); },
    onError: (error: Error) => toast.error("No se pudo actualizar la solicitud", { description: error.message }),
  });
  const cancelar = useMutation({
    mutationFn: async (id: string) => { const { error } = await db.rpc("agenda_cancelar_reserva", { _reserva_id: id }); if (error) throw error; },
    onSuccess: async () => { toast.success("Solicitud cancelada"); await invalidar(); },
    onError: (error: Error) => toast.error("No se pudo cancelar", { description: error.message }),
  });

  const misReservas = useMemo(() => (reservas.data ?? []).filter((r) => esAdministrador || r.solicitante_id === sesion?.user.id), [reservas.data, esAdministrador, sesion?.user.id]);
  const reservasFiltradas = misReservas.filter((r) => filtro === "todas" || r.estado === filtro);
  const horariosFuturos = (horarios.data ?? []).filter((h) => new Date(h.inicio_at) > new Date());
  const slotsDia = horariosFuturos.filter((h) => new Date(h.inicio_at).toLocaleDateString("en-CA") === fecha);
  const diaDisponibilidad = (diasDisponibilidad.data ?? []).find((d) => d.fecha === fechaSeleccionada);
  const diaDisponible = diaDisponibilidad?.disponible === true;
  const diasDisponiblesMap = new Map((diasDisponibilidad.data ?? []).map((d) => [d.fecha, d.disponible]));

  return (
    <AppShell titulo="Agenda" subtitulo="Reserva y administra asesorías de AURUM LAB" atrasMovil={{ to: "/inicio" }}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-3 sm:p-4 md:gap-5 md:p-5">
        <header className="rounded-2xl border border-gold/20 bg-gradient-to-br from-card via-card to-gold/5 p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">AURUM LAB · ACOMPAÑAMIENTO</p>
          <h1 className="mt-2 font-display text-3xl">Agenda de asesorías</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Reserva una sesión personalizada para resolver dudas y aprovechar mejor las herramientas de la plataforma.</p>
        </header>

        {esAdministrador ? (
          <>
          <div className="rounded-2xl border border-gold/25 bg-card p-5 shadow-card md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="flex items-center gap-2 text-xl font-semibold"><UserRound className="size-5 text-gold-deep" /> Solicitudes de demostración</h2><p className="mt-1 text-sm text-muted-foreground">Los formularios enviados desde la página pública aparecen aquí para que FADILAB contacte al interesado y coordine una fecha.</p></div>
              <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{(solicitudesDemo.data ?? []).filter(x => x.estado === "pendiente").length} pendientes</span>
            </div>
            {solicitudesDemo.isLoading ? <p className="py-6 text-center text-sm text-muted-foreground">Cargando solicitudes…</p> : null}
            {solicitudesDemo.isError ? <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">No se pudieron cargar las solicitudes. Verifica que Lovable haya aplicado la migración SQL de integración con Agenda.</p> : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(solicitudesDemo.data ?? []).map((d) => <article key={d.id} className="rounded-xl border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{d.empresa}</p><p className="mt-1 text-xs text-muted-foreground">{d.nombre} · {fechaHora(d.created_at)}</p></div><span className={"rounded-full border px-2.5 py-1 text-[11px] font-semibold " + (d.estado === "pendiente" ? "border-amber-300 bg-amber-50 text-amber-800" : d.estado === "contactado" ? "border-sky-300 bg-sky-50 text-sky-800" : "border-emerald-300 bg-emerald-50 text-emerald-800")}>{d.estado === "pendiente" ? "Pendiente" : d.estado === "contactado" ? "Contactado" : "Demo coordinada"}</span></div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground"><p>{d.email}</p><p>{d.telefono}</p><p className="pt-1 text-xs">Interés: {d.interes}</p>{d.horario_preferido ? <p className="text-xs">Horario preferido: {d.horario_preferido}</p> : null}{d.fecha_reunion_at ? <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 p-2 text-xs text-indigo-900"><p className="font-semibold">Demostración reservada</p><p>{fechaHora(d.fecha_reunion_at)} · Discord</p><a href="https://discord.gg/TEjqZUcbg" target="_blank" rel="noreferrer" className="mt-1 inline-flex font-semibold underline">Abrir servidor de Discord</a></div> : null}</div>
                <div className="mt-4 flex flex-wrap gap-2"><a href={"https://wa.me/" + d.telefono.replace(/\D/g, "")} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent">WhatsApp</a><a href={"mailto:" + d.email + "?subject=" + encodeURIComponent("Confirmación de tu demostración de AURUM LAB") + "&body=" + encodeURIComponent("Hola " + d.nombre + ",\n\nTu demostración de AURUM LAB está reservada para " + (d.fecha_reunion_at ? fechaHora(d.fecha_reunion_at) : "la fecha coordinada") + ".\n\nNos reuniremos por Discord: https://discord.gg/TEjqZUcbg\n\nSaludos,\nEquipo AURUM LAB\nfabricaciondigital@hotmail.com")} className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent">Correo</a>{d.estado === "pendiente" ? <button type="button" onClick={() => actualizarSolicitudDemo.mutate({id:d.id,estado:"contactado"})} className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-ink-foreground">Marcar contactado</button> : null}{d.estado !== "demo_agendada" ? <button type="button" onClick={() => actualizarSolicitudDemo.mutate({id:d.id,estado:"demo_agendada"})} className="rounded-lg border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-800">Marcar demo coordinada</button> : null}<button type="button" onClick={() => actualizarSolicitudDemo.mutate({id:d.id,estado:"cerrado"})} className="rounded-lg border px-3 py-2 text-xs font-semibold text-muted-foreground">Cerrar</button></div>
              </article>)}
            </div>
            {!solicitudesDemo.isLoading && !solicitudesDemo.isError && (solicitudesDemo.data ?? []).length === 0 ? <p className="mt-4 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Todavía no hay solicitudes de demostración. Cuando alguien complete el formulario público, aparecerá aquí.</p> : null}
          </div>
          <section className="space-y-5">
            <div className="rounded-2xl border bg-card p-4 shadow-card md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="flex items-center gap-2 text-xl font-semibold"><CalendarDays className="size-5 text-gold-deep" /> Calendario de FADILAB</h2><p className="mt-1 text-sm text-muted-foreground">Organiza tus compromisos. Cada evento bloquea ese horario para las asesorías de los gerentes.</p></div>
                <div className="flex items-center gap-2"><button type="button" onClick={() => setMesVisible(new Date())} className="rounded-lg border px-3 py-2 text-xs font-semibold">Hoy</button><button type="button" onClick={() => setMesVisible(new Date(mesVisible.getFullYear(),mesVisible.getMonth()-1,1))} className="grid size-9 place-items-center rounded-lg border"><ChevronLeft className="size-4" /></button><button type="button" onClick={() => setMesVisible(new Date(mesVisible.getFullYear(),mesVisible.getMonth()+1,1))} className="grid size-9 place-items-center rounded-lg border"><ChevronRight className="size-4" /></button></div>
              </div>
              <h3 className="mt-4 font-display text-xl capitalize">{new Intl.DateTimeFormat("es-PE",{month:"long",year:"numeric"}).format(mesVisible)}</h3>
              <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-1.5">
                {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d=><div key={d} className="py-1.5 text-center text-[10px] font-semibold uppercase text-muted-foreground">{d}</div>)}
                {Array.from({length:42},(_,i)=>{
                  const offset=(inicioMes.getDay()+6)%7;
                  const dia=new Date(inicioMes.getFullYear(),inicioMes.getMonth(),i-offset+1);
                  const key=dia.toLocaleDateString("en-CA");
                  const inMonth=dia.getMonth()===mesVisible.getMonth();
                  const selected=key===fechaSeleccionada;
                  const ev=(eventos.data||[]).filter(e=>new Date(e.inicio_at).toLocaleDateString("en-CA")===key);
                  const rs=(reservas.data||[]).filter(r=>new Date(r.inicio_at).toLocaleDateString("en-CA")===key&&(r.estado==="pendiente"||r.estado==="confirmada"));
                  const demos=(solicitudesDemo.data||[]).filter(d=>d.fecha_reunion_at&&new Date(d.fecha_reunion_at).toLocaleDateString("en-CA")===key);
                  const habilitado=diasDisponiblesMap.get(key)===true;
                  return <button key={key} type="button" onClick={()=>{setFechaSeleccionada(key);setMostrarFormularioEvento(false);}} className={"min-h-[52px] rounded-lg border p-1.5 text-left transition sm:min-h-[60px] sm:rounded-xl sm:p-2 lg:min-h-[68px] "+(selected?"border-gold bg-gold/10 ring-1 ring-gold/40":inMonth?"border-border bg-background hover:border-gold/50":"border-transparent bg-muted/30 text-muted-foreground/50")}>
                    <div className="flex items-center justify-between"><span className="text-xs font-semibold sm:text-sm">{dia.getDate()}</span>{ev.length+rs.length+demos.length>0?<span className="text-[10px] text-muted-foreground">{ev.length+rs.length+demos.length}</span>:null}</div>
                    {inMonth?<span className={"mt-1 inline-flex rounded px-1 py-0.5 text-[8px] font-bold sm:text-[9px] "+(habilitado?"bg-emerald-100 text-emerald-800":"bg-slate-100 text-slate-500")}>{habilitado?"Disponible":"No disponible"}</span>:null}
                    <div className="mt-1 space-y-0.5">{ev.slice(0,2).map(e=><span key={e.id} className="block truncate rounded bg-amber-100 px-1 py-0.5 text-[9px] font-semibold text-amber-900">{e.titulo}</span>)}{rs.slice(0,1).map(r=><span key={r.id} className="block truncate rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-semibold text-emerald-900">Asesoría · {r.solicitante_nombre}</span>)}{demos.slice(0,1).map(d=><span key={d.id} className="block truncate rounded bg-indigo-100 px-1 py-0.5 text-[9px] font-semibold text-indigo-900">Demo · {d.empresa}</span>)}</div>
                  </button>;
                })}
              </div>
              <div className="mt-5 rounded-xl border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="text-xs font-semibold uppercase text-muted-foreground">Día seleccionado</p><p className="mt-1 font-semibold capitalize">{new Intl.DateTimeFormat("es-PE",{dateStyle:"full"}).format(new Date(fechaSeleccionada+"T12:00:00"))}</p><p className="mt-1 text-xs text-muted-foreground">{diasDisponibilidad.isLoading ? "Consultando disponibilidad…" : diaDisponible ? "Este día permite publicar horarios para reservas." : "Este día está cerrado para nuevas reservas."}</p></div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={cambiarDisponibilidadDia.isPending || diasDisponibilidad.isLoading || fechaSeleccionada < new Date().toLocaleDateString("en-CA")} onClick={()=>cambiarDisponibilidadDia.mutate(true)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800 disabled:opacity-50"><CheckCircle2 className="size-4" /> Marcar disponible</button>
                    <button type="button" disabled={cambiarDisponibilidadDia.isPending || diasDisponibilidad.isLoading || !diaDisponible} onClick={()=>cambiarDisponibilidadDia.mutate(false)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-800 disabled:opacity-50"><XCircle className="size-4" /> No disponible</button>
                    <button type="button" onClick={()=>setMostrarFormularioEvento(v=>!v)} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-ink-foreground"><Plus className="size-4" /> Agregar evento</button>
                  </div>
                </div>
              </div>
              {mostrarFormularioEvento?<div className="mt-4 rounded-xl border border-gold/30 bg-gold/5 p-4">
                <h3 className="font-semibold">Nuevo compromiso de FADILAB</h3><p className="mt-1 text-xs text-muted-foreground">El horario quedará bloqueado para nuevas asesorías mientras dure el evento.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">Nombre del evento<input value={eventoTitulo} onChange={e=>setEventoTitulo(e.target.value)} maxLength={120} placeholder="Ej. Reunión de coordinación" className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground" /></label>
                  <label className="text-xs font-semibold text-muted-foreground">Tipo<select value={eventoTipo} onChange={e=>setEventoTipo(e.target.value as Evento["tipo"])} className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground"><option value="reunion">Reunión</option><option value="capacitacion">Capacitación</option><option value="evento">Evento</option><option value="bloqueo">Bloqueo personal</option><option value="vacaciones">Vacaciones</option><option value="otro">Otro</option></select></label>
                  <label className="text-xs font-semibold text-muted-foreground">Fecha<input type="date" min={new Date().toLocaleDateString("en-CA")} value={fechaSeleccionada} onChange={e=>setFechaSeleccionada(e.target.value)} className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground" /></label>
                  <label className="text-xs font-semibold text-muted-foreground">Hora de inicio<input type="time" value={eventoInicio} onChange={e=>setEventoInicio(e.target.value)} className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground" /></label>
                  <label className="text-xs font-semibold text-muted-foreground">Hora de fin<input type="time" value={eventoFin} onChange={e=>setEventoFin(e.target.value)} className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground" /></label>
                  <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">Notas (opcional)<textarea value={eventoDescripcion} onChange={e=>setEventoDescripcion(e.target.value)} maxLength={1000} rows={2} className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground" /></label>
                </div>
                <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={()=>setMostrarFormularioEvento(false)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">Cancelar</button><button type="button" disabled={crearEvento.isPending} onClick={()=>crearEvento.mutate()} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-ink-foreground disabled:opacity-50">{crearEvento.isPending?"Guardando…":"Guardar evento"}</button></div>
              </div>:null}
              <div className="mt-5"><h3 className="font-semibold">Actividades del día</h3><div className="mt-3 space-y-2">{(eventos.data||[]).filter(e=>new Date(e.inicio_at).toLocaleDateString("en-CA")===fechaSeleccionada).map(e=><div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><div><p className="font-semibold">{e.titulo} <span className="text-xs font-normal text-muted-foreground">· {tipoEventoLabel[e.tipo]}</span></p><p className="mt-1 text-xs text-muted-foreground">{new Date(e.inicio_at).toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})} – {new Date(e.fin_at).toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})}</p>{e.descripcion?<p className="mt-1 text-xs text-muted-foreground">{e.descripcion}</p>:null}</div><button type="button" onClick={()=>eliminarEvento.mutate(e.id)} disabled={eliminarEvento.isPending} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /> Eliminar</button></div>)}{(reservas.data||[]).filter(r=>new Date(r.inicio_at).toLocaleDateString("en-CA")===fechaSeleccionada&&(r.estado==="pendiente"||r.estado==="confirmada")).map(r=><div key={r.id} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><p className="font-semibold">Asesoría · {r.solicitante_nombre} · {estadoLabel[r.estado]}</p><p className="mt-1 text-xs">{fechaHora(r.inicio_at)} · {r.tema}</p></div>)}{!(eventos.data||[]).some(e=>new Date(e.inicio_at).toLocaleDateString("en-CA")===fechaSeleccionada)&&!(reservas.data||[]).some(r=>new Date(r.inicio_at).toLocaleDateString("en-CA")===fechaSeleccionada&&(r.estado==="pendiente"||r.estado==="confirmada"))?<p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">No hay compromisos registrados para este día.</p>:null}</div></div>
            </div>
            <div className="rounded-2xl border bg-card p-4 shadow-card">
              <button type="button" onClick={()=>setMostrarPublicacionHorarios(v=>!v)} className="flex w-full items-center justify-between gap-3 text-left"><span><span className="block font-semibold">Disponibilidad para asesorías</span><span className="mt-1 block text-xs text-muted-foreground">Publica los bloques que los gerentes podrán reservar. Los eventos prevalecen y bloquean los cruces.</span></span><span className="rounded-lg border px-3 py-2 text-xs font-semibold">{mostrarPublicacionHorarios?"Ocultar":"Administrar horarios"}</span></button>
              {mostrarPublicacionHorarios?<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-xs font-semibold text-muted-foreground">Fecha<input type="date" min={new Date().toLocaleDateString("en-CA")} value={fechaSeleccionada} onChange={e=>setFechaSeleccionada(e.target.value)} className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground" /></label>
                <label className="text-xs font-semibold text-muted-foreground">Hora de inicio<input type="time" value={horaInicio} onChange={e=>setHoraInicio(e.target.value)} className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground" /></label>
                <label className="text-xs font-semibold text-muted-foreground">Hora de fin<input type="time" value={horaFin} onChange={e=>setHoraFin(e.target.value)} className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground" /></label>
                <div className="flex items-end"><button type="button" disabled={!diaDisponible || crearHorario.isPending} onClick={()=>{setFecha(fechaSeleccionada);crearHorario.mutate();}} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-ink-foreground disabled:opacity-50"><Plus className="size-4" /> Publicar bloque</button></div>{!diaDisponible?<p className="text-xs text-amber-700 sm:col-span-2 lg:col-span-4">Primero marca el día seleccionado como disponible para publicar horarios.</p>:null}
              </div>:null}
            </div>
          </section>
          </>
        ) : (
          <section className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
            <div className="rounded-2xl border bg-card p-5 shadow-card">
              <div className="flex items-center gap-2"><CalendarDays className="size-5 text-gold-deep" /><h2 className="text-lg font-semibold">Reservar asesoría</h2></div>
              <p className="mt-1 text-sm text-muted-foreground">Elige uno de los horarios publicados por administración.</p>
              <label className="mt-4 block text-xs font-semibold text-muted-foreground">Tema de la asesoría<select value={tema} onChange={(e) => setTema(e.target.value)} className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground">{temas.map((t) => <option key={t}>{t}</option>)}</select></label>
              <label className="mt-3 block text-xs font-semibold text-muted-foreground">Fecha disponible<input type="date" min={new Date().toLocaleDateString("en-CA")} value={fecha} onChange={(e) => { setFecha(e.target.value); setHorarioSeleccionado(""); }} className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground" /></label>
              <label className="mt-3 block text-xs font-semibold text-muted-foreground">Hora disponible<select value={horarioSeleccionado} onChange={(e) => setHorarioSeleccionado(e.target.value)} className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground"><option value="">Selecciona una hora</option>{slotsDia.map((h) => <option key={h.id} value={h.id}>{new Date(h.inicio_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })} – {new Date(h.fin_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</option>)}</select></label>
              <label className="mt-3 block text-xs font-semibold text-muted-foreground">Cuéntanos qué necesitas (opcional)<textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={1000} rows={3} placeholder="Describe brevemente tu consulta…" className="mt-1.5 w-full resize-y rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground" /></label>
              <button type="button" disabled={!horarioSeleccionado || reservar.isPending} onClick={() => reservar.mutate()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-ink-foreground disabled:opacity-40"><CalendarCheck className="size-4" /> Solicitar asesoría</button>
              {horarios.isLoading ? <p className="mt-3 text-xs text-muted-foreground">Cargando disponibilidad…</p> : null}
              {horariosFuturos.length === 0 && !horarios.isLoading ? <p className="mt-3 rounded-xl bg-muted p-3 text-xs text-muted-foreground">Todavía no hay horarios disponibles. Vuelve a consultar más adelante.</p> : null}
            </div>
            <div className="rounded-2xl border bg-card p-5 shadow-card">
              <div className="flex items-center gap-2"><Clock3 className="size-5 text-gold-deep" /><h2 className="text-lg font-semibold">Disponibilidad</h2></div>
              <p className="mt-1 text-sm text-muted-foreground">Horarios publicados para reservar.</p>
              <div className="mt-4 space-y-2">{horariosFuturos.slice(0,8).map((h) => <button key={h.id} type="button" onClick={() => setHorarioSeleccionado(h.id)} className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm transition hover:border-gold/50 ${horarioSeleccionado === h.id ? "border-gold bg-gold/5" : "bg-background"}`}><span><span className="block font-semibold">{fechaHora(h.inicio_at)}</span><span className="text-xs text-muted-foreground">Hasta {new Date(h.fin_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</span></span><span className="text-xs font-semibold text-gold-deep">Elegir</span></button>)}{horariosFuturos.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Sin horarios publicados.</p> : null}</div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border bg-card p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{esAdministrador ? "Solicitudes de asesoría" : "Mis asesorías"}</h2><p className="text-sm text-muted-foreground">{esAdministrador ? "Revisa y gestiona las solicitudes de los talleres." : "Consulta el estado de tus solicitudes y próximas sesiones."}</p></div><button type="button" onClick={() => void invalidar()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent"><RefreshCw className="size-3.5" /> Actualizar</button></div>
          <div className="mt-4 flex flex-wrap gap-2">{(["todas","pendiente","confirmada","realizada"] as const).map((v) => <button key={v} type="button" onClick={() => setFiltro(v)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${filtro===v?"border-gold bg-gold/10 text-gold-deep":"text-muted-foreground hover:bg-accent"}`}>{v === "todas" ? "Todas" : estadoLabel[v]}</button>)}</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">{reservasFiltradas.map((r) => <article key={r.id} className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{r.tema}</p><p className="mt-1 text-xs text-muted-foreground">{fechaHora(r.inicio_at)} · {new Date(r.fin_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</p></div><span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${estadoClass[r.estado]}`}>{estadoLabel[r.estado]}</span></div>
            {esAdministrador ? <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Building2 className="size-3.5" />{r.taller_nombre}<span>·</span><UserRound className="size-3.5" />{r.solicitante_nombre}</div> : null}
            {r.descripcion ? <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{r.descripcion}</p> : null}
            {r.enlace_reunion ? <a href={r.enlace_reunion} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-gold-deep hover:underline"><Video className="size-4" /> Abrir enlace de reunión</a> : null}
            {esAdministrador && r.estado === "pendiente" ? <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => actualizarReserva.mutate({id:r.id,estado:"confirmada"})} className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-ink-foreground"><CheckCircle2 className="size-3.5" /> Confirmar</button><button type="button" onClick={() => actualizarReserva.mutate({id:r.id,estado:"cancelada"})} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold"><XCircle className="size-3.5" /> Rechazar</button></div> : null}
            {esAdministrador && r.estado === "confirmada" ? <button type="button" onClick={() => actualizarReserva.mutate({id:r.id,estado:"realizada"})} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold"><CheckCircle2 className="size-3.5" /> Marcar realizada</button> : null}
            {!esAdministrador && (r.estado === "pendiente" || r.estado === "confirmada") ? <button type="button" onClick={() => cancelar.mutate(r.id)} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold text-muted-foreground"><XCircle className="size-3.5" /> Cancelar solicitud</button> : null}
          </article>)}</div>
          {reservas.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Cargando asesorías…</p> : null}
          {reservas.isError ? <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">No se pudo cargar la agenda. Verifica que hayas aplicado la migración SQL de Agenda.</div> : null}
          {!reservas.isLoading && !reservas.isError && reservasFiltradas.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay solicitudes en esta sección.</p> : null}
        </section>
      </div>
    </AppShell>
  );
}
