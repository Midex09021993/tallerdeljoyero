-- Entrega de material a producción: descuenta stock y deja entrega trazable.
create or replace function public.registrar_entrega_material_produccion(
 _orden_id uuid,_material_id uuid,_cantidad numeric,_area_destino text,_notas text default ''
)
returns public.orden_produccion_entregas
language plpgsql security invoker set search_path=''
as $$
declare v_op public.ordenes_produccion; v_m public.inventario; v_e public.orden_produccion_entregas;
begin
 select * into v_op from public.ordenes_produccion where id=_orden_id;
 if v_op.id is null then raise exception 'Orden de producción no encontrada'; end if;
 if not public.ve_sede((select auth.uid()),v_op.sede_id) then raise exception 'No tienes acceso a esta orden'; end if;
 select * into v_m from public.inventario where id=_material_id;
 if v_m.id is null or v_m.sede_id<>v_op.sede_id then raise exception 'Material no pertenece a la sede de la orden'; end if;
 if _cantidad is null or _cantidad<=0 then raise exception 'La cantidad debe ser mayor que cero'; end if;
 insert into public.inventario_movimientos(material_id,pedido_id,orden_produccion_id,usuario_id,tipo,cantidad,motivo,referencia_externa)
 values(_material_id,v_op.pedido_id,_orden_id,(select auth.uid()),'consumo',abs(_cantidad),'Entrega de material a producción','OP '||v_op.numero);
 insert into public.orden_produccion_entregas(orden_produccion_id,material_id,cantidad,unidad,entregado_por,area_destino,notas)
 values(_orden_id,_material_id,abs(_cantidad),v_m.unidad,(select auth.uid()),coalesce(nullif(trim(_area_destino),''),'Producción'),coalesce(_notas,''))
 returning * into v_e;
 return v_e;
end $$;
revoke all on function public.registrar_entrega_material_produccion(uuid,uuid,numeric,text,text) from public,anon;
grant execute on function public.registrar_entrega_material_produccion(uuid,uuid,numeric,text,text) to authenticated;