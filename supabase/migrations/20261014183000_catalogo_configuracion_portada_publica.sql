-- Exponer solo la configuración pública del carrusel sin cambiar
-- la firma de obtener_catalogo_publico (mantiene compatibilidad con enlaces existentes).
begin;

create or replace function public.obtener_configuracion_portada_publica(_slug text)
returns table (
  frase_portada text,
  imagenes_portada jsonb,
  intervalo_portada_segundos integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.frase_portada,
    c.imagenes_portada,
    c.intervalo_portada_segundos
  from public.catalogo_configuracion c
  where lower(trim(c.slug)) = lower(trim(_slug))
    and c.visible = true
  limit 1;
$$;

revoke all on function public.obtener_configuracion_portada_publica(text) from public;
grant execute on function public.obtener_configuracion_portada_publica(text) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
