import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Boxes,
  ChevronRight,
  Gem,
  Hammer,
  LayoutGrid,
  PackageCheck,
  Scissors,
  Sparkles,
  Building2,
  Settings2,
  Wrench,
  Rocket,
  CheckCircle2,
  CircleAlert,
  Gift,
  UserRound,
  FileText,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell, Panel, useCapacidadesMenu } from "@/components/AppShell";
import { ResumenPlanComercial } from "@/components/ResumenPlanComercial";
import { TODAS_LAS_SEDES, SelectorSedeDueno, useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
import { supabase } from "@/integrations/supabase/client";
import {
  rolEtiqueta,
  useSesion,
} from "@/lib/auth";
import {
  esEstadoFinalPedido,
  pedidoEnRecepcion,
  usePedidosSelector,
  type PedidoSelector,
} from "@/lib/taller-db";

const AURUM_INDUCCION_VERSION = 1;

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "Inicio — Aurum Lab" },
      {
        name: "description",
        content: "Centro de control del ERP de joyería.",
      },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  const { data: sesion, isLoading } = useSesion();
  const { data: pedidos = [], isLoading: cargandoPedidos } = usePedidosSelector();
  const { data: capacidades = [] } = useCapacidadesMenu(sesion);
  const capacidadesSet = useMemo(() => new Set(capacidades), [capacidades]);
  const { esDueno, sedeFiltro, setSedeFiltro, sedes } = useSedeFiltroDueno();
  const sedeContextoId = esDueno
    ? (sedeFiltro === TODAS_LAS_SEDES ? null : sedeFiltro)
    : (sesion?.sede?.id ?? null);
  const { data: cumpleanos = [] } = useQuery({
    queryKey: ["inicio-cumpleanos", sesion?.participante?.id, sedeContextoId, esDueno],
    enabled: Boolean(sesion?.participante?.id),
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      let q = supabase
        .from("clientes")
        .select("id,nombre,fecha_nacimiento,sede_id,participante_id")
        .not("fecha_nacimiento", "is", null);

      if (!esDueno) q = q.eq("participante_id", sesion!.participante!.id);
      if (sedeContextoId) q = q.eq("sede_id", sedeContextoId);

      const { data, error } = await q;
      if (error) throw error;

      const t = new Date();
      t.setHours(0, 0, 0, 0);
      const leap = (y: number) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);

      return (data ?? [])
        .map((c) => {
          const [, m, d] = String(c.fecha_nacimiento).slice(0, 10).split("-").map(Number);
          const monthOfBirth = m ?? 1;
          let day = d ?? 1;
          if (monthOfBirth === 2 && day === 29 && !leap(t.getFullYear())) day = 28;
          let f = new Date(t.getFullYear(), monthOfBirth - 1, day);
          if (f < t) {
            const year = t.getFullYear() + 1;
            day = monthOfBirth === 2 && day === 29 && !leap(year) ? 28 : day;
            f = new Date(year, monthOfBirth - 1, day);
          }
          return { id: c.id, nombre: c.nombre, fecha: f, dias: Math.round((f.getTime() - t.getTime()) / 86400000) };
        })
        .filter((c) => c.dias <= 30)
        .sort((a, b) => a.dias - b.dias)
        .slice(0, 5);
    },
  });

  const { data: preparacion, isLoading: cargandoPreparacion } = useQuery({
    queryKey: ["inicio-preparacion", esDueno, sedeContextoId, sesion?.participante?.id],
    enabled: Boolean(sesion?.esAdmin && sedeContextoId),
    queryFn: async () => {
      if (!sedeContextoId) return null;

      const { data: participante, error: participanteError } = await supabase
        .from("ecosistema_participantes")
        .select("id")
        .eq("sede_id", sedeContextoId)
        .eq("estado", "activo")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (participanteError) throw participanteError;

      const [{ data: identidades, error: identidadError }, { data: capacidadesSede, error: capacidadesError }, { data: modalidades, error: modalidadesError }] = await Promise.all([
        participante
          ? supabase.from("identidades_comerciales").select("id, participante_id, nombre_comercial").eq("activa", true).eq("participante_id", participante.id)
          : Promise.resolve({ data: [], error: null }),
        supabase.from("sede_especialidades").select("especialidad_id").eq("sede_id", sedeContextoId),
        supabase.from("sede_modalidades").select("produccion_activa, servicios_externos_activos").eq("sede_id", sedeContextoId).maybeSingle(),
      ]);

      if (identidadError) throw identidadError;
      if (capacidadesError) throw capacidadesError;
      if (modalidadesError) throw modalidadesError;

      const produccionActiva = Boolean(modalidades?.produccion_activa);
      const serviciosExternosActivos = Boolean(modalidades?.servicios_externos_activos);

      return {
        tallerVinculado: Boolean(participante?.id),
        participanteId: participante?.id ?? null,
        identidadConfigurada: (identidades ?? []).length > 0,
        // Un taller puede trabajar sólo con servicios externos: en ese caso
        // no necesita capacidades internas, pero sí una modalidad activa.
        capacidadesConfiguradas: (capacidadesSede ?? []).length > 0 || serviciosExternosActivos,
        produccionActiva,
        serviciosExternosActivos,
      };
    },
  });

  const { data: primerosPasos, isLoading: cargandoPrimerosPasos, isError: errorPrimerosPasos } = useQuery({
    queryKey: ["inicio-primeros-pasos", sesion?.user?.id, sedeContextoId, esDueno],
    enabled: Boolean(sesion?.esAdmin && sesion?.participante?.id && (!esDueno || sedeContextoId)),
    queryFn: async () => {
      let clientesQuery = supabase.from("clientes").select("id", { count: "exact", head: true });
      let cotizacionesQuery = supabase.from("cotizaciones").select("id", { count: "exact", head: true });

      if (esDueno) {
        if (sedeContextoId) {
          clientesQuery = clientesQuery.eq("sede_id", sedeContextoId);
          cotizacionesQuery = cotizacionesQuery.eq("sede_id", sedeContextoId);
        }
      } else {
        clientesQuery = clientesQuery.eq("participante_id", sesion!.participante!.id);
        cotizacionesQuery = cotizacionesQuery.eq("participante_id", sesion!.participante!.id);
      }

      const [{ count: clientesCount, error: clientesError }, { count: cotizacionesCount, error: cotizacionesError }] = await Promise.all([
        clientesQuery,
        cotizacionesQuery,
      ]);
      if (clientesError) throw clientesError;
      if (cotizacionesError) throw cotizacionesError;

      return { clientes: clientesCount ?? 0, cotizaciones: cotizacionesCount ?? 0 };
    },
  });

  const pedidosSede = useMemo(
    () => (sedeContextoId ? pedidos.filter((pedido) => pedido.sede_id === sedeContextoId) : pedidos),
    [pedidos, sedeContextoId],
  );
  const navigate = useNavigate();
  const [mostrarBienvenida, setMostrarBienvenida] = useState(false);
  const [mostrarEstadoTaller, setMostrarEstadoTaller] = useState(false);
  const [pasoBienvenida, setPasoBienvenida] = useState(0);
  const [guardandoBienvenida, setGuardandoBienvenida] = useState(false);

  useEffect(() => {
    if (!sesion?.esAdmin || !sesion.user) return;
    const metadata = sesion.user.user_metadata ?? {};
    const version = Number(metadata["aurum_onboarding_version"] ?? 0);
    const requiereInduccion = version < AURUM_INDUCCION_VERSION;
    setPasoBienvenida(0);
    setMostrarBienvenida(requiereInduccion);
  }, [sesion]);

  useEffect(() => {
    if (isLoading || !sesion) return;
    if (sesion.rolPrincipal !== "operario" && !sesion.esAdmin) {
      navigate({ to: "/pedidos" });
      return;
    }
    if (sesion.rolPrincipal === "operario") {
      navigate({ to: "/operario", replace: true });
    }
  }, [isLoading, navigate, sesion]);

  const resumen = useMemo(() => {
    const activos = pedidosSede.filter((p) => !esEstadoFinalPedido(p.estado));
    const produccion = activos.filter((p) => p.estado === "En Producción");
    const recepcion = activos.filter((p) => pedidoEnRecepcion(p.estado));
    const vencidos = activos.filter((p) => {
      const dias = diasHastaEntrega(p);
      return dias !== null && dias < 0;
    });
    const hoy = activos.filter((p) => diasHastaEntrega(p) === 0);
    const urgentes = activos.filter(esUrgente);
    const atencion = [...activos]
      .filter((p) => esUrgente(p) || pedidoEnRecepcion(p.estado))
      .sort((a, b) => {
        // Prioridad operativa: vencidos, entrega hoy, mañana y luego recepción.
        const prioridad = (p: PedidoSelector) => {
          const dias = diasHastaEntrega(p);
          if (dias !== null && dias < 0) return 0;
          if (dias === 0) return 1;
          if (dias === 1) return 2;
          if (pedidoEnRecepcion(p.estado)) return 3;
          return 4;
        };
        const pa = prioridad(a);
        const pb = prioridad(b);
        if (pa !== pb) return pa - pb;
        const da = diasHastaEntrega(a);
        const db = diasHastaEntrega(b);
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      });
    const sinFecha = activos.filter((p) => diasHastaEntrega(p) === null);
    return { activos, produccion, recepcion, vencidos, hoy, urgentes, atencion, sinFecha };
  }, [pedidosSede]);

  const cargaAreas = useMemo(() => {
    const todas = [
      ["Diseño 3D", LayoutGrid, "Diseño 3D"],
      ["Impresión", Boxes, "Impresión 3D"],
      ["Casting", Gem, "Casting"],
      ["Taller", Hammer, "Taller"],
      ["Corte Láser", Scissors, "Corte Láser"],
      ["Ventas", PackageCheck, "Ventas"],
    ] as const;
    return todas.filter(([, , capacidad]) => capacidadesSet.has(capacidad));
  }, [capacidadesSet]);

  // Los operarios usan exclusivamente /operario como bandeja única.



  const pasosBienvenida = useMemo(() => {
    return [
      {
        titulo: "Taller vinculado",
        texto: "La sede seleccionada pertenece a un taller activo del ecosistema.",
        listo: Boolean(preparacion?.tallerVinculado),
        destino: esDueno ? "/gestion?modulo=ecosistema" : "/gestion",
        accion: "Revisar taller",
        icono: Building2,
      },
      {
        titulo: "Capacidades definidas",
        texto: "Aurum Lab reconoce las capacidades internas guardadas para esta sede.",
        listo: Boolean(preparacion?.capacidadesConfiguradas),
        destino: "/gestion?modulo=capacidades",
        accion: "Configurar capacidades",
        icono: Hammer,
      },
      {
        titulo: "Modalidad de trabajo",
        texto: "La sede tiene Producción o Servicios externos activos.",
        listo: Boolean(preparacion?.produccionActiva || preparacion?.serviciosExternosActivos),
        destino: "/gestion?modulo=capacidades",
        accion: "Configurar modalidad",
        icono: Settings2,
      },
      {
        titulo: "Identidad comercial",
        texto: "Existe una identidad comercial activa perteneciente al taller seleccionado.",
        listo: Boolean(preparacion?.identidadConfigurada),
        destino: "/gestion?modulo=comercial",
        accion: "Configurar identidad",
        icono: Gem,
      },
      {
        titulo: "Primer pedido",
        texto: "Ya existe al menos un pedido asociado a esta sede.",
        listo: pedidosSede.length > 0,
        destino: "/pedidos/nuevo",
        accion: "Crear primer pedido",
        icono: Wrench,
      },
    ];
  }, [
    esDueno,
    pedidosSede.length,
    preparacion?.capacidadesConfiguradas,
    preparacion?.identidadConfigurada,
    preparacion?.produccionActiva,
    preparacion?.serviciosExternosActivos,
    preparacion?.tallerVinculado,
  ]);

  const cerrarBienvenida = async () => {
    if (!sesion?.user || guardandoBienvenida) return;
    setGuardandoBienvenida(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          aurum_onboarding_completed_at: new Date().toISOString(),
          aurum_onboarding_version: AURUM_INDUCCION_VERSION,
        },
      });
      if (error) throw error;
      setMostrarBienvenida(false);
    } catch (error) {
      console.error("[onboarding] No se pudo guardar el estado:", error);
      setMostrarBienvenida(false);
    } finally { setGuardandoBienvenida(false); }
  };

  const abrirBienvenida = () => {
    setPasoBienvenida(0);
    setMostrarBienvenida(true);
  };

  const irDesdeBienvenida = (destino: string) => {
    // Ir a una configuración no completa NO marca la inducción como terminada.
    // Al volver a Inicio, la guía seguirá disponible hasta completar o saltar la guía.
    void navigate({ to: destino as never });
  };

  return (
    <AppShell
      titulo="Centro de control"
      subtitulo={sesion?.sede?.nombre ? `Sede ${sesion.sede.nombre} · ${rolEtiqueta[sesion.rolPrincipal]}` : "Visión general del taller"}
      encabezadoMovilCompacto
    >
      <div className="space-y-5">
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">AURUM LAB · OPERACIONES</p>
              <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Resumen del taller</h2>
              <p className="mt-1 text-sm text-muted-foreground">{sesion?.sede?.nombre ? `Sede ${sesion.sede.nombre} · ${rolEtiqueta[sesion.rolPrincipal]}` : "Controla pedidos, producción y entregas desde un solo lugar."}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {esDueno ? (
                <SelectorSedeDueno esDueno={esDueno} sedes={sedes} value={sedeFiltro} onChange={setSedeFiltro} className="w-full sm:w-auto" />
              ) : null}
              <Link to="/pedidos/nuevo" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-bold text-gold-foreground shadow-card transition hover:shadow-raised">
                <Wrench className="size-4" /> Nuevo pedido
              </Link>
              <Link to="/herramientas" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold transition hover:border-gold/40 hover:bg-muted/40">
                Herramientas <ChevronRight className="size-4" />
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 border-t border-border sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "Pedidos activos", value: resumen.activos.length, note: "En seguimiento", tone: "text-foreground" },
              { label: "En producción", value: resumen.produccion.length, note: "Trabajo en curso", tone: "text-foreground" },
              { label: "En recepción", value: resumen.recepcion.length, note: "Por verificar", tone: "text-foreground" },
              { label: "Entregas hoy", value: resumen.hoy.length, note: "Compromiso de hoy", tone: resumen.hoy.length ? "text-gold-deep" : "text-foreground" },
              { label: "Vencidos", value: resumen.vencidos.length, note: "Requieren atención", tone: resumen.vencidos.length ? "text-danger" : "text-foreground" },
            ].map((item) => (
              <div key={item.label} className="border-b border-r border-border p-4 last:border-r-0 sm:p-5 lg:border-b-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
                <p className={`mt-2 font-display text-3xl font-semibold tabular-nums ${item.tone}`}>{cargandoPedidos ? "—" : item.value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{item.note}</p>
              </div>
            ))}
          </div>
        </section>

        {sesion?.esAdmin ? (
          <section className="rounded-2xl border border-gold/25 bg-card p-4 shadow-card sm:p-5">
            {esDueno && !sedeContextoId ? (
              <p className="text-xs text-muted-foreground">Selecciona una sede para consultar su activación sin mezclar datos.</p>
            ) : errorPrimerosPasos ? (
              <p className="text-xs text-muted-foreground">No se pudo consultar el avance de activación. El resto del panel sigue disponible.</p>
            ) : cargandoPrimerosPasos || cargandoPreparacion || cargandoPedidos ? (
              <p className="text-xs text-muted-foreground">Consultando la activación del taller…</p>
            ) : (
              (() => {
                const pasos = [
                  { titulo: "Identidad comercial", detalle: "Configura los datos de tus documentos.", listo: Boolean(preparacion?.identidadConfigurada), destino: "/gestion?modulo=comercial", accion: "Configurar", icono: Building2 },
                  { titulo: "Primer cliente", detalle: "Registra un contacto en tu cartera.", listo: (primerosPasos?.clientes ?? 0) > 0, destino: "/clientes", accion: "Registrar", icono: UserRound },
                  { titulo: "Primera cotización", detalle: "Prepara una propuesta comercial.", listo: (primerosPasos?.cotizaciones ?? 0) > 0, destino: "/cotizaciones", accion: "Crear", icono: FileText },
                  { titulo: "Primer pedido", detalle: "Inicia el seguimiento de un trabajo.", listo: pedidosSede.length > 0, destino: "/pedidos/nuevo", accion: "Crear", icono: Wrench },
                ];
                const completados = pasos.filter((paso) => paso.listo).length;
                const porcentaje = Math.round((completados / pasos.length) * 100);
                return (
                  <details className="group">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 [&::-webkit-details-marker]:hidden">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold-deep"><Rocket className="size-5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">Puesta en marcha del taller</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{completados} de {pasos.length} acciones completadas</span>
                      </span>
                      <span className="w-full min-w-28 flex-1 sm:max-w-48">
                        <span className="block h-2 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-gold transition-all" style={{ width: porcentaje + "%" }} /></span>
                      </span>
                      <span className="text-xs font-bold tabular-nums">{porcentaje}%</span>
                      <ChevronRight className="size-4 text-muted-foreground transition group-open:rotate-90" />
                    </summary>
                    <div className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-2 xl:grid-cols-4">
                      {pasos.map((paso) => {
                        const Icono = paso.icono;
                        return (
                          <Link key={paso.titulo} to={paso.destino as never} className="flex min-w-0 items-center gap-3 rounded-xl border border-border p-3 transition hover:border-gold/40 hover:bg-muted/30">
                            <span className={paso.listo ? "grid size-9 shrink-0 place-items-center rounded-lg bg-success/10 text-success" : "grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"}>
                              {paso.listo ? <CheckCircle2 className="size-4" /> : <Icono className="size-4" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-semibold">{paso.titulo}</span>
                              <span className="mt-0.5 block text-[10px] text-muted-foreground">{paso.listo ? "Completado" : paso.accion}</span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </details>
                );
              })()
            )}
          </section>
        ) : null}

        {sesion?.esAdmin ? (
          <section aria-label="Suscripción y consumo">
            <ResumenPlanComercial />
          </section>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">
          <Panel titulo="Pedidos que requieren atención" accion={<Link to="/pedidos" className="text-xs font-semibold text-gold hover:underline">Ver todos <ChevronRight className="inline size-3" /></Link>}>
            <div className="divide-y divide-border">
              {cargandoPedidos ? (
                <div className="p-6 text-sm text-muted-foreground">Cargando pedidos…</div>
              ) : resumen.atencion.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle2 className="mx-auto size-8 text-success" />
                  <p className="mt-3 text-sm font-semibold">Todo está bajo control</p>
                  <p className="mt-1 text-xs text-muted-foreground">No hay pedidos urgentes ni pendientes de recepción.</p>
                </div>
              ) : (
                resumen.atencion.slice(0, 6).map((pedido) => (
                  <Link key={pedido.id} to="/pedidos/$id" params={{ id: pedido.id }} search={{ from: undefined }} className="flex items-center justify-between gap-4 px-4 py-3.5 transition hover:bg-muted/40">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{pedido.referencia || pedido.pieza || pedido.trabajo || "Pedido sin referencia"}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{pedido.cliente || "Sin cliente"} · {pedido.estado}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={esUrgente(pedido) ? "text-xs font-bold text-danger" : "text-xs font-medium text-muted-foreground"}>{textoEntrega(pedido)}</p>
                      <ChevronRight className="ml-auto mt-1 size-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Panel>

          <Panel titulo="Prioridades de hoy">
            <div className="space-y-2 p-3">
              {[
                { label: "Entregas vencidas", value: resumen.vencidos.length, detail: "Revisar compromisos", tone: resumen.vencidos.length ? "text-danger bg-danger/10" : "text-success bg-success/10" },
                { label: "Entregas hoy", value: resumen.hoy.length, detail: "Preparar despachos", tone: "text-gold-deep bg-gold/10" },
                { label: "Pendientes de recepción", value: resumen.recepcion.length, detail: "Verificar ingresos", tone: "text-foreground bg-muted" },
                { label: "Sin fecha de entrega", value: resumen.sinFecha.length, detail: "Completar planificación", tone: "text-foreground bg-muted" },
              ].map((item) => (
                <Link key={item.label} to="/pedidos" className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:border-gold/40 hover:bg-muted/30">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-lg text-sm font-bold tabular-nums ${item.tone}`}>{item.value}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold">{item.label}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">{item.detail}</span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </Panel>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Panel titulo="Carga operativa por área">
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {cargaAreas.map(([area, Icono]) => {
                const cantidad = pedidosSede.filter((p) => p.area_actual === area && !esEstadoFinalPedido(p.estado)).length;
                const destinos: Record<string, string> = {
                  "Diseño 3D": "/diseno-3d",
                  "Impresión 3D": "/impresion-3d",
                  Casting: "/casting",
                  Taller: "/taller",
                  "Corte Láser": "/corte-laser",
                  Ventas: "/ventas",
                };
                return (
                  <Link key={area} to={destinos[area] as never} className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:border-gold/40 hover:bg-muted/30">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gold/10 text-gold-deep"><Icono className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold">{area}</span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">{cantidad === 0 ? "Sin carga activa" : cantidad === 1 ? "1 pedido en curso" : cantidad + " pedidos en curso"}</span>
                    </span>
                    <span className="font-display text-xl font-semibold tabular-nums">{cantidad}</span>
                  </Link>
                );
              })}
              {cargaAreas.length === 0 ? <p className="col-span-full p-4 text-xs text-muted-foreground">No hay áreas internas configuradas para esta sede.</p> : null}
            </div>
          </Panel>

          <div className="space-y-5">
            {sesion?.esAdmin ? (
              <section className="rounded-2xl border border-border bg-card shadow-card">
                <div className="flex items-center justify-between gap-3 border-b border-border p-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Configuración</p>
                    <h2 className="mt-1 text-sm font-semibold">Preparación de la sede</h2>
                  </div>
                  <button type="button" onClick={() => setMostrarEstadoTaller((visible) => !visible)} aria-expanded={mostrarEstadoTaller} aria-controls="estado-preparacion-taller" className="text-xs font-semibold text-gold-deep hover:underline">
                    {mostrarEstadoTaller ? "Ocultar" : "Revisar"}
                  </button>
                </div>
                {mostrarEstadoTaller ? (
                  <div id="estado-preparacion-taller">
                    {esDueno && sedeFiltro === TODAS_LAS_SEDES ? (
                      <div className="p-4">
                        <p className="text-xs text-muted-foreground">Selecciona una sede para revisar su preparación sin mezclar configuraciones.</p>
                        <Link to="/gestion" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gold-deep">Administrar sedes <ChevronRight className="size-3" /></Link>
                      </div>
                    ) : (
                      <InicioPreparacion preparacion={preparacion ? preparacion : undefined} cargando={cargandoPreparacion} tienePedido={pedidosSede.length > 0} destinoGestion="/gestion" destinoPedidos="/pedidos/nuevo" />
                    )}
                  </div>
                ) : null}
              </section>
            ) : null}
            <section className="rounded-2xl border border-border bg-card shadow-card">
              <header className="flex items-center justify-between gap-3 border-b border-border p-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Relación con clientes</p>
                  <h2 className="mt-1 text-sm font-semibold">Próximos cumpleaños</h2>
                </div>
                <Link to="/clientes" className="text-xs font-semibold text-gold hover:underline">Ver clientes <ChevronRight className="inline size-3" /></Link>
              </header>
              {cumpleanos.length ? cumpleanos.map((c) => (
                <div key={c.id} className="flex items-center gap-3 border-b border-border p-3 last:border-0">
                  <Gift className="size-4 shrink-0 text-gold" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{c.nombre}</span>
                    <span className="text-xs text-muted-foreground">{c.fecha.toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}</span>
                  </span>
                  <span className="text-xs font-semibold text-gold">{c.dias === 0 ? "Hoy" : `En ${c.dias} días`}</span>
                </div>
              )) : <p className="p-4 text-xs text-muted-foreground">No hay cumpleaños en los próximos 30 días.</p>}
            </section>
          </div>
        </section>
      </div>
      {mostrarBienvenida && pasosBienvenida.length > 0 ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-gold/20 bg-card shadow-raised">
            <div className="border-b border-border bg-card px-6 py-7 sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-gold"><Sparkles className="size-3.5" /> Primeros pasos · AURUM LAB</div>
                  <h2 className="font-display text-3xl">Tu taller empieza aquí</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{sesion?.participante?.nombre ? "Preparamos el espacio de " + sesion.participante.nombre + ". " : "Tu espacio de trabajo ya está preparado. "}Completa estos pasos a tu ritmo para organizar el taller y empezar a trabajar con tus primeros pedidos.</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-muted-foreground">{pasoBienvenida + 1}/{pasosBienvenida.length}</span>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <div className="mb-7 grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                {pasosBienvenida.map((paso, index) => (
                  <div key={paso.titulo} className="space-y-2">
                    <div className={index <= pasoBienvenida ? "h-1.5 rounded-full bg-gold" : "h-1.5 rounded-full bg-muted"} />
                    <p className={index === pasoBienvenida ? "text-[10px] font-bold text-foreground" : "text-[10px] text-muted-foreground"}>{index + 1}. {paso.titulo}</p>
                  </div>
                ))}
              </div>
              {(() => { const paso = pasosBienvenida[pasoBienvenida]; if (!paso) return null; const Icono = paso.icono; return (
                <div className="rounded-2xl border border-border bg-muted/30 p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid size-12 place-items-center rounded-2xl border border-gold/25 bg-gold/10 text-gold-deep"><Icono className="size-6" /></div>
                    <span className={paso.listo ? "rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-success" : "rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-warning"}>
                      {paso.listo ? "Completado" : "Pendiente"}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{paso.titulo}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{paso.texto}</p>
                  <button type="button" onClick={() => irDesdeBienvenida(paso.destino)} disabled={guardandoBienvenida} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-bold text-gold-foreground shadow-card transition hover:shadow-raised disabled:opacity-50">
                    {paso.listo ? "Revisar configuración" : paso.accion}
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              ); })()}
              <div className="mt-6 flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={() => void cerrarBienvenida()} disabled={guardandoBienvenida} className="text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50">Explorar el panel ahora</button>
                <div className="flex items-center justify-end gap-2">
                  {pasoBienvenida > 0 ? <button type="button" onClick={() => setPasoBienvenida((actual) => actual - 1)} className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground">Atrás</button> : null}
                  {pasoBienvenida < pasosBienvenida.length - 1 ? <button type="button" onClick={() => setPasoBienvenida((actual) => actual + 1)} className="rounded-xl border border-gold/30 bg-card px-4 py-2.5 text-xs font-semibold text-gold-deep hover:bg-gold/5">Siguiente</button> : (
                    pasosBienvenida.every((paso) => paso.listo) ? (
                      <button type="button" onClick={() => void cerrarBienvenida()} disabled={guardandoBienvenida} className="rounded-xl bg-gold px-4 py-2.5 text-xs font-semibold text-gold-foreground hover:shadow-raised disabled:opacity-50">
                        {guardandoBienvenida ? "Guardando..." : "Entrar al sistema"}
                      </button>
                    ) : (
                      <button type="button" onClick={() => setPasoBienvenida(0)} className="rounded-xl border border-gold/30 bg-card px-4 py-2.5 text-xs font-semibold text-gold-deep hover:bg-gold/5">
                        Revisar pendientes
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

type PreparacionInicio = {
  tallerVinculado: boolean;
  participanteId: string | null;
  identidadConfigurada: boolean;
  capacidadesConfiguradas: boolean;
  produccionActiva: boolean;
  serviciosExternosActivos: boolean;
};

function InicioPreparacion({
  preparacion,
  cargando,
  tienePedido,
  destinoGestion,
  destinoPedidos,
}: {
  preparacion: PreparacionInicio | undefined;
  cargando: boolean;
  tienePedido: boolean;
  destinoGestion: string;
  destinoPedidos: string;
}) {
  const pasos = [
    {
      titulo: "Taller vinculado",
      texto: "La sede seleccionada pertenece a un taller activo del ecosistema.",
      listo: Boolean(preparacion?.tallerVinculado),
      destino: destinoGestion,
      accion: "Revisar taller",
    },
    {
      titulo: "Capacidades definidas",
      texto: "Aurum Lab reconoce las capacidades internas guardadas para esta sede.",
      listo: Boolean(preparacion?.capacidadesConfiguradas),
      destino: "/gestion?modulo=capacidades",
      accion: "Configurar capacidades",
    },
    {
      titulo: "Modalidad de trabajo",
      texto: "La sede tiene Producción o Servicios externos activos.",
      listo: Boolean(preparacion?.produccionActiva || preparacion?.serviciosExternosActivos),
      destino: "/gestion?modulo=capacidades",
      accion: "Configurar modalidad",
    },
    {
      titulo: "Identidad comercial",
      texto: "Existe una identidad comercial activa perteneciente al taller seleccionado.",
      listo: Boolean(preparacion?.identidadConfigurada),
      destino: "/gestion?modulo=comercial",
      accion: "Configurar identidad",
    },
    {
      titulo: "Primer pedido",
      texto: "Ya existe al menos un pedido asociado a esta sede.",
      listo: tienePedido,
      destino: destinoPedidos,
      accion: "Crear primer pedido",
    },
  ];

  const pendientes = pasos.filter((paso) => !paso.listo);
  const siguiente = pendientes[0] ?? pasos[pasos.length - 1]!;
  const completados = pasos.filter((paso) => paso.listo).length;

  if (cargando) {
    return <div className="p-5 text-sm text-muted-foreground">Revisando la preparación de la sede…</div>;
  }

  return (
    <div className="space-y-3 p-4 lg:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-muted-foreground">Preparación del taller</p>
            <p className="shrink-0 text-xs font-bold tabular-nums">{completados}/{pasos.length} completados</p>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Preparación del taller"
            aria-valuemin={0}
            aria-valuemax={pasos.length}
            aria-valuenow={completados}
          >
            <div className="h-full rounded-full bg-success transition-all" style={{ width: `${(completados / pasos.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        {pasos.map((paso) => (
          <div key={paso.titulo} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
            {paso.listo ? (
              <CheckCircle2 className="size-5 shrink-0 text-success" aria-label="Completado" />
            ) : (
              <CircleAlert className="size-5 shrink-0 text-warning" aria-label="Pendiente" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-5">{paso.titulo}</p>
              <p className="hidden text-[11px] leading-4 text-muted-foreground sm:block">{paso.texto}</p>
            </div>
            {!paso.listo ? (
              <Link to={paso.destino as never} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-gold-deep hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Configurar <ChevronRight className="size-3.5" />
              </Link>
            ) : (
              <span className="shrink-0 text-[10px] font-medium text-success">Listo</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-gold/20 bg-gold/[0.035] p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-gold-deep">Siguiente paso</p>
          <p className="mt-1 text-sm font-semibold">{pendientes.length ? siguiente.titulo : "Todo listo"}</p>
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
            {pendientes.length
              ? siguiente.texto
              : "La configuración base está completa. Ya puedes trabajar con pedidos reales."}
          </p>
        </div>
        <Link
          to={siguiente.destino as never}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-bold text-gold-foreground hover:shadow-raised"
        >
          {pendientes.length ? siguiente.accion : "Crear pedido"} <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

function MetricHero({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-gold/20 bg-card/80 px-4 py-3 shadow-card">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl text-foreground">{value}</p>
    </div>
  );
}

function diasHastaEntrega(pedido: PedidoSelector) {
  const fechaIso = pedido.fecha_entrega ?? pedido.entrega;
  if (!fechaIso) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const entrega = new Date(fechaIso);
  if (Number.isNaN(entrega.getTime())) return null;
  entrega.setHours(0, 0, 0, 0);
  return Math.ceil((entrega.getTime() - hoy.getTime()) / 86_400_000);
}

function esUrgente(pedido: PedidoSelector) {
  const dias = diasHastaEntrega(pedido);
  return dias !== null && dias <= 1;
}

function textoEntrega(pedido: PedidoSelector) {
  const dias = diasHastaEntrega(pedido);
  if (dias === null) return "Sin fecha";
  if (dias < 0) return `Vencido hace ${Math.abs(dias)} d`;
  if (dias === 0) return "Entrega hoy";
  if (dias === 1) return "Entrega mañana";
  return `Entrega en ${dias} d`;
}

