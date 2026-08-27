import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtFecha, isoDesdeDMA } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

  const fechaDate = iso ? parseISO(iso) : undefined;

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
          <Calendar
            mode="single"
            selected={fechaDate}
            onSelect={(d) => {
              if (d) {
                aplicarFecha(format(d, "yyyy-MM-dd"));
              }
              setAbierto(false);
            }}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      {name ? <input type="hidden" name={name} value={iso} /> : null}
    </div>
  );
}
