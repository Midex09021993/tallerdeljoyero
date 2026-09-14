import { useEffect, useState } from "react";
import { RotateCcw, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/AppShell";
import {
  CLAVES_CALCULADORAS,
  DEFAULT_CONFIG_ALEACION,
  DEFAULT_CONFIG_VISUALIZADOR,
  DEFAULT_CONFIG_YESO,
  leerConfigAleacion,
  leerConfigVisualizador,
  leerConfigYeso,
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
  ["plata950", "Densidad Plata 950"],
  ["platino", "Densidad Platino"],
] as const;

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
  const guardar = useGuardarConfigSistema();

  const esDueno = Boolean(sesion?.esDueno);
  const [cfgVisualizador, setCfgVisualizador] = useState<ConfigVisualizador3D>(
    clonar(DEFAULT_CONFIG_VISUALIZADOR),
  );
  const [cfgAleacion, setCfgAleacion] = useState<ConfigAleacion>(clonar(DEFAULT_CONFIG_ALEACION));
  const [cfgYeso, setCfgYeso] = useState<ConfigYeso>(clonar(DEFAULT_CONFIG_YESO));

  useEffect(() => {
    if (visualizador.data) setCfgVisualizador(leerConfigVisualizador(visualizador.data.valor));
  }, [visualizador.data]);

  useEffect(() => {
    if (aleacion.data) setCfgAleacion(leerConfigAleacion(aleacion.data.valor));
  }, [aleacion.data]);

  useEffect(() => {
    if (yeso.data) setCfgYeso(leerConfigYeso(yeso.data.valor));
  }, [yeso.data]);

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

  async function guardarValores() {
    try {
      await Promise.all([
        guardar.mutateAsync({ clave: CLAVES_CALCULADORAS.visualizador, valor: cfgVisualizador }),
        guardar.mutateAsync({ clave: CLAVES_CALCULADORAS.aleacion, valor: cfgAleacion }),
        guardar.mutateAsync({ clave: CLAVES_CALCULADORAS.yeso, valor: cfgYeso }),
      ]);
      toast.success("Configuración de calculadoras guardada");
    } catch {
      toast.error("No se pudieron guardar todos los valores");
    }
  }

  async function restaurarValores() {
    const visualizadorDefault = clonar(DEFAULT_CONFIG_VISUALIZADOR);
    const aleacionDefault = clonar(DEFAULT_CONFIG_ALEACION);
    const yesoDefault = clonar(DEFAULT_CONFIG_YESO);
    setCfgVisualizador(visualizadorDefault);
    setCfgAleacion(aleacionDefault);
    setCfgYeso(yesoDefault);
    try {
      await Promise.all([
        guardar.mutateAsync({ clave: CLAVES_CALCULADORAS.visualizador, valor: visualizadorDefault }),
        guardar.mutateAsync({ clave: CLAVES_CALCULADORAS.aleacion, valor: aleacionDefault }),
        guardar.mutateAsync({ clave: CLAVES_CALCULADORAS.yeso, valor: yesoDefault }),
      ]);
      toast.success("Valores predeterminados restaurados");
    } catch {
      toast.error("No se pudieron restaurar todos los valores");
    }
  }

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
            Estos valores afectan a todas las calculadoras actuales y futuras. Los usuarios finales
            no tienen controles para modificarlos.
          </p>
        </div>
      </Panel>

      <Panel titulo="Visualizador 3D">
        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {metalesVisualizador.map(([id, etiqueta]) => (
            <label key={id} className="space-y-1.5">
              <span className="text-xs font-medium">{etiqueta}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputCls}
                  value={cfgVisualizador.densidades[id]}
                  onChange={(e) => actualizarDensidad(id, e.target.value)}
                />
                <span className="text-xs text-muted-foreground">g/cm³</span>
              </div>
            </label>
          ))}
          <label className="space-y-1.5">
            <span className="text-xs font-medium">Factor de empuje por defecto</span>
            <input
              type="number"
              min="0"
              step="0.1"
              className={inputCls}
              value={cfgVisualizador.factorEmpuje}
              onChange={(e) =>
                setCfgVisualizador((a) => ({ ...a, factorEmpuje: Number(e.target.value) || 0 }))
              }
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium">Factor de seguridad</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              className={inputCls}
              value={cfgVisualizador.factorSeguridad}
              onChange={(e) =>
                setCfgVisualizador((a) => ({ ...a, factorSeguridad: Number(e.target.value) || 1 }))
              }
            />
          </label>
        </div>
      </Panel>

      <Panel titulo="Calculadora de Aleación">
        <div className="space-y-6 p-6">
          {coloresAleacion.map(([color, etiqueta]) => (
            <section key={color} className="rounded-xl border border-border p-4">
              <h3 className="mb-4 text-sm font-semibold">{etiqueta}</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((index) => {
                  const metal = cfgAleacion.recetas[color].metales[index] ?? {
                    nombre: "",
                    porcentaje: 0,
                  };
                  return (
                    <div key={index} className="space-y-2">
                      <input
                        className={inputCls}
                        placeholder={index === 0 ? "Metal" : "Metal opcional"}
                        value={metal.nombre}
                        onChange={(e) => actualizarReceta(color, index, "nombre", e.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          className={inputCls}
                          value={metal.porcentaje * 100}
                          onChange={(e) =>
                            actualizarReceta(color, index, "porcentaje", e.target.value)
                          }
                        />
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
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputCls}
              value={cfgAleacion.factorCalculo}
              onChange={(e) =>
                setCfgAleacion((a) => ({ ...a, factorCalculo: Number(e.target.value) || 0 }))
              }
            />
          </label>
        </div>
      </Panel>

      <Panel titulo="Calculadora Yeso / Agua">
        <div className="space-y-6 p-6">
          <section>
            <h3 className="mb-3 text-sm font-semibold">Relaciones de mezcla</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {cfgYeso.proporciones.map((p, index) => (
                <div key={index} className="rounded-xl border border-border p-4">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <span className="text-[11px] text-muted-foreground">Agua %</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        className={inputCls}
                        value={p.agua}
                        onChange={(e) => actualizarProporcion(index, "agua", e.target.value)}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-muted-foreground">Yeso %</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        className={inputCls}
                        value={p.yeso}
                        onChange={(e) => actualizarProporcion(index, "yeso", e.target.value)}
                      />
                    </label>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={p.recomendada}
                      onChange={(e) =>
                        setCfgYeso((actual) => ({
                          ...actual,
                          proporciones: actual.proporciones.map((item, i) =>
                            i === index ? { ...item, recomendada: e.target.checked } : item,
                          ),
                        }))
                      }
                    />
                    Recomendada
                  </label>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-xs font-medium">Volumen por gramo de yeso</span>
              <input
                type="number"
                min="0.0001"
                step="0.0001"
                className={inputCls}
                value={cfgYeso.volumenPorGramo}
                onChange={(e) =>
                  setCfgYeso((a) => ({ ...a, volumenPorGramo: Number(e.target.value) || 0.0001 }))
                }
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium">Factor de corrección</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className={inputCls}
                value={cfgYeso.factorCorreccion}
                onChange={(e) =>
                  setCfgYeso((a) => ({ ...a, factorCorreccion: Number(e.target.value) || 1 }))
                }
              />
            </label>
            {tiposTarro.map(([tipo, etiqueta]) => (
              <label key={tipo} className="space-y-1.5">
                <span className="text-xs font-medium">Tolerancia {etiqueta} (%)</span>
                <input
                  type="number"
                  step="0.1"
                  className={inputCls}
                  value={cfgYeso.tolerancias[tipo]}
                  onChange={(e) =>
                    setCfgYeso((a) => ({
                      ...a,
                      tolerancias: {
                        ...a.tolerancias,
                        [tipo]: Number(e.target.value) || 0,
                      },
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </div>
      </Panel>

      <div className="sticky bottom-4 z-20 flex flex-wrap justify-end gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-card backdrop-blur">
        <button
          type="button"
          onClick={() => void restaurarValores()}
          disabled={guardando}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:border-gold disabled:opacity-60"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Restaurar valores predeterminados
        </button>
        <button
          type="button"
          onClick={() => void guardarValores()}
          disabled={guardando}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Save className="size-4" aria-hidden="true" />
          {guardando ? "Guardando…" : "Guardar valores"}
        </button>
      </div>
    </div>
  );
}
