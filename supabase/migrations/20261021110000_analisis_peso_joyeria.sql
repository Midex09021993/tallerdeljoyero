-- Historial de análisis de peso 3D vinculados a archivos de Mi Nube.
create table if not exists public.analisis_peso_joyeria (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  archivo_ruta text not null,
  archivo_nombre text not null,
  proyecto_nombre text not null default '',
  volumen_archivo numeric not null check (volumen_archivo >= 0),
  unidad_archivo text not null check (unidad_archivo in ('mm','cm','in')),
  volumen_cm3 numeric not null check (volumen_cm3 >= 0),
  metal_id text not null,
  metal_nombre text not null,
  densidad_g_cm3 numeric not null check (densidad_g_cm3 > 0),
  factor_seguridad numeric not null check (factor_seguridad > 0),
  peso_joya_g numeric not null check (peso_joya_g >= 0),
  modo_arbol text not null check (modo_arbol in ('porcentaje','gramos')),
  valor_arbol numeric not null check (valor_arbol >= 0),
  peso_arbol_g numeric not null check (peso_arbol_g >= 0),
  peso_final_g numeric not null check (peso_final_g >= 0),
  version_calculo integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists analisis_peso_joyeria_user_created_idx
  on public.analisis_peso_joyeria(user_id, created_at desc);
create index if not exists analisis_peso_joyeria_archivo_idx
  on public.analisis_peso_joyeria(user_id, archivo_ruta);

alter table public.analisis_peso_joyeria enable row level security;
revoke all on table public.analisis_peso_joyeria from anon, public;
grant select, insert on table public.analisis_peso_joyeria to authenticated;

drop policy if exists "analisis peso propio leer" on public.analisis_peso_joyeria;
create policy "analisis peso propio leer"
  on public.analisis_peso_joyeria for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "analisis peso propio insertar" on public.analisis_peso_joyeria;
create policy "analisis peso propio insertar"
  on public.analisis_peso_joyeria for insert to authenticated
  with check (user_id = (select auth.uid()));
