import { useMemo } from "react";
import { useConfigSistema } from "@/lib/taller-db";

export const CLAVES_CALCULADORAS = {
  visualizador: "calculadora_visualizador_3d",
  aleacion: "calculadora_aleacion_oro",
  yeso: "calculadora_yeso",
  tallasAnillo: "conversor_tallas_anillo",
  pesoGemas: "calculadora_peso_gemas",
} as const;

export type ConfigVisualizador3D = {
  densidades: {
    oro18a: number;
    oro18b: number;
    oro18r: number;
    oro14: number;
    plata925: number;
    plata950: number;
    plata970: number;
    platino: number;
  };
  factorEmpuje: number;
  modoEmpuje: "gramos" | "porcentaje";
  factorSeguridad: number;
};

export type ConfigAleacion = {
  recetas: {
    amarillo: { metales: { nombre: string; porcentaje: number }[] };
    blanco: { metales: { nombre: string; porcentaje: number }[] };
    rosa: { metales: { nombre: string; porcentaje: number }[] };
    naranja: { metales: { nombre: string; porcentaje: number }[] };
  };
  factorCalculo: number;
};

export type ConfigYeso = {
  proporciones: { agua: number; yeso: number; recomendada: boolean }[];
  volumenPorGramo: number;
  factorCorreccion: number;
  tolerancias: { liso: number; perforado: number };
};

export const DEFAULT_CONFIG_VISUALIZADOR: ConfigVisualizador3D = {
  densidades: { oro18a: 15.5, oro18b: 15.8, oro18r: 15.3, oro14: 13.4, plata925: 10.39, plata950: 10.41, plata970: 10.44, platino: 21.45 },
  factorEmpuje: 0,
  modoEmpuje: "gramos",
  factorSeguridad: 1,
};

export const DEFAULT_CONFIG_ALEACION: ConfigAleacion = {
  recetas: {
    amarillo: { metales: [{ nombre: "Plata", porcentaje: 0.5 }, { nombre: "Cobre", porcentaje: 0.5 }] },
    blanco: { metales: [{ nombre: "Cobre", porcentaje: 0.4 }, { nombre: "Níquel", porcentaje: 0.4 }, { nombre: "Zinc", porcentaje: 0.2 }] },
    rosa: { metales: [{ nombre: "Cobre", porcentaje: 0.89 }, { nombre: "Plata", porcentaje: 0.11 }] },
    naranja: { metales: [{ nombre: "Cobre", porcentaje: 1 }] },
  },
  factorCalculo: 1,
};

export const DEFAULT_CONFIG_YESO: ConfigYeso = {
  proporciones: [
    { agua: 38, yeso: 62, recomendada: false },
    { agua: 40, yeso: 60, recomendada: true },
    { agua: 42, yeso: 58, recomendada: false },
  ],
  volumenPorGramo: 0.4238,
  factorCorreccion: 1,
  tolerancias: { liso: -5, perforado: 20 },
};

function objeto(valor: unknown): any {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

function numero(valor: unknown, fallback: number) {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : fallback;
}

function lista(valor: unknown): unknown[] {
  return Array.isArray(valor) ? valor : [];
}

function leerMetales(valor: unknown, fallback: { nombre: string; porcentaje: number }[]) {
  const resultado = lista(valor)
    .map((item) => {
      const o = objeto(item);
      const nombre = typeof o.nombre === "string" ? o.nombre : "";
      const porcentaje = numero(o.porcentaje, NaN);
      return nombre && Number.isFinite(porcentaje) ? { nombre, porcentaje } : null;
    })
    .filter((item): item is { nombre: string; porcentaje: number } => item !== null);
  return resultado.length ? resultado : fallback;
}

export function leerConfigVisualizador(valor: unknown): ConfigVisualizador3D {
  const root = objeto(valor);
  const densidades = objeto(root.densidades);
  const d = DEFAULT_CONFIG_VISUALIZADOR.densidades;
  return {
    densidades: {
      oro18a: numero(densidades.oro18a, d.oro18a),
      oro18b: numero(densidades.oro18b, d.oro18b),
      oro18r: numero(densidades.oro18r, d.oro18r),
      oro14: numero(densidades.oro14, d.oro14),
      plata925: numero(densidades.plata925, d.plata925),
      plata950: numero(densidades.plata950, d.plata950),
      plata970: numero(densidades.plata970, d.plata970),
      platino: numero(densidades.platino, d.platino),
    },
    factorEmpuje: numero(root.factorEmpuje, DEFAULT_CONFIG_VISUALIZADOR.factorEmpuje),
    modoEmpuje: root.modoEmpuje === "porcentaje" ? "porcentaje" : "gramos",
    factorSeguridad: numero(root.factorSeguridad, DEFAULT_CONFIG_VISUALIZADOR.factorSeguridad),
  };
}

export function leerConfigAleacion(valor: unknown): ConfigAleacion {
  const root = objeto(valor);
  const recetas = objeto(root.recetas);
  const d = DEFAULT_CONFIG_ALEACION.recetas;
  return {
    recetas: {
      amarillo: { metales: leerMetales(objeto(recetas.amarillo).metales, d.amarillo.metales) },
      blanco: { metales: leerMetales(objeto(recetas.blanco).metales, d.blanco.metales) },
      rosa: { metales: leerMetales(objeto(recetas.rosa).metales, d.rosa.metales) },
      naranja: { metales: leerMetales(objeto(recetas.naranja).metales, d.naranja.metales) },
    },
    factorCalculo: numero(root.factorCalculo, DEFAULT_CONFIG_ALEACION.factorCalculo),
  };
}

export function leerConfigYeso(valor: unknown): ConfigYeso {
  const root = objeto(valor);
  const props = lista(root.proporciones);
  const proporciones = props
    .map((item) => {
      const o = objeto(item);
      const agua = numero(o.agua, NaN);
      const yeso = numero(o.yeso, NaN);
      if (!Number.isFinite(agua) || !Number.isFinite(yeso)) return null;
      return { agua, yeso, recomendada: Boolean(o.recomendada) };
    })
    .filter((item): item is { agua: number; yeso: number; recomendada: boolean } => item !== null);
  const d = DEFAULT_CONFIG_YESO;
  const tolerancias = objeto(root.tolerancias);
  return {
    proporciones: proporciones.length ? proporciones : d.proporciones,
    volumenPorGramo: numero(root.volumenPorGramo, d.volumenPorGramo),
    factorCorreccion: numero(root.factorCorreccion, d.factorCorreccion),
    tolerancias: {
      liso: numero(tolerancias.liso, d.tolerancias.liso),
      perforado: numero(tolerancias.perforado, d.tolerancias.perforado),
    },
  };
}

export function useConfiguracionesCalculadoras() {
  const visualizador = useConfigSistema(CLAVES_CALCULADORAS.visualizador);
  const aleacion = useConfigSistema(CLAVES_CALCULADORAS.aleacion);
  const yeso = useConfigSistema(CLAVES_CALCULADORAS.yeso);

  return useMemo(
    () => ({
      visualizador: leerConfigVisualizador(visualizador.data?.valor),
      aleacion: leerConfigAleacion(aleacion.data?.valor),
      yeso: leerConfigYeso(yeso.data?.valor),
      cargando: visualizador.isLoading || aleacion.isLoading || yeso.isLoading,
    }),
    [visualizador.data, aleacion.data, yeso.data, visualizador.isLoading, aleacion.isLoading, yeso.isLoading],
  );
}

export type ConfigPesoGemas = {
  piedras: { nombre: string; sg: number }[];
  factores: Record<TallaGema, number>;
  margenEstimacion: number;
};

export type TallaGema = "redonda" | "oval" | "esmeralda" | "rectangular" | "marquise" | "pera" | "cuadrada" | "cushion" | "cabujon";

export const DEFAULT_CONFIG_PESO_GEMAS: ConfigPesoGemas = {
  piedras: [
    { nombre: "Diamante", sg: 3.52 }, { nombre: "Rubí / Zafiro", sg: 4.00 }, { nombre: "Esmeralda / Aguamarina", sg: 2.72 },
    { nombre: "Amatista / Cuarzo / Citrino", sg: 2.65 }, { nombre: "Turmalina", sg: 3.25 }, { nombre: "Peridoto", sg: 3.45 },
    { nombre: "Topacio", sg: 3.53 }, { nombre: "Granate", sg: 4.10 }, { nombre: "Ópalo", sg: 2.25 },
    { nombre: "Jade", sg: 3.10 }, { nombre: "Turquesa", sg: 2.80 },
  ],
  factores: { redonda: 0.002, oval: 0.0021, esmeralda: 0.0025, rectangular: 0.00235, marquise: 0.0016, pera: 0.0018, cuadrada: 0.00235, cushion: 0.00235, cabujon: 0.0027 },
  margenEstimacion: 8,
};

export type TallaAnillo = {
  diametroMm: number;
  espanola: number;
  europeaIso: number;
  americana: string | null;
};

export type ConfigTallasAnillo = {
  tabla: TallaAnillo[];
};

export const DEFAULT_CONFIG_TALLAS_ANILLO: ConfigTallasAnillo = {
  tabla: [
    { diametroMm: 15.2, espanola: 8, europeaIso: 48, americana: "4 1/2" },
    { diametroMm: 15.5, espanola: 9, europeaIso: 49, americana: "4 3/4" },
    { diametroMm: 15.9, espanola: 10, europeaIso: 50, americana: "5 1/4" },
    { diametroMm: 16.2, espanola: 11, europeaIso: 51, americana: "5 3/4" },
    { diametroMm: 16.5, espanola: 12, europeaIso: 52, americana: "6" },
    { diametroMm: 16.8, espanola: 13, europeaIso: 53, americana: "6 1/4" },
    { diametroMm: 17.1, espanola: 14, europeaIso: 54, americana: "6 3/4" },
    { diametroMm: 17.4, espanola: 15, europeaIso: 55, americana: "7 1/4" },
    { diametroMm: 17.8, espanola: 16, europeaIso: 56, americana: "7 1/2" },
    { diametroMm: 18.0, espanola: 17, europeaIso: 57, americana: "8" },
    { diametroMm: 18.4, espanola: 18, europeaIso: 58, americana: "8 1/4" },
    { diametroMm: 18.7, espanola: 19, europeaIso: 59, americana: "8 3/4" },
    { diametroMm: 19.0, espanola: 20, europeaIso: 60, americana: "9" },
    { diametroMm: 19.3, espanola: 21, europeaIso: 61, americana: "9 1/2" },
    { diametroMm: 19.6, espanola: 22, europeaIso: 62, americana: "9 3/4" },
    { diametroMm: 20.0, espanola: 23, europeaIso: 63, americana: "10 1/4" },
    { diametroMm: 20.3, espanola: 24, europeaIso: 64, americana: "10 1/2" },
    { diametroMm: 20.6, espanola: 25, europeaIso: 65, americana: "11" },
    { diametroMm: 21.0, espanola: 26, europeaIso: 66, americana: "11 1/2" },
    { diametroMm: 21.3, espanola: 27, europeaIso: 67, americana: "12" },
    { diametroMm: 21.6, espanola: 28, europeaIso: 68, americana: "12 1/4" },
    { diametroMm: 22.0, espanola: 29, europeaIso: 69, americana: "12 3/4" },
    { diametroMm: 22.3, espanola: 30, europeaIso: 70, americana: "13" },
    { diametroMm: 22.6, espanola: 31, europeaIso: 71, americana: "13 1/2" },
    { diametroMm: 23.0, espanola: 32, europeaIso: 72, americana: "14" },
    { diametroMm: 23.3, espanola: 33, europeaIso: 73, americana: "14 1/2" },
  ],
};

function normalizarTallaAmericana(valor: unknown): number | null {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor !== "string") return null;
  const texto = valor.trim().replace(/½/g, "1/2").replace(/¼/g, "1/4").replace(/¾/g, "3/4").replace(/,/g, ".");
  if (!texto) return null;
  const fraccion = texto.match(/^(\d+(?:\.\d+)?)\s+(1\/4|1\/2|3\/4)$/);
  if (fraccion) {
    const base = Number(fraccion[1]);
    const extra = fraccion[2] === "1/4" ? 0.25 : fraccion[2] === "1/2" ? 0.5 : 0.75;
    return Number.isFinite(base) ? base + extra : null;
  }
  const numeroDecimal = Number(texto);
  return Number.isFinite(numeroDecimal) ? numeroDecimal : null;
}

export function formatearTallaAmericana(valor: unknown): string | null {
  const numero = normalizarTallaAmericana(valor);
  if (numero === null) return null;
  const entero = Math.floor(numero);
  const fraccion = Math.round((numero - entero) * 4);
  if (fraccion === 0) return String(entero);
  const texto = fraccion === 1 ? "1/4" : fraccion === 2 ? "1/2" : "3/4";
  return `${entero} ${texto}`;
}

export function leerConfigTallasAnillo(valor: unknown): ConfigTallasAnillo {
  const root = objeto(valor);
  const filas = lista(root.tabla)
    .map((item) => {
      const o = objeto(item);
      const diametroMm = numero(o.diametroMm, NaN);
      // Compatibilidad con la configuración anterior: "europea" era en realidad la talla española.
      const espanola = numero(o.espanola, numero(o.europea, NaN));
      const europeaIso = numero(o.europeaIso, Number.isFinite(diametroMm) ? Math.round(diametroMm * Math.PI) : NaN);
      const americana = formatearTallaAmericana(o.americana);
      if (!Number.isFinite(diametroMm) || !Number.isFinite(espanola) || !Number.isFinite(europeaIso)) return null;
      return { diametroMm, espanola, europeaIso, americana };
    })
    .filter((item): item is TallaAnillo => item !== null)
    .sort((a, b) => a.diametroMm - b.diametroMm);
  return { tabla: filas.length ? filas : DEFAULT_CONFIG_TALLAS_ANILLO.tabla };
}

export function leerConfigPesoGemas(valor: unknown): ConfigPesoGemas {
  const root = objeto(valor);
  const piedras = lista(root.piedras).map((item) => { const o=objeto(item); const nombre=typeof o.nombre==="string"?o.nombre:""; const sg=numero(o.sg,NaN); return nombre&&Number.isFinite(sg)?{nombre,sg}:null; }).filter((x): x is {nombre:string;sg:number}=>x!==null);
  const factoresRoot=objeto(root.factores); const d=DEFAULT_CONFIG_PESO_GEMAS.factores;
  const factores = Object.fromEntries((Object.keys(d) as TallaGema[]).map(k=>[k,numero(factoresRoot[k],d[k])])) as Record<TallaGema,number>;
  return { piedras:piedras.length?piedras:DEFAULT_CONFIG_PESO_GEMAS.piedras, factores, margenEstimacion:Math.max(0,numero(root.margenEstimacion,DEFAULT_CONFIG_PESO_GEMAS.margenEstimacion)) };
}
