import { useEffect, useState } from "react";
import { Palette, Plus, Save, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/lib/auth";

type Participante = { id: string; nombre: string; ciudad: string | null; sede_id: string | null };
type Identidad = {
  id: string; sede_id: string | null; participante_id: string | null; nombre_comercial: string; razon_social: string | null; ruc: string | null;
  logo_url: string | null; email: string | null; telefono: string | null; whatsapp: string | null;
  direccion: string | null; ciudad: string | null; sitio_web: string | null; color_principal: string | null;
  pie_documento: string | null; pais_codigo: string; pais_nombre: string; moneda_codigo: string; moneda_simbolo: string;
  impuesto_activo: boolean; impuesto_nombre: string; impuesto_tasa: number; impuesto_incluido: boolean;
  identificador_fiscal_label: string; zona_horaria: string; rnp_bienes: string | null; rpp_servicios: string | null; metadata: Record<string, any> | null;
};

type CuentaBancaria = { banco: string; tipo: string; moneda: string; cuenta: string; cci: string; titular: string; activa: boolean };

type ConfigCotizacion = { introduccion: string; terminos: string[]; atendido_por: string; responsable_cargo: string; firma_nombre: string; firma_cargo: string; mostrar_bancos: boolean; cuentas_bancarias: CuentaBancaria[] };

const DEFAULT_COTIZACION: ConfigCotizacion = { introduccion: "Es grato dirigirnos a usted, con la finalidad de remitir la siguiente cotización.", terminos: ["Precios y condiciones sujetos a la vigencia indicada en la cotización.", "La fecha de entrega será coordinada según disponibilidad y alcance del servicio.", "La forma de pago y cualquier condición especial se detallan en la propuesta comercial."], atendido_por: "", responsable_cargo: "", firma_nombre: "", firma_cargo: "", mostrar_bancos: true, cuentas_bancarias: [] };

function obtenerConfigCotizacion(metadata: Record<string, any> | null | undefined): ConfigCotizacion {
  const raw = metadata?.cotizacion;
  return {
    ...DEFAULT_COTIZACION,
    ...(raw && typeof raw === "object" ? raw : {}),
    terminos: Array.isArray(raw?.terminos) ? raw.terminos : DEFAULT_COTIZACION.terminos,
    cuentas_bancarias: Array.isArray(raw?.cuentas_bancarias) ? raw.cuentas_bancarias : [],
  };
}


const PRESETS: Record<string, Partial<Identidad>> = {
  PE: { pais_codigo: "PE", pais_nombre: "Perú", moneda_codigo: "PEN", moneda_simbolo: "S/", impuesto_activo: true, impuesto_nombre: "IGV", impuesto_tasa: 18, impuesto_incluido: false, identificador_fiscal_label: "RUC", zona_horaria: "America/Lima" },
  CO: { pais_codigo: "CO", pais_nombre: "Colombia", moneda_codigo: "COP", moneda_simbolo: "$", impuesto_activo: true, impuesto_nombre: "IVA", impuesto_tasa: 19, impuesto_incluido: false, identificador_fiscal_label: "NIT", zona_horaria: "America/Bogota" },
};

const CAMPOS = [
  "id","sede_id","participante_id","nombre_comercial","razon_social","ruc","rnp_bienes","rpp_servicios","logo_url","email","telefono","whatsapp","direccion","ciudad",
  "sitio_web","color_principal","pie_documento","pais_codigo","pais_nombre","moneda_codigo","moneda_simbolo",
  "impuesto_activo","impuesto_nombre","impuesto_tasa","impuesto_incluido","identificador_fiscal_label","zona_horaria","metadata",
].join(",");

function nuevo(participante: Participante): Omit<Identidad, "id"> {
  return {
    sede_id: participante.sede_id, participante_id: participante.id, nombre_comercial: participante.nombre, razon_social: "", ruc: "", rnp_bienes: "", rpp_servicios: "", logo_url: "", email: "",
    telefono: "", whatsapp: "", direccion: "", ciudad: "", sitio_web: "", color_principal: "#B58A3A", pie_documento: "",
    pais_codigo: "PE", pais_nombre: "Perú", moneda_codigo: "PEN", moneda_simbolo: "S/", impuesto_activo: true,
    impuesto_nombre: "IGV", impuesto_tasa: 18, impuesto_incluido: false, identificador_fiscal_label: "RUC", zona_horaria: "America/Lima", metadata: { cotizacion: DEFAULT_COTIZACION },
  };
}

export function ConfiguracionIdentidadComercial() {
  const { data: sesion } = useSesion();
  const puedeEditar = Boolean(sesion?.esDueno || sesion?.roles.includes("gerente"));
  const [identidades, setIdentidades] = useState<Identidad[]>([]);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [identidadId, setIdentidadId] = useState("");
  const [participanteNuevo, setParticipanteNuevo] = useState("");
  const [form, setForm] = useState<Identidad | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [creando, setCreando] = useState(false);

  async function cargar() {
    if (!puedeEditar) return;
    setCargando(true);
    let participantesDisponibles: Participante[] = [];

    if (sesion?.esDueno) {
      const { data, error } = await supabase
        .from("ecosistema_participantes")
        .select("id,nombre,ciudad,sede_id")
        .eq("estado", "activo")
        .order("nombre");
      if (error) { toast.error(error.message); setCargando(false); return; }
      participantesDisponibles = (data ?? []) as Participante[];
    } else if (sesion?.participante?.id) {
      const { data, error } = await supabase
        .from("ecosistema_participantes")
        .select("id,nombre,ciudad,sede_id")
        .eq("id", sesion.participante.id)
        .eq("estado", "activo")
        .maybeSingle();
      if (error) { toast.error(error.message); setCargando(false); return; }
      if (data) participantesDisponibles = [data as Participante];
    }

    setParticipantes(participantesDisponibles);

    const participanteObjetivo = sesion?.esDueno
      ? participanteNuevo
      : sesion?.participante?.id ?? "";

    if (!participanteNuevo && participanteObjetivo) {
      setParticipanteNuevo(participanteObjetivo);
    }

    let identidadQuery = supabase
      .from("identidades_comerciales")
      .select(CAMPOS)
      .eq("activa", true);

    if (!sesion?.esDueno) {
      identidadQuery = identidadQuery.eq("participante_id", sesion?.participante?.id ?? "");
    }

    const { data, error } = await identidadQuery.order("nombre_comercial");
    if (error) { toast.error(error.message); setCargando(false); return; }

    const propias = (data ?? []) as unknown as Identidad[];
    setIdentidades(propias);

    if (identidadId && !propias.some((x) => x.id === identidadId)) {
      setIdentidadId("");
    }
    if (!identidadId && propias[0]) setIdentidadId(propias[0].id);

    setCargando(false);
  }

  useEffect(() => { void cargar(); }, [puedeEditar, sesion?.esDueno, sesion?.participante?.id, sesion?.participantes]);

  useEffect(() => {
    const actual = identidades.find((x) => x.id === identidadId);
    setForm(actual ? { ...actual } : null);
  }, [identidadId, identidades]);

  function campo<K extends keyof Identidad>(key: K, value: Identidad[K]) {
    setForm((x) => x ? { ...x, [key]: value } : x);
  }

  function aplicarPais(pais: string) {
    const preset = PRESETS[pais];
    setForm((x) => x ? { ...x, ...(preset ?? {}), pais_codigo: pais, pais_nombre: pais === "PE" ? "Perú" : pais === "CO" ? "Colombia" : x.pais_nombre } : x);
  }

  async function subirLogo(file: File) {
    if (!form?.participante_id) return toast.error("No se pudo resolver el taller propietario.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error("El logo debe ser JPG, PNG o WebP.");
    if (file.size > 5 * 1024 * 1024) return toast.error("El logo no puede superar 5 MB.");

    setGuardando(true);
    let archivo = file;
    let extension = file.type === "image/png" ? "png" : "jpg";
    let contentType = file.type === "image/webp" ? "image/png" : file.type;

    if (file.type === "image/webp") {
      try {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("No se pudo preparar el logo.");
        context.drawImage(bitmap, 0, 0);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        bitmap.close();
        if (!blob) throw new Error("No se pudo convertir el logo WebP.");
        archivo = new File([blob], file.name.replace(/\.webp$/i, ".png"), { type: "image/png" });
        extension = "png";
        contentType = "image/png";
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo convertir el logo WebP.");
        setGuardando(false);
        return;
      }
    }

    const path = form.participante_id + "/" + form.id + "/logo." + extension;
    const { error: uploadError } = await supabase.storage.from("identidades-comerciales").upload(path, archivo, {
      upsert: true, contentType, cacheControl: "3600"
    });
    if (uploadError) {
      toast.error(`Falló la subida del archivo al almacenamiento: ${uploadError.message}`);
      setGuardando(false);
      return;
    }

    const { data: publicData } = supabase.storage.from("identidades-comerciales").getPublicUrl(path);
    const publicUrl = publicData.publicUrl;
    const { error: updateError } = await supabase.from("identidades_comerciales").update({ logo_url: publicUrl }).eq("id", form.id);
    if (updateError) {
      await supabase.storage.from("identidades-comerciales").remove([path]);
      toast.error(`La imagen se subió, pero no se pudo guardar su URL en la identidad: ${updateError.message}`);
      setGuardando(false);
      return;
    }

    if (form.logo_url && form.logo_url !== publicUrl) {
      try {
        const marker = "/storage/v1/object/public/identidades-comerciales/";
        const index = form.logo_url.indexOf(marker);
        if (index >= 0) {
          const oldPath = decodeURIComponent(form.logo_url.slice(index + marker.length));
          if (oldPath && oldPath !== path) await supabase.storage.from("identidades-comerciales").remove([oldPath]);
        }
      } catch {}
    }

    setForm((x) => x ? { ...x, logo_url: publicUrl } : x);
    toast.success("Logo almacenado en Aurum.");
    setGuardando(false);
  }

  async function quitarLogo() {
    if (!form) return;
    setGuardando(true);
    if (form.logo_url) {
      try {
        const marker = "/storage/v1/object/public/identidades-comerciales/";
        const index = form.logo_url.indexOf(marker);
        if (index >= 0) {
          const oldPath = decodeURIComponent(form.logo_url.slice(index + marker.length));
          if (oldPath) await supabase.storage.from("identidades-comerciales").remove([oldPath]);
        }
      } catch {}
    }
    const { error } = await supabase.from("identidades_comerciales").update({ logo_url: null }).eq("id", form.id);
    if (error) toast.error(error.message);
    else {
      setForm((x) => x ? { ...x, logo_url: null } : x);
      toast.success("Logo eliminado.");
    }
    setGuardando(false);
  }

  async function crearIdentidad() {
    const participanteObjetivo = participantes.find((p) => p.id === participanteNuevo);
    if (!participanteObjetivo) return toast.error("No se pudo resolver el taller propietario.");
    if (!sesion?.esDueno && participanteObjetivo.id !== sesion?.participante?.id) {
      return toast.error("No puedes crear una identidad para otro taller.");
    }

    setCreando(true);

    const { data, error } = await supabase
      .from("identidades_comerciales")
      .insert(nuevo(participanteObjetivo))
      .select(CAMPOS)
      .single();
    if (error) toast.error(error.message);
    else {
      toast.success("Identidad comercial creada.");
      const creada = data as unknown as Identidad;
      setIdentidadId(creada.id);
      await cargar();
    }
    setCreando(false);
  }

  async function guardar() {
    if (!form) return;
    if (!form.nombre_comercial.trim()) return toast.error("El nombre comercial es obligatorio.");
    if (!form.participante_id) return toast.error("No se pudo resolver automáticamente el taller propietario de esta identidad.");
    const tasa = Number(form.impuesto_tasa);
    if (!Number.isFinite(tasa) || tasa < 0 || tasa > 100) return toast.error("La tasa de impuesto debe estar entre 0 y 100.");
    if (!/^[A-Z]{3}$/.test(form.moneda_codigo.trim().toUpperCase())) return toast.error("La moneda debe usar un código de 3 letras.");
    setGuardando(true);
    const payload = {
      participante_id: form.participante_id || null,
      nombre_comercial: form.nombre_comercial.trim(), razon_social: form.razon_social?.trim() || null, ruc: form.ruc?.trim() || null,
      rnp_bienes: form.rnp_bienes?.trim() || null, rpp_servicios: form.rpp_servicios?.trim() || null,
      logo_url: form.logo_url?.trim() || null, email: form.email?.trim() || null, telefono: form.telefono?.trim() || null,
      whatsapp: form.whatsapp?.trim() || null, direccion: form.direccion?.trim() || null, ciudad: form.ciudad?.trim() || null,
      sitio_web: form.sitio_web?.trim() || null, color_principal: form.color_principal?.trim() || null, pie_documento: form.pie_documento?.trim() || null,
      pais_codigo: form.pais_codigo.trim().toUpperCase(), pais_nombre: form.pais_nombre.trim(), moneda_codigo: form.moneda_codigo.trim().toUpperCase(),
      moneda_simbolo: form.moneda_simbolo.trim(), impuesto_activo: Boolean(form.impuesto_activo), impuesto_nombre: form.impuesto_nombre.trim(),
      impuesto_tasa: tasa, impuesto_incluido: Boolean(form.impuesto_incluido), identificador_fiscal_label: form.identificador_fiscal_label.trim(),
      zona_horaria: form.zona_horaria.trim(),
      metadata: { ...(form.metadata ?? {}), cotizacion: obtenerConfigCotizacion(form.metadata) },
    };
    const { error } = await supabase.from("identidades_comerciales").update(payload).eq("id", form.id);
    if (error) toast.error(error.message);
    else { toast.success("Configuración del taller guardada."); await cargar(); }
    setGuardando(false);
  }

  if (!puedeEditar) return null;
  if (cargando && !form) return <Panel titulo="Identidad del taller"><div className="p-6 text-sm text-muted-foreground">Cargando configuración…</div></Panel>;

  return (
    <div className="space-y-6">
      {!form ? (
        <Panel titulo="Identidad del taller">
          <div className="space-y-4 p-6">
            <p className="text-sm font-semibold">No existe una identidad comercial activa para esta sede.</p>
            <p className="text-xs text-muted-foreground">La identidad es la fuente de verdad para cotizaciones y contratos. No creamos una tabla paralela.</p>
            <div className="flex flex-wrap gap-3">
              {sesion?.esDueno ? (
                <select value={participanteNuevo} onChange={e=>setParticipanteNuevo(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
                  <option value="">Seleccionar taller</option>
                  {participantes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Se creará para <span className="font-semibold text-foreground">{participantes[0]?.nombre ?? "tu taller"}</span>.
                </p>
              )}
              <button type="button" onClick={()=>void crearIdentidad()} disabled={creando || !participanteNuevo} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
                <Plus className="size-4" />{creando ? "Creando…" : "Crear identidad"}
              </button>
            </div>
          </div>
        </Panel>
      ) : (
        <Panel
          titulo="Identidad del taller / joyería"
          accion={<button type="button" onClick={() => void guardar()} disabled={guardando} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"><Save className="size-4" />{guardando ? "Guardando…" : "Guardar cambios"}</button>}
        >
          <div className="space-y-6 p-5">
            {identidades.length > 1 ? <label className="block text-xs font-semibold text-muted-foreground">Identidad activa<select className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal" value={identidadId} onChange={e=>setIdentidadId(e.target.value)}>{identidades.map(x=><option key={x.id} value={x.id}>{x.nombre_comercial} · {participantes.find(p=>p.id===x.participante_id)?.nombre ?? "sin taller asignado"}</option>)}</select></label> : null}
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="text-xs font-semibold text-muted-foreground">Nombre comercial<input className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal" value={form.nombre_comercial} onChange={e=>campo("nombre_comercial",e.target.value)} /></label>
              <label className="text-xs font-semibold text-muted-foreground">Razón social<input className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal" value={form.razon_social ?? ""} onChange={e=>campo("razon_social",e.target.value)} /></label>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="text-xs font-semibold text-muted-foreground">RNP Bienes<input className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" value={form.rnp_bienes ?? ""} onChange={e=>campo("rnp_bienes",e.target.value)} placeholder="Opcional" /></label>
              <label className="text-xs font-semibold text-muted-foreground">RPP Servicios<input className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" value={form.rpp_servicios ?? ""} onChange={e=>campo("rpp_servicios",e.target.value)} placeholder="Opcional" /></label>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="text-xs font-semibold text-muted-foreground">{form.identificador_fiscal_label || "RUC / NIT"}<input className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" value={form.ruc ?? ""} onChange={e=>campo("ruc",e.target.value)} /></label>
              <label className="text-xs font-semibold text-muted-foreground">País<select className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal" value={form.pais_codigo} onChange={e=>aplicarPais(e.target.value)}><option value="PE">Perú</option><option value="CO">Colombia</option><option value="OTHER">Otro</option></select></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-semibold text-muted-foreground">Moneda<input maxLength={3} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal uppercase" value={form.moneda_codigo} onChange={e=>campo("moneda_codigo",e.target.value.toUpperCase())} /></label>
              <label className="text-xs font-semibold text-muted-foreground">Símbolo<input className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" value={form.moneda_simbolo} onChange={e=>campo("moneda_simbolo",e.target.value)} /></label>
              <label className="text-xs font-semibold text-muted-foreground">Impuesto<input className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" value={form.impuesto_nombre} onChange={e=>campo("impuesto_nombre",e.target.value)} /></label>
              <label className="text-xs font-semibold text-muted-foreground">Tasa (%)<input type="number" min={0} max={100} step="0.01" className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" value={form.impuesto_tasa} onChange={e=>campo("impuesto_tasa",Number(e.target.value))} /></label>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs"><input type="checkbox" checked={form.impuesto_activo} onChange={e=>campo("impuesto_activo",e.target.checked)} /> Aplicar impuesto por defecto en cotizaciones</label>
              <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs"><input type="checkbox" checked={form.impuesto_incluido} onChange={e=>campo("impuesto_incluido",e.target.checked)} /> Precio ingresado ya incluye impuesto</label>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="text-xs font-semibold text-muted-foreground">Dirección<input className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" value={form.direccion ?? ""} onChange={e=>campo("direccion",e.target.value)} /></label>
              <label className="text-xs font-semibold text-muted-foreground">Ciudad<input className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" value={form.ciudad ?? ""} onChange={e=>campo("ciudad",e.target.value)} /></label>
              <label className="text-xs font-semibold text-muted-foreground">Email<input type="email" className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" value={form.email ?? ""} onChange={e=>campo("email",e.target.value)} /></label>
              <label className="text-xs font-semibold text-muted-foreground">Teléfono<input className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" value={form.telefono ?? ""} onChange={e=>campo("telefono",e.target.value)} /></label>
              <label className="text-xs font-semibold text-muted-foreground">WhatsApp<input className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" value={form.whatsapp ?? ""} onChange={e=>campo("whatsapp",e.target.value)} /></label>
              <label className="text-xs font-semibold text-muted-foreground">Sitio web<input type="url" className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" value={form.sitio_web ?? ""} onChange={e=>campo("sitio_web",e.target.value)} /></label>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Logo del taller</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">Se almacena en el espacio propio de Aurum. JPG, PNG o WebP · máximo 5 MB.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted/50">
                    <Upload className="size-4" /> Cambiar logo
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>{ const file=e.target.files?.[0]; if(file) void subirLogo(file); e.currentTarget.value=""; }} />
                  </label>
                </div>
                <div className="mt-4 flex min-h-20 items-center justify-center rounded-lg bg-muted/30 p-3">
                  {form.logo_url ? <img src={form.logo_url} alt="Logo del taller" className="max-h-20 max-w-full object-contain" /> : <div className="text-xs text-muted-foreground"><Palette className="mr-2 inline size-4" />Sin logo configurado</div>}
                </div>
                {form.logo_url ? <button type="button" onClick={()=>void quitarLogo()} className="mt-3 inline-flex items-center gap-2 text-xs text-destructive"><Trash2 className="size-3.5" />Eliminar logo</button> : null}
              </div>
              <div className="rounded-xl border border-border p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Apariencia</p><div className="mt-2 flex items-center gap-3"><input type="color" value={form.color_principal || "#B58A3A"} onChange={e=>campo("color_principal",e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-border bg-background" /><span className="font-mono text-xs">{form.color_principal || "#B58A3A"}</span></div></div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="text-xs font-semibold text-muted-foreground">Zona horaria<input className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" value={form.zona_horaria} onChange={e=>campo("zona_horaria",e.target.value)} /></label>
              <label className="text-xs font-semibold text-muted-foreground">Pie de documento<textarea className="mt-1 min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" value={form.pie_documento ?? ""} onChange={e=>campo("pie_documento",e.target.value)} /></label>
            </div>
            <CotizacionConfigEditor form={form} campo={campo} />
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs leading-5 text-muted-foreground"><b>Regla documental:</b> estos datos son predeterminados para nuevos documentos. Las cotizaciones y contratos guardan su propia identidad histórica.</div>
          </div>
        </Panel>
      )}
    </div>
  );
}


function CotizacionConfigEditor({ form, campo }: { form: Identidad; campo: <K extends keyof Identidad>(key: K, value: Identidad[K]) => void }) {
  const config = obtenerConfigCotizacion(form.metadata);
  const actualizar = (cambios: Partial<ConfigCotizacion>) => campo("metadata", { ...(form.metadata ?? {}), cotizacion: { ...config, ...cambios } });
  const actualizarTermino = (index: number, value: string) => actualizar({ terminos: config.terminos.map((x, i) => i === index ? value : x) });
  const actualizarCuenta = (index: number, cambios: Partial<CuentaBancaria>) => actualizar({ cuentas_bancarias: config.cuentas_bancarias.map((x, i) => i === index ? { ...x, ...cambios } : x) });
  return <Panel titulo="Configuración de cotizaciones">
    <div className="space-y-5 p-5">
      <p className="text-xs text-muted-foreground">Estos datos se congelarán en nuevas cotizaciones y alimentarán su PDF. Las cotizaciones antiguas no se modifican al cambiar esta configuración.</p>
      <label className="block text-xs font-semibold text-muted-foreground">Introducción comercial<textarea className="mt-1 min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" value={config.introduccion} onChange={e=>actualizar({introduccion:e.target.value})}/></label>
      <div>
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold">Términos y condiciones</p><p className="text-[11px] text-muted-foreground">Se muestran como lista numerada al final del PDF.</p></div><button type="button" onClick={()=>actualizar({terminos:[...config.terminos,"Nueva condición comercial."]})} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">+ Agregar</button></div>
        <div className="mt-3 space-y-2">{config.terminos.map((termino,index)=><div key={index} className="flex gap-2"><span className="pt-3 text-xs font-semibold text-muted-foreground">{index+1}.</span><textarea value={termino} onChange={e=>actualizarTermino(index,e.target.value)} rows={2} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"/><button type="button" onClick={()=>actualizar({terminos:config.terminos.filter((_,i)=>i!==index)})} className="pt-2 text-xs text-destructive">Quitar</button></div>)}</div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-muted-foreground">Atendido por<input className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal" value={config.atendido_por} onChange={e=>actualizar({atendido_por:e.target.value})} placeholder="Ej. Miguel Delgado" /></label><label className="text-xs font-semibold text-muted-foreground">Cargo del responsable<input className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal" value={config.responsable_cargo} onChange={e=>actualizar({responsable_cargo:e.target.value})} placeholder="Ej. Área Comercial" /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-muted-foreground">Nombre de firma<input className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal" value={config.firma_nombre} onChange={e=>actualizar({firma_nombre:e.target.value})} placeholder="Ej. Miguel A." /></label><label className="text-xs font-semibold text-muted-foreground">Cargo<input className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal" value={config.firma_cargo} onChange={e=>actualizar({firma_cargo:e.target.value})} placeholder="Ej. Gerente General" /></label></div>
      <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-3 text-xs"><input type="checkbox" checked={config.mostrar_bancos} onChange={e=>actualizar({mostrar_bancos:e.target.checked})}/> Mostrar cuentas bancarias en el PDF</label>
      <div>
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold">Cuentas bancarias</p><p className="text-[11px] text-muted-foreground">Puedes registrar varias cuentas y elegir moneda.</p></div><button type="button" onClick={()=>actualizar({cuentas_bancarias:[...config.cuentas_bancarias,{banco:"",tipo:"Cuenta Corriente",moneda:form.moneda_codigo,cuenta:"",cci:"",titular:form.razon_social || form.nombre_comercial,activa:true}]})} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">+ Cuenta</button></div>
        <div className="mt-3 space-y-3">{config.cuentas_bancarias.map((cuenta,index)=><div key={index} className="rounded-xl border border-border p-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><CampoMini label="Banco" value={cuenta.banco} onChange={v=>actualizarCuenta(index,{banco:v})}/><CampoMini label="Tipo" value={cuenta.tipo} onChange={v=>actualizarCuenta(index,{tipo:v})}/><CampoMini label="Moneda" value={cuenta.moneda} onChange={v=>actualizarCuenta(index,{moneda:v})}/><CampoMini label="N° cuenta" value={cuenta.cuenta} onChange={v=>actualizarCuenta(index,{cuenta:v})}/><CampoMini label="CCI" value={cuenta.cci} onChange={v=>actualizarCuenta(index,{cci:v})}/><CampoMini label="Titular" value={cuenta.titular} onChange={v=>actualizarCuenta(index,{titular:v})}/></div><div className="mt-3 flex justify-end"><button type="button" onClick={()=>actualizar({cuentas_bancarias:config.cuentas_bancarias.filter((_,i)=>i!==index)})} className="text-xs text-destructive">Quitar cuenta</button></div></div>)}</div>
      </div>
    </div>
  </Panel>;
}

function CampoMini({ label, value, onChange }: { label:string; value:string; onChange:(value:string)=>void }) { return <label className="text-[11px] font-semibold text-muted-foreground">{label}<input className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal" value={value} onChange={e=>onChange(e.target.value)}/></label>; }
