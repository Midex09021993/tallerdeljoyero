import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Calculator, Gem, Ruler, Factory, Search, Sparkles, X } from "lucide-react";

const categorias = [
  "Metalurgia y materiales",
  "Diseño y fabricación",
  "Gemología",
  "Medidas y tallas",
  "Diseño del taller",
  "Fundición y materiales",
] as const;

const categoryStyles: Record<string, { color: string; icon: typeof Gem }> = {
  "Metalurgia y materiales": { color: "#C9A227", icon: Calculator },
  "Diseño y fabricación": { color: "#B7791F", icon: Sparkles },
  "Gemología": { color: "#0F766E", icon: Gem },
  "Medidas y tallas": { color: "#64748B", icon: Ruler },
  "Diseño del taller": { color: "#7C3AED", icon: Factory },
  "Fundición y materiales": { color: "#C2410C", icon: Factory },
};

const featuredSlug = "calcular-aleaciones-oro-18k-14k-9k";
const guideFaq = [
  { question: "¿Cómo calculo el oro fino de una pieza de 18K?", answer: "Multiplica el peso de la pieza por 0.75 para obtener una estimación del oro fino contenido en una aleación nominal de 18K. Verifica la ley real del material antes de tomar decisiones de fabricación." },
  { question: "¿Qué temas cubren las guías técnicas de AURUM LAB?", answer: "Las 17 guías disponibles abarcan metalurgia y materiales, diseño y fabricación, gemología, medidas y tallas, diseño del taller y fundición." },
  { question: "¿Las guías incluyen herramientas de cálculo?", answer: "Algunas guías enlazan calculadoras públicas de aleaciones, peso 3D, peso de gemas y conversión de tallas. La herramienta relacionada aparece cuando existe un enlace definido." },
];

export const Route = createFileRoute("/guias")({
  head: () => ({
    meta: [
      { title: "Guías técnicas para joyeros | AURUM LAB" },
      { name: "description", content: "17 guías técnicas de joyería sobre aleaciones de oro, diseño y fabricación 3D, gemología, tallas, organización del taller y fundición." },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Guías técnicas para joyeros | AURUM LAB" },
      { property: "og:description", content: "Conocimiento práctico para talleres de joyería: fórmulas, procesos y herramientas." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.tallerdeljoyero.com/guias" },
      { property: "og:site_name", content: "AURUM LAB" },
      { property: "og:locale", content: "es_PE" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Guías técnicas para joyeros | AURUM LAB" },
      { name: "twitter:description", content: "17 guías técnicas para trabajar mejor la joyería." },
    ],
    links: [{ rel: "canonical", href: "https://www.tallerdeljoyero.com/guias" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": "https://www.tallerdeljoyero.com/#organization",
            name: "AURUM LAB",
            alternateName: "Taller del Joyero",
            url: "https://www.tallerdeljoyero.com/",
            logo: { "@type": "ImageObject", url: "https://www.tallerdeljoyero.com/brand/aurum-symbol.svg" },
          },
          {
            "@type": "CollectionPage",
            "@id": "https://www.tallerdeljoyero.com/guias#collection",
            name: "Guías técnicas para joyeros | AURUM LAB",
            description: "17 guías técnicas para el trabajo de talleres de joyería.",
            url: "https://www.tallerdeljoyero.com/guias",
            inLanguage: "es-PE",
            isPartOf: { "@type": "WebSite", name: "AURUM LAB", alternateName: "Taller del Joyero", url: "https://www.tallerdeljoyero.com/" },
            mainEntity: {
              "@type": "ItemList",
              itemListOrder: "https://schema.org/ItemListOrderAscending",
              numberOfItems: guias.length,
              itemListElement: guias.map((guia, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: guia.titulo,
                url: `https://www.tallerdeljoyero.com/guias/${guia.slug}`,
                description: guia.descripcion,
              })),
            },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Inicio", item: "https://www.tallerdeljoyero.com/" },
              { "@type": "ListItem", position: 2, name: "Guías técnicas", item: "https://www.tallerdeljoyero.com/guias" },
            ],
          },
          {
            "@type": "FAQPage",
            mainEntity: guideFaq.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          },
        ],
      }),
    }],
  }),
  component: GuiasPage,
});

const guias = [
  {
    slug: "calcular-aleaciones-oro-18k-14k-9k",
    categoria: "Metalurgia y materiales",
    titulo: "Cómo calcular aleaciones de oro de 18K, 14K y 9K",
    descripcion: "Aprende cómo calcular oro fino y metal de liga para aleaciones de oro de 18 quilates, 14K y 9K, con fórmulas y ejemplos en gramos.",
    icon: Gem,
    lectura: "6 min de lectura",
    herramienta: "Calculadora de aleación de oro",
    herramientaHref: "/herramientas-publicas/aleacion-oro",
  },
  {
    slug: "convertir-oro-14k-a-18k",
    categoria: "Metalurgia y materiales",
    titulo: "Cómo pasar oro de 14K a 18K: cálculo en gramos",
    descripcion: "Calcula cuánto oro fino añadir para elevar la ley de 14K a 18K, con fórmula y ejemplo práctico.",
    icon: Gem,
    lectura: "4 min de lectura",
    herramienta: "Calculadora de aleación de oro",
    herramientaHref: "/herramientas-publicas/aleacion-oro",
  },
  {
    slug: "bajar-oro-24k-a-18k",
    categoria: "Metalurgia y materiales",
    titulo: "Cómo bajar oro de 24K a 18K calculando la liga",
    descripcion: "Calcula la cantidad teórica de liga para convertir oro fino en una aleación de 18K.",
    icon: Gem,
    lectura: "4 min de lectura",
    herramienta: "Calculadora de aleación de oro",
    herramientaHref: "/herramientas-publicas/aleacion-oro",
  },
  {
    slug: "calcular-oro-fino-18k-14k-9k",
    categoria: "Metalurgia y materiales",
    titulo: "Cuánto oro fino contiene una pieza de 18K, 14K y 9K",
    descripcion: "Consulta las proporciones de oro fino y calcula el contenido de oro puro según el peso de una pieza.",
    icon: Gem,
    lectura: "4 min de lectura",
    herramienta: "Calculadora de aleación de oro",
    herramientaHref: "/herramientas-publicas/aleacion-oro",
  },
  {
    slug: "calcular-liga-oro-18k-14k",
    categoria: "Metalurgia y materiales",
    titulo: "Cómo calcular la liga que debes añadir al oro",
    descripcion: "Fórmula de balance de masa para estimar la liga que se añade al ajustar la ley de oro.",
    icon: Gem,
    lectura: "4 min de lectura",
    herramienta: "Calculadora de aleación de oro",
    herramientaHref: "/herramientas-publicas/aleacion-oro",
  },
  {
    slug: "diferencia-oro-14k-585-milesimas",
    categoria: "Metalurgia y materiales",
    titulo: "Diferencia entre oro 14K, 583 y 585 milésimas",
    descripcion: "Entiende la equivalencia matemática entre quilates y milésimas y cómo afecta a los cálculos.",
    icon: Gem,
    lectura: "4 min de lectura",
    herramienta: "Calculadora de aleación de oro",
    herramientaHref: "/herramientas-publicas/aleacion-oro",
  },
  {
    slug: "calcular-peso-anillo-oro-antes-fundir",
    categoria: "Diseño y fabricación",
    titulo: "Cómo calcular el peso de un anillo de oro antes de fundirlo",
    descripcion: "Estima el peso del anillo desde el volumen CAD y la densidad de la aleación, separando la pieza del sistema de colada.",
    icon: Gem,
    lectura: "5 min de lectura",
    herramienta: "Calculadora de peso 3D",
    herramientaHref: "/herramientas-publicas/peso-joya-3d",
  },
  {
    slug: "calcular-peso-oro-archivo-stl",
    categoria: "Diseño y fabricación",
    titulo: "Cómo calcular el peso de oro desde un archivo STL",
    descripcion: "Valida escala y malla STL, obtiene volumen y estima peso con la densidad del metal.",
    icon: Gem,
    lectura: "5 min de lectura",
    herramienta: "Calculadora de peso 3D",
    herramientaHref: "/herramientas-publicas/peso-joya-3d",
  },
  {
    slug: "calcular-peso-joya-volumen",
    categoria: "Diseño y fabricación",
    titulo: "Cómo calcular el peso de una joya según su volumen",
    descripcion: "Convierte volumen de un modelo a gramos con densidad, unidades correctas y ejemplos.",
    icon: Gem,
    lectura: "4 min de lectura",
    herramienta: "Calculadora de peso 3D",
    herramientaHref: "/herramientas-publicas/peso-joya-3d",
  },
  {
    slug: "cuanto-oro-necesito-fabricar-joya",
    categoria: "Diseño y fabricación",
    titulo: "Cuánto oro necesitas para fabricar una joya",
    descripcion: "Planifica metal para pieza, árbol de colada y margen del proceso sin usar porcentajes universales.",
    icon: Gem,
    lectura: "5 min de lectura",
    herramienta: "Calculadora de peso 3D",
    herramientaHref: "/herramientas-publicas/peso-joya-3d",
  },
  {
    slug: "estimar-peso-oro-impresion-resina",
    categoria: "Diseño y fabricación",
    titulo: "Cómo estimar el peso del oro desde una impresión de resina",
    descripcion: "Estima volumen y masa metálica desde el peso de una impresión, con límites y comprobaciones.",
    icon: Gem,
    lectura: "5 min de lectura",
    herramienta: "Calculadora de peso 3D",
    herramientaHref: "/herramientas-publicas/peso-joya-3d",
  },
  {
    slug: "calcular-peso-joya-modelo-3d",
    categoria: "Diseño y fabricación",
    titulo: "Cómo estimar el peso de una joya a partir de un modelo 3D",
    descripcion: "Descubre cómo calcular el peso aproximado de una joya en 3D con el volumen del modelo, las unidades y la densidad del oro, plata o platino.",
    icon: Gem,
    lectura: "5 min de lectura",
    herramienta: "Visualizador y calculadora de peso 3D",
    herramientaHref: "/herramientas-publicas/peso-joya-3d",
  },
  {
    slug: "calcular-peso-gemas-por-medidas",
    categoria: "Gemología",
    titulo: "Cómo calcular el peso de una gema por sus medidas",
    descripcion: "Aprende a convertir gramos a quilates y estimar el peso de diamantes y gemas según sus dimensiones, forma de talla y gravedad específica.",
    icon: Gem,
    lectura: "6 min de lectura",
    herramienta: "Calculadora de peso de gemas",
    herramientaHref: "/herramientas-publicas/peso-gemas",
  },
  {
    slug: "convertir-tallas-anillos-espana-europa-usa",
    categoria: "Medidas y tallas",
    titulo: "Cómo convertir tallas de anillos entre España, Europa y USA",
    descripcion: "Aprende a medir el diámetro interior de un anillo y consultar equivalencias entre los sistemas de tallaje más utilizados.",
    icon: Ruler,
    lectura: "5 min de lectura",
    herramienta: "Conversor de tallas de anillos",
    herramientaHref: "/herramientas-publicas/tallas-anillos",
  },
  {
    slug: "distribucion-taller-joyeria",
    categoria: "Diseño del taller",
    titulo: "Distribución de un taller de joyería: zonas, flujo y seguridad",
    descripcion: "Aprende a organizar las zonas de diseño CAD, impresión 3D, posprocesado, fundición y acabado con criterios de flujo, ventilación y seguridad.",
    icon: Gem,
    lectura: "10–12 min de lectura",
    herramienta: "Guía de distribución del taller",
  },
  {
    slug: "impresion-3d-joyeria",
    categoria: "Diseño y fabricación",
    titulo: "Impresión 3D para joyería: del archivo a la pieza",
    descripcion: "Conoce las etapas de preparación del modelo, impresión, lavado, curado y revisión antes de la fundición.",
    icon: Gem,
    lectura: "8 min de lectura",
    herramienta: "Asistente de impresión 3D",
  },
  {
    slug: "fundicion-joyeria-revestimiento-omni-cast",
    categoria: "Fundición y materiales",
    titulo: "Fundición de joyería: guía del revestimiento y preparación del cilindro",
    descripcion: "Guía de fundición de joyería para preparar el cilindro, medir agua y revestimiento y consultar correctamente la ficha técnica de Whip Mix Omni-Cast.",
    icon: Gem,
    lectura: "7 min de lectura",
    herramienta: "Calculadora de yeso y agua",
  },
];


function categoriaId(categoria: string) {
  return `categoria-${categoria.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}
}

function GuiasPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [categoriaActiva, setCategoriaActiva] = useState<string>("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const featured = guias.find((guia) => guia.slug === featuredSlug)!;
  const restGuides = guias.filter((guia) => guia.slug !== featuredSlug);
  const filtered = useMemo(() => {
    const normalized = busqueda.trim().toLocaleLowerCase("es");
    return restGuides.filter((guia) => {
      const categoryMatch = categoriaActiva === "Todos" || guia.categoria === categoriaActiva;
      const searchMatch = !normalized || `${guia.titulo} ${guia.descripcion} ${guia.categoria}`.toLocaleLowerCase("es").includes(normalized);
      return categoryMatch && searchMatch;
    });
  }, [categoriaActiva, busqueda]);
  const featuredMatches = (categoriaActiva === "Todos" || featured.categoria === categoriaActiva) &&
    (!busqueda.trim() || `${featured.titulo} ${featured.descripcion} ${featured.categoria}`.toLocaleLowerCase("es").includes(busqueda.trim().toLocaleLowerCase("es")));
  const resultCount = filtered.length + (featuredMatches ? 1 : 0);

  useEffect(() => {
    if (pathname !== "/guias" && pathname !== "/guias/") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.2 });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (!visible || window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") return;
    const nodes = cardRefs.current.filter((node): node is HTMLElement => Boolean(node));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("guide-revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [visible, filtered, featuredMatches]);

  if (pathname !== "/guias" && pathname !== "/guias/") return <Outlet />;

  const allCount = guias.length;
  const categoryCount = (category: string) => category === "Todos" ? allCount : guias.filter((guide) => guide.categoria === category).length;

  const card = (guia: typeof guias[number], index: number, isFeatured = false) => {
    const style = categoryStyles[guia.categoria] ?? categoryStyles["Metalurgia y materiales"];
    const Icon = style.icon;
    const updateDate = "fechaActualizacion" in guia ? guia.fechaActualizacion : undefined;
    const publishedDate = "fechaPublicacion" in guia ? guia.fechaPublicacion : undefined;
    const isNew = typeof publishedDate === "string" && publishedDate !== "[COMPLETAR]" &&
      !Number.isNaN(Date.parse(publishedDate)) && Date.now() - Date.parse(publishedDate) <= 30 * 24 * 60 * 60 * 1000 &&
      Date.now() - Date.parse(publishedDate) >= 0;
    return (
      <article key={guia.slug} ref={(node) => { cardRefs.current[index] = node; }} className={`guide-card group ${visible ? "guide-observed" : ""} ${isFeatured ? "guide-featured" : ""}`} style={{ transitionDelay: `${index * 70}ms` }}>
        <div className="flex items-start justify-between gap-3">
          <span className="guide-icon" aria-hidden="true"><Icon className="size-5" /></span>
          <div className="flex flex-wrap justify-end gap-1.5">
            {isNew && <span className="guide-new-label">Nuevo</span>}
            {isFeatured && <span className="guide-feature-label">Guía destacada</span>}
            <span className="guide-reading">{guia.lectura}</span>
          </div>
        </div>
        <p className="guide-category" style={{ color: style.color }}>{guia.categoria.toUpperCase()}</p>
        <h2 className="guide-title"><Link to="/guias/$slug" params={{ slug: guia.slug }} title={`Leer: ${guia.titulo}`}>{guia.titulo}</Link></h2>
        <p className="guide-excerpt">{guia.descripcion}</p>
        <p className="guide-updated">Actualizado: <span>{updateDate || "[COMPLETAR]"}</span></p>
        <div className="guide-card-footer">
          <div className="guide-tools">
            {"herramientaHref" in guia && guia.herramientaHref ? (
              <Link to={guia.herramientaHref as never} className="guide-tool-link" title={`Abrir ${guia.herramienta}`}>{guia.herramienta}<ArrowRight className="size-3.5" /></Link>
            ) : <span className="guide-tool-text">{guia.herramienta}</span>}
          </div>
          <Link to="/guias/$slug" params={{ slug: guia.slug }} aria-label={`Leer guía: ${guia.titulo}`} className="guide-read-link">Leer guía <ArrowRight className="size-4" /></Link>
        </div>
      </article>
    );
  };

  return (
    <main className="guides-page min-h-screen bg-[#111111] text-white">
      <style>{`
        .guides-page { --gold:#C9A227; --gold-soft:#f6e9bd; --ink:#111111; }
        .guides-page .guide-motion { opacity:0; transform:translateY(16px); transition:opacity 420ms cubic-bezier(.22,1,.36,1),transform 420ms cubic-bezier(.22,1,.36,1); }
        .guides-page .guide-motion.is-visible { opacity:1; transform:translateY(0); }
        .guides-page .guide-card { background:#fff; color:#171717; border:1px solid #e7e1d1; border-radius:18px; padding:20px; box-shadow:0 4px 14px rgba(0,0,0,.08); transition:opacity 360ms cubic-bezier(.22,1,.36,1),transform 360ms cubic-bezier(.22,1,.36,1),box-shadow 360ms cubic-bezier(.22,1,.36,1),border-color 360ms ease; opacity:1; transform:translateY(0); }
        .guides-page .guide-card.guide-observed { opacity:0; transform:translateY(16px); }
        .guides-page .guide-card.guide-observed.guide-revealed { opacity:1; transform:translateY(0); }
        .guides-page .guide-card:hover { transform:translateY(-4px); box-shadow:0 16px 34px rgba(0,0,0,.18); border-color:#C9A227; }
        .guides-page .guide-icon { display:grid;place-items:center;width:44px;height:44px;border-radius:13px;background:#f7edce;color:#8a6a12; }
        .guides-page .guide-category { margin-top:18px;font-size:9px;font-weight:800;letter-spacing:.16em;line-height:1.4; }
        .guides-page .guide-title { margin-top:7px;font-size:16px;font-weight:800;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden; }
        .guides-page .guide-title a { text-decoration:none; }
        .guides-page .guide-title a::after { content:"";display:block;width:0;height:2px;background:#C9A227;transition:width 350ms ease; }
        .guides-page .guide-card:hover .guide-title a::after { width:42px; }
        .guides-page .guide-excerpt { margin-top:10px;color:#525252;font-size:13px;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:40px; }
        .guides-page .guide-reading { color:#737373;font-size:10px;font-weight:600; }
        .guides-page .guide-feature-label { border:1px solid #e3c75f;border-radius:999px;background:#fff8e1;color:#7c5e0d;padding:4px 8px;font-size:9px;font-weight:800; }
        .guides-page .guide-new-label { border:1px solid #fda4af;border-radius:999px;background:#fff1f2;color:#be123c;padding:4px 8px;font-size:9px;font-weight:800; }
        .guides-page .guide-updated { margin-top:11px;color:#777;font-size:10px; }
        .guides-page .guide-updated span { color:#777; }
        .guides-page .guide-card-footer { display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid #eee; }
        .guides-page .guide-tool-link { display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;color:#755a0c; }
        .guides-page .guide-tool-text { font-size:10px;font-weight:600;color:#6b6b6b; }
        .guides-page .guide-read-link { display:inline-flex;align-items:center;gap:5px;white-space:nowrap;color:#70560b;font-size:11px;font-weight:800; }
        .guides-page .guide-read-link svg,.guides-page .guide-tool-link svg { transition:transform 350ms cubic-bezier(.22,1,.36,1); }
        .guides-page .guide-card:hover .guide-read-link svg,.guides-page .guide-card:hover .guide-tool-link svg { transform:translateX(4px); }
        .guides-page a:focus-visible,.guides-page button:focus-visible,.guides-page input:focus-visible { outline:2px solid #C9A227;outline-offset:3px; }
        .guides-page .guide-filter { border:1px solid #454545;background:#202020;color:#e7e7e7;border-radius:999px;padding:8px 12px;font-size:11px;font-weight:700;transition:background 250ms ease,color 250ms ease,border-color 250ms ease; }
        .guides-page .guide-filter[aria-pressed="true"] { background:#C9A227;border-color:#C9A227;color:#111; }
        .guides-page .guide-filter:hover { border-color:#C9A227; }
        .guides-page .guide-filter-count { opacity:.75;margin-left:5px;font-variant-numeric:tabular-nums; }
        .guides-page .guide-featured { border-color:#C9A227;background:linear-gradient(135deg,#fff 0%,#fffdf7 100%); }
        .guides-page .guide-featured .guide-icon { width:54px;height:54px;background:#f7edce; }
        .guides-page .guide-featured .guide-title { font-size:clamp(18px,2vw,24px); }
        .guides-page .guide-featured .guide-excerpt { -webkit-line-clamp:3;min-height:auto;font-size:14px; }
        .guides-page .guide-featured .guide-card-footer { margin-top:20px; }
        .guides-page .guide-card[hidden] { display:none; }
        .guides-page .guide-motion { will-change:opacity,transform; }
        @media(prefers-reduced-motion:reduce) { .guides-page *, .guides-page *::before,.guides-page *::after { animation:none!important;transition:none!important;scroll-behavior:auto!important; } .guides-page .guide-motion,.guides-page .guide-card,.guides-page .guide-card.guide-observed { opacity:1!important;transform:none!important;will-change:auto!important; } }
      `}</style>
      <header className="border-b border-white/10 bg-[#111111]">
        <div className="mx-auto flex min-h-[66px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5" aria-label="AURUM LAB, inicio">
            <img src="/brand/aurum-symbol.svg" alt="Símbolo de AURUM LAB" width="36" height="36" className="size-9 object-contain" />
            <span className="leading-tight"><span className="block text-[17px] font-extrabold tracking-tight">AURUM<span className="text-[#C9A227]"> LAB</span></span><span className="block text-[9px] font-medium uppercase tracking-[.15em] text-white/55">Guías técnicas</span></span>
          </Link>
          <Link to="/auth" className="rounded-full border border-[#C9A227]/60 px-4 py-2.5 text-xs font-semibold text-[#C9A227] transition hover:bg-[#C9A227] hover:text-[#111]">Acceder</Link>
        </div>
      </header>
      <section ref={sectionRef} className="relative overflow-hidden border-b border-white/10 bg-[#111111]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[#C9A227]/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-12">
          <p className={`guide-motion ${visible ? "is-visible" : ""} text-[10px] font-bold uppercase tracking-[.24em] text-[#C9A227]`}>AURUM LAB · Conocimiento técnico aplicado</p>
          <h1 className={`guide-motion ${visible ? "is-visible" : ""} mt-3 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl`} style={{ transitionDelay:"70ms" }}>Guías técnicas para trabajar mejor la joyería</h1>
          <p className={`guide-motion ${visible ? "is-visible" : ""} mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base`} style={{ transitionDelay:"140ms" }}>Fórmulas, procesos y respuestas prácticas para metalurgia, diseño, fabricación, gemología y fundición.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#guia-destacada" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#C9A227] px-4 text-sm font-bold text-[#111] transition hover:bg-[#e1c04e]">Guía destacada <ArrowRight className="size-4" /></a>
          <a href="#catalogo-guias" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/20 px-4 text-sm font-semibold text-white transition hover:border-[#C9A227]">Ver las 17 guías</a>
        </div>
      </div>
      </section>

      <section id="guia-destacada" className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {featuredMatches ? card(featured, 0, true) : <p className="sr-only">La guía destacada no coincide con los filtros activos.</p>}
      </section>

      <section id="catalogo-guias" className="mx-auto max-w-7xl px-5 pb-12 sm:px-8 sm:pb-16">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#C9A227]">Biblioteca técnica</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Encuentra la guía que necesitas</h2>
            <p className="mt-2 text-sm text-white/60">Explora por tema o busca una palabra clave.</p>
          </div>
          <label className="relative w-full lg:max-w-sm">
            <span className="sr-only">Buscar guía por título</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/45" aria-hidden="true" />
            <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} type="search" placeholder="Buscar guías…" className="w-full rounded-xl border border-white/15 bg-[#202020] py-3 pl-10 pr-10 text-sm text-white placeholder:text-white/40" />
            {busqueda && <button type="button" onClick={() => setBusqueda("")} aria-label="Limpiar búsqueda" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"><X className="size-4" /></button>}
          </label>
        </div>
        <div className="mt-5 flex flex-wrap gap-2" aria-label="Filtrar por categoría">
          {["Todos", ...categorias].map((category) => (
            <button key={category} type="button" className="guide-filter" aria-pressed={categoriaActiva === category} onClick={() => setCategoriaActiva(category)}>
              {category}<span className="guide-filter-count">{categoryCount(category)}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-white/55" aria-live="polite">{resultCount} {resultCount === 1 ? "guía encontrada" : "guías encontradas"} · {allCount} en total</p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((guide, index) => card(guide, index + 1))}
        </div>
        {resultCount === 0 && <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8 text-center"><p className="font-semibold">No encontramos guías con esos filtros.</p><button type="button" onClick={() => {setCategoriaActiva("Todos");setBusqueda("");}} className="mt-3 text-sm font-semibold text-[#C9A227] underline">Limpiar filtros</button></div>}
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-8">
        <div className="rounded-2xl border border-[#C9A227]/30 bg-[#1b1b1b] p-5 sm:p-7">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#C9A227]">Preguntas frecuentes</p>
          <h2 className="mt-2 text-xl font-bold">Respuestas rápidas para el taller</h2>
          <div className="mt-4 divide-y divide-white/10">
            {guideFaq.map((item) => <details key={item.question} className="py-3"><summary className="cursor-pointer text-sm font-semibold text-white marker:text-[#C9A227]">{item.question}</summary><p className="mt-2 text-sm leading-6 text-white/65">{item.answer}</p></details>)}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#111111]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>AURUM LAB · Guías técnicas para joyeros</span>
          <Link to="/" className="hover:text-[#C9A227]">Inicio</Link>
        </div>
      </footer>
    </main>
  );
}
