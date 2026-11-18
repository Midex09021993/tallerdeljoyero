-- Credenciales de acceso independientes de los datos personales.
-- Las cuentas existentes usaban DNI@taller.local; se conserva ese acceso
-- migrándolo a profiles.usuario para no romper usuarios existentes.
alter table public.profiles
  add column if not exists usuario text;

alter table public.profiles
  add column if not exists apellidos text not null default '';

update public.profiles p
set usuario = lower(split_part(u.email, '@', 1))
from auth.users u
where u.id = p.id
  and (p.usuario is null or btrim(p.usuario) = '')
  and u.email is not null;

update public.profiles
set usuario = 'usuario_' || replace(id::text, '-', '')
where usuario is null or btrim(usuario) = '';

alter table public.profiles
  alter column usuario set not null;

create unique index if not exists profiles_usuario_lower_key
  on public.profiles (lower(usuario));
