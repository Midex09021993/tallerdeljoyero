alter table public.pedido_comercial
  add column if not exists seguimiento_token uuid not null default gen_random_uuid();

create unique index if not exists pedido_comercial_seguimiento_token_uidx
  on public.pedido_comercial (seguimiento_token);

drop function if exists public.seguimiento_pedido(text);

create function public.seguimiento_pedido(_token text)
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
set search_path = public
as $$
  select
    p.referencia,
    coalesce(nullif(p.trabajo, ''), p.pieza),
    split_part(p.cliente, ' ', 1),
    p.area_actual,
    p.estado,
    pc.ventas_estado,
    p.ruta,
    p.fecha_entrega,
    pc.fecha_envio,
    pc.fecha_entregado,
    pc.medio_envio,
    pc.guia_envio,
    pc.receptor_envio,
    s.nombre
  from public.pedido_comercial pc
  join public.pedidos p on p.id = pc.pedido_id
  left join public.sedes s on s.id = p.sede_id
  where pc.seguimiento_token::text = lower(trim(_token))
  limit 1;
$$;

revoke all on function public.seguimiento_pedido(text) from public, anon, authenticated;
grant execute on function public.seguimiento_pedido(text) to anon, authenticated;
