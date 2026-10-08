import { useEffect, useState } from "react";
import { Building2, Calculator, Gem, Save, UsersRound, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ComunidadConfig = {
  calculos_realizados: number;
  talleres_registrados: number;
  herramientas_disponibles: number;
  usuarios_registrados: number;
  disenos_visualizados: number;
  renderizados_realizados: number;
  pedidos_gestionados: number;
  contratos_registrados: number;
};

const valoresIniciales: ComunidadConfig = {
  calculos_realizados: 150,
  talleres_registrados: 20,
  herramientas_disponibles: 5,
  usuarios_registrados: 0,
  disenos_visualizados: 0,
  renderizados_realizados: 0,
  pedidos_gestionados: 0,
  contratos_registrados: 0,
};

const pilares = [
  { icon: Calculator, label: "Herramientas gratuitas", texto: "Utilidades técnicas para resolver necesidades concretas del trabajo joyero." },
  { icon: Building2, label: "Talleres y profesionales", texto: "Un entorno pensado para distintas formas de trabajar, desde independientes hasta equipos y organizaciones." },
  { icon: Wrench, label: "Operación conectada", texto: "Comercial, producción, visualización y herramientas especializadas dentro del mismo ecosistema." },
] as const;

export function ComunidadAurumLab({ configuracion = false }: { configuracion?: boolean }) {
  const [datos, setDatos] = useState<ComunidadConfig>(valoresIniciales);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let activo = true;
    void (supabase as any)
      .from("configuracion_web")
      .select("calculos_realizados,talleres_registrados,herramientas_disponibles,usuarios_registrados,disenos_visualizados,renderizados_realizados,pedidos_gestionados,contratos_registrados")
      .eq("clave", "comunidad_aurum_lab")
      .maybeSingle()
      .then(({ data }: { data: unknown }) => {
        if (activo && data) setDatos(data as ComunidadConfig);
        if (activo) setCargando(false);
      });
    return () => { activo = false; };
  }, []);

  async function guardar() {
    setGuardando(true);
    const { error } = await (supabase as any)
      .from("configuracion_web")
      .update({
        calculos_realizados: datos.calculos_realizados,
        talleres_registrados: datos.talleres_registrados,
        herramientas_disponibles: datos.herramientas_disponibles,
      })
      .eq("clave", "comunidad_aurum_lab");
    setGuardando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Comunidad Aurum Lab actualizada.");
  }

  return configuracion ? (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Configuración Web</p>
        <h2 className="mt-1 text-xl font-semibold">Comunidad Aurum Lab</h2>
        <p className="mt-1 text-sm text-muted-foreground">Indicadores públicos mostrados en la pantalla de acceso.</p>
      </div>
      <PanelConfig label="Cálculos realizados" value={datos.calculos_realizados} onChange={(v) => setDatos({ ...datos, calculos_realizados: v })} />
      <PanelConfig label="Talleres registrados" value={datos.talleres_registrados} onChange={(v) => setDatos({ ...datos, talleres_registrados: v })} />
      <PanelConfig label="Herramientas disponibles" value={datos.herramientas_disponibles} onChange={(v) => setDatos({ ...datos, herramientas_disponibles: v })} />
      <button type="button" onClick={() => void guardar()} disabled={guardando || cargando} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
        <Save className="size-4" /> {guardando ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  ) : (
    <section className="relative mt-6 overflow-hidden rounded-2xl border border-gold/25 bg-[#0d0f10]/80 p-5 shadow-2xl backdrop-blur-md sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 size-52 rounded-full bg-gold/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-gold/30 bg-gold/10 p-2.5">
            <Gem className="size-6 text-gold" />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-gold">Aurum Lab</p>
            <h2 className="mt-1 font-display text-2xl italic text-white sm:text-3xl">Comunidad Aurum Lab</h2>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-white/55 sm:text-sm">
              Una plataforma creada para joyeros, modeladores 3D, fundidores y talleres que buscan mejorar sus procesos mediante herramientas digitales especializadas.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {pilares.map(({ icon: Icon, label, texto }) => (
            <article key={label} className="rounded-xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-gold/35 hover:bg-white/[0.045]">
              <Icon className="size-5 text-gold" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-white/50">{label}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-white/45">{texto}</p>
            </article>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[9px] uppercase tracking-wider text-white/40">
            <UsersRound className="size-3.5" /> Ecosistema especializado
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/15 px-3 py-1.5 text-[9px] uppercase tracking-wider text-gold/70">
            Datos públicos verificados en preparación
          </span>
        </div>
      </div>
    </section>
  );
}

function PanelConfig({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block max-w-xl">
      <span className="mb-1.5 block text-xs font-semibold">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
