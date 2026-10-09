-- Corrige de raíz los permisos de identidad comercial y su logo usando participante_id canónico.
-- La política anterior autorizaba la tabla por sede_id/ve_sede(), pero el módulo trabaja
-- con participante_id; si sede_id está vacío o la cuenta se resuelve por profiles, el UPDATE
-- de logo_url puede fallar aunque la identidad se vea en pantalla.
-- Storage upsert también necesita SELECT + INSERT/UPDATE autorizados.

begin;

-- Identidad comercial: propietario global o gerente del participante activo.
drop policy if exists "identidades comerciales select" on public.identidades_comerciales;
drop policy if exists "identidades comerciales insert" on public.identidades_comerciales;
drop policy if exists "identidades comerciales update" on public.identidades_comerciales;
drop policy if exists "identidades comerciales delete" on public.identidades_comerciales;
drop policy if exists "identidades comerciales gestionar" on public.identidades_comerciales;

create policy "identidades comerciales select"
on public.identidades_comerciales
for select to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and exists (
      select 1 from public.ecosistema_participantes ep
      where ep.id = identidades_comerciales.participante_id
        and ep.estado = 'activo'
        and (
          exists (
            select 1 from public.participante_cuentas pc
            where pc.user_id = (select auth.uid())
              and pc.participante_id = ep.id
              and pc.estado = 'activo'
          )
          or exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid())
              and p.participante_id = ep.id
              and coalesce(p.activo, true)
          )
        )
    )
  )
);

create policy "identidades comerciales insert"
on public.identidades_comerciales
for insert to authenticated
with check (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and exists (
      select 1 from public.ecosistema_participantes ep
      where ep.id = identidades_comerciales.participante_id
        and ep.estado = 'activo'
        and (
          exists (
            select 1 from public.participante_cuentas pc
            where pc.user_id = (select auth.uid())
              and pc.participante_id = ep.id
              and pc.estado = 'activo'
          )
          or exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid())
              and p.participante_id = ep.id
              and coalesce(p.activo, true)
          )
        )
    )
  )
);

create policy "identidades comerciales update"
on public.identidades_comerciales
for update to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and exists (
      select 1 from public.ecosistema_participantes ep
      where ep.id = identidades_comerciales.participante_id
        and ep.estado = 'activo'
        and (
          exists (
            select 1 from public.participante_cuentas pc
            where pc.user_id = (select auth.uid())
              and pc.participante_id = ep.id
              and pc.estado = 'activo'
          )
          or exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid())
              and p.participante_id = ep.id
              and coalesce(p.activo, true)
          )
        )
    )
  )
)
with check (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  or (
    public.has_role((select auth.uid()), 'gerente'::public.app_role)
    and exists (
      select 1 from public.ecosistema_participantes ep
      where ep.id = identidades_comerciales.participante_id
        and ep.estado = 'activo'
        and (
          exists (
            select 1 from public.participante_cuentas pc
            where pc.user_id = (select auth.uid())
              and pc.participante_id = ep.id
              and pc.estado = 'activo'
          )
          or exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid())
              and p.participante_id = ep.id
              and coalesce(p.activo, true)
          )
        )
    )
  )
);

create policy "identidades comerciales delete"
on public.identidades_comerciales
for delete to authenticated
using (
  public.has_role((select auth.uid()), 'dueno'::public.app_role)
  and exists (
    select 1 from public.ecosistema_participantes ep
    where ep.id = identidades_comerciales.participante_id
      and ep.estado = 'activo'
  )
);

-- Storage: autoriza la ruta participante_id/identidad_id/logo.ext y exige que
-- ambos segmentos correspondan a una identidad comercial real del participante.
drop policy if exists "identidades comerciales subir logo" on storage.objects;
drop policy if exists "identidades comerciales leer logo autorizado" on storage.objects;
drop policy if exists "identidades comerciales actualizar logo" on storage.objects;
drop policy if exists "identidades comerciales borrar logo" on storage.objects;

create policy "identidades comerciales leer logo autorizado"
on storage.objects
for select to authenticated
using (
  bucket_id = 'identidades-comerciales'
  and exists (
    select 1
    from public.identidades_comerciales ic
    where ic.participante_id::text = split_part(name, '/', 1)
      and ic.id::text = split_part(name, '/', 2)
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and (
            exists (
              select 1 from public.participante_cuentas pc
              where pc.user_id = (select auth.uid())
                and pc.participante_id = ic.participante_id
                and pc.estado = 'activo'
            )
            or exists (
              select 1 from public.profiles p
              where p.id = (select auth.uid())
                and p.participante_id = ic.participante_id
                and coalesce(p.activo, true)
            )
          )
        )
      )
  )
);

create policy "identidades comerciales subir logo"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'identidades-comerciales'
  and exists (
    select 1
    from public.identidades_comerciales ic
    join public.ecosistema_participantes ep on ep.id = ic.participante_id
    where ic.participante_id::text = split_part(name, '/', 1)
      and ic.id::text = split_part(name, '/', 2)
      and ep.estado = 'activo'
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and (
            exists (
              select 1 from public.participante_cuentas pc
              where pc.user_id = (select auth.uid())
                and pc.participante_id = ic.participante_id
                and pc.estado = 'activo'
            )
            or exists (
              select 1 from public.profiles p
              where p.id = (select auth.uid())
                and p.participante_id = ic.participante_id
                and coalesce(p.activo, true)
            )
          )
        )
      )
  )
);

create policy "identidades comerciales actualizar logo"
on storage.objects
for update to authenticated
using (
  bucket_id = 'identidades-comerciales'
  and exists (
    select 1
    from public.identidades_comerciales ic
    where ic.participante_id::text = split_part(name, '/', 1)
      and ic.id::text = split_part(name, '/', 2)
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and (
            exists (
              select 1 from public.participante_cuentas pc
              where pc.user_id = (select auth.uid())
                and pc.participante_id = ic.participante_id
                and pc.estado = 'activo'
            )
            or exists (
              select 1 from public.profiles p
              where p.id = (select auth.uid())
                and p.participante_id = ic.participante_id
                and coalesce(p.activo, true)
            )
          )
        )
      )
  )
)
with check (
  bucket_id = 'identidades-comerciales'
  and exists (
    select 1
    from public.identidades_comerciales ic
    where ic.participante_id::text = split_part(name, '/', 1)
      and ic.id::text = split_part(name, '/', 2)
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and (
            exists (
              select 1 from public.participante_cuentas pc
              where pc.user_id = (select auth.uid())
                and pc.participante_id = ic.participante_id
                and pc.estado = 'activo'
            )
            or exists (
              select 1 from public.profiles p
              where p.id = (select auth.uid())
                and p.participante_id = ic.participante_id
                and coalesce(p.activo, true)
            )
          )
        )
      )
  )
);

create policy "identidades comerciales borrar logo"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'identidades-comerciales'
  and exists (
    select 1
    from public.identidades_comerciales ic
    where ic.participante_id::text = split_part(name, '/', 1)
      and ic.id::text = split_part(name, '/', 2)
      and (
        public.has_role((select auth.uid()), 'dueno'::public.app_role)
        or (
          public.has_role((select auth.uid()), 'gerente'::public.app_role)
          and (
            exists (
              select 1 from public.participante_cuentas pc
              where pc.user_id = (select auth.uid())
                and pc.participante_id = ic.participante_id
                and pc.estado = 'activo'
            )
            or exists (
              select 1 from public.profiles p
              where p.id = (select auth.uid())
                and p.participante_id = ic.participante_id
                and coalesce(p.activo, true)
            )
          )
        )
      )
  )
);

commit;
