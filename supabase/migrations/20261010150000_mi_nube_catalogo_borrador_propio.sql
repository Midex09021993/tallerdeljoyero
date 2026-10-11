-- Permite que cada taller añada al borrador de su propio catálogo
-- una imagen elegida desde Mi Nube, sin habilitar la administración general.
-- El producto queda sin publicar y no destacado; publicar/configurar catálogo
-- sigue sujeto a las políticas administrativas existentes.
begin;

drop policy if exists "Mi Nube catalogo insertar borrador propio"
on public.catalogo_productos;

create policy "Mi Nube catalogo insertar borrador propio"
on public.catalogo_productos
for insert
to authenticated
with check (
  publicado = false
  and destacado = false
  and exists (
    select 1
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep
      on ep.id = pc.participante_id
    where pc.user_id = (select auth.uid())
      and pc.participante_id = catalogo_productos.participante_id
      and pc.estado = 'activo'
      and ep.estado = 'activo'
  )
);

-- El botón de Mi Nube copia la imagen a:
-- <participante_id>/mi-nube/<uuid>-<nombre>
-- No permite sobrescribir, editar ni borrar objetos del catálogo.
drop policy if exists "Mi Nube catalogo subir imagen propia"
on storage.objects;

create policy "Mi Nube catalogo subir imagen propia"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'catalogo-joyas'
  and split_part(name, '/', 2) = 'mi-nube'
  and exists (
    select 1
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep
      on ep.id = pc.participante_id
    where pc.user_id = (select auth.uid())
      and pc.participante_id::text = split_part(name, '/', 1)
      and pc.estado = 'activo'
      and ep.estado = 'activo'
  )
);

commit;
