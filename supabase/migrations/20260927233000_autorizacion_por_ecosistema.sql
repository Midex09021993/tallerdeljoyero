-- Autorizacion canonica por Ecosistema.
-- La pertenencia de un usuario a un taller se resuelve mediante participante_cuentas.
-- sedes queda solo como compatibilidad temporal durante la migracion.

create or replace function public.mi_participante(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select pc.participante_id
  from public.participante_cuentas pc
  join public.ecosistema_participantes ep on ep.id = pc.participante_id
  where pc.user_id = _user_id
    and pc.estado = 'activo'
    and ep.estado = 'activo'
  order by pc.created_at asc
  limit 1
$$;

create or replace function public.tiene_participante(_user_id uuid, _participante_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep on ep.id = pc.participante_id
    where pc.user_id = _user_id
      and pc.participante_id = _participante_id
      and pc.estado = 'activo'
      and ep.estado = 'activo'
  )
$$;

-- Compatibilidad: las politicas antiguas que comparan sede_id pasan a
-- resolver primero el participante del usuario.
create or replace function public.mi_sede(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ep.sede_id
  from public.participante_cuentas pc
  join public.ecosistema_participantes ep on ep.id = pc.participante_id
  where pc.user_id = _user_id
    and pc.estado = 'activo'
    and ep.estado = 'activo'
  order by pc.created_at asc
  limit 1
$$;

create or replace function public.ve_sede(_user_id uuid, _sede_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_role(_user_id, 'dueno')
    or _sede_id is null
    or exists (
      select 1
      from public.ecosistema_participantes ep
      where ep.sede_id = _sede_id
        and ep.estado = 'activo'
        and public.tiene_participante(_user_id, ep.id)
    )
$$;

revoke execute on function public.mi_participante(uuid) from public;
revoke execute on function public.tiene_participante(uuid,uuid) from public;
revoke execute on function public.mi_sede(uuid) from public;
revoke execute on function public.ve_sede(uuid,uuid) from public;
grant execute on function public.mi_participante(uuid) to authenticated;
grant execute on function public.tiene_participante(uuid,uuid) to authenticated;
grant execute on function public.mi_sede(uuid) to authenticated;
grant execute on function public.ve_sede(uuid,uuid) to authenticated;

-- Verificacion estructural: toda cuenta debe apuntar a un participante existente.
do $$
declare v_count integer;
begin
  select count(*) into v_count
  from public.participante_cuentas pc
  left join public.ecosistema_participantes ep on ep.id = pc.participante_id
  where ep.id is null;

  if v_count > 0 then
    raise exception 'Autorizacion invalida: existen % cuentas sin participante valido', v_count;
  end if;
end $$;

create index if not exists participante_cuentas_user_participante_idx
  on public.participante_cuentas(user_id, participante_id);
