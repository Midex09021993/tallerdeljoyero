-- ============================================================================
-- FADILAB · LÍMITE REAL DE TIEMPO EN EVALUACIONES
-- Parche aditivo. Ejecutar manualmente en Supabase/Lovable Cloud SQL Editor.
-- No modificar ni eliminar tablas, intentos o evaluaciones existentes.
-- ============================================================================
begin;

alter table public.formacion_intentos
  add column if not exists iniciado_en timestamptz,
  add column if not exists vence_en timestamptz;

-- Los intentos nuevos se crean al abrir el examen, no al enviarlo.
create or replace function public.iniciar_intento_formacion(_examen_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_examen public.formacion_examenes%rowtype;
  v_intento public.formacion_intentos%rowtype;
  v_numero integer;
  v_inicio timestamptz;
  v_vence timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión para comenzar una evaluación.';
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
    raise exception 'La evaluación no está disponible para tu cuenta.';
  end if;

  -- Si el alumno vuelve a abrir una sesión en curso, conserva el mismo plazo.
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
    raise exception 'Has alcanzado el máximo de intentos permitido.';
  end if;

  v_inicio := now();
  v_vence := case
    when coalesce(v_examen.duracion_minutos, 0) > 0
      then v_inicio + make_interval(mins => v_examen.duracion_minutos)
    else null
  end;

  insert into public.formacion_intentos (
    participante_id, examen_id, curso_id, alumno_user_id,
    numero_intento, respuestas, puntaje_obtenido, puntaje_maximo,
    calificacion, estado, iniciado_en, vence_en
  )
  select
    v_examen.participante_id, v_examen.id, v_examen.curso_id,
    (select auth.uid()), v_numero, '[]'::jsonb, 0,
    coalesce(sum(p.puntaje), 0), null, 'en_curso', v_inicio, v_vence
  from public.formacion_preguntas p
  where p.examen_id = _examen_id
  returning * into v_intento;

  if not found then
    raise exception 'No se pudo iniciar el intento.';
  end if;

  if v_intento.puntaje_maximo <= 0 then
    delete from public.formacion_intentos where id = v_intento.id;
    raise exception 'La evaluación no contiene preguntas con puntaje válido.';
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

-- El servidor es la autoridad del vencimiento. El contador del navegador solo
-- informa visualmente; una llamada tardía no puede extender el tiempo.
create or replace function public.enviar_intento_formacion(
  _examen_id uuid,
  _respuestas jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_examen public.formacion_examenes%rowtype;
  v_intento public.formacion_intentos%rowtype;
  v_puntos_totales numeric(8,2);
  v_puntos_objetivos numeric(8,2);
  v_calificacion numeric(5,2);
  v_tiempo_agotado boolean;
  v_estado text;
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión para enviar una evaluación.';
  end if;

  if _respuestas is null or jsonb_typeof(_respuestas) <> 'array' then
    raise exception 'Las respuestas deben enviarse en formato de lista.';
  end if;

  select e.* into v_examen
  from public.formacion_examenes e
  where e.id = _examen_id
    and e.publicado = true
    and public.formacion_esta_inscrito(e.curso_id, (select auth.uid()))
  for update;

  if not found then
    raise exception 'La evaluación no está disponible para tu cuenta.';
  end if;

  select i.* into v_intento
  from public.formacion_intentos i
  where i.examen_id = _examen_id
    and i.alumno_user_id = (select auth.uid())
    and i.estado = 'en_curso'
  order by i.numero_intento desc
  limit 1
  for update;

  if not found then
    raise exception 'No hay un intento activo. Inicia la evaluación nuevamente.';
  end if;

  v_tiempo_agotado := v_intento.vence_en is not null and now() >= v_intento.vence_en;

  if exists (
    select 1
    from jsonb_array_elements(_respuestas) r
    where not (r ? 'pregunta_id')
       or not (r ? 'respuesta')
       or coalesce(r ->> 'pregunta_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or not exists (
         select 1 from public.formacion_preguntas p
         where p.id = (r ->> 'pregunta_id')::uuid
           and p.examen_id = _examen_id
       )
  ) then
    raise exception 'Hay una respuesta incompleta o una pregunta que no pertenece a esta evaluación.';
  end if;

  if exists (
    select 1 from jsonb_array_elements(_respuestas) r
    group by r ->> 'pregunta_id' having count(*) > 1
  ) then
    raise exception 'No se permiten respuestas duplicadas.';
  end if;

  if not v_tiempo_agotado and exists (
    select 1 from public.formacion_preguntas p
    where p.examen_id = _examen_id
      and p.obligatoria = true
      and not exists (
        select 1 from jsonb_array_elements(_respuestas) r
        where (r ->> 'pregunta_id')::uuid = p.id
      )
  ) then
    raise exception 'Debes responder todas las preguntas obligatorias antes de enviar.';
  end if;

  select coalesce(sum(p.puntaje), 0)
    into v_puntos_totales
  from public.formacion_preguntas p
  where p.examen_id = _examen_id;

  if v_puntos_totales <= 0 then
    raise exception 'La evaluación no contiene preguntas con puntaje válido.';
  end if;

  select coalesce(sum(p.puntaje), 0)
    into v_puntos_objetivos
  from public.formacion_preguntas p
  join jsonb_array_elements(_respuestas) r
    on p.id = (r ->> 'pregunta_id')::uuid
  where p.examen_id = _examen_id
    and p.tipo in ('opcion_multiple', 'verdadero_falso')
    and p.respuesta_correcta = (r -> 'respuesta');

  if exists (
    select 1 from public.formacion_preguntas p
    where p.examen_id = _examen_id and p.tipo = 'practica'
  ) then
    v_estado := 'pendiente_revision';
    v_calificacion := null;
  else
    v_estado := 'calificado';
    v_calificacion := round((v_puntos_objetivos / v_puntos_totales) * 20, 2);
  end if;

  if v_tiempo_agotado and v_estado = 'calificado' then
    v_estado := 'calificado';
  end if;

  update public.formacion_intentos
  set respuestas = _respuestas,
      puntaje_obtenido = v_puntos_objetivos,
      puntaje_maximo = v_puntos_totales,
      calificacion = v_calificacion,
      estado = v_estado,
      enviado_en = now()
  where id = v_intento.id;

  return v_intento.id;
end;
$function$;

revoke all on function public.iniciar_intento_formacion(uuid) from public, anon;
revoke all on function public.enviar_intento_formacion(uuid, jsonb) from public, anon;
grant execute on function public.iniciar_intento_formacion(uuid) to authenticated;
grant execute on function public.enviar_intento_formacion(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;

-- Verificación: ambas funciones deben existir y solo ser ejecutables por usuarios autenticados.
select
  to_regprocedure('public.iniciar_intento_formacion(uuid)') is not null as inicio_instalado,
  to_regprocedure('public.enviar_intento_formacion(uuid,jsonb)') is not null as envio_con_limite_instalado,
  has_function_privilege('anon', 'public.iniciar_intento_formacion(uuid)', 'EXECUTE') as anon_puede_iniciar,
  has_function_privilege('authenticated', 'public.iniciar_intento_formacion(uuid)', 'EXECUTE') as autenticado_puede_iniciar;
