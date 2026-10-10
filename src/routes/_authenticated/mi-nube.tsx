import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Box,
  ChevronRight,
  Cloud,
  FileText,
  HardDrive,
  Image as ImageIcon,
  LockKeyhole,
  Search,
  ShieldCheck,
  UploadCloud,
  Video,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/mi-nube")({
  head: () => ({
    meta: [
      { title: "Mi nube — Taller del Joyero" },
      {
        name: "description",
        content: "Centro de archivos y multimedia de Taller del Joyero.",
      },
    ],
  }),
  component: MiNubePage,
});

const secciones = [
  {
    id: "fotos",
    titulo: "Fotos e imágenes",
    descripcion: "Fotografías de joyas, productos y trabajos terminados.",
    formatos: "JPG · PNG · WEBP · HEIC",
    Icono: ImageIcon,
  },
  {
    id: "videos",
    titulo: "Videos",
    descripcion: "Procesos de fabricación, demostraciones y material comercial.",
    formatos: "MP4 · MOV · WEBM",
    Icono: Video,
  },
  {
    id: "documentos",
    titulo: "Documentos",
    descripcion: "Contratos, fichas técnicas, PDF y archivos administrativos.",
    formatos: "PDF · DOCX · XLSX · TXT",
    Icono: FileText,
  },
  {
    id: "modelos-3d",
    titulo: "Biblioteca 3D",
    descripcion: "Diseños CAD y modelos para revisar o preparar para renderizado.",
    formatos: "3DM · STL · OBJ · GLB",
    Icono: Box,
  },
] as const;

function MiNubePage() {
  const [busqueda, setBusqueda] = useState("");
  const [seccionActiva, setSeccionActiva] = useState<string | null>(null);

  const seccionesFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es");
    return secciones.filter((seccion) => {
      const coincideSeccion = !seccionActiva || seccion.id === seccionActiva;
      const texto = `${seccion.titulo} ${seccion.descripcion} ${seccion.formatos}`.toLocaleLowerCase("es");
      return coincideSeccion && (!termino || texto.includes(termino));
    });
  }, [busqueda, seccionActiva]);

  return (
    <AppShell
      titulo="Mi nube"
      subtitulo="Centro de archivos y multimedia del taller"
      atrasMovil={{ to: "/inicio" }}
    >
      <div className="mx-auto w-full max-w-[1440px] space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-card sm:p-8">
          <div
            className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-gold/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gold">
                <Cloud className="size-3.5" />
                Biblioteca del taller
              </span>
              <h2 className="mt-4 font-display text-3xl sm:text-4xl">
                Todo tu contenido, en un solo lugar.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                Organiza fotografías, videos, documentos y diseños 3D. Más adelante podrás
                vincularlos con clientes, pedidos, contratos y Aurum Render.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-border bg-background/80 p-4">
              <div className="grid size-11 place-items-center rounded-xl bg-gold/10 text-gold">
                <HardDrive className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Almacenamiento del NAS</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2 rounded-full bg-amber-500" />
                  Pendiente de conexión
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Secciones de archivos">
          {secciones.map(({ id, titulo, descripcion, formatos, Icono }) => {
            const activa = seccionActiva === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSeccionActiva(activa ? null : id)}
                aria-pressed={activa}
                className={`group rounded-2xl border p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                  activa ? "border-gold/60 bg-gold/5" : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`grid size-12 place-items-center rounded-xl ${
                    activa ? "bg-gold/15 text-gold" : "bg-surface-muted text-muted-foreground group-hover:text-gold"
                  }`}>
                    <Icono className="size-5" />
                  </div>
                  <ChevronRight className={`mt-1 size-4 transition-transform ${
                    activa ? "rotate-90 text-gold" : "text-muted-foreground group-hover:translate-x-0.5"
                  }`} />
                </div>
                <h3 className="mt-5 font-semibold">{titulo}</h3>
                <p className="mt-2 min-h-[60px] text-sm leading-5 text-muted-foreground">{descripcion}</p>
                <p className="mt-4 border-t border-border pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {formatos}
                </p>
              </button>
            );
          })}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">
                {seccionActiva
                  ? secciones.find((seccion) => seccion.id === seccionActiva)?.titulo
                  : "Biblioteca de archivos"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Busca una sección o prepara la biblioteca para conectarla al almacenamiento real.
              </p>
            </div>
            <label className="relative block w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar fotos, videos, PDF, STL..."
                className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-gold"
                aria-label="Buscar tipos de archivos"
              />
            </label>
          </div>

          {seccionesFiltradas.length > 0 ? (
            <div className="mt-5 divide-y divide-border rounded-xl border border-border">
              {seccionesFiltradas.map(({ id, titulo, descripcion, Icono }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSeccionActiva(id)}
                  className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-surface-muted/60"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-muted text-muted-foreground">
                    <Icono className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{titulo}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{descripcion}</p>
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-border p-8 text-center">
              <Search className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No hay secciones que coincidan</p>
              <p className="mt-1 text-xs text-muted-foreground">Prueba otra búsqueda o limpia el filtro.</p>
              <button
                type="button"
                onClick={() => { setBusqueda(""); setSeccionActiva(null); }}
                className="mt-4 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-gold/50"
              >
                Limpiar filtros
              </button>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-background p-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-muted text-muted-foreground">
                <UploadCloud className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Carga de archivos</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Se habilitará cuando comprobemos la conexión segura con Nextcloud. Todavía no se sube ningún archivo.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Próxima fase
              </span>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border bg-background p-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Acceso protegido</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Esta pantalla está dentro del área autenticada. La conexión de archivos se integrará sin guardar contraseñas en el navegador.
                </p>
              </div>
            </div>
          </div>
        </section>

        <p className="flex items-start gap-2 px-1 text-xs leading-5 text-muted-foreground">
          <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
          No se muestran archivos de ejemplo: la biblioteca aparecerá aquí cuando el almacenamiento real esté conectado y verificado.
        </p>
      </div>
    </AppShell>
  );
}
