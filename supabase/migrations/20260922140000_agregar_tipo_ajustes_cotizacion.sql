-- Amplía las categorías comerciales de las partidas de cotización.
-- Mantiene los valores existentes y agrega "ajustes" como categoría propia.
alter table public.cotizacion_detalles
  drop constraint if exists cotizacion_detalles_tipo_check;

alter table public.cotizacion_detalles
  add constraint cotizacion_detalles_tipo_check
  check (tipo in ('modelo','metal','piedras','fundicion','engaste','acabado','mano_obra','render','ajustes','otro'));
