-- Texto superior de portada configurable por catálogo.
-- Migración aditiva: no modifica funciones públicas existentes.

begin;

alter table public.catalogo_configuracion
  add column if not exists texto_superior_portada text;

create or replace function public.obtener_texto_superior_portada_publica(_slug text)
returns table (texto_superior_portada text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.texto_superior_portada
  from public.catalogo_configuracion c
  where lower(trim(c.slug)) = lower(trim(_slug))
    and c.visible = true
  limit 1;
$$;

revoke all on function public.obtener_texto_superior_portada_publica(text) from public;
grant execute on function public.obtener_texto_superior_portada_publica(text) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
