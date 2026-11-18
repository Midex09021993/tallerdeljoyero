/**
 * Balance de masa para ajustes de ley de aleaciones de oro.
 *
 * La finura se expresa como fracción másica de oro fino (0..1).
 * No modela pérdidas de fundición, oxidación, contaminación ni cambios
 * de composición por volatilización: los resultados son teóricos.
 */

export type OperacionAjusteLey = "bajar" | "subir" | "mezclar";

export type ResultadoBalanceLey = {
  masaInicial: number;
  finuraInicial: number;
  masaAnadida: number;
  finuraAnadida: number;
  masaFinal: number;
  oroFinoInicial: number;
  oroFinoAnadido: number;
  oroFinoFinal: number;
  finuraFinal: number;
  quilatesFinales: number;
};

export type ErrorBalanceLey =
  | "masa-inicial-invalida"
  | "finura-inicial-invalida"
  | "finura-objetivo-invalida"
  | "finura-anadida-invalida"
  | "objetivo-no-alcanzable"
  | "datos-no-finitos";

export type ResultadoCalculoLey =
  | { ok: true; resultado: ResultadoBalanceLey }
  | { ok: false; error: ErrorBalanceLey };

const esFinuraValida = (valor: number) =>
  Number.isFinite(valor) && valor >= 0 && valor <= 1;

/** Convierte quilates (24 partes) a finura másica. */
export function quilatesAFinura(quilates: number): number | null {
  if (!Number.isFinite(quilates) || quilates < 0 || quilates > 24) return null;
  return quilates / 24;
}

/** Convierte finura másica a partes por mil. */
export function finuraAPartesMil(finura: number): number | null {
  if (!esFinuraValida(finura)) return null;
  return finura * 1000;
}

/**
 * Calcula cuánto material añadir para alcanzar una finura objetivo.
 * La finura del material añadido determina el tipo de operación:
 * 0 = liga sin oro; 1 = oro fino; valor intermedio = otra aleación.
 *
 * Balance: m_i*f_i + x*f_a = (m_i+x)*f_t
 * Despeje: x = m_i*(f_t-f_i)/(f_a-f_t)
 */
export function calcularAjustePorBalanceDeMasa(args: {
  masaInicial: number;
  finuraInicial: number;
  finuraObjetivo: number;
  finuraAnadida: number;
}): ResultadoCalculoLey {
  const { masaInicial, finuraInicial, finuraObjetivo, finuraAnadida } = args;

  if (!Number.isFinite(masaInicial) || masaInicial <= 0) {
    return { ok: false, error: "masa-inicial-invalida" };
  }
  if (!Number.isFinite(finuraInicial)) {
    return { ok: false, error: "datos-no-finitos" };
  }
  if (!esFinuraValida(finuraInicial)) {
    return { ok: false, error: "finura-inicial-invalida" };
  }
  if (!Number.isFinite(finuraObjetivo)) {
    return { ok: false, error: "datos-no-finitos" };
  }
  if (!esFinuraValida(finuraObjetivo) || finuraObjetivo === 0 || finuraObjetivo === 1) {
    return { ok: false, error: "finura-objetivo-invalida" };
  }
  if (!Number.isFinite(finuraAnadida)) {
    return { ok: false, error: "datos-no-finitos" };
  }
  if (!esFinuraValida(finuraAnadida)) {
    return { ok: false, error: "finura-anadida-invalida" };
  }

  const denominador = finuraAnadida - finuraObjetivo;
  const numerador = masaInicial * (finuraObjetivo - finuraInicial);

  // El objetivo debe quedar estrictamente entre la finura inicial y la añadida.
  if (denominador === 0 || numerador / denominador <= 0) {
    return { ok: false, error: "objetivo-no-alcanzable" };
  }

  const masaAnadida = numerador / denominador;
  if (!Number.isFinite(masaAnadida) || masaAnadida <= 0) {
    return { ok: false, error: "objetivo-no-alcanzable" };
  }

  const masaFinal = masaInicial + masaAnadida;
  const oroFinoInicial = masaInicial * finuraInicial;
  const oroFinoAnadido = masaAnadida * finuraAnadida;
  const oroFinoFinal = oroFinoInicial + oroFinoAnadido;
  const finuraFinal = oroFinoFinal / masaFinal;

  return {
    ok: true,
    resultado: {
      masaInicial,
      finuraInicial,
      masaAnadida,
      finuraAnadida,
      masaFinal,
      oroFinoInicial,
      oroFinoAnadido,
      oroFinoFinal,
      finuraFinal,
      quilatesFinales: finuraFinal * 24,
    },
  };
}

/** Valida una receta expresada como fracciones de la masa total de liga. */
export function validarRecetaLiga(
  metales: { nombre: string; porcentaje: number }[],
  tolerancia = 1e-6,
): { valida: boolean; suma: number; motivo?: string } {
  if (!metales.length) {
    return { valida: false, suma: 0, motivo: "La receta no contiene metales." };
  }

  if (metales.some((metal) =>
    !metal.nombre.trim() ||
    !Number.isFinite(metal.porcentaje) ||
    metal.porcentaje < 0
  )) {
    return { valida: false, suma: 0, motivo: "Hay nombres o porcentajes inválidos." };
  }

  const suma = metales.reduce((total, metal) => total + metal.porcentaje, 0);
  if (Math.abs(suma - 1) > tolerancia) {
    return { valida: false, suma, motivo: "Los porcentajes deben sumar 100%." };
  }

  return { valida: true, suma };
}
