import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Megaphone, MessageCircle, Users } from "lucide-react";

type Destinatario = {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  estado: string;
  fecha_nacimiento: string | null;
};

type Props = { clientes: Destinatario[] };

const soloDigitos = (valor: string) => valor.replace(/\D/g, "");
function telefonoWhatsApp(valor: string) {
  const digitos = soloDigitos(valor);
  if (!digitos) return "";
  if (digitos.startsWith("51")) return digitos;
  if (digitos.length === 9) return "51" + digitos;
  return digitos;
}

export function CentroCampanasClientes({ clientes }: Props) {
  const [tipo, setTipo] = useState<"live" | "novedades" | "promocion">("live");
  const [audiencia, setAudiencia] = useState("activos");
  const [enlace, setEnlace] = useState("");
  const [textoPersonalizado, setTextoPersonalizado] = useState("");
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [confirmoPermiso, setConfirmoPermiso] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const elegibles = useMemo(() => {
    const ahora = new Date();
    return clientes.filter((c) => {
      if (!c.telefono?.trim()) return false;
      if (audiencia === "activos" && c.estado !== "activo") return false;
      if (audiencia === "inactivos" && c.estado !== "inactivo") return false;
      if (audiencia === "cumpleanos" && (!c.fecha_nacimiento || Number(c.fecha_nacimiento.slice(5, 7)) !== ahora.getMonth() + 1)) return false;
      return true;
    });
  }, [clientes, audiencia]);

  const mensaje = useMemo(() => {
    const saludo = tipo === "live"
      ? "¡Estamos en vivo! Acompáñanos en nuestro LIVE de TikTok para conocer las novedades del taller."
      : tipo === "novedades"
        ? "Tenemos novedades en el taller y queremos compartirlas contigo."
        : "Tenemos novedades y promociones del taller que quizá te interesen.";
    const cuerpo = textoPersonalizado.trim() || saludo;
    return [cuerpo, enlace.trim() ? "Míralo aquí: " + enlace.trim() : ""].filter(Boolean).join("\n\n");
  }, [tipo, textoPersonalizado, enlace]);

  const seleccionadosConTelefono = elegibles.filter((c) => seleccionados.includes(c.id));
  const todosMarcados = elegibles.length > 0 && elegibles.every((c) => seleccionados.includes(c.id));

  async function copiarMensaje() {
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      setCopiado(false);
    }
  }

  function abrirWhatsApp(telefono: string) {
    const destino = telefonoWhatsApp(telefono);
    if (!destino) return;
    window.open("https://wa.me/" + destino + "?text=" + encodeURIComponent(mensaje), "_blank", "noopener,noreferrer");
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gold/20 bg-card shadow-[0_18px_50px_-35px_rgba(0,0,0,0.35)]">
      <div className="border-b border-border bg-gradient-to-r from-gold/[0.09] to-transparent p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold"><Megaphone className="size-5" /></span>
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">Comunicación comercial</p><h2 className="mt-1 text-xl font-semibold">Centro de campañas</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Prepara invitaciones a LIVE, novedades y promociones, y abre cada conversación en WhatsApp con el mensaje listo.</p></div>
        </div>
      </div>
      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:p-6">
        <div className="space-y-5">
          <div><label className="mb-2 block text-xs font-semibold">Tipo de campaña</label><select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"><option value="live">Invitación a LIVE de TikTok</option><option value="novedades">Nuevas joyas y colecciones</option><option value="promocion">Promociones del taller</option></select></div>
          <div><label className="mb-2 block text-xs font-semibold">Grupo de destinatarios</label><select value={audiencia} onChange={(e) => { setAudiencia(e.target.value); setSeleccionados([]); }} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"><option value="activos">Clientes activos con teléfono</option><option value="todos">Todos los clientes con teléfono</option><option value="cumpleanos">Cumpleaños de este mes</option><option value="inactivos">Clientes inactivos con teléfono</option></select><p className="mt-1.5 text-xs text-muted-foreground">{elegibles.length} contactos disponibles para seleccionar.</p></div>
          <div><label className="mb-2 block text-xs font-semibold">Enlace del LIVE o promoción (opcional)</label><input value={enlace} onChange={(e) => setEnlace(e.target.value)} type="url" placeholder="https://www.tiktok.com/@.../live" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/50" /></div>
          <div><label className="mb-2 block text-xs font-semibold">Personalizar mensaje (opcional)</label><textarea value={textoPersonalizado} onChange={(e) => setTextoPersonalizado(e.target.value)} rows={4} placeholder="Escribe tu invitación o deja el mensaje sugerido..." className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-gold/50" /></div>
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3"><label className="flex cursor-pointer items-start gap-2 text-xs leading-5"><input type="checkbox" checked={confirmoPermiso} onChange={(e) => setConfirmoPermiso(e.target.checked)} className="mt-0.5 accent-[hsl(var(--gold))]" /><span>Confirmo que las personas seleccionadas aceptaron recibir comunicaciones comerciales por este canal.</span></label></div>
        </div>
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-surface-muted/35 p-4"><div className="flex items-center gap-2"><MessageCircle className="size-4 text-gold" /><h3 className="text-sm font-semibold">Vista previa del mensaje</h3></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{mensaje}</p><button type="button" onClick={() => void copiarMensaje()} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:border-gold/40">{copiado ? <Check className="size-4"/> : <Copy className="size-4"/>}{copiado ? "Mensaje copiado" : "Copiar mensaje"}</button></div>
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Users className="size-4 text-gold"/><h3 className="text-sm font-semibold">Destinatarios</h3></div><button type="button" onClick={() => setSeleccionados(todosMarcados ? [] : elegibles.map((c) => c.id))} className="text-xs font-semibold text-gold hover:underline">{todosMarcados ? "Quitar selección" : "Seleccionar todos"}</button></div>
          <div className="max-h-[340px] divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {elegibles.length ? elegibles.map((c) => { const marcado = seleccionados.includes(c.id); return <label key={c.id} className="flex cursor-pointer items-center gap-3 p-3 hover:bg-surface-muted/50"><input type="checkbox" checked={marcado} onChange={(e) => setSeleccionados((prev) => e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id))} className="accent-[hsl(var(--gold))]"/><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{c.nombre}</span><span className="block text-xs text-muted-foreground">{c.telefono}</span></span><span className="text-[10px] text-muted-foreground">{c.estado}</span></label>; }) : <p className="p-5 text-center text-sm text-muted-foreground">No hay contactos con teléfono en este grupo.</p>}
          </div>
          <p className="text-xs text-muted-foreground">Seleccionados: {seleccionadosConTelefono.length}. WhatsApp se abrirá por contacto y tendrás que revisar y pulsar enviar en cada conversación. Esta versión no realiza envíos masivos automáticos.</p>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={!confirmoPermiso || seleccionadosConTelefono.length !== 1} onClick={() => seleccionadosConTelefono[0] && abrirWhatsApp(seleccionadosConTelefono[0].telefono!)} className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-semibold text-gold-foreground disabled:cursor-not-allowed disabled:opacity-40"><ExternalLink className="size-4"/> Abrir WhatsApp del seleccionado</button><button type="button" disabled={!confirmoPermiso || seleccionadosConTelefono.length === 0} onClick={() => { const c = seleccionadosConTelefono[0]; if (c) abrirWhatsApp(c.telefono!); }} className="inline-flex items-center gap-2 rounded-xl border border-gold/30 px-4 py-2.5 text-xs font-semibold hover:bg-gold/5 disabled:cursor-not-allowed disabled:opacity-40"><MessageCircle className="size-4"/> Preparar primer envío</button></div>
        </div>
      </div>
    </section>
  );
}
