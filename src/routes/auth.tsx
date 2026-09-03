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
    <main className="grid min-h-screen place-items-center bg-ink px-4 py-12 text-ink-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="font-display text-4xl italic text-gold">Aurum Lab</p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-ink-foreground/40">
            Sistema del taller de joyería
          </p>
        </div>

        <form
          onSubmit={entrar}
          className="rounded-2xl border border-ink-foreground/10 bg-ink-foreground/[0.03] p-8"
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
      </div>
    </main>
  );
}
