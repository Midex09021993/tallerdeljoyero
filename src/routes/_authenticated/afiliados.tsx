// @ts-nocheck -- tablas de afiliados incorporadas manualmente en Supabase; tipos generados pendientes.
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BadgeCheck, Banknote, Copy, GraduationCap, Link2, RefreshCw,
  ShieldCheck, Users, Wallet, Clock3,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/afiliados")({
  component: AfiliadosPage,
});

const PEN = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});
const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

function money(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? PEN.format(n) : PEN.format(0);
}
function paymentMoney(value: unknown, currency: unknown) {
  const amount = Number(value ?? 0);
  const code = String(currency ?? "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: code }).format(Number.isFinite(amount) ? amount : 0);
  } catch {
    return USD.format(Number.isFinite(amount) ? amount : 0);
  }
}
function dateLabel(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(date);
}
function statusLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    activo: "Activo",
    pendiente: "Pendiente",
    suspendido: "Suspendido",
    disponible: "Disponible",
    revertida: "Revertida",
    solicitado: "Solicitado",
    pagado: "Pagado",
    rechazado: "Rechazado",
    pendiente_aprobacion: "Pendiente de aprobación",
    fallido: "Fallido",
    failed: "Fallido",
    reembolsado: "Reembolsado",
    refunded: "Reembolsado",
    paid: "Pagado",
    disputado: "En disputa",
    disputed: "En disputa",
  };
  return labels[value ?? ""] ?? value ?? "Sin estado";
}
function StatusPill({ value }: { value: string }) {
  const good = ["activo", "disponible", "pagado", "paid"].includes(value);
  const bad = ["suspendido", "revertida", "rechazado", "reembolsado", "refunded", "fallido", "failed", "disputado", "disputed"].includes(value);
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${good ? "bg-emerald-50 text-emerald-700" : bad ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{statusLabel(value)}</span>;
}
function Metric({ label, value, detail, icon: Icon }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="rounded-xl bg-primary/10 p-2 text-primary"><Icon className="size-4" /></span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}
function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/70 px-6 py-12 text-center">
    <Users className="mx-auto size-8 text-muted-foreground" />
    <h3 className="mt-3 font-semibold">{title}</h3>
    <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">{detail}</p>
  </div>;
}

function AfiliadosPage() {
  const { data: sesion, isLoading: sesionLoading } = useSesion();
  const queryClient = useQueryClient();
  const esAdmin = Boolean(sesion?.roles?.some((role) => role === "dueno" || role === "gerente"));
  const participanteId = sesion?.participante?.id ?? sesion?.perfil?.participante_id ?? null;
  const configuracionQuery = useQuery({
    queryKey: ["aurum-afiliados-config"],
    enabled: Boolean(sesion?.user?.id),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("aurum_afiliados_config")
        .select("precio_curso_usd,comision_pen,retiro_minimo_pen,ventana_atribucion_dias")
        .eq("id", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const configuracion = configuracionQuery.data ?? {
    precio_curso_usd: 230,
    comision_pen: 50,
    retiro_minimo_pen: 50,
    ventana_atribucion_dias: 30,
  };
  const retiroMinimo = Number(configuracion.retiro_minimo_pen ?? 50);
  const comisionPorMatricula = Number(configuracion.comision_pen ?? 50);
  const precioCursoUsd = Number(configuracion.precio_curso_usd ?? 230);
  const [importe, setImporte] = useState("50");
  const [metodo, setMetodo] = useState("Transferencia bancaria");
  const [titular, setTitular] = useState("");
  const [retiroEnRevision, setRetiroEnRevision] = useState<string | null>(null);
  const [referenciaPago, setReferenciaPago] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const afiliadosQuery = useQuery({
    queryKey: ["aurum-afiliados", esAdmin, sesion?.user?.id, participanteId],
    enabled: Boolean(sesion?.user?.id),
    queryFn: async () => {
      let query = (supabase as any).from("aurum_afiliados").select("*");
      if (!esAdmin) {
        const filters = [`user_id.eq.${sesion!.user.id}`];
        if (participanteId) filters.push(`participante_id.eq.${participanteId}`);
        query = query.or(filters.join(","));
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const afiliados = afiliadosQuery.data ?? [];
  const ids = afiliados.map((item: any) => item.id).filter(Boolean);
  const actividadQuery = useQuery({
    queryKey: ["aurum-afiliados-actividad", ids.join("|"), esAdmin],
    enabled: ids.length > 0,
    queryFn: async () => {
      const [movs, referidos, comisiones, retiros, pagos] = await Promise.all([
        (supabase as any).from("aurum_afiliado_movimientos").select("*").in("afiliado_id", ids).limit(250),
        (supabase as any).from("aurum_afiliado_referidos").select("*").in("afiliado_id", ids).limit(250),
        (supabase as any).from("aurum_afiliado_comisiones").select("*").in("afiliado_id", ids).limit(250),
        (supabase as any).from("aurum_afiliado_retiros").select("*").in("afiliado_id", ids).limit(250),
        esAdmin
          ? (supabase as any).from("aurum_formacion_pagos").select("*").in("afiliado_id", ids).limit(250)
          : Promise.resolve({ data: [], error: null }),
      ]);
      const firstError = [movs, referidos, comisiones, retiros, pagos].find((result) => result.error)?.error;
      if (firstError) throw firstError;
      return {
        movimientos: movs.data ?? [],
        referidos: referidos.data ?? [],
        comisiones: comisiones.data ?? [],
        retiros: retiros.data ?? [],
        pagos: pagos.data ?? [],
      };
    },
  });

  const retiroMutation = useMutation({
    mutationFn: async () => {
      const afiliado = afiliados.find((item: any) => item.estado === "activo");
      if (!afiliado) throw new Error("Necesitas una afiliación activa para solicitar un retiro.");
      const amount = Number(importe);
      if (!Number.isFinite(amount) || amount < retiroMinimo) throw new Error(`El retiro mínimo es ${money(retiroMinimo)}.`);
      if (!titular.trim()) throw new Error("Indica el titular de la cuenta de pago.");
      const { data, error } = await (supabase as any).rpc("aurum_solicitar_retiro_afiliado", {
        _afiliado_id: afiliado.id,
        _importe_pen: amount,
        _metodo_pago: metodo,
        _titular_pago: titular.trim(),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      toast.success("Solicitud de retiro registrada. Queda pendiente de aprobación manual.");
      setTitular("");
      await queryClient.invalidateQueries({ queryKey: ["aurum-afiliados-actividad"] });
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo registrar la solicitud."),
  });

  const resolverRetiroMutation = useMutation({
    mutationFn: async ({ retiroId, decision }: { retiroId: string; decision: "pagado" | "rechazado" }) => {
      if (decision === "pagado" && !referenciaPago.trim()) {
        throw new Error("Registra la referencia del desembolso antes de marcarlo como pagado.");
      }
      const { error } = await (supabase as any).rpc("aurum_resolver_retiro_afiliado", {
        _retiro_id: retiroId,
        _decision: decision,
        _referencia_pago: decision === "pagado" ? referenciaPago.trim() : null,
        _observaciones: observaciones.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Solicitud de retiro actualizada.");
      setRetiroEnRevision(null);
      setReferenciaPago("");
      setObservaciones("");
      await queryClient.invalidateQueries({ queryKey: ["aurum-afiliados-actividad"] });
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo resolver el retiro."),
  });

  const actividad = actividadQuery.data ?? { movimientos: [], referidos: [], comisiones: [], retiros: [], pagos: [] };
  const movimientos = actividad.movimientos;
  const saldo = movimientos.reduce((sum: number, item: any) => sum + Number(item.importe_pen ?? 0), 0);
  const totalComision = actividad.comisiones.reduce((sum: number, item: any) => sum + (item.estado === "revertida" ? 0 : Number(item.importe_pen ?? 0)), 0);
  const totalReferidos = actividad.referidos.length;
  const conversiones = esAdmin
    ? actividad.pagos.filter((p: any) => ["pagado", "paid"].includes(p.estado)).length
    : actividad.comisiones.filter((item: any) => item.estado !== "revertida").length;
  const afiliadoActivo = afiliados.find((item: any) => item.estado === "activo") ?? null;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://tallerdeljoyero.com";
  const referralUrl = afiliadoActivo?.codigo ? `${baseUrl}/r/${encodeURIComponent(afiliadoActivo.codigo)}` : "";
  const saldoDisponible = Math.max(0, saldo);
  const resumenAdmin = useMemo(() => ({
    activos: afiliados.filter((a: any) => a.estado === "activo").length,
    pendientes: afiliados.filter((a: any) => a.estado === "pendiente").length,
    suspendidos: afiliados.filter((a: any) => a.estado === "suspendido").length,
    totalSaldo: afiliados.reduce((sum: number, a: any) => {
      const own = movimientos.filter((m: any) => m.afiliado_id === a.id);
      return sum + own.reduce((s: number, m: any) => s + Number(m.importe_pen ?? 0), 0);
    }, 0),
  }), [afiliados, movimientos]);

  const copiarEnlace = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      toast.success("Enlace de afiliado copiado.");
    } catch {
      toast.error("No se pudo copiar el enlace en este navegador.");
    }
  };

  if (sesionLoading || afiliadosQuery.isLoading) {
    return <AppShell titulo="AURUM LAB · Afiliados" subtitulo="Cargando programa de afiliación…"><div className="p-8 text-sm text-muted-foreground">Preparando tu panel…</div></AppShell>;
  }

  if (afiliadosQuery.isError) {
    return <AppShell titulo="AURUM LAB · Afiliados" subtitulo="Programa de recomendación"><div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">No se pudieron cargar los datos de afiliación: {(afiliadosQuery.error as any)?.message}<button type="button" onClick={() => void afiliadosQuery.refetch()} className="ml-2 underline font-semibold">Reintentar</button></div></AppShell>;
  }

  return (
    <AppShell titulo="AURUM LAB · Afiliados" subtitulo={esAdmin ? "Administración del programa de recomendación" : "Comparte tu experiencia y genera comisiones por matrículas confirmadas"}>
      <div className="space-y-6 pb-8">\n        {(configuracionQuery.isError || actividadQuery.isError) ? <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Configuración o actividad financiera incompleta. No uses los importes mostrados como confirmados. <button type="button" onClick={() => { void configuracionQuery.refetch(); void actividadQuery.refetch(); }} className="ml-2 underline font-semibold">Reintentar</button></div> : null>
        <header className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950 p-6 text-white shadow-sm md:p-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">AURUM LAB · PARTNERS</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{esAdmin ? "Centro de afiliados" : "Crece con AURUM LAB"}</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-300">{esAdmin ? "Supervisa afiliaciones, conversiones, comisiones y solicitudes de retiro con aprobación manual." : "Recomienda el programa de Diseño CAD 3D para Joyería. Cada matrícula pagada y validada puede generar una comisión configurada por AURUM LAB."}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs text-zinc-300">Comisión por matrícula</p>
              <p className="mt-1 text-3xl font-semibold">{money(comisionPorMatricula)}</p>
              <p className="mt-1 text-xs text-zinc-300">Curso: {USD.format(precioCursoUsd)} · retiro mínimo: {money(retiroMinimo)}</p>
            </div>
          </div>
        </header>

        {esAdmin ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Afiliados activos" value={resumenAdmin.activos} detail="Alumnos y talleres" icon={BadgeCheck} />
              <Metric label="Pendientes de revisión" value={resumenAdmin.pendientes} detail="Requieren aprobación" icon={Clock3} />
              <Metric label="Afiliados suspendidos" value={resumenAdmin.suspendidos} detail="Acceso al programa" icon={ShieldCheck} />
              <Metric label="Saldo neto acumulado" value={money(resumenAdmin.totalSaldo)} detail="Incluye movimientos negativos" icon={Wallet} />
            </section>
            <section className="grid gap-5 xl:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Directorio de afiliados</h2><p className="text-xs text-muted-foreground">Identidades de alumnos y talleres</p></div><Users className="size-5 text-primary" /></div>
                {afiliados.length ? <div className="overflow-x-auto"><table className="w-full min-w-[540px] text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="pb-3">Código</th><th className="pb-3">Tipo</th><th className="pb-3">Estado</th><th className="pb-3">Alta</th></tr></thead><tbody>{afiliados.map((a: any) => <tr key={a.id} className="border-t border-border"><td className="py-3 font-semibold">{a.codigo ?? "—"}</td><td className="py-3">{a.tipo === "taller" ? "Taller" : "Alumno"}</td><td className="py-3"><StatusPill value={a.estado} /></td><td className="py-3 text-muted-foreground">{dateLabel(a.created_at ?? a.creado_en)}</td></tr>)}</tbody></table></div> : <EmptyState title="Todavía no hay afiliados" detail="Cuando se registren las primeras afiliaciones, aparecerán en este directorio." />}
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Solicitudes de retiro</h2><p className="text-xs text-muted-foreground">Aprobación y desembolso manual</p></div><Banknote className="size-5 text-primary" /></div>
                {actividad.retiros.length ? <div className="space-y-3">{actividad.retiros.slice(0, 8).map((r: any) => <div key={r.id} className="rounded-xl border border-border p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{money(r.importe_pen)}</p><p className="text-xs text-muted-foreground">{r.metodo_pago ?? "Método no indicado"} · {dateLabel(r.solicitado_en ?? r.created_at ?? r.creado_en)}</p><p className="mt-1 text-xs text-muted-foreground">Titular: {r.titular_pago ?? "—"}</p></div><StatusPill value={r.estado} /></div>{r.estado === "solicitado" ? <div className="mt-3 border-t border-border pt-3"><button type="button" onClick={() => { setRetiroEnRevision(retiroEnRevision === r.id ? null : r.id); setReferenciaPago(""); setObservaciones(""); }} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">{retiroEnRevision === r.id ? "Cerrar revisión" : "Resolver solicitud"}</button>{retiroEnRevision === r.id ? <div className="mt-3 grid gap-2"><input value={referenciaPago} onChange={(event) => setReferenciaPago(event.target.value)} placeholder="Referencia del desembolso (obligatoria al pagar)" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /><textarea value={observaciones} onChange={(event) => setObservaciones(event.target.value)} placeholder="Observaciones administrativas (opcional)" rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /><div className="flex flex-wrap gap-2"><button type="button" disabled={resolverRetiroMutation.isPending} onClick={() => resolverRetiroMutation.mutate({ retiroId: r.id, decision: "pagado" })} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Registrar pago realizado</button><button type="button" disabled={resolverRetiroMutation.isPending} onClick={() => resolverRetiroMutation.mutate({ retiroId: r.id, decision: "rechazado" })} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50">Rechazar y liberar saldo</button></div></div> : null}</div> : null}</div>)}</div> : <EmptyState title="Sin solicitudes" detail="Las solicitudes de retiro aparecerán aquí para su revisión." />}
              </div>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Pagos atribuidos</h2><p className="text-xs text-muted-foreground">Registros de matrícula asociados a afiliados</p></div><Banknote className="size-5 text-primary" /></div>
              {actividad.pagos.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="pb-3">Referencia</th><th className="pb-3">Moneda</th><th className="pb-3">Importe</th><th className="pb-3">Estado</th><th className="pb-3">Fecha</th></tr></thead><tbody>{actividad.pagos.slice(0, 12).map((p: any) => <tr key={p.id} className="border-t border-border"><td className="py-3 font-mono text-xs">{p.referencia_externa ?? p.id?.slice(0, 8) ?? "—"}</td><td className="py-3">{p.moneda ?? "USD"}</td><td className="py-3">{paymentMoney(p.importe, p.moneda)}</td><td className="py-3"><StatusPill value={p.estado} /></td><td className="py-3 text-muted-foreground">{dateLabel(p.creado_en ?? p.created_at)}</td></tr>)}</tbody></table></div> : <EmptyState title="Todavía no hay pagos atribuidos" detail="Los pagos aparecerán después de integrar y validar el checkout del curso." />}
            </section>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Control administrativo</p><p className="mt-1">Este panel permite supervisar. La aprobación de afiliaciones y la resolución de retiros se mantienen fuera de línea hasta validar los permisos y las firmas exactas de las funciones administrativas.</p></div>
          </>
        ) : (
          <>
            {afiliadoActivo ? (
              <>
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric label="Saldo disponible" value={money(saldoDisponible)} detail={saldo < 0 ? `Recuperación pendiente: ${money(Math.abs(saldo))}` : "Después de reservas y reversiones"} icon={Wallet} />
                  <Metric label="Comisiones generadas" value={money(totalComision)} detail="No incluye comisiones revertidas" icon={Banknote} />
                  <Metric label="Visitas referidas" value={totalReferidos} detail="Primer contacto registrado" icon={Users} />
                  <Metric label="Matrículas pagadas" value={conversiones} detail="Confirmadas por el servidor" icon={GraduationCap} />
                </section>
                <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2"><Link2 className="size-5 text-primary" /><h2 className="font-semibold">Tu enlace de recomendación</h2></div>
                    <p className="mt-2 text-sm text-muted-foreground">Este enlace registra la visita y conserva la atribución durante {configuracion.ventana_atribucion_dias} días para vincularla a la cuenta cuando el referido inicie sesión.</p>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input readOnly value={referralUrl} className="min-w-0 flex-1 rounded-xl border border-border bg-muted/40 px-3 py-3 text-sm" /><button type="button" onClick={copiarEnlace} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"><Copy className="size-4" /> Copiar enlace</button></div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span className="rounded-full bg-muted px-3 py-1">Código: {afiliadoActivo.codigo}</span><span className="inline-flex items-center gap-1"><BadgeCheck className="size-3.5" /> Afiliación activa</span></div>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <h2 className="font-semibold">Solicitar retiro</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Mínimo {money(retiroMinimo)}. La administración revisa y realiza el pago manualmente.</p>
                    <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); retiroMutation.mutate(); }}>
                      <label className="block text-xs font-medium">Importe (PEN)<input type="number" min={retiroMinimo} step="0.01" value={importe} onChange={(event) => setImporte(event.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" /></label>
                      <label className="block text-xs font-medium">Método de pago<select value={metodo} onChange={(event) => setMetodo(event.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"><option>Transferencia bancaria</option><option>Yape</option><option>Plin</option></select></label>
                      <label className="block text-xs font-medium">Titular de la cuenta<input value={titular} onChange={(event) => setTitular(event.target.value)} required maxLength={120} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" placeholder="Nombre del titular" /></label>
                      <button disabled={retiroMutation.isPending || saldoDisponible < retiroMinimo} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{retiroMutation.isPending ? "Enviando…" : "Solicitar retiro"}</button>
                      {saldoDisponible < retiroMinimo ? <p className="text-xs text-amber-700">Necesitas al menos {money(retiroMinimo)} de saldo neto para solicitar un retiro.</p> : null}
                    </form>
                  </div>
                </section>
                <section className="grid gap-5 xl:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-card p-5"><h2 className="font-semibold">Historial de movimientos</h2><div className="mt-4 space-y-3">{movimientos.length ? movimientos.slice(0, 12).map((m: any) => <div key={m.id} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0"><div><p className="text-sm font-medium">{m.descripcion ?? statusLabel(m.tipo)}</p><p className="mt-1 text-xs text-muted-foreground">{dateLabel(m.creado_en ?? m.created_at)}</p></div><span className={`text-sm font-semibold ${Number(m.importe_pen) < 0 ? "text-rose-600" : "text-emerald-700"}`}>{Number(m.importe_pen) > 0 ? "+" : ""}{money(m.importe_pen)}</span></div>) : <p className="text-sm text-muted-foreground">Aún no hay movimientos.</p>}</div></div>
                  <div className="rounded-2xl border border-border bg-card p-5"><h2 className="font-semibold">Solicitudes de retiro</h2><div className="mt-4 space-y-3">{actividad.retiros.length ? actividad.retiros.slice(0, 10).map((r: any) => <div key={r.id} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0"><div><p className="text-sm font-medium">{money(r.importe_pen)}</p><p className="text-xs text-muted-foreground">{dateLabel(r.created_at)} · {r.metodo_pago ?? "—"}</p></div><StatusPill value={r.estado} /></div>) : <p className="text-sm text-muted-foreground">Todavía no has solicitado retiros.</p>}</div></div>
                </section>
              </>
            ) : (
              <EmptyState title="Tu cuenta todavía no tiene una afiliación activa" detail="El programa admite alumnos y talleres registrados. Si deseas participar, solicita al equipo de AURUM LAB que revise tu afiliación; el panel mostrará tu enlace y tus resultados cuando sea aprobada." />
            )}
          </>
        )}
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><ShieldCheck className="size-3.5" /> Los datos financieros se consultan desde las políticas de acceso de tu cuenta.</span><button type="button" onClick={() => { queryClient.invalidateQueries({ queryKey: ["aurum-afiliados"] }); queryClient.invalidateQueries({ queryKey: ["aurum-afiliados-actividad"] }); }} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 hover:bg-muted"><RefreshCw className="size-3.5" /> Actualizar</button></div>
      </div>
    </AppShell>
  );
}
