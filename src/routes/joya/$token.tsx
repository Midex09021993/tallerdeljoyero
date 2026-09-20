import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Gem, MapPin, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/joya/$token")({
  component: JoyaPublicaPage,
});

type JoyaPublica = {
  id: string;
  codigo: string;
  nombre: string;
  taller: string;
  metal: string;
  ley: string;
  peso: number | null;
  talla: string;
  piedras: string;
  estado: string;
};

function JoyaPublicaPage() {
  const { token } = Route.useParams();
  const [joya, setJoya] = useState<JoyaPublica | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    void supabase.rpc("consultar_joya_publica", { _token: decodeURIComponent(token) })
      .then(({ data, error: consultaError }) => {
        if (!activo) return;
        if (consultaError) setError("No se pudo consultar la identificación de esta joya.");
        else setJoya(Array.isArray(data) ? (data[0] as JoyaPublica | undefined) ?? null : null);
        setCargando(false);
      });
    return () => { activo = false; };
  }, [token]);

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-lg">
        <div className="mb-5 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-gold/20 bg-gold/[.08] text-gold"><Gem className="size-6" /></div>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[.22em] text-gold/80">Taller del Joyero</p>
          <h1 className="mt-1 text-xl font-semibold">Identificación de joya</h1>
        </div>

        {cargando ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Consultando identificación…</div>
        ) : !joya || error ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="font-semibold">Joya no encontrada</p>
            <p className="mt-2 text-xs text-muted-foreground">{error || "El código no corresponde a una joya registrada."}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gold/15 bg-card shadow-[0_24px_70px_-45px_hsl(var(--gold)/.4)]">
            <div className="border-b border-border bg-gold/[.025] p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-bold tracking-wider text-gold">{joya.codigo}</p>
                  <h2 className="mt-1 text-2xl font-semibold">{joya.nombre}</h2>
                </div>
                <span className="rounded-full border border-gold/20 bg-background px-3 py-1 text-[10px] font-semibold uppercase">{joya.estado.replace("_", " ")}</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="size-3.5 text-gold" /><span><strong className="text-foreground">Taller:</strong> {joya.taller}</span></div>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <Dato label="Metal" value={joya.metal || "—"} />
              <Dato label="Ley" value={joya.ley || "—"} />
              <Dato label="Peso" value={joya.peso == null ? "—" : `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 }).format(Number(joya.peso))} g`} />
              <Dato label="Talla" value={joya.talla || "—"} />
              <Dato label="Piedras" value={joya.piedras || "—"} />
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background/50 px-4 py-3 text-[11px] text-muted-foreground sm:col-span-2"><ShieldCheck className="size-4 text-gold" /> Identificación pública. No se muestran datos privados del cliente.</div>
            </div>
          </div>
        )}

        <div className="mt-5 text-center"><Link to="/" className="text-xs text-muted-foreground hover:text-gold">Taller del Joyero</Link></div>
      </div>
    </main>
  );
}

function Dato({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-background/50 px-4 py-3"><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>;
}
