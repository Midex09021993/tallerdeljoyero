-- Corrige el selector de Mi Nube: incluir todos los participantes activos del ecosistema,
-- no solo tipo_participante='organizacion' (valor que excluía talleres registrados con otros tipos).
begin;

create or replace function public.listar_talleres_para_compartir_mi_nube()
returns table (id uuid, nombre text)
language sql
stable
security definer
set search_path = ''
as $$
  select ep.id, ep.nombre
  from public.ecosistema_participantes ep
  where ep.estado = 'activo'
    and (select auth.uid()) is not null
    and exists (
      select 1
      from public.participante_cuentas pc
      join public.ecosistema_participantes propio
        on propio.id = pc.participante_id
       and propio.estado = 'activo'
      where pc.user_id = (select auth.uid())
        and pc.estado = 'activo'
    )
    and not exists (
      select 1
      from public.participante_cuentas pc
      where pc.user_id = (select auth.uid())
        and pc.participante_id = ep.id
        and pc.estado = 'activo'
    )
  order by ep.nombre;
$$;

revoke all on function public.listar_talleres_para_compartir_mi_nube() from public, anon;
grant execute on function public.listar_talleres_para_compartir_mi_nube() to authenticated;

notify pgrst, 'reload schema';
commit;
