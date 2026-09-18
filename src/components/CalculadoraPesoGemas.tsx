import { useMemo, useState } from "react";
import { Info, Scale } from "lucide-react";

type Talla = "redonda" | "oval" | "esmeralda" | "rectangular" | "marquise" | "pera" | "cuadrada" | "cushion" | "cabujon";

const PIEDRAS = [
  ["Diamante", 3.52], ["Rubí / Zafiro", 4.00], ["Esmeralda", 2.72],
  ["Amatista / Cuarzo", 2.65], ["Citrino", 2.65], ["Aguamarina", 2.72],
  ["Turmalina", 3.25], ["Peridoto", 3.45], ["Topacio", 3.53],
  ["Granate", 4.10], ["Ópalo", 2.25], ["Jade", 3.10], ["Turquesa", 2.80],
] as const;

const FACTORES: Record<Talla, number> = {
  redonda: 0.0018, oval: 0.0020, esmeralda: 0.0025, rectangular: 0.0025,
  marquise: 0.0016, pera: 0.0018, cuadrada: 0.0023, cushion: 0.0018, cabujon: 0.0027,
};

const NOMBRES: Record<Talla, string> = {
  redonda: "Redonda facetada", oval: "Oval", esmeralda: "Esmeralda",
  rectangular: "Rectangular", marquise: "Marquise", pera: "Pera",
  cuadrada: "Cuadrada", cushion: "Cushion", cabujon: "Cabujón",
};

const n = (v: string) => {
  const x = Number(v.replace(",", "."));
  return Number.isFinite(x) && x > 0 ? x : 0;
};

export function CalculadoraPesoGemas({ compacto = false }: { compacto?: boolean }) {
  const [modo, setModo] = useState<"peso" | "medidas">("peso");
  const [gramos, setGramos] = useState("");
  const [piedra, setPiedra] = useState("Diamante");
  const [talla, setTalla] = useState<Talla>("oval");
  const [largo, setLargo] = useState("");
  const [ancho, setAncho] = useState("");
  const [profundidad, setProfundidad] = useState("");

  const peso = useMemo(() => {
    const g = n(gramos);
    return g ? g * 5 : 0;
  }, [gramos]);

  const estimado = useMemo(() => {
    const l = n(largo), a = n(ancho), p = n(profundidad);
    const sg = PIEDRAS.find(([nombre]) => nombre === piedra)?.[1] ?? 0;
    if (!l || !a || !p || !sg) return null;
    const factor = FACTORES[talla];
    const ct = talla === "redonda" || talla === "cuadrada"
      ? l * l * p * sg * factor
      : l * a * p * sg * factor;
    return { ct, g: ct * 0.2, sg };
  }, [largo, ancho, profundidad, piedra, talla]);

  const box = "rounded-xl border border-border bg-surface-muted/50 p-3";
  return (
    <section className={`rounded-2xl border border-border bg-card shadow-card ${compacto ? "p-3" : "p-5 sm:p-6"}`}>
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold"><Scale className="size-5" /></div>
        <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Gemología</p>
        <h2 className="mt-1 text-xl font-semibold">Calculadora de Peso de Gemas</h2>
        <p className="mt-1 text-sm text-muted-foreground">Convierte peso real o estima el quilataje por medidas.</p></div>
      </div>

      <div className="mt-5 grid grid-cols-2 rounded-xl border border-border bg-surface-muted p-1">
        {([["peso","Peso real"],["medidas","Estimar por medidas"]] as const).map(([id,label]) => (
          <button key={id} type="button" onClick={() => setModo(id)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${modo === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>{label}</button>
        ))}
      </div>

      {modo === "peso" ? (
        <div className="mt-5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Peso de la piedra
            <div className="mt-1 flex gap-2"><input inputMode="decimal" value={gramos} onChange={e => setGramos(e.target.value)} placeholder="0.00" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-3 text-base outline-none focus:ring-1 focus:ring-gold" />
            <span className="grid place-items-center rounded-lg border border-border bg-surface-muted px-3 text-xs font-semibold">gramos</span></div>
          </label>
          {peso ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Resultado etiqueta="Quilates" valor={peso.toFixed(2)} unidad="ct" />
            <Resultado etiqueta="Puntos" valor={Math.round(peso*100).toString()} unidad="pt" />
            <Resultado etiqueta="Miligramos" valor={Math.round(n(gramos)*1000).toString()} unidad="mg" />
          </div> : <p className="mt-4 text-xs text-muted-foreground">Ingresa el peso para obtener la conversión.</p>}
          <p className="mt-3 text-[10px] text-muted-foreground">Conversión exacta: 1 ct = 0,20 g.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Material
              <select value={piedra} onChange={e => setPiedra(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-3 text-sm">
                {PIEDRAS.map(([name]) => <option key={name}>{name}</option>)}
              </select>
            </label>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Talla / forma
              <select value={talla} onChange={e => setTalla(e.target.value as Talla)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-3 text-sm">
                {Object.entries(NOMBRES).map(([id,name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([["Largo",largo,setLargo],["Ancho",ancho,setAncho],["Profundidad",profundidad,setProfundidad]] as const).map(([label,value,setter]) =>
              <label key={label} className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}
                <input inputMode="decimal" value={value} onChange={e => setter(e.target.value)} placeholder="0.0" className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-3 text-sm" />
                <span className="mt-1 block text-[9px] normal-case">mm</span>
              </label>
            )}
          </div>
          {estimado ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Resultado etiqueta="Peso estimado" valor={estimado.ct.toFixed(2)} unidad="ct" />
            <Resultado etiqueta="Gramos" valor={estimado.g.toFixed(3)} unidad="g" />
            <Resultado etiqueta="Puntos" valor={Math.round(estimado.ct*100).toString()} unidad="pt" />
            <Resultado etiqueta="SG" valor={estimado.sg.toFixed(2)} unidad="" />
          </div> : <p className="text-xs text-muted-foreground">Completa las tres medidas en milímetros.</p>}
          <div className="flex gap-2 rounded-xl border border-info/20 bg-info-soft/40 p-3 text-xs text-muted-foreground"><Info className="size-4 shrink-0 text-info" />
            <p>Método: dimensiones × gravedad específica × factor de forma. Es una estimación y no sustituye el pesaje directo.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function Resultado({ etiqueta, valor, unidad }: { etiqueta:string; valor:string; unidad:string }) {
  return <div className="rounded-xl border border-gold/30 bg-gold/5 p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">{etiqueta}</p><p className="mt-1 text-lg font-semibold text-gold">{valor} {unidad}</p></div>;
}
