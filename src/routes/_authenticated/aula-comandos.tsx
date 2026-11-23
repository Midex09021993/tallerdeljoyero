import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, BookOpen, Command, ArrowLeft, ChevronDown, Lightbulb } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { useSesion } from "@/lib/auth";
import { COMANDOS, CAPITULOS, CATEGORIAS } from "@/lib/aula/biblioteca-comandos";

export const Route = createFileRoute("/_authenticated/aula-comandos")({
  head: () => ({ meta: [{ title: "Biblioteca de comandos — FADILAB" }, { name: "description", content: "Biblioteca didáctica de comandos de Rhinoceros para formación en joyería." }] }),
  component: BibliotecaComandosPage,
});


function BibliotecaComandosPage() {
  const { data: sesion, isLoading } = useSesion();
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [capitulo, setCapitulo] = useState<number | null>(null);
  const [abierto, setAbierto] = useState("");
  const filtrados = useMemo(() => {
    const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
    const q = normalizar(busqueda.trim());
    return COMANDOS.filter((item) => (categoria === "Todas" || item.categoria === categoria) && (capitulo === null || CAPITULOS.find((cap) => cap.numero === capitulo)?.comandos.includes(item.nombre)) && (!q || normalizar([item.nombre,item.categoria,item.resumen,item.uso,item.pasos.join(" "),item.ejemplo,item.cuidado,item.joyeria].join(" ")).includes(q)));
  }, [busqueda, categoria, capitulo]);

  if (isLoading) return <AppShell titulo="Biblioteca de comandos" subtitulo="Recursos didácticos de Rhinoceros"><div className="p-8 text-sm text-muted-foreground">Cargando aula…</div></AppShell>;
  if (!sesion?.user) return <AppShell titulo="Biblioteca de comandos" subtitulo="Recursos didácticos de Rhinoceros"><div className="mx-auto max-w-3xl p-8"><Panel titulo="Acceso requerido"><p className="text-sm">Inicia sesión para acceder a la biblioteca didáctica.</p></Panel></div></AppShell>;

  return <AppShell titulo="Biblioteca de comandos" subtitulo="Aprende y consulta herramientas de Rhino aplicadas a joyería.">
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <a href="/aula-formacion" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-4"/> Volver al aula</a>
      <section className="relative overflow-hidden rounded-3xl border border-[#d8c39b]/70 bg-gradient-to-br from-[#fbf8f0] via-white to-[#f7f3eb] p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full border border-[#c4a46a]/20"/>
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#c4a46a]/30 bg-[#c4a46a]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[.15em] text-[#87652f]"><BookOpen className="size-3.5"/> FADILAB · Recurso permanente</span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#25231f] sm:text-3xl">Biblioteca de comandos Rhino</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#69645a]">Aprende qué hace cada herramienta, cuándo utilizarla y cómo aplicarla al diseño de joyería. Consulta una ficha antes de pasar a la práctica.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-[#776b58]"><span className="rounded-full border border-[#e5dccb] bg-white/80 px-3 py-1.5">{COMANDOS.length} fichas didácticas desarrolladas</span><span className="rounded-full border border-[#e5dccb] bg-white/80 px-3 py-1.5">{CATEGORIAS.length - 1} categorías</span><span className="rounded-full border border-[#e5dccb] bg-white/80 px-3 py-1.5">Referencia: Rhino 7</span></div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-[#98743c]">Ruta de aprendizaje</p><h2 className="mt-1 text-lg font-semibold text-foreground">16 capítulos de consulta</h2><p className="mt-1 text-sm text-muted-foreground">Selecciona un capítulo para consultar únicamente los comandos que lo componen.</p></div>
          <button type="button" onClick={() => { setCapitulo(null); setCategoria("Todas"); }} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-[#c4a46a] hover:text-foreground">Ver biblioteca completa</button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{CAPITULOS.map((cap) => <button key={cap.numero} type="button" onClick={() => { setCapitulo(cap.numero); setCategoria("Todas"); setAbierto(""); }} aria-pressed={capitulo===cap.numero} className={`rounded-xl border p-3 text-left transition ${capitulo===cap.numero ? "border-[#b99657] bg-[#fbf6eb] ring-1 ring-[#c4a46a]/20" : "border-border bg-background hover:border-[#c4a46a]"}`}><span className="text-[10px] font-semibold uppercase tracking-wider text-[#98743c]">Capítulo {String(cap.numero).padStart(2,"0")}</span><span className="mt-1 block text-sm font-semibold text-foreground">{cap.titulo}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{cap.objetivo}</span><span className="mt-2 block text-[10px] text-muted-foreground">{cap.comandos.length} {cap.comandos.length===1 ? "comando" : "comandos"}</span></button>)}</div>
      </section>

      <section className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><input value={busqueda} onChange={(e)=>setBusqueda(e.target.value)} placeholder="Buscar comando, función o aplicación en joyería…" className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none transition focus:border-[#c4a46a] focus:ring-2 focus:ring-[#c4a46a]/15"/></label>
        <span className="text-xs text-muted-foreground">{filtrados.length} resultados{capitulo !== null ? ` · Capítulo ${String(capitulo).padStart(2,"0")}` : ""}</span>
      </section>
      <div className="flex flex-wrap gap-2">{CATEGORIAS.map((item)=><button key={item} type="button" onClick={()=>setCategoria(item)} aria-pressed={categoria===item} className={`rounded-full border px-3 py-2 text-xs font-medium transition ${categoria===item ? "border-[#b99657] bg-[#b99657] text-white shadow-sm" : "border-border bg-background text-muted-foreground hover:border-[#c4a46a] hover:text-foreground"}`}>{item}</button>)}</div>

      {filtrados.length === 0 ? <Panel titulo="Sin resultados"><div className="py-8 text-center"><Search className="mx-auto size-7 text-muted-foreground"/><p className="mt-3 text-sm font-medium">No encontramos ese comando</p><p className="mt-1 text-xs text-muted-foreground">Prueba con otro nombre o cambia la categoría.</p></div></Panel> : <section className="grid gap-3 lg:grid-cols-2">{filtrados.map((item)=>{const seleccionado=abierto===item.nombre;return <article key={item.nombre} className={`overflow-hidden rounded-2xl border bg-card shadow-sm transition ${seleccionado ? "border-[#c4a46a]/70 ring-1 ring-[#c4a46a]/15" : "border-border"}`}>
        <button type="button" onClick={()=>setAbierto(seleccionado ? "" : item.nombre)} aria-expanded={seleccionado} className="flex w-full items-start gap-3 p-4 text-left">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#e5dccb] bg-[#faf6ed] text-[#98743c]"><Command className="size-5"/></span>
          <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="font-semibold text-foreground">{item.nombre}</span><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{item.categoria}</span></span><span className="mt-1 block text-sm leading-5 text-muted-foreground">{item.resumen}</span></span>
          <ChevronDown className={`mt-1 size-4 shrink-0 text-muted-foreground transition ${seleccionado ? "rotate-180" : ""}`}/>
        </button>
        {seleccionado && <div className="space-y-4 border-t border-border px-4 py-4">
          <div><p className="text-[10px] font-semibold uppercase tracking-wider text-[#98743c]">¿Cuándo utilizarlo?</p><p className="mt-1 text-sm leading-6 text-foreground">{item.uso}</p></div>
          <div><p className="text-[10px] font-semibold uppercase tracking-wider text-[#98743c]">Procedimiento básico</p><ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-5 text-foreground">{item.pasos.map((paso,i)=><li key={i}>{paso}</li>)}</ol></div>
          <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#e8dfce] bg-[#fcfaf5] p-3"><p className="flex items-center gap-2 text-xs font-semibold text-[#87652f]"><Lightbulb className="size-3.5"/> Ejemplo didáctico</p><p className="mt-1.5 text-sm leading-5 text-[#5f5a51]">{item.ejemplo}</p></div><div className="rounded-xl border border-border bg-muted/30 p-3"><p className="text-xs font-semibold text-foreground">Aplicación en joyería</p><p className="mt-1.5 text-sm leading-5 text-muted-foreground">{item.joyeria}</p></div></div>
          <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-3"><p className="text-xs font-semibold text-amber-900">Atención</p><p className="mt-1 text-sm leading-5 text-amber-900/80">{item.cuidado}</p></div>
        </div>}
      </article>})}</section>}
      <section className="rounded-2xl border border-border bg-muted/20 p-4 text-xs leading-5 text-muted-foreground"><p className="font-semibold text-foreground">Nota didáctica</p><p className="mt-1">Estas son fichas iniciales de consulta. Los pasos describen el flujo general y algunas opciones pueden variar según la versión, el método elegido y la configuración del documento. Antes de aplicar un comando a una pieza real, practica con geometría de prueba y revisa las indicaciones de la línea de comandos de Rhino.</p></section>

      <section aria-label="Estado del inventario de comandos" className="overflow-hidden rounded-2xl border border-[#d8c39b]/70 bg-gradient-to-br from-[#fbf8f0] via-white to-[#f7f3eb] p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl border border-[#c4a46a]/30 bg-[#c4a46a]/10 text-[#87652f]"><Command className="size-5"/></span>
            <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#98743c]">Estado de la biblioteca</p><h2 className="mt-1 text-lg font-semibold text-[#25231f]">Fichas didácticas desarrolladas</h2></div>
          </div>
          <div className="text-left sm:text-right"><p className="text-3xl font-semibold tabular-nums tracking-tight text-[#87652f]">{COMANDOS.length}</p><p className="text-xs text-[#776b58]">fichas disponibles</p></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#e5dccb] pt-4 sm:grid-cols-3">
          <div><p className="text-xl font-semibold tabular-nums text-[#25231f]">{CAPITULOS.length}</p><p className="text-xs text-[#776b58]">Capítulos temáticos</p></div>
          <div><p className="text-xl font-semibold tabular-nums text-[#25231f]">{CATEGORIAS.length - 1}</p><p className="text-xs text-[#776b58]">Categorías</p></div>
          <div className="col-span-2 sm:col-span-1"><p className="text-sm font-semibold text-[#25231f]">Inventario total Rhino 7</p><p className="text-xs text-[#776b58]">Pendiente de cotejo con la lista de comandos de una instalación concreta.</p></div>
        </div>
        <div className="mt-4 rounded-xl border border-[#e5dccb] bg-white/80 p-3">
          <p className="text-sm leading-5 text-[#5f5a51]">Las {COMANDOS.length} fichas son contenido didáctico elaborado para esta biblioteca; no representan el total de comandos que incluye Rhino 7. El inventario completo puede variar según la versión, los componentes y los complementos instalados.</p>
          <a href="https://docs.mcneel.com/rhino/7mac/help/es-es/commandlist/command_list.htm" target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-semibold text-[#87652f] underline underline-offset-4 hover:text-[#5f4724]">Consultar referencia oficial de comandos Rhino 7 ↗</a>
        </div>
      </section>
    </main>
  </AppShell>;
}
