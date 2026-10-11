import { useEffect, useState } from "react";

/** Firma de la versión: rutas de los scripts/estilos con hash de la página. */
function firmaDesdeHtml(html: string): string {
  const refs = html.match(/\/assets\/[A-Za-z0-9._-]+\.(?:js|css)/g) ?? [];
  return Array.from(new Set(refs)).sort().join("|");
}

/**
 * Detecta si se publicó una versión nueva de la web comparando los assets
 * con hash del HTML actual del servidor con los de la página cargada.
 * Nunca recarga sola: solo informa.
 */
export function useNuevaVersion(intervaloMs = 60_000): boolean {
  const [nueva, setNueva] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const inicial = firmaDesdeHtml(document.documentElement.outerHTML);
    if (!inicial) return; // modo desarrollo: sin assets con hash
    let cancelado = false;
    const comprobar = async () => {
      try {
        const res = await fetch(`${window.location.origin}/?_v=${Date.now()}`, { cache: "no-store", credentials: "same-origin" });
        if (!res.ok) return;
        const firma = firmaDesdeHtml(await res.text());
        if (!cancelado && firma && firma !== inicial) setNueva(true);
      } catch { /* sin red: reintentar luego */ }
    };
    void comprobar();
    const id = window.setInterval(() => void comprobar(), intervaloMs);
    const alVolver = () => { if (document.visibilityState === "visible") void comprobar(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => { cancelado = true; window.clearInterval(id); document.removeEventListener("visibilitychange", alVolver); };
  }, [intervaloMs]);
  return nueva;
}
