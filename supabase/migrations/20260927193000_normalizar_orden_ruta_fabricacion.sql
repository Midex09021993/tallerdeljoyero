-- Garantiza que la ruta de fabricación tenga un orden operativo único.
-- El orden canónico es:
-- Diseño 3D -> Impresión 3D -> Casting -> Corte Láser -> Taller

create or replace function public.normalizar_ruta_fabricacion()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_ruta_canonic text[] := ARRAY[
    'Diseño 3D',
    'Impresión 3D',
    'Casting',
    'Corte Láser',
    'Taller'
  ]::text[];
begin
  if NEW.ruta is null then
    return NEW;
  end if;

  NEW.ruta := ARRAY(
    select area
    from unnest(v_ruta_canonic) as canon(area)
    where canon.area = any(NEW.ruta)
  );

  return NEW;
end;
$$;

drop trigger if exists trg_normalizar_ruta_fabricacion on public.pedidos;

create trigger trg_normalizar_ruta_fabricacion
before insert or update of ruta on public.pedidos
for each row
execute function public.normalizar_ruta_fabricacion();

-- Normaliza también las rutas existentes para que la secuencia almacenada
-- coincida con la secuencia operativa.
update public.pedidos
set ruta = ARRAY(
  select area
  from unnest(ARRAY[
    'Diseño 3D',
    'Impresión 3D',
    'Casting',
    'Corte Láser',
    'Taller'
  ]::text[]) as canon(area)
  where canon.area = any(coalesce(public.pedidos.ruta, ARRAY[]::text[]))
)
where ruta is not null;
