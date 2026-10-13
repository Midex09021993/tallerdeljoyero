import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { esVistaMovilTablet, inicioSegunRol, useSesion } from "@/lib/auth";
import { SolicitudAcceso } from "@/components/SolicitudAcceso";
import { RegistroTaller } from "@/components/RegistroTaller";
import { ComunidadAurumLab } from "@/components/ComunidadAurumLab";
import { ArrowRight, Boxes, Calculator, Eye, EyeOff, Gem, Grid2X2, Headphones, HelpCircle, Home, LockKeyhole, Monitor, Network, PackageCheck, ShieldCheck, ShoppingBag, Sparkles, UserRound, UsersRound, type LucideIcon } from "lucide-react";
import heroJoyeria from "@/assets/diseno-corona.jpg";
import { registrarPrimerDueno, resolverEmailInicioSesion, sistemaSinDuenos } from "@/lib/cuentas.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aurum Lab — Plataforma digital para talleres de joyería" },
      {
        name: "description",
        content:
          "Aurum Lab para talleres de joyería: gestión comercial y producción, Mi Nube para archivos del taller, catálogo digital y herramientas técnicas especializadas.",
      },
      { property: "og:title", content: "Aurum Lab — Plataforma digital para talleres de joyería" },
      {
        property: "og:description",
        content: "Gestiona tu taller, organiza archivos en Mi Nube, publica tu catálogo digital y utiliza herramientas especializadas para joyería.",
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
  const [emailRegistro, setEmailRegistro] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [dni, setDni] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarAyudaPassword, setMostrarAyudaPassword] = useState(false);
  const [mostrarPlataforma, setMostrarPlataforma] = useState(false);
  const [seccionPlataforma, setSeccionPlataforma] = useState<"ecosistema"|"participantes"|"flujo"|"comunidad"|"planes">("ecosistema");
  const modoAlta = Boolean(estado?.vacio && (estado as { disponible?: boolean } | undefined)?.disponible !== false);

  useEffect(() => {
    if (window.location.hash === "#conoce-plataforma") {
      setSeccionPlataforma("ecosistema");
      setMostrarPlataforma(true);
      return;
    }
    if (window.location.hash === "#crear-taller") {
      window.requestAnimationFrame(() => {
        document.getElementById("crear-taller")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
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
    if (!sesion) return;
    const importTransfer = new URLSearchParams(window.location.search).get("importTransfer");
    if (importTransfer && /^[A-Za-z0-9_-]{30,100}$/.test(importTransfer)) {
      window.location.assign(`/mi-nube?importTransfer=${encodeURIComponent(importTransfer)}`);
      return;
    }
    navigate({ to: inicioSegunRol(sesion, { movilTablet: esVistaMovilTablet() }) });
  }, [sesion, navigate]);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const email = modoAlta ? emailRegistro.trim().toLowerCase() : (await resolverEmailInicioSesion({ data: { usuario } })).email;
      if (modoAlta) {
        await registrarPrimerDueno({
          data: {
            usuario: usuario.trim(),
            email: emailRegistro.trim().toLowerCase(),
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
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#11110f] text-ink-foreground selection:bg-[#d5b66f]/30">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_12%_28%,rgba(199,164,91,.16),transparent_38%),radial-gradient(ellipse_at_82%_16%,rgba(255,245,220,.055),transparent_30%),linear-gradient(135deg,#1b1a17_0%,#111210_48%,#0d0e0d_100%)]" />
        <div
          className="absolute inset-y-0 left-0 w-full bg-cover bg-center opacity-35 mix-blend-screen"
          style={{ backgroundImage: `linear-gradient(90deg,rgba(15,15,13,.10) 0%,rgba(15,15,13,.58) 44%,rgba(15,15,13,.94) 78%,rgba(15,15,13,.99) 100%), linear-gradient(180deg,rgba(15,15,13,.12),rgba(15,15,13,.68)), url(${heroJoyeria})` }}
        />
        <div className="absolute inset-y-0 right-0 w-[48%] bg-gradient-to-l from-[#0d0e0d]/65 to-transparent" />
      </div>

      <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-[#d8bd7b]/25 bg-[#11110f]/95 px-5 shadow-[0_8px_30px_rgba(0,0,0,0.22)] lg:h-[76px] lg:px-10 max-[767px]:hidden">
        <div className="flex items-center gap-3">
          <img src="/icon-512.png" alt="Aurum Lab" className="h-12 w-12 rounded-2xl object-cover ring-1 ring-[#d8bd7b]/60 shadow-[0_0_28px_rgba(203,169,98,.12)]" />
          <div>
            <p className="font-display text-xl font-semibold tracking-[0.04em] text-[#d9bd7b]">AURUM LAB</p>
            <p className="text-[9px] uppercase tracking-[0.25em] text-[#d5d0c4]/50">Sistema del taller de joyería</p>
          </div>
        </div>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="/auth" className="flex items-center gap-2 text-sm text-gold">
            <Home className="size-4" /> Inicio
          </a>
          <a href="/herramientas-publicas" className="flex items-center gap-2 text-sm text-white/75 transition hover:text-gold">
            <Grid2X2 className="size-4" /> Herramientas
          </a>
          <a href="/tienda" className="flex items-center gap-2 text-sm text-white/75 transition hover:text-gold">
            <ShoppingBag className="size-4" /> Tienda
          </a>
          <button type="button" onClick={() => { setSeccionPlataforma("ecosistema"); setMostrarPlataforma(true); }} className="flex items-center gap-2 text-sm text-white/75 transition hover:text-gold">
            <Gem className="size-4" /> Conocer Aurum Lab
          </button>
        </nav>
        <a href="#login" className="rounded-lg border border-gold/70 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-gold transition hover:bg-gold hover:text-ink">
          Iniciar sesión
        </a>
      </header>

      <div className="relative z-10 mx-auto grid min-h-0 w-full flex-1 max-w-[1500px] items-center gap-6 px-5 py-7 sm:px-8 sm:py-9 lg:gap-12 lg:px-10 lg:py-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] [@media(max-height:800px)]:gap-5 [@media(max-height:800px)]:py-3 max-[767px]:grid-cols-1 max-[767px]:justify-items-center max-[767px]:px-4 max-[767px]:py-6">
        <section className="order-2 min-w-0 pb-8 lg:order-none lg:pb-16 [@media(max-height:800px)]:pb-1">
          <div className="max-w-4xl">
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#d8bd7b]">Plataforma digital creada para el trabajo real del sector joyero</p>
            <h1 className="mt-4 max-w-4xl font-display text-3xl italic leading-[1.12] tracking-[-0.035em] text-[#f7f1e6] sm:text-4xl lg:text-[3.55rem] [@media(max-height:800px)]:lg:text-[2.55rem]">
              El arte de crear. La inteligencia de gestionar.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#d0cbc0]/75 sm:text-base sm:leading-7 [@media(max-height:800px)]:mt-3">
              Conecta cada etapa de tu taller: desde el diseño y los cálculos técnicos hasta la producción, tus archivos y la presentación de tus joyas.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3 [@media(max-height:800px)]:mt-4">
              <a href="/herramientas-publicas" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-b from-[#dfc583] to-[#c2a15c] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#211c12] shadow-[0_8px_24px_rgba(194,161,92,.14)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105">
                Probar herramientas <ArrowRight className="size-3.5" />
              </a>
              <a href="/tienda" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d8bd7b]/45 bg-white/[0.04] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#e6d2a0] transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.08]">
                Tienda de insumos <ShoppingBag className="size-3.5" />
              </a>
              <button type="button" onClick={() => { setSeccionPlataforma("ecosistema"); setMostrarPlataforma(true); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.035] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#d7d1c5]/80 transition hover:border-[#d8bd7b]/45 hover:bg-white/[0.06] hover:text-[#e5ca8a]">
                Conocer la plataforma
              </button>
            </div>
          </div>

          <section className="mt-9 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 [@media(max-height:800px)]:mt-4">
            {[
              [Boxes, "Comercial", "Clientes, proyectos, cotizaciones y pedidos conectados."],
              [PackageCheck, "Producción", "Órdenes, trabajos, piezas, responsables y calidad."],
              [Eye, "Visualización", "AURUM Render para explorar y presentar tus diseños 3D."],
              [Boxes, "Mi Nube", "Organiza archivos, fotografías, vídeos y documentos del taller."],
              [ShoppingBag, "Catálogo digital", "Prepara y publica modelos para mostrar tu trabajo a clientes."],
              [Network, "Ecosistema", "Conecta talleres, profesionales, proveedores y servicios."],
            ].map(([Icon, title, text]) => {
              const FeatureIcon = Icon as LucideIcon;
              return <article key={String(title)} className="group rounded-2xl border border-white/[0.075] bg-[#1b1b17]/65 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.045)] backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:border-[#d8bd7b]/35 hover:bg-[#24231e]/85"><FeatureIcon className="size-5 text-gold" /><h2 className="mt-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#f1ece2]">{String(title)}</h2><p className="mt-1.5 text-[10px] leading-relaxed text-[#c3bdb1]/55">{String(text)}</p></article>;
            })}
          </section>

          <section id="herramientas" className="mt-8 max-w-5xl rounded-[1.5rem] border border-[#d8bd7b]/20 bg-[#181915]/85 p-4 shadow-[0_28px_80px_rgba(0,0,0,.28),inset_0_1px_0_rgba(255,255,255,.035)] backdrop-blur-2xl sm:p-6 [@media(max-height:800px)]:mt-4 [@media(max-height:800px)]:p-3">
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

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 [@media(max-height:800px)]:mt-3">
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
                  onClick={() => navigate({ to: "/herramientas-publicas" })}
                  className="group rounded-2xl border border-white/[0.09] bg-white/[0.025] p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#d8bd7b]/40 hover:bg-white/[0.055] [@media(max-height:800px)]:p-3"
                >
                  <Gem className="size-6 text-gold" />
                  <p className="mt-4 text-sm font-semibold tracking-tight text-[#f5f0e7]">{titulo}</p>
                  <p className="mt-2 text-[11px] leading-relaxed text-[#c6c0b5]/60">{descripcion}</p>
                  {id === "render" ? <span className="mt-3 inline-flex rounded border border-gold/60 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-gold">Beta</span> : null}
                </button>
              ))}
            </div>

          </section>



          <div id="crear-taller" className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#d8bd7b]/20 bg-gradient-to-r from-[#c8a85f]/[0.07] to-transparent p-4 scroll-mt-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">¿Listo para llevar tu taller al siguiente nivel?</p>
              <p className="mt-1 text-xs leading-relaxed text-white/55">Crea tu taller y empieza a organizar tu operación en Aurum Lab.</p>
            </div>
            <RegistroTaller className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-gold px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-ink transition hover:-translate-y-0.5 hover:opacity-90" />
          </div>

        </section>

        <section id="login" className="order-1 mx-auto w-full max-w-[430px] translate-y-0 lg:order-none lg:-translate-y-6 [@media(max-height:800px)]:lg:-translate-y-2 max-[767px]:max-w-[430px]">
          <div className="mb-7 text-center md:hidden">
            <p className="font-display text-4xl italic leading-none tracking-tight text-[#d9bd7b]">Aurum Lab</p>
          </div>
          <form onSubmit={entrar} className="rounded-[1.7rem] border border-[#d7c18d]/[0.16] bg-[#171815]/90 p-7 shadow-[0_30px_100px_rgba(0,0,0,.42),inset_0_1px_0_rgba(255,255,255,.055)] backdrop-blur-2xl sm:p-9 [@media(max-height:800px)]:p-5 max-[767px]:w-full">
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
                <input required name="username" maxLength={120} autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? "auth-error" : undefined} className="w-full rounded-xl border border-white/[0.12] bg-[#0d0e0c]/70 py-3.5 pl-10 pr-3 text-sm text-[#f5f0e7] outline-none transition placeholder:text-white/30 focus:border-[#d8bd7b]/65 focus:ring-2 focus:ring-[#d8bd7b]/10" />
              </span>
            </label>
            <label className="mb-5 block text-[10px] uppercase tracking-wider text-white/50">
              Contraseña
              <span className="relative mt-2 block">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/45" />
                <input required name="password" minLength={6} maxLength={256} type={mostrarPassword ? "text" : "password"} autoComplete={modoAlta ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? "auth-error" : undefined} className="w-full rounded-xl border border-white/[0.12] bg-[#0d0e0c]/70 py-3.5 pl-10 pr-10 text-sm text-[#f5f0e7] outline-none transition placeholder:text-white/30 focus:border-[#d8bd7b]/65 focus:ring-2 focus:ring-[#d8bd7b]/10" />
                <button type="button" onClick={() => setMostrarPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-gold" aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                  {mostrarPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>

            {modoAlta ? (
              <>
                <label className="mb-4 block text-[10px] uppercase tracking-wider text-white/50">
                  Correo electrónico de recuperación
                  <input required type="email" name="email" autoComplete="email" maxLength={254} value={emailRegistro} onChange={(e) => setEmailRegistro(e.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-black/25 px-3 py-3 text-sm text-white outline-none focus:border-gold" />
                </label>
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
              <>
                <button
                  type="button"
                  onClick={() => { window.location.href = "/recuperar-contrasena"; }}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 text-xs text-white/45 transition hover:text-gold"
                >
                  <HelpCircle className="size-3.5" />
                  ¿Olvidaste tu contraseña?
                </button>
              </>
            ) : null}
          </form>



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
                ["planes","Planes y accesos",ShieldCheck],
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

                  <section className="mt-6 rounded-2xl border border-gold/20 bg-black/20 p-5 sm:p-6">
                    <div className="mb-4 max-w-3xl">
                      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-gold">Tu trabajo, organizado y listo para mostrar</p>
                      <h3 className="mt-2 font-display text-2xl italic text-white sm:text-3xl">De los archivos del taller a la presentación de tus joyas.</h3>
                      <p className="mt-2 text-sm leading-relaxed text-white/55">Dos espacios conectados con tu entorno de trabajo: conserva tus recursos y prepara una vitrina digital para tus modelos.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-gold/35">
                        <div className="flex items-center gap-3"><div className="rounded-xl border border-gold/25 bg-gold/10 p-2.5"><Boxes className="size-6 text-gold" /></div><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold">Espacio de trabajo</p><h4 className="mt-1 text-base font-semibold text-white">Mi Nube</h4></div></div>
                        <p className="mt-3 text-xs leading-relaxed text-white/55">Centraliza fotografías, vídeos, documentos y archivos técnicos del taller. Mantén tus recursos organizados y enlázalos con el trabajo de tu equipo.</p>
                        <p className="mt-3 text-[10px] leading-relaxed text-white/35">Disponible dentro del entorno de trabajo para usuarios autorizados.</p>
                      </article>
                      <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-gold/35">
                        <div className="flex items-center gap-3"><div className="rounded-xl border border-gold/25 bg-gold/10 p-2.5"><ShoppingBag className="size-6 text-gold" /></div><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold">Vitrina comercial</p><h4 className="mt-1 text-base font-semibold text-white">Catálogo digital</h4></div></div>
                        <p className="mt-3 text-xs leading-relaxed text-white/55">Organiza modelos, imágenes y colecciones para presentar las joyas de tu taller y compartirlas mediante un enlace público cuando esté configurado.</p>
                        <p className="mt-3 text-[10px] leading-relaxed text-white/35">La publicación depende de la configuración del catálogo de cada taller.</p>
                      </article>
                    </div>
                  </section>

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

              {seccionPlataforma === "planes" ? (
                <>
                  <section className="rounded-2xl border border-gold/20 bg-gold/[0.05] p-5 sm:p-6">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold">Planes comerciales Aurum Lab</p>
                    <h3 className="mt-2 font-display text-2xl italic text-white sm:text-3xl">Empieza con lo esencial. Crece cuando tu taller lo necesite.</h3>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/60">Los planes organizan las funcionalidades previstas para cada etapa del negocio. Las herramientas públicas siguen disponibles gratuitamente. Los accesos definitivos y los límites de cada plan todavía están en definición y no se aplican automáticamente.</p>
                  </section>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      { id: "emprendedor", nombre: "Emprendedor", precio: "Gratis", enfoque: "Para empezar a organizar tu negocio.", items: ["Herramientas públicas para joyeros", "Clientes", "Cotizaciones", "Pedidos básicos"], destacado: true },
                      { id: "taller", nombre: "Taller", precio: "Precio por definir", enfoque: "Para ordenar la gestión comercial.", items: ["Todo lo esencial de Emprendedor", "Contratos", "Ventas", "Catálogo digital"] },
                      { id: "profesional", nombre: "Profesional", precio: "Precio por definir", enfoque: "Para conectar gestión y producción.", items: ["Gestión comercial ampliada", "Diseño e impresión 3D", "Casting y corte láser", "Taller, inventario y compras"] },
                      { id: "empresarial", nombre: "Empresarial", precio: "Precio por definir", enfoque: "Para equipos y organizaciones con varias sedes.", items: ["Funciones de Profesional", "Gestión de equipo", "Operación multi-sede", "Analítica y seguimiento"] },
                    ].map((plan) => (
                      <article key={plan.id} className={"flex flex-col rounded-2xl border p-4 " + (plan.destacado ? "border-gold/40 bg-gold/[0.06]" : "border-white/10 bg-white/[0.025]")}>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-base font-semibold text-white">{plan.nombre}</h4>
                          {plan.destacado ? <span className="rounded-full border border-gold/30 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-gold">Inicial</span> : null}
                        </div>
                        <p className="mt-2 text-sm font-semibold text-gold">{plan.precio}</p>
                        <p className="mt-2 min-h-10 text-[11px] leading-relaxed text-white/50">{plan.enfoque}</p>
                        <ul className="mt-4 flex-1 space-y-2">
                          {plan.items.map((item) => <li key={item} className="flex gap-2 text-[11px] leading-relaxed text-white/70"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-gold/80" /><span>{item}</span></li>)}
                        </ul>
                      </article>
                    ))}
                  </div>

                  <section className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
                    <h4 className="text-sm font-semibold text-white">El plan no sustituye los permisos de usuario</h4>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {[
                        { title: "Plan comercial", text: "Define el conjunto de funciones y límites contratados por la organización." },
                        { title: "Rol de usuario", text: "Determina las acciones permitidas a cada persona del taller: Gerente, Operario, Monitor o Cliente." },
                        { title: "Capacidades del taller", text: "Indican las especialidades y modalidades habilitadas para cada sede." },
                      ].map((item) => <article key={item.title} className="rounded-xl border border-white/10 p-3"><p className="text-xs font-semibold text-gold">{item.title}</p><p className="mt-1.5 text-[11px] leading-relaxed text-white/50">{item.text}</p></article>)}
                    </div>
                    <p className="mt-4 rounded-lg border border-gold/20 bg-gold/[0.05] p-3 text-[10px] leading-relaxed text-white/55">Importante: esta es la propuesta informativa de los planes. Los precios de los planes de pago, sus límites y la aplicación automática de permisos aún deben definirse e implementarse.</p>
                  </section>
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

      <footer className="relative z-10 shrink-0 border-t border-white/[0.08] bg-[#10110f]/40 px-5 py-4 lg:px-6 lg:py-5 max-[767px]:block">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 text-xs text-white/45 max-[767px]:flex-col max-[767px]:justify-center max-[767px]:gap-3 max-[767px]:text-center">
          <div className="flex flex-wrap items-center gap-6 max-[767px]:justify-center max-[767px]:gap-2.5">
            <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-gold" /> Seguro y confiable</span>
            <span className="flex items-center gap-2"><Monitor className="size-4 text-gold" /> Acceso desde cualquier dispositivo</span>
            <span className="flex items-center gap-2"><Headphones className="size-4 text-gold" /> Soporte especializado</span>
          </div>
          <span>© 2026 Aurum Lab. Todos los derechos reservados.</span>
        </div>
      </footer>

    </main>
  );
}
