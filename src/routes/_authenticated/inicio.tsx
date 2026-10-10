// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Boxes,
  ChevronRight,
  Clock3,
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
  ListChecks,
  Gift,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell, Panel, StatCard, useCapacidadesMenu } from "@/components/AppShell";
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
  const {data: cumpleanos=[]}=useQuery({queryKey:["inicio-cumpleanos",sesion?.participante?.id,sedeContextoId,esDueno],enabled:Boolean(sesion?.participante?.id),queryFn:async()=>{
    const q=supabase.from("clientes").select("id,nombre,fecha_nacimiento,sede_id,participante_id").not("fecha_nacimiento","is",null);
    const {data,error}=esDueno?await q:await q.eq("participante_id",sesion!.participante!.id);if(error)throw error;
    const t=new Date();t.setHours(0,0,0,0);const leap=(y:number)=>y%4===0&&(y%100!==0||y%400===0);
    return (data??[]).filter(c=>!sedeContextoId||c.sede_id===sedeContextoId).map(c=>{const [y,m,d]=String(c.fecha_nacimiento).slice(0,10).split("-").map(Number);let day=d;if(m===2&&d===29&&!leap(t.getFullYear()))day=28;let f=new Date(t.getFullYear(),m-1,day);if(f<t){const year=t.getFullYear()+1;day=m===2&&d===29&&!leap(year)?28:d;f=new Date(year,m-1,day)}return{id:c.id,nombre:c.nombre,fecha:f,dias:Math.round((f.getTime()-t.getTime())/86400000)}}).filter(c=>c.dias<=30).sort((a,b)=>a.dias-b.dias).slice(0,5)
  }});

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

  const pedidosSede = useMemo(
    () => (sedeContextoId ? pedidos.filter((pedido) => pedido.sede_id === sedeContextoId) : pedidos),
    [pedidos, sedeContextoId],
  );
  const navigate = useNavigate();
  const [mostrarBienvenida, setMostrarBienvenida] = useState(false);
  const [pasoBienvenida, setPasoBienvenida] = useState(0);
  const [guardandoBienvenida, setGuardandoBienvenida] = useState(false);

  useEffect(() => {
    if (!sesion?.esAdmin || !sesion.user) return;
    const metadata = sesion.user.user_metadata ?? {};
    const version = Number(metadata.aurum_onboarding_version ?? 0);
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
        const da = diasHastaEntrega(a);
        const db = diasHastaEntrega(b);
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      });
    return { activos, produccion, recepcion, vencidos, hoy, urgentes, atencion };
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
      acciones={
        <>
          {sesion?.esAdmin ? (
            <button
              type="button"
              onClick={abrirBienvenida}
              className="rounded-xl border border-gold/30 bg-card px-4 py-2.5 text-xs font-semibold text-gold-deep shadow-card transition hover:bg-gold/5 hover:shadow-raised"
            >
              Ver inducción
            </button>
          ) : null}
          <Link to="/pedidos" className="rounded-xl border border-gold/30 bg-gold px-4 py-2.5 text-xs font-semibold text-gold-foreground shadow-card transition hover:shadow-raised">Ver pedidos</Link>
          <Link to="/pedidos/nuevo" className="rounded-xl border border-gold/30 bg-card px-4 py-2.5 text-xs font-semibold text-gold-deep shadow-card transition hover:bg-gold/5 hover:shadow-raised">Nuevo pedido</Link>
          {capacidadesSet.has("Cotizaciones") ? <Link to="/cotizaciones" className="rounded-xl border border-gold/30 bg-card px-4 py-2.5 text-xs font-semibold text-gold-deep shadow-card transition hover:bg-gold/5 hover:shadow-raised">Nueva cotización</Link> : null}
        </>
      }
    >
      <div className="space-y-6">
        <section className="rounded-3xl border border-gold/20 bg-card shadow-card">
          <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold-deep">
                  <ListChecks className="size-4" />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Estado de preparación</p>
                  <h2 className="mt-0.5 text-lg font-semibold">Tu taller está listo para trabajar</h2>
                </div>
              </div>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">
                Aurum Lab revisa la configuración real de esta sede y te indica qué falta antes de llevar tu primer pedido a producción.
              </p>
            </div>
            {esDueno ? (
              <SelectorSedeDueno
                esDueno={esDueno}
                sedes={sedes}
                value={sedeFiltro}
                onChange={setSedeFiltro}
                className="w-full sm:w-auto"
              />
            ) : null}
          </div>

          {esDueno && sedeFiltro === TODAS_LAS_SEDES ? (
            <div className="flex flex-col items-start gap-4 p-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
              <div>
                <p className="text-sm font-semibold">Selecciona una sede para revisar su preparación</p>
                <p className="mt-1 text-xs text-muted-foreground">La vista global sigue disponible en los indicadores inferiores. La preparación se evalúa por taller para no mezclar configuraciones.</p>
              </div>
              <Link to="/gestion" className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-semibold text-gold-foreground hover:shadow-raised">
                Administrar sedes <ChevronRight className="size-4" />
              </Link>
            </div>
          ) : (
            <InicioPreparacion
              preparacion={preparacion}
              cargando={cargandoPreparacion}
              tienePedido={pedidosSede.length > 0}
              destinoGestion="/gestion"
              destinoPedidos="/pedidos/nuevo"
            />
          )}
        </section>

        <section className="rounded-2xl border border-gold/20 bg-card"><header className="flex items-center justify-between border-b p-4"><h2 className="font-semibold">🎂 Próximos cumpleaños</h2><Link to="/clientes" className="text-xs font-semibold text-gold">Ver clientes <ChevronRight className="inline size-3"/></Link></header>{cumpleanos.length?cumpleanos.map(c=><div key={c.id} className="flex items-center gap-3 border-b p-3"><Gift className="size-4 text-gold"/><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{c.nombre}</span><span className="text-xs text-muted-foreground">{c.fecha.toLocaleDateString("es-PE",{day:"2-digit",month:"short"})}</span></span><span className="text-xs font-semibold text-gold">{c.dias===0?"Hoy":`En ${c.dias} días`}</span></div>):<p className="p-4 text-sm text-muted-foreground">No hay cumpleaños en los próximos 30 días.</p>}</section>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard etiqueta="Pedidos activos" valor={String(resumen.activos.length)} />
          <StatCard etiqueta="En producción" valor={String(resumen.produccion.length)} />
          <StatCard etiqueta="En recepción" valor={String(resumen.recepcion.length)} />
          <StatCard etiqueta="Entrega hoy" valor={String(resumen.hoy.length)} tono={resumen.hoy.length ? "negativo" : "positivo"} />
          <StatCard etiqueta="Vencidos" valor={String(resumen.vencidos.length)} tono={resumen.vencidos.length ? "negativo" : "positivo"} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <Panel
            titulo="Requieren atención"
            accion={<Link to="/pedidos" className="text-xs font-semibold text-gold hover:underline">Ver pedidos</Link>}
          >
            <div className="divide-y divide-border">
              {cargandoPedidos ? (
                <div className="p-6 text-sm text-muted-foreground">Cargando pedidos...</div>
               ) : resumen.atencion.length === 0 ? (
                <div className="p-8 text-center">
                  <Clock3 className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">No hay pedidos activos</p>
                  <p className="mt-1 text-xs text-muted-foreground">Cuando ingresen pedidos aparecerán aquí.</p>
                </div>
              ) : (
                resumen.atencion.slice(0, 7).map((pedido) => (
                  <Link key={pedido.id} to="/pedidos/$id" params={{ id: pedido.id }} search={{ from: undefined }} className="flex items-center justify-between gap-4 px-4 py-4 transition hover:bg-muted/40 lg:px-6">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{pedido.referencia || pedido.pieza || pedido.trabajo || "Pedido sin referencia"}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{pedido.cliente || "Sin cliente"} · {pedido.estado}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={esUrgente(pedido) ? "text-xs font-bold text-danger" : "text-xs font-medium text-muted-foreground"}>
                        {textoEntrega(pedido)}
                      </p>
                      <ChevronRight className="ml-auto mt-1 size-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Panel>

          <Panel titulo="Actividad del taller">
            <div className="space-y-2 p-3">
              {[
                { label: "Diseño 3D", area: "Diseño 3D", icon: LayoutGrid },
                { label: "Impresión", area: "Impresión 3D", icon: Boxes },
                { label: "Casting", area: "Casting", icon: Gem },
                { label: "Taller", area: "Taller", icon: Hammer },
                { label: "Ventas", area: "Área ventas", icon: PackageCheck },
              ].map(({ label, area, icon: Icono }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl border border-border px-3 py-3">
                  <span className="grid size-9 place-items-center rounded-lg border border-gold/20 bg-gold/10 text-gold-deep"><Icono className="size-4" /></span>
                  <span className="flex-1 text-sm font-semibold">{label}</span>
                  <span className="font-display text-xl">{pedidos.filter((p) => p.area_actual === area).length}</span>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <Panel titulo="Carga operativa por área">
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
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
              const destino = destinos[area];
              return (
                <Link key={area} to={destino as never} className="rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-raised">
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid size-9 place-items-center rounded-xl border border-gold/20 bg-gold/10 text-gold-deep"><Icono className="size-4" /></span>
                    <span className="font-display text-2xl font-semibold">{cantidad}</span>
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{area}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{cantidad === 0 ? "Sin carga activa" : cantidad === 1 ? "1 pedido en curso" : cantidad + " pedidos en curso"}</p>
                </Link>
              );
            })}
          </div>
        </Panel>
      </div>

      {mostrarBienvenida && pasosBienvenida.length > 0 ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-gold/20 bg-card shadow-raised">
            <div className="border-b border-border bg-card px-6 py-7 sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-gold"><Sparkles className="size-3.5" /> Guía de Aurum Lab</div>
                  <h2 className="font-display text-3xl">Bienvenido a Aurum Lab</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{sesion?.participante?.nombre ? "Hemos preparado tu espacio para " + sesion.participante.nombre + ". " : "Hemos preparado tu espacio de trabajo. "}Antes de empezar, te mostramos lo esencial.</p>
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
              {(() => { const paso = pasosBienvenida[pasoBienvenida]; const Icono = paso.icono; return (
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
                <button type="button" onClick={() => void cerrarBienvenida()} disabled={guardandoBienvenida} className="text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50">Saltar guía</button>
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
    <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:p-6">
      <div className="space-y-2">
        {pasos.map((paso) => (
          <div key={paso.titulo} className="flex items-center gap-3 rounded-xl border border-border px-3 py-3">
            {paso.listo ? (
              <CheckCircle2 className="size-5 shrink-0 text-success" />
            ) : (
              <CircleAlert className="size-5 shrink-0 text-warning" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{paso.titulo}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{paso.texto}</p>
            </div>
            {!paso.listo ? (
              <Link to={paso.destino as never} className="hidden shrink-0 text-[11px] font-bold text-gold-deep hover:underline sm:block">
                Configurar
              </Link>
            ) : null}
          </div>
        ))}
      </div>

      <div className="min-w-[260px] rounded-2xl border border-gold/20 bg-card p-5 shadow-card">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold">Siguiente paso</p>
        <h3 className="mt-2 text-lg font-semibold">{pendientes.length ? siguiente.titulo : "Todo listo"}</h3>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {pendientes.length
            ? siguiente.texto
            : "La configuración base está completa. Ya puedes trabajar con pedidos reales."}
        </p>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {completados}/{pasos.length} completados
        </p>
        <Link
          to={siguiente.destino as never}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-bold text-gold-foreground hover:shadow-raised"
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

