-- Integrar las sedes/talleres existentes con el Ecosistema sin duplicarlas.
alter table public.ecosistema_participantes
  add column if not exists sede_id uuid
  references public.sedes(id)
  on delete set null;

create unique index if not exists ecosistema_participantes_sede_unique
  on public.ecosistema_participantes(sede_id)
  where sede_id is not null;

create index if not exists ecosistema_participantes_sede_idx
  on public.ecosistema_participantes(sede_id);

insert into public.ecosistema_participantes (
  sede_id,
  tipo_participante,
  nombre,
  ciudad,
  descripcion,
  estado,
  metadata
)
select
  s.id,
  'organizacion',
  s.nombre,
  s.ciudad,
  'Taller/sede integrado desde el registro operativo del ERP.',
  case when s.activa then 'activo' else 'inactivo' end,
  jsonb_build_object('origen', 'sede', 'sede_id', s.id::text)
from public.sedes s
where not exists (
  select 1
  from public.ecosistema_participantes ep
  where ep.sede_id = s.id
);

grant select, insert, update, delete on public.ecosistema_participantes to authenticated;