-- ============================================================================
-- AULA DE FORMACIÓN · CONFIGURACIÓN SEGURA DE EVALUACIONES
-- Aleatorización por intento, reanudación y control de retroceso.
-- Ejecutar completo en Supabase / Lovable Cloud SQL Editor.
-- No elimina datos ni modifica políticas RLS.
-- ============================================================================

begin;

alter table public.formacion_examenes
  add column if not exists aleatorizar_preguntas boolean not null default false,
  add column if not exists permitir_retroceso boolean not null default false;

alter table public.formacion_intentos
  add column if not exists orden_preguntas uuid[];

-- La función conserva el orden original para intentos históricos sin orden guardado.
create or replace function public.iniciar_intento_formacion(_examen_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_examen public.formacion_examenes%rowtype;
  v_intento public.formacion_intentos%rowtype;
  v_numero integer;
  v_inicio timestamptz;
  v_vence timestamptz;
  v_orden uuid[];
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  select e.* into v_examen
  from public.formacion_examenes e
  where e.id = _examen_id
    and e.publicado = true
    and (e.disponible_desde is null or e.disponible_desde <= now())
    and (e.disponible_hasta is null or e.disponible_hasta > now())
    and public.formacion_esta_inscrito(e.curso_id, (select auth.uid()))
  for update;

  if not found then
    raise exception 'Evaluación no disponible.';
  end if;

  select i.* into v_intento
  from public.formacion_intentos i
  where i.examen_id = _examen_id
    and i.alumno_user_id = (select auth.uid())
    and i.estado = 'en_curso'
  order by i.numero_intento desc
  limit 1
  for update;

  if found then
    return jsonb_build_object(
      'intento_id', v_intento.id,
      'iniciado_en', v_intento.iniciado_en,
      'vence_en', v_intento.vence_en,
      'duracion_minutos', v_examen.duracion_minutos,
      'reanudado', true
    );
  end if;

  select count(*) + 1 into v_numero
  from public.formacion_intentos i
  where i.examen_id = _examen_id
    and i.alumno_user_id = (select auth.uid());

  if v_numero > v_examen.intentos_permitidos then
    raise exception 'Has alcanzado el máximo de intentos.';
  end if;

  if v_examen.aleatorizar_preguntas then
    select array_agg(x.id order by x.aleatorio)
    into v_orden
    from (
      select p.id, random() as aleatorio
      from public.formacion_preguntas p
      where p.examen_id = _examen_id
    ) x;
  else
    select array_agg(p.id order by p.orden, p.created_at)
    into v_orden
    from public.formacion_preguntas p
    where p.examen_id = _examen_id;
  end if;

  if coalesce(array_length(v_orden, 1), 0) = 0 then
    raise exception 'La evaluación no contiene preguntas válidas.';
  end if;

  v_inicio := now();
  v_vence := case
    when coalesce(v_examen.duracion_minutos, 0) > 0
    then v_inicio + make_interval(mins => v_examen.duracion_minutos)
    else null
  end;

  insert into public.formacion_intentos (
    participante_id, examen_id, curso_id, alumno_user_id, numero_intento,
    respuestas, puntaje_obtenido, puntaje_maximo, calificacion, estado,
    iniciado_en, vence_en, orden_preguntas
  )
  select
    v_examen.participante_id, v_examen.id, v_examen.curso_id,
    (select auth.uid()), v_numero, '[]'::jsonb, 0,
    coalesce(sum(p.puntaje), 0), null, 'en_curso',
    v_inicio, v_vence, v_orden
  from public.formacion_preguntas p
  where p.examen_id = _examen_id
  returning * into v_intento;

  if not found or v_intento.puntaje_maximo <= 0 then
    raise exception 'La evaluación no contiene preguntas válidas.';
  end if;

  return jsonb_build_object(
    'intento_id', v_intento.id,
    'iniciado_en', v_inicio,
    'vence_en', v_vence,
    'duracion_minutos', v_examen.duracion_minutos,
    'reanudado', false
  );
end;
$function$;

-- Devuelve preguntas visibles siguiendo el orden inmutable del intento.
create or replace function public.obtener_examen_intento_formacion(_intento_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_intento public.formacion_intentos%rowtype;
  v_examen public.formacion_examenes%rowtype;
  v_resultado jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  select i.* into v_intento
  from public.formacion_intentos i
  where i.id = _intento_id
    and i.alumno_user_id = (select auth.uid())
    and i.estado = 'en_curso';

  if not found then
    raise exception 'No existe un intento activo para esta cuenta.';
  end if;

  select e.* into v_examen
  from public.formacion_examenes e
  where e.id = v_intento.examen_id
    and e.publicado = true
    and public.formacion_esta_inscrito(e.curso_id, (select auth.uid()));

  if not found then
    raise exception 'Evaluación no disponible para esta cuenta.';
  end if;

  select jsonb_build_object(
    'id', v_examen.id,
    'titulo', v_examen.titulo,
    'instrucciones', v_examen.instrucciones,
    'duracion_minutos', v_examen.duracion_minutos,
    'puntaje_maximo', v_examen.puntaje_maximo,
    'permitir_retroceso', v_examen.permitir_retroceso,
    'preguntas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'tipo', p.tipo, 'enunciado', p.enunciado,
        'opciones', p.opciones, 'puntaje', p.puntaje,
        'orden', p.orden, 'obligatoria', p.obligatoria
      ) order by ord.posicion)
      from unnest(coalesce(
        v_intento.orden_preguntas,
        array(
          select p2.id from public.formacion_preguntas p2
          where p2.examen_id = v_examen.id
          order by p2.orden, p2.created_at
        )
      )) with ordinality as ord(pregunta_id, posicion)
      join public.formacion_preguntas p
        on p.id = ord.pregunta_id and p.examen_id = v_examen.id
    ), '[]'::jsonb)
  ) into v_resultado;

  return v_resultado;
end;
$function$;

-- El servidor bloquea retrocesos y saltos de varias preguntas si la opción está desactivada.
create or replace function public.guardar_respuestas_intento_formacion(
  _intento_id uuid,
  _respuestas jsonb,
  _pregunta_actual integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_intento public.formacion_intentos%rowtype;
  v_examen public.formacion_examenes%rowtype;
  v_posicion_anterior integer;
  v_total integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión para guardar tus respuestas.';
  end if;

  if _respuestas is null or jsonb_typeof(_respuestas) <> 'array' then
    raise exception 'Las respuestas deben enviarse en formato de lista.';
  end if;

  if coalesce(_pregunta_actual, -1) < 0 then
    raise exception 'La posición de la pregunta no es válida.';
  end if;

  select i.* into v_intento
  from public.formacion_intentos i
  where i.id = _intento_id
    and i.alumno_user_id = (select auth.uid())
    and i.estado = 'en_curso'
  for update;

  if not found then
    raise exception 'No existe un intento activo perteneciente a tu cuenta.';
  end if;

  if v_intento.vence_en is not null and now() >= v_intento.vence_en then
    raise exception 'El tiempo de esta evaluación ha terminado.';
  end if;

  select e.* into v_examen
  from public.formacion_examenes e
  where e.id = v_intento.examen_id;

  v_posicion_anterior := coalesce(v_intento.pregunta_actual, 0);
  v_total := coalesce(array_length(v_intento.orden_preguntas, 1), 0);

  if _pregunta_actual >= greatest(v_total, 1) then
    raise exception 'La posición de la pregunta no es válida.';
  end if;

  if not coalesce(v_examen.permitir_retroceso, false)
     and _pregunta_actual < v_posicion_anterior then
    raise exception 'Esta evaluación no permite volver a preguntas anteriores.';
  end if;

  if not coalesce(v_examen.permitir_retroceso, false)
     and _pregunta_actual > v_posicion_anterior + 1 then
    raise exception 'Debes avanzar pregunta por pregunta.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(_respuestas) r
    where not (r ? 'pregunta_id')
       or not (r ? 'respuesta')
       or coalesce(r ->> 'pregunta_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or not exists (
         select 1 from public.formacion_preguntas p
         where p.id = (r ->> 'pregunta_id')::uuid
           and p.examen_id = v_intento.examen_id
       )
  ) then
    raise exception 'Hay una respuesta incompleta o una pregunta que no pertenece a esta evaluación.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(_respuestas) r
    group by r ->> 'pregunta_id'
    having count(*) > 1
  ) then
    raise exception 'No se permiten respuestas duplicadas.';
  end if;

  update public.formacion_intentos
  set respuestas = _respuestas,
      pregunta_actual = _pregunta_actual
  where id = v_intento.id;

  return jsonb_build_object(
    'guardado', true,
    'guardado_en', now(),
    'pregunta_actual', _pregunta_actual
  );
end;
$function$;

revoke all on function public.obtener_examen_intento_formacion(uuid) from public, anon;\ngrant execute on function public.obtener_examen_intento_formacion(uuid) to authenticated;

commit;

-- VERIFICACIÓN POSTERIOR
select table_name, column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'formacion_examenes' and column_name in ('aleatorizar_preguntas','permitir_retroceso'))
    or (table_name = 'formacion_intentos' and column_name = 'orden_preguntas')
  )
order by table_name, column_name;

select
  to_regprocedure('public.iniciar_intento_formacion(uuid)') as inicio,
  to_regprocedure('public.obtener_examen_intento_formacion(uuid)') as obtener_por_intento,
  to_regprocedure('public.guardar_respuestas_intento_formacion(uuid,jsonb,integer)') as guardar;
