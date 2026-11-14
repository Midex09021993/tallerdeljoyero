import { useEffect, useRef, useState } from "react";

type ShowcasePage = {
  id: string;
  title: string;
  eyebrow: string;
  image: string;
  alt: string;
};

const pages: ShowcasePage[] = [
  {
    id: "inicio",
    title: "Centro de control",
    eyebrow: "INICIO",
    image: "/aurum-showcase/inicio.webp",
    alt: "Captura real de AURUM LAB: Centro de control del taller",
  },
  {
    id: "clientes",
    title: "Directorio comercial",
    eyebrow: "CLIENTES",
    image: "/aurum-showcase/clientes.webp",
    alt: "Captura real de AURUM LAB: módulo Clientes",
  },
  {
    id: "cotizaciones",
    title: "Gestión comercial",
    eyebrow: "COTIZACIONES",
    image: "/aurum-showcase/cotizaciones.webp",
    alt: "Captura real de AURUM LAB: módulo Cotizaciones",
  },
];

export function AurumProductShowcase() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const page = pages[active];

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { threshold: 0.12 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % pages.length),
      5200,
    );
    return () => window.clearInterval(timer);
  }, [visible]);

  return (
    <section
      ref={rootRef}
      className="aurum-real-showcase relative mx-auto w-full max-w-[760px]"
      aria-label="Vistas reales de AURUM LAB"
    >
      <style>{`
        @keyframes aurum-page-arrive {
          0% { opacity: 0; transform: translate3d(34px, 7px, 0); }
          100% { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        .aurum-real-page { animation: aurum-page-arrive .72s cubic-bezier(.2,.72,.2,1) both; }
        .aurum-real-card-back {
          position: absolute;
          inset: 0;
          border: 1px solid #dfe5ed;
          border-radius: 22px;
          background: #fff;
          pointer-events: none;
        }
        .aurum-real-card-back-one {
          transform: translate(10px, 10px);
          box-shadow: 0 12px 28px rgba(24, 38, 52, .055);
        }
        .aurum-real-card-back-two {
          transform: translate(20px, 20px);
          box-shadow: 0 18px 38px rgba(24, 38, 52, .045);
        }
        @media (prefers-reduced-motion: reduce) {
          .aurum-real-page { animation: none !important; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-x-10 top-8 bottom-2 rounded-[32px] bg-gradient-to-br from-[#f6e8c4]/65 via-[#f5f7fa] to-[#e3eaf2] blur-2xl" />

      <div className="relative">
        <div aria-hidden="true" className="aurum-real-card-back aurum-real-card-back-two" />
        <div aria-hidden="true" className="aurum-real-card-back aurum-real-card-back-one" />

        <article
          key={page.id}
          className="aurum-real-page relative overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(25,39,54,.16)]"
        >
          <div className="flex h-10 items-center justify-between border-b border-slate-100 px-4 sm:h-11 sm:px-5">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-[#ff6b63]" />
              <span className="size-2.5 rounded-full bg-[#ffce45]" />
              <span className="size-2.5 rounded-full bg-[#4ac58b]" />
            </div>
            <span className="rounded-full bg-slate-100 px-8 py-1 text-[8px] font-medium tracking-wide text-slate-400 sm:px-12">
              AURUM LAB · VISTA DEL PRODUCTO
            </span>
            <span className="w-8 sm:w-12" />
          </div>

          <div className="relative aspect-[2.1/1] w-full overflow-hidden bg-[#f7f6f3]">
            <img
              src={page.image}
              alt={page.alt}
              className="absolute inset-0 h-full w-full object-contain"
              loading={active === 0 ? "eager" : "lazy"}
              decoding="async"
            />
          </div>

          <div className="flex min-h-11 items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-2.5 sm:px-5">
            <div className="min-w-0">
              <p className="text-[8px] font-bold tracking-[.18em] text-[#b18a45] sm:text-[9px]">
                {page.eyebrow}
              </p>
              <p className="truncate text-[10px] font-semibold text-[#203142] sm:text-xs">
                {page.title}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span className="text-[8px] font-semibold tracking-wide text-slate-500">
                {String(active + 1).padStart(2, "0")} / 03
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
