-- Compartición de carpetas de Mi Nube entre talleres del ecosistema, sin duplicar objetos.
begin;

create table if not exists public.mi_nube_compartidas (
  id uuid primary key default gen_random_uuid(),
  propietario_participante_id uuid not null references public.ecosistema_participantes(id) on delete cascade,
  propietario_usuario_id uuid not null references auth.users(id) on delete cascade,
  carpeta text not null check (length(trim(carpeta)) between 1 and 120),
  destinatario_participante_id uuid not null references public.ecosistema_participantes(id) on delete cascade,
  creado_por uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint mi_nube_compartidas_no_propio_taller check (propietario_participante_id <> destinatario_participante_id),
  constraint mi_nube_compartidas_unique unique (propietario_usuario_id, propietario_participante_id, carpeta, destinatario_participante_id)
);

create index if not exists mi_nube_compartidas_destino_idx
  on public.mi_nube_compartidas(destinatario_participante_id, revoked_at);
create index if not exists mi_nube_compartidas_origen_idx
  on public.mi_nube_compartidas(propietario_usuario_id, propietario_participante_id, carpeta, revoked_at);

alter table public.mi_nube_compartidas enable row level security;

drop policy if exists "Mi Nube shares read participants" on public.mi_nube_compartidas;
create policy "Mi Nube shares read participants"
on public.mi_nube_compartidas for select to authenticated
using (
  exists (
    select 1 from public.participante_cuentas pc
    where pc.user_id = (select auth.uid())
      and pc.estado = 'activo'
      and pc.participante_id in (propietario_participante_id, destinatario_participante_id)
  )
);

drop policy if exists "Mi Nube shares owner insert" on public.mi_nube_compartidas;
create policy "Mi Nube shares owner insert"
on public.mi_nube_compartidas for insert to authenticated
with check (
  creado_por = (select auth.uid())
  and propietario_usuario_id = (select auth.uid())
  and revoked_at is null
  and exists (
    select 1 from public.participante_cuentas pc
    join public.ecosistema_participantes ep on ep.id = pc.participante_id
    where pc.user_id = (select auth.uid())
      and pc.participante_id = propietario_participante_id
      and pc.estado = 'activo' and ep.estado = 'activo'
  )
  and exists (
    select 1 from public.ecosistema_participantes ep
    where ep.id = destinatario_participante_id and ep.estado = 'activo'
  )
);

drop policy if exists "Mi Nube shares owner update" on public.mi_nube_compartidas;
create policy "Mi Nube shares owner update"
on public.mi_nube_compartidas for update to authenticated
using (propietario_usuario_id = (select auth.uid()))
with check (propietario_usuario_id = (select auth.uid()));

-- El receptor obtiene lectura/listado únicamente dentro de la carpeta compartida.
drop policy if exists "Mi Nube read shared folder" on storage.objects;
create policy "Mi Nube read shared folder"
on storage.objects for select to authenticated
using (
  bucket_id = 'mi-nube'
  and exists (
    select 1
    from public.mi_nube_compartidas s
    join public.participante_cuentas pc
      on pc.participante_id = s.destinatario_participante_id
     and pc.user_id = (select auth.uid())
     and pc.estado = 'activo'
    join public.ecosistema_participantes ep
      on ep.id = s.destinatario_participante_id and ep.estado = 'activo'
    where s.revoked_at is null
      and split_part(name, '/', 1) = s.propietario_participante_id::text
      and split_part(name, '/', 2) = s.propietario_usuario_id::text
      and split_part(name, '/', 3) = s.carpeta
  )
);

-- Directorio mínimo (nombre/ciudad) para elegir un taller, sin exponer teléfonos ni correos.
create or replace function public.listar_talleres_para_compartir_mi_nube()
returns table (id uuid, nombre text, ciudad text)
language sql
stable
security definer
set search_path = public
as $$
  select ep.id, ep.nombre, ep.ciudad
  from public.ecosistema_participantes ep
  where ep.estado = 'activo'
    and ep.tipo_participante = 'organizacion'
    and exists (
      select 1 from public.participante_cuentas pc
      where pc.user_id = auth.uid()
        and pc.estado = 'activo'
    )
    and not exists (
      select 1 from public.participante_cuentas pc
      where pc.user_id = auth.uid()
        and pc.participante_id = ep.id
        and pc.estado = 'activo'
    )
  order by ep.nombre;
$$;

revoke all on function public.listar_talleres_para_compartir_mi_nube() from public, anon;
grant execute on function public.listar_talleres_para_compartir_mi_nube() to authenticated;
grant select, insert, update on public.mi_nube_compartidas to authenticated;

comment on table public.mi_nube_compartidas is
  'Permisos de acceso a carpetas originales de Mi Nube entre talleres; no duplica archivos.';
commit;
