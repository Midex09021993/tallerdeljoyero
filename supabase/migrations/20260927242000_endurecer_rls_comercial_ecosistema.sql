-- Endurecimiento de RLS comercial y de administracion.
-- Regla: gerente/usuario operativo nunca obtiene alcance por rol solamente.
-- El taller se autoriza mediante ve_sede(), cuya implementacion canonica usa
-- participante_cuentas -> ecosistema_participantes.
-- sedes permanece como compatibilidad de datos.

begin;

-- ============================================================
-- Helpers internos para operaciones administrativas sobre otros
-- usuarios. Nunca aceptan un actor arbitrario: siempre auth.uid().
-- ============================================================

create schema if not exists private;

create or replace function private.usuario_comparte_participante(
  _target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.participante_cuentas pc_target
    join public.participante_cuentas pc_actor
      on pc_actor.participante_id = pc_target.participante_id
     and pc_actor.estado = 'activo'
    join public.ecosistema_participantes ep
      on ep.id = pc_target.participante_id
     and ep.estado = 'activo'
    where pc_target.user_id = _target_user_id
      and pc_target.estado = 'activo'
      and pc_actor.user_id = (select auth.uid())
  )
$$;

revoke all on function private.usuario_comparte_participante(uuid) from public, anon, authenticated;
grant execute on function private.usuario_comparte_participante(uuid) to authenticated;

-- ============================================================
-- CLIENTES
-- ============================================================

drop policy if exists "clientes select" on public.clientes;
drop policy if exists "clientes insert" on public.clientes;
drop policy if exists "clientes update" on public.clientes;
drop policy if exists "clientes delete" on public.clientes;
drop policy if exists clientes_admin_write on public.clientes;

create policy "clientes select"
on public.clientes for select to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or public.ve_sede((select auth.uid()), sede_id)
);

create policy "clientes insert"
on public.clientes for insert to authenticated
with check (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
);

create policy "clientes update"
on public.clientes for update to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
)
with check (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
);

create policy "clientes delete"
on public.clientes for delete to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  and public.ve_sede((select auth.uid()), sede_id)
);

-- ============================================================
-- CONTRATOS Y PAGOS
-- ============================================================

drop policy if exists "contratos select" on public.contratos;
drop policy if exists "contratos insert" on public.contratos;
drop policy if exists "contratos update" on public.contratos;
drop policy if exists "contratos delete" on public.contratos;

create policy "contratos select"
on public.contratos for select to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or public.ve_sede((select auth.uid()), sede_id)
);

create policy "contratos insert"
on public.contratos for insert to authenticated
with check (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
);

create policy "contratos update"
on public.contratos for update to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
)
with check (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
);

create policy "contratos delete"
on public.contratos for delete to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  and public.ve_sede((select auth.uid()), sede_id)
);

drop policy if exists "contrato_pagos select" on public.contrato_pagos;
drop policy if exists "contrato_pagos insert" on public.contrato_pagos;
drop policy if exists "contrato_pagos update" on public.contrato_pagos;
drop policy if exists "contrato_pagos delete" on public.contrato_pagos;

create policy "contrato_pagos select"
on public.contrato_pagos for select to authenticated
using (
  exists (
    select 1
    from public.contratos c
    where c.id = contrato_pagos.contrato_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or public.ve_sede((select auth.uid()), c.sede_id)
      )
  )
);

create policy "contrato_pagos insert"
on public.contrato_pagos for insert to authenticated
with check (
  exists (
    select 1
    from public.contratos c
    where c.id = contrato_pagos.contrato_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and public.ve_sede((select auth.uid()), c.sede_id)
        )
      )
  )
);

create policy "contrato_pagos update"
on public.contrato_pagos for update to authenticated
using (
  exists (
    select 1
    from public.contratos c
    where c.id = contrato_pagos.contrato_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and public.ve_sede((select auth.uid()), c.sede_id)
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.contratos c
    where c.id = contrato_pagos.contrato_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and public.ve_sede((select auth.uid()), c.sede_id)
        )
      )
  )
);

create policy "contrato_pagos delete"
on public.contrato_pagos for delete to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  and exists (
    select 1
    from public.contratos c
    where c.id = contrato_pagos.contrato_id
      and public.ve_sede((select auth.uid()), c.sede_id)
  )
);

-- ============================================================
-- COTIZACIONES
-- ============================================================

drop policy if exists "cotizaciones select" on public.cotizaciones;
drop policy if exists "cotizaciones insert" on public.cotizaciones;
drop policy if exists "cotizaciones update" on public.cotizaciones;
drop policy if exists "cotizaciones delete" on public.cotizaciones;
drop policy if exists cotizaciones_admin_write on public.cotizaciones;

create policy "cotizaciones select"
on public.cotizaciones for select to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or public.ve_sede((select auth.uid()), sede_id)
);

create policy "cotizaciones insert"
on public.cotizaciones for insert to authenticated
with check (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
);

create policy "cotizaciones update"
on public.cotizaciones for update to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
)
with check (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
);

create policy "cotizaciones delete"
on public.cotizaciones for delete to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  and public.ve_sede((select auth.uid()), sede_id)
);

-- Detalles heredan el alcance de su cotizacion.
drop policy if exists "cotizacion_detalles select" on public.cotizacion_detalles;
drop policy if exists "cotizacion_detalles insert" on public.cotizacion_detalles;
drop policy if exists "cotizacion_detalles update" on public.cotizacion_detalles;
drop policy if exists "cotizacion_detalles delete" on public.cotizacion_detalles;

create policy "cotizacion_detalles select"
on public.cotizacion_detalles for select to authenticated
using (
  exists (
    select 1 from public.cotizaciones c
    where c.id = cotizacion_detalles.cotizacion_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or public.ve_sede((select auth.uid()), c.sede_id)
      )
  )
);

create policy "cotizacion_detalles insert"
on public.cotizacion_detalles for insert to authenticated
with check (
  exists (
    select 1 from public.cotizaciones c
    where c.id = cotizacion_detalles.cotizacion_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and public.ve_sede((select auth.uid()), c.sede_id)
        )
      )
  )
);

create policy "cotizacion_detalles update"
on public.cotizacion_detalles for update to authenticated
using (
  exists (
    select 1 from public.cotizaciones c
    where c.id = cotizacion_detalles.cotizacion_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and public.ve_sede((select auth.uid()), c.sede_id)
        )
      )
  )
)
with check (
  exists (
    select 1 from public.cotizaciones c
    where c.id = cotizacion_detalles.cotizacion_id
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and public.ve_sede((select auth.uid()), c.sede_id)
        )
      )
  )
);

create policy "cotizacion_detalles delete"
on public.cotizacion_detalles for delete to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  and exists (
    select 1 from public.cotizaciones c
    where c.id = cotizacion_detalles.cotizacion_id
      and public.ve_sede((select auth.uid()), c.sede_id)
  )
);

-- ============================================================
-- IDENTIDADES COMERCIALES / PROYECTOS
-- ============================================================

drop policy if exists "identidades comerciales select" on public.identidades_comerciales;
drop policy if exists "identidades comerciales insert" on public.identidades_comerciales;
drop policy if exists "identidades comerciales update" on public.identidades_comerciales;
drop policy if exists "identidades comerciales delete" on public.identidades_comerciales;
drop policy if exists "identidades comerciales gestionar" on public.identidades_comerciales;

create policy "identidades comerciales select"
on public.identidades_comerciales for select to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or public.ve_sede((select auth.uid()), sede_id)
);

create policy "identidades comerciales insert"
on public.identidades_comerciales for insert to authenticated
with check (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
);

create policy "identidades comerciales update"
on public.identidades_comerciales for update to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
)
with check (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
);

create policy "identidades comerciales delete"
on public.identidades_comerciales for delete to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  and public.ve_sede((select auth.uid()), sede_id)
);

drop policy if exists "proyectos_joya select" on public.proyectos_joya;
drop policy if exists "proyectos_joya insert" on public.proyectos_joya;
drop policy if exists "proyectos_joya update" on public.proyectos_joya;
drop policy if exists "proyectos_joya delete" on public.proyectos_joya;
drop policy if exists proyectos_admin_write on public.proyectos_joya;

create policy "proyectos_joya select"
on public.proyectos_joya for select to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or public.ve_sede((select auth.uid()), sede_id)
);

create policy "proyectos_joya insert"
on public.proyectos_joya for insert to authenticated
with check (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
);

create policy "proyectos_joya update"
on public.proyectos_joya for update to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
)
with check (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and public.ve_sede((select auth.uid()), sede_id)
  )
);

create policy "proyectos_joya delete"
on public.proyectos_joya for delete to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  and public.ve_sede((select auth.uid()), sede_id)
);

commit;