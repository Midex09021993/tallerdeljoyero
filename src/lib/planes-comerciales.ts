/**
 * Catálogo inicial de planes comerciales.
 *
 * Importante: es una matriz de definición y presentación, NO un sistema de permisos.
 * Las capacidades de sede, roles y cuentas siguen siendo la fuente operativa actual.
 * No aplicar límites ni bloquear módulos hasta validar cada regla y su enforcement.
 */

export type PlanComercialId = "emprendedor" | "taller" | "profesional" | "empresarial";

export type PlanComercial = {
  id: PlanComercialId;
  nombre: string;
  precioEtiqueta: string;
  estadoComercial: "gratis" | "pago" | "pendiente";
  enfoque: string;
  capacidadesRelacionadas: readonly string[];
  limitesActivos: false;
};

export const PLANES_COMERCIALES: readonly PlanComercial[] = [
  {
    id: "emprendedor",
    nombre: "Emprendedor",
    precioEtiqueta: "Gratis",
    estadoComercial: "gratis",
    enfoque: "Inicio de actividad con herramientas públicas y gestión comercial básica.",
    capacidadesRelacionadas: ["Clientes", "Cotizaciones", "Pedidos"],
    limitesActivos: false,
  },
  {
    id: "taller",
    nombre: "Taller",
    precioEtiqueta: "S/ 1 al día · S/ 30 al mes",
    estadoComercial: "pago",
    enfoque: "Organización del taller y ampliación de la gestión comercial por S/ 30 mensuales.",
    capacidadesRelacionadas: ["Clientes", "Cotizaciones", "Pedidos", "Contratos", "Ventas", "Catálogo"],
    limitesActivos: false,
  },
  {
    id: "profesional",
    nombre: "Profesional",
    precioEtiqueta: "S/ 29 al mes",
    estadoComercial: "pago",
    enfoque: "Flujo productivo, inventario y compras junto con la gestión comercial por S/ 29 mensuales.",
    capacidadesRelacionadas: [
      "Clientes", "Cotizaciones", "Pedidos", "Contratos", "Ventas", "Catálogo",
      "Diseño 3D", "Impresión 3D", "Casting", "Corte Láser", "Taller", "Inventario", "Compras",
    ],
    limitesActivos: false,
  },
  {
    id: "empresarial",
    nombre: "Empresarial",
    precioEtiqueta: "S/ 79 al mes",
    estadoComercial: "pago",
    enfoque: "Operación ampliada para equipos y organizaciones con necesidades multi-sede por S/ 79 mensuales.",
    capacidadesRelacionadas: [
      "Clientes", "Cotizaciones", "Pedidos", "Contratos", "Ventas", "Catálogo",
      "Diseño 3D", "Impresión 3D", "Casting", "Corte Láser", "Taller", "Inventario", "Compras",
      "Gestión de equipo", "Multi-sede", "Analítica",
    ],
    limitesActivos: false,
  },
] as const;

export function obtenerPlanComercial(id: unknown): PlanComercial | null {
  if (typeof id !== "string") return null;
  return PLANES_COMERCIALES.find((plan) => plan.id === id) ?? null;
}
