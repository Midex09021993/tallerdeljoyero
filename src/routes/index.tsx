import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Box, Gem, Layers3, ShieldCheck, Sparkles, Store } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Taller del Joyero | Diseño, joyería y modelos 3D" },
      {
        name: "description",
        content: "Descubre talleres, catálogos de joyería y modelos 3D publicados por la comunidad de Taller del Joyero.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Taller del Joyero | Diseño, joyería y modelos 3D" },
      {
        property: "og:description",
        content: "Un espacio para descubrir joyas, explorar catálogos y conectar con talleres profesionales.",
      },
    ],
  }),
  component: PaginaPrincipal,
});

const beneficios = [
  {
    icono: Box,
    titulo: "Modelos y visualización 3D",
    texto: "Explora piezas publicadas por talleres y abre sus fichas para consultar los detalles disponibles.",
  },
  {
    icono: Store,
    titulo: "Catálogos de talleres",
    texto: "Descubre propuestas de joyería, colecciones y profesionales de la comunidad.",
  },
  {
    icono: ShieldCheck,
    titulo: "Publicación bajo control",
    texto: "Cada taller decide qué productos muestra en su catálogo público; sus archivos privados no se publican automáticamente.",
  },
];

function PaginaPrincipal() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f5f0] text-[#211d19]">
      <div className="border-b border-[#b89b5e]/20 bg-[#211d19] text-[#f7f2e8]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-[10px] font-medium tracking-wide sm:px-8 sm:text-xs">
          <span className="inline-flex items-center gap-2"><Sparkles className="size-3.5 text-[#c9ad73]" /> Tecnología y oficio para la joyería</span>
          <Link to="/catalogo-publico" className="inline-flex items-center gap-1.5 text-[#d9c18d] transition hover:text-white">
            Descubrir la comunidad <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-[#211d19]/10 bg-[#f7f5f0]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Taller del Joyero, página principal">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#b89b5e]/35 bg-white shadow-sm">
              <Gem className="size-5 text-[#9b7a43]" />
            </span>
            <span className="min-w-0">
              <strong className="block truncate text-xs font-extrabold tracking-[.13em] sm:text-sm">TALLER DEL JOYERO</strong>
              <span className="mt-0.5 block text-[10px] tracking-[.1em] text-[#81766a]">AURUM LAB · ECOSISTEMA JOYERO</span>
            </span>
          </Link>
          <nav className="flex shrink-0 items-center gap-2 sm:gap-3" aria-label="Navegación principal">
            <Link to="/galeria-joyas" className="hidden rounded-full px-4 py-2.5 text-xs font-semibold text-[#5f5549] transition hover:bg-white sm:inline-flex">Galería de Joyas</Link>
            <Link to="/catalogo-publico" className="hidden rounded-full px-4 py-2.5 text-xs font-semibold text-[#5f5549] transition hover:bg-white sm:inline-flex">Comunidad</Link>
            <Link to="/tienda" className="hidden rounded-full px-4 py-2.5 text-xs font-semibold text-[#5f5549] transition hover:bg-white sm:inline-flex">Tienda</Link>
            <Link to="/auth" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#211d19] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#3b3329] sm:px-5">
              Acceder <ArrowRight className="size-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-[#b89b5e]/20">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_38%,rgba(190,159,96,.19),transparent_35%),radial-gradient(ellipse_at_5%_90%,rgba(190,159,96,.12),transparent_38%)]" />
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-16 lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.28em] text-[#96733d] sm:text-xs">
              <span className="h-px w-7 bg-[#b89b5e]" /> Diseño · Tecnología · Oficio
            </p>
            <h1 className="mt-6 max-w-3xl font-display text-5xl font-medium leading-[.99] tracking-[-.045em] sm:text-6xl lg:text-7xl">
              Las ideas toman forma. <span className="text-[#9a7944]">Las joyas cuentan historias.</span>
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-[#746b62] sm:text-base sm:leading-8">
              Descubre catálogos de joyería, explora diseños y conecta con talleres profesionales. Un ecosistema que une el oficio joyero con las herramientas digitales.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/galeria-joyas" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#211d19] px-6 py-3.5 text-xs font-semibold text-white shadow-lg shadow-[#211d19]/10 transition hover:-translate-y-0.5 hover:bg-[#3b3329]">
                Explorar joyas <ArrowRight className="size-4" />
              </Link>
              <Link to="/auth" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#b89b5e]/50 bg-white/70 px-6 py-3.5 text-xs font-semibold text-[#5b4930] transition hover:border-[#96733d] hover:bg-white">
                Publicar mis productos
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 border-t border-[#b89b5e]/25 pt-5 text-[10px] font-semibold uppercase tracking-[.14em] text-[#81766a] sm:text-xs">
              <span className="inline-flex items-center gap-2"><Box className="size-4 text-[#96733d]" /> Visualización 3D</span>
              <span className="inline-flex items-center gap-2"><Store className="size-4 text-[#96733d]" /> Catálogos públicos</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-[#96733d]" /> Publicación controlada</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div aria-hidden="true" className="absolute inset-[8%] rounded-full bg-[#b89b5e]/15 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-[#b89b5e]/35 bg-[#211d19] p-5 shadow-[0_28px_80px_rgba(33,29,25,.18)] sm:p-7">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div><p className="text-[9px] font-bold uppercase tracking-[.24em] text-[#c7aa70]">AURUM LAB</p><p className="mt-1 text-sm font-semibold text-white">Diseño que se puede explorar</p></div>
                <span className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/5"><Layers3 className="size-4 text-[#d7bd86]" /></span>
              </div>
              <div className="grid grid-cols-2 gap-3 py-5 sm:gap-4">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#f1ede5]">
                  <div className="grid aspect-square place-items-center bg-[radial-gradient(ellipse_at_50%_42%,#fff,#e7dfd1)] p-4">
                    <img src="/icon-512.png" alt="" className="size-20 object-contain opacity-80 sm:size-28" loading="lazy" />
                  </div>
                  <div className="bg-white px-3 py-3"><p className="text-[10px] font-semibold text-[#332c22]">Catálogos de joyería</p><p className="mt-1 text-[9px] text-[#81766a]">Piezas y colecciones</p></div>
                </div>
                <div className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-[#f1ede5]">
                  <div className="grid aspect-square place-items-center bg-[radial-gradient(ellipse_at_50%_42%,#fff,#e7dfd1)] p-4">
                    <Gem className="size-20 text-[#a88952] sm:size-28" strokeWidth={1} />
                  </div>
                  <div className="bg-white px-3 py-3"><p className="text-[10px] font-semibold text-[#332c22]">Modelos 3D</p><p className="mt-1 text-[9px] text-[#81766a]">Explora antes de consultar</p></div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-[10px] leading-5 text-white/65">Del diseño digital a una ficha comercial pública.</span>
                <Box className="size-5 shrink-0 text-[#d7bd86]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#96733d]">Un ecosistema conectado</p>
          <h2 className="mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl">Tu trabajo merece un escaparate a su altura.</h2>
          <p className="mt-4 text-sm leading-7 text-[#746b62]">Publica las piezas que quieras compartir y ofrece a tus clientes una forma clara de descubrirlas y consultar por ellas.</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {beneficios.map(({ icono: Icono, titulo, texto }) => (
            <article key={titulo} className="rounded-2xl border border-[#b89b5e]/25 bg-white/75 p-6 transition hover:-translate-y-0.5 hover:border-[#b89b5e]/60 hover:shadow-[0_14px_38px_rgba(33,29,25,.06)]">
              <span className="grid size-11 place-items-center rounded-xl border border-[#b89b5e]/30 bg-[#f7f2e8]"><Icono className="size-5 text-[#96733d]" /></span>
              <h3 className="mt-5 text-sm font-semibold">{titulo}</h3>
              <p className="mt-2 text-sm leading-6 text-[#746b62]">{texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[#b89b5e]/20 bg-white/55">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8 sm:py-14 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#96733d]">Empieza a mostrar tu trabajo</p>
            <h2 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">De tu taller al mundo.</h2>
            <p className="mt-3 text-sm leading-7 text-[#746b62]">Organiza tus modelos y fichas comerciales, y decide qué productos quieres presentar en tu catálogo público.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link to="/catalogo-publico" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#b89b5e]/50 px-5 py-3 text-xs font-semibold text-[#5b4930] transition hover:bg-white">Ver comunidad <ArrowRight className="size-4" /></Link>
            <Link to="/auth" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#211d19] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#3b3329]">Entrar a mi taller</Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-[10px] text-[#81766a] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© {new Date().getFullYear()} Taller del Joyero · AURUM LAB</span>
        <div className="flex flex-wrap gap-4"><Link to="/galeria-joyas" className="hover:text-[#96733d]">Galería de Joyas</Link><Link to="/catalogo-publico" className="hover:text-[#96733d]">Comunidad</Link><Link to="/tienda" className="hover:text-[#96733d]">Tienda</Link><Link to="/auth" className="hover:text-[#96733d]">Acceso al ERP</Link></div>
      </footer>
    </main>
  );
}
