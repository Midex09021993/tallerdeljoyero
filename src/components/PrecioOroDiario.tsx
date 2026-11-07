import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, Coins, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";

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
};

type GoldApiResponse = {
  currency?: string;
  timestamp?: string;
  price_gram_24k?: string;
};

type ExchangeRatesResponse = {
  result?: string;
  time_last_update_utc?: string;
  rates?: Partial<Record<CurrencyCode, number>>;
};

type CachedGoldUsd = {
  price24kPerGram: number;
  asOf: string;
  cachedAt: number;
};

type CachedExchangeRates = {
  rates: Partial<Record<CurrencyCode, number>>;
  asOf: string;
  cachedAt: number;
};

const CACHE_KEY = "aurum-gold-quote-goldprice-dev-usd-v1";
const FX_CACHE_KEY = "aurum-gold-quote-fx-v1";
const CACHE_TTL_MS = 15 * 60 * 1000;
const FX_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const QUOTE_STALE_MS = 2 * 60 * 60 * 1000;
const API_URL = "https://api.goldprice.dev/v1/carat?currency=USD";
const FX_API_URL = "https://open.er-api.com/v6/latest/USD";

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

function isValidQuote(value: unknown, currency: CurrencyCode): value is GoldQuote {
  if (!value || typeof value !== "object") return false;
  const quote = value as GoldQuote;
  return (
    quote.currency === currency &&
    typeof quote.asOf === "string" &&
    Number.isFinite(new Date(quote.asOf).getTime()) &&
    Number.isFinite(quote.cachedAt) &&
    typeof quote.price24kPerGram === "number" &&
    Number.isFinite(quote.price24kPerGram) &&
    quote.price24kPerGram > 0
  );
}

function readCachedQuote(currency: CurrencyCode): GoldQuote | null {
  try {
    const [goldRaw, fxRaw] = [
      window.localStorage.getItem(CACHE_KEY),
      window.localStorage.getItem(FX_CACHE_KEY),
    ];
    if (!goldRaw || !fxRaw) return null;
    const gold = JSON.parse(goldRaw) as CachedGoldUsd;
    const fx = JSON.parse(fxRaw) as CachedExchangeRates;
    const rate = currency === "USD" ? 1 : fx.rates?.[currency];
    if (
      !Number.isFinite(gold.price24kPerGram) ||
      gold.price24kPerGram <= 0 ||
      !Number.isFinite(new Date(gold.asOf).getTime()) ||
      !Number.isFinite(gold.cachedAt) ||
      !Number.isFinite(fx.cachedAt) ||
      !Number.isFinite(new Date(fx.asOf).getTime()) ||
      typeof rate !== "number" ||
      !Number.isFinite(rate) ||
      rate <= 0
    ) return null;
    return {
      currency,
      price24kPerGram: gold.price24kPerGram * rate,
      asOf: gold.asOf,
      cachedAt: Math.min(gold.cachedAt, fx.cachedAt),
    };
  } catch {
    return null;
  }
}

function readCachedGoldUsd(): CachedGoldUsd | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as CachedGoldUsd;
    return Number.isFinite(value.price24kPerGram) && value.price24kPerGram > 0 &&
      Number.isFinite(value.cachedAt) && Number.isFinite(new Date(value.asOf).getTime())
      ? value : null;
  } catch { return null; }
}

function readCachedExchangeRates(): CachedExchangeRates | null {
  try {
    const raw = window.localStorage.getItem(FX_CACHE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as CachedExchangeRates;
    return value.rates && Number.isFinite(value.cachedAt) &&
      Number.isFinite(new Date(value.asOf).getTime()) ? value : null;
  } catch { return null; }
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
      if (entry.isIntersecting) {
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
        let gold = readCachedGoldUsd();
        if (!gold || Date.now() - gold.cachedAt >= CACHE_TTL_MS || refreshKey > 0) {
          const goldResponse = await fetch(API_URL, { headers: { Accept: "application/json" } });
          if (!goldResponse.ok) throw new Error("La fuente del oro no respondió correctamente.");
          const goldData = (await goldResponse.json()) as GoldApiResponse;
          const price = Number(goldData.price_gram_24k);
          if (goldData.currency !== "USD" || !goldData.timestamp ||
              !Number.isFinite(new Date(goldData.timestamp).getTime()) ||
              !Number.isFinite(price) || price <= 0) {
            throw new Error("La fuente no entregó una cotización válida del oro.");
          }
          gold = { price24kPerGram: price, asOf: goldData.timestamp, cachedAt: Date.now() };
          try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(gold)); } catch { /* Caché opcional */ }
        }

        let fx = readCachedExchangeRates();
        if (!fx || Date.now() - fx.cachedAt >= FX_CACHE_TTL_MS || refreshKey > 0) {
          const fxResponse = await fetch(FX_API_URL, { headers: { Accept: "application/json" } });
          if (!fxResponse.ok) throw new Error("No fue posible actualizar los tipos de cambio.");
          const fxData = (await fxResponse.json()) as ExchangeRatesResponse;
          if (fxData.result !== "success" || !fxData.time_last_update_utc || !fxData.rates) {
            throw new Error("La fuente de divisas no entregó datos válidos.");
          }
          fx = { rates: fxData.rates, asOf: fxData.time_last_update_utc, cachedAt: Date.now() };
          try { window.localStorage.setItem(FX_CACHE_KEY, JSON.stringify(fx)); } catch { /* Caché opcional */ }
        }

        const exchangeRate = country.currency === "USD" ? 1 : fx.rates[country.currency];
        if (typeof exchangeRate !== "number" || !Number.isFinite(exchangeRate) || exchangeRate <= 0) {
          throw new Error(`No hay conversión disponible para ${country.currency}.`);
        }

        const fresh: GoldQuote = {
          currency: country.currency,
          price24kPerGram: gold.price24kPerGram * exchangeRate,
          asOf: gold.asOf,
          cachedAt: Math.min(gold.cachedAt, fx.cachedAt),
        };
        if (cancelled) return;
        setQuote(fresh);
        setQuoteSource("source");
      } catch (error) {
        if (!cancelled) {
          setQuoteSource("browser-cache");
          setMessage(
            saved
              ? `No se pudo actualizar. Se conserva la cotización del ${formatQuoteDate(saved.asOf)}; verifica su vigencia antes de usarla.`
              : error instanceof Error
                ? error.message
                : "No fue posible consultar el precio del oro. Inténtalo nuevamente más tarde."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadQuote();
    return () => {
      cancelled = true;
    };
  }, [isVisible, refreshKey, country.currency]);

  const purityByKarat: Record<number, number> = { 24: 999, 22: 916, 18: 750, 14: 585, 10: 417, 9: 375 };
  const purity = purityByKarat[karat] ?? 750;
  const quoteAge = quote && quote.currency === country.currency ? Date.now() - new Date(quote.asOf).getTime() : 0;
  const isQuoteStale = quote?.currency === country.currency ? !Number.isFinite(quoteAge) || quoteAge > QUOTE_STALE_MS : false;
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
              <Coins className="size-3.5" /> Referencia de mercado · Sudamérica
            </span>
            <h2 className="mt-5 max-w-2xl text-3xl font-extrabold leading-[1.12] tracking-[-.035em] text-[#17232d] sm:text-4xl lg:text-[2.8rem]">
              Precio del oro hoy
              <span className="block text-[#9a7400]">Calcula el valor teórico de tu metal.</span>
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Consulta una referencia internacional del oro, convertida a moneda local, y estima el contenido metálico según peso y ley.
            </p>
            <p className="mt-5 max-w-xl text-xs leading-6 text-slate-500">
              Es una estimación del contenido metálico, no una oferta de compra ni una tasación comercial. No incluye piedras, mano de obra, mermas, impuestos ni márgenes del comprador. La conversión a moneda local es referencial.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 border-t border-[#eadca8]/70 pt-5 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-[#9a7400]" /> Sin registro</span>
              <span className="inline-flex items-center gap-2"><CalendarClock className="size-4 text-[#9a7400]" /> Actualización aproximada cada 15 min</span>
              <span className="inline-flex items-center gap-2"><Sparkles className="size-4 text-[#9a7400]" /> Para joyeros de la región</span>
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
                  <span className="rounded-full border border-[#e9d79d] bg-white px-2.5 py-1 text-[10px] font-bold text-[#876500]">Referencia indicativa</span>
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
                <span>{quote ? <>Dato de origen: {formatQuoteDate(quote.asOf)} · hora de Perú</> : "La fecha aparecerá cuando la fuente responda."}</span>
                {quote && <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${isQuoteStale ? "bg-amber-100 text-amber-800" : quoteSource === "browser-cache" ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}>{isQuoteStale ? "Dato desactualizado" : quoteSource === "browser-cache" ? "Guardada en este navegador" : "Oro con demora aprox. 15 min"}</span>}
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
              <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#9a7400]">Calculadora de taller</p><h3 className="mt-1 text-base font-extrabold text-[#17232d]">Estima el valor de tu oro</h3></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">Cálculo instantáneo</span></div>
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
                <p className="mt-1 text-[11px] leading-5 text-slate-600">Fórmula: peso × precio de 24K × ({purity}/1000). La ley se aplica en milésimas.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-7">
              <a href="https://goldprice.dev/" target="_blank" rel="noreferrer" className="text-[11px] font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-[#765900]">
                Datos de oro por goldprice.dev
              </a>
              <a href="https://www.exchangerate-api.com/" target="_blank" rel="noreferrer" className="text-[11px] font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-[#765900]">Rates By Exchange Rate API</a>
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
