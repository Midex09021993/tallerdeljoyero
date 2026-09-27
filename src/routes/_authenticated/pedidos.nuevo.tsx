// @ts-nocheck -- tipos generados desfasados respecto al esquema real
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronDown, ClipboardList, Factory, ImagePlus, Trash2, Upload, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell, useCapacidadesMenu } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useCrearPedido, usePedidos, useSedes, type PedidoNuevo } from "@/lib/taller-db";
import { useSesion } from "@/lib/auth";
import { toast } from "sonner";
import { nombreSeguro, subirConProgreso } from "@/lib/subir-archivo";

export const Route = createFileRoute("/_authenticated/pedidos/nuevo")({
  head: () => ({ meta: [{ title: "Nuevo pedido — Pedidos" }] }),
  component: NuevoPedido,
});

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function prefijoSede(nombre: string) {
  const palabras = nombre.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/g, "").trim().split(/\s+/).filter(Boolean);
  const primera = palabras[0] ?? "TA";
  const segunda = palabras[1] ?? "";
  return (palabras.length > 1 ? (primera[0] ?? "") + (segunda[0] ?? "") : primera.slice(0, 2)).toUpperCase();
}

function siguienteReferencia(sede: string, refs: string[]) {
  const prefijo = prefijoSede(sede);
  const re = new RegExp(`^${prefijo}-(\\d+)$`, "i");
  const max = refs.reduce((n, ref) => {
    const match = re.exec(ref ?? "");
    return match ? Math.max(n, Number(match[1])) : n;
  }, 0);
  return `${prefijo}-${String(max + 1).padStart(3, "0")}`;
}

const rutas = ["Diseño 3D", "Impresión 3D", "Casting", "Corte Láser", "Taller"];

type ReferenciaClave = "perspectiva" | "superior" | "frontal" | "izquierda";

const referenciasTrabajo: Array<{ clave: ReferenciaClave; etiqueta: string }> = [
  { clave: "perspectiva", etiqueta: "Perspectiva" },
  { clave: "superior", etiqueta: "Superior" },
  { clave: "frontal", etiqueta: "Frontal" },
  { clave: "izquierda", etiqueta: "Izquierda" },
];

const referenciaVisual: Record<ReferenciaClave, string> = {
  perspectiva: "/referencias/perspectiva.svg",
  superior: "/referencias/superior.svg",
  frontal: "/referencias/frontal.svg",
  izquierda: "/referencias/izquierda.svg",
};


function ReferenciaImagen({
  clave,
  etiqueta,
  valor,
  onCambiar,
  onEliminar,
}: {
  clave: ReferenciaClave;
  etiqueta: string;
  valor: { file: File; preview: string } | null;
  onCambiar: (file: File) => void;
  onEliminar: () => void;
}) {
  const inputId = `referencia-${clave}`;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider">{etiqueta}</span>
        {valor ? (
          <button type="button" onClick={onEliminar} className="inline-flex items-center gap-1 text-[10px] font-semibold text-danger hover:underline">
            <Trash2 className="size-3" /> Eliminar
          </button>
        ) : null}
      </div>
      {valor ? (
        <>
          <div className="aspect-[4/3] bg-surface-muted">
            <img src={valor.preview} alt={`Referencia ${etiqueta}`} className="size-full object-contain" />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
            <p className="min-w-0 truncate text-[10px] text-muted-foreground">{valor.file.name}</p>
            <label htmlFor={inputId} className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[10px] font-semibold hover:bg-surface-muted">
              <Upload className="size-3" /> Reemplazar
            </label>
          </div>
        </>
      ) : (
        <label htmlFor={inputId} className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-end gap-1 px-5 pb-5 text-muted-foreground transition hover:bg-surface-muted hover:text-foreground">
          <div className="w-full -mb-1"><img src={referenciaVisual[clave]} alt="" aria-hidden="true" className="h-40 w-full object-contain opacity-80" /></div>
          <span className="grid size-10 place-items-center rounded-xl border border-dashed border-border bg-background">
            <ImagePlus className="size-5" />
          </span>
          <span className="text-xs font-semibold">Subir imagen</span>
          <span className="text-[10px]">Opcional</span>
        </label>
      )}
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.currentTarget.value = "";
          if (file) onCambiar(file);
        }}
      />
    </div>
  );
}

function Campo({ label, value, onChange, placeholder, type = "text", required = false, onBlur }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean; onBlur?: () => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}{required ? " *" : ""}</span>
      <input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder}
        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/10" />
    </label>
  );
}

function NuevoPedido() {
  const navigate = useNavigate();
  const { data: sesion } = useSesion();
  const { data: capacidades = [] } = useCapacidadesMenu(sesion);
  const cotizacionesHabilitadas = capacidades.includes("Cotizaciones");
  const { data: pedidos = [] } = usePedidos();
  const { data: sedes = [] } = useSedes();
  const crear = useCrearPedido();
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [clienteBusquedaDebounced, setClienteBusquedaDebounced] = useState("");
  useEffect(() => {
    const termino = clienteBusqueda.trim();
    const timer = window.setTimeout(() => setClienteBusquedaDebounced(termino), 250);
    return () => window.clearTimeout(timer);
  }, [clienteBusqueda]);

  const { data: clientes = [] } = useQuery({
    queryKey: ["pedidos-nuevo-clientes", clienteBusquedaDebounced],
    enabled: clienteBusquedaDebounced.length >= 2,
    queryFn: async () => {
      const termino = clienteBusquedaDebounced.replace(/[%_,]/g, "");
      const patron = "%" + termino + "%";
      const { data, error } = await supabase
        .from("clientes")
        .select("id,nombre,telefono,ciudad")
        .eq("estado", "activo")
        .or("nombre.ilike." + patron + ",telefono.ilike." + patron)
        .order("nombre")
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [clienteId, setClienteId] = useState("");
  const [cotizacionId, setCotizacionId] = useState("");
  const [tipoOperacion, setTipoOperacion] = useState<"fabricacion" | "reparacion" | "venta_stock">("fabricacion");
  const [sedeId, setSedeId] = useState(sesion?.perfil.sede_id ?? sedes[0]?.id ?? "");
  const { data: cotizacionesCliente = [], isFetching: buscandoCotizaciones } = useQuery({
    queryKey: ["pedidos-nuevo-cotizaciones", clienteId, sedeId],
    enabled: Boolean(clienteId && sedeId && cotizacionesHabilitadas),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotizaciones")
        .select("id,numero,version,total,moneda,sede_id,estado,proyecto_joya_id")
        .eq("cliente_id", clienteId)
        .eq("sede_id", sedeId)
        .eq("estado", "aprobada")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const [form, setForm] = useState({
    cliente: "", telefono: "", trabajo: "", material: "", talla: "", piedras: "",
    peso_estimado: "", cantidad_piezas: "1", fecha_ingreso: hoy(), fecha_entrega: "",
    origen: "", contrato: "", cotizacion_numero: "", importe_directo: "", a_cuenta: "", notas: "",
  });
  const [rutaProduccion, setRutaProduccion] = useState<string[]>([]);
  const [referenciasAbiertas, setReferenciasAbiertas] = useState(false);
  const [referencias, setReferencias] = useState<Record<ReferenciaClave, { file: File; preview: string } | null>>({
    perspectiva: null,
    superior: null,
    frontal: null,
    izquierda: null,
  });

  const sede = sedes.find((s) => s.id === sedeId);

  const { data: capacidadesSedeRuta = [], error: capacidadesSedeRutaError } = useQuery({
    queryKey: ["pedidos-nuevo-capacidades-sede", sedeId],
    enabled: Boolean(sesion?.esAdmin && sedeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sede_especialidades")
        .select("especialidad_id, especialidades!inner(nombre,categoria)")
        .eq("sede_id", sedeId)
        .eq("especialidades.categoria", "Producción");
      if (error) throw error;
      return (data ?? [])
        .map((row: any) => Array.isArray(row.especialidades) ? row.especialidades[0]?.nombre : row.especialidades?.nombre)
        .filter(Boolean);
    },
  });

  const { data: capacidadesExternasRuta = {}, error: capacidadesExternasRutaError } = useQuery({
    queryKey: ["pedidos-nuevo-ruta-capacidades-externas", sedeId],
    enabled: Boolean(sesion?.esAdmin && sedeId),
    queryFn: async () => {
      const resultados = await Promise.all(
        rutas.map(async (area) => {
          const { data, error } = await supabase.rpc("listar_participantes_servicio", {
            _area: area,
          });
          if (error) throw error;
          return [area, data ?? []] as const;
        }),
      );
      return Object.fromEntries(resultados);
    },
  });

  const capacidadesInternasRuta = useMemo(
    () => rutas.filter((area) => (capacidadesSedeRuta as string[]).some((nombre) => String(nombre).trim().toLowerCase() === area.trim().toLowerCase())),
    [capacidadesSedeRuta],
  );

  const rutasDisponibles = rutas.filter((area) =>
    capacidadesInternasRuta.includes(area) || (capacidadesExternasRuta[area] ?? []).length > 0,
  );

  const cotizacionSeleccionada = cotizacionesCliente.find((cotizacion) => cotizacion.id === cotizacionId) ?? null;
  const origenComercial: "directo" | "cotizacion" = cotizacionSeleccionada ? "cotizacion" : "directo";
  const totalComercial = cotizacionSeleccionada
    ? Math.max(0, Number(cotizacionSeleccionada.total) || 0)
    : Math.max(0, Number(form.importe_directo) || 0);
  const anticipoComercial = Math.max(0, Number(form.a_cuenta) || 0);
  const saldoComercial = Math.max(0, totalComercial - anticipoComercial);
  const clientePredictivo = useMemo(() => {
    const termino = clienteBusqueda.trim().toLowerCase();
    if (termino.length < 2 || clienteId || !clientes.length) return null;

    const exacto = clientes.find((cliente) =>
      [cliente.nombre, cliente.telefono]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase() === termino),
    );
    if (exacto) return exacto;

    return clientes.length === 1 ? clientes[0] : null;
  }, [clienteBusqueda, clienteId, clientes]);

  const hayVariasCoincidencias = !clienteId && clienteBusqueda.trim().length >= 2 && clientes.length > 1;
  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    setCotizacionId("");
    set("contrato", "");
  }, [sedeId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!sesion?.esAdmin) {
      toast.error("No tienes permisos para registrar pedidos.");
      return;
    }
    if (!sedeId) {
      toast.error("Selecciona el taller donde se recibe el pedido.");
      return;
    }
    if (!form.trabajo.trim()) {
      toast.error("Indica qué joya o trabajo se está recibiendo.");
      return;
    }
    if (origenComercial === "cotizacion" && !cotizacionSeleccionada) {
      toast.error("Selecciona una cotización aprobada para que el origen comercial quede registrado automáticamente.");
      return;
    }
    if (origenComercial === "directo" && totalComercial <= 0) {
      toast.error("Ingresa el precio total acordado.");
      return;
    }
    if (anticipoComercial > totalComercial) {
      toast.error("El anticipo no puede ser mayor que el precio total.");
      return;
    }

    const nuevo: PedidoNuevo = {
      referencia: siguienteReferencia(sede?.nombre ?? "Taller", pedidos.map((p) => p.referencia)),
      pieza: form.trabajo.trim(),
      trabajo: form.trabajo.trim(),
      cliente: form.cliente.trim() || "Cliente pendiente de registrar",
      cliente_id: clienteId || null,
      contrato_id: null,
      cotizacion_id: cotizacionId || null,
      proyecto_joya_id: cotizacionSeleccionada?.proyecto_joya_id ?? null,
      material: form.material.trim(),
      estado: "Recibido",
      entrega: form.fecha_entrega || "",
      // Cotización: el importe proviene del documento aprobado.
      // Venta directa: el precio se captura una sola vez y el ERP crea el documento financiero.
      // Precio pendiente: el pedido existe sin saldo financiero hasta definir el precio.
      importe: totalComercial,
      a_cuenta: anticipoComercial,
      saldo: saldoComercial,
      sede_id: sedeId,
      telefono: form.telefono.trim(),
      origen: form.origen.trim(),
      contrato: form.contrato.trim(),
      fecha_ingreso: form.fecha_ingreso || hoy(),
      fecha_entrega: form.fecha_entrega || null,
      area_actual: "Pedidos",
      ruta: rutaProduccion,
      notas: form.notas.trim(),
      talla: form.talla.trim(),
      cantidad_piezas: Math.max(1, Number(form.cantidad_piezas) || 1),
      piedras: form.piedras.trim(),
      peso_estimado: form.peso_estimado.trim(),
      especificaciones_comerciales: form.cotizacion_numero.trim()
        ? { referencia_cotizacion_externa: form.cotizacion_numero.trim() }
        : {},
    };

    try {
      let clienteFinalId = clienteId || null;

      if (!clienteFinalId && form.cliente.trim()) {
        const nombreCliente = form.cliente.trim();
        const telefonoCliente = form.telefono.trim();
        const ciudadCliente = form.origen.trim();

        let clienteExistente = null;
        if (telefonoCliente) {
          const { data, error } = await supabase
            .from("clientes")
            .select("id,nombre,telefono,ciudad")
            .eq("sede_id", sedeId)
            .eq("estado", "activo")
            .eq("telefono", telefonoCliente)
            .limit(1)
            .maybeSingle();
          if (error) throw error;
          clienteExistente = data;
        } else {
          const { data, error } = await supabase
            .from("clientes")
            .select("id,nombre,telefono,ciudad")
            .eq("sede_id", sedeId)
            .eq("estado", "activo")
            .ilike("nombre", nombreCliente)
            .limit(2);
          if (error) throw error;
          clienteExistente = data?.length === 1 ? data[0] : null;
        }

        if (clienteExistente) {
          clienteFinalId = clienteExistente.id;
          set("cliente", clienteExistente.nombre);
          set("telefono", clienteExistente.telefono ?? telefonoCliente);
          set("origen", clienteExistente.ciudad ?? ciudadCliente);
        } else {
          const { data: clienteNuevo, error: errorCliente } = await supabase
            .from("clientes")
            .insert({
              sede_id: sedeId,
              nombre: nombreCliente,
              telefono: telefonoCliente || null,
              ciudad: ciudadCliente || null,
              estado: "activo",
            })
            .select("id,nombre,telefono,ciudad")
            .single();

          if (errorCliente) throw errorCliente;
          clienteFinalId = clienteNuevo.id;
        }
      }

      nuevo.cliente_id = clienteFinalId;

      const resultado = await crear.mutateAsync(nuevo);
      const referenciasSubidas: string[] = [];
      try {
        for (const referencia of referenciasTrabajo) {
          const seleccion = referencias[referencia.clave];
          if (!seleccion) continue;

          const rutaArchivo = `${resultado.id}/referencias/${referencia.clave}-${Date.now()}-${nombreSeguro(seleccion.file.name)}`;
          await subirConProgreso({
            bucket: "pedidos",
            ruta: rutaArchivo,
            file: seleccion.file,
          });
          const { error: errorArchivo } = await supabase.from("pedido_archivos").insert({
            pedido_id: resultado.id,
            tipo: "referencia_diseno_3d",
            nombre: seleccion.file.name,
            url: rutaArchivo,
            es_enlace: false,
            grupo: referencia.clave,
            version: 1,
          });
          if (errorArchivo) {
            await supabase.storage.from("pedidos").remove([rutaArchivo]);
            throw errorArchivo;
          }
          referenciasSubidas.push(rutaArchivo);
        }
      } catch (errorArchivos) {
        if (referenciasSubidas.length) {
          await supabase.storage.from("pedidos").remove(referenciasSubidas);
        }
        await supabase
          .from("pedido_archivos")
          .delete()
          .eq("pedido_id", resultado.id)
          .eq("tipo", "referencia_diseno_3d");
        toast.warning(
          `Pedido ${resultado?.referencia ?? nuevo.referencia} creado, pero no se pudieron guardar todas las referencias: ${errorArchivos instanceof Error ? errorArchivos.message : "error de archivos"}`,
        );
      }
      toast.success(`Pedido ${resultado?.referencia ?? nuevo.referencia} creado correctamente.`);
      navigate({ to: "/pedidos/$id", params: { id: resultado.id } });
    } catch (error) {
      const detalle = error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null
          ? [
              "message" in error ? String(error.message ?? "") : "",
              "details" in error ? String(error.details ?? "") : "",
              "hint" in error ? String(error.hint ?? "") : "",
              "code" in error ? `Código ${String(error.code ?? "")}` : "",
            ].filter(Boolean).join(" · ")
          : String(error ?? "Error desconocido");
      toast.error(detalle || "No se pudo crear el pedido.");
    }
  };

  if (!sesion?.esAdmin) {
    return <AppShell titulo="Nuevo pedido" subtitulo="Permisos"><div className="rounded-2xl border border-warning/30 bg-warning-soft p-6 text-sm">Solo un usuario con rol de dueño o gerente puede registrar un pedido.</div></AppShell>;
  }

  return (
    <AppShell titulo="Nuevo pedido" subtitulo="Registrar una joya desde recepción y dejarla lista para su recorrido operativo"
      acciones={<button type="button" onClick={() => navigate({ to: "/pedidos" })} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold"><ArrowLeft className="size-4" /> Volver a Pedidos</button>}>
      <form onSubmit={submit} className="mx-auto max-w-6xl">
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <section className="rounded-[24px] border border-border bg-card p-5 shadow-card sm:p-6">
              <div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-gold/10 text-gold"><ClipboardList className="size-5" /></span><div><h2 className="text-base font-semibold">Identificación del pedido</h2><p className="mt-1 text-xs text-muted-foreground">Define qué joya entra al sistema y a quién pertenece.</p></div></div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><label className="block"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cliente</span><input value={clienteBusqueda || form.cliente} onChange={(e) => { setClienteBusqueda(e.target.value); set("cliente", e.target.value); setClienteId(""); setCotizacionId(""); set("contrato", ""); }} placeholder="Buscar por nombre o teléfono" className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/10" /></label>
  {!clienteId && clienteBusqueda.trim().length >= 2 ? <div className="mt-1 min-h-5 text-[11px]">
    {clientePredictivo ? <button type="button" onClick={async () => {
        setClienteId(clientePredictivo.id);
        set("cliente", clientePredictivo.nombre);
        set("telefono", clientePredictivo.telefono ?? "");
        set("origen", clientePredictivo.ciudad ?? "");
        setClienteBusqueda("");
      }} className="text-left text-muted-foreground transition hover:text-foreground">
      <span className="font-medium text-foreground">Coincidencia:</span> {clientePredictivo.nombre}{clientePredictivo.telefono ? <span className="ml-2 opacity-70">{clientePredictivo.telefono}</span> : null}
    </button> : hayVariasCoincidencias ? <span className="text-muted-foreground">Hay varias coincidencias. Continúa escribiendo para precisar.</span> : null}
  </div> : null}</div>
                <Campo label="Origen / lugar" value={form.origen} onChange={(v) => set("origen", v)} placeholder="Ej. Lima, Trujillo, Arequipa o Colombia…" />
                <Campo label="Descripción del trabajo / joya" value={form.trabajo} onChange={(v) => set("trabajo", v)} placeholder="Ej. Anillo de compromiso" required />
                <Campo label="Peso" value={form.peso_estimado} onChange={(v) => set("peso_estimado", v)} placeholder="Ej. 4.20 g" />
                <Campo label="Material" value={form.material} onChange={(v) => set("material", v)} placeholder="Ej. Oro 18K amarillo" />
                <Campo label="Piedras" value={form.piedras} onChange={(v) => set("piedras", v)} placeholder="Diamantes, zafiros…" />
                <Campo label="Talla / medida" value={form.talla} onChange={(v) => set("talla", v)} placeholder="Ej. 18" />
                <Campo label="Cantidad" value={form.cantidad_piezas} onChange={(v) => set("cantidad_piezas", v)} type="number" placeholder="1" />
                <Campo label="Teléfono" value={form.telefono} onChange={(v) => set("telefono", v)} placeholder="Contacto" />
              </div>
            </section>

            <section className="rounded-[24px] border border-border bg-card p-5 shadow-card sm:p-6">
              <div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-gold/10 text-gold"><Factory className="size-5" /></span><div><h2 className="text-base font-semibold">Ruta de producción</h2><p className="mt-1 text-xs text-muted-foreground">Selecciona el recorrido previsto para este pedido.</p></div></div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {rutas.map((area) => {
                  const activa = rutaProduccion.includes(area);
                  const interna = capacidadesInternasRuta.includes(area);
                  const externa = (capacidadesExternasRuta[area] ?? []).length > 0;
                  const disponible = rutasDisponibles.includes(area);
                  return <label key={area} className={`${activa ? "flex cursor-pointer items-center gap-3 rounded-xl border border-gold/50 bg-gold/5 px-4 py-3" : disponible ? "flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 hover:bg-surface-muted" : "flex cursor-not-allowed items-center gap-3 rounded-xl border border-border bg-surface-muted px-4 py-3 opacity-50"}`}>
                    <input type="checkbox" disabled={!disponible && !activa} checked={activa} onChange={() => setRutaProduccion((actual) => activa ? actual.filter((x) => x !== area) : [...actual, area])} className="size-4 accent-gold" />
                    <span>
                      <span className="block text-sm font-semibold">{area}</span>
                      <span className="block text-[9px] text-muted-foreground">{interna && externa ? "Interna + externa" : interna ? "Capacidad interna" : externa ? "Servicio externo disponible" : "Sin capacidad disponible"}</span>
                    </span>
                  </label>;
                })}
              </div>
              {capacidadesSedeRutaError || capacidadesExternasRutaError ? <p className="mt-3 rounded-xl border border-danger/20 bg-danger/5 p-3 text-xs text-danger">No se pudieron consultar todas las capacidades disponibles para la ruta.</p> : null}
              {!capacidadesSedeRutaError && !capacidadesExternasRutaError && rutasDisponibles.length === 0 ? <p className="mt-3 rounded-xl border border-warning/20 bg-warning-soft/50 p-3 text-xs text-warning">La sede no tiene capacidades internas ni servicios externos disponibles para esta ruta.</p> : null}
            </section>

            <section className="rounded-[24px] border border-border bg-card p-5 shadow-card sm:p-6">
              <h2 className="text-base font-semibold">Fechas y documentación</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Campo label="Fecha de ingreso" value={form.fecha_ingreso} onChange={(v) => set("fecha_ingreso", v)} type="date" required />
                <Campo label="Fecha prometida de entrega" value={form.fecha_entrega} onChange={(v) => set("fecha_entrega", v)} type="date" />
              </div>
              <label className="mt-4 block"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notas de recepción</span><textarea value={form.notas} onChange={(e) => set("notas", e.target.value)} rows={4} placeholder="Detalles importantes para fabricación o atención al cliente…" className="mt-1.5 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-gold/50" /></label>
            </section>

         <section className="rounded-[24px] border border-border bg-card shadow-card">
              <button type="button" onClick={() => setReferenciasAbiertas((actual) => !actual)} className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6" aria-expanded={referenciasAbiertas}>
                <div className="flex items-start gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-gold/10 text-gold"><ImagePlus className="size-5" /></span>
                <div>
                  <h2 className="text-base font-semibold">Referencias del trabajo</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Opcional. Imágenes que sirven como referencia para Diseño 3D.</p>
                </div>
                </div>
                <ChevronDown className={`size-5 shrink-0 text-muted-foreground transition-transform ${referenciasAbiertas ? "rotate-180" : ""}`} />
              </button>
              {referenciasAbiertas ? (
                <div className="border-t border-border px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
                  <div className="grid gap-3 sm:grid-cols-2">
                {referenciasTrabajo.map((referencia) => (
                  <ReferenciaImagen
                    key={referencia.clave}
                    clave={referencia.clave}
                    etiqueta={referencia.etiqueta}
                    valor={referencias[referencia.clave]}
                    onCambiar={(file) => {
                      const anterior = referencias[referencia.clave];
                      if (anterior) URL.revokeObjectURL(anterior.preview);
                      setReferencias((actual) => ({
                        ...actual,
                        [referencia.clave]: { file, preview: URL.createObjectURL(file) },
                      }));
                    }}
                    onEliminar={() => {
                      const anterior = referencias[referencia.clave];
                      if (anterior) URL.revokeObjectURL(anterior.preview);
                      setReferencias((actual) => ({ ...actual, [referencia.clave]: null }));
                    }}
                  />
                ))}
                  </div>
                </div>
              ) : null}
            </section>



            
          </div>

          <aside className="space-y-4">
            <section className="rounded-[24px] border border-gold/20 bg-card p-5 shadow-card">
              <div className="flex items-start gap-3"><UserRound className="mt-0.5 size-5 text-gold" /><div><h2 className="text-sm font-semibold">Taller responsable</h2><p className="mt-1 text-xs text-muted-foreground">La sede queda asociada al pedido desde su creación.</p></div></div>
              <select value={sedeId} onChange={(e) => setSedeId(e.target.value)} className="mt-4 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/50"><option value="">Seleccionar taller</option>{sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}{s.ciudad ? ` · ${s.ciudad}` : ""}</option>)}</select>
            </section>

            <section className="rounded-[24px] border border-border bg-card p-5 shadow-card">
              <h2 className="text-sm font-semibold">Condición comercial</h2>
              <p className="mt-1 text-xs text-muted-foreground">Registra el precio acordado y el anticipo. El saldo se calcula automáticamente.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Campo label="N° contrato (opcional)" value={form.contrato} onChange={(v) => set("contrato", v)} placeholder="Ej. CTR-2026-0001" />
                <Campo label="N° cotización (referencia externa, opcional)" value={form.cotizacion_numero} onChange={(v) => set("cotizacion_numero", v)} placeholder="Ej. COT-EXT-2026-0001" />
                <Campo label="Precio total" value={form.importe_directo} onChange={(v) => set("importe_directo", v)} placeholder="0.00" type="number" required />
                <Campo label="Anticipo" value={form.a_cuenta} onChange={(v) => set("a_cuenta", v)} placeholder="0.00" type="number" />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-surface-muted p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo pendiente</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">S/ {saldoComercial.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-muted p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Estado de pago</p>
                  <p className="mt-1 text-sm font-semibold">{totalComercial > 0 && saldoComercial <= 0 ? "Pagado" : anticipoComercial > 0 ? "Pago parcial" : "Pendiente"}</p>
                </div>
              </div>
            </section>
            <button disabled={crear.isPending} type="submit" className="w-full rounded-2xl bg-gold px-4 py-3.5 text-sm font-bold text-gold-foreground shadow-raised disabled:cursor-not-allowed disabled:opacity-50">{crear.isPending ? "Creando pedido…" : "Crear pedido"}</button>
            <p className="px-2 text-center text-[11px] leading-5 text-muted-foreground">Al crear, el pedido queda en <strong>Recibido</strong>, asociado al taller y visible inmediatamente en Pedidos.</p>
          </aside>
        </div>
      </form>
    </AppShell>
  );
}
