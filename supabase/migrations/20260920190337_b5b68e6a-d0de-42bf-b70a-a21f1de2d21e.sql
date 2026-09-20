alter table public.inventario_movimientos add column if not exists costo_unitario numeric;

-- tarifas y costos de produccion
create table if not exists public.tarifas_mano_obra (id uuid primary key default gen_random_uuid(),sede_id uuid references public.sedes(id) on delete cascade,usuario_id uuid,area text not null default '',tarifa_hora numeric not null check (tarifa_hora >= 0),moneda text not null default 'PEN',vigente_desde date not null default current_date,vigente_hasta date,activo boolean not null default true,notas text not null default '',created_at timestamptz not null default now(),constraint tarifas_mano_obra_rango check (vigente_hasta is null or vigente_hasta >= vigente_desde));
create index if not exists tarifas_mano_obra_busqueda_idx on public.tarifas_mano_obra(sede_id,usuario_id,area,vigente_desde desc);
grant select, insert, update, delete on public.tarifas_mano_obra to authenticated;
grant all on public.tarifas_mano_obra to service_role;
alter table public.tarifas_mano_obra enable row level security;
drop policy if exists "tarifas mano obra sede" on public.tarifas_mano_obra;
create policy "tarifas mano obra sede" on public.tarifas_mano_obra for select to authenticated using (ve_sede(auth.uid(),sede_id));
drop policy if exists "tarifas mano obra admin" on public.tarifas_mano_obra;
create policy "tarifas mano obra admin" on public.tarifas_mano_obra for all to authenticated using (es_admin(auth.uid()) and ve_sede(auth.uid(),sede_id)) with check (es_admin(auth.uid()) and ve_sede(auth.uid(),sede_id));

create table if not exists public.orden_produccion_costos (id uuid primary key default gen_random_uuid(),orden_produccion_id uuid not null references public.ordenes_produccion(id) on delete cascade,categoria text not null,concepto text not null,referencia_id uuid,cantidad numeric not null default 1 check (cantidad >= 0),unidad text not null default '',costo_unitario numeric not null default 0 check (costo_unitario >= 0),importe numeric not null default 0 check (importe >= 0),moneda text not null default 'PEN',origen text not null default 'calculado',created_at timestamptz not null default now(),constraint orden_produccion_costos_categoria_check check (categoria in ('material','mano_obra','externo','indirecto','ajuste')));
create index if not exists orden_produccion_costos_op_idx on public.orden_produccion_costos(orden_produccion_id,categoria,created_at);
grant select, insert on public.orden_produccion_costos to authenticated;
grant all on public.orden_produccion_costos to service_role;
alter table public.orden_produccion_costos enable row level security;
drop policy if exists "costos op leer sede" on public.orden_produccion_costos;
create policy "costos op leer sede" on public.orden_produccion_costos for select to authenticated using (exists(select 1 from public.ordenes_produccion op where op.id=orden_produccion_id and ve_sede(auth.uid(),op.sede_id)));
drop policy if exists "costos op crear sede" on public.orden_produccion_costos;
create policy "costos op crear sede" on public.orden_produccion_costos for insert to authenticated with check (exists(select 1 from public.ordenes_produccion op where op.id=orden_produccion_id and ve_sede(auth.uid(),op.sede_id)));

create table if not exists public.orden_produccion_resumen_costos (id uuid primary key default gen_random_uuid(),orden_produccion_id uuid not null unique references public.ordenes_produccion(id) on delete cascade,costo_estimado numeric not null default 0,costo_materiales numeric not null default 0,costo_mano_obra numeric not null default 0,costo_externo numeric not null default 0,costo_indirecto numeric not null default 0,costo_ajustes numeric not null default 0,costo_real numeric not null default 0,venta numeric not null default 0,margen numeric not null default 0,margen_porcentaje numeric,moneda text not null default 'PEN',calculado_at timestamptz not null default now(),calculado_por uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
grant select, insert, update on public.orden_produccion_resumen_costos to authenticated;
grant all on public.orden_produccion_resumen_costos to service_role;
alter table public.orden_produccion_resumen_costos enable row level security;
drop policy if exists "resumen costos leer sede" on public.orden_produccion_resumen_costos;
create policy "resumen costos leer sede" on public.orden_produccion_resumen_costos for select to authenticated using (exists(select 1 from public.ordenes_produccion op where op.id=orden_produccion_id and ve_sede(auth.uid(),op.sede_id)));
drop policy if exists "resumen costos crear sede" on public.orden_produccion_resumen_costos;
create policy "resumen costos crear sede" on public.orden_produccion_resumen_costos for insert to authenticated with check (exists(select 1 from public.ordenes_produccion op where op.id=orden_produccion_id and ve_sede(auth.uid(),op.sede_id)));
drop policy if exists "resumen costos actualizar sede" on public.orden_produccion_resumen_costos;
create policy "resumen costos actualizar sede" on public.orden_produccion_resumen_costos for update to authenticated using (exists(select 1 from public.ordenes_produccion op where op.id=orden_produccion_id and ve_sede(auth.uid(),op.sede_id))) with check (exists(select 1 from public.ordenes_produccion op where op.id=orden_produccion_id and ve_sede(auth.uid(),op.sede_id)));

-- compras y recepcion
create table if not exists public.compras (id uuid primary key default gen_random_uuid(),sede_id uuid not null references public.sedes(id) on delete restrict,numero text not null,proveedor_nombre text not null default '',proveedor_participante_id uuid,estado text not null default 'borrador',moneda text not null default 'PEN',fecha_emision date not null default current_date,fecha_entrega date,subtotal numeric not null default 0 check (subtotal >= 0),impuestos numeric not null default 0 check (impuestos >= 0),total numeric not null default 0 check (total >= 0),notas text not null default '',creado_por uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(sede_id,numero),constraint compras_estado_check check (estado in ('borrador','ordenada','parcial','recibida','cancelada')));
create table if not exists public.compra_detalles (id uuid primary key default gen_random_uuid(),compra_id uuid not null references public.compras(id) on delete cascade,material_id uuid not null references public.inventario(id) on delete restrict,descripcion text not null default '',cantidad numeric not null check (cantidad > 0),cantidad_recibida numeric not null default 0 check (cantidad_recibida >= 0),unidad text not null default '',costo_unitario numeric not null check (costo_unitario >= 0),impuesto numeric not null default 0 check (impuesto >= 0),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),constraint compra_detalle_recibido_check check (cantidad_recibida <= cantidad));
create index if not exists compras_sede_fecha_idx on public.compras(sede_id,fecha_emision desc);
create index if not exists compra_detalles_compra_idx on public.compra_detalles(compra_id);
grant select, insert, update on public.compras to authenticated;
grant all on public.compras to service_role;
grant select, insert, update on public.compra_detalles to authenticated;
grant all on public.compra_detalles to service_role;
alter table public.compras enable row level security;
alter table public.compra_detalles enable row level security;
drop policy if exists "compras leer sede" on public.compras;
create policy "compras leer sede" on public.compras for select to authenticated using (ve_sede(auth.uid(),sede_id));
drop policy if exists "compras gestionar admin" on public.compras;
drop policy if exists "compras insertar admin" on public.compras;
create policy "compras insertar admin" on public.compras for insert to authenticated with check (es_admin(auth.uid()) and ve_sede(auth.uid(),sede_id));
drop policy if exists "compras actualizar admin" on public.compras;
create policy "compras actualizar admin" on public.compras for update to authenticated using (es_admin(auth.uid()) and ve_sede(auth.uid(),sede_id)) with check (es_admin(auth.uid()) and ve_sede(auth.uid(),sede_id));
drop policy if exists "compra detalles leer sede" on public.compra_detalles;
create policy "compra detalles leer sede" on public.compra_detalles for select to authenticated using (exists(select 1 from public.compras c where c.id=compra_id and ve_sede(auth.uid(),c.sede_id)));
drop policy if exists "compra detalles gestionar admin" on public.compra_detalles;
drop policy if exists "compra detalles insertar admin" on public.compra_detalles;
create policy "compra detalles insertar admin" on public.compra_detalles for insert to authenticated with check (exists(select 1 from public.compras c where c.id=compra_id and es_admin(auth.uid()) and ve_sede(auth.uid(),c.sede_id)));
drop policy if exists "compra detalles actualizar admin" on public.compra_detalles;
create policy "compra detalles actualizar admin" on public.compra_detalles for update to authenticated using (exists(select 1 from public.compras c where c.id=compra_id and es_admin(auth.uid()) and ve_sede(auth.uid(),c.sede_id))) with check (exists(select 1 from public.compras c where c.id=compra_id and es_admin(auth.uid()) and ve_sede(auth.uid(),c.sede_id)));

create or replace function public.recibir_compra(_compra_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$ declare c record; d record; v_rec numeric; v_total numeric:=0; begin select * into c from public.compras where id=_compra_id for update; if not found then raise exception 'Compra no encontrada'; end if; if not public.es_admin(auth.uid()) or not public.ve_sede(auth.uid(),c.sede_id) then raise exception 'No tienes permisos para recibir esta compra'; end if; if c.estado='cancelada' then raise exception 'No se puede recibir una compra cancelada'; end if; for d in select * from public.compra_detalles where compra_id=_compra_id for update loop v_rec:=d.cantidad-d.cantidad_recibida; if v_rec>0 then insert into public.inventario_movimientos(material_id,usuario_id,tipo,cantidad,motivo,referencia_externa,costo_unitario) values(d.material_id,auth.uid(),'entrada',v_rec,'Recepción de compra',c.numero,d.costo_unitario); update public.compra_detalles set cantidad_recibida=d.cantidad,updated_at=now() where id=d.id; v_total:=v_total+v_rec; end if; end loop; update public.compras set estado='recibida',updated_at=now() where id=_compra_id; return jsonb_build_object('compra_id',_compra_id,'cantidad_recibida',v_total); end; $$;
revoke execute on function public.recibir_compra(uuid) from public,anon;
grant execute on function public.recibir_compra(uuid) to authenticated;