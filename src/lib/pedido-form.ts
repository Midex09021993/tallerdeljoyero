import { AREAS } from "@/lib/auth";

export const RUTA_AREAS_PEDIDO = AREAS.filter(
  (area) => area !== "Pedidos" && area !== "Área ventas",
);

export const pedidoFormVacio = {
  cliente: "",
  cliente_id: "",
  proyecto_joya_id: "",
  telefono: "",
  origen: "",
  contrato: "",
  trabajo: "",
  material: "",
  peso_estimado: "",
  importe: "0",
  a_cuenta: "0",
  fecha_ingreso: "",
  fecha_entrega: "",
  talla: "",
  cantidad_piezas: "1",
  piedras: "",
  notas: "",
  corte_texto: "",
  corte_tipografia: "",
  corte_ubicacion: "",
  corte_observaciones: "",
};

export type PedidoFormState = typeof pedidoFormVacio;
