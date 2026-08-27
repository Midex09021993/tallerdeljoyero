// Convierte URLs de visores 3D externos a su versión incrustable (iframe).
// iJewel bloquea iframes en su URL pública, pero permite /embedded?slug=XXX.
export function urlEmbedVisor(url: string): string | null {
  try {
    const u = new URL(url);
    if (/ijewel\.design$/i.test(u.hostname) || /(^|\.)ijewel\.design$/i.test(u.hostname)) {
      if (u.pathname.startsWith("/embedded")) return url;
      // Extraer slug: último segmento de la ruta (p. ej. /profile/wwwmgldcom/20239e6)
      const partes = u.pathname.split("/").filter(Boolean);
      const slug = partes[partes.length - 1];
      if (slug) return `https://ijewel.design/embedded?slug=${encodeURIComponent(slug)}`;
      return null;
    }
    return null;
  } catch {
    return null;
  }
}
