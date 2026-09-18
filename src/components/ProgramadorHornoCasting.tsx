
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

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="border-b border-border bg-surface-muted/50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
              <Flame className="size-4" /> Casting / Burnout
            </div>
            <h2 className="mt-1 text-xl font-semibold">Programador de Rampas de Horno</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Diseña y visualiza el ciclo térmico del molde antes de la fundición.
            </p>
          </div>
          <button type="button" onClick={() => { setInicio(25); cargar("BAS"); }}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:border-gold">
            <RotateCcw className="size-4" /> Restablecer BAS
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => cargar("BAS")}
            className={programa === "BAS" ? "rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground" : "rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:border-gold"}>
            BAS
          </button>
          <button type="button" onClick={() => cargar("FORMLABS")}
            className={programa === "FORMLABS" ? "rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground" : "rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:border-gold"}>
            Formlabs
          </button>
          {programa === "PERSONALIZADO" ? <span className="rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold">Personalizado</span> : null}
        </div>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-4">
          <label className="block max-w-xs space-y-1.5">
            <span className="text-xs font-semibold">Temperatura inicial</span>
            <div className="flex items-center gap-2">
              <input type="number" min="0" step="1" value={inicio}
                onChange={(e) => { setInicio(Math.max(0, numero(e.target.value, 25))); setPrograma("PERSONALIZADO"); }}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
              <span className="text-xs text-muted-foreground">°C</span>
            </div>
          </label>

          {etapas.map((e, i) => (
            <article key={e.id} className="rounded-xl border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Etapa {i + 1}</span>
                {etapas.length > 1 ? <button type="button" onClick={() => eliminar(e.id)} aria-label="Eliminar etapa" className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button> : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="text-[11px] text-muted-foreground">Nombre</span>
                  <input value={e.nombre} onChange={(x) => cambiar(e.id, "nombre", x.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[11px] text-muted-foreground">Temperatura objetivo</span>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" value={e.temperatura} onChange={(x) => cambiar(e.id, "temperatura", x.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
                    <span className="text-xs text-muted-foreground">°C</span>
                  </div>
                </label>
                <label className="space-y-1.5">
                  <span className="text-[11px] text-muted-foreground">Tiempo de rampa</span>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" value={e.rampaMin} onChange={(x) => cambiar(e.id, "rampaMin", x.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                </label>
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="text-[11px] text-muted-foreground">Tiempo de sostenimiento</span>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" value={e.sostenimientoMin} onChange={(x) => cambiar(e.id, "sostenimientoMin", x.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                </label>
              </div>
            </article>
          ))}

          <button type="button" onClick={agregar} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:border-gold">
            <Plus className="size-4" /> Agregar etapa
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tiempo total</span>
              <strong className="mt-1 block text-2xl">{tiempoTexto(calculo.total)}</strong>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Temperatura máxima</span>
              <strong className="mt-1 block text-2xl">{Math.max(inicio, ...etapas.map((e) => e.temperatura), 0)} °C</strong>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold">Curva térmica</span>
              <span className="text-[10px] text-muted-foreground">Temperatura vs. tiempo</span>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculo.puntos} margin={{ top: 10, right: 12, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="minuto" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v) => Math.round(Number(v) / 60) + "h"} />
                  <YAxis domain={[0, "auto"]} tickFormatter={(v) => v + "°"} />
                  <Tooltip formatter={(v) => [Math.round(Number(v)) + " °C", "Temperatura"]} labelFormatter={(v) => "Tiempo: " + tiempoTexto(Number(v))} />
                  <Line type="linear" dataKey="temperatura" stroke="currentColor" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-muted/40 p-4 text-xs">
            <div className="font-semibold">Resumen del ciclo</div>
            <div className="mt-3 space-y-2">
              {etapas.map((e, i) => (
                <div key={e.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{i + 1}. {e.nombre}</span>
                  <span className="shrink-0 text-muted-foreground">{e.temperatura} °C · {e.rampaMin} + {e.sostenimientoMin} min</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-surface-muted/30 px-5 py-4 text-[11px] leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Referencia:</strong> BAS corresponde al dato proporcionado para este proyecto. Los ciclos de burnout cambian según revestimiento, patrón, tamaño de la caja y equipo; deben prevalecer las instrucciones del fabricante del revestimiento y del material de impresión.
        <span className="mt-1 block">Fuentes consultadas: Hornos y Vacuum BAS (Medellín), Delmer Group, Formlabs y Dentsply Sirona.</span>
      </div>
    </section>
  );
}
