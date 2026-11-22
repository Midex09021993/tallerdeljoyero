import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Gem, GraduationCap, Store, UsersRound } from "lucide-react";

export const Route = createFileRoute("/comunidad")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://www.tallerdeljoyero.com/comunidad" }],
    meta: [
      { title: "Comunidad joyera | AURUM LAB" },
      { name: "description", content: "Conecta con talleres, joyerías y propuestas formativas de la comunidad de Taller del Joyero. Explora el directorio, la tienda 3D y los cursos de formación." },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Comunidad joyera | AURUM LAB" },
      { property: "og:description", content: "Talleres, formación, recursos técnicos y modelos digitales para profesionales de la joyería." },
    ],
  }),
  component: ComunidadPage,
});

const destinos = [
  {
    titulo: "Diseño CAD 3D para Joyería y Manufactura Aditiva con Inteligencia Artificial – Nivel 1",
    descripcion: "Formación profesional en diseño 3D, modelado de joyería, fabricación digital e inteligencia artificial aplicada. Programa de 20 horas académicas, organizado en 10 sesiones.",
    etiqueta: "Curso destacado · 20 horas académicas",
    href: "/cursos-diseno-3d" as const,
    accion: "Conocer el curso",
    icon: GraduationCap,
    destacado: true,
  },
  {
    titulo: "Directorio de talleres y formación",
    descripcion: "Descubre talleres, joyerías y propuestas formativas que forman parte de la comunidad.",
    etiqueta: "Conectar con profesionales",
    href: "/directorio" as const,
    accion: "Abrir directorio",
    icon: UsersRound,
    destacado: false,
  },
  {
    titulo: "Tienda 3D",
    descripcion: "Explora archivos digitales para joyería, incluidos modelos 3D, diseños CAD y planos técnicos publicados.",
    etiqueta: "Recursos digitales",
    href: "/galeria-joyas" as const,
    accion: "Visitar tienda",
    icon: Store,
    destacado: false,
  },

];

function ComunidadPage() {
  return (
    <main className="min-h-screen bg-[#fffefa] text-[#17232d]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5" aria-label="AURUM LAB, inicio">
            <img src="/brand/aurum-symbol.svg" alt="Logotipo de AURUM LAB" width="36" height="36" className="size-9 object-contain" />
            <span className="leading-tight"><span className="block text-[17px] font-extrabold tracking-tight">AURUM<span className="text-[#bd8d00]"> LAB</span></span><span className="block text-[9px] font-medium uppercase tracking-[.15em] text-slate-500">Comunidad joyera</span></span>
          </Link>
          <nav className="flex items-center gap-3 text-sm font-medium text-slate-600 sm:gap-6" aria-label="Navegación de comunidad">
            <Link to="/directorio" className="hidden transition hover:text-[#987400] sm:inline-flex">Directorio</Link>
            <Link to="/auth" className="rounded-full bg-[#17232d] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#293b49]">Acceder</Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-white via-[#fffdf5] to-[#f4f7fb]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[#ffe99b]/35 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#987400]">El universo AURUM LAB</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">Conocimiento y conexiones para el oficio joyero.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">Accede a recursos técnicos, encuentra profesionales y descubre herramientas y archivos digitales que acompañan el trabajo de tu taller.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/cursos-diseno-3d" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#17232d] px-5 text-sm font-semibold text-white transition hover:bg-[#293b49]">Conocer el curso <ArrowRight className="size-4" /></Link>
            <Link to="/directorio" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-[#17232d] transition hover:border-[#d4aa19]">Encontrar talleres</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">Explora la comunidad</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Elige el recurso que necesitas</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Cada espacio tiene un propósito claro: aprender una técnica, conectar con otros profesionales, formarte o encontrar archivos para tus proyectos.</p>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {destinos.map((destino) => {
            const Icon = destino.icon;
            return (
              <article key={destino.titulo} className={"flex h-full flex-col rounded-2xl border p-5 shadow-[0_3px_14px_rgba(15,23,42,.035)] sm:p-6 " + (destino.destacado ? "border-[#e5c04a] bg-[#fffdf4]" : "border-slate-200 bg-white")}>
                <span className="grid size-11 place-items-center rounded-xl bg-[#fff4c4] text-[#8f6b00]"><Icon className="size-5" /></span>
                <p className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-[#987400]">{destino.etiqueta}</p>
                <h3 className="mt-2 text-lg font-bold leading-snug">{destino.titulo}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{destino.descripcion}</p>
                <Link to={destino.href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#876500] hover:text-[#5f4900]">{destino.accion} <ArrowRight className="size-4" /></Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#987400]">De la teoría a la práctica</p>
            <h2 className="mt-2 text-xl font-bold">Empieza con una herramienta técnica.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Prueba las calculadoras públicas de AURUM LAB y continúa con las funciones de la plataforma cuando las necesites.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/herramientas-publicas" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#17232d] px-5 text-sm font-semibold text-white transition hover:bg-[#293b49]">Ver herramientas <ArrowRight className="size-4" /></Link>
            <Link to="/auth" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d4aa19] bg-[#fff8d8] px-5 text-sm font-semibold text-[#604900] transition hover:bg-[#ffefad]">Crear cuenta</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>AURUM LAB · Comunidad profesional joyera</span>
          <div className="flex flex-wrap gap-4"><Link to="/" className="hover:text-[#987400]">Inicio</Link><Link to="/directorio" className="hover:text-[#987400]">Directorio</Link></div>
        </div>
      </footer>
    </main>
  );
}
