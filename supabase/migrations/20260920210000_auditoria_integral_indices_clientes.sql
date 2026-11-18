-- Deep audit hardening: keep the live schema aligned with the ERP access model.
-- Clients always belong to a workshop branch; managers stay in their own branch.
-- Retire an unused security scanner fixture and duplicate index.
-- Keep public customer tracking available with a pinned search_path.

alter table public.clientes
  alter column sede_id set not null;

drop policy if exists "clientes manage" on public.clientes;
drop policy if exists "clientes update" on public.clientes;

create policy "clientes manage"
on public.clientes
for insert
to authenticated
with check (
  sede_id is not null
  and (
    has_role((select auth.uid()), 'dueno'::app_role)
    or (
      has_role((select auth.uid()), 'gerente'::app_role)
      and sede_id = mi_sede((select auth.uid()))
    )
  )
);

create policy "clientes update"
on public.clientes
for update
to authenticated
using (
  sede_id is not null
  and (
    has_role((select auth.uid()), 'dueno'::app_role)
    or (
      has_role((select auth.uid()), 'gerente'::app_role)
      and sede_id = mi_sede((select auth.uid()))
    )
  )
)
with check (
  sede_id is not null
  and (
    has_role((select auth.uid()), 'dueno'::app_role)
    or (
      has_role((select auth.uid()), 'gerente'::app_role)
      and sede_id = mi_sede((select auth.uid()))
    )
  )
);

drop function if exists public.security_scanner_bola_lab_lookup(uuid);
drop table if exists public.security_scanner_bola_lab;

drop index if exists public.pedido_materiales_material_idx;

create or replace function public.seguimiento_pedido(_ref text)
returns table (
  referencia text,
  trabajo text,
  cliente text,
  area_actual text,
  estado text,
  ventas_estado text,
  ruta text[],
  fecha_entrega date,
  fecha_envio date,
  fecha_entregado date,
  medio_envio text,
  guia_envio text,
  receptor_envio text,
  sede text
)
language sql
stable
security definer
set search_path = ''
as $function$
  select p.referencia, coalesce(nullif(p.trabajo,''),p.pieza), split_part(p.cliente,' ',1),
         p.area_actual, p.estado, pc.ventas_estado, p.ruta, p.fecha_entrega,
         pc.fecha_envio, pc.fecha_entregado, pc.medio_envio, pc.guia_envio,
         pc.receptor_envio, s.nombre
  from public.pedido_comercial pc
  join public.pedidos p on p.id=pc.pedido_id
  left join public.sedes s on s.id=p.sede_id
  where pc.seguimiento_token::text=lower(trim(_ref))
  limit 1;
$function$;

revoke all on function public.seguimiento_pedido(text) from public;
grant execute on function public.seguimiento_pedido(text) to anon, authenticated;
