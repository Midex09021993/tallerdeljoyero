import { useMemo, useState, type ChangeEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, FileSpreadsheet, History, Upload, Users, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Panel, StatCard } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/migracion")({
  head: () => ({
    meta: [
      { title: "Migración — Aurum Lab" },
      {
        name: "description",
        content: "Migración progresiva de clientes, inventario y pedidos históricos hacia Aurum Lab.",
      },
    ],
  }),
  component: MigracionPage,
});

type FilaCliente = {
  nombre: string;
  documento: string;
  telefono: string;
  whatsapp: string;
  email: string;
  ciudad: string;
  direccion: string;
  notas: string;
};

const CABECERAS = {
  nombre: ["nombre", "cliente", "nombre completo", "razon social", "razón social"],
  documento: ["documento", "dni", "ruc", "cedula", "cédula"],
  telefono: ["telefono", "teléfono", "celular", "movil", "móvil"],
  whatsapp: ["whatsapp", "wsp"],
  email: ["email", "correo", "correo electronico", "correo electrónico"],
  ciudad: ["ciudad", "localidad"],
  direccion: ["direccion", "dirección", "domicilio"],
  notas: ["notas", "observaciones", "comentarios"],
} as const;

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function parseCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let comillas = false;

  for (let i = 0; i < texto.length; i += 1) {
    const ch = texto[i];
    const next = texto[i + 1];
    if (ch === '"' && comillas && next === '"') {
      celda += '"';
      i += 1;
    } else if (ch === '"') {
      comillas = !comillas;
    } else if ((ch === "," || ch === ";" || ch === "\t") && !comillas) {
      fila.push(celda.trim());
      celda = "";
    } else if ((ch === "\n" || ch === "\r") && !comillas) {
      if (ch === "\r" && next === "\n") i += 1;
      fila.push(celda.trim());
      if (fila.some(Boolean)) filas.push(fila);
      fila = [];
      celda = "";
    } else {
      celda += ch;
    }
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
  const indices = Object.fromEntries(
    Object.entries(CABECERAS).map(([campo, opciones]) => [
      campo,
      encontrarColumna(encabezados, opciones),
    ]),
  ) as Record<keyof FilaCliente, number>;

  return matriz.slice(1).map((fila) => {
    const valor = (campo: keyof FilaCliente) =>
      indices[campo] >= 0 ? (fila[indices[campo]] ?? "").trim() : "";
    return {
      nombre: valor("nombre"),
      documento: valor("documento"),
      telefono: valor("telefono"),
      whatsapp: valor("whatsapp"),
      email: valor("email"),
      ciudad: valor("ciudad"),
      direccion: valor("direccion"),
      notas: valor("notas"),
    };
  });
}

function MigracionPage() {
  const { data: sesion } = useSesion();
  const [archivo, setArchivo] = useState("");
  const [filas, setFilas] = useState<FilaCliente[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<{ importados: number; omitidos: number } | null>(null);

  const validas = useMemo(() => filas.filter((f) => f.nombre.trim()), [filas]);
  const sinNombre = filas.length - validas.length;
  const documentos = useMemo(() => new Set(validas.map((f) => f.documento).filter(Boolean)), [validas]);
  const duplicadosArchivo = validas.length - documentos.size;

  async function seleccionar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setArchivo(file.name);
    setResultado(null);
    try {
      const texto = await file.text();
      const matriz = parseCsv(texto);
      const clientes = convertirClientes(matriz);
      if (!clientes.length || !clientes.some((c) => c.nombre)) {
        throw new Error("No encontramos una columna de nombre de cliente.");
      }
      setFilas(clientes);
      toast.success(`${clientes.length} filas preparadas para revisar`);
    } catch (error) {
      setFilas([]);
      toast.error(error instanceof Error ? error.message : "No se pudo leer el archivo");
    }
  }

  async function importar() {
    if (!sesion?.esDueno && !sesion?.roles.includes("gerente")) {
      toast.error("Solo dueño o gerente pueden importar información.");
      return;
    }
    if (!validas.length) return;
    setProcesando(true);
    let importados = 0;
    let omitidos = sinNombre + duplicadosArchivo;

    try {
      const { data: existentes, error: errorExistentes } = await supabase
        .from("clientes")
        .select("id,nombre,documento")
        .limit(5000);
      if (errorExistentes) throw errorExistentes;

      const documentosExistentes = new Set(
        (existentes ?? []).map((c) => c.documento).filter(Boolean).map((d) => String(d).trim()),
      );
      const nombresExistentes = new Set(
        (existentes ?? []).map((c) => normalizar(String(c.nombre))),
      );
      const vistos = new Set<string>();

      for (const fila of validas) {
        const documento = fila.documento.trim();
        const nombreClave = normalizar(fila.nombre);
        const clave = documento || nombreClave;
        if (
          (documento && documentosExistentes.has(documento)) ||
          nombresExistentes.has(nombreClave) ||
          vistos.has(clave)
        ) {
          omitidos += 1;
          continue;
        }

        const { error } = await supabase.from("clientes").insert({
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
          metadata: {
            origen: "migracion",
            fuente: archivo,
            importado_en: new Date().toISOString(),
          },
        });
        if (error) throw error;
        importados += 1;
        vistos.add(clave);
      }

      setResultado({ importados, omitidos });
      toast.success(`Migración terminada: ${importados} clientes incorporados`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La importación no pudo completarse");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <AppShell
      titulo="Centro de migración"
      subtitulo="Trae la información de tu taller poco a poco, sin detener la operación."
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard etiqueta="Clientes migrados" valor="En sistema" tono="positivo" />
          <StatCard etiqueta="Inventario" valor="Próximo paso" />
          <StatCard etiqueta="Pedidos históricos" valor="Próximo paso" />
          <StatCard etiqueta="Documentos externos" valor="Se conservan" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <Panel titulo="Migrar clientes desde una hoja de cálculo">
            <div className="space-y-5 p-6">
              <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6 text-center">
                <FileSpreadsheet className="mx-auto mb-3 size-9 text-primary" />
                <p className="font-medium">Exporta tu Excel como CSV y súbelo aquí</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Aurum detecta nombres habituales de columnas y prepara una vista previa antes de importar.
                </p>
                <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  <Upload className="size-4" />
                  Elegir archivo
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => void seleccionar(e)}
                  />
                </label>
                {archivo ? <p className="mt-3 text-xs text-muted-foreground">{archivo}</p> : null}
              </div>

              {filas.length ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <StatCard etiqueta="Filas leídas" valor={String(filas.length)} />
                    <StatCard etiqueta="Listas para importar" valor={String(validas.length)} tono="positivo" />
                    <StatCard etiqueta="Duplicadas / incompletas" valor={String(sinNombre + duplicadosArchivo)} tono={sinNombre + duplicadosArchivo ? "negativo" : "neutro"} />
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-surface-muted">
                        <tr>
                          {["Cliente", "Documento", "Teléfono", "WhatsApp", "Email", "Ciudad"].map((h) => (
                            <th key={h} className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filas.slice(0, 20).map((f, i) => (
                          <tr key={`${f.nombre}-${i}`}>
                            <td className="px-4 py-3 font-medium">{f.nombre || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{f.documento || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{f.telefono || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{f.whatsapp || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{f.email || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{f.ciudad || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filas.length > 20 ? <p className="text-xs text-muted-foreground">Mostrando las primeras 20 filas para revisión.</p> : null}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Aurum no elimina ni modifica clientes existentes durante esta migración.
                    </p>
                    <button
                      type="button"
                      onClick={() => void importar()}
                      disabled={procesando || !validas.length}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      <CheckCircle2 className="size-4" />
                      {procesando ? "Importando…" : `Importar ${validas.length} clientes`}
                    </button>
                  </div>
                </>
              ) : null}

              {resultado ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
                  <p className="font-semibold">Migración completada</p>
                  <p className="mt-1 text-muted-foreground">
                    {resultado.importados} clientes incorporados y {resultado.omitidos} filas omitidas por duplicado o datos incompletos.
                  </p>
                </div>
              ) : null}
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel titulo="Ruta de migración">
              <div className="space-y-4 p-6">
                {[
                  ["Clientes", "Primera etapa", Users],
                  ["Inventario", "Siguiente etapa", FileSpreadsheet],
                  ["Pedidos históricos", "Siguiente etapa", History],
                  ["Contratos y documentos", "Se incorporan progresivamente", CheckCircle2],
                ].map(([titulo, detalle, Icon]) => (
                  <div key={titulo as string} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <div className="grid size-9 place-items-center rounded-lg bg-surface-muted">
                      {Icon ? <Icon className="size-4" /> : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{titulo as string}</p>
                      <p className="text-xs text-muted-foreground">{detalle as string}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel titulo="Regla de Aurum">
              <div className="p-6">
                <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Migrar no significa borrar la forma anterior de trabajar. Aurum incorpora la información,
                    conserva el contexto de origen y evita sobrescribir registros existentes.
                  </p>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
