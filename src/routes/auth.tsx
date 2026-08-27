import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gem, LogIn } from "lucide-react";
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
    <main className="auth-shell grid min-h-screen px-4 py-5 text-foreground sm:place-items-center sm:py-10">
      <section className="auth-card mx-auto w-full max-w-md">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-teal-700 text-white shadow-sm">
            <Gem className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-[1.35rem] font-semibold leading-tight text-foreground">
              {modoAlta ? "Crear dueño general" : "Ingreso al sistema"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Acceso interno por DNI y contraseña
            </p>
          </div>
        </div>

        <form onSubmit={entrar}>
          {modoAlta ? (
            <label className="mb-4 block text-sm font-medium text-muted-foreground">
              Nombre completo
              <input
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="mt-2 w-full rounded-lg border border-input bg-white px-3 py-3 text-base text-foreground outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
              />
            </label>
          ) : null}

          <label className="mb-4 block text-sm font-medium text-muted-foreground">
            DNI / usuario
            <input
              required
              autoComplete="username"
              inputMode="numeric"
              placeholder="Ingresa tu DNI"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="mt-2 w-full rounded-lg border border-input bg-white px-3 py-3 text-base text-foreground outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
            />
          </label>

          <label className="mb-5 block text-sm font-medium text-muted-foreground">
            Contraseña
            <input
              required
              type="password"
              placeholder="Ingresa tu contraseña"
              autoComplete={modoAlta ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-lg border border-input bg-white px-3 py-3 text-base text-foreground outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
            />
          </label>

          {error ? (
            <p className="mb-4 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={cargando}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {cargando ? "Entrando..." : modoAlta ? "Crear y entrar" : "Entrar"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          ¿Eres cliente?{" "}
          <a
            href="/cliente"
            className="font-medium text-teal-700 underline-offset-2 hover:underline"
          >
            Consulta tu pedido aquí
          </a>
        </p>
      </section>
    </main>
  );
}
