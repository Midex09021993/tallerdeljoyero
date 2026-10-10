/** Zona IANA válida o null. */
export function zonaValida(zona?: string | null): string | null {
  if (!zona) return null;
  try {
    new Intl.DateTimeFormat("es", { timeZone: zona });
    return zona;
  } catch {
    return null;
  }
}

/**
 * Fecha comercial en la zona horaria de la sede. Los instantes se guardan en UTC;
 * las fechas puras (YYYY-MM-DD) se muestran tal cual, sin desfase por zona.
 */
export function formatearFechaZona(value?: string | null, zona?: string | null, locale = "es-PE"): string {
  if (!value) return "—";
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(soloFecha ? value + "T12:00:00Z" : value);
  if (Number.isNaN(date.getTime())) return value;
  const timeZone = soloFecha ? "UTC" : zonaValida(zona) ?? undefined;
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone }).format(date);
}
