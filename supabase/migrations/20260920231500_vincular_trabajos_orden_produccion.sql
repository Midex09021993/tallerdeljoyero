alter table public.trabajos
  add column if not exists orden_produccion_id uuid references public.ordenes_produccion(id) on delete set null;

create index if not exists trabajos_orden_produccion_idx
  on public.trabajos(orden_produccion_id, secuencia);

create or replace function public.vincular_trabajo_a_orden_produccion()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.orden_produccion_id is null then
    select op.id into new.orden_produccion_id
    from public.ordenes_produccion op
    where op.pedido_id = new.pedido_id limit 1;
  end if;
  if new.orden_produccion_id is not null and not exists (
    select 1 from public.ordenes_produccion op
    where op.id = new.orden_produccion_id and op.pedido_id = new.pedido_id
  ) then
    raise exception 'La orden de producción no pertenece al pedido del trabajo';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_vincular_trabajo_op on public.trabajos;
create trigger trg_vincular_trabajo_op
before insert or update of pedido_id, orden_produccion_id on public.trabajos
for each row execute function public.vincular_trabajo_a_orden_produccion();

create or replace function public.vincular_trabajos_al_crear_op()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.trabajos set orden_produccion_id = new.id, updated_at = now()
  where pedido_id = new.pedido_id and (orden_produccion_id is null or orden_produccion_id = new.id);
  return new;
end;
$$;

drop trigger if exists trg_vincular_trabajos_al_crear_op on public.ordenes_produccion;
create trigger trg_vincular_trabajos_al_crear_op
after insert on public.ordenes_produccion
for each row execute function public.vincular_trabajos_al_crear_op();

revoke execute on function public.vincular_trabajo_a_orden_produccion() from public, anon, authenticated;
revoke execute on function public.vincular_trabajos_al_crear_op() from public, anon, authenticated;