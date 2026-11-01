import { useMemo, useState, type FormEvent, type ChangeEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarDirectorioAlumnosFormacion } from "@/lib/aula-formacion.functions";
import { BookOpen, Users, Plus, Upload, FileText, Download, CalendarDays, ShieldCheck, Send, Pencil, Trash2, CheckCircle2, ChevronLeft, ChevronRight, BookOpenCheck } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { useSesion } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/aula-formacion")({
  head: () => ({ meta: [{ title: "Aula de formación — Taller del Joyero" }, { name: "description", content: "Aula académica para cursos, materiales y seguimiento de formación." }] }),
  component: AulaFormacionPage,
});

type Curso = { id: string; participante_id: string; titulo: string; descripcion: string | null; duracion_horas: number; estado: string };
type Inscripcion = { id: string; curso_id: string; email_alumno: string; nombre_alumno: string | null; estado: string; formacion_cursos: Curso | null };
type Material = { id: string; curso_id: string; titulo: string; descripcion: string | null; nombre_archivo: string; ruta_storage: string; mime_type: string; tamano_bytes: number; created_at: string };
type SesionCurso = { id: string; curso_id: string; numero: number; titulo: string; descripcion: string | null; duracion_horas: number; fecha_programada: string | null; publicada: boolean };
type Examen = { id: string; curso_id: string; titulo: string; instrucciones: string | null; duracion_minutos: number | null; intentos_permitidos: number; puntaje_maximo: number; publicado: boolean; disponible_desde: string | null; disponible_hasta: string | null };
type Pregunta = { id: string; examen_id: string; tipo: "opcion_multiple" | "verdadero_falso" | "practica"; enunciado: string; opciones: Array<{label:string;value:string}>; puntaje: number; orden: number; obligatoria: boolean };
type ExamenAlumno = { id: string; titulo: string; instrucciones: string | null; duracion_minutos: number | null; puntaje_maximo: number; preguntas: Array<{id:string;tipo:string;enunciado:string;opciones:Array<{label:string;value:string}>;puntaje:number;orden:number;obligatoria:boolean}> };
type Intento = { id: string; examen_id: string; numero_intento: number; calificacion: number | null; estado: string; enviado_en: string; observaciones_docente: string | null };


const LECTURA_SESION_1 = [
  { titulo: "1. El diseño CAD aplicado a la joyería", bloques: [
    "CAD significa diseño asistido por computadora. En joyería permite construir, revisar y modificar digitalmente la geometría de una pieza antes de producirla.",
    "El modelo digital facilita estudiar proporciones, dimensiones, ubicación de componentes y posibles interferencias. También permite conservar un archivo editable para continuar el trabajo.",
    "El CAD complementa el conocimiento artesanal; no reemplaza el criterio del joyero sobre diseño, materiales, fabricación y acabado."
  ]},
  { titulo: "2. Introducción a Rhinoceros 7", bloques: [
    "Rhinoceros (Rhino) es un programa de modelado tridimensional utilizado en diseño industrial, arquitectura, producto y joyería.",
    "Trabaja con geometría NURBS, que permite representar curvas y superficies mediante definiciones matemáticas. En esta sesión no construiremos superficies ni sólidos: primero aprenderemos a reconocer el espacio de trabajo y a navegarlo."
  ]},
  { titulo: "3. Reconocimiento de la interfaz", bloques: [
    "Área gráfica y ventanas: es la zona donde se visualiza y construye el modelo. De forma predeterminada aparecen Top (superior), Front (frontal), Right (derecha) y Perspective (perspectiva).",
    "Línea de comandos: permite escribir comandos y consultar indicaciones del programa. Observa sus mensajes porque Rhino comunica allí las opciones y solicitudes de cada operación.",
    "Barras y paneles: contienen herramientas y paneles de propiedades, capas y otras funciones. Su disposición puede variar según la configuración del espacio de trabajo.",
    "Títulos de las ventanas: identifican cada vista. Haz doble clic en el título para maximizarla y repite la acción para restaurarla."
  ]},
  { titulo: "4. Vistas y orientación espacial", bloques: [
    "Top observa desde arriba; Front desde el frente; Right desde la derecha. Son vistas paralelas. Perspective representa profundidad y permite inspeccionar el modelo desde una orientación tridimensional.",
    "Los ejes X, Y y Z representan direcciones del espacio. En el sistema de referencia habitual, Z corresponde a la altura. La orientación visible de los ejes depende de la vista activa."
  ]},
  { titulo: "5. Navegación básica en Rhino 7 para Windows", bloques: [
    "Zoom: gira la rueda del ratón para acercar o alejar la vista.",
    "Desplazar una vista paralela: mantén pulsado el botón derecho y arrastra.",
    "Girar Perspective: mantén pulsado el botón derecho y arrastra.",
    "Desplazar Perspective: mantén pulsadas las teclas Shift y el botón derecho, y arrastra.",
    "Maximizar/restaurar: haz doble clic en el título de la ventana.",
    "Zoom Extents: escribe este comando en la línea de comandos para encuadrar los objetos visibles."
  ]},
  { titulo: "6. Configuración inicial del entorno", bloques: [
    "Antes de modelar, verifica que el archivo utilice las unidades indicadas por el docente. En joyería es habitual trabajar con unidades pequeñas, pero la unidad concreta debe responder a las instrucciones del ejercicio y a los requisitos del proyecto.",
    "No cambies las unidades de un archivo sin comprender cómo afecta a sus dimensiones. Para esta sesión, todo el grupo debe utilizar una plantilla y unidades comunes. Comprueba también que las cuatro ventanas estén visibles y que la línea de comandos pueda leerse."
  ]},
  { titulo: "7. Del diseño digital a la manufactura aditiva", bloques: [
    "El flujo general puede resumirse así: diseño CAD → preparación del archivo → impresión 3D → validación del modelo.",
    "En joyería pueden existir rutas posteriores distintas, como utilizar un patrón para fundición a la cera perdida o elaborar un patrón maestro para fabricar moldes. Aquí solo reconocemos la conexión entre el modelo digital y la producción.",
    "La elección de una resina calcinable depende del material y del proceso recomendado. No todas las resinas de impresión son intercambiables."
  ]},
  { titulo: "8. Actividad práctica: mi primer recorrido por el espacio 3D", bloques: [
    "Realiza esta secuencia individualmente. No es necesario dibujar todavía:",
    "1) Abre Rhino 7 y localiza la línea de comandos, las barras y los paneles.  2) Identifica Top, Front, Right y Perspective.  3) Activa cada ventana y observa cómo cambia la vista.",
    "4) Localiza X, Y y Z.  5) En una vista paralela, acerca y aleja con la rueda.  6) En una vista paralela, mantén el botón derecho y arrastra para desplazar.",
    "7) En Perspective, mantén el botón derecho y arrastra para girar.  8) Usa Shift + botón derecho y arrastra para desplazar.  9) Maximiza Perspective con doble clic en su título y luego restáurala.",
    "10) Escribe Zoom Extents en la línea de comandos.  11) Guarda el archivo como Sesion_01_Primer_Recorrido.3dm en la carpeta indicada por el docente."
  ]},
  { titulo: "9. Comprobación de aprendizaje", bloques: [
    "Al terminar, debes poder identificar las cuatro ventanas principales, reconocer los ejes X/Y/Z, realizar zoom, desplazamiento y rotación, maximizar y restaurar una ventana, ejecutar Zoom Extents y guardar un archivo .3dm.",
    "Repasa estas preguntas: ¿qué significa CAD y cómo ayuda al joyero? ¿Qué diferencia hay entre una vista paralela y Perspective? ¿Para qué sirve la línea de comandos? ¿Qué hace Zoom Extents?"
  ]}
] as const;

function AulaFormacionPage() {
  const { data: sesion, isLoading: cargandoSesion } = useSesion();
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState("Rhino para Joyería · Nivel 1");
  const [descripcion, setDescripcion] = useState("Formación presencial de modelado 3D para joyería.");
  const [duracion, setDuracion] = useState("20");
  const [cursoSeleccionado, setCursoSeleccionado] = useState("");
  const [cursoEditandoId, setCursoEditandoId] = useState("");
  const [tituloCursoEditado, setTituloCursoEditado] = useState("");
  const [nombreAlumno, setNombreAlumno] = useState("");
  const [emailAlumno, setEmailAlumno] = useState("");
  const [tallerAlumnoFiltro, setTallerAlumnoFiltro] = useState("todos");
  const [busquedaAlumno, setBusquedaAlumno] = useState("");
  const [alumnosSeleccionados, setAlumnosSeleccionados] = useState<string[]>([]);
  const listarDirectorio = useServerFn(listarDirectorioAlumnosFormacion);
  const [numeroSesion, setNumeroSesion] = useState("1");
  const [tituloSesion, setTituloSesion] = useState("");
  const [detalleSesion, setDetalleSesion] = useState("");
  const [sesionEditandoId, setSesionEditandoId] = useState("");
  const [numeroSesionEditado, setNumeroSesionEditado] = useState("1");
  const [tituloSesionEditado, setTituloSesionEditado] = useState("");
  const [detalleSesionEditado, setDetalleSesionEditado] = useState("");
  const [lecturaEditando, setLecturaEditando] = useState<SesionCurso | null>(null);
  const [seccionesLecturaEditadas, setSeccionesLecturaEditadas] = useState<Array<{titulo:string;bloques:string[]}>>([]);
  const [cargandoLecturaDocente, setCargandoLecturaDocente] = useState(false);
  const [estadoGuardadoLectura, setEstadoGuardadoLectura] = useState<{tipo:"success"|"error"|"info"; texto:string} | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [tituloMaterial, setTituloMaterial] = useState("");
  const [publicarMaterial, setPublicarMaterial] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [tituloExamen, setTituloExamen] = useState("Evaluación de la sesión");
  const [instruccionesExamen, setInstruccionesExamen] = useState("");
  const [duracionExamen, setDuracionExamen] = useState("30");
  const [intentosExamen, setIntentosExamen] = useState("1");
  const [examenSeleccionado, setExamenSeleccionado] = useState("");
  const [tipoPregunta, setTipoPregunta] = useState<"opcion_multiple" | "verdadero_falso" | "practica">("opcion_multiple");
  const [enunciadoPregunta, setEnunciadoPregunta] = useState("");
  const [opcionesPregunta, setOpcionesPregunta] = useState("Opción A\nOpción B\nOpción C\nOpción D");
  const [respuestaCorrecta, setRespuestaCorrecta] = useState("Opción A");
  const [puntajePregunta, setPuntajePregunta] = useState("1");
  const [examenActivoAlumno, setExamenActivoAlumno] = useState<ExamenAlumno | null>(null);
  const [respuestasAlumno, setRespuestasAlumno] = useState<Record<string, string>>({});
  const [enviandoExamen, setEnviandoExamen] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [vistaPreviaAlumno, setVistaPreviaAlumno] = useState(false);
  const [lecturaAbierta, setLecturaAbierta] = useState<SesionCurso | null>(null);
  const [lecturaModoVistaPrevia, setLecturaModoVistaPrevia] = useState(false);
  const [lecturasSimuladas, setLecturasSimuladas] = useState<Set<string>>(new Set());
  const [paginaLectura, setPaginaLectura] = useState(0);

  const rolAlumno = Boolean(sesion?.roles.some((r) => r === "gerente" || r === "operario"));
  const fadilabCandidate = sesion?.participantes.find((p) => /fadilab/i.test(p.nombre)) ?? null;
  const permisoDocente = useQuery({
    queryKey: ["aula-formacion-docente-fadilab", sesion?.user.id, fadilabCandidate?.id],
    enabled: Boolean(sesion?.esAdmin && fadilabCandidate?.id),
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("formacion_es_docente", { _participante_id: fadilabCandidate!.id });
      if (error) throw error;
      return data === true;
    },
  });
  const esDocente = Boolean(sesion?.esAdmin && fadilabCandidate?.id && permisoDocente.data === true);
  const participanteId = esDocente ? fadilabCandidate!.id : null;

  const cursosQuery = useQuery({
    queryKey: ["aula-formacion-cursos-docente", participanteId],
    enabled: Boolean(esDocente && participanteId),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_cursos")
        .select("id,participante_id,titulo,descripcion,duracion_horas,estado")
        .eq("participante_id", participanteId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Curso[];
    },
  });
  const cursos = cursosQuery.data ?? [];
  const cursoActivoId = cursoSeleccionado || cursos[0]?.id || "";

  const inscripcionesQuery = useQuery({
    queryKey: ["aula-formacion-inscripciones", participanteId, cursoActivoId],
    enabled: Boolean(esDocente && participanteId && cursoActivoId),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_inscripciones")
        .select("id,curso_id,email_alumno,nombre_alumno,estado")
        .eq("participante_id", participanteId).eq("curso_id", cursoActivoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Omit<Inscripcion, "formacion_cursos">[];
    },
  });
  const directorioQuery = useQuery({
    queryKey: ["aula-formacion-directorio", participanteId, cursoActivoId],
    enabled: Boolean(esDocente && participanteId && cursoActivoId),
    queryFn: () => listarDirectorio({ data: { participanteDocenteId: participanteId!, cursoId: cursoActivoId } }),
  });
  const alumnosDirectorio = directorioQuery.data?.alumnos ?? [];
  const talleresDirectorio = directorioQuery.data?.talleres ?? [];
  const alumnosFiltrados = alumnosDirectorio.filter((alumno: any) => {
    const coincideTaller = tallerAlumnoFiltro === "todos" || alumno.participanteIds.includes(tallerAlumnoFiltro);
    const termino = busquedaAlumno.trim().toLocaleLowerCase();
    const coincideBusqueda = !termino || [alumno.nombre, alumno.usuario, alumno.email, alumno.taller]
      .some((valor) => String(valor ?? "").toLocaleLowerCase().includes(termino));
    return coincideTaller && coincideBusqueda;
  });
  const examenesQuery = useQuery({
    queryKey: ["aula-formacion-examenes-docente", participanteId, cursoActivoId],
    enabled: Boolean(esDocente && participanteId && cursoActivoId),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_examenes").select("id,curso_id,titulo,instrucciones,duracion_minutos,intentos_permitidos,puntaje_maximo,publicado,disponible_desde,disponible_hasta").eq("participante_id", participanteId).eq("curso_id", cursoActivoId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Examen[];
    },
  });
  const examenActivoId = examenSeleccionado || examenesQuery.data?.[0]?.id || "";
  const preguntasQuery = useQuery({
    queryKey: ["aula-formacion-preguntas-docente", examenActivoId],
    enabled: Boolean(esDocente && examenActivoId),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_preguntas").select("id,examen_id,tipo,enunciado,opciones,puntaje,orden,obligatoria").eq("examen_id", examenActivoId).order("orden");
      if (error) throw error;
      return (data ?? []) as Pregunta[];
    },
  });
  const intentosDocenteQuery = useQuery({
    queryKey: ["aula-formacion-intentos-docente", participanteId, cursoActivoId],
    enabled: Boolean(esDocente && participanteId && cursoActivoId),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_intentos")
        .select("id,examen_id,alumno_user_id,numero_intento,respuestas,puntaje_obtenido,puntaje_maximo,calificacion,estado,observaciones_docente,enviado_en,formacion_examenes(titulo,formacion_preguntas(id,enunciado,tipo,puntaje))")
        .eq("participante_id", participanteId).eq("curso_id", cursoActivoId).order("enviado_en", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{id:string;examen_id:string;alumno_user_id:string;numero_intento:number;respuestas:unknown[];puntaje_obtenido:number;puntaje_maximo:number;calificacion:number|null;estado:string;observaciones_docente:string|null;enviado_en:string}>;
    },
  });
  const materialesDocenteQuery = useQuery({
    queryKey: ["aula-formacion-materiales-docente", participanteId, cursoActivoId],
    enabled: Boolean(esDocente && participanteId && cursoActivoId),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_materiales")
        .select("id,curso_id,titulo,descripcion,nombre_archivo,ruta_storage,mime_type,tamano_bytes,created_at,publicado")
        .eq("participante_id", participanteId).eq("curso_id", cursoActivoId).eq("publicado", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Material[];
    },
  });
  const [notasPracticas, setNotasPracticas] = useState<Record<string,string>>({});
  const [observacionesPracticas, setObservacionesPracticas] = useState<Record<string,string>>({});
  const sesionesQuery = useQuery({
    queryKey: ["aula-formacion-sesiones", cursoActivoId],
    enabled: Boolean(esDocente && cursoActivoId),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_sesiones")
        .select("id,curso_id,numero,titulo,descripcion,duracion_horas,fecha_programada,publicada")
        .eq("curso_id", cursoActivoId).order("numero");
      if (error) throw error;
      return (data ?? []) as SesionCurso[];
    },
  });

  const alumnoQuery = useQuery({
    queryKey: ["aula-formacion-alumno", sesion?.user.id],
    enabled: Boolean(sesion?.user.id && !esDocente && rolAlumno),
    queryFn: async () => {
      const { error: vincularError } = await (supabase as any).rpc("vincular_inscripciones_formacion");
      if (vincularError) throw vincularError;
      const { data, error } = await (supabase as any).from("formacion_inscripciones")
        .select("id,curso_id,email_alumno,nombre_alumno,estado,formacion_cursos(id,participante_id,titulo,descripcion,duracion_horas,estado)")
        .eq("alumno_user_id", sesion!.user.id).in("estado", ["activo", "finalizado"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Inscripcion[];
    },
  });
  const inscripcionesAlumno = alumnoQuery.data ?? [];
  const idsCursosAlumno = useMemo(() => [...new Set(inscripcionesAlumno.map((i) => i.curso_id))], [inscripcionesAlumno]);
  const sesionesAlumnoQuery = useQuery({
    queryKey: ["aula-formacion-sesiones-alumno", sesion?.user.id, idsCursosAlumno.join(",")],
    enabled: Boolean(!esDocente && idsCursosAlumno.length),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_sesiones")
        .select("id,curso_id,numero,titulo,descripcion,duracion_horas,fecha_programada,publicada")
        .in("curso_id", idsCursosAlumno).eq("publicada", true).order("numero");
      if (error) throw error;
      return (data ?? []) as SesionCurso[];
    },
  });
  const progresoLecturasQuery = useQuery({
    queryKey: ["aula-formacion-progreso-lecturas", sesion?.user.id, idsCursosAlumno.join(",")],
    enabled: Boolean(!esDocente && sesion?.user.id && idsCursosAlumno.length),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_progreso_lecturas")
        .select("sesion_id,completada_en")
        .eq("alumno_user_id", sesion!.user.id);
      if (error) throw error;
      return (data ?? []) as Array<{ sesion_id: string; completada_en: string }>;
    },
  });
  const sesionesCompletadas = new Set((progresoLecturasQuery.data ?? []).map(item => item.sesion_id));

  const examenesAlumnoQuery = useQuery({
    queryKey: ["aula-formacion-examenes-alumno", sesion?.user.id, idsCursosAlumno.join(",")],
    enabled: Boolean(!esDocente && idsCursosAlumno.length),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_examenes").select("id,curso_id,titulo,instrucciones,duracion_minutos,intentos_permitidos,puntaje_maximo,publicado,disponible_desde,disponible_hasta").in("curso_id", idsCursosAlumno).eq("publicado", true).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Examen[];
    },
  });
  const intentosAlumnoQuery = useQuery({
    queryKey: ["aula-formacion-intentos-alumno", sesion?.user.id],
    enabled: Boolean(!esDocente && sesion?.user.id),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_intentos").select("id,examen_id,numero_intento,calificacion,estado,enviado_en,observaciones_docente").eq("alumno_user_id", sesion!.user.id).order("enviado_en", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Intento[];
    },
  });
  const materialesAlumnoQuery = useQuery({
    queryKey: ["aula-formacion-materiales-alumno", sesion?.user.id, idsCursosAlumno.join(",")],
    enabled: Boolean(!esDocente && idsCursosAlumno.length),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_materiales")
        .select("id,curso_id,titulo,descripcion,nombre_archivo,ruta_storage,mime_type,tamano_bytes,created_at")
        .in("curso_id", idsCursosAlumno).eq("publicado", true).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Material[];
    },
  });

  async function crearExamen(e: FormEvent) {
    e.preventDefault();
    if (!participanteId || !cursoActivoId || !tituloExamen.trim()) return;
    setOcupado(true); setMensaje("");
    try {
      const { data, error } = await (supabase as any).from("formacion_examenes").insert({
        participante_id: participanteId, curso_id: cursoActivoId, titulo: tituloExamen.trim(),
        instrucciones: instruccionesExamen.trim() || null, duracion_minutos: Number(duracionExamen) || null,
        intentos_permitidos: Math.max(1, Number(intentosExamen) || 1), puntaje_maximo: 20,
        publicado: false, creado_por: sesion?.user.id,
      }).select("id").single();
      if (error) throw error;
      setExamenSeleccionado(data.id);
      await qc.invalidateQueries({ queryKey: ["aula-formacion-examenes-docente", participanteId, cursoActivoId] });
      setMensaje("Evaluación creada como borrador. Añade sus preguntas antes de publicarla.");
    } catch (err) { setMensaje(err instanceof Error ? err.message : "No se pudo crear la evaluación."); }
    finally { setOcupado(false); }
  }

  async function agregarPregunta(e: FormEvent) {
    e.preventDefault();
    if (!participanteId || !examenActivoId || !enunciadoPregunta.trim()) return;
    const opciones = tipoPregunta === "opcion_multiple" ? opcionesPregunta.split("\n").map(x => x.trim()).filter(Boolean).map(x => ({ label: x, value: x })) : tipoPregunta === "verdadero_falso" ? [{label:"Verdadero",value:"true"},{label:"Falso",value:"false"}] : [];
    if (tipoPregunta === "opcion_multiple" && (opciones.length < 2 || !opciones.some(o => o.value === respuestaCorrecta))) { setMensaje("Añade al menos dos opciones y selecciona una respuesta correcta válida."); return; }
    setOcupado(true); setMensaje("");
    try {
      const { error } = await (supabase as any).from("formacion_preguntas").insert({
        participante_id: participanteId, examen_id: examenActivoId, tipo: tipoPregunta, enunciado: enunciadoPregunta.trim(), opciones,
        respuesta_correcta: tipoPregunta === "practica" ? null : tipoPregunta === "verdadero_falso" ? respuestaCorrecta === "true" : respuestaCorrecta,
        puntaje: Math.max(0.01, Number(puntajePregunta) || 1), orden: (preguntasQuery.data?.length ?? 0) + 1, obligatoria: true,
      });
      if (error) throw error;
      setEnunciadoPregunta("");
      await qc.invalidateQueries({ queryKey: ["aula-formacion-preguntas-docente", examenActivoId] });
      setMensaje("Pregunta añadida a la evaluación.");
    } catch (err) { setMensaje(err instanceof Error ? err.message : "No se pudo añadir la pregunta."); }
    finally { setOcupado(false); }
  }

  async function publicarExamen(examen: Examen) {
    if (!examen.publicado) {
      const { data: preguntas, error: preguntasError } = await (supabase as any).from("formacion_preguntas").select("id").eq("examen_id", examen.id);
      if (preguntasError) { setMensaje(preguntasError.message); return; }
      if (!preguntas?.length) { setMensaje("Añade al menos una pregunta antes de publicar."); return; }
    }
    const { error } = await (supabase as any).from("formacion_examenes").update({ publicado: !examen.publicado }).eq("id", examen.id).eq("participante_id", participanteId);
    if (error) setMensaje(error.message);
    else { await qc.invalidateQueries({ queryKey: ["aula-formacion-examenes-docente", participanteId, cursoActivoId] }); setMensaje(examen.publicado ? "Evaluación retirada." : "Evaluación publicada para alumnos inscritos."); }
  }

  async function calificarPractica(intentoId: string) {
    const nota = Number(notasPracticas[intentoId]);
    if (!Number.isFinite(nota) || nota < 0 || nota > 20) { setMensaje("La calificación debe estar entre 0 y 20."); return; }
    setOcupado(true); setMensaje("");
    try {
      const { error } = await (supabase as any).rpc("calificar_intento_formacion", {
        _intento_id: intentoId, _calificacion_practica: nota, _observaciones: observacionesPracticas[intentoId] || null,
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["aula-formacion-intentos-docente", participanteId, cursoActivoId] });
      setMensaje("Evaluación práctica calificada y nota final del examen actualizada.");
    } catch (err) { setMensaje(err instanceof Error ? err.message : "No se pudo calificar el ejercicio práctico."); }
    finally { setOcupado(false); }
  }

  async function marcarLecturaCompletada(sesionLectura: SesionCurso) {
    if (!sesion?.user.id) return;
    setOcupado(true);
    try {
      const { error } = await (supabase as any).from("formacion_progreso_lecturas").insert({
        alumno_user_id: sesion.user.id,
        sesion_id: sesionLectura.id,
      });
      if (error && error.code !== "23505") throw error;
      await qc.invalidateQueries({ queryKey: ["aula-formacion-progreso-lecturas", sesion.user.id] });
      setLecturaAbierta(null);
      setPaginaLectura(0);
      setMensaje("Lectura completada. Tu avance quedó marcado.");
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "No se pudo guardar el avance. Verifica que la actualización del Aula esté aplicada.");
    } finally {
      setOcupado(false);
    }
  }

  async function abrirExamenAlumno(id: string) {
    setMensaje("");
    const { data, error } = await (supabase as any).rpc("obtener_examen_formacion_alumno", { _examen_id: id });
    if (error) { setMensaje(error.message); return; }
    setRespuestasAlumno({});
    setExamenActivoAlumno(data as ExamenAlumno);
  }

  async function enviarExamenAlumno() {
    if (!examenActivoAlumno) return;
    const respuestas = examenActivoAlumno.preguntas.map(p => ({ pregunta_id: p.id, respuesta: p.tipo === "verdadero_falso" ? respuestasAlumno[p.id] === "true" : (respuestasAlumno[p.id] ?? "") })).filter(r => r.respuesta !== "");
    setEnviandoExamen(true); setMensaje("");
    try {
      const { error } = await (supabase as any).rpc("enviar_intento_formacion", { _examen_id: examenActivoAlumno.id, _respuestas: respuestas });
      if (error) throw error;
      setExamenActivoAlumno(null);
      await qc.invalidateQueries({ queryKey: ["aula-formacion-intentos-alumno", sesion?.user.id] });
      setMensaje("Evaluación enviada. Las preguntas objetivas se califican automáticamente; las prácticas quedan pendientes de revisión docente.");
    } catch (err) { setMensaje(err instanceof Error ? err.message : "No se pudo enviar la evaluación."); }
    finally { setEnviandoExamen(false); }
  }

  async function guardarNombreCurso(e: FormEvent) {
    e.preventDefault();
    if (!participanteId || !cursoEditandoId || !tituloCursoEditado.trim()) return;
    setOcupado(true); setMensaje("");
    try {
      const { error } = await (supabase as any).from("formacion_cursos")
        .update({ titulo: tituloCursoEditado.trim() })
        .eq("id", cursoEditandoId)
        .eq("participante_id", participanteId);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["aula-formacion-cursos-docente", participanteId] });
      await qc.invalidateQueries({ queryKey: ["aula-formacion-alumno"] });
      setCursoEditandoId("");
      setTituloCursoEditado("");
      setMensaje("Nombre del curso actualizado correctamente.");
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "No se pudo actualizar el nombre del curso.");
    } finally {
      setOcupado(false);
    }
  }

  async function crearCurso(e: FormEvent) {
    e.preventDefault();
    if (!participanteId || !titulo.trim()) return;
    setOcupado(true); setMensaje("");
    try {
      const slug = titulo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { data, error } = await (supabase as any).from("formacion_cursos").insert({
        participante_id: participanteId, titulo: titulo.trim(), slug, descripcion: descripcion.trim() || null,
        modalidad: "presencial", duracion_horas: Number(duracion) || 0, estado: "borrador", creado_por: sesion?.user.id,
      }).select("id").single();
      if (error) throw error;
      setCursoSeleccionado(data.id);
      await qc.invalidateQueries({ queryKey: ["aula-formacion-cursos-docente", participanteId] });
      setMensaje("Curso creado como borrador. Añade alumnos, sesiones y materiales antes de publicarlo.");
    } catch (err) { setMensaje(err instanceof Error ? err.message : "No se pudo crear el curso."); }
    finally { setOcupado(false); }
  }

  async function eliminarInscripcion(inscripcion: Omit<Inscripcion, "formacion_cursos">) {
    if (!participanteId || !cursoActivoId) return;
    const nombre = inscripcion.nombre_alumno || inscripcion.email_alumno;
    if (!window.confirm(`¿Eliminar a ${nombre} de este curso? Su cuenta y otras inscripciones no se modificarán.`)) return;
    setOcupado(true); setMensaje("");
    try {
      const { error } = await (supabase as any).from("formacion_inscripciones")
        .delete()
        .eq("id", inscripcion.id)
        .eq("participante_id", participanteId)
        .eq("curso_id", cursoActivoId);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["aula-formacion-inscripciones", participanteId, cursoActivoId] });
      await qc.invalidateQueries({ queryKey: ["aula-formacion-alumno"] });
      setMensaje(`${nombre} ya no está inscrito en este curso.`);
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "No se pudo eliminar la inscripción. Comprueba los permisos de la tabla.");
    } finally {
      setOcupado(false);
    }
  }

  async function matricularAlumnosSeleccionados() {
    if (!participanteId || !cursoActivoId || alumnosSeleccionados.length === 0) return;
    setOcupado(true); setMensaje("");
    try {
      const seleccionados = alumnosDirectorio.filter((a: any) => alumnosSeleccionados.includes(a.userId));
      const existentes = (inscripcionesQuery.data ?? []) as Array<{ email_alumno: string; estado: string }>;
      const yaInscritos = new Set(existentes.map(i => i.email_alumno.toLowerCase()));
      const nuevos = seleccionados.filter((a: any) => a.email && !yaInscritos.has(a.email.toLowerCase()));
      if (!nuevos.length) {
        setMensaje("Los alumnos seleccionados ya están inscritos en este curso.");
        return;
      }
      const { error } = await (supabase as any).from("formacion_inscripciones").insert(
        nuevos.map((alumno: any) => ({
          participante_id: participanteId,
          curso_id: cursoActivoId,
          email_alumno: alumno.email.toLowerCase(),
          nombre_alumno: alumno.nombre,
          alumno_user_id: alumno.userId,
          estado: "activo",
        })),
      );
      if (error) throw error;
      setAlumnosSeleccionados([]);
      await qc.invalidateQueries({ queryKey: ["aula-formacion-inscripciones", participanteId, cursoActivoId] });
      setMensaje(`${nuevos.length} alumno(s) inscrito(s) correctamente.`);
    } catch (err) { setMensaje(err instanceof Error ? err.message : "No se pudo completar la inscripción."); }
    finally { setOcupado(false); }
  }

  async function crearSesion(e: FormEvent) {
    e.preventDefault();
    if (!participanteId || !cursoActivoId || !tituloSesion.trim()) return;
    setOcupado(true); setMensaje("");
    try {
      const { error } = await (supabase as any).from("formacion_sesiones").insert({
        participante_id: participanteId, curso_id: cursoActivoId, numero: Number(numeroSesion),
        titulo: tituloSesion.trim(), descripcion: detalleSesion.trim() || null, duracion_horas: 2, orden: Number(numeroSesion), publicada: false,
      });
      if (error) throw error;
      setTituloSesion(""); setDetalleSesion("");
      await qc.invalidateQueries({ queryKey: ["aula-formacion-sesiones", cursoActivoId] });
      setMensaje("Sesión creada como borrador.");
    } catch (err) { setMensaje(err instanceof Error ? err.message : "No se pudo crear la sesión."); }
    finally { setOcupado(false); }
  }

  function iniciarEdicionSesion(s: SesionCurso) {
    setSesionEditandoId(s.id);
    setNumeroSesionEditado(String(s.numero));
    setTituloSesionEditado(s.titulo);
    setDetalleSesionEditado(s.descripcion ?? "");
    setMensaje("");
  }

  function cancelarEdicionSesion() {
    setSesionEditandoId("");
    setNumeroSesionEditado("1");
    setTituloSesionEditado("");
    setDetalleSesionEditado("");
  }

  async function guardarEdicionSesion(e: FormEvent, s: SesionCurso) {
    e.preventDefault();
    const numero = Number(numeroSesionEditado);
    if (!participanteId || !cursoActivoId || !tituloSesionEditado.trim() || !Number.isInteger(numero) || numero < 1) {
      setMensaje("Indica un número de sesión válido y un título.");
      return;
    }
    setOcupado(true);
    setMensaje("");
    try {
      const { error } = await (supabase as any).from("formacion_sesiones").update({
        numero,
        orden: numero,
        titulo: tituloSesionEditado.trim(),
        descripcion: detalleSesionEditado.trim() || null,
      }).eq("id", s.id).eq("curso_id", cursoActivoId).eq("participante_id", participanteId);
      if (error) throw error;
      cancelarEdicionSesion();
      await qc.invalidateQueries({ queryKey: ["aula-formacion-sesiones", cursoActivoId] });
      setMensaje("Sesión actualizada correctamente.");
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "No se pudo actualizar la sesión.");
    } finally {
      setOcupado(false);
    }
  }

  async function abrirEditorLectura(s: SesionCurso) {
    setCargandoLecturaDocente(true);
    setMensaje("");
    try {
      const { data, error } = await (supabase as any).from("formacion_contenidos_lectura").select("secciones").eq("sesion_id", s.id).maybeSingle();
      if (error) throw error;
      const guardadas = Array.isArray(data?.secciones) ? data.secciones : null;
      setSeccionesLecturaEditadas(guardadas ?? (s.numero === 1 ? LECTURA_SESION_1.map(x => ({ titulo: x.titulo, bloques: [...x.bloques] })) : []));
      setEstadoGuardadoLectura(guardadas ? { tipo: "info", texto: "Contenido cargado desde Supabase. Los cambios aún no están guardados." } : { tipo: "info", texto: "Contenido inicial cargado. Guarda el borrador para conservarlo en Supabase." });
      setLecturaEditando(s);
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "No se pudo cargar la lectura. Verifica la tabla y sus permisos.");
    } finally { setCargandoLecturaDocente(false); }
  }

  async function guardarContenidoLectura() {
    if (!lecturaEditando || !participanteId || !sesionesQuery.data?.some(x => x.id === lecturaEditando.id)) return;
    if (!seccionesLecturaEditadas.length || seccionesLecturaEditadas.some(x => !x.titulo.trim() || !x.bloques.length || x.bloques.some(b => !b.trim()))) {
      setEstadoGuardadoLectura({ tipo: "error", texto: "No se guardó: completa el título y al menos un bloque de texto en cada apartado." });
      return;
    }
    setOcupado(true); setMensaje(""); setEstadoGuardadoLectura({ tipo: "info", texto: "Guardando cambios en Supabase…" });
    try {
      const { data: existente, error: consultaError } = await (supabase as any).from("formacion_contenidos_lectura").select("sesion_id").eq("sesion_id", lecturaEditando.id).maybeSingle();
      if (consultaError) throw consultaError;
      const payload = { sesion_id: lecturaEditando.id, secciones: seccionesLecturaEditadas, updated_by: sesion?.user?.id ?? sesion?.user?.user_metadata?.sub ?? null, updated_at: new Date().toISOString() };
      const resultado = existente
        ? await (supabase as any).from("formacion_contenidos_lectura").update(payload).eq("sesion_id", lecturaEditando.id).select("sesion_id").maybeSingle()
        : await (supabase as any).from("formacion_contenidos_lectura").insert(payload).select("sesion_id").single();
      if (resultado.error) throw resultado.error;
      if (!resultado.data?.sesion_id) throw new Error("Supabase no confirmó el guardado. Revisa los permisos de la tabla.");
      await qc.invalidateQueries({ queryKey: ["aula-formacion-lectura", lecturaEditando.id] });
      setEstadoGuardadoLectura({ tipo: "success", texto: "¡Guardado correctamente! El borrador de esta lectura ya está almacenado en Supabase. Todavía no está publicado para los alumnos." });
    } catch (err) {
      setEstadoGuardadoLectura({ tipo: "error", texto: err instanceof Error ? "No se pudo guardar: " + err.message : "No se pudo guardar la lectura. Inténtalo nuevamente." });
    } finally { setOcupado(false); }
  }

  async function publicarSesion(s: SesionCurso) {
    const { error } = await (supabase as any).from("formacion_sesiones").update({ publicada: !s.publicada }).eq("id", s.id).eq("participante_id", participanteId);
    if (error) setMensaje(error.message);
    else { await qc.invalidateQueries({ queryKey: ["aula-formacion-sesiones", cursoActivoId] }); setMensaje(s.publicada ? "Sesión retirada del aula." : "Sesión publicada para los alumnos inscritos."); }
  }

  async function subirMaterial(e: FormEvent) {
    e.preventDefault();
    if (!participanteId || !cursoActivoId || !archivo || !tituloMaterial.trim()) return;
    if (archivo.size > 50 * 1024 * 1024) { setMensaje("El archivo supera el límite de 50 MB."); return; }
    setOcupado(true); setMensaje("");
    try {
      const extension = archivo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      const ruta = participanteId + "/" + cursoActivoId + "/" + crypto.randomUUID() + "." + extension;
      const { error: uploadError } = await supabase.storage.from("formacion-academica").upload(ruta, archivo, { contentType: archivo.type || "application/octet-stream", upsert: false });
      if (uploadError) throw uploadError;
      const { error } = await (supabase as any).from("formacion_materiales").insert({
        participante_id: participanteId, curso_id: cursoActivoId, titulo: tituloMaterial.trim(),
        nombre_archivo: archivo.name, ruta_storage: ruta, mime_type: archivo.type || "application/octet-stream",
        tamano_bytes: archivo.size, publicado: publicarMaterial, subido_por: sesion?.user.id,
      });
      if (error) {
        await supabase.storage.from("formacion-academica").remove([ruta]);
        throw error;
      }
      setArchivo(null); setTituloMaterial("");
      const input = document.getElementById("aula-material-file") as HTMLInputElement | null;
      if (input) input.value = "";
      setMensaje(publicarMaterial ? "Material publicado en el aula." : "Material guardado como borrador.");
    } catch (err) { setMensaje(err instanceof Error ? err.message : "No se pudo subir el material."); }
    finally { setOcupado(false); }
  }

  async function descargarMaterial(m: Material) {
    const { data, error } = await supabase.storage.from("formacion-academica").createSignedUrl(m.ruta_storage, 60);
    if (error || !data?.signedUrl) { setMensaje(error?.message || "No se pudo generar el enlace del archivo."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (cargandoSesion) return <AppShell titulo="Aula de formación" subtitulo="Cargando acceso"><Panel titulo="Verificando cuenta"><p className="p-5 text-sm text-muted-foreground">Comprobando tu sesión…</p></Panel></AppShell>;
  if (!sesion || (!rolAlumno && !esDocente)) return <AppShell titulo="Aula de formación" subtitulo="Acceso restringido"><Panel titulo="Cuenta no habilitada"><p className="p-5 text-sm text-muted-foreground">El aula de alumnos está disponible para cuentas de gerente u operario. La docencia se administra exclusivamente desde FADILAB.</p></Panel></AppShell>;

  return <AppShell titulo="Aula de formación" subtitulo={esDocente ? "FADILAB · Administración académica" : "Tus cursos, materiales y actividades"}>
    <div className="mx-auto max-w-6xl space-y-5">
      {esDocente ? (
        <>
          <section className="flex flex-col gap-3 rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/10 via-card to-card p-5 sm:flex-row sm:items-center">
            <div className="grid size-12 place-items-center rounded-xl bg-gold/15 text-gold-deep"><ShieldCheck className="size-6" /></div>
            <div><p className="text-sm font-semibold">Panel docente · FADILAB</p><p className="mt-1 text-xs text-muted-foreground">Crea cursos, matricula alumnos y publica sesiones y archivos académicos.</p></div>
          </section>
          {cursoActivoId && <div className="flex justify-end">
            <button type="button" onClick={() => setVistaPreviaAlumno(true)} className="inline-flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm font-semibold text-gold-deep hover:bg-gold/20">
              <BookOpen className="size-4" /> Vista previa del alumno
            </button>
          </div>}
          {vistaPreviaAlumno && cursoActivoId && (() => {
            const curso = cursos.find(item => item.id === cursoActivoId);
            const sesionesPublicadas = (sesionesQuery.data ?? []).filter(item => item.publicada);
            const materialesPublicados = materialesDocenteQuery.data ?? [];
            const examenesPublicados = (examenesQuery.data ?? []).filter(item => item.publicado);
            return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Vista previa del alumno">
              <div className="mx-auto my-4 max-w-4xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-border p-4">
                  <div><p className="text-sm font-semibold">Vista previa del alumno</p><p className="text-xs text-muted-foreground">Solo lectura · Contenido que está publicado</p></div>
                  <button type="button" onClick={() => setVistaPreviaAlumno(false)} className="rounded-lg border border-border px-3 py-2 text-sm">Cerrar</button>
                </div>
                <div className="space-y-5 p-5 sm:p-7">
                  <section className="rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/10 via-card to-card p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Aula de formación · FADILAB</p>
                    <h2 className="mt-2 text-xl font-semibold">{curso?.titulo ?? "Curso"}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{curso?.descripcion || "Materiales y actividades de tu formación."}</p>
                    <p className="mt-3 text-xs text-muted-foreground">{curso?.duracion_horas ?? 0} horas · Vista del participante</p>
                  </section>
                  <section className="space-y-3">
                    <h3 className="text-base font-semibold">Sesiones</h3>
                    {sesionesQuery.isLoading ? <p className="text-sm text-muted-foreground">Cargando sesiones…</p> : sesionesPublicadas.length === 0 ? <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Todavía no hay sesiones publicadas. Los borradores no son visibles para los alumnos.</p> : sesionesPublicadas.map(item => <article key={item.id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">Sesión {item.numero}{item.duracion_horas ? " · "+item.duracion_horas+" horas" : ""}</p><h4 className="mt-1 text-sm font-semibold">{item.titulo}</h4>{item.descripcion && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.descripcion}</p>}</div>{item.numero === 1 && <button type="button" onClick={() => { setLecturaModoVistaPrevia(true); setLecturaAbierta(item); setPaginaLectura(0); }} className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold-deep"><BookOpenCheck className="size-4"/> Abrir lectura</button>}</div>{item.numero === 1 && <p className="mt-2 text-xs text-muted-foreground">{lecturasSimuladas.has(item.id) ? "Lectura abierta · simulación" : "Lectura pendiente · simulación"}</p>}</article>)}
                  </section>
                  <section className="space-y-3">
                    <h3 className="text-base font-semibold">Materiales publicados</h3>
                    {materialesDocenteQuery.isLoading ? <p className="text-sm text-muted-foreground">Cargando materiales…</p> : materialesPublicados.length === 0 ? <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Todavía no hay materiales publicados.</p> : materialesPublicados.map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"><div className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0 text-gold-deep"/><div className="min-w-0"><p className="truncate text-sm font-medium">{item.titulo}</p><p className="text-xs text-muted-foreground">{item.nombre_archivo}</p></div></div><button type="button" onClick={() => void descargarMaterial(item)} className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs"><Download className="mr-1 inline size-3.5"/>Descargar</button></div>)}
                  </section>
                  <section className="space-y-3">
                    <h3 className="text-base font-semibold">Evaluaciones</h3>
                    {examenesPublicados.length === 0 ? <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Todavía no hay evaluaciones publicadas.</p> : examenesPublicados.map(item => <div key={item.id} className="rounded-xl border border-border p-3"><p className="text-sm font-medium">{item.titulo}</p><p className="mt-1 text-xs text-muted-foreground">{item.duracion_minutos ?? "Sin límite"} min · {item.intentos_permitidos} intento(s)</p>{item.instrucciones && <p className="mt-2 text-sm text-muted-foreground">{item.instrucciones}</p>}</div>)}
                  </section>
                </div>
              </div>
            </div>;
          })()}
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel titulo="Crear curso" colapsable defaultOpen={true}>
              <form onSubmit={(e) => void crearCurso(e)} className="space-y-3 p-5">
                <label className="block text-xs font-medium">Nombre del curso<input value={titulo} onChange={e => setTitulo(e.target.value)} required maxLength={140} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" /></label>
                <label className="block text-xs font-medium">Descripción<textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" /></label>
                <label className="block text-xs font-medium">Duración total (horas)<input type="number" min="0" step="0.5" value={duracion} onChange={e => setDuracion(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" /></label>
                <button disabled={ocupado} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"><Plus className="size-4" /> Crear curso</button>
              </form>
            </Panel>
            <Panel titulo="Cursos de FADILAB" colapsable defaultOpen={false}>
              <div className="space-y-2 p-5">
                {cursosQuery.isLoading ? <p className="text-sm text-muted-foreground">Cargando cursos…</p> : cursos.length === 0 ? <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Todavía no hay cursos. Crea el primero desde el formulario.</p> : cursos.map(c => <div key={c.id} className={`rounded-xl border p-3 ${cursoActivoId === c.id ? "border-gold bg-gold/10" : "border-border"}`}>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setCursoSeleccionado(c.id)} className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left">
                      <span className="min-w-0"><span className="block truncate text-sm font-semibold">{c.titulo}</span><span className="text-xs text-muted-foreground">{c.duracion_horas} horas · {c.estado}</span></span>
                      <BookOpen className="size-4 shrink-0 text-gold-deep" />
                    </button>
                    <button type="button" onClick={() => { setCursoEditandoId(c.id); setTituloCursoEditado(c.titulo); }} aria-label={`Editar nombre de ${c.titulo}`} title="Editar nombre del curso" className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted">
                      <Pencil className="size-4" />
                    </button>
                  </div>
                  {cursoEditandoId === c.id && <form onSubmit={(e) => void guardarNombreCurso(e)} className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                    <input autoFocus value={tituloCursoEditado} onChange={e => setTituloCursoEditado(e.target.value)} required maxLength={140} aria-label="Nuevo nombre del curso" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                    <button type="submit" disabled={ocupado || !tituloCursoEditado.trim()} className="rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-black disabled:opacity-50">Guardar</button>
                    <button type="button" onClick={() => { setCursoEditandoId(""); setTituloCursoEditado(""); }} disabled={ocupado} className="rounded-lg border border-border px-3 py-2 text-xs">Cancelar</button>
                  </form>}
                </div>)}
              </div>
            </Panel>
          </div>
          {cursoActivoId && <div className="grid gap-5 lg:grid-cols-2">
            <Panel titulo="Inscribir alumnos" colapsable defaultOpen={false}>
              <div className="space-y-4 p-5">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Directorio de talleres</p>
                  <p className="text-xs text-muted-foreground">Selecciona participantes de las cuentas existentes de Taller del Joyero. No se crean usuarios nuevos.</p>
                </div>
                <label className="block text-xs font-medium">Filtrar por taller
                  <select value={tallerAlumnoFiltro} onChange={e => setTallerAlumnoFiltro(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                    <option value="todos">Todos los talleres</option>
                    {talleresDirectorio.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-medium">Buscar alumno
                  <input value={busquedaAlumno} onChange={e => setBusquedaAlumno(e.target.value)} placeholder="Nombre, usuario, correo o taller" className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
                </label>
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-border p-2">
                  {directorioQuery.isLoading ? <p className="p-3 text-xs text-muted-foreground">Cargando directorio…</p>
                    : directorioQuery.isError ? <p className="p-3 text-xs text-destructive">{directorioQuery.error instanceof Error ? directorioQuery.error.message : "No se pudo cargar el directorio."}</p>
                    : alumnosFiltrados.length === 0 ? <p className="p-3 text-xs text-muted-foreground">No hay participantes que coincidan con la búsqueda.</p>
                    : alumnosFiltrados.map((alumno: any) => <label key={alumno.userId} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/40">
                      <input type="checkbox" checked={alumnosSeleccionados.includes(alumno.userId)} onChange={e => setAlumnosSeleccionados(actual => e.target.checked ? [...actual, alumno.userId] : actual.filter(id => id !== alumno.userId))} className="mt-1" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{alumno.nombre}</span>
                        <span className="block text-xs text-muted-foreground">Usuario: {alumno.usuario}</span>
                        <span className="block break-all text-xs text-muted-foreground">{alumno.email}</span>
                        <span className="mt-1 block text-xs font-medium text-gold-deep">{alumno.taller} · {alumno.roles.join(", ")}</span>
                      </span>
                    </label>)}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{alumnosSeleccionados.length} seleccionado(s)</span>
                  <button type="button" disabled={ocupado || alumnosSeleccionados.length === 0} onClick={() => void matricularAlumnosSeleccionados()} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"><Users className="size-4" /> Inscribir seleccionados</button>
                </div>
              </div>
              <div className="border-t border-border p-5"><h3 className="mb-3 text-sm font-semibold">Alumnos inscritos</h3>{inscripcionesQuery.isLoading ? <p className="text-xs text-muted-foreground">Cargando…</p> : (inscripcionesQuery.data ?? []).length === 0 ? <p className="text-xs text-muted-foreground">Aún no hay alumnos inscritos.</p> : (inscripcionesQuery.data ?? []).map(i => <div key={i.id} className="flex items-center justify-between gap-3 border-b border-border py-2 text-xs"><span className="min-w-0">{i.nombre_alumno || i.email_alumno}<span className="block break-all text-muted-foreground">{i.email_alumno}</span></span><div className="flex shrink-0 items-center gap-2"><span className="text-muted-foreground">{i.estado}</span><button type="button" disabled={ocupado} onClick={() => void eliminarInscripcion(i)} aria-label={`Eliminar inscripción de ${i.nombre_alumno || i.email_alumno}`} title="Eliminar inscripción del curso" className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"><Trash2 className="size-4" /></button></div></div>)}</div>
            </Panel>
            <Panel titulo="Sesiones del curso" colapsable defaultOpen={false}>
              <form onSubmit={(e) => void crearSesion(e)} className="space-y-3 p-5">
                <div className="grid grid-cols-[90px_1fr] gap-2"><label className="text-xs font-medium">N.º<input type="number" min="1" value={numeroSesion} onChange={e => setNumeroSesion(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" /></label><label className="text-xs font-medium">Título<input required value={tituloSesion} onChange={e => setTituloSesion(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" placeholder="Interfaz y navegación" /></label></div>
                <label className="block text-xs font-medium">Descripción<textarea value={detalleSesion} onChange={e => setDetalleSesion(e.target.value)} rows={2} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" /></label>
                <button disabled={ocupado} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold"><CalendarDays className="size-4" /> Añadir sesión</button>
              </form>
              <div className="border-t border-border px-5">{sesionesQuery.isLoading ? <p className="py-4 text-xs text-muted-foreground">Cargando…</p> : (sesionesQuery.data ?? []).map(s => <div key={s.id} className="border-b border-border py-3">
                {sesionEditandoId === s.id ? (
                  <form onSubmit={(e) => void guardarEdicionSesion(e, s)} className="space-y-3 rounded-lg bg-muted/30 p-3">
                    <div className="grid grid-cols-[90px_1fr] gap-2">
                      <label className="text-xs font-medium">N.º<input type="number" min="1" required value={numeroSesionEditado} onChange={e => setNumeroSesionEditado(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
                      <label className="text-xs font-medium">Título<input required value={tituloSesionEditado} onChange={e => setTituloSesionEditado(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
                    </div>
                    <label className="block text-xs font-medium">Descripción<textarea value={detalleSesionEditado} onChange={e => setDetalleSesionEditado(e.target.value)} rows={3} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
                    <div className="flex flex-wrap gap-2">
                      <button type="submit" disabled={ocupado} className="rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-black disabled:opacity-50">Guardar cambios</button>
                      <button type="button" disabled={ocupado} onClick={cancelarEdicionSesion} className="rounded-lg border border-border px-3 py-2 text-xs">Cancelar</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0"><p className="text-sm font-medium">{s.numero}. {s.titulo}</p><p className="text-xs text-muted-foreground">{s.publicada ? "Visible para alumnos" : "Borrador"}</p>{s.descripcion && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.descripcion}</p>}</div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button type="button" disabled={ocupado} onClick={() => iniciarEdicionSesion(s)} aria-label={`Editar sesión ${s.numero}`} title="Editar sesión" className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"><Pencil className="size-4" /></button>
                      <button type="button" disabled={ocupado || cargandoLecturaDocente} onClick={() => void abrirEditorLectura(s)} className="rounded-lg border border-gold/40 px-3 py-1.5 text-xs disabled:opacity-50">{cargandoLecturaDocente ? "Cargando…" : "Editar lectura"}</button>
                      <button type="button" disabled={ocupado} onClick={() => void publicarSesion(s)} className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-50">{s.publicada ? "Ocultar" : "Publicar"}</button>
                    </div>
                  </div>
                )}
              </div>)}</div>
            </Panel>
            {lecturaEditando && <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Editor de lectura">
              <div className="mx-auto my-4 max-w-4xl rounded-2xl border border-border bg-background shadow-2xl">
                <div className="flex items-center justify-between border-b border-border p-4"><div><h3 className="font-semibold">Editar lectura · Sesión {lecturaEditando.numero}</h3><p className="text-xs text-muted-foreground">Los cambios se guardan como borrador hasta publicar.</p></div><button type="button" onClick={() => setLecturaEditando(null)} className="rounded-lg border border-border px-3 py-2 text-sm">Cerrar</button></div>
                <div className="space-y-4 p-4 sm:p-6">
                  {seccionesLecturaEditadas.map((sec, idx) => <section key={idx} className="space-y-2 rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between"><p className="text-sm font-semibold">Apartado {idx+1}</p><button type="button" onClick={() => setSeccionesLecturaEditadas(prev => prev.filter((_,i) => i!==idx))} className="text-xs text-destructive">Eliminar</button></div>
                    <input value={sec.titulo} onChange={e => setSeccionesLecturaEditadas(prev => prev.map((x,i)=>i===idx?{...x,titulo:e.target.value}:x))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Título del apartado"/>
                    {sec.bloques.map((bloque,j) => <div key={j} className="flex gap-2"><textarea value={bloque} onChange={e => setSeccionesLecturaEditadas(prev => prev.map((x,i)=>i===idx?{...x,bloques:x.bloques.map((b,k)=>k===j?e.target.value:b)}:x))} rows={3} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"/><button type="button" onClick={() => setSeccionesLecturaEditadas(prev=>prev.map((x,i)=>i===idx?{...x,bloques:x.bloques.filter((_,k)=>k!==j)}:x))} className="text-xs text-destructive">Quitar</button></div>)}
                    <button type="button" onClick={() => setSeccionesLecturaEditadas(prev=>prev.map((x,i)=>i===idx?{...x,bloques:[...x.bloques,""]}:x))} className="text-xs font-medium text-gold-deep">+ Añadir bloque de texto</button>
                  </section>)}
                  <button type="button" onClick={() => setSeccionesLecturaEditadas(prev=>[...prev,{titulo:"Nuevo apartado",bloques:[""]}])} className="rounded-lg border border-border px-3 py-2 text-sm">+ Añadir apartado</button>
                  {estadoGuardadoLectura && <p role="status" aria-live="polite" className={`rounded-xl border p-3 text-sm ${estadoGuardadoLectura.tipo === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : estadoGuardadoLectura.tipo === "error" ? "border-red-300 bg-red-50 text-red-800" : "border-border bg-muted text-muted-foreground"}`}>{estadoGuardadoLectura.tipo === "success" ? "✓ " : estadoGuardadoLectura.tipo === "error" ? "⚠ " : "ℹ "}{estadoGuardadoLectura.texto}</p>}
                  <div className="flex justify-end gap-2"><button type="button" onClick={() => setLecturaEditando(null)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button><button type="button" disabled={ocupado} onClick={() => void guardarContenidoLectura()} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">Guardar borrador</button></div>
                </div>
              </div>
            </div>}
            <Panel titulo="Materiales de estudio" colapsable defaultOpen={false}>
              <form onSubmit={(e) => void subirMaterial(e)} className="space-y-3 p-5">
                <label className="block text-xs font-medium">Título del material<input required value={tituloMaterial} onChange={e => setTituloMaterial(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" placeholder="Guía de la sesión 1" /></label>
                <label className="block text-xs font-medium">Archivo (PDF, documentos, imágenes, ZIP o STL)<input id="aula-material-file" type="file" required onChange={(e: ChangeEvent<HTMLInputElement>) => setArchivo(e.target.files?.[0] ?? null)} className="mt-1.5 block w-full text-xs" /></label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={publicarMaterial} onChange={e => setPublicarMaterial(e.target.checked)} /> Publicar inmediatamente para los alumnos</label>
                <button disabled={ocupado || !archivo} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"><Upload className="size-4" /> Subir material</button>
                <p className="text-xs text-muted-foreground">Almacenamiento privado · máximo 50 MB por archivo.</p>
              </form>
            </Panel>
          </div>}
          {cursoActivoId && <Panel titulo="Evaluaciones y cuestionarios" colapsable defaultOpen={false}>
            <div className="space-y-3 p-5">
              <form onSubmit={(e) => void crearExamen(e)} className="space-y-3 rounded-xl border border-border p-4">
                <p className="text-sm font-semibold">Crear evaluación</p>
                <label className="block text-xs font-medium">Título<input value={tituloExamen} onChange={e => setTituloExamen(e.target.value)} required className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
                <label className="block text-xs font-medium">Instrucciones<textarea value={instruccionesExamen} onChange={e => setInstruccionesExamen(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-medium">Duración (minutos)<input type="number" min="1" value={duracionExamen} onChange={e => setDuracionExamen(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
                  <label className="text-xs font-medium">Intentos permitidos<input type="number" min="1" max="10" value={intentosExamen} onChange={e => setIntentosExamen(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
                </div>
                <button disabled={ocupado} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black">Crear evaluación</button>
              </form>
              <div className="space-y-2"><p className="text-sm font-semibold">Evaluaciones del curso</p>
                {(examenesQuery.data ?? []).map(x => <div key={x.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                  <button type="button" onClick={() => setExamenSeleccionado(x.id)} className="min-w-0 text-left"><span className="block truncate text-sm font-medium">{x.titulo}</span><span className="text-xs text-muted-foreground">{x.duracion_minutos ?? "Sin límite"} min · {x.intentos_permitidos} intento(s)</span></button>
                  <button type="button" onClick={() => void publicarExamen(x)} className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs">{x.publicado ? "Retirar" : "Publicar"}</button>
                </div>)}
                {examenesQuery.data?.length === 0 && <p className="text-xs text-muted-foreground">Aún no hay evaluaciones.</p>}
              </div>
              {examenActivoId && <form onSubmit={(e) => void agregarPregunta(e)} className="space-y-3 rounded-xl border border-border p-4">
                <p className="text-sm font-semibold">Añadir pregunta · {(examenesQuery.data ?? []).find(x => x.id === examenActivoId)?.titulo}</p>
                <label className="block text-xs font-medium">Tipo<select value={tipoPregunta} onChange={e => setTipoPregunta(e.target.value as typeof tipoPregunta)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="opcion_multiple">Opción múltiple</option><option value="verdadero_falso">Verdadero / Falso</option><option value="practica">Práctica (revisión docente)</option></select></label>
                <label className="block text-xs font-medium">Enunciado<textarea required value={enunciadoPregunta} onChange={e => setEnunciadoPregunta(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
                {tipoPregunta === "opcion_multiple" && <>
                  <label className="block text-xs font-medium">Opciones (una por línea)<textarea value={opcionesPregunta} onChange={e => setOpcionesPregunta(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
                  <label className="block text-xs font-medium">Respuesta correcta<select value={respuestaCorrecta} onChange={e => setRespuestaCorrecta(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">{opcionesPregunta.split("\n").map(x => x.trim()).filter(Boolean).map(x => <option key={x} value={x}>{x}</option>)}</select></label>
                </>}
                {tipoPregunta === "verdadero_falso" && <label className="block text-xs font-medium">Respuesta correcta<select value={respuestaCorrecta === "false" ? "false" : "true"} onChange={e => setRespuestaCorrecta(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="true">Verdadero</option><option value="false">Falso</option></select></label>}
                <label className="block text-xs font-medium">Puntaje<input type="number" min="0.01" step="0.25" value={puntajePregunta} onChange={e => setPuntajePregunta(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
                <button disabled={ocupado} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black">Añadir pregunta</button>
              </form>}
              {(preguntasQuery.data ?? []).map((p, idx) => <div key={p.id} className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Pregunta {idx + 1} · {p.tipo.replaceAll("_"," ")} · {p.puntaje} pts</p><p className="mt-1 text-sm">{p.enunciado}</p></div>)}
            </div>
          </Panel>}
          {cursoActivoId && <Panel titulo="Entregas y revisión docente">
            <div className="space-y-3 p-5">
              {(intentosDocenteQuery.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay evaluaciones entregadas.</p> : (intentosDocenteQuery.data ?? []).map(intento => {
                const examen = (intento as any).formacion_examenes;
                const preguntas = (examen?.formacion_preguntas ?? []) as Array<{id:string;enunciado:string;tipo:string;puntaje:number}>;
                const respuestas = Array.isArray(intento.respuestas) ? intento.respuestas as Array<{pregunta_id?:string;respuesta?:unknown}> : [];
                return <div key={intento.id} className="space-y-3 rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold">{examen?.titulo ?? "Evaluación"} · Intento {intento.numero_intento}</p><p className="text-xs text-muted-foreground">Alumno: {intento.alumno_user_id.slice(0,8)} · {new Date(intento.enviado_en).toLocaleString()}</p></div><span className="rounded-full border border-border px-2 py-1 text-xs">{intento.estado}</span></div>
                  {respuestas.map((r, idx) => {
                    const pregunta = preguntas.find(p => p.id === r.pregunta_id);
                    return <div key={r.pregunta_id ?? idx} className="border-t border-border pt-2 text-xs"><p className="font-medium">{pregunta?.enunciado ?? ("Respuesta " + (idx + 1))}</p><p className="text-muted-foreground">{typeof r.respuesta === "string" ? r.respuesta : JSON.stringify(r.respuesta)}</p></div>;
                  })}
                  {intento.estado === "pendiente_revision" ? <div className="grid gap-2 sm:grid-cols-[150px_1fr_auto]">
                    <label className="text-xs font-medium">Nota práctica (0–20)<input type="number" min="0" max="20" step="0.25" value={notasPracticas[intento.id] ?? ""} onChange={e => setNotasPracticas(v => ({...v,[intento.id]:e.target.value}))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
                    <label className="text-xs font-medium">Observaciones<textarea rows={2} value={observacionesPracticas[intento.id] ?? ""} onChange={e => setObservacionesPracticas(v => ({...v,[intento.id]:e.target.value}))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
                    <button type="button" disabled={ocupado || notasPracticas[intento.id] === undefined || notasPracticas[intento.id] === ""} onClick={() => void calificarPractica(intento.id)} className="self-end rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-black disabled:opacity-40">Guardar nota</button>
                  </div> : <p className="text-xs text-muted-foreground">Calificación: {intento.calificacion ?? "Pendiente"}/20 {intento.observaciones_docente ? "· " + intento.observaciones_docente : ""}</p>}
                </div>;
              })}
            </div>
          </Panel>}
          {cursosQuery.error && <p className="rounded-xl border border-red-300 p-3 text-sm text-red-700">{cursosQuery.error.message}</p>}
        </>
      ) : (
        <>
          <section className="rounded-2xl border border-gold/20 bg-card p-5"><p className="text-sm font-semibold">Bienvenido al aula</p><p className="mt-1 text-xs text-muted-foreground">Aquí aparecen únicamente los cursos en los que FADILAB te ha inscrito. Los archivos permanecen privados.</p></section>
          {lecturaAbierta && <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Lectura de la sesión">
            <div className="mx-auto my-4 flex min-h-[80vh] max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
              <header className="border-b border-border p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Aula de formación · Lectura guiada</p><h2 className="mt-1 text-lg font-semibold">{lecturaAbierta.numero}. {lecturaAbierta.titulo}</h2><p className="mt-1 text-xs text-muted-foreground">{lecturaModoVistaPrevia ? "Modo de prueba docente · el avance no se guarda en la cuenta de ningún alumno." : "Al abrir esta lectura se registra como leída. Avanza por los apartados y márcala como completada al finalizar."}</p></div><button type="button" onClick={() => { setLecturaAbierta(null); setLecturaModoVistaPrevia(false); }} className="rounded-lg border border-border px-3 py-2 text-xs">Cerrar</button></div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gold transition-all" style={{width: (((paginaLectura+1)/LECTURA_SESION_1.length)*100)+"%"}}/></div>
                <p className="mt-2 text-xs text-muted-foreground">Apartado {paginaLectura+1} de {LECTURA_SESION_1.length}</p>
              </header>
              <main className="flex-1 space-y-4 p-5 sm:p-8">
                <h3 className="text-xl font-semibold">{LECTURA_SESION_1[paginaLectura].titulo}</h3>
                {LECTURA_SESION_1[paginaLectura].bloques.map((bloque,idx) => <p key={idx} className="whitespace-pre-line text-sm leading-7 text-foreground/90">{bloque}</p>)}
                {paginaLectura === LECTURA_SESION_1.length-1 && <div className="rounded-xl border border-gold/30 bg-gold/5 p-4"><p className="text-sm font-semibold">Has llegado al final de la lectura</p><p className="mt-1 text-sm text-muted-foreground">{lecturaModoVistaPrevia ? "En la experiencia del alumno, aquí podrá finalizar y marcar la sesión como completada." : "La lectura está registrada como leída. Puedes marcar la sesión como completada."}</p></div>}
              </main>
              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 sm:p-5">
                <button type="button" disabled={paginaLectura===0} onClick={() => setPaginaLectura(p => Math.max(0,p-1))} className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2.5 text-sm disabled:opacity-40"><ChevronLeft className="size-4"/> Anterior</button>
                {paginaLectura < LECTURA_SESION_1.length-1 ? <button type="button" onClick={() => setPaginaLectura(p => Math.min(LECTURA_SESION_1.length-1,p+1))} className="inline-flex items-center gap-1 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black">Siguiente <ChevronRight className="size-4"/></button> : lecturaModoVistaPrevia ? <button type="button" onClick={() => { setLecturasSimuladas(prev => new Set(prev).add(lecturaAbierta.id)); setLecturaAbierta(null); setLecturaModoVistaPrevia(false); }} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black"><CheckCircle2 className="size-4"/> Simular lectura completada</button> : sesionesCompletadas.has(lecturaAbierta.id) ? <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="size-5"/> Sesión completada</span> : <button type="button" disabled={ocupado} onClick={() => void marcarLecturaCompletada(lecturaAbierta)} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"><CheckCircle2 className="size-4"/> Marcar como completada</button>}
              </footer>
            </div>
          </div>}
          {examenActivoAlumno ? <Panel titulo={examenActivoAlumno.titulo}><div className="space-y-4 p-5">
            {examenActivoAlumno.instrucciones && <p className="text-sm text-muted-foreground">{examenActivoAlumno.instrucciones}</p>}
            {examenActivoAlumno.preguntas.map((p, idx) => <div key={p.id} className="space-y-2 rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Pregunta {idx + 1} · {p.puntaje} pts</p><p className="text-sm font-medium">{p.enunciado}</p>
              {p.tipo === "practica" ? <textarea value={respuestasAlumno[p.id] ?? ""} onChange={e => setRespuestasAlumno(v => ({...v,[p.id]:e.target.value}))} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Describe tu ejercicio práctico…" /> : <div className="space-y-2">{p.opciones.map(o => <label key={o.value} className="flex items-center gap-2 text-sm"><input type="radio" name={p.id} value={o.value} checked={respuestasAlumno[p.id] === o.value} onChange={e => setRespuestasAlumno(v => ({...v,[p.id]:e.target.value}))} />{o.label}</label>)}</div>}
            </div>)}
            <div className="flex gap-2"><button type="button" disabled={enviandoExamen} onClick={() => void enviarExamenAlumno()} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"><Send className="size-4" /> Enviar evaluación</button><button type="button" onClick={() => setExamenActivoAlumno(null)} className="rounded-lg border border-border px-4 py-2 text-sm">Volver</button></div>
          </div></Panel> : null}
          {alumnoQuery.isLoading ? <Panel titulo="Cargando tus cursos"><p className="p-5 text-sm text-muted-foreground">Vinculando tu inscripción y recuperando tus cursos…</p></Panel> : alumnoQuery.error ? <Panel titulo="No se pudo cargar el aula"><p className="p-5 text-sm text-red-700">{alumnoQuery.error.message}</p></Panel> : inscripcionesAlumno.length === 0 ? <Panel titulo="Aún no tienes cursos asignados"><p className="p-5 text-sm text-muted-foreground">Cuando FADILAB te inscriba con el correo de tu cuenta, el curso aparecerá aquí automáticamente.</p></Panel> : inscripcionesAlumno.map(i => <Panel key={i.id} titulo={i.formacion_cursos?.titulo ?? "Curso de formación"}>
            <div className="p-5"><p className="text-sm text-muted-foreground">{i.formacion_cursos?.descripcion || "Materiales y actividades de tu formación."}</p><div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground"><span>{i.formacion_cursos?.duracion_horas ?? 0} horas</span><span>Inscripción: {i.estado}</span></div>
              <h3 className="mb-2 mt-5 text-sm font-semibold">Sesiones</h3>
              {(sesionesAlumnoQuery.data ?? []).filter(item => item.curso_id === i.curso_id).length === 0 ? <p className="text-xs text-muted-foreground">Todavía no hay sesiones publicadas.</p> : (sesionesAlumnoQuery.data ?? []).filter(item => item.curso_id === i.curso_id).map(item => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3"><div className="min-w-0"><p className="text-xs text-muted-foreground">Sesión {item.numero}</p><p className="text-sm font-medium">{item.titulo}</p>{item.descripcion && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{item.descripcion}</p>}</div><div className="flex shrink-0 items-center gap-2">{sesionesCompletadas.has(item.id) && <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="size-4"/> Completada</span>}{item.numero === 1 ? <button type="button" onClick={() => { setLecturaAbierta(item); setPaginaLectura(0); }} className="inline-flex items-center gap-1 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold-deep"><BookOpenCheck className="size-4"/> Abrir lectura</button> : <span className="text-xs text-muted-foreground">Lectura en preparación</span>}</div></article>)}
              <h3 className="mb-2 mt-5 text-sm font-semibold">Evaluaciones</h3>
              {(examenesAlumnoQuery.data ?? []).filter(x => x.curso_id === i.curso_id).map(x => {
                const intentos = (intentosAlumnoQuery.data ?? []).filter(t => t.examen_id === x.id);
                const disponible = (!x.disponible_desde || new Date(x.disponible_desde) <= new Date()) && (!x.disponible_hasta || new Date(x.disponible_hasta) > new Date());
                const estado = intentos[0]?.calificacion == null ? (intentos[0]?.estado ?? "Pendiente") : "Nota " + intentos[0].calificacion + "/20";
                return <div key={x.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3"><div><p className="text-sm font-medium">{x.titulo}</p><p className="text-xs text-muted-foreground">{intentos.length}/{x.intentos_permitidos} intentos · {estado}</p></div><button type="button" disabled={!disponible || intentos.length >= x.intentos_permitidos || Boolean(examenActivoAlumno)} onClick={() => void abrirExamenAlumno(x.id)} className="rounded-lg border border-border px-3 py-2 text-xs disabled:opacity-40">Rendir evaluación</button></div>;
              })}
              <h3 className="mb-2 mt-5 text-sm font-semibold">Materiales publicados</h3>
              {(materialesAlumnoQuery.data ?? []).filter(m => m.curso_id === i.curso_id).length === 0 ? <p className="text-xs text-muted-foreground">Todavía no hay materiales publicados.</p> : (materialesAlumnoQuery.data ?? []).filter(m => m.curso_id === i.curso_id).map(m => <div key={m.id} className="flex items-center justify-between gap-3 border-t border-border py-3"><div className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0 text-gold-deep" /><span className="min-w-0"><span className="block truncate text-sm font-medium">{m.titulo}</span><span className="text-xs text-muted-foreground">{m.nombre_archivo} · {(m.tamano_bytes / 1024 / 1024).toFixed(1)} MB</span></span></div><button type="button" onClick={() => void descargarMaterial(m)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs"><Download className="size-3.5" /> Descargar</button></div>)}
            </div>
          </Panel>)}
        </>
      )}
      {permisoDocente.isLoading && sesion?.esAdmin && fadilabCandidate ? <p className="text-xs text-muted-foreground">Comprobando autorización docente de FADILAB…</p> : null}
      {permisoDocente.error ? <p className="rounded-xl border border-red-300 p-3 text-sm text-red-700">No se pudo validar el acceso docente: {permisoDocente.error.message}</p> : null}
      {mensaje && <p role="status" className="rounded-xl border border-border bg-card p-3 text-sm">{mensaje}</p>}
    </div>
  </AppShell>;
}
