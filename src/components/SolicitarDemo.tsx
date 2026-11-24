import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, CheckCircle2, Clock3, Gem, Mail, Phone, UserRound, X } from "lucide-react";
import { supabasePublic } from "@/integrations/supabase/client";
import { registrarEvento } from "@/lib/analytics";

type Props = { className?: string };

const intereses = [
  "AURUM RENDER y diseño 3D",
  "Calculadoras y herramientas técnicas",
  "Gestión de clientes, cotizaciones y pedidos",
  "Mi Nube y catálogo digital",
  "Quiero conocer toda la plataforma",
];

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#17232d] outline-none transition placeholder:text-slate-400 focus:border-[#c59a18] focus:ring-2 focus:ring-[#f8c928]/25";

export function SolicitarDemo({ className = "" }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [codigoPais, setCodigoPais] = useState("+51");
  const [form, setForm] = useState({ empresa: "", nombre: "", telefono: "", email: "", interes: intereses[4], horario: "", sitio: "" });

  function cerrar() {
    if (cargando) return;
    setAbierto(false);
    setError("");
    setEnviado(false);
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
      const { error: insertError } = await (supabasePublic as any)
        .from("solicitudes_demo")
        .insert({
          empresa: form.empresa.trim(),
          nombre: form.nombre.trim(),
          telefono: form.telefono.trim() ? `${codigoPais}${form.telefono.replace(/\\D/g, "")}` : "",
          email: form.email.trim().toLowerCase(),
          interes: form.interes,
          horario_preferido: form.horario || null,
          origen: "landing_home",
        });
      if (insertError) throw insertError;
      registrarEvento("demo_request_submitted", { source: "landing_home", interest: form.interes });
      setEnviado(true);
    } catch (err) {
      console.error("[solicitud-demo] No se pudo registrar la solicitud", err);
      setError("No pudimos enviar tu solicitud. Inténtalo nuevamente o escríbenos por correo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => { setAbierto(true); registrarEvento("demo_request_started", { source: "landing_home" }); }}
        className={className || "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#f8c928] px-6 py-3 text-sm font-bold text-[#17232d] shadow-lg shadow-amber-900/10 transition hover:-translate-y-0.5 hover:bg-[#ffdf65] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4aa19] focus-visible:ring-offset-2"}>
        Solicitar una demostración <ArrowRight className="size-4" />
      </button>

      {abierto && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-[#101820]/65 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="solicitud-demo-title">
          <div className="relative my-auto max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#eadca8] bg-white p-5 shadow-2xl sm:p-8">
            <button type="button" onClick={cerrar} disabled={cargando} aria-label="Cerrar formulario" className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="size-5" /></button>
            {enviado ? (
              <div className="px-2 py-10 text-center sm:px-8">
                <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#fff4c4] text-[#987400]"><CheckCircle2 className="size-8" /></span>
                <p className="mt-5 text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">AURUM LAB · DEMOSTRACIÓN</p>
                <h2 className="mt-3 text-2xl font-bold text-[#17232d]">¡Solicitud recibida!</h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">Gracias por tu interés. Nuestro equipo revisará tus datos para coordinar una demostración personalizada contigo.</p>
                <button type="button" onClick={cerrar} className="mt-7 rounded-xl bg-[#17232d] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#293b49]">Cerrar</button>
              </div>
            ) : (
              <>
                <div className="pr-8">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#eadca8] bg-[#fff9df] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]"><Gem className="size-3.5" /> AURUM LAB · CONÓCENOS</span>
                  <h2 id="solicitud-demo-title" className="mt-4 text-2xl font-extrabold tracking-tight text-[#17232d] sm:text-3xl">Obtén una demostración personalizada.</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Cuéntanos un poco sobre tu taller. Prepararemos un recorrido práctico de 20–30 minutos según lo que necesitas.</p>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#f8fafc] px-3 py-2 text-xs font-medium text-slate-600"><Clock3 className="size-4 text-[#987400]" /> 20–30 min · Sin compromiso</div>
                </div>
                <form onSubmit={enviar} className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Nombre del taller o empresa *
                      <input required maxLength={140} autoComplete="organization" value={form.empresa} onChange={e => setForm(v => ({ ...v, empresa: e.target.value }))} className={inputClass + " mt-1.5"} placeholder="Ej. Joyería Aurora" />
                    </label>
                    <label className="text-xs font-semibold text-slate-700">Nombre y apellido *
                      <span className="relative mt-1.5 block"><UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input required maxLength={120} autoComplete="name" value={form.nombre} onChange={e => setForm(v => ({ ...v, nombre: e.target.value }))} className={inputClass + " pl-10"} placeholder="Tu nombre" /></span>
                    </label>
                    <label className="text-xs font-semibold text-slate-700">Teléfono / WhatsApp *
                      <span className="mt-1.5 flex gap-2">
                        <select aria-label="Código telefónico del país" value={codigoPais} onChange={e => setCodigoPais(e.target.value)} className="min-h-[46px] w-[116px] shrink-0 rounded-xl border border-slate-200 bg-white px-2 text-sm font-semibold text-[#17232d] outline-none transition focus:border-[#c59a18] focus:ring-2 focus:ring-[#f8c928]/25">
                          <option value="+51">🇵🇪 +51</option><option value="+1">🇺🇸 +1</option><option value="+54">🇦🇷 +54</option><option value="+591">🇧🇴 +591</option><option value="+55">🇧🇷 +55</option><option value="+56">🇨🇱 +56</option><option value="+57">🇨🇴 +57</option><option value="+506">🇨🇷 +506</option><option value="+53">🇨🇺 +53</option><option value="+593">🇪🇨 +593</option><option value="+503">🇸🇻 +503</option><option value="+34">🇪🇸 +34</option><option value="+502">🇬🇹 +502</option><option value="+504">🇭🇳 +504</option><option value="+52">🇲🇽 +52</option><option value="+505">🇳🇮 +505</option><option value="+507">🇵🇦 +507</option><option value="+595">🇵🇾 +595</option><option value="+1">🇩🇴 +1</option><option value="+598">🇺🇾 +598</option><option value="+58">🇻🇪 +58</option><option value="+49">🇩🇪 +49</option><option value="+33">🇫🇷 +33</option><option value="+39">🇮🇹 +39</option><option value="+44">🇬🇧 +44</option><option value="+81">🇯🇵 +81</option>
                        </select>
                        <span className="relative min-w-0 flex-1"><Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input required type="tel" inputMode="numeric" maxLength={20} autoComplete="tel-national" value={form.telefono} onChange={e => setForm(v => ({ ...v, telefono: e.target.value.replace(/[^0-9\\s()-]/g, "") }))} className={inputClass + " pl-10"} placeholder="Número de WhatsApp" /></span>
                      </span>
                    </label>
                    <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Correo electrónico *
                      <span className="relative mt-1.5 block"><Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input required type="email" maxLength={160} autoComplete="email" value={form.email} onChange={e => setForm(v => ({ ...v, email: e.target.value }))} className={inputClass + " pl-10"} placeholder="tu@correo.com" /></span>
                    </label>
                    <label className="text-xs font-semibold text-slate-700 sm:col-span-2">¿Qué te gustaría conocer?
                      <select value={form.interes} onChange={e => setForm(v => ({ ...v, interes: e.target.value }))} className={inputClass + " mt-1.5"}>
                        {intereses.map(item => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-700 sm:col-span-2">¿En qué horario podemos contactarte? <span className="font-normal text-slate-400">(opcional)</span>
                      <select value={form.horario} onChange={e => setForm(v => ({ ...v, horario: e.target.value }))} className={inputClass + " mt-1.5"}>
                        <option value="">Cualquier horario</option><option value="Mañana">Mañana</option><option value="Tarde">Tarde</option>
                      </select>
                    </label>
                  </div>
                  <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                    <label>Sitio web<input tabIndex={-1} autoComplete="off" value={form.sitio} onChange={e => setForm(v => ({ ...v, sitio: e.target.value }))} /></label>
                  </div>
                  <p className="text-[11px] leading-5 text-slate-500">Al enviar, autorizas a AURUM LAB a contactarte para coordinar esta demostración. Tus datos se utilizarán únicamente para atender tu solicitud.</p>
                  {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                    <button type="button" onClick={cerrar} disabled={cargando} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Ahora no</button>
                    <button type="submit" disabled={cargando} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f8c928] px-6 py-3 text-sm font-bold text-[#17232d] transition hover:bg-[#ffdf65] disabled:cursor-wait disabled:opacity-60">{cargando ? "Enviando solicitud…" : "Solicitar mi demostración"} {!cargando && <ArrowRight className="size-4" />}</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
