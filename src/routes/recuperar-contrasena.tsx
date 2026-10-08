import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/recuperar-contrasena")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Recuperar contraseña · Aurum Lab" },
      { name: "description", content: "Restablece de forma segura tu contraseña de Aurum Lab." },
    ],
  }),
  component: RecuperarContrasenaPage,
});

function RecuperarContrasenaPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [modoCambio, setModoCambio] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setModoCambio(true);
        setError("");
      }
    });

    void supabase.auth.getSession().then(({ data: sessionData }) => {
      if (sessionData.session) {
        setModoCambio(true);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function solicitar(e: FormEvent) {
    e.preventDefault();
    setError("");
    setEnviado(false);
    setCargando(true);

    try {
      const value = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new Error("Ingresa el correo con el que registraste tu cuenta.");
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(value, {
        redirectTo: `${window.location.origin}/recuperar-contrasena`,
      });

      if (resetError) throw new Error("No se pudo enviar el enlace de recuperación. Inténtalo nuevamente.");
      setEnviado(true);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "No se pudo solicitar la recuperación.");
    } finally {
      setCargando(false);
    }
  }

  async function cambiarPassword(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (nuevaPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (nuevaPassword !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: nuevaPassword });
      if (updateError) {
        throw new Error(/weak|easy to guess/i.test(updateError.message)
          ? "La contraseña es demasiado fácil de adivinar. Usa una más segura."
          : "No se pudo actualizar la contraseña.");
      }
      setGuardado(true);
      await supabase.auth.signOut();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "No se pudo actualizar la contraseña.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#090a0b] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[90vh] w-full max-w-md items-center justify-center">
        <section className="w-full rounded-2xl border border-white/10 bg-[#111315] p-7 shadow-2xl sm:p-9">
          <div className="mb-7 flex items-center justify-between">
            <Link to="/auth" className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-gold">
              <ArrowLeft className="size-4" /> Volver al acceso
            </Link>
            <span className="text-xs font-semibold tracking-[0.2em] text-gold">AURUM LAB</span>
          </div>

          {guardado ? (
            <div className="text-center">
              <ShieldCheck className="mx-auto size-10 text-gold" />
              <h1 className="mt-4 text-2xl font-semibold">Contraseña actualizada</h1>
              <p className="mt-3 text-sm leading-relaxed text-white/55">
                Tu contraseña fue cambiada correctamente. Ya puedes entrar nuevamente a Aurum Lab.
              </p>
              <button type="button" onClick={() => navigate({ to: "/auth" })} className="mt-7 w-full rounded-lg bg-gold py-3 text-xs font-semibold uppercase tracking-wider text-ink">
                Ir a iniciar sesión
              </button>
            </div>
          ) : modoCambio ? (
            <>
              <KeyRound className="size-8 text-gold" />
              <h1 className="mt-4 text-2xl font-semibold">Crea una nueva contraseña</h1>
              <p className="mt-2 text-sm leading-relaxed text-white/55">Elige una contraseña segura de al menos 8 caracteres.</p>

              <form onSubmit={cambiarPassword} className="mt-7 space-y-5">
                <label className="block text-[10px] uppercase tracking-wider text-white/50">
                  Nueva contraseña
                  <span className="relative mt-2 block">
                    <input required minLength={8} maxLength={128} type={mostrarPassword ? "text" : "password"} autoComplete="new-password" value={nuevaPassword} onChange={(e) => setNuevaPassword(e.target.value)} className="w-full rounded-lg border border-white/15 bg-black/25 px-3 py-3 pr-10 text-sm text-white outline-none focus:border-gold" />
                    <button type="button" onClick={() => setMostrarPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-gold" aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                      {mostrarPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </span>
                </label>

                <label className="block text-[10px] uppercase tracking-wider text-white/50">
                  Repite la contraseña
                  <input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black/25 px-3 py-3 text-sm text-white outline-none focus:border-gold" />
                </label>

                {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}

                <button type="submit" disabled={cargando} className="w-full rounded-lg bg-gold py-3.5 text-xs font-semibold uppercase tracking-wider text-ink disabled:opacity-50">
                  {cargando ? "Guardando…" : "Cambiar contraseña"}
                </button>
              </form>
            </>
          ) : (
            <>
              <Mail className="size-8 text-gold" />
              <h1 className="mt-4 text-2xl font-semibold">Recuperar contraseña</h1>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                Introduce el correo con el que registraste tu taller. Te enviaremos un enlace seguro para crear una nueva contraseña.
              </p>

              <form onSubmit={solicitar} className="mt-7 space-y-5">
                <label className="block text-[10px] uppercase tracking-wider text-white/50">
                  Correo
                  <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black/25 px-3 py-3 text-sm text-white outline-none focus:border-gold" />
                </label>

                {enviado ? (
                  <p className="rounded-lg border border-gold/20 bg-gold/5 p-3 text-xs leading-relaxed text-white/65">
                    Si existe una cuenta con ese correo, recibirás un enlace para recuperar el acceso. Revisa también spam.
                  </p>
                ) : null}

                {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}

                <button type="submit" disabled={cargando} className="w-full rounded-lg bg-gold py-3.5 text-xs font-semibold uppercase tracking-wider text-ink disabled:opacity-50">
                  {cargando ? "Enviando…" : "Enviar enlace de recuperación"}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
