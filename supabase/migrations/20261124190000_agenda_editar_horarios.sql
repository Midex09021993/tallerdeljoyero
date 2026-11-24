-- Permite editar bloques horarios libres desde la Agenda de FADILAB.
-- No permite mover horarios que ya estén vinculados a demostraciones o reservas activas.

begin;

create or replace function public.agenda_actualizar_horario(
  _horario_id uuid,
  _inicio_at timestamptz,
  _fin_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_horario public.agenda_horarios%rowtype;
begin
  if not public.agenda_es_administrador() then
    raise exception using
      errcode = '42501',
      message = 'Sólo FADILAB puede editar horarios.';
  end if;

  if _horario_id is null
    or _inicio_at is null
    or _fin_at is null
    or _inicio_at <= now()
    or _fin_at <= _inicio_at
  then
    raise exception using
      errcode = '22023',
      message = 'Selecciona un horario futuro válido.';
  end if;

  select *
  into v_horario
  from public.agenda_horarios
  where id = _horario_id
    and activo = true
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'El horario ya no existe o está inactivo.';
  end if;

  if v_horario.solicitud_demo_id is not null
    or exists (
      select 1
      from public.agenda_reservas r
      where r.horario_id = _horario_id
        and r.estado in ('pendiente', 'confirmada')
    )
  then
    raise exception using
      errcode = '23514',
      message = 'Este horario tiene una reserva o demostración asociada y no se puede editar.';
  end if;

  if exists (
    select 1
    from public.agenda_horarios h
    where h.id <> _horario_id
      and h.activo = true
      and tstzrange(h.inicio_at, h.fin_at, '[)')
          && tstzrange(_inicio_at, _fin_at, '[)')
  ) then
    raise exception using
      errcode = '23505',
      message = 'El nuevo horario se cruza con otro bloque publicado.';
  end if;

  if exists (
    select 1
    from public.agenda_eventos e
    where e.activo = true
      and tstzrange(e.inicio_at, e.fin_at, '[)')
          && tstzrange(_inicio_at, _fin_at, '[)')
  ) then
    raise exception using
      errcode = '23505',
      message = 'El nuevo horario coincide con un evento del calendario.';
  end if;

  update public.agenda_horarios
  set inicio_at = _inicio_at,
      fin_at = _fin_at
  where id = _horario_id;
end;
$$;

revoke all on function public.agenda_actualizar_horario(uuid, timestamptz, timestamptz)
from public, anon;

grant execute on function public.agenda_actualizar_horario(uuid, timestamptz, timestamptz)
to authenticated;

notify pgrst, 'reload schema';

commit;
