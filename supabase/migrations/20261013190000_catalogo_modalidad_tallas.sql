-- Configuración de talla por producto para el catálogo público.
begin;
alter table public.catalogo_productos
  add column if not exists modalidad_talla text,
  add column if not exists sistema_tallas text,
  add column if not exists tallas_disponibles text;
alter table public.catalogo_productos drop constraint if exists catalogo_productos_modalidad_talla_chk;
alter table public.catalogo_productos add constraint catalogo_productos_modalidad_talla_chk
  check (modalidad_talla is null or modalidad_talla in ('a_medida','disponibles','ajustable','unica'));
notify pgrst, 'reload schema';
commit;
