import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Calculator, BookOpen } from "lucide-react";

export const microGuiasOro = {
  "convertir-oro-14k-a-18k": {
    title: "Cómo pasar oro de 14K a 18K: cálculo en gramos",
    description: "Calcula cuánto oro fino necesitas añadir para elevar una aleación de 14 quilates a 18K. Fórmula, ejemplo en gramos y diferencias entre 14K nominal y 585‰.",
    intro: "Para elevar la ley de oro de 14K a 18K se añade oro fino de 24K. La cantidad depende del peso inicial y de la ley real del material; esta guía muestra el balance teórico y cómo comprobarlo.",
    formula: "x = m × (f objetivo − f inicial) ÷ (1 − f objetivo)",
    example: "Ejemplo con 10 g de oro 14K exacto (14/24 = 0,583333): para llegar a 18K (0,750) se añaden aproximadamente 6,67 g de oro fino. El peso final teórico es 16,67 g.",
    steps: ["Pesa el material inicial y confirma su ley, preferiblemente mediante ensayo o documentación.", "Convierte la ley a fracción decimal: 14K exacto equivale a 14/24; si el lote está marcado o ensayado en milésimas, usa ese valor real.", "Define la ley objetivo (18K nominal = 0,750).", "Calcula la masa de oro fino a añadir con la fórmula.", "Verifica el lote y considera pérdidas o contaminación del proceso."],
    note: "No confundas 14K exacto (14/24 = 583,33‰) con una aleación comercial marcada 585‰. La diferencia afecta al cálculo. La mezcla teórica tampoco garantiza color, dureza ni otras propiedades.",
    faqs: [
      ["¿Cuánto oro fino agrego a 10 gramos de 14K para obtener 18K?", "Si el material es 14K exacto (14/24), el cálculo teórico da 6,67 g de oro fino. Si su ley real es 585‰, da 6,60 g. Confirma la ley inicial antes de preparar el lote."],
      ["¿Puedo usar oro de 22K en lugar de oro fino?", "Sí, matemáticamente puede calcularse la mezcla con una ley añadida conocida, pero la fórmula cambia porque el material agregado también contiene liga. La calculadora de aleaciones permite modelar mezclas de leyes conocidas."],
      ["¿El resultado garantiza 18K después de fundir?", "No. Es un balance teórico. La ley real depende de los materiales y del proceso; confirma con ensayo apropiado cuando necesites verificar la composición."]
    ]
  },
  "bajar-oro-24k-a-18k": {
    title: "Cómo bajar oro de 24K a 18K calculando la liga",
    description: "Aprende a calcular la cantidad teórica de liga que se añade a oro fino de 24K para obtener 18K, con fórmula y ejemplo práctico en gramos.",
    intro: "Para reducir oro fino de 24K a 18K, se añade una aleación sin oro fino o de composición conocida hasta que la proporción de oro represente el 75 % de la masa final. El cálculo determina la masa total añadida, no una receta universal de color.",
    formula: "x = m × (f inicial − f objetivo) ÷ f objetivo",
    example: "Con 10 g de oro fino 24K y una ley objetivo de 18K (0,750), la cantidad teórica de liga sin oro es 3,33 g. El lote final pesaría 13,33 g.",
    steps: ["Confirma el peso del oro inicial y su finura.", "Expresa la ley inicial y la ley objetivo como fracciones decimales.", "Calcula la liga total necesaria con la fórmula.", "Selecciona una formulación compatible con el color, las propiedades y el proceso.", "Registra las masas y verifica la composición final según el control de tu taller."],
    note: "La fórmula calcula cuánto material añadido se requiere en un balance de masa. No determina la proporción de cobre, plata, zinc, paladio u otros metales: utiliza una formulación metalúrgica y ficha técnica apropiadas.",
    faqs: [
      ["¿Cuánta liga se agrega a 10 g de oro 24K para hacer 18K?", "En el supuesto de oro fino y liga sin oro, se agregan teóricamente 3,33 g."],
      ["¿La liga para oro amarillo, rosa y blanco es igual?", "No. La composición influye en color, propiedades y comportamiento de fabricación. La cantidad total calculada no es una receta de composición."],
      ["¿Puedo bajar oro de 24K a 18K con plata solamente?", "El balance de ley puede calcularse, pero la selección del metal o aleación debe responder a las propiedades y color requeridos. No asumas que una adición única es apropiada para todos los usos."]
    ]
  },
  "calcular-oro-fino-18k-14k-9k": {
    title: "Cuánto oro fino contiene una pieza de 18K, 14K y 9K",
    description: "Consulta el porcentaje y milésimas de oro fino de 18K, 14K y 9K, y calcula el contenido de oro puro en una pieza según su peso.",
    intro: "El quilataje expresa la proporción de oro fino respecto de 24 partes. Para estimar oro fino en una pieza, multiplica su peso por la fracción de ley. La cifra es teórica si la ley no ha sido comprobada.",
    formula: "Oro fino (g) = peso de la pieza (g) × ley como fracción",
    example: "En una pieza de 10 g de 18K nominal, el contenido teórico de oro fino es 7,50 g. En 10 g de 14K exacto, son 5,833 g; en 10 g de 9K, son 3,75 g.",
    steps: ["Pesa la pieza sin incluir elementos que no correspondan al cálculo.", "Identifica el quilataje o la finura documentada.", "Convierte el quilataje a fracción: K ÷ 24.", "Multiplica el peso por la fracción de oro fino.", "Si la pieza contiene soldaduras, piedras, recubrimientos o componentes distintos, considera que el cálculo global puede no representar su composición uniforme."],
    note: "14K exacto corresponde a 14/24 = 583,33‰. En algunos mercados se usa 585‰ para productos comerciales de 14K; emplea la ley documentada o ensayada del lote cuando esté disponible.",
    faqs: [
      ["¿18K equivale a 75 % de oro?", "Sí, como ley nominal: 18 de 24 partes equivale a 0,750 o 750‰."],
      ["¿Cuánto oro fino hay en 1 gramo de 9K?", "Para 9K nominal, 9/24 equivale a 0,375 g de oro fino por cada gramo de aleación."],
      ["¿Por qué 14K puede aparecer como 585?", "14/24 es 583,33‰; 585‰ es una finura comercial habitual asociada a 14K. La diferencia debe considerarse en cálculos precisos."]
    ]
  },
  "calcular-liga-oro-18k-14k": {
    title: "Cómo calcular la liga que debes añadir al oro",
    description: "Calcula la masa de metal de liga necesaria para ajustar oro a una ley objetivo. Fórmula de balance, ejemplos y límites para joyería.",
    intro: "Cuando se reduce la ley añadiendo una liga sin oro fino, se conserva la masa de oro inicial y aumenta la masa total. El cálculo de la liga es un balance de masa; la receta de metales debe seleccionarse por separado.",
    formula: "Liga a añadir (g) = m inicial × (f inicial − f objetivo) ÷ f objetivo",
    example: "Para 20 g de oro 18K nominal (0,750) y bajar a 14K exacto (0,583333), el cálculo teórico es 5,71 g de liga sin oro fino. Si la ley objetivo se expresa como 585‰, el resultado cambia ligeramente.",
    steps: ["Obtén el peso y la ley inicial del lote.", "Define la ley final en fracción decimal o milésimas.", "Asegúrate de que la ley objetivo sea menor que la inicial para este procedimiento.", "Calcula la cantidad total de liga que se añadirá.", "Determina por separado la composición de la liga adecuada y verifica el lote."],
    note: "Esta fórmula supone que la liga añadida no contiene oro fino. Si la segunda aleación sí contiene oro, utiliza el balance de mezcla de dos leyes conocido; no apliques esta fórmula directamente.",
    faqs: [
      ["¿La fórmula sirve para cualquier quilataje?", "Sí, dentro de sus supuestos: la ley objetivo debe ser menor que la inicial y la liga añadida debe tener ley cero de oro fino."],
      ["¿Qué pasa si la liga contiene oro?", "La masa añadida contiene oro y cambia el balance. Debe calcularse como mezcla de dos materiales de finura conocida."],
      ["¿El cálculo decide qué metales usar?", "No. Solo calcula masa total añadida. La composición de la liga depende del color, dureza, soldabilidad y especificaciones del proceso."]
    ]
  },
  "diferencia-oro-14k-585-milesimas": {
    title: "Diferencia entre oro 14K, 583 y 585 milésimas",
    description: "Entiende la equivalencia matemática entre 14 quilates y 583,33 milésimas, por qué se usa 585 y cómo elegir la ley correcta para tus cálculos.",
    intro: "El quilataje y las milésimas expresan la finura del oro en escalas distintas. 14K se calcula como 14 partes de oro de cada 24; expresado en milésimas equivale a 583,33‰. La marca 585‰ representa 58,5 % de oro fino y es una finura comercial habitual asociada a 14K.",
    formula: "Milésimas = (K ÷ 24) × 1000",
    example: "14 ÷ 24 × 1000 = 583,33‰. En cambio, 585‰ equivale a 0,585 de oro fino. En una masa de 100 g, esa diferencia equivale a aproximadamente 0,167 g de oro fino.",
    steps: ["Identifica si el dato del material está expresado en quilates nominales o milésimas.", "Convierte 14K usando 14/24 si necesitas la equivalencia matemática exacta.", "Si el lote está marcado o ensayado como 585‰, usa 0,585 para el balance.", "No sustituyas la finura real por un valor nominal cuando el cálculo requiera precisión.", "Revisa la normativa y tolerancias aplicables al mercado donde se comercializa la pieza."],
    note: "Las marcas de finura y las tolerancias legales varían por mercado. Esta guía explica la equivalencia matemática y no constituye una interpretación legal de marcado.",
    faqs: [
      ["¿14K es 583 o 585?", "La equivalencia matemática de 14/24 es 583,33‰. 585‰ es una finura comercial habitual identificada como 14K en determinados mercados."],
      ["¿La diferencia afecta al calcular una aleación?", "Sí. Aunque es pequeña, puede cambiar la cantidad calculada cuando se trabaja con masas o leyes precisas. Usa la ley real documentada."],
      ["¿585 significa 58,5 % de oro?", "Sí: 585 partes de oro por cada 1000 partes de masa equivalen a 58,5 %."]
    ]
  }
} as const;

export type MicroGuiaOroSlug = keyof typeof microGuiasOro;

export function MicroGuiaOro({ slug }: { slug: MicroGuiaOroSlug }) {
  const guia = microGuiasOro[slug];
  return (
    <main className="min-h-screen bg-[#fffefa] text-[#17232d]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[68px] max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/guias" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#987400]"><ArrowLeft className="size-4" /> Guías técnicas</Link>
          <Link to="/herramientas-publicas/$herramienta" params={{ herramienta: "aleacion-oro" }} className="rounded-full bg-[#17232d] px-4 py-2.5 text-xs font-semibold text-white">Calculadora de aleaciones</Link>
        </div>
      </header>
      <article className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <nav aria-label="Ruta de navegación" className="text-xs text-slate-500"><Link to="/guias" className="hover:text-[#876500]">Guías técnicas</Link><span aria-hidden="true"> / </span><span>Metalurgia y materiales</span></nav>
        <header className="mt-6 rounded-[1.75rem] border border-[#eadca7] bg-gradient-to-br from-[#fff9e8] via-white to-[#f5f7fa] p-6 sm:p-9">
          <span className="rounded-full border border-[#e8d7a4] bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">Microguía técnica · AURUM LAB</span>
          <h1 className="mt-5 text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">{guia.title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">{guia.intro}</p>
          <p className="mt-3 text-xs font-medium text-slate-400">Lectura práctica · Cálculos teóricos en gramos</p>
        </header>
        <section className="mt-7 rounded-2xl border border-[#e8dfc7] bg-[#fffaf0] p-5 sm:p-6">
          <h2 className="text-lg font-bold">Fórmula de cálculo</h2>
          <p className="mt-3 rounded-xl border border-[#eadfbe] bg-white p-4 text-center font-mono text-sm leading-6 text-[#17232d]">{guia.formula}</p>
          <p className="mt-4 text-sm leading-7 text-slate-700">{guia.example}</p>
        </section>
        <section className="mt-8">
          <h2 className="text-xl font-bold">Procedimiento paso a paso</h2>
          <ol className="mt-4 space-y-3">
            {guia.steps.map((step, i) => <li key={step} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#fff3c1] text-xs font-bold text-[#8f6b00]">{i + 1}</span><span>{step}</span></li>)}
          </ol>
        </section>
        <aside className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Nota técnica:</strong> {guia.note}</aside>
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-xl font-bold">Preguntas frecuentes</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {guia.faqs.map(([question, answer]) => <details key={question} className="py-3 first:pt-0 last:pb-0"><summary className="cursor-pointer text-sm font-semibold">{question}</summary><p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p></details>)}
          </div>
        </section>
        <section className="mt-8 rounded-2xl border border-[#eadca7] bg-gradient-to-br from-[#fff9df] to-white p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]">Llévalo a la práctica</p><h2 className="mt-2 text-xl font-bold">Calcula tu aleación de oro</h2><p className="mt-2 text-sm leading-6 text-slate-600">Introduce las leyes y masas de tus materiales para obtener una estimación de balance.</p></div>
            <Link to="/herramientas-publicas/$herramienta" params={{ herramienta: "aleacion-oro" }} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#17232d] px-5 py-3 text-sm font-semibold text-white"><Calculator className="size-4" /> Abrir calculadora <ArrowRight className="size-4" /></Link>
          </div>
        </section>
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold"><BookOpen className="size-5 text-[#987400]" /> Guía principal del cluster</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Consulta la explicación completa de leyes, balances de masa, mezcla de aleaciones y controles de taller.</p>
          <Link to="/guias/$slug" params={{ slug: "calcular-aleaciones-oro-18k-14k-9k" }} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#876500]">Cómo calcular aleaciones de oro de 18K, 14K y 9K <ArrowRight className="size-4" /></Link>
        </section>
      </article>
    </main>
  );
}
