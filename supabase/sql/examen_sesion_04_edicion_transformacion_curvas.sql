-- ============================================================================
-- FADILAB · EXAMEN DE LA SESIÓN 04 · EDICIÓN Y TRANSFORMACIÓN DE CURVAS
-- 16 preguntas · 20 puntos · 25 minutos · 1 intento
--
-- Ejecutar completo en Lovable Cloud / Supabase → SQL Editor.
-- Busca una única sesión 04 publicada cuyo título contenga "curvas".
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
  where s.numero = 4
    and lower(s.titulo) like '%curvas%'
    and s.publicada = true;

  if not found then
    raise exception 'No se encontró la Sesión 04 publicada cuyo título contenga "curvas". No se insertó ningún dato.';
  end if;

  select count(*)
    into v_cantidad
  from public.formacion_sesiones s
  where s.numero = 4
    and lower(s.titulo) like '%curvas%'
    and s.publicada = true;

  if v_cantidad <> 1 then
    raise exception 'Se encontraron % sesiones coincidentes para la Sesión 04. Operación cancelada para evitar asignar el examen al curso equivocado.', v_cantidad;
  end if;

  if exists (
    select 1
    from public.formacion_examenes e
    where e.sesion_id = v_sesion.id
      and e.titulo = 'Evaluación · Sesión 04: Edición y transformación de curvas'
  ) then
    raise exception 'Ya existe la evaluación de la Sesión 04. No se creó un duplicado.';
  end if;

  insert into public.formacion_examenes (
    participante_id, curso_id, sesion_id, titulo, instrucciones,
    duracion_minutos, intentos_permitidos, puntaje_maximo,
    publicado, aleatorizar_preguntas, permitir_retroceso, creado_por
  ) values (
    v_sesion.participante_id,
    v_sesion.curso_id,
    v_sesion.id,
    'Evaluación · Sesión 04: Edición y transformación de curvas',
    'Evaluación individual sobre Fillet, Chamfer, Offset, Trim, Split, Extend, Join, Move, Copy, Rotate y Scale. Tienes 25 minutos y un intento. Lee cada pregunta con atención. Una vez que avances, no podrás volver a la pregunta anterior. Las preguntas se presentan en orden aleatorio. La evaluación se envía al agotarse el tiempo.',
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
     '¿Qué operación crea una transición curva entre dos segmentos o curvas?',
     '[{"label":"Fillet","value":"Fillet"},{"label":"Chamfer","value":"Chamfer"},{"label":"Offset","value":"Offset"},{"label":"Move","value":"Move"}]'::jsonb,
     '"Fillet"'::jsonb),

    (2, 'opcion_multiple',
     'En Fillet, ¿qué parámetro determina el tamaño del redondeo?',
     '[{"label":"El radio","value":"El radio"},{"label":"El ángulo de rotación","value":"El ángulo de rotación"},{"label":"El factor de escala","value":"El factor de escala"},{"label":"La distancia de desplazamiento","value":"La distancia de desplazamiento"}]'::jsonb,
     '"El radio"'::jsonb),

    (3, 'opcion_multiple',
     '¿Qué hace Extend al editar curvas?',
     '[{"label":"Prolonga una curva hasta alcanzar un límite o una condición de extensión válida","value":"Porque la ubicación de selección ayuda a determinar qué partes de las curvas se conservan"},{"label":"Porque define automáticamente las unidades del documento","value":"Porque define automáticamente las unidades del documento"},{"label":"Porque cambia el radio a cero","value":"Porque cambia el radio a cero"},{"label":"Porque convierte el empalme en una superficie","value":"Porque convierte el empalme en una superficie"}]'::jsonb,
     '"Porque la ubicación de selección ayuda a determinar qué partes de las curvas se conservan"'::jsonb),

    (4, 'opcion_multiple',
     '¿Cuál es la diferencia geométrica principal entre Fillet y Chamfer?',
     '[{"label":"Fillet crea un arco y Chamfer crea un segmento recto","value":"Fillet crea un arco y Chamfer crea un segmento recto"},{"label":"Fillet desplaza y Chamfer duplica","value":"Fillet desplaza y Chamfer duplica"},{"label":"Fillet crea una curva paralela y Chamfer un círculo","value":"Fillet crea una curva paralela y Chamfer un círculo"},{"label":"No existe diferencia entre ambos","value":"No existe diferencia entre ambos"}]'::jsonb,
     '"Fillet crea un arco y Chamfer crea un segmento recto"'::jsonb),

    (5, 'opcion_multiple',
     'En la práctica de la sesión, ¿qué distancias se indican para el chaflán de prueba?',
     '[{"label":"2 mm y 2 mm","value":"2 mm y 2 mm"},{"label":"1 mm y 1 mm","value":"1 mm y 1 mm"},{"label":"5 mm y 10 mm","value":"5 mm y 10 mm"},{"label":"2 mm y 5 mm","value":"2 mm y 5 mm"}]'::jsonb,
     '"2 mm y 2 mm"'::jsonb),

    (6, 'opcion_multiple',
     '¿Qué resultado produce Offset?',
     '[{"label":"Una curva paralela a la original a una distancia indicada","value":"Una curva paralela a la original a una distancia indicada"},{"label":"Una rotación alrededor de un centro","value":"Una rotación alrededor de un centro"},{"label":"Una copia colocada en cualquier punto","value":"Una copia colocada en cualquier punto"},{"label":"Un arco que une dos curvas","value":"Un arco que une dos curvas"}]'::jsonb,
     '"Una curva paralela a la original a una distancia indicada"'::jsonb),

    (7, 'opcion_multiple',
     'Al ejecutar Offset, ¿qué debes indicar además de la distancia?',
     '[{"label":"El lado donde se creará la nueva curva","value":"El lado donde se creará la nueva curva"},{"label":"El centro de rotación","value":"El centro de rotación"},{"label":"El número de copias","value":"El número de copias"},{"label":"El ángulo de empalme","value":"El ángulo de empalme"}]'::jsonb,
     '"El lado donde se creará la nueva curva"'::jsonb),

    (8, 'opcion_multiple',
     '¿Qué hace Trim cuando editas curvas con objetos de corte?',
     '[{"label":"Elimina los segmentos sobrantes que seleccionas después de definir los objetos cortantes","value":"Cruces o autointersecciones en el contorno"},{"label":"El objeto siempre se convierte en una malla","value":"El objeto siempre se convierte en una malla"},{"label":"Se elimina automáticamente el documento","value":"Se elimina automáticamente el documento"},{"label":"Se bloquea el plano XY","value":"Se bloquea el plano XY"}]'::jsonb,
     '"Cruces o autointersecciones en el contorno"'::jsonb),

    (9, 'opcion_multiple',
     '¿Qué información define el desplazamiento realizado con Move?',
     '[{"label":"La diferencia entre el punto base y el punto de destino","value":"La diferencia entre el punto base y el punto de destino"},{"label":"El radio y el centro de un círculo","value":"El radio y el centro de un círculo"},{"label":"La distancia entre dos curvas paralelas","value":"La distancia entre dos curvas paralelas"},{"label":"El factor de escala y el ángulo","value":"El factor de escala y el ángulo"}]'::jsonb,
     '"La diferencia entre el punto base y el punto de destino"'::jsonb),

    (10, 'opcion_multiple',
     '¿Qué sucede al utilizar Copy en lugar de Move?',
     '[{"label":"Se conserva el objeto original y se crea una copia","value":"Se conserva el objeto original y se crea una copia"},{"label":"El objeto original siempre se elimina","value":"El objeto original siempre se elimina"},{"label":"El objeto cambia de tamaño","value":"El objeto cambia de tamaño"},{"label":"El objeto gira 90 grados","value":"El objeto gira 90 grados"}]'::jsonb,
     '"Se conserva el objeto original y se crea una copia"'::jsonb),

    (11, 'opcion_multiple',
     'En la práctica, ¿qué desplazamiento en X se solicita para una variante con Move?',
     '[{"label":"5 mm","value":"5 mm"},{"label":"1 mm","value":"1 mm"},{"label":"2 mm","value":"2 mm"},{"label":"10 mm","value":"10 mm"}]'::jsonb,
     '"5 mm"'::jsonb),

    (12, 'opcion_multiple',
     '¿Qué elemento debes definir para controlar alrededor de qué punto gira un objeto con Rotate?',
     '[{"label":"El centro de rotación","value":"El centro de rotación"},{"label":"El radio de Fillet","value":"El radio de Fillet"},{"label":"El lado de Offset","value":"El lado de Offset"},{"label":"El punto final de Copy","value":"El punto final de Copy"}]'::jsonb,
     '"El centro de rotación"'::jsonb),

    (13, 'opcion_multiple',
     'En el plano XY, ¿qué giro se solicita en la práctica integradora?',
     '[{"label":"90°","value":"90°"},{"label":"45°","value":"45°"},{"label":"180°","value":"180°"},{"label":"270°","value":"270°"}]'::jsonb,
     '"90°"'::jsonb),

    (14, 'opcion_multiple',
     '¿Qué ocurre al aplicar Scale uniforme con un factor de 0.5?',
     '[{"label":"Las dimensiones se reducen a la mitad","value":"Las dimensiones se reducen a la mitad"},{"label":"Las dimensiones se duplican","value":"Las dimensiones se duplican"},{"label":"El objeto gira 0.5 grados","value":"El objeto gira 0.5 grados"},{"label":"El objeto se desplaza 0.5 mm","value":"El objeto se desplaza 0.5 mm"}]'::jsonb,
     '"Las dimensiones se reducen a la mitad"'::jsonb),

    (15, 'opcion_multiple',
     '¿Qué debes comprobar después de utilizar Join?',
     '[{"label":"Si las curvas se unieron y si el resultado es una curva abierta o cerrada","value":"Las dimensiones y que la geometría resultante sea adecuada para el diseño"},{"label":"Únicamente el color de visualización","value":"Únicamente el color de visualización"},{"label":"Solo el nombre del comando utilizado","value":"Solo el nombre del comando utilizado"},{"label":"Que el objeto quede fuera del plano de construcción","value":"Que el objeto quede fuera del plano de construcción"}]'::jsonb,
     '"Las dimensiones y que la geometría resultante sea adecuada para el diseño"'::jsonb),

    (16, 'opcion_multiple',
     '¿Cuál es la diferencia principal entre Split y Trim?',
     '[{"label":"Split divide y conserva los segmentos; Trim permite retirar los segmentos sobrantes seleccionados","value":"Para comparar las variantes y poder recuperar la geometría inicial"},{"label":"Para que Rhino cambie automáticamente las unidades","value":"Para que Rhino cambie automáticamente las unidades"},{"label":"Para convertir las curvas en superficies","value":"Para convertir las curvas en superficies"},{"label":"Para evitar indicar puntos base","value":"Para evitar indicar puntos base"}]'::jsonb,
     '"Para comparar las variantes y poder recuperar la geometría inicial"'::jsonb)
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
where e.titulo = 'Evaluación · Sesión 04: Edición y transformación de curvas'
  and s.numero = 4
group by e.id, s.id;
