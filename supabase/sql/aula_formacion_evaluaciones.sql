-- ============================================================================
-- TALLER DEL JOYERO · AULA DE FORMACIÓN
-- Parche SQL: evaluación automática + revisión docente de ejercicios prácticos
-- ============================================================================
--
-- OBJETIVO
--   1. Corregir el cálculo de exámenes que mezclan preguntas objetivas y prácticas.
--   2. Mantener las preguntas prácticas pendientes hasta que FADILAB las revise.
--   3. Permitir que el docente autorizado registre una nota práctica de 0 a 20.
--   4. Calcular la nota definitiva del intento sobre 20.
--
-- ANTES DE EJECUTAR
--   - Este es un PARCHE COMPLEMENTARIO. No vuelvas a ejecutar el SQL inicial.
--   - Ejecutar completo en Lovable Cloud / Supabase → SQL Editor.
--   - No elimina tablas, cursos, preguntas, intentos ni archivos existentes.
--   - No cambia permisos de otras tablas ni modifica Aurum Render.
--
-- RESULTADO ESPERADO
--   - Examen solo objetivo: se califica al enviarlo.
--   - Examen con al menos una pregunta práctica: queda pendiente_revision.
--   - Tras la revisión, FADILAB registra la nota práctica (0–20) y se calcula
--     la nota final ponderada según el puntaje asignado a cada pregunta.
--
-- Fórmula:
--   puntos objetivos obtenidos
--   + (puntos asignados a prácticas × nota práctica / 20)
--   --------------------------------------------------------------- × 20
--                  puntos totales del examen
--
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. VALIDACIÓN PREVIA DE ESTRUCTURA
--    Si falta una columna necesaria, detenemos la ejecución con un mensaje claro.
-- ---------------------------------------------------------------------------

do $preflight$
declare
  v_faltantes text;
begin
  select string_agg(x.columna, ', ' order by x.columna)
    into v_faltantes
  from (values
    ('formacion_examenes','id'),
    ('formacion_examenes','participante_id'),
    ('formacion_examenes','curso_id'),
    ('formacion_examenes','publicado'),
    ('formacion_examenes','disponible_desde'),
    ('formacion_examenes','disponible_hasta'),
    ('formacion_examenes','intentos_permitidos'),
    ('formacion_preguntas','id'),
    ('formacion_preguntas','examen_id'),
    ('formacion_preguntas','tipo'),
    ('formacion_preguntas','respuesta_correcta'),
    ('formacion_preguntas','puntaje'),
    ('formacion_preguntas','obligatoria'),
    ('formacion_intentos','id'),
    ('formacion_intentos','participante_id'),
    ('formacion_intentos','examen_id'),
    ('formacion_intentos','curso_id'),
    ('formacion_intentos','alumno_user_id'),
    ('formacion_intentos','numero_intento'),
    ('formacion_intentos','respuestas'),
    ('formacion_intentos','puntaje_obtenido'),
    ('formacion_intentos','puntaje_maximo'),
    ('formacion_intentos','calificacion'),
    ('formacion_intentos','estado'),
    ('formacion_intentos','observaciones_docente'),
    ('formacion_intentos','calificado_por'),
    ('formacion_intentos','calificado_en')
  ) as x(tabla, columna)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = x.tabla
      and c.column_name = x.columna
  );

  if v_faltantes is not null then
    raise exception
      'No se aplicó el parche. Faltan columnas requeridas: %',
      v_faltantes;
  end if;

  if to_regprocedure('public.formacion_esta_inscrito(uuid,uuid)') is null then
    raise exception 'No se aplicó el parche: falta la función formacion_esta_inscrito(uuid,uuid).';
  end if;

  if to_regprocedure('public.formacion_es_docente(uuid)') is null then
    raise exception 'No se aplicó el parche: falta la función formacion_es_docente(uuid).';
  end if;
end;
$preflight$;

-- ---------------------------------------------------------------------------
-- 2. ENVÍO DE EXAMEN Y CORRECCIÓN AUTOMÁTICA
--    Las respuestas correctas nunca se devuelven al navegador del alumno.
-- ---------------------------------------------------------------------------

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
  v_intento_id uuid;
  v_numero integer;
  v_total_preguntas integer;
  v_puntos_totales numeric(8,2);
  v_puntos_objetivos numeric(8,2);
  v_calificacion numeric(5,2);
  v_estado text;
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión para enviar una evaluación.';
  end if;

  if _respuestas is null or jsonb_typeof(_respuestas) <> 'array' then
    raise exception 'Las respuestas deben enviarse en formato de lista.';
  end if;

  -- Bloqueamos la fila del examen para evitar que dos envíos simultáneos
  -- superen el máximo de intentos permitido.
  select e.*
    into v_examen
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

  select count(*) + 1
    into v_numero
  from public.formacion_intentos i
  where i.examen_id = _examen_id
    and i.alumno_user_id = (select auth.uid());

  if v_numero > v_examen.intentos_permitidos then
    raise exception 'Has alcanzado el máximo de intentos permitido.';
  end if;

  select count(*), coalesce(sum(p.puntaje), 0)
    into v_total_preguntas, v_puntos_totales
  from public.formacion_preguntas p
  where p.examen_id = _examen_id;

  if v_total_preguntas = 0 or v_puntos_totales <= 0 then
    raise exception 'La evaluación no contiene preguntas con puntaje válido.';
  end if;

  -- Cada elemento debe incluir pregunta_id y respuesta, y pertenecer
  -- exclusivamente al examen que el alumno está respondiendo.
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
           and p.examen_id = _examen_id
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

  if exists (
    select 1
    from public.formacion_preguntas p
    where p.examen_id = _examen_id
      and p.obligatoria = true
      and not exists (
        select 1
        from jsonb_array_elements(_respuestas) r
        where (r ->> 'pregunta_id')::uuid = p.id
      )
  ) then
    raise exception 'Debes responder todas las preguntas obligatorias.';
  end if;

  -- Solo suman puntos automáticos las preguntas objetivas correctas.
  -- Las prácticas se reservan para la calificación del docente.
  select coalesce(sum(p.puntaje), 0)
    into v_puntos_objetivos
  from public.formacion_preguntas p
  join jsonb_array_elements(_respuestas) r
    on p.id = (r ->> 'pregunta_id')::uuid
  where p.examen_id = _examen_id
    and p.tipo in ('opcion_multiple', 'verdadero_falso')
    and p.respuesta_correcta = (r -> 'respuesta');

  if exists (
    select 1
    from public.formacion_preguntas p
    where p.examen_id = _examen_id
      and p.tipo = 'practica'
  ) then
    v_estado := 'pendiente_revision';
    v_calificacion := null;
  else
    v_estado := 'calificado';
    v_calificacion := round(
      (v_puntos_objetivos / nullif(v_puntos_totales, 0)) * 20,
      2
    );
  end if;

  insert into public.formacion_intentos (
    participante_id,
    examen_id,
    curso_id,
    alumno_user_id,
    numero_intento,
    respuestas,
    puntaje_obtenido,
    puntaje_maximo,
    calificacion,
    estado
  )
  values (
    v_examen.participante_id,
    v_examen.id,
    v_examen.curso_id,
    (select auth.uid()),
    v_numero,
    _respuestas,
    v_puntos_objetivos,
    v_puntos_totales,
    v_calificacion,
    v_estado
  )
  returning id into v_intento_id;

  return v_intento_id;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 3. CALIFICACIÓN DOCENTE DE EJERCICIOS PRÁCTICOS
--    Solo el docente validado para el participante dueño del examen puede usarla.
-- ---------------------------------------------------------------------------

create or replace function public.calificar_intento_formacion(
  _intento_id uuid,
  _calificacion_practica numeric,
  _observaciones text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_intento public.formacion_intentos%rowtype;
  v_puntos_practica numeric(8,2);
  v_puntos_objetivos numeric(8,2);
  v_puntos_totales numeric(8,2);
  v_puntos_finales numeric(8,2);
  v_nota_final numeric(5,2);
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión para calificar.';
  end if;

  if _calificacion_practica is null
     or _calificacion_practica < 0
     or _calificacion_practica > 20 then
    raise exception 'La nota práctica debe estar entre 0 y 20.';
  end if;

  select i.*
    into v_intento
  from public.formacion_intentos i
  where i.id = _intento_id
  for update;

  if not found then
    raise exception 'No se encontró el intento indicado.';
  end if;

  if not public.formacion_es_docente(v_intento.participante_id) then
    raise exception 'No tienes autorización docente para calificar este intento.';
  end if;

  if v_intento.estado <> 'pendiente_revision' then
    raise exception 'Este intento no está pendiente de revisión.';
  end if;

  select
    coalesce(sum(p.puntaje) filter (where p.tipo = 'practica'), 0),
    coalesce(sum(p.puntaje), 0)
  into v_puntos_practica, v_puntos_totales
  from public.formacion_preguntas p
  where p.examen_id = v_intento.examen_id;

  if v_puntos_practica <= 0 or v_puntos_totales <= 0 then
    raise exception 'La evaluación no contiene preguntas prácticas calificables.';
  end if;

  -- Recuperamos los puntos objetivos correctos que ya fueron enviados.
  select coalesce(sum(p.puntaje), 0)
    into v_puntos_objetivos
  from public.formacion_preguntas p
  join jsonb_array_elements(v_intento.respuestas) r
    on p.id = (r ->> 'pregunta_id')::uuid
  where p.examen_id = v_intento.examen_id
    and p.tipo in ('opcion_multiple', 'verdadero_falso')
    and p.respuesta_correcta = (r -> 'respuesta');

  -- La nota práctica se convierte proporcionalmente a los puntos
  -- asignados a las preguntas prácticas del examen.
  v_puntos_finales :=
    v_puntos_objetivos
    + (v_puntos_practica * (_calificacion_practica / 20));

  v_nota_final := round(
    (v_puntos_finales / nullif(v_puntos_totales, 0)) * 20,
    2
  );

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
$function$;

-- ---------------------------------------------------------------------------
-- 4. PERMISOS DE EJECUCIÓN
--    Nadie anónimo puede enviar ni calificar. Los usuarios autenticados solo
--    pueden invocar las funciones; la autorización real se valida dentro de ellas.
-- ---------------------------------------------------------------------------

revoke all on function public.enviar_intento_formacion(uuid, jsonb)
  from public, anon;
revoke all on function public.calificar_intento_formacion(uuid, numeric, text)
  from public, anon;

grant execute on function public.enviar_intento_formacion(uuid, jsonb)
  to authenticated;
grant execute on function public.calificar_intento_formacion(uuid, numeric, text)
  to authenticated;

notify pgrst, 'reload schema';

commit;

-- ============================================================================
-- 5. VERIFICACIÓN POSTERIOR
--    Resultado esperado para ambas funciones:
--      anon_puede_ejecutar = false
--      authenticated_puede_ejecutar = true
-- ============================================================================

select
  p.proname as funcion,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_puede_ejecutar,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_puede_ejecutar
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'enviar_intento_formacion',
    'calificar_intento_formacion'
  )
order by p.proname;

-- Verifica que ambas funciones existan con la firma esperada.
select
  to_regprocedure('public.enviar_intento_formacion(uuid,jsonb)') is not null
    as envio_examen_instalado,
  to_regprocedure('public.calificar_intento_formacion(uuid,numeric,text)') is not null
    as calificacion_practica_instalada;
