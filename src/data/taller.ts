export type Estado =
  | "Diseño 3D"
  | "Impresión 3D"
  | "Corte láser"
  | "Taller / Engaste"
  | "Entregado"
  | "Espera material";

export type Pedido = {
  id: string;
  pieza: string;
  cliente: string;
  material: string;
  estado: Estado;
  entrega: string;
  importe: number;
};

export const pedidos: Pedido[] = [
  {
    id: "#4402",
    pieza: "Solitario Diamante 1.2ct",
    cliente: "Elena Sanz",
    material: "Oro blanco 18k",
    estado: "Diseño 3D",
    entrega: "24 May",
    importe: 3480,
  },
  {
    id: "#4398",
    pieza: "Alianza grabada",
    cliente: "Julián Ruiz",
    material: "Oro blanco 18k",
    estado: "Taller / Engaste",
    entrega: "Hoy",
    importe: 890,
  },
  {
    id: "#4395",
    pieza: "Pendientes esmeralda",
    cliente: "Sofía Marín",
    material: "Oro amarillo 18k",
    estado: "Impresión 3D",
    entrega: "28 May",
    importe: 1560,
  },
  {
    id: "#4391",
    pieza: "Colgante hexagonal",
    cliente: "Nuria Báez",
    material: "Plata 925",
    estado: "Corte láser",
    entrega: "26 May",
    importe: 420,
  },
  {
    id: "#4386",
    pieza: "Anillo sello inicial",
    cliente: "Jorge Prat",
    material: "Platino 950",
    estado: "Espera material",
    entrega: "02 Jun",
    importe: 2140,
  },
  {
    id: "#4380",
    pieza: "Pulsera eslabón",
    cliente: "Carmen Vidal",
    material: "Plata 925",
    estado: "Entregado",
    entrega: "09 May",
    importe: 610,
  },
];

export const estadoClases: Record<Estado, string> = {
  "Diseño 3D": "bg-info-soft text-info",
  "Impresión 3D": "bg-accent text-foreground",
  "Corte láser": "bg-surface-muted text-muted-foreground",
  "Taller / Engaste": "bg-warning-soft text-warning",
  Entregado: "bg-success-soft text-success",
  "Espera material": "bg-danger-soft text-danger",
};

export type Cola = {
  ref: string;
  pieza: string;
  cliente: string;
  detalle: string;
  progreso: number;
};

export const colaDiseno: Cola[] = [
  { ref: "#4402", pieza: "Solitario Aurora", cliente: "Elena Sanz", detalle: "RhinoJewel · v3", progreso: 72 },
  { ref: "#4399", pieza: "Pendiente gota", cliente: "Rosa Cobo", detalle: "Modelado orgánico", progreso: 40 },
  { ref: "#4404", pieza: "Collar hilo fino", cliente: "Lucía Prada", detalle: "Boceto aprobado", progreso: 15 },
];

export const colaImpresion: Cola[] = [
  { ref: "#4395", pieza: "Cera sortija", cliente: "Sofía Marín", detalle: "Formlabs 3B+ · resina castable", progreso: 68 },
  { ref: "#4392", pieza: "Soporte gata", cliente: "Interno", detalle: "Formlabs 3B+ (B)", progreso: 25 },
];

export const colaLaser: Cola[] = [
  { ref: "#4391", pieza: "Base 18k mate", cliente: "Nuria Báez", detalle: "Corte terminado", progreso: 100 },
  { ref: "#4388", pieza: "Malla cenefa", cliente: "Marc Soler", detalle: "Cortando · 0,4 mm", progreso: 55 },
  { ref: "#4385", pieza: "Placa grabada", cliente: "Ana Ferrer", detalle: "En cola", progreso: 0 },
];

export const tareasTaller = [
  { tarea: "Engaste solitario 0,52 ct", responsable: "Marco V.", banco: "Banco 1", estado: "En curso" },
  { tarea: "Pulido alianza grabada", responsable: "Irene L.", banco: "Banco 2", estado: "En curso" },
  { tarea: "Soldadura colgante hexagonal", responsable: "Pau G.", banco: "Banco 3", estado: "Pendiente" },
  { tarea: "Fundición al vacío · platino", responsable: "Marco V.", banco: "Fundición", estado: "14:30 h" },
];

export const inventario = [
  { material: "Oro 18k amarillo", stock: 242, unidad: "g", minimo: 150, pct: 78 },
  { material: "Oro blanco 18k", stock: 168, unidad: "g", minimo: 120, pct: 62 },
  { material: "Plata de ley 925", stock: 45, unidad: "g", minimo: 200, pct: 12 },
  { material: "Platino 950", stock: 96, unidad: "g", minimo: 60, pct: 55 },
  { material: "Resina castable", stock: 840, unidad: "ml", minimo: 500, pct: 44 },
  { material: "Diamantes brillante", stock: 6.4, unidad: "ct", minimo: 3, pct: 66 },
];
