import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/cotizaciones/$id")({
  head: () => ({
    meta: [
      { title: "Detalle de cotización — Aurum Lab" },
      { name: "description", content: "Detalle y seguimiento de una cotización comercial." },
    ],
  }),
  component: CotizacionDetallePage,
});

type Cotizacion = {
  id: string; numero: string; version: number; estado: string; sede_id: string | null; fecha_emision: string;
  fecha_vencimiento: string | null; fecha_entrega_solicitada: string | null; moneda: string; subtotal_costo: number; subtotal: number;
  descuento: number; impuestos: number; total: number; anticipo: number;
  notas_cliente: string; notas_internas: string; cliente_id: string | null; proyecto_joya_id: string | null;
};
type Detalle = {
  id: string; orden: number; tipo: string; descripcion: string; cantidad: number; unidad: string;
  costo_unitario: number; precio_unitario: number; total_costo: number; total_precio: number;
};
type Cliente = { id: string; nombre: string; telefono: string | null; email: string | null };
type Proyecto = { id: string; codigo: string; nombre: string; descripcion: string; metal: string | null; ley: string | null; peso_estimado: number | null; talla: string | null; piedras: string | null };

const estados = [
  ["borrador", "Borrador"], ["enviada", "Enviada"], ["aprobada", "Aprobada"],
  ["rechazada", "Rechazada"], ["vencida", "Vencida"], ["cancelada", "Cancelada"],
] as const;

function money(n: number, moneda: string) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: moneda, maximumFractionDigits: 2 }).format(Number(n) || 0);
}
function etiquetaEstado(estado: string) {
  return estados.find(([value]) => value === estado)?.[1] ?? estado;
}

function CotizacionDetallePage() {
  const { id } = useParams({ from: "/_authenticated/cotizaciones/$id" });
  const navigate = useNavigate();
  const { data: sesion, isPending: cargandoSesion } = useSesion();
  const puedeGestionarCotizaciones =
    Boolean(sesion?.esAdmin) ||
    Boolean(sesion?.areas.some((area) => area.trim().toLowerCase() === "área ventas"));
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [detalles, setDetalles] = useState<Detalle[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [sedeNombre, setSedeNombre] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [creandoVersion, setCreandoVersion] = useState(false);
  const [convirtiendoPedido, setConvirtiendoPedido] = useState(false);
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [contratoId, setContratoId] = useState<string | null>(null);
  const [contratoNumero, setContratoNumero] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [enlacePdf, setEnlacePdf] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<"enlace" | "pdf" | null>(null);
  const [borradorDetalles, setBorradorDetalles] = useState<Detalle[]>([]);

  const cargar = async () => {
    setCargando(true); setError("");
    const { data: q, error: qError } = await supabase.from("cotizaciones")
      .select("id,numero,version,estado,sede_id,fecha_emision,fecha_vencimiento,fecha_entrega_solicitada,moneda,subtotal_costo,subtotal,descuento,impuestos,total,anticipo,notas_cliente,notas_internas,cliente_id,proyecto_joya_id")
      .eq("id", id).maybeSingle();
    if (qError || !q) {
      setError(qError?.message ?? "No se encontró la cotización.");
      setCargando(false); return;
    }
    const [{ data: d }, { data: c }, { data: p }, { data: pedidoExistente }, { data: contratoExistente }] = await Promise.all([
      supabase.from("cotizacion_detalles").select("id,orden,tipo,descripcion,cantidad,unidad,costo_unitario,precio_unitario,total_costo,total_precio").eq("cotizacion_id", id).order("orden"),
      q.cliente_id
        ? supabase.from("clientes").select("id,nombre,telefono,email").eq("id", q.cliente_id).maybeSingle()
        : Promise.resolve({ data: null }),
      q.proyecto_joya_id
        ? supabase.from("proyectos_joya").select("id,codigo,nombre,descripcion,metal,ley,peso_estimado,talla,piedras").eq("id", q.proyecto_joya_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("pedidos").select("id,contrato_id,contrato").eq("cotizacion_id", id).maybeSingle(),
      supabase.from("contratos").select("id,numero").eq("cotizacion_id", id).maybeSingle(),
    ]);
    setCotizacion(q);
    setDetalles(d ?? []);
    setCliente(c ?? null);
    setProyecto(p ?? null);
    if (q.sede_id) {
      const { data: sede } = await supabase.from("sedes").select("nombre").eq("id", q.sede_id).maybeSingle();
      setSedeNombre(sede?.nombre ?? null);
    } else {
      setSedeNombre(null);
    }
    setPedidoId(pedidoExistente?.id ?? null);
    setContratoId(contratoExistente?.id ?? pedidoExistente?.contrato_id ?? null);
    setContratoNumero(contratoExistente?.numero ?? pedidoExistente?.contrato ?? null);
    setCargando(false);
  };

  useEffect(() => {
    if (cargandoSesion) return;
    if (!puedeGestionarCotizaciones) {
      setCargando(false);
      return;
    }
    void cargar();
  }, [id, cargandoSesion, puedeGestionarCotizaciones]);

  const margen = useMemo(() => cotizacion ? Number(cotizacion.subtotal) - Number(cotizacion.subtotal_costo) : 0, [cotizacion]);

  function abrirEditor() {
    if (!cotizacion || cotizacion.estado !== "borrador") return;
    setBorradorDetalles(detalles.map((d) => ({ ...d })));
    setEditando(true);
    setError("");
  }

  function agregarPartida() {
    setBorradorDetalles((actuales) => [
      ...actuales,
      {
        id: crypto.randomUUID(),
        orden: actuales.length + 1,
        tipo: "otro",
        descripcion: "",
        cantidad: 1,
        unidad: "und",
        costo_unitario: 0,
        precio_unitario: 0,
        total_costo: 0,
        total_precio: 0,
      },
    ]);
  }

  function actualizarPartida(id: string, cambios: Partial<Detalle>) {
    setBorradorDetalles((actuales) =>
      actuales.map((d) => d.id === id ? { ...d, ...cambios } : d),
    );
  }

  function eliminarPartida(id: string) {
    setBorradorDetalles((actuales) =>
      actuales.filter((d) => d.id !== id).map((d, i) => ({ ...d, orden: i + 1 })),
    );
  }

  async function guardarPartidas() {
    if (!cotizacion || !sesion?.esAdmin || cotizacion.estado !== "borrador") return;
    if (borradorDetalles.length === 0 || borradorDetalles.some((d) => !d.descripcion.trim())) {
      setError("Agrega al menos una partida y completa su descripción.");
      return;
    }
    setGuardando(true);
    setError("");
    const payload = borradorDetalles.map((d, i) => ({
      orden: i + 1,
      tipo: d.tipo,
      descripcion: d.descripcion.trim(),
      cantidad: Number(d.cantidad) || 1,
      unidad: d.unidad.trim() || "und",
      costo_unitario: Math.max(0, Number(d.costo_unitario) || 0),
      precio_unitario: Math.max(0, Number(d.precio_unitario) || 0),
    }));
    const { error: saveError } = await supabase.rpc("guardar_detalles_cotizacion", {
      _cotizacion_id: cotizacion.id,
      _detalles: payload,
    });
    if (saveError) {
      setError(saveError.message);
      setGuardando(false);
      return;
    }
    setEditando(false);
    setGuardando(false);
    await cargar();
  }

  async function crearVersion() {
    if (!cotizacion || !sesion?.esAdmin || !["enviada", "rechazada", "vencida"].includes(cotizacion.estado)) return;
    setCreandoVersion(true);
    setError("");
    const { data: nuevoId, error: versionError } = await supabase.rpc("crear_version_cotizacion", {
      _cotizacion_id: cotizacion.id,
    });
    if (versionError || !nuevoId) {
      setError(versionError?.message ?? "No se pudo crear la nueva versión.");
      setCreandoVersion(false);
      return;
    }
    await navigate({ to: "/cotizaciones/$id", params: { id: nuevoId } });
    setCreandoVersion(false);
  }

  async function convertirAPedidoYContrato() {
    if (!cotizacion || cotizacion.estado !== "aprobada" || !sesion?.esAdmin) return;
    setConvirtiendoPedido(true);
    setError("");
    const { data, error: conversionError } = await supabase.rpc("convertir_cotizacion_a_pedido_contrato", {
      _cotizacion_id: cotizacion.id,
    });
    if (conversionError || !data) {
      setError(conversionError?.message ?? "No se pudo crear el contrato y pedido.");
      setConvirtiendoPedido(false);
      return;
    }
    const resultado = data as { pedido_id?: string; contrato_id?: string; contrato_numero?: string };
    setPedidoId(resultado.pedido_id ?? null);
    setContratoId(resultado.contrato_id ?? null);
    setContratoNumero(resultado.contrato_numero ?? null);
    setConvirtiendoPedido(false);
  }

  async function copiarTexto(texto: string, tipo: "enlace" | "pdf") {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(tipo);
      window.setTimeout(() => setCopiado(null), 1800);
    } catch {
      setError("No se pudo copiar el enlace. Puedes copiarlo manualmente.");
    }
  }

  async function generarPdfCotizacion() {
    if (!cotizacion || generandoPdf) return;
    setGenerandoPdf(true);
    setError("");
    const { data, error: pdfError } = await supabase.functions.invoke("generar-cotizacion-pdf", {
      body: { cotizacion_id: cotizacion.id },
    });
    if (pdfError || !data?.url) {
      setError(pdfError?.message ?? data?.error ?? "No se pudo generar el PDF.");
      setGenerandoPdf(false);
      return;
    }
    setEnlacePdf(data.url);
    setGenerandoPdf(false);
  }

  async function copiarEnlacePdf() {
    if (!enlacePdf) return;
    await copiarTexto(enlacePdf, "pdf");
  }

  function abrirWhatsApp() {
    if (!enlacePdf) return;
    const telefono = (cliente?.telefono ?? "").replace(/\D/g, "");
    const mensaje = [
      "Hola" + (cliente?.nombre ? ` ${cliente.nombre}` : ""),
      "",
      `Te enviamos la cotización ${cotizacion?.numero ?? ""}` + (cotizacion?.version ? ` (versión ${cotizacion.version})` : "") + ".",
      "Puedes revisar el PDF aquí:",
      enlacePdf,
    ].join("\n");
    const destino = telefono
      ? `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(destino, "_blank", "noopener,noreferrer");
  }

  async function descargarPdf() {
    if (!enlacePdf) return;
    try {
      setError("");
      const response = await fetch(enlacePdf);
      if (!response.ok) throw new Error("No se pudo descargar el PDF.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${cotizacion?.numero ?? "cotizacion"}-v${cotizacion?.version ?? 1}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "No se pudo descargar el PDF.");
    }
  }

  async function cambiarEstado(estado: string) {
    if (!cotizacion || !sesion?.esAdmin || estado === cotizacion.estado) return;
    setGuardandoEstado(true); setError("");
    const { error: updateError } = await supabase.rpc("cambiar_estado_cotizacion", {
      _cotizacion_id: cotizacion.id,
      _nuevo_estado: estado,
    });
    if (updateError) setError(updateError.message);
    else setCotizacion({ ...cotizacion, estado });
    setGuardandoEstado(false);
  }

  if (cargando) return <AppShell titulo="Cotización" subtitulo="Cargando…" atrasMovil={{ to: "/cotizaciones" }}><p className="text-sm text-muted-foreground">Cargando cotización…</p></AppShell>;
  if (!cotizacion) return <AppShell titulo="Cotización no encontrada" atrasMovil={{ to: "/cotizaciones" }}><p className="text-sm text-muted-foreground">{error || "La cotización no existe o no tienes acceso."}</p></AppShell>;

  if (!puedeGestionarCotizaciones) {
    return (
      <AppShell titulo="Cotización" subtitulo="Acceso restringido al área comercial.">
        <Panel titulo="Acceso restringido"><p className="p-6 text-sm text-muted-foreground">Esta sección contiene información comercial y financiera.</p></Panel>
      </AppShell>
    );
  }

  return (
    <>
      <div className="cotizacion-app"><AppShell titulo={cotizacion.numero} subtitulo={"Versión " + cotizacion.version + " · " + etiquetaEstado(cotizacion.estado)} atrasMovil={{ to: "/cotizaciones" }}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/cotizaciones" className="text-sm text-muted-foreground hover:text-foreground">← Volver a cotizaciones</Link>
          {sesion?.esAdmin ? <div className="flex flex-wrap items-center gap-2">
            {["enviada", "rechazada", "vencida"].includes(cotizacion.estado) ? (
              <button type="button" disabled={creandoVersion} onClick={() => void crearVersion()} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
                {creandoVersion ? "Creando…" : "Crear nueva versión"}
              </button>
            ) : null}
            {estados.map(([value, label]) => <button key={value} type="button" disabled={guardandoEstado} onClick={() => void cambiarEstado(value)}
              className={"rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " + (cotizacion.estado === value ? "border-ink bg-ink text-ink-foreground" : "border-border text-muted-foreground hover:text-foreground")}>{label}</button>)}
          </div> : null}
        </div>
        {error ? <div className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div> : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <Panel titulo="Datos comerciales">
              <div className="grid gap-4 p-4 sm:grid-cols-2 lg:p-6">
                <Dato label="Cliente" valor={cliente?.nombre ?? "—"} />
                <Dato label="Teléfono" valor={cliente?.telefono || "—"} />
                <Dato label="Correo" valor={cliente?.email || "—"} />
                <Dato label="Emisión" valor={cotizacion.fecha_emision} />
                <Dato label="Válida hasta" valor={cotizacion.fecha_vencimiento || "Sin fecha"} />
                <Dato label="Entrega solicitada" valor={cotizacion.fecha_entrega_solicitada || "Sin fecha"} />
                <Dato label="Proyecto" valor={proyecto ? proyecto.codigo + " · " + proyecto.nombre : "Sin proyecto"} />
              </div>
            </Panel>

            {proyecto ? <Panel titulo="Especificación de la joya">
              <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 lg:p-6">
                <Dato label="Metal" valor={proyecto.metal || "—"} />
                <Dato label="Ley" valor={proyecto.ley || "—"} />
                <Dato label="Peso estimado" valor={proyecto.peso_estimado != null ? proyecto.peso_estimado + " g" : "—"} />
                <Dato label="Talla" valor={proyecto.talla || "—"} />
                <Dato label="Piedras" valor={proyecto.piedras || "—"} />
                <Dato label="Descripción" valor={proyecto.descripcion || "—"} />
              </div>
            </Panel> : null}

            <Panel titulo="Partidas de la cotización" accion={
              sesion?.esAdmin && cotizacion.estado === "borrador"
                ? <button type="button" onClick={abrirEditor} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Editar partidas</button>
                : undefined
            }>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead><tr className="border-y border-border bg-surface-muted text-[10px] uppercase tracking-wider text-muted-foreground">
                    {["Tipo","Descripción","Cant.","Costo unit.","Precio unit.","Total"].map(h => <th key={h} className="px-4 py-3">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {detalles.map(d => <tr key={d.id}>
                      <td className="px-4 py-3 text-xs uppercase text-muted-foreground">{d.tipo}</td>
                      <td className="px-4 py-3 font-medium">{d.descripcion}</td>
                      <td className="px-4 py-3">{d.cantidad} {d.unidad}</td>
                      <td className="px-4 py-3 text-muted-foreground">{money(d.costo_unitario, cotizacion.moneda)}</td>
                      <td className="px-4 py-3">{money(d.precio_unitario, cotizacion.moneda)}</td>
                      <td className="px-4 py-3 font-semibold">{money(d.total_precio, cotizacion.moneda)}</td>
                    </tr>)}
                    {detalles.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Sin partidas.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </Panel>

        {editando ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl">Editar partidas</h2>
                <p className="text-sm text-muted-foreground">Agrega, elimina o ajusta partidas. Los totales se recalculan en la base de datos.</p>
              </div>
              <button type="button" onClick={() => setEditando(false)} disabled={guardando} className="rounded-full border border-border px-3 py-1">×</button>
            </div>
            <div className="space-y-3">
              {borradorDetalles.map((d, i) => <div key={d.id} className="rounded-xl border border-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Partida {i + 1}</span>
                  <button type="button" onClick={() => eliminarPartida(d.id)} disabled={guardando || borradorDetalles.length === 1} className="text-xs text-danger disabled:opacity-40">Eliminar</button>
                </div>
                <div className="grid gap-3 md:grid-cols-12">
                  <label className="text-xs text-muted-foreground md:col-span-2">Tipo<select value={d.tipo} onChange={e => actualizarPartida(d.id, { tipo: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm">
                    {["modelo","metal","piedras","fundicion","engaste","acabado","mano_obra","render","otro"].map(v => <option key={v} value={v}>{v}</option>)}
                  </select></label>
                  <label className="text-xs text-muted-foreground md:col-span-4">Descripción<input value={d.descripcion} onChange={e => actualizarPartida(d.id, { descripcion: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
                  <label className="text-xs text-muted-foreground md:col-span-1">Cant.<input type="number" min="0.001" step="0.001" value={d.cantidad} onChange={e => actualizarPartida(d.id, { cantidad: Number(e.target.value) || 1 })} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm" /></label>
                  <label className="text-xs text-muted-foreground md:col-span-1">Unidad<input value={d.unidad} onChange={e => actualizarPartida(d.id, { unidad: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm" /></label>
                  <label className="text-xs text-muted-foreground md:col-span-2">Costo<input type="number" min="0" step="0.01" value={d.costo_unitario} onChange={e => actualizarPartida(d.id, { costo_unitario: Number(e.target.value) || 0 })} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm" /></label>
                  <label className="text-xs text-muted-foreground md:col-span-2">Precio<input type="number" min="0" step="0.01" value={d.precio_unitario} onChange={e => actualizarPartida(d.id, { precio_unitario: Number(e.target.value) || 0 })} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm" /></label>
                </div>
                <div className="mt-2 text-right text-xs text-muted-foreground">
                  Total: {money((Number(d.cantidad) || 0) * (Number(d.precio_unitario) || 0), cotizacion.moneda)}
                </div>
              </div>)}
              <button type="button" onClick={agregarPartida} disabled={guardando} className="w-full rounded-xl border border-dashed border-border px-4 py-3 text-sm font-medium hover:bg-surface-muted">+ Agregar partida</button>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setEditando(false)} disabled={guardando} className="rounded-lg border border-border px-4 py-2.5 text-sm">Cancelar</button>
              <button type="button" onClick={() => void guardarPartidas()} disabled={guardando || borradorDetalles.length === 0} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">{guardando ? "Guardando…" : "Guardar partidas"}</button>
            </div>
          </div>
        </div> : null}

            <Panel titulo="Notas">
              <div className="grid gap-4 p-4 sm:grid-cols-2 lg:p-6">
                <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Para el cliente</p><p className="mt-2 whitespace-pre-wrap text-sm">{cotizacion.notas_cliente || "Sin notas."}</p></div>
                <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Internas</p><p className="mt-2 whitespace-pre-wrap text-sm">{cotizacion.notas_internas || "Sin notas."}</p></div>
              </div>
            </Panel>
          </div>

          <aside className="h-fit space-y-4">
            <Panel titulo="Resumen financiero">
              <div className="space-y-3 p-4">
                <Fila label="Costo interno" valor={money(cotizacion.subtotal_costo, cotizacion.moneda)} />
                <Fila label="Subtotal cliente" valor={money(cotizacion.subtotal, cotizacion.moneda)} />
                <Fila label="Descuento" valor={money(cotizacion.descuento, cotizacion.moneda)} />
                <Fila label="Impuestos" valor={money(cotizacion.impuestos, cotizacion.moneda)} />
                <div className="border-t border-border pt-3"><Fila label="Total" valor={money(cotizacion.total, cotizacion.moneda)} fuerte /></div>
                <Fila label="Anticipo" valor={money(cotizacion.anticipo, cotizacion.moneda)} />
                <Fila label="Margen bruto" valor={money(margen, cotizacion.moneda)} />
              </div>
            </Panel>
            <Panel titulo="Documento para el cliente">
              <div className="space-y-3 p-4">
                <p className="text-xs text-muted-foreground">Genera una copia PDF de la propuesta con información comercial. Los costos internos y notas internas nunca se incluyen.</p>
                <button type="button" disabled={generandoPdf} onClick={() => void generarPdfCotizacion()} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                  {generandoPdf ? "Generando PDF…" : enlacePdf ? "Regenerar PDF" : "Generar PDF"}
                </button>
                {enlacePdf ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => void descargarPdf()} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-ink-foreground hover:opacity-90">
                      Descargar PDF
                    </button>
                    <button type="button" onClick={() => void copiarEnlacePdf()} className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-surface-muted">
                      {copiado === "pdf" ? "✓ Enlace copiado" : "Copiar enlace"}
                    </button>
                    <button type="button" onClick={abrirWhatsApp} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/15">
                      Enviar por WhatsApp
                    </button>
                  </div>
                ) : null}
                {enlacePdf ? (
                  <a href={enlacePdf} target="_blank" rel="noreferrer" className="block text-center text-xs font-medium text-primary hover:underline">
                    Abrir PDF en una pestaña nueva
                  </a>
                ) : null}
              </div>
            </Panel>
            <Panel titulo="Acciones">
              <div className="space-y-2 p-4">
                <div className="rounded-xl border border-gold/15 bg-gold/[0.025] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold/80">Flujo comercial</p>
                  <p className="mt-1 text-xs text-muted-foreground">Revisa la cotización, envíala al cliente y apruébala para convertirla en operación.</p>
                </div>
                {cotizacion.estado === "borrador" ? (
                  <>
                    <button type="button" onClick={abrirEditor} className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-surface-muted">Editar cotización</button>
                    <button type="button" disabled={guardandoEstado} onClick={() => void cambiarEstado("enviada")} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                      {guardandoEstado ? "Procesando…" : "Enviar al cliente"}
                    </button>
                  </>
                ) : null}
                {cotizacion.estado === "enviada" ? (
                  <button type="button" disabled={guardandoEstado} onClick={() => void cambiarEstado("aprobada")} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                    {guardandoEstado ? "Procesando…" : "Aprobar cotización"}
                  </button>
                ) : null}
                {cotizacion.estado === "aprobada" ? (
                  pedidoId ? (
                    <div className="space-y-2">
                      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                        <p className="font-medium">✓ Operación comercial creada</p>
                        {contratoNumero ? <p className="mt-1 text-xs text-muted-foreground">Contrato: {contratoNumero}</p> : null}
                      </div>
                      <Link to="/pedidos-2/$id" params={{ id: pedidoId }} className="block w-full rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground">Ver pedido creado</Link>
                    </div>
                  ) : (
                    <button type="button" disabled={convirtiendoPedido} onClick={() => void convertirAPedidoYContrato()} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
                      {convirtiendoPedido ? "Creando contrato y pedido…" : "Crear contrato + pedido"}
                    </button>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">Cuando sea aprobada podremos crear el contrato y pedido sin volver a ingresar los datos.</p>
                )}
                <button type="button" onClick={() => void navigate({ to: "/cotizaciones" })} className="w-full rounded-lg border border-border px-4 py-2.5 text-sm">Volver al listado</button>
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </AppShell>
      </div>

    </>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{valor}</p></div>;
}
function Fila({ label, valor, fuerte = false }: { label: string; valor: string; fuerte?: boolean }) {
  return <div className={"flex items-center justify-between gap-3 text-sm " + (fuerte ? "font-semibold text-base" : "")}><span className="text-muted-foreground">{label}</span><span>{valor}</span></div>;
}
