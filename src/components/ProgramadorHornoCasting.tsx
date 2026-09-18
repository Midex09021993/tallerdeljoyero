import { useMemo, useState } from "react";
import { Flame, Plus, RotateCcw, Trash2 } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type EtapaHorno = {
  id: string;
  nombre: string;
  temperatura: number;
  rampaMin: number;
  sostenimientoMin: number;
};

type ProgramaHorno = {
  etapas: Omit<EtapaHorno, "id">[];
  ventanaColadaMin?: number;
};

const BAS: ProgramaHorno = {
  etapas: [
    { nombre: "Rampa 1", temperatura: 250, rampaMin: 30, sostenimientoMin: 15 },
    { nombre: "Rampa 2", temperatura: 500, rampaMin: 30, sostenimientoMin: 15 },
    { nombre: "Rampa 3", temperatura: 730, rampaMin: 60, sostenimientoMin: 60 },
    { nombre: "Enfriamiento", temperatura: 600, rampaMin: 15, sostenimientoMin: 60 },
  ],
};

const FORMLABS: ProgramaHorno = {
  etapas: [
    { nombre: "Rampa a 300 °C", temperatura: 300, rampaMin: 60, sostenimientoMin: 480 },
    { nombre: "Rampa a 750 °C", temperatura: 750, rampaMin: 100, sostenimientoMin: 180 },
    { nombre: "Bajada a temperatura de colada", temperatura: 512, rampaMin: 60, sostenimientoMin: 0 },
  ],
  ventanaColadaMin: 120,
};

const idNuevo = () => Math.random().toString(36).slice(2, 9);
const clonarEtapas = (etapas: Omit<EtapaHorno, "id">[]) => etapas.map((e) => ({ ...e, id: idNuevo() }));
const numero = (v: string, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const tiempoTexto = (min: number) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h === 0 ? m + " min" : m === 0 ? h + " h" : h + " h " + m + " min";
};

export function ProgramadorHornoCasting() {
  const [inicio, setInicio] = useState(25);
  const [etapas, setEtapas] = useState<EtapaHorno[]>(() => clonarEtapas(BAS.etapas));
  const [programa, setPrograma] = useState<"BAS" | "FORMLABS" | "PERSONALIZADO">("BAS");

  const calculo = useMemo(() => {
    const puntos = [{ minuto: 0, temperatura: inicio }];
    let minuto = 0;
    etapas.forEach((e) => {
      minuto += Math.max(0, e.rampaMin);
      puntos.push({ minuto, temperatura: e.temperatura });
      minuto += Math.max(0, e.sostenimientoMin);
      puntos.push({ minuto, temperatura: e.temperatura });
    });
    return { puntos, total: minuto };
  }, [etapas, inicio]);

  const cargar = (tipo: "BAS" | "FORMLABS") => {
    setEtapas(clonarEtapas(tipo === "BAS" ? BAS.etapas : FORMLABS.etapas));
    setPrograma(tipo);
  };

  const cambiar = (id: string, campo: "nombre" | "temperatura" | "rampaMin" | "sostenimientoMin", valor: string) => {
    setEtapas((actual) => actual.map((e) => e.id !== id ? e : {
      ...e,
      [campo]: campo === "nombre" ? valor : Math.max(0, numero(valor)),
    }));
    setPrograma("PERSONALIZADO");
  };

  const agregar = () => {
    setEtapas((actual) => [...actual, {
      id: idNuevo(),
      nombre: "Etapa " + (actual.length + 1),
      temperatura: actual.at(-1)?.temperatura ?? 600,
      rampaMin: 30,
      sostenimientoMin: 30,
    }]);
    setPrograma("PERSONALIZADO");
  };

  const eliminar = (id: string) => {
    setEtapas((actual) => actual.filter((e) => e.id !== id));
    setPrograma("PERSONALIZADO");
  };

  const temperaturaMaxima = Math.max(inicio, ...etapas.map((e) => e.temperatura), 0);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="border-b border-border bg-surface-muted/50 px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gold">
              <Flame className="size-4 shrink-0" /> Casting / Burnout
            </div>
            <h2 className="mt-1 text-lg font-semibold leading-tight">Programador de Rampas de Horno</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Diseña y visualiza el ciclo térmico del molde antes de la fundición.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setInicio(25); cargar("BAS"); }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-[10px] font-semibold hover:border-gold"
            title="Restablecer programa BAS"
          >
            <RotateCcw className="size-3.5" /> BAS
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] uppercase tracking-wider text-muted-foreground">Programa:</span>
          <button type="button" onClick={() => cargar("BAS")}
            className={programa === "BAS" ? "rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-semibold text-primary-foreground" : "rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-semibold hover:border-gold"}>
            BAS
          </button>
          <button type="button" onClick={() => cargar("FORMLABS")}
            className={programa === "FORMLABS" ? "rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-semibold text-primary-foreground" : "rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-semibold hover:border-gold"}>
            Formlabs
          </button>
          {programa === "PERSONALIZADO" ? <span className="rounded-lg border border-gold/40 bg-gold/10 px-2.5 py-1.5 text-[10px] font-semibold text-gold">Personalizado</span> : null}
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))]">
          <label className="rounded-xl border border-border bg-background p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Temperatura inicial</span>
            <div className="mt-1 flex items-center gap-2">
              <input type="number" min="0" step="1" value={inicio}
                onChange={(e) => { setInicio(Math.max(0, numero(e.target.value, 25))); setPrograma("PERSONALIZADO"); }}
                className="h-9 w-full min-w-0 rounded-lg border border-border bg-card px-2.5 text-sm font-semibold outline-none focus:border-primary" />
              <span className="text-[11px] text-muted-foreground">°C</span>
            </div>
          </label>
          <div className="rounded-xl border border-border bg-background p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tiempo total</span>
            <strong className="mt-1 block text-lg leading-tight">{tiempoTexto(calculo.total)}</strong>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Temp. máxima</span>
            <strong className="mt-1 block text-lg leading-tight">{temperaturaMaxima} °C</strong>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Etapas</span>
            <strong className="mt-1 block text-lg leading-tight">{etapas.length}</strong>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold">Secuencia térmica</h3>
            <span className="text-[10px] text-muted-foreground">Edita cada etapa</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {etapas.map((e, i) => (
              <article key={e.id} className="rounded-xl border border-border bg-background p-3">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Etapa {i + 1}</span>
                  {etapas.length > 1 ? (
                    <button type="button" onClick={() => eliminar(e.id)} aria-label="Eliminar etapa"
                      className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="size-3.5" />
                    </button>
                  ) : null}
                </div>

                <input value={e.nombre} onChange={(x) => cambiar(e.id, "nombre", x.target.value)}
                  className="mb-2.5 h-9 w-full rounded-lg border border-border bg-card px-2.5 text-xs outline-none focus:border-primary" />

                <div className="grid grid-cols-3 gap-2">
                  <label className="min-w-0">
                    <span className="mb-1 block text-[9px] text-muted-foreground">Objetivo °C</span>
                    <input type="number" min="0" value={e.temperatura} onChange={(x) => cambiar(e.id, "temperatura", x.target.value)}
                      className="h-9 w-full rounded-lg border border-border bg-card px-2 text-xs font-semibold outline-none focus:border-primary" />
                  </label>
                  <label className="min-w-0">
                    <span className="mb-1 block text-[9px] text-muted-foreground">Rampa min</span>
                    <input type="number" min="0" value={e.rampaMin} onChange={(x) => cambiar(e.id, "rampaMin", x.target.value)}
                      className="h-9 w-full rounded-lg border border-border bg-card px-2 text-xs font-semibold outline-none focus:border-primary" />
                  </label>
                  <label className="min-w-0">
                    <span className="mb-1 block text-[9px] text-muted-foreground">Sostén min</span>
                    <input type="number" min="0" value={e.sostenimientoMin} onChange={(x) => cambiar(e.id, "sostenimientoMin", x.target.value)}
                      className="h-9 w-full rounded-lg border border-border bg-card px-2 text-xs font-semibold outline-none focus:border-primary" />
                  </label>
                </div>
              </article>
            ))}
          </div>

          <button type="button" onClick={agregar}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-gold">
            <Plus className="size-3.5" /> Agregar etapa
          </button>
        </div>

        <div className="rounded-xl border border-border bg-background p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold">Curva térmica</h3>
            <span className="text-[10px] text-muted-foreground">Temperatura vs. tiempo</span>
          </div>
          <div className="h-[260px] w-full sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={calculo.puntos} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="minuto" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v) => Math.round(Number(v) / 60) + "h"} />
                <YAxis domain={[0, "auto"]} tickFormatter={(v) => v + "°"} width={42} />
                <Tooltip formatter={(v) => [Math.round(Number(v)) + " °C", "Temperatura"]} labelFormatter={(v) => "Tiempo: " + tiempoTexto(Number(v))} />
                <Line type="linear" dataKey="temperatura" stroke="currentColor" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px]">
            <span className="font-semibold">Ciclo:</span>
            <span className="text-muted-foreground">{inicio} °C</span>
            {etapas.map((e, i) => (
              <span key={e.id} className="text-muted-foreground">
                → {e.temperatura} °C {i < etapas.length - 1 ? "→" : ""}
              </span>
            ))}
            <span className="ml-auto font-semibold">{tiempoTexto(calculo.total)}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-surface-muted/30 px-4 py-3 text-[10px] leading-relaxed text-muted-foreground sm:px-5">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <Flame className="size-3.5 text-gold" /> Preset BAS · Casting de joyería
        </div>
        <p className="mt-1">
          Referencia de equipo/proceso: Hornos y Vacuum BAS, Medellín — Colombia. El ciclo BAS mostrado corresponde al dato proporcionado para este proyecto; no se presenta como programa oficial publicado por BAS.
        </p>
        <p className="mt-1">
          Los ciclos de burnout cambian según revestimiento, patrón, tamaño de la caja y equipo. Deben prevalecer las instrucciones del fabricante del revestimiento y del material de impresión.
        </p>
        <p className="mt-1">Fuentes consultadas: Hornos y Vacuum BAS, Formlabs y Dentsply Sirona.</p>
      </div>
    </section>
  );
}
