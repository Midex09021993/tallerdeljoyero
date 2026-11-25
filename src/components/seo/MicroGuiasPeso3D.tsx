import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Calculator } from "lucide-react";

export const microGuiasPeso3D = {
  "calcular-peso-anillo-oro-antes-fundir": {
    title: "Cómo calcular el peso de un anillo de oro antes de fundirlo",
    description: "Estima el peso de un anillo CAD antes de fabricarlo: volumen del modelo, densidad de la aleación, unidades y margen de proceso.",
    intro: "Antes de fundir un anillo, el modelo CAD permite obtener una estimación de masa que ayuda a planificar material, costo y tamaño de la carga. El resultado depende del volumen real del modelo y de la densidad de la aleación seleccionada.",
    formula: "Masa teórica (g) = volumen (cm³) × densidad (g/cm³)",
    example: "Si el volumen sólido del anillo es 1,20 cm³ y la densidad de referencia de la aleación es 15,5 g/cm³, la masa teórica es 18,6 g. Es un ejemplo de cálculo: utiliza la densidad correspondiente a tu composición real.",
    steps: ["Comprueba que el anillo sea una geometría cerrada y que no tenga superficies duplicadas o huecos.", "Confirma las unidades del modelo: mm³, cm³ u otra unidad.", "Obtén el volumen del sólido, sin incluir soportes o elementos que no serán parte de la pieza.", "Selecciona la densidad de la aleación que realmente fabricarás.", "Multiplica volumen por densidad y añade por separado la previsión de material para árbol, canales y proceso."],
    note: "El peso del anillo terminado no es el mismo que el peso de metal que se prepara para fundir. El árbol, canales, botones y margen de carga deben estimarse aparte y dependen del proceso.",
    faqs: [["¿El CAD me da el peso exacto?", "Puede estimarlo con precisión si la geometría, unidades y densidad son correctas; no incluye variaciones de fabricación ni acabados."],["¿Debo incluir el árbol de colada?", "No dentro del peso de la pieza. Calcula la pieza y el sistema de colada por separado para planificar la carga."],["¿Sirve para oro 18K?", "Sí, siempre que uses una densidad de referencia adecuada para la aleación 18K específica; los colores y composiciones pueden variar."]]
  },
  "calcular-peso-oro-archivo-stl": {
    title: "Cómo calcular el peso de oro desde un archivo STL",
    description: "Aprende a estimar el peso de una joya STL usando volumen, escala, densidad de metal y revisión de la malla antes de fabricar.",
    intro: "Un archivo STL describe una superficie triangulada; no contiene por sí mismo el peso del oro. Para estimarlo hay que comprobar escala y cierre de malla, obtener un volumen válido y aplicar la densidad de la aleación.",
    formula: "Peso (g) = volumen STL (cm³) × densidad del metal (g/cm³)",
    example: "Un volumen de 850 mm³ equivale a 0,85 cm³. Si se usa una densidad de referencia de 15,5 g/cm³, la estimación es 13,175 g. Verifica que el STL esté realmente en milímetros y que la densidad corresponda al material.",
    steps: ["Importa el STL y revisa que su tamaño dimensional sea razonable.", "Comprueba si la malla es cerrada, manifold y libre de errores que alteren el cálculo de volumen.", "Revisa si el STL incluye cavidades, detalles, engastes o elementos que deban excluirse.", "Obtén el volumen y confirma sus unidades.", "Selecciona el material y calcula la masa teórica; valida el resultado antes de cotizar o producir."],
    note: "STL no almacena una unidad universal. Un modelo exportado en milímetros e importado como pulgadas o centímetros puede producir un error de escala muy grande. Comprueba dimensiones conocidas.",
    faqs: [["¿El STL incluye el peso?", "No normalmente. Incluye la geometría triangulada; el peso se estima con volumen y densidad."],["¿Un STL abierto permite calcular volumen?", "Algunas aplicaciones intentan reparar o aproximar la malla, pero una superficie abierta puede producir un volumen incorrecto. Repara y valida antes de confiar en el resultado."],["¿Puedo usar cualquier densidad de oro 18K?", "Usa una densidad representativa de la composición que fabricarás. Oro amarillo, rosa y blanco pueden tener distintas composiciones y densidades."]]
  },
  "calcular-peso-joya-volumen": {
    title: "Cómo calcular el peso de una joya según su volumen",
    description: "Convierte el volumen de un modelo de joyería a gramos usando densidad. Fórmula, conversión de unidades y ejemplo práctico.",
    intro: "Si conoces el volumen de una pieza, puedes estimar su masa mediante la densidad del material. Es una relación física sencilla, pero exige mantener las unidades consistentes y utilizar una densidad apropiada.",
    formula: "Masa (g) = volumen (cm³) × densidad (g/cm³)",
    example: "Para 500 mm³: convierte a 0,500 cm³. Con una densidad de referencia de 10,5 g/cm³, la masa sería 5,25 g. El ejemplo no identifica una aleación concreta; confirma siempre su densidad.",
    steps: ["Obtén el volumen geométrico del sólido.", "Convierte mm³ a cm³ dividiendo entre 1000; 1 cm³ equivale a 1000 mm³.", "Busca o confirma la densidad del material en g/cm³.", "Multiplica volumen por densidad.", "Revisa si el volumen corresponde a toda la pieza o solo a una parte del diseño."],
    note: "La densidad cambia según composición y porosidad. El cálculo representa una pieza sólida ideal; no contempla huecos internos, poros, pérdidas, piedras u otros componentes salvo que estén incluidos correctamente en el modelo.",
    faqs: [["¿Cómo convierto mm³ a cm³?", "Divide los milímetros cúbicos entre 1000. Por ejemplo, 1250 mm³ = 1,25 cm³."],["¿Puedo calcular gramos directamente desde mm³?", "Sí, si conviertes las unidades o usas una densidad expresada compatible con mm³. Evita mezclar unidades."],["¿La densidad es igual para todos los metales?", "No. Cada metal y aleación tiene su densidad característica; selecciona el valor correcto."]]
  },
  "cuanto-oro-necesito-fabricar-joya": {
    title: "Cuánto oro necesitas para fabricar una joya",
    description: "Calcula el metal necesario para una joya CAD y separa el peso de la pieza, árbol de colada y margen de fabricación.",
    intro: "Para planificar una fabricación conviene distinguir tres cantidades: el peso estimado de la pieza terminada, el metal que forma el sistema de colada y el material adicional que el proceso requiere. La suma se planifica con datos del taller, no con un porcentaje universal.",
    formula: "Carga estimada = peso de pieza + sistema de colada + margen definido por el proceso",
    example: "Si la pieza se estima en 12 g, el sistema de colada calculado en 3 g y el margen de carga que tu taller define en 2 g, la planificación sería 17 g. Los valores son ilustrativos, no una receta de fundición.",
    steps: ["Calcula el peso teórico de la pieza desde el CAD.", "Determina la geometría y masa del árbol, canales y botón de acuerdo con tu sistema.", "Aplica el margen de carga o recuperación que utiliza tu taller y proceso.", "Considera la ley y composición del metal; si necesitas ajustar quilataje, calcula esa mezcla por separado.", "Registra la carga planificada y compara luego con el consumo real para mejorar futuras estimaciones."],
    note: "No existe un porcentaje de sobrecarga universal válido para todos los diseños y equipos. El sistema de colada, cilindro, aleación, proceso, recuperación y experiencia del taller determinan el material adicional.",
    faqs: [["¿El peso CAD es todo el oro que debo preparar?", "No. Es una estimación de la pieza. Debes planificar por separado el árbol y la carga del proceso."],["¿Puedo sumar un porcentaje fijo?", "Solo si ese porcentaje está validado para tu proceso. Evita usar una cifra genérica como regla universal."],["¿La liga cambia el cálculo?", "Sí, si calculas una carga de una ley diferente. Primero determina la masa total y después calcula la composición necesaria según la ley objetivo."]]
  },
  "estimar-peso-oro-impresion-resina": {
    title: "Cómo estimar el peso del oro desde una impresión de resina",
    description: "Usa el peso de una impresión de resina como referencia para estimar el volumen y el peso de metal, con advertencias sobre densidad y diferencias de material.",
    intro: "El peso de una impresión de resina puede servir como referencia aproximada si conoces la densidad de la resina y la pieza impresa corresponde a la misma geometría que se fundirá. No es una conversión directa de gramos de resina a gramos de oro.",
    formula: "Volumen aproximado (cm³) = masa de resina (g) ÷ densidad de resina (g/cm³); metal (g) ≈ volumen × densidad del metal",
    example: "Si una impresión pesa 2,0 g y la densidad documentada de esa resina es 1,10 g/cm³, su volumen aproximado es 1,82 cm³. Con una densidad de metal de referencia de 15,5 g/cm³, el equivalente teórico sería 28,2 g. Confirma las densidades y que la impresión sea maciza y corresponda al modelo.",
    steps: ["Pesa la impresión limpia y seca, sin soportes ni residuos que no pertenezcan a la pieza.", "Confirma la densidad de la resina específica según su ficha técnica.", "Estima el volumen a partir de masa y densidad; revisa si el modelo es hueco o tiene soportes.", "Multiplica el volumen por la densidad del metal que deseas estimar.", "Compara con el cálculo CAD y revisa las diferencias antes de preparar metal."],
    note: "Este método se vuelve poco fiable si la impresión tiene soportes, huecos, drenajes, residuos, curado incompleto, geometría modificada o una densidad de resina desconocida. La estimación CAD por volumen suele ser preferible cuando el archivo está disponible y validado.",
    faqs: [["¿Un gramo de resina equivale a un gramo de oro?", "No. La masa depende de la densidad. El mismo volumen de oro puede pesar mucho más que la resina."],["¿Puedo usar el peso de la impresión con soportes?", "No sin separar o estimar la masa de soportes y otros elementos, porque distorsionan el volumen de la pieza."],["¿Es mejor el cálculo desde STL?", "Si la malla está validada y a escala, calcular directamente el volumen CAD suele ser un método más controlable."]]
  }
} as const;

export type MicroGuiaPeso3DSlug = keyof typeof microGuiasPeso3D;

export function MicroGuiaPeso3D({ slug }: { slug: MicroGuiaPeso3DSlug }) {
  const guia = microGuiasPeso3D[slug];
  return (
    <main className="min-h-screen bg-[#fffefa] text-[#17232d]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[68px] max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/guias" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#987400]"><ArrowLeft className="size-4" /> Guías técnicas</Link>
          <Link to="/herramientas-publicas/peso-joya-3d" className="rounded-full bg-[#17232d] px-4 py-2.5 text-xs font-semibold text-white">Calculadora de peso 3D</Link>
        </div>
      </header>
      <article className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <nav aria-label="Ruta de navegación" className="text-xs text-slate-500"><Link to="/guias" className="hover:text-[#876500]">Guías técnicas</Link><span aria-hidden="true"> / </span><Link to="/guias/calcular-peso-joya-modelo-3d" className="hover:text-[#876500]">Peso de joyas 3D</Link><span aria-hidden="true"> / </span><span>Microguía</span></nav>
        <header className="mt-6 rounded-[1.75rem] border border-[#eadca7] bg-gradient-to-br from-[#fff9e8] via-white to-[#f5f7fa] p-6 sm:p-9">
          <span className="rounded-full border border-[#e8d7a4] bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-[#987400]">Diseño y fabricación · AURUM LAB</span>
          <h1 className="mt-5 text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">{guia.title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">{guia.intro}</p>
          <p className="mt-3 text-xs font-medium text-slate-400">Guía práctica · Estimaciones en gramos</p>
        </header>
        <section className="mt-7 rounded-2xl border border-[#e8dfc7] bg-[#fffaf0] p-5 sm:p-6">
          <h2 className="text-lg font-bold">Fórmula de referencia</h2>
          <p className="mt-3 rounded-xl border border-[#eadfbe] bg-white p-4 text-center font-mono text-sm leading-6 text-[#17232d]">{guia.formula}</p>
          <p className="mt-4 text-sm leading-7 text-slate-700">{guia.example}</p>
        </section>
        <section className="mt-8">
          <h2 className="text-xl font-bold">Procedimiento recomendado</h2>
          <ol className="mt-4 space-y-3">{guia.steps.map((step, i) => <li key={step} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#fff3c1] text-xs font-bold text-[#8f6b00]">{i + 1}</span><span>{step}</span></li>)}</ol>
        </section>
        <aside className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Nota técnica:</strong> {guia.note}</aside>
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-xl font-bold">Preguntas frecuentes</h2>
          <div className="mt-4 divide-y divide-slate-100">{guia.faqs.map(([question, answer]) => <details key={question} className="py-3 first:pt-0 last:pb-0"><summary className="cursor-pointer text-sm font-semibold">{question}</summary><p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p></details>)}</div>
        </section>
        <section className="mt-8 rounded-2xl border border-[#eadca7] bg-gradient-to-br from-[#fff9df] to-white p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#876500]">Llévalo a la práctica</p><h2 className="mt-2 text-xl font-bold">Calcula el peso de tu modelo 3D</h2><p className="mt-2 text-sm leading-6 text-slate-600">Usa la herramienta pública de AURUM LAB para estimar masa según el modelo y material.</p></div><Link to="/herramientas-publicas/peso-joya-3d" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#17232d] px-5 py-3 text-sm font-semibold text-white"><Calculator className="size-4" /> Abrir calculadora <ArrowRight className="size-4" /></Link></div>
        </section>
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">Guía principal del cluster</h2><p className="mt-2 text-sm leading-6 text-slate-600">Amplía el procedimiento para validar volumen, unidades y densidad desde un modelo de joyería.</p><Link to="/guias/calcular-peso-joya-modelo-3d" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#876500]">Cómo estimar el peso de una joya a partir de un modelo 3D <ArrowRight className="size-4" /></Link>
        </section>
      </article>
    </main>
  );
}
