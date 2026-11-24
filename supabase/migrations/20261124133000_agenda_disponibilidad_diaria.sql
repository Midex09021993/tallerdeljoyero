-- Disponibilidad diaria administrada por FADILAB.
-- Un día sólo ofrece horarios públicos cuando está marcado como disponible.

begin;

-- Asegura la relación de las demos públicas con sus bloques reservados.
alter table public.solicitudes_demo
  add column if not exists fecha_reunion_at timestamptz;
alter table public.agenda_horarios
  add column if not exists solicitud_demo_id uuid
  references public.solicitudes_demo(id) on delete set null;
create unique index if not exists agenda_horarios_solicitud_demo_uidx
  on public.agenda_horarios(solicitud_demo_id)
  where solicitud_demo_id is not null;

create table if not exists public.agenda_dias_disponibilidad (
  fecha date primary key,
  disponible boolean not null default false,
  actualizado_por uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.agenda_dias_disponibilidad enable row level security;
revoke all on public.agenda_dias_disponibilidad from public, anon, authenticated;

create or replace function public.agenda_listar_dias_disponibilidad(
  _desde date,
  _hasta date
)
returns table (fecha date, disponible boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.agenda_es_administrador() then
    raise exception using errcode = '42501', message = 'Sólo FADILAB puede consultar la disponibilidad diaria.';
  end if;
  if _desde is null or _hasta is null or _hasta <= _desde or _hasta - _desde > 400 then
    raise exception using errcode = '22023', message = 'Rango de fechas no válido.';
  end if;

  return query
  select d.fecha, d.disponible
  from public.agenda_dias_disponibilidad d
  where d.fecha >= _desde and d.fecha < _hasta
  order by d.fecha;
end;
$$;
revoke all on function public.agenda_listar_dias_disponibilidad(date,date) from public, anon;
grant execute on function public.agenda_listar_dias_disponibilidad(date,date) to authenticated;

create or replace function public.agenda_establecer_disponibilidad_dia(
  _fecha date,
  _disponible boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.agenda_es_administrador() then
    raise exception using errcode = '42501', message = 'Sólo FADILAB puede cambiar la disponibilidad.';
  end if;
  if _fecha is null or _fecha < current_date or _fecha > current_date + 365 then
    raise exception using errcode = '22023', message = 'Selecciona una fecha entre hoy y los próximos 365 días.';
  end if;

  insert into public.agenda_dias_disponibilidad(fecha, disponible, actualizado_por, updated_at)
  values (_fecha, _disponible, auth.uid(), now())
  on conflict (fecha) do update
    set disponible = excluded.disponible,
        actualizado_por = excluded.actualizado_por,
        updated_at = now();
end;
$$;
revoke all on function public.agenda_establecer_disponibilidad_dia(date,boolean) from public, anon;
grant execute on function public.agenda_establecer_disponibilidad_dia(date,boolean) to authenticated;

-- La publicación de bloques sólo se permite en días habilitados por FADILAB.
create or replace function public.agenda_crear_horario(
  _inicio_at timestamptz,
  _fin_at timestamptz,
  _zona_horaria text default 'America/Lima'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_fecha date;
begin
  if not public.agenda_es_administrador() then
    raise exception using errcode = '42501', message = 'Sólo el administrador de AURUM LAB puede publicar horarios.';
  end if;
  if _inicio_at is null or _fin_at is null or _inicio_at <= now() or _fin_at <= _inicio_at then
    raise exception using errcode = '22023', message = 'El horario debe ser futuro y tener una hora final posterior.';
  end if;
  if coalesce(length(trim(_zona_horaria)),0) = 0 or length(_zona_horaria) > 80 then
    raise exception using errcode = '22023', message = 'Zona horaria no válida.';
  end if;

  v_fecha := (_inicio_at at time zone coalesce(nullif(trim(_zona_horaria),''),'America/Lima'))::date;
  if not exists (
    select 1 from public.agenda_dias_disponibilidad d
    where d.fecha = v_fecha and d.disponible = true
  ) then
    raise exception using errcode = '22023', message = 'Primero marca este día como disponible en el calendario de FADILAB.';
  end if;

  if exists (
    select 1 from public.agenda_horarios h
    where h.activo = true
      and tstzrange(h.inicio_at, h.fin_at, '[)') && tstzrange(_inicio_at, _fin_at, '[)')
  ) then
    raise exception using errcode = '23505', message = 'Ese horario se cruza con otro bloque publicado.';
  end if;

  insert into public.agenda_horarios(inicio_at, fin_at, zona_horaria, creado_por)
  values (_inicio_at, _fin_at, _zona_horaria, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.agenda_crear_horario(timestamptz,timestamptz,text) from public, anon;
grant execute on function public.agenda_crear_horario(timestamptz,timestamptz,text) to authenticated;

-- Los gerentes sólo reciben bloques pertenecientes a días habilitados.
create or replace function public.agenda_validar_disponibilidad_reserva()
returns trigger
language plpgsql
set search_path = public
as $
begin
  if new.estado in ('pendiente','confirmada') then
    if not exists (
      select 1
      from public.agenda_horarios h
      join public.agenda_dias_disponibilidad d
        on d.fecha = (h.inicio_at at time zone h.zona_horaria)::date
       and d.disponible = true
      where h.id = new.horario_id
    ) then
      raise exception using errcode = '23514',
        message = 'Este día ya no está habilitado para nuevas reservas.';
    end if;
  end if;
  return new;
end;
$;

drop trigger if exists agenda_reservas_validar_disponibilidad on public.agenda_reservas;
create trigger agenda_reservas_validar_disponibilidad
before insert or update of horario_id, estado on public.agenda_reservas
for each row execute function public.agenda_validar_disponibilidad_reserva();

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
    and h.solicitud_demo_id is null
    and h.inicio_at > now()
    and exists (
      select 1 from public.agenda_dias_disponibilidad d
      where d.fecha = (h.inicio_at at time zone h.zona_horaria)::date
        and d.disponible = true
    )
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

-- El formulario público sólo muestra días habilitados.
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
  join public.agenda_dias_disponibilidad d
    on d.fecha = (h.inicio_at at time zone h.zona_horaria)::date
   and d.disponible = true
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

notify pgrst, 'reload schema';
commit;
