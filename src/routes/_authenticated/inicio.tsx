import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Boxes,
  ChevronRight,
  ClipboardList,
  Clock3,
  Gem,
  Hammer,
  LayoutGrid,
  PackageCheck,
  Scissors,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { AppShell, Panel, StatCard } from "@/components/AppShell";
import { pedidoAsignadoAArea, pedidoEnAreaActual } from "@/hooks/use-pedidos-area";
import {
  areaCoincide,
  areaRuta,
  normalizarArea,
  rolEtiqueta,
  useCerrarSesion,
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
  const cerrarSesion = useCerrarSesion();
  const navigate = useNavigate();

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

  const esOperario = sesion?.rolPrincipal === "operario";
  const areasOperario = useMemo(() => areasAsignadasUnicas(sesion?.areas ?? []), [sesion?.areas]);

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

  const cargaAreas = useMemo(
    () =>
      [
        ["Diseño 3D", LayoutGrid],
        ["Impresión 3D", Boxes],
        ["Casting", Gem],
        ["Taller", Hammer],
        ["Corte Láser", Scissors],
        ["Área ventas", PackageCheck],
      ] as const,
    [],
  );

  const modulos = useMemo(() => {
    if (!esOperario) {
      return [
        { to: "/clientes", label: "Clientes", icono: Users, subtitulo: "Cartera y fichas" },
        { to: "/cotizaciones", label: "Cotizaciones", icono: ClipboardList, subtitulo: "Propuestas comerciales" },
        { to: "/pedidos-2", label: "Pedidos", icono: PackageCheck, subtitulo: "Centro operativo" },
        { to: "/inventario", label: "Inventario", icono: Boxes, subtitulo: "Stock y movimientos" },
        { to: "/ventas-2", label: "Ventas", icono: PackageCheck, subtitulo: "Centro comercial" },
        { to: "/gestion", label: "Gestión", icono: Wrench, subtitulo: "Administración del taller" },
      ];
    }

    const tarjetas = areasOperario.map((area) => {
      const asignados = pedidos.filter(
        (pedido) =>
          !esEstadoFinalPedido(pedido.estado) &&
          !pedidoEnRecepcion(pedido.estado) &&
          pedido.estado === "En Producción" &&
          pedidoAsignadoAArea(pedido, area),
      );
      const enTrabajo = asignados.filter((pedido) => pedidoEnAreaActual(pedido, area));
      const urgentes = enTrabajo.filter(esUrgente);
      return {
        to: areaRuta[area],
        label: area,
        icono: iconosArea[area] ?? Hammer,
        subtitulo: resumenOperario(asignados.length, enTrabajo.length, urgentes.length),
      };
    });

    if (areasOperario.some((area) => areaCoincide(area, "Taller"))) {
      tarjetas.push({
        to: "/herramientas",
        label: "Herramientas",
        icono: Wrench,
        subtitulo: "Calculadoras técnicas",
      });
    }

    tarjetas.push({
      to: "/perfil",
      label: "Perfil",
      icono: UserRound,
      subtitulo: "Datos y sesión",
    });

    return tarjetas;
  }, [areasOperario, esOperario, pedidos]);

  if (esOperario) {
    return (
      <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:hidden">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Panel de acceso</p>
            <h1 className="mt-1 truncate font-display text-3xl">Hola {sesion?.perfil.nombre?.trim() || "Usuario"}</h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {sesion ? rolEtiqueta[sesion.rolPrincipal] : "Cargando..."}
            </p>
          </div>
          <button type="button" onClick={() => void cerrarSesion()} className="shrink-0 rounded-full border border-danger/25 bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
            Cerrar sesión
          </button>
        </header>

        {cargandoPedidos ? (
          <div className="mb-3 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-card">Cargando tus áreas...</div>
        ) : null}

        {!cargandoPedidos && areasOperario.length === 0 ? (
          <div className="mb-3 rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="text-base font-semibold">Sin áreas asignadas</p>
            <p className="mt-2 text-sm text-muted-foreground">Pide a un administrador que asigne tus áreas de trabajo.</p>
          </div>
        ) : null}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {modulos.map((modulo) => {
            const Icono = modulo.icono;
            return (
              <button key={modulo.to} type="button" onClick={() => void navigate({ to: modulo.to as never })} className="min-h-[118px] rounded-2xl border border-gold/20 bg-card p-4 text-left shadow-card transition active:scale-[0.98] hover:border-gold/40 hover:shadow-raised focus-visible:border-gold focus-visible:outline-none">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-2xl border border-gold/20 bg-gold/10 text-gold-deep">{Icono ? <Icono className="size-5" aria-hidden="true" /> : null}</span>
                  <ChevronRight className="mt-1 size-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-base font-semibold leading-tight">{modulo.label}</h2>
                {modulo.subtitulo ? <p className="mt-2 text-xs font-medium leading-snug text-muted-foreground">{modulo.subtitulo}</p> : null}
              </button>
            );
          })}
        </section>
      </main>
    );
  }

  return (
    <AppShell
      titulo="Centro de control"
      subtitulo={sesion?.sede?.nombre ? `Sede ${sesion.sede.nombre} · ${rolEtiqueta[sesion.rolPrincipal]}` : "Visión general del taller"}
      acciones={
        <>
          <Link to="/pedidos-2" className="rounded-xl border border-gold/30 bg-gold px-4 py-2.5 text-xs font-semibold text-gold-foreground shadow-card transition hover:shadow-raised">Ver pedidos</Link>
          <Link to="/pedidos-2/nuevo" className="rounded-xl border border-gold/30 bg-card px-4 py-2.5 text-xs font-semibold text-gold-deep shadow-card transition hover:bg-gold/5 hover:shadow-raised">Nuevo pedido</Link>
          <Link to="/cotizaciones" className="rounded-xl border border-gold/30 bg-card px-4 py-2.5 text-xs font-semibold text-gold-deep shadow-card transition hover:bg-gold/5 hover:shadow-raised">Nueva cotización</Link>
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
            accion={<Link to="/pedidos-2" className="text-xs font-semibold text-gold hover:underline">Ver pedidos</Link>}
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
              const destino = area === "Área ventas" ? "/ventas-2" : areaRuta[area];
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

const iconosArea: Record<string, typeof Hammer> = {
  "Diseño 3D": LayoutGrid,
  "Impresión 3D": Boxes,
  "Corte Láser": Scissors,
  Casting: Hammer,
  Taller: Hammer,
  "Área ventas": Boxes,
  Pedidos: LayoutGrid,
};

function areasAsignadasUnicas(areas: string[]) {
  const vistas = new Set<string>();
  return areas.map(normalizarArea).filter((area) => areaRuta[area]).filter((area) => {
    if (vistas.has(area)) return false;
    vistas.add(area);
    return true;
  });
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

function resumenOperario(pendientes: number, enArea: number, urgentes: number) {
  const partes = [`${pendientes} pendiente${pendientes === 1 ? "" : "s"}`];
  if (enArea > 0) partes.push(`${enArea} en área`);
  if (urgentes > 0) partes.push(`${urgentes} urgente${urgentes === 1 ? "" : "s"}`);
  return partes.join(" · ");
}
