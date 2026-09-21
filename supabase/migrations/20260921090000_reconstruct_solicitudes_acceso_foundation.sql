-- Reconstruct missing access-request foundation required by the existing ecosystem schema.
create table if not exists public.solicitudes_acceso (
  id uuid primary key default gen_random_uuid(),
  tipo_solicitante text not null,
  nombre text not null,
  empresa text,
  documento text,
  email text not null,
  telefono text,
  ciudad text,
  especialidades text[] not null default '{}',
  descripcion text,
  estado text not null default 'pendiente',
  notas_owner text,
  revisado_por uuid references auth.users(id) on delete set null,
  revisado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.solicitudes_acceso enable row level security;
create index if not exists idx_solicitudes_acceso_revisado_por on public.solicitudes_acceso(revisado_por);
create index if not exists idx_solicitudes_acceso_estado on public.solicitudes_acceso(estado);
create index if not exists idx_solicitudes_acceso_created_at on public.solicitudes_acceso(created_at desc);
create policy "solicitudes_insert_publico" on public.solicitudes_acceso
for insert to anon, authenticated
with check (
  estado = 'pendiente'
  and revisado_por is null
  and revisado_at is null
  and notas_owner is null
  and tipo_solicitante in ('taller','profesional','vendedor','proveedor','servicio')
  and char_length(nombre) between 2 and 120
  and char_length(email) between 5 and 160
  and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  and (empresa is null or char_length(empresa) <= 160)
  and (documento is null or char_length(documento) <= 30)
  and (telefono is null or char_length(telefono) <= 30)
  and (ciudad is null or char_length(ciudad) <= 80)
  and (descripcion is null or char_length(descripcion) <= 2000)
  and coalesce(array_length(especialidades,1),0) <= 20
);
create policy "solicitudes_owner_read" on public.solicitudes_acceso
for select to authenticated
using (public.has_role((select auth.uid()), 'dueno'::app_role));
create policy "solicitudes_owner_update" on public.solicitudes_acceso
for update to authenticated
using (public.has_role((select auth.uid()), 'dueno'::app_role))
with check (public.has_role((select auth.uid()), 'dueno'::app_role));
grant insert on public.solicitudes_acceso to anon, authenticated;
grant select, update on public.solicitudes_acceso to authenticated;
