import { useEffect, useMemo, useRef, useState } from "react";
import { registrarEvento } from "@/lib/analytics";
import { Gem, Sparkles, RotateCcw, Info, Scale, Target, Palette, Check } from "lucide-react";
import { CLAVES_CALCULADORAS, leerConfigAleacion } from "@/lib/calculadoras-config";
import { calcularAjustePorBalanceDeMasa, validarRecetaLiga } from "@/lib/aleaciones-oro";
import { useConfigSistema } from "@/lib/taller-db";

function formatearNumero(valor: number, decimales = 2) {
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor);
}

type ColorAleacion = "amarillo" | "blanco" | "rosa" | "naranja";
type Operacion = "bajar" | "subir" | "mezclar";

const LEYES_OBJETIVO = [8, 9, 10, 12, 14, 18, 20, 22] as const;
const ETIQUETAS_COLOR: Record<ColorAleacion, string> = {
  amarillo: "Amarillo",
  blanco: "Blanco",
  rosa: "Rosa",
  naranja: "Naranja",
};
const OPERACIONES: { id: Operacion; titulo: string; descripcion: string }[] = [
  { id: "bajar", titulo: "Bajar ley", descripcion: "Añadir liga sin oro" },
  { id: "subir", titulo: "Subir ley", descripcion: "Añadir oro fino" },
  { id: "mezclar", titulo: "Mezclar leyes", descripcion: "Añadir otra aleación" },
];

export function CalculadoraAleacionOro({ compacto = false }: { compacto?: boolean }) {
  const { data: configAleacion } = useConfigSistema(CLAVES_CALCULADORAS.aleacion);
  const configuracion = leerConfigAleacion(configAleacion?.valor);
  const [operacion, setOperacion] = useState<Operacion>("bajar");
  const [masa, setMasa] = useState("");
  const [inicial, setInicial] = useState("24");
  const [final, setFinal] = useState("18");
  const [materialAnadido, setMaterialAnadido] = useState("14");
  const [leyPersonalizada, setLeyPersonalizada] = useState(false);
  const [color, setColor] = useState<ColorAleacion>("amarillo");
  const [unidadLey, setUnidadLey] = useState<"K" | "‰">("K");

  const convertirLeyEntrada = (valor: string): number | null => {
    if (!valor.trim()) return null;
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return null;
    if (unidadLey === "K") return numero >= 0 && numero <= 24 ? numero / 24 : null;
    return numero >= 0 && numero <= 1000 ? numero / 1000 : null;
  };
  const etiquetaUnidad = unidadLey === "K" ? "K" : "‰";
  const cambiarUnidadLey = (nuevaUnidad: "K" | "‰") => {
    if (nuevaUnidad === unidadLey) return;
    const convertir = (valor: string) => {
      if (!valor.trim()) return "";
      const numero = Number(valor);
      if (!Number.isFinite(numero)) return "";
      const convertido = unidadLey === "K" ? (numero / 24) * 1000 : (numero / 1000) * 24;
      return String(Number(convertido.toFixed(6)));
    };
    setInicial(convertir(inicial));
    setFinal(convertir(final));
    setMaterialAnadido(convertir(materialAnadido));
    setUnidadLey(nuevaUnidad);
  };
  const leyPreset = (quilates: number) => unidadLey === "K" ? String(quilates) : String((quilates / 24) * 1000);

  const masaNum = masa.trim() ? Number(masa) : Number.NaN;
  const finuraInicial = convertirLeyEntrada(inicial);
  const finuraObjetivo = convertirLeyEntrada(final);
  const finuraAnadida = operacion === "bajar" ? 0 : operacion === "subir" ? 1 : convertirLeyEntrada(materialAnadido);
  const receta = configuracion.recetas[color];
  const validacionReceta = validarRecetaLiga(receta.metales);

  const calculo = useMemo(() => calcularAjustePorBalanceDeMasa({
    masaInicial: masaNum,
    finuraInicial: finuraInicial ?? Number.NaN,
    finuraObjetivo: finuraObjetivo ?? Number.NaN,
    finuraAnadida: finuraAnadida ?? Number.NaN,
  }), [masaNum, finuraInicial, finuraObjetivo, finuraAnadida]);

  const resultado = calculo?.ok ? calculo.resultado : null;
  const metales = resultado && operacion === "bajar" && validacionReceta.valida
    ? receta.metales.map((metal) => ({
        nombre: metal.nombre,
        gramos: resultado.masaAnadida * metal.porcentaje,
        porcentaje: metal.porcentaje,
      }))
    : [];

  const inicioRegistrado = useRef(false);
  const resultadoRegistrado = useRef(false);

  useEffect(() => {
    if (masa.trim() && !inicioRegistrado.current) {
      inicioRegistrado.current = true;
      registrarEvento("tool_started", { tool_id: "oro" });
    }
  }, [masa]);

  useEffect(() => {
    if (resultado && !resultadoRegistrado.current) {
      resultadoRegistrado.current = true;
      registrarEvento("tool_completed", { tool_id: "oro" });
    } else if (!resultado) {
      resultadoRegistrado.current = false;
    }
  }, [resultado]);

  const hayDatos = masa.trim() !== "" || inicial !== "24" || final !== "18" || (operacion === "mezclar" && materialAnadido !== "14");
  const mensajeError = !hayDatos ? null
    : !masa.trim() ? "Introduce la masa inicial en gramos."
    : !Number.isFinite(masaNum) || masaNum <= 0 ? "La masa inicial debe ser un número mayor que cero."
    : finuraInicial === null ? `La ley inicial debe estar entre 0 y ${unidadLey === "K" ? "24K" : "1000‰"}.`
    : finuraObjetivo === null ? `La ley objetivo debe estar entre 0 y ${unidadLey === "K" ? "24K" : "1000‰"}.`
    : finuraAnadida === null ? `La ley del segundo material debe estar entre 0 y ${unidadLey === "K" ? "24K" : "1000‰"}.`
    : calculo.ok ? null : {
      "masa-inicial-invalida": "Introduce una masa inicial mayor que cero.",
      "finura-inicial-invalida": "La ley inicial debe estar entre 0 y 1000‰.",
      "finura-objetivo-invalida": "La ley objetivo debe ser mayor que 0‰ y menor que 1000‰.",
      "finura-anadida-invalida": "La ley del material añadido debe estar entre 0 y 1000‰.",
      "objetivo-no-alcanzable": "No se puede alcanzar esa ley con el material seleccionado. La ley objetivo debe quedar estrictamente entre las dos leyes de partida.",
      "datos-no-finitos": "Revisa los valores introducidos.",
    }[calculo.error];

  return (
    <div className={`relative overflow-hidden rounded-[28px] border border-gold/20 bg-background shadow-[0_18px_60px_rgba(0,0,0,0.10)] ${compacto ? "p-1" : "p-4 sm:p-6 lg:p-8"}`}>
      <header className="relative mb-5 flex items-start justify-between gap-4 sm:mb-7">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/25 to-gold/5 shadow-inner">
            <Gem className="size-5 text-gold-deep" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold-deep">Taller del Joyero</p>
            <h2 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Aleación de oro</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Balance de masa para ajustar la ley del oro.</p>
          </div>
        </div>
        <div className="hidden rounded-full border border-gold/15 bg-gold/5 px-2.5 py-1.5 text-[10px] font-medium text-gold-deep sm:flex sm:items-center sm:gap-1.5">
          <Sparkles className="size-3" aria-hidden="true" /> Cálculo teórico
        </div>
      </header>

      <section className="mb-4 rounded-3xl border border-border bg-card/60 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">¿Qué operación necesitas?</p>
          <div className="flex items-center gap-2 text-xs"><span className="text-muted-foreground">Unidad de ley</span><div className="flex rounded-xl border border-input p-1"><button type="button" onClick={() => cambiarUnidadLey("K")} aria-pressed={unidadLey === "K"} className={`rounded-lg px-3 py-1.5 font-semibold ${unidadLey === "K" ? "bg-gold/20 text-foreground" : "text-muted-foreground"}`}>K</button><button type="button" onClick={() => cambiarUnidadLey("‰")} aria-pressed={unidadLey === "‰"} className={`rounded-lg px-3 py-1.5 font-semibold ${unidadLey === "‰" ? "bg-gold/20 text-foreground" : "text-muted-foreground"}`}>‰</button></div></div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {OPERACIONES.map((item) => (
            <button key={item.id} type="button" onClick={() => setOperacion(item.id)} aria-pressed={operacion === item.id}
              className={`rounded-2xl border p-3 text-left transition ${operacion === item.id ? "border-gold bg-gold/10 text-foreground" : "border-input bg-background text-muted-foreground hover:border-gold/60"}`}>
              <span className="block text-sm font-semibold">{item.titulo}</span>
              <span className="mt-1 block text-[11px]">{item.descripcion}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="space-y-4">
        <section className="rounded-3xl border border-border bg-card/60 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-gold/10 text-gold-deep"><Scale className="size-4" aria-hidden="true" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">Material inicial</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Introduce la masa y la ley conocida del material.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="min-w-0 space-y-2">
              <span className="block text-[11px] font-semibold text-muted-foreground">Masa inicial</span>
              <div className="relative">
                <input type="number" inputMode="decimal" min="0" step="0.01" value={masa} onChange={(e) => setMasa(e.target.value)} placeholder="100.00" aria-label="Masa inicial en gramos"
                  className="h-14 w-full rounded-2xl border border-input bg-background px-3 pr-10 text-lg font-semibold text-foreground outline-none transition placeholder:text-muted-foreground/75 focus:border-gold focus:ring-4 focus:ring-gold/10" />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">g</span>
              </div>
            </label>
            <label className="min-w-0 space-y-2">
              <span className="block text-[11px] font-semibold text-muted-foreground">Ley inicial</span>
              <div className="relative">
                <input type="number" inputMode="decimal" min="0" max={unidadLey === "K" ? 24 : 1000} step="0.001" value={inicial} onChange={(e) => setInicial(e.target.value)} placeholder={unidadLey === "K" ? "14" : "585"} aria-label={`Ley inicial en ${etiquetaUnidad}`}
                  className="h-14 w-full rounded-2xl border border-input bg-background px-3 pr-10 text-lg font-semibold text-foreground outline-none transition placeholder:text-muted-foreground/75 focus:border-gold focus:ring-4 focus:ring-gold/10" />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">{etiquetaUnidad}</span>
              </div>
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/60 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-gold/10 text-gold-deep"><Target className="size-4" aria-hidden="true" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">Ley final deseada</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Selecciona una ley habitual o introduce otra.</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {LEYES_OBJETIVO.map((ley) => {
              const seleccionado = !leyPersonalizada && final === leyPreset(ley);
              return <button key={ley} type="button" onClick={() => { setLeyPersonalizada(false); setFinal(leyPreset(ley)); }} aria-pressed={seleccionado}
                className={`relative h-11 rounded-2xl border text-sm font-semibold transition ${seleccionado ? "border-gold bg-gold/15 text-foreground" : "border-input bg-background text-muted-foreground hover:border-gold/60"}`}>
                {unidadLey === "K" ? `${ley}K` : `${formatearNumero((ley / 24) * 1000, 3)}‰`}{seleccionado ? <Check className="absolute right-1.5 top-1.5 size-3 text-gold-deep" aria-hidden="true" /> : null}
              </button>;
            })}
          </div>
          <button type="button" onClick={() => setLeyPersonalizada((v) => !v)}
            className="mt-3 flex min-h-11 w-full items-center justify-center rounded-2xl border border-dashed border-input px-4 text-xs font-semibold text-muted-foreground hover:border-gold/60">
            {leyPersonalizada ? "Usar ley habitual" : "＋ Introducir ley personalizada"}
          </button>
          {leyPersonalizada ? <div className="relative mt-2">
            <input type="number" inputMode="decimal" min="0" max={unidadLey === "K" ? 24 : 1000} step="0.001" value={final} onChange={(e) => setFinal(e.target.value)} placeholder={unidadLey === "K" ? "Ej. 16.75" : "Ej. 585"} aria-label={`Ley final personalizada en ${etiquetaUnidad}`}
              className="h-12 w-full rounded-2xl border border-gold/40 bg-background px-4 pr-10 text-base font-semibold text-foreground outline-none focus:border-gold focus:ring-4 focus:ring-gold/10" />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">{etiquetaUnidad}</span>
          </div> : null}
          {finuraObjetivo !== null ? <p className="mt-3 text-center text-[11px] text-muted-foreground">Equivalencia matemática: {formatearNumero(finuraObjetivo * 1000, 3)}‰ de oro fino · {formatearNumero(finuraObjetivo * 24, 3)}K</p> : <p className="mt-3 text-center text-[11px] text-muted-foreground">Introduce una ley válida para ver su equivalencia.</p>}
        </section>

        {operacion === "mezclar" ? <section className="rounded-3xl border border-border bg-card/60 p-4 sm:p-5">
          <label className="block space-y-2">
            <span className="block text-xs font-bold uppercase tracking-[0.16em] text-foreground">Ley del segundo material</span>
            <span className="block text-[11px] text-muted-foreground">Indica la ley comprobada del oro que vas a incorporar.</span>
            <div className="relative">
              <input type="number" inputMode="decimal" min="0" max={unidadLey === "K" ? 24 : 1000} step="0.001" value={materialAnadido} onChange={(e) => setMaterialAnadido(e.target.value)} aria-label={`Ley del segundo material en ${etiquetaUnidad}`}
                className="h-12 w-full rounded-2xl border border-input bg-background px-4 pr-10 text-base font-semibold text-foreground outline-none focus:border-gold focus:ring-4 focus:ring-gold/10" />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">{etiquetaUnidad}</span>
            </div>
          </label>
        </section> : null}

        {operacion === "bajar" ? <fieldset className="rounded-3xl border border-border bg-card/60 p-4 sm:p-5">
          <legend className="sr-only">Color de la aleación</legend>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-gold/10 text-gold-deep"><Palette className="size-4" aria-hidden="true" /></div>
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">Color de la liga</p><p className="mt-0.5 text-[11px] text-muted-foreground">Se aplica la receta configurada para el taller.</p></div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(ETIQUETAS_COLOR) as ColorAleacion[]).map((c) => <button key={c} type="button" onClick={() => setColor(c)} aria-pressed={color === c}
              className={`flex h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition ${color === c ? "border-gold bg-gold/15 text-foreground" : "border-input bg-background text-muted-foreground hover:border-gold/60"}`}>
              <span className={`size-2.5 shrink-0 rounded-full ${c === "amarillo" ? "bg-[#d9ad35]" : c === "blanco" ? "bg-slate-200" : c === "rosa" ? "bg-[#d7967f]" : "bg-orange-500"}`} aria-hidden="true" />
              {ETIQUETAS_COLOR[c]}
            </button>)}
          </div>
        </fieldset> : null}
      </div>

      {resultado && !mensajeError ? <div className="mt-4 space-y-4">
        <article className="rounded-[24px] border border-gold/40 bg-gradient-to-br from-gold/20 via-gold/8 to-transparent p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-deep">{operacion === "bajar" ? "Liga total a añadir" : operacion === "subir" ? "Oro fino a añadir" : "Segunda aleación a añadir"}</p>
          <p className="mt-2 text-3xl font-semibold leading-none text-foreground">{formatearNumero(resultado.masaAnadida)} <span className="text-base font-medium text-muted-foreground">g</span></p>
          {operacion === "bajar" && validacionReceta.valida ? <p className="mt-2 text-xs text-muted-foreground">Distribuida según la receta de oro {ETIQUETAS_COLOR[color].toLowerCase()} configurada.</p> : null}
        </article>

        {operacion === "bajar" ? <section className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-deep">Desglose de la liga · {ETIQUETAS_COLOR[color]}</p>
          {!validacionReceta.valida ? <p className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-warning">La receta configurada no es válida: {validacionReceta.motivo} No se muestra un desglose para evitar cantidades incorrectas.</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {metales.map((metal) => <article key={metal.nombre} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{metal.nombre}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{formatearNumero(metal.gramos)} <span className="text-sm font-medium text-muted-foreground">g</span></p>
              <p className="mt-1 text-xs text-muted-foreground">{formatearNumero(metal.porcentaje * 100, 2)}% de la liga</p>
            </article>)}
          </div>}
        </section> : null}

        <article className="rounded-[24px] border border-gold/40 bg-gradient-to-br from-gold/20 via-gold/8 to-transparent p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-deep">Balance final teórico</p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div><p className="text-[11px] text-muted-foreground">Masa final</p><p className="mt-1 text-2xl font-semibold text-foreground">{formatearNumero(resultado.masaFinal)} g</p></div>
            <div><p className="text-[11px] text-muted-foreground">Ley final calculada</p><p className="mt-1 text-2xl font-semibold text-foreground">{formatearNumero(resultado.finuraFinal * 1000, 3)}‰</p><p className="text-xs text-muted-foreground">{formatearNumero(resultado.quilatesFinales, 3)}K equivalente</p></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gold/20 pt-3 text-xs">
            <div><p className="text-muted-foreground">Oro fino inicial</p><p className="mt-1 font-semibold">{formatearNumero(resultado.oroFinoInicial, 4)} g</p></div>
            <div><p className="text-muted-foreground">Oro fino añadido</p><p className="mt-1 font-semibold">{formatearNumero(resultado.oroFinoAnadido, 4)} g</p></div>
          </div>
        </article>
        <div className="flex items-start gap-2 rounded-xl border border-gold/15 bg-card/60 p-3">
          <Info className="mt-0.5 size-3.5 shrink-0 text-gold-deep" aria-hidden="true" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">Resultado teórico por balance de masa. Supone que las leyes introducidas son correctas y que no hay pérdidas, contaminación ni cambios de composición durante el proceso. No sustituye el ensayo del lote.</p>
        </div>
      </div> : <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-gold/20 bg-gold/5"><RotateCcw className="size-6 text-gold/70" aria-hidden="true" /></div>
        <p className="mt-4 text-sm font-medium text-foreground">Completa los datos para calcular</p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">El cálculo se habilita cuando la ley objetivo puede alcanzarse con los materiales seleccionados.</p>
        {mensajeError ? <p role="alert" className="mt-3 text-xs text-warning">{mensajeError}</p> : null}
      </div>}
    </div>
  );
}
