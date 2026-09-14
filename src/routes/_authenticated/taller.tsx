import { createFileRoute } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
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
  const ratioAguaSobreYeso = partesAgua / 100;
  const yeso = volumen / (volumenPorGramo * factorCorreccion + ratioAguaSobreYeso);
  const agua = yeso * ratioAguaSobreYeso;
  return { agua, yeso };
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
  const [tipoTarro, setTipoTarro] = useState<TipoTarro>("liso");

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

  return (
    <Panel
      titulo="Calculadora de yeso"
      accion={
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1 rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground sm:inline-flex">
            <Calculator className="size-3" aria-hidden="true" />
            Joyería 40/60
          </span>
        </div>
      }
    >
      <div className={`space-y-6 p-5 ${compacto ? "" : "sm:p-6 lg:p-8"}`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6">
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Diámetro del cilindro (cm)
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={diametro}
              onChange={(e) => setDiametro(e.target.value)}
              placeholder="Ej. 7.5"
              className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Altura del cilindro (cm)
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={altura}
              onChange={(e) => setAltura(e.target.value)}
              placeholder="Ej. 10"
              className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
          </label>
        </div>

        {esDueno ? (
          <div className="rounded-xl border border-border bg-surface-muted p-5 lg:rounded-2xl lg:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Volumen ajustado
            </p>
            <p className="mt-1 text-3xl font-semibold text-foreground">
              {volumen > 0 ? `${formatearEntero(volumen)} ml` : "Ingresa medidas"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Base: {volumenBase > 0 ? `${formatearEntero(volumenBase)} cm³` : "0 cm³"} ·{" "}
              {tiposTarro[tipoTarro].etiqueta} {configuracion.tolerancias[tipoTarro] >= 0 ? "+" : ""}
              {formatearCantidad(configuracion.tolerancias[tipoTarro], 2)}%
            </p>
          </div>
        ) : null}
        <div
          className={
            compacto
              ? "grid grid-cols-1 gap-4"
              : "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8"
          }
        >
          {configuracion.proporciones.map((p) => {
            const { agua, yeso } = calcularMezcla(volumen, p.agua, p.yeso, configuracion.volumenPorGramo, configuracion.factorCorreccion);
            return (
              <article
                key={`${p.agua}-${p.yeso}`}
                className={`rounded-2xl border p-5 ${compacto ? "" : "lg:p-7"} ${
                  p.recomendada ? "border-gold bg-accent shadow-card" : "border-border bg-card"
                }`}
              >
                <div className={compacto ? "mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1" : "mb-6"}>
                  <p className="text-2xl font-semibold">
                    {p.agua}/{p.yeso}
                  </p>
                  {esDueno ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        {p.agua}% agua / {p.yeso}% yeso
                      </p>
                      {p.recomendada ? (
                        <p className="w-full text-[10px] font-semibold uppercase tracking-wider text-gold">
                          Recomendada para joyería
                        </p>
                      ) : null}
                    </>
                  ) : null}
                </div>
                <dl className={`grid gap-3 ${compacto ? "grid-cols-2" : "grid-cols-1 gap-4 lg:grid-cols-2"}`}>
                  <div className={`rounded-xl bg-background p-4 ${compacto ? "" : "lg:p-5"}`}>
                    <dt className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Agua
                    </dt>
                    <dd
                      className={`whitespace-nowrap font-semibold leading-none ${
                        compacto ? "text-2xl" : "text-3xl lg:text-4xl"
                      }`}
                    >
                      {volumen > 0 ? formatearEntero(agua) : "0"}{" "}
                      <span className="ml-1 text-sm font-medium text-muted-foreground">ml</span>
                    </dd>
                  </div>
                  <div className={`rounded-xl bg-background p-4 ${compacto ? "" : "lg:p-5"}`}>
                    <dt className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Yeso
                    </dt>
                    <dd
                      className={`whitespace-nowrap font-semibold leading-none ${
                        compacto ? "text-2xl" : "text-3xl lg:text-4xl"
                      }`}
                    >
                      {volumen > 0 ? formatearEntero(yeso) : "0"}{" "}
                      <span className="ml-1 text-sm font-medium text-muted-foreground">g</span>
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
