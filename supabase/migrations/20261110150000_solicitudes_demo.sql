-- Solicitudes públicas de demostración comercial de AURUM LAB.
-- Ejecutar manualmente en el proyecto Supabase administrado por Lovable Cloud.

create table if not exists public.solicitudes_demo (
  id uuid primary key default gen_random_uuid(),
  empresa text not null check (char_length(trim(empresa)) between 2 and 140),
  nombre text not null check (char_length(trim(nombre)) between 2 and 120),
  telefono text not null check (char_length(trim(telefono)) between 5 and 30),
  email text not null check (char_length(trim(email)) between 5 and 160),
  interes text not null check (char_length(trim(interes)) between 3 and 120),
  horario_preferido text null check (horario_preferido is null or horario_preferido in ('Mañana', 'Tarde')),
  origen text not null default 'landing_home',
  estado text not null default 'pendiente' check (estado in ('pendiente', 'contactado', 'demo_agendada', 'cerrado')),
  created_at timestamptz not null default now()
);

alter table public.solicitudes_demo enable row level security;

-- El público solo puede crear solicitudes. No puede leer, modificar ni eliminar registros.
drop policy if exists "Public can submit demo requests" on public.solicitudes_demo;
create policy "Public can submit demo requests"
  on public.solicitudes_demo
  for insert
  to anon, authenticated
  with check (
    char_length(trim(empresa)) between 2 and 140
    and char_length(trim(nombre)) between 2 and 120
    and char_length(trim(telefono)) between 5 and 30
    and char_length(trim(email)) between 5 and 160
    and char_length(trim(interes)) between 3 and 120
    and origen = 'landing_home'
    and estado = 'pendiente'
  );

revoke all on public.solicitudes_demo from anon, authenticated;
grant insert on public.solicitudes_demo to anon, authenticated;
grant usage on schema public to anon, authenticated;
