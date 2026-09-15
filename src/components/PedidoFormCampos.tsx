import type React from "react";
import { FechaInput } from "@/components/FechaInput";
import { areaCoincide } from "@/lib/auth";
import { RUTA_AREAS_PEDIDO, type PedidoFormState } from "@/lib/pedido-form";

const CAMPOS_CORTE_LASER = [
  ["corte_texto", "Texto a grabar o cortar"],
  ["corte_tipografia", "Tipografía (opcional)"],
  ["corte_ubicacion", "Ubicación (opcional)"],
  ["corte_observaciones", "Observaciones"],
] as const;

const CAMPOS_PEDIDO = [
  ["cliente", "Cliente", "text"],
  ["telefono", "WhatsApp", "tel"],
  ["origen", "Origen / lugar", "text"],
  ["contrato", "N° contrato", "text"],
  ["trabajo", "Trabajo solicitado", "text"],
  ["material", "Material", "text"],
  ["peso_estimado", "Peso estimado (g)", "text"],
  ["importe", "Costo (S/)", "number"],
  ["talla", "Talla / medida", "text"],
  ["cantidad_piezas", "Cantidad de piezas", "number"],
  ["piedras", "Piedras / componentes", "text"],
  ["notas", "Notas generales", "text"],
  ["fecha_ingreso", "Fecha de ingreso", "date"],
  ["fecha_entrega", "Fecha de entrega", "date"],
] as const;

export function PedidoFormCampos({
  form,
  onChange,
  ruta,
  onRutaChange,
  sedeSelect,
  camposBloqueados = [],
}: {
  form: PedidoFormState;
  onChange: (form: PedidoFormState) => void;
  ruta: string[];
  onRutaChange: (ruta: string[]) => void;
  sedeSelect?: React.ReactNode;
  camposBloqueados?: Array<keyof PedidoFormState>;
}) {
  const bloqueados = new Set(camposBloqueados);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CAMPOS_PEDIDO.map(([campo, etiqueta, tipo]) => {
          const bloqueado = bloqueados.has(campo);
          return (
            <label
              key={campo}
              className={`text-[10px] uppercase tracking-wider text-muted-foreground ${
                campo === "notas" ? "sm:col-span-2 lg:col-span-2" : ""
              }`}
            >
              {etiqueta}
              {tipo === "date" ? (
                <FechaInput
                  value={form[campo]}
                  onChangeIso={(iso) => onChange({ ...form, [campo]: iso })}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground sm:py-2 sm:text-sm"
                />
              ) : (
                <input
                  type={tipo}
                  min={campo === "cantidad_piezas" ? 1 : undefined}
                  required={campo === "cliente" || campo === "trabajo"}
                  value={form[campo]}
                  onChange={(e) => onChange({ ...form, [campo]: e.target.value })}
                  disabled={bloqueado}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground sm:py-2 sm:text-sm"
                />
              )}
            </label>
          );
        })}
        {sedeSelect}
      </div>

      <fieldset className="mt-5">
        <legend className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          Ruta del pedido (marca sólo las áreas que necesita)
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {RUTA_AREAS_PEDIDO.map((area) => {
            const activa = ruta.includes(area);
            return (
              <button
                key={area}
                type="button"
                onClick={() =>
                  onRutaChange(
                    activa
                      ? ruta.filter((x) => x !== area)
                      : RUTA_AREAS_PEDIDO.filter((x) => [...ruta, area].includes(x)),
                  )
                }
                className={`rounded-lg border px-3 py-2 text-xs transition-colors sm:rounded-full sm:py-1.5 ${
                  activa ? "border-transparent bg-ink text-gold-bright" : "border-border bg-card"
                }`}
              >
                {area}
              </button>
            );
          })}
        </div>
      </fieldset>

      {ruta.some((area) => areaCoincide(area, "Corte Láser")) ? (
        <fieldset className="mt-5">
          <legend className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            Información de Corte Láser
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CAMPOS_CORTE_LASER.map(([campo, etiqueta]) => (
              <label
                key={campo}
                className="text-[10px] uppercase tracking-wider text-muted-foreground"
              >
                {etiqueta}
                <input
                  type="text"
                  value={form[campo]}
                  onChange={(e) => onChange({ ...form, [campo]: e.target.value })}
                  disabled={bloqueados.has(campo)}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground sm:py-2 sm:text-sm"
                />
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
    </>
  );
}
