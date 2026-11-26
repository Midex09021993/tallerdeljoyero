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
  FileText,
  UserRound,
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
  const { data: pedidos = [], isLoading: cargandoPedidos, isError: errorPedidos, refetch: recargarPedidos } = usePedidosSelector();
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

  const { data: preparacion, isLoading: cargandoPreparacion, isError: errorPreparacion, refetch: recargarPreparacion } = useQuery({
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
    enabled: Boolean(sesion?.esAdmin && sesion?.participante?.id && (esDueno || sedeContextoId)),
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

  const { data: resumenComercial, isLoading: cargandoResumenComercial, isError: errorResumenComercial, refetch: recargarResumenComercial } = useQuery({
    queryKey: ["inicio-resumen-comercial", sesion?.participante?.id, sedeContextoId, esDueno],
    enabled: Boolean(sesion?.esAdmin && sesion?.participante?.id && (!esDueno || sedeContextoId)),
    staleTime: 60_000,
    queryFn: async () => {
      let clientesQuery = supabase.from("clientes").select("id", { count: "exact", head: true });
      let cotizacionesQuery = supabase
        .from("cotizaciones")
        .select("id,estado,total,moneda,fecha_vencimiento,sede_id,participante_id");
      let inventarioQuery = supabase
        .from("inventario")
        .select("id,material,stock,minimo,sede_id");

      if (esDueno) {
        if (sedeContextoId) {
          clientesQuery = clientesQuery.eq("sede_id", sedeContextoId);
          cotizacionesQuery = cotizacionesQuery.eq("sede_id", sedeContextoId);
          inventarioQuery = inventarioQuery.eq("sede_id", sedeContextoId);
        }
      } else {
        clientesQuery = clientesQuery.eq("participante_id", sesion!.participante!.id);
        cotizacionesQuery = cotizacionesQuery.eq("participante_id", sesion!.participante!.id);
        inventarioQuery = inventarioQuery.eq("sede_id", sedeContextoId!);
      }

      const [{ count: clientesCount, error: clientesError }, { data: cotizaciones, error: cotizacionesError }, { data: materiales, error: inventarioError }] = await Promise.all([
        clientesQuery,
        cotizacionesQuery.order("created_at", { ascending: false }).limit(500),
        inventarioQuery.eq("activo", true).order("material").limit(500),
      ]);
      if (clientesError) throw clientesError;
      if (cotizacionesError) throw cotizacionesError;
      if (inventarioError) throw inventarioError;

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const cotizacionesLista = cotizaciones ?? [];
      const pendientes = cotizacionesLista.filter((q) => ["borrador", "enviada", "pendiente"].includes(String(q.estado ?? "").toLowerCase()));
      const aprobadas = cotizacionesLista.filter((q) => String(q.estado ?? "").toLowerCase() === "aprobada");
      const porVencer = cotizacionesLista.filter((q) => {
        if (!q.fecha_vencimiento || !["borrador", "enviada", "pendiente"].includes(String(q.estado ?? "").toLowerCase())) return false;
        const fecha = new Date(`${q.fecha_vencimiento}T00:00:00`);
        const dias = Math.ceil((fecha.getTime() - hoy.getTime()) / 86_400_000);
        return dias >= 0 && dias <= 7;
      });
      const stockBajo = (materiales ?? []).filter((m) => Number(m.stock) <= Number(m.minimo));
      return {
        clientes: clientesCount ?? 0,
        cotizacionesPendientes: pendientes.length,
        cotizacionesAprobadas: aprobadas.length,
        cotizacionesPorVencer: porVencer.length,
        materialesStockBajo: stockBajo.length,
        materialesStockBajoLista: stockBajo.slice(0, 5).map((m) => ({ id: m.id, material: m.material, stock: Number(m.stock), minimo: Number(m.minimo) })),
      };
    },
  });

  const pedidosSede = useMemo(
    () => (sedeContextoId ? pedidos.filter((pedido) => pedido.sede_id === sedeContextoId) : pedidos),
    [pedidos, sedeContextoId],
  );
  const navigate = useNavigate();
  const [mostrarBienvenida, setMostrarBienvenida] = useState(false);
  const [pasoBienvenida, setPasoBienvenida] = useState(0);
  const [guardandoBienvenida, setGuardandoBienvenida] = useState(false);
  const [filtroAtencion, setFiltroAtencion] = useState<"todos" | "vencidos" | "recepcion">("todos");

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

  const pedidosAtencion = useMemo(() => resumen.atencion.filter((pedido) => {
    if (filtroAtencion === "vencidos") {
      const dias = diasHastaEntrega(pedido);
      return dias !== null && dias < 0;
    }
    if (filtroAtencion === "recepcion") return pedidoEnRecepcion(pedido.estado);
    return true;
  }), [filtroAtencion, resumen.atencion]);

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

  const cantidadesPorArea = useMemo(
    () => cargaAreas.map(([area]) => pedidosSede.filter((p) => p.area_actual === area && !esEstadoFinalPedido(p.estado)).length),
    [cargaAreas, pedidosSede],
  );
  const maxCargaArea = Math.max(1, ...cantidadesPorArea);

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
      ocultarEncabezado
    >
      <div className="space-y-5 lg:space-y-6">
        <header className="relative isolate flex flex-col gap-4 overflow-hidden rounded-[1.35rem] border border-[#C5A36B]/25 bg-[linear-gradient(112deg,#FFFEFC_0%,#FFFEFC_68%,#F2EBDD_100%)] px-5 py-5 shadow-[0_2px_5px_rgba(24,40,56,.035),0_18px_42px_-28px_rgba(24,40,56,.22)] sm:flex-row sm:items-center sm:justify-between lg:px-7 lg:py-6 before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-[#C5A36B]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-deep"><Sparkles className="size-3.5" /> AURUM LAB <span className="text-[#B7AA95]">/</span> OPERACIONES</div>
            <h1 className="mt-1.5 font-display text-[2rem] font-semibold leading-tight tracking-[-0.035em] text-[#182838] sm:text-[2.25rem]">Centro de control</h1>
            <p className="mt-1.5 text-[13px] text-[#687887]">{sesion?.sede?.nombre ? `${sesion.sede.nombre} · ${rolEtiqueta[sesion.rolPrincipal]}` : "Visión general del taller"}</p>
          </div>
          {esDueno ? (
            <div className="flex w-full flex-col gap-1.5 sm:w-auto">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sede de trabajo</span>
              <SelectorSedeDueno esDueno={esDueno} sedes={sedes} value={sedeFiltro} onChange={setSedeFiltro} className="w-full sm:min-w-56" />
            </div>
          ) : null}
        </header>

        <section aria-label="Indicadores del taller" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: "Pedidos activos", value: resumen.activos.length, detail: "En seguimiento", tone: "text-foreground", Icon: PackageCheck, accent: "bg-slate-100 text-slate-600" },
            { label: "En producción", value: resumen.produccion.length, detail: "Trabajo en curso", tone: "text-foreground", Icon: Hammer, accent: "bg-blue-50 text-blue-700" },
            { label: "Entregas hoy", value: resumen.hoy.length, detail: "Compromisos de hoy", tone: "text-foreground", Icon: CheckCircle2, accent: "bg-emerald-50 text-emerald-700" },
            { label: "Vencidos", value: resumen.vencidos.length, detail: "Requieren atención", tone: resumen.vencidos.length ? "text-red-600" : "text-foreground", Icon: CircleAlert, accent: resumen.vencidos.length ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500" },
          ].map((item) => (
            <article key={item.label} className="group relative overflow-hidden rounded-[1.15rem] border border-[#293B4A]/[0.09] bg-[#FFFEFC] p-4 shadow-[0_1px_2px_rgba(24,40,56,.035),0_10px_26px_-20px_rgba(24,40,56,.28)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C5A36B]/55 hover:shadow-[0_12px_30px_-18px_rgba(24,40,56,.24)]">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#687887]">{item.label}</p>
                <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${item.accent}`}><item.Icon className="size-4" /></span>
              </div>
              <p className={`mt-2.5 font-display text-[2rem] font-semibold leading-none tracking-tight tabular-nums ${item.tone}`}>{cargandoPedidos ? "—" : item.value}</p>
              <p className="mt-2 text-[11px] text-[#71808D]">{item.detail}</p>
            </article>
          ))}
        </section>

        {sesion?.esAdmin ? (
          <section aria-label="Resumen comercial e inventario" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#293B4A]/[0.08] pb-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-deep">01 <span className="px-1 text-[#C5A36B]/60">/</span> VISIÓN DEL NEGOCIO</p>
                <h2 className="mt-1 text-[17px] font-semibold tracking-tight text-[#182838]">Comercial e inventario</h2>
                <p className="mt-0.5 text-xs text-[#71808D]">Indicadores del taller seleccionado</p>
              </div>
              <span className="text-[10px] text-muted-foreground">Datos sujetos a los permisos de tu cuenta</span>
            </div>

            {errorResumenComercial ? (
              <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-muted-foreground">
                <span>No se pudo cargar el resumen comercial e inventario. No mostramos cifras parciales como si fueran datos reales.</span>
                <button type="button" onClick={() => void recargarResumenComercial()} className="rounded-lg border px-3 py-1.5 font-semibold hover:bg-background">Reintentar</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  {[
                    { label: "Clientes registrados", value: resumenComercial?.clientes, detail: "Cartera del taller", href: "/clientes", icon: UserRound },
                    { label: "Cotizaciones pendientes", value: resumenComercial?.cotizacionesPendientes, detail: "Borrador o enviadas", href: "/cotizaciones", icon: FileText },
                    { label: "Cotizaciones aprobadas", value: resumenComercial?.cotizacionesAprobadas, detail: "Aprobaciones registradas", href: "/cotizaciones", icon: CheckCircle2 },
                    { label: "Stock bajo o mínimo", value: resumenComercial?.materialesStockBajo, detail: "Materiales por revisar", href: "/inventario", icon: Boxes },
                  ].map((item) => {
                    const Icono = item.icon;
                    return (
                      <Link key={item.label} to={item.href as never} className="group relative overflow-hidden rounded-[1.15rem] border border-[#293B4A]/[0.09] bg-[#FFFEFC] p-4 shadow-[0_1px_2px_rgba(24,40,56,.035),0_10px_26px_-20px_rgba(24,40,56,.28)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C5A36B]/55 hover:shadow-[0_12px_30px_-18px_rgba(24,40,56,.24)]">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#687887]">{item.label}</p>
                          <Icono className="size-4 shrink-0 text-gold-deep/75" />
                        </div>
                        <p className="mt-2.5 font-display text-[2rem] font-semibold leading-none tracking-tight tabular-nums text-[#182838]">
                          {cargandoResumenComercial ? "—" : (item.value ?? 0)}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{item.detail}</p>
                      </Link>
                    );
                  })}
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                  <Link to="/cotizaciones" className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-card transition hover:border-gold/35 hover:shadow-raised">
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold">Cotizaciones próximas a vencer</span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">Pendientes con vencimiento en los próximos 7 días</span>
                    </span>
                    <span className="font-display text-2xl font-semibold tabular-nums">{cargandoResumenComercial ? "—" : resumenComercial?.cotizacionesPorVencer ?? 0}</span>
                  </Link>
                  <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-card">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">Materiales que requieren revisión</span>
                      <Link to="/inventario" className="text-[11px] font-semibold text-gold-deep hover:underline">Ver inventario</Link>
                    </div>
                    {cargandoResumenComercial ? (
                      <p className="mt-2 text-[11px] text-muted-foreground">Consultando existencias…</p>
                    ) : (resumenComercial?.materialesStockBajoLista.length ?? 0) === 0 ? (
                      <p className="mt-2 text-[11px] text-muted-foreground">No hay materiales en mínimo o por debajo del mínimo.</p>
                    ) : (
                      <div className="mt-2 divide-y divide-border">
                        {resumenComercial?.materialesStockBajoLista.map((material) => (
                          <div key={material.id} className="flex items-center justify-between gap-3 py-1.5 text-[11px]">
                            <span className="min-w-0 truncate font-medium">{material.material}</span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">{material.stock} / mín. {material.minimo}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        ) : null}

        <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
          <section className="overflow-hidden rounded-[1.2rem] border border-[#293B4A]/[0.09] bg-[#FFFEFC] shadow-[0_2px_5px_rgba(24,40,56,.035),0_14px_34px_-24px_rgba(24,40,56,.24)]">
            <div className="space-y-3 border-b border-[#293B4A]/[0.09] bg-[linear-gradient(105deg,#FFFEFC,#F8F5EF)] px-4 py-4 lg:px-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-[#F3EBDD] text-[#92734B]"><CircleAlert className="size-3.5" /></span><h2 className="text-sm font-semibold tracking-tight text-[#182838]">Atención prioritaria</h2></div>
                  <p className="mt-1 text-xs text-[#71808D]">Seguimiento de pedidos que necesitan una acción</p>
                </div>
                <Link to="/pedidos" className="text-xs font-semibold text-gold-deep hover:underline">Ver pedidos <ChevronRight className="inline size-3" /></Link>
              </div>
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar atención prioritaria">
                {([
                  { id: "todos", label: "Todos", count: resumen.atencion.length },
                  { id: "vencidos", label: "Vencidos", count: resumen.vencidos.filter((p) => resumen.atencion.some((a) => a.id === p.id)).length },
                  { id: "recepcion", label: "Por recibir", count: resumen.recepcion.filter((p) => resumen.atencion.some((a) => a.id === p.id)).length },
                ] as const).map((filtro) => (
                  <button
                    key={filtro.id}
                    type="button"
                    onClick={() => setFiltroAtencion(filtro.id)}
                    aria-pressed={filtroAtencion === filtro.id}
                    className={filtroAtencion === filtro.id
                      ? "inline-flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-[11px] font-semibold text-gold-deep"
                      : "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:border-gold/25 hover:text-foreground"}
                  >
                    {filtro.label}
                    <span className="tabular-nums opacity-75">{filtro.count}</span>
                  </button>
                ))}
              </div>
            </div>
            {cargandoPedidos ? (
              <p className="p-5 text-sm text-muted-foreground">Cargando operaciones…</p>
            ) : errorPedidos ? (
              <div role="status" className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm text-destructive">
                <span>No se pudo cargar la bandeja de pedidos. No es posible confirmar si hay pendientes.</span>
                <button type="button" onClick={() => void recargarPedidos()} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">Reintentar</button>
              </div>
            ) : pedidosAtencion.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <CheckCircle2 className="mx-auto size-7 text-emerald-600" />
                <p className="mt-2 text-sm font-semibold">Sin pendientes urgentes</p>
                <p className="mt-1 text-xs text-muted-foreground">{filtroAtencion === "vencidos" ? "No hay pedidos vencidos en esta sede." : filtroAtencion === "recepcion" ? "No hay pedidos pendientes de recepción." : "No hay pedidos vencidos ni recepciones por verificar."}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {pedidosAtencion.slice(0, 7).map((pedido) => (
                  <Link key={pedido.id} to="/pedidos/$id" params={{ id: pedido.id }} search={{ from: undefined }} className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted/30">
                    <span className={esUrgente(pedido) ? "size-2 shrink-0 rounded-full bg-red-500" : "size-2 shrink-0 rounded-full bg-amber-500"} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold">{pedido.referencia || pedido.pieza || pedido.trabajo || "Pedido sin referencia"}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{pedido.cliente || "Sin cliente"} · {pedido.estado}</span>
                    </span>
                    <span className={esUrgente(pedido) ? "shrink-0 text-right text-[11px] font-semibold text-red-600" : "shrink-0 text-right text-[11px] font-medium text-muted-foreground"}>{textoEntrega(pedido)}</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </section>

          <div className="space-y-5">
            <section className="rounded-2xl border border-border bg-card shadow-card">
              <div className="border-b border-border px-4 py-3.5">
                <h2 className="text-sm font-semibold">Estado de producción</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Carga actual por área</p>
              </div>
              <div className="divide-y divide-border px-4">
                {cargaAreas.map(([area, Icono]) => {
                  const cantidad = cantidadesPorArea[cargaAreas.findIndex(([nombre]) => nombre === area)] ?? 0;
                  const destinos: Record<string, string> = {
                    "Diseño 3D": "/diseno-3d",
                    "Impresión": "/impresion-3d",
                    Casting: "/casting",
                    Taller: "/taller",
                    "Corte Láser": "/corte-laser",
                    Ventas: "/ventas",
                  };
                  return (
                    <Link key={area} to={destinos[area] as never} className="flex items-center gap-3 py-3 transition hover:text-gold-deep">
                      <Icono className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-xs font-medium">{area}</span>
                          <span className="text-xs font-semibold tabular-nums">{cantidad}</span>
                        </span>
                        <span
                          className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted"
                          role="progressbar"
                          aria-label={`Carga de ${area}`}
                          aria-valuemin={0}
                          aria-valuemax={maxCargaArea}
                          aria-valuenow={cantidad}
                        >
                          <span className="block h-full rounded-full bg-gold transition-all" style={{ width: `${(cantidad / maxCargaArea) * 100}%` }} />
                        </span>
                      </span>
                      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                    </Link>
                  );
                })}
                {cargaAreas.length === 0 ? <p className="py-4 text-xs text-muted-foreground">No hay áreas configuradas.</p> : null}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <h2 className="text-sm font-semibold">Resumen del día</h2>
              <div className="mt-3 space-y-2.5">
                {[
                  { label: "En recepción", value: resumen.recepcion.length },
                  { label: "Entregas vencidas", value: resumen.vencidos.length },
                  { label: "Sin fecha de entrega", value: resumen.sinFecha.length },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold tabular-nums">{item.value}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        {sesion?.esAdmin ? (
          <section className="space-y-2">
            <details className="group rounded-xl border border-border bg-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2 text-xs font-semibold"><Rocket className="size-4 text-gold-deep" /> Configuración y puesta en marcha</span>
                <ChevronRight className="size-4 text-muted-foreground transition group-open:rotate-90" />
              </summary>
              <div className="border-t border-border p-4">
                {esDueno && !sedeContextoId ? (
                  <p className="text-xs text-muted-foreground">Selecciona una sede para consultar su configuración.</p>
                ) : errorPreparacion ? (
                  <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground">
                    <span>No se pudo consultar la configuración de esta sede.</span>
                    <button type="button" onClick={() => void recargarPreparacion()} className="rounded-lg border px-3 py-1.5 font-semibold hover:bg-background">Reintentar</button>
                  </div>
                ) : (
                  <InicioPreparacion preparacion={preparacion ? preparacion : undefined} cargando={cargandoPreparacion} tienePedido={errorPedidos ? undefined : pedidosSede.length > 0} destinoGestion="/gestion" destinoPedidos="/pedidos/nuevo" />
                )}
                {errorPrimerosPasos ? <p role="status" className="mt-3 text-xs text-destructive">No se pudieron consultar los datos iniciales. Reintenta cargar la página más tarde.</p> : null}
                {!errorPrimerosPasos && !cargandoPrimerosPasos && primerosPasos ? (
                  <p className="mt-3 text-xs text-muted-foreground">Clientes registrados: {primerosPasos.clientes} · Cotizaciones: {primerosPasos.cotizaciones}</p>
                ) : null}
              </div>
            </details>
            <details className="group rounded-xl border border-border bg-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2 text-xs font-semibold"><Gem className="size-4 text-gold-deep" /> Suscripción y consumo</span>
                <ChevronRight className="size-4 text-muted-foreground transition group-open:rotate-90" />
              </summary>
              <div className="border-t border-border p-4"><ResumenPlanComercial /></div>
            </details>
          </section>
        ) : null}
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

