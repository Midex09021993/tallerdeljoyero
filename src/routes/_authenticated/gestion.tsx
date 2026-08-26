import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, Panel, StatCard } from "@/components/AppShell";
import {
  estadoClases,
  useActualizarPedido,
  useGuardarSede,
  usePedidos,
  useSedes,
  useUsuarios,
} from "@/lib/taller-db";
import { AREAS, correoDesdeUsuario, rolEtiqueta, useSesion, type Rol } from "@/lib/auth";
import { borrarUsuario, crearUsuario } from "@/lib/cuentas.functions";

export const Route = createFileRoute("/_authenticated/gestion")({
  head: () => ({
    meta: [
      { title: "Gestión — Aurum Lab" },
      {
        name: "description",
        content:
          "Zona administrativa del taller: finanzas por pedido, alta de usuarios de gerencia y control de sedes.",
      },
      { property: "og:title", content: "Gestión — Aurum Lab" },
      { property: "og:description", content: "Finanzas, usuarios y sedes del taller de joyería." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GestionPage,
});

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

type Modulo = "finanzas" | "usuarios" | "sedes";

function GestionPage() {
  const { data: sesion } = useSesion();
  const { data: pedidos = [], isLoading } = usePedidos();
  const actualizar = useActualizarPedido();
  const [modulo, setModulo] = useState<Modulo>("finanzas");

  const puedeGestionarUsuarios = Boolean(sesion?.esDueno || sesion?.roles.includes("gerente"));
  const total = pedidos.reduce((acc, p) => acc + p.importe, 0);
  const entregado = pedidos.filter((p) => p.estado === "Entregado").reduce((a, p) => a + p.importe, 0);

  const modulos: { id: Modulo; label: string; visible: boolean }[] = [
    { id: "finanzas", label: "Finanzas", visible: true },
    { id: "usuarios", label: "Usuarios", visible: puedeGestionarUsuarios },
    { id: "sedes", label: "Sedes", visible: Boolean(sesion?.esDueno) },
  ];

  return (
    <AppShell
      titulo="Gestión"
      subtitulo={isLoading ? "Cargando…" : "Finanzas, usuarios y sedes del taller"}
      acciones={
        <>
          <StatCard etiqueta="Cartera" valor={eur.format(total)} />
          <StatCard etiqueta="Facturado" valor={eur.format(entregado)} tono="positivo" />
        </>
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

      {modulo === "finanzas" ? (
        <Panel titulo="Detalle económico">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-surface-muted">
                  {["Ref", "Cliente", "Pieza", "Estado", "Importe"].map((h, i) => (
                    <th
                      key={h}
                      className={`px-6 py-3 text-[10px] uppercase tracking-wider text-muted-foreground ${
                        i === 4 ? "text-right" : ""
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pedidos.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-surface-muted/60">
                    <td className="px-6 py-4 text-xs font-medium">{p.referencia}</td>
                    <td className="px-6 py-4 text-sm">{p.cliente}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{p.pieza}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${estadoClases[p.estado] ?? "bg-surface-muted"}`}
                      >
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
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
                {!isLoading && pedidos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-sm text-muted-foreground">
                      Sin pedidos registrados.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {modulo === "usuarios" && puedeGestionarUsuarios ? (
        <ModuloUsuarios esDueno={Boolean(sesion?.esDueno)} sedePropia={sesion?.perfil.sede_id ?? null} />
      ) : null}

      {modulo === "sedes" && sesion?.esDueno ? <ModuloSedes /> : null}
    </AppShell>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

function ModuloUsuarios({ esDueno, sedePropia }: { esDueno: boolean; sedePropia: string | null }) {
  const qc = useQueryClient();
  const { data: usuarios = [] } = useUsuarios();
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
  });
  const [areas, setAreas] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

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
                {["Nombre", "DNI", "Rol", "Sede", ""].map((h) => (
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
                  <td className="px-6 py-3 text-right">
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
              ))}
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-sm text-muted-foreground">
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
          <select
            className={inputCls}
            value={nueva.modo}
            onChange={(e) => setNueva({ ...nueva, modo: e.target.value })}
          >
            <option value="completo">Modo completo por áreas</option>
            <option value="simple">Modo simple</option>
          </select>
          <button
            type="submit"
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Crear sede
          </button>
        </form>
      </Panel>

      <Panel titulo="Sedes">
        <ul className="divide-y divide-border">
          {sedes.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-medium">{s.nombre}</p>
                <p className="text-xs text-muted-foreground">{s.ciudad || "Sin ciudad"}</p>
              </div>
              <span className="rounded-full bg-surface-muted px-3 py-1 text-[10px] uppercase tracking-wide">
                {s.modo}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
