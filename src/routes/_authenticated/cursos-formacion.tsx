import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, ExternalLink, Eye, EyeOff, GraduationCap, Save, Share2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, Panel } from "@/components/AppShell";
import { useSesion } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/cursos-formacion")({
  head: () => ({
    meta: [
      { title: "Cursos y formación — Taller del Joyero" },
      { name: "description", content: "Configura y comparte la página publicitaria de formación de tu taller." },
    ],
  }),
  component: CursosFormacionPage,
});

type FormacionConfig = {
  slug: string | null;
  nombre_publico: string;
  descripcion: string | null;
  logo_url: string | null;
  whatsapp: string | null;
  formacion_visible: boolean;
  formacion_titulo: string | null;
  formacion_descripcion: string | null;
  formacion_imagen_url: string | null;
};

function CursosFormacionPage() {
  const { data: sesion } = useSesion();
  const queryClient = useQueryClient();
  const participanteId = sesion?.participante?.id ?? null;
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [visible, setVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const configQuery = useQuery({
    queryKey: ["formacion-publicidad-config", participanteId],
    enabled: Boolean(participanteId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("catalogo_configuracion")
        .select("slug,nombre_publico,descripcion,logo_url,whatsapp,formacion_visible,formacion_titulo,formacion_descripcion,formacion_imagen_url")
        .eq("participante_id", participanteId!)
        .maybeSingle();
      if (error) throw error;
      return data as FormacionConfig | null;
    },
  });
  const config = configQuery.data;

  useEffect(() => {
    if (!config) return;
    setTitulo(config.formacion_titulo ?? "");
    setDescripcion(config.formacion_descripcion ?? "");
    setImagenUrl(config.formacion_imagen_url ?? "");
    setVisible(config.formacion_visible ?? false);
  }, [config]);

  const urlPublica = config?.slug
    ? `${typeof window !== "undefined" ? window.location.origin : "https://www.tallerdeljoyero.com"}/formacion/${encodeURIComponent(config.slug)}`
    : null;

  const guardar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!participanteId || !config) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const { error } = await (supabase as any)
        .from("catalogo_configuracion")
        .update({
          formacion_titulo: titulo.trim() || null,
          formacion_descripcion: descripcion.trim() || null,
          formacion_imagen_url: imagenUrl.trim() || null,
          formacion_visible: visible,
          updated_at: new Date().toISOString(),
        })
        .eq("participante_id", participanteId);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["formacion-publicidad-config", participanteId] });
      setMensaje(visible ? "Publicidad guardada. La página estará disponible cuando el SQL esté aplicado." : "Configuración guardada. La publicidad está desactivada.");
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo guardar. Comprueba que hayas aplicado el SQL de publicidad formativa.");
    } finally {
      setGuardando(false);
    }
  };

  const copiarEnlace = async () => {
    if (!urlPublica) return;
    try {
      await navigator.clipboard.writeText(urlPublica);
      setMensaje("Enlace copiado. Ya puedes compartirlo con tus alumnos.");
    } catch {
      setMensaje(urlPublica);
    }
  };

  if (!participanteId) {
    return <AppShell titulo="Cursos y formación" subtitulo="Página publicitaria de tu taller">
      <Panel titulo="Cuenta de taller requerida"><p className="p-5 text-sm text-muted-foreground">Esta sección necesita una cuenta vinculada a un participante del ecosistema.</p></Panel>
    </AppShell>;
  }

  return (
    <AppShell titulo="Cursos y formación" subtitulo="Configura una página pública y comparte el enlace con tus alumnos">
      <div className="mx-auto max-w-5xl space-y-5">
        {configQuery.isLoading ? (
          <Panel titulo="Cargando configuración"><p className="p-5 text-sm text-muted-foreground">Recuperando los datos del taller…</p></Panel>
        ) : configQuery.error ? (
          <Panel titulo="No se pudo cargar la configuración"><p className="p-5 text-sm text-muted-foreground">{configQuery.error.message}. Si las columnas de publicidad aún no existen, aplica el SQL de publicidad formativa.</p></Panel>
        ) : !config ? (
          <Panel titulo="Falta configurar el catálogo base"><p className="p-5 text-sm text-muted-foreground">Primero completa en Catálogo la configuración pública del taller. Reutilizaremos su nombre, logo, descripción y enlace base, sin duplicar esos datos.</p></Panel>
        ) : (
          <>
            <section className="rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/10 via-card to-card p-5 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  {config.logo_url ? <img src={config.logo_url} alt="" className="size-16 rounded-xl border border-border object-cover" /> : <div className="flex size-16 items-center justify-center rounded-xl border border-gold/25 bg-gold/10 text-gold-deep"><GraduationCap className="size-7" /></div>}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gold-deep">Publicidad formativa</p>
                    <h2 className="mt-1 text-xl font-semibold">{config.nombre_publico}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Identidad reutilizada desde la configuración del catálogo</p>
                  </div>
                </div>
                <span className={visible ? "inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700" : "inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground"}>
                  {visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}{visible ? "Publicidad activada" : "Publicidad desactivada"}
                </span>
              </div>
              {urlPublica && <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/70 p-3">
                <span className="min-w-0 flex-1 break-all text-sm">{urlPublica}</span>
                <button type="button" onClick={() => void copiarEnlace()} className="inline-flex items-center gap-2 rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-black"><Copy className="size-4" /> Copiar enlace</button>
                <a href={urlPublica} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><ExternalLink className="size-4" /> Vista pública</a>
              </div>}
            </section>

            <form onSubmit={guardar} className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
              <Panel titulo="Contenido de la publicación">
                <div className="space-y-4 p-5">
                  <label className="block space-y-1.5"><span className="text-sm font-medium">Título destacado</span><input maxLength={140} value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej. Aprende Diseño 3D para Joyería" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" /></label>
                  <label className="block space-y-1.5"><span className="text-sm font-medium">Descripción promocional</span><textarea maxLength={3000} rows={5} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Presenta el curso, sus beneficios y a quién está dirigido…" className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm" /></label>
                  <label className="block space-y-1.5"><span className="text-sm font-medium">Imagen promocional (URL)</span><input type="url" value={imagenUrl} onChange={e => setImagenUrl(e.target.value)} placeholder="https://…" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" /><span className="text-xs text-muted-foreground">Opcional. Si no añades una imagen, se mostrará el logo del taller.</span></label>
                  <button type="submit" disabled={guardando} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gold px-5 text-sm font-semibold text-black disabled:opacity-50"><Save className="size-4" />{guardando ? "Guardando…" : "Guardar configuración"}</button>
                  {mensaje && <p role="status" className="break-words text-sm text-muted-foreground">{mensaje}</p>}
                </div>
              </Panel>
              <Panel titulo="Publicación externa">
                <div className="space-y-4 p-5">
                  <div className="rounded-xl border border-border bg-surface-muted p-4">
                    <p className="text-sm font-semibold">Identidad del taller</p>
                    <p className="mt-1 text-sm text-muted-foreground">{config.descripcion || "Añade una descripción en la configuración existente del catálogo para presentar tu taller."}</p>
                    {config.whatsapp && <p className="mt-2 text-sm">WhatsApp de contacto: {config.whatsapp}</p>}
                  </div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4">
                    <input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} className="mt-1 size-4 accent-amber-600" />
                    <span><span className="block text-sm font-semibold">Habilitar publicación pública</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Independiente de la visibilidad del catálogo de joyas. Desactívala para ocultar la página formativa sin afectar el catálogo.</span></span>
                  </label>
                  <p className="text-xs leading-5 text-muted-foreground">El enlace usa el identificador público existente del taller. Los alumnos no necesitan iniciar sesión para consultar la página.</p>
                </div>
              </Panel>
            </form>
          </>
        )}
      </div>
    </AppShell>
  );
}
