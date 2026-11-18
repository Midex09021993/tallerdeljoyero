-- Reconciliación de identidad comercial con el modelo canónico del Ecosistema.
-- La base de producción no tenía la columna participante_id aunque el código ya la utiliza.
-- No modifica datos fiscales ni asigna automáticamente una identidad a un taller.

begin;

alter table public.identidades_comerciales
  add column if not exists participante_id uuid;

update public.identidades_comerciales ic
set participante_id = ep.id
from public.ecosistema_participantes ep
where ic.participante_id is null
  and ic.sede_id = ep.sede_id
  and ep.estado = 'activo';

alter table public.identidades_comerciales
  drop constraint if exists identidades_comerciales_participante_id_fkey;

alter table public.identidades_comerciales
  add constraint identidades_comerciales_participante_id_fkey
  foreign key (participante_id)
  references public.ecosistema_participantes(id)
  on delete set null;

create index if not exists identidades_comerciales_participante_idx
  on public.identidades_comerciales(participante_id);

commit;
