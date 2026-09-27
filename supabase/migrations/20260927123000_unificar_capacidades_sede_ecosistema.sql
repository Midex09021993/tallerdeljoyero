-- Unifica las capacidades de una sede integrada con su participante en Ecosistema.
-- sede_especialidades es la fuente de verdad durante la compatibilidad.
-- La identidad canonica futura sera participante_id.

alter table public.ecosistema_participantes
  add column if not exists sede_id uuid references public.sedes(id) on delete set null;

create unique index if not exists ecosistema_participantes_sede_unq
  on public.ecosistema_participantes(sede_id)
  where sede_id is not null;

create or replace function public.sincronizar_especialidades_participante_sede()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sede_id uuid;
begin
  v_sede_id := coalesce(new.sede_id, old.sede_id);

  delete from public.participante_especialidades pe
  using public.ecosistema_participantes ep
  where ep.id = pe.participante_id
    and ep.sede_id = v_sede_id;

  insert into public.participante_especialidades (participante_id, especialidad_id)
  select ep.id, se.especialidad_id
  from public.ecosistema_participantes ep
  join public.sede_especialidades se
    on se.sede_id = v_sede_id
  where ep.sede_id = v_sede_id
  on conflict (participante_id, especialidad_id) do nothing;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sede_especialidades_sync_ecosistema
  on public.sede_especialidades;

create trigger trg_sede_especialidades_sync_ecosistema
after insert or delete on public.sede_especialidades
for each row
execute function public.sincronizar_especialidades_participante_sede();

-- Sincronización inicial de las sedes que ya están integradas en Ecosistema.
do $$
begin
  delete from public.participante_especialidades pe
  using public.ecosistema_participantes ep
  where ep.id = pe.participante_id
    and ep.sede_id is not null;

  insert into public.participante_especialidades (participante_id, especialidad_id)
  select ep.id, se.especialidad_id
  from public.ecosistema_participantes ep
  join public.sede_especialidades se on se.sede_id = ep.sede_id
  on conflict (participante_id, especialidad_id) do nothing;
end;
$$;

notify pgrst, 'reload schema';
