import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convierte "yyyy-mm-dd" (o ISO) a "dd/mm/yyyy". Devuelve null si no hay fecha. */
export function fmtFecha(fecha: string | null | undefined): string | null {
  if (!fecha) return null;
  const iso = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return fecha;
}

/** Convierte "dd/mm/yyyy" a "yyyy-mm-dd". Devuelve null si es incompleta o inválida. */
export function isoDesdeDMA(texto: string): string | null {
  const m = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const anio = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  if (d.getUTCFullYear() !== anio || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}
