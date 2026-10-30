-- Taller del Joyero · Aula de formación
-- Parche complementario: corrección ponderada y calificación docente de prácticas.
-- Ejecutar manualmente en SQL Editor de Lovable Cloud / Supabase.
-- No ejecuta migraciones automáticas ni modifica Aurum Render.

begin;

create or replace function public.enviar_intento_formacion(
  _examen_id uuid,
  _respuestas jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_examen public.formacion_examenes%rowtype;
  v_intento_id uuid;
  v_numero smallint;
  v_total_preguntas integer;
  v_puntos_totales numeric(8,2);
  v_puntos_objetivos numeric(8,2);
  v_puntos_obtenidos numeric(8,2);
  v_calificacion numeric(5,2);
  v_estado text;
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if jsonb_typeof(_respuestas) <> 'array' then
    raise exception 'El formato de respuestas no es válido';
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
    raise exception 'Examen no disponible para esta cuenta';
  end if;

  select (count(*) + 1)::smallint into v_numero
  from public.formacion_intentos
  where examen_id = _examen_id
    and alumno_user_id = (select auth.uid());

  if v_numero > v_examen.intentos_permitidos then
    raise exception 'Has alcanzado el número máximo de intentos';
  end if;

  select count(*), coalesce(sum(puntaje), 0)
  into v_total_preguntas, v_puntos_totales
  from public.formacion_preguntas
  where examen_id = _examen_id;

  if v_total_preguntas = 0 or v_puntos_totales <= 0 then
    raise exception 'El examen todavía no tiene preguntas válidas';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(_respuestas) r
    where not (r ? 'pregunta_id')
       or not (r ? 'respuesta')
       or not exists (
         select 1 from public.formacion_preguntas p
         where p.id = (r ->> 'pregunta_id')::uuid
           and p.examen_id = _examen_id
       )
  ) then
    raise exception 'Se recibió una respuesta inválida o ajena al examen';
  end if;

  if exists (
    select 1 from jsonb_array_elements(_respuestas) r
    group by (r ->> 'pregunta_id')
    having count(*) > 1
  ) then
    raise exception 'No se permiten respuestas duplicadas para una misma pregunta';
  end if;

  if exists (
    select 1
    from public.formacion_preguntas p
    where p.examen_id = _examen_id
      and p.obligatoria = true
      and not exists (
        select 1 from jsonb_array_elements(_respuestas) r
        where (r ->> 'pregunta_id')::uuid = p.id
      )
  ) then
    raise exception 'Debes responder todas las preguntas obligatorias';
  end if;

  select coalesce(sum(p.puntaje), 0)
  into v_puntos_objetivos
  from public.formacion_preguntas p
  join jsonb_array_elements(_respuestas) r
    on p.id = (r ->> 'pregunta_id')::uuid
  where p.examen_id = _examen_id
    and p.tipo in ('opcion_multiple','verdadero_falso')
    and p.respuesta_correcta = (r -> 'respuesta');

  if exists (
    select 1 from public.formacion_preguntas
    where examen_id = _examen_id and tipo = 'practica'
  ) then
    v_estado := 'pendiente_revision';
    v_calificacion := null;
  else
    v_estado := 'calificado';
    v_calificacion := round((v_puntos_objetivos / v_puntos_totales) * 20, 2);
  end if;

  insert into public.formacion_intentos (
    participante_id, examen_id, curso_id, alumno_user_id,
    numero_intento, respuestas, puntaje_obtenido, puntaje_maximo,
    calificacion, estado
  )
  values (
    v_examen.participante_id, v_examen.id, v_examen.curso_id, (select auth.uid()),
    v_numero, _respuestas, v_puntos_objetivos, v_puntos_totales,
    v_calificacion, v_estado
  )
  returning id into v_intento_id;

  return v_intento_id;
end;
$$;

create or replace function public.calificar_intento_formacion(
  _intento_id uuid,
  _calificacion_practica numeric,
  _observaciones text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intento public.formacion_intentos%rowtype;
  v_puntos_practica numeric(8,2);
  v_puntos_objetivos numeric(8,2);
  v_puntos_totales numeric(8,2);
  v_puntos_finales numeric(8,2);
  v_nota_final numeric(5,2);
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if _calificacion_practica is null or _calificacion_practica < 0 or _calificacion_practica > 20 then
    raise exception 'La calificación práctica debe estar entre 0 y 20';
  end if;

  select * into v_intento
  from public.formacion_intentos
  where id = _intento_id
  for update;

  if not found or not public.formacion_es_docente(v_intento.participante_id) then
    raise exception 'No tienes autorización para calificar este intento';
  end if;
  if v_intento.estado <> 'pendiente_revision' then
    raise exception 'Este intento no está pendiente de revisión';
  end if;

  select
    coalesce(sum(p.puntaje) filter (where p.tipo = 'practica'), 0),
    coalesce(sum(p.puntaje), 0)
  into v_puntos_practica, v_puntos_totales
  from public.formacion_preguntas p
  where p.examen_id = v_intento.examen_id;

  if v_puntos_practica <= 0 or v_puntos_totales <= 0 then
    raise exception 'El examen no contiene preguntas prácticas calificables';
  end if;

  select coalesce(sum(p.puntaje), 0)
  into v_puntos_objetivos
  from public.formacion_preguntas p
  join jsonb_array_elements(v_intento.respuestas) r
    on p.id = (r ->> 'pregunta_id')::uuid
  where p.examen_id = v_intento.examen_id
    and p.tipo in ('opcion_multiple','verdadero_falso')
    and p.respuesta_correcta = (r -> 'respuesta');

  v_puntos_finales := v_puntos_objetivos + (v_puntos_practica * (_calificacion_practica / 20));
  v_nota_final := round((v_puntos_finales / v_puntos_totales) * 20, 2);

  update public.formacion_intentos
  set puntaje_obtenido = v_puntos_finales,
      puntaje_maximo = v_puntos_totales,
      calificacion = least(20, greatest(0, v_nota_final)),
      estado = 'calificado',
      observaciones_docente = nullif(btrim(coalesce(_observaciones, '')), ''),
      calificado_por = (select auth.uid()),
      calificado_en = now()
  where id = _intento_id;
end;
$$;

revoke all on function public.enviar_intento_formacion(uuid, jsonb) from public, anon;
revoke all on function public.calificar_intento_formacion(uuid, numeric, text) from public, anon;
grant execute on function public.enviar_intento_formacion(uuid, jsonb) to authenticated;
grant execute on function public.calificar_intento_formacion(uuid, numeric, text) to authenticated;

notify pgrst, 'reload schema';
commit;

-- Verificación de permisos:
select
  p.proname as funcion,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_puede_ejecutar,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_puede_ejecutar
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('enviar_intento_formacion','calificar_intento_formacion')
order by p.proname;
