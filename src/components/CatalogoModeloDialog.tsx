// @ts-nocheck
import { useEffect, useState, type FormEvent } from "react";
import { FileText, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { nombreSeguro, subirConProgreso } from "@/lib/subir-archivo";

export type ProyectoNubeInicial = {
  carpeta: string;
  archivos: Array<{ nombre: string; ruta: string; categoria: string; bytes: number; origen: "supabase" | "nas"; actualizado: string | null }>;
};

export type CatalogoProductoEditor = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  descripcion: string | null;
  imagen_principal_url: string | null;
  galeria: unknown;
  video_url: string | null;
  aurum_render_url: string | null;
  precio_desde: number | null;
  moneda: string;
  metal_principal: string | null;
  peso_gramos: number | null;
  piedras: string | null;
  medidas: string | null;
  talla: string | null;
  tecnica: string | null;
  acabado: string | null;
  disponibilidad: string;
  tiempo_fabricacion_dias: number | null;
  ficha_tecnica_url: string | null;
  mostrar_precio: boolean;
  mostrar_ficha_tecnica: boolean;
};

type Props = {
  open: boolean;
  producto: CatalogoProductoEditor | null;
  participanteId: string;
  categorias: string[];
  onClose: () => void;
  onSaved: () => void;
  initialImageUrl?: string | null;
  initialName?: string | null;
  initialProject?: ProyectoNubeInicial | null;
  initialPdf?: { nombre: string; ruta: string } | null;
};

const CATEGORIAS_PREDETERMINADAS = ["Anillos", "Aretes", "Collares", "Pulseras", "Dijes", "Alianzas", "Conjuntos", "Otros"] as const;

function traducirMetalEspanol(value: string | null | undefined) {
  const original = String(value ?? "").trim();
  if (!original) return "";
  const limpio = original.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const quilates = limpio.match(/\b(\d+(?:[.,]\d+)?)\s*(?:k|kt|karat|karats|carat|carats)\b/i)?.[1]?.replace(",", "");
  const titulo = quilates ? quilates + "K" : "";
  if (/\b(white gold|oro blanco)\b/i.test(limpio)) return ["Oro blanco", titulo].filter(Boolean).join(" ");
  if (/\b(yellow gold|oro amarillo)\b/i.test(limpio)) return ["Oro amarillo", titulo].filter(Boolean).join(" ");
  if (/\b(rose gold|pink gold|oro rosa)\b/i.test(limpio)) return ["Oro rosa", titulo].filter(Boolean).join(" ");
  if (/\b(green gold|oro verde)\b/i.test(limpio)) return ["Oro verde", titulo].filter(Boolean).join(" ");
  if (/\b(platinum|platino)\b/i.test(limpio)) return titulo ? "Platino " + titulo : "Platino";
  if (/\b(silver|sterling silver|plata|plata de ley)\b/i.test(limpio)) return /\b(sterling silver|plata de ley)\b/i.test(limpio) ? "Plata de ley" : "Plata";
  return original;
}

function slugify(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export function CatalogoModeloDialog({ open, producto, participanteId, categorias, onClose, onSaved, initialImageUrl, initialName, initialProject, initialPdf }: Props) {
  const [form, setForm] = useState({
    codigo: "", nombre: "", slug: "", categoria: categorias[0] ?? CATEGORIAS_PREDETERMINADAS[0], descripcion: "",
    imagen_principal_url: "", galeria: "", video_url: "", aurum_render_url: "",
    precio_desde: "", moneda: "PEN",
    metal_principal: "", peso_gramos: "", piedras: "", medidas: "", talla: "", modalidad_talla: "a_medida", sistema_tallas: "Peruana", tallas_disponibles: "",
    tecnica: "", acabado: "", disponibilidad: "Consultar", tiempo_fabricacion_dias: "",
    ficha_tecnica_url: "", notas_internas: "", mostrar_precio: true, mostrar_ficha_tecnica: true,
  });
  const [guardando, setGuardando] = useState(false);
  const [analizandoPdf, setAnalizandoPdf] = useState(false);
  const [archivoPdfNombre, setArchivoPdfNombre] = useState("");
  const [avisosExtraccion, setAvisosExtraccion] = useState<string[]>([]);
  const [proyectoNube, setProyectoNube] = useState<ProyectoNubeInicial | null>(null);
  const [productoCreadoId, setProductoCreadoId] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [progresoSubida, setProgresoSubida] = useState(0);
  const [carpetaSubida, setCarpetaSubida] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [costosPrecio, setCostosPrecio] = useState({ metal: "", piedras: "", manoObra: "", otros: "", margen: "30", impuesto: "0" });

  const numeroCosto = (valor: string) => valor.trim() === "" ? 0 : Number(valor);
  const pesoParaPrecio = numeroCosto(form.peso_gramos);
  const costoMetalCalculado = pesoParaPrecio * numeroCosto(costosPrecio.metal);
  const costoBase = costoMetalCalculado + numeroCosto(costosPrecio.piedras) + numeroCosto(costosPrecio.manoObra) + numeroCosto(costosPrecio.otros);
  const margenPrecio = numeroCosto(costosPrecio.margen);
  const impuestoPrecio = numeroCosto(costosPrecio.impuesto);
  const precioCalculado = costoBase > 0 && margenPrecio >= 0 && margenPrecio < 100 && impuestoPrecio >= 0
    ? (costoBase / (1 - margenPrecio / 100)) * (1 + impuestoPrecio / 100)
    : null;
  const formatoMoneda = (valor: number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: form.moneda.trim().toUpperCase().length === 3 ? form.moneda.trim().toUpperCase() : "PEN" }).format(valor);

  useEffect(() => {
    if (!open) return;
    setForm({
      codigo: producto?.codigo ?? "",
      nombre: producto?.nombre ?? initialName ?? "",
      slug: producto ? slugify(producto.nombre) : "",
      categoria: producto?.categoria ?? categorias[0] ?? CATEGORIAS_PREDETERMINADAS[0],
      descripcion: producto?.descripcion ?? "",
      imagen_principal_url: producto?.imagen_principal_url ?? initialImageUrl ?? "",
      galeria: Array.isArray(producto?.galeria) ? producto.galeria.join("\n") : "",
      video_url: producto?.video_url ?? "",
      aurum_render_url: producto?.aurum_render_url ?? "",
      precio_desde: producto?.precio_desde == null ? "" : String(producto.precio_desde),
      moneda: producto?.moneda || "PEN",
      metal_principal: traducirMetalEspanol(producto?.metal_principal),
      peso_gramos: producto?.peso_gramos == null ? "" : String(producto.peso_gramos),
      piedras: producto?.piedras ?? "",
      medidas: producto?.medidas ?? "",
      talla: producto?.talla ?? "",
      modalidad_talla: producto?.modalidad_talla ?? "a_medida",
      sistema_tallas: producto?.sistema_tallas ?? "Peruana",
      tallas_disponibles: producto?.tallas_disponibles ?? "",
      tecnica: producto?.tecnica ?? "",
      acabado: producto?.acabado ?? "",
      disponibilidad: producto?.disponibilidad ?? "Consultar",
      tiempo_fabricacion_dias: producto?.tiempo_fabricacion_dias == null ? "" : String(producto.tiempo_fabricacion_dias),
      ficha_tecnica_url: producto?.ficha_tecnica_url ?? "",
      notas_internas: producto?.notas_internas ?? "",
      mostrar_precio: producto?.mostrar_precio ?? true,
      mostrar_ficha_tecnica: producto?.mostrar_ficha_tecnica ?? true,
    });
    setCarpetaSubida(producto?.id ?? "");
    setProgresoSubida(0);
    setError(null);
    setArchivoPdfNombre("");
    setAvisosExtraccion([]);
    setProductoCreadoId(null);
    setProyectoNube(initialProject ?? null);
    if (producto?.id) {
      void (async () => {
        const { data, error: projectError } = await (supabase as any).from("catalogo_proyectos_nube")
          .select("carpeta, archivos").eq("producto_id", producto.id).maybeSingle();
        if (projectError) {
          console.warn("[Catálogo] No se pudo consultar el proyecto vinculado de Mi Nube.", projectError.message);
          return;
        }
        if (data && typeof data.carpeta === "string" && Array.isArray(data.archivos)) {
          setProyectoNube({ carpeta: data.carpeta, archivos: data.archivos });
        }
      })();
    }
  }, [open, producto, categorias, initialProject, initialPdf]);

  if (!open) return null;

  async function analizarFichaPdf(file?: File) {
    if (file && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Selecciona un archivo PDF válido."); return;
    }
    if (file && file.size > 10 * 1024 * 1024) {
      setError("El PDF supera los 10 MB. Reduce el tamaño e inténtalo de nuevo."); return;
    }
    if (!file && !initialPdf) { setError("Selecciona un PDF de Mi Nube o desde tu dispositivo."); return; }
    setAnalizandoPdf(true); setError(null); setAvisosExtraccion([]);
    try {
      let body: Record<string, string>;
      if (file) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        let binary = "";
        for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
        body = { participanteId, fileName: file.name, pdfBase64: btoa(binary) };
      } else {
        body = { participanteId, fileName: initialPdf!.nombre, storagePath: initialPdf!.ruta };
      }
      const { data, error: invokeError } = await supabase.functions.invoke("catalogo-extraer-ficha-pdf", { body });
      if (invokeError) throw new Error(invokeError.message || "No se pudo analizar el PDF.");
      if (!data?.ok || !data?.campos) throw new Error(data?.error || "No se pudieron reconocer los datos.");
      const c = data.campos;
      setForm((v) => ({
        ...v,
        nombre: String(c.nombre ?? "").trim() || v.nombre,
        descripcion: String(c.descripcion ?? "").trim() || v.descripcion,
        metal_principal: traducirMetalEspanol(String(c.metal_principal ?? "").trim()) || v.metal_principal,
        peso_gramos: typeof c.peso_gramos === "number" && Number.isFinite(c.peso_gramos) ? String(c.peso_gramos) : "",
        piedras: String(c.piedras ?? "").trim() || v.piedras,
        medidas: String(c.medidas ?? "").trim() || v.medidas,
        talla: String(c.talla ?? "").trim() || v.talla,
        tecnica: String(c.tecnica ?? "").trim() || v.tecnica,
        acabado: String(c.acabado ?? "").trim() || v.acabado,
        disponibilidad: String(c.disponibilidad ?? "").trim() || v.disponibilidad,
      }));
      setArchivoPdfNombre(file?.name ?? initialPdf?.nombre ?? "PDF de Mi Nube");
      const avisos = Array.isArray(data.advertencias) ? data.advertencias.filter((x) => typeof x === "string") : [];
      if (typeof c.peso_evidencia === "string" && c.peso_evidencia.trim()) avisos.unshift(`Referencia de peso leída del PDF: “${c.peso_evidencia.trim()}”. Comprueba que corresponda al peso total de la joya.`);
      setAvisosExtraccion(avisos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo analizar la ficha PDF.");
    } finally { setAnalizandoPdf(false); }
  }

  async function subirImagen(file: File, tipo: "principal" | "galeria") {
    if (!participanteId || !file.type.startsWith("image/")) {
      setError("Selecciona una imagen válida.");
      return;
    }
    const carpeta = carpetaSubida || crypto.randomUUID();
    setCarpetaSubida(carpeta);
    const ruta = `${participanteId}/${carpeta}/${tipo}-${Date.now()}-${nombreSeguro(file.name)}`;
    setSubiendo(true);
    setProgresoSubida(0);
    setError(null);
    try {
      await subirConProgreso({ bucket: "catalogo-joyas", ruta, file, onProgreso: setProgresoSubida });
      const { data } = supabase.storage.from("catalogo-joyas").getPublicUrl(ruta);
      if (!data.publicUrl) throw new Error("No se pudo obtener la URL pública de la imagen.");
      setForm((actual) => ({
        ...actual,
        ...(tipo === "principal"
          ? { imagen_principal_url: data.publicUrl }
          : { galeria: actual.galeria ? `${actual.galeria}\n${data.publicUrl}` : data.publicUrl }),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendo(false);
    }
  }

  async function guardar(event: FormEvent) {
    event.preventDefault();
    const nombre = form.nombre.trim();
    let slug = slugify(nombre);
    const precio = form.precio_desde.trim() === "" ? null : Number(form.precio_desde);
    const peso = form.peso_gramos.trim() === "" ? null : Number(form.peso_gramos);
    const tiempo = form.tiempo_fabricacion_dias.trim() === "" ? null : Number(form.tiempo_fabricacion_dias);

    if (!nombre || !slug) return setError("Nombre y slug son obligatorios.");
    if (precio !== null && (!Number.isFinite(precio) || precio <= 0)) return setError("El precio debe ser mayor que 0 o dejarse vacío para mostrar 'Consultar'.");
    if (peso !== null && (!Number.isFinite(peso) || peso <= 0)) return setError("El peso debe ser mayor que 0.");
    if (tiempo !== null && (!Number.isInteger(tiempo) || tiempo <= 0)) return setError("El tiempo de fabricación debe ser un número entero mayor que 0.");

    setGuardando(true);
    setError(null);
    try {
      const slugBase = slug;
      let sufijo = 2;
      while (true) {
        const { data: slugExistente, error: slugCheckError } = await supabase
          .from("catalogo_productos")
          .select("id")
          .eq("participante_id", participanteId)
          .eq("slug", slug)
          .maybeSingle();

        if (slugCheckError) throw slugCheckError;
        if (!slugExistente || slugExistente.id === producto?.id) break;

        const finalSufijo = `-${sufijo++}`;
        slug = slugBase.slice(0, 80 - finalSufijo.length).replace(/-+$/g, "") + finalSufijo;
        if (sufijo > 10000) throw new Error("No se pudo generar una URL única para esta joya.");
      }

      const payload = {
        participante_id: participanteId,
        nombre,
        slug,
        categoria: form.categoria.trim() || "Sin categoría",
        descripcion: form.descripcion.trim() || null,
        imagen_principal_url: form.imagen_principal_url.trim() || null,
        galeria: form.galeria.split(/\n/).map((value) => value.trim()).filter(Boolean),
        video_url: form.video_url.trim() || null,
        aurum_render_url: form.aurum_render_url.trim() || null,
        precio_desde: precio,
        moneda: form.moneda.trim().toUpperCase() || "PEN",
        metal_principal: traducirMetalEspanol(form.metal_principal) || null,
        peso_gramos: peso,
        piedras: form.piedras.trim() || null,
        medidas: form.medidas.trim() || null,
        talla: form.talla.trim() || null,
        tecnica: form.tecnica.trim() || null,
        acabado: form.acabado.trim() || null,
        disponibilidad: form.disponibilidad.trim() || "Consultar",
        tiempo_fabricacion_dias: tiempo,
        ficha_tecnica_url: form.ficha_tecnica_url.trim() || null,
        notas_internas: form.notas_internas.trim() || null,
        mostrar_precio: form.mostrar_precio,
        mostrar_ficha_tecnica: form.mostrar_ficha_tecnica,
      };

      const productoIdActual = producto?.id ?? productoCreadoId;
      const result = productoIdActual
        ? await supabase.from("catalogo_productos").update(payload).eq("id", productoIdActual).eq("participante_id", participanteId)
        : await supabase.from("catalogo_productos").insert(payload).select("id, codigo, nombre, participante_id").single();

      if (result.error) {
        if (result.error.code === "23505") {
          throw new Error("Otra operación acaba de utilizar esa URL pública. Vuelve a guardar para generar una variante única.");
        }
        const detalle = [result.error.message, result.error.details, result.error.hint, result.error.code ? `Código: ${result.error.code}` : ""].filter(Boolean).join(" · ");
        throw new Error(detalle || "No se pudo guardar el modelo.");
      }
      const productoIdGuardado = productoIdActual ?? result.data?.id;
      if (proyectoNube && productoIdGuardado) {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) throw new Error("La ficha se guardó, pero no se pudo verificar la sesión para vincular Mi Nube.");
        const { error: linkError } = await (supabase as any).from("catalogo_proyectos_nube").upsert({
          producto_id: productoIdGuardado, participante_id: participanteId, usuario_id: authData.user.id,
          carpeta: proyectoNube.carpeta, archivos: proyectoNube.archivos,
        }, { onConflict: "producto_id" });
        if (linkError) {
          if (!productoIdActual) setProductoCreadoId(productoIdGuardado);
          throw new Error("La ficha se guardó, pero no se pudo vincular el proyecto de Mi Nube. Puedes volver a guardar sin duplicar la ficha. Detalle: " + linkError.message);
        }
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el modelo.");
    } finally {
      setGuardando(false);
    }
  }

  const input = "h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-gold/40";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-gold/20 bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-5">
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-gold">Catálogo maestro</p><h2 className="mt-1 text-xl font-semibold">{producto ? "Editar ficha de joya" : "Nueva ficha de joya"}</h2></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-surface-muted" aria-label="Cerrar"><X className="size-5" /></button>
        </div>

        <form onSubmit={guardar} className="grid gap-5 p-6">
          <section className="grid gap-3 rounded-2xl border border-gold/30 bg-gold/5 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-gold/10 p-2.5 text-gold"><Sparkles className="size-5" /></div>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Subida inteligente con IA</p><p className="mt-1 text-xs text-muted-foreground">Carga una ficha PDF para proponer nombre, metal, peso y piedras. Revisa los campos antes de guardar; no se publica automáticamente.</p></div>
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-gold/40 bg-background px-4 py-3 text-xs font-semibold transition hover:bg-gold/5">
              <FileText className="size-4" />{analizandoPdf ? "Analizando ficha…" : "Seleccionar ficha técnica PDF"}
              <input type="file" accept="application/pdf,.pdf" disabled={analizandoPdf || guardando || subiendo} onChange={(e) => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (file) void analizarFichaPdf(file); }} className="sr-only" />
            </label>
            {initialPdf ? <button type="button" onClick={() => void analizarFichaPdf()} disabled={analizandoPdf || guardando || subiendo} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/5 px-4 py-3 text-xs font-semibold hover:bg-gold/10 disabled:opacity-50">{analizandoPdf ? "Analizando PDF de Mi Nube…" : `Analizar PDF privado de Mi Nube: ${initialPdf.nombre}`}</button> : null}
            {analizandoPdf ? <p className="text-xs text-muted-foreground">La IA está leyendo el documento…</p> : null}
            {archivoPdfNombre ? <p className="text-xs font-medium text-emerald-700">Ficha analizada: {archivoPdfNombre}. Comprueba los campos antes de guardar.</p> : null}
            {avisosExtraccion.length ? <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">{avisosExtraccion.map((aviso, index) => <li key={index}>{aviso}</li>)}</ul> : null}
          </section>
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-gold">Identidad</p><p className="mt-1 text-xs text-muted-foreground">Datos que identifican la pieza en el catálogo.</p></div>
            <label className="grid gap-1.5 text-xs font-semibold">Código
              <input value={form.codigo} readOnly className={`${input} bg-surface-muted font-mono font-semibold text-muted-foreground`} placeholder="Se genera automáticamente" />
              <span className="text-[10px] font-normal text-muted-foreground">{producto ? "Código permanente." : "Se asignará automáticamente al crearla."}</span>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">Nombre<input required value={form.nombre} onChange={(e) => setForm(v => ({ ...v, nombre: e.target.value, slug: slugify(e.target.value) }))} className={input} placeholder="Anillo Aura" /></label>
            <label className="grid gap-1.5 text-xs font-semibold">Categoría
              <select value={form.categoria} onChange={(e) => setForm(v => ({ ...v, categoria: e.target.value }))} className={input}>
                {[...new Set([...(categorias.length ? categorias : CATEGORIAS_PREDETERMINADAS), form.categoria].filter(Boolean))].map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}
              </select>
              <span className="text-[10px] font-normal text-muted-foreground">Selecciona una categoría administrada por tu taller.</span>
            </label>
          </section>

          <section className="grid gap-4 rounded-2xl border border-border bg-surface-muted/30 p-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-gold">Ficha técnica</p><p className="mt-1 text-xs text-muted-foreground">Información descriptiva de la pieza. No contiene costos internos.</p></div>
            <label className="grid gap-1.5 text-xs font-semibold">Metal principal<input value={form.metal_principal} onChange={e => setForm(v => ({ ...v, metal_principal: e.target.value }))} className={input} placeholder="Oro 18K" /></label>
            <label className="grid gap-1.5 text-xs font-semibold">Peso (g)<input type="number" min="0" step="0.001" value={form.peso_gramos} onChange={e => setForm(v => ({ ...v, peso_gramos: e.target.value }))} className={input} placeholder="5.250" /></label>
            <label className="grid gap-1.5 text-xs font-semibold">Piedras<input value={form.piedras} onChange={e => setForm(v => ({ ...v, piedras: e.target.value }))} className={input} placeholder="Diamante · 0.20 ct" /></label>
            <label className="grid gap-1.5 text-xs font-semibold">Medidas<input value={form.medidas} onChange={e => setForm(v => ({ ...v, medidas: e.target.value }))} className={input} placeholder="18 × 12 mm" /></label>
            <label className="grid gap-1.5 text-xs font-semibold">Talla<input value={form.talla} onChange={e => setForm(v => ({ ...v, talla: e.target.value }))} className={input} placeholder="16 · ajustable" /></label>
            <label className="grid gap-1.5 text-xs font-semibold">Acabado<input value={form.acabado} onChange={e => setForm(v => ({ ...v, acabado: e.target.value }))} className={input} placeholder="Pulido espejo" /></label>
            <label className="grid gap-1.5 text-xs font-semibold">Disponibilidad<select value={form.disponibilidad} onChange={e => setForm(v => ({ ...v, disponibilidad: e.target.value }))} className={input}><option>Consultar</option><option>Disponible</option><option>Por encargo</option><option>No disponible</option></select></label>
            <label className="grid gap-1.5 text-xs font-semibold">Fabricación (días)<input type="number" min="1" step="1" value={form.tiempo_fabricacion_dias} onChange={e => setForm(v => ({ ...v, tiempo_fabricacion_dias: e.target.value }))} className={input} placeholder="7" /></label>
            <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Ficha técnica externa (URL)<input type="url" value={form.ficha_tecnica_url} onChange={e => setForm(v => ({ ...v, ficha_tecnica_url: e.target.value }))} className={input} placeholder="https://..." /></label>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-gold">Comercial</p></div>
            <label className="grid gap-1.5 text-xs font-semibold">Precio desde<input type="number" min="0" step="0.01" value={form.precio_desde} onChange={(e) => setForm(v => ({ ...v, precio_desde: e.target.value }))} className={input} placeholder="Dejar vacío = Consultar" /></label>
            <label className="grid gap-1.5 text-xs font-semibold">Moneda<input maxLength={3} value={form.moneda} onChange={(e) => setForm(v => ({ ...v, moneda: e.target.value.toUpperCase() }))} className={input} /></label>
            <div className="grid gap-3 rounded-2xl border border-gold/25 bg-gold/5 p-4 sm:col-span-2">
              <div>
                <p className="text-sm font-semibold">Calculadora de precio para joyeros</p>
                <p className="mt-1 text-xs font-normal text-muted-foreground">Introduce tus costes y el margen deseado. Los importes son solo para este cálculo y no se guardan en la ficha.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-medium">Precio del metal por gramo<input type="number" min="0" step="0.01" value={costosPrecio.metal} onChange={e => setCostosPrecio(v => ({ ...v, metal: e.target.value }))} className={input} placeholder="Precio por gramo" /><span className="text-[11px] font-normal text-muted-foreground">Peso de la ficha: {pesoParaPrecio > 0 ? `${pesoParaPrecio} g` : "introduce primero el peso"} · Coste calculado: {formatoMoneda(costoMetalCalculado)}</span></label>
                <label className="grid gap-1.5 text-xs font-medium">Coste de piedras<input type="number" min="0" step="0.01" value={costosPrecio.piedras} onChange={e => setCostosPrecio(v => ({ ...v, piedras: e.target.value }))} className={input} placeholder="0.00" /></label>
                <label className="grid gap-1.5 text-xs font-medium">Mano de obra<input type="number" min="0" step="0.01" value={costosPrecio.manoObra} onChange={e => setCostosPrecio(v => ({ ...v, manoObra: e.target.value }))} className={input} placeholder="0.00" /></label>
                <label className="grid gap-1.5 text-xs font-medium">Otros costes<input type="number" min="0" step="0.01" value={costosPrecio.otros} onChange={e => setCostosPrecio(v => ({ ...v, otros: e.target.value }))} className={input} placeholder="0.00" /></label>
                <label className="grid gap-1.5 text-xs font-medium">Margen de ganancia (%)<input type="number" min="0" max="99.99" step="0.5" value={costosPrecio.margen} onChange={e => setCostosPrecio(v => ({ ...v, margen: e.target.value }))} className={input} /></label>
                <label className="grid gap-1.5 text-xs font-medium">Impuesto adicional (%)<input type="number" min="0" max="100" step="0.5" value={costosPrecio.impuesto} onChange={e => setCostosPrecio(v => ({ ...v, impuesto: e.target.value }))} className={input} /></label>
              </div>
              <div className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-3 text-xs"><span className="text-muted-foreground">Coste total</span><span className="font-semibold tabular-nums">{formatoMoneda(costoBase)}</span></div>
                <div className="mt-2 flex items-center justify-between gap-3"><span className="text-sm font-semibold">Precio sugerido</span><span className="text-lg font-bold tabular-nums">{precioCalculado !== null && Number.isFinite(precioCalculado) ? formatoMoneda(precioCalculado) : "Completa los costes"}</span></div>
                <p className="mt-1 text-[11px] text-muted-foreground">El coste del metal se calcula con el peso de la ficha × precio por gramo. Precio = coste total ÷ (1 − margen), más el impuesto aplicado al resultado.</p>
                <button type="button" disabled={precioCalculado === null || !Number.isFinite(precioCalculado) || costoBase <= 0} onClick={() => setForm(v => ({ ...v, precio_desde: precioCalculado!.toFixed(2) }))} className="mt-3 w-full rounded-xl bg-gold px-4 py-2.5 text-xs font-semibold text-gold-foreground disabled:cursor-not-allowed disabled:opacity-50">Usar precio calculado</button>
              </div>
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-xs sm:col-span-2"><input type="checkbox" checked={form.mostrar_precio} onChange={e => setForm(v => ({ ...v, mostrar_precio: e.target.checked }))} /> Mostrar precio en el catálogo público</label>
          </section>

          {proyectoNube ? (
            <section className="grid gap-3 rounded-2xl border border-gold/30 bg-gold/5 p-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-gold">Proyecto vinculado a Mi Nube</p>
                <p className="mt-1 text-sm font-semibold">{proyectoNube.carpeta}</p>
                <p className="mt-1 text-xs text-muted-foreground">{proyectoNube.archivos.length} archivo(s) asociados. Los originales permanecen privados en Mi Nube; el catálogo solo guarda sus referencias.</p>
              </div>
              <ul className="grid gap-1 sm:grid-cols-2">
                {proyectoNube.archivos.map((archivo, index) => (
                  <li key={archivo.ruta + index} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border/70 bg-background px-3 py-2 text-xs">
                    <span className="min-w-0 truncate">{archivo.nombre}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{archivo.origen === "nas" ? "Nextcloud" : archivo.categoria}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-muted-foreground">Los PDF, STL, 3DM y vídeos no se publican automáticamente. Revisa los permisos antes de compartir archivos.</p>
              <button type="button" onClick={() => window.open("/mi-nube?proyecto=" + encodeURIComponent(proyectoNube.carpeta), "_blank", "noopener,noreferrer")} className="w-full rounded-xl border border-gold/40 bg-background px-3 py-2.5 text-xs font-semibold hover:bg-gold/5">Abrir proyecto en Mi Nube</button>
            </section>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-gold">Multimedia</p>
              <p className="mt-1 text-xs text-muted-foreground">Sube las imágenes directamente. Los enlaces de almacenamiento se gestionan automáticamente y no necesitas copiarlos.</p>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <span className="text-xs font-semibold">Imagen principal</span>
              {form.imagen_principal_url ? (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted/30 p-3">
                  <img src={form.imagen_principal_url} alt="Vista previa de la imagen principal" className="size-20 rounded-lg border border-border object-cover" />
                  <div className="min-w-0 flex-1"><p className="text-xs font-medium">Imagen principal cargada</p><p className="mt-1 text-[11px] text-muted-foreground">Puedes reemplazarla seleccionando otra imagen.</p></div>
                </div>
              ) : <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Todavía no has seleccionado una imagen principal.</div>}
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/5 px-4 py-3 text-xs font-semibold transition hover:bg-gold/10">
                {subiendo ? "Subiendo imagen…" : form.imagen_principal_url ? "Cambiar imagen principal" : "Seleccionar imagen principal"}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={subiendo} onChange={(e) => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (file) void subirImagen(file, "principal"); }} className="sr-only" />
              </label>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <span className="text-xs font-semibold">Galería de imágenes</span>
              {form.galeria.split(/\\n/).map((url) => url.trim()).filter(Boolean).length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {form.galeria.split(/\\n/).map((url) => url.trim()).filter(Boolean).map((url, index) => <img key={url + index} src={url} alt={`Imagen de galería ${index + 1}`} className="aspect-square w-full rounded-lg border border-border object-cover" />)}
                </div>
              ) : <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Aún no hay imágenes en la galería.</div>}
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-xs font-semibold transition hover:bg-surface-muted">
                Añadir imágenes a la galería
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={subiendo} onChange={(e) => { const files = Array.from(e.currentTarget.files ?? []); e.currentTarget.value = ""; void Promise.all(files.map((file) => subirImagen(file, "galeria"))); }} className="sr-only" />
              </label>
              {subiendo ? <span className="text-[11px] text-muted-foreground">Subiendo imágenes… {progresoSubida}%</span> : null}
            </div>

          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-gold">Descripción y publicación</p></div>
            <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Descripción pública<textarea rows={4} value={form.descripcion} onChange={e => setForm(v => ({ ...v, descripcion: e.target.value }))} className="rounded-xl border border-border bg-background px-3 py-3 text-sm font-normal outline-none focus:border-gold/40" /></label>
            <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-xs sm:col-span-2"><input type="checkbox" checked={form.mostrar_ficha_tecnica} onChange={e => setForm(v => ({ ...v, mostrar_ficha_tecnica: e.target.checked }))} /> Mostrar ficha técnica pública</label>
            <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Notas internas<textarea rows={3} value={form.notas_internas} onChange={e => setForm(v => ({ ...v, notas_internas: e.target.value }))} className="rounded-xl border border-border bg-background px-3 py-3 text-sm font-normal outline-none focus:border-gold/40" placeholder="Información interna que nunca se publica." /></label>
          </section>

          {error ? <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2"><button type="button" onClick={onClose} disabled={guardando || subiendo || analizandoPdf} className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold disabled:opacity-50">Cancelar</button><button type="submit" disabled={guardando || subiendo || analizandoPdf} className="rounded-xl bg-gold px-4 py-2.5 text-xs font-semibold text-gold-foreground disabled:opacity-50">{analizandoPdf ? "Analizando PDF…" : subiendo ? "Subiendo imágenes…" : guardando ? "Guardando…" : producto ? "Guardar cambios" : "Crear ficha"}</button></div>
        </form>
      </div>
    </div>
  );
}
