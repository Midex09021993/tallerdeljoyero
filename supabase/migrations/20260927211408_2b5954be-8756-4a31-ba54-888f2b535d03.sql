alter table public.profiles add column if not exists participante_id uuid references public.ecosistema_participantes(id) on delete set null;
alter table public.clientes add column if not exists participante_id uuid references public.ecosistema_participantes(id) on delete set null;
alter table public.pedidos add column if not exists participante_id uuid references public.ecosistema_participantes(id) on delete set null;
alter table public.clientes alter column sede_id drop not null;

drop policy if exists "participantes_propios_lectura" on public.ecosistema_participantes;
create policy "participantes_propios_lectura" on public.ecosistema_participantes
for select to authenticated
using (
  exists (
    select 1 from public.participante_cuentas pc
    where pc.user_id = auth.uid()
      and pc.participante_id = ecosistema_participantes.id
      and pc.estado = 'activo'
  )
);

drop policy if exists "clientes manage" on public.clientes;
create policy "clientes manage" on public.clientes for insert to authenticated
with check (
  (sede_id is not null and (has_role(auth.uid(), 'dueno'::app_role) or (has_role(auth.uid(), 'gerente'::app_role) and sede_id = mi_sede(auth.uid()))))
  or (
    participante_id is not null
    and (has_role(auth.uid(), 'dueno'::app_role) or has_role(auth.uid(), 'gerente'::app_role))
    and exists (
      select 1 from public.participante_cuentas pc
      where pc.user_id = auth.uid()
        and pc.participante_id = clientes.participante_id
        and pc.estado = 'activo'
    )
  )
);

drop policy if exists "clientes update" on public.clientes;
create policy "clientes update" on public.clientes for update to authenticated
using (
  (sede_id is not null and (has_role(auth.uid(), 'dueno'::app_role) or (has_role(auth.uid(), 'gerente'::app_role) and sede_id = mi_sede(auth.uid()))))
  or (
    participante_id is not null
    and (has_role(auth.uid(), 'dueno'::app_role) or has_role(auth.uid(), 'gerente'::app_role))
    and exists (
      select 1 from public.participante_cuentas pc
      where pc.user_id = auth.uid()
        and pc.participante_id = clientes.participante_id
        and pc.estado = 'activo'
    )
  )
)
with check (
  (sede_id is not null and (has_role(auth.uid(), 'dueno'::app_role) or (has_role(auth.uid(), 'gerente'::app_role) and sede_id = mi_sede(auth.uid()))))
  or (
    participante_id is not null
    and (has_role(auth.uid(), 'dueno'::app_role) or has_role(auth.uid(), 'gerente'::app_role))
    and exists (
      select 1 from public.participante_cuentas pc
      where pc.user_id = auth.uid()
        and pc.participante_id = clientes.participante_id
        and pc.estado = 'activo'
    )
  )
);

notify pgrst, 'reload schema';