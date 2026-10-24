import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, RefreshCw, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useSesion } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/marketplace-mis-compras")({
  head: () => ({ meta: [{ title: "Mis compras digitales — Taller del Joyero" }] }),
  component: MisComprasPage,
});

type Compra = {
  compra_id: string;
  archivo_id: string;
  titulo: string;
  nombre_archivo: string;
  formatos: string[];
  precio_pagado: number;
  moneda: string;
  estado_pago: string;
  creado_en: string;
};

function MisComprasPage() {
  const sesion = useSesion();
  const compras = useQuery({
    queryKey: ["marketplace-mis-compras", sesion.data?.user.id],
    enabled: Boolean(sesion.data?.user.id),
    queryFn: async (): Promise<Compra[]> => {
      const { data, error } = await supabase.rpc("obtener_mis_compras_archivos");
      if (error) throw error;
      return (data ?? []) as Compra[];
    },,
  });

  const descargar = useMutation({
    mutationFn: async (compraId: string) => {
      const { data, error } = await supabase.functions.invoke("marketplace-descargar-archivo", { body: { compra_id: compraId } });
      if (error) throw error;
      if (!data?.url || typeof data.url !== "string") throw new Error(data?.error || "No se recibió un enlace de descarga.");
      window.location.assign(data.url);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "No se pudo descargar el archivo."),
  });

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <Link to="/galeria-joyas" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Volver al marketplace</Link>
        <header><p className="text-xs font-semibold uppercase tracking-[.2em] text-gold">Tu biblioteca digital</p><h1 className="mt-2 text-3xl font-semibold">Mis compras</h1><p className="mt-2 text-sm text-muted-foreground">Los archivos se habilitan cuando el pago queda confirmado por el servidor.</p></header>
        {!sesion.data?.user && !sesion.isLoading ? <div className="rounded-xl border border-border p-5 text-sm">Inicia sesión para ver tus compras. <Link to="/auth" className="underline">Acceder</Link></div> : null}
        {compras.isLoading ? <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><RefreshCw className="size-4 animate-spin" /> Cargando compras...</div> : null}
        {compras.isError ? <div className="rounded-xl border border-destructive/30 p-5 text-sm">No se pudieron cargar las compras. Comprueba que el SQL del marketplace se haya ejecutado.</div> : null}
        {compras.data?.length === 0 ? <div className="rounded-2xl border border-border bg-card p-10 text-center"><ShoppingBag className="mx-auto size-9 text-gold" /><h2 className="mt-3 font-semibold">Todavía no tienes compras</h2><p className="mt-2 text-sm text-muted-foreground">Cuando compres un archivo, aparecerá aquí.</p><Link to="/galeria-joyas" className="mt-4 inline-flex rounded-full bg-primary px-4 py-2.5 text-sm text-primary-foreground">Explorar archivos</Link></div> : null}
        <div className="space-y-3">{(compras.data ?? []).map((compra) => <article key={compra.compra_id} className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center"><div><h2 className="font-semibold">{compra.titulo || "Archivo digital"}</h2><p className="mt-1 text-xs text-muted-foreground">{new Date(compra.creado_en).toLocaleDateString("es-PE")} · {compra.formatos?.join(", ")}</p><p className="mt-2 text-sm">{new Intl.NumberFormat("es-PE", { style: "currency", currency: compra.moneda }).format(compra.precio_pagado)} · <span className="capitalize">{compra.estado_pago}</span></p></div><button type="button" disabled={compra.estado_pago !== "pagado" || descargar.isPending} onClick={() => descargar.mutate(compra.compra_id)} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"><Download className="size-4" /> {compra.estado_pago === "pagado" ? "Descargar" : "Pago pendiente"}</button></article>)}</div>
      </main>
    </AppShell>
  );
}
