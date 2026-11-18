-- Correccion canonica del guardado de capacidades por sede.
-- Elimina la dependencia de ve_sede()/has_role() dentro de esta RPC.
-- La autorizacion se resuelve directamente desde user_roles +
-- participante_cuentas + ecosistema_participantes.

create or replace function public.guardar_configuracion_taller(
  _sede_id uuid,
  _especialidad_ids uuid[] default '{}'::uuid[],
  _produccion_activa boolean default false,
  _servicios_externos_activos boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_es_dueno boolean := false;
  v_es_gerente boolean := false;
  v_pertenece_sede boolean := false;
  v_total integer := 0;
begin
  if v_uid is null then
    raise exception using
      errcode = '28000',
      message = 'Sesión no autenticada';
  end if;

  -- Roles reales del usuario.
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = v_uid
      and ur.role = 'dueno'::public.app_role
  ) into v_es_dueno;

  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = v_uid
      and ur.role = 'gerente'::public.app_role
  ) into v_es_gerente;

  -- La sede debe existir.
  if not exists (
    select 1
    from public.sedes s
    where s.id = _sede_id
  ) then
    raise exception using
      errcode = '22023',
      message = 'La sede seleccionada no existe';
  end if;

  -- Un gerente solo puede modificar su sede activa.
  if not v_es_dueno and v_es_gerente then
    select exists (
      select 1
      from public.participante_cuentas pc
      join public.ecosistema_participantes ep
        on ep.id = pc.participante_id
      where pc.user_id = v_uid
        and pc.estado = 'activo'
        and ep.estado = 'activo'
        and ep.sede_id = _sede_id
    ) into v_pertenece_sede;
  end if;

  if not v_es_dueno and not (v_es_gerente and v_pertenece_sede) then
    raise exception using
      errcode = '42501',
      message = 'No tienes permisos para configurar este taller';
  end if;

  -- La RPC es SECURITY DEFINER, por lo que el guardado no depende
  -- de las politicas RLS de las tablas internas.
  delete from public.sede_especialidades
  where sede_id = _sede_id;

  insert into public.sede_especialidades (
    sede_id,
    especialidad_id
  )
  select
    _sede_id,
    x.especialidad_id
  from (
    select distinct unnest(
      coalesce(_especialidad_ids, '{}'::uuid[])
    ) as especialidad_id
  ) x
  join public.especialidades e
    on e.id = x.especialidad_id
   and e.activa = true;

  get diagnostics v_total = row_count;

  insert into public.sede_modalidades (
    sede_id,
    produccion_activa,
    servicios_externos_activos
  )
  values (
    _sede_id,
    coalesce(_produccion_activa, false),
    coalesce(_servicios_externos_activos, false)
  )
  on conflict (sede_id)
  do update set
    produccion_activa = excluded.produccion_activa,
    servicios_externos_activos = excluded.servicios_externos_activos,
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'sede_id', _sede_id,
    'capacidades_guardadas', v_total,
    'produccion_activa', coalesce(_produccion_activa, false),
    'servicios_externos_activos', coalesce(_servicios_externos_activos, false)
  );
end;
$$;

revoke all on function public.guardar_configuracion_taller(
  uuid,
  uuid[],
  boolean,
  boolean
) from public, anon;

grant execute on function public.guardar_configuracion_taller(
  uuid,
  uuid[],
  boolean,
  boolean
) to authenticated;

notify pgrst, 'reload schema';
