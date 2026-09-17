import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { correoDesdeUsuario, esVistaMovilTablet, inicioSegunRol, useSesion } from "@/lib/auth";
import { HerramientasFlotantes } from "@/components/HerramientasFlotantes";
import { ArrowRight, Eye, EyeOff, Gem, Grid2X2, Headphones, Home, LockKeyhole, Monitor, ShieldCheck, UserRound } from "lucide-react";
import heroJoyeria from "@/assets/diseno-corona.jpg";
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
  const [mostrarPassword, setMostrarPassword] = useState(false);
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
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#090a0b] text-ink-foreground">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_40%,rgba(212,175,55,.12),transparent_32%),radial-gradient(circle_at_78%_35%,rgba(255,255,255,.05),transparent_28%),linear-gradient(180deg,#111315_0%,#08090a_100%)]" />
        <div
          className="absolute inset-y-0 left-0 w-[62%] bg-cover bg-center opacity-35 mix-blend-screen"
          style={{ backgroundImage: `linear-gradient(90deg,rgba(8,9,10,.2),rgba(8,9,10,.78) 78%,rgba(8,9,10,1)), url(${heroJoyeria})` }}
        />
        <div className="absolute inset-y-0 right-0 w-[48%] bg-gradient-to-l from-black/50 to-transparent" />
      </div>

      <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5 lg:h-20 lg:px-10">
        <div className="hidden items-center gap-3 md:flex">
          <img src="/icon-512.png" alt="Aurum Lab" className="h-12 w-12 rounded-xl object-cover ring-1 ring-gold/60" />
          <div>
            <p className="font-display text-xl font-semibold tracking-tight text-gold">AURUM LAB</p>
            <p className="text-[9px] uppercase tracking-[0.28em] text-white/45">Sistema del taller de joyería</p>
          </div>
        </div>
        <nav className="hidden items-center gap-8 lg:flex">
          <a href="/auth" className="flex items-center gap-2 text-sm text-gold">
            <Home className="size-4" /> Inicio
          </a>
          <a href="#herramientas" className="flex items-center gap-2 text-sm text-white/75 transition hover:text-gold">
            <Grid2X2 className="size-4" /> Herramientas
          </a>
        </nav>
        <a href="#login" className="hidden rounded-lg border border-gold/70 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-gold transition hover:bg-gold hover:text-ink md:inline-flex">
          Iniciar sesión
        </a>
      </header>

      <div className="relative z-10 mx-auto grid min-h-0 w-full flex-1 max-w-[1500px] items-center gap-5 px-5 py-4 sm:py-5 lg:gap-8 lg:px-10 lg:py-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] [@media(max-height:800px)]:gap-4 [@media(max-height:800px)]:py-1">
        <section className="hidden min-w-0 pb-8 lg:pb-16 [@media(max-height:800px)]:pb-1">
          <div className="max-w-4xl">
            <p className="font-display text-5xl italic leading-none text-gold sm:text-6xl lg:text-8xl [@media(max-height:800px)]:lg:text-[3.4rem]">Aurum Lab</p>
            <p className="mt-4 text-[10px] uppercase tracking-[0.42em] text-white/50 sm:text-xs">
              Sistema del taller de joyería
            </p>
            <p className="mt-8 max-w-3xl font-display text-2xl italic leading-tight text-white/90 sm:text-3xl lg:text-4xl [@media(max-height:800px)]:mt-2 [@media(max-height:800px)]:lg:text-[1.7rem]">
              Tus clientes. Tus trabajos. Tu crecimiento.
            </p>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base [@media(max-height:800px)]:mt-3">
              Todo conectado en un solo lugar. Acceso seguro según tu rol.
            </p>
          </div>

          <section id="herramientas" className="mt-10 max-w-5xl rounded-2xl border border-gold/30 bg-black/45 p-4 shadow-2xl backdrop-blur-md sm:p-6 [@media(max-height:800px)]:mt-4 [@media(max-height:800px)]:p-2.5">
            <div className="flex items-center gap-3">
              <Gem className="size-7 text-gold" />
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-gold sm:text-base">
                  Herramientas gratuitas para joyeros
                </h2>
                <p className="mt-1 text-xs text-white/60 sm:text-sm">
                  Calcula, visualiza y optimiza tus proyectos desde cualquier dispositivo.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5 [@media(max-height:800px)]:mt-3">
              {[
                ["Yeso / Agua", "Calcula las proporciones ideales para tus mezclas."],
                ["Aleación de Oro", "Obtén la aleación perfecta para tu diseño."],
                ["Conversor de Tallas", "Convierte tallas de anillos entre diferentes escalas."],
                ["Visualizador y Peso 3D", "Visualiza y calcula el peso de tus diseños 3D."],
                ["AURUM RENDER", "Visualiza tus diseños 3D con materiales realistas."],
              ].map(([titulo, descripcion], i) => (
                <div key={titulo} className="rounded-xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-gold/40 hover:bg-white/[0.045] [@media(max-height:800px)]:p-3">
                  <Gem className="size-6 text-gold" />
                  <p className="mt-4 text-sm font-semibold text-white">{titulo}</p>
                  <p className="mt-2 text-[11px] leading-relaxed text-white/50">{descripcion}</p>
                  {i === 4 ? <span className="mt-3 inline-flex rounded border border-gold/60 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-gold">Beta</span> : null}
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <a href="#herramientas" className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-3 text-xs font-semibold uppercase tracking-wider text-ink transition hover:opacity-90">
                Explorar herramientas <ArrowRight className="size-4" />
              </a>
              <a href="https://wa.me/51948727973?text=Hola,%20quiero%20solicitar%20acceso%20de%20prueba%20a%20Aurum%20Lab" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-gold/50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gold transition hover:bg-gold/10">
                Solicitar acceso de prueba
              </a>
            </div>
          </section>
        </section>

        <section id="login" className="mx-auto w-full max-w-[430px]">
          <div className="mb-7 text-center md:hidden">
            <p className="font-display text-4xl italic leading-none text-gold">Aurum Lab</p>
          </div>
          <form onSubmit={entrar} className="rounded-2xl border border-white/10 bg-[#111315]/90 p-7 shadow-2xl backdrop-blur-xl sm:p-9 [@media(max-height:800px)]:p-5">
            <div className="mb-7 flex items-center gap-3">
              <LockKeyhole className="size-7 text-gold" />
              <div>
                <h1 className="text-xl font-semibold text-white">{modoAlta ? "Crear el primer dueño general" : "Ingreso interno"}</h1>
                {!modoAlta ? <p className="mt-1 text-xs text-white/50">Accede a tu taller. Todo en un solo lugar.</p> : null}
              </div>
            </div>

            {modoAlta ? (
              <label className="mb-4 block text-[10px] uppercase tracking-wider text-white/50">
                Nombre completo
                <input required value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black/25 px-3 py-3 text-sm text-white outline-none focus:border-gold" />
              </label>
            ) : null}

            <label className="mb-5 block text-[10px] uppercase tracking-wider text-white/50">
              Usuario o DNI
              <span className="relative mt-2 block">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/45" />
                <input required autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} className="w-full rounded-lg border border-white/15 bg-black/25 py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-gold" />
              </span>
            </label>

            <label className="mb-5 block text-[10px] uppercase tracking-wider text-white/50">
              Contraseña
              <span className="relative mt-2 block">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/45" />
                <input required type={mostrarPassword ? "text" : "password"} autoComplete={modoAlta ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-white/15 bg-black/25 py-3 pl-10 pr-10 text-sm text-white outline-none focus:border-gold" />
                <button type="button" onClick={() => setMostrarPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-gold" aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                  {mostrarPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>

            {error ? <p className="mb-4 text-xs text-danger">{error}</p> : null}

            <button type="submit" disabled={cargando} className="w-full rounded-lg bg-gold py-3.5 text-xs font-semibold uppercase tracking-wider text-ink transition hover:opacity-90 disabled:opacity-50">
              {cargando ? "Entrando..." : modoAlta ? "Crear y entrar" : "Entrar"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-white/55">
            ¿Eres cliente?{" "}
            <a href="/cliente" className="text-gold underline-offset-2 hover:underline">Consulta tu pedido aquí</a>
          </p>
          <p className="mt-4 text-center text-[10px] tracking-wider text-white/25">Desarrollado por Fadilab EIRL</p>
        </section>
      </div>

      <footer className="relative z-10 shrink-0 border-t border-white/10 px-5 py-3 lg:px-6 lg:py-5">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 text-xs text-white/45">
          <div className="flex flex-wrap items-center gap-6">
            <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-gold" /> Seguro y confiable</span>
            <span className="flex items-center gap-2"><Monitor className="size-4 text-gold" /> Acceso desde cualquier dispositivo</span>
            <span className="flex items-center gap-2"><Headphones className="size-4 text-gold" /> Soporte especializado</span>
          </div>
          <span>© 2026 Aurum Lab. Todos los derechos reservados.</span>
        </div>
      </footer>

      <div className="md:hidden"><HerramientasFlotantes /></div>
    </main>
  );
}

