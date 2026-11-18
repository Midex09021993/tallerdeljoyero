import { lazy, Suspense, useEffect, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtFecha, isoDesdeDMA } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
const Calendar = lazy(() => import("@/components/ui/calendar").then((module) => ({ default: module.Calendar })));

// Evita cargar date-fns en el árbol SSR. Este campo solo maneja fechas civiles
// (yyyy-mm-dd), por lo que la API nativa permite conservar el mismo formato.
function fechaDesdeISO(iso: string): Date | undefined {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined;
  return date;
}

function isoDesdeFecha(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
/**
 * Campo de fecha con formato dd/mm/yyyy.
 * - Permite escribir la fecha manualmente.
 * - Incluye un botón para desplegar un calendario.
 * - Modo controlado: pasa `value` (ISO "yyyy-mm-dd") y `onChangeIso`.
 * - Modo formulario (FormData): pasa `name` y `defaultValue`; incluye un
 *   input oculto con el valor ISO.
 */
export function FechaInput({
  name,
  value,
  defaultValue,
  onChangeIso,
  required,
  className,
}: {
  name?: string;
  value?: string;
  defaultValue?: string | null;
  onChangeIso?: (iso: string) => void;
  required?: boolean;
  className?: string;
}) {
  const controlado = value !== undefined;
  const [texto, setTexto] = useState(() => fmtFecha(value ?? defaultValue ?? "") ?? "");
  const [iso, setIso] = useState(value ?? defaultValue ?? "");
  const [abierto, setAbierto] = useState(false);
  const [calendarDisponible, setCalendarDisponible] = useState(false);

  useEffect(() => {
    setCalendarDisponible(true);
  }, []);

  useEffect(() => {
    if (controlado) {
      setIso(value ?? "");
      setTexto(fmtFecha(value ?? "") ?? "");
    }
  }, [value, controlado]);

  const aplicarFecha = (nuevoIso: string) => {
    setIso(nuevoIso);
    setTexto(fmtFecha(nuevoIso) ?? "");
    onChangeIso?.(nuevoIso);
  };

  const manejar = (entrada: string) => {
    const digitos = entrada.replace(/\D/g, "").slice(0, 8);
    const mascara = [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4, 8)]
      .filter(Boolean)
      .join("/");
    setTexto(mascara);
    const nuevoIso = mascara ? (isoDesdeDMA(mascara) ?? "") : "";
    setIso(nuevoIso);
    onChangeIso?.(nuevoIso);
  };

  const fechaDate = iso ? fechaDesdeISO(iso) : undefined;

  return (
    <div className={cn("relative flex items-center", className)}>
      <input
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        required={required}
        value={texto}
        onChange={(e) => manejar(e.target.value)}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
      />
      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="absolute right-2 rounded p-1 text-muted-foreground hover:bg-surface-muted"
            aria-label="Abrir calendario"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {calendarDisponible ? <Suspense fallback={<div className="h-[280px] w-[280px]" aria-label="Cargando calendario" />}>
            <Calendar
              mode="single"
              selected={fechaDate}
              onSelect={(d) => {
                if (d) {
                  aplicarFecha(isoDesdeFecha(d));
                }
                setAbierto(false);
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </Suspense> : <div className="h-[280px] w-[280px]" aria-label="Cargando calendario" />}
        </PopoverContent>
      </Popover>
      {name ? <input type="hidden" name={name} value={iso} /> : null}
    </div>
  );
}
