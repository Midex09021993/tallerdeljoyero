alter table public.inventario_joyas
  add column if not exists qr_token uuid;

update public.inventario_joyas
set qr_token = gen_random_uuid()
where qr_token is null;

alter table public.inventario_joyas
  alter column qr_token set default gen_random_uuid(),
  alter column qr_token set not null;

create unique index if not exists inventario_joyas_qr_token_uidx
  on public.inventario_joyas (qr_token);

create or replace function public.consultar_joya_publica(_token uuid)
returns table (
  id uuid,
  codigo text,
  nombre text,
  taller text,
  metal text,
  ley text,
  peso numeric,
  talla text,
  piedras text,
  estado text
)
language sql
stable
security definer
set search_path = ''
as $$
  select j.id, j.codigo, j.nombre, coalesce(s.nombre, '') as taller,
    j.metal, j.ley, j.peso, j.talla, j.piedras, j.estado
  from public.inventario_joyas j
  left join public.sedes s on s.id = j.sede_id
  where j.qr_token = _token
    and coalesce(j.estado, '') <> 'eliminada'
  limit 1;
$$;

revoke all on function public.consultar_joya_publica(uuid) from public, anon, authenticated;
grant execute on function public.consultar_joya_publica(uuid) to anon, authenticated;