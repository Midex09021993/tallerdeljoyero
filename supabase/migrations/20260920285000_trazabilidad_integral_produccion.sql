create table if not exists public.produccion_eventos (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references public.sedes(id),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  orden_produccion_id uuid references public.ordenes_produccion(id) on delete set null,
  trabajo_id uuid references public.trabajos(id) on delete set null,
  pieza_id uuid references public.piezas_terminadas(id) on delete set null,
  tipo text not null,
  estado_anterior text not null default '',
  estado_nuevo text not null default '',
  usuario_id uuid references auth.users(id) on delete set null,
  datos jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists produccion_eventos_pedido_created_idx
  on public.produccion_eventos(pedido_id, created_at desc);
create index if not exists produccion_eventos_op_created_idx
  on public.produccion_eventos(orden_produccion_id, created_at desc);
create index if not exists produccion_eventos_trabajo_created_idx
  on public.produccion_eventos(trabajo_id, created_at desc);
create index if not exists produccion_eventos_pieza_created_idx
  on public.produccion_eventos(pieza_id, created_at desc);

alter table public.produccion_eventos enable row level security;

drop policy if exists produccion_eventos_select_sede on public.produccion_eventos;
create policy produccion_eventos_select_sede
on public.produccion_eventos for select to authenticated
using (public.ve_sede((select auth.uid()), sede_id));

create or replace function public.registrar_evento_produccion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedido uuid;
  v_sede uuid;
  v_op uuid;
  v_trabajo uuid;
  v_pieza uuid;
  v_tipo text;
  v_anterior text := '';
  v_nuevo text := '';
  v_datos jsonb := '{}'::jsonb;
begin
  if tg_table_name = 'ordenes_produccion' then
    v_pedido := coalesce(new.pedido_id, old.pedido_id);
    v_sede := coalesce(new.sede_id, old.sede_id);
    v_op := coalesce(new.id, old.id);
    v_tipo := case when tg_op = 'INSERT' then 'op_creada' else 'op_estado' end;
    v_anterior := case when tg_op = 'UPDATE' then coalesce(old.estado,'') else '' end;
    v_nuevo := coalesce(new.estado,'');
    v_datos := jsonb_build_object('numero',coalesce(new.numero,old.numero),'prioridad',coalesce(new.prioridad,old.prioridad));
  elsif tg_table_name = 'trabajos' then
    v_pedido := coalesce(new.pedido_id, old.pedido_id);
    v_sede := coalesce(new.sede_id, old.sede_id);
    v_op := coalesce(new.orden_produccion_id, old.orden_produccion_id);
    v_trabajo := coalesce(new.id, old.id);
    v_tipo := case when tg_op = 'INSERT' then 'trabajo_creado' when old.estado is distinct from new.estado then 'trabajo_estado' else 'trabajo_actualizado' end;
    v_anterior := case when tg_op = 'UPDATE' then coalesce(old.estado,'') else '' end;
    v_nuevo := coalesce(new.estado,'');
    v_datos := jsonb_build_object('titulo',coalesce(new.titulo,old.titulo),'area',coalesce(new.area,old.area),'responsable_user_id',coalesce(new.responsable_user_id,old.responsable_user_id));
  elsif tg_table_name = 'inventario_movimientos' then
    v_pedido := new.pedido_id;
    v_op := new.orden_produccion_id;
    v_sede := (select i.sede_id from public.inventario i where i.id=new.material_id);
    v_tipo := 'material_' || coalesce(new.tipo,'movimiento');
    v_datos := jsonb_build_object('material_id',new.material_id,'cantidad',new.cantidad,'motivo',new.motivo,'referencia_externa',new.referencia_externa,'stock_anterior',new.stock_anterior,'stock_posterior',new.stock_posterior);
  elsif tg_table_name = 'control_calidad' then
    v_op := new.orden_produccion_id;
    v_pedido := (select o.pedido_id from public.ordenes_produccion o where o.id=v_op);
    v_sede := (select o.sede_id from public.ordenes_produccion o where o.id=v_op);
    v_trabajo := new.trabajo_id;
    v_tipo := 'control_calidad_' || coalesce(new.tipo,'inspeccion');
    v_nuevo := coalesce(new.resultado,'');
    v_datos := jsonb_build_object('resultado',new.resultado,'tipo',new.tipo,'motivo',new.motivo,'descripcion',new.descripcion,'evidencia_url',new.evidencia_url,'retrabajo_trabajo_id',new.retrabajo_trabajo_id);
  elsif tg_table_name = 'piezas_terminadas' then
    v_pieza := coalesce(new.id,old.id);
    v_op := coalesce(new.orden_produccion_id,old.orden_produccion_id);
    v_pedido := coalesce(new.pedido_id,old.pedido_id);
    v_sede := (select o.sede_id from public.ordenes_produccion o where o.id=v_op);
    v_tipo := case when tg_op='INSERT' then 'pieza_creada' else 'pieza_estado' end;
    v_anterior := case when tg_op='UPDATE' then coalesce(old.estado,'') else '' end;
    v_nuevo := coalesce(new.estado,'');
    v_datos := jsonb_build_object('numero_pieza',coalesce(new.numero_pieza,old.numero_pieza),'cantidad',coalesce(new.cantidad,old.cantidad),'peso_final',coalesce(new.peso_final,old.peso_final),'metal_real',coalesce(new.metal_real,old.metal_real),'piedras_reales',coalesce(new.piedras_reales,old.piedras_reales));
  elsif tg_table_name = 'orden_produccion_entregas' then
    v_op := new.orden_produccion_id;
    v_pedido := (select o.pedido_id from public.ordenes_produccion o where o.id=v_op);
    v_sede := (select o.sede_id from public.ordenes_produccion o where o.id=v_op);
    v_tipo := 'material_entregado';
    v_datos := jsonb_build_object('material_id',new.material_id,'cantidad',new.cantidad,'unidad',new.unidad,'area_destino',new.area_destino,'notas',new.notas);
  end if;

  if v_pedido is not null and v_sede is not null then
    insert into public.produccion_eventos(
      sede_id,pedido_id,orden_produccion_id,trabajo_id,pieza_id,tipo,
      estado_anterior,estado_nuevo,usuario_id,datos
    )
    values (
      v_sede,v_pedido,v_op,v_trabajo,v_pieza,v_tipo,
      v_anterior,v_nuevo,(select auth.uid()),v_datos
    );
  end if;

  return coalesce(new,old);
end;
$$;

revoke all on function public.registrar_evento_produccion() from public, anon, authenticated;

drop trigger if exists produccion_eventos_op_trg on public.ordenes_produccion;
create trigger produccion_eventos_op_trg
after insert or update of estado on public.ordenes_produccion
for each row execute function public.registrar_evento_produccion();

drop trigger if exists produccion_eventos_trabajo_trg on public.trabajos;
create trigger produccion_eventos_trabajo_trg
after insert or update of estado,responsable_user_id on public.trabajos
for each row execute function public.registrar_evento_produccion();

drop trigger if exists produccion_eventos_material_trg on public.inventario_movimientos;
create trigger produccion_eventos_material_trg
after insert on public.inventario_movimientos
for each row when (new.orden_produccion_id is not null)
execute function public.registrar_evento_produccion();

drop trigger if exists produccion_eventos_qc_trg on public.control_calidad;
create trigger produccion_eventos_qc_trg
after insert on public.control_calidad
for each row execute function public.registrar_evento_produccion();

drop trigger if exists produccion_eventos_pieza_trg on public.piezas_terminadas;
create trigger produccion_eventos_pieza_trg
after insert or update of estado on public.piezas_terminadas
for each row execute function public.registrar_evento_produccion();

drop trigger if exists produccion_eventos_entrega_material_trg on public.orden_produccion_entregas;
create trigger produccion_eventos_entrega_material_trg
after insert on public.orden_produccion_entregas
for each row execute function public.registrar_evento_produccion();

revoke all on public.produccion_eventos from anon;
grant select on public.produccion_eventos to authenticated;