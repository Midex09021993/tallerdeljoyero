import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, Panel } from "@/components/AppShell";
import { useSesion } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/diagnostico")({
  component: DiagnosticoPage,
});

type Estado = "pendiente" | "ok" | "error";

type Resultado = {
  id: string;
  nombre: string;
  estado: Estado;
  detalle: string;
  ms?: number;
};

const pruebasBase: Array<[string, string]> = [
  ["perfil", "Perfil del usuario"],
  ["roles", "Roles"],
  ["areas", "Áreas"],
  ["sedes", "Sedes"],
  ["clientes", "Clientes"],
  ["pedidos", "Pedidos"],
  ["cotizaciones", "Cotizaciones"],
  ["ordenes_produccion", "Órdenes de producción"],
];

function ahora() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function diagnosticarError(error: unknown) {
  if (!error) return "Error desconocido.";
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Error desconocido.");
  }
  return String(error);
}

function ResultadoFila({ item }: { item: Resultado }) {
  const icono = item.estado === "ok" ? "✓" : item.estado === "error" ? "✕" : "…";
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0">
      <div className="flex min-w-0 items-start gap-3">
        <span className={
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold " +
          (item.estado === "ok"
            ? "bg-emerald-500/10 text-emerald-700"
            : item.estado === "error"
              ? "bg-danger/10 text-danger"
              : "bg-muted text-muted-foreground")
        }>{icono}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{item.nombre}</p>
          <p className="break-words text-xs text-muted-foreground">{item.detalle}</p>
        </div>
      </div>
      {item.ms != null ? <span className="shrink-0 text-[11px] text-muted-foreground">{item.ms} ms</span> : null}
    </div>
  );
}

function DiagnosticoPage() {
  const { data: sesion } = useSesion();
  const [ejecutando, setEjecutando] = useState(false);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [ultimaEjecucion, setUltimaEjecucion] = useState<string | null>(null);

  const ejecutar = useCallback(async () => {
    setEjecutando(true);
    const inicioTotal = ahora();
    const nuevos: Resultado[] = [];

    const ejecutarPrueba = async (
      id: string,
      nombre: string,
      prueba: () => Promise<string>,
    ) => {
      const inicio = ahora();
      try {
        const detalle = await prueba();
        nuevos.push({ id, nombre, estado: "ok", detalle, ms: Math.round(ahora() - inicio) });
      } catch (error) {
        nuevos.push({
          id,
          nombre,
          estado: "error",
          detalle: diagnosticarError(error),
          ms: Math.round(ahora() - inicio),
        });
      }
      setResultados([...nuevos]);
    };

    await ejecutarPrueba("session", "Sesión autenticada", async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session?.user) throw new Error("No hay sesión activa.");
      return `Usuario: ${data.session.user.email ?? data.session.user.id}`;
    });

    for (const [id, nombre] of pruebasBase) {
      await ejecutarPrueba(id, nombre, async () => {
        const table =
          id === "perfil" ? "profiles" :
          id === "roles" ? "user_roles" :
          id === "areas" ? "user_areas" :
          id === "sedes" ? "sedes" :
          id === "clientes" ? "clientes" :
          id === "pedidos" ? "pedidos" :
          id === "cotizaciones" ? "cotizaciones" :
          "ordenes_produccion";
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });
        if (error) throw error;
        return `${count ?? 0} registros visibles con la sesión actual.`;
      });
    }

    await ejecutarPrueba("storage_pedidos", "Storage · pedidos", async () => {
      const { data, error } = await supabase.storage.from("pedidos").list("", { limit: 1 });
      if (error) throw error;
      return "Bucket accesible.";
    });

    await ejecutarPrueba("storage_cotizaciones", "Storage · cotizaciones-publicas", async () => {
      const { data, error } = await supabase.storage.from("cotizaciones-publicas").list("", { limit: 1 });
      if (error) throw error;
      return "Bucket accesible.";
    });

    await ejecutarPrueba("edge_pdf", "Edge Function · generar-cotizacion-pdf", async () => {
      const url = import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
      if (!url) throw new Error("SUPABASE_URL no está disponible en el frontend.");
      const response = await fetch(`${url}/functions/v1/generar-cotizacion-pdf`, { method: "OPTIONS" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return `Endpoint accesible en ${new URL(url).host}.`;
    });

    setUltimaEjecucion(`${Math.round(ahora() - inicioTotal)} ms`);
    setEjecutando(false);
  }, []);

  const errores = resultados.filter((r) => r.estado === "error").length;
  const correctas = resultados.filter((r) => r.estado === "ok").length;
  const backendUrl = import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"] || "";
  const backendHost = backendUrl ? new URL(backendUrl).host : "no disponible";
  const esLegacy = backendHost.includes("ynetgjhghfhvyinwvqkl");

  return (
    <AppShell
      titulo="Diagnóstico técnico"
      subtitulo="Prueba controlada de conexión, sesión, datos, Storage y Edge Functions."
    >
      <div className="space-y-4">
        <Panel titulo="Estado del entorno">
          <div className="grid gap-4 p-4 sm:grid-cols-3 lg:p-6">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Backend detectado</p>
              <p className={"mt-1 break-all text-sm font-medium " + (esLegacy ? "text-danger" : "")}>{backendHost}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Usuario</p>
              <p className="mt-1 text-sm font-medium">{sesion?.user?.email ?? "Sesión cargando…"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Resultado</p>
              <p className="mt-1 text-sm font-medium">
                {resultados.length === 0 ? "Sin ejecutar" : `${correctas} correctas · ${errores} errores`}
              </p>
            </div>
          </div>
          {esLegacy ? (
            <div className="mx-4 mb-4 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger lg:mx-6">
              El frontend está apuntando al backend histórico ynetgjhghfhvyinwvqkl. Esto queda registrado como hallazgo; no se modifica automáticamente.
            </div>
          ) : null}
        </Panel>

        <Panel
          titulo="Pruebas"
          accion={
            <button
              type="button"
              onClick={() => void ejecutar()}
              disabled={ejecutando}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {ejecutando ? "Ejecutando…" : resultados.length ? "Repetir diagnóstico" : "Ejecutar diagnóstico"}
            </button>
          }
        >
          {resultados.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              Ejecuta la prueba para identificar exactamente qué capa está fallando. Las pruebas son de lectura y no crean ni modifican pedidos, cotizaciones ni archivos.
            </div>
          ) : (
            <div>{resultados.map((item) => <ResultadoFila key={item.id} item={item} />)}</div>
          )}
        </Panel>

        {ultimaEjecucion ? (
          <p className="text-right text-xs text-muted-foreground">Diagnóstico completado en {ultimaEjecucion}.</p>
        ) : null}
      </div>
    </AppShell>
  );
}
