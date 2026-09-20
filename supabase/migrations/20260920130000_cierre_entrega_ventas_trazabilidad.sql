create table if not exists public.pedido_entrega_eventos (id uuid primary key default gen_random_uuid(),pedido_id uuid not null references public.pedidos(id) on delete cascade,sede_id uuid not null references public.sedes(id),tipo text not null check (tipo in ('listo_entrega','packing_preparado','despachado','entregado')),usuario_id uuid not null,datos jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
alter table public.pedido_entrega_eventos enable row level security;
create index if not exists pedido_entrega_eventos_pedido_idx on public.pedido_entrega_eventos(pedido_id,created_at desc);
create index if not exists pedido_entrega_eventos_sede_idx on public.pedido_entrega_eventos(sede_id,created_at desc);
drop policy if exists "pedido entrega eventos leer sede" on public.pedido_entrega_eventos;
create policy "pedido entrega eventos leer sede" on public.pedido_entrega_eventos for select to authenticated using (public.ve_sede((select auth.uid()),sede_id));
revoke all on public.pedido_entrega_eventos from anon,authenticated;
grant select on public.pedido_entrega_eventos to authenticated;
alter table public.pedidos add column if not exists packing_preparado_at timestamptz,add column if not exists packing_preparado_por text,add column if not exists evidencia_entrega_url text;
create or replace function private.usuario_puede_ventas(_uid uuid,_sede_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select public.es_admin(_uid) or (public.ve_sede(_uid,_sede_id) and exists(select 1 from public.user_areas ua where ua.user_id=_uid and lower(trim(ua.area))=lower('Área ventas'))); $$;
revoke all on function private.usuario_puede_ventas(uuid,uuid) from public,anon,authenticated;
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
 update public.pedidos set estado='Entregado',ventas_estado='Entregado',area_actual='Área ventas',packing_estado='Entregado al cliente',fecha_entregado=coalesce(nullif(_datos->>'fecha_entregado','')::date,current_date),receptor_envio=nullif(trim(_datos->>'receptor_envio'),''),notas_ventas=coalesce(_datos->>'notas_ventas',notas_ventas),notas_entrega=coalesce(_datos->>'notas_entrega',notas_entrega),evidencia_entrega_url=nullif(trim(_datos->>'evidencia_entrega_url'),''),usuario_entrega=v_uid::text,entregado_at=v_now,ventas_actualizado_por=v_uid::text,ventas_actualizado_en=v_now,updated_at=v_now where id=_pedido_id;v_tipo='entregado';
else raise exception 'Acción de entrega no válida';end if;
insert into public.pedido_entrega_eventos(pedido_id,sede_id,tipo,usuario_id,datos) values(_pedido_id,v_pedido.sede_id,v_tipo,v_uid,coalesce(_datos,'{}'::jsonb));
return jsonb_build_object('pedido_id',_pedido_id,'accion',_accion,'tipo',v_tipo,'at',v_now);
end;$$;
revoke all on function public.transicionar_entrega_pedido(uuid,text,jsonb) from public,anon;
grant execute on function public.transicionar_entrega_pedido(uuid,text,jsonb) to authenticated;