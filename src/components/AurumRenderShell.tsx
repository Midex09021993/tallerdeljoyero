import { lazy, Suspense, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AurumPublicViewerTest } from "@/components/AurumPublicViewerTest";

// Mantiene el motor 3D fuera del paquete inicial de rutas públicas, incluido /auth.
const AurumRender = lazy(() =>
  import("@/components/AurumRender").then((module) => ({ default: module.AurumRender })),
);

export function AurumRenderShell() {
  const publicViewerTest = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("aurumPublicViewer") === "1";
  return publicViewerTest ? <AurumPublicViewerTest /> : <AurumRenderEngineShell />;
}

function AurumRenderEngineShell() {
  const navigate = useNavigate();

  useEffect(() => {
    let disposed = false;
    let observer: MutationObserver | null = null;
    let cleanup = () => {};

    const wire = () => {
      if (disposed) return false;
      const root = document.querySelector("header");
      if (!root) return false;

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let target: HTMLElement | null = null;
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.textContent?.trim() === "Taller del Joyero") {
          target = node.parentElement;
          break;
        }
      }
      if (!target) return false;

      const previousCursor = target.style.cursor;
      target.style.cursor = "pointer";
      target.setAttribute("role", "link");
      target.setAttribute("tabindex", "0");
      target.setAttribute("aria-label", "Volver al inicio de sesión");
      const goHome = () => navigate({ to: "/auth" });
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goHome();
        }
      };
      target.addEventListener("click", goHome);
      target.addEventListener("keydown", onKeyDown);

      // Complemento Rhino desactivado temporalmente para evitar problemas de integración.
      const select = root.querySelector("select");
      const label = select?.closest("label");
      const controls = label?.parentElement;
      void controls;
      const extraChevron = label?.querySelector("svg.lucide-chevron-down") as SVGElement | null;
      const previousDisplay = extraChevron?.style.display ?? "";
      if (extraChevron) extraChevron.style.display = "none";

      cleanup = () => {
        target?.removeEventListener("click", goHome);
        target?.removeEventListener("keydown", onKeyDown);
        if (target) target.style.cursor = previousCursor;
        if (extraChevron) extraChevron.style.display = previousDisplay;
      };
      return true;
    };

    const start = () => {
      if (wire()) return;
      observer = new MutationObserver(() => {
        if (wire()) observer?.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    };

    const timer = window.setTimeout(start, 0);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      observer?.disconnect();
      cleanup();
    };
  }, [navigate]);

  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#050608] text-sm text-white/65">
          Preparando Aurum Render…
        </div>
      }
    >
      <AurumRender />
    </Suspense>
  );
}
