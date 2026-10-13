-- Endurece el aislamiento multi-participante de las asignaciones producto-colección.
-- Una relación solo puede unir un producto y una colección del mismo participante.
-- No modifica ni elimina datos existentes.

begin;

drop policy if exists "catalogo_relaciones_select_interno" on public.catalogo_productos_colecciones;
drop policy if exists "catalogo_relaciones_admin_write" on public.catalogo_productos_colecciones;

create policy "catalogo_relaciones_select_interno"
on public.catalogo_productos_colecciones
for select
to authenticated
using (
  exists (
    select 1
    from public.catalogo_productos p
    join public.catalogo_colecciones c
      on c.id = coleccion_id
     and c.participante_id = p.participante_id
    where p.id = producto_id
      and public.tiene_participante((select auth.uid()), p.participante_id)
  )
);

create policy "catalogo_relaciones_admin_write"
on public.catalogo_productos_colecciones
for all
to authenticated
using (
  exists (
    select 1
    from public.catalogo_productos p
    where p.id = producto_id
      and public.es_admin((select auth.uid()))
      and public.tiene_participante((select auth.uid()), p.participante_id)
  )
)
with check (
  exists (
    select 1
    from public.catalogo_productos p
    join public.catalogo_colecciones c
      on c.id = coleccion_id
     and c.participante_id = p.participante_id
    where p.id = producto_id
      and public.es_admin((select auth.uid()))
      and public.tiene_participante((select auth.uid()), p.participante_id)
  )
);

commit;
