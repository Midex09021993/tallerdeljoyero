create table if not exists public.configuracion_web (
  clave text primary key,
  calculos_realizados integer not null default 150 check (calculos_realizados >= 0),
  talleres_registrados integer not null default 20 check (talleres_registrados >= 0),
  herramientas_disponibles integer not null default 5 check (herramientas_disponibles >= 0),
  usuarios_registrados integer not null default 0 check (usuarios_registrados >= 0),
  disenos_visualizados integer not null default 0 check (disenos_visualizados >= 0),
  renderizados_realizados integer not null default 0 check (renderizados_realizados >= 0),
  pedidos_gestionados integer not null default 0 check (pedidos_gestionados >= 0),
  contratos_registrados integer not null default 0 check (contratos_registrados >= 0),
  updated_at timestamptz not null default now()
);

alter table public.configuracion_web enable row level security;

grant select on public.configuracion_web to anon, authenticated;
grant update, insert on public.configuracion_web to authenticated;

insert into public.configuracion_web (clave)
values ('comunidad_aurum_lab')
on conflict (clave) do nothing;

drop policy if exists "Configuracion web publica de lectura" on public.configuracion_web;
create policy "Configuracion web publica de lectura"
on public.configuracion_web
for select
to anon, authenticated
using (clave = 'comunidad_aurum_lab');

drop policy if exists "Solo dueno modifica configuracion web" on public.configuracion_web;
create policy "Solo dueno modifica configuracion web"
on public.configuracion_web
for update
to authenticated
using ((select public.has_role(auth.uid(), 'dueno'::public.app_role)) and clave = 'comunidad_aurum_lab')
with check ((select public.has_role(auth.uid(), 'dueno'::public.app_role)) and clave = 'comunidad_aurum_lab');

drop policy if exists "Solo dueno crea configuracion web" on public.configuracion_web;
create policy "Solo dueno crea configuracion web"
on public.configuracion_web
for insert
to authenticated
with check ((select public.has_role(auth.uid(), 'dueno'::public.app_role)) and clave = 'comunidad_aurum_lab');

create or replace function public.touch_configuracion_web()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_configuracion_web on public.configuracion_web;
create trigger trg_touch_configuracion_web
before update on public.configuracion_web
for each row execute function public.touch_configuracion_web();
