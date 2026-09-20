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
  esVistaMovilTablet,
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
  const { data: pedidos = [], isLoading: cargandoPedidos } = usePedidosSelector();\n  const { data: materiales = [], isLoading: cargandoInventario } = useInventario();
  const cerrarSesion = useCerrarSesion();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || !sesion) return;
    if (sesion.rolPrincipal !== "operario" && !sesion.esAdmin) {
      navigate({ to: "/pedidos" });
      return;
    }
    if (sesion.rolPrincipal === "operario" && !esVistaMovilTablet()) {
      navigate({ to: "/operario" });
    }
  }, [isLoading, navigate, sesion]);

  const esOperario = sesion?.rolPrincipal === "operario";
  const areasOperario = useMemo(() => areasAsignadasUnicas(sesion?.areas ?? []), [sesion?.areas]);

  const resumen = useMemo(() => {
    const activos = pedidos.filter((p) => !esEstadoFinalPedido(p.estado));
    const produccion = activos.filter((p) => p.estado === "En Producción");
    const recepcion = activos.filter((p) => pedidoEnRecepcion(p.estado));
    const urgentes = activos.filter(esUrgente);
    return { activos, produccion, recepcion, urgentes };
  }, [pedidos, materiales]);

  const modulos = useMemo(() => {
    if (!esOperario) {
      return [
        { to: "/clientes", label: "Clientes", icono: Users, subtitulo: "Cartera y fichas" },
        { to: "/cotizaciones", label: "Cotizaciones", icono: ClipboardList, subtitulo: "Propuestas comerciales" },
        { to: "/pedidos", label: "Pedidos", icono: PackageCheck, subtitulo: "Seguimiento central" },
        { to: "/inventario", label: "Inventario", icono: Boxes, subtitulo: "Stock y movimientos" },
        { to: "/ventas", label: "Ventas", icono: PackageCheck, subtitulo: "Ventas y entregas" },
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
              <button key={modulo.to} type="button" onClick={() => void navigate({ to: modulo.to as never })} className="min-h-[118px] rounded-2xl border border-border bg-card p-4 text-left shadow-card transition active:scale-[0.98] focus-visible:border-gold focus-visible:outline-none">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-2xl bg-ink text-gold">{Icono ? <Icono className="size-5" aria-hidden="true" /> : null}</span>
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
          <Link to="/pedidos" className="rounded-lg bg-ink px-4 py-2.5 text-xs font-semibold text-ink-foreground">Ver pedidos</Link>
          <Link to="/cotizaciones" className="rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-semibold">Nueva cotización</Link>
        </>
      }
    >
      <div className="space-y-6">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard etiqueta="Pedidos activos" valor={String(resumen.activos.length)} />
          <StatCard etiqueta="En producción" valor={String(resumen.produccion.length)} />
          <StatCard etiqueta="En recepción" valor={String(resumen.recepcion.length)} />
          <StatCard etiqueta="Urgentes" valor={String(resumen.urgentes.length)} tono={resumen.urgentes.length ? "negativo" : "positivo"} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <Panel
            titulo="Pedidos que requieren atención"
            accion={<Link to="/pedidos" className="text-xs font-semibold text-gold hover:underline">Ver todos</Link>}
          >
            <div className="divide-y divide-border">
              {cargandoPedidos ? (
                <div className="p-6 text-sm text-muted-foreground">Cargando pedidos...</div>
              ) : resumen.activos.length === 0 ? (
                <div className="p-8 text-center">
                  <Clock3 className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">No hay pedidos activos</p>
                  <p className="mt-1 text-xs text-muted-foreground">Cuando ingresen pedidos aparecerán aquí.</p>
                </div>
              ) : (
                resumen.activos.slice(0, 7).map((pedido) => (
                  <Link key={pedido.id} to="/pedidos/$id" params={{ id: pedido.id }} className="flex items-center justify-between gap-4 px-4 py-4 transition hover:bg-muted/40 lg:px-6">
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
            <div className="grid gap-2 p-3">
              {modulos.slice(0, 6).map((modulo) => {
                const Icono = modulo.icono;
                return (
                  <Link key={modulo.to} to={modulo.to as never} className="flex items-center gap-3 rounded-xl border border-border px-3 py-3 transition hover:bg-muted/40">
                    <span className="grid size-9 place-items-center rounded-lg bg-ink text-gold">{Icono ? <Icono className="size-4" /> : null}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{modulo.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{modulo.subtitulo}</span>
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          </Panel>
        </section>

        <Panel titulo="Flujo del taller">
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Pedidos", value: resumen.activos.length, icon: ClipboardList, to: "/pedidos" },
              { label: "Diseño 3D", value: pedidos.filter((p) => p.area_actual === "Diseño 3D").length, icon: LayoutGrid, to: "/diseno-3d" },
              { label: "Impresión", value: pedidos.filter((p) => p.area_actual === "Impresión 3D").length, icon: Boxes, to: "/impresion-3d" },
              { label: "Casting", value: pedidos.filter((p) => p.area_actual === "Casting").length, icon: Gem, to: "/casting" },
              { label: "Taller", value: pedidos.filter((p) => p.area_actual === "Taller").length, icon: Hammer, to: "/taller" },
            ].map((item) => {
              const Icono = item.icon;
              return (
                <Link key={item.label} to={item.to as never} className="rounded-xl border border-border bg-card p-4 transition hover:border-gold/40 hover:shadow-card">
                  <div className="flex items-center justify-between">
                    <Icono className="size-4 text-gold" />
                    <span className="text-xl font-semibold">{item.value}</span>
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
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
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">{label}</p>
      <p className="mt-1 font-display text-2xl text-white">{value}</p>
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
