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
  ["contrato", "N° contrato", "text"],
  ["cliente", "Nombre", "text"],
  ["origen", "Origen / lugar", "text"],
  ["trabajo", "Descripción / trabajo", "text"],
  ["peso_estimado", "Peso", "text"],
  ["material", "Material", "text"],
  ["piedras", "Piedras", "text"],
  ["talla", "Talla", "text"],
  ["cantidad_piezas", "Cantidad", "number"],
  ["importe", "Precio (S/)", "number"],
  ["a_cuenta", "A cuenta (S/)", "number"],
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
        {CAMPOS_PEDIDO.filter(([campo]) => campo !== "cliente" || !bloqueados.has(campo)).map(([campo, etiqueta, tipo]) => {
          const bloqueado = bloqueados.has(campo);
          return (
            <label key={campo} className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {etiqueta}
              <input
                type={tipo}
                min={campo === "cantidad_piezas" ? 1 : undefined}
                required={campo === "cliente" || campo === "trabajo"}
                value={form[campo]}
                onChange={(e) => onChange({ ...form, [campo]: e.target.value })}
                disabled={bloqueado}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground sm:py-2 sm:text-sm"
              />
            </label>
          );
        })}
        {sedeSelect}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Saldo (S/)
          <input
            type="text"
            value={Math.max(0, (Number(form.importe) || 0) - (Number(form.a_cuenta) || 0)).toFixed(2)}
            readOnly
            className="mt-1 w-full rounded-lg border border-border bg-surface-muted px-3 py-3 text-base font-semibold text-foreground sm:py-2 sm:text-sm"
          />
        </label>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Fecha de ingreso
          <FechaInput
            value={form.fecha_ingreso}
            onChangeIso={(iso) => onChange({ ...form, fecha_ingreso: iso })}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground sm:py-2 sm:text-sm"
          />
        </label>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Fecha de entrega
          <FechaInput
            value={form.fecha_entrega}
            onChangeIso={(iso) => onChange({ ...form, fecha_entrega: iso })}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground sm:py-2 sm:text-sm"
          />
        </label>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground sm:col-span-2 lg:col-span-4">
          Notas generales
          <input
            type="text"
            value={form.notas}
            onChange={(e) => onChange({ ...form, notas: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground sm:py-2 sm:text-sm"
          />
        </label>
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
