import { lazy, Suspense, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

// Mantiene el motor 3D fuera del paquete inicial de rutas públicas, incluido /auth.
const AurumRender = lazy(() =>
  import("@/components/AurumRender").then((module) => ({ default: module.AurumRender })),
);

export function AurumRenderShell() {
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

      const pluginLink = document.createElement("a");
      pluginLink.href = "/aurum-render-plugin";
      pluginLink.textContent = "Complemento Rhino";
      pluginLink.setAttribute("aria-label", "Descargar complemento para Rhino 7");
      pluginLink.className = "inline-flex items-center justify-center rounded-lg border border-[#b28b45]/50 px-3 py-2 text-xs font-semibold text-[#d6bd86] transition hover:bg-[#b28b45]/10";
      pluginLink.style.marginLeft = "12px";
      pluginLink.style.whiteSpace = "nowrap";
      root.appendChild(pluginLink);

      const select = root.querySelector("select");
      const label = select?.closest("label");
      const extraChevron = label?.querySelector("svg.lucide-chevron-down") as SVGElement | null;
      const previousDisplay = extraChevron?.style.display ?? "";
      if (extraChevron) extraChevron.style.display = "none";

      cleanup = () => {
        target?.removeEventListener("click", goHome);
        target?.removeEventListener("keydown", onKeyDown);
        if (target) target.style.cursor = previousCursor;
        if (pluginLink.parentElement) pluginLink.parentElement.removeChild(pluginLink);
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
