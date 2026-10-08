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
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { useSincronizarSesion } from "@/lib/auth";
import { registrarServiceWorker } from "@/lib/pwa-push";
import { consumirInicioLogin, marcarInicioLogin, registrarEvento } from "@/lib/analytics";

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
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
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
  return (
    <QueryClientProvider client={queryClient}>
      <SesionSync />
      <AnalyticsSync />
      <Outlet />
      <Toaster />
    </QueryClientProvider>
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
    if (pathname !== "/auth" && consumirInicioLogin()) {
      registrarEvento("login_completed", { destination: pathname });
    }
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
      if (/^(entrar|iniciar sesión)$/i.test(text)) {
        marcarInicioLogin();
        registrarEvento("login_started");
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
