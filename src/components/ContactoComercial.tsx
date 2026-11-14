import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle, MessageCircle, X } from "lucide-react";
import { enviarConsultaComercial } from "@/lib/contacto.functions";
import { registrarEvento } from "@/lib/analytics";

const INTERESES = [
  { value: "aurum_lab", label: "AURUM LAB", detail: "La plataforma para talleres de joyería" },
  { value: "aurum_render", label: "Aurum Render", detail: "Visualización y renderizado 3D de joyas" },
  { value: "otra_consulta", label: "Otra consulta", detail: "Quiero conocer más sobre ustedes" },
] as const;

export function ContactoComercial({ className = "" }: { className?: string }) {
  const [abierto, setAbierto] = useState(false);
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
      <button type="button" aria-haspopup="dialog" aria-expanded={abierto} onClick={() => { setAbierto(true); registrarEvento("contact_started"); setEnviado(false); }} className={className}>
        <MessageCircle className="size-4" /> Hablemos
      </button>
      {abierto ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) cerrar(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="contacto-comercial-titulo" className="relative my-auto max-h-[min(90dvh,850px)] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-[#d8bd7b]/35 bg-[#171815] p-5 text-[#f5f0e7] shadow-[0_32px_100px_rgba(0,0,0,.7)] sm:p-8 md:p-9">
            <button type="button" aria-label="Cerrar contacto" onClick={cerrar} className="absolute right-4 top-4 grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-white/60 transition hover:border-[#d8bd7b]/50 hover:bg-[#d8bd7b]/10 hover:text-[#e7cd91] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8bd7b]"><X className="size-5" /></button>
            {!enviado ? (
              <>
                <div className="mb-5 flex items-center gap-3"><span className="h-px w-8 bg-[#d8bd7b]/80" /><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#d8bd7b]">Taller del Joyero <span className="mx-1.5 text-white/25">/</span> Atención personalizada</p></div>
                <h2 id="contacto-comercial-titulo" className="mt-2 pr-10 font-display text-3xl leading-tight text-white sm:text-4xl">Cuéntanos qué te interesa</h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-white/65">Déjanos tus datos y te explicaremos personalmente cómo podemos ayudarte.</p>
                <form onSubmit={enviar} className="mt-7 space-y-5 border-t border-white/10 pt-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs text-white/70">Nombre *
                      <input required minLength={2} maxLength={120} autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-2.5 min-h-12 w-full rounded-xl border border-white/12 bg-[#10110f] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 hover:border-white/25 focus:border-[#d8bd7b]/80 focus:ring-2 focus:ring-[#d8bd7b]/15" placeholder="Tu nombre" />
                    </label>
                    <label className="block text-xs text-white/70">Correo electrónico *
                      <input required type="email" maxLength={160} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/25 px-3.5 py-3 text-sm text-white outline-none focus:border-[#d8bd7b]/70" placeholder="tu@correo.com" />
                    </label>
                  </div>
                  <label className="block text-xs text-white/70">Teléfono o WhatsApp (opcional)
                    <input type="tel" maxLength={40} autoComplete="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/25 px-3.5 py-3 text-sm text-white outline-none focus:border-[#d8bd7b]/70" placeholder="Tu número de contacto" />
                  </label>
                  <label className="block text-xs text-white/70">¿Sobre qué te gustaría conversar? *
                    <select required value={interes} onChange={(e) => setInteres(e.target.value as typeof interes)} className="mt-2.5 min-h-12 w-full rounded-xl border border-white/12 bg-[#10110f] px-4 py-3 text-sm text-white outline-none transition hover:border-white/25 focus:border-[#d8bd7b]/80 focus:ring-2 focus:ring-[#d8bd7b]/15">
                      {INTERESES.map((item) => <option key={item.value} value={item.value}>{item.label} — {item.detail}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs text-white/70">Mensaje *
                    <textarea required minLength={5} maxLength={2000} rows={4} value={mensaje} onChange={(e) => setMensaje(e.target.value)} className="mt-2.5 min-h-32 w-full resize-y rounded-xl border border-white/12 bg-[#10110f] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/30 hover:border-white/25 focus:border-[#d8bd7b]/80 focus:ring-2 focus:ring-[#d8bd7b]/15" placeholder="Cuéntanos brevemente qué te gustaría conocer..." />
                  </label>
                  <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
                    <label>Sitio web <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
                  </div>
                  {error ? <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}
                  <button disabled={cargando} type="submit" className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#e6cf91] to-[#c4a35e] px-5 py-3 text-xs font-extrabold uppercase tracking-[0.16em] text-[#211c12] shadow-[0_8px_24px_rgba(196,163,94,.16)] transition hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_12px_30px_rgba(196,163,94,.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e6cf91] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171815] disabled:cursor-wait disabled:opacity-65">
                    {cargando ? <><LoaderCircle className="size-4 animate-spin" /> Enviando...</> : <>Enviar consulta <ArrowRight className="size-4" /></>}
                  </button>
                  <p className="flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-white/45"><span className="size-1.5 rounded-full bg-[#d8bd7b]/70" />Tus datos se utilizarán únicamente para responder a esta consulta.</p>
                </form>
              </>
            ) : (
              <div className="py-10 text-center">
                <CheckCircle2 className="mx-auto size-12 text-[#d8bd7b]" />
                <h2 id="contacto-comercial-titulo" className="mt-5 font-display text-3xl text-white">¡Gracias por escribirnos!</h2>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/65">Tu consulta quedó registrada. Revisaremos tu mensaje y nos pondremos en contacto contigo.</p>
                <button type="button" onClick={cerrar} className="mt-7 rounded-xl border border-[#d8bd7b]/45 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#d8bd7b] hover:bg-white/5">Cerrar</button>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
