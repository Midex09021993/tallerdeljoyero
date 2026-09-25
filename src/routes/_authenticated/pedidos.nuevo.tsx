import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronDown, ClipboardList, Factory, ImagePlus, Trash2, Upload, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
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

function BocetoReferencia({ clave }: { clave: ReferenciaClave }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (clave === "superior") {
    return (
      <svg viewBox="0 0 240 150" aria-hidden="true" className="h-28 w-full text-muted-foreground/20">
        <ellipse cx="120" cy="82" rx="32" ry="28" {...common} />
        <ellipse cx="120" cy="82" rx="25" ry="22" {...common} />
        <path d="M88 72 C65 66 47 66 29 72 M88 92 C65 98 47 98 29 92 M152 72 C175 66 193 66 211 72 M152 92 C175 98 193 98 211 92" {...common} />
        <path d="M120 54 V110 M92 82 H148" {...common} strokeDasharray="3 4" />
        <circle cx="120" cy="82" r="7" {...common} />
        <path d="M115 77 L120 72 L125 77 L120 82 Z" {...common} />
      </svg>
    );
  }

  if (clave === "frontal") {
    return (
      <svg viewBox="0 0 240 150" aria-hidden="true" className="h-28 w-full text-muted-foreground/20">
        <path d="M72 113 C76 83 87 60 120 60 C153 60 164 83 168 113" {...common} />
        <ellipse cx="120" cy="113" rx="48" ry="27" {...common} />
        <path d="M97 61 L105 38 L120 29 L135 38 L143 61 M105 38 L120 48 L135 38" {...common} />
        <path d="M120 29 V123 M55 113 H185" {...common} strokeDasharray="3 4" />
        <circle cx="120" cy="38" r="10" {...common} />
        <path d="M113 38 L120 31 L127 38 L120 45 Z" {...common} />
      </svg>
    );
  }

  if (clave === "izquierda") {
    return (
      <svg viewBox="0 0 240 150" aria-hidden="true" className="h-28 w-full text-muted-foreground/20">
        <path d="M105 116 C101 94 101 72 111 58 C116 51 124 51 129 58 C139 72 139 94 135 116" {...common} />
        <path d="M111 58 L113 34 L120 27 L127 34 L129 58" {...common} />
        <path d="M101 116 C112 121 128 121 139 116" {...common} />
        <path d="M120 20 V128 M84 116 H156" {...common} strokeDasharray="3 4" />
        <circle cx="120" cy="34" r="8" {...common} />
        <path d="M115 34 L120 29 L125 34 L120 39 Z" {...common} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 240 150" aria-hidden="true" className="h-28 w-full text-muted-foreground/20">
      <ellipse cx="119" cy="104" rx="45" ry="25" transform="rotate(-18 119 104)" {...common} />
      <path d="M82 91 C89 71 99 50 119 44 C140 38 157 50 163 68" {...common} />
      <path d="M97 83 C103 67 111 55 121 52 C132 49 142 56 146 66" {...common} />
      <path d="M119 44 L112 31 L120 22 L133 27 L139 40" {...common} />
      <circle cx="123" cy="31" r="11" {...common} />
      <path d="M116 31 L123 24 L130 31 L123 38 Z" {...common} />
      <path d="M119 18 V126 M63 104 H174" {...common} strokeDasharray="3 4" />
    </svg>
  );
}

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
        <label htmlFor={inputId} className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-end gap-2 px-5 pb-6 text-muted-foreground transition hover:bg-surface-muted hover:text-foreground">
          <BocetoReferencia clave={clave} />
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

function Campo({ label, value, onChange, placeholder, type = "text", required = false }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}{required ? " *" : ""}</span>
      <input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/10" />
    </label>
  );
}

function NuevoPedido() {
  const navigate = useNavigate();
  const { data: sesion } = useSesion();
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
  const [contratoId, setContratoId] = useState("");
  const { data: contratosCliente = [], isFetching: buscandoContratos } = useQuery({
    queryKey: ["pedidos-nuevo-contratos", clienteId],
    enabled: Boolean(clienteId),
    queryFn: async () => {
      const { data: cotizacionesCliente, error: errorCotizaciones } = await supabase
        .from("cotizaciones")
        .select("id")
        .eq("cliente_id", clienteId);
      if (errorCotizaciones) throw errorCotizaciones;
      const cotizacionIds = (cotizacionesCliente ?? []).map((c) => c.id);
      if (!cotizacionIds.length) return [];
      const { data, error } = await supabase
        .from("contratos")
        .select("id,numero,origen,cotizacion_id")
        .in("cotizacion_id", cotizacionIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const [sedeId, setSedeId] = useState(sesion?.perfil.sede_id ?? sedes[0]?.id ?? "");
  const [form, setForm] = useState({
    cliente: "", telefono: "", trabajo: "", material: "", talla: "", piedras: "",
    peso_estimado: "", cantidad_piezas: "1", fecha_ingreso: hoy(), fecha_entrega: "",
    importe: "", a_cuenta: "", origen: "", contrato: "", notas: "",
  });
  const [ruta, setRuta] = useState<string[]>([]);
  const [referenciasAbiertas, setReferenciasAbiertas] = useState(false);
  const [referencias, setReferencias] = useState<Record<ReferenciaClave, { file: File; preview: string } | null>>({
    perspectiva: null,
    superior: null,
    frontal: null,
    izquierda: null,
  });

  const sede = sedes.find((s) => s.id === sedeId);
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

  useEffect(() => {
    // La búsqueda de contratos solo debe controlar el campo cuando
    // realmente se ha seleccionado un cliente existente. Para un cliente
    // nuevo, la referencia de contrato es completamente manual y no debe
    // ser borrada por el estado inicial de la consulta.
    if (!clienteId) return;

    if (contratosCliente.length === 1) {
      const contrato = contratosCliente[0];
      if (contrato) {
        setContratoId(contrato.id);
        set("contrato", contrato.numero);
      }
    } else if (!contratosCliente.length && !buscandoContratos) {
      setContratoId("");
    }
  }, [clienteId, contratosCliente, buscandoContratos]);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const toggleRuta = (area: string) => setRuta((actual) => actual.includes(area) ? actual.filter((x) => x !== area) : [...actual, area]);

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
    if (!ruta.length) {
      toast.error("Selecciona al menos un área de la ruta.");
      return;
    }

    const nuevo: PedidoNuevo = {
      referencia: siguienteReferencia(sede?.nombre ?? "Taller", pedidos.map((p) => p.referencia)),
      pieza: form.trabajo.trim(),
      trabajo: form.trabajo.trim(),
      cliente: form.cliente.trim() || "Cliente pendiente de registrar",
      cliente_id: clienteId || null,
      contrato_id: contratoId || null,
      material: form.material.trim(),
      estado: "Recibido",
      entrega: form.fecha_entrega || "",
      importe: Number(form.importe) || 0,
      a_cuenta: Number(form.a_cuenta) || 0,
      sede_id: sedeId,
      telefono: form.telefono.trim(),
      origen: form.origen.trim(),
      contrato: form.contrato.trim(),
      fecha_ingreso: form.fecha_ingreso || hoy(),
      fecha_entrega: form.fecha_entrega || null,
      area_actual: "Pedidos",
      ruta,
      notas: form.notas.trim(),
      talla: form.talla.trim(),
      cantidad_piezas: Math.max(1, Number(form.cantidad_piezas) || 1),
      piedras: form.piedras.trim(),
      peso_estimado: form.peso_estimado.trim(),
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
      toast.error(error instanceof Error ? error.message : "No se pudo crear el pedido.");
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
                <div className="sm:col-span-2"><label className="block"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cliente</span><input value={clienteBusqueda || form.cliente} onChange={(e) => { setClienteBusqueda(e.target.value); set("cliente", e.target.value); setClienteId(""); setContratoId(""); set("contrato", ""); }} placeholder="Buscar por nombre o teléfono" className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/10" /></label>
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
  <div className="sm:col-span-2">
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contrato</span>
      {clienteId && contratosCliente.length > 0 ? (
        <select
          value={contratoId || ""}
          onChange={(e) => {
            const id = e.target.value;
            setContratoId(id);
            const contrato = contratosCliente.find((item) => item.id === id);
            set("contrato", contrato?.numero ?? "");
          }}
          className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/50"
        >
          <option value="">Sin contrato previo</option>
          {contratosCliente.map((contrato) => <option key={contrato.id} value={contrato.id}>{contrato.numero}{contrato.origen ? ` · ${contrato.origen}` : ""}</option>)}
        </select>
      ) : (
        <input
          value={form.contrato}
          onChange={(e) => { set("contrato", e.target.value); setContratoId(""); }}
          placeholder={clienteId ? (buscandoContratos ? "Puedes escribir una referencia mientras comprobamos contratos…" : "Escribir referencia de contrato") : "Escribir referencia de contrato"}
          className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/10"
        />
      )}
    </label>
    {clienteId && contratosCliente.length > 0 ? <p className="mt-1 text-[10px] text-muted-foreground">Contrato vinculado previamente al cliente.</p> : null}
  </div>
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
              <div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-gold/10 text-gold"><Factory className="size-5" /></span><div><h2 className="text-base font-semibold">Ruta de fabricación</h2><p className="mt-1 text-xs text-muted-foreground">Selecciona las áreas que deberán intervenir en esta joya.</p></div></div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{rutas.map((area) => <button key={area} type="button" onClick={() => toggleRuta(area)} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left text-xs font-semibold ${ruta.includes(area) ? "border-gold bg-gold/10 text-foreground" : "border-border bg-background text-muted-foreground hover:bg-surface-muted"}`}><span>{area}</span>{ruta.includes(area) ? <Check className="size-4 text-gold" /> : null}</button>)}</div>
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



            <section className="rounded-[24px] border border-border bg-card p-5 shadow-card sm:p-6">
              <h2 className="text-base font-semibold">Fechas y documentación</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Campo label="Fecha de ingreso" value={form.fecha_ingreso} onChange={(v) => set("fecha_ingreso", v)} type="date" required />
                <Campo label="Fecha prometida de entrega" value={form.fecha_entrega} onChange={(v) => set("fecha_entrega", v)} type="date" />
                <Campo label="Origen de captación" value={form.origen} onChange={(v) => set("origen", v)} placeholder="Web, tienda, referido…" />
              </div>
              <label className="mt-4 block"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notas de recepción</span><textarea value={form.notas} onChange={(e) => set("notas", e.target.value)} rows={4} placeholder="Detalles importantes para fabricación o atención al cliente…" className="mt-1.5 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-gold/50" /></label>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-[24px] border border-gold/20 bg-card p-5 shadow-card">
              <div className="flex items-start gap-3"><UserRound className="mt-0.5 size-5 text-gold" /><div><h2 className="text-sm font-semibold">Taller responsable</h2><p className="mt-1 text-xs text-muted-foreground">La sede queda asociada al pedido desde su creación.</p></div></div>
              <select value={sedeId} onChange={(e) => setSedeId(e.target.value)} className="mt-4 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/50"><option value="">Seleccionar taller</option>{sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}{s.ciudad ? ` · ${s.ciudad}` : ""}</option>)}</select>
            </section>

            <section className="rounded-[24px] border border-border bg-card p-5 shadow-card">
              <h2 className="text-sm font-semibold">Condición comercial</h2>
              <div className="mt-4 space-y-4">
                <Campo label="Importe de venta" value={form.importe} onChange={(v) => set("importe", v)} type="number" placeholder="0.00" />
                <Campo label="A cuenta" value={form.a_cuenta} onChange={(v) => set("a_cuenta", v)} type="number" placeholder="0.00" />
              </div>
              <div className="mt-4 rounded-xl bg-surface-muted p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo inicial</p><p className="mt-1 text-lg font-semibold">S/ {Math.max((Number(form.importe) || 0) - (Number(form.a_cuenta) || 0), 0).toFixed(2)}</p></div>
            </section>

            <button disabled={crear.isPending} type="submit" className="w-full rounded-2xl bg-gold px-4 py-3.5 text-sm font-bold text-gold-foreground shadow-raised disabled:cursor-not-allowed disabled:opacity-50">{crear.isPending ? "Creando pedido…" : "Crear pedido"}</button>
            <p className="px-2 text-center text-[11px] leading-5 text-muted-foreground">Al crear, el pedido queda en <strong>Recibido</strong>, asociado al taller y visible inmediatamente en Pedidos.</p>
          </aside>
        </div>
      </form>
    </AppShell>
  );
}
