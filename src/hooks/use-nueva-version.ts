import { useEffect, useState } from "react";

/**
 * Detecta publicaciones nuevas comparando el entrypoint cargado con el HTML publicado.
 * Recarga automáticamente solo cuando la pantalla permite hacerlo sin interrumpir una subida.
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

export function useNuevaVersion(puedeRecargar = true, intervaloMs = 120_000): boolean {
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

  useEffect(() => {
    if (!nueva || !puedeRecargar || typeof window === "undefined") return;
    // La versión nueva se aplica en un punto seguro; no interrumpir subidas activas.
    let id = 0;
    const recargarSiVisible = () => {
      if (document.visibilityState !== "visible") return;
      window.clearTimeout(id);
      id = window.setTimeout(() => window.location.reload(), 800);
    };
    recargarSiVisible();
    document.addEventListener("visibilitychange", recargarSiVisible);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("visibilitychange", recargarSiVisible);
    };
  }, [nueva, puedeRecargar]);

  return nueva;
}
