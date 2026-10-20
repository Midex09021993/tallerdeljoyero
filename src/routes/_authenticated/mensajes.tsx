import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Bell, CheckCheck, MessageCircle, Plus, Search, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { rolEtiqueta, useSesion, type Rol } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/mensajes")({
  head: () => ({ meta: [{ title: "Mensajes — Aurum Lab" }] }),
  component: MensajesPage,
});

type ParticipanteChat = {
  user_id: string;
  nombre_persona: string;
  nombre_taller: string;
  rol: Rol;
};
type ResumenChat = {
  conversacion_id: string;
  otro_usuario_id: string;
  nombre_persona: string;
  nombre_taller: string | null;
  rol: string | null;
  ultimo_mensaje: string | null;
  ultima_actividad: string;
  no_leidos: number;
};
type MensajeChat = {
  id: string;
  conversacion_id: string;
  remitente_id: string;
  contenido: string;
  created_at: string;
};

const db = supabase as any;

function MensajesPage() {
  const { data: sesion } = useSesion();
  const qc = useQueryClient();
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [borrador, setBorrador] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [mostrarDirectorio, setMostrarDirectorio] = useState(false);
  const [usuariosEnLinea, setUsuariosEnLinea] = useState<Set<string>>(new Set());
  const finalMensajes = useRef<HTMLDivElement>(null);
  const userId = sesion?.user.id;

  const directorio = useQuery<ParticipanteChat[]>({
    queryKey: ["chat-directorio-activos"],
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await db.rpc("chat_listar_participantes_activos");
      if (error) throw error;
      return (data ?? []) as ParticipanteChat[];
    },
  });

  const conversaciones = useQuery<ResumenChat[]>({
    queryKey: ["chat-resumen", userId],
    enabled: Boolean(userId),
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await db.rpc("chat_resumen_conversaciones");
      if (error) throw error;
      return (data ?? []) as ResumenChat[];
    },
  });

  const mensajes = useQuery<MensajeChat[]>({
    queryKey: ["chat-mensajes", seleccionada],
    enabled: Boolean(userId && seleccionada),
    queryFn: async () => {
      const { data, error } = await db.from("chat_mensajes")
        .select("id,conversacion_id,remitente_id,contenido,created_at")
        .eq("conversacion_id", seleccionada)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as MensajeChat[];
    },
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`aurum-chat-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_mensajes" }, (payload) => {
        const nuevo = payload.new as MensajeChat;
        void qc.invalidateQueries({ queryKey: ["chat-resumen", userId] });
        void qc.invalidateQueries({ queryKey: ["chat-mensajes", nuevo.conversacion_id] });
        if (nuevo.remitente_id !== userId) {
          const actual = conversaciones.data?.find((c) => c.conversacion_id === nuevo.conversacion_id);
          if (actual?.conversacion_id !== seleccionada) {
            toast("Nuevo mensaje", { description: actual?.nombre_persona ?? "Tienes un mensaje nuevo" });
          }
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId, qc, seleccionada, conversaciones.data]);

  useEffect(() => {
    if (!seleccionada || !userId || !mensajes.data) return;
    finalMensajes.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    const ultimo = mensajes.data[mensajes.data.length - 1];
    if (!ultimo) return;
    void db.from("chat_conversacion_miembros")
      .update({ ultimo_leido_at: new Date().toISOString() })
      .eq("conversacion_id", seleccionada)
      .eq("user_id", userId)
      .then(({ error }: { error: unknown }) => {
        if (!error) void qc.invalidateQueries({ queryKey: ["chat-resumen", userId] });
      });
  }, [seleccionada, userId, mensajes.data, qc]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel("aurum-lab-presence", { config: { private: true, presence: { key: userId } } });
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState() as Record<string, Array<{ user_id?: string }>>;
      const ids = Object.values(state).flat().map((entry) => entry.user_id).filter((id): id is string => Boolean(id));
      setUsuariosEnLinea(new Set(ids));
    });
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") void channel.track({ user_id: userId, online_at: new Date().toISOString() });
    });
    return () => { void supabase.removeChannel(channel); };
  }, [userId]);

  const chats = conversaciones.data ?? [];
  const chatActual = chats.find((chat) => chat.conversacion_id === seleccionada) ?? null;
  const totalNoLeidos = chats.reduce((total, chat) => total + Number(chat.no_leidos || 0), 0);
  const contactos = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase("es");
    return (directorio.data ?? []).filter((p) =>
      !q || [p.nombre_persona, p.nombre_taller, rolEtiqueta[p.rol] ?? p.rol]
        .some((v) => v.toLocaleLowerCase("es").includes(q)),
    );
  }, [directorio.data, busqueda]);

  async function abrirChat(persona: ParticipanteChat) {
    const { data, error } = await db.rpc("chat_abrir_conversacion_directa", {
      _otro_usuario_id: persona.user_id,
    });
    if (error) {
      toast.error("No se pudo abrir la conversación", { description: error.message });
      return;
    }
    setSeleccionada(data as string);
    setMostrarDirectorio(false);
    await qc.invalidateQueries({ queryKey: ["chat-resumen", userId] });
  }

  async function enviarMensaje(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contenido = borrador.trim();
    if (!contenido || !seleccionada || !userId) return;
    const { error } = await db.from("chat_mensajes").insert({
      conversacion_id: seleccionada,
      remitente_id: userId,
      contenido,
    });
    if (error) {
      toast.error("No se pudo enviar el mensaje", { description: error.message });
      return;
    }
    setBorrador("");
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["chat-mensajes", seleccionada] }),
      qc.invalidateQueries({ queryKey: ["chat-resumen", userId] }),
    ]);
  }

  return (
    <AppShell titulo="Mensajes" subtitulo="Comunicación privada del ecosistema" atrasMovil={{ to: "/inicio" }}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 md:p-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">AURUM LAB · COMUNICACIÓN</p>
            <h1 className="mt-1 font-display text-3xl">Mensajes privados</h1>
            <p className="mt-1 text-sm text-muted-foreground">Contacta a personas de cualquier taller activo del ecosistema.</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
            <Bell className="size-5 text-gold-deep" />
            <div><p className="text-sm font-semibold">{totalNoLeidos} sin leer</p><p className="text-xs text-muted-foreground">Avisos internos</p></div>
          </div>
        </header>

        <section className="grid min-h-[65vh] overflow-hidden rounded-2xl border bg-card shadow-card lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className={`border-b bg-surface-muted/50 lg:border-b-0 lg:border-r ${seleccionada ? "hidden lg:block" : "block"}`}>
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-2 font-semibold"><MessageCircle className="size-4 text-gold-deep" /> Conversaciones</div>
              <button type="button" onClick={() => { setMostrarDirectorio(!mostrarDirectorio); setBusqueda(""); }} className="inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-2 text-xs font-semibold hover:bg-accent">
                <Plus className="size-4" /> Nuevo chat
              </button>
            </div>
            {mostrarDirectorio ? (
              <div className="border-b p-3">
                <div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar persona o taller" className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
                <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
                  {contactos.map((persona) => <button key={persona.user_id} type="button" onClick={() => void abrirChat(persona)} className="flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-accent">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-bold text-gold-deep">{persona.nombre_persona.charAt(0).toUpperCase()}</span>
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold">{persona.nombre_persona}</span><span className="block truncate text-xs text-muted-foreground">{persona.nombre_taller}</span><span className="block text-[11px] text-muted-foreground">{rolEtiqueta[persona.rol] ?? persona.rol}</span></span>
                  </button>)}
                  {!directorio.isLoading && contactos.length === 0 ? <p className="p-3 text-sm text-muted-foreground">No hay participantes que coincidan con la búsqueda.</p> : null}
                </div>
              </div>
            ) : null}
            <div className="max-h-[62vh] overflow-y-auto p-2">
              {chats.map((chat) => <button key={chat.conversacion_id} type="button" onClick={() => setSeleccionada(chat.conversacion_id)} className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${seleccionada === chat.conversacion_id ? "bg-accent ring-1 ring-gold/40" : "hover:bg-accent/60"}`}>
                <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-bold text-gold-deep">{chat.nombre_persona.charAt(0).toUpperCase()}<span className={usuariosEnLinea.has(chat.otro_usuario_id) ? "absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-card bg-success" : "absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-card bg-muted-foreground/35"} /></span>
                <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{chat.nombre_persona}</span>{Number(chat.no_leidos) > 0 ? <span className="flex min-w-5 items-center justify-center rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold text-ink">{chat.no_leidos}</span> : null}</span><span className="block truncate text-xs text-muted-foreground">{chat.nombre_taller ?? "Participante del ecosistema"}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{chat.ultimo_mensaje ?? "Inicia la conversación"}</span></span>
              </button>)}
              {conversaciones.isLoading ? <p className="p-4 text-sm text-muted-foreground">Cargando conversaciones…</p> : null}
              {!conversaciones.isLoading && chats.length === 0 && !mostrarDirectorio ? <div className="px-5 py-10 text-center"><Users className="mx-auto size-8 text-muted-foreground/50" /><p className="mt-3 text-sm font-medium">Todavía no tienes chats</p><p className="mt-1 text-xs text-muted-foreground">Pulsa “Nuevo chat” para contactar a un taller.</p></div> : null}
            </div>
          </aside>

          <div className={`flex min-h-[60vh] flex-col ${seleccionada ? "flex" : "hidden lg:flex"}`}>
            {chatActual ? <>
              <div className="flex items-center gap-3 border-b p-4">
                <button type="button" onClick={() => setSeleccionada(null)} className="rounded-lg border px-2 py-1 text-xs lg:hidden">Volver</button>
                <span className="flex size-10 items-center justify-center rounded-full bg-gold/15 font-bold text-gold-deep">{chatActual.nombre_persona.charAt(0).toUpperCase()}</span>
                <div className="min-w-0"><h2 className="truncate font-semibold">{chatActual.nombre_persona}</h2><p className="truncate text-xs text-muted-foreground">{chatActual.nombre_taller ?? "Participante activo"} · {rolEtiqueta[chatActual.rol as Rol] ?? chatActual.rol ?? "Miembro"}</p></div>
                <span className={usuariosEnLinea.has(chatActual.otro_usuario_id) ? "ml-auto inline-flex items-center gap-1 text-[11px] text-success" : "ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground"}><span className={usuariosEnLinea.has(chatActual.otro_usuario_id) ? "size-2 rounded-full bg-success" : "size-2 rounded-full bg-muted-foreground/40"} /> {usuariosEnLinea.has(chatActual.otro_usuario_id) ? "En línea" : "Desconectado"}</span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto bg-surface-muted/30 p-4 md:p-6">
                {mensajes.data?.map((mensaje) => {
                  const propio = mensaje.remitente_id === userId;
                  return <div key={mensaje.id} className={`flex ${propio ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm md:max-w-[72%] ${propio ? "rounded-br-sm bg-ink text-ink-foreground" : "rounded-bl-sm border bg-card"}`}>
                      <p className="whitespace-pre-wrap break-words text-sm">{mensaje.contenido}</p>
                      <p className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${propio ? "text-ink-foreground/55" : "text-muted-foreground"}`}>{new Date(mensaje.created_at).toLocaleString("es-PE", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}{propio ? <CheckCheck className="size-3" /> : null}</p>
                    </div>
                  </div>;
                })}
                {mensajes.isLoading ? <p className="text-sm text-muted-foreground">Cargando mensajes…</p> : null}
                <div ref={finalMensajes} />
              </div>
              <form onSubmit={(e) => void enviarMensaje(e)} className="flex items-end gap-2 border-t bg-card p-3 md:p-4">
                <textarea value={borrador} onChange={(e) => setBorrador(e.target.value)} maxLength={4000} rows={2} placeholder="Escribe un mensaje…" className="max-h-36 min-h-12 flex-1 resize-y rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                <button type="submit" disabled={!borrador.trim()} className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-ink text-ink-foreground transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Enviar mensaje"><Send className="size-4" /></button>
              </form>
              <p className="px-4 pb-3 text-[11px] text-muted-foreground">Solo texto · máximo 4.000 caracteres por mensaje. No se admiten archivos ni imágenes.</p>
            </> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <span className="flex size-16 items-center justify-center rounded-2xl bg-gold/15 text-gold-deep"><MessageCircle className="size-8" /></span>
              <h2 className="mt-5 font-display text-2xl">Tu espacio de colaboración</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">Elige una conversación o inicia un chat privado con cualquier participante activo de AURUM LAB.</p>
              <button type="button" onClick={() => setMostrarDirectorio(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-ink-foreground hover:bg-ink/90"><Plus className="size-4" /> Iniciar conversación</button>
            </div>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
