import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Boxes,
  Calculator,
  CheckCircle2,
  Gem,
  LayoutDashboard,
  Monitor,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import heroJoyeria from "@/assets/diseno-corona.jpg";
import { SolicitudAcceso } from "@/components/SolicitudAcceso";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aurum Lab — Gestión profesional para talleres de joyería" },
      {
        name: "description",
        content:
          "Aurum Lab conecta clientes, cotizaciones, pedidos, producción, inventario y herramientas 3D en una plataforma pensada para el sector joyero.",
      },
      {
        property: "og:title",
        content: "Aurum Lab — Gestión profesional para talleres de joyería",
      },
      {
        property: "og:description",
        content:
          "Una plataforma especializada para organizar el taller, seguir cada trabajo y conectar producción, comercial e inventario.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#08090a] text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#08090a]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:h-20 lg:px-8">
          <a href="#" className="flex items-center gap-3">
            <img
              src="/icon-512.png"
              alt="Aurum Lab"
              className="h-10 w-10 rounded-xl object-cover ring-1 ring-[#d4af37]/60"
            />
            <div>
              <p className="font-display text-lg font-semibold tracking-tight text-[#d4af37]">
                AURUM LAB
              </p>
              <p className="hidden text-[8px] uppercase tracking-[0.28em] text-white/40 sm:block">
                Tecnología para el sector joyero
              </p>
            </div>
          </a>

          <nav className="hidden items-center gap-7 md:flex">
            <a href="#plataforma" className="text-sm text-white/60 transition hover:text-white">
              Plataforma
            </a>
            <a href="#flujo" className="text-sm text-white/60 transition hover:text-white">
              Cómo funciona
            </a>
            <a href="#herramientas" className="text-sm text-white/60 transition hover:text-white">
              Herramientas
            </a>
          </nav>

          <Link
            to="/auth"
            className="rounded-xl border border-[#d4af37]/60 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#d4af37] transition hover:bg-[#d4af37] hover:text-[#111]"
          >
            Ingresar
          </Link>
        </div>
      </header>

      <section className="relative isolate min-h-[720px] overflow-hidden pt-16 lg:min-h-[820px] lg:pt-20">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_35%,rgba(212,175,55,.16),transparent_32%),radial-gradient(circle_at_80%_25%,rgba(255,255,255,.07),transparent_25%),linear-gradient(180deg,#111315_0%,#08090a_75%)]" />
        <div
          className="absolute inset-y-0 right-0 -z-10 w-full bg-cover bg-center opacity-30 lg:w-[58%]"
          style={{
            backgroundImage: `linear-gradient(90deg,#08090a 5%,rgba(8,9,10,.88) 28%,rgba(8,9,10,.25) 100%), url(${heroJoyeria})`,
          }}
        />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-28">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/25 bg-[#d4af37]/[0.07] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.22em] text-[#d4af37]">
              <Gem className="size-3.5" />
              Plataforma especializada para joyería
            </div>

            <h1 className="max-w-4xl font-display text-5xl italic leading-[.95] tracking-tight sm:text-6xl lg:text-8xl">
              El taller detrás de cada{" "}
              <span className="text-[#d4af37]">joya.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">
              Aurum Lab conecta clientes, cotizaciones, pedidos, producción e inventario
              en un mismo entorno. Diseñado para que un taller pueda crecer sin perder
              el control de lo que sucede en cada pieza.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <SolicitudAcceso />
              <a
                href="#plataforma"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-white/80 transition hover:border-white/30 hover:text-white"
              >
                Conocer la plataforma
                <ArrowRight className="size-4" />
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-[11px] text-white/45">
              {[
                "Clientes y cotizaciones",
                "Producción por áreas",
                "Inventario y compras",
                "Visualización 3D",
              ].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-[#d4af37]" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-8 rounded-[3rem] bg-[#d4af37]/10 blur-3xl" />
            <div className="relative rounded-3xl border border-white/10 bg-[#111315]/85 p-3 shadow-2xl backdrop-blur-xl">
              <div className="rounded-2xl border border-white/10 bg-[#090a0b] p-5 sm:p-7">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] text-[#d4af37]">
                      Vista del taller
                    </p>
                    <p className="mt-1 text-lg font-semibold">Control operativo</p>
                  </div>
                  <div className="rounded-xl bg-[#d4af37]/10 p-3">
                    <LayoutDashboard className="size-5 text-[#d4af37]" />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    ["Pedidos", "Todo el flujo comercial"],
                    ["Producción", "Trabajos por área"],
                    ["Inventario", "Material y movimientos"],
                    ["Cotizaciones", "Costos y precios"],
                  ].map(([title, text]) => (
                    <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                      <p className="text-sm font-semibold">{title}</p>
                      <p className="mt-1 text-[10px] leading-relaxed text-white/40">{text}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/[0.05] p-4">
                  <div className="flex items-center gap-3">
                    <Workflow className="size-5 text-[#d4af37]" />
                    <div>
                      <p className="text-xs font-semibold">Pedido → Producción → Entrega</p>
                      <p className="mt-1 text-[10px] text-white/40">
                        La información acompaña a la pieza durante su recorrido.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="plataforma" className="border-y border-white/10 bg-[#0d0f10]">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#d4af37]">
              Una sola operación
            </p>
            <h2 className="mt-3 font-display text-4xl italic leading-tight sm:text-5xl">
              Menos información dispersa. Más control sobre el taller.
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-white/55 sm:text-base">
              La plataforma está pensada para funcionar tanto en un taller pequeño como
              en una organización con distintas áreas, responsables y sedes.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: UsersRound,
                title: "Comercial",
                text: "Clientes, proyectos, cotizaciones y pedidos conectados.",
              },
              {
                icon: Workflow,
                title: "Producción",
                text: "Rutas, trabajos, responsables, estados e incidencias.",
              },
              {
                icon: Boxes,
                title: "Inventario",
                text: "Materiales, movimientos, compras y trazabilidad.",
              },
              {
                icon: Sparkles,
                title: "Diseño 3D",
                text: "AURUM Render para visualizar diseños de joyería.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="group rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition hover:-translate-y-1 hover:border-[#d4af37]/35"
              >
                <Icon className="size-7 text-[#d4af37]" />
                <h3 className="mt-5 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-white/45">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="flujo" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#d4af37]">
              El flujo
            </p>
            <h2 className="mt-3 font-display text-4xl italic leading-tight sm:text-5xl">
              De la oportunidad a la pieza terminada.
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-white/50">
              Cada etapa puede compartir la información que necesita sin obligar a
              producción, comercial e inventario a trabajar en sistemas separados.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["01", "Cliente", "Datos y relación comercial."],
              ["02", "Cotización", "Propuesta comercial y costos internos separados."],
              ["03", "Pedido", "La venta formaliza el trabajo."],
              ["04", "Producción", "OP, trabajos, piezas y control de calidad."],
              ["05", "Inventario", "Materiales, movimientos y compras."],
              ["06", "Entrega", "Cierre del recorrido de la pieza."],
            ].map(([number, title, text]) => (
              <div key={number} className="flex gap-4 rounded-2xl border border-white/10 bg-[#0d0f10] p-5">
                <span className="font-display text-2xl italic text-[#d4af37]">{number}</span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/40">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="herramientas" className="border-y border-white/10 bg-[#0d0f10]">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#d4af37]">
                Herramientas para joyeros
              </p>
              <h2 className="mt-3 font-display text-4xl italic sm:text-5xl">
                Tecnología útil, incluso antes de usar el ERP.
              </h2>
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-white/40">
              Herramientas técnicas y visuales pensadas alrededor del trabajo real del
              joyero.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {([
              [Calculator, "Yeso / Agua", "Proporciones para mezclas de joyería."],
              [Gem, "Aleación de Oro", "Cálculo de aleaciones y ley final."],
              [Sparkles, "Conversor de Tallas", "Equivalencias entre escalas de anillos."],
              [Monitor, "Visualizador y Peso 3D", "Visualización y estimación de peso."],
              [Gem, "AURUM Render", "Visualización 3D de joyería."],
            ] as [LucideIcon, string, string][]).map(([ToolIcon, title, text]) => {
              return (
                <article key={String(title)} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <ToolIcon className="size-6 text-[#d4af37]" />
                  <h3 className="mt-4 text-sm font-semibold">{String(title)}</h3>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">{String(text)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 text-center lg:py-28">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/[0.08]">
          <ShieldCheck className="size-7 text-[#d4af37]" />
        </div>
        <h2 className="mt-6 font-display text-4xl italic sm:text-5xl">
          Tu taller merece una plataforma hecha para su realidad.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/50">
          Estamos construyendo Aurum Lab para conectar la gestión comercial con la
          operación y la producción especializada del sector joyero.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <SolicitudAcceso />
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-white/75 transition hover:border-white/30 hover:text-white"
          >
            Ya tengo acceso
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#070809]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <p className="font-display text-lg italic text-[#d4af37]">Aurum Lab</p>
            <p className="mt-1 text-[10px] text-white/30">Tecnología para el sector joyero.</p>
          </div>
          <div className="flex flex-wrap gap-5 text-[10px] text-white/35">
            <a href="#plataforma" className="hover:text-white">Plataforma</a>
            <a href="#flujo" className="hover:text-white">Flujo</a>
            <a href="#herramientas" className="hover:text-white">Herramientas</a>
            <Link to="/auth" className="hover:text-white">Acceso</Link>
          </div>
          <p className="text-[10px] text-white/25">© 2026 Aurum Lab</p>
        </div>
      </footer>
    </main>
  );
}
