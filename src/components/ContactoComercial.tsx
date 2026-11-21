import { useState, type FormEvent } from "react";
import { ArrowRight, Bot, CheckCircle2, LoaderCircle, MessageCircle, X } from "lucide-react";
import { AuriChat } from "@/components/auri/AuriChat";
import { enviarConsultaComercial } from "@/lib/contacto.functions";
import { registrarEvento } from "@/lib/analytics";

const INTERESES = [
  { value: "aurum_lab", label: "AURUM LAB", detail: "La plataforma para talleres de joyería" },
  { value: "aurum_render", label: "Aurum Render", detail: "Visualización y renderizado 3D de joyas" },
  { value: "otra_consulta", label: "Otra consulta", detail: "Quiero conocer más sobre ustedes" },
] as const;

export function ContactoComercial({ className = "" }: { className?: string }) {
  const [abierto, setAbierto] = useState(false);
  const [mostrarAuri, setMostrarAuri] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [interes, setInteres] = useState<(typeof INTERESES)[number]["value"]>("aurum_lab");
  const [mensaje, setMensaje] = useState("");
  const [website, setWebsite] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCargando(true);
    try {
      const result = await enviarConsultaComercial({
        data: { nombre, email, telefono, interes, mensaje, website },
      });
      if (!result.ok) throw new Error("No se pudo enviar la consulta.");
      registrarEvento("contact_submitted", { interest: interes });
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos enviar tu consulta. Inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  function cerrar() {
    if (cargando) return;
    setAbierto(false);
    setError("");
  }

  return (
    <>
      <button type="button" aria-haspopup="dialog" aria-expanded={abierto} onClick={() => { setAbierto(true); setMostrarAuri(false); registrarEvento("contact_started"); setEnviado(false); }} className={className}>
        <MessageCircle className="size-4" /> Hablemos
      </button>
      {abierto ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#17212b]/55 p-3 backdrop-blur-md sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) cerrar(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="contacto-comercial-titulo" className="relative my-auto max-h-[min(90dvh,850px)] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-[#c7a65b]/35 bg-[#fcfbf8] p-5 text-[#303943] shadow-[0_32px_100px_rgba(28,35,42,.24)] sm:p-8 md:p-9">
            <button type="button" aria-label="Cerrar contacto" onClick={cerrar} className="absolute right-4 top-4 grid size-10 place-items-center rounded-full border border-[#dedbd3] bg-white text-[#68727c] transition hover:border-[#c7a65b] hover:bg-[#f7f2e6] hover:text-[#9b762e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7a65b]"><X className="size-5" /></button>
            {!enviado && mostrarAuri ? (
              <>
                <div className="mb-4 flex items-center justify-between gap-3 pr-10">
                  <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a98535]">Hablemos con AURI</p><h2 id="contacto-comercial-titulo" className="mt-1 font-display text-2xl text-[#27333e]">Tu asistente de AURUM LAB</h2></div>
                  <button type="button" onClick={() => setMostrarAuri(false)} className="shrink-0 rounded-lg border border-[#d9c58e] px-3 py-2 text-xs font-semibold text-[#96732e] hover:bg-[#f7f2e6]">Formulario</button>
                </div>
                <AuriChat modo="publico" onContact={() => setMostrarAuri(false)} />
              </>
            ) : !enviado ? (
              <>
                <div className="mb-5 flex items-center gap-3"><span className="h-px w-8 bg-[#b99642]/80" /><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#a98535]">Taller del Joyero <span className="mx-1.5 text-[#aeb4b9]">/</span> Atención personalizada</p></div>
                <h2 id="contacto-comercial-titulo" className="mt-2 pr-10 font-display text-3xl leading-tight text-[#27333e] sm:text-4xl">Cuéntanos qué te interesa</h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-[#687580]">Déjanos tus datos y te explicaremos personalmente cómo podemos ayudarte.</p>
                <button type="button" onClick={() => setMostrarAuri(true)} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#c7a65b]/65 bg-white px-4 py-3 text-sm font-semibold text-[#876a2e] shadow-sm transition hover:bg-[#faf6eb] sm:w-auto"><Bot className="size-4" /> Conversar con AURI <span className="rounded-full bg-[#edf4ff] px-2 py-0.5 text-[10px] font-bold text-[#3979bc]">Gemini</span></button>
                <form onSubmit={enviar} className="mt-7 space-y-5 border-t border-[#e6e1d7] pt-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs text-[#596571]">Nombre *
                      <input required minLength={2} maxLength={120} autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-2.5 min-h-12 w-full rounded-xl border border-[#dedbd3] bg-white px-4 py-3 text-sm text-[#303943] outline-none transition placeholder:text-[#a0a5a8] hover:border-[#c7a65b] focus:border-[#b99642] focus:ring-2 focus:ring-[#c7a65b]/15" placeholder="Tu nombre" />
                    </label>
                    <label className="block text-xs text-[#596571]">Correo electrónico *
                      <input required type="email" maxLength={160} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dedbd3] bg-white px-3.5 py-3 text-sm text-[#303943] outline-none focus:border-[#b99642] focus:ring-2 focus:ring-[#c7a65b]/15" placeholder="tu@correo.com" />
                    </label>
                  </div>
                  <label className="block text-xs text-[#596571]">Teléfono o WhatsApp (opcional)
                    <input type="tel" maxLength={40} autoComplete="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dedbd3] bg-white px-3.5 py-3 text-sm text-[#303943] outline-none focus:border-[#b99642] focus:ring-2 focus:ring-[#c7a65b]/15" placeholder="Tu número de contacto" />
                  </label>
                  <label className="block text-xs text-[#596571]">¿Sobre qué te gustaría conversar? *
                    <select required value={interes} onChange={(e) => setInteres(e.target.value as typeof interes)} className="mt-2.5 min-h-12 w-full rounded-xl border border-[#dedbd3] bg-white px-4 py-3 text-sm text-[#303943] outline-none transition hover:border-[#c7a65b] focus:border-[#b99642] focus:ring-2 focus:ring-[#c7a65b]/15">
                      {INTERESES.map((item) => <option key={item.value} value={item.value}>{item.label} — {item.detail}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs text-[#596571]">Mensaje *
                    <textarea required minLength={5} maxLength={2000} rows={4} value={mensaje} onChange={(e) => setMensaje(e.target.value)} className="mt-2.5 min-h-32 w-full resize-y rounded-xl border border-[#dedbd3] bg-white px-4 py-3 text-sm leading-6 text-[#303943] outline-none transition placeholder:text-[#a0a5a8] hover:border-[#c7a65b] focus:border-[#b99642] focus:ring-2 focus:ring-[#c7a65b]/15" placeholder="Cuéntanos brevemente qué te gustaría conocer..." />
                  </label>
                  <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
                    <label>Sitio web <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
                  </div>
                  {error ? <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}
                  <button disabled={cargando} type="submit" className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#e5cc87] to-[#c4a044] px-5 py-3 text-xs font-extrabold uppercase tracking-[0.16em] text-[#252b31] shadow-[0_8px_24px_rgba(196,163,94,.16)] transition hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_12px_30px_rgba(196,163,94,.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e6cf91] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fcfbf8] disabled:cursor-wait disabled:opacity-65">
                    {cargando ? <><LoaderCircle className="size-4 animate-spin" /> Enviando...</> : <>Enviar consulta <ArrowRight className="size-4" /></>}
                  </button>
                  <p className="flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-[#7d858b]"><span className="size-1.5 rounded-full bg-[#d8bd7b]/70" />Tus datos se utilizarán únicamente para responder a esta consulta.</p>
                </form>
              </>
            ) : (
              <div className="py-10 text-center">
                <CheckCircle2 className="mx-auto size-12 text-[#a98535]" />
                <h2 id="contacto-comercial-titulo" className="mt-5 font-display text-3xl text-[#27333e]">¡Gracias por escribirnos!</h2>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#687580]">Tu consulta quedó registrada. Revisaremos tu mensaje y nos pondremos en contacto contigo.</p>
                <button type="button" onClick={cerrar} className="mt-7 rounded-xl border border-[#c7a65b]/55 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#96732e] hover:bg-[#f7f2e6]">Cerrar</button>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
