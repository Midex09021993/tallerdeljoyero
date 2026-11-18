-- Cierre integral: exige inspección final y cantidad de piezas verificada.
create or replace function public.cerrar_orden_produccion(_orden_id uuid,_observaciones text default '')
returns public.ordenes_produccion
language plpgsql security invoker set search_path=''
as $$
declare v_op public.ordenes_produccion; v_p public.pedidos; v_qc boolean; v_piezas integer; v_requeridas integer;
begin
 select * into v_op from public.ordenes_produccion where id=_orden_id;
 if v_op.id is null then raise exception 'Orden de producción no encontrada'; end if;
 if not public.ve_sede((select auth.uid()),v_op.sede_id) then raise exception 'No tienes acceso a esta orden'; end if;
 select * into v_p from public.pedidos where id=v_op.pedido_id;
 select exists(select 1 from public.control_calidad where orden_produccion_id=_orden_id and tipo='inspeccion_final' and resultado='aprobado') into v_qc;
 select coalesce(sum(cantidad) filter(where estado in ('verificada','liberada')),0) into v_piezas from public.piezas_terminadas where orden_produccion_id=_orden_id;
 v_requeridas:=coalesce(v_p.cantidad_piezas,1);
 if not v_qc then raise exception 'La fabricación requiere inspección final aprobada'; end if;
 if v_piezas < v_requeridas then raise exception 'Faltan piezas verificadas: % de %',v_piezas,v_requeridas; end if;
 perform public.recalcular_costos_orden(_orden_id);
 select * into v_op from public.transicionar_orden_produccion(_orden_id,'terminada');
 update public.pedidos set listo_entrega_observaciones=coalesce(nullif(trim(_observaciones),''),listo_entrega_observaciones),usuario_listo_entrega=(select auth.uid())::text,updated_at=now() where id=v_op.pedido_id;
 return v_op;
end $$;
revoke all on function public.cerrar_orden_produccion(uuid,text) from public,anon;
grant execute on function public.cerrar_orden_produccion(uuid,text) to authenticated;

create or replace function public.registrar_inspeccion_calidad(_orden_id uuid,_resultado text,_tipo text default 'inspeccion_final',_motivo text default '',_descripcion text default '',_evidencia_url text default null)
returns public.control_calidad language plpgsql security invoker set search_path=''
as $$
declare v_sede uuid; v_qc public.control_calidad;
begin
 select sede_id into v_sede from public.ordenes_produccion where id=_orden_id;
 if v_sede is null or not public.ve_sede((select auth.uid()),v_sede) then raise exception 'No tienes acceso a la orden de producción'; end if;
 if _resultado not in ('pendiente','aprobado','observado','rechazado') then raise exception 'Resultado de calidad no válido'; end if;
 if _tipo not in ('inspeccion_operacion','inspeccion_final','reinspeccion') then raise exception 'Tipo de inspección no válido'; end if;
 if _tipo='inspeccion_final' and _resultado='aprobado' and (select estado from public.ordenes_produccion where id=_orden_id) <> 'control_calidad' then raise exception 'La OP debe estar en control de calidad'; end if;
 insert into public.control_calidad(orden_produccion_id,inspeccionado_por,resultado,tipo,motivo,descripcion,evidencia_url) values(_orden_id,(select auth.uid()),_resultado,_tipo,coalesce(_motivo,''),coalesce(_descripcion,''),_evidencia_url) returning * into v_qc;
 if _tipo='inspeccion_final' and _resultado='aprobado' then perform public.cerrar_orden_produccion(_orden_id,coalesce(_motivo,'')); end if;
 return v_qc;
end $$;
revoke all on function public.registrar_inspeccion_calidad(uuid,text,text,text,text,text) from public,anon;
grant execute on function public.registrar_inspeccion_calidad(uuid,text,text,text,text,text) to authenticated;