import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, Coins, RefreshCw, ShieldCheck } from "lucide-react";

const COUNTRIES = [
  { code: "PE", name: "Perú", currency: "PEN", locale: "es-PE", flag: "🇵🇪" },
  { code: "CO", name: "Colombia", currency: "COP", locale: "es-CO", flag: "🇨🇴" },
  { code: "CL", name: "Chile", currency: "CLP", locale: "es-CL", flag: "🇨🇱" },
  { code: "AR", name: "Argentina", currency: "ARS", locale: "es-AR", flag: "🇦🇷" },
  { code: "BR", name: "Brasil", currency: "BRL", locale: "pt-BR", flag: "🇧🇷" },
  { code: "DO", name: "República Dominicana", currency: "DOP", locale: "es-DO", flag: "🇩🇴" },
  { code: "EC", name: "Ecuador", currency: "USD", locale: "es-EC", flag: "🇪🇨" },
  { code: "BO", name: "Bolivia", currency: "BOB", locale: "es-BO", flag: "🇧🇴" },
  { code: "UY", name: "Uruguay", currency: "UYU", locale: "es-UY", flag: "🇺🇾" },
  { code: "PY", name: "Paraguay", currency: "PYG", locale: "es-PY", flag: "🇵🇾" },
] as const;

type CurrencyCode = (typeof COUNTRIES)[number]["currency"];
type GoldQuote = {
  currency: CurrencyCode;
  price24kPerGram: number;
  asOf: string;
  cachedAt: number;
  isStale: boolean;
};

type XausSpotResponse = {
  xau?: { price?: number; currency?: string; unit?: string };
  per_gram_usd?: number;
  fx_rates?: Partial<Record<CurrencyCode, number>>;
  data_state?: { status?: "fresh" | "stale" | "unavailable"; as_of?: string; age_seconds?: number };
  stale?: boolean;
  price_as_of?: string;
  updated_at?: string;
};

type CachedGoldQuote = GoldQuote;
const CACHE_KEY_PREFIX = "aurum-gold-quote-xaus-v2-";
const CACHE_TTL_MS = 60 * 1000;
const QUOTE_STALE_MS = 2 * 60 * 60 * 1000;
const XAUS_API_URL = "https://xaus.com/api/v1/spot";

function formatMoney(value: number, currency: CurrencyCode, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatQuoteDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(date);
}

function readCachedQuote(currency: CurrencyCode): CachedGoldQuote | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY_PREFIX + currency);
    if (!raw) return null;
    const value = JSON.parse(raw) as CachedGoldQuote;
    if (value.currency !== currency || !Number.isFinite(value.price24kPerGram) ||
      value.price24kPerGram <= 0 || !Number.isFinite(value.cachedAt) ||
      !Number.isFinite(new Date(value.asOf).getTime())) return null;
    return value;
  } catch {
    return null;
  }
}

async function fetchXausQuote(currency: CurrencyCode): Promise<GoldQuote> {
  const request = async (requestedCurrency: string) => {
    const url = new URL(XAUS_API_URL);
    url.searchParams.set("currency", requestedCurrency);
    url.searchParams.set("unit", "gram");
    const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    const data = await response.json() as XausSpotResponse;
    return { response, data };
  };

  const { response, data: initialData } = await request(currency);
  let data = initialData;
  let price: number | undefined;
  if (response.ok && data.xau?.currency === currency && data.xau.unit === "gram") {
    price = data.xau.price;
  } else if (response.status === 400) {
    // Use XAUS' own FX table if its direct currency selector does not support this code.
    const fallback = await request("USD");
    const usdPrice = fallback.data.per_gram_usd;
    if (!fallback.response.ok || typeof usdPrice !== "number" || !Number.isFinite(usdPrice) || usdPrice <= 0) {
      throw new Error("XAUS no pudo entregar una cotización válida para esta moneda.");
    }
    const rate = fallback.data.fx_rates?.[currency];
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
      throw new Error(`XAUS todavía no ofrece conversión para ${currency}.`);
    }
    price = usdPrice * rate;
    data = fallback.data;
  } else if (!response.ok) {
    throw new Error(`XAUS no respondió correctamente (HTTP ${response.status}).`);
  }

  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    throw new Error("XAUS no entregó un precio por gramo válido.");
  }
  const asOf = data.price_as_of ?? data.data_state?.as_of ?? data.updated_at;
  const updatedAtMs = data.updated_at ? new Date(data.updated_at).getTime() : Number.NaN;
  if (!asOf || !Number.isFinite(new Date(asOf).getTime()) || !Number.isFinite(updatedAtMs)) {
    throw new Error("XAUS no entregó fechas válidas para verificar la cotización.");
  }
  if (data.data_state?.status === "unavailable") {
    throw new Error("XAUS no tiene una cotización disponible en este momento.");
  }
  return {
    currency,
    price24kPerGram: price,
    asOf,
    cachedAt: Date.now(),
    isStale: data.stale === true ||
      data.data_state?.status === "stale" ||
      Date.now() - updatedAtMs > 5 * 60 * 1000 ||
      Date.now() - updatedAtMs < -60 * 1000,
  };
}

export function PrecioOroDiario() {
  const [quote, setQuote] = useState<GoldQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [grams, setGrams] = useState("10");
  const [karat, setKarat] = useState(18);
  const [countryCode, setCountryCode] = useState<string>("PE");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [quoteSource, setQuoteSource] = useState<"source" | "browser-cache">("source");
  const sectionRef = useRef<HTMLElement | null>(null);

  const country = COUNTRIES.find((item) => item.code === countryCode) ?? COUNTRIES[0];
  const price24k = quote?.currency === country.currency ? quote.price24kPerGram : undefined;

  useEffect(() => {
    const element = sectionRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "160px" });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let cancelled = false;

    async function loadQuote() {
      setLoading(true);
      setMessage("");
      const saved = readCachedQuote(country.currency);
      if (saved) {
        setQuote(saved);
        setQuoteSource("browser-cache");
        if (Date.now() - saved.cachedAt < CACHE_TTL_MS && refreshKey === 0) {
          setLoading(false);
          return;
        }
      } else {
        setQuote((current) => current?.currency === country.currency ? current : null);
      }

      try {
        const fresh = await fetchXausQuote(country.currency);
        if (cancelled) return;
        try {
          window.localStorage.setItem(CACHE_KEY_PREFIX + country.currency, JSON.stringify(fresh));
        } catch {
          // La caché local es opcional.
        }
        setQuote(fresh);
        setQuoteSource("source");
        if (fresh.isStale) {
          setMessage("XAUS está entregando su último precio real disponible; verifica su fecha antes de utilizarlo.");
        }
      } catch (error) {
        if (!cancelled) {
          setQuoteSource("browser-cache");
          setMessage(saved
            ? `No se pudo actualizar XAUS. Se conserva la cotización del ${formatQuoteDate(saved.asOf)}; verifica su vigencia antes de usarla.`
            : error instanceof TypeError
              ? "No se pudo establecer conexión con XAUS. Revisa la conexión e inténtalo nuevamente."
              : error instanceof Error
                ? error.message
                : "No fue posible consultar el precio del oro. Inténtalo nuevamente más tarde.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadQuote();
    return () => { cancelled = true; };
  }, [isVisible, refreshKey, country.currency]);

  const purityByKarat: Record<number, number> = { 24: 999, 22: 916, 18: 750, 14: 585, 10: 417, 9: 375 };
  const purity = purityByKarat[karat] ?? 750;
  const quoteAge = quote && quote.currency === country.currency ? Date.now() - new Date(quote.asOf).getTime() : 0;
  const isQuoteStale = quote?.currency === country.currency ? quote.isStale || !Number.isFinite(quoteAge) || quoteAge > QUOTE_STALE_MS : false;
  const usablePrice24k = isQuoteStale ? undefined : price24k;

  const estimatedValue = useMemo(() => {
    const weight = Number(grams);
    if (usablePrice24k === undefined || !Number.isFinite(weight) || weight <= 0) return null;
    return weight * usablePrice24k * (purity / 1000);
  }, [grams, purity, usablePrice24k]);

  return (
    <section ref={sectionRef} id="precio-del-oro" className="scroll-mt-24 overflow-hidden border-y border-[#eadca8] bg-[radial-gradient(ellipse_at_top_left,_rgba(250,224,139,0.24),_transparent_44%),linear-gradient(135deg,#fffdf8_0%,#ffffff_52%,#fff8e5_100%)]">
      <div className="mx-auto max-w-[1320px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-[.88fr_1.12fr] lg:gap-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e9d79d] bg-white/90 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[.17em] text-[#876500] shadow-sm">
              <Coins className="size-3.5" /> Oro · Sudamérica
            </span>
            <h2 className="mt-5 max-w-2xl text-3xl font-extrabold leading-[1.12] tracking-[-.035em] text-[#17232d] sm:text-4xl lg:text-[2.8rem]">
              Cotización del oro por gramo
              <span className="block text-[#9a7400]">Calcula el valor teórico de tu oro.</span>
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Consulta una referencia del oro puro en tu moneda local y estima su valor según el peso y la ley seleccionada.
            </p>
            <p className="mt-4 max-w-xl text-xs leading-5 text-slate-500">
              Valor referencial; no incluye piedras, mano de obra ni otros costos.
            </p>
            <div className="mt-6 border-t border-[#eadca8]/70 pt-5 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-[#9a7400]" /> Gratis · Sin registro</span>
            </div>
            <div className="mt-7 rounded-2xl border border-[#e8d79e]/80 bg-white/80 p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Sobre esta cotización</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">La referencia se consulta a través de XAUS y se expresa por gramo de oro fino. El valor puede variar con el mercado internacional y el tipo de cambio.</p>
              <p className="mt-2 text-[10px] leading-5 text-slate-500">El precio teórico del metal no equivale necesariamente al precio de compra o venta de una joya.</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.6rem] border border-[#e8d79e] bg-white shadow-[0_24px_70px_rgba(77,60,12,.12)]">
            <div className="border-b border-slate-100 bg-gradient-to-r from-[#fffdf7] to-white p-5 sm:p-7">
              <label className="block text-xs font-bold uppercase tracking-[.08em] text-slate-500">
                País / moneda
                <select
                  value={country.code}
                  onChange={(event) => setCountryCode(event.target.value)}
                  className="mt-2.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-[#17232d] shadow-sm outline-none transition focus:border-[#c6a23a] focus:ring-4 focus:ring-[#f8c928]/20"
                >
                  {COUNTRIES.map((item) => (
                    <option key={item.code} value={item.code}>{item.flag} {item.name} · {item.currency}</option>
                  ))}
                </select>
              </label>
              <div className="mt-5 rounded-2xl border border-[#f0e3b7] bg-[#fffaf0] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8b6b0a]">Cotización de referencia</p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">Oro puro · 24K · por gramo</p>
                  </div>
                </div>
                {usablePrice24k !== undefined ? (
                  <p className="mt-3 break-words text-3xl font-extrabold tracking-[-.04em] text-[#17232d] sm:text-[2.6rem]">{formatMoney(usablePrice24k, country.currency, country.locale)}</p>
                ) : (
                  <p className="mt-3 text-xl font-extrabold text-slate-500">{loading ? "Consultando…" : isQuoteStale ? "Cotización desactualizada" : "Precio no disponible"}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-7">
              <div className="flex min-w-0 items-center gap-2 text-[11px] text-slate-500">
                <CalendarClock className="size-3.5 shrink-0" />
                <span>{quote ? formatQuoteDate(quote.asOf) + " · Perú" : "Esperando cotización"}</span>
                {quote && <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${isQuoteStale ? "bg-amber-100 text-amber-800" : quoteSource === "browser-cache" ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}>{isQuoteStale ? "Dato desactualizado" : quoteSource === "browser-cache" ? "Guardada en este navegador" : "Fuente XAUS · actualización 60 s"}</span>}
              </div>
              <button
                type="button"
                onClick={() => setRefreshKey((value) => value + 1)}
                disabled={loading}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-[#d4aa19] hover:bg-[#fffbee] disabled:cursor-wait disabled:opacity-50"
                aria-label="Actualizar cotización del oro"
              >
                <RefreshCw className={"size-3.5 " + (loading ? "animate-spin" : "")} /> Actualizar
              </button>
            </div>
            {message && <p role="status" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{message}</p>}

            <div className="p-5 pt-4 sm:p-7 sm:pt-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#9a7400]">Calculadora</p><h3 className="mt-1 text-base font-extrabold text-[#17232d]">Valor de tu oro</h3></div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-600">
                  Peso (gramos)
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={grams}
                    onChange={(event) => setGrams(event.target.value)}
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-[#17232d] outline-none transition focus:border-[#d4aa19] focus:ring-2 focus:ring-[#f8c928]/30"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-600">
                  Ley del oro
                  <select
                    value={karat}
                    onChange={(event) => setKarat(Number(event.target.value))}
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-[#17232d] outline-none transition focus:border-[#d4aa19] focus:ring-2 focus:ring-[#f8c928]/30"
                  >
                    <option value={24}>24K · 999</option>
                    <option value={22}>22K · 916</option>
                    <option value={18}>18K · 750</option>
                    <option value={14}>14K · 585</option>
                    <option value={10}>10K · 417</option>
                    <option value={9}>9K · 375</option>
                  </select>
                </label>
              </div>
              <div className="mt-5 rounded-2xl border border-[#e9d79d] bg-gradient-to-br from-[#fff8df] to-[#fffdf6] p-4 sm:p-5">
                <p className="text-xs font-medium text-[#765900]">Valor teórico estimado</p>
                <p className="mt-1 break-words text-2xl font-extrabold tracking-tight text-[#17232d] sm:text-3xl">
                  {estimatedValue === null ? (isQuoteStale ? "Referencia no vigente" : "—") : formatMoney(estimatedValue, country.currency, country.locale)}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-slate-600">Calculado según el peso y la ley seleccionada.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-7">
              <a href="https://xaus.com/api/" target="_blank" rel="noreferrer" className="text-[11px] font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-[#765900]">Fuente: XAUS</a>
              <Link to="/herramientas-publicas" className="inline-flex items-center gap-2 text-xs font-bold text-[#765900] hover:text-[#17232d]">
                Más herramientas <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
