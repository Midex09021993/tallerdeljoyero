import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, Coins, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";

const COUNTRIES = [
  { code: "PE", name: "Perú", currency: "PEN", locale: "es-PE" },
  { code: "CO", name: "Colombia", currency: "COP", locale: "es-CO" },
  { code: "CL", name: "Chile", currency: "CLP", locale: "es-CL" },
  { code: "AR", name: "Argentina", currency: "ARS", locale: "es-AR" },
  { code: "BR", name: "Brasil", currency: "BRL", locale: "pt-BR" },
  { code: "EC", name: "Ecuador", currency: "USD", locale: "es-EC" },
  { code: "BO", name: "Bolivia", currency: "BOB", locale: "es-BO" },
  { code: "UY", name: "Uruguay", currency: "UYU", locale: "es-UY" },
  { code: "PY", name: "Paraguay", currency: "PYG", locale: "es-PY" },
] as const;

type CurrencyCode = (typeof COUNTRIES)[number]["currency"];
type GoldQuote = {
  prices: Partial<Record<CurrencyCode, number>>;
  asOf: string;
  cachedAt: number;
};

type GoldApiResponse = {
  data?: {
    as_of?: string;
    currencies?: Partial<Record<CurrencyCode, { per_gram?: number }>>;
  };
};

const CACHE_KEY = "aurum-gold-quote-south-america-v2";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CURRENCIES = COUNTRIES.map((country) => country.currency).join(",");
const API_URL = `https://goldprice.corgano.com/api/v1/latest?currency=${CURRENCIES}`;

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

function isValidQuote(value: unknown): value is GoldQuote {
  if (!value || typeof value !== "object") return false;
  const quote = value as GoldQuote;
  return (
    typeof quote.asOf === "string" &&
    Number.isFinite(quote.cachedAt) &&
    !!quote.prices &&
    COUNTRIES.some((country) => {
      const price = quote.prices[country.currency];
      return typeof price === "number" && Number.isFinite(price) && price > 0;
    })
  );
}

export function PrecioOroDiario() {
  const [quote, setQuote] = useState<GoldQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [grams, setGrams] = useState("10");
  const [karat, setKarat] = useState(18);
  const [countryCode, setCountryCode] = useState<string>("PE");
  const [refreshKey, setRefreshKey] = useState(0);

  const country = COUNTRIES.find((item) => item.code === countryCode) ?? COUNTRIES[0];
  const price24k = quote?.prices[country.currency];

  useEffect(() => {
    let cancelled = false;

    async function loadQuote() {
      setLoading(true);
      setMessage("");
      let saved: GoldQuote | null = null;

      try {
        const raw = window.localStorage.getItem(CACHE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (isValidQuote(parsed)) {
            saved = parsed;
            setQuote(parsed);
            if (Date.now() - parsed.cachedAt < CACHE_TTL_MS && refreshKey === 0 && typeof parsed.prices[country.currency] === "number") {
              setLoading(false);
              return;
            }
          }
        }
      } catch {
        // If browser storage is unavailable, fetch a fresh quote.
      }

      try {
        const response = await fetch(API_URL, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("La fuente de precios no respondió correctamente.");

        const result = (await response.json()) as GoldApiResponse;
        const asOf = result.data?.as_of;
        const prices: Partial<Record<CurrencyCode, number>> = {};

        for (const item of COUNTRIES) {
          const value = result.data?.currencies?.[item.currency]?.per_gram;
          if (typeof value === "number" && Number.isFinite(value) && value > 0) {
            prices[item.currency] = value;
          }
        }

        if (!asOf || Object.keys(prices).length === 0) {
          throw new Error("La fuente no entregó una cotización válida para los países seleccionados.");
        }

        const fresh: GoldQuote = { prices, asOf, cachedAt: Date.now() };
        if (cancelled) return;
        setQuote(fresh);
        try {
          window.localStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
        } catch {
          // The quote remains usable when local storage is disabled.
        }
        if (!prices[country.currency]) {
          setMessage(`La fuente no entregó el precio en ${country.currency}; selecciona otro país o vuelve a intentarlo.`);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            saved
              ? "No pudimos actualizar la fuente. Mostramos la última cotización guardada."
              : error instanceof Error
                ? error.message
                : "No fue posible consultar el precio del oro."
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
  }, [refreshKey, country.currency]);

  const estimatedValue = useMemo(() => {
    const weight = Number(grams);
    if (price24k === undefined || !Number.isFinite(weight) || weight <= 0) return null;
    return weight * price24k * (karat / 24);
  }, [grams, karat, price24k]);

  return (
    <section id="precio-del-oro" className="scroll-mt-24 overflow-hidden border-y border-[#eadca8] bg-[radial-gradient(ellipse_at_top_left,_rgba(250,224,139,0.24),_transparent_44%),linear-gradient(135deg,#fffdf8_0%,#ffffff_52%,#fff8e5_100%)]">
      <div className="mx-auto max-w-[1320px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-[.88fr_1.12fr] lg:gap-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e9d79d] bg-white/90 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[.17em] text-[#876500] shadow-sm">
              <Coins className="size-3.5" /> Referencia diaria · Sudamérica
            </span>
            <h2 className="mt-5 max-w-2xl text-3xl font-extrabold leading-[1.12] tracking-[-.035em] text-[#17232d] sm:text-4xl lg:text-[2.8rem]">
              Precio del oro hoy
              <span className="block text-[#9a7400]">Calcula el valor teórico de tu metal.</span>
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Consulta la referencia internacional del oro convertida a moneda local y estima el contenido metálico de una pieza según su peso y quilataje.
            </p>
            <p className="mt-5 max-w-xl text-xs leading-6 text-slate-500">
              Es una estimación del contenido metálico, no una oferta de compra ni una tasación comercial. No incluye piedras, mano de obra, mermas, impuestos ni márgenes del comprador. La conversión a moneda local es referencial.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 border-t border-[#eadca8]/70 pt-5 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-[#9a7400]" /> Sin registro</span>
              <span className="inline-flex items-center gap-2"><CalendarClock className="size-4 text-[#9a7400]" /> Referencia diaria</span>
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
                    <option key={item.code} value={item.code}>{item.name} · {item.currency}</option>
                  ))}
                </select>
              </label>
              <div className="mt-5 rounded-2xl border border-[#f0e3b7] bg-[#fffaf0] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8b6b0a]">Cotización de referencia</p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">Oro puro · 24K · por gramo</p>
                  </div>
                  <span className="rounded-full border border-[#e9d79d] bg-white px-2.5 py-1 text-[10px] font-bold text-[#876500]">Precio indicativo</span>
                </div>
                {price24k !== undefined ? (
                  <p className="mt-3 break-words text-3xl font-extrabold tracking-[-.04em] text-[#17232d] sm:text-[2.6rem]">{formatMoney(price24k, country.currency, country.locale)}</p>
                ) : (
                  <p className="mt-3 text-2xl font-extrabold text-slate-400">{loading ? "Consultando…" : "Precio no disponible"}</p>
                )}
              </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-7">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <CalendarClock className="size-3.5 shrink-0" />
                {quote ? <>Dato de origen: {formatQuoteDate(quote.asOf)} · hora de Perú</> : "La fecha aparecerá cuando la fuente responda."}
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
              <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#9a7400]">Calculadora de taller</p><h3 className="mt-1 text-base font-extrabold text-[#17232d]">Estima el valor de tu oro</h3></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">Paso 1 · 2</span></div>
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
                  {estimatedValue === null ? "—" : formatMoney(estimatedValue, country.currency, country.locale)}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-slate-600">Fórmula: peso × precio de 24K × ({karat}/24).</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-7">
              <a href="https://goldprice.corgano.com/" target="_blank" rel="noreferrer" className="text-[11px] font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-[#765900]">
                Gold price data by Corgano
              </a>
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
