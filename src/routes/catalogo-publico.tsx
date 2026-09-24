import { Link, createFileRoute } from "@tanstack/react-router";
import { BookOpen, Link2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/catalogo-publico")({
  head: () => ({
    meta: [
      { title: "Catálogo digital" },
      { name: "description", content: "Acceso a un catálogo digital por joyería o taller." },
    ],
  }),
  component: CatalogoPublicoLanding,
});

function CatalogoPublicoLanding() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f4ef] px-6 text-[#1f1b18]">
      <section className="max-w-xl text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full border border-[#8a6b3630] bg-white">
          <BookOpen className="size-6 text-[#8a6b36]" />
        </div>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[.3em] text-[#8a6b36]">Catálogo digital</p>
        <h1 className="mt-3 font-display text-5xl tracking-tight">Cada joyería tiene su propio catálogo.</h1>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-[#746b62]">
          Los catálogos públicos utilizan un enlace único por sede. El formato general es
          <span className="mx-1 rounded bg-white px-2 py-1 font-mono text-xs">/&lt;slug&gt;</span>
          para mantener separada la publicación de cada taller.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Link to="/auth" className="inline-flex items-center gap-2 rounded-full bg-[#1f1b18] px-5 py-3 text-xs font-semibold text-white">
            <Link2 className="size-3.5" /> Acceso al ERP
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#1f1b1830] bg-white px-5 py-3 text-xs font-semibold">
            <Sparkles className="size-3.5 text-[#8a6b36]" /> Publicación por sede
          </div>
        </div>
      </section>
    </main>
  );
}
