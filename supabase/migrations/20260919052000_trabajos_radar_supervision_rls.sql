drop policy if exists "trabajos_select_supervision" on public.trabajos;

create policy "trabajos_select_supervision"
on public.trabajos
for select
to authenticated
using (
  public.es_admin(auth.uid())
  or responsable_user_id = auth.uid()
  or (
    participante_id is not null
    and exists (
      select 1 from public.participante_cuentas pc
      where pc.participante_id = trabajos.participante_id
        and pc.user_id = auth.uid()
        and pc.estado = 'activo'
    )
  )
  or (
    public.has_role(auth.uid(), 'monitor')
    and public.ve_sede(auth.uid(), sede_id)
  )
);

drop policy if exists "incidencias_select_supervision" on public.incidencias_trabajo;

create policy "incidencias_select_supervision"
on public.incidencias_trabajo
for select
to authenticated
using (
  public.es_admin(auth.uid())
  or reportado_por = auth.uid()
  or exists (
    select 1 from public.trabajos t
    where t.id = incidencias_trabajo.trabajo_id
      and (
        t.responsable_user_id = auth.uid()
        or (
          t.participante_id is not null
          and exists (
            select 1 from public.participante_cuentas pc
            where pc.participante_id = t.participante_id
              and pc.user_id = auth.uid()
              and pc.estado = 'activo'
          )
        )
        or (
          public.has_role(auth.uid(), 'monitor')
          and public.ve_sede(auth.uid(), t.sede_id)
        )
      )
  )
);