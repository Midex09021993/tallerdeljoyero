-- Refuerza el aislamiento de relaciones producto-colección también en USING.
-- Las políticas FOR ALL también participan en SELECT; por eso USING debe
-- comprobar que producto y colección pertenecen al mismo participante.
-- No modifica ni elimina datos existentes.

begin;

drop policy if exists "catalogo_relaciones_admin_write"
  on public.catalogo_productos_colecciones;

create policy "catalogo_relaciones_admin_write"
on public.catalogo_productos_colecciones
for all
to authenticated
using (
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
