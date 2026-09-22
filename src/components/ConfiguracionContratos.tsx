import { useEffect, useMemo, useState } from "react";
import { FileText, Save } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/lib/auth";

type Identidad = {
  id: string;
  sede_id: string | null;
  nombre_comercial: string;
  razon_social: string | null;
  ruc: string | null;
};

type Clausula = {
  titulo: string;
  contenido: string;
  activa: boolean;
};

type ContenidoContrato = {
  titulo: string;
  subtitulo: string;
  introduccion: string;
  mostrarIdentidad: boolean;
  mostrarCotizacion: boolean;
  mostrarResumenEconomico: boolean;
  mostrarEspecificaciones: boolean;
  mostrarFirmas: boolean;
  etiquetaCliente: string;
  etiquetaRepresentante: string;
  textoAceptacion: string;
  pie: string;
  clausulas: Clausula[];
};

const DEFAULT_CONTENT: ContenidoContrato = {
  titulo: "CONTRATO DE FABRICACIÓN DE JOYERÍA",
  subtitulo: "Documento comercial y de fabricación",
  introduccion:
    "El presente contrato regula la fabricación de la pieza de joyería descrita en la cotización vinculada y establece las condiciones comerciales y de producción acordadas entre las partes.",
  mostrarIdentidad: true,
  mostrarCotizacion: true,
  mostrarResumenEconomico: true,
  mostrarEspecificaciones: true,
  mostrarFirmas: true,
  etiquetaCliente: "CLIENTE",
  etiquetaRepresentante: "TALLER / JOYERÍA",
  textoAceptacion:
    "Las partes declaran haber revisado el contenido del presente contrato y aceptar las condiciones indicadas.",
  pie: "Documento generado por Aurum Lab. La versión firmada se conserva como documento contractual.",
  clausulas: [
    {
      titulo: "1. Objeto",
      contenido:
        "El taller se compromete a fabricar la pieza o conjunto de piezas descrito en la cotización vinculada, respetando las especificaciones comerciales registradas.",
      activa: true,
    },
    {
      titulo: "2. Especificaciones",
      contenido:
        "Las características técnicas, metal, ley, piedras, talla, cantidades, acabados y demás especificaciones forman parte del alcance del trabajo cuando estén registradas en la cotización o sus anexos.",
      activa: true,
    },
    {
      titulo: "3. Precio y pagos",
      contenido:
        "El precio, impuestos, anticipo y saldo se determinan automáticamente a partir de la cotización aprobada y de sus versiones vigentes.",
      activa: true,
    },
    {
      titulo: "4. Producción y entrega",
      contenido:
        "El plazo de producción y la entrega se gestionan conforme a la información comercial registrada. Cualquier modificación posterior deberá quedar registrada antes de generar una nueva versión contractual.",
      activa: true,
    },
    {
      titulo: "5. Cambios y conformidad",
      contenido:
        "Los cambios solicitados por el cliente que alteren materiales, medidas, piedras, acabados, cantidades, precio o plazo deberán documentarse y podrán requerir una nueva versión del contrato.",
      activa: true,
    },
    {
      titulo: "6. Firma y aceptación",
      contenido:
        "La aceptación podrá documentarse mediante firma electrónica manuscrita, firma presencial con dispositivo compatible o mediante la entrega de un documento impreso firmado y posteriormente incorporado al expediente.",
      activa: true,
    },
  ],
};

function clonarDefault() {
  return JSON.parse(JSON.stringify(DEFAULT_CONTENT)) as ContenidoContrato;
}

function normalizarContenido(valor: unknown): ContenidoContrato {
  const base = clonarDefault();
  if (!valor || typeof valor !== "object") return base;
  const v = valor as Partial<ContenidoContrato>;
  return {
    ...base,
    ...v,
    clausulas: Array.isArray(v.clausulas)
      ? v.clausulas.map((c) => ({
          titulo: typeof c?.titulo === "string" ? c.titulo : "Cláusula",
          contenido: typeof c?.contenido === "string" ? c.contenido : "",
          activa: c?.activa !== false,
        }))
      : base.clausulas,
  };
}

export function ConfiguracionContratos() {
  const { data: sesion } = useSesion();
  const [identidades, setIdentidades] = useState<Identidad[]>([]);
  const [identidadId, setIdentidadId] = useState("");
  const [contenido, setContenido] = useState<ContenidoContrato>(() => clonarDefault());
  const [nombre, setNombre] = useState(DEFAULT_CONTENT.titulo);
  const [version, setVersion] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorTabla, setErrorTabla] = useState(false);

  const puedeEditar = Boolean(sesion?.esDueno || sesion?.roles.includes("gerente"));

  async function cargarIdentidades() {
    setCargando(true);
    setErrorTabla(false);
    const { data, error } = await supabase
      .from("identidades_comerciales")
      .select("id,sede_id,nombre_comercial,razon_social,ruc")
      .eq("activa", true)
      .order("nombre_comercial");
    if (error) {
      toast.error(error.message);
      setCargando(false);
      return;
    }
    const filas = (data ?? []) as Identidad[];
    setIdentidades(filas);
    if (!identidadId && filas[0]) setIdentidadId(filas[0].id);
    setCargando(false);
  }

  useEffect(() => {
    if (puedeEditar) void cargarIdentidades();
  }, [puedeEditar]);

  useEffect(() => {
    if (!identidadId) return;
    let activo = true;
    setCargando(true);
    void (async () => {
      const { data, error } = await supabase
        .from("plantillas_contrato")
        .select("id,nombre,version,contenido")
        .eq("identidad_comercial_id", identidadId)
        .maybeSingle();

      if (!activo) return;
      if (error) {
        const missing = error.code === "42P01" || /plantillas_contrato/i.test(error.message ?? "");
        setErrorTabla(missing);
        if (!missing) toast.error(error.message);
        setContenido(clonarDefault());
        setNombre(DEFAULT_CONTENT.titulo);
        setVersion(1);
      } else if (data) {
        setContenido(normalizarContenido(data.contenido));
        setNombre(data.nombre || DEFAULT_CONTENT.titulo);
        setVersion(Number(data.version) || 1);
        setErrorTabla(false);
      } else {
        setContenido(clonarDefault());
        setNombre(DEFAULT_CONTENT.titulo);
        setVersion(1);
        setErrorTabla(false);
      }
      setCargando(false);
    })();
    return () => {
      activo = false;
    };
  }, [identidadId]);

  const identidad = useMemo(
    () => identidades.find((item) => item.id === identidadId) ?? null,
    [identidades, identidadId],
  );

  function cambiarCampo<K extends keyof ContenidoContrato>(campo: K, valor: ContenidoContrato[K]) {
    setContenido((actual) => ({ ...actual, [campo]: valor }));
  }

  function cambiarClausula(index: number, cambios: Partial<Clausula>) {
    setContenido((actual) => ({
      ...actual,
      clausulas: actual.clausulas.map((c, i) => (i === index ? { ...c, ...cambios } : c)),
    }));
  }

  function agregarClausula() {
    setContenido((actual) => ({
      ...actual,
      clausulas: [
        ...actual.clausulas,
        {
          titulo: `${actual.clausulas.length + 1}. Nueva cláusula`,
          contenido: "Escribe aquí la condición comercial que deseas incorporar.",
          activa: true,
        },
      ],
    }));
  }

  function eliminarClausula(index: number) {
    setContenido((actual) => ({
      ...actual,
      clausulas: actual.clausulas.filter((_, i) => i !== index),
    }));
  }

  async function guardar() {
    if (!identidadId) {
      toast.error("Selecciona una identidad comercial.");
      return;
    }
    if (!nombre.trim()) {
      toast.error("La plantilla necesita un nombre.");
      return;
    }
    setGuardando(true);
    const siguienteVersion = version + 1;
    const { error } = await supabase.from("plantillas_contrato").upsert(
      {
        identidad_comercial_id: identidadId,
        nombre: nombre.trim(),
        version: siguienteVersion,
        contenido,
        activa: true,
        updated_by: sesion?.user_id ?? null,
      } as any,
      { onConflict: "identidad_comercial_id" },
    );
    if (error) {
      toast.error(error.message);
    } else {
      setVersion(siguienteVersion);
      toast.success(`Plantilla guardada · versión ${siguienteVersion}`);
    }
    setGuardando(false);
  }

  if (!puedeEditar) return null;

  if (cargando && identidades.length === 0) {
    return <Panel titulo="Personalización del contrato"><div className="p-6 text-sm text-muted-foreground">Cargando configuración…</div></Panel>;
  }

  if (identidades.length === 0) {
    return (
      <Panel titulo="Personalización del contrato">
        <div className="p-6">
          <p className="text-sm font-semibold">No hay identidad comercial activa.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Primero configura el taller o joyería en la identidad comercial de la sede.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <Panel
        titulo="Personalización del contrato"
        accion={
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={guardando || errorTabla}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Save className="size-4" />
            {guardando ? "Guardando…" : "Guardar plantilla"}
          </button>
        }
      >
        <div className="space-y-5 p-5">
          <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Identidad comercial</p>
            <select
              className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              value={identidadId}
              onChange={(e) => setIdentidadId(e.target.value)}
            >
              {identidades.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre_comercial}{item.ruc ? ` · RUC ${item.ruc}` : ""}
                </option>
              ))}
            </select>
            {identidad ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {identidad.razon_social || "Sin razón social"}{identidad.sede_id ? " · plantilla vinculada a su identidad comercial" : ""}
              </p>
            ) : null}
          </div>

          {errorTabla ? (
            <div className="rounded-xl border border-warning/30 bg-warning-soft p-4 text-sm">
              <p className="font-semibold">Falta aplicar la migración de personalización de contratos.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                El código ya está preparado; la tabla debe existir en Supabase antes de guardar.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Nombre interno de la plantilla
              <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-normal" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </label>
            <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
              <b>Versión editable:</b> {version}
              <br />
              Cada guardado crea una nueva versión de configuración. El contrato firmado se mantendrá independiente cuando implementemos su expediente documental.
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Título del contrato
              <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-normal" value={contenido.titulo} onChange={(e) => cambiarCampo("titulo", e.target.value)} />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Subtítulo
              <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-normal" value={contenido.subtitulo} onChange={(e) => cambiarCampo("subtitulo", e.target.value)} />
            </label>
          </div>

          <label className="block text-xs font-semibold text-muted-foreground">
            Introducción
            <textarea className="mt-1 min-h-24 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-normal" value={contenido.introduccion} onChange={(e) => cambiarCampo("introduccion", e.target.value)} />
          </label>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Secciones automáticas</p>
            <p className="mt-1 text-xs text-muted-foreground">Estos datos se tomarán del ERP y no se editarán manualmente dentro del contrato.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {([
                ["mostrarIdentidad", "Identidad del taller / joyería"],
                ["mostrarCotizacion", "Cotización y versión"],
                ["mostrarResumenEconomico", "Precio, impuestos, anticipo y saldo"],
                ["mostrarEspecificaciones", "Especificaciones de la joya"],
                ["mostrarFirmas", "Bloque de firmas"],
              ] as const).map(([campo, etiqueta]) => (
                <label key={campo} className="flex items-center gap-2 rounded-lg border border-border p-3 text-xs">
                  <input
                    type="checkbox"
                    checked={contenido[campo]}
                    onChange={(e) => cambiarCampo(campo, e.target.checked)}
                  />
                  {etiqueta}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Texto de aceptación
              <textarea className="mt-1 min-h-24 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-normal" value={contenido.textoAceptacion} onChange={(e) => cambiarCampo("textoAceptacion", e.target.value)} />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Pie del documento
              <textarea className="mt-1 min-h-24 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-normal" value={contenido.pie} onChange={(e) => cambiarCampo("pie", e.target.value)} />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Etiqueta para el cliente
              <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-normal" value={contenido.etiquetaCliente} onChange={(e) => cambiarCampo("etiquetaCliente", e.target.value)} />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Etiqueta para el taller / joyería
              <input className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-normal" value={contenido.etiquetaRepresentante} onChange={(e) => cambiarCampo("etiquetaRepresentante", e.target.value)} />
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cláusulas</p>
                <p className="mt-1 text-xs text-muted-foreground">Puedes activar, editar, agregar o retirar cláusulas del modelo comercial.</p>
              </div>
              <button type="button" onClick={agregarClausula} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">+ Agregar cláusula</button>
            </div>

            <div className="mt-3 space-y-3">
              {contenido.clausulas.map((clausula, index) => (
                <div key={index} className="rounded-xl border border-border p-4">
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={clausula.activa} onChange={(e) => cambiarClausula(index, { activa: e.target.checked })} className="mt-2" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <input className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold" value={clausula.titulo} onChange={(e) => cambiarClausula(index, { titulo: e.target.value })} />
                      <textarea className="min-h-28 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" value={clausula.contenido} onChange={(e) => cambiarClausula(index, { contenido: e.target.value })} />
                    </div>
                    <button type="button" onClick={() => eliminarClausula(index)} className="text-xs text-destructive hover:underline">Quitar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <FileText className="size-4" />
              <p className="text-sm font-semibold">Datos que quedarán bloqueados al generar el contrato</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Número de contrato, cotización y versión, cliente, identidad comercial, importes, impuestos, anticipo, saldo y especificaciones se tomarán del ERP. La plantilla solo controla el contenido comercial y su presentación.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
