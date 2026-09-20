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

  const renderCampos = (
    campos: ReadonlyArray<readonly [keyof PedidoFormState, string, string]>,
  ) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {campos
        .filter(([campo]) => campo !== "cliente" || !bloqueados.has(campo))
        .map(([campo, etiqueta, tipo]) => {
          const bloqueado = bloqueados.has(campo);
          return (
            <label key={campo} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {etiqueta}
              <input
                type={tipo}
                min={campo === "cantidad_piezas" ? 1 : undefined}
                required={campo === "trabajo"}
                value={form[campo]}
                onChange={(e) => onChange({ ...form, [campo]: e.target.value })}
                disabled={bloqueado}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground sm:py-2 sm:text-sm"
              />
            </label>
          );
        })}
    </div>
  );

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-gold/15 bg-surface-sunken/50 p-4 sm:p-5">
        <div className="mb-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold">01 · Comercial</p>
          <h3 className="mt-1 text-sm font-semibold text-foreground">Datos comerciales del pedido</h3>
          <p className="mt-1 text-xs text-muted-foreground">Contrato, origen y condiciones económicas.</p>
        </div>
        {renderCampos(
          CAMPOS_PEDIDO.filter(([campo]) =>
            ["contrato", "origen", "importe", "a_cuenta"].includes(campo),
          ),
        )}
        <div className="mt-3 max-w-[260px]">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Saldo (S/)
            <input
              type="text"
              value={Math.max(0, (Number(form.importe) || 0) - (Number(form.a_cuenta) || 0)).toFixed(2)}
              readOnly
              className="mt-1 w-full rounded-lg border border-border bg-surface-muted px-3 py-3 text-base font-semibold text-foreground sm:py-2 sm:text-sm"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="mb-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold">02 · Técnico</p>
          <h3 className="mt-1 text-sm font-semibold text-foreground">Ficha técnica de la pieza</h3>
          <p className="mt-1 text-xs text-muted-foreground">Define qué se debe fabricar y con qué especificaciones.</p>
        </div>
        {renderCampos(
          CAMPOS_PEDIDO.filter(([campo]) =>
            ["trabajo", "peso_estimado", "material", "piedras", "talla", "cantidad_piezas"].includes(campo),
          ),
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="mb-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold">03 · Entrega</p>
          <h3 className="mt-1 text-sm font-semibold text-foreground">Fechas, sede y notas</h3>
          <p className="mt-1 text-xs text-muted-foreground">Organiza cuándo entra, cuándo debe entregarse y dónde se gestiona.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Fecha de ingreso
            <FechaInput
              value={form.fecha_ingreso}
              onChangeIso={(iso) => onChange({ ...form, fecha_ingreso: iso })}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground sm:py-2 sm:text-sm"
            />
          </label>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Fecha de entrega
            <FechaInput
              value={form.fecha_entrega}
              onChangeIso={(iso) => onChange({ ...form, fecha_entrega: iso })}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground sm:py-2 sm:text-sm"
            />
          </label>
          {sedeSelect ? <div>{sedeSelect}</div> : null}
        </div>
        <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Notas generales
          <input
            type="text"
            value={form.notas}
            onChange={(e) => onChange({ ...form, notas: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/10 sm:py-2 sm:text-sm"
          />
        </label>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="mb-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold">04 · Producción</p>
          <h3 className="mt-1 text-sm font-semibold text-foreground">Ruta del pedido</h3>
          <p className="mt-1 text-xs text-muted-foreground">Marca sólo las áreas que realmente necesita esta pieza.</p>
        </div>
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
                className={[
                  "rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all sm:rounded-full sm:py-1.5",
                  activa
                    ? "border-gold/30 bg-gold text-gold-foreground shadow-card"
                    : "border-border bg-card text-muted-foreground hover:border-gold/50 hover:text-gold-deep",
                ].join(" ")}
              >
                {area}
              </button>
            );
          })}
        </div>
      </section>

      {ruta.some((area) => areaCoincide(area, "Corte Láser")) ? (
        <section className="rounded-2xl border border-gold/15 bg-surface-sunken/50 p-4 sm:p-5">
          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold">Detalle especializado</p>
            <h3 className="mt-1 text-sm font-semibold text-foreground">Información de Corte Láser</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CAMPOS_CORTE_LASER.map(([campo, etiqueta]) => (
              <label key={campo} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {etiqueta}
                <input
                  type="text"
                  value={form[campo]}
                  onChange={(e) => onChange({ ...form, [campo]: e.target.value })}
                  disabled={bloqueados.has(campo)}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground sm:py-2 sm:text-sm"
                />
              </label>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
