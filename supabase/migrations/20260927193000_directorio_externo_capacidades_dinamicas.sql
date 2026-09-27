-- Directorio externo dinámico por capacidad productiva.
-- La fuente de verdad es participante_especialidades + especialidades.
-- Se normaliza el nombre de la capacidad para tolerar acentos, espacios y
-- separadores sin convertir capacidades distintas en equivalentes.
create or replace function public.listar_participantes_servicio(
  _area text default null
)
returns table (
  id uuid,
  nombre text,
  tipo_participante text,
  especialidad text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin((select auth.uid())) then
    raise exception 'No autorizado';
  end if;

  return query
  select
    ep.id,
    ep.nombre,
    ep.tipo_participante,
    string_agg(distinct e.nombre, ' · ' order by e.nombre) as especialidad
  from public.ecosistema_participantes ep
  join public.participante_especialidades pe
    on pe.participante_id = ep.id
  join public.especialidades e
    on e.id = pe.especialidad_id
  where ep.estado = 'activo'
    and e.activa = true
    and e.categoria = 'Producción'
    and (
      nullif(trim(_area), '') is null
      or lower(
        regexp_replace(
          translate(coalesce(e.nombre, ''), 'áéíóúÁÉÍÓÚüÜñÑ', 'aeiouAEIOUuUnN'),
          '[^a-z0-9]+',
          '',
          'g'
        )
      )
      =
      lower(
        regexp_replace(
          translate(coalesce(_area, ''), 'áéíóúÁÉÍÓÚüÜñÑ', 'aeiouAEIOUuUnN'),
          '[^a-z0-9]+',
          '',
          'g'
        )
      )
    )
  group by ep.id, ep.nombre, ep.tipo_participante
  order by ep.nombre;
end;
$$;

revoke all on function public.listar_participantes_servicio() from public, anon;
revoke all on function public.listar_participantes_servicio(text) from public, anon;
grant execute on function public.listar_participantes_servicio() to authenticated;
grant execute on function public.listar_participantes_servicio(text) to authenticated;

-- La misma regla protege la asignación final del trabajo.
create or replace function public.asignar_participante_externo_trabajo(
  _trabajo_id uuid,
  _participante_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trabajo public.trabajos;
  v_participante public.ecosistema_participantes;
begin
  if not public.es_admin((select auth.uid())) then
    raise exception 'Solo un administrador puede asignar servicios externos';
  end if;

  select *
  into v_trabajo
  from public.trabajos
  where id = _trabajo_id
  for update;

  if v_trabajo.id is null then
    raise exception 'Trabajo no encontrado';
  end if;

  if not public.ve_sede((select auth.uid()), v_trabajo.sede_id) then
    raise exception 'No tienes acceso al taller de este trabajo';
  end if;

  if _participante_id is not null then
    select *
    into v_participante
    from public.ecosistema_participantes
    where id = _participante_id
      and estado = 'activo';

    if v_participante.id is null then
      raise exception 'El servicio externo no existe o está inactivo';
    end if;

    if not exists (
      select 1
      from public.participante_especialidades pe
      join public.especialidades e
        on e.id = pe.especialidad_id
      where pe.participante_id = _participante_id
        and e.activa = true
        and e.categoria = 'Producción'
        and lower(
          regexp_replace(
            translate(coalesce(e.nombre, ''), 'áéíóúÁÉÍÓÚüÜñÑ', 'aeiouAEIOUuUnN'),
            '[^a-z0-9]+',
            '',
            'g'
          )
        )
        =
        lower(
          regexp_replace(
            translate(coalesce(v_trabajo.area, ''), 'áéíóúÁÉÍÓÚüÜñÑ', 'aeiouAEIOUuUnN'),
            '[^a-z0-9]+',
            '',
            'g'
          )
        )
    ) then
      raise exception 'El participante externo no tiene configurada la especialidad %', v_trabajo.area;
    end if;
  end if;

  update public.trabajos
  set participante_id = _participante_id,
      responsable_user_id = null,
      updated_at = now()
  where id = _trabajo_id
  returning * into v_trabajo;

  return jsonb_build_object(
    'trabajo_id', v_trabajo.id,
    'participante_id', v_trabajo.participante_id,
    'responsable_user_id', v_trabajo.responsable_user_id
  );
end;
$$;

revoke all on function public.asignar_participante_externo_trabajo(uuid, uuid) from public, anon;
grant execute on function public.asignar_participante_externo_trabajo(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
