import { createFileRoute } from "@tanstack/react-router";
import { Calculator, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, Panel, StatCard } from "@/components/AppShell";
import { SeguimientoArea } from "@/components/SeguimientoArea";
import { useActualizarTarea, useTareas } from "@/lib/taller-db";

export const Route = createFileRoute("/_authenticated/taller")({
  head: () => ({
    meta: [
      { title: "Taller — Aurum Lab" },
      {
        name: "description",
        content:
          "Bancos de trabajo, tareas de engaste, pulido y fundición asignadas al equipo del taller.",
      },
      { property: "og:title", content: "Taller — Aurum Lab" },
      { property: "og:description", content: "Bancos, tareas y turnos del taller de joyería." },
    ],
  }),
  component: TallerPage,
});

const bancos = [
  { banco: "Banco 1", joyero: "Marco V.", ocupacion: 85 },
  { banco: "Banco 2", joyero: "Irene L.", ocupacion: 60 },
  { banco: "Banco 3", joyero: "Pau G.", ocupacion: 35 },
  { banco: "Fundición", joyero: "Turno 14:30", ocupacion: 100 },
];

const estadosTarea = ["Pendiente", "En curso", "Terminada"];

const proporcionesYeso = [
  { agua: 38, yeso: 62, recomendada: false },
  { agua: 40, yeso: 60, recomendada: true },
  { agua: 42, yeso: 58, recomendada: false },
];

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

const volumenPorGramoYeso = 0.4238;

function formatearCantidad(valor: number, decimales = 1) {
  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: decimales,
    minimumFractionDigits: valor > 0 ? decimales : 0,
  }).format(valor);
}

function calcularMezcla(volumen: number, partesAgua: number, partesYeso: number) {
  const ratioAguaSobreYeso = partesAgua / partesYeso;
  const yeso = volumen / (volumenPorGramoYeso + ratioAguaSobreYeso);
  const agua = yeso * ratioAguaSobreYeso;
  const total = agua + yeso;
  const porcentajeAgua = total > 0 ? (agua / total) * 100 : partesAgua;
  const porcentajeYeso = total > 0 ? (yeso / total) * 100 : partesYeso;
  return { agua, porcentajeAgua, porcentajeYeso, ratioAguaSobreYeso, yeso };
}

function TallerPage() {
  const { data: tareas = [], isLoading } = useTareas();
  const actualizar = useActualizarTarea();
  const [diametro, setDiametro] = useState("");
  const [altura, setAltura] = useState("");
  const [tipoTarro, setTipoTarro] = useState<TipoTarro>("liso");
  const [mostrarAjustes, setMostrarAjustes] = useState(false);
  const [tolerancias, setTolerancias] = useState<Record<TipoTarro, number>>({
    liso: tiposTarro.liso.toleranciaInicial,
    perforado: tiposTarro.perforado.toleranciaInicial,
  });

  const volumenBase = useMemo(() => {
    const d = Number(diametro);
    const h = Number(altura);
    if (!Number.isFinite(d) || !Number.isFinite(h) || d <= 0 || h <= 0) return 0;
    const radio = d / 2;
    return Math.PI * radio * radio * h;
  }, [altura, diametro]);

  const volumen = useMemo(() => {
    if (volumenBase <= 0) return 0;
    return volumenBase * (1 + tolerancias[tipoTarro] / 100);
  }, [tipoTarro, tolerancias, volumenBase]);

  return (
    <AppShell
      titulo="Taller"
      subtitulo="Engaste, pulido y fundición · 3 joyeros en piso"
      acciones={
        <>
          <StatCard
            etiqueta="Tareas activas"
            valor={String(tareas.filter((t) => t.estado !== "Terminada").length)}
          />
          <StatCard etiqueta="Fundición" valor="14:30 h" />
        </>
      }
    >
      <SeguimientoArea area="Taller" />

      <Panel
        titulo="Calculadora de yeso"
        accion={
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground sm:inline-flex">
              <Calculator className="size-3" aria-hidden="true" />
              Joyería 40/60
            </span>
            <button
              type="button"
              onClick={() => setMostrarAjustes((actual) => !actual)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:border-gold hover:text-foreground"
              aria-label="Ajustar tolerancias"
            >
              <Settings2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        }
      >
        <div className="space-y-5 p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-muted p-1">
            {(Object.keys(tiposTarro) as TipoTarro[]).map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setTipoTarro(tipo)}
                className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  tipoTarro === tipo
                    ? "bg-background text-foreground shadow-card"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tiposTarro[tipo].etiqueta}
              </button>
            ))}
          </div>

          {mostrarAjustes ? (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Tolerancias</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ajusta el porcentaje si tus tarros reales consumen más o menos mezcla.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setTolerancias({
                      liso: tiposTarro.liso.toleranciaInicial,
                      perforado: tiposTarro.perforado.toleranciaInicial,
                    })
                  }
                  className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-gold hover:text-foreground"
                >
                  Reset
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(Object.keys(tiposTarro) as TipoTarro[]).map((tipo) => (
                  <label key={tipo} className="space-y-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {tiposTarro[tipo].etiqueta} (%)
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={tolerancias[tipo]}
                      onChange={(e) => {
                        const valor = Number(e.target.value);
                        setTolerancias((actual) => ({
                          ...actual,
                          [tipo]: Number.isFinite(valor) ? valor : 0,
                        }));
                      }}
                      className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
                    />
                    <p className="text-xs text-muted-foreground">{tiposTarro[tipo].ayuda}</p>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          <div className="rounded-xl border border-border bg-surface-muted p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Volumen ajustado
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {volumen > 0 ? `${formatearCantidad(volumen, 4)} ml` : "Ingresa medidas"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Base: {volumenBase > 0 ? `${formatearCantidad(volumenBase, 4)} cm³` : "0 cm³"} ·{" "}
              {tiposTarro[tipoTarro].etiqueta} {tolerancias[tipoTarro] >= 0 ? "+" : ""}
              {tolerancias[tipoTarro]}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Fórmula: V = π x r² x h. La proporción se calcula como partes exactas de agua/yeso.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {proporcionesYeso.map((p) => {
              const { agua, porcentajeAgua, porcentajeYeso, ratioAguaSobreYeso, yeso } =
                calcularMezcla(volumen, p.agua, p.yeso);
              return (
                <article
                  key={`${p.agua}-${p.yeso}`}
                  className={`rounded-xl border p-4 ${
                    p.recomendada ? "border-gold bg-accent shadow-card" : "border-border bg-card"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">
                        {p.agua}/{p.yeso}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatearCantidad(porcentajeAgua, 2)}% agua /{" "}
                        {formatearCantidad(porcentajeYeso, 2)}% yeso
                      </p>
                      {p.recomendada ? (
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-gold">
                          Recomendada para joyería
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-background p-3">
                      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Agua
                      </dt>
                      <dd className="mt-1 text-xl font-semibold">
                        {volumen > 0 ? formatearCantidad(agua, 4) : "0"} ml
                      </dd>
                    </div>
                    <div className="rounded-lg bg-background p-3">
                      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Yeso
                      </dt>
                      <dd className="mt-1 text-xl font-semibold">
                        {volumen > 0 ? formatearCantidad(yeso, 4) : "0"} g
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Ratio agua/yeso: {formatearCantidad(ratioAguaSobreYeso, 6)} ml por g
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel titulo="Tareas del día" className="lg:col-span-2">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-muted">
                {["Tarea", "Responsable", "Banco", "Estado"].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tareas.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-surface-muted/60">
                  <td className="px-6 py-4 text-sm">{t.tarea}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{t.responsable}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{t.banco}</td>
                  <td className="px-6 py-4">
                    <select
                      value={estadosTarea.includes(t.estado) ? t.estado : "Pendiente"}
                      onChange={(e) => actualizar.mutate({ id: t.id, estado: e.target.value })}
                      className="rounded-full bg-accent px-2 py-1 text-[10px] font-semibold uppercase"
                    >
                      {estadosTarea.map((e) => (
                        <option key={e}>{e}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {!isLoading && tareas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-sm text-muted-foreground">
                    Sin tareas registradas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Panel>

        <Panel titulo="Ocupación de bancos">
          <ul className="divide-y divide-border">
            {bancos.map((b) => (
              <li key={b.banco} className="px-6 py-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium">{b.banco}</p>
                  <span className="text-xs text-muted-foreground">{b.joyero}</span>
                </div>
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full bg-gold"
                    style={{ width: `${b.ocupacion}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </AppShell>
  );
}
