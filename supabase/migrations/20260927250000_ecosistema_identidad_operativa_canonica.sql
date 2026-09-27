-- Canonicalizar la identidad operativa en Ecosistema.
-- sede_id queda únicamente como compatibilidad histórica/ruteo legado.
-- Todas las escrituras antiguas que todavía envíen sede_id reciben
-- automáticamente el participante_id equivalente.

begin;

-- 1. Extender el modelo canónico a la identidad comercial.
alter table public.identidades_comerciales
  add column if not exists participante_id uuid;

update public.identidades_comerciales ic
set participante_id = ep.id
from public.ecosistema_participantes ep
where ic.participante_id is null
  and ic.sede_id = ep.sede_id;

alter table public.identidades_comerciales
  drop constraint if exists identidades_comerciales_participante_id_fkey;
alter table public.identidades_comerciales
  add constraint identidades_comerciales_participante_id_fkey
  foreign key (participante_id) references public.ecosistema_participantes(id)
  on delete set null;

create index if not exists identidades_comerciales_participante_idx
  on public.identidades_comerciales(participante_id);

-- 2. Trigger de compatibilidad: participant_id es la fuente de verdad.
create or replace function public.sincronizar_participante_operativo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participante_id uuid;
  v_sede_id uuid;
begin
  if new.participante_id is not null then
    select ep.sede_id
      into v_sede_id
    from public.ecosistema_participantes ep
    where ep.id = new.participante_id
      and ep.estado = 'activo';

    if v_sede_id is null then
      raise exception 'El participante operativo no existe o está inactivo';
    end if;

    if new.sede_id is not null and new.sede_id <> v_sede_id then
      raise exception 'sede_id y participante_id no pertenecen al mismo taller';
    end if;

    new.sede_id := v_sede_id;
    return new;
  end if;

  if new.sede_id is not null then
    select ep.id
      into v_participante_id
    from public.ecosistema_participantes ep
    where ep.sede_id = new.sede_id
      and ep.estado = 'activo'
    limit 1;

    if v_participante_id is null then
      raise exception 'La sede indicada no tiene participante activo en el Ecosistema';
    end if;

    new.participante_id := v_participante_id;
  end if;

  return new;
end;
$$;

revoke all on function public.sincronizar_participante_operativo() from public, anon;
grant execute on function public.sincronizar_participante_operativo() to authenticated;

-- Tablas operativas ya consolidadas.
do $$
declare
  t text;
  tablas text[] := array[
    'clientes','config_areas','contratos','cotizacion_numeradores','cotizaciones',
    'gastos','inventario','inventario_joyas','inventario_joyas_importaciones',
    'ordenes_produccion','pedido_entrega_eventos','pedidos','procesos','profiles',
    'proyectos_joya','tareas_taller','trabajos','user_roles','identidades_comerciales'
  ];
begin
  foreach t in array tablas loop
    execute format('drop trigger if exists trg_%I_participante_canonico on public.%I', t, t);
    execute format('create trigger trg_%I_participante_canonico before insert or update of sede_id, participante_id on public.%I for each row execute function public.sincronizar_participante_operativo()', t, t);
  end loop;
end;
$$;

-- 3. Reconciliar lo existente una última vez y abortar si queda una
-- referencia operativa sin participante.
update public.identidades_comerciales ic
set participante_id = ep.id
from public.ecosistema_participantes ep
where ic.participante_id is null
  and ic.sede_id = ep.sede_id;

if exists (
  select 1
  from public.identidades_comerciales
  where sede_id is not null and participante_id is null
) then
  raise exception 'Quedaron identidades comerciales sin participante_id';
end if;

if exists (
  select 1
  from public.pedidos
  where sede_id is not null and participante_id is null
) then
  raise exception 'Quedaron pedidos sin participante_id';
end if;

if exists (
  select 1
  from public.cotizaciones
  where sede_id is not null and participante_id is null
) then
  raise exception 'Quedaron cotizaciones sin participante_id';
end if;

if exists (
  select 1
  from public.trabajos
  where sede_id is not null and participante_id is null
) then
  raise exception 'Quedaron trabajos sin participante_id';
end if;

commit;
