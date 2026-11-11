import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Calculator, Info } from "lucide-react";
import { PrecioOroDiario } from "@/components/PrecioOroDiario";

const preguntas = [
  { pregunta: "¿Cuánto cuesta un gramo de oro hoy en Perú?", respuesta: "El precio de referencia por gramo cambia durante la jornada según la cotización internacional del oro y el tipo de cambio. Consulta el valor que aparece en la calculadora y revisa siempre su fecha y hora." },
  { pregunta: "¿Cuánto vale un gramo de oro de 18 quilates?", respuesta: "El oro de 18 quilates contiene aproximadamente 750 partes de oro fino por cada 1.000 partes de aleación. Como referencia teórica, su valor metálico se estima multiplicando el precio del gramo de oro puro por 0,750. El precio comercial puede ser distinto." },
  { pregunta: "¿Cuál es la diferencia entre oro de 24K y oro de 18K?", respuesta: "El oro de 24K es oro de alta pureza, mientras que el de 18K contiene 75 % de oro fino y el resto corresponde a otros metales de la aleación. A igual peso, una pieza de 18K contiene menos oro fino." },
  { pregunta: "¿El valor calculado es el precio al que una joyería compra mi oro?", respuesta: "No necesariamente. La calculadora estima el valor teórico del contenido de oro según peso y ley. Una oferta de compra puede considerar análisis de pureza, mermas, costes de refinación, condiciones comerciales y margen del comprador." },
  { pregunta: "¿Cómo se convierte la cotización internacional a precio por gramo?", respuesta: "La cotización internacional suele expresarse por onza troy. Para obtener una referencia por gramo se convierte usando 1 onza troy = 31,1034768 gramos y después se aplica el tipo de cambio de la moneda elegida." },
];

export const Route = createFileRoute("/precio-del-oro-hoy")({
  head: () => ({
    meta: [
      { title: "Precio del oro hoy en Perú: valor por gramo 24K y 18K | AURUM LAB" },
      { name: "description", content: "Consulta el precio referencial del oro hoy en Perú por gramo y calcula el valor teórico de oro de 24K, 22K, 18K, 14K y otras leyes según su peso." },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Precio del oro hoy en Perú por gramo | AURUM LAB" },
      { property: "og:description", content: "Consulta una cotización referencial del oro y estima su valor según peso, quilates y moneda." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.tallerdeljoyero.com/precio-del-oro-hoy" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://www.tallerdeljoyero.com/precio-del-oro-hoy" }],
  }),
  component: PrecioDelOroHoyPage,
});

function PrecioDelOroHoyPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://www.tallerdeljoyero.com/precio-del-oro-hoy#webpage",
        url: "https://www.tallerdeljoyero.com/precio-del-oro-hoy",
        name: "Precio del oro hoy en Perú por gramo",
        description: "Cotización referencial del oro por gramo y calculadora de valor teórico según peso y quilates.",
        inLanguage: "es-PE",
      },
      {
        "@type": "FAQPage",
        mainEntity: preguntas.map((item) => ({
          "@type": "Question",
          name: item.pregunta,
          acceptedAnswer: { "@type": "Answer", text: item.respuesta },
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-white text-[#17232d]">
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      <div className="mx-auto max-w-[1320px] px-5 pt-6 sm:px-8 lg:px-12">
        <Link to="/" className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-[#876500]"><ArrowLeft className="size-4" /> Volver a AURUM LAB</Link>
        <header className="mx-auto max-w-4xl py-9 text-center sm:py-12">
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">Cotización y calculadora de oro</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-[-.035em] text-[#17232d] sm:text-4xl lg:text-5xl">Precio del oro hoy en Perú: valor por gramo en 24K y 18K</h1>
          <p className="mx-auto mt-5 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">Consulta una referencia del precio del oro por gramo y calcula el valor teórico de una cantidad de oro según su peso, quilataje y moneda. La cotización cambia con el mercado internacional y el tipo de cambio.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-1.5"><Info className="size-3.5 text-[#987400]" /> Cotización referencial</span><span>·</span><span>Precio por gramo</span><span>·</span><span>Calculadora gratuita</span>
          </div>
        </header>
      </div>
      <PrecioOroDiario />
      <section className="mx-auto max-w-[1120px] px-5 py-12 sm:px-8 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-14">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">Guía rápida</p>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">Cómo entender el precio del oro por gramo</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">El precio de referencia del oro depende de la cotización internacional del oro fino y del tipo de cambio. Para comparar cantidades pequeñas, la cotización se expresa habitualmente por gramo; para operaciones internacionales también se utiliza la onza troy.</p>
          </div>
          <div className="space-y-5 text-sm leading-7 text-slate-600">
            <div><h3 className="font-bold text-[#17232d]">De la onza troy al gramo</h3><p className="mt-1">Una onza troy equivale a 31,1034768 gramos. Si la referencia internacional está expresada por onza, se divide entre esa equivalencia para obtener el precio de un gramo de oro fino. Después se convierte a la moneda local con el tipo de cambio correspondiente.</p></div>
            <div><h3 className="font-bold text-[#17232d]">Qué significan los quilates</h3><p className="mt-1">Los quilates indican la proporción de oro fino en una aleación. Como referencia, 24K representa oro de alta pureza; 18K corresponde a 750 milésimas y 14K a 585 milésimas aproximadamente. El resto de la composición está formado por otros metales.</p></div>
            <div><h3 className="font-bold text-[#17232d]">Valor teórico y precio comercial</h3><p className="mt-1">El cálculo estima únicamente el contenido metálico según el peso y la ley seleccionada. No incluye piedras, diseño, mano de obra, fabricación, impuestos, análisis de pureza, mermas ni márgenes comerciales. No debe interpretarse como una oferta de compra o venta.</p></div>
          </div>
        </div>
        <div className="mt-12 rounded-2xl border border-[#eadca8] bg-[#fffaf0] p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#987400]"><Calculator className="size-5" /></span>
            <div><h2 className="text-lg font-extrabold text-[#17232d]">Calcula el valor teórico de una joya de oro</h2><p className="mt-2 text-sm leading-6 text-slate-600">Introduce el peso de la pieza y selecciona su ley para estimar cuánto oro fino contiene. Si necesitas preparar una aleación, utiliza nuestra herramienta específica.</p><Link to="/herramientas-publicas/$herramienta" params={{ herramienta: "aleacion-oro" }} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#17232d] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#293b49]">Abrir calculadora de aleaciones <ArrowRight className="size-3.5" /></Link></div>
          </div>
        </div>
        <div className="mt-14">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">Respuestas claras</p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#17232d] sm:text-3xl">Preguntas frecuentes sobre el precio del oro</h2>
          <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
            {preguntas.map((item) => <details key={item.pregunta} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-[#17232d] marker:hidden">{item.pregunta}<span className="text-lg text-[#987400] transition-transform group-open:rotate-45">+</span></summary><p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">{item.respuesta}</p></details>)}
          </div>
        </div>
      </section>
      <footer className="border-t border-slate-200 bg-[#f8fafc]"><div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-5 py-7 text-xs text-slate-500 sm:px-8"><span>AURUM LAB · Herramientas para joyeros</span><Link to="/" className="inline-flex items-center gap-2 font-semibold text-[#765900] hover:text-[#17232d]">Volver al inicio <ArrowRight className="size-3.5" /></Link></div></footer>
    </main>
  );
}
