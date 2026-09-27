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

do $$
declare
  v_fallas integer;
begin
  select count(*)
    into v_fallas
  from (
    select id from public.clientes where sede_id is not null and participante_id is null
    union all
    select id from public.config_areas where sede_id is not null and participante_id is null
    union all
    select id from public.contratos where sede_id is not null and participante_id is null
    union all
    select id from public.cotizacion_numeradores where sede_id is not null and participante_id is null
    union all
    select id from public.cotizaciones where sede_id is not null and participante_id is null
    union all
    select id from public.gastos where sede_id is not null and participante_id is null
    union all
    select id from public.inventario where sede_id is not null and participante_id is null
    union all
    select id from public.inventario_joyas where sede_id is not null and participante_id is null
    union all
    select id from public.inventario_joyas_importaciones where sede_id is not null and participante_id is null
    union all
    select id from public.ordenes_produccion where sede_id is not null and participante_id is null
    union all
    select id from public.pedido_entrega_eventos where sede_id is not null and participante_id is null
    union all
    select id from public.pedidos where sede_id is not null and participante_id is null
    union all
    select id from public.procesos where sede_id is not null and participante_id is null
    union all
    select id from public.profiles where sede_id is not null and participante_id is null
    union all
    select id from public.proyectos_joya where sede_id is not null and participante_id is null
    union all
    select id from public.tareas_taller where sede_id is not null and participante_id is null
    union all
    select id from public.trabajos where sede_id is not null and participante_id is null
    union all
    select id from public.user_roles where sede_id is not null and participante_id is null
    union all
    select id from public.identidades_comerciales where sede_id is not null and participante_id is null
  ) pendientes;

  if v_fallas > 0 then
    raise exception
      'Ecosistema abortado: quedaron % registros con sede_id pero sin participante_id',
      v_fallas;
  end if;
end;
$$;

commit;
