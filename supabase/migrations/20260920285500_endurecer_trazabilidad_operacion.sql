alter table public.trabajos
  drop constraint if exists trabajos_responsable_user_id_fkey;

alter table public.trabajos
  add constraint trabajos_responsable_user_id_fkey
  foreign key (responsable_user_id) references public.profiles(id) on delete set null;

alter table public.inventario_movimientos
  add column if not exists trabajo_id uuid;

alter table public.inventario_movimientos
  drop constraint if exists inventario_movimientos_trabajo_id_fkey;

alter table public.inventario_movimientos
  add constraint inventario_movimientos_trabajo_id_fkey
  foreign key (trabajo_id) references public.trabajos(id) on delete set null;

create index if not exists inventario_movimientos_trabajo_created_idx
  on public.inventario_movimientos(trabajo_id, created_at desc)
  where trabajo_id is not null;

create or replace function public.registrar_movimiento_produccion(
  _orden_id uuid,
  _material_id uuid,
  _tipo text,
  _cantidad numeric,
  _motivo text,
  _referencia_externa text default ''
)
returns public.inventario_movimientos
language plpgsql
set search_path=''
as $$
declare v_op public.ordenes_produccion; v_p public.pedidos; v_m public.inventario; v_mov public.inventario_movimientos;
begin
 select * into v_op from public.ordenes_produccion where id=_orden_id;
 if v_op.id is null then raise exception 'Orden de producción no encontrada'; end if;
 if not public.ve_sede((select auth.uid()),v_op.sede_id) then raise exception 'No tienes acceso a esta orden'; end if;
 select * into v_p from public.pedidos where id=v_op.pedido_id;
 if v_p.id is null or v_p.sede_id<>v_op.sede_id then raise exception 'Pedido y orden no pertenecen a la misma sede'; end if;
 select * into v_m from public.inventario where id=_material_id;
 if v_m.id is null or v_m.sede_id<>v_op.sede_id then raise exception 'Material no pertenece a la sede de la orden'; end if;
 if _tipo not in ('consumo','merma','devolucion') then raise exception 'Tipo de movimiento de producción no válido'; end if;
 if _cantidad is null or _cantidad<=0 then raise exception 'La cantidad debe ser mayor que cero'; end if;
 if length(trim(coalesce(_motivo,'')))=0 then raise exception 'El motivo es obligatorio'; end if;
 insert into public.inventario_movimientos(material_id,pedido_id,orden_produccion_id,trabajo_id,usuario_id,tipo,cantidad,motivo,referencia_externa)
 values(_material_id,v_op.pedido_id,_orden_id,null,(select auth.uid()),_tipo,abs(_cantidad),trim(_motivo),coalesce(_referencia_externa,''))
 returning * into v_mov;
 return v_mov;
end $$;

revoke all on function public.registrar_movimiento_produccion(uuid,uuid,text,numeric,text,text) from public,anon;
grant execute on function public.registrar_movimiento_produccion(uuid,uuid,text,numeric,text,text) to authenticated;