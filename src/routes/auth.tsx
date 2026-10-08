import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { correoDesdeUsuario, esVistaMovilTablet, inicioSegunRol, useSesion } from "@/lib/auth";
import { HerramientasFlotantes } from "@/components/HerramientasFlotantes";
import { SolicitudAcceso } from "@/components/SolicitudAcceso";
import { RegistroTaller } from "@/components/RegistroTaller";
import { ComunidadAurumLab } from "@/components/ComunidadAurumLab";
import { ArrowRight, Boxes, Calculator, Eye, EyeOff, Gem, Grid2X2, Headphones, HelpCircle, Home, LockKeyhole, Monitor, Network, PackageCheck, ShieldCheck, ShoppingBag, Sparkles, UserRound, UsersRound, type LucideIcon } from "lucide-react";
import heroJoyeria from "@/assets/diseno-corona.jpg";
import { registrarPrimerDueno, sistemaSinDuenos } from "@/lib/cuentas.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aurum Lab — Plataforma digital para talleres de joyería" },
      {
        name: "description",
        content:
          "Aurum Lab conecta clientes, cotizaciones, pedidos, producción, inventario y herramientas digitales especializadas para el sector joyero.",
      },
      { property: "og:title", content: "Aurum Lab — Plataforma digital para talleres de joyería" },
      {
        property: "og:description",
        content: "Gestiona el trabajo de tu taller y conecta herramientas, producción y comercial en un solo entorno.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: sesion, refetch: refetchSesion } = useSesion();
  const { data: estado } = useQuery({
    queryKey: ["sistema-vacio"],
    queryFn: () => sistemaSinDuenos(),
    retry: false,
  });

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [dni, setDni] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarAyudaPassword, setMostrarAyudaPassword] = useState(false);
  const [mostrarPlataforma, setMostrarPlataforma] = useState(false);
  const [seccionPlataforma, setSeccionPlataforma] = useState<"ecosistema"|"participantes"|"flujo"|"comunidad">("ecosistema");
  const [herramientaSeleccionada, setHerramientaSeleccionada] = useState<string | null>(null);
  const modoAlta = Boolean(estado?.vacio && (estado as { disponible?: boolean } | undefined)?.disponible !== false);

  useEffect(() => {
    if (window.location.hash === "#conoce-plataforma") {
      setSeccionPlataforma("ecosistema");
      setMostrarPlataforma(true);
    }
  }, []);

  useEffect(() => {
    if (!mostrarAyudaPassword && !mostrarPlataforma) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (mostrarAyudaPassword) setMostrarAyudaPassword(false);
      if (mostrarPlataforma) setMostrarPlataforma(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mostrarAyudaPassword, mostrarPlataforma]);

  useEffect(() => {
    if (sesion) navigate({ to: inicioSegunRol(sesion, { movilTablet: esVistaMovilTablet() }) });
  }, [sesion, navigate]);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const email = correoDesdeUsuario(usuario);
      if (modoAlta) {
        await registrarPrimerDueno({
          data: {
            usuario: usuario.trim(),
            password,
            nombre,
            apellidos,
            dni: dni.trim(),
            telefono: "",
            rol: "dueno",
            sede_id: null,
            areas: [],
          },
        });
        await qc.invalidateQueries({ queryKey: ["sistema-vacio"] });
      }
      const { data: authData, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw new Error("Usuario o contraseña incorrectos");

      // Resolver primero el estado de acceso para mostrar un mensaje útil
      // antes de que useSesion() cierre la sesión de un perfil vencido.
      if (authData.user) {
        const { data: perfilAcceso } = await supabase
          .from("profiles")
          .select("activo, acceso_desde, acceso_hasta")
          .eq("id", authData.user.id)
          .maybeSingle();

        const hoy = new Date().toISOString().slice(0, 10);

        if (perfilAcceso?.acceso_hasta && hoy > perfilAcceso.acceso_hasta) {
          await supabase.auth.signOut();
          const [anio, mes, dia] = perfilAcceso.acceso_hasta.split("-");
          throw new Error(
            `Tu acceso a Aurum Lab ha vencido el ${dia}/${mes}/${anio}. Contacta con el administrador para renovarlo.`,
          );
        }
      }

      await qc.invalidateQueries();
      const { data: sesionActualizada, error: errorSesion } = await refetchSesion();
      if (errorSesion || !sesionActualizada) {
        throw new Error("La sesión se creó, pero no se pudo resolver el acceso al taller");
      }
      navigate({ to: inicioSegunRol(sesionActualizada, { movilTablet: esVistaMovilTablet() }), replace: true });
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "No se pudo iniciar sesión");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#090a0b] text-ink-foreground">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 max-[767px]:hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_40%,rgba(212,175,55,.12),transparent_32%),radial-gradient(circle_at_78%_35%,rgba(255,255,255,.05),transparent_28%),linear-gradient(180deg,#111315_0%,#08090a_100%)]" />
        <div
          className="absolute inset-y-0 left-0 w-[62%] bg-cover bg-center opacity-35 mix-blend-screen"
          style={{ backgroundImage: `linear-gradient(90deg,rgba(8,9,10,.2),rgba(8,9,10,.78) 78%,rgba(8,9,10,1)), url(${heroJoyeria})` }}
        />
        <div className="absolute inset-y-0 right-0 w-[48%] bg-gradient-to-l from-black/50 to-transparent" />
      </div>

      <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5 lg:h-20 lg:px-10 max-[767px]:hidden">
        <div className="flex items-center gap-3">
          <img src="/icon-512.png" alt="Aurum Lab" className="h-12 w-12 rounded-xl object-cover ring-1 ring-gold/60" />
          <div>
            <p className="font-display text-xl font-semibold tracking-tight text-gold">AURUM LAB</p>
            <p className="text-[9px] uppercase tracking-[0.28em] text-white/45">Sistema del taller de joyería</p>
          </div>
        </div>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="/auth" className="flex items-center gap-2 text-sm text-gold">
            <Home className="size-4" /> Inicio
          </a>
          <a href="#herramientas" className="flex items-center gap-2 text-sm text-white/75 transition hover:text-gold">
            <Grid2X2 className="size-4" /> Herramientas
          </a>
        </nav>
        <a href="#login" className="rounded-lg border border-gold/70 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-gold transition hover:bg-gold hover:text-ink">
          Iniciar sesión
        </a>
      </header>

      <div className="relative z-10 mx-auto grid min-h-0 w-full flex-1 max-w-[1500px] items-center gap-5 px-5 py-4 sm:py-5 lg:gap-8 lg:px-10 lg:py-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] [@media(max-height:800px)]:gap-4 [@media(max-height:800px)]:py-1 max-[767px]:grid-cols-1 max-[767px]:justify-items-center max-[767px]:px-4 max-[767px]:py-6">
        <section className="min-w-0 pb-8 lg:pb-16 [@media(max-height:800px)]:pb-1">
          <div className="max-w-4xl">
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-gold">Infraestructura digital para el ecosistema joyero</p>
            <h1 className="mt-3 max-w-4xl font-display text-3xl italic leading-tight text-white sm:text-4xl lg:text-5xl [@media(max-height:800px)]:lg:text-[2.1rem]">
              Digitaliza tu taller. Conecta tu trabajo. Hazlo crecer.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base [@media(max-height:800px)]:mt-2">
              Herramientas, comercial, producción, visualización y ecosistema en un mismo entorno, adaptado a la forma real de trabajar de cada taller.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5 [@media(max-height:800px)]:mt-3">
              <button type="button" onClick={() => document.getElementById("herramientas")?.scrollIntoView({ behavior: "smooth", block: "center" })} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-ink transition hover:opacity-90">
                Probar herramientas <ArrowRight className="size-3.5" />
              </button>
              <button type="button" onClick={() => { setSeccionPlataforma("ecosistema"); setMostrarPlataforma(true); }} className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white/75 transition hover:border-gold/40 hover:text-gold">
                Conocer la plataforma
              </button>
            </div>
          </div>

          <section className="mt-8 grid max-w-5xl gap-2 sm:grid-cols-2 lg:grid-cols-4 [@media(max-height:800px)]:mt-3">
            {[
              [Boxes, "Comercial", "Clientes, proyectos, cotizaciones y pedidos conectados."],
              [PackageCheck, "Producción", "Órdenes, trabajos, piezas, responsables y calidad."],
              [Eye, "Visualización", "AURUM Render para explorar y presentar tus diseños 3D."],
              [Network, "Ecosistema", "Conecta talleres, profesionales, proveedores y servicios."],
            ].map(([Icon, title, text]) => {
              const FeatureIcon = Icon as LucideIcon;
              return <article key={String(title)} className="rounded-xl border border-white/10 bg-black/25 p-3.5"><FeatureIcon className="size-5 text-gold" /><h2 className="mt-2 text-xs font-semibold uppercase tracking-wider text-white">{String(title)}</h2><p className="mt-1 text-[10px] leading-relaxed text-white/45">{String(text)}</p></article>;
            })}
          </section>

          <section id="herramientas" className="mt-8 max-w-5xl rounded-2xl border border-gold/30 bg-black/45 p-4 shadow-2xl backdrop-blur-md sm:p-6 [@media(max-height:800px)]:mt-4 [@media(max-height:800px)]:p-2.5">
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
                ["yeso", "Yeso / Agua", "Calcula las proporciones ideales para tus mezclas."],
                ["oro", "Aleación de Oro", "Obtén la aleación perfecta para tu diseño."],
                ["tallas", "Conversor de Tallas", "Convierte tallas de anillos entre diferentes escalas."],
                ["transfer", "AURUM Transfer", "Envía modelos y archivos de fabricación con un enlace privado de un solo uso."],
                ["render", "AURUM RENDER", "Visualiza tus diseños 3D con materiales realistas."],
              ].map(([id, titulo, descripcion]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setHerramientaSeleccionada(id ?? null)}
                  className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-left transition hover:border-gold/40 hover:bg-white/[0.045] [@media(max-height:800px)]:p-3"
                >
                  <Gem className="size-6 text-gold" />
                  <p className="mt-4 text-sm font-semibold text-white">{titulo}</p>
                  <p className="mt-2 text-[11px] leading-relaxed text-white/50">{descripcion}</p>
                  {id === "render" ? <span className="mt-3 inline-flex rounded border border-gold/60 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-gold">Beta</span> : null}
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => { setSeccionPlataforma("ecosistema"); setMostrarPlataforma(true); }} className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-3 text-xs font-semibold uppercase tracking-wider text-ink transition hover:opacity-90">
                Conocer la plataforma <ArrowRight className="size-4" />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold text-white">¿Quieres llevar esto a tu operación?</p>
                  <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-white/45">
                    Las herramientas son el primer paso. Cuando necesites organizar clientes, cotizaciones, pedidos y producción, puedes solicitar acceso a Aurum Lab.
                  </p>
                </div>
                <RegistroTaller />
              </div>
            </div>
          </section>

        </section>

        <section id="login" className="mx-auto w-full max-w-[430px] translate-y-0 lg:-translate-y-10 [@media(max-height:800px)]:lg:-translate-y-5 max-[767px]:max-w-[430px]">
          <div className="mb-7 text-center md:hidden">
            <p className="font-display text-4xl italic leading-none text-gold">Aurum Lab</p>
          </div>
          <form onSubmit={entrar} className="rounded-2xl border border-white/10 bg-[#111315]/90 p-7 shadow-2xl backdrop-blur-xl sm:p-9 [@media(max-height:800px)]:p-5 max-[767px]:w-full">
            <div className="mb-7 flex items-center gap-3">
              <LockKeyhole className="size-7 text-gold" />
              <div>
                <h1 className="text-xl font-semibold text-white">{modoAlta ? "Crear el primer dueño general" : "Ingreso interno"}</h1>
                {!modoAlta ? <p className="mt-1 text-xs text-white/50">Accede a tu taller. Todo en un solo lugar.</p> : null}
              </div>
            </div>

            <label className="mb-5 block text-[10px] uppercase tracking-wider text-white/50">
              Usuario
              <span className="relative mt-2 block">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/45" />
                <input required name="username" maxLength={120} autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? "auth-error" : undefined} className="w-full rounded-lg border border-white/15 bg-black/25 py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-gold" />
              </span>
            </label>

            <label className="mb-5 block text-[10px] uppercase tracking-wider text-white/50">
              Contraseña
              <span className="relative mt-2 block">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/45" />
                <input required name="password" minLength={6} maxLength={256} type={mostrarPassword ? "text" : "password"} autoComplete={modoAlta ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? "auth-error" : undefined} className="w-full rounded-lg border border-white/15 bg-black/25 py-3 pl-10 pr-10 text-sm text-white outline-none focus:border-gold" />
                <button type="button" onClick={() => setMostrarPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-gold" aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                  {mostrarPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>

            {modoAlta ? (
              <>
                <label className="mb-4 block text-[10px] uppercase tracking-wider text-white/50">
                  Nombre
                  <input required name="given-name" maxLength={80} autoComplete="given-name" value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black/25 px-3 py-3 text-sm text-white outline-none focus:border-gold" />
                </label>
                <label className="mb-4 block text-[10px] uppercase tracking-wider text-white/50">
                  Apellidos
                  <input required name="family-name" maxLength={120} autoComplete="family-name" value={apellidos} onChange={(e) => setApellidos(e.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black/25 px-3 py-3 text-sm text-white outline-none focus:border-gold" />
                </label>
                <label className="mb-4 block text-[10px] uppercase tracking-wider text-white/50">
                  DNI
                  <input required name="dni" maxLength={30} autoComplete="off" value={dni} onChange={(e) => setDni(e.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black/25 px-3 py-3 text-sm text-white outline-none focus:border-gold" />
                </label>
              </>
            ) : null}

            {error ? <p id="auth-error" role="alert" aria-live="polite" className="mb-4 text-xs text-danger">{error}</p> : null}

            <button type="submit" disabled={cargando} className="w-full rounded-lg bg-gold py-3.5 text-xs font-semibold uppercase tracking-wider text-ink transition hover:opacity-90 disabled:opacity-50">
              {cargando ? "Entrando..." : modoAlta ? "Crear y entrar" : "Entrar"}
            </button>

            {!modoAlta ? (
              <button
                type="button"
                onClick={() => setMostrarAyudaPassword(true)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 text-xs text-white/45 transition hover:text-gold"
              >
                <HelpCircle className="size-3.5" />
                ¿Olvidaste tu contraseña?
              </button>
            ) : null}
          </form>

          <div className="mt-5 flex justify-center md:hidden max-[767px]:flex"><RegistroTaller /></div>

          {mostrarAyudaPassword ? (
            <div
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ayuda-password-title"
            >
              <div className="w-full max-w-md rounded-2xl border border-gold/25 bg-[#111315] p-6 shadow-2xl sm:p-7">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl border border-gold/25 bg-gold/10 p-2">
                    <HelpCircle className="size-5 text-gold" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold">Acceso a Aurum Lab</p>
                    <h2 id="ayuda-password-title" className="mt-1 text-lg font-semibold text-white">Recuperar contraseña</h2>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-relaxed text-white/60">
                  Las cuentas internas utilizan un usuario técnico para iniciar sesión. Por seguridad, esta pantalla no envía contraseñas ni datos de acceso por correo.
                </p>

                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-4">
                  <p className="text-xs font-semibold text-white">Si perteneces a un taller</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/50">
                    Solicita al dueño o gerente de tu taller que restablezca tu contraseña desde <span className="text-gold">Usuarios</span>. No compartas tu contraseña actual.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMostrarAyudaPassword(false)}
                  className="mt-6 w-full rounded-lg bg-gold py-3 text-xs font-semibold uppercase tracking-wider text-ink"
                >
                  Entendido
                </button>
              </div>
            </div>
          ) : null}

          <p className="mt-5 hidden text-center text-xs text-white/55 md:block max-[767px]:block">
            ¿Eres cliente?{" "}
            <a href="/cliente" className="text-gold underline-offset-2 hover:underline">Consulta tu pedido aquí</a>
          </p>
        </section>
      </div>

      {mostrarPlataforma ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="plataforma-title">
          <div className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-gold/25 bg-[#101214] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gold">Aurum Lab · Ecosistema profesional</p>
                <h2 id="plataforma-title" className="mt-1 font-display text-2xl italic text-white sm:text-3xl">Conoce cómo funciona</h2>
              </div>
              <button type="button" onClick={() => setMostrarPlataforma(false)} aria-label="Cerrar" className="rounded-full border border-white/10 p-2 text-white/60 hover:text-gold"><EyeOff className="size-4" /></button>
            </div>

            <div className="border-b border-white/10 px-4 pt-3 sm:px-7">
              <p className="mb-2 text-[10px] text-white/35">Explora la plataforma por área</p>
              <div className="flex gap-1 overflow-x-auto">
              {([
                ["ecosistema","El ecosistema",Gem],
                ["participantes","Quién puede participar",UsersRound],
                ["flujo","Cómo se conecta",Grid2X2],
                ["comunidad","Comunidad Aurum Lab",Gem],
              ] as [string, string, LucideIcon][]).map(([id,label,Icon]) => (
                <button key={String(id)} type="button" onClick={() => setSeccionPlataforma(id as typeof seccionPlataforma)}
                  className={`flex shrink-0 items-center gap-2 rounded-t-xl px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider transition ${seccionPlataforma===id ? "bg-gold/10 text-gold" : "text-white/45 hover:text-white"}`}>
                  <Icon className="size-3.5" /> {String(label)}
                </button>
              ))}
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto p-5 sm:p-7">
              {seccionPlataforma === "ecosistema" ? (
                <>
                  <div className="rounded-2xl border border-gold/20 bg-gold/[0.05] p-5 sm:p-7">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold">Aurum Lab · infraestructura digital</p>
                    <h3 className="mt-2 max-w-4xl font-display text-2xl italic text-white sm:text-4xl">Todo el recorrido de una joya, conectado.</h3>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/65">
                      Aurum Lab une la relación con el cliente, la gestión comercial y la operación del taller para que la información acompañe a la pieza desde el proyecto hasta la entrega.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wider">
                      {["Cliente","Proyecto","Cotización","Pedido","Producción","Calidad","Entrega"].map((item,i) => <span key={item} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white/65">{item}{i < 6 ? " →" : ""}</span>)}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { icon: Boxes, title: "Gestiona tu taller", text: "Clientes, proyectos, cotizaciones, pedidos, inventario y entregas; información comercial separada de los datos internos." },
                      { icon: PackageCheck, title: "Controla la producción", text: "Del pedido a la orden de producción, los trabajos, las piezas y el control de calidad, con responsables y seguimiento por área." },
                      { icon: Sparkles, title: "Visualiza en 3D", text: "AURUM Render (beta) para explorar diseños de joyería con metales, gemas, iluminación y escenas." },
                      { icon: Calculator, title: "Herramientas para joyeros", text: "Yeso / agua, aleaciones de oro, tallas y visualización y peso 3D." },
                    ].map(({icon:Icon,title,text}) => (
                      <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-gold/35">
                        <Icon className="size-6 text-gold"/>
                        <h3 className="mt-3 text-sm font-semibold text-white">{title}</h3>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-white/50">{text}</p>
                      </article>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <article className="rounded-2xl border border-gold/20 bg-gold/[0.05] p-5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold">Producción y trazabilidad</p>
                      <h3 className="mt-2 text-base font-semibold text-white">Cada trabajo puede seguir su recorrido.</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/55">
                        El pedido se prepara para producción y se organiza en órdenes, trabajos y piezas. Cada etapa puede registrar responsables, avances, incidencias y control de calidad.
                      </p>
                    </article>
                    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold">Ficha técnica</p>
                      <h3 className="mt-2 text-base font-semibold text-white">La información acompaña a la pieza.</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/55">
                        Material, talla, piedras, peso, cantidad, instrucciones, archivos técnicos, ruta y datos de fabricación.
                      </p>
                    </article>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold">Comercial y producción</p>
                      <h3 className="mt-2 text-base font-semibold text-white">Del acuerdo con el cliente al trabajo del taller.</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/55">Clientes, proyectos, cotizaciones y pedidos se conectan con la preparación de producción, las órdenes, los trabajos y las piezas. Los documentos para clientes mantienen separados los costos y las notas internas.</p>
                    </article>
                    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold">Talleres, áreas y responsables</p>
                      <h3 className="mt-2 text-base font-semibold text-white">Una operación adaptada a cada taller.</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/55">Un equipo pequeño puede trabajar de forma conjunta; una organización más grande puede distribuir tareas por áreas y sedes. Cada usuario accede a las funciones e información que le corresponden, sin exponer la administración interna de Aurum Lab.</p>
                    </article>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs font-semibold text-white">También puedes empezar sin ser cliente del sistema.</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-white/50">
                      Las herramientas gratuitas permiten conocer Aurum Lab y resolver necesidades técnicas antes de dar el siguiente paso.
                    </p>
                  </div>
                </>
              ) : null}

              {seccionPlataforma === "comunidad" ? (
                <ComunidadAurumLab />
              ) : null}

              {seccionPlataforma === "participantes" ? (
                <>
                  <p className="max-w-3xl text-sm leading-relaxed text-white/60">Aurum Lab está pensado para talleres y organizaciones de distintos tamaños. Cada persona trabaja con las funciones y la información que corresponden a su taller y su área. Las modalidades del ecosistema se incorporan progresivamente.</p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      {icon:Boxes,title:"Taller / Joyería",text:"Organiza el trabajo de un taller pequeño o de una organización con áreas, responsables y varias sedes."},
                      {icon:UserRound,title:"Profesional independiente",text:"Participación prevista para diseño, modelado 3D, gemología, fotografía y otras especialidades."},
                      {icon:ShoppingBag,title:"Vendedor / Comercializador",text:"Modalidad del ecosistema para tiendas, vendedores y representantes comerciales del sector joyero."},
                      {icon:PackageCheck,title:"Proveedor del sector joyero",text:"Modalidad del ecosistema para materiales, piedras, insumos, herramientas y productos."},
                      {icon:Network,title:"Servicio especializado",text:"Modalidad del ecosistema para casting, engaste, grabado, pulido, láser y otros procesos."},
                      {icon:UsersRound,title:"Talento / Prácticas",text:"Futuro espacio para aprendices, practicantes y oportunidades profesionales."},
                      {icon:Headphones,title:"Institución educativa",text:"Futuro espacio para cursos, capacitación y programas especializados."},
                    ].map(({icon:Icon,title,text}) => <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 hover:border-gold/35"><Icon className="size-6 text-gold"/><h3 className="mt-3 text-sm font-semibold text-white">{title}</h3><p className="mt-1.5 text-[11px] leading-relaxed text-white/50">{text}</p></article>)}
                  </div>
                </>
              ) : null}

              {seccionPlataforma === "flujo" ? (
                <>
                  <div className="rounded-2xl border border-gold/20 bg-gold/[0.06] p-5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold">Flujo principal</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {["Cliente","Proyecto","Cotización","Pedido","Preparar producción","Orden de producción","Trabajos","Piezas","Control de calidad","Producción terminada","Entrega"].map((item,i)=><span key={item} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white">{item}{i<10?<ArrowRight className="size-3 text-gold"/>:null}</span>)}
                    </div>
                    <p className="mt-5 text-xs leading-relaxed text-white/55">Comercial organiza el proyecto, la cotización y el pedido; producción coordina las órdenes, los trabajos y las piezas; inventario acompaña las compras, los materiales y los movimientos. Las herramientas técnicas y AURUM Render se conectan cuando aportan al proyecto.</p>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {[
                      {title:"Diseñar",text:"Definir la pieza, sus especificaciones y visualización."},
                      {title:"Producir",text:"Preparar órdenes, distribuir trabajos por área y registrar piezas, avances y calidad."},
                      {title:"Entregar",text:"Consultar materiales y movimientos de inventario, preparar la entrega y conservar el historial."},
                    ].map((x)=><article key={x.title} className="rounded-2xl border border-white/10 p-4"><p className="text-sm font-semibold text-gold">{x.title}</p><p className="mt-1.5 text-[11px] leading-relaxed text-white/50">{x.text}</p></article>)}
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4 sm:px-7">
              <p className="text-[10px] text-white/35">Aurum Lab · Plataforma especializada para el sector joyero</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setMostrarPlataforma(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-white/65 hover:border-gold/40 hover:text-white">Cerrar</button>
                <SolicitudAcceso />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <footer className="relative z-10 shrink-0 border-t border-white/10 px-5 py-3 lg:px-6 lg:py-5 max-[767px]:block">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 text-xs text-white/45 max-[767px]:flex-col max-[767px]:justify-center max-[767px]:gap-3 max-[767px]:text-center">
          <div className="flex flex-wrap items-center gap-6 max-[767px]:justify-center max-[767px]:gap-2.5">
            <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-gold" /> Seguro y confiable</span>
            <span className="flex items-center gap-2"><Monitor className="size-4 text-gold" /> Acceso desde cualquier dispositivo</span>
            <span className="flex items-center gap-2"><Headphones className="size-4 text-gold" /> Soporte especializado</span>
          </div>
          <span>© 2026 Aurum Lab. Todos los derechos reservados.</span>
        </div>
      </footer>

      <HerramientasFlotantes herramientaInicial={herramientaSeleccionada} />
    </main>
  );
}
