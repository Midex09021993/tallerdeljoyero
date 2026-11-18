begin;

-- Consolidate overlapping SELECT policies while preserving access semantics.

drop policy if exists "clientes gestionar" on public.clientes;
drop policy if exists "clientes ver" on public.clientes;
create policy "clientes select" on public.clientes for select to authenticated
using ((select has_role((select auth.uid()), 'dueno'::app_role))
    or (select has_role((select auth.uid()), 'gerente'::app_role))
    or sede_id = (select mi_sede((select auth.uid()))));
create policy "clientes insert" on public.clientes for insert to authenticated
with check ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)));
create policy "clientes update" on public.clientes for update to authenticated
using ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)))
with check ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)));
create policy "clientes delete" on public.clientes for delete to authenticated
using ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)));

drop policy if exists "contrato_pagos gestionar" on public.contrato_pagos;
drop policy if exists "contrato_pagos ver" on public.contrato_pagos;
create policy "contrato_pagos select" on public.contrato_pagos for select to authenticated
using (exists (select 1 from public.contratos c where c.id=contrato_pagos.contrato_id
  and ((select has_role((select auth.uid()), 'dueno'::app_role))
    or (select has_role((select auth.uid()), 'gerente'::app_role))
    or c.sede_id=(select mi_sede((select auth.uid()))))));
create policy "contrato_pagos insert" on public.contrato_pagos for insert to authenticated
with check ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)));
create policy "contrato_pagos update" on public.contrato_pagos for update to authenticated
using ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)))
with check ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)));
create policy "contrato_pagos delete" on public.contrato_pagos for delete to authenticated
using ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)));

drop policy if exists "contratos gestionar" on public.contratos;
drop policy if exists "contratos ver" on public.contratos;
create policy "contratos select" on public.contratos for select to authenticated
using ((select has_role((select auth.uid()), 'dueno'::app_role))
    or (select has_role((select auth.uid()), 'gerente'::app_role))
    or sede_id=(select mi_sede((select auth.uid()))));
create policy "contratos insert" on public.contratos for insert to authenticated
with check ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)));
create policy "contratos update" on public.contratos for update to authenticated
using ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)))
with check ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)));
create policy "contratos delete" on public.contratos for delete to authenticated
using ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)));

drop policy if exists "cotizacion_detalles gestionar" on public.cotizacion_detalles;
drop policy if exists "cotizacion_detalles ver" on public.cotizacion_detalles;
create policy "cotizacion_detalles select" on public.cotizacion_detalles for select to authenticated
using (exists (select 1 from public.cotizaciones c where c.id=cotizacion_detalles.cotizacion_id
  and ((select has_role((select auth.uid()), 'dueno'::app_role))
    or (select has_role((select auth.uid()), 'gerente'::app_role))
    or c.sede_id=(select mi_sede((select auth.uid()))))));
create policy "cotizacion_detalles insert" on public.cotizacion_detalles for insert to authenticated
with check (exists (select 1 from public.cotizaciones c where c.id=cotizacion_detalles.cotizacion_id
  and ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)))));
create policy "cotizacion_detalles update" on public.cotizacion_detalles for update to authenticated
using (exists (select 1 from public.cotizaciones c where c.id=cotizacion_detalles.cotizacion_id
  and ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)))))
with check (exists (select 1 from public.cotizaciones c where c.id=cotizacion_detalles.cotizacion_id
  and ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)))));
create policy "cotizacion_detalles delete" on public.cotizacion_detalles for delete to authenticated
using (exists (select 1 from public.cotizaciones c where c.id=cotizacion_detalles.cotizacion_id
  and ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)))));

drop policy if exists "cotizaciones gestionar" on public.cotizaciones;
drop policy if exists "cotizaciones ver" on public.cotizaciones;
create policy "cotizaciones select" on public.cotizaciones for select to authenticated
using ((select has_role((select auth.uid()), 'dueno'::app_role))
    or (select has_role((select auth.uid()), 'gerente'::app_role))
    or sede_id=(select mi_sede((select auth.uid()))));
create policy "cotizaciones insert" on public.cotizaciones for insert to authenticated
with check ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)));
create policy "cotizaciones update" on public.cotizaciones for update to authenticated
using ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)))
with check ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)));
create policy "cotizaciones delete" on public.cotizaciones for delete to authenticated
using ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)));

drop policy if exists "account_read_own_participant_profile" on public.ecosistema_participantes;
drop policy if exists "read_ecosistema_participantes" on public.ecosistema_participantes;
create policy "read_ecosistema_participantes" on public.ecosistema_participantes for select to authenticated
using ((select has_role((select auth.uid()), 'dueno'::app_role))
    or exists (select 1 from public.participante_cuentas pc
       where pc.participante_id=ecosistema_participantes.id
         and pc.user_id=(select auth.uid()) and pc.estado='activo'));

drop policy if exists "identidades comerciales gestionar" on public.identidades_comerciales;
drop policy if exists "identidades comerciales ver" on public.identidades_comerciales;
create policy "identidades comerciales select" on public.identidades_comerciales for select to authenticated
using ((select has_role((select auth.uid()), 'dueno'::app_role))
    or (select has_role((select auth.uid()), 'gerente'::app_role))
    or sede_id=(select mi_sede((select auth.uid()))));
create policy "identidades comerciales insert" on public.identidades_comerciales for insert to authenticated
with check ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)));
create policy "identidades comerciales update" on public.identidades_comerciales for update to authenticated
using ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)))
with check ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)));
create policy "identidades comerciales delete" on public.identidades_comerciales for delete to authenticated
using ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)));

drop policy if exists "proyectos_joya gestionar" on public.proyectos_joya;
drop policy if exists "proyectos_joya ver" on public.proyectos_joya;
create policy "proyectos_joya select" on public.proyectos_joya for select to authenticated
using ((select has_role((select auth.uid()), 'dueno'::app_role))
    or (select has_role((select auth.uid()), 'gerente'::app_role))
    or sede_id=(select mi_sede((select auth.uid()))));
create policy "proyectos_joya insert" on public.proyectos_joya for insert to authenticated
with check ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)));
create policy "proyectos_joya update" on public.proyectos_joya for update to authenticated
using ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)))
with check ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)));
create policy "proyectos_joya delete" on public.proyectos_joya for delete to authenticated
using ((select has_role((select auth.uid()), 'dueno'::app_role)) or (select has_role((select auth.uid()), 'gerente'::app_role)));

commit;
