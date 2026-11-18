begin;

-- Agenda de asesorías de AURUM LAB.
-- La administración está reservada a cuentas "dueno" vinculadas al participante FADILAB.
-- Los gerentes pueden consultar disponibilidad y gestionar únicamente sus propias reservas.

create table if not exists public.agenda_horarios (
  id uuid primary key default gen_random_uuid(),
  inicio_at timestamptz not null,
  fin_at timestamptz not null,
  zona_horaria text not null default 'America/Lima',
  creado_por uuid not null references auth.users(id) on delete restrict,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint agenda_horarios_rango_valido check (fin_at > inicio_at)
);

create table if not exists public.agenda_reservas (
  id uuid primary key default gen_random_uuid(),
  horario_id uuid not null references public.agenda_horarios(id) on delete restrict,
  solicitante_id uuid not null references auth.users(id) on delete restrict,
  participante_id uuid references public.ecosistema_participantes(id) on delete set null,
  tema text not null check (char_length(btrim(tema)) between 3 and 160),
  descripcion text check (descripcion is null or char_length(descripcion) <= 1000),
  estado text not null default 'pendiente'
    check (estado in ('pendiente','confirmada','cancelada','realizada')),
  enlace_reunion text,
  nota_administrador text,
  gestionado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agenda_horarios_disponibles_idx
  on public.agenda_horarios (inicio_at) where activo = true;
create index if not exists agenda_reservas_solicitante_idx
  on public.agenda_reservas (solicitante_id, created_at desc);
create index if not exists agenda_reservas_horario_idx
  on public.agenda_reservas (horario_id, estado);
create unique index if not exists agenda_reservas_horario_activa_uidx
  on public.agenda_reservas (horario_id)
  where estado in ('pendiente','confirmada');

alter table public.agenda_horarios enable row level security;
alter table public.agenda_reservas enable row level security;
revoke all on public.agenda_horarios from anon, authenticated;
revoke all on public.agenda_reservas from anon, authenticated;

create or replace function public.agenda_es_administrador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role::text = 'dueno'
    )
    and (
      exists (
        select 1
        from public.participante_cuentas pc
        join public.ecosistema_participantes ep on ep.id = pc.participante_id
        where pc.user_id = auth.uid()
          and pc.estado = 'activo'
          and ep.estado = 'activo'
          and lower(trim(ep.nombre)) = 'fadilab'
      )
      or exists (
        select 1
        from public.profiles p
        join public.ecosistema_participantes ep on ep.id = p.participante_id
        where p.id = auth.uid()
          and ep.estado = 'activo'
          and lower(trim(ep.nombre)) = 'fadilab'
      )
    );
$$;
revoke all on function public.agenda_es_administrador() from public, anon;
grant execute on function public.agenda_es_administrador() to authenticated;

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
  order by h.inicio_at
  limit 100;
$$;
revoke all on function public.agenda_listar_horarios() from public, anon;
grant execute on function public.agenda_listar_horarios() to authenticated;

create or replace function public.agenda_listar_reservas()
returns table (
  id uuid,
  horario_id uuid,
  tema text,
  descripcion text,
  estado text,
  enlace_reunion text,
  nota_administrador text,
  created_at timestamptz,
  inicio_at timestamptz,
  fin_at timestamptz,
  solicitante_nombre text,
  taller_nombre text,
  solicitante_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'Debes iniciar sesión.';
  end if;

  if not public.agenda_es_administrador()
     and not exists (
       select 1 from public.user_roles ur
       where ur.user_id = auth.uid()
         and ur.role::text in ('gerente','dueno')
     ) then
    raise exception using errcode = '42501', message = 'La agenda está disponible para dueños y gerentes de taller.';
  end if;

  return query
  select
    r.id, r.horario_id, r.tema, r.descripcion, r.estado, r.enlace_reunion,
    r.nota_administrador, r.created_at, h.inicio_at, h.fin_at,
    coalesce(nullif(trim(concat_ws(' ', p.nombre, p.apellidos)), ''), p.usuario, 'Usuario'),
    coalesce(ep.nombre, 'Taller'),
    r.solicitante_id
  from public.agenda_reservas r
  join public.agenda_horarios h on h.id = r.horario_id
  left join public.profiles p on p.id = r.solicitante_id
  left join public.ecosistema_participantes ep on ep.id = r.participante_id
  where public.agenda_es_administrador() or r.solicitante_id = auth.uid()
  order by h.inicio_at desc
  limit 200;
end;
$$;
revoke all on function public.agenda_listar_reservas() from public, anon;
grant execute on function public.agenda_listar_reservas() to authenticated;

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

create or replace function public.agenda_reservar(
  _horario_id uuid,
  _tema text,
  _descripcion text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_participante_id uuid;
  v_horario public.agenda_horarios%rowtype;
  v_reserva_id uuid;
begin
  if v_uid is null then
    raise exception using errcode = '28000', message = 'Debes iniciar sesión.';
  end if;
  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = v_uid and ur.role::text in ('gerente','dueno')
  ) then
    raise exception using errcode = '42501', message = 'Sólo los dueños y gerentes pueden solicitar asesorías.';
  end if;
  if _tema is null or char_length(btrim(_tema)) not between 3 and 160
     or (_descripcion is not null and char_length(_descripcion) > 1000) then
    raise exception using errcode = '22023', message = 'Revisa el tema y la descripción de la asesoría.';
  end if;

  select pc.participante_id into v_participante_id
  from public.participante_cuentas pc
  join public.ecosistema_participantes ep on ep.id = pc.participante_id
  where pc.user_id = v_uid and pc.estado = 'activo' and ep.estado = 'activo'
  order by pc.created_at
  limit 1;

  if v_participante_id is null then
    select p.participante_id into v_participante_id
    from public.profiles p
    join public.ecosistema_participantes ep on ep.id = p.participante_id and ep.estado = 'activo'
    where p.id = v_uid;
  end if;
  if v_participante_id is null then
    raise exception using errcode = '42501', message = 'Tu cuenta no está vinculada a un taller activo.';
  end if;

  select * into v_horario
  from public.agenda_horarios
  where id = _horario_id and activo = true
  for update;
  if not found or v_horario.inicio_at <= now() then
    raise exception using errcode = 'P0002', message = 'El horario ya no está disponible.';
  end if;

  if exists (
    select 1 from public.agenda_reservas r
    where r.horario_id = _horario_id and r.estado in ('pendiente','confirmada')
  ) then
    raise exception using errcode = '23505', message = 'Ese horario acaba de ser reservado. Elige otro.';
  end if;

  insert into public.agenda_reservas(horario_id, solicitante_id, participante_id, tema, descripcion)
  values (_horario_id, v_uid, v_participante_id, btrim(_tema), nullif(btrim(_descripcion), ''))
  returning id into v_reserva_id;
  return v_reserva_id;
end;
$$;
revoke all on function public.agenda_reservar(uuid,text,text) from public, anon;
grant execute on function public.agenda_reservar(uuid,text,text) to authenticated;

create or replace function public.agenda_cancelar_reserva(_reserva_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.agenda_reservas
  set estado = 'cancelada', updated_at = now()
  where id = _reserva_id
    and estado in ('pendiente','confirmada')
    and (solicitante_id = auth.uid() or public.agenda_es_administrador());
  if not found then
    raise exception using errcode = '42501', message = 'No puedes cancelar esta reserva o ya no está activa.';
  end if;
end;
$$;
revoke all on function public.agenda_cancelar_reserva(uuid) from public, anon;
grant execute on function public.agenda_cancelar_reserva(uuid) to authenticated;

create or replace function public.agenda_actualizar_reserva(
  _reserva_id uuid,
  _estado text,
  _enlace_reunion text default null,
  _nota_administrador text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.agenda_es_administrador() then
    raise exception using errcode = '42501', message = 'Sólo el administrador de AURUM LAB puede gestionar las reservas.';
  end if;
  if _estado not in ('confirmada','cancelada','realizada') then
    raise exception using errcode = '22023', message = 'Estado de reserva no válido.';
  end if;
  if _enlace_reunion is not null and (length(_enlace_reunion) > 1000 or _enlace_reunion !~ '^https://') then
    raise exception using errcode = '22023', message = 'El enlace de reunión debe ser una URL HTTPS válida.';
  end if;
  update public.agenda_reservas
  set estado = _estado,
      enlace_reunion = coalesce(_enlace_reunion, enlace_reunion),
      nota_administrador = coalesce(_nota_administrador, nota_administrador),
      gestionado_por = auth.uid(),
      updated_at = now()
  where id = _reserva_id
    and estado in ('pendiente','confirmada');
  if not found then
    raise exception using errcode = 'P0002', message = 'No se encontró una reserva activa para actualizar.';
  end if;
end;
$$;
revoke all on function public.agenda_actualizar_reserva(uuid,text,text,text) from public, anon;
grant execute on function public.agenda_actualizar_reserva(uuid,text,text,text) to authenticated;

notify pgrst, 'reload schema';
commit;
