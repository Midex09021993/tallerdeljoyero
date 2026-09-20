-- archivos: versión vigente para fabricación
alter table public.pedido_archivos add column if not exists es_vigente_fabricacion boolean not null default false;

-- trazabilidad inventario ↔ orden de producción
alter table public.inventario_movimientos add column if not exists orden_produccion_id uuid references public.ordenes_produccion(id) on delete set null;
create index if not exists inventario_mov_orden_produccion_idx on public.inventario_movimientos(orden_produccion_id, created_at desc);
create index if not exists inventario_movimientos_pedido_tipo_created_idx
  on public.inventario_movimientos(pedido_id, tipo, created_at desc) where pedido_id is not null;

create or replace function public.registrar_movimiento_produccion(
 _orden_id uuid,_material_id uuid,_tipo text,_cantidad numeric,_motivo text,_referencia_externa text default ''
)
returns public.inventario_movimientos
language plpgsql security invoker set search_path=''
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
 insert into public.inventario_movimientos(material_id,pedido_id,orden_produccion_id,usuario_id,tipo,cantidad,motivo,referencia_externa)
 values(_material_id,v_op.pedido_id,_orden_id,(select auth.uid()),_tipo,abs(_cantidad),trim(_motivo),coalesce(nullif(_referencia_externa,''),'OP '||v_op.numero))
 returning * into v_mov;
 return v_mov;
end $$;
revoke all on function public.registrar_movimiento_produccion(uuid,uuid,text,numeric,text,text) from public,anon;
grant execute on function public.registrar_movimiento_produccion(uuid,uuid,text,numeric,text,text) to authenticated;

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

-- costeo real por orden
create or replace function public.recalcular_costos_orden(_orden_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_sede uuid; v_pedido uuid; v_venta numeric:=0; v_mat numeric:=0; v_lab numeric:=0; v_ext numeric:=0; v_ind numeric:=0; v_adj numeric:=0; v_real numeric:=0; v_rate numeric; r record;
begin
 select sede_id,pedido_id into v_sede,v_pedido from public.ordenes_produccion where id=_orden_id;
 if v_sede is null or not public.ve_sede((select auth.uid()),v_sede) then raise exception 'No tienes acceso a esta orden de producción'; end if;
 select coalesce(importe,0) into v_venta from public.pedidos where id=v_pedido;
 delete from public.orden_produccion_costos where orden_produccion_id=_orden_id and origen='calculado';
 for r in select m.material_id, m.tipo, sum(m.cantidad) cantidad, i.material, i.unidad, coalesce(i.costo_unitario,0) costo_unitario
          from public.inventario_movimientos m join public.inventario i on i.id=m.material_id
          where m.orden_produccion_id=_orden_id and m.tipo in ('consumo','merma')
          group by m.material_id,m.tipo,i.material,i.unidad,i.costo_unitario loop
  insert into public.orden_produccion_costos(orden_produccion_id,categoria,concepto,referencia_id,cantidad,unidad,costo_unitario,importe,origen)
  values(_orden_id,'material',case when r.tipo='merma' then 'Merma · ' else 'Consumo · ' end||r.material,r.material_id,r.cantidad,r.unidad,r.costo_unitario,r.cantidad*r.costo_unitario,'calculado');
  v_mat:=v_mat+r.cantidad*r.costo_unitario;
 end loop;
 for r in select t.id, t.area, t.responsable_user_id,
                 coalesce(sum(coalesce(tt.segundos_acumulados,0)+case when tt.fin is null then extract(epoch from now()-tt.inicio) else 0 end),0) segundos
          from public.trabajos t left join public.trabajo_tiempos tt on tt.trabajo_id=t.id
          where t.orden_produccion_id=_orden_id group by t.id,t.area,t.responsable_user_id loop
  select tm.tarifa_hora into v_rate from public.tarifas_mano_obra tm
   where tm.activo and tm.sede_id=v_sede and (tm.usuario_id=r.responsable_user_id or tm.usuario_id is null)
     and (tm.area='' or lower(trim(tm.area))=lower(trim(coalesce(r.area,''))))
     and tm.vigente_desde<=current_date and (tm.vigente_hasta is null or tm.vigente_hasta>=current_date)
   order by (tm.usuario_id is not null) desc,(tm.area<>'') desc,tm.vigente_desde desc limit 1;
  v_rate:=coalesce(v_rate,0);
  if v_rate>0 and r.segundos>0 then
   insert into public.orden_produccion_costos(orden_produccion_id,categoria,concepto,referencia_id,cantidad,unidad,costo_unitario,importe,origen)
   values(_orden_id,'mano_obra','Mano de obra · '||coalesce(r.area,'Operación'),r.id,r.segundos/3600.0,'hora',v_rate,(r.segundos/3600.0)*v_rate,'calculado');
   v_lab:=v_lab+(r.segundos/3600.0)*v_rate;
  end if;
 end loop;
 select coalesce(sum(case when categoria='externo' then importe else 0 end),0),
        coalesce(sum(case when categoria='indirecto' then importe else 0 end),0),
        coalesce(sum(case when categoria='ajuste' then importe else 0 end),0)
   into v_ext,v_ind,v_adj from public.orden_produccion_costos where orden_produccion_id=_orden_id;
 v_real:=v_mat+v_lab+v_ext+v_ind+v_adj;
 insert into public.orden_produccion_resumen_costos(orden_produccion_id,costo_materiales,costo_mano_obra,costo_externo,costo_indirecto,costo_ajustes,costo_real,venta,margen,margen_porcentaje,calculado_por)
 values(_orden_id,v_mat,v_lab,v_ext,v_ind,v_adj,v_real,v_venta,v_venta-v_real,case when v_venta<>0 then ((v_venta-v_real)/v_venta)*100 else null end,(select auth.uid()))
 on conflict(orden_produccion_id) do update set costo_materiales=excluded.costo_materiales,costo_mano_obra=excluded.costo_mano_obra,costo_externo=excluded.costo_externo,costo_indirecto=excluded.costo_indirecto,costo_ajustes=excluded.costo_ajustes,costo_real=excluded.costo_real,venta=excluded.venta,margen=excluded.margen,margen_porcentaje=excluded.margen_porcentaje,calculado_por=excluded.calculado_por,calculado_at=now(),updated_at=now();
 return jsonb_build_object('orden_produccion_id',_orden_id,'costo_real',v_real,'venta',v_venta,'margen',v_venta-v_real);
end $$;
revoke all on function public.recalcular_costos_orden(uuid) from public,anon;
grant execute on function public.recalcular_costos_orden(uuid) to authenticated;

-- motor de estados de la orden
create or replace function public.transicionar_orden_produccion(_orden_id uuid,_nuevo_estado text)
returns public.ordenes_produccion language plpgsql security invoker set search_path='' as $$
declare v_op public.ordenes_produccion; v_pedido public.pedidos; v_tt int; v_tc int; v_qc boolean; v_pieza boolean;
begin
 select * into v_op from public.ordenes_produccion where id=_orden_id for update;
 if v_op.id is null then raise exception 'Orden de producción no encontrada'; end if;
 if not public.ve_sede((select auth.uid()), v_op.sede_id) then raise exception 'No tienes acceso a esta orden'; end if;
 select * into v_pedido from public.pedidos where id=v_op.pedido_id;
 if v_pedido.id is null or v_pedido.sede_id <> v_op.sede_id then raise exception 'Pedido y orden no pertenecen a la misma sede'; end if;
 if _nuevo_estado not in ('borrador','liberada','en_produccion','pausada','control_calidad','terminada','cancelada') then raise exception 'Estado de OP no válido'; end if;
 if _nuevo_estado = v_op.estado then return v_op; end if;
 if _nuevo_estado='liberada' and v_op.estado<>'borrador' then raise exception 'Solo una OP en borrador puede liberarse'; end if;
 if _nuevo_estado='en_produccion' and v_op.estado not in ('liberada','pausada') then raise exception 'La OP debe estar liberada o pausada para entrar en producción'; end if;
 if _nuevo_estado='pausada' and v_op.estado<>'en_produccion' then raise exception 'Solo una OP en producción puede pausarse'; end if;
 if _nuevo_estado='control_calidad' and v_op.estado<>'en_produccion' then raise exception 'La OP debe estar en producción para pasar a calidad'; end if;
 if _nuevo_estado='control_calidad' then
  select count(*), count(*) filter (where estado='completado') into v_tt,v_tc from public.trabajos where orden_produccion_id=_orden_id;
  if v_tt>0 and v_tc<v_tt then raise exception 'No se puede pasar a calidad: hay trabajos pendientes'; end if;
 end if;
 if _nuevo_estado='terminada' then
  select exists(select 1 from public.control_calidad where orden_produccion_id=_orden_id and tipo='inspeccion_final' and resultado='aprobado') into v_qc;
  if not v_qc then raise exception 'La OP necesita una inspección final aprobada'; end if;
  select exists(select 1 from public.piezas_terminadas where orden_produccion_id=_orden_id and estado in ('liberada','verificada')) into v_pieza;
  if not v_pieza then raise exception 'La OP necesita al menos una pieza verificada o liberada'; end if;
 end if;
 if _nuevo_estado='cancelada' and v_op.estado='terminada' then raise exception 'Una OP terminada no puede cancelarse'; end if;
 update public.ordenes_produccion
 set estado=_nuevo_estado,
     fecha_inicio=case when _nuevo_estado='en_produccion' then coalesce(fecha_inicio,now()) else fecha_inicio end,
     fecha_fin=case when _nuevo_estado='terminada' then coalesce(fecha_fin,now()) else fecha_fin end,
     updated_at=now()
 where id=_orden_id returning * into v_op;
 if _nuevo_estado='en_produccion' then
  update public.pedidos set estado='En Producción', area_actual=coalesce(nullif(area_actual,''),'Pedidos'), updated_at=now()
  where id=v_op.pedido_id and estado not in ('Entregado','Cancelado');
 elsif _nuevo_estado='terminada' then
  update public.pedidos set estado='Listo para Entrega', area_actual='Área ventas', fecha_listo_entrega=coalesce(fecha_listo_entrega,now()), updated_at=now()
  where id=v_op.pedido_id and estado not in ('Entregado','Cancelado');
 elsif _nuevo_estado='cancelada' then
  update public.pedidos set estado='Cancelado', updated_at=now() where id=v_op.pedido_id and estado <> 'Entregado';
 end if;
 return v_op;
end $$;
revoke all on function public.transicionar_orden_produccion(uuid,text) from public,anon;
grant execute on function public.transicionar_orden_produccion(uuid,text) to authenticated;

-- verificación de piezas terminadas
create or replace function public.verificar_pieza_terminada(_pieza_id uuid,_nuevo_estado text)
returns public.piezas_terminadas language plpgsql security invoker set search_path='' as $$
declare v_pieza public.piezas_terminadas; v_sede uuid;
begin
 select * into v_pieza from public.piezas_terminadas where id=_pieza_id for update;
 if v_pieza.id is null then raise exception 'Pieza no encontrada'; end if;
 select sede_id into v_sede from public.ordenes_produccion where id=v_pieza.orden_produccion_id;
 if v_sede is null or not public.ve_sede((select auth.uid()),v_sede) then raise exception 'No tienes acceso a esta pieza'; end if;
 if _nuevo_estado not in ('pendiente','recibida','verificada','liberada','rechazada') then raise exception 'Estado de pieza no válido'; end if;
 update public.piezas_terminadas set estado=_nuevo_estado, updated_at=now() where id=_pieza_id returning * into v_pieza;
 return v_pieza;
end $$;
revoke all on function public.verificar_pieza_terminada(uuid,text) from public,anon;
grant execute on function public.verificar_pieza_terminada(uuid,text) to authenticated;

-- cierre integral e inspección de calidad
create or replace function public.cerrar_orden_produccion(_orden_id uuid,_observaciones text default '')
returns public.ordenes_produccion language plpgsql security invoker set search_path='' as $$
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
returns public.control_calidad language plpgsql security invoker set search_path='' as $$
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