create index if not exists clientes_creado_por_idx on public.clientes(creado_por);
create index if not exists contrato_pagos_usuario_id_idx on public.contrato_pagos(usuario_id);
create index if not exists contratos_sede_id_idx on public.contratos(sede_id);
create index if not exists cotizaciones_creado_por_idx on public.cotizaciones(creado_por);
create index if not exists proyectos_joya_creado_por_idx on public.proyectos_joya(creado_por);

drop policy if exists "config sistema insertar dueno" on public.config_sistema;
drop policy if exists "config sistema actualizar dueno" on public.config_sistema;
drop policy if exists "config sistema eliminar dueno" on public.config_sistema;

create policy "config sistema insertar dueno" on public.config_sistema
for insert to authenticated with check ((select has_role((select auth.uid()), 'dueno'::app_role)));

create policy "config sistema actualizar dueno" on public.config_sistema
for update to authenticated using ((select has_role((select auth.uid()), 'dueno'::app_role)))
with check ((select has_role((select auth.uid()), 'dueno'::app_role)));

create policy "config sistema eliminar dueno" on public.config_sistema
for delete to authenticated using ((select has_role((select auth.uid()), 'dueno'::app_role)));