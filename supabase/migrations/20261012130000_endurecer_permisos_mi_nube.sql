-- Endurece la lectura y revocación de permisos de Mi Nube entre talleres.
-- El propietario solo puede administrar permisos vinculados a un taller que realmente controla.
begin;

drop policy if exists "Mi Nube shares read participants" on public.mi_nube_compartidas;
create policy "Mi Nube shares read participants"
on public.mi_nube_compartidas
for select
to authenticated
using (
  (
    propietario_usuario_id = (select auth.uid())
    and exists (
      select 1
      from public.participante_cuentas pc
      join public.ecosistema_participantes ep on ep.id = pc.participante_id
      where pc.user_id = (select auth.uid())
        and pc.participante_id = propietario_participante_id
        and pc.estado = 'activo'
        and ep.estado = 'activo'
    )
  )
  or exists (
    select 1
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep on ep.id = pc.participante_id
    where pc.user_id = (select auth.uid())
      and pc.participante_id = destinatario_participante_id
      and pc.estado = 'activo'
      and ep.estado = 'activo'
  )
);

drop policy if exists "Mi Nube shares owner update" on public.mi_nube_compartidas;
create policy "Mi Nube shares owner update"
on public.mi_nube_compartidas
for update
to authenticated
using (
  propietario_usuario_id = (select auth.uid())
  and exists (
    select 1
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep on ep.id = pc.participante_id
    where pc.user_id = (select auth.uid())
      and pc.participante_id = propietario_participante_id
      and pc.estado = 'activo'
      and ep.estado = 'activo'
  )
)
with check (
  propietario_usuario_id = (select auth.uid())
  and creado_por = (select auth.uid())
  and length(trim(carpeta)) between 1 and 120
  and propietario_participante_id <> destinatario_participante_id
  and exists (
    select 1
    from public.participante_cuentas pc
    join public.ecosistema_participantes ep on ep.id = pc.participante_id
    where pc.user_id = (select auth.uid())
      and pc.participante_id = propietario_participante_id
      and pc.estado = 'activo'
      and ep.estado = 'activo'
  )
  and exists (
    select 1
    from public.ecosistema_participantes ep
    where ep.id = destinatario_participante_id
      and ep.estado = 'activo'
  )
);

comment on policy "Mi Nube shares owner update" on public.mi_nube_compartidas is
  'Permite al propietario administrar/revocar permisos solo desde un taller activo que controla.';

commit;
