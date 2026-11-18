-- Prerrequisitos en trabajos
alter table public.trabajos add column if not exists sede_id uuid references public.sedes(id) on delete restrict;
alter table public.trabajos add column if not exists participante_id uuid references public.ecosistema_participantes(id) on delete set null;
alter table public.trabajos add column if not exists secuencia integer not null default 1;
update public.trabajos t set sede_id = p.sede_id from public.pedidos p where p.id = t.pedido_id and t.sede_id is null;
create index if not exists trabajos_sede_idx on public.trabajos(sede_id);

-- pedido_materiales
create table if not exists public.pedido_materiales (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  material_id uuid not null references public.inventario(id) on delete restrict,
  cantidad_planificada numeric not null check (cantidad_planificada > 0),
  unidad text not null default '',
  notas text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pedido_id, material_id)
);
create index if not exists pedido_materiales_pedido_idx on public.pedido_materiales(pedido_id);
grant select, insert, update, delete on public.pedido_materiales to authenticated;
grant all on public.pedido_materiales to service_role;
alter table public.pedido_materiales enable row level security;
drop policy if exists "pedido materiales leer sede" on public.pedido_materiales;
create policy "pedido materiales leer sede"
on public.pedido_materiales for select to authenticated
using (exists (select 1 from public.pedidos p where p.id = pedido_materiales.pedido_id and ve_sede(auth.uid(), p.sede_id)));
drop policy if exists "pedido materiales crear operativo" on public.pedido_materiales;
create policy "pedido materiales crear operativo"
on public.pedido_materiales for insert to authenticated
with check (
  exists (select 1 from public.pedidos p where p.id = pedido_materiales.pedido_id and ve_sede(auth.uid(), p.sede_id))
  and exists (select 1 from public.inventario i where i.id = pedido_materiales.material_id and ve_sede(auth.uid(), i.sede_id) and i.activo)
  and (es_admin(auth.uid()) or has_role(auth.uid(), 'operario'::app_role) or has_role(auth.uid(), 'monitor'::app_role))
);
drop policy if exists "pedido materiales actualizar operativo" on public.pedido_materiales;
create policy "pedido materiales actualizar operativo"
on public.pedido_materiales for update to authenticated
using (
  exists (select 1 from public.pedidos p where p.id = pedido_materiales.pedido_id and ve_sede(auth.uid(), p.sede_id))
  and (es_admin(auth.uid()) or has_role(auth.uid(), 'operario'::app_role) or has_role(auth.uid(), 'monitor'::app_role))
)
with check (
  exists (select 1 from public.pedidos p where p.id = pedido_materiales.pedido_id and ve_sede(auth.uid(), p.sede_id))
  and exists (select 1 from public.inventario i where i.id = pedido_materiales.material_id and ve_sede(auth.uid(), i.sede_id) and i.activo)
  and cantidad_planificada > 0
);
drop policy if exists "pedido materiales borrar operativo" on public.pedido_materiales;
create policy "pedido materiales borrar operativo"
on public.pedido_materiales for delete to authenticated
using (
  exists (select 1 from public.pedidos p where p.id = pedido_materiales.pedido_id and ve_sede(auth.uid(), p.sede_id))
  and (es_admin(auth.uid()) or has_role(auth.uid(), 'operario'::app_role) or has_role(auth.uid(), 'monitor'::app_role))
);

-- ordenes de produccion y entregas
create table if not exists public.ordenes_produccion (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  sede_id uuid references public.sedes(id) on delete restrict,
  numero text not null,
  estado text not null default 'borrador',
  prioridad text not null default 'normal',
  responsable_user_id uuid,
  fecha_planificada_inicio date,
  fecha_planificada_fin date,
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  notas text not null default '',
  creado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ordenes_produccion_pedido_unique unique (pedido_id),
  constraint ordenes_produccion_numero_unique unique (numero),
  constraint ordenes_produccion_estado_check check (estado in ('borrador','liberada','en_produccion','pausada','control_calidad','terminada','cancelada')),
  constraint ordenes_produccion_prioridad_check check (prioridad in ('baja','normal','alta','urgente'))
);
create table if not exists public.orden_produccion_entregas (
  id uuid primary key default gen_random_uuid(),
  orden_produccion_id uuid not null references public.ordenes_produccion(id) on delete cascade,
  material_id uuid not null references public.inventario(id) on delete restrict,
  cantidad numeric not null,
  unidad text not null default '',
  entregado_por uuid,
  recibido_por uuid,
  area_destino text not null default '',
  notas text not null default '',
  created_at timestamptz not null default now(),
  constraint orden_produccion_entrega_cantidad_check check (cantidad > 0)
);
create index if not exists ordenes_produccion_sede_estado_idx on public.ordenes_produccion(sede_id, estado);
create index if not exists orden_produccion_entregas_op_idx on public.orden_produccion_entregas(orden_produccion_id, created_at desc);
create index if not exists orden_produccion_entregas_material_idx on public.orden_produccion_entregas(material_id, created_at desc);
grant select, insert, update, delete on public.ordenes_produccion to authenticated;
grant all on public.ordenes_produccion to service_role;
grant select, insert on public.orden_produccion_entregas to authenticated;
grant all on public.orden_produccion_entregas to service_role;
alter table public.ordenes_produccion enable row level security;
alter table public.orden_produccion_entregas enable row level security;
drop policy if exists "op leer sede" on public.ordenes_produccion;
create policy "op leer sede" on public.ordenes_produccion for select to authenticated
using (ve_sede(auth.uid(), sede_id));
drop policy if exists "op crear operativo" on public.ordenes_produccion;
create policy "op crear operativo" on public.ordenes_produccion for insert to authenticated
with check (
  ve_sede(auth.uid(), sede_id)
  and (es_admin(auth.uid()) or has_role(auth.uid(),'operario') or has_role(auth.uid(),'monitor'))
  and exists (select 1 from public.pedidos p where p.id = pedido_id and p.sede_id = sede_id)
);
drop policy if exists "op actualizar operativo" on public.ordenes_produccion;
create policy "op actualizar operativo" on public.ordenes_produccion for update to authenticated
using (ve_sede(auth.uid(), sede_id) and (es_admin(auth.uid()) or has_role(auth.uid(),'operario') or has_role(auth.uid(),'monitor')))
with check (ve_sede(auth.uid(), sede_id) and (es_admin(auth.uid()) or has_role(auth.uid(),'operario') or has_role(auth.uid(),'monitor')));
drop policy if exists "op entrega leer sede" on public.orden_produccion_entregas;
create policy "op entrega leer sede" on public.orden_produccion_entregas for select to authenticated
using (exists (select 1 from public.ordenes_produccion op where op.id = orden_produccion_id and ve_sede(auth.uid(), op.sede_id)));
drop policy if exists "op entrega crear operativo" on public.orden_produccion_entregas;
create policy "op entrega crear operativo" on public.orden_produccion_entregas for insert to authenticated
with check (
  (es_admin(auth.uid()) or has_role(auth.uid(),'operario') or has_role(auth.uid(),'monitor'))
  and exists (select 1 from public.ordenes_produccion op where op.id = orden_produccion_id and ve_sede(auth.uid(), op.sede_id))
  and exists (select 1 from public.inventario i join public.ordenes_produccion op on op.id = orden_produccion_id where i.id = material_id and i.sede_id = op.sede_id and i.activo)
);
create or replace function public.touch_ordenes_produccion()
returns trigger language plpgsql set search_path=''
as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_touch_ordenes_produccion on public.ordenes_produccion;
create trigger trg_touch_ordenes_produccion before update on public.ordenes_produccion for each row execute function public.touch_ordenes_produccion();

-- vincular trabajos con ordenes
alter table public.trabajos
  add column if not exists orden_produccion_id uuid references public.ordenes_produccion(id) on delete set null;
create index if not exists trabajos_orden_produccion_idx on public.trabajos(orden_produccion_id, secuencia);
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
revoke execute on function public.touch_ordenes_produccion() from public, anon, authenticated;

-- tiempos de trabajo
create table if not exists public.trabajo_tiempos (
  id uuid primary key default gen_random_uuid(),
  trabajo_id uuid not null references public.trabajos(id) on delete cascade,
  usuario_id uuid not null,
  inicio timestamptz not null default now(),
  fin timestamptz,
  segundos_acumulados integer not null default 0,
  motivo_pausa text not null default '',
  created_at timestamptz not null default now(),
  constraint trabajo_tiempos_rango_check check (fin is null or fin >= inicio),
  constraint trabajo_tiempos_segundos_check check (segundos_acumulados >= 0)
);
create index if not exists trabajo_tiempos_trabajo_idx on public.trabajo_tiempos(trabajo_id, inicio desc);
create index if not exists trabajo_tiempos_usuario_idx on public.trabajo_tiempos(usuario_id, inicio desc);
grant select, insert, update on public.trabajo_tiempos to authenticated;
grant all on public.trabajo_tiempos to service_role;
alter table public.trabajo_tiempos enable row level security;
drop policy if exists "tiempos leer sede" on public.trabajo_tiempos;
create policy "tiempos leer sede" on public.trabajo_tiempos for select to authenticated using (exists (select 1 from public.trabajos t where t.id=trabajo_id and ve_sede(auth.uid(),t.sede_id)));
drop policy if exists "tiempos crear propio" on public.trabajo_tiempos;
create policy "tiempos crear propio" on public.trabajo_tiempos for insert to authenticated with check (usuario_id=auth.uid() and exists (select 1 from public.trabajos t where t.id=trabajo_id and ve_sede(auth.uid(),t.sede_id)));
drop policy if exists "tiempos actualizar propio" on public.trabajo_tiempos;
create policy "tiempos actualizar propio" on public.trabajo_tiempos for update to authenticated using (usuario_id=auth.uid() and exists (select 1 from public.trabajos t where t.id=trabajo_id and ve_sede(auth.uid(),t.sede_id))) with check (usuario_id=auth.uid() and exists (select 1 from public.trabajos t where t.id=trabajo_id and ve_sede(auth.uid(),t.sede_id)));

-- control de calidad
create table if not exists public.control_calidad (
 id uuid primary key default gen_random_uuid(), orden_produccion_id uuid not null references public.ordenes_produccion(id) on delete cascade, trabajo_id uuid references public.trabajos(id) on delete set null, inspeccionado_por uuid not null, resultado text not null default 'pendiente', tipo text not null default 'inspeccion_final', descripcion text not null default '', motivo text not null default '', evidencia_url text, retrabajo_trabajo_id uuid references public.trabajos(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint control_calidad_resultado_check check (resultado in ('pendiente','aprobado','observado','rechazado')), constraint control_calidad_tipo_check check (tipo in ('inspeccion_operacion','inspeccion_final','reinspeccion')), constraint control_calidad_retrabajo_check check ((resultado in ('observado','rechazado')) or retrabajo_trabajo_id is null));
create index if not exists control_calidad_op_idx on public.control_calidad(orden_produccion_id, created_at desc);
create index if not exists control_calidad_trabajo_idx on public.control_calidad(trabajo_id, created_at desc);
grant select, insert, update on public.control_calidad to authenticated;
grant all on public.control_calidad to service_role;
alter table public.control_calidad enable row level security;
drop policy if exists "calidad leer sede" on public.control_calidad;
create policy "calidad leer sede" on public.control_calidad for select to authenticated using (exists (select 1 from public.ordenes_produccion op where op.id=orden_produccion_id and ve_sede(auth.uid(),op.sede_id)));
drop policy if exists "calidad crear sede" on public.control_calidad;
create policy "calidad crear sede" on public.control_calidad for insert to authenticated with check (exists (select 1 from public.ordenes_produccion op where op.id=orden_produccion_id and ve_sede(auth.uid(),op.sede_id)) and inspeccionado_por=auth.uid());
drop policy if exists "calidad actualizar sede" on public.control_calidad;
create policy "calidad actualizar sede" on public.control_calidad for update to authenticated using (exists (select 1 from public.ordenes_produccion op where op.id=orden_produccion_id and ve_sede(auth.uid(),op.sede_id))) with check (exists (select 1 from public.ordenes_produccion op where op.id=orden_produccion_id and ve_sede(auth.uid(),op.sede_id)));
create or replace function public.touch_control_calidad() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists trg_touch_control_calidad on public.control_calidad;
create trigger trg_touch_control_calidad before update on public.control_calidad for each row execute function public.touch_control_calidad();
revoke execute on function public.touch_control_calidad() from public,anon,authenticated;

-- piezas terminadas
create table if not exists public.piezas_terminadas (
 id uuid primary key default gen_random_uuid(), orden_produccion_id uuid not null references public.ordenes_produccion(id) on delete cascade, pedido_id uuid not null references public.pedidos(id) on delete cascade, numero_pieza text not null, cantidad integer not null default 1 check (cantidad > 0), peso_estimado numeric, peso_final numeric, unidad_peso text not null default 'g', metal_estimado text not null default '', metal_real text not null default '', piedras_estimadas text not null default '', piedras_reales text not null default '', estado text not null default 'pendiente', observaciones text not null default '', registrado_por uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint piezas_terminadas_estado_check check (estado in ('pendiente','recibida','verificada','liberada','rechazada')), constraint piezas_terminadas_peso_check check (peso_estimado is null or peso_estimado >= 0), constraint piezas_terminadas_peso_final_check check (peso_final is null or peso_final >= 0), unique (orden_produccion_id, numero_pieza));
create index if not exists piezas_terminadas_pedido_idx on public.piezas_terminadas(pedido_id, created_at desc);
create index if not exists piezas_terminadas_op_idx on public.piezas_terminadas(orden_produccion_id, created_at desc);
grant select, insert, update on public.piezas_terminadas to authenticated;
grant all on public.piezas_terminadas to service_role;
alter table public.piezas_terminadas enable row level security;
drop policy if exists "piezas leer sede" on public.piezas_terminadas;
create policy "piezas leer sede" on public.piezas_terminadas for select to authenticated using (exists (select 1 from public.ordenes_produccion op where op.id=orden_produccion_id and ve_sede(auth.uid(),op.sede_id)));
drop policy if exists "piezas crear sede" on public.piezas_terminadas;
create policy "piezas crear sede" on public.piezas_terminadas for insert to authenticated with check (registrado_por=auth.uid() and exists (select 1 from public.ordenes_produccion op where op.id=orden_produccion_id and ve_sede(auth.uid(),op.sede_id)));
drop policy if exists "piezas actualizar sede" on public.piezas_terminadas;
create policy "piezas actualizar sede" on public.piezas_terminadas for update to authenticated using (exists (select 1 from public.ordenes_produccion op where op.id=orden_produccion_id and ve_sede(auth.uid(),op.sede_id))) with check (exists (select 1 from public.ordenes_produccion op where op.id=orden_produccion_id and ve_sede(auth.uid(),op.sede_id)));
create or replace function public.touch_piezas_terminadas() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists trg_touch_piezas_terminadas on public.piezas_terminadas;
create trigger trg_touch_piezas_terminadas before update on public.piezas_terminadas for each row execute function public.touch_piezas_terminadas();
revoke execute on function public.touch_piezas_terminadas() from public,anon,authenticated;