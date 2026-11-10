import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, Clock3, Video, Plus, CheckCircle2, XCircle, CalendarCheck, UserRound, Building2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Aurum Lab" }] }),
  component: AgendaPage,
});

type Horario = { id: string; inicio_at: string; fin_at: string; zona_horaria: string; };
type Reserva = {
  id: string; horario_id: string; tema: string; descripcion: string | null; estado: "pendiente" | "confirmada" | "cancelada" | "realizada";
  enlace_reunion: string | null; nota_administrador: string | null; created_at: string; inicio_at: string; fin_at: string;
  solicitante_nombre: string; taller_nombre: string; solicitante_id: string;
};
const db = supabase as any;
const temas = ["Configuración inicial de la plataforma", "Gestión de clientes, cotizaciones y pedidos", "Catálogo digital y visor 3D", "AURUM RENDER y herramientas de diseño", "Mi Nube y archivos", "Capacitación general", "Otra consulta"];
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

  const horarios = useQuery<Horario[]>({
    queryKey: ["agenda-horarios"],
    enabled: Boolean(sesion?.user.id),
    queryFn: async () => {
      const { data, error } = await db.rpc("agenda_listar_horarios");
      if (error) throw error;
      return (data ?? []) as Horario[];
    },
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
      qc.invalidateQueries({ queryKey: ["agenda-reservas"] }),
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
  const crearHorario = useMutation({
    mutationFn: async () => {
      const inicio = new Date(`${fecha}T${horaInicio}:00`);
      const fin = new Date(`${fecha}T${horaFin}:00`);
      if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(fin.getTime()) || fin <= inicio || inicio <= new Date()) throw new Error("Selecciona una fecha futura y una hora final posterior a la inicial.");
      const { error } = await db.rpc("agenda_crear_horario", { _inicio_at: inicio.toISOString(), _fin_at: fin.toISOString(), _zona_horaria: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Lima" });
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Horario publicado"); await invalidar(); },
    onError: (error: Error) => toast.error("No se pudo crear el horario", { description: error.message }),
  });
  const actualizarReserva = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: Reserva["estado"] }) => {
      const { error } = await db.rpc("agenda_actualizar_reserva", { _reserva_id: id, _estado: estado, _enlace_reunion: null, _nota_administrador: null });
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Reserva actualizada"); await invalidar(); },
    onError: (error: Error) => toast.error("No se pudo actualizar", { description: error.message }),
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

  return (
    <AppShell titulo="Agenda" subtitulo="Reserva y administra asesorías de AURUM LAB" atrasMovil={{ to: "/inicio" }}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
        <header className="rounded-2xl border border-gold/20 bg-gradient-to-br from-card via-card to-gold/5 p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">AURUM LAB · ACOMPAÑAMIENTO</p>
          <h1 className="mt-2 font-display text-3xl">Agenda de asesorías</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Reserva una sesión personalizada para resolver dudas y aprovechar mejor las herramientas de la plataforma.</p>
        </header>

        {esAdministrador ? (
          <section className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="flex items-start gap-3"><span className="rounded-xl bg-gold/15 p-2 text-gold-deep"><CalendarDays className="size-5" /></span><div><h2 className="text-lg font-semibold">Gestión de agenda</h2><p className="text-sm text-muted-foreground">Publica horarios disponibles para que los gerentes puedan reservar.</p></div></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-semibold text-muted-foreground">Fecha<input type="date" min={new Date().toISOString().slice(0,10)} value={fecha} onChange={(e) => setFecha(e.target.value)} className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground" /></label>
              <label className="text-xs font-semibold text-muted-foreground">Hora de inicio<input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground" /></label>
              <label className="text-xs font-semibold text-muted-foreground">Hora de fin<input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className="mt-1.5 w-full rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground" /></label>
              <div className="flex items-end"><button type="button" disabled={crearHorario.isPending} onClick={() => crearHorario.mutate()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-ink-foreground disabled:opacity-50"><Plus className="size-4" /> Publicar horario</button></div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Los horarios se guardan con la zona horaria de tu dispositivo. Puedes publicar varios bloques, uno por sesión.</p>
          </section>
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
