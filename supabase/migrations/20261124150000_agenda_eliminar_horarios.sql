-- Eliminar bloques horarios libres desde el calendario de FADILAB.
-- Los bloques vinculados a reservas o demostraciones nunca se eliminan.

begin;

create or replace function public.agenda_eliminar_horarios(
  _horario_ids uuid[]
)
returns table (
  eliminados integer,
  protegidos integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitados integer;
  v_eliminados integer;
begin
  if not public.agenda_es_administrador() then
    raise exception using
      errcode = '42501',
      message = 'Sólo FADILAB puede eliminar horarios.';
  end if;

  if _horario_ids is null
    or cardinality(_horario_ids) = 0
    or cardinality(_horario_ids) > 100
  then
    raise exception using
      errcode = '22023',
      message = 'Selecciona entre 1 y 100 horarios.';
  end if;

  select count(distinct x.id)::integer
  into v_solicitados
  from unnest(_horario_ids) as x(id);

  -- Bloquea los horarios seleccionados para evitar una reserva concurrente.
  perform h.id
  from public.agenda_horarios h
  where h.id = any(_horario_ids)
  order by h.id
  for update;

  delete from public.agenda_horarios h
  where h.id = any(_horario_ids)
    and h.solicitud_demo_id is null
    and not exists (
      select 1
      from public.agenda_reservas r
      where r.horario_id = h.id
    );

  get diagnostics v_eliminados = row_count;

  return query
  select
    v_eliminados,
    greatest(v_solicitados - v_eliminados, 0);
end;
$$;

revoke all on function public.agenda_eliminar_horarios(uuid[])
from public, anon;

grant execute on function public.agenda_eliminar_horarios(uuid[])
to authenticated;

notify pgrst, 'reload schema';

commit;
