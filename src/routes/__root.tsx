import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { lazy, Suspense, useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { useSesion, useSincronizarSesion } from "@/lib/auth";
import { registrarServiceWorker } from "@/lib/pwa-push";
import { registrarEvento } from "@/lib/analytics";

const ContactoComercial = lazy(() => import("@/components/ContactoComercial").then((module) => ({ default: module.ContactoComercial })));
const AuriPublicoBoton = lazy(() => import("@/components/auri/AuriPublicoBoton").then((module) => ({ default: module.AuriPublicoBoton })));

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">No se pudo cargar esta página</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ocurrió un problema. Puedes intentarlo nuevamente o volver al inicio.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Intentar nuevamente
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Taller del Joyero — Gestión de joyería" },
      { name: "description", content: "Panel interno del Taller del Joyero: pedidos, diseño e impresión 3D, corte láser, taller, inventario y gestión." },
      { property: "og:title", content: "Taller del Joyero — Gestión de joyería" },
      { property: "og:description", content: "Gestiona pedidos, producción e inventario del taller de joyería." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#111111" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Taller del Joyero" },
      { name: "google", content: "notranslate" },
      { name: "google-site-verification", content: "49aJ2jM3v8am3NB35oWtwgwSFmdGB1cIuUxyxT0UdDM" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/pwa-icon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "ai-catalog", href: "/.well-known/ai-catalog.json", type: "application/json" },
      { rel: "ard", href: "/.well-known/ard.json", type: "application/json" },
      { rel: "alternate", href: "/llms.txt", type: "text/markdown", title: "Información del sitio para agentes de IA" },
      { rel: "apple-touch-icon", href: "/pwa-icon.svg" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es" translate="no">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Recupera chunks obsoletos tras un despliegue sin crear bucles de recarga.
  // La marca expira tras una carga estable y también tiene caducidad defensiva.
  useEffect(() => {
    const recoveryKey = "taller:stale-chunk-recovery:v2";
    const legacyKey = "taller:stale-chunk-reload-attempted";
    const recoveryWindowMs = 60_000;
    let reloadInProgress = false;
    let clearRecoveryTimer: number | undefined;

    try {
      window.sessionStorage.removeItem(legacyKey);
      const stored = window.sessionStorage.getItem(recoveryKey);
      if (stored) {
        const parsed = JSON.parse(stored) as { at?: number };
        if (typeof parsed.at !== "number" || Date.now() - parsed.at > recoveryWindowMs) {
          window.sessionStorage.removeItem(recoveryKey);
        } else {
          // Esta instancia ya superó el arranque tras la recarga. Si la ruta
          // sigue fallando, se conserva el bloqueo temporal para evitar loops.
          clearRecoveryTimer = window.setTimeout(() => {
            window.sessionStorage.removeItem(recoveryKey);
          }, 15_000);
        }
      }
    } catch {
      // Sin sessionStorage no se fuerza una recarga automática: evita loops
      // imposibles de limitar entre documentos.
    }

    const reloadForStaleChunk = () => {
      if (reloadInProgress) return false;

      try {
        const stored = window.sessionStorage.getItem(recoveryKey);
        if (stored) {
          const parsed = JSON.parse(stored) as { at?: number };
          if (typeof parsed.at === "number" && Date.now() - parsed.at <= recoveryWindowMs) {
            return false;
          }
        }
        window.sessionStorage.setItem(recoveryKey, JSON.stringify({ at: Date.now() }));
      } catch {
        return false;
      }

      reloadInProgress = true;
      window.location.reload();
      return true;
    };

    const handleVitePreloadError = (event: Event) => {
      if (reloadForStaleChunk()) event.preventDefault();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason ?? "");
      const isChunkLoadFailure =
        /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .+ failed|ChunkLoadError|Unable to preload CSS|Failed to load module script|CSS_CHUNK_LOAD_FAILED/i.test(message);

      if (isChunkLoadFailure && reloadForStaleChunk()) {
        event.preventDefault();
      }
    };

    window.addEventListener("vite:preloadError", handleVitePreloadError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      if (clearRecoveryTimer !== undefined) window.clearTimeout(clearRecoveryTimer);
      window.removeEventListener("vite:preloadError", handleVitePreloadError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SesionSync />
      <AnalyticsSync />
      <Outlet />
      <ContactoFlotante />
      <Toaster />
    </QueryClientProvider>
  );
}

function ContactoFlotante() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: sesion, isLoading: sesionCargando } = useSesion();
  const segmentos = pathname.split("/").filter(Boolean);
  const slugCatalogo = segmentos.length === 1 ? (segmentos[0] ?? "").toLowerCase() : "";
  const rutasInternas = new Set([
    "auth", "inicio", "perfil", "pedidos", "pedidos-2", "cotizaciones", "contratos",
    "gestion", "operario", "taller", "herramientas", "catalogo", "catalogo-publico",
    "aurum-render", "aurum-render-public", "transfer", "lovable", "mensajes",
    "cursos-formacion", "diseno-3d", "impresion-3d", "corte-laser", "ventas",
  ]);
  const esCatalogoPublico = Boolean(slugCatalogo) && !rutasInternas.has(slugCatalogo);
  const esHerramientasPublicas = pathname === "/herramientas-publicas" ||
    pathname.startsWith("/herramientas-publicas/");
  const esPaginaPublica = pathname === "/" || pathname === "/cursos-diseno-3d" ||
    /^\/formacion\/[^/]+\/?$/.test(pathname) || esCatalogoPublico;
  // Las herramientas públicas usan AURI como único acceso flotante; no mostrar el CTA antiguo «Hablemos».
  const mostrarAuri = !sesionCargando && !sesion && esHerramientasPublicas;
  const mostrarContacto = !sesionCargando && !sesion && esPaginaPublica &&
    pathname !== "/" && !esHerramientasPublicas;
  if (!mostrarAuri && !mostrarContacto) return null;
  return (
    <>
      {mostrarAuri && <Suspense fallback={null}><AuriPublicoBoton /></Suspense>}
      {mostrarContacto && <Suspense fallback={null}><ContactoComercial className={`group fixed bottom-5 right-5 z-[80] ${esCatalogoPublico ? "hidden sm:inline-flex" : "inline-flex"} min-h-14 items-center gap-2.5 rounded-full border border-[#d8bd7b]/65 bg-[#171815]/95 px-6 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#e2c982] shadow-[0_12px_38px_rgba(0,0,0,.42)] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-[#e6cf91] hover:bg-[#d8bd7b] hover:text-[#211c12] hover:shadow-[0_16px_42px_rgba(0,0,0,.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8bd7b] focus-visible:ring-offset-4 focus-visible:ring-offset-[#171815] [&_svg]:transition-transform group-hover:[&_svg]:scale-110`} /></Suspense>}
    </>
  );
}

function SesionSync() {
  useSincronizarSesion();
  useEffect(() => { registrarServiceWorker(); }, []);
  return null;
}

function AnalyticsSync() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    registrarEvento("page_view", { page: pathname });
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const element = target?.closest("button,a");
      if (!element) return;

      const text = (element.textContent || "").replace(/\s+/g, " ").trim();
      const href = element instanceof HTMLAnchorElement ? element.getAttribute("href") || "" : "";
      if (href.includes("wa.me") || href.includes("whatsapp")) {
        registrarEvento("whatsapp_clicked", { href });
        return;
      }
      if (/solicitar acceso/i.test(text)) {
        registrarEvento("access_request_started");
        return;
      }
      if (/conocer la plataforma/i.test(text)) {
        registrarEvento("platform_opened");
        return;
      }

      const toolsSection = element.closest("#herramientas");
      if (toolsSection && element.tagName === "BUTTON") {
        const title = element.querySelector("p")?.textContent?.trim() || text;
        if (title) registrarEvento("tool_opened", { tool: title });
        return;
      }
      if (/aurum render/i.test(text) || href.includes("aurum-render")) {
        registrarEvento("render_opened");
        return;
      }
      if (href.includes("/catalogo")) {
        registrarEvento("catalog_opened", { href });
        return;
      }
      if (/producto|joya/i.test(text) && href) {
        registrarEvento("product_viewed", { href });
      }
    };

    document.addEventListener("click", onClick, { passive: true });
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
