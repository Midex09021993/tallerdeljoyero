-- ============================================================================
-- FADILAB · EVALUACIÓN DE LA SESIÓN 06 · MODELADO DE SÓLIDOS EN RHINO 7
-- 16 preguntas · 20 puntos · 25 minutos · 1 intento
--
-- Ejecutar completo en Lovable Cloud / Supabase → SQL Editor.
-- Destino: única sesión publicada con numero = 6.
-- No modifica tablas, políticas, funciones ni otros exámenes.
-- Se detiene si la sesión no es inequívoca o si el examen ya existe.
-- ============================================================================

begin;

do $exam$
declare
  v_sesion record;
  v_examen_id uuid;
  v_cantidad integer;
begin
  select s.id, s.curso_id, s.participante_id, s.titulo
    into v_sesion
  from public.formacion_sesiones s
  where s.numero = 6
    and s.publicada = true;

  if not found then
    raise exception 'No se encontró una Sesión 06 publicada. No se insertó ningún dato.';
  end if;

  select count(*) into v_cantidad
  from public.formacion_sesiones s
  where s.numero = 6
    and s.publicada = true;

  if v_cantidad <> 1 then
    raise exception 'Se encontraron % sesiones publicadas con número 6. Operación cancelada para evitar asignar el examen al curso equivocado.', v_cantidad;
  end if;

  if exists (
    select 1 from public.formacion_examenes e
    where e.sesion_id = v_sesion.id
      and e.titulo = 'Evaluación · Sesión 06: Modelado de sólidos'
  ) then
    raise exception 'Ya existe la evaluación de la Sesión 06. No se creó un duplicado.';
  end if;

  insert into public.formacion_examenes (
    participante_id, curso_id, sesion_id, titulo, instrucciones,
    duracion_minutos, intentos_permitidos, puntaje_maximo,
    publicado, aleatorizar_preguntas, permitir_retroceso, creado_por
  ) values (
    v_sesion.participante_id,
    v_sesion.curso_id,
    v_sesion.id,
    'Evaluación · Sesión 06: Modelado de sólidos',
    'Evaluación individual sobre creación y diagnóstico de sólidos en Rhinoceros 7. Incluye extrusión de perfiles, revolución de curvas, proporciones básicas de anillos y revisión de polisuperficies. Tienes 25 minutos y un intento. Son 16 preguntas de opción múltiple, con un valor de 1.25 puntos cada una. Las preguntas se presentan en orden aleatorio y no podrás regresar a una pregunta anterior. La evaluación se envía al agotarse el tiempo.',
    25,
    1,
    20,
    true,
    true,
    false,
    auth.uid()
  )
  returning id into v_examen_id;

  insert into public.formacion_preguntas (
    participante_id, examen_id, tipo, enunciado, opciones,
    respuesta_correcta, puntaje, orden, obligatoria
  )
  select
    v_sesion.participante_id,
    v_examen_id,
    q.tipo,
    q.enunciado,
    q.opciones,
    q.respuesta_correcta,
    1.25,
    q.orden,
    true
  from (values
    (1, 'opcion_multiple',
     '¿Qué condición debe cumplir un perfil para que una extrusión recta pueda generar un sólido cerrado?',
     '[{"label":"Ser una curva cerrada y plana, con la opción Solid activada","value":"Ser una curva cerrada y plana, con la opción Solid activada"},{"label":"Ser cualquier curva abierta","value":"Ser cualquier curva abierta"},{"label":"Tener siempre cuatro puntos de control","value":"Tener siempre cuatro puntos de control"},{"label":"Estar dibujado en la vista Perspective","value":"Estar dibujado en la vista Perspective"}]'::jsonb,
     '"Ser una curva cerrada y plana, con la opción Solid activada"'::jsonb),

    (2, 'opcion_multiple',
     '¿Qué comando de Rhino permite extruir una curva en una dirección recta?',
     '[{"label":"_ExtrudeCrv","value":"_ExtrudeCrv"},{"label":"_Revolve","value":"_Revolve"},{"label":"_Fillet","value":"_Fillet"},{"label":"_Offset","value":"_Offset"}]'::jsonb,
     '"_ExtrudeCrv"'::jsonb),

    (3, 'opcion_multiple',
     'Si extruyes una curva abierta, ¿qué resultado debes esperar normalmente?',
     '[{"label":"Una superficie abierta, no un sólido cerrado","value":"Una superficie abierta, no un sólido cerrado"},{"label":"Siempre un sólido cerrado automáticamente","value":"Siempre un sólido cerrado automáticamente"},{"label":"Una esfera","value":"Una esfera"},{"label":"Una curva NURBS nueva sin superficie","value":"Una curva NURBS nueva sin superficie"}]'::jsonb,
     '"Una superficie abierta, no un sólido cerrado"'::jsonb),

    (4, 'opcion_multiple',
     'En Extrusion Studio, ¿qué representa la altura de extrusión?',
     '[{"label":"La distancia que recorre el perfil en la dirección de extrusión","value":"La distancia que recorre el perfil en la dirección de extrusión"},{"label":"El diámetro interior del perfil","value":"El diámetro interior del perfil"},{"label":"El número de puntos de control","value":"El número de puntos de control"},{"label":"El ángulo de revolución","value":"El ángulo de revolución"}]'::jsonb,
     '"La distancia que recorre el perfil en la dirección de extrusión"'::jsonb),

    (5, 'opcion_multiple',
     '¿Qué comando crea una superficie o sólido al girar un perfil alrededor de un eje?',
     '[{"label":"_Revolve","value":"_Revolve"},{"label":"_ExtrudeCrv","value":"_ExtrudeCrv"},{"label":"_Join","value":"_Join"},{"label":"_Scale","value":"_Scale"}]'::jsonb,
     '"_Revolve"'::jsonb),

    (6, 'opcion_multiple',
     'En una operación _Revolve, ¿qué elemento define el eje alrededor del cual gira el perfil?',
     '[{"label":"Una línea o eje de revolución definido por dos puntos","value":"Una línea o eje de revolución definido por dos puntos"},{"label":"El borde más cercano de la pantalla","value":"El borde más cercano de la pantalla"},{"label":"El centro de la cámara Perspective","value":"El centro de la cámara Perspective"},{"label":"El color asignado al perfil","value":"El color asignado al perfil"}]'::jsonb,
     '"Una línea o eje de revolución definido por dos puntos"'::jsonb),

    (7, 'opcion_multiple',
     '¿Qué resultado se busca normalmente al revolucionar 360° un perfil adecuado alrededor de su eje?',
     '[{"label":"Una forma de revolución completa, que puede ser un sólido si el perfil y las opciones lo permiten","value":"Una forma de revolución completa, que puede ser un sólido si el perfil y las opciones lo permiten"},{"label":"Una extrusión recta","value":"Una extrusión recta"},{"label":"Una curva abierta sin superficie","value":"Una curva abierta sin superficie"},{"label":"Una copia desplazada del perfil","value":"Una copia desplazada del perfil"}]'::jsonb,
     '"Una forma de revolución completa, que puede ser un sólido si el perfil y las opciones lo permiten"'::jsonb),

    (8, 'opcion_multiple',
     'Antes de ejecutar _Revolve, ¿qué debes comprobar en el perfil?',
     '[{"label":"Que su posición y forma sean correctas respecto del eje de revolución","value":"Que su posición y forma sean correctas respecto del eje de revolución"},{"label":"Que tenga un material metálico asignado","value":"Que tenga un material metálico asignado"},{"label":"Que esté oculto en todas las vistas","value":"Que esté oculto en todas las vistas"},{"label":"Que tenga exactamente ocho puntos de control","value":"Que tenga exactamente ocho puntos de control"}]'::jsonb,
     '"Que su posición y forma sean correctas respecto del eje de revolución"'::jsonb),

    (9, 'opcion_multiple',
     'En el diseño básico de un anillo, ¿qué dimensión determina el espacio interior por donde pasa el dedo?',
     '[{"label":"El diámetro interior","value":"El diámetro interior"},{"label":"El ancho del aro","value":"El ancho del aro"},{"label":"La altura de extrusión","value":"La altura de extrusión"},{"label":"El ángulo de revolución","value":"El ángulo de revolución"}]'::jsonb,
     '"El diámetro interior"'::jsonb),

    (10, 'opcion_multiple',
     'En Ring Volume Studio, ¿qué describe el ancho del aro?',
     '[{"label":"La dimensión del anillo a lo largo de la dirección de su circunferencia, según el perfil de diseño","value":"La dimensión del anillo a lo largo de la dirección de su circunferencia, según el perfil de diseño"},{"label":"El tamaño del hueco interior","value":"El tamaño del hueco interior"},{"label":"La cantidad de segmentos de una curva","value":"La cantidad de segmentos de una curva"},{"label":"La inclinación del eje Z","value":"La inclinación del eje Z"}]'::jsonb,
     '"La dimensión del anillo a lo largo de la dirección de su circunferencia, según el perfil de diseño"'::jsonb),

    (11, 'opcion_multiple',
     '¿Por qué es importante revisar la sección transversal del aro además de su diámetro interior?',
     '[{"label":"Porque la sección define el espesor y la forma del material, afectando comodidad, resistencia y apariencia","value":"Porque la sección define el espesor y la forma del material, afectando comodidad, resistencia y apariencia"},{"label":"Porque determina el idioma de Rhino","value":"Porque determina el idioma de Rhino"},{"label":"Porque reemplaza la necesidad de definir el diámetro","value":"Porque reemplaza la necesidad de definir el diámetro"},{"label":"Porque cambia automáticamente las unidades del documento","value":"Porque cambia automáticamente las unidades del documento"}]'::jsonb,
     '"Porque la sección define el espesor y la forma del material, afectando comodidad, resistencia y apariencia"'::jsonb),

    (12, 'opcion_multiple',
     '¿Qué comando de Rhino permite localizar bordes desnudos (Naked Edges) en una polisuperficie?',
     '[{"label":"_ShowEdges","value":"_ShowEdges"},{"label":"_Revolve","value":"_Revolve"},{"label":"_Move","value":"_Move"},{"label":"_Mirror","value":"_Mirror"}]'::jsonb,
     '"_ShowEdges"'::jsonb),

    (13, 'opcion_multiple',
     '¿Qué indica que una polisuperficie tenga bordes desnudos?',
     '[{"label":"Que existen bordes de superficies que no están unidos a otra cara y la geometría puede estar abierta","value":"Que existen bordes de superficies que no están unidos a otra cara y la geometría puede estar abierta"},{"label":"Que el objeto tiene demasiados materiales","value":"Que el objeto tiene demasiados materiales"},{"label":"Que el objeto está necesariamente duplicado","value":"Que el objeto está necesariamente duplicado"},{"label":"Que la cámara está fuera del modelo","value":"Que la cámara está fuera del modelo"}]'::jsonb,
     '"Que existen bordes de superficies que no están unidos a otra cara y la geometría puede estar abierta"'::jsonb),

    (14, 'opcion_multiple',
     '¿Para qué sirve _Join al trabajar con superficies cuyos bordes coinciden?',
     '[{"label":"Para unirlas en una polisuperficie cuando sus bordes son compatibles y coincidentes dentro de la tolerancia","value":"Para unirlas en una polisuperficie cuando sus bordes son compatibles y coincidentes dentro de la tolerancia"},{"label":"Para rellenar cualquier hueco aunque las superficies estén separadas","value":"Para rellenar cualquier hueco aunque las superficies estén separadas"},{"label":"Para fusionar automáticamente sólidos que no se tocan","value":"Para fusionar automáticamente sólidos que no se tocan"},{"label":"Para cambiar el diámetro del objeto","value":"Para cambiar el diámetro del objeto"}]'::jsonb,
     '"Para unirlas en una polisuperficie cuando sus bordes son compatibles y coincidentes dentro de la tolerancia"'::jsonb),

    (15, 'opcion_multiple',
     '¿Cuándo es apropiado utilizar _BooleanUnion para combinar dos sólidos?',
     '[{"label":"Cuando los sólidos se intersectan y la operación booleana puede calcular una unión válida","value":"Cuando los sólidos se intersectan y la operación booleana puede calcular una unión válida"},{"label":"Cuando están separados por una distancia y no se tocan","value":"Cuando están separados por una distancia y no se tocan"},{"label":"Cuando uno de los objetos es solo una curva abierta","value":"Cuando uno de los objetos es solo una curva abierta"},{"label":"Cuando únicamente se desea cambiar el color","value":"Cuando únicamente se desea cambiar el color"}]'::jsonb,
     '"Cuando los sólidos se intersectan y la operación booleana puede calcular una unión válida"'::jsonb),

    (16, 'opcion_multiple',
     '¿Cuál es el flujo de trabajo más fiable para revisar un sólido antes de continuar modelando?',
     '[{"label":"Identificar el objeto, revisar sus propiedades, localizar bordes desnudos y corregir la geometría según el diagnóstico","value":"Identificar el objeto, revisar sus propiedades, localizar bordes desnudos y corregir la geometría según el diagnóstico"},{"label":"Aplicar BooleanUnion repetidamente sin comprobar el resultado","value":"Aplicar BooleanUnion repetidamente sin comprobar el resultado"},{"label":"Cambiar el material y asumir que el objeto quedó cerrado","value":"Cambiar el material y asumir que el objeto quedó cerrado"},{"label":"Ocultar los bordes y continuar sin inspeccionar","value":"Ocultar los bordes y continuar sin inspeccionar"}]'::jsonb,
     '"Identificar el objeto, revisar sus propiedades, localizar bordes desnudos y corregir la geometría según el diagnóstico"'::jsonb)
  ) as q(orden, tipo, enunciado, opciones, respuesta_correcta)
  order by q.orden;

  raise notice 'Evaluación creada y publicada. Examen ID: %, Sesión: %, Preguntas: 16, Puntaje: 20.', v_examen_id, v_sesion.id;
end;
$exam$;

commit;

-- Verificación: debe devolver 1 examen publicado, 16 preguntas y 20 puntos.
select
  e.titulo,
  e.publicado,
  e.duracion_minutos,
  e.intentos_permitidos,
  e.puntaje_maximo,
  s.numero as numero_sesion,
  s.titulo as sesion,
  count(p.id) as preguntas,
  coalesce(sum(p.puntaje), 0) as puntos_totales
from public.formacion_examenes e
join public.formacion_sesiones s on s.id = e.sesion_id
left join public.formacion_preguntas p on p.examen_id = e.id
where e.titulo = 'Evaluación · Sesión 06: Modelado de sólidos'
  and s.numero = 6
group by e.id, s.id;
