import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle, MessageCircle, X } from "lucide-react";
import { enviarConsultaComercial } from "@/lib/contacto.functions";

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
      <button type="button" onClick={() => { setAbierto(true); setEnviado(false); }} className={className}>
        <MessageCircle className="size-4" /> Hablemos
      </button>
      {abierto ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) cerrar(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="contacto-comercial-titulo" className="relative my-auto w-full max-w-xl rounded-3xl border border-[#d8bd7b]/30 bg-[#171815] p-5 text-[#f5f0e7] shadow-[0_30px_100px_rgba(0,0,0,.65)] sm:p-8">
            <button type="button" aria-label="Cerrar contacto" onClick={cerrar} className="absolute right-4 top-4 rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"><X className="size-5" /></button>
            {!enviado ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d8bd7b]">Taller del Joyero</p>
                <h2 id="contacto-comercial-titulo" className="mt-2 pr-8 font-display text-3xl text-white">Cuéntanos qué te interesa</h2>
                <p className="mt-2 max-w-lg text-sm leading-6 text-white/60">Déjanos tus datos y te explicaremos personalmente cómo podemos ayudarte.</p>
                <form onSubmit={enviar} className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs text-white/70">Nombre *
                      <input required minLength={2} maxLength={120} autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/25 px-3.5 py-3 text-sm text-white outline-none focus:border-[#d8bd7b]/70" placeholder="Tu nombre" />
                    </label>
                    <label className="block text-xs text-white/70">Correo electrónico *
                      <input required type="email" maxLength={160} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/25 px-3.5 py-3 text-sm text-white outline-none focus:border-[#d8bd7b]/70" placeholder="tu@correo.com" />
                    </label>
                  </div>
                  <label className="block text-xs text-white/70">Teléfono o WhatsApp (opcional)
                    <input type="tel" maxLength={40} autoComplete="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/25 px-3.5 py-3 text-sm text-white outline-none focus:border-[#d8bd7b]/70" placeholder="Tu número de contacto" />
                  </label>
                  <label className="block text-xs text-white/70">¿Sobre qué te gustaría conversar? *
                    <select required value={interes} onChange={(e) => setInteres(e.target.value as typeof interes)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#11120f] px-3.5 py-3 text-sm text-white outline-none focus:border-[#d8bd7b]/70">
                      {INTERESES.map((item) => <option key={item.value} value={item.value}>{item.label} — {item.detail}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs text-white/70">Mensaje *
                    <textarea required minLength={5} maxLength={2000} rows={4} value={mensaje} onChange={(e) => setMensaje(e.target.value)} className="mt-2 w-full resize-y rounded-xl border border-white/15 bg-black/25 px-3.5 py-3 text-sm text-white outline-none focus:border-[#d8bd7b]/70" placeholder="Cuéntanos brevemente qué te gustaría conocer..." />
                  </label>
                  <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
                    <label>Sitio web <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
                  </div>
                  {error ? <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}
                  <button disabled={cargando} type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#dfc583] to-[#c2a15c] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#211c12] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-65">
                    {cargando ? <><LoaderCircle className="size-4 animate-spin" /> Enviando...</> : <>Enviar consulta <ArrowRight className="size-4" /></>}
                  </button>
                  <p className="text-center text-[11px] leading-5 text-white/40">Usaremos tus datos únicamente para responder a esta consulta.</p>
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
