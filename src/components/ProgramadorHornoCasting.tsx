import { useMemo, useState } from "react";
import { Eye, Flame, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
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
  categoria: "Referencia de proyecto" | "Cera convencional" | "Castable Wax" | "Castable Resin";
  descripcion: string;
  fuente: string;
  etapas: Omit<EtapaHorno, "id">[];
  nota?: string;
};

const PROGRAMAS: ProgramaHorno[] = [
  {
    id: "rapida-15",
    marca: "Referencia de proyecto",
    nombre: "Rampa rápida · Horno 15×15×15 cm",
    categoria: "Referencia de proyecto",
    descripcion: "Programa rápido de referencia proporcionado para este proyecto para un horno de cámara de 15 × 15 × 15 cm.",
    fuente: "Referencia proporcionada para este proyecto",
    etapas: [
      { nombre: "Rampa rápida 1", temperatura: 250, rampaMin: 10, sostenimientoMin: 15 },
      { nombre: "Rampa rápida 2", temperatura: 500, rampaMin: 10, sostenimientoMin: 15 },
      { nombre: "Rampa rápida 3", temperatura: 730, rampaMin: 30, sostenimientoMin: 60 },
      { nombre: "Enfriamiento a 650 °C", temperatura: 650, rampaMin: 10, sostenimientoMin: 0 },
    ],
    nota: "Ciclo rápido indicado para este proyecto para una cámara de 15 × 15 × 15 cm. No se presenta como programa universal ni como especificación oficial de un fabricante.",
  },
  {
    id: "bas",
    marca: "Referencia de proyecto",
    nombre: "Programa de referencia · Casting de joyería",
    categoria: "Referencia de proyecto",
    descripcion: "Programa de referencia proporcionado para este proyecto.",
    fuente: "Referencia proporcionada para este proyecto",
    etapas: [
      { nombre: "Rampa 1", temperatura: 250, rampaMin: 30, sostenimientoMin: 15 },
      { nombre: "Rampa 2", temperatura: 500, rampaMin: 30, sostenimientoMin: 15 },
      { nombre: "Rampa 3", temperatura: 730, rampaMin: 60, sostenimientoMin: 60 },
      { nombre: "Enfriamiento", temperatura: 600, rampaMin: 15, sostenimientoMin: 60 },
    ],
    nota: "Programa de referencia proporcionado para este proyecto; no se presenta como programa oficial de un fabricante.",
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
  const [programaId, setProgramaId] = useState("rapida-15");
  const [etapas, setEtapas] = useState<EtapaHorno[]>(() => clonarEtapas(PROGRAMAS[0].etapas));
  const [personalizado, setPersonalizado] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);

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
    setModoEdicion(false);
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
    <section className="w-full overflow-hidden rounded-[28px] border border-border/80 bg-card shadow-xl shadow-black/5">
      <header className="relative overflow-hidden border-b border-border/70 bg-gradient-to-br from-surface-muted/80 via-card to-card px-4 py-5 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gold">
                <Flame className="size-3.5" /> Casting · Burnout
              </div>
              <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">Programador de Rampas de Horno</h2>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Diseña, revisa y adapta ciclos térmicos para patrones de joyería antes de la colada.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setModoEdicion((v) => !v)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-background/80 px-3 text-[11px] font-semibold transition hover:border-gold hover:bg-gold/5">
                {modoEdicion ? <Eye className="size-3.5" /> : <Pencil className="size-3.5" />}
                {modoEdicion ? "Modo operador" : "Editar ciclo"}
              </button>
              <button type="button" onClick={() => { setInicio(25); cargar("rapida-15"); }}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-background/80 px-3 text-[11px] font-semibold transition hover:border-gold hover:bg-gold/5">
                <RotateCcw className="size-3.5" /> Restablecer
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
            <label className="rounded-2xl border border-border bg-background/90 p-3.5">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Programa / material</span>
              <select disabled={!modoEdicion} value={programaId} onChange={(e) => cargar(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold outline-none transition focus:border-primary">
                {(["Referencia de proyecto", "Cera convencional", "Castable Wax", "Castable Resin"] as const).map((categoria) => (
                  <optgroup key={categoria} label={categoria}>
                    {PROGRAMAS.filter((p) => p.categoria === categoria).map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <div className="rounded-2xl border border-border bg-background/90 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Referencia</span>
                {personalizado && <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[9px] font-bold text-gold">Editado</span>}
              </div>
              <div className="mt-1 text-sm font-bold">{programaSeleccionado.marca}</div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{programaSeleccionado.fuente}</p>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-border/80 bg-background/70 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
            {programaSeleccionado.descripcion}
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)] lg:items-start">
          <div className="min-w-0">
            <div className="mb-3 flex items-end justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold tracking-tight">Secuencia térmica</h3>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">Temperatura objetivo, rampa y sostenimiento de cada etapa.</p>
              </div>
              <span className="shrink-0 rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">{modoEdicion ? "Edición" : "Operador"}</span>
            </div>

            <div className="space-y-3">
              {etapas.map((e, i) => (
                <article key={e.id} className="group relative overflow-hidden rounded-2xl border border-border bg-background p-3.5 sm:p-4 transition hover:border-gold/40">
                  <div className="absolute inset-y-0 left-0 w-1 bg-gold/60" />
                  <div className="flex items-center justify-between gap-3 pl-1">
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-gold">Etapa {String(i + 1).padStart(2, "0")}</span>
                      <input disabled={!modoEdicion} value={e.nombre} onChange={(x) => cambiar(e.id, "nombre", x.target.value)}
                        className="mt-1 h-8 w-full rounded-lg border border-transparent bg-transparent px-0 text-sm font-bold outline-none transition focus:border-border focus:bg-card focus:px-2" />
                    </div>
                    {etapas.length > 1 && (
                      <button type="button" onClick={() => eliminar(e.id)} aria-label="Eliminar etapa"
                        className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="size-3.5" />
                        </button>}
                    )}
                  </div>
                  <div className="mt-2.5 grid grid-cols-3 gap-2 pl-1">
                    <label className="rounded-xl border border-border/80 bg-card p-2.5">
                      <span className="block text-[9px] text-muted-foreground">Objetivo</span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <input disabled={!modoEdicion} type="number" min="0" value={e.temperatura} onChange={(x) => cambiar(e.id, "temperatura", x.target.value)}
                          className="w-full min-w-0 bg-transparent text-lg font-bold outline-none" />
                        <span className="text-[9px] text-muted-foreground">°C</span>
                      </div>
                    </label>
                    <label className="rounded-xl border border-border/80 bg-card p-2.5">
                      <span className="block text-[9px] text-muted-foreground">Rampa</span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <input disabled={!modoEdicion} type="number" min="0" value={e.rampaMin} onChange={(x) => cambiar(e.id, "rampaMin", x.target.value)}
                          className="w-full min-w-0 bg-transparent text-lg font-bold outline-none" />
                        <span className="text-[9px] text-muted-foreground">min</span>
                      </div>
                    </label>
                    <label className="rounded-xl border border-border/80 bg-card p-2.5">
                      <span className="block text-[9px] text-muted-foreground">Sostén</span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <input disabled={!modoEdicion} type="number" min="0" value={e.sostenimientoMin} onChange={(x) => cambiar(e.id, "sostenimientoMin", x.target.value)}
                          className="w-full min-w-0 bg-transparent text-lg font-bold outline-none" />
                        <span className="text-[9px] text-muted-foreground">min</span>
                      </div>
                    </label>
                  </div>
                </article>
              ))}
            </div>

            {modoEdicion && <button type="button" onClick={agregar}
              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl border border-dashed border-border px-3 text-[11px] font-semibold transition hover:border-gold hover:bg-gold/5">
              <Plus className="size-3.5" /> Agregar etapa
            </button>}
          </div>

          <div className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              <div className="flex flex-col gap-1 border-b border-border bg-surface-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold">Curva térmica</h3>
                  <p className="text-[10px] text-muted-foreground">Temperatura frente al tiempo acumulado</p>
                </div>
                <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[9px] font-semibold text-muted-foreground">{temperaturaMaxima} °C máx.</span>
              </div>
              <div className="h-[360px] w-full p-2 sm:h-[430px] sm:p-4 lg:h-[480px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={calculo.puntos} margin={{ top: 16, right: 20, left: 2, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="minuto" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v) => tiempoTexto(Number(v))} tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, "auto"]} tickFormatter={(v) => v + "°"} width={52} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [Math.round(Number(v)) + " °C", "Temperatura"]} labelFormatter={(v) => "Tiempo: " + tiempoTexto(Number(v))} />
                    <Line type="linear" dataKey="temperatura" stroke="currentColor" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="rounded-2xl border border-border bg-background p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Temperatura inicial</span>
            <div className="mt-2 flex items-center gap-2">
              <input disabled={!modoEdicion} type="number" min="0" step="1" value={inicio}
                onChange={(e) => { setInicio(Math.max(0, numero(e.target.value, 25))); setPersonalizado(true); }}
                className="h-10 w-full min-w-0 rounded-xl border border-border bg-card px-3 text-sm font-bold outline-none focus:border-primary" />
              <span className="text-xs font-medium text-muted-foreground">°C</span>
            </div>
          </label>
          <div className="rounded-2xl border border-border bg-background p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Duración calculada</span>
            <strong className="mt-2 block text-xl tracking-tight">{tiempoTexto(calculo.total)}</strong>
            {calculo.rampasNoDefinidas > 0 && <span className="mt-1 block text-[9px] text-muted-foreground">Hay rampas sin duración definida</span>}
          </div>
          <div className="rounded-2xl border border-border bg-background p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Pico térmico</span>
            <strong className="mt-2 block text-xl tracking-tight">{temperaturaMaxima} °C</strong>
          </div>
          <div className="rounded-2xl border border-border bg-background p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Etapas</span>
            <strong className="mt-2 block text-xl tracking-tight">{etapas.length}</strong>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-surface-muted/35 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Resumen del ciclo</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                <span>{inicio} °C</span>
                {etapas.map((e) => <span key={e.id} className="text-muted-foreground">→ {e.temperatura} °C</span>)}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold">{tiempoTexto(calculo.total)}</div>
          </div>
        </div>
      </div>

      <footer className="border-t border-border bg-surface-muted/25 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-start gap-2">
          <Flame className="mt-0.5 size-4 shrink-0 text-gold" />
          <div className="min-w-0 text-[10px] leading-relaxed text-muted-foreground">
            <div className="font-bold text-foreground">{programaSeleccionado.nombre}</div>
            <p className="mt-1">{programaSeleccionado.fuente}.</p>
            {programaSeleccionado.nota ? <p className="mt-1">{programaSeleccionado.nota}</p> : null}
            <p className="mt-1.5">Los ciclos deben ajustarse al revestimiento, geometría, tamaño de mufla, carga, horno y aleación. Las instrucciones vigentes del fabricante del material y del revestimiento tienen prioridad.</p>
          </div>
        </div>
      </footer>
    </section>
  );
}
