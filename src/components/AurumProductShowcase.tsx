import { useEffect, useRef, useState } from "react";
import {
  Boxes, Calculator, Cloud, FileBox, Gem,
  Folder, Image, Layers3, ShoppingBag, Users,
} from "lucide-react";

type Scene = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  icon: typeof Boxes;
  nav: string[];
};

const scenes: Scene[] = [
  { id: "home", title: "Tu taller, en orden", eyebrow: "RESUMEN DEL TALLER", description: "Una vista clara de la actividad y las herramientas de tu taller.", icon: Boxes, nav: ["Resumen", "Mi Nube", "Catálogo", "Clientes"] },
  { id: "cloud", title: "Tus archivos, organizados", eyebrow: "MI NUBE", description: "Reúne modelos, imágenes y documentos en un solo espacio.", icon: Cloud, nav: ["Todos los archivos", "Mis carpetas", "Compartidos", "Papelera"] },
  { id: "render", title: "Visualiza tus joyas", eyebrow: "AURUM RENDER", description: "Materiales, iluminación y presentación visual para joyería.", icon: Image, nav: ["Estudio 3D", "Metales", "Gemas", "Escena"] },
  { id: "tools", title: "Herramientas para el oficio", eyebrow: "HERRAMIENTAS TÉCNICAS", description: "Calcula aleaciones, pesos y medidas antes de fabricar.", icon: Calculator, nav: ["Aleaciones", "Peso", "Medidas", "Conversores"] },
  { id: "business", title: "Gestión comercial", eyebrow: "ÁREA COMERCIAL", description: "Accede a los módulos comerciales disponibles para tu taller.", icon: Users, nav: ["Clientes", "Cotizaciones", "Contratos", "Pedidos"] },
  { id: "files", title: "Tus archivos, en un solo lugar", eyebrow: "MI NUBE", description: "Administra archivos, modelos 3D, imágenes, vídeos y documentos del taller.", icon: Folder, nav: ["Archivos", "Carpetas", "Compartidos", "Papelera"] },
  { id: "catalog", title: "Tu catálogo de joyas", eyebrow: "CATÁLOGO", description: "Organiza productos, imágenes, colecciones y publicaciones digitales.", icon: ShoppingBag, nav: ["Productos", "Colecciones", "Categorías", "Configuración"] },
  { id: "clients", title: "Relación con tus clientes", eyebrow: "CLIENTES", description: "Consulta fichas, datos de contacto e historial comercial.", icon: Users, nav: ["Directorio", "Historial", "Cumpleaños", "Campañas"] },
];

function SceneContent({ scene }: { scene: Scene }) {
  if (scene.id === "cloud") return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{["Anillos", "Colección oro", "Modelos 3D", "Referencias", "Clientes", "Compartidos"].map((name, i) => <div key={name} className="rounded-xl border border-slate-100 bg-white p-3"><span className={`grid size-8 place-items-center rounded-lg ${i % 2 ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-700"}`}><FileBox className="size-4"/></span><p className="mt-2 text-[10px] font-semibold text-slate-700">{name}</p><p className="mt-1 text-[9px] text-slate-400">{[12,8,24,6,15,4][i]} elementos</p></div>)}</div>;
  if (scene.id === "design") return <div className="grid grid-cols-2 gap-3"><div className="col-span-2 flex min-h-36 items-center justify-center rounded-xl border border-slate-100 bg-gradient-to-br from-[#fffaf0] to-[#eef2f7]"><Gem className="size-20 text-[#c39a2d]" strokeWidth={1}/></div>{["Anillo clásico","Colgante oval"].map((name,i)=><div key={name} className="rounded-xl border border-slate-100 p-2"><div className="h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-[#e5bf45]" style={{width:i?"62%":"84%"}}/></div><p className="mt-2 text-[9px] font-semibold text-slate-700">{name}</p><p className="text-[8px] text-slate-400">Proyecto guardado</p></div>)}</div>;
  if (scene.id === "render") return <div className="overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-[#fffdf6] via-white to-[#e8edf3]"><div className="flex items-center justify-between border-b border-slate-100 px-3 py-2"><span className="text-[9px] font-semibold text-slate-600">VISTA DE ESTUDIO</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-semibold text-emerald-700">Vista previa</span></div><div className="flex min-h-44 items-center justify-center"><div className="relative grid size-36 place-items-center rounded-full bg-white/70 shadow-[0_12px_40px_rgba(190,160,90,.18)]"><Gem className="size-24 text-[#bd9228] drop-shadow-[0_8px_8px_rgba(160,120,20,.2)]" strokeWidth={1}/><span className="absolute bottom-2 text-[8px] tracking-widest text-slate-400">ORO · DIAMANTE</span></div></div><div className="grid grid-cols-3 border-t border-slate-100 bg-white/80 p-2 text-center text-[8px] text-slate-500"><span>Materiales</span><span>Iluminación</span><span>Encuadre</span></div></div>;
  if (scene.id === "tools") return <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-slate-100 bg-white p-3"><p className="text-[9px] text-slate-400">CALCULADORA DE ALEACIÓN</p><p className="mt-2 text-xl font-bold text-[#17232d]">18 <span className="text-xs font-medium text-slate-400">K</span></p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-3/4 rounded-full bg-[#e5bf45]"/></div><p className="mt-2 text-[9px] text-slate-500">Oro fino · Liga</p></div><div className="rounded-xl border border-slate-100 bg-white p-3"><p className="text-[9px] text-slate-400">PESO ESTIMADO</p><p className="mt-2 text-xl font-bold text-[#17232d]">4.82 <span className="text-xs font-medium text-slate-400">g</span></p><p className="mt-3 text-[9px] text-emerald-700">Cálculo listo</p><div className="mt-2 h-2 rounded-full bg-emerald-50"/></div></div>;
  if (scene.id === "business") return <div className="grid grid-cols-2 gap-2">{[["Clientes","Directorio y fichas"],["Cotizaciones","Preparación y seguimiento"],["Contratos","Documentos comerciales"],["Pedidos","Seguimiento de pedidos"]].map(([name,detail])=><div key={name} className="rounded-xl border border-slate-100 bg-white p-3"><p className="text-[10px] font-semibold text-slate-700">{name}</p><p className="mt-1 text-[9px] text-slate-400">{detail}</p></div>)}</div>;
  if (scene.id === "files") return <div className="grid grid-cols-2 gap-2">{[["Modelos 3D","Archivos de diseño"],["Imágenes","Fotografías y referencias"],["Vídeos","Contenido multimedia"],["Documentos","Fichas y archivos"]].map(([name,detail],i)=><div key={name} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white p-3"><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${i%2?"bg-blue-50 text-blue-600":"bg-amber-50 text-amber-700"}`}><Folder className="size-4"/></span><div className="min-w-0"><p className="text-[10px] font-semibold text-slate-700">{name}</p><p className="text-[8px] text-slate-400">{detail}</p></div></div>)}</div>;
  if (scene.id === "catalog") return <div className="grid grid-cols-2 gap-2"><div className="col-span-2 flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3"><div><p className="text-[10px] font-semibold text-slate-700">Productos del catálogo</p><p className="mt-1 text-[9px] text-slate-400">Modelos e información de cada joya</p></div><ShoppingBag className="size-5 text-[#b18a20]"/></div>{["Imágenes y galería","Colecciones","Categorías","Publicación digital"].map(name=><div key={name} className="rounded-xl border border-slate-100 bg-white p-3"><p className="text-[9px] font-semibold text-slate-600">{name}</p></div>)}</div>;
  if (scene.id === "clients") return <div className="grid grid-cols-2 gap-2"><div className="col-span-2 rounded-xl border border-slate-100 bg-white p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold text-slate-700">Directorio de clientes</p><Users className="size-4 text-[#b18a20]"/></div><p className="mt-1 text-[9px] text-slate-400">Personas y empresas registradas en el taller</p></div>{["Datos de contacto","Historial de cotizaciones","Historial de pedidos","Cumpleaños y campañas"].map(name=><div key={name} className="rounded-xl border border-slate-100 bg-white p-3"><p className="text-[9px] font-semibold text-slate-600">{name}</p></div>)}</div>;
  return <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-slate-100 bg-white p-3"><span className="grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-700"><Calculator className="size-4"/></span><p className="mt-2 text-[10px] font-semibold text-slate-700">Herramientas técnicas</p><p className="mt-1 text-[9px] text-slate-400">Cálculos para tu oficio</p></div><div className="rounded-xl border border-slate-100 bg-white p-3"><span className="grid size-8 place-items-center rounded-lg bg-blue-50 text-blue-600"><Cloud className="size-4"/></span><p className="mt-2 text-[10px] font-semibold text-slate-700">Mi Nube</p><p className="mt-1 text-[9px] text-slate-400">Tus archivos organizados</p></div><div className="col-span-2 rounded-xl border border-slate-200 bg-gradient-to-r from-white to-amber-50/50 p-4"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-amber-100 text-amber-700"><Gem className="size-6"/></span><div><p className="text-xs font-bold text-[#17232d]">Estudio profesional de joyería 3D</p><p className="mt-1 text-[9px] text-slate-500">Diseña, visualiza y presenta tus joyas.</p></div></div></div></div>;
}

export function AurumProductShowcase() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useRef(false);
  const scene = scenes[active];
  const Icon = scene.icon;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = media.matches;
    const onChange = () => { reducedMotion.current = media.matches; };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), { threshold: 0.15 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || reducedMotion.current) return;
    const timer = window.setInterval(() => setActive(current => (current + 1) % scenes.length), 4800);
    return () => window.clearInterval(timer);
  }, [visible]);


  return <div ref={rootRef} className="aurum-showcase-enter relative mx-auto w-full max-w-[720px] pb-7 sm:pb-10" aria-label="Demostración automática de AURUM LAB">
    <style>{`
      @keyframes aurum-showcase-in { from { opacity:0; transform:translate3d(18px,8px,0) scale(.99); filter:blur(3px) } to { opacity:1; transform:translate3d(0,0,0) scale(1); filter:blur(0) } }
      @keyframes aurum-showcase-float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-6px) } }
      @keyframes aurum-card-forward { 0% { opacity:.55; transform:translate3d(22px,18px,0) rotate(.6deg) } 70% { opacity:1; transform:translate3d(-3px,-2px,0) rotate(-.12deg) } 100% { opacity:1; transform:translate3d(0,0,0) rotate(0) } }
      .aurum-showcase-scene { animation: aurum-showcase-in .65s cubic-bezier(.2,.75,.25,1) both; }
      .aurum-showcase-window { animation: aurum-showcase-float 7s ease-in-out infinite; }
      .aurum-showcase-card-front { animation: aurum-card-forward .62s cubic-bezier(.2,.75,.25,1) both; }
      .aurum-showcase-card-back { position:absolute; inset:0; border:1px solid #dfe5ed; border-radius:1.6rem; background:#fff; pointer-events:none; }
      .aurum-showcase-card-back-one { transform:translate(12px,12px); opacity:.88; box-shadow:0 14px 32px rgba(28,40,52,.055); }
      .aurum-showcase-card-back-two { transform:translate(24px,24px); opacity:.62; box-shadow:0 18px 36px rgba(28,40,52,.045); }
      @media (prefers-reduced-motion: reduce) { .aurum-showcase-scene,.aurum-showcase-window,.aurum-showcase-card-front { animation:none!important } }
    `}</style>
    <div className="absolute inset-x-8 bottom-2 top-8 rounded-[3rem] bg-gradient-to-br from-[#fff0bf]/75 via-[#f8fafc] to-[#e4ebf4] blur-2xl"/>
    <div className="relative">
      <div aria-hidden="true" className="aurum-showcase-card-back aurum-showcase-card-back-two"/>
      <div aria-hidden="true" className="aurum-showcase-card-back aurum-showcase-card-back-one"/>
      <div key={scene.id} className="aurum-showcase-card-front">
    <div className="aurum-showcase-window relative overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white p-2.5 shadow-[0_25px_80px_rgba(28,40,52,.15)] sm:p-3">
      <div className="flex h-10 items-center gap-2 border-b border-slate-100 px-3"><span className="size-2.5 rounded-full bg-[#ff6b63]"/><span className="size-2.5 rounded-full bg-[#ffce45]"/><span className="size-2.5 rounded-full bg-[#4ac58b]"/><div className="mx-auto mr-12 rounded-full bg-slate-100 px-14 py-1 text-[9px] text-slate-400">TU ESPACIO DIGITAL</div></div>
      <div className="grid min-h-[330px] grid-cols-[100px_minmax(0,1fr)] overflow-hidden rounded-b-xl sm:min-h-[365px] sm:grid-cols-[155px_minmax(0,1fr)]">
        <aside className="min-w-0 border-r border-slate-100 bg-[#f8fafc] p-2.5 sm:p-4">
          <div className="mb-5 flex items-center gap-2 text-[9px] font-extrabold text-[#17232d] sm:text-xs"><span className="grid size-6 place-items-center rounded-md bg-[#ffcf24]"><Gem className="size-3.5"/></span>AURUM LAB</div>
          <p className="mb-2 text-[8px] font-bold uppercase tracking-wider text-slate-400">Tu espacio</p>
          <div className="space-y-1.5">{scene.nav.map((item,i)=><div key={item} className={`flex items-center gap-1.5 rounded-lg px-2 py-2 text-[8px] sm:gap-2 sm:text-[10px] ${i===0?"bg-[#fff2bd] font-semibold text-[#665000]":"text-slate-500"}`}>{i===0?<Icon className="size-3.5 shrink-0"/>:<Layers3 className="size-3.5 shrink-0"/>}<span className="truncate">{item}</span></div>)}</div>
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-2"><p className="text-[8px] font-semibold text-slate-700">AURUM LAB</p><p className="mt-1 text-[8px] leading-4 text-slate-400">Tu oficio, conectado.</p><div className="mt-2 h-1.5 rounded-full bg-[#ffcf24]"/></div>
        </aside>
        <div className="min-w-0 p-2.5 sm:p-5">
          <div className="flex items-start justify-between gap-2"><div><p className="text-[8px] font-semibold tracking-[.12em] text-[#b18a20] sm:text-[9px]">{scene.eyebrow}</p><p className="mt-1 text-sm font-bold text-[#17232d] sm:text-lg">{scene.title}</p></div><span className="rounded-full bg-[#e9f8ef] px-2 py-1 text-[7px] font-semibold text-[#27834d] sm:text-[8px]">Espacio de trabajo</span></div>
          <p className="mt-2 min-h-8 text-[9px] leading-4 text-slate-500 sm:text-[10px]">{scene.description}</p>
          <div key={scene.id} className="aurum-showcase-scene mt-3 min-h-[190px]">{<SceneContent scene={scene}/>}</div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-[8px] font-medium text-slate-400">VISTA DEL PRODUCTO · {String(active+1).padStart(2,"0")} / {String(scenes.length).padStart(2,"0")}</span><span className="flex items-center gap-1 text-[8px] font-semibold text-[#987400]"><span className="size-1.5 rounded-full bg-emerald-500"/> DEMOSTRACIÓN</span></div>
        </div>
      </div>
    </div>
      </div>
    </div>
    <div className="relative z-10 mt-5 flex items-center justify-between px-2 text-[9px] text-slate-400 sm:px-3"><span className="font-semibold tracking-[.16em] text-slate-500">AURUM LAB</span><span>El arte de crear. La inteligencia de gestionar.</span></div>
  </div>;
}
