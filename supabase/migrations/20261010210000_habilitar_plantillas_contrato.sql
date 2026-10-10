-- Reparación hacia delante: la migración histórica de plantillas no llegó a ejecutarse
-- en Lovable Cloud. Esta migración crea la tabla faltante y aplica RLS alineado
-- con el modelo actual de identidades comerciales por participante activo.
begin;

create table if not exists public.plantillas_contrato (
  id uuid primary key default gen_random_uuid(),
  identidad_comercial_id uuid not null
    references public.identidades_comerciales(id) on delete cascade,
  nombre text not null default 'Contrato estándar de fabricación de joyería',
  version integer not null default 1 check (version > 0),
  contenido jsonb not null default '{}'::jsonb,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint plantillas_contrato_identidad_comercial_key unique (identidad_comercial_id)
);

create index if not exists plantillas_contrato_identidad_idx
  on public.plantillas_contrato(identidad_comercial_id);

alter table public.plantillas_contrato enable row level security;

grant select, insert, update, delete on public.plantillas_contrato to authenticated;

drop policy if exists "plantillas contrato ver" on public.plantillas_contrato;
drop policy if exists "plantillas contrato gestionar" on public.plantillas_contrato;
drop policy if exists "plantillas contrato seleccionar participante" on public.plantillas_contrato;
drop policy if exists "plantillas contrato gestionar participante" on public.plantillas_contrato;

create policy "plantillas contrato seleccionar participante"
on public.plantillas_contrato
for select to authenticated
using (
  exists (
    select 1
    from public.identidades_comerciales ic
    where ic.id = plantillas_contrato.identidad_comercial_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and exists (
            select 1
            from public.ecosistema_participantes ep
            where ep.id = ic.participante_id
              and ep.estado = 'activo'
              and (
                exists (
                  select 1
                  from public.participante_cuentas pc
                  where pc.user_id = (select auth.uid())
                    and pc.participante_id = ep.id
                    and pc.estado = 'activo'
                )
                or exists (
                  select 1
                  from public.profiles p
                  where p.id = (select auth.uid())
                    and p.participante_id = ep.id
                    and coalesce(p.activo, true)
                )
              )
        )
      )
  )
);

create policy "plantillas contrato gestionar participante"
on public.plantillas_contrato
for all to authenticated
using (
  exists (
    select 1
    from public.identidades_comerciales ic
    where ic.id = plantillas_contrato.identidad_comercial_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and exists (
            select 1
            from public.ecosistema_participantes ep
            where ep.id = ic.participante_id
              and ep.estado = 'activo'
              and (
                exists (
                  select 1
                  from public.participante_cuentas pc
                  where pc.user_id = (select auth.uid())
                    and pc.participante_id = ep.id
                    and pc.estado = 'activo'
                )
                or exists (
                  select 1
                  from public.profiles p
                  where p.id = (select auth.uid())
                    and p.participante_id = ep.id
                    and coalesce(p.activo, true)
                )
              )
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.identidades_comerciales ic
    where ic.id = plantillas_contrato.identidad_comercial_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and exists (
            select 1
            from public.ecosistema_participantes ep
            where ep.id = ic.participante_id
              and ep.estado = 'activo'
              and (
                exists (
                  select 1
                  from public.participante_cuentas pc
                  where pc.user_id = (select auth.uid())
                    and pc.participante_id = ep.id
                    and pc.estado = 'activo'
                )
                or exists (
                  select 1
                  from public.profiles p
                  where p.id = (select auth.uid())
                    and p.participante_id = ep.id
                    and coalesce(p.activo, true)
                )
              )
        )
      )
  )
);

drop trigger if exists plantillas_contrato_set_updated_at on public.plantillas_contrato;
create trigger plantillas_contrato_set_updated_at
before update on public.plantillas_contrato
for each row execute function public.set_updated_at();

comment on table public.plantillas_contrato is
'Plantilla comercial configurable por identidad comercial. La versión activa se almacena aquí; el historial de versiones se implementará por separado.';

commit;
