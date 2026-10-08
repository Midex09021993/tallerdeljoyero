import { useState, type FormEvent } from "react";
import { Building2, Eye, EyeOff, MapPin, Mail, Phone, UserRound, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { registrarTaller } from "@/lib/cuentas.functions";

type Props = {
  className?: string;
};

export function RegistroTaller({ className = "" }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [creado, setCreado] = useState(false);
  const [correoEnviado, setCorreoEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    taller: "",
    email: "",
    telefono: "",
    ciudad: "",
    password: "",
  });

  function cerrar() {
    if (cargando) return;
    setAbierto(false);
    setCreado(false);
    setCorreoEnviado(false);
    setError("");
  }

  async function registrar(e: FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      const resultado = await registrarTaller({ data: form });
      setCorreoEnviado(resultado.correoEnviado === true);
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: resultado.email,
        password: form.password,
      });

      if (loginError) throw new Error("El taller se creó, pero no se pudo iniciar la sesión automáticamente.");
      setCreado(true);
      window.setTimeout(() => {
        window.location.href = "/";
      }, 450);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "No se pudo crear el taller.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAbierto(true);
          setCreado(false);
          setCorreoEnviado(false);
          setError("");
        }}
        className={className || "inline-flex items-center gap-2 rounded-lg border border-gold/50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gold transition hover:bg-gold/10"}
      >
        Crear mi taller
      </button>

      {abierto ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="registro-taller-title">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-gold/25 bg-[#111315] p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-gold">Aurum Lab · Tu taller</p>
                <h2 id="registro-taller-title" className="mt-2 text-2xl font-semibold text-white">Crea tu taller</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/55">
                  Un solo registro. Aurum crea tu taller, tu cuenta y tu acceso automáticamente.
                </p>
              </div>
              <button type="button" onClick={cerrar} className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white" aria-label="Cerrar">
                <X className="size-5" />
              </button>
            </div>

            {creado ? (
              <div className="mt-8 rounded-xl border border-gold/25 bg-gold/5 p-6 text-center">
                <Building2 className="mx-auto size-8 text-gold" />
                <p className="mt-3 text-lg font-semibold text-gold">Tu taller está listo</p>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {correoEnviado
                    ? "Tu cuenta y tu taller fueron creados. También enviamos a tu correo el acceso y el enlace para entrar."
                    : "Tu cuenta y tu taller fueron creados. Puedes entrar ahora; el correo de bienvenida quedó pendiente de configuración de envío."}
                </p>
              </div>
            ) : (
              <form onSubmit={registrar} className="mt-7 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-[10px] uppercase tracking-wider text-white/45">
                    Tu nombre
                    <span className="relative mt-2 block">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
                      <input required maxLength={120} value={form.nombre} onChange={(e) => setForm((v) => ({ ...v, nombre: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-black/25 py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-gold" />
                    </span>
                  </label>

                  <label className="block text-[10px] uppercase tracking-wider text-white/45">
                    Nombre del taller
                    <span className="relative mt-2 block">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
                      <input required maxLength={160} value={form.taller} onChange={(e) => setForm((v) => ({ ...v, taller: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-black/25 py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-gold" />
                    </span>
                  </label>

                  <label className="block text-[10px] uppercase tracking-wider text-white/45">
                    Correo
                    <span className="relative mt-2 block">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
                      <input required type="email" maxLength={160} autoComplete="email" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-black/25 py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-gold" />
                    </span>
                  </label>

                  <label className="block text-[10px] uppercase tracking-wider text-white/45">
                    WhatsApp / teléfono
                    <span className="relative mt-2 block">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
                      <input maxLength={30} autoComplete="tel" value={form.telefono} onChange={(e) => setForm((v) => ({ ...v, telefono: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-black/25 py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-gold" />
                    </span>
                  </label>

                  <label className="block text-[10px] uppercase tracking-wider text-white/45">
                    Ciudad
                    <span className="relative mt-2 block">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
                      <input maxLength={80} value={form.ciudad} onChange={(e) => setForm((v) => ({ ...v, ciudad: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-black/25 py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-gold" />
                    </span>
                  </label>

                  <label className="block text-[10px] uppercase tracking-wider text-white/45">
                    Contraseña
                    <span className="relative mt-2 block">
                      <input required minLength={8} maxLength={128} type={mostrarPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-black/25 py-3 pl-3 pr-10 text-sm text-white outline-none focus:border-gold" />
                      <button type="button" onClick={() => setMostrarPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-gold" aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                        {mostrarPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </span>
                  </label>
                </div>

                <p className="text-[11px] leading-relaxed text-white/40">
                  Usarás este correo para entrar a Aurum Lab. No necesitas crear primero una sede, participante ni usuario por separado.
                </p>

                {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button type="button" onClick={cerrar} className="rounded-lg border border-white/10 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white/60 hover:bg-white/5">
                    Cancelar
                  </button>
                  <button type="submit" disabled={cargando} className="rounded-lg bg-gold px-5 py-3 text-xs font-semibold uppercase tracking-wider text-ink disabled:opacity-50">
                    {cargando ? "Creando taller…" : "Crear mi taller"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
