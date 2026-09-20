-- Ventas 2: integridad de saldo y trazabilidad de entregas.
-- La bitácora de entrega la registra el trigger; la RPC no debe duplicarla.
create or replace function public.transicionar_entrega_pedido(_pedido_id uuid,_accion text,_datos jsonb default '{}'::jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_pedido public.pedidos%rowtype;v_uid uuid:=(select auth.uid());v_now timestamptz:=now();v_tipo text;
begin
if v_uid is null then raise exception 'No autenticado';end if;
select * into v_pedido from public.pedidos where id=_pedido_id for update;
if not found then raise exception 'Pedido no encontrado';end if;
if not public.ve_sede(v_uid,v_pedido.sede_id) then raise exception 'Sin acceso a la sede del pedido';end if;
if not private.usuario_puede_ventas(v_uid,v_pedido.sede_id) then raise exception 'Sin permisos para gestionar entregas';end if;
if _accion='listo_entrega' then
 if v_pedido.estado not in ('En Producción','Listo para Entrega') then raise exception 'El pedido debe estar en producción para pasar a listo para entrega';end if;
 update public.pedidos set estado='Listo para Entrega',ventas_estado='Listo para Entrega',area_actual='Área ventas',packing_estado=coalesce(nullif(packing_estado,''),'Pendiente de packing'),fecha_listo_entrega=coalesce(nullif(_datos->>'fecha_listo_entrega','')::date,current_date),listo_entrega_observaciones=coalesce(_datos->>'listo_entrega_observaciones',listo_entrega_observaciones),usuario_listo_entrega=v_uid::text,ventas_actualizado_por=v_uid::text,ventas_actualizado_en=v_now,updated_at=v_now where id=_pedido_id;v_tipo='listo_entrega';
elsif _accion='packing' then
 if v_pedido.estado<>'Listo para Entrega' then raise exception 'El pedido debe estar listo para entrega antes del packing';end if;
 update public.pedidos set packing_estado='Preparado',packing_preparado_at=v_now,packing_preparado_por=v_uid::text,ventas_actualizado_por=v_uid::text,ventas_actualizado_en=v_now,updated_at=v_now where id=_pedido_id;v_tipo='packing_preparado';
elsif _accion='despachar' then
 if v_pedido.estado<>'Listo para Entrega' then raise exception 'Solo se puede despachar un pedido listo para entrega';end if;
 if coalesce(v_pedido.packing_estado,'')<>'Preparado' then raise exception 'Primero se debe preparar el packing';end if;
 if nullif(trim(coalesce(_datos->>'medio_envio','')),'') is null then raise exception 'Indica el medio de envío o recojo';end if;
 update public.pedidos set estado='En Camino',ventas_estado='En Camino',area_actual='Área ventas',packing_estado='Despachado',medio_envio=nullif(trim(_datos->>'medio_envio'),''),guia_envio=nullif(trim(_datos->>'guia_envio'),''),fecha_envio=coalesce(nullif(_datos->>'fecha_envio','')::date,current_date),receptor_envio=coalesce(nullif(trim(_datos->>'receptor_envio'),''),receptor_envio),notas_ventas=coalesce(_datos->>'notas_ventas',notas_ventas),notas_envio=coalesce(_datos->>'notas_envio',notas_envio),usuario_envio=v_uid::text,enviado_at=v_now,ventas_actualizado_por=v_uid::text,ventas_actualizado_en=v_now,updated_at=v_now where id=_pedido_id;v_tipo='despachado';
elsif _accion='entregar' then
 if v_pedido.estado not in ('Listo para Entrega','En Camino') then raise exception 'El pedido no está listo para ser entregado';end if;
 if nullif(trim(coalesce(_datos->>'receptor_envio','')),'') is null then raise exception 'Registra quién recibe el pedido';end if;
 if coalesce(v_pedido.saldo,0)>0 and coalesce((_datos->>'saldo_pendiente_confirmado')::boolean,false)=false then raise exception 'Confirma la entrega con saldo pendiente';end if;
 update public.pedidos set estado='Entregado',ventas_estado='Entregado',area_actual='Área ventas',packing_estado='Entregado al cliente',fecha_entregado=coalesce(nullif(_datos->>'fecha_entregado','')::date,current_date),receptor_envio=nullif(trim(_datos->>'receptor_envio'),''),notas_ventas=coalesce(_datos->>'notas_ventas',notas_ventas),notas_entrega=coalesce(_datos->>'notas_entrega',notas_entrega),evidencia_entrega_url=nullif(trim(_datos->>'evidencia_entrega_url'),''),usuario_entrega=v_uid::text,entregado_at=v_now,ventas_actualizado_por=v_uid::text,ventas_actualizado_en=v_now,updated_at=v_now where id=_pedido_id;v_tipo='entregado';
else raise exception 'Acción de entrega no válida';end if;
return jsonb_build_object('pedido_id',_pedido_id,'accion',_accion,'tipo',v_tipo,'at',v_now);
end;$$;
revoke all on function public.transicionar_entrega_pedido(uuid,text,jsonb) from public,anon;
grant execute on function public.transicionar_entrega_pedido(uuid,text,jsonb) to authenticated;
