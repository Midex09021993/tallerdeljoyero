import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { correoDesdeUsuario, inicioSegunRol, useSesion } from "@/lib/auth";
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
    if (sesion) navigate({ to: inicioSegunRol(sesion) });
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
    <main className="auth-shell relative grid min-h-screen overflow-hidden px-4 py-8 text-ink-foreground sm:place-items-center sm:py-12">
      <div className="auth-workbench" aria-hidden="true" />
      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center sm:min-h-0">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center sm:mb-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-lg border border-gold/35 bg-ink/75 shadow-[0_18px_45px_-28px_rgba(0,0,0,0.85)]">
              <span className="font-display text-3xl italic text-gold">A</span>
            </div>
            <p className="font-display text-4xl italic text-gold sm:text-5xl">Aurum Lab</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-ink-foreground/55">
              Sistema del taller de joyería
            </p>
          </div>

          <form
            onSubmit={entrar}
            className="rounded-lg border border-ink-foreground/12 bg-ink/82 p-6 shadow-[0_24px_70px_-32px_rgba(0,0,0,0.9)] backdrop-blur-md sm:p-8"
          >
            <h1 className="mb-6 text-sm font-medium">
              {modoAlta ? "Crear el primer dueño general" : "Ingreso interno"}
            </h1>

            {modoAlta ? (
              <label className="mb-4 block text-[10px] uppercase tracking-wider text-ink-foreground/55">
                Nombre completo
                <input
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-ink-foreground/15 bg-ink/80 px-3 py-3 text-base text-ink-foreground outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20 sm:text-sm"
                />
              </label>
            ) : null}

            <label className="mb-4 block text-[10px] uppercase tracking-wider text-ink-foreground/55">
              Usuario o DNI
              <input
                required
                autoComplete="username"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="mt-2 w-full rounded-lg border border-ink-foreground/15 bg-ink/80 px-3 py-3 text-base text-ink-foreground outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20 sm:text-sm"
              />
            </label>

            <label className="mb-6 block text-[10px] uppercase tracking-wider text-ink-foreground/55">
              Contraseña
              <input
                required
                type="password"
                autoComplete={modoAlta ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-lg border border-ink-foreground/15 bg-ink/80 px-3 py-3 text-base text-ink-foreground outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20 sm:text-sm"
              />
            </label>

            {error ? <p className="mb-4 text-xs text-danger">{error}</p> : null}

            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-lg bg-gold py-3 text-xs font-semibold uppercase tracking-wider text-ink transition hover:bg-gold-bright disabled:opacity-50"
            >
              {cargando ? "Entrando..." : modoAlta ? "Crear y entrar" : "Entrar"}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] text-ink-foreground/45">
            ¿Eres cliente?{" "}
            <a href="/cliente" className="text-gold underline-offset-2 hover:underline">
              Consulta tu pedido aquí
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
