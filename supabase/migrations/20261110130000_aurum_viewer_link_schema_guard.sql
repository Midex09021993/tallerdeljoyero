-- AURUM Secure Viewer: align the link table with token-only delivery from Mi Nube.
-- Lovable Cloud must apply this migration; it is intentionally idempotent.

begin;

create table if not exists public.visor_3d_enlaces (
  token text primary key,
  propietario_id uuid not null references auth.users(id) on delete cascade,
  modelo_url text,
  modelo_ruta text,
  nombre text not null default 'joya-compartida',
  expira_en timestamptz not null,
  creado_en timestamptz not null default now()
);

alter table public.visor_3d_enlaces
  add column if not exists modelo_ruta text;

alter table public.visor_3d_enlaces
  add column if not exists modelo_url text;

alter table public.visor_3d_enlaces
  alter column modelo_url drop not null;

alter table public.visor_3d_enlaces
  alter column nombre set default 'joya-compartida';

alter table public.visor_3d_enlaces
  drop constraint if exists visor_3d_enlaces_token_check;

alter table public.visor_3d_enlaces
  add constraint visor_3d_enlaces_token_check
  check (token ~ '^[a-f0-9]{24}$');

alter table public.visor_3d_enlaces
  drop constraint if exists visor_3d_enlaces_modelo_url_check;

alter table public.visor_3d_enlaces
  add constraint visor_3d_enlaces_modelo_url_check
  check (
    modelo_url is null or (
      modelo_url like 'https://%' and
      position('/storage/v1/object/sign/mi-nube/' in modelo_url) > 0
    )
  );

create index if not exists visor_3d_enlaces_expira_idx
  on public.visor_3d_enlaces (expira_en);

create index if not exists visor_3d_enlaces_owner_ruta_expira_idx
  on public.visor_3d_enlaces (propietario_id, modelo_ruta, expira_en desc)
  where modelo_ruta is not null;

alter table public.visor_3d_enlaces enable row level security;
revoke all on table public.visor_3d_enlaces from anon, authenticated, public;

revoke all on function public.resolver_enlace_visor_3d(text)
  from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;
