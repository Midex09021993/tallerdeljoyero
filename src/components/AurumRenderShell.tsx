import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AurumRender } from "@/components/AurumRender";

export function AurumRenderShell() {
  const navigate = useNavigate();

  useEffect(() => {
    let disposed = false;
    let cleanupHeader = () => {};
    let cleanupView = () => {};

    const wire = () => {
      if (disposed) return;
      const root = document.querySelector("header");
      if (!root) return;

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let target: HTMLElement | null = null;
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.textContent?.trim() === "Taller del Joyero") {
          target = node.parentElement;
          break;
        }
      }

      if (target) {
        const previous = target.style.cursor;
        target.style.cursor = "pointer";
        target.setAttribute("role", "link");
        target.setAttribute("tabindex", "0");
        target.setAttribute("aria-label", "Volver al inicio de sesión");
        const goHome = () => navigate({ to: "/auth" });
        target.addEventListener("click", goHome);
        const onKeyDown = (event: KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            goHome();
          }
        };
        target.addEventListener("keydown", onKeyDown);
        cleanupHeader = () => {
          target?.removeEventListener("click", goHome);
          target?.removeEventListener("keydown", onKeyDown);
          if (target) target.style.cursor = previous;
        };
      }

      const select = root.querySelector("select");
      const label = select?.closest("label");
      const extraChevron = label?.querySelector("svg.lucide-chevron-down") as SVGElement | null;
      if (extraChevron) {
        const previousDisplay = extraChevron.style.display;
        extraChevron.style.display = "none";
        cleanupView = () => {
          extraChevron.style.display = previousDisplay;
        };
      }
    };

    wire();
    const observer = new MutationObserver(() => wire());
    const rootObserver = document.body;
    observer.observe(rootObserver, { childList: true, subtree: true });

    return () => {
      disposed = true;
      observer.disconnect();
      cleanupHeader();
      cleanupView();
    };
  }, [navigate]);

  return <AurumRender />;
}
