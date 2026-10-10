import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { useCrearContrato } from "@/lib/taller-db";
import { useSesion } from "@/lib/auth";
import { TODAS_LAS_SEDES, useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/contratos/nuevo")({
  validateSearch: (search: Record<string, unknown>) => ({
    cotizacionId: typeof search.cotizacionId === "string" ? search.cotizacionId : undefined,
  }),
  head: () => ({ meta: [{ title: "Nuevo contrato — Aurum Lab" }] }),
  component: NuevoContratoPage,
});

function NuevoContratoPage() {
  const navigate = useNavigate();
  const { cotizacionId } = Route.useSearch();
  const crear = useCrearContrato();
  const { data: sesion } = useSesion();
  const { esDueno, sedeFiltro, etiquetaSede } = useSedeFiltroDueno();
  const sedeContratoId = esDueno ? (sedeFiltro === TODAS_LAS_SEDES ? null : sedeFiltro) : (sesion?.participante?.sede_id ?? null);
  const [cargandoCotizacion, setCargandoCotizacion] = useState(Boolean(cotizacionId));
  const [cotizacionValida, setCotizacionValida] = useState(!cotizacionId);
  const [form, setForm] = useState({
    numero: "",
    cliente: "",
    telefono: "",
    origen: "Contrato Aurum",
    total: "",
    notas: "",
  });

  useEffect(() => {
    if (!cotizacionId) return;
    let activo = true;
    void (async () => {
      setCargandoCotizacion(true);
      const { data: q, error } = await supabase
        .from("cotizaciones")
        .select("id, numero, estado, total, sede_id, cliente_id")
        .eq("id", cotizacionId)
        .maybeSingle();
      if (!activo) return;
      if (error || !q || q.estado !== "aprobada") {
        toast.error("Solo puedes crear un contrato desde una cotización aprobada.");
        setCotizacionValida(false);
        setCargandoCotizacion(false);
        return;
      }
      if (sedeContratoId && q.sede_id && sedeContratoId !== q.sede_id) {
        toast.error("La cotización pertenece a otra sede. Cambia la sede activa antes de continuar.");
        setCotizacionValida(false);
        setCargandoCotizacion(false);
        return;
      }
      const [{ data: existente }, { data: cliente }] = await Promise.all([
        supabase.from("contratos").select("id,numero").eq("cotizacion_id", cotizacionId).maybeSingle(),
        q.cliente_id ? supabase.from("clientes").select("nombre,telefono,whatsapp").eq("id", q.cliente_id).maybeSingle() : Promise.resolve({data:null}),
      ]);
      if (!activo) return;
      if (existente?.id) {
        toast.info("Esta cotización ya tiene un contrato vinculado.");
        await navigate({ to: "/contratos/$id", params: { id: existente.id }, search: { nuevoPedido: false } });
        return;
      }
      setForm((actual) => ({
        ...actual,
        origen: `Cotización ${q.numero}`,
        cliente: cliente?.nombre ?? actual.cliente,
        telefono: cliente?.telefono ?? cliente?.whatsapp ?? actual.telefono,
        total: String(Number(q.total) || 0),
      }));
      setCotizacionValida(true);
      setCargandoCotizacion(false);
    })();
    return () => { activo = false; };
  }, [cotizacionId, sedeContratoId, navigate]);

  const set = (campo: keyof typeof form, valor: string) => setForm((actual) => ({ ...actual, [campo]: valor }));

  async function guardar() {
    if (cargandoCotizacion || (cotizacionId && !cotizacionValida)) {
      toast.error("No se puede crear el contrato hasta validar la cotización.");
      return;
    }
    if (!sedeContratoId) {
      toast.error("Selecciona una sede específica desde Inicio antes de crear un contrato.");
      return;
    }
    try {
      const contrato = await crear.mutateAsync({
        numero: form.numero,
        cliente: form.cliente,
        telefono: form.telefono,
        origen: form.origen,
        total: Number(form.total) || 0,
        sede_id: sedeContratoId,
        notas: form.notas,
        cotizacion_id: cotizacionId ?? null,
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
      subtitulo={cotizacionId ? "Contrato vinculado a una cotización aprobada." : "Crea un contrato Aurum de forma independiente."}
      atrasMovil={{ to: "/contratos" }}
    >
      <div className="mx-auto max-w-3xl">
        <Panel titulo={cotizacionId ? "Datos del contrato desde cotización" : "Datos del contrato"}>
          {cotizacionId ? <p className="px-4 pt-4 text-sm text-muted-foreground">Se conservará el vínculo con la cotización aprobada. La creación del contrato no crea un pedido.</p> : null}
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:p-6">
            <Campo label="Número de contrato" value={form.numero} onChange={(v) => set("numero", v)} required placeholder="CT-00001" />
            <Campo label="Cliente" value={form.cliente} onChange={(v) => set("cliente", v)} required placeholder="Nombre del cliente" />
            <Campo label="Teléfono" value={form.telefono} onChange={(v) => set("telefono", v)} placeholder="Opcional" />
            <Campo label="Origen" value={form.origen} onChange={(v) => set("origen", v)} placeholder="Contrato Aurum" />
            <Campo label="Total" value={form.total} onChange={(v) => set("total", v)} type="number" placeholder="0.00" />
            <div className="rounded-xl border border-border bg-surface-muted/50 px-3 py-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sede de este contrato</span>
              <p className="mt-1.5 text-sm font-semibold">{sedeContratoId ? etiquetaSede : "Selecciona una sede desde Inicio"}</p>
              <p className="mt-1 text-xs text-muted-foreground">El contrato se registrará en la sede activa; no se puede crear sin sede.</p>
            </div>
            <label className="block sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notas</span>
              <textarea value={form.notas} onChange={(e) => set("notas", e.target.value)} rows={4} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" placeholder="Condiciones o notas del contrato" />
            </label>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-4 lg:px-6">
            <Link to="/contratos" className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">Cancelar</Link>
            <button type="button" disabled={crear.isPending || cargandoCotizacion || (Boolean(cotizacionId) && !cotizacionValida)} onClick={() => void guardar()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {cargandoCotizacion ? "Verificando cotización…" : crear.isPending ? "Creando…" : "Crear contrato"}
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
