import { useState } from "react";
import { Bot, X, BookOpen, Lightbulb, ChevronDown } from "lucide-react";
import { AuriChat, AuriMascota } from "@/components/auri/AuriChat";

type Props = { contexto: string };

type Refuerzo = { termino: string; definicion: string; aplicacion: string; recuerda: string };

const REFUERZOS_SESION_1: Record<number, Refuerzo> = {
  1: { termino: "CAD · Computer-Aided Design", definicion: "Significa «diseño asistido por computadora». CAD reúne herramientas digitales que ayudan al profesional a crear, revisar y modificar un diseño.", aplicacion: "En joyería permite estudiar la forma, las proporciones, las dimensiones y la ubicación de los componentes antes de fabricar la pieza.", recuerda: "La computadora es una herramienta: el criterio y las decisiones de diseño siguen siendo del joyero." },
  2: { termino: "Rhinoceros 7 · Rhino", definicion: "Rhinoceros es un programa de diseño y modelado tridimensional. «Rhino» es la forma abreviada con la que normalmente se conoce.", aplicacion: "En el curso se utiliza como entorno para construir y revisar modelos digitales de joyería.", recuerda: "En esta primera sesión el objetivo es reconocer el entorno y navegar; todavía no construir geometría." },
  3: { termino: "Interfaz · espacio de trabajo", definicion: "La interfaz es el conjunto de elementos visuales con los que interactúas: vistas, barras de herramientas, paneles y línea de comandos.", aplicacion: "Reconocer cada zona permite localizar herramientas y entender dónde aparecen las indicaciones de Rhino y MatrixGold.", recuerda: "La captura de esta guía corresponde a MatrixGold 3.1; no debe confundirse con la interfaz estándar de Rhino 7." },
  4: { termino: "Vistas y ejes X, Y, Z", definicion: "Top, Front y Right son vistas paralelas desde distintas direcciones. Perspective permite apreciar profundidad. Los ejes X, Y y Z representan las tres direcciones principales del espacio.", aplicacion: "Estas vistas ayudan a observar la joya desde arriba, frente, costado y perspectiva para comprender su orientación y volumen.", recuerda: "Cambiar de vista cambia cómo observas el modelo, no la geometría que ya existe." },
  5: { termino: "Zoom · Pan · Orbit", definicion: "Zoom acerca o aleja; Pan desplaza el encuadre; y orbitar cambia la orientación desde la que observas el modelo.", aplicacion: "Dominar estos movimientos permite inspeccionar una pieza sin modificar sus objetos.", recuerda: "Navegar por la vista no es lo mismo que mover o editar la geometría." },
  6: { termino: "Configuración inicial", definicion: "Es la revisión del espacio de trabajo antes de comenzar: vistas disponibles, línea de comandos, vista activa y unidades del documento.", aplicacion: "Una comprobación inicial evita trabajar desorientado o interpretar incorrectamente las medidas del archivo.", recuerda: "En esta práctica conserva las unidades y el contenido original, tal como indica el docente." },
  7: { termino: "Manufactura aditiva · impresión 3D", definicion: "La manufactura aditiva construye un objeto físico a partir de un modelo digital mediante la incorporación sucesiva de material. La impresión 3D es una de sus tecnologías.", aplicacion: "En el flujo presentado: diseño CAD → preparación del modelo → impresión 3D → proceso de fabricación de la joya.", recuerda: "El modelo digital es el punto de partida; la preparación y el proceso de fabricación también requieren revisión." },
  8: { termino: "Práctica guiada · navegación", definicion: "Una práctica guiada permite ejercitar una habilidad concreta siguiendo pasos y comprobando el resultado.", aplicacion: "Aquí se practica zoom, desplazamiento, giro de Perspective y recuperación del encuadre con el archivo de referencia de FADILAB.", recuerda: "El archivo de práctica es solo para navegar: no debes crear, seleccionar, mover, borrar ni modificar sus objetos." },
  9: { termino: "Repaso · dominio del entorno", definicion: "El repaso recupera los conocimientos esenciales y permite comprobar si puedes utilizarlos sin depender continuamente de la guía.", aplicacion: "Debes reconocer la interfaz, las vistas, los ejes y los movimientos básicos de navegación en Rhino 7.", recuerda: "El siguiente paso será comenzar a construir geometría básica en la sesión 2." },
};

function crearRefuerzo(contexto: string): Refuerzo {
  const sesion = Number(contexto.match(/Sesión\s+(\d+)/i)?.[1] ?? 0);
  const apartado = Number(contexto.match(/Apartado:\s*(\d+)/i)?.[1] ?? 0);
  if (sesion === 1 && REFUERZOS_SESION_1[apartado]) return REFUERZOS_SESION_1[apartado];
  const titulo = contexto.match(/Apartado:\s*([^\n]+)/i)?.[1]?.replace(/^\d+\.\s*/, "").trim() ?? "Concepto del apartado";
  const bloques = contexto.split("Contenido de referencia:")[1]?.trim().split("\n").map((linea) => linea.trim()).filter(Boolean) ?? [];
  const definicion = bloques[0] ?? "Este apartado desarrolla un concepto del programa de formación.";
  const aplicacion = bloques[1] ?? "Relaciona este concepto con la práctica de diseño y modelado de joyería.";
  return {
    termino: titulo,
    definicion: definicion.length > 260 ? definicion.slice(0, 257).trimEnd() + "…" : definicion,
    aplicacion: aplicacion.length > 260 ? aplicacion.slice(0, 257).trimEnd() + "…" : aplicacion,
    recuerda: "Vuelve al texto principal y relaciona este concepto con el objetivo práctico del apartado.",
  };
}


export default function AuriTutorCurso({ contexto }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [conoceMas, setConoceMas] = useState(false);
  const refuerzo = crearRefuerzo(contexto);

  return (
    <>
      <div className="my-6 flex flex-col gap-3 rounded-2xl border border-[#e8dcc0] bg-gradient-to-r from-[#fffaf0] via-white to-[#f7f9fb] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-[#e4d3a5] bg-white shadow-sm"><AuriMascota compact /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#9b7936]">AURI TUTOR · GUÍA CONTEXTUAL DEL MÓDULO</p>
            <h4 className="mt-1 text-sm font-semibold text-[#263746]">¿Necesitas ayuda con este apartado?</h4>
            <p className="mt-1 text-xs leading-5 text-[#718096]">Guía local basada en el contenido de este apartado. Tus consultas no se envían a servicios externos.</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button type="button" onClick={() => setConoceMas((actual) => !actual)} aria-expanded={conoceMas} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5d7b5] bg-white px-4 py-2.5 text-sm font-semibold text-[#765b27] transition hover:bg-[#fff9eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4a15a]">
            <BookOpen className="size-4" /> Conoce más <ChevronDown className={"size-4 transition-transform " + (conoceMas ? "rotate-180" : "")} />
          </button>
          <button type="button" onClick={() => setAbierto(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#c4a15a] px-4 py-2.5 text-sm font-semibold text-[#21180a] shadow-sm transition hover:bg-[#b99552] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4a15a]">
            <Bot className="size-4" /> Consultar a AURI
          </button>
        </div>
      </div>
      {conoceMas && (
        <section className="mb-6 overflow-hidden rounded-2xl border border-[#e8dcc0] bg-[#fffdf8] shadow-[0_5px_18px_rgba(31,45,58,.035)]" aria-label="Conoce más: reforzamiento de conceptos">
          <div className="flex items-center gap-2 border-b border-[#eee5d2] px-4 py-3 sm:px-5">
            <span className="grid size-9 place-items-center rounded-xl bg-[#fff1c9] text-[#9b7936]"><Lightbulb className="size-4" /></span>
            <div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#9b7936]">AURI TUTOR · REFORZAMIENTO BREVE</p><h5 className="text-sm font-semibold text-[#263746]">Un concepto para recordar</h5></div>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
            <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#a17a2e]">Concepto clave</p><h6 className="mt-1 text-base font-bold text-[#263746]">{refuerzo.termino}</h6><p className="mt-2 text-sm leading-6 text-[#596b7b]">{refuerzo.definicion}</p></div>
            <div className="rounded-xl border border-[#eee5d2] bg-white p-3.5"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#a17a2e]">¿Cómo se aplica?</p><p className="mt-1 text-sm leading-6 text-[#596b7b]">{refuerzo.aplicacion}</p><div className="mt-3 border-t border-[#eee8dc] pt-3"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#a17a2e]">Recuerda</p><p className="mt-1 text-sm leading-6 text-[#596b7b]">{refuerzo.recuerda}</p></div></div>
          </div>
        </section>
      )}
      {abierto && (
        <div className="fixed inset-0 z-[150] flex h-[100dvh] w-screen flex-col overflow-hidden bg-white pt-[env(safe-area-inset-top)] shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[min(760px,88dvh)] sm:max-h-[88dvh] sm:w-[min(460px,calc(100vw-2rem))] sm:rounded-2xl sm:border sm:border-[#e8dfcc] sm:pt-0" role="dialog" aria-modal="true" aria-label="AURI Tutor del curso">
          <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar AURI Tutor" className="absolute right-3 top-[calc(env(safe-area-inset-top)+10px)] z-30 grid size-9 place-items-center rounded-full border border-[#e8dfcc] bg-white/95 text-[#69737b] shadow-sm transition hover:border-[#c7a65b] hover:text-[#96732e] sm:right-3 sm:top-3"><X className="size-4" /></button>
          <AuriChat modo="publico" rutaActual="/cursos-diseno-3d" contextoCurso={contexto} onContact={() => setAbierto(false)} />
        </div>
      )}
    </>
  );
}
