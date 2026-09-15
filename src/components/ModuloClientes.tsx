import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  useActualizarCliente,
  useBorrarCliente,
  useCrearCliente,
  useClientes,
  type Cliente,
} from "@/lib/taller-db";
import { useSesion } from "@/lib/auth";

const vacio = {
  nombre: "",
  documento: "",
  telefono: "",
  whatsapp: "",
  email: "",
  direccion: "",
  ciudad: "",
  notas: "",
};

export function ModuloClientes() {
  const { data: sesion } = useSesion();
  const { data: clientes = [], isLoading } = useClientes();
  const crear = useCrearCliente();
  const actualizar = useActualizarCliente();
  const borrar = useBorrarCliente();
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [form, setForm] = useState(vacio);

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) =>
      [c.nombre, c.documento, c.telefono, c.whatsapp, c.email, c.ciudad]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [busqueda, clientes]);

  function abrirNuevo() {
    setEditando(null);
    setForm(vacio);
    setAbierto(true);
  }

  function abrirEditar(cliente: Cliente) {
    setEditando(cliente);
    setForm({
      nombre: cliente.nombre,
      documento: cliente.documento,
      telefono: cliente.telefono,
      whatsapp: cliente.whatsapp,
      email: cliente.email,
      direccion: cliente.direccion,
      ciudad: cliente.ciudad,
      notas: cliente.notas,
    });
    setAbierto(true);
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const nombre = form.nombre.trim();
    if (!nombre) {
      toast.error("Ingresa el nombre del cliente.");
      return;
    }

    try {
      if (editando) {
        await actualizar.mutateAsync({ id: editando.id, ...form, nombre });
        toast.success("Cliente actualizado.");
      } else {
        await crear.mutateAsync({
          ...form,
          nombre,
          sede_id: sesion?.perfil.sede_id ?? null,
        });
        toast.success("Cliente creado.");
      }
      setAbierto(false);
      setEditando(null);
      setForm(vacio);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el cliente.");
    }
  }

  async function desactivar(cliente: Cliente) {
    if (!window.confirm(`¿Desactivar a ${cliente.nombre}? Sus pedidos no se eliminarán.`)) return;
    try {
      await borrar.mutateAsync(cliente.id);
      toast.success("Cliente desactivado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo desactivar el cliente.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-medium">Clientes</h2>
          <p className="text-xs text-muted-foreground">
            Ficha maestra de clientes del taller. Los pedidos podrán enlazarse a cada ficha.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirNuevo}
          className="rounded-lg bg-ink px-4 py-2 text-xs font-medium text-ink-foreground"
        >
          Nuevo cliente
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, documento, teléfono, WhatsApp o correo…"
          className="min-h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
        />
        <span className="shrink-0 text-xs text-muted-foreground">{lista.length}</span>
      </div>

      {abierto ? (
        <form onSubmit={guardar} className="rounded-xl border border-border bg-surface-muted/30 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{editando ? "Editar cliente" : "Nuevo cliente"}</p>
              <p className="text-[11px] text-muted-foreground">Los campos quedan disponibles para autocompletar pedidos.</p>
            </div>
            <button type="button" onClick={() => setAbierto(false)} className="text-xs text-muted-foreground">
              Cancelar
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {([
              ["nombre", "Nombre completo", "text"],
              ["documento", "Documento / RUC / DNI", "text"],
              ["telefono", "Teléfono", "tel"],
              ["whatsapp", "WhatsApp", "tel"],
              ["email", "Correo electrónico", "email"],
              ["ciudad", "Ciudad", "text"],
              ["direccion", "Dirección", "text"],
              ["notas", "Notas", "text"],
            ] as const).map(([campo, etiqueta, tipo]) => (
              <label key={campo} className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {etiqueta}
                <input
                  type={tipo}
                  value={form[campo]}
                  onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  required={campo === "nombre"}
                />
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={crear.isPending || actualizar.isPending}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {crear.isPending || actualizar.isPending ? "Guardando…" : "Guardar cliente"}
          </button>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[850px] border-collapse text-left">
          <thead className="bg-surface-muted">
            <tr>
              {["Cliente", "Documento", "Teléfono", "WhatsApp", "Correo", "Ciudad", "Acciones"].map((h) => (
                <th key={h} className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-sm text-muted-foreground">Cargando clientes…</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-sm text-muted-foreground">No hay clientes registrados.</td></tr>
            ) : lista.map((cliente) => (
              <tr key={cliente.id} className="hover:bg-surface-muted/50">
                <td className="px-4 py-3 text-sm font-medium">{cliente.nombre}</td>
                <td className="px-4 py-3 text-xs">{cliente.documento || "—"}</td>
                <td className="px-4 py-3 text-xs">{cliente.telefono || "—"}</td>
                <td className="px-4 py-3 text-xs">{cliente.whatsapp || "—"}</td>
                <td className="px-4 py-3 text-xs">{cliente.email || "—"}</td>
                <td className="px-4 py-3 text-xs">{cliente.ciudad || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => abrirEditar(cliente)} className="text-xs text-primary hover:underline">Editar</button>
                    <button type="button" onClick={() => void desactivar(cliente)} className="text-xs text-danger hover:underline">Desactivar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
