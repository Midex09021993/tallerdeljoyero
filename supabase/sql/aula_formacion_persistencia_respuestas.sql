-- ============================================================================
-- FADILAB · PERSISTENCIA DE RESPUESTAS DURANTE EVALUACIONES
-- Ejecutar manualmente en Supabase / Lovable Cloud SQL Editor.
-- Parche aditivo: conserva intentos existentes y no altera la calificación.
-- Requiere el esquema formacion_intentos ya utilizado por el Aula.
-- ============================================================================

begin;

alter table public.formacion_intentos
  add column if not exists pregunta_actual integer not null default 0;

-- Guarda únicamente respuestas y posición de la pregunta del intento propio.
-- No permite guardar si el intento ya fue enviado o venció.
create or replace function public.guardar_respuestas_intento_formacion(
  _intento_id uuid,
  _respuestas jsonb,
  _pregunta_actual integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_intento public.formacion_intentos%rowtype;
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

  if exists (
    select 1
    from jsonb_array_elements(_respuestas) r
    where not (r ? 'pregunta_id')
       or not (r ? 'respuesta')
       or coalesce(r ->> 'pregunta_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or not exists (
         select 1
         from public.formacion_preguntas p
         where p.id = (r ->> 'pregunta_id')::uuid
           and p.examen_id = v_intento.examen_id
       )
  ) then
    raise exception 'Hay una respuesta incompleta o una pregunta que no pertenece a esta evaluación.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(_respuestas) r
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

-- Recupera respuestas y posición solo para el alumno dueño del intento.
create or replace function public.recuperar_respuestas_intento_formacion(
  _intento_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_intento public.formacion_intentos%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión para recuperar tus respuestas.';
  end if;

  select i.* into v_intento
  from public.formacion_intentos i
  where i.id = _intento_id
    and i.alumno_user_id = (select auth.uid())
    and i.estado = 'en_curso'
  limit 1;

  if not found then
    raise exception 'No existe un intento activo que puedas recuperar.';
  end if;

  -- Se permite recuperar la instantánea incluso vencida para que el cliente
  -- pueda enviarla automáticamente al reanudar; guardar seguirá bloqueado.

  return jsonb_build_object(
    'intento_id', v_intento.id,
    'respuestas', coalesce(v_intento.respuestas, '[]'::jsonb),
    'pregunta_actual', coalesce(v_intento.pregunta_actual, 0),
    'vence_en', v_intento.vence_en
  );
end;
$function$;

revoke all on function public.guardar_respuestas_intento_formacion(uuid, jsonb, integer) from public, anon;
revoke all on function public.recuperar_respuestas_intento_formacion(uuid) from public, anon;
grant execute on function public.guardar_respuestas_intento_formacion(uuid, jsonb, integer) to authenticated;
grant execute on function public.recuperar_respuestas_intento_formacion(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;

-- Verificación de instalación y permisos:
select
  to_regprocedure('public.guardar_respuestas_intento_formacion(uuid,jsonb,integer)') is not null as guardar_instalado,
  to_regprocedure('public.recuperar_respuestas_intento_formacion(uuid)') is not null as recuperar_instalado,
  has_function_privilege('anon', 'public.guardar_respuestas_intento_formacion(uuid,jsonb,integer)', 'EXECUTE') as anon_puede_guardar,
  has_function_privilege('authenticated', 'public.guardar_respuestas_intento_formacion(uuid,jsonb,integer)', 'EXECUTE') as autenticado_puede_guardar;
