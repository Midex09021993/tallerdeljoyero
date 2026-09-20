create table if not exists public.pedido_comercial (
  pedido_id uuid primary key references public.pedidos(id) on delete cascade,
  telefono text not null default '',
  importe numeric not null default 0,
  a_cuenta numeric not null default 0,
  saldo numeric,
  cotizacion_detalles jsonb not null default '{}'::jsonb,
  especificaciones_comerciales jsonb not null default '{}'::jsonb,
  ventas_estado text not null default 'pendiente',
  packing_estado text not null default 'pendiente',
  medio_envio text not null default '',
  guia_envio text not null default '',
  fecha_envio date,
  fecha_entregado date,
  receptor_envio text not null default '',
  notas_ventas text not null default '',
  fecha_listo_entrega timestamptz,
  listo_entrega_observaciones text,
  notas_envio text,
  notas_entrega text,
  usuario_listo_entrega text,
  usuario_envio text,
  usuario_entrega text,
  ventas_actualizado_por text,
  ventas_actualizado_en timestamptz,
  enviado_at timestamptz,
  entregado_at timestamptz
);

alter table public.pedido_comercial enable row level security;

revoke all on public.pedido_comercial from anon;
grant select, insert, update, delete on public.pedido_comercial to authenticated;

drop policy if exists "pedido_comercial select" on public.pedido_comercial;
drop policy if exists "pedido_comercial insert" on public.pedido_comercial;
drop policy if exists "pedido_comercial update" on public.pedido_comercial;
drop policy if exists "pedido_comercial delete" on public.pedido_comercial;

create policy "pedido_comercial select"
on public.pedido_comercial
for select
to authenticated
using (
  exists (
    select 1 from public.pedidos p
    where p.id = pedido_comercial.pedido_id
      and (
        has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          has_role((select auth.uid()), 'gerente'::public.app_role)
          and p.sede_id = mi_sede((select auth.uid()))
        )
      )
  )
);

create policy "pedido_comercial insert"
on public.pedido_comercial
for insert
to authenticated
with check (
  exists (
    select 1 from public.pedidos p
    where p.id = pedido_comercial.pedido_id
      and (
        has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          has_role((select auth.uid()), 'gerente'::public.app_role)
          and p.sede_id = mi_sede((select auth.uid()))
        )
      )
  )
);

create policy "pedido_comercial update"
on public.pedido_comercial
for update
to authenticated
using (
  exists (
    select 1 from public.pedidos p
    where p.id = pedido_comercial.pedido_id
      and (
        has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          has_role((select auth.uid()), 'gerente'::public.app_role)
          and p.sede_id = mi_sede((select auth.uid()))
        )
      )
  )
)
with check (
  exists (
    select 1 from public.pedidos p
    where p.id = pedido_comercial.pedido_id
      and (
        has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          has_role((select auth.uid()), 'gerente'::public.app_role)
          and p.sede_id = mi_sede((select auth.uid()))
        )
      )
  )
);

create policy "pedido_comercial delete"
on public.pedido_comercial
for delete
to authenticated
using (
  exists (
    select 1 from public.pedidos p
    where p.id = pedido_comercial.pedido_id
      and (
        has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          has_role((select auth.uid()), 'gerente'::public.app_role)
          and p.sede_id = mi_sede((select auth.uid()))
        )
      )
  )
);

insert into public.pedido_comercial (
  pedido_id, telefono, importe, a_cuenta, saldo,
  cotizacion_detalles, especificaciones_comerciales,
  ventas_estado, packing_estado, medio_envio, guia_envio,
  fecha_envio, fecha_entregado, receptor_envio, notas_ventas,
  fecha_listo_entrega, listo_entrega_observaciones, notas_envio, notas_entrega,
  usuario_listo_entrega, usuario_envio, usuario_entrega,
  ventas_actualizado_por, ventas_actualizado_en, enviado_at, entregado_at
)
select
  p.id, p.telefono, p.importe, p.a_cuenta, p.saldo,
  p.cotizacion_detalles, p.especificaciones_comerciales,
  p.ventas_estado, p.packing_estado, p.medio_envio, p.guia_envio,
  p.fecha_envio, p.fecha_entregado, p.receptor_envio, p.notas_ventas,
  p.fecha_listo_entrega, p.listo_entrega_observaciones, p.notas_envio, p.notas_entrega,
  p.usuario_listo_entrega, p.usuario_envio, p.usuario_entrega,
  p.ventas_actualizado_por, p.ventas_actualizado_en, p.enviado_at, p.entregado_at
from public.pedidos p
on conflict (pedido_id) do update set
  telefono = excluded.telefono,
  importe = excluded.importe,
  a_cuenta = excluded.a_cuenta,
  saldo = excluded.saldo,
  cotizacion_detalles = excluded.cotizacion_detalles,
  especificaciones_comerciales = excluded.especificaciones_comerciales,
  ventas_estado = excluded.ventas_estado,
  packing_estado = excluded.packing_estado,
  medio_envio = excluded.medio_envio,
  guia_envio = excluded.guia_envio,
  fecha_envio = excluded.fecha_envio,
  fecha_entregado = excluded.fecha_entregado,
  receptor_envio = excluded.receptor_envio,
  notas_ventas = excluded.notas_ventas,
  fecha_listo_entrega = excluded.fecha_listo_entrega,
  listo_entrega_observaciones = excluded.listo_entrega_observaciones,
  notas_envio = excluded.notas_envio,
  notas_entrega = excluded.notas_entrega,
  usuario_listo_entrega = excluded.usuario_listo_entrega,
  usuario_envio = excluded.usuario_envio,
  usuario_entrega = excluded.usuario_entrega,
  ventas_actualizado_por = excluded.ventas_actualizado_por,
  ventas_actualizado_en = excluded.ventas_actualizado_en,
  enviado_at = excluded.enviado_at,
  entregado_at = excluded.entregado_at;
