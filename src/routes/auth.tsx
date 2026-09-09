import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { correoDesdeUsuario, esVistaMovilTablet, inicioSegunRol, useSesion } from "@/lib/auth";
import { registrarPrimerDueno, sistemaSinDuenos } from "@/lib/cuentas.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acceso al sistema — Aurum Lab" },
      {
        name: "description",
        content:
          "Ingreso al sistema del taller de joyería con usuario o DNI y contraseña interna. Cada perfil accede a su propia vista.",
      },
      { property: "og:title", content: "Acceso al sistema — Aurum Lab" },
      { property: "og:description", content: "Ingreso interno del taller de joyería." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: sesion } = useSesion();
  const { data: estado } = useQuery({
    queryKey: ["sistema-vacio"],
    queryFn: () => sistemaSinDuenos(),
  });

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const modoAlta = Boolean(estado?.vacio);

  useEffect(() => {
    if (sesion) navigate({ to: inicioSegunRol(sesion, { movilTablet: esVistaMovilTablet() }) });
  }, [sesion, navigate]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const email = correoDesdeUsuario(usuario);
      if (modoAlta) {
        await registrarPrimerDueno({
          data: {
            correo: email,
            password,
            nombre,
            dni: usuario.trim(),
            telefono: "",
            rol: "dueno",
            sede_id: null,
            areas: [],
          },
        });
        await qc.invalidateQueries({ queryKey: ["sistema-vacio"] });
      }
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw new Error("Usuario o contraseña incorrectos");
      await qc.invalidateQueries();
      navigate({ to: "/" });
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "No se pudo iniciar sesión");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-6 py-12 text-ink-foreground">
      {/* Fondo único: degradados suaves sobre tinta */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 30%, oklch(0.712 0.083 84 / 0.08), transparent 28rem), radial-gradient(circle at 85% 70%, oklch(0.955 0.035 155 / 0.05), transparent 24rem), linear-gradient(180deg, oklch(0.223 0.006 250), oklch(0.18 0.008 255))",
        }}
      />

      <div className="relative z-10 w-full max-w-6xl">
        <div className="grid items-center gap-16 lg:grid-cols-[1fr_auto_420px]">
          {/* Lado izquierdo: marca y propuesta */}
          <section className="hidden flex-col justify-center lg:flex">
            <div className="mb-10">
              <p className="font-display text-5xl italic leading-tight text-gold md:text-6xl">
                Aurum Lab
              </p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-ink-foreground/40">
                Sistema del Taller de Joyería
              </p>
            </div>

            <div className="max-w-md space-y-6 text-ink-foreground/80">
              <p className="font-display text-2xl italic leading-relaxed text-ink-foreground/90">
                Tus clientes. Tus trabajos. Tu crecimiento.
              </p>
              <p className="text-sm leading-relaxed">
                Todo conectado en un solo lugar. Acceso seguro según tu rol.
              </p>
            </div>

            <div className="mt-12 max-w-sm rounded-2xl border border-ink-foreground/10 bg-ink-foreground/[0.03] p-6 backdrop-blur-sm">
              <p className="text-xs font-medium text-ink-foreground/70">
                ¿Deseas probar Aurum Lab?
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-foreground/50">
                Solicita tu acceso de prueba por WhatsApp:
              </p>
              <p className="mt-1 text-sm font-medium text-gold">+51 948 727 973</p>
              <a
                href="https://wa.me/51948727973?text=Hola,%20quiero%20solicitar%20acceso%20de%20prueba%20a%20Aurum%20Lab"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center justify-center rounded-lg bg-gold px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink transition-opacity hover:opacity-90"
              >
                Solicitar acceso
              </a>
            </div>
          </section>

          {/* Divisor sutil: visible solo en escritorio */}
          <div className="hidden h-80 w-px bg-gradient-to-b from-transparent via-ink-foreground/15 to-transparent lg:block" />

          {/* Lado derecho: formulario */}
          <section className="mx-auto w-full max-w-sm lg:mx-0">
            {/* Cabecera móvil: marca resumida */}
            <div className="mb-8 text-center lg:hidden">
              <p className="font-display text-4xl italic text-gold">Aurum Lab</p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-ink-foreground/40">
                Sistema del taller de joyería
              </p>
            </div>

            <form
              onSubmit={entrar}
              className="rounded-2xl border border-ink-foreground/10 bg-ink-foreground/[0.03] p-8 backdrop-blur-sm"
            >
              <h1 className="mb-6 text-sm font-medium">
                {modoAlta ? "Crear el primer dueño general" : "Ingreso interno"}
              </h1>

              {modoAlta ? (
                <label className="mb-4 block text-[10px] uppercase tracking-wider text-ink-foreground/50">
                  Nombre completo
                  <input
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-ink-foreground/15 bg-ink px-3 py-2.5 text-sm text-ink-foreground outline-none focus:border-gold"
                  />
                </label>
              ) : null}

              <label className="mb-4 block text-[10px] uppercase tracking-wider text-ink-foreground/50">
                Usuario o DNI
                <input
                  required
                  autoComplete="username"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-ink-foreground/15 bg-ink px-3 py-2.5 text-sm text-ink-foreground outline-none focus:border-gold"
                />
              </label>

              <label className="mb-6 block text-[10px] uppercase tracking-wider text-ink-foreground/50">
                Contraseña
                <input
                  required
                  type="password"
                  autoComplete={modoAlta ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-ink-foreground/15 bg-ink px-3 py-2.5 text-sm text-ink-foreground outline-none focus:border-gold"
                />
              </label>

              {error ? <p className="mb-4 text-xs text-danger">{error}</p> : null}

              <button
                type="submit"
                disabled={cargando}
                className="w-full rounded-lg bg-gold py-2.5 text-xs font-semibold uppercase tracking-wider text-ink disabled:opacity-50"
              >
                {cargando ? "Entrando..." : modoAlta ? "Crear y entrar" : "Entrar"}
              </button>
            </form>

            <p className="mt-6 text-center text-[11px] text-ink-foreground/35">
              ¿Eres cliente?{" "}
              <a href="/cliente" className="text-gold underline-offset-2 hover:underline">
                Consulta tu pedido aquí
              </a>
            </p>

            <p className="mt-4 text-center text-[10px] tracking-wider text-ink-foreground/25">
              Desarrollado por Fadilab
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
