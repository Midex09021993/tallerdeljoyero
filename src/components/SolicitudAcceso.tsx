import { useState, type FormEvent } from "react";
import { Building2, BriefcaseBusiness, Package, ShoppingBag, Wrench, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Tipo = "taller" | "profesional" | "vendedor" | "proveedor" | "servicio";

const opciones: Array<{ value: Tipo; label: string; descripcion: string; icon: typeof Building2 }> = [
  { value: "taller", label: "Taller / Joyería", descripcion: "Empresa o taller de joyería que quiere participar.", icon: Building2 },
  { value: "profesional", label: "Profesional independiente", descripcion: "Diseñador 3D, modelador u otro especialista.", icon: BriefcaseBusiness },
  { value: "vendedor", label: "Vendedor / Comercializador", descripcion: "Tienda, vendedor o representante comercial de joyería.", icon: ShoppingBag },
  { value: "proveedor", label: "Proveedor del sector joyero", descripcion: "Materiales, piedras, insumos, herramientas o productos.", icon: Package },
  { value: "servicio", label: "Servicio especializado", descripcion: "Casting, engaste, grabado, pulido, láser y otros procesos.", icon: Wrench },
];

export function SolicitudAcceso() {
  const [abierto, setAbierto] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [tipo, setTipo] = useState<Tipo>("taller");
  const [form, setForm] = useState({
    nombre: "",
    empresa: "",
    email: "",
    telefono: "",
    ciudad: "",
    especialidades: "",
    descripcion: "",
  });

  function cerrar() {
    if (cargando) return;
    setAbierto(false);
    setEnviada(false);
    setError("");
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const especialidades = form.especialidades
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      const { error: err } = await supabase.from("solicitudes_acceso").insert({
        tipo_solicitante: tipo,
        nombre: form.nombre.trim(),
        empresa: form.empresa.trim() || null,
        email: form.email.trim().toLowerCase(),
        telefono: form.telefono.trim() || null,
        ciudad: form.ciudad.trim() || null,
        especialidades,
        descripcion: form.descripcion.trim() || null,
      });

      if (err) throw err;
      setEnviada(true);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "No se pudo enviar la solicitud.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setAbierto(true); setEnviada(false); }}
        className="inline-flex items-center gap-2 rounded-lg border border-gold/50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gold transition hover:bg-gold/10"
      >
        Solicitar acceso de prueba
      </button>

      {abierto ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gold/25 bg-[#111315] p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-gold">Aurum Lab · Ecosistema</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Solicitar acceso de prueba</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/55">
                  Regístrate como taller, profesional, vendedor, proveedor o servicio especializado. La participación se activa después de la validación por el equipo de Aurum Lab.
                </p>
              </div>
              <button type="button" onClick={cerrar} className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white" aria-label="Cerrar">
                <X className="size-5" />
              </button>
            </div>

            {enviada ? (
              <div className="mt-8 rounded-xl border border-gold/25 bg-gold/5 p-6 text-center">
                <p className="text-lg font-semibold text-gold">Solicitud recibida</p>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  Hemos registrado tus datos. La solicitud quedará pendiente de validación por el equipo de Aurum Lab.
                </p>
                <button type="button" onClick={cerrar} className="mt-6 rounded-lg bg-gold px-5 py-3 text-xs font-semibold uppercase tracking-wider text-ink">
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={enviar} className="mt-7 space-y-5">
                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-wider text-white/45">Tipo de participante</label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {opciones.map((op) => {
                      const Icon = op.icon;
                      const activo = tipo === op.value;
                      return (
                        <button
                          key={op.value}
                          type="button"
                          onClick={() => setTipo(op.value)}
                          className={`rounded-xl border p-4 text-left transition ${activo ? "border-gold/60 bg-gold/10" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}
                        >
                          <Icon className={`size-5 ${activo ? "text-gold" : "text-white/50"}`} />
                          <p className="mt-3 text-sm font-semibold text-white">{op.label}</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-white/45">{op.descripcion}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["nombre", "Nombre de contacto", true],
                    ["empresa", tipo === "taller" ? "Nombre del taller / empresa" : "Empresa (opcional)", false],
                    ["email", "Correo electrónico", true],
                    ["telefono", "Teléfono / WhatsApp", false],
                    ["ciudad", "Ciudad", false],
                    ["especialidades", "Especialidades (separadas por comas)", false],
                  ].map(([key, label, required]) => (
                    <label key={key as string} className="block text-[10px] uppercase tracking-wider text-white/45">
                      {label as string}
                      <input
                        required={Boolean(required)}
                        type={key === "email" ? "email" : "text"}
                        value={form[key as keyof typeof form]}
                        onChange={(e) => setForm((v) => ({ ...v, [key as keyof typeof form]: e.target.value }))}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-3 text-sm text-white outline-none focus:border-gold"
                      />
                    </label>
                  ))}
                </div>

                <label className="block text-[10px] uppercase tracking-wider text-white/45">
                  Cuéntanos brevemente qué haces
                  <textarea
                    rows={3}
                    value={form.descripcion}
                    onChange={(e) => setForm((v) => ({ ...v, descripcion: e.target.value }))}
                    className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/25 px-3 py-3 text-sm text-white outline-none focus:border-gold"
                  />
                </label>

                {error ? <p className="text-xs text-danger">{error}</p> : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button type="button" onClick={cerrar} className="rounded-lg border border-white/10 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white/60 hover:bg-white/5">
                    Cancelar
                  </button>
                  <button type="submit" disabled={cargando} className="rounded-lg bg-gold px-5 py-3 text-xs font-semibold uppercase tracking-wider text-ink disabled:opacity-50">
                    {cargando ? "Enviando..." : "Enviar solicitud"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
