import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, Coins, RefreshCw } from "lucide-react";

type GoldQuote = {
  pricePenPerGram24k: number;
  asOf: string;
  cachedAt: number;
};

const CACHE_KEY = "aurum-gold-quote-pen-v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const API_URL = "https://goldprice.corgano.com/api/v1/latest?currency=PEN";

function formatPEN(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
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

export function PrecioOroDiario() {
  const [quote, setQuote] = useState<GoldQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [grams, setGrams] = useState("10");
  const [karat, setKarat] = useState(18);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadQuote() {
      setLoading(true);
      setMessage("");
      let saved: GoldQuote | null = null;

      try {
        const raw = window.localStorage.getItem(CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as GoldQuote;
          if (
            Number.isFinite(parsed.pricePenPerGram24k) &&
            parsed.pricePenPerGram24k > 0 &&
            typeof parsed.asOf === "string" &&
            Number.isFinite(parsed.cachedAt)
          ) {
            saved = parsed;
            setQuote(parsed);
            if (Date.now() - parsed.cachedAt < CACHE_TTL_MS && refreshKey === 0) {
              setLoading(false);
              return;
            }
          }
        }
      } catch {
        // Ignore unavailable or invalid local cache and try the source.
      }

      try {
        const response = await fetch(API_URL, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("La fuente de precios no respondió correctamente.");

        const result: {
          data?: {
            as_of?: string;
            currencies?: { PEN?: { per_gram?: number } };
          };
        } = await response.json();

        const perGram = result.data?.currencies?.PEN?.per_gram;
        const asOf = result.data?.as_of;
        if (typeof perGram !== "number" || !Number.isFinite(perGram) || perGram <= 0 || !asOf) {
          throw new Error("La fuente no entregó una cotización válida en soles peruanos.");
        }

        const fresh: GoldQuote = {
          pricePenPerGram24k: perGram,
          asOf,
          cachedAt: Date.now(),
        };
        if (cancelled) return;
        setQuote(fresh);
        try {
          window.localStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
        } catch {
          // The quote still works if browser storage is unavailable.
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            saved
              ? "No pudimos actualizar la fuente. Mostramos el último dato guardado."
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
  }, [refreshKey]);

  const estimatedValue = useMemo(() => {
    const weight = Number(grams);
    if (!quote || !Number.isFinite(weight) || weight <= 0) return null;
    return weight * quote.pricePenPerGram24k * (karat / 24);
  }, [grams, karat, quote]);

  return (
    <section id="precio-del-oro" className="scroll-mt-24 border-y border-[#eadca8] bg-gradient-to-br from-[#fffaf0] via-white to-[#fff5d6]">
      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_.9fr] lg:gap-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#eadca8] bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]">
              <Coins className="size-3.5" /> Referencia diaria del mercado
            </span>
            <h2 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-[#17232d] sm:text-4xl">
              Precio del oro hoy
              <span className="block text-[#9a7400]">Calcula el valor teórico de tu metal.</span>
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Consulta la referencia por gramo y estima cuánto oro fino contiene una pieza según su peso y quilataje, sin crear una cuenta.
            </p>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              Es una estimación del contenido metálico, no una oferta de compra ni una tasación comercial. No incluye piedras, mano de obra, mermas, impuestos ni márgenes del comprador.
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadca8] bg-white p-5 shadow-[0_18px_50px_rgba(91,72,10,.09)] sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-500">Oro puro · 24K · por gramo</p>
                {quote ? (
                  <p className="mt-2 text-3xl font-extrabold tracking-tight text-[#17232d] sm:text-4xl">{formatPEN(quote.pricePenPerGram24k)}</p>
                ) : (
                  <p className="mt-2 text-2xl font-extrabold text-slate-400">{loading ? "Consultando…" : "Precio no disponible"}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setRefreshKey((value) => value + 1)}
                disabled={loading}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#d4aa19] hover:bg-[#fffbee] disabled:cursor-wait disabled:opacity-50"
                aria-label="Actualizar cotización del oro"
              >
                <RefreshCw className={"size-3.5 " + (loading ? "animate-spin" : "")} /> Actualizar
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
              <CalendarClock className="size-3.5 shrink-0" />
              {quote ? <>Dato de origen: {formatQuoteDate(quote.asOf)} · hora de Perú</> : "La fecha aparecerá cuando la fuente responda."}
            </div>
            {message && <p role="status" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{message}</p>}

            <div className="mt-6 border-t border-slate-100 pt-5">
              <h3 className="text-sm font-bold text-[#17232d]">Calcula el valor teórico</h3>
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
              <div className="mt-4 rounded-2xl bg-[#fff8df] p-4">
                <p className="text-xs font-medium text-[#765900]">Valor teórico estimado</p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight text-[#17232d]">
                  {estimatedValue === null ? "—" : formatPEN(estimatedValue)}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-slate-600">Fórmula: peso × precio de 24K × ({karat}/24).</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
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
