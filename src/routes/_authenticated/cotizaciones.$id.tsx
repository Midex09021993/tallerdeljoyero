import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { AppShell, Panel } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/cotizaciones/$id")({
  head: () => ({
    meta: [
      { title: "Detalle de cotización — Aurum Lab" },
      { name: "description", content: "Detalle y seguimiento de una cotización comercial." },
    ],
  }),
  component: CotizacionDetallePage,
});

type Cotizacion = {
  id: string; numero: string; version: number; estado: string; fecha_emision: string;
  fecha_vencimiento: string | null; moneda: string; subtotal_costo: number; subtotal: number;
  descuento: number; impuestos: number; total: number; anticipo: number;
  notas_cliente: string; notas_internas: string; cliente_id: string; proyecto_joya_id: string | null;
};
type Detalle = {
  id: string; orden: number; tipo: string; descripcion: string; cantidad: number; unidad: string;
  costo_unitario: number; precio_unitario: number; total_costo: number; total_precio: number;
};
type Cliente = { id: string; nombre: string; telefono: string | null; email: string | null };
type Proyecto = { id: string; codigo: string; nombre: string; descripcion: string; metal: string | null; ley: string | null; peso_estimado: number | null; talla: string | null; piedras: string | null };

const estados = [
  ["borrador", "Borrador"], ["enviada", "Enviada"], ["aprobada", "Aprobada"],
  ["rechazada", "Rechazada"], ["vencida", "Vencida"], ["cancelada", "Cancelada"],
] as const;

function money(n: number, moneda: string) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: moneda, maximumFractionDigits: 2 }).format(Number(n) || 0);
}
function etiquetaEstado(estado: string) {
  return estados.find(([value]) => value === estado)?.[1] ?? estado;
}

function CotizacionDetallePage() {
  const { id } = useParams({ from: "/_authenticated/cotizaciones/$id" });
  const navigate = useNavigate();
  const { data: sesion } = useSesion();
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [detalles, setDetalles] = useState<Detalle[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [error, setError] = useState("");

  const cargar = async () => {
    setCargando(true); setError("");
    const { data: q, error: qError } = await supabase.from("cotizaciones")
      .select("id,numero,version,estado,fecha_emision,fecha_vencimiento,moneda,subtotal_costo,subtotal,descuento,impuestos,total,anticipo,notas_cliente,notas_internas,cliente_id,proyecto_joya_id")
      .eq("id", id).maybeSingle();
    if (qError || !q) {
      setError(qError?.message ?? "No se encontró la cotización.");
      setCargando(false); return;
    }
    const [{ data: d }, { data: c }, { data: p }] = await Promise.all([
      supabase.from("cotizacion_detalles").select("id,orden,tipo,descripcion,cantidad,unidad,costo_unitario,precio_unitario,total_costo,total_precio").eq("cotizacion_id", id).order("orden"),
      supabase.from("clientes").select("id,nombre,telefono,email").eq("id", q.cliente_id).maybeSingle(),
      q.proyecto_joya_id
        ? supabase.from("proyectos_joya").select("id,codigo,nombre,descripcion,metal,ley,peso_estimado,talla,piedras").eq("id", q.proyecto_joya_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setCotizacion(q); setDetalles(d ?? []); setCliente(c ?? null); setProyecto(p ?? null); setCargando(false);
  };

  useEffect(() => { void cargar(); }, [id]);

  const margen = useMemo(() => cotizacion ? Number(cotizacion.subtotal) - Number(cotizacion.subtotal_costo) : 0, [cotizacion]);

  async function cambiarEstado(estado: string) {
    if (!cotizacion || !sesion?.esAdmin || estado === cotizacion.estado) return;
    setGuardandoEstado(true); setError("");
    const { error: updateError } = await supabase.from("cotizaciones").update({ estado }).eq("id", cotizacion.id);
    if (updateError) setError(updateError.message);
    else setCotizacion({ ...cotizacion, estado });
    setGuardandoEstado(false);
  }

  if (cargando) return <AppShell titulo="Cotización" subtitulo="Cargando…" atrasMovil={{ to: "/cotizaciones" }}><p className="text-sm text-muted-foreground">Cargando cotización…</p></AppShell>;
  if (!cotizacion) return <AppShell titulo="Cotización no encontrada" atrasMovil={{ to: "/cotizaciones" }}><p className="text-sm text-muted-foreground">{error || "La cotización no existe o no tienes acceso."}</p></AppShell>;

  return (
    <AppShell titulo={cotizacion.numero} subtitulo={"Versión " + cotizacion.version + " · " + etiquetaEstado(cotizacion.estado)} atrasMovil={{ to: "/cotizaciones" }}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/cotizaciones" className="text-sm text-muted-foreground hover:text-foreground">← Volver a cotizaciones</Link>
          {sesion?.esAdmin ? <div className="flex flex-wrap gap-2">
            {estados.map(([value, label]) => <button key={value} type="button" disabled={guardandoEstado} onClick={() => void cambiarEstado(value)}
              className={"rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " + (cotizacion.estado === value ? "border-ink bg-ink text-ink-foreground" : "border-border text-muted-foreground hover:text-foreground")}>{label}</button>)}
          </div> : null}
        </div>
        {error ? <div className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div> : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <Panel titulo="Datos comerciales">
              <div className="grid gap-4 p-4 sm:grid-cols-2 lg:p-6">
                <Dato label="Cliente" valor={cliente?.nombre ?? "—"} />
                <Dato label="Teléfono" valor={cliente?.telefono || "—"} />
                <Dato label="Correo" valor={cliente?.email || "—"} />
                <Dato label="Emisión" valor={cotizacion.fecha_emision} />
                <Dato label="Válida hasta" valor={cotizacion.fecha_vencimiento || "Sin fecha"} />
                <Dato label="Proyecto" valor={proyecto ? proyecto.codigo + " · " + proyecto.nombre : "Sin proyecto"} />
              </div>
            </Panel>

            {proyecto ? <Panel titulo="Especificación de la joya">
              <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 lg:p-6">
                <Dato label="Metal" valor={proyecto.metal || "—"} />
                <Dato label="Ley" valor={proyecto.ley || "—"} />
                <Dato label="Peso estimado" valor={proyecto.peso_estimado != null ? proyecto.peso_estimado + " g" : "—"} />
                <Dato label="Talla" valor={proyecto.talla || "—"} />
                <Dato label="Piedras" valor={proyecto.piedras || "—"} />
                <Dato label="Descripción" valor={proyecto.descripcion || "—"} />
              </div>
            </Panel> : null}

            <Panel titulo="Partidas de la cotización">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead><tr className="border-y border-border bg-surface-muted text-[10px] uppercase tracking-wider text-muted-foreground">
                    {["Tipo","Descripción","Cant.","Costo unit.","Precio unit.","Total"].map(h => <th key={h} className="px-4 py-3">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {detalles.map(d => <tr key={d.id}>
                      <td className="px-4 py-3 text-xs uppercase text-muted-foreground">{d.tipo}</td>
                      <td className="px-4 py-3 font-medium">{d.descripcion}</td>
                      <td className="px-4 py-3">{d.cantidad} {d.unidad}</td>
                      <td className="px-4 py-3 text-muted-foreground">{money(d.costo_unitario, cotizacion.moneda)}</td>
                      <td className="px-4 py-3">{money(d.precio_unitario, cotizacion.moneda)}</td>
                      <td className="px-4 py-3 font-semibold">{money(d.total_precio, cotizacion.moneda)}</td>
                    </tr>)}
                    {detalles.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Sin partidas.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel titulo="Notas">
              <div className="grid gap-4 p-4 sm:grid-cols-2 lg:p-6">
                <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Para el cliente</p><p className="mt-2 whitespace-pre-wrap text-sm">{cotizacion.notas_cliente || "Sin notas."}</p></div>
                <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Internas</p><p className="mt-2 whitespace-pre-wrap text-sm">{cotizacion.notas_internas || "Sin notas."}</p></div>
              </div>
            </Panel>
          </div>

          <aside className="h-fit space-y-4">
            <Panel titulo="Resumen financiero">
              <div className="space-y-3 p-4">
                <Fila label="Costo interno" valor={money(cotizacion.subtotal_costo, cotizacion.moneda)} />
                <Fila label="Subtotal cliente" valor={money(cotizacion.subtotal, cotizacion.moneda)} />
                <Fila label="Descuento" valor={money(cotizacion.descuento, cotizacion.moneda)} />
                <Fila label="Impuestos" valor={money(cotizacion.impuestos, cotizacion.moneda)} />
                <div className="border-t border-border pt-3"><Fila label="Total" valor={money(cotizacion.total, cotizacion.moneda)} fuerte /></div>
                <Fila label="Anticipo" valor={money(cotizacion.anticipo, cotizacion.moneda)} />
                <Fila label="Margen bruto" valor={money(margen, cotizacion.moneda)} />
              </div>
            </Panel>
            <Panel titulo="Acciones">
              <div className="space-y-2 p-4">
                {cotizacion.estado === "aprobada"
                  ? <button type="button" disabled className="w-full rounded-lg bg-primary/70 px-4 py-2.5 text-sm font-semibold text-primary-foreground">Próximamente: convertir en Pedido</button>
                  : <p className="text-sm text-muted-foreground">Cuando sea aprobada podremos convertirla en un pedido sin volver a ingresar los datos.</p>}
                <button type="button" onClick={() => void navigate({ to: "/cotizaciones" })} className="w-full rounded-lg border border-border px-4 py-2.5 text-sm">Volver al listado</button>
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{valor}</p></div>;
}
function Fila({ label, valor, fuerte = false }: { label: string; valor: string; fuerte?: boolean }) {
  return <div className={"flex items-center justify-between gap-3 text-sm " + (fuerte ? "font-semibold text-base" : "")}><span className="text-muted-foreground">{label}</span><span>{valor}</span></div>;
}
