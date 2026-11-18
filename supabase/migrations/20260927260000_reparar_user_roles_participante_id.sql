-- Reparación idempotente de user_roles para el modelo canónico de Ecosistema.
-- Causa: el código ya escribe/consulta participante_id en user_roles,
-- pero algunas bases restauradas no ejecutaron la migración que añadió esa columna.

begin;

alter table public.user_roles
  add column if not exists participante_id uuid;

alter table public.user_roles
  drop constraint if exists user_roles_participante_id_fkey;

alter table public.user_roles
  add constraint user_roles_participante_id_fkey
  foreign key (participante_id)
  references public.ecosistema_participantes(id)
  on delete set null;

create index if not exists user_roles_participante_id_idx
  on public.user_roles(participante_id);

-- Reconciliar los registros existentes usando la relación sede -> participante.
update public.user_roles ur
set participante_id = ep.id
from public.ecosistema_participantes ep
where ur.participante_id is null
  and ur.sede_id = ep.sede_id
  and ep.estado = 'activo';

commit;
