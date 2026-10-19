-- Enlaces cortos para el visualizador público de joyas.
-- El token aleatorio no revela la URL firmada ni el nombre del archivo.
begin;

create table if not exists public.visor_3d_enlaces (
  token text primary key check (token ~ '^[a-f0-9]{24}$'),
  propietario_id uuid not null references auth.users(id) on delete cascade,
  modelo_url text not null check (
    modelo_url like 'https://%' and
    position('/storage/v1/object/sign/mi-nube/' in modelo_url) > 0
  ),
  nombre text not null default 'joya-compartida',
  expira_en timestamptz not null,
  creado_en timestamptz not null default now()
);

create index if not exists visor_3d_enlaces_expira_idx
  on public.visor_3d_enlaces (expira_en);

alter table public.visor_3d_enlaces enable row level security;
revoke all on table public.visor_3d_enlaces from anon, authenticated, public;

create or replace function public.crear_enlace_visor_3d(
  _token text,
  _modelo_url text,
  _nombre text
)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expira timestamptz := now() + interval '3 days';
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para compartir una joya.';
  end if;
  if _token !~ '^[a-f0-9]{24}$' then
    raise exception 'Identificador de enlace no válido.';
  end if;
  if _modelo_url not like 'https://%'
     or position('/storage/v1/object/sign/mi-nube/' in _modelo_url) = 0
     or (position('?token=' in _modelo_url) = 0 and position('&token=' in _modelo_url) = 0) then
    raise exception 'La URL del modelo no es un enlace firmado válido de Mi Nube.';
  end if;

  insert into public.visor_3d_enlaces(token, propietario_id, modelo_url, nombre, expira_en)
  values (_token, auth.uid(), _modelo_url, left(coalesce(nullif(btrim(_nombre), ''), 'joya-compartida'), 120), v_expira);

  return v_expira;
end;
$$;

create or replace function public.resolver_enlace_visor_3d(_token text)
returns table(modelo_url text, nombre text, expira_en timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.modelo_url, e.nombre, e.expira_en
  from public.visor_3d_enlaces e
  where e.token = _token
    and e.expira_en > now()
  limit 1;
$$;

revoke all on function public.crear_enlace_visor_3d(text, text, text) from public, anon;
grant execute on function public.crear_enlace_visor_3d(text, text, text) to authenticated;
revoke all on function public.resolver_enlace_visor_3d(text) from public;
grant execute on function public.resolver_enlace_visor_3d(text) to anon, authenticated;

commit;
