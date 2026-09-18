import { useEffect, useState, type ReactNode } from "react";
import { RotateCcw, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/AppShell";
import {
  CLAVES_CALCULADORAS,
  DEFAULT_CONFIG_ALEACION,
  DEFAULT_CONFIG_VISUALIZADOR,
  DEFAULT_CONFIG_YESO,
  DEFAULT_CONFIG_TALLAS_ANILLO,
  DEFAULT_CONFIG_PESO_GEMAS,
  leerConfigPesoGemas,
  type ConfigPesoGemas,
  leerConfigAleacion,
  leerConfigVisualizador,
  leerConfigYeso,
  leerConfigTallasAnillo,
  type ConfigTallasAnillo,
  type ConfigAleacion,
  type ConfigVisualizador3D,
  type ConfigYeso,
} from "@/lib/calculadoras-config";
import { useConfigSistema, useGuardarConfigSistema } from "@/lib/taller-db";
import { useSesion } from "@/lib/auth";

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary";

const metalesVisualizador = [
  ["oro18a", "Densidad Oro 18K Amarillo"],
  ["oro18b", "Densidad Oro 18K Blanco"],
  ["oro18r", "Densidad Oro 18K Rosa"],
  ["oro14", "Densidad Oro 14K"],
  ["plata925", "Densidad Plata 925"],
  ["plata950", "Densidad Plata 950"],
  ["plata970", "Densidad Plata 970"],
  ["platino", "Densidad Platino"],
] as const;

const FUENTES_DENSIDADES: Record<string, { fuente: string; detalle: string; url: string }> = {
  oro18a: {
    fuente: "Palloys — Fabricated Metal Colour Chart",
    detalle: "18ct S Yellow Gold: 15.50 g/cm³.",
    url: "https://www.palloys.com/resources/technicalGuides/fabricatedMetalColourChart",
  },
  oro18b: {
    fuente: "Palloys — Fabricated Metal Colour Chart",
    detalle: "18ct white gold varies by alloy; the reference M alloy is 15.80 g/cm³.",
    url: "https://www.palloys.com/resources/technicalGuides/fabricatedMetalColourChart",
  },
  oro18r: {
    fuente: "Palloys — Fabricated Metal Colour Chart",
    detalle: "18ct Pink Gold: 15.30 g/cm³.",
    url: "https://www.palloys.com/resources/technicalGuides/fabricatedMetalColourChart",
  },
  oro14: {
    fuente: "Palloys — Casting Alloy Colour Chart",
    detalle: "14ct Yellow Gold: 13.40 g/cm³. Other 14K alloys vary with composition.",
    url: "https://www.palloys.com/resources/technicalGuides/alloysColour",
  },
  plata925: {
    fuente: "Palloys — Casting Alloy Colour Chart",
    detalle: "Sterling Silver: 10.39 g/cm³.",
    url: "https://www.palloys.com/resources/technicalGuides/alloysColour",
  },
  plata950: {
    fuente: "Sempsa Joyeria Plateria — Silver 950 SDS",
    detalle: "Silver 950: 10.41 g/cm³.",
    url: "https://www.cookson-clal.com/downloads/pdf/notes/FDS%20HSI%200012-ENG_12-2021.pdf",
  },
  plata970: {
    fuente: "Estimación físico-metalúrgica",
    detalle: "≈10.44 g/cm³, calculada para 97% Ag + 3% Cu usando densidades de referencia de Ag y Cu. La aleación real puede variar.",
    url: "https://pubchem.ncbi.nlm.nih.gov/periodic-table/density/",
  },
  platino: {
    fuente: "CRC Materials Science / ASM",
    detalle: "21.45 g/cm³ corresponde a platino prácticamente puro. Pt950 depende de la aleación; por ejemplo Pt95Ir ≈20.00 g/cm³.",
    url: "https://www.palloys.com/resources/technicalGuides/fabricatedMetalColourChart",
  },
};

const coloresAleacion = [
  ["amarillo", "Oro Amarillo"],
  ["blanco", "Oro Blanco"],
  ["rosa", "Oro Rosa"],
] as const;

const tiposTarro = [
  ["liso", "Tarro liso"],
  ["perforado", "Tarro perforado"],
] as const;

function clonar<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

export function ConfiguracionCalculadoras() {
  const { data: sesion } = useSesion();
  const visualizador = useConfigSistema(CLAVES_CALCULADORAS.visualizador);
  const aleacion = useConfigSistema(CLAVES_CALCULADORAS.aleacion);
  const yeso = useConfigSistema(CLAVES_CALCULADORAS.yeso);
  const tallasAnillo = useConfigSistema(CLAVES_CALCULADORAS.tallasAnillo);
  const pesoGemas = useConfigSistema(CLAVES_CALCULADORAS.pesoGemas);
  const guardar = useGuardarConfigSistema();

  const esDueno = Boolean(sesion?.esDueno);
  const [cfgVisualizador, setCfgVisualizador] = useState<ConfigVisualizador3D>(
    clonar(DEFAULT_CONFIG_VISUALIZADOR),
  );
  const [cfgAleacion, setCfgAleacion] = useState<ConfigAleacion>(clonar(DEFAULT_CONFIG_ALEACION));
  const [cfgYeso, setCfgYeso] = useState<ConfigYeso>(clonar(DEFAULT_CONFIG_YESO));
  const [cfgTallas, setCfgTallas] = useState<ConfigTallasAnillo>(clonar(DEFAULT_CONFIG_TALLAS_ANILLO));
  const [cfgPesoGemas, setCfgPesoGemas] = useState<ConfigPesoGemas>(clonar(DEFAULT_CONFIG_PESO_GEMAS));

  useEffect(() => {
    if (visualizador.data) setCfgVisualizador(leerConfigVisualizador(visualizador.data.valor));
  }, [visualizador.data]);

  useEffect(() => {
    if (aleacion.data) setCfgAleacion(leerConfigAleacion(aleacion.data.valor));
  }, [aleacion.data]);

  useEffect(() => {
    if (yeso.data) setCfgYeso(leerConfigYeso(yeso.data.valor));
  }, [yeso.data]);

  useEffect(() => {
    if (tallasAnillo.data) setCfgTallas(leerConfigTallasAnillo(tallasAnillo.data.valor));
  }, [tallasAnillo.data]);

  useEffect(() => {
    if (pesoGemas.data) setCfgPesoGemas(leerConfigPesoGemas(pesoGemas.data.valor));
  }, [pesoGemas.data]);

  if (!esDueno) {
    return (
      <Panel titulo="Configuración de Calculadoras">
        <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <ShieldCheck className="size-5 text-gold" />
          Esta configuración está disponible únicamente para el usuario Dueño.
        </div>
      </Panel>
    );
  }

  const guardando = guardar.isPending;

  function actualizarDensidad(id: keyof ConfigVisualizador3D["densidades"], valor: string) {
    setCfgVisualizador((actual) => ({
      ...actual,
      densidades: { ...actual.densidades, [id]: Number(valor) || 0 },
    }));
  }

  function actualizarReceta(
    color: keyof ConfigAleacion["recetas"],
    index: number,
    campo: "nombre" | "porcentaje",
    valor: string,
  ) {
    setCfgAleacion((actual) => {
      const metales = [...actual.recetas[color].metales];
      while (metales.length <= index) metales.push({ nombre: "", porcentaje: 0 });
      const metalActual = metales[index] ?? { nombre: "", porcentaje: 0 };
      metales[index] = {
        ...metalActual,
        [campo]: campo === "porcentaje" ? (Number(valor) || 0) / 100 : valor,
      };
      return { ...actual, recetas: { ...actual.recetas, [color]: { metales } } };
    });
  }

  function actualizarProporcion(index: number, campo: "agua" | "yeso", valor: string) {
    setCfgYeso((actual) => {
      const proporciones = [...actual.proporciones];
      const proporcionActual = proporciones[index] ?? { agua: 0, yeso: 0, recomendada: false };
      proporciones[index] = { ...proporcionActual, [campo]: Number(valor) || 0 };
      return { ...actual, proporciones };
    });
  }

  function actualizarTalla(index: number, campo: "diametroMm" | "espanola" | "europeaIso" | "americana", valor: string) {
    setCfgTallas((actual) => ({
      ...actual,
      tabla: actual.tabla.map((fila, i) => {
        if (i !== index) return fila;
        if (campo === "americana") return { ...fila, americana: valor.trim() || null };
        return { ...fila, [campo]: Number(valor) || 0 };
      }),
    }));
  }

  function agregarTalla() {
    setCfgTallas((actual) => ({
      ...actual,
      tabla: [...actual.tabla, { diametroMm: 0, espanola: 0, europeaIso: 0, americana: null }],
    }));
  }

  function eliminarTalla(index: number) {
    setCfgTallas((actual) => ({ ...actual, tabla: actual.tabla.filter((_, i) => i !== index) }));
  }


  const [abierta, setAbierta] = useState<string | null>(null);

  async function guardarSeccion(clave: string, valor: any, nombre: string) {
    try {
      await guardar.mutateAsync({ clave, valor });
      toast.success(`${nombre} guardada`);
    } catch {
      toast.error(`No se pudo guardar ${nombre.toLowerCase()}`);
    }
  }

  async function restaurarSeccion(clave: string, valor: any, setter: (v: any) => void, nombre: string) {
    setter(clonar(valor));
    try {
      await guardar.mutateAsync({ clave, valor });
      toast.success(`${nombre} restaurada`);
    } catch {
      toast.error(`No se pudo restaurar ${nombre.toLowerCase()}`);
    }
  }

  function AccordionSection({
    id,
    titulo,
    descripcion,
    children,
    onGuardar,
    onRestaurar,
  }: {
    id: string;
    titulo: string;
    descripcion: string;
    children: ReactNode;
    onGuardar: () => void;
    onRestaurar: () => void;
  }) {
    const estaAbierta = abierta === id;
    return (
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <button
          type="button"
          aria-expanded={estaAbierta}
          onClick={() => setAbierta(estaAbierta ? null : id)}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-accent/40"
        >
          <span className="min-w-0">
            <span className="flex items-center gap-3">
              <span className="text-lg leading-none text-gold">{estaAbierta ? "▼" : "▶"}</span>
              <span className="text-base font-semibold">{titulo}</span>
            </span>
            <span className="mt-1 block pl-8 text-xs text-muted-foreground">{descripcion}</span>
          </span>
          <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
            {estaAbierta ? "Abierta" : "Abrir"}
          </span>
        </button>

        {estaAbierta ? (
          <div className="border-t border-border">
            {children}
            <div className="flex flex-wrap justify-end gap-3 border-t border-border bg-muted/20 p-4">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRestaurar(); }}
                disabled={guardando}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:border-gold disabled:opacity-60"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Restaurar valores predeterminados
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onGuardar(); }}
                disabled={guardando}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                <Save className="size-4" aria-hidden="true" />
                {guardando ? "Guardando…" : "Guardar valores"}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <Panel
        titulo="Configuración de Calculadoras"
        accion={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
            <ShieldCheck className="size-3" aria-hidden="true" />
            Solo Dueño
          </span>
        }
      >
        <div className="space-y-2 p-6">
          <p className="text-sm font-medium">Parámetros técnicos centralizados</p>
          <p className="text-xs text-muted-foreground">
            Abre únicamente la calculadora que quieras configurar. Las demás permanecen cerradas.
          </p>
        </div>
      </Panel>

      <AccordionSection
        id="visualizador"
        titulo="Visualizador y Peso 3D"
        descripcion="Densidades de metales, empuje y factor de seguridad"
        onGuardar={() => void guardarSeccion(CLAVES_CALCULADORAS.visualizador, cfgVisualizador, "Visualizador 3D")}
        onRestaurar={() => void restaurarSeccion(CLAVES_CALCULADORAS.visualizador, DEFAULT_CONFIG_VISUALIZADOR, setCfgVisualizador, "Visualizador 3D")}
      >
        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {metalesVisualizador.map(([id, etiqueta]) => {
            const fuente = FUENTES_DENSIDADES[id];
            return (
              <label key={id} className="space-y-1.5">
                <span className="flex items-center gap-2 text-xs font-medium">
                  {etiqueta}
                  {fuente ? (
                    <span className="group relative inline-flex size-4 cursor-help items-center justify-center rounded-full border border-border text-[9px] text-muted-foreground" tabIndex={0} aria-label={fuente.fuente}>
                      i
                      <span className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-80 rounded-xl border border-border bg-popover p-3 text-left text-[11px] font-normal leading-relaxed text-popover-foreground shadow-xl group-hover:block group-focus:block">
                        <strong className="block text-gold">{fuente.fuente}</strong>
                        <span className="mt-1 block">{fuente.detalle}</span>
                        <span className="mt-2 block break-all text-[10px] text-muted-foreground">{fuente.url}</span>
                      </span>
                    </span>
                  ) : null}
                </span>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" step="0.01" className={inputCls} value={cfgVisualizador.densidades[id]} onChange={(e) => actualizarDensidad(id, e.target.value)} />
                  <span className="text-xs text-muted-foreground">g/cm³</span>
                </div>
              </label>
            );
          })}
          <label className="space-y-1.5">
            <span className="text-xs font-medium">Peso adicional del árbol de colada (por defecto)</span>
            <div className="flex items-center gap-2">
              <input type="number" min="0" step="0.01" className={inputCls} value={cfgVisualizador.factorEmpuje} onChange={(e) => setCfgVisualizador((a) => ({ ...a, factorEmpuje: Number(e.target.value) || 0 }))} />
              <span className="text-xs text-muted-foreground">{cfgVisualizador.modoEmpuje === "porcentaje" ? "%" : "g"}</span>
            </div>
            <span className="block text-[11px] text-muted-foreground">Referencia inicial para el cálculo. El usuario puede definir el árbol de cada fabricación.</span>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium">Modo del peso adicional</span>
            <select className={inputCls} value={cfgVisualizador.modoEmpuje} onChange={(e) => setCfgVisualizador((a) => ({ ...a, modoEmpuje: e.target.value === "porcentaje" ? "porcentaje" : "gramos" }))}>
              <option value="gramos">Gramos (peso del árbol)</option>
              <option value="porcentaje">Porcentaje del peso de las joyas</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium">Factor de seguridad</span>
            <input type="number" min="0.01" step="0.01" className={inputCls} value={cfgVisualizador.factorSeguridad} onChange={(e) => setCfgVisualizador((a) => ({ ...a, factorSeguridad: Number(e.target.value) || 1 }))} />
          </label>
        </div>
      </AccordionSection>

      <AccordionSection
        id="aleacion"
        titulo="Calculadora de Aleación"
        descripcion="Recetas de oro amarillo, blanco y rosa"
        onGuardar={() => void guardarSeccion(CLAVES_CALCULADORAS.aleacion, cfgAleacion, "Calculadora de Aleación")}
        onRestaurar={() => void restaurarSeccion(CLAVES_CALCULADORAS.aleacion, DEFAULT_CONFIG_ALEACION, setCfgAleacion, "Calculadora de Aleación")}
      >
        <div className="space-y-6 p-6">
          {coloresAleacion.map(([color, etiqueta]) => (
            <section key={color} className="rounded-xl border border-border p-4">
              <h3 className="mb-4 text-sm font-semibold">{etiqueta}</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((index) => {
                  const metal = cfgAleacion.recetas[color].metales[index] ?? { nombre: "", porcentaje: 0 };
                  return (
                    <div key={index} className="space-y-2">
                      <input className={inputCls} placeholder={index === 0 ? "Metal" : "Metal opcional"} value={metal.nombre} onChange={(e) => actualizarReceta(color, index, "nombre", e.target.value)} />
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" max="100" step="0.1" className={inputCls} value={metal.porcentaje * 100} onChange={(e) => actualizarReceta(color, index, "porcentaje", e.target.value)} />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          <label className="block max-w-xs space-y-1.5">
            <span className="text-xs font-medium">Factor de cálculo</span>
            <input type="number" min="0" step="0.01" className={inputCls} value={cfgAleacion.factorCalculo} onChange={(e) => setCfgAleacion((a) => ({ ...a, factorCalculo: Number(e.target.value) || 0 }))} />
          </label>
        </div>
      </AccordionSection>

      <AccordionSection
        id="yeso"
        titulo="Calculadora Yeso / Agua"
        descripcion="Relaciones de mezcla y factores de corrección"
        onGuardar={() => void guardarSeccion(CLAVES_CALCULADORAS.yeso, cfgYeso, "Calculadora Yeso / Agua")}
        onRestaurar={() => void restaurarSeccion(CLAVES_CALCULADORAS.yeso, DEFAULT_CONFIG_YESO, setCfgYeso, "Calculadora Yeso / Agua")}
      >
        <div className="space-y-6 p-6">
          <section>
            <h3 className="mb-3 text-sm font-semibold">Relaciones de mezcla</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {cfgYeso.proporciones.map((p, index) => (
                <div key={index} className="rounded-xl border border-border p-4">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <span className="text-[11px] text-muted-foreground">Agua %</span>
                      <input type="number" min="0" max="100" step="0.1" className={inputCls} value={p.agua} onChange={(e) => actualizarProporcion(index, "agua", e.target.value)} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-muted-foreground">Yeso %</span>
                      <input type="number" min="0" max="100" step="0.1" className={inputCls} value={p.yeso} onChange={(e) => actualizarProporcion(index, "yeso", e.target.value)} />
                    </label>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={p.recomendada} onChange={(e) => setCfgYeso((actual) => ({ ...actual, proporciones: actual.proporciones.map((item, i) => i === index ? { ...item, recomendada: e.target.checked } : item) }))} />
                    Recomendada
                  </label>
                </div>
              ))}
            </div>
          </section>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-xs font-medium">Volumen por gramo de yeso</span>
              <input type="number" min="0.0001" step="0.0001" className={inputCls} value={cfgYeso.volumenPorGramo} onChange={(e) => setCfgYeso((a) => ({ ...a, volumenPorGramo: Number(e.target.value) || 0.0001 }))} />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium">Factor de corrección</span>
              <input type="number" min="0.01" step="0.01" className={inputCls} value={cfgYeso.factorCorreccion} onChange={(e) => setCfgYeso((a) => ({ ...a, factorCorreccion: Number(e.target.value) || 1 }))} />
            </label>
            {tiposTarro.map(([tipo, etiqueta]) => (
              <label key={tipo} className="space-y-1.5">
                <span className="text-xs font-medium">Tolerancia {etiqueta} (%)</span>
                <input type="number" step="0.1" className={inputCls} value={cfgYeso.tolerancias[tipo]} onChange={(e) => setCfgYeso((a) => ({ ...a, tolerancias: { ...a.tolerancias, [tipo]: Number(e.target.value) || 0 } }))} />
              </label>
            ))}
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        id="tallas"
        titulo="Conversor de Tallas"
        descripcion="Tabla de equivalencias de diámetro, España, Europa ISO y USA"
        onGuardar={() => void guardarSeccion(CLAVES_CALCULADORAS.tallasAnillo, cfgTallas, "Conversor de Tallas")}
        onRestaurar={() => void restaurarSeccion(CLAVES_CALCULADORAS.tallasAnillo, DEFAULT_CONFIG_TALLAS_ANILLO, setCfgTallas, "Conversor de Tallas")}
      >
        <div className="space-y-4 p-6">
          <p className="text-xs text-muted-foreground">Tabla maestra de equivalencias. La escala España se mantiene separada de Europa ISO; USA usa tallas fraccionarias de cuarto.</p><p className="text-[10px] text-muted-foreground">Referencias: tallaje España de joyería española · ISO 8653:2016 · GIA 4Cs.</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-surface-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-3 py-3">Diámetro (mm)</th><th className="px-3 py-3">España</th><th className="px-3 py-3">Europa ISO</th><th className="px-3 py-3">USA</th><th className="px-3 py-3 text-right">Acción</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cfgTallas.tabla.map((fila, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2"><input type="number" step="0.1" className={inputCls} value={fila.diametroMm} onChange={(e) => actualizarTalla(index, "diametroMm", e.target.value)} /></td>
                    <td className="px-3 py-2"><input type="number" step="1" className={inputCls} value={fila.espanola} onChange={(e) => actualizarTalla(index, "espanola", e.target.value)} /></td>
                    <td className="px-3 py-2"><input type="number" step="1" className={inputCls} value={fila.europeaIso} onChange={(e) => actualizarTalla(index, "europeaIso", e.target.value)} /></td>
                    <td className="px-3 py-2"><input type="text" inputMode="text" className={inputCls} placeholder="Ej. 6 1/2" value={fila.americana ?? ""} onChange={(e) => actualizarTalla(index, "americana", e.target.value)} /></td>
                    <td className="px-3 py-2 text-right"><button type="button" onClick={() => eliminarTalla(index)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-destructive hover:border-destructive">Eliminar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={agregarTalla} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-primary">+ Agregar fila</button>
        </div>
      </AccordionSection>

      <AccordionSection
        id="peso-gemas"
        titulo="Peso de Gemas"
        descripcion="Piedras, gravedad específica, factores de forma y margen de estimación"
        onGuardar={() => void guardarSeccion(CLAVES_CALCULADORAS.pesoGemas, cfgPesoGemas, "Peso de Gemas")}
        onRestaurar={() => void restaurarSeccion(CLAVES_CALCULADORAS.pesoGemas, DEFAULT_CONFIG_PESO_GEMAS, setCfgPesoGemas, "Peso de Gemas")}
      >
        <div className="space-y-5 p-6">
          <p className="text-xs text-muted-foreground">Metodología basada en la estimación de peso de gemas por dimensiones, gravedad específica y factor de forma; el perfil puede requerir una corrección adicional.</p>
          <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[520px] text-sm"><thead className="bg-surface-muted text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-3 py-3">Piedra</th><th className="px-3 py-3">SG</th></tr></thead><tbody className="divide-y divide-border">{cfgPesoGemas.piedras.map((p,i)=><tr key={i}><td className="px-3 py-2"><input className={inputCls} value={p.nombre} onChange={e=>setCfgPesoGemas(a=>({...a,piedras:a.piedras.map((x,j)=>j===i?{...x,nombre:e.target.value}:x)}))}/></td><td className="px-3 py-2"><input type="number" step="0.01" min="0" className={inputCls} value={p.sg} onChange={e=>setCfgPesoGemas(a=>({...a,piedras:a.piedras.map((x,j)=>j===i?{...x,sg:Number(e.target.value)||0}:x)}))}/></td></tr>)}</tbody></table></div>
          <div className="grid gap-3 sm:grid-cols-3">{(Object.entries(cfgPesoGemas.factores) as [keyof ConfigPesoGemas["factores"],number][]).map(([id,factor])=><label key={id} className="space-y-1.5"><span className="text-xs font-medium">{id}</span><input type="number" step="0.00001" min="0" className={inputCls} value={factor} onChange={e=>setCfgPesoGemas(a=>({...a,factores:{...a.factores,[id]:Number(e.target.value)||0}}))}/></label>)}</div>
          <label className="block max-w-xs space-y-1.5"><span className="text-xs font-medium">Margen de estimación</span><div className="flex items-center gap-2"><input type="number" min="0" max="50" step="1" className={inputCls} value={cfgPesoGemas.margenEstimacion} onChange={e=>setCfgPesoGemas(a=>({...a,margenEstimacion:Number(e.target.value)||0}))}/><span className="text-xs text-muted-foreground">%</span></div></label>
        </div>
      </AccordionSection>

      <AccordionSection
        id="peso-stl"
        titulo="Calculadora de Peso STL"
        descripcion="Preparada para futuras configuraciones"
        onGuardar={() => toast.info("La configuración de Peso STL estará disponible cuando la calculadora sea implementada.")}
        onRestaurar={() => toast.info("La configuración de Peso STL estará disponible cuando la calculadora sea implementada.")}
      >
        <div className="p-6 text-sm text-muted-foreground">
          Esta sección está preparada para recibir los parámetros técnicos de la futura Calculadora de Peso STL.
        </div>
      </AccordionSection>
    </div>
  );

}