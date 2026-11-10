begin;

create table if not exists public.agenda_eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(btrim(titulo)) between 3 and 120),
  tipo text not null default 'bloqueo'
    check (tipo in ('reunion','capacitacion','evento','bloqueo','vacaciones','otro')),
  descripcion text check (descripcion is null or char_length(descripcion) <= 1000),
  inicio_at timestamptz not null,
  fin_at timestamptz not null,
  todo_el_dia boolean not null default false,
  creado_por uuid not null references auth.users(id) on delete restrict,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint agenda_eventos_rango_valido check (fin_at > inicio_at)
);
create index if not exists agenda_eventos_rango_idx
  on public.agenda_eventos (inicio_at, fin_at) where activo = true;
alter table public.agenda_eventos enable row level security;
revoke all on public.agenda_eventos from anon, authenticated;

create or replace function public.agenda_listar_eventos(_desde timestamptz, _hasta timestamptz)
returns table (
  id uuid,
  titulo text,
  tipo text,
  descripcion text,
  inicio_at timestamptz,
  fin_at timestamptz,
  todo_el_dia boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.agenda_es_administrador() then
    raise exception using errcode = '42501', message = 'Sólo FADILAB puede consultar los eventos internos.';
  end if;
  if _desde is null or _hasta is null or _hasta <= _desde or _hasta - _desde > interval '400 days' then
    raise exception using errcode = '22023', message = 'Rango de calendario no válido.';
  end if;
  return query
  select e.id, e.titulo, e.tipo, e.descripcion, e.inicio_at, e.fin_at, e.todo_el_dia
  from public.agenda_eventos e
  where e.activo
    and e.inicio_at < _hasta
    and e.fin_at > _desde
  order by e.inicio_at;
end;
$$;
revoke all on function public.agenda_listar_eventos(timestamptz,timestamptz) from public, anon;
grant execute on function public.agenda_listar_eventos(timestamptz,timestamptz) to authenticated;

create or replace function public.agenda_crear_evento(
  _titulo text,
  _tipo text,
  _descripcion text,
  _inicio_at timestamptz,
  _fin_at timestamptz,
  _todo_el_dia boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.agenda_es_administrador() then
    raise exception using errcode = '42501', message = 'Sólo el administrador de FADILAB puede crear eventos.';
  end if;
  if _titulo is null or char_length(btrim(_titulo)) not between 3 and 120
     or _tipo not in ('reunion','capacitacion','evento','bloqueo','vacaciones','otro')
     or (_descripcion is not null and char_length(_descripcion) > 1000)
     or _inicio_at is null or _fin_at is null or _fin_at <= _inicio_at
     or _inicio_at <= now() then
    raise exception using errcode = '22023', message = 'Revisa el título, tipo y duración del evento. Debe ser futuro.';
  end if;
  if exists (
    select 1 from public.agenda_reservas r
    join public.agenda_horarios h on h.id = r.horario_id
    where r.estado in ('pendiente','confirmada')
      and tstzrange(h.inicio_at,h.fin_at,'[)') && tstzrange(_inicio_at,_fin_at,'[)')
  ) then
    raise exception using errcode = '23505', message = 'Ese evento se cruza con una asesoría que ya fue solicitada o confirmada. Revisa primero las reservas.';
  end if;
  if exists (
    select 1 from public.agenda_eventos e
    where e.activo and tstzrange(e.inicio_at,e.fin_at,'[)') && tstzrange(_inicio_at,_fin_at,'[)')
  ) then
    raise exception using errcode = '23505', message = 'Ese evento se cruza con otro compromiso de FADILAB.';
  end if;

  insert into public.agenda_eventos(titulo,tipo,descripcion,inicio_at,fin_at,todo_el_dia,creado_por)
  values (btrim(_titulo),_tipo,nullif(btrim(_descripcion),''),_inicio_at,_fin_at,coalesce(_todo_el_dia,false),auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.agenda_crear_evento(text,text,text,timestamptz,timestamptz,boolean) from public, anon;
grant execute on function public.agenda_crear_evento(text,text,text,timestamptz,timestamptz,boolean) to authenticated;

create or replace function public.agenda_eliminar_evento(_evento_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.agenda_es_administrador() then
    raise exception using errcode = '42501', message = 'Sólo FADILAB puede eliminar eventos internos.';
  end if;
  update public.agenda_eventos
  set activo = false
  where id = _evento_id and activo = true;
  if not found then
    raise exception using errcode = 'P0002', message = 'No se encontró el evento activo.';
  end if;
end;
$$;
revoke all on function public.agenda_eliminar_evento(uuid) from public, anon;
grant execute on function public.agenda_eliminar_evento(uuid) to authenticated;

-- Los horarios de asesoría se muestran sólo si no se cruzan con un evento interno.
create or replace function public.agenda_listar_horarios()
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
  where auth.uid() is not null
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role::text in ('gerente','dueno')
    )
    and h.activo = true
    and h.inicio_at > now()
    and not exists (
      select 1 from public.agenda_reservas r
      where r.horario_id = h.id
        and r.estado in ('pendiente','confirmada')
    )
    and not exists (
      select 1 from public.agenda_eventos e
      where e.activo
        and tstzrange(e.inicio_at,e.fin_at,'[)') && tstzrange(h.inicio_at,h.fin_at,'[)')
    )
  order by h.inicio_at
  limit 300;
$$;
revoke all on function public.agenda_listar_horarios() from public, anon;
grant execute on function public.agenda_listar_horarios() to authenticated;

notify pgrst, 'reload schema';
commit;
