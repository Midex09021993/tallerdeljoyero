-- Contacto comercial público: separado de las solicitudes de acceso al ecosistema.
create table if not exists public.consultas_comerciales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text not null,
  telefono text,
  interes text not null,
  mensaje text not null,
  estado text not null default 'nuevo',
  created_at timestamptz not null default now(),
  constraint consultas_comerciales_nombre_len check (char_length(btrim(nombre)) between 2 and 120),
  constraint consultas_comerciales_email_len check (char_length(email) between 5 and 160),
  constraint consultas_comerciales_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint consultas_comerciales_telefono_len check (telefono is null or char_length(telefono) <= 40),
  constraint consultas_comerciales_interes_valid check (interes in ('aurum_lab','aurum_render','joya_personalizada','otra_consulta')),
  constraint consultas_comerciales_mensaje_len check (char_length(btrim(mensaje)) between 5 and 2000),
  constraint consultas_comerciales_estado_valid check (estado in ('nuevo','contactado','cerrado','spam'))
);

alter table public.consultas_comerciales enable row level security;
create index if not exists idx_consultas_comerciales_estado_created
  on public.consultas_comerciales (estado, created_at desc);

-- No se concede INSERT/SELECT público: las altas pasan por una función de servidor.
-- Sólo el rol dueño puede consultar o actualizar las consultas desde interfaces administrativas.
create policy "consultas_comerciales_owner_read"
  on public.consultas_comerciales
  for select to authenticated
  using (public.has_role((select auth.uid()), 'dueno'::app_role));

create policy "consultas_comerciales_owner_update"
  on public.consultas_comerciales
  for update to authenticated
  using (public.has_role((select auth.uid()), 'dueno'::app_role))
  with check (public.has_role((select auth.uid()), 'dueno'::app_role));

grant select, update on public.consultas_comerciales to authenticated;
