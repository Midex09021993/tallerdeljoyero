-- Hardening of core RLS and security helper functions.
-- Customer tracking remains intentionally public through seguimiento_pedido().

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select _user_id = auth.uid() and exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create or replace function public.es_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select _user_id = auth.uid() and exists (select 1 from public.user_roles where user_id=_user_id and role in ('dueno','gerente')) $$;

create or replace function public.mi_sede(_user_id uuid)
returns uuid language sql stable security definer set search_path = public
as $$ select case when _user_id = auth.uid() then (select sede_id from public.profiles where id=_user_id) else null end $$;

create or replace function public.ve_sede(_user_id uuid, _sede_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select _user_id = auth.uid() and (public.has_role(_user_id,'dueno') or _sede_id is null or _sede_id=public.mi_sede(_user_id)) $$;

drop policy if exists "Taller abierto inventario" on public.inventario;
drop policy if exists "Taller abierto pedidos" on public.pedidos;
drop policy if exists "Taller abierto procesos" on public.procesos;
drop policy if exists "Taller abierto tareas" on public.tareas_taller;

create policy "pedidos leer sede" on public.pedidos for select to authenticated using (public.ve_sede((select auth.uid()),sede_id));
create policy "pedidos crear admin" on public.pedidos for insert to authenticated with check (public.es_admin((select auth.uid())) and public.ve_sede((select auth.uid()),sede_id));
create policy "pedidos actualizar operativo" on public.pedidos for update to authenticated using (public.ve_sede((select auth.uid()),sede_id) and (public.es_admin((select auth.uid())) or public.has_role((select auth.uid()),'operario') or public.has_role((select auth.uid()),'monitor'))) with check (public.ve_sede((select auth.uid()),sede_id) and (public.es_admin((select auth.uid())) or public.has_role((select auth.uid()),'operario') or public.has_role((select auth.uid()),'monitor')));
create policy "pedidos borrar admin" on public.pedidos for delete to authenticated using (public.es_admin((select auth.uid())));

create policy "inventario leer sede" on public.inventario for select to authenticated using (public.ve_sede((select auth.uid()),sede_id));
create policy "inventario crear admin" on public.inventario for insert to authenticated with check (public.es_admin((select auth.uid())) and public.ve_sede((select auth.uid()),sede_id));
create policy "inventario actualizar admin" on public.inventario for update to authenticated using (public.es_admin((select auth.uid())) and public.ve_sede((select auth.uid()),sede_id)) with check (public.es_admin((select auth.uid())) and public.ve_sede((select auth.uid()),sede_id));
create policy "inventario borrar admin" on public.inventario for delete to authenticated using (public.es_admin((select auth.uid())) and public.ve_sede((select auth.uid()),sede_id));

create policy "procesos leer sede" on public.procesos for select to authenticated using (public.ve_sede((select auth.uid()),sede_id));
create policy "procesos crear operativo" on public.procesos for insert to authenticated with check (public.ve_sede((select auth.uid()),sede_id) and (public.es_admin((select auth.uid())) or public.has_role((select auth.uid()),'operario') or public.has_role((select auth.uid()),'monitor')));
create policy "procesos actualizar operativo" on public.procesos for update to authenticated using (public.ve_sede((select auth.uid()),sede_id) and (public.es_admin((select auth.uid())) or public.has_role((select auth.uid()),'operario') or public.has_role((select auth.uid()),'monitor'))) with check (public.ve_sede((select auth.uid()),sede_id) and (public.es_admin((select auth.uid())) or public.has_role((select auth.uid()),'operario') or public.has_role((select auth.uid()),'monitor')));
create policy "procesos borrar admin" on public.procesos for delete to authenticated using (public.es_admin((select auth.uid())));

create policy "tareas leer sede" on public.tareas_taller for select to authenticated using (public.ve_sede((select auth.uid()),sede_id));
create policy "tareas crear operativo" on public.tareas_taller for insert to authenticated with check (public.ve_sede((select auth.uid()),sede_id) and (public.es_admin((select auth.uid())) or public.has_role((select auth.uid()),'operario') or public.has_role((select auth.uid()),'monitor')));
create policy "tareas actualizar operativo" on public.tareas_taller for update to authenticated using (public.ve_sede((select auth.uid()),sede_id) and (public.es_admin((select auth.uid())) or public.has_role((select auth.uid()),'operario') or public.has_role((select auth.uid()),'monitor'))) with check (public.ve_sede((select auth.uid()),sede_id) and (public.es_admin((select auth.uid())) or public.has_role((select auth.uid()),'operario') or public.has_role((select auth.uid()),'monitor')));
create policy "tareas borrar admin" on public.tareas_taller for delete to authenticated using (public.es_admin((select auth.uid())));

create policy "sedes leer autenticado" on public.sedes for select to authenticated using (activa=true or public.es_admin((select auth.uid())) or id=public.mi_sede((select auth.uid())));
create policy "sedes crear dueno" on public.sedes for insert to authenticated with check (public.has_role((select auth.uid()),'dueno'));
create policy "sedes actualizar dueno" on public.sedes for update to authenticated using (public.has_role((select auth.uid()),'dueno')) with check (public.has_role((select auth.uid()),'dueno'));
create policy "sedes borrar dueno" on public.sedes for delete to authenticated using (public.has_role((select auth.uid()),'dueno'));

create policy "mov inventario leer sede" on public.inventario_movimientos for select to authenticated using (exists (select 1 from public.inventario i where i.id=material_id and public.ve_sede((select auth.uid()),i.sede_id)));
create policy "mov inventario crear operativo" on public.inventario_movimientos for insert to authenticated with check (exists (select 1 from public.inventario i where i.id=material_id and public.ve_sede((select auth.uid()),i.sede_id)) and (public.es_admin((select auth.uid())) or public.has_role((select auth.uid()),'operario') or public.has_role((select auth.uid()),'monitor')));

create policy "archivos pedidos leer sede" on public.pedido_archivos for select to authenticated using (exists (select 1 from public.pedidos p where p.id=pedido_id and public.ve_sede((select auth.uid()),p.sede_id)));
create policy "archivos pedidos crear operativo" on public.pedido_archivos for insert to authenticated with check (exists (select 1 from public.pedidos p where p.id=pedido_id and public.ve_sede((select auth.uid()),p.sede_id)) and (public.es_admin((select auth.uid())) or public.has_role((select auth.uid()),'operario') or public.has_role((select auth.uid()),'monitor')));
create policy "archivos pedidos actualizar operativo" on public.pedido_archivos for update to authenticated using (exists (select 1 from public.pedidos p where p.id=pedido_id and public.ve_sede((select auth.uid()),p.sede_id)) and (public.es_admin((select auth.uid())) or public.has_role((select auth.uid()),'operario') or public.has_role((select auth.uid()),'monitor'))) with check (exists (select 1 from public.pedidos p where p.id=pedido_id and public.ve_sede((select auth.uid()),p.sede_id)) and (public.es_admin((select auth.uid())) or public.has_role((select auth.uid()),'operario') or public.has_role((select auth.uid()),'monitor')));
create policy "archivos pedidos borrar admin" on public.pedido_archivos for delete to authenticated using (public.es_admin((select auth.uid())));

create policy "mov pedidos leer sede" on public.pedido_movimientos for select to authenticated using (exists (select 1 from public.pedidos p where p.id=pedido_id and public.ve_sede((select auth.uid()),p.sede_id)));
create policy "mov pedidos crear operativo" on public.pedido_movimientos for insert to authenticated with check (exists (select 1 from public.pedidos p where p.id=pedido_id and public.ve_sede((select auth.uid()),p.sede_id)) and (public.es_admin((select auth.uid())) or public.has_role((select auth.uid()),'operario') or public.has_role((select auth.uid()),'monitor')));

create index if not exists idx_inventario_sede_id on public.inventario(sede_id);
create index if not exists idx_inventario_mov_material_id on public.inventario_movimientos(material_id);
create index if not exists idx_inventario_mov_usuario_id on public.inventario_movimientos(usuario_id);
create index if not exists idx_pedido_archivos_pedido_id on public.pedido_archivos(pedido_id);
create index if not exists idx_pedido_movimientos_pedido_id on public.pedido_movimientos(pedido_id);
create index if not exists idx_pedido_movimientos_usuario_id on public.pedido_movimientos(usuario_id);
create index if not exists idx_pedidos_sede_id on public.pedidos(sede_id);
create index if not exists idx_procesos_sede_id on public.procesos(sede_id);
create index if not exists idx_profiles_sede_id on public.profiles(sede_id);
create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions(user_id);
create index if not exists idx_solicitudes_acceso_revisado_por on public.solicitudes_acceso(revisado_por);
create index if not exists idx_tareas_taller_sede_id on public.tareas_taller(sede_id);
create index if not exists idx_user_roles_sede_id on public.user_roles(sede_id);

revoke execute on function public.seguimiento_pedido(text) from public;
grant execute on function public.seguimiento_pedido(text) to anon,authenticated;
