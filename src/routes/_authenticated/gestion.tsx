import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, Panel, StatCard } from "@/components/AppShell";
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
  type Pedido,
  type Usuario,
} from "@/lib/taller-db";
import { AREAS, correoDesdeUsuario, rolEtiqueta, useSesion, type Rol } from "@/lib/auth";
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

const eur = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 0 });
const inputCls =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

type Modulo = "resumen" | "flujo" | "entregados" | "finanzas" | "automatizacion" | "usuarios" | "sedes";

function esEntregado(p: Pedido) {
  return p.area_actual === "Entregado" || p.estado === "Entregado";
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
  const [modulo, setModulo] = useState<Modulo>("resumen");

  const esDueno = Boolean(sesion?.esDueno);
  const puedeUsuarios = Boolean(esDueno || sesion?.roles.includes("gerente"));

  const modulos: { id: Modulo; label: string; visible: boolean }[] = [
    { id: "resumen", label: "Resumen", visible: true },
    { id: "flujo", label: "Flujo", visible: true },
    { id: "entregados", label: "Entregados", visible: true },
    { id: "finanzas", label: "Finanzas", visible: true },
    { id: "automatizacion", label: "Automatización", visible: puedeUsuarios },
    { id: "usuarios", label: "Usuarios", visible: puedeUsuarios },
    { id: "sedes", label: "Sedes", visible: esDueno },
  ];

  return (
    <AppShell titulo="Gestión" subtitulo={isLoading ? "Cargando…" : "Zona administrativa del taller"}>
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

      {modulo === "resumen" ? <ModuloResumen pedidos={pedidos} /> : null}
      {modulo === "flujo" ? <ModuloFlujo pedidos={pedidos} /> : null}
      {modulo === "entregados" ? <ModuloEntregados pedidos={pedidos} /> : null}
      {modulo === "finanzas" ? <ModuloFinanzas pedidos={pedidos} sedePropia={sesion?.perfil.sede_id ?? null} /> : null}
      {modulo === "automatizacion" && puedeUsuarios ? (
        <ModuloAutomatizacion pedidos={pedidos} sedePropia={sesion?.perfil.sede_id ?? null} />
      ) : null}
      {modulo === "usuarios" && puedeUsuarios ? (
        <ModuloUsuarios esDueno={esDueno} sedePropia={sesion?.perfil.sede_id ?? null} />
      ) : null}
      {modulo === "sedes" && esDueno ? <ModuloSedes /> : null}
    </AppShell>
  );
}

/* ---------------- Resumen ---------------- */

function ModuloResumen({ pedidos }: { pedidos: Pedido[] }) {
  const { data: materiales = [] } = useInventario();
  const { data: sedes = [] } = useSedes();
  const { data: gastos = [] } = useGastos();

  const activos = pedidos.filter((p) => !esEntregado(p));
  const hoy = new Date().toISOString().slice(0, 10);
  const atrasados = activos.filter((p) => p.fecha_entrega && p.fecha_entrega < hoy);
  const entregadosMes = pedidos.filter((p) => esEntregado(p) && delMes(p.fecha_entrega ?? p.fecha_ingreso));
  const ingresosMes = entregadosMes.reduce((a, p) => a + p.importe, 0);
  const gastosMes = gastos.filter((g) => delMes(g.fecha)).reduce((a, g) => a + g.importe, 0);
  const stockBajo = materiales.filter((m) => m.stock <= m.minimo);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard etiqueta="Pedidos activos" valor={String(activos.length)} />
        <StatCard etiqueta="Atrasados" valor={String(atrasados.length)} tono={atrasados.length ? "negativo" : "neutro"} />
        <StatCard etiqueta="Entregados del mes" valor={String(entregadosMes.length)} tono="positivo" />
        <StatCard etiqueta="Ingresos del mes" valor={eur.format(ingresosMes)} tono="positivo" />
        <StatCard etiqueta="Stock bajo" valor={String(stockBajo.length)} tono={stockBajo.length ? "negativo" : "neutro"} />
        <StatCard etiqueta="Sedes activas" valor={String(sedes.filter((s) => s.activa).length)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel titulo="Pedidos atrasados">
          <ul className="divide-y divide-border">
            {atrasados.slice(0, 8).map((p) => (
              <li key={p.id} className="flex items-center justify-between px-6 py-3">
                <span className="text-sm">
                  {p.referencia} · <span className="text-muted-foreground">{p.cliente}</span>
                </span>
                <span className="text-xs text-danger">{p.fecha_entrega}</span>
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
      <p className="text-xs text-muted-foreground">Gastos registrados este mes: {eur.format(gastosMes)}</p>
    </div>
  );
}

/* ---------------- Flujo ---------------- */

function ModuloFlujo({ pedidos }: { pedidos: Pedido[] }) {
  const activos = pedidos.filter((p) => !esEntregado(p));
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {AREAS.filter((a) => a !== "Entregado").map((area) => {
        const lista = activos.filter((p) => p.area_actual === area);
        return (
          <Panel key={area} titulo={`${area} · ${lista.length}`}>
            <ul className="divide-y divide-border">
              {lista.slice(0, 10).map((p) => (
                <li key={p.id} className="px-6 py-3">
                  <p className="text-sm font-medium">{p.referencia}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.cliente} · {Math.round(horasEn(p.area_desde))} h en área
                  </p>
                </li>
              ))}
              {lista.length === 0 ? <li className="px-6 py-5 text-xs text-muted-foreground">Vacío</li> : null}
            </ul>
          </Panel>
        );
      })}
    </div>
  );
}

/* ---------------- Entregados ---------------- */

function ModuloEntregados({ pedidos }: { pedidos: Pedido[] }) {
  const entregados = pedidos.filter(esEntregado);
  return (
    <Panel titulo={`Trabajos finalizados · ${entregados.length}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-surface-muted">
              {["Ref", "Cliente", "Trabajo", "Entrega", "Importe"].map((h, i) => (
                <th
                  key={h}
                  className={`px-6 py-3 text-[10px] uppercase tracking-wider text-muted-foreground ${i === 4 ? "text-right" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entregados.map((p) => (
              <tr key={p.id} className="hover:bg-surface-muted/60">
                <td className="px-6 py-3 text-xs font-medium">{p.referencia}</td>
                <td className="px-6 py-3 text-sm">{p.cliente}</td>
                <td className="px-6 py-3 text-sm text-muted-foreground">{p.trabajo || p.pieza}</td>
                <td className="px-6 py-3 text-xs text-muted-foreground">{p.fecha_entrega ?? "—"}</td>
                <td className="px-6 py-3 text-right text-sm tabular-nums">{eur.format(p.importe)}</td>
              </tr>
            ))}
            {entregados.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-sm text-muted-foreground">
                  Todavía no hay trabajos entregados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ---------------- Finanzas ---------------- */

function ModuloFinanzas({ pedidos, sedePropia }: { pedidos: Pedido[]; sedePropia: string | null }) {
  const actualizar = useActualizarPedido();
  const { data: gastos = [] } = useGastos();
  const crearGasto = useCrearGasto();
  const borrarGasto = useBorrarGasto();
  const [nuevo, setNuevo] = useState({
    concepto: "",
    categoria: "Material",
    importe: 0,
    fecha: new Date().toISOString().slice(0, 10),
  });

  const ventas = pedidos.filter(esEntregado);
  const ingresos = ventas.reduce((a, p) => a + p.importe, 0);
  const cartera = pedidos.reduce((a, p) => a + p.importe, 0);
  const totalGastos = gastos.reduce((a, g) => a + g.importe, 0);
  const margen = ingresos - totalGastos;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard etiqueta="Ingresos (entregados)" valor={eur.format(ingresos)} tono="positivo" />
        <StatCard etiqueta="Gastos" valor={eur.format(totalGastos)} tono="negativo" />
        <StatCard etiqueta="Margen estimado" valor={eur.format(margen)} tono={margen >= 0 ? "positivo" : "negativo"} />
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
              <input
                className={inputCls}
                type="date"
                value={nuevo.fecha}
                onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })}
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
            {gastos.slice(0, 10).map((g) => (
              <li key={g.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm">{g.concepto}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {g.categoria} · {g.fecha}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm tabular-nums">{eur.format(g.importe)}</span>
                  <button
                    type="button"
                    onClick={() => borrarGasto.mutate(g.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

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
                        className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${estadoClases[p.area_actual] ?? "bg-surface-muted"}`}
                      >
                        {p.area_actual}
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

/* ---------------- Automatización ---------------- */

function ModuloAutomatizacion({ pedidos, sedePropia }: { pedidos: Pedido[]; sedePropia: string | null }) {
  const { data: config = [] } = useConfigAreas();
  const guardar = useGuardarConfigArea();

  const porArea = useMemo(() => {
    const mapa = new Map(config.map((c) => [c.area, c]));
    return AREAS.filter((a) => a !== "Entregado").map((area) => ({
      area,
      horas: mapa.get(area)?.horas_objetivo ?? 48,
      alerta: mapa.get(area)?.alerta_activa ?? true,
    }));
  }, [config]);

  const alertas = pedidos
    .filter((p) => !esEntregado(p))
    .map((p) => {
      const cfg = porArea.find((c) => c.area === p.area_actual);
      const horas = horasEn(p.area_desde);
      return cfg && cfg.alerta && horas > cfg.horas ? { pedido: p, horas, objetivo: cfg.horas } : null;
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
                {pedido.referencia} · {pedido.area_actual}
              </p>
              <p className="text-xs text-danger">
                {Math.round(horas)} h en área (objetivo {objetivo} h)
              </p>
            </li>
          ))}
          {alertas.length === 0 ? (
            <li className="px-6 py-6 text-sm text-muted-foreground">Ningún pedido supera su tiempo objetivo.</li>
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
                <input
                  type="date"
                  className={inputCls}
                  value={form.acceso_desde}
                  onChange={(e) => setForm({ ...form, acceso_desde: e.target.value })}
                />
              </label>
              <label className="text-[11px] text-muted-foreground">
                Hasta
                <input
                  type="date"
                  className={inputCls}
                  value={form.acceso_hasta}
                  onChange={(e) => setForm({ ...form, acceso_hasta: e.target.value })}
                />
              </label>
            </div>
          </div>

          {form.rol === "operario" ? (
            <div className="rounded-lg border border-border p-3">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Áreas habilitadas</p>
              <div className="flex flex-wrap gap-2">
                {AREAS.map((a) => {
                  const activo = areas.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAreas(activo ? areas.filter((x) => x !== a) : [...areas, a])}
                      className={`rounded-full px-3 py-1 text-[11px] ${
                        activo ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground"
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
                  <th key={h} className="px-6 py-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-surface-muted/60">
                  <td className="px-6 py-3 text-sm">{u.nombre || "—"}</td>
                  <td className="px-6 py-3 text-xs text-muted-foreground">{u.dni || "—"}</td>
                  <td className="px-6 py-3 text-xs">
                    {u.roles.map((r) => rolEtiqueta[r as Rol] ?? r).join(", ") || "Sin rol"}
                  </td>
                  <td className="px-6 py-3 text-xs text-muted-foreground">
                    {sedes.find((s) => s.id === u.sede_id)?.nombre ?? "—"}
                  </td>
                  <td className="px-6 py-3 text-xs text-muted-foreground">{u.areas.join(", ") || "—"}</td>
                  <td className="px-6 py-3 text-xs">
                    {u.activo === false ? (
                      <span className="text-destructive">Desactivado</span>
                    ) : u.acceso_desde || u.acceso_hasta ? (
                      <span className="text-muted-foreground">
                        {u.acceso_desde ?? "—"} → {u.acceso_hasta ?? "—"}
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
                        onClick={async () => {
                          if (!confirm(`¿Eliminar a ${u.nombre || "este usuario"}?`)) return;
                          try {
                            await borrar({ data: { id: u.id } });
                            toast.success("Usuario eliminado");
                            qc.invalidateQueries({ queryKey: ["usuarios"] });
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
                          }
                        }}
                        className="text-xs text-destructive hover:underline"
                      >
                        Eliminar
                      </button>
                    ) : null}
                  </td>
                </tr>
              )).flatMap((fila, i) => {
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
        <input
          className={inputCls}
          type="password"
          placeholder="Nueva contraseña (opcional)"
          value={datos.password}
          onChange={(e) => setDatos({ ...datos, password: e.target.value })}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Puede entrar desde
          <input
            type="date"
            className={inputCls}
            value={datos.acceso_desde}
            onChange={(e) => setDatos({ ...datos, acceso_desde: e.target.value })}
          />
        </label>
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Hasta
          <input
            type="date"
            className={inputCls}
            value={datos.acceso_hasta}
            onChange={(e) => setDatos({ ...datos, acceso_hasta: e.target.value })}
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
          <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Áreas habilitadas</p>
          <div className="flex flex-wrap gap-2">
            {AREAS.map((a) => {
              const activo = areas.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAreas(activo ? areas.filter((x) => x !== a) : [...areas, a])}
                  className={`rounded-full px-3 py-1 text-[11px] ${
                    activo ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground"
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
        <button type="button" onClick={onCerrar} className="rounded-lg border border-border px-4 py-2 text-sm">
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
                  guardar.mutate({ id: s.id, nombre: e.target.value, ciudad: s.ciudad, modo: s.modo })
                }
              />
              <input
                className={inputCls}
                defaultValue={s.ciudad}
                placeholder="Ciudad"
                onBlur={(e) =>
                  e.target.value !== s.ciudad &&
                  guardar.mutate({ id: s.id, nombre: s.nombre, ciudad: e.target.value, modo: s.modo })
                }
              />
            </li>
          ))}
          {sedes.length === 0 ? <li className="px-6 py-6 text-sm text-muted-foreground">Sin sedes.</li> : null}
        </ul>
      </Panel>
    </div>
  );
}

