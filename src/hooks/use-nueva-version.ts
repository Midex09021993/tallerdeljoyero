import { useEffect, useState } from "react";

/**
 * Detecta una publicación nueva comparando el entrypoint de la página abierta
 * con el entrypoint del HTML publicado. Nunca recarga automáticamente.
 */
function entradaDesdeHtml(html: string): string {
  const etiquetas = html.match(/<script\b[^>]*>/gi) ?? [];
  for (const etiqueta of etiquetas) {
    if (!/\btype=["']module["']/i.test(etiqueta)) continue;
    const src = etiqueta.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (src) return src;
  }
  return "";
}

function entradaActual(): string {
  return document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.getAttribute("src") ?? "";
}

export function useNuevaVersion(intervaloMs = 120_000): boolean {
  const [nueva, setNueva] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const inicial = entradaActual();
    if (!inicial || !/\/assets\//.test(inicial)) return;
    let cancelado = false;

    const comprobar = async () => {
      try {
        const url = window.location.origin + "/?_version_check=" + Date.now();
        const res = await fetch(url, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok) return;
        const publicado = entradaDesdeHtml(await res.text());
        if (!cancelado && publicado && publicado !== inicial) setNueva(true);
      } catch {
        // Sin conexión, no mostrar un aviso falso; volver a comprobar después.
      }
    };

    void comprobar();
    const id = window.setInterval(() => void comprobar(), intervaloMs);
    const alVolver = () => {
      if (document.visibilityState === "visible") void comprobar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      cancelado = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [intervaloMs]);

  return nueva;
}
