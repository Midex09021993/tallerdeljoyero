import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { useCrearContrato, useSedes } from "@/lib/taller-db";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/contratos/nuevo")({
  head: () => ({ meta: [{ title: "Nuevo contrato — Aurum Lab" }] }),
  component: NuevoContratoPage,
});

function NuevoContratoPage() {
  const navigate = useNavigate();
  const crear = useCrearContrato();
  const { data: sedes = [] } = useSedes();
  const [form, setForm] = useState({
    numero: "",
    cliente: "",
    telefono: "",
    origen: "Contrato Aurum",
    total: "",
    sede_id: "",
    notas: "",
  });

  const set = (campo: keyof typeof form, valor: string) => setForm((actual) => ({ ...actual, [campo]: valor }));

  async function guardar() {
    try {
      const contrato = await crear.mutateAsync({
        numero: form.numero,
        cliente: form.cliente,
        telefono: form.telefono,
        origen: form.origen,
        total: Number(form.total) || 0,
        sede_id: form.sede_id || null,
        notas: form.notas,
      });
      toast.success(`Contrato ${contrato.numero} creado.`);
      await navigate({ to: "/contratos/$id", params: { id: contrato.id }, search: { nuevoPedido: false } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el contrato.");
    }
  }

  return (
    <AppShell
      titulo="Nuevo contrato"
      subtitulo="Crea un contrato Aurum de forma independiente."
      atrasMovil={{ to: "/contratos" }}
    >
      <div className="mx-auto max-w-3xl">
        <Panel titulo="Datos del contrato">
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:p-6">
            <Campo label="Número de contrato" value={form.numero} onChange={(v) => set("numero", v)} required placeholder="CT-00001" />
            <Campo label="Cliente" value={form.cliente} onChange={(v) => set("cliente", v)} required placeholder="Nombre del cliente" />
            <Campo label="Teléfono" value={form.telefono} onChange={(v) => set("telefono", v)} placeholder="Opcional" />
            <Campo label="Origen" value={form.origen} onChange={(v) => set("origen", v)} placeholder="Contrato Aurum" />
            <Campo label="Total" value={form.total} onChange={(v) => set("total", v)} type="number" placeholder="0.00" />
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sede</span>
              <select value={form.sede_id} onChange={(e) => set("sede_id", e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm">
                <option value="">Sin sede</option>
                {sedes.map((sede) => <option key={sede.id} value={sede.id}>{sede.nombre}</option>)}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notas</span>
              <textarea value={form.notas} onChange={(e) => set("notas", e.target.value)} rows={4} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" placeholder="Condiciones o notas del contrato" />
            </label>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-4 lg:px-6">
            <Link to="/contratos" className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">Cancelar</Link>
            <button type="button" disabled={crear.isPending} onClick={() => void guardar()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {crear.isPending ? "Creando…" : "Crear contrato"}
            </button>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

function Campo({ label, value, onChange, placeholder, type = "text", required = false }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}{required ? " *" : ""}</span>
      <input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/10" />
    </label>
  );
}
