-- Catálogo comercial: solicitudes públicas de cotización.
begin;

create table if not exists public.catalogo_solicitudes_cotizacion (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.ecosistema_participantes(id) on delete cascade,
  producto_id uuid not null references public.catalogo_productos(id) on delete cascade,
  nombre_cliente text not null,
  telefono text,
  email text,
  cantidad numeric not null default 1,
  mensaje text,
  estado text not null default 'pendiente',
  cliente_id uuid references public.clientes(id) on delete set null,
  cotizacion_id uuid references public.cotizaciones(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogo_solicitudes_cantidad_chk check (cantidad > 0),
  constraint catalogo_solicitudes_estado_chk check (estado in ('pendiente','contactada','cotizada','cerrada','descartada'))
);

create index if not exists catalogo_solicitudes_participante_estado_idx
on public.catalogo_solicitudes_cotizacion(participante_id, estado, created_at desc);

create index if not exists catalogo_solicitudes_producto_idx
on public.catalogo_solicitudes_cotizacion(producto_id, created_at desc);

alter table public.catalogo_solicitudes_cotizacion enable row level security;

drop policy if exists catalogo_solicitudes_admin_select on public.catalogo_solicitudes_cotizacion;
create policy catalogo_solicitudes_admin_select
on public.catalogo_solicitudes_cotizacion
for select to authenticated
using (
  public.es_admin(auth.uid())
  and public.tiene_participante(auth.uid(), participante_id)
);

drop policy if exists catalogo_solicitudes_admin_update on public.catalogo_solicitudes_cotizacion;
create policy catalogo_solicitudes_admin_update
on public.catalogo_solicitudes_cotizacion
for update to authenticated
using (
  public.es_admin(auth.uid())
  and public.tiene_participante(auth.uid(), participante_id)
)
with check (
  public.es_admin(auth.uid())
  and public.tiene_participante(auth.uid(), participante_id)
);

create or replace function public.registrar_solicitud_catalogo(
  _catalogo_slug text,
  _producto_slug text,
  _nombre text,
  _telefono text default null,
  _email text default null,
  _cantidad numeric default 1,
  _mensaje text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participante uuid;
  v_producto uuid;
  v_id uuid;
begin
  if nullif(btrim(_nombre), '') is null then
    raise exception 'El nombre es obligatorio';
  end if;

  if coalesce(_cantidad, 0) <= 0 then
    raise exception 'La cantidad debe ser mayor que cero';
  end if;

  select c.participante_id
    into v_participante
  from public.catalogo_configuracion c
  where lower(trim(c.slug)) = lower(trim(_catalogo_slug))
    and c.visible = true
  limit 1;

  if v_participante is null then
    raise exception 'Catálogo no disponible';
  end if;

  select p.id
    into v_producto
  from public.catalogo_productos p
  where p.participante_id = v_participante
    and lower(trim(p.slug)) = lower(trim(_producto_slug))
    and p.publicado = true
  limit 1;

  if v_producto is null then
    raise exception 'Producto no disponible';
  end if;

  insert into public.catalogo_solicitudes_cotizacion (
    participante_id, producto_id, nombre_cliente, telefono, email, cantidad, mensaje
  )
  values (
    v_participante, v_producto, btrim(_nombre),
    nullif(btrim(coalesce(_telefono,'')), ''),
    nullif(btrim(coalesce(_email,'')), ''),
    _cantidad,
    nullif(btrim(coalesce(_mensaje,'')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.registrar_solicitud_catalogo(text,text,text,text,text,numeric,text) from public;
grant execute on function public.registrar_solicitud_catalogo(text,text,text,text,text,numeric,text) to anon, authenticated;

notify pgrst, 'reload schema';
commit;