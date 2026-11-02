-- ============================================================================
-- FADILAB · EXAMEN DE LA SESIÓN 03 · MODELADO PRECISO EN RHINO
-- Inserta y publica una evaluación objetiva de 20 puntos / 25 minutos.
-- No modifica tablas, políticas, funciones ni otros exámenes.
--
-- EJECUCIÓN:
-- Lovable Cloud / Supabase → SQL Editor → ejecutar este archivo completo.
--
-- DESTINO:
-- Busca una única sesión publicada con numero = 3 y título que contenga
-- "Modelado preciso". Si no encuentra una o encuentra varias, se detiene.
--
-- SEGURIDAD:
-- Si ya existe un examen con este título para esa sesión, se detiene para
-- evitar duplicados. La clave de respuestas queda almacenada en la BD;
-- la consulta del alumno ya excluye respuesta_correcta.
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
  where s.numero = 3
    and lower(s.titulo) like '%modelado preciso%'
    and s.publicada = true;

  if not found then
    raise exception 'No se encontró la sesión 03 publicada cuyo título contenga "Modelado preciso". No se insertó ningún dato.';
  end if;

  select count(*)
    into v_cantidad
  from public.formacion_sesiones s
  where s.numero = 3
    and lower(s.titulo) like '%modelado preciso%'
    and s.publicada = true;

  if v_cantidad <> 1 then
    raise exception 'Se encontraron % sesiones coincidentes. Se detuvo la operación para evitar asignar el examen al curso equivocado.', v_cantidad;
  end if;

  if exists (
    select 1
    from public.formacion_examenes e
    where e.sesion_id = v_sesion.id
      and e.titulo = 'Evaluación · Sesión 03: Modelado preciso'
  ) then
    raise exception 'Ya existe la evaluación de la Sesión 03 en esta sesión. No se creó un duplicado.';
  end if;

  insert into public.formacion_examenes (
    participante_id, curso_id, sesion_id, titulo, instrucciones,
    duracion_minutos, intentos_permitidos, puntaje_maximo,
    publicado, aleatorizar_preguntas, permitir_retroceso, creado_por
  ) values (
    v_sesion.participante_id,
    v_sesion.curso_id,
    v_sesion.id,
    'Evaluación · Sesión 03: Modelado preciso',
    'Evaluación individual sobre preparación del documento, coordenadas cartesianas y polares, restricciones, Osnap, SmartTrack y práctica integradora. Tienes 25 minutos y un intento. Lee cada pregunta con atención. Una vez que avances, no podrás volver a la pregunta anterior. Tus respuestas se guardan durante el intento y el examen se envía al agotarse el tiempo.',
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
     'Antes de comenzar la práctica de la Sesión 03, ¿qué configuración de unidades se debe utilizar?',
     '[{"label":"Milímetros","value":"Milímetros"},{"label":"Centímetros","value":"Centímetros"},{"label":"Pulgadas","value":"Pulgadas"},{"label":"Metros","value":"Metros"}]'::jsonb,
     '"Milímetros"'::jsonb),
    (2, 'opcion_multiple',
     '¿Qué vista y plano de construcción se utilizan principalmente en la práctica?',
     '[{"label":"Vista Superior y plano XY","value":"Vista Superior y plano XY"},{"label":"Vista Frontal y plano YZ","value":"Vista Frontal y plano YZ"},{"label":"Vista Perspective y plano XZ","value":"Vista Perspective y plano XZ"},{"label":"Vista Derecha y plano YZ","value":"Vista Derecha y plano YZ"}]'::jsonb,
     '"Vista Superior y plano XY"'::jsonb),
    (3, 'opcion_multiple',
     '¿Desde qué referencia se calcula una coordenada absoluta como 20,10,0?',
     '[{"label":"Desde el origen del plano de construcción","value":"Desde el origen del plano de construcción"},{"label":"Desde el último punto indicado","value":"Desde el último punto indicado"},{"label":"Desde el centro de la pantalla","value":"Desde el centro de la pantalla"},{"label":"Desde el punto medio del objeto más cercano","value":"Desde el punto medio del objeto más cercano"}]'::jsonb,
     '"Desde el origen del plano de construcción"'::jsonb),
    (4, 'opcion_multiple',
     '¿Qué indica el prefijo @ en una coordenada relativa cartesiana?',
     '[{"label":"Que el desplazamiento parte del último punto indicado","value":"Que el desplazamiento parte del último punto indicado"},{"label":"Que el punto se mide siempre desde el origen","value":"Que el punto se mide siempre desde el origen"},{"label":"Que se activa la referencia Cen","value":"Que se activa la referencia Cen"},{"label":"Que se cambia la unidad del documento","value":"Que se cambia la unidad del documento"}]'::jsonb,
     '"Que el desplazamiento parte del último punto indicado"'::jsonb),
    (5, 'opcion_multiple',
     '¿Qué representa la coordenada polar absoluta 10<45?',
     '[{"label":"Un punto a 10 unidades del origen y con dirección de 45°","value":"Un punto a 10 unidades del origen y con dirección de 45°"},{"label":"Un desplazamiento de 45 unidades a 10°","value":"Un desplazamiento de 45 unidades a 10°"},{"label":"Un punto a 10 unidades del último punto y 45°","value":"Un punto a 10 unidades del último punto y 45°"},{"label":"Un segmento de 10 × 45 unidades","value":"Un segmento de 10 × 45 unidades"}]'::jsonb,
     '"Un punto a 10 unidades del origen y con dirección de 45°"'::jsonb),
    (6, 'opcion_multiple',
     '¿Cuál es la diferencia entre 10<45 y @10<45?',
     '[{"label":"La primera parte del origen; la segunda, del último punto indicado","value":"La primera parte del origen; la segunda, del último punto indicado"},{"label":"La primera es relativa y la segunda absoluta","value":"La primera es relativa y la segunda absoluta"},{"label":"No existe ninguna diferencia","value":"No existe ninguna diferencia"},{"label":"La segunda cambia las unidades a grados","value":"La segunda cambia las unidades a grados"}]'::jsonb,
     '"La primera parte del origen; la segunda, del último punto indicado"'::jsonb),
    (7, 'opcion_multiple',
     'En el plano XY, ¿hacia dónde apunta un ángulo de 90°?',
     '[{"label":"Hacia arriba","value":"Hacia arriba"},{"label":"Hacia la derecha","value":"Hacia la derecha"},{"label":"Hacia abajo","value":"Hacia abajo"},{"label":"Hacia la izquierda","value":"Hacia la izquierda"}]'::jsonb,
     '"Hacia arriba"'::jsonb),
    (8, 'opcion_multiple',
     'En el plano XY, ¿hacia dónde apunta un ángulo de 270°?',
     '[{"label":"Hacia abajo","value":"Hacia abajo"},{"label":"Hacia arriba","value":"Hacia arriba"},{"label":"Hacia la derecha","value":"Hacia la derecha"},{"label":"Hacia la izquierda","value":"Hacia la izquierda"}]'::jsonb,
     '"Hacia abajo"'::jsonb),
    (9, 'opcion_multiple',
     '¿Qué referencia Osnap permite capturar el punto donde se cruzan dos curvas?',
     '[{"label":"Int","value":"Int"},{"label":"End","value":"End"},{"label":"Mid","value":"Mid"},{"label":"Near","value":"Near"}]'::jsonb,
     '"Int"'::jsonb),
    (10, 'opcion_multiple',
     '¿Qué referencia Osnap captura el extremo exacto de una curva?',
     '[{"label":"End","value":"End"},{"label":"Cen","value":"Cen"},{"label":"Quad","value":"Quad"},{"label":"Tan","value":"Tan"}]'::jsonb,
     '"End"'::jsonb),
    (11, 'opcion_multiple',
     '¿Qué referencia Osnap permite ubicar el centro de un círculo?',
     '[{"label":"Cen","value":"Cen"},{"label":"Mid","value":"Mid"},{"label":"Perp","value":"Perp"},{"label":"Point","value":"Point"}]'::jsonb,
     '"Cen"'::jsonb),
    (12, 'opcion_multiple',
     '¿Qué referencia Osnap se utiliza para establecer una relación perpendicular respecto a una curva?',
     '[{"label":"Perp","value":"Perp"},{"label":"Tan","value":"Tan"},{"label":"Near","value":"Near"},{"label":"Quad","value":"Quad"}]'::jsonb,
     '"Perp"'::jsonb),
    (13, 'opcion_multiple',
     'En la placa base de la práctica integradora, ¿qué dimensiones debe tener el rectángulo?',
     '[{"label":"20 × 10 mm","value":"20 × 10 mm"},{"label":"20 × 20 mm","value":"20 × 20 mm"},{"label":"10 × 10 mm","value":"10 × 10 mm"},{"label":"30 × 10 mm","value":"30 × 10 mm"}]'::jsonb,
     '"20 × 10 mm"'::jsonb),
    (14, 'opcion_multiple',
     'Si el círculo central de la práctica tiene radio de 3 mm, ¿cuánto mide su diámetro?',
     '[{"label":"6 mm","value":"6 mm"},{"label":"3 mm","value":"3 mm"},{"label":"9 mm","value":"9 mm"},{"label":"12 mm","value":"12 mm"}]'::jsonb,
     '"6 mm"'::jsonb),
    (15, 'opcion_multiple',
     '¿Qué combinación describe correctamente el uso conjunto de Osnap y SmartTrack?',
     '[{"label":"Osnap adquiere el punto exacto y SmartTrack muestra guías temporales de alineación","value":"Osnap adquiere el punto exacto y SmartTrack muestra guías temporales de alineación"},{"label":"SmartTrack crea curvas definitivas y Osnap cambia las unidades","value":"SmartTrack crea curvas definitivas y Osnap cambia las unidades"},{"label":"Ambos sustituyen la revisión del plano de construcción","value":"Ambos sustituyen la revisión del plano de construcción"},{"label":"Osnap mide radios y SmartTrack convierte coordenadas","value":"Osnap mide radios y SmartTrack convierte coordenadas"}]'::jsonb,
     '"Osnap adquiere el punto exacto y SmartTrack muestra guías temporales de alineación"'::jsonb),
    (16, 'opcion_multiple',
     '¿Qué nombre se solicita para guardar el archivo final de la práctica?',
     '[{"label":"Sesion_03_Modelado_Preciso.3dm","value":"Sesion_03_Modelado_Preciso.3dm"},{"label":"Placa_Final.3dm","value":"Placa_Final.3dm"},{"label":"Modelo_Rhino.3dm","value":"Modelo_Rhino.3dm"},{"label":"Sesion_03_Final.stl","value":"Sesion_03_Final.stl"}]'::jsonb,
     '"Sesion_03_Modelado_Preciso.3dm"'::jsonb)
  ) as q(orden, tipo, enunciado, opciones, respuesta_correcta)
  order by q.orden;

  raise notice 'Evaluación creada y publicada. Examen ID: %, Sesión: %, Curso: %, Preguntas: 16, Puntaje: 20.', v_examen_id, v_sesion.id, v_sesion.curso_id;
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
where e.titulo = 'Evaluación · Sesión 03: Modelado preciso'
  and s.numero = 3
group by e.id, s.id;
