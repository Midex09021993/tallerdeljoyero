import { useEffect, useState } from "react";
import { Palette, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/lib/auth";

type Sede = { id: string; nombre: string };
type Identidad = {
  id: string; sede_id: string | null; nombre_comercial: string; razon_social: string | null; ruc: string | null;
  logo_url: string | null; email: string | null; telefono: string | null; whatsapp: string | null;
  direccion: string | null; ciudad: string | null; sitio_web: string | null; color_principal: string | null;
  pie_documento: string | null; pais_codigo: string; pais_nombre: string; moneda_codigo: string; moneda_simbolo: string;
  impuesto_activo: boolean; impuesto_nombre: string; impuesto_tasa: number; impuesto_incluido: boolean;
  identificador_fiscal_label: string; zona_horaria: string;
};

const PRESETS: Record<string, Partial<Identidad>> = {
  PE: { pais_codigo: "PE", pais_nombre: "Perú", moneda_codigo: "PEN", moneda_simbolo: "S/", impuesto_activo: true, impuesto_nombre: "IGV", impuesto_tasa: 18, impuesto_incluido: false, identificador_fiscal_label: "RUC", zona_horaria: "America/Lima" },
  CO: { pais_codigo: "CO", pais_nombre: "Colombia", moneda_codigo: "COP", moneda_simbolo: "$", impuesto_activo: true, impuesto_nombre: "IVA", impuesto_tasa: 19, impuesto_incluido: false, identificador_fiscal_label: "NIT", zona_horaria: "America/Bogota" },
};

const CAMPOS = [
  "id","sede_id","nombre_comercial","razon_social","ruc","logo_url","email","telefono","whatsapp","direccion","ciudad",
  "sitio_web","color_principal","pie_documento","pais_codigo","pais_nombre","moneda_codigo","moneda_simbolo",
  "impuesto_activo","impuesto_nombre","impuesto_tasa","impuesto_incluido","identificador_fiscal_label","zona_horaria",
].join(",");

function nuevo(sedeId: string): Omit<Identidad, "id"> {
  return {
    sede_id: sedeId, nombre_comercial: "Taller del Joyero", razon_social: "", ruc: "", logo_url: "", email: "",
    telefono: "", whatsapp: "", direccion: "", ciudad: "", sitio_web: "", color_principal: "#B58A3A", pie_documento: "",
    pais_codigo: "PE", pais_nombre: "Perú", moneda_codigo: "PEN", moneda_simbolo: "S/", impuesto_activo: true,
    impuesto_nombre: "IGV", impuesto_tasa: 18, impuesto_incluido: false, identificador_fiscal_label: "RUC", zona_horaria: "America/Lima",
  };
}

export function ConfiguracionIdentidadComercial() {
  const { data: sesion } = useSesion();
  const puedeEditar = Boolean(sesion?.esDueno || sesion?.roles.includes("gerente"));
  const [identidades, setIdentidades] = useState<Identidad[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [identidadId, setIdentidadId] = useState("");
  const [sedeNueva, setSedeNueva] = useState("");
  const [form, setForm] = useState<Identidad | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [creando, setCreando] = useState(false);

  async function cargar() {
    if (!puedeEditar) return;
    setCargando(true);
    const { data: sedesData } = await supabase.from("sedes").select("id,nombre").eq("activa", true).order("nombre");
    const sedesVisibles = sesion?.esDueno ? ((sedesData ?? []) as Sede[]) : ((sedesData ?? []) as Sede[]).filter((x) => x.id === sesion?.sede?.id);
    setSedes(sedesVisibles);
    if (!sedeNueva && sedesVisibles[0]) setSedeNueva(sedesVisibles[0].id);

    const { data, error } = await supabase.from("identidades_comerciales").select(CAMPOS).eq("activa", true).order("nombre_comercial");
    if (error) { toast.error(error.message); setCargando(false); return; }
    const filas = (data ?? []) as unknown as Identidad[];
    const propias = sesion?.esDueno ? filas : filas.filter((x) => x.sede_id === sesion?.sede?.id);
    setIdentidades(propias);
    if (!identidadId && propias[0]) setIdentidadId(propias[0].id);
    setCargando(false);
  }

  useEffect(() => { void cargar(); }, [puedeEditar, sesion?.esDueno, sesion?.sede?.id]);

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

  async function crearIdentidad() {
    if (!sedeNueva) return toast.error("Selecciona una sede.");
    setCreando(true);
    const { data, error } = await supabase.from("identidades_comerciales").insert(nuevo(sedeNueva)).select(CAMPOS).single();
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
    if (!form.sede_id) return toast.error("La identidad debe pertenecer a una sede.");
    const tasa = Number(form.impuesto_tasa);
    if (!Number.isFinite(tasa) || tasa < 0 || tasa > 100) return toast.error("La tasa de impuesto debe estar entre 0 y 100.");
    if (!/^[A-Z]{3}$/.test(form.moneda_codigo.trim().toUpperCase())) return toast.error("La moneda debe usar un código de 3 letras.");
    setGuardando(true);
    const payload = {
      nombre_comercial: form.nombre_comercial.trim(), razon_social: form.razon_social?.trim() || null, ruc: form.ruc?.trim() || null,
      logo_url: form.logo_url?.trim() || null, email: form.email?.trim() || null, telefono: form.telefono?.trim() || null,
      whatsapp: form.whatsapp?.trim() || null, direccion: form.direccion?.trim() || null, ciudad: form.ciudad?.trim() || null,
      sitio_web: form.sitio_web?.trim() || null, color_principal: form.color_principal?.trim() || null, pie_documento: form.pie_documento?.trim() || null,
      pais_codigo: form.pais_codigo.trim().toUpperCase(), pais_nombre: form.pais_nombre.trim(), moneda_codigo: form.moneda_codigo.trim().toUpperCase(),
      moneda_simbolo: form.moneda_simbolo.trim(), impuesto_activo: Boolean(form.impuesto_activo), impuesto_nombre: form.impuesto_nombre.trim(),
      impuesto_tasa: tasa, impuesto_incluido: Boolean(form.impuesto_incluido), identificador_fiscal_label: form.identificador_fiscal_label.trim(),
      zona_horaria: form.zona_horaria.trim(),
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
                <select value={sedeNueva} onChange={e=>setSedeNueva(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
                  <option value="">Seleccionar sede</option>
                  {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              ) : null}
              <button type="button" onClick={()=>void crearIdentidad()} disabled={creando || !sedeNueva} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
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
            {identidades.length > 1 ? <label className="block text-xs font-semibold text-muted-foreground">Identidad activa<select className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal" value={identidadId} onChange={e=>setIdentidadId(e.target.value)}>{identidades.map(x=><option key={x.id} value={x.id}>{x.nombre_comercial} · {sedes.find(s=>s.id===x.sede_id)?.nombre ?? "sede"}</option>)}</select></label> : null}
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="text-xs font-semibold text-muted-foreground">Nombre comercial<input className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal" value={form.nombre_comercial} onChange={e=>campo("nombre_comercial",e.target.value)} /></label>
              <label className="text-xs font-semibold text-muted-foreground">Razón social<input className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal" value={form.razon_social ?? ""} onChange={e=>campo("razon_social",e.target.value)} /></label>
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
              <label className="text-xs font-semibold text-muted-foreground">Logo (URL)<input type="url" className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" placeholder="https://..." value={form.logo_url ?? ""} onChange={e=>campo("logo_url",e.target.value)} /><span className="mt-1 block text-[10px] text-muted-foreground">Se mantiene el campo logo_url existente; no creamos un bucket paralelo sin auditar primero el almacenamiento.</span></label>
              <div className="rounded-xl border border-border p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Apariencia</p><div className="mt-2 flex items-center gap-3"><input type="color" value={form.color_principal || "#B58A3A"} onChange={e=>campo("color_principal",e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-border bg-background" /><span className="font-mono text-xs">{form.color_principal || "#B58A3A"}</span></div>{form.logo_url ? <img src={form.logo_url} alt="Logo del taller" className="mt-4 max-h-16 max-w-full object-contain" /> : <div className="mt-4 flex h-16 items-center justify-center text-xs text-muted-foreground"><Palette className="mr-2 size-4" />Sin logo configurado</div>}</div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="text-xs font-semibold text-muted-foreground">Zona horaria<input className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" value={form.zona_horaria} onChange={e=>campo("zona_horaria",e.target.value)} /></label>
              <label className="text-xs font-semibold text-muted-foreground">Pie de documento<textarea className="mt-1 min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" value={form.pie_documento ?? ""} onChange={e=>campo("pie_documento",e.target.value)} /></label>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs leading-5 text-muted-foreground"><b>Regla documental:</b> estos datos son predeterminados para nuevos documentos. Las cotizaciones y contratos guardan su propia identidad histórica.</div>
          </div>
        </Panel>
      )}
    </div>
  );
}
