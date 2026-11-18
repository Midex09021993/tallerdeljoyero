import { useMemo, useState, type ChangeEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Boxes, CheckCircle2, FileSpreadsheet, History, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { FichaDorada } from "@/components/FichaDorada";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/migracion")({
  head: () => ({
    meta: [
      { title: "Migración — Aurum Lab" },
      { name: "description", content: "Migración progresiva de clientes, inventario y pedidos históricos hacia Aurum Lab." },
    ],
  }),
  component: MigracionPage,
});

type Modulo = "clientes" | "inventario";
type FilaCliente = { nombre: string; documento: string; telefono: string; whatsapp: string; email: string; ciudad: string; direccion: string; notas: string };
type FilaInventario = { codigo: string; material: string; categoria: string; unidad: string; stock: string; minimo: string; lote: string; ubicacion: string; proveedor: string; costo_unitario: string };

const CABECERAS_CLIENTES = {
  nombre: ["nombre", "cliente", "nombre completo", "razon social", "razón social"],
  documento: ["documento", "dni", "ruc", "cedula", "cédula"],
  telefono: ["telefono", "teléfono", "celular", "movil", "móvil"],
  whatsapp: ["whatsapp", "wsp"],
  email: ["email", "correo", "correo electronico", "correo electrónico"],
  ciudad: ["ciudad", "localidad"],
  direccion: ["direccion", "dirección", "domicilio"],
  notas: ["notas", "observaciones", "comentarios"],
} as const;

const CABECERAS_INVENTARIO = {
  codigo: ["codigo", "código", "cod", "sku", "codigo material", "código material", "codigo producto", "código producto"],
  material: ["material", "producto", "insumo", "descripcion", "descripción", "nombre", "articulo", "artículo"],
  categoria: ["categoria", "categoría", "tipo", "familia", "grupo"],
  unidad: ["unidad", "ud", "medida", "unidad medida"],
  stock: ["stock", "existencia", "existencias", "cantidad", "saldo", "stock actual"],
  minimo: ["minimo", "mínimo", "stock minimo", "stock mínimo", "minimo stock", "mínimo stock", "reorden"],
  lote: ["lote", "lote proveedor", "batch"],
  ubicacion: ["ubicacion", "ubicación", "almacen", "almacén", "estante", "zona"],
  proveedor: ["proveedor", "vendedor", "distribuidor"],
  costo_unitario: ["costo", "costo unitario", "precio costo", "precio de costo", "coste", "coste unitario"],
} as const;

const CATEGORIAS = ["Oro", "Plata", "Piedras", "Resina", "Soldadura", "Herramientas", "Otros insumos"];

function normalizar(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function parseCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let comillas = false;
  for (let i = 0; i < texto.length; i += 1) {
    const ch = texto[i], next = texto[i + 1];
    if (ch === '"' && comillas && next === '"') { celda += '"'; i += 1; }
    else if (ch === '"') comillas = !comillas;
    else if ((ch === "," || ch === ";" || ch === "\t") && !comillas) { fila.push(celda.trim()); celda = ""; }
    else if ((ch === "\n" || ch === "\r") && !comillas) { if (ch === "\r" && next === "\n") i += 1; fila.push(celda.trim()); if (fila.some(Boolean)) filas.push(fila); fila = []; celda = ""; }
    else celda += ch;
  }
  fila.push(celda.trim());
  if (fila.some(Boolean)) filas.push(fila);
  return filas;
}

function encontrarColumna(encabezados: string[], opciones: readonly string[]) {
  const indice = encabezados.findIndex((h) => opciones.includes(normalizar(h)));
  return indice >= 0 ? indice : -1;
}

function convertirClientes(matriz: string[][]): FilaCliente[] {
  const encabezados = matriz[0] ?? [];
  const indices = Object.fromEntries(Object.entries(CABECERAS_CLIENTES).map(([campo, opciones]) => [campo, encontrarColumna(encabezados, opciones)])) as Record<keyof FilaCliente, number>;
  return matriz.slice(1).map((fila) => {
    const valor = (campo: keyof FilaCliente) => indices[campo] >= 0 ? (fila[indices[campo]] ?? "").trim() : "";
    return { nombre: valor("nombre"), documento: valor("documento"), telefono: valor("telefono"), whatsapp: valor("whatsapp"), email: valor("email"), ciudad: valor("ciudad"), direccion: valor("direccion"), notas: valor("notas") };
  });
}

function convertirInventario(matriz: string[][]): FilaInventario[] {
  const encabezados = matriz[0] ?? [];
  const indices = Object.fromEntries(Object.entries(CABECERAS_INVENTARIO).map(([campo, opciones]) => [campo, encontrarColumna(encabezados, opciones)])) as Record<keyof FilaInventario, number>;
  return matriz.slice(1).map((fila) => {
    const valor = (campo: keyof FilaInventario) => indices[campo] >= 0 ? (fila[indices[campo]] ?? "").trim() : "";
    return { codigo: valor("codigo"), material: valor("material"), categoria: valor("categoria"), unidad: valor("unidad"), stock: valor("stock"), minimo: valor("minimo"), lote: valor("lote"), ubicacion: valor("ubicacion"), proveedor: valor("proveedor"), costo_unitario: valor("costo_unitario") };
  });
}

function numero(valor: string, fallback = 0) {
  const limpio = String(valor ?? "").trim().replace(/\s/g, "").replace(/S\/\.?/gi, "").replace(/\$/g, "");
  if (!limpio) return fallback;
  const normalizado = limpio.includes(",") && limpio.includes(".")
    ? limpio.lastIndexOf(",") > limpio.lastIndexOf(".") ? limpio.replace(/\./g, "").replace(",", ".") : limpio.replace(/,/g, "")
    : limpio.includes(",") ? limpio.replace(",", ".") : limpio;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : fallback;
}

function categoriaInventario(valor: string) {
  const clave = normalizar(valor);
  const encontrada = CATEGORIAS.find((c) => normalizar(c) === clave);
  if (encontrada) return encontrada;
  if (clave.includes("oro")) return "Oro";
  if (clave.includes("plata")) return "Plata";
  if (clave.includes("piedra") || clave.includes("gema")) return "Piedras";
  if (clave.includes("resina") || clave.includes("cera")) return "Resina";
  if (clave.includes("sold")) return "Soldadura";
  if (clave.includes("herramient")) return "Herramientas";
  return "Otros insumos";
}

function MigracionPage() {
  const { data: sesion } = useSesion();
  const sedeId = sesion?.perfil.sede_id ?? null;
  const [modulo, setModulo] = useState<Modulo>("clientes");
  const [archivo, setArchivo] = useState("");
  const [filasClientes, setFilasClientes] = useState<FilaCliente[]>([]);
  const [filasInventario, setFilasInventario] = useState<FilaInventario[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<{ importados: number; omitidos: number; errores: number } | null>(null);

  const clientesValidos = useMemo(() => filasClientes.filter((f) => f.nombre.trim()), [filasClientes]);
  const clientesSinNombre = filasClientes.length - clientesValidos.length;
  const clavesClientesArchivo = useMemo(() => {
    return clientesValidos.map((f) => {
      const documento = f.documento.trim();
      return documento ? `doc:${normalizar(documento)}` : `nombre:${normalizar(f.nombre)}`;
    });
  }, [clientesValidos]);
  const clientesDuplicadosArchivo = useMemo(
    () => clavesClientesArchivo.length - new Set(clavesClientesArchivo).size,
    [clavesClientesArchivo],
  );

  const inventarioValido = useMemo(() => filasInventario.filter((f) => f.material.trim()), [filasInventario]);
  const inventarioSinMaterial = filasInventario.length - inventarioValido.length;
  const inventarioInvalidos = useMemo(() => inventarioValido.filter((f) => (f.stock.trim() && numero(f.stock, Number.NaN) < 0) || (f.minimo.trim() && numero(f.minimo, Number.NaN) < 0) || (f.costo_unitario.trim() && numero(f.costo_unitario, Number.NaN) < 0)).length, [inventarioValido]);
  const inventarioDuplicados = useMemo(() => {
    const claves = inventarioValido.map((f) => normalizar(f.codigo || f.material));
    return claves.length - new Set(claves.filter(Boolean)).size;
  }, [inventarioValido]);

  function limpiarVista() {
    setArchivo("");
    setFilasClientes([]);
    setFilasInventario([]);
    setResultado(null);
  }

  async function seleccionar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setArchivo(file.name);
    setResultado(null);
    try {
      const texto = await file.text();
      const matriz = parseCsv(texto);
      if (matriz.length < 2) throw new Error("El archivo no contiene filas suficientes.");
      if (modulo === "clientes") {
        const clientes = convertirClientes(matriz);
        if (!clientes.length || !clientes.some((c) => c.nombre)) throw new Error("No encontramos una columna de nombre de cliente.");
        setFilasClientes(clientes);
        setFilasInventario([]);
        toast.success(clientes.length + " filas de clientes preparadas para revisar");
      } else {
        const inventario = convertirInventario(matriz);
        if (!inventario.length || !inventario.some((m) => m.material)) throw new Error("No encontramos una columna de material o producto.");
        setFilasInventario(inventario);
        setFilasClientes([]);
        toast.success(inventario.length + " filas de inventario preparadas para revisar");
      }
    } catch (error) {
      limpiarVista();
      toast.error(error instanceof Error ? error.message : "No se pudo leer el archivo");
    }
    e.target.value = "";
  }

  async function importarClientes() {
    if (!sesion?.esDueno && !sesion?.roles.includes("gerente")) { toast.error("Solo dueño o gerente pueden importar información."); return; }
    if (!sedeId) {
      toast.error("La sesión debe tener una sede asignada para importar clientes.");
      return;
    }
    if (!clientesValidos.length) return;
    setProcesando(true);
    let importados = 0;
    let omitidos = clientesSinNombre + clientesDuplicadosArchivo;
    try {
      const { data: existentes, error } = await supabase
        .from("clientes")
        .select("id,nombre,documento")
        .eq("sede_id", sedeId)
        .limit(5000);
      if (error) throw error;
      const documentosExistentes = new Set(
        (existentes ?? [])
          .map((c) => c.documento)
          .filter(Boolean)
          .map((d) => normalizar(String(d))),
      );
      const nombresExistentes = new Set(
        (existentes ?? [])
          .map((c) => normalizar(String(c.nombre ?? "")))
          .filter(Boolean),
      );
      const vistos = new Set<string>();

      for (const fila of clientesValidos) {
        const documento = fila.documento.trim();
        const documentoClave = documento ? normalizar(documento) : "";
        const nombreClave = normalizar(fila.nombre);
        const clave = documentoClave ? `doc:${documentoClave}` : `nombre:${nombreClave}`;

        if (
          (documentoClave && documentosExistentes.has(documentoClave)) ||
          nombresExistentes.has(nombreClave) ||
          vistos.has(clave)
        ) {
          omitidos += 1;
          continue;
        }

        const { error: errorInsert } = await supabase.from("clientes").insert({
          sede_id: sedeId,
          nombre: fila.nombre,
          documento: documento || null,
          telefono: fila.telefono || null,
          whatsapp: fila.whatsapp || null,
          email: fila.email || null,
          ciudad: fila.ciudad || null,
          direccion: fila.direccion || null,
          notas: fila.notas || "",
          estado: "activo",
          tipo: "persona",
          metadata: { origen: "migracion", fuente: archivo, importado_en: new Date().toISOString() },
        });
        if (errorInsert) throw errorInsert;
        importados += 1;
        vistos.add(clave);
        if (documentoClave) documentosExistentes.add(documentoClave);
        nombresExistentes.add(nombreClave);
      }
      setResultado({ importados, omitidos, errores: 0 });
      toast.success("Migración terminada: " + importados + " clientes incorporados");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La importación no pudo completarse");
    } finally { setProcesando(false); }
  }

  async function importarInventario() {
    if (!sesion?.esDueno && !sesion?.roles.includes("gerente")) { toast.error("Solo dueño o gerente pueden importar información."); return; }
    if (!sedeId || !inventarioValido.length) { toast.error("La sesión debe tener una sede asignada para importar inventario."); return; }
    setProcesando(true);
    let importados = 0;
    let omitidos = inventarioSinMaterial + inventarioInvalidos + inventarioDuplicados;
    try {
      const { data: existentes, error } = await supabase.from("inventario").select("id,codigo,material").eq("sede_id", sedeId).limit(5000);
      if (error) throw error;
      const codigosExistentes = new Set((existentes ?? []).map((m) => String(m.codigo ?? "").trim()).filter(Boolean).map(normalizar));
      const nombresExistentes = new Set((existentes ?? []).map((m) => normalizar(String(m.material ?? ""))).filter(Boolean));
      const vistos = new Set<string>();
      for (const fila of inventarioValido) {
        const stock = numero(fila.stock), minimo = numero(fila.minimo), costo = numero(fila.costo_unitario);
        if (stock < 0 || minimo < 0 || costo < 0) continue;
        const codigo = fila.codigo.trim(), material = fila.material.trim(), clave = normalizar(codigo || material);
        if ((codigo && codigosExistentes.has(normalizar(codigo))) || nombresExistentes.has(normalizar(material)) || vistos.has(clave)) { omitidos += 1; continue; }
        const { error: errorInsert } = await supabase.from("inventario").insert({
          sede_id: sedeId, codigo, material, categoria: categoriaInventario(fila.categoria), unidad: fila.unidad.trim() || "g",
          stock, minimo, lote: fila.lote.trim(), ubicacion: fila.ubicacion.trim(), proveedor: fila.proveedor.trim(), costo_unitario: costo, activo: true,
        });
        if (errorInsert) throw errorInsert;
        importados += 1;
        vistos.add(clave);
      }
      setResultado({ importados, omitidos, errores: 0 });
      toast.success("Migración terminada: " + importados + " materiales incorporados");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La importación de inventario no pudo completarse");
    } finally { setProcesando(false); }
  }

  async function importar() {
    if (modulo === "clientes") await importarClientes();
    else await importarInventario();
  }

  const totalFilas = modulo === "clientes" ? filasClientes.length : filasInventario.length;
  const totalValidas = modulo === "clientes" ? clientesValidos.length : inventarioValido.length;
  const totalProblemas = modulo === "clientes" ? clientesSinNombre + clientesDuplicadosArchivo : inventarioSinMaterial + inventarioInvalidos + inventarioDuplicados;

  if (!sesion) return null;

  return (
    <AppShell titulo="Centro de migración" subtitulo="Trae la información de tu taller poco a poco, sin detener la operación.">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FichaDorada indicador="Migración" titulo="Clientes" valor="CSV" descripcion="Importación segura" disabled icono={<Users className="size-5" strokeWidth={1.7} />} />
          <FichaDorada indicador="Migración" titulo="Inventario" valor="CSV" descripcion="Etapa activa" disabled icono={<Boxes className="size-5" strokeWidth={1.7} />} />
          <FichaDorada indicador="Histórico" titulo="Pedidos" valor="Próximo" descripcion="Se incorpora después" disabled icono={<History className="size-5" strokeWidth={1.7} />} />
          <FichaDorada indicador="Documentos" titulo="Externos" valor="OK" descripcion="Se conservan durante la transición" disabled icono={<FileSpreadsheet className="size-5" strokeWidth={1.7} />} />
        </div>

        <div className="rounded-2xl border border-gold/15 bg-card p-2 shadow-[0_14px_40px_-32px_hsl(var(--gold)/.4)]">
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => { setModulo("clientes"); limpiarVista(); }} className={modulo === "clientes" ? "inline-flex items-center gap-2 rounded-xl bg-gold/[.10] px-4 py-2.5 text-xs font-semibold ring-1 ring-gold/20" : "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs text-muted-foreground transition hover:bg-gold/[.04]"}><Users className="size-4" /> Clientes</button>
            <button type="button" onClick={() => { setModulo("inventario"); limpiarVista(); }} className={modulo === "inventario" ? "inline-flex items-center gap-2 rounded-xl bg-gold/[.10] px-4 py-2.5 text-xs font-semibold ring-1 ring-gold/20" : "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs text-muted-foreground transition hover:bg-gold/[.04]"}><Boxes className="size-4" /> Inventario</button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <section className="overflow-hidden rounded-2xl border border-gold/15 bg-card shadow-[0_18px_50px_-35px_rgba(0,0,0,.25)]">
            <div className="border-b border-border p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-gold/80">Migración progresiva</p>
              <h2 className="mt-1 text-xl font-semibold">{modulo === "clientes" ? "Traer clientes desde tu agenda" : "Traer inventario desde tu Excel"}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{modulo === "clientes" ? "Aurum detecta nombres habituales de columnas, revisa duplicados y no modifica los clientes que ya existen." : "Aurum reconoce columnas habituales de inventario, convierte cantidades con coma decimal y evita duplicar materiales de la sede."}</p>
            </div>
            <div className="space-y-5 p-6">
              <div className="rounded-2xl border border-dashed border-gold/30 bg-gold/[.025] p-7 text-center">
                <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-gold/20 bg-gold/[.07] text-gold"><FileSpreadsheet className="size-6" /></div>
                <p className="mt-4 font-medium">Exporta tu Excel como CSV y súbelo aquí</p>
                <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-muted-foreground">Puedes usar columnas como Código, Material, Stock, Mínimo, Lote, Ubicación, Proveedor y Costo.</p>
                <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gold/25 bg-gold/[.08] px-4 py-2.5 text-sm font-semibold transition hover:bg-gold/[.13]"><Upload className="size-4 text-gold" /> Elegir archivo CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void seleccionar(e)} /></label>
                {archivo ? <p className="mt-3 text-xs text-muted-foreground">{archivo}</p> : null}
              </div>

              {totalFilas ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <MiniStat label="Filas leídas" value={totalFilas} />
                    <MiniStat label="Listas para importar" value={totalValidas - (modulo === "inventario" ? inventarioInvalidos : 0)} positive />
                    <MiniStat label="Revisión necesaria" value={totalProblemas} warning={totalProblemas > 0} />
                  </div>

                  {modulo === "clientes" ? (
                    <div className="overflow-x-auto rounded-2xl border border-border">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-gold/[.025]"><tr>{["Cliente", "Documento", "Teléfono", "WhatsApp", "Email", "Ciudad"].map((h) => <th key={h} className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground">{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-border">{filasClientes.slice(0, 20).map((f, i) => <tr key={f.nombre + "-" + i}><td className="px-4 py-3 font-medium">{f.nombre || "—"}</td><td className="px-4 py-3 text-muted-foreground">{f.documento || "—"}</td><td className="px-4 py-3 text-muted-foreground">{f.telefono || "—"}</td><td className="px-4 py-3 text-muted-foreground">{f.whatsapp || "—"}</td><td className="px-4 py-3 text-muted-foreground">{f.email || "—"}</td><td className="px-4 py-3 text-muted-foreground">{f.ciudad || "—"}</td></tr>)}</tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-border">
                      <table className="w-full min-w-[1050px] text-left text-sm">
                        <thead className="bg-gold/[.025]"><tr>{["Material", "Código", "Categoría", "Unidad", "Stock", "Mínimo", "Lote", "Ubicación", "Proveedor", "Costo"].map((h) => <th key={h} className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground">{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-border">{filasInventario.slice(0, 20).map((f, i) => {
                          const invalido = numero(f.stock, Number.NaN) < 0 || numero(f.minimo, Number.NaN) < 0 || numero(f.costo_unitario, Number.NaN) < 0;
                          return <tr key={(f.codigo || f.material) + "-" + i} className={invalido ? "bg-danger/[.025]" : ""}><td className="px-4 py-3 font-medium">{f.material || "—"}</td><td className="px-4 py-3 text-muted-foreground">{f.codigo || "—"}</td><td className="px-4 py-3 text-muted-foreground">{categoriaInventario(f.categoria)}</td><td className="px-4 py-3 text-muted-foreground">{f.unidad || "g"}</td><td className="px-4 py-3 tabular-nums">{f.stock || "0"}</td><td className="px-4 py-3 tabular-nums">{f.minimo || "0"}</td><td className="px-4 py-3 text-muted-foreground">{f.lote || "—"}</td><td className="px-4 py-3 text-muted-foreground">{f.ubicacion || "—"}</td><td className="px-4 py-3 text-muted-foreground">{f.proveedor || "—"}</td><td className="px-4 py-3 tabular-nums">{f.costo_unitario || "0"}</td></tr>;
                        })}</tbody>
                      </table>
                    </div>
                  )}

                  {totalFilas > 20 ? <p className="text-xs text-muted-foreground">Mostrando las primeras 20 filas para revisión.</p> : null}
                  <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-xl text-xs leading-5 text-muted-foreground">Aurum no elimina ni sobrescribe registros existentes. Los duplicados se omiten para que puedas revisarlos.</p>
                    <button type="button" onClick={() => void importar()} disabled={procesando || !totalValidas || (modulo === "inventario" && inventarioInvalidos === inventarioValido.length)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gold/25 bg-gold/[.09] px-5 py-2.5 text-sm font-semibold transition hover:bg-gold/[.14] disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 className="size-4 text-gold" />{procesando ? "Importando…" : "Importar " + totalValidas + " " + (modulo === "clientes" ? "clientes" : "materiales")}</button>
                  </div>
                </>
              ) : null}

              {resultado ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[.04] p-4"><p className="text-sm font-semibold">Migración completada</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{resultado.importados} registros incorporados · {resultado.omitidos} omitidos por duplicados o datos que requieren revisión.</p></div> : null}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-gold/15 bg-card p-6 shadow-[0_18px_50px_-35px_rgba(0,0,0,.25)]">
              <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-gold/80">Ruta</p>
              <h2 className="mt-1 text-lg font-semibold">Migración sin fricción</h2>
              <div className="mt-5 space-y-3">
                {[
                  ["Clientes", "Importar agenda y conservar duplicados bajo revisión", Users],
                  ["Inventario", "Traer existencias, lotes y costos por sede", Boxes],
                  ["Pedidos históricos", "Conectar el pasado con los pedidos nuevos", History],
                  ["Documentos", "Mantener contratos y archivos externos", FileSpreadsheet],
                ].map(([titulo, detalle, Icon]) => { const IconCmp = Icon as typeof Users; return <div key={titulo as string} className="flex gap-3 rounded-xl border border-border p-3"><div className="grid size-9 shrink-0 place-items-center rounded-lg bg-gold/[.06] text-gold"><IconCmp className="size-4" /></div><div><p className="text-sm font-medium">{titulo as string}</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detalle as string}</p></div></div>; })}
              </div>
            </section>
            <section className="rounded-2xl border border-gold/15 bg-card p-6 shadow-[0_18px_50px_-35px_rgba(0,0,0,.25)]"><div className="flex gap-3"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" /><div><p className="text-sm font-semibold">Regla de Aurum</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Primero absorbemos la forma actual de trabajar del taller. Después conectamos, ordenamos y automatizamos. No necesitas migrarlo todo para empezar a trabajar.</p></div></div></section>
            <section className="rounded-2xl border border-gold/15 bg-gold/[.025] p-5"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-gold/80">Formato reconocido</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Para inventario puedes usar <strong>Código</strong>, <strong>Material</strong>, <strong>Stock</strong>, <strong>Mínimo</strong>, <strong>Lote</strong>, <strong>Ubicación</strong>, <strong>Proveedor</strong> y <strong>Costo</strong>. La unidad por defecto es gramos.</p></section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function MiniStat({ label, value, positive = false, warning = false }: { label: string; value: number; positive?: boolean; warning?: boolean }) {
  return <div className="rounded-2xl border border-border bg-background p-4"><p className={warning ? "text-danger" : positive ? "text-gold" : "text-foreground"}><span className="text-2xl font-semibold tabular-nums">{value}</span></p><p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p></div>;
}
