-- Hardening: ventas no debe tratar al gerente como administrador global.
create or replace function private.usuario_puede_ventas(_uid uuid, _sede_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    public.has_role(_uid, 'dueno'::public.app_role)
    or (
      public.has_role(_uid, 'gerente'::public.app_role)
      and public.ve_sede(_uid, _sede_id)
      and exists (
        select 1 from public.user_areas ua
        where ua.user_id = _uid
          and lower(trim(ua.area)) = lower('Área ventas')
      )
    )
$function$;
