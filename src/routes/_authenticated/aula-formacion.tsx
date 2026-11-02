import { useEffect, useMemo, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarDirectorioAlumnosFormacion } from "@/lib/aula-formacion.functions";
import { BookOpen, Users, Plus, Upload, FileText, Download, CalendarDays, ShieldCheck, Send, Pencil, Trash2, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, ArrowRight, BookOpenCheck, FolderOpen, ClipboardCheck, Layers, Eye, Lock, Unlock, RotateCcw } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
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
type Examen = { id: string; curso_id: string; sesion_id?: string | null; titulo: string; instrucciones: string | null; duracion_minutos: number | null; intentos_permitidos: number; puntaje_maximo: number; publicado: boolean; disponible_desde: string | null; disponible_hasta: string | null };
type Pregunta = { id: string; examen_id: string; tipo: "opcion_multiple" | "verdadero_falso" | "practica"; enunciado: string; opciones: Array<{label:string;value:string}>; respuesta_correcta?: unknown; puntaje: number; orden: number; obligatoria: boolean };
type ExamenAlumno = { id: string; titulo: string; instrucciones: string | null; duracion_minutos: number | null; puntaje_maximo: number; intento_id?: string; vence_en?: string | null; preguntas: Array<{id:string;tipo:string;enunciado:string;opciones:Array<{label:string;value:string}>;puntaje:number;orden:number;obligatoria:boolean}> };
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
    "Objetivo: reconocer la estructura de capas de una joya real y comprobar las funciones de asignación, visibilidad y bloqueo en MatrixGold. Utilizaremos el anillo de práctica proporcionado por el docente.",
    "1) Abre el archivo de práctica y guarda inmediatamente una copia con el nombre indicado por el docente. No realices pruebas sobre el archivo original.",
    "2) Localiza el panel Layers e identifica los grupos Metal, Gem, Object, User, Render y los grupos Extra que aparezcan en tu instalación. Observa los colores de las filas y localiza la capa activa en la barra inferior.",
    "3) Prueba la visibilidad: desactiva el ojo de una capa que contenga parte del cuerpo metálico. Observa qué elementos desaparecen. Vuelve a activar el ojo. Repite con una capa que contenga la piedra central y observa cómo el resto del engaste puede permanecer visible.",
    "4) Prueba el bloqueo: activa el candado de una capa. Comprueba que sus objetos siguen visibles, pero que no puedes seleccionarlos directamente en la ventana de modelado. Intenta seleccionar uno de esos objetos y observa la respuesta. Desbloquea la capa al terminar.",
    "5) Prueba la asignación únicamente con un objeto auxiliar o de práctica: selecciónalo en pantalla y haz clic en el triángulo de la fila de color de la capa de destino. Comprueba en el panel que el objeto queda asignado a esa capa. Evita reasignar piedras o componentes estructurales del anillo de ejemplo.",
    "6) Antes de finalizar, deja visibles las capas necesarias, desbloquea las que bloqueaste y comprueba que el modelo se muestra como al inicio. Guarda la copia solo si el docente lo solicita."
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
  { titulo: "4. Restricciones de distancia y ángulo", bloques: [
    "Las restricciones permiten controlar la entrada de puntos mientras dibujas. Puedes indicar una distancia concreta o fijar una dirección angular para evitar que la geometría dependa de la posición aproximada del cursor.",
    "Utiliza una restricción de distancia cuando necesites que un segmento tenga una longitud definida. Utiliza una restricción angular cuando necesites mantener una dirección determinada. La disponibilidad y el comportamiento de estas ayudas dependen del comando activo y de las opciones de entrada de Rhino.",
    "Durante la práctica, combina coordenadas con restricciones: introduce los valores necesarios y confirma el punto solo cuando la dirección y la longitud correspondan al diseño. No confundas una guía visual con una dimensión verificada."
  ]},
  { titulo: "5. Referencias a objetos (Osnap)", bloques: [
    "Osnap (Object Snap) permite ajustar el cursor a puntos geométricos exactos de objetos existentes. Evita seleccionar posiciones aproximadas cuando necesitas conectar, centrar o alinear geometría.",
    "Referencias principales: End (extremo), Mid (punto medio), Cen (centro), Int (intersección), Near (cercano), Perp (perpendicular), Tan (tangente), Quad (cuadrante) y Point (punto). Activa solo las referencias necesarias para evitar capturas no deseadas.",
    "Ejemplos: utiliza End para comenzar exactamente en el extremo de una curva; Mid para localizar su punto medio; Cen para capturar el centro de un círculo; Int para ubicar el cruce de dos curvas; y Perp para establecer una relación perpendicular.",
    "Observa el indicador de Osnap antes de confirmar cada punto. Si se activa una referencia equivocada, pausa y desactiva temporalmente las opciones que no necesitas."
  ]},
  { titulo: "6. SmartTrack y ayudas de alineación", bloques: [
    "SmartTrack muestra líneas guía temporales y relaciones de alineación a partir de puntos de referencia existentes. Ayuda a localizar posiciones alineadas o relacionadas sin crear geometría auxiliar permanente.",
    "Utiliza SmartTrack junto con Osnap: Osnap captura puntos exactos; SmartTrack ayuda a proyectar y relacionar posiciones mediante guías temporales. No sustituyen la revisión de las coordenadas ni del plano de trabajo.",
    "Para trabajar con claridad, captura primero un punto de referencia válido y observa las guías temporales que aparecen al mover el cursor. Confirma únicamente cuando la alineación corresponda a la intención del diseño."
  ]},
  { titulo: "7. Práctica aplicada: placa base para una joya", bloques: [
    "Prepara un documento en milímetros, activa la vista Superior y utiliza el plano de construcción predeterminado. Inicia una polilínea en el origen con la coordenada absoluta 0,0,0.",
    "Construye un rectángulo de 20 × 10 mm mediante coordenadas relativas cartesianas: desde el primer punto introduce @20,0,0; después @0,10,0; luego @-20,0,0 y cierra la polilínea. Comprueba que las dimensiones sean 20 mm por 10 mm.\n\nRepite el mismo rectángulo usando coordenadas polares relativas. Inicia otra polilínea en 0,0,0 y, en cada vértice, introduce @20<0 (lado derecho), @10<90 (lado superior), @20<180 (lado izquierdo) y @10<270 (lado inferior). Cierra la polilínea y verifica que también mida 20 × 10 mm. Observa que aquí @ indica que la distancia y el ángulo se calculan desde el último punto, no desde el origen.",
    "Traza las dos diagonales del rectángulo. Utiliza Osnap Int para localizar su intersección y dibuja allí un círculo de radio 3 mm. Comprueba el centro con la referencia de intersección y el tamaño con la herramienta de medición correspondiente.",
    "Utiliza End y Mid para capturar puntos exactos de las curvas. Activa SmartTrack y prueba una alineación temporal respecto a puntos existentes, sin dejar líneas auxiliares innecesarias en el archivo.",
    "Guarda el ejercicio como Sesion_03_Modelado_Preciso.3dm. Verifica que el rectángulo mida 20 × 10 mm, que el círculo tenga radio 3 mm y que toda la geometría esté en el plano de construcción esperado."
  ]},
  { titulo: "8. Verificación y criterios de logro", bloques: [
    "Al finalizar debes poder diferenciar coordenadas absolutas, relativas cartesianas y polares relativas; introducir una posición polar desde el origen y un desplazamiento polar desde el último punto; construir el rectángulo de 20 × 10 mm con @distancia<ángulo; aplicar restricciones de distancia y ángulo; utilizar al menos tres referencias Osnap adecuadas; y explicar cómo SmartTrack facilita una alineación temporal.",
    "La práctica se considera correcta cuando las dimensiones del rectángulo y del círculo coinciden con los valores solicitados, las curvas están correctamente ubicadas y el archivo queda guardado con el nombre indicado.",
    "Antes de continuar, revisa que no hayas creado geometría accidental fuera del plano de construcción. La siguiente sesión abordará la edición de curvas y las transformaciones."
  ]}
] as const;

const LECTURA_SESION_4 = [
  { titulo: "1. Objetivo: edición y transformación de curvas", bloques: [
    "En esta sesión aprenderás a modificar curvas existentes y a transformar objetos sin tener que dibujarlos nuevamente. Practicaremos empalmes, chaflanes, desfases, mover, copiar, rotar y escalar.",
    "El objetivo es controlar la forma y la ubicación de perfiles que pueden servir como base para piezas de joyería. Trabaja sobre copias cuando quieras conservar la geometría original.",
    "Distribución orientativa de las 2 horas: edición de contornos (35 min), transformaciones (35 min), práctica aplicada (40 min) y repaso (10 min)."
  ]},
  { titulo: "2. Empalmes de curvas (Fillet)", bloques: [
    "El comando Fillet crea una transición redondeada entre dos curvas, utilizando un radio definido. Se emplea para suavizar una esquina o unir dos segmentos mediante un arco.",
    "Selecciona las curvas que deseas conectar e introduce el radio solicitado. Revisa las opciones de recorte y la solución propuesta antes de confirmar, porque el resultado depende de la posición de selección y de la geometría.",
    "En perfiles destinados a joyería, el radio debe responder al diseño y a las necesidades de fabricación. No asumas que cualquier radio es adecuado para todos los espesores o detalles."
  ]},
  { titulo: "3. Chaflanes y desfasados (Chamfer y Offset)", bloques: [
    "Chamfer genera una transición recta entre dos curvas o segmentos. A diferencia de Fillet, que crea un redondeo, Chamfer construye un bisel o chaflán.",
    "Offset crea una curva paralela a una distancia determinada respecto de una curva original. Puede utilizarse para generar contornos interiores o exteriores y conservar una separación definida.",
    "Comprueba el lado hacia el que se genera el desfase y revisa si las curvas resultantes se cruzan o se separan. En contornos cerrados, verifica que el resultado permanezca limpio y utilizable."
  ]},
  { titulo: "4. Transformación: mover y copiar", bloques: [
    "Move desplaza objetos desde un punto base hasta un punto de destino. Puedes indicar ambos puntos con el ratón, coordenadas o ayudas de precisión vistas en la sesión anterior.",
    "Copy crea una o varias copias del objeto seleccionado. Mantén claro si estás moviendo el original o generando duplicados para no confundir las piezas del archivo.",
    "Practica desplazando una curva una distancia definida y creando una copia separada. Comprueba su posición en las vistas Top y Front."
  ]},
  { titulo: "5. Transformación: rotar y escalar", bloques: [
    "Rotate gira objetos alrededor de un centro y un ángulo definidos. Selecciona cuidadosamente el centro de rotación y revisa el sentido del giro.",
    "Scale modifica el tamaño de los objetos respecto a un punto base. El escalado uniforme conserva las proporciones; los modos no uniformes pueden cambiar las proporciones según los ejes.",
    "En diseño de joyería, no escales una pieza sin considerar las dimensiones funcionales. Para esta práctica utiliza geometría de prueba y compara las medidas antes y después."
  ]},
  { titulo: "6. Práctica: preparar un perfil", bloques: [
    "Dibuja un contorno sencillo con segmentos y curvas. Crea una copia de seguridad del perfil antes de aplicar operaciones de edición.",
    "Aplica Fillet a una esquina con un radio definido y Chamfer a otra para comparar una transición redondeada con una recta. Genera un Offset y revisa la separación.",
    "Utiliza Move y Copy para organizar dos versiones del perfil. Después aplica Rotate y Scale a una copia, manteniendo intacto el original.",
    "Guarda el archivo con nombres claros y verifica que las curvas no se hayan desplazado accidentalmente. En la siguiente sesión trabajaremos curvas avanzadas, puntos de control y optimización de perfiles."
  ]}
] as const;

const LECTURA_SESION_5 = [
  { titulo: "1. Objetivo: curvas avanzadas aplicadas a joyería", bloques: [
    "Esta sesión profundiza en la construcción y edición de curvas para desarrollar perfiles más expresivos y adecuados al diseño de joyas. Aprenderás a crear curvas libres y a modificar su forma mediante puntos de control.",
    "El propósito es obtener perfiles continuos y controlables que puedan utilizarse como guías o contornos en etapas posteriores de modelado. La calidad de una curva influye en las operaciones que se construyan a partir de ella.",
    "Distribución orientativa de las 2 horas: curvas libres (30 min), puntos de control (35 min), optimización de perfiles (35 min), práctica y repaso (20 min)."
  ]},
  { titulo: "2. Curvas libres", bloques: [
    "Las curvas libres permiten definir recorridos que no están limitados a segmentos rectos, círculos o arcos simples. En Rhino puedes utilizar Curve para dibujar una curva pasando por puntos que marcan su recorrido.",
    "Coloca los puntos con intención: demasiados puntos pueden dificultar el control de la forma. Empieza con pocos puntos bien distribuidos y revisa la continuidad visual del perfil.",
    "En joyería, las curvas libres pueden servir para definir siluetas orgánicas, contornos decorativos y líneas guía. Mantén el perfil limpio y evita ondulaciones involuntarias."
  ]},
  { titulo: "3. Puntos de control: mostrar y editar", bloques: [
    "Los puntos de control permiten modificar la forma de determinadas curvas NURBS sin tener que redibujarlas desde cero. En Rhino puedes activar su visualización con PointsOn (F10) y ocultarlos con PointsOff (F11).",
    "Al mover un punto de control cambia la forma de la curva en su zona de influencia. El efecto depende de la distribución y el peso de los puntos; no todos los puntos afectan la curva de la misma manera.",
    "Realiza cambios pequeños y observa el resultado en varias vistas. Si la curva pierde la forma deseada, utiliza Undo o vuelve a una copia del perfil original."
  ]},
  { titulo: "4. Ajustar la forma y mantener un perfil limpio", bloques: [
    "Distribuye los puntos de control de forma equilibrada y evita añadir puntos innecesarios. Una curva con una estructura sencilla suele ser más fácil de editar y de reutilizar.",
    "Comprueba que el perfil no presente picos, ondulaciones o cambios bruscos que no formen parte del diseño. Revisa tanto la silueta general como las transiciones entre tramos.",
    "Cuando el perfil deba conectarse con otras curvas, verifica los extremos y la continuidad visual. No confundas que dos curvas se toquen con que formen una transición suave."
  ]},
  { titulo: "5. Optimización de perfiles para fabricación", bloques: [
    "Un perfil pensado para fabricación debe ser claro, editable y coherente con la pieza que se desea construir. Evita segmentos duplicados, puntos excesivos y pequeños tramos accidentales.",
    "Comprueba si la curva está abierta o cerrada según la función que tendrá. Si debe formar un contorno cerrado, verifica que sus extremos coincidan y que no existan interrupciones.",
    "La optimización en esta etapa es una revisión geométrica del perfil; todavía no sustituye la validación de espesores, volúmenes ni tolerancias de fabricación, que se abordarán en etapas posteriores."
  ]},
  { titulo: "6. Práctica: perfil orgánico para una joya", bloques: [
    "Dibuja una curva libre que represente el contorno lateral de un elemento decorativo para una joya. Utiliza pocos puntos y busca una silueta equilibrada.",
    "Activa PointsOn (F10), modifica dos o tres puntos de control y compara la forma antes y después. Evita deformaciones bruscas y conserva una copia del perfil inicial.",
    "Revisa el perfil en Top y Perspective, comprueba sus extremos y decide si debe permanecer abierto o cerrarse según el ejercicio. Guarda el archivo con una versión inicial y otra optimizada.",
    "Al terminar debes poder crear una curva libre, editar sus puntos de control y explicar qué hace que un perfil sea más sencillo de reutilizar. La siguiente sesión iniciará el modelado de sólidos."
  ]}
] as const;

const LECTURA_SESION_6 = [
  { titulo: "1. Objetivo: modelado de sólidos para joyería", bloques: [
    "En esta sesión aprenderás a construir volúmenes tridimensionales a partir de perfiles y operaciones de modelado. Los sólidos permiten representar piezas con volumen definido y constituyen una base importante para desarrollar anillos y componentes sencillos.",
    "Antes de comenzar, revisa las unidades del documento, la escala y la organización de las curvas que utilizarás como perfiles. Mantén copias de las geometrías originales para poder corregir el proceso sin perder el trabajo inicial."
  ]},
  { titulo: "2. Extrusiones", bloques: [
    "La extrusión genera un volumen al desplazar una curva en una dirección y una distancia determinadas. El resultado depende del perfil utilizado, de su condición geométrica y de los parámetros de la operación.",
    "Practica con perfiles cerrados y observa cómo cambia el sólido al modificar la altura o dirección. Comprueba que el contorno sea adecuado antes de extruir y revisa el resultado en distintas vistas."
  ]},
  { titulo: "3. Revoluciones", bloques: [
    "La revolución crea una forma tridimensional al girar un perfil alrededor de un eje. Es especialmente útil para estudiar piezas con simetría radial, como cuerpos de anillos y elementos torneados.",
    "Define con cuidado el eje de giro y el ángulo de revolución. Un eje mal ubicado puede producir una pieza descentrada o una forma distinta de la esperada."
  ]},
  { titulo: "4. Construcción de anillos y piezas básicas", bloques: [
    "Combina perfiles y operaciones de extrusión o revolución para construir un volumen sencillo de anillo. Concéntrate en la sección del aro, el diámetro interior y la proporción general de la pieza.",
    "Utiliza medidas coherentes y revisa el modelo desde las vistas superior, frontal y lateral. En esta etapa se busca comprender la construcción del volumen, no todavía resolver todos los detalles de fabricación."
  ]},
  { titulo: "5. Revisión del sólido", bloques: [
    "Comprueba que el objeto obtenido sea realmente un sólido cerrado y que no presente superficies abiertas o partes desconectadas. La apariencia sombreada por sí sola no garantiza que la geometría esté correctamente cerrada.",
    "Guarda una versión del archivo y realiza una revisión visual del volumen. Anota cualquier error antes de continuar con operaciones más complejas."
  ]},
  { titulo: "6. Práctica guiada: volumen básico de joyería", bloques: [
    "Crea un anillo sencillo a partir de un perfil controlado y una operación de revolución o de extrusión, según la geometría propuesta por el docente. Identifica qué operación resulta más adecuada para cada forma.",
    "Al finalizar, entrega el archivo editable y señala qué perfil y qué operación utilizaste para construir el volumen."
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
  const [examenSeleccionado, setExamenSeleccionado] = useState("");
  const [examenEditandoId, setExamenEditandoId] = useState("");
  const [preguntasAbiertasExamenId, setPreguntasAbiertasExamenId] = useState("");
  const [examenVistaPreviaId, setExamenVistaPreviaId] = useState("");
  const [preguntaVistaPrevia, setPreguntaVistaPrevia] = useState(0);
  const [respuestasVistaPrevia, setRespuestasVistaPrevia] = useState<Record<string,string>>({});
  const [simulacionFinalizada, setSimulacionFinalizada] = useState(false);
  const [tituloExamenEditado, setTituloExamenEditado] = useState("");
  const [instruccionesExamenEditadas, setInstruccionesExamenEditadas] = useState("");
  const [duracionExamenEditada, setDuracionExamenEditada] = useState("20");
  const [intentosExamenEditados, setIntentosExamenEditados] = useState("1");
  const [disponibleDesdeEditado, setDisponibleDesdeEditado] = useState("");
  const [disponibleHastaEditado, setDisponibleHastaEditado] = useState("");
  const [examenEliminarPendiente, setExamenEliminarPendiente] = useState<Examen | null>(null);
  const [tipoPregunta, setTipoPregunta] = useState<"opcion_multiple" | "verdadero_falso" | "practica">("opcion_multiple");
  const [enunciadoPregunta, setEnunciadoPregunta] = useState("");
  const [opcionesPregunta, setOpcionesPregunta] = useState("Opción A\nOpción B\nOpción C\nOpción D");
  const [respuestaCorrecta, setRespuestaCorrecta] = useState("Opción A");
  const [puntajePregunta, setPuntajePregunta] = useState("1");
  const [examenActivoAlumno, setExamenActivoAlumno] = useState<ExamenAlumno | null>(null);
  const [preguntaActualAlumno, setPreguntaActualAlumno] = useState(0);
  const [respuestasAlumno, setRespuestasAlumno] = useState<Record<string, string>>({});
  const [enviandoExamen, setEnviandoExamen] = useState(false);
  const [segundosRestantesExamen, setSegundosRestantesExamen] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [vistaPreviaAlumno, setVistaPreviaAlumno] = useState(false);
  const [lecturaAbierta, setLecturaAbierta] = useState<SesionCurso | null>(null);
  const [lecturaModoVistaPrevia, setLecturaModoVistaPrevia] = useState(false);
  const [lecturasSimuladas, setLecturasSimuladas] = useState<Set<string>>(new Set());
  const [paginaLectura, setPaginaLectura] = useState(0);
  const [modoCoord3, setModoCoord3] = useState<"absolutas"|"relativas"|"polares">("relativas");
  const [valorCoord3, setValorCoord3] = useState("20");
  const [anguloCoord3, setAnguloCoord3] = useState("0");
  const [puntosCoord3, setPuntosCoord3] = useState<Array<{x:number;y:number}>>([{x:0,y:0}]);
  const [cerradoCoord3, setCerradoCoord3] = useState(false);
  const [estadoCoord3, setEstadoCoord3] = useState("");
  const [laboratorioCoordenadasAbierto, setLaboratorioCoordenadasAbierto] = useState(false);
  const [laboratorioOsnapAbierto, setLaboratorioOsnapAbierto] = useState(false);
  const [retoOsnap, setRetoOsnap] = useState(0);
  const [respuestaOsnap, setRespuestaOsnap] = useState<string | null>(null);
  const [aciertosOsnap, setAciertosOsnap] = useState(0);
  const [moduloGeometria, setModuloGeometria] = useState(0);
  const [respuestaGeometria, setRespuestaGeometria] = useState("");
  const [resultadoGeometria, setResultadoGeometria] = useState<"correcto" | "incorrecto" | null>(null);
  const [faseLaboratorioGeometria, setFaseLaboratorioGeometria] = useState(0);
  const [modulosGeometriaCompletados, setModulosGeometriaCompletados] = useState<number[]>([]);
  const [laboratorioGeometriaAbierto, setLaboratorioGeometriaAbierto] = useState(false);
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
    if (!examenActivoAlumno?.intento_id || enviandoExamen) return;
    const respuestas = examenActivoAlumno.preguntas
      .filter(p => Object.prototype.hasOwnProperty.call(respuestasAlumno, p.id))
      .map(p => ({
        pregunta_id: p.id,
        respuesta: p.tipo === "verdadero_falso"
          ? respuestasAlumno[p.id] === "true"
          : (respuestasAlumno[p.id] ?? "")
      }));
    const timeout = window.setTimeout(() => {
      void (async () => {
        const { error } = await (supabase as any).rpc("guardar_respuestas_intento_formacion", {
          _intento_id: examenActivoAlumno.intento_id,
          _respuestas: respuestas,
          _pregunta_actual: preguntaActualAlumno
        });
        if (error) setMensaje("No se pudo guardar tu respuesta automáticamente. Mantén esta pantalla abierta e inténtalo de nuevo.");
      })();
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [respuestasAlumno, preguntaActualAlumno, examenActivoAlumno?.intento_id, enviandoExamen]);

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
    const coincideBusqueda = !termino || [alumno.nombre, alumno.usuario, alumno.email, alumno.taller]
      .some((valor) => String(valor ?? "").toLocaleLowerCase().includes(termino));
    return coincideTaller && coincideBusqueda;
  });
  const examenesQuery = useQuery({
    queryKey: ["aula-formacion-examenes-docente", participanteId, cursoActivoId],
    enabled: Boolean(esDocente && participanteId && cursoActivoId),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("formacion_examenes").select("id,curso_id,sesion_id,titulo,instrucciones,duracion_minutos,intentos_permitidos,puntaje_maximo,publicado,disponible_desde,disponible_hasta").eq("participante_id", participanteId).eq("curso_id", cursoActivoId).order("created_at", { ascending: false });
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
        .select("id,curso_id,numero,titulo,descripcion,duracion_horas,fecha_programada,publicada,bloqueada")
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
      const { data, error } = await (supabase as any).from("formacion_examenes").select("id,curso_id,sesion_id,titulo,instrucciones,duracion_minutos,intentos_permitidos,puntaje_maximo,publicado,disponible_desde,disponible_hasta").in("curso_id", idsCursosAlumno).eq("publicado", true).order("created_at", { ascending: false });
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
        .select("id,curso_id,sesion_id,titulo,descripcion,nombre_archivo,ruta_storage,mime_type,tamano_bytes,created_at,publicado")
        .in("curso_id", idsCursosAlumno).eq("publicado", true).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Material[];
    },
  });

  useEffect(() => {
    const materiales = esDocente ? materialesDocenteQuery.data : materialesAlumnoQuery.data;
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
  }, [lecturaAbierta?.id, lecturaAbierta?.numero, esDocente, materialesDocenteQuery.data, materialesAlumnoQuery.data]);

  useEffect(() => {
    const materiales = esDocente ? materialesDocenteQuery.data : materialesAlumnoQuery.data;
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
  }, [lecturaAbierta?.id, lecturaAbierta?.numero, esDocente, materialesDocenteQuery.data, materialesAlumnoQuery.data]);

  useEffect(() => {
    const materiales = esDocente ? materialesDocenteQuery.data : materialesAlumnoQuery.data;
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
  }, [lecturaAbierta?.id, lecturaAbierta?.numero, esDocente, materialesDocenteQuery.data, materialesAlumnoQuery.data]);

  useEffect(() => {
    const materiales = esDocente ? materialesDocenteQuery.data : materialesAlumnoQuery.data;
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
  }, [lecturaAbierta?.id, lecturaAbierta?.numero, esDocente, materialesDocenteQuery.data, materialesAlumnoQuery.data]);

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

  function iniciarEdicionExamen(examen: Examen) {
    setExamenSeleccionado(examen.id);
    setExamenEditandoId(examen.id);
    setTituloExamenEditado(examen.titulo);
    setInstruccionesExamenEditadas(examen.instrucciones ?? "");
    setDuracionExamenEditada(String(examen.duracion_minutos ?? 20));
    setIntentosExamenEditados(String(examen.intentos_permitidos ?? 1));
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

  async function abrirExamenAlumno(id: string) {
    setMensaje("");
    const { data, error } = await (supabase as any).rpc("obtener_examen_formacion_alumno", { _examen_id: id });
    if (error) { setMensaje(error.message); return; }
    const { data: inicio, error: inicioError } = await (supabase as any).rpc("iniciar_intento_formacion", { _examen_id: id });
    if (inicioError) { setMensaje(inicioError.message); return; }
    const { data: intentoGuardado, error: recuperarError } = await (supabase as any).rpc("recuperar_respuestas_intento_formacion", { _intento_id: inicio.intento_id });
    if (recuperarError) { setMensaje(recuperarError.message); return; }
    const respuestasRecuperadas = Object.fromEntries(
      ((intentoGuardado?.respuestas ?? []) as Array<{ pregunta_id: string; respuesta: unknown }>).map(r => [
        r.pregunta_id,
        typeof r.respuesta === "boolean" ? String(r.respuesta) : String(r.respuesta ?? "")
      ])
    );
    setRespuestasAlumno(respuestasRecuperadas);
    setPreguntaActualAlumno(Math.min(
      Math.max(0, Number(intentoGuardado?.pregunta_actual ?? 0)),
      Math.max(0, (data as ExamenAlumno).preguntas.length - 1)
    ));
    setExamenActivoAlumno({ ...(data as ExamenAlumno), intento_id: inicio.intento_id, vence_en: inicio.vence_en ?? null });
  }

  async function enviarExamenAlumno() {
    if (!examenActivoAlumno || enviandoExamen) return;
    const tiempoAgotado = segundosRestantesExamen === 0;
    const faltante = examenActivoAlumno.preguntas.find(p => p.obligatoria && !String(respuestasAlumno[p.id] ?? "").trim());
    if (faltante && !tiempoAgotado) { setMensaje("Responde todas las preguntas obligatorias antes de enviar."); return; }
    const respuestas = examenActivoAlumno.preguntas.map(p => ({ pregunta_id: p.id, respuesta: p.tipo === "verdadero_falso" ? respuestasAlumno[p.id] === "true" : (respuestasAlumno[p.id] ?? "") }));
    setEnviandoExamen(true); setMensaje("");
    try {
      const { error: guardarError } = await (supabase as any).rpc("guardar_respuestas_intento_formacion", {
        _intento_id: examenActivoAlumno.intento_id,
        _respuestas: respuestas,
        _pregunta_actual: preguntaActualAlumno
      });
      if (guardarError) throw guardarError;
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
      const secciones = seccionesOriginales;
      if (!secciones) {
        setMensaje(vistaPrevia ? "Todavía no hay contenido de lectura guardado para esta sesión." : "La lectura de esta sesión todavía no está publicada por FADILAB.");
        return;
      }
      setSeccionesLecturaActivas(secciones);
      setLecturaModoVistaPrevia(vistaPrevia);
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
    { titulo: "Punto", pregunta: "¿Qué representa un punto en Rhino?", introduccion: "En Rhino, un punto representa una posición concreta en el espacio de trabajo. Su ubicación puede expresarse mediante coordenadas respecto de los ejes X, Y y Z.", claves: ["Las coordenadas X, Y y Z permiten localizar el punto en el espacio tridimensional.","Un punto puede servir como referencia para dibujar, ubicar o construir otros elementos.","Un punto no tiene área ni volumen: indica una posición."], aplicacion: "En el diseño de joyería, puedes utilizar puntos como referencias para ubicar elementos con precisión, por ejemplo, para marcar dónde comienza una curva o dónde debe situarse un componente de la pieza.", ejemplo: "Al preparar el diseño de un anillo, puedes definir puntos de referencia para ubicar con precisión el inicio y el final de determinados trazos.", opciones: [{ valor: "volumen", texto: "Un volumen con grosor" }, { valor: "posicion", texto: "Una posición o referencia en el espacio" }, { valor: "superficie", texto: "Una cara con área" }], correcta: "posicion", explicacion: "¡Exacto! El punto define una posición. En Rhino puedes apoyarte en coordenadas y referencias para ubicar elementos con precisión." },
    { titulo: "Curvas", pregunta: "¿Cuál de estas geometrías es una curva cerrada circular?", introduccion: "En Rhino, las curvas representan líneas o recorridos que pueden ser rectos o tener distintas formas. El manual presenta herramientas como Línea, Polilínea, Círculo y Rectángulo para crear geometría básica.", claves: ["Una curva abierta tiene extremos que no se unen.","Una curva cerrada conecta su inicio con su final.","El círculo es una curva cerrada y plana; la línea y la polilínea pueden formar trazos abiertos."], aplicacion: "En joyería, las curvas permiten definir contornos y recorridos de construcción. Un círculo puede utilizarse como carril o trayectoria circular para desarrollar el aro de un anillo.", ejemplo: "Para construir el carril de un anillo, dibuja un círculo que defina el recorrido del aro. Después podrás utilizar ese círculo como trayectoria para desarrollar el cuerpo del anillo a partir de un perfil.", opciones: [{ valor: "linea", texto: "Línea" }, { valor: "polilinea", texto: "Polilínea abierta" }, { valor: "circulo", texto: "Círculo" }], correcta: "circulo", explicacion: "Correcto. El círculo es una curva cerrada. Una línea o polilínea abierta conserva extremos sin unir." },
    { titulo: "Superficies", pregunta: "¿Qué diferencia a una superficie de una curva?", introduccion: "En Rhino, una superficie es similar a un trozo de tela elástica: puede adoptar distintas formas y está limitada por curvas llamadas bordes. Tiene área y su forma puede modificarse mediante puntos de control.", claves: ["Una superficie tiene área y puede ser plana o adoptar formas curvas.","Sus límites se denominan bordes y están definidos por curvas.","Su forma puede modificarse moviendo sus puntos de control."], aplicacion: "En joyería, una superficie puede representar una zona exterior curva, como la parte superior de un colgante o una forma ornamental que después se integrará en el diseño de la pieza.", ejemplo: "La parte superior abombada de un colgante puede construirse como una superficie. Luego podrás evaluar cómo integrarla con el resto de la geometría.", opciones: [{ valor: "area", texto: "La superficie representa una zona con área" }, { valor: "color", texto: "La superficie siempre tiene otro color" }, { valor: "cierre", texto: "La superficie es siempre una línea cerrada" }], correcta: "area", explicacion: "Así es. Una superficie ocupa una zona con área. Una curva representa una línea o recorrido, no una región superficial." },
    { titulo: "Sólidos", pregunta: "¿Qué característica identifica a un sólido cerrado?", introduccion: "En Rhinoceros, un sólido es una superficie o polisuperficie cerrada que encierra un volumen. Sus límites forman un cuerpo completamente cerrado, no una superficie abierta.", claves: ["Un sólido cerrado encierra un volumen tridimensional.","Puede estar formado por una superficie cerrada o por varias superficies unidas en una polisuperficie.","El manual incluye operaciones para crear, separar, modificar y unir partes de un sólido."], aplicacion: "En joyería, puedes utilizar sólidos para representar cuerpos como una barra, un componente macizo o determinadas partes de una montura. Es importante comprobar que la geometría esté cerrada cuando el proceso de fabricación lo requiera.", ejemplo: "Una pieza modelada como sólido cerrado representa un volumen completo. No es lo mismo que tener únicamente las superficies exteriores sin cerrar.", opciones: [{ valor: "trazo", texto: "Está formado solo por líneas" }, { valor: "volumen", texto: "Delimita un volumen cerrado" }, { valor: "plano", texto: "Es una curva plana" }], correcta: "volumen", explicacion: "Correcto. Un sólido cerrado delimita un volumen tridimensional y representa un cuerpo, no solo líneas o superficies abiertas." },
  ];
  const renderLaboratorioCoordenadas = () => {
    if (lecturaAbierta?.numero !== 3 || paginaLectura !== 2) return null;
    if (!laboratorioCoordenadasAbierto) return <section className="mt-7 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-background to-background p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-gold-deep">Recurso interactivo · Sesión 03</p><h4 className="mt-1 text-base font-semibold">Laboratorio de coordenadas</h4><p className="mt-1 text-sm text-muted-foreground">Practica coordenadas absolutas, relativas y polares en un espacio de trabajo independiente.</p></div>
        <button type="button" onClick={() => setLaboratorioCoordenadasAbierto(true)} className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-black shadow-sm"><ArrowRight className="size-4"/> Abrir laboratorio</button>
      </div>
    </section>;
    const ox=250,oy=170,k=9,last=puntosCoord3[puntosCoord3.length-1]??{x:0,y:0};
    const reset=()=>{setPuntosCoord3([{x:0,y:0}]);setCerradoCoord3(false);setEstadoCoord3("");setModoCoord3("relativas");setValorCoord3("20");setAnguloCoord3("0");};
    const add=()=>{const a=Number(valorCoord3.replace(",",".")),b=Number(anguloCoord3.replace(",","."));if(!Number.isFinite(a)||!Number.isFinite(b)){setEstadoCoord3("Valor no válido");return;}let p={x:a,y:b};if(modoCoord3==="relativas")p={x:last.x+a,y:last.y+b};if(modoCoord3==="polares"){const rad=b*Math.PI/180;p={x:last.x+a*Math.cos(rad),y:last.y+a*Math.sin(rad)};}setPuntosCoord3(v=>[...v,p]);setCerradoCoord3(false);setEstadoCoord3(`Punto: ${p.x.toFixed(2)}, ${p.y.toFixed(2)}`);};
    const pts=puntosCoord3.map(p=>`${ox+p.x*k},${oy-p.y*k}`).join(" ");
    return <div className="fixed inset-0 z-[100] overflow-hidden bg-background/95 p-2 backdrop-blur-sm sm:p-3"><section className="mx-auto flex h-[calc(100dvh-1rem)] max-w-[min(96vw,1600px)] flex-col overflow-hidden rounded-2xl border border-gold/30 bg-background shadow-2xl sm:h-[calc(100dvh-1.5rem)]">
      <header className="flex items-center justify-between border-b border-border bg-gradient-to-r from-[#fbf8f0] to-background px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-gold-deep">Laboratorio independiente · Sesión 03</p><h4 className="font-semibold">Construye con coordenadas</h4></div><div className="flex items-center gap-2"><button type="button" onClick={reset} className="rounded-lg border border-border px-3 py-2 text-xs"><RotateCcw className="mr-1 inline size-3.5"/> Reiniciar</button><button type="button" onClick={() => setLaboratorioCoordenadasAbierto(false)} className="rounded-lg border border-border px-3 py-2 text-xs">Volver a la lectura</button></div></header>
      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-2 sm:p-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,.75fr)]">
        <div className="flex min-h-[260px] min-w-0 flex-col overflow-hidden rounded-xl bg-[#17191d]"><div className="flex shrink-0 justify-between border-b border-white/10 px-3 py-2 text-[10px] text-white/70"><span>PLANO XY · SUPERIOR</span><span>{puntosCoord3.length-1} segmentos</span></div>
          <svg viewBox="0 0 500 340" className="min-h-0 w-full flex-1" role="img" aria-label="Plano cartesiano interactivo">
            {Array.from({length:21},(_,i)=><g key={i}><line x1={20+i*23} y1="8" x2={20+i*23} y2="332" stroke="#3b414a"/><line x1="8" y1={10+i*16} x2="492" y2={10+i*16} stroke="#3b414a"/></g>)}
            <line x1="8" y1={oy} x2="492" y2={oy} stroke="#aaa"/><line x1={ox} y1="8" x2={ox} y2="332" stroke="#aaa"/><text x="480" y={oy-7} fill="white" fontSize="10">X</text><text x={ox+8} y="18" fill="white" fontSize="10">Y</text>
            {puntosCoord3.length>1&&<polyline points={pts} fill={cerradoCoord3?"rgba(231,189,98,.14)":"none"} stroke="#e7bd62" strokeWidth="3" strokeLinejoin="round"/>}
            {cerradoCoord3&&<line x1={ox+last.x*k} y1={oy-last.y*k} x2={ox+puntosCoord3[0]!.x*k} y2={oy-puntosCoord3[0]!.y*k} stroke="#e7bd62" strokeWidth="3"/>}
            {puntosCoord3.map((p,i)=><g key={i}><circle cx={ox+p.x*k} cy={oy-p.y*k} r="4.5" fill={i===0?"#67d6a0":"#e7bd62"}/><text x={ox+p.x*k+7} y={oy-p.y*k-8} fill="white" fontSize="10">{i===0?"O":`P${i}`}</text></g>)}
          </svg><p className="shrink-0 border-t border-white/10 px-3 py-2 text-[10px] text-white/70">Verde: origen · Dorado: puntos</p>
        </div>
        <div className="flex min-h-0 flex-col gap-2 overflow-y-auto pr-1 lg:overscroll-contain">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">{(["absolutas","relativas","polares"] as const).map(m=><button key={m} type="button" onClick={()=>{setModoCoord3(m);setEstadoCoord3("");}} className={`rounded-lg px-1 py-2 text-[11px] font-semibold capitalize ${modoCoord3===m?"bg-background shadow-sm":"text-muted-foreground"}`}>{m}</button>)}</div>
          <div className="rounded-xl border border-border p-3"><p className="mb-2 text-xs font-semibold">{modoCoord3==="polares"?"Distancia / ángulo":modoCoord3==="relativas"?"Desplazamiento ΔX / ΔY":"Posición X / Y"}</p><div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] text-muted-foreground">{modoCoord3==="polares"?"Distancia":modoCoord3==="relativas"?"ΔX":"X"}<input value={valorCoord3} onChange={e=>setValorCoord3(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2.5 text-sm text-foreground"/></label>
            <label className="text-[10px] text-muted-foreground">{modoCoord3==="polares"?"Ángulo °":modoCoord3==="relativas"?"ΔY":"Y"}<input value={anguloCoord3} onChange={e=>setAnguloCoord3(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2.5 text-sm text-foreground"/></label>
          </div><button type="button" onClick={add} className="mt-3 w-full rounded-lg bg-gold px-3 py-2.5 text-sm font-bold text-black">Añadir punto</button><button type="button" onClick={()=>{if(puntosCoord3.length<3){setEstadoCoord3("Añade al menos tres puntos");return;}setCerradoCoord3(true);setEstadoCoord3("Contorno cerrado");}} className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-xs font-semibold">Cerrar contorno</button></div>
          <div className="rounded-xl border border-border p-3 text-xs"><div className="flex justify-between"><b>Último punto</b><span className="font-mono">{last.x.toFixed(2)}, {last.y.toFixed(2)}</span></div><p className="mt-2 min-h-5 text-muted-foreground" aria-live="polite">{estadoCoord3||"Añade puntos y observa el trazado."}</p></div>
          <div key={modoCoord3} className="rounded-xl border border-gold/30 bg-gold/5 p-3 text-xs">
            <p className="font-semibold text-foreground">{modoCoord3==="absolutas"?"Ejemplo · Rectángulo por coordenadas absolutas":modoCoord3==="relativas"?"Ejemplo · Rectángulo por desplazamientos relativos":"Ejemplo · Rectángulo por coordenadas polares"}</p>
            {modoCoord3==="absolutas" ? <>
              <p className="mt-1 text-muted-foreground">En <b>Absolutas</b>, cada par indica la posición exacta del siguiente vértice respecto al origen (0, 0):</p>
              <ol className="mt-3 space-y-2">
                <li className="flex items-center justify-between gap-3"><span>1. Esquina inferior derecha</span><code className="rounded bg-background px-2 py-1 font-semibold">X 20 · Y 0</code></li>
                <li className="flex items-center justify-between gap-3"><span>2. Esquina superior derecha</span><code className="rounded bg-background px-2 py-1 font-semibold">X 20 · Y 10</code></li>
                <li className="flex items-center justify-between gap-3"><span>3. Esquina superior izquierda</span><code className="rounded bg-background px-2 py-1 font-semibold">X 0 · Y 10</code></li>
                <li className="flex items-center justify-between gap-3"><span>4. Regresa al origen</span><code className="rounded bg-background px-2 py-1 font-semibold">X 0 · Y 0</code></li>
              </ol>
            </> : modoCoord3==="relativas" ? <>
              <p className="mt-1 text-muted-foreground">En <b>Relativas</b>, cada valor desplaza el punto desde el último vértice. Comienza en (0, 0):</p>
              <ol className="mt-3 space-y-2">
                <li className="flex items-center justify-between gap-3"><span>1. Lado horizontal</span><code className="rounded bg-background px-2 py-1 font-semibold">ΔX 20 · ΔY 0</code></li>
                <li className="flex items-center justify-between gap-3"><span>2. Lado vertical</span><code className="rounded bg-background px-2 py-1 font-semibold">ΔX 0 · ΔY 10</code></li>
                <li className="flex items-center justify-between gap-3"><span>3. Lado horizontal</span><code className="rounded bg-background px-2 py-1 font-semibold">ΔX -20 · ΔY 0</code></li>
                <li className="flex items-center justify-between gap-3"><span>4. Lado vertical</span><code className="rounded bg-background px-2 py-1 font-semibold">ΔX 0 · ΔY -10</code></li>
              </ol>
            </> : <>
              <p className="mt-1 text-muted-foreground">En <b>Polares</b>, introduce la longitud de cada lado y su ángulo respecto al eje X positivo:</p>
              <ol className="mt-3 space-y-2">
                <li className="flex items-center justify-between gap-3"><span>1. Lado horizontal</span><code className="rounded bg-background px-2 py-1 font-semibold">20 mm · 0°</code></li>
                <li className="flex items-center justify-between gap-3"><span>2. Lado vertical</span><code className="rounded bg-background px-2 py-1 font-semibold">10 mm · 90°</code></li>
                <li className="flex items-center justify-between gap-3"><span>3. Lado horizontal</span><code className="rounded bg-background px-2 py-1 font-semibold">20 mm · 180°</code></li>
                <li className="flex items-center justify-between gap-3"><span>4. Lado vertical</span><code className="rounded bg-background px-2 py-1 font-semibold">10 mm · 270°</code></li>
              </ol>
            </>}
            <p className="mt-3 text-muted-foreground">{modoCoord3==="absolutas"?"Introduce la posición X/Y de cada vértice, uno por uno.":modoCoord3==="relativas"?"Introduce cada desplazamiento ΔX/ΔY desde el último punto.":"Introduce la distancia y el ángulo de cada lado."} Pulsa <b>Añadir punto</b> después de cada par y finalmente <b>Cerrar contorno</b>.</p>
          </div>
        </div>
      </div>
    </section></div>;
  };

  const renderLaboratorioOsnap = () => {
    if (lecturaAbierta?.numero !== 3 || paginaLectura !== 4) return null;
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
    const siguiente=()=>{setRetoOsnap(v=>(v+1)%retos.length);setRespuestaOsnap(null);};
    const reiniciar=()=>{setRetoOsnap(0);setRespuestaOsnap(null);setAciertosOsnap(0);};
    if(!laboratorioOsnapAbierto)return <section className="mt-7 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-background to-background p-5">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-widest text-gold-deep">Recurso interactivo · Sesión 03</p><h4 className="mt-1 text-base font-semibold">Entrenador Osnap</h4><p className="mt-1 text-sm text-muted-foreground">Practica cómo elegir referencias geométricas exactas en Rhino.</p></div><button type="button" onClick={()=>setLaboratorioOsnapAbierto(true)} className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-black"><ArrowRight className="size-4"/> Abrir laboratorio</button></div>
    </section>;
    return <div className="fixed inset-0 z-[100] overflow-hidden bg-background/95 p-2 backdrop-blur-sm sm:p-3"><section className="mx-auto flex h-[calc(100dvh-1rem)] max-w-[min(96vw,1500px)] flex-col overflow-hidden rounded-2xl border border-gold/30 bg-background shadow-2xl sm:h-[calc(100dvh-1.5rem)]">
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-gradient-to-r from-[#fbf8f0] to-background px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-gold-deep">Entrenador Osnap · Sesión 03</p><h4 className="font-semibold">Encuentra la referencia exacta</h4></div><div className="flex items-center gap-2"><span className="hidden text-xs text-muted-foreground sm:inline">Aciertos: {aciertosOsnap}/{retos.length}</span><button type="button" onClick={reiniciar} className="rounded-lg border border-border px-3 py-2 text-xs"><RotateCcw className="mr-1 inline size-3.5"/> Reiniciar</button><button type="button" onClick={()=>setLaboratorioOsnapAbierto(false)} className="rounded-lg border border-border px-3 py-2 text-xs">Volver a la lectura</button></div></header>
      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-2 sm:p-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(350px,.8fr)]">
        <div className="flex min-h-[260px] min-w-0 flex-col overflow-hidden rounded-xl bg-[#17191d]"><div className="flex shrink-0 justify-between border-b border-white/10 px-3 py-2 text-[10px] text-white/70"><span>ÁREA DE DIBUJO · REFERENCIAS GEOMÉTRICAS</span><span>RETO {retoOsnap+1} / {retos.length}</span></div>
          <svg viewBox="0 0 600 420" className="min-h-0 w-full flex-1" role="img" aria-label={"Ejercicio visual de referencia " + reto.nombre}>
            <defs><pattern id="osnap-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#343a43" strokeWidth="1"/></pattern></defs>
            <rect width="600" height="420" fill="url(#osnap-grid)"/>
            {reto.figura==="end"&&<><path d="M130 300 L300 120 L470 300" fill="none" stroke="#d5d9df" strokeWidth="4" strokeLinecap="round"/><circle cx="470" cy="300" r="8" fill="#e7bd62"/><text x="483" y="293" fill="white" fontSize="14">Extremo</text></>}
            {reto.figura==="mid"&&<><path d="M130 210 L470 210" stroke="#d5d9df" strokeWidth="4"/><circle cx="130" cy="210" r="6" fill="#e7bd62"/><circle cx="470" cy="210" r="6" fill="#e7bd62"/><circle cx="300" cy="210" r="9" fill="#67d6a0"/><path d="M300 160 V260" stroke="#67d6a0" strokeDasharray="5 5"/><text x="314" y="190" fill="white" fontSize="14">Mitad</text></>}
            {reto.figura==="cen"&&<><circle cx="300" cy="210" r="130" fill="none" stroke="#d5d9df" strokeWidth="4"/><circle cx="300" cy="210" r="8" fill="#67d6a0"/><path d="M300 210 L390 120" stroke="#e7bd62" strokeDasharray="6 5"/><text x="314" y="235" fill="white" fontSize="14">Centro</text></>}
            {reto.figura==="int"&&<><path d="M120 330 L480 90 M120 90 L480 330" stroke="#d5d9df" strokeWidth="4" fill="none"/><circle cx="300" cy="210" r="9" fill="#67d6a0"/><path d="M300 210 V370" stroke="#67d6a0" strokeDasharray="5 5"/><text x="314" y="198" fill="white" fontSize="14">Cruce</text></>}
            {reto.figura==="perp"&&<><path d="M90 270 Q300 70 510 270" stroke="#d5d9df" strokeWidth="4" fill="none"/><path d="M300 170 V350" stroke="#e7bd62" strokeWidth="3" strokeDasharray="7 5"/><path d="M300 170 L330 170 L330 200" stroke="#67d6a0" strokeWidth="3" fill="none"/><circle cx="300" cy="170" r="8" fill="#67d6a0"/></>}
            {reto.figura==="tan"&&<><circle cx="300" cy="210" r="115" fill="none" stroke="#d5d9df" strokeWidth="4"/><path d="M415 70 V350" stroke="#e7bd62" strokeWidth="3" strokeDasharray="7 5"/><circle cx="415" cy="210" r="8" fill="#67d6a0"/><path d="M300 210 L415 210" stroke="#67d6a0" strokeDasharray="5 5"/></>}
            {reto.figura==="quad"&&<><circle cx="300" cy="210" r="125" fill="none" stroke="#d5d9df" strokeWidth="4"/><path d="M300 60 V360 M150 210 H450" stroke="#59616d" strokeDasharray="6 5"/><circle cx="300" cy="85" r="9" fill="#67d6a0"/><text x="314" y="78" fill="white" fontSize="14">90°</text></>}
            {reto.figura==="near"&&<><path d="M100 290 C170 50 420 70 500 290" stroke="#d5d9df" strokeWidth="5" fill="none"/><circle cx="355" cy="145" r="8" fill="#67d6a0"/><path d="M355 145 L390 110" stroke="#e7bd62" strokeDasharray="5 5"/></>}
            {reto.figura==="point"&&<><circle cx="180" cy="270" r="7" fill="#d5d9df"/><circle cx="300" cy="150" r="10" fill="#67d6a0"/><circle cx="430" cy="280" r="7" fill="#d5d9df"/><text x="315" y="145" fill="white" fontSize="14">Punto</text></>}
          </svg><p className="shrink-0 border-t border-white/10 px-3 py-2 text-[10px] text-white/70">Verde: referencia que debes identificar · Gris: geometría</p>
        </div>
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
          <div className="rounded-xl border border-border p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">¿Qué Osnap necesitas?</span><span className="text-xs font-mono">{retoOsnap+1}/{retos.length}</span></div><p className="mt-3 text-base font-semibold leading-snug">{reto.pregunta}</p><div className="mt-4 grid grid-cols-2 gap-2">{reto.opciones.map(op=><button key={op} type="button" disabled={respuestaOsnap!==null} onClick={()=>responder(op)} className={"rounded-xl border px-3 py-3 text-sm font-semibold transition "+(respuestaOsnap===op?(op===reto.snap?"border-emerald-500 bg-emerald-500/10 text-emerald-700":"border-red-400 bg-red-400/10 text-red-700"):respuestaOsnap!==null&&op===reto.snap?"border-emerald-500 bg-emerald-500/10 text-emerald-700":"border-border hover:border-gold/60 hover:bg-gold/5")}>{op}</button>)}</div>
          {respuestaOsnap!==null&&<div className="mt-4 rounded-xl bg-muted p-3 text-sm"><p className="font-semibold">{respuestaOsnap===reto.snap?"¡Correcto!":"No es esa referencia"}</p><p className="mt-1 text-muted-foreground">{reto.explicacion}</p><button type="button" onClick={siguiente} className="mt-3 w-full rounded-lg bg-gold px-4 py-2.5 font-semibold text-black">{retoOsnap===retos.length-1?"Volver al primer reto":"Siguiente reto"} <ArrowRight className="ml-1 inline size-4"/></button></div>}
          </div>
          <div className="rounded-xl border border-border p-3"><div className="flex items-center justify-between"><b className="text-xs">Progreso</b><span className="text-xs text-muted-foreground">{aciertosOsnap} aciertos</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gold transition-all" style={{width:((retoOsnap+1)/retos.length*100)+"%"}}/></div><p className="mt-2 text-[11px] text-muted-foreground">Resuelve los nueve retos para practicar las referencias principales de Rhino.</p></div>
        </div>
      </div>
    </section></div>;
  };

  const renderLaboratorioGeometria = () => {
    if (lecturaAbierta?.numero !== 2 || paginaLectura !== 1) return null;
    if (!laboratorioGeometriaAbierto) return <section className="mt-7 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-background to-background p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold-deep">Laboratorio guiado · RHINO 7</p><h4 className="mt-2 text-lg font-semibold">Aprende a reconocer la geometría de una joya</h4><p className="mt-1 text-sm text-muted-foreground">Primero aprende, observa ejemplos y aplica cada concepto. Al final podrás comprobar lo que has aprendido.</p><p className="mt-2 text-xs text-muted-foreground">{modulosGeometriaCompletados.length}/4 módulos completados</p></div><button type="button" onClick={() => setLaboratorioGeometriaAbierto(true)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-black shadow-sm transition hover:-translate-y-0.5 hover:brightness-105"><BookOpenCheck className="size-4"/> Abrir laboratorio <ArrowRight className="size-4"/></button></div>
    </section>;
    const actividad = actividadesGeometria[moduloGeometria] ?? actividadesGeometria[0]!;
    const completados = modulosGeometriaCompletados.length;
    const fases = ["Aprende", "Observa", "En joyería", "Practica"];
    const avanzarFase = () => { setFaseLaboratorioGeometria(v=>Math.min(3,v+1)); setRespuestaGeometria(""); setResultadoGeometria(null); };
    return <section className="fixed inset-0 z-[100] h-[100dvh] w-full max-w-none overflow-y-auto rounded-none border-0 bg-background" role="dialog" aria-modal="true" aria-label="Laboratorio guiado de geometría">
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-3 py-2 backdrop-blur sm:px-4"><div className="flex items-center justify-end gap-2"><span className="rounded-full border border-gold/30 bg-background px-3 py-1 text-[11px] font-semibold">{completados}/4 módulos aprendidos</span><button type="button" onClick={() => setLaboratorioGeometriaAbierto(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">Cerrar ✕</button></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gold transition-all" style={{width: (completados/4*100)+"%"}}/></div></div>
      <div className="mx-auto grid w-full max-w-7xl gap-3 p-3 sm:p-4 lg:gap-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{actividadesGeometria.map((item,indice) => <button key={item.titulo} type="button" onClick={() => {setModuloGeometria(indice);setFaseLaboratorioGeometria(0);setRespuestaGeometria("");setResultadoGeometria(null);}} className={`rounded-xl border p-2.5 text-left transition sm:p-3 ${moduloGeometria===indice ? "border-gold bg-gold/15" : "border-border bg-background hover:border-gold/50"}`}><span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Módulo 0${indice+1}</span><span className="mt-1 block text-sm font-semibold">{item.titulo}</span><span className="mt-1 block text-[10px] text-muted-foreground">{modulosGeometriaCompletados.includes(indice) ? "✓ Aprendido" : "Por aprender"}</span></button>)}</div>
        <div className="flex flex-wrap gap-2">{fases.map((fase,indice)=><button key={fase} type="button" onClick={()=>{if(indice<=faseLaboratorioGeometria){setFaseLaboratorioGeometria(indice);setRespuestaGeometria("");setResultadoGeometria(null);}}} disabled={indice>faseLaboratorioGeometria} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${faseLaboratorioGeometria===indice ? "border-gold bg-gold/15 text-gold-deep" : indice<faseLaboratorioGeometria ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-border bg-muted text-muted-foreground"}`}>{indice+1}. {fase}{indice<faseLaboratorioGeometria?" ✓":""}</button>)}</div>
        <div className="grid gap-3 rounded-xl border border-border bg-background p-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-5 lg:p-4">
          <div className="flex min-h-[180px] items-center justify-center rounded-xl bg-[#17191d] p-3 sm:min-h-[220px] lg:min-h-[min(48vh,390px)]">
            {moduloGeometria===0 && <svg viewBox="0 0 240 160" className="h-44 w-full max-w-2xl sm:h-52 lg:h-[min(42vh,340px)]" role="img" aria-label="Punto de referencia en los ejes X, Y y Z"><path d="M35 125 L120 145 L210 105 M120 145 L120 25" stroke="#737b86" strokeWidth="1.5" fill="none"/><circle cx="120" cy="75" r="7" fill="#e7bd62"/><path d="M120 75 L120 145 M120 75 L35 125 M120 75 L210 35" stroke="#e7bd62" strokeDasharray="4 4" opacity=".7"/><text x="132" y="70" fill="#f4f4f5" fontSize="11">Punto</text><text x="214" y="108" fill="#a1a1aa" fontSize="9">X</text><text x="124" y="20" fill="#a1a1aa" fontSize="9">Z</text></svg>}
            {moduloGeometria===1 && <svg viewBox="0 0 240 160" className="h-44 w-full max-w-2xl sm:h-52 lg:h-[min(42vh,340px)]" role="img" aria-label="Ejemplos de líneas, polilíneas, círculo y rectángulo"><path d="M18 40 L95 40" stroke="#e7bd62" strokeWidth="3" fill="none"/><path d="M18 95 L55 65 L95 95" stroke="#65b7e8" strokeWidth="3" fill="none"/><circle cx="155" cy="40" r="25" stroke="#6fd1a1" strokeWidth="3" fill="none"/><rect x="130" y="76" width="50" height="42" stroke="#c49ae8" strokeWidth="3" fill="none"/><g fill="#f4f4f5" fontSize="10"><text x="32" y="57">Línea</text><text x="24" y="112">Polilínea</text><text x="139" y="75">Círculo</text><text x="184" y="101">Rect.</text></g></svg>}
            {moduloGeometria===2 && <svg viewBox="0 0 240 160" className="h-44 w-full max-w-2xl sm:h-52 lg:h-[min(42vh,340px)]" role="img" aria-label="Superficie curva que representa una zona con área"><path d="M35 105 Q120 5 205 105 Q120 145 35 105Z" fill="#65b7e8" fillOpacity=".32" stroke="#8bd1f2" strokeWidth="2"/><path d="M35 105 Q120 70 205 105 M65 85 Q120 115 175 85 M90 63 Q120 130 150 63" fill="none" stroke="#8bd1f2" strokeOpacity=".75"/><text x="88" y="145" fill="#f4f4f5" fontSize="11">Zona con área</text></svg>}
            {moduloGeometria===3 && <svg viewBox="0 0 240 160" className="h-44 w-full max-w-2xl sm:h-52 lg:h-[min(42vh,340px)]" role="img" aria-label="Sólido tridimensional con volumen cerrado"><path d="M55 55 L135 25 L200 58 L118 90Z" fill="#e7bd62" fillOpacity=".9" stroke="#f8dfa0"/><path d="M55 55 L55 112 L118 145 L118 90Z" fill="#b58b39" stroke="#f8dfa0"/><path d="M118 90 L200 58 L200 115 L118 145Z" fill="#8f6a2c" stroke="#f8dfa0"/><text x="82" y="12" fill="#f4f4f5" fontSize="10">Volumen cerrado</text></svg>}
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold-deep">Módulo 0${moduloGeometria+1} · {actividad.titulo} · {fases[faseLaboratorioGeometria]}</p>
            {faseLaboratorioGeometria===0 && <div className="mt-2 space-y-3"><h5 className="text-lg font-semibold">Primero, comprende el concepto</h5><p className="text-sm leading-6 text-muted-foreground">{actividad.introduccion}</p><div className="rounded-xl border border-border bg-muted/30 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Ideas clave</p><ul className="mt-2 space-y-2">{actividad.claves.map(clave=><li key={clave} className="flex gap-2 text-sm leading-5"><span className="text-gold-deep">•</span>{clave}</li>)}</ul></div></div>}
            {faseLaboratorioGeometria===1 && <div className="mt-2 space-y-3"><h5 className="text-lg font-semibold">Observa la representación</h5><p className="text-sm leading-6 text-muted-foreground">Mira la ilustración y relaciona sus formas con la explicación. No necesitas responder todavía: dedica un momento a identificar sus elementos.</p><div className="rounded-xl border border-border bg-muted/30 p-3 text-sm leading-6">{actividad.claves.map(clave=><p key={clave}>• {clave}</p>)}</div></div>}
            {faseLaboratorioGeometria===2 && <div className="mt-2 space-y-3"><h5 className="text-lg font-semibold">Llévalo al diseño de joyería</h5><p className="text-sm leading-6 text-muted-foreground">{actividad.aplicacion}</p><div className="rounded-xl border border-gold/30 bg-gold/5 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Ejemplo aplicado</p><p className="mt-1 text-sm leading-6">{actividad.ejemplo}</p></div></div>}
            {faseLaboratorioGeometria===3 && <div className="mt-2 space-y-3"><h5 className="text-lg font-semibold">{actividad.pregunta}</h5><p className="text-sm text-muted-foreground">Ahora que ya conoces el concepto, selecciona la respuesta que mejor lo representa.</p><div className="space-y-2">{actividad.opciones.map(opcion=><button key={opcion.valor} type="button" onClick={()=>{setRespuestaGeometria(opcion.valor);setResultadoGeometria(null);}} className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition ${respuestaGeometria===opcion.valor ? "border-gold bg-gold/10" : "border-border hover:border-gold/50"}`}>{opcion.texto}</button>)}</div><button type="button" disabled={!respuestaGeometria} onClick={()=>{const correcto=respuestaGeometria===actividad.correcta;setResultadoGeometria(correcto?"correcto":"incorrecto");if(correcto)setModulosGeometriaCompletados(prev=>prev.includes(moduloGeometria)?prev:[...prev,moduloGeometria]);}} className="w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">Comprobar lo aprendido</button>{resultadoGeometria&&<div className={`rounded-lg border p-3 text-sm ${resultadoGeometria==="correcto"?"border-emerald-300 bg-emerald-50 text-emerald-900":"border-amber-300 bg-amber-50 text-amber-900"}`}><p className="font-semibold">{resultadoGeometria==="correcto"?"¡Muy bien! Has comprendido este concepto.":"Vamos a repasarlo una vez más."}</p><p className="mt-1 leading-5">{resultadoGeometria==="correcto"?actividad.explicacion:"Vuelve a las fases Aprende y Observa para revisar la explicación. Después puedes intentarlo de nuevo."}</p></div>}</div>}
            <div className="mt-4 flex flex-wrap justify-between gap-2"><button type="button" disabled={faseLaboratorioGeometria===0} onClick={()=>{setFaseLaboratorioGeometria(v=>Math.max(0,v-1));setRespuestaGeometria("");setResultadoGeometria(null);}} className="rounded-lg border border-border px-4 py-2 text-xs font-semibold disabled:opacity-40">Anterior</button>{faseLaboratorioGeometria<3 ? <button type="button" onClick={avanzarFase} className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-black">Continuar <ArrowRight className="ml-1 inline size-3.5"/></button> : <button type="button" disabled={resultadoGeometria!=="correcto"||moduloGeometria===3} onClick={()=>{setModuloGeometria(v=>Math.min(3,v+1));setFaseLaboratorioGeometria(0);setRespuestaGeometria("");setResultadoGeometria(null);}} className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-black disabled:opacity-40">Siguiente módulo <ArrowRight className="ml-1 inline size-3.5"/></button>}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Aprendizaje guiado · Primero comprende, luego practica. No modifica geometría dentro de Rhino.</p><button type="button" onClick={()=>{setModuloGeometria(0);setFaseLaboratorioGeometria(0);setRespuestaGeometria("");setResultadoGeometria(null);setModulosGeometriaCompletados([]);}} className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted">Reiniciar laboratorio</button></div>
        {completados===4 && <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900"><p className="font-semibold">¡Has completado el laboratorio!</p><p className="mt-1">Ya reconoces punto, curvas, superficies y sólidos, y sabes cómo se relacionan con el diseño de joyería.</p></div>}
      </div>
    </section>;
  };


  const renderLaboratorioCapas = () => {
    if (lecturaAbierta?.numero !== 2 || paginaLectura !== 6) return null;
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
    if (!laboratorioCapasAbierto) return <><section className="mt-7 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-background to-background p-5 sm:p-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold-deep">Laboratorio interactivo · MatrixGold</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><h4 className="text-lg font-semibold">Practica con las capas de una joya</h4><p className="mt-1 text-sm text-muted-foreground">Experimenta con la visibilidad, el bloqueo y la asignación de objetos en un modelo didáctico.</p></div>
        <button type="button" onClick={() => setLaboratorioCapasAbierto(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-black shadow-sm transition hover:brightness-105"><Layers className="size-4"/> Iniciar práctica <ArrowRight className="size-4"/></button>
      </div>
    </section>{mostrarRetoCapasAlCerrar && <section className="mt-4 rounded-2xl border border-gold/30 bg-card p-4 sm:p-5"><div className="rounded-xl border border-gold/30 bg-gold/5 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold-deep">Reto de comprobación</p><h4 className="mt-1 text-sm font-semibold">Quieres proteger la piedra central para evitar seleccionarla, pero mantenerla visible. ¿Qué control debes activar?</h4><div className="mt-3 space-y-2">{[{v:"ojo",t:"Cerrar el ojo de Gem 01"},{v:"candado",t:"Activar el candado de Gem 01"},{v:"triangulo",t:"Asignar la piedra a Metal 01"}].map(o=><button key={o.v} type="button" onClick={()=>{setRespuestaRetoCapas(o.v);setResultadoRetoCapas(null);}} className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${respuestaRetoCapas===o.v?"border-gold bg-gold/10":"border-border hover:border-gold/50"}`}>{o.t}</button>)}</div><button type="button" disabled={!respuestaRetoCapas} onClick={()=>{const ok=respuestaRetoCapas==="candado";setResultadoRetoCapas(ok?"correcto":"incorrecto");if(ok)setRetoCapasCompletado(true);}} className="mt-3 w-full rounded-lg bg-gold px-4 py-2.5 text-xs font-semibold text-black disabled:opacity-40">Comprobar respuesta</button>{resultadoRetoCapas&&<div className={`mt-3 rounded-lg border p-3 text-xs ${resultadoRetoCapas==="correcto"?"border-emerald-300 bg-emerald-50 text-emerald-900":"border-amber-300 bg-amber-50 text-amber-900"}`}><p className="font-semibold">{resultadoRetoCapas==="correcto"?"¡Correcto!":"Inténtalo otra vez."}</p><p className="mt-1">{resultadoRetoCapas==="correcto"?"El candado mantiene la piedra visible y evita seleccionarla directamente. El ojo controla la visibilidad de forma independiente.":"Recuerda: el ojo oculta; el candado impide seleccionar directamente."}</p></div>}</div>{retoCapasCompletado&&<div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900"><p className="font-semibold">¡Reto completado!</p><p className="mt-1 text-xs">Has distinguido correctamente visibilidad, bloqueo y asignación.</p></div>}</section>}</>;
    return <section className="fixed inset-0 z-[105] h-[100dvh] overflow-y-auto bg-background xl:overflow-hidden" role="dialog" aria-modal="true" aria-label="Laboratorio interactivo de capas MatrixGold">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-3 px-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold-deep">FADILAB · Sesión 2</p><h3 className="text-base font-semibold sm:text-lg">Laboratorio de capas · MatrixGold</h3></div><div className="flex shrink-0 items-center gap-2"><button type="button" onClick={reiniciar} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground" title="Restablecer todos los elementos de la práctica"><RotateCcw size={13} /> Reiniciar</button><button type="button" onClick={() => { setLaboratorioCapasAbierto(false); setMostrarRetoCapasAlCerrar(true); }} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">Cerrar ✕</button></div></div>
      </header>
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
          <div className="relative rounded-2xl border border-border bg-[#17191d] p-4 text-white xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
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

  if (!sesion || (!rolAlumno && !esDocente)) return <AppShell titulo="Aula de formación" subtitulo="Acceso restringido"><Panel titulo="Cuenta no habilitada"><p className="p-5 text-sm text-muted-foreground">El aula de alumnos está disponible para cuentas de gerente u operario. La docencia se administra exclusivamente desde FADILAB.</p></Panel></AppShell>;

  return <AppShell titulo="Aula de formación" subtitulo={esDocente ? "FADILAB · Administración académica" : "Tus cursos, materiales y actividades"}>
    <div className="mx-auto max-w-6xl space-y-5">
      {esDocente ? (
        <>
          <section className="rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/10 via-card to-card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold-deep"><ShieldCheck className="size-6" /></div>
              <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-deep">FADILAB · Administración académica</p><h2 className="mt-1 text-xl font-semibold">Centro de gestión docente</h2><p className="mt-1 text-sm text-muted-foreground">Organiza cursos, acompaña alumnos y administra contenidos desde un solo lugar.</p></div>
              {cursoActivoId && <button type="button" onClick={() => setVistaPreviaAlumno(true)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm font-semibold text-gold-deep hover:bg-gold/20"><BookOpen className="size-4" /> Vista previa del alumno</button>}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
              {[{label:"Cursos",value:cursos.length,icon:<BookOpen className="size-4"/>},{label:"Alumnos inscritos",value:(inscripcionesQuery.data ?? []).length,icon:<Users className="size-4"/>},{label:"Sesiones",value:(sesionesQuery.data ?? []).length,icon:<CalendarDays className="size-4"/>},{label:"Materiales",value:(materialesDocenteQuery.data ?? []).length,icon:<FileText className="size-4"/>}].map(item => <div key={item.label} className="rounded-xl border border-border/80 bg-card/80 p-3"><div className="flex items-center justify-between text-muted-foreground"><span className="text-xs">{item.label}</span>{item.icon}</div><p className="mt-2 text-2xl font-semibold tabular-nums">{item.value}</p></div>)}
            </div>
          </section>
          <section className="rounded-2xl border border-border bg-card p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Espacios de trabajo</p><p className="mt-1 text-sm font-semibold">{cursoActivoId ? cursos.find(c => c.id === cursoActivoId)?.titulo : "Selecciona o crea un curso"}</p></div>{cursoActivoId && <span className="rounded-full bg-gold/10 px-3 py-1 text-[11px] font-semibold text-gold-deep">Curso seleccionado</span>}</div>
            <nav aria-label="Secciones del panel docente" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[{id:"cursos",label:"Cursos",detail:"Crear y seleccionar",icon:<BookOpen className="size-5"/>},{id:"alumnos",label:"Alumnos y sesiones",detail:"Matrículas y programa",icon:<Users className="size-5"/>},{id:"materiales",label:"Biblioteca",detail:"Archivos y recursos",icon:<FolderOpen className="size-5"/>},{id:"evaluaciones",label:"Evaluaciones",detail:"Exámenes y entregas",icon:<ClipboardCheck className="size-5"/>}].map(item => <button key={item.id} type="button" onClick={() => setSeccionDocente(item.id)} aria-pressed={seccionDocente===item.id} className={`flex min-h-24 flex-col items-start gap-2 rounded-xl border p-3 text-left transition ${seccionDocente===item.id ? "border-gold bg-gold/10 text-gold-deep shadow-sm" : "border-border bg-background hover:border-gold/40 hover:bg-muted/40"}`}><span className="flex w-full items-center justify-between">{item.icon}{seccionDocente===item.id && <CheckCircle2 className="size-4"/>}</span><span><span className="block text-xs font-semibold">{item.label}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">{item.detail}</span></span></button>)}
            </nav>
          </section>

          {vistaPreviaAlumno && cursoActivoId && (() => {
            const curso = cursos.find(item => item.id === cursoActivoId);
            const sesionesPublicadas = (sesionesQuery.data ?? []).filter(item => item.publicada);
            const materialesPublicados = (materialesDocenteQuery.data ?? []).filter(m => m.publicado);
            const examenesVistaPrevia = examenesQuery.data ?? [];
            return <div className="fixed inset-0 left-0 z-50 overflow-y-auto bg-background lg:left-64 xl:left-72" role="dialog" aria-modal="true" aria-label="Vista previa del aula del alumno">
              <div className="min-h-full">
                <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
                  <div><h2 className="text-sm font-semibold">Aula de formación</h2><p className="text-xs text-muted-foreground">Vista previa idéntica al área del alumno · Modo de simulación, sin guardar actividad académica</p></div>
                  <button type="button" onClick={() => setVistaPreviaAlumno(false)} className="rounded-lg border border-border px-3 py-2 text-sm">Salir de vista previa</button>
                </header>
                <main className="mx-auto max-w-6xl space-y-7 px-4 py-6 sm:px-6 sm:py-8">
                  <section className="relative overflow-hidden rounded-3xl border border-gold/25 bg-gradient-to-br from-[#fbf8f0] via-card to-card p-6 shadow-sm sm:p-9">
                    <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full border border-gold/10"/>
                    <div className="pointer-events-none absolute -right-5 -top-10 size-44 rounded-full border border-gold/15"/>
                    <div className="relative max-w-3xl">
                      <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-deep"><BookOpen className="size-3.5"/> Aula de formación · FADILAB</div>
                      <h1 className="mt-5 font-display text-2xl leading-tight text-foreground sm:text-3xl">{curso?.titulo ?? "Curso de formación"}</h1>
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{curso?.descripcion || "Aquí encontrarás tus sesiones, lecturas y recursos de aprendizaje."}</p>
                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-xs font-medium"><CalendarDays className="size-4 text-gold-deep"/>{curso?.duracion_horas ?? 0} horas académicas</span>
                        <span className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-xs font-medium"><ShieldCheck className="size-4 text-gold-deep"/> Inscripción activa</span>
                        <span className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-xs font-medium"><Users className="size-4 text-gold-deep"/> Formación FADILAB</span>
                      </div>
                    </div>
                  </section>
                  <section className="grid gap-3 sm:grid-cols-3" aria-label="Accesos del curso">
                    <button type="button" onClick={() => setPanelAlumnoActivo("sesiones")} aria-pressed={panelAlumnoActivo==="sesiones"} className={`group rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${panelAlumnoActivo==="sesiones" ? "border-[#c4a46a] bg-[#fffaf0] ring-1 ring-[#c4a46a]/30" : "border-border bg-card hover:border-[#d8c39b]"}`}><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><BookOpen className="size-4 text-gold-deep"/> Sesiones publicadas <ArrowRight className="ml-auto size-4"/></div><p className="mt-2 text-2xl font-semibold tabular-nums">{sesionesPublicadas.length}</p><p className="mt-1 text-xs text-muted-foreground">Contenido de aprendizaje disponible</p></button>
                    <button type="button" onClick={() => setPanelAlumnoActivo("materiales")} aria-pressed={panelAlumnoActivo==="materiales"} className={`group rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${panelAlumnoActivo==="materiales" ? "border-[#c4a46a] bg-[#fffaf0] ring-1 ring-[#c4a46a]/30" : "border-border bg-card hover:border-[#d8c39b]"}`}><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><FileText className="size-4 text-gold-deep"/> Biblioteca del curso <ArrowRight className="ml-auto size-4"/></div><p className="mt-2 text-2xl font-semibold tabular-nums">{materialesPublicados.length}</p><p className="mt-1 text-xs text-muted-foreground">Materiales de estudio</p></button>
                    <button type="button" onClick={() => setPanelAlumnoActivo("evaluaciones")} aria-pressed={panelAlumnoActivo==="evaluaciones"} className={`group rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${panelAlumnoActivo==="evaluaciones" ? "border-[#c4a46a] bg-[#fffaf0] ring-1 ring-[#c4a46a]/30" : "border-border bg-card hover:border-[#d8c39b]"}`}><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><CheckCircle2 className="size-4 text-gold-deep"/> Refuerza lo aprendido <ArrowRight className="ml-auto size-4"/></div><p className="mt-2 text-2xl font-semibold tabular-nums">{examenesVistaPrevia.filter(item => item.publicado && (!item.disponible_desde || new Date(item.disponible_desde) <= new Date()) && (!item.disponible_hasta || new Date(item.disponible_hasta) > new Date())).length}</p><p className="mt-1 text-xs text-muted-foreground">Evaluaciones disponibles</p></button>
                  </section>
{panelAlumnoActivo === "sesiones" && <section className="space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-deep">Tu recorrido</p><h2 className="mt-1 text-xl font-semibold">Sesiones de aprendizaje</h2><p className="mt-1 text-sm text-muted-foreground">Avanza paso a paso por los contenidos preparados por FADILAB.</p></div><span className="text-xs text-muted-foreground">{lecturasSimuladas.size} de {sesionesPublicadas.length} sesiones completadas en esta simulación</span></div>
                    {sesionesQuery.isLoading ? <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Cargando sesiones…</div> : sesionesPublicadas.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center"><BookOpen className="mx-auto size-8 text-muted-foreground"/><p className="mt-3 text-sm font-medium">Aún no hay sesiones publicadas</p><p className="mt-1 text-xs text-muted-foreground">Cuando FADILAB publique una sesión, aparecerá aquí.</p></div> : <div className="grid gap-4">{sesionesPublicadas.map(item => <article key={item.id} className={`group relative overflow-hidden rounded-2xl border shadow-sm transition-all duration-200 ${item.bloqueada ? "border-slate-200 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 shadow-slate-200/40" : "border-[#d8c39b]/60 bg-gradient-to-br from-white via-[#fffefa] to-[#f7f3eb] shadow-[0_3px_14px_rgba(74,55,25,0.055)] hover:-translate-y-0.5 hover:border-[#c4a46a] hover:shadow-[0_12px_30px_rgba(74,55,25,0.10)]"}`}><div className={`pointer-events-none absolute inset-y-0 left-0 w-1 ${item.bloqueada ? "bg-slate-400 opacity-70" : "bg-gradient-to-b from-[#b99657] via-[#e0c994] to-transparent opacity-80"}`}/><div className="flex flex-col gap-4 p-4 pl-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5 sm:pl-6"><div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4"><div className={`flex size-12 shrink-0 flex-col items-center justify-center rounded-xl border shadow-inner ${item.bloqueada ? "border-slate-300 bg-slate-200 text-slate-600" : "border-[#d8c39b] bg-[#f8f2e6] text-[#8b6b35]"}`}><span className="text-[9px] font-bold uppercase tracking-wider">N.º</span><span className="text-base font-semibold tabular-nums">{String(item.numero).padStart(2,"0")}</span></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`text-[10px] font-bold uppercase tracking-[0.17em] ${item.bloqueada ? "text-slate-500" : "text-[#98743c]"}`}>Ruta de aprendizaje</span><span className="h-1 w-1 rounded-full bg-[#c8b28b]"/><span className="inline-flex items-center gap-1 rounded-full border border-[#e8dfce] bg-white/80 px-2.5 py-1 text-[10px] font-medium text-[#776b58]"><BookOpen className="size-3"/> {item.duracion_horas} horas</span>{item.bloqueada && <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800"><span aria-hidden="true">🔒</span> Bloqueada para alumnos</span>}{lecturasSimuladas.has(item.id) && <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700"><CheckCircle2 className="size-3"/> Completada · prueba</span>}</div><h3 className={`mt-2 text-[15px] font-semibold leading-snug tracking-[-0.01em] sm:text-base ${item.bloqueada ? "text-slate-600" : "text-[#24221e]"}`}>{item.titulo}</h3>{(item.descripcion || item.numero === 1) && <details className={`group/description mt-3 max-w-3xl overflow-hidden rounded-xl border ${item.bloqueada ? "border-slate-200 bg-slate-100/80 open:bg-slate-100" : "border-[#e9e1d3] bg-white/75 open:bg-white"}`}><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5 text-xs font-semibold text-[#876a3b] transition hover:bg-[#faf7f0] [&::-webkit-details-marker]:hidden"><span className="inline-flex items-center gap-2"><FileText className="size-3.5"/> Objetivo y descripción de la sesión</span><ChevronDown className="size-3.5 shrink-0 text-[#9a886a] transition-transform duration-200 group-open/description:rotate-180"/></summary><div className="border-t border-[#eee7db] px-3.5 py-3"><p className="whitespace-pre-wrap text-sm leading-6 text-[#68645c]">{item.descripcion}</p>{item.numero === 1 && <p className="mt-3 border-t border-[#eee7db] pt-3 text-xs leading-5 text-[#68645c]"><span className="font-semibold text-[#3e382e]">Al finalizar:</span> reconocerás la interfaz de Rhino, identificarás los ejes principales y dominarás la navegación básica en el espacio 3D.</p>}</div></details>}</div></div><div className="flex shrink-0 sm:pl-2"><button type="button" disabled={item.bloqueada} onClick={() => { if (!item.bloqueada) void abrirLecturaParaAlumno(item,true); }} title={item.bloqueada ? "El profesor todavía no ha habilitado esta sesión" : "Comenzar sesión"} className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:shadow-none sm:min-w-[190px] ${item.bloqueada ? "border-slate-300 bg-gradient-to-b from-slate-200 to-slate-300 text-slate-600 shadow-none" : "border-[#b9975b] bg-gradient-to-b from-[#c9aa70] to-[#b79558] text-[#211b11] shadow-[0_3px_8px_rgba(118,88,39,0.18)] hover:-translate-y-0.5 hover:from-[#d3b77f] hover:to-[#c09d60] hover:shadow-[0_6px_14px_rgba(118,88,39,0.22)] active:translate-y-0"}`}>{item.bloqueada ? <><span aria-hidden="true">🔒</span> Bloqueada</> : <><BookOpenCheck className="size-4"/> Comenzar sesión<ArrowRight className="size-3.5 opacity-70"/></>}</button></div></div></article>)}</div>}
                  </section>}
                  {panelAlumnoActivo === "evaluaciones" && <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><div className="mb-4"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-deep">Refuerza lo aprendido</p><h2 className="mt-1 text-lg font-semibold">Evaluaciones</h2></div><div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                      <div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-deep">Refuerza lo aprendido</p><h2 className="mt-1 text-lg font-semibold">Evaluaciones</h2></div><div className="flex size-10 items-center justify-center rounded-xl bg-gold/10 text-gold-deep"><CheckCircle2 className="size-5"/></div></div>
                      {examenesVistaPrevia.length===0 ? <div className="mt-4 rounded-xl border border-dashed border-border p-5 text-center"><p className="text-sm font-medium">Aún no hay evaluaciones creadas</p><p className="mt-1 text-xs text-muted-foreground">Cuando el profesor cree un examen aparecerá aquí.</p></div> : <div className="mt-4 space-y-3">{examenesVistaPrevia.map(item=>{const dentroDeHorario=(!item.disponible_desde||new Date(item.disponible_desde)<=new Date())&&(!item.disponible_hasta||new Date(item.disponible_hasta)>new Date());const activo=item.publicado&&dentroDeHorario;return <div key={item.id} className="rounded-xl border border-border p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{item.titulo}</p><p className="mt-1 text-xs text-muted-foreground">{item.duracion_minutos??"Sin límite"} min · {item.intentos_permitidos} intento(s)</p></div><span className={activo?"shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700":"shrink-0 rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground"}>{activo?"Activo · disponible":item.publicado?"Publicado · fuera de horario":"Desactivado · esperando al profesor"}</span></div><button type="button" disabled={!activo} onClick={()=>{setExamenSeleccionado(item.id);setExamenVistaPreviaId(item.id);setPreguntaVistaPrevia(0);setRespuestasVistaPrevia({});setSimulacionFinalizada(false);}} className="mt-3 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-xs font-semibold text-gold-deep disabled:cursor-not-allowed disabled:opacity-40">{activo?"Comenzar evaluación":"Aún no disponible"}</button></div>})}</div>}
                    </div></section>}
                  {panelAlumnoActivo === "materiales" && <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><details className="group/library overflow-hidden rounded-xl border border-border" ><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 transition hover:bg-muted/30 [&::-webkit-details-marker]:hidden"><span className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold-deep"><FileText className="size-5"/></span><span><span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-deep">Biblioteca del curso</span><span className="mt-0.5 block text-base font-semibold text-foreground">Materiales de estudio</span><span className="mt-0.5 block text-xs text-muted-foreground">{materialesPublicados.length} recursos disponibles</span></span></span><ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open/library:rotate-180"/></summary><div className="border-t border-border p-4 sm:p-5"><div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">{materialesDocenteQuery.isLoading ? <p className="mt-5 text-sm text-muted-foreground">Cargando materiales…</p> : materialesPublicados.length===0 ? <div className="mt-5 rounded-xl border border-dashed border-border p-5 text-center"><p className="text-sm font-medium">Todavía no hay materiales publicados</p><p className="mt-1 text-xs text-muted-foreground">Las fichas y recursos descargables aparecerán aquí.</p></div> : <div className="mt-4 space-y-3">{sesionesPublicadas.map(s=>{const items=materialesPublicados.filter(m=>m.sesion_id===s.id);return <details key={s.id} className="overflow-hidden rounded-xl border border-border"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-muted/30 px-4 py-3"><span className="min-w-0"><span className="block text-xs font-semibold text-gold-deep">SESIÓN {s.numero}</span><span className="block truncate text-sm font-medium">{s.titulo}</span></span><span className="shrink-0 rounded-full bg-background px-2.5 py-1 text-[10px] text-muted-foreground">{s.bloqueada ? "🔒 Bloqueada" : `${items.length} material${items.length===1?"":"es"}`}</span></summary><div className="space-y-2 p-3">{s.bloqueada ? <p className="px-1 py-2 text-xs text-amber-800">Materiales bloqueados hasta que el profesor habilite esta sesión.</p> : items.length===0?<p className="px-1 py-2 text-xs text-muted-foreground">Todavía no hay materiales para esta sesión.</p>:items.map(m=><div key={m.id} className="flex items-center gap-3 rounded-xl border border-border p-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold-deep"><FileText className="size-5"/></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{m.titulo}</p><p className="mt-1 truncate text-xs text-muted-foreground">{m.nombre_archivo} · {(m.tamano_bytes/1024/1024).toFixed(1)} MB</p></div><button type="button" onClick={()=>void descargarMaterial(m)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition hover:bg-muted"><Download className="size-3.5"/> Descargar</button></div>)}</div></details>})}{materialesPublicados.some(m=>!m.sesion_id)&&<details className="overflow-hidden rounded-xl border border-border"><summary className="flex cursor-pointer list-none items-center justify-between bg-muted/30 px-4 py-3"><span className="text-sm font-semibold">Material general del curso</span><span className="text-[10px] text-muted-foreground">{materialesPublicados.filter(m=>!m.sesion_id).length} materiales</span></summary><div className="space-y-2 p-3">{materialesPublicados.filter(m=>!m.sesion_id).map(m=><div key={m.id} className="flex items-center gap-3 rounded-xl border border-border p-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold-deep"><FileText className="size-5"/></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{m.titulo}</p><p className="mt-1 truncate text-xs text-muted-foreground">{m.nombre_archivo} · {(m.tamano_bytes/1024/1024).toFixed(1)} MB</p></div><button type="button" onClick={()=>void descargarMaterial(m)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition hover:bg-muted"><Download className="size-3.5"/> Descargar</button></div>)}</div></details>}</div>}</div></div></details></section>}
<p className="pb-4 text-center text-xs text-muted-foreground">FADILAB · Formación técnica para el sector joyero</p>
                </main>
              </div>
            </div>;
          })()}
          {lecturaAbierta && lecturaModoVistaPrevia && <div className="fixed inset-0 left-0 z-[60] flex items-center justify-center overflow-hidden bg-black/60 p-2 sm:p-3 lg:left-64 xl:left-72" role="dialog" aria-modal="true" aria-label="Lectura de la sesión · vista previa">
            <div className="mx-auto flex h-[calc(100dvh-1rem)] max-h-[900px] min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
              <header className="shrink-0 border-b border-border bg-gradient-to-r from-[#fbf8f0] to-background px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-deep">FADILAB · Aula de formación · Lectura guiada</p><h2 className="mt-1 text-lg font-semibold">{lecturaAbierta.numero}. {lecturaAbierta.titulo}</h2><p className="mt-1 text-xs text-muted-foreground">Vista previa del alumno · Modo de simulación, sin guardar actividad académica.</p></div><button type="button" onClick={() => { setLecturaAbierta(null); setLecturaModoVistaPrevia(false); }} className="rounded-lg border border-border px-3 py-2 text-xs">Cerrar</button></div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gold transition-all" style={{width: (seccionesLecturaActivas.length ? ((paginaLectura+1)/seccionesLecturaActivas.length)*100 : 0)+"%"}}/></div>
                <p className="mt-2 text-xs text-muted-foreground">Apartado {paginaLectura+1} de {seccionesLecturaActivas.length}</p>
              </header>
              <nav aria-label="Índice de la lectura" className="shrink-0 border-b border-border bg-background px-4 py-3 sm:px-6 sm:py-3">
                <div className="mb-2 flex items-center justify-between gap-3"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Índice de contenidos</p><p className="text-[11px] text-muted-foreground">Selecciona un apartado para navegar</p></div>
                <div className="flex gap-2 overflow-x-auto pb-1">{seccionesLecturaActivas.map((seccion, indice) => <button key={indice} type="button" onClick={() => setPaginaLectura(indice)} aria-current={paginaLectura===indice ? "step" : undefined} className={`flex min-w-10 shrink-0 items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition ${paginaLectura===indice ? "border-gold bg-gold text-black shadow-sm" : "border-border bg-card text-muted-foreground hover:border-gold/50 hover:text-foreground"}`} title={seccion.titulo}>{String(indice+1).padStart(2,"0")}</button>)}</div>
                <p className="mt-2 truncate text-xs font-medium text-foreground">{seccionesLecturaActivas[paginaLectura]?.titulo ?? "Lectura"}</p>
              </nav>
              <main className="min-h-0 flex-1 overflow-y-auto bg-card/40 px-5 py-5 sm:px-8 sm:py-6 lg:px-10">
                <h3 className="mb-5 max-w-4xl font-display text-2xl leading-tight sm:text-3xl">{seccionesLecturaActivas[paginaLectura]?.titulo ?? "Lectura"}</h3>
                {(seccionesLecturaActivas[paginaLectura]?.bloques ?? []).map((bloque,idx) => {
                  if (lecturaAbierta?.numero === 1 && paginaLectura === 4 && idx >= 6) return null;
                  return <div key={idx}><p className="mb-4 max-w-4xl whitespace-pre-line text-[15px] leading-7 text-foreground/90">{bloque}</p></div>;
                })}
                {renderLaboratorioCoordenadas()}
                {renderLaboratorioOsnap()}

                {renderLaboratorioGeometria()}
                {renderLaboratorioCapas()}
                {renderSelectorVistasPlano()}
                {lecturaAbierta?.numero === 1 && paginaLectura === 4 && <section className="mt-5 max-w-4xl rounded-xl border border-gold/30 bg-gradient-to-br from-gold/10 via-background to-background p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-deep">Recurso interactivo</p>
                  <h4 className="mt-1 text-base font-semibold">Comandos de navegación</h4>
                  <p className="mt-2 text-sm text-muted-foreground">Abre la ficha para explorar los comandos y consultar la función de cada uno.</p>
                  <button type="button" onClick={() => { setComandoNavegacionActivo("Zoom"); setComandosNavegacionAbiertos(true); }} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-black shadow-sm transition hover:brightness-95">Ver comandos de navegación <ChevronRight className="size-4"/></button>
                  {comandosNavegacionAbiertos && <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/75 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Comandos de navegación de Rhino 7">
                    <div className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
                      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-[#fbf8f0] to-background px-5 py-4">
                        <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-deep">FADILAB · Guía interactiva</p><h3 className="text-lg font-semibold">Comandos de navegación · Rhino 7</h3><p className="mt-1 text-xs text-muted-foreground">Selecciona un comando para consultar su función.</p></div>
                        <button type="button" onClick={() => setComandosNavegacionAbiertos(false)} className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-gold">Cerrar ×</button>
                      </header>
                      <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
                        <div className="overflow-hidden rounded-xl border border-border">
                          <table className="w-full border-collapse text-left text-sm"><thead><tr className="bg-muted/40"><th className="border-b border-border px-4 py-3">Comando</th><th className="border-b border-border px-4 py-3">Función</th></tr></thead><tbody>
                            {[
                              {comando:"Zoom",funcion:"Control de acercamiento"},
                              {comando:"ZE",funcion:"Zoom Extents: encuadrar todos los objetos"},
                              {comando:"ZEA",funcion:"Zoom All Extents: encuadrar todas las vistas"},
                              {comando:"ZS",funcion:"Zoom Selected: encuadrar objetos seleccionados"},
                              {comando:"Pan",funcion:"Desplazamiento de la vista"},
                              {comando:"UndoView",funcion:"Recuperar la vista anterior"}
                            ].map(item=><tr key={item.comando}><td className="border-b border-border p-0"><button type="button" onClick={()=>setComandoNavegacionActivo(item.comando)} aria-pressed={comandoNavegacionActivo===item.comando} className={`w-full px-4 py-3 text-left font-semibold transition hover:bg-gold/10 ${comandoNavegacionActivo===item.comando?"bg-gold/15 text-gold-deep":"bg-background"}`}>{item.comando}</button></td><td className="border-b border-border px-4 py-3">{item.funcion}</td></tr>)}
                          </tbody></table>
                        </div>
                        <div className="mt-4 rounded-xl border border-gold/30 bg-gold/10 p-4" aria-live="polite">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gold-deep">Comando seleccionado</p>
                          <p className="mt-1 text-lg font-semibold">{comandoNavegacionActivo}</p>
                          <p className="mt-1 text-sm text-foreground/80">{({Zoom:"Control de acercamiento",ZE:"Zoom Extents: encuadrar todos los objetos",ZEA:"Zoom All Extents: encuadrar todas las vistas",ZS:"Zoom Selected: encuadrar objetos seleccionados",Pan:"Desplazamiento de la vista",UndoView:"Recuperar la vista anterior"} as Record<string,string>)[comandoNavegacionActivo]}</p>
                        </div>
                      </div>
                    </div>
                  </div>}
                </section>}
                {lecturaAbierta?.numero === 1 && paginaLectura === 1 && <section className="mt-7 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-background to-background p-5 sm:p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-deep">Material visual de apoyo</p>
                  <h4 className="mt-1 text-lg font-semibold">Rhinoceros 7</h4>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Consulta la imagen de referencia general del programa.</p>
                  {imagenRhinoUrl ? <button type="button" onClick={() => setTipoImagenApoyoAbierta(tipoImagenApoyoAbierta === "rhinoceros" ? null : "rhinoceros")} aria-expanded={tipoImagenApoyoAbierta === "rhinoceros"} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-black shadow-sm transition hover:brightness-95">Ver RHINOCEROS <ChevronRight className="size-4"/></button> : <p className="mt-3 text-xs text-muted-foreground">{imagenRhinoError || "Buscando RHINOCEROS en la Biblioteca del curso…"}</p>}
                  {tipoImagenApoyoAbierta && <div className="fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-black/75 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Imagen de referencia de Rhinoceros">
                    <div className="flex max-h-[96dvh] w-full max-w-[1200px] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
                      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-[#fbf8f0] to-background px-4 py-3 sm:px-5">
                        <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-deep">FADILAB · Material de estudio</p><h3 className="text-base font-semibold">{tipoImagenApoyoAbierta === "rhinoceros" ? "Rhinoceros 7" : tipoImagenApoyoAbierta === "vistas" ? "Vistas de trabajo" : "Ejes de coordenadas"}</h3></div>
                        <button type="button" onClick={() => setTipoImagenApoyoAbierta(null)} className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-gold">Cerrar ×</button>
                      </header>
                      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-background p-3 sm:p-5">
                        <img src={tipoImagenApoyoAbierta === "rhinoceros" ? imagenRhinoUrl : tipoImagenApoyoAbierta === "vistas" ? imagenesVistasUrl : imagenesEjesUrl} alt={tipoImagenApoyoAbierta === "rhinoceros" ? "Referencia de Rhinoceros 7" : tipoImagenApoyoAbierta === "vistas" ? "Vistas de trabajo de Rhinoceros" : "Ejes de coordenadas de Rhinoceros"} className="block h-auto max-h-[78dvh] w-auto max-w-full rounded-lg object-contain" />
                      </div>
                    </div>
                  </div>}
                </section>}
                {lecturaAbierta?.numero === 1 && paginaLectura === 3 && <section className="mt-7 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-background to-background p-5 sm:p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-deep">Material visual de apoyo</p>
                  <h4 className="mt-1 text-lg font-semibold">Vistas y ejes de Rhinoceros 7</h4>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Identifica las vistas de trabajo y la orientación espacial mediante los ejes de coordenadas.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {imagenesVistasUrl && <button type="button" onClick={() => setTipoImagenApoyoAbierta(tipoImagenApoyoAbierta === "vistas" ? null : "vistas")} aria-expanded={tipoImagenApoyoAbierta === "vistas"} className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-black shadow-sm transition hover:brightness-95">Ver VISTAS <ChevronRight className="size-4"/></button>}
                    {imagenesEjesUrl && <button type="button" onClick={() => setTipoImagenApoyoAbierta(tipoImagenApoyoAbierta === "ejes" ? null : "ejes")} aria-expanded={tipoImagenApoyoAbierta === "ejes"} className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-black shadow-sm transition hover:brightness-95">Ver EJES <ChevronRight className="size-4"/></button>}
                  </div>
                  {!imagenesVistasUrl && !imagenesEjesUrl && <p className="mt-3 text-xs text-muted-foreground">{errorImagenesApoyo || "Buscando VISTAS y EJES en la Biblioteca del curso…"}</p>}
                  {(tipoImagenApoyoAbierta === "vistas" || tipoImagenApoyoAbierta === "ejes") && <div className="fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-black/75 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Imagen de referencia de Rhinoceros">
                    <div className="flex max-h-[96dvh] w-full max-w-[1200px] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
                      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-[#fbf8f0] to-background px-4 py-3 sm:px-5">
                        <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-deep">FADILAB · Material de estudio</p><h3 className="text-base font-semibold">{tipoImagenApoyoAbierta === "vistas" ? "Vistas de trabajo" : "Ejes de coordenadas"}</h3></div>
                        <button type="button" onClick={() => setTipoImagenApoyoAbierta(null)} className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-gold">Cerrar ×</button>
                      </header>
                      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-background p-3 sm:p-5">
                        <img src={tipoImagenApoyoAbierta === "vistas" ? imagenesVistasUrl : imagenesEjesUrl} alt={tipoImagenApoyoAbierta === "vistas" ? "Vistas de trabajo de Rhinoceros" : "Ejes de coordenadas de Rhinoceros"} className="block h-auto max-h-[78dvh] w-auto max-w-full rounded-lg object-contain" />
                      </div>
                    </div>
                  </div>}
                </section>}
                {lecturaAbierta?.numero === 1 && paginaLectura === 6 && <section className="mt-7 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-background to-background p-5 sm:p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-deep">Material visual de apoyo</p>
                  <h4 className="mt-1 text-lg font-semibold">Proceso de joyería con impresión 3D</h4>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Observa la secuencia general que conecta el diseño digital con la fabricación de una pieza de joyería mediante impresión 3D.</p>
                  {imagenProceso3DUrl ? <button type="button" onClick={() => setTipoImagenApoyoAbierta(tipoImagenApoyoAbierta === "proceso3d" ? null : "proceso3d")} aria-expanded={tipoImagenApoyoAbierta === "proceso3d"} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-black shadow-sm transition hover:brightness-95">Ver PROCESO DE JOYERÍA CON IMPRESIÓN 3D <ChevronRight className="size-4"/></button> : <p className="mt-3 text-xs text-muted-foreground">{imagenProceso3DError || "Buscando la imagen del proceso en la Biblioteca del curso…"}</p>}
                  {tipoImagenApoyoAbierta === "proceso3d" && <div className="fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-black/75 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Proceso de joyería con impresión 3D">
                    <div className="flex max-h-[96dvh] w-full max-w-[1200px] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
                      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-[#fbf8f0] to-background px-4 py-3 sm:px-5">
                        <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-deep">FADILAB · Material de estudio</p><h3 className="text-base font-semibold">Proceso de joyería con impresión 3D</h3></div>
                        <button type="button" onClick={() => setTipoImagenApoyoAbierta(null)} className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-gold">Cerrar ×</button>
                      </header>
                      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-background p-3 sm:p-5">
                        <img src={imagenProceso3DUrl} alt="Proceso de joyería con impresión 3D" className="block h-auto max-h-[78dvh] w-auto max-w-full rounded-lg object-contain" />
                      </div>
                    </div>
                  </div>}
                </section>}
                {lecturaAbierta?.numero === 1 && paginaLectura === 2 && !interfazInteractivaAbierta && <section className="mt-7 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-background to-background p-5 sm:p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-deep">Actividad guiada · FADILAB</p>
                  <h4 className="mt-1 text-lg font-semibold">Conoce cada parte de la interfaz</h4>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Abre el recorrido interactivo para identificar los componentes directamente sobre la captura de MatrixGold 3.1. Explora los 14 marcadores numerados para conocer dónde se encuentra cada componente y para qué sirve.</p>
                  <button type="button" disabled={!imagenInterfazUrl} onClick={() => setInterfazInteractivaAbierta(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-black shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50">Explorar interfaz interactiva <ChevronRight className="size-4"/></button>
                  {!imagenInterfazUrl && <p className="mt-2 text-xs text-muted-foreground">{imagenInterfazError || "Buscando la imagen en la Biblioteca del curso…"}</p>}
                </section>}
                {lecturaAbierta?.numero === 1 && paginaLectura === 2 && interfazInteractivaAbierta && <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-black/75 p-1 sm:p-2" role="dialog" aria-modal="true" aria-label="Exploración interactiva de MatrixGold 3.1">
                  <div className="flex h-[calc(100dvh-0.5rem)] w-[99vw] max-w-[1700px] min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
                    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-[#fbf8f0] to-background px-3 py-2 sm:px-5">
                      <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-deep">FADILAB · Recorrido de aprendizaje</p><h3 className="text-base font-semibold sm:text-lg">Explora la interfaz de MatrixGold 3.1</h3></div>
                      <button type="button" onClick={() => setInterfazInteractivaAbierta(false)} className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-gold">Cerrar ×</button>
                    </header>
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-1.5 sm:p-2">
                      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
                      
                      {imagenInterfazUrl && <figure className="flex max-h-full w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-[#171719] p-1">
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
                {paginaLectura === seccionesLecturaActivas.length-1 && <div className="rounded-xl border border-gold/30 bg-gold/5 p-4"><p className="text-sm font-semibold">Has llegado al final de la lectura</p><p className="mt-1 text-sm text-muted-foreground">En el aula real, el alumno podrá finalizar y marcar la sesión como completada.</p></div>}
              </main>
              <footer className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background px-4 py-3 sm:px-6 sm:py-4">
                <button type="button" disabled={paginaLectura===0} onClick={() => setPaginaLectura(p => Math.max(0,p-1))} className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2.5 text-sm disabled:opacity-40"><ChevronLeft className="size-4"/> Anterior</button>
                {paginaLectura < seccionesLecturaActivas.length-1 ? <button type="button" onClick={() => setPaginaLectura(p => Math.min(seccionesLecturaActivas.length-1,p+1))} className="inline-flex items-center gap-1 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black">Siguiente <ChevronRight className="size-4"/></button> : <button type="button" onClick={() => { setLecturasSimuladas(prev => new Set(prev).add(lecturaAbierta.id)); setLecturaAbierta(null); setLecturaModoVistaPrevia(false); }} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black"><CheckCircle2 className="size-4"/> Simular lectura completada</button>}
              </footer>
            </div>
          </div>}
          {seccionDocente === "cursos" && <div id="doc-cursos" className="grid scroll-mt-24 gap-5">
            <Panel titulo="Nuevo curso" colapsable defaultOpen={false}>
              <form onSubmit={(e) => void crearCurso(e)} className="space-y-3 p-5">
                <label className="block text-xs font-medium">Nombre del curso<input value={titulo} onChange={e => setTitulo(e.target.value)} required maxLength={140} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" /></label>
                <label className="block text-xs font-medium">Descripción<textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" /></label>
                <label className="block text-xs font-medium">Duración total (horas)<input type="number" min="0" step="0.5" value={duracion} onChange={e => setDuracion(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" /></label>
                <button disabled={ocupado} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"><Plus className="size-4" /> Crear curso</button>
              </form>
            </Panel>
            <Panel titulo="Mis cursos · FADILAB" colapsable defaultOpen={true}>
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
          </div>}
          {!cursoActivoId && seccionDocente !== "cursos" && <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center"><BookOpen className="mx-auto size-8 text-muted-foreground"/><p className="mt-3 text-sm font-semibold">Primero selecciona un curso</p><p className="mt-1 text-xs text-muted-foreground">En el espacio «Cursos» puedes crear un curso o elegir uno existente para administrar sus alumnos, sesiones, materiales y evaluaciones.</p><button type="button" onClick={() => setSeccionDocente("cursos")} className="mt-4 rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-black">Ir a cursos</button></div>}
          {seccionDocente === "alumnos" && cursoActivoId && <div id="doc-alumnos-sesiones" className="grid scroll-mt-24 gap-5 lg:grid-cols-2">
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
            <Panel titulo={`Programa de sesiones · ${(sesionesQuery.data ?? []).length}`}>
              <form onSubmit={(e) => void crearSesion(e)} className="space-y-3 p-5">
                <div className="grid grid-cols-[90px_1fr] gap-2"><label className="text-xs font-medium">N.º<input type="number" min="1" value={numeroSesion} onChange={e => setNumeroSesion(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" /></label><label className="text-xs font-medium">Título<input required value={tituloSesion} onChange={e => setTituloSesion(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" placeholder="Interfaz y navegación" /></label></div>
                <label className="block text-xs font-medium">Descripción<textarea value={detalleSesion} onChange={e => setDetalleSesion(e.target.value)} rows={2} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" /></label>
                <button disabled={ocupado} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold"><CalendarDays className="size-4" /> Añadir sesión</button>
              </form>
              <div className="border-t border-border px-5">{sesionesQuery.isLoading ? <p className="py-4 text-xs text-muted-foreground">Cargando sesiones…</p> : (sesionesQuery.data ?? []).length === 0 ? <div className="py-6 text-center"><CalendarDays className="mx-auto size-7 text-muted-foreground"/><p className="mt-2 text-sm font-medium">Todavía no hay sesiones</p><p className="mt-1 text-xs text-muted-foreground">Crea la primera sesión con el formulario superior.</p></div> : (sesionesQuery.data ?? []).map(s => <div key={s.id} className="my-3 rounded-xl border border-border bg-background px-3 py-3">
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
                    <div className="min-w-0"><p className="text-sm font-medium">{s.numero}. {s.titulo}</p><p className="text-xs text-muted-foreground">{s.publicada ? "Publicada · visible para alumnos" : "Borrador · solo visible para el docente"}</p>{s.descripcion && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.descripcion}</p>}</div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button type="button" disabled={ocupado} onClick={() => iniciarEdicionSesion(s)} aria-label={`Editar sesión ${s.numero}`} title="Editar sesión" className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"><Pencil className="size-4" /></button>
                      <button type="button" disabled={ocupado || cargandoLecturaDocente} onClick={() => void abrirEditorLectura(s)} className="rounded-lg border border-gold/40 px-3 py-1.5 text-xs disabled:opacity-50">{cargandoLecturaDocente ? "Cargando…" : "Editar lectura"}</button>
                      <button type="button" disabled={ocupado} onClick={() => void cambiarBloqueoSesion(s)} title={s.bloqueada ? "Desbloquear sesión para alumnos" : "Bloquear apertura para alumnos"} aria-label={s.bloqueada ? `Desbloquear sesión ${s.numero}` : `Bloquear sesión ${s.numero}`} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs disabled:opacity-50 ${s.bloqueada ? "border-amber-300 bg-amber-50 text-amber-800" : "border-emerald-300 bg-emerald-50 text-emerald-800"}`}><span aria-hidden="true">{s.bloqueada ? "🔒" : "🔓"}</span>{s.bloqueada ? "Bloqueada" : "Abierta"}</button>
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
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{lecturaPublicada ? "Estado: publicada" : "Estado: borrador"}</span><div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setLecturaEditando(null)} className="rounded-lg border border-border px-4 py-2 text-sm">Cerrar</button><button type="button" disabled={ocupado} onClick={() => void guardarContenidoLectura(false)} className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50">Guardar borrador</button>{lecturaPublicada && <button type="button" disabled={ocupado} onClick={() => void retirarPublicacionLectura()} className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 disabled:opacity-50">Retirar</button>}<button type="button" disabled={ocupado} onClick={() => void guardarContenidoLectura(true)} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">{lecturaPublicada ? "Guardar y mantener publicada" : "Guardar y publicar"}</button></div></div>
                </div>
              </div>
            </div>}
            </div>}
          {seccionDocente === "materiales" && cursoActivoId && <div id="doc-materiales" className="scroll-mt-24"><Panel titulo="Biblioteca del curso">
              <form onSubmit={(e) => void subirMaterial(e)} className="space-y-3 p-5">
                <label className="block text-xs font-medium">Título del material<input required value={tituloMaterial} onChange={e => setTituloMaterial(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" placeholder="Ej. Guía de navegación en Rhino" /></label>
                <label className="block text-xs font-medium">¿A qué parte del curso pertenece?
                  <select value={sesionMaterialId} onChange={e => setSesionMaterialId(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                    <option value="">Material general del curso</option>
                    {(sesionesQuery.data ?? []).map(s => <option key={s.id} value={s.id}>Sesión {s.numero} · {s.titulo}</option>)}
                  </select>
                </label>
                <div className="space-y-2">
                  <span className="block text-xs font-medium">Archivo (PDF, documentos, imágenes, ZIP o STL)</span>
                  <label htmlFor="aula-material-file" onDragEnter={e=>{e.preventDefault();setArchivoArrastrando(true);}} onDragOver={e=>{e.preventDefault();setArchivoArrastrando(true);}} onDragLeave={e=>{e.preventDefault();if(!e.currentTarget.contains(e.relatedTarget as Node|null))setArchivoArrastrando(false);}} onDrop={e=>{e.preventDefault();setArchivoArrastrando(false);const recibido=e.dataTransfer.files?.[0];if(recibido)setArchivo(recibido);}} className={`flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition ${archivoArrastrando ? "border-gold bg-gold/10" : "border-border bg-muted/20 hover:border-gold/60 hover:bg-gold/5"}`}>
                    <Upload className={`mb-2 size-6 ${archivoArrastrando ? "text-gold-deep" : "text-muted-foreground"}`}/>
                    <span className="text-sm font-semibold text-foreground">{archivoArrastrando ? "Suelta el archivo aquí" : "Arrastra tu archivo aquí"}</span>
                    <span className="mt-1 text-xs text-muted-foreground">o haz clic para buscarlo en tu equipo</span>
                    <span className="mt-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium">Seleccionar archivo</span>
                    <input id="aula-material-file" type="file" required onChange={(e: ChangeEvent<HTMLInputElement>)=>setArchivo(e.target.files?.[0]??null)} className="sr-only"/>
                  </label>
                  {archivo ? <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><span className="min-w-0 break-all font-medium">{archivo.name}</span><span className="shrink-0">{(archivo.size/1024/1024).toFixed(2)} MB</span><button type="button" onClick={()=>{setArchivo(null);const input=document.getElementById("aula-material-file") as HTMLInputElement|null;if(input)input.value="";}} className="rounded-md border border-emerald-300 px-2 py-1">Quitar</button></div> : <p className="text-[11px] text-muted-foreground">Máximo 50 MB por archivo.</p>}
                </div>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={publicarMaterial} onChange={e => setPublicarMaterial(e.target.checked)} /> Publicar inmediatamente para los alumnos</label>
                <button disabled={ocupado || !archivo} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"><Upload className="size-4" /> Subir material</button>
                <p className="text-xs text-muted-foreground">Almacenamiento privado · máximo 50 MB por archivo. Puedes editar, retirar, reemplazar o eliminar cada material posteriormente.</p>
              </form>
              <div className="space-y-4 border-t border-border p-5">
                <div><p className="text-sm font-semibold">Biblioteca del curso</p><p className="mt-1 text-xs text-muted-foreground">Administra los archivos publicados y los borradores. Los cambios se reflejan en el aula del alumno.</p></div>
                {materialesDocenteQuery.isLoading ? <p className="text-xs text-muted-foreground">Cargando biblioteca…</p> : (materialesDocenteQuery.data ?? []).length === 0 ? <p className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">Todavía no hay materiales. Los archivos que subas aparecerán aquí.</p> : <>
                  {[...((materialesDocenteQuery.data ?? []).some(m => !m.sesion_id) ? [{id:"general",label:"Material general del curso",items:(materialesDocenteQuery.data ?? []).filter(m => !m.sesion_id)}] : []),...(sesionesQuery.data ?? []).map(s => ({id:s.id,label:"Sesión " + s.numero + " · " + s.titulo,items:(materialesDocenteQuery.data ?? []).filter(m => m.sesion_id === s.id)}))].map(grupo => <details key={grupo.id} className="group/session overflow-hidden rounded-xl border border-border/70"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-muted/20 px-4 py-3 transition hover:bg-muted/40 [&::-webkit-details-marker]:hidden"><span className="min-w-0 text-xs font-semibold text-foreground">{grupo.label}<span className="ml-2 font-normal text-muted-foreground">· {grupo.items.length} archivo{grupo.items.length===1?"":"s"}</span></span><ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open/session:rotate-180"/></summary><div className="space-y-2 border-t border-border p-3">{grupo.items.length===0 ? <p className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">Todavía no hay archivos asignados a esta sesión.</p> : grupo.items.map(m => <div key={m.id} className="rounded-xl border border-border p-3">
                    {materialEditandoId === m.id ? <form onSubmit={e => void guardarEdicionMaterial(e,m)} className="space-y-2">
                      <label className="block text-xs font-medium">Título<input required value={tituloMaterialEditado} onChange={e => setTituloMaterialEditado(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"/></label>
                      <label className="block text-xs font-medium">Reemplazar archivo (opcional)<input type="file" onChange={e => setArchivoMaterialReemplazo(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-xs"/></label>
                      <label className="block text-xs font-medium">Sesión<select value={sesionMaterialEditada} onChange={e => setSesionMaterialEditada(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="">Material general del curso</option>{(sesionesQuery.data ?? []).map(s => <option key={s.id} value={s.id}>Sesión {s.numero} · {s.titulo}</option>)}</select></label>
                      <div className="flex gap-2"><button disabled={ocupado} className="rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-black">Guardar cambios</button><button type="button" onClick={() => setMaterialEditandoId("")} className="rounded-lg border border-border px-3 py-2 text-xs">Cancelar</button></div>
                    </form> : <>
                      <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="text-sm font-semibold">{m.titulo}</p><p className="mt-1 break-all text-xs text-muted-foreground">{m.nombre_archivo} · {(m.tamano_bytes/1024/1024).toFixed(1)} MB</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${m.publicado ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{m.publicado ? "Publicado" : "Borrador"}</span></div>
                      <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void descargarMaterial(m)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs">Descargar</button><button type="button" onClick={() => {setMaterialEditandoId(m.id);setTituloMaterialEditado(m.titulo);setSesionMaterialEditada(m.sesion_id ?? "");}} className="rounded-lg border border-border px-2.5 py-1.5 text-xs">Editar</button><button type="button" disabled={ocupado} onClick={() => void cambiarPublicacionMaterial(m)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs">{m.publicado ? "Retirar publicación" : "Publicar"}</button><button type="button" disabled={ocupado} onClick={() => void eliminarMaterial(m)} className="rounded-lg border border-destructive/30 px-2.5 py-1.5 text-xs text-destructive">Eliminar</button></div>
                    </>}
                  </div>)}</div></details>)}
                </>}
              </div>
            </Panel></div>}
          {seccionDocente === "evaluaciones" && cursoActivoId && <div id="doc-evaluaciones" className="scroll-mt-24"><Panel titulo="Evaluaciones y cuestionarios" colapsable defaultOpen={false}>
            <div className="space-y-3 p-5">
              <div className="space-y-2"><p className="text-sm font-semibold">Evaluaciones del curso</p>
                {(examenesQuery.data ?? []).map(x => <div key={x.id} className="space-y-3 rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button type="button" onClick={() => { setExamenSeleccionado(x.id); setExamenEditandoId(""); }} className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-medium">{x.titulo}</span><span className="text-xs text-muted-foreground">{x.duracion_minutos ?? "Sin límite"} min · {x.intentos_permitidos} intento(s)</span></button>
                    <span className={x.publicado ? "rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700" : "rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground"}>{x.publicado ? "Publicado · visible para alumnos" : "Borrador · no visible"}</span>
                  </div>
                  <button type="button" onClick={()=>{setExamenSeleccionado(x.id);setPreguntasAbiertasExamenId(v=>v===x.id?"":x.id);}} className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs font-medium">
                    <span>Preguntas del examen ({x.id === examenActivoId ? (preguntasQuery.data ?? []).length : "ver"})</span><span>{preguntasAbiertasExamenId === x.id ? "Ocultar −" : "Ver preguntas +"}</span>
                  </button>
                  {preguntasAbiertasExamenId === x.id && <div className="space-y-2 rounded-lg bg-muted/20 p-3">
                    {(preguntasQuery.data ?? []).length === 0 ? <p className="text-xs text-muted-foreground">Este examen todavía no tiene preguntas cargadas.</p> : (preguntasQuery.data ?? []).map((p,idx)=><div key={p.id} className="rounded-lg border border-border bg-background p-3"><p className="text-[11px] text-muted-foreground">Pregunta {idx+1} · {p.tipo.replaceAll("_"," ")} · {p.puntaje} pts</p><p className="mt-1 text-sm font-medium">{p.enunciado}</p></div>)}
                  </div>}
                  {examenEditandoId === x.id ? <div className="grid gap-2 rounded-lg bg-muted/30 p-3">
                    <label className="text-xs font-medium">Título<input value={tituloExamenEditado} onChange={e=>setTituloExamenEditado(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"/></label>
                    <label className="text-xs font-medium">Instrucciones<textarea value={instruccionesExamenEditadas} onChange={e=>setInstruccionesExamenEditadas(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"/></label>
                    <div className="grid grid-cols-2 gap-2"><label className="text-xs font-medium">Duración (min)<input type="number" min="1" value={duracionExamenEditada} onChange={e=>setDuracionExamenEditada(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"/></label><label className="text-xs font-medium">Intentos permitidos<input type="number" min="1" max="10" value={intentosExamenEditados} onChange={e=>setIntentosExamenEditados(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"/></label></div>
                    <div className="rounded-lg border border-gold/30 bg-gold/5 p-3"><p className="text-xs font-semibold">Programación del examen</p><p className="mt-1 text-[11px] text-muted-foreground">Hora local de Perú. Déjalos vacíos para no limitar el calendario.</p><div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"><label className="text-xs font-medium">Habilitar desde<input type="datetime-local" value={disponibleDesdeEditado} onChange={e=>setDisponibleDesdeEditado(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"/></label><label className="text-xs font-medium">Cerrar el<input type="datetime-local" value={disponibleHastaEditado} onChange={e=>setDisponibleHastaEditado(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"/></label></div></div>
                    <div className="flex flex-wrap gap-2"><button type="button" disabled={ocupado || x.publicado} onClick={()=>void guardarEdicionExamen(x)} className="rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-black disabled:opacity-40">Guardar cambios</button><button type="button" onClick={()=>setExamenEditandoId("")} className="rounded-lg border border-border px-3 py-2 text-xs">Cancelar</button></div>
                  </div> : <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={()=>iniciarEdicionExamen(x)} disabled={x.publicado} className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-40">Modificar</button>
                    <button type="button" disabled={ocupado} onClick={()=>void publicarExamen(x)} className="rounded-lg border border-border px-3 py-1.5 text-xs">{x.publicado ? "Retirar publicación" : "Publicar / Activar"}</button>
                    <button type="button" onClick={()=>setExamenEliminarPendiente(x)} className="rounded-lg border border-destructive/30 px-3 py-1.5 text-xs text-destructive">Eliminar</button>
                  </div>}
                  {examenEliminarPendiente?.id === x.id && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3"><p className="text-xs">¿Eliminar «{x.titulo}» y sus preguntas? Esta acción no se puede deshacer. Si ya tiene intentos registrados, se conservará el historial y no se permitirá eliminarla.</p><div className="mt-2 flex gap-2"><button type="button" disabled={ocupado} onClick={()=>void eliminarExamen(x)} className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-white">Confirmar eliminación</button><button type="button" onClick={()=>setExamenEliminarPendiente(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancelar</button></div></div>}
                </div>)}
                {examenesQuery.data?.length === 0 && <p className="text-xs text-muted-foreground">Aún no hay evaluaciones.</p>}
              </div>

            </div>
          </Panel></div>}
          {seccionDocente === "evaluaciones" && cursoActivoId && <div id="doc-entregas" className="scroll-mt-24"><Panel titulo="Entregas y revisión docente">
            <div className="space-y-3 p-5">
              {(examenesQuery.data ?? []).map(examenSeguimiento => {
                const inscritos = (inscripcionesQuery.data ?? []).filter((i: any) => ["activo", "finalizado"].includes(i.estado));
                const intentosExamen = (intentosDocenteQuery.data ?? []).filter(i => i.examen_id === examenSeguimiento.id && i.estado !== "en_curso");
                const usuariosConEntrega = new Set(intentosExamen.map(i => i.alumno_user_id));
                const entregaron = inscritos.filter((i: any) => i.alumno_user_id && usuariosConEntrega.has(i.alumno_user_id)).length;
                const pendientes = Math.max(0, inscritos.length - entregaron);
                return <div key={examenSeguimiento.id} className="rounded-xl border border-border p-3"><p className="text-sm font-semibold">{examenSeguimiento.titulo}</p><div className="mt-2 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-muted/40 p-2"><p className="text-xl font-semibold tabular-nums">{inscritos.length}</p><p className="text-[10px] text-muted-foreground">Inscritos</p></div><div className="rounded-lg bg-emerald-50 p-2"><p className="text-xl font-semibold tabular-nums text-emerald-700">{entregaron}</p><p className="text-[10px] text-emerald-700">Entregaron</p></div><div className="rounded-lg bg-amber-50 p-2"><p className="text-xl font-semibold tabular-nums text-amber-700">{pendientes}</p><p className="text-[10px] text-amber-700">Pendientes</p></div></div><div className="mt-3 space-y-1.5">{inscritos.map((alumno: any) => {const entregado = Boolean(alumno.alumno_user_id && usuariosConEntrega.has(alumno.alumno_user_id));const intentosAlumno = intentosExamen.filter(i => i.alumno_user_id === alumno.alumno_user_id);return <div key={alumno.id} className="flex items-center justify-between gap-2 border-t border-border/70 pt-2 text-xs"><span className="min-w-0 truncate">{alumno.nombre_alumno || alumno.email_alumno}</span><span className={entregado ? "shrink-0 rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700" : "shrink-0 rounded-full bg-amber-50 px-2 py-1 font-medium text-amber-700"}>{entregado ? "Entregado · " + intentosAlumno.length + " intento(s)" : "Pendiente"}</span></div>;})}</div></div>;
              })}
              {(intentosDocenteQuery.data ?? []).filter(intento => intento.estado !== "en_curso").length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay evaluaciones entregadas.</p> : (intentosDocenteQuery.data ?? []).filter(intento => intento.estado !== "en_curso").map(intento => {
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
          </Panel></div>}
          {cursosQuery.error && <p className="rounded-xl border border-red-300 p-3 text-sm text-red-700">{cursosQuery.error.message}</p>}
        </>
      ) : (
        <>
          <section className="rounded-2xl border border-gold/20 bg-card p-5"><p className="text-sm font-semibold">Bienvenido al aula</p><p className="mt-1 text-xs text-muted-foreground">Aquí aparecen únicamente los cursos en los que FADILAB te ha inscrito. Los archivos permanecen privados.</p></section>
          {lecturaAbierta && <div className={`fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black/60 p-2 sm:p-3 ${lecturaModoVistaPrevia ? "left-0 lg:left-64 xl:left-72" : ""}`} role="dialog" aria-modal="true" aria-label="Lectura de la sesión">
            <div className="mx-auto flex h-[calc(100dvh-1rem)] max-h-[900px] min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
              <header className="shrink-0 border-b border-border bg-gradient-to-r from-[#fbf8f0] to-background px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-deep">FADILAB · Aula de formación · Lectura guiada</p><h2 className="mt-1 text-lg font-semibold">{lecturaAbierta.numero}. {lecturaAbierta.titulo}</h2><p className="mt-1 text-xs text-muted-foreground">{lecturaModoVistaPrevia ? "Modo de prueba docente · el avance no se guarda en la cuenta de ningún alumno." : "Al abrir esta lectura se registra como leída. Avanza por los apartados y márcala como completada al finalizar."}</p></div><button type="button" onClick={() => { setLecturaAbierta(null); setLecturaModoVistaPrevia(false); }} className="rounded-lg border border-border px-3 py-2 text-xs">Cerrar</button></div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gold transition-all" style={{width: (((paginaLectura+1)/seccionesLecturaActivas.length)*100)+"%"}}/></div>
                <p className="mt-2 text-xs text-muted-foreground">Apartado {paginaLectura+1} de {seccionesLecturaActivas.length}</p>
              </header>
              <nav aria-label="Índice de la lectura" className="shrink-0 border-b border-border bg-background px-4 py-3 sm:px-6 sm:py-3">
                <div className="mb-2 flex items-center justify-between gap-3"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Índice de contenidos</p><p className="text-[11px] text-muted-foreground">Selecciona un apartado para navegar</p></div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {seccionesLecturaActivas.map((seccion, indice) => <button key={indice} type="button" onClick={() => setPaginaLectura(indice)} aria-current={paginaLectura===indice ? "step" : undefined} className={`flex min-w-10 shrink-0 items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition ${paginaLectura===indice ? "border-gold bg-gold text-black shadow-sm" : "border-border bg-card text-muted-foreground hover:border-gold/50 hover:text-foreground"}`} title={seccion.titulo}>{String(indice+1).padStart(2,"0")}</button>)}
                </div>
                <p className="mt-2 truncate text-xs font-medium text-foreground">{seccionesLecturaActivas[paginaLectura]?.titulo ?? "Lectura"}</p>
              </nav>
              <main className="min-h-0 flex-1 overflow-y-auto bg-card/40 px-5 py-5 sm:px-8 sm:py-6 lg:px-10">
                <h3 className="mb-5 max-w-4xl font-display text-2xl leading-tight sm:text-3xl">{seccionesLecturaActivas[paginaLectura]?.titulo ?? "Lectura"}</h3>
                {(seccionesLecturaActivas[paginaLectura]?.bloques ?? []).map((bloque,idx) => {
                  if (lecturaAbierta?.numero === 1 && paginaLectura === 4 && idx >= 6) return null;
                  return <div key={idx}><p className="mb-4 max-w-4xl whitespace-pre-line text-[15px] leading-7 text-foreground/90">{bloque}</p></div>;
                })}
                {renderLaboratorioCoordenadas()}
                {renderLaboratorioOsnap()}

                {renderLaboratorioGeometria()}
                {renderSelectorVistasPlano()}
                {lecturaAbierta?.numero === 1 && paginaLectura === 4 && <section className="mt-5 max-w-4xl rounded-xl border border-gold/30 bg-gradient-to-br from-gold/10 via-background to-background p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-deep">Recurso interactivo</p>
                  <h4 className="mt-1 text-base font-semibold">Comandos de navegación</h4>
                  <p className="mt-2 text-sm text-muted-foreground">Abre la ficha para explorar los comandos y consultar la función de cada uno.</p>
                  <button type="button" onClick={() => { setComandoNavegacionActivo("Zoom"); setComandosNavegacionAbiertos(true); }} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-black shadow-sm transition hover:brightness-95">Ver comandos de navegación <ChevronRight className="size-4"/></button>
                  {comandosNavegacionAbiertos && <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/75 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Comandos de navegación de Rhino 7">
                    <div className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
                      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-[#fbf8f0] to-background px-5 py-4">
                        <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-deep">FADILAB · Guía interactiva</p><h3 className="text-lg font-semibold">Comandos de navegación · Rhino 7</h3><p className="mt-1 text-xs text-muted-foreground">Selecciona un comando para consultar su función.</p></div>
                        <button type="button" onClick={() => setComandosNavegacionAbiertos(false)} className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-gold">Cerrar ×</button>
                      </header>
                      <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
                        <div className="overflow-hidden rounded-xl border border-border">
                          <table className="w-full border-collapse text-left text-sm"><thead><tr className="bg-muted/40"><th className="border-b border-border px-4 py-3">Comando</th><th className="border-b border-border px-4 py-3">Función</th></tr></thead><tbody>
                            {[
                              {comando:"Zoom",funcion:"Control de acercamiento"},
                              {comando:"ZE",funcion:"Zoom Extents: encuadrar todos los objetos"},
                              {comando:"ZEA",funcion:"Zoom All Extents: encuadrar todas las vistas"},
                              {comando:"ZS",funcion:"Zoom Selected: encuadrar objetos seleccionados"},
                              {comando:"Pan",funcion:"Desplazamiento de la vista"},
                              {comando:"UndoView",funcion:"Recuperar la vista anterior"}
                            ].map(item=><tr key={item.comando}><td className="border-b border-border p-0"><button type="button" onClick={()=>setComandoNavegacionActivo(item.comando)} aria-pressed={comandoNavegacionActivo===item.comando} className={`w-full px-4 py-3 text-left font-semibold transition hover:bg-gold/10 ${comandoNavegacionActivo===item.comando?"bg-gold/15 text-gold-deep":"bg-background"}`}>{item.comando}</button></td><td className="border-b border-border px-4 py-3">{item.funcion}</td></tr>)}
                          </tbody></table>
                        </div>
                        <div className="mt-4 rounded-xl border border-gold/30 bg-gold/10 p-4" aria-live="polite">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gold-deep">Comando seleccionado</p>
                          <p className="mt-1 text-lg font-semibold">{comandoNavegacionActivo}</p>
                          <p className="mt-1 text-sm text-foreground/80">{({Zoom:"Control de acercamiento",ZE:"Zoom Extents: encuadrar todos los objetos",ZEA:"Zoom All Extents: encuadrar todas las vistas",ZS:"Zoom Selected: encuadrar objetos seleccionados",Pan:"Desplazamiento de la vista",UndoView:"Recuperar la vista anterior"} as Record<string,string>)[comandoNavegacionActivo]}</p>
                        </div>
                      </div>
                    </div>
                  </div>}
                </section>}
                {lecturaAbierta?.numero === 1 && paginaLectura === 1 && <section className="mt-7 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-background to-background p-5 sm:p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-deep">Material visual de apoyo</p>
                  <h4 className="mt-1 text-lg font-semibold">Rhinoceros 7</h4>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Consulta la imagen de referencia general del programa.</p>
                  {imagenRhinoUrl ? <button type="button" onClick={() => setTipoImagenApoyoAbierta(tipoImagenApoyoAbierta === "rhinoceros" ? null : "rhinoceros")} aria-expanded={tipoImagenApoyoAbierta === "rhinoceros"} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-black shadow-sm transition hover:brightness-95">Ver RHINOCEROS <ChevronRight className="size-4"/></button> : <p className="mt-3 text-xs text-muted-foreground">{imagenRhinoError || "Buscando RHINOCEROS en la Biblioteca del curso…"}</p>}
                  {tipoImagenApoyoAbierta && <div className="fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-black/75 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Imagen de referencia de Rhinoceros">
                    <div className="flex max-h-[96dvh] w-full max-w-[1200px] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
                      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-[#fbf8f0] to-background px-4 py-3 sm:px-5">
                        <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-deep">FADILAB · Material de estudio</p><h3 className="text-base font-semibold">{tipoImagenApoyoAbierta === "rhinoceros" ? "Rhinoceros 7" : tipoImagenApoyoAbierta === "vistas" ? "Vistas de trabajo" : "Ejes de coordenadas"}</h3></div>
                        <button type="button" onClick={() => setTipoImagenApoyoAbierta(null)} className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-gold">Cerrar ×</button>
                      </header>
                      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-background p-3 sm:p-5">
                        <img src={tipoImagenApoyoAbierta === "rhinoceros" ? imagenRhinoUrl : tipoImagenApoyoAbierta === "vistas" ? imagenesVistasUrl : imagenesEjesUrl} alt={tipoImagenApoyoAbierta === "rhinoceros" ? "Referencia de Rhinoceros 7" : tipoImagenApoyoAbierta === "vistas" ? "Vistas de trabajo de Rhinoceros" : "Ejes de coordenadas de Rhinoceros"} className="block h-auto max-h-[78dvh] w-auto max-w-full rounded-lg object-contain" />
                      </div>
                    </div>
                  </div>}
                </section>}
                {lecturaAbierta?.numero === 1 && paginaLectura === 3 && <section className="mt-7 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-background to-background p-5 sm:p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-deep">Material visual de apoyo</p>
                  <h4 className="mt-1 text-lg font-semibold">Vistas y ejes de Rhinoceros 7</h4>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Identifica las vistas de trabajo y la orientación espacial mediante los ejes de coordenadas.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {imagenesVistasUrl && <button type="button" onClick={() => setTipoImagenApoyoAbierta(tipoImagenApoyoAbierta === "vistas" ? null : "vistas")} aria-expanded={tipoImagenApoyoAbierta === "vistas"} className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-black shadow-sm transition hover:brightness-95">Ver VISTAS <ChevronRight className="size-4"/></button>}
                    {imagenesEjesUrl && <button type="button" onClick={() => setTipoImagenApoyoAbierta(tipoImagenApoyoAbierta === "ejes" ? null : "ejes")} aria-expanded={tipoImagenApoyoAbierta === "ejes"} className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-black shadow-sm transition hover:brightness-95">Ver EJES <ChevronRight className="size-4"/></button>}
                  </div>
                  {!imagenesVistasUrl && !imagenesEjesUrl && <p className="mt-3 text-xs text-muted-foreground">{errorImagenesApoyo || "Buscando VISTAS y EJES en la Biblioteca del curso…"}</p>}
                  {(tipoImagenApoyoAbierta === "vistas" || tipoImagenApoyoAbierta === "ejes") && <div className="fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-black/75 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Imagen de referencia de Rhinoceros">
                    <div className="flex max-h-[96dvh] w-full max-w-[1200px] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
                      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-[#fbf8f0] to-background px-4 py-3 sm:px-5">
                        <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-deep">FADILAB · Material de estudio</p><h3 className="text-base font-semibold">{tipoImagenApoyoAbierta === "vistas" ? "Vistas de trabajo" : "Ejes de coordenadas"}</h3></div>
                        <button type="button" onClick={() => setTipoImagenApoyoAbierta(null)} className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-gold">Cerrar ×</button>
                      </header>
                      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-background p-3 sm:p-5">
                        <img src={tipoImagenApoyoAbierta === "vistas" ? imagenesVistasUrl : imagenesEjesUrl} alt={tipoImagenApoyoAbierta === "vistas" ? "Vistas de trabajo de Rhinoceros" : "Ejes de coordenadas de Rhinoceros"} className="block h-auto max-h-[78dvh] w-auto max-w-full rounded-lg object-contain" />
                      </div>
                    </div>
                  </div>}
                </section>}
                {lecturaAbierta?.numero === 1 && paginaLectura === 2 && !interfazInteractivaAbierta && <section className="mt-7 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-background to-background p-5 sm:p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-deep">Actividad guiada · FADILAB</p>
                  <h4 className="mt-1 text-lg font-semibold">Conoce cada parte de la interfaz</h4>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Abre el recorrido interactivo para identificar los componentes directamente sobre la captura de MatrixGold 3.1. Explora los 14 marcadores numerados para conocer dónde se encuentra cada componente y para qué sirve.</p>
                  <button type="button" disabled={!imagenInterfazUrl} onClick={() => setInterfazInteractivaAbierta(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-black shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50">Explorar interfaz interactiva <ChevronRight className="size-4"/></button>
                  {!imagenInterfazUrl && <p className="mt-2 text-xs text-muted-foreground">{imagenInterfazError || "Buscando la imagen en la Biblioteca del curso…"}</p>}
                </section>}
                {lecturaAbierta?.numero === 1 && paginaLectura === 2 && interfazInteractivaAbierta && <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-black/75 p-1 sm:p-2" role="dialog" aria-modal="true" aria-label="Exploración interactiva de MatrixGold 3.1">
                  <div className="flex h-[calc(100dvh-0.5rem)] w-[99vw] max-w-[1700px] min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
                    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-[#fbf8f0] to-background px-3 py-2 sm:px-5">
                      <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-deep">FADILAB · Recorrido de aprendizaje</p><h3 className="text-base font-semibold sm:text-lg">Explora la interfaz de MatrixGold 3.1</h3></div>
                      <button type="button" onClick={() => setInterfazInteractivaAbierta(false)} className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-gold">Cerrar ×</button>
                    </header>
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-1.5 sm:p-2">
                      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
                      
                      {imagenInterfazUrl && <figure className="flex max-h-full w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-[#171719] p-1">
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
                {paginaLectura === seccionesLecturaActivas.length-1 && <div className="rounded-xl border border-gold/30 bg-gold/5 p-4"><p className="text-sm font-semibold">Has llegado al final de la lectura</p><p className="mt-1 text-sm text-muted-foreground">{lecturaModoVistaPrevia ? "En la experiencia del alumno, aquí podrá finalizar y marcar la sesión como completada." : "La lectura está registrada como leída. Puedes marcar la sesión como completada."}</p></div>}
              </main>
              <footer className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background px-4 py-3 sm:px-6 sm:py-4">
                <button type="button" disabled={paginaLectura===0} onClick={() => setPaginaLectura(p => Math.max(0,p-1))} className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2.5 text-sm disabled:opacity-40"><ChevronLeft className="size-4"/> Anterior</button>
                {paginaLectura < seccionesLecturaActivas.length-1 ? <button type="button" onClick={() => setPaginaLectura(p => Math.min(Math.max(0,seccionesLecturaActivas.length-1),p+1))} className="inline-flex items-center gap-1 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black">Siguiente <ChevronRight className="size-4"/></button> : lecturaModoVistaPrevia ? <button type="button" onClick={() => { setLecturasSimuladas(prev => new Set(prev).add(lecturaAbierta.id)); setLecturaAbierta(null); setLecturaModoVistaPrevia(false); }} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black"><CheckCircle2 className="size-4"/> Simular lectura completada</button> : sesionesCompletadas.has(lecturaAbierta.id) ? <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="size-5"/> Sesión completada</span> : <button type="button" disabled={ocupado} onClick={() => void marcarLecturaCompletada(lecturaAbierta)} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"><CheckCircle2 className="size-4"/> Marcar como completada</button>}
              </footer>
            </div>
          </div>}
          {examenActivoAlumno ? <Panel titulo={examenActivoAlumno.titulo}><div className="space-y-4 p-5">
            {examenActivoAlumno.duracion_minutos && <div className="flex items-center justify-between rounded-lg border border-gold/30 bg-gold/5 px-3 py-2"><span className="text-xs font-medium text-muted-foreground">Tiempo restante</span><span className={`text-sm font-bold tabular-nums ${segundosRestantesExamen !== null && segundosRestantesExamen <= 60 ? "text-red-600" : "text-foreground"}`}>{segundosRestantesExamen === null ? "—" : `${Math.floor(segundosRestantesExamen/60).toString().padStart(2,"0")}:${(segundosRestantesExamen%60).toString().padStart(2,"0")}`}</span></div>}
            {segundosRestantesExamen === 0 && <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800">El tiempo terminó. Estamos enviando tus respuestas registradas.</p>}
            {examenActivoAlumno.instrucciones && <p className="text-sm text-muted-foreground">{examenActivoAlumno.instrucciones}</p>}
            {(() => { const pregunta = examenActivoAlumno.preguntas[preguntaActualAlumno]; const total = examenActivoAlumno.preguntas.length; const respondida = Boolean(pregunta && String(respuestasAlumno[pregunta.id] ?? "").trim()); return pregunta ? <>
              <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-gold-deep">Pregunta {preguntaActualAlumno+1} de {total}</p><p className="text-xs text-muted-foreground">{pregunta.puntaje} puntos</p></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gold transition-all" style={{width:`${((preguntaActualAlumno+1)/total)*100}%`}}/></div>
              <article className="min-h-[220px] rounded-xl border border-border p-5"><p className="text-base font-semibold">{pregunta.enunciado}</p>
                {pregunta.tipo === "practica" ? <textarea value={respuestasAlumno[pregunta.id] ?? ""} onChange={e=>setRespuestasAlumno(v=>({...v,[pregunta.id]:e.target.value}))} rows={5} className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Escribe tu respuesta…" /> : <div className="mt-4 space-y-3">{pregunta.opciones.map(o=><label key={o.value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm hover:bg-muted/40"><input type="radio" name={pregunta.id} value={o.value} checked={respuestasAlumno[pregunta.id]===o.value} onChange={e=>setRespuestasAlumno(v=>({...v,[pregunta.id]:e.target.value}))}/>{o.label}</label>)}</div>}
              </article>
              <div className="flex flex-wrap items-center justify-between gap-2">
                {preguntaActualAlumno < total-1 ? <button type="button" disabled={!respondida} onClick={()=>setPreguntaActualAlumno(v=>Math.min(total-1,v+1))} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">Siguiente</button> : <button type="button" disabled={(!respondida && segundosRestantesExamen !== 0) || enviandoExamen} onClick={()=>void enviarExamenAlumno()} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"><Send className="mr-1 inline size-4"/> Enviar evaluación</button>}
              </div>
              {!respondida && <p className="text-xs text-muted-foreground">Debes responder esta pregunta para continuar.</p>}
            </> : <p className="text-sm text-muted-foreground">Este examen no contiene preguntas.</p>; })()}
            <button type="button" onClick={async()=>{
              if (!examenActivoAlumno?.intento_id) return;
              const respuestas = examenActivoAlumno.preguntas
                .filter(p => Object.prototype.hasOwnProperty.call(respuestasAlumno, p.id))
                .map(p => ({ pregunta_id: p.id, respuesta: p.tipo === "verdadero_falso" ? respuestasAlumno[p.id] === "true" : (respuestasAlumno[p.id] ?? "") }));
              const { error } = await (supabase as any).rpc("guardar_respuestas_intento_formacion", {
                _intento_id: examenActivoAlumno.intento_id,
                _respuestas: respuestas,
                _pregunta_actual: preguntaActualAlumno
              });
              if (error) { setMensaje(error.message); return; }
              setExamenActivoAlumno(null);
              setMensaje("Intento guardado. Puedes volver a abrir la evaluación para continuar con el tiempo restante.");
            }} className="text-xs text-muted-foreground underline">Salir del examen</button>
          </div></Panel> : null}
          {alumnoQuery.isLoading ? <Panel titulo="Cargando tus cursos"><p className="p-5 text-sm text-muted-foreground">Vinculando tu inscripción y recuperando tus cursos…</p></Panel> : alumnoQuery.error ? <Panel titulo="No se pudo cargar el aula"><p className="p-5 text-sm text-red-700">{alumnoQuery.error.message}</p></Panel> : inscripcionesAlumno.length === 0 ? <Panel titulo="Aún no tienes cursos asignados"><p className="p-5 text-sm text-muted-foreground">Cuando FADILAB te inscriba con el correo de tu cuenta, el curso aparecerá aquí automáticamente.</p></Panel> : inscripcionesAlumno.map(i => <Panel key={i.id} titulo={i.formacion_cursos?.titulo ?? "Curso de formación"}>
            <div className="p-5"><p className="text-sm text-muted-foreground">{i.formacion_cursos?.descripcion || "Materiales y actividades de tu formación."}</p><div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground"><span>{i.formacion_cursos?.duracion_horas ?? 0} horas</span><span>Inscripción: {i.estado}</span></div>
              <h3 className="mb-2 mt-5 text-sm font-semibold">Sesiones</h3>
              {(sesionesAlumnoQuery.data ?? []).filter(item => item.curso_id === i.curso_id).length === 0 ? <p className="text-xs text-muted-foreground">Todavía no hay sesiones publicadas.</p> : (sesionesAlumnoQuery.data ?? []).filter(item => item.curso_id === i.curso_id).map(item => {
                const recursos = (materialesAlumnoQuery.data ?? []).filter(m => m.curso_id === i.curso_id && m.sesion_id === item.id);
                return <details key={item.id} className="group/session mt-3 overflow-hidden rounded-xl border border-border bg-card transition-colors open:border-[#d8c39b] open:bg-[#fffefa]"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-muted/30 [&::-webkit-details-marker]:hidden"><span className="flex min-w-0 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#e6d7bc] bg-[#f8f2e6] text-xs font-semibold text-[#8b6b35]">{String(item.numero).padStart(2,"0")}</span><span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#98743c]">Sesión {item.numero} · {item.duracion_horas} horas</span><span className="mt-0.5 block truncate text-sm font-semibold text-foreground">{item.titulo}</span></span></span><span className="flex shrink-0 items-center gap-2">{item.bloqueada ? <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800"><span aria-hidden="true">🔒</span> Bloqueada</span> : <span className="text-[10px] text-muted-foreground">{recursos.length} materiales</span>}<ChevronDown className="size-4 text-muted-foreground transition-transform group-open/session:rotate-180"/></span></summary><div className="border-t border-border px-4 py-4">{item.descripcion && <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.descripcion}</p>}{item.numero === 1 && <p className="mt-3 text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">Al finalizar:</span> reconocerás la interfaz de Rhino, identificarás los ejes principales y dominarás la navegación básica en el espacio 3D.</p>}{item.bloqueada ? <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900"><span className="text-base" aria-hidden="true">🔒</span><span>Esta sesión y sus materiales están bloqueados. El profesor habilitará el acceso cuando corresponda.</span></div> : <><div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" onClick={() => void abrirLecturaParaAlumno(item, false)} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-[#c9aa70] to-[#b79558] px-4 py-2.5 text-xs font-semibold text-[#211b11] shadow-sm"><BookOpenCheck className="size-4"/> {sesionesCompletadas.has(item.id) ? "Repasar sesión" : "Comenzar sesión"}</button>{sesionesCompletadas.has(item.id) && <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="size-4"/> Completada</span>}</div>{recursos.length > 0 && <section className="mt-4 rounded-lg border border-border/80 p-3"><h4 className="text-xs font-semibold">Materiales de esta sesión</h4>{recursos.map(m => <div key={m.id} className="flex items-center justify-between gap-3 border-t border-border py-3"><div className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0 text-gold-deep"/><span className="min-w-0"><span className="block truncate text-sm font-medium">{m.titulo}</span><span className="text-xs text-muted-foreground">{m.nombre_archivo} · {(m.tamano_bytes/1024/1024).toFixed(1)} MB</span></span></div><button type="button" onClick={() => void descargarMaterial(m)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs"><Download className="size-3.5"/> Descargar</button></div>)}</section>}</>}</div></details>;
              })}
              <h3 className="mb-2 mt-5 text-sm font-semibold">Evaluaciones</h3>
              {(examenesAlumnoQuery.data ?? []).filter(x => x.curso_id === i.curso_id).length === 0 ? <p className="border-t border-border py-3 text-xs text-muted-foreground">Aún no hay evaluaciones asignadas a este curso.</p> : (examenesAlumnoQuery.data ?? []).filter(x => x.curso_id === i.curso_id).map(x => {
                const intentos = (intentosAlumnoQuery.data ?? []).filter(t => t.examen_id === x.id);
                const intentoEnCurso = intentos.find(t => t.estado === "en_curso");
                const intentosCompletados = intentos.filter(t => t.estado !== "en_curso");
                const disponible = x.publicado && (!x.disponible_desde || new Date(x.disponible_desde) <= new Date()) && (!x.disponible_hasta || new Date(x.disponible_hasta) > new Date());
                const puedeIniciarONreanudar = disponible && (intentosCompletados.length < x.intentos_permitidos || Boolean(intentoEnCurso));
                const estado = intentoEnCurso ? "Evaluación en curso" : intentos[0]?.calificacion == null ? (intentos[0]?.estado ?? "Sin intentos") : "Nota " + intentos[0].calificacion + "/20";
                return <div key={x.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3"><div className="min-w-0"><p className="text-sm font-medium">{x.titulo}</p><p className="mt-1 text-xs text-muted-foreground">{intentos.length}/{x.intentos_permitidos} intentos · {estado}</p>{x.publicado && (x.disponible_desde || x.disponible_hasta) && <div className="mt-2 space-y-1 text-xs text-muted-foreground">{x.disponible_desde && <p><span className="font-medium text-foreground">Disponible desde:</span> {new Date(x.disponible_desde).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short", timeZone: "America/Lima" })}</p>}{x.disponible_hasta && <p><span className="font-medium text-foreground">Cierre:</span> {new Date(x.disponible_hasta).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short", timeZone: "America/Lima" })}</p>}<p className={x.disponible_desde && new Date(x.disponible_desde).getTime() > Date.now() ? "font-semibold text-amber-700" : x.disponible_hasta && new Date(x.disponible_hasta).getTime() <= Date.now() ? "font-semibold text-muted-foreground" : "font-semibold text-emerald-700"}>{x.disponible_desde && new Date(x.disponible_desde).getTime() > Date.now() ? "Programado por el profesor" : x.disponible_hasta && new Date(x.disponible_hasta).getTime() <= Date.now() ? "Plazo finalizado" : "Disponible ahora"}</p></div>}<span className={x.publicado ? "mt-1 inline-block rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700" : "mt-1 inline-block rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground"}>{x.publicado ? (disponible ? "Activo · disponible" : x.disponible_desde && new Date(x.disponible_desde).getTime() > Date.now() ? "Programado por el profesor" : x.disponible_hasta && new Date(x.disponible_hasta).getTime() <= Date.now() ? "Plazo finalizado" : "Publicado · fuera de horario") : "Desactivado · esperando al profesor"}</span></div><button type="button" disabled={!puedeIniciarONreanudar || Boolean(examenActivoAlumno)} onClick={() => void abrirExamenAlumno(x.id)} className="rounded-lg border border-border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40">{!disponible ? "Aún no disponible" : intentoEnCurso ? "Continuar evaluación en curso" : "Rendir evaluación"}</button></div>;
              })}
              <h3 className="mb-2 mt-5 text-sm font-semibold">Material general del curso</h3>
              {(materialesAlumnoQuery.data ?? []).filter(m => m.curso_id === i.curso_id && !m.sesion_id).length === 0 ? <p className="text-xs text-muted-foreground">No hay materiales generales publicados.</p> : (materialesAlumnoQuery.data ?? []).filter(m => m.curso_id === i.curso_id && !m.sesion_id).map(m => <div key={m.id} className="flex items-center justify-between gap-3 border-t border-border py-3"><div className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0 text-gold-deep"/><span className="min-w-0"><span className="block truncate text-sm font-medium">{m.titulo}</span><span className="text-xs text-muted-foreground">{m.nombre_archivo} · {(m.tamano_bytes/1024/1024).toFixed(1)} MB</span></span></div><button type="button" onClick={() => void descargarMaterial(m)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs"><Download className="size-3.5"/> Descargar</button></div>)}
            </div>
          </Panel>)}
        </>
      )}
      {vistaPreviaAlumno && examenVistaPreviaId && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Simulación de evaluación para alumno">
        <section className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <header className="flex items-start justify-between gap-3 border-b border-border p-5"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-deep">FADILAB · Simulación del alumno</p><h2 className="mt-1 text-lg font-semibold">{(examenesQuery.data ?? []).find(x=>x.id===examenVistaPreviaId)?.titulo ?? "Evaluación"}</h2><p className="mt-1 text-xs text-muted-foreground">Modo de prueba · Las respuestas no se guardan ni consumen intentos.</p></div><button type="button" onClick={()=>{setExamenVistaPreviaId("");setRespuestasVistaPrevia({});setPreguntaVistaPrevia(0);setSimulacionFinalizada(false);}} className="rounded-lg border border-border px-3 py-2 text-xs">Cerrar</button></header>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {examenActivoId!==examenVistaPreviaId||preguntasQuery.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Cargando preguntas…</p> : (preguntasQuery.data??[]).length===0 ? <p className="py-8 text-center text-sm text-muted-foreground">Este examen todavía no tiene preguntas.</p> : (()=>{const preguntas=preguntasQuery.data??[];const pregunta=preguntas[preguntaVistaPrevia];const contestada=Boolean(pregunta&&String(respuestasVistaPrevia[pregunta?.id]??"").trim());const preguntasObjetivas=preguntas.filter(p=>p.tipo!=="practica");const puntosMaximos=preguntas.reduce((s,p)=>s+Number(p.puntaje||0),0);const puntosObtenidos=preguntasObjetivas.reduce((s,p)=>s+(String(p.respuesta_correcta??"")===String(respuestasVistaPrevia[p.id]??"")?Number(p.puntaje||0):0),0);const aciertos=preguntasObjetivas.filter(p=>String(p.respuesta_correcta??"")===String(respuestasVistaPrevia[p.id]??"")).length;const tienePracticas=preguntas.some(p=>p.tipo==="practica");const nota=puntosMaximos>0?(puntosObtenidos/puntosMaximos)*20:0;return simulacionFinalizada ? <div className="space-y-5"><div className="rounded-xl border border-gold/30 bg-gold/5 p-6 text-center"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">{tienePracticas?"Resultado objetivo provisional":"Resultado de la evaluación"}</p><p className="mt-3 text-5xl font-bold tabular-nums text-foreground">{nota.toFixed(2)}<span className="text-xl font-medium text-muted-foreground">/20</span></p><p className="mt-2 text-sm text-muted-foreground">{aciertos} de {preguntasObjetivas.length} preguntas objetivas correctas</p>{tienePracticas&&<p className="mt-3 text-xs leading-5 text-muted-foreground">La nota definitiva queda pendiente de la revisión docente de las preguntas prácticas.</p>}</div><div className="space-y-3"><h3 className="text-sm font-semibold">Revisión de tus respuestas</h3>{preguntas.map((p,idx)=>{const elegida=String(respuestasVistaPrevia[p.id]??"");const correcta=String(p.respuesta_correcta??"");const esPractica=p.tipo==="practica";const acerto=!esPractica&&elegida===correcta;const opcionElegida=p.opciones.find(o=>o.value===elegida);const opcionCorrecta=p.opciones.find(o=>o.value===correcta);return <article key={p.id} className={`rounded-xl border p-4 ${esPractica?"border-border":acerto?"border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/10":"border-red-300 bg-red-50/50 dark:bg-red-950/10"}`}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-muted-foreground">Pregunta {idx+1} · {p.puntaje} puntos</p><span className={`text-xs font-semibold ${esPractica?"text-muted-foreground":acerto?"text-emerald-700 dark:text-emerald-400":"text-red-700 dark:text-red-400"}`}>{esPractica?"Pendiente de revisión":acerto?"Correcta":"Incorrecta"}</span></div><p className="mt-2 text-sm font-semibold">{p.enunciado}</p><p className="mt-3 text-sm"><span className="font-medium">Tu respuesta: </span>{esPractica?(elegida||"Sin responder"):(opcionElegida?.label??"Sin responder")}</p>{!esPractica&&<p className="mt-1 text-sm"><span className="font-medium">Respuesta correcta: </span><span className="font-semibold text-emerald-700 dark:text-emerald-400">{(opcionCorrecta?.label ?? correcta) || "No definida"}</span></p>}{esPractica&&<p className="mt-1 text-xs text-muted-foreground">Esta respuesta requiere valoración del profesor.</p>}</article>})}</div><p className="text-center text-xs text-muted-foreground">Esta simulación es solo de prueba: la nota no se guarda ni consume intentos.</p><div className="flex justify-center"><button type="button" onClick={()=>{setExamenVistaPreviaId("");setRespuestasVistaPrevia({});setPreguntaVistaPrevia(0);setSimulacionFinalizada(false);}} className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-black">Cerrar resultado</button></div></div> : <div className="space-y-4"><div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs leading-5"><strong>Indicaciones del profesor:</strong> Dispones de {(examenesQuery.data??[]).find(x=>x.id===examenVistaPreviaId)?.duracion_minutos ?? "tiempo no limitado"} {(examenesQuery.data??[]).find(x=>x.id===examenVistaPreviaId)?.duracion_minutos ? "minutos" : ""} para completar la evaluación. Responde cada pregunta antes de avanzar. <strong>Al pasar a la siguiente pregunta no podrás regresar ni modificar tu respuesta anterior.</strong></div><div className="flex items-center justify-between"><p className="text-xs font-semibold text-gold-deep">Pregunta {preguntaVistaPrevia+1} de {preguntas.length}</p><p className="text-xs text-muted-foreground">{pregunta?.puntaje} puntos</p></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gold" style={{width:`${((preguntaVistaPrevia+1)/preguntas.length)*100}%`}}/></div><article className="min-h-[220px] rounded-xl border border-border p-5"><h3 className="text-base font-semibold">{pregunta?.enunciado}</h3>{pregunta?.tipo==="practica"?<textarea value={respuestasVistaPrevia[pregunta?.id]??""} onChange={e=>setRespuestasVistaPrevia(v=>({...v,[pregunta?.id]:e.target.value}))} rows={5} className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Escribe tu respuesta…"/>:<div className="mt-4 space-y-3">{pregunta?.opciones.map(o=><label key={o.value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm hover:bg-muted/40"><input type="radio" name={"preview-"+pregunta?.id} value={o.value} checked={respuestasVistaPrevia[pregunta?.id]===o.value} onChange={e=>setRespuestasVistaPrevia(v=>({...v,[pregunta?.id]:e.target.value}))}/>{o.label}</label>)}</div>}</article><div className="flex items-center justify-between gap-2">{preguntaVistaPrevia<preguntas.length-1?<button type="button" disabled={!contestada} onClick={()=>setPreguntaVistaPrevia(v=>Math.min(preguntas.length-1,v+1))} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-40">Siguiente</button>:<button type="button" disabled={!contestada} onClick={()=>setSimulacionFinalizada(true)} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-40">Ver mi nota</button>}</div>{!contestada&&<p className="text-xs text-muted-foreground">Responde esta pregunta para continuar.</p>}</div>})()}
          </div>
        </section>
      </div>}
      {permisoDocente.isLoading && sesion?.esAdmin && fadilabCandidate ? <p className="text-xs text-muted-foreground">Comprobando autorización docente de FADILAB…</p> : null}
      {permisoDocente.error ? <p className="rounded-xl border border-red-300 p-3 text-sm text-red-700">No se pudo validar el acceso docente: {permisoDocente.error.message}</p> : null}
      {mensaje && <p role="status" className="rounded-xl border border-border bg-card p-3 text-sm">{mensaje}</p>}
    </div>
  </AppShell>;
}