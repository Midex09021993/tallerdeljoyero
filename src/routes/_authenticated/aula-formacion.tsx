import { useEffect, useMemo, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarDirectorioAlumnosFormacion, listarInscripcionesAlumnoFormacion, matricularAlumnosFormacion } from "@/lib/aula-formacion.functions";
import { BookOpen, Users, Plus, Upload, FileText, Download, CalendarDays, ShieldCheck, Send, Pencil, Trash2, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, ArrowRight, BookOpenCheck, FolderOpen, ClipboardCheck, Layers, Eye, Lock, Unlock, RotateCcw, Command } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import LaboratorioCurvasNurbs from "@/components/aula/LaboratorioCurvasNurbs";
import LaboratorioSolidos from "@/components/aula/LaboratorioSolidos";
import LaboratorioSuperficies from "@/components/aula/LaboratorioSuperficies";
import LaboratorioValidacionModelo from "@/components/aula/LaboratorioValidacionModelo";
import AuriTutorCurso from "@/components/aula/AuriTutorCurso";
import LaboratorioCurveEditor from "@/components/aula/LaboratorioCurveEditor";
import LaboratorioCurvasBasicas from "@/components/aula/LaboratorioCurvasBasicas";
import RhinoObjectExplorer from "@/components/aula/RhinoObjectExplorer";
import RhinoViewportTrainer3D from "@/components/aula/RhinoViewportTrainer3D";
import { useSesion } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/aula-formacion")({
  head: () => ({ meta: [{ title: "Aula de formación — Taller del Joyero" }, { name: "description", content: "Aula académica para cursos, materiales y seguimiento de formación." }] }),
  component: AulaFormacionPage,
});

type Curso = { id: string; participante_id: string; titulo: string; descripcion: string | null; duracion_horas: number; estado: string };
type Inscripcion = { id: string; curso_id: string; email_alumno: string; nombre_alumno: string | null; alumno_user_id?: string | null; estado: string; formacion_cursos: Curso | null };
type Material = { id: string; curso_id: string; sesion_id: string | null; titulo: string; descripcion: string | null; nombre_archivo: string; ruta_storage: string; mime_type: string; tamano_bytes: number; created_at: string; publicado: boolean };
type SesionCurso = { id: string; curso_id: string; numero: number; titulo: string; descripcion: string | null; duracion_horas: number; fecha_programada: string | null; publicada: boolean; bloqueada: boolean };
type Examen = { id: string; curso_id: string; sesion_id?: string | null; titulo: string; instrucciones: string | null; duracion_minutos: number | null; intentos_permitidos: number; puntaje_maximo: number; publicado: boolean; disponible_desde: string | null; disponible_hasta: string | null; aleatorizar_preguntas?: boolean; permitir_retroceso?: boolean };
type Pregunta = { id: string; examen_id: string; tipo: "opcion_multiple" | "verdadero_falso" | "practica"; enunciado: string; opciones: Array<{label:string;value:string}>; respuesta_correcta?: unknown; puntaje: number; orden: number; obligatoria: boolean };
type ExamenAlumno = { id: string; titulo: string; instrucciones: string | null; duracion_minutos: number | null; puntaje_maximo: number; permitir_retroceso?: boolean; intento_id?: string; vence_en?: string | null; preguntas: Array<{id:string;tipo:string;enunciado:string;opciones:Array<{label:string;value:string}>;puntaje:number;orden:number;obligatoria:boolean}> };
type Intento = { id: string; examen_id: string; numero_intento: number; calificacion: number | null; estado: string; enviado_en: string; observaciones_docente: string | null };


const LECTURA_SESION_1 = [
  { titulo: "1. El diseño CAD aplicado a la joyería", bloques: [
    "CAD significa diseño asistido por computadora. En joyería permite desarrollar, revisar y modificar digitalmente una pieza antes de fabricarla.",
    "El modelo digital ayuda a estudiar proporciones, dimensiones y la ubicación de los componentes. También permite conservar un archivo editable para continuar el trabajo.",
    "El CAD complementa el oficio artesanal y el criterio del joyero; no los sustituye."
  ]},
  { titulo: "2. Introducción a Rhinoceros 7", bloques: [
    "Rhinoceros (Rhino) es un programa de diseño y modelado tridimensional utilizado en distintas áreas, entre ellas el diseño de joyería.",
    "Rhino trabaja principalmente con geometría NURBS, que permite representar curvas y superficies con precisión. MatrixGold incorpora herramientas especializadas para el diseño de joyería sobre el entorno de Rhino.",
    "En esta primera sesión no dibujaremos ni construiremos geometría: aprenderemos a reconocer el espacio de trabajo y a desplazarnos por él."
  ]},
  { titulo: "3. Reconocimiento de la interfaz", bloques: [
    "MatrixGold 3.1 incorpora herramientas especializadas para el diseño de joyería sobre el entorno de Rhino. Su espacio de trabajo reúne barras de herramientas, ventanas de visualización y paneles que facilitan el acceso a sus funciones.",
    "La guía interactiva contiene 14 marcadores numerados. Selecciona cada círculo sobre la captura para conocer dónde se encuentra cada componente y para qué sirve.",
    "Importante: la captura corresponde a MatrixGold 3.1, no a la interfaz estándar de Rhino 7. En esta sesión solo reconoceremos sus componentes; no ejecutaremos herramientas ni modificaremos archivos."
  ]},
  { titulo: "4. Vistas y orientación espacial", bloques: [
    "Top muestra el contenido desde arriba; Front, desde el frente; y Right, desde la derecha. Estas son vistas paralelas. Perspective permite apreciar la profundidad y comprender mejor el volumen de una pieza.",
    "Los ejes X, Y y Z representan las tres direcciones principales del espacio. En la orientación habitual de Rhino, X corresponde a la dirección horizontal, Y a la profundidad y Z a la altura. La apariencia de los ejes cambia según la vista desde la que se observen."
  ]},
  { titulo: "5. Navegación básica en Rhino 7 para Windows", bloques: [
    "Acercar y alejar (Zoom): gira la rueda del ratón hacia delante o hacia atrás sobre la ventana activa.",
    "Desplazar una vista paralela: mantén pulsado el botón derecho del ratón y arrastra.",
    "Girar la vista Perspective: mantén pulsado el botón derecho del ratón y arrastra dentro de la ventana Perspective.",
    "Desplazar la vista Perspective: mantén pulsadas las teclas Shift y el botón derecho del ratón mientras arrastras.",
    "Maximizar y restaurar una ventana: haz doble clic sobre el título de la vista.",
    "Recuperar el encuadre (Zoom Extents): utiliza Vista > Zoom > Extensión de zoom. Si el docente ha configurado F12 en el equipo, también podrás utilizar esa tecla como acceso directo.",
    "Comandos de navegación disponibles en la línea de comandos:",
    "Zoom — Control de acercamiento.",
    "ZE (Zoom Extents) — encuadra todos los objetos.",
    "ZEA (Zoom All Extents) — encuadra los objetos en todas las vistas.",
    "ZS (Zoom Selected) — encuadra los objetos seleccionados.",
    "Pan — desplaza la vista.",
    "UndoView — recupera la vista anterior."
  ]},
  { titulo: "6. Configuración inicial del entorno", bloques: [
    "Antes de comenzar, verifica que estén disponibles las cuatro vistas principales: Top, Front, Right y Perspective. Comprueba también que la línea de comandos esté visible y que puedas leer sus indicaciones.",
    "Identifica cuál es la vista activa y localiza la barra de estado. Comprueba las unidades configuradas en las propiedades del archivo, siguiendo la indicación del docente.",
    "No cambies las unidades ni modifiques el contenido del documento durante esta práctica. Abre el archivo proporcionado por FADILAB tal como se entrega y conserva su contenido original."
  ]},
  { titulo: "7. Del diseño digital a la manufactura aditiva", bloques: [
    "En joyería, el diseño digital forma parte de un flujo de trabajo que puede continuar con la preparación del modelo, la impresión 3D y el proceso de fabricación de la joya.",
    "La impresión 3D permite obtener una pieza física a partir del modelo digital. El resultado puede utilizarse en distintas rutas de producción, según el proceso de fabricación elegido.",
    "En esta sesión solo reconoceremos el flujo general: Diseño CAD → Preparación del modelo → Impresión 3D → Proceso de fabricación de la joya. Los materiales y parámetros específicos se estudiarán más adelante."
  ]},
  { titulo: "8. Actividad práctica: recorrido y navegación en el espacio 3D", bloques: [
    "Objetivo: practicar los movimientos de visualización en Rhino 7 utilizando únicamente el archivo TIPOS DE OBJETOS RHINOCEROS.3dm, proporcionado por FADILAB. Este archivo se utilizará como referencia visual; no debes crear, seleccionar, mover, borrar ni modificar sus objetos.",
    "1) Abre Rhino 7 para Windows y, desde Archivo > Abrir, carga TIPOS DE OBJETOS RHINOCEROS.3dm.",
    "2) Reconoce las cuatro ventanas: Top, Front, Right y Perspective. Identifica también la línea de comandos.",
    "3) En las ventanas, utiliza la rueda del ratón para acercar y alejar la vista. Repite el movimiento y observa cómo cambia el encuadre.",
    "4) En una vista paralela, mantén pulsado el botón derecho y arrastra para desplazar la vista.",
    "5) En Perspective, mantén pulsado el botón derecho y arrastra para girar la vista. Después, mantén Shift + botón derecho y arrastra para desplazarla.",
    "6) Haz doble clic en el título de Perspective para maximizar la ventana. Repite el doble clic para restaurar las cuatro vistas.",
    "7) Ejecuta Vista > Zoom > Extensión de zoom (Zoom Extents). Si F12 está configurada por el docente, también puedes utilizarla como acceso directo. Observa cómo Rhino encuadra el contenido del archivo.",
    "8) Repite los movimientos hasta poder realizarlos con control. Al terminar, cierra el archivo sin guardar cambios. No es necesario entregar un modelo ni modificar el archivo de práctica."
  ]},
  { titulo: "9. Repaso guiado y dominio del entorno", bloques: [
    "Al finalizar esta sesión, habrás aprendido a reconocer los principales componentes de la interfaz y a diferenciar las vistas Top, Front, Right y Perspective.",
    "También podrás identificar los ejes X, Y y Z; acercar, alejar y desplazar las vistas; girar y desplazar Perspective; maximizar y restaurar una vista; y recuperar el encuadre mediante Zoom Extents.",
    "Ya conoces el entorno de trabajo de Rhino 7 y MatrixGold 3.1. En la siguiente sesión comenzaremos a utilizar herramientas para construir geometría básica aplicada al diseño de joyería.",
    "Recuerda: el archivo TIPOS DE OBJETOS RHINOCEROS.3dm se utiliza únicamente para practicar la navegación y los movimientos de visualización. No forma parte de un ejercicio de modelado."
  ]}
] as const;

const LECTURA_SESION_2 = [
  { titulo: "1. Objetivos: geometría básica y organización del proyecto", bloques: [
    "En esta sesión comenzaremos a crear geometría sencilla en Rhinoceros 7 y aprenderemos a organizar los elementos mediante capas (Layers). El propósito es comprender cómo se construyen y ordenan los objetos antes de abordar modelados más precisos.",
    "Al finalizar podrás reconocer objetos geométricos básicos, crear líneas, polilíneas, círculos y rectángulos, distinguir curvas de superficies y sólidos, y organizar los elementos en capas con nombres y colores.",
    "Distribución orientativa de las 2 horas: introducción y conceptos (20 min), geometría básica (35 min), capas y organización (30 min), práctica guiada (25 min) y repaso (10 min)."
  ]},
  { titulo: "2. ¿Qué es la geometría en Rhino?", bloques: [
    "En Rhino, un modelo se construye mediante objetos geométricos. Cada objeto tiene una función y una estructura que debemos reconocer para trabajar de forma ordenada.",
    "Un punto indica una posición en el espacio. Una curva representa un recorrido o contorno; puede ser abierta, como una línea, o cerrada, como un círculo. Una superficie representa una zona con área y una forma determinada. Un sólido es un volumen cerrado.",
    "En esta sesión nos concentraremos en reconocer y crear geometría básica, principalmente curvas planas. Las superficies, los sólidos y las operaciones de modelado se estudiarán en sesiones posteriores."
  ]},
  { titulo: "3. Curvas básicas: línea, polilínea, círculo y rectángulo", bloques: [
    "Línea (Line): crea un segmento recto definido por un punto inicial y uno final.",
    "Polilínea (Polyline): crea una secuencia de segmentos conectados. Puede utilizarse para representar contornos compuestos por tramos rectos.",
    "Círculo (Circle): crea una curva cerrada circular. En el procedimiento básico se indica el centro y después el radio mediante un segundo punto.",
    "Rectángulo (Rectangle): crea un contorno rectangular indicando dos esquinas opuestas.",
    "Estas herramientas permiten construir formas elementales que luego pueden servir como referencias para diseños más elaborados. Por ahora practica las formas sin buscar medidas o tolerancias de fabricación."
  ]},
  { titulo: "4. El plano de trabajo y la cuadrícula", bloques: [
    "En Rhino, el plano de trabajo es la superficie de referencia sobre la que se ubican los puntos y se dibujan las curvas. La cuadrícula representa visualmente ese plano mediante líneas horizontales y verticales que ayudan a reconocer la orientación, las distancias relativas y la posición de la geometría. La cuadrícula es una guía visual: no forma parte del modelo ni se convierte en un objeto.",
    "El plano de construcción (Construction Plane o CPlane) define la orientación y la posición del plano sobre el que trabaja una vista. Cuando dibujas en una vista, los puntos se interpretan respecto a ese plano. Por eso es importante saber qué vista está activa y qué plano de construcción utiliza antes de iniciar un comando.",
    "Las vistas paralelas muestran el modelo desde direcciones perpendiculares entre sí y mantienen las proporciones sin convergencia de perspectiva: Top (Superior) observa desde arriba y representa el plano XY; Front (Frontal) observa desde delante y muestra los ejes X y Z; Right (Derecha) observa desde el costado y muestra los ejes Y y Z. Son útiles para dibujar, alinear y comprobar posiciones con claridad.",
    "La vista Perspective (Perspectiva) muestra el modelo de forma tridimensional, como lo percibimos visualmente: permite apreciar profundidad, volumen y la relación espacial entre las partes. Es ideal para inspeccionar la forma general, pero para dibujar con precisión suele convenir una vista paralela adecuada al plano de trabajo.",
    "Los ejes X, Y y Z representan las tres direcciones del espacio: X corresponde al ancho, Y a la profundidad y Z a la altura. La cuadrícula y los ejes te ayudan a orientarte, pero recuerda que cambiar de vista no cambia por sí solo la geometría: cambia el punto desde el que la observas.",
    "En esta sesión aprenderás a reconocer las cuatro vistas y a entender para qué sirve cada una. No cambies las unidades ni la configuración general del documento; el ingreso de medidas exactas y el modelado preciso se estudiarán en una etapa posterior."
  ]},
  { titulo: "5. Crear y reconocer objetos en el área de trabajo", bloques: [
    "Para iniciar un comando puedes escribir su nombre en la línea de comandos o utilizar el icono correspondiente. Rhino mostrará indicaciones sobre el siguiente paso que debes realizar.",
    "En Line, indica el primer punto y después el segundo. En Circle, indica el centro y luego define el radio con un segundo punto. En Rectangle, indica dos esquinas opuestas.",
    "Pulsa Enter cuando el comando solicite finalizar o confirmar. Pulsa Esc para cancelar el comando activo. Lee siempre las indicaciones de la línea de comandos antes de realizar el siguiente clic.",
    "Para seleccionar un objeto, haz clic sobre su geometría. Para quitar la selección, pulsa Esc o haz clic en un espacio vacío cuando no haya un comando activo. La selección permite identificar qué objeto vas a organizar."
  ]},
  { titulo: "6. El panel Layers de MatrixGold", bloques: [
    "En MatrixGold trabajaremos con el panel Layers (Capas) integrado en su entorno de Rhino. En la captura de referencia del curso aparecen los grupos Metal, Gem, Object, User, Render, Extra A, Extra B y Extra C. Estos nombres permiten reconocer distintas familias de organización del archivo; no debemos cambiar de grupo ni mover componentes sin comprender primero cómo está estructurada la joya.",
    "Cada grupo muestra filas de capas identificadas por colores. El color ayuda a reconocer visualmente la capa, pero no significa necesariamente que todos los objetos de esa capa estén fabricados con ese material. En el ejemplo del curso, la barra inferior muestra Metal 01 como capa activa.",
    "La capa activa es el destino de los objetos nuevos que se creen mientras permanezca seleccionada. Antes de dibujar, comprueba el nombre de la capa activa en el panel y en la barra inferior."
  ]},
  { titulo: "7. Asignar y controlar objetos desde Layers", bloques: [
    "Asignar un objeto: primero selecciona el objeto en la ventana de modelado. Después, en el panel Layers, haz clic en el pequeño triángulo de la fila cuyo color identifica la capa de destino. Esta acción asigna el objeto seleccionado a esa capa. No confundas este triángulo con un control para desplegar subcapas.",
    "Visibilidad (icono del ojo): al desactivar el ojo se ocultan en pantalla los objetos asignados a esa capa. Al volver a activarlo, los objetos se muestran otra vez. La prueba con el anillo del curso demostró que se puede ocultar una parte del cuerpo metálico o la piedra central sin ocultar necesariamente el resto de la joya.",
    "Bloqueo (icono del candado): al bloquear una capa, sus objetos permanecen visibles, pero no se pueden seleccionar directamente en la ventana de modelado. Por ello no se pueden mover ni modificar mediante selección. La prueba también confirmó que el ojo sigue funcionando: una capa bloqueada puede ocultarse y volver a mostrarse.",
    "Diferencia importante: ocultar controla si vemos los objetos; bloquear impide seleccionarlos para modificarlos; asignar determina a qué capa pertenecen. Son acciones independientes.",
    "Trabaja con cuidado en las capas Metal y Gem de un diseño existente. Para practicar cambios de asignación, utiliza una copia del archivo y conserva intacto el original."
  ]},
  { titulo: "8. Actividad práctica: organizar una joya en MatrixGold", bloques: [
    "Objetivo: organizar los componentes de una joya por capas y demostrar que puedes asignar objetos, controlar su visibilidad y bloquearlos sin perder de vista el modelo. Primero completarás el laboratorio interactivo de FADILAB; después podrás repetir el procedimiento en MatrixGold con una copia del archivo de práctica.",
    "1) Inicia el Laboratorio de capas · MatrixGold que aparece debajo de esta actividad. En la vista esquemática, selecciona el cuerpo del anillo y asígnalo a Metal 01 mediante el botón de asignación (▶). Después selecciona la piedra central y asígnala a Gem 01. Comprueba que cada pieza adopta el color de identificación de su capa.",
    "2) Comprueba la visibilidad de forma independiente: oculta Metal 01 y observa qué parte desaparece; vuelve a mostrarla. Repite el procedimiento con Gem 01. La otra parte de la joya debe permanecer visible en cada prueba.",
    "3) Comprueba el bloqueo: activa el candado de Metal 01 e intenta seleccionar o arrastrar el cuerpo del anillo. Debe permanecer visible y no permitir la selección. Desbloquéala y repite la prueba con Gem 01.",
    "4) Selecciona Metal 01 como capa principal y añade una figura auxiliar desde el panel Sólidos. Comprueba que aparece identificada en esa capa. Cambia la capa principal a Gem 01 y añade otra figura. Prueba a seleccionar y mover los objetos auxiliares; después elimínalos para dejar limpia la escena.",
    "5) Verifica el resultado final: el cuerpo debe pertenecer a Metal 01 y la piedra a Gem 01; ambas capas deben quedar visibles y desbloqueadas. Cierra el laboratorio y responde el reto de comprobación.",
    "6) Si dispones de MatrixGold, abre el archivo de práctica, guarda una copia y reproduce allí la organización por capas. No modifiques el archivo original ni reasignes componentes estructurales sin indicación del docente."
  ]},
  { titulo: "9. Repaso guiado y preparación para la siguiente sesión", bloques: [
    "En MatrixGold, el panel Layers organiza los componentes del proyecto mediante grupos y capas identificadas por colores. La capa activa determina dónde se crearán los objetos nuevos.",
    "Ya puedes distinguir las tres operaciones principales: el triángulo asigna el objeto seleccionado a una capa; el ojo muestra u oculta los objetos de esa capa; y el candado impide seleccionarlos directamente para moverlos o modificarlos. Una capa bloqueada puede seguir ocultándose o mostrándose con el ojo.",
    "Antes de terminar, verifica que puedes localizar la capa activa, identificar los grupos principales, ocultar y recuperar una parte de la joya, bloquear y desbloquear una capa y asignar un objeto auxiliar a otra capa.",
    "En la siguiente sesión avanzaremos hacia el modelado preciso: trabajaremos con medidas, referencias y herramientas para controlar la construcción geométrica con mayor exactitud."
  ]}
] as const;

const LECTURA_SESION_3 = [
  { titulo: "1. Objetivo: modelado preciso en Rhino", bloques: [
    "En esta sesión aprenderás a introducir posiciones con precisión y a utilizar ayudas de referencia para construir geometría controlada. La meta es dejar de depender únicamente de la colocación visual con el ratón.",
    "Trabajaremos con coordenadas absolutas, relativas y polares; restricciones de distancia y ángulo; referencias a objetos (Osnap) y SmartTrack. Estas herramientas permiten definir puntos y relaciones geométricas con mayor exactitud.",
    "Distribución de las 2 horas: preparación del documento (10 min), coordenadas (25 min), restricciones (15 min), Osnap (25 min), SmartTrack (10 min), práctica aplicada (25 min) y verificación (10 min)."
  ]},
  { titulo: "2. Preparar el documento y el plano de construcción", bloques: [
    "Antes de dibujar, comprueba las unidades del archivo. Para esta práctica utiliza milímetros. Revisa también la vista activa y el plano de construcción (PlanoC): trabajaremos principalmente en la vista Superior, sobre el plano XY.",
    "El plano de construcción determina la orientación de las coordenadas y el lugar donde se crean los puntos. Si el plano o la vista no son los esperados, una coordenada correcta puede producir geometría en una posición u orientación distinta de la prevista.",
    "Comprueba que el plano de construcción predeterminado esté activo y que la vista Superior esté preparada. No cambies a planos de construcción personalizados en esta sesión."
  ]},
  { titulo: "3. Coordenadas absolutas", bloques: [
    "Las coordenadas absolutas indican una posición respecto al origen del sistema de coordenadas del plano de trabajo. En el sistema cartesiano se expresan mediante X, Y y Z. Por ejemplo, 20,10,0 indica X=20, Y=10 y Z=0 en las unidades del archivo.",
    "En Rhino, introduce los valores X,Y,Z en la línea de comandos. La posición se calcula siempre desde el origen del plano de construcción, no desde el último punto indicado."
  ]},
  { titulo: "4. Coordenadas relativas", bloques: [
    "Las coordenadas relativas definen una nueva posición tomando como referencia el último punto indicado. En Rhino se utiliza el prefijo @. Por ejemplo, @10,0,0 indica avanzar 10 unidades en X desde el punto anterior, manteniendo Y y Z.",
    "Este método resulta útil para construir segmentos consecutivos con desplazamientos controlados, sin tener que calcular la posición absoluta de cada vértice."
  ]},
  { titulo: "5. Coordenadas polares", bloques: [
    "Las coordenadas polares permiten definir un punto mediante una distancia y un ángulo, en lugar de indicar por separado sus valores X e Y. Rhino interpreta el ángulo en relación con el eje X positivo del plano de construcción.",
    "Para introducir una coordenada polar absoluta, escribe distancia<ángulo. Por ejemplo, 10<45 sitúa el punto a 10 unidades del origen, en una dirección de 45° en sentido antihorario.",
    "Para indicar distancia y ángulo desde el último punto, utiliza el prefijo @: @10<45. Esta es una coordenada polar relativa. El símbolo @ cambia el punto de referencia: ya no se mide desde el origen, sino desde el último punto indicado.",
    "Como referencia angular: 0° apunta a la derecha, 90° hacia arriba, 180° hacia la izquierda y 270° hacia abajo. Antes de confirmar, comprueba que la distancia y la dirección correspondan al lado que deseas construir."
  ]},
  { titulo: "6. Restricciones de distancia y ángulo", bloques: [
    "Las restricciones permiten controlar la entrada de puntos mientras dibujas. Puedes indicar una distancia concreta o fijar una dirección angular para evitar que la geometría dependa de la posición aproximada del cursor.",
    "Utiliza una restricción de distancia cuando necesites que un segmento tenga una longitud definida. Utiliza una restricción angular cuando necesites mantener una dirección determinada. La disponibilidad y el comportamiento de estas ayudas dependen del comando activo y de las opciones de entrada de Rhino.",
    "Durante la práctica, combina coordenadas con restricciones: introduce los valores necesarios y confirma el punto solo cuando la dirección y la longitud correspondan al diseño. No confundas una guía visual con una dimensión verificada."
  ]},
  { titulo: "7. Referencias a objetos (Osnap)", bloques: [
    "Osnap (Object Snap) permite ajustar el cursor a puntos geométricos exactos de objetos existentes. Evita seleccionar posiciones aproximadas cuando necesitas conectar, centrar o alinear geometría.",
    "Referencias principales: End (extremo), Mid (punto medio), Cen (centro), Int (intersección), Near (cercano), Perp (perpendicular), Tan (tangente), Quad (cuadrante) y Point (punto). Activa solo las referencias necesarias para evitar capturas no deseadas.",
    "Ejemplos: utiliza End para comenzar exactamente en el extremo de una curva; Mid para localizar su punto medio; Cen para capturar el centro de un círculo; Int para ubicar el cruce de dos curvas; y Perp para establecer una relación perpendicular.",
    "Observa el indicador de Osnap antes de confirmar cada punto. Si se activa una referencia equivocada, pausa y desactiva temporalmente las opciones que no necesitas."
  ]},
  { titulo: "8. SmartTrack y ayudas de alineación", bloques: [
    "SmartTrack utiliza puntos adquiridos mediante Osnap para mostrar líneas de seguimiento temporales. Al mover el cursor, estas guías ayudan a mantener alineaciones horizontales, verticales o relaciones entre referencias, sin crear geometría auxiliar permanente.",
    "Utiliza SmartTrack junto con Osnap: primero adquiere uno o más puntos exactos con Osnap y después desplaza el cursor para observar las guías temporales. Osnap define la referencia geométrica; SmartTrack facilita la alineación respecto a ella. Ninguna de las dos herramientas sustituye la revisión de las coordenadas ni del plano de trabajo.",
    "Para practicar, activa SmartTrack en la barra de estado, habilita solo los Osnap necesarios, captura un punto de referencia y mueve el cursor hasta que aparezca la guía de alineación deseada. Confirma el punto únicamente cuando la guía y la posición correspondan a la intención del diseño."
  ]},
  { titulo: "9. Práctica aplicada: placa base para una joya", bloques: [
    "Prepara un documento en milímetros, activa la vista Superior y utiliza el plano de construcción predeterminado. Inicia una polilínea en el origen con la coordenada absoluta 0,0,0.",
    "Construye un rectángulo de 20 × 10 mm mediante coordenadas relativas cartesianas: desde el primer punto introduce @20,0,0; después @0,10,0; luego @-20,0,0 y cierra la polilínea. Comprueba que las dimensiones sean 20 mm por 10 mm.\n\nRepite el mismo rectángulo usando coordenadas polares relativas. Inicia otra polilínea en 0,0,0 y, en cada vértice, introduce @20<0 (lado derecho), @10<90 (lado superior), @20<180 (lado izquierdo) y @10<270 (lado inferior). Cierra la polilínea y verifica que también mida 20 × 10 mm. Observa que aquí @ indica que la distancia y el ángulo se calculan desde el último punto, no desde el origen.",
    "Traza las dos diagonales del rectángulo. Utiliza Osnap Int para localizar su intersección y dibuja allí un círculo de radio 3 mm. Comprueba el centro con la referencia de intersección y el tamaño con la herramienta de medición correspondiente.",
    "Utiliza End y Mid para capturar puntos exactos de las curvas. Activa SmartTrack y prueba una alineación temporal respecto a puntos existentes, sin dejar líneas auxiliares innecesarias en el archivo.",
    "Guarda el ejercicio como Sesion_03_Modelado_Preciso.3dm. Verifica que el rectángulo mida 20 × 10 mm, que el círculo tenga radio 3 mm y que toda la geometría esté en el plano de construcción esperado."
  ]},
  { titulo: "10. Verificación y criterios de logro", bloques: [
    "Al finalizar debes poder diferenciar coordenadas absolutas, relativas cartesianas y polares relativas; introducir una posición polar desde el origen y un desplazamiento polar desde el último punto; construir el rectángulo de 20 × 10 mm con @distancia<ángulo; aplicar restricciones de distancia y ángulo; utilizar al menos tres referencias Osnap adecuadas; y explicar cómo SmartTrack facilita una alineación temporal.",
    "La práctica se considera correcta cuando las dimensiones del rectángulo y del círculo coinciden con los valores solicitados, las curvas están correctamente ubicadas y el archivo queda guardado con el nombre indicado.",
    "Antes de continuar, revisa que no hayas creado geometría accidental fuera del plano de construcción. La siguiente sesión abordará la edición de curvas y las transformaciones."
  ]}
] as const;

const LECTURA_SESION_4 = [
  { titulo: "1. Objetivo: editar curvas sin perder el control del diseño", bloques: [
    "En esta sesión aprenderás a corregir contornos existentes y transformar geometría de forma controlada. En joyería, estas operaciones permiten limpiar perfiles, preparar transiciones, crear variantes y conservar una geometría organizada.",
    "Al finalizar podrás distinguir Fillet de Chamfer, generar Offset, utilizar Trim, Split, Extend y Join, y aplicar Move, Copy, Rotate y Scale con referencias claras.",
    "Regla de trabajo: conserva una copia del perfil original antes de editar. Comprueba medidas, continuidad, extremos y el resultado de cada comando. Una operación geométricamente válida no garantiza por sí sola que el perfil sea adecuado para fabricación.",
    "Distribución orientativa de 2 horas: lectura y demostración (20 min), edición y limpieza de curvas (35 min), transformaciones (25 min), práctica integradora (30 min) y verificación (10 min)."
  ]},
  { titulo: "2. Fillet: crear empalmes redondeados", bloques: [
    "Fillet crea un arco de transición entre dos curvas o segmentos. El radio determina el tamaño del redondeo: un radio pequeño produce una transición más cerrada y uno mayor necesita más espacio.",
    "Procedimiento: inicia Fillet; revisa el valor de Radio en la línea de comandos; introduce la medida solicitada; selecciona la primera curva cerca de la esquina que deseas resolver y después la segunda. Observa la solución antes de continuar.",
    "La zona donde haces clic importa: Rhino utiliza la ubicación de selección para decidir qué partes de las curvas se conservan. Si el resultado no corresponde al diseño, cancela y repite seleccionando cerca de la región correcta.",
    "Comprueba que el arco enlaza ambas curvas y que el radio coincide con el solicitado. Si las curvas son demasiado cortas o están mal posicionadas, el empalme puede no generarse como esperas."
  ]},
  { titulo: "3. Chamfer y Offset: biselar y generar contornos paralelos", bloques: [
    "Chamfer crea una transición recta entre dos curvas. Es diferente de Fillet: Fillet utiliza un arco y Chamfer utiliza un segmento recto. Según las opciones disponibles, el chaflán puede definirse mediante distancias desde la esquina.",
    "Procedimiento: inicia Chamfer, define las distancias solicitadas, selecciona las dos curvas cerca de la esquina y revisa el segmento resultante. Comprueba que el bisel quedó en el lado previsto.",
    "Offset genera una curva paralela a la original a una distancia indicada. Selecciona la curva, introduce la distancia y señala el lado donde quieres crear el nuevo contorno. En curvas cerradas, observa si el resultado es interior o exterior.",
    "En zonas estrechas, radios pequeños o geometrías complejas pueden aparecer cruces, autointersecciones o segmentos no deseados. Revisa el resultado antes de continuar.",
    "Comparación clave: Fillet = transición curva; Chamfer = transición recta; Offset = curva paralela separada por una distancia."
  ]},
  { titulo: "4. Trim, Split, Extend y Join: limpiar y organizar curvas", bloques: [
    "Estas cuatro herramientas permiten preparar la geometría antes de aplicar otras operaciones. No son intercambiables: cada una modifica las curvas de una manera distinta.",
    "Trim elimina las partes de una curva que seleccionas como sobrantes, utilizando otras geometrías como objetos de corte. Flujo habitual: inicia Trim, selecciona los objetos cortantes, confirma la selección y luego selecciona los segmentos que deseas retirar.",
    "Split divide una curva en dos o más partes en los puntos indicados por objetos de corte o puntos de división. A diferencia de Trim, Split no decide por ti qué segmento debe desaparecer: conserva las partes como objetos separados.",
    "Extend prolonga una curva hasta un límite o una condición de extensión válida. Revisa el límite seleccionado y la dirección de prolongación antes de confirmar.",
    "Join une curvas cuyos extremos coinciden o están suficientemente próximos según la tolerancia del documento. Después de unir, comprueba si obtuviste una curva abierta o cerrada; Join no corrige automáticamente huecos grandes ni garantiza continuidad suave.",
    "Ejercicio de comparación: crea dos líneas que se crucen. Usa Trim para retirar un tramo; deshaz la operación y usa Split para dividir en la intersección. Después practica Extend hasta una curva límite y Join con dos segmentos cuyos extremos coincidan."
  ]},
  { titulo: "5. Move y Copy: desplazar y duplicar con precisión", bloques: [
    "Move desplaza el objeto seleccionado desde un punto base hasta un punto de destino. La diferencia entre ambos puntos define el desplazamiento. Puedes utilizar referencias Osnap o introducir coordenadas.",
    "Procedimiento: selecciona el objeto; ejecuta Move; indica el punto base; indica el punto de destino. Para desplazarlo exactamente 5 mm en X, utiliza las ayudas de coordenadas aprendidas en la sesión anterior.",
    "Copy utiliza una secuencia similar, pero conserva el objeto original y crea una o varias copias. Identifica cuál es el original y cuáles son las copias; comprueba sus posiciones y evita duplicar accidentalmente geometría."
  ]},
  { titulo: "6. Rotate y Scale: cambiar orientación y tamaño", bloques: [
    "Rotate gira la geometría alrededor de un centro definido. Después de seleccionar los objetos, indica el centro de rotación y el ángulo. La ubicación del centro es decisiva: el mismo ángulo produce resultados distintos si cambia el punto de giro.",
    "En el plano XY, un giro positivo de 90° sigue la convención angular habitual de Rhino. Comprueba el resultado desde Top y utiliza un punto de referencia reconocible para verificar la orientación.",
    "Scale modifica el tamaño respecto a un punto base. En el escalado uniforme, el mismo factor se aplica a las dimensiones y se conservan las proporciones. Un factor 2 duplica las dimensiones y un factor 0.5 las reduce a la mitad.",
    "Después de escalar, verifica las dimensiones funcionales de la pieza. No confundas un factor de escala con una medida final garantizada."
  ]},
  { titulo: "7. Práctica integradora: preparar y transformar un perfil", bloques: [
    "Objetivo: obtener variantes controladas de un perfil plano. Trabaja en un archivo nuevo o en una copia del documento de práctica. Configura milímetros y utiliza Top para construir y revisar el contorno.",
    "1) Dibuja un perfil de prueba formado por segmentos que se encuentren o crucen. Conserva una copia intacta y nómbrala ORIGINAL.",
    "2) En una copia, aplica Fillet con radio de 2 mm y Chamfer con distancias de 2 mm. Compara el arco y el tramo recto.",
    "3) Genera un Offset de 1 mm hacia el interior o exterior. Comprueba la separación y revisa que el contorno no se cruce.",
    "4) Utiliza Trim para retirar un sobrante; repite con Split para conservar segmentos separados. Practica Extend hasta un límite y Join con dos extremos coincidentes.",
    "5) Utiliza Move para desplazar una variante 5 mm en X. Después utiliza Copy para crear otra variante separada.",
    "6) Aplica Rotate de 90° alrededor de un centro identificado. En otra copia de prueba, aplica Scale uniforme con factor 0.5.",
    "7) Compara ORIGINAL y las variantes. Verifica qué operación recorta, divide, prolonga, une, desplaza, duplica, gira o cambia el tamaño. Guarda como Sesion_04_Edicion_Curvas.3dm."
  ]},
  { titulo: "8. Verificación y criterios de dominio", bloques: [
    "Explica la diferencia entre Fillet, Chamfer y Offset; describe cuándo utilizar Trim, Split, Extend y Join; e identifica el punto base y destino de Move.",
    "Verifica que puedes distinguir una copia de un desplazamiento, indicar el centro y ángulo de Rotate y explicar qué ocurre al aplicar Scale uniforme con factor 2 o 0.5.",
    "La práctica se considera completada cuando conservas el perfil ORIGINAL, identificas las variantes, corriges y organizas los segmentos sin perder geometría necesaria y verificas las medidas finales.",
    "Recuerda: esta sesión trabaja con edición de curvas y transformaciones. En la siguiente sesión profundizaremos en curvas avanzadas, puntos de control y optimización de perfiles."
  ]}
] as const;

const LECTURA_SESION_5 = [
  { titulo: "1. Objetivo: curvas NURBS aplicadas a joyería", bloques: [
    "En esta sesión aprenderás a construir, controlar y evaluar curvas NURBS para desarrollar perfiles precisos y expresivos. En Rhino, una curva NURBS se define matemáticamente mediante puntos de control, grado, nodos y pesos; estos elementos determinan cómo se comporta y qué tan fácil resulta editarla.",
    "En joyería, las curvas sirven para crear siluetas de colgantes, perfiles de anillos, líneas ornamentales y trayectorias que después pueden utilizarse para generar superficies o sólidos. Una curva visualmente atractiva también debe ser técnicamente controlable.",
    "Al finalizar podrás crear curvas libres, editar sus puntos, reconstruirlas con Rebuild, interpretar su continuidad mediante CurvatureGraph y revisar su limpieza antes de reutilizarlas.",
    "Distribución de las 2 horas: creación (20 min), puntos de control (20 min), reconstrucción (20 min), continuidad (20 min), optimización (20 min) y reto integrador (20 min)."
  ]},
  { titulo: "2. Creación de curvas libres: Curve e InterpCrv", bloques: [
    "El comando Curve crea una curva NURBS a partir de puntos de control que orientan su forma. No es necesario que la curva pase exactamente por cada punto de control: estos gobiernan la forma desde una estructura de control.",
    "InterpCrv crea una curva interpolada que pasa por los puntos que marcas. Es útil cuando necesitas que el recorrido atraviese posiciones concretas, por ejemplo, puntos de una silueta dibujada como referencia.",
    "La diferencia es importante: con Curve controlas la forma mediante una red de puntos de control; con InterpCrv defines puntos por los que debe pasar la curva. Elige según la intención del diseño y evita colocar puntos de más.",
    "Práctica Rhino: dibuja dos perfiles similares, uno con Curve y otro con InterpCrv. Compara dónde pasa cada curva, cuántos puntos requiere y qué tan fácil resulta ajustar su silueta."
  ]},
  { titulo: "3. Puntos de control: edición consciente de la forma", bloques: [
    "Los puntos de control permiten modificar una curva NURBS sin redibujarla. En Rhino, PointsOn (F10) muestra los puntos editables y PointsOff (F11) los oculta. Selecciona un punto y desplázalo para observar cómo cambia la curva.",
    "La influencia de cada punto depende de la estructura matemática de la curva. Un movimiento pequeño puede afectar una zona amplia; por eso conviene trabajar con desplazamientos graduales y revisar el resultado desde más de una vista.",
    "No confundas puntos de control con puntos de interpolación. Los primeros gobiernan la forma y, en general, la curva no tiene que pasar por ellos; los segundos son posiciones por las que una curva interpolada sí debe pasar.",
    "Conserva una copia del perfil original antes de editar. En una pieza de joyería, una deformación pequeña puede alterar la simetría, el espacio para una piedra o el espesor que se construirá posteriormente."
  ]},
  { titulo: "4. Reconstrucción de curvas: Rebuild, grado y cantidad de puntos", bloques: [
    "Rebuild permite reconstruir una curva con un grado y una cantidad de puntos de control definidos. Es una herramienta para reorganizar su estructura y facilitar la edición, no un botón que garantice automáticamente una curva mejor.",
    "El grado describe el orden matemático de la curva y afecta su flexibilidad. La cantidad de puntos determina cuántos controles estarán disponibles para modificarla. Aumentar puntos no significa necesariamente ganar calidad: demasiados controles pueden producir ajustes difíciles y ondulaciones.",
    "Al reconstruir, compara siempre la curva resultante con la original. Revisa la desviación de la silueta, los extremos y las zonas críticas del diseño. Si la reconstrucción altera una dimensión o una transición importante, deshazla o ajusta los parámetros.",
    "Práctica Rhino: duplica una curva, ejecuta Rebuild sobre la copia y prueba distintas cantidades de puntos manteniendo constante el grado. Compara facilidad de edición y diferencia respecto al perfil original."
  ]},
  { titulo: "5. Continuidad y suavidad: lectura de la curvatura", bloques: [
    "La continuidad describe cómo se conectan dos tramos. G0 indica que se encuentran; G1 que comparten dirección tangente; G2 que además mantienen una transición de curvatura compatible. Una unión visualmente cerrada no garantiza por sí sola una transición suave.",
    "CurvatureGraph muestra gráficamente cómo varía la curvatura a lo largo de una curva. Cambios bruscos, picos o interrupciones en el gráfico pueden revelar zonas que conviene revisar. Interpreta el gráfico junto con la silueta y la función de la pieza.",
    "En joyería, una transición irregular puede hacerse visible en reflejos, en el perfil de una montura o al generar una superficie. La suavidad debe responder al diseño: no todas las piezas necesitan continuidad G2, pero sí debes reconocer cuándo una transición resulta inadecuada.",
    "Práctica Rhino: activa CurvatureGraph en una curva y modifica uno o dos puntos de control. Observa cómo cambia el gráfico y relaciona sus variaciones con la forma que ves en pantalla."
  ]},
  { titulo: "6. Limpieza y optimización de perfiles", bloques: [
    "Un perfil limpio tiene una estructura comprensible, sin tramos duplicados, puntos innecesarios ni pequeñas ondulaciones accidentales. La optimización consiste en conservar la intención del diseño con una geometría que pueda editarse y reutilizarse.",
    "Comprueba si la curva debe ser abierta o cerrada. Si debe cerrar un contorno, revisa que sus extremos coincidan y que la unión no genere un quiebre. Si debe permanecer abierta, identifica claramente sus extremos y evita cierres accidentales.",
    "Revisa duplicados, segmentos cortos, autointersecciones y cambios de dirección no deseados. No unas curvas solo porque sus extremos parecen tocarse: verifica la tolerancia y la continuidad que necesita la operación posterior.",
    "La limpieza del perfil no sustituye la validación de espesores, sólidos ni tolerancias de fabricación. Es una revisión previa para que las operaciones posteriores partan de curvas ordenadas."
  ]},
  { titulo: "7. Aplicación en joyería: diseñar un perfil orgánico", bloques: [
    "Diseña el contorno lateral de un elemento decorativo para un colgante. Comienza con una silueta sencilla y define qué zonas deben ser suaves, dónde se requiere una transición más marcada y qué proporción debe conservarse.",
    "Crea una versión con Curve y otra con InterpCrv si necesitas comparar el control de la forma. Conserva el perfil que mejor responda al diseño y guarda una copia antes de reconstruir o editar.",
    "Utiliza PointsOn para ajustar la silueta, Rebuild para probar una estructura de control más sencilla y CurvatureGraph para detectar variaciones bruscas. Revisa el resultado en Top y Perspective.",
    "Nombra y organiza las versiones: PERFIL_ORIGINAL, PERFIL_AJUSTADO y PERFIL_FINAL. Así podrás comparar decisiones sin perder la geometría inicial."
  ]},
  { titulo: "8. Reto integrador: perfil orgánico controlado", bloques: [
    "Construye un perfil orgánico destinado a un colgante. Debe tener una silueta intencional, una estructura de control manejable y una condición abierta o cerrada coherente con su función.",
    "Completa la secuencia: crea la curva; modifica puntos de control; reconstruye una copia con Rebuild; inspecciona su continuidad con CurvatureGraph; y limpia el perfil final.",
    "Compara la versión inicial y la final. Explica qué cambió, por qué elegiste esa cantidad de puntos y qué observaste en el gráfico de curvatura. No ocultes desviaciones importantes respecto al diseño original.",
    "Criterios de dominio: curva creada correctamente, edición controlada, reconstrucción comparada con el original, continuidad revisada y archivo organizado con versiones identificables. Guarda como Sesion_05_Curvas_NURBS.3dm."
  ]}
] as const;

const LECTURA_SESION_6 = [
  { titulo: "1. Objetivo: modelado de sólidos para joyería", bloques: [
    "En esta sesión aprenderás a convertir perfiles y superficies en volúmenes tridimensionales. Un sólido cerrado representa un volumen delimitado por una envolvente continua; es una base esencial para desarrollar cuerpos de anillos y componentes de joyería.",
    "Al finalizar podrás diferenciar curvas, superficies y polisuperficies cerradas; reconocer las condiciones que necesita un perfil para extruirse como sólido; controlar una revolución mediante su eje y ángulo; y comprobar si el resultado está cerrado.",
    "Antes de comenzar, configura el documento en milímetros, revisa la tolerancia absoluta indicada por el docente y conserva copias de los perfiles originales. Trabaja de forma progresiva: perfil → operación → inspección → archivo."
  ]},
  { titulo: "2. Extrusiones: del perfil al volumen", bloques: [
    "La extrusión desplaza una curva o superficie a lo largo de una dirección y una distancia. En una extrusión recta, la altura define cuánto se prolonga el perfil; la dirección determina hacia dónde se genera el volumen.",
    "Para obtener una polisuperficie cerrada mediante ExtrudeCrv, el perfil debe ser una curva cerrada y plana y la opción Solid debe estar activada. Si la curva está abierta o no es plana, Rhino puede crear una extrusión abierta. La apariencia sombreada no demuestra que esté cerrada.",
    "Flujo de práctica en Rhino 7: selecciona una curva cerrada y plana; ejecuta ExtrudeCrv; revisa Solid=Yes y DeleteInput=No para conservar el perfil; introduce una altura; confirma y revisa el resultado en Perspective y en las vistas ortogonales.",
    "Compara una curva cerrada con una abierta. Observa qué extremos quedan sin tapar y por qué. Si la extrusión no se cierra, revisa primero si el perfil está cerrado y es plano; no intentes resolverlo aumentando la altura."
  ]},
  { titulo: "3. Revoluciones: construir alrededor de un eje", bloques: [
    "Revolve genera una superficie al girar un perfil alrededor de un eje. La forma final depende de la sección utilizada, de la ubicación y dirección del eje y del ángulo de revolución.",
    "Para practicar, selecciona el perfil adecuado, indica el punto inicial y final del eje y define el ángulo. Una revolución completa utiliza 360°. Una revolución parcial deja una abertura angular y no debe confundirse automáticamente con un sólido cerrado.",
    "En piezas de simetría radial, el eje debe corresponder al centro de giro previsto. Si está desplazado o inclinado de forma incorrecta, la pieza resultará descentrada o tendrá una forma distinta a la intención del diseño.",
    "Después de ejecutar Revolve, inspecciona el tipo de objeto y sus bordes. Una revolución de superficie no equivale necesariamente a un sólido; evalúa si la geometría necesita tapas u operaciones adicionales."
  ]},
  { titulo: "4. Construcción de un anillo básico", bloques: [
    "Un anillo de revolución se estudia a partir de una sección transversal y un eje central. La sección determina el ancho y el espesor del aro; la distancia entre el eje y el perfil influye en el diámetro interior y en la proporción general.",
    "Prepara una sección cerrada y adecuada, ubícala respecto al eje de revolución y comprueba que no lo atraviese de forma accidental. Conserva una copia de la sección antes de ejecutar la operación.",
    "Construye el volumen con una revolución completa y revisa el resultado desde Top, Front, Right y Perspective. Comprueba el diámetro interior y la sección con las herramientas de medición de Rhino; no deduzcas medidas exactas solo por la vista sombreada.",
    "El laboratorio Ring Volume Studio permite variar dimensiones y observar su efecto conceptual. Sus controles no calculan tallas comerciales, peso, tolerancias ni condiciones de fabricación: esos datos requieren un diseño y una validación específicos."
  ]},
  { titulo: "5. Revisión: ¿es realmente un sólido cerrado?", bloques: [
    "En Rhino, una polisuperficie que encierra completamente un volumen se considera un sólido cerrado. Si quedan bordes desnudos (naked edges), la envolvente está abierta y no define un volumen cerrado.",
    "Utiliza What o Propiedades para consultar el tipo de objeto. Ejecuta ShowEdges y activa Naked edges para localizar bordes abiertos. Revisa también si hay superficies o piezas separadas que solo parecen tocarse desde el ángulo de cámara.",
    "Si una extrusión no se cierra, revisa que la curva de entrada esté cerrada y sea plana. Si una tapa no se puede crear, inspecciona el contorno y la planaridad antes de probar otra operación. Join solo une bordes compatibles dentro de la tolerancia; no repara automáticamente huecos grandes.",
    "Distingue tres situaciones: sólido cerrado, superficie o polisuperficie abierta y componentes desconectados. Cada una requiere un diagnóstico distinto. Conserva una copia antes de reparar geometría."
  ]},
  { titulo: "6. Práctica guiada: volumen básico de joyería", bloques: [
    "Parte de un perfil preparado en milímetros. Guarda una copia del archivo y organiza las curvas de construcción en una capa identificable. No elimines el perfil original.",
    "Ejercicio A — Extrusión: selecciona un perfil cerrado y plano; extrúyelo 8 mm con Solid=Yes; conserva la curva de entrada y verifica el resultado con What y ShowEdges.",
    "Ejercicio B — Revolución: prepara una sección sencilla para un cuerpo radial; define el eje con dos puntos; realiza una revolución de 360° y revisa el tipo de objeto y sus bordes.",
    "Ejercicio C — Anillo: construye un aro básico mediante una sección y un eje central. Comprueba diámetro interior, ancho y espesor con herramientas de medición; registra las dimensiones verificadas.",
    "Ejercicio D — Diagnóstico: inspecciona cada resultado. Identifica si está cerrado, si presenta bordes desnudos o si contiene componentes desconectados. Explica qué comprobación utilizaste para llegar a esa conclusión.",
    "Guarda el archivo como Sesion_06_Modelado_Solidos.3dm. Incluye el perfil de construcción, el volumen final y una breve nota que indique qué operación utilizaste y cómo verificaste el cierre."
  ]},
  { titulo: "7. Verificación y criterios de logro", bloques: [
    "Diferencia una curva, una superficie y una polisuperficie cerrada. Explica qué condiciones necesita un perfil para generar una extrusión sólida y por qué una extrusión abierta no debe considerarse un volumen cerrado.",
    "Identifica el eje y el ángulo de una revolución; explica por qué una vuelta completa y una parcial pueden producir resultados distintos; y reconoce la relación entre sección, eje y diámetro interior de un anillo.",
    "La práctica se considera completada cuando entregas el archivo editable, conservas los perfiles de origen, verificas las dimensiones solicitadas y documentas el resultado de What o ShowEdges. La simulación de FADILAB acompaña el aprendizaje, pero no sustituye la inspección del modelo real en Rhino."
  ]}
] as const;

const LECTURA_SESION_7 = [
  { titulo: "1. Objetivo: creación y edición de superficies", bloques: [
    "En esta sesión trabajarás con superficies para construir formas que no siempre pueden resolverse de manera directa mediante sólidos básicos. Las superficies permiten controlar con mayor libertad la transición y continuidad de una forma.",
    "El objetivo es comprender cómo se generan superficies a partir de curvas guía y cómo se aplican estas operaciones a formas orgánicas simples utilizadas en joyería."
  ]},
  { titulo: "2. Preparación de curvas guía", bloques: [
    "Antes de crear una superficie, organiza las curvas que definirán su forma. Revisa su posición, dirección y continuidad, y asegúrate de que las curvas de referencia estén correctamente ubicadas.",
    "Una curva guía desordenada o mal orientada puede provocar resultados inesperados. Trabaja con nombres y capas claros para distinguir perfiles, secciones y carriles."
  ]},
  { titulo: "3. Barridos", bloques: [
    "Los barridos generan una superficie al desplazar una o varias curvas de sección a lo largo de una curva o carril. Esta operación permite construir formas alargadas y secciones variables.",
    "Practica identificando el perfil que define la sección y la curva que controla el recorrido. Observa cómo la orientación y la posición de las secciones afectan al resultado."
  ]},
  { titulo: "4. Revolución por carril", bloques: [
    "La revolución por carril utiliza una curva de perfil y una trayectoria que controla el recorrido de la forma. Es una alternativa para crear geometrías que siguen una guía y no necesariamente giran alrededor de un eje recto.",
    "Revisa la relación entre perfil y carril antes de ejecutar la operación. Si el resultado se tuerce o cambia de escala, comprueba la ubicación y orientación de las curvas utilizadas."
  ]},
  { titulo: "5. Modelado de formas orgánicas simples", bloques: [
    "Aplica las operaciones de superficie para desarrollar una forma orgánica sencilla, como un elemento curvo o decorativo. Mantén una geometría controlada y evita añadir complejidad que no aporte al diseño.",
    "Observa la continuidad visual de la superficie y comprueba que no existan pliegues o deformaciones no deseadas. El modelo debe ser comprensible y editable."
  ]},
  { titulo: "6. Práctica guiada: superficie para una pieza", bloques: [
    "Construye una superficie sencilla utilizando curvas guía y una operación de barrido o revolución por carril. Explica qué curvas cumplen la función de perfil y cuáles controlan el recorrido.",
    "Guarda el archivo con las curvas de construcción organizadas en capas y la superficie resultante claramente identificada."
  ]}
] as const;

const LECTURA_SESION_8 = [
  { titulo: "1. Objetivo: preparar modelos para fabricación", bloques: [
    "En esta sesión revisarás un modelo tridimensional con criterios de preparación para fabricación. Un diseño que se ve correcto en pantalla todavía puede contener errores geométricos que dificulten su producción.",
    "Trabajaremos con validación de sólidos, detección y reparación de geometrías, y revisión de espesores y detalles. La prioridad es identificar problemas antes de exportar o enviar el modelo a producción."
  ]},
  { titulo: "2. Validación de sólidos", bloques: [
    "Comprueba que las piezas destinadas a fabricación sean volúmenes cerrados cuando el proceso lo requiera. Identifica bordes desnudos, superficies abiertas, objetos duplicados y elementos que no formen parte del diseño final.",
    "Utiliza las herramientas de análisis de Rhino para inspeccionar el objeto y no te limites a su apariencia exterior. Conserva una copia del archivo antes de realizar reparaciones."
  ]},
  { titulo: "3. Detección de problemas geométricos", bloques: [
    "Revisa si existen superficies solapadas, piezas desconectadas, curvas duplicadas o intersecciones que puedan generar resultados inesperados. Comprueba también que las partes que deben unirse tengan contacto geométrico correcto.",
    "Distingue entre un problema visual y un error real de geometría. Analiza cada caso antes de modificar el modelo para evitar alterar dimensiones o proporciones necesarias."
  ]},
  { titulo: "4. Reparación y limpieza", bloques: [
    "Cuando detectes una geometría defectuosa, identifica primero qué elemento la produce. Según el caso, puede ser necesario reconstruir una curva, cerrar una abertura, unir superficies compatibles o eliminar elementos duplicados.",
    "Realiza las correcciones de manera progresiva y vuelve a validar el objeto después de cada cambio. No apliques reparaciones automáticas sin comprobar qué modifican."
  ]},
  { titulo: "5. Revisión de espesores y detalles", bloques: [
    "Evalúa los espesores de las zonas principales y de los detalles pequeños. Las secciones demasiado delgadas o los elementos muy finos pueden ser difíciles de fabricar y pueden no reproducirse correctamente en el proceso elegido.",
    "Revisa uniones, puntas, relieves y espacios internos. La viabilidad depende del material, la tecnología y los parámetros del fabricante, por lo que las medidas deben contrastarse con sus especificaciones."
  ]},
  { titulo: "6. Práctica guiada: control de un modelo", bloques: [
    "Selecciona una pieza de joyería y realiza una revisión ordenada: valida su condición de sólido, inspecciona posibles defectos y comprueba espesores y detalles relevantes.",
    "Entrega el archivo revisado junto con una breve lista de los problemas encontrados y las correcciones realizadas. Si un problema no puede resolverse con seguridad, déjalo documentado."
  ]}
] as const;

const LECTURA_SESION_9 = [
  { titulo: "1. Objetivo: exportación y presentación del diseño", bloques: [
    "En esta sesión prepararás un modelo para exportarlo en formato STL, conocerás los aspectos básicos del prototipado en resina y tendrás una introducción al renderizado de joyas para presentación.",
    "Se trabajará con dos objetivos diferentes: conservar una geometría adecuada para fabricación y generar una visualización clara del diseño. Un archivo de fabricación y una imagen de presentación no cumplen la misma función."
  ]},
  { titulo: "2. Preparación y exportación STL", bloques: [
    "Antes de exportar, revisa las unidades, la escala, la orientación y la condición geométrica del modelo. Comprueba que solo estén seleccionados los objetos que forman parte de la pieza final.",
    "Al guardar como STL, revisa las opciones de malla y la tolerancia de exportación. Una malla demasiado gruesa puede perder detalles; una excesivamente densa puede aumentar el tamaño del archivo sin aportar una mejora útil."
  ]},
  { titulo: "3. Comprobación del archivo exportado", bloques: [
    "Vuelve a abrir o inspeccionar el STL exportado para comprobar que conserva la escala y la forma esperadas. Revisa especialmente detalles pequeños, superficies curvas y zonas de unión.",
    "No des por válida la exportación únicamente porque el archivo se haya creado. La verificación posterior permite detectar errores de selección, escala o triangulación."
  ]},
  { titulo: "4. Introducción al prototipado en resina", bloques: [
    "El prototipado en resina permite obtener una representación física del modelo digital mediante impresión 3D. El resultado depende de la tecnología, la resina, la orientación, los soportes y los parámetros de exposición y curado.",
    "Conoce el flujo general desde el archivo STL hasta el laminado y la impresión. Los parámetros concretos deben ajustarse a la impresora y a la ficha técnica de la resina utilizada."
  ]},
  { titulo: "5. Introducción al renderizado de joyas", bloques: [
    "El renderizado permite comunicar la apariencia del diseño mediante materiales, iluminación, entorno y encuadre. Su propósito es presentar la pieza con claridad y estudiar visualmente sus acabados antes de fabricar.",
    "Diferencia la visualización de la validación geométrica: una imagen atractiva no demuestra que el modelo esté listo para producción. Mantén el archivo CAD como referencia del diseño."
  ]},
  { titulo: "6. Uso de Aurum Render", bloques: [
    "Utiliza Aurum Render para visualizar el diseño y explorar la presentación de materiales y piedras. Selecciona una vista que permita reconocer la forma general y los detalles relevantes de la joya.",
    "Guarda la imagen de presentación por separado del archivo de fabricación. Conserva el modelo editable y el STL verificado como entregables distintos."
  ]}
] as const;

const LECTURA_SESION_10 = [
  { titulo: "1. Objetivo: desarrollar y presentar el proyecto final", bloques: [
    "Esta sesión integra los conocimientos trabajados durante el curso mediante el desarrollo o la revisión de una pieza de joyería. El proyecto debe mostrar un proceso ordenado desde la geometría inicial hasta la preparación y presentación del modelo.",
    "El docente revisará la construcción, la organización del archivo, la calidad geométrica y la claridad de la presentación. Se valorará que puedas explicar las decisiones y herramientas utilizadas."
  ]},
  { titulo: "2. Desarrollo del proyecto", bloques: [
    "Define la pieza que vas a presentar y organiza sus componentes en capas. Revisa las dimensiones principales y utiliza curvas, sólidos o superficies según las necesidades de la forma.",
    "Construye el modelo de manera progresiva, conservando versiones o copias de seguridad en los hitos importantes. Evita añadir detalles que no puedas controlar o justificar."
  ]},
  { titulo: "3. Revisión del modelo", bloques: [
    "Inspecciona el modelo desde distintas vistas y comprueba proporciones, uniones, continuidad y detalles. Verifica que los elementos estén correctamente organizados y que no existan objetos sobrantes o duplicados.",
    "Aplica los criterios de validación y revisión de espesores trabajados en la sesión 8. Registra los aspectos que hayas corregido y aquellos que requieran una revisión posterior."
  ]},
  { titulo: "4. Preparación para fabricación", bloques: [
    "Determina qué archivo corresponde al modelo editable y cuál se utilizará para fabricación. Si el proyecto requiere STL, exporta con las unidades y opciones adecuadas y comprueba el archivo resultante.",
    "La preparación final debe considerar las limitaciones del proceso de fabricación elegido. No supongas que todos los detalles son producibles sin contrastarlos con los requisitos técnicos correspondientes."
  ]},
  { titulo: "5. Presentación del diseño", bloques: [
    "Prepara vistas que expliquen la pieza con claridad y, cuando corresponda, una visualización mediante Aurum Render. Muestra la forma general y los detalles que aportan valor al diseño.",
    "Organiza los archivos con nombres claros e incluye los entregables solicitados por el docente. La presentación debe permitir identificar el modelo final sin confundirlo con pruebas o versiones anteriores."
  ]},
  { titulo: "6. Evaluación y cierre", bloques: [
    "Presenta el proyecto y explica brevemente el proceso de construcción, las herramientas principales, las revisiones realizadas y la preparación para fabricación.",
    "La evaluación considerará el cumplimiento del objetivo, la organización del archivo, la calidad del modelo, la revisión técnica y la presentación. Utiliza las observaciones del docente para identificar los siguientes pasos de mejora."
  ]}
] as const;

const COMPONENTES_INTERFAZ = [
  ["Ribbon de MatrixGold", "Franja superior con pestañas que agrupan herramientas y funciones por categorías.", "En la primera franja de pestañas de MatrixGold: donde aparecen Curve, Surface, Solid, Tools, Gems y otras categorías.", "Organiza las herramientas especializadas de joyería en grupos para encontrarlas por tipo de tarea."],
  ["Barras de herramientas", "Conjuntos de iconos para acceder directamente a comandos.", "Debajo de las pestañas principales y en las filas de iconos.", "Permiten ejecutar herramientas frecuentes con un clic, sin escribir el nombre del comando."],
  ["Área gráfica", "Espacio central donde se visualiza el modelo y se trabaja con el archivo.", "Es la zona central de la ventana, donde aparece la cuadrícula o el modelo 3D.", "Es el espacio de trabajo para observar, construir y editar la geometría."],
  ["Títulos de las vistas", "Cada vista de Rhino muestra su nombre en la esquina superior izquierda, por ejemplo: Perspective, Top, Front o Right.", "En la esquina superior izquierda de cada ventana de visualización; en la captura se señala el título Perspective.", "Permiten activar una vista con un clic, maximizarla o restaurar su tamaño con doble clic y abrir sus opciones con clic derecho o con la flecha del título."],
  ["Quick Commands", "Panel de accesos rápidos a herramientas frecuentes de MatrixGold.", "Panel lateral izquierdo, en la parte superior de la captura.", "Reúne accesos directos a comandos utilizados con frecuencia."],
  ["Panel de propiedades", "Muestra información del objeto seleccionado, como tipo, capa, material y peso.", "Panel lateral izquierdo, debajo de Quick Commands.", "Permite consultar características del objeto activo o seleccionado."],
  ["Panel de capas (Layers)", "Organiza los elementos del proyecto por capas. En esta sesión solo lo reconoceremos.", "En la zona inferior del lateral izquierdo, bajo el panel de propiedades.", "Ayuda a organizar y controlar la visibilidad de los elementos de un proyecto."],
  ["Paneles dinámicos", "Agrupan herramientas y funciones contextuales o especializadas.", "En la columna lateral derecha de la interfaz.", "Ofrecen paneles que cambian según las herramientas y funciones disponibles en MatrixGold."],
  ["Línea y ventana de comandos", "Permiten escribir comandos y consultar las indicaciones, opciones, mensajes e historial de Rhino.", "En la zona inferior del área gráfica: el campo Command está abajo y, justo encima, aparecen las indicaciones y el historial de comandos.", "La línea de comandos sirve para introducir instrucciones; la ventana o área de historial permite seguir las respuestas, opciones y mensajes que Rhino muestra durante el trabajo."],
  ["Barra de estado", "Muestra coordenadas, unidades y ayudas de modelado activas.", "Franja inferior de la interfaz, debajo de la línea de comandos.", "Informa sobre coordenadas del cursor, unidades del documento y ayudas como Grid Snap, Ortho y Osnap."],
  ["Modos de visualización", "Accesos visuales para cambiar la apariencia con la que se muestra el modelo en el área gráfica.", "En la columna vertical de miniaturas situada junto al panel de capas (Layers), a su derecha.", "Permiten alternar entre distintas representaciones visuales del modelo para observar su forma y apariencia durante el trabajo."],
  ["Comandos recientes", "Panel que reúne accesos a los comandos utilizados recientemente.", "En la parte superior de la columna lateral derecha, en el panel titulado Recent Commands.", "Permite volver a localizar y ejecutar comandos usados hace poco sin tener que buscarlos nuevamente."],
  ["Fichas de las vistas", "Pestañas con los nombres de las vistas, como Perspective, Top, Front y Right. La ficha resaltada indica cuál está activa.", "En la franja inferior del área gráfica, donde aparecen las fichas Perspective, Top, Front y Right.", "Facilitan cambiar entre vistas, especialmente cuando se utilizan vistas maximizadas o flotantes."],
  ["Peso de metal (Metal Weights)", "Panel de MatrixGold que calcula el peso del metal de los materiales seleccionados o del conjunto indicado.", "En el panel lateral derecho, hacia la parte inferior, identificado como Metal Weights.", "Permite seleccionar si el cálculo considera los materiales seleccionados, elegir la unidad de peso —por ejemplo, gramos— y ejecutar Calculate para obtener el peso."]
] as const;

const COORDENADAS_INTERFAZ = [
  { x: "50%", y: "5%" }, { x: "35%", y: "13%" }, { x: "51%", y: "52%" },
  { x: "18%", y: "18%" }, { x: "6%", y: "19%" }, { x: "6%", y: "39%" },
  { x: "6%", y: "67%" }, { x: "94%", y: "47%" }, { x: "40%", y: "93%" },
  { x: "48%", y: "96%" }, { x: "11%", y: "67%" }, { x: "87%", y: "18%" },
  { x: "14%", y: "83%" }, { x: "87%", y: "82%" }
] as const;

function AulaFormacionPage() {
  const { data: sesion, isLoading: cargandoSesion } = useSesion();
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState("Rhino para Joyería · Nivel 1");
  const [descripcion, setDescripcion] = useState("Formación presencial de modelado 3D para joyería.");
  const [duracion, setDuracion] = useState("20");
  const [cursoSeleccionado, setCursoSeleccionado] = useState("");
  const [seccionDocente, setSeccionDocente] = useState("cursos");
  const [panelAlumnoActivo, setPanelAlumnoActivo] = useState<"sesiones" | "materiales" | "evaluaciones">("sesiones");
  const [panelCursoActivo, setPanelCursoActivo] = useState<{ inscripcionId: string; panel: "sesiones" | "biblioteca" | "evaluaciones" } | null>(null);
  const [cursoEditandoId, setCursoEditandoId] = useState("");
  const [tituloCursoEditado, setTituloCursoEditado] = useState("");
  const [nombreAlumno, setNombreAlumno] = useState("");
  const [emailAlumno, setEmailAlumno] = useState("");
  const [tallerAlumnoFiltro, setTallerAlumnoFiltro] = useState("todos");
  const [busquedaAlumno, setBusquedaAlumno] = useState("");
  const [alumnosSeleccionados, setAlumnosSeleccionados] = useState<string[]>([]);
  const listarDirectorio = useServerFn(listarDirectorioAlumnosFormacion);
  const matricularAlumnos = useServerFn(matricularAlumnosFormacion);
  const listarInscripcionesAlumno = useServerFn(listarInscripcionesAlumnoFormacion);
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
  const [seccionesLecturaActivas, setSeccionesLecturaActivas] = useState<Array<{titulo:string;bloques:string[]}>>(LECTURA_SESION_1.map(x => ({ titulo:x.titulo, bloques:[...x.bloques] })));
  const [imagenInterfazUrl, setImagenInterfazUrl] = useState("");
  const [imagenInterfazError, setImagenInterfazError] = useState("");
  const [imagenLayersUrl, setImagenLayersUrl] = useState("");
  const [imagenLayersError, setImagenLayersError] = useState("");
  const [imagenRhinoUrl, setImagenRhinoUrl] = useState("");
  const [imagenRhinoError, setImagenRhinoError] = useState("");
  const [imagenesVistasUrl, setImagenesVistasUrl] = useState("");
  const [imagenesEjesUrl, setImagenesEjesUrl] = useState("");
  const [imagenProceso3DUrl, setImagenProceso3DUrl] = useState("");
  const [imagenProceso3DError, setImagenProceso3DError] = useState("");
  const [imagenesVistasPlano, setImagenesVistasPlano] = useState<Record<string,string>>({});
  const [erroresVistasPlano, setErroresVistasPlano] = useState<Record<string,string>>({});
  const [vistaPlanoActiva, setVistaPlanoActiva] = useState("perspectiva");
  const [exploradorVistasAbierto, setExploradorVistasAbierto] = useState(false);
  const [comandosNavegacionAbiertos, setComandosNavegacionAbiertos] = useState(false);
  const [comandoNavegacionActivo, setComandoNavegacionActivo] = useState("Zoom");
  const [retoNavegacionAbierto, setRetoNavegacionAbierto] = useState(false);
  const [retoNavPaso, setRetoNavPaso] = useState(0);
  const [retoNavZoom, setRetoNavZoom] = useState(1);
  const [retoNavPan, setRetoNavPan] = useState({ x: 0, y: 0 });
  const [retoNavOrbit, setRetoNavOrbit] = useState(0);
  const [retoNavVistaActiva, setRetoNavVistaActiva] = useState("Perspective");
  const [retoNavVistaMaximizada, setRetoNavVistaMaximizada] = useState<string | null>(null);
  const [retoNavMaxClicks, setRetoNavMaxClicks] = useState(0);
  const [retoNavComando, setRetoNavComando] = useState("");
  const [retoNavMensaje, setRetoNavMensaje] = useState("Selecciona «Iniciar laboratorio» y sigue las instrucciones para manipular las vistas.");
  const retoNavDragRef = useRef<{ x: number; y: number; vista: string; shift: boolean } | null>(null);
  const [errorImagenesApoyo, setErrorImagenesApoyo] = useState("");
  const [tipoImagenApoyoAbierta, setTipoImagenApoyoAbierta] = useState<"rhinoceros" | "vistas" | "ejes" | "proceso3d" | null>(null);
  const [interfazInteractivaAbierta, setInterfazInteractivaAbierta] = useState(false);
  const [componentesExplorados, setComponentesExplorados] = useState<number[]>([]);
  const [componenteActivo, setComponenteActivo] = useState<number | null>(null);
  const [posicionInfoInterfaz, setPosicionInfoInterfaz] = useState<{ left: number; top: number } | null>(null);
  const interfazImagenRef = useRef<HTMLDivElement | null>(null);
  const interfazInfoRef = useRef<HTMLElement | null>(null);
  const [lecturaPublicada, setLecturaPublicada] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [archivoArrastrando, setArchivoArrastrando] = useState(false);
  const [tituloMaterial, setTituloMaterial] = useState("");
  const [publicarMaterial, setPublicarMaterial] = useState(true);
  const [sesionMaterialId, setSesionMaterialId] = useState("");
  const [materialEditandoId, setMaterialEditandoId] = useState("");
  const [tituloMaterialEditado, setTituloMaterialEditado] = useState("");
  const [sesionMaterialEditada, setSesionMaterialEditada] = useState("");
  const [archivoMaterialReemplazo, setArchivoMaterialReemplazo] = useState<File | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [tituloExamen, setTituloExamen] = useState("Evaluación de la sesión");
  const [instruccionesExamen, setInstruccionesExamen] = useState("");
  const [duracionExamen, setDuracionExamen] = useState("30");
  const [intentosExamen, setIntentosExamen] = useState("1");
  const [aleatorizarPreguntas, setAleatorizarPreguntas] = useState(false);
  const [permitirRetroceso, setPermitirRetroceso] = useState(false);
  const [sesionExamenId, setSesionExamenId] = useState("");
  const [examenSeleccionado, setExamenSeleccionado] = useState("");
  const [examenEditandoId, setExamenEditandoId] = useState("");
  const [preguntasAbiertasExamenId, setPreguntasAbiertasExamenId] = useState("");
  const [examenVistaPreviaId, setExamenVistaPreviaId] = useState("");
  const [preguntaVistaPrevia, setPreguntaVistaPrevia] = useState(0);
  const [respuestasVistaPrevia, setRespuestasVistaPrevia] = useState<Record<string,string>>({});
  const [simulacionFinalizada, setSimulacionFinalizada] = useState(false);
  const [laboratorioPlacaAbierto, setLaboratorioPlacaAbierto] = useState(false);
  const [etapaPlaca, setEtapaPlaca] = useState(0);
  const [respuestaPlaca, setRespuestaPlaca] = useState("");
  const [etapasPlacaCompletadas, setEtapasPlacaCompletadas] = useState<number[]>([]);
  const [metodoPlaca, setMetodoPlaca] = useState<"cartesiano" | "polar">("cartesiano");

  const [tituloExamenEditado, setTituloExamenEditado] = useState("");
  const [instruccionesExamenEditadas, setInstruccionesExamenEditadas] = useState("");
  const [duracionExamenEditada, setDuracionExamenEditada] = useState("20");
  const [intentosExamenEditados, setIntentosExamenEditados] = useState("1");
  const [aleatorizarPreguntasEditado, setAleatorizarPreguntasEditado] = useState(false);
  const [permitirRetrocesoEditado, setPermitirRetrocesoEditado] = useState(false);
  const [sesionExamenEditada, setSesionExamenEditada] = useState("");
  const [disponibleDesdeEditado, setDisponibleDesdeEditado] = useState("");
  const [disponibleHastaEditado, setDisponibleHastaEditado] = useState("");
  const [examenEliminarPendiente, setExamenEliminarPendiente] = useState<Examen | null>(null);
  const [tipoPregunta, setTipoPregunta] = useState<"opcion_multiple" | "verdadero_falso" | "practica">("opcion_multiple");
  const [enunciadoPregunta, setEnunciadoPregunta] = useState("");
  const [opcionesPregunta, setOpcionesPregunta] = useState("Opción A\nOpción B\nOpción C\nOpción D");
  const [respuestaCorrecta, setRespuestaCorrecta] = useState("Opción A");
  const [puntajePregunta, setPuntajePregunta] = useState("1");
  const [examenActivoAlumno, setExamenActivoAlumno] = useState<ExamenAlumno | null>(null);
  const [examenPendienteInicio, setExamenPendienteInicio] = useState<{ examen: Examen; reanudar: boolean } | null>(null);
  const [errorInicioExamen, setErrorInicioExamen] = useState("");
  const [confirmandoInicioExamen, setConfirmandoInicioExamen] = useState(false);
  const [preguntaActualAlumno, setPreguntaActualAlumno] = useState(0);
  const [respuestasAlumno, setRespuestasAlumno] = useState<Record<string, string>>({});
  const [enviandoExamen, setEnviandoExamen] = useState(false);
  const guardadoExamenPendienteRef = useRef<Promise<void> | null>(null);
  const autosaveExamenTimeoutRef = useRef<number | null>(null);
  const [guardandoSalidaExamen, setGuardandoSalidaExamen] = useState(false);
  const [segundosRestantesExamen, setSegundosRestantesExamen] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [vistaPreviaAlumno, setVistaPreviaAlumno] = useState(false);
  const [modoPanelDocente, setModoPanelDocente] = useState(false);
  const [lecturaAbierta, setLecturaAbierta] = useState<SesionCurso | null>(null);
  const [lecturaModoVistaPrevia, setLecturaModoVistaPrevia] = useState(false);
  const [modoAulaExpandida, setModoAulaExpandida] = useState(false);
  // Al cerrar cualquier lectura (botón Cerrar o finalización), devolver el Aula
  // a su distribución anterior. La apertura de una sesión activa el modo expandido.
  useEffect(() => {
    if (!lecturaAbierta) setModoAulaExpandida(false);
  }, [lecturaAbierta]);

  const [lecturasSimuladas, setLecturasSimuladas] = useState<Set<string>>(new Set());
  const [paginaLectura, setPaginaLectura] = useState(0);
  const [modoCoord3, setModoCoord3] = useState<"absolutas"|"relativas"|"polares">("relativas");
  const [valorCoord3, setValorCoord3] = useState("20");
  const [anguloCoord3, setAnguloCoord3] = useState("0");
  const [puntosCoord3, setPuntosCoord3] = useState<Array<{x:number;y:number}>>([{x:0,y:0}]);
  const [cerradoCoord3, setCerradoCoord3] = useState(false);
  const [estadoCoord3, setEstadoCoord3] = useState("");
  const [laboratorioSesion4Abierto, setLaboratorioSesion4Abierto] = useState(false);
  const [laboratorioPreparacionAbierto, setLaboratorioPreparacionAbierto] = useState(false);
  const [unidadesPreparacion, setUnidadesPreparacion] = useState("Centímetros");
  const [vistaPreparacion, setVistaPreparacion] = useState("Perspectiva");
  const [planoPreparacion, setPlanoPreparacion] = useState("YZ");
  const [validacionPreparacion, setValidacionPreparacion] = useState(false);
  const [laboratorioSesion5Abierto, setLaboratorioSesion5Abierto] = useState(true);

  const [moduloLab4, setModuloLab4] = useState<"fillet"|"offset"|"trim"|"move"|"rotate"|"integrador">("fillet");
  const [radioLab4, setRadioLab4] = useState(2);
  const [distanciaLab4, setDistanciaLab4] = useState(1);
  const [desplazamientoLab4, setDesplazamientoLab4] = useState(5);
  const [anguloLab4, setAnguloLab4] = useState(90);
  const [escalaLab4, setEscalaLab4] = useState(0.5);
  const [copiarLab4, setCopiarLab4] = useState(false);
  const [ladoOffsetLab4, setLadoOffsetLab4] = useState<"interior" | "exterior">("interior");
  const [herramientaCurvasLab4, setHerramientaCurvasLab4] = useState<"trim"|"split"|"extend"|"join">("trim");
  const [pasosIntegradorLab4, setPasosIntegradorLab4] = useState([false, false, false, false, false]);
  const [operacionesVistasLab4, setOperacionesVistasLab4] = useState<string[]>([]);
  const [estadoIntegradorLab4, setEstadoIntegradorLab4] = useState("");
  const [pasoIntegradorLab4, setPasoIntegradorLab4] = useState(0);
  const [laboratorioCoordenadasAbierto, setLaboratorioCoordenadasAbierto] = useState(false);
  const [referenciaPolarCoord3, setReferenciaPolarCoord3] = useState<"origen"|"ultimo">("ultimo");
  useEffect(() => {
    if (lecturaAbierta?.numero !== 3) return;
    if (paginaLectura === 2) setModoCoord3("absolutas");
    else if (paginaLectura === 3) setModoCoord3("relativas");
    else if (paginaLectura === 4) setModoCoord3("polares");
    setEstadoCoord3("");
  }, [lecturaAbierta?.numero, paginaLectura]);
  const [laboratorioOsnapAbierto, setLaboratorioOsnapAbierto] = useState(false);
  const [faseOsnap, setFaseOsnap] = useState<"aprendizaje"|"practica">("aprendizaje");
  const [retoOsnap, setRetoOsnap] = useState(0);
  const [respuestaOsnap, setRespuestaOsnap] = useState<string | null>(null);
  const [aciertosOsnap, setAciertosOsnap] = useState(0);
  const [laboratorioSmartTrackAbierto, setLaboratorioSmartTrackAbierto] = useState(false);
  const [laboratorioRestriccionesAbierto, setLaboratorioRestriccionesAbierto] = useState(false);
  const [faseRestricciones, setFaseRestricciones] = useState<"aprendizaje"|"practica">("aprendizaje");
  const [distanciaRestricciones, setDistanciaRestricciones] = useState("");
  const [anguloRestricciones, setAnguloRestricciones] = useState("");
  const [retoRestricciones, setRetoRestricciones] = useState(0);
  const [validadoRestricciones, setValidadoRestricciones] = useState(false);
  const [aciertosRestricciones, setAciertosRestricciones] = useState(0);
  const [faseSmartTrack, setFaseSmartTrack] = useState<"aprendizaje"|"practica">("aprendizaje");
  const [pasoDemoSmartTrack, setPasoDemoSmartTrack] = useState(0);
  const [retoSmartTrack, setRetoSmartTrack] = useState(0);
  const [respuestaSmartTrack, setRespuestaSmartTrack] = useState<string | null>(null);
  const [aciertosSmartTrack, setAciertosSmartTrack] = useState(0);
  const [moduloGeometria, setModuloGeometria] = useState(0);
  const [respuestaGeometria, setRespuestaGeometria] = useState("");
  const [exploracionGeometria, setExploracionGeometria] = useState("");
  const [aplicacionGeometria, setAplicacionGeometria] = useState("");
  const [resultadoGeometria, setResultadoGeometria] = useState<"correcto" | "incorrecto" | null>(null);
  const [faseLaboratorioGeometria, setFaseLaboratorioGeometria] = useState(0);
  const [modulosGeometriaCompletados, setModulosGeometriaCompletados] = useState<number[]>([]);
  const [laboratorioGeometriaAbierto, setLaboratorioGeometriaAbierto] = useState(false);
  const [guiaComandosAbierta, setGuiaComandosAbierta] = useState(false);
  const [laboratorioCurvasBasicasAbierto, setLaboratorioCurvasBasicasAbierto] = useState(false);

  const [laboratorioCapasAbierto, setLaboratorioCapasAbierto] = useState(false);
  const [capaMetalVisible, setCapaMetalVisible] = useState(true);
  const [capaGemVisible, setCapaGemVisible] = useState(true);
  const [capaMetalBloqueada, setCapaMetalBloqueada] = useState(false);
  const [capaGemBloqueada, setCapaGemBloqueada] = useState(false);
  const [objetoSeleccionadoCapas, setObjetoSeleccionadoCapas] = useState<"aro" | "piedra" | null>(null);
  const [posicionObjetosCapas, setPosicionObjetosCapas] = useState({ aro: { x: 0, y: 0 }, piedra: { x: 0, y: 0 } });
  const arrastreCapasRef = useRef<{ objeto: "aro" | "piedra"; pointerId: number; inicioX: number; inicioY: number; origenX: number; origenY: number } | null>(null);
  const [capaDestinoCapas, setCapaDestinoCapas] = useState<"Metal 01" | "Gem 01">("Metal 01");
  const [capaPrincipalCapas, setCapaPrincipalCapas] = useState("");
  const [mensajeCapaPrincipal, setMensajeCapaPrincipal] = useState("");
  const [solidosColocados, setSolidosColocados] = useState<Array<{id:number;tipo:"cubo"|"esfera"|"cilindro"|"cono"|"toroide";x:number;y:number;color:string;capa:"Metal 01"|"Gem 01"}>>([]);
  const [figurasDisponibles, setFigurasDisponibles] = useState<Array<"cubo"|"esfera"|"cilindro"|"cono"|"toroide">>(["cubo","esfera","cilindro","cono","toroide"]);
  const [solidoSeleccionadoId, setSolidoSeleccionadoId] = useState<number | null>(null);
  const arrastreSolidoRef = useRef<{id:number;pointerId:number;inicioX:number;inicioY:number;origenX:number;origenY:number} | null>(null);
  const [mensajeSolidos, setMensajeSolidos] = useState("");
  const siguienteSolidoId = useRef(1);
  const [asignacionCapas, setAsignacionCapas] = useState<{ aro: string; piedra: string }>({ aro: "", piedra: "" });
  const [retoCapasCompletado, setRetoCapasCompletado] = useState(false);
  const [respuestaRetoCapas, setRespuestaRetoCapas] = useState("");
  const [resultadoRetoCapas, setResultadoRetoCapas] = useState<"correcto" | "incorrecto" | null>(null);
  const [mostrarRetoCapasAlCerrar, setMostrarRetoCapasAlCerrar] = useState(false);


  useEffect(() => {
    if (paginaLectura !== 2) setInterfazInteractivaAbierta(false);
  }, [paginaLectura]);

  useEffect(() => {
    if (!examenActivoAlumno?.intento_id || enviandoExamen || guardandoSalidaExamen) return;
    const respuestas = examenActivoAlumno.preguntas
      .filter(p => Object.prototype.hasOwnProperty.call(respuestasAlumno, p.id))
      .map(p => ({
        pregunta_id: p.id,
        respuesta: p.tipo === "verdadero_falso"
          ? respuestasAlumno[p.id] === "true"
          : (respuestasAlumno[p.id] ?? "")
      }));
    autosaveExamenTimeoutRef.current = window.setTimeout(() => {
      autosaveExamenTimeoutRef.current = null;
      const anterior = guardadoExamenPendienteRef.current ?? Promise.resolve();
      const guardado = anterior.catch(() => undefined).then(async () => {
        const { error } = await (supabase as any).rpc("guardar_respuestas_intento_formacion", {
          _intento_id: examenActivoAlumno.intento_id,
          _respuestas: respuestas,
          _pregunta_actual: preguntaActualAlumno
        });
        if (error) throw error;
      });
      guardadoExamenPendienteRef.current = guardado;
      void guardado
        .catch(() => setMensaje("No se pudo guardar tu respuesta automáticamente. Mantén esta pantalla abierta e inténtalo de nuevo."))
        .finally(() => {
          if (guardadoExamenPendienteRef.current === guardado) guardadoExamenPendienteRef.current = null;
        });
    }, 500);
    return () => {
      if (autosaveExamenTimeoutRef.current !== null) {
        window.clearTimeout(autosaveExamenTimeoutRef.current);
        autosaveExamenTimeoutRef.current = null;
      }
    };
  }, [respuestasAlumno, preguntaActualAlumno, examenActivoAlumno?.intento_id, enviandoExamen, guardandoSalidaExamen]);

  useEffect(() => {
    if (!examenActivoAlumno?.vence_en) { setSegundosRestantesExamen(null); return; }
    const actualizar = () => setSegundosRestantesExamen(Math.max(0, Math.ceil((new Date(examenActivoAlumno.vence_en!).getTime() - Date.now()) / 1000)));
    actualizar();
    const timer = window.setInterval(actualizar, 1000);
    return () => window.clearInterval(timer);
  }, [examenActivoAlumno?.id, examenActivoAlumno?.vence_en]);

  useEffect(() => {
    if (segundosRestantesExamen !== 0 || !examenActivoAlumno || enviandoExamen) return;
    const envio = window.setTimeout(() => void enviarExamenAlumno(), 1500);
    return () => window.clearTimeout(envio);
  }, [segundosRestantesExamen, examenActivoAlumno, enviandoExamen]);

  useEffect(() => {
    if (componenteActivo === null) {
      setPosicionInfoInterfaz(null);
      return;
    }

    const ubicarPanel = () => {
      const contenedor = interfazImagenRef.current;
      const panel = interfazInfoRef.current;
      if (!contenedor || !panel) return;

      const area = contenedor.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const anchoPanel = panelRect.width;
      const altoPanel = panelRect.height;
      const margen = 8;
      const separacion = 10;
      const marcadores = Array.from(contenedor.querySelectorAll<HTMLElement>("[data-interface-marker]"));
      const activo = marcadores.find((marcador) => Number(marcador.dataset["interfaceMarker"]) === componenteActivo);
      if (!activo || anchoPanel <= 0 || altoPanel <= 0) return;

      const activoRect = activo.getBoundingClientRect();
      const centroX = activoRect.left - area.left + activoRect.width / 2;
      const centroY = activoRect.top - area.top + activoRect.height / 2;
      const obstaculos = marcadores.map((marcador) => {
        const rect = marcador.getBoundingClientRect();
        return {
          left: rect.left - area.left - 5,
          right: rect.right - area.left + 5,
          top: rect.top - area.top - 5,
          bottom: rect.bottom - area.top + 5,
        };
      });

      const maxLeft = Math.max(margen, area.width - anchoPanel - margen);
      const maxTop = Math.max(margen, area.height - altoPanel - margen);
      let mejor: { left: number; top: number; distancia: number } | null = null;

      for (let top = margen; top <= maxTop; top += 8) {
        for (let left = margen; left <= maxLeft; left += 8) {
          const right = left + anchoPanel;
          const bottom = top + altoPanel;
          const tapaMarcador = obstaculos.some((obstaculo) =>
            left < obstaculo.right &&
            right > obstaculo.left &&
            top < obstaculo.bottom &&
            bottom > obstaculo.top
          );
          if (tapaMarcador) continue;

          const dx = Math.max(left - centroX, 0, centroX - right);
          const dy = Math.max(top - centroY, 0, centroY - bottom);
          const distancia = Math.hypot(dx, dy);
          if (!mejor || distancia < mejor.distancia) mejor = { left, top, distancia };
        }
      }

      if (mejor) {
        setPosicionInfoInterfaz({ left: mejor.left, top: mejor.top });
      } else {
        // Si el espacio es muy reducido, mantener el panel dentro del marco y no superponer los marcadores.
        setPosicionInfoInterfaz(null);
      }
    };

    ubicarPanel();
    window.addEventListener("resize", ubicarPanel);
    return () => window.removeEventListener("resize", ubicarPanel);
  }, [componenteActivo]);

  const rolAlumno = Boolean(sesion?.roles.some((r) => r === "gerente" || r === "operario"));
  // La autorización la decide la función SQL; el nombre del taller no se utiliza como credencial.
  const permisoDocente = useQuery({
    queryKey: ["aula-formacion-docente-autorizado", sesion?.user.id, (sesion?.participantes ?? []).map(p => p.id).sort().join(",")],
    enabled: Boolean(sesion?.esDueno && sesion?.participantes.length),
    queryFn: async () => {
      for (const participante of sesion!.participantes) {
        const { data, error } = await (supabase as any).rpc("formacion_es_docente", { _participante_id: participante.id });
        if (error) throw error;
        if (data === true) return participante;
      }
      return null;
    },
  });
  const participanteDocente = permisoDocente.data ?? null;
  const esDocente = Boolean(sesion?.esDueno && participanteDocente?.id);
  const participanteId = esDocente ? participanteDocente!.id : null;

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
        .select("id,curso_id,email_alumno,nombre_alumno,alumno_user_id,estado")
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
    const coincideBusqueda = !termino || [alumno.nombre, alumno.usuario, alumno.taller]
      .some((valor) => String(valor ?? "").toLocaleLowerCase().includes(termino));
    return coincideTaller && coincideBusqueda;
  });
  const examenesQuery = useQuery({
    queryKey: ["aula-formacion-examenes-docente", participanteId, cursoActivoId],
    enabled: Boolean(esDocente && participanteId && cursoActivoId),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_examenes").select("id,curso_id,sesion_id,titulo,instrucciones,duracion_minutos,intentos_permitidos,puntaje_maximo,publicado,disponible_desde,disponible_hasta,aleatorizar_preguntas,permitir_retroceso").eq("participante_id", participanteId).eq("curso_id", cursoActivoId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Examen[];
    },
  });
  const examenActivoId = examenSeleccionado || examenesQuery.data?.[0]?.id || "";
  const preguntasQuery = useQuery({
    queryKey: ["aula-formacion-preguntas-docente", examenActivoId],
    enabled: Boolean(esDocente && examenActivoId),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_preguntas").select("id,examen_id,tipo,enunciado,opciones,respuesta_correcta,puntaje,orden,obligatoria").eq("examen_id", examenActivoId).order("orden");
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
        .select("id,curso_id,sesion_id,titulo,descripcion,nombre_archivo,ruta_storage,mime_type,tamano_bytes,created_at,publicado")
        .eq("participante_id", participanteId).eq("curso_id", cursoActivoId)
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
        .select("id,curso_id,numero,titulo,descripcion,duracion_horas,fecha_programada,publicada,bloqueada")
        .eq("curso_id", cursoActivoId).order("numero");
      if (error) throw error;
      return (data ?? []) as SesionCurso[];
    },
  });

  const alumnoQuery = useQuery({
    queryKey: ["aula-formacion-alumno", sesion?.user.id],
    enabled: Boolean(sesion?.user.id && rolAlumno),
    queryFn: async () => {
      const { error: vincularError } = await (supabase as any).rpc("vincular_inscripciones_formacion");
      if (vincularError) throw vincularError;
      return await listarInscripcionesAlumno({ data: {} }) as Inscripcion[];
    },
  });
  const inscripcionesAlumno = alumnoQuery.data ?? [];
  // Si una cuenta tiene ambos permisos, el aula del alumno matriculado es la vista inicial.
  // La gestión docente sigue disponible mediante un cambio explícito de modo.
  const mostrarVistaDocente = esDocente && !vistaPreviaAlumno && (inscripcionesAlumno.length === 0 || modoPanelDocente);
  const inscripcionesVistaAula: Inscripcion[] = vistaPreviaAlumno && cursoActivoId
    ? [{
        id: `simulacion-${cursoActivoId}`,
        curso_id: cursoActivoId,
        email_alumno: "",
        nombre_alumno: null,
        estado: "activo",
        formacion_cursos: cursos.find((curso) => curso.id === cursoActivoId) ?? null,
      }]
    : inscripcionesAlumno;

  // Al entrar al aula, mostrar las sesiones por defecto.
  // Las fichas permanecen visibles como navegación y cambian el panel inferior sin saltar la página.
  useEffect(() => {
    if (inscripcionesVistaAula.length === 0) return;
    setPanelCursoActivo((actual) => {
      if (actual && inscripcionesVistaAula.some((inscripcion) => inscripcion.id === actual.inscripcionId)) return actual;
      return { inscripcionId: inscripcionesVistaAula[0]!.id, panel: "sesiones" };
    });
  }, [inscripcionesVistaAula]);
  const idsCursosAlumno = useMemo(() => [...new Set(inscripcionesAlumno.map((i) => i.curso_id))], [inscripcionesAlumno]);
  const sesionesAlumnoQuery = useQuery({
    queryKey: ["aula-formacion-sesiones-alumno", sesion?.user.id, idsCursosAlumno.join(",")],
    enabled: Boolean(!mostrarVistaDocente && idsCursosAlumno.length),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_sesiones")
        .select("id,curso_id,numero,titulo,descripcion,duracion_horas,fecha_programada,publicada,bloqueada")
        .in("curso_id", idsCursosAlumno).eq("publicada", true).order("numero");
      if (error) throw error;
      return (data ?? []) as SesionCurso[];
    },
  });
  const progresoLecturasQuery = useQuery({
    queryKey: ["aula-formacion-progreso-lecturas", sesion?.user.id, idsCursosAlumno.join(",")],
    enabled: Boolean(!mostrarVistaDocente && sesion?.user.id && idsCursosAlumno.length),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_progreso_lecturas")
        .select("sesion_id,completada_en")
        .eq("alumno_user_id", sesion!.user.id);
      if (error) throw error;
      return (data ?? []) as Array<{ sesion_id: string; completada_en: string }>;
    },
  });
  const sesionesCompletadas = new Set((progresoLecturasQuery.data ?? []).map(item => item.sesion_id));
  const sesionesCompletadasVistaAula = vistaPreviaAlumno ? lecturasSimuladas : sesionesCompletadas;

  const examenesAlumnoQuery = useQuery({
    queryKey: ["aula-formacion-examenes-alumno", sesion?.user.id, idsCursosAlumno.join(",")],
    enabled: Boolean(!mostrarVistaDocente && idsCursosAlumno.length),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_examenes").select("id,curso_id,sesion_id,titulo,instrucciones,duracion_minutos,intentos_permitidos,puntaje_maximo,publicado,disponible_desde,disponible_hasta").in("curso_id", idsCursosAlumno).eq("publicado", true).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Examen[];
    },
  });
  const intentosAlumnoQuery = useQuery({
    queryKey: ["aula-formacion-intentos-alumno", sesion?.user.id],
    enabled: Boolean(!mostrarVistaDocente && sesion?.user.id),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_intentos").select("id,examen_id,numero_intento,calificacion,estado,enviado_en,observaciones_docente").eq("alumno_user_id", sesion!.user.id).order("enviado_en", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Intento[];
    },
  });
  const materialesAlumnoQuery = useQuery({
    queryKey: ["aula-formacion-materiales-alumno", sesion?.user.id, idsCursosAlumno.join(",")],
    enabled: Boolean(!mostrarVistaDocente && idsCursosAlumno.length),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_materiales")
        .select("id,curso_id,sesion_id,titulo,descripcion,nombre_archivo,ruta_storage,mime_type,tamano_bytes,created_at,publicado")
        .in("curso_id", idsCursosAlumno).eq("publicado", true).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Material[];
    },
  });
  // La simulación docente consume los mismos datos publicados y la misma interfaz que el alumno.
  // Solo cambia el origen de datos: no crea matrículas ni registra actividad académica.
  const sesionesVistaAula = vistaPreviaAlumno
    ? (sesionesQuery.data ?? []).filter(item => item.publicada)
    : (sesionesAlumnoQuery.data ?? []);
  const materialesVistaAula = vistaPreviaAlumno
    ? (materialesDocenteQuery.data ?? []).filter(item => item.publicado)
    : (materialesAlumnoQuery.data ?? []);
  const examenesVistaAula = vistaPreviaAlumno
    ? (examenesQuery.data ?? []).filter(item => item.publicado)
    : (examenesAlumnoQuery.data ?? []);
  const intentosVistaAula = vistaPreviaAlumno ? [] : (intentosAlumnoQuery.data ?? []);


  useEffect(() => {
    const materiales = mostrarVistaDocente || vistaPreviaAlumno ? materialesDocenteQuery.data : materialesAlumnoQuery.data;
    let vigente = true;
    setImagenInterfazUrl("");
    setImagenInterfazError("");

    if (!lecturaAbierta || lecturaAbierta.numero !== 1 || !materiales) {
      return () => { vigente = false; };
    }

    const normalizarNombreArchivo = (nombre: string) =>
      nombre.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const esImagen = (material: Material) =>
      /\.(jpg|jpeg|png|webp)$/i.test(material.nombre_archivo.trim()) ||
      /^image\//i.test(material.mime_type || "");
    const esImagenLimpia = (material: Material) => {
      const nombre = normalizarNombreArchivo(material.nombre_archivo);
      return nombre.includes("interface") && nombre.includes("matrixgold") && esImagen(material);
    };
    const esImagenExplicada = (material: Material) =>
      normalizarNombreArchivo(material.nombre_archivo) === "interface.jpg";

    // La experiencia interactiva utiliza exclusivamente la captura limpia.
    // INTERFACE.jpg contiene anotaciones y se conserva como material de consulta.
    const imagen = materiales.find(material =>
      material.sesion_id === lecturaAbierta.id && esImagenLimpia(material) && esImagen(material)
    ) ?? materiales.find(material =>
      esImagenLimpia(material) && esImagen(material)
    );

    if (!imagen) {
      const existeExplicada = materiales.some(material => esImagenExplicada(material));
      setImagenInterfazError(existeExplicada
        ? "Se encontró INTERFACE.jpg, pero la actividad necesita la captura limpia «INTERFACE MATRIXGOLD.PNG». Comprueba que esté publicada en la Biblioteca de este curso."
        : "No se encontró «INTERFACE MATRIXGOLD.PNG» entre los materiales de la Biblioteca de este curso. Comprueba su nombre y que esté publicado.");
      return () => { vigente = false; };
    }

    supabase.storage.from("formacion-academica").createSignedUrl(imagen.ruta_storage, 3600)
      .then(({ data, error }) => {
        if (!vigente) return;
        if (error || !data?.signedUrl) {
          setImagenInterfazError("Se encontró «" + imagen.nombre_archivo + "», pero no se pudo abrir desde el almacenamiento: " + (error?.message || "enlace no disponible"));
          return;
        }
        setImagenInterfazUrl(data.signedUrl);
      })
      .catch((error: unknown) => {
        if (vigente) setImagenInterfazError(error instanceof Error ? error.message : "No se pudo recuperar la imagen del almacenamiento.");
      });

    return () => { vigente = false; };
  }, [lecturaAbierta?.id, lecturaAbierta?.numero, mostrarVistaDocente, vistaPreviaAlumno, materialesDocenteQuery.data, materialesAlumnoQuery.data]);

  useEffect(() => {
    const materiales = mostrarVistaDocente || vistaPreviaAlumno ? materialesDocenteQuery.data : materialesAlumnoQuery.data;
    let vigente = true;
    setImagenLayersUrl("");
    setImagenLayersError("");
    if (!lecturaAbierta || lecturaAbierta.numero !== 2 || !materiales) return () => { vigente = false; };
    const normalizarNombre = (nombre: string) => nombre.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const esImagen = (material: Material) => /\.(jpg|jpeg|png|webp)$/i.test(material.nombre_archivo.trim()) || /^image\//i.test(material.mime_type || "");
    const imagen = materiales.find(material => material.sesion_id === lecturaAbierta.id && normalizarNombre(material.nombre_archivo).includes("matrixgold") && esImagen(material));
    if (!imagen) {
      setImagenLayersError("No se encontró una imagen MatrixGold publicada en los materiales de esta Sesión 2.");
      return () => { vigente = false; };
    }
    supabase.storage.from("formacion-academica").createSignedUrl(imagen.ruta_storage, 3600)
      .then(({ data, error }) => {
        if (!vigente) return;
        if (error || !data?.signedUrl) { setImagenLayersError("Se encontró «" + imagen.nombre_archivo + "», pero no se pudo abrir: " + (error?.message || "enlace no disponible")); return; }
        setImagenLayersUrl(data.signedUrl);
      })
      .catch((error: unknown) => { if (vigente) setImagenLayersError(error instanceof Error ? error.message : "No se pudo recuperar la imagen de MatrixGold."); });
    return () => { vigente = false; };
  }, [lecturaAbierta?.id, lecturaAbierta?.numero, mostrarVistaDocente, vistaPreviaAlumno, materialesDocenteQuery.data, materialesAlumnoQuery.data]);

  useEffect(() => {
    const materiales = mostrarVistaDocente || vistaPreviaAlumno ? materialesDocenteQuery.data : materialesAlumnoQuery.data;
    let vigente = true;
    setImagenRhinoUrl("");
    setImagenRhinoError("");
    setImagenesVistasUrl("");
    setImagenesEjesUrl("");
    setErrorImagenesApoyo("");
    setImagenProceso3DUrl("");
    setImagenProceso3DError("");
    if (!lecturaAbierta || lecturaAbierta.numero !== 1 || !materiales) {
      return () => { vigente = false; };
    }
    const normalizarBase = (nombre: string) =>
      nombre.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(".").slice(0, -1).join(".");
    const esImagen = (material: Material) =>
      /\.(jpg|jpeg|png|webp)$/i.test(material.nombre_archivo) || /^image\//i.test(material.mime_type || "");
    const buscarImagen = (nombre: string) =>
      materiales.find(material => material.sesion_id === lecturaAbierta.id && normalizarBase(material.nombre_archivo) === nombre && esImagen(material))
      ?? materiales.find(material => normalizarBase(material.nombre_archivo) === nombre && esImagen(material));
    const cargarImagen = async (nombre: string, setter: (url: string) => void, errorSetter?: (error: string) => void) => {
      const imagen = buscarImagen(nombre);
      if (!imagen) {
        errorSetter?.("No se encontró la imagen «" + nombre.toUpperCase() + "» publicada en la Biblioteca de esta sesión.");
        return;
      }
      const { data, error } = await supabase.storage.from("formacion-academica").createSignedUrl(imagen.ruta_storage, 3600);
      if (!vigente) return;
      if (error || !data?.signedUrl) {
        errorSetter?.("No se pudo abrir «" + nombre.toUpperCase() + "»: " + (error?.message || "enlace no disponible"));
        return;
      }
      setter(data.signedUrl);
    };
    void cargarImagen("rhinoceros", setImagenRhinoUrl, setImagenRhinoError);
    void cargarImagen("vistas", setImagenesVistasUrl, error => setErrorImagenesApoyo(prev => prev ? prev + " " + error : error));
    void cargarImagen("ejes", setImagenesEjesUrl, error => setErrorImagenesApoyo(prev => prev ? prev + " " + error : error));
    void cargarImagen("proceso de joyeria con impresion 3d", setImagenProceso3DUrl, setImagenProceso3DError);
    return () => { vigente = false; };
  }, [lecturaAbierta?.id, lecturaAbierta?.numero, mostrarVistaDocente, vistaPreviaAlumno, materialesDocenteQuery.data, materialesAlumnoQuery.data]);

  useEffect(() => {
    const materiales = mostrarVistaDocente || vistaPreviaAlumno ? materialesDocenteQuery.data : materialesAlumnoQuery.data;
    let vigente = true;
    setImagenesVistasPlano({});
    setErroresVistasPlano({});
    if (!lecturaAbierta || lecturaAbierta.numero !== 2 || !materiales) return () => { vigente = false; };

    const nombresVistas = [
      { id: "perspectiva", archivo: "perspectiva" },
      { id: "derecha", archivo: "derecha" },
      { id: "superior", archivo: "superior" },
      { id: "frontal", archivo: "frontal" },
    ];
    const normalizarBase = (nombre: string) =>
      nombre.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(".").slice(0, -1).join(".");
    const esImagen = (material: Material) =>
      /\.(jpg|jpeg|png|webp)$/i.test(material.nombre_archivo.trim()) || /^image\//i.test(material.mime_type || "");

    void Promise.all(nombresVistas.map(async vista => {
      const imagen = materiales.find(material =>
        material.sesion_id === lecturaAbierta.id &&
        normalizarBase(material.nombre_archivo) === vista.archivo &&
        esImagen(material)
      );
      if (!imagen) {
        if (vigente) setErroresVistasPlano(prev => ({ ...prev, [vista.id]: "No se encontró " + vista.archivo.toUpperCase() + " en la Biblioteca de esta sesión." }));
        return;
      }
      const { data, error } = await supabase.storage.from("formacion-academica").createSignedUrl(imagen.ruta_storage, 3600);
      if (!vigente) return;
      if (error || !data?.signedUrl) {
        setErroresVistasPlano(prev => ({ ...prev, [vista.id]: "No se pudo abrir " + imagen.nombre_archivo + ": " + (error?.message || "enlace no disponible") }));
        return;
      }
      setImagenesVistasPlano(prev => ({ ...prev, [vista.id]: data.signedUrl }));
    }));

    return () => { vigente = false; };
  }, [lecturaAbierta?.id, lecturaAbierta?.numero, mostrarVistaDocente, vistaPreviaAlumno, materialesDocenteQuery.data, materialesAlumnoQuery.data]);

  const renderSelectorVistasPlano = () => {
    if (lecturaAbierta?.numero !== 2 || paginaLectura !== 3) return null;
    const vistas = [
      { id: "perspectiva", nombre: "Perspectiva", ingles: "Perspective", descripcion: "Vista tridimensional que permite apreciar profundidad, volumen y la relación espacial entre las partes. Es útil para inspeccionar el diseño desde distintos ángulos." },
      { id: "derecha", nombre: "Derecha", ingles: "Right", descripcion: "Vista paralela desde el costado. Muestra principalmente la relación entre los ejes Y (profundidad) y Z (altura), útil para revisar perfiles y alturas." },
      { id: "superior", nombre: "Superior", ingles: "Top", descripcion: "Vista paralela desde arriba, asociada al plano XY. Es especialmente útil para dibujar y revisar geometría plana, contornos y distribución sobre el plano de trabajo." },
      { id: "frontal", nombre: "Frontal", ingles: "Front", descripcion: "Vista paralela desde delante, asociada al plano XZ. Permite comprobar alturas, anchuras y alineaciones frontales sin la deformación visual de la perspectiva." },
    ];
    const vistaActiva = vistas.find(v => v.id === vistaPlanoActiva) ?? vistas[0]!;
    const urlActiva = imagenesVistasPlano[vistaPlanoActiva];
    return <>
      <section className="mt-7 max-w-5xl rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold-deep">Recurso interactivo · Rhino</p>
        <h4 className="mt-1 text-base font-semibold">Explora las cuatro vistas de trabajo</h4>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Cada vista muestra el mismo modelo desde una orientación distinta. Abre el explorador para comparar las imágenes y comprender cuándo conviene utilizar cada una.</p>
        <button type="button" onClick={() => setExploradorVistasAbierto(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:brightness-95">
          <Eye className="size-4"/> Abrir explorador de vistas
        </button>
      </section>
      {exploradorVistasAbierto && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-2 sm:p-3" role="dialog" aria-modal="true" aria-label="Explorador interactivo de vistas de Rhino">
        <div className="flex h-[92dvh] max-h-[920px] w-[96vw] max-w-[1440px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2.5 sm:px-6">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold-deep">Explorador de vistas · Rhino</p><h4 className="mt-0.5 text-base font-semibold">Orientaciones del espacio de trabajo</h4></div>
            <button type="button" onClick={() => setExploradorVistasAbierto(false)} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted">Cerrar <span aria-hidden="true">×</span></button>
          </header>
          <div className="flex shrink-0 flex-wrap gap-2 border-b border-border px-3 py-2 sm:px-5">
            {vistas.map(vista => <button key={vista.id} type="button" onClick={() => setVistaPlanoActiva(vista.id)} aria-pressed={vistaPlanoActiva===vista.id} className={`rounded-xl border px-3 py-2 text-left transition sm:px-4 sm:py-2.5 ${vistaPlanoActiva===vista.id ? "border-gold bg-gold/15 text-foreground shadow-sm" : "border-border bg-background text-muted-foreground hover:border-gold/50 hover:text-foreground"}`}>
              <span className="block text-xs font-semibold sm:text-sm">{vista.nombre} <span className="font-normal text-muted-foreground">({vista.ingles})</span></span>
            </button>)}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:gap-3 sm:p-4">
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-[#111316] p-1.5 sm:p-2">
              {urlActiva ? <img src={urlActiva} alt={"Vista " + vistaActiva.nombre + " (" + vistaActiva.ingles + ") de Rhino"} className="block h-auto max-h-full w-auto max-w-full object-contain" loading="lazy"/> : erroresVistasPlano[vistaPlanoActiva] ? <p className="max-w-lg px-4 text-center text-sm text-amber-200">{erroresVistasPlano[vistaPlanoActiva]}</p> : <p className="text-sm text-white/70">Cargando imagen de la vista…</p>}
            </div>
            <div className="shrink-0 px-2 pb-1 text-center"><h5 className="text-base font-semibold text-[#252a31] sm:text-lg">{vistaActiva.nombre} <span className="font-normal text-[#4b5563]">({vistaActiva.ingles})</span></h5><p className="mx-auto mt-1 max-w-4xl text-xs leading-5 text-[#414852] sm:text-sm">{vistaActiva.descripcion}</p></div>
          </div>
        </div>
      </div>}
    </>;
  };

  async function crearExamen(e: FormEvent) {
    e.preventDefault();
    if (!participanteId || !cursoActivoId || !tituloExamen.trim()) return;
    setOcupado(true); setMensaje("");
    try {
      const { data, error } = await (supabase as any).from("formacion_examenes").insert({
        participante_id: participanteId, curso_id: cursoActivoId, sesion_id: sesionExamenId || null, titulo: tituloExamen.trim(),
        instrucciones: instruccionesExamen.trim() || null, duracion_minutos: Number(duracionExamen) || null,
        intentos_permitidos: Math.max(1, Number(intentosExamen) || 1), aleatorizar_preguntas: aleatorizarPreguntas, permitir_retroceso: permitirRetroceso, puntaje_maximo: 20,
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

  function iniciarEdicionExamen(examen: Examen) {
    setExamenSeleccionado(examen.id);
    setExamenEditandoId(examen.id);
    setTituloExamenEditado(examen.titulo);
    setInstruccionesExamenEditadas(examen.instrucciones ?? "");
    setDuracionExamenEditada(String(examen.duracion_minutos ?? 20));
    setIntentosExamenEditados(String(examen.intentos_permitidos ?? 1));
    setAleatorizarPreguntasEditado(Boolean(examen.aleatorizar_preguntas));
    setPermitirRetrocesoEditado(Boolean(examen.permitir_retroceso));
    setSesionExamenEditada(examen.sesion_id ?? "");
    const aLocal = (valor: string | null) => valor ? new Date(new Date(valor).getTime() - new Date(valor).getTimezoneOffset() * 60000).toISOString().slice(0,16) : "";
    setDisponibleDesdeEditado(aLocal(examen.disponible_desde));
    setDisponibleHastaEditado(aLocal(examen.disponible_hasta));
  }

  async function guardarEdicionExamen(examen: Examen) {
    if (!tituloExamenEditado.trim()) { setMensaje("El título de la evaluación es obligatorio."); return; }
    if (examen.publicado) { setMensaje("Retira la publicación antes de modificar una evaluación."); return; }
    const desde = disponibleDesdeEditado ? new Date(disponibleDesdeEditado) : null;
    const hasta = disponibleHastaEditado ? new Date(disponibleHastaEditado) : null;
    if (desde && hasta && hasta <= desde) { setMensaje("La fecha y hora de cierre debe ser posterior a la apertura."); return; }
    setOcupado(true); setMensaje("");
    try {
      const { error } = await (supabase as any).from("formacion_examenes").update({
        titulo: tituloExamenEditado.trim(),
        instrucciones: instruccionesExamenEditadas.trim() || null,
        duracion_minutos: Math.max(1, Number(duracionExamenEditada) || 20),
        intentos_permitidos: Math.min(10, Math.max(1, Number(intentosExamenEditados) || 1)),
        aleatorizar_preguntas: aleatorizarPreguntasEditado,
        permitir_retroceso: permitirRetrocesoEditado,
        sesion_id: sesionExamenEditada || null,
        disponible_desde: desde ? desde.toISOString() : null,
        disponible_hasta: hasta ? hasta.toISOString() : null,
      }).eq("id", examen.id).eq("participante_id", participanteId).eq("curso_id", cursoActivoId);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["aula-formacion-examenes-docente", participanteId, cursoActivoId] });
      setExamenEditandoId("");
      setMensaje("Evaluación actualizada. Sigue en borrador; publícala cuando esté lista.");
    } catch (err) { setMensaje(err instanceof Error ? err.message : "No se pudo actualizar la evaluación."); }
    finally { setOcupado(false); }
  }

  async function eliminarExamen(examen: Examen) {
    setOcupado(true); setMensaje("");
    try {
      const { count, error: intentosError } = await (supabase as any).from("formacion_intentos")
        .select("id", { count: "exact", head: true }).eq("examen_id", examen.id);
      if (intentosError) throw intentosError;
      if ((count ?? 0) > 0) {
        setMensaje("No se puede eliminar: esta evaluación ya tiene intentos registrados. Retírala de publicación para que no reciba nuevos intentos y conserva su historial.");
        setExamenEliminarPendiente(null);
        return;
      }
      const { error: preguntasError } = await (supabase as any).from("formacion_preguntas").delete().eq("examen_id", examen.id).eq("participante_id", participanteId);
      if (preguntasError) throw preguntasError;
      const { error } = await (supabase as any).from("formacion_examenes").delete()
        .eq("id", examen.id).eq("participante_id", participanteId).eq("curso_id", cursoActivoId);
      if (error) throw error;
      if (examenActivoId === examen.id) setExamenSeleccionado("");
      setExamenEditandoId("");
      setExamenEliminarPendiente(null);
      await qc.invalidateQueries({ queryKey: ["aula-formacion-examenes-docente", participanteId, cursoActivoId] });
      setMensaje("Evaluación eliminada.");
    } catch (err) { setMensaje(err instanceof Error ? err.message : "No se pudo eliminar la evaluación."); }
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

  async function abrirExamenAlumno(id: string): Promise<boolean> {
    setMensaje(""); setErrorInicioExamen("");
    try {
      const { data: inicio, error: inicioError } = await (supabase as any).rpc("iniciar_intento_formacion", { _examen_id: id });
      if (inicioError) throw inicioError;
      if (!inicio?.intento_id) throw new Error("El servidor no devolvió un identificador de intento.");
      const { data, error } = await (supabase as any).rpc("obtener_examen_intento_formacion", { _intento_id: inicio.intento_id });
      if (error) throw error;
      if (!data || !Array.isArray(data.preguntas) || data.preguntas.length === 0) throw new Error("La evaluación no tiene preguntas disponibles. Informa al docente para que revise su configuración.");
      const { data: intentoGuardado, error: recuperarError } = await (supabase as any).rpc("recuperar_respuestas_intento_formacion", { _intento_id: inicio.intento_id });
      if (recuperarError) throw recuperarError;
      const respuestasRecuperadas = Object.fromEntries(((intentoGuardado?.respuestas ?? []) as Array<{ pregunta_id: string; respuesta: unknown }>).map(r => [r.pregunta_id, typeof r.respuesta === "boolean" ? String(r.respuesta) : String(r.respuesta ?? "")]));
      setRespuestasAlumno(respuestasRecuperadas);
      setPreguntaActualAlumno(Math.min(Math.max(0, Number(intentoGuardado?.pregunta_actual ?? 0)), Math.max(0, (data as ExamenAlumno).preguntas.length - 1)));
      setExamenActivoAlumno({ ...(data as ExamenAlumno), intento_id: inicio.intento_id, vence_en: inicio.vence_en ?? null });
      return true;
    } catch (err) {
      const detalle = err instanceof Error ? err.message : String((err as any)?.message ?? "Error desconocido");
      setErrorInicioExamen(detalle); return false;
    }
  }

  async function enviarExamenAlumno() {
    if (!examenActivoAlumno || enviandoExamen) return;
    const tiempoAgotado = segundosRestantesExamen === 0;
    const faltante = examenActivoAlumno.preguntas.find(p => p.obligatoria && !String(respuestasAlumno[p.id] ?? "").trim());
    if (faltante && !tiempoAgotado) { setMensaje("Responde todas las preguntas obligatorias antes de enviar."); return; }
    const respuestas = examenActivoAlumno.preguntas.map(p => ({ pregunta_id: p.id, respuesta: p.tipo === "verdadero_falso" ? respuestasAlumno[p.id] === "true" : (respuestasAlumno[p.id] ?? "") }));
    setEnviandoExamen(true); setMensaje("");
    try {
      // Cancelamos el debounce pendiente y serializamos el cierre tras cualquier autoguardado activo.
      if (autosaveExamenTimeoutRef.current !== null) {
        window.clearTimeout(autosaveExamenTimeoutRef.current);
        autosaveExamenTimeoutRef.current = null;
      }
      const guardadoPendiente = guardadoExamenPendienteRef.current;
      if (guardadoPendiente) await guardadoPendiente;
      // Si el tiempo venció, guardar_respuestas rechaza la operación por diseño.
      // enviar_intento_formacion acepta el cierre vencido y conserva la última instantánea recibida.
      if (!tiempoAgotado) {
        const { error: guardarError } = await (supabase as any).rpc("guardar_respuestas_intento_formacion", {
          _intento_id: examenActivoAlumno.intento_id,
          _respuestas: respuestas,
          _pregunta_actual: preguntaActualAlumno
        });
        if (guardarError) throw guardarError;
      }
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
      const yaInscritos = new Set(((inscripcionesQuery.data ?? []) as Array<{ alumno_user_id?: string | null }>).map(i => i.alumno_user_id).filter(Boolean));
      const pendientes = alumnosSeleccionados.filter(id => !yaInscritos.has(id));
      if (!pendientes.length) {
        setMensaje("Los alumnos seleccionados ya están inscritos en este curso.");
        return;
      }
      const resultado = await matricularAlumnos({ data: { participanteDocenteId: participanteId, cursoId: cursoActivoId, userIds: pendientes } });
      if (!resultado.inscritos) {
        setMensaje("Los alumnos seleccionados ya están inscritos en este curso.");
        return;
      }
      setAlumnosSeleccionados([]);
      await qc.invalidateQueries({ queryKey: ["aula-formacion-inscripciones", participanteId, cursoActivoId] });
      setMensaje(`${resultado.inscritos} alumno(s) inscrito(s) correctamente.`);
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
      const { data, error } = await (supabase as any).from("formacion_contenidos_lectura").select("secciones,publicado").eq("sesion_id", s.id).maybeSingle();
      if (error) throw error;
      const guardadas = Array.isArray(data?.secciones) ? data.secciones : null;
      // Lo que el docente guardó en Supabase prevalece sobre la plantilla inicial del código.
      // La plantilla solo se utiliza cuando todavía no existe contenido persistido.
      const seccionesIniciales = s.numero === 1 ? LECTURA_SESION_1 : s.numero === 2 ? LECTURA_SESION_2 : s.numero === 3 ? LECTURA_SESION_3 : s.numero === 4 ? LECTURA_SESION_4 : s.numero === 5 ? LECTURA_SESION_5 : s.numero === 6 ? LECTURA_SESION_6 : s.numero === 7 ? LECTURA_SESION_7 : s.numero === 8 ? LECTURA_SESION_8 : s.numero === 9 ? LECTURA_SESION_9 : s.numero === 10 ? LECTURA_SESION_10 : null;
      const seccionesEditor = guardadas?.length
        ? guardadas
        : seccionesIniciales
          ? seccionesIniciales.map(x => ({ titulo: x.titulo, bloques: [...x.bloques] }))
          : [];
      setSeccionesLecturaEditadas(seccionesEditor);
      setEstadoGuardadoLectura(guardadas?.length
        ? { tipo: "info", texto: "Contenido cargado desde Supabase. Los cambios aún no están guardados." }
        : { tipo: "info", texto: "Contenido inicial cargado. Guarda el borrador para conservarlo en Supabase." });
      setLecturaPublicada(Boolean(data?.publicado));
      setLecturaEditando(s);
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "No se pudo cargar la lectura. Verifica la tabla y sus permisos.");
    } finally { setCargandoLecturaDocente(false); }
  }

  async function guardarContenidoLectura(publicar = false) {
    if (!lecturaEditando || !participanteId || !sesionesQuery.data?.some(x => x.id === lecturaEditando.id)) return;
    if (!seccionesLecturaEditadas.length || seccionesLecturaEditadas.some(x => !x.titulo.trim() || !x.bloques.length || x.bloques.some(b => !b.trim()))) {
      setEstadoGuardadoLectura({ tipo: "error", texto: "No se guardó: completa el título y al menos un bloque de texto en cada apartado." });
      return;
    }
    setOcupado(true); setMensaje(""); setEstadoGuardadoLectura({ tipo: "info", texto: "Guardando cambios en Supabase…" });
    try {
      const { data: existente, error: consultaError } = await (supabase as any).from("formacion_contenidos_lectura").select("sesion_id").eq("sesion_id", lecturaEditando.id).maybeSingle();
      if (consultaError) throw consultaError;
      const payload = { sesion_id: lecturaEditando.id, secciones: seccionesLecturaEditadas, publicado: publicar ? true : lecturaPublicada, updated_by: sesion?.user?.id ?? null, updated_at: new Date().toISOString() };
      const resultado = existente
        ? await (supabase as any).from("formacion_contenidos_lectura").update(payload).eq("sesion_id", lecturaEditando.id).select("sesion_id").maybeSingle()
        : await (supabase as any).from("formacion_contenidos_lectura").insert(payload).select("sesion_id").single();
      if (resultado.error) throw resultado.error;
      if (!resultado.data?.sesion_id) throw new Error("Supabase no confirmó el guardado. Revisa los permisos de la tabla.");
      await qc.invalidateQueries({ queryKey: ["aula-formacion-lectura", lecturaEditando.id] });
      setLecturaPublicada(Boolean(payload.publicado));
      setEstadoGuardadoLectura({ tipo: "success", texto: publicar ? "¡Lectura publicada! Ya está disponible para los alumnos." : payload.publicado ? "¡Cambios guardados! La lectura continúa publicada." : "¡Guardado correctamente! El borrador está almacenado en Supabase y aún no está publicado." });
    } catch (err) {
      setEstadoGuardadoLectura({ tipo: "error", texto: err instanceof Error ? "No se pudo guardar: " + err.message : "No se pudo guardar la lectura. Inténtalo nuevamente." });
    } finally { setOcupado(false); }
  }

  async function retirarPublicacionLectura() {
    if (!lecturaEditando) return;
    setOcupado(true);
    setEstadoGuardadoLectura({ tipo:"info", texto:"Retirando la lectura del Aula…" });
    try {
      const { data, error } = await (supabase as any).from("formacion_contenidos_lectura").update({ publicado:false, updated_at:new Date().toISOString() }).eq("sesion_id",lecturaEditando.id).select("sesion_id").maybeSingle();
      if (error) throw error;
      if (!data?.sesion_id) throw new Error("Supabase no confirmó el cambio de publicación.");
      setLecturaPublicada(false);
      setEstadoGuardadoLectura({ tipo:"success", texto:"Lectura retirada. El contenido se conserva como borrador." });
    } catch (err) { setEstadoGuardadoLectura({ tipo:"error", texto:err instanceof Error ? err.message : "No se pudo retirar la lectura." }); }
    finally { setOcupado(false); }
  }

  async function abrirLecturaParaAlumno(s: SesionCurso, vistaPrevia = false) {
    if (!vistaPrevia && s.bloqueada) { setMensaje("Esta sesión está bloqueada por el profesor. Puedes consultar su información, pero todavía no abrir su lectura."); return; }
    setOcupado(true);
    setMensaje("");
    try {
      let consulta = (supabase as any).from("formacion_contenidos_lectura").select("secciones,publicado").eq("sesion_id",s.id);
      if (!vistaPrevia) consulta = consulta.eq("publicado",true);
      const { data, error } = await consulta.maybeSingle();
      if (error) throw error;
      const seccionesOriginales = data && Array.isArray(data.secciones) && data.secciones.length > 0
        ? data.secciones
        : vistaPrevia && s.numero === 1 ? LECTURA_SESION_1 : null;
      // Sesión 3 utiliza la estructura curricular canónica para evitar que una lectura
      // antigua guardada en Supabase oculte apartados nuevos o desordene los laboratorios.
      const secciones = s.numero === 3 ? LECTURA_SESION_3 : seccionesOriginales;
      if (!secciones) {
        setMensaje(vistaPrevia ? "Todavía no hay contenido de lectura guardado para esta sesión." : "La lectura de esta sesión todavía no está publicada por FADILAB.");
        return;
      }
      setSeccionesLecturaActivas(secciones);
      setLecturaModoVistaPrevia(vistaPrevia);
      setModoAulaExpandida(true);
      setLecturaAbierta(s);
      setPaginaLectura(0);
      setComponentesExplorados([]);
      setComponenteActivo(null);
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "No se pudo cargar la lectura. Revisa los permisos de lectura del contenido.");
    } finally { setOcupado(false); }
  }

  async function cambiarBloqueoSesion(s: SesionCurso) {
    const { error } = await (supabase as any).from("formacion_sesiones").update({ bloqueada: !s.bloqueada }).eq("id", s.id).eq("participante_id", participanteId);
    if (error) setMensaje(error.message);
    else { await qc.invalidateQueries({ queryKey: ["aula-formacion-sesiones", cursoActivoId] }); await qc.invalidateQueries({ queryKey: ["aula-formacion-sesiones-alumno"] }); setMensaje(s.bloqueada ? "Sesión desbloqueada. El alumno ya puede abrirla." : "Sesión bloqueada. El alumno podrá verla, pero no abrirla."); }
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
        participante_id: participanteId, curso_id: cursoActivoId, sesion_id: sesionMaterialId || null, titulo: tituloMaterial.trim(),
        nombre_archivo: archivo.name, ruta_storage: ruta, mime_type: archivo.type || "application/octet-stream",
        tamano_bytes: archivo.size, publicado: publicarMaterial, subido_por: sesion?.user.id,
      });
      if (error) {
        await supabase.storage.from("formacion-academica").remove([ruta]);
        throw error;
      }
      setArchivo(null); setTituloMaterial(""); setSesionMaterialId("");
      await qc.invalidateQueries({ queryKey: ["aula-formacion-materiales-docente", participanteId, cursoActivoId] });
      await qc.invalidateQueries({ queryKey: ["aula-formacion-materiales-alumno"] });
      const input = document.getElementById("aula-material-file") as HTMLInputElement | null;
      if (input) input.value = "";
      setMensaje(publicarMaterial ? "Material publicado en el aula." : "Material guardado como borrador.");
    } catch (err) { setMensaje(err instanceof Error ? err.message : "No se pudo subir el material."); }
    finally { setOcupado(false); }
  }

  async function guardarEdicionMaterial(e: FormEvent, material: Material) {
    e.preventDefault();
    if (!participanteId || !tituloMaterialEditado.trim()) return;
    if (archivoMaterialReemplazo && archivoMaterialReemplazo.size > 50 * 1024 * 1024) { setMensaje("El archivo supera el límite de 50 MB."); return; }
    setOcupado(true); setMensaje("");
    let nuevaRuta: string | null = null;
    try {
      if (archivoMaterialReemplazo) {
        const extension = archivoMaterialReemplazo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
        nuevaRuta = participanteId + "/" + cursoActivoId + "/" + crypto.randomUUID() + "." + extension;
        const { error: uploadError } = await supabase.storage.from("formacion-academica").upload(nuevaRuta, archivoMaterialReemplazo, { contentType: archivoMaterialReemplazo.type || "application/octet-stream", upsert: false });
        if (uploadError) throw uploadError;
      }
      const { error } = await (supabase as any).from("formacion_materiales").update({
        titulo: tituloMaterialEditado.trim(), sesion_id: sesionMaterialEditada || null,
        ...(archivoMaterialReemplazo && nuevaRuta ? { nombre_archivo: archivoMaterialReemplazo.name, ruta_storage: nuevaRuta, mime_type: archivoMaterialReemplazo.type || "application/octet-stream", tamano_bytes: archivoMaterialReemplazo.size } : {}),
      }).eq("id", material.id).eq("participante_id", participanteId).eq("curso_id", cursoActivoId);
      if (error) {
        if (nuevaRuta) await supabase.storage.from("formacion-academica").remove([nuevaRuta]);
        throw error;
      }
      if (nuevaRuta) await supabase.storage.from("formacion-academica").remove([material.ruta_storage]);
      setArchivoMaterialReemplazo(null);
      setMaterialEditandoId("");
      await qc.invalidateQueries({ queryKey: ["aula-formacion-materiales-docente", participanteId, cursoActivoId] });
      await qc.invalidateQueries({ queryKey: ["aula-formacion-materiales-alumno"] });
      setMensaje("Material actualizado correctamente.");
    } catch (err) { setMensaje(err instanceof Error ? err.message : "No se pudo actualizar el material."); }
    finally { setOcupado(false); }
  }

  async function cambiarPublicacionMaterial(material: Material) {
    if (!participanteId) return;
    setOcupado(true); setMensaje("");
    try {
      const { error } = await (supabase as any).from("formacion_materiales").update({ publicado: !material.publicado })
        .eq("id", material.id).eq("participante_id", participanteId).eq("curso_id", cursoActivoId);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["aula-formacion-materiales-docente", participanteId, cursoActivoId] });
      await qc.invalidateQueries({ queryKey: ["aula-formacion-materiales-alumno"] });
      setMensaje(material.publicado ? "Material retirado del aula; el archivo se conserva." : "Material publicado para los alumnos.");
    } catch (err) { setMensaje(err instanceof Error ? err.message : "No se pudo cambiar la publicación."); }
    finally { setOcupado(false); }
  }

  async function eliminarMaterial(material: Material) {
    if (!participanteId || !window.confirm("¿Eliminar definitivamente “" + material.titulo + "” y su archivo?")) return;
    setOcupado(true); setMensaje("");
    try {
      const { error } = await (supabase as any).from("formacion_materiales").delete()
        .eq("id", material.id).eq("participante_id", participanteId).eq("curso_id", cursoActivoId);
      if (error) throw error;
      const { error: storageError } = await supabase.storage.from("formacion-academica").remove([material.ruta_storage]);
      await qc.invalidateQueries({ queryKey: ["aula-formacion-materiales-docente", participanteId, cursoActivoId] });
      await qc.invalidateQueries({ queryKey: ["aula-formacion-materiales-alumno"] });
      setMensaje(storageError ? "Registro eliminado; no se pudo retirar el archivo del almacenamiento. Revisa Storage." : "Material y archivo eliminados.");
    } catch (err) { setMensaje(err instanceof Error ? err.message : "No se pudo eliminar el material."); }
    finally { setOcupado(false); }
  }

  async function descargarMaterial(m: Material) {
    const { data, error } = await supabase.storage.from("formacion-academica").createSignedUrl(m.ruta_storage, 60);
    if (error || !data?.signedUrl) { setMensaje(error?.message || "No se pudo generar el enlace del archivo."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (cargandoSesion) return <AppShell titulo="Aula de formación" subtitulo="Cargando acceso"><Panel titulo="Verificando cuenta"><p className="p-5 text-sm text-muted-foreground">Comprobando tu sesión…</p></Panel></AppShell>;

  const actividadesGeometria = [
    { titulo: "Punto", pregunta: "¿Qué representa un punto en Rhino?", introduccion: "Un punto marca una posición exacta mediante coordenadas X, Y y Z.", claves: ["X, Y y Z indican su posición.","Sirve como referencia para construir.","No tiene área ni volumen."], aplicacion: "En joyería: marca dónde inicia una curva o se ubica una piedra.", ejemplo: "Ejemplo: fija el inicio y final del perfil de un anillo.", opciones: [{ valor: "volumen", texto: "Un volumen con grosor" }, { valor: "posicion", texto: "Una posición o referencia en el espacio" }, { valor: "superficie", texto: "Una cara con área" }], correcta: "posicion", explicacion: "¡Exacto! El punto define una posición. En Rhino puedes apoyarte en coordenadas y referencias para ubicar elementos con precisión." },
    { titulo: "Curvas", pregunta: "¿Cuál de estas geometrías es una curva cerrada circular?", introduccion: "Las curvas crean contornos y recorridos. Practicarás Línea, Polilínea, Círculo y Rectángulo.", claves: ["Abierta: sus extremos no se tocan.","Cerrada: inicio y final se unen.","El círculo es cerrado; línea y polilínea pueden quedar abiertas."], aplicacion: "En joyería: el círculo puede definir la trayectoria de un aro.", ejemplo: "Ejemplo: dibuja un círculo como trayectoria del aro.", opciones: [{ valor: "linea", texto: "Línea" }, { valor: "polilinea", texto: "Polilínea abierta" }, { valor: "circulo", texto: "Círculo" }], correcta: "circulo", explicacion: "Correcto. El círculo es una curva cerrada. Una línea o polilínea abierta conserva extremos sin unir." },
    { titulo: "Superficies", pregunta: "¿Qué diferencia a una superficie de una curva?", introduccion: "Una superficie ocupa un área y puede ser plana o curva. Sus bordes delimitan su forma.", claves: ["Tiene área; puede ser plana o curva.","Sus límites son bordes definidos por curvas.","Los puntos de control modifican su forma."], aplicacion: "En joyería: crea la zona curva o abombada de un colgante.", ejemplo: "Ejemplo: modela la parte superior de un colgante.", opciones: [{ valor: "area", texto: "La superficie representa una zona con área" }, { valor: "color", texto: "La superficie siempre tiene otro color" }, { valor: "cierre", texto: "La superficie es siempre una línea cerrada" }], correcta: "area", explicacion: "Así es. Una superficie ocupa una zona con área. Una curva representa una línea o recorrido, no una región superficial." },
    { titulo: "Sólidos", pregunta: "¿Qué característica identifica a un sólido cerrado?", introduccion: "Un sólido es una geometría cerrada que encierra volumen.", claves: ["Encierra un volumen 3D.","Puede ser una superficie cerrada o una polisuperficie.","Puede crearse, separarse, modificarse y unirse."], aplicacion: "En joyería: representa cuerpos macizos y componentes de una montura.", ejemplo: "Ejemplo: una montura maciza debe cerrar su volumen.", opciones: [{ valor: "trazo", texto: "Está formado solo por líneas" }, { valor: "volumen", texto: "Delimita un volumen cerrado" }, { valor: "plano", texto: "Es una curva plana" }], correcta: "volumen", explicacion: "Correcto. Un sólido cerrado delimita un volumen tridimensional y representa un cuerpo, no solo líneas o superficies abiertas." },
  ];
  const renderLaboratorioSesion4 = () => {
    if (lecturaAbierta?.numero !== 4) return null;

    // La lectura activa puede venir de Supabase y no coincidir con el orden
    // de la plantilla local. Resolver el laboratorio por el título real.
    const tituloApartado = String(seccionesLecturaActivas[paginaLectura]?.titulo ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const moduloPorTitulo: Array<{ claves: string[]; modulo: "fillet"|"chamfer"|"trim"|"move"|"rotate"|"integrador" }> = [
      { claves: ["integrador", "practica integradora", "reto integrador"], modulo: "integrador" },
      { claves: ["trim", "split", "extend", "join", "limpiar y organizar curvas"], modulo: "trim" },
      { claves: ["move", "copy", "mover", "copiar", "desplazar y duplicar"], modulo: "move" },
      { claves: ["rotate", "scale", "rotar", "girar", "escalar", "orientacion y tamano"], modulo: "rotate" },
      { claves: ["fillet", "empalme", "redonde"], modulo: "fillet" },
      { claves: ["chamfer", "offset", "bisel", "contornos paralelos"], modulo: "chamfer" },
    ];
    const coincidencia = moduloPorTitulo.find(({ claves }) => claves.some(clave => tituloApartado.includes(clave)));
    if (!coincidencia) return null;
    const initialModule = coincidencia.modulo;
    if (!laboratorioSesion4Abierto) return (
      <section className="mt-7 overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-[#171b21] via-[#111820] to-[#0c1219] p-5 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-amber-300">AURUM LAB · Sesión 04</p>
            <h4 className="mt-1 text-xl font-semibold">CURVE EDITOR STUDIO</h4>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">11 comandos de edición y transformación, más un reto integrador para perfiles de joyería.</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-300">
              {["11 comandos","Viewport técnico","Inspector de parámetros","Práctica guiada"].map(x=><span key={x} className="rounded-full border border-white/15 px-3 py-1.5">{x}</span>)}
            </div>
          </div>
          <button type="button" onClick={() => setLaboratorioSesion4Abierto(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-amber-200 to-amber-500 px-5 py-3 text-sm font-bold text-[#21180a] shadow-lg hover:brightness-105">
            <ArrowRight className="size-4"/> Abrir Curve Editor Studio
          </button>
        </div>
      </section>
    );
    return <LaboratorioCurveEditor initialModule={initialModule} onClose={() => setLaboratorioSesion4Abierto(false)} />;
  };

  const renderLaboratorioPreparacion = () => {
    if (lecturaAbierta?.numero !== 3 || paginaLectura !== 1) return null;
    const correcto = unidadesPreparacion === "Milímetros" && vistaPreparacion === "Superior" && planoPreparacion === "XY";
    const planoActivo = planoPreparacion;
    const orientacion = vistaPreparacion === "Superior"
      ? { horizontal: planoActivo[0], vertical: planoActivo[1], descripcion: "Vista superior: observas el plano de frente, con sus dos ejes en pantalla." }
      : vistaPreparacion === "Frontal"
        ? { horizontal: "X", vertical: "Z", descripcion: "Vista frontal: la pantalla muestra los ejes X y Z. El plano activo sigue siendo " + planoActivo + "." }
        : { horizontal: "X", vertical: "Y", descripcion: "Perspectiva: representación tridimensional de referencia. El plano activo sigue siendo " + planoActivo + "." };
    const escalaEtiqueta = unidadesPreparacion === "Milímetros" ? "mm" : unidadesPreparacion === "Centímetros" ? "cm" : "in";
    const factorEscala = unidadesPreparacion === "Milímetros" ? "1 división = 1 mm" : unidadesPreparacion === "Centímetros" ? "1 división = 1 cm" : "1 división = 1 in";
    const estadoCampo = (bien: boolean) => bien ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-amber-300/30 bg-amber-300/10 text-amber-100";
    const opciones = (titulo: string, valor: string, setValor: (v: string) => void, items: string[]) => (
      <div className="rounded-xl border border-white/10 bg-[#171b21] p-4">
        <p className="mb-3 text-sm font-semibold text-white">{titulo}</p>
        <div className="flex flex-wrap gap-2">{items.map(item => <button key={item} type="button" onClick={() => { setValor(item); setValidacionPreparacion(false); }} className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${valor === item ? "border-amber-300/70 bg-amber-300/15 text-amber-200" : "border-white/15 bg-[#222B36] text-slate-200 hover:border-amber-200/50"}`}>{item}</button>)}</div>
      </div>
    );
    if (!laboratorioPreparacionAbierto) return (
      <section className="mt-7 overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-[#171b21] via-[#111820] to-[#0c1219] p-5 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-amber-300">AURUM LAB · Sesión 03 · Índice 02</p>
            <h4 className="mt-1 text-xl font-semibold text-white">WORKSPACE SETUP</h4>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">Prepara el documento, reconoce la vista Superior y comprueba el plano de construcción XY antes de dibujar.</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-300">{["Unidades en mm","Vista Superior","Plano XY"].map(x=><span key={x} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">{x}</span>)}</div>
          </div>
          <button type="button" onClick={() => { setUnidadesPreparacion("Centímetros"); setVistaPreparacion("Perspectiva"); setPlanoPreparacion("YZ"); setValidacionPreparacion(false); setLaboratorioPreparacionAbierto(true); }} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-b from-amber-200 to-amber-500 px-5 py-3 text-sm font-bold text-[#21180a] shadow-lg hover:brightness-105"><ArrowRight className="size-4"/> Abrir laboratorio</button>
        </div>
      </section>
    );
    return (
      <div className="fixed inset-0 z-[103] overflow-y-auto bg-[#080d13]/95 p-2 backdrop-blur-sm sm:p-4">
        <section className="mx-auto flex min-h-[calc(100dvh-1rem)] max-w-6xl flex-col overflow-hidden rounded-2xl border border-amber-300/30 bg-gradient-to-br from-[#171b21] via-[#111820] to-[#0c1219] text-white shadow-2xl sm:min-h-[calc(100dvh-2rem)]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0e141b]/90 px-5 py-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-amber-300">FADILAB · SESIÓN 03 · ÍNDICE 02</p><h3 className="mt-1 text-lg font-semibold text-white">Preparación del espacio de trabajo</h3><p className="mt-1 text-sm text-slate-300">Configura el entorno antes de introducir coordenadas.</p></div>
            <button type="button" onClick={() => setLaboratorioPreparacionAbierto(false)} className="rounded-lg border border-white/20 bg-[#222B36] px-4 py-2 text-sm font-medium text-white hover:border-amber-200/50">Cerrar laboratorio ×</button>
          </header>
          <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[1.05fr_.95fr] lg:p-6">
            <div className="flex min-h-[280px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#10151b]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><span className="text-xs font-semibold tracking-wide text-slate-200">VISOR GEOMÉTRICO · {vistaPreparacion.toUpperCase()}</span><span className="rounded-full bg-amber-300/10 px-2.5 py-1 text-[10px] font-semibold text-amber-200">{planoActivo} · {vistaPreparacion === "Perspectiva" ? "3D" : vistaPreparacion === "Frontal" ? "FRONT" : "TOP"}</span></div>
              <svg viewBox="0 0 620 430" className="min-h-0 w-full flex-1" role="img" aria-label={`Vista ${vistaPreparacion}, plano ${planoActivo}, unidades ${unidadesPreparacion}`}>
                <defs><pattern id="prep-grid-dynamic" width={unidadesPreparacion === "Milímetros" ? 28 : unidadesPreparacion === "Centímetros" ? 36 : 44} height={unidadesPreparacion === "Milímetros" ? 28 : unidadesPreparacion === "Centímetros" ? 36 : 44} patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#34404d" strokeWidth="1"/></pattern></defs>
                <rect width="620" height="430" fill="url(#prep-grid-dynamic)"/>
                {vistaPreparacion === "Perspectiva" ? <>
                  <path d="M80 315L310 180L545 315L310 405Z" fill="#D8B979" fillOpacity=".045" stroke="#D8B979" strokeOpacity=".65" strokeWidth="1.5"/>
                  {Array.from({length:9},(_,i)=><path key={`pv-${i}`} d={`M${105+i*25} ${300-i*13}L${335+i*25} ${390-i*13}`} stroke="#34404d" strokeWidth="1"/>)}
                  {Array.from({length:9},(_,i)=><path key={`ph-${i}`} d={`M${80+i*28} ${315+i*10}L${310+i*28} ${180+i*10}`} stroke="#34404d" strokeWidth="1"/>)}
                  <path d="M310 300L540 300 M310 300L190 230 M310 300L310 80" stroke="#D8DDE5" strokeWidth="1.6"/>
                  <path d="M530 292l10 8-10 8 M198 225l-8 5 8 5 M302 90l8-12 8 12" fill="none" stroke="#D8B979" strokeWidth="2"/>
                  <circle cx="310" cy="300" r="5" fill="#D8B979"/><text x="548" y="305" fill="#E8EDF2" fontSize="15">X</text><text x="178" y="225" fill="#E8EDF2" fontSize="15">Y</text><text x="322" y="83" fill="#E8EDF2" fontSize="15">Z</text>
                </> : <>
                  <path d="M45 215H575 M310 35V395" stroke="#D3D9E0" strokeWidth="1.5"/>
                  <path d="M560 207l15 8-15 8 M302 50l8-15 8 15" fill="none" stroke="#D8B979" strokeWidth="2"/>
                  <circle cx="310" cy="215" r="6" fill="#D8B979"/>
                  <text x="322" y="205" fill="#F4D18B" fontSize="14">0,0</text>
                  <text x="584" y="220" fill="#E8EDF2" fontSize="15">{orientacion.horizontal}</text>
                  <text x="320" y="35" fill="#E8EDF2" fontSize="15">{orientacion.vertical}</text>
                </>}
                <text x="28" y="32" fill="#AAB7C5" fontSize="12">PLANO {planoActivo} · {escalaEtiqueta.toUpperCase()} · {factorEscala}</text>
              </svg>
              <div className="border-t border-white/10 px-4 py-3 text-xs leading-5 text-slate-300">{orientacion.descripcion} La cuadrícula representa divisiones en {unidadesPreparacion.toLowerCase()}.</div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-amber-300/25 bg-amber-300/5 p-4"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-amber-200">Configuración requerida</p><p className="mt-1 text-sm leading-6 text-slate-200">Para esta práctica, el documento debe estar en milímetros, la vista activa debe ser Superior y el plano de construcción predeterminado debe ser XY.</p></div>
              {opciones("1 · Unidades del documento",unidadesPreparacion,setUnidadesPreparacion,["Milímetros","Centímetros","Pulgadas"])}
              {opciones("2 · Vista activa",vistaPreparacion,setVistaPreparacion,["Superior","Perspectiva","Frontal"])}
              {opciones("3 · Plano de construcción",planoPreparacion,setPlanoPreparacion,["XY","YZ","XZ"])}
              <div className="grid grid-cols-3 gap-2">
                {[{label:"Unidades",ok:unidadesPreparacion==="Milímetros",value:unidadesPreparacion},{label:"Vista",ok:vistaPreparacion==="Superior",value:vistaPreparacion},{label:"Plano",ok:planoPreparacion==="XY",value:planoPreparacion}].map(item=><div key={item.label} className={`rounded-lg border px-2 py-2 ${estadoCampo(item.ok)}`}><div className="flex items-center gap-1 text-[10px] font-semibold"><span>{item.ok?"✓":"!"}</span>{item.label}</div><p className="mt-1 truncate text-xs font-bold">{item.value}</p></div>)}
              </div>
              <button type="button" onClick={() => setValidacionPreparacion(true)} className="mt-1 rounded-xl bg-gradient-to-b from-amber-200 to-amber-500 px-4 py-3 text-sm font-bold text-[#21180a] shadow-lg hover:brightness-105">Comprobar configuración</button>
              {validacionPreparacion && <div className={`rounded-xl border p-4 ${correcto ? "border-emerald-400/30 bg-emerald-400/10" : "border-amber-300/30 bg-amber-300/10"}`}><p className={`text-sm font-semibold ${correcto ? "text-emerald-200" : "text-amber-100"}`}>{correcto ? "Configuración correcta" : "Todavía falta ajustar el espacio de trabajo"}</p><p className="mt-1 text-xs leading-5 text-slate-200">{correcto ? "El documento está preparado para continuar con coordenadas sobre el plano XY." : "Corrige los indicadores pendientes. Se requiere milímetros, vista Superior y plano XY."}</p></div>}
              <button type="button" onClick={()=>{setUnidadesPreparacion("Centímetros");setVistaPreparacion("Perspectiva");setPlanoPreparacion("YZ");setValidacionPreparacion(false);}} className="rounded-lg border border-white/15 bg-[#222B36] px-3 py-2 text-xs font-semibold text-slate-200 hover:border-amber-200/50">Reiniciar reto</button>
              <p className="text-xs leading-5 text-slate-400">Simulación didáctica: no modifica un archivo de Rhino ni ejecuta comandos reales.</p>
            </div>
          </div>
        </section>
      </div>
    );
  };

  const renderRhinoCommand = (command: string, detail: string) => (
    <div className="mx-3 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/10 bg-[#222B36] px-3 py-2.5 sm:mx-4">
      <div className="min-w-[112px]">
        <p className="text-[9px] font-bold uppercase tracking-[.18em] text-[#D8B979]">COMANDO RHINO</p>
        <code className="mt-1 block font-mono text-sm font-semibold tracking-wide text-[#E8EDF2]">_{command}</code>
      </div>
      <p className="min-w-0 flex-1 text-xs leading-5 text-[#AAB7C5]">{detail}</p>
    </div>
  );

  const renderLaboratorioCoordenadas = () => {
    if (lecturaAbierta?.numero !== 3 || ![2, 3, 4].includes(paginaLectura)) return null;
    const ox=250,oy=170,k=9,last=puntosCoord3[puntosCoord3.length-1]??{x:0,y:0};
    const metodoActual: "absolutas"|"relativas"|"polares" = modoCoord3;
    const explicacion = {
      absolutas: {
        titulo: "Coordenadas absolutas · referencia fija en el origen",
        texto: "Cada punto se define por su posición X/Y respecto al origen (0,0) del plano de construcción. El punto anterior no modifica el resultado.",
        ejemplo: "20,10,0",
        detalle: "En Rhino escribe X,Y,Z. Por ejemplo, 20,10,0 sitúa el punto en X=20, Y=10 y Z=0."
      },
      relativas: {
        titulo: "Coordenadas relativas · referencia en el último punto",
        texto: "Cada nuevo punto se calcula como un desplazamiento ΔX/ΔY desde el último punto confirmado. El prefijo @ indica que la referencia es el punto anterior.",
        ejemplo: "@10,0,0",
        detalle: "En Rhino escribe @ΔX,ΔY,ΔZ. Por ejemplo, @10,0,0 avanza 10 unidades en X desde el último punto."
      },
      polares: {
        titulo: "Coordenadas polares · distancia y dirección",
        texto: "Define el siguiente punto con una distancia y un ángulo respecto al eje X positivo. Puedes medir desde el origen o desde el último punto.",
        ejemplo: "10<45  ·  @10<45",
        detalle: "10<45 define una posición desde el origen; @10<45 aplica esa distancia y ángulo desde el último punto. 0° va a la derecha y 90° hacia arriba."
      }
    }[metodoActual];
    const reset=()=>{setPuntosCoord3([{x:0,y:0}]);setCerradoCoord3(false);setEstadoCoord3("");setValorCoord3("20");setAnguloCoord3("0");setReferenciaPolarCoord3("ultimo");};
    const add=()=>{
      const a=Number(valorCoord3.replace(",",".")),b=Number(anguloCoord3.replace(",","."));
      if(!Number.isFinite(a)||!Number.isFinite(b)){setEstadoCoord3("Introduce valores numéricos válidos.");return;}
      let p={x:a,y:b};
      if(modoCoord3==="relativas")p={x:last.x+a,y:last.y+b};
      if(modoCoord3==="polares"){
        const rad=b*Math.PI/180,base=referenciaPolarCoord3==="origen"?{x:0,y:0}:last;
        p={x:base.x+a*Math.cos(rad),y:base.y+a*Math.sin(rad)};
      }
      setPuntosCoord3(v=>[...v,p]);setCerradoCoord3(false);setEstadoCoord3(`Punto: ${p.x.toFixed(2)}, ${p.y.toFixed(2)}`);
    };
    const pts=puntosCoord3.map(p=>`${ox+p.x*k},${oy-p.y*k}`).join(" ");
    return !laboratorioCoordenadasAbierto ? <div className="mt-6 max-w-4xl rounded-xl border border-[#C6A15B]/40 bg-[#1B222C] text-[#E8EDF2] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Laboratorio interactivo compartido · Sesión 03</p><h4 className="mt-1 text-sm font-semibold">Construcción por coordenadas</h4><p className="mt-1 text-xs text-slate-400">Abre el espacio de trabajo independiente para practicar sin reducir el área de lectura.</p></div>
        <button type="button" onClick={()=>setLaboratorioCoordenadasAbierto(true)} className="shrink-0 rounded-lg bg-[#C6A15B] px-4 py-2.5 text-sm font-bold text-[#171C24]">Abrir laboratorio <span aria-hidden="true">↗</span></button>
      </div>
    </div> : <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-2 sm:p-4">
      <section className="flex max-h-[calc(100vh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#C6A15B]/40 bg-[#1B222C] text-[#E8EDF2] shadow-2xl sm:max-h-[calc(100vh-2rem)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#222B36] px-4 py-3 sm:px-5">
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-[#D8B979]">FADILAB · Sesión 03 · Laboratorio continuo</p><h4 className="text-base font-semibold">Construcción por coordenadas</h4><p className="mt-0.5 text-xs text-[#AAB7C5]">Un mismo plano para comparar los tres métodos sin salir de la lectura.</p></div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={reset} className="rounded-lg border border-white/15 bg-[#283442] px-3 py-2 text-xs text-[#D5DDE6]"><RotateCcw className="mr-1 inline size-3.5"/> Reiniciar práctica</button>
          <button type="button" onClick={()=>setLaboratorioCoordenadasAbierto(false)} className="rounded-lg border border-white/15 bg-[#283442] px-3 py-2 text-xs text-[#D5DDE6]">Cerrar laboratorio <span aria-hidden="true">×</span></button>
        </div>
      </header>
      {renderRhinoCommand("Polyline", "Construye el contorno con coordenadas absolutas, relativas o polares.")}
      <div className="min-h-0 overflow-y-auto p-3 sm:p-4">
        <div className="mb-4 rounded-xl border border-[#b79558]/40 bg-gold/5 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-[#D8B979]">Explicación del índice {paginaLectura+1}</p><span className="rounded-full bg-background px-2.5 py-1 text-[10px] font-semibold text-[#AAB7C5]">{metodoActual==="absolutas"?"Método 1 de 3":metodoActual==="relativas"?"Método 2 de 3":"Método 3 de 3"}</span></div>
          <h5 className="mt-1 text-sm font-semibold">{explicacion.titulo}</h5>
          <p className="mt-1 text-sm leading-6 text-[#D5DDE6]">{explicacion.texto}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center"><span className="text-[10px] font-semibold uppercase tracking-wide text-[#AAB7C5]">Sintaxis Rhino</span><code className="rounded-lg bg-[#171C24] px-3 py-2 text-sm font-bold text-[#E8EDF2]">{explicacion.ejemplo}</code></div>
          <p className="mt-2 text-xs leading-5 text-[#AAB7C5]">{explicacion.detalle}</p>
        </div>
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(290px,.8fr)]">
          <div className="flex min-h-[300px] min-w-0 flex-col overflow-hidden rounded-xl bg-[#17191d]">
            <div className="flex shrink-0 justify-between border-b border-white/10 px-3 py-2 text-[10px] text-white/70"><span>PLANO XY · VISTA SUPERIOR</span><span>{puntosCoord3.length-1} segmentos</span></div>
            <svg viewBox="0 0 500 340" className="h-[340px] w-full" role="img" aria-label="Plano cartesiano interactivo de coordenadas">
              {Array.from({length:21},(_,i)=><g key={i}><line x1={20+i*23} y1="8" x2={20+i*23} y2="332" stroke="#3b414a"/><line x1="8" y1={10+i*16} x2="492" y2={10+i*16} stroke="#3b414a"/></g>)}
              <line x1="8" y1={oy} x2="492" y2={oy} stroke="#aaa"/><line x1={ox} y1="8" x2={ox} y2="332" stroke="#aaa"/><text x="480" y={oy-7} fill="white" fontSize="10">X</text><text x={ox+8} y="18" fill="white" fontSize="10">Y</text>
              {puntosCoord3.length>1&&<polyline points={pts} fill={cerradoCoord3?"rgba(231,189,98,.14)":"none"} stroke="#e7bd62" strokeWidth="3" strokeLinejoin="round"/>}
              {cerradoCoord3&&<line x1={ox+last.x*k} y1={oy-last.y*k} x2={ox+puntosCoord3[0]!.x*k} y2={oy-puntosCoord3[0]!.y*k} stroke="#e7bd62" strokeWidth="3"/>}
              {puntosCoord3.map((p,i)=><g key={i}><circle cx={ox+p.x*k} cy={oy-p.y*k} r="4.5" fill={i===0?"#67d6a0":"#e7bd62"}/><text x={ox+p.x*k+7} y={oy-p.y*k-8} fill="white" fontSize="10">{i===0?"O":`P${i}`}</text></g>)}
            </svg>
            <p className="shrink-0 border-t border-white/10 px-3 py-2 text-[10px] text-white/70">Verde: origen · Dorado: puntos construidos · La geometría se conserva al cambiar de índice.</p>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="rounded-xl border border-white/10 p-3">
              <p className="mb-2 text-xs font-semibold">Método de entrada</p>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1">{(["absolutas","relativas","polares"] as const).map(m=><button key={m} type="button" onClick={()=>{setModoCoord3(m);setEstadoCoord3("");}} className={`rounded-lg px-1 py-2 text-[11px] font-semibold capitalize ${modoCoord3===m?"bg-[#394653] text-[#F4D18A] shadow-sm":"text-slate-400"}`}>{m}</button>)}</div>
              {modoCoord3==="polares" && <div className="mt-3"><p className="mb-1.5 text-[10px] font-semibold text-slate-400">Punto de referencia</p><div className="grid grid-cols-2 gap-1 rounded-lg bg-white/5 p-1"><button type="button" onClick={()=>setReferenciaPolarCoord3("origen")} className={`rounded-md px-2 py-2 text-[11px] font-semibold ${referenciaPolarCoord3==="origen"?"bg-[#394653] text-[#F4D18A] shadow-sm":"text-slate-400"}`}>Desde origen</button><button type="button" onClick={()=>setReferenciaPolarCoord3("ultimo")} className={`rounded-md px-2 py-2 text-[11px] font-semibold ${referenciaPolarCoord3==="ultimo"?"bg-[#394653] text-[#F4D18A] shadow-sm":"text-slate-400"}`}>Desde último punto</button></div></div>}
              <p className="mt-3 mb-2 text-xs font-semibold">{modoCoord3==="polares"?"Distancia / ángulo":modoCoord3==="relativas"?"Desplazamiento ΔX / ΔY":"Posición X / Y"}</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] text-slate-400">{modoCoord3==="polares"?"Distancia":modoCoord3==="relativas"?"ΔX":"X"}<input value={valorCoord3} onChange={e=>setValorCoord3(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-white/10 bg-[#171C24] px-2 py-2.5 text-sm text-[#E8EDF2]"/></label>
                <label className="text-[10px] text-slate-400">{modoCoord3==="polares"?"Ángulo °":modoCoord3==="relativas"?"ΔY":"Y"}<input value={anguloCoord3} onChange={e=>setAnguloCoord3(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-white/10 bg-[#171C24] px-2 py-2.5 text-sm text-[#E8EDF2]"/></label>
              </div>
              <button type="button" onClick={add} className="mt-3 w-full rounded-lg bg-[#C6A15B] px-3 py-2.5 text-sm font-bold text-[#171C24]">Añadir punto</button>
              <button type="button" onClick={()=>{if(puntosCoord3.length<3){setEstadoCoord3("Añade al menos tres puntos");return;}setCerradoCoord3(true);setEstadoCoord3("Contorno cerrado");}} className="mt-2 w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold">Cerrar contorno</button>
            </div>
            <div className="rounded-xl border border-white/10 p-3 text-xs"><div className="flex flex-wrap justify-between gap-2"><b>Último punto</b><span className="font-mono">{last.x.toFixed(2)}, {last.y.toFixed(2)}</span></div><p className="mt-2 min-h-5 text-slate-400" aria-live="polite">{estadoCoord3||"Añade puntos y observa el trazado."}</p></div>
            <div className="rounded-xl border border-white/10 p-3 text-xs"><p className="font-semibold">Ejercicio guiado · Rectángulo 20 × 10</p><p className="mt-1 text-slate-400">{modoCoord3==="absolutas"?"Introduce los vértices (20,0), (20,10), (0,10) y (0,0), siempre medidos desde el origen.":modoCoord3==="relativas"?"Desde (0,0), introduce @20,0; @0,10; @-20,0; @0,-10. Cada desplazamiento parte del punto anterior.":referenciaPolarCoord3==="origen"?"Para practicar coordenadas polares absolutas, usa distancias y ángulos medidos desde el origen. Cambia a «Desde último punto» para construir lados consecutivos.":"Desde el último punto, introduce 20 a 0°, 10 a 90°, 20 a 180° y 10 a 270°. Así se completa el rectángulo."}</p></div>
          </div>
        </div>
      </div>
    </section></div>;
  };
  const renderLaboratorioSesion5 = () => {
    if (lecturaAbierta?.numero !== 5) return null;
    // El editor permanece montado aunque se oculte: cerrar no destruye el trabajo.
    const moduleByPage = [0, 0, 1, 2, 3, 4, 4, 5];
    const pageByModule = [1, 2, 3, 4, 5, 7];
    const activeModule = moduleByPage[paginaLectura] ?? 0;
    return <div className="space-y-3">
      {!laboratorioSesion5Abierto && <button type="button" onClick={() => setLaboratorioSesion5Abierto(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm font-semibold text-gold-deep hover:bg-gold/15"><Layers className="size-4" /> Mostrar NURBS Studio</button>}
      <div className={laboratorioSesion5Abierto ? "block" : "hidden"}>
        <LaboratorioCurvasNurbs
          activeModule={activeModule}
          onModuleChange={(nextModule) => setPaginaLectura(pageByModule[nextModule] ?? paginaLectura)}
          onClose={() => setLaboratorioSesion5Abierto(false)}
        />
      </div>
    </div>;
  };

  const renderLaboratorioRestricciones = () => {
    if (lecturaAbierta?.numero !== 3 || paginaLectura !== 5) return null;
    const retos = [
      { nombre: "Longitud exacta", distancia: 20, angulo: 0, texto: "Construye un segmento horizontal de 20 mm.", explicacion: "La distancia fija la longitud del segmento. Con 20 mm y 0°, el punto final queda 20 mm a la derecha del origen." },
      { nombre: "Dirección controlada", distancia: 15, angulo: 45, texto: "Construye un segmento de 15 mm con una dirección de 45°.", explicacion: "El ángulo define la dirección respecto al eje X positivo. A 45°, el segmento sube hacia la derecha." },
      { nombre: "Combina distancia y ángulo", distancia: 20, angulo: 135, texto: "Construye un segmento de 20 mm con una dirección de 135°.", explicacion: "La longitud permanece en 20 mm y la dirección de 135° apunta hacia arriba y a la izquierda." }
    ] as const;
    const reto = retos[retoRestricciones] ?? retos[0];
    const distancia = Math.max(0, Math.min(40, Number(distanciaRestricciones) || 0));
    const angulo = Number(anguloRestricciones) || 0;
    const datosCompletos = distanciaRestricciones.trim() !== "" && anguloRestricciones.trim() !== "" && Number.isFinite(Number(distanciaRestricciones)) && Number.isFinite(Number(anguloRestricciones));
    const rad = angulo * Math.PI / 180;
    const x2 = 250 + Math.cos(rad) * distancia * 9;
    const y2 = 285 - Math.sin(rad) * distancia * 9;
    const validar = () => {
      if (validadoRestricciones || !datosCompletos) return;
      const correcto = Math.abs(distancia - reto.distancia) < 0.01 && Math.abs((((angulo - reto.angulo) % 360) + 540) % 360 - 180) < 0.5;
      setValidadoRestricciones(true);
      if (correcto) setAciertosRestricciones(v => v + 1);
    };
    const siguiente = () => {
      if (retoRestricciones === retos.length - 1) {
        setLaboratorioRestriccionesAbierto(false);
        setRetoRestricciones(0);
        setValidadoRestricciones(false);
        setFaseRestricciones("aprendizaje");
      } else {
        setRetoRestricciones(v => v + 1);
        setDistanciaRestricciones("");
        setAnguloRestricciones("");
        setValidadoRestricciones(false);
      }
    };
    const reiniciar = () => {
      setRetoRestricciones(0); setDistanciaRestricciones(""); setAnguloRestricciones("");
      setValidadoRestricciones(false); setAciertosRestricciones(0); setFaseRestricciones("aprendizaje");
    };
    if (!laboratorioRestriccionesAbierto) return <section className="mt-7 rounded-2xl border border-[#C6A15B]/40 bg-gradient-to-br from-[#211b11] via-[#151b22] to-[#10151b] text-slate-100 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#D8B979]">Recurso interactivo · Sesión 03</p><h4 className="mt-1 text-base font-semibold">Laboratorio de distancia y ángulo</h4><p className="mt-1 text-sm text-slate-400">Aprende a controlar la longitud y dirección de cada segmento.</p></div><button type="button" onClick={() => { reiniciar(); setLaboratorioRestriccionesAbierto(true); }} className="inline-flex items-center gap-2 rounded-xl bg-[#C6A15B] px-4 py-3 text-sm font-semibold text-[#171C24]"><ArrowRight className="size-4"/> Abrir laboratorio</button></div>
    </section>;
    return <div className="fixed inset-0 z-[102] overflow-hidden bg-[#1B222C]/95 p-2 backdrop-blur-sm sm:p-3"><section className="mx-auto flex h-[calc(100dvh-1rem)] max-w-[min(96vw,1500px)] flex-col overflow-hidden rounded-2xl border border-[#C6A15B]/40 bg-[#1B222C] shadow-2xl sm:h-[calc(100dvh-1.5rem)]">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#1B222C]/95 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#D8B979]">Laboratorio de restricciones · Sesión 03</p><h4 className="font-semibold text-white">Controla distancia y ángulo</h4></div><div className="flex items-center gap-2"><span className="hidden text-xs text-slate-400 sm:inline">Aciertos: {aciertosRestricciones}/3</span><button type="button" onClick={reiniciar} className="rounded-lg border border-white/10 bg-[#283442] px-3 py-2 text-xs text-[#D5DDE6]"><RotateCcw className="mr-1 inline size-3.5"/> Reiniciar</button><button type="button" onClick={() => setLaboratorioRestriccionesAbierto(false)} className="rounded-lg border border-white/15 bg-[#283442] px-3 py-2 text-xs font-medium text-slate-100 hover:border-[#D8B979]/60">Volver a la lectura</button></div></header>
      {renderRhinoCommand("Line", "Define la longitud y dirección del segmento mediante restricciones.")}
      {faseRestricciones === "aprendizaje" ? <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"><div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-[#C6A15B]/40 bg-[#C6A15B]/10 p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-[#D8B979]">Primero aprende · Después practica</p><h3 className="mt-1 text-xl font-semibold text-white">¿Qué controlan la distancia y el ángulo?</h3><p className="mt-2 text-sm leading-6 text-slate-300">La distancia determina cuánto mide un segmento. El ángulo determina hacia qué dirección se dibuja respecto al eje X positivo del plano de construcción. Al combinar ambos valores puedes definir con precisión el punto final.</p><p className="mt-2 text-sm font-medium text-slate-200">No son lo mismo que las coordenadas cartesianas: aquí describes el desplazamiento mediante una longitud y una dirección.</p></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2"><article className="rounded-xl border border-white/10 p-4"><div className="flex h-28 items-center justify-center rounded-lg bg-[#171C24]"><svg viewBox="0 0 260 110" className="h-full w-full"><path d="M35 65 H220" stroke="#e7bd62" strokeWidth="4"/><path d="M35 53 V77 M220 53 V77" stroke="#fff" strokeWidth="1.5"/><path d="M35 42 H220" stroke="#67d6a0" strokeWidth="1.5" strokeDasharray="4 4"/><text x="112" y="32" fill="#67d6a0" fontSize="13">20 mm</text></svg></div><h4 className="mt-3 font-semibold text-white">Distancia = longitud</h4><p className="mt-1 text-sm text-slate-400">Un segmento de 20 mm conserva esa medida aunque cambies su orientación.</p></article>
        <article className="rounded-xl border border-white/10 p-4"><div className="flex h-28 items-center justify-center rounded-lg bg-[#171C24]"><svg viewBox="0 0 260 110" className="h-full w-full"><path d="M35 82 H225" stroke="#69717d" strokeWidth="1.5"/><path d="M35 82 L170 18" stroke="#67d6a0" strokeWidth="4"/><path d="M75 82 A40 40 0 0 0 71 63" fill="none" stroke="#e7bd62" strokeWidth="2"/><text x="83" y="70" fill="#e7bd62" fontSize="13">45°</text></svg></div><h4 className="mt-3 font-semibold text-white">Ángulo = dirección</h4><p className="mt-1 text-sm text-slate-400">El ángulo establece la inclinación del segmento respecto al eje X positivo.</p></article></div>
        <div className="mt-4 rounded-xl border border-white/10 p-4"><h4 className="font-semibold text-white">Referencia de ángulos en el plano XY</h4><div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">{[["0°","Derecha"],["90°","Arriba"],["180°","Izquierda"],["270°","Abajo"]].map(([a,b])=><div key={a} className="rounded-lg border border-white/10 bg-[#222B36] p-3 text-center"><b className="text-slate-100">{a}</b><p className="text-xs text-slate-400">{b}</p></div>)}</div><p className="mt-3 text-xs leading-5 text-slate-400">En Rhino, las restricciones se aplican durante la introducción de puntos según el comando activo. La simulación permite comprender el efecto geométrico de los valores; no ejecuta comandos reales de Rhino.</p></div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-400">Ahora modifica los valores y observa cómo cambia el segmento.</p><button type="button" onClick={()=>{setRetoRestricciones(0);setDistanciaRestricciones("");setAnguloRestricciones("");setAciertosRestricciones(0);setValidadoRestricciones(false);setFaseRestricciones("practica");}} className="rounded-xl bg-[#C6A15B] px-5 py-3 text-sm font-semibold text-[#171C24]">Comenzar práctica <ArrowRight className="ml-1 inline size-4"/></button></div>
      </div></div> : <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-2 sm:p-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(330px,.8fr)]">
        <div className="flex min-h-[260px] min-w-0 flex-col overflow-hidden rounded-xl bg-[#171C24]"><div className="flex justify-between border-b border-white/10 px-3 py-2 text-[10px] text-white/70"><span>PLANO XY · CONSTRUCCIÓN DE SEGMENTOS</span><span>RETO {retoRestricciones+1}/3</span></div><svg viewBox="0 0 600 420" className="min-h-0 w-full flex-1" role="img" aria-label="Segmento con distancia y ángulo ajustables"><defs><pattern id="restricciones-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#343a43" strokeWidth="1"/></pattern></defs><rect width="600" height="420" fill="url(#restricciones-grid)"/><path d="M25 285H575 M250 25V395" stroke="#9ca3af" strokeWidth="1.5"/><circle cx="250" cy="285" r="6" fill="#e7bd62"/><path d={`M250 285L${x2} ${y2}`} stroke="#67d6a0" strokeWidth="4"/><circle cx={x2} cy={y2} r="7" fill="#67d6a0"/><text x="265" y="307" fill="white" fontSize="13">Inicio</text><text x={Math.min(520,Math.max(260,x2+10))} y={Math.max(30,y2-12)} fill="#67d6a0" fontSize="13">Final</text><path d={`M305 285 A55 55 0 0 0 ${305+Math.cos(rad)*55} ${285-Math.sin(rad)*55}`} fill="none" stroke="#e7bd62" strokeWidth="2"/><text x="315" y="270" fill="#e7bd62" fontSize="13">{angulo}°</text></svg><p className="border-t border-white/10 px-3 py-2 text-[10px] text-white/70">Amarillo: inicio · Verde: segmento y punto final · La cuadrícula representa el plano XY</p></div>
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1"><div className="rounded-xl border border-white/10 p-4"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ejercicio {retoRestricciones+1} de 3</span><h3 className="mt-2 font-semibold">{reto.texto}</h3><div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs text-slate-400">Distancia (mm)<input type="number" min="0" max="40" step="1" value={distanciaRestricciones} placeholder="Introduce mm" disabled={validadoRestricciones} onChange={e=>setDistanciaRestricciones(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-[#111820] px-3 py-3 text-base text-white placeholder:text-slate-500 focus:border-[#D8B979] focus:outline-none"/></label><label className="text-xs text-slate-400">Ángulo (°)<input type="number" min="-360" max="360" step="1" value={anguloRestricciones} placeholder="Introduce °" disabled={validadoRestricciones} onChange={e=>setAnguloRestricciones(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-[#111820] px-3 py-3 text-base text-white placeholder:text-slate-500 focus:border-[#D8B979] focus:outline-none"/></label></div><button type="button" disabled={validadoRestricciones || !datosCompletos} onClick={validar} className="mt-3 w-full rounded-xl bg-[#C6A15B] px-4 py-3 text-sm font-semibold text-[#171C24] disabled:opacity-50">Comprobar ejercicio</button>{validadoRestricciones&&<div className="mt-3 rounded-xl border border-white/10 bg-[#222B36] p-3 text-sm text-slate-100"><b>{Math.abs(distancia-reto.distancia)<0.01 && Math.abs((((angulo-reto.angulo)%360)+540)%360-180)<0.5?"¡Correcto!":"Todavía no coincide"}</b><p className="mt-1 text-slate-400">{Math.abs(distancia-reto.distancia)<0.01 && Math.abs((((angulo-reto.angulo)%360)+540)%360-180)<0.5 ? reto.explicacion : "Revisa qué representa la longitud y qué representa la dirección. Ajusta tus valores y vuelve a intentarlo."}</p><button type="button" onClick={()=>{if(Math.abs(distancia-reto.distancia)<0.01 && Math.abs((((angulo-reto.angulo)%360)+540)%360-180)<0.5){siguiente();}else{setDistanciaRestricciones("");setAnguloRestricciones("");setValidadoRestricciones(false);}}} className="mt-3 w-full rounded-lg bg-[#C6A15B] px-4 py-2.5 font-semibold text-[#171C24]">{Math.abs(distancia-reto.distancia)<0.01 && Math.abs((((angulo-reto.angulo)%360)+540)%360-180)<0.5 ? (retoRestricciones===2?"Finalizar laboratorio":"Siguiente ejercicio") : "Intentar de nuevo"} <ArrowRight className="ml-1 inline size-4"/></button></div>}</div><div className="rounded-xl border border-white/10 p-3"><div className="flex justify-between text-xs"><b>Progreso</b><span>{aciertosRestricciones}/3 aciertos</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#111820]"><div className="h-full bg-[#C6A15B]" style={{width:((retoRestricciones+(validadoRestricciones?1:0))/3*100)+"%"}}/></div></div></div>
      </div>}
    </section></div>;
  };

  const renderLaboratorioOsnap = () => {
    if (lecturaAbierta?.numero !== 3 || paginaLectura !== 6) return null;
    const retos = [
      {snap:"End",nombre:"Extremo",pregunta:"Necesitas comenzar una línea exactamente donde termina esta curva.",explicacion:"End captura el punto final exacto de una curva o arista.",opciones:["Near","End","Mid","Cen"],figura:"end"},
      {snap:"Mid",nombre:"Punto medio",pregunta:"Quieres colocar un punto justo a la mitad de este segmento.",explicacion:"Mid localiza el punto medio exacto entre los extremos.",opciones:["End","Int","Mid","Quad"],figura:"mid"},
      {snap:"Cen",nombre:"Centro",pregunta:"Necesitas iniciar un círculo concéntrico usando el centro del círculo existente.",explicacion:"Cen captura el centro geométrico de un círculo o arco.",opciones:["Cen","Tan","Near","Point"],figura:"cen"},
      {snap:"Int",nombre:"Intersección",pregunta:"Debes capturar el punto exacto donde se cruzan estas dos curvas.",explicacion:"Int captura el cruce exacto entre dos curvas.",opciones:["Perp","End","Int","Mid"],figura:"int"},
      {snap:"Perp",nombre:"Perpendicular",pregunta:"Quieres que una línea desde este punto llegue formando 90° con la curva.",explicacion:"Perp encuentra una posición que establece una relación perpendicular con la curva.",opciones:["Tan","Perp","Quad","Near"],figura:"perp"},
      {snap:"Tan",nombre:"Tangente",pregunta:"Necesitas iniciar una curva que toque al círculo sin cortarlo, siguiendo su dirección tangente.",explicacion:"Tan captura una posición tangente a un círculo o arco.",opciones:["Cen","Int","Tan","End"],figura:"tan"},
      {snap:"Quad",nombre:"Cuadrante",pregunta:"Necesitas capturar el punto más alto del círculo, alineado con el eje vertical.",explicacion:"Quad captura uno de los cuatro puntos cardinales de un círculo o arco.",opciones:["Mid","Quad","Point","Perp"],figura:"quad"},
      {snap:"Near",nombre:"Cercano",pregunta:"Quieres situar el cursor sobre cualquier punto de esta curva, sin exigir un punto geométrico definido.",explicacion:"Near captura el punto más cercano disponible sobre la curva.",opciones:["Near","Int","Cen","End"],figura:"near"},
      {snap:"Point",nombre:"Punto",pregunta:"Debes seleccionar exactamente el objeto de punto que ya existe en el dibujo.",explicacion:"Point captura un objeto de punto situado en el espacio de trabajo.",opciones:["End","Point","Tan","Mid"],figura:"point"}
    ] as const;
    const reto=retos[retoOsnap] ?? retos[0];
    const responder=(opcion:string)=>{if(respuestaOsnap!==null)return;setRespuestaOsnap(opcion);if(opcion===reto.snap)setAciertosOsnap(v=>v+1);};
    const siguiente=()=>{if(respuestaOsnap!==reto.snap){setRespuestaOsnap(null);return;}if(retoOsnap===retos.length-1){setLaboratorioOsnapAbierto(false);setRetoOsnap(0);setRespuestaOsnap(null);return;}setRetoOsnap(v=>v+1);setRespuestaOsnap(null);};
    const reiniciar=()=>{setRetoOsnap(0);setRespuestaOsnap(null);setAciertosOsnap(0);setFaseOsnap("aprendizaje");};
    if(!laboratorioOsnapAbierto)return <section className="mt-7 rounded-2xl border border-[#C6A15B]/40 bg-gradient-to-br from-[#211b11] via-[#151b22] to-[#10151b] text-slate-100 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#D8B979]">Recurso interactivo · Sesión 03</p><h4 className="mt-1 text-base font-semibold">Entrenador Osnap</h4><p className="mt-1 text-sm text-slate-400">Practica cómo elegir referencias geométricas exactas en Rhino.</p></div><button type="button" onClick={()=>setLaboratorioOsnapAbierto(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#C6A15B] px-4 py-3 text-sm font-semibold text-[#171C24]"><ArrowRight className="size-4"/> Abrir laboratorio</button></div>
    </section>;
    return <div className="fixed inset-0 z-[100] overflow-hidden bg-[#1B222C]/95 p-2 text-slate-100 backdrop-blur-sm sm:p-3"><section className="mx-auto flex h-[calc(100dvh-1rem)] max-w-[min(96vw,1500px)] flex-col overflow-hidden rounded-2xl border border-[#C6A15B]/40 bg-[#1B222C] shadow-2xl sm:h-[calc(100dvh-1.5rem)]">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#1B222C]/95 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#D8B979]">Entrenador Osnap · Sesión 03</p><h4 className="font-semibold">Encuentra la referencia exacta</h4></div><div className="flex items-center gap-2"><span className="hidden text-xs text-slate-400 sm:inline">Aciertos: {aciertosOsnap}/{retos.length}</span><button type="button" onClick={reiniciar} className="rounded-lg border border-white/10 bg-[#283442] px-3 py-2 text-xs text-[#D5DDE6]"><RotateCcw className="mr-1 inline size-3.5"/> Reiniciar</button><button type="button" onClick={()=>setLaboratorioOsnapAbierto(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs">Volver a la lectura</button></div></header>
      {renderRhinoCommand("Line", "Utiliza referencias geométricas exactas para colocar puntos.")}
      {faseOsnap === "aprendizaje" ? <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5 rounded-2xl border border-[#C6A15B]/40 bg-[#C6A15B]/10 p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#D8B979]">Primero aprende · Después practica</p>
            <h3 className="mt-1 text-xl font-semibold">¿Qué es Osnap y para qué sirve?</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Osnap (Object Snap) permite capturar ubicaciones geométricas exactas de objetos existentes. En lugar de colocar el cursor “a ojo”, Rhino lo ajusta a referencias precisas para construir y conectar geometría correctamente.</p>
            <p className="mt-2 text-sm font-medium text-slate-200">Activa únicamente las referencias que necesitas. Demasiadas capturas activas pueden producir puntos no deseados.</p>
          </div>
          <h3 className="mb-3 text-base font-semibold">Conoce las 9 referencias principales</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["End","Extremo","Captura el inicio o final exacto de una curva o segmento.","Úsalo para continuar una línea desde el final de otra."],
              ["Mid","Punto medio","Localiza el punto situado exactamente a mitad de una curva o segmento.","Úsalo para centrar elementos o dividir distancias en dos."],
              ["Cen","Centro","Captura el centro geométrico de un círculo, arco o elipse.","Úsalo para crear círculos concéntricos o ubicar el centro de una piedra."],
              ["Int","Intersección","Captura el punto exacto donde se cruzan dos curvas o aristas.","Úsalo para localizar cruces y construir desde ellos."],
              ["Perp","Perpendicular","Localiza una posición que genera una relación de 90° respecto a una curva.","Úsalo para levantar líneas perpendiculares a un borde."],
              ["Tan","Tangente","Captura una posición donde una curva toca a un círculo o arco sin cortarlo.","Úsalo para enlazar perfiles curvos suavemente."],
              ["Quad","Cuadrante","Captura uno de los cuatro puntos cardinales de un círculo o arco.","Úsalo para ubicar la parte superior, inferior y los laterales de un círculo."],
              ["Near","Cercano","Captura el punto más cercano disponible sobre una curva.","Úsalo cuando necesitas apoyar una geometría en cualquier lugar de una curva."],
              ["Point","Punto","Captura un objeto de punto que ya existe en el documento.","Úsalo para reutilizar puntos de construcción colocados previamente."]
            ].map(([codigo,nombre,definicion,uso])=><article key={codigo} className="rounded-xl border border-white/10 bg-[#222B36] p-4">
              <div className="flex items-center gap-2"><span className="rounded-lg bg-[#C6A15B]/15 px-2.5 py-1 font-mono text-sm font-bold text-[#D8B979]">{codigo}</span><h4 className="font-semibold">{nombre}</h4></div>
              <p className="mt-3 text-sm leading-5 text-slate-300">{definicion}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400"><span className="font-semibold text-slate-200">En joyería:</span> {uso}</p>
            </article>)}
          </div>
          <div className="mt-5 rounded-xl border border-white/10 p-4">
            <h4 className="font-semibold">Cómo utilizar Osnap en Rhino</h4>
            <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm text-slate-300">
              <li>Activa Osnap en la barra de estado de Rhino.</li>
              <li>Marca la referencia que necesitas: End, Mid, Cen, etc.</li>
              <li>Inicia un comando como Línea o Círculo.</li>
              <li>Acerca el cursor al objeto y espera a que aparezca el indicador de captura.</li>
              <li>Comprueba el nombre de la referencia antes de hacer clic.</li>
            </ol>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">Ahora que conoces las referencias, identifica cuál corresponde a cada situación.</p>
            <button type="button" onClick={()=>{setRetoOsnap(0);setRespuestaOsnap(null);setAciertosOsnap(0);setFaseOsnap("practica");}} className="rounded-xl bg-[#C6A15B] px-5 py-3 text-sm font-semibold text-[#171C24]">Comenzar práctica <ArrowRight className="ml-1 inline size-4"/></button>
          </div>
        </div>
      </div> : <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-2 sm:p-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(350px,.8fr)]">
        <div className="flex min-h-[260px] min-w-0 flex-col overflow-hidden rounded-xl bg-[#171C24]"><div className="flex shrink-0 justify-between border-b border-white/10 px-3 py-2 text-[10px] text-white/70"><span>ÁREA DE DIBUJO · REFERENCIAS GEOMÉTRICAS</span><span>RETO {retoOsnap+1} / {retos.length}</span></div>
          <svg viewBox="0 0 600 420" className="min-h-0 w-full flex-1" role="img" aria-label={"Ejercicio visual de referencia " + reto.nombre}>
            <defs><pattern id="osnap-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#343a43" strokeWidth="1"/></pattern></defs>
            <rect width="600" height="420" fill="url(#osnap-grid)"/>
            {reto.figura==="end"&&<><path d="M130 300 L300 120 L470 300" fill="none" stroke="#d5d9df" strokeWidth="4" strokeLinecap="round"/><circle cx="470" cy="300" r="8" fill="#e7bd62"/><text x="483" y="293" fill="white" fontSize="14">Extremo</text></>}
            {reto.figura==="mid"&&<><path d="M130 210 L470 210" stroke="#d5d9df" strokeWidth="4"/><circle cx="130" cy="210" r="6" fill="#e7bd62"/><circle cx="470" cy="210" r="6" fill="#e7bd62"/><circle cx="300" cy="210" r="9" fill="#67d6a0"/><path d="M300 160 V260" stroke="#67d6a0" strokeDasharray="5 5"/><text x="314" y="190" fill="white" fontSize="14">Mitad</text></>}
            {reto.figura==="cen"&&<><circle cx="300" cy="210" r="130" fill="none" stroke="#d5d9df" strokeWidth="4"/><circle cx="300" cy="210" r="8" fill="#67d6a0"/><path d="M300 210 L390 120" stroke="#e7bd62" strokeDasharray="6 5"/><text x="314" y="235" fill="white" fontSize="14">Centro</text></>}
            {reto.figura==="int"&&<><path d="M120 330 L480 90 M120 90 L480 330" stroke="#d5d9df" strokeWidth="4" fill="none"/><circle cx="300" cy="210" r="9" fill="#67d6a0"/><path d="M300 210 V370" stroke="#67d6a0" strokeDasharray="5 5"/><text x="314" y="198" fill="white" fontSize="14">Cruce</text></>}
            {reto.figura==="perp"&&<><path d="M90 270 Q300 70 510 270" stroke="#d5d9df" strokeWidth="4" fill="none"/><path d="M300 170 V350" stroke="#e7bd62" strokeWidth="3" strokeDasharray="7 5"/><path d="M300 170 L330 170 L330 200" stroke="#67d6a0" strokeWidth="3" fill="none"/><circle cx="300" cy="170" r="8" fill="#67d6a0"/><text x="318" y="150" fill="#67d6a0" fontSize="14" fontWeight="bold">Perpendicular · 90°</text><text x="318" y="190" fill="white" fontSize="12">Referencia</text></>}
            {reto.figura==="tan"&&<><circle cx="300" cy="210" r="115" fill="none" stroke="#d5d9df" strokeWidth="4"/><path d="M415 70 V350" stroke="#e7bd62" strokeWidth="3" strokeDasharray="7 5"/><circle cx="415" cy="210" r="8" fill="#67d6a0"/><path d="M300 210 L415 210" stroke="#67d6a0" strokeDasharray="5 5"/><text x="430" y="195" fill="#67d6a0" fontSize="14" fontWeight="bold">Tangente</text><text x="430" y="215" fill="white" fontSize="12">Punto de contacto</text></>}
            {reto.figura==="quad"&&<><circle cx="300" cy="210" r="125" fill="none" stroke="#d5d9df" strokeWidth="4"/><path d="M300 60 V360 M150 210 H450" stroke="#59616d" strokeDasharray="6 5"/><circle cx="300" cy="85" r="9" fill="#67d6a0"/><text x="314" y="78" fill="white" fontSize="14">90°</text><text x="320" y="105" fill="#67d6a0" fontSize="14" fontWeight="bold">Cuadrante superior</text></>}
            {reto.figura==="near"&&<><path d="M100 290 C170 50 420 70 500 290" stroke="#d5d9df" strokeWidth="5" fill="none"/><circle cx="355" cy="145" r="8" fill="#67d6a0"/><path d="M355 145 L390 110" stroke="#e7bd62" strokeDasharray="5 5"/><text x="370" y="140" fill="#67d6a0" fontSize="14" fontWeight="bold">Punto cercano</text><text x="390" y="165" fill="white" fontSize="12">Sobre la curva</text></>}
            {reto.figura==="point"&&<><circle cx="180" cy="270" r="7" fill="#d5d9df"/><circle cx="300" cy="150" r="10" fill="#67d6a0"/><circle cx="430" cy="280" r="7" fill="#d5d9df"/><text x="315" y="145" fill="#67d6a0" fontSize="14" fontWeight="bold">Objeto de punto</text><text x="315" y="165" fill="white" fontSize="12">Referencia Point</text></>}
          </svg><p className="shrink-0 border-t border-white/10 px-3 py-2 text-[10px] text-white/70">Verde: referencia que debes identificar · Gris: geometría</p>
        </div>
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
          <div className="rounded-xl border border-white/10 p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">¿Qué Osnap necesitas?</span><span className="text-xs font-mono">{retoOsnap+1}/{retos.length}</span></div><p className="mt-3 text-base font-semibold leading-snug">{reto.pregunta}</p><div className="mt-4 grid grid-cols-2 gap-2">{reto.opciones.map(op=><button key={op} type="button" disabled={respuestaOsnap!==null} onClick={()=>responder(op)} className={"rounded-xl border px-3 py-3 text-sm font-semibold transition "+(respuestaOsnap===op?(op===reto.snap?"border-emerald-500 bg-emerald-500/10 text-emerald-200":"border-red-400 bg-red-400/10 text-red-200"):respuestaOsnap===reto.snap&&op===reto.snap?"border-emerald-500 bg-emerald-500/10 text-emerald-200":"border-white/10 hover:border-gold/60 hover:bg-[#C6A15B]/5")}>{op}</button>)}</div>
          {respuestaOsnap!==null&&<div className="mt-4 rounded-xl bg-[#222B36] p-3 text-sm"><p className="font-semibold">{respuestaOsnap===reto.snap?"¡Correcto!":"No es esa referencia"}</p><p className="mt-1 text-slate-400">{respuestaOsnap===reto.snap?reto.explicacion:"Pista: vuelve a leer la situación y observa qué parte de la geometría debes localizar. Piensa si necesitas un extremo, un punto intermedio, el centro, un cruce o una relación con la curva. La referencia correcta no se mostrará hasta que aciertes."}</p><button type="button" onClick={siguiente} className="mt-3 w-full rounded-lg bg-[#C6A15B] px-4 py-2.5 font-semibold text-[#171C24]">{respuestaOsnap!==reto.snap?"Intentar de nuevo":retoOsnap===retos.length-1?"Finalizar práctica":"Siguiente reto"} <ArrowRight className="ml-1 inline size-4"/></button></div>}
          </div>
          <div className="rounded-xl border border-white/10 p-3"><div className="flex items-center justify-between"><b className="text-xs">Progreso</b><span className="text-xs text-slate-400">{aciertosOsnap} aciertos</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#222B36]"><div className="h-full rounded-full bg-[#C6A15B] transition-all" style={{width:((retoOsnap+1)/retos.length*100)+"%"}}/></div><p className="mt-2 text-[11px] text-slate-400">Resuelve los nueve retos para practicar las referencias principales de Rhino.</p></div>
        </div>
      </div>}
    </section></div>;
  };

  const renderLaboratorioSmartTrack = () => {
    if (lecturaAbierta?.numero !== 3 || paginaLectura !== 7) return null;
    const retos = [
      { nombre: "Alineación horizontal", pregunta: "Ya capturaste un punto de referencia. Necesitas colocar el siguiente punto a la misma altura, manteniendo la coordenada Y.", correcta: "Horizontal", explicacion: "La guía horizontal conserva la misma altura (Y) del punto de referencia y ayuda a mantener una alineación paralela al eje X.", tipo: "horizontal" },
      { nombre: "Alineación vertical", pregunta: "Necesitas ubicar el siguiente punto directamente encima del punto de referencia, manteniendo su coordenada X.", correcta: "Vertical", explicacion: "La guía vertical conserva la misma posición X del punto de referencia y ayuda a mantener una alineación paralela al eje Y.", tipo: "vertical" },
      { nombre: "Cruce de guías", pregunta: "Dos puntos de referencia generan una guía horizontal y otra vertical. ¿Qué representa el cruce de ambas?", correcta: "Intersección", explicacion: "El cruce de las guías temporales permite localizar una posición relacionada con ambos puntos de referencia, sin dibujar líneas auxiliares permanentes.", tipo: "cruce" }
    ] as const;
    const reto = retos[retoSmartTrack] ?? retos[0];
    const responder = (opcion: string) => {
      if (respuestaSmartTrack !== null) return;
      setRespuestaSmartTrack(opcion);
      if (opcion === reto.correcta) setAciertosSmartTrack(v => v + 1);
    };
    const siguiente = () => {
      if (respuestaSmartTrack !== reto.correcta) {
        setRespuestaSmartTrack(null);
        return;
      }
      if (retoSmartTrack === retos.length - 1) {
        setLaboratorioSmartTrackAbierto(false);
        setRetoSmartTrack(0);
        setRespuestaSmartTrack(null);
        setFaseSmartTrack("aprendizaje");
      } else {
        setRetoSmartTrack(v => v + 1);
        setRespuestaSmartTrack(null);
      }
    };
    const reiniciar = () => { setRetoSmartTrack(0); setRespuestaSmartTrack(null); setAciertosSmartTrack(0); setFaseSmartTrack("aprendizaje"); };
    if (!laboratorioSmartTrackAbierto) return <section className="mt-7 rounded-2xl border border-[#C6A15B]/40 bg-gradient-to-br from-[#211b11] via-[#151b22] to-[#10151b] text-slate-100 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#D8B979]">Recurso interactivo · Sesión 03</p><h4 className="mt-1 text-base font-semibold">Simulador SmartTrack</h4><p className="mt-1 text-sm text-slate-400">Practica alineaciones temporales usando puntos de referencia.</p></div><button type="button" onClick={() => { reiniciar(); setLaboratorioSmartTrackAbierto(true); }} className="inline-flex items-center gap-2 rounded-xl bg-[#C6A15B] px-4 py-3 text-sm font-semibold text-[#171C24]"><ArrowRight className="size-4"/> Abrir simulador</button></div>
    </section>;
    return <div className="fixed inset-0 z-[101] overflow-hidden bg-[#1B222C]/95 p-2 text-slate-100 backdrop-blur-sm sm:p-3"><section className="mx-auto flex h-[calc(100dvh-1rem)] max-w-[min(96vw,1500px)] flex-col overflow-hidden rounded-2xl border border-[#C6A15B]/40 bg-[#1B222C] shadow-2xl sm:h-[calc(100dvh-1.5rem)]">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#1B222C]/95 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#D8B979]">Simulador SmartTrack · Sesión 03</p><h4 className="font-semibold">Alinea con guías temporales</h4></div><div className="flex items-center gap-2"><span className="hidden text-xs text-slate-400 sm:inline">Aciertos: {aciertosSmartTrack}/{retos.length}</span><button type="button" onClick={reiniciar} className="rounded-lg border border-white/10 bg-[#283442] px-3 py-2 text-xs text-[#D5DDE6]"><RotateCcw className="mr-1 inline size-3.5"/> Reiniciar</button><button type="button" onClick={() => setLaboratorioSmartTrackAbierto(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs">Volver a la lectura</button></div></header>
      {renderRhinoCommand("Line", "Traza segmentos con guías temporales de alineación.")}
      {faseSmartTrack === "aprendizaje" ? <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5 rounded-2xl border border-[#C6A15B]/40 bg-[#C6A15B]/10 p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#D8B979]">Primero aprende · Después practica</p>
            <h3 className="mt-1 text-xl font-semibold">¿Qué es SmartTrack?</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">SmartTrack muestra guías de alineación temporales en el área de dibujo de Rhino. Estas guías aparecen al mover el cursor tomando como referencia puntos que has adquirido; ayudan a colocar nuevos puntos alineados sin tener que dibujar líneas auxiliares que luego debas borrar.</p>
            <p className="mt-2 text-sm font-medium">SmartTrack no sustituye a Osnap: Osnap captura una referencia geométrica exacta y SmartTrack utiliza esas referencias para facilitar alineaciones temporales.</p>
          </div>
          <h3 className="mb-3 text-base font-semibold">Aprende a reconocer las tres relaciones</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-xl border border-white/10 bg-[#222B36] p-4">
              <div className="mb-3 flex h-28 items-center justify-center rounded-lg bg-[#171C24]"><svg viewBox="0 0 220 100" className="h-full w-full"><circle cx="45" cy="50" r="6" fill="#e7bd62"/><path d="M45 50 H195" stroke="#67d6a0" strokeWidth="3" strokeDasharray="7 5"/><circle cx="155" cy="50" r="6" fill="#67d6a0"/></svg></div>
              <h4 className="font-semibold">Horizontal</h4><p className="mt-2 text-sm leading-5 text-slate-300">El nuevo punto conserva la misma altura del punto de referencia. La coordenada Y permanece constante y cambia X.</p><p className="mt-2 text-xs text-slate-400">En joyería: alinear dos extremos a la misma altura para mantener recto un borde.</p>
            </article>
            <article className="rounded-xl border border-white/10 bg-[#222B36] p-4">
              <div className="mb-3 flex h-28 items-center justify-center rounded-lg bg-[#171C24]"><svg viewBox="0 0 220 100" className="h-full w-full"><circle cx="110" cy="82" r="6" fill="#e7bd62"/><path d="M110 82 V12" stroke="#67d6a0" strokeWidth="3" strokeDasharray="7 5"/><circle cx="110" cy="30" r="6" fill="#67d6a0"/></svg></div>
              <h4 className="font-semibold">Vertical</h4><p className="mt-2 text-sm leading-5 text-slate-300">El nuevo punto conserva la misma posición X del punto de referencia. La coordenada X permanece constante y cambia Y.</p><p className="mt-2 text-xs text-slate-400">En joyería: mantener alineados verticalmente el centro y la base de un elemento.</p>
            </article>
            <article className="rounded-xl border border-white/10 bg-[#222B36] p-4">
              <div className="mb-3 flex h-28 items-center justify-center rounded-lg bg-[#171C24]"><svg viewBox="0 0 220 100" className="h-full w-full"><circle cx="48" cy="75" r="6" fill="#e7bd62"/><circle cx="172" cy="20" r="6" fill="#e7bd62"/><path d="M48 75 H172 V20" stroke="#67d6a0" strokeWidth="3" strokeDasharray="7 5"/><circle cx="172" cy="75" r="6" fill="#f4d27f"/></svg></div>
              <h4 className="font-semibold">Intersección de guías</h4><p className="mt-2 text-sm leading-5 text-slate-300">El cruce de una guía horizontal y otra vertical indica una posición relacionada con dos referencias adquiridas.</p><p className="mt-2 text-xs text-slate-400">En joyería: localizar una posición a partir de dos alineaciones para ubicar un detalle.</p>
            </article>
          </div>
          <div className="mt-5 rounded-xl border border-[#C6A15B]/40 bg-[#222B36] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#D8B979]">Demostración guiada</p>
            <h4 className="mt-1 font-semibold">Observa cómo se construye una alineación</h4>
            <p className="mt-1 text-sm text-slate-400">Avanza paso a paso: primero adquiere una referencia, después mueve el cursor y finalmente utiliza la guía temporal.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["1. Adquirir punto","2. Mover cursor","3. Alinear y confirmar"].map((paso,idx)=><button key={paso} type="button" onClick={()=>setPasoDemoSmartTrack(idx)} aria-pressed={pasoDemoSmartTrack===idx} className={"rounded-lg border px-3 py-2 text-xs font-semibold "+(pasoDemoSmartTrack===idx?"border-gold bg-[#C6A15B]/15 text-[#D8B979]":"border-white/10 text-slate-400 hover:border-gold/50")}>{paso}</button>)}
            </div>
            <div className="mt-3 overflow-hidden rounded-xl bg-[#171C24]">
              <svg viewBox="0 0 600 220" className="h-48 w-full" role="img" aria-label={["Punto de referencia adquirido","Cursor desplazado y guía horizontal temporal visible","Cursor alineado sobre la guía temporal"][pasoDemoSmartTrack]}>
                <defs><pattern id="smarttrack-demo-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#343a43" strokeWidth="1"/></pattern></defs>
                <rect width="600" height="220" fill="url(#smarttrack-demo-grid)"/>
                <circle cx="130" cy="110" r="9" fill="#e7bd62"/>
                <text x="130" y="140" textAnchor="middle" fill="#f3d58e" fontSize="13">Referencia</text>
                {pasoDemoSmartTrack>=1&&<><path d="M130 110H490" stroke="#67d6a0" strokeWidth="3" strokeDasharray="9 7"/><text x="310" y="92" textAnchor="middle" fill="#67d6a0" fontSize="13">Guía horizontal temporal</text><path d="M390 110V185" stroke="#7c8796" strokeWidth="2" strokeDasharray="5 6"/></>}
                {pasoDemoSmartTrack===0&&<text x="350" y="180" textAnchor="middle" fill="#c4c9d1" fontSize="14">Acerca el cursor a un punto Osnap</text>}
                {pasoDemoSmartTrack===1&&<><circle cx="390" cy="155" r="8" fill="#f4d27f"/><text x="410" y="160" fill="#f4d27f" fontSize="13">Cursor</text></>}
                {pasoDemoSmartTrack===2&&<><circle cx="390" cy="110" r="9" fill="#67d6a0"/><text x="410" y="115" fill="#67d6a0" fontSize="13">Punto alineado</text><path d="M390 110V185" stroke="#7c8796" strokeWidth="2" strokeDasharray="5 6"/></>}
              </svg>
            </div>
            <p className="mt-2 text-sm text-slate-300">{["El punto amarillo representa una referencia geométrica adquirida mediante Osnap. SmartTrack toma ese punto como origen de una posible alineación.","Al desplazar el cursor, aparece una guía horizontal temporal que conserva la altura de la referencia. La línea discontinua no es geometría permanente.","Cuando el cursor coincide con la guía, puedes confirmar esa posición. No necesitas dibujar ni borrar una línea auxiliar."][pasoDemoSmartTrack]}</p>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" disabled={pasoDemoSmartTrack===0} onClick={()=>setPasoDemoSmartTrack(v=>Math.max(0,v-1))} className="rounded-lg border border-white/10 px-3 py-2 text-xs disabled:opacity-40">Anterior</button>
              <button type="button" onClick={()=>setPasoDemoSmartTrack(v=>(v+1)%3)} className="rounded-lg bg-[#C6A15B] px-3 py-2 text-xs font-semibold text-[#171C24]">{pasoDemoSmartTrack===2?"Repetir demostración":"Siguiente paso"}</button>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-white/10 p-4">
            <h4 className="font-semibold">Cómo trabajar con SmartTrack en Rhino</h4>
            <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm text-slate-300">
              <li>Activa SmartTrack en la barra de estado de Rhino.</li>
              <li>Activa en Osnap las referencias que realmente necesitas.</li>
              <li>Acerca el cursor a un punto exacto para adquirirlo como referencia.</li>
              <li>Mueve el cursor y observa las guías temporales horizontales o verticales.</li>
              <li>Cuando la alineación sea correcta, confirma el punto. No necesitas crear líneas auxiliares.</li>
            </ol>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">Ya conoces cómo se generan las guías. Ahora identifica cada relación en tres situaciones.</p>
            <button type="button" onClick={()=>{setRetoSmartTrack(0);setRespuestaSmartTrack(null);setAciertosSmartTrack(0);setFaseSmartTrack("practica");}} className="rounded-xl bg-[#C6A15B] px-5 py-3 text-sm font-semibold text-[#171C24]">Comenzar práctica <ArrowRight className="ml-1 inline size-4"/></button>
          </div>
        </div>
      </div> : <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-2 sm:p-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(350px,.8fr)]">
        <div className="flex min-h-[260px] min-w-0 flex-col overflow-hidden rounded-xl bg-[#171C24]"><div className="flex shrink-0 justify-between border-b border-white/10 px-3 py-2 text-[10px] text-white/70"><span>PLANO XY · GUÍAS TEMPORALES</span><span>RETO {retoSmartTrack + 1} / {retos.length}</span></div>
          <svg viewBox="0 0 600 420" className="min-h-0 w-full flex-1" role="img" aria-label={"Ejemplo visual de " + reto.nombre}>
            <defs><pattern id="smarttrack-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#343a43" strokeWidth="1"/></pattern></defs><rect width="600" height="420" fill="url(#smarttrack-grid)"/>{respuestaSmartTrack !== reto.correcta && <><circle cx="190" cy="205" r="9" fill="#e7bd62"/><circle cx="420" cy="120" r="9" fill="#e7bd62"/><text x="300" y="385" textAnchor="middle" fill="#9ca3af" fontSize="14">Identifica la relación entre las referencias</text></>}
            {respuestaSmartTrack === reto.correcta && reto.tipo === "horizontal" && <><circle cx="190" cy="205" r="9" fill="#e7bd62"/><path d="M190 205 H520" stroke="#67d6a0" strokeWidth="3" strokeDasharray="9 7"/><path d="M190 205 V350" stroke="#7c8796" strokeWidth="2" strokeDasharray="5 7"/><circle cx="420" cy="205" r="9" fill="#67d6a0"/><text x="175" y="185" fill="white" fontSize="14">Referencia</text><text x="430" y="190" fill="#67d6a0" fontSize="14">Cursor alineado</text></>}
            {respuestaSmartTrack === reto.correcta && reto.tipo === "vertical" && <><circle cx="300" cy="310" r="9" fill="#e7bd62"/><path d="M300 310 V55" stroke="#67d6a0" strokeWidth="3" strokeDasharray="9 7"/><path d="M300 310 H500" stroke="#7c8796" strokeWidth="2" strokeDasharray="5 7"/><circle cx="300" cy="115" r="9" fill="#67d6a0"/><text x="315" y="330" fill="white" fontSize="14">Referencia</text><text x="315" y="110" fill="#67d6a0" fontSize="14">Cursor alineado</text></>}
            {respuestaSmartTrack === reto.correcta && reto.tipo === "cruce" && <><circle cx="180" cy="300" r="9" fill="#e7bd62"/><circle cx="420" cy="120" r="9" fill="#e7bd62"/><path d="M180 300 H420 M420 120 V300" stroke="#67d6a0" strokeWidth="3" strokeDasharray="9 7"/><circle cx="420" cy="300" r="10" fill="#f4d27f"/><path d="M420 300 L500 350" stroke="#f4d27f" strokeDasharray="5 5"/><text x="145" y="330" fill="white" fontSize="14">Referencia 1</text><text x="430" y="115" fill="white" fontSize="14">Referencia 2</text><text x="435" y="290" fill="#f4d27f" fontSize="14">Cruce</text></>}
          </svg><p className="shrink-0 border-t border-white/10 px-3 py-2 text-[10px] text-white/70">Amarillo: puntos de referencia · Verde: guías temporales · No se crean curvas auxiliares</p>
        </div>
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1"><div className="rounded-xl border border-white/10 p-4"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Identifica la relación de alineación</span><p className="mt-3 text-base font-semibold leading-snug">{reto.pregunta}</p><div className="mt-4 grid grid-cols-1 gap-2">{["Horizontal","Vertical","Intersección"].map(op => <button key={op} type="button" disabled={respuestaSmartTrack !== null} onClick={() => responder(op)} className={"rounded-xl border px-3 py-3 text-sm font-semibold transition " + (respuestaSmartTrack === op ? (op === reto.correcta ? "border-emerald-500 bg-emerald-500/10 text-emerald-200" : "border-red-400 bg-red-400/10 text-red-200") : respuestaSmartTrack !== null && op === reto.correcta ? "border-emerald-500 bg-emerald-500/10 text-emerald-200" : "border-white/10 hover:border-gold/60 hover:bg-[#C6A15B]/5")}>{op}</button>)}</div>
          {respuestaSmartTrack !== null && <div className="mt-4 rounded-xl bg-[#222B36] p-3 text-sm"><p className="font-semibold">{respuestaSmartTrack === reto.correcta ? "¡Correcto!" : "Todavía no. Inténtalo otra vez."}</p><p className="mt-1 text-slate-400">{respuestaSmartTrack === reto.correcta ? reto.explicacion : "Observa los puntos de referencia y piensa qué coordenada se mantiene constante o dónde se cruzan las guías. No pierdes el progreso."}</p><button type="button" onClick={siguiente} className="mt-3 w-full rounded-lg bg-[#C6A15B] px-4 py-2.5 font-semibold text-[#171C24]">{respuestaSmartTrack !== reto.correcta ? "Volver a intentar" : retoSmartTrack === retos.length - 1 ? "Finalizar simulador" : "Siguiente reto"} <ArrowRight className="ml-1 inline size-4"/></button></div>}
        </div><div className="rounded-xl border border-white/10 p-3"><div className="flex items-center justify-between"><b className="text-xs">Progreso</b><span className="text-xs text-slate-400">{aciertosSmartTrack} aciertos</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#222B36]"><div className="h-full rounded-full bg-[#C6A15B] transition-all" style={{width: ((retoSmartTrack + 1) / retos.length * 100) + "%"}}/></div><p className="mt-2 text-[11px] text-slate-400">Completa las tres situaciones para reconocer las alineaciones temporales.</p></div></div>
      </div>}
    </section></div>;
  };


  const renderLaboratorioPlaca = () => {
    if (lecturaAbierta?.numero !== 3 || paginaLectura !== 8) return null;
    const etapas = [
      { titulo: "Preparar el documento", texto: "Configura el archivo en milímetros, trabaja en la vista Superior y conserva el plano de construcción XY predeterminado.", pregunta: "¿Qué configuración corresponde a esta práctica?", opciones: ["Milímetros · Superior · plano XY", "Centímetros · Perspectiva · plano YZ", "Pulgadas · Frontal · plano XZ"], correcta: "Milímetros · Superior · plano XY", ayuda: "La práctica está definida en milímetros y se construye sobre el plano XY." },
      { titulo: "Construir con coordenadas cartesianas", texto: "Desde 0,0,0 introduce los desplazamientos relativos: @20,0,0; @0,10,0; @-20,0,0 y cierra la polilínea.", pregunta: "¿Qué dimensiones debe tener el rectángulo?", opciones: ["20 × 10 mm", "10 × 10 mm", "20 × 20 mm"], correcta: "20 × 10 mm", ayuda: "Los desplazamientos suman 20 mm en X y 10 mm en Y." },
      { titulo: "Repetir con coordenadas polares", texto: "Inicia otra polilínea en el origen. Introduce @20<0, @10<90, @20<180 y @10<270. El prefijo @ toma como referencia el último punto.", pregunta: "¿Qué indica @10<90?", opciones: ["10 mm a 90° desde el último punto", "10 mm desde el origen sobre el eje X", "Un ángulo de 10° y una distancia de 90 mm"], correcta: "10 mm a 90° desde el último punto", ayuda: "En coordenadas polares relativas, @ indica que la distancia y el ángulo parten del último punto." },
      { titulo: "Aplicar restricciones de distancia y ángulo", texto: "Durante el trazado, utiliza la restricción de distancia para mantener la longitud del segmento y la restricción angular para controlar su dirección. Confirma cada punto solo cuando ambos valores coincidan con el diseño.", pregunta: "¿Qué controla cada restricción?", opciones: ["Distancia: longitud del segmento; ángulo: dirección", "Distancia: color; ángulo: grosor", "Ambas cambian las unidades del documento"], correcta: "Distancia: longitud del segmento; ángulo: dirección", ayuda: "Las restricciones controlan la longitud y la dirección durante la entrada de puntos." },
      { titulo: "Localizar el centro con Osnap", texto: "Traza las dos diagonales de un rectángulo y utiliza Int para capturar exactamente su intersección.", pregunta: "¿Qué referencia captura el cruce de las diagonales?", opciones: ["Int", "End", "Mid"], correcta: "Int", ayuda: "Int corresponde a Intersección: captura el punto donde se cruzan las curvas." },
      { titulo: "Crear el círculo central", texto: "Con el punto de intersección como centro, dibuja un círculo de radio 3 mm. Comprueba el valor con una herramienta de medición.", pregunta: "¿Qué radio debe tener el círculo?", opciones: ["3 mm", "6 mm", "10 mm"], correcta: "3 mm", ayuda: "La consigna solicita radio 3 mm; el diámetro resultante es 6 mm." },
      { titulo: "Capturar y alinear referencias", texto: "Practica End para capturar extremos y Mid para capturar puntos medios. Después activa SmartTrack, adquiere una referencia con Osnap y desplaza el cursor para observar la guía temporal.", pregunta: "¿Qué combinación permite alinear sin crear una línea auxiliar permanente?", opciones: ["Osnap para adquirir el punto y SmartTrack para mostrar la guía", "SmartTrack para crear una curva definitiva", "End para medir el radio del círculo"], correcta: "Osnap para adquirir el punto y SmartTrack para mostrar la guía", ayuda: "Osnap captura la referencia exacta; SmartTrack muestra guías temporales de alineación." },
      { titulo: "Verificación final", texto: "Comprueba ambos rectángulos de 20 × 10 mm, el círculo de radio 3 mm y que toda la geometría esté en el plano esperado. Guarda el archivo como Sesion_03_Modelado_Preciso.3dm.", pregunta: "¿Cuál es el nombre solicitado para guardar el ejercicio?", opciones: ["Sesion_03_Modelado_Preciso.3dm", "Placa_Final.3dm", "Modelo_Rhino.3dm"], correcta: "Sesion_03_Modelado_Preciso.3dm", ayuda: "El nombre permite identificar el archivo como la práctica de modelado preciso de la Sesión 03." }
    ];
    const etapa = etapas[etapaPlaca]!;
    const validar = () => {
      if (respuestaPlaca === etapa.correcta) setEtapasPlacaCompletadas(prev => prev.includes(etapaPlaca) ? prev : [...prev, etapaPlaca]);
    };
    const reiniciar = () => { setEtapaPlaca(0); setRespuestaPlaca(""); setEtapasPlacaCompletadas([]); setMetodoPlaca("cartesiano"); };
    if (!laboratorioPlacaAbierto) return <section className="mt-7 rounded-2xl border border-[#C6A15B]/40 bg-gradient-to-br from-[#211b11] via-[#151b22] to-[#10151b] text-slate-100 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D8B979]">Práctica integradora · RHINO 7</p><h4 className="mt-2 text-lg font-semibold">Construcción de placa base para una joya</h4><p className="mt-1 text-sm text-slate-400">Integra coordenadas, Osnap, restricciones y SmartTrack en una secuencia guiada de ocho etapas.</p><p className="mt-2 text-xs text-slate-400">{etapasPlacaCompletadas.length}/8 etapas verificadas</p></div><button type="button" onClick={() => setLaboratorioPlacaAbierto(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#C6A15B] px-5 py-3 text-sm font-semibold text-[#171C24]"><BookOpenCheck className="size-4"/> Abrir práctica <ArrowRight className="size-4"/></button></div>
    </section>;
    return <section className="fixed inset-0 z-[105] h-[100dvh] overflow-y-auto bg-[#1B222C] text-slate-100" role="dialog" aria-modal="true" aria-label="Laboratorio integrador de placa base">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#222B36]/95 px-4 py-3 backdrop-blur"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#D8B979]">Laboratorio integrador · Sesión 03</p><h3 className="text-base font-semibold">Placa base para una joya</h3></div><button type="button" onClick={() => setLaboratorioPlacaAbierto(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold">Cerrar ✕</button></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#283442]"><div className="h-full bg-[#C6A15B] transition-all" style={{width: (etapasPlacaCompletadas.length/8*100)+"%"}}/></div><p className="mt-1 text-right text-[10px] text-slate-400">{etapasPlacaCompletadas.length} de 8 etapas verificadas</p></header>
      {renderRhinoCommand("Polyline", "Construye el perfil de la placa integrando coordenadas y referencias.")}
      <div className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-white/10 bg-[#171C24] p-3 text-white">
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-[#e7bd62]">Vista superior · esquema didáctico</span><span className="text-[10px] text-white/60">Unidades: mm</span></div>
          <svg viewBox="0 0 520 360" className="mt-3 w-full" role="img" aria-label="Esquema de placa rectangular de 20 por 10 milímetros, diagonales y círculo central">
            <defs><pattern id="placa-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#39414b" strokeWidth="1"/></pattern></defs>
            <rect width="520" height="360" fill="url(#placa-grid)"/>
            <g transform="translate(130 90) scale(12)">
              <rect x="0" y="0" width="20" height="10" fill="#e7bd62" fillOpacity=".12" stroke="#e7bd62" strokeWidth=".18"/>
              {etapaPlaca>=5&&<><path d="M0 0L20 10M20 0L0 10" stroke="#7db8e8" strokeWidth=".13" strokeDasharray=".35 .25"/><circle cx="10" cy="5" r="3" fill="#6fd1a1" fillOpacity=".2" stroke="#6fd1a1" strokeWidth=".18"/><circle cx="10" cy="5" r=".18" fill="#6fd1a1"/></>}
              {etapaPlaca>=6&&<><circle cx="0" cy="0" r=".22" fill="#e7bd62"/><circle cx="20" cy="0" r=".22" fill="#e7bd62"/><circle cx="10" cy="0" r=".22" fill="#e7bd62"/></>}
            </g>
            <g fill="#f4f4f5" fontSize="12"><text x="250" y="75" textAnchor="middle">20 mm</text><text x="105" y="155" textAnchor="middle">10 mm</text><text x="250" y="245" textAnchor="middle">{etapaPlaca>=5?"Centro · R 3 mm":"Rectángulo 20 × 10 mm"}</text></g>
            {etapaPlaca>=6&&<path d="M130 90H370" stroke="#67d6a0" strokeWidth="2" strokeDasharray="7 6"/>}
          </svg>
          <p className="mt-2 text-xs leading-5 text-white/80">La ilustración representa el resultado esperado de cada fase. No es una conexión con Rhino ni genera un archivo .3dm.</p>
        </div>
        <div className="rounded-2xl border border-white/10 p-4">
          <div className="flex flex-wrap gap-1.5">{etapas.map((item,i)=><button key={item.titulo} type="button" onClick={()=>{if(i<=Math.max(-1,...etapasPlacaCompletadas)+1){setEtapaPlaca(i);setRespuestaPlaca("");}}} className={"rounded-full border px-2.5 py-1 text-[10px] font-semibold "+(etapaPlaca===i?"border-gold bg-[#C6A15B]/15 text-[#D8B979]":etapasPlacaCompletadas.includes(i)?"border-emerald-300 bg-emerald-50 text-emerald-800":"border-white/10 text-slate-400")}>{i+1}{etapasPlacaCompletadas.includes(i)?" ✓":""}</button>)}</div>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-[#D8B979]">Etapa {etapaPlaca+1} de 8</p><h4 className="mt-1 text-lg font-semibold">{etapa.titulo}</h4><p className="mt-3 text-sm leading-6 text-slate-400">{etapa.texto}</p>
          {etapaPlaca===2&&<div className="mt-3 flex gap-2"><button type="button" onClick={()=>setMetodoPlaca("cartesiano")} className={"rounded-lg border px-3 py-2 text-xs "+(metodoPlaca==="cartesiano"?"border-gold bg-[#C6A15B]/10":"border-white/10")}>Cartesiano</button><button type="button" onClick={()=>setMetodoPlaca("polar")} className={"rounded-lg border px-3 py-2 text-xs "+(metodoPlaca==="polar"?"border-gold bg-[#C6A15B]/10":"border-white/10")}>Polar</button></div>}
          {etapaPlaca===2&&<div className="mt-2 rounded-lg bg-[#222B36] p-3 font-mono text-xs leading-6">{(metodoPlaca==="cartesiano"?["@20,0,0","@0,10,0","@-20,0,0","Cerrar polilínea"]:["@20<0","@10<90","@20<180","@10<270"]).map(v=><div key={v}>{v}</div>)}</div>}
          <div className="mt-5 rounded-xl border border-white/10 p-3"><p className="text-sm font-semibold">{etapa.pregunta}</p><div className="mt-3 space-y-2">{etapa.opciones.map(op=><button key={op} type="button" onClick={()=>setRespuestaPlaca(op)} className={"w-full rounded-lg border px-3 py-2.5 text-left text-sm "+(respuestaPlaca===op?"border-gold bg-[#C6A15B]/10":"border-white/10 hover:border-[#C6A15B]/40")}>{op}</button>)}</div><button type="button" disabled={!respuestaPlaca} onClick={validar} className="mt-3 w-full rounded-lg bg-[#C6A15B] px-4 py-2.5 text-sm font-semibold text-[#171C24] disabled:opacity-40">Comprobar etapa</button>{respuestaPlaca&&<p className={"mt-2 text-xs "+(respuestaPlaca===etapa.correcta?"text-emerald-200":"text-amber-200")}>{respuestaPlaca===etapa.correcta?"¡Correcto! "+etapa.ayuda:"No es correcto todavía. Revisa la explicación y vuelve a intentarlo."}</p>}</div>
          <div className="mt-4 flex flex-wrap justify-between gap-2"><button type="button" disabled={etapaPlaca===0} onClick={()=>{setEtapaPlaca(v=>v-1);setRespuestaPlaca("");}} className="rounded-lg border border-white/10 px-4 py-2 text-xs disabled:opacity-40">Anterior</button><button type="button" disabled={!etapasPlacaCompletadas.includes(etapaPlaca)||etapaPlaca===7} onClick={()=>{setEtapaPlaca(v=>v+1);setRespuestaPlaca("");}} className="rounded-lg bg-[#C6A15B] px-4 py-2 text-xs font-semibold text-[#171C24] disabled:opacity-40">Siguiente etapa <ArrowRight className="ml-1 inline size-3.5"/></button></div>
          {etapasPlacaCompletadas.length===8&&<div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900"><b>¡Práctica completada!</b><p className="mt-1">Has verificado las ocho etapas. Ejecuta la construcción en Rhino y guarda el archivo solicitado.</p><button type="button" onClick={reiniciar} className="mt-2 rounded-lg border border-emerald-700/30 px-3 py-2 text-xs font-semibold">Repetir práctica</button></div>}
        </div>
      </div>
    </section>;
  };

  const renderLaboratorioGeometria = () => {
    if (lecturaAbierta?.numero !== 2 || paginaLectura !== 1) return null;
    if (!laboratorioGeometriaAbierto) return <section className="mt-7 overflow-hidden rounded-2xl border border-[#C6A15B]/30 bg-gradient-to-br from-[#222B36] via-[#1D2630] to-[#171C24] p-5 text-white shadow-xl sm:p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#D8B979]">AURUM LAB · FADILAB · Sesión 02</p><h4 className="mt-1 text-xl font-semibold">GEOMETRY LAB · Rhino 7</h4><p className="mt-1 max-w-2xl text-sm leading-6 text-[#D0D8E0]">Identifica la estructura de una joya: puntos de referencia, curvas, superficies y sólidos. Aprende a distinguirlos antes de comenzar a modelar.</p><div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[#D0D8E0]">{["4 conceptos","Ejemplos visuales","Aplicación en joyería","Comprobación por módulo"].map(x=><span key={x} className="rounded-full border border-white/15 px-3 py-1.5">{x}</span>)}</div><p className="mt-3 text-xs text-[#D0D8E0]">{modulosGeometriaCompletados.length}/4 módulos dominados</p></div><button type="button" onClick={() => setLaboratorioGeometriaAbierto(true)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#C6A15B] px-5 py-3 text-sm font-bold text-[#171C24] shadow-lg transition hover:-translate-y-0.5 hover:brightness-105"><BookOpenCheck className="size-4"/> Iniciar Geometry Lab <ArrowRight className="size-4"/></button></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#354454]"><div className="h-full rounded-full bg-[#C6A15B] transition-all" style={{width:(modulosGeometriaCompletados.length/4*100)+"%"}}/></div></section>;
    const actividad = actividadesGeometria[moduloGeometria] ?? actividadesGeometria[0]!;
    const completados = modulosGeometriaCompletados.length;
    const fases = ["Aprende", "Analiza", "En joyería", "Comprueba"];
    const exploraciones = [
      [{label:"X · Y · Z",detail:"Los tres ejes permiten describir la ubicación del punto."},{label:"Punto",detail:"El punto marca una posición exacta; no tiene área ni volumen."},{label:"Origen",detail:"El origen (0,0,0) es la referencia desde la que se leen las coordenadas absolutas."}],
      [{label:"Línea",detail:"Tiene dos extremos y un único tramo recto."},{label:"Polilínea",detail:"Conecta varios segmentos en una sola curva."},{label:"Círculo",detail:"Es una curva cerrada: su inicio y su final coinciden."}],
      [{label:"Borde",detail:"El borde delimita la superficie y está formado por curvas."},{label:"Área",detail:"La superficie ocupa una región; no es solamente su contorno."},{label:"Control",detail:"Los puntos de control permiten modificar la forma de determinadas superficies."}],
      [{label:"Caras",detail:"Las caras forman el límite exterior del cuerpo."},{label:"Unión",detail:"Las superficies deben conectarse sin dejar aberturas."},{label:"Volumen",detail:"Un sólido cerrado encierra un volumen tridimensional."}],
    ];
    const retosJoyería = [
      [{label:"Ubicar el inicio de una curva",correct:true,detail:"Correcto: un punto sirve como referencia precisa."},{label:"Definir el color del oro",correct:false,detail:"El color es una propiedad del material, no una función geométrica."},{label:"Calcular el peso",correct:false,detail:"El peso depende del volumen, material y densidad."}],
      [{label:"Definir el recorrido del aro",correct:true,detail:"Correcto: una curva circular puede servir como trayectoria del aro."},{label:"Asignar el color de una gema",correct:false,detail:"El color corresponde al material o a la gema."},{label:"Crear el volumen de la montura",correct:false,detail:"Una curva por sí sola no define un volumen."}],
      [{label:"Crear la zona abombada de un colgante",correct:true,detail:"Correcto: una superficie puede representar esa zona con área y forma."},{label:"Marcar un punto de referencia",correct:false,detail:"Eso corresponde a un punto, no a una superficie."},{label:"Definir solo el contorno",correct:false,detail:"El contorno es una curva; la superficie es la región delimitada."}],
      [{label:"Representar el cuerpo macizo de una montura",correct:true,detail:"Correcto: un sólido cerrado representa un volumen."},{label:"Dibujar el contorno frontal",correct:false,detail:"Eso puede representarse con curvas."},{label:"Marcar el eje del anillo",correct:false,detail:"Un eje es una referencia lineal, no un sólido."}],
    ];
    const avanzarFase = () => { setFaseLaboratorioGeometria(v=>Math.min(3,v+1)); setRespuestaGeometria(""); setResultadoGeometria(null); setExploracionGeometria(""); setAplicacionGeometria(""); };
    return <section className="fixed inset-0 z-[100] flex h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none border-0 bg-[#171C24] text-[#E8EDF2]" role="dialog" aria-modal="true" aria-label="Laboratorio guiado de geometría">
      <div className="shrink-0 border-b border-white/10 bg-[#1D2630]/95 px-3 py-2.5 shadow-sm backdrop-blur sm:px-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#D8B979]">FADILAB · Sesión 02 · Rhino 7</p><h3 className="text-base font-semibold text-[#E8EDF2] sm:text-lg">Geometry Lab <span className="font-normal text-[#AAB7C5]">/ Geometría de una joya</span></h3><p className="mt-0.5 text-xs text-[#AAB7C5]">Módulo 0{moduloGeometria+1} de 04 · {actividad.titulo}</p></div><div className="flex shrink-0 items-center gap-2"><span className="rounded-full border border-white/15 bg-[#222B36] px-3 py-1.5 text-[11px] font-semibold text-[#D0D8E0]">{completados}/4 completados</span><button type="button" onClick={()=>{setModuloGeometria(0);setFaseLaboratorioGeometria(0);setRespuestaGeometria("");setResultadoGeometria(null);setExploracionGeometria("");setAplicacionGeometria("");setModulosGeometriaCompletados([]);}} className="rounded-lg border border-white/15 bg-[#222B36] px-3 py-2 text-xs font-semibold text-[#D0D8E0] transition hover:border-[#C6A15B] hover:bg-white/5">Reiniciar</button><button type="button" onClick={() => setLaboratorioGeometriaAbierto(false)} className="rounded-lg border border-white/15 bg-[#222B36] px-3 py-2 text-xs font-semibold text-[#D0D8E0] transition hover:border-[#C6A15B] hover:bg-white/5">Cerrar ✕</button></div></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#354454]"><div className="h-full rounded-full bg-[#C6A15B] transition-all" style={{width: (completados/4*100)+"%"}}/></div></div>
      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-2 overflow-hidden p-3 sm:gap-3 sm:p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{actividadesGeometria.map((item,indice) => <button key={item.titulo} type="button" onClick={() => {setModuloGeometria(indice);setFaseLaboratorioGeometria(0);setRespuestaGeometria("");setResultadoGeometria(null);setExploracionGeometria("");setAplicacionGeometria("");}} className={`rounded-xl border p-2.5 text-left transition sm:p-3 ${moduloGeometria===indice ? "border-[#C6A15B] bg-[#C6A15B]/15" : "border-white/10 bg-[#222B36] hover:border-[#C6A15B]"}`}><span className="block text-[10px] font-semibold uppercase tracking-wider text-[#AAB7C5]">Módulo 0${indice+1}</span><span className="mt-1 block text-sm font-semibold text-[#E8EDF2]">{item.titulo}</span><span className="mt-1 block text-[10px] text-[#AAB7C5]">{modulosGeometriaCompletados.includes(indice) ? "✓ Aprendido" : "Por aprender"}</span></button>)}</div>
        <div className="flex flex-wrap gap-2">{fases.map((fase,indice)=><button key={fase} type="button" onClick={()=>{if(indice<=faseLaboratorioGeometria){setFaseLaboratorioGeometria(indice);setRespuestaGeometria("");setResultadoGeometria(null);setExploracionGeometria("");setAplicacionGeometria("");}}} disabled={indice>faseLaboratorioGeometria} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${faseLaboratorioGeometria===indice ? "border-[#C6A15B] bg-[#C6A15B]/15 text-[#D8B979]" : indice<faseLaboratorioGeometria ? "border-[#65B995]/40 bg-[#65B995]/10 text-[#8AD4B4]" : "border-white/10 bg-[#222B36] text-[#AAB7C5]"}`}>{indice+1}. {fase}{indice<faseLaboratorioGeometria?" ✓":""}</button>)}</div>
        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden rounded-2xl border border-white/10 bg-[#222B36] p-3 shadow-sm lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-stretch lg:gap-4 lg:p-4">
          <div className="flex min-h-[180px] min-w-0 items-center justify-center rounded-xl border border-white/10 bg-[#171C24] p-3 shadow-inner sm:min-h-[210px] lg:min-h-0">
            {moduloGeometria===0 && <svg viewBox="0 0 240 160" className="h-[min(38vh,340px)] min-h-[180px] w-full max-w-2xl sm:min-h-[210px]" role="img" aria-label="Punto de referencia en los ejes X, Y y Z"><path d="M35 125 L120 145 L210 105 M120 145 L120 25" stroke="#8294A8" strokeWidth="1.5" fill="none"/><circle cx="120" cy="75" r="7" fill="#C6A15B"/><path d="M120 75 L120 145 M120 75 L35 125 M120 75 L210 35" stroke="#C6A15B" strokeDasharray="4 4" opacity=".7"/><text x="132" y="70" fill="#E8EDF2" fontSize="11">Punto</text><text x="214" y="108" fill="#AAB7C5" fontSize="9">X</text><text x="124" y="20" fill="#AAB7C5" fontSize="9">Z</text></svg>}
            {moduloGeometria===1 && <svg viewBox="0 0 240 160" className="h-44 w-full max-w-2xl sm:h-52 lg:h-[min(42vh,340px)]" role="img" aria-label="Ejemplos de líneas, polilíneas, círculo y rectángulo"><path d="M18 40 L95 40" stroke="#C6A15B" strokeWidth="3" fill="none"/><path d="M18 95 L55 65 L95 95" stroke="#AAB7C5" strokeWidth="3" fill="none"/><circle cx="155" cy="40" r="25" stroke="#C6A15B" strokeWidth="3" fill="none"/><rect x="130" y="76" width="50" height="42" stroke="#8294A8" strokeWidth="3" fill="none"/><g fill="#E8EDF2" fontSize="10"><text x="32" y="57">Línea</text><text x="24" y="112">Polilínea</text><text x="139" y="75">Círculo</text><text x="184" y="101">Rect.</text></g></svg>}
            {moduloGeometria===2 && <svg viewBox="0 0 240 160" className="h-44 w-full max-w-2xl sm:h-52 lg:h-[min(42vh,340px)]" role="img" aria-label="Superficie curva que representa una zona con área"><path d="M35 105 Q120 5 205 105 Q120 145 35 105Z" fill="#C6A15B" fillOpacity=".32" stroke="#D8B979" strokeWidth="2"/><path d="M35 105 Q120 70 205 105 M65 85 Q120 115 175 85 M90 63 Q120 130 150 63" fill="none" stroke="#D8B979" strokeOpacity=".75"/><text x="88" y="145" fill="#E8EDF2" fontSize="11">Zona con área</text></svg>}
            {moduloGeometria===3 && <svg viewBox="0 0 240 160" className="h-44 w-full max-w-2xl sm:h-52 lg:h-[min(42vh,340px)]" role="img" aria-label="Sólido tridimensional con volumen cerrado"><path d="M55 55 L135 25 L200 58 L118 90Z" fill="#C6A15B" fillOpacity=".9" stroke="#f8dfa0"/><path d="M55 55 L55 112 L118 145 L118 90Z" fill="#A98445" stroke="#f8dfa0"/><path d="M118 90 L200 58 L200 115 L118 145Z" fill="#765B35" stroke="#f8dfa0"/><text x="82" y="12" fill="#E8EDF2" fontSize="10">Volumen cerrado</text></svg>}
          </div>
          <div className="flex min-h-0 flex-col justify-center overflow-y-auto pr-1 text-[#E8EDF2]">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#D8B979]">Módulo 0${moduloGeometria+1} · {actividad.titulo} · {fases[faseLaboratorioGeometria]}</p>
            {faseLaboratorioGeometria===0 && <div className="mt-2 space-y-3"><h5 className="text-lg font-semibold">Primero, comprende el concepto</h5><p className="text-sm leading-6 text-[#AAB7C5]">{actividad.introduccion}</p><div className="rounded-xl border border-white/10 bg-[#171C24] p-3"><p className="text-xs font-semibold uppercase tracking-wide text-[#D8B979]">Ideas clave</p><ul className="mt-2 space-y-2">{actividad.claves.map(clave=><li key={clave} className="flex gap-2 text-sm leading-5"><span className="text-[#D8B979]">•</span>{clave}</li>)}</ul></div></div>}
            {faseLaboratorioGeometria===1 && <div className="mt-2 space-y-3"><h5 className="text-lg font-semibold">Explora y selecciona</h5><p className="text-sm text-[#AAB7C5]">{["¿Qué referencias ubican el punto?","Identifica cada tipo de curva.","¿Qué parte representa el área?","¿Qué convierte las caras en un sólido?"][moduloGeometria]}</p><div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{exploraciones[moduloGeometria]!.map(item=><button key={item.label} type="button" onClick={()=>setExploracionGeometria(item.label)} className={`rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition ${exploracionGeometria===item.label?"border-[#C6A15B] bg-[#C6A15B]/15 text-[#E8D3A5]":"border-white/10 bg-[#171C24] text-[#D0D8E0] hover:border-[#C6A15B]/60"}`}>{item.label}</button>)}</div>{exploracionGeometria && <div className="rounded-lg border border-[#C6A15B]/30 bg-[#C6A15B]/10 p-3 text-sm text-[#E8D3A5]">{exploraciones[moduloGeometria]!.find(item=>item.label===exploracionGeometria)?.detail}</div>}</div>}
            {faseLaboratorioGeometria===2 && <div className="mt-2 space-y-3"><h5 className="text-lg font-semibold">Decide cómo usarlo en joyería</h5><p className="text-sm text-[#AAB7C5]">{["¿Para qué usarías un punto al construir un anillo?","¿Qué geometría usarías como recorrido del aro?","¿Qué geometría define la zona abombada de un colgante?","¿Qué geometría representa el cuerpo macizo de una montura?"][moduloGeometria]}</p><div className="space-y-2">{retosJoyería[moduloGeometria]!.map(item=><button key={item.label} type="button" onClick={()=>setAplicacionGeometria(item.label)} className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition ${aplicacionGeometria===item.label?"border-[#C6A15B] bg-[#C6A15B]/15 text-[#E8D3A5]":"border-white/10 bg-[#171C24] text-[#D0D8E0] hover:border-[#C6A15B]/60"}`}>{item.label}</button>)}</div>{aplicacionGeometria && <div className={`rounded-lg border p-3 text-sm ${retosJoyería[moduloGeometria]!.find(item=>item.label===aplicacionGeometria)?.correct?"border-[#65B995]/40 bg-[#65B995]/10 text-[#8AD4B4]":"border-white/10 bg-[#171C24] text-[#AAB7C5]"}`}>{retosJoyería[moduloGeometria]!.find(item=>item.label===aplicacionGeometria)?.detail}</div>}</div>}
            {faseLaboratorioGeometria===3 && <div className="mt-2 space-y-3"><h5 className="text-lg font-semibold">{actividad.pregunta}</h5><p className="text-sm text-[#AAB7C5]">Ahora que ya conoces el concepto, selecciona la respuesta que mejor lo representa.</p><div className="space-y-2">{actividad.opciones.map(opcion=><button key={opcion.valor} type="button" onClick={()=>{setRespuestaGeometria(opcion.valor);setResultadoGeometria(null);}} className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition ${respuestaGeometria===opcion.valor ? "border-[#C6A15B] bg-[#C6A15B]/15" : "border-white/10 hover:border-[#C6A15B]"}`}>{opcion.texto}</button>)}</div><button type="button" disabled={!respuestaGeometria} onClick={()=>{const correcto=respuestaGeometria===actividad.correcta;setResultadoGeometria(correcto?"correcto":"incorrecto");if(correcto)setModulosGeometriaCompletados(prev=>prev.includes(moduloGeometria)?prev:[...prev,moduloGeometria]);}} className="w-full rounded-lg bg-[#C6A15B] px-4 py-2.5 text-sm font-semibold text-[#171C24] disabled:cursor-not-allowed disabled:opacity-40">Comprobar lo aprendido</button>{resultadoGeometria&&<div className={`rounded-lg border p-3 text-sm ${resultadoGeometria==="correcto"?"border-[#65B995]/40 bg-[#65B995]/10 text-[#8AD4B4]":"border-[#C6A15B]/40 bg-[#C6A15B]/10 text-[#E8D3A5]"}`}><p className="font-semibold">{resultadoGeometria==="correcto"?"¡Muy bien! Has comprendido este concepto.":"Vamos a repasarlo una vez más."}</p><p className="mt-1 leading-5">{resultadoGeometria==="correcto"?actividad.explicacion:"Vuelve a las fases Aprende y Observa para revisar la explicación. Después puedes intentarlo de nuevo."}</p></div>}</div>}
            <div className="mt-4 flex flex-wrap justify-between gap-2"><button type="button" disabled={faseLaboratorioGeometria===0} onClick={()=>{setFaseLaboratorioGeometria(v=>Math.max(0,v-1));setRespuestaGeometria("");setResultadoGeometria(null);setExploracionGeometria("");setAplicacionGeometria("");}} className="rounded-lg border border-white/10 bg-[#222B36] px-4 py-2 text-xs font-semibold text-[#D0D8E0] disabled:opacity-40">Anterior</button>{faseLaboratorioGeometria<3 ? <button type="button" disabled={(faseLaboratorioGeometria===1&&!exploracionGeometria)||(faseLaboratorioGeometria===2&&!retosJoyería[moduloGeometria]!.find(item=>item.label===aplicacionGeometria)?.correct)} onClick={avanzarFase} className="rounded-lg bg-[#C6A15B] px-4 py-2 text-xs font-semibold text-[#171C24]">Continuar <ArrowRight className="ml-1 inline size-3.5"/></button> : <button type="button" disabled={resultadoGeometria!=="correcto"||moduloGeometria===3} onClick={()=>{setModuloGeometria(v=>Math.min(3,v+1));setFaseLaboratorioGeometria(0);setRespuestaGeometria("");setResultadoGeometria(null);setExploracionGeometria("");setAplicacionGeometria("");}} className="rounded-lg bg-[#C6A15B] px-4 py-2 text-xs font-semibold text-[#171C24] disabled:opacity-40">Siguiente módulo <ArrowRight className="ml-1 inline size-3.5"/></button>}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#222B36] px-3 py-2.5"><p className="text-xs text-[#AAB7C5]">Laboratorio conceptual · No modifica geometría dentro de Rhino ni genera archivos .3dm.</p><span className="text-xs font-semibold text-[#D8B979]">{completados}/4 conceptos verificados</span></div>
        {completados===4 && <div className="rounded-xl border border-[#65B995]/40 bg-[#65B995]/10 p-4 text-sm text-[#8AD4B4]"><p className="font-semibold">¡Has completado el laboratorio!</p><p className="mt-1">Ya reconoces punto, curvas, superficies y sólidos, y sabes cómo se relacionan con el diseño de joyería.</p></div>}
      </div>
    </section>;
  };


  const renderLaboratorioCapas = () => {
    if (lecturaAbierta?.numero !== 2 || paginaLectura !== 7) return null;
    const ambasPiezasAsignadas = asignacionCapas.aro === "Metal 01" && asignacionCapas.piedra === "Gem 01";
    const reiniciar = () => {
      setCapaMetalVisible(true); setCapaGemVisible(true);
      setCapaMetalBloqueada(false); setCapaGemBloqueada(false);
      setObjetoSeleccionadoCapas(null); setCapaDestinoCapas("Metal 01");
      setPosicionObjetosCapas({ aro: { x: 0, y: 0 }, piedra: { x: 0, y: 0 } }); arrastreCapasRef.current = null;
      setAsignacionCapas({ aro: "", piedra: "" });
      setCapaPrincipalCapas(""); setMensajeCapaPrincipal("");
      setSolidosColocados([]); setFigurasDisponibles(["cubo","esfera","cilindro","cono","toroide"]); setSolidoSeleccionadoId(null); arrastreSolidoRef.current = null; setMensajeSolidos(""); siguienteSolidoId.current = 1;
      setRetoCapasCompletado(false); setRespuestaRetoCapas(""); setResultadoRetoCapas(null); setMostrarRetoCapasAlCerrar(false);
    };
    if (!laboratorioCapasAbierto) return <><section className="mt-7 rounded-2xl border border-[#b79558]/40 bg-gradient-to-br from-white via-[#fffefa] to-[#f7f3eb] text-[#24221e] p-5 sm:p-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#98743c]">Laboratorio interactivo · MatrixGold</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><h4 className="text-lg font-semibold">Practica con las capas de una joya</h4><p className="mt-1 text-sm text-[#68645c]">Experimenta con la visibilidad, el bloqueo y la asignación de objetos en un modelo didáctico.</p></div>
        <button type="button" onClick={() => setLaboratorioCapasAbierto(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-black shadow-sm transition hover:brightness-105"><Layers className="size-4"/> Iniciar práctica <ArrowRight className="size-4"/></button>
      </div>
    </section>{mostrarRetoCapasAlCerrar && <section className="mt-4 rounded-2xl border border-[#e6dcc9] bg-[#faf7f0] p-4 sm:p-5"><div className="rounded-xl border border-[#e6dcc9] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#98743c]">Reto de comprobación</p><h4 className="mt-1 text-sm font-semibold">Quieres proteger la piedra central para evitar seleccionarla, pero mantenerla visible. ¿Qué control debes activar?</h4><div className="mt-3 space-y-2">{[{v:"ojo",t:"Cerrar el ojo de Gem 01"},{v:"candado",t:"Activar el candado de Gem 01"},{v:"triangulo",t:"Asignar la piedra a Metal 01"}].map(o=><button key={o.v} type="button" onClick={()=>{setRespuestaRetoCapas(o.v);setResultadoRetoCapas(null);}} className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${respuestaRetoCapas===o.v?"border-gold bg-gold/10":"border-[#e8dfce] hover:border-[#c4a46a]"}`}>{o.t}</button>)}</div><button type="button" disabled={!respuestaRetoCapas} onClick={()=>{const ok=respuestaRetoCapas==="candado";setResultadoRetoCapas(ok?"correcto":"incorrecto");if(ok)setRetoCapasCompletado(true);}} className="mt-3 w-full rounded-lg bg-gold px-4 py-2.5 text-xs font-semibold text-black disabled:opacity-40">Comprobar respuesta</button>{resultadoRetoCapas&&<div className={`mt-3 rounded-lg border p-3 text-xs ${resultadoRetoCapas==="correcto"?"border-emerald-300 bg-emerald-50 text-emerald-900":"border-amber-300 bg-amber-50 text-amber-900"}`}><p className="font-semibold">{resultadoRetoCapas==="correcto"?"¡Correcto!":"Inténtalo otra vez."}</p><p className="mt-1">{resultadoRetoCapas==="correcto"?"El candado mantiene la piedra visible y evita seleccionarla directamente. El ojo controla la visibilidad de forma independiente.":"Recuerda: el ojo oculta; el candado impide seleccionar directamente."}</p></div>}</div>{retoCapasCompletado&&<div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900"><p className="font-semibold">¡Reto completado!</p><p className="mt-1 text-xs">Has distinguido correctamente visibilidad, bloqueo y asignación.</p></div>}</section>}</>;
    return <section className="fixed inset-0 z-[105] h-[100dvh] overflow-y-auto bg-background xl:overflow-hidden" role="dialog" aria-modal="true" aria-label="Laboratorio interactivo de capas MatrixGold">
      <header className="sticky top-0 z-20 border-b border-[#e8dfce] bg-[#fbfaf7]/95 px-4 py-3 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-3 px-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#98743c]">FADILAB · Sesión 2</p><h3 className="text-base font-semibold sm:text-lg">Laboratorio de capas · MatrixGold</h3></div><div className="flex shrink-0 items-center gap-2"><button type="button" onClick={reiniciar} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-2 text-xs font-medium text-[#776b58] hover:bg-[#faf6ed] hover:text-[#24221e]" title="Restablecer todos los elementos de la práctica"><RotateCcw size={13} /> Reiniciar</button><button type="button" onClick={() => { setLaboratorioCapasAbierto(false); setMostrarRetoCapasAlCerrar(true); }} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/5">Cerrar ✕</button></div></div>
      </header>
      {renderRhinoCommand("Layer", "Organiza los objetos mediante capas, visibilidad y bloqueo.")}
      <div className="grid w-full gap-2 p-2 lg:p-3 xl:h-[calc(100dvh-64px)] xl:min-h-0 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-stretch">
        <aside className="rounded-xl border border-[#45464b] bg-[#292a2f] p-2.5 text-white xl:h-full">
          <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold">Layers</span><span className="text-[10px] text-white/50">MatrixGold</span></div>
          <div className="mb-2 grid grid-cols-2 gap-1.5"><button type="button" disabled={!ambasPiezasAsignadas} title={ambasPiezasAsignadas ? "Ocultar las capas Metal 01 y Gem 01" : "Primero asigna el cuerpo a Metal 01 y la piedra a Gem 01"} onClick={()=>{setCapaMetalVisible(false);setCapaGemVisible(false);setObjetoSeleccionadoCapas(null);}} className="rounded border border-white/15 bg-white/5 py-1.5 text-[11px] disabled:cursor-not-allowed disabled:opacity-35">Hide</button><button type="button" disabled={!ambasPiezasAsignadas} title={ambasPiezasAsignadas ? "Mostrar las capas Metal 01 y Gem 01" : "Primero asigna el cuerpo a Metal 01 y la piedra a Gem 01"} onClick={()=>{setCapaMetalVisible(true);setCapaGemVisible(true);}} className="rounded border border-white/15 bg-white/5 py-1.5 text-[11px] disabled:cursor-not-allowed disabled:opacity-35">Show</button></div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {[
              {group:"Metal",name:"Metal 01",color:"#23865c",visible:capaMetalVisible,locked:capaMetalBloqueada,setVisible:setCapaMetalVisible,setLocked:setCapaMetalBloqueada},
              {group:"Gem",name:"Gem 01",color:"#244f9c",visible:capaGemVisible,locked:capaGemBloqueada,setVisible:setCapaGemVisible,setLocked:setCapaGemBloqueada},
              {group:"Object",name:"Object 01",color:"#a83b83"},{group:"User",name:"User 01",color:"#f04438"},
              {group:"Render",name:"Render 01",color:"#a5a5a5"},{group:"Extra A",name:"Extra A 01",color:"#ef8585"},
              {group:"Extra B",name:"Extra B 01",color:"#368d83"},{group:"Extra C",name:"Extra C 01",color:"#22b9b4"}
            ].map(layer=><div key={layer.group} className="min-w-0">
              <div className="mb-1 border-b border-white/15 pb-1 text-[10px] font-semibold text-white/75">{layer.group}</div>
              <div className={`flex min-h-8 items-center gap-1 rounded px-1 py-1 ${layer.setVisible ? "hover:bg-white/10" : "cursor-not-allowed opacity-45"}`}>
                <button type="button" title={!layer.setVisible ? "Control disponible en capas Metal y Gem" : !objetoSeleccionadoCapas ? "Primero selecciona una pieza directamente en la joya" : objetoSeleccionadoCapas === "aro" && layer.name !== "Metal 01" ? "El cuerpo del anillo debe asignarse a Metal 01" : objetoSeleccionadoCapas === "piedra" && layer.name !== "Gem 01" ? "La piedra central debe asignarse a Gem 01" : `Asignar ${objetoSeleccionadoCapas === "aro" ? "cuerpo del anillo" : "piedra central"} a ${layer.name}`} aria-label={!layer.setVisible ? "Asignación no disponible" : !objetoSeleccionadoCapas ? "Selecciona primero una pieza en la joya" : objetoSeleccionadoCapas === "aro" && layer.name !== "Metal 01" ? "El cuerpo del anillo debe asignarse a Metal 01" : objetoSeleccionadoCapas === "piedra" && layer.name !== "Gem 01" ? "La piedra central debe asignarse a Gem 01" : `Asignar objeto seleccionado a ${layer.name}`} disabled={!layer.setVisible || !objetoSeleccionadoCapas || (objetoSeleccionadoCapas === "aro" ? layer.name !== "Metal 01" : layer.name !== "Gem 01")} onClick={()=>{if(objetoSeleccionadoCapas && (objetoSeleccionadoCapas === "aro" ? layer.name === "Metal 01" : layer.name === "Gem 01")){setAsignacionCapas(prev=>({...prev,[objetoSeleccionadoCapas]:layer.name}));setObjetoSeleccionadoCapas(null);}}} className="rounded p-1 text-[11px] text-white/80 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30">▶</button>
                {layer.setVisible ? <button type="button" title={`Establecer ${layer.name} como capa principal`} aria-label={`Establecer ${layer.name} como capa principal`} aria-pressed={capaPrincipalCapas===layer.name} onClick={()=>{setCapaPrincipalCapas(layer.name);setMensajeCapaPrincipal(`«${layer.name}» ahora es la capa principal. Los objetos nuevos que crees se asignarán a esta capa de forma predeterminada. Los objetos existentes no cambian de capa, y su visibilidad y bloqueo permanecen igual.`);}} className="flex size-5 shrink-0 items-center justify-center rounded hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"><span className="size-3 rounded-none border border-white/20" style={{backgroundColor:layer.color}}/></button> : <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center"><span className="size-3 rounded-none border border-white/20" style={{backgroundColor:layer.color}}/></span>}
                <span className="min-w-0 flex-1 whitespace-normal break-words text-[11px] leading-4">{layer.name}</span>
                {layer.setLocked&&<button type="button" disabled={layer.name==="Metal 01" ? asignacionCapas.aro!=="Metal 01" : asignacionCapas.piedra!=="Gem 01"} title={layer.name==="Metal 01" ? (asignacionCapas.aro!=="Metal 01"?"Primero asigna el cuerpo del anillo a Metal 01":"Bloquear capa") : (asignacionCapas.piedra!=="Gem 01"?"Primero asigna la piedra a Gem 01":"Bloquear capa")} onClick={()=>{layer.setLocked(!layer.locked);if(!layer.locked){const capa=layer.name as "Metal 01"|"Gem 01";if(arrastreCapasRef.current?.objeto===(capa==="Metal 01"?"aro":"piedra"))arrastreCapasRef.current=null;if(arrastreSolidoRef.current&&solidosColocados.find(s=>s.id===arrastreSolidoRef.current?.id)?.capa===capa)arrastreSolidoRef.current=null;if(solidosColocados.some(s=>s.id===solidoSeleccionadoId&&s.capa===capa))setSolidoSeleccionadoId(null);}}} className="text-[11px] text-white/75 disabled:cursor-not-allowed disabled:opacity-30">{layer.locked?<Lock size={12}/>:<Unlock size={12}/>}</button>}
                {layer.setVisible&&<button type="button" disabled={layer.name==="Metal 01" ? asignacionCapas.aro!=="Metal 01" : asignacionCapas.piedra!=="Gem 01"} title={layer.name==="Metal 01" ? (asignacionCapas.aro!=="Metal 01"?"Primero asigna el cuerpo del anillo a Metal 01":"Ocultar o mostrar capa") : (asignacionCapas.piedra!=="Gem 01"?"Primero asigna la piedra a Gem 01":"Ocultar o mostrar capa")} onClick={()=>{if(layer.visible){setObjetoSeleccionadoCapas(null);if(solidosColocados.some(s=>s.id===solidoSeleccionadoId&&s.capa===layer.name))setSolidoSeleccionadoId(null);if(arrastreSolidoRef.current&&solidosColocados.find(s=>s.id===arrastreSolidoRef.current?.id)?.capa===layer.name)arrastreSolidoRef.current=null;}layer.setVisible(!layer.visible);}} className="text-[11px] text-white/75 disabled:cursor-not-allowed disabled:opacity-30">{layer.visible?"◉":"○"}</button>}
              </div>
            </div>)}
          </div>
          {mensajeCapaPrincipal && <p className="mt-2 rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-2.5 py-2 text-[10px] leading-4 text-emerald-100" role="status" aria-live="polite">{mensajeCapaPrincipal}</p>}
          <div className="mt-2 border-t border-white/15 pt-2"><p className="text-xs font-semibold text-white/85">Sólidos</p><p className="mt-1.5 text-[11px] leading-5 text-white/55">Arrastra una figura hasta la pantalla. Selecciona un sólido creado para moverlo o eliminarlo.</p><div className="mt-2 grid grid-cols-2 gap-1.5">{([{tipo:"cubo",nombre:"Cubo",icono:"◇"},{tipo:"esfera",nombre:"Esfera",icono:"●"},{tipo:"cilindro",nombre:"Cilindro",icono:"▱"},{tipo:"cono",nombre:"Cono",icono:"△"},{tipo:"toroide",nombre:"Toroide",icono:"◎"}] as const).filter(s=>figurasDisponibles.includes(s.tipo)).map(s=><button key={s.tipo} type="button" draggable onDragStart={e=>{e.dataTransfer.setData("application/x-aurum-solid",s.tipo);e.dataTransfer.effectAllowed="copy";}} onClick={()=>setMensajeSolidos(`Arrastra ${s.nombre} desde aquí hasta la pantalla de trabajo.`)} className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-left text-[11px] text-white/85 hover:bg-white/10"><span className="text-base leading-none">{s.icono}</span>{s.nombre}</button>)}</div>{solidoSeleccionadoId !== null && <div className="mt-2 rounded-lg border border-amber-200/30 bg-amber-300/10 p-2"><p className="text-[10px] font-semibold text-amber-100">Sólido seleccionado · #{solidoSeleccionadoId}</p><p className="mt-0.5 text-[10px] text-white/65">{solidosColocados.find(s=>s.id===solidoSeleccionadoId)?.tipo} · {solidosColocados.find(s=>s.id===solidoSeleccionadoId)?.capa}</p><p className="mt-1 text-[9px] text-white/50">Color de identificación: {solidosColocados.find(s=>s.id===solidoSeleccionadoId)?.capa==="Metal 01"?"verde":"azul"}</p><button type="button" onClick={()=>{const solido=solidosColocados.find(s=>s.id===solidoSeleccionadoId);if(!solido)return;const bloqueada=solido.capa==="Metal 01"?capaMetalBloqueada:capaGemBloqueada;if(bloqueada){setMensajeSolidos(`La capa ${solido.capa} está bloqueada. Desbloquéala para eliminar este sólido.`);return;}setSolidosColocados(prev=>prev.filter(s=>s.id!==solidoSeleccionadoId));setFigurasDisponibles(prev=>prev.includes(solido.tipo)?prev:[...prev,solido.tipo]);setSolidoSeleccionadoId(null);arrastreSolidoRef.current=null;setMensajeSolidos("Sólido eliminado.");}} disabled={solidoSeleccionadoId===null || (solidosColocados.find(s=>s.id===solidoSeleccionadoId)?.capa==="Metal 01"?capaMetalBloqueada:capaGemBloqueada)} className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-red-200/30 px-2.5 py-1.5 text-[10px] font-semibold text-red-100 hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={12}/> Eliminar sólido</button></div>}{mensajeSolidos&&<p className="mt-2 rounded-md bg-white/10 px-2 py-1.5 text-[10px] leading-4 text-white/75" role="status" aria-live="polite">{mensajeSolidos}</p>}</div>
          <p className="mt-2 border-t border-white/15 pt-2 text-[10px] leading-4 text-white/55">{ambasPiezasAsignadas ? "Las dos piezas ya están asignadas. Puedes usar Hide y Show para controlar ambas capas a la vez." : "Primero selecciona el cuerpo del anillo y asígnalo a Metal 01; después selecciona la piedra y asígnala a Gem 01. Cada capa habilitará sus controles al completar su asignación. Hide y Show generales se habilitarán cuando ambas estén asignadas."}</p>
        </aside>
        <main className="min-w-0 space-y-3 xl:flex xl:h-full xl:flex-col">
          <div className="relative rounded-2xl border border-white/10 bg-[#17191d] p-4 text-white xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
            <div className="mb-3 flex items-center justify-between gap-2"><span className="text-xs font-semibold text-white/80">Vista esquemática de la joya</span><span className="rounded-full bg-white/10 px-2 py-1 text-[10px]">Modelo didáctico</span></div>
            {objetoSeleccionadoCapas && <div className="pointer-events-none absolute left-1/2 top-12 z-10 w-[min(92%,360px)] -translate-x-1/2 rounded-xl border border-white/20 bg-[#111820]/95 px-3 py-2.5 text-center shadow-xl backdrop-blur-sm" role="status" aria-live="polite"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/60">Pieza seleccionada</p><p className="mt-0.5 text-xs font-semibold text-white">{objetoSeleccionadoCapas==="aro"?"Cuerpo del anillo":"Piedra central"}</p><div className="mt-1.5 flex items-center justify-center gap-2 text-[11px] font-semibold"><span className={`size-3 shrink-0 ${objetoSeleccionadoCapas==="aro"?"bg-[#23865c]":"bg-[#438bd5]"}`}/><span>Asignar a {objetoSeleccionadoCapas==="aro"?"Metal 01":"Gem 01"}</span></div><p className="mt-1 text-[9px] text-white/65">Pulsa el triángulo de esa capa</p></div>}
            <svg viewBox="0 0 520 390" className="h-auto max-h-[calc(100dvh-200px)] w-full touch-none select-none xl:flex-1 xl:min-h-0" role="img" aria-label="Anillo esquemático interactivo: selecciona una pieza y arrástrala; el candado impide mover las piezas de su capa" onPointerDown={e=>{if(e.target===e.currentTarget){setObjetoSeleccionadoCapas(null);arrastreCapasRef.current=null;}}} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="copy";}} onDrop={e=>{e.preventDefault();const tipo=e.dataTransfer.getData("application/x-aurum-solid") as "cubo"|"esfera"|"cilindro"|"cono"|"toroide";if(!tipo)return;if(!capaPrincipalCapas){setMensajeSolidos("Primero selecciona Metal 01 (verde) o Gem 01 (azul) como capa principal.");return;}const metal=capaPrincipalCapas==="Metal 01";if((metal&&capaMetalBloqueada)||(!metal&&capaGemBloqueada)){setMensajeSolidos(`La capa ${capaPrincipalCapas} está bloqueada. Desbloquéala antes de crear sólidos.`);return;}if((metal&&!capaMetalVisible)||(!metal&&!capaGemVisible)){setMensajeSolidos(`La capa ${capaPrincipalCapas} está oculta. Muéstrala antes de crear sólidos.`);return;}const rect=e.currentTarget.getBoundingClientRect();const x=Math.max(35,Math.min(485,(e.clientX-rect.left)*520/rect.width));const y=Math.max(35,Math.min(345,(e.clientY-rect.top)*390/rect.height));const color=metal?"#23865c":"#244f9c";setSolidosColocados(prev=>[...prev,{id:siguienteSolidoId.current++,tipo,x,y,color,capa:capaPrincipalCapas as "Metal 01"|"Gem 01"}]);setFigurasDisponibles(prev=>prev.filter(figura=>figura!==tipo));setMensajeSolidos(`${tipo.charAt(0).toUpperCase()+tipo.slice(1)} creado en ${capaPrincipalCapas}.`);}} onPointerMove={e=>{const drag=arrastreCapasRef.current;if(drag&&drag.pointerId===e.pointerId){const rect=e.currentTarget.getBoundingClientRect();const x=(e.clientX-rect.left)*520/rect.width;const y=(e.clientY-rect.top)*390/rect.height;const bloqueado=drag.objeto==="aro"?capaMetalBloqueada:capaGemBloqueada;if(bloqueado){arrastreCapasRef.current=null;return;}setPosicionObjetosCapas(prev=>({...prev,[drag.objeto]:{x:drag.origenX+x-drag.inicioX,y:drag.origenY+y-drag.inicioY}}));return;}const dragSolido=arrastreSolidoRef.current;if(!dragSolido||dragSolido.pointerId!==e.pointerId)return;const solido=solidosColocados.find(s=>s.id===dragSolido.id);if(!solido)return;const bloqueada=solido.capa==="Metal 01"?capaMetalBloqueada:capaGemBloqueada;if(bloqueada){arrastreSolidoRef.current=null;return;}const rect=e.currentTarget.getBoundingClientRect();const x=(e.clientX-rect.left)*520/rect.width;const y=(e.clientY-rect.top)*390/rect.height;setSolidosColocados(prev=>prev.map(s=>s.id===dragSolido.id?{...s,x:Math.max(25,Math.min(495,dragSolido.origenX+x-dragSolido.inicioX)),y:Math.max(25,Math.min(365,dragSolido.origenY+y-dragSolido.inicioY))}:s));}} onPointerUp={e=>{if(arrastreCapasRef.current?.pointerId===e.pointerId)arrastreCapasRef.current=null;if(arrastreSolidoRef.current?.pointerId===e.pointerId)arrastreSolidoRef.current=null;}} onPointerCancel={()=>{arrastreCapasRef.current=null;arrastreSolidoRef.current=null;}}>
              <defs><linearGradient id="capasMetal" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#f3d78a"/><stop offset=".48" stopColor="#b88b37"/><stop offset="1" stopColor="#f7e4aa"/></linearGradient><radialGradient id="capasGem"><stop offset="0" stopColor="#80c8ff"/><stop offset=".65" stopColor="#2865b9"/><stop offset="1" stopColor="#102e69"/></radialGradient></defs>
              {capaMetalVisible && <g transform={`translate(${posicionObjetosCapas.aro.x} ${posicionObjetosCapas.aro.y})`} role="button" tabIndex={0} aria-label="Seleccionar cuerpo del anillo; arrastra para moverlo si está desbloqueado" aria-pressed={objetoSeleccionadoCapas==="aro"} aria-disabled={capaMetalBloqueada} style={{cursor:capaMetalBloqueada?"not-allowed":objetoSeleccionadoCapas==="aro"?"grab":"pointer",touchAction:"none"}} onPointerDown={e=>{if(capaMetalBloqueada)return;if(objetoSeleccionadoCapas!=="aro"){setObjetoSeleccionadoCapas("aro");return;}const svg=e.currentTarget.ownerSVGElement;if(!svg)return;const rect=svg.getBoundingClientRect();const x=(e.clientX-rect.left)*520/rect.width;const y=(e.clientY-rect.top)*390/rect.height;arrastreCapasRef.current={objeto:"aro",pointerId:e.pointerId,inicioX:x,inicioY:y,origenX:posicionObjetosCapas.aro.x,origenY:posicionObjetosCapas.aro.y};svg.setPointerCapture(e.pointerId);e.preventDefault();}} onClick={()=>{if(!capaMetalBloqueada)setObjetoSeleccionadoCapas("aro");}} onKeyDown={e=>{if((e.key==="Enter"||e.key===" ")&&!capaMetalBloqueada){e.preventDefault();setObjetoSeleccionadoCapas("aro");}}}>
                <g><ellipse cx="260" cy="278" rx="143" ry="76" fill="none" stroke={asignacionCapas.aro === "Metal 01" ? "url(#capasMetal)" : "#858b93"} strokeWidth="29"/><path d="M117 278 Q125 365 260 355 Q395 365 403 278" fill="none" stroke={asignacionCapas.aro === "Metal 01" ? "#f5df9e" : "#aeb4bc"} strokeOpacity=".55" strokeWidth="2"/><path d="M175 213 L198 166 Q260 130 322 166 L345 213" fill="none" stroke={asignacionCapas.aro === "Metal 01" ? "url(#capasMetal)" : "#858b93"} strokeWidth="19" strokeLinecap="round"/><path d="M194 184 L194 135 M326 184 L326 135" stroke={asignacionCapas.aro === "Metal 01" ? "url(#capasMetal)" : "#858b93"} strokeWidth="12" strokeLinecap="round"/><path d="M185 143 L335 143" stroke={asignacionCapas.aro === "Metal 01" ? "#e7c66f" : "#aeb4bc"} strokeWidth="9" strokeLinecap="round"/><circle cx="260" cy="120" r="66" fill="none" stroke={asignacionCapas.aro === "Metal 01" ? "#d8b45d" : "#858b93"} strokeWidth="9" strokeDasharray="8 5"/></g>
                {objetoSeleccionadoCapas==="aro" && <g pointerEvents="none" fill="none" stroke="#fff2b8" strokeWidth="3" strokeDasharray="7 5"><ellipse cx="260" cy="278" rx="160" ry="94"/><path d="M175 213 L198 166 Q260 130 322 166 L345 213" stroke="#fff2b8" strokeWidth="24" strokeOpacity=".22"/></g>}
                {capaMetalBloqueada && <title>Capa Metal 01 bloqueada: el cuerpo permanece visible, pero no se puede seleccionar</title>}
              </g>}
              {capaGemVisible && <g transform={`translate(${posicionObjetosCapas.piedra.x} ${posicionObjetosCapas.piedra.y})`} role="button" tabIndex={0} aria-label="Seleccionar piedra central; arrastra para moverla si está desbloqueada" aria-pressed={objetoSeleccionadoCapas==="piedra"} aria-disabled={capaGemBloqueada} style={{cursor:capaGemBloqueada?"not-allowed":objetoSeleccionadoCapas==="piedra"?"grab":"pointer",touchAction:"none"}} onPointerDown={e=>{if(capaGemBloqueada)return;if(objetoSeleccionadoCapas!=="piedra"){setObjetoSeleccionadoCapas("piedra");return;}const svg=e.currentTarget.ownerSVGElement;if(!svg)return;const rect=svg.getBoundingClientRect();const x=(e.clientX-rect.left)*520/rect.width;const y=(e.clientY-rect.top)*390/rect.height;arrastreCapasRef.current={objeto:"piedra",pointerId:e.pointerId,inicioX:x,inicioY:y,origenX:posicionObjetosCapas.piedra.x,origenY:posicionObjetosCapas.piedra.y};svg.setPointerCapture(e.pointerId);e.preventDefault();}} onClick={()=>{if(!capaGemBloqueada)setObjetoSeleccionadoCapas("piedra");}} onKeyDown={e=>{if((e.key==="Enter"||e.key===" ")&&!capaGemBloqueada){e.preventDefault();setObjetoSeleccionadoCapas("piedra");}}}>
                <g><circle cx="260" cy="119" r="49" fill={asignacionCapas.piedra === "Gem 01" ? "url(#capasGem)" : "#777f89"} fillOpacity={asignacionCapas.piedra === "Gem 01" ? 1 : .42} stroke={asignacionCapas.piedra === "Gem 01" ? "#9bcfff" : "#b4bac2"} strokeWidth="3"/><path d="M260 70 L285 104 L309 119 L285 143 L260 168 L235 143 L211 119 L235 104Z" fill="none" stroke={asignacionCapas.piedra === "Gem 01" ? "#b8ddff" : "#d0d4da"} strokeOpacity=".8" strokeWidth="2"/><path d="M260 70 L260 168 M211 119 L309 119 M235 104 L285 143 M285 104 L235 143" stroke={asignacionCapas.piedra === "Gem 01" ? "#b8ddff" : "#d0d4da"} strokeOpacity=".65" strokeWidth="1.5"/></g>
                {objetoSeleccionadoCapas==="piedra" && <g pointerEvents="none" fill="none"><circle cx="260" cy="119" r="57" stroke="#ffffff" strokeWidth="3" strokeDasharray="6 4"/><circle cx="260" cy="119" r="63" stroke="#75c5ff" strokeWidth="2" opacity=".9"/></g>}
                {capaGemBloqueada && <title>Capa Gem 01 bloqueada: la piedra permanece visible, pero no se puede seleccionar</title>}
              </g>}
              {solidosColocados.filter(s=>(s.capa==="Metal 01"?capaMetalVisible:capaGemVisible)).map(s=><g key={s.id} transform={`translate(${s.x} ${s.y})`} role="button" tabIndex={0} aria-label={`Seleccionar ${s.tipo} ${s.id} en ${s.capa}; arrastra para moverlo`} aria-pressed={solidoSeleccionadoId===s.id} aria-disabled={s.capa==="Metal 01"?capaMetalBloqueada:capaGemBloqueada} style={{cursor:(s.capa==="Metal 01"?capaMetalBloqueada:capaGemBloqueada)?"not-allowed":solidoSeleccionadoId===s.id?"grab":"pointer",touchAction:"none"}} onPointerDown={e=>{const bloqueada=s.capa==="Metal 01"?capaMetalBloqueada:capaGemBloqueada;if(bloqueada){setMensajeSolidos(`La capa ${s.capa} está bloqueada. Desbloquéala para seleccionar o mover este sólido.`);return;}if(solidoSeleccionadoId!==s.id){setSolidoSeleccionadoId(s.id);arrastreSolidoRef.current=null;return;}const svg=e.currentTarget.ownerSVGElement;if(!svg)return;const rect=svg.getBoundingClientRect();arrastreSolidoRef.current={id:s.id,pointerId:e.pointerId,inicioX:(e.clientX-rect.left)*520/rect.width,inicioY:(e.clientY-rect.top)*390/rect.height,origenX:s.x,origenY:s.y};svg.setPointerCapture(e.pointerId);e.preventDefault();}} onClick={()=>{const bloqueada=s.capa==="Metal 01"?capaMetalBloqueada:capaGemBloqueada;if(!bloqueada)setSolidoSeleccionadoId(s.id);}} onKeyDown={e=>{if((e.key==="Enter"||e.key===" ")&&!(s.capa==="Metal 01"?capaMetalBloqueada:capaGemBloqueada)){e.preventDefault();setSolidoSeleccionadoId(s.id);}}}><title>{s.tipo} · {s.capa}</title><g pointerEvents="none"><rect x="-34" y="-42" width="68" height="15" rx="4" fill={s.color} stroke="#ffffff" strokeOpacity=".75" strokeWidth="1"/><text x="0" y="-31.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#ffffff">{s.capa==="Metal 01"?"METAL 01":"GEM 01"}</text></g>{s.tipo==="cubo"&&<polygon points="-22,-15 0,-27 22,-15 22,15 0,27 -22,15" fill={s.color} fillOpacity=".82" stroke="#dbeafe" strokeWidth="2"/>}{s.tipo==="esfera"&&<><circle r="22" fill={s.color} stroke="#dbeafe" strokeWidth="2"/><path d="M-13 -8 Q0 -22 13 -8" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="3"/></>}{s.tipo==="cilindro"&&<><rect x="-19" y="-19" width="38" height="38" fill={s.color} fillOpacity=".82" stroke="#dbeafe" strokeWidth="2"/><ellipse cy="-19" rx="19" ry="7" fill={s.color} stroke="#dbeafe" strokeWidth="2"/><path d="M-19 19 Q0 31 19 19" fill="none" stroke="#dbeafe" strokeWidth="2"/></>}{s.tipo==="cono"&&<><path d="M0 -25 L-22 19 Q0 29 22 19Z" fill={s.color} fillOpacity=".85" stroke="#dbeafe" strokeWidth="2"/><ellipse cy="19" rx="22" ry="7" fill={s.color} stroke="#dbeafe" strokeWidth="2"/></>}{s.tipo==="toroide"&&<><ellipse rx="25" ry="16" fill="none" stroke={s.color} strokeWidth="12"/><ellipse rx="25" ry="16" fill="none" stroke="#dbeafe" strokeOpacity=".8" strokeWidth="1.5"/></>}{solidoSeleccionadoId===s.id&&<circle r="31" fill="none" stroke="#fff2b8" strokeWidth="2.5" strokeDasharray="5 4" pointerEvents="none"/>}</g>)}
              {!capaMetalVisible && !capaGemVisible && <text x="260" y="205" textAnchor="middle" fill="#f4f4f5" fontSize="15">No hay objetos visibles</text>}
              <text x="260" y="382" textAnchor="middle" fill="#cbd5e1" fontSize="11">Representación conceptual · no es un archivo 3D editable</text>
            </svg>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-white/80"><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-none bg-[#23865c]"/> Metal 01 · cuerpo</span><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-none bg-[#438bd5]"/> Gem 01 · piedra</span></div>
          </div>

        </main>

      </div>
    </section>;
  };

  const renderRetoNavegacion = () => {
    if (lecturaAbierta?.numero !== 1 || paginaLectura !== 4) return null;
    const tareas = [
      { titulo: "Acercar la joya", instruccion: "En la vista Perspective, gira la rueda del ratón hacia delante para acercarte a la piedra central.", pista: "Coloca el cursor sobre el viewport Perspective y usa la rueda del ratón.", comando: "Rueda del ratón · Zoom" },
      { titulo: "Desplazar una vista paralela", instruccion: "Activa la vista Superior (Top) y desplaza el encuadre manteniendo pulsado el botón derecho mientras arrastras.", pista: "Selecciona el título Top y arrastra dentro de su área con el botón derecho.", comando: "Botón derecho + arrastrar" },
      { titulo: "Girar la vista Perspective", instruccion: "Vuelve a Perspective y gira la cámara para observar la joya desde otro ángulo. Mantén pulsado el botón derecho y arrastra.", pista: "En Perspective, arrastra con botón derecho sin pulsar Shift.", comando: "Botón derecho + arrastrar" },
      { titulo: "Desplazar Perspective sin girar", instruccion: "Ahora desplaza el encuadre de Perspective sin cambiar la orientación. Mantén Shift y el botón derecho mientras arrastras.", pista: "Shift + botón derecho + arrastrar dentro de Perspective.", comando: "Shift + botón derecho" },
      { titulo: "Maximizar y restaurar una vista", instruccion: "Haz doble clic en el título de Top para maximizarla. Repite el doble clic para recuperar las cuatro vistas.", pista: "Debes maximizar y después restaurar la distribución de viewports.", comando: "Doble clic en el título" },
      { titulo: "Recuperar el encuadre de una vista", instruccion: "Escribe ZE en la línea de comandos y pulsa Enter para encuadrar todos los objetos en la vista activa.", pista: "Prueba el comando ZE.", comando: "ZE · Zoom Extents" },
      { titulo: "Encuadrar todas las vistas", instruccion: "Escribe ZEA y pulsa Enter para encuadrar los objetos en las cuatro vistas.", pista: "Prueba el comando ZEA.", comando: "ZEA · Zoom All Extents" },
      { titulo: "Encuadrar los objetos seleccionados", instruccion: "Escribe ZS y pulsa Enter para acercar el encuadre a los objetos seleccionados.", pista: "Prueba el comando ZS.", comando: "ZS · Zoom Selected" },
      { titulo: "Volver a la vista anterior", instruccion: "Escribe UndoView y pulsa Enter para recuperar el encuadre anterior.", pista: "Prueba UndoView.", comando: "UndoView" },
      { titulo: "Desplazar mediante comando", instruccion: "Escribe Pan y pulsa Enter. El laboratorio activará el modo de desplazamiento de la vista.", pista: "Prueba Pan en la línea de comandos.", comando: "Pan" },
      { titulo: "Controlar el acercamiento por comando", instruccion: "Escribe Zoom y pulsa Enter para activar el comando de acercamiento.", pista: "Prueba Zoom en la línea de comandos.", comando: "Zoom" },
    ] as const;
    const total = tareas.length;
    const terminado = retoNavPaso >= total;
    const tarea = tareas[Math.min(retoNavPaso, total - 1)] ?? tareas[0];
    if (!tarea) return null;
    const completar = (mensaje: string) => {
      setRetoNavMensaje(mensaje);
      setRetoNavPaso(v => Math.min(total, v + 1));
    };
    const reiniciar = () => {
      setRetoNavPaso(0); setRetoNavZoom(1); setRetoNavPan({ x: 0, y: 0 }); setRetoNavOrbit(0);
      setRetoNavVistaActiva("Perspective"); setRetoNavVistaMaximizada(null); setRetoNavMaxClicks(0);
      setRetoNavComando(""); setRetoNavMensaje("Laboratorio restablecido. Comienza con el acercamiento en Perspective.");
      retoNavDragRef.current = null;
    };
    const ejecutarComando = () => {
      const cmd = retoNavComando.trim().toLowerCase().replace(/^_/, "");
      const comandosEsperados = ["", "", "", "", "", "ze", "zea", "zs", "undoview", "pan", "zoom"];
      if (!cmd) return;
      if (cmd !== comandosEsperados[retoNavPaso]) {
        setRetoNavMensaje("Comando no esperado para este ejercicio. Revisa la instrucción y vuelve a intentarlo.");
        return;
      }
      if (cmd === "ze" || cmd === "zea") { setRetoNavZoom(1); setRetoNavPan({ x: 0, y: 0 }); }
      if (cmd === "zs") { setRetoNavZoom(1.55); setRetoNavPan({ x: 0, y: 0 }); }
      if (cmd === "undoview") { setRetoNavZoom(1); setRetoNavPan({ x: 0, y: 0 }); setRetoNavOrbit(0); }
      if (cmd === "pan") setRetoNavVistaActiva("Perspective");
      if (cmd === "zoom") setRetoNavZoom(v => Math.min(2.2, v + 0.2));
      setRetoNavComando("");
      completar("Comando " + (cmd === "undoview" ? "UndoView" : cmd.toUpperCase()) + " reconocido. Has aplicado la función correspondiente.");
    };
    const viewports = [
      { id: "Top", label: "TOP (SUPERIOR)", sub: "XY · PLANTA" },
      { id: "Perspective", label: "PERSPECTIVE (PERSPECTIVA)", sub: "3D · ORBIT" },
      { id: "Front", label: "FRONT (FRONTAL)", sub: "XZ · ELEVACIÓN" },
      { id: "Right", label: "RIGHT (DERECHA)", sub: "YZ · LATERAL" },
    ];
    const viewport = (v: typeof viewports[number]) => {
      const activa = retoNavVistaActiva === v.id;
      const max = retoNavVistaMaximizada === v.id;
      const mostrar = !retoNavVistaMaximizada || max;
      if (!mostrar) return null;
      const zoom = activa ? retoNavZoom : 1;
      const pan = activa ? retoNavPan : { x: 0, y: 0 };
      const orbit = activa ? retoNavOrbit : 0;
      return <div key={v.id} className={"min-w-0 overflow-hidden rounded-lg border " + (max ? "flex h-full min-h-0 flex-col " : "") + (activa ? "border-[#C4A15A] ring-1 ring-[#C4A15A]/40" : "border-white/10")}>
        <button type="button" onClick={() => setRetoNavVistaActiva(v.id)} onDoubleClick={() => {
          setRetoNavVistaMaximizada(current => current === v.id ? null : v.id);
          if (retoNavPaso === 4) {
            const next = retoNavMaxClicks + 1;
            setRetoNavMaxClicks(next);
            if (next >= 2) completar("Vista maximizada y distribución restaurada correctamente.");
            else setRetoNavMensaje("Vista maximizada. Haz doble clic otra vez en el título para restaurar las cuatro vistas.");
          }
        }} className={"flex w-full shrink-0 items-center justify-between px-3 py-2 text-[10px] font-semibold tracking-[0.14em] " + (activa ? "bg-[#353941] text-[#E9C879]" : "bg-[#292D34] text-slate-300")}>
          <span>{v.label}</span><span className="font-normal tracking-normal text-slate-500">{v.sub}</span>
        </button>
        <svg viewBox="0 0 320 190" className={"block w-full touch-none bg-[#171B21] " + (max ? "min-h-0 flex-1" : "h-[clamp(170px,calc((100dvh-330px)/2),320px)]")} onContextMenu={e => e.preventDefault()}
          onWheel={e => {
            e.preventDefault(); setRetoNavVistaActiva(v.id);
            if (retoNavPaso === 0 && v.id === "Perspective") {
              setRetoNavZoom(z => Math.max(0.7, Math.min(2.4, z + (e.deltaY < 0 ? 0.18 : -0.18))));
              completar("Zoom aplicado. La pieza se ha acercado sin alterar su geometría.");
            } else {
              setRetoNavZoom(z => Math.max(0.7, Math.min(2.4, z + (e.deltaY < 0 ? 0.12 : -0.12))));
            }
          }}
          onPointerDown={e => {
            setRetoNavVistaActiva(v.id);
            if (e.button === 2) {
              retoNavDragRef.current = { x: e.clientX, y: e.clientY, vista: v.id, shift: e.shiftKey };
              e.currentTarget.setPointerCapture(e.pointerId);
            }
          }}
          onPointerMove={e => {
            const drag = retoNavDragRef.current;
            if (!drag || drag.vista !== v.id || (e.buttons & 2) === 0) return;
            const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
            if (Math.abs(dx) + Math.abs(dy) < 3) return;
            retoNavDragRef.current = { ...drag, x: e.clientX, y: e.clientY };
            if (retoNavPaso === 1 && v.id === "Top" && !drag.shift) {
              setRetoNavPan(p => ({ x: p.x + dx * 0.45, y: p.y + dy * 0.45 }));
              completar("Pan aplicado en la vista paralela Top.");
            } else if (retoNavPaso === 2 && v.id === "Perspective" && !drag.shift) {
              setRetoNavOrbit(o => o + dx * 0.55);
              setRetoNavPan(p => ({ x: p.x, y: p.y + dy * 0.18 }));
              completar("La cámara Perspective ha girado alrededor de la joya.");
            } else if (retoNavPaso === 3 && v.id === "Perspective" && drag.shift) {
              setRetoNavPan(p => ({ x: p.x + dx * 0.45, y: p.y + dy * 0.45 }));
              completar("Perspective desplazada con Shift + botón derecho, sin cambiar la orientación.");
            } else {
              setRetoNavPan(p => ({ x: p.x + dx * 0.25, y: p.y + dy * 0.25 }));
              if (v.id === "Perspective" && !drag.shift) setRetoNavOrbit(o => o + dx * 0.25);
            }
          }}
          onPointerUp={() => { retoNavDragRef.current = null; }}
          onPointerCancel={() => { retoNavDragRef.current = null; }}>
          <defs><pattern id={"nav-grid-" + v.id} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#343B45" strokeWidth="0.7"/></pattern><linearGradient id={"nav-metal-" + v.id} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#F4D995"/><stop offset=".45" stopColor="#B88B3F"/><stop offset="1" stopColor="#725126"/></linearGradient></defs>
          <rect width="320" height="190" fill={"url(#nav-grid-" + v.id + ")"} />
          <g transform={"translate(" + (pan.x + 160) + " " + (pan.y + 94) + ") scale(" + zoom + ") rotate(" + orbit + ") translate(-160 -94)"}>
            {v.id === "Top" ? <g><ellipse cx="160" cy="94" rx="70" ry="48" fill="none" stroke="url(#nav-metal-Top)" strokeWidth="19"/><ellipse cx="160" cy="94" rx="50" ry="31" fill="none" stroke="#E6C477" strokeWidth="3"/><path d="M160 27 L175 45 L160 63 L145 45 Z" fill="#DCEAF4" stroke="#AFC8DC" strokeWidth="2"/><circle cx="160" cy="45" r="8" fill="#F7FBFF" opacity=".8"/></g>
              : v.id === "Front" ? <g><path d="M76 112 Q90 62 160 65 Q230 62 244 112" fill="none" stroke="url(#nav-metal-Front)" strokeWidth="20"/><path d="M145 68 L160 38 L175 68 L160 82 Z" fill="#DCEAF4" stroke="#AFC8DC" strokeWidth="2"/><path d="M148 38 L160 24 L172 38 L160 52 Z" fill="#F9FCFF"/></g>
              : v.id === "Right" ? <g><path d="M90 120 Q160 36 230 120" fill="none" stroke="url(#nav-metal-Right)" strokeWidth="18"/><path d="M146 66 L160 36 L174 66 L160 79 Z" fill="#DCEAF4" stroke="#AFC8DC" strokeWidth="2"/></g>
              : <g><ellipse cx="160" cy="120" rx="76" ry="28" fill="none" stroke="#725126" strokeWidth="21"/><ellipse cx="160" cy="116" rx="76" ry="28" fill="none" stroke="url(#nav-metal-Perspective)" strokeWidth="14"/><path d="M145 74 L160 38 L175 74 L160 90 Z" fill="#DDECF6" stroke="#AFC8DC" strokeWidth="2"/><path d="M160 38 L160 90 M145 74 L175 74" stroke="#FFFFFF" opacity=".8"/></g>}
          </g>
          <text x="12" y="178" fill="#8993A1" fontSize="9">{activa ? "VIEW ACTIVA · " + v.id.toUpperCase() : v.id.toUpperCase()}</text>
        </svg>
      </div>;
    };
    return <section className="mt-7 overflow-hidden rounded-2xl border border-[#B99552]/35 bg-gradient-to-br from-[#171B21] via-[#111820] to-[#0C1219] text-white shadow-xl">
      {!retoNavegacionAbierto ? <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-300">FADILAB · Rhino 7 · Laboratorio de navegación</p><h4 className="mt-1 text-xl font-semibold">RHINO VIEWPORT TRAINER</h4><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">Un entorno de práctica para manipular las vistas de una joya, aplicar gestos de ratón y ejecutar comandos de navegación.</p><div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-300">{["4 viewports","Gestos de ratón","Línea de comandos","11 objetivos guiados"].map(x => <span key={x} className="rounded-full border border-white/15 px-3 py-1.5">{x}</span>)}</div></div>
        <button type="button" onClick={() => { reiniciar(); setRetoNavegacionAbierto(true); }} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-b from-amber-200 to-amber-500 px-5 py-3 text-sm font-bold text-[#21180A] shadow-lg hover:brightness-105"><ArrowRight className="size-4"/> Iniciar laboratorio</button>
      </div> : <div className="fixed inset-0 z-[110] flex h-[100dvh] flex-col overflow-hidden bg-[#0B1016] text-white selection:bg-[#C5A15A]/30" role="dialog" aria-modal="true" aria-label="Rhino Viewport Trainer">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#171E27] px-4 py-3 sm:px-6 sm:py-3.5 shadow-[0_4px_18px_rgba(0,0,0,.18)]">
          <div><p className="text-[9px] font-bold uppercase tracking-[.22em] text-[#D9B66F]">FADILAB / FORMACIÓN CAD · SESIÓN 01</p><h3 className="text-lg font-semibold tracking-tight sm:text-xl">Rhino Viewport Trainer</h3><p className="text-xs text-slate-400">Entorno de entrenamiento · Navegación y control de vistas</p></div>
          <div className="flex items-center gap-2"><button type="button" onClick={reiniciar} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"><RotateCcw className="size-3.5"/> Reiniciar</button><button type="button" onClick={() => setRetoNavegacionAbierto(false)} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/5">Cerrar ×</button></div>
        </header>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/[.07] bg-[#111820] px-4 py-2 sm:px-6"><div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300"><span className="rounded-md bg-white/5 px-2.5 py-1.5">Rhino 7 · Windows</span><span className="rounded-md bg-white/5 px-2.5 py-1.5">Unidades: mm</span><span className="rounded-md bg-white/5 px-2.5 py-1.5">Objeto didáctico: anillo</span></div><div className="text-xs font-semibold text-amber-200">{Math.min(retoNavPaso,total)} / {total} objetivos · {Math.min(retoNavPaso,total)*10} pts</div></div>
        <div className="h-1 shrink-0 bg-white/10"><div className="h-full bg-gradient-to-r from-amber-300 to-[#B99552] transition-all" style={{width:(Math.min(retoNavPaso,total)/total*100)+"%"}}/></div>
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_340px]">
          <main className="min-h-0 overflow-hidden bg-[#0D131A] p-3 sm:p-4 lg:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#C5A15A]">Espacio de modelado · Vistas ortogonales</p><p className="mt-1 text-[11px] text-slate-500">Órbita: botón derecho · Zoom: rueda · Desplazar: Shift + botón derecho · Doble clic para maximizar</p></div><div className="flex gap-2"><span className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-slate-400">Zoom {retoNavZoom.toFixed(2)}×</span><span className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-slate-400">Órbita {Math.round(retoNavOrbit)}°</span></div></div>
            <RhinoViewportTrainer3D
              zoom={retoNavZoom}
              orbit={retoNavOrbit}
              pan={retoNavPan}
              activeView={retoNavVistaActiva}
              maximized={retoNavVistaMaximizada}
              onActivate={setRetoNavVistaActiva}
              onMaximize={(view) => setRetoNavVistaMaximizada(current => current === view ? null : view)}
              onZoom={setRetoNavZoom}
              onOrbit={setRetoNavOrbit}
              onPan={setRetoNavPan}
              onAction={(action) => {
                if (action === "zoom" && retoNavPaso === 0) { setRetoNavZoom(v => Math.min(2.2, v + 0.15)); completar("Zoom aplicado a la joya en Perspective."); }
                else if (action === "panTop" && retoNavPaso === 1) { setRetoNavPan(p => ({ x: p.x + 0.25, y: p.y + 0.15 })); completar("Desplazamiento aplicado en la vista Top."); }
                else if (action === "orbit" && retoNavPaso === 2) { setRetoNavOrbit(v => v + 18); completar("La cámara Perspective ha orbitado alrededor de la joya."); }
                else if (action === "panPerspective" && retoNavPaso === 3) { setRetoNavPan(p => ({ x: p.x + 0.2, y: p.y + 0.15 })); completar("Perspective desplazada sin cambiar la orientación."); }
                else if (action === "maximize" && retoNavPaso === 4 && retoNavVistaMaximizada) completar("Vista maximizada y restaurada correctamente.");
              }}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-[#171B21] p-2.5"><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Línea de comandos</span><code className="rounded bg-black/20 px-2 py-1 text-[10px] text-amber-200">_</code><input value={retoNavComando} onChange={e => setRetoNavComando(e.target.value)} onKeyDown={e => { if (e.key === "Enter") ejecutarComando(); }} placeholder="Escribe ZE, ZEA, ZS, UndoView, Pan o Zoom…" className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-white outline-none placeholder:text-slate-600"/><button type="button" onClick={ejecutarComando} className="rounded-md bg-[#C4A15A] px-3 py-2 text-xs font-bold text-[#17130B]">Ejecutar ↵</button></div>
            <p className="mt-2 text-[11px] text-slate-500">Simulación didáctica: los gestos se reproducen en este entorno; no se controla una instalación real de Rhino.</p>
          </main>
          <aside className="min-h-0 overflow-y-auto border-t border-white/10 bg-[#141B23] p-4 lg:border-l lg:border-t-0 lg:p-5">
            {!terminado ? <><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#D9B66F]">MISIÓN GUIADA · OBJETIVO {retoNavPaso+1} de {total}</p><h4 className="mt-2 text-xl font-semibold tracking-tight">{tarea.titulo}</h4><p className="mt-3 text-sm leading-6 text-slate-300">{tarea.instruccion}</p><div className="mt-4 rounded-xl border border-[#C5A15A]/30 bg-[#C5A15A]/[.07] p-4"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#D9B66F]">Acción requerida</p><p className="mt-1 text-sm text-slate-200">{tarea.comando}</p></div><div className="mt-3 rounded-xl border border-white/[.08] bg-[#10161E] p-4"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-400">Guía del instructor</p><p className="mt-1 text-xs leading-5 text-slate-400">{tarea.pista}</p></div><div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3" aria-live="polite"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">Consola de actividad</p><p className="mt-1 text-xs leading-5 text-slate-300">{retoNavMensaje}</p></div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setRetoNavMensaje(tarea.pista)} className="rounded-lg border border-white/15 px-3 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/5">Ver pista</button><button type="button" onClick={() => setRetoNavMensaje("Recuerda realizar la acción en el viewport indicado. No basta con escribir una respuesta.")} className="rounded-lg border border-white/15 px-3 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/5">Ayuda</button></div></> : <div className="py-6 text-center"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-amber-300">Laboratorio completado</p><h4 className="mt-3 text-3xl font-semibold">{total*10} / {total*10} pts</h4><p className="mt-2 text-sm leading-6 text-slate-300">Has practicado zoom, desplazamiento, órbita, maximización y comandos de navegación en un entorno simulado.</p><button type="button" onClick={reiniciar} className="mt-5 rounded-lg bg-[#C4A15A] px-4 py-2.5 text-sm font-bold text-[#17130B]">Repetir laboratorio</button></div>}
            <div className="mt-5 rounded-xl border border-white/10 p-3"><div className="flex items-center justify-between text-xs"><span className="font-semibold">Progreso del laboratorio</span><span className="text-slate-400">{retoNavPaso}/{total}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-[#B99552]" style={{width:(retoNavPaso/total*100)+"%"}}/></div></div>
          </aside>
        </div>
      </div>}
    </section>;
  };

  if (!sesion || (!rolAlumno && !esDocente)) return <AppShell titulo="Aula de formación" subtitulo="Acceso restringido"><Panel titulo="Cuenta no habilitada"><p className="p-5 text-sm text-slate-400">El aula de alumnos está disponible para cuentas de gerente u operario. La docencia se administra exclusivamente desde FADILAB.</p></Panel></AppShell>;

  return <AppShell titulo="Aula de formación" subtitulo={mostrarVistaDocente ? "FADILAB · Administración académica" : vistaPreviaAlumno ? "Vista previa idéntica al área del alumno · Modo de simulación, sin guardar actividad académica" : "Tus cursos, materiales y actividades"} ocultarEncabezado modoAulaExpandida={modoAulaExpandida}>
    <div className="mx-auto max-w-6xl space-y-6">
      {!mostrarVistaDocente && !vistaPreviaAlumno && esDocente && inscripcionesAlumno.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d5e1eb] bg-[#f3f7fa] px-4 py-3"><div><p className="text-sm font-semibold text-[#294760]">También tienes acceso de gestión docente</p><p className="mt-0.5 text-xs text-[#718096]">Estás viendo tu aula como alumno matriculado.</p></div><button type="button" onClick={() => setModoPanelDocente(true)} className="rounded-lg bg-[#294760] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#203b52]">Ir a gestión docente</button></div>}
      {mostrarVistaDocente ? (
        <>
          <section className="overflow-hidden rounded-2xl border border-[#e4e9ef] bg-white shadow-[0_8px_28px_rgba(27,43,59,0.045)]">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div className="flex min-w-0 items-start gap-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-[#e7d8b8] bg-[#faf6ed] text-[#a77c32]"><ShieldCheck className="size-6" /></div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-[#8a6a35]">FADILAB <span className="mx-1 text-[#c8b58f]">/</span> ADMINISTRACIÓN ACADÉMICA</p>
                  <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-[#1d2b3a] sm:text-2xl">Panel docente</h2>
                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#647386]">Organiza tus cursos, acompaña el progreso de tus alumnos y administra el contenido académico.</p>
                </div>
              </div>
              {cursoActivoId && <div className="flex flex-wrap gap-2">{inscripcionesAlumno.length > 0 && <button type="button" onClick={() => { setModoPanelDocente(false); setVistaPreviaAlumno(false); }} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#cbd9e5] bg-white px-4 py-2.5 text-sm font-semibold text-[#294760] transition hover:bg-[#f1f6fa]"><BookOpen className="size-4" /> Mi aula de alumno</button>}<button type="button" onClick={() => setVistaPreviaAlumno(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#d9c69f] bg-[#fbf8f1] px-4 py-2.5 text-sm font-semibold text-[#765a2d] transition hover:border-[#b9975b] hover:bg-[#f7f0e2]"><Eye className="size-4" /> Vista previa del alumno</button></div>}
            </div>
            <div className="grid grid-cols-2 border-t border-[#edf0f3] bg-[#fbfcfd] lg:grid-cols-4">
              {[{label:"Cursos",value:cursos.length,icon:<BookOpen className="size-4"/>},{label:"Alumnos inscritos",value:(inscripcionesQuery.data ?? []).length,icon:<Users className="size-4"/>},{label:"Sesiones",value:(sesionesQuery.data ?? []).length,icon:<CalendarDays className="size-4"/>},{label:"Materiales",value:(materialesDocenteQuery.data ?? []).length,icon:<FileText className="size-4"/>}].map((item,index) => <div key={item.label} className={`flex items-center justify-between gap-3 px-4 py-4 sm:px-6 ${index % 2 === 0 ? "border-r border-[#edf0f3]" : ""} ${index < 2 ? "border-b border-[#edf0f3] lg:border-b-0" : ""} ${index === 1 ? "lg:border-r" : ""} ${index === 2 ? "lg:border-r" : ""}`}>
                <div><p className="text-xs font-medium text-[#718096]">{item.label}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-[#1e2937] tabular-nums">{item.value}</p></div>
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#eef3f7] text-[#55718d]">{item.icon}</span>
              </div>)}
            </div>
          </section>
          <section className="rounded-2xl border border-[#e4e9ef] bg-[#f8fafc] p-4 shadow-[0_4px_18px_rgba(27,43,59,0.035)] sm:p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#718096]">ÁREAS DE TRABAJO</p><h3 className="mt-1 text-base font-semibold text-[#1d2b3a]">{cursoActivoId ? cursos.find(c => c.id === cursoActivoId)?.titulo : "Comienza por crear o seleccionar un curso"}</h3></div>
              {cursoActivoId && <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d9e5ef] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#496782]"><CheckCircle2 className="size-3.5"/> Curso activo</span>}
            </div>
            <nav aria-label="Secciones del panel docente" className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {[{id:"cursos",label:"Cursos",detail:"Crear y organizar programas",icon:<BookOpen className="size-5"/>},{id:"alumnos",label:"Alumnos y sesiones",detail:"Matrículas y programa académico",icon:<Users className="size-5"/>},{id:"materiales",label:"Biblioteca",detail:"Archivos y recursos de estudio",icon:<FolderOpen className="size-5"/>},{id:"evaluaciones",label:"Evaluaciones",detail:"Exámenes y entregas",icon:<ClipboardCheck className="size-5"/>}].map(item => <button key={item.id} type="button" onClick={() => setSeccionDocente(item.id)} aria-pressed={seccionDocente===item.id} className={`group flex min-h-[112px] flex-col items-start justify-between gap-4 rounded-xl border p-4 text-left transition duration-150 ${seccionDocente===item.id ? "border-[#a9bfd2] bg-[#edf3f8] shadow-[inset_3px_0_0_#496782]" : "border-[#e4e9ef] bg-white hover:border-[#bdcbd8] hover:bg-[#fbfcfd] hover:shadow-sm"}`}>
                <span className="flex w-full items-center justify-between"><span className={`grid size-9 place-items-center rounded-lg ${seccionDocente===item.id ? "bg-white text-[#496782]" : "bg-[#f1f4f7] text-[#718096]"}`}>{item.icon}</span>{seccionDocente===item.id && <CheckCircle2 className="size-4 text-[#496782]"/>}</span>
                <span><span className={`block text-sm font-semibold ${seccionDocente===item.id ? "text-[#27445f]" : "text-[#253446]"}`}>{item.label}</span><span className="mt-1 block text-xs leading-5 text-[#718096]">{item.detail}</span></span>
              </button>)}
            </nav>
          </section>

          {lecturaAbierta && lecturaModoVistaPrevia && <div className={`fixed inset-0 z-[60] flex items-center justify-center overflow-hidden ${modoAulaExpandida ? "bg-background p-0" : "left-0 bg-black/25 p-2 sm:p-3 lg:left-64 xl:left-72"}`} role="dialog" aria-modal="true" aria-label="Lectura de la sesión · vista previa">
            <div className={"mx-auto flex h-[calc(100dvh-1rem)] max-h-[900px] min-h-0 w-full flex-col " + (modoAulaExpandida ? "max-w-none" : lecturaAbierta.numero === 5 ? "max-w-[1700px]" : "max-w-5xl") + ` overflow-hidden border border-[#D2D2D7] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.12)] ${modoAulaExpandida ? "h-full max-h-none rounded-none border-0" : "rounded-2xl"}`}>
              <header className={`shrink-0 border-b border-[#D2D2D7] bg-white ${modoAulaExpandida ? "px-4 py-2 sm:px-6 sm:py-2" : "px-4 py-3 sm:px-6 sm:py-4"}`}>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1"><div className="min-w-0 flex-1"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#98743c]">FADILAB · Lectura guiada</p><h2 className={`font-semibold leading-tight ${modoAulaExpandida ? "mt-0.5 text-base sm:text-lg" : "mt-1 text-lg"}`}>{lecturaAbierta.numero}. {lecturaAbierta.titulo}</h2>{!modoAulaExpandida && <p className="mt-1 text-xs text-[#6E6E73]">Vista previa del alumno · Modo de simulación, sin guardar actividad académica.</p>}</div><button type="button" onClick={() => { setLecturaAbierta(null); setLecturaModoVistaPrevia(false); setModoAulaExpandida(false); }} className="shrink-0 rounded-lg border border-[#d8e1ea] bg-white px-3 py-1.5 text-xs font-medium text-[#1D1D1F] transition hover:border-[#b99552]">Cerrar</button></div>
                <div className={`flex items-center gap-3 ${modoAulaExpandida ? "mt-1.5" : "mt-4"}`}><div className={`min-w-0 flex-1 overflow-hidden rounded-full bg-[#E5E5EA] ${modoAulaExpandida ? "h-1" : "h-2"}`}><div className="h-full rounded-full bg-[#B99552] transition-all" style={{width: (seccionesLecturaActivas.length ? ((paginaLectura+1)/seccionesLecturaActivas.length)*100 : 0)+"%"}}/></div><p className="shrink-0 text-[10px] text-[#6E6E73]">Apartado {paginaLectura+1} de {seccionesLecturaActivas.length}</p></div>
              </header>
              <nav aria-label="Índice de la lectura" className={`shrink-0 border-b px-4 sm:px-6 ${modoAulaExpandida ? "border-[#D2D2D7] bg-[#F5F5F7] py-2" : "border-[#D2D2D7] bg-[#F5F5F7] py-3 sm:py-3"}`}>
                {modoAulaExpandida ? (
                  <div className="flex min-w-0 items-center gap-3">
                    <p className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.13em] text-[#6E6E73]">Índice</p>
                    <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-0.5">
                      {seccionesLecturaActivas.map((seccion, indice) => <button key={indice} type="button" onClick={() => setPaginaLectura(indice)} aria-current={paginaLectura===indice ? "step" : undefined} aria-label={`Apartado ${indice+1}: ${seccion.titulo}`} className={`flex h-10 min-w-10 shrink-0 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition ${paginaLectura===indice ? "border-[#B99552] bg-[#C4A15A] text-[#1D1D1F] shadow-sm" : "border-[#D2D2D7] bg-white text-[#1D1D1F] hover:border-[#B99552] hover:bg-[#FBF8F1]"}`} title={seccion.titulo}>{String(indice+1).padStart(2,"0")}</button>)}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex items-center justify-between gap-3"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6E6E73]">Índice de contenidos</p><p className="text-[11px] text-[#6E6E73]">Selecciona un apartado para navegar</p></div>
                    <div className="flex gap-2 overflow-x-auto pb-1">{seccionesLecturaActivas.map((seccion, indice) => <button key={indice} type="button" onClick={() => setPaginaLectura(indice)} aria-current={paginaLectura===indice ? "step" : undefined} className={`flex min-w-10 shrink-0 items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition ${paginaLectura===indice ? "border-[#B99552] bg-[#C4A15A] text-[#1D1D1F] shadow-sm" : "border-[#D2D2D7] bg-white text-[#1D1D1F] hover:border-[#B99552] hover:bg-[#FBF8F1]"}`} title={seccion.titulo}>{String(indice+1).padStart(2,"0")}</button>)}</div>
                    <p className="mt-2 truncate text-xs font-medium text-[#1D1D1F]">{seccionesLecturaActivas[paginaLectura]?.titulo ?? "Lectura"}</p>
                  </>
                )}
              </nav>
              <main className={`min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6 lg:px-10 ${modoAulaExpandida ? "bg-white px-6 py-7 text-[#3A3A3C] sm:px-10 sm:py-8 lg:px-12 xl:px-16 2xl:px-20 pb-16 sm:pb-20" : "bg-white"}`}>
                <div className={lecturaAbierta?.numero === 5 ? "grid items-start gap-6 2xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]" : ""}>
                  <section className={`min-w-0 ${modoAulaExpandida ? "mx-auto w-full max-w-[1320px]" : ""}`}>
                    <h3 className={`mb-6 font-display text-2xl leading-tight text-[#1D1D1F] sm:text-3xl ${modoAulaExpandida ? "max-w-[1100px] sm:text-[2.15rem] sm:leading-[1.2]" : "max-w-[900px]"}`} >{seccionesLecturaActivas[paginaLectura]?.titulo ?? "Lectura"}</h3>
<AuriTutorCurso contexto={[
                      "Curso: Diseño CAD 3D para Joyería y Manufactura Aditiva con Inteligencia Artificial – Nivel 1",
                      "Sesión " + lecturaAbierta.numero + ": " + lecturaAbierta.titulo,
                      "Apartado: " + (seccionesLecturaActivas[paginaLectura]?.titulo ?? "Lectura"),
                      "Contenido de referencia:",
                      (seccionesLecturaActivas[paginaLectura]?.bloques ?? []).join("\n"),
                    ].join("\n")} />
                    {(seccionesLecturaActivas[paginaLectura]?.bloques ?? []).map((bloque,idx) => {
                      if (lecturaAbierta?.numero === 1 && paginaLectura === 4 && idx >= 6) return null;
                      return <div key={idx}><p className={`mb-5 whitespace-pre-line text-[15px] leading-7 ${modoAulaExpandida ? "w-full max-w-[1100px] text-[17px] leading-[1.8] tracking-[0.005em] text-[#3A3A3C]" : "max-w-[900px] text-[#3A3A3C]"}`}>{bloque}</p></div>;
                    })}
                    {lecturaAbierta?.numero === 1 && paginaLectura === 0 && <div className={`mt-2 rounded-2xl border border-[#D2D2D7] bg-[#F5F5F7] p-4 sm:p-5 ${modoAulaExpandida ? "w-full max-w-[1100px]" : "w-full max-w-[1100px]"}`}>
                      <p className="text-sm leading-7 text-[#3A3A3C]">En joyería, la precisión dimensional es fundamental: el modelo debe considerar espesores, tolerancias, espacios de montaje y la ubicación de piedras y engastes. Estas decisiones influyen en la resistencia, la funcionalidad y la viabilidad de fabricación de la pieza.</p>
                      <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="max-w-[560px] text-sm leading-6 text-[#6E6E73]">Una vez definido el modelo CAD, puedes explorar cómo se vería mediante materiales, metales e iluminación en un entorno de presentación 3D.</p>
                        <a href="/aurum-render" className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#C4A15A] px-4 py-2.5 text-sm font-semibold text-[#1D1D1F] shadow-sm transition hover:bg-[#B99552] focus:outline-none focus:ring-2 focus:ring-[#B99552]/30">Ir a Aurum Render <span aria-hidden="true" className="ml-2">↗</span></a>
                      </div>
                    </div>}
                    {renderLaboratorioCoordenadas()}
                    {renderLaboratorioPreparacion()}
                    {renderLaboratorioSesion4()}
                    {renderLaboratorioRestricciones()}
                {lecturaAbierta?.numero === 6 && paginaLectura === 1 && <div className="mx-auto w-full max-w-[1100px] pb-6"><LaboratorioSolidos onlyLab="extrusion" /></div>}
                {lecturaAbierta?.numero === 6 && paginaLectura === 2 && <div className="mx-auto w-full max-w-[1100px] pb-6"><LaboratorioSolidos onlyLab="revolution" /></div>}
                {lecturaAbierta?.numero === 6 && paginaLectura === 3 && <div className="mx-auto w-full max-w-[1100px] pb-6"><LaboratorioSolidos onlyLab="ring" /></div>}
                {lecturaAbierta?.numero === 6 && paginaLectura === 4 && <div className="mx-auto w-full max-w-[1100px] pb-6"><LaboratorioSolidos onlyLab="inspector" /></div>}
                {lecturaAbierta?.numero === 7 && paginaLectura === 5 && <LaboratorioSuperficies />}
                {lecturaAbierta?.numero === 8 && paginaLectura === 5 && <LaboratorioValidacionModelo />}

                  </section>
                  {lecturaAbierta?.numero === 5 && <section className="min-w-0">{renderLaboratorioSesion5()}</section>}
                </div>
                {renderLaboratorioOsnap()}
                {renderLaboratorioSmartTrack()}
                {renderLaboratorioPlaca()}

                {renderLaboratorioGeometria()}
                <RhinoObjectExplorer visible={lecturaAbierta?.numero === 2 && paginaLectura === 4} materials={materialesVistaAula} />
                
                {lecturaAbierta?.numero === 2 && paginaLectura === 4 && <>
                  <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#A47B32]">Mini guía · Rhino 7</p><h4 className="mt-1 text-base font-semibold text-slate-900">Del comando al objeto</h4><p className="mt-1 text-sm text-slate-600">Aprende el flujo básico para crear y seleccionar geometría.</p></div>
                    <button type="button" onClick={()=>setGuiaComandosAbierta(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#C6A15B] px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:brightness-105"><BookOpenCheck className="size-4"/> Abrir guía</button>
                  </section>
                  {guiaComandosAbierta && <div className="fixed inset-0 z-[120] flex h-[100dvh] w-full flex-col overflow-y-auto bg-[#171C24] text-[#E8EDF2]" role="dialog" aria-modal="true" aria-label="Guía de comandos y selección en Rhino">
                    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#1D2630] px-4 py-3 sm:px-7"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#D8B979]">FADILAB · Sesión 02 · Rhino 7</p><h3 className="text-lg font-semibold">Del comando al objeto</h3><p className="text-xs text-[#AAB7C5]">Guía visual · Crear, confirmar y seleccionar</p></div><button type="button" onClick={()=>setGuiaComandosAbierta(false)} className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold hover:border-[#C6A15B]">Cerrar ✕</button></header>
                    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-5 p-4 sm:p-8">
                      <div className="grid gap-3 sm:grid-cols-5">{[
                        {n:"01",t:"Crear",d:"Escribe LINE, CIRCLE o RECTANGLE.",k:"⌨",e:"Comando"},
                        {n:"02",t:"Indicar",d:"Marca los puntos que Rhino solicita.",k:"●",e:"Puntos"},
                        {n:"03",t:"Confirmar",d:"Pulsa Enter cuando Rhino lo indique.",k:"↵",e:"Enter"},
                        {n:"04",t:"Seleccionar",d:"Haz clic sobre la geometría creada.",k:"◉",e:"Clic"},
                        {n:"05",t:"Cancelar",d:"Pulsa Esc para cancelar o quitar selección.",k:"Esc",e:"Esc"},
                      ].map(step=><article key={step.n} className="rounded-xl border border-white/10 bg-[#222B36] p-4"><span className="text-[10px] font-bold tracking-widest text-[#D8B979]">{step.n} · {step.e}</span><div className="my-4 flex h-20 items-center justify-center rounded-lg bg-[#171C24] text-3xl font-semibold text-[#D8B979]">{step.k}</div><h4 className="font-semibold">{step.t}</h4><p className="mt-1 text-sm leading-5 text-[#AAB7C5]">{step.d}</p></article>)}</div>
                      <section className="rounded-xl border border-[#C6A15B]/30 bg-[#C6A15B]/10 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-[#D8B979]">Aplicación en joyería</p><p className="mt-2 text-sm leading-6 text-[#E8EDF2]">Crea un círculo para definir una referencia de piedra, dibuja el perfil del aro con una curva y selecciona cada objeto para organizarlo. Lee siempre la indicación de la línea de comandos antes del siguiente clic.</p></section>
                      <p className="text-center text-xs text-[#AAB7C5]">Recuerda: Enter confirma cuando Rhino lo solicita · Esc cancela el comando activo.</p>
                    </main>
                  </div>}
                </>}
                {renderLaboratorioCapas()}
                {renderSelectorVistasPlano()}
                {lecturaAbierta?.numero === 2 && paginaLectura === 2 && <section className="mt-7 overflow-hidden rounded-2xl border border-[#d9c9a8] bg-gradient-to-br from-[#fffefa] via-white to-[#f7f2e8] shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#98743c]">FADILAB · Sesión 02 · Práctica interactiva</p><h4 className="mt-1 text-xl font-semibold tracking-tight text-[#252a31]">CURVE LAB <span className="font-normal text-[#7b8490]">/ Curvas básicas</span></h4><p className="mt-1 max-w-2xl text-sm leading-6 text-[#626d79]">Construye líneas, polilíneas, círculos y rectángulos sobre un plano XY interactivo. Practica el flujo de puntos de cada herramienta y comprueba tus resultados.</p><div className="mt-3 flex flex-wrap gap-2 text-[10px] font-medium text-[#6c6251]">{["4 herramientas Rhino","Plano XY interactivo","Validación por ejercicio","Progreso de práctica"].map(item=><span key={item} className="rounded-full border border-[#e7ddca] bg-white/80 px-3 py-1.5">{item}</span>)}</div></div><button type="button" onClick={() => setLaboratorioCurvasBasicasAbierto(true)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-b from-[#e6c77d] to-[#bf9952] px-5 py-3 text-sm font-bold text-[#241b0c] shadow-sm transition hover:-translate-y-0.5 hover:brightness-105"><Pencil className="size-4"/> Iniciar Curve Lab <ArrowRight className="size-4"/></button></div></section>}
                {lecturaAbierta?.numero === 2 && paginaLectura === 2 && laboratorioCurvasBasicasAbierto && <LaboratorioCurvasBasicas onClose={() => setLaboratorioCurvasBasicasAbierto(false)}/>}
                <div className="mt-5 grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
                {lecturaAbierta?.numero === 1 && paginaLectura === 4 && <section className={`h-full rounded-xl border border-[#D2D2D7] bg-[#F5F5F7] text-[#1D1D1F] p-5 ${modoAulaExpandida ? "max-w-[1400px]" : "max-w-4xl"}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7B43]">Recurso interactivo</p>
                  <h4 className="mt-1 text-base font-semibold">Comandos de navegación</h4>
                  <p className="mt-2 text-sm text-[#6E6E73]">Abre la ficha para explorar los comandos y consultar la función de cada uno.</p>
                  <button type="button" onClick={() => { setComandoNavegacionActivo("Zoom"); setComandosNavegacionAbiertos(true); }} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#007AFF] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95">Ver comandos de navegación <ChevronRight className="size-4"/></button>
                  {comandosNavegacionAbiertos && <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/75 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Comandos de navegación de Rhino 7">
                    <div className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#D2D2D7] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.12)]">
                      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#D2D2D7] bg-white px-5 py-4">
                        <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7B43]">FADILAB · Guía interactiva</p><h3 className="text-lg font-semibold">Comandos de navegación · Rhino 7</h3><p className="mt-1 text-xs text-[#6E6E73]">Selecciona un comando para consultar su función.</p></div>
                        <button type="button" onClick={() => setComandosNavegacionAbiertos(false)} className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold hover:border-gold">Cerrar ×</button>
                      </header>
                      <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
                        <div className="overflow-hidden rounded-xl border border-white/10">
                          <table className="w-full border-collapse text-left text-sm"><thead><tr className="bg-[#F5F5F7]"><th className="border-b border-[#D2D2D7] px-4 py-3">Comando</th><th className="border-b border-[#D2D2D7] px-4 py-3">Función</th></tr></thead><tbody>
                            {[
                              {comando:"Zoom",funcion:"Control de acercamiento"},
                              {comando:"ZE",funcion:"Zoom Extents: encuadrar todos los objetos"},
                              {comando:"ZEA",funcion:"Zoom All Extents: encuadrar todas las vistas"},
                              {comando:"ZS",funcion:"Zoom Selected: encuadrar objetos seleccionados"},
                              {comando:"Pan",funcion:"Desplazamiento de la vista"},
                              {comando:"UndoView",funcion:"Recuperar la vista anterior"}
                            ].map(item=><tr key={item.comando}><td className="border-b border-[#D2D2D7] p-0"><button type="button" onClick={()=>setComandoNavegacionActivo(item.comando)} aria-pressed={comandoNavegacionActivo===item.comando} className={`w-full px-4 py-3 text-left font-semibold transition hover:bg-[#F5F5F7] ${comandoNavegacionActivo===item.comando?"bg-gold/15 text-[#9A7B43]":"bg-white"}`}>{item.comando}</button></td><td className="border-b border-[#D2D2D7] px-4 py-3">{item.funcion}</td></tr>)}
                          </tbody></table>
                        </div>
                        <div className="mt-4 rounded-xl border border-[#D2D2D7] bg-[#F5F5F7] p-4" aria-live="polite">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9A7B43]">Comando seleccionado</p>
                          <p className="mt-1 text-lg font-semibold">{comandoNavegacionActivo}</p>
                          <p className="mt-1 text-sm text-[#3A3A3C]">{({Zoom:"Control de acercamiento",ZE:"Zoom Extents: encuadrar todos los objetos",ZEA:"Zoom All Extents: encuadrar todas las vistas",ZS:"Zoom Selected: encuadrar objetos seleccionados",Pan:"Desplazamiento de la vista",UndoView:"Recuperar la vista anterior"} as Record<string,string>)[comandoNavegacionActivo]}</p>
                        </div>
                      </div>
                    </div>
                  </div>}
                </section>}
                {renderRetoNavegacion()}
              </div>
                {lecturaAbierta?.numero === 1 && paginaLectura === 1 && <section className="mt-7 rounded-2xl border border-[#D2D2D7] bg-gradient-to-br from-white via-[#fffefa] to-[#f7f3eb] text-[#24221e] p-5 sm:p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7B43]">Material visual de apoyo</p>
                  <h4 className="mt-1 text-lg font-semibold">Rhinoceros 7</h4>
                  <p className="mt-2 text-sm leading-6 text-[#6E6E73]">Consulta la imagen de referencia general del programa.</p>
                  {imagenRhinoUrl ? <button type="button" onClick={() => setTipoImagenApoyoAbierta(tipoImagenApoyoAbierta === "rhinoceros" ? null : "rhinoceros")} aria-expanded={tipoImagenApoyoAbierta === "rhinoceros"} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#007AFF] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95">Ver RHINOCEROS <ChevronRight className="size-4"/></button> : <p className="mt-3 text-xs text-[#6E6E73]">{imagenRhinoError || "Buscando RHINOCEROS en la Biblioteca del curso…"}</p>}
                  {tipoImagenApoyoAbierta && <div className="fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-black/75 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Imagen de referencia de Rhinoceros">
                    <div className="flex max-h-[96dvh] w-full max-w-[1200px] flex-col overflow-hidden rounded-xl border border-[#D2D2D7] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.12)]">
                      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#D2D2D7] bg-white px-4 py-3 sm:px-5">
                        <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7B43]">FADILAB · Material de estudio</p><h3 className="text-base font-semibold">{tipoImagenApoyoAbierta === "rhinoceros" ? "Rhinoceros 7" : tipoImagenApoyoAbierta === "vistas" ? "Vistas de trabajo" : "Ejes de coordenadas"}</h3></div>
                        <button type="button" onClick={() => setTipoImagenApoyoAbierta(null)} className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold hover:border-gold">Cerrar ×</button>
                      </header>
                      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-background p-3 sm:p-5">
                        <img src={tipoImagenApoyoAbierta === "rhinoceros" ? imagenRhinoUrl : tipoImagenApoyoAbierta === "vistas" ? imagenesVistasUrl : imagenesEjesUrl} alt={tipoImagenApoyoAbierta === "rhinoceros" ? "Referencia de Rhinoceros 7" : tipoImagenApoyoAbierta === "vistas" ? "Vistas de trabajo de Rhinoceros" : "Ejes de coordenadas de Rhinoceros"} className="block h-auto max-h-[78dvh] w-auto max-w-full rounded-lg object-contain" />
                      </div>
                    </div>
                  </div>}
                </section>}
                {lecturaAbierta?.numero === 1 && paginaLectura === 3 && <section className="mt-7 rounded-2xl border border-[#D2D2D7] bg-gradient-to-br from-white via-[#fffefa] to-[#f7f3eb] text-[#24221e] p-5 sm:p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7B43]">Material visual de apoyo</p>
                  <h4 className="mt-1 text-lg font-semibold">Vistas y ejes de Rhinoceros 7</h4>
                  <p className="mt-2 text-sm leading-6 text-[#6E6E73]">Identifica las vistas de trabajo y la orientación espacial mediante los ejes de coordenadas.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {imagenesVistasUrl && <button type="button" onClick={() => setTipoImagenApoyoAbierta(tipoImagenApoyoAbierta === "vistas" ? null : "vistas")} aria-expanded={tipoImagenApoyoAbierta === "vistas"} className="inline-flex items-center gap-2 rounded-xl bg-[#007AFF] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95">Ver VISTAS <ChevronRight className="size-4"/></button>}
                    {imagenesEjesUrl && <button type="button" onClick={() => setTipoImagenApoyoAbierta(tipoImagenApoyoAbierta === "ejes" ? null : "ejes")} aria-expanded={tipoImagenApoyoAbierta === "ejes"} className="inline-flex items-center gap-2 rounded-xl bg-[#007AFF] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95">Ver EJES <ChevronRight className="size-4"/></button>}
                  </div>
                  {!imagenesVistasUrl && !imagenesEjesUrl && <p className="mt-3 text-xs text-[#6E6E73]">{errorImagenesApoyo || "Buscando VISTAS y EJES en la Biblioteca del curso…"}</p>}
                  {(tipoImagenApoyoAbierta === "vistas" || tipoImagenApoyoAbierta === "ejes") && <div className="fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-black/75 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Imagen de referencia de Rhinoceros">
                    <div className="flex max-h-[96dvh] w-full max-w-[1200px] flex-col overflow-hidden rounded-xl border border-[#D2D2D7] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.12)]">
                      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#D2D2D7] bg-white px-4 py-3 sm:px-5">
                        <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7B43]">FADILAB · Material de estudio</p><h3 className="text-base font-semibold">{tipoImagenApoyoAbierta === "vistas" ? "Vistas de trabajo" : "Ejes de coordenadas"}</h3></div>
                        <button type="button" onClick={() => setTipoImagenApoyoAbierta(null)} className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold hover:border-gold">Cerrar ×</button>
                      </header>
                      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-background p-3 sm:p-5">
                        <img src={tipoImagenApoyoAbierta === "vistas" ? imagenesVistasUrl : imagenesEjesUrl} alt={tipoImagenApoyoAbierta === "vistas" ? "Vistas de trabajo de Rhinoceros" : "Ejes de coordenadas de Rhinoceros"} className="block h-auto max-h-[78dvh] w-auto max-w-full rounded-lg object-contain" />
                      </div>
                    </div>
                  </div>}
                </section>}
                {lecturaAbierta?.numero === 1 && paginaLectura === 6 && <section className="mt-7 rounded-2xl border border-[#D2D2D7] bg-gradient-to-br from-white via-[#fffefa] to-[#f7f3eb] text-[#24221e] p-5 sm:p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7B43]">Material visual de apoyo</p>
                  <h4 className="mt-1 text-lg font-semibold">Proceso de joyería con impresión 3D</h4>
                  <p className="mt-2 text-sm leading-6 text-[#6E6E73]">Observa la secuencia general que conecta el diseño digital con la fabricación de una pieza de joyería mediante impresión 3D.</p>
                  {imagenProceso3DUrl ? <button type="button" onClick={() => setTipoImagenApoyoAbierta(tipoImagenApoyoAbierta === "proceso3d" ? null : "proceso3d")} aria-expanded={tipoImagenApoyoAbierta === "proceso3d"} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#007AFF] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95">Ver PROCESO DE JOYERÍA CON IMPRESIÓN 3D <ChevronRight className="size-4"/></button> : <p className="mt-3 text-xs text-[#6E6E73]">{imagenProceso3DError || "Buscando la imagen del proceso en la Biblioteca del curso…"}</p>}
                  {tipoImagenApoyoAbierta === "proceso3d" && <div className="fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-black/75 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Proceso de joyería con impresión 3D">
                    <div className="flex max-h-[96dvh] w-full max-w-[1200px] flex-col overflow-hidden rounded-xl border border-[#D2D2D7] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.12)]">
                      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#D2D2D7] bg-white px-4 py-3 sm:px-5">
                        <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7B43]">FADILAB · Material de estudio</p><h3 className="text-base font-semibold">Proceso de joyería con impresión 3D</h3></div>
                        <button type="button" onClick={() => setTipoImagenApoyoAbierta(null)} className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold hover:border-gold">Cerrar ×</button>
                      </header>
                      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-background p-3 sm:p-5">
                        <img src={imagenProceso3DUrl} alt="Proceso de joyería con impresión 3D" className="block h-auto max-h-[78dvh] w-auto max-w-full rounded-lg object-contain" />
                      </div>
                    </div>
                  </div>}
                </section>}
                {lecturaAbierta?.numero === 1 && paginaLectura === 2 && !interfazInteractivaAbierta && <section className="mt-7 rounded-2xl border border-[#D2D2D7] bg-gradient-to-br from-white via-[#fffefa] to-[#f7f3eb] text-[#24221e] p-5 sm:p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7B43]">Actividad guiada · FADILAB</p>
                  <h4 className="mt-1 text-lg font-semibold">Conoce cada parte de la interfaz</h4>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6E6E73]">Abre el recorrido interactivo para identificar los componentes directamente sobre la captura de MatrixGold 3.1. Explora los 14 marcadores numerados para conocer dónde se encuentra cada componente y para qué sirve.</p>
                  <button type="button" disabled={!imagenInterfazUrl} onClick={() => setInterfazInteractivaAbierta(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-black shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50">Explorar interfaz interactiva <ChevronRight className="size-4"/></button>
                  {!imagenInterfazUrl && <p className="mt-2 text-xs text-[#6E6E73]">{imagenInterfazError || "Buscando la imagen en la Biblioteca del curso…"}</p>}
                </section>}
                {lecturaAbierta?.numero === 1 && paginaLectura === 2 && interfazInteractivaAbierta && <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-black/75 p-1 sm:p-2" role="dialog" aria-modal="true" aria-label="Exploración interactiva de MatrixGold 3.1">
                  <div className="flex h-[calc(100dvh-0.5rem)] w-[99vw] max-w-[1700px] min-h-0 flex-col overflow-hidden rounded-xl border border-[#D2D2D7] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.12)]">
                    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#D2D2D7] bg-white px-3 py-2 sm:px-5">
                      <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7B43]">FADILAB · Recorrido de aprendizaje</p><h3 className="text-base font-semibold sm:text-lg">Explora la interfaz de MatrixGold 3.1</h3></div>
                      <button type="button" onClick={() => setInterfazInteractivaAbierta(false)} className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold hover:border-gold">Cerrar ×</button>
                    </header>
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-1.5 sm:p-2">
                      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
                      
                      {imagenInterfazUrl && <figure className="flex max-h-full w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#171719] p-1">
                        <div ref={interfazImagenRef} className="relative flex max-h-full max-w-full items-center justify-center">
                          <img src={imagenInterfazUrl} alt="Captura de la interfaz de MatrixGold 3.1 con marcadores interactivos" className="block h-auto max-h-[calc(100dvh-5.5rem)] w-auto max-w-full rounded-lg object-contain" loading="lazy" />
                          {COMPONENTES_INTERFAZ.map((item, indice) => <button key={indice} type="button" onClick={() => { setComponenteActivo(indice); setComponentesExplorados(prev => prev.includes(indice) ? prev : [...prev, indice]); }} aria-label={`Explorar componente ${indice+1}: ${item[0]}`} aria-pressed={componenteActivo===indice} data-interface-marker={indice} className={`absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-bold shadow-lg transition sm:size-9 sm:text-sm ${componenteActivo===indice ? "z-40 scale-125 bg-[#c4a15a] text-black ring-4 ring-[#c4a15a]/40" : componentesExplorados.includes(indice) ? "z-20 bg-emerald-600 text-white" : "z-20 bg-blue-600 text-white hover:scale-110 hover:bg-[#c4a15a] hover:text-black"}`} style={{left:COORDENADAS_INTERFAZ[indice]?.x,top:COORDENADAS_INTERFAZ[indice]?.y}}>{indice+1}</button>)}
                          {componenteActivo !== null && <aside ref={interfazInfoRef} aria-live="polite" className="absolute z-30 w-[min(320px,calc(100%-16px))] max-h-[calc(100%-16px)] overflow-y-auto rounded-xl border border-[#c4a15a] bg-[#fffdf8]/95 p-2.5 text-[#242424] shadow-xl backdrop-blur-sm sm:p-3" style={{left:posicionInfoInterfaz ? `${posicionInfoInterfaz.left}px` : "8px",top:posicionInfoInterfaz ? `${posicionInfoInterfaz.top}px` : "8px",visibility:posicionInfoInterfaz ? "visible" : "hidden"}}>
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-[#98722e] sm:text-[10px]">Componente {componenteActivo+1} de {COMPONENTES_INTERFAZ.length}</p>
                            <h4 className="mt-1 text-xs font-bold leading-4 sm:text-sm sm:leading-5">{COMPONENTES_INTERFAZ[componenteActivo]?.[0]}</h4>
                            <div className="mt-2 rounded-lg bg-black/5 p-2">
                              <p className="text-[9px] font-semibold uppercase tracking-wide text-[#777] sm:text-[10px]">Dónde lo encuentras</p>
                              <p className="mt-1 text-[10px] leading-4 sm:text-xs sm:leading-5">{COMPONENTES_INTERFAZ[componenteActivo]?.[2]}</p>
                            </div>
                            <div className="mt-2 rounded-lg bg-black/5 p-2">
                              <p className="text-[9px] font-semibold uppercase tracking-wide text-[#777] sm:text-[10px]">Para qué sirve</p>
                              <p className="mt-1 text-[10px] leading-4 sm:text-xs sm:leading-5">{COMPONENTES_INTERFAZ[componenteActivo]?.[3]}</p>
                            </div>
                          </aside>}
                        </div>
                        
                      </figure>}
                      </div>
                      
                    </div>
                  </div>
                </div>}
                                {paginaLectura === seccionesLecturaActivas.length-1 && <div className="rounded-xl border border-[#dce4ec] bg-white p-4"><p className="text-sm font-semibold">Has llegado al final de la lectura</p><p className="mt-1 text-sm text-[#6E6E73]">En el aula real, el alumno podrá finalizar y marcar la sesión como completada.</p></div>}
              </main>
              {paginaLectura === seccionesLecturaActivas.length-1 && <footer className="shrink-0 flex justify-end border-t border-[#e2e8f0] bg-white px-4 py-3 sm:px-6 sm:py-4">
                <button type="button" onClick={() => { setLecturasSimuladas(prev => new Set(prev).add(lecturaAbierta.id)); setLecturaAbierta(null); setLecturaModoVistaPrevia(false); }} className="inline-flex items-center gap-2 rounded-lg bg-[#b99552] px-4 py-2.5 text-sm font-semibold text-white"><CheckCircle2 className="size-4"/> Simular lectura completada</button>
              </footer>}
            </div>
          </div>}
          {seccionDocente === "cursos" && <div id="doc-cursos" className="grid scroll-mt-24 gap-5">
            <Panel titulo="Nuevo curso" colapsable defaultOpen={false}>
              <div className="border-b border-[#edf0f3] bg-[#fbfcfd] px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#e8dcc7] bg-[#fbf6ec] text-[#9a7133]"><Plus className="size-5" /></span>
                  <div><h3 className="text-sm font-semibold text-[#253446]">Diseña tu próximo programa</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-[#718096]">Define la información principal. Después podrás organizar sesiones, inscribir alumnos y añadir materiales.</p></div>
                </div>
              </div>
              <form onSubmit={(e) => void crearCurso(e)} className="space-y-4 p-5">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                  <label className="block text-xs font-semibold text-[#425466]">Nombre del curso
                    <input value={titulo} onChange={e => setTitulo(e.target.value)} required maxLength={140} placeholder="Ej. Diseño CAD 3D para Joyería · Nivel 1" className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3.5 py-3 text-sm text-[#253446] outline-none transition placeholder:text-[#9aa7b5] focus:border-[#8ba6bd] focus:ring-2 focus:ring-[#8ba6bd]/15" />
                  </label>
                  <label className="block text-xs font-semibold text-[#425466]">Duración total
                    <span className="relative mt-2 block"><input type="number" min="0" step="0.5" value={duracion} onChange={e => setDuracion(e.target.value)} className="w-full rounded-xl border border-[#dce4ec] bg-white px-3.5 py-3 pr-14 text-sm text-[#253446] outline-none transition focus:border-[#8ba6bd] focus:ring-2 focus:ring-[#8ba6bd]/15" /><span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[#8190a0]">horas</span></span>
                  </label>
                </div>
                <label className="block text-xs font-semibold text-[#425466]">Descripción del programa <span className="font-normal text-[#8a97a5]">· opcional</span>
                  <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} placeholder="Resume qué aprenderán los participantes y cuál es el objetivo del curso." className="mt-2 w-full resize-y rounded-xl border border-[#dce4ec] bg-white px-3.5 py-3 text-sm leading-6 text-[#253446] outline-none transition placeholder:text-[#9aa7b5] focus:border-[#8ba6bd] focus:ring-2 focus:ring-[#8ba6bd]/15" />
                </label>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f3] pt-4">
                  <p className="text-xs leading-5 text-[#8190a0]">Podrás completar y editar los detalles académicos más adelante.</p>
                  <button disabled={ocupado} className="inline-flex items-center gap-2 rounded-xl bg-[#294760] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#203b52] disabled:cursor-not-allowed disabled:opacity-50"><Plus className="size-4" /> Crear curso</button>
                </div>
              </form>
            </Panel>
            <Panel titulo="Mis cursos · FADILAB" colapsable defaultOpen={true}>
              <div className="space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs leading-5 text-[#718096]">Programas académicos de tu institución.</p>
                  {!cursosQuery.isLoading && <span className="rounded-full border border-[#dce4ec] bg-[#f7f9fb] px-2.5 py-1 text-[11px] font-semibold text-[#526b81]">{cursos.length} {cursos.length === 1 ? "curso" : "cursos"}</span>}
                </div>
                {cursosQuery.isLoading ? <div className="rounded-xl border border-[#e4e9ef] bg-[#fbfcfd] p-5 text-sm text-[#718096]">Cargando cursos…</div> : cursos.length === 0 ? <div className="rounded-2xl border border-dashed border-[#cbd7e1] bg-[#fbfcfd] px-5 py-8 text-center"><span className="mx-auto grid size-11 place-items-center rounded-xl bg-[#eef3f7] text-[#55718d]"><BookOpen className="size-5" /></span><p className="mt-3 text-sm font-semibold text-[#253446]">Todavía no tienes cursos</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#718096]">Crea tu primer programa académico para comenzar a organizar sesiones, alumnos y materiales.</p></div> : cursos.map((c, index) => <article key={c.id} className={`overflow-hidden rounded-2xl border bg-white transition ${cursoActivoId === c.id ? "border-[#a9bfd2] shadow-[0_0_0_2px_rgba(73,103,130,0.08)]" : "border-[#e4e9ef] hover:border-[#c7d3de] hover:shadow-sm"}`}>
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
                    <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${cursoActivoId === c.id ? "bg-[#edf3f8] text-[#496782]" : "bg-[#f3f6f8] text-[#71869a]"}`}><BookOpen className="size-5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8a97a5]">Programa {String(index + 1).padStart(2, "0")}</span>
                        {cursoActivoId === c.id && <span className="inline-flex items-center gap-1 rounded-full border border-[#d9e5ef] bg-[#f3f7fa] px-2 py-0.5 text-[10px] font-semibold text-[#496782]"><CheckCircle2 className="size-3" /> En administración</span>}
                      </div>
                      <h3 className="mt-1 break-words text-sm font-semibold leading-6 text-[#253446]">{c.titulo}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#718096]">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5f7f9] px-2.5 py-1.5"><BookOpen className="size-3.5" /> {c.duracion_horas} horas académicas</span>
                        <span className="rounded-lg bg-[#f5f7f9] px-2.5 py-1.5 capitalize">{c.estado}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button type="button" onClick={() => setCursoSeleccionado(c.id)} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition sm:min-w-[132px] ${cursoActivoId === c.id ? "border border-[#d9e5ef] bg-[#f3f7fa] text-[#496782]" : "bg-[#294760] text-white hover:bg-[#203b52]"}`}>{cursoActivoId === c.id ? "Curso seleccionado" : "Administrar curso"} <span aria-hidden="true">→</span></button>
                      <button type="button" onClick={() => { setCursoEditandoId(c.id); setTituloCursoEditado(c.titulo); }} aria-label={`Editar nombre de ${c.titulo}`} title="Editar nombre del curso" className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#dce4ec] text-[#60758a] transition hover:border-[#c7d3de] hover:bg-[#f7f9fb]"><Pencil className="size-3.5" /><span className="sm:hidden">Editar</span></button>
                    </div>
                  </div>
                  {cursoEditandoId === c.id && <form onSubmit={(e) => void guardarNombreCurso(e)} className="flex flex-col gap-2 border-t border-[#edf0f3] bg-[#fbfcfd] p-4 sm:flex-row">
                    <input autoFocus value={tituloCursoEditado} onChange={e => setTituloCursoEditado(e.target.value)} required maxLength={140} aria-label="Nuevo nombre del curso" className="min-w-0 flex-1 rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm text-[#253446] outline-none focus:border-[#8ba6bd] focus:ring-2 focus:ring-[#8ba6bd]/15" />
                    <button type="submit" disabled={ocupado || !tituloCursoEditado.trim()} className="rounded-xl bg-[#294760] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">Guardar cambios</button>
                    <button type="button" onClick={() => { setCursoEditandoId(""); setTituloCursoEditado(""); }} disabled={ocupado} className="rounded-xl border border-[#dce4ec] bg-white px-4 py-2.5 text-xs font-medium text-[#60758a] disabled:opacity-50">Cancelar</button>
                  </form>}
                </article>)}
              </div>
            </Panel>
          </div>}
          {!cursoActivoId && seccionDocente !== "cursos" && <div className="rounded-2xl border border-dashed border-[#cbd7e1] bg-[#fbfcfd] p-8 text-center"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-[#edf3f8] text-[#496782]"><BookOpen className="size-6"/></span><p className="mt-3 text-sm font-semibold text-[#253446]">Primero selecciona un curso</p><p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-[#718096]">En el espacio «Cursos» puedes crear un curso o elegir uno existente para administrar sus alumnos, sesiones, materiales y evaluaciones.</p><button type="button" onClick={() => setSeccionDocente("cursos")} className="mt-4 rounded-xl bg-[#294760] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#203b52]">Ir a cursos</button></div>}
          {seccionDocente === "alumnos" && cursoActivoId && <div id="doc-alumnos-sesiones" className="grid scroll-mt-24 gap-5 lg:grid-cols-2">
            <Panel titulo="Alumnos del curso" colapsable defaultOpen={true}>
              <div className="space-y-4 p-5">
                <div className="flex items-start gap-3 rounded-xl border border-[#e4eaf0] bg-white p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf3f8] text-[#496782]"><Users className="size-5" /></span>
                  <div><p className="text-sm font-semibold text-[#253446]">Incorpora participantes</p><p className="mt-1 text-xs leading-5 text-[#718096]">Selecciona personas de las cuentas existentes de Taller del Joyero. No se crean usuarios nuevos.</p></div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-[#425466]">Filtrar por taller
                    <select value={tallerAlumnoFiltro} onChange={e => setTallerAlumnoFiltro(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446] outline-none focus:border-[#8ba6bd] focus:ring-2 focus:ring-[#8ba6bd]/15">
                      <option value="todos">Todos los talleres</option>
                      {talleresDirectorio.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-[#425466]">Buscar alumno
                    <input value={busquedaAlumno} onChange={e => setBusquedaAlumno(e.target.value)} placeholder="Nombre, usuario o taller" className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446] outline-none placeholder:text-[#9aa7b5] focus:border-[#8ba6bd] focus:ring-2 focus:ring-[#8ba6bd]/15" />
                  </label>
                </div>
                <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-[#e4e9ef] bg-[#fbfcfd] p-2">
                  {directorioQuery.isLoading ? <p className="p-4 text-xs text-[#718096]">Cargando directorio…</p>
                    : directorioQuery.isError ? <p className="p-4 text-xs text-destructive">{directorioQuery.error instanceof Error ? directorioQuery.error.message : "No se pudo cargar el directorio."}</p>
                    : alumnosFiltrados.length === 0 ? <div className="p-5 text-center"><Users className="mx-auto size-6 text-[#9aa7b5]" /><p className="mt-2 text-xs text-[#718096]">No hay participantes que coincidan con la búsqueda.</p></div>
                    : alumnosFiltrados.map((alumno: any) => <label key={alumno.userId} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${alumnosSeleccionados.includes(alumno.userId) ? "border-[#a9bfd2] bg-[#f0f5f9]" : "border-[#e8edf2] bg-white hover:border-[#c7d3de]"}`}>
                      <input type="checkbox" checked={alumnosSeleccionados.includes(alumno.userId)} onChange={e => setAlumnosSeleccionados(actual => e.target.checked ? [...actual, alumno.userId] : actual.filter(id => id !== alumno.userId))} className="mt-1 size-4 accent-[#496782]" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[#253446]">{alumno.nombre}</span>
                        {alumno.usuario && <span className="mt-0.5 block text-xs text-[#718096]">Usuario: {alumno.usuario}</span>}
                        <span className="mt-2 inline-flex rounded-md bg-[#f4f6f8] px-2 py-1 text-[11px] font-medium text-[#60758a]">{alumno.taller} · {alumno.roles.join(", ")}</span>
                      </span>
                    </label>)}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f3] pt-4">
                  <span className="text-xs font-medium text-[#718096]">{alumnosSeleccionados.length} seleccionado(s)</span>
                  <button type="button" disabled={ocupado || alumnosSeleccionados.length === 0} onClick={() => void matricularAlumnosSeleccionados()} className="inline-flex items-center gap-2 rounded-xl bg-[#294760] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#203b52] disabled:cursor-not-allowed disabled:opacity-50"><Users className="size-4" /> Inscribir seleccionados</button>
                </div>
              </div>
              <div className="border-t border-[#edf0f3] p-5">
                <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-[#253446]">Alumnos inscritos</h3><span className="rounded-full border border-[#dce4ec] bg-[#f7f9fb] px-2.5 py-1 text-[11px] font-semibold text-[#526b81]">{(inscripcionesQuery.data ?? []).length}</span></div>
                {inscripcionesQuery.isLoading ? <p className="text-xs text-[#718096]">Cargando…</p> : (inscripcionesQuery.data ?? []).length === 0 ? <div className="rounded-xl border border-dashed border-[#cbd7e1] bg-[#fbfcfd] px-4 py-6 text-center"><p className="text-xs text-[#718096]">Aún no hay alumnos inscritos en este curso.</p></div> : <div className="space-y-2">{(inscripcionesQuery.data ?? []).map(i => <div key={i.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#e8edf2] bg-white px-3 py-3">
                  <span className="min-w-0 text-sm font-semibold text-[#253446]">{i.nombre_alumno || i.email_alumno}<span className="mt-0.5 block break-all text-xs font-normal text-[#718096]">{i.email_alumno}</span></span>
                  <div className="flex shrink-0 items-center gap-2"><span className="rounded-full bg-[#f3f6f8] px-2.5 py-1 text-[10px] font-semibold capitalize text-[#60758a]">{i.estado}</span><button type="button" disabled={ocupado} onClick={() => void eliminarInscripcion(i)} aria-label={`Eliminar inscripción de ${i.nombre_alumno || i.email_alumno}`} title="Eliminar inscripción del curso" className="rounded-lg p-2 text-[#8190a0] transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"><Trash2 className="size-4" /></button></div>
                </div>)}</div>}
              </div>
            </Panel>
            <Panel titulo="Programa académico">
              <div className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#253446]">Estructura del curso</p>
                    <p className="mt-1 text-xs text-[#718096]">Organiza el recorrido formativo en orden secuencial.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#dce4ec] bg-[#f7f9fb] px-3 py-1.5 text-[11px] font-semibold text-[#526b81]">{(sesionesQuery.data ?? []).length} sesiones</span>
                    <span className="rounded-full border border-[#ccebdd] bg-[#effaf4] px-3 py-1.5 text-[11px] font-semibold text-[#28744e]">{(sesionesQuery.data ?? []).filter(s => s.publicada).length} publicadas</span>
                    <span className="rounded-full border border-[#e4e9ef] bg-[#f7f9fb] px-3 py-1.5 text-[11px] font-semibold text-[#718096]">{(sesionesQuery.data ?? []).filter(s => !s.publicada).length} borradores</span>
                  </div>
                </div>

                <details className="group overflow-hidden rounded-xl border border-[#e5d8c2] bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-[#fbf8f2] px-4 py-3.5 transition hover:bg-[#f8f2e8] [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[#e8dcc7] bg-white text-[#9a7133]"><CalendarDays className="size-4" /></span>
                      <span className="min-w-0"><span className="block text-sm font-semibold text-[#253446]">Añadir una sesión</span><span className="mt-0.5 block text-xs text-[#718096]">Incorpora una nueva etapa al programa académico.</span></span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-[#8b6a36]"><Plus className="size-4" /><span className="hidden sm:inline">Nueva sesión</span><span className="text-[#9aabb9] transition group-open:rotate-180">⌄</span></span>
                  </summary>
                  <form onSubmit={(e) => void crearSesion(e)} className="space-y-4 border-t border-[#edf0f3] p-4 sm:p-5">
                    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3">
                      <label className="text-xs font-semibold text-[#425466]">N.º<input type="number" min="1" value={numeroSesion} onChange={e => setNumeroSesion(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446] outline-none focus:border-[#8ba6bd] focus:ring-2 focus:ring-[#8ba6bd]/15" /></label>
                      <label className="text-xs font-semibold text-[#425466]">Título<input required value={tituloSesion} onChange={e => setTituloSesion(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446] outline-none focus:border-[#8ba6bd] focus:ring-2 focus:ring-[#8ba6bd]/15" placeholder="Ej. Interfaz y navegación" /></label>
                    </div>
                    <label className="block text-xs font-semibold text-[#425466]">Descripción <span className="font-normal text-[#8a97a5]">· opcional</span><textarea value={detalleSesion} onChange={e => setDetalleSesion(e.target.value)} rows={2} className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal leading-6 text-[#253446] outline-none focus:border-[#8ba6bd] focus:ring-2 focus:ring-[#8ba6bd]/15" /></label>
                    <div className="flex justify-end border-t border-[#edf0f3] pt-3"><button disabled={ocupado} className="inline-flex items-center gap-2 rounded-xl bg-[#294760] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#203b52] disabled:opacity-50"><CalendarDays className="size-4" /> Añadir sesión</button></div>
                  </form>
                </details>

                <div className="space-y-2.5">
                  {sesionesQuery.isLoading ? <p className="rounded-xl border border-[#e4e9ef] bg-[#fbfcfd] px-4 py-6 text-center text-xs text-[#718096]">Cargando sesiones…</p> : (sesionesQuery.data ?? []).length === 0 ? <div className="rounded-xl border border-dashed border-[#cbd7e1] bg-[#fbfcfd] px-4 py-8 text-center"><CalendarDays className="mx-auto size-7 text-[#9aa7b5]"/><p className="mt-2 text-sm font-semibold text-[#425466]">Todavía no hay sesiones</p><p className="mt-1 text-xs text-[#8190a0]">Añade la primera etapa para comenzar a construir el programa.</p></div> : (sesionesQuery.data ?? []).map(s => <details key={s.id} open={sesionEditandoId === s.id} className="group overflow-hidden rounded-xl border border-[#e1e8ef] bg-white transition open:border-[#b9cad9] open:shadow-[0_2px_12px_rgba(41,71,96,0.06)]">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3.5 transition hover:bg-white [&::-webkit-details-marker]:hidden sm:px-4">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf3f8] text-sm font-bold tabular-nums text-[#496782]">{String(s.numero).padStart(2,"0")}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold leading-5 text-[#253446]">{s.titulo}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${s.publicada ? "bg-emerald-50 text-emerald-700" : "bg-[#f3f6f8] text-[#718096]"}`}>{s.publicada ? "Publicada" : "Borrador"}</span></span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]"><span className="text-[#8190a0]">{s.publicada ? "Visible para alumnos" : "Pendiente de publicación"}</span><span className="text-[#c0cbd5]">·</span><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${s.bloqueada ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}><span aria-hidden="true">{s.bloqueada ? "🔒" : "🔓"}</span>{s.bloqueada ? "Bloqueada para alumnos" : "Acceso abierto"}</span>{s.descripcion && <><span className="text-[#c0cbd5]">·</span><span className="max-w-[240px] truncate text-[#8190a0]">{s.descripcion}</span></>}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-[#60758a]"><span className="hidden sm:inline">Gestionar</span><span className="text-[#9aabb9] transition group-open:rotate-180">⌄</span></span>
                    </summary>
                    <div className="border-t border-[#edf0f3] bg-[#fbfcfd] p-4 sm:p-5">
                      {sesionEditandoId === s.id ? (
                        <form onSubmit={(e) => void guardarEdicionSesion(e, s)} className="space-y-3">
                          <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3">
                            <label className="text-xs font-semibold text-[#425466]">N.º<input type="number" min="1" required value={numeroSesionEditado} onChange={e => setNumeroSesionEditado(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446]" /></label>
                            <label className="text-xs font-semibold text-[#425466]">Título<input required value={tituloSesionEditado} onChange={e => setTituloSesionEditado(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446]" /></label>
                          </div>
                          <label className="block text-xs font-semibold text-[#425466]">Descripción<textarea value={detalleSesionEditado} onChange={e => setDetalleSesionEditado(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446]" /></label>
                          <div className="flex flex-wrap gap-2"><button type="submit" disabled={ocupado} className="rounded-lg bg-[#294760] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Guardar cambios</button><button type="button" disabled={ocupado} onClick={cancelarEdicionSesion} className="rounded-lg border border-[#dce4ec] bg-white px-3 py-2 text-xs font-medium text-[#60758a]">Cancelar</button></div>
                        </form>
                      ) : (
                        <>
                          {s.descripcion && <p className="text-xs leading-6 text-[#60758a]">{s.descripcion}</p>}
                          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#e8edf2] pt-3">
                            <button type="button" disabled={ocupado} onClick={() => iniciarEdicionSesion(s)} aria-label={`Editar sesión ${s.numero}`} title="Editar sesión" className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce4ec] bg-white px-3 py-2 text-xs font-medium text-[#60758a] transition hover:bg-[#f7f9fb] disabled:opacity-50"><Pencil className="size-3.5" /> Editar</button>
                            <button type="button" disabled={ocupado || cargandoLecturaDocente} onClick={() => void abrirEditorLectura(s)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce4ec] bg-white px-3 py-2 text-xs font-medium text-[#60758a] transition hover:bg-[#f7f9fb] disabled:opacity-50">{cargandoLecturaDocente ? "Cargando…" : "Editar lectura"}</button>
                            <button type="button" disabled={ocupado} onClick={() => void cambiarBloqueoSesion(s)} title={s.bloqueada ? "Desbloquear sesión para alumnos" : "Bloquear apertura para alumnos"} aria-label={s.bloqueada ? `Desbloquear sesión ${s.numero}` : `Bloquear sesión ${s.numero}`} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50 ${s.bloqueada ? "border-amber-300 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}><span aria-hidden="true">{s.bloqueada ? "🔒" : "🔓"}</span>{s.bloqueada ? "Bloqueada" : "Abierta"}</button>
                            <button type="button" disabled={ocupado} onClick={() => void publicarSesion(s)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#294760] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#203b52] disabled:opacity-50">{s.publicada ? "Ocultar a alumnos" : "Publicar sesión"}</button>
                          </div>
                        </>
                      )}
                    </div>
                  </details>)}
                </div>
              </div>
            </Panel>
            {lecturaEditando && <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[#142638]/65 p-2 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-label="Editor de lectura">
              <div className="my-auto flex max-h-[min(94vh,960px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-2xl">
                <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[#e7edf2] bg-white px-4 py-3.5 sm:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#e5d8c2] bg-[#fbf6ec] text-sm font-bold text-[#946b2e]">{String(lecturaEditando.numero).padStart(2,"0")}</span>
                    <div className="min-w-0"><h3 className="truncate text-sm font-semibold text-[#253446] sm:text-base">Editor de lectura · Sesión {lecturaEditando.numero}</h3><p className="mt-0.5 text-xs text-[#718096]">Los cambios se guardan como borrador hasta publicar.</p></div>
                  </div>
                  <button type="button" onClick={() => setLecturaEditando(null)} className="shrink-0 rounded-lg border border-[#dce4ec] bg-white px-3 py-2 text-xs font-semibold text-[#526477] transition hover:bg-[#f1f5f8]">Cerrar <span aria-hidden="true">×</span></button>
                </header>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-white p-3 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#dce4ec] bg-white px-4 py-3">
                    <div><p className="text-xs font-semibold text-[#334b61]">Estructura de la lectura</p><p className="mt-0.5 text-[11px] text-[#8190a0]">Organiza el contenido en apartados y bloques de texto.</p></div>
                    <div className="flex gap-2"><span className="rounded-full bg-[#edf3f8] px-2.5 py-1 text-[10px] font-semibold text-[#496782]">{seccionesLecturaEditadas.length} apartados</span><span className="rounded-full bg-[#f7f2e9] px-2.5 py-1 text-[10px] font-semibold text-[#946b2e]">{seccionesLecturaEditadas.reduce((total,sec)=>total+sec.bloques.length,0)} bloques</span></div>
                  </div>
                  {seccionesLecturaEditadas.map((sec, idx) => <section key={idx} className="overflow-hidden rounded-xl border border-[#dce4ec] bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1f4] bg-[#fbfcfd] px-4 py-3">
                      <div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg bg-[#294760] text-xs font-bold text-white">{String(idx+1).padStart(2,"0")}</span><div><p className="text-xs font-semibold text-[#253446]">Apartado {idx+1}</p><p className="text-[10px] text-[#8190a0]">{sec.bloques.length} bloque{sec.bloques.length===1?"":"s"} de contenido</p></div></div>
                      <button type="button" onClick={() => setSeccionesLecturaEditadas(prev => prev.filter((_,i) => i!==idx))} className="rounded-lg border border-[#e6dede] px-2.5 py-1.5 text-[11px] font-medium text-[#9a5a5a] transition hover:border-red-200 hover:bg-red-50 hover:text-red-700">Eliminar apartado</button>
                    </div>
                    <div className="space-y-4 p-4">
                      <label className="block text-[11px] font-semibold text-[#526477]">Título del apartado<input value={sec.titulo} onChange={e => setSeccionesLecturaEditadas(prev => prev.map((x,i)=>i===idx?{...x,titulo:e.target.value}:x))} className="mt-1.5 w-full rounded-lg border border-[#dce4ec] bg-white px-3 py-2.5 text-sm text-[#253446] outline-none transition placeholder:text-[#a0acb8] focus:border-[#7895ad] focus:ring-2 focus:ring-[#7895ad]/15" placeholder="Escribe el título del apartado"/></label>
                      {sec.bloques.map((bloque,j) => <div key={j} className="rounded-xl border border-[#e8edf2] bg-[#fbfcfd] p-3">
                        <div className="mb-2 flex items-center justify-between gap-2"><span className="text-[11px] font-semibold text-[#526477]">Bloque de texto {j+1}</span><button type="button" onClick={() => setSeccionesLecturaEditadas(prev=>prev.map((x,i)=>i===idx?{...x,bloques:x.bloques.filter((_,k)=>k!==j)}:x))} className="rounded-md px-2 py-1 text-[10px] font-medium text-[#8b6b6b] transition hover:bg-red-50 hover:text-red-700">Quitar bloque</button></div>
                        <textarea aria-label={`Texto del bloque ${j+1} del apartado ${idx+1}`} value={bloque} onChange={e => setSeccionesLecturaEditadas(prev => prev.map((x,i)=>i===idx?{...x,bloques:x.bloques.map((b,k)=>k===j?e.target.value:b)}:x))} rows={4} className="min-h-24 w-full resize-y rounded-lg border border-[#dce4ec] bg-white px-3 py-2.5 text-sm leading-6 text-[#34475a] outline-none transition placeholder:text-[#a0acb8] focus:border-[#7895ad] focus:ring-2 focus:ring-[#7895ad]/15"/>
                      </div>)}
                      <button type="button" onClick={() => setSeccionesLecturaEditadas(prev=>prev.map((x,i)=>i===idx?{...x,bloques:[...x.bloques,""]}:x))} className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[#b9c9d7] bg-[#f7fafc] px-3 py-2 text-xs font-semibold text-[#496782] transition hover:border-[#7895ad] hover:bg-[#edf3f8]"><span className="text-base leading-none">+</span> Añadir bloque de texto</button>
                    </div>
                  </section>)}
                  <button type="button" onClick={() => setSeccionesLecturaEditadas(prev=>[...prev,{titulo:"Nuevo apartado",bloques:[""]}])} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#b9c9d7] bg-white px-4 py-3 text-xs font-semibold text-[#496782] transition hover:border-[#7895ad] hover:bg-[#f4f8fb]"><span className="text-lg leading-none">+</span> Añadir apartado</button>
                  {estadoGuardadoLectura && <p role="status" aria-live="polite" className={`rounded-xl border px-4 py-3 text-xs font-medium ${estadoGuardadoLectura.tipo === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : estadoGuardadoLectura.tipo === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-[#dce4ec] bg-white text-[#526477]"}`}>{estadoGuardadoLectura.tipo === "success" ? "✓ " : estadoGuardadoLectura.tipo === "error" ? "⚠ " : "ℹ "}{estadoGuardadoLectura.texto}</p>}
                </div>
                <footer className="flex shrink-0 flex-col gap-3 border-t border-[#e7edf2] bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-[#60758a]"><span className={`size-2 rounded-full ${lecturaPublicada ? "bg-emerald-500" : "bg-amber-500"}`}/>{lecturaPublicada ? "Lectura publicada" : "Lectura en borrador"}</span>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => setLecturaEditando(null)} className="rounded-lg border border-[#dce4ec] bg-white px-3 py-2 text-xs font-semibold text-[#60758a] transition hover:bg-[#f7f9fb]">Cerrar</button>
                    <button type="button" disabled={ocupado} onClick={() => void guardarContenidoLectura(false)} className="rounded-lg border border-[#cbd7e1] bg-white px-3 py-2 text-xs font-semibold text-[#496782] transition hover:bg-[#f4f8fb] disabled:opacity-50">Guardar borrador</button>
                    {lecturaPublicada && <button type="button" disabled={ocupado} onClick={() => void retirarPublicacionLectura()} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50">Retirar publicación</button>}
                    <button type="button" disabled={ocupado} onClick={() => void guardarContenidoLectura(true)} className="rounded-lg bg-[#294760] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#203b52] disabled:opacity-50">{lecturaPublicada ? "Guardar y mantener publicada" : "Guardar y publicar"}</button>
                  </div>
                </footer>
              </div>
            </div>}

            </div>}
          {seccionDocente === "materiales" && cursoActivoId && <div id="doc-materiales" className="scroll-mt-24">
            <Panel titulo="Biblioteca académica">
              <div className="space-y-5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#e8dcc7] bg-[#fbf6ec] text-[#9a7133]"><FileText className="size-5"/></span>
                    <div><p className="text-sm font-semibold text-[#253446]">Centro de recursos del curso</p><p className="mt-0.5 text-xs text-[#718096]">Organiza documentos, modelos y materiales de aprendizaje.</p></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#dce4ec] bg-[#f7f9fb] px-3 py-1.5 text-[11px] font-semibold text-[#526b81]">{(materialesDocenteQuery.data ?? []).length} recursos</span>
                    <span className="rounded-full border border-[#ccebdd] bg-[#effaf4] px-3 py-1.5 text-[11px] font-semibold text-[#28744e]">{(materialesDocenteQuery.data ?? []).filter(m => m.publicado).length} publicados</span>
                    <span className="rounded-full border border-[#e4e9ef] bg-[#f7f9fb] px-3 py-1.5 text-[11px] font-semibold text-[#718096]">{(materialesDocenteQuery.data ?? []).filter(m => !m.publicado).length} borradores</span>
                  </div>
                </div>

                <details className="group overflow-hidden rounded-xl border border-[#e5d8c2] bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-[#fbf8f2] px-4 py-3.5 transition hover:bg-[#f8f2e8] [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[#e8dcc7] bg-white text-[#9a7133]"><Upload className="size-4"/></span>
                      <span className="min-w-0"><span className="block text-sm font-semibold text-[#253446]">Incorporar material</span><span className="mt-0.5 block text-xs text-[#718096]">Sube un archivo y asígnalo a una sesión o al curso completo.</span></span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-[#8b6a36]"><Plus className="size-4"/><span className="hidden sm:inline">Nuevo recurso</span><ChevronDown className="size-4 text-[#9aabb9] transition-transform group-open:rotate-180"/></span>
                  </summary>
                  <form onSubmit={(e) => void subirMaterial(e)} className="space-y-4 border-t border-[#edf0f3] p-4 sm:p-5">
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(240px,1fr)]">
                      <label className="block text-xs font-semibold text-[#425466]">Título del material<input required value={tituloMaterial} onChange={e => setTituloMaterial(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446] outline-none placeholder:text-[#9aa7b5] focus:border-[#8ba6bd] focus:ring-2 focus:ring-[#8ba6bd]/15" placeholder="Ej. Guía de navegación en Rhino"/></label>
                      <label className="block text-xs font-semibold text-[#425466]">Ubicación en el programa<select value={sesionMaterialId} onChange={e => setSesionMaterialId(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446] outline-none focus:border-[#8ba6bd] focus:ring-2 focus:ring-[#8ba6bd]/15"><option value="">Material general del curso</option>{(sesionesQuery.data ?? []).map(s => <option key={s.id} value={s.id}>Sesión {s.numero} · {s.titulo}</option>)}</select></label>
                    </div>
                    <div className="space-y-2">
                      <span className="block text-xs font-semibold text-[#425466]">Archivo del recurso <span className="font-normal text-[#8190a0]">· PDF, documentos, imágenes, ZIP o STL</span></span>
                      <label htmlFor="aula-material-file" onDragEnter={e=>{e.preventDefault();setArchivoArrastrando(true);}} onDragOver={e=>{e.preventDefault();setArchivoArrastrando(true);}} onDragLeave={e=>{e.preventDefault();if(!e.currentTarget.contains(e.relatedTarget as Node|null))setArchivoArrastrando(false);}} onDrop={e=>{e.preventDefault();setArchivoArrastrando(false);const recibido=e.dataTransfer.files?.[0];if(recibido)setArchivo(recibido);}} className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${archivoArrastrando ? "border-[#b68b48] bg-[#fbf6ec]" : "border-[#cbd7e1] bg-[#fbfcfd] hover:border-[#8ba6bd] hover:bg-[#f5f8fb]"}`}>
                        <span className={`mb-2 grid size-11 place-items-center rounded-xl ${archivoArrastrando ? "bg-[#f3e7d2] text-[#946b2e]" : "bg-[#edf3f8] text-[#496782]"}`}><Upload className="size-5"/></span>
                        <span className="text-sm font-semibold text-[#253446]">{archivoArrastrando ? "Suelta el archivo para incorporarlo" : "Arrastra tu archivo aquí"}</span>
                        <span className="mt-1 text-xs text-[#718096]">o selecciónalo desde tu equipo</span>
                        <span className="mt-3 rounded-lg border border-[#dce4ec] bg-white px-3 py-1.5 text-xs font-semibold text-[#496782]">Seleccionar archivo</span>
                        <input id="aula-material-file" type="file" required onChange={(e: ChangeEvent<HTMLInputElement>)=>setArchivo(e.target.files?.[0]??null)} className="sr-only"/>
                      </label>
                      {archivo ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#ccebdd] bg-[#f2faf5] px-3 py-2.5 text-xs text-[#28744e]"><span className="min-w-0 break-all font-semibold">{archivo.name}</span><span className="shrink-0 tabular-nums">{(archivo.size/1024/1024).toFixed(2)} MB</span><button type="button" onClick={()=>{setArchivo(null);const input=document.getElementById("aula-material-file") as HTMLInputElement|null;if(input)input.value="";}} className="rounded-lg border border-[#b9dfcb] bg-white px-2.5 py-1.5 font-medium">Quitar archivo</button></div> : <p className="text-[11px] text-[#8190a0]">Almacenamiento privado · máximo 50 MB por archivo.</p>}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f3] pt-4">
                      <label className="flex items-center gap-2.5 text-xs font-medium text-[#526477]"><input type="checkbox" checked={publicarMaterial} onChange={e => setPublicarMaterial(e.target.checked)} className="size-4 accent-[#294760]"/> Publicar inmediatamente para los alumnos</label>
                      <button disabled={ocupado || !archivo} className="inline-flex items-center gap-2 rounded-xl bg-[#294760] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#203b52] disabled:cursor-not-allowed disabled:opacity-50"><Upload className="size-4"/> Subir material</button>
                    </div>
                    <p className="text-[11px] leading-5 text-[#8190a0]">Después podrás editar el título, cambiar la sesión asignada, reemplazar el archivo, retirar su publicación o eliminarlo.</p>
                  </form>
                </details>

                <div className="space-y-3 border-t border-[#edf0f3] pt-5">
                  <div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-sm font-semibold text-[#253446]">Recursos organizados</h3><p className="mt-1 text-xs text-[#718096]">Consulta y administra los materiales generales y los de cada sesión.</p></div><span className="text-[11px] font-medium text-[#8190a0]">Los cambios se reflejan en el aula del alumno</span></div>
                  {materialesDocenteQuery.isLoading ? <div className="rounded-xl border border-[#e4e9ef] bg-[#fbfcfd] px-4 py-8 text-center text-xs text-[#718096]">Cargando biblioteca…</div> : (materialesDocenteQuery.data ?? []).length === 0 ? <div className="rounded-xl border border-dashed border-[#cbd7e1] bg-[#fbfcfd] px-4 py-9 text-center"><span className="mx-auto grid size-11 place-items-center rounded-xl bg-[#edf3f8] text-[#496782]"><FileText className="size-5"/></span><p className="mt-3 text-sm font-semibold text-[#425466]">La biblioteca está lista para recibir recursos</p><p className="mt-1 text-xs text-[#8190a0]">Incorpora el primer material para comenzar a organizar el contenido del curso.</p></div> : <>
                    {[...((materialesDocenteQuery.data ?? []).some(m => !m.sesion_id) ? [{id:"general",label:"Material general del curso",items:(materialesDocenteQuery.data ?? []).filter(m => !m.sesion_id)}] : []),...(sesionesQuery.data ?? []).map(s => ({id:s.id,label:"Sesión " + s.numero + " · " + s.titulo,items:(materialesDocenteQuery.data ?? []).filter(m => m.sesion_id === s.id)}))].map(grupo => <details key={grupo.id} className="group/library overflow-hidden rounded-xl border border-[#e1e8ef] bg-white">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-white px-4 py-3.5 transition hover:bg-[#f1f5f8] [&::-webkit-details-marker]:hidden">
                        <span className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf3f8] text-[#496782]">{grupo.id === "general" ? <FolderOpen className="size-4"/> : <FileText className="size-4"/>}</span><span className="min-w-0"><span className="block truncate text-xs font-semibold text-[#253446]">{grupo.label}</span><span className="mt-0.5 block text-[11px] text-[#8190a0]">{grupo.items.length} recurso{grupo.items.length===1?"":"s"}</span></span></span>
                        <ChevronDown className="size-4 shrink-0 text-[#8190a0] transition-transform group-open/library:rotate-180"/>
                      </summary>
                      <div className="space-y-2 border-t border-[#edf0f3] p-3 sm:p-4">
                        {grupo.items.length===0 ? <p className="rounded-lg border border-dashed border-[#d5dfe7] bg-[#fbfcfd] px-3 py-4 text-center text-xs text-[#8190a0]">Todavía no hay archivos asignados a esta sesión.</p> : grupo.items.map(m => <div key={m.id} className="rounded-xl border border-[#e4e9ef] bg-white p-3 sm:p-4">
                          {materialEditandoId === m.id ? <form onSubmit={e => void guardarEdicionMaterial(e,m)} className="space-y-3 rounded-lg bg-white p-3">
                            <label className="block text-xs font-semibold text-[#425466]">Título<input required value={tituloMaterialEditado} onChange={e => setTituloMaterialEditado(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446]"/></label>
                            <label className="block text-xs font-semibold text-[#425466]">Reemplazar archivo <span className="font-normal text-[#8190a0]">· opcional</span><input type="file" onChange={e => setArchivoMaterialReemplazo(e.target.files?.[0] ?? null)} className="mt-2 block w-full rounded-lg border border-[#dce4ec] bg-white p-2 text-xs text-[#526477]"/></label>
                            <label className="block text-xs font-semibold text-[#425466]">Ubicación en el programa<select value={sesionMaterialEditada} onChange={e => setSesionMaterialEditada(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446]"><option value="">Material general del curso</option>{(sesionesQuery.data ?? []).map(s => <option key={s.id} value={s.id}>Sesión {s.numero} · {s.titulo}</option>)}</select></label>
                            <div className="flex flex-wrap gap-2"><button disabled={ocupado} className="rounded-lg bg-[#294760] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Guardar cambios</button><button type="button" onClick={() => setMaterialEditandoId("")} className="rounded-lg border border-[#dce4ec] bg-white px-3 py-2 text-xs font-medium text-[#60758a]">Cancelar</button></div>
                          </form> : <>
                            <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf3f8] text-[#496782]"><FileText className="size-4"/></span><div className="min-w-0"><p className="text-sm font-semibold text-[#253446]">{m.titulo}</p><p className="mt-1 break-all text-xs text-[#718096]">{m.nombre_archivo} · {(m.tamano_bytes/1024/1024).toFixed(1)} MB</p></div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${m.publicado ? "bg-emerald-50 text-emerald-700" : "bg-[#f3f6f8] text-[#718096]"}`}>{m.publicado ? "Publicado" : "Borrador"}</span></div>
                            <div className="mt-3 flex flex-wrap gap-2 border-t border-[#edf0f3] pt-3"><button type="button" onClick={() => void descargarMaterial(m)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce4ec] bg-white px-3 py-2 text-xs font-medium text-[#60758a] transition hover:bg-[#f7f9fb]"><Download className="size-3.5"/> Descargar</button><button type="button" onClick={() => {setMaterialEditandoId(m.id);setTituloMaterialEditado(m.titulo);setSesionMaterialEditada(m.sesion_id ?? "");}} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce4ec] bg-white px-3 py-2 text-xs font-medium text-[#60758a] transition hover:bg-[#f7f9fb]"><Pencil className="size-3.5"/> Editar</button><button type="button" disabled={ocupado} onClick={() => void cambiarPublicacionMaterial(m)} className="rounded-lg border border-[#dce4ec] bg-white px-3 py-2 text-xs font-medium text-[#60758a] transition hover:bg-[#f7f9fb] disabled:opacity-50">{m.publicado ? "Retirar publicación" : "Publicar"}</button><button type="button" disabled={ocupado} onClick={() => void eliminarMaterial(m)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"><Trash2 className="size-3.5"/> Eliminar</button></div>
                          </>}
                        </div>)}
                      </div>
                    </details>)}
                  </>}
                </div>
              </div>
            </Panel>
          </div>}
          {seccionDocente === "evaluaciones" && cursoActivoId && <div id="doc-evaluaciones" className="scroll-mt-24 space-y-4">
            <Panel titulo="Evaluaciones y cuestionarios" colapsable defaultOpen={false}>
              <div className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="text-sm font-semibold text-[#253446]">Instrumentos de evaluación</p><p className="mt-1 text-xs text-[#718096]">Diseña, configura y publica las evaluaciones del programa.</p></div>
                  <div className="flex flex-wrap gap-2"><span className="rounded-full border border-[#dce4ec] bg-[#f7f9fb] px-3 py-1.5 text-[11px] font-semibold text-[#526b81]">{(examenesQuery.data ?? []).length} evaluaciones</span><span className="rounded-full border border-[#ccebdd] bg-[#effaf4] px-3 py-1.5 text-[11px] font-semibold text-[#28744e]">{(examenesQuery.data ?? []).filter(x=>x.publicado).length} activas</span><span className="rounded-full border border-[#e4e9ef] bg-[#f7f9fb] px-3 py-1.5 text-[11px] font-semibold text-[#718096]">{(examenesQuery.data ?? []).filter(x=>!x.publicado).length} borradores</span></div>
                </div>

                <details className="group overflow-hidden rounded-xl border border-[#e5d8c2] bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-[#fbf8f2] px-4 py-3.5 transition hover:bg-[#f8f2e8] [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[#e8dcc7] bg-white text-[#9a7133]"><span className="text-lg leading-none">＋</span></span><span className="min-w-0"><span className="block text-sm font-semibold text-[#253446]">Crear evaluación</span><span className="mt-0.5 block text-xs text-[#718096]">Configura las condiciones iniciales. Las preguntas se gestionan después.</span></span></span>
                    <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-[#8b6a36]">Nueva evaluación <span className="text-[#9aabb9] transition group-open:rotate-180">⌄</span></span>
                  </summary>
                  <form onSubmit={crearExamen} className="space-y-4 border-t border-[#edf0f3] p-4 sm:p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-semibold text-[#425466] sm:col-span-2">Título de la evaluación<input value={tituloExamen} onChange={e=>setTituloExamen(e.target.value)} required maxLength={160} placeholder="Ej. Evaluación práctica · Modelado de anillos" className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446] outline-none placeholder:text-[#9aa7b5] focus:border-[#8ba6bd] focus:ring-2 focus:ring-[#8ba6bd]/15"/></label>
                      <label className="block text-xs font-semibold text-[#425466] sm:col-span-2">Asignar a<select value={sesionExamenId} onChange={e=>setSesionExamenId(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446] outline-none focus:border-[#8ba6bd] focus:ring-2 focus:ring-[#8ba6bd]/15"><option value="">Material general del curso</option>{(sesionesQuery.data ?? []).map(s=><option key={s.id} value={s.id}>Sesión {s.numero} · {s.titulo}</option>)}</select></label>
                      <label className="block text-xs font-semibold text-[#425466]">Duración<input type="number" min="1" max="300" value={duracionExamen} onChange={e=>setDuracionExamen(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446]"/> <span className="font-normal text-[#8190a0]">minutos</span></label>
                      <label className="block text-xs font-semibold text-[#425466]">Intentos permitidos<input type="number" min="1" max="10" value={intentosExamen} onChange={e=>setIntentosExamen(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446]"/></label>
                    </div>
                    <label className="block text-xs font-semibold text-[#425466]">Instrucciones <span className="font-normal text-[#8190a0]">· opcional</span><textarea value={instruccionesExamen} onChange={e=>setInstruccionesExamen(e.target.value)} rows={2} placeholder="Indicaciones que verá el alumno antes de comenzar…" className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446] outline-none focus:border-[#8ba6bd]"/></label>
                    <div className="grid gap-2 rounded-xl border border-[#e4e9ef] bg-white p-3 sm:grid-cols-2">
                      <label className="flex items-start gap-2.5 text-xs leading-5 text-[#526477]"><input type="checkbox" checked={aleatorizarPreguntas} onChange={e=>setAleatorizarPreguntas(e.target.checked)} className="mt-0.5 size-4 accent-[#294760]"/> Aleatorizar el orden de preguntas en cada intento</label>
                      <label className="flex items-start gap-2.5 text-xs leading-5 text-[#526477]"><input type="checkbox" checked={permitirRetroceso} onChange={e=>setPermitirRetroceso(e.target.checked)} className="mt-0.5 size-4 accent-[#294760]"/> Permitir volver a preguntas anteriores</label>
                    </div>
                    <div className="flex justify-end border-t border-[#edf0f3] pt-3"><button type="submit" disabled={ocupado || !tituloExamen.trim()} className="rounded-xl bg-[#294760] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#203b52] disabled:opacity-40">{ocupado ? "Creando…" : "Crear evaluación en borrador"}</button></div>
                  </form>
                </details>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2"><div><h3 className="text-sm font-semibold text-[#253446]">Evaluaciones del curso</h3><p className="mt-0.5 text-xs text-[#8190a0]">Abre una ficha para revisar sus preguntas y configuración.</p></div></div>
                  {(examenesQuery.data ?? []).map((x,idx) => <details key={x.id} className="group/examen overflow-hidden rounded-xl border border-[#e1e8ef] bg-white">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3.5 transition hover:bg-white [&::-webkit-details-marker]:hidden sm:px-4">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf3f8] text-xs font-bold tabular-nums text-[#496782]">{String(idx+1).padStart(2,"0")}</span>
                      <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold leading-5 text-[#253446]">{x.titulo}</span><span className={x.publicado ? "rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700" : "rounded-full bg-[#f3f6f8] px-2.5 py-1 text-[10px] font-semibold text-[#718096]"}>{x.publicado ? "Publicada" : "Borrador"}</span></span><span className="mt-1 block text-[11px] text-[#8190a0]">{x.duracion_minutos ?? "Sin límite"} min · {x.intentos_permitidos} intento(s)</span></span>
                      <span className="hidden shrink-0 text-xs font-medium text-[#60758a] sm:inline">Gestionar</span><span className="text-[#9aabb9] transition group-open/examen:rotate-180">⌄</span>
                    </summary>
                    <div className="space-y-3 border-t border-[#edf0f3] bg-[#fbfcfd] p-3.5 sm:p-4">
                      <button type="button" onClick={()=>{setExamenSeleccionado(x.id);setPreguntasAbiertasExamenId(v=>v===x.id?"":x.id);}} className="flex w-full items-center justify-between rounded-lg border border-[#dce4ec] bg-white px-3 py-2.5 text-xs font-semibold text-[#496782] transition hover:bg-[#f5f8fb]"><span>Banco de preguntas {x.id === examenActivoId ? "· " + (preguntasQuery.data ?? []).length : ""}</span><span>{preguntasAbiertasExamenId === x.id ? "Ocultar −" : "Consultar preguntas +"}</span></button>
                      {preguntasAbiertasExamenId === x.id && <div className="space-y-2 rounded-lg border border-[#e4e9ef] bg-white p-3">
                        {(preguntasQuery.data ?? []).length === 0 ? <p className="text-xs text-[#718096]">Este examen todavía no tiene preguntas cargadas.</p> : (preguntasQuery.data ?? []).map((p,idx)=><div key={p.id} className="rounded-lg border border-[#e4e9ef] bg-[#fbfcfd] p-3"><p className="text-[11px] font-medium text-[#8190a0]">Pregunta {idx+1} · {p.tipo.replaceAll("_"," ")} · {p.puntaje} pts</p><p className="mt-1 text-sm font-medium text-[#253446]">{p.enunciado}</p></div>)}
                      </div>}
                      {examenEditandoId === x.id ? <div className="grid gap-3 rounded-xl border border-[#dce4ec] bg-white p-3 sm:p-4">
                        <label className="text-xs font-semibold text-[#425466]">Título<input value={tituloExamenEditado} onChange={e=>setTituloExamenEditado(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446]"/></label>
                        <label className="text-xs font-semibold text-[#425466]">Instrucciones<textarea value={instruccionesExamenEditadas} onChange={e=>setInstruccionesExamenEditadas(e.target.value)} rows={2} className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446]"/></label>
                        <label className="text-xs font-semibold text-[#425466]">Sesión del curso<select value={sesionExamenEditada} onChange={e=>setSesionExamenEditada(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446]"><option value="">Material general del curso</option>{(sesionesQuery.data ?? []).map(s=><option key={s.id} value={s.id}>Sesión {s.numero} · {s.titulo}</option>)}</select></label>
                        <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-[#425466]">Duración (min)<input type="number" min="1" value={duracionExamenEditada} onChange={e=>setDuracionExamenEditada(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446]"/></label><label className="text-xs font-semibold text-[#425466]">Intentos permitidos<input type="number" min="1" max="10" value={intentosExamenEditados} onChange={e=>setIntentosExamenEditados(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446]"/></label></div>
                        <label className="flex items-center gap-2 text-xs text-[#526477]"><input type="checkbox" checked={aleatorizarPreguntasEditado} onChange={e=>setAleatorizarPreguntasEditado(e.target.checked)} className="size-4 accent-[#294760]"/> Aleatorizar preguntas por intento</label>
                        <label className="flex items-center gap-2 text-xs text-[#526477]"><input type="checkbox" checked={permitirRetrocesoEditado} onChange={e=>setPermitirRetrocesoEditado(e.target.checked)} className="size-4 accent-[#294760]"/> Permitir volver a preguntas anteriores</label>
                        <div className="rounded-xl border border-[#e5d8c2] bg-[#fbf8f2] p-3"><p className="text-xs font-semibold text-[#6e542d]">Programación del examen</p><p className="mt-1 text-[11px] text-[#8190a0]">Hora local de Perú. Déjalos vacíos para no limitar el calendario.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-[#425466]">Habilitar desde<input type="datetime-local" value={disponibleDesdeEditado} onChange={e=>setDisponibleDesdeEditado(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446]"/></label><label className="text-xs font-semibold text-[#425466]">Cerrar el<input type="datetime-local" value={disponibleHastaEditado} onChange={e=>setDisponibleHastaEditado(e.target.value)} className="mt-2 w-full rounded-xl border border-[#dce4ec] bg-white px-3 py-2.5 text-sm font-normal text-[#253446]"/></label></div></div>
                        <div className="flex flex-wrap gap-2"><button type="button" disabled={ocupado || x.publicado} onClick={()=>void guardarEdicionExamen(x)} className="rounded-lg bg-[#294760] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Guardar cambios</button><button type="button" onClick={()=>setExamenEditandoId("")} className="rounded-lg border border-[#dce4ec] bg-white px-3 py-2 text-xs text-[#60758a]">Cancelar</button></div>
                      </div> : <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={()=>iniciarEdicionExamen(x)} disabled={x.publicado} className="rounded-lg border border-[#dce4ec] bg-white px-3 py-2 text-xs font-medium text-[#60758a] disabled:opacity-40">Modificar configuración</button>
                        <button type="button" disabled={ocupado} onClick={()=>void publicarExamen(x)} className="rounded-lg bg-[#294760] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{x.publicado ? "Retirar publicación" : "Publicar / Activar"}</button>
                        <button type="button" onClick={()=>setExamenEliminarPendiente(x)} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700">Eliminar</button>
                      </div>}
                      {examenEliminarPendiente?.id === x.id && <div className="rounded-xl border border-red-200 bg-red-50 p-3"><p className="text-xs leading-5 text-red-800">¿Eliminar «{x.titulo}» y sus preguntas? Esta acción no se puede deshacer. Si ya tiene intentos registrados, se conservará el historial y no se permitirá eliminarla.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={ocupado} onClick={()=>void eliminarExamen(x)} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white">Confirmar eliminación</button><button type="button" onClick={()=>setExamenEliminarPendiente(null)} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-red-700">Cancelar</button></div></div>}
                    </div>
                  </details>)}
                  {(examenesQuery.data ?? []).length === 0 && <div className="rounded-xl border border-dashed border-[#cbd7e1] bg-[#fbfcfd] px-4 py-8 text-center"><p className="text-sm font-semibold text-[#425466]">Todavía no hay evaluaciones</p><p className="mt-1 text-xs text-[#8190a0]">Crea la primera evaluación para este curso.</p></div>}
                </div>
              </div>
            </Panel>

            <Panel titulo="Entregas y revisión docente">
              <div className="space-y-4 p-5">
                <div><p className="text-sm font-semibold text-[#253446]">Seguimiento de participantes</p><p className="mt-1 text-xs text-[#718096]">Consulta quién entregó, quién tiene pendiente y revisa los intentos enviados.</p></div>
                {(examenesQuery.data ?? []).length === 0 ? <div className="rounded-xl border border-dashed border-[#cbd7e1] bg-[#fbfcfd] px-4 py-7 text-center text-xs text-[#8190a0]">Cuando crees una evaluación, aquí aparecerá su seguimiento.</div> : (examenesQuery.data ?? []).map(examenSeguimiento => {
                  const inscritos = (inscripcionesQuery.data ?? []).filter((i: any) => ["activo", "finalizado"].includes(i.estado));
                  const intentosExamen = (intentosDocenteQuery.data ?? []).filter(i => i.examen_id === examenSeguimiento.id && i.estado !== "en_curso");
                  const usuariosConEntrega = new Set(intentosExamen.map(i => i.alumno_user_id));
                  const entregaron = inscritos.filter((i: any) => i.alumno_user_id && usuariosConEntrega.has(i.alumno_user_id)).length;
                  const pendientes = Math.max(0, inscritos.length - entregaron);
                  return <details key={examenSeguimiento.id} className="group/seguimiento overflow-hidden rounded-xl border border-[#e1e8ef] bg-white">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3.5 transition hover:bg-white [&::-webkit-details-marker]:hidden sm:px-4">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf3f8] text-[#496782]"><span className="text-sm font-bold">✓</span></span>
                      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#253446]">{examenSeguimiento.titulo}</span><span className="mt-0.5 block text-[11px] text-[#8190a0]">{inscritos.length} inscritos · {entregaron} entregaron · {pendientes} pendientes</span></span>
                      <span className="text-[#9aabb9] transition group-open/seguimiento:rotate-180">⌄</span>
                    </summary>
                    <div className="space-y-3 border-t border-[#edf0f3] bg-[#fbfcfd] p-3.5 sm:p-4">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl border border-[#e1e8ef] bg-white p-2.5"><p className="text-xl font-semibold tabular-nums text-[#294760]">{inscritos.length}</p><p className="text-[10px] font-medium text-[#718096]">Inscritos</p></div>
                        <div className="rounded-xl border border-[#ccebdd] bg-[#effaf4] p-2.5"><p className="text-xl font-semibold tabular-nums text-emerald-700">{entregaron}</p><p className="text-[10px] font-medium text-emerald-700">Entregaron</p></div>
                        <div className="rounded-xl border border-[#f0dfb8] bg-[#fff9e9] p-2.5"><p className="text-xl font-semibold tabular-nums text-amber-700">{pendientes}</p><p className="text-[10px] font-medium text-amber-700">Pendientes</p></div>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-[#e4e9ef] bg-white">
                        <div className="border-b border-[#edf0f3] px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-wide text-[#8190a0]">Estado por alumno</p></div>
                        {inscritos.length === 0 ? <p className="px-3 py-4 text-center text-xs text-[#8190a0]">Todavía no hay alumnos inscritos en este curso.</p> : inscritos.map((alumno: any) => {const entregado = Boolean(alumno.alumno_user_id && usuariosConEntrega.has(alumno.alumno_user_id));const intentosAlumno = intentosExamen.filter(i => i.alumno_user_id === alumno.alumno_user_id);return <div key={alumno.id} className="flex items-center justify-between gap-3 border-b border-[#edf0f3] px-3 py-2.5 last:border-b-0"><span className="min-w-0 truncate text-xs font-medium text-[#425466]">{alumno.nombre_alumno || alumno.email_alumno}</span><span className={entregado ? "shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700" : "shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700"}>{entregado ? "Entregado · " + intentosAlumno.length + " intento(s)" : "Pendiente"}</span></div>;})}
                      </div>
                    </div>
                  </details>;
                })}
                <div className="space-y-3 border-t border-[#edf0f3] pt-4">
                  <div><h3 className="text-sm font-semibold text-[#253446]">Entregas recibidas</h3><p className="mt-1 text-xs text-[#718096]">Abre cada entrega para leer las respuestas y registrar la calificación práctica.</p></div>
                  {(intentosDocenteQuery.data ?? []).filter(intento => intento.estado !== "en_curso").length === 0 ? <div className="rounded-xl border border-dashed border-[#cbd7e1] bg-[#fbfcfd] px-4 py-7 text-center"><p className="text-sm font-semibold text-[#425466]">Todavía no hay entregas</p><p className="mt-1 text-xs text-[#8190a0]">Las respuestas enviadas por los alumnos aparecerán aquí.</p></div> : (intentosDocenteQuery.data ?? []).filter(intento => intento.estado !== "en_curso").map(intento => {
                    const examen = (intento as any).formacion_examenes;
                    const preguntas = (examen?.formacion_preguntas ?? []) as Array<{id:string;enunciado:string;tipo:string;puntaje:number}>;
                    const respuestas = Array.isArray(intento.respuestas) ? intento.respuestas as Array<{pregunta_id?:string;respuesta?:unknown}> : [];
                    const alumnoEntrega = (inscripcionesQuery.data ?? []).find((i: any) => i.alumno_user_id === intento.alumno_user_id);
                    const nombreAlumno = alumnoEntrega?.nombre_alumno || alumnoEntrega?.email_alumno || ("Alumno " + intento.alumno_user_id.slice(0,8));
                    return <details key={intento.id} className="group/entrega overflow-hidden rounded-xl border border-[#e1e8ef] bg-white">
                      <summary className="flex cursor-pointer items-center gap-3 px-3.5 py-3.5 transition hover:bg-white [&::-webkit-details-marker]:hidden sm:px-4">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf3f8] text-[#496782]"><span className="text-xs font-bold">R</span></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#253446]">{nombreAlumno}</span><span className="mt-0.5 block text-[11px] text-[#8190a0]">{examen?.titulo ?? "Evaluación"} · Intento {intento.numero_intento} · {new Date(intento.enviado_en).toLocaleString("es-PE")}</span></span>
                        <span className={intento.estado === "pendiente_revision" ? "shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700" : "shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700"}>{intento.estado === "pendiente_revision" ? "Por revisar" : intento.estado}</span><span className="text-[#9aabb9] transition group-open/entrega:rotate-180">⌄</span>
                      </summary>
                      <div className="space-y-3 border-t border-[#edf0f3] bg-[#fbfcfd] p-3.5 sm:p-4">
                        <div className="space-y-2">{respuestas.map((r, idx) => {const pregunta = preguntas.find(p => p.id === r.pregunta_id);return <div key={r.pregunta_id ?? idx} className="rounded-lg border border-[#e4e9ef] bg-white p-3"><p className="text-[11px] font-semibold text-[#8190a0]">Pregunta {idx+1}{pregunta ? " · " + pregunta.tipo.replaceAll("_"," ") + " · " + pregunta.puntaje + " pts" : ""}</p><p className="mt-1 text-xs font-semibold text-[#253446]">{pregunta?.enunciado ?? ("Respuesta " + (idx+1))}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#526477]">{typeof r.respuesta === "string" ? r.respuesta : JSON.stringify(r.respuesta)}</p></div>;})}</div>
                        {intento.estado === "pendiente_revision" ? <div className="grid gap-3 rounded-xl border border-[#e5d8c2] bg-[#fbf8f2] p-3 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
                          <label className="text-xs font-semibold text-[#6e542d]">Nota práctica (0–20)<input type="number" min="0" max="20" step="0.25" value={notasPracticas[intento.id] ?? ""} onChange={e => setNotasPracticas(v => ({...v,[intento.id]:e.target.value}))} className="mt-2 w-full rounded-xl border border-[#e4d8c5] bg-white px-3 py-2.5 text-sm font-normal text-[#253446]"/></label>
                          <label className="text-xs font-semibold text-[#6e542d]">Observaciones<textarea rows={2} value={observacionesPracticas[intento.id] ?? ""} onChange={e => setObservacionesPracticas(v => ({...v,[intento.id]:e.target.value}))} className="mt-2 w-full rounded-xl border border-[#e4d8c5] bg-white px-3 py-2.5 text-sm font-normal text-[#253446]"/></label>
                          <button type="button" disabled={ocupado || notasPracticas[intento.id] === undefined || notasPracticas[intento.id] === ""} onClick={() => void calificarPractica(intento.id)} className="self-end rounded-xl bg-[#294760] px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-40">Guardar nota</button>
                        </div> : <div className="rounded-xl border border-[#e1e8ef] bg-white p-3"><p className="text-xs font-semibold text-[#425466]">Calificación registrada: {intento.calificacion ?? "Pendiente"}/20</p>{intento.observaciones_docente && <p className="mt-1 text-xs leading-5 text-[#718096]">{intento.observaciones_docente}</p>}</div>}
                      </div>
                    </details>;
                  })}
                </div>
              </div>
            </Panel>
          </div>}
          {cursosQuery.error && <p className="rounded-xl border border-red-300 p-3 text-sm text-red-700">{cursosQuery.error.message}</p>}
        </>
      ) : (
        <>
          {lecturaAbierta && <div className={`fixed inset-0 z-[60] flex items-center justify-center overflow-hidden ${modoAulaExpandida ? "bg-background p-0" : `bg-black/25 p-2 sm:p-3 ${lecturaModoVistaPrevia ? "left-0 lg:left-64 xl:left-72" : ""}`}`} role="dialog" aria-modal="true" aria-label="Lectura de la sesión">
            <div className={"mx-auto flex h-[calc(100dvh-1rem)] max-h-[900px] min-h-0 w-full flex-col " + (modoAulaExpandida ? "max-w-none" : lecturaAbierta.numero === 5 ? "max-w-[1700px]" : "max-w-5xl") + ` overflow-hidden border border-[#D2D2D7] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.12)] ${modoAulaExpandida ? "h-full max-h-none rounded-none border-0" : "rounded-2xl"}`}>
              <header className={`shrink-0 border-b border-[#D2D2D7] bg-white ${modoAulaExpandida ? "px-4 py-2 sm:px-6 sm:py-2" : "px-4 py-3 sm:px-6 sm:py-4"}`}>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#98722e]">FADILAB · Aula de formación · Lectura guiada</p>
                    <h2 className={`font-semibold leading-tight ${modoAulaExpandida ? "mt-0.5 text-base sm:text-lg" : "mt-1 text-lg"}`}>{lecturaAbierta.numero}. {lecturaAbierta.titulo}</h2>
                    {!modoAulaExpandida && <p className="mt-1 text-xs text-[#6E6E73]">{lecturaModoVistaPrevia ? "Modo de prueba docente · el avance no se guarda en la cuenta de ningún alumno." : "Al abrir esta lectura se registra como leída. Avanza por los apartados y márcala como completada al finalizar."}</p>}
                  </div>
                  <button type="button" onClick={() => { setLecturaAbierta(null); setLecturaModoVistaPrevia(false); setModoAulaExpandida(false); }} className="shrink-0 rounded-lg border border-[#d8e1ea] bg-white px-3 py-1.5 text-xs font-medium text-[#1D1D1F] transition hover:border-[#b99552]">Cerrar</button>
                </div>
                <div className={`flex items-center gap-3 ${modoAulaExpandida ? "mt-2" : "mt-4"}`}>
                  <div className={`min-w-0 flex-1 overflow-hidden rounded-full bg-[#E5E5EA] ${modoAulaExpandida ? "h-1" : "h-2"}`}><div className="h-full rounded-full bg-[#B99552] transition-all" style={{width: (((paginaLectura+1)/seccionesLecturaActivas.length)*100)+"%"}}/></div>
                  <p className="shrink-0 text-[11px] text-[#6E6E73]">Apartado {paginaLectura+1} de {seccionesLecturaActivas.length}</p>
                </div>
              </header>
              <nav aria-label="Índice de la lectura" className={`shrink-0 border-b border-[#D2D2D7] bg-[#F5F5F7] px-4 sm:px-6 ${modoAulaExpandida ? "py-2" : "py-3"}`}>
                <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 ${modoAulaExpandida ? "mb-1" : "mb-2"}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E73]">Índice de contenidos</p>
                  {!modoAulaExpandida && <p className="text-[10px] text-[#6E6E73]">Selecciona un apartado para navegar</p>}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-0.5">
                  {seccionesLecturaActivas.map((seccion, indice) => <button key={indice} type="button" onClick={() => setPaginaLectura(indice)} aria-current={paginaLectura===indice ? "step" : undefined} className={`flex h-10 shrink-0 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition ${paginaLectura===indice ? "border-[#B99552] bg-[#C4A15A] text-[#1D1D1F] shadow-sm" : "border-[#D2D2D7] bg-white text-[#1D1D1F] hover:border-[#B99552] hover:bg-[#FBF8F1]"}`} title={seccion.titulo}>{String(indice+1).padStart(2,"0")}</button>)}
                </div>
                {!modoAulaExpandida && <p className="mt-2 truncate text-xs font-medium text-[#1D1D1F]">{seccionesLecturaActivas[paginaLectura]?.titulo ?? "Lectura"}</p>}
              </nav>
              <main className={`min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-10 lg:px-14 ${modoAulaExpandida ? "bg-white text-[#334155]" : "bg-white px-5 py-5 sm:px-8 sm:py-6 lg:px-10"}`}>
                <section className={`mx-auto w-full ${modoAulaExpandida ? "max-w-[1180px]" : "max-w-4xl"}`}>
                  <h3 className="mb-5 max-w-[1080px] font-display text-2xl leading-tight sm:text-3xl">{seccionesLecturaActivas[paginaLectura]?.titulo ?? "Lectura"}</h3>
<AuriTutorCurso contexto={[
                      "Curso: Diseño CAD 3D para Joyería y Manufactura Aditiva con Inteligencia Artificial – Nivel 1",
                      "Sesión " + lecturaAbierta.numero + ": " + lecturaAbierta.titulo,
                      "Apartado: " + (seccionesLecturaActivas[paginaLectura]?.titulo ?? "Lectura"),
                      "Contenido de referencia:",
                      (seccionesLecturaActivas[paginaLectura]?.bloques ?? []).join("\n"),
                    ].join("\n")} />
                  {(seccionesLecturaActivas[paginaLectura]?.bloques ?? []).map((bloque,idx) => {
                    if (lecturaAbierta?.numero === 1 && paginaLectura === 4 && idx >= 6) return null;
                    return <div key={idx}><p className={`mb-5 whitespace-pre-line ${modoAulaExpandida ? "w-full max-w-[1100px] text-[17px] leading-[1.8] tracking-[0.005em] text-[#3A3A3C]" : "max-w-4xl text-[15px] leading-7 text-foreground/90"}`}>{bloque}</p></div>;
                  })}
                {lecturaAbierta?.numero === 1 && paginaLectura === 6 && <section className="mt-7 w-full max-w-[1100px] rounded-2xl border border-[#E5DCCB] bg-gradient-to-br from-white via-[#fffefa] to-[#f7f3eb] p-5 text-[#24221e] sm:p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7B43]">Material visual de apoyo · FADILAB</p>
                  <h4 className="mt-1 text-lg font-semibold">Proceso de joyería con impresión 3D</h4>
                  <p className="mt-2 text-sm leading-6 text-[#6E6E73]">Consulta la secuencia visual que conecta el diseño digital con la preparación del modelo, la impresión 3D y la fabricación de la joya.</p>
                  {imagenProceso3DUrl ? <button type="button" onClick={() => setTipoImagenApoyoAbierta(tipoImagenApoyoAbierta === "proceso3d" ? null : "proceso3d")} aria-expanded={tipoImagenApoyoAbierta === "proceso3d"} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#C4A15A] px-5 py-3 text-sm font-semibold text-[#1D1D1F] shadow-sm transition hover:bg-[#B99552] focus:outline-none focus:ring-2 focus:ring-[#B99552]/30">Ver proceso de joyería con impresión 3D <ChevronRight className="size-4"/></button> : <p className="mt-3 text-xs text-[#6E6E73]">{imagenProceso3DError || "Buscando la imagen en la Biblioteca del curso…"}</p>}
                  {tipoImagenApoyoAbierta === "proceso3d" && <div className="fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-black/75 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Proceso de joyería con impresión 3D">
                    <div className="flex max-h-[96dvh] w-full max-w-[1200px] flex-col overflow-hidden rounded-xl border border-[#D2D2D7] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.12)]">
                      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#D2D2D7] bg-white px-4 py-3 sm:px-5">
                        <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7B43]">FADILAB · Material de estudio</p><h3 className="text-base font-semibold">Proceso de joyería con impresión 3D</h3></div>
                        <button type="button" onClick={() => setTipoImagenApoyoAbierta(null)} className="shrink-0 rounded-lg border border-[#D2D2D7] px-3 py-2 text-xs font-semibold text-[#3A3A3C] hover:bg-[#F5F5F7]">Cerrar ×</button>
                      </header>
                      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#F5F5F7] p-3 sm:p-5">
                        <img src={imagenProceso3DUrl} alt="Proceso de joyería con impresión 3D" className="block h-auto max-h-[78dvh] w-auto max-w-full rounded-lg object-contain" />
                      </div>
                    </div>
                  </div>}
                </section>}
                {lecturaAbierta?.numero === 2 && paginaLectura === 2 && <section className="mx-auto mt-7 w-full max-w-4xl overflow-hidden rounded-2xl border border-[#E5DCCB] bg-gradient-to-br from-white via-[#fffefa] to-[#f7f3eb] p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#98743c]">FADILAB · Sesión 02 · Práctica interactiva</p>
                      <h4 className="mt-1 text-xl font-semibold tracking-tight text-[#252a31]">CURVE LAB <span className="font-normal text-[#7b8490]">/ Curvas básicas</span></h4>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-[#626d79]">Construye líneas, polilíneas, círculos y rectángulos sobre un plano XY interactivo. Practica cada herramienta y comprueba tus resultados.</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-medium text-[#6c6251]">{["4 herramientas Rhino","Plano XY interactivo","Validación por ejercicio"].map(item=><span key={item} className="rounded-full border border-[#e7ddca] bg-white/80 px-3 py-1.5">{item}</span>)}</div>
                    </div>
                    <button type="button" onClick={() => setLaboratorioCurvasBasicasAbierto(true)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-b from-[#e6c77d] to-[#bf9952] px-5 py-3 text-sm font-bold text-[#241b0c] shadow-sm transition hover:-translate-y-0.5 hover:brightness-105"><Pencil className="size-4"/> Iniciar Curve Lab <ArrowRight className="size-4"/></button>
                  </div>
                </section>}
                {lecturaAbierta?.numero === 2 && paginaLectura === 2 && laboratorioCurvasBasicasAbierto && <LaboratorioCurvasBasicas onClose={() => setLaboratorioCurvasBasicasAbierto(false)}/>}
                {lecturaAbierta?.numero === 1 && paginaLectura === 0 && <div className="mt-7 flex w-full max-w-[1100px] flex-col items-start gap-3 rounded-2xl border border-[#E5DCCB] bg-[#FBF8F1] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="max-w-2xl">
                    <p className="text-sm font-semibold text-[#1D1D1F]">Lleva tu diseño CAD a una presentación 3D</p>
                    <p className="mt-1 text-sm leading-6 text-[#6E6E73]">Explora materiales, metales e iluminación para visualizar tu pieza en Aurum Render.</p>
                  </div>
                  <a href="/aurum-render" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#C4A15A] px-5 py-3 text-sm font-semibold text-[#1D1D1F] shadow-sm transition hover:bg-[#B99552] focus:outline-none focus:ring-2 focus:ring-[#B99552]/30">Ir a Aurum Render <span aria-hidden="true">↗</span></a>
                </div>}
                {renderLaboratorioCoordenadas()}
                    {renderLaboratorioPreparacion()}
                {renderLaboratorioSesion4()}
                {lecturaAbierta?.numero === 5 && <section className="mx-auto mt-7 w-full max-w-[1100px]">{renderLaboratorioSesion5()}</section>}
                {renderLaboratorioRestricciones()}
                {renderLaboratorioOsnap()}
                {renderLaboratorioSmartTrack()}
                {renderLaboratorioPlaca()}
                {renderLaboratorioGeometria()}
                <RhinoObjectExplorer visible={lecturaAbierta?.numero === 2 && paginaLectura === 4} materials={materialesVistaAula} />
                
                {lecturaAbierta?.numero === 2 && paginaLectura === 4 && <>
                  <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#A47B32]">Mini guía · Rhino 7</p><h4 className="mt-1 text-base font-semibold text-slate-900">Del comando al objeto</h4><p className="mt-1 text-sm text-slate-600">Aprende el flujo básico para crear y seleccionar geometría.</p></div>
                    <button type="button" onClick={()=>setGuiaComandosAbierta(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#C6A15B] px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:brightness-105"><BookOpenCheck className="size-4"/> Abrir guía</button>
                  </section>
                  {guiaComandosAbierta && <div className="fixed inset-0 z-[120] flex h-[100dvh] w-full flex-col overflow-y-auto bg-[#171C24] text-[#E8EDF2]" role="dialog" aria-modal="true" aria-label="Guía de comandos y selección en Rhino">
                    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#1D2630] px-4 py-3 sm:px-7"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#D8B979]">FADILAB · Sesión 02 · Rhino 7</p><h3 className="text-lg font-semibold">Del comando al objeto</h3><p className="text-xs text-[#AAB7C5]">Guía visual · Crear, confirmar y seleccionar</p></div><button type="button" onClick={()=>setGuiaComandosAbierta(false)} className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold hover:border-[#C6A15B]">Cerrar ✕</button></header>
                    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-5 p-4 sm:p-8">
                      <div className="grid gap-3 sm:grid-cols-5">{[
                        {n:"01",t:"Crear",d:"Escribe LINE, CIRCLE o RECTANGLE.",k:"⌨",e:"Comando"},
                        {n:"02",t:"Indicar",d:"Marca los puntos que Rhino solicita.",k:"●",e:"Puntos"},
                        {n:"03",t:"Confirmar",d:"Pulsa Enter cuando Rhino lo indique.",k:"↵",e:"Enter"},
                        {n:"04",t:"Seleccionar",d:"Haz clic sobre la geometría creada.",k:"◉",e:"Clic"},
                        {n:"05",t:"Cancelar",d:"Pulsa Esc para cancelar o quitar selección.",k:"Esc",e:"Esc"},
                      ].map(step=><article key={step.n} className="rounded-xl border border-white/10 bg-[#222B36] p-4"><span className="text-[10px] font-bold tracking-widest text-[#D8B979]">{step.n} · {step.e}</span><div className="my-4 flex h-20 items-center justify-center rounded-lg bg-[#171C24] text-3xl font-semibold text-[#D8B979]">{step.k}</div><h4 className="font-semibold">{step.t}</h4><p className="mt-1 text-sm leading-5 text-[#AAB7C5]">{step.d}</p></article>)}</div>
                      <section className="rounded-xl border border-[#C6A15B]/30 bg-[#C6A15B]/10 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-[#D8B979]">Aplicación en joyería</p><p className="mt-2 text-sm leading-6 text-[#E8EDF2]">Crea un círculo para definir una referencia de piedra, dibuja el perfil del aro con una curva y selecciona cada objeto para organizarlo. Lee siempre la indicación de la línea de comandos antes del siguiente clic.</p></section>
                      <p className="text-center text-xs text-[#AAB7C5]">Recuerda: Enter confirma cuando Rhino lo solicita · Esc cancela el comando activo.</p>
                    </main>
                  </div>}
                </>}
                {renderLaboratorioCapas()}
                {renderSelectorVistasPlano()}

                <div className="mt-5 grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
                {lecturaAbierta?.numero === 1 && paginaLectura === 4 && <section className="h-full rounded-xl border border-[#e0e6ed] bg-white text-[#1D1D1F] p-5 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#98722e]">Recurso interactivo</p>
                  <h4 className="mt-1 text-base font-semibold">Comandos de navegación</h4>
                  <p className="mt-2 text-sm text-[#6E6E73]">Abre la ficha para explorar los comandos y consultar la función de cada uno.</p>
                  <button type="button" onClick={() => { setComandoNavegacionActivo("Zoom"); setComandosNavegacionAbiertos(true); }} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#b99552] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a9823f]">Ver comandos de navegación <ChevronRight className="size-4"/></button>
                  {comandosNavegacionAbiertos && <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/75 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Comandos de navegación de Rhino 7">
                    <div className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#D2D2D7] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.12)]">
                      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#D2D2D7] bg-white px-5 py-4">
                        <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7B43]">FADILAB · Guía interactiva</p><h3 className="text-lg font-semibold">Comandos de navegación · Rhino 7</h3><p className="mt-1 text-xs text-[#6E6E73]">Selecciona un comando para consultar su función.</p></div>
                        <button type="button" onClick={() => setComandosNavegacionAbiertos(false)} className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold hover:border-gold">Cerrar ×</button>
                      </header>
                      <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
                        <div className="overflow-hidden rounded-xl border border-white/10">
                          <table className="w-full border-collapse text-left text-sm"><thead><tr className="bg-[#F5F5F7]"><th className="border-b border-[#D2D2D7] px-4 py-3">Comando</th><th className="border-b border-[#D2D2D7] px-4 py-3">Función</th></tr></thead><tbody>
                            {[
                              {comando:"Zoom",funcion:"Control de acercamiento"},
                              {comando:"ZE",funcion:"Zoom Extents: encuadrar todos los objetos"},
                              {comando:"ZEA",funcion:"Zoom All Extents: encuadrar todas las vistas"},
                              {comando:"ZS",funcion:"Zoom Selected: encuadrar objetos seleccionados"},
                              {comando:"Pan",funcion:"Desplazamiento de la vista"},
                              {comando:"UndoView",funcion:"Recuperar la vista anterior"}
                            ].map(item=><tr key={item.comando}><td className="border-b border-[#D2D2D7] p-0"><button type="button" onClick={()=>setComandoNavegacionActivo(item.comando)} aria-pressed={comandoNavegacionActivo===item.comando} className={`w-full px-4 py-3 text-left font-semibold transition hover:bg-[#F5F5F7] ${comandoNavegacionActivo===item.comando?"bg-gold/15 text-[#9A7B43]":"bg-white"}`}>{item.comando}</button></td><td className="border-b border-[#D2D2D7] px-4 py-3">{item.funcion}</td></tr>)}
                          </tbody></table>
                        </div>
                        <div className="mt-4 rounded-xl border border-[#D2D2D7] bg-[#F5F5F7] p-4" aria-live="polite">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9A7B43]">Comando seleccionado</p>
                          <p className="mt-1 text-lg font-semibold">{comandoNavegacionActivo}</p>
                          <p className="mt-1 text-sm text-[#3A3A3C]">{({Zoom:"Control de acercamiento",ZE:"Zoom Extents: encuadrar todos los objetos",ZEA:"Zoom All Extents: encuadrar todas las vistas",ZS:"Zoom Selected: encuadrar objetos seleccionados",Pan:"Desplazamiento de la vista",UndoView:"Recuperar la vista anterior"} as Record<string,string>)[comandoNavegacionActivo]}</p>
                        </div>
                      </div>
                    </div>
                  </div>}
                </section>}
                {renderRetoNavegacion()}
              </div>
                {lecturaAbierta?.numero === 1 && paginaLectura === 1 && <section className="mt-7 rounded-2xl border border-[#e0e6ed] bg-white text-[#1D1D1F] p-5 sm:p-6 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#98722e]">Material visual de apoyo</p>
                  <h4 className="mt-1 text-lg font-semibold">Rhinoceros 7</h4>
                  <p className="mt-2 text-sm leading-6 text-[#6E6E73]">Consulta la imagen de referencia general del programa.</p>
                  {imagenRhinoUrl ? <button type="button" onClick={() => setTipoImagenApoyoAbierta(tipoImagenApoyoAbierta === "rhinoceros" ? null : "rhinoceros")} aria-expanded={tipoImagenApoyoAbierta === "rhinoceros"} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#b99552] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a9823f]">Ver RHINOCEROS <ChevronRight className="size-4"/></button> : <p className="mt-3 text-xs text-[#6E6E73]">{imagenRhinoError || "Buscando RHINOCEROS en la Biblioteca del curso…"}</p>}
                  {tipoImagenApoyoAbierta && <div className="fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-black/75 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Imagen de referencia de Rhinoceros">
                    <div className="flex max-h-[96dvh] w-full max-w-[1200px] flex-col overflow-hidden rounded-xl border border-[#D2D2D7] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.12)]">
                      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#D2D2D7] bg-white px-4 py-3 sm:px-5">
                        <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7B43]">FADILAB · Material de estudio</p><h3 className="text-base font-semibold">{tipoImagenApoyoAbierta === "rhinoceros" ? "Rhinoceros 7" : tipoImagenApoyoAbierta === "vistas" ? "Vistas de trabajo" : "Ejes de coordenadas"}</h3></div>
                        <button type="button" onClick={() => setTipoImagenApoyoAbierta(null)} className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold hover:border-gold">Cerrar ×</button>
                      </header>
                      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-background p-3 sm:p-5">
                        <img src={tipoImagenApoyoAbierta === "rhinoceros" ? imagenRhinoUrl : tipoImagenApoyoAbierta === "vistas" ? imagenesVistasUrl : imagenesEjesUrl} alt={tipoImagenApoyoAbierta === "rhinoceros" ? "Referencia de Rhinoceros 7" : tipoImagenApoyoAbierta === "vistas" ? "Vistas de trabajo de Rhinoceros" : "Ejes de coordenadas de Rhinoceros"} className="block h-auto max-h-[78dvh] w-auto max-w-full rounded-lg object-contain" />
                      </div>
                    </div>
                  </div>}
                </section>}
                {lecturaAbierta?.numero === 1 && paginaLectura === 3 && <section className="mt-7 rounded-2xl border border-[#e0e6ed] bg-white text-[#1D1D1F] p-5 sm:p-6 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#98722e]">Material visual de apoyo</p>
                  <h4 className="mt-1 text-lg font-semibold">Vistas y ejes de Rhinoceros 7</h4>
                  <p className="mt-2 text-sm leading-6 text-[#6E6E73]">Identifica las vistas de trabajo y la orientación espacial mediante los ejes de coordenadas.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {imagenesVistasUrl && <button type="button" onClick={() => setTipoImagenApoyoAbierta(tipoImagenApoyoAbierta === "vistas" ? null : "vistas")} aria-expanded={tipoImagenApoyoAbierta === "vistas"} className="inline-flex items-center gap-2 rounded-xl bg-[#b99552] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a9823f]">Ver VISTAS <ChevronRight className="size-4"/></button>}
                    {imagenesEjesUrl && <button type="button" onClick={() => setTipoImagenApoyoAbierta(tipoImagenApoyoAbierta === "ejes" ? null : "ejes")} aria-expanded={tipoImagenApoyoAbierta === "ejes"} className="inline-flex items-center gap-2 rounded-xl bg-[#b99552] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a9823f]">Ver EJES <ChevronRight className="size-4"/></button>}
                  </div>
                  {!imagenesVistasUrl && !imagenesEjesUrl && <p className="mt-3 text-xs text-[#6E6E73]">{errorImagenesApoyo || "Buscando VISTAS y EJES en la Biblioteca del curso…"}</p>}
                  {(tipoImagenApoyoAbierta === "vistas" || tipoImagenApoyoAbierta === "ejes") && <div className="fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-black/75 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Imagen de referencia de Rhinoceros">
                    <div className="flex max-h-[96dvh] w-full max-w-[1200px] flex-col overflow-hidden rounded-xl border border-[#D2D2D7] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.12)]">
                      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#D2D2D7] bg-white px-4 py-3 sm:px-5">
                        <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7B43]">FADILAB · Material de estudio</p><h3 className="text-base font-semibold">{tipoImagenApoyoAbierta === "vistas" ? "Vistas de trabajo" : "Ejes de coordenadas"}</h3></div>
                        <button type="button" onClick={() => setTipoImagenApoyoAbierta(null)} className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold hover:border-gold">Cerrar ×</button>
                      </header>
                      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-background p-3 sm:p-5">
                        <img src={tipoImagenApoyoAbierta === "vistas" ? imagenesVistasUrl : imagenesEjesUrl} alt={tipoImagenApoyoAbierta === "vistas" ? "Vistas de trabajo de Rhinoceros" : "Ejes de coordenadas de Rhinoceros"} className="block h-auto max-h-[78dvh] w-auto max-w-full rounded-lg object-contain" />
                      </div>
                    </div>
                  </div>}
                </section>}
                {lecturaAbierta?.numero === 1 && paginaLectura === 2 && !interfazInteractivaAbierta && <section className="mt-7 rounded-2xl border border-[#e0e6ed] bg-white text-[#1D1D1F] p-5 sm:p-6 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#98722e]">Actividad guiada · FADILAB</p>
                  <h4 className="mt-1 text-lg font-semibold">Conoce cada parte de la interfaz</h4>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6E6E73]">Abre el recorrido interactivo para identificar los componentes directamente sobre la captura de MatrixGold 3.1. Explora los 14 marcadores numerados para conocer dónde se encuentra cada componente y para qué sirve.</p>
                  <button type="button" disabled={!imagenInterfazUrl} onClick={() => setInterfazInteractivaAbierta(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-black shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50">Explorar interfaz interactiva <ChevronRight className="size-4"/></button>
                  {!imagenInterfazUrl && <p className="mt-2 text-xs text-[#6E6E73]">{imagenInterfazError || "Buscando la imagen en la Biblioteca del curso…"}</p>}
                </section>}
                {lecturaAbierta?.numero === 1 && paginaLectura === 2 && interfazInteractivaAbierta && <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-black/75 p-1 sm:p-2" role="dialog" aria-modal="true" aria-label="Exploración interactiva de MatrixGold 3.1">
                  <div className="flex h-[calc(100dvh-0.5rem)] w-[99vw] max-w-[1700px] min-h-0 flex-col overflow-hidden rounded-xl border border-[#D2D2D7] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.12)]">
                    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#D2D2D7] bg-white px-3 py-2 sm:px-5">
                      <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9A7B43]">FADILAB · Recorrido de aprendizaje</p><h3 className="text-base font-semibold sm:text-lg">Explora la interfaz de MatrixGold 3.1</h3></div>
                      <button type="button" onClick={() => setInterfazInteractivaAbierta(false)} className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold hover:border-gold">Cerrar ×</button>
                    </header>
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-1.5 sm:p-2">
                      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
                      
                      {imagenInterfazUrl && <figure className="flex max-h-full w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#171719] p-1">
                        <div ref={interfazImagenRef} className="relative flex max-h-full max-w-full items-center justify-center">
                          <img src={imagenInterfazUrl} alt="Captura de la interfaz de MatrixGold 3.1 con marcadores interactivos" className="block h-auto max-h-[calc(100dvh-5.5rem)] w-auto max-w-full rounded-lg object-contain" loading="lazy" />
                          {COMPONENTES_INTERFAZ.map((item, indice) => <button key={indice} type="button" onClick={() => { setComponenteActivo(indice); setComponentesExplorados(prev => prev.includes(indice) ? prev : [...prev, indice]); }} aria-label={`Explorar componente ${indice+1}: ${item[0]}`} aria-pressed={componenteActivo===indice} data-interface-marker={indice} className={`absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-bold shadow-lg transition sm:size-9 sm:text-sm ${componenteActivo===indice ? "z-40 scale-125 bg-[#c4a15a] text-black ring-4 ring-[#c4a15a]/40" : componentesExplorados.includes(indice) ? "z-20 bg-emerald-600 text-white" : "z-20 bg-blue-600 text-white hover:scale-110 hover:bg-[#c4a15a] hover:text-black"}`} style={{left:COORDENADAS_INTERFAZ[indice]?.x,top:COORDENADAS_INTERFAZ[indice]?.y}}>{indice+1}</button>)}
                          {componenteActivo !== null && <aside ref={interfazInfoRef} aria-live="polite" className="absolute z-30 w-[min(280px,42%)] max-h-[calc(100%-16px)] overflow-y-auto rounded-xl border border-[#c4a15a] bg-[#fffdf8]/95 p-2 text-[#242424] shadow-xl backdrop-blur-sm sm:p-2.5" style={{left:posicionInfoInterfaz ? `${posicionInfoInterfaz.left}px` : "8px",top:posicionInfoInterfaz ? `${posicionInfoInterfaz.top}px` : "8px",visibility:posicionInfoInterfaz ? "visible" : "hidden"}}>
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-[#98722e] sm:text-[10px]">Componente {componenteActivo+1} de {COMPONENTES_INTERFAZ.length}</p>
                            <h4 className="mt-1 text-xs font-bold leading-4 sm:text-sm sm:leading-5">{COMPONENTES_INTERFAZ[componenteActivo]?.[0]}</h4>
                            <div className="mt-2 rounded-lg bg-black/5 p-2">
                              <p className="text-[9px] font-semibold uppercase tracking-wide text-[#777] sm:text-[10px]">Dónde lo encuentras</p>
                              <p className="mt-1 text-[10px] leading-4 sm:text-xs sm:leading-5">{COMPONENTES_INTERFAZ[componenteActivo]?.[2]}</p>
                            </div>
                            <div className="mt-2 rounded-lg bg-black/5 p-2">
                              <p className="text-[9px] font-semibold uppercase tracking-wide text-[#777] sm:text-[10px]">Para qué sirve</p>
                              <p className="mt-1 text-[10px] leading-4 sm:text-xs sm:leading-5">{COMPONENTES_INTERFAZ[componenteActivo]?.[3]}</p>
                            </div>
                          </aside>}
                        </div>
                        
                      </figure>}
                      </div>
                      
                    </div>
                  </div>
                </div>}
                {lecturaAbierta?.numero === 6 && paginaLectura === 1 && <div className="mt-7"><LaboratorioSolidos onlyLab="extrusion" /></div>}
                {lecturaAbierta?.numero === 6 && paginaLectura === 2 && <div className="mt-7"><LaboratorioSolidos onlyLab="revolution" /></div>}
                {lecturaAbierta?.numero === 6 && paginaLectura === 3 && <div className="mt-7"><LaboratorioSolidos onlyLab="ring" /></div>}
                {lecturaAbierta?.numero === 6 && paginaLectura === 4 && <div className="mt-7"><LaboratorioSolidos onlyLab="inspector" /></div>}
                {lecturaAbierta?.numero === 7 && paginaLectura === 5 && <LaboratorioSuperficies />}
                {lecturaAbierta?.numero === 8 && paginaLectura === 5 && <LaboratorioValidacionModelo />}
                {paginaLectura === seccionesLecturaActivas.length-1 && <div className="rounded-xl border border-[#dce4ec] bg-white p-4"><p className="text-sm font-semibold">Has llegado al final de la lectura</p><p className="mt-1 text-sm text-[#6E6E73]">{lecturaModoVistaPrevia ? "En la experiencia del alumno, aquí podrá finalizar y marcar la sesión como completada." : "La lectura está registrada como leída. Puedes marcar la sesión como completada."}</p></div>}
                </section>
              </main>
              {paginaLectura === seccionesLecturaActivas.length-1 && <footer className="shrink-0 flex justify-end border-t border-[#e2e8f0] bg-white px-4 py-3 sm:px-6 sm:py-4">
                {lecturaModoVistaPrevia ? <button type="button" onClick={() => { setLecturasSimuladas(prev => new Set(prev).add(lecturaAbierta.id)); setLecturaAbierta(null); setLecturaModoVistaPrevia(false); }} className="inline-flex items-center gap-2 rounded-lg bg-[#b99552] px-4 py-2.5 text-sm font-semibold text-white"><CheckCircle2 className="size-4"/> Simular lectura completada</button> : sesionesCompletadas.has(lecturaAbierta.id) ? <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="size-5"/> Sesión completada</span> : <button type="button" disabled={ocupado} onClick={() => void marcarLecturaCompletada(lecturaAbierta)} className="inline-flex items-center gap-2 rounded-lg bg-[#b99552] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><CheckCircle2 className="size-4"/> Marcar como completada</button>}
              </footer>}
            </div>
          </div>}
          {examenActivoAlumno ? <Panel titulo={examenActivoAlumno.titulo}><div className="space-y-4 p-5">
            {examenActivoAlumno.duracion_minutos && <div className="flex items-center justify-between rounded-lg border border-[#b79558]/40 bg-gold/5 px-3 py-2"><span className="text-xs font-medium text-slate-400">Tiempo restante</span><span className={`text-sm font-bold tabular-nums ${segundosRestantesExamen !== null && segundosRestantesExamen <= 60 ? "text-red-600" : "text-foreground"}`}>{segundosRestantesExamen === null ? "—" : `${Math.floor(segundosRestantesExamen/60).toString().padStart(2,"0")}:${(segundosRestantesExamen%60).toString().padStart(2,"0")}`}</span></div>}
            {segundosRestantesExamen === 0 && <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800">El tiempo terminó. Estamos enviando tus respuestas registradas.</p>}
            {examenActivoAlumno.instrucciones && <p className="text-sm text-slate-400">{examenActivoAlumno.instrucciones}</p>}
            {(() => { const pregunta = examenActivoAlumno.preguntas[preguntaActualAlumno]; const total = examenActivoAlumno.preguntas.length; const respondida = Boolean(pregunta && String(respuestasAlumno[pregunta.id] ?? "").trim()); return pregunta ? <>
              <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-amber-300">Pregunta {preguntaActualAlumno+1} de {total}</p><p className="text-xs text-slate-400">{pregunta.puntaje} puntos</p></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gold transition-all" style={{width:`${((preguntaActualAlumno+1)/total)*100}%`}}/></div>
              <article className="min-h-[220px] rounded-xl border border-white/10 p-5"><p className="text-base font-semibold">{pregunta.enunciado}</p>
                {pregunta.tipo === "practica" ? <textarea value={respuestasAlumno[pregunta.id] ?? ""} onChange={e=>setRespuestasAlumno(v=>({...v,[pregunta.id]:e.target.value}))} rows={5} className="mt-4 w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm" placeholder="Escribe tu respuesta…" /> : <div className="mt-4 space-y-3">{pregunta.opciones.map(o=><label key={o.value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 p-3 text-sm hover:bg-white/5/40"><input type="radio" name={pregunta.id} value={o.value} checked={respuestasAlumno[pregunta.id]===o.value} onChange={e=>setRespuestasAlumno(v=>({...v,[pregunta.id]:e.target.value}))}/>{o.label}</label>)}</div>}
              </article>
              <div className="flex flex-wrap items-center justify-between gap-2">
                {preguntaActualAlumno > 0 && examenActivoAlumno.permitir_retroceso && <button type="button" onClick={()=>setPreguntaActualAlumno(v=>Math.max(0,v-1))} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium">Anterior</button>}{preguntaActualAlumno < total-1 ? <button type="button" disabled={!respondida} onClick={()=>setPreguntaActualAlumno(v=>Math.min(total-1,v+1))} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">Siguiente</button> : <button type="button" disabled={(!respondida && segundosRestantesExamen !== 0) || enviandoExamen} onClick={()=>void enviarExamenAlumno()} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"><Send className="mr-1 inline size-4"/> Enviar evaluación</button>}
              </div>
              {!respondida && <p className="text-xs text-slate-400">Debes responder esta pregunta para continuar.</p>}
            </> : <p className="text-sm text-slate-400">Este examen no contiene preguntas.</p>; })()}
            <button type="button" disabled={guardandoSalidaExamen || enviandoExamen} onClick={async()=>{
              if (!examenActivoAlumno?.intento_id || guardandoSalidaExamen || enviandoExamen) return;
              if (!window.confirm("¿Salir de la evaluación? Guardaremos tus respuestas y podrás continuar después con el tiempo que aún te quede.")) return;
              setGuardandoSalidaExamen(true);
              try {
                if (autosaveExamenTimeoutRef.current !== null) {
                  window.clearTimeout(autosaveExamenTimeoutRef.current);
                  autosaveExamenTimeoutRef.current = null;
                }
                const guardadoPendiente = guardadoExamenPendienteRef.current;
                if (guardadoPendiente) await guardadoPendiente;
                const respuestas = examenActivoAlumno.preguntas
                  .filter(p => Object.prototype.hasOwnProperty.call(respuestasAlumno, p.id))
                  .map(p => ({ pregunta_id: p.id, respuesta: p.tipo === "verdadero_falso" ? respuestasAlumno[p.id] === "true" : (respuestasAlumno[p.id] ?? "") }));
                const { error } = await (supabase as any).rpc("guardar_respuestas_intento_formacion", {
                  _intento_id: examenActivoAlumno.intento_id,
                  _respuestas: respuestas,
                  _pregunta_actual: preguntaActualAlumno
                });
                if (error) throw error;
                setExamenActivoAlumno(null);
                setMensaje("Intento guardado. Puedes volver a abrir la evaluación para continuar con el tiempo restante.");
              } catch (err) {
                setMensaje(err instanceof Error ? err.message : "No se pudo guardar el intento. La evaluación permanece abierta.");
              } finally {
                setGuardandoSalidaExamen(false);
              }
            }} className="text-xs text-slate-400 underline disabled:opacity-50">{guardandoSalidaExamen ? "Guardando avance…" : "Salir del examen"}</button>
          </div></Panel> : null}
          {vistaPreviaAlumno && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce5ee] bg-white px-4 py-3 shadow-sm">
            <div><p className="text-sm font-semibold text-[#294760]">Vista previa del alumno</p><p className="mt-0.5 text-xs text-[#718096]">Esta es la misma interfaz que verán los alumnos matriculados. La simulación no guarda actividad académica.</p></div>
            <button type="button" onClick={() => setVistaPreviaAlumno(false)} className="rounded-lg border border-[#cbd9e5] bg-white px-3 py-2 text-sm font-semibold text-[#294760] transition hover:bg-[#f3f7fa]">Salir de vista previa</button>
          </div>}
          {!vistaPreviaAlumno && alumnoQuery.isLoading ? <Panel titulo="Cargando tus cursos"><p className="p-5 text-sm text-[#718096]">Vinculando tu inscripción y recuperando tus cursos…</p></Panel> : !vistaPreviaAlumno && alumnoQuery.error ? <Panel titulo="No se pudo cargar el aula"><p className="p-5 text-sm text-red-700">{alumnoQuery.error.message}</p></Panel> : inscripcionesVistaAula.length === 0 ? <Panel titulo="Aún no tienes cursos asignados"><p className="p-5 text-sm text-[#718096]">Cuando FADILAB te inscriba con el correo de tu cuenta, el curso aparecerá aquí automáticamente.</p></Panel> : inscripcionesVistaAula.map(i => <article key={i.id} className="overflow-hidden rounded-3xl border border-[#dce5ee] bg-white shadow-[0_8px_28px_rgba(27,43,59,0.045)]">
            <header className="relative overflow-hidden border-b border-[#e8edf2] bg-gradient-to-br from-[#fbf8f0] via-white to-[#f5f8fb] p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-14 -top-20 size-64 rounded-full border border-[#d8c39b]/20"/>
              <div className="relative max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#d8c39b]/50 bg-[#edf3f8] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8b6b35]"><BookOpen className="size-3.5"/> Aula de formación · FADILAB</div>
                <h1 className="mt-4 font-display text-2xl leading-tight text-[#1d2b3a] sm:text-3xl">{i.formacion_cursos?.titulo ?? "Curso de formación"}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#647386]">{i.formacion_cursos?.descripcion || "Materiales y actividades de tu formación."}</p>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-xl border border-[#dce5ee] bg-white/90 px-3 py-2 text-xs font-medium text-[#294760]"><CalendarDays className="size-4 text-[#a77b35]"/>{i.formacion_cursos?.duracion_horas ?? "—"} horas académicas</span>
                  <span className="inline-flex items-center gap-2 rounded-xl border border-[#dce5ee] bg-white/90 px-3 py-2 text-xs font-medium text-[#294760]"><ShieldCheck className="size-4 text-[#a77b35]"/> Inscripción {vistaPreviaAlumno ? "activa" : i.estado}</span>
                  <span className="inline-flex items-center gap-2 rounded-xl border border-[#dce5ee] bg-white/90 px-3 py-2 text-xs font-medium text-[#294760]"><Users className="size-4 text-[#a77b35]"/> Formación FADILAB</span>
                </div>
              </div>
            </header>
            <div className="grid gap-3 border-b border-[#e8edf2] p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
              <button type="button" onClick={() => setPanelCursoActivo({ inscripcionId: i.id, panel: "sesiones" })} className="group rounded-2xl border border-[#c4a46a] bg-[#fffaf0] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <span className="flex items-center gap-2 text-xs font-medium text-[#647386]"><BookOpen className="size-4 text-[#a77b35]"/> Sesiones publicadas <ArrowRight className="ml-auto size-4"/></span>
                <span className="mt-2 block text-2xl font-semibold tabular-nums text-[#1d2b3a]">{sesionesVistaAula.filter(item => item.curso_id === i.curso_id).length}</span>
                <span className="mt-1 block text-xs text-[#718096]">Contenido de aprendizaje</span>
              </button>
              <button type="button" onClick={() => setPanelCursoActivo({ inscripcionId: i.id, panel: "biblioteca" })} className="group rounded-2xl border border-[#dce5ee] bg-gradient-to-br from-white to-[#f8fafc] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#c4a46a] hover:shadow-md">
                <span className="flex items-center gap-2 text-xs font-medium text-[#647386]"><FileText className="size-4 text-[#a77b35]"/> Biblioteca del curso <ArrowRight className="ml-auto size-4"/></span>
                <span className="mt-2 block text-2xl font-semibold tabular-nums text-[#1d2b3a]">{materialesVistaAula.filter(m => m.curso_id === i.curso_id).length}</span>
                <span className="mt-1 block text-xs text-[#718096]">Materiales de estudio</span>
              </button>
              <button type="button" onClick={() => setPanelCursoActivo({ inscripcionId: i.id, panel: "evaluaciones" })} className="group rounded-2xl border border-[#dce5ee] bg-gradient-to-br from-white to-[#f8fafc] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#c4a46a] hover:shadow-md">
                <span className="flex items-center gap-2 text-xs font-medium text-[#647386]"><CheckCircle2 className="size-4 text-[#a77b35]"/> Refuerza lo aprendido <ArrowRight className="ml-auto size-4"/></span>
                <span className="mt-2 block text-2xl font-semibold tabular-nums text-[#1d2b3a]">{examenesVistaAula.filter(x => x.curso_id === i.curso_id && x.publicado && (!x.disponible_desde || new Date(x.disponible_desde) <= new Date()) && (!x.disponible_hasta || new Date(x.disponible_hasta) > new Date())).length}</span>
                <span className="mt-1 block text-xs text-[#718096]">Evaluaciones disponibles</span>
              </button>
              <a href="/aula-comandos" className="group rounded-2xl border border-[#d8c39b]/70 bg-gradient-to-br from-white to-[#faf6ed] p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#c4a46a] hover:shadow-md">
                <span className="flex items-center gap-2 text-xs font-medium text-[#647386]"><Command className="size-4 text-[#a77b35]"/> Comandos Rhino <ArrowRight className="ml-auto size-4"/></span>
                <span className="mt-2 block text-2xl font-semibold text-[#1d2b3a]">Consultar</span>
                <span className="mt-1 block text-xs text-[#718096]">Biblioteca didáctica y ejemplos</span>
              </a>
            </div>
            {panelCursoActivo?.inscripcionId === i.id && <section id={`panel-curso-${i.id}`} className="border-t border-[#e8edf2] bg-[#fbfcfd] p-5 sm:p-7">
              <div className="space-y-6">
                {panelCursoActivo?.panel === "sesiones" && <><div id={`sesiones-curso-${i.id}`} className="scroll-mt-24"><h3 className="text-lg font-semibold text-[#1d2b3a]">Sesiones de aprendizaje</h3><p className="mt-1 text-sm text-[#718096]">Avanza paso a paso por los contenidos preparados por FADILAB.</p></div>
              {sesionesVistaAula.filter(item => item.curso_id === i.curso_id).length === 0 ? <p className="text-xs text-[#718096]">Todavía no hay sesiones publicadas.</p> : sesionesVistaAula.filter(item => item.curso_id === i.curso_id).map(item => {
                const recursos = materialesVistaAula.filter(m => m.curso_id === i.curso_id && m.sesion_id === item.id);
                return <details key={item.id} className={`group/session mt-3 overflow-hidden rounded-2xl border shadow-sm transition-colors ${item.bloqueada ? "border-[#dce2e8] bg-[#f1f3f5] open:border-[#dce2e8] open:bg-white" : "border-emerald-200 bg-[#f1faf5] open:border-emerald-300 open:bg-white"}`}><summary className={`flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 transition-colors [&::-webkit-details-marker]:hidden ${item.bloqueada ? "hover:bg-[#e9edf1]" : "hover:bg-emerald-50"}`}><span className="flex min-w-0 items-center gap-3"><span className={`flex size-9 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold ${item.bloqueada ? "border-[#d6dce2] bg-[#e5e9ed] text-[#66717d]" : "border-emerald-200 bg-emerald-100 text-emerald-800"}`}>{String(item.numero).padStart(2,"0")}</span><span className="min-w-0"><span className={`block text-[10px] font-bold uppercase tracking-[0.14em] ${item.bloqueada ? "text-[#7b8793]" : "text-emerald-700"}`}>Sesión {item.numero} · {item.duracion_horas} horas</span><span className={`mt-0.5 block truncate text-sm font-semibold ${item.bloqueada ? "text-[#596572]" : "text-[#1d2b3a]"}`}>{item.titulo}</span></span></span><span className="flex shrink-0 items-center gap-2">{item.bloqueada ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#687482]"><span aria-hidden="true" className="text-amber-600">🔒</span> Bloqueada</span> : <><span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-800"><CheckCircle2 className="size-3"/> Activa</span><span className="text-[10px] text-[#718096]">{recursos.length} materiales</span></>}<ChevronDown className="size-4 text-[#718096] transition-transform group-open/session:rotate-180"/></span></summary><div className="border-t border-[#e7edf2] bg-white px-4 py-4">{item.descripcion && <p className="whitespace-pre-wrap text-sm leading-6 text-[#718096]">{item.descripcion}</p>}{item.bloqueada ? <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900"><span className="text-base" aria-hidden="true">🔒</span><span>Esta sesión y sus materiales están bloqueados. El profesor habilitará el acceso cuando corresponda.</span></div> : <><div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" onClick={() => void abrirLecturaParaAlumno(item, vistaPreviaAlumno)} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-[#c9aa70] to-[#b79558] px-4 py-2.5 text-xs font-semibold text-[#211b11] shadow-sm"><BookOpenCheck className="size-4"/> {sesionesCompletadasVistaAula.has(item.id) ? "Repasar sesión" : "Comenzar sesión"}</button>{sesionesCompletadasVistaAula.has(item.id) && <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="size-4"/> Completada</span>}</div></>}</div></details>;
              })}</>}
                {panelCursoActivo?.panel === "evaluaciones" && <><h3 id={`evaluaciones-curso-${i.id}`} className="scroll-mt-24 text-lg font-semibold text-[#1d2b3a]">Evaluaciones</h3>
              {examenesVistaAula.filter(x => x.curso_id === i.curso_id).length === 0 ? <p className="border-t border-[#e7edf2] py-3 text-xs text-[#718096]">Aún no hay evaluaciones asignadas a este curso.</p> : examenesVistaAula.filter(x => x.curso_id === i.curso_id).map(x => {
                const intentos = intentosVistaAula.filter(t => t.examen_id === x.id);
                const intentoEnCurso = intentos.find(t => t.estado === "en_curso");
                const intentosCompletados = intentos.filter(t => t.estado !== "en_curso");
                const disponible = x.publicado && (!x.disponible_desde || new Date(x.disponible_desde) <= new Date()) && (!x.disponible_hasta || new Date(x.disponible_hasta) > new Date());
                const puedeIniciarONreanudar = disponible && (intentosCompletados.length < x.intentos_permitidos || Boolean(intentoEnCurso));
                const estado = intentoEnCurso ? "Evaluación en curso" : intentos[0]?.calificacion == null ? (intentos[0]?.estado ?? "Sin intentos") : "Nota " + intentos[0].calificacion + "/20";
                return <div key={x.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7edf2] py-3"><div className="min-w-0"><p className="text-sm font-medium">{x.titulo}</p><p className="mt-1 text-xs text-[#718096]">{intentos.length}/{x.intentos_permitidos} intentos · {estado}</p>{x.publicado && (x.disponible_desde || x.disponible_hasta) && <div className="mt-2 space-y-1 text-xs text-[#718096]">{x.disponible_desde && <p><span className="font-medium text-foreground">Disponible desde:</span> {new Date(x.disponible_desde).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short", timeZone: "America/Lima" })}</p>}{x.disponible_hasta && <p><span className="font-medium text-foreground">Cierre:</span> {new Date(x.disponible_hasta).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short", timeZone: "America/Lima" })}</p>}<p className={x.disponible_desde && new Date(x.disponible_desde).getTime() > Date.now() ? "font-semibold text-amber-700" : x.disponible_hasta && new Date(x.disponible_hasta).getTime() <= Date.now() ? "font-semibold text-[#718096]" : "font-semibold text-emerald-700"}>{x.disponible_desde && new Date(x.disponible_desde).getTime() > Date.now() ? "Programado por el profesor" : x.disponible_hasta && new Date(x.disponible_hasta).getTime() <= Date.now() ? "Plazo finalizado" : "Disponible ahora"}</p></div>}<span className={x.publicado ? "mt-1 inline-block rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700" : "mt-1 inline-block rounded-full bg-white/5 px-2 py-1 text-[10px] font-semibold text-[#718096]"}>{x.publicado ? (disponible ? "Activo · disponible" : x.disponible_desde && new Date(x.disponible_desde).getTime() > Date.now() ? "Programado por el profesor" : x.disponible_hasta && new Date(x.disponible_hasta).getTime() <= Date.now() ? "Plazo finalizado" : "Publicado · fuera de horario") : "Desactivado · esperando al profesor"}</span></div><button type="button" disabled={!puedeIniciarONreanudar || Boolean(examenActivoAlumno)} onClick={() => { if (vistaPreviaAlumno) { setExamenSeleccionado(x.id); setExamenVistaPreviaId(x.id); setPreguntaVistaPrevia(0); setRespuestasVistaPrevia({}); setSimulacionFinalizada(false); } else { setErrorInicioExamen(""); setExamenPendienteInicio({ examen: x, reanudar: Boolean(intentoEnCurso) }); } }} className="rounded-lg border border-[#cbd9e5] bg-white px-3 py-2 text-xs font-semibold text-[#294760] transition hover:bg-[#f3f7fa] disabled:cursor-not-allowed disabled:opacity-40">{!disponible ? "Aún no disponible" : intentoEnCurso ? "Continuar evaluación en curso" : "Rendir evaluación"}</button></div>;
              })}</>}
                {panelCursoActivo?.panel === "biblioteca" && <><section id={`biblioteca-curso-${i.id}`} className="scroll-mt-24 space-y-5">
                 <p className="text-sm text-[#718096]">Consulta los materiales organizados por sesión. Los materiales de sesiones bloqueadas tampoco se pueden descargar.</p>
                 {sesionesVistaAula.filter(s => s.curso_id === i.curso_id && materialesVistaAula.some(m => m.curso_id === i.curso_id && m.sesion_id === s.id)).sort((a, b) => Number(a.numero) - Number(b.numero)).map(s => {
                   const recursosSesion = materialesVistaAula.filter(m => m.curso_id === i.curso_id && m.sesion_id === s.id);
                   return <details key={s.id} className={`group overflow-hidden rounded-xl border ${s.bloqueada ? "border-[#dce2e8] bg-[#f1f3f5]" : "border-[#dce5ee] bg-white"}`}>
                     <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
                       <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#98743c]">Sesión {s.numero} · {s.duracion_horas} horas</p><h4 className="mt-0.5 text-sm font-semibold text-[#1d2b3a]">{s.titulo}</h4></div>
                       <div className="flex shrink-0 items-center gap-2.5">
                         {s.bloqueada ? <span className="inline-flex items-center gap-1 rounded-full border border-[#d6dce2] bg-[#e5e9ed] px-2.5 py-1 text-[10px] font-semibold text-[#66717d]"><span className="text-amber-600" aria-hidden="true">🔒</span> Bloqueada</span> : <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700"><CheckCircle2 className="size-3"/> Disponible</span>}
                         <span aria-hidden="true" className="text-lg leading-none text-[#718096] transition-transform group-open:rotate-180">⌄</span>
                       </div>
                     </summary>
                     <div className="border-t border-[#e7edf2] divide-y divide-[#e7edf2] px-3">
                       {recursosSesion.map(m => <div key={m.id} className={`flex flex-wrap items-center justify-between gap-3 py-3 ${s.bloqueada ? "opacity-60" : ""}`}>
                         <div className="flex min-w-0 items-center gap-2"><FileText className={`size-4 shrink-0 ${s.bloqueada ? "text-[#8b949e]" : "text-amber-500"}`}/><span className="min-w-0"><span className="block truncate text-sm font-medium text-[#1d2b3a]">{m.titulo}</span><span className="text-xs text-[#718096]">{m.nombre_archivo} · {(m.tamano_bytes/1024/1024).toFixed(1)} MB</span></span></div>
                         {s.bloqueada ? <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#d6dce2] bg-[#e5e9ed] px-3 py-2 text-xs font-semibold text-[#66717d]"><span className="text-amber-600" aria-hidden="true">🔒</span> Bloqueado</span> : <button type="button" onClick={() => void descargarMaterial(m)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#cbd9e5] bg-white px-3 py-2 text-xs font-semibold text-[#294760] hover:bg-[#f3f7fa]"><Download className="size-3.5"/> Descargar</button>}
                       </div>)}
                     </div>
                   </details>;
                 })}
                 {materialesVistaAula.filter(m => m.curso_id === i.curso_id && !m.sesion_id).length > 0 && <section className="overflow-hidden rounded-xl border border-[#dce5ee] bg-white">
                   <header className="border-b border-[#e7edf2] px-4 py-3"><h4 className="text-sm font-semibold text-[#1d2b3a]">Material general del curso</h4><p className="mt-0.5 text-xs text-[#718096]">Recursos que no pertenecen a una sesión específica.</p></header>
                   <div className="divide-y divide-[#e7edf2] px-3">
                     {materialesVistaAula.filter(m => m.curso_id === i.curso_id && !m.sesion_id).map(m => <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0 text-amber-500"/><span className="min-w-0"><span className="block truncate text-sm font-medium text-[#1d2b3a]">{m.titulo}</span><span className="text-xs text-[#718096]">{m.nombre_archivo} · {(m.tamano_bytes/1024/1024).toFixed(1)} MB</span></span></div><button type="button" onClick={() => void descargarMaterial(m)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#cbd9e5] bg-white px-3 py-2 text-xs font-semibold text-[#294760] hover:bg-[#f3f7fa]"><Download className="size-3.5"/> Descargar</button></div>)}
                   </div>
                 </section>}
                 {materialesVistaAula.filter(m => m.curso_id === i.curso_id).length === 0 && <p className="rounded-xl border border-dashed border-[#dce5ee] p-5 text-sm text-[#718096]">Todavía no hay materiales publicados.</p>}
               </section></>}
              </div>
            </section>}
          </article>)}
        </>
      )}
      {examenPendienteInicio && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="confirmar-examen-titulo">
        <section className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-background shadow-2xl">
          <header className="border-b border-white/10 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">Aula de formación · Evaluación</p>
            <h2 id="confirmar-examen-titulo" className="mt-1 text-lg font-semibold">{examenPendienteInicio.reanudar ? "Continuar evaluación" : "Antes de comenzar"}</h2>
            <p className="mt-1 text-sm text-slate-400">{examenPendienteInicio.examen.titulo}</p>
          </header>
          <div className="space-y-4 p-5">
            {errorInicioExamen ? <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"><p className="font-semibold">No se pudo abrir la evaluación</p><p className="mt-1 break-words">{errorInicioExamen}</p><p className="mt-2 text-xs">Puedes volver a intentarlo o avisar al docente con este mensaje.</p></div> : null}
            <div className="rounded-xl border border-[#e6dcc9] bg-white p-4">
              <p className="text-sm font-semibold">Tiempo asignado por el profesor</p>
              <p className="mt-1 text-sm text-slate-400">{examenPendienteInicio.examen.duracion_minutos ? `${examenPendienteInicio.examen.duracion_minutos} minutos` : "Sin límite de tiempo configurado"}.</p>
            </div>
            <div className="rounded-xl border border-white/10 p-4">
              <p className="text-sm font-semibold">Navegación entre preguntas</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">{examenPendienteInicio.examen.permitir_retroceso ? "El profesor permite regresar a preguntas anteriores y modificar tus respuestas mientras la evaluación siga activa." : "Al avanzar a la siguiente pregunta no podrás regresar a la anterior ni modificar tu respuesta. Revisa bien antes de continuar."}</p>
            </div>
            <p className="text-xs leading-5 text-slate-400">{examenPendienteInicio.reanudar ? "Continuar recuperará tu intento y el tiempo restante; no iniciará un intento nuevo." : "Al confirmar comenzará el tiempo y se registrará tu intento. Asegúrate de estar listo antes de continuar."}</p>
          </div>
          <footer className="flex flex-wrap justify-end gap-2 border-t border-white/10 p-4">
            <button type="button" disabled={confirmandoInicioExamen} onClick={() => setExamenPendienteInicio(null)} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm">Ahora no</button>
            <button type="button" disabled={confirmandoInicioExamen} onClick={async () => {
              setConfirmandoInicioExamen(true);
              try {
                const iniciado = await abrirExamenAlumno(examenPendienteInicio.examen.id);
                if (iniciado) { setErrorInicioExamen(""); setExamenPendienteInicio(null); }
              } finally {
                setConfirmandoInicioExamen(false);
              }
            }} className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50">{confirmandoInicioExamen ? "Preparando evaluación…" : examenPendienteInicio.reanudar ? "Continuar evaluación" : "Comenzar evaluación"}</button>
          </footer>
        </section>
      </div>}
      {vistaPreviaAlumno && examenVistaPreviaId && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Simulación de evaluación para alumno">
        <section className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-background shadow-2xl">
          <header className="flex items-start justify-between gap-3 border-b border-white/10 p-5"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">FADILAB · Simulación del alumno</p><h2 className="mt-1 text-lg font-semibold">{(examenesQuery.data ?? []).find(x=>x.id===examenVistaPreviaId)?.titulo ?? "Evaluación"}</h2><p className="mt-1 text-xs text-slate-400">Modo de prueba · Las respuestas no se guardan ni consumen intentos.</p></div><button type="button" onClick={()=>{setExamenVistaPreviaId("");setRespuestasVistaPrevia({});setPreguntaVistaPrevia(0);setSimulacionFinalizada(false);}} className="rounded-lg border border-white/10 px-3 py-2 text-xs">Cerrar</button></header>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {examenActivoId!==examenVistaPreviaId||preguntasQuery.isLoading ? <p className="py-8 text-center text-sm text-slate-400">Cargando preguntas…</p> : (preguntasQuery.data??[]).length===0 ? <p className="py-8 text-center text-sm text-slate-400">Este examen todavía no tiene preguntas.</p> : (()=>{const preguntas=preguntasQuery.data??[];const pregunta=preguntas[preguntaVistaPrevia];const contestada=Boolean(pregunta&&String(respuestasVistaPrevia[pregunta?.id]??"").trim());const preguntasObjetivas=preguntas.filter(p=>p.tipo!=="practica");const puntosMaximos=preguntas.reduce((s,p)=>s+Number(p.puntaje||0),0);const puntosObtenidos=preguntasObjetivas.reduce((s,p)=>s+(String(p.respuesta_correcta??"")===String(respuestasVistaPrevia[p.id]??"")?Number(p.puntaje||0):0),0);const aciertos=preguntasObjetivas.filter(p=>String(p.respuesta_correcta??"")===String(respuestasVistaPrevia[p.id]??"")).length;const tienePracticas=preguntas.some(p=>p.tipo==="practica");const nota=puntosMaximos>0?(puntosObtenidos/puntosMaximos)*20:0;return simulacionFinalizada ? <div className="space-y-5"><div className="rounded-xl border border-[#b79558]/40 bg-gold/5 p-6 text-center"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">{tienePracticas?"Resultado objetivo provisional":"Resultado de la evaluación"}</p><p className="mt-3 text-5xl font-bold tabular-nums text-foreground">{nota.toFixed(2)}<span className="text-xl font-medium text-slate-400">/20</span></p><p className="mt-2 text-sm text-slate-400">{aciertos} de {preguntasObjetivas.length} preguntas objetivas correctas</p>{tienePracticas&&<p className="mt-3 text-xs leading-5 text-slate-400">La nota definitiva queda pendiente de la revisión docente de las preguntas prácticas.</p>}</div><div className="space-y-3"><h3 className="text-sm font-semibold">Revisión de tus respuestas</h3>{preguntas.map((p,idx)=>{const elegida=String(respuestasVistaPrevia[p.id]??"");const correcta=String(p.respuesta_correcta??"");const esPractica=p.tipo==="practica";const acerto=!esPractica&&elegida===correcta;const opcionElegida=p.opciones.find(o=>o.value===elegida);const opcionCorrecta=p.opciones.find(o=>o.value===correcta);return <article key={p.id} className={`rounded-xl border p-4 ${esPractica?"border-white/10":acerto?"border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/10":"border-red-300 bg-red-50/50 dark:bg-red-950/10"}`}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-slate-400">Pregunta {idx+1} · {p.puntaje} puntos</p><span className={`text-xs font-semibold ${esPractica?"text-slate-400":acerto?"text-emerald-700 dark:text-emerald-400":"text-red-700 dark:text-red-400"}`}>{esPractica?"Pendiente de revisión":acerto?"Correcta":"Incorrecta"}</span></div><p className="mt-2 text-sm font-semibold">{p.enunciado}</p><p className="mt-3 text-sm"><span className="font-medium">Tu respuesta: </span>{esPractica?(elegida||"Sin responder"):(opcionElegida?.label??"Sin responder")}</p>{!esPractica&&<p className="mt-1 text-sm"><span className="font-medium">Respuesta correcta: </span><span className="font-semibold text-emerald-700 dark:text-emerald-400">{(opcionCorrecta?.label ?? correcta) || "No definida"}</span></p>}{esPractica&&<p className="mt-1 text-xs text-slate-400">Esta respuesta requiere valoración del profesor.</p>}</article>})}</div><p className="text-center text-xs text-slate-400">Esta simulación es solo de prueba: la nota no se guarda ni consume intentos.</p><div className="flex justify-center"><button type="button" onClick={()=>{setExamenVistaPreviaId("");setRespuestasVistaPrevia({});setPreguntaVistaPrevia(0);setSimulacionFinalizada(false);}} className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-black">Cerrar resultado</button></div></div> : <div className="space-y-4"><div className="rounded-lg border border-[#b79558]/40 bg-gold/5 p-3 text-xs leading-5"><strong>Indicaciones del profesor:</strong> Dispones de {(examenesQuery.data??[]).find(x=>x.id===examenVistaPreviaId)?.duracion_minutos ?? "tiempo no limitado"} {(examenesQuery.data??[]).find(x=>x.id===examenVistaPreviaId)?.duracion_minutos ? "minutos" : ""} para completar la evaluación. Responde cada pregunta antes de avanzar. <strong>Al pasar a la siguiente pregunta no podrás regresar ni modificar tu respuesta anterior.</strong></div><div className="flex items-center justify-between"><p className="text-xs font-semibold text-amber-300">Pregunta {preguntaVistaPrevia+1} de {preguntas.length}</p><p className="text-xs text-slate-400">{pregunta?.puntaje} puntos</p></div><div className="h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gold" style={{width:`${((preguntaVistaPrevia+1)/preguntas.length)*100}%`}}/></div><article className="min-h-[220px] rounded-xl border border-white/10 p-5"><h3 className="text-base font-semibold">{pregunta?.enunciado}</h3>{pregunta?.tipo==="practica"?<textarea value={respuestasVistaPrevia[pregunta?.id]??""} onChange={e=>setRespuestasVistaPrevia(v=>({...v,[pregunta?.id]:e.target.value}))} rows={5} className="mt-4 w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm" placeholder="Escribe tu respuesta…"/>:<div className="mt-4 space-y-3">{pregunta?.opciones.map(o=><label key={o.value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 p-3 text-sm hover:bg-white/5/40"><input type="radio" name={"preview-"+pregunta?.id} value={o.value} checked={respuestasVistaPrevia[pregunta?.id]===o.value} onChange={e=>setRespuestasVistaPrevia(v=>({...v,[pregunta?.id]:e.target.value}))}/>{o.label}</label>)}</div>}</article><div className="flex items-center justify-between gap-2">{preguntaVistaPrevia<preguntas.length-1?<button type="button" disabled={!contestada} onClick={()=>setPreguntaVistaPrevia(v=>Math.min(preguntas.length-1,v+1))} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-40">Siguiente</button>:<button type="button" disabled={!contestada} onClick={()=>setSimulacionFinalizada(true)} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-40">Ver mi nota</button>}</div>{!contestada&&<p className="text-xs text-slate-400">Responde esta pregunta para continuar.</p>}</div>})()}
          </div>
        </section>
      </div>}
      {permisoDocente.isLoading && sesion?.esAdmin ? <p className="text-xs text-slate-400">Comprobando autorización docente de FADILAB…</p> : null}
      {permisoDocente.error ? <p className="rounded-xl border border-red-300 p-3 text-sm text-red-700">No se pudo validar el acceso docente: {permisoDocente.error.message}</p> : null}
      {mensaje && <p role="status" className="rounded-xl border border-white/10 bg-[#121922] p-3 text-sm">{mensaje}</p>}
    </div>
  </AppShell>;
}