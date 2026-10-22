-- Persist the Storage path for each viewer link so Mi Nube can reuse it
-- when the share dialog is reopened, instead of creating a new token each time.
begin;

alter table public.visor_3d_enlaces
  add column if not exists modelo_ruta text;

create index if not exists visor_3d_enlaces_owner_ruta_expira_idx
  on public.visor_3d_enlaces (propietario_id, modelo_ruta, expira_en desc)
  where modelo_ruta is not null;

create or replace function public.crear_enlace_visor_3d(
  _token text,
  _modelo_url text,
  _nombre text,
  _modelo_ruta text
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
  if coalesce(_modelo_ruta, '') = ''
     or split_part(_modelo_ruta, '/', 2) <> auth.uid()::text
     or not exists (
       select 1 from storage.objects o
       where o.bucket_id = 'mi-nube'
         and o.name = _modelo_ruta
         and split_part(o.name, '/', 2) = auth.uid()::text
     ) then
    raise exception 'El modelo no pertenece a tu Mi Nube o ya no existe.';
  end if;

  insert into public.visor_3d_enlaces(token, propietario_id, modelo_url, nombre, expira_en, modelo_ruta)
  values (_token, auth.uid(), _modelo_url, left(coalesce(nullif(btrim(_nombre), ''), 'joya-compartida'), 120), v_expira, _modelo_ruta);

  return v_expira;
end;
$$;

create or replace function public.obtener_enlace_visor_3d(_modelo_ruta text, _nombre text)
returns table(token text, expira_en timestamptz, nombre text)
language plpgsql
security definer
set search_path = public, pg_temp
as $
declare
  v_enlaces integer;
  v_token text;
begin
  if auth.uid() is null then
    return;
  end if;

  -- First use the exact Storage path.
  return query
    select e.token, e.expira_en, e.nombre
    from public.visor_3d_enlaces e
    where e.propietario_id = auth.uid()
      and e.modelo_ruta = _modelo_ruta
      and e.expira_en > now()
    order by e.creado_en desc
    limit 1;
  if found then
    return;
  end if;

  -- Recover a pre-migration link only if its display name is unique for this owner.
  select count(*), min(e.token)
    into v_enlaces, v_token
  from public.visor_3d_enlaces e
  where e.propietario_id = auth.uid()
    and e.modelo_ruta is null
    and e.nombre = left(coalesce(nullif(btrim(_nombre), ''), 'joya-compartida'), 120)
    and e.expira_en > now();

  if v_enlaces = 1 then
    update public.visor_3d_enlaces e
       set modelo_ruta = _modelo_ruta
     where e.token = v_token
       and e.propietario_id = auth.uid()
       and e.modelo_ruta is null;

    return query
      select e.token, e.expira_en, e.nombre
      from public.visor_3d_enlaces e
      where e.token = v_token
        and e.propietario_id = auth.uid()
        and e.expira_en > now()
      limit 1;
  end if;
end;
$;

revoke all on function public.crear_enlace_visor_3d(text, text, text, text) from public, anon;
grant execute on function public.crear_enlace_visor_3d(text, text, text, text) to authenticated;
revoke all on function public.obtener_enlace_visor_3d(text, text) from public, anon;
grant execute on function public.obtener_enlace_visor_3d(text, text) to authenticated;

commit;
