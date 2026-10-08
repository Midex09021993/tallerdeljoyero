-- Catálogo maestro: código automático, único y no editable.
-- Se conserva el código histórico de productos existentes.
begin;

create sequence if not exists public.catalogo_productos_codigo_seq;

select setval(
  'public.catalogo_productos_codigo_seq',
  greatest(
    coalesce((
      select max(substring(codigo from '^JOY-([0-9]+)$')::bigint)
      from public.catalogo_productos
    ), 0),
    (select last_value from public.catalogo_productos_codigo_seq)
  ),
  true
);

create or replace function public.generar_codigo_catalogo_producto()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.codigo := 'JOY-' || lpad(nextval('public.catalogo_productos_codigo_seq')::text, 6, '0');
  elsif tg_op = 'UPDATE' and new.codigo is distinct from old.codigo then
    new.codigo := old.codigo;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_catalogo_productos_codigo_automatico
on public.catalogo_productos;

create trigger trg_catalogo_productos_codigo_automatico
before insert or update of codigo
on public.catalogo_productos
for each row
execute function public.generar_codigo_catalogo_producto();

create unique index if not exists catalogo_productos_codigo_global_uq
on public.catalogo_productos (codigo);

commit;
