import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listarPedidos from "./tools/listar-pedidos";
import verPedido from "./tools/ver-pedido";
import resumenProduccion from "./tools/resumen-produccion";
import listarContratos from "./tools/listar-contratos";
import buscarClientes from "./tools/buscar-clientes";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "tallerdeljoyero",
  title: "tallerdeljoyero",
  version: "0.1.0",
  instructions:
    "Herramientas de AURUM LAB (taller de joyería). Consultas de solo lectura con los permisos del usuario que inició sesión: pedidos activos e históricos, detalle de un pedido, resumen de producción por estado y área, contratos y clientes. Estados oficiales: Recibido, En Producción, Listo para Entrega, En Camino, Entregado. No incluye costes ni notas internas. Moneda: soles (S/), zona horaria Lima (UTC−5).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listarPedidos, verPedido, resumenProduccion, listarContratos, buscarClientes],
});
