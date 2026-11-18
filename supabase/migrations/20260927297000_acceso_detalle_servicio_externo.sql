begin;

create or replace function public.obtener_trabajo_operativo(_trabajo_id uuid)
returns public.trabajos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_trabajo public.trabajos;
begin
  if v_uid is null then
    raise exception 'Sesión no válida';
  end if;

  select *
  into v_trabajo
  from public.trabajos
  where id = _trabajo_id;

  if v_trabajo.id is null then
    raise exception 'Trabajo no encontrado';
  end if;

  if public.has_role(v_uid, 'dueno') then
    return v_trabajo;
  end if;

  if v_trabajo.tipo = 'externo'
     and exists (
       select 1
       from public.participante_cuentas pc
       where pc.user_id = v_uid
         and pc.participante_id = v_trabajo.participante_id
         and pc.estado = 'activo'
     )
     and (
       public.has_role(v_uid, 'gerente')
       or public.has_role(v_uid, 'operario')
     ) then
    return v_trabajo;
  end if;

  if public.has_role(v_uid, 'gerente')
     and public.ve_sede(v_uid, v_trabajo.sede_id) then
    return v_trabajo;
  end if;

  if public.has_role(v_uid, 'operario')
     and public.ve_sede(v_uid, v_trabajo.sede_id)
     and (
       v_trabajo.responsable_user_id = v_uid
       or (
         v_trabajo.responsable_user_id is null
         and exists (
           select 1
           from public.user_areas ua
           where ua.user_id = v_uid
             and lower(trim(ua.area)) = lower(trim(v_trabajo.area))
         )
       )
     ) then
    return v_trabajo;
  end if;

  raise exception 'Este trabajo no está disponible para tu usuario';
end;
$$;

revoke all on function public.obtener_trabajo_operativo(uuid) from public, anon;
grant execute on function public.obtener_trabajo_operativo(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;