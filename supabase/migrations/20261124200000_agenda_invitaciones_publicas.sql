-- Invitaciones públicas configurables por cada bloque horario de FADILAB.
-- Ejecutar manualmente en Supabase/Lovable Cloud.

begin;

alter table public.agenda_horarios
  add column if not exists invitacion_titulo text,
  add column if not exists invitacion_descripcion text,
  add column if not exists invitacion_url text;

alter table public.agenda_horarios
  drop constraint if exists agenda_horarios_invitacion_titulo_check,
  add constraint agenda_horarios_invitacion_titulo_check
    check (invitacion_titulo is null or char_length(btrim(invitacion_titulo)) between 3 and 120),
  drop constraint if exists agenda_horarios_invitacion_descripcion_check,
  add constraint agenda_horarios_invitacion_descripcion_check
    check (invitacion_descripcion is null or char_length(invitacion_descripcion) <= 1200),
  drop constraint if exists agenda_horarios_invitacion_url_check,
  add constraint agenda_horarios_invitacion_url_check
    check (invitacion_url is null or (char_length(invitacion_url) <= 500 and invitacion_url ~* '^https://'));

create or replace function public.agenda_guardar_invitacion_horario(
  _horario_id uuid,
  _titulo text,
  _descripcion text,
  _url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.agenda_es_administrador() then
    raise exception using errcode = '42501',
      message = 'Sólo el administrador de FADILAB puede editar invitaciones.';
  end if;

  if _horario_id is null
    or (_titulo is not null and char_length(btrim(_titulo)) not between 3 and 120)
    or (_descripcion is not null and char_length(_descripcion) > 1200)
    or (_titulo is not null and nullif(btrim(_descripcion), '') is null)
    or (_url is not null and (char_length(_url) > 500 or _url !~* '^https://'))
  then
    raise exception using errcode = '22023',
      message = 'Revisa el título, la descripción y el enlace https de la invitación.';
  end if;

  update public.agenda_horarios
  set invitacion_titulo = nullif(btrim(_titulo), ''),
      invitacion_descripcion = nullif(btrim(_descripcion), ''),
      invitacion_url = nullif(btrim(_url), '')
  where id = _horario_id and activo = true;

  if not found then
    raise exception using errcode = 'P0002',
      message = 'No se encontró el horario activo.';
  end if;
end;
$$;

revoke all on function public.agenda_guardar_invitacion_horario(uuid,text,text,text)
from public, anon;
grant execute on function public.agenda_guardar_invitacion_horario(uuid,text,text,text)
to authenticated;

-- Ampliar el listado interno para que FADILAB pueda editar la invitación.
drop function if exists public.agenda_listar_horarios();
create function public.agenda_listar_horarios()
returns table (
  id uuid,
  inicio_at timestamptz,
  fin_at timestamptz,
  zona_horaria text,
  invitacion_titulo text,
  invitacion_descripcion text,
  invitacion_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select h.id, h.inicio_at, h.fin_at, h.zona_horaria,
         h.invitacion_titulo, h.invitacion_descripcion, h.invitacion_url
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

-- El calendario público recibe sólo invitaciones de horarios que siguen libres.
drop function if exists public.agenda_listar_horarios_publicos();
create function public.agenda_listar_horarios_publicos()
returns table (
  id uuid,
  inicio_at timestamptz,
  fin_at timestamptz,
  zona_horaria text,
  invitacion_titulo text,
  invitacion_descripcion text,
  invitacion_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select h.id, h.inicio_at, h.fin_at, h.zona_horaria,
         h.invitacion_titulo, h.invitacion_descripcion, h.invitacion_url
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

notify pgrst, 'reload schema';

commit;
