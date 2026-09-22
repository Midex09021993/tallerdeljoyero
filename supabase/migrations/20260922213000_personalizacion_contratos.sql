-- Personalización de contratos por identidad comercial.
-- Cada taller/joyería mantiene su propia plantilla sin compartir configuración con otros.

create table if not exists public.plantillas_contrato (
  id uuid primary key default gen_random_uuid(),
  identidad_comercial_id uuid not null references public.identidades_comerciales(id) on delete cascade,
  nombre text not null default 'Contrato estándar de fabricación de joyería',
  version integer not null default 1 check (version > 0),
  contenido jsonb not null default '{}'::jsonb,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique (identidad_comercial_id)
);

create index if not exists plantillas_contrato_identidad_idx
  on public.plantillas_contrato(identidad_comercial_id);

alter table public.plantillas_contrato enable row level security;

drop policy if exists "plantillas contrato ver" on public.plantillas_contrato;
create policy "plantillas contrato ver"
on public.plantillas_contrato
for select to authenticated
using (
  exists (
    select 1
    from public.identidades_comerciales ic
    where ic.id = plantillas_contrato.identidad_comercial_id
      and (
        public.has_role(auth.uid(), 'dueno'::public.app_role)
        or (
          public.has_role(auth.uid(), 'gerente'::public.app_role)
          and ic.sede_id = public.mi_sede(auth.uid())
        )
      )
  )
);

drop policy if exists "plantillas contrato gestionar" on public.plantillas_contrato;
create policy "plantillas contrato gestionar"
on public.plantillas_contrato
for all to authenticated
using (
  exists (
    select 1
    from public.identidades_comerciales ic
    where ic.id = plantillas_contrato.identidad_comercial_id
      and (
        public.has_role(auth.uid(), 'dueno'::public.app_role)
        or (
          public.has_role(auth.uid(), 'gerente'::public.app_role)
          and ic.sede_id = public.mi_sede(auth.uid())
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
        public.has_role(auth.uid(), 'dueno'::public.app_role)
        or (
          public.has_role(auth.uid(), 'gerente'::public.app_role)
          and ic.sede_id = public.mi_sede(auth.uid())
        )
      )
  )
);

drop trigger if exists plantillas_contrato_set_updated_at on public.plantillas_contrato;
create trigger plantillas_contrato_set_updated_at
before update on public.plantillas_contrato
for each row execute function public.set_updated_at();

comment on table public.plantillas_contrato is
'Plantilla comercial configurable por taller/joyería para contratos. No contiene datos variables del cliente.';
