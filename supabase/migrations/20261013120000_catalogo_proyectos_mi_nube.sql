-- Relaciona una ficha del catálogo interno con el proyecto privado original de Mi Nube.
-- Se guardan rutas y metadatos, no URLs públicas ni copias de archivos privados.
begin;
create table if not exists public.catalogo_proyectos_nube (
  producto_id uuid primary key references public.catalogo_productos(id) on delete cascade,
  participante_id uuid not null,
  usuario_id uuid not null,
  carpeta text not null check (length(trim(carpeta)) between 1 and 120),
  archivos jsonb not null default '[]'::jsonb
    check (case when jsonb_typeof(archivos) = 'array' then jsonb_array_length(archivos) <= 200 else false end),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists catalogo_proyectos_nube_participante_idx on public.catalogo_proyectos_nube (participante_id);
alter table public.catalogo_proyectos_nube enable row level security;
revoke all on public.catalogo_proyectos_nube from anon, authenticated;
grant select, insert, update, delete on public.catalogo_proyectos_nube to authenticated;
drop policy if exists "Catálogo Mi Nube leer proyecto propio" on public.catalogo_proyectos_nube;
create policy "Catálogo Mi Nube leer proyecto propio" on public.catalogo_proyectos_nube for select to authenticated
using (
 usuario_id = (select auth.uid())
 and exists (select 1 from public.participante_cuentas pc join public.ecosistema_participantes ep on ep.id=pc.participante_id
  where pc.user_id=(select auth.uid()) and pc.participante_id=catalogo_proyectos_nube.participante_id and pc.estado='activo' and ep.estado='activo')
 and exists (select 1 from public.catalogo_productos cp where cp.id=catalogo_proyectos_nube.producto_id and cp.participante_id=catalogo_proyectos_nube.participante_id)
);
drop policy if exists "Catálogo Mi Nube vincular proyecto propio" on public.catalogo_proyectos_nube;
create policy "Catálogo Mi Nube vincular proyecto propio" on public.catalogo_proyectos_nube for insert to authenticated
with check (
 usuario_id=(select auth.uid())
 and exists (select 1 from public.participante_cuentas pc join public.ecosistema_participantes ep on ep.id=pc.participante_id
  where pc.user_id=(select auth.uid()) and pc.participante_id=catalogo_proyectos_nube.participante_id and pc.estado='activo' and ep.estado='activo')
 and exists (select 1 from public.catalogo_productos cp where cp.id=catalogo_proyectos_nube.producto_id and cp.participante_id=catalogo_proyectos_nube.participante_id)
);
drop policy if exists "Catálogo Mi Nube actualizar proyecto propio" on public.catalogo_proyectos_nube;
create policy "Catálogo Mi Nube actualizar proyecto propio" on public.catalogo_proyectos_nube for update to authenticated
using (usuario_id=(select auth.uid()) and exists (select 1 from public.participante_cuentas pc where pc.user_id=(select auth.uid()) and pc.participante_id=catalogo_proyectos_nube.participante_id and pc.estado='activo'))
with check (
 usuario_id=(select auth.uid())
 and exists (select 1 from public.participante_cuentas pc where pc.user_id=(select auth.uid()) and pc.participante_id=catalogo_proyectos_nube.participante_id and pc.estado='activo')
 and exists (select 1 from public.catalogo_productos cp where cp.id=catalogo_proyectos_nube.producto_id and cp.participante_id=catalogo_proyectos_nube.participante_id)
);
drop policy if exists "Catálogo Mi Nube desvincular proyecto propio" on public.catalogo_proyectos_nube;
create policy "Catálogo Mi Nube desvincular proyecto propio" on public.catalogo_proyectos_nube for delete to authenticated
using (usuario_id=(select auth.uid()) and exists (select 1 from public.participante_cuentas pc where pc.user_id=(select auth.uid()) and pc.participante_id=catalogo_proyectos_nube.participante_id and pc.estado='activo'));
comment on table public.catalogo_proyectos_nube is 'Relación privada entre fichas del catálogo y proyectos/archivos originales de Mi Nube. No contiene URLs públicas de los archivos originales.';
commit;
