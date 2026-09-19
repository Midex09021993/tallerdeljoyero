drop policy if exists "trabajos_select_operativo" on public.trabajos;

create policy "trabajos_select_operativo"
on public.trabajos
for select
to authenticated
using (
  public.es_admin(auth.uid())
  or responsable_user_id = auth.uid()
  or (
    participante_id is not null
    and exists (
      select 1
      from public.participante_cuentas pc
      where pc.participante_id = trabajos.participante_id
        and pc.user_id = auth.uid()
        and pc.estado = 'activo'
    )
  )
);
