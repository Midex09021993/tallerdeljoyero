import { useEffect, useState } from "react";
import { fmtFecha, isoDesdeDMA } from "@/lib/utils";

/**
 * Campo de fecha con formato dd/mm/yyyy.
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

  useEffect(() => {
    if (controlado) {
      setIso(value ?? "");
      setTexto(fmtFecha(value ?? "") ?? "");
    }
  }, [value, controlado]);

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

  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        required={required}
        value={texto}
        onChange={(e) => manejar(e.target.value)}
        className={className}
      />
      {name ? <input type="hidden" name={name} value={iso} /> : null}
    </>
  );
}
