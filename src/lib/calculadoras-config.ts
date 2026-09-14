import { useMemo } from "react";
import { useConfigSistema } from "@/lib/taller-db";

export const CLAVES_CALCULADORAS = {
  visualizador: "calculadora_visualizador_3d",
  aleacion: "calculadora_aleacion_oro",
  yeso: "calculadora_yeso",
} as const;

export type ConfigVisualizador3D = {
  densidades: {
    oro18a: number;
    oro18b: number;
    oro18r: number;
    oro14: number;
    plata950: number;
    platino: number;
  };
  factorEmpuje: number;
  factorSeguridad: number;
};

export type ConfigAleacion = {
  recetas: {
    amarillo: { metales: { nombre: string; porcentaje: number }[] };
    blanco: { metales: { nombre: string; porcentaje: number }[] };
    rosa: { metales: { nombre: string; porcentaje: number }[] };
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
  densidades: { oro18a: 15.5, oro18b: 15.8, oro18r: 15.3, oro14: 13.1, plata950: 10.4, platino: 21.4 },
  factorEmpuje: 10,
  factorSeguridad: 1,
};

export const DEFAULT_CONFIG_ALEACION: ConfigAleacion = {
  recetas: {
    amarillo: { metales: [{ nombre: "Plata", porcentaje: 0.5 }, { nombre: "Cobre", porcentaje: 0.5 }] },
    blanco: { metales: [{ nombre: "Cobre", porcentaje: 0.4 }, { nombre: "Níquel", porcentaje: 0.4 }, { nombre: "Zinc", porcentaje: 0.2 }] },
    rosa: { metales: [{ nombre: "Cobre", porcentaje: 0.89 }, { nombre: "Plata", porcentaje: 0.11 }] },
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

function objeto(valor: unknown): Record<string, unknown> {
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
      plata950: numero(densidades.plata950, d.plata950),
      platino: numero(densidades.platino, d.platino),
    },
    factorEmpuje: numero(root.factorEmpuje, DEFAULT_CONFIG_VISUALIZADOR.factorEmpuje),
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
