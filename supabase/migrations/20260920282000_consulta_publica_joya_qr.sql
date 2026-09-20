create or replace function public.consultar_joya_publica(_codigo text)
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
security definer
set search_path = ''
stable
as $$
  select j.id, j.codigo, j.nombre, coalesce(s.nombre, 'Sede no disponible') as taller,
    j.metal, j.ley, j.peso, j.talla, j.piedras, j.estado
  from public.inventario_joyas j
  left join public.sedes s on s.id = j.sede_id
  where trim(j.codigo) = trim(_codigo)
  limit 1;
$$;

revoke all on function public.consultar_joya_publica(text) from public, anon, authenticated;
grant execute on function public.consultar_joya_publica(text) to anon, authenticated;
