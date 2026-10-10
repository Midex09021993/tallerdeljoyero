// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/AppShell";
import { PedidoFormCampos } from "@/components/PedidoFormCampos";
import { normalizarArea, useSesion } from "@/lib/auth";
import { pedidoFormVacio, type PedidoFormState } from "@/lib/pedido-form";
import {
  estadoClases,
  useContrato,
  useCrearContratoDesdePedido,
  useCrearTrabajoContrato,
  usePagosContrato,
  usePedidosContrato,
  useRegistrarPagoContrato,
  resumenFinancieroContrato,
  type PedidoNuevo,
} from "@/lib/taller-db";
import { fmtFecha } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FichaContratoA4 } from "@/components/FichaContratoA4";
import { TODAS_LAS_SEDES, useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";

export const Route = createFileRoute("/_authenticated/contratos/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    nuevoPedido: search["nuevoPedido"] === true || search["nuevoPedido"] === "true",
  }),
  head: () => ({
    meta: [
      { title: "Contrato — Aurum Lab" },
      {
        name: "description",
        content: "Contrato comercial con varios trabajos productivos independientes.",
      },
    ],
  }),
  component: ContratoPage,
});

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function formularioContratoVacio(contrato?: {
  cliente?: string;
  telefono?: string;
  origen?: string;
  numero?: string;
}): PedidoFormState {
  return {
    ...pedidoFormVacio,
    cliente: contrato?.cliente ?? "",
    telefono: contrato?.telefono ?? "",
    origen: contrato?.origen ?? "",
    contrato: contrato?.numero ?? "",
    fecha_ingreso: hoy(),
  };
}

function formatCurrency(valor: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 2,
  }).format(valor);
}

function ContratoPage() {
  const { id } = useParams({ from: "/_authenticated/contratos/$id" });
  const navigate = useNavigate();
  const { data: sesion } = useSesion();
  const { esDueno, sedeFiltro } = useSedeFiltroDueno();
  const { nuevoPedido } = Route.useSearch();
  const { data: contrato, isLoading } = useContrato(id);
  const contratoEnContexto = contrato && (!esDueno || sedeFiltro === TODAS_LAS_SEDES || contrato.sede_id === sedeFiltro) ? contrato : null;
  const { pedidos, isLoading: cargandoPedidos } = usePedidosContrato(contratoEnContexto);
  const { data: pagos = [] } = usePagosContrato(contratoEnContexto);
  const crearTrabajo = useCrearTrabajoContrato();
  const crearContrato = useCrearContratoDesdePedido();
  const registrarPago = useRegistrarPagoContrato();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pagoAbierto, setPagoAbierto] = useState(false);
  const [form, setForm] = useState<PedidoFormState>(() => formularioContratoVacio());
  const [ruta, setRuta] = useState<string[]>([]);
  const [firmaModo, setFirmaModo] = useState<"presencial" | "remota" | null>(null);
  const [guardandoFirma, setGuardandoFirma] = useState(false);
  const [archivoFirma, setArchivoFirma] = useState<File | null>(null);
  const [observacionFirma, setObservacionFirma] = useState("");
  const [revisandoFirma, setRevisandoFirma] = useState(false);
  const canvasFirmaRef = useRef<HTMLCanvasElement | null>(null);
  const dibujandoFirmaRef = useRef(false);
  const [firmaTrazada, setFirmaTrazada] = useState(false);

  useEffect(() => {
    if (contrato && modalAbierto) {
      setForm(formularioContratoVacio(contrato));
      setRuta([]);
    }
  }, [contrato, modalAbierto]);

  const requiereFirma = Boolean(contratoEnContexto?.cotizacion_id);
  const firmaRecibida = ["firmado_documento_subido", "firmado_presencial", "firmado_certificado"].includes(contratoEnContexto?.estado_firma ?? "");
  const firmaValidada = Boolean(contratoEnContexto?.firma_validada_at);
  const puedeCrearPedidoContrato = !requiereFirma || (firmaRecibida && firmaValidada);

  function iniciarTrazoFirma(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasFirmaRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.setPointerCapture(e.pointerId);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#172033";
    ctx.beginPath();
    ctx.moveTo((e.clientX - rect.left) * (canvas.width / rect.width), (e.clientY - rect.top) * (canvas.height / rect.height));
    dibujandoFirmaRef.current = true;
    setFirmaTrazada(true);
  }

  function continuarTrazoFirma(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujandoFirmaRef.current) return;
    const canvas = canvasFirmaRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo((e.clientX - rect.left) * (canvas.width / rect.width), (e.clientY - rect.top) * (canvas.height / rect.height));
    ctx.stroke();
  }

  function finalizarTrazoFirma() {
    dibujandoFirmaRef.current = false;
  }

  async function guardarFirmaContrato(archivo?: File | Blob, tipo?: "firmado_documento_subido" | "firmado_presencial") {
    if (!contratoEnContexto || !archivo || guardandoFirma || !tipo) return;
    setGuardandoFirma(true);
    try {
      const bytes = new Uint8Array(await archivo.arrayBuffer());
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const sha256 = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
      const { data: docs, error: docsError } = await supabase
        .from("contrato_documentos")
        .select("version")
        .eq("contrato_id", contratoEnContexto.id)
        .order("version", { ascending: false })
        .limit(1);
      if (docsError) throw docsError;
      const version = Math.max(0, ...((docs ?? []).map((d: { version: number }) => Number(d.version) || 0))) + 1;
      const extension = tipo === "firmado_presencial" ? "png" : ((archivo as File).name?.split(".").pop()?.toLowerCase() || "pdf").replace(/[^a-z0-9]/g, "");
      const storagePath = `contratos/${contratoEnContexto.id}/firmado-v${version}-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("cotizaciones-publicas").upload(storagePath, archivo, {
        contentType: tipo === "firmado_presencial" ? "image/png" : ((archivo as File).type || "application/pdf"),
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { error: docError } = await supabase.from("contrato_documentos").insert({
        contrato_id: contratoEnContexto.id,
        version,
        tipo,
        storage_path: storagePath,
        sha256,
        plantilla_version: null,
        plantilla_contenido: { metodo: tipo === "firmado_presencial" ? "firma_en_tableta" : "archivo_devuelto_por_cliente" },
        creado_por: sesion?.user?.id ?? null,
      });
      if (docError) {
        await supabase.storage.from("cotizaciones-publicas").remove([storagePath]);
        throw docError;
      }
      const { error: updateError } = await supabase.from("contratos").update({
        estado_firma: tipo,
        firma_validada_at: null,
        firma_validada_por: null,
        firma_observacion: null,
      }).eq("id", contratoEnContexto.id);
      if (updateError) throw updateError;
      toast.success("Firma guardada. Falta la revisión y validación del taller.");
      setFirmaModo(null);
      setArchivoFirma(null);
      setFirmaTrazada(false);
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la firma.");
    } finally {
      setGuardandoFirma(false);
    }
  }

  async function revisarFirma(decision: "validado" | "rechazado") {
    if (!contratoEnContexto || revisandoFirma) return;
    if (decision === "rechazado" && !observacionFirma.trim()) {
      toast.error("Indica el motivo del rechazo para que quede registrado.");
      return;
    }
    setRevisandoFirma(true);
    const { error } = await supabase.rpc("revisar_firma_contrato", {
      _contrato_id: contratoEnContexto.id,
      _decision: decision,
      _observacion: observacionFirma.trim() || null,
    });
    setRevisandoFirma(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(decision === "validado" ? "Firma validada. Ya se puede crear el pedido." : "Firma rechazada. El pedido continúa bloqueado.");
    window.location.reload();
  }

  const resumen = useMemo(() => {
    return resumenFinancieroContrato(contratoEnContexto, pagos);
  }, [contratoEnContexto, pagos]);

  const puedeCrearTrabajo = Boolean(sesion?.esAdmin);
  const contratoFinancieroReal = resumen.origen === "contrato";

  useEffect(() => {
    if (!contratoEnContexto || !puedeCrearTrabajo || !nuevoPedido) return;
    setModalAbierto(true);
    setForm(formularioContratoVacio(contrato));
    setRuta([]);
    void navigate({
      to: "/contratos/$id",
      params: { id },
      search: { nuevoPedido: false },
      replace: true,
    });
  }, [contratoEnContexto, puedeCrearTrabajo, nuevoPedido, navigate]);

  if (isLoading) {
    return (
      <AppShell titulo="Contrato" subtitulo="Cargando…" atrasMovil={{ to: "/pedidos" }}>
        <p className="text-sm text-muted-foreground">Cargando contrato…</p>
      </AppShell>
    );
  }

  if (!contrato) {
    return (
      <AppShell titulo="Contrato no encontrado" atrasMovil={{ to: "/pedidos" }}>
        <p className="text-sm text-muted-foreground">
          Este contrato no existe o todavía no fue migrado desde pedidos.
        </p>
      </AppShell>
    );
  }

  if (!contratoEnContexto) {
    return (
      <AppShell titulo="Contrato de otra sede" atrasMovil={{ to: "/contratos" }}>
        <p className="text-sm text-muted-foreground">Este contrato pertenece a otra sede. Cambia la sede desde Inicio para consultarlo.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      titulo={`Contrato ${contrato.numero}`}
      subtitulo={`${contrato.cliente}${contrato.sede_nombre ? ` · ${contrato.sede_nombre}` : ""}`}
      atrasMovil={{ to: "/pedidos" }}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Panel
            titulo={`Contrato ${contrato.numero}`}
            accion={
              <div className="flex flex-wrap items-center gap-2">
                <FichaContratoA4 contrato={contrato} />
                <button
                  type="button"
                  onClick={() => navigate({ to: "/pedidos" })}
                  className="hidden rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
                >
                  ← Atrás
                </button>
              </div>
            }
          >
            <div className="grid gap-4 p-4 sm:grid-cols-2 lg:p-6">
              <Dato label="Cliente" valor={contrato.cliente} />
              <Dato label="Teléfono" valor={contrato.telefono || "—"} />
              <Dato label="Origen" valor={contrato.origen || "—"} />
              <Dato label="Sede" valor={contrato.sede_nombre || "—"} />
            </div>
          </Panel>

          <Panel
            titulo="Trabajos asociados"
            accion={
              puedeCrearTrabajo ? (
                <button
                  type="button"
                  onClick={() => setModalAbierto(true)}
                  disabled={!puedeCrearPedidoContrato}
                  className="rounded-xl border border-gold/30 bg-gold px-3 py-2 text-xs font-semibold text-gold-foreground shadow-card transition hover:shadow-raised"
                >
                  + Nuevo pedido
                </button>
              ) : null
            }
          >
            <div className="divide-y divide-border">
              {pedidos.map((pedido) => (
                <Link
                  key={pedido.id}
                  to="/pedidos/$id"
                  params={{ id: pedido.id }}
                  search={{ from: "pedidos" }}
                  className="block px-4 py-4 transition-colors hover:bg-surface-muted/70 lg:px-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{pedido.referencia}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {pedido.trabajo || pedido.pieza}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {pedido.cliente} · {normalizarArea(pedido.area_actual)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Entrega: {fmtFecha(pedido.fecha_entrega ?? pedido.entrega) ?? "Sin fecha"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${
                        estadoClases[pedido.estado] ?? "bg-surface-muted text-muted-foreground"
                      }`}
                    >
                      {pedido.estado}
                    </span>
                  </div>
                </Link>
              ))}
              {!cargandoPedidos && pedidos.length === 0 ? (
                <p className="px-4 py-8 text-sm text-muted-foreground lg:px-6">
                  Este contrato todavía no tiene pedidos asociados.
                </p>
              ) : null}
            </div>
            {puedeCrearTrabajo ? (
              <div className="border-t border-border p-4 lg:p-6">
                <button
                  type="button"
                  onClick={() => setModalAbierto(true)}
                  disabled={!puedeCrearPedidoContrato}
                  className="w-full rounded-xl border border-dashed border-border bg-surface-muted px-4 py-4 text-sm font-semibold text-foreground transition-colors hover:bg-card"
                >
                  + Nuevo pedido
                </button>
              </div>
            ) : null}
          </Panel>
        </div>

        <aside className="rounded-xl border border-border bg-card p-5 shadow-card lg:rounded-2xl">
          {requiereFirma ? (
            <Panel titulo="Acciones">
              <div className="space-y-3 p-4">
                <div className="rounded-xl border border-gold/20 bg-gold/[0.04] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold/80">Flujo contractual</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {firmaValidada
                      ? "Firma validada por el taller. El pedido ya puede crearse."
                      : firmaRecibida
                        ? "Firma recibida. El taller debe revisarla y validarla antes de crear el pedido."
                        : "Pendiente de firma. Elige firma presencial en tableta o envío remoto para que el cliente devuelva el documento firmado."}
                  </p>
                  <p className="mt-2 text-xs font-semibold">Estado: {firmaValidada ? "Firmado y validado" : firmaRecibida ? "Pendiente de validación" : "Pendiente de firma"}</p>
                </div>
                {!firmaRecibida ? (
                  <>
                    <button type="button" onClick={() => { setFirmaModo("presencial"); setFirmaTrazada(false); }} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
                      Firmar presencialmente
                    </button>
                    <button type="button" onClick={() => setFirmaModo("remota")} className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-surface-muted">
                      Enviar al cliente para firma
                    </button>
                  </>
                ) : (
                  <>
                    {firmaValidada ? (
                      <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">La firma está validada. Ya puedes crear el pedido.</p>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-xs text-muted-foreground">
                          Observación de revisión
                          <textarea value={observacionFirma} onChange={(e) => setObservacionFirma(e.target.value)} rows={2} placeholder="Motivo de rechazo o nota de validación" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
                        </label>
                        <button type="button" disabled={revisandoFirma} onClick={() => void revisarFirma("validado")} className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                          {revisandoFirma ? "Guardando…" : "Validar firma"}
                        </button>
                        <button type="button" disabled={revisandoFirma} onClick={() => void revisarFirma("rechazado")} className="w-full rounded-lg border border-destructive/30 px-4 py-2.5 text-sm font-semibold text-destructive disabled:opacity-50">
                          Rechazar firma
                        </button>
                      </div>
                    )}
                    {contratoEnContexto.firma_observacion ? <p className="text-xs text-muted-foreground">Última observación: {contratoEnContexto.firma_observacion}</p> : null}
                  </>
                )}
                {!puedeCrearPedidoContrato ? <p className="text-xs text-muted-foreground">El pedido está bloqueado hasta validar la firma.</p> : null}
              </div>
            </Panel>
          ) : null}
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Resumen comercial
          </p>
          <div className="mt-4 space-y-4">
            {contratoFinancieroReal ? (
              <>
                <Dato label="Total" valor={formatCurrency(resumen.total)} />
                <Dato label="Abonado" valor={formatCurrency(resumen.abonado)} />
                <Dato label="Saldo" valor={formatCurrency(resumen.saldo)} />
                <Dato label="Estado financiero" valor={resumen.estado} />
              </>
            ) : (
              <div className="rounded-xl border border-warning/25 bg-warning-soft p-3 text-xs text-warning">
                <p className="font-semibold">No existe un documento comercial asociado.</p>
                <p className="mt-1 opacity-80">
                  Este número existe en pedidos antiguos, pero falta crear o asociar el documento
                  comercial financiero.
                </p>
                {puedeCrearTrabajo && pedidos[0] ? (
                  <button
                    type="button"
                    onClick={() => crearContrato.mutate(pedidos[0]!)}
                    disabled={crearContrato.isPending}
                    className="mt-3 w-full rounded-xl border border-gold/25 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold-deep transition hover:border-gold/50 disabled:opacity-50"
                  >
                    {crearContrato.isPending ? "Creando..." : "Crear contrato"}
                  </button>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground opacity-60"
                    title="Disponible cuando se implemente documentos comerciales"
                  >
                    Asociar boleta
                  </button>
                  <button
                    type="button"
                    disabled
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground opacity-60"
                    title="Disponible cuando se implemente documentos comerciales"
                  >
                    Asociar factura
                  </button>
                  <button
                    type="button"
                    disabled
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground opacity-60"
                    title="Disponible cuando se implemente documentos comerciales"
                  >
                    Asociar documento comercial
                  </button>
                </div>
              </div>
            )}
          </div>
          {puedeCrearTrabajo && contratoFinancieroReal ? (
            <button
              type="button"
              onClick={() => setPagoAbierto((v) => !v)}
              className="mt-5 w-full rounded-xl border border-gold/25 bg-card px-4 py-2.5 text-xs font-semibold text-gold-deep shadow-card transition hover:border-gold/50 hover:shadow-raised"
            >
              {pagoAbierto ? "Ocultar pago" : "Registrar pago"}
            </button>
          ) : null}
          {pagoAbierto && contratoFinancieroReal ? (
            <FormularioPagoContrato
              guardando={registrarPago.isPending}
              onCancelar={() => setPagoAbierto(false)}
              onGuardar={(datos) =>
                registrarPago.mutate(
                  {
                    contrato,
                    usuarioId: sesion?.user.id ?? null,
                    ...datos,
                  },
                  { onSuccess: () => setPagoAbierto(false) },
                )
              }
            />
          ) : null}
          <div className="mt-6 border-t border-border pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Historial de pagos
            </p>
            <div className="mt-3 space-y-3">
              {pagos.length > 0 ? (
                pagos.map((pago) => (
                  <div key={pago.id} className="rounded-xl bg-surface-muted p-3 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{pago.concepto}</p>
                        <p className="mt-1 text-muted-foreground">{fmtFecha(pago.fecha)}</p>
                        <p className="mt-1 text-muted-foreground">
                          {pago.usuario_nombre || "Sin usuario registrado"}
                        </p>
                      </div>
                      <p className="font-semibold text-foreground">{formatCurrency(pago.monto)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">
                  Todavía no hay pagos registrados para este contrato.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {firmaModo ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/60 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{firmaModo === "presencial" ? "Firma presencial en tableta" : "Firma remota del cliente"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {firmaModo === "presencial" ? "El cliente debe firmar dentro del recuadro. Guarda la firma y luego el taller deberá validarla." : "Abre la ficha A4 del contrato, imprímela o guárdala como PDF, envíala al cliente y carga aquí el archivo firmado que te devuelva."}
                </p>
              </div>
              <button type="button" onClick={() => setFirmaModo(null)} className="rounded-lg border border-border px-3 py-2 text-xs">Cerrar</button>
            </div>
            {firmaModo === "presencial" ? (
              <div className="mt-4 space-y-3">
                <canvas ref={canvasFirmaRef} width={900} height={260} onPointerDown={iniciarTrazoFirma} onPointerMove={continuarTrazoFirma} onPointerUp={finalizarTrazoFirma} onPointerCancel={finalizarTrazoFirma} className="w-full touch-none rounded-xl border border-border bg-white" aria-label="Área para firmar" />
                <div className="flex flex-wrap justify-between gap-2">
                  <button type="button" onClick={() => { const canvas = canvasFirmaRef.current; canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height); setFirmaTrazada(false); }} className="rounded-lg border border-border px-3 py-2 text-xs">Borrar firma</button>
                  <button type="button" disabled={!firmaTrazada || guardandoFirma} onClick={() => { const canvas = canvasFirmaRef.current; canvas?.toBlob((blob) => { if (blob) void guardarFirmaContrato(blob, "firmado_presencial"); }, "image/png"); }} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
                    {guardandoFirma ? "Guardando…" : "Guardar firma"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-border bg-surface-muted p-3 text-sm text-muted-foreground">
                  Usa el botón <strong>Vista A4</strong> en la ficha del contrato para imprimir o guardar el documento. No se subirá ningún PDF automáticamente.
                </div>
                <label className="block text-sm font-medium">
                  Archivo firmado devuelto por el cliente (PDF o imagen)
                  <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => setArchivoFirma(e.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surface-muted file:px-3 file:py-2 file:text-sm file:font-semibold" />
                </label>
                <button type="button" disabled={!archivoFirma || guardandoFirma} onClick={() => archivoFirma && void guardarFirmaContrato(archivoFirma, "firmado_documento_subido")} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                  {guardandoFirma ? "Guardando archivo…" : "Guardar firma recibida"}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {modalAbierto ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-lg"
            onSubmit={(e) => {
              e.preventDefault();
              if (ruta.length === 0) return;
              const nuevo: Omit<PedidoNuevo, "referencia" | "contrato_id"> = {
                pieza: form.trabajo,
                trabajo: form.trabajo,
                cliente: contrato.cliente,
                telefono: form.telefono,
                origen: form.origen,
                contrato: contrato.numero,
                material: form.material,
                estado: "Recibido",
                entrega: form.fecha_entrega,
                importe: Number(form.importe) || 0,
                a_cuenta: Number(form.a_cuenta) || 0,
                fecha_ingreso: form.fecha_ingreso || hoy(),
                fecha_entrega: form.fecha_entrega || null,
                sede_id: contrato.sede_id,
                area_actual: "Pedidos",
                ruta,
                notas: form.notas,
                talla: form.talla,
                cantidad_piezas: Math.max(1, Number(form.cantidad_piezas) || 1),
                piedras: form.piedras,
                peso_estimado: form.peso_estimado,
                corte_texto: form.corte_texto,
                corte_tipografia: form.corte_tipografia,
                corte_ubicacion: form.corte_ubicacion,
                corte_observaciones: form.corte_observaciones,
              };
              crearTrabajo.mutate(
                {
                  contrato,
                  pedido: nuevo,
                  referenciasExistentes: pedidos.map((pedido) => pedido.referencia),
                },
                {
                  onSuccess: () => {
                    setForm(formularioContratoVacio(contrato));
                    setRuta([]);
                    setModalAbierto(false);
                  },
                },
              );
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Nuevo pedido</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Se creará un nuevo pedido dentro del contrato {contrato.numero}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                Cancelar
              </button>
            </div>

            <div className="mt-5">
              <PedidoFormCampos
                form={form}
                onChange={setForm}
                ruta={ruta}
                onRutaChange={setRuta}
                camposBloqueados={["cliente", "contrato"]}
                sedeSelect={
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Sede
                    <input
                      value={contrato.sede_nombre || "Sin sede"}
                      disabled
                      className="mt-1 w-full rounded-lg border border-border bg-surface-muted px-3 py-3 text-base text-muted-foreground sm:py-2 sm:text-sm"
                    />
                  </label>
                }
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!puedeCrearPedidoContrato || crearTrabajo.isPending || !form.trabajo.trim() || ruta.length === 0}
                className="rounded-lg bg-ink px-4 py-2 text-xs font-medium text-ink-foreground disabled:opacity-50"
              >
                {crearTrabajo.isPending ? "Creando…" : "Crear pedido"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </AppShell>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{valor}</p>
    </div>
  );
}

function FormularioPagoContrato({
  guardando,
  onCancelar,
  onGuardar,
}: {
  guardando: boolean;
  onCancelar: () => void;
  onGuardar: (datos: { fecha: string; concepto: string; monto: number }) => void;
}) {
  return (
    <form
      className="mt-4 rounded-xl border border-border bg-surface-muted p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onGuardar({
          fecha: String(fd.get("fecha") || hoy()),
          concepto: String(fd.get("concepto") || "Abono"),
          monto: Number(fd.get("monto")) || 0,
        });
      }}
    >
      <label className="block text-[10px] uppercase tracking-wider text-muted-foreground">
        Fecha
        <input
          name="fecha"
          type="date"
          defaultValue={hoy()}
          className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
        />
      </label>
      <label className="mt-3 block text-[10px] uppercase tracking-wider text-muted-foreground">
        Concepto
        <input
          name="concepto"
          defaultValue="Abono"
          className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
        />
      </label>
      <label className="mt-3 block text-[10px] uppercase tracking-wider text-muted-foreground">
        Monto
        <input
          name="monto"
          type="number"
          min="0.01"
          step="0.01"
          className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
        />
      </label>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={guardando}
          className="flex-1 rounded-lg bg-success px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar pago"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
