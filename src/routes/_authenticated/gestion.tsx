import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, Panel, StatCard } from "@/components/AppShell";
import { FechaInput } from "@/components/FechaInput";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  SelectorSedeDueno,
  TODAS_LAS_SEDES,
  useSedeFiltroDueno,
} from "@/hooks/use-sede-filtro-dueno";
import { supabase } from "@/integrations/supabase/client";
import { fmtFecha } from "@/lib/utils";
import {
  estadoClases,
  useActualizarPedido,
  useBorrarGasto,
  useConfigAreas,
  useCrearGasto,
  useGastos,
  useGuardarConfigArea,
  useGuardarSede,
  useInventario,
  usePedidos,
  useSedes,
  useUsuarios,
  type Gasto,
  type Material,
  type Pedido,
  type Sede,
  type Usuario,
  esEstadoFinalPedido,
} from "@/lib/taller-db";
import {
  AREAS,
  areaCoincide,
  correoDesdeUsuario,
  normalizarArea,
  rolEtiqueta,
  useSesion,
  type Rol,
} from "@/lib/auth";
import { actualizarUsuario, borrarUsuario, crearUsuario } from "@/lib/cuentas.functions";

export const Route = createFileRoute("/_authenticated/gestion")({
  head: () => ({
    meta: [
      { title: "Gestión — Aurum Lab" },
      {
        name: "description",
        content:
          "Zona administrativa del taller: resumen, flujo por áreas, entregados, finanzas, automatización, usuarios y sedes.",
      },
      { property: "og:title", content: "Gestión — Aurum Lab" },
      { property: "og:description", content: "Administración completa del taller de joyería." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GestionPage,
});

const eur = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  maximumFractionDigits: 0,
});
const inputCls =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

type Modulo =
  | "resumen"
  | "flujo"
  | "entregados"
  | "finanzas"
  | "respaldo"
  | "automatizacion"
  | "usuarios"
  | "sedes";

function esEntregado(p: Pedido) {
  return p.estado === "Entregado";
}
function esActivo(p: Pedido) {
  return !esEstadoFinalPedido(p.estado);
}
function delMes(fecha: string | null) {
  if (!fecha) return false;
  const d = new Date(fecha);
  const hoy = new Date();
  return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth();
}
function horasEn(desde: string) {
  return (Date.now() - new Date(desde).getTime()) / 36e5;
}

function GestionPage() {
  const { data: sesion } = useSesion();
  const { data: pedidos = [], isLoading } = usePedidos();
  const { sedeFiltro, setSedeFiltro, sedes, filtrarPedidos, etiquetaSede } = useSedeFiltroDueno();
  const [modulo, setModulo] = useState<Modulo>("resumen");

  const esDueno = Boolean(sesion?.esDueno);
  const puedeUsuarios = Boolean(esDueno || sesion?.roles.includes("gerente"));
  const pedidosGestion = useMemo(() => filtrarPedidos(pedidos), [filtrarPedidos, pedidos]);
  const sedeActiva =
    esDueno && sedeFiltro !== TODAS_LAS_SEDES ? sedeFiltro : (sesion?.perfil.sede_id ?? null);

  const modulos: { id: Modulo; label: string; visible: boolean }[] = [
    { id: "resumen", label: "Resumen", visible: true },
    { id: "flujo", label: "Flujo", visible: true },
    { id: "entregados", label: "Pedidos Entregados", visible: puedeUsuarios },
    { id: "finanzas", label: "Finanzas", visible: true },
    { id: "respaldo", label: "Respaldo", visible: puedeUsuarios },
    { id: "automatizacion", label: "Automatización", visible: puedeUsuarios },
    { id: "usuarios", label: "Usuarios", visible: puedeUsuarios },
    { id: "sedes", label: "Sedes", visible: esDueno },
  ];

  return (
    <AppShell
      titulo="Gestión"
      subtitulo={
        isLoading
          ? "Cargando…"
          : `Zona administrativa · ${esDueno ? etiquetaSede : (sesion?.sede?.nombre ?? "tu sede")}`
      }
      acciones={
        <SelectorSedeDueno
          esDueno={esDueno}
          sedes={sedes}
          value={sedeFiltro}
          onChange={setSedeFiltro}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        {modulos
          .filter((m) => m.visible)
          .map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModulo(m.id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                modulo === m.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
      </div>

      {modulo === "resumen" ? (
        <ModuloResumen pedidos={pedidosGestion} sedeActiva={sedeActiva} />
      ) : null}
      {modulo === "flujo" ? <ModuloFlujo pedidos={pedidosGestion} /> : null}
      {modulo === "entregados" ? <ModuloEntregados pedidos={pedidosGestion} /> : null}
      {modulo === "finanzas" ? (
        <ModuloFinanzas pedidos={pedidosGestion} sedePropia={sedeActiva} />
      ) : null}
      {modulo === "respaldo" && puedeUsuarios ? (
        <ModuloRespaldo esDueno={esDueno} sedePropia={sedeActiva} />
      ) : null}
      {modulo === "automatizacion" && puedeUsuarios ? (
        <ModuloAutomatizacion pedidos={pedidosGestion} sedePropia={sedeActiva} />
      ) : null}
      {modulo === "usuarios" && puedeUsuarios ? (
        <ModuloUsuarios esDueno={esDueno} sedePropia={sesion?.perfil.sede_id ?? null} />
      ) : null}
      {modulo === "sedes" && esDueno ? <ModuloSedes /> : null}
    </AppShell>
  );
}

/* ---------------- Resumen ---------------- */

function ModuloResumen({ pedidos, sedeActiva }: { pedidos: Pedido[]; sedeActiva: string | null }) {
  const navigate = useNavigate();
  const { data: materiales = [] } = useInventario();
  const { data: sedes = [] } = useSedes();
  const { data: gastos = [] } = useGastos();
  const materialesVisibles = sedeActiva
    ? materiales.filter((m) => m.sede_id == null || m.sede_id === sedeActiva)
    : materiales;
  const gastosVisibles = sedeActiva ? gastos.filter((g) => g.sede_id === sedeActiva) : gastos;

  const activos = pedidos.filter(esActivo);
  const hoy = new Date().toISOString().slice(0, 10);
  const atrasados = activos.filter((p) => p.fecha_entrega && p.fecha_entrega < hoy);
  const entregadosMes = pedidos.filter(
    (p) => esEntregado(p) && delMes(p.fecha_entrega ?? p.fecha_ingreso),
  );
  const ingresosMes = entregadosMes.reduce((a, p) => a + p.importe, 0);
  const gastosMes = gastosVisibles
    .filter((g) => delMes(g.fecha))
    .reduce((a, g) => a + g.importe, 0);
  const stockBajo = materialesVisibles.filter((m) => m.stock <= m.minimo);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard etiqueta="Pedidos activos" valor={String(activos.length)} />
        <StatCard
          etiqueta="Atrasados"
          valor={String(atrasados.length)}
          tono={atrasados.length ? "negativo" : "neutro"}
        />
        <StatCard
          etiqueta="Entregados del mes"
          valor={String(entregadosMes.length)}
          tono="positivo"
        />
        <StatCard etiqueta="Ingresos del mes" valor={eur.format(ingresosMes)} tono="positivo" />
        <StatCard
          etiqueta="Stock bajo"
          valor={String(stockBajo.length)}
          tono={stockBajo.length ? "negativo" : "neutro"}
        />
        <StatCard etiqueta="Sedes activas" valor={String(sedes.filter((s) => s.activa).length)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel titulo="Pedidos atrasados">
          <ul className="divide-y divide-border">
            {atrasados.slice(0, 8).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      to: "/pedidos/$id",
                      params: { id: p.id },
                      search: { from: "gestion" },
                    })
                  }
                  className="flex w-full items-center justify-between gap-3 px-6 py-3 text-left transition-colors hover:bg-surface-muted/60"
                >
                  <span className="text-sm">
                    {p.referencia} · <span className="text-muted-foreground">{p.cliente}</span>
                  </span>
                  <span className="text-xs text-danger">{fmtFecha(p.fecha_entrega)}</span>
                </button>
              </li>
            ))}
            {atrasados.length === 0 ? (
              <li className="px-6 py-6 text-sm text-muted-foreground">Sin pedidos atrasados.</li>
            ) : null}
          </ul>
        </Panel>
        <Panel titulo="Material bajo mínimo">
          <ul className="divide-y divide-border">
            {stockBajo.slice(0, 8).map((m) => (
              <li key={m.id} className="flex items-center justify-between px-6 py-3">
                <span className="text-sm">{m.material}</span>
                <span className="text-xs text-danger tabular-nums">
                  {m.stock} / {m.minimo} {m.unidad}
                </span>
              </li>
            ))}
            {stockBajo.length === 0 ? (
              <li className="px-6 py-6 text-sm text-muted-foreground">Stock correcto.</li>
            ) : null}
          </ul>
        </Panel>
      </div>
      <p className="text-xs text-muted-foreground">
        Gastos registrados este mes: {eur.format(gastosMes)}
      </p>
    </div>
  );
}

/* ---------------- Flujo ---------------- */

function ModuloFlujo({ pedidos }: { pedidos: Pedido[] }) {
  const navigate = useNavigate();
  const activos = pedidos.filter(esActivo);
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {AREAS.map((area) => {
        const lista = activos.filter((p) => areaCoincide(p.area_actual, area));
        return (
          <Panel key={area} titulo={`${area} · ${lista.length}`}>
            <ul className="divide-y divide-border">
              {lista.slice(0, 10).map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        to: "/pedidos/$id",
                        params: { id: p.id },
                        search: { from: "gestion" },
                      })
                    }
                    className="block w-full px-6 py-3 text-left transition-colors hover:bg-surface-muted/60"
                  >
                    <p className="text-sm font-medium">{p.referencia}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.cliente} · {Math.round(horasEn(p.area_desde))} h en área
                    </p>
                  </button>
                </li>
              ))}
              {lista.length === 0 ? (
                <li className="px-6 py-5 text-xs text-muted-foreground">Vacío</li>
              ) : null}
            </ul>
          </Panel>
        );
      })}
    </div>
  );
}

/* ---------------- Pedidos Entregados (archivo histórico) ---------------- */

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function ModuloEntregados({ pedidos }: { pedidos: Pedido[] }) {
  const navigate = useNavigate();
  const [cliente, setCliente] = useState("");
  const [contrato, setContrato] = useState("");
  const [fecha, setFecha] = useState("");
  const [anio, setAnio] = useState("Todos");
  const [mes, setMes] = useState("Todos");
  const [estadoFinal, setEstadoFinal] = useState("Todos");

  const archivo = useMemo(() => pedidos.filter((p) => esEstadoFinalPedido(p.estado)), [pedidos]);

  const anios = useMemo(() => {
    const set = new Set<string>();
    archivo.forEach((p) => {
      const f = p.fecha_entregado ?? p.fecha_entrega;
      if (f) set.add(String(new Date(f).getFullYear()));
    });
    return Array.from(set).sort().reverse();
  }, [archivo]);

  const lista = useMemo(() => {
    const c = cliente.trim().toLowerCase();
    const n = contrato.trim().toLowerCase();
    return archivo.filter((p) => {
      const entrega = p.fecha_entregado ?? p.fecha_entrega;
      const d = entrega ? new Date(entrega) : null;
      if (c && !(p.cliente ?? "").toLowerCase().includes(c)) return false;
      if (n && !(p.contrato ?? "").toLowerCase().includes(n)) return false;
      if (fecha && (entrega ?? "").slice(0, 10) !== fecha) return false;
      if (anio !== "Todos" && (!d || String(d.getFullYear()) !== anio)) return false;
      if (mes !== "Todos" && (!d || String(d.getMonth() + 1) !== mes)) return false;
      if (estadoFinal !== "Todos" && p.estado !== estadoFinal) return false;
      return true;
    });
  }, [archivo, cliente, contrato, fecha, anio, mes, estadoFinal]);

  const claseInput =
    "min-h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-gold";

  return (
    <Panel titulo={`Pedidos Entregados · ${lista.length}`}>
      <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          placeholder="Cliente"
          className={claseInput}
        />
        <input
          value={contrato}
          onChange={(e) => setContrato(e.target.value)}
          placeholder="Contrato"
          className={claseInput}
        />
        <FechaInput value={fecha} onChangeIso={setFecha} className={claseInput} />
        <select value={anio} onChange={(e) => setAnio(e.target.value)} className={claseInput}>
          <option value="Todos">Todos los años</option>
          {anios.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select value={mes} onChange={(e) => setMes(e.target.value)} className={claseInput}>
          <option value="Todos">Todos los meses</option>
          {MESES.map((m, i) => (
            <option key={m} value={String(i + 1)}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={estadoFinal}
          onChange={(e) => setEstadoFinal(e.target.value)}
          className={claseInput}
        >
          <option value="Todos">Todos los estados</option>
          <option value="Entregado">Entregado</option>
          <option value="Cancelado">Cancelado</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-surface-muted">
              {[
                "Código",
                "Cliente",
                "Contrato",
                "Creado",
                "Entregado",
                "Responsable",
                "Estado final",
                "Importe",
              ].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground ${i === 7 ? "text-right" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lista.map((p) => (
              <tr
                key={p.id}
                onClick={() =>
                  navigate({
                    to: "/pedidos/$id",
                    params: { id: p.id },
                    search: { from: "gestion" },
                  })
                }
                className="cursor-pointer hover:bg-surface-muted/60"
              >
                <td className="px-4 py-3 text-xs font-medium">{p.referencia}</td>
                <td className="px-4 py-3 text-sm">{p.cliente}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{p.contrato || "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {fmtFecha(p.fecha_ingreso) ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {fmtFecha(p.fecha_entregado ?? p.fecha_entrega) ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {p.receptor_envio || p.usuario_entrega || "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-surface-muted px-2 py-1 text-[10px] font-semibold uppercase">
                    {p.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm tabular-nums">
                  {eur.format(p.importe)}
                </td>
              </tr>
            ))}
            {lista.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-sm text-muted-foreground">
                  No hay pedidos archivados con esos filtros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        Historial completo de producción, ventas, pagos, envíos y movimientos: abre cualquier pedido
        para consultarlo.
      </p>
    </Panel>
  );
}

/* ---------------- Finanzas ---------------- */

function ModuloFinanzas({ pedidos, sedePropia }: { pedidos: Pedido[]; sedePropia: string | null }) {
  const actualizar = useActualizarPedido();
  const { data: gastos = [] } = useGastos();
  const crearGasto = useCrearGasto();
  const borrarGasto = useBorrarGasto();
  const [gastoPorEliminar, setGastoPorEliminar] = useState<Gasto | null>(null);
  const [nuevo, setNuevo] = useState({
    concepto: "",
    categoria: "Material",
    importe: 0,
    fecha: new Date().toISOString().slice(0, 10),
  });

  const ventas = pedidos.filter(esEntregado);
  const ingresos = ventas.reduce((a, p) => a + p.importe, 0);
  const cartera = pedidos.reduce((a, p) => a + p.importe, 0);
  const gastosVisibles = sedePropia ? gastos.filter((g) => g.sede_id === sedePropia) : gastos;
  const totalGastos = gastosVisibles.reduce((a, g) => a + g.importe, 0);
  const margen = ingresos - totalGastos;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard etiqueta="Ingresos (entregados)" valor={eur.format(ingresos)} tono="positivo" />
        <StatCard etiqueta="Gastos" valor={eur.format(totalGastos)} tono="negativo" />
        <StatCard
          etiqueta="Margen estimado"
          valor={eur.format(margen)}
          tono={margen >= 0 ? "positivo" : "negativo"}
        />
        <StatCard etiqueta="Cartera total" valor={eur.format(cartera)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <Panel titulo="Registrar gasto">
          <form
            className="space-y-3 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              crearGasto.mutate(
                { ...nuevo, importe: Number(nuevo.importe), sede_id: sedePropia },
                {
                  onSuccess: () => {
                    toast.success("Gasto registrado");
                    setNuevo({ ...nuevo, concepto: "", importe: 0 });
                  },
                  onError: (err) => toast.error(err instanceof Error ? err.message : "Error"),
                },
              );
            }}
          >
            <input
              className={inputCls}
              placeholder="Concepto"
              value={nuevo.concepto}
              onChange={(e) => setNuevo({ ...nuevo, concepto: e.target.value })}
              required
            />
            <select
              className={inputCls}
              value={nuevo.categoria}
              onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })}
            >
              {["Material", "Personal", "Maquinaria", "Local", "General"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                className={inputCls}
                type="number"
                step="0.01"
                placeholder="Importe"
                value={nuevo.importe}
                onChange={(e) => setNuevo({ ...nuevo, importe: Number(e.target.value) })}
              />
              <FechaInput
                className={inputCls}
                value={nuevo.fecha}
                onChangeIso={(iso) => setNuevo({ ...nuevo, fecha: iso })}
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Añadir gasto
            </button>
          </form>
          <ul className="divide-y divide-border border-t border-border">
            {gastosVisibles.slice(0, 10).map((g) => (
              <li key={g.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm">{g.concepto}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {g.categoria} · {fmtFecha(g.fecha)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm tabular-nums">{eur.format(g.importe)}</span>
                  <button
                    type="button"
                    onClick={() => setGastoPorEliminar(g)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <AlertDialog
          open={gastoPorEliminar !== null}
          onOpenChange={(open) => {
            if (!open && !borrarGasto.isPending) setGastoPorEliminar(null);
          }}
        >
          <AlertDialogContent className="mx-4 max-w-sm rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar gasto</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Deseas eliminar el gasto "{gastoPorEliminar?.concepto}"?
                <span className="mt-2 block font-medium text-destructive">
                  Esta acción no se puede deshacer.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={borrarGasto.isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={!gastoPorEliminar || borrarGasto.isPending}
                onClick={() => {
                  if (!gastoPorEliminar) return;
                  borrarGasto.mutate(gastoPorEliminar.id, {
                    onSettled: () => setGastoPorEliminar(null),
                  });
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {borrarGasto.isPending ? "Eliminando..." : "Eliminar gasto"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Panel titulo="Ventas e importes por pedido">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-surface-muted">
                  {["Ref", "Cliente", "Estado", "Importe"].map((h, i) => (
                    <th
                      key={h}
                      className={`px-6 py-3 text-[10px] uppercase tracking-wider text-muted-foreground ${i === 3 ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pedidos.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-muted/60">
                    <td className="px-6 py-3 text-xs font-medium">{p.referencia}</td>
                    <td className="px-6 py-3 text-sm">{p.cliente}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${estadoClases[p.estado] ?? "bg-surface-muted"}`}
                      >
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <input
                        type="number"
                        defaultValue={p.importe}
                        onBlur={(e) => {
                          const importe = Number(e.target.value);
                          if (importe !== p.importe) actualizar.mutate({ id: p.id, importe });
                        }}
                        className="w-28 rounded-lg border border-border bg-card px-2 py-1 text-right text-sm tabular-nums"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Respaldo ---------------- */

const COLUMNAS_PEDIDOS = [
  "id",
  "referencia",
  "cliente",
  "telefono",
  "origen",
  "contrato",
  "trabajo",
  "pieza",
  "material",
  "peso_estimado",
  "talla",
  "cantidad_piezas",
  "piedras",
  "notas",
  "importe",
  "fecha_ingreso",
  "fecha_entrega",
  "entrega",
  "estado",
  "area_actual",
  "area_desde",
  "ruta",
  "sede_id",
  "sede_nombre",
  "ventas_estado",
  "packing_estado",
  "medio_envio",
  "guia_envio",
  "fecha_envio",
  "fecha_listo_entrega",
  "fecha_entregado",
  "receptor_envio",
  "notas_ventas",
  "listo_entrega_observaciones",
  "notas_envio",
  "notas_entrega",
  "usuario_listo_entrega",
  "usuario_envio",
  "usuario_entrega",
  "ventas_actualizado_por",
  "ventas_actualizado_en",
  "enviado_at",
  "entregado_at",
] as const;

const COLUMNAS_INVENTARIO = [
  "id",
  "material",
  "categoria",
  "stock",
  "unidad",
  "minimo",
  "sede_id",
  "areas",
] as const;

const COLUMNAS_GASTOS = ["id", "concepto", "categoria", "importe", "fecha", "sede_id"] as const;
const COLUMNAS_SEDES = ["id", "nombre", "ciudad", "modo", "activa"] as const;
const COLUMNAS_USUARIOS = [
  "id",
  "nombre",
  "dni",
  "telefono",
  "sede_id",
  "activo",
  "acceso_desde",
  "acceso_hasta",
  "roles",
  "areas",
] as const;

type CsvRegistro = Record<string, string>;

function valorCsv(valor: unknown) {
  if (Array.isArray(valor)) return valor.join("|");
  if (valor == null) return "";
  return String(valor);
}

function generarCsv<T extends Record<string, unknown>>(columnas: readonly string[], filas: T[]) {
  const escapar = (valor: unknown) => {
    const texto = valorCsv(valor);
    return /[;"\n\r]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
  };
  return [
    columnas.join(";"),
    ...filas.map((fila) => columnas.map((col) => escapar(fila[col])).join(";")),
  ].join("\n");
}

function descargarCsv(nombre: string, contenido: string) {
  const blob = new Blob([`\uFEFF${contenido}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombre;
  link.click();
  URL.revokeObjectURL(url);
}

function detectarSeparador(cabecera: string) {
  return cabecera.includes(";") ? ";" : ",";
}

function dividirLineaCsv(linea: string, separador: string) {
  const celdas: string[] = [];
  let actual = "";
  let enComillas = false;
  for (let i = 0; i < linea.length; i += 1) {
    const char = linea[i];
    const siguiente = linea[i + 1];
    if (char === '"' && enComillas && siguiente === '"') {
      actual += '"';
      i += 1;
    } else if (char === '"') {
      enComillas = !enComillas;
    } else if (char === separador && !enComillas) {
      celdas.push(actual);
      actual = "";
    } else {
      actual += char;
    }
  }
  celdas.push(actual);
  return celdas;
}

function leerCsv(texto: string): CsvRegistro[] {
  const limpio = texto.replace(/^\uFEFF/, "").trim();
  if (!limpio) return [];
  const lineas = limpio.split(/\r?\n/).filter(Boolean);
  const separador = detectarSeparador(lineas[0] ?? "");
  const columnas = dividirLineaCsv(lineas[0] ?? "", separador).map((c) => c.trim());
  return lineas.slice(1).map((linea) => {
    const valores = dividirLineaCsv(linea, separador);
    return Object.fromEntries(columnas.map((col, i) => [col, valores[i] ?? ""]));
  });
}

function listaDesdeCsv(valor: string) {
  return valor
    .split("|")
    .map((v) => v.trim())
    .filter(Boolean);
}

function nuloSiVacio(valor: string) {
  const limpio = valor.trim();
  return limpio ? limpio : null;
}

function nombreArchivo(prefix: string) {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
}

function errorCampoOpcional(error: { message?: string; code?: string }) {
  const mensaje = (error.message ?? "").toLowerCase();
  return (
    error.code === "42703" ||
    mensaje.includes("schema cache") ||
    mensaje.includes("ventas_estado") ||
    mensaje.includes("packing_estado") ||
    mensaje.includes("fecha_listo_entrega") ||
    mensaje.includes("usuario_envio")
  );
}

async function importarPedidosCsv(registros: CsvRegistro[]) {
  const filas = registros
    .filter((r) => r["referencia"]?.trim())
    .map((r) => ({
      ...(r["id"]?.trim() ? { id: r["id"].trim() } : {}),
      referencia: r["referencia"]!.trim(),
      cliente: r["cliente"] ?? "",
      telefono: r["telefono"] ?? "",
      origen: r["origen"] ?? "",
      contrato: r["contrato"] ?? "",
      trabajo: r["trabajo"] ?? "",
      pieza: r["pieza"] ?? r["trabajo"] ?? "",
      material: r["material"] ?? "",
      peso_estimado: r["peso_estimado"] ?? "",
      talla: r["talla"] ?? "",
      cantidad_piezas: Number(r["cantidad_piezas"]) || 1,
      piedras: r["piedras"] ?? "",
      notas: r["notas"] ?? "",
      importe: Number(r["importe"]) || 0,
      fecha_ingreso: r["fecha_ingreso"] || new Date().toISOString().slice(0, 10),
      fecha_entrega: nuloSiVacio(r["fecha_entrega"] ?? ""),
      entrega: r["entrega"] ?? r["fecha_entrega"] ?? "",
      estado: r["estado"] || r["area_actual"] || "Pedidos",
      area_actual: r["area_actual"] || r["estado"] || "Pedidos",
      area_desde: r["area_desde"] || new Date().toISOString(),
      ruta: listaDesdeCsv(r["ruta"] ?? ""),
      sede_id: nuloSiVacio(r["sede_id"] ?? ""),
      ventas_estado: r["ventas_estado"] || "Recibido en ventas",
      packing_estado: r["packing_estado"] || "Pendiente",
      medio_envio: r["medio_envio"] ?? "",
      guia_envio: r["guia_envio"] ?? "",
      fecha_envio: nuloSiVacio(r["fecha_envio"] ?? ""),
      fecha_listo_entrega: nuloSiVacio(r["fecha_listo_entrega"] ?? ""),
      fecha_entregado: nuloSiVacio(r["fecha_entregado"] ?? ""),
      receptor_envio: r["receptor_envio"] ?? "",
      notas_ventas: r["notas_ventas"] ?? "",
      listo_entrega_observaciones: r["listo_entrega_observaciones"] ?? "",
      notas_envio: r["notas_envio"] ?? "",
      notas_entrega: r["notas_entrega"] ?? "",
      usuario_listo_entrega: nuloSiVacio(r["usuario_listo_entrega"] ?? ""),
      usuario_envio: nuloSiVacio(r["usuario_envio"] ?? ""),
      usuario_entrega: nuloSiVacio(r["usuario_entrega"] ?? ""),
      ventas_actualizado_por: nuloSiVacio(r["ventas_actualizado_por"] ?? ""),
      ventas_actualizado_en: nuloSiVacio(r["ventas_actualizado_en"] ?? ""),
      enviado_at: nuloSiVacio(r["enviado_at"] ?? ""),
      entregado_at: nuloSiVacio(r["entregado_at"] ?? ""),
    }));

  const base = filas.map(
    ({
      ventas_estado,
      packing_estado,
      medio_envio,
      guia_envio,
      fecha_envio,
      fecha_listo_entrega,
      fecha_entregado,
      receptor_envio,
      notas_ventas,
      listo_entrega_observaciones,
      notas_envio,
      notas_entrega,
      usuario_listo_entrega,
      usuario_envio,
      usuario_entrega,
      ventas_actualizado_por,
      ventas_actualizado_en,
      enviado_at,
      entregado_at,
      ...fila
    }) => fila,
  );
  const { error } = await supabase.from("pedidos").upsert(filas);
  if (!error) return filas.length;
  if (!errorCampoOpcional(error)) throw error;

  const { error: errorBase } = await supabase.from("pedidos").upsert(base);
  if (errorBase) throw errorBase;
  return base.length;
}

async function importarInventarioCsv(registros: CsvRegistro[]) {
  let total = 0;
  for (const r of registros.filter((item) => item["material"]?.trim())) {
    const areas = listaDesdeCsv(r["areas"] ?? "");
    const fila = {
      ...(r["id"]?.trim() ? { id: r["id"].trim() } : {}),
      material: r["material"]!.trim(),
      categoria: r["categoria"] || "Otros insumos",
      stock: Number(r["stock"]) || 0,
      unidad: r["unidad"] || "und",
      minimo: Number(r["minimo"]) || 0,
      sede_id: nuloSiVacio(r["sede_id"] ?? ""),
    };

    const { data, error } = await supabase.from("inventario").upsert(fila).select("id").single();
    if (error) throw error;
    total += 1;

    const materialId = data.id as string;
    await supabase.from("material_areas").delete().eq("material_id", materialId);
    if (areas.length > 0) {
      const { error: errorAreas } = await supabase
        .from("material_areas")
        .insert(areas.map((area) => ({ material_id: materialId, area })));
      if (errorAreas) throw errorAreas;
    }
  }
  return total;
}

function ModuloRespaldo({ esDueno, sedePropia }: { esDueno: boolean; sedePropia: string | null }) {
  const qc = useQueryClient();
  const { data: pedidos = [] } = usePedidos();
  const { data: inventario = [] } = useInventario();
  const { data: gastos = [] } = useGastos();
  const { data: sedes = [] } = useSedes();
  const { data: usuarios = [] } = useUsuarios();
  const [importando, setImportando] = useState<string | null>(null);
  const [importacionPendiente, setImportacionPendiente] = useState<{
    archivo: File;
    tipo: "pedidos" | "inventario";
  } | null>(null);

  const pedidosVisibles =
    esDueno && sedePropia == null ? pedidos : pedidos.filter((p) => p.sede_id === sedePropia);
  const inventarioVisible =
    esDueno && sedePropia == null
      ? inventario
      : inventario.filter((m) => m.sede_id == null || m.sede_id === sedePropia);
  const gastosVisibles =
    esDueno && sedePropia == null ? gastos : gastos.filter((g) => g.sede_id === sedePropia);
  const usuariosVisibles =
    esDueno && sedePropia == null ? usuarios : usuarios.filter((u) => u.sede_id === sedePropia);

  async function importarArchivo(archivo: File | undefined, tipo: "pedidos" | "inventario") {
    if (!archivo) return;
    setImportacionPendiente({ archivo, tipo });
  }

  async function confirmarImportacion() {
    if (!importacionPendiente) return;
    const { archivo, tipo } = importacionPendiente;
    setImportando(tipo);
    try {
      const registros = leerCsv(await archivo.text());
      const total =
        tipo === "pedidos"
          ? await importarPedidosCsv(registros)
          : await importarInventarioCsv(registros);
      toast.success(`Importación completada: ${total} registros`);
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["inventario"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo importar el archivo");
    } finally {
      setImportando(null);
      setImportacionPendiente(null);
    }
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <Panel titulo="Descargar respaldo">
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            <BotonRespaldo
              titulo="Pedidos"
              detalle={`${pedidosVisibles.length} registros`}
              onClick={() =>
                descargarCsv(
                  nombreArchivo("pedidos"),
                  generarCsv(COLUMNAS_PEDIDOS, pedidosVisibles),
                )
              }
            />
            <BotonRespaldo
              titulo="Inventario"
              detalle={`${inventarioVisible.length} registros`}
              onClick={() =>
                descargarCsv(
                  nombreArchivo("inventario"),
                  generarCsv(COLUMNAS_INVENTARIO, inventarioVisible),
                )
              }
            />
            <BotonRespaldo
              titulo="Gastos"
              detalle={`${gastosVisibles.length} registros`}
              onClick={() =>
                descargarCsv(nombreArchivo("gastos"), generarCsv(COLUMNAS_GASTOS, gastosVisibles))
              }
            />
            <BotonRespaldo
              titulo="Usuarios"
              detalle={`${usuariosVisibles.length} registros`}
              onClick={() =>
                descargarCsv(
                  nombreArchivo("usuarios"),
                  generarCsv(COLUMNAS_USUARIOS, usuariosVisibles),
                )
              }
            />
            {esDueno ? (
              <BotonRespaldo
                titulo="Sedes"
                detalle={`${sedes.length} registros`}
                onClick={() =>
                  descargarCsv(nombreArchivo("sedes"), generarCsv(COLUMNAS_SEDES, sedes))
                }
              />
            ) : null}
          </div>
        </Panel>

        <Panel titulo="Subir respaldo">
          <div className="space-y-4 p-5">
            <p className="text-sm leading-6 text-muted-foreground">
              Usa archivos CSV exportados desde esta sección. La importación actualiza registros con
              el mismo ID y crea los que no existan.
            </p>
            <ImportadorCsv
              titulo="Importar pedidos"
              cargando={importando === "pedidos"}
              onArchivo={(archivo) => void importarArchivo(archivo, "pedidos")}
            />
            <ImportadorCsv
              titulo="Importar inventario"
              cargando={importando === "inventario"}
              onArchivo={(archivo) => void importarArchivo(archivo, "inventario")}
            />
            <p className="rounded-lg bg-warning-soft px-4 py-3 text-xs leading-5 text-warning">
              Usuarios y sedes se descargan para auditoría. Para restaurarlos conviene revisarlos
              antes, porque afectan accesos y permisos.
            </p>
          </div>
        </Panel>
      </div>
      <AlertDialog
        open={importacionPendiente !== null}
        onOpenChange={(open) => {
          if (!open && !importando) setImportacionPendiente(null);
        }}
      >
        <AlertDialogContent className="mx-4 max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Importar respaldo</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a importar "{importacionPendiente?.archivo.name}". Antes de continuar, asegúrate
              de tener un respaldo descargado.
              <span className="mt-2 block font-medium text-destructive">
                Esta acción puede modificar información existente.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(importando)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!importacionPendiente || Boolean(importando)}
              onClick={() => void confirmarImportacion()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {importando ? "Importando..." : "Importar archivo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function BotonRespaldo({
  titulo,
  detalle,
  onClick,
}: {
  titulo: string;
  detalle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-surface-muted"
    >
      <span className="block text-sm font-semibold">{titulo}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{detalle}</span>
      <span className="mt-4 inline-flex rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
        Descargar CSV
      </span>
    </button>
  );
}

function ImportadorCsv({
  titulo,
  cargando,
  onArchivo,
}: {
  titulo: string;
  cargando: boolean;
  onArchivo: (archivo: File | undefined) => void;
}) {
  return (
    <label className="block rounded-xl border border-dashed border-border bg-card p-4">
      <span className="block text-sm font-semibold">{titulo}</span>
      <span className="mt-1 block text-xs text-muted-foreground">Selecciona un archivo .csv</span>
      <input
        type="file"
        accept=".csv,text/csv"
        disabled={cargando}
        onChange={(e) => {
          onArchivo(e.target.files?.[0]);
          e.currentTarget.value = "";
        }}
        className="mt-3 block w-full text-xs file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary-foreground disabled:opacity-60"
      />
      {cargando ? (
        <span className="mt-2 block text-xs text-muted-foreground">Importando...</span>
      ) : null}
    </label>
  );
}

/* ---------------- Automatización ---------------- */

function ModuloAutomatizacion({
  pedidos,
  sedePropia,
}: {
  pedidos: Pedido[];
  sedePropia: string | null;
}) {
  const { data: config = [] } = useConfigAreas();
  const guardar = useGuardarConfigArea();

  const porArea = useMemo(() => {
    const configVisible = config.filter((c) =>
      sedePropia == null ? c.sede_id == null : c.sede_id === sedePropia,
    );
    const mapa = new Map(configVisible.map((c) => [c.area, c]));
    return AREAS.map((area) => ({
      area,
      horas: mapa.get(area)?.horas_objetivo ?? 48,
      alerta: mapa.get(area)?.alerta_activa ?? true,
    }));
  }, [config, sedePropia]);

  const alertas = pedidos
    .filter(esActivo)
    .map((p) => {
      const cfg = porArea.find((c) => areaCoincide(c.area, p.area_actual));
      const horas = horasEn(p.area_desde);
      return cfg && cfg.alerta && horas > cfg.horas
        ? { pedido: p, horas, objetivo: cfg.horas }
        : null;
    })
    .filter(Boolean) as { pedido: Pedido; horas: number; objetivo: number }[];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel titulo="Tiempos objetivo por área">
        <ul className="divide-y divide-border">
          {porArea.map((c) => (
            <li key={c.area} className="flex items-center justify-between gap-3 px-6 py-3">
              <span className="text-sm">{c.area}</span>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  defaultValue={c.horas}
                  onBlur={(e) =>
                    guardar.mutate({
                      sede_id: sedePropia,
                      area: c.area,
                      horas_objetivo: Number(e.target.value),
                      alerta_activa: c.alerta,
                    })
                  }
                  className="w-20 rounded-lg border border-border bg-card px-2 py-1 text-right text-sm tabular-nums"
                />
                <span className="text-xs text-muted-foreground">h</span>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={c.alerta}
                    onChange={(e) =>
                      guardar.mutate({
                        sede_id: sedePropia,
                        area: c.area,
                        horas_objetivo: c.horas,
                        alerta_activa: e.target.checked,
                      })
                    }
                  />
                  Alerta
                </label>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel titulo={`Alertas internas · ${alertas.length}`}>
        <ul className="divide-y divide-border">
          {alertas.map(({ pedido, horas, objetivo }) => (
            <li key={pedido.id} className="px-6 py-3">
              <p className="text-sm font-medium">
                {pedido.referencia} · {normalizarArea(pedido.area_actual)}
              </p>
              <p className="text-xs text-danger">
                {Math.round(horas)} h en área (objetivo {objetivo} h)
              </p>
            </li>
          ))}
          {alertas.length === 0 ? (
            <li className="px-6 py-6 text-sm text-muted-foreground">
              Ningún pedido supera su tiempo objetivo.
            </li>
          ) : null}
        </ul>
      </Panel>
    </div>
  );
}

/* ---------------- Usuarios ---------------- */

function ModuloUsuarios({ esDueno, sedePropia }: { esDueno: boolean; sedePropia: string | null }) {
  const qc = useQueryClient();
  const { data: todos = [] } = useUsuarios();
  // Un gerente solo ve a los usuarios de su propia sede (nunca al dueño ni a otras sedes).
  const usuarios = esDueno
    ? todos
    : todos.filter(
        (u) => !u.roles.includes("dueno") && u.sede_id != null && u.sede_id === sedePropia,
      );
  const { data: sedes = [] } = useSedes();
  const crear = useServerFn(crearUsuario);
  const borrar = useServerFn(borrarUsuario);

  const [form, setForm] = useState({
    nombre: "",
    usuario: "",
    password: "",
    dni: "",
    telefono: "",
    rol: "gerente" as Rol,
    sede_id: sedePropia ?? "",
    acceso_desde: "",
    acceso_hasta: "",
  });
  const [areas, setAreas] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [usuarioPorEliminar, setUsuarioPorEliminar] = useState<Usuario | null>(null);

  const rolesDisponibles: Rol[] = esDueno
    ? ["dueno", "gerente", "operario", "monitor", "cliente"]
    : ["operario", "monitor", "cliente"];

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      await crear({
        data: {
          correo: correoDesdeUsuario(form.usuario || form.dni),
          password: form.password,
          nombre: form.nombre,
          dni: form.dni,
          telefono: form.telefono,
          rol: form.rol,
          sede_id: form.sede_id || null,
          areas: form.rol === "operario" ? areas : [],
          acceso_desde: form.acceso_desde || null,
          acceso_hasta: form.acceso_hasta || null,
        },
      });
      toast.success("Usuario creado");
      setForm({ ...form, nombre: "", usuario: "", password: "", dni: "", telefono: "" });
      setAreas([]);
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el usuario");
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminarUsuario() {
    if (!usuarioPorEliminar) return;
    try {
      await borrar({ data: { id: usuarioPorEliminar.id } });
      toast.success("Usuario eliminado");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      setUsuarioPorEliminar(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      <Panel titulo="Nuevo usuario">
        <form onSubmit={enviar} className="space-y-3 p-6">
          <input
            className={inputCls}
            placeholder="Nombre completo"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />
          <input
            className={inputCls}
            placeholder="Usuario o DNI de acceso"
            value={form.usuario}
            onChange={(e) => setForm({ ...form, usuario: e.target.value })}
            required
          />
          <input
            className={inputCls}
            type="password"
            placeholder="Contraseña interna (mín. 6)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className={inputCls}
              placeholder="DNI"
              value={form.dni}
              onChange={(e) => setForm({ ...form, dni: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Teléfono"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
          </div>
          <select
            className={inputCls}
            value={form.rol}
            onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}
          >
            {rolesDisponibles.map((r) => (
              <option key={r} value={r}>
                {rolEtiqueta[r]}
              </option>
            ))}
          </select>
          <select
            className={inputCls}
            value={form.sede_id}
            onChange={(e) => setForm({ ...form, sede_id: e.target.value })}
            disabled={!esDueno}
          >
            <option value="">Sin sede asignada</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
                {s.ciudad ? ` — ${s.ciudad}` : ""}
              </option>
            ))}
          </select>

          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              Acceso al sistema (opcional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[11px] text-muted-foreground">
                Desde
                <FechaInput
                  className={inputCls}
                  value={form.acceso_desde}
                  onChangeIso={(iso) => setForm({ ...form, acceso_desde: iso })}
                />
              </label>
              <label className="text-[11px] text-muted-foreground">
                Hasta
                <FechaInput
                  className={inputCls}
                  value={form.acceso_hasta}
                  onChangeIso={(iso) => setForm({ ...form, acceso_hasta: iso })}
                />
              </label>
            </div>
          </div>

          {form.rol === "operario" ? (
            <div className="rounded-lg border border-border p-3">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                Áreas habilitadas
              </p>
              <div className="flex flex-wrap gap-2">
                {AREAS.map((a) => {
                  const activo = areas.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() =>
                        setAreas(activo ? areas.filter((x) => x !== a) : [...areas, a])
                      }
                      className={`rounded-full px-3 py-1 text-[11px] ${
                        activo
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-muted text-muted-foreground"
                      }`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={guardando}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {guardando ? "Creando…" : "Crear usuario"}
          </button>
        </form>
      </Panel>

      <Panel titulo="Usuarios del sistema">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-muted">
                {["Nombre", "DNI", "Rol", "Sede", "Áreas", "Acceso", ""].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usuarios
                .map((u) => (
                  <tr key={u.id} className="hover:bg-surface-muted/60">
                    <td className="px-6 py-3 text-sm">{u.nombre || "—"}</td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">{u.dni || "—"}</td>
                    <td className="px-6 py-3 text-xs">
                      {u.roles.map((r) => rolEtiqueta[r as Rol] ?? r).join(", ") || "Sin rol"}
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {sedes.find((s) => s.id === u.sede_id)?.nombre ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {u.areas.join(", ") || "—"}
                    </td>
                    <td className="px-6 py-3 text-xs">
                      {u.activo === false ? (
                        <span className="text-destructive">Desactivado</span>
                      ) : u.acceso_desde || u.acceso_hasta ? (
                        <span className="text-muted-foreground">
                          {fmtFecha(u.acceso_desde) ?? "—"} → {fmtFecha(u.acceso_hasta) ?? "—"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Sin límite</span>
                      )}
                    </td>
                    <td className="space-x-3 px-6 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setEditando(editando === u.id ? null : u.id)}
                        className="text-xs text-primary hover:underline"
                      >
                        {editando === u.id ? "Cerrar" : "Editar"}
                      </button>
                      {esDueno ? (
                        <button
                          type="button"
                          onClick={() => setUsuarioPorEliminar(u)}
                          className="text-xs text-destructive hover:underline"
                        >
                          Eliminar
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
                .flatMap((fila, i) => {
                  const u = usuarios[i]!;
                  return editando === u.id
                    ? [
                        fila,
                        <tr key={`${u.id}-edit`} className="bg-surface-muted/40">
                          <td colSpan={7} className="px-6 py-4">
                            <EditorUsuario
                              usuario={u}
                              sedes={sedes}
                              esDueno={esDueno}
                              onCerrar={() => setEditando(null)}
                            />
                          </td>
                        </tr>,
                      ]
                    : [fila];
                })}
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-sm text-muted-foreground">
                    Sin usuarios todavía.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
      <AlertDialog
        open={usuarioPorEliminar !== null}
        onOpenChange={(open) => {
          if (!open) setUsuarioPorEliminar(null);
        }}
      >
        <AlertDialogContent className="mx-4 max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar usuario</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Deseas eliminar a "{usuarioPorEliminar?.nombre || "este usuario"}"?
              <span className="mt-2 block font-medium text-destructive">
                Esta acción no se puede deshacer.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!usuarioPorEliminar}
              onClick={() => void confirmarEliminarUsuario()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar usuario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditorUsuario({
  usuario,
  sedes,
  esDueno,
  onCerrar,
}: {
  usuario: Usuario;
  sedes: { id: string; nombre: string; ciudad: string }[];
  esDueno: boolean;
  onCerrar: () => void;
}) {
  const qc = useQueryClient();
  const actualizar = useServerFn(actualizarUsuario);
  const [datos, setDatos] = useState({
    nombre: usuario.nombre,
    dni: usuario.dni,
    telefono: usuario.telefono,
    sede_id: usuario.sede_id ?? "",
    rol: (usuario.roles[0] as Rol) ?? "operario",
    activo: usuario.activo !== false,
    acceso_desde: usuario.acceso_desde ?? "",
    acceso_hasta: usuario.acceso_hasta ?? "",
    password: "",
  });
  const [areas, setAreas] = useState<string[]>(usuario.areas);
  const [guardando, setGuardando] = useState(false);

  const rolesDisponibles: Rol[] = esDueno
    ? ["dueno", "gerente", "operario", "monitor", "cliente"]
    : ["operario", "monitor", "cliente"];

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await actualizar({
        data: {
          id: usuario.id,
          nombre: datos.nombre,
          dni: datos.dni,
          telefono: datos.telefono,
          sede_id: datos.sede_id || null,
          rol: datos.rol,
          areas,
          activo: datos.activo,
          acceso_desde: datos.acceso_desde || null,
          acceso_hasta: datos.acceso_hasta || null,
          password: datos.password || null,
        },
      });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo actualizar");
        return;
      }
      toast.success("Usuario actualizado");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      onCerrar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <input
          className={inputCls}
          placeholder="Nombre"
          value={datos.nombre}
          onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
          required
        />
        <input
          className={inputCls}
          placeholder="DNI"
          value={datos.dni}
          onChange={(e) => setDatos({ ...datos, dni: e.target.value })}
        />
        <input
          className={inputCls}
          placeholder="Teléfono"
          value={datos.telefono}
          onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
        />
        <select
          className={inputCls}
          value={datos.rol}
          onChange={(e) => setDatos({ ...datos, rol: e.target.value as Rol })}
        >
          {rolesDisponibles.map((r) => (
            <option key={r} value={r}>
              {rolEtiqueta[r]}
            </option>
          ))}
        </select>
        <select
          className={inputCls}
          value={datos.sede_id}
          onChange={(e) => setDatos({ ...datos, sede_id: e.target.value })}
          disabled={!esDueno}
        >
          <option value="">Sin sede asignada</option>
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Contraseña actual
          <input
            className={inputCls}
            readOnly
            value={usuario.clave_visible ?? "(no registrada)"}
            onFocus={(e) => e.currentTarget.select()}
          />
        </label>
        <input
          className={inputCls}
          type="text"
          placeholder="Nueva contraseña (opcional)"
          value={datos.password}
          onChange={(e) => setDatos({ ...datos, password: e.target.value })}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Puede entrar desde
          <FechaInput
            className={inputCls}
            value={datos.acceso_desde}
            onChangeIso={(iso) => setDatos({ ...datos, acceso_desde: iso })}
          />
        </label>
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Hasta
          <FechaInput
            className={inputCls}
            value={datos.acceso_hasta}
            onChangeIso={(iso) => setDatos({ ...datos, acceso_hasta: iso })}
          />
        </label>
        <label className="flex items-end gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={datos.activo}
            onChange={(e) => setDatos({ ...datos, activo: e.target.checked })}
          />
          Cuenta activa
        </label>
      </div>

      {datos.rol === "operario" ? (
        <div className="rounded-lg border border-border p-3">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            Áreas habilitadas
          </p>
          <div className="flex flex-wrap gap-2">
            {AREAS.map((a) => {
              const activo = areas.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAreas(activo ? areas.filter((x) => x !== a) : [...areas, a])}
                  className={`rounded-full px-3 py-1 text-[11px] ${
                    activo
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-muted text-muted-foreground"
                  }`}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={guardando}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-lg border border-border px-4 py-2 text-sm"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

/* ---------------- Sedes ---------------- */

function ModuloSedes() {
  const { data: sedes = [] } = useSedes();
  const guardar = useGuardarSede();
  const [nueva, setNueva] = useState({ nombre: "", ciudad: "", modo: "completo" });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      <Panel titulo="Nueva sede">
        <form
          className="space-y-3 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            guardar.mutate(nueva, {
              onSuccess: () => {
                toast.success("Sede creada");
                setNueva({ nombre: "", ciudad: "", modo: "completo" });
              },
              onError: (err) => toast.error(err instanceof Error ? err.message : "Error"),
            });
          }}
        >
          <input
            className={inputCls}
            placeholder="Nombre de la sede"
            value={nueva.nombre}
            onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
            required
          />
          <input
            className={inputCls}
            placeholder="Ciudad"
            value={nueva.ciudad}
            onChange={(e) => setNueva({ ...nueva, ciudad: e.target.value })}
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Crear sede
          </button>
        </form>
      </Panel>

      <Panel titulo="Sedes del grupo">
        <ul className="divide-y divide-border">
          {sedes.map((s) => (
            <li key={s.id} className="grid gap-3 px-6 py-4 sm:grid-cols-2 sm:items-center">
              <input
                className={inputCls}
                defaultValue={s.nombre}
                onBlur={(e) =>
                  e.target.value !== s.nombre &&
                  guardar.mutate({
                    id: s.id,
                    nombre: e.target.value,
                    ciudad: s.ciudad,
                    modo: s.modo,
                  })
                }
              />
              <input
                className={inputCls}
                defaultValue={s.ciudad}
                placeholder="Ciudad"
                onBlur={(e) =>
                  e.target.value !== s.ciudad &&
                  guardar.mutate({
                    id: s.id,
                    nombre: s.nombre,
                    ciudad: e.target.value,
                    modo: s.modo,
                  })
                }
              />
            </li>
          ))}
          {sedes.length === 0 ? (
            <li className="px-6 py-6 text-sm text-muted-foreground">Sin sedes.</li>
          ) : null}
        </ul>
      </Panel>
    </div>
  );
}
