-- Evita que un usuario no administrativo cambie por API su propia sede,
-- estado de activación o ventana de acceso.

create or replace function public.proteger_perfil_autoservicio()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.es_admin(auth.uid()) then
    if new.sede_id is distinct from old.sede_id
       or new.activo is distinct from old.activo
       or new.acceso_desde is distinct from old.acceso_desde
       or new.acceso_hasta is distinct from old.acceso_hasta then
      raise exception 'No puedes modificar permisos, sede o vigencia de tu propia cuenta';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_perfil_autoservicio on public.profiles;
create trigger proteger_perfil_autoservicio
before update on public.profiles
for each row
execute function public.proteger_perfil_autoservicio();

revoke execute on function public.proteger_perfil_autoservicio() from public;
