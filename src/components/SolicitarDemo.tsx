import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, CheckCircle2, Clock3, Gem, Mail, Phone, UserRound, X, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { supabasePublic } from "@/integrations/supabase/client";
import { registrarEvento } from "@/lib/analytics";

type Props = { className?: string };
type HorarioPublico = { id: string; inicio_at: string; fin_at: string; zona_horaria: string };
const DISCORD_DEMO_URL = "https://discord.gg/TEjqZUcbg";

const intereses = [
  "AURUM RENDER",
  "Curso: Diseño CAD 3D para Joyería y Manufactura Aditiva con Inteligencia Artificial",
  "Calculadoras y herramientas técnicas",
  "Gestión de clientes, cotizaciones y pedidos",
  "Mi Nube y catálogo digital",
  "Quiero conocer toda la plataforma",
];

const inputClass = "w-full min-h-[40px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-[#17232d] outline-none transition placeholder:text-slate-400 focus:border-[#c59a18] focus:ring-2 focus:ring-[#f8c928]/25 lg:min-h-[36px] lg:py-1.5";

export function SolicitarDemo({ className = "" }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [codigoPais, setCodigoPais] = useState("+51");
  const [horariosDisponibles, setHorariosDisponibles] = useState<HorarioPublico[]>([]);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState("");
  const [selectorHorariosAbierto, setSelectorHorariosAbierto] = useState(false);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [errorHorarios, setErrorHorarios] = useState("");
  const [mesVisible, setMesVisible] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [form, setForm] = useState({ empresa: "", nombre: "", telefono: "", email: "", interes: intereses[4], sitio: "" });

  useEffect(() => {
    if (!abierto) return;
    let activo = true;
    setCargandoHorarios(true);
    setErrorHorarios("");
    (supabasePublic as any).rpc("agenda_listar_horarios_publicos").then(({ data, error }: { data: HorarioPublico[] | null; error: { message: string } | null }) => {
      if (!activo) return;
      if (error) { setErrorHorarios("No pudimos cargar el calendario. Inténtalo nuevamente en unos minutos."); setHorariosDisponibles([]); }
      else {
        const disponibles = data ?? [];
        setHorariosDisponibles(disponibles);
        if (disponibles[0]?.inicio_at) {
          const primera = new Date(disponibles[0].inicio_at);
          setMesVisible(new Date(primera.getFullYear(), primera.getMonth(), 1));
          setFechaSeleccionada(primera.toLocaleDateString("en-CA"));
        }
      }
    }).catch(() => { if (activo) setErrorHorarios("No pudimos cargar el calendario. Inténtalo nuevamente en unos minutos."); })
      .finally(() => { if (activo) setCargandoHorarios(false); });
    return () => { activo = false; };
  }, [abierto]);

  const fechasConDisponibilidad = useMemo(() => new Set(horariosDisponibles.map(h => new Date(h.inicio_at).toLocaleDateString("en-CA"))), [horariosDisponibles]);
  const horariosDelDia = useMemo(() => horariosDisponibles.filter(h => new Date(h.inicio_at).toLocaleDateString("en-CA") === fechaSeleccionada), [horariosDisponibles, fechaSeleccionada]);
  const diasCalendario = useMemo(() => {
    const inicio = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1);
    const offset = (inicio.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => new Date(inicio.getFullYear(), inicio.getMonth(), i - offset + 1));
  }, [mesVisible]);

  function cerrar() {
    if (cargando) return;
    setAbierto(false);
    setError("");
    setEnviado(false);
    setHorarioSeleccionado("");
  }

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (form.sitio.trim()) {
      setEnviado(true);
      return;
    }
    setCargando(true);
    try {
      if (!horarioSeleccionado) throw new Error("Selecciona un día y una hora para tu demostración.");
      const { error: insertError } = await (supabasePublic as any).rpc("agenda_solicitar_demo_publica", {
        _horario_id: horarioSeleccionado, _empresa: form.empresa.trim(), _nombre: form.nombre.trim(),
        _telefono: form.telefono.trim() ? `${codigoPais}${form.telefono.replace(/\D/g, "")}` : "",
        _email: form.email.trim().toLowerCase(), _interes: form.interes, _horario_preferido: null,
      });
      if (insertError) throw insertError;
      registrarEvento("demo_request_submitted", { source: "landing_home", interest: form.interes });
      setEnviado(true);
    } catch (err) {
      console.error("[solicitud-demo] No se pudo registrar la solicitud", err);
      setError("No pudimos reservar ese horario. Puede que otra persona lo haya elegido; actualiza el calendario e inténtalo nuevamente.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => { setAbierto(true); setHorarioSeleccionado(""); registrarEvento("demo_request_started", { source: "landing_home" }); }}
        className={className || "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#f8c928] px-6 py-3 text-sm font-bold text-[#17232d] shadow-lg shadow-amber-900/10 transition hover:-translate-y-0.5 hover:bg-[#ffdf65] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19] focus-visible:ring-offset-2"}>
        Solicitar una demostración <ArrowRight className="size-4" />
      </button>

      {abierto && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-[#101820]/65 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="solicitud-demo-title">
          <div className="relative my-auto max-h-[96dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-3xl border border-[#eadca8] bg-white p-3 shadow-2xl sm:p-4 lg:max-h-[94dvh] lg:max-w-7xl lg:p-5">
            <button type="button" onClick={cerrar} disabled={cargando} aria-label="Cerrar formulario" className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="size-5" /></button>
            {enviado ? (
              <div className="px-2 py-10 text-center sm:px-8">
                <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#fff4c4] text-[#987400]"><CheckCircle2 className="size-8" /></span>
                <p className="mt-5 text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">AURUM LAB · DEMOSTRACIÓN</p>
                <h2 className="mt-3 text-2xl font-bold text-[#17232d]">¡Solicitud recibida!</h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">Tu horario quedó reservado{horariosDisponibles.find(h => h.id === horarioSeleccionado) ? ` para el ${new Intl.DateTimeFormat("es-PE",{dateStyle:"full",timeStyle:"short"}).format(new Date(horariosDisponibles.find(h => h.id === horarioSeleccionado)!.inicio_at))}` : ""}. Te esperamos en Discord para una demostración personalizada de AURUM LAB.</p>
                <a href={DISCORD_DEMO_URL} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#4752c4]">Entrar al Discord de AURUM LAB <ArrowRight className="size-4" /></a>
                <button type="button" onClick={cerrar} className="mt-3 block w-full py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-800">Cerrar</button>
              </div>
            ) : (
              <>
                <div className="pr-8">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#eadca8] bg-[#fff9df] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]"><Gem className="size-3.5" /> AURUM LAB · CONÓCENOS</span>
                  <h2 id="solicitud-demo-title" className="mt-2 text-xl font-extrabold tracking-tight text-[#17232d] sm:text-2xl">Obtén una demostración personalizada.</h2>
                  <p className="mt-1 max-w-xl text-xs leading-5 text-slate-600">Cuéntanos un poco sobre tu taller. Prepararemos un recorrido práctico de 20–30 minutos según lo que necesitas.</p>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#f8fafc] px-3 py-1.5 text-[11px] font-medium text-slate-600"><Clock3 className="size-4 text-[#987400]" /> 20–30 min · Sin compromiso</div>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-[1.04fr_.96fr] lg:items-start">
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Calendario de disponibilidad">
                  <div className="border-b border-slate-100 bg-gradient-to-r from-[#fffaf0] via-white to-white px-3 py-2.5 sm:px-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-[#987400]"><CalendarDays className="size-3.5" /> Agenda de demostraciones</span>
                        <h3 className="mt-1.5 text-base font-bold text-[#17232d]">Elige el día de tu demostración</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Sesiones online de 20–30 minutos por Discord.</p>
                      </div>
                      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                        <button type="button" aria-label="Mes anterior" onClick={() => { const next = new Date(mesVisible.getFullYear(),mesVisible.getMonth()-1,1); setMesVisible(next); const first = horariosDisponibles.find(h => { const d=new Date(h.inicio_at); return d.getFullYear()===next.getFullYear() && d.getMonth()===next.getMonth(); }); if(first) { const d=new Date(first.inicio_at); setFechaSeleccionada(d.toLocaleDateString("en-CA")); setHorarioSeleccionado(""); } }} className="grid size-8 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100"><ChevronLeft className="size-4" /></button>
                        <span className="min-w-[132px] px-2 text-center text-xs font-bold capitalize text-[#17232d]">{new Intl.DateTimeFormat("es-PE",{month:"long",year:"numeric"}).format(mesVisible)}</span>
                        <button type="button" aria-label="Mes siguiente" onClick={() => { const next = new Date(mesVisible.getFullYear(),mesVisible.getMonth()+1,1); setMesVisible(next); const first = horariosDisponibles.find(h => { const d=new Date(h.inicio_at); return d.getFullYear()===next.getFullYear() && d.getMonth()===next.getMonth(); }); if(first) { const d=new Date(first.inicio_at); setFechaSeleccionada(d.toLocaleDateString("en-CA")); setHorarioSeleccionado(""); } }} className="grid size-8 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100"><ChevronRight className="size-4" /></button>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4">
                    {cargandoHorarios ? <div className="grid min-h-48 place-items-center"><p className="text-sm text-slate-500">Consultando disponibilidad…</p></div> : errorHorarios ? <p role="alert" className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-700">{errorHorarios}</p> : horariosDisponibles.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center"><CalendarDays className="mx-auto size-7 text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-600">Aún no hay fechas disponibles</p><p className="mt-1 text-xs text-slate-400">Vuelve a visitarnos pronto para reservar tu demostración.</p></div> : <>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500"><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" /> Disponible</span><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-300" /> No disponible</span></div>
                        <span className="text-[10px] font-semibold text-slate-400">{fechasConDisponibilidad.size} días con horarios</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                        {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map((d,i)=><span key={i} className="pb-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">{d}</span>)}
                        {diasCalendario.map((dia,i)=>{const key=dia.toLocaleDateString("en-CA");const delMes=dia.getMonth()===mesVisible.getMonth();const disponible=fechasConDisponibilidad.has(key);const seleccionado=key===fechaSeleccionada;const hoy=key===new Date().toLocaleDateString("en-CA");return <button key={i} type="button" disabled={!delMes||!disponible} aria-label={`${dia.getDate()} de ${new Intl.DateTimeFormat("es-PE",{month:"long"}).format(dia)}${disponible?", disponible":", no disponible"}`} aria-pressed={seleccionado} onClick={()=>{setFechaSeleccionada(key);setHorarioSeleccionado("");setSelectorHorariosAbierto(true);}} className={"group relative flex min-h-[34px] flex-col items-center justify-center gap-0 rounded-lg border text-[11px] font-semibold transition sm:min-h-[38px] lg:min-h-[34px] "+(seleccionado?"border-[#c59a18] bg-gradient-to-b from-[#f8d976] to-[#edc34d] text-[#17232d] shadow-[0_3px_10px_rgba(197,154,24,.2)] ring-1 ring-[#c59a18]/30":disponible?"border-emerald-100 bg-emerald-50/70 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50":delMes?"border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed":"border-transparent bg-transparent text-slate-200")}>
                          <span className={"text-sm sm:text-base "+(hoy&&!seleccionado?"underline decoration-2 underline-offset-4 decoration-[#c59a18]":"")}>{dia.getDate()}</span>
                          {disponible?<span className={"size-1.5 rounded-full "+(seleccionado?"bg-[#735500]":"bg-emerald-500")}/>:<span className="h-1.5"/>}
                        </button>;})}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-400">Fecha seleccionada</p>
                          <p className="mt-0.5 truncate text-xs font-semibold capitalize text-[#17232d]">{fechaSeleccionada ? new Intl.DateTimeFormat("es-PE",{dateStyle:"medium"}).format(new Date(fechaSeleccionada+"T12:00:00")) : "Selecciona una fecha"}</p>
                        </div>
                        <button type="button" disabled={!fechaSeleccionada || horariosDelDia.length===0} onClick={()=>setSelectorHorariosAbierto(true)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#d9bd69] bg-[#fff9e8] px-3 py-2 text-xs font-bold text-[#765900] transition hover:bg-[#fff1c2] disabled:cursor-not-allowed disabled:opacity-50">
                          <Clock3 className="size-3.5" /> {horarioSeleccionado ? "Cambiar horario" : "Ver horarios"} {horariosDelDia.length>0 ? `(${horariosDelDia.length})` : ""}
                        </button>
                      </div>
                    </>}
                  </div>
                </section>
                <form onSubmit={enviar} className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:mt-0">
                  <div className="rounded-xl border border-[#eadca8] bg-gradient-to-r from-[#fffaf0] to-white px-3.5 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#987400]">Tu demostración</p>
                    {horarioSeleccionado && horariosDisponibles.find(h => h.id === horarioSeleccionado) ? <p className="mt-1 text-sm font-bold text-[#17232d]">{new Intl.DateTimeFormat("es-PE",{dateStyle:"medium",timeStyle:"short"}).format(new Date(horariosDisponibles.find(h => h.id === horarioSeleccionado)!.inicio_at))}</p> : <p className="mt-1 text-xs text-slate-500">Selecciona primero un día y horario en el calendario.</p>}
                  </div>
                  <div className="grid gap-2.5 lg:grid-cols-2">
                    <label className="text-xs font-semibold text-slate-700 lg:col-span-2">Nombre del taller o empresa *
                      <input required maxLength={140} autoComplete="organization" value={form.empresa} onChange={e => setForm(v => ({ ...v, empresa: e.target.value }))} className={inputClass + " mt-1.5"} placeholder="Ej. Joyería Aurora" />
                    </label>
                    <label className="text-xs font-semibold text-slate-700">Nombre y apellido *
                      <span className="relative mt-1.5 block"><UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input required maxLength={120} autoComplete="name" value={form.nombre} onChange={e => setForm(v => ({ ...v, nombre: e.target.value }))} className={inputClass + " pl-10"} placeholder="Tu nombre" /></span>
                    </label>
                    <label className="text-xs font-semibold text-slate-700">Teléfono / WhatsApp *
                      <span className="mt-1.5 flex gap-2">
                        <select aria-label="Código telefónico del país" value={codigoPais} onChange={e => setCodigoPais(e.target.value)} className="min-h-[46px] w-[124px] shrink-0 rounded-xl border border-slate-200 bg-white px-2 text-sm font-semibold text-[#17232d] outline-none transition focus:border-[#c59a18] focus:ring-2 focus:ring-[#f8c928]/25">
                          <option value="+51">🇵🇪 +51</option><option value="+1">🇺🇸 +1</option><option value="+54">🇦🇷 +54</option><option value="+591">🇧🇴 +591</option><option value="+55">🇧🇷 +55</option><option value="+56">🇨🇱 +56</option><option value="+57">🇨🇴 +57</option><option value="+506">🇨🇷 +506</option><option value="+53">🇨🇺 +53</option><option value="+593">🇪🇨 +593</option><option value="+503">🇸🇻 +503</option><option value="+34">🇪🇸 +34</option><option value="+502">🇬🇹 +502</option><option value="+504">🇭🇳 +504</option><option value="+52">🇲🇽 +52</option><option value="+505">🇳🇮 +505</option><option value="+507">🇵🇦 +507</option><option value="+595">🇵🇾 +595</option><option value="+1">🇩🇴 +1</option><option value="+598">🇺🇾 +598</option><option value="+58">🇻🇪 +58</option><option value="+49">🇩🇪 +49</option><option value="+33">🇫🇷 +33</option><option value="+39">🇮🇹 +39</option><option value="+44">🇬🇧 +44</option><option value="+81">🇯🇵 +81</option>
                        </select>
                        <span className="relative min-w-0 flex-1"><Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input required type="tel" inputMode="numeric" maxLength={20} autoComplete="tel-national" value={form.telefono} onChange={e => setForm(v => ({ ...v, telefono: e.target.value.replace(/[^0-9\\s()-]/g, "") }))} className={inputClass + " pl-10"} placeholder="Número de WhatsApp" /></span>
                      </span>
                    </label>
                    <label className="text-xs font-semibold text-slate-700 lg:col-span-2">Correo electrónico *
                      <span className="relative mt-1.5 block"><Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input required type="email" maxLength={160} autoComplete="email" value={form.email} onChange={e => setForm(v => ({ ...v, email: e.target.value }))} className={inputClass + " pl-10"} placeholder="tu@correo.com" /></span>
                    </label>
                    <label className="text-xs font-semibold text-slate-700 lg:col-span-2">¿Qué te gustaría conocer?
                      <select value={form.interes} onChange={e => setForm(v => ({ ...v, interes: e.target.value }))} className={inputClass + " mt-1.5"}>
                        {intereses.map(item => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                    <label>Sitio web<input tabIndex={-1} autoComplete="off" value={form.sitio} onChange={e => setForm(v => ({ ...v, sitio: e.target.value }))} /></label>
                  </div>
                  <p className="text-[11px] leading-5 text-slate-500">Al enviar, autorizas a AURUM LAB a contactarte para coordinar esta demostración. Tus datos se utilizarán únicamente para atender tu solicitud.</p>
                  {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
                  <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
                    <button type="button" onClick={cerrar} disabled={cargando} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Ahora no</button>
                    <button type="submit" disabled={cargando || !horarioSeleccionado || cargandoHorarios || horariosDisponibles.length===0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f8c928] px-6 py-3 text-sm font-bold text-[#17232d] transition hover:bg-[#ffdf65] disabled:cursor-wait disabled:opacity-60">{cargando ? "Enviando solicitud…" : "Solicitar mi demostración"} {!cargando && <ArrowRight className="size-4" />}</button>
                  </div>
                </form>
                </div>
                {selectorHorariosAbierto ? <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-[#101820]/55 p-4 backdrop-blur-sm" onMouseDown={(event)=>{if(event.target===event.currentTarget)setSelectorHorariosAbierto(false);}}>
                  <section role="dialog" aria-modal="true" aria-labelledby="demo-horarios-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-[#eadca8] bg-white shadow-2xl">
                    <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-[#fffaf0] to-white px-5 py-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[.15em] text-[#987400]">AURUM LAB · Agenda</span>
                        <h3 id="demo-horarios-title" className="mt-1 text-base font-bold text-[#17232d]">Elige tu horario</h3>
                        <p className="mt-1 text-xs capitalize text-slate-500">{fechaSeleccionada ? new Intl.DateTimeFormat("es-PE",{dateStyle:"full"}).format(new Date(fechaSeleccionada+"T12:00:00")) : ""}</p>
                      </div>
                      <button type="button" onClick={()=>setSelectorHorariosAbierto(false)} aria-label="Cerrar horarios" className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="size-5"/></button>
                    </div>
                    <div className="space-y-2 p-4">
                      {horariosDelDia.length ? horariosDelDia.map(h=>{const elegido=horarioSeleccionado===h.id;return <button key={h.id} type="button" aria-pressed={elegido} onClick={()=>{setHorarioSeleccionado(h.id);setSelectorHorariosAbierto(false);}} className={"flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition "+(elegido?"border-[#c59a18] bg-[#fff8df] ring-1 ring-[#c59a18]/25":"border-slate-200 bg-white hover:border-[#d5b45f] hover:bg-[#fffdf6]")}>
                        <span className="flex items-center gap-3"><span className={"grid size-9 place-items-center rounded-lg "+(elegido?"bg-[#f5e4a6] text-[#765900]":"bg-slate-50 text-slate-500")}><Clock3 className="size-4"/></span><span><span className="block text-sm font-bold tabular-nums text-[#17232d]">{new Intl.DateTimeFormat("es-PE",{hour:"2-digit",minute:"2-digit"}).format(new Date(h.inicio_at))} – {new Intl.DateTimeFormat("es-PE",{hour:"2-digit",minute:"2-digit"}).format(new Date(h.fin_at))}</span><span className="mt-0.5 block text-[10px] text-slate-500">Sesión online · 20–30 minutos</span></span></span>
                        <span className={"rounded-full px-2.5 py-1 text-[10px] font-bold "+(elegido?"bg-[#f5e4a6] text-[#765900]":"bg-emerald-50 text-emerald-700")}>{elegido?"Elegido":"Disponible"}</span>
                      </button>;}) : <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">No quedan horarios disponibles para esta fecha.</p>}
                    </div>
                    <div className="flex justify-end border-t border-slate-100 px-4 py-3"><button type="button" onClick={()=>setSelectorHorariosAbierto(false)} className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50">Cerrar</button></div>
                  </section>
                </div> : null}
              </>
            )}
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
