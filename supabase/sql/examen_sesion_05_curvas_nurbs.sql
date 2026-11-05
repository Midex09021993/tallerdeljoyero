-- ============================================================================
-- FADILAB · EVALUACIÓN DE LA SESIÓN 05 · CURVAS NURBS
-- 16 preguntas · 20 puntos · 25 minutos · 1 intento
--
-- Ejecutar completo en Lovable Cloud / Supabase → SQL Editor.
-- Busca una única sesión 05 publicada cuyo título contenga "NURBS".
-- No modifica tablas, políticas, funciones ni otros exámenes.
-- Se detiene si no encuentra una sesión inequívoca o si el examen ya existe.
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
  where s.numero = 5
    and lower(s.titulo) like '%nurbs%'
    and s.publicada = true;

  if not found then
    raise exception 'No se encontró la Sesión 05 publicada cuyo título contenga "NURBS". No se insertó ningún dato.';
  end if;

  select count(*)
    into v_cantidad
  from public.formacion_sesiones s
  where s.numero = 5
    and lower(s.titulo) like '%nurbs%'
    and s.publicada = true;

  if v_cantidad <> 1 then
    raise exception 'Se encontraron % sesiones coincidentes para la Sesión 05. Operación cancelada para evitar asignar el examen al curso equivocado.', v_cantidad;
  end if;

  if exists (
    select 1
    from public.formacion_examenes e
    where e.sesion_id = v_sesion.id
      and e.titulo = 'Evaluación · Sesión 05: Curvas NURBS'
  ) then
    raise exception 'Ya existe la evaluación de la Sesión 05. No se creó un duplicado.';
  end if;

  insert into public.formacion_examenes (
    participante_id, curso_id, sesion_id, titulo, instrucciones,
    duracion_minutos, intentos_permitidos, puntaje_maximo,
    publicado, aleatorizar_preguntas, permitir_retroceso, creado_por
  ) values (
    v_sesion.participante_id,
    v_sesion.curso_id,
    v_sesion.id,
    'Evaluación · Sesión 05: Curvas NURBS',
    'Evaluación individual sobre construcción y edición de curvas NURBS aplicadas al diseño de joyería. Se evaluarán Curve e InterpCrv, puntos de control, grado y reconstrucción con Rebuild, continuidad G0/G1/G2, diagnóstico y limpieza de perfiles. Tienes 25 minutos y un intento. Lee cada pregunta con atención. Las preguntas se presentan en orden aleatorio y no podrás regresar a una pregunta anterior. La evaluación se envía al agotarse el tiempo.',
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
     '¿Qué característica define principalmente a una curva NURBS construida con Curve en Rhino?',
     '[{"label":"Su forma se controla mediante puntos de control","value":"Su forma se controla mediante puntos de control"},{"label":"Debe pasar obligatoriamente por todos sus puntos de control","value":"Debe pasar obligatoriamente por todos sus puntos de control"},{"label":"Solo puede representar líneas rectas y arcos","value":"Solo puede representar líneas rectas y arcos"},{"label":"No permite modificar su forma después de crearla","value":"No permite modificar su forma después de crearla"}]'::jsonb,
     '"Su forma se controla mediante puntos de control"'::jsonb),

    (2, 'opcion_multiple',
     '¿Cuál es la diferencia principal entre Curve e InterpCrv?',
     '[{"label":"Curve se controla con puntos de control; InterpCrv pasa por los puntos indicados","value":"Curve se controla con puntos de control; InterpCrv pasa por los puntos indicados"},{"label":"Curve crea superficies e InterpCrv crea sólidos","value":"Curve crea superficies e InterpCrv crea sólidos"},{"label":"Curve solo funciona en 3D e InterpCrv solo en 2D","value":"Curve solo funciona en 3D e InterpCrv solo en 2D"},{"label":"Ambos comandos producen siempre la misma curva","value":"Ambos comandos producen siempre la misma curva"}]'::jsonb,
     '"Curve se controla con puntos de control; InterpCrv pasa por los puntos indicados"'::jsonb),

    (3, 'opcion_multiple',
     'En Rhino, ¿qué comando permite mostrar los puntos editables de una curva seleccionada?',
     '[{"label":"PointsOn (F10)","value":"PointsOn (F10)"},{"label":"PointsOff (F11)","value":"PointsOff (F11)"},{"label":"Rebuild","value":"Rebuild"},{"label":"Join","value":"Join"}]'::jsonb,
     '"PointsOn (F10)"'::jsonb),

    (4, 'opcion_multiple',
     '¿Qué ocurre al desplazar un punto de control de una curva NURBS?',
     '[{"label":"Se modifica la forma de la curva sin tener que redibujarla","value":"Se modifica la forma de la curva sin tener que redibujarla"},{"label":"La curva se convierte automáticamente en una polilínea","value":"La curva se convierte automáticamente en una polilínea"},{"label":"Se elimina siempre el punto de control","value":"Se elimina siempre el punto de control"},{"label":"La curva cambia de unidades","value":"La curva cambia de unidades"}]'::jsonb,
     '"Se modifica la forma de la curva sin tener que redibujarla"'::jsonb),

    (5, 'opcion_multiple',
     '¿Para qué se utiliza principalmente Rebuild en una curva NURBS?',
     '[{"label":"Reconstruir su estructura definiendo grado y cantidad de puntos de control","value":"Reconstruir su estructura definiendo grado y cantidad de puntos de control"},{"label":"Cerrar automáticamente cualquier hueco entre curvas","value":"Cerrar automáticamente cualquier hueco entre curvas"},{"label":"Convertir una curva en una superficie","value":"Convertir una curva en una superficie"},{"label":"Eliminar todos los puntos de control","value":"Eliminar todos los puntos de control"}]'::jsonb,
     '"Reconstruir su estructura definiendo grado y cantidad de puntos de control"'::jsonb),

    (6, 'opcion_multiple',
     'Antes de aplicar Rebuild a un perfil importante de joyería, ¿qué procedimiento es más seguro?',
     '[{"label":"Duplicar la curva y reconstruir la copia para compararla con el original","value":"Duplicar la curva y reconstruir la copia para compararla con el original"},{"label":"Eliminar el original y reconstruir sin conservar una referencia","value":"Eliminar el original y reconstruir sin conservar una referencia"},{"label":"Convertir primero todos los puntos en objetos independientes","value":"Convertir primero todos los puntos en objetos independientes"},{"label":"Aumentar siempre al máximo la cantidad de puntos","value":"Aumentar siempre al máximo la cantidad de puntos"}]'::jsonb,
     '"Duplicar la curva y reconstruir la copia para compararla con el original"'::jsonb),

    (7, 'opcion_multiple',
     'Al reconstruir una curva, ¿qué criterio debe guiar la elección de la cantidad de puntos de control?',
     '[{"label":"Lograr una estructura manejable sin deformar de forma inaceptable el perfil","value":"Lograr una estructura manejable sin deformar de forma inaceptable el perfil"},{"label":"Usar siempre la mayor cantidad disponible","value":"Usar siempre la mayor cantidad disponible"},{"label":"Usar siempre exactamente dos puntos","value":"Usar siempre exactamente dos puntos"},{"label":"Elegir la cantidad según el color del material","value":"Elegir la cantidad según el color del material"}]'::jsonb,
     '"Lograr una estructura manejable sin deformar de forma inaceptable el perfil"'::jsonb),

    (8, 'opcion_multiple',
     '¿Qué describe la continuidad G0 entre dos tramos de curva?',
     '[{"label":"Coincidencia de posición en el punto de unión","value":"Coincidencia de posición en el punto de unión"},{"label":"Coincidencia de dirección tangente","value":"Coincidencia de dirección tangente"},{"label":"Coincidencia de curvatura","value":"Coincidencia de curvatura"},{"label":"Igualdad del número de puntos de control","value":"Igualdad del número de puntos de control"}]'::jsonb,
     '"Coincidencia de posición en el punto de unión"'::jsonb),

    (9, 'opcion_multiple',
     '¿Qué condición adicional caracteriza la continuidad G1 respecto de G0?',
     '[{"label":"Los tramos comparten dirección tangente en la unión","value":"Los tramos comparten dirección tangente en la unión"},{"label":"Los tramos tienen necesariamente la misma longitud","value":"Los tramos tienen necesariamente la misma longitud"},{"label":"Los tramos poseen idéntico número de puntos de control","value":"Los tramos poseen idéntico número de puntos de control"},{"label":"Los tramos deben formar un ángulo de 90 grados","value":"Los tramos deben formar un ángulo de 90 grados"}]'::jsonb,
     '"Los tramos comparten dirección tangente en la unión"'::jsonb),

    (10, 'opcion_multiple',
     '¿Qué aporta la continuidad G2 frente a G1?',
     '[{"label":"Además de la dirección tangente, mantiene una transición de curvatura compatible","value":"Además de la dirección tangente, mantiene una transición de curvatura compatible"},{"label":"Solo garantiza que los extremos se toquen","value":"Solo garantiza que los extremos se toquen"},{"label":"Hace que ambos tramos tengan el mismo color","value":"Hace que ambos tramos tengan el mismo color"},{"label":"Elimina la necesidad de revisar el perfil","value":"Elimina la necesidad de revisar el perfil"}]'::jsonb,
     '"Además de la dirección tangente, mantiene una transición de curvatura compatible"'::jsonb),

    (11, 'opcion_multiple',
     'Dos curvas comparten el mismo punto final e inicial, pero sus direcciones forman un quiebre visible. ¿Qué continuidad cumplen como mínimo?',
     '[{"label":"G0","value":"G0"},{"label":"G1","value":"G1"},{"label":"G2","value":"G2"},{"label":"No cumplen ni siquiera G0","value":"No cumplen ni siquiera G0"}]'::jsonb,
     '"G0"'::jsonb),

    (12, 'opcion_multiple',
     '¿Qué herramienta de Rhino permite inspeccionar visualmente variaciones de curvatura a lo largo de una curva?',
     '[{"label":"CurvatureGraph","value":"CurvatureGraph"},{"label":"Move","value":"Move"},{"label":"Offset","value":"Offset"},{"label":"Make2D","value":"Make2D"}]'::jsonb,
     '"CurvatureGraph"'::jsonb),

    (13, 'opcion_multiple',
     'En un perfil de montura, ¿por qué es importante revisar la continuidad y la curvatura?',
     '[{"label":"Porque las transiciones irregulares pueden notarse en los reflejos y afectar la calidad del perfil","value":"Porque las transiciones irregulares pueden notarse en los reflejos y afectar la calidad del perfil"},{"label":"Porque la continuidad determina directamente el color del metal","value":"Porque la continuidad determina directamente el color del metal"},{"label":"Porque evita tener que comprobar las dimensiones","value":"Porque evita tener que comprobar las dimensiones"},{"label":"Porque convierte automáticamente la curva en un sólido","value":"Porque convierte automáticamente la curva en un sólido"}]'::jsonb,
     '"Porque las transiciones irregulares pueden notarse en los reflejos y afectar la calidad del perfil"'::jsonb),

    (14, 'opcion_multiple',
     'Durante la limpieza de un perfil NURBS, ¿qué conjunto de problemas conviene detectar?',
     '[{"label":"Duplicados, segmentos cortos, autointersecciones y cambios de dirección no deseados","value":"Duplicados, segmentos cortos, autointersecciones y cambios de dirección no deseados"},{"label":"Únicamente el color y el grosor de visualización","value":"Únicamente el color y el grosor de visualización"},{"label":"Solo la posición de la cámara Perspective","value":"Solo la posición de la cámara Perspective"},{"label":"Exclusivamente el nombre del archivo","value":"Exclusivamente el nombre del archivo"}]'::jsonb,
     '"Duplicados, segmentos cortos, autointersecciones y cambios de dirección no deseados"'::jsonb),

    (15, 'opcion_multiple',
     'Después de unir o limpiar curvas que parecen tocarse, ¿qué comprobación es fundamental?',
     '[{"label":"Verificar extremos, tolerancia y continuidad requerida para la operación posterior","value":"Verificar extremos, tolerancia y continuidad requerida para la operación posterior"},{"label":"Suponer que Join corrige cualquier separación y suaviza la curva","value":"Suponer que Join corrige cualquier separación y suaviza la curva"},{"label":"Cambiar el material de visualización","value":"Cambiar el material de visualización"},{"label":"Ocultar todos los puntos de control sin revisar la geometría","value":"Ocultar todos los puntos de control sin revisar la geometría"}]'::jsonb,
     '"Verificar extremos, tolerancia y continuidad requerida para la operación posterior"'::jsonb),

    (16, 'opcion_multiple',
     '¿Qué secuencia representa mejor el flujo de trabajo integrador de la Sesión 05?',
     '[{"label":"Crear la curva, editar puntos, reconstruir una copia, revisar continuidad y limpiar el perfil final","value":"Crear la curva, editar puntos, reconstruir una copia, revisar continuidad y limpiar el perfil final"},{"label":"Crear un sólido, aplicar materiales y exportar sin revisar curvas","value":"Crear un sólido, aplicar materiales y exportar sin revisar curvas"},{"label":"Unir curvas al azar, borrar el original y aumentar puntos sin comparar","value":"Unir curvas al azar, borrar el original y aumentar puntos sin comparar"},{"label":"Aplicar Rebuild repetidamente hasta que desaparezcan todos los puntos","value":"Aplicar Rebuild repetidamente hasta que desaparezcan todos los puntos"}]'::jsonb,
     '"Crear la curva, editar puntos, reconstruir una copia, revisar continuidad y limpiar el perfil final"'::jsonb)
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
where e.titulo = 'Evaluación · Sesión 05: Curvas NURBS'
  and s.numero = 5
group by e.id, s.id;
