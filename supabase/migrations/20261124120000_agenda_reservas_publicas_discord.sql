-- Reservas públicas de demostraciones comerciales en horarios publicados por FADILAB.
-- Ejecutar manualmente en Supabase/Lovable Cloud después de desplegar el frontend.

begin;

alter table public.solicitudes_demo
  add column if not exists fecha_reunion_at timestamptz;

alter table public.agenda_horarios
  add column if not exists solicitud_demo_id uuid
  references public.solicitudes_demo(id) on delete set null;

create unique index if not exists agenda_horarios_solicitud_demo_uidx
  on public.agenda_horarios(solicitud_demo_id)
  where solicitud_demo_id is not null;

create or replace function public.agenda_listar_horarios_publicos()
returns table (
  id uuid,
  inicio_at timestamptz,
  fin_at timestamptz,
  zona_horaria text
)
language sql
stable
security definer
set search_path = public
as $$
  select h.id, h.inicio_at, h.fin_at, h.zona_horaria
  from public.agenda_horarios h
  where h.activo = true
    and h.solicitud_demo_id is null
    and h.inicio_at > now()
    and not exists (
      select 1 from public.agenda_eventos e
      where e.activo
        and tstzrange(e.inicio_at,e.fin_at,'[)') && tstzrange(h.inicio_at,h.fin_at,'[)')
    )
    and not exists (
      select 1 from public.agenda_reservas r
      where r.estado in ('pendiente','confirmada')
        and r.horario_id = h.id
    )
  order by h.inicio_at
  limit 120;
$$;
revoke all on function public.agenda_listar_horarios_publicos() from public, anon, authenticated;
grant execute on function public.agenda_listar_horarios_publicos() to anon, authenticated;

create or replace function public.agenda_solicitar_demo_publica(
  _horario_id uuid,
  _empresa text,
  _nombre text,
  _telefono text,
  _email text,
  _interes text,
  _horario_preferido text default null
)
returns table (solicitud_id uuid, fecha_reunion_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_horario public.agenda_horarios%rowtype;
  v_solicitud_id uuid;
begin
  if _empresa is null or char_length(btrim(_empresa)) not between 2 and 140
    or _nombre is null or char_length(btrim(_nombre)) not between 2 and 120
    or _telefono is null or char_length(btrim(_telefono)) not between 7 and 30
    or _email is null or char_length(btrim(_email)) not between 5 and 160
    or _email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$'
    or _interes is null or char_length(btrim(_interes)) not between 3 and 120
    or (_horario_preferido is not null and _horario_preferido not in ('Mañana','Tarde')) then
    raise exception using errcode = '22023', message = 'Revisa los datos del formulario de demostración.';
  end if;

  select * into v_horario
  from public.agenda_horarios
  where id = _horario_id and activo = true
  for update;

  if not found or v_horario.inicio_at <= now() or v_horario.solicitud_demo_id is not null then
    raise exception using errcode = 'P0002', message = 'Ese horario acaba de dejar de estar disponible. Selecciona otro.';
  end if;

  if exists (
    select 1 from public.agenda_eventos e
    where e.activo
      and tstzrange(e.inicio_at,e.fin_at,'[)') && tstzrange(v_horario.inicio_at,v_horario.fin_at,'[)')
  ) or exists (
    select 1 from public.agenda_reservas r
    where r.horario_id = v_horario.id and r.estado in ('pendiente','confirmada')
  ) then
    raise exception using errcode = '23505', message = 'Ese horario ya no está disponible. Selecciona otro.';
  end if;

  insert into public.solicitudes_demo(
    empresa,nombre,telefono,email,interes,horario_preferido,origen,estado,fecha_reunion_at
  ) values (
    btrim(_empresa),btrim(_nombre),btrim(_telefono),lower(btrim(_email)),
    btrim(_interes),_horario_preferido,'landing_home','demo_agendada',v_horario.inicio_at
  ) returning id into v_solicitud_id;

  update public.agenda_horarios
  set solicitud_demo_id = v_solicitud_id
  where id = v_horario.id;

  return query select v_solicitud_id, v_horario.inicio_at;
end;
$$;
revoke all on function public.agenda_solicitar_demo_publica(uuid,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.agenda_solicitar_demo_publica(uuid,text,text,text,text,text,text) to anon, authenticated;

-- Las solicitudes públicas deben entrar por la función transaccional para bloquear el horario.
drop policy if exists "Public can submit demo requests" on public.solicitudes_demo;
revoke insert on public.solicitudes_demo from anon, authenticated;

-- Devuelve la fecha reservada a la Agenda administrativa.
drop function if exists public.agenda_listar_solicitudes_demo();
create function public.agenda_listar_solicitudes_demo()
returns table (
  id uuid,
  empresa text,
  nombre text,
  telefono text,
  email text,
  interes text,
  horario_preferido text,
  estado text,
  created_at timestamptz,
  fecha_reunion_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.agenda_es_administrador() then
    raise exception using errcode = '42501', message = 'Sólo el administrador de FADILAB puede consultar las solicitudes de demostración.';
  end if;

  return query
  select d.id, d.empresa, d.nombre, d.telefono, d.email,
         d.interes, d.horario_preferido, d.estado, d.created_at,
         coalesce(d.fecha_reunion_at, h.inicio_at)
  from public.solicitudes_demo d
  left join public.agenda_horarios h on h.solicitud_demo_id = d.id
  where d.estado <> 'cerrado'
  order by
    case d.estado when 'pendiente' then 0 when 'contactado' then 1 when 'demo_agendada' then 2 else 3 end,
    d.created_at desc
  limit 200;
end;
$$;
revoke all on function public.agenda_listar_solicitudes_demo() from public, anon;
grant execute on function public.agenda_listar_solicitudes_demo() to authenticated;

notify pgrst, 'reload schema';
commit;
