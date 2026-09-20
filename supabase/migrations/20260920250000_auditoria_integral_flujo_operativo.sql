-- Auditoría integral del flujo operativo: Pedido -> Producción -> Inventario -> Costos -> Calidad -> Entrega
-- Corrige aislamiento de sede en OP, endurece invariantes y completa índices de FK críticos.

alter table public.pedidos alter column sede_id set not null;
alter table public.ordenes_produccion alter column sede_id set not null;
alter table public.trabajos alter column sede_id set not null;

drop policy if exists "op crear operativo" on public.ordenes_produccion;
create policy "op crear operativo"
on public.ordenes_produccion
for insert
to authenticated
with check (
  ve_sede((select auth.uid()), sede_id)
  and (
    es_admin((select auth.uid()))
    or has_role((select auth.uid()), 'operario'::app_role)
    or has_role((select auth.uid()), 'monitor'::app_role)
  )
  and exists (
    select 1
    from public.pedidos p
    where p.id = ordenes_produccion.pedido_id
      and p.sede_id = ordenes_produccion.sede_id
  )
);

drop index if exists public.inventario_mov_pedido_idx;

create index if not exists inventario_movimientos_usuario_id_idx
  on public.inventario_movimientos(usuario_id)
  where usuario_id is not null;

create index if not exists trabajos_creado_por_idx
  on public.trabajos(creado_por)
  where creado_por is not null;

create index if not exists control_calidad_retrabajo_trabajo_idx
  on public.control_calidad(retrabajo_trabajo_id)
  where retrabajo_trabajo_id is not null;

create index if not exists compra_detalles_material_id_idx
  on public.compra_detalles(material_id);

create index if not exists compras_creado_por_idx
  on public.compras(creado_por)
  where creado_por is not null;

create index if not exists inventario_joyas_importacion_id_idx
  on public.inventario_joyas(importacion_id)
  where importacion_id is not null;

create index if not exists inventario_joyas_importaciones_creado_por_idx
  on public.inventario_joyas_importaciones(creado_por)
  where creado_por is not null;

create index if not exists inventario_joyas_importaciones_sede_id_idx
  on public.inventario_joyas_importaciones(sede_id);

create index if not exists trabajo_archivos_creado_por_idx
  on public.trabajo_archivos(creado_por)
  where creado_por is not null;

create index if not exists incidencias_trabajo_resuelto_por_idx
  on public.incidencias_trabajo(resuelto_por)
  where resuelto_por is not null;

-- Evita que el mismo OP termine asociado a pedidos de otra sede mediante una edición.
drop policy if exists "op actualizar operativo" on public.ordenes_produccion;
create policy "op actualizar operativo"
on public.ordenes_produccion
for update
to authenticated
using (
  ve_sede((select auth.uid()), sede_id)
  and (
    es_admin((select auth.uid()))
    or has_role((select auth.uid()), 'operario'::app_role)
    or has_role((select auth.uid()), 'monitor'::app_role)
  )
)
with check (
  ve_sede((select auth.uid()), sede_id)
  and (
    es_admin((select auth.uid()))
    or has_role((select auth.uid()), 'operario'::app_role)
    or has_role((select auth.uid()), 'monitor'::app_role)
  )
  and exists (
    select 1
    from public.pedidos p
    where p.id = ordenes_produccion.pedido_id
      and p.sede_id = ordenes_produccion.sede_id
  )
);