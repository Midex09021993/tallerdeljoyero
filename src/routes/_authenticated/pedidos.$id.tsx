import { useState, type ReactNode } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, Panel } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { AREAS, useSesion } from "@/lib/auth";
import { useActualizarPedido, useEnviarAArea, usePedidos } from "@/lib/taller-db";

export const Route = createFileRoute("/_authenticated/pedidos/$id")({
  head: () => ({
    meta: [
      { title: "Ficha del pedido — Aurum Lab" },
      {
        name: "description",
        content:
          "Ficha rápida y ficha técnica del pedido: área actual, tiempo en área, avanzar o devolver, QR, WhatsApp y archivos de diseño.",
      },
      { property: "og:title", content: "Ficha del pedido — Aurum Lab" },
      { property: "og:description", content: "Pantalla de trabajo diaria del pedido en el taller." },
    ],
  }),
  component: FichaPedido,
});

const VISTAS = ["Perspectiva", "Superior", "Frontal", "Derecha"] as const;

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <h2 className="text-sm font-medium">{titulo}</h2>
        <span className="text-xs text-muted-foreground">{abierta ? "−" : "+"}</span>
      </button>
      {abierta ? <div className="border-t border-border p-6">{children}</div> : null}
    </section>
  );
}

function tiempoEnArea(desde: string) {
  const ms = Date.now() - new Date(desde).getTime();
  const horas = Math.floor(ms / 3_600_000);
  if (horas < 1) return `${Math.max(1, Math.floor(ms / 60_000))} min`;
  if (horas < 48) return `${horas} h`;
  return `${Math.floor(horas / 24)} días`;
}

function useArchivos(pedidoId: string) {
  return useQuery({
    queryKey: ["pedido-archivos", pedidoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedido_archivos")
        .select("id, tipo, nombre, url, es_enlace")
        .eq("pedido_id", pedidoId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function FichaPedido() {
  const { id } = useParams({ from: "/_authenticated/pedidos/$id" });
  const { data: sesion } = useSesion();
  const { data: pedidos = [], isLoading } = usePedidos();
  const { data: archivos = [] } = useArchivos(id);
  const actualizar = useActualizarPedido();
  const enviar = useEnviarAArea();
  const qc = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [enlace, setEnlace] = useState({ nombre: "", url: "" });

  const pedido = pedidos.find((p) => p.id === id);

  const subir = useMutation({
    mutationFn: async ({ file, tipo }: { file: File; tipo: string }) => {
      const ruta = `${id}/${tipo}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("pedidos").upload(ruta, file);
      if (error) throw error;
      const { data } = await supabase.storage.from("pedidos").createSignedUrl(ruta, 60 * 60 * 24 * 365);
      const { error: e2 } = await supabase.from("pedido_archivos").insert({
        pedido_id: id,
        tipo,
        nombre: file.name,
        url: data?.signedUrl ?? ruta,
        es_enlace: false,
      });
      if (e2) throw e2;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedido-archivos", id] }),
  });

  const guardarEnlace = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pedido_archivos").insert({
        pedido_id: id,
        tipo: "enlace",
        nombre: enlace.nombre || "Archivo externo",
        url: enlace.url,
        es_enlace: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setEnlace({ nombre: "", url: "" });
      qc.invalidateQueries({ queryKey: ["pedido-archivos", id] });
    },
  });

  const borrarArchivo = useMutation({
    mutationFn: async (archivoId: string) => {
      const { error } = await supabase.from("pedido_archivos").delete().eq("id", archivoId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedido-archivos", id] }),
  });

  if (isLoading) {
    return (
      <AppShell titulo="Ficha del pedido" subtitulo="Cargando…">
        <p className="text-sm text-muted-foreground">Cargando pedido…</p>
      </AppShell>
    );
  }

  if (!pedido) {
    return (
      <AppShell titulo="Pedido no encontrado">
        <p className="text-sm text-muted-foreground">
          Este pedido no existe o no pertenece a tu sede.{" "}
          <Link to="/pedidos" className="text-info hover:underline">
            Volver a pedidos
          </Link>
        </p>
      </AppShell>
    );
  }

  const puedeEditar = Boolean(sesion?.esAdmin);
  const urlSeguimiento =
    typeof window !== "undefined"
      ? `${window.location.origin}/cliente?ref=${encodeURIComponent(pedido.referencia)}`
      : "";
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(urlSeguimiento)}`;
  const wa = `https://wa.me/${pedido.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Hola ${pedido.cliente}, su pedido ${pedido.referencia} está en ${pedido.area_actual}.`,
  )}`;

  return (
    <AppShell
      titulo={`${pedido.referencia} · ${pedido.trabajo || pedido.pieza}`}
      subtitulo={`${pedido.cliente}${pedido.sede_nombre ? ` · ${pedido.sede_nombre}` : ""}`}
    >
      <div className="mb-6">
        <Link
          to="/pedidos"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          ← Volver a pedidos
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel titulo="Ficha rápida">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-6 lg:grid-cols-3">
              {[
                ["Código del pedido", pedido.referencia],
                ["Tipo de trabajo", pedido.trabajo || pedido.pieza || "—"],
                ["N° de contrato", pedido.contrato || "—"],
                ["Área de proceso", pedido.area_actual],
                ["Fecha de entrega", pedido.fecha_entrega ?? pedido.entrega ?? "—"],
                ["Tiempo en área", tiempoEnArea(pedido.area_desde)],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p>
                  <p className="mt-0.5 text-sm">{v}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-border px-6 py-5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Mover a área
                <select
                  value=""
                  onChange={(e) => {
                    const destino = e.target.value;
                    if (destino) enviar.mutate({ pedido, destino, usuarioId: sesion?.user.id ?? null });
                  }}
                  disabled={enviar.isPending}
                  className="mt-1 block w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground disabled:opacity-40"
                >
                  <option value="" disabled>
                    Selecciona el área destino…
                  </option>
                  {pedido.ruta
                    .filter((a) => a !== pedido.area_actual)
                    .map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  {pedido.ruta.filter((a) => a !== pedido.area_actual).length === 0 ? (
                    <option value="" disabled>
                      Sin áreas siguientes en la ruta
                    </option>
                  ) : null}

                </select>
              </label>
            </div>


            <div className="border-t border-border px-6 py-5">
              <p className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                Ruta del pedido
              </p>
              <ol className="flex flex-wrap gap-2">
                {secuencia.map((a, i) => (
                  <li
                    key={a}
                    className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase ${
                      i === indice ? areaClase(a) : i < indice ? "bg-success-soft text-success" : "bg-surface-muted text-muted-foreground"
                    }`}
                  >
                    {a}
                  </li>
                ))}
              </ol>
            </div>
          </Panel>

          <Seccion titulo="Ficha técnica general">
            {editando && puedeEditar ? (
              <form
                className="grid grid-cols-2 gap-3 lg:grid-cols-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  actualizar.mutate(
                    {
                      id: pedido.id,
                      cliente: String(fd.get("cliente")),
                      telefono: String(fd.get("telefono")),
                      origen: String(fd.get("origen")),
                      contrato: String(fd.get("contrato")),
                      trabajo: String(fd.get("trabajo")),
                      pieza: String(fd.get("trabajo")),
                       material: String(fd.get("material")),
                       peso_estimado: String(fd.get("peso_estimado")),
                       talla: String(fd.get("talla")),
                      cantidad_piezas: Number(fd.get("cantidad_piezas")) || 1,
                      piedras: String(fd.get("piedras")),
                      importe: Number(fd.get("importe")) || 0,
                      fecha_entrega: String(fd.get("fecha_entrega")) || null,
                      notas: String(fd.get("notas")),
                    },
                    { onSuccess: () => setEditando(false) },
                  );
                }}
              >
                {(
                  [
                    ["cliente", "Cliente", pedido.cliente, "text"],
                    ["telefono", "WhatsApp", pedido.telefono, "tel"],
                    ["origen", "Origen", pedido.origen, "text"],
                    ["contrato", "Contrato", pedido.contrato, "text"],
                    ["trabajo", "Trabajo", pedido.trabajo || pedido.pieza, "text"],
                     ["material", "Material", pedido.material, "text"],
                     ["peso_estimado", "Peso estimado (g)", pedido.peso_estimado, "text"],
                     ["talla", "Talla / Medida", pedido.talla, "text"],
                    ["cantidad_piezas", "Cantidad de piezas", String(pedido.cantidad_piezas), "number"],
                    ["piedras", "Piedras / Componentes", pedido.piedras, "text"],
                    ["importe", "Costo", String(pedido.importe), "number"],
                    ["fecha_entrega", "Entrega", pedido.fecha_entrega ?? "", "date"],
                    ["notas", "Notas generales", pedido.notas, "text"],
                  ] as const
                ).map(([name, label, val, tipo]) => (
                  <label key={name} className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {label}
                    <input
                      name={name}
                      type={tipo}
                      defaultValue={val}
                      className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                    />
                  </label>
                ))}
                <div className="col-span-2 flex items-end gap-2 lg:col-span-3">
                  <button type="submit" className="rounded-lg bg-ink px-4 py-2 text-xs text-ink-foreground">
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditando(false)}
                    className="rounded-lg border border-border px-4 py-2 text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {(
                    [
                      ["Talla / Medida", pedido.talla || "—"],
                      ["Cantidad de piezas", String(pedido.cantidad_piezas || 1)],
                       ["Piedras / Componentes", pedido.piedras || "—"],
                       ["Material", pedido.material || "—"],
                       ["Peso estimado", pedido.peso_estimado || "—"],
                     ] as const
                  ).map(([label, valor]) => (
                    <div key={label}>
                      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
                      <dd className="mt-1 text-sm font-medium text-foreground">{valor}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-[10px] uppercase tracking-wider text-muted-foreground">Notas generales</p>
                <p className="mt-1 text-sm text-muted-foreground">{pedido.notas || "Sin notas técnicas."}</p>
                {puedeEditar ? (
                  <button
                    type="button"
                    onClick={() => setEditando(true)}
                    className="mt-4 rounded-lg border border-border px-4 py-2 text-xs font-medium"
                  >
                    Editar pedido
                  </button>
                ) : null}
              </div>
            )}
          </Seccion>

          <Seccion titulo="Referencias del diseño">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {VISTAS.map((vista) => {
                const img = archivos.find((a) => a.tipo === vista && !a.es_enlace);
                return (
                  <div key={vista}>
                    <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">{vista}</p>
                    {img ? (
                      <img
                        src={img.url}
                        alt={`Vista ${vista} del pedido ${pedido.referencia}`}
                        loading="lazy"
                        className="aspect-square w-full rounded-xl border border-border object-cover"
                      />
                    ) : (
                      <label className="grid aspect-square w-full cursor-pointer place-items-center rounded-xl border border-dashed border-border bg-surface-muted text-[10px] text-muted-foreground">
                        Subir
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) subir.mutate({ file, tipo: vista });
                          }}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </Seccion>

          <Seccion titulo="Archivos del pedido">
            <ul className="mb-4 space-y-2">
              {archivos
                .filter((a) => a.es_enlace)
                .map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                    <a href={a.url} target="_blank" rel="noreferrer" className="truncate text-info hover:underline">
                      {a.nombre}
                    </a>
                    <button
                      type="button"
                      onClick={() => borrarArchivo.mutate(a.id)}
                      className="text-xs text-muted-foreground hover:text-danger"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              {archivos.filter((a) => a.es_enlace).length === 0 ? (
                <li className="text-sm text-muted-foreground">Sin enlaces guardados.</li>
              ) : null}
            </ul>
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (enlace.url) guardarEnlace.mutate();
              }}
            >
              <input
                placeholder="Nombre (Drive, Dropbox, OneDrive…)"
                value={enlace.nombre}
                onChange={(e) => setEnlace((v) => ({ ...v, nombre: e.target.value }))}
                className="min-w-[160px] flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm"
              />
              <input
                type="url"
                placeholder="https://…"
                value={enlace.url}
                onChange={(e) => setEnlace((v) => ({ ...v, url: e.target.value }))}
                className="min-w-[200px] flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm"
              />
              <button type="submit" className="rounded-lg bg-ink px-4 py-2 text-xs text-ink-foreground">
                Añadir enlace
              </button>
            </form>
          </Seccion>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
          <p className="mb-4 text-[10px] uppercase tracking-wider text-muted-foreground">
            QR de seguimiento
          </p>
          {urlSeguimiento ? (
            <img
              src={qr}
              alt={`Código QR de seguimiento del pedido ${pedido.referencia}`}
              width={220}
              height={220}
              className="mx-auto rounded-xl border border-border bg-white p-2"
            />
          ) : null}
          <p className="mt-4 break-all text-[10px] text-muted-foreground">{urlSeguimiento}</p>
        </div>
      </div>
    </AppShell>
  );
}
