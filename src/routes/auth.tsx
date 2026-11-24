import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { esVistaMovilTablet, inicioSegunRol, useSesion } from "@/lib/auth";
import { ArrowRight, Boxes, Calculator, Eye, EyeOff, Gem, Grid2X2, Headphones, HelpCircle, Home, LockKeyhole, Menu, X, Monitor, Network, PackageCheck, ShieldCheck, ShoppingBag, Sparkles, UserRound, UsersRound, type LucideIcon } from "lucide-react";
import { iniciarSesionUsuario, registrarPrimerDueno, sistemaSinDuenos } from "@/lib/cuentas.functions";
import { registrarEvento } from "@/lib/analytics";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import { vincularReferidoPendiente } from "@/lib/aurum-afiliados-referral";

const RegistroTaller = lazy(() => import("@/components/RegistroTaller").then((module) => ({ default: module.RegistroTaller })));
const ComunidadAurumLab = lazy(() => import("@/components/ComunidadAurumLab").then((module) => ({ default: module.ComunidadAurumLab })));
const MiniAurumRender = lazy(() => import("@/components/MiniAurumRender").then((module) => ({ default: module.MiniAurumRender })));
/** Destino validado tras iniciar sesión (p. ej. la autorización de un asistente externo). */
function destinoSiguiente(): string | null {
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next) return null;
  const destino = oauthReturnPath(next);
  return destino === "/" ? null : destino;
}

const ContactoComercial = lazy(() => import("@/components/ContactoComercial").then((module) => ({ default: module.ContactoComercial })));

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aurum Lab — Plataforma digital para talleres de joyería" },
      { name: "robots", content: "noindex, follow" },
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
  const { data: cuotasPlanesPublicas } = useQuery({
    queryKey: ["planes-comerciales-publicos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aurum_plan_quotas")
        .select("plan_id,carpetas_mi_nube_max,almacenamiento_mib,productos_catalogo_max");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
    retry: false,
  });

  const { data: estado } = useQuery({
    queryKey: ["sistema-vacio"],
    queryFn: () => sistemaSinDuenos(),
    // Evita repetir la consulta administrativa en cada visita al login.
    // El alta del primer dueño invalida esta caché explícitamente.
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });

  const [usuario, setUsuario] = useState("");
  const [emailRegistro, setEmailRegistro] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [dni, setDni] = useState("");
  const [codigoInstalacion, setCodigoInstalacion] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarAyudaPassword, setMostrarAyudaPassword] = useState(false);
  const [mostrarPlataforma, setMostrarPlataforma] = useState(false);
  const [planDetalle, setPlanDetalle] = useState<{
    id: string; nombre: string; precio: string; enfoque: string; items: string[];
    noDisponible?: boolean; carpetas?: number | null; almacenamiento?: number | null; productos?: number | null;
  } | null>(null);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [seccionPlataforma, setSeccionPlataforma] = useState<"ecosistema"|"participantes"|"flujo"|"comunidad"|"planes">("ecosistema");
  const modoAlta = Boolean(estado?.vacio && (estado as { disponible?: boolean } | undefined)?.disponible !== false);

  // Conserva el handoff de AURUM CONECT mientras se resuelve o renueva la sesión.
  // El fragmento no viaja al servidor; sessionStorage lo mantiene en este WebView.
  useEffect(() => {
    if (window.location.hash.startsWith("#aurum-conect=")) {
      window.sessionStorage.setItem("aurum-conect-pending", window.location.hash);
    }
  }, []);

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
    let cancelled = false;
    void (async () => {
      try {
        await vincularReferidoPendiente();
      } catch (error) {
        // No bloquea el acceso: la cookie se conserva para reintentar después.
        console.warn("[afiliados] No se pudo vincular el referido:", error);
      }
      if (cancelled) return;

      const siguiente = destinoSiguiente();
      if (siguiente) {
        window.location.assign(siguiente);
        return;
      }
      const importTransfer = new URLSearchParams(window.location.search).get("importTransfer");
      if (importTransfer && /^[A-Za-z0-9_-]{30,100}$/.test(importTransfer)) {
        window.location.assign(`/mi-nube?importTransfer=${encodeURIComponent(importTransfer)}`);
        return;
      }
      if (window.sessionStorage.getItem("aurum_peso_draft")) {
        window.location.assign("/herramientas?recuperarPeso=1");
        return;
      }
      // AURUM CONECT solo puede solicitar este destino interno explícito.
      // No aceptamos URLs arbitrarias para evitar redirecciones abiertas.
      if (new URLSearchParams(window.location.search).get("returnTo") === "aurum-render") {
        const transferHash = window.location.hash.startsWith("#aurum-conect=") ? window.location.hash : window.sessionStorage.getItem("aurum-conect-pending") || "";
        window.location.assign("/aurum-render" + transferHash);
        return;
      }
      navigate({ to: inicioSegunRol(sesion, { movilTablet: esVistaMovilTablet() }) });
    })();
    return () => { cancelled = true; };
  }, [sesion, navigate]);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    registrarEvento("login_started", { mode: modoAlta ? "initial_owner" : "existing_user" });
    try {
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
            codigoInstalacion,
          },
        });
        await qc.invalidateQueries({ queryKey: ["sistema-vacio"] });
      }
      // El correo de la cuenta se resuelve sólo en el servidor; aquí sólo llegan los tokens.
      const tokens = await iniciarSesionUsuario({ data: { usuario, password } });
      const { data: authData, error: err } = await supabase.auth.setSession(tokens);
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
      try {
        await vincularReferidoPendiente();
      } catch (error) {
        console.warn("[afiliados] No se pudo vincular el referido tras el acceso:", error);
      }
      registrarEvento("login_completed", { mode: modoAlta ? "initial_owner" : "existing_user" });
      const siguiente = destinoSiguiente();
      if (siguiente) {
        window.location.assign(siguiente);
        return;
      }
      if (window.sessionStorage.getItem("aurum_peso_draft")) {
        window.location.assign("/herramientas?recuperarPeso=1");
        return;
      }
      // Flujo de acceso solicitado por el complemento nativo AURUM CONECT.
      if (new URLSearchParams(window.location.search).get("returnTo") === "aurum-render") {
        // Preserve the one-time AURUM CONECT transfer fragment through login.
        // The fragment is intentionally not sent to the web server.
        const transferHash = window.location.hash.startsWith("#aurum-conect=")
          ? window.location.hash
          : window.sessionStorage.getItem("aurum-conect-pending") || "";
        window.location.assign("/aurum-render" + transferHash);
        return;
      }
      navigate({ to: inicioSegunRol(sesionActualizada, { movilTablet: esVistaMovilTablet() }), replace: true });
    } catch (e2) {
      registrarEvento("login_failed", { mode: modoAlta ? "initial_owner" : "existing_user" });
      setError(e2 instanceof Error ? e2.message : "No se pudo iniciar sesión");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-[#17232d]">
      <header className="absolute right-4 top-4 z-30 sm:right-6 sm:top-5">
        <span lang="es" aria-label="Idioma de la interfaz: español" className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-3 text-xs font-semibold text-slate-600 shadow-sm">
          <span aria-hidden="true">◎</span> Español
        </span>
      </header>
      <div className="grid min-h-screen lg:grid-cols-[40%_60%]">
        <section className="relative hidden min-h-screen flex-col items-center justify-center overflow-hidden bg-[#fff1bf] px-8 py-16 text-center md:flex lg:px-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(255,255,255,.7),transparent_45%),radial-gradient(ellipse_at_90%_75%,rgba(255,210,48,.18),transparent_38%)]" />
          <div className="relative z-10 mx-auto w-full max-w-[510px]">
            <Link to="/" aria-label="AURUM LAB: ir a la página principal" className="group mx-auto inline-flex flex-col items-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#967100] focus-visible:ring-offset-4">
              <img src="/brand/aurum-symbol.svg" alt="Símbolo oficial de AURUM LAB" width="56" height="56" className="size-14 object-contain transition-transform group-hover:scale-105" />
              <span className="mt-4 text-lg font-extrabold tracking-tight text-[#17232d]">AURUM LAB</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[.22em] text-[#7d650d]">Tecnología para joyeros</span>
            </Link>
            <div className="mt-10 overflow-hidden rounded-2xl border border-white/80 bg-[#111820] p-2 shadow-[0_18px_50px_rgba(91,73,13,.12)]">
              <Suspense fallback={<div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-4 rounded-xl bg-gradient-to-br from-[#fffaf0] via-white to-[#f6e7b2] text-[#967100]" role="status" aria-label="Preparando visor 3D">
                <Gem className="size-14 animate-pulse" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Preparando AURUM RENDER…</span>
              </div>}>
                <MiniAurumRender className="aspect-[4/3] w-full rounded-xl" />
              </Suspense>
            </div>
            <h1 className="mt-6 text-2xl font-extrabold leading-tight tracking-tight text-[#17232d] sm:text-3xl">El arte de crear.</h1>
            <h2 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight text-[#967100] sm:text-3xl">La inteligencia de gestionar.</h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-700">Herramientas técnicas, diseño 3D y recursos digitales para impulsar cada etapa de tu taller joyero.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs font-medium text-[#4b4b42]">
              <button type="button" onClick={() => { setSeccionPlataforma("ecosistema"); setMostrarPlataforma(true); }} className="rounded-full border border-[#dfc45f]/70 bg-white/60 px-3 py-2 transition hover:border-[#b99642] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#967100]">Herramientas para joyeros</button>
              <button type="button" onClick={() => { setSeccionPlataforma("flujo"); setMostrarPlataforma(true); }} className="rounded-full border border-[#dfc45f]/70 bg-white/60 px-3 py-2 transition hover:border-[#b99642] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#967100]">Aurum Render</button>
              <button type="button" onClick={() => { setSeccionPlataforma("flujo"); setMostrarPlataforma(true); }} className="rounded-full border border-[#dfc45f]/70 bg-white/60 px-3 py-2 transition hover:border-[#b99642] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#967100]">Mi Nube y catálogo</button>
            </div>
          </div>
        </section>
        <section className="relative flex min-h-screen items-center justify-center px-4 pb-10 pt-20 sm:px-8 lg:px-12">
          <div className="w-full max-w-[520px]">
            <div className="mb-8 text-center">
              <Link to="/" aria-label="AURUM LAB: ir a la página principal" className="mx-auto flex w-fit items-center justify-center gap-3 rounded-xl outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#967100] focus-visible:ring-offset-4">
                <img src="/brand/aurum-symbol.svg" alt="Símbolo oficial de AURUM LAB" width="44" height="44" className="size-11 object-contain" />
                <span className="text-2xl font-extrabold tracking-tight text-[#17232d]">AURUM <span className="text-[#a27b00]">LAB</span></span>
              </Link>
              <p className="mt-3 text-sm text-slate-600">{modoAlta ? "Configura el acceso inicial de tu plataforma" : "Bienvenido de nuevo a tu espacio de trabajo"}</p>
            </div>
        <section id="login" className="w-full">
          <div className="mb-7 text-center md:hidden">
            <p className="font-display text-4xl italic leading-none tracking-tight text-[#d9bd7b]">Aurum Lab</p>
          </div>
          <form onSubmit={entrar} className="rounded-2xl border-0 bg-white p-2 shadow-none sm:p-3">
            <div className="mb-7 flex items-center gap-3">
              <LockKeyhole className="size-6 text-[#a27b00]" />
              <div>
                <h1 className="text-xl font-semibold text-[#17232d]">{modoAlta ? "Crear el primer dueño general" : "Ingreso interno"}</h1>
                {!modoAlta ? <p className="mt-1 text-xs text-slate-500">Accede a tu taller. Todo en un solo lugar.</p> : null}
              </div>
            </div>

            <label className="mb-5 block text-xs font-medium text-slate-600">
              Usuario
              <span className="relative mt-2 block">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input required name="username" maxLength={120} autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? "auth-error" : undefined} className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-10 pr-3 text-sm text-[#17232d] outline-none transition placeholder:text-slate-400 focus:border-[#c7a52d] focus:ring-2 focus:ring-[#f5d85c]/30" />
              </span>
            </label>
            <label className="mb-5 block text-xs font-medium text-slate-600">
              Contraseña
              <span className="relative mt-2 block">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input required name="password" minLength={6} maxLength={256} type={mostrarPassword ? "text" : "password"} autoComplete={modoAlta ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? "auth-error" : undefined} className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-10 pr-10 text-sm text-[#17232d] outline-none transition placeholder:text-slate-400 focus:border-[#c7a52d] focus:ring-2 focus:ring-[#f5d85c]/30" />
                <button type="button" onClick={() => setMostrarPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#a27b00]" aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                  {mostrarPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>

            {modoAlta ? (
              <>
                <label className="mb-4 block text-xs font-medium text-slate-600">
                  Código de instalación
                  <input required type="password" name="codigo-instalacion" autoComplete="off" maxLength={256} value={codigoInstalacion} onChange={(e) => setCodigoInstalacion(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-[#17232d] outline-none focus:border-[#c7a52d]" />
                </label>
                <label className="mb-4 block text-xs font-medium text-slate-600">
                  Correo electrónico de recuperación
                  <input required type="email" name="email" autoComplete="email" maxLength={254} value={emailRegistro} onChange={(e) => setEmailRegistro(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-[#17232d] outline-none focus:border-[#c7a52d]" />
                </label>
                <label className="mb-4 block text-xs font-medium text-slate-600">
                  Nombre
                  <input required name="given-name" maxLength={80} autoComplete="given-name" value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-[#17232d] outline-none focus:border-[#c7a52d]" />
                </label>
                <label className="mb-4 block text-xs font-medium text-slate-600">
                  Apellidos
                  <input required name="family-name" maxLength={120} autoComplete="family-name" value={apellidos} onChange={(e) => setApellidos(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-[#17232d] outline-none focus:border-[#c7a52d]" />
                </label>
                <label className="mb-4 block text-xs font-medium text-slate-600">
                  DNI
                  <input required name="dni" maxLength={30} autoComplete="off" value={dni} onChange={(e) => setDni(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-[#17232d] outline-none focus:border-[#c7a52d]" />
                </label>
              </>
            ) : null}

            {error ? <p id="auth-error" role="alert" aria-live="polite" className="mb-4 text-xs text-danger">{error}</p> : null}

            <button type="submit" disabled={cargando} className="w-full rounded-xl bg-[#17232d] py-3.5 text-sm font-semibold text-white transition hover:bg-[#293b49] disabled:opacity-50">
              {cargando ? "Entrando..." : modoAlta ? "Crear y entrar" : "Entrar"}
            </button>

            {!modoAlta ? (
              <>
                <button
                  type="button"
                  onClick={() => { window.location.href = "/recuperar-contrasena"; }}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 text-xs text-slate-500 transition hover:text-[#a27b00]"
                >
                  <HelpCircle className="size-3.5" />
                  ¿Olvidaste tu contraseña?
                </button>
              </>
            ) : null}
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <p className="mb-3 text-xs text-slate-500">¿Todavía no tienes una cuenta para tu taller?</p>
            <Suspense fallback={<span className="text-xs text-slate-400">Cargando registro…</span>}>
              <RegistroTaller className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#c7a52d] bg-[#fffbee] px-5 py-3 text-sm font-semibold text-[#735800] transition hover:bg-[#fff3bd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#967100]" />
            </Suspense>
          </div>

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

          <p className="mt-5 text-center text-xs text-slate-500">
            ¿Eres cliente?{" "}
            <a href="/cliente" className="text-[#967100] underline-offset-2 hover:underline">Consulta tu pedido aquí</a>
          </p>
        </section>
          </div>
        </section>
      </div>

      {mostrarPlataforma ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2 sm:p-3 lg:p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="plataforma-title">
          <div className="relative flex max-h-[96vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-2xl border border-gold/25 bg-[#101214] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5 sm:py-3.5">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-gold">Aurum Lab · Ecosistema profesional</p>
                <h2 id="plataforma-title" className="mt-1 font-display text-2xl italic text-white sm:text-3xl">Conoce cómo funciona</h2>
              </div>
              <button type="button" onClick={() => setMostrarPlataforma(false)} aria-label="Cerrar" className="rounded-full border border-white/10 p-2 text-white/60 hover:text-gold"><EyeOff className="size-4" /></button>
            </div>

            <div className="border-b border-white/10 px-3 pt-2.5 sm:px-5">
              <p className="mb-2 text-[10px] text-white/35">Explora la plataforma por área</p>
              <div className="flex gap-1 overflow-x-auto">
              {([
                ["ecosistema","El ecosistema",Gem],
                ["participantes","Quién puede participar",UsersRound],
                ["flujo","Cómo se conecta",Grid2X2],
                ["comunidad","Comunidad Aurum Lab",Gem],
                ["planes","Planes",Sparkles],
              ] as [string, string, LucideIcon][]).map(([id,label,Icon]) => (
                <button key={String(id)} type="button" onClick={() => setSeccionPlataforma(id as typeof seccionPlataforma)}
                  className={`flex shrink-0 items-center gap-2 rounded-t-xl px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider transition ${seccionPlataforma===id ? "bg-gold/10 text-gold" : "text-white/45 hover:text-white"}`}>
                  <Icon className="size-3.5" /> {String(label)}
                </button>
              ))}
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto p-3 sm:p-4 lg:p-5">
              {seccionPlataforma === "ecosistema" ? (
                <>
                  <div className="rounded-2xl border border-gold/20 bg-gold/[0.05] p-5 sm:p-7">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold">Aurum Lab · Plataforma SaaS para joyeros</p>
                    <h3 className="mt-2 max-w-4xl font-display text-2xl italic text-white sm:text-4xl">La excelencia de tu taller, conectada.</h3>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/65">
                      Una plataforma diseñada para la industria joyera que conecta la gestión comercial, la operación del taller y las herramientas especializadas para diseñar, visualizar y presentar tus joyas con una experiencia de trabajo integrada.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wider">
                      {["Gestión del negocio","Producción y calidad","AURUM Render","Recursos y catálogo digital","Herramientas técnicas"].map((item) => <span key={item} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white/65">{item}</span>)}
                    </div>
                  </div>

                  <section className="mt-6 overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/[0.10] via-white/[0.035] to-black/20 p-5 sm:p-6">
                    <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
                      <div className="max-w-3xl">
                        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-gold">Producto insignia · tecnología propia</p>
                        <div className="mt-2 flex items-center gap-3">
                          <Sparkles className="size-7 shrink-0 text-gold"/>
                          <h3 className="font-display text-2xl italic text-white sm:text-3xl">AURUM Render</h3>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-white/75">
                          Nuestro motor de visualización 3D está desarrollado para las necesidades de la joyería. Permite explorar modelos con materiales configurables, metales, gemas e iluminación de estudio, directamente en el visor interactivo.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-semibold uppercase tracking-wider">
                          {["Motor 3D especializado","Metales y gemas","Iluminación HDR","Captura de producto"].map((item) => <span key={item} className="rounded-lg border border-gold/20 bg-black/20 px-2.5 py-1.5 text-white/70">{item}</span>)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-gold/20 bg-black/20 p-3 md:max-w-48 md:flex-col md:items-start">
                        <Gem className="size-6 shrink-0 text-gold"/>
                        <div>
                          <p className="text-xs font-semibold text-white">Diseñado para joyería</p>
                          <p className="mt-1 text-[10px] leading-relaxed text-white/50">Del modelo 3D a una presentación visual cuidada.</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      { icon: Boxes, title: "Gestión comercial", text: "Centraliza clientes, proyectos, cotizaciones, pedidos, ventas y contratos para organizar la relación comercial con cada cliente." },
                      { icon: PackageCheck, title: "Operación y producción", text: "Da seguimiento a órdenes, trabajos y piezas, con información de fabricación, materiales, avances y control de calidad según los módulos habilitados." },
                      { icon: Sparkles, title: "AURUM Render · Visualización 3D", text: "Nuestro producto insignia para visualizar joyas en 3D, explorar materiales, metales, gemas e iluminación y preparar presentaciones visuales." },
                      { icon: ShoppingBag, title: "Catálogo digital", text: "Organiza modelos y colecciones, administra imágenes y vídeos y prepara una vitrina digital para presentar las joyas de tu taller." },
                      { icon: Network, title: "Mi Nube y documentos", text: "Organiza modelos 3D, fotografías, vídeos y documentos técnicos; las opciones para compartir dependen de los permisos y funciones disponibles." },
                      { icon: Calculator, title: "Herramientas técnicas", text: "Utiliza calculadoras de yeso y agua, aleaciones de oro, conversión de tallas y herramientas de visualización y peso 3D." },
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
                      <p className="mt-2 text-sm leading-relaxed text-white/55">Organiza los archivos de trabajo y prepara una vitrina digital para presentar tus modelos, cada espacio con su propósito.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-gold/35">
                        <div className="flex items-center gap-3"><div className="rounded-xl border border-gold/25 bg-gold/10 p-2.5"><Boxes className="size-6 text-gold" /></div><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold">Espacio de trabajo</p><h4 className="mt-1 text-base font-semibold text-white">Mi Nube</h4></div></div>
                        <p className="mt-3 text-xs leading-relaxed text-white/55">Organiza recursos del taller —modelos 3D, fotografías, vídeos y documentos técnicos— en un espacio de trabajo. Las opciones para compartir dependen de las funciones habilitadas para tu usuario.</p>
                        <p className="mt-3 text-[10px] leading-relaxed text-white/35">Disponible dentro del entorno de trabajo para usuarios autorizados.</p>
                      </article>
                      <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-gold/35">
                        <div className="flex items-center gap-3"><div className="rounded-xl border border-gold/25 bg-gold/10 p-2.5"><ShoppingBag className="size-6 text-gold" /></div><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold">Vitrina comercial</p><h4 className="mt-1 text-base font-semibold text-white">Catálogo digital</h4></div></div>
                        <p className="mt-3 text-xs leading-relaxed text-white/55">Organiza modelos y colecciones, administra imágenes y vídeos y prepara una página pública para presentar el catálogo digital del taller.</p>
                        <p className="mt-3 text-[10px] leading-relaxed text-white/35">La publicación depende de la configuración del catálogo de cada taller.</p>
                      </article>
                    </div>
                  </section>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <article className="rounded-2xl border border-gold/20 bg-gold/[0.05] p-5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold">Producción y trazabilidad</p>
                      <h3 className="mt-2 text-base font-semibold text-white">Cada trabajo puede seguir su recorrido.</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/55">
                        Cuando los módulos correspondientes están habilitados, la información del pedido puede acompañar la preparación de producción, las órdenes, los trabajos y las piezas.
                      </p>
                    </article>
                    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold">Ficha técnica</p>
                      <h3 className="mt-2 text-base font-semibold text-white">La información acompaña a la pieza.</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/55">
                        Reúne referencias como materiales, talla, piedras, peso estimado, cantidades, instrucciones y archivos técnicos para consultar la información de fabricación disponible.
                      </p>
                    </article>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold">Comercial y producción</p>
                      <h3 className="mt-2 text-base font-semibold text-white">Del acuerdo con el cliente al trabajo del taller.</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/55">La información comercial puede acompañar el pedido hacia la preparación de producción, las órdenes, los trabajos y las piezas. Los documentos para clientes deben distinguirse de los costos y las notas internas del taller.</p>
                    </article>
                    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold">Talleres, áreas y responsables</p>
                      <h3 className="mt-2 text-base font-semibold text-white">Una operación adaptada a cada taller.</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/55">El trabajo puede organizarse entre integrantes, áreas y sedes según la configuración del taller. El acceso a la información depende del rol y los permisos asignados a cada usuario.</p>
                    </article>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs font-semibold text-white">También puedes empezar sin ser cliente del sistema.</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-white/50">
                      Puedes empezar con las herramientas técnicas gratuitas y explorar los módulos de gestión según las necesidades de tu taller.
                    </p>
                  </div>
                </>
              ) : null}

              {seccionPlataforma === "planes" ? (
                <>
                  <div className="mt-3 grid items-stretch gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        id: "emprendedor",
                        numero: "01",
                        nombre: "Emprendedor",
                        etiqueta: "EMPIEZA AQUÍ",
                        precio: "Gratis",
                        enfoque: "Todas las funciones de la plataforma, con límites de uso básicos.",
                        items: ["Clientes, cotizaciones, pedidos y contratos", "Ventas y catálogo digital", "Visualizador y peso 3D y AURUM Render", "Mi Nube y AURUM Transfer", "Producción, inventario, compras y gestión de equipo", "Herramientas y calculadoras para joyeros"],
                        estilo: "starter",
                      },
                      {
                        id: "taller",
                        numero: "02",
                        nombre: "Taller",
                        etiqueta: "PON ORDEN",
                        precio: "S/ 29 al mes",
                        enfoque: "Centraliza la relación con tus clientes y presenta tu trabajo.",
                        items: ["Todo lo esencial de Emprendedor", "Contratos y documentos comerciales", "Ventas y seguimiento de pedidos", "Catálogo digital con imágenes y vídeos", "Mi Nube para archivos del taller", "AURUM Transfer para compartir archivos"],
                        estilo: "standard",
                      },
                      {
                        id: "profesional",
                        numero: "03",
                        nombre: "Profesional",
                        etiqueta: "CONECTA TODO",
                        precio: "S/ 79 al mes",
                        enfoque: "Todas las funciones de la plataforma, con límites de uso más amplios.",
                        items: ["Funciones del plan Taller", "Visualizador y peso 3D", "AURUM Render (beta) para materiales, gemas y escenas", "Órdenes de producción, trabajos y piezas", "Inventario, materiales y compras", "Procesos especializados: casting y corte láser"],
                        estilo: "featured",
                        noDisponible: true,
                      },
                      {
                        id: "empresarial",
                        numero: "04",
                        nombre: "Empresarial",
                        etiqueta: "CRECE EN EQUIPO",
                        precio: "Precio por definir",
                        enfoque: "Todas las funciones de la plataforma, con límites de uso para organizaciones.",
                        items: ["Funciones del plan Profesional", "Gestión de usuarios, roles y permisos", "Organización por áreas y sedes", "Seguimiento de producción y control de calidad", "Analítica e informes de operación", "Administración centralizada multi-sede"],
                        estilo: "standard",
                        noDisponible: true,
                      },
                    ].map((plan) => (
                      <article key={plan.id} role="button" tabIndex={0} onClick={() => { const cuota = cuotasPlanesPublicas?.find((item) => item.plan_id === plan.id); setPlanDetalle({ id: plan.id, nombre: plan.nombre, precio: plan.precio, enfoque: plan.enfoque, items: plan.items, noDisponible: Boolean(plan.noDisponible), carpetas: cuota?.carpetas_mi_nube_max ?? null, almacenamiento: cuota?.almacenamiento_mib ?? null, productos: cuota?.productos_catalogo_max ?? null }); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); const cuota = cuotasPlanesPublicas?.find((item) => item.plan_id === plan.id); setPlanDetalle({ id: plan.id, nombre: plan.nombre, precio: plan.precio, enfoque: plan.enfoque, items: plan.items, noDisponible: Boolean(plan.noDisponible), carpetas: cuota?.carpetas_mi_nube_max ?? null, almacenamiento: cuota?.almacenamiento_mib ?? null, productos: cuota?.productos_catalogo_max ?? null }); } }} aria-label={`Ver capacidades del plan ${plan.nombre}`} className={"group relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-xl border p-3 transition duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:p-3.5 " + (plan.noDisponible ? "border-red-500/35 bg-gradient-to-b from-[#241718] via-[#191516] to-[#141314] hover:border-red-400/55" : plan.estilo === "featured" ? "border-gold/45 bg-gradient-to-b from-[#302719] via-[#1b1a16] to-[#151613] shadow-[0_12px_38px_rgba(194,161,92,.12)] hover:border-gold/70" : plan.estilo === "starter" ? "border-emerald-400/40 bg-gradient-to-b from-[#172923] via-[#14211d] to-[#111916] hover:border-emerald-300/60" : "border-white/10 bg-gradient-to-b from-[#1b1c1b] to-[#141514] hover:border-white/25")}>
                        <div aria-hidden="true" className={"absolute inset-x-0 top-0 h-px " + (plan.estilo === "featured" || plan.estilo === "starter" ? "bg-gradient-to-r from-transparent via-gold to-transparent" : "bg-gradient-to-r from-transparent via-white/20 to-transparent")} />
                        <div className="flex items-start justify-between gap-2">
                          <span className={"font-display text-2xl italic leading-none " + (plan.estilo === "featured" ? "text-gold/75" : plan.estilo === "starter" ? "text-emerald-300/80" : "text-white/20")}>{plan.numero}</span>
                          <span className={"rounded-full border px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.1em] " + (plan.estilo === "featured" ? "border-gold/40 bg-gold/10 text-gold" : plan.estilo === "starter" ? "border-emerald-300/30 bg-emerald-300/5 text-emerald-200" : "border-white/10 text-white/45")}>{plan.etiqueta}</span>
                        </div>
                        <h4 className="mt-2.5 text-base font-semibold tracking-tight text-white">{plan.nombre}</h4>
                        <p className={"mt-1.5 text-[13px] font-bold " + (plan.precio === "Gratis" ? "text-emerald-300" : "text-gold")}>{plan.precio}</p>
                        {plan.noDisponible && (
                          <div className="mt-2 flex items-center gap-1.5 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-red-300">
                            <span className="size-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,.75)]" />
                            No disponible todavía
                          </div>
                        )}
                        <p className="mt-1.5 min-h-[2.6rem] text-[10px] leading-snug text-white/55">{plan.enfoque}</p>
                        <div className="my-3 h-px bg-white/[0.08]" />
                        <p className="mb-2 text-[7px] font-bold uppercase tracking-[0.16em] text-white/35">Qué reúne esta etapa</p>
                        <ul className="flex-1 space-y-1.5">
                          {plan.items.map((item) => <li key={item} className="flex gap-1.5 text-[10px] leading-snug text-white/75"><ShieldCheck className={"mt-0.5 size-3.5 shrink-0 " + (plan.estilo === "featured" ? "text-gold" : plan.estilo === "starter" ? "text-emerald-300" : "text-gold/65")} /><span>{item}</span></li>)}
                        </ul>
                        {(() => {
                          const cuota = cuotasPlanesPublicas?.find((item) => item.plan_id === plan.id);
                          if (!cuota) return null;
                          const formatoAlmacenamiento = (mib: number) => mib < 0 ? "Sin límite" : mib >= 1024 ? `${Number((mib / 1024).toFixed(2))} GB` : `${mib} MB`;
                          const formatoCantidad = (valor: number | null) => valor == null ? "—" : valor < 0 ? "Sin límite" : String(valor);
                          return (
                            <div className={"mt-3 rounded-lg border p-2.5 " + (plan.estilo === "starter" ? "border-emerald-300/20 bg-emerald-300/[0.06]" : "border-white/[0.07] bg-black/15")}>
                              <p className={"mb-2 text-[7px] font-bold uppercase tracking-[0.14em] " + (plan.estilo === "starter" ? "text-emerald-200/70" : "text-white/35")}>Capacidad incluida</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div><p className="text-[8px] text-white/45">Carpetas Mi Nube</p><p className="mt-0.5 text-[10px] font-semibold text-white/85">{formatoCantidad(cuota.carpetas_mi_nube_max)}</p></div>
                                <div><p className="text-[8px] text-white/45">Almacenamiento</p><p className="mt-0.5 text-[10px] font-semibold text-white/85">{formatoAlmacenamiento(cuota.almacenamiento_mib)}</p></div>
                              </div>
                            </div>
                          );
                        })()}
                        <div className={"mt-3 rounded-lg px-2.5 py-1.5 text-[8px] font-semibold leading-snug " + (plan.estilo === "featured" ? "bg-gold/10 text-gold/90" : "bg-white/[0.035] text-white/40")}>{plan.id === "emprendedor" ? "Empieza sin coste con las herramientas públicas." : plan.id === "taller" ? "Para ordenar la gestión del día a día." : plan.id === "profesional" ? "Para conectar el diseño con la fabricación." : "Para operaciones con varios equipos o sedes."}</div>
                      </article>
                    ))}

                  </div>

                  {planDetalle && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm" role="presentation" onClick={() => setPlanDetalle(null)}>
                      <section role="dialog" aria-modal="true" aria-labelledby="plan-detalle-title" className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-gold/30 bg-[#111311] p-5 shadow-2xl sm:p-6" onClick={(event) => event.stopPropagation()}>
                        <button type="button" onClick={() => setPlanDetalle(null)} aria-label="Cerrar capacidades del plan" className="absolute right-4 top-4 rounded-full border border-white/10 p-2 text-white/60 hover:text-white"><X className="size-4" /></button>
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold">Aurum Lab · Detalle del plan</p>
                        <h3 id="plan-detalle-title" className="mt-2 pr-10 font-display text-3xl italic text-white">{planDetalle.nombre}</h3>
                        <p className="mt-1 text-sm font-bold text-gold">{planDetalle.precio}</p>
                        {planDetalle.noDisponible && <p className="mt-3 inline-flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-red-300"><span className="size-1.5 rounded-full bg-red-400" />No disponible todavía</p>}
                        <p className="mt-3 text-sm leading-relaxed text-white/60">{planDetalle.enfoque}</p>
                        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-white/75">Capacidades incluidas</h4>
                          <ul className="mt-3 space-y-2.5">
                            {planDetalle.items.map((item) => <li key={item} className="flex gap-2 text-sm leading-relaxed text-white/80"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-300" /><span>{item}</span></li>)}
                          </ul>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                          <div className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-[10px] text-white/45">Carpetas Mi Nube</p><p className="mt-1 text-base font-semibold text-white">{planDetalle.carpetas == null ? "No disponible" : planDetalle.carpetas < 0 ? "Sin límite" : planDetalle.carpetas}</p></div>
                          <div className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-[10px] text-white/45">Almacenamiento</p><p className="mt-1 text-base font-semibold text-white">{planDetalle.almacenamiento == null ? "No disponible" : planDetalle.almacenamiento < 0 ? "Sin límite" : planDetalle.almacenamiento >= 1024 ? `${Number((planDetalle.almacenamiento / 1024).toFixed(2))} GB` : `${planDetalle.almacenamiento} MB`}</p></div>
                          <div className="rounded-lg border border-white/10 bg-black/20 p-3"><p className="text-[10px] text-white/45">Productos de catálogo</p><p className="mt-1 text-base font-semibold text-white">{planDetalle.productos == null ? "No disponible" : planDetalle.productos < 0 ? "Sin límite" : planDetalle.productos}</p></div>
                        </div>
                        <p className="mt-4 text-[10px] leading-relaxed text-white/35">Las capacidades se muestran según los límites configurados. Las funciones marcadas como no disponibles son informativas y no cambian los permisos internos.</p>
                      </section>
                    </div>
                  )}
                </>
              ) : null}

              {seccionPlataforma === "comunidad" ? (
                <Suspense fallback={null}><ComunidadAurumLab /></Suspense>
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
                  <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-5">
                    <div className="mb-4 px-1">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold">Arquitectura funcional</p>
                      <h3 className="mt-2 font-display text-2xl italic text-white sm:text-3xl">Un ecosistema. Cada etapa conectada.</h3>
                      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-white/55">Así se organiza el trabajo en Aurum Lab: desde la relación comercial y la producción hasta los recursos digitales y la presentación de las joyas.</p>
                    </div>

                    <div className="rounded-xl border border-gold/50 bg-gold/[0.055] p-4 text-center sm:p-5">
                      <UsersRound className="mx-auto size-5 text-gold" />
                      <h4 className="mt-2 text-sm font-semibold text-white">Gestión comercial</h4>
                      <p className="mt-1 text-[11px] text-white/55">Cliente · Cotización · Pedido · Contrato</p>
                    </div>

                    <div className="flex justify-center py-2.5" aria-hidden="true"><ArrowRight className="size-4 rotate-90 text-gold/80" /></div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-center sm:p-5">
                      <PackageCheck className="mx-auto size-5 text-gold" />
                      <h4 className="mt-2 text-sm font-semibold text-white">Operación y producción</h4>
                      <p className="mt-1 text-[11px] text-white/55">Órdenes · Trabajos · Piezas · Calidad · Inventario</p>
                    </div>

                    <div className="flex justify-center py-2.5" aria-hidden="true"><ArrowRight className="size-4 rotate-90 text-gold/80" /></div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <article className="rounded-xl border border-gold/50 bg-gold/[0.055] p-4 text-center">
                        <Gem className="mx-auto size-5 text-gold" />
                        <h4 className="mt-2 text-sm font-semibold text-white">AURUM Render</h4>
                        <p className="mt-1 text-[11px] text-white/55">Diseño visual y modelo 3D</p>
                      </article>
                      <article className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-center">
                        <Home className="mx-auto size-5 text-gold" />
                        <h4 className="mt-2 text-sm font-semibold text-white">Mi Nube</h4>
                        <p className="mt-1 text-[11px] text-white/55">Archivos y documentación</p>
                      </article>
                    </div>

                    <div className="flex justify-center py-2.5" aria-hidden="true"><ArrowRight className="size-4 rotate-90 text-gold/80" /></div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-center sm:p-5">
                      <ShoppingBag className="mx-auto size-5 text-gold" />
                      <h4 className="mt-2 text-sm font-semibold text-white">Catálogo y presentación comercial</h4>
                      <p className="mt-1 text-[11px] text-white/55">Modelos · Imágenes · Colecciones · Visor público</p>
                    </div>
                    <p className="mt-4 px-1 text-center text-[10px] leading-relaxed text-white/35">Mapa funcional del ecosistema. Algunas conexiones dependen de los módulos habilitados, la configuración y los permisos del usuario.</p>
                  </section>

                  <div className="mt-5 rounded-2xl border border-gold/20 bg-gold/[0.04] p-5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold">Flujo principal</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {["Cliente","Gestión comercial","Producción","Control de calidad","Entrega"].map((item,i)=><span key={item} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white">{item}{i<4?<ArrowRight className="size-3 text-gold"/>:null}</span>)}
                    </div>
                    <p className="mt-4 text-xs leading-relaxed text-white/55">La gestión comercial conecta clientes, cotizaciones y pedidos con el seguimiento de producción, el control de calidad y la entrega. Los detalles de fabricación se gestionan en los módulos operativos disponibles.</p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {[
                      {title:"Preparar",text:"Reunir especificaciones de la joya, archivos de diseño, cálculos técnicos y referencias visuales."},
                      {title:"Gestionar y producir",text:"Conectar la información comercial con pedidos y, donde esté habilitado, órdenes, trabajos, piezas y seguimiento."},
                      {title:"Presentar y entregar",text:"Organizar recursos en Mi Nube, mostrar modelos en el catálogo digital y consultar la información disponible para cerrar el trabajo."},
                    ].map((x)=><article key={x.title} className="rounded-2xl border border-white/10 p-4"><p className="text-sm font-semibold text-gold">{x.title}</p><p className="mt-1.5 text-[11px] leading-relaxed text-white/50">{x.text}</p></article>)}
                  </div>
                </>
              ) : null}
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
