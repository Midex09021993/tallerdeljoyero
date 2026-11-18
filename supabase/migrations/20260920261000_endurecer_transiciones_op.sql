create or replace function public.transicionar_orden_produccion(_orden_id uuid,_nuevo_estado text)
returns public.ordenes_produccion
language plpgsql security invoker set search_path=''
as $$
declare v_op public.ordenes_produccion; v_pedido public.pedidos; v_total int; v_done int; v_qc boolean; v_piece boolean;
begin
 select * into v_op from public.ordenes_produccion where id=_orden_id for update;
 if v_op.id is null then raise exception 'Orden de producción no encontrada'; end if;
 if not public.ve_sede((select auth.uid()),v_op.sede_id) then raise exception 'No tienes acceso a esta orden'; end if;
 select * into v_pedido from public.pedidos where id=v_op.pedido_id;
 if v_pedido.id is null or v_pedido.sede_id<>v_op.sede_id then raise exception 'Pedido y orden no pertenecen a la misma sede'; end if;
 if _nuevo_estado not in ('borrador','liberada','en_produccion','pausada','control_calidad','terminada','cancelada') then raise exception 'Estado de OP no válido'; end if;
 if _nuevo_estado=v_op.estado then return v_op; end if;
 if _nuevo_estado='liberada' and v_op.estado<>'borrador' then raise exception 'Solo una OP en borrador puede liberarse'; end if;
 if _nuevo_estado='en_produccion' and v_op.estado not in ('liberada','pausada') then raise exception 'La OP debe estar liberada o pausada para entrar en producción'; end if;
 if _nuevo_estado='pausada' and v_op.estado<>'en_produccion' then raise exception 'Solo una OP en producción puede pausarse'; end if;
 if _nuevo_estado='control_calidad' and v_op.estado<>'en_produccion' then raise exception 'La OP debe estar en producción para pasar a calidad'; end if;
 if _nuevo_estado='control_calidad' then
   select count(*),count(*) filter(where estado='completado') into v_total,v_done from public.trabajos where orden_produccion_id=_orden_id;
   if v_total=0 or v_done<v_total then raise exception 'No se puede pasar a calidad: todos los trabajos deben estar completados'; end if;
 end if;
 if _nuevo_estado='terminada' then
   select exists(select 1 from public.control_calidad where orden_produccion_id=_orden_id and tipo='inspeccion_final' and resultado='aprobado') into v_qc;
   select exists(select 1 from public.piezas_terminadas where orden_produccion_id=_orden_id and estado in ('liberada','verificada')) into v_piece;
   if not v_qc then raise exception 'La OP necesita una inspección final aprobada'; end if;
   if not v_piece then raise exception 'La OP necesita una pieza verificada o liberada'; end if;
 end if;
 if _nuevo_estado='cancelada' and v_op.estado='terminada' then raise exception 'Una OP terminada no puede cancelarse'; end if;
 update public.ordenes_produccion set estado=_nuevo_estado,fecha_inicio=case when _nuevo_estado='en_produccion' then coalesce(fecha_inicio,now()) else fecha_inicio end,fecha_fin=case when _nuevo_estado='terminada' then coalesce(fecha_fin,now()) else fecha_fin end,updated_at=now() where id=_orden_id returning * into v_op;
 if _nuevo_estado='en_produccion' then update public.pedidos set estado='En Producción',updated_at=now() where id=v_op.pedido_id and estado not in ('Entregado','Cancelado');
 elsif _nuevo_estado='terminada' then update public.pedidos set estado='Listo para Entrega',area_actual='Área ventas',fecha_listo_entrega=coalesce(fecha_listo_entrega,now()),updated_at=now() where id=v_op.pedido_id and estado not in ('Entregado','Cancelado');
 elsif _nuevo_estado='cancelada' then update public.pedidos set estado='Cancelado',updated_at=now() where id=v_op.pedido_id and estado<>'Entregado'; end if;
 return v_op;
end $$;
revoke all on function public.transicionar_orden_produccion(uuid,text) from public,anon;
grant execute on function public.transicionar_orden_produccion(uuid,text) to authenticated;