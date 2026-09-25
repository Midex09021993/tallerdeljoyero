import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Box, CalendarClock, CheckCircle2, ClipboardList, Factory, FileText, History, PackageCheck, UserRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { usePedidos, estadoClases, esEstadoFinalPedido } from "@/lib/taller-db";
import { areaCoincide, useSesion } from "@/lib/auth";
import { fmtFecha } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pedidos/$id")({
  head: () => ({ meta: [{ title: "Pedido — Taller del Joyero" }, { name: "description", content: "Ficha operativa del pedido." }] }),
  component: PedidoDetalle,
});

type Tab = "resumen" | "produccion" | "comercial" | "archivos" | "historial";

function PedidoDetalle() {
  const { id } = useParams({ from: "/_authenticated/pedidos/$id" });
  const navigate = useNavigate();
  const { data: pedidos = [] } = usePedidos();
  const { data: sesion } = useSesion();
  const pedido = pedidos.find((p) => p.id === id);

  const { data: contratoFinanciero } = useQuery({
    queryKey: ["pedido-contrato-financiero", pedido?.contrato_id],
    enabled: Boolean(pedido?.contrato_id),
    queryFn: async () => {
      if (!pedido?.contrato_id) return null;
      const { data, error } = await supabase
        .from("contratos")
        .select("id,numero,total,abonado")
        .eq("id", pedido.contrato_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: pagosContrato = [] } = useQuery({
    queryKey: ["pedido-contrato-pagos", pedido?.contrato_id],
    enabled: Boolean(pedido?.contrato_id),
    queryFn: async () => {
      if (!pedido?.contrato_id) return [];
      const { data, error } = await supabase
        .from("contrato_pagos")
        .select("id,fecha,concepto,monto,usuario_id,created_at,profiles(nombre)")
        .eq("contrato_id", pedido.contrato_id)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const [tab, setTab] = useState<Tab>("resumen");
  const [transicionando, setTransicionando] = useState(false);
  const [resultadoCalidad, setResultadoCalidad] = useState("aprobado");
  const [tipoCalidad, setTipoCalidad] = useState("inspeccion_final");
  const [descripcionCalidad, setDescripcionCalidad] = useState("");
  const [motivoCalidad, setMotivoCalidad] = useState("");
  const [guardandoCalidad, setGuardandoCalidad] = useState(false);
  const [preparandoProduccion, setPreparandoProduccion] = useState(false);
  const [ruta, setRuta] = useState<string[]>([]);
  const [guardandoRuta, setGuardandoRuta] = useState(false);
  const [asignandoTrabajoId, setAsignandoTrabajoId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const rutas = ["Diseño 3D", "Impresión 3D", "Casting", "Corte Láser", "Taller"];

  useEffect(() => {
    if (!pedido) return;
    setRuta((Array.isArray(pedido.ruta) ? pedido.ruta : []).filter((area: string) => rutas.includes(area)));
  }, [pedido?.id]);

  const { data: trabajos = [], isLoading: loadingTrabajos } = useQuery({
    queryKey: ["pedidos-trabajos", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("trabajos").select("id,titulo,area,estado,prioridad,responsable_user_id,participante_id,sede_id,created_at").eq("pedido_id", id).order("created_at");
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: participantesServicio = [], error: participantesServicioError } = useQuery({
    queryKey: ["pedidos-participantes-servicio", trabajos.map((t) => t.area).join("|")],
    enabled: Boolean(sesion?.esAdmin && trabajos.length > 0),
    queryFn: async () => {
      if (!sesion?.esAdmin || trabajos.length === 0) return [];
      const areas = [...new Set(trabajos.map((t) => String(t.area || "").trim()).filter(Boolean))];
      const resultados = await Promise.all(
        areas.map(async (area) => {
          const { data, error } = await supabase.rpc("listar_participantes_servicio", { _area: area });
          if (error) throw error;
          return data ?? [];
        }),
      );
      const porId = new Map<string, (typeof resultados[number])[number]>();
      resultados.flat().forEach((p) => porId.set(p.id, p));
      return [...porId.values()];
    },
  });


  const sedeProduccionId = trabajos.find((trabajo) => trabajo.sede_id)?.sede_id ?? pedido?.sede_id ?? null;

  const { data: capacidadesSede = [], error: capacidadesSedeError } = useQuery({
    queryKey: ["pedidos-capacidades-sede", sedeProduccionId],
    enabled: Boolean(sedeProduccionId && sesion?.esAdmin),
    queryFn: async () => {
      if (!sedeProduccionId || !sesion?.esAdmin) return [];
      const { data, error } = await supabase
        .from("sede_especialidades")
        .select("especialidad_id, especialidades!inner(nombre)")
        .eq("sede_id", sedeProduccionId);
      if (error) throw error;
      return (data ?? [])
        .map((row: any) => ({
          id: row.especialidad_id as string,
          nombre: Array.isArray(row.especialidades)
            ? row.especialidades[0]?.nombre
            : row.especialidades?.nombre,
        }))
        .filter((row) => row.nombre);
    },
  });

  const { data: operarios = [], error: operariosError } = useQuery({
    queryKey: ["pedidos-operarios", sedeProduccionId, sesion?.esAdmin],
    enabled: Boolean(sedeProduccionId && sesion?.esAdmin),
    queryFn: async () => {
      if (!sedeProduccionId || !sesion?.esAdmin) return [];
      const { data, error } = await supabase.rpc("listar_operarios_por_area", {
        _sede_id: sedeProduccionId,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: ordenes = [] } = useQuery({
    queryKey: ["pedidos-op", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("ordenes_produccion").select("id,numero,estado,prioridad,fecha_planificada_inicio,fecha_planificada_fin,fecha_inicio,fecha_fin,responsable_user_id,created_at").eq("pedido_id", id).order("created_at");
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: resumenCosto } = useQuery({
    queryKey: ["pedidos-costos", ordenes[0]?.id],
    enabled: Boolean(ordenes[0]?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("orden_produccion_resumen_costos").select("costo_estimado,costo_materiales,costo_mano_obra,costo_externo,costo_indirecto,costo_ajustes,costo_real,venta,margen,margen_porcentaje,moneda,calculado_at").eq("orden_produccion_id", ordenes[0]?.id ?? "").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: controles = [] } = useQuery({
    queryKey: ["pedidos-qc", id, ordenes.map((o) => o.id).join(",")],
    enabled: Boolean(id) && ordenes.length > 0,
    queryFn: async () => {
      const ordenIds = ordenes.map((o) => o.id);
      const { data, error } = await supabase
        .from("control_calidad")
        .select("id,orden_produccion_id,trabajo_id,tipo,resultado,descripcion,motivo,evidencia_url,created_at,inspeccionado_por")
        .in("orden_produccion_id", ordenIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: piezas = [] } = useQuery({
    queryKey: ["pedidos-piezas", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("piezas_terminadas").select("id,numero_pieza,cantidad,estado,peso_final,created_at").eq("pedido_id", id).order("created_at");
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: archivos = [] } = useQuery({
    queryKey: ["pedidos-archivos", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedido_archivos")
        .select("id,nombre,tipo,grupo,version,poster,url,es_vigente_fabricacion,created_at")
        .eq("pedido_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      return Promise.all(
        (Array.isArray(data) ? data : []).map(async (archivo) => {
          if (archivo.poster || !archivo.url || !/\.(jpe?g|png|webp|gif)$/i.test(archivo.nombre || "")) {
            return archivo;
          }
          const { data: firmado } = await supabase.storage
            .from("pedidos")
            .createSignedUrl(archivo.url, 3600);
          return { ...archivo, poster: firmado?.signedUrl ?? "" };
        }),
      );
    },
  });

  const { data: eventos = [] } = useQuery({
    queryKey: ["pedidos-eventos", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("produccion_eventos").select("id,tipo,estado_anterior,estado_nuevo,usuario_id,datos,created_at").eq("pedido_id", id).order("created_at", { ascending: false }).limit(150);
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: movimientos = [] } = useQuery({
    queryKey: ["pedidos-movimientos", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("pedido_movimientos").select("id,area_origen,area_destino,accion,usuario_id,nota,created_at").eq("pedido_id", id).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  const ordenPrincipal = ordenes[0];
  const trabajosCompletos = trabajos.length > 0 && trabajos.every((t) => t.estado === "completado");
  const piezaVerificada = piezas.some((p) => ["verificada", "liberada"].includes(p.estado));
  const calidadFinalAprobada = controles.some((c) => c.tipo === "inspeccion_final" && c.resultado === "aprobado");

  const asignarResponsable = async (trabajoId: string, responsableUserId: string | null) => {
    if (!sesion?.esAdmin || asignandoTrabajoId) return;
    setAsignandoTrabajoId(trabajoId);
    try {
      const { error } = await supabase.rpc("asignar_responsable_trabajo", {
        _trabajo_id: trabajoId,
        _responsable_user_id: responsableUserId,
      });
      if (error) throw error;
      toast.success(
        responsableUserId
          ? "Operario asignado al trabajo."
          : "Responsable retirado del trabajo.",
      );
      await queryClient.invalidateQueries({ queryKey: ["pedidos-trabajos", id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo asignar el operario.");
    } finally {
      setAsignandoTrabajoId(null);
    }
  };

  const asignarParticipanteExterno = async (trabajoId: string, participanteId: string | null) => { if (!sesion?.esAdmin || asignandoTrabajoId) return; setAsignandoTrabajoId(trabajoId); try { const { error } = await supabase.rpc("asignar_participante_externo_trabajo", { _trabajo_id: trabajoId, _participante_id: participanteId }); if (error) throw error; toast.success(participanteId ? "Servicio externo asignado al trabajo." : "Servicio externo retirado del trabajo."); await queryClient.invalidateQueries({ queryKey: ["pedidos-trabajos", id] }); } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo asignar el servicio externo."); } finally { setAsignandoTrabajoId(null); } };

  const prepararProduccion = async () => {
    if (!pedido || preparandoProduccion) return;
    setPreparandoProduccion(true);
    try {
      const { data, error } = await supabase.rpc("preparar_produccion_pedido", {
        _pedido_id: pedido.id,
      });
      if (error) throw error;
      const resultado = data as { numero?: string; trabajos?: number; piezas?: number } | null;

      // Preparar producción y liberar la OP forman una sola decisión:
      // una vez definida la ruta, el pedido queda listo para entrar al flujo productivo.
      const { data: opCreada, error: opCreadaError } = await supabase
        .from("ordenes_produccion")
        .select("id,estado")
        .eq("pedido_id", pedido.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (opCreadaError) throw opCreadaError;

      if (opCreada?.id && opCreada.estado === "borrador") {
        const { error: liberarError } = await supabase.rpc("transicionar_orden_produccion", {
          _orden_id: opCreada.id,
          _nuevo_estado: "liberada",
        });
        if (liberarError) throw liberarError;
      }

      toast.success(
        `Producción preparada: ${resultado?.numero ?? "OP"} · ${resultado?.trabajos ?? 0} operaciones · ${resultado?.piezas ?? 0} pieza(s). La OP quedó liberada.`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pedidos-op", id] }),
        queryClient.invalidateQueries({ queryKey: ["pedidos-trabajos", id] }),
        queryClient.invalidateQueries({ queryKey: ["pedidos-piezas", id] }),
        queryClient.invalidateQueries({ queryKey: ["pedidos-eventos", id] }),
        queryClient.invalidateQueries({ queryKey: ["pedidos"] }),
      ]);

      // Si el área tiene exactamente un operario activo en esta sede,
      // la operación queda asignada automáticamente. Si hay varios,
      // permanece libre para que administración elija o el operario la tome.
      if (sesion?.esAdmin) {
        const { data: trabajosActualizados } = await supabase
          .from("trabajos")
          .select("id, area, responsable_user_id")
          .eq("pedido_id", pedido.id);

        for (const trabajo of trabajosActualizados ?? []) {
          if (trabajo.responsable_user_id) continue;
          const candidatos = operarios.filter((operario) =>
            operario.areas.some((area) => areaCoincide(area, trabajo.area)),
          );
          if (candidatos.length === 1) {
            const { error: asignacionError } = await supabase.rpc("asignar_responsable_trabajo", {
              _trabajo_id: trabajo.id,
              _responsable_user_id: candidatos[0].id,
            });
            if (asignacionError) {
              console.warn("No se pudo asignar automáticamente el trabajo", trabajo.id, asignacionError);
            }
          }
        }

        await queryClient.invalidateQueries({ queryKey: ["pedidos-trabajos", id] });
      }
    } catch (error) {
      const detalle = error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : error instanceof Error
          ? error.message
          : "";
      toast.error(detalle || "No se pudo preparar la producción.");
      console.error("preparar_produccion_pedido", error);
    } finally {
      setPreparandoProduccion(false);
    }
  };

  const registrarCalidad = async () => {
    if (!ordenPrincipal || guardandoCalidad) return;
    setGuardandoCalidad(true);
    try {
      const { error } = await supabase.rpc("registrar_inspeccion_calidad", {
        _orden_id: ordenPrincipal.id,
        _resultado: resultadoCalidad,
        _tipo: tipoCalidad,
        _motivo: motivoCalidad.trim(),
        _descripcion: descripcionCalidad.trim(),
      });
      if (error) throw error;
      toast.success(resultadoCalidad === "aprobado" ? "Inspección aprobada y registrada." : "Inspección de calidad registrada.");
      setDescripcionCalidad("");
      setMotivoCalidad("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pedidos-op", id] }),
        queryClient.invalidateQueries({ queryKey: ["pedidos-qc", id] }),
        queryClient.invalidateQueries({ queryKey: ["pedidos-piezas", id] }),
        queryClient.invalidateQueries({ queryKey: ["pedidos"] }),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar la inspección.");
    } finally {
      setGuardandoCalidad(false);
    }
  };

  const verificarPieza = async (piezaId: string, nuevoEstado: "verificada" | "liberada" | "rechazada") => {
    try {
      const { error } = await supabase.rpc("verificar_pieza_terminada", {
        _pieza_id: piezaId,
        _nuevo_estado: nuevoEstado,
      });
      if (error) throw error;
      toast.success(nuevoEstado === "verificada" ? "Pieza verificada." : nuevoEstado === "liberada" ? "Pieza liberada." : "Pieza rechazada.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pedidos-piezas", id] }),
        queryClient.invalidateQueries({ queryKey: ["pedidos-op", id] }),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la pieza.");
    }
  };

  const transicionar = async (nuevoEstado: string) => {
    if (!ordenPrincipal || transicionando) return;
    setTransicionando(true);
    try {
      const { error } = await supabase.rpc("transicionar_orden_produccion", {
        _orden_id: ordenPrincipal.id,
        _nuevo_estado: nuevoEstado,
      });
      if (error) throw error;
      toast.success(`Orden ${ordenPrincipal.numero}: ${nuevoEstado.replaceAll("_", " ")}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pedidos-op", id] }),
        queryClient.invalidateQueries({ queryKey: ["pedidos-trabajos", id] }),
        queryClient.invalidateQueries({ queryKey: ["pedidos-qc", id] }),
        queryClient.invalidateQueries({ queryKey: ["pedidos-piezas", id] }),
        queryClient.invalidateQueries({ queryKey: ["pedidos"] }),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar el estado de la orden.");
    } finally {
      setTransicionando(false);
    }
  };

  if (!pedido) {
    return <AppShell titulo="Pedido"><div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No se encontró el pedido.</div></AppShell>;
  }

  const estado = pedido.estado;
  const dias = pedido.fecha_entrega ? Math.ceil((new Date(pedido.fecha_entrega).getTime() - new Date().setHours(0,0,0,0)) / 86400000) : null;
  const alertas = [
    dias !== null && dias < 0 && !esEstadoFinalPedido(estado) ? "La fecha prometida está vencida." : null,
    !pedido.cliente ? "El pedido no tiene cliente asociado." : null,
    trabajos.length === 0 && estado === "En Producción" ? "Está en producción pero no tiene trabajos registrados." : null,
    ordenes.length === 0 && estado === "En Producción" ? "Está en producción pero no tiene orden de producción." : null,
  ].filter(Boolean) as string[];

  return (
    <AppShell
      titulo={pedido.referencia}
      subtitulo={pedido.cliente ? `${pedido.cliente} · ${pedido.sede_nombre ?? "Sede"}` : "Pedido sin cliente asociado"}
      acciones={<div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => navigate({ to: "/pedidos" })} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold"><ArrowLeft className="size-4" /> Pedidos</button>{estado === "Listo para Entrega" ? <Link to="/ventas-2/$id" params={{ id }} className="rounded-xl bg-gold px-3 py-2.5 text-xs font-bold text-black">Ir a Ventas</Link> : null}</div>}
    >
      <section className="overflow-hidden rounded-[26px] border border-gold/20 bg-card shadow-raised">
        <div className="relative p-5 sm:p-7">
          <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${estadoClases[estado] ?? "bg-surface-muted text-muted-foreground"}`}>{estado}</span>{pedido.area_actual ? <span className="rounded-full bg-surface-muted px-3 py-1 text-[10px] font-semibold">{pedido.area_actual}</span> : null}{dias !== null && dias < 0 && !esEstadoFinalPedido(estado) ? <span className="rounded-full bg-danger-soft px-3 py-1 text-[10px] font-bold text-danger">Atrasado</span> : null}</div>
              <h2 className="mt-4 font-display text-3xl tracking-tight sm:text-4xl">{pedido.trabajo || pedido.pieza || "Pedido"}</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{pedido.notas || "Sin notas generales."}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[520px]"><Dato label="Ingreso" value={fmtFecha(pedido.fecha_ingreso) || "—"} /><Dato label="Entrega" value={fmtFecha(pedido.fecha_entrega) || "—"} /><Dato label="Sede" value={pedido.sede_nombre || "—"} /><Dato label="Cantidad" value={String(pedido.cantidad_piezas ?? "—")} /></div>
          </div>
        </div>
        {alertas.length ? <div className="border-t border-warning/20 bg-warning-soft/50 px-5 py-3 sm:px-7"><div className="flex flex-wrap gap-2">{alertas.map((a) => <span key={a} className="inline-flex items-center gap-2 text-xs font-semibold text-warning"><AlertTriangle className="size-3.5" /> {a}</span>)}</div></div> : null}
      </section>

      <div className="mt-5 flex gap-1 overflow-x-auto rounded-xl bg-surface-muted p-1">
        {([["resumen","Resumen",ClipboardList],["produccion","Producción",Factory],["comercial","Comercial",UserRound],["archivos","Archivos",FileText],["historial","Historial",History]] as const).map(([idTab,label,Icon]) => <button key={idTab} type="button" onClick={() => setTab(idTab)} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold ${tab === idTab ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"}`}><Icon className="size-4" />{label}</button>)}
      </div>

      {tab === "resumen" ? <Resumen pedido={pedido} trabajos={trabajos} ordenes={ordenes} controles={controles} piezas={piezas} dias={dias} ruta={ruta} puedeEditarRuta={Boolean(sesion?.esAdmin && !ordenPrincipal)} guardandoRuta={guardandoRuta} toggleRuta={(area) => setRuta((actual) => actual.includes(area) ? actual.filter((x) => x !== area) : [...actual, area])} guardarRuta={async () => { if (!pedido || !sesion?.esAdmin) return; if (!ruta.length) { toast.error("Selecciona al menos un área de la ruta."); return; } if (ordenPrincipal) { toast.error("La ruta ya no puede modificarse porque la producción ya fue preparada."); return; } setGuardandoRuta(true); const { error } = await supabase.from("pedidos").update({ ruta, updated_at: new Date().toISOString() }).eq("id", pedido.id); setGuardandoRuta(false); if (error) { toast.error(error.message || "No se pudo guardar la ruta."); return; } await queryClient.invalidateQueries({ queryKey: ["pedidos"] }); toast.success("Ruta de fabricación guardada."); }} /> : null}
      {tab === "produccion" ? <Produccion trabajos={trabajos} ordenes={ordenes} controles={controles} piezas={piezas} costo={resumenCosto} loading={loadingTrabajos} ordenPrincipal={ordenPrincipal} trabajosCompletos={trabajosCompletos} piezaVerificada={piezaVerificada} calidadFinalAprobada={calidadFinalAprobada} transicionando={transicionando} transicionar={transicionar} verificarPieza={verificarPieza} puedeAsignarResponsable={Boolean(sesion?.esAdmin)} operarios={operarios} participantesServicio={participantesServicio} capacidadesSede={capacidadesSede} capacidadesSedeError={capacidadesSedeError} operariosError={operariosError?.message ?? participantesServicioError?.message ?? null} asignandoTrabajoId={asignandoTrabajoId} asignarResponsable={asignarResponsable} asignarParticipanteExterno={asignarParticipanteExterno} resultadoCalidad={resultadoCalidad} setResultadoCalidad={setResultadoCalidad} tipoCalidad={tipoCalidad} setTipoCalidad={setTipoCalidad} descripcionCalidad={descripcionCalidad} setDescripcionCalidad={setDescripcionCalidad} motivoCalidad={motivoCalidad} setMotivoCalidad={setMotivoCalidad} guardandoCalidad={guardandoCalidad} registrarCalidad={registrarCalidad} cantidadRequerida={pedido.cantidad_piezas ?? 1} preparandoProduccion={preparandoProduccion} prepararProduccion={prepararProduccion} /> : null}
      {tab === "comercial" ? <Comercial pedido={pedido} contrato={contratoFinanciero} pagos={pagosContrato} /> : null}
      {tab === "archivos" ? <Archivos archivos={archivos} /> : null}
      {tab === "historial" ? <Historial eventos={eventos} movimientos={movimientos} /> : null}
    </AppShell>
  );
}

function Dato({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-surface-muted px-3 py-3"><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold truncate">{value}</p></div>; }

function Resumen({ pedido, trabajos, ordenes, controles, piezas, dias, ruta, puedeEditarRuta, guardandoRuta, toggleRuta, guardarRuta }: { pedido: any; trabajos: any[]; ordenes: any[]; controles: any[]; piezas: any[]; dias: number | null; ruta: string[]; puedeEditarRuta: boolean; guardandoRuta: boolean; toggleRuta: (area: string) => void; guardarRuta: () => Promise<void> }) {
  const completados = trabajos.filter((t) => t.estado === "completado").length;
  const rechazadas = piezas.filter((p) => p.estado === "rechazada").length;
  const piezasValidas = piezas.filter((p) => ["verificada", "liberada"].includes(p.estado));
  const cantidadRequerida = Math.max(1, Number(pedido.cantidad_piezas) || 1);
  const cantidadVerificada = piezasValidas.reduce((sum, p) => sum + Number(p.cantidad || 1), 0);
  const avanceTrabajos = trabajos.length ? Math.round((completados / trabajos.length) * 100) : 0;
  const avancePiezas = Math.min(100, Math.round((cantidadVerificada / cantidadRequerida) * 100));
  const avanceGeneral = Math.round((avanceTrabajos + avancePiezas) / 2);
  const ultimaCalidad = controles[0];
  const op = ordenes[0];

  const siguienteAccion =
    op?.estado === "borrador" ? "Enviar la orden a producción" :
    op?.estado === "liberada" ? "Iniciar la producción" :
    op?.estado === "pausada" ? "Reanudar la producción" :
    op?.estado === "en_produccion" && !completados ? "Completar las operaciones pendientes" :
    op?.estado === "en_produccion" ? "Enviar la orden a control de calidad" :
    op?.estado === "control_calidad" && !cantidadVerificada ? "Verificar las piezas terminadas" :
    op?.estado === "control_calidad" ? "Registrar la inspección final" :
    pedido.estado === "Listo para Entrega" ? "Continuar con la entrega" :
    "Revisar el siguiente paso del pedido";

  const estadoEntrega = dias === null ? "Sin fecha definida" : dias < 0 ? "Fecha vencida" : dias === 0 ? "Entrega hoy" : `Entrega en ${dias} días`;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-raised">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">Estado operativo</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-3xl tracking-tight">{avanceGeneral}%</span>
              <span className="text-sm text-muted-foreground">avance estimado del pedido</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${avanceGeneral}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-gold/20 bg-gold/[.06] px-4 py-3 lg:min-w-[320px]">
            <p className="text-[9px] font-bold uppercase tracking-[.16em] text-gold-deep">Próxima acción</p>
            <p className="mt-1 text-sm font-semibold">{siguienteAccion}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <Dato label="Producción" value={`${completados}/${trabajos.length} operaciones`} />
          <Dato label="Piezas" value={`${cantidadVerificada}/${cantidadRequerida} verificadas`} />
          <Dato label="Entrega" value={estadoEntrega} />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Mini icon={Factory} title="Producción" value={op?.estado || "No configurada"} detail={`${avanceTrabajos}% de operaciones completadas`} />
        <Mini icon={PackageCheck} title="Calidad" value={ultimaCalidad?.resultado || "Pendiente"} detail={ultimaCalidad ? `${ultimaCalidad.tipo} · ${fmtFecha(ultimaCalidad.created_at)}` : "Aún no hay inspecciones"} />
        <Mini icon={Box} title="Piezas" value={`${cantidadVerificada}/${cantidadRequerida}`} detail={rechazadas ? `${rechazadas} rechazada(s)` : "Sin piezas rechazadas"} />
        <Mini icon={CalendarClock} title="Entrega" value={dias === null ? "Sin fecha" : dias < 0 ? "Atrasado" : dias === 0 ? "Hoy" : `${dias} días`} detail={fmtFecha(pedido.fecha_entrega) || "Fecha pendiente"} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[.16em]">Ficha técnica</h3>
            <p className="mt-1 text-xs text-muted-foreground">Especificaciones principales con las que debe trabajar el taller.</p>
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground">{pedido.sede_nombre || "Taller no asignado"}</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Dato label="Trabajo / pieza" value={pedido.trabajo || pedido.pieza || "—"} />
          <Dato label="Material" value={pedido.material || "—"} />
          <Dato label="Piedras" value={pedido.piedras || "—"} />
          <Dato label="Talla" value={pedido.talla || "—"} />
          <Dato label="Peso estimado" value={pedido.peso_estimado ? `${pedido.peso_estimado} g` : "—"} />
          <Dato label="Cantidad" value={String(pedido.cantidad_piezas ?? "—")} />
          <Dato label="Origen" value={pedido.origen || "—"} />
          <Dato label="Taller / sede" value={pedido.sede_nombre || "—"} />
        </div>
      </section>

      <section className="rounded-2xl border border-gold/20 bg-card p-5 shadow-raised">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[.16em]">Ruta de fabricación</h3>
            <p className="mt-1 text-xs text-muted-foreground">Define las áreas que deberán intervenir en esta joya antes de preparar la producción.</p>
          </div>
          {ruta.length ? <span className="rounded-full bg-gold/10 px-2.5 py-1 text-[10px] font-bold text-gold-deep">{ruta.length} {ruta.length === 1 ? "área" : "áreas"}</span> : <span className="rounded-full bg-warning-soft px-2.5 py-1 text-[10px] font-bold text-warning">Ruta pendiente</span>}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {["Diseño 3D", "Impresión 3D", "Casting", "Corte Láser", "Taller"].map((area) => (
            <button key={area} type="button" disabled={!puedeEditarRuta} onClick={() => toggleRuta(area)}
              className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-70 ${ruta.includes(area) ? "border-gold bg-gold/10 text-foreground" : "border-border bg-background text-muted-foreground hover:bg-surface-muted"}`}>
              <span>{area}</span>{ruta.includes(area) ? <CheckCircle2 className="size-4 text-gold" /> : null}
            </button>
          ))}
        </div>
        {ruta.length ? <div className="mt-4 rounded-xl bg-surface-muted p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Orden de recorrido</p><p className="mt-1 text-xs font-semibold">{ruta.map((area, index) => `${index + 1}. ${area}`).join("  →  ")}</p></div> : <p className="mt-4 rounded-xl border border-warning/20 bg-warning-soft/50 p-3 text-xs text-warning">Este pedido aún no tiene una ruta de fabricación. Debes definirla antes de preparar la producción.</p>}
        {puedeEditarRuta ? <div className="mt-4 flex justify-end"><button type="button" disabled={guardandoRuta || !ruta.length} onClick={() => void guardarRuta()} className="rounded-xl bg-gold px-4 py-2.5 text-xs font-bold text-gold-foreground disabled:cursor-not-allowed disabled:opacity-50">{guardandoRuta ? "Guardando ruta…" : "Guardar ruta"}</button></div> : null}
        {!puedeEditarRuta && ordenes.length ? <p className="mt-3 text-[10px] text-muted-foreground">La ruta queda bloqueada después de preparar la producción para conservar la trazabilidad.</p> : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[.16em]">Avance de fabricación</h3>
              <p className="mt-1 text-xs text-muted-foreground">Seguimiento de operaciones y piezas, separado para no ocultar cuellos de botella.</p>
            </div>
            <Factory className="size-5 text-gold" />
          </div>
          <div className="mt-5 space-y-4">
            <ProgressRow label="Operaciones" value={avanceTrabajos} detail={`${completados} de ${trabajos.length} completadas`} />
            <ProgressRow label="Piezas verificadas" value={avancePiezas} detail={`${cantidadVerificada} de ${cantidadRequerida} requeridas`} />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">Control del pedido</p>
          <div className="mt-4 space-y-3">
            <ControlLine label="Orden de producción" value={op?.numero || "Pendiente"} ok={Boolean(op)} />
            <ControlLine label="Calidad final" value={calidadFinalResumen(controles)} ok={controles.some((c) => c.tipo === "inspeccion_final" && c.resultado === "aprobado")} />
            <ControlLine label="Piezas" value={`${cantidadVerificada}/${cantidadRequerida} verificadas`} ok={cantidadVerificada >= cantidadRequerida} />
            <ControlLine label="Taller" value={pedido.sede_nombre || "No asignado"} ok={Boolean(pedido.sede_nombre)} />
          </div>
        </div>
      </section>
    </div>
  );
}

function ProgressRow({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold">{label}</span><span className="text-xs font-bold">{value}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div><p className="mt-1 text-[10px] text-muted-foreground">{detail}</p></div>;
}

function ControlLine({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted px-3 py-2.5"><div><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-0.5 text-xs font-semibold">{value}</p></div><span className={`size-2 rounded-full ${ok ? "bg-emerald-500" : "bg-gold"}`} /></div>;
}

function calidadFinalResumen(controles: any[]) {
  const final = controles.find((c) => c.tipo === "inspeccion_final");
  return final?.resultado || "Pendiente";
}

function Mini({ icon: Icon, title, value, detail }: { icon: typeof Factory; title: string; value: string; detail: string }) { return <div className="rounded-2xl border border-border bg-card p-5"><Icon className="size-5 text-gold" /><p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p><p className="mt-1 text-base font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>; }

function Produccion({ trabajos, ordenes, controles, piezas, costo, loading, ordenPrincipal, trabajosCompletos, piezaVerificada, calidadFinalAprobada, transicionando, transicionar, verificarPieza, puedeAsignarResponsable, operarios, participantesServicio, capacidadesSede, capacidadesSedeError, operariosError, asignandoTrabajoId, asignarResponsable, asignarParticipanteExterno, resultadoCalidad, setResultadoCalidad, tipoCalidad, setTipoCalidad, descripcionCalidad, setDescripcionCalidad, motivoCalidad, setMotivoCalidad, guardandoCalidad, registrarCalidad, cantidadRequerida, preparandoProduccion, prepararProduccion }: { trabajos: any[]; ordenes: any[]; controles: any[]; piezas: any[]; costo: any; loading: boolean; ordenPrincipal: any; trabajosCompletos: boolean; piezaVerificada: boolean; calidadFinalAprobada: boolean; transicionando: boolean; transicionar: (estado: string) => Promise<void>; verificarPieza: (id: string, estado: "verificada"|"liberada"|"rechazada") => Promise<void>; puedeAsignarResponsable: boolean; operarios: { id: string; nombre: string; areas: string[] }[]; participantesServicio: { id: string; nombre: string; tipo_participante?: string | null; especialidad?: string | null }[]; capacidadesSede: { id: string; nombre: string }[]; capacidadesSedeError: Error | null; operariosError: string | null; asignandoTrabajoId: string | null; asignarResponsable: (trabajoId: string, responsableUserId: string | null) => Promise<void>; asignarParticipanteExterno: (trabajoId: string, participanteId: string | null) => Promise<void>; resultadoCalidad: string; setResultadoCalidad: (v:string)=>void; tipoCalidad:string; setTipoCalidad:(v:string)=>void; descripcionCalidad:string; setDescripcionCalidad:(v:string)=>void; motivoCalidad:string; setMotivoCalidad:(v:string)=>void; guardandoCalidad:boolean; registrarCalidad:()=>Promise<void>; cantidadRequerida:number; preparandoProduccion:boolean; prepararProduccion:()=>Promise<void> }) {
  return <div className="space-y-5">
    {loading ? <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Cargando producción…</div> : null}
    {ordenPrincipal ? <section className="rounded-2xl border border-gold/20 bg-card p-5 shadow-raised"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">Control de producción</p><p className="mt-1 text-sm font-semibold">{ordenPrincipal.numero} · {ordenPrincipal.estado}</p><p className="mt-1 text-xs text-muted-foreground">{trabajosCompletos ? "Todos los trabajos están completados." : `${trabajos.filter((t) => t.estado === "completado").length}/${trabajos.length} trabajos completados`}{calidadFinalAprobada ? " · Calidad final aprobada." : ""}{piezaVerificada ? " · Pieza verificada/liberada." : ""}</p></div><div className="flex flex-wrap gap-2">{ordenPrincipal.estado === "borrador" ? <button type="button" disabled={transicionando} onClick={() => void transicionar("liberada")} className="rounded-xl bg-gold px-4 py-2.5 text-xs font-bold text-black disabled:opacity-50">Enviar a producción</button> : null}{ordenPrincipal.estado === "liberada" ? <button type="button" disabled={transicionando} onClick={() => void transicionar("en_produccion")} className="rounded-xl bg-gold px-4 py-2.5 text-xs font-bold text-black disabled:opacity-50">Iniciar producción</button> : null}{ordenPrincipal.estado === "pausada" ? <button type="button" disabled={transicionando} onClick={() => void transicionar("en_produccion")} className="rounded-xl bg-gold px-4 py-2.5 text-xs font-bold text-black disabled:opacity-50">Reanudar producción</button> : null}{ordenPrincipal.estado === "en_produccion" ? <button type="button" disabled={transicionando} onClick={() => void transicionar("pausada")} className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold disabled:opacity-50">Pausar</button> : null}{ordenPrincipal.estado === "en_produccion" ? <button type="button" disabled={transicionando || !trabajosCompletos} onClick={() => void transicionar("control_calidad")} className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-xs font-bold text-gold-deep disabled:cursor-not-allowed disabled:opacity-50">Enviar a calidad</button> : null}{ordenPrincipal && trabajos.length === 0 ? <button type="button" disabled={preparandoProduccion} onClick={() => void prepararProduccion()} className="rounded-xl border border-warning/30 bg-warning-soft/60 px-4 py-2.5 text-xs font-bold text-warning disabled:opacity-50">{preparandoProduccion ? "Reparando…" : "Generar operaciones"}</button> : null}</div></div></section> : <section className="rounded-2xl border border-gold/20 bg-card p-5 shadow-raised"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-gold-deep">Producción pendiente de preparar</p><p className="mt-1 text-sm font-semibold">El pedido aún no tiene una orden de producción.</p><p className="mt-1 text-xs text-muted-foreground">Se crearán la OP, las operaciones de la ruta y las piezas requeridas en una sola operación.</p></div><button type="button" disabled={preparandoProduccion} onClick={() => void prepararProduccion()} className="rounded-xl bg-gold px-4 py-2.5 text-xs font-bold text-black disabled:opacity-50">{preparandoProduccion ? "Preparando…" : "Preparar producción"}</button></div></section>}
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[.16em]">Trabajos</h3>
          <p className="mt-1 text-xs text-muted-foreground">{trabajos.length} operaciones registradas · cada operación tiene un responsable concreto</p>
        </div>
        <Factory className="size-5 text-gold" />
      </div>
      <div className="mt-4 space-y-2">
        {trabajos.length ? trabajos.map((t) => {
          const operariosDelArea = operarios.filter((operario) =>
            operario.areas.some((area) => areaCoincide(area, t.area)),
          );
          const tieneCapacidadInterna = capacidadesSede.some((capacidad) => areaCoincide(capacidad.nombre, t.area));
          const externosCompatibles = participantesServicio.filter((p) =>
            (p.especialidad || "").split(" · ").some((e) => areaCoincide(e, t.area)),
          );
          const mostrarExternos = !tieneCapacidadInterna || Boolean(t.participante_id);
          return (
            <div key={t.id} className="flex flex-col gap-3 rounded-xl border border-border bg-surface-sunken p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t.titulo}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.area} · {t.prioridad || "normal"} · {t.estado}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[280px]"><label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Responsable de ejecución</label>{puedeAsignarResponsable ? <><select value={t.participante_id ? `externo:${t.participante_id}` : t.responsable_user_id ? `interno:${t.responsable_user_id}` : ""} disabled={asignandoTrabajoId === t.id} onChange={(e) => { const value=e.target.value; if (!value) { void asignarResponsable(t.id,null); return; } if (value.startsWith("externo:")) void asignarParticipanteExterno(t.id,value.slice(8)); else if (value.startsWith("interno:")) void asignarResponsable(t.id,value.slice(8)); }} className="min-h-10 rounded-xl border border-border bg-card px-3 text-sm disabled:opacity-60"><option value="">Sin asignar</option>{operariosDelArea.length > 0 ? <optgroup label={`Taller propio · ${t.area}`}>{operariosDelArea.map((operario) => <option key={`i-${operario.id}`} value={`interno:${operario.id}`}>{operario.nombre}</option>)}</optgroup> : null}{mostrarExternos && externosCompatibles.length > 0 ? <optgroup label="Participantes externos compatibles">{externosCompatibles.map((p) => <option key={`e-${p.id}`} value={`externo:${p.id}`}>{p.nombre} · {p.tipo_participante === "organizacion" ? "Organización / taller" : p.tipo_participante === "profesional" ? "Profesional" : p.tipo_participante === "servicio" ? "Servicio especializado" : p.tipo_participante === "proveedor" ? "Proveedor" : p.tipo_participante} · {p.especialidad}</option>)}</optgroup> : null}</select>{operariosDelArea.length === 0 ? <p className="text-[10px] text-warning">No hay operarios internos activos para {t.area}. Asigna un usuario con rol Operario y área {t.area} en Gestión → Usuarios, o selecciona un participante externo compatible del ecosistema.</p> : null}{operariosError ? <p className="text-[10px] text-danger">No se pudo consultar responsables: {operariosError}</p> : null}{mostrarExternos && externosCompatibles.length === 0 ? <p className="text-[10px] text-muted-foreground">No hay participantes externos con capacidad configurada para {t.area}.</p> : null}{tieneCapacidadInterna && !t.participante_id ? <p className="text-[10px] text-muted-foreground">Este taller tiene habilitada la capacidad {t.area}; la ejecución se gestiona internamente.</p> : null}{capacidadesSedeError ? <p className="text-[10px] text-danger">No se pudo consultar las capacidades del taller.</p> : null}{t.participante_id ? <p className="text-[10px] text-muted-foreground">El taller externo recibirá y repartirá internamente este servicio.</p> : null}</> : <p className="rounded-xl bg-surface-muted px-3 py-2.5 text-sm font-semibold">{t.participante_id ? "Servicio externo asignado" : t.responsable_user_id ? "Operario asignado" : "Sin asignar"}</p>}</div></div>
          );
        }) : <Empty text="No hay trabajos registrados." />}
      </div>
      {operarios.length > 0 ? (
        <p className="mt-3 text-[10px] text-muted-foreground">
          La lista muestra únicamente operarios activos de este taller; el sistema valida también que el operario tenga asignada el área de la operación.
        </p>
      ) : null}
    </section>
    <section className="rounded-2xl border border-border bg-card p-5"><h3 className="text-xs font-bold uppercase tracking-[.16em]">Órdenes de producción</h3><div className="mt-4 space-y-2">{ordenes.length ? ordenes.map((o) => <div key={o.id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">{o.numero}</p><p className="mt-1 text-xs text-muted-foreground">{o.estado} · Prioridad {o.prioridad || "normal"}</p></div><span className="text-xs text-muted-foreground">{o.fecha_planificada_fin ? fmtFecha(o.fecha_planificada_fin) : "Sin fecha planificada"}</span></div></div>) : <Empty text="No hay orden de producción." />}</div></section>
    {ordenPrincipal?.estado === "control_calidad" ? <section className="rounded-2xl border border-border bg-card p-5 shadow-raised"><div className="flex items-start justify-between gap-4"><div><h3 className="text-xs font-bold uppercase tracking-[.16em]">Control de calidad</h3><p className="mt-1 text-xs text-muted-foreground">Registra la inspección sobre la OP. Para aprobar la inspección final deben estar verificadas o liberadas las piezas requeridas.</p></div><CheckCircle2 className="size-5 text-gold" /></div><div className="mt-4 grid gap-3 md:grid-cols-3"><label className="text-xs font-semibold">Tipo<select value={tipoCalidad} onChange={(e)=>setTipoCalidad(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"><option value="inspeccion_final">Inspección final</option><option value="inspeccion_operacion">Inspección de operación</option><option value="reinspeccion">Reinspección</option></select></label><label className="text-xs font-semibold">Resultado<select value={resultadoCalidad} onChange={(e)=>setResultadoCalidad(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"><option value="aprobado">Aprobado</option><option value="observado">Observado</option><option value="rechazado">Rechazado</option><option value="pendiente">Pendiente</option></select></label><label className="text-xs font-semibold">Motivo<input value={motivoCalidad} onChange={(e)=>setMotivoCalidad(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm" placeholder="Motivo u observación"/></label></div><label className="mt-3 block text-xs font-semibold">Descripción<textarea value={descripcionCalidad} onChange={(e)=>setDescripcionCalidad(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm" placeholder="Hallazgos y criterios revisados."/></label><div className="mt-4 flex justify-end"><button type="button" disabled={guardandoCalidad} onClick={()=>void registrarCalidad()} className="rounded-xl bg-gold px-4 py-2.5 text-xs font-bold text-black disabled:opacity-50">{guardandoCalidad ? "Registrando…" : "Registrar inspección"}</button></div></section> : null}
    <section className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-4"><div><h3 className="text-xs font-bold uppercase tracking-[.16em]">Verificación de piezas</h3><p className="mt-1 text-xs text-muted-foreground">Requeridas: {cantidadRequerida} · Verificadas/liberadas: {piezas.filter((p)=>["verificada","liberada"].includes(p.estado)).reduce((sum,p)=>sum+Number(p.cantidad||1),0)}</p></div><PackageCheck className="size-5 text-gold"/></div><div className="mt-4 space-y-2">{piezas.length ? piezas.map((p)=><div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"><div><p className="text-sm font-semibold">Pieza {p.numero_pieza}</p><p className="text-xs text-muted-foreground">{p.estado} · {p.peso_final ? `${p.peso_final} g` : "Peso final pendiente"}</p></div><div className="flex gap-2">{["pendiente","recibida"].includes(p.estado) ? <button type="button" onClick={()=>void verificarPieza(p.id,"verificada")} className="rounded-lg bg-gold px-3 py-2 text-[11px] font-bold text-black">Verificar</button> : null}{p.estado==="verificada" ? <button type="button" onClick={()=>void verificarPieza(p.id,"liberada")} className="rounded-lg border border-gold/40 px-3 py-2 text-[11px] font-bold text-gold-deep">Liberar</button> : null}{!["rechazada","liberada"].includes(p.estado) ? <button type="button" onClick={()=>void verificarPieza(p.id,"rechazada")} className="rounded-lg border border-danger/30 px-3 py-2 text-[11px] font-bold text-danger">Rechazar</button> : null}</div></div>) : <Empty text="Sin piezas registradas."/>}</div></section>
    <div className="grid gap-4 md:grid-cols-2"><section className="rounded-2xl border border-border bg-card p-5"><h3 className="text-xs font-bold uppercase tracking-[.16em]">Resumen de calidad</h3><div className="mt-4 space-y-2">{controles.length ? controles.slice(0,5).map((c)=><div key={c.id} className="rounded-xl border border-border p-3"><div className="flex justify-between gap-3"><span className="text-xs font-semibold">{c.tipo}</span><span className="text-[10px] font-bold uppercase">{c.resultado}</span></div><p className="mt-1 text-xs text-muted-foreground">{c.descripcion || c.motivo || "Sin observaciones"}</p></div>) : <Empty text="Sin inspecciones."/>}</div></section><section className="rounded-2xl border border-border bg-card p-5"><h3 className="text-xs font-bold uppercase tracking-[.16em]">Piezas terminadas</h3><p className="mt-1 text-xs text-muted-foreground">Seguimiento físico de las piezas antes de liberar la orden.</p><div className="mt-4 text-xs text-muted-foreground">{piezas.length ? `${piezas.filter((p)=>["verificada","liberada"].includes(p.estado)).length}/${piezas.length} verificadas o liberadas` : "Sin piezas registradas."}</div></section></div>
    {costo ? <section className="rounded-2xl border border-border bg-card p-5"><h3 className="text-xs font-bold uppercase tracking-[.16em]">Costeo real</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Dato label="Materiales" value={money(costo.costo_materiales,costo.moneda)} /><Dato label="Mano de obra" value={money(costo.costo_mano_obra,costo.moneda)} /><Dato label="Costo real" value={money(costo.costo_real,costo.moneda)} /><Dato label="Margen" value={money(costo.margen,costo.moneda)} /></div></section> : null}
  </div>;
}
function comercialObjeto(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" && !Array.isArray(valor) ? valor as Record<string, unknown> : {};
}

function comercialLista(valor: unknown): Array<Record<string, unknown>> {
  return Array.isArray(valor) ? valor.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function comercialNumero(valor: unknown, fallback = 0) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : fallback;
}

function Comercial({ pedido, contrato, pagos = [] }: { pedido: any; contrato: any; pagos?: any[] }) {
  const especificaciones = comercialObjeto(pedido.especificaciones_comerciales);
  const detalles = comercialLista(pedido.cotizacion_detalles);
  const subtotal = comercialNumero(especificaciones.subtotal, comercialNumero(pedido.importe));
  const descuento = comercialNumero(especificaciones.descuento);
  const impuestos = comercialNumero(especificaciones.impuestos);
  const totalSnapshot = comercialNumero(especificaciones.total, comercialNumero(pedido.importe));
  const total = contrato ? comercialNumero(contrato.total, totalSnapshot) : totalSnapshot;
  const pagosTotal = pagos.reduce((suma: number, pago: any) => suma + comercialNumero(pago.monto), 0);
  const pagado = pagos.length > 0 ? pagosTotal : contrato ? comercialNumero(contrato.abonado) : comercialNumero(especificaciones.anticipo, comercialNumero(pedido.a_cuenta));
  const saldo = Math.max(0, total - pagado);
  const estadoPago = saldo <= 0 && total > 0 ? "Pagado" : pagado > 0 ? "Pago parcial" : "Pendiente";
  const cotizacion = typeof especificaciones.cotizacion_numero === "string" ? especificaciones.cotizacion_numero : "";
  const version = especificaciones.cotizacion_version;
  const moneda = typeof especificaciones.moneda === "string" && especificaciones.moneda ? especificaciones.moneda : "PEN";
  const identidad = typeof especificaciones.identidad_comercial === "string" ? especificaciones.identidad_comercial : "";

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <UserRound className="size-5 text-gold" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[.16em]">Relación comercial</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {cotizacion ? `Snapshot de la cotización ${cotizacion}${version ? ` · v${version}` : ""}` : "Pedido registrado sin cotización vinculada"}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Dato label="Cliente" value={pedido.cliente || "Sin cliente"} />
          <Dato label="Cotización" value={cotizacion ? `${cotizacion}${version ? ` · v${version}` : ""}` : "—"} />
          <Dato label="Contrato" value={pedido.contrato || "Sin contrato"} />
          <Dato label="Origen" value={pedido.origen || "—"} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Dato label="Taller / sede" value={pedido.sede_nombre || "—"} />
          <Dato label="Identidad comercial" value={identidad || "—"} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <FileText className="size-5 text-gold" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[.16em]">Resumen económico</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">Valores conservados desde la información comercial del pedido.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Dato label="Subtotal" value={money(subtotal, moneda)} />
          <Dato label="Descuento" value={money(descuento, moneda)} />
          <Dato label="Impuestos" value={money(impuestos, moneda)} />
          <Dato label="Total" value={money(total, moneda)} />
          <Dato label="Pagado" value={money(pagado, moneda)} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Dato label="Saldo pendiente" value={money(saldo, moneda)} />
          <Dato label="Estado de pago" value={estadoPago} />
        </div>
      </section>

      {detalles.length ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[.16em]">Detalle de la cotización</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">{detalles.length} partida(s) conservadas en el pedido.</p>
            </div>
            <ClipboardList className="size-5 text-gold" />
          </div>
          <div className="mt-4 space-y-2">
            {detalles.map((detalle, index) => {
              const descripcion = typeof detalle.descripcion === "string" ? detalle.descripcion : `Partida ${index + 1}`;
              const cantidad = comercialNumero(detalle.cantidad, 1);
              const unidad = typeof detalle.unidad === "string" ? detalle.unidad : "";
              const precio = comercialNumero(detalle.total_precio, comercialNumero(detalle.precio_unitario));
              return (
                <div key={String(detalle.id ?? index)} className="grid gap-2 rounded-xl border border-border bg-surface-sunken p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                  <div><p className="text-xs font-semibold">{descripcion}</p><p className="mt-1 text-[10px] text-muted-foreground">{cantidad} {unidad}</p></div>
                  <span className="text-[10px] font-semibold text-muted-foreground">{detalle.tipo ? String(detalle.tipo) : "Detalle"}</span>
                  <span className="text-xs font-bold">{money(precio, moneda)}</span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <p className="rounded-xl border border-border bg-surface-muted p-3 text-[10px] text-muted-foreground">
        Los datos comerciales heredados de una cotización se muestran como referencia del pedido y no modifican la trazabilidad operativa.
      </p>
    </div>
  );
}

function Archivos({ archivos }: { archivos: any[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[.16em]">Referencias y documentos</h3>
          <p className="mt-1 text-xs text-muted-foreground">{archivos.length} archivos registrados</p>
        </div>
        <FileText className="size-5 text-gold" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {archivos.map((a) => (
          <div key={a.id} className="overflow-hidden rounded-xl border border-border">
            <div className="grid aspect-[4/3] place-items-center bg-surface-muted">
              {a.poster ? <img src={a.poster} alt={a.nombre || ""} className="size-full object-contain" /> : <FileText className="size-8 text-muted-foreground" />}
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-semibold">{a.nombre}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{a.grupo || a.tipo || "Archivo"} · v{a.version ?? 1}{a.es_vigente_fabricacion ? " · Vigente" : ""}</p>
            </div>
          </div>
        ))}
      </div>
      {!archivos.length ? <Empty text="No hay referencias ni archivos registrados." /> : null}
    </section>
  );
}
function Historial({ eventos, movimientos }: { eventos: any[]; movimientos: any[] }) { const items = useMemo(() => [...eventos.map((e) => ({ id: e.id, fecha: e.created_at, tipo: "Producción", titulo: e.tipo, detalle: e.estado_anterior && e.estado_nuevo ? `${e.estado_anterior} → ${e.estado_nuevo}` : "Evento registrado", usuario: e.usuario_id })), ...movimientos.map((m) => ({ id: m.id, fecha: m.created_at, tipo: "Área", titulo: m.accion || "Movimiento", detalle: m.area_origen ? `${m.area_origen} → ${m.area_destino}` : m.area_destino, usuario: m.usuario_id }))].sort((a,b) => new Date(b.fecha).getTime()-new Date(a.fecha).getTime()), [eventos,movimientos]); return <section className="rounded-2xl border border-border bg-card p-5"><h3 className="text-xs font-bold uppercase tracking-[.16em]">Trazabilidad</h3><div className="mt-5 space-y-0">{items.length ? items.map((e) => <div key={`${e.tipo}-${e.id}`} className="relative border-l border-border pb-5 pl-5 last:pb-0"><span className="absolute -left-1.5 top-1 size-3 rounded-full bg-gold ring-4 ring-card" /><p className="text-sm font-semibold">{e.titulo}</p><p className="mt-1 text-xs text-muted-foreground">{e.detalle}</p><p className="mt-1 text-[10px] text-muted-foreground">{new Date(e.fecha).toLocaleString("es-PE")} · {e.usuario ? e.usuario.slice(0,8).toUpperCase() : "Sistema"}</p></div>) : <Empty text="Aún no hay eventos registrados." />}</div></section>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">{text}</div>; }
function money(value: number | null | undefined, currency = "PEN") { if (value == null || Number.isNaN(Number(value))) return "—"; return new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(Number(value)); }
