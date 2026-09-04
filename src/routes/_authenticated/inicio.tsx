import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Boxes, ChevronRight, Hammer, LayoutGrid, UserRound, Wrench } from "lucide-react";
import { useEffect, useMemo } from "react";
import { modulosAdminMovil } from "@/components/AppShell";
import { PushDuenoCard } from "@/components/PushDuenoCard";
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
import { pedidoEnRecepcion, usePedidos, type Pedido } from "@/lib/taller-db";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "Inicio — Aurum Lab" },
      {
        name: "description",
        content: "Acceso rápido móvil a los módulos principales del ERP de joyería.",
      },
    ],
  }),
  component: InicioAdminMovil,
});

function InicioAdminMovil() {
  const { data: sesion, isLoading } = useSesion();
  const { data: pedidos = [], isLoading: cargandoPedidos } = usePedidos();
  const cerrarSesion = useCerrarSesion();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || !sesion) return;
    if (sesion.rolPrincipal !== "operario" && !sesion.esAdmin) {
      navigate({ to: "/pedidos" });
      return;
    }
    if (!esVistaMovilTablet()) {
      navigate({ to: sesion.rolPrincipal === "operario" ? "/operario" : "/pedidos" });
    }
  }, [isLoading, navigate, sesion]);

  const nombre = sesion?.perfil.nombre?.trim() || "Usuario";
  const esOperario = sesion?.rolPrincipal === "operario";
  const areasOperario = useMemo(() => areasAsignadasUnicas(sesion?.areas ?? []), [sesion?.areas]);
  const modulos = useMemo(() => {
    if (!esOperario) return modulosAdminMovil.map((modulo) => ({ ...modulo, subtitulo: "" }));

    const tarjetas = areasOperario.map((area) => {
      const asignados = pedidos.filter(
        (pedido) =>
          pedido.estado !== "Entregado" &&
          pedido.estado !== "Cancelado" &&
          !pedidoEnRecepcion(pedido.estado) &&
          pedidoAsignadoAArea(pedido, area),
      );
      const enTrabajo = asignados.filter((pedido) => pedidoEnAreaActual(pedido, area));
      const urgentes = asignados.filter(esUrgente);
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

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:hidden">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Panel de acceso
          </p>
          <h1 className="mt-1 truncate font-display text-3xl">Hola {nombre}</h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {sesion ? rolEtiqueta[sesion.rolPrincipal] : "Cargando..."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void cerrarSesion()}
          className="shrink-0 rounded-full border border-danger/25 bg-danger-soft px-3 py-2 text-xs font-semibold text-danger"
        >
          Cerrar sesión
        </button>
      </header>

      {esOperario && cargandoPedidos ? (
        <div className="mb-3 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-card">
          Cargando tus áreas...
        </div>
      ) : null}

      {esOperario && !cargandoPedidos && areasOperario.length === 0 ? (
        <div className="mb-3 rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-base font-semibold">Sin áreas asignadas</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Pide a un administrador que asigne tus áreas de trabajo.
          </p>
        </div>
      ) : null}

      <PushDuenoCard sesion={sesion} />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {modulos.map((modulo) => {
          const Icono = modulo.icono;
          return (
            <button
              key={modulo.to}
              type="button"
              onClick={() => void navigate({ to: modulo.to as never })}
              className="min-h-[118px] rounded-2xl border border-border bg-card p-4 text-left shadow-card transition active:scale-[0.98] focus-visible:border-gold focus-visible:outline-none"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-ink text-gold">
                  {Icono ? <Icono className="size-5" aria-hidden="true" /> : null}
                </span>
                <ChevronRight className="mt-1 size-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-base font-semibold leading-tight">{modulo.label}</h2>
              {modulo.subtitulo ? (
                <p className="mt-2 text-xs font-medium leading-snug text-muted-foreground">
                  {modulo.subtitulo}
                </p>
              ) : null}
            </button>
          );
        })}
      </section>
    </main>
  );
}

const iconosArea: Record<string, typeof Hammer> = {
  "Diseño 3D": LayoutGrid,
  "Impresión 3D": Boxes,
  "Corte Láser": Wrench,
  Casting: Hammer,
  Taller: Hammer,
  "Área ventas": Boxes,
  Pedidos: LayoutGrid,
};

function areasAsignadasUnicas(areas: string[]) {
  const vistas = new Set<string>();
  return areas
    .map(normalizarArea)
    .filter((area) => areaRuta[area])
    .filter((area) => {
      if (vistas.has(area)) return false;
      vistas.add(area);
      return true;
    });
}

function diasHastaEntrega(pedido: Pedido) {
  const fechaIso = pedido.fecha_entrega ?? pedido.entrega;
  if (!fechaIso) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const entrega = new Date(fechaIso);
  if (Number.isNaN(entrega.getTime())) return null;
  entrega.setHours(0, 0, 0, 0);
  return Math.ceil((entrega.getTime() - hoy.getTime()) / 86_400_000);
}

function esUrgente(pedido: Pedido) {
  const dias = diasHastaEntrega(pedido);
  return dias !== null && dias <= 1;
}

function resumenOperario(pendientes: number, enArea: number, urgentes: number) {
  const partes = [`${pendientes} pendiente${pendientes === 1 ? "" : "s"}`];
  if (enArea > 0) partes.push(`${enArea} en área`);
  if (urgentes > 0) partes.push(`${urgentes} urgente${urgentes === 1 ? "" : "s"}`);
  return partes.join(" · ");
}
