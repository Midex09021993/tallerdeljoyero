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
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell, Panel, StatCard, useCapacidadesMenu } from "@/components/AppShell";
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
  const navigate = useNavigate();
  const [mostrarBienvenida, setMostrarBienvenida] = useState(false);
  const [pasoBienvenida, setPasoBienvenida] = useState(0);
  const [guardandoBienvenida, setGuardandoBienvenida] = useState(false);

  useEffect(() => {
    if (!sesion?.esAdmin || !sesion.user) return;
    const completada = sesion.user.user_metadata?.aurum_onboarding_completed_at;
    setMostrarBienvenida(!completada);
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
    const activos = pedidos.filter((p) => !esEstadoFinalPedido(p.estado));
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
  }, [pedidos]);

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
    const pasos = [
      { titulo: "Conoce tu taller", texto: "Configura las capacidades y modalidades que realmente tiene tu taller. Así Aurum Lab sólo mostrará lo que puedes operar.", icono: Settings2, accion: "Configurar taller", destino: "/gestion" },
      { titulo: "Ordena tu operación", texto: "Define qué entra en producción, qué se deriva a servicios externos y prepara el flujo de trabajo de tu sede.", icono: Building2, accion: "Ir a Gestión", destino: "/gestion" },
      { titulo: "Prepara el área comercial", texto: "Revisa identidad comercial, documentos, clientes y las herramientas que utilizarás para atender pedidos.", icono: Gem, accion: "Ver Comercial", destino: "/clientes" },
      { titulo: "Empieza a trabajar", texto: "Cuando tu configuración esté lista, crea un pedido y lleva cada trabajo por el flujo real de tu taller.", icono: Wrench, accion: "Ver pedidos", destino: "/pedidos" },
      { titulo: "Explora Aurum Lab", texto: "Tienes herramientas y servicios que puedes descubrir cuando los necesites. El sistema crecerá contigo.", icono: Rocket, accion: "Ver herramientas", destino: "/herramientas" },
    ];
    return sesion?.esDueno ? [{ titulo: "Administra tu ecosistema", texto: "Como dueño de Aurum Lab puedes administrar participantes y sedes desde Gestión, sin mezclar esa administración con la operación de cada taller.", icono: Building2, accion: "Abrir Gestión", destino: "/gestion" }, ...pasos] : pasos;
  }, [sesion?.esDueno]);

  const cerrarBienvenida = async () => {
    if (!sesion?.user || guardandoBienvenida) return;
    setGuardandoBienvenida(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { aurum_onboarding_completed_at: new Date().toISOString() } });
      if (error) throw error;
      setMostrarBienvenida(false);
    } catch (error) {
      console.error("[onboarding] No se pudo guardar el estado:", error);
      setMostrarBienvenida(false);
    } finally { setGuardandoBienvenida(false); }
  };

  const irDesdeBienvenida = (destino: string) => {
    void cerrarBienvenida();
    void navigate({ to: destino as never });
  };

  return (
    <AppShell
      titulo="Centro de control"
      subtitulo={sesion?.sede?.nombre ? `Sede ${sesion.sede.nombre} · ${rolEtiqueta[sesion.rolPrincipal]}` : "Visión general del taller"}
      acciones={
        <>
          <Link to="/pedidos" className="rounded-xl border border-gold/30 bg-gold px-4 py-2.5 text-xs font-semibold text-gold-foreground shadow-card transition hover:shadow-raised">Ver pedidos</Link>
          <Link to="/pedidos/nuevo" className="rounded-xl border border-gold/30 bg-card px-4 py-2.5 text-xs font-semibold text-gold-deep shadow-card transition hover:bg-gold/5 hover:shadow-raised">Nuevo pedido</Link>
          {capacidadesSet.has("Cotizaciones") ? <Link to="/cotizaciones" className="rounded-xl border border-gold/30 bg-card px-4 py-2.5 text-xs font-semibold text-gold-deep shadow-card transition hover:bg-gold/5 hover:shadow-raised">Nueva cotización</Link> : null}
        </>
      }
    >
      <div className="space-y-6">
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
              const cantidad = pedidos.filter((p) => p.area_actual === area && !esEstadoFinalPedido(p.estado)).length;
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
        <div className="fixed inset-0 z-[100] grid place-items-center bg-ink/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-gold/20 bg-card shadow-raised">
            <div className="border-b border-border bg-ink px-6 py-7 text-ink-foreground sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-gold"><Sparkles className="size-3.5" /> Primer acceso</div>
                  <h2 className="font-display text-3xl">Bienvenido a Aurum Lab</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-ink-foreground/60">{sesion?.participante?.nombre ? "Hemos preparado tu espacio para " + sesion.participante.nombre + ". " : "Hemos preparado tu espacio de trabajo. "}Antes de empezar, te mostramos lo esencial.</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-ink-foreground/40">{pasoBienvenida + 1}/{pasosBienvenida.length}</span>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <div className="mb-7 grid gap-2 sm:grid-cols-5">
                {pasosBienvenida.map((paso, index) => <div key={paso.titulo} className="space-y-2"><div className={index <= pasoBienvenida ? "h-1.5 rounded-full bg-gold" : "h-1.5 rounded-full bg-muted"} /><p className={index === pasoBienvenida ? "text-[10px] font-bold text-foreground" : "text-[10px] text-muted-foreground"}>{index + 1}. {paso.titulo}</p></div>)}
              </div>
              {(() => { const paso = pasosBienvenida[pasoBienvenida]; const Icono = paso.icono; return (
                <div className="rounded-2xl border border-border bg-muted/30 p-5 sm:p-6">
                  <div className="grid size-12 place-items-center rounded-2xl border border-gold/25 bg-gold/10 text-gold-deep"><Icono className="size-6" /></div>
                  <h3 className="mt-5 text-xl font-semibold">{paso.titulo}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{paso.texto}</p>
                  <button type="button" onClick={() => irDesdeBienvenida(paso.destino)} disabled={guardandoBienvenida} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-bold text-gold-foreground shadow-card transition hover:shadow-raised disabled:opacity-50">{paso.accion} <ChevronRight className="size-4" /></button>
                </div>
              ); })()}
              <div className="mt-6 flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={() => void cerrarBienvenida()} disabled={guardandoBienvenida} className="text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50">Saltar guía</button>
                <div className="flex items-center justify-end gap-2">
                  {pasoBienvenida > 0 ? <button type="button" onClick={() => setPasoBienvenida((actual) => actual - 1)} className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground">Atrás</button> : null}
                  {pasoBienvenida < pasosBienvenida.length - 1 ? <button type="button" onClick={() => setPasoBienvenida((actual) => actual + 1)} className="rounded-xl border border-gold/30 bg-card px-4 py-2.5 text-xs font-semibold text-gold-deep hover:bg-gold/5">Siguiente</button> : <button type="button" onClick={() => void cerrarBienvenida()} disabled={guardandoBienvenida} className="rounded-xl bg-ink px-4 py-2.5 text-xs font-semibold text-ink-foreground hover:bg-ink/90 disabled:opacity-50">{guardandoBienvenida ? "Guardando..." : "Entrar al sistema"}</button>}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function MetricHero({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-gold/20 bg-card/80 px-4 py-3 shadow-card">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">{label}</p>
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

