import { createFileRoute } from "@tanstack/react-router";
import { Calculator, Droplets, RotateCcw, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, Panel, StatCard } from "@/components/AppShell";
import { AreaOperario, PedidosArea } from "@/components/PedidosArea";
import { usePedidosDeArea } from "@/hooks/use-pedidos-area";
import { SelectorSedeDueno, useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
import { useConfigSistema } from "@/lib/taller-db";
import { useSesion } from "@/lib/auth";
import { CLAVES_CALCULADORAS, leerConfigYeso } from "@/lib/calculadoras-config";

export const Route = createFileRoute("/_authenticated/taller")({
  head: () => ({
    meta: [
      { title: "Taller — Aurum Lab" },
      {
        name: "description",
        content: "Pedidos reales del taller, engaste, pulido, fundición y calculadora de yeso.",
      },
      { property: "og:title", content: "Taller — Aurum Lab" },
      { property: "og:description", content: "Pedidos reales y herramientas técnicas del taller." },
    ],
  }),
  component: TallerPage,
});

const tiposTarro = {
  liso: {
    etiqueta: "Tarro liso",
    toleranciaInicial: -5,
    ayuda: "Descuenta tolerancia por cilindro liso.",
  },
  perforado: {
    etiqueta: "Tarro perforado",
    toleranciaInicial: 20,
    ayuda: "Agrega tolerancia por perforaciones y mayor consumo.",
  },
} as const;

type TipoTarro = keyof typeof tiposTarro;

function formatearCantidad(valor: number, decimales = 1) {
  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: decimales,
    minimumFractionDigits: valor > 0 ? decimales : 0,
  }).format(valor);
}

function formatearEntero(valor: number) {
  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 0,
  }).format(Math.round(valor));
}

function calcularMezcla(
  volumen: number,
  partesAgua: number,
  partesYeso: number,
  volumenPorGramo: number,
  factorCorreccion: number,
) {
  // Las recetas 38/62, 40/60 y 42/58 se expresan como
  // agua / yeso. Por tanto, 40/60 significa agua ÷ yeso = 0.40.
  // "partesYeso" se conserva para documentar la receta, pero la
  // relación operativa se obtiene explícitamente del primer valor.
  const ratioAguaSobreYeso = partesAgua / 100;
  const volumenEspecificoAjustado = volumenPorGramo * factorCorreccion;
  const yeso = volumen / (volumenEspecificoAjustado + ratioAguaSobreYeso);
  const agua = yeso * ratioAguaSobreYeso;

  return {
    agua,
    yeso,
    ratioAguaSobreYeso,
    relacionVerificada: yeso > 0 ? agua / yeso : 0,
    partesYeso,
  };
}

function TallerPage() {
  const { data: sesion } = useSesion();
  if (sesion?.rolPrincipal === "operario") {
    return (
      <AreaOperario area="Taller">
        <details className="hidden rounded-2xl border border-border bg-card shadow-card lg:block">
          <summary className="cursor-pointer px-4 py-4 text-sm font-semibold">
            Herramientas técnicas
          </summary>
          <div className="border-t border-border">
            <CalculadoraYeso />
          </div>
        </details>
      </AreaOperario>
    );
  }

  return <TallerCompleto />;
}

function TallerCompleto() {
  const { pedidos, enTrabajo } = usePedidosDeArea("Taller");
  const { esDueno, sedeFiltro, setSedeFiltro, sedes, etiquetaSede } = useSedeFiltroDueno();

  return (
    <AppShell
      titulo="Taller"
      subtitulo={`Pedidos que requieren trabajo manual, engaste, pulido o fundición · ${etiquetaSede}`}
      ocultarAccionesCelular
      acciones={
        <>
          <SelectorSedeDueno
            esDueno={esDueno}
            sedes={sedes}
            value={sedeFiltro}
            onChange={setSedeFiltro}
          />
          <StatCard etiqueta="Asignados" valor={String(pedidos.length)} />
          <StatCard etiqueta="En trabajo" valor={String(enTrabajo.length)} />
        </>
      }
    >
      <PedidosArea area="Taller" titulo="Pedidos asignados a Taller" />
      <div className="max-sm:hidden">
        <CalculadoraYeso />
      </div>
    </AppShell>
  );
}

export function CalculadoraYeso({ compacto = false }: { compacto?: boolean }) {
  const { esDueno } = useSedeFiltroDueno();
  const { data: configYeso } = useConfigSistema(CLAVES_CALCULADORAS.yeso);
  const configuracion = leerConfigYeso(configYeso?.valor);
  const [diametro, setDiametro] = useState("");
  const [altura, setAltura] = useState("");
  const [tipoTarro, setTipoTarro] = useState<TipoTarro>("perforado");

  const volumenBase = useMemo(() => {
    const d = Number(diametro);
    const h = Number(altura);
    if (!Number.isFinite(d) || !Number.isFinite(h) || d <= 0 || h <= 0) return 0;
    const radio = d / 2;
    return Math.PI * radio * radio * h;
  }, [altura, diametro]);

  const volumen = useMemo(() => {
    if (volumenBase <= 0) return 0;
    return volumenBase * (1 + configuracion.tolerancias[tipoTarro] / 100);
  }, [tipoTarro, configuracion.tolerancias, volumenBase]);

  const medidasCompletas = volumenBase > 0;
  const limpiar = () => {
    setDiametro("");
    setAltura("");
    setTipoTarro("perforado");
  };

  return (
    <Panel
      titulo="Calculadora de yeso"
      accion={
        <span className="hidden items-center gap-1.5 rounded-full border border-gold/20 bg-accent px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground sm:inline-flex">
          <Droplets className="size-3" aria-hidden="true" />
          Mezcla para fundición
        </span>
      }
    >
      <div className={`space-y-4 p-4 sm:space-y-5 sm:p-6 lg:p-8 ${compacto ? "" : "max-w-5xl mx-auto"}`}>
        <section className="rounded-3xl border border-border bg-card/60 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
              <Calculator className="size-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">Medidas del cilindro</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">Introduce las medidas reales del tarro antes de preparar la mezcla.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="min-w-0 space-y-2">
              <span className="block text-[11px] font-semibold text-muted-foreground">Diámetro</span>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={diametro}
                  onChange={(e) => setDiametro(e.target.value)}
                  placeholder="7.50"
                  aria-label="Diámetro del cilindro en centímetros"
                  className="h-14 w-full rounded-2xl border border-input bg-background px-3 pr-12 text-lg font-semibold outline-none transition placeholder:text-muted-foreground/40 focus:border-gold focus:ring-4 focus:ring-gold/10"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">cm</span>
              </div>
            </label>

            <label className="min-w-0 space-y-2">
              <span className="block text-[11px] font-semibold text-muted-foreground">Altura</span>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={altura}
                  onChange={(e) => setAltura(e.target.value)}
                  placeholder="10.00"
                  aria-label="Altura del cilindro en centímetros"
                  className="h-14 w-full rounded-2xl border border-input bg-background px-3 pr-12 text-lg font-semibold outline-none transition placeholder:text-muted-foreground/40 focus:border-gold focus:ring-4 focus:ring-gold/10"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">cm</span>
              </div>
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/60 p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                <Droplets className="size-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">Tipo de tarro</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Selecciona el que vas a utilizar.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(tiposTarro) as TipoTarro[]).map((tipo) => {
              const seleccionado = tipoTarro === tipo;
              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setTipoTarro(tipo)}
                  aria-pressed={seleccionado}
                  className={`min-h-14 rounded-2xl border px-3 py-3 text-left transition active:scale-[0.98] ${
                    seleccionado
                      ? "border-gold bg-gradient-to-b from-gold/20 to-gold/5 text-foreground shadow-[0_6px_18px_rgba(180,140,50,0.10)]"
                      : "border-input bg-background text-muted-foreground hover:border-gold/60 hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                    {tiposTarro[tipo].etiqueta}
                    {seleccionado ? <Check className="size-4 shrink-0 text-gold" aria-hidden="true" /> : null}
                  </span>
                  <span className="mt-1 block text-[10px] opacity-70">
                    {tipo === "liso" ? "Cilindro estándar" : "Cilindro perforado"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {esDueno ? (
          <section className="rounded-3xl border border-gold/20 bg-gold/5 p-4 sm:p-5 shadow-[0_6px_24px_rgba(180,140,50,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Vista técnica · Dueño</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {volumen > 0 ? `${formatearEntero(volumen)} ml` : "—"}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Base: {volumenBase > 0 ? `${formatearEntero(volumenBase)} cm³` : "0 cm³"} · {tiposTarro[tipoTarro].etiqueta} {configuracion.tolerancias[tipoTarro] >= 0 ? "+" : ""}{formatearCantidad(configuracion.tolerancias[tipoTarro], 2)}%
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <section aria-live="polite" className="rounded-3xl border border-gold/20 bg-gradient-to-br from-card to-accent/30 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">Mezcla recomendada</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {medidasCompletas ? `Para ${formatearEntero(volumen)} ml de volumen ajustado` : "Completa diámetro y altura para calcular"}
              </p>
            </div>
            {medidasCompletas ? (
              <span className="rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold text-gold-foreground">Lista</span>
            ) : null}
          </div>

          <div className={`grid grid-cols-1 gap-3 ${compacto ? "" : "sm:grid-cols-3"}`}>
            {configuracion.proporciones.map((p) => {
              const { agua, yeso } = calcularMezcla(
                volumen,
                p.agua,
                p.yeso,
                configuracion.volumenPorGramo,
                configuracion.factorCorreccion,
              );
              return (
                <article
                  key={`${p.agua}-${p.yeso}`}
                  className={`rounded-2xl border p-4 sm:p-5 ${
                    p.recomendada
                      ? "border-gold bg-background shadow-[0_8px_24px_rgba(180,140,50,0.10)]"
                      : "border-border bg-background/70"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xl font-bold tracking-tight text-foreground">{p.agua}/{p.yeso}</p>
                      <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">agua / yeso</p>
                    </div>
                    {p.recomendada ? (
                      <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-gold">Recomendada</span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-surface-muted p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Agua</p>
                      <p className="mt-2 text-2xl font-semibold leading-none text-foreground">
                        {medidasCompletas ? formatearEntero(agua) : "—"} <span className="text-xs font-medium text-muted-foreground">ml</span>
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface-muted p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Yeso</p>
                      <p className="mt-2 text-2xl font-semibold leading-none text-foreground">
                        {medidasCompletas ? formatearEntero(yeso) : "—"} <span className="text-xs font-medium text-muted-foreground">g</span>
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={limpiar}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-input bg-background px-4 text-xs font-semibold text-muted-foreground transition hover:border-gold/60 hover:text-foreground active:scale-[0.98]"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Limpiar
          </button>
        </div>
      </div>
    </Panel>
  );
}