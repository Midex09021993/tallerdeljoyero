import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Panel, useCapacidadesMenu } from "@/components/AppShell";
import { FichaDorada } from "@/components/FichaDorada";
import { Mail, Phone, ShoppingBag, FileText, UserRound, ChevronRight, Trash2, Cake, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { areaCoincide, useSesion } from "@/lib/auth";
import { CumpleanosClientes } from "@/components/CumpleanosClientes";
import { TelefonoInternacional } from "@/components/TelefonoInternacional";
import { CentroCampanasClientes } from "@/components/CentroCampanasClientes";
import { TODAS_LAS_SEDES, useSedeFiltroDueno } from "@/hooks/use-sede-filtro-dueno";

type Cliente = {
  id: string;
  nombre: string;
  tipo: "persona" | "empresa";
  documento: string | null;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  ciudad: string | null;
  direccion: string | null;
  estado: string;
  created_at: string;
  fecha_nacimiento: string | null;
  notas: string | null;
  sede_id: string | null;
  participante_id: string | null;
  sede_nombre: string;
};

type PedidoRef = { id: string; referencia: string; estado: string; importe: number | null; fecha_entrega: string | null };
type CotRef = { id: string; numero: string; estado: string; total: number | null };

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Aurum Lab" },
      { name: "description", content: "Directorio comercial y ficha de clientes del taller." },
    ],
  }),
  component: ClientesPage,
});

function money(n: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 2 }).format(n);
}

function ClientesPage() {
  const { data: sesion } = useSesion();
  const { esDueno, sedeFiltro } = useSedeFiltroDueno();
  const sedeContextoId = esDueno ? (sedeFiltro === TODAS_LAS_SEDES ? null : sedeFiltro) : (sesion?.participante?.sede_id ?? null);
  const { data: capacidades = [] } = useCapacidadesMenu(sesion);
  const cotizacionesHabilitadas = capacidades.includes("Cotizaciones");
  const puedeVer = Boolean(sesion?.esAdmin) || Boolean(sesion?.areas.some((area) => areaCoincide(area, "Área ventas")));
  // RLS de clientes permite escrituras al dueño o gerente autorizado para la sede; el área ventas consulta, pero no escribe por sí sola.
  const puedeGestionarClientes = Boolean(sesion?.esAdmin);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [seleccionado, setSeleccionado] = useState<Cliente | null>(null);
  const [pedidos, setPedidos] = useState<PedidoRef[]>([]);
  const [cotizaciones, setCotizaciones] = useState<CotRef[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null);
  const cargaHistorialRef = useRef(0);
  const [busca, setBusca] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [confirmarEliminacion, setConfirmarEliminacion] = useState(false);
  const [form, setForm] = useState({ nombre: "", tipo: "persona" as "persona" | "empresa", documento: "", telefono: "", whatsapp: "", email: "", ciudad: "", direccion: "", fecha_nacimiento: "", notas: "" });
  const [paisPredeterminadoTelefono, setPaisPredeterminadoTelefono] = useState("PE");
  const [vista, setVista] = useState<"clientes" | "cumpleanos" | "campanas">("clientes");

  useEffect(() => {
    let vigente = true;

    async function cargarPaisDelTaller() {
      let participanteId = seleccionado?.participante_id ?? sesion?.participante?.id ?? null;

      // Al crear desde la vista de propietario, la sede debe tener un único participante
      // activo (la misma regla que aplica el guardado del cliente).
      if (!seleccionado && esDueno && sedeContextoId) {
        const { data, error } = await supabase
          .from("ecosistema_participantes")
          .select("id")
          .eq("sede_id", sedeContextoId)
          .eq("estado", "activo")
          .limit(2);
        if (error || !data || data.length !== 1) participanteId = null;
        else participanteId = data[0]!.id;
      }

      if (!participanteId) {
        if (vigente) setPaisPredeterminadoTelefono("PE");
        return;
      }

      const { data, error } = await supabase
        .from("identidades_comerciales")
        .select("pais_codigo")
        .eq("participante_id", participanteId)
        .eq("activa", true)
        .order("nombre_comercial")
        .limit(1)
        .maybeSingle();

      if (!vigente) return;
      const codigo = !error && typeof data?.pais_codigo === "string" ? data.pais_codigo.toUpperCase() : "";
      setPaisPredeterminadoTelefono(/^[A-Z]{2}$/.test(codigo) ? codigo : "PE");
    }

    void cargarPaisDelTaller();
    return () => { vigente = false; };
  }, [esDueno, sedeContextoId, seleccionado?.id, seleccionado?.participante_id, sesion?.participante?.id]);
  const cargaClientesRef = useRef(0);

  const cargar = async () => {
    const cargaId = ++cargaClientesRef.current;
    if (!sesion?.participante?.id) {
      setClientes([]);
      setSeleccionado(null);
      return;
    }

    // Con una sede concreta, solo aceptamos contactos cuyo sede_id Y participante_id
    // correspondan a esa misma sede. Esto evita mostrar asociaciones cruzadas.
    let participanteIdsPermitidos: string[] | null = null;
    let participantesSedeCache: Array<{ id: string; nombre: string; sede_id: string | null }> = [];
    if (esDueno && sedeContextoId) {
      const { data: participantesSede, error: participantesSedeError } = await supabase
        .from("ecosistema_participantes")
        .select("id,nombre,sede_id")
        .eq("sede_id", sedeContextoId)
        .eq("estado", "activo");
      if (participantesSedeError) throw participantesSedeError;
      participantesSedeCache = (participantesSede ?? []) as typeof participantesSedeCache;
      participanteIdsPermitidos = [...new Set(participantesSedeCache.map((p) => p.id))];
      if (participanteIdsPermitidos.length === 0) {
        if (cargaId === cargaClientesRef.current) {
          setClientes([]);
          setSeleccionado(null);
        }
        return;
      }
    }

    let clientesQuery = supabase
      .from("clientes")
      .select("id,nombre,tipo,documento,telefono,whatsapp,email,ciudad,direccion,estado,created_at,fecha_nacimiento,notas,sede_id,participante_id")
      .order("nombre");
    if (esDueno) {
      if (sedeContextoId) {
        clientesQuery = clientesQuery.eq("sede_id", sedeContextoId).in("participante_id", participanteIdsPermitidos ?? []);
      }
    } else {
      clientesQuery = clientesQuery.eq("participante_id", sesion.participante.id);
    }
    const { data: clientesData, error: clientesError } = await clientesQuery;
    if (clientesError) throw clientesError;

    const participanteIds = [...new Set((clientesData ?? []).map((cliente) => cliente.participante_id).filter((id): id is string => Boolean(id)))];
    // Si ya consultamos los participantes activos de la sede seleccionada,
    // reutilizamos esos registros para nombres y validación de sede.
    const idsParticipantesPendientes = participanteIds.filter(
      (id) => !participantesSedeCache.some((participante) => participante.id === id),
    );
    const { data: participantesData, error: participantesError } = idsParticipantesPendientes.length
      ? await supabase.from("ecosistema_participantes").select("id,nombre,sede_id").in("id", idsParticipantesPendientes)
      : { data: [], error: null };
    if (participantesError) throw participantesError;
    const participantesResolucion = [...participantesSedeCache, ...(participantesData ?? [])];
    const participanteNombrePorId = new Map(participantesResolucion.map((p) => [p.id, p.nombre]));
    const sedePorParticipante = new Map(participantesResolucion.map((p) => [p.id, p.sede_id]));
    const clientesConSede = (clientesData ?? [])
      .filter((cliente) => !esDueno || !sedeContextoId || sedePorParticipante.get(cliente.participante_id ?? "") === sedeContextoId)
      .map((cliente) => ({
        ...cliente,
        sede_nombre: participanteNombrePorId.get(cliente.participante_id ?? "") ?? "Taller no identificado",
      })) as Cliente[];

    // Una consulta anterior no puede sobrescribir la lista de la sede recién seleccionada.
    if (cargaId !== cargaClientesRef.current) return;
    setClientes(clientesConSede);
    setSeleccionado((actual) => actual ? clientesConSede.find((c) => c.id === actual.id) ?? null : null);
  };

  useEffect(() => {
    if (puedeVer) void cargar().catch((error) => console.error("No se pudieron cargar los clientes de la sede seleccionada", error));
    else { cargaClientesRef.current += 1; setClientes([]); setSeleccionado(null); }
    return () => { cargaClientesRef.current += 1; };
  }, [puedeVer, sesion?.participante?.id, esDueno, sedeContextoId]);

  const seleccionadoId = seleccionado?.id;
  useEffect(() => {
    const cargaId = ++cargaHistorialRef.current;
    if (!seleccionadoId) {
      setPedidos([]);
      setCotizaciones([]);
      setCargandoHistorial(false);
      setErrorHistorial(null);
      return;
    }

    setPedidos([]);
    setCotizaciones([]);
    setCargandoHistorial(true);
    setErrorHistorial(null);
    void (async () => {
      try {
        const [ped, cot] = await Promise.all([
          supabase.from("pedidos").select("id,referencia,estado,importe,fecha_entrega").eq("cliente_id", seleccionadoId).order("created_at", { ascending: false }).limit(8),
          cotizacionesHabilitadas
            ? supabase.from("cotizaciones").select("id,numero,estado,total").eq("cliente_id", seleccionadoId).order("created_at", { ascending: false }).limit(8)
            : Promise.resolve({ data: [], error: null }),
        ]);
        if (cargaId !== cargaHistorialRef.current) return;
        if (ped.error || cot.error) {
          setErrorHistorial("No se pudo cargar todo el historial comercial. Inténtalo de nuevo.");
          return;
        }
        setPedidos((ped.data ?? []) as PedidoRef[]);
        setCotizaciones((cot.data ?? []) as CotRef[]);
      } catch (error) {
        if (cargaId !== cargaHistorialRef.current) return;
        console.error("[clientes] error al cargar historial", error);
        setErrorHistorial("No se pudo cargar el historial comercial. Inténtalo de nuevo.");
      } finally {
        if (cargaId === cargaHistorialRef.current) setCargandoHistorial(false);
      }
    })();

    return () => {
      cargaHistorialRef.current += 1;
    };
  }, [seleccionadoId, cotizacionesHabilitadas]);

  const filtrados = useMemo(() => {
    const normalizarBusqueda = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const q = normalizarBusqueda(busca.trim());
    return clientes.filter((c) => {
      const texto = normalizarBusqueda([c.nombre, c.documento ?? "", c.telefono ?? "", c.whatsapp ?? "", c.email ?? "", c.ciudad ?? "", c.direccion ?? "", c.notas ?? "", c.sede_nombre ?? ""].join(" "));
      return (!q || texto.includes(q)) && (estadoFiltro === "todos" || c.estado === estadoFiltro) && (tipoFiltro === "todos" || c.tipo === tipoFiltro);
    });
  }, [clientes, busca, estadoFiltro, tipoFiltro]);

  const activos = clientes.filter((c) => c.estado === "activo").length;

  function nuevoCliente() {
    // Crear una ficha nueva nunca debe reutilizar la selección anterior como destino de edición.
    setSeleccionado(null);
    setForm({ nombre: "", tipo: "persona", documento: "", telefono: "", whatsapp: "", email: "", ciudad: "", direccion: "", fecha_nacimiento: "", notas: "" });
    setModal(true);
  }

  function editarCliente() {
    if (!seleccionado) return;
    setForm({ nombre: seleccionado.nombre, tipo: seleccionado.tipo ?? "persona", documento: seleccionado.documento ?? "", telefono: seleccionado.telefono ?? "", whatsapp: seleccionado.whatsapp ?? "", email: seleccionado.email ?? "", ciudad: seleccionado.ciudad ?? "", direccion: seleccionado.direccion ?? "", fecha_nacimiento: seleccionado.fecha_nacimiento ?? "", notas: seleccionado.notas ?? "" });
    setModal(true);
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setGuardando(true);
    try {
      if (!sesion?.participante?.id) throw new Error("No hay un taller activo del Ecosistema para guardar el cliente.");
      if (!seleccionado && !sedeContextoId) throw new Error("Selecciona una sede específica desde Inicio antes de crear un cliente.");
      const payload = { nombre: form.nombre.trim(), tipo: form.tipo, documento: form.documento.trim() || null, telefono: form.telefono.trim() || null, whatsapp: form.whatsapp.trim() || null, email: form.email.trim() || null, ciudad: form.ciudad.trim() || null, direccion: form.direccion.trim() || null, fecha_nacimiento: form.fecha_nacimiento || null, notas: form.notas.trim() || "" };
      let error: { message: string; code?: string } | null = null;
      let clienteCreadoId: string | null = null;
      if (seleccionado) {
        // Editar un cliente no debe reasignarlo silenciosamente al participante predeterminado del propietario.
        const result = await supabase.from("clientes").update(payload).eq("id", seleccionado.id);
        error = result.error;
      } else {
        let participanteId = sesion.participante.id;
        if (esDueno) {
          const { data: participantesSede, error: errorParticipantes } = await supabase
            .from("ecosistema_participantes")
            .select("id")
            .eq("sede_id", sedeContextoId!)
            .eq("estado", "activo");
          if (errorParticipantes) throw errorParticipantes;
          if (!participantesSede?.length) throw new Error("No hay un participante activo para la sede seleccionada.");
          if (participantesSede.length > 1) throw new Error("Hay varios participantes activos en esta sede. No se creó el cliente para evitar una asociación incorrecta.");
          const participanteEncontrado = participantesSede[0]?.id;
          if (!participanteEncontrado) throw new Error("No se pudo determinar el participante activo de la sede.");
          participanteId = participanteEncontrado;
        }
        const result = await supabase
          .from("clientes")
          .insert({ ...payload, sede_id: sedeContextoId, participante_id: participanteId })
          .select("id")
          .single();
        error = result.error;
        clienteCreadoId = result.data?.id ?? null;
      }
      if (error) throw error;
      setModal(false);
      await cargar();
      if (!seleccionado) {
        const { data } = await supabase
          .from("clientes")
          .select("id,nombre,tipo,documento,telefono,whatsapp,email,ciudad,direccion,estado,created_at,fecha_nacimiento,notas,sede_id,participante_id")
          .eq("id", clienteCreadoId!)
          .maybeSingle();
        if (data) setSeleccionado({ ...data, tipo: data.tipo === "empresa" ? "empresa" : "persona", sede_nombre: sesion.participante.nombre });
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo guardar el cliente. Verifica tus permisos.");
    } finally { setGuardando(false); }
  }

  async function eliminarCliente() {
    if (!seleccionado || !sesion?.esDueno || eliminando) return;

    setEliminando(true);
    try {
      const clienteId = seleccionado.id;
      const { error } = await supabase.from("clientes").delete().eq("id", clienteId);
      if (error) throw error;

      // Actualización inmediata de la interfaz: no esperamos a una recarga completa.
      setClientes((actuales) => actuales.filter((cliente) => cliente.id !== clienteId));
      setSeleccionado(null);
      setConfirmarEliminacion(false);
      await cargar();
    } catch (error) {
      console.error(error);
      alert("No se pudo eliminar el cliente. Puede tener información relacionada que debe conservarse.");
    } finally {
      setEliminando(false);
    }
  }

  async function cambiarEstado() {
    if (!seleccionado) return;
    const nuevo = seleccionado.estado === "activo" ? "inactivo" : "activo";
    const { error } = await supabase.from("clientes").update({ estado: nuevo }).eq("id", seleccionado.id);
    if (error) { alert("No se pudo actualizar el estado."); return; }
    await cargar();
  }

  if (!puedeVer) {
    return <AppShell titulo="Clientes" subtitulo="Directorio comercial"><Panel titulo="Acceso restringido"><p className="p-6 text-sm text-muted-foreground">Esta sección contiene información comercial de clientes.</p></Panel></AppShell>;
  }

  return (
    <AppShell
      titulo="Clientes"
      subtitulo="Directorio comercial, historial y relación con cada cliente."
      acciones={
        <>
          <FichaDorada
            indicador="Directorio"
            titulo="Clientes"
            valor={clientes.length}
            descripcion="Clientes registrados"
            disabled
            icono={<UserRound className="size-5" strokeWidth={1.7} />}
          />
          <FichaDorada
            indicador="Estado"
            titulo="Activos"
            valor={activos}
            descripcion="Clientes activos"
            disabled
            icono={<UserRound className="size-5" strokeWidth={1.7} />}
          />
          {puedeGestionarClientes ? <button type="button" onClick={nuevoCliente} className="group relative min-h-[150px] overflow-hidden rounded-2xl border border-gold/25 bg-card px-5 py-5 text-left text-foreground shadow-[0_18px_45px_-28px_rgba(0,0,0,0.65)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_-24px_rgba(0,0,0,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60">
            <span className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-gold/10 blur-2xl transition-all duration-500 group-hover:bg-gold/20" />
            <span className="relative flex h-full flex-col justify-between">
              <span className="grid size-10 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110">+</span>
              <span><span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-gold/80">Acción</span><span className="mt-1 block text-lg font-semibold">Nuevo cliente</span></span>
            </span>
          </button> : null}
        </>
      }
    >
      <div className="mb-5 flex flex-wrap gap-2 rounded-[1.1rem] border border-[#293B4A]/10 bg-[#FFFEFC] p-2 shadow-[0_5px_18px_-14px_rgba(24,40,56,.28)]"><button type="button" onClick={()=>setVista("clientes")} className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${vista==="clientes"?"bg-[#C5A36B] text-[#182838] shadow-[0_3px_10px_rgba(146,115,75,.22)] ring-1 ring-[#92734B]/20":"text-[#687887] hover:bg-[#F0EDE6] hover:text-[#293B4A]"}`}>Clientes</button><button type="button" onClick={()=>setVista("cumpleanos")} className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${vista==="cumpleanos"?"bg-[#C5A36B] text-[#182838] shadow-[0_3px_10px_rgba(146,115,75,.22)] ring-1 ring-[#92734B]/20":"text-[#687887] hover:bg-[#F0EDE6] hover:text-[#293B4A]"}`}><Cake className="mr-2 inline size-4"/>Cumpleaños</button><button type="button" onClick={()=>setVista("campanas")} className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${vista==="campanas"?"bg-[#C5A36B] text-[#182838] shadow-[0_3px_10px_rgba(146,115,75,.22)] ring-1 ring-[#92734B]/20":"text-[#687887] hover:bg-[#F0EDE6] hover:text-[#293B4A]"}`}><Mail className="mr-2 inline size-4"/>Campañas</button></div>
      <div className={vista==="clientes"?"grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]":"hidden"}>
        <section className={`overflow-hidden rounded-[1.2rem] border border-[#293B4A]/10 bg-[#FFFEFC] shadow-[0_2px_5px_rgba(24,40,56,.035),0_16px_38px_-27px_rgba(24,40,56,.25)] ${seleccionado ? "hidden xl:block" : "block"}`}>
          <div className="border-b border-[#293B4A]/10 bg-[linear-gradient(110deg,#FFFEFC,#F8F5EF)] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#92734B]">CRM <span className="px-1 text-[#C5A36B]/70">/</span> DIRECTORIO</p>
                <div className="flex flex-wrap items-center gap-2"><h2 className="mt-1 text-[1.15rem] font-semibold tracking-tight text-[#182838]">Clientes del taller</h2><span className="rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{filtrados.length} {filtrados.length === 1 ? "resultado" : "resultados"}</span></div>
              </div>
              <div className="flex gap-2">
                <select aria-label="Filtrar por tipo de cliente" value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className="h-10 min-w-0 rounded-lg border border-[#293B4A]/15 bg-white px-3 text-sm text-[#293B4A] outline-none transition focus:border-[#C5A36B] focus:ring-2 focus:ring-[#C5A36B]/15">
                  <option value="todos">Todos los tipos</option><option value="persona">Particulares</option><option value="empresa">Empresas</option>
                </select>
                <select aria-label="Filtrar por estado" value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="h-10 rounded-lg border border-[#293B4A]/15 bg-white px-3 text-sm text-[#293B4A] outline-none transition focus:border-[#C5A36B] focus:ring-2 focus:ring-[#C5A36B]/15">
                  <option value="todos">Todos los estados</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option>
                </select>
              </div>
            </div>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nombre, documento, teléfono, WhatsApp, correo o ciudad..." className="mt-4 h-11 w-full rounded-lg border border-[#293B4A]/15 bg-white px-4 text-sm text-[#293B4A] outline-none placeholder:text-[#87939D] transition focus:border-[#C5A36B] focus:ring-2 focus:ring-[#C5A36B]/15" />
          </div>
          <div className="max-h-[min(72vh,780px)] divide-y divide-[#293B4A]/[0.07] overflow-y-auto">
            {filtrados.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No encontramos clientes con esos filtros.</p> : filtrados.map((cliente) => (
              <button key={cliente.id} type="button" onClick={() => setSeleccionado(cliente)} className={`relative flex w-full items-center gap-3 px-4 py-4 text-left transition-all hover:bg-[#F5F1E8]/75 sm:px-5 ${seleccionado?.id === cliente.id ? "bg-[#F5F1E8] shadow-[inset_3px_0_0_#C5A36B]" : ""}`}>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#C5A36B]/30 bg-[#F3EBDD] text-sm font-semibold text-[#92734B]">{cliente.nombre.charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1.5"><span className="truncate text-sm font-semibold">{cliente.nombre}</span>{cliente.fecha_nacimiento&&cliente.fecha_nacimiento.slice(5)===`${String(new Date().getMonth()+1).padStart(2,"0")}-${String(new Date().getDate()).padStart(2,"0")}`?<Cake className="size-3.5 shrink-0 text-gold" aria-label="Cumpleaños hoy"/>:null}{cliente.fecha_nacimiento&&Number(cliente.fecha_nacimiento.slice(5,7))===new Date().getMonth()+1?<span className="shrink-0 rounded-full bg-gold/10 px-1.5 py-0.5 text-[9px] text-gold">Cumple este mes</span>:null}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{cliente.sede_nombre} · {cliente.tipo === "empresa" ? "Empresa" : "Particular"} · {cliente.telefono || cliente.whatsapp || cliente.email || "Sin contacto registrado"}</span>
                </span>
                <span className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${cliente.estado === "activo" ? "bg-success-soft text-success" : "bg-surface-muted text-muted-foreground"}`}>{cliente.estado}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={`overflow-hidden rounded-[1.2rem] border border-[#293B4A]/10 bg-[#FFFEFC] shadow-[0_2px_5px_rgba(24,40,56,.035),0_16px_38px_-27px_rgba(24,40,56,.25)] ${seleccionado ? "block" : "hidden xl:block"}`}>
          {seleccionado ? (
            <div>
              <div className="border-b border-[#293B4A]/10 bg-[#FFFEFC] px-4 py-3 xl:hidden">
                <button type="button" onClick={() => setSeleccionado(null)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#C5A36B]/30 bg-[#F5F1E8] px-3 text-sm font-semibold text-[#293B4A] transition hover:bg-[#EEE7D9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A36B]">
                  <ArrowLeft className="size-4" aria-hidden="true" /> Volver a clientes
                </button>
              </div>
              <div className="relative overflow-hidden border-b border-[#C5A36B]/25 bg-[linear-gradient(118deg,#FFFEFC_0%,#F8F4EC_72%,#F2E9D8_100%)] px-5 py-7 text-[#293B4A] sm:px-6">
                <span className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#C9A227]/10 blur-3xl" />
                <span className="pointer-events-none absolute -bottom-20 left-1/3 size-40 rounded-full bg-[#C9A227]/5 blur-3xl" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-[#C9A227]/30 bg-[#F3E5C2] text-lg font-semibold text-[#8B6710] shadow-[0_8px_24px_-16px_rgba(139,103,16,.35)]">{seleccionado.nombre.charAt(0).toUpperCase()}</span>
                    <div className="min-w-0"><p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#9A7418]">RELACIÓN CON EL CLIENTE <span className="px-1 text-[#C5A36B]/60">/</span> PERFIL</p><h2 className="mt-1 truncate text-xl font-semibold tracking-tight">{seleccionado.nombre}</h2><p className="mt-1 text-[11px] text-[#617487]">{seleccionado.tipo === "empresa" ? "Cliente empresa" : "Cliente particular"} · Relación comercial · Aurum Lab</p><p className="mt-1 text-[11px] font-medium text-[#9A7418]">Sede · {seleccionado.sede_nombre}</p></div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider ${seleccionado.estado === "activo" ? "border-success/30 bg-success/10 text-success" : "border-border bg-surface-muted text-muted-foreground"}`}>{seleccionado.estado}</span>
                </div>
              </div>
              <div className="space-y-5 p-5 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#293B4A]/[0.09] bg-[#F5F1E8]/55 p-4"><span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{seleccionado.tipo === "empresa" ? "Razón social / Empresa" : "Nombre del cliente"}</span><p className="mt-2 truncate text-sm font-medium">{seleccionado.nombre}</p></div>
                  <div className="rounded-2xl border border-border bg-surface-muted/45 p-4"><span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{seleccionado.tipo === "empresa" ? "RUC / Documento fiscal" : "DNI / Documento"}</span><p className="mt-2 truncate text-sm font-medium">{seleccionado.documento || "No registrado"}</p></div>
                  <div className="group rounded-xl border border-[#293B4A]/[0.09] bg-[#F5F1E8]/55 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C5A36B]/45 hover:shadow-[0_12px_28px_-20px_rgba(24,40,56,.24)]"><div className="flex items-center justify-between"><span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Teléfono</span><Phone className="size-4 text-gold/60" strokeWidth={1.6} /></div>{seleccionado.telefono ? <a href={`tel:${seleccionado.telefono}`} className="mt-2 block truncate text-sm font-medium underline-offset-4 hover:text-gold hover:underline">{seleccionado.telefono}</a> : <p className="mt-2 text-sm text-muted-foreground">No registrado</p>}</div>
                  <div className="group rounded-2xl border border-border bg-surface-muted/45 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/25 hover:shadow-[0_12px_28px_-20px_hsl(var(--gold)/0.5)]"><div className="flex items-center justify-between"><span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Correo electrónico</span><Mail className="size-4 text-gold/60" strokeWidth={1.6} /></div>{seleccionado.email ? <a href={`mailto:${seleccionado.email}`} className="mt-2 block truncate text-sm font-medium underline-offset-4 hover:text-gold hover:underline">{seleccionado.email}</a> : <p className="mt-2 text-sm text-muted-foreground">No registrado</p>}</div><div className="rounded-2xl border border-border bg-surface-muted/45 p-4"><span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">WhatsApp</span>{seleccionado.whatsapp ? <a href={`https://wa.me/${seleccionado.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="mt-2 block truncate text-sm font-medium underline-offset-4 hover:text-gold hover:underline">Abrir chat · {seleccionado.whatsapp}</a> : <p className="mt-2 text-sm text-muted-foreground">No registrado</p>}</div><div className="rounded-2xl border border-border bg-surface-muted/45 p-4"><span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Ciudad</span><p className="mt-2 truncate text-sm font-medium">{seleccionado.ciudad || "No registrada"}</p></div><div className="rounded-2xl border border-border bg-surface-muted/45 p-4"><span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Dirección</span><p className="mt-2 line-clamp-2 text-sm font-medium">{seleccionado.direccion || "No registrada"}</p></div><div className="rounded-2xl border border-border bg-surface-muted/45 p-4"><span className="text-[9px] font-semibold uppercase text-muted-foreground">Fecha de nacimiento</span><p className="mt-2 text-sm">{seleccionado.fecha_nacimiento?new Date(`${seleccionado.fecha_nacimiento}T12:00:00`).toLocaleDateString("es-PE",{day:"2-digit",month:"long",year:"numeric"}):"No registrada"}</p></div>
                </div>{seleccionado.notas?<p className="mt-3 whitespace-pre-wrap rounded-xl border border-border p-3 text-xs text-muted-foreground">{seleccionado.notas}</p>:null}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Link to="/pedidos" className="group rounded-2xl border border-border bg-card p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-gold/35 hover:shadow-[0_16px_34px_-22px_hsl(var(--gold)/0.7)]"><div className="flex items-center justify-between"><span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Pedidos</span><ShoppingBag className="size-4 text-gold/65" strokeWidth={1.6} /></div><div className="mt-5 flex items-end justify-between"><span className="text-3xl font-semibold tabular-nums tracking-tight">{pedidos.length}</span><ChevronRight className="size-4 text-muted-foreground/40 group-hover:translate-x-1 group-hover:text-gold" /></div><span className="mt-1 block text-[10px] text-muted-foreground">Últimos pedidos cargados</span></Link>
                  {cotizacionesHabilitadas ? <Link to="/cotizaciones" className="group rounded-2xl border border-border bg-card p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-gold/35 hover:shadow-[0_16px_34px_-22px_hsl(var(--gold)/0.7)]"><div className="flex items-center justify-between"><span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cotizaciones</span><FileText className="size-4 text-gold/65" strokeWidth={1.6} /></div><div className="mt-5 flex items-end justify-between"><span className="text-3xl font-semibold tabular-nums tracking-tight">{cotizaciones.length}</span><ChevronRight className="size-4 text-muted-foreground/40 group-hover:translate-x-1 group-hover:text-gold" /></div><span className="mt-1 block text-[10px] text-muted-foreground">Últimas cotizaciones cargadas</span></Link> : null}
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  {puedeGestionarClientes ? <button type="button" onClick={editarCliente} className="group inline-flex items-center gap-2 rounded-xl border border-gold/25 bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-gold/5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-16px_rgba(0,0,0,0.65)]">Editar ficha <ChevronRight className="size-3.5 group-hover:translate-x-0.5" /></button> : null}
                  {puedeGestionarClientes ? <button type="button" onClick={cambiarEstado} className="rounded-xl border border-border px-4 py-2.5 text-xs font-medium transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/30 hover:bg-gold/5">{seleccionado.estado === "activo" ? "Desactivar" : "Activar"}</button> : null}
                  {sesion?.esDueno ? <button type="button" onClick={() => setConfirmarEliminacion(true)} disabled={guardando || eliminando} className="inline-flex items-center gap-2 rounded-xl border border-danger/25 px-4 py-2.5 text-xs font-semibold text-danger transition-all duration-300 hover:-translate-y-0.5 hover:bg-danger/5 disabled:opacity-50"><Trash2 className="size-3.5" /> Eliminar cliente</button> : null}
                </div>
                <div className="mt-6 rounded-2xl border border-[#293B4A]/10 bg-[#F5F1E8]/65 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><h3 className="text-sm font-semibold">Resumen comercial</h3><p className="mt-1 text-[11px] text-muted-foreground">Basado en los últimos registros cargados de esta ficha.</p></div>
                    {cargandoHistorial ? <span className="text-[10px] text-muted-foreground">Actualizando…</span> : null}
                  </div>
                  {errorHistorial ? <p className="mt-3 text-xs text-destructive">Resumen no disponible hasta recuperar el historial.</p> : <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {cotizacionesHabilitadas ? <>
                      <div className="rounded-xl border border-[#293B4A]/10 bg-[#FFFEFC] p-3"><p className="text-[10px] text-muted-foreground">Cotizaciones aprobadas</p><p className="mt-1 text-2xl font-semibold tabular-nums">{cotizaciones.filter((q) => q.estado === "aprobada").length}</p></div>
                      <div className="rounded-xl border border-border bg-card p-3"><p className="text-[10px] text-muted-foreground">Pendientes de respuesta</p><p className="mt-1 text-2xl font-semibold tabular-nums">{cotizaciones.filter((q) => ["borrador", "enviada", "requiere_revision"].includes(q.estado)).length}</p></div>
                      <div className="rounded-xl border border-border bg-card p-3"><p className="text-[10px] text-muted-foreground">Cotizaciones rechazadas</p><p className="mt-1 text-2xl font-semibold tabular-nums">{cotizaciones.filter((q) => q.estado === "rechazada").length}</p></div>
                    </> : null}
                    <div className="rounded-xl border border-border bg-card p-3"><p className="text-[10px] text-muted-foreground">Pedidos en curso</p><p className="mt-1 text-2xl font-semibold tabular-nums">{pedidos.filter((p) => !["Entregado", "Cancelado"].includes(p.estado)).length}</p></div>
                    <div className="rounded-xl border border-border bg-card p-3"><p className="text-[10px] text-muted-foreground">Pedidos entregados</p><p className="mt-1 text-2xl font-semibold tabular-nums">{pedidos.filter((p) => p.estado === "Entregado").length}</p></div>
                    <div className="rounded-xl border border-border bg-card p-3"><p className="text-[10px] text-muted-foreground">Pedidos cancelados</p><p className="mt-1 text-2xl font-semibold tabular-nums">{pedidos.filter((p) => p.estado === "Cancelado").length}</p></div>
                  </div>}
                </div>
                <div className="mt-7">
                  <SectionTitle title="Cotizaciones recientes" />
                  <p className="mt-1 text-[11px] text-muted-foreground">Se muestran como máximo las 8 más recientes.</p>
                  <div className="mt-2 divide-y divide-border rounded-xl border border-border">
                    {errorHistorial ? <p role="alert" className="p-4 text-xs text-destructive">{errorHistorial}</p> : cargandoHistorial ? <p role="status" className="p-4 text-xs text-muted-foreground">Cargando historial…</p> : cotizaciones.length ? cotizaciones.map((q) => <Link key={q.id} to="/cotizaciones/$id" params={{ id: q.id }} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs transition-colors hover:bg-surface-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/50"><span className="min-w-0 flex-1"><b className="break-words">{q.numero}</b><span className="ml-2 inline-flex max-w-full rounded-full border border-gold/20 bg-gold/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{q.estado || "Sin estado"}</span></span><span className="flex shrink-0 items-center gap-2"><b>{money(Number(q.total) || 0)}</b><ChevronRight className="size-3.5 text-muted-foreground" /></span></Link>) : <p className="p-4 text-xs text-muted-foreground">Sin cotizaciones registradas.</p>}
                  </div>
                </div>
                <div className="mt-6">
                  <SectionTitle title="Pedidos recientes" />
                  <p className="mt-1 text-[11px] text-muted-foreground">Se muestran como máximo los 8 más recientes.</p>
                  <div className="mt-2 divide-y divide-border rounded-xl border border-border">
                    {errorHistorial ? <p role="alert" className="p-4 text-xs text-destructive">{errorHistorial}</p> : cargandoHistorial ? <p role="status" className="p-4 text-xs text-muted-foreground">Cargando historial…</p> : pedidos.length ? pedidos.map((p) => <Link key={p.id} to="/pedidos/$id" params={{ id: p.id }} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs transition-colors hover:bg-surface-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/50"><span className="min-w-0 flex-1"><b className="break-words">{p.referencia}</b><span className="ml-2 inline-flex max-w-full rounded-full border border-gold/20 bg-gold/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{p.estado || "Sin estado"}</span></span><span className="flex shrink-0 items-center gap-2"><b>{p.importe == null ? "—" : money(Number(p.importe))}</b><ChevronRight className="size-3.5 text-muted-foreground" /></span></Link>) : <p className="p-4 text-xs text-muted-foreground">Sin pedidos registrados.</p>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative flex min-h-[620px] items-center justify-center overflow-hidden p-8 text-center"><span className="pointer-events-none absolute size-64 rounded-full bg-gold/[0.035] blur-3xl" />
              <div><span className="relative mx-auto grid size-20 place-items-center rounded-full border border-gold/15 bg-gold/[0.025] text-2xl text-gold shadow-[0_20px_60px_-35px_hsl(var(--gold)/0.7)] before:absolute before:inset-[-14px] before:rounded-full before:border before:border-gold/10 after:absolute after:inset-[-28px] after:rounded-full after:border after:border-gold/5">◇</span><h2 className="mt-4 text-lg font-semibold">Selecciona un cliente</h2><p className="mt-1 max-w-xs text-sm text-muted-foreground">Aquí verás sus datos y su relación comercial con el taller.</p></div>
            </div>
          )}
        </section>
      </div>
      {vista==="cumpleanos"?<CumpleanosClientes clientes={clientes} alSeleccionar={id=>{const c=clientes.find(x=>x.id===id);if(c){setSeleccionado(c);setVista("clientes");}}}/>:null}{vista==="campanas"?<CentroCampanasClientes clientes={clientes}/>:null}

      {confirmarEliminacion && seleccionado ? <div className="fixed inset-0 z-[60] grid place-items-center bg-foreground/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="confirmar-eliminacion-titulo">
        <div className="w-full max-w-md rounded-2xl border border-danger/20 bg-card p-6 shadow-raised">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger"><Trash2 className="size-5" /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-danger/80">Eliminar cliente</p>
              <h2 id="confirmar-eliminacion-titulo" className="mt-1 text-lg font-semibold">¿Eliminar definitivamente a {seleccionado.nombre}?</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Esta acción no se puede deshacer. Se eliminará la ficha del cliente y la información relacionada que permita la base de datos.</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmarEliminacion(false)} disabled={eliminando} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface-muted disabled:opacity-50">Cancelar</button>
            <button type="button" onClick={() => void eliminarCliente()} disabled={eliminando} className="inline-flex items-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              <Trash2 className="size-4" /> {eliminando ? "Eliminando..." : "Sí, eliminar cliente"}
            </button>
          </div>
        </div>
      </div> : null}

      {modal ? <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/10 p-3 sm:p-5" role="dialog" aria-modal="true">
        <form onSubmit={guardar} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-raised sm:p-5">
          <div className="sticky top-0 z-10 -mx-1 flex items-start justify-between gap-3 bg-card px-1 pb-3">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">Ficha comercial</p><h2 className="mt-1 text-xl font-semibold">{seleccionado ? "Editar cliente" : "Nuevo cliente"}</h2></div>
            <button type="button" onClick={() => setModal(false)} aria-label="Cerrar formulario" className="rounded-lg px-2 py-1 text-muted-foreground">✕</button>
          </div>
          <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-foreground">Tipo de cliente<select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as "persona" | "empresa" })} className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"><option value="persona">Particular</option><option value="empresa">Empresa</option></select></label>
            <Field label={form.tipo === "empresa" ? "Razón social / Nombre de empresa" : "Nombre completo"} value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} required />
            <Field label={form.tipo === "empresa" ? "RUC / Documento fiscal (opcional)" : "DNI / Documento (opcional)"} value={form.documento} onChange={(v) => setForm({ ...form, documento: v })} />
            <div className="sm:col-span-2"><TelefonoInternacional id="cliente-telefono" value={form.telefono} defaultCountry={paisPredeterminadoTelefono} onChange={(telefono) => setForm((actual) => ({ ...actual, telefono }))} /></div>
            <Field label="WhatsApp (opcional)" type="tel" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} />
            <Field label="Correo electrónico" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Field label="Ciudad" value={form.ciudad} onChange={(v) => setForm({ ...form, ciudad: v })} />
            <Field label="Dirección" value={form.direccion} onChange={(v) => setForm({ ...form, direccion: v })} />
            <Field label="Fecha de nacimiento (opcional)" type="date" value={form.fecha_nacimiento} onChange={v=>setForm({...form,fecha_nacimiento:v})}/>
            <label className="block text-xs font-medium sm:col-span-2">Observaciones<textarea value={form.notas} onChange={e=>setForm({...form,notas:e.target.value})} rows={2} className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm"/></label>
          </div>
          <div className="sticky bottom-0 mt-4 flex justify-end gap-2 border-t border-border bg-card pt-3"><button type="button" onClick={() => setModal(false)} className="rounded-xl border border-border px-4 py-2 text-sm">Cancelar</button><button type="submit" disabled={guardando} className="rounded-xl border border-gold/25 bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-gold/5 disabled:opacity-50">{guardando ? "Guardando..." : "Guardar cliente"}</button></div>
        </form>
      </div> : null}
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-surface-muted p-3"><p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm">{value}</p></div>;
}
function MiniMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-border p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>;
}
function SectionTitle({ title }: { title: string }) { return <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>; }
function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return <label className="block text-xs font-medium text-foreground">{label}<input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20" /></label>;
}
