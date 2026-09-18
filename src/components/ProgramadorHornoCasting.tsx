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
  id: string;
  marca: string;
  nombre: string;
  categoria: "BAS" | "Cera convencional" | "Castable Wax" | "Castable Resin";
  descripcion: string;
  fuente: string;
  etapas: Omit<EtapaHorno, "id">[];
  nota?: string;
};

const PROGRAMAS: ProgramaHorno[] = [
  {
    id: "bas",
    marca: "BAS",
    nombre: "BAS · Casting de joyería",
    categoria: "BAS",
    descripcion: "Programa de referencia proporcionado para este proyecto.",
    fuente: "Hornos y Vacuum BAS · Medellín, Colombia",
    etapas: [
      { nombre: "Rampa 1", temperatura: 250, rampaMin: 30, sostenimientoMin: 15 },
      { nombre: "Rampa 2", temperatura: 500, rampaMin: 30, sostenimientoMin: 15 },
      { nombre: "Rampa 3", temperatura: 730, rampaMin: 60, sostenimientoMin: 60 },
      { nombre: "Enfriamiento", temperatura: 600, rampaMin: 15, sostenimientoMin: 60 },
    ],
    nota: "El ciclo BAS mostrado procede del dato proporcionado para este proyecto; no se presenta como programa oficial publicado por BAS.",
  },
  {
    id: "cera-dentsply",
    marca: "Dentsply Sirona",
    nombre: "Cera convencional · Deguvest California",
    categoria: "Cera convencional",
    descripcion: "Referencia para cera y patrones convencionales; los tiempos cambian según tamaño de mufla y aleación.",
    fuente: "Dentsply Sirona · Deguvest California",
    etapas: [
      { nombre: "Eliminación de cera", temperatura: 290, rampaMin: 38, sostenimientoMin: 30 },
      { nombre: "Precalentamiento", temperatura: 750, rampaMin: 66, sostenimientoMin: 45 },
    ],
    nota: "Referencia simplificada para una mufla pequeña. El fabricante limita la velocidad a 7 °C/min y establece tiempos según tamaño de la mufla; la temperatura final depende de la aleación.",
  },
  {
    id: "formlabs-wax",
    marca: "Formlabs",
    nombre: "Castable Wax Resin",
    categoria: "Castable Wax",
    descripcion: "Programa publicado para Castable Wax Resin de joyería.",
    fuente: "Formlabs · Jewelry Pattern Burnout",
    etapas: [
      { nombre: "Rampa a 300 °C", temperatura: 300, rampaMin: 60, sostenimientoMin: 480 },
      { nombre: "Rampa a 750 °C", temperatura: 750, rampaMin: 100, sostenimientoMin: 180 },
      { nombre: "Bajada a colada", temperatura: 512, rampaMin: 60, sostenimientoMin: 0 },
    ],
    nota: "Formlabs especifica una ventana de fundición de hasta 2 h a la temperatura de colada deseada.",
  },
  {
    id: "formlabs-wax40",
    marca: "Formlabs",
    nombre: "Castable Wax 40 Resin",
    categoria: "Castable Wax",
    descripcion: "Programa estándar publicado para patrones de joyería.",
    fuente: "Formlabs · Castable Wax 40",
    etapas: [
      { nombre: "Secado / transición a 150 °C", temperatura: 150, rampaMin: 48, sostenimientoMin: 180 },
      { nombre: "Transición a 300 °C", temperatura: 300, rampaMin: 75, sostenimientoMin: 180 },
      { nombre: "Burnout a 732 °C", temperatura: 732, rampaMin: 108, sostenimientoMin: 180 },
      { nombre: "Bajada a colada", temperatura: 512, rampaMin: 44, sostenimientoMin: 0 },
    ],
    nota: "El documento oficial también contempla 180 min de secado a 55 °C antes de la primera rampa y una ventana de fundición de hasta 2 h.",
  },
  {
    id: "siraya-cast",
    marca: "Siraya Tech",
    nombre: "Cast · Purple / True Blue / Royal Blue",
    categoria: "Castable Resin",
    descripcion: "Ciclo de 6 horas publicado por Siraya Tech para su línea Cast.",
    fuente: "Siraya Tech · Cast User Guide / TDS",
    etapas: [
      { nombre: "Rampa a 150 °C", temperatura: 150, rampaMin: 60, sostenimientoMin: 60 },
      { nombre: "Rampa a 371 °C", temperatura: 371, rampaMin: 60, sostenimientoMin: 60 },
      { nombre: "Rampa a 732 °C", temperatura: 732, rampaMin: 60, sostenimientoMin: 180 },
      { nombre: "Bajada a 510 °C", temperatura: 510, rampaMin: 0, sostenimientoMin: 0 },
    ],
    nota: "Siraya Tech publica el perfil por horas: 50 °C inicial, 150 °C a 1 h, 371 °C a 2 h, 732 °C a 3 h y mantenimiento hasta 6 h; el descenso final depende del proceso.",
  },
  {
    id: "bluecast-xwax",
    marca: "BlueCast",
    nombre: "X-Wax · ciclo estándar",
    categoria: "Castable Wax",
    descripcion: "Resina basada en cera real; BlueCast indica compatibilidad con ciclos de cera convencional.",
    fuente: "BlueCast · X-Wax Castable Resin",
    etapas: [
      { nombre: "Rampa a 150 °C", temperatura: 150, rampaMin: 0, sostenimientoMin: 120 },
      { nombre: "Rampa a 450 °C", temperatura: 450, rampaMin: 0, sostenimientoMin: 120 },
      { nombre: "Rampa a 700 °C", temperatura: 700, rampaMin: 0, sostenimientoMin: 180 },
    ],
    nota: "BlueCast publica las temperaturas y sostenimientos, pero no fija una duración de rampa de subida en este ciclo. Las rampas se dejan en 0 para que el operador las configure según su horno; no se inventa un tiempo.",
  },
  {
    id: "bluecast-xone",
    marca: "BlueCast",
    nombre: "X-One V2 · ultra rápido",
    categoria: "Castable Resin",
    descripcion: "Ciclo rápido específico validado por BlueCast para X-One V2.",
    fuente: "BlueCast · X-One V2",
    etapas: [
      { nombre: "Reposo de la mufla", temperatura: 25, rampaMin: 0, sostenimientoMin: 180 },
      { nombre: "Burnout a 700 °C", temperatura: 700, rampaMin: 0, sostenimientoMin: 90 },
      { nombre: "Temperatura de colada", temperatura: 600, rampaMin: 0, sostenimientoMin: 60 },
    ],
    nota: "BlueCast indica 3 h de reposo, 60–90 min a 700 °C y 60 min a temperatura de colada. El tiempo de subida a 700 °C no está especificado en esa publicación y queda para configurar según el horno.",
  },
];

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
  const [programaId, setProgramaId] = useState("bas");
  const [etapas, setEtapas] = useState<EtapaHorno[]>(() => clonarEtapas(PROGRAMAS[0].etapas));
  const [personalizado, setPersonalizado] = useState(false);

  const programaSeleccionado = PROGRAMAS.find((p) => p.id === programaId) ?? PROGRAMAS[0];

  const calculo = useMemo(() => {
    const puntos = [{ minuto: 0, temperatura: inicio }];
    let minuto = 0;
    let rampasNoDefinidas = 0;

    etapas.forEach((e) => {
      if (e.rampaMin > 0) {
        minuto += e.rampaMin;
        puntos.push({ minuto, temperatura: e.temperatura });
      } else {
        rampasNoDefinidas += 1;
        puntos.push({ minuto, temperatura: e.temperatura });
      }
      minuto += Math.max(0, e.sostenimientoMin);
      puntos.push({ minuto, temperatura: e.temperatura });
    });

    return { puntos, total: minuto, rampasNoDefinidas };
  }, [etapas, inicio]);

  const cargar = (id: string) => {
    const programa = PROGRAMAS.find((p) => p.id === id) ?? PROGRAMAS[0];
    setProgramaId(programa.id);
    setEtapas(clonarEtapas(programa.etapas));
    setPersonalizado(false);
  };

  const cambiar = (id: string, campo: "nombre" | "temperatura" | "rampaMin" | "sostenimientoMin", valor: string) => {
    setEtapas((actual) => actual.map((e) => e.id !== id ? e : {
      ...e,
      [campo]: campo === "nombre" ? valor : Math.max(0, numero(valor)),
    }));
    setPersonalizado(true);
  };

  const agregar = () => {
    setEtapas((actual) => [...actual, {
      id: idNuevo(),
      nombre: "Etapa " + (actual.length + 1),
      temperatura: actual.at(-1)?.temperatura ?? 600,
      rampaMin: 30,
      sostenimientoMin: 30,
    }]);
    setPersonalizado(true);
  };

  const eliminar = (id: string) => {
    setEtapas((actual) => actual.filter((e) => e.id !== id));
    setPersonalizado(true);
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
              Biblioteca de ciclos de referencia para cera y resinas castable de joyería.
            </p>
          </div>
          <button type="button" onClick={() => { setInicio(25); cargar("bas"); }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-[10px] font-semibold hover:border-gold">
            <RotateCcw className="size-3.5" /> BAS
          </button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <label>
            <span className="mb-1 block text-[10px] font-semibold text-muted-foreground">Material / ciclo</span>
            <select value={programaId} onChange={(e) => cargar(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs font-medium outline-none focus:border-primary">
              {(["BAS", "Cera convencional", "Castable Wax", "Castable Resin"] as const).map((categoria) => (
                <optgroup key={categoria} label={categoria}>
                  {PROGRAMAS.filter((p) => p.categoria === categoria).map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="rounded-lg border border-border bg-background px-3 py-2">
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Referencia activa</div>
            <div className="mt-0.5 text-xs font-semibold">{programaSeleccionado.marca}</div>
          </div>
        </div>

        <div className="mt-2 rounded-lg border border-border bg-background px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
          {programaSeleccionado.descripcion}
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))]">
          <label className="rounded-xl border border-border bg-background p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Temperatura inicial</span>
            <div className="mt-1 flex items-center gap-2">
              <input type="number" min="0" step="1" value={inicio}
                onChange={(e) => { setInicio(Math.max(0, numero(e.target.value, 25))); setPersonalizado(true); }}
                className="h-9 w-full min-w-0 rounded-lg border border-border bg-card px-2.5 text-sm font-semibold outline-none focus:border-primary" />
              <span className="text-[11px] text-muted-foreground">°C</span>
            </div>
          </label>
          <div className="rounded-xl border border-border bg-background p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tiempo total</span>
            <strong className="mt-1 block text-lg leading-tight">{tiempoTexto(calculo.total)}</strong>
            {calculo.rampasNoDefinidas > 0 ? <span className="mt-1 block text-[9px] text-muted-foreground">+ rampas sin tiempo definido</span> : null}
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
            <span className="text-[10px] text-muted-foreground">{personalizado ? "Personalizado" : "Según referencia seleccionada"}</span>
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
            {etapas.map((e) => (
              <span key={e.id} className="text-muted-foreground">→ {e.temperatura} °C</span>
            ))}
            <span className="ml-auto font-semibold">{tiempoTexto(calculo.total)}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-surface-muted/30 px-4 py-3 text-[10px] leading-relaxed text-muted-foreground sm:px-5">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <Flame className="size-3.5 text-gold" /> {programaSeleccionado.nombre}
        </div>
        <p className="mt-1">{programaSeleccionado.fuente}.</p>
        {programaSeleccionado.nota ? <p className="mt-1">{programaSeleccionado.nota}</p> : null}
        <p className="mt-1">Los ciclos deben ajustarse al revestimiento, geometría, tamaño de mufla, carga, horno y aleación. Las instrucciones vigentes del fabricante del material y del revestimiento tienen prioridad.</p>
      </div>
    </section>
  );
}
