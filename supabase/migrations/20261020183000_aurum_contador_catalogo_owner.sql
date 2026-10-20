-- Conteo exacto de productos para el panel de dueño, sin exponer filas del catálogo.
-- Aplicar manualmente en Supabase SQL Editor.
begin;

create or replace function public.aurum_contar_productos_catalogo_owner(p_participante_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
begin
  if auth.uid() is null or not public.es_admin(auth.uid()) then
    raise exception 'No autorizado para consultar el consumo del catálogo';
  end if;

  if not exists (
    select 1
    from public.ecosistema_participantes ep
    where ep.id = p_participante_id
      and ep.tipo_participante = 'organizacion'
      and ep.sede_id is not null
  ) then
    raise exception 'No se encontró una organización integrada para medir el catálogo';
  end if;

  select count(*)::integer
    into v_total
  from public.catalogo_productos p
  where p.participante_id = p_participante_id;

  return coalesce(v_total, 0);
end;
$$;

revoke all on function public.aurum_contar_productos_catalogo_owner(uuid) from public, anon;
grant execute on function public.aurum_contar_productos_catalogo_owner(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
