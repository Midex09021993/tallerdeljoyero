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
  const line = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.35,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const fine = { ...line, strokeWidth: 0.95, opacity: 0.82 };
  const guide = { ...line, strokeWidth: 0.75, strokeDasharray: "3 4", opacity: 0.48 };

  const piedra = (cx: number, cy: number, r: number) => (
    <g>
      <circle cx={cx} cy={cy} r={r} {...line} />
      <circle cx={cx} cy={cy} r={r * 0.82} {...fine} />
      <path d={`M ${cx-r*0.82} ${cy} L ${cx} ${cy-r*0.82} L ${cx+r*0.82} ${cy} L ${cx} ${cy+r*0.82} Z`} {...fine} />
      <path d={`M ${cx-r*0.55} ${cy-r*0.55} L ${cx} ${cy+r*0.82} L ${cx+r*0.55} ${cy-r*0.55}`} {...fine} />
      <path d={`M ${cx-r*0.55} ${cy+r*0.55} L ${cx} ${cy-r*0.82} L ${cx+r*0.55} ${cy+r*0.55}`} {...fine} />
    </g>
  );

  if (clave === "superior") {
    return (
      <svg viewBox="0 0 280 170" aria-hidden="true" className="h-40 w-full text-muted-foreground/30">
        <path d="M68 80 C48 73 31 72 17 76 M68 96 C48 103 31 104 17 100 M212 80 C232 73 249 72 263 76 M212 96 C232 103 249 104 263 100" {...fine} />
        <path d="M69 76 C91 67 105 63 120 63 C135 63 149 67 171 76 M69 100 C91 109 105 113 120 113 C135 113 149 109 171 100" {...line} />
        <path d="M69 76 C78 85 78 91 69 100 M171 76 C162 85 162 91 171 100" {...line} />
        <circle cx="120" cy="88" r="38" {...line} />
        <circle cx="120" cy="88" r="31" {...fine} />
        {piedra(120, 88, 23)}
        <circle cx="120" cy="50" r="5" {...fine} />
        <circle cx="120" cy="126" r="5" {...fine} />
        <circle cx="82" cy="88" r="5" {...fine} />
        <circle cx="158" cy="88" r="5" {...fine} />
        <path d="M120 39 V137 M65 88 H175" {...guide} />
      </svg>
    );
  }

  if (clave === "frontal") {
    return (
      <svg viewBox="0 0 280 170" aria-hidden="true" className="h-40 w-full text-muted-foreground/30">
        <ellipse cx="140" cy="123" rx="58" ry="34" {...line} />
        <ellipse cx="140" cy="123" rx="49" ry="28" {...fine} />
        <path d="M82 123 C84 96 94 69 111 55 C120 48 129 45 140 45 C151 45 160 48 169 55 C186 69 196 96 198 123" {...line} />
        <path d="M105 64 L116 39 L140 27 L164 39 L175 64 M116 39 L140 53 L164 39" {...line} />
        <path d="M105 64 C116 72 128 76 140 76 C152 76 164 72 175 64" {...fine} />
        <path d="M122 52 L126 68 M158 52 L154 68" {...fine} />
        {piedra(140, 39, 14)}
        <path d="M140 20 V151 M65 123 H215" {...guide} />
      </svg>
    );
  }

  if (clave === "izquierda") {
    return (
      <svg viewBox="0 0 280 170" aria-hidden="true" className="h-40 w-full text-muted-foreground/30">
        <path d="M128 132 C122 112 120 91 124 72 C127 58 134 49 140 49 C146 49 153 58 156 72 C160 91 158 112 152 132" {...line} />
        <path d="M124 72 C128 65 133 60 140 58 C147 60 152 65 156 72" {...fine} />
        <path d="M128 132 C135 136 145 136 152 132 M126 124 C134 127 146 127 154 124" {...fine} />
        <path d="M128 72 L130 43 L140 28 L150 43 L152 72" {...line} />
        <path d="M130 43 L140 50 L150 43" {...fine} />
        {piedra(140, 36, 10)}
        <path d="M140 17 V148 M103 132 H177" {...guide} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 280 170" aria-hidden="true" className="h-40 w-full text-muted-foreground/30">
      <ellipse cx="137" cy="119" rx="59" ry="31" transform="rotate(-17 137 119)" {...line} />
      <path d="M82 104 C89 80 102 59 121 50 C137 42 153 46 166 57 C175 65 181 75 185 88" {...line} />
      <path d="M98 98 C104 79 115 65 127 59 C139 53 151 57 160 66 C166 72 170 80 173 88" {...fine} />
      <path d="M121 50 L115 35 L126 22 L142 25 L153 39 L150 50" {...line} />
      <path d="M115 35 L126 44 L142 43 L153 39" {...fine} />
      <path d="M102 78 C116 87 130 91 145 88 C157 86 168 81 175 74" {...fine} />
      {piedra(130, 31, 13)}
      <path d="M130 17 V150 M66 119 H195" {...guide} />
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
        <label htmlFor={inputId} className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-end gap-1 px-5 pb-5 text-muted-foreground transition hover:bg-surface-muted hover:text-foreground">
          <div className="w-full -mb-1"><BocetoReferencia clave={clave} /></div>
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
